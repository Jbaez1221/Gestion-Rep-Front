import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { AbonoCaja, CuentaPendiente, MedioPago } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { CajaApi } from './caja.api';
import { MEDIOS_DINERO, NOMBRE_MEDIO } from './medios';

/** Cobro de abonos a las cuentas por cobrar de los clientes (ventas al crédito). */
@Component({
  selector: 'app-abono-caja',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, ErrorApi],
  template: `
    <div class="space-y-3">
      <app-error-api [problema]="error()" />
      <form (submit)="$event.preventDefault(); buscar()" class="flex flex-wrap items-end gap-2">
        <div class="min-w-64 flex-1">
          <label for="ab-texto" class="etiqueta">Cliente, documento o comprobante</label>
          <input id="ab-texto" type="search" class="campo" [formControl]="texto" />
        </div>
        <button type="submit" class="btn-secundario">Buscar</button>
      </form>
      <ul class="divide-y divide-borde text-sm">
        @for (c of cuentas(); track c.id) {
          <li class="flex flex-wrap items-center justify-between gap-2 py-2">
            <p>
              {{ c.clienteNombre }} · <span class="font-mono">{{ c.comprobante }}</span>
              <span class="block text-xs" [class.text-peligro-texto]="c.vencida">
                Vence {{ c.fechaVencimiento | date: 'dd/MM/yyyy'
                }}{{ c.vencida ? ' (vencida)' : '' }} · de S/ {{ c.monto | number: '1.2-2' }}
              </span>
            </p>
            <p class="flex items-center gap-2">
              <span class="font-semibold">Saldo S/ {{ c.saldo | number: '1.2-2' }}</span>
              <button type="button" class="btn-primario" (click)="elegir(c)">Abonar</button>
            </p>
          </li>
        } @empty {
          @if (buscado()) {
            <li class="py-4 text-center text-texto-suave">
              No hay cuentas pendientes con ese dato.
            </li>
          }
        }
      </ul>
      @if (cuenta(); as c) {
        <form [formGroup]="pago" (ngSubmit)="abonar()" class="tarjeta space-y-2" novalidate>
          <h3 class="font-semibold">
            Abono a <span class="font-mono">{{ c.comprobante }}</span> · saldo S/
            {{ c.saldo | number: '1.2-2' }}
          </h3>
          <div class="flex flex-wrap items-end gap-2">
            <div>
              <label for="ab-medio" class="etiqueta">Medio</label>
              <select id="ab-medio" class="campo w-36" formControlName="medio">
                @for (m of medios; track m) {
                  <option [value]="m">{{ nombres[m] }}</option>
                }
              </select>
            </div>
            <div>
              <label for="ab-monto" class="etiqueta">Monto</label>
              <input
                id="ab-monto"
                type="number"
                min="0.01"
                step="0.10"
                class="campo w-28 text-right"
                formControlName="monto"
              />
            </div>
            @if (pago.controls.medio.value !== 'EFECTIVO') {
              <div>
                <label for="ab-ref" class="etiqueta">N.° de operación</label>
                <input id="ab-ref" class="campo w-32" formControlName="referencia" />
              </div>
            }
          </div>
          <div class="flex gap-2">
            <button type="submit" class="btn-primario">Registrar abono</button>
            <button type="button" class="btn-secundario" (click)="cuenta.set(null)">
              Cancelar
            </button>
          </div>
        </form>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbonoCajaPanel {
  private readonly api = inject(CajaApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly sesionId = input.required<string>();
  readonly registrado = output<AbonoCaja>();
  protected readonly medios = MEDIOS_DINERO;
  protected readonly nombres = NOMBRE_MEDIO;

  protected readonly texto = this.fb.control('');
  protected readonly cuentas = signal<CuentaPendiente[]>([]);
  protected readonly buscado = signal(false);
  protected readonly cuenta = signal<CuentaPendiente | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly pago = this.fb.group({
    medio: ['EFECTIVO' as MedioPago],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    referencia: ['', Validators.maxLength(60)],
  });

  protected async buscar(): Promise<void> {
    try {
      this.error.set(null);
      this.cuentas.set(await firstValueFrom(this.api.cuentas(this.sesionId(), this.texto.value)));
      this.buscado.set(true);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected elegir(c: CuentaPendiente): void {
    this.cuenta.set(c);
    this.pago.reset({ medio: 'EFECTIVO', monto: c.saldo, referencia: '' });
  }

  protected async abonar(): Promise<void> {
    const c = this.cuenta();
    if (!c || this.pago.invalid) {
      this.pago.markAllAsTouched();
      return;
    }
    const v = this.pago.getRawValue();
    try {
      this.error.set(null);
      const abono = await firstValueFrom(
        this.api.abonar(this.sesionId(), c.id, [
          { medio: v.medio, monto: Number(v.monto), referencia: v.referencia || null },
        ]),
      );
      this.avisos.exito(
        abono.saldo === 0
          ? `Abono ${abono.numero} registrado: ${abono.comprobante} quedó pagada.`
          : `Abono ${abono.numero} registrado; saldo S/ ${abono.saldo?.toFixed(2)}.`,
      );
      this.cuenta.set(null);
      this.registrado.emit(abono);
      await this.buscar();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
