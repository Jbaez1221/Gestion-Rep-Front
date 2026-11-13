import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Centro, Imputacion as ImputacionModelo } from '../../core/modelos/api.modelos';
import { pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { UsuariosApi } from '../usuarios/usuarios.api';
import { conDescendientes, hoyEnLima, indentar, ordenarComoArbol } from './arbol';
import { CatalogoCentros } from './catalogo-centros';
import { Centros } from './centros';
import { CentrosApi } from './centros.api';
import { Imputaciones } from './imputaciones';
import { Periodos } from './periodos';
import { Presupuesto } from './presupuesto';
import { ReportesCentros } from './reportes';

function centro(c: Partial<Centro> & Pick<Centro, 'id' | 'codigo'>): Centro {
  return {
    tipo: 'COSTO',
    nombre: c.codigo,
    descripcion: null,
    imputable: true,
    padreId: null,
    responsable: null,
    vigenteDesde: '2026-01-01',
    vigenteHasta: null,
    activo: true,
    funcion: null,
    cuentaDestino: null,
    centroBeneficioId: null,
    ...c,
  };
}

const ADM = centro({ id: 'adm', codigo: 'CC-ADM', nombre: 'Administración', imputable: false });
const GER = centro({
  id: 'ger',
  codigo: 'CC-GER',
  nombre: 'Gerencia',
  padreId: 'adm',
  funcion: 'ADMINISTRACION',
  cuentaDestino: '94',
  centroBeneficioId: 'cor',
});
const SIS = centro({
  id: 'sis',
  codigo: 'CC-SIS',
  nombre: 'Sistemas',
  padreId: 'adm',
  funcion: 'ADMINISTRACION',
  cuentaDestino: '94',
  centroBeneficioId: 'cor',
});
const COR = centro({ id: 'cor', codigo: 'CB-COR', nombre: 'Corporativo', tipo: 'BENEFICIO' });
const TODOS = [
  'centros:read',
  'centros:create',
  'centros:update',
  'centros.presupuesto:update',
  'centros.imputacion:create',
  'centros.periodo:cerrar',
  'centros.periodo:reabrir',
  'usuarios:read',
];

describe('árbol de centros', () => {
  it('ordena como árbol con niveles y detecta dependientes', () => {
    const arbol = ordenarComoArbol([SIS, GER, ADM]);
    expect(arbol.map((n) => [n.centro.codigo, n.nivel])).toEqual([
      ['CC-ADM', 0],
      ['CC-GER', 1],
      ['CC-SIS', 1],
    ]);
    expect([...conDescendientes([ADM, GER, SIS], 'adm')].sort()).toEqual(['adm', 'ger', 'sis']);
    expect(indentar(0)).toBe('pl-3');
    expect(indentar(9)).toBe('pl-19');
    expect(hoyEnLima(new Date('2026-11-11T03:00:00Z'))).toBe('2026-11-10');
  });
});

describe('CentrosApi (contrato)', () => {
  it('usa las rutas del backend', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(CentrosApi);
    const http = TestBed.inject(HttpTestingController);
    const espera = (metodo: string, url: string, cuerpo?: unknown) => {
      const r = http.expectOne((x) => x.urlWithParams === url);
      expect(r.request.method).toBe(metodo);
      if (cuerpo !== undefined) expect(r.request.body).toEqual(cuerpo);
      r.flush({});
    };
    const datos = {
      nombre: 'X',
      descripcion: null,
      padreId: null,
      responsableId: null,
      vigenteDesde: '2026-01-01',
      vigenteHasta: null,
    };
    api.funciones().subscribe();
    espera('GET', '/api/v1/centros/funciones');
    api.listar('BENEFICIO').subscribe();
    espera('GET', '/api/v1/centros/beneficio');
    api.crear('COSTO', datos).subscribe();
    espera('POST', '/api/v1/centros/costo', datos);
    api.actualizar('COSTO', 'c1', datos).subscribe();
    espera('PUT', '/api/v1/centros/costo/c1', datos);
    api.cambiarEstado('BENEFICIO', 'b1', false).subscribe();
    espera('PATCH', '/api/v1/centros/beneficio/b1/estado', { activo: false });
    api.periodos(2026).subscribe();
    espera('GET', '/api/v1/centros/periodos/2026');
    api.cerrarPeriodo(2026, 3).subscribe();
    espera('POST', '/api/v1/centros/periodos/2026/3/cerrar');
    api.reabrirPeriodo(2026, 3).subscribe();
    espera('POST', '/api/v1/centros/periodos/2026/3/reabrir');
    api.presupuesto(2026, 3).subscribe();
    espera('GET', '/api/v1/centros/presupuestos/2026/3');
    api
      .guardarPresupuesto(2026, 3, [{ tipoCentro: 'COSTO', centroId: 'c1', monto: 10 }])
      .subscribe();
    espera('PUT', '/api/v1/centros/presupuestos/2026/3', {
      lineas: [{ tipoCentro: 'COSTO', centroId: 'c1', monto: 10 }],
    });
    api.imputaciones({ anio: 2026, mes: 3, tipo: '' }).subscribe();
    espera('GET', '/api/v1/centros/imputaciones?anio=2026&mes=3');
    api.extornar('g1', 'error').subscribe();
    espera('POST', '/api/v1/centros/imputaciones/g1/extorno', { glosa: 'error' });
    api.reporteCostos(2026, 3).subscribe();
    espera('GET', '/api/v1/centros/reportes/costos/2026/3');
    api.reporteResultado(2026, 3).subscribe();
    espera('GET', '/api/v1/centros/reportes/resultado/2026/3');
    api.estadoPorFuncion(2026, 1, 3).subscribe();
    espera('GET', '/api/v1/centros/reportes/funcion/2026?desde=1&hasta=3');
    http.verify();
  });
});

function apiFalsa() {
  return {
    funciones: vi.fn(() =>
      of([
        { funcion: 'ADMINISTRACION', cuentaDestino: '94', descripcion: 'Gastos de administración' },
        { funcion: 'VENTAS', cuentaDestino: '95', descripcion: 'Gastos de ventas' },
      ]),
    ),
    listar: vi.fn((tipo: string) => of(tipo === 'COSTO' ? [ADM, GER, SIS] : [COR])),
    crear: vi.fn(() => of({ ...GER, id: 'nuevo', codigo: 'CC-NUE' })),
    actualizar: vi.fn(() => of(GER)),
    cambiarEstado: vi.fn(() => of(GER)),
    periodos: vi.fn(() =>
      of([
        { anio: 2026, mes: 11, estado: 'ABIERTO', cerradoPor: null, fechaCierre: null },
        {
          anio: 2026,
          mes: 10,
          estado: 'CERRADO',
          cerradoPor: 'admin',
          fechaCierre: '2026-11-01T10:00:00Z',
        },
      ]),
    ),
    cerrarPeriodo: vi.fn(() => of({})),
    reabrirPeriodo: vi.fn(() => of({})),
    presupuesto: vi.fn(() => of([{ tipoCentro: 'COSTO', centroId: 'ger', monto: 500 }])),
    guardarPresupuesto: vi.fn(() => of([])),
    imputaciones: vi.fn(() => of(pagina<ImputacionModelo>([]))),
    imputar: vi.fn(() => of({ grupoId: 'g1' })),
    extornar: vi.fn(() => of({ grupoId: 'g2' })),
    reporteCostos: vi.fn(() =>
      of([
        {
          id: 'adm',
          codigo: 'CC-ADM',
          nombre: 'Administración',
          nivel: 0,
          imputable: false,
          funcion: null,
          presupuesto: 1500,
          real: 1800,
          diferencia: -300,
          ejecucion: 120,
        },
        {
          id: 'ger',
          codigo: 'CC-GER',
          nombre: 'Gerencia',
          nivel: 1,
          imputable: true,
          funcion: 'ADMINISTRACION',
          presupuesto: 0,
          real: 0,
          diferencia: 0,
          ejecucion: null,
        },
      ]),
    ),
    reporteResultado: vi.fn(() =>
      of([
        {
          id: 'cor',
          codigo: 'CB-COR',
          nombre: 'Corporativo',
          nivel: 0,
          imputable: true,
          presupuestoIngresos: 0,
          ingresos: 0,
          costos: 1800,
          resultado: -1800,
        },
      ]),
    ),
    estadoPorFuncion: vi.fn(() =>
      of({
        anio: 2026,
        mesDesde: 1,
        mesHasta: 11,
        ingresos: 4200,
        gastos: [
          {
            funcion: 'ADMINISTRACION',
            cuentaDestino: '94',
            descripcion: 'Gastos de administración',
            monto: 1800,
          },
        ],
        totalGastos: 1800,
        resultado: 2400,
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
      { provide: CentrosApi, useValue: api },
      {
        provide: UsuariosApi,
        useValue: {
          listar: vi.fn(() => of(pagina([{ id: 'u1', nombres: 'Ana', apellidos: 'Pérez' }]))),
        },
      },
    ],
  });
  return api;
}

async function crear<T>(componente: Type<T>, tipo?: 'COSTO' | 'BENEFICIO') {
  const fixture = TestBed.createComponent(componente);
  if (tipo) fixture.componentRef.setInput('tipo', tipo);
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const html = fixture.nativeElement as HTMLElement;
  const estable = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
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

describe('Centros', () => {
  it('muestra las pestañas de la sección', async () => {
    configurar();
    const { html } = await crear(Centros);
    expect([...html.querySelectorAll('nav a')].map((a) => a.textContent?.trim())).toContain(
      'Presupuesto',
    );
  });
});

describe('CatalogoCentros', () => {
  it('muestra el árbol de centros de costo con función y centro de beneficio', async () => {
    configurar();
    const { html } = await crear(CatalogoCentros, 'COSTO');
    expect(html.textContent).toContain('Agrupador');
    expect(html.textContent).toContain('ADMINISTRACION (94)');
    expect(html.textContent).toContain('CB-COR');
  });

  it('crea un centro imputable proponiendo la cuenta de su función', async () => {
    const api = configurar();
    const { html, estable, escribir, boton } = await crear(CatalogoCentros, 'COSTO');
    boton('Nuevo centro')?.click();
    await estable();
    escribir('#c-codigo', 'CC-NUE');
    escribir('#c-nombre', 'Nuevo');
    escribir('#c-padre', 'adm');
    escribir('#c-funcion', 'VENTAS');
    await estable();
    expect(html.querySelector<HTMLInputElement>('#c-cuenta')?.value).toBe('95');
    escribir('#c-beneficio', 'cor');
    escribir('#c-responsable', 'u1');
    boton('Crear')?.click();
    await estable();
    expect(api.crear).toHaveBeenCalledWith(
      'COSTO',
      expect.objectContaining({
        codigo: 'CC-NUE',
        imputable: true,
        padreId: 'adm',
        funcion: 'VENTAS',
        cuentaDestino: '95',
        centroBeneficioId: 'cor',
        responsableId: 'u1',
      }),
    );
  });

  it('edita y desactiva; un centro no puede depender de sí mismo', async () => {
    const api = configurar();
    const { html, estable, escribir, boton } = await crear(CatalogoCentros, 'COSTO');
    ([...html.querySelectorAll('td button')][0] as HTMLButtonElement).click();
    await estable();
    expect(
      [...(html.querySelector<HTMLSelectElement>('#c-padre')?.options ?? [])].map((o) => o.value),
    ).toEqual(['']);
    escribir('#c-nombre', 'Administración general');
    boton('Guardar')?.click();
    await estable();
    expect(api.actualizar).toHaveBeenCalledWith(
      'COSTO',
      'adm',
      expect.objectContaining({ nombre: 'Administración general', funcion: null }),
    );

    ([...html.querySelectorAll('td button')][1] as HTMLButtonElement).click();
    await estable();
    boton('Desactivar')?.click();
    await estable();
    expect(api.cambiarEstado).toHaveBeenCalledWith('COSTO', 'ger', false);
  });

  it('centros de beneficio sin campos de función, solo lectura sin permiso y errores visibles', async () => {
    const api = configurar(['centros:read']);
    const { html, estable } = await crear(CatalogoCentros, 'BENEFICIO');
    expect(api.funciones).not.toHaveBeenCalled();
    expect(html.textContent).not.toContain('Nuevo centro');
    ([...html.querySelectorAll('td button')][0] as HTMLButtonElement).click();
    await estable();
    expect(html.querySelector('#c-funcion')).toBeNull();
    expect(html.querySelector<HTMLInputElement>('#c-nombre')?.disabled).toBe(true);
  });

  it('muestra el error de la API al guardar', async () => {
    const api = configurar();
    api.crear.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: {
              status: 422,
              title: 'Regla de negocio incumplida',
              detail: 'Indique la función del gasto.',
            },
          }),
      ),
    );
    const { html, estable, escribir, boton } = await crear(CatalogoCentros, 'COSTO');
    boton('Nuevo centro')?.click();
    await estable();
    boton('Crear')?.click();
    await estable();
    expect(api.crear).not.toHaveBeenCalled();
    escribir('#c-codigo', 'CC-X1');
    escribir('#c-nombre', 'X');
    boton('Crear')?.click();
    await estable();
    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'Indique la función del gasto.',
    );
  });
});

describe('Presupuesto', () => {
  it('carga montos, suma totales y guarda solo lo ingresado', async () => {
    const api = configurar();
    const { html, estable, boton } = await crear(Presupuesto);
    expect(html.querySelector<HTMLInputElement>('#pc-ger')?.value).toBe('500');
    const sis = html.querySelector<HTMLInputElement>('#pc-sis');
    if (sis) {
      sis.value = '250.5';
      sis.dispatchEvent(new Event('input'));
    }
    await estable();
    expect(html.textContent).toContain('750.50');
    boton('Guardar presupuesto')?.click();
    await estable();
    expect(api.guardarPresupuesto).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), [
      { tipoCentro: 'COSTO', centroId: 'ger', monto: 500 },
      { tipoCentro: 'COSTO', centroId: 'sis', monto: 250.5 },
    ]);
  });

  it('con el período cerrado o sin permiso no se edita', async () => {
    const api = configurar(['centros:read']);
    api.periodos.mockReturnValue(of([]));
    const { html } = await crear(Presupuesto);
    expect(html.querySelector<HTMLInputElement>('#pc-ger')?.disabled).toBe(true);
    expect(html.textContent).not.toContain('Guardar presupuesto');
  });

  it('rechaza montos negativos y muestra errores de la API', async () => {
    const api = configurar();
    const { html, estable, boton } = await crear(Presupuesto);
    const ger = html.querySelector<HTMLInputElement>('#pc-ger');
    if (ger) {
      ger.value = '-5';
      ger.dispatchEvent(new Event('input'));
    }
    boton('Guardar presupuesto')?.click();
    await estable();
    expect(api.guardarPresupuesto).not.toHaveBeenCalled();
    expect(html.textContent).toContain('Monto inválido');

    if (ger) {
      ger.value = '5';
      ger.dispatchEvent(new Event('input'));
    }
    api.guardarPresupuesto.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    boton('Guardar presupuesto')?.click();
    await estable();
    expect(html.textContent).toContain('Sin conexión');
  });
});

describe('Periodos', () => {
  it('cierra un mes abierto y reabre uno cerrado previa confirmación', async () => {
    const api = configurar();
    const { html, estable, boton } = await crear(Periodos);
    expect(html.textContent).toContain('Por admin');
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    boton('Cerrar')?.click();
    await estable();
    expect(api.cerrarPeriodo).not.toHaveBeenCalled();
    boton('Cerrar')?.click();
    await estable();
    expect(api.cerrarPeriodo).toHaveBeenCalledWith(2026, 11);
    boton('Reabrir')?.click();
    await estable();
    expect(api.reabrirPeriodo).toHaveBeenCalledWith(2026, 10);
  });

  it('sin permisos solo muestra el estado', async () => {
    configurar(['centros:read']);
    const { boton } = await crear(Periodos);
    expect(boton('Cerrar')).toBeUndefined();
    expect(boton('Reabrir')).toBeUndefined();
  });
});

describe('Imputaciones', () => {
  const LINEAS: ImputacionModelo[] = [
    {
      id: 'i1',
      grupoId: 'g1',
      tipo: 'COSTO',
      fecha: '2026-11-10',
      centroCostoCodigo: 'CC-GER',
      centroBeneficioCodigo: 'CB-COR',
      porcentaje: 60,
      monto: 225.08,
      moneda: 'USD',
      montoOriginal: 60,
      tipoCambio: 3.7513,
      naturaleza: '63',
      glosa: 'Servicio',
      origenTipo: 'MANUAL',
      origenId: 'AJ-1',
      extornoDe: null,
      usuario: 'admin',
    },
    {
      id: 'i2',
      grupoId: 'g1',
      tipo: 'COSTO',
      fecha: '2026-11-10',
      centroCostoCodigo: 'CC-SIS',
      centroBeneficioCodigo: 'CB-COR',
      porcentaje: 40,
      monto: 150.05,
      moneda: 'USD',
      montoOriginal: 40,
      tipoCambio: 3.7513,
      naturaleza: '63',
      glosa: 'Servicio',
      origenTipo: 'MANUAL',
      origenId: 'AJ-1',
      extornoDe: null,
      usuario: 'admin',
    },
  ];

  it('lista las líneas y ofrece extornar el grupo una vez', async () => {
    const api = configurar();
    api.imputaciones.mockReturnValue(of(pagina(LINEAS)));
    const { html, estable, boton } = await crear(Imputaciones);
    expect(html.textContent).toContain('CC-GER');
    expect(html.textContent).toContain('3.7513');
    expect(
      [...html.querySelectorAll('td button')].filter((b) => b.textContent?.includes('Extornar')),
    ).toHaveLength(1);
    vi.spyOn(window, 'prompt').mockReturnValueOnce('').mockReturnValue('duplicado');
    boton('Extornar')?.click();
    await estable();
    expect(api.extornar).not.toHaveBeenCalled();
    boton('Extornar')?.click();
    await estable();
    expect(api.extornar).toHaveBeenCalledWith('g1', 'duplicado');
  });

  it('registra una imputación repartida que suma 100 %', async () => {
    const api = configurar();
    const { html, estable, escribir, boton } = await crear(Imputaciones);
    boton('Imputación manual')?.click();
    await estable();
    escribir('#n-glosa', 'Servicio de limpieza');
    escribir('#n-monto', '500');
    escribir('#l-centro-0', 'ger');
    escribir('#l-porc-0', '60');
    boton('Registrar')?.click();
    await estable();
    expect(api.imputar).not.toHaveBeenCalled();
    expect(html.textContent).toContain('Los porcentajes deben sumar 100.');

    boton('+ Agregar centro')?.click();
    await estable();
    escribir('#l-centro-1', 'sis');
    escribir('#l-porc-1', '40');
    escribir('#n-moneda', 'USD');
    await estable();
    escribir('#n-tc', '3.75');
    boton('Registrar')?.click();
    await estable();
    expect(api.imputar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'COSTO',
        glosa: 'Servicio de limpieza',
        montoOriginal: 500,
        moneda: 'USD',
        tipoCambio: 3.75,
        lineas: [
          { centroId: 'ger', porcentaje: 60 },
          { centroId: 'sis', porcentaje: 40 },
        ],
      }),
    );
  });

  it('al pasar a ingreso ofrece centros de beneficio y limpia los elegidos; permite quitar líneas', async () => {
    configurar();
    const { html, estable, escribir, boton } = await crear(Imputaciones);
    boton('Imputación manual')?.click();
    await estable();
    escribir('#l-centro-0', 'ger');
    escribir('#n-tipo', 'INGRESO');
    await estable();
    expect(html.querySelector<HTMLSelectElement>('#l-centro-0')?.value).toBe('');
    expect(html.querySelector('#l-centro-0')?.textContent).toContain('CB-COR');
    boton('+ Agregar centro')?.click();
    await estable();
    boton('Quitar')?.click();
    await estable();
    expect(html.querySelector('#l-centro-1')).toBeNull();
    boton('Cancelar')?.click();
    await estable();
    expect(html.querySelector('#n-glosa')).toBeNull();
  });

  it('muestra errores de la API', async () => {
    const api = configurar();
    api.imputaciones.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    const { html } = await crear(Imputaciones);
    expect(html.textContent).toContain('Sin conexión');
  });
});

describe('ReportesCentros', () => {
  it('muestra costos contra presupuesto, resultado y estado por función', async () => {
    const api = configurar();
    const { html, estable } = await crear(ReportesCentros);
    expect(html.textContent).toContain('120.0 %');
    expect(html.textContent).toContain('(94) Gastos de administración');
    expect(html.textContent).toContain('2,400.00');
    expect(api.estadoPorFuncion).toHaveBeenCalledWith(expect.any(Number), 1, expect.any(Number));
    api.reporteCostos.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable();
    expect(html.textContent).toContain('Sin conexión');
  });
});
