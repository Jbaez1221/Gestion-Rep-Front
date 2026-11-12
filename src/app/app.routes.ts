import { Routes } from '@angular/router';

import { autenticadoGuard, invitadoGuard, permisoGuard } from './core/auth/guards';
import { PERMISOS } from './core/auth/permisos';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Ingresar · Repuestos',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'cambiar-password',
    title: 'Cambiar contraseña · Repuestos',
    canActivate: [autenticadoGuard],
    loadComponent: () =>
      import('./features/auth/cambiar-password/cambiar-password').then((m) => m.CambiarPassword),
  },
  {
    path: '',
    canActivate: [autenticadoGuard],
    canActivateChild: [permisoGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        title: 'Inicio · Repuestos',
        loadComponent: () => import('./features/inicio/inicio').then((m) => m.Inicio),
      },
      {
        path: 'sucursales',
        title: 'Sucursales · Repuestos',
        data: { permisos: [PERMISOS.sucursalesLeer] },
        loadComponent: () =>
          import('./features/sucursales/sucursales-lista').then((m) => m.SucursalesLista),
      },
      {
        path: 'sucursales/nueva',
        title: 'Nueva sucursal · Repuestos',
        data: { permisos: [PERMISOS.sucursalesCrear] },
        loadComponent: () =>
          import('./features/sucursales/sucursal-detalle').then((m) => m.SucursalDetalle),
      },
      {
        path: 'sucursales/:id',
        title: 'Sucursal · Repuestos',
        data: { permisos: [PERMISOS.sucursalesLeer] },
        loadComponent: () =>
          import('./features/sucursales/sucursal-detalle').then((m) => m.SucursalDetalle),
      },
      {
        path: 'usuarios',
        title: 'Usuarios · Repuestos',
        data: { permisos: [PERMISOS.usuariosLeer] },
        loadComponent: () =>
          import('./features/usuarios/usuarios-lista').then((m) => m.UsuariosLista),
      },
      {
        path: 'usuarios/nuevo',
        title: 'Nuevo usuario · Repuestos',
        data: { permisos: [PERMISOS.usuariosCrear] },
        loadComponent: () =>
          import('./features/usuarios/usuario-detalle').then((m) => m.UsuarioDetalle),
      },
      {
        path: 'usuarios/:id',
        title: 'Usuario · Repuestos',
        data: { permisos: [PERMISOS.usuariosLeer] },
        loadComponent: () =>
          import('./features/usuarios/usuario-detalle').then((m) => m.UsuarioDetalle),
      },
      {
        path: 'roles',
        title: 'Roles y permisos · Repuestos',
        data: { permisos: [PERMISOS.rolesLeer] },
        loadComponent: () => import('./features/roles/roles').then((m) => m.Roles),
      },
      {
        path: 'centros',
        title: 'Centros de costo · Repuestos',
        data: { permisos: [PERMISOS.centrosLeer] },
        loadComponent: () => import('./features/centros/centros').then((m) => m.Centros),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'costo' },
          {
            path: 'costo',
            data: { tipo: 'COSTO' },
            loadComponent: () =>
              import('./features/centros/catalogo-centros').then((m) => m.CatalogoCentros),
          },
          {
            path: 'beneficio',
            data: { tipo: 'BENEFICIO' },
            loadComponent: () =>
              import('./features/centros/catalogo-centros').then((m) => m.CatalogoCentros),
          },
          {
            path: 'presupuesto',
            loadComponent: () =>
              import('./features/centros/presupuesto').then((m) => m.Presupuesto),
          },
          {
            path: 'imputaciones',
            loadComponent: () =>
              import('./features/centros/imputaciones').then((m) => m.Imputaciones),
          },
          {
            path: 'reportes',
            loadComponent: () =>
              import('./features/centros/reportes').then((m) => m.ReportesCentros),
          },
          {
            path: 'periodos',
            loadComponent: () => import('./features/centros/periodos').then((m) => m.Periodos),
          },
        ],
      },
      {
        path: 'articulos',
        title: 'Artículos · Repuestos',
        data: { permisos: [PERMISOS.articulosLeer] },
        loadComponent: () => import('./features/articulos/articulos').then((m) => m.Articulos),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'lista' },
          {
            path: 'lista',
            loadComponent: () =>
              import('./features/articulos/articulos-lista').then((m) => m.ArticulosLista),
          },
          {
            path: 'catalogos',
            loadComponent: () =>
              import('./features/articulos/catalogos').then((m) => m.CatalogosArticulos),
          },
          {
            path: 'importar',
            data: { permisos: [PERMISOS.articulosImportar] },
            canActivate: [permisoGuard],
            loadComponent: () =>
              import('./features/articulos/importacion').then((m) => m.ImportacionArticulos),
          },
          {
            path: 'nuevo',
            data: { permisos: [PERMISOS.articulosCrear] },
            canActivate: [permisoGuard],
            loadComponent: () =>
              import('./features/articulos/articulo-detalle').then((m) => m.ArticuloDetalle),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/articulos/articulo-detalle').then((m) => m.ArticuloDetalle),
          },
        ],
      },
      {
        path: 'inventario',
        title: 'Inventario · Repuestos',
        data: { permisos: [PERMISOS.inventarioLeer] },
        loadComponent: () => import('./features/inventario/inventario').then((m) => m.Inventario),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'existencias' },
          {
            path: 'existencias',
            loadComponent: () =>
              import('./features/inventario/existencias').then((m) => m.Existencias),
          },
          {
            path: 'movimientos',
            loadComponent: () =>
              import('./features/inventario/movimientos').then((m) => m.Movimientos),
          },
          {
            path: 'traslados',
            loadComponent: () => import('./features/inventario/traslados').then((m) => m.Traslados),
          },
          {
            path: 'kardex',
            loadComponent: () => import('./features/inventario/kardex').then((m) => m.Kardex),
          },
          {
            path: 'lotes-series',
            loadComponent: () =>
              import('./features/inventario/lotes-series').then((m) => m.LotesSeries),
          },
          {
            path: 'resumen',
            loadComponent: () =>
              import('./features/inventario/resumen').then((m) => m.ResumenInventario),
          },
          {
            path: 'conteos',
            loadComponent: () => import('./features/inventario/conteos').then((m) => m.Conteos),
          },
          {
            path: 'valorizacion',
            loadComponent: () =>
              import('./features/inventario/valorizacion').then((m) => m.Valorizacion),
          },
        ],
      },
      {
        path: 'auditoria',
        title: 'Auditoría · Repuestos',
        data: { permisos: [PERMISOS.auditoriaLeer, PERMISOS.auditoriaEventos] },
        loadComponent: () => import('./features/auditoria/auditoria').then((m) => m.Auditoria),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'cambios' },
          {
            path: 'cambios',
            data: { permisos: [PERMISOS.auditoriaLeer] },
            canActivate: [permisoGuard],
            loadComponent: () => import('./features/auditoria/cambios').then((m) => m.Cambios),
          },
          {
            path: 'eventos',
            data: { permisos: [PERMISOS.auditoriaEventos] },
            canActivate: [permisoGuard],
            loadComponent: () => import('./features/auditoria/eventos').then((m) => m.Eventos),
          },
          {
            path: 'flujo',
            data: { permisos: [PERMISOS.auditoriaLeer] },
            canActivate: [permisoGuard],
            loadComponent: () => import('./features/auditoria/flujo').then((m) => m.Flujo),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
