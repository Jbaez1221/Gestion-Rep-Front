import { esScriptPermitido, registrarPoliticaTrustedTypes } from './politica-trusted-types';

describe('política de Trusted Types', () => {
  const base = 'https://ventas.example/';

  it('solo permite el script del service worker', () => {
    expect(esScriptPermitido('ngsw-worker.js', base)).toBe(true);
    expect(esScriptPermitido('/ngsw-worker.js', base)).toBe(true);
    expect(esScriptPermitido('https://malicioso.example/ngsw-worker.js', base)).toBe(false);
    expect(esScriptPermitido('/otro.js', base)).toBe(false);
    expect(esScriptPermitido('javascript:alert(1)', base)).toBe(false);
  });

  it('crea la política default y rechaza URLs ajenas', () => {
    let regla: ((url: string) => string) | undefined;
    const ventana = {
      document: { baseURI: base },
      trustedTypes: {
        createPolicy: (nombre: string, reglas: { createScriptURL(url: string): string }) => {
          expect(nombre).toBe('default');
          regla = reglas.createScriptURL;
          return {};
        },
      },
    } as unknown as Window;

    registrarPoliticaTrustedTypes(ventana);
    expect(regla?.('ngsw-worker.js')).toBe('ngsw-worker.js');
    expect(() => regla?.('/evil.js')).toThrow(TypeError);
  });

  it('no hace nada si el navegador no soporta Trusted Types', () => {
    expect(() =>
      registrarPoliticaTrustedTypes({ document: { baseURI: base } } as Window),
    ).not.toThrow();
  });
});
