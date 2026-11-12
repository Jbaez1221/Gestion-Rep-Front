import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { sesionFalsa } from '../../testing/sesion-falsa';
import { Inicio } from './inicio';

describe('Inicio', () => {
  function crear(permisos: string[]) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), sesionFalsa(permisos).proveedor],
    });
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('saluda y muestra solo los accesos que el rol permite', () => {
    const html = crear(['sucursales:read', 'auditoria.eventos:read']);
    expect(html.querySelector('h1')?.textContent).toContain('Repuestos');
    expect(html.textContent).toContain('Hola, Ana');
    const tarjetas = [...html.querySelectorAll('a.tarjeta h2')].map((h) => h.textContent?.trim());
    expect(tarjetas).toEqual(['Sucursales', 'Auditoría']);
  });
});
