import { HttpInterceptorFn } from '@angular/common/http';

export const HEADER_ID_SOLICITUD = 'X-Request-Id';

/**
 * Identifica cada llamada a la API con el mismo id que el backend escribe en sus logs y en la
 * auditoría: un error reportado desde la pantalla se puede rastrear en el servidor.
 */
export const idSolicitudInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/') || req.headers.has(HEADER_ID_SOLICITUD)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { [HEADER_ID_SOLICITUD]: crypto.randomUUID() } }));
};
