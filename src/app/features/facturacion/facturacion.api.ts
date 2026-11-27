import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros, conParametros } from '../../core/http/parametros';
import {
  ArchivoComprobante,
  ComprobanteVenta,
  ComprobanteVentaListado,
  GuiaRemision,
  GuiaRemisionListado,
  GuiaVenta,
  MotivoTraslado,
  Pagina,
  NotaDebitoGuardar,
  SerieComprobante,
  TipoComprobanteEmitido,
} from '../../core/modelos/api.modelos';

const BASE = `${API}/facturacion`;

interface FiltroComprobantes {
  texto?: string;
  tipo?: TipoComprobanteEmitido | '';
  desde?: string;
  hasta?: string;
  pagina?: number;
}

function paramsComprobantes(f: FiltroComprobantes): HttpParams {
  return aParametros({
    texto: f.texto?.trim(),
    tipo: f.tipo,
    desde: f.desde,
    hasta: f.hasta,
    pagina: f.pagina,
  });
}

/** Registro de ventas 14.1 en Excel (se le agregan anio y mes). */
export const RUTA_REGISTRO_VENTAS = `${BASE}/registro-ventas/excel`;

@Injectable({ providedIn: 'root' })
export class FacturacionApi {
  private readonly http = inject(HttpClient);

  /** Nota de débito sobre la factura o boleta; devuelve la nota emitida. */
  notaDebito(id: string, datos: NotaDebitoGuardar): Observable<ComprobanteVenta> {
    return this.http.post<ComprobanteVenta>(`${BASE}/comprobantes/${id}/nota-debito`, datos);
  }

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

  comprobantes(f: FiltroComprobantes): Observable<Pagina<ComprobanteVentaListado>> {
    return this.http.get<Pagina<ComprobanteVentaListado>>(`${BASE}/comprobantes`, {
      params: paramsComprobantes(f),
    });
  }

  /** Los comprobantes de la búsqueda en Excel. */
  comprobantesExcel(f: FiltroComprobantes): string {
    return conParametros(
      `${BASE}/comprobantes/excel`,
      paramsComprobantes({ ...f, pagina: undefined }),
    );
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

  /** Guía de remisión de la venta (motivo 01). */
  guiaDeVenta(comprobanteId: string, datos: GuiaVenta): Observable<GuiaRemision> {
    return this.http.post<GuiaRemision>(`${BASE}/comprobantes/${comprobanteId}/guia`, datos);
  }

  guias(f: {
    texto?: string;
    motivo?: MotivoTraslado | '';
    desde?: string;
    hasta?: string;
    pagina?: number;
  }): Observable<Pagina<GuiaRemisionListado>> {
    return this.http.get<Pagina<GuiaRemisionListado>>(`${BASE}/guias`, {
      params: aParametros({
        texto: f.texto?.trim(),
        motivo: f.motivo,
        desde: f.desde,
        hasta: f.hasta,
        pagina: f.pagina,
      }),
    });
  }

  guia(id: string): Observable<GuiaRemision> {
    return this.http.get<GuiaRemision>(`${BASE}/guias/${id}`);
  }

  enviarGuia(id: string): Observable<GuiaRemision> {
    return this.http.post<GuiaRemision>(`${BASE}/guias/${id}/enviar`, {});
  }

  urlArchivoGuia(id: string, tipo: ArchivoComprobante): string {
    return `${BASE}/guias/${id}/archivos/${tipo}`;
  }
}
