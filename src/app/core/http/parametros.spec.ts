import { aParametros, finDelDiaLima, inicioDelDiaLima } from './parametros';

describe('parámetros de consulta', () => {
  it('omite los filtros vacíos', () => {
    const p = aParametros({
      texto: 'cus',
      tipo: '',
      activa: false,
      pagina: 0,
      nada: null,
      sin: undefined,
    });
    expect(p.toString()).toBe('texto=cus&activa=false&pagina=0');
  });

  it('convierte un día de Lima (UTC-5) al rango UTC completo', () => {
    expect(inicioDelDiaLima('2026-11-10')).toBe('2026-11-10T05:00:00.000Z');
    expect(finDelDiaLima('2026-11-10')).toBe('2026-11-11T05:00:00.000Z');
    expect(inicioDelDiaLima('')).toBeNull();
    expect(finDelDiaLima('')).toBeNull();
  });
});
