import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
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
  AlmacenOpcion,
  ArticuloListado,
  ControlStock,
  Moneda,
  OrdenCompra,
  OrdenListado,
  Recepcion,
  RecepcionGuardar,
  Socio,
  SocioListado,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { ArticulosApi } from '../articulos/articulos.api';
import { BuscadorArticulo } from '../articulos/buscador-articulo';
import { hoyEnLima } from '../centros/arbol';
import { DetalleStock, controlesDetalle, detalleDe } from '../inventario/detalle-stock';
import { InventarioApi } from '../inventario/inventario.api';
import { SociosApi } from '../socios/socios.api';
import { BuscadorProveedor } from './buscador-proveedor';
import { NOMBRE_ESTADO_RECEPCION, centimos, claseEstadoRecepcion } from './calculo';
import { ComprasApi } from './compras.api';
import { pedirMotivo, unidadesDe } from './lineas';

/**
 * Recepción con guía: registra la mercadería que llegó antes que la factura (al costo de la orden o
 * al indicado) o muestra una ya registrada.
 */
@Component({
  selector: 'app-recepcion-detalle',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    ErrorApi,
    BuscadorArticulo,
    BuscadorProveedor,
    DetalleStock,
  ],
  templateUrl: './recepcion-detalle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecepcionDetalle implements OnInit {
  private readonly api = inject(ComprasApi);
  private readonly articulosApi = inject(ArticulosApi);
  private readonly sociosApi = inject(SociosApi);
  private readonly inventarioApi = inject(InventarioApi);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly nombres = NOMBRE_ESTADO_RECEPCION;
  protected readonly clase = claseEstadoRecepcion;

  readonly id = input<string>();
  /** Query param: recibir una orden. */
  readonly orden = input<string>();

  protected readonly recepcion = signal<Recepcion | null>(null);
  protected readonly proveedor = signal<Socio | null>(null);
  protected readonly almacenes = signal<AlmacenOpcion[]>([]);
  protected readonly ordenesAbiertas = signal<OrdenListado[]>([]);
  protected readonly ordenElegida = signal<OrdenCompra | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly guardando = signal(false);

  protected readonly ordenId = this.fb.control('');
  protected readonly cabecera = this.fb.group({
    almacenId: [''],
    guiaSerie: ['', Validators.pattern(/^[A-Za-z0-9]{4}$/)],
    guiaNumero: ['', Validators.pattern(/^\d{1,8}$/)],
    fecha: [hoyEnLima(), Validators.required],
    moneda: ['PEN' as Moneda],
    tipoCambio: [null as number | null, Validators.min(0.001)],
    glosa: ['', Validators.maxLength(250)],
  });
  protected readonly lineas = this.fb.array([] as ReturnType<RecepcionDetalle['nuevaLinea']>[]);
  private readonly valoresLineas = toSignal(this.lineas.valueChanges, {
    initialValue: this.lineas.getRawValue(),
  });

  protected total(): number {
    return centimos(
      (this.valoresLineas() ?? []).reduce(
        (s, l) => s + Number(l.cantidad ?? 0) * Number(l.costo ?? 0),
        0,
      ),
    );
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      void this.cargar(id);
      return;
    }
    void this.cargarAlmacenes();
    const orden = this.orden();
    if (orden) void this.precargarOrden(orden);
  }

  private nuevaLinea(datos: {
    articuloId: string;
    codigo: string;
    descripcion: string;
    unidades: string[];
    unidad: string;
    control: ControlStock;
    cantidad?: number | null;
    costo?: number | null;
    ordenLinea?: number | null;
  }) {
    return this.fb.group({
      articuloId: [datos.articuloId],
      codigo: [datos.codigo],
      descripcion: [datos.descripcion],
      unidades: new FormControl<string[]>(datos.unidades, { nonNullable: true }),
      unidad: [datos.unidad],
      control: [datos.control],
      cantidad: [datos.cantidad ?? null, [Validators.required, Validators.min(0.0001)]],
      costo: [datos.costo ?? null, [Validators.required, Validators.min(0)]],
      ordenLinea: [datos.ordenLinea ?? (null as number | null)],
      ...controlesDetalle(this.fb),
    });
  }

  private async cargar(id: string): Promise<void> {
    try {
      this.recepcion.set(await firstValueFrom(this.api.recepcion(id)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async cargarAlmacenes(): Promise<void> {
    try {
      const almacenes = await firstValueFrom(this.inventarioApi.almacenes());
      this.almacenes.set(almacenes);
      const propio =
        almacenes.length === 1
          ? almacenes[0]
          : almacenes.find((a) => a.sucursalId === this.sesion.sucursalActiva()?.id);
      if (propio && !this.cabecera.controls.almacenId.value) {
        this.cabecera.controls.almacenId.setValue(propio.id);
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async elegirProveedor(s: SocioListado | string): Promise<void> {
    try {
      const socio = await firstValueFrom(this.sociosApi.obtener(typeof s === 'string' ? s : s.id));
      this.proveedor.set(socio);
      this.cabecera.patchValue({ moneda: socio.monedaProveedor ?? 'PEN' });
      const ordenes = await firstValueFrom(this.api.ordenes({ proveedorId: socio.id }));
      this.ordenesAbiertas.set(
        ordenes.contenido.filter((o) => o.estado === 'EMITIDA' || o.estado === 'PARCIAL'),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  /** Recibe una orden: su almacén, su moneda y lo pendiente de cada línea al precio de la orden. */
  protected async elegirOrden(id: string): Promise<void> {
    this.ordenId.setValue(id);
    if (!id) {
      this.ordenElegida.set(null);
      this.cabecera.controls.almacenId.enable();
      return;
    }
    try {
      const o = await firstValueFrom(this.api.orden(id));
      this.ordenElegida.set(o);
      this.cabecera.patchValue({ almacenId: o.almacen?.id ?? '', moneda: o.moneda });
      this.cabecera.controls.almacenId.disable();
      const pendientes = o.lineas.filter((l) => l.pendiente > 0);
      const articulos = await Promise.all(
        pendientes.map((l) => firstValueFrom(this.articulosApi.obtener(l.articuloId))),
      );
      this.lineas.clear();
      pendientes.forEach((l, i) =>
        this.lineas.push(
          this.nuevaLinea({
            articuloId: l.articuloId,
            codigo: l.articuloCodigo,
            descripcion: l.descripcion,
            unidades: [l.unidad],
            unidad: l.unidad,
            control: articulos[i]?.control ?? 'NINGUNO',
            cantidad: l.pendiente,
            costo: l.precioUnitario,
            ordenLinea: l.linea,
          }),
        ),
      );
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

  protected async agregar(a: ArticuloListado): Promise<void> {
    try {
      const art = await firstValueFrom(this.articulosApi.obtener(a.id));
      this.lineas.push(
        this.nuevaLinea({
          articuloId: art.id,
          codigo: art.codigo,
          descripcion: art.descripcion,
          unidades: unidadesDe(art),
          unidad: art.unidadCompra,
          control: art.control,
        }),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async guardar(): Promise<void> {
    const proveedor = this.proveedor();
    const v = this.cabecera.getRawValue();
    if (!proveedor || this.cabecera.invalid || this.lineas.invalid || this.lineas.length === 0) {
      this.cabecera.markAllAsTouched();
      this.lineas.markAllAsTouched();
      this.error.set({
        status: 400,
        title: 'Datos incompletos',
        detail: 'Elija el proveedor y agregue al menos un artículo con cantidad y costo.',
      });
      return;
    }
    if (!!v.guiaSerie !== !!v.guiaNumero) {
      this.error.set({
        status: 400,
        title: 'Guía incompleta',
        detail: 'Indique la serie y el número de la guía, o ninguno.',
      });
      return;
    }
    const datos: RecepcionGuardar = {
      proveedorId: proveedor.id,
      almacenId: this.ordenElegida() ? null : v.almacenId || null,
      ordenId: this.ordenElegida()?.id ?? null,
      guiaSerie: v.guiaSerie ? v.guiaSerie.toUpperCase() : null,
      guiaNumero: v.guiaNumero || null,
      fecha: v.fecha,
      moneda: v.moneda,
      tipoCambio: v.moneda === 'USD' && v.tipoCambio ? Number(v.tipoCambio) : null,
      glosa: v.glosa || null,
      lineas: this.lineas.getRawValue().map((l) => ({
        articuloId: l.articuloId,
        unidad: l.unidad,
        cantidad: Number(l.cantidad),
        costoUnitario: Number(l.costo),
        ordenLinea: l.ordenLinea,
        ...detalleDe(l),
      })),
    };
    this.guardando.set(true);
    try {
      this.error.set(null);
      const r = await firstValueFrom(this.api.registrarRecepcion(datos));
      this.avisos.exito(`Recepción ${r.numero} registrada: la mercadería ya está en el almacén.`);
      await this.router.navigate(['/compras/recepcion', r.id]);
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.guardando.set(false);
    }
  }

  protected async anular(): Promise<void> {
    const r = this.recepcion();
    const motivo = pedirMotivo('¿Por qué se anula? La mercadería sale del almacén.');
    if (!r || !motivo) return;
    try {
      this.error.set(null);
      this.recepcion.set(await firstValueFrom(this.api.anularRecepcion(r.id, motivo)));
      this.avisos.exito('Recepción anulada.');
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
