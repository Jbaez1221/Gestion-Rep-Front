import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { AlmacenOpcion, Existencia, Pagina } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { InventarioApi, urlExcel } from './inventario.api';

@Component({
  selector: 'app-existencias',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, ErrorApi, Paginador],
  templateUrl: './existencias.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Existencias implements OnInit {
  private readonly api = inject(InventarioApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;

  protected readonly almacenes = signal<AlmacenOpcion[]>([]);
  protected readonly pagina = signal<Pagina<Existencia> | null>(null);
  protected readonly editando = signal<Existencia | null>(null);
  protected readonly error = signal<Problema | null>(null);

  protected readonly filtros = this.fb.group({
    almacenId: [''],
    texto: [''],
    soloConStock: [true],
    bajoReposicion: [false],
  });

  protected readonly parametros = this.fb.group({
    minimo: [null as number | null, Validators.min(0)],
    puntoReorden: [null as number | null, Validators.min(0)],
    maximo: [null as number | null, Validators.min(0)],
    ubicacion: ['', Validators.maxLength(30)],
  });

  ngOnInit(): void {
    void this.iniciar();
  }

  protected excel(): string {
    const f = this.filtros.getRawValue();
    return urlExcel('existencias', {
      almacenId: f.almacenId,
      texto: f.texto.trim(),
      soloConStock: f.soloConStock || null,
      bajoReposicion: f.bajoReposicion || null,
    });
  }

  private async iniciar(): Promise<void> {
    try {
      this.almacenes.set(await firstValueFrom(this.api.almacenes()));
    } catch (e) {
      this.error.set(aProblema(e));
    }
    await this.buscar(0);
  }

  protected async buscar(numero = 0): Promise<void> {
    const f = this.filtros.getRawValue();
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(
          this.api.existencias({
            almacenId: f.almacenId,
            texto: f.texto,
            soloConStock: f.soloConStock,
            bajoReposicion: f.bajoReposicion,
            pagina: numero,
          }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected editar(e: Existencia): void {
    this.editando.set(e);
    this.parametros.reset({
      minimo: e.minimo,
      puntoReorden: e.puntoReorden,
      maximo: e.maximo,
      ubicacion: e.ubicacion ?? '',
    });
  }

  protected async guardarParametros(): Promise<void> {
    const e = this.editando();
    if (!e || this.parametros.invalid) {
      return;
    }
    const v = this.parametros.getRawValue();
    try {
      this.error.set(null);
      await firstValueFrom(
        this.api.parametros({
          articuloId: e.articulo.id,
          almacenId: e.almacen.id,
          minimo: v.minimo ?? null,
          puntoReorden: v.puntoReorden ?? null,
          maximo: v.maximo ?? null,
          ubicacion: v.ubicacion || null,
        }),
      );
      this.avisos.exito(`Parámetros de ${e.articulo.codigo} guardados.`);
      this.editando.set(null);
      await this.buscar(this.pagina()?.pagina ?? 0);
    } catch (err) {
      this.error.set(aProblema(err));
    }
  }
}
