import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormRecord,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import {
  Adjunto,
  AlmacenOpcion,
  AfectacionIgv,
  Articulo,
  ArticuloActualizar,
  ArticuloBreve,
  ArticuloListado,
  CatalogosSunat,
  Categoria,
  Centro,
  CoincidenciaParte,
  ControlStock,
  Existencia,
  Marca,
  OrigenArticulo,
  Propiedad,
  TipoArticulo,
  TipoExistencia,
  UnidadMedida,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { DialogosService } from '../../shared/ui/dialogos';
import { ErrorApi } from '../../shared/ui/error-api';
import { CentrosApi } from '../centros/centros.api';
import { hoyEnLima } from '../centros/arbol';
import { DetalleStock, controlesDetalle, detalleDe } from '../inventario/detalle-stock';
import { InventarioApi } from '../inventario/inventario.api';
import { ArticulosApi, urlAdjunto } from './articulos.api';
import { TIPOS_ARTICULO } from './articulos-lista';
import { BuscadorArticulo } from './buscador-articulo';
import { arbolDeCategorias, etiquetaCategoria } from './categorias';

const PATRON_CODIGO = /^[A-Za-z0-9.-]{2,30}$/;
const PATRON_BARRAS = /^[A-Za-z0-9-]{4,30}$/;
const TAMANIO_MAXIMO = 2 * 1024 * 1024;

/** Como el backend guarda las marcas: sin espacios repetidos y en mayúsculas. */
export function normalizarMarca(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Valor de una propiedad tal como entra en la descripción: un número lleva la unidad de su
 * etiqueta ("Capacidad (L)" → "4 L") y un sí/no, la etiqueta si es sí.
 */
export function textoPropiedad(p: Propiedad, valor: string): string {
  const v = valor.trim();
  if (!v) return '';
  if (p.tipo === 'SI_NO') return v === 'SI' ? p.etiqueta.replace(/\s*\(.*\)\s*/, '') : '';
  if (p.tipo === 'NUMERO') {
    const unidad = /\(([^)]+)\)/.exec(p.etiqueta)?.[1]?.split('/')[0]?.trim();
    return unidad ? `${v} ${unidad}` : v;
  }
  return v;
}

@Component({
  selector: 'app-articulo-detalle',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DecimalPipe,
    NgTemplateOutlet,
    ErrorApi,
    BuscadorArticulo,
    DetalleStock,
  ],
  templateUrl: './articulo-detalle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticuloDetalle implements OnInit {
  private readonly dialogos = inject(DialogosService);
  private readonly api = inject(ArticulosApi);
  private readonly centrosApi = inject(CentrosApi);
  private readonly inventarioApi = inject(InventarioApi);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly tipos = TIPOS_ARTICULO;
  protected readonly etiquetaCategoria = etiquetaCategoria;
  protected readonly urlAdjunto = urlAdjunto;

  /** Id de la ruta; ausente al crear. */
  readonly id = input<string>();
  /** Query params al crear: copiar un artículo parecido o partir de un N.° de parte buscado. */
  readonly copiarDe = input<string>();
  readonly numeroParte = input<string>();
  /** Dentro de otra pantalla (p. ej. una compra): al crear emite el artículo en vez de abrirlo. */
  readonly enDialogo = input(false);
  readonly creado = output<Articulo>();

  protected readonly copiadoDe = signal<string | null>(null);

  protected readonly articulo = signal<Articulo | null>(null);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly marcas = signal<Marca[]>([]);
  protected readonly unidades = signal<UnidadMedida[]>([]);
  protected readonly sunat = signal<CatalogosSunat | null>(null);
  protected readonly beneficios = signal<Centro[]>([]);
  protected readonly stock = signal<Existencia[]>([]);
  protected readonly equivalentes = signal<ArticuloBreve[]>([]);
  protected readonly propiedades = signal<Propiedad[]>([]);
  protected readonly prefijo = signal<string | null>(null);
  protected readonly adjuntos = signal<Adjunto[]>([]);
  protected readonly error = signal<Problema | null>(null);
  protected readonly guardando = signal(false);
  protected readonly subiendo = signal(false);
  protected readonly almacenesInventario = signal<AlmacenOpcion[]>([]);
  protected readonly ingresando = signal(false);
  protected readonly verTributario = signal(false);
  /** Al crear solo se ve lo esencial; unidades, lote o serie y códigos quedan en "Más datos". */
  protected readonly verMas = signal(false);
  /** El usuario escribió la descripción: deja de armarse sola. */
  protected readonly descripcionManual = signal(false);
  protected readonly coincidencias = signal<CoincidenciaParte[]>([]);
  protected readonly duplicados = computed(() => this.coincidencias().filter((c) => c.mismaMarca));
  /** Código de barras escaneado al crear que ya pertenece a otro artículo. */
  protected readonly barraExistente = signal<Articulo | null>(null);
  protected readonly puedeTributario = computed(() =>
    this.sesion.tiene(PERMISOS.articulosTributario),
  );
  private readonly nombreCategoria = signal<string | null>(null);

  protected readonly esNuevo = computed(() => !this.id());
  protected readonly puedeEditar = computed(() =>
    this.sesion.tiene(this.esNuevo() ? PERMISOS.articulosCrear : PERMISOS.articulosEditar),
  );
  protected readonly arbol = computed(() =>
    arbolDeCategorias(this.categorias()).filter(
      (n) => n.categoria.activo || n.categoria.id === this.articulo()?.categoria.id,
    ),
  );
  protected readonly unidadesActivas = computed(() => this.unidades().filter((u) => u.activo));
  protected readonly idsEquivalentes = computed(() => [
    ...(this.id() ? [this.id() ?? ''] : []),
    ...this.equivalentes().map((e) => e.id),
  ]);

  private readonly propiedadesForm = new FormRecord<FormControl<string>>({});

  protected readonly formulario = this.fb.group({
    codigo: ['', Validators.pattern(PATRON_CODIGO)],
    descripcion: ['', [Validators.required, Validators.maxLength(200)]],
    descripcionCorta: ['', Validators.maxLength(60)],
    numeroParte: ['', Validators.maxLength(50)],
    marca: ['', Validators.maxLength(80)],
    origen: ['' as OrigenArticulo | ''],
    categoriaId: ['', Validators.required],
    tipo: ['INVENTARIABLE' as TipoArticulo, Validators.required],
    control: ['NINGUNO' as ControlStock],
    tipoExistencia: ['MERCADERIAS' as TipoExistencia | ''],
    unidadBaseId: ['', Validators.required],
    unidadCompra: [''],
    unidadVenta: [''],
    afectacionIgv: ['GRAVADO' as AfectacionIgv, Validators.required],
    codigoProductoSunat: ['', Validators.pattern(/^\d{8}$/)],
    centroBeneficioId: [''],
    pesoKg: [null as number | null, Validators.min(0)],
    volumenM3: [null as number | null, Validators.min(0)],
    codigosBarras: this.fb.array([] as ReturnType<ArticuloDetalle['nuevaBarra']>[]),
    codigosAlternos: this.fb.array([] as ReturnType<ArticuloDetalle['nuevoAlterno']>[]),
    unidadesAlternas: this.fb.array([] as ReturnType<ArticuloDetalle['nuevaUnidad']>[]),
    propiedades: this.propiedadesForm,
  });

  /** Código de barras del alta rápida (el lector lo escribe y manda Enter). */
  protected readonly barra = this.fb.control('', Validators.pattern(PATRON_BARRAS));

  /** Stock que entra desde la ficha: saldo inicial si es el primero en ese almacén, si no, ajuste de entrada. */
  protected readonly ingreso = this.fb.group({
    almacenId: [''],
    cantidad: [null as number | null, Validators.min(0.0001)],
    costoUnitario: [null as number | null, Validators.min(0)],
    ...controlesDetalle(this.fb),
  });

  protected readonly puedeIngresarStock = computed(() =>
    this.sesion.tiene(PERMISOS.inventarioMover),
  );

  protected readonly estado = this.fb.group({
    activo: [true],
    bloqueadoCompra: [false],
    bloqueadoVenta: [false],
  });

  private readonly valores = toSignal(this.formulario.valueChanges, {
    initialValue: this.formulario.getRawValue(),
  });
  /** Una línea en lugar de los códigos: lo que la categoría propone y si falta algo para facturar. */
  protected readonly resumenTributario = computed(() => {
    const v = { ...this.valores(), ...this.formulario.getRawValue() };
    const sunat = this.sunat();
    const partes: string[] = [];
    if (v.tipo !== 'SERVICIO' && v.tipoExistencia) {
      partes.push(
        sunat?.tiposExistencia.find((t) => t.valor === v.tipoExistencia)?.descripcion ??
          v.tipoExistencia,
      );
    }
    const igv = sunat?.afectacionesIgv.find((t) => t.valor === v.afectacionIgv);
    partes.push(
      v.afectacionIgv === 'GRAVADO' ? 'Gravado con IGV' : (igv?.descripcion ?? v.afectacionIgv),
    );
    partes.push(
      v.codigoProductoSunat ? `Código SUNAT ${v.codigoProductoSunat}` : 'Sin código SUNAT',
    );
    const categoria = this.nombreCategoria() ?? this.articulo()?.categoria.nombre;
    return partes.join(' · ') + (categoria ? ` — según la categoría ${categoria}` : '');
  });

  /** Categoría, propiedades, marca y N.° de parte: "FILTROS ACEITE TOYOTA 90915-YZZD2". */
  protected readonly descripcionSugerida = computed(() => {
    const v = this.valores();
    const valores = (v.propiedades ?? {}) as Record<string, string>;
    return [
      this.nombreCategoria() ?? '',
      ...this.propiedades().map((p) => textoPropiedad(p, valores[p.clave] ?? '')),
      v.marca ?? '',
      v.numeroParte ?? '',
    ]
      .map((x) => x.trim())
      .filter((x) => x)
      .join(' ')
      .replace(/\s+/g, ' ')
      .toUpperCase()
      .slice(0, 200);
  });

  /** La marca escrita no existe: se creará al guardar. */
  protected readonly marcaNueva = computed(() => {
    const texto = normalizarMarca(this.valores().marca ?? '');
    return texto && !this.marcas().some((m) => m.nombre === texto) ? texto : null;
  });

  protected readonly tipoActual = computed(
    () => this.valores().tipo ?? this.formulario.controls.tipo.value,
  );
  protected readonly esServicio = computed(() => this.tipoActual() === 'SERVICIO');
  /** La base y las alternas: las que puede usar para comprar, vender o en un código de barras. */
  protected readonly unidadesDelArticulo = computed(() => {
    const v = this.valores();
    const base = this.unidades().find(
      (u) => u.id === (v.unidadBaseId ?? this.formulario.controls.unidadBaseId.value),
    );
    const alternas = (v.unidadesAlternas ?? []).map((u) => u?.unidadSunat ?? '').filter((u) => u);
    return [...(base ? [base.codigoSunat] : []), ...alternas];
  });

  /** Solo las alternas: la base ya es la opción vacía ("igual a la unidad base"). */
  protected readonly unidadesAlternasDelArticulo = computed(() =>
    this.unidadesDelArticulo().slice(1),
  );

  constructor() {
    effect(() => {
      const sugerida = this.descripcionSugerida();
      if (this.esNuevo() && !this.descripcionManual() && sugerida) {
        untracked(() => this.formulario.controls.descripcion.setValue(sugerida));
      }
    });
  }

  ngOnInit(): void {
    if (!this.puedeTributario()) {
      const f = this.formulario.controls;
      [f.tipoExistencia, f.afectacionIgv, f.codigoProductoSunat].forEach((c) => c.disable());
    }
    void this.cargarCatalogos();
    if (this.puedeIngresarStock()) {
      void this.cargarAlmacenes();
    }
    const id = this.id();
    if (!id) {
      const parte = this.numeroParte();
      if (parte) {
        this.formulario.controls.numeroParte.setValue(parte);
      }
      const origen = this.copiarDe();
      if (origen) {
        void this.copiar(origen);
      }
    }
    if (id) {
      this.verMas.set(true);
      this.formulario.controls.codigo.disable();
      this.formulario.controls.tipo.disable();
      this.formulario.controls.control.disable();
      this.formulario.controls.unidadBaseId.disable();
      void this.cargar(id);
    }
    if (!this.puedeEditar()) {
      this.formulario.disable();
      this.estado.disable();
    }
  }

  private nuevaBarra(codigo = '', unidadSunat = '') {
    return this.fb.group({
      codigo: [codigo, [Validators.required, Validators.pattern(PATRON_BARRAS)]],
      unidadSunat: [unidadSunat],
    });
  }

  private nuevoAlterno(codigo = '', referencia = '') {
    return this.fb.group({
      codigo: [codigo, [Validators.required, Validators.maxLength(50)]],
      referencia: [referencia, Validators.maxLength(80)],
    });
  }

  private nuevaUnidad(unidadSunat = '', factor: number | null = null) {
    return this.fb.group({
      unidadSunat: [unidadSunat, Validators.required],
      factor: [factor, [Validators.required, Validators.min(0.0001)]],
    });
  }

  private async cargarCatalogos(): Promise<void> {
    try {
      const [categorias, marcas, unidades, sunat] = await Promise.all([
        firstValueFrom(this.api.categorias()),
        firstValueFrom(this.api.marcas()),
        firstValueFrom(this.api.unidades()),
        firstValueFrom(this.api.sunat()),
      ]);
      this.categorias.set(categorias);
      this.marcas.set(marcas);
      this.unidades.set(unidades);
      this.sunat.set(sunat);
      if (this.sesion.tiene(PERMISOS.centrosLeer)) {
        this.beneficios.set(
          (await firstValueFrom(this.centrosApi.listar('BENEFICIO'))).filter(
            (c) => c.imputable && c.activo,
          ),
        );
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async cargarAlmacenes(): Promise<void> {
    try {
      const almacenes = await firstValueFrom(this.inventarioApi.almacenes());
      this.almacenesInventario.set(almacenes);
      const sucursal = this.sesion.sucursalActiva()?.id;
      const propio =
        almacenes.length === 1 ? almacenes[0] : almacenes.find((a) => a.sucursalId === sucursal);
      if (propio) {
        this.ingreso.controls.almacenId.setValue(propio.id);
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  /** Control de stock del artículo (el del formulario al crear, el guardado al editar). */
  protected controlActual(): ControlStock {
    return this.articulo()?.control ?? this.formulario.controls.control.value;
  }

  private quiereIngresarStock(): boolean {
    const v = this.ingreso.getRawValue();
    return !!v.almacenId && v.cantidad !== null && String(v.cantidad) !== '';
  }

  private validarIngreso(): string | null {
    const v = this.ingreso.getRawValue();
    if (!v.almacenId || !v.cantidad || Number(v.cantidad) <= 0) {
      return 'Elija el almacén e indique la cantidad.';
    }
    const primero = !this.stock().some(
      (s) => s.almacen.id === v.almacenId && s.fechaUltimoMovimiento,
    );
    if (primero && (v.costoUnitario === null || String(v.costoUnitario) === '')) {
      return 'El primer ingreso en un almacén necesita el costo unitario.';
    }
    return null;
  }

  /** Registra el ingreso de stock del artículo; devuelve el número de movimiento. */
  private async registrarStock(articuloId: string): Promise<string> {
    const v = this.ingreso.getRawValue();
    const primero = !this.stock().some(
      (s) => s.almacen.id === v.almacenId && s.fechaUltimoMovimiento,
    );
    const m = await firstValueFrom(
      this.inventarioApi.registrar({
        tipo: primero ? 'SALDO_INICIAL' : 'AJUSTE_ENTRADA',
        almacenId: v.almacenId,
        fecha: hoyEnLima(),
        glosa: primero
          ? 'Stock inicial desde la ficha del artículo'
          : 'Ingreso de stock desde la ficha del artículo',
        referencia: null,
        centroCostoId: null,
        lineas: [
          {
            articuloId,
            cantidad: Number(v.cantidad),
            costoUnitario:
              v.costoUnitario === null || String(v.costoUnitario) === ''
                ? null
                : Number(v.costoUnitario),
            ...detalleDe(v),
          },
        ],
      }),
    );
    return m.numero;
  }

  protected async ingresarStock(): Promise<void> {
    const id = this.id();
    const problema = this.validarIngreso();
    if (!id || problema) {
      this.error.set({ status: 400, title: 'Datos incompletos', detail: problema ?? '' });
      return;
    }
    this.guardando.set(true);
    try {
      this.error.set(null);
      const numero = await this.registrarStock(id);
      this.avisos.exito(`Stock registrado (${numero}).`);
      this.ingresando.set(false);
      this.limpiarIngreso();
      this.stock.set(await firstValueFrom(this.inventarioApi.existenciasDeArticulo(id)));
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.guardando.set(false);
    }
  }

  private limpiarIngreso(conservarAlmacen = false): void {
    const almacen =
      conservarAlmacen || this.almacenesInventario().length === 1
        ? this.ingreso.controls.almacenId.value
        : '';
    this.ingreso.reset({ almacenId: almacen, cantidad: null, costoUnitario: null, series: '' });
    this.ingreso.controls.lotes.clear();
  }

  private async cargar(id: string): Promise<void> {
    try {
      const a = await firstValueFrom(this.api.obtener(id));
      await this.cargarPropiedades(a.categoria.id, a.propiedades);
      this.mostrar(a);
      this.adjuntos.set(await firstValueFrom(this.api.adjuntos(id)));
      if (this.sesion.tiene(PERMISOS.inventarioLeer)) {
        this.stock.set(await firstValueFrom(this.inventarioApi.existenciasDeArticulo(id)));
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  /**
   * Parte de un artículo parecido (la misma pieza para otro modelo): copia categoría, marca,
   * unidades, propiedades y datos tributarios; no copia los códigos, que identifican a cada uno.
   */
  private async copiar(origenId: string): Promise<void> {
    try {
      const a = await firstValueFrom(this.api.obtener(origenId));
      await this.cargarPropiedades(a.categoria.id, a.propiedades);
      this.nombreCategoria.set(a.categoria.nombre);
      this.formulario.patchValue({
        descripcion: a.descripcion,
        descripcionCorta: a.descripcionCorta ?? '',
        numeroParte: this.numeroParte() ?? '',
        marca: a.marca?.nombre ?? '',
        origen: a.origen ?? '',
        categoriaId: a.categoria.id,
        tipo: a.tipo,
        control: a.control,
        tipoExistencia: a.tipoExistencia ?? '',
        unidadBaseId: a.unidadBase.id,
        unidadCompra: a.unidadCompra === a.unidadBase.codigoSunat ? '' : a.unidadCompra,
        unidadVenta: a.unidadVenta === a.unidadBase.codigoSunat ? '' : a.unidadVenta,
        afectacionIgv: a.afectacionIgv,
        codigoProductoSunat: a.codigoProductoSunat ?? '',
        centroBeneficioId: a.centroBeneficioId ?? '',
        pesoKg: a.pesoKg,
        volumenM3: a.volumenM3,
      });
      const f = this.formulario.controls;
      f.unidadesAlternas.clear();
      a.unidadesAlternas.forEach((u) =>
        f.unidadesAlternas.push(this.nuevaUnidad(u.unidadSunat, u.factor)),
      );
      Object.entries(a.propiedades).forEach(([clave, valor]) =>
        this.propiedadesForm.get(clave)?.setValue(valor),
      );
      this.descripcionManual.set(true);
      this.copiadoDe.set(a.codigo);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  /** Al elegir categoría: propiedades que aplican y, al crear, lo que la categoría propone. */
  protected async cambiarCategoria(): Promise<void> {
    const id = this.formulario.controls.categoriaId.value;
    if (!id) {
      return;
    }
    try {
      const v = await firstValueFrom(this.api.valoresCategoria(id));
      this.prefijo.set(v.prefijo);
      this.nombreCategoria.set(this.categorias().find((c) => c.id === id)?.nombre ?? null);
      if (this.esNuevo()) {
        const f = this.formulario.controls;
        f.codigoProductoSunat.setValue(v.codigoProductoSunat ?? '');
        if (v.tipo) f.tipo.setValue(v.tipo);
        if (v.tipoExistencia) f.tipoExistencia.setValue(v.tipoExistencia);
        if (v.unidad) f.unidadBaseId.setValue(v.unidad.id);
        if (v.afectacionIgv) f.afectacionIgv.setValue(v.afectacionIgv);
        f.control.setValue(v.control ?? 'NINGUNO');
        f.centroBeneficioId.setValue(v.centroBeneficioId ?? '');
      }
      this.armarPropiedades(v.propiedades, this.formulario.controls.propiedades.getRawValue());
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async cargarPropiedades(
    categoriaId: string,
    valores: Record<string, string>,
  ): Promise<void> {
    const v = await firstValueFrom(this.api.valoresCategoria(categoriaId));
    this.prefijo.set(v.prefijo);
    this.armarPropiedades(v.propiedades, valores);
  }

  private armarPropiedades(lista: Propiedad[], valores: Record<string, string>): void {
    const grupo = this.propiedadesForm;
    Object.keys(grupo.controls).forEach((clave) => grupo.removeControl(clave));
    lista.forEach((p) =>
      grupo.addControl(
        p.clave,
        this.fb.control(valores[p.clave] ?? '', p.obligatoria ? Validators.required : []),
      ),
    );
    this.propiedades.set(lista);
    if (!this.puedeEditar()) {
      grupo.disable();
    }
  }

  private mostrar(a: Articulo): void {
    this.articulo.set(a);
    this.equivalentes.set(a.equivalentes);
    this.formulario.patchValue({
      codigo: a.codigo,
      descripcion: a.descripcion,
      descripcionCorta: a.descripcionCorta ?? '',
      numeroParte: a.numeroParte ?? '',
      marca: a.marca?.nombre ?? '',
      origen: a.origen ?? '',
      categoriaId: a.categoria.id,
      tipo: a.tipo,
      control: a.control,
      tipoExistencia: a.tipoExistencia ?? '',
      unidadBaseId: a.unidadBase.id,
      unidadCompra: a.unidadCompra === a.unidadBase.codigoSunat ? '' : a.unidadCompra,
      unidadVenta: a.unidadVenta === a.unidadBase.codigoSunat ? '' : a.unidadVenta,
      afectacionIgv: a.afectacionIgv,
      codigoProductoSunat: a.codigoProductoSunat ?? '',
      centroBeneficioId: a.centroBeneficioId ?? '',
      pesoKg: a.pesoKg,
      volumenM3: a.volumenM3,
    });
    const f = this.formulario.controls;
    f.unidadesAlternas.clear();
    a.unidadesAlternas.forEach((u) =>
      f.unidadesAlternas.push(this.nuevaUnidad(u.unidadSunat, u.factor)),
    );
    f.codigosBarras.clear();
    a.codigosBarras.forEach((b) =>
      f.codigosBarras.push(
        this.nuevaBarra(
          b.codigo,
          b.unidadSunat === a.unidadBase.codigoSunat ? '' : (b.unidadSunat ?? ''),
        ),
      ),
    );
    f.codigosAlternos.clear();
    a.codigosAlternos.forEach((c) =>
      f.codigosAlternos.push(this.nuevoAlterno(c.codigo, c.referencia ?? '')),
    );
    Object.entries(a.propiedades).forEach(([clave, valor]) =>
      this.propiedadesForm.get(clave)?.setValue(valor),
    );
    if (!this.puedeEditar()) {
      this.formulario.disable();
    }
    this.estado.setValue({
      activo: a.activo,
      bloqueadoCompra: a.bloqueadoCompra,
      bloqueadoVenta: a.bloqueadoVenta,
    });
  }

  /** Escribir la descripción a mano deja de armarla sola; borrarla toda vuelve a armarla. */
  protected escribioDescripcion(evento: Event): void {
    this.descripcionManual.set((evento.target as HTMLInputElement).value.trim() !== '');
  }

  protected armarDescripcion(): void {
    this.descripcionManual.set(false);
  }

  /** El lector de barras termina con Enter: revisa el código en vez de enviar el formulario. */
  protected alEscanear(evento: Event): void {
    evento.preventDefault();
    void this.revisarBarra();
  }

  protected async revisarBarra(): Promise<void> {
    const codigo = this.barra.value.trim();
    this.barraExistente.set(null);
    if (!codigo || this.barra.invalid) {
      return;
    }
    try {
      this.barraExistente.set(await firstValueFrom(this.api.porCodigo(codigo)));
    } catch {
      // 404: el código está libre.
    }
  }

  /** Avisa si ya hay artículos con el N.° de parte: duplicado (misma marca) o equivalente. */
  protected async revisarParte(): Promise<void> {
    const parte = this.formulario.controls.numeroParte.value.trim();
    if (!parte) {
      this.coincidencias.set([]);
      return;
    }
    try {
      const marca = this.marcaElegida(this.formulario.controls.marca.value);
      this.coincidencias.set(
        await firstValueFrom(this.api.coincidencias(parte, marca.marcaId, this.id() ?? null)),
      );
    } catch {
      this.coincidencias.set([]);
    }
  }

  /** La marca existente con ese nombre, o el nombre para crearla. */
  private marcaElegida(texto: string): { marcaId: string | null; marcaNombre: string | null } {
    const nombre = normalizarMarca(texto);
    if (!nombre) {
      return { marcaId: null, marcaNombre: null };
    }
    const existente = this.marcas().find((m) => m.nombre === nombre);
    return existente
      ? { marcaId: existente.id, marcaNombre: null }
      : { marcaId: null, marcaNombre: nombre };
  }

  protected agregarBarra(): void {
    this.formulario.controls.codigosBarras.push(this.nuevaBarra());
  }

  protected agregarAlterno(): void {
    this.formulario.controls.codigosAlternos.push(this.nuevoAlterno());
  }

  protected agregarUnidad(): void {
    this.formulario.controls.unidadesAlternas.push(this.nuevaUnidad());
  }

  protected async guardar(otro = false): Promise<void> {
    if (this.formulario.invalid || this.barra.invalid) {
      const f = this.formulario.controls;
      if (
        [f.tipoExistencia, f.afectacionIgv, f.codigoProductoSunat, f.pesoKg, f.volumenM3].some(
          (c) => c.invalid,
        )
      ) {
        this.verTributario.set(true);
      }
      const visibles = new Set([
        'categoriaId',
        'descripcion',
        'marca',
        'numeroParte',
        'propiedades',
      ]);
      const oculto = Object.entries(f).some(([clave, c]) => c.invalid && !visibles.has(clave));
      if (oculto) {
        this.verMas.set(true);
      }
      this.formulario.markAllAsTouched();
      this.barra.markAsTouched();
      return;
    }
    const v = this.formulario.getRawValue();
    const barraRapida = this.esNuevo() ? this.barra.value.trim() : '';
    const barras = v.codigosBarras.map((b) => ({
      codigo: b.codigo,
      unidadSunat: b.unidadSunat || null,
    }));
    if (barraRapida && !barras.some((b) => b.codigo === barraRapida)) {
      barras.unshift({ codigo: barraRapida, unidadSunat: null });
    }
    const propiedades = Object.fromEntries(
      Object.entries(v.propiedades).filter(([, valor]) => valor !== ''),
    );
    const datos: ArticuloActualizar = {
      descripcion: v.descripcion,
      descripcionCorta: v.descripcionCorta || null,
      numeroParte: v.numeroParte || null,
      ...this.marcaElegida(v.marca),
      origen: v.origen || null,
      categoriaId: v.categoriaId,
      tipoExistencia: v.tipo === 'SERVICIO' ? null : v.tipoExistencia || null,
      unidadCompra: v.unidadCompra || null,
      unidadVenta: v.unidadVenta || null,
      afectacionIgv: v.afectacionIgv,
      codigoProductoSunat: v.codigoProductoSunat || null,
      centroBeneficioId: v.centroBeneficioId || null,
      pesoKg: v.pesoKg,
      volumenM3: v.volumenM3,
      codigosBarras: barras,
      codigosAlternos: v.codigosAlternos.map((c) => ({
        codigo: c.codigo,
        referencia: c.referencia || null,
      })),
      unidadesAlternas: v.unidadesAlternas.map((u) => ({
        unidadSunat: u.unidadSunat,
        factor: Number(u.factor),
      })),
      propiedades,
    };
    this.guardando.set(true);
    this.error.set(null);
    try {
      const id = this.id();
      if (id) {
        this.mostrar(await firstValueFrom(this.api.actualizar(id, datos)));
        this.avisos.exito('Artículo actualizado.');
      } else {
        const conStock =
          !this.enDialogo() &&
          v.tipo === 'INVENTARIABLE' &&
          this.puedeIngresarStock() &&
          this.quiereIngresarStock();
        const problema = conStock ? this.validarIngreso() : null;
        if (problema) {
          this.error.set({ status: 400, title: 'Stock inicial incompleto', detail: problema });
          return;
        }
        const creado = await firstValueFrom(
          this.api.crear({
            ...datos,
            codigo: v.codigo || null,
            tipo: v.tipo,
            control: v.tipo === 'INVENTARIABLE' ? v.control : 'NINGUNO',
            unidadBaseId: v.unidadBaseId,
          }),
        );
        if (this.enDialogo()) {
          this.creado.emit(creado);
          return;
        }
        this.avisos.exito(`Artículo ${creado.codigo} creado.`);
        if (conStock) {
          try {
            const numero = await this.registrarStock(creado.id);
            this.avisos.exito(`Stock inicial registrado (${numero}).`);
          } catch (e) {
            this.avisos.error(
              `El artículo se creó, pero el stock no se registró: ${aProblema(e).detail ?? aProblema(e).title}`,
            );
          }
        }
        if (otro) {
          this.prepararOtro();
        } else {
          await this.router.navigate(['/articulos', creado.id]);
        }
      }
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.guardando.set(false);
    }
  }

  /**
   * Deja el formulario listo para el siguiente artículo de la misma caja: conserva categoría,
   * propiedades, marca, unidades y almacén; limpia lo que identifica a cada uno.
   */
  private prepararOtro(): void {
    const f = this.formulario.controls;
    f.codigo.setValue('');
    f.numeroParte.setValue('');
    f.descripcionCorta.setValue('');
    f.codigosBarras.clear();
    f.codigosAlternos.clear();
    this.barra.reset('');
    this.barraExistente.set(null);
    this.coincidencias.set([]);
    this.copiadoDe.set(null);
    this.descripcionManual.set(false);
    this.limpiarIngreso(true);
    this.formulario.markAsUntouched();
    document.getElementById('ar-barra-rapida')?.focus();
  }

  protected async guardarEstado(): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }
    try {
      this.error.set(null);
      this.mostrar(await firstValueFrom(this.api.cambiarEstado(id, this.estado.getRawValue())));
      this.avisos.exito('Estado actualizado.');
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected agregarEquivalente(a: ArticuloListado): void {
    this.equivalentes.update((l) => [...l, a]);
  }

  protected quitarEquivalente(id: string): void {
    this.equivalentes.update((l) => l.filter((e) => e.id !== id));
  }

  protected async guardarEquivalencias(): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }
    try {
      this.error.set(null);
      this.mostrar(
        await firstValueFrom(
          this.api.equivalencias(
            id,
            this.equivalentes().map((e) => e.id),
          ),
        ),
      );
      this.avisos.exito('Equivalencias guardadas.');
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  // --- Adjuntos ---

  protected async subir(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    const id = this.id();
    entrada.value = '';
    if (!archivo || !id) {
      return;
    }
    if (archivo.size > TAMANIO_MAXIMO) {
      this.error.set({ status: 400, title: 'Archivo muy grande', detail: 'El máximo es 2 MB.' });
      return;
    }
    this.subiendo.set(true);
    try {
      this.error.set(null);
      await firstValueFrom(this.api.subirAdjunto(id, archivo));
      await this.recargarAdjuntos(id);
      this.avisos.exito(`${archivo.name} adjuntado.`);
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.subiendo.set(false);
    }
  }

  protected async principal(adjunto: Adjunto): Promise<void> {
    const id = this.id();
    if (!id) return;
    try {
      await firstValueFrom(this.api.adjuntoPrincipal(id, adjunto.id));
      await this.recargarAdjuntos(id);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async eliminarAdjunto(adjunto: Adjunto): Promise<void> {
    const id = this.id();
    if (
      !id ||
      !(await this.dialogos.confirmar({
        titulo: `¿Eliminar ${adjunto.nombre}?`,
        aceptar: 'Eliminar',
        peligro: true,
      }))
    )
      return;
    try {
      await firstValueFrom(this.api.eliminarAdjunto(id, adjunto.id));
      await this.recargarAdjuntos(id);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async recargarAdjuntos(id: string): Promise<void> {
    this.adjuntos.set(await firstValueFrom(this.api.adjuntos(id)));
    this.articulo.set(await firstValueFrom(this.api.obtener(id)));
  }
}
