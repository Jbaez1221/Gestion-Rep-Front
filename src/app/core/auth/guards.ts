import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SesionService } from './sesion.service';

/** Exige sesión; con contraseña provisional solo deja entrar a la pantalla para cambiarla. */
export const autenticadoGuard: CanActivateFn = async (_ruta, estado) => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  const perfil = await sesion.asegurarPerfil();
  if (!perfil) {
    return router.createUrlTree(['/login'], {
      queryParams: estado.url && estado.url !== '/' ? { volver: estado.url } : {},
    });
  }
  if (perfil.requiereCambioPassword && !estado.url.startsWith('/cambiar-password')) {
    return router.createUrlTree(['/cambiar-password']);
  }
  return true;
};

/** Exige al menos uno de los permisos de `data.permisos`. Es solo UX: el backend decide de verdad. */
export const permisoGuard: CanActivateFn = (ruta) => {
  const sesion = inject(SesionService);
  const permisos = (ruta.data['permisos'] as string[] | undefined) ?? [];
  return permisos.length === 0 || sesion.tieneAlguno(...permisos)
    ? true
    : inject(Router).createUrlTree(['/']);
};

/** El login no tiene sentido con una sesión activa. */
export const invitadoGuard: CanActivateFn = async () => {
  // inject() solo funciona antes del primer await: después ya no hay contexto de inyección.
  const sesion = inject(SesionService);
  const router = inject(Router);
  return (await sesion.asegurarPerfil()) ? router.createUrlTree(['/']) : true;
};
