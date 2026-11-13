import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuditoriaApi } from './auditoria/auditoria.api';
import { RolesApi } from './roles/roles.api';
import { SucursalesApi } from './sucursales/sucursales.api';
import { UsuariosApi } from './usuarios/usuarios.api';

describe('servicios de API (contrato con Repuestos-Back)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function espera(metodo: string, url: string, cuerpo?: unknown, respuesta: object = {}) {
    const req = http.expectOne((r) => r.urlWithParams === url);
    expect(req.request.method).toBe(metodo);
    if (cuerpo !== undefined) {
      expect(req.request.body).toEqual(cuerpo);
    }
    req.flush(respuesta);
  }

  it('sucursales y almacenes', () => {
    const api = TestBed.inject(SucursalesApi);
    const datos = {
      nombre: 'X',
      tipo: 'TIENDA' as const,
      direccion: null,
      ubigeo: null,
      telefono: null,
      codigoEstablecimientoSunat: null,
    };
    api.listar({ texto: 'cus', activa: true, pagina: 1 }).subscribe();
    espera('GET', '/api/v1/sucursales?texto=cus&activa=true&pagina=1');
    api.obtener('s1').subscribe();
    espera('GET', '/api/v1/sucursales/s1');
    api.crear({ ...datos, codigo: 'C1' }).subscribe();
    espera('POST', '/api/v1/sucursales', { ...datos, codigo: 'C1' });
    api.actualizar('s1', datos).subscribe();
    espera('PUT', '/api/v1/sucursales/s1', datos);
    api.cambiarEstado('s1', false).subscribe();
    espera('PATCH', '/api/v1/sucursales/s1/estado', { activo: false });
    api.almacenes('s1').subscribe();
    espera('GET', '/api/v1/sucursales/s1/almacenes', undefined, []);
    api.crearAlmacen('s1', 'A1', 'Mermas').subscribe();
    espera('POST', '/api/v1/sucursales/s1/almacenes', { codigo: 'A1', nombre: 'Mermas' });
    api.renombrarAlmacen('a1', 'Nuevo').subscribe();
    espera('PUT', '/api/v1/almacenes/a1', { nombre: 'Nuevo' });
    api.cambiarEstadoAlmacen('a1', true).subscribe();
    espera('PATCH', '/api/v1/almacenes/a1/estado', { activo: true });
    api.marcarPrincipal('a1').subscribe();
    espera('POST', '/api/v1/almacenes/a1/principal');
  });

  it('usuarios', () => {
    const api = TestBed.inject(UsuariosApi);
    const base = {
      email: 'a@b.c',
      nombres: 'A',
      apellidos: 'B',
      tipoDocumento: null,
      numeroDocumento: null,
      rolId: 'r1',
      sucursalIds: ['s1'],
    };
    api.listar({ texto: 'ana', activo: false }).subscribe();
    espera('GET', '/api/v1/usuarios?texto=ana&activo=false');
    api.obtener('u1').subscribe();
    espera('GET', '/api/v1/usuarios/u1');
    api.crear({ ...base, username: 'ana' }).subscribe();
    espera('POST', '/api/v1/usuarios', { ...base, username: 'ana' });
    api.actualizar('u1', { ...base, activo: true, bloqueado: false }).subscribe();
    espera('PUT', '/api/v1/usuarios/u1', { ...base, activo: true, bloqueado: false });
    api.desactivar('u1').subscribe();
    espera('DELETE', '/api/v1/usuarios/u1');
    let clave = '';
    api.restablecerPassword('u1', 'ana').subscribe((c) => (clave = c));
    espera(
      'POST',
      '/api/v1/usuarios/u1/password/restablecer',
      { confirmacionUsername: 'ana' },
      { passwordProvisional: 'Abc123' },
    );
    expect(clave).toBe('Abc123');
  });

  it('roles y permisos', () => {
    const api = TestBed.inject(RolesApi);
    api.listar().subscribe();
    espera('GET', '/api/v1/roles', undefined, []);
    api.permisos().subscribe();
    espera('GET', '/api/v1/permisos', undefined, []);
    api.crear('CAJERO', null).subscribe();
    espera('POST', '/api/v1/roles', { nombre: 'CAJERO', descripcion: null });
    api.actualizar('r1', 'CAJERO', 'Caja').subscribe();
    espera('PUT', '/api/v1/roles/r1', { nombre: 'CAJERO', descripcion: 'Caja' });
    api.eliminar('r1').subscribe();
    espera('DELETE', '/api/v1/roles/r1');
    api.asignarPermisos('r1', ['sucursales:read']).subscribe();
    espera('PUT', '/api/v1/roles/r1/permisos', { permisos: ['sucursales:read'] });
  });

  it('auditoría', () => {
    const api = TestBed.inject(AuditoriaApi);
    api.cambios({ entidad: 'Sucursal', operacion: '', pagina: 0 }).subscribe();
    espera('GET', '/api/v1/auditoria/cambios?entidad=Sucursal&pagina=0');
    api.eventos({ tipo: 'LOGIN_FALLIDO', desde: '2026-11-10T05:00:00.000Z' }).subscribe();
    espera('GET', '/api/v1/auditoria/eventos?tipo=LOGIN_FALLIDO&desde=2026-11-10T05:00:00.000Z');
    api.flujo('FACTURA', 'F1').subscribe();
    espera('GET', '/api/v1/auditoria/flujo?tipo=FACTURA&id=F1');
  });
});
