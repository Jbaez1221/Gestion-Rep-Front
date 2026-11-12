import { HttpParams } from '@angular/common/http';

type ValorParametro = string | number | boolean | null | undefined;

/** Query params sin los filtros vacíos. */
export function aParametros(valores: Record<string, ValorParametro>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor !== null && valor !== undefined && valor !== '') {
      params = params.set(clave, String(valor));
    }
  }
  return params;
}

/** Inicio del día en hora de Lima (UTC-5), como instante UTC para la API. */
export function inicioDelDiaLima(fecha: string): string | null {
  return fecha ? new Date(`${fecha}T00:00:00-05:00`).toISOString() : null;
}

/** Inicio del día siguiente: el filtro "hasta" incluye el día elegido completo. */
export function finDelDiaLima(fecha: string): string | null {
  if (!fecha) {
    return null;
  }
  const inicio = new Date(`${fecha}T00:00:00-05:00`);
  return new Date(inicio.getTime() + 24 * 60 * 60 * 1000).toISOString();
}
