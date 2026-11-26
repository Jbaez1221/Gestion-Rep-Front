import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import {
  CobroDevolvible,
  DevolucionCaja,
  MedioPago,
  MotivoNotaCredito,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { ESTADO_COMPROBANTE, MOTIVO_NOTA } from '../facturacion/etiquetas';
import { CajaApi } from './caja.api';
import { MEDIOS_DINERO, NOMBRE_MEDIO, centimos } from './medios';

/**
 * Devolución o anulación de una venta: emite la nota de crédito (o, al anular un comprobante aceptado
 * dentro del plazo, pide su baja a SUNAT), reingresa el stock y reembolsa (o descuenta de la deuda si
 * se vendió al crédito).
 */
@Component({
  selector: 'app-devolucion-caja',
  imports: [ReactiveFormsModule, DecimalPipe, ErrorApi],
  template: `
    <div class="space-y-3">
      <app-error-api [problema]="error()" />
      <form (submit)="$event.preventDefault(); buscar()" class="flex flex-wrap items-end gap-2">
        <div>
          <label for="dv-comprobante" class="etiqueta">Comprobante</label>
          <input
            id="dv-comprobante"
            class="campo w-44 font-mono uppercase"
            placeholder="B001-123"
            [formControl]="comprobante"
          />
        </div>
        <button type="submit" class="btn-secundario">Buscar</button>
      </form>
      @if (cobro(); as c) {
        <form
          [formGroup]="form"
          (ngSubmit)="devolver()"
          class="tarjeta space-y-3 text-sm"
          novalidate
        >
          <p>
            <span class="font-mono font-semibold">{{ c.comprobante }}</span> ·
            {{ c.clienteNombre }} · S/ {{ c.total | number: '1.2-2' }}
            <span [class]="estados[c.estadoComprobante].clase">
              {{ estados[c.estadoComprobante].texto }}
            </span>
          </p>
          @if (c.devuelto > 0) {
            <p class="text-xs text-slate-600">Ya devuelto: S/ {{ c.devuelto | number: '1.2-2' }}</p>
          }
          @if (!c.serieNota) {
            <p class="text-xs text-red-700" role="alert">
              La caja no tiene serie de nota de crédito para este comprobante: configúrela en Cajas
              y series.
            </p>
          }
          <div class="grid gap-2 sm:grid-cols-2">
            <div>
              <label for="dv-motivo" class="etiqueta">Motivo (catálogo 09)</label>
              <select id="dv-motivo" class="campo" formControlName="motivo">
                @for (m of motivos; track m) {
                  <option [value]="m">{{ m }} · {{ nombresMotivo[m] }}</option>
                }
              </select>
            </div>
            <div>
              <label for="dv-medio" class="etiqueta">Reembolso</label>
              <select id="dv-medio" class="campo" formControlName="medio">
                @for (m of medios; track m) {
                  <option [value]="m">{{ nombresMedio[m] }}</option>
                }
              </select>
            </div>
          </div>
          @if (valores().motivo === '01') {
            @if (porBaja()) {
              <p class="text-xs text-slate-600" role="status">
                Se dará de baja ante SUNAT, sin nota de crédito. Si SUNAT no la acepta, el sistema
                emitirá la nota de crédito de anulación.
              </p>
            } @else {
              <p class="text-xs text-slate-600" role="status">
                Se anulará con nota de crédito: {{ c.impedimentoBaja }}
              </p>
            }
          }
          <div>
            <label for="dv-desc" class="etiqueta">Sustento</label>
            <input
              id="dv-desc"
              class="campo"
              formControlName="descripcion"
              placeholder="El repuesto no corresponde al modelo…"
            />
          </div>
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Artículo</th>
                <th scope="col" class="text-right">Vendido</th>
                <th scope="col" class="text-right">Devuelto</th>
                <th scope="col" class="text-right">Devuelve</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (l of c.lineas; track l.linea; let i = $index) {
                <tr>
                  <td>
                    <span class="font-mono">{{ l.codigo }}</span> · {{ l.descripcion }}
                    <span class="block text-xs text-slate-500">
                      {{ l.precioUnitario | number: '1.2-2' }} c/u
                    </span>
                  </td>
                  <td class="text-right">{{ l.cantidad | number: '1.0-4' }} {{ l.unidad }}</td>
                  <td class="text-right">{{ l.devuelta | number: '1.0-4' }}</td>
                  <td class="text-right">
                    @if (porItem()) {
                      <label [for]="'dv-cant-' + i" class="sr-only">Cantidad a devolver</label>
                      <input
                        [id]="'dv-cant-' + i"
                        type="number"
                        min="0"
                        [max]="l.cantidad - l.devuelta"
                        class="campo w-24 text-right"
                        [formControl]="form.controls.cantidades.at(i)"
                      />
                    } @else {
                      {{ l.cantidad - l.devuelta | number: '1.0-4' }}
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <p>
            {{ porBaja() ? 'Se anula por' : 'Nota de crédito por aprox.' }}
            <span class="font-semibold">S/ {{ estimado() | number: '1.2-2' }}</span>
            @if (c.alCredito > 0) {
              <span class="block text-xs text-slate-600">
                Se vendió al crédito: primero se descuenta de la deuda del cliente y el resto se
                reembolsa.
              </span>
            }
          </p>
          <div class="flex gap-2">
            <button type="submit" class="btn-primario" [disabled]="!c.serieNota || estimado() <= 0">
              {{ porBaja() ? 'Anular ante SUNAT' : 'Emitir nota de crédito' }}
            </button>
            <button type="button" class="btn-secundario" (click)="cobro.set(null)">Cancelar</button>
          </div>
        </form>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevolucionCajaPanel {
  private readonly api = inject(CajaApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly sesionId = input.required<string>();
  readonly registrado = output<DevolucionCaja>();
  protected readonly motivos: MotivoNotaCredito[] = ['07', '06', '01'];
  protected readonly nombresMotivo = MOTIVO_NOTA;
  protected readonly medios = MEDIOS_DINERO;
  protected readonly nombresMedio = NOMBRE_MEDIO;
  protected readonly estados = ESTADO_COMPROBANTE;

  protected readonly comprobante = this.fb.control('', Validators.required);
  protected readonly cobro = signal<CobroDevolvible | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly form = this.fb.group({
    motivo: ['07' as MotivoNotaCredito],
    medio: ['EFECTIVO' as MedioPago],
    descripcion: ['', [Validators.required, Validators.maxLength(250)]],
    cantidades: this.fb.array<FormControl<number>>([]),
  });
  private readonly valores = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  protected readonly porItem = computed(() => this.valores().motivo === '07');
  protected readonly porBaja = computed(
    () => this.valores().motivo === '01' && this.cobro()?.impedimentoBaja === null,
  );
  /** Por ítem, lo marcado; anulación o devolución total, todo lo que queda. */
  protected readonly estimado = computed(() => {
    const c = this.cobro();
    if (!c) return 0;
    const cantidades = this.valores().cantidades ?? [];
    return centimos(
      c.lineas.reduce((s, l, i) => {
        const cantidad = this.porItem() ? Number(cantidades[i] ?? 0) : l.cantidad - l.devuelta;
        return s + cantidad * l.precioUnitario;
      }, 0),
    );
  });

  protected async buscar(): Promise<void> {
    if (this.comprobante.invalid) return;
    try {
      this.error.set(null);
      const c = await firstValueFrom(this.api.devolvible(this.sesionId(), this.comprobante.value));
      this.form.controls.cantidades.clear();
      c.lineas.forEach(() => this.form.controls.cantidades.push(this.fb.control(0)));
      this.form.patchValue({ motivo: '07', medio: 'EFECTIVO', descripcion: '' });
      this.cobro.set(c);
    } catch (e) {
      this.cobro.set(null);
      this.error.set(aProblema(e));
    }
  }

  protected async devolver(): Promise<void> {
    const c = this.cobro();
    if (!c || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const lineas =
      v.motivo === '07'
        ? c.lineas
            .map((l, i) => ({ linea: l.linea, cantidad: Number(v.cantidades[i] ?? 0) }))
            .filter((l) => l.cantidad > 0)
        : [];
    try {
      this.error.set(null);
      const d = await firstValueFrom(
        this.api.devolver(this.sesionId(), {
          cobroId: c.cobroId,
          motivo: v.motivo,
          descripcion: v.descripcion,
          lineas,
          medioReembolso: v.medio,
        }),
      );
      const partes = [
        d.bajaId
          ? `Baja de ${d.comprobante} pedida a SUNAT por S/ ${d.total.toFixed(2)}`
          : `Nota de crédito ${d.nota ?? ''} emitida por S/ ${d.total.toFixed(2)}`,
      ];
      if (d.aplicadoCredito > 0)
        partes.push(`S/ ${d.aplicadoCredito.toFixed(2)} descontado de la deuda`);
      if (d.reembolso > 0 && d.medioReembolso) {
        partes.push(
          `reembolse S/ ${d.reembolso.toFixed(2)} en ${NOMBRE_MEDIO[d.medioReembolso].toLowerCase()}`,
        );
      }
      this.avisos.exito(partes.join('; ') + '.');
      this.cobro.set(null);
      this.comprobante.reset('');
      this.registrado.emit(d);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
