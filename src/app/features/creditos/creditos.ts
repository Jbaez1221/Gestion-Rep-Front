import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';

/** Créditos: lo que deben los clientes y lo que se debe a los proveedores. */
@Component({
  selector: 'app-creditos',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="space-y-4">
      <h1 class="titulo-pagina">Créditos</h1>
      <nav class="flex flex-wrap gap-1 border-b border-borde" aria-label="Secciones de créditos">
        @for (p of pestanas(); track p.ruta) {
          <a
            [routerLink]="p.ruta"
            routerLinkActive="border-acento text-texto-acento"
            ariaCurrentWhenActive="page"
            class="pestana"
            >{{ p.texto }}</a
          >
        }
      </nav>
      <router-outlet />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditosPagina {
  private readonly sesion = inject(SesionService);
  protected readonly pestanas = computed(() => [
    ...(this.sesion.tiene(PERMISOS.creditosLeer) ? [{ ruta: 'cobrar', texto: 'Por cobrar' }] : []),
    ...(this.sesion.tiene(PERMISOS.creditosPagarLeer)
      ? [{ ruta: 'pagar', texto: 'Por pagar' }]
      : []),
  ]);
}
