import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import {
  AlmacenOpcion,
  Conteo,
  ConteoListado,
  Existencia,
  Kardex as KardexModelo,
  Movimiento,
  MovimientoListado,
} from '../../core/modelos/api.modelos';
import { pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { ArticulosApi } from '../articulos/articulos.api';
import { CentrosApi } from '../centros/centros.api';
import { Conteos } from './conteos';
import { detalleDe, seriesDeTexto } from './detalle-stock';
import { LotesSeries, sumarDias } from './lotes-series';
import { ResumenInventario } from './resumen';
import { Traslados } from './traslados';
import { primerDiaDelMes } from './etiquetas';
import { Existencias } from './existencias';
import { Inventario } from './inventario';
import { InventarioApi, urlExcel } from './inventario.api';
import { Kardex } from './kardex';
import { Movimientos } from './movimientos';
import { Valorizacion } from './valorizacion';

const ALM: AlmacenOpcion = {
  id: 'al1',
  codigo: 'CUS01-01',
  nombre: 'Principal',
  sucursalId: 's1',
  sucursalCodigo: 'CUS01',
  sucursalNombre: 'Cusco',
};
const ALM2: AlmacenOpcion = { ...ALM, id: 'al2', codigo: 'JUL01-01', sucursalNombre: 'Juliaca' };
const REF_ALM = { id: 'al1', codigo: 'CUS01-01', nombre: 'Principal', sucursal: 'Cusco' };
const REF_ART = {
  id: 'a1',
  codigo: 'FIL-000001',
  descripcion: 'Filtro',
  unidad: 'NIU',
  control: 'NINGUNO' as const,
};
const REF_LOTE = { ...REF_ART, id: 'a3', codigo: 'LUB-000001', control: 'LOTE' as const };

const EXISTENCIA: Existencia = {
  id: 'e1',
  articulo: REF_ART,
  almacen: REF_ALM,
  cantidad: 6,
  cantidadPedida: 4,
  costoPromedio: 1,
  valor: 6,
  minimo: 5,
  maximo: 20,
  puntoReorden: 8,
  ubicacion: 'A-01',
  bajoReposicion: true,
  sugeridoReponer: 14,
  fechaUltimoMovimiento: '2026-11-11',
};

const MOVIMIENTO: Movimiento = {
  id: 'm1',
  numero: 'MI-00000001',
  tipo: 'MERMA',
  codigoSunat: '13',
  entrada: false,
  fecha: '2026-11-11',
  almacen: REF_ALM,
  glosa: 'rotura',
  referencia: 'Acta 1',
  centroCostoId: null,
  imputacionGrupoId: null,
  grupoId: null,
  anulaA: null,
  anuladoPor: null,
  usuario: 'admin',
  fechaRegistro: '2026-11-11T15:00:00Z',
  total: 6.5,
  lineas: [
    {
      linea: 1,
      articulo: REF_ART,
      cantidad: 1,
      costoUnitario: 6.5,
      costoTotal: 6.5,
      saldoCantidad: 15,
      saldoCostoPromedio: 6.5,
      saldoValor: 97.5,
      lotes: [{ codigo: 'L1', fechaVencimiento: '2027-01-01', cantidad: 1 }],
      series: ['S1'],
    },
  ],
};

const LISTADO: MovimientoListado = {
  id: 'm1',
  numero: 'MI-00000001',
  tipo: 'MERMA',
  codigoSunat: '13',
  entrada: false,
  fecha: '2026-11-11',
  almacen: REF_ALM,
  glosa: 'rotura',
  referencia: null,
  lineas: 1,
  total: 6.5,
  anulaA: null,
  anulado: true,
  usuario: 'admin',
  fechaRegistro: '2026-11-11T15:00:00Z',
};

const KARDEX: KardexModelo = {
  articulo: REF_ART,
  tipoExistencia: '01',
  almacen: REF_ALM,
  desde: '2026-11-01',
  hasta: '2026-11-11',
  saldoInicial: { cantidad: 0, costoUnitario: 0, valor: 0 },
  filas: [
    {
      fecha: '2026-11-11',
      numero: 'MI-00000001',
      tipo: 'SALDO_INICIAL',
      codigoSunat: '16',
      referencia: null,
      glosa: 'apertura',
      anulacion: false,
      entradaCantidad: 10,
      entradaCostoUnitario: 5,
      entradaTotal: 50,
      salidaCantidad: null,
      salidaCostoUnitario: null,
      salidaTotal: null,
      saldo: { cantidad: 10, costoUnitario: 5, valor: 50 },
    },
  ],
  totalEntradasCantidad: 10,
  totalEntradasValor: 50,
  totalSalidasCantidad: 0,
  totalSalidasValor: 0,
  saldoFinal: { cantidad: 10, costoUnitario: 5, valor: 50 },
};

const CONTEO: Conteo = {
  id: 'c1',
  numero: 'CF-000001',
  almacen: REF_ALM,
  fecha: '2026-11-11',
  glosa: 'cierre',
  estado: 'ABIERTO',
  congelado: true,
  lineas: [
    {
      articulo: REF_ART,
      cantidadSistema: 10,
      cantidadContada: 12,
      stockActual: 10,
      diferencia: 2,
      costoUnitario: null,
    },
    {
      articulo: { ...REF_ART, id: 'a2', codigo: 'FIL-000002' },
      cantidadSistema: 3,
      cantidadContada: null,
      stockActual: 3,
      diferencia: null,
      costoUnitario: null,
    },
  ],
  movimientos: [],
  creadoPor: 'admin',
  fechaCreacion: null,
  aplicadoPor: null,
  fechaAplicacion: null,
};

const CONTEO_LISTADO: ConteoListado = {
  id: 'c1',
  numero: 'CF-000001',
  almacen: REF_ALM,
  fecha: '2026-11-11',
  glosa: 'cierre',
  estado: 'ABIERTO',
  congelado: true,
  lineas: 2,
  contadas: 1,
  creadoPor: 'admin',
  aplicadoPor: null,
  fechaAplicacion: null,
};

const TRASLADO = {
  id: 't1',
  numero: 'TR-000001',
  origen: REF_ALM,
  destino: { ...REF_ALM, id: 'al2', codigo: 'JUL01-01' },
  estado: 'SOLICITADO' as const,
  glosa: 'pedido',
  lineas: [
    {
      articulo: REF_ART,
      cantidadSolicitada: 10,
      cantidadEnviada: null,
      cantidadRecibida: null,
      diferencia: null,
      costoEnviado: null,
      valorDiferencia: null,
      lotesEnviados: [],
      seriesEnviadas: [],
    },
    {
      articulo: REF_LOTE,
      cantidadSolicitada: 2,
      cantidadEnviada: 2,
      cantidadRecibida: 1,
      diferencia: 1,
      costoEnviado: 8,
      valorDiferencia: 4,
      lotesEnviados: [{ codigo: 'L1', fechaVencimiento: null, cantidad: 2 }],
      seriesEnviadas: ['X1'],
    },
  ],
  conDiferencias: false,
  diferenciaDevuelta: false,
  valorEnTransito: 0,
  valorFaltante: 0,
  creadoPor: 'admin',
  fechaCreacion: null,
  fechaEnvio: null,
  enviadoPor: null,
  fechaRecepcion: null,
  recibidoPor: null,
  observacionRecepcion: 'llegó uno roto',
  movimientoSalidaId: null,
  movimientoEntradaId: null,
  movimientoDevolucionId: null,
  puedeEnviar: true,
  puedeRecibir: false,
};

const TRASLADO_LISTADO = {
  id: 't1',
  numero: 'TR-000001',
  origen: REF_ALM,
  destino: { ...REF_ALM, id: 'al2', codigo: 'JUL01-01' },
  estado: 'RECIBIDO' as const,
  glosa: 'pedido',
  lineas: 1,
  conDiferencias: true,
  creadoPor: 'admin',
  fechaCreacion: null,
  fechaEnvio: '2026-11-11',
  fechaRecepcion: null,
};

const TODOS = [
  'inventario:read',
  'inventario.movimiento:create',
  'inventario.movimiento:anular',
  'inventario.transferencia:create',
  'inventario.conteo:create',
  'inventario.conteo:aplicar',
  'inventario.parametros:update',
  'inventario.revalorizacion:create',
  'inventario.traslado:solicitar',
  'inventario.traslado:enviar',
  'inventario.traslado:recibir',
  'centros:read',
];

const ARTICULO_LISTADO = {
  id: 'a1',
  codigo: 'FIL-000001',
  descripcion: 'Filtro',
  numeroParte: null,
  marca: null,
  activo: true,
  categoria: 'Filtros',
  tipo: 'INVENTARIABLE' as const,
  control: 'NINGUNO' as const,
  unidad: 'NIU',
  bloqueadoCompra: false,
  bloqueadoVenta: false,
};

function apiFalsa() {
  return {
    almacenes: vi.fn(() => of([ALM])),
    destinos: vi.fn(() => of([ALM, ALM2])),
    existencias: vi.fn(() => of(pagina([EXISTENCIA]))),
    parametros: vi.fn(() => of(EXISTENCIA)),
    valorizacion: vi.fn(() =>
      of({
        fecha: '2026-11-11',
        total: 6,
        porAlmacen: [{ almacen: REF_ALM, articulos: 1, valor: 6 }],
        porTipoExistencia: [{ tipoExistencia: '01', articulos: 1, valor: 6 }],
      }),
    ),
    movimientos: vi.fn(() => of(pagina([LISTADO]))),
    movimiento: vi.fn(() => of(MOVIMIENTO)),
    registrar: vi.fn(() => of(MOVIMIENTO)),
    anular: vi.fn(() => of({ ...MOVIMIENTO, numero: 'MI-00000002' })),
    transferir: vi.fn(() =>
      of({ salida: MOVIMIENTO, entrada: { ...MOVIMIENTO, numero: 'MI-00000003' } }),
    ),
    kardex: vi.fn(() => of(KARDEX)),
    conteos: vi.fn(() => of(pagina([CONTEO_LISTADO]))),
    conteo: vi.fn(() => of(CONTEO)),
    abrirConteo: vi.fn(() => of(CONTEO)),
    registrarConteo: vi.fn(() => of(CONTEO)),
    aplicarConteo: vi.fn(() => of({ ...CONTEO, estado: 'APLICADO', movimientos: ['m9'] })),
    anularConteo: vi.fn(() => of({ ...CONTEO, estado: 'ANULADO' })),
    revalorizar: vi.fn(() => of({ ...MOVIMIENTO, tipo: 'REVALORIZACION', numero: 'MI-00000009' })),
    lotes: vi.fn(() =>
      of(
        pagina([
          {
            id: 'l1',
            articulo: REF_LOTE,
            almacen: REF_ALM,
            codigo: 'L1',
            fechaVencimiento: '2026-11-01',
            cantidad: 3,
            diasParaVencer: -10,
          },
          {
            id: 'l2',
            articulo: REF_LOTE,
            almacen: REF_ALM,
            codigo: 'L2',
            fechaVencimiento: null,
            cantidad: 2,
            diasParaVencer: null,
          },
        ]),
      ),
    ),
    series: vi.fn(() =>
      of([
        { id: 's1', articulo: REF_ART, numero: 'S1', almacen: REF_ALM, enStock: true },
        { id: 's2', articulo: REF_ART, numero: 'S2', almacen: null, enStock: false },
      ]),
    ),
    trazabilidad: vi.fn(() =>
      of({
        serie: { id: 's1', articulo: REF_ART, numero: 'S1', almacen: REF_ALM, enStock: true },
        movimientos: [
          {
            movimientoId: 'm1',
            numero: 'MI-00000001',
            tipo: 'SALDO_INICIAL',
            entrada: true,
            fecha: '2026-11-11',
            almacen: REF_ALM,
            glosa: 'apertura',
          },
        ],
      }),
    ),
    resumen: vi.fn(() =>
      of({
        almacen: REF_ALM,
        desde: '2026-11-01',
        hasta: '2026-11-11',
        filas: [
          {
            articulo: REF_ART,
            saldoInicialCantidad: 0,
            saldoInicialValor: 0,
            entradasCantidad: 10,
            entradasValor: 50,
            salidasCantidad: 4,
            salidasValor: 20,
            saldoFinalCantidad: 6,
            saldoFinalValor: 30,
          },
        ],
        saldoInicialValor: 0,
        entradasValor: 50,
        salidasValor: 20,
        saldoFinalValor: 30,
      }),
    ),
    traslados: vi.fn(() => of(pagina([TRASLADO_LISTADO]))),
    traslado: vi.fn(() => of(TRASLADO)),
    solicitarTraslado: vi.fn(() => of(TRASLADO)),
    enviarTraslado: vi.fn(() =>
      of({
        ...TRASLADO,
        estado: 'EN_TRANSITO',
        puedeEnviar: false,
        puedeRecibir: true,
        valorEnTransito: 24,
      }),
    ),
    recibirTraslado: vi.fn(() =>
      of({
        ...TRASLADO,
        estado: 'RECIBIDO',
        puedeEnviar: false,
        valorFaltante: 6,
        conDiferencias: true,
      }),
    ),
    anularTraslado: vi.fn(() => of({ ...TRASLADO, estado: 'ANULADO', puedeEnviar: false })),
  };
}

function configurar(permisos = TODOS) {
  const api = apiFalsa();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      sesionFalsa(permisos).proveedor,
      { provide: InventarioApi, useValue: api },
      { provide: ArticulosApi, useValue: { listar: vi.fn(() => of(pagina([ARTICULO_LISTADO]))) } },
      {
        provide: CentrosApi,
        useValue: {
          listar: vi.fn(() =>
            of([{ id: 'cc', codigo: 'CC-GER', nombre: 'Gerencia', imputable: true, activo: true }]),
          ),
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
    for (let i = 0; i < 3; i++) {
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
  /** Elige un artículo en el buscador sin esperar el debounce. */
  const elegirArticulo = async () => {
    const campo = html.querySelector<HTMLInputElement>('app-buscador-articulo input');
    if (!campo) throw new Error('buscador');
    campo.value = 'filtro';
    campo.dispatchEvent(new Event('input'));
    await new Promise((r) => setTimeout(r, 320));
    await estable();
    html.querySelector<HTMLButtonElement>('app-buscador-articulo li button')?.click();
    await estable();
  };
  return { fixture, html, estable, escribir, boton, elegirArticulo };
}

describe('etiquetas', () => {
  it('calcula el primer día del mes', () => {
    expect(primerDiaDelMes('2026-11-11')).toBe('2026-11-01');
  });
});

describe('InventarioApi (contrato)', () => {
  it('usa las rutas del backend', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(InventarioApi);
    const http = TestBed.inject(HttpTestingController);
    const espera = (metodo: string, url: string, cuerpo?: unknown) => {
      const r = http.expectOne((x) => x.urlWithParams === url);
      expect(r.request.method).toBe(metodo);
      if (cuerpo !== undefined) expect(r.request.body).toEqual(cuerpo);
      r.flush({});
    };
    api.almacenes().subscribe();
    espera('GET', '/api/v1/inventario/almacenes');
    api.destinos().subscribe();
    espera('GET', '/api/v1/inventario/almacenes/destinos');
    api
      .existencias({
        almacenId: 'al1',
        texto: ' fil ',
        soloConStock: true,
        bajoReposicion: false,
        pagina: 0,
      })
      .subscribe();
    espera(
      'GET',
      '/api/v1/inventario/existencias?almacenId=al1&texto=fil&soloConStock=true&pagina=0',
    );
    api.existenciasDeArticulo('a1').subscribe();
    espera('GET', '/api/v1/inventario/existencias/articulo/a1');
    const p = {
      articuloId: 'a1',
      almacenId: 'al1',
      minimo: 1,
      maximo: null,
      puntoReorden: null,
      ubicacion: null,
    };
    api.parametros(p).subscribe();
    espera('PUT', '/api/v1/inventario/existencias/parametros', p);
    api.valorizacion().subscribe();
    espera('GET', '/api/v1/inventario/valorizacion');
    api.movimientos({ tipo: 'MERMA', desde: '2026-11-01' }).subscribe();
    espera('GET', '/api/v1/inventario/movimientos?tipo=MERMA&desde=2026-11-01');
    api.movimiento('m1').subscribe();
    espera('GET', '/api/v1/inventario/movimientos/m1');
    api.anular('m1', 'error').subscribe();
    espera('POST', '/api/v1/inventario/movimientos/m1/anular', { glosa: 'error' });
    api.kardex('a1', 'al1', '2026-11-01', '2026-11-11').subscribe();
    espera(
      'GET',
      '/api/v1/inventario/kardex?articuloId=a1&almacenId=al1&desde=2026-11-01&hasta=2026-11-11',
    );
    api.conteos({ estado: 'ABIERTO' }).subscribe();
    espera('GET', '/api/v1/inventario/conteos?estado=ABIERTO');
    api.conteo('c1').subscribe();
    espera('GET', '/api/v1/inventario/conteos/c1');
    api.registrarConteo('c1', []).subscribe();
    espera('PUT', '/api/v1/inventario/conteos/c1/lineas', { lineas: [] });
    api.aplicarConteo('c1').subscribe();
    espera('POST', '/api/v1/inventario/conteos/c1/aplicar');
    api.anularConteo('c1').subscribe();
    espera('POST', '/api/v1/inventario/conteos/c1/anular');
    http.verify();
  });
});

describe('Inventario', () => {
  it('muestra las pestañas', async () => {
    configurar();
    const { html } = await crear(Inventario);
    expect(html.textContent).toContain('Conteos físicos');
  });
});

describe('Existencias', () => {
  it('lista el stock con lo que hay que reponer y guarda los parámetros', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(Existencias);
    expect(html.textContent).toContain('FIL-000001');
    expect(html.textContent).toContain('Reponer 14');
    expect(html.querySelectorAll('tbody tr td')[4]?.textContent?.trim()).toBe('4');
    escribir('#e-almacen', 'al1');
    html.querySelector<HTMLInputElement>('input[formcontrolname=bajoReposicion]')?.click();
    boton('Buscar')?.click();
    await estable();
    expect(api.existencias).toHaveBeenLastCalledWith(
      expect.objectContaining({ almacenId: 'al1', bajoReposicion: true }),
    );
    boton('Reposición')?.click();
    await estable();
    escribir('#p-maximo', '30');
    escribir('#p-ubicacion', 'B-02');
    boton('Guardar')?.click();
    await estable();
    expect(api.parametros).toHaveBeenCalledWith({
      articuloId: 'a1',
      almacenId: 'al1',
      minimo: 5,
      puntoReorden: 8,
      maximo: 30,
      ubicacion: 'B-02',
    });
  });

  it('sin permiso no edita parámetros y muestra errores', async () => {
    const api = configurar(['inventario:read']);
    api.existencias.mockReturnValue(throwError(() => new Error('x')));
    const { html } = await crear(Existencias);
    expect(html.querySelector('[role=alert]')).not.toBeNull();
    expect(html.textContent).not.toContain('Reposición');
  });
});

describe('Valorizacion', () => {
  it('muestra el total por almacén y por tipo de existencia', async () => {
    const api = configurar();
    const { html, escribir, estable } = await crear(Valorizacion);
    expect(html.textContent).toContain('01 · Mercaderías');
    escribir('#v-almacen', 'al1');
    await estable();
    expect(api.valorizacion).toHaveBeenLastCalledWith('al1');
  });
});

describe('Movimientos', () => {
  it('registra un saldo inicial con costo', async () => {
    const api = configurar();
    const { html, escribir, boton, estable, elegirArticulo } = await crear(Movimientos);
    expect(html.textContent).toContain('MI-00000001');
    boton('Nuevo movimiento')?.click();
    await estable();
    escribir('#f-glosa', 'Apertura');
    await elegirArticulo();
    escribir('#f-cant-0', '10');
    escribir('#f-costo-0', '5');
    boton('Registrar')?.click();
    await estable();
    expect(api.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'SALDO_INICIAL',
        almacenId: 'al1',
        glosa: 'Apertura',
        centroCostoId: null,
        lineas: [{ articuloId: 'a1', cantidad: 10, costoUnitario: 5, lotes: [], series: [] }],
      }),
    );
    expect(html.textContent).toContain('Saldo valor');
  });

  it('un consumo interno exige centro de costo y no manda costo', async () => {
    const api = configurar();
    const { html, escribir, boton, estable, elegirArticulo } = await crear(Movimientos);
    boton('Nuevo movimiento')?.click();
    await estable();
    escribir('#f-tipo', 'CONSUMO_INTERNO');
    escribir('#f-glosa', 'Taller');
    await elegirArticulo();
    escribir('#f-cant-0', '2');
    expect(html.querySelector('#f-costo-0')).toBeNull();
    boton('Registrar')?.click();
    await estable();
    expect(api.registrar).not.toHaveBeenCalled();
    expect(html.textContent).toContain('Datos incompletos');
    escribir('#f-centro', 'cc');
    boton('Registrar')?.click();
    await estable();
    expect(api.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'CONSUMO_INTERNO',
        centroCostoId: 'cc',
        lineas: [{ articuloId: 'a1', cantidad: 2, costoUnitario: null, lotes: [], series: [] }],
      }),
    );
  });

  it('no registra sin artículos', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(Movimientos);
    boton('Nuevo movimiento')?.click();
    await estable();
    escribir('#f-glosa', 'x');
    boton('Registrar')?.click();
    await estable();
    expect(api.registrar).not.toHaveBeenCalled();
    expect(html.textContent).toContain('Sin artículos');
    boton('Cancelar')?.click();
    await estable();
    expect(html.querySelector('#f-glosa')).toBeNull();
  });

  it('transfiere a un almacén de otra sucursal', async () => {
    const api = configurar();
    const { escribir, boton, estable, elegirArticulo } = await crear(Movimientos);
    boton('Transferencia')?.click();
    await estable();
    escribir('#f-origen', 'al1');
    await estable();
    escribir('#f-destino', 'al2');
    escribir('#f-glosa', 'Reposición');
    await elegirArticulo();
    escribir('#f-cant-0', '4');
    boton('Registrar')?.click();
    await estable();
    expect(api.transferir).toHaveBeenCalledWith(
      expect.objectContaining({
        almacenOrigenId: 'al1',
        almacenDestinoId: 'al2',
        lineas: [{ articuloId: 'a1', cantidad: 4, lotes: [], series: [] }],
      }),
    );
  });

  it('ve el detalle, lo anula con motivo y filtra', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(Movimientos);
    boton('MI-00000001')?.click();
    await estable();
    expect(html.textContent).toContain('tabla 12: 13');
    vi.spyOn(window, 'prompt').mockReturnValueOnce('').mockReturnValueOnce('rotura mal registrada');
    boton('Anular')?.click();
    await estable();
    expect(api.anular).not.toHaveBeenCalled();
    boton('Anular')?.click();
    await estable();
    expect(api.anular).toHaveBeenCalledWith('m1', 'rotura mal registrada');
    escribir('#m-tipo', 'MERMA');
    boton('Buscar')?.click();
    await estable();
    expect(api.movimientos).toHaveBeenLastCalledWith(expect.objectContaining({ tipo: 'MERMA' }));
  });

  it('con permiso de lectura solo consulta y reporta errores', async () => {
    const api = configurar(['inventario:read']);
    api.registrar.mockReturnValue(throwError(() => new Error('x')));
    api.movimiento.mockReturnValue(throwError(() => new Error('x')));
    const { html, boton, estable } = await crear(Movimientos);
    expect(boton('Nuevo movimiento')).toBeUndefined();
    expect(boton('Transferencia')).toBeUndefined();
    boton('MI-00000001')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('Kardex', () => {
  it('consulta el kardex llegando con artículo y almacén en la URL', async () => {
    const api = configurar();
    const { html } = await crear(Kardex, { articuloId: 'a1', almacenId: 'al1' });
    expect(api.kardex).toHaveBeenCalledWith('a1', 'al1', expect.any(String), expect.any(String));
    expect(html.textContent).toContain('formato 13.1');
    expect(html.textContent).toContain('16 · Saldo inicial');
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    [...html.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Imprimir')?.click();
    expect(imprimir).toHaveBeenCalled();
  });

  it('pide artículo antes de consultar y luego usa el elegido', async () => {
    const api = configurar();
    const { html, escribir, boton, estable, elegirArticulo } = await crear(Kardex);
    boton('Consultar')?.click();
    await estable();
    expect(api.kardex).not.toHaveBeenCalled();
    expect(html.textContent).toContain('Datos incompletos');
    await elegirArticulo();
    escribir('#k-almacen', 'al1');
    boton('Consultar')?.click();
    await estable();
    expect(api.kardex).toHaveBeenCalledWith('a1', 'al1', expect.any(String), expect.any(String));
  });

  it('muestra el error de la API', async () => {
    const api = configurar();
    api.kardex.mockReturnValue(throwError(() => new Error('x')));
    const { html } = await crear(Kardex, { articuloId: 'a1', almacenId: 'al1' });
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('Conteos', () => {
  it('abre un conteo de artículos elegidos', async () => {
    const api = configurar();
    const { html, escribir, boton, estable, elegirArticulo } = await crear(Conteos);
    expect(html.textContent).toContain('1 / 2');
    boton('Nuevo conteo')?.click();
    await estable();
    escribir('#n-glosa', 'Rotativo');
    await elegirArticulo();
    expect(html.textContent).toContain('FIL-000001');
    boton('Abrir conteo')?.click();
    await estable();
    expect(api.abrirConteo).toHaveBeenCalledWith({
      almacenId: 'al1',
      glosa: 'Rotativo',
      articuloIds: ['a1'],
      congelar: true,
    });
    expect(html.textContent).toContain('Aplicar ajustes');
  });

  it('registra lo contado, aplica y anula', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(Conteos);
    boton('CF-000001')?.click();
    await estable();
    escribir('#ct-cant-1', '2');
    boton('Guardar conteo')?.click();
    await estable();
    expect(api.registrarConteo).toHaveBeenCalledWith('c1', [
      { articuloId: 'a1', cantidadContada: 12, costoUnitario: null },
      { articuloId: 'a2', cantidadContada: 2, costoUnitario: null },
    ]);
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    boton('Aplicar ajustes')?.click();
    await estable();
    expect(api.aplicarConteo).toHaveBeenCalledWith('c1');
    expect(html.textContent).toContain('Aplicado');
    expect(html.querySelector<HTMLInputElement>('#ct-cant-0')?.disabled).toBe(true);

    api.conteo.mockReturnValue(of(CONTEO));
    boton('CF-000001')?.click();
    await estable();
    boton('Anular conteo')?.click();
    await estable();
    expect(api.anularConteo).toHaveBeenCalledWith('c1');
    expect(confirmar).toHaveBeenCalledTimes(2);
  });

  it('sin permiso para aplicar solo cuenta; los errores se muestran', async () => {
    const api = configurar(['inventario:read', 'inventario.conteo:create']);
    api.registrarConteo.mockReturnValue(throwError(() => new Error('x')));
    const { html, boton, estable } = await crear(Conteos);
    boton('CF-000001')?.click();
    await estable();
    expect(boton('Aplicar ajustes')).toBeUndefined();
    boton('Guardar conteo')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('ayudas de lotes, series y Excel', () => {
  it('convierte el detalle y arma los enlaces', () => {
    expect(seriesDeTexto(' s1, s2;\ns3 ')).toEqual(['S1', 'S2', 'S3']);
    expect(
      detalleDe({ lotes: [{ codigo: ' l1 ', fechaVencimiento: '', cantidad: 2 }], series: 'a b' }),
    ).toEqual({
      lotes: [{ codigo: 'L1', fechaVencimiento: null, cantidad: 2 }],
      series: ['A', 'B'],
    });
    expect(urlExcel('lotes', { almacenId: '', venceAntesDe: '2026-12-01' })).toBe(
      '/api/v1/inventario/lotes/excel?venceAntesDe=2026-12-01',
    );
    expect(urlExcel('existencias', {})).toBe('/api/v1/inventario/existencias/excel');
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02');
  });
});

describe('Movimientos · lotes, series y revalorización', () => {
  it('pide lotes con vencimiento en la entrada de un artículo por lote', async () => {
    const api = configurar();
    const articulos = TestBed.inject(ArticulosApi) as unknown as {
      listar: ReturnType<typeof vi.fn>;
    };
    articulos.listar.mockReturnValue(of(pagina([{ ...ARTICULO_LISTADO, control: 'LOTE' }])));
    const { html, escribir, boton, estable, elegirArticulo } = await crear(Movimientos);
    boton('Nuevo movimiento')?.click();
    await estable();
    escribir('#f-glosa', 'Apertura');
    await elegirArticulo();
    escribir('#f-cant-0', '5');
    escribir('#f-costo-0', '2');
    boton('+ Lote')?.click();
    await estable();
    escribir('#f-0-lote-0', 'l9');
    escribir('#f-0-vence-0', '2027-03-01');
    escribir('#f-0-lcant-0', '5');
    boton('Registrar')?.click();
    await estable();
    expect(api.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        lineas: [
          {
            articuloId: 'a1',
            cantidad: 5,
            costoUnitario: 2,
            lotes: [{ codigo: 'L9', fechaVencimiento: '2027-03-01', cantidad: 5 }],
            series: [],
          },
        ],
      }),
    );
    expect(html.textContent).toContain('Lote L1');
    expect(html.textContent).toContain('Series: S1');
  });

  it('indica series en una merma de un artículo por serie', async () => {
    const api = configurar();
    const articulos = TestBed.inject(ArticulosApi) as unknown as {
      listar: ReturnType<typeof vi.fn>;
    };
    articulos.listar.mockReturnValue(of(pagina([{ ...ARTICULO_LISTADO, control: 'SERIE' }])));
    const { escribir, boton, estable, elegirArticulo } = await crear(Movimientos);
    boton('Nuevo movimiento')?.click();
    await estable();
    escribir('#f-tipo', 'MERMA');
    escribir('#f-glosa', 'Robo');
    await elegirArticulo();
    escribir('#f-cant-0', '2');
    escribir('#f-0-series', 'b1, b2');
    boton('Registrar')?.click();
    await estable();
    expect(api.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ lineas: [expect.objectContaining({ series: ['B1', 'B2'] })] }),
    );
  });

  it('revaloriza con el nuevo costo unitario', async () => {
    const api = configurar();
    const { escribir, boton, estable, elegirArticulo } = await crear(Movimientos);
    boton('Revalorizar')?.click();
    await estable();
    escribir('#f-glosa', 'Costo mal ingresado');
    await elegirArticulo();
    escribir('#f-nuevo-0', '6.5');
    boton('Registrar')?.click();
    await estable();
    expect(api.revalorizar).toHaveBeenCalledWith(
      expect.objectContaining({
        almacenId: 'al1',
        glosa: 'Costo mal ingresado',
        lineas: [{ articuloId: 'a1', costoUnitario: 6.5 }],
      }),
    );
  });
});

describe('Traslados', () => {
  it('solicita, envía y recibe con diferencia', async () => {
    const api = configurar();
    const { html, escribir, boton, estable, elegirArticulo } = await crear(Traslados);
    expect(html.textContent).toContain('TR-000001');
    expect(html.textContent).toContain('Diferencias');

    boton('Solicitar traslado')?.click();
    await estable();
    boton('Solicitar')?.click();
    await estable();
    expect(api.solicitarTraslado).not.toHaveBeenCalled();
    escribir('#s-origen', 'al1');
    await estable();
    escribir('#s-destino', 'al2');
    escribir('#s-glosa', 'pedido');
    await elegirArticulo();
    escribir('#s-cant-0', '10');
    boton('Solicitar')?.click();
    await estable();
    expect(api.solicitarTraslado).toHaveBeenCalledWith({
      almacenOrigenId: 'al1',
      almacenDestinoId: 'al2',
      glosa: 'pedido',
      lineas: [{ articuloId: 'a1', cantidad: 10 }],
    });
    expect(html.textContent).toContain('llegó uno roto');

    boton('Enviar')?.click();
    await estable();
    escribir('#p-cant-0', '8');
    boton('Confirmar envío')?.click();
    await estable();
    expect(api.enviarTraslado).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        lineas: [
          { articuloId: 'a1', cantidad: 8, lotes: [], series: [] },
          { articuloId: 'a3', cantidad: 2, lotes: [], series: [] },
        ],
      }),
    );
    expect(html.textContent).toContain('En tránsito');

    boton('Recibir')?.click();
    await estable();
    escribir('#p-observacion', 'faltó uno');
    html.querySelector<HTMLInputElement>('input[formcontrolname=devolverDiferencia]')?.click();
    boton('Confirmar recepción')?.click();
    await estable();
    expect(api.recibirTraslado).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ observacion: 'faltó uno', devolverDiferencia: true }),
    );
    expect(html.textContent).toContain('Faltante no devuelto');
  });

  it('anula con confirmación y muestra errores', async () => {
    const api = configurar();
    const { html, boton, estable } = await crear(Traslados);
    boton('TR-000001')?.click();
    await estable();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    boton('Anular')?.click();
    await estable();
    expect(api.anularTraslado).not.toHaveBeenCalled();
    boton('Anular')?.click();
    await estable();
    expect(api.anularTraslado).toHaveBeenCalledWith('t1');
    api.traslado.mockReturnValue(throwError(() => new Error('x')));
    boton('TR-000001')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });

  it('con solo lectura no solicita ni envía', async () => {
    configurar(['inventario:read']);
    const { boton, estable } = await crear(Traslados);
    expect(boton('Solicitar traslado')).toBeUndefined();
    boton('TR-000001')?.click();
    await estable();
    expect(boton('Enviar')).toBeUndefined();
  });
});

describe('LotesSeries', () => {
  it('lista lotes por vencer y busca series con su historia', async () => {
    const api = configurar();
    const { html, escribir, boton, estable, elegirArticulo } = await crear(LotesSeries);
    expect(html.textContent).toContain('vencido hace 10 d');
    expect(html.querySelector('a[download]')?.getAttribute('href')).toContain('venceAntesDe=');
    escribir('#l-dias', '');
    boton('Buscar')?.click();
    await estable();
    expect(api.lotes).toHaveBeenLastCalledWith(
      expect.objectContaining({ venceAntesDe: undefined }),
    );

    await elegirArticulo();
    expect(api.series).toHaveBeenCalledWith({ articuloId: 'a1', numero: undefined });
    expect(html.textContent).toContain('Fuera del inventario');
    boton('Historia')?.click();
    await estable();
    expect(html.textContent).toContain('Historia de la serie');
    boton('Quitar')?.click();
    await estable();
    escribir('#s-numero', 's1');
    [...html.querySelectorAll('button')]
      .filter((b) => b.textContent?.trim() === 'Buscar')
      .at(-1)
      ?.click();
    await estable();
    expect(api.series).toHaveBeenLastCalledWith({ articuloId: undefined, numero: 's1' });
  });

  it('muestra errores de la API', async () => {
    const api = configurar();
    api.lotes.mockReturnValue(throwError(() => new Error('x')));
    const { html } = await crear(LotesSeries);
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('ResumenInventario', () => {
  it('consulta el resumen del período y ofrece el Excel', async () => {
    const api = configurar();
    const { html, boton, estable } = await crear(ResumenInventario);
    boton('Consultar')?.click();
    await estable();
    expect(api.resumen).toHaveBeenCalledWith('al1', expect.any(String), expect.any(String));
    expect(html.textContent).toContain('FIL-000001');
    expect(html.querySelector('a[download]')?.getAttribute('href')).toContain(
      '/resumen/excel?almacenId=al1',
    );
  });

  it('pide almacén y muestra errores', async () => {
    const api = configurar();
    api.almacenes.mockReturnValue(of([ALM, ALM2]));
    api.resumen.mockReturnValue(throwError(() => new Error('x')));
    const { html, escribir, boton, estable } = await crear(ResumenInventario);
    boton('Consultar')?.click();
    await estable();
    expect(html.textContent).toContain('Datos incompletos');
    escribir('#r-almacen', 'al2');
    boton('Consultar')?.click();
    await estable();
    expect(api.resumen).toHaveBeenCalled();
  });
});
