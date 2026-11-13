import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Permiso, Rol } from '../../core/modelos/api.modelos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { Roles, agruparPorModulo } from './roles';
import { RolesApi } from './roles.api';

const PERMISOS: Permiso[] = [
  { codigo: 'usuarios:read', descripcion: 'Ver usuarios', modulo: 'usuarios', seguridad: true },
  {
    codigo: 'sucursales:read',
    descripcion: 'Ver sucursales',
    modulo: 'sucursales',
    seguridad: false,
  },
  {
    codigo: 'sucursales:create',
    descripcion: 'Crear sucursales',
    modulo: 'sucursales',
    seguridad: false,
  },
];
const ROLES: Rol[] = [
  {
    id: 'r-admin',
    nombre: 'ADMINISTRADOR',
    descripcion: 'Todo',
    sistema: true,
    permisos: ['usuarios:read', 'sucursales:read'],
  },
  {
    id: 'r-caja',
    nombre: 'CAJERO',
    descripcion: null,
    sistema: false,
    permisos: ['sucursales:read'],
  },
];
const TODOS = ['roles:read', 'roles:create', 'roles:update', 'roles:delete', 'permisos:read'];

describe('agruparPorModulo', () => {
  it('agrupa y ordena los permisos por módulo', () => {
    expect(agruparPorModulo(PERMISOS).map((g) => [g.modulo, g.permisos.length])).toEqual([
      ['sucursales', 2],
      ['usuarios', 1],
    ]);
  });
});

describe('Roles', () => {
  async function crear(permisos = TODOS) {
    const api = {
      listar: vi.fn(() => of(ROLES)),
      permisos: vi.fn(() => of(PERMISOS)),
      crear: vi.fn(() => of({ ...ROLES[1], id: 'r-nuevo', nombre: 'VENDEDOR' })),
      actualizar: vi.fn(() => of(ROLES[1])),
      eliminar: vi.fn(() => of(null)),
      asignarPermisos: vi.fn(() => of(ROLES[1])),
    };
    TestBed.configureTestingModule({
      providers: [sesionFalsa(permisos).proveedor, { provide: RolesApi, useValue: api }],
    });
    const fixture = TestBed.createComponent(Roles);
    await fixture.whenStable();
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    const estable = async () => {
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const boton = (texto: string) =>
      [...html.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(texto)) as
        HTMLButtonElement | undefined;
    return { api, fixture, html, estable, boton };
  }

  it('los roles del sistema se ven pero no se editan', async () => {
    const { html, boton } = await crear();
    expect(html.textContent).toContain('Rol del sistema');
    expect(boton('Guardar permisos')).toBeUndefined();
    expect(html.querySelector<HTMLInputElement>('#rol-nombre')?.disabled).toBe(true);
  });

  it('edita datos y permisos de un rol propio', async () => {
    const { api, html, estable, boton } = await crear();
    boton('CAJERO')?.click();
    await estable();
    expect(html.textContent).toContain('Permisos (1)');

    const crearSucursales = [
      ...html.querySelectorAll<HTMLInputElement>('fieldset input[type="checkbox"]'),
    ].find((c) => c.closest('label')?.textContent?.includes('sucursales:create'));
    crearSucursales?.click();
    await estable();
    expect(html.textContent).toContain('Permisos (2)');
    boton('Guardar permisos')?.click();
    await estable();
    expect(api.asignarPermisos).toHaveBeenCalledWith('r-caja', [
      'sucursales:read',
      'sucursales:create',
    ]);
    // Tras guardar se recarga desde la API (el doble devuelve el rol original, con 1 permiso).
    expect(api.listar).toHaveBeenCalledTimes(2);
    expect(html.textContent).toContain('Permisos (1)');
    crearSucursales?.click();
    await estable();
    crearSucursales?.click();
    await estable();
    expect(html.textContent).toContain('Permisos (1)');

    const desc = html.querySelector<HTMLInputElement>('#rol-desc');
    if (desc) {
      desc.value = 'Atiende caja';
      desc.dispatchEvent(new Event('input'));
    }
    boton('Guardar datos')?.click();
    await estable();
    expect(api.actualizar).toHaveBeenCalledWith('r-caja', 'CAJERO', 'Atiende caja');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    boton('Eliminar rol')?.click();
    await estable();
    expect(api.eliminar).toHaveBeenCalledWith('r-caja');
  });

  it('crea un rol nuevo y valida su nombre', async () => {
    const { api, html, estable } = await crear();
    const form = [...html.querySelectorAll('form')].find((f) =>
      f.textContent?.includes('Nuevo rol'),
    );
    form?.dispatchEvent(new Event('submit'));
    await estable();
    expect(api.crear).not.toHaveBeenCalled();
    const nombre = html.querySelector<HTMLInputElement>('#nuevo-nombre');
    if (nombre) {
      nombre.value = 'VENDEDOR';
      nombre.dispatchEvent(new Event('input'));
    }
    form?.dispatchEvent(new Event('submit'));
    await estable();
    expect(api.crear).toHaveBeenCalledWith('VENDEDOR', null);
  });

  it('sin permiso de ver permisos avisa, y muestra errores de la API', async () => {
    const { api, html, estable, boton } = await crear(['roles:read', 'roles:update']);
    expect(api.permisos).not.toHaveBeenCalled();
    expect(html.textContent).toContain('No tiene permiso para ver el catálogo');
    boton('CAJERO')?.click();
    await estable();
    api.asignarPermisos.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: { status: 403, title: 'Operación no permitida' },
          }),
      ),
    );
    boton('Guardar permisos')?.click();
    await estable();
    expect(html.querySelector('[role="alert"]')?.textContent).toContain('Operación no permitida');
  });
});
