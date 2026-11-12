import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { Periodo } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { MESES, hoyEnLima } from './arbol';
import { CentrosApi } from './centros.api';

@Component({
  selector: 'app-periodos',
  imports: [ReactiveFormsModule, DatePipe, ErrorApi],
  templateUrl: './periodos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Periodos implements OnInit {
  private readonly api = inject(CentrosApi);
  private readonly avisos = inject(NotificacionesService);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly meses = MESES;

  protected readonly periodos = signal<Periodo[]>([]);
  protected readonly error = signal<Problema | null>(null);
  protected readonly anio = inject(NonNullableFormBuilder).control(Number(hoyEnLima().slice(0, 4)));

  ngOnInit(): void {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    try {
      this.error.set(null);
      this.periodos.set(await firstValueFrom(this.api.periodos(this.anio.value)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async cerrar(p: Periodo): Promise<void> {
    const nombre = `${MESES[p.mes - 1]} ${p.anio}`;
    if (
      !window.confirm(`¿Cerrar ${nombre}? No admitirá más imputaciones ni cambios de presupuesto.`)
    ) {
      return;
    }
    await this.ejecutar(
      () => firstValueFrom(this.api.cerrarPeriodo(p.anio, p.mes)),
      `${nombre} cerrado.`,
    );
  }

  protected async reabrir(p: Periodo): Promise<void> {
    const nombre = `${MESES[p.mes - 1]} ${p.anio}`;
    if (!window.confirm(`¿Reabrir ${nombre}? Volverá a admitir movimientos.`)) {
      return;
    }
    await this.ejecutar(
      () => firstValueFrom(this.api.reabrirPeriodo(p.anio, p.mes)),
      `${nombre} reabierto.`,
    );
  }

  private async ejecutar(accion: () => Promise<unknown>, mensaje: string): Promise<void> {
    try {
      this.error.set(null);
      await accion();
      this.avisos.exito(mensaje);
      await this.cargar();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
