import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Problema } from '../../core/http/problema';
import { Pagina } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from './error-api';
import { Notificaciones } from './notificaciones';
import { Paginador } from './paginador';
import { ValorPipe } from './valor.pipe';

@Component({
  imports: [ErrorApi, Paginador],
  template: `
    <app-error-api [problema]="problema()" />
    <app-paginador [pagina]="pagina()" (cambiar)="ultima.set($event)" />
  `,
})
class Anfitrion {
  readonly problema = signal<Problema | null>(null);
  readonly pagina = signal<Pagina<unknown> | null>(null);
  readonly ultima = signal<number | null>(null);
}

describe('componentes compartidos', () => {
  it('ErrorApi muestra título, detalle y el código para soporte', () => {
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.componentInstance.problema.set({
      status: 403,
      title: 'Sin permiso',
      detail: 'No puede.',
      requestId: 'rid-1',
    });
    fixture.detectChanges();
    const alerta = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('Sin permiso');
    expect(alerta?.textContent).toContain('No puede.');
    expect(alerta?.textContent).toContain('rid-1');
  });

  it('Paginador avanza, retrocede y se deshabilita en los extremos', () => {
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.componentInstance.pagina.set({
      contenido: [],
      pagina: 1,
      tamanio: 20,
      totalElementos: 45,
      totalPaginas: 3,
    });
    fixture.detectChanges();
    const [anterior, siguiente] = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      '45 registro(s) · página 2 de 3',
    );
    siguiente?.click();
    expect(fixture.componentInstance.ultima()).toBe(2);
    anterior?.click();
    expect(fixture.componentInstance.ultima()).toBe(0);

    fixture.componentInstance.pagina.set({
      contenido: [],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    });
    fixture.detectChanges();
    const botones = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    expect(botones[0]?.disabled).toBe(true);
    expect(botones[1]?.disabled).toBe(true);
  });

  it('Notificaciones lista los avisos y permite cerrarlos', () => {
    const fixture = TestBed.createComponent(Notificaciones);
    const servicio = TestBed.inject(NotificacionesService);
    servicio.exito('Guardado');
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Guardado');
    html.querySelector('button')?.click();
    fixture.detectChanges();
    expect(html.textContent).not.toContain('Guardado');
  });

  it('ValorPipe vuelve legibles los valores del historial', () => {
    const pipe = new ValorPipe();
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform('')).toBe('—');
    expect(pipe.transform([])).toBe('(vacío)');
    expect(pipe.transform(['a', 'b'])).toBe('a, b');
    expect(pipe.transform(true)).toBe('Sí');
    expect(pipe.transform(false)).toBe('No');
    expect(pipe.transform({ x: 1 })).toBe('{"x":1}');
    expect(pipe.transform(12.5)).toBe('12.5');
  });
});
