import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { aProblema } from './problema';

describe('aProblema', () => {
  it('lee el cuerpo RFC 9457 con el código del backend', () => {
    const error = new HttpErrorResponse({
      status: 403,
      error: {
        status: 403,
        title: 'Cambio de contraseña requerido',
        detail: 'Debe cambiar su contraseña provisional antes de continuar.',
        codigo: 'CAMBIO_PASSWORD_REQUERIDO',
        requestId: 'abc-12345678',
      },
    });
    expect(aProblema(error)).toEqual({
      status: 403,
      title: 'Cambio de contraseña requerido',
      detail: 'Debe cambiar su contraseña provisional antes de continuar.',
      codigo: 'CAMBIO_PASSWORD_REQUERIDO',
      requestId: 'abc-12345678',
    });
  });

  it('distingue la falta de conexión', () => {
    expect(aProblema(new HttpErrorResponse({ status: 0 })).title).toBe('Sin conexión');
  });

  it('ante un cuerpo desconocido da un mensaje genérico con el id de la petición', () => {
    const error = new HttpErrorResponse({
      status: 502,
      error: '<html>Bad Gateway</html>',
      headers: new HttpHeaders({ 'X-Request-Id': 'rid-12345678' }),
    });
    const problema = aProblema(error);
    expect(problema.status).toBe(502);
    expect(problema.title).toBe('Error inesperado');
    expect(problema.requestId).toBe('rid-12345678');
  });

  it('cualquier otra excepción es un error inesperado', () => {
    expect(aProblema(new Error('x')).status).toBe(500);
  });
});
