import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../../core/http/api';
import { aParametros } from '../../core/http/parametros';
import {
  ClienteLista,
  EstadoPedido,
  ListaGuardar,
  ListaPrecios,
  Mostrador,
  Pagina,
  PedidoGuardar,
  PedidoListado,
  PedidoVenta,
  PrecioFijo,
} from '../../core/modelos/api.modelos';

export interface FiltroPedidos {
  texto?: string;
  estado?: EstadoPedido | '';
  propios?: boolean;
  desde?: string;
  hasta?: string;
  pagina?: number;
}

const BASE = `${API}/ventas`;

@Injectable({ providedIn: 'root' })
export class VentasApi {
  private readonly http = inject(HttpClient);

  mostrador(almacenId: string, clienteId: string | null, texto: string): Observable<Mostrador> {
    return this.http.get<Mostrador>(`${BASE}/mostrador`, {
      params: aParametros({ almacenId, clienteId, texto: texto.trim() }),
    });
  }

  pedidos(f: FiltroPedidos): Observable<Pagina<PedidoListado>> {
    return this.http.get<Pagina<PedidoListado>>(`${BASE}/pedidos`, {
      params: aParametros({
        texto: f.texto?.trim(),
        estado: f.estado,
        propios: f.propios || null,
        desde: f.desde,
        hasta: f.hasta,
        pagina: f.pagina,
      }),
    });
  }

  pedido(id: string): Observable<PedidoVenta> {
    return this.http.get<PedidoVenta>(`${BASE}/pedidos/${id}`);
  }

  crear(datos: PedidoGuardar): Observable<PedidoVenta> {
    return this.http.post<PedidoVenta>(`${BASE}/pedidos`, datos);
  }

  actualizar(id: string, datos: PedidoGuardar): Observable<PedidoVenta> {
    return this.http.put<PedidoVenta>(`${BASE}/pedidos/${id}`, datos);
  }

  enviar(id: string): Observable<PedidoVenta> {
    return this.http.post<PedidoVenta>(`${BASE}/pedidos/${id}/enviar`, {});
  }

  devolver(id: string): Observable<PedidoVenta> {
    return this.http.post<PedidoVenta>(`${BASE}/pedidos/${id}/devolver`, {});
  }

  anular(id: string, motivo: string): Observable<PedidoVenta> {
    return this.http.post<PedidoVenta>(`${BASE}/pedidos/${id}/anular`, { motivo });
  }

  listas(): Observable<ListaPrecios[]> {
    return this.http.get<ListaPrecios[]>(`${BASE}/listas`);
  }

  crearLista(datos: ListaGuardar): Observable<ListaPrecios> {
    return this.http.post<ListaPrecios>(`${BASE}/listas`, datos);
  }

  actualizarLista(id: string, datos: ListaGuardar): Observable<ListaPrecios> {
    return this.http.put<ListaPrecios>(`${BASE}/listas/${id}`, datos);
  }

  precios(listaId: string, texto?: string): Observable<PrecioFijo[]> {
    return this.http.get<PrecioFijo[]>(`${BASE}/listas/${listaId}/precios`, {
      params: aParametros({ texto: texto?.trim() }),
    });
  }

  fijarPrecio(
    listaId: string,
    articuloId: string,
    unidad: string | null,
    precio: number,
  ): Observable<PrecioFijo> {
    return this.http.put<PrecioFijo>(`${BASE}/listas/${listaId}/precios`, {
      articuloId,
      unidad,
      precio,
    });
  }

  quitarPrecio(listaId: string, precioId: string): Observable<unknown> {
    return this.http.delete<unknown>(`${BASE}/listas/${listaId}/precios/${precioId}`);
  }

  listaDeCliente(socioId: string): Observable<ClienteLista> {
    return this.http.get<ClienteLista>(`${BASE}/clientes/${socioId}/lista`);
  }

  asignarLista(socioId: string, listaId: string | null): Observable<ClienteLista> {
    return this.http.put<ClienteLista>(`${BASE}/clientes/${socioId}/lista`, { listaId });
  }
}
