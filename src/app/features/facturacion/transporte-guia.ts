import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, startWith } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { DatosGuia, ModalidadTransporte } from '../../core/modelos/api.modelos';
import { MODALIDAD_TRANSPORTE } from './etiquetas';

/** Grupo del formulario de transporte de una guía (lo validan las reglas SUNAT del servidor). */
export function formTransporte(fb: NonNullableFormBuilder) {
  return fb.group({
    modalidad: ['02' as ModalidadTransporte],
    vehiculoM1L: [false],
    transportistaRuc: ['', Validators.pattern(/^\d{11}$/)],
    transportistaNombre: ['', Validators.maxLength(200)],
    transportistaMtc: ['', Validators.maxLength(20)],
    placa: ['', Validators.pattern(/^[A-Za-z0-9]{6,8}$/)],
    conductorTipo: ['1'],
    conductorDocumento: ['', Validators.maxLength(15)],
    conductorNombres: ['', Validators.maxLength(100)],
    conductorApellidos: ['', Validators.maxLength(100)],
    conductorLicencia: ['', Validators.pattern(/^[A-Za-z0-9]{9,10}$/)],
    pesoTotal: [null as number | null, Validators.min(0.001)],
    bultos: [null as number | null, Validators.min(1)],
  });
}

export type FormTransporte = ReturnType<typeof formTransporte>;

/** Lo que pide el servidor: solo los datos de la modalidad elegida. */
export function datosGuia(v: FormTransporte['value']): DatosGuia {
  const publico = v.modalidad === '01';
  const conVehiculo = !publico && !v.vehiculoM1L;
  return {
    transporte: {
      modalidad: v.modalidad ?? '02',
      vehiculoM1L: !publico && !!v.vehiculoM1L,
      transportista: publico
        ? {
            ruc: v.transportistaRuc ?? '',
            razonSocial: v.transportistaNombre ?? '',
            registroMtc: v.transportistaMtc || null,
          }
        : null,
      placa: conVehiculo ? (v.placa ?? '').toUpperCase() : null,
      conductor: conVehiculo
        ? {
            tipoDocumento: v.conductorTipo ?? '1',
            documento: v.conductorDocumento ?? '',
            nombres: v.conductorNombres ?? '',
            apellidos: v.conductorApellidos ?? '',
            licencia: (v.conductorLicencia ?? '').toUpperCase(),
          }
        : null,
    },
    pesoTotal:
      v.pesoTotal === null || v.pesoTotal === undefined || String(v.pesoTotal) === ''
        ? null
        : Number(v.pesoTotal),
    bultos:
      v.bultos === null || v.bultos === undefined || String(v.bultos) === ''
        ? null
        : Number(v.bultos),
  };
}

/** Transporte de la guía: transportista (público) o vehículo y conductor (privado), peso y bultos. */
@Component({
  selector: 'app-transporte-guia',
  imports: [ReactiveFormsModule],
  template: `
    <fieldset [formGroup]="grupo()" class="grid gap-2 sm:grid-cols-3">
      <legend class="etiqueta sm:col-span-3">Transporte (guía de remisión)</legend>
      <div>
        <label [for]="id('modalidad')" class="etiqueta">Modalidad</label>
        <select [id]="id('modalidad')" class="campo" formControlName="modalidad">
          @for (m of modalidades; track m) {
            <option [value]="m">{{ m }} · {{ nombres[m] }}</option>
          }
        </select>
      </div>
      <div>
        <label [for]="id('peso')" class="etiqueta">Peso bruto (kg)</label>
        <input
          [id]="id('peso')"
          type="number"
          min="0.001"
          step="0.001"
          class="campo text-right"
          formControlName="pesoTotal"
          placeholder="Según los artículos"
        />
      </div>
      <div>
        <label [for]="id('bultos')" class="etiqueta">Bultos</label>
        <input
          [id]="id('bultos')"
          type="number"
          min="1"
          class="campo text-right"
          formControlName="bultos"
        />
      </div>
      @if (modalidad() === '01') {
        <div>
          <label [for]="id('ruc')" class="etiqueta">RUC del transportista</label>
          <input
            [id]="id('ruc')"
            class="campo font-mono"
            maxlength="11"
            formControlName="transportistaRuc"
          />
        </div>
        <div>
          <label [for]="id('razon')" class="etiqueta">Razón social</label>
          <input [id]="id('razon')" class="campo" formControlName="transportistaNombre" />
        </div>
        <div>
          <label [for]="id('mtc')" class="etiqueta">Registro MTC</label>
          <input [id]="id('mtc')" class="campo" formControlName="transportistaMtc" />
        </div>
      } @else {
        <label class="flex items-center gap-2 text-sm sm:col-span-3">
          <input [id]="id('m1l')" type="checkbox" formControlName="vehiculoM1L" />
          Vehículo de categoría M1 o L (auto o moto): no exige placa ni conductor
        </label>
        @if (!m1l()) {
          <div>
            <label [for]="id('placa')" class="etiqueta">Placa</label>
            <input
              [id]="id('placa')"
              class="campo font-mono uppercase"
              maxlength="8"
              formControlName="placa"
            />
          </div>
          <div>
            <label [for]="id('ctipo')" class="etiqueta">Documento del conductor</label>
            <div class="flex gap-1">
              <select [id]="id('ctipo')" class="campo w-20" formControlName="conductorTipo">
                <option value="1">DNI</option>
                <option value="4">CE</option>
                <option value="7">Pasaporte</option>
              </select>
              <label [for]="id('cdoc')" class="sr-only">Número de documento</label>
              <input
                [id]="id('cdoc')"
                class="campo font-mono"
                formControlName="conductorDocumento"
              />
            </div>
          </div>
          <div>
            <label [for]="id('licencia')" class="etiqueta">Licencia</label>
            <input
              [id]="id('licencia')"
              class="campo font-mono uppercase"
              maxlength="10"
              formControlName="conductorLicencia"
            />
          </div>
          <div>
            <label [for]="id('cnombres')" class="etiqueta">Nombres</label>
            <input [id]="id('cnombres')" class="campo" formControlName="conductorNombres" />
          </div>
          <div>
            <label [for]="id('capellidos')" class="etiqueta">Apellidos</label>
            <input [id]="id('capellidos')" class="campo" formControlName="conductorApellidos" />
          </div>
        }
      }
    </fieldset>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransporteGuiaForm {
  readonly grupo = input.required<FormTransporte | FormGroup>();
  readonly prefijo = input('tg');
  protected readonly modalidades: ModalidadTransporte[] = ['02', '01'];
  protected readonly nombres = MODALIDAD_TRANSPORTE;

  private readonly valores = toSignal(
    toObservable(this.grupo).pipe(
      switchMap((g) =>
        (g.valueChanges as Observable<FormTransporte['value']>).pipe(startWith(g.getRawValue())),
      ),
    ),
    { initialValue: {} as FormTransporte['value'] },
  );
  protected readonly modalidad = computed(() => this.valores().modalidad ?? '02');
  protected readonly m1l = computed(() => !!this.valores().vehiculoM1L);

  protected id(campo: string): string {
    return `${this.prefijo()}-${campo}`;
  }
}
