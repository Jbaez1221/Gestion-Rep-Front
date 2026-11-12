import { Centro } from '../../core/modelos/api.modelos';

export interface NodoCentro {
  readonly centro: Centro;
  readonly nivel: number;
}

/** Ordena la lista plana como árbol (por código) con su nivel de profundidad. */
export function ordenarComoArbol(centros: Centro[]): NodoCentro[] {
  const hijos = new Map<string | null, Centro[]>();
  for (const c of centros) {
    const clave = centros.some((p) => p.id === c.padreId) ? c.padreId : null;
    hijos.set(clave, [...(hijos.get(clave) ?? []), c]);
  }
  for (const lista of hijos.values()) {
    lista.sort((a, b) => a.codigo.localeCompare(b.codigo));
  }
  const salida: NodoCentro[] = [];
  const recorrer = (padre: string | null, nivel: number) => {
    for (const c of hijos.get(padre) ?? []) {
      salida.push({ centro: c, nivel });
      recorrer(c.id, nivel + 1);
    }
  };
  recorrer(null, 0);
  return salida;
}

/** Ids del centro y de todos sus dependientes: no pueden ser su nuevo padre. */
export function conDescendientes(centros: Centro[], id: string): Set<string> {
  const resultado = new Set<string>([id]);
  let agregado = true;
  while (agregado) {
    agregado = false;
    for (const c of centros) {
      if (c.padreId && resultado.has(c.padreId) && !resultado.has(c.id)) {
        resultado.add(c.id);
        agregado = true;
      }
    }
  }
  return resultado;
}

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

/** Fecha de hoy en Lima (YYYY-MM-DD), sin depender de la zona horaria del equipo. */
export function hoyEnLima(ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(ahora);
}

/** Clases fijas (Tailwind no detecta clases armadas en tiempo de ejecución). */
const INDENTACION = ['pl-3', 'pl-7', 'pl-11', 'pl-15', 'pl-19'] as const;

export function indentar(nivel: number): string {
  return INDENTACION[Math.min(nivel, INDENTACION.length - 1)] ?? 'pl-3';
}
