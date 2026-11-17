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
  ArticuloVenta,
  ClienteRef,
  Mostrador,
  PedidoGuardar,
  PedidoVenta,
  PrecioUnidad,
  SocioListado,
  TipoComprobanteVenta,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { InventarioApi } from '../inventario/inventario.api';
import { BuscadorCliente } from './buscador-cliente';
import {
  NOMBRE_ESTADO_PEDIDO,
  claseEstadoPedido,
  conDescuento,
  importeVenta,
  siglaDocumento,
} from './calculo-venta';
import { VentasApi } from './ventas.api';

/** Mostrador: busca, agrega al pedido con el precio de la lista del cliente y lo pasa a caja. */
@Component({
  selector: 'app-pedido-detalle',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, ErrorApi, BuscadorCliente],
  templateUrl: './pedido-detalle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoDetalle implements OnInit {
  private readonly api = inject(VentasApi);
  private readonly inventarioApi = inject(InventarioApi);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly nombres = NOMBRE_ESTADO_PEDIDO;
  protected readonly clase = claseEstadoPedido;
  protected readonly sigla = siglaDocumento;

  readonly id = input<string>();

  protected readonly pedido = signal<PedidoVenta | null>(null);
  /** null: clientes varios (boleta sin identificar, hasta S/ 700). */
  protected readonly cliente = signal<ClienteRef | null>(null);
  protected readonly almacenes = signal<AlmacenOpcion[]>([]);
  protected readonly resultado = signal<Mostrador | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly guardando = signal(false);

  protected readonly editable = computed(
    () =>
      (this.pedido()?.estado ?? 'BORRADOR') === 'BORRADOR' &&
      this.sesion.tiene(PERMISOS.ventasPedido),
  );

  protected readonly busqueda = this.fb.control('');
  protected readonly cabecera = this.fb.group({
    almacenId: ['', Validators.required],
    tipoComprobante: ['BOLETA' as TipoComprobanteVenta],
    observacion: ['', Validators.maxLength(250)],
  });
  protected readonly lineas = this.fb.array([] as ReturnType<PedidoDetalle['nuevaLinea']>[]);
  private readonly valores = toSignal(this.lineas.valueChanges, {
    initialValue: this.lineas.getRawValue(),
  });
  private readonly valoresCabecera = toSignal(this.cabecera.valueChanges, {
    initialValue: this.cabecera.getRawValue(),
  });

  protected readonly importes = computed(() =>
    (this.valores() ?? []).map((l) => {
      const precio = (l.unidades ?? []).find((u) => u.unidad === l.unidad)?.precio ?? 0;
      const unitario = conDescuento(precio, Number(l.descuento ?? 0));
      return {
        unitario,
        ...importeVenta(Number(l.cantidad ?? 0), unitario, l.afectacion ?? 'GRAVADO'),
      };
    }),
  );
  protected readonly total = computed(
    () => Math.round(this.importes().reduce((s, i) => s + i.total, 0) * 100) / 100,
  );
  protected readonly igv = computed(
    () => Math.round(this.importes().reduce((s, i) => s + i.igv, 0) * 100) / 100,
  );
  protected readonly descuentoMaximo = computed(() => this.resultado()?.descuentoMaximo ?? null);
  /** Lo que el backend exigirá para el comprobante (SUNAT), avisado antes de guardar. */
  protected readonly avisoComprobante = computed(() => {
    const tipo = this.valoresCabecera().tipoComprobante;
    const cliente = this.cliente();
    if (tipo === 'FACTURA' && cliente?.tipoDocumento !== '6') {
      return 'La factura requiere un cliente con RUC.';
    }
    if (tipo === 'BOLETA' && (!cliente || cliente.tipoDocumento === '0') && this.total() > 700) {
      return 'Una boleta de más de S/ 700 debe identificar al comprador (DNI).';
    }
    return null;
  });

  ngOnInit(): void {
    void this.cargarAlmacenes();
    const id = this.id();
    if (id) void this.cargar(id);
  }

  private nuevaLinea(d: {
    articuloId: string;
    codigo: string;
    descripcion: string;
    unidades: PrecioUnidad[];
    unidad: string;
    afectacion: AfectacionCompra;
    disponible: number | null;
    cantidad?: number;
    descuento?: number;
  }) {
    return this.fb.group({
      articuloId: [d.articuloId],
      codigo: [d.codigo],
      descripcion: [d.descripcion],
      unidades: new FormControl<PrecioUnidad[]>(d.unidades, { nonNullable: true }),
      unidad: [d.unidad],
      afectacion: [d.afectacion],
      disponible: [d.disponible],
      cantidad: [d.cantidad ?? 1, [Validators.required, Validators.min(0.0001)]],
      descuento: [d.descuento ?? 0, [Validators.min(0), Validators.max(100)]],
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
      if (propio && !this.cabecera.controls.almacenId.value) {
        this.cabecera.controls.almacenId.setValue(propio.id);
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async cargar(id: string): Promise<void> {
    try {
      this.mostrar(await firstValueFrom(this.api.pedido(id)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private mostrar(p: PedidoVenta): void {
    this.pedido.set(p);
    this.cliente.set(p.cliente.tipoDocumento === '0' ? null : p.cliente);
    this.cabecera.patchValue({
      almacenId: p.almacen?.id ?? '',
      tipoComprobante: p.tipoComprobante,
      observacion: p.observacion ?? '',
    });
    this.lineas.clear();
    p.lineas.forEach((l) =>
      this.lineas.push(
        this.nuevaLinea({
          articuloId: l.articuloId,
          codigo: l.articuloCodigo,
          descripcion: l.descripcion,
          unidades: [
            {
              unidad: l.unidad,
              factor: l.factor,
              precio: l.precioLista,
              origen: l.origenPrecio,
              bajoCosto: false,
            },
          ],
          unidad: l.unidad,
          afectacion: l.afectacion,
          disponible: null,
          cantidad: l.cantidad,
          descuento: l.descuento,
        }),
      ),
    );
    if (this.editable()) {
      this.cabecera.enable();
      this.lineas.enable();
    } else {
      this.cabecera.disable();
      this.lineas.disable();
    }
  }

  protected elegirCliente(s: SocioListado): void {
    this.cliente.set({
      id: s.id,
      tipoDocumento: s.tipoDocumento === 'RUC' ? '6' : s.tipoDocumento === 'DNI' ? '1' : '0',
      documento: s.numeroDocumento,
      nombre: s.nombre,
    });
    if (this.cliente()?.tipoDocumento === '6') {
      this.cabecera.controls.tipoComprobante.setValue('FACTURA');
    }
    void this.buscar();
  }

  protected clientesVarios(): void {
    this.cliente.set(null);
    this.cabecera.controls.tipoComprobante.setValue('BOLETA');
    void this.buscar();
  }

  protected alBuscar(evento: Event): void {
    evento.preventDefault();
    void this.buscar();
  }

  protected async buscar(): Promise<void> {
    const almacen = this.cabecera.controls.almacenId.value;
    if (!almacen) return;
    try {
      this.error.set(null);
      this.resultado.set(
        await firstValueFrom(
          this.api.mostrador(almacen, this.cliente()?.id ?? null, this.busqueda.value),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected agregar(a: ArticuloVenta, unidad: PrecioUnidad): void {
    const existente = this.lineas.controls.find(
      (l) =>
        l.controls.articuloId.value === a.articuloId && l.controls.unidad.value === unidad.unidad,
    );
    if (existente) {
      existente.controls.cantidad.setValue(Number(existente.controls.cantidad.value ?? 0) + 1);
      return;
    }
    this.lineas.push(
      this.nuevaLinea({
        articuloId: a.articuloId,
        codigo: a.codigo,
        descripcion: a.descripcion,
        unidades: a.unidades.filter((u) => u.precio !== null),
        unidad: unidad.unidad,
        afectacion: a.afectacionIgv,
        disponible: a.disponible,
      }),
    );
  }

  /** Unidades base que pide la línea frente a lo disponible (para avisar antes de enviar). */
  protected sinStock(i: number): boolean {
    const l = this.lineas.at(i).getRawValue();
    if (l.disponible === null) return false;
    const factor = l.unidades.find((u) => u.unidad === l.unidad)?.factor ?? 1;
    return Number(l.cantidad) * factor > l.disponible;
  }

  protected sobreTope(i: number): boolean {
    const tope = this.descuentoMaximo();
    return tope !== null && Number(this.lineas.at(i).controls.descuento.value) > tope;
  }

  private datos(): PedidoGuardar | null {
    if (this.cabecera.invalid || this.lineas.invalid || this.lineas.length === 0) {
      this.error.set({
        status: 400,
        title: 'Pedido incompleto',
        detail: 'Elija el almacén y agregue al menos un artículo con su cantidad.',
      });
      return null;
    }
    const v = this.cabecera.getRawValue();
    return {
      almacenId: v.almacenId,
      clienteId: this.cliente()?.id ?? null,
      tipoComprobante: v.tipoComprobante,
      observacion: v.observacion || null,
      lineas: this.lineas.getRawValue().map((l) => ({
        articuloId: l.articuloId,
        unidad: l.unidad,
        cantidad: Number(l.cantidad),
        descuento: Number(l.descuento ?? 0),
      })),
    };
  }

  /** Guarda el borrador; con {@code enviar} además lo pasa a caja (reserva el stock). */
  protected async guardar(enviar = false): Promise<void> {
    const datos = this.datos();
    if (!datos) return;
    this.guardando.set(true);
    try {
      this.error.set(null);
      const id = this.id() ?? this.pedido()?.id;
      let p = id
        ? await firstValueFrom(this.api.actualizar(id, datos))
        : await firstValueFrom(this.api.crear(datos));
      if (enviar) {
        p = await firstValueFrom(this.api.enviar(p.id));
        this.avisos.exito(`Pedido ${p.numero} enviado a caja.`);
      } else {
        this.avisos.exito(`Pedido ${p.numero} guardado.`);
      }
      this.mostrar(p);
      if (!this.id()) await this.router.navigate(['/ventas/pedido', p.id]);
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.guardando.set(false);
    }
  }

  protected async devolver(): Promise<void> {
    const p = this.pedido();
    if (!p) return;
    try {
      this.error.set(null);
      this.mostrar(await firstValueFrom(this.api.devolver(p.id)));
      this.avisos.exito('Pedido devuelto a borrador: la reserva se liberó.');
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async anular(): Promise<void> {
    const p = this.pedido();
    const motivo = window.prompt('¿Por qué se anula el pedido?')?.trim();
    if (!p || !motivo) return;
    try {
      this.error.set(null);
      this.mostrar(await firstValueFrom(this.api.anular(p.id, motivo)));
      this.avisos.exito('Pedido anulado.');
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
