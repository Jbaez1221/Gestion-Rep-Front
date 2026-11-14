import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros } from '../../core/http/parametros';
import {
  Adjunto,
  Articulo,
  ArticuloActualizar,
  ArticuloCrear,
  ArticuloListado,
  CatalogosSunat,
  Categoria,
  CategoriaGuardar,
  Marca,
  Pagina,
  Propiedad,
  PropiedadGuardar,
  ResultadoImportacion,
  TipoArticulo,
  UnidadMedida,
  ValoresCategoria,
} from '../../core/modelos/api.modelos';

export interface FiltroArticulos {
  texto?: string;
  categoriaId?: string;
  marcaId?: string;
  tipo?: TipoArticulo | '';
  activo?: boolean | null;
  tributarioIncompleto?: boolean;
  pagina?: number;
  tamanio?: number;
}

const CATALOGOS = `${API}/articulos/catalogos`;

/** Descarga directa (mismo origen: la cookie de sesión viaja con el enlace). */
export const URL_PLANTILLA_ARTICULOS = `${API}/articulos/importacion/plantilla`;

export function urlAdjunto(articuloId: string, adjuntoId: string): string {
  return `${API}/articulos/${articuloId}/adjuntos/${adjuntoId}`;
}

@Injectable({ providedIn: 'root' })
export class ArticulosApi {
  private readonly http = inject(HttpClient);

  listar(f: FiltroArticulos): Observable<Pagina<ArticuloListado>> {
    return this.http.get<Pagina<ArticuloListado>>(`${API}/articulos`, {
      params: aParametros({
        texto: f.texto?.trim(),
        categoriaId: f.categoriaId,
        marcaId: f.marcaId,
        tipo: f.tipo,
        activo: f.activo,
        tributarioIncompleto: f.tributarioIncompleto || null,
        pagina: f.pagina,
        tamanio: f.tamanio,
      }),
    });
  }

  obtener(id: string): Observable<Articulo> {
    return this.http.get<Articulo>(`${API}/articulos/${id}`);
  }

  porCodigo(codigo: string): Observable<Articulo> {
    return this.http.get<Articulo>(`${API}/articulos/codigo/${encodeURIComponent(codigo.trim())}`);
  }

  crear(datos: ArticuloCrear): Observable<Articulo> {
    return this.http.post<Articulo>(`${API}/articulos`, datos);
  }

  actualizar(id: string, datos: ArticuloActualizar): Observable<Articulo> {
    return this.http.put<Articulo>(`${API}/articulos/${id}`, datos);
  }

  cambiarEstado(
    id: string,
    estado: { activo: boolean; bloqueadoCompra: boolean; bloqueadoVenta: boolean },
  ): Observable<Articulo> {
    return this.http.patch<Articulo>(`${API}/articulos/${id}/estado`, estado);
  }

  equivalencias(id: string, equivalentes: string[]): Observable<Articulo> {
    return this.http.put<Articulo>(`${API}/articulos/${id}/equivalencias`, { equivalentes });
  }

  sunat(): Observable<CatalogosSunat> {
    return this.http.get<CatalogosSunat>(`${CATALOGOS}/sunat`);
  }

  marcas(): Observable<Marca[]> {
    return this.http.get<Marca[]>(`${CATALOGOS}/marcas`);
  }

  crearMarca(nombre: string): Observable<Marca> {
    return this.http.post<Marca>(`${CATALOGOS}/marcas`, { nombre });
  }

  renombrarMarca(id: string, nombre: string): Observable<Marca> {
    return this.http.put<Marca>(`${CATALOGOS}/marcas/${id}`, { nombre });
  }

  estadoMarca(id: string, activo: boolean): Observable<Marca> {
    return this.http.patch<Marca>(`${CATALOGOS}/marcas/${id}/estado`, { activo });
  }

  categorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${CATALOGOS}/categorias`);
  }

  crearCategoria(datos: CategoriaGuardar): Observable<Categoria> {
    return this.http.post<Categoria>(`${CATALOGOS}/categorias`, datos);
  }

  actualizarCategoria(id: string, datos: CategoriaGuardar): Observable<Categoria> {
    return this.http.put<Categoria>(`${CATALOGOS}/categorias/${id}`, datos);
  }

  estadoCategoria(id: string, activo: boolean): Observable<Categoria> {
    return this.http.patch<Categoria>(`${CATALOGOS}/categorias/${id}/estado`, { activo });
  }

  unidades(): Observable<UnidadMedida[]> {
    return this.http.get<UnidadMedida[]>(`${CATALOGOS}/unidades`);
  }

  crearUnidad(datos: { codigoSunat: string; nombre: string }): Observable<UnidadMedida> {
    return this.http.post<UnidadMedida>(`${CATALOGOS}/unidades`, datos);
  }

  estadoUnidad(id: string, activo: boolean): Observable<UnidadMedida> {
    return this.http.patch<UnidadMedida>(`${CATALOGOS}/unidades/${id}/estado`, { activo });
  }

  valoresCategoria(id: string): Observable<ValoresCategoria> {
    return this.http.get<ValoresCategoria>(`${CATALOGOS}/categorias/${id}/valores`);
  }

  propiedades(categoriaId: string): Observable<Propiedad[]> {
    return this.http.get<Propiedad[]>(`${CATALOGOS}/categorias/${categoriaId}/propiedades`);
  }

  crearPropiedad(categoriaId: string, datos: PropiedadGuardar): Observable<Propiedad> {
    return this.http.post<Propiedad>(`${CATALOGOS}/categorias/${categoriaId}/propiedades`, datos);
  }

  actualizarPropiedad(id: string, datos: PropiedadGuardar): Observable<Propiedad> {
    return this.http.put<Propiedad>(`${CATALOGOS}/propiedades/${id}`, datos);
  }

  estadoPropiedad(id: string, activo: boolean): Observable<Propiedad> {
    return this.http.patch<Propiedad>(`${CATALOGOS}/propiedades/${id}/estado`, { activo });
  }

  adjuntos(articuloId: string): Observable<Adjunto[]> {
    return this.http.get<Adjunto[]>(`${API}/articulos/${articuloId}/adjuntos`);
  }

  subirAdjunto(articuloId: string, archivo: File): Observable<Adjunto> {
    const datos = new FormData();
    datos.append('archivo', archivo, archivo.name);
    return this.http.post<Adjunto>(`${API}/articulos/${articuloId}/adjuntos`, datos);
  }

  adjuntoPrincipal(articuloId: string, adjuntoId: string): Observable<unknown> {
    return this.http.post(`${API}/articulos/${articuloId}/adjuntos/${adjuntoId}/principal`, {});
  }

  eliminarAdjunto(articuloId: string, adjuntoId: string): Observable<unknown> {
    return this.http.delete(`${API}/articulos/${articuloId}/adjuntos/${adjuntoId}`);
  }

  importar(archivo: File, aplicar: boolean, actualizar: boolean): Observable<ResultadoImportacion> {
    const datos = new FormData();
    datos.append('archivo', archivo, archivo.name);
    return this.http.post<ResultadoImportacion>(`${API}/articulos/importacion`, datos, {
      params: aParametros({ aplicar, actualizar }),
    });
  }
}
