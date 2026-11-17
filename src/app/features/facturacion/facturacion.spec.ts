import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ComprobanteVenta, GuiaRemision } from '../../core/modelos/api.modelos';
import { pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { ComprobanteDetalle } from './comprobante-detalle';
import { Comprobantes } from './comprobantes';
import { FacturacionApi } from './facturacion.api';
import { GuiaDetalle } from './guia-detalle';
import { Guias } from './guias';

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
  guias: [],
};

const GUIA: GuiaRemision = {
  id: 'g1',
  guia: 'T001-00000001',
  fechaEmision: '2026-11-16',
  fechaTraslado: '2026-11-17',
  sucursalId: 's1',
  motivo: '01',
  descripcionMotivo: null,
  destinatarioTipoDocumento: '6',
  destinatarioDocumento: '20100070970',
  destinatarioNombre: 'TALLER SAC',
  partida: { ubigeo: '080101', direccion: 'Av. Sol 1', establecimiento: null },
  llegada: { ubigeo: '080108', direccion: 'Jr. Talleres 4', establecimiento: null },
  modalidad: '02',
  vehiculoM1L: false,
  transportistaRuc: null,
  transportistaNombre: null,
  transportistaMtc: null,
  vehiculoPlaca: 'ABC123',
  conductor: 'ROBERTO RODRIGUEZ',
  conductorDocumento: '44004400',
  conductorLicencia: 'Q44004400',
  pesoTotal: 5,
  bultos: 2,
  documentoId: 'cv1',
  documento: 'F001-00000001',
  origenTipo: 'FACTURA',
  origenId: 'cv1',
  origenNumero: 'F001-00000001',
  estado: 'PENDIENTE_ENVIO',
  lineas: [{ codigo: 'FIL-1', descripcion: 'Filtro', unidad: 'NIU', cantidad: 2 }],
  codigoSunat: null,
  descripcionSunat: null,
  observacionesSunat: null,
  intentos: 0,
  ultimoError: null,
  fechaEnvio: null,
  creadoPor: 'ana',
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
  guias: [{ id: 'g1', tipo: 'GUIA_REMISION', comprobante: 'T001-00000001' }],
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
    guiaDeVenta: vi.fn(() => of(GUIA)),
    guias: vi.fn(() =>
      of(
        pagina([
          {
            id: 'g1',
            guia: 'T001-00000001',
            fechaEmision: '2026-11-16',
            fechaTraslado: '2026-11-17',
            motivo: '04' as const,
            destinatarioNombre: 'REPUESTOS SAC',
            llegadaDireccion: 'Av. Lima 2',
            origenNumero: 'TR-000001',
            estado: 'ACEPTADO' as const,
          },
        ]),
      ),
    ),
    guia: vi.fn(() => of(GUIA)),
    enviarGuia: vi.fn(() => of({ ...GUIA, estado: 'ACEPTADO' as const })),
    urlArchivoGuia: vi.fn(
      (id: string, tipo: string) => `/api/v1/facturacion/guias/${id}/archivos/${tipo}`,
    ),
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
    api.guiaDeVenta('cv1', {} as never).subscribe();
    espera('POST', '/api/v1/facturacion/comprobantes/cv1/guia');
    api.guias({ texto: ' T001 ', motivo: '04', desde: '2026-11-01', pagina: 1 }).subscribe();
    espera('GET', '/api/v1/facturacion/guias?texto=T001&motivo=04&desde=2026-11-01&pagina=1');
    api.guia('g1').subscribe();
    espera('GET', '/api/v1/facturacion/guias/g1');
    api.enviarGuia('g1').subscribe();
    espera('POST', '/api/v1/facturacion/guias/g1/enviar');
    expect(api.urlArchivoGuia('g1', 'PDF')).toBe('/api/v1/facturacion/guias/g1/archivos/PDF');
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

  it('emite la guía de la venta con transporte público o vehículo M1/L', async () => {
    const api = configurar(['facturacion:read', 'facturacion.guia:create']);
    api.comprobante.mockReturnValue(of({ ...ACEPTADA, guias: [] }));
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { html, estable } = await crear(ComprobanteDetalle, { id: 'cv1' });
    const boton = (t: string) =>
      [...html.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(t));
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
    boton('Emitir guía de remisión')?.click();
    await estable();
    expect(html.querySelector<HTMLInputElement>('#gv-direccion')?.value).toBe('Av. Sol 123');
    boton('Emitir guía')?.click();
    await estable();
    expect(api.guiaDeVenta).not.toHaveBeenCalled();
    escribir('#gv-ubigeo', '080108');
    escribir('#gv-modalidad', '01');
    await estable();
    expect(html.querySelector('#gv-placa')).toBeNull();
    escribir('#gv-ruc', '20000000002');
    escribir('#gv-razon', 'TRANSPORTES SAC');
    escribir('#gv-bultos', '3');
    boton('Emitir guía')?.click();
    await estable();
    expect(api.guiaDeVenta).toHaveBeenCalledWith('cv1', {
      fechaTraslado: expect.any(String),
      llegadaUbigeo: '080108',
      llegadaDireccion: 'Av. Sol 123',
      transporte: {
        modalidad: '01',
        vehiculoM1L: false,
        transportista: { ruc: '20000000002', razonSocial: 'TRANSPORTES SAC', registroMtc: null },
        placa: null,
        conductor: null,
      },
      pesoTotal: null,
      bultos: 3,
    });
    expect(navegar).toHaveBeenCalledWith(['/facturacion/guia', 'g1']);

    escribir('#gv-modalidad', '02');
    await estable();
    escribir('#gv-placa', 'abc123');
    await estable();
    escribir('#gv-m1l', 'true');
    await estable();
    expect(html.querySelector('#gv-placa')).toBeNull();
    api.guiaDeVenta.mockReturnValue(throwError(() => new Error('x')));
    boton('Emitir guía')?.click();
    await estable();
    expect(api.guiaDeVenta).toHaveBeenLastCalledWith(
      'cv1',
      expect.objectContaining({
        transporte: expect.objectContaining({ modalidad: '02', vehiculoM1L: true, placa: null }),
      }),
    );
    expect(html.querySelector('[role=alert]')).not.toBeNull();
    boton('Cancelar')?.click();
    await estable();
    expect(html.querySelector('#gv-ubigeo')).toBeNull();
  });

  it('no ofrece guía sin permiso, a clientes varios ni en notas de crédito', async () => {
    const api = configurar(['facturacion:read', 'facturacion.guia:create']);
    api.comprobante.mockReturnValue(of(NOTA));
    const nota = await crear(ComprobanteDetalle, { id: 'nc1' });
    expect(nota.html.textContent).not.toContain('Emitir guía');
    api.comprobante.mockReturnValue(of({ ...COMPROBANTE, clienteTipoDocumento: '0' }));
    expect((await crear(ComprobanteDetalle, { id: 'cv1' })).html.textContent).not.toContain(
      'Emitir guía',
    );
    api.comprobante.mockReturnValue(of(ACEPTADA));
    const conGuia = await crear(ComprobanteDetalle, { id: 'cv1' });
    expect(conGuia.html.textContent).toContain('T001-00000001');
    expect(conGuia.html.textContent).toContain('Emitir guía');
  });
});

describe('Guías de remisión', () => {
  it('lista y filtra por motivo', async () => {
    const api = configurar();
    const { html, estable } = await crear(Guias);
    expect(html.textContent).toContain('T001-00000001');
    expect(html.textContent).toContain('Traslado entre establecimientos');
    expect(html.textContent).toContain('Aceptado');
    const motivo = html.querySelector<HTMLSelectElement>('#gr-motivo');
    if (motivo) {
      motivo.value = '01';
      motivo.dispatchEvent(new Event('change'));
    }
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable();
    expect(api.guias).toHaveBeenLastCalledWith(
      expect.objectContaining({ motivo: '01', desde: undefined }),
    );
  });

  it('muestra la guía con transporte privado y la reenvía', async () => {
    const api = configurar(['facturacion:read', 'facturacion:enviar']);
    const { html, estable } = await crear(GuiaDetalle, { id: 'g1' });
    expect(html.textContent).toContain('01 · Venta');
    expect(html.textContent).toContain('ABC123');
    expect(html.textContent).toContain('Q44004400');
    expect(html.textContent).toContain('2 bultos');
    expect(html.textContent).toContain('F001-00000001');
    expect(html.querySelector('a[download]')).toBeNull();
    [...html.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Enviar ahora'))
      ?.click();
    await estable();
    expect(api.enviarGuia).toHaveBeenCalledWith('g1');
    expect(html.querySelectorAll('a[download]').length).toBe(3);
  });

  it('muestra el transporte público, el vehículo M1/L y los errores', async () => {
    const api = configurar();
    api.guia.mockReturnValue(
      of({
        ...GUIA,
        motivo: '04' as const,
        modalidad: '01' as const,
        transportistaRuc: '20000000002',
        transportistaNombre: 'TRANSPORTES SAC',
        transportistaMtc: '0001',
        documentoId: null,
        origenNumero: 'TR-000001',
        partida: { ubigeo: '080101', direccion: 'Av. Sol 1', establecimiento: '0000' },
        estado: 'ENVIADO' as const,
        codigoSunat: '0',
        descripcionSunat: 'Recibida',
        observacionesSunat: 'Revisar',
        intentos: 2,
        ultimoError: 'caído',
      }),
    );
    const publico = await crear(GuiaDetalle, { id: 'g1' });
    expect(publico.html.textContent).toContain('RUC 20000000002');
    expect(publico.html.textContent).toContain('MTC 0001');
    expect(publico.html.textContent).toContain('establecimiento 0000');
    expect(publico.html.textContent).toContain('TR-000001');
    expect(publico.html.textContent).toContain('2 intentos');
    expect(publico.html.querySelectorAll('a[download]').length).toBe(2);
    api.guia.mockReturnValue(
      of({ ...GUIA, vehiculoM1L: true, vehiculoPlaca: null, intentos: 1, ultimoError: 'x' }),
    );
    expect((await crear(GuiaDetalle, { id: 'g1' })).html.textContent).toContain('categoría M1 o L');
    api.guia.mockReturnValue(throwError(() => new Error('x')));
    api.guias.mockReturnValue(throwError(() => new Error('x')));
    expect(
      (await crear(GuiaDetalle, { id: 'x' })).html.querySelector('[role=alert]'),
    ).not.toBeNull();
    expect((await crear(Guias)).html.querySelector('[role=alert]')).not.toBeNull();
  });

  it('el reenvío fallido muestra el error', async () => {
    const api = configurar(['facturacion:read', 'facturacion:enviar']);
    api.enviarGuia.mockReturnValue(throwError(() => new Error('x')));
    const { html, estable } = await crear(GuiaDetalle, { id: 'g1' });
    [...html.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Enviar ahora'))
      ?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});
