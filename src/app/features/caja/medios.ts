import { MedioPago } from '../../core/modelos/api.modelos';

export const NOMBRE_MEDIO: Record<MedioPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  YAPE_PLIN: 'Yape / Plin',
  TRANSFERENCIA: 'Transferencia',
  CREDITO: 'Crédito',
};

/** Medios con que se recibe o devuelve dinero (sin el crédito). */
export const MEDIOS_DINERO: MedioPago[] = ['EFECTIVO', 'TARJETA', 'YAPE_PLIN', 'TRANSFERENCIA'];

export function centimos(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
