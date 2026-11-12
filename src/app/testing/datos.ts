import { Almacen, Pagina, Sucursal, Usuario } from '../core/modelos/api.modelos';

export function pagina<T>(contenido: T[]): Pagina<T> {
  return { contenido, pagina: 0, tamanio: 20, totalElementos: contenido.length, totalPaginas: 1 };
}

export const SUCURSAL: Sucursal = {
  id: 's-1',
  codigo: 'CUS01',
  nombre: 'Cusco Centro',
  tipo: 'TIENDA',
  direccion: null,
  ubigeo: '080101',
  telefono: null,
  codigoEstablecimientoSunat: '0000',
  activa: true,
};

export const ALMACENES: Almacen[] = [
  {
    id: 'a-1',
    sucursalId: 's-1',
    codigo: 'CUS01-01',
    nombre: 'Almacén principal',
    principal: true,
    activo: true,
  },
  {
    id: 'a-2',
    sucursalId: 's-1',
    codigo: 'CUS01-02',
    nombre: 'Mermas',
    principal: false,
    activo: true,
  },
];

export const USUARIO: Usuario = {
  id: 'u-2',
  username: 'cajero',
  email: 'cajero@prueba.local',
  nombres: 'Luis',
  apellidos: 'Quispe',
  tipoDocumento: 'DNI',
  numeroDocumento: '12345678',
  rol: { id: 'r-1', nombre: 'CAJERO' },
  sucursalIds: ['s-1'],
  activo: true,
  bloqueado: false,
  bloqueadoHasta: null,
  requiereCambioPassword: true,
  ultimoAcceso: '2026-11-10T15:00:00Z',
  creadoPor: 'admin',
  fechaCreacion: '2026-11-10T14:00:00Z',
  modificadoPor: 'admin',
  fechaModificacion: '2026-11-10T14:00:00Z',
};
