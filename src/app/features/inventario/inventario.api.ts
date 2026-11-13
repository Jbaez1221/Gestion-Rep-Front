import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros } from '../../core/http/parametros';
import {
  AlmacenOpcion,
  EnvioTraslado,
  EstadoTraslado,
  Lote,
  RecepcionTraslado,
  Resumen,
  RevalorizacionNueva,
  Serie,
  SolicitudTraslado,
  Traslado,
  TrasladoListado,
  TrazabilidadSerie,
  Conteo,
  ConteoListado,
  EstadoConteo,
  Existencia,
  Kardex,
  LineaContada,
  Movimiento,
  MovimientoListado,
  MovimientoNuevo,
  Pagina,
  ParametrosExistencia,
  TipoMovimiento,
  TransferenciaNueva,
  Valorizacion,
} from '../../core/modelos/api.modelos';

export interface FiltroExistencias {
  almacenId?: string;
  articuloId?: string;
  texto?: string;
  soloConStock?: boolean;
  bajoReposicion?: boolean;
  pagina?: number;
}

export interface FiltroMovimientos {
  almacenId?: string;
  tipo?: TipoMovimiento | '';
  articuloId?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
}

const BASE = `${API}/inventario`;

/** Enlaces de descarga a Excel con los mismos filtros de la pantalla (la cookie viaja con el enlace). */
export function urlExcel(
  recurso: 'existencias' | 'kardex' | 'resumen' | 'lotes',
  filtros: Record<string, string | boolean | null | undefined>,
): string {
  const params = aParametros(filtros).toString();
  return `${BASE}/${recurso}/excel${params ? '?' + params : ''}`;
}

@Injectable({ providedIn: 'root' })
export class InventarioApi {
  private readonly http = inject(HttpClient);

  almacenes(): Observable<AlmacenOpcion[]> {
    return this.http.get<AlmacenOpcion[]>(`${BASE}/almacenes`);
  }

  destinos(): Observable<AlmacenOpcion[]> {
    return this.http.get<AlmacenOpcion[]>(`${BASE}/almacenes/destinos`);
  }

  existencias(f: FiltroExistencias): Observable<Pagina<Existencia>> {
    return this.http.get<Pagina<Existencia>>(`${BASE}/existencias`, {
      params: aParametros({
        almacenId: f.almacenId,
        articuloId: f.articuloId,
        texto: f.texto?.trim(),
        soloConStock: f.soloConStock || null,
        bajoReposicion: f.bajoReposicion || null,
        pagina: f.pagina,
      }),
    });
  }

  existenciasDeArticulo(articuloId: string): Observable<Existencia[]> {
    return this.http.get<Existencia[]>(`${BASE}/existencias/articulo/${articuloId}`);
  }

  parametros(datos: ParametrosExistencia): Observable<Existencia> {
    return this.http.put<Existencia>(`${BASE}/existencias/parametros`, datos);
  }

  valorizacion(almacenId?: string): Observable<Valorizacion> {
    return this.http.get<Valorizacion>(`${BASE}/valorizacion`, {
      params: aParametros({ almacenId }),
    });
  }

  movimientos(f: FiltroMovimientos): Observable<Pagina<MovimientoListado>> {
    return this.http.get<Pagina<MovimientoListado>>(`${BASE}/movimientos`, {
      params: aParametros({
        almacenId: f.almacenId,
        tipo: f.tipo,
        articuloId: f.articuloId,
        desde: f.desde,
        hasta: f.hasta,
        pagina: f.pagina,
      }),
    });
  }

  movimiento(id: string): Observable<Movimiento> {
    return this.http.get<Movimiento>(`${BASE}/movimientos/${id}`);
  }

  registrar(datos: MovimientoNuevo): Observable<Movimiento> {
    return this.http.post<Movimiento>(`${BASE}/movimientos`, datos);
  }

  anular(id: string, glosa: string): Observable<Movimiento> {
    return this.http.post<Movimiento>(`${BASE}/movimientos/${id}/anular`, { glosa });
  }

  transferir(datos: TransferenciaNueva): Observable<{ salida: Movimiento; entrada: Movimiento }> {
    return this.http.post<{ salida: Movimiento; entrada: Movimiento }>(
      `${BASE}/transferencias`,
      datos,
    );
  }

  kardex(articuloId: string, almacenId: string, desde: string, hasta: string): Observable<Kardex> {
    return this.http.get<Kardex>(`${BASE}/kardex`, {
      params: aParametros({ articuloId, almacenId, desde, hasta }),
    });
  }

  conteos(f: {
    almacenId?: string;
    estado?: EstadoConteo | '';
    pagina?: number;
  }): Observable<Pagina<ConteoListado>> {
    return this.http.get<Pagina<ConteoListado>>(`${BASE}/conteos`, {
      params: aParametros({ almacenId: f.almacenId, estado: f.estado, pagina: f.pagina }),
    });
  }

  conteo(id: string): Observable<Conteo> {
    return this.http.get<Conteo>(`${BASE}/conteos/${id}`);
  }

  abrirConteo(datos: {
    almacenId: string;
    glosa: string;
    articuloIds: string[];
    congelar: boolean;
  }): Observable<Conteo> {
    return this.http.post<Conteo>(`${BASE}/conteos`, datos);
  }

  registrarConteo(id: string, lineas: LineaContada[]): Observable<Conteo> {
    return this.http.put<Conteo>(`${BASE}/conteos/${id}/lineas`, { lineas });
  }

  aplicarConteo(id: string): Observable<Conteo> {
    return this.http.post<Conteo>(`${BASE}/conteos/${id}/aplicar`, {});
  }

  anularConteo(id: string): Observable<Conteo> {
    return this.http.post<Conteo>(`${BASE}/conteos/${id}/anular`, {});
  }

  revalorizar(datos: RevalorizacionNueva): Observable<Movimiento> {
    return this.http.post<Movimiento>(`${BASE}/revalorizaciones`, datos);
  }

  lotes(f: {
    almacenId?: string;
    articuloId?: string;
    venceAntesDe?: string;
    pagina?: number;
  }): Observable<Pagina<Lote>> {
    return this.http.get<Pagina<Lote>>(`${BASE}/lotes`, {
      params: aParametros({ ...f }),
    });
  }

  series(f: { articuloId?: string; numero?: string; almacenId?: string }): Observable<Serie[]> {
    return this.http.get<Serie[]>(`${BASE}/series`, { params: aParametros({ ...f }) });
  }

  trazabilidad(articuloId: string, numero: string): Observable<TrazabilidadSerie> {
    return this.http.get<TrazabilidadSerie>(`${BASE}/series/trazabilidad`, {
      params: aParametros({ articuloId, numero }),
    });
  }

  resumen(almacenId: string, desde: string, hasta: string): Observable<Resumen> {
    return this.http.get<Resumen>(`${BASE}/resumen`, {
      params: aParametros({ almacenId, desde, hasta }),
    });
  }

  traslados(f: {
    almacenId?: string;
    estado?: EstadoTraslado | '';
    pagina?: number;
  }): Observable<Pagina<TrasladoListado>> {
    return this.http.get<Pagina<TrasladoListado>>(`${BASE}/traslados`, {
      params: aParametros({ ...f }),
    });
  }

  traslado(id: string): Observable<Traslado> {
    return this.http.get<Traslado>(`${BASE}/traslados/${id}`);
  }

  solicitarTraslado(datos: SolicitudTraslado): Observable<Traslado> {
    return this.http.post<Traslado>(`${BASE}/traslados`, datos);
  }

  enviarTraslado(id: string, datos: EnvioTraslado): Observable<Traslado> {
    return this.http.post<Traslado>(`${BASE}/traslados/${id}/enviar`, datos);
  }

  recibirTraslado(id: string, datos: RecepcionTraslado): Observable<Traslado> {
    return this.http.post<Traslado>(`${BASE}/traslados/${id}/recibir`, datos);
  }

  anularTraslado(id: string): Observable<Traslado> {
    return this.http.post<Traslado>(`${BASE}/traslados/${id}/anular`, {});
  }
}
