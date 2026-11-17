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
  formaPago: 'CONTADO',
  fechaVencimiento: null,
  cuotas: [],
  referencia: null,
  motivoNota: null,
  descripcionMotivo: null,
  codigoSunat: null,
  descripcionSunat: null,
  observacionesSunat: null,
  intentos: 0,
  ultimoError: null,
  fechaEnvio: null,
  notas: [],
};

const ACEPTADA: ComprobanteVenta = {
  ...COMPROBANTE,
  estado: 'OBSERVADO',
  formaPago: 'CREDITO',
  fechaVencimiento: '2026-12-15',
  cuotas: [{ monto: 46.2, fechaPago: '2026-12-15' }],
  codigoSunat: '4287',
  descripcionSunat: 'Observación de prueba',
  observacionesSunat: 'Revise la dirección',
  fechaEnvio: '2026-11-15T14:00:00Z',
  notas: [{ id: 'nc1', tipo: 'NOTA_CREDITO', comprobante: 'FC01-00000001' }],
};

const NOTA: ComprobanteVenta = {
  ...COMPROBANTE,
  id: 'nc1',
  tipo: 'NOTA_CREDITO',
  comprobante: 'FC01-00000001',
  estado: 'ENVIADO',
  referencia: { id: 'cv1', tipo: 'FACTURA', comprobante: 'F001-00000001' },
  motivoNota: '07',
  descripcionMotivo: 'No corresponde',
};

function configurar(permisos = ['facturacion:read']) {
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
    enviar: vi.fn(() => of({ ...COMPROBANTE, estado: 'ACEPTADO' as const })),
    urlArchivo: vi.fn(
      (id: string, tipo: string) => `/api/v1/facturacion/comprobantes/${id}/archivos/${tipo}`,
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      sesionFalsa(permisos).proveedor,
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
    api.enviar('cv1').subscribe();
    espera('POST', '/api/v1/facturacion/comprobantes/cv1/enviar');
    expect(api.urlArchivo('cv1', 'CDR')).toBe('/api/v1/facturacion/comprobantes/cv1/archivos/CDR');
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
    expect(detalle.html.textContent).toContain('Pendiente de envío');
    expect(detalle.html.querySelector('a[download]')).toBeNull();
    expect(detalle.html.textContent).not.toContain('Enviar ahora');
  });

  it('muestra la respuesta de SUNAT, las cuotas, las notas y los archivos', async () => {
    const api = configurar();
    api.comprobante.mockReturnValue(of(ACEPTADA));
    const { html } = await crear(ComprobanteDetalle, { id: 'cv1' });
    expect(html.textContent).toContain('Aceptado con observaciones');
    expect(html.textContent).toContain('Código 4287: Observación de prueba');
    expect(html.textContent).toContain('Revise la dirección');
    expect(html.textContent).toContain('Cuota 1: S/ 46.20');
    expect(html.textContent).toContain('FC01-00000001');
    expect([...html.querySelectorAll('a[download]')].map((a) => a.getAttribute('href'))).toEqual([
      '/api/v1/facturacion/comprobantes/cv1/archivos/PDF',
      '/api/v1/facturacion/comprobantes/cv1/archivos/XML',
      '/api/v1/facturacion/comprobantes/cv1/archivos/CDR',
    ]);
  });

  it('la nota de crédito muestra el comprobante que modifica y espera el CDR', async () => {
    const api = configurar();
    api.comprobante.mockReturnValue(of(NOTA));
    const { html } = await crear(ComprobanteDetalle, { id: 'nc1' });
    expect(html.textContent).toContain('Nota de crédito');
    expect(html.textContent).toContain('Modifica a');
    expect(html.textContent).toContain('Devolución por ítem: No corresponde');
    expect([...html.querySelectorAll('a[download]')].map((a) => a.textContent?.trim())).toEqual([
      'PDF',
      'XML',
    ]);
  });

  it('reenvía un comprobante con error si tiene el permiso', async () => {
    const api = configurar(['facturacion:read', 'facturacion:enviar']);
    api.comprobante.mockReturnValue(
      of({ ...COMPROBANTE, estado: 'ERROR', intentos: 1, ultimoError: 'num_doc inválido' }),
    );
    const { html, estable } = await crear(ComprobanteDetalle, { id: 'cv1' });
    expect(html.textContent).toContain('Error de datos');
    expect(html.textContent).toContain('1 intento');
    const enviar = [...html.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Enviar ahora'),
    );
    enviar?.click();
    await estable();
    expect(api.enviar).toHaveBeenCalledWith('cv1');
    expect(html.textContent).toContain('Aceptado');
    api.comprobante.mockReturnValue(of({ ...COMPROBANTE, intentos: 2, ultimoError: 'caído' }));
    api.enviar.mockReturnValue(throwError(() => new Error('x')));
    const otro = await crear(ComprobanteDetalle, { id: 'cv1' });
    expect(otro.html.textContent).toContain('2 intentos');
    [...otro.html.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Enviar ahora'))
      ?.click();
    await otro.estable();
    expect(otro.html.querySelector('[role=alert]')).not.toBeNull();
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
