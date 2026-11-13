import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros } from '../../core/http/parametros';
import {
  Centro,
  CentroGuardar,
  EstadoPorFuncion,
  FilaCostos,
  FilaResultado,
  FuncionPcge,
  Imputacion,
  ImputacionNueva,
  LineaPresupuesto,
  Pagina,
  Periodo,
  TipoCentro,
  TipoImputacion,
} from '../../core/modelos/api.modelos';

export interface FiltroImputaciones {
  anio?: number | null;
  mes?: number | null;
  tipo?: TipoImputacion | '';
  pagina?: number;
}

const RUTA: Record<TipoCentro, string> = { COSTO: 'costo', BENEFICIO: 'beneficio' };

@Injectable({ providedIn: 'root' })
export class CentrosApi {
  private readonly http = inject(HttpClient);

  funciones(): Observable<FuncionPcge[]> {
    return this.http.get<FuncionPcge[]>(`${API}/centros/funciones`);
  }

  listar(tipo: TipoCentro): Observable<Centro[]> {
    return this.http.get<Centro[]>(`${API}/centros/${RUTA[tipo]}`);
  }

  crear(tipo: TipoCentro, datos: CentroGuardar): Observable<Centro> {
    return this.http.post<Centro>(`${API}/centros/${RUTA[tipo]}`, datos);
  }

  actualizar(tipo: TipoCentro, id: string, datos: CentroGuardar): Observable<Centro> {
    return this.http.put<Centro>(`${API}/centros/${RUTA[tipo]}/${id}`, datos);
  }

  cambiarEstado(tipo: TipoCentro, id: string, activo: boolean): Observable<Centro> {
    return this.http.patch<Centro>(`${API}/centros/${RUTA[tipo]}/${id}/estado`, { activo });
  }

  periodos(anio: number): Observable<Periodo[]> {
    return this.http.get<Periodo[]>(`${API}/centros/periodos/${anio}`);
  }

  cerrarPeriodo(anio: number, mes: number): Observable<Periodo> {
    return this.http.post<Periodo>(`${API}/centros/periodos/${anio}/${mes}/cerrar`, {});
  }

  reabrirPeriodo(anio: number, mes: number): Observable<Periodo> {
    return this.http.post<Periodo>(`${API}/centros/periodos/${anio}/${mes}/reabrir`, {});
  }

  presupuesto(anio: number, mes: number): Observable<LineaPresupuesto[]> {
    return this.http.get<LineaPresupuesto[]>(`${API}/centros/presupuestos/${anio}/${mes}`);
  }

  guardarPresupuesto(
    anio: number,
    mes: number,
    lineas: LineaPresupuesto[],
  ): Observable<LineaPresupuesto[]> {
    return this.http.put<LineaPresupuesto[]>(`${API}/centros/presupuestos/${anio}/${mes}`, {
      lineas,
    });
  }

  imputaciones(f: FiltroImputaciones): Observable<Pagina<Imputacion>> {
    return this.http.get<Pagina<Imputacion>>(`${API}/centros/imputaciones`, {
      params: aParametros({ anio: f.anio, mes: f.mes, tipo: f.tipo, pagina: f.pagina }),
    });
  }

  imputar(datos: ImputacionNueva): Observable<{ grupoId: string }> {
    return this.http.post<{ grupoId: string }>(`${API}/centros/imputaciones`, datos);
  }

  extornar(grupoId: string, glosa: string): Observable<{ grupoId: string }> {
    return this.http.post<{ grupoId: string }>(`${API}/centros/imputaciones/${grupoId}/extorno`, {
      glosa,
    });
  }

  reporteCostos(anio: number, mes: number): Observable<FilaCostos[]> {
    return this.http.get<FilaCostos[]>(`${API}/centros/reportes/costos/${anio}/${mes}`);
  }

  reporteResultado(anio: number, mes: number): Observable<FilaResultado[]> {
    return this.http.get<FilaResultado[]>(`${API}/centros/reportes/resultado/${anio}/${mes}`);
  }

  estadoPorFuncion(anio: number, desde: number, hasta: number): Observable<EstadoPorFuncion> {
    return this.http.get<EstadoPorFuncion>(`${API}/centros/reportes/funcion/${anio}`, {
      params: aParametros({ desde, hasta }),
    });
  }
}
