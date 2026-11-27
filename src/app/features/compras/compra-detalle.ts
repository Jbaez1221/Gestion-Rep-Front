import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { Compra } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { DialogosService } from '../../shared/ui/dialogos';
import { ErrorApi } from '../../shared/ui/error-api';
import { ESTADO_SUNAT_COMPRA, NOMBRE_COMPROBANTE } from './calculo';
import { ComprasApi } from './compras.api';

@Component({
  selector: 'app-compra-detalle',
  imports: [RouterLink, DatePipe, DecimalPipe, ErrorApi],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="titulo-pagina">
          @if (compra(); as c) {
            {{ nombres[c.tipoComprobante] }} <span class="font-mono">{{ c.comprobante }}</span>
            <span
              [class]="c.estado === 'REGISTRADA' ? 'insignia-ok' : 'insignia-neutra'"
              class="ml-2 align-middle"
              >{{ c.estado === 'REGISTRADA' ? 'Registrada' : 'Anulada' }}</span
            >
          } @else {
            Compra
          }
        </h1>
        <a routerLink="/compras/lista" class="btn-enlace">Volver a las compras</a>
      </div>

      <app-error-api [problema]="error()" />

      @if (compra(); as c) {
        @if (c.avisos.length > 0) {
          <ul class="aviso-caja" role="status">
            @for (a of c.avisos; track a) {
              <li>{{ a }}</li>
            }
          </ul>
        }
        <section
          class="tarjeta flex flex-wrap items-center justify-between gap-2 text-sm"
          aria-label="SUNAT"
        >
          @if (c.sunat; as v) {
            <p>
              En SUNAT:
              <span [class]="v.valido ? 'insignia-ok' : 'insignia-peligro'">{{
                estadosSunat[v.estado]
              }}</span>
              @if (v.estadoRuc || v.condicionDomicilio) {
                · proveedor {{ v.estadoRuc ?? '—' }} / {{ v.condicionDomicilio ?? '—' }}
              }
              <span class="block text-xs text-texto-suave">
                Consultado el {{ v.fecha | date: 'dd/MM/yyyy HH:mm'
                }}{{ v.mensaje ? ' · ' + v.mensaje : '' }}
              </span>
              @if (!v.valido) {
                <span class="block text-xs text-peligro-texto">
                  Un comprobante que no existe, está anulado o no autorizado no da crédito fiscal.
                </span>
              }
            </p>
          } @else {
            <p class="text-texto-2">El comprobante aún no se validó en SUNAT.</p>
          }
          @if (c.estado === 'REGISTRADA' && sesion.tiene(permisos.comprasRegistrar)) {
            <button
              type="button"
              class="btn-secundario"
              [disabled]="validando()"
              (click)="validarSunat()"
            >
              {{ c.sunat ? 'Volver a validar' : 'Validar en SUNAT' }}
            </button>
          }
        </section>
        <section class="tarjeta grid gap-3 text-sm sm:grid-cols-4">
          <div class="sm:col-span-2">
            <p class="etiqueta">Proveedor</p>
            <p>
              <span class="font-mono">{{ c.proveedor.documento }}</span> · {{ c.proveedor.nombre }}
            </p>
          </div>
          <div>
            <p class="etiqueta">Registro</p>
            <p class="font-mono">{{ c.numero }}</p>
          </div>
          <div>
            <p class="etiqueta">Moneda</p>
            <p>
              {{
                c.moneda === 'USD'
                  ? 'Dólares (TC ' + (c.tipoCambio | number: '1.3-3') + ')'
                  : 'Soles'
              }}
            </p>
          </div>
          <div>
            <p class="etiqueta">Emisión</p>
            <p>{{ c.fechaEmision | date: 'dd/MM/yyyy' }}</p>
          </div>
          <div>
            <p class="etiqueta">Fecha contable</p>
            <p>{{ c.fechaContable | date: 'dd/MM/yyyy' }}</p>
          </div>
          <div>
            <p class="etiqueta">Vencimiento</p>
            <p>{{ c.fechaVencimiento ? (c.fechaVencimiento | date: 'dd/MM/yyyy') : 'Contado' }}</p>
          </div>
          <div>
            <p class="etiqueta">Almacén</p>
            <p>{{ c.almacen ? c.almacen.sucursal + ' · ' + c.almacen.nombre : '—' }}</p>
          </div>
          @if (c.orden; as o) {
            <div>
              <p class="etiqueta">Orden de compra</p>
              <a
                [routerLink]="['/compras/orden', o.id]"
                class="font-mono text-texto-acento hover:underline"
                >{{ o.numero }}</a
              >
            </div>
          }
          @if (c.referencia; as r) {
            <div>
              <p class="etiqueta">Modifica</p>
              <a
                [routerLink]="['/compras/documento', r.id]"
                class="font-mono text-texto-acento hover:underline"
                >{{ r.numero }}</a
              >
            </div>
            <div>
              <p class="etiqueta">Motivo</p>
              <p>{{ c.motivoNota?.codigo }} · {{ c.motivoNota?.descripcion }}</p>
            </div>
          }
          <div>
            <p class="etiqueta">Crédito fiscal</p>
            <p>{{ c.creditoFiscal ? 'Sí' : 'No (el IGV va al costo)' }}</p>
          </div>
          @if (c.glosa) {
            <div class="sm:col-span-4">
              <p class="etiqueta">Glosa</p>
              <p>{{ c.glosa }}</p>
            </div>
          }
        </section>

        <div class="tarjeta overflow-x-auto p-0 sm:p-0">
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Descripción</th>
                <th scope="col">Tipo</th>
                <th scope="col" class="text-right">Cantidad</th>
                <th scope="col" class="text-right">Valor unit.</th>
                <th scope="col" class="text-right">IGV</th>
                <th scope="col" class="text-right">Total</th>
                <th scope="col" class="text-right">Costo S/</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-borde">
              @for (l of c.lineas; track l.linea) {
                <tr>
                  <td>
                    @if (l.articuloCodigo) {
                      <span class="font-mono">{{ l.articuloCodigo }}</span> ·
                    }
                    {{ l.descripcion }}
                  </td>
                  <td>{{ tipos[l.tipo] }}</td>
                  <td class="whitespace-nowrap text-right">
                    {{ l.cantidad | number: '1.0-4' }} {{ l.unidad }}
                  </td>
                  <td class="text-right">{{ l.valorUnitario | number: '1.2-6' }}</td>
                  <td class="text-right">{{ l.igv | number: '1.2-2' }}</td>
                  <td class="text-right">{{ l.total | number: '1.2-2' }}</td>
                  <td class="text-right">
                    {{ l.costoSoles + l.costoAdicional | number: '1.2-2' }}
                    @if (l.costoAdicional) {
                      <span class="block text-xs text-texto-suave"
                        >incluye {{ l.costoAdicional | number: '1.2-2' }} de flete</span
                      >
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="grid gap-4 sm:grid-cols-[1fr_20rem]">
          <section class="space-y-2 text-sm">
            @if (c.recepciones.length > 0) {
              <h2 class="font-semibold">Factura las recepciones</h2>
              <ul class="list-disc pl-5">
                @for (r of c.recepciones; track r.id) {
                  <li>
                    <a
                      [routerLink]="['/compras/recepcion', r.id]"
                      class="font-mono text-texto-acento hover:underline"
                      >{{ r.numero }}</a
                    >
                    · guía {{ r.guia ?? '—' }}
                  </li>
                }
              </ul>
            }
            @if (c.notas.length > 0) {
              <h2 class="font-semibold">Notas que la modifican</h2>
              <ul class="list-disc pl-5">
                @for (n of c.notas; track n.id) {
                  <li>
                    <a
                      [routerLink]="['/compras/documento', n.id]"
                      class="text-texto-acento hover:underline"
                    >
                      {{ nombres[n.tipoComprobante] }} {{ n.comprobante }}</a
                    >
                    · {{ n.total | number: '1.2-2' }}
                    @if (n.estado === 'ANULADA') {
                      <span class="insignia-neutra">Anulada</span>
                    }
                  </li>
                }
              </ul>
            }
            <p class="text-xs text-texto-suave">
              Registrada por {{ c.creadoPor ?? '—' }}
              @if (c.anuladoPor) {
                · anulada por {{ c.anuladoPor }} el
                {{ c.fechaAnulacion | date: 'dd/MM/yyyy HH:mm' }}: {{ c.motivoAnulacion }}
              }
            </p>
          </section>
          <dl class="tarjeta grid grid-cols-2 gap-1 text-sm">
            <dt>Gravado</dt>
            <dd class="text-right">{{ c.gravado | number: '1.2-2' }}</dd>
            @if (c.exonerado) {
              <dt>Exonerado</dt>
              <dd class="text-right">{{ c.exonerado | number: '1.2-2' }}</dd>
            }
            @if (c.inafecto) {
              <dt>Inafecto</dt>
              <dd class="text-right">{{ c.inafecto | number: '1.2-2' }}</dd>
            }
            <dt>IGV</dt>
            <dd class="text-right">{{ c.igv | number: '1.2-2' }}</dd>
            <dt class="font-semibold">Total</dt>
            <dd class="text-right font-semibold">{{ c.total | number: '1.2-2' }}</dd>
            @if (c.moneda === 'USD') {
              <dt>En soles</dt>
              <dd class="text-right">{{ c.totalSoles | number: '1.2-2' }}</dd>
            }
            @if (c.detraccion; as d) {
              <dt>Detracción {{ d.codigo }}</dt>
              <dd class="text-right">S/ {{ d.monto | number: '1.2-2' }}</dd>
            }
          </dl>
        </div>

        @if (c.estado === 'REGISTRADA') {
          <div class="flex flex-wrap gap-2">
            @if (!c.referencia && sesion.tiene(permisos.comprasRegistrar)) {
              <a
                routerLink="/compras/registrar"
                [queryParams]="{ referencia: c.id }"
                class="btn-secundario"
              >
                Registrar nota de crédito
              </a>
            }
            @if (sesion.tiene(permisos.comprasAnular)) {
              <button type="button" class="btn-enlace" (click)="anular()">Anular</button>
            }
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompraDetalle implements OnInit {
  private readonly dialogos = inject(DialogosService);
  private readonly api = inject(ComprasApi);
  private readonly avisos = inject(NotificacionesService);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly nombres = NOMBRE_COMPROBANTE;
  protected readonly tipos = {
    INVENTARIO: 'Almacén',
    GASTO: 'Gasto',
    COSTO: 'Al costo',
    AJUSTE: 'Importe',
  };

  readonly id = input.required<string>();

  protected readonly estadosSunat = ESTADO_SUNAT_COMPRA;
  protected readonly validando = signal(false);
  protected readonly compra = signal<Compra | null>(null);
  protected readonly error = signal<Problema | null>(null);

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      this.compra.set(await firstValueFrom(this.api.obtener(this.id())));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async validarSunat(): Promise<void> {
    try {
      this.validando.set(true);
      this.error.set(null);
      const c = await firstValueFrom(this.api.validarSunat(this.id()));
      this.compra.set(c);
      this.avisos.exito(
        `SUNAT: ${c.sunat ? ESTADO_SUNAT_COMPRA[c.sunat.estado].toLowerCase() : 'sin respuesta'}.`,
      );
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.validando.set(false);
    }
  }

  protected async anular(): Promise<void> {
    const motivo = await this.dialogos.pedirTexto({
      titulo: 'Anular compra',
      mensaje: 'Se revierte el ingreso al almacén, las imputaciones y lo recibido de la orden.',
      aceptar: 'Anular compra',
      peligro: true,
    });
    if (!motivo) return;
    try {
      this.error.set(null);
      this.compra.set(await firstValueFrom(this.api.anular(this.id(), motivo)));
      this.avisos.exito('Compra anulada.');
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
