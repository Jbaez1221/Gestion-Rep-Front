import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-inventario',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="space-y-4">
      <div>
        <h1 class="titulo-pagina">Inventario</h1>
        <p class="mt-1 text-sm text-slate-600">
          Stock por almacén al costo promedio ponderado, movimientos con la tabla 12 de SUNAT y
          kardex valorizado (formato 13.1).
        </p>
      </div>
      <nav
        class="flex flex-wrap gap-1 border-b border-slate-200"
        aria-label="Secciones de inventario"
      >
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
export class Inventario {
  protected readonly pestanas = [
    { ruta: 'existencias', texto: 'Existencias' },
    { ruta: 'movimientos', texto: 'Movimientos' },
    { ruta: 'traslados', texto: 'Traslados' },
    { ruta: 'kardex', texto: 'Kardex' },
    { ruta: 'lotes-series', texto: 'Lotes y series' },
    { ruta: 'conteos', texto: 'Conteos físicos' },
    { ruta: 'resumen', texto: 'Resumen' },
    { ruta: 'valorizacion', texto: 'Valorización' },
  ];
}
