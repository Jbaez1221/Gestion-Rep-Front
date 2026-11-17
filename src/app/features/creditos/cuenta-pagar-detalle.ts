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
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { CuentaPagar, MedioPagoProveedor } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { hoyEnLima } from '../centros/arbol';
import { CreditosApi } from './creditos.api';
import { SIMBOLO } from './cuentas-pagar';

const MEDIOS: Record<MedioPagoProveedor, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  DEPOSITO: 'Depósito',
  CHEQUE: 'Cheque',
};

const TIPOS = {
  PAGO: 'Pago',
  NOTA_CREDITO: 'Nota de crédito',
  ANULACION_NOTA: 'Anulación de nota',
};

/** La deuda con el proveedor: pagos, detracción y avisos (plazo SPOT, bancarización). */
@Component({
  selector: 'app-cuenta-pagar-detalle',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, DecimalPipe, ErrorApi],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="titulo-pagina">
          Cuenta por pagar <span class="font-mono">{{ cuenta()?.numero }}</span>
        </h1>
        <a routerLink="/creditos/pagar" class="btn-enlace">Volver a cuentas por pagar</a>
      </div>
      <app-error-api [problema]="error()" />
      @if (cuenta(); as c) {
        @for (a of c.avisos; track $index) {
          <p
            class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            role="status"
          >
            {{ a }}
          </p>
        }
        <section class="tarjeta grid gap-3 text-sm sm:grid-cols-4">
          <div class="sm:col-span-2">
            <p class="etiqueta">Proveedor</p>
            <p>
              <span class="font-mono">{{ c.proveedorDocumento }}</span> · {{ c.proveedorNombre }}
            </p>
          </div>
          <div>
            <p class="etiqueta">Comprobante</p>
            <p class="font-mono">{{ c.comprobante }}</p>
            <p class="text-xs text-slate-500">{{ c.compraNumero }}</p>
          </div>
          <div>
            <p class="etiqueta">Emisión · vencimiento</p>
            <p [class.text-red-700]="c.vencida">
              {{ c.fechaEmision | date: 'dd/MM/yyyy' }} ·
              {{ c.fechaVencimiento | date: 'dd/MM/yyyy' }}
            </p>
          </div>
          <div>
            <p class="etiqueta">Monto</p>
            <p>{{ simbolo[c.moneda] }} {{ c.monto | number: '1.2-2' }}</p>
          </div>
          <div>
            <p class="etiqueta">Saldo al proveedor</p>
            <p class="font-semibold">{{ simbolo[c.moneda] }} {{ c.saldo | number: '1.2-2' }}</p>
          </div>
          <div>
            <p class="etiqueta">Estado</p>
            <p>{{ estado() }}</p>
          </div>
          @if (c.detraccionSoles !== null) {
            <div>
              <p class="etiqueta">Detracción</p>
              <p>
                S/ {{ c.detraccionSoles | number: '1.2-2' }}
                @if (c.detraccionEstado === 'DEPOSITADA') {
                  <span class="block text-xs text-emerald-700">
                    Constancia {{ c.detraccionConstancia }} del
                    {{ c.detraccionFecha | date: 'dd/MM/yyyy' }}
                  </span>
                } @else {
                  <span class="block text-xs text-amber-800">
                    Hasta el {{ c.detraccionVence | date: 'dd/MM/yyyy' }}
                    {{ c.cuentaDetracciones ? '· cta. ' + c.cuentaDetracciones : '' }}
                  </span>
                }
              </p>
            </div>
          }
        </section>

        <div class="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <section class="tarjeta space-y-2">
            <h2 class="font-semibold">Pagos y notas de crédito</h2>
            <ul class="divide-y divide-slate-100 text-sm">
              @for (p of c.pagos; track p.id) {
                <li class="flex justify-between gap-2 py-2">
                  <span>
                    {{ p.fecha | date: 'dd/MM/yyyy' }} · {{ tipos[p.tipo] }}
                    {{ p.medio ? '· ' + medios[p.medio] : '' }}
                    <span class="block text-xs text-slate-500">
                      {{ p.referencia }}{{ p.banco ? ' · ' + p.banco : '' }} · {{ p.usuario }}
                    </span>
                  </span>
                  <span class="font-semibold" [class.text-slate-500]="p.tipo === 'ANULACION_NOTA'">
                    {{ p.tipo === 'ANULACION_NOTA' ? '+' : '' }}{{ p.monto | number: '1.2-2' }}
                  </span>
                </li>
              } @empty {
                <li class="py-4 text-center text-slate-500">Aún no hay pagos.</li>
              }
            </ul>
          </section>
          @if (puedeRegistrar()) {
            <div class="space-y-4">
              @if (c.estado === 'PENDIENTE') {
                <form [formGroup]="pago" (ngSubmit)="pagar()" class="tarjeta space-y-2" novalidate>
                  <h2 class="font-semibold">Pago por banco</h2>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label for="pp-medio" class="etiqueta">Medio</label>
                      <select id="pp-medio" class="campo" formControlName="medio">
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="DEPOSITO">Depósito</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label for="pp-fecha" class="etiqueta">Fecha</label>
                      <input id="pp-fecha" type="date" class="campo" formControlName="fecha" />
                    </div>
                    <div>
                      <label for="pp-monto" class="etiqueta">Monto ({{ c.moneda }})</label>
                      <input
                        id="pp-monto"
                        type="number"
                        min="0.01"
                        step="0.01"
                        class="campo text-right"
                        formControlName="monto"
                      />
                    </div>
                    <div>
                      <label for="pp-ref" class="etiqueta">N.° de operación</label>
                      <input id="pp-ref" class="campo" formControlName="referencia" />
                    </div>
                    <div class="col-span-2">
                      <label for="pp-banco" class="etiqueta">Banco / cuenta</label>
                      <input id="pp-banco" class="campo" formControlName="banco" />
                    </div>
                  </div>
                  <button type="submit" class="btn-primario">Registrar pago</button>
                </form>
              }
              @if (c.detraccionEstado === 'PENDIENTE' && c.estado !== 'ANULADA') {
                <form
                  [formGroup]="constancia"
                  (ngSubmit)="depositar()"
                  class="tarjeta space-y-2"
                  novalidate
                >
                  <h2 class="font-semibold">Depósito de la detracción</h2>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label for="pd-numero" class="etiqueta">N.° de constancia</label>
                      <input id="pd-numero" class="campo font-mono" formControlName="numero" />
                    </div>
                    <div>
                      <label for="pd-fecha" class="etiqueta">Fecha</label>
                      <input id="pd-fecha" type="date" class="campo" formControlName="fecha" />
                    </div>
                  </div>
                  <button type="submit" class="btn-secundario">Registrar constancia</button>
                </form>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentaPagarDetalle implements OnInit {
  private readonly api = inject(CreditosApi);
  private readonly sesion = inject(SesionService);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly simbolo = SIMBOLO;
  protected readonly medios = MEDIOS;
  protected readonly tipos = TIPOS;
  readonly id = input.required<string>();
  protected readonly cuenta = signal<CuentaPagar | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly puedeRegistrar = computed(() =>
    this.sesion.tiene(PERMISOS.creditosPagarRegistrar),
  );
  protected readonly estado = computed(() => {
    const c = this.cuenta();
    if (!c) return '';
    if (c.estado === 'PAGADA') return 'Pagada';
    if (c.estado === 'ANULADA') return 'Anulada';
    return c.vencida ? 'Vencida' : 'Pendiente';
  });

  protected readonly pago = this.fb.group({
    medio: ['TRANSFERENCIA' as MedioPagoProveedor],
    fecha: [hoyEnLima(), Validators.required],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    referencia: ['', [Validators.required, Validators.maxLength(60)]],
    banco: ['', Validators.maxLength(60)],
  });
  protected readonly constancia = this.fb.group({
    numero: ['', [Validators.required, Validators.pattern(/^[0-9A-Za-z-]{4,20}$/)]],
    fecha: [hoyEnLima(), Validators.required],
  });

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      const c = await firstValueFrom(this.api.cuentaPagar(this.id()));
      this.cuenta.set(c);
      this.pago.controls.monto.setValue(c.saldo);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async pagar(): Promise<void> {
    if (this.pago.invalid) {
      this.pago.markAllAsTouched();
      return;
    }
    const v = this.pago.getRawValue();
    try {
      this.error.set(null);
      const c = await firstValueFrom(
        this.api.pagar(this.id(), {
          fecha: v.fecha,
          monto: Number(v.monto),
          medio: v.medio,
          referencia: v.referencia,
          banco: v.banco || null,
        }),
      );
      this.cuenta.set(c);
      this.pago.patchValue({ monto: c.saldo, referencia: '', banco: '' });
      this.avisos.exito(
        c.estado === 'PAGADA' ? `${c.comprobante} quedó pagada.` : 'Pago registrado.',
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async depositar(): Promise<void> {
    if (this.constancia.invalid) {
      this.constancia.markAllAsTouched();
      return;
    }
    const v = this.constancia.getRawValue();
    try {
      this.error.set(null);
      this.cuenta.set(await firstValueFrom(this.api.detraccion(this.id(), v.numero, v.fecha)));
      this.avisos.exito('Constancia de detracción registrada.');
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
