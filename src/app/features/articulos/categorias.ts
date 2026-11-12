import { Categoria } from '../../core/modelos/api.modelos';

export interface NodoCategoria {
  readonly categoria: Categoria;
  readonly nivel: number;
  /** Prefijo propio o heredado del ancestro más cercano: el de los códigos automáticos. */
  readonly prefijoEfectivo: string | null;
}

/** Lista plana de categorías ordenada como árbol (por nombre). */
export function arbolDeCategorias(categorias: Categoria[]): NodoCategoria[] {
  const ids = new Set(categorias.map((c) => c.id));
  const hijos = new Map<string | null, Categoria[]>();
  for (const c of categorias) {
    const clave = c.padreId && ids.has(c.padreId) ? c.padreId : null;
    hijos.set(clave, [...(hijos.get(clave) ?? []), c]);
  }
  for (const lista of hijos.values()) {
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  const salida: NodoCategoria[] = [];
  const recorrer = (padre: string | null, nivel: number, prefijo: string | null) => {
    for (const c of hijos.get(padre) ?? []) {
      const efectivo = c.prefijo ?? prefijo;
      salida.push({ categoria: c, nivel, prefijoEfectivo: efectivo });
      recorrer(c.id, nivel + 1, efectivo);
    }
  };
  recorrer(null, 0, null);
  return salida;
}

/** Nombre con sangría para un <select> (las opciones no admiten estilos de margen). */
export function etiquetaCategoria(n: NodoCategoria): string {
  return `${'  '.repeat(n.nivel)}${n.categoria.nombre}`;
}
