import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { Panel, ResumenPagar } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Icono } from '../../shared/ui/icono';
import { CreditosApi } from '../creditos/creditos.api';
import { ReportesApi } from '../reportes/reportes.api';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, DecimalPipe, DatePipe, ErrorApi, Icono],
  templateUrl: './inicio.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inicio implements OnInit {
  private readonly reportes = inject(ReportesApi);
  private readonly creditos = inject(CreditosApi);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly panel = signal<Panel | null>(null);
  protected readonly pagar = signal<ResumenPagar | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly hoy = new Date();
  /** Saludo según la hora de Lima. */
  protected readonly saludo = computed(() => {
    const hora = Number(
      new Intl.DateTimeFormat('en-GB', {
        hour: 'numeric',
        hourCycle: 'h23',
        timeZone: 'America/Lima',
      }).format(this.hoy),
    );
    return hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  });

  /** Variación del mes frente al mes anterior al mismo día ("+12.5 %"); null sin base de comparación. */
  protected readonly variacion = computed(() => {
    const v = this.panel()?.ventas;
    if (!v || v.mesAnteriorAlDia === 0) return null;
    const pct = Math.round(((v.mes - v.mesAnteriorAlDia) / v.mesAnteriorAlDia) * 1000) / 10;
    return `${pct > 0 ? '+' : ''}${pct} %`;
  });
  /** El día de mayor venta llena la barra. */
  protected readonly maximoDia = computed(() =>
    Math.max(1, ...(this.panel()?.ventas?.porDia ?? []).map((d) => d.total)),
  );
  protected readonly vencidoPagar = computed(() =>
    (this.pagar()?.porMoneda ?? []).map((m) => ({
      moneda: m.moneda,
      vencido: m.vencido1a30 + m.vencido31a60 + m.vencido61a90 + m.vencidoMas90,
    })),
  );

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      this.panel.set(await firstValueFrom(this.reportes.panel()));
      if (this.sesion.tiene(PERMISOS.creditosPagarLeer)) {
        this.pagar.set(await firstValueFrom(this.creditos.resumenPagar()));
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
