import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { SesionCaja } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { NOMBRE_MEDIO } from './caja-operar';
import { CajaApi } from './caja.api';

/** Reporte del turno: cobros, totales por medio de pago, movimientos y arqueo. */
@Component({
  selector: 'app-sesion-detalle',
  imports: [RouterLink, DatePipe, DecimalPipe, ErrorApi],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="titulo-pagina">
          Sesión de caja <span class="font-mono">{{ sesion()?.numero }}</span>
        </h1>
        <a routerLink="/caja/sesiones" class="btn-enlace">Volver a las sesiones</a>
      </div>
      <app-error-api [problema]="error()" />
      @if (sesion(); as s) {
        <section class="tarjeta grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p class="etiqueta">Caja y cajero</p>
            <p>{{ s.caja }} · {{ s.cajero }}</p>
          </div>
          <div>
            <p class="etiqueta">Apertura</p>
            <p>
              {{ s.apertura | date: 'dd/MM/yyyy HH:mm' }} · S/
              {{ s.montoApertura | number: '1.2-2' }}
            </p>
          </div>
          <div>
            <p class="etiqueta">Cierre</p>
            <p>{{ s.cierre ? (s.cierre | date: 'dd/MM/yyyy HH:mm') : 'Abierta' }}</p>
          </div>
          <div>
            <p class="etiqueta">Cobrado</p>
            <p>{{ s.cobros }} · S/ {{ s.totalCobrado | number: '1.2-2' }}</p>
          </div>
        </section>
        <div class="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <div class="tarjeta overflow-x-auto p-0 sm:p-0">
            <table class="tabla">
              <thead>
                <tr>
                  <th scope="col">Comprobante</th>
                  <th scope="col">Pedido</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Pagos</th>
                  <th scope="col" class="text-right">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (c of s.detalleCobros; track c.id) {
                  <tr>
                    <td class="font-mono">
                      <a
                        [routerLink]="['/facturacion/comprobante', c.comprobanteId]"
                        class="text-marca-700 hover:underline"
                        >{{ c.comprobante }}</a
                      >
                    </td>
                    <td class="font-mono">{{ c.pedidoNumero }}</td>
                    <td>{{ c.clienteNombre }}</td>
                    <td class="text-xs">
                      @for (p of c.pagos; track $index) {
                        <span class="block"
                          >{{ medios[p.medio] }} {{ p.monto | number: '1.2-2' }}</span
                        >
                      }
                    </td>
                    <td class="text-right">{{ c.total | number: '1.2-2' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="py-6 text-center text-slate-500">Sin cobros.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <section class="tarjeta space-y-2 self-start text-sm">
            <h2 class="font-semibold">Arqueo</h2>
            <dl class="grid grid-cols-2 gap-1">
              @for (m of s.porMedio; track m.medio) {
                <dt>{{ medios[m.medio] }}</dt>
                <dd class="text-right">{{ m.monto | number: '1.2-2' }}</dd>
              }
              <dt>Ingresos</dt>
              <dd class="text-right">{{ s.ingresos | number: '1.2-2' }}</dd>
              <dt>Egresos</dt>
              <dd class="text-right">{{ s.egresos | number: '1.2-2' }}</dd>
              <dt class="font-semibold">Efectivo esperado</dt>
              <dd class="text-right font-semibold">{{ s.efectivoEsperado | number: '1.2-2' }}</dd>
              @if (s.efectivoContado !== null) {
                <dt>Contado</dt>
                <dd class="text-right">{{ s.efectivoContado | number: '1.2-2' }}</dd>
                <dt>Diferencia</dt>
                <dd class="text-right" [class.text-red-700]="(s.diferencia ?? 0) < 0">
                  {{ s.diferencia | number: '1.2-2' }}
                </dd>
              }
            </dl>
            @if (s.observacionCierre) {
              <p class="text-xs text-slate-600">{{ s.observacionCierre }}</p>
            }
            @if (s.movimientos.length > 0) {
              <h3 class="font-semibold">Movimientos</h3>
              <ul class="text-xs">
                @for (m of s.movimientos; track m.id) {
                  <li>
                    {{ m.tipo === 'INGRESO' ? '+' : '−' }} {{ m.monto | number: '1.2-2' }} ·
                    {{ m.motivo }} ·
                    {{ m.usuario }}
                  </li>
                }
              </ul>
            }
          </section>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SesionDetalle implements OnInit {
  private readonly api = inject(CajaApi);
  protected readonly medios = NOMBRE_MEDIO;
  readonly id = input.required<string>();
  protected readonly sesion = signal<SesionCaja | null>(null);
  protected readonly error = signal<Problema | null>(null);

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      this.sesion.set(await firstValueFrom(this.api.sesion(this.id())));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
