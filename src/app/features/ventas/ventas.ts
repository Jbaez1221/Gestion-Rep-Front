import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';

@Component({
  selector: 'app-ventas',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="titulo-pagina">Ventas</h1>
          <p class="mt-1 text-sm text-slate-600">
            Notas de pedido con el precio de la lista de cada cliente. Enviadas a caja reservan el
            stock hasta que se cobran o hasta el cierre del día.
          </p>
        </div>
        @if (sesion.tiene(permisos.ventasPedido)) {
          <a routerLink="/ventas/pedido/nuevo" class="btn-primario">Nuevo pedido</a>
        }
      </div>
      <nav class="flex flex-wrap gap-1 border-b border-slate-200" aria-label="Secciones de ventas">
        @for (p of pestanas; track p.ruta) {
          <a
            [routerLink]="p.ruta"
            routerLinkActive="border-marca-600 text-marca-700"
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
export class Ventas {
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly pestanas = [
    { ruta: 'pedidos', texto: 'Pedidos' },
    { ruta: 'listas', texto: 'Listas de precios' },
  ];
}
