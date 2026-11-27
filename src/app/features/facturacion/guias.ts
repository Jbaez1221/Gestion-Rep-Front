import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { GuiaRemisionListado, MotivoTraslado, Pagina } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { ESTADO_COMPROBANTE, MOTIVO_TRASLADO } from './etiquetas';
import { FacturacionApi } from './facturacion.api';

/** Guías de remisión remitente: de las ventas con entrega y de los traslados entre sucursales. */
@Component({
  selector: 'app-guias',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, ErrorApi, Paginador],
  template: `
    <section class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 class="titulo-pagina">Guías de remisión</h1>
          <p class="mt-1 text-sm text-texto-2">
            Sustentan el traslado de bienes: ventas con entrega (se emiten desde la factura o
            boleta) y traslados entre sucursales (se emiten al enviar el traslado).
          </p>
        </div>
        <a routerLink="/facturacion" class="btn-enlace">Comprobantes de venta</a>
      </div>
      <form [formGroup]="filtros" (ngSubmit)="buscar(0)" class="barra-filtros">
        <div class="min-w-64">
          <label for="gr-texto" class="etiqueta">Buscar</label>
          <input
            id="gr-texto"
            type="search"
            class="campo"
            formControlName="texto"
            placeholder="Destinatario, T001-…, F001-… o TR-…"
          />
        </div>
        <div>
          <label for="gr-motivo" class="etiqueta">Motivo</label>
          <select id="gr-motivo" class="campo" formControlName="motivo">
            <option value="">Todos</option>
            @for (m of motivos; track m) {
              <option [value]="m">{{ nombresMotivo[m] }}</option>
            }
          </select>
        </div>
        <div>
          <label for="gr-desde" class="etiqueta">Desde</label>
          <input id="gr-desde" type="date" class="campo" formControlName="desde" />
        </div>
        <div>
          <label for="gr-hasta" class="etiqueta">Hasta</label>
          <input id="gr-hasta" type="date" class="campo" formControlName="hasta" />
        </div>
        <button type="submit" class="btn-secundario">Buscar</button>
      </form>
      <app-error-api [problema]="error()" />
      <div class="tarjeta overflow-x-auto p-0 sm:p-0">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Guía</th>
              <th scope="col">Traslado</th>
              <th scope="col">Motivo</th>
              <th scope="col">Destinatario</th>
              <th scope="col">Origen</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-borde">
            @for (g of pagina()?.contenido ?? []; track g.id) {
              <tr>
                <td>
                  <a
                    [routerLink]="['/facturacion/guia', g.id]"
                    class="font-mono text-texto-acento hover:underline"
                    >{{ g.guia }}</a
                  >
                </td>
                <td>{{ g.fechaTraslado | date: 'dd/MM/yyyy' }}</td>
                <td>{{ nombresMotivo[g.motivo] }}</td>
                <td>
                  {{ g.destinatarioNombre }}
                  <span class="block text-xs text-texto-suave">{{ g.llegadaDireccion }}</span>
                </td>
                <td class="font-mono">{{ g.origenNumero }}</td>
                <td>
                  <span [class]="estados[g.estado].clase">{{ estados[g.estado].texto }}</span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="py-6 text-center text-texto-suave">
                  No hay guías con esos filtros.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-paginador [pagina]="pagina()" (cambiar)="buscar($event)" />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Guias implements OnInit {
  private readonly api = inject(FacturacionApi);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly motivos: MotivoTraslado[] = ['01', '04'];
  protected readonly nombresMotivo = MOTIVO_TRASLADO;
  protected readonly estados = ESTADO_COMPROBANTE;
  protected readonly pagina = signal<Pagina<GuiaRemisionListado> | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly filtros = this.fb.group({
    texto: [''],
    motivo: ['' as MotivoTraslado | ''],
    desde: [''],
    hasta: [''],
  });

  ngOnInit(): void {
    void this.buscar(0);
  }

  protected async buscar(pagina: number): Promise<void> {
    try {
      this.error.set(null);
      const f = this.filtros.getRawValue();
      this.pagina.set(
        await firstValueFrom(
          this.api.guias({
            ...f,
            desde: f.desde || undefined,
            hasta: f.hasta || undefined,
            pagina,
          }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
