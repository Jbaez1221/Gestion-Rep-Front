import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';

@Component({
  selector: 'app-centros',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="space-y-4">
      <div>
        <h1 class="titulo-pagina">Centros de costo y de beneficio</h1>
        <p class="mt-1 text-sm text-slate-600">
          Contabilidad analítica (elemento 9 del PCGE): cuánto gasta cada área y cuánto resultado
          deja cada línea de negocio.
        </p>
      </div>
      <nav class="flex flex-wrap gap-1 border-b border-slate-200" aria-label="Secciones de centros">
        @for (p of pestanas; track p.ruta) {
          <a
            [routerLink]="p.ruta"
            routerLinkActive="border-marca-600 text-marca-700"
            ariaCurrentWhenActive="page"
            class="pestana"
          >
            {{ p.texto }}
          </a>
        }
      </nav>
      <router-outlet />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Centros {
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly pestanas = [
    { ruta: 'costo', texto: 'Centros de costo' },
    { ruta: 'beneficio', texto: 'Centros de beneficio' },
    { ruta: 'presupuesto', texto: 'Presupuesto' },
    { ruta: 'imputaciones', texto: 'Imputaciones' },
    { ruta: 'reportes', texto: 'Reportes' },
    { ruta: 'periodos', texto: 'Períodos' },
  ];
}
