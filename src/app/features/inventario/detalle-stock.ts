import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ControlStock, LoteMovido } from '../../core/modelos/api.modelos';

export type GrupoLote = FormGroup<{
  codigo: FormControl<string>;
  fechaVencimiento: FormControl<string>;
  cantidad: FormControl<number | null>;
}>;

export interface ControlesDetalle {
  lotes: FormArray<GrupoLote>;
  series: FormControl<string>;
}

/** Controles de lotes y series para una línea (se agregan al grupo de la línea). */
export function controlesDetalle(fb: NonNullableFormBuilder): ControlesDetalle {
  return { lotes: fb.array<GrupoLote>([]), series: fb.control('') };
}

export function nuevoLote(fb: NonNullableFormBuilder, lote?: Partial<LoteMovido>): GrupoLote {
  return fb.group({
    codigo: [lote?.codigo ?? '', [Validators.required, Validators.maxLength(40)]],
    fechaVencimiento: [lote?.fechaVencimiento ?? ''],
    cantidad: [
      lote?.cantidad ?? (null as number | null),
      [Validators.required, Validators.min(0.0001)],
    ],
  });
}

/** Separa por comas, punto y coma o saltos de línea. */
export function seriesDeTexto(texto: string): string[] {
  return texto
    .split(/[\s,;]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);
}

export function detalleDe(valor: {
  lotes?: { codigo: string; fechaVencimiento: string; cantidad: number | null }[];
  series?: string;
}): { lotes: LoteMovido[]; series: string[] } {
  return {
    lotes: (valor.lotes ?? []).map((l) => ({
      codigo: l.codigo.trim().toUpperCase(),
      fechaVencimiento: l.fechaVencimiento || null,
      cantidad: Number(l.cantidad),
    })),
    series: seriesDeTexto(valor.series ?? ''),
  };
}

/** Lotes o series de una línea, según cómo se controla el artículo. */
@Component({
  selector: 'app-detalle-stock',
  imports: [ReactiveFormsModule],
  template: `
    @if (control() === 'LOTE') {
      <div class="space-y-1 rounded-md bg-slate-50 p-2" [formGroup]="grupo()">
        <p class="text-xs text-slate-600">
          Lotes de {{ codigo() }}
          @if (!entrada()) {
            (vacío: sale primero el que vence primero)
          }
        </p>
        <div formArrayName="lotes" class="space-y-1">
          @for (l of lotes().controls; track l; let i = $index) {
            <div [formGroupName]="i" class="flex flex-wrap items-center gap-1">
              <label [for]="prefijo() + '-lote-' + i" class="sr-only"
                >Lote {{ i + 1 }} de {{ codigo() }}</label
              >
              <input
                [id]="prefijo() + '-lote-' + i"
                class="campo w-32 font-mono uppercase"
                formControlName="codigo"
                placeholder="Lote"
              />
              @if (entrada()) {
                <label [for]="prefijo() + '-vence-' + i" class="sr-only"
                  >Vencimiento del lote {{ i + 1 }}</label
                >
                <input
                  [id]="prefijo() + '-vence-' + i"
                  type="date"
                  class="campo w-40"
                  formControlName="fechaVencimiento"
                />
              }
              <label [for]="prefijo() + '-lcant-' + i" class="sr-only"
                >Cantidad del lote {{ i + 1 }}</label
              >
              <input
                [id]="prefijo() + '-lcant-' + i"
                type="number"
                min="0.0001"
                step="0.0001"
                class="campo w-28 text-right"
                formControlName="cantidad"
                placeholder="Cant."
              />
              <button type="button" class="btn-enlace" (click)="lotes().removeAt(i)">Quitar</button>
            </div>
          }
        </div>
        <button type="button" class="btn-enlace" (click)="agregarLote()">+ Lote</button>
      </div>
    } @else if (control() === 'SERIE') {
      <div class="rounded-md bg-slate-50 p-2" [formGroup]="grupo()">
        <label [for]="prefijo() + '-series'" class="text-xs text-slate-600">
          Series de {{ codigo() }} (una por línea o separadas por coma)
        </label>
        <textarea
          [id]="prefijo() + '-series'"
          rows="2"
          class="campo font-mono uppercase"
          formControlName="series"
        ></textarea>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleStock {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly grupo = input.required<FormGroup>();
  readonly control = input<ControlStock>('NINGUNO');
  readonly entrada = input(false);
  readonly codigo = input('');
  readonly prefijo = input('detalle');

  protected lotes(): FormArray<GrupoLote> {
    return this.grupo().get('lotes') as FormArray<GrupoLote>;
  }

  protected agregarLote(): void {
    this.lotes().push(nuevoLote(this.fb));
  }
}
