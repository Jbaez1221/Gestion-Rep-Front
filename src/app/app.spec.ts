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

  it('muestra los avisos de cualquier pantalla', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(NotificacionesService).exito('Guardado');
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent,
    ).toContain('Guardado');
  });
});
