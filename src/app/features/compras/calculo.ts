import {
  AfectacionCompra,
  EstadoOrden,
  EstadoRecepcion,
  EstadoSunatCompra,
  TipoComprobante,
} from '../../core/modelos/api.modelos';

/** IGV (16 %) más el Impuesto de Promoción Municipal (2 %). */
export const TASA_IGV = 0.18;

export interface Importe {
  valorVenta: number;
  igv: number;
  total: number;
}

/** Redondeo a céntimos sin los errores de coma flotante (1.005 → 1.01). */
export function centimos(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Importe de una línea como lo calcula el backend (y SUNAT): el IGV por línea, redondeado a
 * céntimos. Con {@code incluyeIgv} el precio ya trae el IGV (como en una boleta).
 */
export function importeLinea(
  cantidad: number,
  precio: number,
  afectacion: AfectacionCompra,
  incluyeIgv: boolean,
): Importe {
  const bruto = centimos(cantidad * precio);
  if (afectacion !== 'GRAVADO') return { valorVenta: bruto, igv: 0, total: bruto };
  if (incluyeIgv) {
    const valor = centimos(bruto / (1 + TASA_IGV));
    return { valorVenta: valor, igv: centimos(bruto - valor), total: bruto };
  }
  const igv = centimos(bruto * TASA_IGV);
  return { valorVenta: bruto, igv, total: centimos(bruto + igv) };
}

export interface Totales {
  gravado: number;
  exonerado: number;
  inafecto: number;
  igv: number;
  total: number;
}

export function totales(lineas: (Importe & { afectacion: AfectacionCompra })[]): Totales {
  const t: Totales = { gravado: 0, exonerado: 0, inafecto: 0, igv: 0, total: 0 };
  for (const l of lineas) {
    if (l.afectacion === 'GRAVADO') t.gravado = centimos(t.gravado + l.valorVenta);
    else if (l.afectacion === 'EXONERADO') t.exonerado = centimos(t.exonerado + l.valorVenta);
    else t.inafecto = centimos(t.inafecto + l.valorVenta);
    t.igv = centimos(t.igv + l.igv);
  }
  t.total = centimos(t.gravado + t.exonerado + t.inafecto + t.igv);
  return t;
}

export const NOMBRE_COMPROBANTE: Record<TipoComprobante, string> = {
  FACTURA: 'Factura',
  BOLETA: 'Boleta',
  NOTA_CREDITO: 'Nota de crédito',
  NOTA_DEBITO: 'Nota de débito',
};

/** Estado del comprobante del proveedor en la consulta integrada de SUNAT. */
export const ESTADO_SUNAT_COMPRA: Record<EstadoSunatCompra, string> = {
  ACEPTADO: 'Aceptado',
  ANULADO: 'Anulado',
  NO_EXISTE: 'No existe',
  AUTORIZADO: 'Autorizado (impreso)',
  NO_AUTORIZADO: 'No autorizado',
};

export const NOMBRE_ESTADO_ORDEN: Record<EstadoOrden, string> = {
  BORRADOR: 'Borrador',
  EMITIDA: 'Emitida',
  PARCIAL: 'Recibida en parte',
  RECIBIDA: 'Recibida',
  CERRADA: 'Cerrada',
  ANULADA: 'Anulada',
};

export function claseEstadoOrden(estado: EstadoOrden): string {
  if (estado === 'ANULADA' || estado === 'CERRADA') return 'insignia-neutra';
  if (estado === 'BORRADOR') return 'insignia-alerta';
  return 'insignia-ok';
}

export const NOMBRE_ESTADO_RECEPCION: Record<EstadoRecepcion, string> = {
  PENDIENTE: 'Espera factura',
  FACTURADA: 'Facturada',
  ANULADA: 'Anulada',
};

export function claseEstadoRecepcion(estado: EstadoRecepcion): string {
  if (estado === 'PENDIENTE') return 'insignia-alerta';
  return estado === 'FACTURADA' ? 'insignia-ok' : 'insignia-neutra';
}
