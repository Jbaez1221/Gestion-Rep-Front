import { Pipe, PipeTransform } from '@angular/core';

/** Valor de un campo del historial de auditoría, legible: listas separadas por coma y vacío como "—". */
@Pipe({ name: 'valor' })
export class ValorPipe implements PipeTransform {
  transform(valor: unknown): string {
    if (valor === null || valor === undefined || valor === '') {
      return '—';
    }
    if (Array.isArray(valor)) {
      return valor.length === 0 ? '(vacío)' : valor.map((v) => String(v)).join(', ');
    }
    if (typeof valor === 'boolean') {
      return valor ? 'Sí' : 'No';
    }
    return typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
  }
}
