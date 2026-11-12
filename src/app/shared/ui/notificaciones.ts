import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NotificacionesService } from '../../core/ui/notificaciones.service';

@Component({
  selector: 'app-notificaciones',
  template: `
    <div
      class="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2"
      aria-live="polite"
      role="status"
    >
      @for (n of servicio.notificaciones(); track n.id) {
        <div
          class="flex items-start justify-between gap-3 rounded-md p-3 text-sm shadow-lg"
          [class]="n.tipo === 'exito' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'"
        >
          <span>{{ n.mensaje }}</span>
          <button
            type="button"
            class="font-bold"
            aria-label="Cerrar aviso"
            (click)="servicio.cerrar(n.id)"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notificaciones {
  protected readonly servicio = inject(NotificacionesService);
}
