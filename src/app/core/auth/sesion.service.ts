import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, firstValueFrom, shareReplay } from 'rxjs';

import { API } from '../http/api';
import { Perfil, SucursalResumen } from '../modelos/api.modelos';

/**
 * Estado de la sesión en el front. Los tokens viven en cookies HttpOnly del backend: aquí solo se
 * guarda el perfil (quién es, qué puede hacer) y la sucursal elegida, todo en memoria.
 */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly perfilActual = signal<Perfil | null>(null);
  private readonly sucursalElegida = signal<string | null>(null);
  private renovacion: Observable<unknown> | null = null;

  readonly perfil = this.perfilActual.asReadonly();
  readonly autenticado = computed(() => this.perfilActual() !== null);
  readonly requiereCambioPassword = computed(
    () => this.perfilActual()?.requiereCambioPassword ?? false,
  );
  readonly sucursales = computed<SucursalResumen[]>(() => this.perfilActual()?.sucursales ?? []);
  readonly sucursalActiva = computed<SucursalResumen | null>(
    () => this.sucursales().find((s) => s.id === this.sucursalElegida()) ?? null,
  );

  tiene(permiso: string): boolean {
    return this.perfilActual()?.permisos.includes(permiso) ?? false;
  }

  tieneAlguno(...permisos: string[]): boolean {
    return permisos.some((p) => this.tiene(p));
  }

  async login(username: string, password: string): Promise<Perfil> {
    await firstValueFrom(this.http.post<unknown>(`${API}/auth/login`, { username, password }));
    return this.cargarPerfil();
  }

  async cargarPerfil(): Promise<Perfil> {
    const perfil = await firstValueFrom(this.http.get<Perfil>(`${API}/auth/me`));
    this.perfilActual.set(perfil);
    if (!perfil.sucursales.some((s) => s.id === this.sucursalElegida())) {
      this.sucursalElegida.set(
        perfil.todasLasSucursales ? null : (perfil.sucursales[0]?.id ?? null),
      );
    }
    return perfil;
  }

  /** Perfil ya cargado o recién pedido; null si no hay sesión válida. */
  async asegurarPerfil(): Promise<Perfil | null> {
    const actual = this.perfilActual();
    if (actual) {
      return actual;
    }
    try {
      return await this.cargarPerfil();
    } catch {
      return null;
    }
  }

  elegirSucursal(id: string | null): void {
    this.sucursalElegida.set(id);
  }

  async cambiarPassword(
    passwordActual: string,
    nuevaPassword: string,
    confirmacion: string,
  ): Promise<void> {
    await firstValueFrom(
      this.http.patch<unknown>(`${API}/usuarios/me/password`, {
        passwordActual,
        nuevaPassword,
        confirmacion,
      }),
    );
    await this.cargarPerfil();
  }

  /** Una sola renovación a la vez, aunque varias peticiones reciban 401 al mismo tiempo. */
  renovar(): Observable<unknown> {
    this.renovacion ??= this.http.post<unknown>(`${API}/auth/refresh`, {}).pipe(
      finalize(() => (this.renovacion = null)),
      shareReplay(1),
    );
    return this.renovacion;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<unknown>(`${API}/auth/logout`, {}));
    } finally {
      this.limpiar();
      await this.router.navigateByUrl('/login');
    }
  }

  /** La sesión venció o fue cerrada en el servidor: se vuelve al login conservando a dónde iba. */
  async expirada(): Promise<void> {
    const volver = this.router.url;
    this.limpiar();
    await this.router.navigate(['/login'], {
      queryParams: volver && volver !== '/' && !volver.startsWith('/login') ? { volver } : {},
    });
  }

  private limpiar(): void {
    this.perfilActual.set(null);
    this.sucursalElegida.set(null);
  }
}
