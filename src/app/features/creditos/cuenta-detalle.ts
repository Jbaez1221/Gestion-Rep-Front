import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { CuentaPorCobrar, EstadoCredito } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { hoyEnLima } from '../centros/arbol';
import { CreditosApi } from './creditos.api';

/** La cuenta con sus abonos y el estado de crédito del cliente (límite, usado, vencido). */
@Component({
  selector: 'app-cuenta-detalle',
  imports: [RouterLink, ReactiveFormsModule, DatePipe, DecimalPipe, ErrorApi],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="titulo-pagina">
          Cuenta por cobrar <span class="font-mono">{{ cuenta()?.numero }}</span>
        </h1>
        <a routerLink="/creditos/cobrar" class="btn-enlace">Volver a cuentas por cobrar</a>
      </div>
      <app-error-api [problema]="error()" />
      @if (cuenta(); as c) {
        <section class="tarjeta grid gap-3 text-sm sm:grid-cols-4">
          <div class="sm:col-span-2">
            <p class="etiqueta">Cliente</p>
            <p>
              <span class="font-mono">{{ c.clienteDocumento }}</span> · {{ c.clienteNombre }}
            </p>
          </div>
          <div>
            <p class="etiqueta">Comprobante</p>
            <a
              [routerLink]="['/facturacion/comprobante', c.comprobanteId]"
              class="font-mono text-texto-acento hover:underline"
              >{{ c.comprobante }}</a
            >
          </div>
          <div>
            <p class="etiqueta">Emisión · vencimiento</p>
            <p [class.text-peligro-texto]="c.vencida">
              {{ c.fechaEmision | date: 'dd/MM/yyyy' }} ·
              {{ c.fechaVencimiento | date: 'dd/MM/yyyy' }}
            </p>
          </div>
          <div>
            <p class="etiqueta">Monto</p>
            <p>S/ {{ c.monto | number: '1.2-2' }}</p>
          </div>
          <div>
            <p class="etiqueta">Saldo</p>
            <p class="font-semibold">S/ {{ c.saldo | number: '1.2-2' }}</p>
          </div>
          <div>
            <p class="etiqueta">Estado</p>
            <p>{{ c.estado === 'PAGADA' ? 'Pagada' : c.vencida ? 'Vencida' : 'Pendiente' }}</p>
          </div>
          <div>
            <p class="etiqueta">Registró</p>
            <p>
              {{ c.creadoPor ?? '—' }}
              @if (c.autorizadoPor) {
                <span class="block text-xs text-texto-suave">Autorizó {{ c.autorizadoPor }}</span>
              }
            </p>
          </div>
        </section>
        <div class="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <section class="tarjeta space-y-2">
            <h2 class="font-semibold">Abonos y notas de crédito</h2>
            <ul class="divide-y divide-borde text-sm">
              @for (a of c.abonos; track a.id) {
                <li class="flex justify-between gap-2 py-2">
                  <span>
                    {{ a.fecha | date: 'dd/MM/yyyy HH:mm' }} ·
                    {{ tiposAbono[a.tipo] }}
                    <span class="block text-xs text-texto-suave"
                      >{{ a.detalle }} · {{ a.usuario }}</span
                    >
                  </span>
                  <span class="font-semibold">S/ {{ a.monto | number: '1.2-2' }}</span>
                </li>
              } @empty {
                <li class="py-4 text-center text-texto-suave">Aún no hay abonos.</li>
              }
            </ul>
            @if (c.saldo > 0 && sesion.tiene(permisos.creditosRetencion)) {
              <form
                [formGroup]="retencion"
                (ngSubmit)="registrarRetencion()"
                class="space-y-2 border-t border-borde pt-3"
                aria-label="Comprobante de retención"
                novalidate
              >
                <h3 class="text-sm font-semibold">Comprobante de retención del cliente</h3>
                <div class="flex flex-wrap items-end gap-2">
                  <div>
                    <label for="rt-serie" class="etiqueta">Serie</label>
                    <input
                      id="rt-serie"
                      class="campo w-20 font-mono uppercase"
                      maxlength="4"
                      placeholder="R001"
                      formControlName="serie"
                    />
                  </div>
                  <div>
                    <label for="rt-numero" class="etiqueta">Número</label>
                    <input
                      id="rt-numero"
                      class="campo w-28 font-mono"
                      maxlength="8"
                      formControlName="numero"
                    />
                  </div>
                  <div>
                    <label for="rt-fecha" class="etiqueta">Fecha</label>
                    <input id="rt-fecha" type="date" class="campo" formControlName="fecha" />
                  </div>
                  <div>
                    <label for="rt-monto" class="etiqueta">Monto retenido</label>
                    <input
                      id="rt-monto"
                      type="number"
                      min="0.01"
                      step="0.01"
                      class="campo w-28 text-right"
                      formControlName="monto"
                    />
                  </div>
                  <button type="submit" class="btn-secundario">Registrar</button>
                </div>
              </form>
            }
          </section>
          @if (estado(); as e) {
            <section class="tarjeta space-y-2 self-start text-sm" aria-label="Crédito del cliente">
              <h2 class="font-semibold">Crédito del cliente</h2>
              <dl class="grid grid-cols-2 gap-1">
                <dt>Días de crédito</dt>
                <dd class="text-right">{{ e.diasCredito }}</dd>
                <dt>Límite</dt>
                <dd class="text-right">
                  {{ e.limite === null ? 'Sin límite' : (e.limite | number: '1.2-2') }}
                </dd>
                <dt>Usado</dt>
                <dd class="text-right">{{ e.usado | number: '1.2-2' }}</dd>
                <dt>Disponible</dt>
                <dd class="text-right font-semibold">{{ e.disponible | number: '1.2-2' }}</dd>
                <dt>Vencido</dt>
                <dd class="text-right" [class.text-peligro-texto]="e.vencido > 0">
                  {{ e.vencido | number: '1.2-2' }}
                </dd>
              </dl>
              <p class="text-xs text-texto-suave">{{ e.cuentas.length }} cuentas pendientes.</p>
            </section>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentaDetalle implements OnInit {
  private readonly api = inject(CreditosApi);
  readonly id = input.required<string>();
  protected readonly tiposAbono: Record<CuentaPorCobrar['abonos'][number]['tipo'], string> = {
    ABONO: 'Abono',
    NOTA_CREDITO: 'Nota de crédito',
    ANULACION: 'Baja ante SUNAT',
    RETENCION: 'Retención del IGV',
  };
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly retencion = this.fb.group({
    serie: ['', [Validators.required, Validators.pattern(/^[Rr][A-Za-z0-9]{3}$/)]],
    numero: ['', [Validators.required, Validators.pattern(/^\d{1,8}$/)]],
    fecha: [hoyEnLima(), Validators.required],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });
  protected readonly cuenta = signal<CuentaPorCobrar | null>(null);
  protected readonly estado = signal<EstadoCredito | null>(null);
  protected readonly error = signal<Problema | null>(null);

  ngOnInit(): void {
    void this.cargar();
  }

  protected async registrarRetencion(): Promise<void> {
    if (this.retencion.invalid) {
      this.retencion.markAllAsTouched();
      this.error.set({
        status: 400,
        title: 'Comprobante de retención incompleto',
        detail: 'Serie que empieza con R (R001), número, fecha y monto retenido.',
      });
      return;
    }
    const v = this.retencion.getRawValue();
    try {
      this.error.set(null);
      const c = await firstValueFrom(
        this.api.registrarRetencion(this.id(), {
          serie: v.serie.toUpperCase(),
          numero: v.numero,
          fecha: v.fecha,
          monto: Number(v.monto),
        }),
      );
      this.cuenta.set(c);
      this.retencion.reset({ serie: '', numero: '', fecha: hoyEnLima(), monto: null });
      this.avisos.exito('Retención registrada: el saldo se descontó.');
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async cargar(): Promise<void> {
    try {
      const c = await firstValueFrom(this.api.cuenta(this.id()));
      this.cuenta.set(c);
      this.estado.set(await firstValueFrom(this.api.estadoCliente(c.clienteId)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
