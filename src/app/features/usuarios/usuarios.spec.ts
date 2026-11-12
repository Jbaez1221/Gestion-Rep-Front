import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { SUCURSAL, USUARIO, pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { RolesApi } from '../roles/roles.api';
import { SucursalesApi } from '../sucursales/sucursales.api';
import { UsuarioDetalle } from './usuario-detalle';
import { UsuariosApi } from './usuarios.api';
import { UsuariosLista } from './usuarios-lista';

const TODOS = [
  'usuarios:read',
  'usuarios:create',
  'usuarios:update',
  'usuarios:delete',
  'usuarios.password:restablecer',
  'roles:read',
  'sucursales:read',
];

function configurar(permisos: string[] = TODOS, cambiosPerfil = {}) {
  const api = {
    listar: vi.fn(() => of(pagina([USUARIO]))),
    obtener: vi.fn(() => of(USUARIO)),
    crear: vi.fn(() =>
      of({
        usuario: { ...USUARIO, id: 'u-9', username: 'nuevo' },
        passwordProvisional: 'Prov1sional-abcd',
      }),
    ),
    actualizar: vi.fn(() => of(USUARIO)),
    desactivar: vi.fn(() => of(null)),
    restablecerPassword: vi.fn(() => of('Otra-provisional9')),
  };
  const roles = {
    listar: vi.fn(() =>
      of([{ id: 'r-1', nombre: 'CAJERO', descripcion: null, sistema: false, permisos: [] }]),
    ),
  };
  const sucursales = {
    listar: vi.fn(() =>
      of(pagina([SUCURSAL, { ...SUCURSAL, id: 's-2', codigo: 'ARQ01', nombre: 'Arequipa' }])),
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      sesionFalsa(permisos, cambiosPerfil).proveedor,
      { provide: UsuariosApi, useValue: api },
      { provide: RolesApi, useValue: roles },
      { provide: SucursalesApi, useValue: sucursales },
    ],
  });
  return { api, roles, sucursales };
}

async function estable(fixture: { whenStable(): Promise<unknown>; detectChanges(): void }) {
  await fixture.whenStable();
  fixture.detectChanges();
}

function escribir(html: HTMLElement, selector: string, valor: string) {
  const el = html.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (!el) throw new Error(selector);
  el.value = valor;
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input'));
}

describe('UsuariosLista', () => {
  it('lista usuarios con sus insignias y filtra', async () => {
    const { api } = configurar();
    const fixture = TestBed.createComponent(UsuariosLista);
    await estable(fixture);
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('cajero');
    expect(html.textContent).toContain('Clave provisional');
    escribir(html, '#f-texto', 'luis');
    escribir(html, '#f-activo', 'true');
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable(fixture);
    expect(api.listar).toHaveBeenLastCalledWith({ texto: 'luis', activo: true, pagina: 0 });
  });

  it('muestra el error de la API', async () => {
    const { api } = configurar();
    api.listar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    const fixture = TestBed.createComponent(UsuariosLista);
    await estable(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin conexión');
  });
});

describe('UsuarioDetalle', () => {
  async function crear(id?: string, permisos = TODOS, cambiosPerfil = {}) {
    const ctx = configurar(permisos, cambiosPerfil);
    const fixture = TestBed.createComponent(UsuarioDetalle);
    if (id) fixture.componentRef.setInput('id', id);
    await estable(fixture);
    await estable(fixture);
    return { ...ctx, fixture, html: fixture.nativeElement as HTMLElement };
  }

  it('crea un usuario y muestra su contraseña provisional una sola vez', async () => {
    const { api, fixture, html } = await crear();
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable(fixture);
    expect(api.crear).not.toHaveBeenCalled();

    escribir(html, '#username', 'nuevo');
    escribir(html, '#email', 'nuevo@prueba.local');
    escribir(html, '#nombres', 'Nuevo');
    escribir(html, '#apellidos', 'Usuario');
    escribir(html, '#rol', 'r-1');
    const casillas = html.querySelectorAll<HTMLInputElement>('fieldset input[type="checkbox"]');
    casillas[1]?.click();
    casillas[1]?.click();
    casillas[0]?.click();
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable(fixture);

    expect(api.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'nuevo',
        rolId: 'r-1',
        sucursalIds: ['s-1'],
        tipoDocumento: null,
      }),
    );
    expect(html.textContent).toContain('Prov1sional-abcd');
    expect(html.textContent).toContain('Ir a la ficha de nuevo');
  });

  it('edita, restablece la clave y desactiva a otro usuario', async () => {
    const { api, fixture, html } = await crear('u-2');
    expect(html.querySelector<HTMLInputElement>('#username')?.disabled).toBe(true);

    escribir(html, '#nombres', 'Luis Alberto');
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable(fixture);
    expect(api.actualizar).toHaveBeenCalledWith(
      'u-2',
      expect.objectContaining({ nombres: 'Luis Alberto', activo: true, bloqueado: false }),
    );

    vi.spyOn(window, 'prompt').mockReturnValue('cajero');
    [...html.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Restablecer'))
      ?.click();
    await estable(fixture);
    expect(api.restablecerPassword).toHaveBeenCalledWith('u-2', 'cajero');
    expect(html.textContent).toContain('Otra-provisional9');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    [...html.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Desactivar'))
      ?.click();
    await estable(fixture);
    expect(api.desactivar).toHaveBeenCalledWith('u-2');
  });

  it('cancelar las confirmaciones no hace nada', async () => {
    const { api, fixture, html } = await crear('u-2');
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    [...html.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Restablecer'))
      ?.click();
    [...html.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Desactivar'))
      ?.click();
    await estable(fixture);
    expect(api.restablecerPassword).not.toHaveBeenCalled();
    expect(api.desactivar).not.toHaveBeenCalled();
  });

  it('sobre uno mismo no ofrece acciones y avisa por qué', async () => {
    const { html } = await crear('u-2', TODOS, { id: 'u-2' });
    expect(html.textContent).toContain('Este es su propio usuario');
    expect(html.textContent).not.toContain('Restablecer contraseña');
  });

  it('sin permisos de catálogos usa las sucursales propias y su rol actual', async () => {
    const { roles, sucursales, html } = await crear('u-2', ['usuarios:read']);
    expect(roles.listar).not.toHaveBeenCalled();
    expect(sucursales.listar).not.toHaveBeenCalled();
    expect(html.textContent).toContain('CUS01 · Cusco Centro');
    expect(html.querySelector<HTMLSelectElement>('#rol')?.textContent).toContain('CAJERO');
    expect(html.querySelector<HTMLInputElement>('#email')?.disabled).toBe(true);
  });

  it('muestra el error del backend', async () => {
    const { api, fixture, html } = await crear('u-2');
    api.actualizar.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: { status: 403, title: 'Operación no permitida', detail: 'Fuera de su alcance.' },
          }),
      ),
    );
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estable(fixture);
    expect(html.querySelector('[role="alert"]')?.textContent).toContain('Fuera de su alcance.');
  });
});
