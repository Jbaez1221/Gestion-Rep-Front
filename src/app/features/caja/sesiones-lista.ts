import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { Pagina, SesionListado } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { CajaApi } from './caja.api';

@Component({
  selector: 'app-sesiones-lista',
  imports: [RouterLink, DatePipe, DecimalPipe, ErrorApi, Paginador],
  template: `
    <div class="space-y-4">
      <div class="flex justify-end">
        <a class="btn-enlace" [href]="excel" download>Exportar Excel</a>
      </div>
      <app-error-api [problema]="error()" />
      <div class="tarjeta overflow-x-auto p-0 sm:p-0">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Sesión</th>
              <th scope="col">Caja</th>
              <th scope="col">Cajero</th>
              <th scope="col">Apertura</th>
              <th scope="col">Cierre</th>
              <th scope="col" class="text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (s of pagina()?.contenido ?? []; track s.id) {
              <tr>
                <td class="font-mono">
                  <a [routerLink]="['/caja/sesion', s.id]" class="text-marca-700 hover:underline">{{
                    s.numero
                  }}</a>
                </td>
                <td>{{ s.caja ?? '—' }}</td>
                <td>{{ s.cajero }}</td>
                <td>{{ s.apertura | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td>
                  @if (s.cierre) {
                    {{ s.cierre | date: 'dd/MM/yyyy HH:mm' }}
                  } @else {
                    <span class="insignia-alerta">Abierta</span>
                  }
                </td>
                <td class="text-right" [class.text-red-700]="(s.diferencia ?? 0) < 0">
                  {{ s.diferencia === null ? '—' : (s.diferencia | number: '1.2-2') }}
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="py-6 text-center text-slate-500">
                  Aún no hay sesiones de caja.
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
export class SesionesLista implements OnInit {
  private readonly api = inject(CajaApi);
  protected readonly excel = this.api.sesionesExcel();
  protected readonly pagina = signal<Pagina<SesionListado> | null>(null);
  protected readonly error = signal<Problema | null>(null);

  ngOnInit(): void {
    void this.buscar(0);
  }

  protected async buscar(numero = 0): Promise<void> {
    try {
      this.error.set(null);
      this.pagina.set(await firstValueFrom(this.api.sesiones(undefined, numero)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
