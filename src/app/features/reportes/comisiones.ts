import { DecimalPipe } from '@angular/common';
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

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { BaseComision, FilaComision, ReporteComisiones } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { hoyEnLima } from '../centros/arbol';
import { ReportesApi } from './reportes.api';

/** Comisión de cada vendedor en el período, con su regla editable por quien tiene el permiso. */
@Component({
  selector: 'app-comisiones',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, ErrorApi],
  template: `
    <section class="space-y-4">
      <nav class="flex gap-1 border-b border-borde" aria-label="Reportes">
        <a routerLink="/reportes/ventas" class="pestana">Ventas</a>
        <a
          routerLink="/reportes/comisiones"
          class="pestana border-acento text-texto-acento"
          aria-current="page"
          >Comisiones</a
        >
      </nav>
      <div>
        <h1 class="titulo-pagina">Comisiones de vendedores</h1>
        <p class="mt-1 text-sm text-texto-2">
          Cada vendedor comisiona un porcentaje de su venta sin IGV o de su margen (que no baja de
          cero), netos de notas de crédito.
        </p>
      </div>
      <form [formGroup]="filtros" (ngSubmit)="buscar()" class="barra-filtros">
        <div>
          <label for="cm-desde" class="etiqueta">Desde</label>
          <input id="cm-desde" type="date" class="campo" formControlName="desde" />
        </div>
        <div>
          <label for="cm-hasta" class="etiqueta">Hasta</label>
          <input id="cm-hasta" type="date" class="campo" formControlName="hasta" />
        </div>
        <button type="submit" class="btn-secundario">Consultar</button>
        <a class="btn-enlace" [href]="excel()" download>Exportar Excel</a>
      </form>
      <app-error-api [problema]="error()" />
      @if (reporte(); as r) {
        <div class="tarjeta overflow-x-auto p-0 sm:p-0">
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Vendedor</th>
                <th scope="col" class="text-right">Venta sin IGV</th>
                <th scope="col" class="text-right">Margen</th>
                <th scope="col">Regla</th>
                <th scope="col" class="text-right">Comisión</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-borde">
              @for (f of r.filas; track f.vendedor; let i = $index) {
                <tr>
                  <td>{{ f.vendedor }}</td>
                  <td class="text-right">{{ f.venta | number: '1.2-2' }}</td>
                  <td class="text-right">{{ f.margen | number: '1.2-2' }}</td>
                  <td>
                    @if (puedeConfigurar() && f.vendedor !== 'Sin vendedor') {
                      <div class="flex flex-wrap items-center gap-1">
                        <label [for]="'cm-pct-' + i" class="sr-only">Porcentaje</label>
                        <input
                          [id]="'cm-pct-' + i"
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.25"
                          class="campo w-20 text-right"
                          [value]="f.porcentaje ?? ''"
                          #pct
                        />
                        <span>%</span>
                        <label [for]="'cm-base-' + i" class="sr-only">Base</label>
                        <select [id]="'cm-base-' + i" class="campo w-28" #base>
                          <option value="VENTA" [selected]="f.base !== 'MARGEN'">
                            de la venta
                          </option>
                          <option value="MARGEN" [selected]="f.base === 'MARGEN'">
                            del margen
                          </option>
                        </select>
                        <button
                          type="button"
                          class="btn-enlace"
                          (click)="guardar(f, base.value, pct.value)"
                        >
                          Guardar
                        </button>
                        @if (f.base) {
                          <button type="button" class="btn-enlace" (click)="quitar(f)">
                            Quitar
                          </button>
                        }
                      </div>
                    } @else if (f.base) {
                      {{ f.porcentaje | number: '1.0-2' }} %
                      {{ f.base === 'VENTA' ? 'de la venta' : 'del margen' }}
                    } @else {
                      <span class="text-texto-suave">Sin regla</span>
                    }
                  </td>
                  <td class="text-right font-semibold">{{ f.comision | number: '1.2-2' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="py-6 text-center text-texto-suave">
                    Sin ventas en el período.
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="font-semibold">
                <td colspan="4">Total</td>
                <td class="text-right">{{ r.total | number: '1.2-2' }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComisionesPagina implements OnInit {
  private readonly api = inject(ReportesApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly avisos = inject(NotificacionesService);
  private readonly sesion = inject(SesionService);
  protected readonly reporte = signal<ReporteComisiones | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly puedeConfigurar = computed(() =>
    this.sesion.tiene(PERMISOS.reportesComisiones),
  );
  protected readonly filtros = this.fb.group({
    desde: [`${hoyEnLima().slice(0, 8)}01`, Validators.required],
    hasta: [hoyEnLima(), Validators.required],
  });
  private readonly valores = toSignal(this.filtros.valueChanges, {
    initialValue: this.filtros.getRawValue(),
  });
  protected readonly excel = computed(() => {
    const v = { ...this.filtros.getRawValue(), ...this.valores() };
    return this.api.comisionesExcel({ desde: v.desde, hasta: v.hasta });
  });

  ngOnInit(): void {
    void this.buscar();
  }

  protected async buscar(): Promise<void> {
    const v = this.filtros.getRawValue();
    try {
      this.error.set(null);
      this.reporte.set(
        await firstValueFrom(this.api.comisiones({ desde: v.desde, hasta: v.hasta })),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async guardar(f: FilaComision, base: string, porcentaje: string): Promise<void> {
    const pct = Number(porcentaje);
    if (!(pct > 0 && pct <= 100)) {
      this.error.set({
        status: 400,
        title: 'Porcentaje inválido',
        detail: 'Indique un porcentaje mayor que 0 y hasta 100.',
      });
      return;
    }
    try {
      this.error.set(null);
      await firstValueFrom(this.api.guardarRegla(f.vendedor, base as BaseComision, pct));
      this.avisos.exito(`Comisión de ${f.vendedor} guardada.`);
      await this.buscar();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async quitar(f: FilaComision): Promise<void> {
    try {
      this.error.set(null);
      await firstValueFrom(this.api.quitarRegla(f.vendedor));
      this.avisos.exito(`${f.vendedor} ya no comisiona.`);
      await this.buscar();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
