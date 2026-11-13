import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { EstadoPorFuncion, FilaCostos, FilaResultado } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { MESES, hoyEnLima, indentar } from './arbol';
import { CentrosApi } from './centros.api';

@Component({
  selector: 'app-reportes-centros',
  imports: [ReactiveFormsModule, CurrencyPipe, DecimalPipe, ErrorApi],
  templateUrl: './reportes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesCentros implements OnInit {
  private readonly api = inject(CentrosApi);
  protected readonly meses = MESES;
  protected readonly indentar = indentar;

  protected readonly costos = signal<FilaCostos[]>([]);
  protected readonly resultado = signal<FilaResultado[]>([]);
  protected readonly funcion = signal<EstadoPorFuncion | null>(null);
  protected readonly error = signal<Problema | null>(null);
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
      const [costos, resultado, funcion] = await Promise.all([
        firstValueFrom(this.api.reporteCostos(anio, mes)),
        firstValueFrom(this.api.reporteResultado(anio, mes)),
        firstValueFrom(this.api.estadoPorFuncion(anio, 1, mes)),
      ]);
      this.costos.set(costos);
      this.resultado.set(resultado);
      this.funcion.set(funcion);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
