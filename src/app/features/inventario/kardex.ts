import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import {
  AlmacenOpcion,
  ArticuloListado,
  Kardex as KardexModelo,
} from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { BuscadorArticulo } from '../articulos/buscador-articulo';
import { hoyEnLima } from '../centros/arbol';
import { TIPOS_MOVIMIENTO, primerDiaDelMes } from './etiquetas';
import { InventarioApi, urlExcel } from './inventario.api';

@Component({
  selector: 'app-kardex',
  imports: [ReactiveFormsModule, DecimalPipe, ErrorApi, BuscadorArticulo],
  templateUrl: './kardex.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Kardex implements OnInit {
  private readonly api = inject(InventarioApi);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly tipos = TIPOS_MOVIMIENTO;

  /** Query params, al llegar desde existencias o desde el artículo. */
  readonly articuloId = input<string>();
  readonly almacenId = input<string>();

  protected readonly almacenes = signal<AlmacenOpcion[]>([]);
  protected readonly articulo = signal<{ id: string; codigo: string; descripcion: string } | null>(
    null,
  );
  protected readonly kardex = signal<KardexModelo | null>(null);
  protected readonly error = signal<Problema | null>(null);

  protected readonly formulario = this.fb.group({
    almacenId: ['', Validators.required],
    desde: [primerDiaDelMes(hoyEnLima()), Validators.required],
    hasta: [hoyEnLima(), Validators.required],
  });

  ngOnInit(): void {
    void this.iniciar();
  }

  private async iniciar(): Promise<void> {
    try {
      this.almacenes.set(await firstValueFrom(this.api.almacenes()));
    } catch (e) {
      this.error.set(aProblema(e));
    }
    const articuloId = this.articuloId();
    const almacenId = this.almacenId();
    if (almacenId) {
      this.formulario.controls.almacenId.setValue(almacenId);
    }
    if (articuloId) {
      this.articulo.set({ id: articuloId, codigo: '', descripcion: '' });
      if (almacenId) {
        await this.consultar();
      }
    }
  }

  protected elegir(a: ArticuloListado): void {
    this.articulo.set(a);
    this.kardex.set(null);
  }

  protected async consultar(): Promise<void> {
    const articulo = this.articulo();
    if (!articulo || this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.error.set({
        status: 400,
        title: 'Datos incompletos',
        detail: 'Elija artículo, almacén y fechas.',
      });
      return;
    }
    const v = this.formulario.getRawValue();
    try {
      this.error.set(null);
      const k = await firstValueFrom(this.api.kardex(articulo.id, v.almacenId, v.desde, v.hasta));
      this.kardex.set(k);
      this.articulo.set(k.articulo);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected excel(k: KardexModelo): string {
    return urlExcel('kardex', {
      articuloId: k.articulo.id,
      almacenId: k.almacen.id,
      desde: k.desde,
      hasta: k.hasta,
    });
  }

  protected imprimir(): void {
    window.print();
  }
}
