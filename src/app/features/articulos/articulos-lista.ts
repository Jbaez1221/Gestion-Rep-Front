import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import {
  ArticuloListado,
  Categoria,
  Marca,
  Pagina,
  TipoArticulo,
} from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { ArticulosApi } from './articulos.api';
import { arbolDeCategorias, etiquetaCategoria } from './categorias';

export const TIPOS_ARTICULO: Record<TipoArticulo, string> = {
  INVENTARIABLE: 'Inventariable',
  SERVICIO: 'Servicio',
  NO_INVENTARIABLE: 'No inventariable',
};

@Component({
  selector: 'app-articulos-lista',
  imports: [ReactiveFormsModule, RouterLink, ErrorApi, Paginador],
  templateUrl: './articulos-lista.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticulosLista implements OnInit {
  private readonly api = inject(ArticulosApi);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly tipos = TIPOS_ARTICULO;
  protected readonly etiquetaCategoria = etiquetaCategoria;

  protected readonly pagina = signal<Pagina<ArticuloListado> | null>(null);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly marcas = signal<Marca[]>([]);
  protected readonly arbol = computed(() => arbolDeCategorias(this.categorias()));
  protected readonly error = signal<Problema | null>(null);

  protected readonly filtros = this.fb.group({
    texto: [''],
    categoriaId: [''],
    marcaId: [''],
    tipo: ['' as TipoArticulo | ''],
    estado: ['activos' as 'activos' | 'inactivos' | 'todos'],
  });

  ngOnInit(): void {
    void this.buscar(0);
    void this.cargarCatalogos();
  }

  private async cargarCatalogos(): Promise<void> {
    try {
      const [categorias, marcas] = await Promise.all([
        firstValueFrom(this.api.categorias()),
        firstValueFrom(this.api.marcas()),
      ]);
      this.categorias.set(categorias);
      this.marcas.set(marcas);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async buscar(numero = 0): Promise<void> {
    const f = this.filtros.getRawValue();
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(
          this.api.listar({
            texto: f.texto,
            categoriaId: f.categoriaId,
            marcaId: f.marcaId,
            tipo: f.tipo,
            activo: f.estado === 'todos' ? null : f.estado === 'activos',
            pagina: numero,
          }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
