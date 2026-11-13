import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros } from '../../core/http/parametros';
import {
  Pagina,
  Usuario,
  UsuarioActualizar,
  UsuarioCreado,
  UsuarioCrear,
} from '../../core/modelos/api.modelos';

export interface FiltroUsuarios {
  texto?: string;
  rolId?: string;
  sucursalId?: string;
  activo?: boolean | null;
  pagina?: number;
  tamanio?: number;
}

@Injectable({ providedIn: 'root' })
export class UsuariosApi {
  private readonly http = inject(HttpClient);

  listar(f: FiltroUsuarios = {}): Observable<Pagina<Usuario>> {
    return this.http.get<Pagina<Usuario>>(`${API}/usuarios`, {
      params: aParametros({
        texto: f.texto,
        rolId: f.rolId,
        sucursalId: f.sucursalId,
        activo: f.activo,
        pagina: f.pagina,
        tamanio: f.tamanio,
      }),
    });
  }

  obtener(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${API}/usuarios/${id}`);
  }

  crear(datos: UsuarioCrear): Observable<UsuarioCreado> {
    return this.http.post<UsuarioCreado>(`${API}/usuarios`, datos);
  }

  actualizar(id: string, datos: UsuarioActualizar): Observable<Usuario> {
    return this.http.put<Usuario>(`${API}/usuarios/${id}`, datos);
  }

  desactivar(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${API}/usuarios/${id}`);
  }

  restablecerPassword(id: string, confirmacionUsername: string): Observable<string> {
    return this.http
      .post<{ passwordProvisional: string }>(`${API}/usuarios/${id}/password/restablecer`, {
        confirmacionUsername,
      })
      .pipe(map((r) => r.passwordProvisional));
  }
}
