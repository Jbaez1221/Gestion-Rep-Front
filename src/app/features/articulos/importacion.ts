import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { ResultadoImportacion } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { ArticulosApi, URL_PLANTILLA_ARTICULOS } from './articulos.api';

const TAMANIO_MAXIMO = 5 * 1024 * 1024;

@Component({
  selector: 'app-importacion-articulos',
  imports: [RouterLink, ErrorApi],
  template: `
    <section class="tarjeta space-y-3">
      <h2 class="font-semibold">Carga masiva de artículos</h2>
      <ol class="list-decimal space-y-1 pl-5 text-sm text-slate-700">
        <li>
          Descargue la
          <a [href]="urlPlantilla" class="text-marca-700 underline" download>plantilla Excel</a>:
          trae las instrucciones y listas desplegables con sus categorías, unidades y marcas.
        </li>
        <li>Llénela desde la fila 2 (máximo 5.000 artículos) sin cambiar los encabezados.</li>
        <li>
          Súbala y use <strong>Validar</strong>: verá el resultado de cada fila sin guardar nada.
        </li>
        <li>
          Si no hay errores, use <strong>Importar</strong>. Si una fila falla, no se guarda ninguna.
        </li>
      </ol>
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label for="imp-archivo" class="etiqueta">Archivo (.xlsx, hasta 5 MB)</label>
          <input
            id="imp-archivo"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            class="block text-sm"
            (change)="elegir($event)"
          />
        </div>
        <label class="flex items-center gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            [checked]="actualizar()"
            (change)="actualizar.set(!actualizar())"
          />
          Actualizar los artículos que ya existen (por código)
        </label>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="btn-secundario"
          [disabled]="!archivo() || ocupado()"
          (click)="procesar(false)"
        >
          Validar
        </button>
        <button
          type="button"
          class="btn-primario"
          [disabled]="!archivo() || ocupado() || !validadoSinErrores()"
          (click)="procesar(true)"
        >
          Importar
        </button>
      </div>
      @if (!validadoSinErrores() && archivo()) {
        <p class="text-xs text-slate-500">Valide el archivo sin errores para habilitar Importar.</p>
      }
    </section>

    <app-error-api [problema]="error()" />

    @if (resultado(); as r) {
      <section class="space-y-2" aria-labelledby="titulo-resultado">
        <h2 id="titulo-resultado" class="font-semibold" role="status">
          @if (r.aplicado) {
            Importación aplicada: {{ r.nuevos }} nuevo(s) y {{ r.actualizados }} actualizado(s).
          } @else if (r.errores > 0) {
            {{ r.errores }} fila(s) con errores de {{ r.filas }}: no se guardó nada.
          } @else {
            Validación correcta: {{ r.nuevos }} nuevo(s) y {{ r.actualizados }} a actualizar. Aún no
            se guardó.
          }
        </h2>
        <div class="tarjeta overflow-x-auto p-0 sm:p-0">
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col" class="text-right">Fila</th>
                <th scope="col">Código</th>
                <th scope="col">Descripción</th>
                <th scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (f of filas(); track f.fila) {
                <tr [class.bg-red-50]="f.estado === 'ERROR'">
                  <td class="text-right">{{ f.fila }}</td>
                  <td class="font-mono">{{ f.codigo || '(automático)' }}</td>
                  <td>{{ f.descripcion }}</td>
                  <td>
                    <span [class]="f.estado === 'ERROR' ? 'insignia-alerta' : 'insignia-ok'">{{
                      etiquetas[f.estado]
                    }}</span>
                    @for (m of f.mensajes; track m) {
                      <span class="block text-xs" [class.text-red-700]="f.estado === 'ERROR'">{{
                        m
                      }}</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (r.aplicado) {
          <a routerLink="../lista" class="btn-secundario">Ver artículos</a>
        }
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportacionArticulos {
  private readonly api = inject(ArticulosApi);
  private readonly avisos = inject(NotificacionesService);
  protected readonly urlPlantilla = URL_PLANTILLA_ARTICULOS;
  protected readonly etiquetas = { NUEVO: 'Nuevo', ACTUALIZADO: 'Actualizado', ERROR: 'Error' };

  protected readonly archivo = signal<File | null>(null);
  protected readonly actualizar = signal(false);
  protected readonly resultado = signal<ResultadoImportacion | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly ocupado = signal(false);
  /** Errores primero. */
  protected readonly filas = computed(() =>
    [...(this.resultado()?.detalle ?? [])].sort(
      (a, b) => Number(b.estado === 'ERROR') - Number(a.estado === 'ERROR') || a.fila - b.fila,
    ),
  );
  protected readonly validadoSinErrores = computed(() => {
    const r = this.resultado();
    return r !== null && !r.aplicado && r.errores === 0;
  });

  protected elegir(evento: Event): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    this.resultado.set(null);
    this.error.set(null);
    if (archivo && archivo.size > TAMANIO_MAXIMO) {
      this.error.set({ status: 400, title: 'Archivo muy grande', detail: 'El máximo es 5 MB.' });
      this.archivo.set(null);
      return;
    }
    this.archivo.set(archivo);
  }

  async procesar(aplicar: boolean): Promise<void> {
    const archivo = this.archivo();
    if (!archivo) {
      return;
    }
    this.ocupado.set(true);
    try {
      this.error.set(null);
      const r = await firstValueFrom(this.api.importar(archivo, aplicar, this.actualizar()));
      this.resultado.set(r);
      if (r.aplicado) {
        this.avisos.exito(`Se importaron ${r.nuevos + r.actualizados} artículo(s).`);
        this.archivo.set(null);
      }
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.ocupado.set(false);
    }
  }
}
