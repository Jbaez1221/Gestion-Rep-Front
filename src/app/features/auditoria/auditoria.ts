import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';

@Component({
  selector: 'app-auditoria',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="space-y-4">
      <h1 class="titulo-pagina">Auditoría</h1>
      <nav class="flex gap-1 border-b border-slate-200" aria-label="Secciones de auditoría">
        @if (sesion.tiene(permisos.auditoriaLeer)) {
          <a
            routerLink="cambios"
            routerLinkActive="border-marca-600 text-marca-700"
            ariaCurrentWhenActive="page"
            class="pestana"
          >
            Historial de cambios
          </a>
        }
        @if (sesion.tiene(permisos.auditoriaEventos)) {
          <a
            routerLink="eventos"
            routerLinkActive="border-marca-600 text-marca-700"
            ariaCurrentWhenActive="page"
            class="pestana"
          >
            Eventos de seguridad
          </a>
        }
        @if (sesion.tiene(permisos.auditoriaLeer)) {
          <a
            routerLink="flujo"
            routerLinkActive="border-marca-600 text-marca-700"
            ariaCurrentWhenActive="page"
            class="pestana"
          >
            Flujo de documentos
          </a>
        }
      </nav>
      <router-outlet />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auditoria {
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
}
