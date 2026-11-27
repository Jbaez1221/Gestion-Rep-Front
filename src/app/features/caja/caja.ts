import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';

@Component({
  selector: 'app-caja',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="space-y-4">
      <div>
        <h1 class="titulo-pagina">Caja</h1>
        <p class="mt-1 text-sm text-texto-2">
          Cobro de los pedidos que envían los vendedores: emite la boleta o factura y descarga el
          stock. Apertura, movimientos de efectivo y cierre con arqueo.
        </p>
      </div>
      <nav class="flex flex-wrap gap-1 border-b border-borde" aria-label="Secciones de caja">
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
export class CajaPagina {
  private readonly sesion = inject(SesionService);
  protected readonly pestanas = computed(() => [
    ...(this.sesion.tiene(PERMISOS.cajaOperar) ? [{ ruta: 'operar', texto: 'Mi caja' }] : []),
    { ruta: 'sesiones', texto: 'Sesiones' },
    ...(this.sesion.tieneAlguno(PERMISOS.cajaConfigurar, PERMISOS.facturacionSeries)
      ? [{ ruta: 'configuracion', texto: 'Cajas y series' }]
      : []),
  ]);
}
