import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { SesionService } from '../../../core/auth/sesion.service';
import { Problema, aProblema } from '../../../core/http/problema';
import { ErrorApi } from '../../../shared/ui/error-api';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, ErrorApi],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  /** Ruta a la que volver después de iniciar sesión (query param). */
  readonly volver = input<string>();

  protected readonly enviando = signal(false);
  protected readonly error = signal<Problema | null>(null);
  protected readonly formulario = inject(NonNullableFormBuilder).group({
    username: ['', [Validators.required, Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.maxLength(200)]],
  });

  protected async ingresar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    try {
      const { username, password } = this.formulario.getRawValue();
      const perfil = await this.sesion.login(username, password);
      const destino = perfil.requiereCambioPassword ? '/cambiar-password' : this.destinoSeguro();
      await this.router.navigateByUrl(destino);
    } catch (e) {
      this.error.set(aProblema(e));
      this.formulario.controls.password.reset();
    } finally {
      this.enviando.set(false);
    }
  }

  /** Solo rutas internas: un `volver=https://...` no debe sacar al usuario del sistema. */
  private destinoSeguro(): string {
    const v = this.volver();
    return v?.startsWith('/') && !v.startsWith('//') ? v : '/inicio';
  }
}
