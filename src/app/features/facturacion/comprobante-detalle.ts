import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { ComprobanteVenta } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { siglaDocumento } from '../ventas/calculo-venta';
import { FacturacionApi } from './facturacion.api';

@Component({
  selector: 'app-comprobante-detalle',
  imports: [RouterLink, DatePipe, DecimalPipe, ErrorApi],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="titulo-pagina">
          @if (comprobante(); as c) {
            {{ c.tipo === 'FACTURA' ? 'Factura' : 'Boleta' }}
            <span class="font-mono">{{ c.comprobante }}</span>
          } @else {
            Comprobante
          }
        </h1>
        <a routerLink="/facturacion" class="btn-enlace">Volver a los comprobantes</a>
      </div>
      <app-error-api [problema]="error()" />
      @if (comprobante(); as c) {
        <section class="tarjeta grid gap-3 text-sm sm:grid-cols-4">
          <div class="sm:col-span-2">
            <p class="etiqueta">Cliente</p>
            <p>
              <span class="font-mono"
                >{{ sigla(c.clienteTipoDocumento) }} {{ c.clienteDocumento }}</span
              >
              · {{ c.clienteNombre }}
            </p>
            @if (c.clienteDireccion) {
              <p class="text-xs text-slate-500">{{ c.clienteDireccion }}</p>
            }
          </div>
          <div>
            <p class="etiqueta">Emisión</p>
            <p>{{ c.fechaEmision | date: 'dd/MM/yyyy' }}</p>
          </div>
          <div>
            <p class="etiqueta">Pedido</p>
            <p class="font-mono">{{ c.origenNumero }}</p>
          </div>
        </section>
        <div class="tarjeta overflow-x-auto p-0 sm:p-0">
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Descripción</th>
                <th scope="col" class="text-right">Cantidad</th>
                <th scope="col" class="text-right">Precio</th>
                <th scope="col" class="text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (l of c.lineas; track $index) {
                <tr>
                  <td class="font-mono">{{ l.codigo }}</td>
                  <td>{{ l.descripcion }}</td>
                  <td class="text-right">{{ l.cantidad | number: '1.0-4' }} {{ l.unidad }}</td>
                  <td class="text-right">{{ l.precioUnitario | number: '1.2-2' }}</td>
                  <td class="text-right">{{ l.total | number: '1.2-2' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <dl class="tarjeta ml-auto grid max-w-xs grid-cols-2 gap-1 text-sm">
          <dt>Op. gravadas</dt>
          <dd class="text-right">{{ c.gravado | number: '1.2-2' }}</dd>
          @if (c.exonerado) {
            <dt>Op. exoneradas</dt>
            <dd class="text-right">{{ c.exonerado | number: '1.2-2' }}</dd>
          }
          @if (c.inafecto) {
            <dt>Op. inafectas</dt>
            <dd class="text-right">{{ c.inafecto | number: '1.2-2' }}</dd>
          }
          <dt>IGV</dt>
          <dd class="text-right">{{ c.igv | number: '1.2-2' }}</dd>
          <dt class="font-semibold">Total</dt>
          <dd class="text-right font-semibold">S/ {{ c.total | number: '1.2-2' }}</dd>
        </dl>
        <p class="text-xs text-slate-500">
          Pendiente de envío a SUNAT · emitido por {{ c.creadoPor ?? '—' }}
        </p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComprobanteDetalle implements OnInit {
  private readonly api = inject(FacturacionApi);
  protected readonly sigla = siglaDocumento;
  readonly id = input.required<string>();
  protected readonly comprobante = signal<ComprobanteVenta | null>(null);
  protected readonly error = signal<Problema | null>(null);

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      this.comprobante.set(await firstValueFrom(this.api.comprobante(this.id())));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
