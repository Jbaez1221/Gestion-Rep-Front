import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { AgrupacionVentas, ReporteVentas } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { hoyEnLima } from '../centros/arbol';
import { ReportesApi } from './reportes.api';

const NOMBRE_AGRUPACION: Record<AgrupacionVentas, string> = {
  ARTICULO: 'Artículo',
  VENDEDOR: 'Vendedor',
  CLIENTE: 'Cliente',
  DIA: 'Día',
};

/** Venta sin IGV, costo y margen del período, con los filtros que se exportan a Excel. */
@Component({
  selector: 'app-reporte-ventas',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, DatePipe, ErrorApi],
  template: `
    <section class="space-y-4">
      <nav class="flex gap-1 border-b border-slate-200" aria-label="Reportes">
        <a
          routerLink="/reportes/ventas"
          class="pestana border-marca-600 text-marca-700"
          aria-current="page"
          >Ventas</a
        >
        <a routerLink="/reportes/comisiones" class="pestana">Comisiones</a>
      </nav>
      <div>
        <h1 class="titulo-pagina">Reporte de ventas</h1>
        <p class="mt-1 text-sm text-slate-600">
          Venta sin IGV neta de notas de crédito y con las de débito; costo de lo que salió del
          almacén menos lo devuelto, al costo promedio.
        </p>
      </div>
      <form [formGroup]="filtros" (ngSubmit)="buscar()" class="flex flex-wrap items-end gap-3">
        <div>
          <label for="rv-desde" class="etiqueta">Desde</label>
          <input id="rv-desde" type="date" class="campo" formControlName="desde" />
        </div>
        <div>
          <label for="rv-hasta" class="etiqueta">Hasta</label>
          <input id="rv-hasta" type="date" class="campo" formControlName="hasta" />
        </div>
        <div>
          <label for="rv-agrupacion" class="etiqueta">Por</label>
          <select id="rv-agrupacion" class="campo" formControlName="agrupacion">
            @for (a of agrupaciones; track a) {
              <option [value]="a">{{ nombres[a] }}</option>
            }
          </select>
        </div>
        @if (sesion.sucursales().length > 1) {
          <div>
            <label for="rv-sucursal" class="etiqueta">Sucursal</label>
            <select id="rv-sucursal" class="campo" formControlName="sucursalId">
              <option value="">Todas</option>
              @for (s of sesion.sucursales(); track s.id) {
                <option [value]="s.id">{{ s.nombre }}</option>
              }
            </select>
          </div>
        }
        <button type="submit" class="btn-secundario">Consultar</button>
        <a class="btn-enlace" [href]="excel()" download>Exportar Excel</a>
      </form>
      <app-error-api [problema]="error()" />
      @if (reporte(); as r) {
        <div class="tarjeta overflow-x-auto p-0 sm:p-0">
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">{{ nombres[r.agrupacion] }}</th>
                <th scope="col" class="text-right">Venta sin IGV</th>
                <th scope="col" class="text-right">Costo</th>
                <th scope="col" class="text-right">Margen</th>
                <th scope="col" class="text-right">Margen %</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (f of r.filas; track f.clave) {
                <tr>
                  <td>
                    @if (r.agrupacion === 'DIA') {
                      {{ f.nombre | date: 'dd/MM/yyyy' }}
                    } @else {
                      @if (f.detalle) {
                        <span class="font-mono">{{ f.detalle }}</span> ·
                      }
                      {{ f.nombre ?? '—' }}
                    }
                  </td>
                  <td class="text-right">{{ f.venta | number: '1.2-2' }}</td>
                  <td class="text-right">{{ f.costo | number: '1.2-2' }}</td>
                  <td class="text-right" [class.text-red-700]="f.margen < 0">
                    {{ f.margen | number: '1.2-2' }}
                  </td>
                  <td class="text-right">
                    {{ f.margenPorcentaje === null ? '—' : (f.margenPorcentaje | number: '1.2-2') }}
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="py-6 text-center text-slate-500">
                    Sin ventas en el período.
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="font-semibold">
                <td>Total</td>
                <td class="text-right">{{ r.total.venta | number: '1.2-2' }}</td>
                <td class="text-right">{{ r.total.costo | number: '1.2-2' }}</td>
                <td class="text-right">{{ r.total.margen | number: '1.2-2' }}</td>
                <td class="text-right">
                  {{
                    r.total.margenPorcentaje === null
                      ? '—'
                      : (r.total.margenPorcentaje | number: '1.2-2')
                  }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteVentasPagina implements OnInit {
  private readonly api = inject(ReportesApi);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly nombres = NOMBRE_AGRUPACION;
  protected readonly agrupaciones = Object.keys(NOMBRE_AGRUPACION) as AgrupacionVentas[];
  protected readonly reporte = signal<ReporteVentas | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly filtros = this.fb.group({
    desde: [`${hoyEnLima().slice(0, 8)}01`, Validators.required],
    hasta: [hoyEnLima(), Validators.required],
    agrupacion: ['ARTICULO' as AgrupacionVentas],
    sucursalId: [''],
  });
  private readonly valores = toSignal(this.filtros.valueChanges, {
    initialValue: this.filtros.getRawValue(),
  });
  protected readonly excel = computed(() => {
    const v = { ...this.filtros.getRawValue(), ...this.valores() };
    return this.api.ventasExcel({
      desde: v.desde,
      hasta: v.hasta,
      agrupacion: v.agrupacion,
      sucursalId: v.sucursalId || null,
    });
  });

  ngOnInit(): void {
    void this.buscar();
  }

  protected async buscar(): Promise<void> {
    const v = this.filtros.getRawValue();
    try {
      this.error.set(null);
      this.reporte.set(
        await firstValueFrom(
          this.api.ventas({
            desde: v.desde,
            hasta: v.hasta,
            agrupacion: v.agrupacion,
            sucursalId: v.sucursalId || null,
          }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
