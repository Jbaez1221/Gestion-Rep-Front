import { DecimalPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import {
  CompraListado,
  EstadoCompra,
  Pagina,
  TipoComprobante,
} from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { DescargaRegistro } from '../../shared/ui/descarga-registro';
import { Paginador } from '../../shared/ui/paginador';
import { ESTADO_SUNAT_COMPRA, NOMBRE_COMPROBANTE } from './calculo';
import { ComprasApi, RUTA_REGISTRO_COMPRAS } from './compras.api';

@Component({
  selector: 'app-compras-lista',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ErrorApi,
    Paginador,
    DecimalPipe,
    DatePipe,
    DescargaRegistro,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <form [formGroup]="filtros" (ngSubmit)="buscar(0)" class="barra-filtros">
          <div class="min-w-64">
            <label for="c-texto" class="etiqueta">Buscar</label>
            <input
              id="c-texto"
              type="search"
              class="campo"
              formControlName="texto"
              placeholder="Proveedor, RUC, serie-número o CO-…"
            />
          </div>
          <div>
            <label for="c-tipo" class="etiqueta">Comprobante</label>
            <select id="c-tipo" class="campo" formControlName="tipo">
              <option value="">Todos</option>
              @for (t of tipos; track t) {
                <option [value]="t">{{ nombres[t] }}</option>
              }
            </select>
          </div>
          <div>
            <label for="c-estado" class="etiqueta">Estado</label>
            <select id="c-estado" class="campo" formControlName="estado">
              <option value="">Todos</option>
              <option value="REGISTRADA">Registradas</option>
              <option value="ANULADA">Anuladas</option>
            </select>
          </div>
          <div>
            <label for="c-desde" class="etiqueta">Emitidas desde</label>
            <input id="c-desde" type="date" class="campo" formControlName="desde" />
          </div>
          <div>
            <label for="c-hasta" class="etiqueta">Hasta</label>
            <input id="c-hasta" type="date" class="campo" formControlName="hasta" />
          </div>
          <button type="submit" class="btn-secundario">Buscar</button>
          <a class="btn-enlace" [href]="excel()" download>Exportar Excel</a>
        </form>
        <div class="flex flex-wrap items-end gap-3">
          <app-descarga-registro
            id="c-registro"
            etiqueta="Registro de compras (8.1)"
            [ruta]="rutaRegistro"
          />
          @if (sesion.tiene(permisos.comprasRegistrar)) {
            <a routerLink="/compras/registrar" class="btn-primario">Registrar compra</a>
          }
        </div>
      </div>

      <app-error-api [problema]="error()" />

      <div class="tarjeta overflow-x-auto p-0 sm:p-0">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Emisión</th>
              <th scope="col">Comprobante</th>
              <th scope="col">Proveedor</th>
              <th scope="col" class="text-right">Total</th>
              <th scope="col" class="text-right">En soles</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-borde">
            @for (c of pagina()?.contenido ?? []; track c.id) {
              <tr>
                <td class="whitespace-nowrap">{{ c.fechaEmision | date: 'dd/MM/yyyy' }}</td>
                <td class="whitespace-nowrap">
                  <a
                    [routerLink]="['/compras/documento', c.id]"
                    class="text-texto-acento hover:underline"
                  >
                    {{ nombres[c.tipoComprobante] }}
                    <span class="font-mono">{{ c.comprobante }}</span>
                  </a>
                  <span class="block font-mono text-xs text-texto-suave">{{ c.numero }}</span>
                </td>
                <td>
                  {{ c.proveedor.nombre }}
                  <span class="block font-mono text-xs text-texto-suave">{{
                    c.proveedor.documento
                  }}</span>
                </td>
                <td class="whitespace-nowrap text-right">
                  {{ c.moneda === 'USD' ? 'US$' : 'S/' }} {{ c.total | number: '1.2-2' }}
                </td>
                <td class="text-right">{{ c.totalSoles | number: '1.2-2' }}</td>
                <td class="space-x-1 whitespace-nowrap">
                  <span [class]="c.estado === 'REGISTRADA' ? 'insignia-ok' : 'insignia-neutra'">{{
                    c.estado === 'REGISTRADA' ? 'Registrada' : 'Anulada'
                  }}</span>
                  @if (!c.creditoFiscal && c.estado === 'REGISTRADA') {
                    <span class="insignia-alerta">Sin crédito fiscal</span>
                  }
                  @if (
                    c.estadoSunat && c.estadoSunat !== 'ACEPTADO' && c.estadoSunat !== 'AUTORIZADO'
                  ) {
                    <span class="insignia-peligro">SUNAT: {{ estadosSunat[c.estadoSunat] }}</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="py-6 text-center text-texto-suave">
                  No hay compras con esos filtros.
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
export class ComprasLista implements OnInit {
  private readonly api = inject(ComprasApi);

  /** El Excel de la búsqueda, con los filtros puestos. */
  protected excel(): string {
    return this.api.excel(this.filtros.getRawValue());
  }
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly estadosSunat = ESTADO_SUNAT_COMPRA;
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly nombres = NOMBRE_COMPROBANTE;
  protected readonly rutaRegistro = RUTA_REGISTRO_COMPRAS;
  protected readonly tipos: TipoComprobante[] = [
    'FACTURA',
    'BOLETA',
    'NOTA_CREDITO',
    'NOTA_DEBITO',
  ];

  protected readonly pagina = signal<Pagina<CompraListado> | null>(null);
  protected readonly error = signal<Problema | null>(null);

  protected readonly filtros = this.fb.group({
    texto: [''],
    tipo: ['' as TipoComprobante | ''],
    estado: ['' as EstadoCompra | ''],
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
        await firstValueFrom(this.api.listar({ ...this.filtros.getRawValue(), pagina: numero })),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
