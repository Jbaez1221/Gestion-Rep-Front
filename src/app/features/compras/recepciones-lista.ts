import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { EstadoRecepcion, Pagina, RecepcionListado } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { NOMBRE_ESTADO_RECEPCION, claseEstadoRecepcion } from './calculo';
import { ComprasApi } from './compras.api';

@Component({
  selector: 'app-recepciones-lista',
  imports: [ReactiveFormsModule, RouterLink, ErrorApi, Paginador, DatePipe, DecimalPipe],
  template: `
    <div class="space-y-4">
      <p class="text-sm text-slate-600">
        Mercadería que llegó con la guía del proveedor antes que la factura: ya está en el almacén
        al costo de la orden. Al registrar la factura, elija las recepciones que factura.
      </p>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <form [formGroup]="filtros" (ngSubmit)="buscar(0)" class="flex flex-wrap items-end gap-3">
          <div class="min-w-64">
            <label for="r-texto" class="etiqueta">Buscar</label>
            <input
              id="r-texto"
              type="search"
              class="campo"
              formControlName="texto"
              placeholder="Proveedor, RUC, guía o RE-…"
            />
          </div>
          <div>
            <label for="r-estado" class="etiqueta">Estado</label>
            <select id="r-estado" class="campo" formControlName="estado">
              <option value="">Todas</option>
              <option value="PENDIENTE">Esperan factura</option>
              <option value="FACTURADA">Facturadas</option>
              <option value="ANULADA">Anuladas</option>
            </select>
          </div>
          <button type="submit" class="btn-secundario">Buscar</button>
        </form>
        @if (sesion.tiene(permisos.comprasRegistrar)) {
          <a routerLink="/compras/recepcion/nueva" class="btn-primario">Recibir con guía</a>
        }
      </div>
      <app-error-api [problema]="error()" />
      <div class="tarjeta overflow-x-auto p-0 sm:p-0">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Recepción</th>
              <th scope="col">Fecha</th>
              <th scope="col">Proveedor</th>
              <th scope="col">Guía</th>
              <th scope="col">Almacén</th>
              <th scope="col" class="text-right">Costo S/</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (r of pagina()?.contenido ?? []; track r.id) {
              <tr>
                <td class="font-mono">
                  <a
                    [routerLink]="['/compras/recepcion', r.id]"
                    class="text-marca-700 hover:underline"
                    >{{ r.numero }}</a
                  >
                </td>
                <td>{{ r.fecha | date: 'dd/MM/yyyy' }}</td>
                <td>{{ r.proveedor.nombre }}</td>
                <td class="font-mono">{{ r.guia ?? '—' }}</td>
                <td>{{ r.almacen?.nombre ?? '—' }}</td>
                <td class="text-right">{{ r.totalSoles | number: '1.2-2' }}</td>
                <td>
                  <span [class]="clase(r.estado)">{{ nombres[r.estado] }}</span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="py-6 text-center text-slate-500">
                  No hay recepciones con esos filtros.
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
export class RecepcionesLista implements OnInit {
  private readonly api = inject(ComprasApi);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly nombres = NOMBRE_ESTADO_RECEPCION;
  protected readonly clase = claseEstadoRecepcion;

  protected readonly pagina = signal<Pagina<RecepcionListado> | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly filtros = this.fb.group({
    texto: [''],
    estado: ['PENDIENTE' as EstadoRecepcion | ''],
  });

  ngOnInit(): void {
    void this.buscar(0);
  }

  protected async buscar(numero = 0): Promise<void> {
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(
          this.api.recepciones({ ...this.filtros.getRawValue(), pagina: numero }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
