import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { Rol, SucursalResumen, TipoDocumento, Usuario } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { RolesApi } from '../roles/roles.api';
import { SucursalesApi } from '../sucursales/sucursales.api';
import { UsuariosApi } from './usuarios.api';

@Component({
  selector: 'app-usuario-detalle',
  imports: [ReactiveFormsModule, RouterLink, ErrorApi],
  templateUrl: './usuario-detalle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioDetalle implements OnInit {
  private readonly api = inject(UsuariosApi);
  private readonly rolesApi = inject(RolesApi);
  private readonly sucursalesApi = inject(SucursalesApi);
  private readonly avisos = inject(NotificacionesService);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;

  readonly id = input<string>();

  protected readonly usuario = signal<Usuario | null>(null);
  protected readonly creado = signal<Usuario | null>(null);
  protected readonly roles = signal<Rol[]>([]);
  protected readonly sucursales = signal<SucursalResumen[]>([]);
  protected readonly seleccionadas = signal<ReadonlySet<string>>(new Set());
  protected readonly passwordProvisional = signal<string | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly guardando = signal(false);
  protected readonly esNuevo = computed(() => !this.id());
  protected readonly esUnoMismo = computed(() => this.usuario()?.id === this.sesion.perfil()?.id);

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    username: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{3,50}$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    tipoDocumento: ['' as TipoDocumento | ''],
    numeroDocumento: ['', Validators.maxLength(20)],
    rolId: ['', Validators.required],
    activo: [true],
    bloqueado: [false],
  });

  ngOnInit(): void {
    void this.cargarCatalogos();
    const id = this.id();
    if (id) {
      this.formulario.controls.username.disable();
      void this.cargar(id);
    }
    const permiso = id ? PERMISOS.usuariosEditar : PERMISOS.usuariosCrear;
    if (!this.sesion.tiene(permiso)) {
      this.formulario.disable();
    }
  }

  /** Roles y sucursales asignables. Sin permiso de ver sucursales, solo las propias. */
  private async cargarCatalogos(): Promise<void> {
    try {
      if (this.sesion.tiene(PERMISOS.rolesLeer)) {
        this.roles.set(await firstValueFrom(this.rolesApi.listar()));
      }
      if (this.sesion.tiene(PERMISOS.sucursalesLeer)) {
        const pagina = await firstValueFrom(
          this.sucursalesApi.listar({ activa: true, tamanio: 100 }),
        );
        this.sucursales.set(
          pagina.contenido.map(({ id, codigo, nombre }) => ({ id, codigo, nombre })),
        );
      } else {
        this.sucursales.set(this.sesion.sucursales());
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async cargar(id: string): Promise<void> {
    try {
      const u = await firstValueFrom(this.api.obtener(id));
      this.usuario.set(u);
      this.seleccionadas.set(new Set(u.sucursalIds));
      this.formulario.patchValue({
        username: u.username,
        email: u.email,
        nombres: u.nombres,
        apellidos: u.apellidos,
        tipoDocumento: u.tipoDocumento ?? '',
        numeroDocumento: u.numeroDocumento ?? '',
        rolId: u.rol.id,
        activo: u.activo,
        bloqueado: u.bloqueado,
      });
      if (this.roles().length === 0) {
        this.roles.set([
          { id: u.rol.id, nombre: u.rol.nombre, descripcion: null, sistema: false, permisos: [] },
        ]);
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected alternarSucursal(id: string): void {
    const nuevas = new Set(this.seleccionadas());
    if (nuevas.has(id)) {
      nuevas.delete(id);
    } else {
      nuevas.add(id);
    }
    this.seleccionadas.set(nuevas);
  }

  protected async guardar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const v = this.formulario.getRawValue();
    const base = {
      email: v.email,
      nombres: v.nombres,
      apellidos: v.apellidos,
      tipoDocumento: v.tipoDocumento || null,
      numeroDocumento: v.numeroDocumento || null,
      rolId: v.rolId,
      sucursalIds: [...this.seleccionadas()],
    };
    await this.ejecutar(async () => {
      const id = this.id();
      if (id) {
        this.usuario.set(
          await firstValueFrom(
            this.api.actualizar(id, { ...base, activo: v.activo, bloqueado: v.bloqueado }),
          ),
        );
        this.avisos.exito('Usuario actualizado.');
      } else {
        // Se queda en la pantalla: la contraseña provisional se muestra aquí una sola vez.
        const creado = await firstValueFrom(this.api.crear({ ...base, username: v.username }));
        this.creado.set(creado.usuario);
        this.passwordProvisional.set(creado.passwordProvisional);
        this.formulario.disable();
        this.avisos.exito(`Usuario ${creado.usuario.username} creado.`);
      }
    });
  }

  protected async restablecer(): Promise<void> {
    const u = this.usuario();
    if (!u) {
      return;
    }
    const confirmacion = window.prompt(
      `Se generará una nueva contraseña provisional y se cerrarán las sesiones de ${u.username}.\nEscriba el usuario para confirmar:`,
    );
    if (confirmacion === null) {
      return;
    }
    await this.ejecutar(async () => {
      this.passwordProvisional.set(
        await firstValueFrom(this.api.restablecerPassword(u.id, confirmacion)),
      );
    });
  }

  protected async desactivar(): Promise<void> {
    const u = this.usuario();
    if (!u || !window.confirm(`¿Desactivar a ${u.username}? Se cerrarán sus sesiones.`)) {
      return;
    }
    await this.ejecutar(async () => {
      await firstValueFrom(this.api.desactivar(u.id));
      this.avisos.exito('Usuario desactivado.');
      await this.cargar(u.id);
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
