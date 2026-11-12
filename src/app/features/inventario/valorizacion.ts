import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { AlmacenOpcion, Valorizacion as ValorizacionModelo } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { TIPOS_EXISTENCIA_SUNAT } from './etiquetas';
import { InventarioApi } from './inventario.api';

@Component({
  selector: 'app-valorizacion',
  imports: [DecimalPipe, ErrorApi],
  template: `
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label for="v-almacen" class="etiqueta">Almacén</label>
        <select id="v-almacen" class="campo" (change)="elegir($event)">
          <option value="">Todos mis almacenes</option>
          @for (a of almacenes(); track a.id) {
            <option [value]="a.id">{{ a.codigo }} · {{ a.nombre }}</option>
          }
        </select>
      </div>
    </div>
    <app-error-api [problema]="error()" />
    @if (datos(); as d) {
      <p class="tarjeta text-lg">
        Valor del inventario al {{ d.fecha }}:
        <strong>S/ {{ d.total | number: '1.2-2' }}</strong>
      </p>
      <div class="grid gap-4 lg:grid-cols-2">
        <section class="tarjeta overflow-x-auto p-0 sm:p-0" aria-label="Por almacén">
          <table class="tabla">
            <caption class="px-3 py-2 text-left font-semibold">
              Por almacén
            </caption>
            <thead>
              <tr>
                <th scope="col">Almacén</th>
                <th scope="col" class="text-right">Artículos</th>
                <th scope="col" class="text-right">Valor (S/)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (f of d.porAlmacen; track f.almacen.id) {
                <tr>
                  <td>{{ f.almacen.codigo }} · {{ f.almacen.nombre }}</td>
                  <td class="text-right">{{ f.articulos }}</td>
                  <td class="text-right">{{ f.valor | number: '1.2-2' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="3" class="py-4 text-center text-slate-500">Sin stock.</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
        <section class="tarjeta overflow-x-auto p-0 sm:p-0" aria-label="Por tipo de existencia">
          <table class="tabla">
            <caption class="px-3 py-2 text-left font-semibold">
              Por tipo de existencia (tabla 5)
            </caption>
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col" class="text-right">Artículos</th>
                <th scope="col" class="text-right">Valor (S/)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (f of d.porTipoExistencia; track f.tipoExistencia) {
                <tr>
                  <td>{{ f.tipoExistencia }} · {{ tipos[f.tipoExistencia] ?? 'Otros' }}</td>
                  <td class="text-right">{{ f.articulos }}</td>
                  <td class="text-right">{{ f.valor | number: '1.2-2' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="3" class="py-4 text-center text-slate-500">Sin stock.</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Valorizacion implements OnInit {
  private readonly api = inject(InventarioApi);
  protected readonly tipos = TIPOS_EXISTENCIA_SUNAT;
  protected readonly almacenes = signal<AlmacenOpcion[]>([]);
  protected readonly datos = signal<ValorizacionModelo | null>(null);
  protected readonly error = signal<Problema | null>(null);

  ngOnInit(): void {
    void this.iniciar();
  }

  private async iniciar(): Promise<void> {
    try {
      this.almacenes.set(await firstValueFrom(this.api.almacenes()));
    } catch (e) {
      this.error.set(aProblema(e));
    }
    await this.cargar();
  }

  protected elegir(evento: Event): void {
    void this.cargar((evento.target as HTMLSelectElement).value || undefined);
  }

  private async cargar(almacenId?: string): Promise<void> {
    try {
      this.error.set(null);
      this.datos.set(await firstValueFrom(this.api.valorizacion(almacenId)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
