import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ALMACENES, SUCURSAL, pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { SucursalDetalle } from './sucursal-detalle';
import { SucursalesApi } from './sucursales.api';
import { SucursalesLista } from './sucursales-lista';

const TODOS = [
  'sucursales:read',
  'sucursales:create',
  'sucursales:update',
  'almacenes:read',
  'almacenes:create',
  'almacenes:update',
];

function apiFalsa() {
  return {
    listar: vi.fn(() => of(pagina([SUCURSAL]))),
    obtener: vi.fn(() => of(SUCURSAL)),
    crear: vi.fn(() => of({ ...SUCURSAL, id: 's-9', codigo: 'NUE01' })),
    actualizar: vi.fn(() => of({ ...SUCURSAL, nombre: 'Editada' })),
    cambiarEstado: vi.fn(() => of({ ...SUCURSAL, activa: false })),
    almacenes: vi.fn(() => of(ALMACENES)),
    crearAlmacen: vi.fn(() => of(ALMACENES[1])),
    renombrarAlmacen: vi.fn(() => of(ALMACENES[1])),
    cambiarEstadoAlmacen: vi.fn(() => of(ALMACENES[1])),
    marcarPrincipal: vi.fn(() => of(ALMACENES[1])),
  };
}

function configurar(permisos: string[] = TODOS) {
  const api = apiFalsa();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      sesionFalsa(permisos).proveedor,
      { provide: SucursalesApi, useValue: api },
    ],
  });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  return { api, router };
}

function boton(html: HTMLElement, texto: string): HTMLButtonElement {
  const b = [...html.querySelectorAll('button')].find((x) =>
    x.textContent?.trim().startsWith(texto),
  );
  if (!b) throw new Error(`No hay botón "${texto}"`);
  return b;
}

async function estable(fixture: { whenStable(): Promise<unknown>; detectChanges(): void }) {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('SucursalesLista', () => {
  it('lista con filtros y muestra el estado', async () => {
    const { api } = configurar();
    const fixture = TestBed.createComponent(SucursalesLista);
    await estable(fixture);
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('CUS01');
    expect(html.textContent).toContain('Activa');
    expect(html.textContent).toContain('Nueva sucursal');

    const tipo = html.querySelector<HTMLSelectElement>('#f-tipo');
    const activa = html.querySelector<HTMLSelectElement>('#f-activa');
    if (tipo && activa) {
      tipo.value = 'TIENDA';
      tipo.dispatchEvent(new Event('change'));
      activa.value = 'false';
      activa.dispatchEvent(new Event('change'));
    }
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable(fixture);
    expect(api.listar).toHaveBeenLastCalledWith({
      texto: '',
      tipo: 'TIENDA',
      activa: false,
      pagina: 0,
    });
  });

  it('muestra el error si la API falla', async () => {
    const { api } = configurar(['sucursales:read']);
    api.listar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    const fixture = TestBed.createComponent(SucursalesLista);
    await estable(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin conexión');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Nueva sucursal');
  });
});

describe('SucursalDetalle', () => {
  async function crear(id?: string, permisos = TODOS) {
    const ctx = configurar(permisos);
    const fixture = TestBed.createComponent(SucursalDetalle);
    if (id) fixture.componentRef.setInput('id', id);
    await estable(fixture);
    return { ...ctx, fixture, html: fixture.nativeElement as HTMLElement };
  }

  it('crea una sucursal y navega a su ficha', async () => {
    const { api, router, fixture, html } = await crear();
    const set = (sel: string, v: string) => {
      const i = html.querySelector<HTMLInputElement>(sel);
      if (i) {
        i.value = v;
        i.dispatchEvent(new Event('input'));
      }
    };
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable(fixture);
    expect(api.crear).not.toHaveBeenCalled();

    set('#codigo', 'NUE01');
    set('#nombre', 'Nueva');
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable(fixture);
    expect(api.crear).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'NUE01', nombre: 'Nueva', ubigeo: null }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/sucursales', 's-9']);
  });

  it('edita, cambia el estado y gestiona almacenes', async () => {
    const { api, fixture, html } = await crear('s-1');
    expect(html.querySelector<HTMLInputElement>('#codigo')?.disabled).toBe(true);
    expect(html.textContent).toContain('CUS01-02');

    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable(fixture);
    expect(api.actualizar).toHaveBeenCalledWith(
      's-1',
      expect.objectContaining({ nombre: 'Cusco Centro' }),
    );

    boton(html, 'Desactivar').click();
    await estable(fixture);
    expect(api.cambiarEstado).toHaveBeenCalledWith('s-1', false);

    boton(html, 'Hacer principal').click();
    await estable(fixture);
    expect(api.marcarPrincipal).toHaveBeenCalledWith('a-2');

    const desactivarAlmacen = [...html.querySelectorAll('td button')].find(
      (b) => b.textContent?.trim() === 'Desactivar',
    ) as HTMLButtonElement;
    desactivarAlmacen.click();
    await estable(fixture);
    expect(api.cambiarEstadoAlmacen).toHaveBeenCalledWith('a-2', false);

    boton(html, 'Renombrar').click();
    await estable(fixture);
    (
      [...html.querySelectorAll('td button')].find(
        (x) => x.textContent?.trim() === 'Guardar',
      ) as HTMLButtonElement
    ).click();
    await estable(fixture);
    expect(api.renombrarAlmacen).toHaveBeenCalledWith('a-1', 'Almacén principal');

    const formAlmacen = html.querySelectorAll('form')[1];
    const set = (sel: string, v: string) => {
      const i = html.querySelector<HTMLInputElement>(sel);
      if (i) {
        i.value = v;
        i.dispatchEvent(new Event('input'));
      }
    };
    set('#alm-codigo', 'CUS01-03');
    set('#alm-nombre', 'Exhibición');
    formAlmacen?.dispatchEvent(new Event('submit'));
    await estable(fixture);
    expect(api.crearAlmacen).toHaveBeenCalledWith('s-1', 'CUS01-03', 'Exhibición');
  });

  it('sin permiso de edición el formulario es de solo lectura', async () => {
    const { html } = await crear('s-1', ['sucursales:read']);
    expect(html.querySelector<HTMLInputElement>('#nombre')?.disabled).toBe(true);
    expect(html.textContent).not.toContain('Guardar cambios');
    expect(html.textContent).not.toContain('Almacenes');
  });

  it('muestra el error del backend', async () => {
    const { api, fixture, html } = await crear('s-1');
    api.actualizar.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { status: 409, title: 'Conflicto', detail: 'Código SUNAT repetido.' },
          }),
      ),
    );
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable(fixture);
    expect(html.querySelector('[role="alert"]')?.textContent).toContain('Código SUNAT repetido.');
  });
});
