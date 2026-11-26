import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ReporteVentas } from '../../core/modelos/api.modelos';
import { sesionFalsa } from '../../testing/sesion-falsa';
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
