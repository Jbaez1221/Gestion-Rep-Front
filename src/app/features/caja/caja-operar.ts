import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import {
  Caja,
  Cobro,
  MedioPago,
  PedidoPendiente,
  SesionCaja,
  TipoMovimientoCaja,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { AbonoCajaPanel } from './abono-caja';
import { CajaApi } from './caja.api';
import { DevolucionCajaPanel } from './devolucion-caja';
import { PagoProveedorCajaPanel } from './pago-proveedor-caja';
import { NOMBRE_MEDIO, centimos } from './medios';

export { NOMBRE_MEDIO } from './medios';

type Seccion = 'pedidos' | 'abonos' | 'devoluciones' | 'proveedores';

/** El turno del cajero: abrir, cobrar los pedidos en caja, mover efectivo y cerrar con arqueo. */
@Component({
  selector: 'app-caja-operar',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    ErrorApi,
    AbonoCajaPanel,
    DevolucionCajaPanel,
    PagoProveedorCajaPanel,
  ],
  templateUrl: './caja-operar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CajaOperar implements OnInit {
  private readonly api = inject(CajaApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly permisos = inject(SesionService);
  protected readonly medios = NOMBRE_MEDIO;
  protected readonly listaMedios = Object.keys(NOMBRE_MEDIO) as MedioPago[];

  protected readonly cargando = signal(true);
  protected readonly sesion = signal<SesionCaja | null>(null);
  protected readonly cajas = signal<Caja[]>([]);
  protected readonly pendientes = signal<PedidoPendiente[]>([]);
  protected readonly cobrando = signal<PedidoPendiente | null>(null);
  protected readonly ultimoCobro = signal<Cobro | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly seccion = signal<Seccion>('pedidos');
  protected readonly autorizarCredito = signal(false);
  protected readonly puedeAutorizar = computed(() =>
    this.permisos.tiene(PERMISOS.creditosAutorizar),
  );
  protected readonly puedeDevolver = computed(() => this.permisos.tiene(PERMISOS.cajaDevolver));
  protected readonly puedePagarProveedores = computed(() =>
    this.permisos.tiene(PERMISOS.cajaPagarProveedores),
  );
  protected readonly cajasLibres = computed(() =>
    this.cajas().filter((c) => c.activo && !c.sesionAbierta),
  );

  protected readonly apertura = this.fb.group({
    cajaId: ['', Validators.required],
    monto: [0, [Validators.required, Validators.min(0)]],
  });
  protected readonly pagos = this.fb.array([] as ReturnType<CajaOperar['nuevoPago']>[]);
  protected readonly movimiento = this.fb.group({
    tipo: ['EGRESO' as TipoMovimientoCaja],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    motivo: ['', [Validators.required, Validators.maxLength(250)]],
  });
  protected readonly cierre = this.fb.group({
    contado: [null as number | null, [Validators.required, Validators.min(0)]],
    observacion: ['', Validators.maxLength(250)],
  });

  private readonly valoresPagos = toSignal(this.pagos.valueChanges, {
    initialValue: this.pagos.getRawValue(),
  });
  private readonly valoresCierre = toSignal(this.cierre.valueChanges, {
    initialValue: this.cierre.getRawValue(),
  });
  protected readonly recibido = computed(() =>
    centimos((this.valoresPagos() ?? []).reduce((s, p) => s + Number(p.monto ?? 0), 0)),
  );
  protected readonly vuelto = computed(() => {
    const total = this.cobrando()?.total ?? 0;
    return Math.max(0, centimos(this.recibido() - total));
  });
  protected readonly alCredito = computed(() =>
    centimos(
      (this.valoresPagos() ?? [])
        .filter((p) => p.medio === 'CREDITO')
        .reduce((s, p) => s + Number(p.monto ?? 0), 0),
    ),
  );
  protected readonly falta = computed(() => {
    const total = this.cobrando()?.total ?? 0;
    return Math.max(0, centimos(total - this.recibido()));
  });
  protected readonly diferencia = computed(() => {
    const contado = this.valoresCierre().contado;
    const s = this.sesion();
    return contado === null || contado === undefined || String(contado) === '' || !s
      ? null
      : centimos(Number(contado) - s.efectivoEsperado);
  });

  ngOnInit(): void {
    void this.cargar();
  }

  private nuevoPago(medio: MedioPago = 'EFECTIVO', monto: number | null = null) {
    return this.fb.group({
      medio: [medio],
      monto: [monto, [Validators.required, Validators.min(0.01)]],
      referencia: ['', Validators.maxLength(60)],
    });
  }

  private async cargar(): Promise<void> {
    try {
      this.cargando.set(true);
      this.error.set(null);
      const actual = await firstValueFrom(this.api.actual());
      this.sesion.set(actual);
      if (actual) {
        this.pendientes.set(await firstValueFrom(this.api.pendientes(actual.id)));
      } else {
        this.cajas.set(await firstValueFrom(this.api.cajas()));
      }
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async abrir(): Promise<void> {
    if (this.apertura.invalid) {
      this.apertura.markAllAsTouched();
      return;
    }
    const v = this.apertura.getRawValue();
    try {
      this.error.set(null);
      await firstValueFrom(this.api.abrir(v.cajaId, Number(v.monto)));
      this.avisos.exito('Caja abierta.');
      await this.cargar();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected creditoDe(c: Cobro): number {
    return c.pagos.filter((p) => p.medio === 'CREDITO').reduce((s, p) => s + p.monto, 0);
  }

  protected async actualizar(): Promise<void> {
    await this.cargar();
  }

  protected empezarCobro(p: PedidoPendiente): void {
    this.cobrando.set(p);
    this.ultimoCobro.set(null);
    this.autorizarCredito.set(false);
    this.pagos.clear();
    this.pagos.push(this.nuevoPago('EFECTIVO', p.total));
  }

  protected agregarPago(): void {
    this.pagos.push(this.nuevoPago('TARJETA', this.falta() || null));
  }

  protected async cobrar(): Promise<void> {
    const s = this.sesion();
    const p = this.cobrando();
    if (!s || !p || this.pagos.invalid) {
      this.pagos.markAllAsTouched();
      return;
    }
    try {
      this.error.set(null);
      const cobro = await firstValueFrom(
        this.api.cobrar(
          s.id,
          p.id,
          this.pagos.getRawValue().map((x) => ({
            medio: x.medio,
            monto: Number(x.monto),
            referencia: x.medio === 'CREDITO' ? null : x.referencia || null,
          })),
          this.autorizarCredito(),
        ),
      );
      this.ultimoCobro.set(cobro);
      this.cobrando.set(null);
      this.avisos.exito(`${cobro.comprobante} emitida.`);
      await this.cargar();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async registrarMovimiento(): Promise<void> {
    const s = this.sesion();
    if (!s || this.movimiento.invalid) {
      this.movimiento.markAllAsTouched();
      return;
    }
    const v = this.movimiento.getRawValue();
    try {
      this.error.set(null);
      await firstValueFrom(this.api.movimiento(s.id, v.tipo, Number(v.monto), v.motivo));
      this.avisos.exito(v.tipo === 'INGRESO' ? 'Ingreso registrado.' : 'Egreso registrado.');
      this.movimiento.reset({ tipo: 'EGRESO', monto: null, motivo: '' });
      await this.cargar();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async cerrar(): Promise<void> {
    const s = this.sesion();
    if (!s || this.cierre.invalid) {
      this.cierre.markAllAsTouched();
      return;
    }
    const v = this.cierre.getRawValue();
    try {
      this.error.set(null);
      const cerrada = await firstValueFrom(
        this.api.cerrar(s.id, Number(v.contado), v.observacion || null),
      );
      this.avisos.exito(`Caja ${cerrada.numero} cerrada.`);
      this.cierre.reset({ contado: null, observacion: '' });
      await this.cargar();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
