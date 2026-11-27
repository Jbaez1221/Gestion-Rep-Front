import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import {
  CuentaPagarListado,
  EstadoCuentaPagar,
  Pagina,
  ResumenPagar,
} from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { CreditosApi } from './creditos.api';

export const SIMBOLO: Record<string, string> = { PEN: 'S/', USD: 'US$' };

/** Deudas con proveedores por vencimiento, con su antigüedad y las detracciones por depositar. */
@Component({
  selector: 'app-cuentas-pagar',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, DecimalPipe, ErrorApi, Paginador],
  template: `
    <div class="space-y-4">
      <p class="text-sm text-slate-600">
        Cada factura, boleta o nota de débito registrada en compras deja su deuda; la nota de
        crédito del proveedor la reduce. Se paga por banco aquí o en efectivo desde caja (bajo S/
        2,000). La detracción se deposita aparte en el Banco de la Nación.
      </p>
      @if (resumen(); as r) {
        <section class="grid gap-3 sm:grid-cols-3" aria-label="Resumen">
          @for (m of r.porMoneda; track m.moneda) {
            <div class="tarjeta text-sm">
              <p class="etiqueta">Por pagar en {{ m.moneda === 'PEN' ? 'soles' : 'dólares' }}</p>
              <p class="text-xl font-semibold">
                {{ simbolo[m.moneda] }} {{ m.total | number: '1.2-2' }}
              </p>
              <dl class="mt-1 grid grid-cols-2 text-xs text-slate-600">
                <dt>Por vencer</dt>
                <dd class="text-right">{{ m.porVencer | number: '1.2-2' }}</dd>
                <dt>Vencido 1–30</dt>
                <dd class="text-right">{{ m.vencido1a30 | number: '1.2-2' }}</dd>
                <dt>31–60</dt>
                <dd class="text-right">{{ m.vencido31a60 | number: '1.2-2' }}</dd>
                <dt>61–90</dt>
                <dd class="text-right">{{ m.vencido61a90 | number: '1.2-2' }}</dd>
                <dt>Más de 90</dt>
                <dd class="text-right" [class.text-red-700]="m.vencidoMas90 > 0">
                  {{ m.vencidoMas90 | number: '1.2-2' }}
                </dd>
              </dl>
            </div>
          }
          <div class="tarjeta text-sm">
            <p class="etiqueta">Detracciones por depositar</p>
            <p class="text-xl font-semibold">S/ {{ r.detraccionesPendientes | number: '1.2-2' }}</p>
            @if (r.detraccionesVencidas > 0) {
              <p class="text-xs text-red-700">{{ r.detraccionesVencidas }} fuera de plazo</p>
            }
            <p class="mt-2 text-xs text-slate-600">
              {{ r.vencenEn7Dias }} cuentas vencen en 7 días.
            </p>
          </div>
        </section>
      }
      <form [formGroup]="filtros" (ngSubmit)="buscar(0)" class="flex flex-wrap items-end gap-3">
        <div class="min-w-64">
          <label for="cp-texto" class="etiqueta">Buscar</label>
          <input
            id="cp-texto"
            type="search"
            class="campo"
            formControlName="texto"
            placeholder="Proveedor, RUC, F001-… o CP-…"
          />
        </div>
        <div>
          <label for="cp-estado" class="etiqueta">Estado</label>
          <select id="cp-estado" class="campo" formControlName="estado">
            <option value="">Todas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="PAGADA">Pagadas</option>
            <option value="ANULADA">Anuladas</option>
          </select>
        </div>
        <div>
          <label for="cp-hasta" class="etiqueta">Vencen hasta</label>
          <input id="cp-hasta" type="date" class="campo" formControlName="venceHasta" />
        </div>
        <label class="flex items-center gap-2 pb-2 text-sm">
          <input id="cp-vencidas" type="checkbox" formControlName="vencidas" /> Vencidas
        </label>
        <label class="flex items-center gap-2 pb-2 text-sm">
          <input id="cp-detraccion" type="checkbox" formControlName="detraccionPendiente" />
          Detracción por depositar
        </label>
        <button type="submit" class="btn-secundario">Buscar</button>
      </form>
      <app-error-api [problema]="error()" />
      <div class="tarjeta overflow-x-auto p-0 sm:p-0">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Cuenta</th>
              <th scope="col">Proveedor</th>
              <th scope="col">Comprobante</th>
              <th scope="col">Vence</th>
              <th scope="col" class="text-right">Monto</th>
              <th scope="col" class="text-right">Saldo</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (c of pagina()?.contenido ?? []; track c.id) {
              <tr>
                <td>
                  <a
                    [routerLink]="['/creditos/pagar', c.id]"
                    class="font-mono text-marca-700 hover:underline"
                    >{{ c.numero }}</a
                  >
                </td>
                <td>
                  {{ c.proveedorNombre }}
                  <span class="block font-mono text-xs text-slate-500">{{
                    c.proveedorDocumento
                  }}</span>
                </td>
                <td class="font-mono">{{ c.comprobante }}</td>
                <td [class.text-red-700]="c.vencida">
                  {{ c.fechaVencimiento | date: 'dd/MM/yyyy' }}
                  @if (c.vencida) {
                    <span class="block text-xs">{{ c.diasVencida }} días vencida</span>
                  }
                </td>
                <td class="text-right">{{ simbolo[c.moneda] }} {{ c.monto | number: '1.2-2' }}</td>
                <td class="text-right font-semibold">{{ c.saldo | number: '1.2-2' }}</td>
                <td>
                  @switch (c.estado) {
                    @case ('PAGADA') {
                      <span class="insignia-ok">Pagada</span>
                    }
                    @case ('ANULADA') {
                      <span class="insignia-neutra">Anulada</span>
                    }
                    @default {
                      <span
                        [class]="c.vencida ? 'insignia bg-red-100 text-red-800' : 'insignia-alerta'"
                      >
                        {{ c.vencida ? 'Vencida' : 'Pendiente' }}
                      </span>
                    }
                  }
                  @if (c.detraccionPendiente) {
                    <span class="block text-xs text-amber-800">
                      Detracción S/ {{ c.detraccionSoles | number: '1.2-2' }} hasta
                      {{ c.detraccionVence | date: 'dd/MM' }}
                    </span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="py-6 text-center text-slate-500">
                  No hay cuentas por pagar con esos filtros.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-paginador [pagina]="pagina()" (cambiar)="buscar($event)" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentasPagar implements OnInit {
  private readonly api = inject(CreditosApi);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly simbolo = SIMBOLO;
  protected readonly pagina = signal<Pagina<CuentaPagarListado> | null>(null);
  protected readonly resumen = signal<ResumenPagar | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly filtros = this.fb.group({
    texto: [''],
    estado: ['PENDIENTE' as EstadoCuentaPagar | ''],
    venceHasta: [''],
    vencidas: [false],
    detraccionPendiente: [false],
  });

  ngOnInit(): void {
    void this.buscar(0);
    void this.cargarResumen();
  }

  private async cargarResumen(): Promise<void> {
    try {
      this.resumen.set(await firstValueFrom(this.api.resumenPagar()));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async buscar(pagina: number): Promise<void> {
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(this.api.cuentasPagar({ ...this.filtros.getRawValue(), pagina })),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
