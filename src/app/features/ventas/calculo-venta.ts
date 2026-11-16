import { AfectacionCompra, EstadoPedido } from '../../core/modelos/api.modelos';

const TASA_IGV = 0.18;

function centimos(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Precio de lista menos el descuento (%), a céntimos: como lo calcula el backend. */
export function conDescuento(precio: number, descuento: number): number {
  return centimos(precio * (1 - descuento / 100));
}

/** Total y desglose de una línea con precio con IGV. */
export function importeVenta(
  cantidad: number,
  precio: number,
  afectacion: AfectacionCompra,
): { valorVenta: number; igv: number; total: number } {
  const total = centimos(cantidad * precio);
  if (afectacion !== 'GRAVADO') return { valorVenta: total, igv: 0, total };
  const valorVenta = centimos(total / (1 + TASA_IGV));
  return { valorVenta, igv: centimos(total - valorVenta), total };
}

export const NOMBRE_ESTADO_PEDIDO: Record<EstadoPedido, string> = {
  BORRADOR: 'Borrador',
  ENVIADO: 'En caja',
  COBRADO: 'Cobrado',
  ANULADO: 'Anulado',
  VENCIDO: 'Vencido',
};

export function claseEstadoPedido(estado: EstadoPedido): string {
  if (estado === 'ENVIADO') return 'insignia-alerta';
  if (estado === 'COBRADO') return 'insignia-ok';
  return 'insignia-neutra';
}

/** Sigla del documento según el catálogo 06 de SUNAT. */
export function siglaDocumento(codigo: string): string {
  return (
    ({ '6': 'RUC', '1': 'DNI', '4': 'CE', '7': 'PAS', '0': '—' } as Record<string, string>)[
      codigo
    ] ?? codigo
  );
}
