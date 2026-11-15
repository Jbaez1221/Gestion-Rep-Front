import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros } from '../../core/http/parametros';
import {
  CatalogosSocios,
  ConsultaDni,
  ConsultaRuc,
  DatosSocio,
  Pagina,
  Socio,
  SocioListado,
  TipoDocumentoIdentidad,
} from '../../core/modelos/api.modelos';

export interface FiltroSocios {
  texto?: string;
  rol?: 'CLIENTE' | 'PROVEEDOR' | '';
  activo?: boolean | null;
  pagina?: number;
}

const BASE = `${API}/socios`;

@Injectable({ providedIn: 'root' })
export class SociosApi {
  private readonly http = inject(HttpClient);

  listar(f: FiltroSocios): Observable<Pagina<SocioListado>> {
    return this.http.get<Pagina<SocioListado>>(BASE, {
      params: aParametros({
        texto: f.texto?.trim(),
        rol: f.rol,
        activo: f.activo,
        pagina: f.pagina,
      }),
    });
  }

  obtener(id: string): Observable<Socio> {
    return this.http.get<Socio>(`${BASE}/${id}`);
  }

  porDocumento(tipo: TipoDocumentoIdentidad, numero: string): Observable<Socio> {
    return this.http.get<Socio>(`${BASE}/documento/${tipo}/${encodeURIComponent(numero.trim())}`);
  }

  catalogos(): Observable<CatalogosSocios> {
    return this.http.get<CatalogosSocios>(`${BASE}/catalogos`);
  }

  crear(
    tipoDocumento: TipoDocumentoIdentidad,
    numeroDocumento: string,
    datos: DatosSocio,
  ): Observable<Socio> {
    return this.http.post<Socio>(BASE, { tipoDocumento, numeroDocumento, datos });
  }

  actualizar(id: string, datos: DatosSocio): Observable<Socio> {
    return this.http.put<Socio>(`${BASE}/${id}`, datos);
  }

  cambiarEstado(
    id: string,
    estado: { activo: boolean; bloqueado: boolean; motivoBloqueo: string | null },
  ): Observable<Socio> {
    return this.http.patch<Socio>(`${BASE}/${id}/estado`, estado);
  }

  actualizarSunat(id: string): Observable<Socio> {
    return this.http.post<Socio>(`${BASE}/${id}/actualizar-sunat`, {});
  }

  consultarRuc(ruc: string): Observable<ConsultaRuc> {
    return this.http.get<ConsultaRuc>(`${BASE}/consulta/ruc/${encodeURIComponent(ruc.trim())}`);
  }

  consultarDni(dni: string): Observable<ConsultaDni> {
    return this.http.get<ConsultaDni>(`${BASE}/consulta/dni/${encodeURIComponent(dni.trim())}`);
  }
}
