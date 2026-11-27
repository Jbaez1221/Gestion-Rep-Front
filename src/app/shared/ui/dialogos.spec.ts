import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { DialogosService } from './dialogos';

describe('DialogosService', () => {
  function preparar() {
    TestBed.configureTestingModule({});
    return { dialogos: TestBed.inject(DialogosService), doc: TestBed.inject(DOCUMENT) };
  }

  const boton = (doc: Document, texto: string) =>
    [...doc.querySelectorAll<HTMLButtonElement>('app-dialogo button')].find(
      (b) => b.textContent?.trim() === texto,
    );

  async function esperar() {
    await new Promise((r) => setTimeout(r));
    TestBed.tick();
  }

  it('confirma o cancela con un botón de peligro si la acción es destructiva', async () => {
    const { dialogos, doc } = preparar();
    const si = dialogos.confirmar({
      titulo: '¿Eliminar?',
      mensaje: 'No se puede deshacer.',
      aceptar: 'Eliminar',
      peligro: true,
    });
    await esperar();
    expect(doc.querySelector('app-dialogo h2')?.textContent).toContain('¿Eliminar?');
    expect(doc.querySelector('app-dialogo')?.textContent).toContain('No se puede deshacer.');
    expect(boton(doc, 'Eliminar')?.className).toContain('btn-peligro');
    boton(doc, 'Eliminar')?.click();
    expect(await si).toBe(true);

    const no = dialogos.confirmar({ titulo: '¿Seguro?' });
    await esperar();
    expect(boton(doc, 'Aceptar')?.className).toContain('btn-primario');
    boton(doc, 'Cancelar')?.click();
    expect(await no).toBe(false);
  });

  it('pide un texto: exige algo escrito y lo devuelve sin espacios de más', async () => {
    const { dialogos, doc } = preparar();
    const motivo = dialogos.pedirTexto({ titulo: 'Anular', valor: '  ' });
    await esperar();
    const texto = doc.querySelector<HTMLTextAreaElement>('#dialogo-texto');
    expect(texto?.getAttribute('maxlength')).toBe('250');
    boton(doc, 'Aceptar')?.click();
    await esperar();
    expect(doc.querySelector('app-dialogo')?.textContent).toContain('Escriba el motivo.');
    if (!texto) throw new Error('sin texto');
    texto.value = '  Venta duplicada ';
    texto.dispatchEvent(new Event('input'));
    boton(doc, 'Aceptar')?.click();
    expect(await motivo).toBe('Venta duplicada');

    const cancelado = dialogos.pedirTexto({ titulo: 'Anular' });
    await esperar();
    boton(doc, 'Cancelar')?.click();
    expect(await cancelado).toBeNull();
  });
});
