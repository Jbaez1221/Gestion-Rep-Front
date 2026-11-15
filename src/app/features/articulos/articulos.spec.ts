import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Articulo, ArticuloListado, Categoria } from '../../core/modelos/api.modelos';
import { pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { CentrosApi } from '../centros/centros.api';
import { InventarioApi } from '../inventario/inventario.api';
import { ArticuloDetalle } from './articulo-detalle';
import { Articulos } from './articulos';
import { ArticulosApi } from './articulos.api';
import { ArticulosLista } from './articulos-lista';
import { BuscadorArticulo } from './buscador-articulo';
import { CatalogosArticulos } from './catalogos';
import { ImportacionArticulos } from './importacion';
import { arbolDeCategorias, etiquetaCategoria } from './categorias';

const SIN_VALORES = {
  tipoDefecto: null,
  tipoExistenciaDefecto: null,
  unidadDefectoId: null,
  afectacionIgvDefecto: null,
  codigoProductoSunatDefecto: null,
};
const FIL: Categoria = {
  id: 'fil',
  nombre: 'Filtros',
  prefijo: 'FIL',
  padreId: null,
  activo: true,
  ...SIN_VALORES,
  unidadDefectoId: 'u1',
  tipoDefecto: 'INVENTARIABLE',
};
const AIRE: Categoria = {
  id: 'aire',
  nombre: 'Aire',
  prefijo: null,
  padreId: 'fil',
  activo: true,
  ...SIN_VALORES,
};
const MOT: Categoria = {
  id: 'mot',
  nombre: 'Motor',
  prefijo: 'MOT',
  padreId: null,
  activo: true,
  ...SIN_VALORES,
};

const LISTADO: ArticuloListado = {
  id: 'a1',
  codigo: 'FIL-000001',
  descripcion: 'Filtro de aceite',
  numeroParte: '90915-YZZD4',
  marca: 'TOYOTA',
  activo: true,
  categoria: 'Filtros',
  tipo: 'INVENTARIABLE',
  control: 'NINGUNO',
  unidad: 'NIU',
  bloqueadoCompra: true,
  bloqueadoVenta: false,
};

const SERVICIO: ArticuloListado = { ...LISTADO, id: 's1', codigo: 'SER-000001', tipo: 'SERVICIO' };

const ARTICULO: Articulo = {
  id: 'a1',
  codigo: 'FIL-000001',
  descripcion: 'Filtro de aceite',
  descripcionCorta: null,
  numeroParte: '90915-YZZD4',
  marca: { id: 'm1', nombre: 'TOYOTA' },
  origen: 'ORIGINAL',
  categoria: { id: 'fil', nombre: 'Filtros' },
  tipo: 'INVENTARIABLE',
  control: 'NINGUNO',
  tipoExistencia: 'MERCADERIAS',
  unidadBase: { id: 'u1', codigoSunat: 'NIU', nombre: 'Unidad' },
  unidadCompra: 'NIU',
  unidadVenta: 'NIU',
  afectacionIgv: 'GRAVADO',
  codigoProductoSunat: null,
  centroBeneficioId: null,
  pesoKg: null,
  volumenM3: null,
  activo: true,
  bloqueadoCompra: false,
  bloqueadoVenta: false,
  codigosBarras: [{ codigo: '7750001', unidadSunat: 'NIU' }],
  propiedades: { viscosidad: '10W40' },
  imagenPrincipalId: 'img1',
  avisos: [
    'Falta el código de producto SUNAT (catálogo 25): defínalo en la categoría o en el artículo antes de facturar.',
  ],
  codigosAlternos: [{ codigo: 'PROV-1', referencia: 'Proveedor' }],
  unidadesAlternas: [{ unidadSunat: 'BX', factor: 10 }],
  equivalentes: [
    {
      id: 'a2',
      codigo: 'FIL-000002',
      descripcion: 'Alternativo',
      numeroParte: null,
      marca: null,
      activo: true,
    },
  ],
  creadoPor: 'admin',
  fechaCreacion: null,
  modificadoPor: 'admin',
  fechaModificacion: null,
};

const PROPIEDAD = {
  id: 'p1',
  categoriaId: 'fil',
  categoria: 'Filtros',
  clave: 'viscosidad',
  etiqueta: 'Viscosidad',
  tipo: 'LISTA' as const,
  opciones: ['10W40', '20W50'],
  obligatoria: true,
  orden: 1,
  activo: true,
};

const TODOS = [
  'articulos:read',
  'articulos:create',
  'articulos:update',
  'articulos.catalogos:update',
  'articulos:importar',
  'articulos.tributario:update',
  'inventario:read',
  'inventario.movimiento:create',
  'centros:read',
];

function apiFalsa() {
  return {
    listar: vi.fn(() => of(pagina([LISTADO, SERVICIO]))),
    obtener: vi.fn(() => of(ARTICULO)),
    crear: vi.fn(() => of({ ...ARTICULO, id: 'nuevo', codigo: 'FIL-000009' })),
    actualizar: vi.fn(() => of(ARTICULO)),
    cambiarEstado: vi.fn(() => of({ ...ARTICULO, bloqueadoVenta: true })),
    equivalencias: vi.fn(() => of(ARTICULO)),
    sunat: vi.fn(() =>
      of({
        tiposExistencia: [{ valor: 'MERCADERIAS', codigo: '01', descripcion: 'Mercaderías' }],
        afectacionesIgv: [{ valor: 'GRAVADO', codigo: '10', descripcion: 'Gravado' }],
      }),
    ),
    marcas: vi.fn(() => of([{ id: 'm1', nombre: 'TOYOTA', activo: true }])),
    crearMarca: vi.fn(() => of({})),
    renombrarMarca: vi.fn(() => of({})),
    estadoMarca: vi.fn(() => of({})),
    categorias: vi.fn(() => of([MOT, AIRE, FIL])),
    crearCategoria: vi.fn(() => of({})),
    actualizarCategoria: vi.fn(() => of({})),
    estadoCategoria: vi.fn(() => of({})),
    unidades: vi.fn(() =>
      of([
        { id: 'u1', codigoSunat: 'NIU', nombre: 'Unidad', activo: true },
        { id: 'u2', codigoSunat: 'BX', nombre: 'Caja', activo: true },
      ]),
    ),
    crearUnidad: vi.fn(() => of({})),
    estadoUnidad: vi.fn(() => of({})),
    valoresCategoria: vi.fn(() =>
      of({
        categoriaId: 'fil',
        prefijo: 'FIL',
        tipo: 'INVENTARIABLE',
        tipoExistencia: 'MERCADERIAS',
        unidad: { id: 'u1', codigoSunat: 'NIU', nombre: 'Unidad' },
        afectacionIgv: 'GRAVADO',
        codigoProductoSunat: '25174100',
        propiedades: [PROPIEDAD],
      }),
    ),
    propiedades: vi.fn(() => of([PROPIEDAD])),
    crearPropiedad: vi.fn(() => of(PROPIEDAD)),
    estadoPropiedad: vi.fn(() => of(PROPIEDAD)),
    adjuntos: vi.fn(() =>
      of([
        {
          id: 'img1',
          nombre: 'foto.png',
          tipoContenido: 'image/png',
          tamanio: 10,
          principal: true,
          creadoPor: 'admin',
          fechaCreacion: null,
        },
        {
          id: 'pdf1',
          nombre: 'ficha.pdf',
          tipoContenido: 'application/pdf',
          tamanio: 10,
          principal: false,
          creadoPor: 'admin',
          fechaCreacion: null,
        },
        {
          id: 'img2',
          nombre: 'otra.png',
          tipoContenido: 'image/png',
          tamanio: 10,
          principal: false,
          creadoPor: 'admin',
          fechaCreacion: null,
        },
      ]),
    ),
    subirAdjunto: vi.fn(() => of({})),
    adjuntoPrincipal: vi.fn(() => of({})),
    eliminarAdjunto: vi.fn(() => of({})),
    importar: vi.fn((_: File, aplicar: boolean) =>
      of({
        aplicado: aplicar,
        filas: 2,
        nuevos: 1,
        actualizados: 0,
        errores: 1,
        detalle: [
          {
            fila: 2,
            codigo: 'FIL-000001',
            descripcion: 'Filtro',
            estado: 'NUEVO',
            mensajes: ['Se crea la marca X.'],
          },
          {
            fila: 3,
            codigo: null,
            descripcion: 'Malo',
            estado: 'ERROR',
            mensajes: ['Categoría: no existe.'],
          },
        ],
      }),
    ),
  };
}

function configurar(permisos = TODOS) {
  const api = apiFalsa();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      sesionFalsa(permisos).proveedor,
      { provide: ArticulosApi, useValue: api },
      {
        provide: CentrosApi,
        useValue: {
          listar: vi.fn(() =>
            of([
              { id: 'cb', codigo: 'CB-REP', nombre: 'Repuestos', imputable: true, activo: true },
            ]),
          ),
        },
      },
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
          registrar: vi.fn(() => of({ numero: 'MI-00000001' })),
          existenciasDeArticulo: vi.fn(() =>
            of([
              {
                id: 'e1',
                almacen: { id: 'al1', codigo: 'CUS01-01', nombre: 'Principal', sucursal: 'Cusco' },
                cantidad: 5,
                costoPromedio: 12.5,
                fechaUltimoMovimiento: '2026-11-10',
              },
            ]),
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
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
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
  return { fixture, html, estable, escribir, boton };
}

describe('árbol de categorías', () => {
  it('ordena por nombre, indenta y hereda el prefijo del padre', () => {
    const arbol = arbolDeCategorias([MOT, AIRE, FIL]);
    expect(arbol.map((n) => [n.categoria.nombre, n.nivel, n.prefijoEfectivo])).toEqual([
      ['Filtros', 0, 'FIL'],
      ['Aire', 1, 'FIL'],
      ['Motor', 0, 'MOT'],
    ]);
    expect(arbol[1] && etiquetaCategoria(arbol[1])).toBe('  Aire');
  });
});

describe('ArticulosApi (contrato)', () => {
  it('usa las rutas del backend', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(ArticulosApi);
    const http = TestBed.inject(HttpTestingController);
    const espera = (metodo: string, url: string, cuerpo?: unknown) => {
      const r = http.expectOne((x) => x.urlWithParams === url);
      expect(r.request.method).toBe(metodo);
      if (cuerpo !== undefined) expect(r.request.body).toEqual(cuerpo);
      r.flush({});
    };
    api.listar({ texto: ' filtro ', tipo: '', activo: true, pagina: 1 }).subscribe();
    espera('GET', '/api/v1/articulos?texto=filtro&activo=true&pagina=1');
    api.obtener('a1').subscribe();
    espera('GET', '/api/v1/articulos/a1');
    api.porCodigo('ab/1').subscribe();
    espera('GET', '/api/v1/articulos/codigo/ab%2F1');
    api
      .cambiarEstado('a1', { activo: true, bloqueadoCompra: true, bloqueadoVenta: false })
      .subscribe();
    espera('PATCH', '/api/v1/articulos/a1/estado', {
      activo: true,
      bloqueadoCompra: true,
      bloqueadoVenta: false,
    });
    api.equivalencias('a1', ['a2']).subscribe();
    espera('PUT', '/api/v1/articulos/a1/equivalencias', { equivalentes: ['a2'] });
    api.sunat().subscribe();
    espera('GET', '/api/v1/articulos/catalogos/sunat');
    api.crearMarca('X').subscribe();
    espera('POST', '/api/v1/articulos/catalogos/marcas', { nombre: 'X' });
    api.renombrarMarca('m1', 'Y').subscribe();
    espera('PUT', '/api/v1/articulos/catalogos/marcas/m1', { nombre: 'Y' });
    api.estadoMarca('m1', false).subscribe();
    espera('PATCH', '/api/v1/articulos/catalogos/marcas/m1/estado', { activo: false });
    const cat = {
      nombre: 'C',
      prefijo: 'CC',
      padreId: null,
      tipoDefecto: null,
      tipoExistenciaDefecto: null,
      unidadDefectoId: null,
      afectacionIgvDefecto: null,
      codigoProductoSunatDefecto: null,
    };
    api.crearCategoria(cat).subscribe();
    espera('POST', '/api/v1/articulos/catalogos/categorias');
    api.actualizarCategoria('c1', { ...cat, padreId: 'p' }).subscribe();
    espera('PUT', '/api/v1/articulos/catalogos/categorias/c1');
    api.estadoCategoria('c1', true).subscribe();
    espera('PATCH', '/api/v1/articulos/catalogos/categorias/c1/estado', { activo: true });
    api.unidades().subscribe();
    espera('GET', '/api/v1/articulos/catalogos/unidades');
    api.crearUnidad({ codigoSunat: 'KT', nombre: 'Kit' }).subscribe();
    espera('POST', '/api/v1/articulos/catalogos/unidades', { codigoSunat: 'KT', nombre: 'Kit' });
    api.estadoUnidad('u1', false).subscribe();
    espera('PATCH', '/api/v1/articulos/catalogos/unidades/u1/estado', { activo: false });
    http.verify();
  });
});

describe('Articulos', () => {
  it('muestra las pestañas', async () => {
    configurar();
    const { html } = await crear(Articulos);
    expect(html.textContent).toContain('Marcas, categorías y unidades');
  });
});

describe('ArticulosLista', () => {
  it('lista con bloqueos y filtra por estado y categoría', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(ArticulosLista);
    expect(html.textContent).toContain('FIL-000001');
    expect(html.textContent).toContain('Sin compra');
    expect(html.textContent).toContain('Nuevo artículo');
    escribir('#a-estado', 'todos');
    escribir('#a-categoria', 'fil');
    boton('Buscar')?.click();
    await estable();
    expect(api.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ activo: null, categoriaId: 'fil' }),
    );
  });

  it('muestra el error de la API', async () => {
    const api = configurar(['articulos:read']);
    api.listar.mockReturnValue(throwError(() => new Error('caída')));
    const { html } = await crear(ArticulosLista);
    expect(html.querySelector('[role=alert]')).not.toBeNull();
    expect(html.textContent).not.toContain('Nuevo artículo');
  });
});

describe('ArticuloDetalle', () => {
  it('crea un artículo con código automático, barras, alterno y unidad alterna', async () => {
    const api = configurar();
    const { fixture, html, escribir, boton, estable } = await crear(ArticuloDetalle);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    escribir('#ar-descripcion', 'Filtro de aire');
    escribir('#ar-categoria', 'aire');
    await estable();
    expect(html.querySelector<HTMLInputElement>('#ar-codigo')?.placeholder).toContain('FIL-');
    escribir('#ar-prop-viscosidad', '10W40');
    boton('Ver o cambiar')?.click();
    await estable();
    escribir('#ar-beneficio', 'cb');
    escribir('#ar-control', 'NINGUNO');
    boton('+ Código de barras')?.click();
    boton('+ Código alterno')?.click();
    boton('+ Unidad alterna')?.click();
    await estable();
    escribir('#ar-barra-0', '7750099');
    escribir('#ar-alt-0', 'X-1');
    escribir('#ar-ua-0', 'BX');
    escribir('#ar-uaf-0', '12');
    await estable();
    expect(
      [...html.querySelectorAll('#ar-ucompra option')].map((o) => o.textContent?.trim()),
    ).toEqual(['Igual a la unidad base (NIU)', 'BX']);
    boton('Crear artículo')?.click();
    await estable();
    expect(api.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: null,
        descripcion: 'Filtro de aire',
        categoriaId: 'aire',
        tipo: 'INVENTARIABLE',
        tipoExistencia: 'MERCADERIAS',
        unidadBaseId: 'u1',
        centroBeneficioId: 'cb',
        codigosBarras: [{ codigo: '7750099', unidadSunat: null }],
        control: 'NINGUNO',
        propiedades: { viscosidad: '10W40' },
        codigosAlternos: [{ codigo: 'X-1', referencia: null }],
        unidadesAlternas: [{ unidadSunat: 'BX', factor: 12 }],
      }),
    );
    expect(navegar).toHaveBeenCalledWith(['/articulos', 'nuevo']);
    expect(fixture).toBeTruthy();
  });

  it('un servicio no envía tipo de existencia y no deja guardar incompleto', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(ArticuloDetalle);
    boton('Crear artículo')?.click();
    await estable();
    expect(api.crear).not.toHaveBeenCalled();
    expect(html.textContent).toContain('Elija una categoría.');
    escribir('#ar-descripcion', 'Instalación');
    escribir('#ar-categoria', 'mot');
    await estable();
    escribir('#ar-prop-viscosidad', '10W40');
    escribir('#ar-tipo', 'SERVICIO');
    await estable();
    expect(html.querySelector('#ar-existencia')).toBeNull();
    expect(html.querySelector('#ar-control')).toBeNull();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    boton('Crear artículo')?.click();
    await estable();
    expect(api.crear).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'SERVICIO', tipoExistencia: null }),
    );
  });

  it('edita, cambia el estado, maneja equivalentes y muestra el stock', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(ArticuloDetalle, { id: 'a1' });
    expect(html.querySelector<HTMLInputElement>('#ar-codigo')?.disabled).toBe(true);
    expect(html.textContent).toContain('FIL-000002');
    expect(html.textContent).toContain('CUS01-01');
    escribir('#ar-descripcion', 'Filtro de aceite reforzado');
    boton('Guardar cambios')?.click();
    await estable();
    expect(api.actualizar).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({
        descripcion: 'Filtro de aceite reforzado',
        codigosBarras: [{ codigo: '7750001', unidadSunat: null }],
        unidadCompra: null,
        propiedades: { viscosidad: '10W40' },
      }),
    );
    html.querySelector<HTMLInputElement>('input[formcontrolname=bloqueadoVenta]')?.click();
    boton('Guardar estado')?.click();
    await estable();
    expect(api.cambiarEstado).toHaveBeenCalledWith('a1', {
      activo: true,
      bloqueadoCompra: false,
      bloqueadoVenta: true,
    });
    [...html.querySelectorAll('button')]
      .filter((b) => b.textContent?.trim() === 'Quitar')
      .at(-1)
      ?.click();
    await estable();
    boton('Guardar equivalencias')?.click();
    await estable();
    expect(api.equivalencias).toHaveBeenCalledWith('a1', []);
  });

  it('sin permiso de edición queda de solo lectura', async () => {
    configurar(['articulos:read']);
    const { html } = await crear(ArticuloDetalle, { id: 'a1' });
    expect(html.querySelector<HTMLInputElement>('#ar-descripcion')?.disabled).toBe(true);
    expect(html.textContent).not.toContain('Guardar cambios');
    expect(html.textContent).not.toContain('Stock por almacén');
  });

  it('muestra el error al guardar', async () => {
    const api = configurar();
    api.actualizar.mockReturnValue(throwError(() => new Error('409')));
    const { html, boton, estable } = await crear(ArticuloDetalle, { id: 'a1' });
    boton('Guardar cambios')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('BuscadorArticulo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('busca con espera, filtra inventariables y excluidos, y emite el elegido', async () => {
    const api = configurar();
    const fixture = TestBed.createComponent(BuscadorArticulo);
    fixture.componentRef.setInput('soloInventariables', true);
    fixture.componentRef.setInput('excluir', ['otro']);
    const elegidos: ArticuloListado[] = [];
    fixture.componentInstance.elegido.subscribe((a) => elegidos.push(a));
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    const campo = html.querySelector('input');
    if (!campo) throw new Error('campo');
    campo.value = 'f';
    campo.dispatchEvent(new Event('input'));
    campo.value = 'filtro';
    campo.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    expect(api.listar).toHaveBeenCalledTimes(1);
    const opciones = html.querySelectorAll('li button');
    expect(opciones).toHaveLength(1);
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(elegidos.map((a) => a.id)).toEqual(['a1']);
    expect(html.querySelectorAll('li')).toHaveLength(0);
  });

  it('avisa si no hay coincidencias o si falla', async () => {
    const api = configurar();
    api.listar.mockReturnValue(of(pagina([])));
    const fixture = TestBed.createComponent(BuscadorArticulo);
    fixture.detectChanges();
    await fixture.componentInstance.buscar('zzz');
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Sin coincidencias.');
    api.listar.mockReturnValue(throwError(() => new Error('x')));
    await fixture.componentInstance.buscar('zzz');
    fixture.detectChanges();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('CatalogosArticulos', () => {
  it('administra marcas, categorías y unidades', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(CatalogosArticulos);
    expect(html.textContent).toContain('TOYOTA');
    expect(html.textContent).toContain('NIU');

    escribir('#marca-nueva', 'Bosch');
    html.querySelector<HTMLInputElement>('#marca-nueva')?.form?.dispatchEvent(new Event('submit'));
    await estable();
    expect(api.crearMarca).toHaveBeenCalledWith('Bosch');

    vi.spyOn(window, 'prompt').mockReturnValue('TOYOTA MOTOR');
    boton('Renombrar')?.click();
    await estable();
    expect(api.renombrarMarca).toHaveBeenCalledWith('m1', 'TOYOTA MOTOR');

    boton('+ Nueva categoría')?.click();
    await estable();
    escribir('#cat-nombre', 'Frenos de disco');
    escribir('#cat-prefijo', 'fd');
    escribir('#cat-padre', 'mot');
    boton('Crear')?.click();
    await estable();
    expect(api.crearCategoria).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Frenos de disco', prefijo: 'FD', padreId: 'mot' }),
    );

    [...html.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Editar')?.click();
    await estable();
    boton('Guardar')?.click();
    await estable();
    expect(api.actualizarCategoria).toHaveBeenCalled();

    escribir('#unidad-codigo', 'kt');
    escribir('#unidad-nombre', 'Kit');
    [...html.querySelectorAll('button')]
      .filter((b) => b.textContent?.trim() === 'Agregar')
      .at(-1)
      ?.click();
    await estable();
    expect(api.crearUnidad).toHaveBeenCalledWith({ codigoSunat: 'KT', nombre: 'Kit' });

    [...html.querySelectorAll('button')]
      .filter((b) => b.textContent?.trim() === 'Desactivar')
      .forEach((b) => b.click());
    await estable();
    expect(api.estadoCategoria).toHaveBeenCalled();
    expect(api.estadoMarca).toHaveBeenCalledWith('m1', false);
    expect(api.estadoUnidad).toHaveBeenCalled();
  });

  it('sin permiso solo muestra y reporta errores', async () => {
    const api = configurar(['articulos:read']);
    api.marcas.mockReturnValue(throwError(() => new Error('x')));
    const { html } = await crear(CatalogosArticulos);
    expect(html.querySelector('#marca-nueva')).toBeNull();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('ArticuloDetalle · adjuntos', () => {
  it('muestra la imagen principal, sube, marca principal y elimina', async () => {
    const api = configurar();
    const { html, boton, estable } = await crear(ArticuloDetalle, { id: 'a1' });
    expect(html.querySelector<HTMLImageElement>('img')?.getAttribute('src')).toBe(
      '/api/v1/articulos/a1/adjuntos/img1',
    );
    expect(html.textContent).toContain('ficha.pdf');
    const entrada = html.querySelector<HTMLInputElement>('#ar-adjunto');
    if (!entrada) throw new Error('adjunto');
    const archivo = new File(['x'], 'nueva.png', { type: 'image/png' });
    Object.defineProperty(entrada, 'files', { value: [archivo], configurable: true });
    entrada.dispatchEvent(new Event('change'));
    await estable();
    expect(api.subirAdjunto).toHaveBeenCalledWith('a1', archivo);

    const grande = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'grande.png');
    Object.defineProperty(entrada, 'files', { value: [grande], configurable: true });
    entrada.dispatchEvent(new Event('change'));
    await estable();
    expect(api.subirAdjunto).toHaveBeenCalledTimes(1);
    expect(html.textContent).toContain('El máximo es 2 MB.');

    boton('Principal')?.click();
    await estable();
    expect(api.adjuntoPrincipal).toHaveBeenCalledWith('a1', 'img2');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    boton('Eliminar')?.click();
    await estable();
    expect(api.eliminarAdjunto).toHaveBeenCalledWith('a1', 'img1');
  });
});

describe('CatalogosArticulos · propiedades', () => {
  it('guarda los valores propuestos y agrega propiedades a la categoría', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(CatalogosArticulos);
    [...html.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Editar')?.click();
    await estable();
    expect(html.textContent).toContain('Viscosidad');
    escribir('#cat-tipo', 'INVENTARIABLE');
    escribir('#cat-unidad', 'u1');
    boton('Guardar')?.click();
    await estable();
    expect(api.actualizarCategoria).toHaveBeenCalledWith(
      'fil',
      expect.objectContaining({ tipoDefecto: 'INVENTARIABLE', unidadDefectoId: 'u1' }),
    );

    [...html.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Editar')?.click();
    await estable();
    escribir('#pr-clave', 'capacidad');
    escribir('#pr-etiqueta', 'Capacidad');
    escribir('#pr-tipo', 'LISTA');
    await estable();
    escribir('#pr-opciones', '4 L, 5 L');
    boton('Agregar propiedad')?.click();
    await estable();
    expect(api.crearPropiedad).toHaveBeenCalledWith(
      'fil',
      expect.objectContaining({ clave: 'capacidad', tipo: 'LISTA', opciones: ['4 L', '5 L'] }),
    );
    [...html.querySelectorAll('button')]
      .filter((b) => b.textContent?.trim() === 'Desactivar')
      .at(0)
      ?.click();
    await estable();
    expect(api.estadoPropiedad).toHaveBeenCalledWith('p1', false);
  });
});

describe('ImportacionArticulos', () => {
  it('valida, muestra errores primero y solo habilita importar sin errores', async () => {
    const api = configurar();
    const { fixture, html, estable, boton } = await crear(ImportacionArticulos);
    expect(html.querySelector('a[download]')?.getAttribute('href')).toBe(
      '/api/v1/articulos/importacion/plantilla',
    );
    expect(boton('Validar')?.disabled).toBe(true);
    const entrada = html.querySelector<HTMLInputElement>('#imp-archivo');
    if (!entrada) throw new Error('archivo');
    const archivo = new File(['x'], 'articulos.xlsx');
    Object.defineProperty(entrada, 'files', { value: [archivo], configurable: true });
    entrada.dispatchEvent(new Event('change'));
    await estable();
    boton('Validar')?.click();
    await estable();
    expect(api.importar).toHaveBeenCalledWith(archivo, false, false);
    expect(html.textContent).toContain('1 fila(s) con errores');
    expect(html.querySelector('tbody tr td')?.textContent?.trim()).toBe('3');
    expect(boton('Importar')?.disabled).toBe(true);

    api.importar.mockReturnValue(
      of({ aplicado: false, filas: 1, nuevos: 1, actualizados: 0, errores: 0, detalle: [] }),
    );
    html.querySelector<HTMLInputElement>('input[type=checkbox]')?.click();
    boton('Validar')?.click();
    await estable();
    expect(html.textContent).toContain('Validación correcta');
    api.importar.mockReturnValue(
      of({ aplicado: true, filas: 1, nuevos: 1, actualizados: 0, errores: 0, detalle: [] }),
    );
    boton('Importar')?.click();
    await estable();
    expect(api.importar).toHaveBeenLastCalledWith(archivo, true, true);
    expect(html.textContent).toContain('Importación aplicada');
    expect(fixture).toBeTruthy();
  });

  it('rechaza archivos grandes y muestra errores de la API', async () => {
    const api = configurar();
    api.importar.mockReturnValue(throwError(() => new Error('x')));
    const { html, estable, boton } = await crear(ImportacionArticulos);
    const entrada = html.querySelector<HTMLInputElement>('#imp-archivo');
    if (!entrada) throw new Error('archivo');
    Object.defineProperty(entrada, 'files', {
      value: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'g.xlsx')],
      configurable: true,
    });
    entrada.dispatchEvent(new Event('change'));
    await estable();
    expect(html.textContent).toContain('El máximo es 5 MB.');
    Object.defineProperty(entrada, 'files', {
      value: [new File(['x'], 'a.xlsx')],
      configurable: true,
    });
    entrada.dispatchEvent(new Event('change'));
    await estable();
    boton('Validar')?.click();
    await estable();
    expect(html.querySelector('[role=alert]')).not.toBeNull();
  });
});

describe('ArticuloDetalle · stock desde la ficha', () => {
  it('al crear con stock inicial registra un saldo inicial en el almacén elegido', async () => {
    const api = configurar();
    const inventario = TestBed.inject(InventarioApi) as unknown as {
      registrar: ReturnType<typeof vi.fn>;
    };
    const { html, escribir, boton, estable } = await crear(ArticuloDetalle);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    escribir('#ar-descripcion', 'Filtro de aire');
    escribir('#ar-categoria', 'aire');
    await estable();
    escribir('#ar-prop-viscosidad', '10W40');
    expect(html.textContent).toContain('Stock inicial (opcional)');
    escribir('#in-almacen', 'al1');
    escribir('#in-cantidad', '20');
    boton('Crear artículo')?.click();
    await estable();
    expect(api.crear).not.toHaveBeenCalled();
    expect(html.textContent).toContain('necesita el costo unitario');
    escribir('#in-costo', '12');
    boton('Crear artículo')?.click();
    await estable();
    expect(api.crear).toHaveBeenCalled();
    expect(inventario.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'SALDO_INICIAL',
        almacenId: 'al1',
        lineas: [{ articuloId: 'nuevo', cantidad: 20, costoUnitario: 12, lotes: [], series: [] }],
      }),
    );
  });

  it('en un artículo existente ingresa stock como ajuste si el almacén ya tuvo movimientos', async () => {
    configurar();
    const inventario = TestBed.inject(InventarioApi) as unknown as {
      registrar: ReturnType<typeof vi.fn>;
    };
    const { html, escribir, boton, estable } = await crear(ArticuloDetalle, { id: 'a1' });
    boton('Ingresar stock')?.click();
    await estable();
    escribir('#in-almacen', 'al1');
    escribir('#in-cantidad', '4');
    boton('Registrar')?.click();
    await estable();
    expect(inventario.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'AJUSTE_ENTRADA', almacenId: 'al1' }),
    );
    expect(html.textContent).not.toContain('Cancelar');

    boton('Ingresar stock')?.click();
    await estable();
    escribir('#in-almacen', 'al2');
    escribir('#in-cantidad', '2');
    boton('Registrar')?.click();
    await estable();
    expect(html.textContent).toContain('necesita el costo unitario');
    escribir('#in-costo', '15');
    boton('Registrar')?.click();
    await estable();
    expect(inventario.registrar).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'SALDO_INICIAL', almacenId: 'al2' }),
    );
  });

  it('sin permiso de movimientos no ofrece ingresar stock', async () => {
    configurar(['articulos:read', 'inventario:read']);
    const { boton } = await crear(ArticuloDetalle, { id: 'a1' });
    expect(boton('Ingresar stock')).toBeUndefined();
  });
});

describe('ArticuloDetalle · datos tributarios', () => {
  it('al crear muestra solo el resumen con lo que propone la categoría', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(ArticuloDetalle);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(html.querySelector('#ar-igv')).toBeNull();
    escribir('#ar-descripcion', 'Filtro');
    escribir('#ar-categoria', 'aire');
    await estable();
    escribir('#ar-prop-viscosidad', '10W40');
    expect(html.textContent).toContain(
      'Mercaderías · Gravado con IGV · Código SUNAT 25174100 — según la categoría Aire',
    );
    boton('Crear artículo')?.click();
    await estable();
    expect(api.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        codigoProductoSunat: '25174100',
        afectacionIgv: 'GRAVADO',
        tipoExistencia: 'MERCADERIAS',
      }),
    );
  });

  it('sin el permiso tributario los campos se ven bloqueados', async () => {
    configurar(['articulos:read', 'articulos:create', 'articulos:update']);
    const { html, boton, estable } = await crear(ArticuloDetalle, { id: 'a1' });
    expect(html.textContent).toContain('Falta el código de producto SUNAT');
    boton('Ver o cambiar')?.click();
    await estable();
    expect(html.querySelector<HTMLSelectElement>('#ar-igv')?.disabled).toBe(true);
    expect(html.querySelector<HTMLInputElement>('#ar-peso')?.disabled).toBe(false);
    expect(html.textContent).toContain('requiere el permiso de datos tributarios');
  });

  it('abre la sección si un dato tributario es inválido al guardar', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(ArticuloDetalle, { id: 'a1' });
    boton('Ver o cambiar')?.click();
    await estable();
    escribir('#ar-sunat', '123');
    boton('Ocultar')?.click();
    await estable();
    boton('Guardar cambios')?.click();
    await estable();
    expect(api.actualizar).not.toHaveBeenCalled();
    expect(html.querySelector('#ar-sunat')).not.toBeNull();
  });
});

describe('ArticulosLista · filtro tributario', () => {
  it('filtra los artículos sin código SUNAT', async () => {
    const api = configurar();
    const { html, boton, estable } = await crear(ArticulosLista);
    html.querySelector<HTMLInputElement>('input[formcontrolname=tributarioIncompleto]')?.click();
    boton('Buscar')?.click();
    await estable();
    expect(api.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ tributarioIncompleto: true }),
    );
  });
});

describe('ArticuloDetalle · duplicar y crear desde la búsqueda', () => {
  it('duplica un artículo sin copiar sus códigos', async () => {
    const api = configurar();
    const { html, escribir, boton, estable } = await crear(ArticuloDetalle, { copiarDe: 'a1' });
    await estable();
    expect(html.textContent).toContain('Copia de FIL-000001');
    expect(html.querySelector<HTMLInputElement>('#ar-descripcion')?.value).toBe('Filtro de aceite');
    expect(html.querySelector<HTMLInputElement>('#ar-parte')?.value).toBe('');
    expect(html.querySelector<HTMLSelectElement>('#ar-categoria')?.value).toBe('fil');
    expect(html.querySelector('#ar-barra-0')).toBeNull();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    escribir('#ar-descripcion', 'Filtro de aceite Hilux 2.8');
    escribir('#ar-parte', '90915-YZZE1');
    boton('Crear artículo')?.click();
    await estable();
    expect(api.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: null,
        numeroParte: '90915-YZZE1',
        marcaId: 'm1',
        categoriaId: 'fil',
        unidadesAlternas: [{ unidadSunat: 'BX', factor: 10 }],
        codigosBarras: [],
        codigosAlternos: [],
        propiedades: { viscosidad: '10W40' },
      }),
    );
  });

  it('parte del N.° de parte buscado y la ficha ofrece duplicar', async () => {
    configurar();
    const nuevo = await crear(ArticuloDetalle, { numeroParte: '04465-0K290' });
    expect(nuevo.html.querySelector<HTMLInputElement>('#ar-parte')?.value).toBe('04465-0K290');
    TestBed.resetTestingModule();
    configurar();
    const existente = await crear(ArticuloDetalle, { id: 'a1' });
    expect(existente.html.querySelector('a[href*="copiarDe=a1"]')).not.toBeNull();
  });

  it('una búsqueda sin resultados ofrece crear el artículo con ese número', async () => {
    const api = configurar();
    api.listar.mockReturnValue(of(pagina([])));
    const { html, escribir, boton, estable } = await crear(ArticulosLista);
    escribir('#a-texto', '04465-0k290');
    boton('Buscar')?.click();
    await estable();
    const enlace = html.querySelector<HTMLAnchorElement>('a[href*="numeroParte"]');
    expect(enlace?.textContent).toContain('04465-0K290');
    expect(enlace?.getAttribute('href')).toContain('numeroParte=04465-0K290');
  });
});
