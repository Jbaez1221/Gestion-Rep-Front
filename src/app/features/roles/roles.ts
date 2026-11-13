import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { Permiso, Rol } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { RolesApi } from './roles.api';

const PATRON_ROL = /^[A-Za-z0-9_ ]{3,50}$/;

export interface GrupoPermisos {
  readonly modulo: string;
  readonly permisos: Permiso[];
}

export function agruparPorModulo(permisos: Permiso[]): GrupoPermisos[] {
  const grupos = new Map<string, Permiso[]>();
  for (const p of permisos) {
    grupos.set(p.modulo, [...(grupos.get(p.modulo) ?? []), p]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([modulo, lista]) => ({ modulo, permisos: lista }));
}

@Component({
  selector: 'app-roles',
  imports: [ReactiveFormsModule, ErrorApi],
  templateUrl: './roles.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Roles {
  private readonly api = inject(RolesApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisosApp = PERMISOS;

  protected readonly roles = signal<Rol[]>([]);
  protected readonly catalogo = signal<Permiso[]>([]);
  protected readonly seleccionadoId = signal<string | null>(null);
  protected readonly marcados = signal<ReadonlySet<string>>(new Set());
  protected readonly error = signal<Problema | null>(null);
  protected readonly guardando = signal(false);

  protected readonly seleccionado = computed(
    () => this.roles().find((r) => r.id === this.seleccionadoId()) ?? null,
  );
  protected readonly grupos = computed(() => agruparPorModulo(this.catalogo()));
  protected readonly editable = computed(() => {
    const r = this.seleccionado();
    return !!r && !r.sistema && this.sesion.tiene(PERMISOS.rolesEditar);
  });

  protected readonly datos = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(PATRON_ROL)]],
    descripcion: ['', Validators.maxLength(255)],
  });
  protected readonly nuevo = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(PATRON_ROL)]],
    descripcion: ['', Validators.maxLength(255)],
  });

  constructor() {
    void this.cargar();
  }

  private async cargar(seleccionar?: string): Promise<void> {
    try {
      this.roles.set(await firstValueFrom(this.api.listar()));
      if (this.catalogo().length === 0 && this.sesion.tiene(PERMISOS.permisosLeer)) {
        this.catalogo.set(await firstValueFrom(this.api.permisos()));
      }
      const id = seleccionar ?? this.seleccionadoId() ?? this.roles()[0]?.id ?? null;
      if (id) {
        this.seleccionar(id);
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected seleccionar(id: string): void {
    this.seleccionadoId.set(id);
    const r = this.seleccionado();
    if (r) {
      this.marcados.set(new Set(r.permisos));
      this.datos.reset({ nombre: r.nombre, descripcion: r.descripcion ?? '' });
      if (this.editable()) {
        this.datos.enable();
      } else {
        this.datos.disable();
      }
    }
  }

  protected alternar(codigo: string): void {
    const nuevos = new Set(this.marcados());
    if (nuevos.has(codigo)) {
      nuevos.delete(codigo);
    } else {
      nuevos.add(codigo);
    }
    this.marcados.set(nuevos);
  }

  protected async guardarDatos(): Promise<void> {
    const r = this.seleccionado();
    if (!r || this.datos.invalid) {
      this.datos.markAllAsTouched();
      return;
    }
    const { nombre, descripcion } = this.datos.getRawValue();
    await this.ejecutar(async () => {
      await firstValueFrom(this.api.actualizar(r.id, nombre, descripcion || null));
      await this.cargar(r.id);
      this.avisos.exito('Rol actualizado.');
    });
  }

  protected async guardarPermisos(): Promise<void> {
    const r = this.seleccionado();
    if (!r) {
      return;
    }
    await this.ejecutar(async () => {
      await firstValueFrom(this.api.asignarPermisos(r.id, [...this.marcados()]));
      await this.cargar(r.id);
      this.avisos.exito('Permisos actualizados.');
    });
  }

  protected async crear(): Promise<void> {
    if (this.nuevo.invalid) {
      this.nuevo.markAllAsTouched();
      return;
    }
    const { nombre, descripcion } = this.nuevo.getRawValue();
    await this.ejecutar(async () => {
      const rol = await firstValueFrom(this.api.crear(nombre, descripcion || null));
      this.nuevo.reset();
      await this.cargar(rol.id);
      this.avisos.exito(`Rol ${rol.nombre} creado. Ahora asígnele permisos.`);
    });
  }

  protected async eliminar(): Promise<void> {
    const r = this.seleccionado();
    if (!r || !window.confirm(`¿Eliminar el rol ${r.nombre}?`)) {
      return;
    }
    await this.ejecutar(async () => {
      await firstValueFrom(this.api.eliminar(r.id));
      this.seleccionadoId.set(null);
      await this.cargar();
      this.avisos.exito('Rol eliminado.');
    });
  }

  private async ejecutar(accion: () => Promise<void>): Promise<void> {
    this.guardando.set(true);
    this.error.set(null);
    try {
      await accion();
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.guardando.set(false);
    }
  }
}
