import { Articulo } from '../../core/modelos/api.modelos';

/** La unidad base y las alternas del artículo: en las que se puede comprar. */
export function unidadesDe(a: Articulo): string[] {
  return [a.unidadBase.codigoSunat, ...a.unidadesAlternas.map((u) => u.unidadSunat)];
}

/** Unidades base que trae una unidad del artículo. */
export function factorDe(a: Articulo, unidad: string): number {
  if (unidad === a.unidadBase.codigoSunat) return 1;
  return Number(a.unidadesAlternas.find((u) => u.unidadSunat === unidad)?.factor ?? 1);
}
