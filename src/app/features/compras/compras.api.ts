import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros, conParametros } from '../../core/http/parametros';
import {
  CatalogosCompras,
  Compra,
  CompraGuardar,
  CompraListado,
  EstadoCompra,
  EstadoOrden,
  EstadoRecepcion,
  OrdenCompra,
  OrdenGuardar,
  OrdenListado,
  Pagina,
  Recepcion,
  RecepcionGuardar,
  RecepcionListado,
  SugerenciaCompra,
  TipoCambio,
  TipoComprobante,
} from '../../core/modelos/api.modelos';

export interface FiltroCompras {
  texto?: string;
  proveedorId?: string;
  tipo?: TipoComprobante | '';
  estado?: EstadoCompra | '';
  desde?: string;
  hasta?: string;
  pagina?: number;
  tamanio?: number;
}

export interface FiltroOrdenes {
  texto?: string;
  proveedorId?: string;
  estado?: EstadoOrden | '';
  desde?: string;
  hasta?: string;
  pagina?: number;
}

const BASE = `${API}/compras`;

function paramsCompras(f: FiltroCompras): HttpParams {
  return aParametros({
    texto: f.texto?.trim(),
    proveedorId: f.proveedorId,
    tipo: f.tipo,
    estado: f.estado,
    desde: f.desde,
    hasta: f.hasta,
    pagina: f.pagina,
    tamanio: f.tamanio,
  });
}

/** Registro de compras 8.1 en Excel (se le agregan anio y mes). */
export const RUTA_REGISTRO_COMPRAS = `${BASE}/registro/excel`;

@Injectable({ providedIn: 'root' })
export class ComprasApi {
  private readonly http = inject(HttpClient);

  catalogos(): Observable<CatalogosCompras> {
    return this.http.get<CatalogosCompras>(`${BASE}/catalogos`);
  }

  listar(f: FiltroCompras): Observable<Pagina<CompraListado>> {
    return this.http.get<Pagina<CompraListado>>(BASE, { params: paramsCompras(f) });
  }

  /** Las compras de la búsqueda en Excel. */
  excel(f: FiltroCompras): string {
    return conParametros(
      `${BASE}/excel`,
      paramsCompras({ ...f, pagina: undefined, tamanio: undefined }),
    );
  }

  obtener(id: string): Observable<Compra> {
    return this.http.get<Compra>(`${BASE}/${id}`);
  }

  registrar(datos: CompraGuardar): Observable<Compra> {
    return this.http.post<Compra>(BASE, datos);
  }

  /** Consulta en SUNAT el comprobante del proveedor y guarda el resultado. */
  validarSunat(id: string): Observable<Compra> {
    return this.http.post<Compra>(`${BASE}/${id}/validar-sunat`, {});
  }

  anular(id: string, motivo: string): Observable<Compra> {
    return this.http.post<Compra>(`${BASE}/${id}/anular`, { motivo });
  }

  ordenes(f: FiltroOrdenes): Observable<Pagina<OrdenListado>> {
    return this.http.get<Pagina<OrdenListado>>(`${BASE}/ordenes`, {
      params: aParametros({
        texto: f.texto?.trim(),
        proveedorId: f.proveedorId,
        estado: f.estado,
        desde: f.desde,
        hasta: f.hasta,
        pagina: f.pagina,
      }),
    });
  }

  /** Lo que conviene pedir para el almacén, agrupado por proveedor. */
  sugerencia(almacenId: string): Observable<SugerenciaCompra> {
    return this.http.get<SugerenciaCompra>(`${BASE}/ordenes/sugerencia`, {
      params: aParametros({ almacenId }),
    });
  }

  orden(id: string): Observable<OrdenCompra> {
    return this.http.get<OrdenCompra>(`${BASE}/ordenes/${id}`);
  }

  crearOrden(datos: OrdenGuardar): Observable<OrdenCompra> {
    return this.http.post<OrdenCompra>(`${BASE}/ordenes`, datos);
  }

  actualizarOrden(id: string, datos: OrdenGuardar): Observable<OrdenCompra> {
    return this.http.put<OrdenCompra>(`${BASE}/ordenes/${id}`, datos);
  }

  aprobarOrden(id: string): Observable<OrdenCompra> {
    return this.http.post<OrdenCompra>(`${BASE}/ordenes/${id}/aprobar`, {});
  }

  cerrarOrden(id: string, motivo: string): Observable<OrdenCompra> {
    return this.http.post<OrdenCompra>(`${BASE}/ordenes/${id}/cerrar`, { motivo });
  }

  anularOrden(id: string, motivo: string): Observable<OrdenCompra> {
    return this.http.post<OrdenCompra>(`${BASE}/ordenes/${id}/anular`, { motivo });
  }

  recepciones(f: {
    texto?: string;
    proveedorId?: string;
    estado?: EstadoRecepcion | '';
    desde?: string;
    hasta?: string;
    pagina?: number;
  }): Observable<Pagina<RecepcionListado>> {
    return this.http.get<Pagina<RecepcionListado>>(`${BASE}/recepciones`, {
      params: aParametros({
        texto: f.texto?.trim(),
        proveedorId: f.proveedorId,
        estado: f.estado,
        desde: f.desde,
        hasta: f.hasta,
        pagina: f.pagina,
      }),
    });
  }

  recepcion(id: string): Observable<Recepcion> {
    return this.http.get<Recepcion>(`${BASE}/recepciones/${id}`);
  }

  registrarRecepcion(datos: RecepcionGuardar): Observable<Recepcion> {
    return this.http.post<Recepcion>(`${BASE}/recepciones`, datos);
  }

  anularRecepcion(id: string, motivo: string): Observable<Recepcion> {
    return this.http.post<Recepcion>(`${BASE}/recepciones/${id}/anular`, { motivo });
  }

  tiposCambio(desde?: string, hasta?: string): Observable<TipoCambio[]> {
    return this.http.get<TipoCambio[]>(`${BASE}/tipos-cambio`, {
      params: aParametros({ desde, hasta }),
    });
  }

  tipoCambioVigente(fecha: string): Observable<TipoCambio> {
    return this.http.get<TipoCambio>(`${BASE}/tipos-cambio/vigente/${fecha}`);
  }

  registrarTipoCambio(fecha: string, compra: number, venta: number): Observable<TipoCambio> {
    return this.http.put<TipoCambio>(`${BASE}/tipos-cambio`, { fecha, compra, venta });
  }
}
