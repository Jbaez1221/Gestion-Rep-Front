import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { Pagina, Usuario } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { UsuariosApi } from './usuarios.api';

@Component({
  selector: 'app-usuarios-lista',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, ErrorApi, Paginador],
  templateUrl: './usuarios-lista.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosLista {
  private readonly api = inject(UsuariosApi);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;

  protected readonly pagina = signal<Pagina<Usuario> | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly filtros = inject(NonNullableFormBuilder).group({ texto: [''], activo: [''] });

  constructor() {
    void this.buscar(0);
  }

  protected async buscar(numero = 0): Promise<void> {
    const f = this.filtros.getRawValue();
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(
          this.api.listar({
            texto: f.texto,
            activo: f.activo === '' ? null : f.activo === 'true',
            pagina: numero,
          }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
