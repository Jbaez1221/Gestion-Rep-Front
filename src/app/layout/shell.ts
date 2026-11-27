import { A11yModule } from '@angular/cdk/a11y';
import { CdkMenu, CdkMenuItem, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { PERMISOS } from '../core/auth/permisos';
import { SesionService } from '../core/auth/sesion.service';
import { PreferenciasService } from '../core/ui/preferencias.service';
import { Tema, TemaService } from '../core/ui/tema.service';
import { Icono, NombreIcono } from '../shared/ui/icono';

interface ItemMenu {
  readonly ruta: string;
  readonly texto: string;
  readonly icono: NombreIcono;
  readonly permisos: string[];
}

interface GrupoMenu {
  readonly titulo: string | null;
  readonly items: ItemMenu[];
}

const MENU: GrupoMenu[] = [
  {
    titulo: null,
    items: [
      { ruta: '/inicio', texto: 'Inicio', icono: 'inicio', permisos: [] },
      {
        ruta: '/reportes/ventas',
        texto: 'Reportes',
        icono: 'reportes',
        permisos: [PERMISOS.reportesVentas],
      },
    ],
  },
  {
    titulo: 'Comercial',
    items: [
      { ruta: '/ventas', texto: 'Ventas', icono: 'ventas', permisos: [PERMISOS.ventasLeer] },
      { ruta: '/caja', texto: 'Caja', icono: 'caja', permisos: [PERMISOS.cajaLeer] },
      {
        ruta: '/facturacion',
        texto: 'Comprobantes',
        icono: 'comprobantes',
        permisos: [PERMISOS.facturacionLeer],
      },
      {
        ruta: '/creditos',
        texto: 'Créditos',
        icono: 'creditos',
        permisos: [PERMISOS.creditosLeer, PERMISOS.creditosPagarLeer],
      },
    ],
  },
  {
    titulo: 'Inventario y compras',
    items: [
      {
        ruta: '/articulos',
        texto: 'Artículos',
        icono: 'articulos',
        permisos: [PERMISOS.articulosLeer],
      },
      {
        ruta: '/inventario',
        texto: 'Inventario',
        icono: 'inventario',
        permisos: [PERMISOS.inventarioLeer],
      },
      { ruta: '/compras', texto: 'Compras', icono: 'compras', permisos: [PERMISOS.comprasLeer] },
    ],
  },
  {
    titulo: 'Maestros',
    items: [
      {
        ruta: '/socios',
        texto: 'Socios comerciales',
        icono: 'socios',
        permisos: [PERMISOS.sociosLeer],
      },
      {
        ruta: '/sucursales',
        texto: 'Sucursales',
        icono: 'sucursales',
        permisos: [PERMISOS.sucursalesLeer],
      },
      {
        ruta: '/centros',
        texto: 'Centros de costo',
        icono: 'centros',
        permisos: [PERMISOS.centrosLeer],
      },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      {
        ruta: '/usuarios',
        texto: 'Usuarios',
        icono: 'usuarios',
        permisos: [PERMISOS.usuariosLeer],
      },
      { ruta: '/roles', texto: 'Roles y permisos', icono: 'roles', permisos: [PERMISOS.rolesLeer] },
      {
        ruta: '/auditoria',
        texto: 'Auditoría',
        icono: 'auditoria',
        permisos: [PERMISOS.auditoriaLeer, PERMISOS.auditoriaEventos],
      },
    ],
  },
];

const CLAVE_COLAPSADO = 'menu-colapsado';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    A11yModule,
    CdkMenu,
    CdkMenuItem,
    CdkMenuItemRadio,
    CdkMenuTrigger,
    Icono,
    NgTemplateOutlet,
  ],
  templateUrl: './shell.html',
  host: { '(document:keydown.escape)': 'menuAbierto.set(false)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  protected readonly sesion = inject(SesionService);
  protected readonly temas = inject(TemaService);
  private readonly preferencias = inject(PreferenciasService);
  /** Panel del menú en pantallas angostas (tablet vertical, celular). */
  protected readonly menuAbierto = signal(false);
  /** Menú lateral reducido a íconos en escritorio; se recuerda en el navegador. */
  protected readonly colapsado = signal(this.leerColapsado());
  protected readonly grupos = computed(() =>
    MENU.map((g) => ({
      ...g,
      items: g.items.filter(
        (i) => i.permisos.length === 0 || this.sesion.tieneAlguno(...i.permisos),
      ),
    })).filter((g) => g.items.length > 0),
  );
  protected readonly opcionesTema: { valor: Tema; texto: string; icono: NombreIcono }[] = [
    { valor: 'claro', texto: 'Claro', icono: 'sol' },
    { valor: 'oscuro', texto: 'Oscuro', icono: 'luna' },
    { valor: 'sistema', texto: 'Según el sistema', icono: 'pantalla' },
  ];
  protected readonly iconoTema = computed<NombreIcono>(() =>
    this.temas.tema() === 'claro' ? 'sol' : this.temas.tema() === 'oscuro' ? 'luna' : 'pantalla',
  );
  protected readonly iniciales = computed(() => {
    const p = this.sesion.perfil();
    return p ? `${p.nombres.charAt(0)}${p.apellidos.charAt(0)}`.toUpperCase() : '';
  });

  protected alternarColapso(): void {
    const valor = !this.colapsado();
    this.colapsado.set(valor);
    this.preferencias.guardar(CLAVE_COLAPSADO, valor ? '1' : '0');
  }

  /** Sin preferencia guardada, el menú arranca reducido en pantallas medianas (tablet horizontal). */
  private leerColapsado(): boolean {
    const guardado = this.preferencias.leer(CLAVE_COLAPSADO);
    return guardado === null
      ? typeof window !== 'undefined' && window.innerWidth < 1280
      : guardado === '1';
  }

  protected elegirSucursal(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.sesion.elegirSucursal(valor === '' ? null : valor);
  }

  protected salir(): void {
    void this.sesion.logout();
  }
}
