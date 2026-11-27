import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { SocioListado } from '../../core/modelos/api.modelos';
import { SociosApi } from '../socios/socios.api';

let siguienteId = 0;

/** Busca clientes activos por nombre o documento y emite el elegido. */
@Component({
  selector: 'app-buscador-cliente',
  template: `
    <div class="relative">
      <label [for]="idCampo" class="etiqueta">{{ etiqueta() }}</label>
      <input
        [id]="idCampo"
        type="search"
        class="campo"
        autocomplete="off"
        placeholder="Nombre, DNI o RUC"
        [value]="texto()"
        (input)="escribir($event)"
        (keydown.escape)="resultados.set([])"
        (keydown.enter)="$event.preventDefault(); elegirPrimero()"
      />
      @if (resultados().length > 0) {
        <ul
          class="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-borde bg-superficie shadow-lg"
          aria-label="Clientes encontrados"
        >
          @for (s of resultados(); track s.id) {
            <li>
              <button
                type="button"
                class="block w-full px-3 py-2 text-left text-sm hover:bg-superficie-3"
                (click)="elegir(s)"
              >
                <span class="font-mono">{{ s.numeroDocumento }}</span> · {{ s.nombre }}
                @if (s.condicionSunat && s.condicionSunat !== 'HABIDO') {
                  <span class="insignia-alerta ml-1">{{ s.condicionSunat }}</span>
                }
              </button>
            </li>
          }
        </ul>
      }
      @if (sinResultados()) {
        <p class="mt-1 text-xs text-texto-suave">No hay clientes con ese nombre o documento.</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuscadorCliente implements OnDestroy {
  private readonly api = inject(SociosApi);
  readonly etiqueta = input('Cliente');
  readonly elegido = output<SocioListado>();

  protected readonly idCampo = `buscador-cliente-${siguienteId++}`;
  protected readonly texto = signal('');
  protected readonly resultados = signal<SocioListado[]>([]);
  protected readonly sinResultados = signal(false);
  private espera: ReturnType<typeof setTimeout> | undefined;

  protected escribir(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.texto.set(texto);
    clearTimeout(this.espera);
    if (texto.trim().length < 2) {
      this.resultados.set([]);
      this.sinResultados.set(false);
      return;
    }
    this.espera = setTimeout(() => void this.buscar(texto), 250);
  }

  private async buscar(texto: string): Promise<void> {
    try {
      const pagina = await firstValueFrom(
        this.api.listar({ texto, rol: 'CLIENTE', activo: true, pagina: 0 }),
      );
      this.resultados.set(pagina.contenido.filter((s) => !s.bloqueado));
      this.sinResultados.set(this.resultados().length === 0);
    } catch {
      this.resultados.set([]);
    }
  }

  protected elegirPrimero(): void {
    const primero = this.resultados()[0];
    if (primero) this.elegir(primero);
  }

  protected elegir(s: SocioListado): void {
    this.elegido.emit(s);
    this.texto.set('');
    this.resultados.set([]);
    this.sinResultados.set(false);
  }

  ngOnDestroy(): void {
    clearTimeout(this.espera);
  }
}
