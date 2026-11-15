import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { ConsultaDni, Socio } from '../../core/modelos/api.modelos';
import { pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { SocioDetalle } from './socio-detalle';
import { SociosApi } from './socios.api';
import { SociosLista } from './socios-lista';

const SOCIO: Socio = {
  id: 's1',
  tipoDocumento: 'RUC',
  numeroDocumento: '20131312955',
  tipoPersona: 'JURIDICA',
  nombre: 'REPUESTOS DEL SUR SAC',
  nombreComercial: null,
  esCliente: false,
  esProveedor: true,
  email: 'ventas@sur.pe',
  telefono: null,
  observaciones: null,
  activo: true,
  bloqueado: false,
  motivoBloqueo: null,
  estadoSunat: 'ACTIVO',
  condicionSunat: 'HABIDO',
  agenteRetencion: null,
  agentePercepcion: null,
  buenContribuyente: null,
  fechaConsultaSunat: '2026-11-14T10:00:00Z',
  diasCreditoProveedor: 30,
  monedaProveedor: 'USD',
  plazoEntregaDias: 5,
  sujetoDetraccion: false,
  diasCreditoCliente: 0,
  limiteCredito: null,
  direcciones: [
    { tipo: 'FISCAL', direccion: 'Av. Ejército 101', ubigeo: '080101', referencia: null },
  ],
  contactos: [{ nombre: 'Ana', cargo: null, area: 'Ventas', email: 'ana@sur.pe', telefono: null }],
  cuentas: [
    { banco: 'BCP', tipo: 'CORRIENTE', moneda: 'PEN', numero: '191-1234567-0-11', cci: null },
  ],
  datosPersonalesOcultos: false,
  avisos: ['Falta el domicilio fiscal, que va en los comprobantes.'],
  creadoPor: 'admin',
  fechaCreacion: null,
  modificadoPor: 'admin',
  fechaModificacion: null,
};

const TODOS = [
  'socios:read',
  'socios:create',
  'socios:update',
  'socios:bloquear',
  'socios.datos-personales:read',
  'socios:consultar',
];

const NO_EXISTE = () => throwError(() => new HttpErrorResponse({ status: 404 }));

function apiFalsa() {
  return {
    listar: vi.fn(() =>
      of(
        pagina([
          {
            id: 's1',
            tipoDocumento: 'RUC',
            numeroDocumento: '20131312955',
            nombre: 'REPUESTOS DEL SUR SAC',
            nombreComercial: 'Sur',
            esCliente: true,
            esProveedor: true,
            condicionSunat: 'NO HABIDO',
            activo: true,
            bloqueado: true,
          },
        ]),
      ),
    ),
    obtener: vi.fn(() => of(SOCIO)),
    porDocumento: vi.fn((): Observable<Socio> => NO_EXISTE()),
    catalogos: vi.fn(() =>
      of({
        tiposDocumento: [
          { valor: 'SIN_DOCUMENTO', codigo: '0', descripcion: 'Sin documento' },
          { valor: 'DNI', codigo: '1', descripcion: 'DNI' },
          { valor: 'RUC', codigo: '6', descripcion: 'RUC' },
          { valor: 'PASAPORTE', codigo: '7', descripcion: 'Pasaporte' },
        ],
        bancos: ['BCP', 'BANCO DE LA NACION'],
      }),
    ),
    crear: vi.fn(() => of({ ...SOCIO, id: 'nuevo' })),
    actualizar: vi.fn(() => of(SOCIO)),
    cambiarEstado: vi.fn(() => of({ ...SOCIO, bloqueado: true, motivoBloqueo: 'Deuda' })),
    actualizarSunat: vi.fn(() => of({ ...SOCIO, condicionSunat: 'NO HABIDO' })),
    consultarRuc: vi.fn(() =>
      of({
        ruc: '20131312955',
        tipoPersona: 'JURIDICA',
        dniVinculado: null,
        estadoConsulta: 'ENCONTRADO',
        mensaje: null,
        razonSocial: 'SUNAT',
        nombreComercial: null,
        estado: 'ACTIVO',
        condicion: 'HABIDO',
        direccion: 'AV. GARCILASO 1472',
        ubigeo: '150101',
        departamento: 'LIMA',
        provincia: 'LIMA',
        distrito: 'LIMA',
        advertencias: ['El domicilio fiscal figura como NO HABIDO.'],
      }),
    ),
    consultarDni: vi.fn((): Observable<ConsultaDni> =>
      of({
        dni: '46027897',
        estadoConsulta: 'ENCONTRADO',
        mensaje: null,
        nombreCompleto: 'LUIS QUISPE MAMANI',
      }),
    ),
  };
}

function configurar(permisos = TODOS) {
  const api = apiFalsa();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      sesionFalsa(permisos).proveedor,
      { provide: SociosApi, useValue: api },
    ],
  });
  return api;
}

async function crear<T>(componente: Type<T>, entradas: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(componente);
  for (const [k, v] of Object.entries(entradas)) fixture.componentRef.setInput(k, v);
  const html = fixture.nativeElement as HTMLElement;
  const estable = async () => {
    for (let i = 0; i < 3; i++) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
  };
  await estable();
  const escribir = (sel: string, v: string) => {
    const el = html.querySelector<HTMLInputElement | HTMLSelectElement>(sel);
    if (!el) throw new Error(sel);
    el.value = v;
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input'));
  };
  const boton = (texto: string) =>
    [...html.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto);
  return { html, estable, escribir, boton };
}

describe('SociosApi (contrato)', () => {
  it('usa las rutas del backend', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(SociosApi);
    const http = TestBed.inject(HttpTestingController);
    const espera = (metodo: string, url: string, cuerpo?: unknown) => {
      const r = http.expectOne((x) => x.urlWithParams === url);
      expect(r.request.method).toBe(metodo);
      if (cuerpo !== undefined) expect(r.request.body).toEqual(cuerpo);
      r.flush({});
    };
    api.listar({ texto: ' sur ', rol: 'PROVEEDOR', activo: true, pagina: 0 }).subscribe();
    espera('GET', '/api/v1/socios?texto=sur&rol=PROVEEDOR&activo=true&pagina=0');
    api.obtener('s1').subscribe();
    espera('GET', '/api/v1/socios/s1');
    api.porDocumento('RUC', ' 20131312955 ').subscribe();
    espera('GET', '/api/v1/socios/documento/RUC/20131312955');
    api.catalogos().subscribe();
    espera('GET', '/api/v1/socios/catalogos');
    api.cambiarEstado('s1', { activo: true, bloqueado: true, motivoBloqueo: 'x' }).subscribe();
    espera('PATCH', '/api/v1/socios/s1/estado', {
      activo: true,
      bloqueado: true,
      motivoBloqueo: 'x',
    });
    api.actualizarSunat('s1').subscribe();
    espera('POST', '/api/v1/socios/s1/actualizar-sunat');
    api.consultarRuc('20131312955').subscribe();
    espera('GET', '/api/v1/socios/consulta/ruc/20131312955');
    api.consultarDni('46027897').subscribe();
    espera('GET', '/api/v1/socios/consulta/dni/46027897');
    http.verify();
  });
});

describe('SociosLista', () => {
  it('lista con tipo, condición SUNAT y bloqueo, y filtra por rol', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(SociosLista);
    expect(html.textContent).toContain('RUC 20131312955');
    expect(html.textContent).toContain('NO HABIDO');
    expect(html.textContent).toContain('Bloqueado');
    expect(html.textContent).toContain('Nuevo socio');
    escribir('#s-rol', 'PROVEEDOR');
    escribir('#s-estado', 'todos');
    boton('Buscar')?.click();
    await estable();
    expect(api.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ rol: 'PROVEEDOR', activo: null }),
    );
  });

  it('muestra errores y oculta crear sin permiso', async () => {
    const api = configurar(['socios:read']);
    api.listar.mockReturnValue(throwError(() => new Error('x')));
    const { html } = await crear(SociosLista);
    expect(html.querySelector('[role=alert]')).not.toBeNull();
    expect(html.textContent).not.toContain('Nuevo socio');
  });
});

describe('SocioDetalle', () => {
  it('consulta el RUC, completa razón social y domicilio fiscal, y registra', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(SocioDetalle);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(html.querySelector('#so-tipo option[value=SIN_DOCUMENTO]')).toBeNull();
    escribir('#so-numero', '20131312955');
    boton('Consultar')?.click();
    await estable();
    expect(api.porDocumento).toHaveBeenCalledWith('RUC', '20131312955');
    expect(html.querySelector<HTMLInputElement>('#so-nombre')?.value).toBe('SUNAT');
    expect(html.querySelector<HTMLInputElement>('#so-dd-0')?.value).toBe('AV. GARCILASO 1472');
    expect(html.textContent).toContain('NO HABIDO');
    boton('+ Cuenta')?.click();
    await estable();
    escribir('#so-kt-0', 'DETRACCIONES');
    await estable();
    expect(html.querySelector<HTMLInputElement>('#so-kb-0')?.value).toBe('BANCO DE LA NACION');
    escribir('#so-kn-0', '00-123-456789');
    boton('Registrar socio')?.click();
    await estable();
    expect(api.crear).toHaveBeenCalledWith(
      'RUC',
      '20131312955',
      expect.objectContaining({
        nombre: 'SUNAT',
        esProveedor: true,
        direcciones: [
          { tipo: 'FISCAL', direccion: 'AV. GARCILASO 1472', ubigeo: '150101', referencia: null },
        ],
        cuentas: [
          {
            banco: 'BANCO DE LA NACION',
            tipo: 'DETRACCIONES',
            moneda: 'PEN',
            numero: '00-123-456789',
            cci: null,
          },
        ],
      }),
    );
    expect(navegar).toHaveBeenCalledWith(['/socios', 'nuevo']);
  });

  it('si el documento ya está registrado no consulta y ofrece abrirlo', async () => {
    const api = configurar();
    api.porDocumento.mockReturnValue(of(SOCIO));
    const { html, escribir, boton, estable } = await crear(SocioDetalle);
    escribir('#so-numero', '20131312955');
    boton('Consultar')?.click();
    await estable();
    expect(html.textContent).toContain('Ya está registrado como REPUESTOS DEL SUR SAC');
    expect(api.consultarRuc).not.toHaveBeenCalled();
  });

  it('consulta el DNI y avisa cuando hay que cargar a mano', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(SocioDetalle);
    escribir('#so-tipo', 'DNI');
    escribir('#so-numero', '46027897');
    boton('Consultar')?.click();
    await estable();
    expect(html.querySelector<HTMLInputElement>('#so-nombre')?.value).toBe('LUIS QUISPE MAMANI');
    api.consultarDni.mockReturnValue(
      of({
        dni: '1',
        estadoConsulta: 'SIN_SERVICIO',
        mensaje: 'Ingrese los datos manualmente.',
        nombreCompleto: null,
      }),
    );
    boton('Consultar')?.click();
    await estable();
    expect(html.textContent).toContain('Ingrese los datos manualmente.');
    escribir('#so-tipo', 'PASAPORTE');
    boton('Consultar')?.click();
    await estable();
    expect(html.textContent).toContain('no se consulta');
  });

  it('edita, actualiza SUNAT y bloquea con motivo', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(SocioDetalle, { id: 's1' });
    expect(html.querySelector<HTMLInputElement>('#so-numero')?.disabled).toBe(true);
    expect(html.textContent).toContain('Falta el domicilio fiscal');
    expect(html.textContent).toContain('No informado');
    escribir('#so-nombre', 'REPUESTOS DEL SUR S.A.C.');
    boton('Guardar cambios')?.click();
    await estable();
    expect(api.actualizar).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({
        nombre: 'REPUESTOS DEL SUR S.A.C.',
        diasCreditoProveedor: 30,
        monedaProveedor: 'USD',
      }),
    );
    boton('Actualizar desde SUNAT')?.click();
    await estable();
    expect(api.actualizarSunat).toHaveBeenCalledWith('s1');
    html.querySelector<HTMLInputElement>('input[formcontrolname=bloqueado]')?.click();
    await estable();
    escribir('#so-motivo', 'Deuda');
    boton('Guardar estado')?.click();
    await estable();
    expect(api.cambiarEstado).toHaveBeenCalledWith('s1', {
      activo: true,
      bloqueado: true,
      motivoBloqueo: 'Deuda',
    });
  });

  it('sin permiso de datos personales no muestra contactos ni cuentas', async () => {
    const api = configurar(['socios:read', 'socios:update']);
    api.obtener.mockReturnValue(
      of({ ...SOCIO, contactos: [], cuentas: [], email: null, datosPersonalesOcultos: true }),
    );
    const { html } = await crear(SocioDetalle, { id: 's1' });
    expect(html.querySelector('#so-email')).toBeNull();
    expect(html.textContent).toContain('datos personales');
    expect(html.textContent).not.toContain('Guardar estado');
    expect(html.textContent).not.toContain('Actualizar desde SUNAT');
  });

  it('muestra los errores de la API', async () => {
    const api = configurar();
    api.crear.mockReturnValue(throwError(() => new Error('409')));
    const { html, escribir, boton, estable } = await crear(SocioDetalle);
    escribir('#so-numero', '20131312955');
    escribir('#so-nombre', 'X');
    escribir('#so-dd-0', 'Calle 1');
    boton('Registrar socio')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});
