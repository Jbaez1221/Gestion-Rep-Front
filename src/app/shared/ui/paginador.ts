import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Pagina } from '../../core/modelos/api.modelos';

@Component({
  selector: 'app-paginador',
  template: `
    @if (pagina(); as p) {
      <nav
        class="mt-3 flex items-center justify-between text-sm text-slate-600"
        aria-label="Paginación"
      >
        <span
          >{{ p.totalElementos }} registro(s) · página {{ p.pagina + 1 }} de
          {{ p.totalPaginas || 1 }}</span
        >
        <span class="flex gap-2">
          <button
            type="button"
            class="btn-secundario"
            [disabled]="p.pagina === 0"
            (click)="cambiar.emit(p.pagina - 1)"
          >
            Anterior
          </button>
          <button
            type="button"
            class="btn-secundario"
            [disabled]="p.pagina + 1 >= p.totalPaginas"
            (click)="cambiar.emit(p.pagina + 1)"
          >
            Siguiente
          </button>
        </span>
      </nav>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Paginador {
  readonly pagina = input<Pagina<unknown> | null>(null);
  readonly cambiar = output<number>();
}
