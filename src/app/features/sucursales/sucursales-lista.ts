import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { Pagina, Sucursal, TipoSucursal } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { SucursalesApi } from './sucursales.api';

@Component({
  selector: 'app-sucursales-lista',
  imports: [ReactiveFormsModule, RouterLink, ErrorApi, Paginador],
  templateUrl: './sucursales-lista.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SucursalesLista {
  private readonly api = inject(SucursalesApi);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;

  protected readonly pagina = signal<Pagina<Sucursal> | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly filtros = inject(NonNullableFormBuilder).group({
    texto: [''],
    tipo: ['' as TipoSucursal | ''],
    activa: [''],
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
          this.api.listar({
            texto: f.texto,
            tipo: f.tipo,
            activa: f.activa === '' ? null : f.activa === 'true',
            pagina: numero,
          }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
