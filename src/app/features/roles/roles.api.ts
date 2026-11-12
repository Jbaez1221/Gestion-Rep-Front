import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { Permiso, Rol } from '../../core/modelos/api.modelos';

@Injectable({ providedIn: 'root' })
export class RolesApi {
  private readonly http = inject(HttpClient);

  listar(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${API}/roles`);
  }

  permisos(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${API}/permisos`);
  }

  crear(nombre: string, descripcion: string | null): Observable<Rol> {
    return this.http.post<Rol>(`${API}/roles`, { nombre, descripcion });
  }

  actualizar(id: string, nombre: string, descripcion: string | null): Observable<Rol> {
    return this.http.put<Rol>(`${API}/roles/${id}`, { nombre, descripcion });
  }

  eliminar(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${API}/roles/${id}`);
  }

  asignarPermisos(id: string, permisos: string[]): Observable<Rol> {
    return this.http.put<Rol>(`${API}/roles/${id}/permisos`, { permisos });
  }
}
