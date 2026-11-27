import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import {
  CuentaPorCobrar,
  CuentaPorCobrarListado,
  EstadoCredito,
} from '../../core/modelos/api.modelos';
import { pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { CreditosApi } from './creditos.api';
import { CuentaDetalle } from './cuenta-detalle';
import { CuentasCobrar } from './cuentas-cobrar';

const FILA: CuentaPorCobrarListado = {
  id: 'cc1',
  numero: 'CC-00000001',
  clienteId: 'so1',
  clienteDocumento: '20100070970',
  clienteNombre: 'TALLER SAC',
  comprobante: 'F001-00000009',
  fechaEmision: '2026-10-01',
  fechaVencimiento: '2026-10-31',
  monto: 33.2,
  saldo: 20,
  estado: 'PENDIENTE',
  vencida: true,
  diasVencida: 16,
};

const CUENTA: CuentaPorCobrar = {
  id: 'cc1',
  numero: 'CC-00000001',
  clienteId: 'so1',
  clienteDocumento: '20100070970',
  clienteNombre: 'TALLER SAC',
  comprobanteId: 'cv9',
  comprobante: 'F001-00000009',
  fechaEmision: '2026-10-01',
  fechaVencimiento: '2026-10-31',
  monto: 33.2,
  saldo: 20,
  estado: 'PENDIENTE',
  vencida: true,
  autorizadoPor: 'jefe',
  abonos: [
    {
      id: 'a1',
      fecha: '2026-10-10T15:00:00Z',
      monto: 13.2,
      tipo: 'NOTA_CREDITO',
      detalle: 'Nota de crédito FC01-00000001',
      usuario: 'ana',
    },
  ],
  creadoPor: 'ana',
};

function configurar(permisos = ['creditos:read']) {
  const api = {
    cuentasExcel: vi.fn(() => '/api/v1/creditos/cuentas/excel'),
    cuentas: vi.fn(() =>
      of(
        pagina([
          FILA,
          { ...FILA, id: 'cc2', numero: 'CC-00000002', estado: 'PAGADA' as const, vencida: false },
          { ...FILA, id: 'cc3', numero: 'CC-00000003', vencida: false },
        ]),
      ),
    ),
    cuenta: vi.fn(() => of(CUENTA)),
    registrarRetencion: vi.fn(() => of({ ...CUENTA, saldo: 0, estado: 'PAGADA' as const })),
    estadoCliente: vi.fn(() =>
      of<EstadoCredito>({
        clienteId: 'so1',
        diasCredito: 30,
        limite: 500,
        usado: 20,
        disponible: 480,
        vencido: 20,
        cuentas: [FILA],
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
  return { html, estable };
}

describe('CreditosApi (contrato)', () => {
  it('usa las rutas del backend', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(CreditosApi);
    expect(api.cuentasExcel({ vencidas: true, pagina: 4 })).toBe(
      '/api/v1/creditos/cuentas/excel?vencidas=true',
    );
    const http = TestBed.inject(HttpTestingController);
    const espera = (url: string) => {
      const r = http.expectOne((x) => x.urlWithParams === url);
      expect(r.request.method).toBe('GET');
      r.flush({});
    };
    api.cuentas({ texto: ' taller ', estado: 'PENDIENTE', vencidas: true, pagina: 1 }).subscribe();
    espera('/api/v1/creditos/cuentas?texto=taller&estado=PENDIENTE&vencidas=true&pagina=1');
    api.cuentas({ clienteId: 'so1', vencidas: false }).subscribe();
    espera('/api/v1/creditos/cuentas?clienteId=so1');
    api.cuenta('cc1').subscribe();
    espera('/api/v1/creditos/cuentas/cc1');
    api.estadoCliente('so1').subscribe();
    espera('/api/v1/creditos/clientes/so1');
    const datos = { serie: 'R001', numero: '12', fecha: '2026-11-27', monto: 24.9 };
    api.registrarRetencion('cc1', datos).subscribe();
    const r = http.expectOne('/api/v1/creditos/cuentas/cc1/retenciones');
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual(datos);
    r.flush({});
    http.verify();
  });
});

describe('Créditos', () => {
  it('lista las cuentas con su estado y filtra', async () => {
    const api = configurar();
    const { html, estable } = await crear(CuentasCobrar);
    expect(api.cuentas).toHaveBeenCalledWith(expect.objectContaining({ estado: 'PENDIENTE' }));
    expect(html.textContent).toContain('16 días vencida');
    expect(html.textContent).toContain('Pagada');
    expect(html.textContent).toContain('Pendiente');
    const vencidas = html.querySelector<HTMLInputElement>('input[type=checkbox]');
    if (vencidas) {
      vencidas.checked = true;
      vencidas.dispatchEvent(new Event('change'));
    }
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable();
    expect(api.cuentas).toHaveBeenLastCalledWith(expect.objectContaining({ vencidas: true }));
  });

  it('muestra la cuenta con sus abonos y el crédito del cliente', async () => {
    const api = configurar();
    const { html } = await crear(CuentaDetalle, { id: 'cc1' });
    expect(api.estadoCliente).toHaveBeenCalledWith('so1');
    expect(html.textContent).toContain('Nota de crédito FC01-00000001');
    expect(html.textContent).toContain('Autorizó jefe');
    expect(html.textContent).toContain('Vencida');
    expect(html.textContent).toContain('480.00');
    api.cuenta.mockReturnValue(
      of({ ...CUENTA, abonos: [], estado: 'PAGADA', autorizadoPor: null }),
    );
    api.estadoCliente.mockReturnValue(
      of({
        clienteId: 'so1',
        diasCredito: 0,
        limite: null,
        usado: 0,
        disponible: 0,
        vencido: 0,
        cuentas: [],
      }),
    );
    const otra = await crear(CuentaDetalle, { id: 'cc1' });
    expect(otra.html.textContent).toContain('Aún no hay abonos');
    expect(otra.html.textContent).toContain('Sin límite');
    expect(otra.html.textContent).toContain('Pagada');
  });

  it('registra el comprobante de retención del cliente', async () => {
    const api = configurar(['creditos:read', 'creditos.retencion:registrar']);
    const { html, estable } = await crear(CuentaDetalle, { id: 'cc1' });
    const form = html.querySelector('form[aria-label="Comprobante de retención"]');
    if (!form) throw new Error('sin formulario');
    form.dispatchEvent(new Event('submit'));
    await estable();
    expect(api.registrarRetencion).not.toHaveBeenCalled();
    expect(html.textContent).toContain('Serie que empieza con R');
    const escribir = (sel: string, v: string) => {
      const el = html.querySelector<HTMLInputElement>(sel);
      if (!el) throw new Error(sel);
      el.value = v;
      el.dispatchEvent(new Event('input'));
    };
    escribir('#rt-serie', 'r001');
    escribir('#rt-numero', '12');
    escribir('#rt-fecha', '2026-11-27');
    escribir('#rt-monto', '20');
    form.dispatchEvent(new Event('submit'));
    await estable();
    expect(api.registrarRetencion).toHaveBeenCalledWith('cc1', {
      serie: 'R001',
      numero: '12',
      fecha: '2026-11-27',
      monto: 20,
    });
    expect(html.querySelector('form[aria-label="Comprobante de retención"]')).toBeNull();

    api.registrarRetencion.mockReturnValue(throwError(() => new Error('x')));
    const otra = await crear(CuentaDetalle, { id: 'cc1' });
    const f2 = otra.html.querySelector('form[aria-label="Comprobante de retención"]');
    for (const [sel, v] of [
      ['#rt-serie', 'R001'],
      ['#rt-numero', '13'],
      ['#rt-monto', '5'],
    ]) {
      const el = otra.html.querySelector<HTMLInputElement>(sel);
      if (!el) throw new Error(sel);
      el.value = v;
      el.dispatchEvent(new Event('input'));
    }
    f2?.dispatchEvent(new Event('submit'));
    await otra.estable();
    expect(otra.html.querySelector('[role=alert]')).not.toBeNull();
  });

  it('sin permiso no ofrece registrar retenciones', async () => {
    configurar();
    const { html } = await crear(CuentaDetalle, { id: 'cc1' });
    expect(html.querySelector('form[aria-label="Comprobante de retención"]')).toBeNull();
  });

  it('muestra los errores', async () => {
    const api = configurar();
    api.cuentas.mockReturnValue(throwError(() => new Error('x')));
    api.cuenta.mockReturnValue(throwError(() => new Error('x')));
    expect((await crear(CuentasCobrar)).html.querySelector('[role=alert]')).not.toBeNull();
    expect(
      (await crear(CuentaDetalle, { id: 'x' })).html.querySelector('[role=alert]'),
    ).not.toBeNull();
  });
});
