import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { Icono } from './icono';

@Component({
  selector: 'app-notificaciones',
  imports: [Icono],
  template: `
    <div
      class="fixed right-4 bottom-4 left-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-96"
      aria-live="polite"
      role="status"
    >
      @for (n of servicio.notificaciones(); track n.id) {
        <div
          class="flex items-start gap-3 rounded-lg border border-borde border-l-4 bg-superficie p-3 text-sm text-texto shadow-lg"
          [class.border-l-exito]="n.tipo === 'exito'"
          [class.border-l-peligro]="n.tipo !== 'exito'"
        >
          <span [class]="n.tipo === 'exito' ? 'text-exito-texto' : 'text-peligro-texto'">
            <app-icono [nombre]="n.tipo === 'exito' ? 'ok' : 'alerta'" />
          </span>
          <span class="flex-1">{{ n.mensaje }}</span>
          <button
            type="button"
            class="-m-1 rounded p-1 text-texto-suave hover:text-texto"
            aria-label="Cerrar aviso"
            (click)="servicio.cerrar(n.id)"
          >
            <app-icono nombre="cerrar" [tamano]="16" />
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
