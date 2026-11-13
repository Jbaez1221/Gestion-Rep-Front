import { Injectable, signal } from '@angular/core';

export interface Notificacion {
  readonly id: number;
  readonly tipo: 'exito' | 'error';
  readonly mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private siguienteId = 1;
  private readonly lista = signal<Notificacion[]>([]);
  readonly notificaciones = this.lista.asReadonly();

  exito(mensaje: string): void {
    this.agregar('exito', mensaje);
  }

  error(mensaje: string): void {
    this.agregar('error', mensaje);
  }

  cerrar(id: number): void {
    this.lista.update((l) => l.filter((n) => n.id !== id));
  }

  private agregar(tipo: Notificacion['tipo'], mensaje: string): void {
    const id = this.siguienteId++;
    this.lista.update((l) => [...l, { id, tipo, mensaje }]);
    setTimeout(() => this.cerrar(id), 6000);
  }
}
