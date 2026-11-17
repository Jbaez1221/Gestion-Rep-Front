import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ComprobanteVenta } from '../../core/modelos/api.modelos';
import { pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { ComprobanteDetalle } from './comprobante-detalle';
import { Comprobantes } from './comprobantes';
import { FacturacionApi } from './facturacion.api';

const COMPROBANTE: ComprobanteVenta = {
  id: 'cv1',
  tipo: 'FACTURA',
  comprobante: 'F001-00000001',
  fechaEmision: '2026-11-15',
  clienteDocumento: '20100070970',
  clienteNombre: 'TALLER SAC',
  total: 46.2,
  origenNumero: 'PV-00000001',
  estado: 'PENDIENTE_ENVIO',
  sucursalId: 's1',
  clienteTipoDocumento: '6',
  clienteDireccion: 'Av. Sol 123',
  moneda: 'PEN',
  gravado: 28.14,
  exonerado: 10,
  inafecto: 3,
  igv: 5.06,
  origenTipo: 'PEDIDO_VENTA',
  origenId: 'p1',
  lineas: [
    {
      codigo: 'FIL-1',
      descripcion: 'Filtro',
      unidad: 'NIU',
      cantidad: 2,
      precioUnitario: 16.6,
      afectacionIgv: 'GRAVADO',
      valorVenta: 28.14,
      igv: 5.06,
      total: 33.2,
    },
  ],
  creadoPor: 'ana',
};

function configurar() {
  const api = {
    comprobantes: vi.fn(() =>
      of(
        pagina([
          COMPROBANTE,
          { ...COMPROBANTE, id: 'cv2', tipo: 'BOLETA', comprobante: 'B001-00000001' },
        ]),
      ),
    ),
    comprobante: vi.fn(() => of(COMPROBANTE)),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      sesionFalsa(['facturacion:read']).proveedor,
      { provide: FacturacionApi, useValue: api },
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

describe('FacturacionApi (contrato)', () => {
  it('usa las rutas del backend', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(FacturacionApi);
    const http = TestBed.inject(HttpTestingController);
    const espera = (metodo: string, url: string, cuerpo?: unknown) => {
      const r = http.expectOne((x) => x.urlWithParams === url);
      expect(r.request.method).toBe(metodo);
      if (cuerpo !== undefined) expect(r.request.body).toEqual(cuerpo);
      r.flush({});
    };
    api.series().subscribe();
    espera('GET', '/api/v1/facturacion/series');
    api.crearSerie('B001', 'BOLETA', 's1').subscribe();
    espera('POST', '/api/v1/facturacion/series', {
      serie: 'B001',
      tipo: 'BOLETA',
      sucursalId: 's1',
    });
    api.estadoSerie('B001', false).subscribe();
    espera('PATCH', '/api/v1/facturacion/series/B001/estado', { activo: false });
    api.comprobantes({ texto: ' B001 ', tipo: 'BOLETA', pagina: 1 }).subscribe();
    espera('GET', '/api/v1/facturacion/comprobantes?texto=B001&tipo=BOLETA&pagina=1');
    api.comprobante('cv1').subscribe();
    espera('GET', '/api/v1/facturacion/comprobantes/cv1');
    http.verify();
  });
});

describe('Comprobantes', () => {
  it('lista, filtra y muestra el detalle', async () => {
    const api = configurar();
    const { html, estable } = await crear(Comprobantes);
    expect(html.textContent).toContain('F001-00000001');
    expect(html.textContent).toContain('Boleta');
    const tipo = html.querySelector<HTMLSelectElement>('#fc-tipo');
    if (tipo) {
      tipo.value = 'FACTURA';
      tipo.dispatchEvent(new Event('change'));
    }
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable();
    expect(api.comprobantes).toHaveBeenLastCalledWith(expect.objectContaining({ tipo: 'FACTURA' }));
    const detalle = await crear(ComprobanteDetalle, { id: 'cv1' });
    expect(detalle.html.textContent).toContain('RUC 20100070970');
    expect(detalle.html.textContent).toContain('Av. Sol 123');
    expect(detalle.html.textContent).toContain('Op. exoneradas');
    expect(detalle.html.textContent).toContain('Op. inafectas');
  });

  it('muestra los errores', async () => {
    const api = configurar();
    api.comprobantes.mockReturnValue(throwError(() => new Error('x')));
    api.comprobante.mockReturnValue(throwError(() => new Error('x')));
    expect((await crear(Comprobantes)).html.querySelector('[role=alert]')).not.toBeNull();
    expect(
      (await crear(ComprobanteDetalle, { id: 'x' })).html.querySelector('[role=alert]'),
    ).not.toBeNull();
  });
});
