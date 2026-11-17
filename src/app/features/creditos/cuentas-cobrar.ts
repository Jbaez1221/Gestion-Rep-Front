import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { CuentaPorCobrarListado, EstadoCuenta, Pagina } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { CreditosApi } from './creditos.api';

/** Cuentas por cobrar de las ventas al crédito, con su vencimiento y saldo. */
@Component({
  selector: 'app-cuentas-cobrar',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, DecimalPipe, ErrorApi, Paginador],
  template: `
    <section class="space-y-4">
      <div>
        <h1 class="titulo-pagina">Créditos</h1>
        <p class="mt-1 text-sm text-slate-600">
          Cada venta al crédito deja una cuenta por cobrar que vence según los días de crédito del
          cliente. Se cancela con abonos en caja o con notas de crédito.
        </p>
      </div>
      <form [formGroup]="filtros" (ngSubmit)="buscar(0)" class="flex flex-wrap items-end gap-3">
        <div class="min-w-64">
          <label for="cr-texto" class="etiqueta">Buscar</label>
          <input
            id="cr-texto"
            type="search"
            class="campo"
            formControlName="texto"
            placeholder="Cliente, RUC/DNI o F001-…"
          />
        </div>
        <div>
          <label for="cr-estado" class="etiqueta">Estado</label>
          <select id="cr-estado" class="campo" formControlName="estado">
            <option value="">Todas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="PAGADA">Pagadas</option>
          </select>
        </div>
        <label class="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" formControlName="vencidas" /> Solo vencidas
        </label>
        <button type="submit" class="btn-secundario">Buscar</button>
      </form>
      <app-error-api [problema]="error()" />
      <div class="tarjeta overflow-x-auto p-0 sm:p-0">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Cuenta</th>
              <th scope="col">Cliente</th>
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
                    [routerLink]="['/creditos/cuenta', c.id]"
                    class="font-mono text-marca-700 hover:underline"
                    >{{ c.numero }}</a
                  >
                </td>
                <td>
                  {{ c.clienteNombre }}
                  <span class="block font-mono text-xs text-slate-500">{{
                    c.clienteDocumento
                  }}</span>
                </td>
                <td class="font-mono">{{ c.comprobante }}</td>
                <td [class.text-red-700]="c.vencida">
                  {{ c.fechaVencimiento | date: 'dd/MM/yyyy' }}
                  @if (c.vencida) {
                    <span class="block text-xs">{{ c.diasVencida }} días vencida</span>
                  }
                </td>
                <td class="text-right">{{ c.monto | number: '1.2-2' }}</td>
                <td class="text-right font-semibold">{{ c.saldo | number: '1.2-2' }}</td>
                <td>
                  @if (c.estado === 'PAGADA') {
                    <span class="insignia-ok">Pagada</span>
                  } @else if (c.vencida) {
                    <span class="insignia bg-red-100 text-red-800">Vencida</span>
                  } @else {
                    <span class="insignia-alerta">Pendiente</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="py-6 text-center text-slate-500">
                  No hay cuentas por cobrar con esos filtros.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-paginador [pagina]="pagina()" (cambiar)="buscar($event)" />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentasCobrar implements OnInit {
  private readonly api = inject(CreditosApi);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly pagina = signal<Pagina<CuentaPorCobrarListado> | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly filtros = this.fb.group({
    texto: [''],
    estado: ['PENDIENTE' as EstadoCuenta | ''],
    vencidas: [false],
  });

  ngOnInit(): void {
    void this.buscar(0);
  }

  protected async buscar(pagina: number): Promise<void> {
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(this.api.cuentas({ ...this.filtros.getRawValue(), pagina })),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
