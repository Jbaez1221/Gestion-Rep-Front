import { computed, signal } from '@angular/core';

import { SesionService } from '../core/auth/sesion.service';
import { Perfil } from '../core/modelos/api.modelos';

export function perfilDePrueba(cambios: Partial<Perfil> = {}): Perfil {
  return {
    id: 'u-1',
    username: 'admin',
    email: 'admin@prueba.local',
    nombres: 'Ana',
    apellidos: 'Pérez',
    rol: 'ADMINISTRADOR',
    permisos: [],
    sucursales: [{ id: 's-1', codigo: 'CUS01', nombre: 'Cusco Centro' }],
    todasLasSucursales: false,
    requiereCambioPassword: false,
    ...cambios,
  };
}

/** Doble de SesionService para tests de componentes: mismo API público, sin HTTP. */
export function sesionFalsa(permisos: string[] = [], cambios: Partial<Perfil> = {}) {
  const perfil = signal<Perfil | null>(perfilDePrueba({ permisos, ...cambios }));
  const elegida = signal<string | null>(perfil()?.sucursales[0]?.id ?? null);
  const sucursales = computed(() => perfil()?.sucursales ?? []);
  const falsa = {
    perfil,
    autenticado: computed(() => perfil() !== null),
    requiereCambioPassword: computed(() => perfil()?.requiereCambioPassword ?? false),
    sucursales,
    sucursalActiva: computed(() => sucursales().find((s) => s.id === elegida()) ?? null),
    tiene: (p: string) => perfil()?.permisos.includes(p) ?? false,
    tieneAlguno: (...ps: string[]) => ps.some((p) => perfil()?.permisos.includes(p) ?? false),
    elegirSucursal: vi.fn((id: string | null) => elegida.set(id)),
    login: vi.fn(),
    logout: vi.fn(() => Promise.resolve()),
    cambiarPassword: vi.fn(() => Promise.resolve()),
  };
  return { falsa, proveedor: { provide: SesionService, useValue: falsa } };
}
