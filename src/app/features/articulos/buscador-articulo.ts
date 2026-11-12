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

import { aProblema } from '../../core/http/problema';
import { ArticuloListado } from '../../core/modelos/api.modelos';
import { ArticulosApi } from './articulos.api';

let siguienteId = 0;

/**
 * Busca artículos por código, descripción, número de parte o código de barras y emite el elegido.
 * Lo usan las equivalencias, los movimientos de inventario, el kardex y los conteos.
 */
@Component({
  selector: 'app-buscador-articulo',
  template: `
    <div class="relative">
      <label [for]="idCampo" [class]="etiquetaVisible() ? 'etiqueta' : 'sr-only'">{{
        etiqueta()
      }}</label>
      <input
        [id]="idCampo"
        type="search"
        class="campo"
        autocomplete="off"
        placeholder="Código, descripción, N.° de parte o código de barras"
        [value]="texto()"
        [attr.aria-controls]="idLista"
        [attr.aria-expanded]="resultados().length > 0"
        (input)="escribir($event)"
        (keydown.escape)="cerrar()"
        (keydown.enter)="$event.preventDefault(); elegirPrimero()"
      />
      @if (resultados().length > 0) {
        <ul
          [id]="idLista"
          class="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg"
          [attr.aria-label]="'Resultados de ' + etiqueta()"
        >
          @for (a of resultados(); track a.id) {
            <li>
              <button
                type="button"
                class="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                (click)="elegir(a)"
              >
                <span class="font-mono">{{ a.codigo }}</span> · {{ a.descripcion }}
                <span class="block text-xs text-slate-500">
                  {{ a.numeroParte ?? 'sin N.° de parte' }} · {{ a.marca ?? 'sin marca' }} ·
                  {{ a.unidad }}
                </span>
              </button>
            </li>
          }
        </ul>
      } @else if (sinResultados()) {
        <p class="mt-1 text-xs text-slate-500" role="status">Sin coincidencias.</p>
      }
      @if (error()) {
        <p class="error-campo" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuscadorArticulo implements OnDestroy {
  private readonly api = inject(ArticulosApi);

  readonly etiqueta = input('Buscar artículo');
  readonly etiquetaVisible = input(true);
  /** Solo los que llevan stock (para inventario). */
  readonly soloInventariables = input(false);
  /** Ids que no deben ofrecerse (ya elegidos, o el propio artículo). */
  readonly excluir = input<string[]>([]);
  readonly elegido = output<ArticuloListado>();

  protected readonly idCampo = `buscador-articulo-${siguienteId++}`;
  protected readonly idLista = `${this.idCampo}-lista`;
  protected readonly texto = signal('');
  protected readonly resultados = signal<ArticuloListado[]>([]);
  protected readonly sinResultados = signal(false);
  protected readonly error = signal<string | null>(null);
  private espera: ReturnType<typeof setTimeout> | undefined;

  protected escribir(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.texto.set(valor);
    clearTimeout(this.espera);
    if (valor.trim().length < 2) {
      this.cerrar();
      return;
    }
    this.espera = setTimeout(() => void this.buscar(valor), 300);
  }

  async buscar(valor: string): Promise<void> {
    try {
      this.error.set(null);
      const pagina = await firstValueFrom(
        this.api.listar({ texto: valor, activo: true, tamanio: 10 }),
      );
      const excluidos = new Set(this.excluir());
      const lista = pagina.contenido.filter(
        (a) => !excluidos.has(a.id) && (!this.soloInventariables() || a.tipo === 'INVENTARIABLE'),
      );
      this.resultados.set(lista);
      this.sinResultados.set(lista.length === 0);
    } catch (e) {
      this.error.set(aProblema(e).title);
    }
  }

  protected elegir(a: ArticuloListado): void {
    this.elegido.emit(a);
    this.texto.set('');
    this.cerrar();
  }

  protected elegirPrimero(): void {
    const primero = this.resultados()[0];
    if (primero) {
      this.elegir(primero);
    }
  }

  protected cerrar(): void {
    this.resultados.set([]);
    this.sinResultados.set(false);
  }

  ngOnDestroy(): void {
    clearTimeout(this.espera);
  }
}
