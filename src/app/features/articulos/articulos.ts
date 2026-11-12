import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';

@Component({
  selector: 'app-articulos',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="space-y-4">
      <div>
        <h1 class="titulo-pagina">Artículos</h1>
        <p class="mt-1 text-sm text-slate-600">
          Maestro de repuestos, accesorios y servicios: códigos, unidades SUNAT, equivalencias y
          datos tributarios.
        </p>
      </div>
      <nav
        class="flex flex-wrap gap-1 border-b border-slate-200"
        aria-label="Secciones de artículos"
      >
        <a
          routerLink="lista"
          routerLinkActive="border-marca-600 text-marca-700"
          ariaCurrentWhenActive="page"
          class="pestana"
          >Artículos</a
        >
        <a
          routerLink="catalogos"
          routerLinkActive="border-marca-600 text-marca-700"
          ariaCurrentWhenActive="page"
          class="pestana"
          >Marcas, categorías y unidades</a
        >
        @if (sesion.tiene(permisos.articulosImportar)) {
          <a
            routerLink="importar"
            routerLinkActive="border-marca-600 text-marca-700"
            ariaCurrentWhenActive="page"
            class="pestana"
            >Carga masiva</a
          >
        }
      </nav>
      <router-outlet />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Articulos {
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
}
