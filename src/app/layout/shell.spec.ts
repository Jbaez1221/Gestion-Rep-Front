import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { sesionFalsa } from '../testing/sesion-falsa';
import { Shell } from './shell';

describe('Shell', () => {
  function crear(permisos: string[], cambios = {}) {
    const { falsa, proveedor } = sesionFalsa(permisos, cambios);
    TestBed.configureTestingModule({ providers: [provideRouter([]), proveedor] });
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    return { fixture, falsa, html: fixture.nativeElement as HTMLElement };
  }

  it('el menú muestra solo los módulos permitidos', () => {
    const { html } = crear(['usuarios:read', 'auditoria:read']);
    const enlaces = [...html.querySelectorAll('#menu-principal a')].map((a) =>
      a.textContent?.trim(),
    );
    expect(enlaces).toEqual(['Inicio', 'Usuarios', 'Auditoría']);
    expect(html.querySelector('a[href="#contenido"]')?.textContent).toContain(
      'Saltar al contenido',
    );
    expect(html.querySelectorAll('main#contenido')).toHaveLength(1);
  });

  it('muestra el usuario y su rol, y permite cambiar de sucursal y salir', () => {
    const { html, falsa, fixture } = crear([], {
      todasLasSucursales: true,
      sucursales: [
        { id: 's-1', codigo: 'CUS01', nombre: 'Cusco' },
        { id: 's-2', codigo: 'ARQ01', nombre: 'Arequipa' },
      ],
    });
    expect(html.textContent).toContain('Ana Pérez');
    expect(html.textContent).toContain('ADMINISTRADOR');

    const select = html.querySelector('select') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent?.trim())).toEqual([
      'Todas',
      'CUS01 · Cusco',
      'ARQ01 · Arequipa',
    ]);
    select.value = 's-2';
    select.dispatchEvent(new Event('change'));
    expect(falsa.elegirSucursal).toHaveBeenCalledWith('s-2');
    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(falsa.elegirSucursal).toHaveBeenLastCalledWith(null);

    const menu = html.querySelector<HTMLButtonElement>('button[aria-controls="menu-principal"]');
    menu?.click();
    fixture.detectChanges();
    expect(menu?.getAttribute('aria-expanded')).toBe('true');

    html.querySelector<HTMLButtonElement>('button[aria-label="Cuenta de Ana Pérez"]')?.click();
    fixture.detectChanges();
    const doc = TestBed.inject(DOCUMENT);
    [...doc.querySelectorAll<HTMLElement>('[role=menuitem]')]
      .find((b) => b.textContent?.includes('Cerrar sesión'))
      ?.click();
    expect(falsa.logout).toHaveBeenCalled();
  });

  it('elige el tema y reduce el menú lateral', () => {
    const { html, fixture } = crear([]);
    const doc = TestBed.inject(DOCUMENT);
    const elegir = (texto: string) => {
      html.querySelector<HTMLButtonElement>('button[aria-label="Tema de colores"]')?.click();
      fixture.detectChanges();
      [...doc.querySelectorAll<HTMLElement>('[role=menuitemradio]')]
        .find((b) => b.textContent?.includes(texto))
        ?.click();
      TestBed.tick();
    };
    elegir('Oscuro');
    expect(doc.documentElement.classList.contains('oscuro')).toBe(true);
    elegir('Claro');
    expect(doc.documentElement.classList.contains('claro')).toBe(true);
    expect(doc.documentElement.classList.contains('oscuro')).toBe(false);
    elegir('Según el sistema');
    expect(doc.documentElement.classList.contains('claro')).toBe(false);

    const reducir = html.querySelector<HTMLButtonElement>('button[aria-pressed]');
    const antes = reducir?.getAttribute('aria-pressed');
    reducir?.click();
    fixture.detectChanges();
    expect(reducir?.getAttribute('aria-pressed')).not.toBe(antes);
  });
});
