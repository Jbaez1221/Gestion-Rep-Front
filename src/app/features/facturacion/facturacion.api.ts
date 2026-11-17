import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros } from '../../core/http/parametros';
import {
  ArchivoComprobante,
  ComprobanteVenta,
  ComprobanteVentaListado,
  Pagina,
  SerieComprobante,
  TipoComprobanteEmitido,
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
    tipo: TipoComprobanteEmitido,
    sucursalId: string,
  ): Observable<SerieComprobante> {
    return this.http.post<SerieComprobante>(`${BASE}/series`, { serie, tipo, sucursalId });
  }

  estadoSerie(serie: string, activo: boolean): Observable<SerieComprobante> {
    return this.http.patch<SerieComprobante>(`${BASE}/series/${serie}/estado`, { activo });
  }

  comprobantes(f: {
    texto?: string;
    tipo?: TipoComprobanteEmitido | '';
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

  /** Lo envía ya al facturador (también uno con error de datos ya corregido). */
  enviar(id: string): Observable<ComprobanteVenta> {
    return this.http.post<ComprobanteVenta>(`${BASE}/comprobantes/${id}/enviar`, {});
  }

  /** Enlace de descarga: la cookie de sesión viaja con el enlace (mismo origen). */
  urlArchivo(id: string, tipo: ArchivoComprobante): string {
    return `${BASE}/comprobantes/${id}/archivos/${tipo}`;
  }
}
