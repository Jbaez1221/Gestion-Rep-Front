import { Injectable } from '@angular/core';

const PREFIJO = 'repuestos.';

/**
 * Preferencias de interfaz de este navegador (tema, menú reducido). Nunca datos de sesión ni
 * personales: la sesión vive en cookies HttpOnly. Sin almacenamiento disponible (modo privado,
 * bloqueado) las preferencias duran lo que la pestaña.
 */
@Injectable({ providedIn: 'root' })
export class PreferenciasService {
  leer(clave: string): string | null {
    try {
      return localStorage.getItem(PREFIJO + clave);
    } catch {
      return null;
    }
  }

  guardar(clave: string, valor: string | null): void {
    try {
      if (valor === null) localStorage.removeItem(PREFIJO + clave);
      else localStorage.setItem(PREFIJO + clave, valor);
    } catch {
      // Sin almacenamiento: no se recuerda.
    }
  }
}
