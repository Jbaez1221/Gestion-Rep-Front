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
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import {
  AfectacionCompra,
  ArchivoComprobante,
  ComprobanteVenta,
  MotivoNotaCredito,
  MotivoNotaDebito,
  SerieComprobante,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { hoyEnLima } from '../centros/arbol';
import { importeVenta, siglaDocumento } from '../ventas/calculo-venta';
import {
  ESTADO_COMPROBANTE,
  MOTIVO_NOTA,
  MOTIVO_NOTA_DEBITO,
  NOMBRE_BAJA,
  NOMBRE_TIPO,
} from './etiquetas';
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
                <span class="ml-2 text-xs text-texto-2">
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
            <p class="text-xs text-aviso-texto">Observaciones: {{ c.observacionesSunat }}</p>
          }
          @if (c.ultimoError) {
            <p class="text-xs text-peligro-texto">
              Último error ({{ c.intentos }} {{ c.intentos === 1 ? 'intento' : 'intentos' }}):
              {{ c.ultimoError }}
            </p>
          }
          @if (c.fechaEnvio) {
            <p class="text-xs text-texto-suave">
              Enviado el {{ c.fechaEnvio | date: 'dd/MM/yyyy HH:mm' }}
            </p>
          }
          @if (c.baja; as b) {
            <div class="border-t border-borde pt-2 text-xs" aria-label="Baja ante SUNAT">
              <p>
                <span class="font-semibold">{{ bajas[b.tipo] }}:</span>
                <span [class]="estados[b.estado].clase">{{ estados[b.estado].texto }}</span>
                · {{ b.motivo }}
                @if (b.codigoSunat) {
                  <span class="text-texto-2">
                    · Código {{ b.codigoSunat
                    }}{{ b.descripcionSunat ? ': ' + b.descripcionSunat : '' }}
                  </span>
                }
              </p>
              @if (b.ultimoError) {
                <p class="text-peligro-texto">{{ b.ultimoError }}</p>
              }
              @if (b.nota; as n) {
                <p>
                  No procedió; se regularizó con la nota de crédito
                  <a
                    [routerLink]="['/facturacion/comprobante', n.id]"
                    class="font-mono text-texto-acento hover:underline"
                    >{{ n.comprobante }}</a
                  >
                </p>
              }
            </div>
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
              <p class="text-xs text-texto-suave">{{ c.clienteDireccion }}</p>
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
                  class="text-texto-acento hover:underline"
                >
                  {{ tipos[r.tipo] }} <span class="font-mono">{{ r.comprobante }}</span>
                </a>
                · {{ motivo(c) }}{{ c.descripcionMotivo ? ': ' + c.descripcionMotivo : '' }}
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
                    class="font-mono text-texto-acento hover:underline"
                  >
                    {{ g.comprobante }}
                  </a>
                }
              </p>
            </div>
          }
          @if (c.notas.length) {
            <div class="sm:col-span-4">
              <p class="etiqueta">Notas</p>
              <p class="flex flex-wrap gap-3">
                @for (n of c.notas; track n.id) {
                  <a
                    [routerLink]="['/facturacion/comprobante', n.id]"
                    class="text-texto-acento hover:underline"
                  >
                    {{ tipos[n.tipo] }} <span class="font-mono">{{ n.comprobante }}</span>
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
            <tbody class="divide-y divide-borde">
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
        <p class="text-xs text-texto-suave">Emitido por {{ c.creadoPor ?? '—' }}</p>
        @if (c.tipo === 'NOTA_DEBITO' && c.fechaVencimiento) {
          <p class="text-sm">
            Queda por cobrar al cliente hasta el {{ c.fechaVencimiento | date: 'dd/MM/yyyy' }}
            (se cobra en caja como abono a su cuenta).
          </p>
        }
        @if (puedeNotaDebito()) {
          @if (!emitiendoNota()) {
            <button type="button" class="btn-secundario" (click)="prepararNota()">
              Emitir nota de débito
            </button>
          } @else {
            <form
              [formGroup]="nota"
              (ngSubmit)="emitirNota()"
              class="tarjeta space-y-3"
              novalidate
              aria-label="Nota de débito"
            >
              <h2 class="font-semibold">Nota de débito</h2>
              <p class="text-xs text-texto-suave">
                Cobra un cargo posterior sobre este comprobante. El total queda como cuenta por
                cobrar del cliente.
              </p>
              <div class="grid gap-2 sm:grid-cols-4">
                <div>
                  <label for="nd-serie" class="etiqueta">Serie</label>
                  <select id="nd-serie" class="campo" formControlName="serie">
                    @for (s of seriesNota(); track s.serie) {
                      <option [value]="s.serie">{{ s.serie }}</option>
                    } @empty {
                      <option value="">Sin series de nota de débito</option>
                    }
                  </select>
                </div>
                <div>
                  <label for="nd-motivo" class="etiqueta">Motivo</label>
                  <select id="nd-motivo" class="campo" formControlName="motivo">
                    @for (m of motivosDebito; track m) {
                      <option [value]="m">{{ m }} · {{ nombresDebito[m] }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label for="nd-vence" class="etiqueta">Vence</label>
                  <input
                    id="nd-vence"
                    type="date"
                    class="campo"
                    formControlName="fechaVencimiento"
                  />
                </div>
                <div class="sm:col-span-4">
                  <label for="nd-descripcion" class="etiqueta">Sustento</label>
                  <input
                    id="nd-descripcion"
                    class="campo"
                    maxlength="250"
                    formControlName="descripcion"
                    placeholder="Intereses por 15 días de atraso"
                  />
                </div>
              </div>
              <table class="tabla" formArrayName="lineas">
                <thead>
                  <tr>
                    <th scope="col">Concepto</th>
                    <th scope="col" class="text-right">Cantidad</th>
                    <th scope="col" class="text-right">Precio</th>
                    <th scope="col">Afectación</th>
                    <th scope="col" class="text-right">Total</th>
                    <th scope="col"><span class="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (l of nota.controls.lineas.controls; track l; let i = $index) {
                    <tr [formGroupName]="i">
                      <td>
                        <label [for]="'nd-concepto-' + i" class="sr-only">Concepto</label>
                        <input
                          [id]="'nd-concepto-' + i"
                          class="campo"
                          formControlName="descripcion"
                        />
                      </td>
                      <td>
                        <label [for]="'nd-cantidad-' + i" class="sr-only">Cantidad</label>
                        <input
                          [id]="'nd-cantidad-' + i"
                          type="number"
                          min="0.0001"
                          class="campo w-20 text-right"
                          formControlName="cantidad"
                        />
                      </td>
                      <td>
                        <label [for]="'nd-precio-' + i" class="sr-only">Precio</label>
                        <input
                          [id]="'nd-precio-' + i"
                          type="number"
                          min="0.01"
                          step="0.01"
                          class="campo w-24 text-right"
                          formControlName="precioUnitario"
                        />
                      </td>
                      <td>
                        <label [for]="'nd-afectacion-' + i" class="sr-only">Afectación</label>
                        <select
                          [id]="'nd-afectacion-' + i"
                          class="campo"
                          formControlName="afectacion"
                        >
                          <option value="GRAVADO">Gravado (con IGV)</option>
                          <option value="EXONERADO">Exonerado</option>
                          <option value="INAFECTO">Inafecto</option>
                        </select>
                      </td>
                      <td class="text-right">{{ importesNota()[i]?.total | number: '1.2-2' }}</td>
                      <td>
                        @if (nota.controls.lineas.length > 1) {
                          <button
                            type="button"
                            class="btn-enlace"
                            (click)="nota.controls.lineas.removeAt(i)"
                          >
                            Quitar
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              <p class="flex flex-wrap items-center justify-between gap-2 text-sm">
                <button type="button" class="btn-enlace" (click)="agregarCargo()">
                  Agregar concepto
                </button>
                <span
                  >IGV {{ igvNota() | number: '1.2-2' }} · Total
                  <strong>S/ {{ totalNota() | number: '1.2-2' }}</strong></span
                >
              </p>
              <div class="flex gap-2">
                <button type="submit" class="btn-primario" [disabled]="emitiendo()">
                  Emitir nota de débito
                </button>
                <button type="button" class="btn-secundario" (click)="emitiendoNota.set(false)">
                  Cancelar
                </button>
              </div>
            </form>
          }
        }
        @if (puedeGuia()) {
          @if (!emitiendoGuia()) {
            <button type="button" class="btn-secundario" (click)="prepararGuia(c.clienteDireccion)">
              Emitir guía de remisión
            </button>
          } @else {
            <form [formGroup]="guia" (ngSubmit)="emitirGuia()" class="tarjeta space-y-3" novalidate>
              <h2 class="font-semibold">Guía de remisión de la venta</h2>
              <p class="text-xs text-texto-suave">
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
  protected readonly bajas = NOMBRE_BAJA;
  protected readonly nombresDebito = MOTIVO_NOTA_DEBITO;
  protected readonly motivosDebito = Object.keys(MOTIVO_NOTA_DEBITO) as MotivoNotaDebito[];
  readonly id = input.required<string>();
  protected readonly comprobante = signal<ComprobanteVenta | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly enviando = signal(false);
  protected readonly emitiendoGuia = signal(false);
  protected readonly emitiendoNota = signal(false);
  protected readonly emitiendo = signal(false);
  private readonly series = signal<SerieComprobante[]>([]);
  protected readonly nota = this.fb.group({
    serie: ['', Validators.required],
    motivo: ['01' as MotivoNotaDebito],
    descripcion: ['', [Validators.required, Validators.maxLength(250)]],
    fechaVencimiento: [hoyEnLima(), Validators.required],
    lineas: this.fb.array([this.cargo()]),
  });
  private readonly valoresNota = toSignal(this.nota.controls.lineas.valueChanges, {
    initialValue: this.nota.controls.lineas.getRawValue(),
  });
  protected readonly importesNota = computed(() =>
    this.valoresNota().map((l) =>
      importeVenta(
        Number(l.cantidad ?? 0),
        Number(l.precioUnitario ?? 0),
        l.afectacion ?? 'GRAVADO',
      ),
    ),
  );
  protected readonly totalNota = computed(
    () => Math.round(this.importesNota().reduce((s, i) => s + i.total, 0) * 100) / 100,
  );
  protected readonly igvNota = computed(
    () => Math.round(this.importesNota().reduce((s, i) => s + i.igv, 0) * 100) / 100,
  );
  /** Series activas de nota de débito de la sucursal con la letra del comprobante (FD01, BD01). */
  protected readonly seriesNota = computed(() => {
    const c = this.comprobante();
    if (!c) return [];
    const letra = c.tipo === 'FACTURA' ? 'F' : 'B';
    return this.series().filter(
      (s) =>
        s.tipo === 'NOTA_DEBITO' &&
        s.activo &&
        s.sucursalId === c.sucursalId &&
        s.serie.startsWith(letra),
    );
  });
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
      (c.tipo === 'FACTURA' || c.tipo === 'BOLETA') &&
      c.clienteTipoDocumento !== '0' &&
      ['PENDIENTE_ENVIO', 'ENVIADO', 'ACEPTADO', 'OBSERVADO'].includes(c.estado) &&
      this.sesion.tiene(PERMISOS.facturacionGuia)
    );
  });

  /** Como la guía: factura o boleta con valor (o en envío) de un cliente al que se le cobra. */
  protected readonly puedeNotaDebito = computed(() => {
    const c = this.comprobante();
    return (
      !!c &&
      (c.tipo === 'FACTURA' || c.tipo === 'BOLETA') &&
      c.clienteTipoDocumento !== '0' &&
      ['PENDIENTE_ENVIO', 'ENVIADO', 'ACEPTADO', 'OBSERVADO'].includes(c.estado) &&
      this.sesion.tiene(PERMISOS.facturacionNotaDebito)
    );
  });

  /** Ya está en el facturador: hay PDF y XML; el CDR solo cuando SUNAT respondió. */
  protected readonly enFacturador = computed(() => {
    const e = this.comprobante()?.estado;
    return (
      e === 'ENVIADO' ||
      e === 'ACEPTADO' ||
      e === 'OBSERVADO' ||
      e === 'RECHAZADO' ||
      e === 'BAJA_EN_CURSO' ||
      e === 'ANULADO'
    );
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

  protected motivo(c: ComprobanteVenta): string {
    const codigo = c.motivoNota;
    if (!codigo) return '';
    return c.tipo === 'NOTA_DEBITO'
      ? (MOTIVO_NOTA_DEBITO[codigo as MotivoNotaDebito] ?? codigo)
      : (MOTIVO_NOTA[codigo as MotivoNotaCredito] ?? codigo);
  }

  private cargo() {
    return this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(200)]],
      cantidad: [1, [Validators.required, Validators.min(0.0001)]],
      precioUnitario: [0, [Validators.required, Validators.min(0.01)]],
      afectacion: ['GRAVADO' as AfectacionCompra],
    });
  }

  protected agregarCargo(): void {
    this.nota.controls.lineas.push(this.cargo());
  }

  protected async prepararNota(): Promise<void> {
    try {
      this.error.set(null);
      this.series.set(await firstValueFrom(this.api.series()));
      const vence = new Date(`${hoyEnLima()}T00:00:00Z`);
      vence.setUTCDate(vence.getUTCDate() + 15);
      this.nota.controls.lineas.clear();
      this.nota.controls.lineas.push(this.cargo());
      this.nota.reset({
        serie: this.seriesNota()[0]?.serie ?? '',
        motivo: '01',
        descripcion: '',
        fechaVencimiento: vence.toISOString().slice(0, 10),
      });
      this.emitiendoNota.set(true);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async emitirNota(): Promise<void> {
    if (this.nota.invalid) {
      this.nota.markAllAsTouched();
      this.error.set({
        status: 400,
        title: 'Nota de débito incompleta',
        detail: 'Elija la serie, escriba el sustento y cada concepto con su cantidad y precio.',
      });
      return;
    }
    const v = this.nota.getRawValue();
    try {
      this.emitiendo.set(true);
      this.error.set(null);
      const n = await firstValueFrom(
        this.api.notaDebito(this.id(), {
          serie: v.serie,
          motivo: v.motivo,
          descripcion: v.descripcion.trim(),
          fechaVencimiento: v.fechaVencimiento,
          lineas: v.lineas.map((l) => ({
            descripcion: l.descripcion.trim(),
            cantidad: Number(l.cantidad),
            precioUnitario: Number(l.precioUnitario),
            afectacion: l.afectacion,
          })),
        }),
      );
      this.avisos.exito(`Nota de débito ${n.comprobante} emitida: queda por cobrar.`);
      this.emitiendoNota.set(false);
      await this.router.navigate(['/facturacion/comprobante', n.id]);
      // La ruta reutiliza este componente: el id ya cambió, se carga la nota.
      await this.cargar();
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.emitiendo.set(false);
    }
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
