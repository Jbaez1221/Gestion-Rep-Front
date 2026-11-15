import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import {
  AfectacionIgv,
  CatalogosSunat,
  Categoria,
  Marca,
  Propiedad,
  TipoArticulo,
  TipoExistencia,
  TipoPropiedad,
  UnidadMedida,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { indentar } from '../centros/arbol';
import { ArticulosApi } from './articulos.api';
import { arbolDeCategorias, etiquetaCategoria } from './categorias';

@Component({
  selector: 'app-catalogos-articulos',
  imports: [ReactiveFormsModule, ErrorApi],
  templateUrl: './catalogos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogosArticulos implements OnInit {
  private readonly api = inject(ArticulosApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly indentar = indentar;
  protected readonly etiquetaCategoria = etiquetaCategoria;

  protected readonly marcas = signal<Marca[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly unidades = signal<UnidadMedida[]>([]);
  protected readonly sunat = signal<CatalogosSunat | null>(null);
  protected readonly propiedades = signal<Propiedad[]>([]);
  protected readonly arbol = computed(() => arbolDeCategorias(this.categorias()));
  protected readonly editandoCategoria = signal<Categoria | 'nueva' | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly puedeEditar = computed(() => this.sesion.tiene(PERMISOS.articulosCatalogos));

  protected readonly nuevaMarca = this.fb.control('', [
    Validators.required,
    Validators.maxLength(80),
  ]);
  protected readonly categoria = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    prefijo: ['', Validators.pattern(/^[A-Za-z]{2,5}$/)],
    padreId: [''],
    tipoDefecto: ['' as TipoArticulo | ''],
    tipoExistenciaDefecto: ['' as TipoExistencia | ''],
    unidadDefectoId: [''],
    afectacionIgvDefecto: ['' as AfectacionIgv | ''],
    codigoProductoSunatDefecto: ['', Validators.pattern(/^\d{8}$/)],
  });
  protected readonly propiedad = this.fb.group({
    clave: ['', [Validators.required, Validators.pattern(/^[a-z][a-z0-9_]{0,39}$/)]],
    etiqueta: ['', [Validators.required, Validators.maxLength(60)]],
    tipo: ['TEXTO' as TipoPropiedad],
    opciones: [''],
    obligatoria: [false],
    orden: [0],
  });
  protected readonly unidad = this.fb.group({
    codigoSunat: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{1,5}$/)]],
    nombre: ['', [Validators.required, Validators.maxLength(60)]],
  });

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      const [marcas, categorias, unidades, sunat] = await Promise.all([
        firstValueFrom(this.api.marcas()),
        firstValueFrom(this.api.categorias()),
        firstValueFrom(this.api.unidades()),
        firstValueFrom(this.api.sunat()),
      ]);
      this.sunat.set(sunat);
      this.marcas.set(marcas);
      this.categorias.set(categorias);
      this.unidades.set(unidades);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async ejecutar(accion: () => Promise<unknown>, mensaje: string): Promise<boolean> {
    try {
      this.error.set(null);
      await accion();
      this.avisos.exito(mensaje);
      await this.cargar();
      return true;
    } catch (e) {
      this.error.set(aProblema(e));
      return false;
    }
  }

  protected async crearMarca(): Promise<void> {
    if (this.nuevaMarca.invalid) {
      this.nuevaMarca.markAsTouched();
      return;
    }
    if (
      await this.ejecutar(
        () => firstValueFrom(this.api.crearMarca(this.nuevaMarca.value)),
        'Marca creada.',
      )
    ) {
      this.nuevaMarca.reset();
    }
  }

  protected async renombrarMarca(m: Marca): Promise<void> {
    const nombre = window.prompt('Nuevo nombre de la marca:', m.nombre);
    if (nombre?.trim() && nombre.trim() !== m.nombre) {
      await this.ejecutar(
        () => firstValueFrom(this.api.renombrarMarca(m.id, nombre.trim())),
        'Marca renombrada.',
      );
    }
  }

  protected async alternarMarca(m: Marca): Promise<void> {
    await this.ejecutar(
      () => firstValueFrom(this.api.estadoMarca(m.id, !m.activo)),
      m.activo ? 'Marca desactivada.' : 'Marca activada.',
    );
  }

  protected editarCategoria(c: Categoria | 'nueva'): void {
    this.editandoCategoria.set(c);
    this.propiedades.set([]);
    this.categoria.reset(
      c === 'nueva'
        ? {
            nombre: '',
            prefijo: '',
            padreId: '',
            tipoDefecto: '',
            tipoExistenciaDefecto: '',
            unidadDefectoId: '',
            afectacionIgvDefecto: '',
            codigoProductoSunatDefecto: '',
          }
        : {
            nombre: c.nombre,
            prefijo: c.prefijo ?? '',
            padreId: c.padreId ?? '',
            tipoDefecto: c.tipoDefecto ?? '',
            tipoExistenciaDefecto: c.tipoExistenciaDefecto ?? '',
            unidadDefectoId: c.unidadDefectoId ?? '',
            afectacionIgvDefecto: c.afectacionIgvDefecto ?? '',
            codigoProductoSunatDefecto: c.codigoProductoSunatDefecto ?? '',
          },
    );
    if (c !== 'nueva') {
      void this.cargarPropiedades(c.id);
    }
  }

  private async cargarPropiedades(categoriaId: string): Promise<void> {
    try {
      this.propiedades.set(await firstValueFrom(this.api.propiedades(categoriaId)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async crearPropiedad(): Promise<void> {
    const actual = this.editandoCategoria();
    if (!actual || actual === 'nueva' || this.propiedad.invalid) {
      this.propiedad.markAllAsTouched();
      return;
    }
    const v = this.propiedad.getRawValue();
    const ok = await this.ejecutar(
      () =>
        firstValueFrom(
          this.api.crearPropiedad(actual.id, {
            clave: v.clave,
            etiqueta: v.etiqueta,
            tipo: v.tipo,
            opciones: v.opciones
              .split(',')
              .map((o) => o.trim())
              .filter((o) => o),
            obligatoria: v.obligatoria,
            orden: Number(v.orden) || 0,
          }),
        ),
      'Propiedad agregada.',
    );
    if (ok) {
      this.propiedad.reset({
        clave: '',
        etiqueta: '',
        tipo: 'TEXTO',
        opciones: '',
        obligatoria: false,
        orden: 0,
      });
      await this.cargarPropiedades(actual.id);
    }
  }

  protected async alternarPropiedad(p: Propiedad): Promise<void> {
    const ok = await this.ejecutar(
      () => firstValueFrom(this.api.estadoPropiedad(p.id, !p.activo)),
      p.activo ? 'Propiedad desactivada.' : 'Propiedad activada.',
    );
    if (ok) {
      await this.cargarPropiedades(p.categoriaId);
    }
  }

  protected async guardarCategoria(): Promise<void> {
    const actual = this.editandoCategoria();
    if (!actual || this.categoria.invalid) {
      this.categoria.markAllAsTouched();
      return;
    }
    const v = this.categoria.getRawValue();
    const datos = {
      nombre: v.nombre,
      prefijo: v.prefijo ? v.prefijo.toUpperCase() : null,
      padreId: v.padreId || null,
      tipoDefecto: v.tipoDefecto || null,
      tipoExistenciaDefecto: v.tipoExistenciaDefecto || null,
      unidadDefectoId: v.unidadDefectoId || null,
      afectacionIgvDefecto: v.afectacionIgvDefecto || null,
      codigoProductoSunatDefecto: v.codigoProductoSunatDefecto || null,
    };
    const ok = await this.ejecutar(
      () =>
        firstValueFrom(
          actual === 'nueva'
            ? this.api.crearCategoria(datos)
            : this.api.actualizarCategoria(actual.id, datos),
        ),
      actual === 'nueva' ? 'Categoría creada.' : 'Categoría actualizada.',
    );
    if (ok) {
      this.editandoCategoria.set(null);
    }
  }

  protected async alternarCategoria(c: Categoria): Promise<void> {
    await this.ejecutar(
      () => firstValueFrom(this.api.estadoCategoria(c.id, !c.activo)),
      c.activo ? 'Categoría desactivada.' : 'Categoría activada.',
    );
  }

  protected async crearUnidad(): Promise<void> {
    if (this.unidad.invalid) {
      this.unidad.markAllAsTouched();
      return;
    }
    const v = this.unidad.getRawValue();
    const ok = await this.ejecutar(
      () =>
        firstValueFrom(
          this.api.crearUnidad({ codigoSunat: v.codigoSunat.toUpperCase(), nombre: v.nombre }),
        ),
      'Unidad creada.',
    );
    if (ok) {
      this.unidad.reset();
    }
  }

  protected async alternarUnidad(u: UnidadMedida): Promise<void> {
    await this.ejecutar(
      () => firstValueFrom(this.api.estadoUnidad(u.id, !u.activo)),
      u.activo ? 'Unidad desactivada.' : 'Unidad activada.',
    );
  }
}
