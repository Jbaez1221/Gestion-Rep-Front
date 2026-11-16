import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormRecord,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import {
  Articulo,
  ArticuloListado,
  Categoria,
  ClienteLista,
  ListaPrecios,
  PrecioFijo,
  SocioListado,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { ArticulosApi } from '../articulos/articulos.api';
import { BuscadorArticulo } from '../articulos/buscador-articulo';
import { arbolDeCategorias, etiquetaCategoria } from '../articulos/categorias';
import { BuscadorCliente } from './buscador-cliente';
import { VentasApi } from './ventas.api';

/**
 * Listas de precios por tipo de cliente: margen sobre el costo por categoría (las subcategorías
 * heredan), precios fijos que mandan sobre el margen y la lista de cada cliente.
 */
@Component({
  selector: 'app-listas-precios',
  imports: [ReactiveFormsModule, DecimalPipe, ErrorApi, BuscadorArticulo, BuscadorCliente],
  templateUrl: './listas-precios.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListasPrecios implements OnInit {
  private readonly api = inject(VentasApi);
  private readonly articulosApi = inject(ArticulosApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly etiquetaCategoria = etiquetaCategoria;

  protected readonly listas = signal<ListaPrecios[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly arbol = computed(() =>
    arbolDeCategorias(this.categorias()).filter((n) => n.categoria.activo),
  );
  protected readonly elegida = signal<ListaPrecios | 'nueva' | null>(null);
  protected readonly precios = signal<PrecioFijo[]>([]);
  protected readonly articuloPrecio = signal<Articulo | null>(null);
  protected readonly cliente = signal<SocioListado | null>(null);
  protected readonly listaCliente = signal<ClienteLista | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly puedeEditar = computed(() => this.sesion.tiene(PERMISOS.ventasPrecios));

  protected readonly margenes = new FormRecord<FormControl<number | null>>({});
  protected readonly formulario = this.fb.group({
    codigo: ['', Validators.pattern(/^[A-Za-z0-9_]{2,20}$/)],
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    margenDefecto: [null as number | null, Validators.min(0)],
    descuentoMaximo: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    porDefecto: [false],
    activo: [true],
  });
  protected readonly precio = this.fb.group({
    unidad: [''],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });
  protected readonly listaAsignada = this.fb.control('');

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      const [listas, categorias] = await Promise.all([
        firstValueFrom(this.api.listas()),
        firstValueFrom(this.articulosApi.categorias()),
      ]);
      this.listas.set(listas);
      this.categorias.set(categorias);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected editar(l: ListaPrecios | 'nueva'): void {
    this.elegida.set(l);
    this.articuloPrecio.set(null);
    const nueva = l === 'nueva';
    this.formulario.reset({
      codigo: '',
      nombre: nueva ? '' : l.nombre,
      margenDefecto: nueva ? null : l.margenDefecto,
      descuentoMaximo: nueva ? 0 : l.descuentoMaximo,
      porDefecto: nueva ? false : l.porDefecto,
      activo: nueva ? true : l.activo,
    });
    Object.keys(this.margenes.controls).forEach((k) => this.margenes.removeControl(k));
    this.categorias().forEach((c) =>
      this.margenes.addControl(
        c.id,
        this.fb.control(
          nueva ? null : (l.margenes.find((m) => m.categoriaId === c.id)?.margen ?? null),
          Validators.min(0),
        ),
      ),
    );
    if (!this.puedeEditar()) {
      this.formulario.disable();
      this.margenes.disable();
    }
    this.precios.set([]);
    if (!nueva) void this.cargarPrecios(l.id);
  }

  private async cargarPrecios(listaId: string): Promise<void> {
    try {
      this.precios.set(await firstValueFrom(this.api.precios(listaId)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async guardar(): Promise<void> {
    const actual = this.elegida();
    if (!actual || this.formulario.invalid || this.margenes.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const v = this.formulario.getRawValue();
    const datos = {
      codigo: actual === 'nueva' ? v.codigo.toUpperCase() : null,
      nombre: v.nombre,
      margenDefecto:
        v.margenDefecto === null || String(v.margenDefecto) === '' ? null : Number(v.margenDefecto),
      descuentoMaximo: Number(v.descuentoMaximo),
      porDefecto: v.porDefecto,
      activo: v.activo,
      margenes: Object.entries(this.margenes.getRawValue())
        .filter(([, m]) => m !== null && String(m) !== '')
        .map(([categoriaId, m]) => ({ categoriaId, margen: Number(m) })),
    };
    try {
      this.error.set(null);
      const guardada = await firstValueFrom(
        actual === 'nueva'
          ? this.api.crearLista(datos)
          : this.api.actualizarLista(actual.id, datos),
      );
      this.avisos.exito(`Lista ${guardada.nombre} guardada.`);
      await this.cargar();
      this.editar(this.listas().find((l) => l.id === guardada.id) ?? guardada);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async elegirArticulo(a: ArticuloListado): Promise<void> {
    try {
      const art = await firstValueFrom(this.articulosApi.obtener(a.id));
      this.articuloPrecio.set(art);
      this.precio.reset({ unidad: art.unidadVenta, monto: null });
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected unidades(a: Articulo): string[] {
    return [a.unidadBase.codigoSunat, ...a.unidadesAlternas.map((u) => u.unidadSunat)];
  }

  protected async fijarPrecio(): Promise<void> {
    const lista = this.elegida();
    const art = this.articuloPrecio();
    if (!lista || lista === 'nueva' || !art || this.precio.invalid) {
      this.precio.markAllAsTouched();
      return;
    }
    const v = this.precio.getRawValue();
    try {
      this.error.set(null);
      await firstValueFrom(
        this.api.fijarPrecio(lista.id, art.id, v.unidad || null, Number(v.monto)),
      );
      this.avisos.exito(`Precio de ${art.codigo} guardado.`);
      this.articuloPrecio.set(null);
      await this.cargarPrecios(lista.id);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async quitarPrecio(p: PrecioFijo): Promise<void> {
    const lista = this.elegida();
    if (!lista || lista === 'nueva') return;
    try {
      await firstValueFrom(this.api.quitarPrecio(lista.id, p.id));
      await this.cargarPrecios(lista.id);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async elegirCliente(s: SocioListado): Promise<void> {
    try {
      this.cliente.set(s);
      const actual = await firstValueFrom(this.api.listaDeCliente(s.id));
      this.listaCliente.set(actual);
      this.listaAsignada.setValue(actual.asignada ? actual.lista.id : '');
      if (!this.puedeEditar()) this.listaAsignada.disable();
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async asignar(): Promise<void> {
    const c = this.cliente();
    if (!c) return;
    try {
      this.error.set(null);
      this.listaCliente.set(
        await firstValueFrom(this.api.asignarLista(c.id, this.listaAsignada.value || null)),
      );
      this.avisos.exito(`Lista de ${c.nombre} actualizada.`);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
