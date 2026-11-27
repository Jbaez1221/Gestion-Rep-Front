import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { CuentaProveedorCaja, PagoProveedorCaja } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { CajaApi } from './caja.api';

/**
 * Pago en efectivo a proveedores: sale como egreso de la caja. Desde S/ 2,000 el comprobante se
 * paga por banco (bancarización).
 */
@Component({
  selector: 'app-pago-proveedor-caja',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, ErrorApi],
  template: `
    <div class="space-y-3">
      <app-error-api [problema]="error()" />
      <form (submit)="$event.preventDefault(); buscar()" class="flex flex-wrap items-end gap-2">
        <div class="min-w-64 flex-1">
          <label for="pv-texto" class="etiqueta">Proveedor, RUC o comprobante</label>
          <input id="pv-texto" type="search" class="campo" [formControl]="texto" />
        </div>
        <button type="submit" class="btn-secundario">Buscar</button>
      </form>
      <ul class="divide-y divide-borde text-sm">
        @for (c of cuentas(); track c.id) {
          <li class="flex flex-wrap items-center justify-between gap-2 py-2">
            <p>
              {{ c.proveedorNombre }} · <span class="font-mono">{{ c.comprobante }}</span>
              <span class="block text-xs" [class.text-peligro-texto]="c.vencida">
                Vence {{ c.fechaVencimiento | date: 'dd/MM/yyyy'
                }}{{ c.vencida ? ' (vencida)' : '' }} · de S/ {{ c.monto | number: '1.2-2' }}
              </span>
            </p>
            <p class="flex items-center gap-2">
              <span class="font-semibold">Saldo S/ {{ c.saldo | number: '1.2-2' }}</span>
              @if (c.efectivo) {
                <button type="button" class="btn-primario" (click)="elegir(c)">Pagar</button>
              } @else {
                <span class="insignia-neutra">Por banco</span>
              }
            </p>
          </li>
        } @empty {
          @if (buscado()) {
            <li class="py-4 text-center text-texto-suave">No hay deudas en soles con ese dato.</li>
          }
        }
      </ul>
      @if (cuenta(); as c) {
        <form (submit)="$event.preventDefault(); pagar()" class="tarjeta space-y-2" novalidate>
          <h3 class="font-semibold">
            Pagar a {{ c.proveedorNombre }} · <span class="font-mono">{{ c.comprobante }}</span>
          </h3>
          <div class="flex flex-wrap items-end gap-2">
            <div>
              <label for="pv-monto" class="etiqueta">Monto en efectivo</label>
              <input
                id="pv-monto"
                type="number"
                min="0.01"
                step="0.10"
                class="campo w-32 text-right"
                [formControl]="monto"
              />
            </div>
            <button type="submit" class="btn-primario">Pagar y registrar egreso</button>
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
export class PagoProveedorCajaPanel {
  private readonly api = inject(CajaApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly sesionId = input.required<string>();
  readonly registrado = output<PagoProveedorCaja>();

  protected readonly texto = this.fb.control('');
  protected readonly monto = this.fb.control<number | null>(null, [
    Validators.required,
    Validators.min(0.01),
  ]);
  protected readonly cuentas = signal<CuentaProveedorCaja[]>([]);
  protected readonly buscado = signal(false);
  protected readonly cuenta = signal<CuentaProveedorCaja | null>(null);
  protected readonly error = signal<Problema | null>(null);

  protected async buscar(): Promise<void> {
    try {
      this.error.set(null);
      this.cuentas.set(
        await firstValueFrom(this.api.proveedores(this.sesionId(), this.texto.value)),
      );
      this.buscado.set(true);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected elegir(c: CuentaProveedorCaja): void {
    this.cuenta.set(c);
    this.monto.setValue(c.saldo);
  }

  protected async pagar(): Promise<void> {
    const c = this.cuenta();
    if (!c || this.monto.invalid) {
      this.monto.markAsTouched();
      return;
    }
    try {
      this.error.set(null);
      const p = await firstValueFrom(
        this.api.pagarProveedor(this.sesionId(), c.id, Number(this.monto.value)),
      );
      this.avisos.exito(
        p.saldo === 0
          ? `Pagado: ${p.comprobante} quedó cancelada.`
          : `Pago registrado; saldo S/ ${p.saldo.toFixed(2)}.`,
      );
      this.cuenta.set(null);
      this.registrado.emit(p);
      await this.buscar();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
