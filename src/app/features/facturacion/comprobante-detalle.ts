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
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import {
  ArchivoComprobante,
  ComprobanteVenta,
  MotivoNotaCredito,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { hoyEnLima } from '../centros/arbol';
import { siglaDocumento } from '../ventas/calculo-venta';
import { ESTADO_COMPROBANTE, MOTIVO_NOTA, NOMBRE_TIPO } from './etiquetas';
import { FacturacionApi } from './facturacion.api';
import { TransporteGuiaForm, datosGuia, formTransporte } from './transporte-guia';

@Component({
  selector: 'app-comprobante-detalle',
  imports: [RouterLink, ReactiveFormsModule, DatePipe, DecimalPipe, ErrorApi, TransporteGuiaForm],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="titulo-pagina">
          @if (comprobante(); as c) {
            {{ tipos[c.tipo] }}
            <span class="font-mono">{{ c.comprobante }}</span>
          } @else {
            Comprobante
          }
        </h1>
        <a routerLink="/facturacion" class="btn-enlace">Volver a los comprobantes</a>
      </div>
      <app-error-api [problema]="error()" />
      @if (comprobante(); as c) {
        <section class="tarjeta space-y-2 text-sm" aria-label="Estado en SUNAT">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p>
              <span [class]="estados[c.estado].clase">{{ estados[c.estado].texto }}</span>
              @if (c.codigoSunat) {
                <span class="ml-2 text-xs text-slate-600">
                  Código {{ c.codigoSunat
                  }}{{ c.descripcionSunat ? ': ' + c.descripcionSunat : '' }}
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
          @if (c.observacionesSunat) {
            <p class="text-xs text-amber-800">Observaciones: {{ c.observacionesSunat }}</p>
          }
          @if (c.ultimoError) {
            <p class="text-xs text-red-700">
              Último error ({{ c.intentos }} {{ c.intentos === 1 ? 'intento' : 'intentos' }}):
              {{ c.ultimoError }}
            </p>
          }
          @if (c.fechaEnvio) {
            <p class="text-xs text-slate-500">
              Enviado el {{ c.fechaEnvio | date: 'dd/MM/yyyy HH:mm' }}
            </p>
          }
        </section>

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
            <p class="etiqueta">{{ c.referencia ? 'Origen' : 'Pedido' }}</p>
            <p class="font-mono">{{ c.origenNumero }}</p>
          </div>
          @if (c.referencia; as r) {
            <div class="sm:col-span-4">
              <p class="etiqueta">Modifica a</p>
              <p>
                <a
                  [routerLink]="['/facturacion/comprobante', r.id]"
                  class="text-marca-700 hover:underline"
                >
                  {{ tipos[r.tipo] }} <span class="font-mono">{{ r.comprobante }}</span>
                </a>
                · {{ motivo(c.motivoNota)
                }}{{ c.descripcionMotivo ? ': ' + c.descripcionMotivo : '' }}
              </p>
            </div>
          }
          @if (c.formaPago === 'CREDITO') {
            <div class="sm:col-span-4">
              <p class="etiqueta">Al crédito</p>
              <ul>
                @for (q of c.cuotas; track $index) {
                  <li>
                    Cuota {{ $index + 1 }}: S/ {{ q.monto | number: '1.2-2' }} vence el
                    {{ q.fechaPago | date: 'dd/MM/yyyy' }}
                  </li>
                }
              </ul>
            </div>
          }
          @if (c.guias.length) {
            <div class="sm:col-span-4">
              <p class="etiqueta">Guías de remisión</p>
              <p class="flex flex-wrap gap-3">
                @for (g of c.guias; track g.id) {
                  <a
                    [routerLink]="['/facturacion/guia', g.id]"
                    class="font-mono text-marca-700 hover:underline"
                  >
                    {{ g.comprobante }}
                  </a>
                }
              </p>
            </div>
          }
          @if (c.notas.length) {
            <div class="sm:col-span-4">
              <p class="etiqueta">Notas de crédito</p>
              <p class="flex flex-wrap gap-3">
                @for (n of c.notas; track n.id) {
                  <a
                    [routerLink]="['/facturacion/comprobante', n.id]"
                    class="font-mono text-marca-700 hover:underline"
                  >
                    {{ n.comprobante }}
                  </a>
                }
              </p>
            </div>
          }
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
        <p class="text-xs text-slate-500">Emitido por {{ c.creadoPor ?? '—' }}</p>
        @if (puedeGuia()) {
          @if (!emitiendoGuia()) {
            <button type="button" class="btn-secundario" (click)="prepararGuia(c.clienteDireccion)">
              Emitir guía de remisión
            </button>
          } @else {
            <form [formGroup]="guia" (ngSubmit)="emitirGuia()" class="tarjeta space-y-3" novalidate>
              <h2 class="font-semibold">Guía de remisión de la venta</h2>
              <p class="text-xs text-slate-500">
                Sale del establecimiento de la venta con lo vendido (sin lo devuelto) hacia la
                dirección del cliente.
              </p>
              <div class="grid gap-2 sm:grid-cols-4">
                <div>
                  <label for="gv-fecha" class="etiqueta">Inicio del traslado</label>
                  <input id="gv-fecha" type="date" class="campo" formControlName="fechaTraslado" />
                </div>
                <div>
                  <label for="gv-ubigeo" class="etiqueta">Ubigeo de llegada</label>
                  <input
                    id="gv-ubigeo"
                    class="campo font-mono"
                    maxlength="6"
                    formControlName="llegadaUbigeo"
                  />
                </div>
                <div class="sm:col-span-2">
                  <label for="gv-direccion" class="etiqueta">Dirección de llegada</label>
                  <input id="gv-direccion" class="campo" formControlName="llegadaDireccion" />
                </div>
              </div>
              <app-transporte-guia [grupo]="guia.controls.transporte" prefijo="gv" />
              <div class="flex gap-2">
                <button type="submit" class="btn-primario">Emitir guía</button>
                <button type="button" class="btn-secundario" (click)="emitiendoGuia.set(false)">
                  Cancelar
                </button>
              </div>
            </form>
          }
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComprobanteDetalle implements OnInit {
  private readonly api = inject(FacturacionApi);
  private readonly sesion = inject(SesionService);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  protected readonly sigla = siglaDocumento;
  protected readonly tipos = NOMBRE_TIPO;
  protected readonly estados = ESTADO_COMPROBANTE;
  readonly id = input.required<string>();
  protected readonly comprobante = signal<ComprobanteVenta | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly enviando = signal(false);
  protected readonly emitiendoGuia = signal(false);
  protected readonly guia = this.fb.group({
    fechaTraslado: [hoyEnLima(), Validators.required],
    llegadaUbigeo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    llegadaDireccion: ['', [Validators.required, Validators.maxLength(250)]],
    transporte: formTransporte(this.fb),
  });

  /** Una factura o boleta válida (o en envío) de un cliente identificado. */
  protected readonly puedeGuia = computed(() => {
    const c = this.comprobante();
    return (
      !!c &&
      c.tipo !== 'NOTA_CREDITO' &&
      c.clienteTipoDocumento !== '0' &&
      ['PENDIENTE_ENVIO', 'ENVIADO', 'ACEPTADO', 'OBSERVADO'].includes(c.estado) &&
      this.sesion.tiene(PERMISOS.facturacionGuia)
    );
  });

  /** Ya está en el facturador: hay PDF y XML; el CDR solo cuando SUNAT respondió. */
  protected readonly enFacturador = computed(() => {
    const e = this.comprobante()?.estado;
    return e === 'ENVIADO' || e === 'ACEPTADO' || e === 'OBSERVADO' || e === 'RECHAZADO';
  });
  protected readonly archivos = computed<ArchivoComprobante[]>(() =>
    this.comprobante()?.estado === 'ENVIADO' ? ['PDF', 'XML'] : ['PDF', 'XML', 'CDR'],
  );
  protected readonly puedeEnviar = computed(() => {
    const e = this.comprobante()?.estado;
    return (
      (e === 'PENDIENTE_ENVIO' || e === 'ERROR') && this.sesion.tiene(PERMISOS.facturacionEnviar)
    );
  });

  ngOnInit(): void {
    void this.cargar();
  }

  protected url(tipo: ArchivoComprobante): string {
    return this.api.urlArchivo(this.id(), tipo);
  }

  protected motivo(codigo: string | null): string {
    return codigo ? (MOTIVO_NOTA[codigo as MotivoNotaCredito] ?? codigo) : '';
  }

  protected async enviar(): Promise<void> {
    try {
      this.enviando.set(true);
      this.error.set(null);
      const c = await firstValueFrom(this.api.enviar(this.id()));
      this.comprobante.set(c);
      this.avisos.exito(`${c.comprobante}: ${ESTADO_COMPROBANTE[c.estado].texto.toLowerCase()}.`);
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.enviando.set(false);
    }
  }

  protected prepararGuia(direccion: string | null): void {
    this.guia.reset({
      fechaTraslado: hoyEnLima(),
      llegadaUbigeo: '',
      llegadaDireccion: direccion ?? '',
    });
    this.emitiendoGuia.set(true);
  }

  protected async emitirGuia(): Promise<void> {
    if (this.guia.invalid) {
      this.guia.markAllAsTouched();
      return;
    }
    const v = this.guia.getRawValue();
    try {
      this.error.set(null);
      const g = await firstValueFrom(
        this.api.guiaDeVenta(this.id(), {
          fechaTraslado: v.fechaTraslado,
          llegadaUbigeo: v.llegadaUbigeo,
          llegadaDireccion: v.llegadaDireccion,
          ...datosGuia(v.transporte),
        }),
      );
      this.avisos.exito(`Guía ${g.guia} emitida.`);
      await this.router.navigate(['/facturacion/guia', g.id]);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async cargar(): Promise<void> {
    try {
      this.comprobante.set(await firstValueFrom(this.api.comprobante(this.id())));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
