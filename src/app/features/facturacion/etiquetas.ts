import {
  EstadoComprobante,
  ModalidadTransporte,
  MotivoNotaCredito,
  MotivoTraslado,
  TipoComprobanteEmitido,
} from '../../core/modelos/api.modelos';

export const NOMBRE_TIPO: Record<TipoComprobanteEmitido, string> = {
  BOLETA: 'Boleta',
  FACTURA: 'Factura',
  NOTA_CREDITO: 'Nota de crédito',
  GUIA_REMISION: 'Guía de remisión',
};

/** Catálogo 20 de SUNAT (los que emite el sistema). */
export const MOTIVO_TRASLADO: Record<MotivoTraslado, string> = {
  '01': 'Venta',
  '04': 'Traslado entre establecimientos',
  '13': 'Otros',
};

/** Catálogo 18 de SUNAT. */
export const MODALIDAD_TRANSPORTE: Record<ModalidadTransporte, string> = {
  '01': 'Transporte público',
  '02': 'Transporte privado',
};

/** Texto y estilo de cada estado frente a SUNAT. */
export const ESTADO_COMPROBANTE: Record<EstadoComprobante, { texto: string; clase: string }> = {
  PENDIENTE_ENVIO: { texto: 'Pendiente de envío', clase: 'insignia-alerta' },
  ENVIADO: { texto: 'Enviado, espera a SUNAT', clase: 'insignia-neutra' },
  ACEPTADO: { texto: 'Aceptado', clase: 'insignia-ok' },
  OBSERVADO: { texto: 'Aceptado con observaciones', clase: 'insignia-ok' },
  RECHAZADO: { texto: 'Rechazado', clase: 'insignia bg-red-100 text-red-800' },
  ERROR: { texto: 'Error de datos', clase: 'insignia bg-red-100 text-red-800' },
};

/** Catálogo 09 de SUNAT (los que admite la devolución en caja). */
export const MOTIVO_NOTA: Record<MotivoNotaCredito, string> = {
  '01': 'Anulación de la operación',
  '06': 'Devolución total',
  '07': 'Devolución por ítem',
};
