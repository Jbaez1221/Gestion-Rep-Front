import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { SesionService } from './sesion.service';
import { autenticadoGuard, invitadoGuard, permisoGuard } from './guards';
import { perfilDePrueba } from '../../testing/sesion-falsa';

describe('guards', () => {
  const ruta = (data: Record<string, unknown> = {}) =>
    ({ data }) as unknown as ActivatedRouteSnapshot;
  const estado = (url: string) => ({ url }) as RouterStateSnapshot;

  function configurar(perfil: ReturnType<typeof perfilDePrueba> | null, permisos: string[] = []) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: SesionService,
          useValue: {
            asegurarPerfil: () => Promise.resolve(perfil),
            tieneAlguno: (...ps: string[]) => ps.some((p) => permisos.includes(p)),
          },
        },
      ],
    });
    return TestBed.inject(Router);
  }

  const ejecutar = (guard: typeof autenticadoGuard, r = ruta(), e = estado('/')) =>
    TestBed.runInInjectionContext(() => guard(r, e)) as
      Promise<boolean | UrlTree> | boolean | UrlTree;

  it('sin sesión manda al login recordando la ruta', async () => {
    const router = configurar(null);
    const resultado = (await ejecutar(autenticadoGuard, ruta(), estado('/usuarios'))) as UrlTree;
    expect(router.serializeUrl(resultado)).toBe('/login?volver=%2Fusuarios');
  });

  it('con contraseña provisional solo deja ir a cambiarla', async () => {
    const router = configurar(perfilDePrueba({ requiereCambioPassword: true }));
    const resultado = (await ejecutar(autenticadoGuard, ruta(), estado('/inicio'))) as UrlTree;
    expect(router.serializeUrl(resultado)).toBe('/cambiar-password');
    expect(await ejecutar(autenticadoGuard, ruta(), estado('/cambiar-password'))).toBe(true);
  });

  it('con sesión normal deja pasar', async () => {
    configurar(perfilDePrueba());
    expect(await ejecutar(autenticadoGuard, ruta(), estado('/inicio'))).toBe(true);
  });

  it('exige alguno de los permisos de la ruta', () => {
    const router = configurar(perfilDePrueba(), ['roles:read']);
    expect(ejecutar(permisoGuard, ruta({ permisos: ['roles:read'] }))).toBe(true);
    expect(ejecutar(permisoGuard, ruta())).toBe(true);
    expect(
      router.serializeUrl(ejecutar(permisoGuard, ruta({ permisos: ['usuarios:read'] })) as UrlTree),
    ).toBe('/');
  });

  it('el login redirige al inicio si ya hay sesión', async () => {
    const router = configurar(perfilDePrueba());
    expect(router.serializeUrl((await ejecutar(invitadoGuard)) as UrlTree)).toBe('/');
  });

  it('el login se muestra si no hay sesión', async () => {
    configurar(null);
    expect(await ejecutar(invitadoGuard)).toBe(true);
  });
});
