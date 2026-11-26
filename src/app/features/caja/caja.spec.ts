import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Caja, CobroDevolvible, PedidoPendiente, SesionCaja } from '../../core/modelos/api.modelos';
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
  'caja:devolver',
  'caja.proveedores:pagar',
  'creditos:autorizar',
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
  serieNcBoleta: 'BC01',
  serieNcFactura: null,
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
  abonos: 1,
  totalAbonos: 15,
  detalleAbonos: [
    {
      id: 'ab1',
      numero: 'AB-00000001',
      cuentaNumero: 'CC-00000001',
      comprobante: 'F001-00000009',
      clienteNombre: 'TALLER SAC',
      monto: 15,
      saldo: null,
      pagos: [{ medio: 'EFECTIVO', monto: 15, referencia: null }],
      fecha: '2026-11-15T16:00:00Z',
      usuario: 'ana',
    },
  ],
  totalReembolsado: 16.6,
  detalleDevoluciones: [
    {
      id: 'dv1',
      numero: 'DV-00000001',
      cobroNumero: 'CB-00000001',
      comprobante: 'B001-00000001',
      notaId: 'nc1',
      nota: 'BC01-00000001',
      bajaId: null,
      motivo: '07',
      descripcion: 'No corresponde',
      clienteNombre: 'CLIENTES VARIOS',
      total: 26.6,
      aplicadoCredito: 10,
      reembolso: 16.6,
      medioReembolso: 'EFECTIVO',
      fecha: '2026-11-15T17:00:00Z',
      usuario: 'ana',
    },
  ],
};

const DEVOLVIBLE: CobroDevolvible = {
  cobroId: 'co1',
  cobroNumero: 'CB-00000001',
  comprobanteId: 'cv1',
  comprobante: 'B001-00000001',
  tipoComprobante: 'BOLETA',
  estadoComprobante: 'ACEPTADO',
  clienteNombre: 'CLIENTES VARIOS',
  total: 49.8,
  devuelto: 16.6,
  alCredito: 20,
  serieNota: 'BC01',
  impedimentoBaja: 'Tiene notas de crédito: se anula con nota de crédito.',
  lineas: [
    {
      linea: 1,
      codigo: 'FIL-1',
      descripcion: 'Filtro',
      unidad: 'NIU',
      cantidad: 3,
      devuelta: 1,
      precioUnitario: 16.6,
      total: 49.8,
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
    cuentas: vi.fn(() =>
      of([
        {
          id: 'cc1',
          numero: 'CC-00000001',
          clienteNombre: 'TALLER SAC',
          comprobante: 'F001-00000009',
          fechaVencimiento: '2026-12-15',
          monto: 33.2,
          saldo: 20,
          vencida: true,
        },
      ]),
    ),
    abonar: vi.fn(() => of({ ...SESION.detalleAbonos[0], saldo: 5 })),
    devolvible: vi.fn(() => of(DEVOLVIBLE)),
    devolver: vi.fn(() => of(SESION.detalleDevoluciones[0])),
    proveedores: vi.fn(() =>
      of([
        {
          id: 'cp1',
          numero: 'CP-00000001',
          proveedorNombre: 'DISTRIBUIDORA SAC',
          comprobante: 'F001-123',
          fechaVencimiento: '2026-11-10',
          monto: 118,
          saldo: 118,
          vencida: true,
          efectivo: true,
        },
        {
          id: 'cp2',
          numero: 'CP-00000002',
          proveedorNombre: 'MAYORISTA SAC',
          comprobante: 'F002-9',
          fechaVencimiento: '2026-12-10',
          monto: 2950,
          saldo: 2950,
          vencida: false,
          efectivo: false,
        },
      ]),
    ),
    pagarProveedor: vi.fn(() =>
      of({
        movimientoId: 'm9',
        cuentaNumero: 'CP-00000001',
        comprobante: 'F001-123',
        proveedorNombre: 'DISTRIBUIDORA SAC',
        monto: 50,
        saldo: 68,
        fecha: '2026-11-16T15:00:00Z',
      }),
    ),
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
          serie: 'BC01',
          tipo: 'NOTA_CREDITO',
          sucursalId: 's1',
          sucursal: 'Cusco',
          ultimoNumero: 1,
          activo: true,
        },
        {
          serie: 'FC01',
          tipo: 'NOTA_CREDITO',
          sucursalId: 's1',
          sucursal: 'Cusco',
          ultimoNumero: 0,
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
    espera('POST', '/api/v1/caja/sesiones/se1/cobros', {
      pedidoId: 'p1',
      pagos: [],
      autorizarCredito: false,
    });
    api.cuentas('se1', ' taller ').subscribe();
    espera('GET', '/api/v1/caja/sesiones/se1/cuentas?texto=taller');
    api.cuentas('se1', ' ').subscribe();
    espera('GET', '/api/v1/caja/sesiones/se1/cuentas');
    api.abonar('se1', 'cc1', []).subscribe();
    espera('POST', '/api/v1/caja/sesiones/se1/abonos', { cuentaId: 'cc1', pagos: [] });
    api.devolvible('se1', ' B001-1 ').subscribe();
    espera('GET', '/api/v1/caja/sesiones/se1/devolucion?comprobante=B001-1');
    api.devolver('se1', {} as never).subscribe();
    espera('POST', '/api/v1/caja/sesiones/se1/devoluciones');
    api.proveedores('se1', ' dist ').subscribe();
    espera('GET', '/api/v1/caja/sesiones/se1/proveedores?texto=dist');
    api.proveedores('se1', '').subscribe();
    espera('GET', '/api/v1/caja/sesiones/se1/proveedores');
    api.pagarProveedor('se1', 'cp1', 50).subscribe();
    espera('POST', '/api/v1/caja/sesiones/se1/pagos-proveedor', { cuentaId: 'cp1', monto: 50 });
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
    expect(api.cobrar).toHaveBeenCalledWith(
      'se1',
      'p2',
      [
        { medio: 'EFECTIVO', monto: 20, referencia: null },
        { medio: 'TARJETA', monto: 20, referencia: 'OP-1' },
      ],
      false,
    );
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
    expect(detalle.html.textContent).toContain('AB-00000001');
    expect(detalle.html.textContent).toContain('BC01-00000001');
    expect(detalle.html.textContent).toContain('Reembolsado');
    expect(detalle.html.textContent).toContain('a la deuda 10.00');
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
    expect(
      [...html.querySelectorAll('#cf-ncboleta option')].map((o) => o.textContent?.trim()),
    ).toEqual(['Sin devoluciones', 'BC01']);
    expect(
      [...html.querySelectorAll('#cf-ncfactura option')].map((o) => o.textContent?.trim()),
    ).toEqual(['Sin devoluciones', 'FC01']);
    expect(html.textContent).toContain('NC BC01 / —');
    expect(html.textContent).toContain('Nota de crédito');
    escribir('#cf-codigo', 'c3');
    escribir('#cf-nombre', 'Caja 3');
    escribir('#cf-sboleta', 'B001');
    escribir('#cf-sfactura', 'F001');
    escribir('#cf-ncfactura', 'FC01');
    boton('Crear caja')?.click();
    await estable();
    expect(api.crearCaja).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: 'C3',
        sucursalId: 's1',
        serieBoleta: 'B001',
        serieNcBoleta: null,
        serieNcFactura: 'FC01',
      }),
    );
    boton('Editar')?.click();
    await estable();
    expect(html.querySelector('#cf-codigo')).toBeNull();
    boton('Guardar')?.click();
    await estable();
    expect(api.actualizarCaja).toHaveBeenCalledWith(
      'cj1',
      expect.objectContaining({ codigo: null, nombre: 'Caja 1', serieNcBoleta: 'BC01' }),
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

  it('vende al crédito y lo autoriza quien tiene el permiso', async () => {
    const { api } = configurar();
    api.cobrar.mockReturnValue(
      of({
        ...SESION.detalleCobros[0],
        comprobante: 'F001-00000001',
        tipoComprobante: 'FACTURA',
        vuelto: 0,
        pagos: [{ medio: 'CREDITO', monto: 33.2, referencia: null }],
      }),
    );
    const { html, boton, escribir, estable } = await crear(CajaOperar);
    boton('Cobrar')?.click();
    await estable();
    escribir('#cj-medio-0', 'CREDITO');
    await estable();
    expect(html.querySelector('#cj-ref-0')).toBeNull();
    expect(html.textContent).toContain('quedan como deuda del cliente');
    const autoriza = html.querySelector<HTMLInputElement>('input[type=checkbox]');
    if (!autoriza) throw new Error('sin casilla');
    autoriza.checked = true;
    autoriza.dispatchEvent(new Event('change'));
    boton('Cobrar y emitir')?.click();
    await estable();
    expect(api.cobrar).toHaveBeenCalledWith(
      'se1',
      'p2',
      [{ medio: 'CREDITO', monto: 33.2, referencia: null }],
      true,
    );
    expect(html.textContent).toContain('Al crédito: S/ 33.20');
  });

  it('sin permiso de créditos no ofrece autorizar ni devolver', async () => {
    configurar(['caja:read', 'caja:operar']);
    const { html, boton, escribir, estable } = await crear(CajaOperar);
    expect(boton('Devoluciones')).toBeUndefined();
    boton('Cobrar')?.click();
    await estable();
    escribir('#cj-medio-0', 'CREDITO');
    await estable();
    expect(html.textContent).toContain('quedan como deuda del cliente');
    expect(html.querySelector('input[type=checkbox]')).toBeNull();
  });

  it('cobra un abono a una cuenta por cobrar', async () => {
    const { api } = configurar();
    const { html, boton, escribir, estable } = await crear(CajaOperar);
    boton('Abonos de crédito')?.click();
    await estable();
    escribir('#ab-texto', 'taller');
    boton('Buscar')?.click();
    await estable();
    expect(api.cuentas).toHaveBeenCalledWith('se1', 'taller');
    expect(html.textContent).toContain('(vencida)');
    boton('Abonar')?.click();
    await estable();
    expect(html.querySelector<HTMLInputElement>('#ab-monto')?.value).toBe('20');
    escribir('#ab-medio', 'YAPE_PLIN');
    await estable();
    escribir('#ab-ref', 'OP-7');
    escribir('#ab-monto', '15');
    boton('Registrar abono')?.click();
    await estable();
    expect(api.abonar).toHaveBeenCalledWith('se1', 'cc1', [
      { medio: 'YAPE_PLIN', monto: 15, referencia: 'OP-7' },
    ]);
    expect(api.actual).toHaveBeenCalledTimes(2);

    api.cuentas.mockReturnValue(of([]));
    boton('Buscar')?.click();
    await estable();
    expect(html.textContent).toContain('No hay cuentas pendientes');
    api.cuentas.mockReturnValue(throwError(() => new Error('x')));
    boton('Buscar')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });

  it('valida y avisa los errores del abono', async () => {
    const { api } = configurar();
    api.abonar.mockReturnValue(of({ ...SESION.detalleAbonos[0], saldo: 0 }));
    const { html, boton, escribir, estable } = await crear(CajaOperar);
    boton('Abonos de crédito')?.click();
    await estable();
    boton('Buscar')?.click();
    await estable();
    boton('Abonar')?.click();
    await estable();
    escribir('#ab-monto', '');
    boton('Registrar abono')?.click();
    await estable();
    expect(api.abonar).not.toHaveBeenCalled();
    escribir('#ab-monto', '20');
    boton('Registrar abono')?.click();
    await estable();
    expect(api.abonar).toHaveBeenCalled();
    boton('Abonar')?.click();
    await estable();
    api.abonar.mockReturnValue(throwError(() => new Error('x')));
    boton('Registrar abono')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
    boton('Cancelar')?.click();
    await estable();
    expect(html.textContent).not.toContain('Registrar abono');
  });

  it('devuelve por ítem o todo lo que queda con nota de crédito', async () => {
    const { api } = configurar();
    const { html, boton, escribir, estable } = await crear(CajaOperar);
    boton('Devoluciones')?.click();
    await estable();
    boton('Buscar')?.click();
    await estable();
    expect(api.devolvible).not.toHaveBeenCalled();
    escribir('#dv-comprobante', 'b001-1');
    boton('Buscar')?.click();
    await estable();
    expect(api.devolvible).toHaveBeenCalledWith('se1', 'b001-1');
    expect(html.textContent).toContain('Ya devuelto: S/ 16.60');
    expect(html.textContent).toContain('primero se descuenta de la deuda');
    expect(boton('Emitir nota de crédito')?.disabled).toBe(true);
    escribir('#dv-cant-0', '1');
    escribir('#dv-desc', 'No corresponde');
    await estable();
    expect(html.textContent).toContain('S/ 16.60');
    boton('Emitir nota de crédito')?.click();
    await estable();
    expect(api.devolver).toHaveBeenCalledWith('se1', {
      cobroId: 'co1',
      motivo: '07',
      descripcion: 'No corresponde',
      lineas: [{ linea: 1, cantidad: 1 }],
      medioReembolso: 'EFECTIVO',
    });
    expect(html.querySelector('#dv-cant-0')).toBeNull();

    escribir('#dv-comprobante', 'B001-1');
    boton('Buscar')?.click();
    await estable();
    escribir('#dv-motivo', '06');
    escribir('#dv-medio', 'TARJETA');
    escribir('#dv-desc', 'Devuelve todo');
    await estable();
    expect(html.querySelector('#dv-cant-0')).toBeNull();
    expect(html.textContent).toContain('S/ 33.20');
    boton('Emitir nota de crédito')?.click();
    await estable();
    expect(api.devolver).toHaveBeenLastCalledWith(
      'se1',
      expect.objectContaining({ motivo: '06', lineas: [], medioReembolso: 'TARJETA' }),
    );
  });

  it('anula ante SUNAT sin nota de crédito si el comprobante se puede dar de baja', async () => {
    const { api } = configurar();
    api.devolvible.mockReturnValue(
      of({ ...DEVOLVIBLE, devuelto: 0, alCredito: 0, impedimentoBaja: null }),
    );
    api.devolver.mockReturnValue(
      of({
        ...SESION.detalleDevoluciones[0],
        notaId: null,
        nota: null,
        bajaId: 'bj1',
        motivo: '01',
      }),
    );
    const { html, boton, escribir, estable } = await crear(CajaOperar);
    boton('Devoluciones')?.click();
    await estable();
    escribir('#dv-comprobante', 'B001-1');
    boton('Buscar')?.click();
    await estable();
    escribir('#dv-motivo', '01');
    escribir('#dv-desc', 'Venta duplicada');
    await estable();
    expect(html.textContent).toContain('Se dará de baja ante SUNAT');
    expect(html.textContent).toContain('Se anula por');
    boton('Anular ante SUNAT')?.click();
    await estable();
    expect(api.devolver).toHaveBeenCalledWith(
      'se1',
      expect.objectContaining({ motivo: '01', descripcion: 'Venta duplicada', lineas: [] }),
    );

    api.devolvible.mockReturnValue(of(DEVOLVIBLE));
    escribir('#dv-comprobante', 'B001-1');
    boton('Buscar')?.click();
    await estable();
    escribir('#dv-motivo', '01');
    await estable();
    expect(html.textContent).toContain('Se anulará con nota de crédito: Tiene notas de crédito');
    expect(boton('Emitir nota de crédito')).toBeTruthy();
  });

  it('avisa si la caja no tiene serie de nota y muestra los errores', async () => {
    const { api } = configurar();
    api.devolvible.mockReturnValue(
      of({ ...DEVOLVIBLE, serieNota: null, devuelto: 0, alCredito: 0 }),
    );
    const { html, boton, escribir, estable } = await crear(CajaOperar);
    boton('Devoluciones')?.click();
    await estable();
    escribir('#dv-comprobante', 'B001-1');
    boton('Buscar')?.click();
    await estable();
    expect(html.textContent).toContain('no tiene serie de nota de crédito');
    escribir('#dv-motivo', '01');
    await estable();
    expect(boton('Emitir nota de crédito')?.disabled).toBe(true);
    boton('Cancelar')?.click();
    await estable();
    expect(html.textContent).not.toContain('Emitir nota de crédito');

    api.devolvible.mockReturnValue(of(DEVOLVIBLE));
    boton('Buscar')?.click();
    await estable();
    escribir('#dv-motivo', '06');
    await estable();
    boton('Emitir nota de crédito')?.click();
    await estable();
    expect(api.devolver).not.toHaveBeenCalled();
    escribir('#dv-desc', 'x');
    api.devolver.mockReturnValue(throwError(() => new Error('x')));
    boton('Emitir nota de crédito')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
    api.devolvible.mockReturnValue(throwError(() => new Error('x')));
    boton('Buscar')?.click();
    await estable();
    expect(html.textContent).not.toContain('Emitir nota de crédito');
  });

  it('paga en efectivo a un proveedor y deja por banco lo que supera la bancarización', async () => {
    const { api } = configurar();
    const { html, boton, escribir, estable } = await crear(CajaOperar);
    boton('Pagos a proveedores')?.click();
    await estable();
    escribir('#pv-texto', 'dist');
    boton('Buscar')?.click();
    await estable();
    expect(api.proveedores).toHaveBeenCalledWith('se1', 'dist');
    expect(html.textContent).toContain('Por banco');
    expect(html.textContent).toContain('(vencida)');
    boton('Pagar')?.click();
    await estable();
    expect(html.querySelector<HTMLInputElement>('#pv-monto')?.value).toBe('118');
    escribir('#pv-monto', '');
    boton('Pagar y registrar egreso')?.click();
    await estable();
    expect(api.pagarProveedor).not.toHaveBeenCalled();
    escribir('#pv-monto', '50');
    boton('Pagar y registrar egreso')?.click();
    await estable();
    expect(api.pagarProveedor).toHaveBeenCalledWith('se1', 'cp1', 50);
    expect(api.actual).toHaveBeenCalledTimes(2);

    api.pagarProveedor.mockReturnValue(
      of({
        movimientoId: 'm10',
        cuentaNumero: 'CP-00000001',
        comprobante: 'F001-123',
        proveedorNombre: 'DISTRIBUIDORA SAC',
        monto: 68,
        saldo: 0,
        fecha: '2026-11-16T15:00:00Z',
      }),
    );
    boton('Pagar')?.click();
    await estable();
    boton('Pagar y registrar egreso')?.click();
    await estable();
    boton('Pagar')?.click();
    await estable();
    api.pagarProveedor.mockReturnValue(throwError(() => new Error('x')));
    boton('Pagar y registrar egreso')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
    boton('Cancelar')?.click();
    await estable();
    expect(html.querySelector('#pv-monto')).toBeNull();
    api.proveedores.mockReturnValue(of([]));
    boton('Buscar')?.click();
    await estable();
    expect(html.textContent).toContain('No hay deudas en soles');
    api.proveedores.mockReturnValue(throwError(() => new Error('x')));
    boton('Buscar')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});
