import { DatePipe, DecimalPipe } from '@angular/common';
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
  ArticuloListado,
  Moneda,
  OrdenCompra,
  OrdenGuardar,
  SocioListado,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { DialogosService } from '../../shared/ui/dialogos';
import { ErrorApi } from '../../shared/ui/error-api';
import { ArticulosApi } from '../articulos/articulos.api';
import { BuscadorArticulo } from '../articulos/buscador-articulo';
import { hoyEnLima } from '../centros/arbol';
import { InventarioApi } from '../inventario/inventario.api';
import { SociosApi } from '../socios/socios.api';
import { BuscadorProveedor } from './buscador-proveedor';
import { NOMBRE_ESTADO_ORDEN, claseEstadoOrden, importeLinea, totales } from './calculo';
import { ComprasApi } from './compras.api';
import { unidadesDe } from './lineas';

interface Proveedor {
  id: string;
  documento: string;
  nombre: string;
}

@Component({
  selector: 'app-orden-detalle',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    ErrorApi,
    BuscadorArticulo,
    BuscadorProveedor,
  ],
  templateUrl: './orden-detalle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdenDetalle implements OnInit {
  private readonly dialogos = inject(DialogosService);
  private readonly api = inject(ComprasApi);
  private readonly articulosApi = inject(ArticulosApi);
  private readonly sociosApi = inject(SociosApi);
  private readonly inventarioApi = inject(InventarioApi);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly nombres = NOMBRE_ESTADO_ORDEN;
  protected readonly clase = claseEstadoOrden;

  readonly id = input<string>();

  protected readonly orden = signal<OrdenCompra | null>(null);
  protected readonly proveedor = signal<Proveedor | null>(null);
  protected readonly almacenes = signal<AlmacenOpcion[]>([]);
  protected readonly error = signal<Problema | null>(null);
  protected readonly guardando = signal(false);

  protected readonly editable = computed(
    () =>
      (this.orden()?.estado ?? 'BORRADOR') === 'BORRADOR' &&
      this.sesion.tiene(PERMISOS.comprasOrdenCrear),
  );

  protected readonly formulario = this.fb.group({
    almacenId: ['', Validators.required],
    fecha: [hoyEnLima(), Validators.required],
    fechaEntrega: [''],
    moneda: ['PEN' as Moneda],
    diasCredito: [null as number | null, [Validators.min(0), Validators.max(365)]],
    observacion: ['', Validators.maxLength(250)],
    lineas: this.fb.array([] as ReturnType<OrdenDetalle['nuevaLinea']>[]),
  });

  private readonly valores = toSignal(this.formulario.valueChanges, {
    initialValue: this.formulario.getRawValue(),
  });

  protected readonly totales = computed(() =>
    totales(
      (this.valores().lineas ?? []).map((l) => ({
        afectacion: (l.afectacion ?? 'GRAVADO') as AfectacionCompra,
        ...importeLinea(
          Number(l.cantidad ?? 0),
          Number(l.precio ?? 0),
          (l.afectacion ?? 'GRAVADO') as AfectacionCompra,
          false,
        ),
      })),
    ),
  );

  protected readonly idsEnLineas = computed(() =>
    (this.valores().lineas ?? []).map((l) => l.articuloId ?? ''),
  );

  ngOnInit(): void {
    void this.cargarAlmacenes();
    const id = this.id();
    if (id) {
      void this.cargar(id);
    }
  }

  private nuevaLinea(
    articuloId: string,
    codigo: string,
    descripcion: string,
    unidades: string[],
    unidad: string,
    afectacion: AfectacionCompra,
    cantidad: number | null = null,
    precio: number | null = null,
  ) {
    return this.fb.group({
      articuloId: [articuloId],
      codigo: [codigo],
      descripcion: [descripcion],
      unidades: new FormControl<string[]>(unidades, { nonNullable: true }),
      unidad: [unidad, Validators.required],
      afectacion: [afectacion],
      cantidad: [cantidad, [Validators.required, Validators.min(0.0001)]],
      precio: [precio, [Validators.required, Validators.min(0)]],
    });
  }

  private async cargarAlmacenes(): Promise<void> {
    try {
      const almacenes = await firstValueFrom(this.inventarioApi.almacenes());
      this.almacenes.set(almacenes);
      const propio =
        almacenes.length === 1
          ? almacenes[0]
          : almacenes.find((a) => a.sucursalId === this.sesion.sucursalActiva()?.id);
      if (propio && !this.formulario.controls.almacenId.value) {
        this.formulario.controls.almacenId.setValue(propio.id);
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async cargar(id: string): Promise<void> {
    try {
      this.mostrar(await firstValueFrom(this.api.orden(id)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private mostrar(o: OrdenCompra): void {
    this.orden.set(o);
    this.proveedor.set({
      id: o.proveedor.id,
      documento: o.proveedor.documento,
      nombre: o.proveedor.nombre,
    });
    this.formulario.patchValue({
      almacenId: o.almacen?.id ?? '',
      fecha: o.fecha,
      fechaEntrega: o.fechaEntrega ?? '',
      moneda: o.moneda,
      diasCredito: o.diasCredito,
      observacion: o.observacion ?? '',
    });
    const lineas = this.formulario.controls.lineas;
    lineas.clear();
    o.lineas.forEach((l) =>
      lineas.push(
        this.nuevaLinea(
          l.articuloId,
          l.articuloCodigo,
          l.descripcion,
          [l.unidad],
          l.unidad,
          l.afectacion,
          l.cantidad,
          l.precioUnitario,
        ),
      ),
    );
    if (this.editable()) {
      this.formulario.enable();
    } else {
      this.formulario.disable();
    }
  }

  protected async elegirProveedor(s: SocioListado): Promise<void> {
    try {
      const socio = await firstValueFrom(this.sociosApi.obtener(s.id));
      this.proveedor.set({ id: socio.id, documento: socio.numeroDocumento, nombre: socio.nombre });
      this.formulario.patchValue({
        moneda: socio.monedaProveedor ?? 'PEN',
        diasCredito: socio.diasCreditoProveedor ?? 0,
      });
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async agregar(a: ArticuloListado): Promise<void> {
    try {
      const art = await firstValueFrom(this.articulosApi.obtener(a.id));
      this.formulario.controls.lineas.push(
        this.nuevaLinea(
          art.id,
          art.codigo,
          art.descripcion,
          unidadesDe(art),
          art.unidadCompra,
          art.afectacionIgv as AfectacionCompra,
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async guardar(): Promise<void> {
    const proveedor = this.proveedor();
    if (!proveedor || this.formulario.invalid || this.formulario.controls.lineas.length === 0) {
      this.formulario.markAllAsTouched();
      this.error.set({
        status: 400,
        title: 'Datos incompletos',
        detail:
          'Elija el proveedor y el almacén, y agregue al menos un artículo con cantidad y precio.',
      });
      return;
    }
    const v = this.formulario.getRawValue();
    const datos: OrdenGuardar = {
      proveedorId: proveedor.id,
      almacenId: v.almacenId,
      fecha: v.fecha,
      fechaEntrega: v.fechaEntrega || null,
      moneda: v.moneda,
      diasCredito: v.diasCredito === null ? null : Number(v.diasCredito),
      observacion: v.observacion || null,
      lineas: v.lineas.map((l) => ({
        articuloId: l.articuloId,
        unidad: l.unidad,
        cantidad: Number(l.cantidad),
        precioUnitario: Number(l.precio),
      })),
    };
    this.guardando.set(true);
    try {
      this.error.set(null);
      const id = this.id();
      if (id) {
        this.mostrar(await firstValueFrom(this.api.actualizarOrden(id, datos)));
        this.avisos.exito('Orden guardada.');
      } else {
        const creada = await firstValueFrom(this.api.crearOrden(datos));
        this.avisos.exito(`Orden ${creada.numero} creada en borrador.`);
        await this.router.navigate(['/compras/orden', creada.id]);
      }
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.guardando.set(false);
    }
  }

  protected async aprobar(): Promise<void> {
    await this.accion(
      () => this.api.aprobarOrden(this.orden()?.id ?? ''),
      'Orden aprobada y emitida.',
    );
  }

  protected async cerrar(): Promise<void> {
    const motivo = await this.dialogos.pedirTexto({
      titulo: 'Cerrar lo pendiente de la orden',
      aceptar: 'Cerrar orden',
    });
    if (motivo) {
      await this.accion(
        () => this.api.cerrarOrden(this.orden()?.id ?? '', motivo),
        'Orden cerrada.',
      );
    }
  }

  protected async anular(): Promise<void> {
    const motivo = await this.dialogos.pedirTexto({
      titulo: 'Anular orden',
      aceptar: 'Anular orden',
      peligro: true,
    });
    if (motivo) {
      await this.accion(
        () => this.api.anularOrden(this.orden()?.id ?? '', motivo),
        'Orden anulada.',
      );
    }
  }

  private async accion(
    llamada: () => ReturnType<ComprasApi['aprobarOrden']>,
    mensaje: string,
  ): Promise<void> {
    try {
      this.error.set(null);
      this.mostrar(await firstValueFrom(llamada()));
      this.avisos.exito(mensaje);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
