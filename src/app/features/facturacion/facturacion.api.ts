import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros } from '../../core/http/parametros';
import {
  ComprobanteVenta,
  ComprobanteVentaListado,
  Pagina,
  SerieComprobante,
  TipoComprobanteVenta,
} from '../../core/modelos/api.modelos';

const BASE = `${API}/facturacion`;

@Injectable({ providedIn: 'root' })
export class FacturacionApi {
  private readonly http = inject(HttpClient);

  series(): Observable<SerieComprobante[]> {
    return this.http.get<SerieComprobante[]>(`${BASE}/series`);
  }

  crearSerie(
    serie: string,
    tipo: TipoComprobanteVenta,
    sucursalId: string,
  ): Observable<SerieComprobante> {
    return this.http.post<SerieComprobante>(`${BASE}/series`, { serie, tipo, sucursalId });
  }

  estadoSerie(serie: string, activo: boolean): Observable<SerieComprobante> {
    return this.http.patch<SerieComprobante>(`${BASE}/series/${serie}/estado`, { activo });
  }

  comprobantes(f: {
    texto?: string;
    tipo?: TipoComprobanteVenta | '';
    desde?: string;
    hasta?: string;
    pagina?: number;
  }): Observable<Pagina<ComprobanteVentaListado>> {
    return this.http.get<Pagina<ComprobanteVentaListado>>(`${BASE}/comprobantes`, {
      params: aParametros({
        texto: f.texto?.trim(),
        tipo: f.tipo,
        desde: f.desde,
        hasta: f.hasta,
        pagina: f.pagina,
      }),
    });
  }

  comprobante(id: string): Observable<ComprobanteVenta> {
    return this.http.get<ComprobanteVenta>(`${BASE}/comprobantes/${id}`);
  }
}
