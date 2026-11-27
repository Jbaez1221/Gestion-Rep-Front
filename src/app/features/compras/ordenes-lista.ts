import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { EstadoOrden, OrdenListado, Pagina } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { NOMBRE_ESTADO_ORDEN, claseEstadoOrden } from './calculo';
import { ComprasApi } from './compras.api';

@Component({
  selector: 'app-ordenes-lista',
  imports: [ReactiveFormsModule, RouterLink, ErrorApi, Paginador, DatePipe, DecimalPipe],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <form [formGroup]="filtros" (ngSubmit)="buscar(0)" class="barra-filtros">
          <div class="min-w-64">
            <label for="o-texto" class="etiqueta">Buscar</label>
            <input
              id="o-texto"
              type="search"
              class="campo"
              formControlName="texto"
              placeholder="Proveedor, RUC u OC-…"
            />
          </div>
          <div>
            <label for="o-estado" class="etiqueta">Estado</label>
            <select id="o-estado" class="campo" formControlName="estado">
              <option value="">Todos</option>
              @for (e of estados; track e) {
                <option [value]="e">{{ nombres[e] }}</option>
              }
            </select>
          </div>
          <div>
            <label for="o-desde" class="etiqueta">Desde</label>
            <input id="o-desde" type="date" class="campo" formControlName="desde" />
          </div>
          <div>
            <label for="o-hasta" class="etiqueta">Hasta</label>
            <input id="o-hasta" type="date" class="campo" formControlName="hasta" />
          </div>
          <button type="submit" class="btn-secundario">Buscar</button>
        </form>
        @if (sesion.tiene(permisos.comprasOrdenCrear)) {
          <a routerLink="/compras/orden/nueva" class="btn-primario">Nueva orden</a>
        }
      </div>
      <app-error-api [problema]="error()" />
      <div class="tarjeta overflow-x-auto p-0 sm:p-0">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Orden</th>
              <th scope="col">Fecha</th>
              <th scope="col">Proveedor</th>
              <th scope="col">Almacén</th>
              <th scope="col">Entrega</th>
              <th scope="col" class="text-right">Total</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-borde">
            @for (o of pagina()?.contenido ?? []; track o.id) {
              <tr>
                <td class="font-mono">
                  <a
                    [routerLink]="['/compras/orden', o.id]"
                    class="text-texto-acento hover:underline"
                    >{{ o.numero }}</a
                  >
                </td>
                <td>{{ o.fecha | date: 'dd/MM/yyyy' }}</td>
                <td>{{ o.proveedor.nombre }}</td>
                <td>{{ o.almacen?.nombre ?? '—' }}</td>
                <td>{{ o.fechaEntrega ? (o.fechaEntrega | date: 'dd/MM/yyyy') : '—' }}</td>
                <td class="whitespace-nowrap text-right">
                  {{ o.moneda === 'USD' ? 'US$' : 'S/' }} {{ o.total | number: '1.2-2' }}
                </td>
                <td>
                  <span [class]="clase(o.estado)">{{ nombres[o.estado] }}</span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="py-6 text-center text-texto-suave">
                  No hay órdenes con esos filtros.
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
export class OrdenesLista implements OnInit {
  private readonly api = inject(ComprasApi);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly nombres = NOMBRE_ESTADO_ORDEN;
  protected readonly clase = claseEstadoOrden;
  protected readonly estados = Object.keys(NOMBRE_ESTADO_ORDEN) as EstadoOrden[];

  protected readonly pagina = signal<Pagina<OrdenListado> | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly filtros = this.fb.group({
    texto: [''],
    estado: ['' as EstadoOrden | ''],
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
        await firstValueFrom(this.api.ordenes({ ...this.filtros.getRawValue(), pagina: numero })),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
