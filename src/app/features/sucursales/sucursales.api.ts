import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros } from '../../core/http/parametros';
import {
  Almacen,
  Pagina,
  Sucursal,
  SucursalGuardar,
  TipoSucursal,
} from '../../core/modelos/api.modelos';

export interface FiltroSucursales {
  texto?: string;
  tipo?: TipoSucursal | '';
  activa?: boolean | null;
  pagina?: number;
  tamanio?: number;
}

@Injectable({ providedIn: 'root' })
export class SucursalesApi {
  private readonly http = inject(HttpClient);

  listar(f: FiltroSucursales = {}): Observable<Pagina<Sucursal>> {
    return this.http.get<Pagina<Sucursal>>(`${API}/sucursales`, {
      params: aParametros({
        texto: f.texto,
        tipo: f.tipo,
        activa: f.activa,
        pagina: f.pagina,
        tamanio: f.tamanio,
      }),
    });
  }

  obtener(id: string): Observable<Sucursal> {
    return this.http.get<Sucursal>(`${API}/sucursales/${id}`);
  }

  crear(datos: SucursalGuardar): Observable<Sucursal> {
    return this.http.post<Sucursal>(`${API}/sucursales`, datos);
  }

  actualizar(id: string, datos: SucursalGuardar): Observable<Sucursal> {
    return this.http.put<Sucursal>(`${API}/sucursales/${id}`, datos);
  }

  cambiarEstado(id: string, activo: boolean): Observable<Sucursal> {
    return this.http.patch<Sucursal>(`${API}/sucursales/${id}/estado`, { activo });
  }

  almacenes(sucursalId: string): Observable<Almacen[]> {
    return this.http.get<Almacen[]>(`${API}/sucursales/${sucursalId}/almacenes`);
  }

  crearAlmacen(sucursalId: string, codigo: string, nombre: string): Observable<Almacen> {
    return this.http.post<Almacen>(`${API}/sucursales/${sucursalId}/almacenes`, { codigo, nombre });
  }

  renombrarAlmacen(id: string, nombre: string): Observable<Almacen> {
    return this.http.put<Almacen>(`${API}/almacenes/${id}`, { nombre });
  }

  cambiarEstadoAlmacen(id: string, activo: boolean): Observable<Almacen> {
    return this.http.patch<Almacen>(`${API}/almacenes/${id}/estado`, { activo });
  }

  marcarPrincipal(id: string): Observable<Almacen> {
    return this.http.post<Almacen>(`${API}/almacenes/${id}/principal`, {});
  }
}
