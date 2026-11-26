import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Articulo, Compra, OrdenCompra, Recepcion, Socio } from '../../core/modelos/api.modelos';
import { pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { ArticulosApi } from '../articulos/articulos.api';
import { CentrosApi } from '../centros/centros.api';
import { InventarioApi } from '../inventario/inventario.api';
import { SociosApi } from '../socios/socios.api';
import { BuscadorProveedor } from './buscador-proveedor';
import { centimos, claseEstadoOrden, claseEstadoRecepcion, importeLinea, totales } from './calculo';
import { CompraDetalle } from './compra-detalle';
import { CompraRegistro } from './compra-registro';
import { Compras } from './compras';
import { ComprasApi, RUTA_REGISTRO_COMPRAS } from './compras.api';
import { ComprasLista } from './compras-lista';
import { factorDe, pedirMotivo, unidadesDe } from './lineas';
import { OrdenDetalle } from './orden-detalle';
import { OrdenesLista } from './ordenes-lista';
import { RecepcionDetalle } from './recepcion-detalle';
import { RecepcionesLista } from './recepciones-lista';
import { TiposCambio } from './tipos-cambio';

const TODOS = [
  'compras:read',
  'compras:registrar',
  'compras:anular',
  'compras.orden:create',
  'compras.orden:aprobar',
  'compras.tipo-cambio:update',
  'articulos:read',
  'articulos:create',
  'centros:read',
  'inventario:read',
];

const PROVEEDOR = {
  id: 'p1',
  tipoDocumento: 'RUC',
  numeroDocumento: '20100070970',
  nombre: 'REPUESTOS SAC',
  condicionSunat: 'NO HABIDO',
  monedaProveedor: 'PEN',
  diasCreditoProveedor: 30,
  sujetoDetraccion: true,
} as unknown as Socio;

const FILTRO = {
  id: 'art1',
  codigo: 'FIL-000001',
  descripcion: 'Filtro de aceite',
  tipo: 'INVENTARIABLE',
  control: 'LOTE',
  unidadBase: { id: 'u1', codigoSunat: 'NIU', nombre: 'Unidad' },
  unidadesAlternas: [{ unidadSunat: 'BX', factor: 12 }],
  unidadCompra: 'BX',
  afectacionIgv: 'GRAVADO',
} as unknown as Articulo;

const SERVICIO = {
  ...FILTRO,
  id: 'srv1',
  codigo: 'SER-000001',
  descripcion: 'Alineamiento',
  tipo: 'SERVICIO',
  control: 'NINGUNO',
  unidadesAlternas: [],
  unidadCompra: 'ZZ',
} as unknown as Articulo;

const ORDEN: OrdenCompra = {
  id: 'oc1',
  numero: 'OC-00000001',
  proveedor: { id: 'p1', documento: '20100070970', nombre: 'REPUESTOS SAC' },
  almacen: { id: 'al1', codigo: 'CUS01-01', nombre: 'Principal', sucursal: 'Cusco' },
  sucursalId: 's1',
  fecha: '2026-11-10',
  fechaEntrega: null,
  moneda: 'PEN',
  diasCredito: 30,
  observacion: null,
  estado: 'BORRADOR',
  subtotal: 240,
  igv: 43.2,
  total: 283.2,
  aprobadoPor: null,
  fechaAprobacion: null,
  motivoCierre: null,
  lineas: [
    {
      linea: 0,
      articuloId: 'art1',
      articuloCodigo: 'FIL-000001',
      descripcion: 'Filtro de aceite',
      unidad: 'BX',
      factor: 12,
      cantidad: 2,
      precioUnitario: 120,
      afectacion: 'GRAVADO',
      cantidadRecibida: 0,
      pendiente: 2,
    },
  ],
  compras: [
    {
      id: 'c0',
      numero: 'CO-00000009',
      tipoComprobante: 'FACTURA',
      comprobante: 'F001-9',
      fechaEmision: '2026-11-11',
      total: 10,
      estado: 'ANULADA',
    },
  ],
  recepciones: [
    {
      id: 're1',
      numero: 'RE-00000001',
      guia: 'T001-55',
      fecha: '2026-11-11',
      totalSoles: 240,
      estado: 'PENDIENTE',
    },
  ],
  creadoPor: 'admin',
  fechaCreacion: null,
};

const RECEPCION: Recepcion = {
  id: 're1',
  numero: 'RE-00000001',
  proveedor: { id: 'p1', documento: '20100070970', nombre: 'REPUESTOS SAC' },
  almacen: { id: 'al1', codigo: 'CUS01-01', nombre: 'Principal', sucursal: 'Cusco' },
  sucursalId: 's1',
  orden: { id: 'oc1', numero: 'OC-00000001' },
  guia: 'T001-55',
  fecha: '2026-11-11',
  moneda: 'USD',
  tipoCambio: 3.75,
  glosa: null,
  totalSoles: 240,
  estado: 'PENDIENTE',
  compra: null,
  movimientoId: 'm9',
  lineas: [
    {
      linea: 0,
      articuloId: 'art1',
      articuloCodigo: 'FIL-000001',
      descripcion: 'Filtro de aceite',
      unidad: 'BX',
      factor: 12,
      cantidad: 2,
      costoUnitario: 120,
      costoSoles: 240,
      ordenLinea: 0,
    },
  ],
  anuladoPor: null,
  fechaAnulacion: null,
  motivoAnulacion: null,
  creadoPor: 'admin',
  fechaCreacion: null,
};

const COMPRA: Compra = {
  id: 'c1',
  numero: 'CO-00000001',
  proveedor: { id: 'p1', documento: '20100070970', nombre: 'REPUESTOS SAC' },
  tipoComprobante: 'FACTURA',
  comprobante: 'F001-123',
  fechaEmision: '2026-11-10',
  fechaVencimiento: '2026-12-10',
  fechaContable: '2026-11-10',
  moneda: 'USD',
  tipoCambio: 3.75,
  preciosIncluyenIgv: false,
  sucursalId: 's1',
  almacen: { id: 'al1', codigo: 'CUS01-01', nombre: 'Principal', sucursal: 'Cusco' },
  orden: { id: 'oc1', numero: 'OC-00000001' },
  referencia: null,
  motivoNota: null,
  glosa: 'Pedido de noviembre',
  gravado: 240,
  exonerado: 10,
  inafecto: 5,
  igv: 43.2,
  total: 298.2,
  totalSoles: 1118.25,
  creditoFiscal: false,
  detraccion: { codigo: '020', descripcion: 'Mantenimiento', porcentaje: 12, monto: 134 },
  estado: 'REGISTRADA',
  movimientoId: 'm1',
  ajusteMovimientoId: null,
  diferenciaNoAplicada: 0,
  lineas: [
    {
      linea: 0,
      tipo: 'INVENTARIO',
      articuloId: 'art1',
      articuloCodigo: 'FIL-000001',
      descripcion: 'Filtro de aceite',
      unidad: 'BX',
      factor: 12,
      cantidad: 2,
      valorUnitario: 120,
      afectacion: 'GRAVADO',
      valorVenta: 240,
      igv: 43.2,
      total: 283.2,
      costoSoles: 1062,
      costoAdicional: 30,
      centroCostoId: null,
      naturaleza: null,
      ordenLinea: 0,
    },
    {
      linea: 1,
      tipo: 'GASTO',
      articuloId: null,
      articuloCodigo: null,
      descripcion: 'Flete',
      unidad: 'ZZ',
      factor: 1,
      cantidad: 1,
      valorUnitario: 15,
      afectacion: 'EXONERADO',
      valorVenta: 15,
      igv: 0,
      total: 15,
      costoSoles: 56.25,
      costoAdicional: 0,
      centroCostoId: 'cc1',
      naturaleza: '63',
      ordenLinea: null,
    },
  ],
  notas: [
    {
      id: 'n1',
      numero: 'CO-00000002',
      tipoComprobante: 'NOTA_CREDITO',
      comprobante: 'FC01-1',
      fechaEmision: '2026-11-12',
      total: 10,
      estado: 'ANULADA',
    },
  ],
  recepciones: [
    {
      id: 're1',
      numero: 'RE-00000001',
      guia: null,
      fecha: '2026-11-11',
      totalSoles: 240,
      estado: 'FACTURADA',
    },
  ],
  avisos: ['Sin crédito fiscal: el IGV se sumó al costo.'],
  anuladoPor: null,
  fechaAnulacion: null,
  motivoAnulacion: null,
  creadoPor: 'admin',
  fechaCreacion: null,
};

const CATALOGOS = {
  tiposComprobante: [
    { valor: 'FACTURA', codigo: '01', descripcion: 'Factura' },
    { valor: 'BOLETA', codigo: '03', descripcion: 'Boleta de venta' },
    { valor: 'NOTA_CREDITO', codigo: '07', descripcion: 'Nota de crédito' },
  ],
  motivosNota: [
    {
      valor: 'NC_DEVOLUCION_ITEM',
      tipo: 'NOTA_CREDITO',
      codigo: '07',
      descripcion: 'Devolución por ítem',
      devolucion: true,
    },
    {
      valor: 'NC_DESCUENTO_ITEM',
      tipo: 'NOTA_CREDITO',
      codigo: '05',
      descripcion: 'Descuento por ítem',
      devolucion: false,
    },
  ],
  detracciones: [{ codigo: '020', descripcion: 'Mantenimiento', porcentaje: 12, umbral: 700 }],
  tasaIgv: 0.18,
};

function apiFalsa() {
  return {
    excel: vi.fn(() => '/api/v1/compras/excel'),
    catalogos: vi.fn(() => of(CATALOGOS)),
    listar: vi.fn(() =>
      of(
        pagina([
          {
            id: 'c1',
            numero: 'CO-00000001',
            proveedor: COMPRA.proveedor,
            tipoComprobante: 'FACTURA',
            comprobante: 'F001-123',
            fechaEmision: '2026-11-10',
            fechaContable: '2026-11-10',
            moneda: 'USD',
            total: 298.2,
            totalSoles: 1118.25,
            creditoFiscal: false,
            estado: 'REGISTRADA',
          },
          {
            id: 'c2',
            numero: 'CO-00000003',
            proveedor: COMPRA.proveedor,
            tipoComprobante: 'NOTA_CREDITO',
            comprobante: 'FC01-2',
            fechaEmision: '2026-11-10',
            fechaContable: '2026-11-10',
            moneda: 'PEN',
            total: 5,
            totalSoles: 5,
            creditoFiscal: true,
            estado: 'ANULADA',
          },
        ]),
      ),
    ),
    obtener: vi.fn(() => of(COMPRA)),
    registrar: vi.fn(() => of(COMPRA)),
    anular: vi.fn(() =>
      of({ ...COMPRA, estado: 'ANULADA', anuladoPor: 'admin', motivoAnulacion: 'x' }),
    ),
    ordenes: vi.fn(() =>
      of(
        pagina([
          {
            id: 'oc1',
            numero: 'OC-00000001',
            proveedor: ORDEN.proveedor,
            almacen: ORDEN.almacen,
            fecha: '2026-11-10',
            fechaEntrega: '2026-11-20',
            moneda: 'USD',
            total: 283.2,
            estado: 'EMITIDA',
          },
          { ...ORDEN, id: 'oc2', almacen: null, estado: 'CERRADA' },
        ]),
      ),
    ),
    orden: vi.fn(() => of(ORDEN)),
    crearOrden: vi.fn(() => of({ ...ORDEN, id: 'oc9' })),
    actualizarOrden: vi.fn(() => of(ORDEN)),
    aprobarOrden: vi.fn(() => of({ ...ORDEN, estado: 'EMITIDA', aprobadoPor: 'jefe' })),
    cerrarOrden: vi.fn(() => of({ ...ORDEN, estado: 'CERRADA', motivoCierre: 'Sin stock' })),
    anularOrden: vi.fn(() => of({ ...ORDEN, estado: 'ANULADA', motivoCierre: 'Error' })),
    tiposCambio: vi.fn(() =>
      of([{ fecha: '2026-11-14', compra: 3.7, venta: 3.75, modificadoPor: 'admin' }]),
    ),
    tipoCambioVigente: vi.fn(() =>
      of({ fecha: '2026-11-14', compra: 3.7, venta: 3.75, modificadoPor: 'admin' }),
    ),
    registrarTipoCambio: vi.fn(() => of({})),
    recepciones: vi.fn(() =>
      of(
        pagina([
          {
            id: 're1',
            numero: 'RE-00000001',
            proveedor: RECEPCION.proveedor,
            almacen: RECEPCION.almacen,
            guia: 'T001-55',
            fecha: '2026-11-11',
            totalSoles: 240,
            estado: 'PENDIENTE',
          },
          {
            ...RECEPCION,
            id: 're2',
            numero: 'RE-00000002',
            almacen: null,
            guia: null,
            estado: 'ANULADA',
          },
        ]),
      ),
    ),
    recepcion: vi.fn(() => of(RECEPCION)),
    registrarRecepcion: vi.fn(() => of(RECEPCION)),
    anularRecepcion: vi.fn(() =>
      of({ ...RECEPCION, estado: 'ANULADA', anuladoPor: 'admin', motivoAnulacion: 'Error' }),
    ),
  };
}

function configurar(permisos = TODOS) {
  const api = apiFalsa();
  const socios = {
    listar: vi.fn(() =>
      of(
        pagina([
          {
            id: 'p1',
            numeroDocumento: '20100070970',
            nombre: 'REPUESTOS SAC',
            condicionSunat: 'NO HABIDO',
            bloqueado: false,
          },
          {
            id: 'p2',
            numeroDocumento: '20000000001',
            nombre: 'BLOQUEADO SAC',
            condicionSunat: null,
            bloqueado: true,
          },
        ]),
      ),
    ),
    obtener: vi.fn(() => of(PROVEEDOR)),
  };
  const articulos = {
    obtener: vi.fn((id: string) => of(id === 'srv1' ? SERVICIO : FILTRO)),
    listar: vi.fn(() => of(pagina([]))),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      sesionFalsa(permisos, { sucursales: [{ id: 's1', codigo: 'CUS01', nombre: 'Cusco' }] })
        .proveedor,
      { provide: ComprasApi, useValue: api },
      { provide: SociosApi, useValue: socios },
      { provide: ArticulosApi, useValue: articulos },
      {
        provide: InventarioApi,
        useValue: {
          almacenes: vi.fn(() =>
            of([
              {
                id: 'al1',
                codigo: 'CUS01-01',
                nombre: 'Principal',
                sucursalId: 's1',
                sucursalCodigo: 'CUS01',
                sucursalNombre: 'Cusco',
              },
              {
                id: 'al2',
                codigo: 'JUL01-01',
                nombre: 'Principal',
                sucursalId: 's2',
                sucursalCodigo: 'JUL01',
                sucursalNombre: 'Juliaca',
              },
            ]),
          ),
        },
      },
      {
        provide: CentrosApi,
        useValue: {
          listar: vi.fn(() =>
            of([
              { id: 'cc1', codigo: 'CC-ALM', nombre: 'Almacén', imputable: true, activo: true },
              {
                id: 'cc0',
                codigo: 'CC-OPE',
                nombre: 'Operaciones',
                imputable: false,
                activo: true,
              },
            ]),
          ),
        },
      },
    ],
  });
  return { api, socios, articulos };
}

async function crear<T>(componente: Type<T>, entradas: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(componente);
  for (const [k, v] of Object.entries(entradas)) fixture.componentRef.setInput(k, v);
  const html = fixture.nativeElement as HTMLElement;
  const estable = async () => {
    for (let i = 0; i < 6; i++) {
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
  return {
    fixture,
    html,
    estable,
    escribir,
    boton,
    instancia: fixture.componentInstance as unknown,
  };
}

describe('cálculo de compras', () => {
  it('calcula el IGV por línea, con y sin IGV incluido', () => {
    expect(importeLinea(3, 10.555, 'GRAVADO', false)).toEqual({
      valorVenta: 31.67,
      igv: 5.7,
      total: 37.37,
    });
    expect(importeLinea(2, 59, 'GRAVADO', true)).toEqual({ valorVenta: 100, igv: 18, total: 118 });
    expect(importeLinea(1, 100, 'EXONERADO', true)).toEqual({
      valorVenta: 100,
      igv: 0,
      total: 100,
    });
    expect(centimos(1.005)).toBe(1.01);
    expect(
      totales([
        { afectacion: 'GRAVADO', valorVenta: 100, igv: 18, total: 118 },
        { afectacion: 'EXONERADO', valorVenta: 10, igv: 0, total: 10 },
        { afectacion: 'INAFECTO', valorVenta: 5, igv: 0, total: 5 },
      ]),
    ).toEqual({ gravado: 100, exonerado: 10, inafecto: 5, igv: 18, total: 133 });
    expect(claseEstadoOrden('ANULADA')).toBe('insignia-neutra');
    expect(claseEstadoOrden('BORRADOR')).toBe('insignia-alerta');
    expect(claseEstadoOrden('EMITIDA')).toBe('insignia-ok');
    expect(claseEstadoRecepcion('PENDIENTE')).toBe('insignia-alerta');
    expect(claseEstadoRecepcion('FACTURADA')).toBe('insignia-ok');
    expect(claseEstadoRecepcion('ANULADA')).toBe('insignia-neutra');
  });

  it('conoce las unidades del artículo y pide motivos', () => {
    expect(unidadesDe(FILTRO)).toEqual(['NIU', 'BX']);
    expect(factorDe(FILTRO, 'BX')).toBe(12);
    expect(factorDe(FILTRO, 'NIU')).toBe(1);
    expect(factorDe(FILTRO, 'KGM')).toBe(1);
    vi.spyOn(window, 'prompt').mockReturnValueOnce('  ').mockReturnValueOnce(' Sin stock ');
    expect(pedirMotivo('¿Por qué?')).toBeNull();
    expect(pedirMotivo('¿Por qué?')).toBe('Sin stock');
  });
});

describe('ComprasApi (contrato)', () => {
  it('usa las rutas del backend', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(ComprasApi);
    expect(api.excel({ tipo: 'FACTURA', desde: '2026-11-01', pagina: 1, tamanio: 50 })).toBe(
      '/api/v1/compras/excel?tipo=FACTURA&desde=2026-11-01',
    );
    expect(RUTA_REGISTRO_COMPRAS).toBe('/api/v1/compras/registro/excel');
    const http = TestBed.inject(HttpTestingController);
    const espera = (metodo: string, url: string, cuerpo?: unknown) => {
      const r = http.expectOne((x) => x.urlWithParams === url);
      expect(r.request.method).toBe(metodo);
      if (cuerpo !== undefined) expect(r.request.body).toEqual(cuerpo);
      r.flush({});
    };
    api.catalogos().subscribe();
    espera('GET', '/api/v1/compras/catalogos');
    api
      .listar({ texto: ' F001 ', tipo: 'FACTURA', estado: '', desde: '2026-11-01', pagina: 1 })
      .subscribe();
    espera('GET', '/api/v1/compras?texto=F001&tipo=FACTURA&desde=2026-11-01&pagina=1');
    api.obtener('c1').subscribe();
    espera('GET', '/api/v1/compras/c1');
    api.registrar({} as never).subscribe();
    espera('POST', '/api/v1/compras');
    api.anular('c1', 'error').subscribe();
    espera('POST', '/api/v1/compras/c1/anular', { motivo: 'error' });
    api.ordenes({ proveedorId: 'p1', estado: 'EMITIDA' }).subscribe();
    espera('GET', '/api/v1/compras/ordenes?proveedorId=p1&estado=EMITIDA');
    api.orden('oc1').subscribe();
    espera('GET', '/api/v1/compras/ordenes/oc1');
    api.crearOrden({} as never).subscribe();
    espera('POST', '/api/v1/compras/ordenes');
    api.actualizarOrden('oc1', {} as never).subscribe();
    espera('PUT', '/api/v1/compras/ordenes/oc1');
    api.aprobarOrden('oc1').subscribe();
    espera('POST', '/api/v1/compras/ordenes/oc1/aprobar');
    api.cerrarOrden('oc1', 'x').subscribe();
    espera('POST', '/api/v1/compras/ordenes/oc1/cerrar', { motivo: 'x' });
    api.anularOrden('oc1', 'y').subscribe();
    espera('POST', '/api/v1/compras/ordenes/oc1/anular', { motivo: 'y' });
    api.tiposCambio().subscribe();
    espera('GET', '/api/v1/compras/tipos-cambio');
    api.tipoCambioVigente('2026-11-15').subscribe();
    espera('GET', '/api/v1/compras/tipos-cambio/vigente/2026-11-15');
    api.recepciones({ proveedorId: 'p1', estado: 'PENDIENTE' }).subscribe();
    espera('GET', '/api/v1/compras/recepciones?proveedorId=p1&estado=PENDIENTE');
    api.recepcion('re1').subscribe();
    espera('GET', '/api/v1/compras/recepciones/re1');
    api.registrarRecepcion({} as never).subscribe();
    espera('POST', '/api/v1/compras/recepciones');
    api.anularRecepcion('re1', 'x').subscribe();
    espera('POST', '/api/v1/compras/recepciones/re1/anular', { motivo: 'x' });
    api.registrarTipoCambio('2026-11-15', 3.7, 3.75).subscribe();
    espera('PUT', '/api/v1/compras/tipos-cambio', {
      fecha: '2026-11-15',
      compra: 3.7,
      venta: 3.75,
    });
    http.verify();
  });
});

describe('Compras · listas', () => {
  it('muestra las pestañas', async () => {
    configurar();
    const { html } = await crear(Compras);
    expect([...html.querySelectorAll('nav a')].map((a) => a.textContent?.trim())).toEqual([
      'Compras',
      'Órdenes de compra',
      'Recepciones con guía',
      'Tipo de cambio',
    ]);
  });

  it('lista las compras con su estado y filtra', async () => {
    const { api } = configurar();
    const { html, escribir, boton, estable } = await crear(ComprasLista);
    expect(html.textContent).toContain('Sin crédito fiscal');
    expect(html.textContent).toContain('Anulada');
    expect(html.querySelector('a[href="/compras/registrar"]')).not.toBeNull();
    escribir('#c-tipo', 'FACTURA');
    boton('Buscar')?.click();
    await estable();
    expect(api.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'FACTURA', pagina: 0 }),
    );
  });

  it('muestra el error de la lista', async () => {
    const { api } = configurar(['compras:read']);
    api.listar.mockReturnValue(throwError(() => new Error('x')));
    const { html } = await crear(ComprasLista);
    expect(html.querySelector('[role=alert]')).not.toBeNull();
    expect(html.querySelector('a[href="/compras/registrar"]')).toBeNull();
  });

  it('lista las órdenes', async () => {
    const { api } = configurar();
    const { html, boton, estable } = await crear(OrdenesLista);
    expect(html.textContent).toContain('OC-00000001');
    expect(html.textContent).toContain('Cerrada');
    boton('Buscar')?.click();
    await estable();
    expect(api.ordenes).toHaveBeenCalledTimes(2);
    api.ordenes.mockReturnValue(throwError(() => new Error('x')));
    boton('Buscar')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });

  it('registra el tipo de cambio y valida los datos', async () => {
    const { api } = configurar();
    const { html, escribir, boton, estable } = await crear(TiposCambio);
    expect(html.textContent).toContain('3.750');
    boton('Guardar')?.click();
    await estable();
    expect(api.registrarTipoCambio).not.toHaveBeenCalled();
    escribir('#tc-compra', '3.7');
    escribir('#tc-venta', '3.75');
    boton('Guardar')?.click();
    await estable();
    expect(api.registrarTipoCambio).toHaveBeenCalledWith(expect.any(String), 3.7, 3.75);
    api.registrarTipoCambio.mockReturnValue(throwError(() => new Error('x')));
    escribir('#tc-compra', '3.7');
    escribir('#tc-venta', '3.75');
    boton('Guardar')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });

  it('el tipo de cambio sin permiso solo se consulta', async () => {
    const { api } = configurar(['compras:read']);
    api.tiposCambio.mockReturnValue(throwError(() => new Error('x')));
    const { html } = await crear(TiposCambio);
    expect(html.querySelector('#tc-fecha')).toBeNull();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('BuscadorProveedor', () => {
  it('busca proveedores sin bloqueo y emite el elegido', async () => {
    configurar();
    const { fixture, html, escribir, estable } = await crear(BuscadorProveedor);
    const elegidos: string[] = [];
    fixture.componentInstance.elegido.subscribe((s) => elegidos.push(s.id));
    escribir('input', 'r');
    await estable();
    escribir('input', 'repuestos');
    await new Promise((r) => setTimeout(r, 300));
    await estable();
    const opciones = html.querySelectorAll('li button');
    expect(opciones).toHaveLength(1);
    expect(html.textContent).toContain('NO HABIDO');
    html.querySelector('input')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await estable();
    expect(elegidos).toEqual(['p1']);
    fixture.destroy();
  });

  it('avisa si no hay resultados', async () => {
    const { socios } = configurar();
    socios.listar.mockReturnValue(of(pagina([])));
    const { html, escribir, estable } = await crear(BuscadorProveedor);
    escribir('input', 'nadie');
    await new Promise((r) => setTimeout(r, 300));
    await estable();
    expect(html.textContent).toContain('No hay proveedores');
    socios.listar.mockReturnValue(throwError(() => new Error('x')));
    escribir('input', 'falla');
    await new Promise((r) => setTimeout(r, 300));
    await estable();
    expect(html.querySelectorAll('li')).toHaveLength(0);
  });
});

describe('OrdenDetalle', () => {
  it('crea la orden en borrador con proveedor, almacén y artículos', async () => {
    const { api } = configurar();
    const { html, boton, estable, instancia, escribir } = await crear(OrdenDetalle);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const o = instancia as {
      elegirProveedor(s: { id: string }): Promise<void>;
      agregar(a: { id: string }): Promise<void>;
    };
    boton('Crear orden')?.click();
    await estable();
    expect(html.textContent).toContain('Elija el proveedor');
    expect(html.querySelector<HTMLSelectElement>('#oc-almacen')?.value).toBe('al1');
    await o.elegirProveedor({ id: 'p1' });
    await o.agregar({ id: 'art1' });
    await estable();
    expect(html.textContent).toContain('REPUESTOS SAC');
    expect(
      [...html.querySelectorAll('#oc-unidad-0 option')].map((x) => x.textContent?.trim()),
    ).toEqual(['NIU', 'BX']);
    escribir('#oc-cant-0', '2');
    escribir('#oc-precio-0', '120');
    await estable();
    expect(html.textContent).toContain('283.20');
    boton('Crear orden')?.click();
    await estable();
    expect(api.crearOrden).toHaveBeenCalledWith(
      expect.objectContaining({
        proveedorId: 'p1',
        almacenId: 'al1',
        diasCredito: 30,
        lineas: [{ articuloId: 'art1', unidad: 'BX', cantidad: 2, precioUnitario: 120 }],
      }),
    );
    expect(navegar).toHaveBeenCalledWith(['/compras/orden', 'oc9']);
  });

  it('edita el borrador, lo aprueba, lo cierra y lo anula', async () => {
    const { api } = configurar();
    const { html, boton, estable } = await crear(OrdenDetalle, { id: 'oc1' });
    expect(html.textContent).toContain('OC-00000001');
    boton('Guardar borrador')?.click();
    await estable();
    expect(api.actualizarOrden).toHaveBeenCalled();
    boton('Aprobar y emitir')?.click();
    await estable();
    expect(html.textContent).toContain('aprobada por jefe');
    expect(html.querySelector('a[href*="/compras/registrar?orden=oc1"]')).not.toBeNull();
    expect(html.querySelector<HTMLInputElement>('#oc-cant-0')?.disabled).toBe(true);
    vi.spyOn(window, 'prompt')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('Sin stock')
      .mockReturnValueOnce('Error');
    boton('Cerrar pendiente')?.click();
    await estable();
    expect(api.cerrarOrden).not.toHaveBeenCalled();
    boton('Cerrar pendiente')?.click();
    await estable();
    expect(api.cerrarOrden).toHaveBeenCalledWith('oc1', 'Sin stock');
    expect(html.textContent).toContain('Motivo de cierre: Sin stock');
    api.orden.mockReturnValue(of({ ...ORDEN, estado: 'EMITIDA' }));
  });

  it('anula una orden emitida y muestra los errores', async () => {
    const { api } = configurar();
    api.orden.mockReturnValue(of({ ...ORDEN, estado: 'EMITIDA' }));
    const { html, boton, estable } = await crear(OrdenDetalle, { id: 'oc1' });
    vi.spyOn(window, 'prompt').mockReturnValue('Error');
    boton('Anular')?.click();
    await estable();
    expect(api.anularOrden).toHaveBeenCalledWith('oc1', 'Error');
    expect(html.textContent).toContain('Motivo de anulación');
    api.aprobarOrden.mockReturnValue(throwError(() => new Error('x')));
    api.orden.mockReturnValue(throwError(() => new Error('x')));
    const otra = await crear(OrdenDetalle, { id: 'oc1' });
    expect(otra.html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('CompraRegistro', () => {
  interface Registro {
    elegirProveedor(s: { id: string } | string): Promise<void>;
    agregarArticulo(a: { id: string }): Promise<void>;
    articuloCreado(a: Articulo): void;
  }

  it('registra una factura con mercadería, gasto y detracción', async () => {
    const { api } = configurar();
    const { html, boton, escribir, estable, instancia } = await crear(CompraRegistro);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const r = instancia as Registro;
    boton('Registrar')?.click();
    await estable();
    expect(html.textContent).toContain('Elija el proveedor.');

    await r.elegirProveedor({ id: 'p1' });
    await estable();
    expect(html.textContent).toContain('NO HABIDO: su factura no da crédito fiscal');
    expect(html.textContent).toContain('El proveedor está sujeto a detracción.');
    expect(html.querySelector('#co-orden')).not.toBeNull();
    escribir('#co-serie', 'f001');
    escribir('#co-numero', '123');
    await r.agregarArticulo({ id: 'art1' });
    boton('+ Gasto (flete, servicio)')?.click();
    await estable();
    expect(html.textContent).toContain('Entra al almacén');
    expect(html.textContent).toContain('Lotes de FIL-000001');
    escribir('#co-cant-0', '2');
    escribir('#co-precio-0', '400');
    escribir('#co-desc-1', 'Flete');
    escribir('#co-cant-1', '1');
    escribir('#co-precio-1', '50');
    escribir('#co-detraccion', '020');
    escribir('#co-total-doc', '100');
    await estable();
    expect(html.textContent).toContain('No cuadra');
    expect(html.textContent).toContain('S/ 120');
    boton('Registrar')?.click();
    await estable();
    expect(html.textContent).toContain('centro de costo de "Flete"');
    escribir('#co-centro-1', 'cc1');
    escribir('#co-total-doc', '');
    await estable();
    boton('Registrar')?.click();
    await estable();
    expect(api.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        proveedorId: 'p1',
        tipoComprobante: 'FACTURA',
        serie: 'F001',
        numero: '123',
        almacenId: 'al1',
        detraccionCodigo: '020',
        totalDocumento: null,
        lineas: [
          expect.objectContaining({
            articuloId: 'art1',
            unidad: 'BX',
            cantidad: 2,
            precio: 400,
            afectacion: null,
          }),
          expect.objectContaining({
            articuloId: null,
            descripcion: 'Flete',
            centroCostoId: 'cc1',
            afectacion: 'GRAVADO',
          }),
        ],
      }),
    );
    expect(navegar).toHaveBeenCalledWith(['/compras/documento', 'c1']);
  });

  it('una boleta trae el IGV en el precio y en dólares propone el tipo de cambio', async () => {
    const { api } = configurar();
    const { html, escribir, estable, instancia, boton } = await crear(CompraRegistro);
    const r = instancia as Registro;
    await r.elegirProveedor('p1');
    escribir('#co-tipo', 'BOLETA');
    await estable();
    expect(
      html.querySelector<HTMLInputElement>('input[formcontrolname=preciosIncluyenIgv]')?.checked,
    ).toBe(true);
    expect(html.querySelector('#co-detraccion')).toBeNull();
    escribir('#co-moneda', 'USD');
    await estable();
    expect(api.tipoCambioVigente).toHaveBeenCalled();
    expect(html.textContent).toContain('Venta SBS del 2026-11-14');
    api.tipoCambioVigente.mockReturnValue(throwError(() => new Error('404')));
    escribir('#co-emision', '2001-01-05');
    html.querySelector('#co-emision')?.dispatchEvent(new Event('change'));
    await estable();
    expect(html.querySelector<HTMLInputElement>('#co-tc')?.value).toBe('');
    escribir('#co-serie', 'B001');
    escribir('#co-numero', '9');
    await r.agregarArticulo({ id: 'srv1' });
    await estable();
    escribir('#co-cant-0', '1');
    escribir('#co-precio-0', '59');
    boton('Registrar')?.click();
    await estable();
    expect(html.textContent).toContain('centro de costo');
    escribir('#co-centro-0', 'cc1');
    boton('Registrar')?.click();
    await estable();
    expect(html.textContent).toContain('tipo de cambio');
    api.registrar.mockReturnValue(throwError(() => new Error('x')));
    escribir('#co-tc', '3.8');
    boton('Registrar')?.click();
    await estable();
    expect(api.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ moneda: 'USD', tipoCambio: 3.8, preciosIncluyenIgv: true }),
    );
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });

  it('recibe una orden con lo pendiente y agrega un artículo creado en el diálogo', async () => {
    const { api } = configurar();
    api.orden.mockReturnValue(of({ ...ORDEN, estado: 'EMITIDA' }));
    const { html, boton, escribir, estable, instancia } = await crear(CompraRegistro, {
      orden: 'oc1',
    });
    expect(html.querySelector<HTMLSelectElement>('#co-orden')?.value).toBe('oc1');
    expect(html.querySelector<HTMLInputElement>('#co-cant-0')?.value).toBe('2');
    boton('+ Artículo nuevo')?.click();
    await estable();
    expect(html.querySelector('[role=dialog]')).not.toBeNull();
    (instancia as Registro).articuloCreado({
      ...FILTRO,
      id: 'art2',
      codigo: 'FIL-000002',
    } as Articulo);
    await estable();
    expect(html.querySelector('[role=dialog]')).toBeNull();
    expect(html.textContent).toContain('FIL-000002');
    escribir('#co-orden', '');
    await estable();
    boton('Quitar')?.click();
    await estable();
    expect(html.querySelectorAll('#co-cant-1')).toHaveLength(0);
  });

  it('registra una nota de crédito por devolución copiando los artículos del comprobante', async () => {
    const { api } = configurar();
    const { html, boton, escribir, estable } = await crear(CompraRegistro, { referencia: 'c1' });
    expect(html.querySelector<HTMLSelectElement>('#co-tipo')?.value).toBe('NOTA_CREDITO');
    expect(html.querySelector<HTMLSelectElement>('#co-ref')?.value).toBe('c1');
    expect(html.querySelector('#co-almacen')).toBeNull();
    boton('Registrar')?.click();
    await estable();
    expect(html.textContent).toContain('Revise la serie');
    boton('Copiar los artículos del comprobante')?.click();
    await estable();
    escribir('#co-serie', 'FC01');
    escribir('#co-numero', '1');
    boton('Registrar')?.click();
    await estable();
    expect(html.textContent).toContain('su motivo');
    escribir('#co-motivo', '05');
    await estable();
    expect(html.textContent).toContain('no mueve stock');
    escribir('#co-motivo', '07');
    await estable();
    expect(html.textContent).toContain('Sale al almacén');
    boton('Registrar')?.click();
    await estable();
    expect(api.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoComprobante: 'NOTA_CREDITO',
        referenciaId: 'c1',
        motivoNota: '07',
        almacenId: null,
        ordenId: null,
        lineas: [expect.objectContaining({ articuloId: 'art1', cantidad: 2, precio: 120 })],
      }),
    );
    escribir('#co-ref', '');
    await estable();
    expect(html.textContent).not.toContain('Copiar los artículos');
  });

  it('muestra los errores al cargar', async () => {
    const { api } = configurar();
    api.catalogos.mockReturnValue(throwError(() => new Error('x')));
    api.orden.mockReturnValue(throwError(() => new Error('x')));
    const { html } = await crear(CompraRegistro, { orden: 'oc1' });
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('CompraDetalle', () => {
  it('muestra importes, avisos, notas y la anula con motivo', async () => {
    const { api } = configurar();
    const { html, boton, estable } = await crear(CompraDetalle, { id: 'c1' });
    expect(html.textContent).toContain('Factura F001-123');
    expect(html.textContent).toContain('Sin crédito fiscal');
    expect(html.textContent).toContain('Detracción 020');
    expect(html.textContent).toContain('Exonerado');
    expect(html.textContent).toContain('OC-00000001');
    expect(html.querySelector('a[href*="referencia=c1"]')).not.toBeNull();
    vi.spyOn(window, 'prompt')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('Registrada por error');
    boton('Anular')?.click();
    await estable();
    expect(api.anular).not.toHaveBeenCalled();
    boton('Anular')?.click();
    await estable();
    expect(api.anular).toHaveBeenCalledWith('c1', 'Registrada por error');
    expect(html.textContent).toContain('anulada por admin');
    expect(boton('Anular')).toBeUndefined();
  });

  it('muestra una nota de crédito y los errores', async () => {
    const { api } = configurar(['compras:read']);
    api.obtener.mockReturnValue(
      of({
        ...COMPRA,
        tipoComprobante: 'NOTA_CREDITO',
        moneda: 'PEN',
        referencia: { id: 'c0', numero: 'CO-00000001 · F001-1' },
        motivoNota: {
          valor: 'NC_DEVOLUCION_ITEM',
          codigo: '07',
          descripcion: 'Devolución por ítem',
        },
        orden: null,
        almacen: null,
        detraccion: null,
        exonerado: 0,
        inafecto: 0,
        fechaVencimiento: null,
        glosa: null,
        notas: [],
        avisos: [],
      }),
    );
    const { html } = await crear(CompraDetalle, { id: 'c2' });
    expect(html.textContent).toContain('Devolución por ítem');
    expect(html.textContent).toContain('Contado');
    expect(html.querySelector('a[href*="referencia="]')).toBeNull();
    api.obtener.mockReturnValue(throwError(() => new Error('x')));
    const otra = await crear(CompraDetalle, { id: 'c3' });
    expect(otra.html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('Recepciones con guía', () => {
  it('lista las recepciones que esperan factura', async () => {
    const { api } = configurar();
    const { html, boton, estable } = await crear(RecepcionesLista);
    expect(html.textContent).toContain('RE-00000001');
    expect(html.textContent).toContain('Espera factura');
    expect(api.recepciones).toHaveBeenCalledWith(expect.objectContaining({ estado: 'PENDIENTE' }));
    api.recepciones.mockReturnValue(throwError(() => new Error('x')));
    boton('Buscar')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });

  it('recibe lo pendiente de una orden con su guía', async () => {
    const { api } = configurar();
    api.orden.mockReturnValue(of({ ...ORDEN, estado: 'EMITIDA' }));
    const { html, boton, escribir, estable } = await crear(RecepcionDetalle, { orden: 'oc1' });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(html.querySelector<HTMLSelectElement>('#re-orden')?.value).toBe('oc1');
    expect(html.querySelector<HTMLSelectElement>('#re-almacen')?.disabled).toBe(true);
    expect(html.querySelector<HTMLInputElement>('#re-costo-0')?.value).toBe('120');
    expect(html.textContent).toContain('Lotes de FIL-000001');
    escribir('#re-serie', 't001');
    boton('Registrar recepción')?.click();
    await estable();
    expect(html.textContent).toContain('serie y el número de la guía');
    escribir('#re-numero', '55');
    boton('Registrar recepción')?.click();
    await estable();
    expect(api.registrarRecepcion).toHaveBeenCalledWith(
      expect.objectContaining({
        proveedorId: 'p1',
        ordenId: 'oc1',
        almacenId: null,
        guiaSerie: 'T001',
        guiaNumero: '55',
        lineas: [
          expect.objectContaining({
            articuloId: 'art1',
            unidad: 'BX',
            cantidad: 2,
            costoUnitario: 120,
            ordenLinea: 0,
          }),
        ],
      }),
    );
    expect(navegar).toHaveBeenCalledWith(['/compras/recepcion', 're1']);
  });

  it('recibe sin orden con el costo indicado y muestra los errores', async () => {
    const { api } = configurar();
    const { html, boton, escribir, estable, instancia } = await crear(RecepcionDetalle);
    const r = instancia as {
      elegirProveedor(s: string): Promise<void>;
      agregar(a: { id: string }): Promise<void>;
    };
    boton('Registrar recepción')?.click();
    await estable();
    expect(html.textContent).toContain('Elija el proveedor');
    expect(html.querySelector<HTMLSelectElement>('#re-almacen')?.value).toBe('al1');
    await r.elegirProveedor('p1');
    await r.agregar({ id: 'art1' });
    await estable();
    escribir('#re-cant-0', '3');
    escribir('#re-costo-0', '10');
    escribir('#re-moneda', 'USD');
    await estable();
    escribir('#re-tc', '3.8');
    await estable();
    expect(html.textContent).toContain('30.00');
    api.registrarRecepcion.mockReturnValue(throwError(() => new Error('x')));
    boton('Registrar recepción')?.click();
    await estable();
    expect(api.registrarRecepcion).toHaveBeenCalledWith(
      expect.objectContaining({
        ordenId: null,
        almacenId: 'al1',
        moneda: 'USD',
        tipoCambio: 3.8,
        guiaSerie: null,
      }),
    );
    expect(html.querySelector('[role=alert]')).not.toBeNull();
    escribir('#re-orden', 'oc1');
    await estable();
    escribir('#re-orden', '');
    await estable();
    expect(html.querySelector<HTMLSelectElement>('#re-almacen')?.disabled).toBe(false);
  });

  it('muestra una recepción, ofrece registrar su factura y la anula', async () => {
    const { api } = configurar();
    const { html, boton, estable } = await crear(RecepcionDetalle, { id: 're1' });
    expect(html.textContent).toContain('T001-55');
    expect(html.textContent).toContain('OC-00000001');
    expect(html.querySelector('a[href*="/compras/registrar?recepcion=re1"]')).not.toBeNull();
    vi.spyOn(window, 'prompt').mockReturnValueOnce(null).mockReturnValueOnce('Error');
    boton('Anular')?.click();
    await estable();
    expect(api.anularRecepcion).not.toHaveBeenCalled();
    boton('Anular')?.click();
    await estable();
    expect(api.anularRecepcion).toHaveBeenCalledWith('re1', 'Error');
    expect(html.textContent).toContain('anulada por admin');
    api.anularRecepcion.mockReturnValue(throwError(() => new Error('x')));
    api.recepcion.mockReturnValue(
      of({
        ...RECEPCION,
        compra: { id: 'c1', numero: 'CO-1' },
        estado: 'FACTURADA',
        moneda: 'PEN',
      }),
    );
    const facturada = await crear(RecepcionDetalle, { id: 're1' });
    expect(facturada.html.textContent).toContain('Facturada en');
    expect(facturada.html.querySelector('a[href*="registrar?recepcion"]')).toBeNull();
    api.recepcion.mockReturnValue(throwError(() => new Error('x')));
    const fallida = await crear(RecepcionDetalle, { id: 're9' });
    expect(fallida.html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('CompraRegistro · recepciones y fletes', () => {
  it('factura una recepción con guía y suma el flete al costo', async () => {
    const { api } = configurar();
    const { html, boton, escribir, estable } = await crear(CompraRegistro, { recepcion: 're1' });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(html.querySelector<HTMLInputElement>('fieldset input[type=checkbox]')?.checked).toBe(
      true,
    );
    expect(html.textContent).toContain('Ya en el almacén');
    expect(html.querySelector('#co-orden')).toBeNull();
    expect(html.querySelector<HTMLSelectElement>('#co-almacen')?.disabled).toBe(true);
    expect(html.textContent).not.toContain('Lotes de FIL-000001');
    escribir('#co-serie', 'F001');
    escribir('#co-numero', '77');
    escribir('#co-precio-0', '130');
    boton('+ Gasto (flete, servicio)')?.click();
    await estable();
    escribir('#co-desc-1', 'Flete');
    escribir('#co-cant-1', '1');
    escribir('#co-precio-1', '40');
    html.querySelector<HTMLInputElement>('input[formcontrolname=sumaAlCosto]')?.click();
    await estable();
    expect(html.querySelector('#co-centro-1')).toBeNull();
    boton('Registrar')?.click();
    await estable();
    expect(api.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        recepcionIds: ['re1'],
        almacenId: null,
        ordenId: null,
        lineas: [
          expect.objectContaining({
            articuloId: 'art1',
            cantidad: 2,
            precio: 130,
            sumaAlCosto: false,
          }),
          expect.objectContaining({ descripcion: 'Flete', sumaAlCosto: true, centroCostoId: null }),
        ],
      }),
    );
  });

  it('deja de facturar la recepción y vuelve a elegir el almacén', async () => {
    configurar();
    const { html, estable } = await crear(CompraRegistro, { recepcion: 're1' });
    const casilla = html.querySelector<HTMLInputElement>('fieldset input[type=checkbox]');
    casilla?.click();
    await estable();
    expect(html.textContent).not.toContain('Ya en el almacén');
    expect(html.querySelector<HTMLSelectElement>('#co-almacen')?.disabled).toBe(false);
    expect(html.querySelector('#co-orden')).not.toBeNull();
  });

  it('la ficha muestra el flete incluido y las recepciones que factura', async () => {
    configurar();
    const { html } = await crear(CompraDetalle, { id: 'c1' });
    expect(html.textContent).toContain('incluye 30.00 de flete');
    expect(html.textContent).toContain('Factura las recepciones');
  });

  it('la orden muestra sus recepciones y ofrece recibir con guía', async () => {
    const { api } = configurar();
    api.orden.mockReturnValue(of({ ...ORDEN, estado: 'EMITIDA' }));
    const { html } = await crear(OrdenDetalle, { id: 'oc1' });
    expect(html.textContent).toContain('Recepciones con guía');
    expect(html.querySelector('a[href*="/compras/recepcion/nueva?orden=oc1"]')).not.toBeNull();
  });
});
