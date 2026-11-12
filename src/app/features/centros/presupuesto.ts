import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { Centro, LineaPresupuesto, Periodo, TipoCentro } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { MESES, hoyEnLima } from './arbol';
import { CentrosApi } from './centros.api';

@Component({
  selector: 'app-presupuesto',
  imports: [ReactiveFormsModule, CurrencyPipe, ErrorApi],
  templateUrl: './presupuesto.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Presupuesto implements OnInit {
  private readonly api = inject(CentrosApi);
  private readonly avisos = inject(NotificacionesService);
  protected readonly sesion = inject(SesionService);
  protected readonly meses = MESES;

  protected readonly costos = signal<Centro[]>([]);
  protected readonly beneficios = signal<Centro[]>([]);
  protected readonly montos = signal<ReadonlyMap<string, string>>(new Map());
  protected readonly periodo = signal<Periodo | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly guardando = signal(false);
  protected readonly editable = computed(
    () => this.periodo()?.estado === 'ABIERTO' && this.sesion.tiene(PERMISOS.centrosPresupuesto),
  );
  protected readonly totalCostos = computed(() => this.total('COSTO', this.costos()));
  protected readonly totalIngresos = computed(() => this.total('BENEFICIO', this.beneficios()));

  protected readonly filtro = inject(NonNullableFormBuilder).group({
    anio: [Number(hoyEnLima().slice(0, 4))],
    mes: [Number(hoyEnLima().slice(5, 7))],
  });

  ngOnInit(): void {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    const { anio, mes } = this.filtro.getRawValue();
    try {
      this.error.set(null);
      const [costos, beneficios, lineas, periodos] = await Promise.all([
        firstValueFrom(this.api.listar('COSTO')),
        firstValueFrom(this.api.listar('BENEFICIO')),
        firstValueFrom(this.api.presupuesto(anio, mes)),
        firstValueFrom(this.api.periodos(anio)),
      ]);
      this.costos.set(costos.filter((c) => c.imputable && c.activo));
      this.beneficios.set(beneficios.filter((c) => c.imputable && c.activo));
      this.montos.set(
        new Map(lineas.map((l) => [this.clave(l.tipoCentro, l.centroId), String(l.monto)])),
      );
      this.periodo.set(periodos.find((p) => p.mes === mes) ?? null);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected monto(tipo: TipoCentro, id: string): string {
    return this.montos().get(this.clave(tipo, id)) ?? '';
  }

  protected escribir(tipo: TipoCentro, id: string, evento: Event): void {
    const nuevos = new Map(this.montos());
    nuevos.set(this.clave(tipo, id), (evento.target as HTMLInputElement).value);
    this.montos.set(nuevos);
  }

  protected async guardar(): Promise<void> {
    const lineas: LineaPresupuesto[] = [];
    for (const [clave, valor] of this.montos()) {
      if (valor.trim() === '') {
        continue;
      }
      const monto = Number(valor);
      if (!Number.isFinite(monto) || monto < 0) {
        this.error.set({
          status: 400,
          title: 'Monto inválido',
          detail: 'Los montos deben ser números no negativos.',
        });
        return;
      }
      const [tipoCentro, centroId] = clave.split(':') as [TipoCentro, string];
      lineas.push({ tipoCentro, centroId, monto });
    }
    const { anio, mes } = this.filtro.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.guardarPresupuesto(anio, mes, lineas));
      this.avisos.exito(`Presupuesto de ${MESES[mes - 1]} ${anio} guardado.`);
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.guardando.set(false);
    }
  }

  private total(tipo: TipoCentro, centros: Centro[]): number {
    return centros.reduce(
      (suma, c) => suma + (Number(this.montos().get(this.clave(tipo, c.id))) || 0),
      0,
    );
  }

  private clave(tipo: TipoCentro, id: string): string {
    return `${tipo}:${id}`;
  }
}
