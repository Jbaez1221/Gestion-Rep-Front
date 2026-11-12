import { CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { Centro, Imputacion, Moneda, Pagina, TipoImputacion } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { MESES, hoyEnLima } from './arbol';
import { CentrosApi } from './centros.api';

@Component({
  selector: 'app-imputaciones',
  imports: [ReactiveFormsModule, CurrencyPipe, DecimalPipe, ErrorApi, Paginador],
  templateUrl: './imputaciones.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Imputaciones implements OnInit {
  private readonly api = inject(CentrosApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly meses = MESES;

  protected readonly pagina = signal<Pagina<Imputacion> | null>(null);
  protected readonly costos = signal<Centro[]>([]);
  protected readonly beneficios = signal<Centro[]>([]);
  protected readonly creando = signal(false);
  protected readonly error = signal<Problema | null>(null);
  protected readonly guardando = signal(false);

  protected readonly filtros = this.fb.group({
    anio: [Number(hoyEnLima().slice(0, 4))],
    mes: [Number(hoyEnLima().slice(5, 7))],
    tipo: ['' as TipoImputacion | ''],
  });

  protected readonly formulario = this.fb.group({
    tipo: ['COSTO' as TipoImputacion],
    fecha: [hoyEnLima(), Validators.required],
    referencia: ['', Validators.maxLength(100)],
    naturaleza: ['', Validators.pattern(/^[67]\d{1,5}$/)],
    glosa: ['', [Validators.required, Validators.maxLength(250)]],
    moneda: ['PEN' as Moneda],
    montoOriginal: [0, [Validators.required, Validators.min(0.01)]],
    tipoCambio: [0],
    lineas: this.fb.array([this.nuevaLinea(100)]),
  });

  private readonly valores = toSignal(this.formulario.valueChanges, {
    initialValue: this.formulario.getRawValue(),
  });
  protected readonly sumaPorcentajes = computed(() =>
    (this.valores().lineas ?? []).reduce((s, l) => s + (Number(l?.porcentaje) || 0), 0),
  );
  protected readonly destinos = computed(() =>
    (this.valores().tipo === 'INGRESO' ? this.beneficios() : this.costos()).filter(
      (c) => c.imputable && c.activo,
    ),
  );

  ngOnInit(): void {
    void this.buscar(0);
    void this.cargarCentros();
  }

  private nuevaLinea(porcentaje: number) {
    return this.fb.group({
      centroId: ['', Validators.required],
      porcentaje: [porcentaje, [Validators.required, Validators.min(0.0001)]],
    });
  }

  private async cargarCentros(): Promise<void> {
    try {
      this.costos.set(await firstValueFrom(this.api.listar('COSTO')));
      this.beneficios.set(await firstValueFrom(this.api.listar('BENEFICIO')));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async buscar(numero = 0): Promise<void> {
    const f = this.filtros.getRawValue();
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(
          this.api.imputaciones({ anio: f.anio, mes: f.mes, tipo: f.tipo, pagina: numero }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected agregarLinea(): void {
    this.formulario.controls.lineas.push(this.nuevaLinea(0));
  }

  protected quitarLinea(i: number): void {
    this.formulario.controls.lineas.removeAt(i);
  }

  /** Al cambiar entre costo e ingreso, los centros elegidos ya no corresponden. */
  protected cambiarTipo(): void {
    this.formulario.controls.lineas.controls.forEach((l) => l.controls.centroId.setValue(''));
  }

  protected async registrar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    if (Math.abs(this.sumaPorcentajes() - 100) > 0.00001) {
      this.error.set({
        status: 400,
        title: 'Reparto incompleto',
        detail: 'Los porcentajes deben sumar 100.',
      });
      return;
    }
    const v = this.formulario.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.imputar({
          tipo: v.tipo,
          fecha: v.fecha,
          referencia: v.referencia || null,
          naturaleza: v.naturaleza || null,
          glosa: v.glosa,
          moneda: v.moneda,
          montoOriginal: v.montoOriginal,
          tipoCambio: v.moneda === 'PEN' ? null : v.tipoCambio,
          lineas: v.lineas.map((l) => ({ centroId: l.centroId, porcentaje: l.porcentaje })),
        }),
      );
      this.avisos.exito('Imputación registrada.');
      this.creando.set(false);
      this.formulario.reset();
      this.formulario.controls.lineas.clear();
      this.formulario.controls.lineas.push(this.nuevaLinea(100));
      await this.buscar(0);
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.guardando.set(false);
    }
  }

  protected async extornar(i: Imputacion): Promise<void> {
    const glosa = window.prompt(
      'Motivo del extorno (revertirá la imputación completa con montos negativos):',
    );
    if (!glosa?.trim()) {
      return;
    }
    try {
      this.error.set(null);
      await firstValueFrom(this.api.extornar(i.grupoId, glosa.trim()));
      this.avisos.exito('Imputación extornada.');
      await this.buscar(0);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  /** La primera línea de cada grupo concentra las acciones del grupo. */
  protected primeraDelGrupo(lista: Imputacion[], indice: number): boolean {
    return indice === 0 || lista[indice - 1]?.grupoId !== lista[indice]?.grupoId;
  }
}
