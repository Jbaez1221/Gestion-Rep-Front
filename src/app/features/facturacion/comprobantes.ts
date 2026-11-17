import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import {
  ComprobanteVentaListado,
  Pagina,
  TipoComprobanteEmitido,
} from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { ESTADO_COMPROBANTE, NOMBRE_TIPO } from './etiquetas';
import { FacturacionApi } from './facturacion.api';

@Component({
  selector: 'app-comprobantes',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, DecimalPipe, ErrorApi, Paginador],
  template: `
    <section class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 class="titulo-pagina">Comprobantes de venta</h1>
          <p class="mt-1 text-sm text-slate-600">
            Boletas, facturas y notas de crédito emitidas en caja, con su estado en SUNAT. Se envían
            solas al facturador electrónico; las que fallan se reintentan.
          </p>
        </div>
        <a routerLink="/facturacion/guias" class="btn-enlace">Guías de remisión</a>
      </div>
      <form [formGroup]="filtros" (ngSubmit)="buscar(0)" class="flex flex-wrap items-end gap-3">
        <div class="min-w-64">
          <label for="fc-texto" class="etiqueta">Buscar</label>
          <input
            id="fc-texto"
            type="search"
            class="campo"
            formControlName="texto"
            placeholder="Cliente, documento, B001-… o PV-…"
          />
        </div>
        <div>
          <label for="fc-tipo" class="etiqueta">Tipo</label>
          <select id="fc-tipo" class="campo" formControlName="tipo">
            <option value="">Todos</option>
            <option value="BOLETA">Boletas</option>
            <option value="FACTURA">Facturas</option>
            <option value="NOTA_CREDITO">Notas de crédito</option>
          </select>
        </div>
        <div>
          <label for="fc-desde" class="etiqueta">Desde</label>
          <input id="fc-desde" type="date" class="campo" formControlName="desde" />
        </div>
        <div>
          <label for="fc-hasta" class="etiqueta">Hasta</label>
          <input id="fc-hasta" type="date" class="campo" formControlName="hasta" />
        </div>
        <button type="submit" class="btn-secundario">Buscar</button>
      </form>
      <app-error-api [problema]="error()" />
      <div class="tarjeta overflow-x-auto p-0 sm:p-0">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Comprobante</th>
              <th scope="col">Emisión</th>
              <th scope="col">Cliente</th>
              <th scope="col">Pedido</th>
              <th scope="col" class="text-right">Total</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (c of pagina()?.contenido ?? []; track c.id) {
              <tr>
                <td>
                  <a
                    [routerLink]="['/facturacion/comprobante', c.id]"
                    class="text-marca-700 hover:underline"
                  >
                    {{ tipos[c.tipo] }}
                    <span class="font-mono">{{ c.comprobante }}</span>
                  </a>
                </td>
                <td>{{ c.fechaEmision | date: 'dd/MM/yyyy' }}</td>
                <td>
                  {{ c.clienteNombre }}
                  <span class="block font-mono text-xs text-slate-500">{{
                    c.clienteDocumento
                  }}</span>
                </td>
                <td class="font-mono">{{ c.origenNumero }}</td>
                <td class="text-right">{{ c.total | number: '1.2-2' }}</td>
                <td>
                  <span [class]="estados[c.estado].clase">{{ estados[c.estado].texto }}</span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="py-6 text-center text-slate-500">
                  No hay comprobantes con esos filtros.
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
export class Comprobantes implements OnInit {
  private readonly api = inject(FacturacionApi);
  protected readonly tipos = NOMBRE_TIPO;
  protected readonly estados = ESTADO_COMPROBANTE;
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly pagina = signal<Pagina<ComprobanteVentaListado> | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly filtros = this.fb.group({
    texto: [''],
    tipo: ['' as TipoComprobanteEmitido | ''],
    desde: [''],
    hasta: [''],
  });

  ngOnInit(): void {
    void this.buscar(0);
  }

  protected async buscar(numero = 0): Promise<void> {
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(
          this.api.comprobantes({ ...this.filtros.getRawValue(), pagina: numero }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
