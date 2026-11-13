import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import {
  AlmacenOpcion,
  ArticuloListado,
  Lote,
  Pagina,
  Serie,
  TrazabilidadSerie,
} from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { BuscadorArticulo } from '../articulos/buscador-articulo';
import { hoyEnLima } from '../centros/arbol';
import { TIPOS_MOVIMIENTO } from './etiquetas';
import { InventarioApi, urlExcel } from './inventario.api';

/** Días desde hoy (Lima) para el filtro rápido de vencimiento. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-lotes-series',
  imports: [ReactiveFormsModule, DecimalPipe, ErrorApi, Paginador, BuscadorArticulo],
  templateUrl: './lotes-series.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LotesSeries implements OnInit {
  private readonly api = inject(InventarioApi);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly tipos = TIPOS_MOVIMIENTO;

  protected readonly almacenes = signal<AlmacenOpcion[]>([]);
  protected readonly lotes = signal<Pagina<Lote> | null>(null);
  protected readonly series = signal<Serie[] | null>(null);
  protected readonly traza = signal<TrazabilidadSerie | null>(null);
  protected readonly articuloSerie = signal<ArticuloListado | null>(null);
  protected readonly error = signal<Problema | null>(null);

  protected readonly filtros = this.fb.group({
    almacenId: [''],
    dias: ['90'],
  });
  protected readonly numero = this.fb.control('');

  ngOnInit(): void {
    void this.iniciar();
  }

  private async iniciar(): Promise<void> {
    try {
      this.almacenes.set(await firstValueFrom(this.api.almacenes()));
    } catch (e) {
      this.error.set(aProblema(e));
    }
    await this.buscarLotes(0);
  }

  private venceAntesDe(): string | undefined {
    const dias = this.filtros.getRawValue().dias;
    return dias ? sumarDias(hoyEnLima(), Number(dias)) : undefined;
  }

  protected async buscarLotes(numero = 0): Promise<void> {
    try {
      this.error.set(null);
      this.lotes.set(
        await firstValueFrom(
          this.api.lotes({
            almacenId: this.filtros.getRawValue().almacenId || undefined,
            venceAntesDe: this.venceAntesDe(),
            pagina: numero,
          }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected excel(): string {
    return urlExcel('lotes', {
      almacenId: this.filtros.getRawValue().almacenId,
      venceAntesDe: this.venceAntesDe(),
    });
  }

  protected elegirArticulo(a: ArticuloListado): void {
    this.articuloSerie.set(a);
    void this.buscarSeries();
  }

  protected async buscarSeries(): Promise<void> {
    const articulo = this.articuloSerie();
    const numero = this.numero.value.trim();
    if (!articulo && !numero) {
      return;
    }
    try {
      this.error.set(null);
      this.traza.set(null);
      this.series.set(
        await firstValueFrom(
          this.api.series({ articuloId: articulo?.id, numero: numero || undefined }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async verHistoria(s: Serie): Promise<void> {
    try {
      this.error.set(null);
      this.traza.set(await firstValueFrom(this.api.trazabilidad(s.articulo.id, s.numero)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
