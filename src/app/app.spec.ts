import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { NotificacionesService } from './core/ui/notificaciones.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('ofrece un enlace para saltar al contenido principal', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('a[href="#contenido"]')?.textContent).toContain(
      'Saltar al contenido',
    );
    expect(html.querySelector('main#contenido')).not.toBeNull();
  });

  it('muestra los avisos de cualquier pantalla', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(NotificacionesService).exito('Guardado');
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent,
    ).toContain('Guardado');
  });
});
