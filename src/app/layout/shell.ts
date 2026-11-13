import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { PERMISOS } from '../core/auth/permisos';
import { SesionService } from '../core/auth/sesion.service';

interface ItemMenu {
  readonly ruta: string;
  readonly texto: string;
  readonly permisos: string[];
}

const MENU: ItemMenu[] = [
  { ruta: '/inicio', texto: 'Inicio', permisos: [] },
  { ruta: '/sucursales', texto: 'Sucursales', permisos: [PERMISOS.sucursalesLeer] },
  { ruta: '/usuarios', texto: 'Usuarios', permisos: [PERMISOS.usuariosLeer] },
  { ruta: '/articulos', texto: 'Artículos', permisos: [PERMISOS.articulosLeer] },
  { ruta: '/inventario', texto: 'Inventario', permisos: [PERMISOS.inventarioLeer] },
  { ruta: '/centros', texto: 'Centros de costo', permisos: [PERMISOS.centrosLeer] },
  { ruta: '/roles', texto: 'Roles y permisos', permisos: [PERMISOS.rolesLeer] },
  {
    ruta: '/auditoria',
    texto: 'Auditoría',
    permisos: [PERMISOS.auditoriaLeer, PERMISOS.auditoriaEventos],
  },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  protected readonly sesion = inject(SesionService);
  protected readonly menuAbierto = signal(false);
  protected readonly menu = computed(() =>
    MENU.filter((i) => i.permisos.length === 0 || this.sesion.tieneAlguno(...i.permisos)),
  );

  protected elegirSucursal(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.sesion.elegirSucursal(valor === '' ? null : valor);
  }

  protected salir(): void {
    void this.sesion.logout();
  }
}
