import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';

import { perfilDePrueba, sesionFalsa } from '../../testing/sesion-falsa';
import { CambiarPassword, politicaPassword } from './cambiar-password/cambiar-password';
import { Login } from './login/login';

function escribir(html: HTMLElement, selector: string, valor: string) {
  const input = html.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`No existe ${selector}`);
  input.value = valor;
  input.dispatchEvent(new Event('input'));
}

describe('Login', () => {
  async function crear(volver?: string) {
    const { falsa, proveedor } = sesionFalsa();
    TestBed.configureTestingModule({ providers: [provideRouter([]), proveedor] });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Login);
    if (volver) fixture.componentRef.setInput('volver', volver);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, falsa, router, html: fixture.nativeElement as HTMLElement };
  }

  async function enviar(fixture: Awaited<ReturnType<typeof crear>>['fixture']) {
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('no envía si faltan datos y marca los campos', async () => {
    const { fixture, falsa, html } = await crear();
    await enviar(fixture);
    expect(falsa.login).not.toHaveBeenCalled();
    expect(html.textContent).toContain('Ingrese su usuario.');
  });

  it('al ingresar vuelve a la ruta pedida, solo si es interna', async () => {
    const { fixture, falsa, router, html } = await crear('/usuarios');
    falsa.login.mockResolvedValue(perfilDePrueba());
    escribir(html, '#username', 'admin');
    escribir(html, '#password', 'clave');
    await enviar(fixture);
    expect(falsa.login).toHaveBeenCalledWith('admin', 'clave');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/usuarios');
  });

  it('ignora destinos externos y lleva a cambiar la clave provisional', async () => {
    const { fixture, falsa, router, html } = await crear('//malicioso.example');
    falsa.login.mockResolvedValue(perfilDePrueba());
    escribir(html, '#username', 'admin');
    escribir(html, '#password', 'clave');
    await enviar(fixture);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio');

    falsa.login.mockResolvedValue(perfilDePrueba({ requiereCambioPassword: true }));
    escribir(html, '#password', 'clave');
    await enviar(fixture);
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/cambiar-password');
  });

  it('muestra el error del backend y limpia la contraseña', async () => {
    const { fixture, falsa, html } = await crear();
    falsa.login.mockRejectedValue(
      new HttpErrorResponse({
        status: 401,
        error: {
          status: 401,
          title: 'Credenciales inválidas',
          detail: 'Usuario o contraseña incorrectos.',
        },
      }),
    );
    escribir(html, '#username', 'admin');
    escribir(html, '#password', 'mala');
    await enviar(fixture);
    expect(html.querySelector('[role="alert"]')?.textContent).toContain('Credenciales inválidas');
    expect(html.querySelector<HTMLInputElement>('#password')?.value).toBe('');
  });
});

describe('CambiarPassword', () => {
  it('la política exige largo mínimo, letras y números', () => {
    expect(politicaPassword(new FormControl('corta1', { nonNullable: true }))).toEqual({
      largo: true,
    });
    expect(politicaPassword(new FormControl('solamenteletras', { nonNullable: true }))).toEqual({
      letrasYNumeros: true,
    });
    expect(politicaPassword(new FormControl('Repuestos-2026', { nonNullable: true }))).toBeNull();
  });

  async function crear() {
    const { falsa, proveedor } = sesionFalsa([], { requiereCambioPassword: true });
    TestBed.configureTestingModule({ providers: [provideRouter([]), proveedor] });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(CambiarPassword);
    fixture.detectChanges();
    return { fixture, falsa, router, html: fixture.nativeElement as HTMLElement };
  }

  it('avisa que la clave es provisional y valida la confirmación', async () => {
    const { fixture, falsa, html } = await crear();
    expect(html.textContent).toContain('Su contraseña es provisional');
    escribir(html, '#actual', 'provisional');
    escribir(html, '#nueva', 'Repuestos-2026');
    escribir(html, '#confirmacion', 'Otra-cosa-2026');
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(falsa.cambiarPassword).not.toHaveBeenCalled();
    expect(html.textContent).toContain('Las contraseñas no coinciden.');
  });

  it('guarda, avisa y entra al inicio; si falla muestra el error', async () => {
    const { fixture, falsa, router, html } = await crear();
    escribir(html, '#actual', 'provisional');
    escribir(html, '#nueva', 'Repuestos-2026');
    escribir(html, '#confirmacion', 'Repuestos-2026');
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(falsa.cambiarPassword).toHaveBeenCalledWith(
      'provisional',
      'Repuestos-2026',
      'Repuestos-2026',
    );
    expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio');

    falsa.cambiarPassword.mockRejectedValue(
      new HttpErrorResponse({
        status: 422,
        error: {
          status: 422,
          title: 'Regla de negocio incumplida',
          detail: 'La contraseña actual es incorrecta.',
        },
      }),
    );
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'La contraseña actual es incorrecta.',
    );

    html.querySelector<HTMLButtonElement>('button[type="button"]')?.click();
    expect(falsa.logout).toHaveBeenCalled();
  });
});
