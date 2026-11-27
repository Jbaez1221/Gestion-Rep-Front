import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

import { PreferenciasService } from './preferencias.service';

export type Tema = 'sistema' | 'claro' | 'oscuro';

const CLAVE = 'tema';

/**
 * Tema claro u oscuro. 'sistema' sigue la preferencia del sistema operativo (la resuelve el CSS);
 * la elección se recuerda en este navegador.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly html = inject(DOCUMENT).documentElement;
  private readonly preferencias = inject(PreferenciasService);
  readonly tema = signal<Tema>(this.leer());

  constructor() {
    effect(() => {
      const t = this.tema();
      this.html.classList.toggle('claro', t === 'claro');
      this.html.classList.toggle('oscuro', t === 'oscuro');
      this.preferencias.guardar(CLAVE, t === 'sistema' ? null : t);
    });
  }

  elegir(tema: Tema): void {
    this.tema.set(tema);
  }

  private leer(): Tema {
    const t = this.preferencias.leer(CLAVE);
    return t === 'claro' || t === 'oscuro' ? t : 'sistema';
  }
}
