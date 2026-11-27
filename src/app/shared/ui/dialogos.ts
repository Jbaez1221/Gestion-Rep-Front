import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface DatosDialogo {
  readonly titulo: string;
  readonly mensaje?: string;
  readonly aceptar: string;
  readonly peligro: boolean;
  /** Si está, el diálogo pide un texto con esta etiqueta. */
  readonly etiqueta?: string;
  readonly valor?: string;
  readonly maximo: number;
}

/**
 * Diálogo modal propio (reemplaza window.confirm y window.prompt): respeta el tema, atrapa el foco,
 * se cierra con Esc y tiene controles cómodos en pantallas táctiles.
 */
@Component({
  selector: 'app-dialogo',
  template: `
    <form
      class="w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-borde bg-superficie p-5 shadow-xl"
      (submit)="aceptar($event)"
      novalidate
    >
      <h2 id="dialogo-titulo" class="text-base font-semibold text-texto">{{ datos.titulo }}</h2>
      @if (datos.mensaje) {
        <p class="mt-2 text-sm text-texto-2">{{ datos.mensaje }}</p>
      }
      @if (datos.etiqueta) {
        <label for="dialogo-texto" class="etiqueta mt-4">{{ datos.etiqueta }}</label>
        <textarea
          id="dialogo-texto"
          class="campo"
          rows="3"
          [attr.maxlength]="datos.maximo"
          [value]="texto()"
          [attr.aria-invalid]="falta()"
          (input)="escribir($event)"
          cdkFocusInitial
        ></textarea>
        @if (falta()) {
          <p class="error-campo">Escriba el motivo.</p>
        }
      }
      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" class="btn-secundario" (click)="ref.close(null)">Cancelar</button>
        <button type="submit" [class]="datos.peligro ? 'btn-peligro' : 'btn-primario'">
          {{ datos.aceptar }}
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoComponent {
  protected readonly datos = inject<DatosDialogo>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string | boolean | null>>(DialogRef);
  protected readonly texto = signal(this.datos.valor ?? '');
  protected readonly falta = signal(false);

  protected escribir(evento: Event): void {
    this.texto.set((evento.target as HTMLTextAreaElement).value);
    this.falta.set(false);
  }

  protected aceptar(evento: Event): void {
    evento.preventDefault();
    if (!this.datos.etiqueta) {
      this.ref.close(true);
      return;
    }
    const valor = this.texto().trim();
    if (!valor) {
      this.falta.set(true);
      return;
    }
    this.ref.close(valor);
  }
}

@Injectable({ providedIn: 'root' })
export class DialogosService {
  private readonly dialog = inject(Dialog);

  /** true si el usuario confirma. */
  async confirmar(opciones: {
    titulo: string;
    mensaje?: string;
    aceptar?: string;
    peligro?: boolean;
  }): Promise<boolean> {
    const r = await this.abrir({
      titulo: opciones.titulo,
      mensaje: opciones.mensaje,
      aceptar: opciones.aceptar ?? 'Aceptar',
      peligro: opciones.peligro ?? false,
      maximo: 0,
    });
    return r === true;
  }

  /** El texto escrito (sin espacios de más), o null si el usuario cancela. */
  async pedirTexto(opciones: {
    titulo: string;
    mensaje?: string;
    etiqueta?: string;
    valor?: string;
    aceptar?: string;
    peligro?: boolean;
    maximo?: number;
  }): Promise<string | null> {
    const r = await this.abrir({
      titulo: opciones.titulo,
      mensaje: opciones.mensaje,
      etiqueta: opciones.etiqueta ?? 'Motivo',
      valor: opciones.valor,
      aceptar: opciones.aceptar ?? 'Aceptar',
      peligro: opciones.peligro ?? false,
      maximo: opciones.maximo ?? 250,
    });
    return typeof r === 'string' ? r : null;
  }

  private async abrir(datos: DatosDialogo): Promise<string | boolean | null | undefined> {
    const ref = this.dialog.open<string | boolean | null, DatosDialogo>(DialogoComponent, {
      data: datos,
      ariaLabelledBy: 'dialogo-titulo',
      backdropClass: 'fondo-dialogo',
      autoFocus: datos.etiqueta ? 'first-tabbable' : 'dialog',
      restoreFocus: true,
    });
    return firstValueFrom(ref.closed);
  }
}
