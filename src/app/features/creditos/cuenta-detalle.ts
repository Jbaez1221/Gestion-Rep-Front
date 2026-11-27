import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { CuentaPorCobrar, EstadoCredito } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { CreditosApi } from './creditos.api';

/** La cuenta con sus abonos y el estado de crédito del cliente (límite, usado, vencido). */
@Component({
  selector: 'app-cuenta-detalle',
  imports: [RouterLink, DatePipe, DecimalPipe, ErrorApi],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="titulo-pagina">
          Cuenta por cobrar <span class="font-mono">{{ cuenta()?.numero }}</span>
        </h1>
        <a routerLink="/creditos/cobrar" class="btn-enlace">Volver a cuentas por cobrar</a>
      </div>
      <app-error-api [problema]="error()" />
      @if (cuenta(); as c) {
        <section class="tarjeta grid gap-3 text-sm sm:grid-cols-4">
          <div class="sm:col-span-2">
            <p class="etiqueta">Cliente</p>
            <p>
              <span class="font-mono">{{ c.clienteDocumento }}</span> · {{ c.clienteNombre }}
            </p>
          </div>
          <div>
            <p class="etiqueta">Comprobante</p>
            <a
              [routerLink]="['/facturacion/comprobante', c.comprobanteId]"
              class="font-mono text-marca-700 hover:underline"
              >{{ c.comprobante }}</a
            >
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
            <p>S/ {{ c.monto | number: '1.2-2' }}</p>
          </div>
          <div>
            <p class="etiqueta">Saldo</p>
            <p class="font-semibold">S/ {{ c.saldo | number: '1.2-2' }}</p>
          </div>
          <div>
            <p class="etiqueta">Estado</p>
            <p>{{ c.estado === 'PAGADA' ? 'Pagada' : c.vencida ? 'Vencida' : 'Pendiente' }}</p>
          </div>
          <div>
            <p class="etiqueta">Registró</p>
            <p>
              {{ c.creadoPor ?? '—' }}
              @if (c.autorizadoPor) {
                <span class="block text-xs text-slate-500">Autorizó {{ c.autorizadoPor }}</span>
              }
            </p>
          </div>
        </section>
        <div class="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <section class="tarjeta space-y-2">
            <h2 class="font-semibold">Abonos y notas de crédito</h2>
            <ul class="divide-y divide-slate-100 text-sm">
              @for (a of c.abonos; track a.id) {
                <li class="flex justify-between gap-2 py-2">
                  <span>
                    {{ a.fecha | date: 'dd/MM/yyyy HH:mm' }} ·
                    {{ a.tipo === 'ABONO' ? 'Abono' : 'Nota de crédito' }}
                    <span class="block text-xs text-slate-500"
                      >{{ a.detalle }} · {{ a.usuario }}</span
                    >
                  </span>
                  <span class="font-semibold">S/ {{ a.monto | number: '1.2-2' }}</span>
                </li>
              } @empty {
                <li class="py-4 text-center text-slate-500">Aún no hay abonos.</li>
              }
            </ul>
          </section>
          @if (estado(); as e) {
            <section class="tarjeta space-y-2 self-start text-sm" aria-label="Crédito del cliente">
              <h2 class="font-semibold">Crédito del cliente</h2>
              <dl class="grid grid-cols-2 gap-1">
                <dt>Días de crédito</dt>
                <dd class="text-right">{{ e.diasCredito }}</dd>
                <dt>Límite</dt>
                <dd class="text-right">
                  {{ e.limite === null ? 'Sin límite' : (e.limite | number: '1.2-2') }}
                </dd>
                <dt>Usado</dt>
                <dd class="text-right">{{ e.usado | number: '1.2-2' }}</dd>
                <dt>Disponible</dt>
                <dd class="text-right font-semibold">{{ e.disponible | number: '1.2-2' }}</dd>
                <dt>Vencido</dt>
                <dd class="text-right" [class.text-red-700]="e.vencido > 0">
                  {{ e.vencido | number: '1.2-2' }}
                </dd>
              </dl>
              <p class="text-xs text-slate-500">{{ e.cuentas.length }} cuentas pendientes.</p>
            </section>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentaDetalle implements OnInit {
  private readonly api = inject(CreditosApi);
  readonly id = input.required<string>();
  protected readonly cuenta = signal<CuentaPorCobrar | null>(null);
  protected readonly estado = signal<EstadoCredito | null>(null);
  protected readonly error = signal<Problema | null>(null);

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      const c = await firstValueFrom(this.api.cuenta(this.id()));
      this.cuenta.set(c);
      this.estado.set(await firstValueFrom(this.api.estadoCliente(c.clienteId)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
