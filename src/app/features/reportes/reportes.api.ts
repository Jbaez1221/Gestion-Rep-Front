import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros, conParametros } from '../../core/http/parametros';
import { AgrupacionVentas, Panel, ReporteVentas } from '../../core/modelos/api.modelos';

export interface FiltroVentas {
  desde: string;
  hasta: string;
  agrupacion: AgrupacionVentas;
  sucursalId?: string | null;
}

const BASE = `${API}/reportes`;

function paramsVentas(f: FiltroVentas): HttpParams {
  return aParametros({
    desde: f.desde,
    hasta: f.hasta,
    agrupacion: f.agrupacion,
    sucursalId: f.sucursalId,
  });
}

@Injectable({ providedIn: 'root' })
export class ReportesApi {
  private readonly http = inject(HttpClient);

  panel(sucursalId?: string | null): Observable<Panel> {
    return this.http.get<Panel>(`${BASE}/panel`, { params: aParametros({ sucursalId }) });
  }

  ventas(f: FiltroVentas): Observable<ReporteVentas> {
    return this.http.get<ReporteVentas>(`${BASE}/ventas`, { params: paramsVentas(f) });
  }

  /** El reporte en Excel, con los mismos filtros. */
  ventasExcel(f: FiltroVentas): string {
    return conParametros(`${BASE}/ventas/excel`, paramsVentas(f));
  }
}
