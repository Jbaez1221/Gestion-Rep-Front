import { HttpErrorResponse } from '@angular/common/http';

/** Error de la API según RFC 9457, con el código que el backend agrega para el front. */
export interface Problema {
  readonly status: number;
  readonly title: string;
  readonly detail?: string;
  readonly codigo?: string;
  readonly requestId?: string;
}

const SIN_CONEXION: Problema = {
  status: 0,
  title: 'Sin conexión',
  detail: 'No se pudo contactar al servidor. Revise su conexión e intente de nuevo.',
};

const INESPERADO: Problema = {
  status: 500,
  title: 'Error inesperado',
  detail: 'Ocurrió un error inesperado. Si persiste, comunique el código de la petición a soporte.',
};

export function aProblema(error: unknown): Problema {
  if (!(error instanceof HttpErrorResponse)) {
    return INESPERADO;
  }
  if (error.status === 0) {
    return SIN_CONEXION;
  }
  const cuerpo: unknown = error.error;
  if (esProblema(cuerpo)) {
    return {
      status: cuerpo.status,
      title: cuerpo.title,
      detail: cuerpo.detail,
      codigo: cuerpo.codigo,
      requestId: cuerpo.requestId ?? error.headers.get('X-Request-Id') ?? undefined,
    };
  }
  return {
    ...INESPERADO,
    status: error.status,
    requestId: error.headers.get('X-Request-Id') ?? undefined,
  };
}

function esProblema(valor: unknown): valor is Problema {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    typeof (valor as Problema).status === 'number' &&
    typeof (valor as Problema).title === 'string'
  );
}
