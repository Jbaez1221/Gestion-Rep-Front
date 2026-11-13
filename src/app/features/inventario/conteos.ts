import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import {
  AlmacenOpcion,
  ArticuloListado,
  Conteo,
  ConteoListado,
  EstadoConteo,
  Pagina,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { BuscadorArticulo } from '../articulos/buscador-articulo';
import { ESTADOS_CONTEO } from './etiquetas';
import { InventarioApi } from './inventario.api';

@Component({
  selector: 'app-conteos',
  imports: [ReactiveFormsModule, DecimalPipe, ErrorApi, Paginador, BuscadorArticulo],
  templateUrl: './conteos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Conteos implements OnInit {
  private readonly api = inject(InventarioApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly estados = ESTADOS_CONTEO;

  protected readonly almacenes = signal<AlmacenOpcion[]>([]);
  protected readonly pagina = signal<Pagina<ConteoListado> | null>(null);
  protected readonly conteo = signal<Conteo | null>(null);
  protected readonly creando = signal(false);
  protected readonly seleccion = signal<ArticuloListado[]>([]);
  protected readonly error = signal<Problema | null>(null);
  protected readonly ocupado = signal(false);

  protected readonly filtros = this.fb.group({
    almacenId: [''],
    estado: ['' as EstadoConteo | ''],
  });

  protected readonly nuevo = this.fb.group({
    almacenId: ['', Validators.required],
    glosa: ['', [Validators.required, Validators.maxLength(250)]],
    congelar: [true],
  });

  protected readonly conteoForm = this.fb.array([] as ReturnType<Conteos['lineaForm']>[]);

  ngOnInit(): void {
    void this.iniciar();
  }

  private async iniciar(): Promise<void> {
    try {
      this.almacenes.set(await firstValueFrom(this.api.almacenes()));
    } catch (e) {
      this.error.set(aProblema(e));
    }
    await this.buscar(0);
  }

  private lineaForm(articuloId: string, cantidad: number | null, costo: number | null) {
    return this.fb.group({
      articuloId: [articuloId],
      cantidadContada: [cantidad, Validators.min(0)],
      costoUnitario: [costo, Validators.min(0)],
    });
  }

  protected async buscar(numero = 0): Promise<void> {
    const f = this.filtros.getRawValue();
    try {
      this.error.set(null);
      this.pagina.set(await firstValueFrom(this.api.conteos({ ...f, pagina: numero })));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private mostrar(c: Conteo): void {
    this.conteo.set(c);
    this.conteoForm.clear();
    c.lineas.forEach((l) =>
      this.conteoForm.push(this.lineaForm(l.articulo.id, l.cantidadContada, l.costoUnitario)),
    );
    if (c.estado !== 'ABIERTO' || !this.sesion.tiene(PERMISOS.inventarioContar)) {
      this.conteoForm.disable();
    }
  }

  protected async abrir(id: string): Promise<void> {
    try {
      this.error.set(null);
      this.creando.set(false);
      this.mostrar(await firstValueFrom(this.api.conteo(id)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected iniciarNuevo(): void {
    this.creando.set(true);
    this.conteo.set(null);
    this.seleccion.set([]);
    this.nuevo.reset({
      almacenId: this.almacenes().length === 1 ? (this.almacenes()[0]?.id ?? '') : '',
      glosa: '',
      congelar: true,
    });
  }

  protected agregarArticulo(a: ArticuloListado): void {
    this.seleccion.update((l) => [...l, a]);
  }

  protected quitarArticulo(id: string): void {
    this.seleccion.update((l) => l.filter((a) => a.id !== id));
  }

  protected idsSeleccion(): string[] {
    return this.seleccion().map((a) => a.id);
  }

  protected async crear(): Promise<void> {
    if (this.nuevo.invalid) {
      this.nuevo.markAllAsTouched();
      return;
    }
    const v = this.nuevo.getRawValue();
    try {
      this.error.set(null);
      const c = await firstValueFrom(
        this.api.abrirConteo({
          almacenId: v.almacenId,
          glosa: v.glosa,
          articuloIds: this.idsSeleccion(),
          congelar: v.congelar,
        }),
      );
      this.avisos.exito(`Conteo ${c.numero} abierto con ${c.lineas.length} artículo(s).`);
      this.creando.set(false);
      this.mostrar(c);
      await this.buscar(0);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async guardarConteo(): Promise<void> {
    const c = this.conteo();
    if (!c || this.conteoForm.invalid) {
      return;
    }
    const lineas = this.conteoForm.getRawValue().map((l) => ({
      articuloId: l.articuloId,
      cantidadContada: vacioANull(l.cantidadContada),
      costoUnitario: vacioANull(l.costoUnitario),
    }));
    try {
      this.ocupado.set(true);
      this.error.set(null);
      this.mostrar(await firstValueFrom(this.api.registrarConteo(c.id, lineas)));
      this.avisos.exito('Conteo guardado.');
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async aplicar(): Promise<void> {
    const c = this.conteo();
    if (
      !c ||
      !window.confirm(
        `¿Aplicar el conteo ${c.numero}? Se ajustará el stock a lo contado (contra el stock de este momento) y no se podrá deshacer salvo anulando los ajustes.`,
      )
    ) {
      return;
    }
    try {
      this.ocupado.set(true);
      this.error.set(null);
      this.mostrar(await firstValueFrom(this.api.aplicarConteo(c.id)));
      this.avisos.exito(`Conteo ${c.numero} aplicado.`);
      await this.buscar(0);
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async anular(): Promise<void> {
    const c = this.conteo();
    if (!c || !window.confirm(`¿Anular el conteo ${c.numero}? No se ajustará nada.`)) {
      return;
    }
    try {
      this.error.set(null);
      this.mostrar(await firstValueFrom(this.api.anularConteo(c.id)));
      this.avisos.exito(`Conteo ${c.numero} anulado.`);
      await this.buscar(0);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}

function vacioANull(valor: number | null): number | null {
  return valor === null || String(valor) === '' ? null : Number(valor);
}
