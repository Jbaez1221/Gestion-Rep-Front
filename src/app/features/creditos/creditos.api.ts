import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros } from '../../core/http/parametros';
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

@Injectable({ providedIn: 'root' })
export class CreditosApi {
  private readonly http = inject(HttpClient);

  cuentas(f: {
    texto?: string;
    clienteId?: string;
    estado?: EstadoCuenta | '';
    vencidas?: boolean;
    pagina?: number;
  }): Observable<Pagina<CuentaPorCobrarListado>> {
    return this.http.get<Pagina<CuentaPorCobrarListado>>(`${BASE}/cuentas`, {
      params: aParametros({
        texto: f.texto?.trim(),
        clienteId: f.clienteId,
        estado: f.estado,
        vencidas: f.vencidas || undefined,
        pagina: f.pagina,
      }),
    });
  }

  cuenta(id: string): Observable<CuentaPorCobrar> {
    return this.http.get<CuentaPorCobrar>(`${BASE}/cuentas/${id}`);
  }

  estadoCliente(socioId: string): Observable<EstadoCredito> {
    return this.http.get<EstadoCredito>(`${BASE}/clientes/${socioId}`);
  }

  // --- Por pagar ---

  cuentasPagar(f: {
    texto?: string;
    estado?: EstadoCuentaPagar | '';
    vencidas?: boolean;
    venceHasta?: string;
    detraccionPendiente?: boolean;
    pagina?: number;
  }): Observable<Pagina<CuentaPagarListado>> {
    return this.http.get<Pagina<CuentaPagarListado>>(`${BASE}/pagar/cuentas`, {
      params: aParametros({
        texto: f.texto?.trim(),
        estado: f.estado,
        vencidas: f.vencidas || undefined,
        venceHasta: f.venceHasta || undefined,
        detraccionPendiente: f.detraccionPendiente || undefined,
        pagina: f.pagina,
      }),
    });
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
