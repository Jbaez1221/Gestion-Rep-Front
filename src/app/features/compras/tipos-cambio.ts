import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { TipoCambio } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { hoyEnLima } from '../centros/arbol';
import { ComprasApi } from './compras.api';

@Component({
  selector: 'app-tipos-cambio',
  imports: [ReactiveFormsModule, ErrorApi, DatePipe, DecimalPipe],
  template: `
    <div class="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div class="space-y-2">
        <p class="text-sm text-texto-2">
          Tipo de cambio del dólar publicado por la SBS. Un día sin publicación (fin de semana o
          feriado) usa el último publicado antes, como indica SUNAT.
        </p>
        <app-error-api [problema]="error()" />
        <div class="tarjeta overflow-x-auto p-0 sm:p-0">
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col" class="text-right">Compra</th>
                <th scope="col" class="text-right">Venta</th>
                <th scope="col">Registrado por</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-borde">
              @for (t of lista(); track t.fecha) {
                <tr>
                  <td>{{ t.fecha | date: 'dd/MM/yyyy' }}</td>
                  <td class="text-right">{{ t.compra | number: '1.3-3' }}</td>
                  <td class="text-right">{{ t.venta | number: '1.3-3' }}</td>
                  <td>{{ t.modificadoPor ?? '—' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="py-6 text-center text-texto-suave">
                    Sin tipos de cambio en los últimos 31 días.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      @if (sesion.tiene(permisos.comprasTipoCambio)) {
        <form
          [formGroup]="formulario"
          (ngSubmit)="guardar()"
          class="tarjeta space-y-3 self-start"
          novalidate
        >
          <h2 class="font-semibold">Registrar o corregir</h2>
          <div>
            <label for="tc-fecha" class="etiqueta">Fecha</label>
            <input id="tc-fecha" type="date" class="campo" formControlName="fecha" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label for="tc-compra" class="etiqueta">Compra</label>
              <input
                id="tc-compra"
                type="number"
                step="0.001"
                min="0.001"
                class="campo text-right"
                formControlName="compra"
              />
            </div>
            <div>
              <label for="tc-venta" class="etiqueta">Venta</label>
              <input
                id="tc-venta"
                type="number"
                step="0.001"
                min="0.001"
                class="campo text-right"
                formControlName="venta"
              />
            </div>
          </div>
          @if (formulario.touched && formulario.invalid) {
            <p class="error-campo">Indique la fecha y los dos valores.</p>
          }
          <button type="submit" class="btn-primario">Guardar</button>
        </form>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiposCambio implements OnInit {
  private readonly api = inject(ComprasApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;

  protected readonly lista = signal<TipoCambio[]>([]);
  protected readonly error = signal<Problema | null>(null);
  protected readonly formulario = this.fb.group({
    fecha: [hoyEnLima(), Validators.required],
    compra: [null as number | null, [Validators.required, Validators.min(0.001)]],
    venta: [null as number | null, [Validators.required, Validators.min(0.001)]],
  });

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      this.lista.set(await firstValueFrom(this.api.tiposCambio()));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async guardar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const v = this.formulario.getRawValue();
    try {
      this.error.set(null);
      await firstValueFrom(
        this.api.registrarTipoCambio(v.fecha, Number(v.compra), Number(v.venta)),
      );
      this.avisos.exito('Tipo de cambio guardado.');
      this.formulario.patchValue({ compra: null, venta: null });
      this.formulario.markAsUntouched();
      await this.cargar();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
