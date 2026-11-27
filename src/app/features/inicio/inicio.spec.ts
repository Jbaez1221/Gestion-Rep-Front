import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Panel, ResumenPagar } from '../../core/modelos/api.modelos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { CreditosApi } from '../creditos/creditos.api';
import { ReportesApi } from '../reportes/reportes.api';
import { Inicio } from './inicio';

const VENTAS: NonNullable<Panel['ventas']> = {
  hoy: 45,
  comprobantesHoy: 2,
  mes: 1200,
  mesAnteriorAlDia: 1000,
  porDia: [
    { fecha: '2026-11-25', total: 1155 },
    { fecha: '2026-11-26', total: 45 },
  ],
  pendientesSunat: 4,
  conProblemas: 1,
};

const PANEL: Panel = {
  fecha: '2026-11-26',
  ventas: VENTAS,
  cobrar: { saldo: 500, vencido: 120, cuentasVencidas: 2, venceEn7Dias: 80 },
  inventario: {
    bajoReposicion: 3,
    masUrgentes: [
      {
        codigo: 'FIL-1',
        descripcion: 'Filtro',
        almacen: 'Principal',
        disponible: 2,
        puntoReposicion: 10,
      },
    ],
  },
  operacion: { pedidosEnCaja: 1, cotizacionesPorVencer: 2 },
};

const PAGAR: ResumenPagar = {
  porMoneda: [
    {
      moneda: 'PEN',
      porVencer: 100,
      vencido1a30: 50,
      vencido31a60: 25,
      vencido61a90: 0,
      vencidoMas90: 0,
      total: 175,
    },
  ],
  detraccionesPendientes: 2,
  detraccionesVencidas: 1,
  vencenEn7Dias: 3,
};

describe('Inicio', () => {
  function crear(permisos: string[], panel: Panel = PANEL) {
    const reportes = { panel: vi.fn(() => of(panel)) };
    const creditos = { resumenPagar: vi.fn(() => of(PAGAR)) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        sesionFalsa(permisos).proveedor,
        { provide: ReportesApi, useValue: reportes },
        { provide: CreditosApi, useValue: creditos },
      ],
    });
    const fixture = TestBed.createComponent(Inicio);
    return { fixture, reportes, creditos };
  }

  async function estable(fixture: ReturnType<typeof crear>['fixture']) {
    for (let i = 0; i < 3; i++) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
    return fixture.nativeElement as HTMLElement;
  }

  it('saluda por la hora y sin permisos no muestra indicadores', async () => {
    const { fixture } = crear(['sucursales:read', 'auditoria.eventos:read'], {
      fecha: '2026-11-26',
      ventas: null,
      cobrar: null,
      inventario: null,
      operacion: null,
    });
    const html = await estable(fixture);
    expect(html.querySelector('h1')?.textContent).toMatch(
      /^(Buenos días|Buenas tardes|Buenas noches), Ana$/,
    );
    expect(html.querySelector('[aria-label="Indicadores"]')?.children.length).toBe(0);
  });

  it('muestra los indicadores del panel y lo por pagar', async () => {
    const { fixture, creditos } = crear(['creditos.pagar:read', 'reportes.ventas:read']);
    const html = await estable(fixture);
    expect(html.textContent).toContain('S/ 45.00');
    expect(html.textContent).toContain('2 comprobantes');
    expect(html.textContent).toContain('(+20 %)');
    expect(html.textContent).toContain('4 sin respuesta');
    expect(html.textContent).toContain('1 rechazados o con error');
    expect(html.textContent).toContain('Vencido S/ 120.00 (2 cuentas)');
    expect(html.textContent).toContain('Vencido PEN 75.00');
    expect(html.textContent).toContain('Detracciones por depositar: 2 (1 vencidas)');
    expect(html.textContent).toContain('1 pedidos esperando en caja');
    expect(html.textContent).toContain('2 cotizaciones vencen en 2 días');
    expect(html.textContent).toContain('FIL-1');
    expect(html.querySelectorAll('[aria-label="Ventas por día"] li')).toHaveLength(2);
    expect(creditos.resumenPagar).toHaveBeenCalled();
  });

  it('sin base de comparación no muestra la variación y avisa los errores', async () => {
    const sinBase = { ...PANEL, ventas: { ...VENTAS, mesAnteriorAlDia: 0 } };
    const { fixture, creditos } = crear([], sinBase);
    const html = await estable(fixture);
    expect(html.textContent).not.toContain('%)');
    expect(creditos.resumenPagar).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    const otro = crear([]);
    otro.reportes.panel.mockReturnValue(throwError(() => new Error('x')));
    expect((await estable(otro.fixture)).querySelector('[role=alert]')).not.toBeNull();
  });
});
