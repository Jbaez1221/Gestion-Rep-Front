import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros, conParametros } from '../../core/http/parametros';
import {
  AbonoCaja,
  Caja,
  Cobro,
  CobroDevolvible,
  CuentaPendiente,
  CuentaProveedorCaja,
  PagoProveedorCaja,
  DevolucionCaja,
  MotivoNotaCredito,
  MedioPago,
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
  serieNcBoleta: string | null;
  serieNcFactura: string | null;
  activo: boolean;
}

export interface DevolucionGuardar {
  cobroId: string;
  motivo: MotivoNotaCredito;
  descripcion: string;
  /** Solo en 07: línea del comprobante (desde 1) y cantidad. */
  lineas: { linea: number; cantidad: number }[];
  medioReembolso: MedioPago;
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

  /** Las sesiones en Excel. */
  sesionesExcel(cajaId?: string): string {
    return conParametros(`${BASE}/sesiones/excel`, aParametros({ cajaId }));
  }

  sesion(id: string): Observable<SesionCaja> {
    return this.http.get<SesionCaja>(`${BASE}/sesiones/${id}`);
  }

  pendientes(sesionId: string): Observable<PedidoPendiente[]> {
    return this.http.get<PedidoPendiente[]>(`${BASE}/sesiones/${sesionId}/pendientes`);
  }

  /** {@code autorizarCredito}: confirma la venta al crédito sobre el límite o con deuda vencida. */
  cobrar(
    sesionId: string,
    pedidoId: string,
    pagos: Pago[],
    autorizarCredito = false,
  ): Observable<Cobro> {
    return this.http.post<Cobro>(`${BASE}/sesiones/${sesionId}/cobros`, {
      pedidoId,
      pagos,
      autorizarCredito,
    });
  }

  cuentas(sesionId: string, texto: string): Observable<CuentaPendiente[]> {
    return this.http.get<CuentaPendiente[]>(`${BASE}/sesiones/${sesionId}/cuentas`, {
      params: aParametros({ texto: texto.trim() || undefined }),
    });
  }

  abonar(sesionId: string, cuentaId: string, pagos: Pago[]): Observable<AbonoCaja> {
    return this.http.post<AbonoCaja>(`${BASE}/sesiones/${sesionId}/abonos`, { cuentaId, pagos });
  }

  devolvible(sesionId: string, comprobante: string): Observable<CobroDevolvible> {
    return this.http.get<CobroDevolvible>(`${BASE}/sesiones/${sesionId}/devolucion`, {
      params: aParametros({ comprobante: comprobante.trim() }),
    });
  }

  devolver(sesionId: string, datos: DevolucionGuardar): Observable<DevolucionCaja> {
    return this.http.post<DevolucionCaja>(`${BASE}/sesiones/${sesionId}/devoluciones`, datos);
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

  proveedores(sesionId: string, texto: string): Observable<CuentaProveedorCaja[]> {
    return this.http.get<CuentaProveedorCaja[]>(`${BASE}/sesiones/${sesionId}/proveedores`, {
      params: aParametros({ texto: texto.trim() || undefined }),
    });
  }

  pagarProveedor(sesionId: string, cuentaId: string, monto: number): Observable<PagoProveedorCaja> {
    return this.http.post<PagoProveedorCaja>(`${BASE}/sesiones/${sesionId}/pagos-proveedor`, {
      cuentaId,
      monto,
    });
  }
}
