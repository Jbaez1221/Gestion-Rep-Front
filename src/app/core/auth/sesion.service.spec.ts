import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { perfilDePrueba } from '../../testing/sesion-falsa';
import { SesionService } from './sesion.service';

describe('SesionService', () => {
  let sesion: SesionService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    sesion = TestBed.inject(SesionService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  async function responderPerfil(perfil = perfilDePrueba({ permisos: ['usuarios:read'] })) {
    await Promise.resolve();
    http.expectOne('/api/v1/auth/me').flush(perfil);
  }

  it('el login carga el perfil y elige la primera sucursal', async () => {
    const promesa = sesion.login('admin', 'clave');
    const login = http.expectOne('/api/v1/auth/login');
    expect(login.request.body).toEqual({ username: 'admin', password: 'clave' });
    login.flush(null);
    await responderPerfil();
    await promesa;

    expect(sesion.autenticado()).toBe(true);
    expect(sesion.tiene('usuarios:read')).toBe(true);
    expect(sesion.tieneAlguno('roles:read', 'usuarios:read')).toBe(true);
    expect(sesion.tiene('roles:read')).toBe(false);
    expect(sesion.sucursalActiva()?.codigo).toBe('CUS01');
  });

  it('con acceso a todas las sucursales no elige ninguna por defecto', async () => {
    const promesa = sesion.cargarPerfil();
    await responderPerfil(perfilDePrueba({ todasLasSucursales: true }));
    await promesa;
    expect(sesion.sucursalActiva()).toBeNull();
    sesion.elegirSucursal('s-1');
    expect(sesion.sucursalActiva()?.id).toBe('s-1');
  });

  it('asegurarPerfil devuelve null si no hay sesión', async () => {
    const promesa = sesion.asegurarPerfil();
    await Promise.resolve();
    http.expectOne('/api/v1/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(await promesa).toBeNull();
  });

  it('asegurarPerfil no repite la consulta si ya hay perfil', async () => {
    const carga = sesion.cargarPerfil();
    await responderPerfil();
    await carga;
    expect(await sesion.asegurarPerfil()).not.toBeNull();
  });

  it('cambiar la contraseña recarga el perfil', async () => {
    const promesa = sesion.cambiarPassword('a', 'b', 'b');
    const cambio = http.expectOne('/api/v1/usuarios/me/password');
    expect(cambio.request.method).toBe('PATCH');
    cambio.flush(null);
    await responderPerfil(perfilDePrueba({ requiereCambioPassword: false }));
    await promesa;
    expect(sesion.requiereCambioPassword()).toBe(false);
  });

  it('varias renovaciones simultáneas hacen una sola petición', () => {
    let completadas = 0;
    sesion.renovar().subscribe(() => completadas++);
    sesion.renovar().subscribe(() => completadas++);
    http.expectOne('/api/v1/auth/refresh').flush(null);
    expect(completadas).toBe(2);
  });

  it('el logout limpia la sesión y vuelve al login', async () => {
    const promesa = sesion.logout();
    http.expectOne('/api/v1/auth/logout').flush(null);
    await promesa;
    expect(sesion.autenticado()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('una sesión expirada vuelve al login recordando la ruta', async () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/usuarios');
    await sesion.expirada();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { volver: '/usuarios' },
    });
  });
});
