import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { EstadoPedido, Pagina, PedidoListado } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { NOMBRE_ESTADO_PEDIDO, claseEstadoPedido, siglaDocumento } from './calculo-venta';
import { VentasApi } from './ventas.api';

@Component({
  selector: 'app-pedidos-lista',
  imports: [ReactiveFormsModule, RouterLink, ErrorApi, Paginador, DatePipe, DecimalPipe],
  template: `
    <div class="space-y-4">
      <form [formGroup]="filtros" (ngSubmit)="buscar(0)" class="barra-filtros">
        <div class="min-w-64">
          <label for="pv-texto" class="etiqueta">Buscar</label>
          <input
            id="pv-texto"
            type="search"
            class="campo"
            formControlName="texto"
            placeholder="Cliente, documento o PV-…"
          />
        </div>
        <div>
          <label for="pv-estado" class="etiqueta">Estado</label>
          <select id="pv-estado" class="campo" formControlName="estado">
            <option value="">Todos</option>
            @for (e of estados; track e) {
              <option [value]="e">{{ nombres[e] }}</option>
            }
          </select>
        </div>
        <label class="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" formControlName="propios" /> Solo mis pedidos
        </label>
        <button type="submit" class="btn-secundario">Buscar</button>
        <a class="btn-enlace" [href]="excel()" download>Exportar Excel</a>
      </form>
      <app-error-api [problema]="error()" />
      <div class="tarjeta overflow-x-auto p-0 sm:p-0">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Pedido</th>
              <th scope="col">Fecha</th>
              <th scope="col">Cliente</th>
              <th scope="col">Vendedor</th>
              <th scope="col">Comprobante</th>
              <th scope="col" class="text-right">Total</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-borde">
            @for (p of pagina()?.contenido ?? []; track p.id) {
              <tr>
                <td class="font-mono">
                  <a
                    [routerLink]="['/ventas/pedido', p.id]"
                    class="text-texto-acento hover:underline"
                    >{{ p.numero }}</a
                  >
                </td>
                <td>{{ p.fecha | date: 'dd/MM/yyyy' }}</td>
                <td>
                  {{ p.cliente.nombre }}
                  <span class="block font-mono text-xs text-texto-suave"
                    >{{ sigla(p.cliente.tipoDocumento) }} {{ p.cliente.documento }}</span
                  >
                </td>
                <td>{{ p.vendedor }}</td>
                <td>{{ p.tipoComprobante === 'FACTURA' ? 'Factura' : 'Boleta' }}</td>
                <td class="text-right">{{ p.total | number: '1.2-2' }}</td>
                <td>
                  <span [class]="clase(p.estado)">{{ nombres[p.estado] }}</span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="py-6 text-center text-texto-suave">
                  No hay pedidos con esos filtros.
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
export class PedidosLista implements OnInit {
  private readonly api = inject(VentasApi);

  /** El Excel de la búsqueda, con los filtros puestos. */
  protected excel(): string {
    return this.api.pedidosExcel(this.filtros.getRawValue());
  }
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly nombres = NOMBRE_ESTADO_PEDIDO;
  protected readonly clase = claseEstadoPedido;
  protected readonly sigla = siglaDocumento;
  protected readonly estados = Object.keys(NOMBRE_ESTADO_PEDIDO) as EstadoPedido[];

  protected readonly pagina = signal<Pagina<PedidoListado> | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly filtros = this.fb.group({
    texto: [''],
    estado: ['' as EstadoPedido | ''],
    propios: [false],
  });

  ngOnInit(): void {
    void this.buscar(0);
  }

  protected async buscar(numero = 0): Promise<void> {
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(this.api.pedidos({ ...this.filtros.getRawValue(), pagina: numero })),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
