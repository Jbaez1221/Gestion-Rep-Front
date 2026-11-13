import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { AlmacenOpcion, Resumen as ResumenModelo } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { hoyEnLima } from '../centros/arbol';
import { primerDiaDelMes } from './etiquetas';
import { InventarioApi, urlExcel } from './inventario.api';

@Component({
  selector: 'app-resumen-inventario',
  imports: [ReactiveFormsModule, DecimalPipe, ErrorApi],
  template: `
    <form [formGroup]="formulario" (ngSubmit)="consultar()" class="flex flex-wrap items-end gap-3">
      <div>
        <label for="r-almacen" class="etiqueta">Almacén</label>
        <select id="r-almacen" class="campo" formControlName="almacenId">
          <option value="">Elija…</option>
          @for (a of almacenes(); track a.id) {
            <option [value]="a.id">{{ a.codigo }} · {{ a.nombre }}</option>
          }
        </select>
      </div>
      <div>
        <label for="r-desde" class="etiqueta">Desde</label>
        <input id="r-desde" type="date" class="campo" formControlName="desde" />
      </div>
      <div>
        <label for="r-hasta" class="etiqueta">Hasta</label>
        <input id="r-hasta" type="date" class="campo" formControlName="hasta" />
      </div>
      <button type="submit" class="btn-primario">Consultar</button>
      @if (resumen(); as r) {
        <a [href]="excel(r)" class="btn-secundario" download>Excel</a>
      }
    </form>
    <app-error-api [problema]="error()" />
    @if (resumen(); as r) {
      <div class="tarjeta overflow-x-auto p-0 sm:p-0">
        <table class="tabla">
          <caption class="px-3 py-2 text-left font-semibold">
            {{
              r.almacen.codigo
            }}
            · del
            {{
              r.desde
            }}
            al
            {{
              r.hasta
            }}
            (valores en S/)
          </caption>
          <thead>
            <tr>
              <th scope="col">Artículo</th>
              <th scope="col" class="text-right">Saldo inicial</th>
              <th scope="col" class="text-right">Entradas</th>
              <th scope="col" class="text-right">Salidas</th>
              <th scope="col" class="text-right">Saldo final</th>
              <th scope="col" class="text-right">Valor final</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (f of r.filas; track f.articulo.id) {
              <tr>
                <td>
                  <span class="font-mono">{{ f.articulo.codigo }}</span> ·
                  {{ f.articulo.descripcion }}
                </td>
                <td class="text-right">{{ f.saldoInicialCantidad | number: '1.0-4' }}</td>
                <td class="text-right">{{ f.entradasCantidad | number: '1.0-4' }}</td>
                <td class="text-right">{{ f.salidasCantidad | number: '1.0-4' }}</td>
                <td class="text-right">{{ f.saldoFinalCantidad | number: '1.0-4' }}</td>
                <td class="text-right">{{ f.saldoFinalValor | number: '1.2-2' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="py-6 text-center text-slate-500">
                  Sin movimientos ni stock en el período.
                </td>
              </tr>
            }
          </tbody>
          <tfoot class="font-semibold">
            <tr>
              <th scope="row" class="text-right">Valores</th>
              <td class="text-right">{{ r.saldoInicialValor | number: '1.2-2' }}</td>
              <td class="text-right">{{ r.entradasValor | number: '1.2-2' }}</td>
              <td class="text-right">{{ r.salidasValor | number: '1.2-2' }}</td>
              <td></td>
              <td class="text-right">{{ r.saldoFinalValor | number: '1.2-2' }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumenInventario implements OnInit {
  private readonly api = inject(InventarioApi);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly almacenes = signal<AlmacenOpcion[]>([]);
  protected readonly resumen = signal<ResumenModelo | null>(null);
  protected readonly error = signal<Problema | null>(null);

  protected readonly formulario = this.fb.group({
    almacenId: ['', Validators.required],
    desde: [primerDiaDelMes(hoyEnLima()), Validators.required],
    hasta: [hoyEnLima(), Validators.required],
  });

  ngOnInit(): void {
    void this.iniciar();
  }

  private async iniciar(): Promise<void> {
    try {
      const almacenes = await firstValueFrom(this.api.almacenes());
      this.almacenes.set(almacenes);
      if (almacenes.length === 1 && almacenes[0]) {
        this.formulario.controls.almacenId.setValue(almacenes[0].id);
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async consultar(): Promise<void> {
    if (this.formulario.invalid) {
      this.error.set({
        status: 400,
        title: 'Datos incompletos',
        detail: 'Elija almacén y fechas.',
      });
      return;
    }
    const v = this.formulario.getRawValue();
    try {
      this.error.set(null);
      this.resumen.set(await firstValueFrom(this.api.resumen(v.almacenId, v.desde, v.hasta)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected excel(r: ResumenModelo): string {
    return urlExcel('resumen', { almacenId: r.almacen.id, desde: r.desde, hasta: r.hasta });
  }
}
