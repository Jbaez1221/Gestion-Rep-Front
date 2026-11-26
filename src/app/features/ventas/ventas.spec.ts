import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import {
  Articulo,
  ArticuloVenta,
  Cotizacion,
  ListaPrecios,
  Mostrador,
  PedidoVenta,
} from '../../core/modelos/api.modelos';
import { pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { ArticulosApi } from '../articulos/articulos.api';
import { InventarioApi } from '../inventario/inventario.api';
import { SociosApi } from '../socios/socios.api';
import { BuscadorCliente } from './buscador-cliente';
import {
  claseEstadoCotizacion,
  claseEstadoPedido,
  conDescuento,
  importeVenta,
  siglaDocumento,
} from './calculo-venta';
import { CotizacionesLista } from './cotizaciones-lista';
import { ListasPrecios } from './listas-precios';
import { PedidoDetalle } from './pedido-detalle';
import { PedidosLista } from './pedidos-lista';
import { Ventas } from './ventas';
import { VentasApi } from './ventas.api';

const TODOS = [
  'ventas:read',
  'ventas.pedido:create',
  'ventas.cotizacion:create',
  'ventas.pedido:anular',
  'ventas.precios:update',
];

const ARTICULO: ArticuloVenta = {
  articuloId: 'a1',
  codigo: 'FIL-000001',
  descripcion: 'Filtro de aceite',
  numeroParte: '90915',
  marca: 'TOYOTA',
  unidadBase: 'NIU',
  unidadVenta: 'NIU',
  afectacionIgv: 'GRAVADO',
  disponible: 1,
  unidades: [
    { unidad: 'NIU', factor: 1, precio: 16.6, origen: 'MARGEN', bajoCosto: false },
    { unidad: 'BX', factor: 12, precio: null, origen: null, bajoCosto: false },
  ],
  alternativas: [],
};

const MOSTRADOR: Mostrador = {
  lista: { id: 'l1', nombre: 'Mostrador' },
  cliente: { id: 'cv', tipoDocumento: '0', documento: '00000000', nombre: 'CLIENTES VARIOS' },
  descuentoMaximo: 5,
  articulos: [
    ARTICULO,
    {
      ...ARTICULO,
      articuloId: 'a2',
      codigo: 'FIL-000002',
      numeroParte: null,
      marca: null,
      disponible: 0,
      alternativas: [{ ...ARTICULO, articuloId: 'a3', codigo: 'FIL-000003', disponible: 4 }],
    },
    { ...ARTICULO, articuloId: 's1', codigo: 'SER-000001', disponible: null },
  ],
};

const PEDIDO: PedidoVenta = {
  id: 'p1',
  numero: 'PV-00000001',
  sucursalId: 's1',
  almacen: { id: 'al1', codigo: 'CUS01-01', nombre: 'Principal', sucursal: 'Cusco' },
  vendedor: 'ana',
  cliente: { id: 'c1', tipoDocumento: '1', documento: '44556677', nombre: 'JUAN PEREZ' },
  lista: { id: 'l1', nombre: 'Mostrador' },
  tipoComprobante: 'BOLETA',
  estado: 'BORRADOR',
  fecha: '2026-11-15',
  fechaEnvio: null,
  gravado: 28.14,
  exonerado: 0,
  inafecto: 0,
  igv: 5.06,
  total: 33.2,
  descuento: 0,
  autorizadoPor: null,
  observacion: null,
  cotizacionId: null,
  cobroId: null,
  fechaCierre: null,
  cerradoPor: null,
  motivoAnulacion: null,
  lineas: [
    {
      linea: 0,
      articuloId: 'a1',
      articuloCodigo: 'FIL-000001',
      descripcion: 'Filtro de aceite',
      unidad: 'NIU',
      factor: 1,
      cantidad: 2,
      precioLista: 16.6,
      origenPrecio: 'MARGEN',
      descuento: 0,
      precioUnitario: 16.6,
      afectacion: 'GRAVADO',
      valorVenta: 28.14,
      igv: 5.06,
      total: 33.2,
    },
  ],
  avisos: ['De FIL-000001 solo hay 1 NIU disponibles: no se podrá enviar a caja.'],
  creadoPor: 'ana',
  fechaCreacion: null,
};

const COTIZACION: Cotizacion = {
  id: 'ct1',
  numero: 'CT-00000001',
  sucursalId: 's1',
  almacen: PEDIDO.almacen,
  vendedor: 'ana',
  cliente: PEDIDO.cliente,
  lista: PEDIDO.lista,
  tipoComprobante: 'BOLETA',
  estado: 'VIGENTE',
  fecha: '2026-11-15',
  validaHasta: '2026-11-22',
  gravado: 28.14,
  exonerado: 0,
  inafecto: 0,
  igv: 5.06,
  total: 33.2,
  descuento: 0,
  autorizadoPor: null,
  observacion: null,
  condiciones: 'Contado',
  pedido: null,
  fechaCierre: null,
  cerradoPor: null,
  motivoAnulacion: null,
  lineas: PEDIDO.lineas,
  avisos: ['De FIL-000001 solo hay 1 NIU disponibles hoy: la cotización no reserva stock.'],
  creadoPor: 'ana',
  fechaCreacion: null,
};

const LISTA: ListaPrecios = {
  id: 'l1',
  codigo: 'MOSTRADOR',
  nombre: 'Mostrador',
  margenDefecto: 40,
  descuentoMaximo: 5,
  porDefecto: true,
  activo: true,
  margenes: [{ categoriaId: 'fil', margen: 50 }],
};

function configurar(permisos = TODOS) {
  const api = {
    mostrador: vi.fn(() => of(MOSTRADOR)),
    pedidosExcel: vi.fn(() => '/api/v1/ventas/pedidos/excel'),
    pedidos: vi.fn(() =>
      of(
        pagina([
          {
            id: 'p1',
            numero: 'PV-00000001',
            fecha: '2026-11-15',
            cliente: PEDIDO.cliente,
            vendedor: 'ana',
            tipoComprobante: 'BOLETA',
            total: 33.2,
            estado: 'ENVIADO',
          },
          {
            id: 'p2',
            numero: 'PV-00000002',
            fecha: '2026-11-15',
            cliente: { ...PEDIDO.cliente, tipoDocumento: '6' },
            vendedor: 'ana',
            tipoComprobante: 'FACTURA',
            total: 10,
            estado: 'COBRADO',
          },
        ]),
      ),
    ),
    pedido: vi.fn(() => of(PEDIDO)),
    cotizaciones: vi.fn(() =>
      of(
        pagina([
          {
            id: 'ct1',
            numero: 'CT-00000001',
            fecha: '2026-11-15',
            validaHasta: '2026-11-22',
            cliente: PEDIDO.cliente,
            vendedor: 'ana',
            tipoComprobante: 'BOLETA',
            total: 33.2,
            estado: 'ACEPTADA',
            pedidoNumero: 'PV-00000009',
          },
        ]),
      ),
    ),
    cotizacionesExcel: vi.fn(() => '/api/v1/ventas/cotizaciones/excel'),
    cotizacionExcel: vi.fn((id: string) => `/api/v1/ventas/cotizaciones/${id}/excel`),
    cotizacion: vi.fn(() => of(COTIZACION)),
    crearCotizacion: vi.fn(() => of(COTIZACION)),
    actualizarCotizacion: vi.fn(() => of(COTIZACION)),
    anularCotizacion: vi.fn(() =>
      of({ ...COTIZACION, estado: 'ANULADA', motivoAnulacion: 'Sin respuesta', avisos: [] }),
    ),
    convertirCotizacion: vi.fn(() => of({ ...PEDIDO, id: 'p9', cotizacionId: 'ct1' })),
    crear: vi.fn(() => of(PEDIDO)),
    actualizar: vi.fn(() => of(PEDIDO)),
    enviar: vi.fn(() => of({ ...PEDIDO, estado: 'ENVIADO', avisos: [] })),
    devolver: vi.fn(() => of(PEDIDO)),
    anular: vi.fn(() => of({ ...PEDIDO, estado: 'ANULADO' })),
    listas: vi.fn(() =>
      of([
        LISTA,
        {
          ...LISTA,
          id: 'l2',
          codigo: 'TALLER',
          nombre: 'Talleres',
          porDefecto: false,
          activo: false,
          margenes: [],
        },
      ]),
    ),
    crearLista: vi.fn(() => of({ ...LISTA, id: 'l3', nombre: 'Nueva' })),
    actualizarLista: vi.fn(() => of(LISTA)),
    precios: vi.fn(() =>
      of([
        {
          id: 'pr1',
          articuloId: 'a1',
          articuloCodigo: 'FIL-000001',
          unidad: 'NIU',
          precio: 15,
          modificadoPor: 'admin',
        },
      ]),
    ),
    fijarPrecio: vi.fn(() => of({})),
    quitarPrecio: vi.fn(() => of({})),
    listaDeCliente: vi.fn(() =>
      of({ socioId: 'c1', lista: { id: 'l1', nombre: 'Mostrador' }, asignada: false }),
    ),
    asignarLista: vi.fn(() =>
      of({ socioId: 'c1', lista: { id: 'l2', nombre: 'Talleres' }, asignada: true }),
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      sesionFalsa(permisos, { sucursales: [{ id: 's1', codigo: 'CUS01', nombre: 'Cusco' }] })
        .proveedor,
      { provide: VentasApi, useValue: api },
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
            ]),
          ),
        },
      },
      {
        provide: SociosApi,
        useValue: {
          listar: vi.fn(() =>
            of(
              pagina([
                {
                  id: 'c9',
                  tipoDocumento: 'RUC',
                  numeroDocumento: '20100070970',
                  nombre: 'TALLER SAC',
                  bloqueado: false,
                },
              ]),
            ),
          ),
        },
      },
      {
        provide: ArticulosApi,
        useValue: {
          categorias: vi.fn(() =>
            of([{ id: 'fil', nombre: 'Filtros', prefijo: 'FIL', padreId: null, activo: true }]),
          ),
          obtener: vi.fn(() =>
            of({
              id: 'a1',
              codigo: 'FIL-000001',
              descripcion: 'Filtro',
              unidadVenta: 'NIU',
              unidadBase: { codigoSunat: 'NIU' },
              unidadesAlternas: [{ unidadSunat: 'BX', factor: 12 }],
            } as unknown as Articulo),
          ),
          listar: vi.fn(() => of(pagina([]))),
        },
      },
    ],
  });
  return api;
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
  return {
    fixture,
    html,
    estable,
    escribir,
    boton,
    instancia: fixture.componentInstance as unknown,
  };
}

describe('cálculo de ventas', () => {
  it('aplica el descuento y desglosa el IGV', () => {
    expect(conDescuento(16.6, 5)).toBe(15.77);
    expect(importeVenta(3, 16.6, 'GRAVADO')).toEqual({ valorVenta: 42.2, igv: 7.6, total: 49.8 });
    expect(importeVenta(1, 12, 'INAFECTO')).toEqual({ valorVenta: 12, igv: 0, total: 12 });
    expect(siglaDocumento('6')).toBe('RUC');
    expect(siglaDocumento('X')).toBe('X');
    expect(claseEstadoPedido('ENVIADO')).toBe('insignia-alerta');
    expect(claseEstadoPedido('COBRADO')).toBe('insignia-ok');
    expect(claseEstadoPedido('ANULADO')).toBe('insignia-neutra');
    expect(claseEstadoCotizacion('VIGENTE')).toBe('insignia-alerta');
    expect(claseEstadoCotizacion('ACEPTADA')).toBe('insignia-ok');
    expect(claseEstadoCotizacion('VENCIDA')).toBe('insignia-neutra');
  });
});

describe('VentasApi (contrato)', () => {
  it('usa las rutas del backend', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(VentasApi);
    expect(api.pedidosExcel({ estado: 'COBRADO', propios: true, pagina: 2 })).toBe(
      '/api/v1/ventas/pedidos/excel?estado=COBRADO&propios=true',
    );
    const http = TestBed.inject(HttpTestingController);
    const espera = (metodo: string, url: string, cuerpo?: unknown) => {
      const r = http.expectOne((x) => x.urlWithParams === url);
      expect(r.request.method).toBe(metodo);
      if (cuerpo !== undefined) expect(r.request.body).toEqual(cuerpo);
      r.flush({});
    };
    api.mostrador('al1', null, ' filtro ').subscribe();
    espera('GET', '/api/v1/ventas/mostrador?almacenId=al1&texto=filtro');
    api.pedidos({ estado: 'ENVIADO', propios: true, pagina: 1 }).subscribe();
    espera('GET', '/api/v1/ventas/pedidos?estado=ENVIADO&propios=true&pagina=1');
    api.pedido('p1').subscribe();
    espera('GET', '/api/v1/ventas/pedidos/p1');
    api.crear({} as never).subscribe();
    espera('POST', '/api/v1/ventas/pedidos');
    api.actualizar('p1', {} as never).subscribe();
    espera('PUT', '/api/v1/ventas/pedidos/p1');
    api.enviar('p1').subscribe();
    espera('POST', '/api/v1/ventas/pedidos/p1/enviar');
    api.devolver('p1').subscribe();
    espera('POST', '/api/v1/ventas/pedidos/p1/devolver');
    api.anular('p1', 'x').subscribe();
    espera('POST', '/api/v1/ventas/pedidos/p1/anular', { motivo: 'x' });
    expect(api.cotizacionesExcel({ estado: 'VIGENTE', pagina: 3 })).toBe(
      '/api/v1/ventas/cotizaciones/excel?estado=VIGENTE',
    );
    expect(api.cotizacionExcel('ct1')).toBe('/api/v1/ventas/cotizaciones/ct1/excel');
    api.cotizaciones({ texto: ' CT ', propios: true, pagina: 1 }).subscribe();
    espera('GET', '/api/v1/ventas/cotizaciones?texto=CT&propios=true&pagina=1');
    api.cotizacion('ct1').subscribe();
    espera('GET', '/api/v1/ventas/cotizaciones/ct1');
    api.crearCotizacion({} as never).subscribe();
    espera('POST', '/api/v1/ventas/cotizaciones');
    api.actualizarCotizacion('ct1', {} as never).subscribe();
    espera('PUT', '/api/v1/ventas/cotizaciones/ct1');
    api.anularCotizacion('ct1', 'x').subscribe();
    espera('POST', '/api/v1/ventas/cotizaciones/ct1/anular', { motivo: 'x' });
    api.convertirCotizacion('ct1').subscribe();
    espera('POST', '/api/v1/ventas/cotizaciones/ct1/pedido');
    api.listas().subscribe();
    espera('GET', '/api/v1/ventas/listas');
    api.crearLista({} as never).subscribe();
    espera('POST', '/api/v1/ventas/listas');
    api.actualizarLista('l1', {} as never).subscribe();
    espera('PUT', '/api/v1/ventas/listas/l1');
    api.precios('l1', ' fil ').subscribe();
    espera('GET', '/api/v1/ventas/listas/l1/precios?texto=fil');
    api.fijarPrecio('l1', 'a1', 'NIU', 15).subscribe();
    espera('PUT', '/api/v1/ventas/listas/l1/precios', {
      articuloId: 'a1',
      unidad: 'NIU',
      precio: 15,
    });
    api.quitarPrecio('l1', 'pr1').subscribe();
    espera('DELETE', '/api/v1/ventas/listas/l1/precios/pr1');
    api.listaDeCliente('c1').subscribe();
    espera('GET', '/api/v1/ventas/clientes/c1/lista');
    api.asignarLista('c1', null).subscribe();
    espera('PUT', '/api/v1/ventas/clientes/c1/lista', { listaId: null });
    http.verify();
  });
});

describe('Ventas · pedidos', () => {
  it('muestra las pestañas y la lista con filtros', async () => {
    const api = configurar();
    const tabs = await crear(Ventas);
    expect(tabs.html.textContent).toContain('Listas de precios');
    expect(tabs.html.querySelector('a[href="/ventas/pedido/nuevo"]')).not.toBeNull();
    const { html, boton, estable } = await crear(PedidosLista);
    expect(html.textContent).toContain('PV-00000001');
    expect(html.textContent).toContain('En caja');
    expect(html.textContent).toContain('RUC');
    html.querySelector<HTMLInputElement>('input[formcontrolname=propios]')?.click();
    boton('Buscar')?.click();
    await estable();
    expect(api.pedidos).toHaveBeenLastCalledWith(expect.objectContaining({ propios: true }));
    api.pedidos.mockReturnValue(throwError(() => new Error('x')));
    boton('Buscar')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });

  it('arma un pedido en el mostrador y lo envía a caja', async () => {
    const api = configurar();
    const { html, boton, escribir, estable } = await crear(PedidoDetalle);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    boton('Enviar a caja')?.click();
    await estable();
    expect(html.textContent).toContain('agregue al menos un artículo');
    escribir('#pv-buscar', 'filtro');
    html.querySelector('#pv-buscar')?.closest('form')?.dispatchEvent(new Event('submit'));
    await estable();
    expect(api.mostrador).toHaveBeenCalledWith('al1', null, 'filtro');
    expect(html.textContent).toContain('Lista de precios: Mostrador');
    expect(html.textContent).toContain('BX: sin precio');
    expect(html.textContent).toContain('Equivalentes disponibles');
    expect(html.textContent).toContain('servicio');
    boton('+ NIU · S/ 16.60')?.click();
    boton('+ NIU · S/ 16.60')?.click();
    await estable();
    expect(html.querySelector<HTMLInputElement>('#pv-cant-0')?.value).toBe('2');
    expect(html.textContent).toContain('Sin stock suficiente');
    expect(html.textContent).toContain('33.20');
    escribir('#pv-desc-0', '10');
    await estable();
    expect(html.textContent).toContain('Requiere autorización');
    escribir('#pv-desc-0', '0');
    escribir('#pv-cant-0', '50');
    await estable();
    expect(html.textContent).toContain('más de S/ 700');
    escribir('#pv-comprobante', 'FACTURA');
    await estable();
    expect(html.textContent).toContain('requiere un cliente con RUC');
    escribir('#pv-comprobante', 'BOLETA');
    escribir('#pv-cant-0', '1');
    boton('Enviar a caja')?.click();
    await estable();
    expect(api.crear).toHaveBeenCalledWith({
      almacenId: 'al1',
      clienteId: null,
      tipoComprobante: 'BOLETA',
      observacion: null,
      lineas: [{ articuloId: 'a1', unidad: 'NIU', cantidad: 1, descuento: 0 }],
    });
    expect(api.enviar).toHaveBeenCalledWith('p1');
    expect(navegar).toHaveBeenCalledWith(['/ventas/pedido', 'p1']);
  });

  it('elige un cliente con RUC y propone factura', async () => {
    const api = configurar();
    const { html, estable, instancia, boton } = await crear(PedidoDetalle);
    (instancia as { elegirCliente(s: unknown): void }).elegirCliente({
      id: 'c9',
      tipoDocumento: 'RUC',
      numeroDocumento: '20100070970',
      nombre: 'TALLER SAC',
    });
    await estable();
    expect(html.querySelector<HTMLSelectElement>('#pv-comprobante')?.value).toBe('FACTURA');
    expect(api.mostrador).toHaveBeenLastCalledWith('al1', 'c9', '');
    boton('Clientes varios')?.click();
    await estable();
    expect(html.querySelector<HTMLSelectElement>('#pv-comprobante')?.value).toBe('BOLETA');
    const otro = await crear(BuscadorCliente);
    expect(otro.html.textContent).toContain('Cliente');
  });

  it('abre un borrador, lo guarda, lo devuelve y lo anula', async () => {
    const api = configurar();
    const { html, boton, estable } = await crear(PedidoDetalle, { id: 'p1' });
    expect(html.textContent).toContain('PV-00000001');
    expect(html.textContent).toContain('solo hay 1 NIU');
    expect(html.textContent).toContain('JUAN PEREZ');
    boton('Guardar borrador')?.click();
    await estable();
    expect(api.actualizar).toHaveBeenCalledWith('p1', expect.objectContaining({ clienteId: 'c1' }));
    api.pedido.mockReturnValue(of({ ...PEDIDO, estado: 'ENVIADO' }));
    const enviado = await crear(PedidoDetalle, { id: 'p1' });
    expect(enviado.html.querySelector<HTMLInputElement>('#pv-cant-0')?.disabled).toBe(true);
    enviado.boton('Devolver a borrador')?.click();
    await enviado.estable();
    expect(api.devolver).toHaveBeenCalledWith('p1');
    vi.spyOn(window, 'prompt').mockReturnValueOnce('El cliente se fue');
    enviado.boton('Anular')?.click();
    await enviado.estable();
    expect(api.anular).toHaveBeenCalledWith('p1', 'El cliente se fue');
    expect(enviado.html.textContent).toContain('Anulado');
  });

  it('muestra los errores del pedido', async () => {
    const api = configurar();
    api.pedido.mockReturnValue(throwError(() => new Error('x')));
    const { html } = await crear(PedidoDetalle, { id: 'p9' });
    expect(html.querySelector('[role=alert]')).not.toBeNull();
    api.crear.mockReturnValue(throwError(() => new Error('x')));
    api.mostrador.mockReturnValue(throwError(() => new Error('x')));
    const nuevo = await crear(PedidoDetalle);
    nuevo.escribir('#pv-buscar', 'x');
    nuevo.html.querySelector('#pv-buscar')?.closest('form')?.dispatchEvent(new Event('submit'));
    await nuevo.estable();
    expect(nuevo.html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('Ventas · cotizaciones', () => {
  it('lista las cotizaciones con su pedido y filtros', async () => {
    const api = configurar();
    const tabs = await crear(Ventas);
    expect(tabs.html.querySelector('a[href="/ventas/cotizacion/nueva"]')).not.toBeNull();
    expect(tabs.html.textContent).toContain('Cotizaciones');
    const { html, boton, estable } = await crear(CotizacionesLista);
    expect(html.textContent).toContain('CT-00000001');
    expect(html.textContent).toContain('Aceptada');
    expect(html.textContent).toContain('PV-00000009');
    expect(html.querySelector('a[download]')?.getAttribute('href')).toBe(
      '/api/v1/ventas/cotizaciones/excel',
    );
    html.querySelector<HTMLInputElement>('input[formcontrolname=propios]')?.click();
    boton('Buscar')?.click();
    await estable();
    expect(api.cotizaciones).toHaveBeenLastCalledWith(expect.objectContaining({ propios: true }));
    api.cotizaciones.mockReturnValue(throwError(() => new Error('x')));
    boton('Buscar')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });

  it('arma una cotización con su validez y condiciones', async () => {
    const api = configurar();
    const { html, boton, escribir, estable } = await crear(PedidoDetalle, { modo: 'cotizacion' });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(html.textContent).toContain('Nueva cotización');
    expect(boton('Enviar a caja')).toBeUndefined();
    escribir('#pv-buscar', 'filtro');
    html.querySelector('#pv-buscar')?.closest('form')?.dispatchEvent(new Event('submit'));
    await estable();
    boton('+ NIU · S/ 16.60')?.click();
    escribir('#pv-validez', '15');
    escribir('#pv-condiciones', 'Contado');
    await estable();
    boton('Guardar cotización')?.click();
    await estable();
    expect(api.crearCotizacion).toHaveBeenCalledWith({
      almacenId: 'al1',
      clienteId: null,
      tipoComprobante: 'BOLETA',
      observacion: null,
      diasValidez: 15,
      condiciones: 'Contado',
      lineas: [{ articuloId: 'a1', unidad: 'NIU', cantidad: 1, descuento: 0 }],
    });
    expect(navegar).toHaveBeenCalledWith(['/ventas/cotizacion', 'ct1']);
  });

  it('abre una vigente, la descarga, la convierte en pedido o la anula', async () => {
    const api = configurar();
    const { html, boton, estable } = await crear(PedidoDetalle, { id: 'ct1', modo: 'cotizacion' });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(html.textContent).toContain('CT-00000001');
    expect(html.textContent).toContain('2026-11-22');
    expect(html.textContent).toContain('no reserva stock');
    expect(html.querySelector<HTMLInputElement>('#pv-validez')?.value).toBe('7');
    expect(html.querySelector<HTMLTextAreaElement>('#pv-condiciones')?.value).toBe('Contado');
    expect(html.querySelector('a[download]')?.getAttribute('href')).toBe(
      '/api/v1/ventas/cotizaciones/ct1/excel',
    );
    boton('Guardar cotización')?.click();
    await estable();
    expect(api.actualizarCotizacion).toHaveBeenCalledWith(
      'ct1',
      expect.objectContaining({ diasValidez: 7, condiciones: 'Contado' }),
    );
    boton('Convertir en pedido')?.click();
    await estable();
    expect(api.convertirCotizacion).toHaveBeenCalledWith('ct1');
    expect(navegar).toHaveBeenCalledWith(['/ventas/pedido', 'p9']);
    vi.spyOn(window, 'prompt').mockReturnValueOnce('Sin respuesta');
    boton('Anular')?.click();
    await estable();
    expect(api.anularCotizacion).toHaveBeenCalledWith('ct1', 'Sin respuesta');
    expect(html.textContent).toContain('anulada: Sin respuesta');
    expect(boton('Convertir en pedido')).toBeUndefined();
  });

  it('una aceptada solo se consulta y enlaza su pedido', async () => {
    const api = configurar();
    api.cotizacion.mockReturnValue(
      of({ ...COTIZACION, estado: 'ACEPTADA', pedido: { id: 'p9', nombre: 'PV-00000009' } }),
    );
    const { html, boton } = await crear(PedidoDetalle, { id: 'ct1', modo: 'cotizacion' });
    expect(html.querySelector('a[href="/ventas/pedido/p9"]')?.textContent).toContain('PV-00000009');
    expect(html.querySelector<HTMLInputElement>('#pv-cant-0')?.disabled).toBe(true);
    expect(boton('Guardar cotización')).toBeUndefined();
    expect(boton('Convertir en pedido')).toBeUndefined();
    api.pedido.mockReturnValue(of({ ...PEDIDO, cotizacionId: 'ct1' }));
    const pedido = await crear(PedidoDetalle, { id: 'p1' });
    expect(pedido.html.querySelector('a[href="/ventas/cotizacion/ct1"]')).not.toBeNull();
  });

  it('sin permiso de pedido no convierte y muestra los errores', async () => {
    const api = configurar(['ventas:read', 'ventas.cotizacion:create']);
    const { html, boton } = await crear(PedidoDetalle, { id: 'ct1', modo: 'cotizacion' });
    expect(boton('Convertir en pedido')).toBeUndefined();
    expect(boton('Guardar cotización')).not.toBeUndefined();
    api.cotizacion.mockReturnValue(throwError(() => new Error('x')));
    const fallida = await crear(PedidoDetalle, { id: 'ct9', modo: 'cotizacion' });
    expect(fallida.html.querySelector('[role=alert]')).not.toBeNull();
    expect(html.textContent).toContain('CT-00000001');
  });
});

describe('Ventas · listas de precios', () => {
  it('edita márgenes, fija precios y asigna la lista de un cliente', async () => {
    const api = configurar();
    const { html, boton, escribir, estable, instancia } = await crear(ListasPrecios);
    expect(html.textContent).toContain('Por defecto');
    expect(html.textContent).toContain('Inactiva');
    boton('Mostrador')?.click();
    await estable();
    expect(html.querySelector<HTMLInputElement>('#lp-cat-fil')?.value).toBe('50');
    expect(html.textContent).toContain('FIL-000001');
    escribir('#lp-cat-fil', '45');
    boton('Guardar lista')?.click();
    await estable();
    expect(api.actualizarLista).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({
        margenes: [{ categoriaId: 'fil', margen: 45 }],
        margenDefecto: 40,
      }),
    );
    const l = instancia as {
      elegirArticulo(a: unknown): Promise<void>;
      elegirCliente(s: unknown): Promise<void>;
    };
    await l.elegirArticulo({ id: 'a1' });
    await estable();
    expect(
      [...html.querySelectorAll('#lp-unidad option')].map((o) => o.textContent?.trim()),
    ).toEqual(['NIU', 'BX']);
    escribir('#lp-precio', '15.5');
    boton('Fijar precio')?.click();
    await estable();
    expect(api.fijarPrecio).toHaveBeenCalledWith('l1', 'a1', 'NIU', 15.5);
    boton('Quitar')?.click();
    await estable();
    expect(api.quitarPrecio).toHaveBeenCalledWith('l1', 'pr1');
    await l.elegirCliente({ id: 'c1', nombre: 'JUAN PEREZ' });
    await estable();
    expect(html.textContent).toContain('(por defecto)');
    escribir('#lp-asignar', 'l1');
    boton('Asignar')?.click();
    await estable();
    expect(api.asignarLista).toHaveBeenCalledWith('c1', 'l1');
    expect(html.textContent).toContain('Talleres');
  });

  it('crea una lista nueva y muestra errores', async () => {
    const api = configurar();
    const { boton, escribir, estable } = await crear(ListasPrecios);
    boton('Nueva lista')?.click();
    await estable();
    boton('Guardar lista')?.click();
    await estable();
    expect(api.crearLista).not.toHaveBeenCalled();
    escribir('#lp-codigo', 'web');
    escribir('#lp-nombre', 'Ventas web');
    boton('Guardar lista')?.click();
    await estable();
    expect(api.crearLista).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'WEB', margenDefecto: null, margenes: [] }),
    );
    api.listas.mockReturnValue(throwError(() => new Error('x')));
    const fallida = await crear(ListasPrecios);
    expect(fallida.html.querySelector('[role=alert]')).not.toBeNull();
  });

  it('sin permiso solo consulta', async () => {
    configurar(['ventas:read']);
    const { html, boton, estable } = await crear(ListasPrecios);
    expect(boton('Nueva lista')).toBeUndefined();
    boton('Mostrador')?.click();
    await estable();
    expect(html.querySelector<HTMLInputElement>('#lp-nombre')?.disabled).toBe(true);
    expect(boton('Guardar lista')).toBeUndefined();
  });
});
