import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros } from '../../core/http/parametros';
import {
  Caja,
  Cobro,
  MovimientoCaja,
  Pago,
  Pagina,
  PedidoPendiente,
  SesionCaja,
  SesionListado,
  TipoMovimientoCaja,
} from '../../core/modelos/api.modelos';

export interface CajaGuardar {
  codigo: string | null;
  nombre: string;
  sucursalId: string | null;
  serieBoleta: string;
  serieFactura: string;
  activo: boolean;
}

const BASE = `${API}/caja`;

@Injectable({ providedIn: 'root' })
export class CajaApi {
  private readonly http = inject(HttpClient);

  cajas(): Observable<Caja[]> {
    return this.http.get<Caja[]>(`${BASE}/cajas`);
  }

  crearCaja(datos: CajaGuardar): Observable<Caja> {
    return this.http.post<Caja>(`${BASE}/cajas`, datos);
  }

  actualizarCaja(id: string, datos: CajaGuardar): Observable<Caja> {
    return this.http.put<Caja>(`${BASE}/cajas/${id}`, datos);
  }

  /** La caja abierta del cajero; null si no tiene (204). */
  actual(): Observable<SesionCaja | null> {
    return this.http
      .get<SesionCaja | null>(`${BASE}/sesiones/actual`, { observe: 'response' })
      .pipe(map((r) => (r.status === 204 ? null : r.body)));
  }

  abrir(cajaId: string, montoApertura: number): Observable<SesionCaja> {
    return this.http.post<SesionCaja>(`${BASE}/sesiones`, { cajaId, montoApertura });
  }

  sesiones(cajaId?: string, pagina = 0): Observable<Pagina<SesionListado>> {
    return this.http.get<Pagina<SesionListado>>(`${BASE}/sesiones`, {
      params: aParametros({ cajaId, pagina }),
    });
  }

  sesion(id: string): Observable<SesionCaja> {
    return this.http.get<SesionCaja>(`${BASE}/sesiones/${id}`);
  }

  pendientes(sesionId: string): Observable<PedidoPendiente[]> {
    return this.http.get<PedidoPendiente[]>(`${BASE}/sesiones/${sesionId}/pendientes`);
  }

  cobrar(sesionId: string, pedidoId: string, pagos: Pago[]): Observable<Cobro> {
    return this.http.post<Cobro>(`${BASE}/sesiones/${sesionId}/cobros`, { pedidoId, pagos });
  }

  movimiento(
    sesionId: string,
    tipo: TipoMovimientoCaja,
    monto: number,
    motivo: string,
  ): Observable<MovimientoCaja> {
    return this.http.post<MovimientoCaja>(`${BASE}/sesiones/${sesionId}/movimientos`, {
      tipo,
      monto,
      motivo,
    });
  }

  cerrar(
    sesionId: string,
    efectivoContado: number,
    observacion: string | null,
  ): Observable<SesionCaja> {
    return this.http.post<SesionCaja>(`${BASE}/sesiones/${sesionId}/cerrar`, {
      efectivoContado,
      observacion,
    });
  }
}
