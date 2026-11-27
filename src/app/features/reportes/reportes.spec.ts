import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ReporteComisiones, ReporteVentas } from '../../core/modelos/api.modelos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { ComisionesPagina } from './comisiones';
import { ReporteVentasPagina } from './reporte-ventas';
import { ReportesApi } from './reportes.api';

const REPORTE: ReporteVentas = {
  desde: '2026-11-01',
  hasta: '2026-11-26',
  agrupacion: 'ARTICULO',
  filas: [
    {
      clave: 'a1',
      nombre: 'Filtro',
      detalle: 'FIL-1',
      venta: 28.14,
      costo: 20,
      margen: 8.14,
      margenPorcentaje: 28.93,
    },
    {
      clave: 'CARGO',
      nombre: 'Cargos de notas de débito',
      detalle: null,
      venta: 0,
      costo: 5,
      margen: -5,
      margenPorcentaje: null,
    },
  ],
  total: {
    clave: null,
    nombre: 'Total',
    detalle: null,
    venta: 28.14,
    costo: 25,
    margen: 3.14,
    margenPorcentaje: 11.16,
  },
};

describe('ReportesApi (contrato)', () => {
  it('usa las rutas del backend', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(ReportesApi);
    const http = TestBed.inject(HttpTestingController);
    const filtro = { desde: '2026-11-01', hasta: '2026-11-26', agrupacion: 'CLIENTE' as const };
    expect(api.ventasExcel({ ...filtro, sucursalId: 's1' })).toBe(
      '/api/v1/reportes/ventas/excel?desde=2026-11-01&hasta=2026-11-26&agrupacion=CLIENTE&sucursalId=s1',
    );
    api.panel().subscribe();
    http.expectOne((r) => r.urlWithParams === '/api/v1/reportes/panel').flush({});
    api.panel('s1').subscribe();
    http.expectOne((r) => r.urlWithParams === '/api/v1/reportes/panel?sucursalId=s1').flush({});
    expect(api.comisionesExcel({ desde: '2026-11-01', hasta: '2026-11-26' })).toBe(
      '/api/v1/reportes/comisiones/excel?desde=2026-11-01&hasta=2026-11-26',
    );
    api.comisiones({ desde: '2026-11-01', hasta: '2026-11-26', sucursalId: 's1' }).subscribe();
    http
      .expectOne(
        (r) =>
          r.urlWithParams ===
          '/api/v1/reportes/comisiones?desde=2026-11-01&hasta=2026-11-26&sucursalId=s1',
      )
      .flush({});
    api.reglas().subscribe();
    http.expectOne('/api/v1/reportes/comisiones/reglas').flush([]);
    api.guardarRegla('ana.perez', 'MARGEN', 5).subscribe();
    const put = http.expectOne('/api/v1/reportes/comisiones/reglas/ana.perez');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ base: 'MARGEN', porcentaje: 5 });
    put.flush({});
    api.quitarRegla('ana.perez').subscribe();
    const del = http.expectOne('/api/v1/reportes/comisiones/reglas/ana.perez');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    api.ventas(filtro).subscribe();
    http
      .expectOne(
        (r) =>
          r.urlWithParams ===
          '/api/v1/reportes/ventas?desde=2026-11-01&hasta=2026-11-26&agrupacion=CLIENTE',
      )
      .flush({});
    http.verify();
  });
});

describe('Reporte de ventas', () => {
  function configurar(sucursales = 1) {
    const api = {
      ventas: vi.fn(() => of(REPORTE)),
      ventasExcel: vi.fn(() => '/api/v1/reportes/ventas/excel?x'),
    };
    const lista = [
      { id: 's1', codigo: 'CUS', nombre: 'Cusco' },
      { id: 's2', codigo: 'LIM', nombre: 'Lima' },
    ].slice(0, sucursales);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        sesionFalsa(['reportes.ventas:read'], { sucursales: lista }).proveedor,
        { provide: ReportesApi, useValue: api },
      ],
    });
    return api;
  }

  async function crear() {
    const fixture = TestBed.createComponent(ReporteVentasPagina);
    const html = fixture.nativeElement as HTMLElement;
    const estable = async () => {
      for (let i = 0; i < 3; i++) {
        await fixture.whenStable();
        fixture.detectChanges();
      }
    };
    await estable();
    return { html, estable };
  }

  it('consulta el mes, muestra el margen y cambia de agrupación', async () => {
    const api = configurar(2);
    const { html, estable } = await crear();
    expect(api.ventas).toHaveBeenCalledWith(
      expect.objectContaining({ agrupacion: 'ARTICULO', sucursalId: null }),
    );
    expect(api.ventas).toHaveBeenCalledWith(
      expect.objectContaining({ desde: expect.stringMatching(/^\d{4}-\d{2}-01$/) }),
    );
    expect(html.textContent).toContain('FIL-1');
    expect(html.textContent).toContain('28.93');
    expect(html.querySelector('td.text-red-700')?.textContent).toContain('-5.00');
    expect(html.textContent).toContain('11.16');
    expect(html.querySelector('a[download]')?.getAttribute('href')).toBe(
      '/api/v1/reportes/ventas/excel?x',
    );
    const agrupacion = html.querySelector<HTMLSelectElement>('#rv-agrupacion');
    if (!agrupacion) throw new Error('agrupación');
    agrupacion.value = 'VENDEDOR';
    agrupacion.dispatchEvent(new Event('change'));
    const sucursal = html.querySelector<HTMLSelectElement>('#rv-sucursal');
    if (!sucursal) throw new Error('sucursal');
    sucursal.value = 's2';
    sucursal.dispatchEvent(new Event('change'));
    await estable();
    expect(api.ventasExcel).toHaveBeenLastCalledWith(
      expect.objectContaining({ agrupacion: 'VENDEDOR', sucursalId: 's2' }),
    );
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable();
    expect(api.ventas).toHaveBeenLastCalledWith(
      expect.objectContaining({ agrupacion: 'VENDEDOR', sucursalId: 's2' }),
    );
  });

  it('muestra los días, el período vacío y los errores', async () => {
    const api = configurar();
    api.ventas.mockReturnValue(
      of({
        ...REPORTE,
        agrupacion: 'DIA' as const,
        filas: [{ ...REPORTE.filas[0], clave: '2026-11-25', nombre: '2026-11-25', detalle: null }],
      }),
    );
    const dias = await crear();
    expect(dias.html.textContent).toContain('25/11/2026');
    expect(dias.html.querySelector('#rv-sucursal')).toBeNull();

    TestBed.resetTestingModule();
    const vacio = configurar();
    vacio.ventas.mockReturnValue(of({ ...REPORTE, filas: [] }));
    expect((await crear()).html.textContent).toContain('Sin ventas en el período.');

    TestBed.resetTestingModule();
    const fallo = configurar();
    fallo.ventas.mockReturnValue(throwError(() => new Error('x')));
    expect((await crear()).html.querySelector('[role=alert]')).not.toBeNull();
  });
});

const COMISIONES: ReporteComisiones = {
  desde: '2026-11-01',
  hasta: '2026-11-27',
  filas: [
    {
      vendedor: 'ana',
      venta: 1000,
      costo: 700,
      margen: 300,
      base: 'MARGEN',
      porcentaje: 10,
      comision: 30,
    },
    {
      vendedor: 'luis',
      venta: 500,
      costo: 400,
      margen: 100,
      base: null,
      porcentaje: null,
      comision: 0,
    },
  ],
  total: 30,
};

describe('Comisiones', () => {
  function configurar(permisos = ['reportes.ventas:read', 'reportes.comisiones:configurar']) {
    const api = {
      comisiones: vi.fn(() => of(COMISIONES)),
      comisionesExcel: vi.fn(() => '/api/v1/reportes/comisiones/excel?x'),
      guardarRegla: vi.fn(() => of({})),
      quitarRegla: vi.fn(() => of(null)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        sesionFalsa(permisos).proveedor,
        { provide: ReportesApi, useValue: api },
      ],
    });
    return api;
  }

  async function crearComisiones() {
    const fixture = TestBed.createComponent(ComisionesPagina);
    const html = fixture.nativeElement as HTMLElement;
    const estable = async () => {
      for (let i = 0; i < 3; i++) {
        await fixture.whenStable();
        fixture.detectChanges();
      }
    };
    await estable();
    const boton = (t: string, desde: ParentNode = html) =>
      [...desde.querySelectorAll('button')].find((b) => b.textContent?.trim() === t);
    return { html, estable, boton };
  }

  it('muestra la comisión de cada vendedor y edita su regla', async () => {
    const api = configurar();
    const { html, estable, boton } = await crearComisiones();
    expect(html.textContent).toContain('30.00');
    expect(html.querySelector<HTMLInputElement>('#cm-pct-0')?.value).toBe('10');
    expect(html.querySelector<HTMLSelectElement>('#cm-base-0')?.value).toBe('MARGEN');
    expect(html.querySelector('a[download]')?.getAttribute('href')).toBe(
      '/api/v1/reportes/comisiones/excel?x',
    );
    const segunda = html.querySelectorAll('tbody tr')[1];
    const pct = html.querySelector<HTMLInputElement>('#cm-pct-1');
    if (!pct) throw new Error('porcentaje');
    boton('Guardar', segunda)?.click();
    await estable();
    expect(api.guardarRegla).not.toHaveBeenCalled();
    expect(html.textContent).toContain('Porcentaje inválido');
    pct.value = '3';
    boton('Guardar', segunda)?.click();
    await estable();
    expect(api.guardarRegla).toHaveBeenCalledWith('luis', 'VENTA', 3);
    boton('Quitar', html.querySelectorAll('tbody tr')[0])?.click();
    await estable();
    expect(api.quitarRegla).toHaveBeenCalledWith('ana');
    expect(api.comisiones).toHaveBeenCalledTimes(3);
  });

  it('sin permiso de configurar solo consulta, y muestra los errores', async () => {
    configurar(['reportes.ventas:read']);
    const { html } = await crearComisiones();
    expect(html.querySelector('#cm-pct-0')).toBeNull();
    expect(html.textContent).toContain('10 % del margen');
    expect(html.textContent).toContain('Sin regla');

    TestBed.resetTestingModule();
    const conError = configurar();
    conError.guardarRegla.mockReturnValue(throwError(() => new Error('x')));
    conError.quitarRegla.mockReturnValue(throwError(() => new Error('x')));
    const pantalla = await crearComisiones();
    pantalla.boton('Guardar', pantalla.html.querySelectorAll('tbody tr')[0])?.click();
    await pantalla.estable();
    expect(pantalla.html.querySelector('[role=alert]')).not.toBeNull();
    pantalla.boton('Quitar', pantalla.html.querySelectorAll('tbody tr')[0])?.click();
    await pantalla.estable();
    expect(pantalla.html.querySelector('[role=alert]')).not.toBeNull();

    TestBed.resetTestingModule();
    const vacio = configurar();
    vacio.comisiones.mockReturnValue(throwError(() => new Error('x')));
    expect((await crearComisiones()).html.querySelector('[role=alert]')).not.toBeNull();
  });
});
