import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros } from '../../core/http/parametros';
import {
  CuentaPorCobrar,
  CuentaPorCobrarListado,
  EstadoCredito,
  EstadoCuenta,
  Pagina,
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
}
