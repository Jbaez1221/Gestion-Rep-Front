import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-compras',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="space-y-4">
      <div>
        <h1 class="titulo-pagina">Compras</h1>
        <p class="mt-1 text-sm text-texto-2">
          Comprobantes de proveedores con su ingreso al almacén, órdenes de compra con aprobación y
          tipo de cambio.
        </p>
      </div>
      <nav class="flex flex-wrap gap-1 border-b border-borde" aria-label="Secciones de compras">
        @for (p of pestanas; track p.ruta) {
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
export class Compras {
  protected readonly pestanas = [
    { ruta: 'lista', texto: 'Compras' },
    { ruta: 'ordenes', texto: 'Órdenes de compra' },
    { ruta: 'sugerencia', texto: 'Sugerencia de compra' },
    { ruta: 'recepciones', texto: 'Recepciones con guía' },
    { ruta: 'tipo-cambio', texto: 'Tipo de cambio' },
  ];
}
