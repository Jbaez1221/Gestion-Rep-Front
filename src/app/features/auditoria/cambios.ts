import { DatePipe, KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { finDelDiaLima, inicioDelDiaLima } from '../../core/http/parametros';
import { Problema, aProblema } from '../../core/http/problema';
import { CambioAuditoria, Pagina } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { ValorPipe } from '../../shared/ui/valor.pipe';
import { AuditoriaApi } from './auditoria.api';

@Component({
  selector: 'app-cambios',
  imports: [ReactiveFormsModule, DatePipe, KeyValuePipe, ErrorApi, Paginador, ValorPipe],
  templateUrl: './cambios.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cambios {
  private readonly api = inject(AuditoriaApi);

  protected readonly pagina = signal<Pagina<CambioAuditoria> | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly filtros = inject(NonNullableFormBuilder).group({
    entidad: [''],
    entidadId: [''],
    usuario: [''],
    operacion: [''],
    desde: [''],
    hasta: [''],
  });

  constructor() {
    void this.buscar(0);
  }

  protected async buscar(numero = 0): Promise<void> {
    const f = this.filtros.getRawValue();
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(
          this.api.cambios({
            entidad: f.entidad,
            entidadId: f.entidadId,
            usuario: f.usuario,
            operacion: f.operacion,
            desde: inicioDelDiaLima(f.desde),
            hasta: finDelDiaLima(f.hasta),
            pagina: numero,
          }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
