import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { SesionService } from '../../../core/auth/sesion.service';
import { Problema, aProblema } from '../../../core/http/problema';
import { NotificacionesService } from '../../../core/ui/notificaciones.service';
import { ErrorApi } from '../../../shared/ui/error-api';

/** Mismas reglas que PoliticaPassword del backend (que es quien decide). */
export const LARGO_MINIMO_PASSWORD = 10;

export function politicaPassword(control: AbstractControl<string>): ValidationErrors | null {
  const v = control.value ?? '';
  if (v.length < LARGO_MINIMO_PASSWORD) {
    return { largo: true };
  }
  return /\p{L}/u.test(v) && /\d/.test(v) ? null : { letrasYNumeros: true };
}

function confirmacionIgual(grupo: AbstractControl): ValidationErrors | null {
  const nueva = grupo.get('nuevaPassword')?.value as string;
  const confirmacion = grupo.get('confirmacion')?.value as string;
  return confirmacion && nueva !== confirmacion ? { noCoincide: true } : null;
}

@Component({
  selector: 'app-cambiar-password',
  imports: [ReactiveFormsModule, ErrorApi],
  templateUrl: './cambiar-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CambiarPassword {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);

  protected readonly obligatorio = computed(() => this.sesion.requiereCambioPassword());
  protected readonly largoMinimo = LARGO_MINIMO_PASSWORD;
  protected readonly enviando = signal(false);
  protected readonly error = signal<Problema | null>(null);
  protected readonly formulario = inject(NonNullableFormBuilder).group(
    {
      passwordActual: ['', Validators.required],
      nuevaPassword: ['', [Validators.required, politicaPassword]],
      confirmacion: ['', Validators.required],
    },
    { validators: confirmacionIgual },
  );

  protected async guardar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    try {
      const { passwordActual, nuevaPassword, confirmacion } = this.formulario.getRawValue();
      await this.sesion.cambiarPassword(passwordActual, nuevaPassword, confirmacion);
      this.avisos.exito('Contraseña actualizada. Se cerraron sus otras sesiones.');
      await this.router.navigateByUrl('/inicio');
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.enviando.set(false);
    }
  }

  protected salir(): void {
    void this.sesion.logout();
  }
}
