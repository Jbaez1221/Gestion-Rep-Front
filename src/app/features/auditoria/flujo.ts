import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { Problema, aProblema } from '../../core/http/problema';
import { FlujoDocumentos } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { AuditoriaApi } from './auditoria.api';

@Component({
  selector: 'app-flujo',
  imports: [ReactiveFormsModule, DatePipe, ErrorApi],
  templateUrl: './flujo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Flujo {
  private readonly api = inject(AuditoriaApi);

  protected readonly flujo = signal<FlujoDocumentos | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly formulario = inject(NonNullableFormBuilder).group({
    tipo: ['', [Validators.required, Validators.maxLength(50)]],
    id: ['', [Validators.required, Validators.maxLength(100)]],
  });

  protected async consultar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { tipo, id } = this.formulario.getRawValue();
    try {
      this.error.set(null);
      this.flujo.set(await firstValueFrom(this.api.flujo(tipo.trim(), id.trim())));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
