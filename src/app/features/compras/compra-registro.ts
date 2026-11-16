import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
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
  AfectacionCompra,
  AlmacenOpcion,
  Articulo,
  ArticuloListado,
  CatalogosCompras,
  Centro,
  Compra,
  CompraGuardar,
  CompraListado,
  ControlStock,
  Moneda,
  OrdenCompra,
  OrdenListado,
  RecepcionListado,
  Socio,
  SocioListado,
  TipoComprobante,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { ArticuloDetalle } from '../articulos/articulo-detalle';
import { ArticulosApi } from '../articulos/articulos.api';
import { BuscadorArticulo } from '../articulos/buscador-articulo';
import { hoyEnLima } from '../centros/arbol';
import { CentrosApi } from '../centros/centros.api';
import { DetalleStock, controlesDetalle, detalleDe } from '../inventario/detalle-stock';
import { InventarioApi } from '../inventario/inventario.api';
import { SociosApi } from '../socios/socios.api';
import { BuscadorProveedor } from './buscador-proveedor';
import { NOMBRE_COMPROBANTE, centimos, importeLinea, totales } from './calculo';
import { ComprasApi } from './compras.api';
import { unidadesDe } from './lineas';

/** Línea con artículo (lleva stock o es un servicio) o gasto libre (flete, servicio). */
type ClaseLinea = 'ARTICULO' | 'GASTO';

@Component({
  selector: 'app-compra-registro',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DecimalPipe,
    ErrorApi,
    BuscadorArticulo,
    BuscadorProveedor,
    DetalleStock,
    ArticuloDetalle,
  ],
  templateUrl: './compra-registro.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompraRegistro implements OnInit {
  private readonly api = inject(ComprasApi);
  private readonly articulosApi = inject(ArticulosApi);
  private readonly sociosApi = inject(SociosApi);
  private readonly inventarioApi = inject(InventarioApi);
  private readonly centrosApi = inject(CentrosApi);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly nombres = NOMBRE_COMPROBANTE;

  /** Query params: recibir una orden, facturar una recepción o registrar la nota de un comprobante. */
  readonly orden = input<string>();
  readonly recepcion = input<string>();
  readonly referencia = input<string>();

  protected readonly catalogos = signal<CatalogosCompras | null>(null);
  protected readonly proveedor = signal<Socio | null>(null);
  protected readonly almacenes = signal<AlmacenOpcion[]>([]);
  protected readonly centros = signal<Centro[]>([]);
  protected readonly ordenesAbiertas = signal<OrdenListado[]>([]);
  protected readonly ordenElegida = signal<OrdenCompra | null>(null);
  protected readonly comprobantes = signal<CompraListado[]>([]);
  protected readonly recepcionesPendientes = signal<RecepcionListado[]>([]);
  /** Recepciones con guía que factura: su mercadería ya está en el almacén. */
  protected readonly recepcionesElegidas = signal<string[]>([]);
  protected readonly referenciaElegida = signal<Compra | null>(null);
  protected readonly tipoCambioDe = signal<string | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly guardando = signal(false);
  protected readonly creandoArticulo = signal(false);

  protected readonly cabecera = this.fb.group({
    tipoComprobante: ['FACTURA' as TipoComprobante],
    serie: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{4}$/)]],
    numero: ['', [Validators.required, Validators.pattern(/^\d{1,8}$/)]],
    fechaEmision: [hoyEnLima(), Validators.required],
    fechaContable: [hoyEnLima(), Validators.required],
    fechaVencimiento: [''],
    moneda: ['PEN' as Moneda],
    tipoCambio: [null as number | null, Validators.min(0.001)],
    preciosIncluyenIgv: [false],
    almacenId: [''],
    motivoNota: [''],
    detraccionCodigo: [''],
    totalDocumento: [null as number | null, Validators.min(0)],
    glosa: ['', Validators.maxLength(250)],
  });

  protected readonly lineas = this.fb.array([] as ReturnType<CompraRegistro['nuevaLinea']>[]);
  /** Orden que recibe y comprobante que modifica la nota (los selects se llenan después). */
  protected readonly ordenId = this.fb.control('');
  protected readonly referenciaId = this.fb.control('');

  private readonly valoresCabecera = toSignal(this.cabecera.valueChanges, {
    initialValue: this.cabecera.getRawValue(),
  });
  private readonly valoresLineas = toSignal(this.lineas.valueChanges, {
    initialValue: this.lineas.getRawValue(),
  });

  protected readonly tipo = computed(
    () => this.valoresCabecera().tipoComprobante ?? this.cabecera.controls.tipoComprobante.value,
  );
  protected readonly esNota = computed(
    () => this.tipo() === 'NOTA_CREDITO' || this.tipo() === 'NOTA_DEBITO',
  );
  protected readonly motivos = computed(() =>
    (this.catalogos()?.motivosNota ?? []).filter((m) => m.tipo === this.tipo()),
  );
  protected readonly devolucion = computed(
    () =>
      this.motivos().find((m) => m.codigo === this.valoresCabecera().motivoNota)?.devolucion ??
      false,
  );
  /** Las líneas de artículo mueven stock: en una compra entran; en una nota, solo si es devolución. */
  protected readonly mueveStock = computed(() => !this.esNota() || this.devolucion());

  protected readonly importes = computed(() => {
    const incluye = this.valoresCabecera().preciosIncluyenIgv ?? false;
    return (this.valoresLineas() ?? []).map((l) => {
      const afectacion = (l.afectacion ?? 'GRAVADO') as AfectacionCompra;
      return {
        afectacion,
        ...importeLinea(Number(l.cantidad ?? 0), Number(l.precio ?? 0), afectacion, incluye),
      };
    });
  });
  protected readonly totales = computed(() => totales(this.importes()));
  protected readonly totalSoles = computed(() => {
    const tc =
      this.valoresCabecera().moneda === 'USD' ? Number(this.valoresCabecera().tipoCambio ?? 0) : 1;
    return centimos(this.totales().total * tc);
  });
  protected readonly detraccion = computed(() => {
    const codigo = this.valoresCabecera().detraccionCodigo;
    const d = this.catalogos()?.detracciones.find((x) => x.codigo === codigo);
    if (!d || this.totalSoles() <= d.umbral) return null;
    return Math.round((this.totalSoles() * d.porcentaje) / 100);
  });
  protected readonly descuadre = computed(() => {
    const doc = this.valoresCabecera().totalDocumento;
    if (doc === null || doc === undefined || String(doc) === '') return null;
    const diferencia = centimos(this.totales().total - Number(doc));
    return Math.abs(diferencia) > 0.05 ? diferencia : null;
  });
  protected readonly idsArticulos = computed(() =>
    (this.valoresLineas() ?? []).map((l) => l.articuloId ?? '').filter((x) => x),
  );

  ngOnInit(): void {
    void this.cargarCatalogos();
    const orden = this.orden();
    const recepcion = this.recepcion();
    const referencia = this.referencia();
    if (orden) void this.precargarOrden(orden);
    else if (recepcion) void this.precargarRecepcion(recepcion);
    else if (referencia) void this.precargarReferencia(referencia);
  }

  private nuevaLinea(
    clase: ClaseLinea,
    datos: Partial<{
      articuloId: string;
      codigo: string;
      descripcion: string;
      unidades: string[];
      unidad: string;
      control: ControlStock;
      inventariable: boolean;
      afectacion: AfectacionCompra;
      cantidad: number | null;
      precio: number | null;
      ordenLinea: number | null;
      deRecepcion: boolean;
    }> = {},
  ) {
    return this.fb.group({
      clase: [clase],
      articuloId: [datos.articuloId ?? ''],
      codigo: [datos.codigo ?? ''],
      descripcion: [datos.descripcion ?? '', [Validators.required, Validators.maxLength(200)]],
      unidades: new FormControl<string[]>(datos.unidades ?? [], { nonNullable: true }),
      unidad: [datos.unidad ?? (clase === 'GASTO' ? 'ZZ' : '')],
      control: [datos.control ?? ('NINGUNO' as ControlStock)],
      inventariable: [datos.inventariable ?? false],
      afectacion: [datos.afectacion ?? ('GRAVADO' as AfectacionCompra)],
      cantidad: [
        datos.cantidad ?? (null as number | null),
        [Validators.required, Validators.min(0.0001)],
      ],
      precio: [datos.precio ?? (null as number | null), [Validators.required, Validators.min(0)]],
      centroCostoId: [''],
      naturaleza: ['', Validators.pattern(/^\d{2,6}$/)],
      ordenLinea: [datos.ordenLinea ?? (null as number | null)],
      sumaAlCosto: [false],
      deRecepcion: [datos.deRecepcion ?? false],
      ...controlesDetalle(this.fb),
    });
  }

  private async cargarCatalogos(): Promise<void> {
    try {
      const [catalogos, almacenes] = await Promise.all([
        firstValueFrom(this.api.catalogos()),
        firstValueFrom(this.inventarioApi.almacenes()),
      ]);
      this.catalogos.set(catalogos);
      this.almacenes.set(almacenes);
      const propio =
        almacenes.length === 1
          ? almacenes[0]
          : almacenes.find((a) => a.sucursalId === this.sesion.sucursalActiva()?.id);
      if (propio && !this.cabecera.controls.almacenId.value) {
        this.cabecera.controls.almacenId.setValue(propio.id);
      }
      if (this.sesion.tiene(PERMISOS.centrosLeer)) {
        this.centros.set(
          (await firstValueFrom(this.centrosApi.listar('COSTO'))).filter(
            (c) => c.imputable && c.activo,
          ),
        );
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  // --- Proveedor, orden y comprobante de referencia ---

  protected async elegirProveedor(s: SocioListado | string): Promise<void> {
    try {
      const socio = await firstValueFrom(this.sociosApi.obtener(typeof s === 'string' ? s : s.id));
      this.proveedor.set(socio);
      this.cabecera.patchValue({ moneda: socio.monedaProveedor ?? 'PEN' });
      const [ordenes, comprobantes, recepciones] = await Promise.all([
        firstValueFrom(this.api.ordenes({ proveedorId: socio.id })),
        firstValueFrom(
          this.api.listar({ proveedorId: socio.id, estado: 'REGISTRADA', tamanio: 100 }),
        ),
        firstValueFrom(this.api.recepciones({ proveedorId: socio.id, estado: 'PENDIENTE' })),
      ]);
      this.recepcionesPendientes.set(recepciones.contenido);
      this.ordenesAbiertas.set(
        ordenes.contenido.filter((o) => o.estado === 'EMITIDA' || o.estado === 'PARCIAL'),
      );
      this.comprobantes.set(
        comprobantes.contenido.filter(
          (c) => c.tipoComprobante === 'FACTURA' || c.tipoComprobante === 'BOLETA',
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected cambiarProveedor(): void {
    this.proveedor.set(null);
    this.ordenId.setValue('');
    this.referenciaId.setValue('');
    this.ordenElegida.set(null);
    this.referenciaElegida.set(null);
    this.ordenesAbiertas.set([]);
    this.comprobantes.set([]);
    this.recepcionesPendientes.set([]);
    this.recepcionesElegidas.set([]);
  }

  /**
   * Factura (o deja de facturar) una recepción: sus artículos entran como líneas con el costo con
   * que llegaron, para corregirlo con el precio de la factura.
   */
  protected async alternarRecepcion(id: string, marcada: boolean): Promise<void> {
    const elegidas = marcada
      ? [...new Set([...this.recepcionesElegidas(), id])]
      : this.recepcionesElegidas().filter((x) => x !== id);
    this.recepcionesElegidas.set(elegidas);
    try {
      const recepciones = await Promise.all(
        elegidas.map((r) => firstValueFrom(this.api.recepcion(r))),
      );
      for (let i = this.lineas.length - 1; i >= 0; i--) {
        if (this.lineas.at(i).controls.deRecepcion.value) this.lineas.removeAt(i);
      }
      this.ordenElegida.set(null);
      this.ordenId.setValue('');
      const primera = recepciones[0];
      if (primera) {
        this.cabecera.patchValue({ almacenId: primera.almacen?.id ?? '', moneda: primera.moneda });
        this.cabecera.controls.almacenId.disable();
        await this.proponerTipoCambio();
      } else {
        this.cabecera.controls.almacenId.enable();
      }
      recepciones.forEach((r) =>
        r.lineas.forEach((l) =>
          this.lineas.push(
            this.nuevaLinea('ARTICULO', {
              articuloId: l.articuloId,
              codigo: l.articuloCodigo,
              descripcion: l.descripcion,
              unidades: [l.unidad],
              unidad: l.unidad,
              inventariable: true,
              cantidad: l.cantidad,
              precio: Number(l.costoUnitario),
              deRecepcion: true,
            }),
          ),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async precargarRecepcion(id: string): Promise<void> {
    try {
      const r = await firstValueFrom(this.api.recepcion(id));
      await this.elegirProveedor(r.proveedor.id);
      await this.alternarRecepcion(r.id, true);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  /** Recibe una orden: toma su almacén y moneda, y propone lo pendiente de cada línea. */
  protected async elegirOrden(id: string): Promise<void> {
    this.ordenId.setValue(id);
    if (!id) {
      this.ordenElegida.set(null);
      return;
    }
    try {
      const o = await firstValueFrom(this.api.orden(id));
      this.ordenElegida.set(o);
      this.cabecera.patchValue({ almacenId: o.almacen?.id ?? '', moneda: o.moneda });
      await this.proponerTipoCambio();
      const pendientes = o.lineas.filter((l) => l.pendiente > 0);
      const articulos = await Promise.all(
        pendientes.map((l) => firstValueFrom(this.articulosApi.obtener(l.articuloId))),
      );
      this.lineas.clear();
      pendientes.forEach((l, i) => {
        const a = articulos[i];
        this.lineas.push(
          this.nuevaLinea('ARTICULO', {
            articuloId: l.articuloId,
            codigo: l.articuloCodigo,
            descripcion: l.descripcion,
            unidades: [l.unidad],
            unidad: l.unidad,
            control: a?.control ?? 'NINGUNO',
            inventariable: a?.tipo === 'INVENTARIABLE',
            afectacion: l.afectacion,
            cantidad: l.pendiente,
            precio: l.precioUnitario,
            ordenLinea: l.linea,
          }),
        );
      });
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async precargarOrden(id: string): Promise<void> {
    try {
      const o = await firstValueFrom(this.api.orden(id));
      await this.elegirProveedor(o.proveedor.id);
      await this.elegirOrden(o.id);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async precargarReferencia(id: string): Promise<void> {
    try {
      const c = await firstValueFrom(this.api.obtener(id));
      this.cabecera.controls.tipoComprobante.setValue('NOTA_CREDITO');
      await this.elegirProveedor(c.proveedor.id);
      await this.elegirReferencia(c.id);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async elegirReferencia(id: string): Promise<void> {
    this.referenciaId.setValue(id);
    if (!id) {
      this.referenciaElegida.set(null);
      return;
    }
    try {
      const c = await firstValueFrom(this.api.obtener(id));
      this.referenciaElegida.set(c);
      this.cabecera.patchValue({ moneda: c.moneda, almacenId: c.almacen?.id ?? '' });
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  /** Copia las líneas del comprobante que modifica la nota (p. ej. para una devolución). */
  protected async copiarLineasReferencia(): Promise<void> {
    const ref = this.referenciaElegida();
    if (!ref) return;
    const deArticulo = ref.lineas.filter((l) => l.articuloId);
    try {
      const articulos = await Promise.all(
        deArticulo.map((l) => firstValueFrom(this.articulosApi.obtener(l.articuloId ?? ''))),
      );
      this.cabecera.controls.preciosIncluyenIgv.setValue(false);
      this.lineas.clear();
      deArticulo.forEach((l, i) => {
        const a = articulos[i];
        this.lineas.push(
          this.nuevaLinea('ARTICULO', {
            articuloId: l.articuloId ?? '',
            codigo: l.articuloCodigo ?? '',
            descripcion: l.descripcion,
            unidades: a ? unidadesDe(a) : [l.unidad],
            unidad: l.unidad,
            control: a?.control ?? 'NINGUNO',
            inventariable: a?.tipo === 'INVENTARIABLE',
            afectacion: l.afectacion,
            cantidad: l.cantidad,
            precio: Number(l.valorUnitario),
          }),
        );
      });
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  /** Boleta: los precios traen el IGV (es como se lee el comprobante). */
  protected cambiarTipo(): void {
    const tipo = this.cabecera.controls.tipoComprobante.value;
    this.cabecera.patchValue({
      preciosIncluyenIgv: tipo === 'BOLETA',
      detraccionCodigo: tipo === 'FACTURA' ? this.cabecera.controls.detraccionCodigo.value : '',
      motivoNota: '',
    });
    if (tipo === 'NOTA_CREDITO' || tipo === 'NOTA_DEBITO') {
      this.ordenElegida.set(null);
      this.ordenId.setValue('');
    } else {
      this.referenciaElegida.set(null);
      this.referenciaId.setValue('');
    }
  }

  /** En dólares propone el tipo de cambio de venta del día de emisión (o el último publicado). */
  protected async proponerTipoCambio(): Promise<void> {
    const v = this.cabecera.getRawValue();
    this.tipoCambioDe.set(null);
    if (v.moneda !== 'USD' || !v.fechaEmision || this.esNota()) return;
    try {
      const t = await firstValueFrom(this.api.tipoCambioVigente(v.fechaEmision));
      this.cabecera.controls.tipoCambio.setValue(t.venta);
      this.tipoCambioDe.set(t.fecha);
    } catch {
      this.cabecera.controls.tipoCambio.setValue(null);
    }
  }

  // --- Líneas ---

  protected async agregarArticulo(a: ArticuloListado): Promise<void> {
    try {
      this.agregarDesde(await firstValueFrom(this.articulosApi.obtener(a.id)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private agregarDesde(a: Articulo): void {
    this.lineas.push(
      this.nuevaLinea('ARTICULO', {
        articuloId: a.id,
        codigo: a.codigo,
        descripcion: a.descripcion,
        unidades: unidadesDe(a),
        unidad: a.unidadCompra,
        control: a.control,
        inventariable: a.tipo === 'INVENTARIABLE',
        afectacion: a.afectacionIgv as AfectacionCompra,
      }),
    );
  }

  /** El artículo nuevo creado desde la compra entra como una línea más. */
  protected articuloCreado(a: Articulo): void {
    this.creandoArticulo.set(false);
    this.agregarDesde(a);
    this.avisos.exito(`Artículo ${a.codigo} creado y agregado.`);
  }

  protected agregarGasto(): void {
    this.lineas.push(this.nuevaLinea('GASTO'));
  }

  /** La línea necesita centro de costo: un gasto, o un artículo que no lleva stock. */
  protected necesitaCentro(i: number): boolean {
    const l = this.lineas.at(i).getRawValue();
    if (l.clase === 'GASTO' && l.sumaAlCosto) return false;
    return (l.clase === 'GASTO' || !l.inventariable) && !this.esNota();
  }

  protected lineaMueveStock(i: number): boolean {
    const l = this.lineas.at(i).getRawValue();
    return l.clase === 'ARTICULO' && l.inventariable && !l.deRecepcion && this.mueveStock();
  }

  // --- Guardar ---

  private validar(): string | null {
    if (!this.proveedor()) return 'Elija el proveedor.';
    if (this.cabecera.invalid) return 'Revise la serie (4 caracteres), el número y las fechas.';
    if (this.lineas.length === 0) return 'Agregue al menos una línea.';
    if (this.lineas.invalid)
      return 'Complete la descripción, la cantidad y el precio de cada línea.';
    for (let i = 0; i < this.lineas.length; i++) {
      const l = this.lineas.at(i).getRawValue();
      if (this.necesitaCentro(i) && !l.centroCostoId) {
        return `Elija el centro de costo de "${l.descripcion}": no lleva stock y es un gasto.`;
      }
    }
    const v = this.cabecera.getRawValue();
    if (this.esNota() && (!this.referenciaElegida() || !v.motivoNota)) {
      return 'Elija el comprobante que modifica la nota y su motivo.';
    }
    if (v.moneda === 'USD' && !this.esNota() && !v.tipoCambio) {
      return 'Indique el tipo de cambio (o regístrelo en la pestaña Tipo de cambio).';
    }
    return null;
  }

  protected async guardar(): Promise<void> {
    const problema = this.validar();
    if (problema) {
      this.cabecera.markAllAsTouched();
      this.lineas.markAllAsTouched();
      this.error.set({ status: 400, title: 'Datos incompletos', detail: problema });
      return;
    }
    const v = this.cabecera.getRawValue();
    const datos: CompraGuardar = {
      proveedorId: this.proveedor()?.id ?? '',
      tipoComprobante: v.tipoComprobante,
      serie: v.serie.toUpperCase(),
      numero: v.numero,
      fechaEmision: v.fechaEmision,
      fechaVencimiento: v.fechaVencimiento || null,
      fechaContable: v.fechaContable || null,
      moneda: v.moneda,
      tipoCambio: v.moneda === 'USD' && v.tipoCambio ? Number(v.tipoCambio) : null,
      preciosIncluyenIgv: v.preciosIncluyenIgv,
      almacenId:
        this.esNota() || this.recepcionesElegidas().length > 0 ? null : v.almacenId || null,
      ordenId: this.ordenElegida()?.id ?? null,
      referenciaId: this.esNota() ? (this.referenciaElegida()?.id ?? null) : null,
      motivoNota: this.esNota() ? v.motivoNota : null,
      glosa: v.glosa || null,
      detraccionCodigo:
        v.tipoComprobante === 'FACTURA' && v.detraccionCodigo ? v.detraccionCodigo : null,
      totalDocumento:
        v.totalDocumento === null || String(v.totalDocumento) === ''
          ? null
          : Number(v.totalDocumento),
      lineas: this.lineas.getRawValue().map((l) => ({
        articuloId: l.clase === 'ARTICULO' ? l.articuloId : null,
        descripcion: l.descripcion || null,
        unidad: l.unidad || null,
        cantidad: Number(l.cantidad),
        precio: Number(l.precio),
        afectacion: l.clase === 'GASTO' ? l.afectacion : null,
        centroCostoId: l.centroCostoId || null,
        naturaleza: l.naturaleza || null,
        ordenLinea: l.ordenLinea,
        sumaAlCosto: l.clase === 'GASTO' && l.sumaAlCosto,
        ...detalleDe(l),
      })),
      recepcionIds: this.esNota() ? [] : this.recepcionesElegidas(),
    };
    this.guardando.set(true);
    try {
      this.error.set(null);
      const c = await firstValueFrom(this.api.registrar(datos));
      this.avisos.exito(
        `${this.nombres[c.tipoComprobante]} ${c.comprobante} registrada (${c.numero}).`,
      );
      await this.router.navigate(['/compras/documento', c.id]);
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.guardando.set(false);
    }
  }
}
