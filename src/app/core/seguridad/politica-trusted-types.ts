/**
 * Con Trusted Types activo (CSP `require-trusted-types-for 'script'`), el navegador rechaza toda URL
 * de script que no pase por una política. Angular registra el service worker con un texto plano, así
 * que esta política `default` lo permite solo a él: cualquier otra URL de script sigue bloqueada.
 */
export const SCRIPT_SERVICE_WORKER = 'ngsw-worker.js';

interface FabricaTrustedTypes {
  createPolicy(nombre: string, reglas: { createScriptURL(url: string): string }): unknown;
}

export function esScriptPermitido(url: string, base: string): boolean {
  try {
    return new URL(url, base).href === new URL(SCRIPT_SERVICE_WORKER, base).href;
  } catch {
    return false;
  }
}

export function registrarPoliticaTrustedTypes(ventana: Window = window): void {
  const fabrica = (ventana as Window & { trustedTypes?: FabricaTrustedTypes }).trustedTypes;
  if (!fabrica) {
    return;
  }
  fabrica.createPolicy('default', {
    createScriptURL(url: string): string {
      if (esScriptPermitido(url, ventana.document.baseURI)) {
        return url;
      }
      throw new TypeError(`URL de script no permitida por Trusted Types: ${url}`);
    },
  });
}
