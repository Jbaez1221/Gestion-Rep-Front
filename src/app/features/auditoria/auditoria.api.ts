import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros } from '../../core/http/parametros';
import {
  CambioAuditoria,
  EventoAuditoria,
  FlujoDocumentos,
  Pagina,
} from '../../core/modelos/api.modelos';

export interface FiltroCambios {
  entidad?: string;
  entidadId?: string;
  usuario?: string;
  operacion?: string;
  desde?: string | null;
  hasta?: string | null;
  pagina?: number;
  tamanio?: number;
}

export interface FiltroEventos {
  tipo?: string;
  usuario?: string;
  desde?: string | null;
  hasta?: string | null;
  pagina?: number;
  tamanio?: number;
}

@Injectable({ providedIn: 'root' })
export class AuditoriaApi {
  private readonly http = inject(HttpClient);

  cambios(f: FiltroCambios): Observable<Pagina<CambioAuditoria>> {
    return this.http.get<Pagina<CambioAuditoria>>(`${API}/auditoria/cambios`, {
      params: aParametros({ ...f }),
    });
  }

  eventos(f: FiltroEventos): Observable<Pagina<EventoAuditoria>> {
    return this.http.get<Pagina<EventoAuditoria>>(`${API}/auditoria/eventos`, {
      params: aParametros({ ...f }),
    });
  }

  flujo(tipo: string, id: string): Observable<FlujoDocumentos> {
    return this.http.get<FlujoDocumentos>(`${API}/auditoria/flujo`, {
      params: aParametros({ tipo, id }),
    });
  }
}
