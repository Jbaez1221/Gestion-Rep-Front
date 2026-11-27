import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { SugerenciaCompra } from '../../core/modelos/api.modelos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { InventarioApi } from '../inventario/inventario.api';
import { SociosApi } from '../socios/socios.api';
import { BuscadorProveedor } from './buscador-proveedor';
import { ComprasApi } from './compras.api';
import { SugerenciaCompraPagina } from './sugerencia-compra';

const LINEA = {
  articuloId: 'a1',
  codigo: 'FIL-1',
  descripcion: 'Filtro',
  unidadBase: 'NIU',
  proyectado: 36,
  umbral: 40,
  maximo: 60,
  sugeridoBase: 24,
  unidad: 'BX',
  factor: 12,
  cantidad: 2,
  precioUnitario: 120,
  ultimaCompra: '2026-11-20',
  sinMaximo: false,
};

const SUGERENCIA: SugerenciaCompra = {
  almacen: { id: 'al1', codigo: 'CUS-01', nombre: 'Principal', sucursal: 'Cusco' },
  grupos: [
    {
      proveedor: { id: 'p1', documento: '20100070970', nombre: 'DISTRIBUIDORA SAC' },
      moneda: 'PEN',
      lineas: [LINEA, { ...LINEA, articuloId: 'a2', codigo: 'FIL-2', cantidad: 1 }],
      subtotal: 360,
    },
    {
      proveedor: null,
      moneda: 'PEN',
      lineas: [
        {
          ...LINEA,
          articuloId: 'a3',
          codigo: 'FIL-3',
          maximo: null,
          precioUnitario: null,
          ultimaCompra: null,
          sinMaximo: true,
        },
      ],
      subtotal: 0,
    },
  ],
};

function configurar(permisos = ['compras:read', 'compras.orden:create']) {
  const api = {
    sugerencia: vi.fn(() => of(SUGERENCIA)),
    crearOrden: vi.fn(() => of({ id: 'oc9', numero: 'OC-00000009' })),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      sesionFalsa(permisos, { sucursales: [{ id: 's1', codigo: 'CUS', nombre: 'Cusco' }] })
        .proveedor,
      { provide: ComprasApi, useValue: api },
      {
        provide: InventarioApi,
        useValue: {
          almacenes: vi.fn(() =>
            of([
              {
                id: 'al1',
                codigo: 'CUS-01',
                nombre: 'Principal',
                sucursalId: 's1',
                sucursalCodigo: 'CUS',
                sucursalNombre: 'Cusco',
              },
            ]),
          ),
        },
      },
      { provide: SociosApi, useValue: { listar: vi.fn() } },
    ],
  });
  return api;
}

async function crear() {
  const fixture = TestBed.createComponent(SugerenciaCompraPagina);
  const html = fixture.nativeElement as HTMLElement;
  const estable = async () => {
    for (let i = 0; i < 4; i++) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
  };
  await estable();
  const boton = (texto: string, desde: ParentNode = html) =>
    [...desde.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(texto));
  const escribir = (sel: string, v: string) => {
    const el = html.querySelector<HTMLInputElement>(sel);
    if (!el) throw new Error(sel);
    el.value = v;
    el.dispatchEvent(new Event('input'));
  };
  return { fixture, html, estable, boton, escribir };
}

describe('Sugerencia de compra', () => {
  it('calcula la del almacén y crea la orden del proveedor con lo incluido', async () => {
    const api = configurar();
    const { html, estable, boton, escribir } = await crear();
    expect(api.sugerencia).toHaveBeenCalledWith('al1');
    expect(html.textContent).toContain('DISTRIBUIDORA SAC');
    expect(html.textContent).toContain('Sin compras anteriores');
    expect(html.textContent).toContain('Sin máximo');
    expect(html.textContent).toContain('Última compra: 20/11/2026');
    escribir('#sg-cant-0-0', '3');
    escribir('#sg-precio-0-0', '118.5');
    const segunda = html.querySelector<HTMLInputElement>('#sg-incluir-0-1');
    if (!segunda) throw new Error('incluir');
    segunda.checked = false;
    segunda.dispatchEvent(new Event('change'));
    const grupo = html.querySelector('[aria-label="Grupo 1"]');
    if (!grupo) throw new Error('grupo');
    boton('Crear orden de compra', grupo)?.click();
    await estable();
    expect(api.crearOrden).toHaveBeenCalledWith(
      expect.objectContaining({
        proveedorId: 'p1',
        almacenId: 'al1',
        moneda: 'PEN',
        lineas: [{ articuloId: 'a1', unidad: 'BX', cantidad: 3, precioUnitario: 118.5 }],
      }),
    );
    expect(html.querySelector('a[href="/compras/orden/oc9"]')?.textContent).toContain(
      'OC-00000009',
    );
    expect(boton('Crear orden de compra', grupo)).toBeUndefined();
  });

  it('el grupo sin compras pide proveedor y precio antes de crear la orden', async () => {
    const api = configurar();
    const { fixture, html, estable, boton, escribir } = await crear();
    const grupo = html.querySelector('[aria-label="Grupo 2"]');
    if (!grupo) throw new Error('grupo');
    boton('Crear orden de compra', grupo)?.click();
    await estable();
    expect(html.textContent).toContain('Elija a quién se le compra.');
    const buscador = fixture.debugElement.query(
      (d) => d.componentInstance instanceof BuscadorProveedor,
    );
    (buscador.componentInstance as BuscadorProveedor).elegido.emit({
      id: 'p7',
      numeroDocumento: '20555666777',
      nombre: 'NUEVO PROVEEDOR SAC',
    } as never);
    await estable();
    expect(html.textContent).toContain('Proveedor: NUEVO PROVEEDOR SAC');
    boton('Crear orden de compra', grupo)?.click();
    await estable();
    expect(html.textContent).toContain('cada uno con su cantidad y su precio');
    escribir('#sg-precio-1-0', '45');
    boton('Crear orden de compra', grupo)?.click();
    await estable();
    expect(api.crearOrden).toHaveBeenCalledWith(
      expect.objectContaining({
        proveedorId: 'p7',
        lineas: [{ articuloId: 'a3', unidad: 'BX', cantidad: 2, precioUnitario: 45 }],
      }),
    );
    boton('Cambiar', grupo)?.click();
    await estable();
  });

  it('sin artículos por reponer, sin permiso de crear y con errores', async () => {
    const api = configurar(['compras:read']);
    api.sugerencia.mockReturnValue(of({ ...SUGERENCIA, grupos: [] }));
    const vacio = await crear();
    expect(vacio.html.textContent).toContain('No hay artículos por reponer');

    TestBed.resetTestingModule();
    const solo = configurar(['compras:read']);
    const lectura = await crear();
    expect(lectura.boton('Crear orden de compra')).toBeUndefined();
    const select = lectura.html.querySelector<HTMLSelectElement>('#sg-almacen');
    if (!select) throw new Error('almacén');
    select.value = '';
    select.dispatchEvent(new Event('change'));
    await lectura.estable();
    expect(lectura.html.textContent).not.toContain('DISTRIBUIDORA');
    lectura.boton('Calcular')?.click();
    await lectura.estable();
    expect(solo.sugerencia).toHaveBeenCalledTimes(1);

    TestBed.resetTestingModule();
    const fallo = configurar();
    fallo.sugerencia.mockReturnValue(throwError(() => new Error('x')));
    expect((await crear()).html.querySelector('[role=alert]')).not.toBeNull();

    TestBed.resetTestingModule();
    const errorOrden = configurar();
    errorOrden.crearOrden.mockReturnValue(throwError(() => new Error('x')));
    const conError = await crear();
    const grupo = conError.html.querySelector('[aria-label="Grupo 1"]');
    if (!grupo) throw new Error('grupo');
    conError.boton('Crear orden de compra', grupo)?.click();
    await conError.estable();
    expect(conError.html.querySelector('[role=alert]')).not.toBeNull();
  });
});
