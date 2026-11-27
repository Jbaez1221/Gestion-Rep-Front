import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { ArchivoComprobante, GuiaRemision } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { siglaDocumento } from '../ventas/calculo-venta';
import { ESTADO_COMPROBANTE, MODALIDAD_TRANSPORTE, MOTIVO_TRASLADO } from './etiquetas';
import { FacturacionApi } from './facturacion.api';

@Component({
  selector: 'app-guia-detalle',
  imports: [RouterLink, DatePipe, DecimalPipe, ErrorApi],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="titulo-pagina">
          Guía de remisión <span class="font-mono">{{ guia()?.guia }}</span>
        </h1>
        <a routerLink="/facturacion/guias" class="btn-enlace">Volver a las guías</a>
      </div>
      <app-error-api [problema]="error()" />
      @if (guia(); as g) {
        <section class="tarjeta space-y-2 text-sm" aria-label="Estado en SUNAT">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p>
              <span [class]="estados[g.estado].clase">{{ estados[g.estado].texto }}</span>
              @if (g.codigoSunat) {
                <span class="ml-2 text-xs text-texto-2">
                  Código {{ g.codigoSunat
                  }}{{ g.descripcionSunat ? ': ' + g.descripcionSunat : '' }}
                </span>
              }
            </p>
            <p class="flex flex-wrap gap-2">
              @if (enFacturador()) {
                @for (a of archivos(); track a) {
                  <a class="btn-secundario" [href]="url(a)" download>{{ a }}</a>
                }
              }
              @if (puedeEnviar()) {
                <button
                  type="button"
                  class="btn-primario"
                  [disabled]="enviando()"
                  (click)="enviar()"
                >
                  Enviar ahora
                </button>
              }
            </p>
          </div>
          @if (g.observacionesSunat) {
            <p class="text-xs text-aviso-texto">Observaciones: {{ g.observacionesSunat }}</p>
          }
          @if (g.ultimoError) {
            <p class="text-xs text-peligro-texto">
              Último error ({{ g.intentos }} {{ g.intentos === 1 ? 'intento' : 'intentos' }}):
              {{ g.ultimoError }}
            </p>
          }
        </section>
        <section class="tarjeta grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p class="etiqueta">Motivo</p>
            <p>{{ g.motivo }} · {{ motivos[g.motivo] }}</p>
            @if (g.descripcionMotivo) {
              <p class="text-xs text-texto-suave">{{ g.descripcionMotivo }}</p>
            }
          </div>
          <div>
            <p class="etiqueta">Emisión · traslado</p>
            <p>
              {{ g.fechaEmision | date: 'dd/MM/yyyy' }} ·
              {{ g.fechaTraslado | date: 'dd/MM/yyyy' }}
            </p>
          </div>
          <div class="sm:col-span-2">
            <p class="etiqueta">Destinatario</p>
            <p>
              <span class="font-mono"
                >{{ sigla(g.destinatarioTipoDocumento) }} {{ g.destinatarioDocumento }}</span
              >
              · {{ g.destinatarioNombre }}
            </p>
          </div>
          <div class="sm:col-span-2">
            <p class="etiqueta">Partida</p>
            <p>
              {{ g.partida.direccion }}
              <span class="block text-xs text-texto-suave">
                Ubigeo {{ g.partida.ubigeo
                }}{{
                  g.partida.establecimiento ? ' · establecimiento ' + g.partida.establecimiento : ''
                }}
              </span>
            </p>
          </div>
          <div class="sm:col-span-2">
            <p class="etiqueta">Llegada</p>
            <p>
              {{ g.llegada.direccion }}
              <span class="block text-xs text-texto-suave">
                Ubigeo {{ g.llegada.ubigeo
                }}{{
                  g.llegada.establecimiento ? ' · establecimiento ' + g.llegada.establecimiento : ''
                }}
              </span>
            </p>
          </div>
          <div class="sm:col-span-2">
            <p class="etiqueta">{{ modalidades[g.modalidad] }}</p>
            @if (g.modalidad === '01') {
              <p>
                <span class="font-mono">RUC {{ g.transportistaRuc }}</span> ·
                {{ g.transportistaNombre }}
                @if (g.transportistaMtc) {
                  <span class="block text-xs text-texto-suave">MTC {{ g.transportistaMtc }}</span>
                }
              </p>
            } @else if (g.vehiculoM1L) {
              <p>Vehículo de categoría M1 o L</p>
            } @else {
              <p>
                Placa <span class="font-mono">{{ g.vehiculoPlaca }}</span> · {{ g.conductor }}
                <span class="block text-xs text-texto-suave">
                  Doc. {{ g.conductorDocumento }} · licencia {{ g.conductorLicencia }}
                </span>
              </p>
            }
          </div>
          <div>
            <p class="etiqueta">Peso bruto</p>
            <p>
              {{ g.pesoTotal | number: '1.0-3' }} kg{{
                g.bultos ? ' · ' + g.bultos + ' bultos' : ''
              }}
            </p>
          </div>
          <div>
            <p class="etiqueta">Origen</p>
            @if (g.documentoId) {
              <a
                [routerLink]="['/facturacion/comprobante', g.documentoId]"
                class="font-mono text-texto-acento hover:underline"
                >{{ g.documento }}</a
              >
            } @else {
              <p class="font-mono">{{ g.origenNumero }}</p>
            }
          </div>
        </section>
        <div class="tarjeta overflow-x-auto p-0 sm:p-0">
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Descripción</th>
                <th scope="col" class="text-right">Cantidad</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-borde">
              @for (l of g.lineas; track $index) {
                <tr>
                  <td class="font-mono">{{ l.codigo }}</td>
                  <td>{{ l.descripcion }}</td>
                  <td class="text-right">{{ l.cantidad | number: '1.0-4' }} {{ l.unidad }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="text-xs text-texto-suave">Emitida por {{ g.creadoPor ?? '—' }}</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuiaDetalle implements OnInit {
  private readonly api = inject(FacturacionApi);
  private readonly sesion = inject(SesionService);
  private readonly avisos = inject(NotificacionesService);
  protected readonly sigla = siglaDocumento;
  protected readonly estados = ESTADO_COMPROBANTE;
  protected readonly motivos = MOTIVO_TRASLADO;
  protected readonly modalidades = MODALIDAD_TRANSPORTE;
  readonly id = input.required<string>();
  protected readonly guia = signal<GuiaRemision | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly enviando = signal(false);

  protected readonly enFacturador = computed(() => {
    const e = this.guia()?.estado;
    return e === 'ENVIADO' || e === 'ACEPTADO' || e === 'OBSERVADO' || e === 'RECHAZADO';
  });
  protected readonly archivos = computed<ArchivoComprobante[]>(() =>
    this.guia()?.estado === 'ENVIADO' ? ['PDF', 'XML'] : ['PDF', 'XML', 'CDR'],
  );
  protected readonly puedeEnviar = computed(() => {
    const e = this.guia()?.estado;
    return (
      (e === 'PENDIENTE_ENVIO' || e === 'ERROR') && this.sesion.tiene(PERMISOS.facturacionEnviar)
    );
  });

  ngOnInit(): void {
    void this.cargar();
  }

  protected url(tipo: ArchivoComprobante): string {
    return this.api.urlArchivoGuia(this.id(), tipo);
  }

  protected async enviar(): Promise<void> {
    try {
      this.enviando.set(true);
      this.error.set(null);
      const g = await firstValueFrom(this.api.enviarGuia(this.id()));
      this.guia.set(g);
      this.avisos.exito(`${g.guia}: ${ESTADO_COMPROBANTE[g.estado].texto.toLowerCase()}.`);
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.enviando.set(false);
    }
  }

  private async cargar(): Promise<void> {
    try {
      this.guia.set(await firstValueFrom(this.api.guia(this.id())));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
