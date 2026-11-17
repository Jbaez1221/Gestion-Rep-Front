import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { Caja, SerieComprobante, TipoComprobanteEmitido } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { NOMBRE_TIPO } from '../facturacion/etiquetas';
import { FacturacionApi } from '../facturacion/facturacion.api';
import { CajaApi } from './caja.api';

/** Series electrónicas por sucursal (F001, B001) y las cajas que las usan. */
@Component({
  selector: 'app-configuracion-caja',
  imports: [ReactiveFormsModule, ErrorApi],
  template: `
    <div class="space-y-4">
      <app-error-api [problema]="error()" />
      <div class="grid gap-4 lg:grid-cols-2">
        <section class="tarjeta space-y-2">
          <h2 class="font-semibold">Series de comprobantes</h2>
          <p class="text-xs text-slate-500">
            Por establecimiento: la factura electrónica empieza con F y la boleta con B; la nota de
            crédito, con la letra del comprobante que modifica (FC01, BC01). El número avanza sin
            huecos al emitir.
          </p>
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Serie</th>
                <th scope="col">Tipo</th>
                <th scope="col">Sucursal</th>
                <th scope="col" class="text-right">Último</th>
                <th scope="col"><span class="sr-only">Estado</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (s of series(); track s.serie) {
                <tr>
                  <td class="font-mono">{{ s.serie }}</td>
                  <td>{{ tipos[s.tipo] }}</td>
                  <td>{{ s.sucursal ?? '—' }}</td>
                  <td class="text-right">{{ s.ultimoNumero }}</td>
                  <td>
                    @if (puedeSeries()) {
                      <button type="button" class="btn-enlace" (click)="alternarSerie(s)">
                        {{ s.activo ? 'Desactivar' : 'Activar' }}
                      </button>
                    } @else {
                      {{ s.activo ? 'Activa' : 'Inactiva' }}
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="py-4 text-center text-slate-500">
                    Registre las series de cada sucursal.
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (puedeSeries()) {
            <form
              [formGroup]="serie"
              (ngSubmit)="crearSerie()"
              class="flex flex-wrap items-end gap-2"
              novalidate
            >
              <div>
                <label for="cf-serie" class="etiqueta">Serie</label>
                <input
                  id="cf-serie"
                  class="campo w-24 font-mono uppercase"
                  maxlength="4"
                  formControlName="serie"
                />
              </div>
              <div>
                <label for="cf-tipo" class="etiqueta">Tipo</label>
                <select id="cf-tipo" class="campo" formControlName="tipo">
                  <option value="BOLETA">Boleta</option>
                  <option value="FACTURA">Factura</option>
                  <option value="NOTA_CREDITO">Nota de crédito</option>
                </select>
              </div>
              <div>
                <label for="cf-sucursal" class="etiqueta">Sucursal</label>
                <select id="cf-sucursal" class="campo" formControlName="sucursalId">
                  @for (s of sesion.sucursales(); track s.id) {
                    <option [value]="s.id">{{ s.nombre }}</option>
                  }
                </select>
              </div>
              <button type="submit" class="btn-secundario">Agregar serie</button>
            </form>
          }
        </section>

        <section class="tarjeta space-y-2">
          <h2 class="font-semibold">Cajas</h2>
          <ul class="divide-y divide-slate-100 text-sm">
            @for (c of cajas(); track c.id) {
              <li class="flex items-center justify-between gap-2 py-2">
                <span>
                  {{ c.nombre }} <span class="font-mono text-xs">({{ c.codigo }})</span> ·
                  {{ c.serieBoleta }} / {{ c.serieFactura }}
                  @if (c.serieNcBoleta || c.serieNcFactura) {
                    · NC {{ c.serieNcBoleta ?? '—' }} / {{ c.serieNcFactura ?? '—' }}
                  }
                  @if (!c.activo) {
                    <span class="insignia-neutra">Inactiva</span>
                  }
                  @if (c.sesionAbierta) {
                    <span class="insignia-alerta">Abierta por {{ c.sesionAbierta }}</span>
                  }
                </span>
                @if (puedeCajas()) {
                  <button type="button" class="btn-enlace" (click)="editar(c)">Editar</button>
                }
              </li>
            } @empty {
              <li class="py-4 text-center text-slate-500">Aún no hay cajas.</li>
            }
          </ul>
          @if (puedeCajas()) {
            <form
              [formGroup]="caja"
              (ngSubmit)="guardarCaja()"
              class="grid gap-2 sm:grid-cols-2"
              novalidate
            >
              <h3 class="font-semibold sm:col-span-2">
                {{ editando() ? 'Editar caja' : 'Nueva caja' }}
              </h3>
              @if (!editando()) {
                <div>
                  <label for="cf-codigo" class="etiqueta">Código</label>
                  <input
                    id="cf-codigo"
                    class="campo font-mono uppercase"
                    formControlName="codigo"
                  />
                </div>
                <div>
                  <label for="cf-csucursal" class="etiqueta">Sucursal</label>
                  <select id="cf-csucursal" class="campo" formControlName="sucursalId">
                    @for (s of sesion.sucursales(); track s.id) {
                      <option [value]="s.id">{{ s.nombre }}</option>
                    }
                  </select>
                </div>
              }
              <div>
                <label for="cf-nombre" class="etiqueta">Nombre</label>
                <input id="cf-nombre" class="campo" formControlName="nombre" />
              </div>
              <div>
                <label for="cf-sboleta" class="etiqueta">Serie de boletas</label>
                <select id="cf-sboleta" class="campo" formControlName="serieBoleta">
                  <option value="">Elija…</option>
                  @for (s of seriesDe('BOLETA'); track s.serie) {
                    <option [value]="s.serie">{{ s.serie }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="cf-sfactura" class="etiqueta">Serie de facturas</label>
                <select id="cf-sfactura" class="campo" formControlName="serieFactura">
                  <option value="">Elija…</option>
                  @for (s of seriesDe('FACTURA'); track s.serie) {
                    <option [value]="s.serie">{{ s.serie }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="cf-ncboleta" class="etiqueta">Notas de crédito de boletas</label>
                <select id="cf-ncboleta" class="campo" formControlName="serieNcBoleta">
                  <option value="">Sin devoluciones</option>
                  @for (s of seriesNota('B'); track s.serie) {
                    <option [value]="s.serie">{{ s.serie }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="cf-ncfactura" class="etiqueta">Notas de crédito de facturas</label>
                <select id="cf-ncfactura" class="campo" formControlName="serieNcFactura">
                  <option value="">Sin devoluciones</option>
                  @for (s of seriesNota('F'); track s.serie) {
                    <option [value]="s.serie">{{ s.serie }}</option>
                  }
                </select>
              </div>
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" formControlName="activo" /> Activa
              </label>
              <div class="flex gap-2 sm:col-span-2">
                <button type="submit" class="btn-secundario">
                  {{ editando() ? 'Guardar' : 'Crear caja' }}
                </button>
                @if (editando()) {
                  <button type="button" class="btn-enlace" (click)="nuevaCaja()">Cancelar</button>
                }
              </div>
            </form>
          }
        </section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionCaja implements OnInit {
  private readonly cajaApi = inject(CajaApi);
  private readonly facturacionApi = inject(FacturacionApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly tipos = NOMBRE_TIPO;

  protected readonly series = signal<SerieComprobante[]>([]);
  protected readonly cajas = signal<Caja[]>([]);
  protected readonly editando = signal<Caja | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly puedeSeries = computed(() => this.sesion.tiene(PERMISOS.facturacionSeries));
  protected readonly puedeCajas = computed(() => this.sesion.tiene(PERMISOS.cajaConfigurar));

  protected readonly serie = this.fb.group({
    serie: ['', [Validators.required, Validators.pattern(/^[A-Za-z][A-Za-z0-9]{3}$/)]],
    tipo: ['BOLETA' as TipoComprobanteEmitido],
    sucursalId: ['', Validators.required],
  });
  protected readonly caja = this.fb.group({
    codigo: [''],
    sucursalId: [''],
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    serieBoleta: ['', Validators.required],
    serieFactura: ['', Validators.required],
    serieNcBoleta: [''],
    serieNcFactura: [''],
    activo: [true],
  });
  private readonly sucursalCaja = signal('');

  ngOnInit(): void {
    const primera = this.sesion.sucursalActiva()?.id ?? this.sesion.sucursales()[0]?.id ?? '';
    this.serie.controls.sucursalId.setValue(primera);
    this.caja.controls.sucursalId.setValue(primera);
    this.sucursalCaja.set(primera);
    this.caja.controls.sucursalId.valueChanges.subscribe((v) => this.sucursalCaja.set(v));
    void this.cargar();
  }

  protected seriesDe(tipo: TipoComprobanteEmitido): SerieComprobante[] {
    const sucursal = this.editando()?.sucursalId ?? this.sucursalCaja();
    return this.series().filter((s) => s.tipo === tipo && s.activo && s.sucursalId === sucursal);
  }

  /** Series de nota de crédito de la sucursal que empiezan con la letra del comprobante. */
  protected seriesNota(letra: 'B' | 'F'): SerieComprobante[] {
    return this.seriesDe('NOTA_CREDITO').filter((s) => s.serie.startsWith(letra));
  }

  private async cargar(): Promise<void> {
    try {
      const [series, cajas] = await Promise.all([
        firstValueFrom(this.facturacionApi.series()),
        firstValueFrom(this.cajaApi.cajas()),
      ]);
      this.series.set(series);
      this.cajas.set(cajas);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async crearSerie(): Promise<void> {
    if (this.serie.invalid) {
      this.serie.markAllAsTouched();
      return;
    }
    const v = this.serie.getRawValue();
    try {
      this.error.set(null);
      await firstValueFrom(
        this.facturacionApi.crearSerie(v.serie.toUpperCase(), v.tipo, v.sucursalId),
      );
      this.avisos.exito(`Serie ${v.serie.toUpperCase()} registrada.`);
      this.serie.controls.serie.reset('');
      await this.cargar();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async alternarSerie(s: SerieComprobante): Promise<void> {
    try {
      await firstValueFrom(this.facturacionApi.estadoSerie(s.serie, !s.activo));
      await this.cargar();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected editar(c: Caja): void {
    this.editando.set(c);
    this.caja.reset({
      codigo: c.codigo,
      sucursalId: c.sucursalId,
      nombre: c.nombre,
      serieBoleta: c.serieBoleta,
      serieFactura: c.serieFactura,
      serieNcBoleta: c.serieNcBoleta ?? '',
      serieNcFactura: c.serieNcFactura ?? '',
      activo: c.activo,
    });
  }

  protected nuevaCaja(): void {
    this.editando.set(null);
    this.caja.reset({
      codigo: '',
      sucursalId: this.sucursalCaja(),
      nombre: '',
      serieBoleta: '',
      serieFactura: '',
      serieNcBoleta: '',
      serieNcFactura: '',
      activo: true,
    });
  }

  protected async guardarCaja(): Promise<void> {
    if (this.caja.invalid) {
      this.caja.markAllAsTouched();
      return;
    }
    const v = this.caja.getRawValue();
    const actual = this.editando();
    const datos = {
      codigo: actual ? null : v.codigo.toUpperCase(),
      nombre: v.nombre,
      sucursalId: actual ? null : v.sucursalId,
      serieBoleta: v.serieBoleta,
      serieFactura: v.serieFactura,
      serieNcBoleta: v.serieNcBoleta || null,
      serieNcFactura: v.serieNcFactura || null,
      activo: v.activo,
    };
    try {
      this.error.set(null);
      await firstValueFrom(
        actual ? this.cajaApi.actualizarCaja(actual.id, datos) : this.cajaApi.crearCaja(datos),
      );
      this.avisos.exito(actual ? 'Caja guardada.' : 'Caja creada.');
      this.nuevaCaja();
      await this.cargar();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
