import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { sesionFalsa } from '../../testing/sesion-falsa';
import { HEADER_SUCURSAL, sesionInterceptor } from './sesion.interceptor';

describe('sesionInterceptor', () => {
  function configurar(renovar: () => unknown) {
    const { falsa, proveedor } = sesionFalsa();
    const sesion = Object.assign(falsa, {
      renovar: vi.fn(renovar),
      expirada: vi.fn(() => Promise.resolve()),
    });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sesionInterceptor])),
        provideHttpClientTesting(),
        { ...proveedor, useValue: sesion },
      ],
    });
    return {
      sesion,
      http: TestBed.inject(HttpClient),
      controlador: TestBed.inject(HttpTestingController),
    };
  }

  it('envía la sucursal activa en las llamadas a la API', () => {
    const { http, controlador } = configurar(() => of(null));
    http.get('/api/v1/sucursales').subscribe();
    expect(controlador.expectOne('/api/v1/sucursales').request.headers.get(HEADER_SUCURSAL)).toBe(
      's-1',
    );
    http.get('https://otro.example/x').subscribe();
    expect(
      controlador.expectOne('https://otro.example/x').request.headers.has(HEADER_SUCURSAL),
    ).toBe(false);
  });

  it('ante un 401 renueva la sesión y repite la petición una vez', () => {
    const { http, controlador, sesion } = configurar(() => of(null));
    let respuesta: unknown;
    http.get('/api/v1/roles').subscribe((r) => (respuesta = r));
    controlador.expectOne('/api/v1/roles').flush(null, { status: 401, statusText: 'Unauthorized' });
    controlador.expectOne('/api/v1/roles').flush(['ok']);
    expect(sesion.renovar).toHaveBeenCalledTimes(1);
    expect(respuesta).toEqual(['ok']);
  });

  it('si la renovación falla con sesión activa, la da por expirada', () => {
    const { http, controlador, sesion } = configurar(() =>
      throwError(() => new Error('refresh inválido')),
    );
    let error: unknown;
    http.get('/api/v1/roles').subscribe({ error: (e: unknown) => (error = e) });
    controlador.expectOne('/api/v1/roles').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(sesion.expirada).toHaveBeenCalled();
    expect(error).toBeInstanceOf(Error);
  });

  it('sin perfil cargado no navega: decide el guard', () => {
    const { http, controlador, sesion } = configurar(() =>
      throwError(() => new Error('sin sesión')),
    );
    sesion.perfil.set(null);
    http.get('/api/v1/auth/me').subscribe({ error: () => undefined });
    controlador
      .expectOne('/api/v1/auth/me')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(sesion.expirada).not.toHaveBeenCalled();
  });

  it('no intenta renovar en el login ni en otros errores', () => {
    const { http, controlador, sesion } = configurar(() => of(null));
    http.post('/api/v1/auth/login', {}).subscribe({ error: () => undefined });
    controlador
      .expectOne('/api/v1/auth/login')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    http.get('/api/v1/roles').subscribe({ error: () => undefined });
    controlador.expectOne('/api/v1/roles').flush(null, { status: 403, statusText: 'Forbidden' });
    expect(sesion.renovar).not.toHaveBeenCalled();
  });
});
