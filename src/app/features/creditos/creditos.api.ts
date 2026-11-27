import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros, conParametros } from '../../core/http/parametros';
import {
  CuentaPagar,
  CuentaPagarListado,
  CuentaPorCobrar,
  CuentaPorCobrarListado,
  EstadoCredito,
  EstadoCuenta,
  EstadoCuentaPagar,
  MedioPagoProveedor,
  Pagina,
  ResumenPagar,
} from '../../core/modelos/api.modelos';

const BASE = `${API}/creditos`;

interface FiltroCobrar {
  texto?: string;
  clienteId?: string;
  estado?: EstadoCuenta | '';
  vencidas?: boolean;
  pagina?: number;
}

interface FiltroPagar {
  texto?: string;
  estado?: EstadoCuentaPagar | '';
  vencidas?: boolean;
  venceHasta?: string;
  detraccionPendiente?: boolean;
  pagina?: number;
}

function paramsCobrar(f: FiltroCobrar): HttpParams {
  return aParametros({
    texto: f.texto?.trim(),
    clienteId: f.clienteId,
    estado: f.estado,
    vencidas: f.vencidas || undefined,
    pagina: f.pagina,
  });
}

function paramsPagar(f: FiltroPagar): HttpParams {
  return aParametros({
    texto: f.texto?.trim(),
    estado: f.estado,
    vencidas: f.vencidas || undefined,
    venceHasta: f.venceHasta || undefined,
    detraccionPendiente: f.detraccionPendiente || undefined,
    pagina: f.pagina,
  });
}

@Injectable({ providedIn: 'root' })
export class CreditosApi {
  private readonly http = inject(HttpClient);

  cuentas(f: FiltroCobrar): Observable<Pagina<CuentaPorCobrarListado>> {
    return this.http.get<Pagina<CuentaPorCobrarListado>>(`${BASE}/cuentas`, {
      params: paramsCobrar(f),
    });
  }

  /** Las cuentas por cobrar de la búsqueda en Excel. */
  cuentasExcel(f: FiltroCobrar): string {
    return conParametros(`${BASE}/cuentas/excel`, paramsCobrar({ ...f, pagina: undefined }));
  }

  cuenta(id: string): Observable<CuentaPorCobrar> {
    return this.http.get<CuentaPorCobrar>(`${BASE}/cuentas/${id}`);
  }

  estadoCliente(socioId: string): Observable<EstadoCredito> {
    return this.http.get<EstadoCredito>(`${BASE}/clientes/${socioId}`);
  }

  // --- Por pagar ---

  cuentasPagar(f: FiltroPagar): Observable<Pagina<CuentaPagarListado>> {
    return this.http.get<Pagina<CuentaPagarListado>>(`${BASE}/pagar/cuentas`, {
      params: paramsPagar(f),
    });
  }

  /** Las cuentas por pagar de la búsqueda en Excel. */
  cuentasPagarExcel(f: FiltroPagar): string {
    return conParametros(`${BASE}/pagar/cuentas/excel`, paramsPagar({ ...f, pagina: undefined }));
  }

  resumenPagar(): Observable<ResumenPagar> {
    return this.http.get<ResumenPagar>(`${BASE}/pagar/resumen`);
  }

  cuentaPagar(id: string): Observable<CuentaPagar> {
    return this.http.get<CuentaPagar>(`${BASE}/pagar/cuentas/${id}`);
  }

  pagar(
    id: string,
    pago: {
      fecha: string;
      monto: number;
      medio: MedioPagoProveedor;
      referencia: string;
      banco: string | null;
    },
  ): Observable<CuentaPagar> {
    return this.http.post<CuentaPagar>(`${BASE}/pagar/cuentas/${id}/pagos`, pago);
  }

  detraccion(id: string, constancia: string, fecha: string): Observable<CuentaPagar> {
    return this.http.post<CuentaPagar>(`${BASE}/pagar/cuentas/${id}/detraccion`, {
      constancia,
      fecha,
    });
  }
}
