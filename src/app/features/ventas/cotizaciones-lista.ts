import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { CotizacionListado, EstadoCotizacion, Pagina } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { NOMBRE_ESTADO_COTIZACION, claseEstadoCotizacion, siglaDocumento } from './calculo-venta';
import { VentasApi } from './ventas.api';

@Component({
  selector: 'app-cotizaciones-lista',
  imports: [ReactiveFormsModule, RouterLink, ErrorApi, Paginador, DatePipe, DecimalPipe],
  template: `
    <div class="space-y-4">
      <form [formGroup]="filtros" (ngSubmit)="buscar(0)" class="barra-filtros">
        <div class="min-w-64">
          <label for="ct-texto" class="etiqueta">Buscar</label>
          <input
            id="ct-texto"
            type="search"
            class="campo"
            formControlName="texto"
            placeholder="Cliente, documento o CT-…"
          />
        </div>
        <div>
          <label for="ct-estado" class="etiqueta">Estado</label>
          <select id="ct-estado" class="campo" formControlName="estado">
            <option value="">Todos</option>
            @for (e of estados; track e) {
              <option [value]="e">{{ nombres[e] }}</option>
            }
          </select>
        </div>
        <label class="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" formControlName="propios" /> Solo mis cotizaciones
        </label>
        <button type="submit" class="btn-secundario">Buscar</button>
        <a class="btn-enlace" [href]="excel()" download>Exportar Excel</a>
      </form>
      <app-error-api [problema]="error()" />
      <div class="tarjeta overflow-x-auto p-0 sm:p-0">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Cotización</th>
              <th scope="col">Fecha</th>
              <th scope="col">Válida hasta</th>
              <th scope="col">Cliente</th>
              <th scope="col">Vendedor</th>
              <th scope="col" class="text-right">Total</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-borde">
            @for (c of pagina()?.contenido ?? []; track c.id) {
              <tr>
                <td class="font-mono">
                  <a
                    [routerLink]="['/ventas/cotizacion', c.id]"
                    class="text-texto-acento hover:underline"
                    >{{ c.numero }}</a
                  >
                </td>
                <td>{{ c.fecha | date: 'dd/MM/yyyy' }}</td>
                <td>{{ c.validaHasta | date: 'dd/MM/yyyy' }}</td>
                <td>
                  {{ c.cliente.nombre }}
                  <span class="block font-mono text-xs text-texto-suave"
                    >{{ sigla(c.cliente.tipoDocumento) }} {{ c.cliente.documento }}</span
                  >
                </td>
                <td>{{ c.vendedor }}</td>
                <td class="text-right">{{ c.total | number: '1.2-2' }}</td>
                <td>
                  <span [class]="clase(c.estado)">{{ nombres[c.estado] }}</span>
                  @if (c.pedidoNumero) {
                    <span class="block font-mono text-xs text-texto-suave">{{
                      c.pedidoNumero
                    }}</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="py-6 text-center text-texto-suave">
                  No hay cotizaciones con esos filtros.
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
export class CotizacionesLista implements OnInit {
  private readonly api = inject(VentasApi);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly nombres = NOMBRE_ESTADO_COTIZACION;
  protected readonly clase = claseEstadoCotizacion;
  protected readonly sigla = siglaDocumento;
  protected readonly estados = Object.keys(NOMBRE_ESTADO_COTIZACION) as EstadoCotizacion[];

  protected readonly pagina = signal<Pagina<CotizacionListado> | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly filtros = this.fb.group({
    texto: [''],
    estado: ['' as EstadoCotizacion | ''],
    propios: [false],
  });

  ngOnInit(): void {
    void this.buscar(0);
  }

  /** El Excel de la búsqueda, con los filtros puestos. */
  protected excel(): string {
    return this.api.cotizacionesExcel(this.filtros.getRawValue());
  }

  protected async buscar(numero = 0): Promise<void> {
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(
          this.api.cotizaciones({ ...this.filtros.getRawValue(), pagina: numero }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
