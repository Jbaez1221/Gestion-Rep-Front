import { HttpErrorResponse } from '@angular/common/http';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CambioAuditoria, EventoAuditoria } from '../../core/modelos/api.modelos';
import { pagina } from '../../testing/datos';
import { sesionFalsa } from '../../testing/sesion-falsa';
import { Auditoria } from './auditoria';
import { AuditoriaApi } from './auditoria.api';
import { Cambios } from './cambios';
import { Eventos } from './eventos';
import { Flujo } from './flujo';

const CAMBIO: CambioAuditoria = {
  id: 'c-1',
  fecha: '2026-11-10T15:00:00Z',
  transaccionId: 't-1',
  entidad: 'Sucursal',
  entidadId: 's-1',
  operacion: 'MODIFICACION',
  cambios: {
    nombre: { antes: 'Cusco', despues: 'Cusco Centro' },
    activa: { antes: true, despues: false },
  },
  usuario: 'admin',
  sucursalId: null,
  ip: '127.0.0.1',
  requestId: 'rid-1',
};
const EVENTO: EventoAuditoria = {
  id: 'e-1',
  fecha: '2026-11-10T15:00:00Z',
  tipo: 'LOGIN_FALLIDO',
  usuario: 'admin',
  detalle: { motivo: 'PASSWORD_INCORRECTA' },
  sucursalId: null,
  ip: '127.0.0.1',
  requestId: 'rid-2',
};

function configurar(permisos = ['auditoria:read', 'auditoria.eventos:read']) {
  const api = {
    cambios: vi.fn(() => of(pagina([CAMBIO]))),
    eventos: vi.fn(() => of(pagina([EVENTO]))),
    flujo: vi.fn(() =>
      of({
        documentos: [
          { tipo: 'PEDIDO', id: 'P1' },
          { tipo: 'FACTURA', id: 'F1' },
        ],
        relaciones: [
          {
            origen: { tipo: 'PEDIDO', id: 'P1' },
            destino: { tipo: 'FACTURA', id: 'F1' },
            tipoRelacion: 'FACTURADO_EN',
            fecha: '2026-11-10T15:00:00Z',
            usuario: 'admin',
          },
        ],
      }),
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      sesionFalsa(permisos).proveedor,
      { provide: AuditoriaApi, useValue: api },
    ],
  });
  return api;
}

async function crear<T>(componente: Type<T>) {
  const fixture = TestBed.createComponent(componente);
  await fixture.whenStable();
  fixture.detectChanges();
  const html = fixture.nativeElement as HTMLElement;
  const enviar = async () => {
    html.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const escribir = (sel: string, v: string) => {
    const el = html.querySelector<HTMLInputElement | HTMLSelectElement>(sel);
    if (!el) throw new Error(sel);
    el.value = v;
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input'));
  };
  return { fixture, html, enviar, escribir };
}

describe('Auditoría', () => {
  it('las pestañas dependen de los permisos', async () => {
    configurar(['auditoria.eventos:read']);
    const { html } = await crear(Auditoria);
    expect([...html.querySelectorAll('nav a')].map((a) => a.textContent?.trim())).toEqual([
      'Eventos de seguridad',
    ]);
  });

  it('el historial muestra el antes y después y filtra por fechas de Lima', async () => {
    const api = configurar();
    const { html, enviar, escribir } = await crear(Cambios);
    expect(html.textContent).toContain('MODIFICACION');
    expect(html.textContent).toContain('Cusco Centro');
    expect(html.textContent).toContain('No');

    escribir('#c-entidad', 'Sucursal');
    escribir('#c-op', 'CREACION');
    escribir('#c-desde', '2026-11-10');
    escribir('#c-hasta', '2026-11-10');
    await enviar();
    expect(api.cambios).toHaveBeenLastCalledWith(
      expect.objectContaining({
        entidad: 'Sucursal',
        operacion: 'CREACION',
        desde: '2026-11-10T05:00:00.000Z',
        hasta: '2026-11-11T05:00:00.000Z',
        pagina: 0,
      }),
    );
  });

  it('los eventos se filtran por tipo y usuario', async () => {
    const api = configurar();
    const { html, enviar, escribir } = await crear(Eventos);
    expect(html.textContent).toContain('LOGIN_FALLIDO');
    expect(html.textContent).toContain('PASSWORD_INCORRECTA');
    escribir('#e-tipo', 'LOGOUT');
    escribir('#e-usuario', 'admin');
    await enviar();
    expect(api.eventos).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipo: 'LOGOUT', usuario: 'admin', desde: null }),
    );
  });

  it('el flujo de documentos exige tipo e id y muestra las relaciones', async () => {
    const api = configurar();
    const { html, enviar, escribir } = await crear(Flujo);
    await enviar();
    expect(api.flujo).not.toHaveBeenCalled();
    escribir('#f-tipo', ' FACTURA ');
    escribir('#f-id', 'F1');
    await enviar();
    expect(api.flujo).toHaveBeenCalledWith('FACTURA', 'F1');
    expect(html.textContent).toContain('Documentos relacionados (2)');
    expect(html.textContent).toContain('FACTURADO_EN');
  });

  it('muestra los errores de la API', async () => {
    const api = configurar();
    const error = () => throwError(() => new HttpErrorResponse({ status: 0 }));
    api.cambios.mockReturnValue(error());
    api.eventos.mockReturnValue(error());
    api.flujo.mockReturnValue(error());
    const cambios = await crear(Cambios);
    expect(cambios.html.textContent).toContain('Sin conexión');
    const eventos = await crear(Eventos);
    expect(eventos.html.textContent).toContain('Sin conexión');
    const flujo = await crear(Flujo);
    flujo.escribir('#f-tipo', 'FACTURA');
    flujo.escribir('#f-id', 'F1');
    await flujo.enviar();
    expect(flujo.html.textContent).toContain('Sin conexión');
  });
});
