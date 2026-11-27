import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/** Mes actual en Lima (AAAA-MM). */
export function mesEnLima(ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(ahora).slice(0, 7);
}

/**
 * Descarga en Excel un registro tributario mensual (ventas 14.1, compras 8.1): elige el mes y arma
 * el enlace {@link url} con anio y mes.
 */
@Component({
  selector: 'app-descarga-registro',
  template: `
    <div class="flex flex-wrap items-end gap-2">
      <div>
        <label [for]="id() + '-mes'" class="etiqueta">{{ etiqueta() }}</label>
        <input
          [id]="id() + '-mes'"
          type="month"
          class="campo w-40"
          [value]="mes()"
          (change)="elegir($event)"
        />
      </div>
      <a class="btn-secundario" [class.pointer-events-none]="!url()" [href]="url()" download>
        Descargar Excel
      </a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DescargaRegistro {
  readonly id = input.required<string>();
  readonly etiqueta = input.required<string>();
  /** Ruta del Excel sin parámetros. */
  readonly ruta = input.required<string>();
  protected readonly mes = signal(mesEnLima());
  protected readonly url = computed(() => {
    const [anio, mes] = this.mes().split('-');
    return anio && mes ? `${this.ruta()}?anio=${anio}&mes=${Number(mes)}` : '';
  });

  protected elegir(evento: Event): void {
    this.mes.set((evento.target as HTMLInputElement).value);
  }
}
