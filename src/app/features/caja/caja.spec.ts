import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Caja, PedidoPendiente, SesionCaja } from '../../core/modelos/api.modelos';
import { pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { FacturacionApi } from '../facturacion/facturacion.api';
import { CajaPagina } from './caja';
import { CajaOperar } from './caja-operar';
import { CajaApi } from './caja.api';
import { ConfiguracionCaja } from './configuracion-caja';
import { SesionDetalle } from './sesion-detalle';
import { SesionesLista } from './sesiones-lista';

const TODOS = [
  'caja:read',
  'caja:operar',
  'caja:configurar',
  'facturacion:read',
  'facturacion.series:update',
];

const CAJA: Caja = {
  id: 'cj1',
  codigo: 'C1',
  nombre: 'Caja 1',
  sucursalId: 's1',
  serieBoleta: 'B001',
  serieFactura: 'F001',
  activo: true,
  sesionAbierta: null,
};

const SESION: SesionCaja = {
  id: 'se1',
  numero: 'CJ-00000001',
  cajaId: 'cj1',
  caja: 'Caja 1',
  sucursalId: 's1',
  cajero: 'ana',
  apertura: '2026-11-15T13:00:00Z',
  montoApertura: 100,
  estado: 'ABIERTA',
  cierre: null,
  cobros: 1,
  totalCobrado: 33.2,
  porMedio: [{ medio: 'EFECTIVO', monto: 33.2 }],
  ingresos: 10,
  egresos: 20,
  efectivoEsperado: 123.2,
  efectivoContado: null,
  diferencia: null,
  observacionCierre: null,
  detalleCobros: [
    {
      id: 'co1',
      numero: 'CB-00000001',
      pedidoNumero: 'PV-00000001',
      tipoComprobante: 'BOLETA',
      comprobante: 'B001-00000001',
      comprobanteId: 'cv1',
      clienteNombre: 'CLIENTES VARIOS',
      total: 33.2,
      recibido: 50,
      vuelto: 16.8,
      pagos: [{ medio: 'EFECTIVO', monto: 50, referencia: null }],
      fecha: '2026-11-15T14:00:00Z',
      cajero: 'ana',
    },
  ],
  movimientos: [
    {
      id: 'm1',
      tipo: 'EGRESO',
      monto: 20,
      motivo: 'Útiles',
      fecha: '2026-11-15T15:00:00Z',
      usuario: 'ana',
    },
    {
      id: 'm2',
      tipo: 'INGRESO',
      monto: 10,
      motivo: 'Sencillo',
      fecha: '2026-11-15T15:10:00Z',
      usuario: 'ana',
    },
  ],
};

const PENDIENTE: PedidoPendiente = {
  id: 'p2',
  numero: 'PV-00000002',
  clienteDocumento: '20100070970',
  clienteNombre: 'TALLER SAC',
  tipoComprobante: 'FACTURA',
  vendedor: 'luis',
  total: 33.2,
  lineas: [
    {
      codigo: 'FIL-1',
      descripcion: 'Filtro',
      unidad: 'NIU',
      cantidad: 2,
      precioUnitario: 16.6,
      total: 33.2,
    },
  ],
};

function configurar(permisos = TODOS, abierta: SesionCaja | null = SESION) {
  const api = {
    cajas: vi.fn(() =>
      of([
        CAJA,
        {
          ...CAJA,
          id: 'cj2',
          nombre: 'Caja 2',
          codigo: 'C2',
          sesionAbierta: 'luis',
          activo: false,
        },
      ]),
    ),
    crearCaja: vi.fn(() => of(CAJA)),
    actualizarCaja: vi.fn(() => of(CAJA)),
    actual: vi.fn(() => of(abierta)),
    abrir: vi.fn(() => of(SESION)),
    sesiones: vi.fn(() =>
      of(
        pagina([
          {
            id: 'se1',
            numero: 'CJ-00000001',
            caja: 'Caja 1',
            cajero: 'ana',
            apertura: SESION.apertura,
            cierre: null,
            estado: 'ABIERTA',
            diferencia: null,
          },
          {
            id: 'se0',
            numero: 'CJ-00000000',
            caja: null,
            cajero: 'luis',
            apertura: SESION.apertura,
            cierre: SESION.apertura,
            estado: 'CERRADA',
            diferencia: -0.2,
          },
        ]),
      ),
    ),
    sesion: vi.fn(() =>
      of({
        ...SESION,
        estado: 'CERRADA',
        efectivoContado: 123,
        diferencia: -0.2,
        observacionCierre: 'Faltan céntimos',
      }),
    ),
    pendientes: vi.fn(() => of([PENDIENTE])),
    cobrar: vi.fn(() =>
      of({
        ...SESION.detalleCobros[0],
        comprobante: 'F001-00000001',
        tipoComprobante: 'FACTURA',
        vuelto: 6.8,
      }),
    ),
    movimiento: vi.fn(() => of({})),
    cerrar: vi.fn(() => of({ ...SESION, estado: 'CERRADA' })),
  };
  const facturacion = {
    series: vi.fn(() =>
      of([
        {
          serie: 'B001',
          tipo: 'BOLETA',
          sucursalId: 's1',
          sucursal: 'Cusco',
          ultimoNumero: 5,
          activo: true,
        },
        {
          serie: 'F001',
          tipo: 'FACTURA',
          sucursalId: 's1',
          sucursal: 'Cusco',
          ultimoNumero: 2,
          activo: true,
        },
        {
          serie: 'B002',
          tipo: 'BOLETA',
          sucursalId: 's1',
          sucursal: null,
          ultimoNumero: 0,
          activo: false,
        },
      ]),
    ),
    crearSerie: vi.fn(() => of({})),
    estadoSerie: vi.fn(() => of({})),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      sesionFalsa(permisos, { sucursales: [{ id: 's1', codigo: 'CUS01', nombre: 'Cusco' }] })
        .proveedor,
      { provide: CajaApi, useValue: api },
      { provide: FacturacionApi, useValue: facturacion },
    ],
  });
  return { api, facturacion };
}

async function crear<T>(componente: Type<T>, entradas: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(componente);
  for (const [k, v] of Object.entries(entradas)) fixture.componentRef.setInput(k, v);
  const html = fixture.nativeElement as HTMLElement;
  const estable = async () => {
    for (let i = 0; i < 5; i++) {
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
    [...html.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(texto));
  return { fixture, html, estable, escribir, boton };
}

describe('CajaApi (contrato)', () => {
  it('usa las rutas del backend', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(CajaApi);
    const http = TestBed.inject(HttpTestingController);
    const espera = (metodo: string, url: string, cuerpo?: unknown, status = 200) => {
      const r = http.expectOne((x) => x.urlWithParams === url);
      expect(r.request.method).toBe(metodo);
      if (cuerpo !== undefined) expect(r.request.body).toEqual(cuerpo);
      r.flush(status === 204 ? null : {}, { status, statusText: 'OK' });
    };
    let actual: unknown = 'sin respuesta';
    api.actual().subscribe((s) => (actual = s));
    espera('GET', '/api/v1/caja/sesiones/actual', undefined, 204);
    expect(actual).toBeNull();
    api.cajas().subscribe();
    espera('GET', '/api/v1/caja/cajas');
    api.crearCaja({} as never).subscribe();
    espera('POST', '/api/v1/caja/cajas');
    api.actualizarCaja('cj1', {} as never).subscribe();
    espera('PUT', '/api/v1/caja/cajas/cj1');
    api.abrir('cj1', 100).subscribe();
    espera('POST', '/api/v1/caja/sesiones', { cajaId: 'cj1', montoApertura: 100 });
    api.sesiones('cj1', 1).subscribe();
    espera('GET', '/api/v1/caja/sesiones?cajaId=cj1&pagina=1');
    api.sesion('se1').subscribe();
    espera('GET', '/api/v1/caja/sesiones/se1');
    api.pendientes('se1').subscribe();
    espera('GET', '/api/v1/caja/sesiones/se1/pendientes');
    api.cobrar('se1', 'p1', []).subscribe();
    espera('POST', '/api/v1/caja/sesiones/se1/cobros', { pedidoId: 'p1', pagos: [] });
    api.movimiento('se1', 'EGRESO', 5, 'x').subscribe();
    espera('POST', '/api/v1/caja/sesiones/se1/movimientos', {
      tipo: 'EGRESO',
      monto: 5,
      motivo: 'x',
    });
    api.cerrar('se1', 100, null).subscribe();
    espera('POST', '/api/v1/caja/sesiones/se1/cerrar', { efectivoContado: 100, observacion: null });
    http.verify();
  });
});

describe('Caja', () => {
  it('muestra las pestañas según los permisos', async () => {
    configurar();
    const { html } = await crear(CajaPagina);
    expect([...html.querySelectorAll('nav a')].map((a) => a.textContent?.trim())).toEqual([
      'Mi caja',
      'Sesiones',
      'Cajas y series',
    ]);
    TestBed.resetTestingModule();
    configurar(['caja:read']);
    const lectura = await crear(CajaPagina);
    expect([...lectura.html.querySelectorAll('nav a')].map((a) => a.textContent?.trim())).toEqual([
      'Sesiones',
    ]);
  });

  it('abre la caja eligiendo una libre', async () => {
    const { api } = configurar(TODOS, null);
    const { html, boton, escribir, estable } = await crear(CajaOperar);
    expect([...html.querySelectorAll('#cj-caja option')].map((o) => o.textContent?.trim())).toEqual(
      ['Elija…', 'Caja 1 (C1)'],
    );
    boton('Abrir')?.click();
    await estable();
    expect(api.abrir).not.toHaveBeenCalled();
    escribir('#cj-caja', 'cj1');
    escribir('#cj-monto-apertura', '100');
    boton('Abrir')?.click();
    await estable();
    expect(api.abrir).toHaveBeenCalledWith('cj1', 100);
  });

  it('cobra un pedido con dos medios, calcula el vuelto y muestra el comprobante', async () => {
    const { api } = configurar();
    const { html, boton, escribir, estable } = await crear(CajaOperar);
    expect(html.textContent).toContain('CJ-00000001');
    expect(html.textContent).toContain('123.20');
    boton('Cobrar')?.click();
    await estable();
    expect(html.querySelector<HTMLInputElement>('#cj-monto-0')?.value).toBe('33.2');
    escribir('#cj-monto-0', '20');
    await estable();
    expect(html.textContent).toContain('Falta');
    expect(boton('Cobrar y emitir')?.disabled).toBe(true);
    boton('+ Otro medio de pago')?.click();
    await estable();
    expect(html.querySelector<HTMLInputElement>('#cj-monto-1')?.value).toBe('13.2');
    escribir('#cj-monto-1', '20');
    escribir('#cj-ref-1', 'OP-1');
    await estable();
    expect(html.textContent).toContain('6.80');
    boton('Cobrar y emitir')?.click();
    await estable();
    expect(api.cobrar).toHaveBeenCalledWith('se1', 'p2', [
      { medio: 'EFECTIVO', monto: 20, referencia: null },
      { medio: 'TARJETA', monto: 20, referencia: 'OP-1' },
    ]);
    expect(html.textContent).toContain('F001-00000001');
    expect(html.textContent).toContain('Vuelto: S/ 6.80');
  });

  it('registra movimientos, cierra con arqueo y muestra errores', async () => {
    const { api } = configurar();
    const { html, boton, escribir, estable } = await crear(CajaOperar);
    boton('Registrar')?.click();
    await estable();
    expect(api.movimiento).not.toHaveBeenCalled();
    escribir('#cj-mmonto', '20');
    escribir('#cj-mmotivo', 'Útiles');
    boton('Registrar')?.click();
    await estable();
    expect(api.movimiento).toHaveBeenCalledWith('se1', 'EGRESO', 20, 'Útiles');
    escribir('#cj-contado', '123');
    await estable();
    expect(html.textContent).toContain('Faltante: S/ 0.20');
    escribir('#cj-contado', '124');
    await estable();
    expect(html.textContent).toContain('Sobrante: S/ 0.80');
    escribir('#cj-contado', '123.2');
    await estable();
    expect(html.textContent).toContain('Cuadra.');
    boton('Cerrar caja')?.click();
    await estable();
    expect(api.cerrar).toHaveBeenCalledWith('se1', 123.2, null);
    api.cobrar.mockReturnValue(throwError(() => new Error('x')));
    boton('Cobrar')?.click();
    await estable();
    boton('Cobrar y emitir')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
    boton('Cancelar')?.click();
    await estable();
    expect(html.textContent).not.toContain('Cobrar y emitir');
  });

  it('lista sesiones y muestra el reporte del turno', async () => {
    const { api } = configurar();
    const lista = await crear(SesionesLista);
    expect(lista.html.textContent).toContain('Abierta');
    expect(lista.html.textContent).toContain('-0.20');
    const detalle = await crear(SesionDetalle, { id: 'se1' });
    expect(detalle.html.textContent).toContain('B001-00000001');
    expect(detalle.html.textContent).toContain('Faltan céntimos');
    expect(detalle.html.textContent).toContain('Útiles');
    api.sesion.mockReturnValue(throwError(() => new Error('x')));
    api.sesiones.mockReturnValue(throwError(() => new Error('x')));
    expect(
      (await crear(SesionDetalle, { id: 'x' })).html.querySelector('[role=alert]'),
    ).not.toBeNull();
    expect((await crear(SesionesLista)).html.querySelector('[role=alert]')).not.toBeNull();
  });

  it('configura series y cajas', async () => {
    const { api, facturacion } = configurar();
    const { html, boton, escribir, estable } = await crear(ConfiguracionCaja);
    expect(html.textContent).toContain('Abierta por luis');
    boton('Agregar serie')?.click();
    await estable();
    expect(facturacion.crearSerie).not.toHaveBeenCalled();
    escribir('#cf-serie', 'b003');
    boton('Agregar serie')?.click();
    await estable();
    expect(facturacion.crearSerie).toHaveBeenCalledWith('B003', 'BOLETA', 's1');
    boton('Activar')?.click();
    await estable();
    expect(facturacion.estadoSerie).toHaveBeenCalledWith('B002', true);
    expect(
      [...html.querySelectorAll('#cf-sboleta option')].map((o) => o.textContent?.trim()),
    ).toEqual(['Elija…', 'B001']);
    escribir('#cf-codigo', 'c3');
    escribir('#cf-nombre', 'Caja 3');
    escribir('#cf-sboleta', 'B001');
    escribir('#cf-sfactura', 'F001');
    boton('Crear caja')?.click();
    await estable();
    expect(api.crearCaja).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'C3', sucursalId: 's1', serieBoleta: 'B001' }),
    );
    boton('Editar')?.click();
    await estable();
    expect(html.querySelector('#cf-codigo')).toBeNull();
    boton('Guardar')?.click();
    await estable();
    expect(api.actualizarCaja).toHaveBeenCalledWith(
      'cj1',
      expect.objectContaining({ codigo: null, nombre: 'Caja 1' }),
    );
    api.crearCaja.mockReturnValue(throwError(() => new Error('x')));
    escribir('#cf-codigo', 'c4');
    escribir('#cf-nombre', 'Caja 4');
    escribir('#cf-sboleta', 'B001');
    escribir('#cf-sfactura', 'F001');
    boton('Crear caja')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});
