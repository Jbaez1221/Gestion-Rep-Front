import { DatePipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { finDelDiaLima, inicioDelDiaLima } from '../../core/http/parametros';
import { Problema, aProblema } from '../../core/http/problema';
import { EventoAuditoria, Pagina } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { AuditoriaApi } from './auditoria.api';

export const TIPOS_EVENTO = [
  'LOGIN_EXITOSO',
  'LOGIN_FALLIDO',
  'LOGIN_RECHAZADO',
  'CUENTA_BLOQUEADA',
  'LOGIN_LIMITE_IP',
  'LOGOUT',
  'REFRESH_REUTILIZADO',
  'PASSWORD_CAMBIADA',
  'PASSWORD_RESTABLECIDA',
  'OPERACION_DENEGADA',
  'SUCURSAL_NO_PERMITIDA',
  'ADMIN_INICIAL_CREADO',
] as const;

@Component({
  selector: 'app-eventos',
  imports: [ReactiveFormsModule, DatePipe, JsonPipe, ErrorApi, Paginador],
  templateUrl: './eventos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Eventos {
  private readonly api = inject(AuditoriaApi);

  protected readonly tipos = TIPOS_EVENTO;
  protected readonly pagina = signal<Pagina<EventoAuditoria> | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly filtros = inject(NonNullableFormBuilder).group({
    tipo: [''],
    usuario: [''],
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
          this.api.eventos({
            tipo: f.tipo,
            usuario: f.usuario,
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
