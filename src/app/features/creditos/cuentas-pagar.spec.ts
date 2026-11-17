import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CuentaPagar, CuentaPagarListado, ResumenPagar } from '../../core/modelos/api.modelos';
import { pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { CreditosPagina } from './creditos';
import { CreditosApi } from './creditos.api';
import { CuentaPagarDetalle } from './cuenta-pagar-detalle';
import { CuentasPagar } from './cuentas-pagar';

const FILA: CuentaPagarListado = {
  id: 'cp1',
  numero: 'CP-00000001',
  proveedorId: 'pr1',
  proveedorDocumento: '20100070970',
  proveedorNombre: 'DISTRIBUIDORA SAC',
  comprobante: 'F001-123',
  fechaEmision: '2026-10-01',
  fechaVencimiento: '2026-10-31',
  moneda: 'PEN',
  monto: 1180,
  saldo: 1038,
  estado: 'PENDIENTE',
  vencida: true,
  diasVencida: 16,
  detraccionSoles: 142,
  detraccionPendiente: true,
  detraccionVence: '2026-11-07',
};

const CUENTA: CuentaPagar = {
  id: 'cp1',
  numero: 'CP-00000001',
  proveedorId: 'pr1',
  proveedorDocumento: '20100070970',
  proveedorNombre: 'DISTRIBUIDORA SAC',
  compraId: 'co1',
  compraNumero: 'CO-00000001',
  comprobante: 'F001-123',
  tipoComprobante: 'FACTURA',
  fechaEmision: '2026-10-01',
  fechaVencimiento: '2026-10-31',
  fechaContable: '2026-10-01',
  moneda: 'PEN',
  tipoCambio: 1,
  monto: 1180,
  saldo: 1038,
  estado: 'PENDIENTE',
  vencida: true,
  admiteEfectivo: true,
  detraccionSoles: 142,
  detraccionMoneda: 142,
  cuentaDetracciones: '00-123-456789',
  detraccionEstado: 'PENDIENTE',
  detraccionConstancia: null,
  detraccionFecha: null,
  detraccionVence: '2026-11-07',
  pagos: [
    {
      id: 'p1',
      fecha: '2026-10-05',
      monto: 10,
      tipo: 'NOTA_CREDITO',
      medio: null,
      referencia: 'Nota de crédito FC01-1',
      banco: null,
      usuario: 'ana',
      registrado: '2026-10-05T10:00:00Z',
    },
    {
      id: 'p2',
      fecha: '2026-10-06',
      monto: 10,
      tipo: 'ANULACION_NOTA',
      medio: null,
      referencia: 'Anulación',
      banco: null,
      usuario: 'ana',
      registrado: '2026-10-06T10:00:00Z',
    },
  ],
  avisos: [
    'Deposite la detracción de S/ 142 en la cuenta del Banco de la Nación 00-123-456789 hasta el 2026-11-07.',
  ],
};

const RESUMEN: ResumenPagar = {
  porMoneda: [
    {
      moneda: 'PEN',
      porVencer: 100,
      vencido1a30: 1038,
      vencido31a60: 0,
      vencido61a90: 0,
      vencidoMas90: 50,
      total: 1188,
    },
    {
      moneda: 'USD',
      porVencer: 300,
      vencido1a30: 0,
      vencido31a60: 0,
      vencido61a90: 0,
      vencidoMas90: 0,
      total: 300,
    },
  ],
  detraccionesPendientes: 142,
  detraccionesVencidas: 1,
  vencenEn7Dias: 2,
};

function configurar(permisos = ['creditos.pagar:read', 'creditos.pagar:registrar']) {
  const api = {
    cuentasPagar: vi.fn(() =>
      of(
        pagina([
          FILA,
          {
            ...FILA,
            id: 'cp2',
            estado: 'PAGADA' as const,
            vencida: false,
            detraccionPendiente: false,
          },
          {
            ...FILA,
            id: 'cp3',
            estado: 'ANULADA' as const,
            vencida: false,
            detraccionPendiente: false,
          },
          {
            ...FILA,
            id: 'cp4',
            moneda: 'USD' as const,
            vencida: false,
            detraccionPendiente: false,
          },
        ]),
      ),
    ),
    resumenPagar: vi.fn(() => of(RESUMEN)),
    cuentaPagar: vi.fn(() => of(CUENTA)),
    pagar: vi.fn(() => of({ ...CUENTA, saldo: 38, avisos: [] })),
    detraccion: vi.fn(() =>
      of({
        ...CUENTA,
        detraccionEstado: 'DEPOSITADA' as const,
        detraccionConstancia: '123456',
        detraccionFecha: '2026-11-05',
        avisos: [],
      }),
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      sesionFalsa(permisos).proveedor,
      { provide: CreditosApi, useValue: api },
    ],
  });
  return api;
}

async function crear<T>(componente: Type<T>, entradas: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(componente);
  for (const [k, v] of Object.entries(entradas)) fixture.componentRef.setInput(k, v);
  const html = fixture.nativeElement as HTMLElement;
  const estable = async () => {
    for (let i = 0; i < 4; i++) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
  };
  await estable();
  const escribir = (sel: string, v: string) => {
    const el = html.querySelector<HTMLInputElement | HTMLSelectElement>(sel);
    if (!el) throw new Error(sel);
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      el.checked = v === 'true';
      el.dispatchEvent(new Event('change'));
      return;
    }
    el.value = v;
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input'));
  };
  const boton = (t: string) =>
    [...html.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(t));
  return { html, estable, escribir, boton };
}

describe('CreditosApi por pagar (contrato)', () => {
  it('usa las rutas del backend', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(CreditosApi);
    const http = TestBed.inject(HttpTestingController);
    const espera = (metodo: string, url: string, cuerpo?: unknown) => {
      const r = http.expectOne((x) => x.urlWithParams === url);
      expect(r.request.method).toBe(metodo);
      if (cuerpo !== undefined) expect(r.request.body).toEqual(cuerpo);
      r.flush({});
    };
    api
      .cuentasPagar({
        texto: ' dist ',
        estado: 'PENDIENTE',
        vencidas: true,
        venceHasta: '2026-11-30',
        detraccionPendiente: true,
        pagina: 1,
      })
      .subscribe();
    espera(
      'GET',
      '/api/v1/creditos/pagar/cuentas?texto=dist&estado=PENDIENTE&vencidas=true&venceHasta=2026-11-30&detraccionPendiente=true&pagina=1',
    );
    api.cuentasPagar({ vencidas: false, venceHasta: '', detraccionPendiente: false }).subscribe();
    espera('GET', '/api/v1/creditos/pagar/cuentas');
    api.resumenPagar().subscribe();
    espera('GET', '/api/v1/creditos/pagar/resumen');
    api.cuentaPagar('cp1').subscribe();
    espera('GET', '/api/v1/creditos/pagar/cuentas/cp1');
    const pago = {
      fecha: '2026-11-16',
      monto: 10,
      medio: 'CHEQUE' as const,
      referencia: 'CH-1',
      banco: null,
    };
    api.pagar('cp1', pago).subscribe();
    espera('POST', '/api/v1/creditos/pagar/cuentas/cp1/pagos', pago);
    api.detraccion('cp1', '123456', '2026-11-16').subscribe();
    espera('POST', '/api/v1/creditos/pagar/cuentas/cp1/detraccion', {
      constancia: '123456',
      fecha: '2026-11-16',
    });
    http.verify();
  });
});

describe('Cuentas por pagar', () => {
  it('las pestañas de créditos siguen los permisos', async () => {
    configurar(['creditos:read', 'creditos.pagar:read']);
    const ambos = await crear(CreditosPagina);
    expect([...ambos.html.querySelectorAll('nav a')].map((a) => a.textContent?.trim())).toEqual([
      'Por cobrar',
      'Por pagar',
    ]);
    TestBed.resetTestingModule();
    configurar(['creditos.pagar:read']);
    const pagar = await crear(CreditosPagina);
    expect([...pagar.html.querySelectorAll('nav a')].map((a) => a.textContent?.trim())).toEqual([
      'Por pagar',
    ]);
  });

  it('lista con el resumen por antigüedad y filtra', async () => {
    const api = configurar();
    const { html, estable, escribir } = await crear(CuentasPagar);
    expect(api.cuentasPagar).toHaveBeenCalledWith(expect.objectContaining({ estado: 'PENDIENTE' }));
    expect(html.textContent).toContain('Por pagar en soles');
    expect(html.textContent).toContain('Por pagar en dólares');
    expect(html.textContent).toContain('1 fuera de plazo');
    expect(html.textContent).toContain('2 cuentas vencen en 7 días');
    expect(html.textContent).toContain('16 días vencida');
    expect(html.textContent).toContain('Detracción S/ 142.00');
    expect(html.textContent).toContain('Pagada');
    expect(html.textContent).toContain('Anulada');
    expect(html.textContent).toContain('US$ 1,180.00');
    escribir('#cp-detraccion', 'true');
    escribir('#cp-hasta', '2026-11-30');
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable();
    expect(api.cuentasPagar).toHaveBeenLastCalledWith(
      expect.objectContaining({ detraccionPendiente: true, venceHasta: '2026-11-30' }),
    );
  });

  it('registra un pago bancario y la constancia de detracción', async () => {
    const api = configurar();
    const { html, estable, escribir, boton } = await crear(CuentaPagarDetalle, { id: 'cp1' });
    expect(html.textContent).toContain('Deposite la detracción');
    expect(html.textContent).toContain('Anulación de nota');
    expect(html.textContent).toContain('cta. 00-123-456789');
    expect(html.querySelector<HTMLInputElement>('#pp-monto')?.value).toBe('1038');
    boton('Registrar pago')?.click();
    await estable();
    expect(api.pagar).not.toHaveBeenCalled();
    escribir('#pp-medio', 'CHEQUE');
    escribir('#pp-monto', '1000');
    escribir('#pp-ref', 'CH-001');
    boton('Registrar pago')?.click();
    await estable();
    expect(api.pagar).toHaveBeenCalledWith('cp1', {
      fecha: expect.any(String),
      monto: 1000,
      medio: 'CHEQUE',
      referencia: 'CH-001',
      banco: null,
    });
    expect(html.querySelector<HTMLInputElement>('#pp-monto')?.value).toBe('38');

    boton('Registrar constancia')?.click();
    await estable();
    expect(api.detraccion).not.toHaveBeenCalled();
    escribir('#pd-numero', '123456');
    boton('Registrar constancia')?.click();
    await estable();
    expect(api.detraccion).toHaveBeenCalledWith('cp1', '123456', expect.any(String));
    expect(html.textContent).toContain('Constancia 123456');
    expect(html.querySelector('#pd-numero')).toBeNull();
  });

  it('pagada no ofrece pagar; sin permiso solo consulta; y muestra los errores', async () => {
    const api = configurar();
    api.pagar.mockReturnValue(of({ ...CUENTA, saldo: 0, estado: 'PAGADA' as const, avisos: [] }));
    const { html, estable, escribir, boton } = await crear(CuentaPagarDetalle, { id: 'cp1' });
    escribir('#pp-ref', 'OP-1');
    boton('Registrar pago')?.click();
    await estable();
    expect(html.textContent).toContain('Pagada');
    expect(html.querySelector('#pp-monto')).toBeNull();
    api.detraccion.mockReturnValue(throwError(() => new Error('x')));
    escribir('#pd-numero', '123456');
    boton('Registrar constancia')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();

    api.cuentaPagar.mockReturnValue(
      of({ ...CUENTA, vencida: false, pagos: [], detraccionSoles: null, detraccionEstado: null }),
    );
    api.pagar.mockReturnValue(throwError(() => new Error('x')));
    const otra = await crear(CuentaPagarDetalle, { id: 'cp1' });
    expect(otra.html.textContent).toContain('Aún no hay pagos');
    expect(otra.html.textContent).toContain('Pendiente');
    otra.escribir('#pp-ref', 'OP-2');
    otra.boton('Registrar pago')?.click();
    await otra.estable();
    expect(otra.html.querySelector('[role=alert]')).not.toBeNull();

    api.cuentaPagar.mockReturnValue(of({ ...CUENTA, estado: 'ANULADA' as const }));
    expect((await crear(CuentaPagarDetalle, { id: 'cp1' })).html.textContent).toContain('Anulada');

    TestBed.resetTestingModule();
    const soloLectura = configurar(['creditos.pagar:read']);
    const lectura = await crear(CuentaPagarDetalle, { id: 'cp1' });
    expect(lectura.html.querySelector('#pp-monto')).toBeNull();
    soloLectura.cuentaPagar.mockReturnValue(throwError(() => new Error('x')));
    soloLectura.cuentasPagar.mockReturnValue(throwError(() => new Error('x')));
    soloLectura.resumenPagar.mockReturnValue(throwError(() => new Error('x')));
    expect(
      (await crear(CuentaPagarDetalle, { id: 'x' })).html.querySelector('[role=alert]'),
    ).not.toBeNull();
    expect((await crear(CuentasPagar)).html.querySelector('[role=alert]')).not.toBeNull();
  });
});
