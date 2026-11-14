import { EstadoConteo, EstadoTraslado, TipoMovimiento } from '../../core/modelos/api.modelos';

export const TIPOS_MOVIMIENTO: Record<TipoMovimiento, string> = {
  SALDO_INICIAL: 'Saldo inicial',
  AJUSTE_ENTRADA: 'Ajuste de entrada',
  AJUSTE_SALIDA: 'Ajuste de salida',
  MERMA: 'Merma',
  DESMEDRO: 'Desmedro',
  CONSUMO_INTERNO: 'Consumo interno',
  TRANSFERENCIA_SALIDA: 'Transferencia (salida)',
  TRANSFERENCIA_ENTRADA: 'Transferencia (entrada)',
  REVALORIZACION: 'Revalorización',
  COMPRA: 'Compra',
  DEVOLUCION_PROVEEDOR: 'Devolución al proveedor',
};

export const ESTADOS_TRASLADO: Record<EstadoTraslado, string> = {
  SOLICITADO: 'Solicitado',
  EN_TRANSITO: 'En tránsito',
  RECIBIDO: 'Recibido',
  ANULADO: 'Anulado',
};

/** Los que se registran desde la pantalla de movimientos, con su sentido. */
export const TIPOS_MANUALES: { tipo: TipoMovimiento; entrada: boolean }[] = [
  { tipo: 'SALDO_INICIAL', entrada: true },
  { tipo: 'AJUSTE_ENTRADA', entrada: true },
  { tipo: 'AJUSTE_SALIDA', entrada: false },
  { tipo: 'MERMA', entrada: false },
  { tipo: 'DESMEDRO', entrada: false },
  { tipo: 'CONSUMO_INTERNO', entrada: false },
];

export const ESTADOS_CONTEO: Record<EstadoConteo, string> = {
  ABIERTO: 'Abierto',
  APLICADO: 'Aplicado',
  ANULADO: 'Anulado',
};

/** Tabla 5 de SUNAT, para la valorización. */
export const TIPOS_EXISTENCIA_SUNAT: Record<string, string> = {
  '01': 'Mercaderías',
  '02': 'Productos terminados',
  '03': 'Materias primas',
  '04': 'Envases',
  '05': 'Materiales auxiliares',
  '06': 'Suministros',
  '07': 'Repuestos',
  '08': 'Embalajes',
  '99': 'Otros',
};

export function primerDiaDelMes(fecha: string): string {
  return `${fecha.slice(0, 8)}01`;
}
