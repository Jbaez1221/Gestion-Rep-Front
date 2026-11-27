import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Problema } from '../../core/http/problema';

/** Muestra un error de la API con su código de petición, para que el usuario pueda reportarlo. */
@Component({
  selector: 'app-error-api',
  template: `
    @if (problema(); as p) {
      <div role="alert" class="peligro-caja">
        <p class="font-semibold">{{ p.title }}</p>
        @if (p.detail) {
          <p class="mt-1">{{ p.detail }}</p>
        }
        @if (p.requestId) {
          <p class="mt-1 text-xs text-peligro-texto">Código para soporte: {{ p.requestId }}</p>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorApi {
  readonly problema = input<Problema | null>(null);
}
