import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { SesionService } from '../auth/sesion.service';

export const HEADER_SUCURSAL = 'X-Sucursal-Id';
const REINTENTADA = new HttpContextToken<boolean>(() => false);
const RUTAS_SIN_RENOVACION = ['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/logout'];

/**
 * Envía la sucursal activa y, si el access token venció (401), renueva la sesión una vez con el
 * refresh token y repite la petición. Si la renovación falla con una sesión activa, esta terminó:
 * vuelve al login.
 */
export const sesionInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }
  const sesion = inject(SesionService);
  const sucursal = sesion.sucursalActiva()?.id;
  const peticion =
    sucursal && !req.headers.has(HEADER_SUCURSAL)
      ? req.clone({ setHeaders: { [HEADER_SUCURSAL]: sucursal } })
      : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      const renovable =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !peticion.context.get(REINTENTADA) &&
        !RUTAS_SIN_RENOVACION.some((r) => peticion.url.startsWith(r));
      if (!renovable) {
        return throwError(() => error);
      }
      return sesion.renovar().pipe(
        catchError((errorRenovacion: unknown) => {
          // Solo si había una sesión activa: en la carga inicial (sin perfil) decide el guard, y
          // navegar desde aquí cancelaría esa navegación.
          if (sesion.autenticado()) {
            void sesion.expirada();
          }
          return throwError(() => errorRenovacion);
        }),
        switchMap(() => next(peticion.clone({ context: peticion.context.set(REINTENTADA, true) }))),
      );
    }),
  );
};
