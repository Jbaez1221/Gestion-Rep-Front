import { NotificacionesService } from './notificaciones.service';

describe('NotificacionesService', () => {
  afterEach(() => vi.useRealTimers());

  it('agrega avisos y los cierra a mano o solos a los 6 segundos', () => {
    vi.useFakeTimers();
    const servicio = new NotificacionesService();
    servicio.exito('Guardado');
    servicio.error('Falló');
    expect(servicio.notificaciones().map((n) => n.tipo)).toEqual(['exito', 'error']);

    servicio.cerrar(servicio.notificaciones()[0]?.id ?? 0);
    expect(servicio.notificaciones()).toHaveLength(1);

    vi.advanceTimersByTime(6000);
    expect(servicio.notificaciones()).toHaveLength(0);
  });
});
