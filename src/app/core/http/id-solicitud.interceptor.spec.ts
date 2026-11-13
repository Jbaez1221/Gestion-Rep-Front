import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { HEADER_ID_SOLICITUD, idSolicitudInterceptor } from './id-solicitud.interceptor';

describe('idSolicitudInterceptor', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([idSolicitudInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controlador.verify());

  it('agrega un id único a cada llamada a la API', () => {
    http.get('/api/v1/sucursales').subscribe();
    http.get('/api/v1/sucursales').subscribe();
    const [primera, segunda] = controlador.match('/api/v1/sucursales');
    const id1 = primera?.request.headers.get(HEADER_ID_SOLICITUD);
    expect(id1).toMatch(/^[0-9a-f-]{36}$/);
    expect(segunda?.request.headers.get(HEADER_ID_SOLICITUD)).not.toBe(id1);
  });

  it('no lo envía a otros orígenes', () => {
    http.get('https://otro.example/recurso').subscribe();
    const peticion = controlador.expectOne('https://otro.example/recurso');
    expect(peticion.request.headers.has(HEADER_ID_SOLICITUD)).toBe(false);
  });

  it('respeta un id ya presente', () => {
    http.get('/api/v1/x', { headers: { [HEADER_ID_SOLICITUD]: 'fijo-12345678' } }).subscribe();
    expect(controlador.expectOne('/api/v1/x').request.headers.get(HEADER_ID_SOLICITUD)).toBe(
      'fijo-12345678',
    );
  });
});
