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
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { Almacen, Sucursal, SucursalGuardar, TipoSucursal } from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { SucursalesApi } from './sucursales.api';

const PATRON_CODIGO = /^[A-Za-z0-9-]{1,20}$/;

@Component({
  selector: 'app-sucursal-detalle',
  imports: [ReactiveFormsModule, RouterLink, ErrorApi],
  templateUrl: './sucursal-detalle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SucursalDetalle implements OnInit {
  private readonly api = inject(SucursalesApi);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;

  /** Id de la ruta; ausente al crear. */
  readonly id = input<string>();

  protected readonly sucursal = signal<Sucursal | null>(null);
  protected readonly almacenes = signal<Almacen[]>([]);
  protected readonly error = signal<Problema | null>(null);
  protected readonly guardando = signal(false);
  protected readonly editandoAlmacen = signal<string | null>(null);
  protected readonly esNueva = computed(() => !this.id());
  protected readonly puedeEditar = computed(() =>
    this.sesion.tiene(this.esNueva() ? PERMISOS.sucursalesCrear : PERMISOS.sucursalesEditar),
  );

  protected readonly formulario = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern(PATRON_CODIGO)]],
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    tipo: ['TIENDA' as TipoSucursal, Validators.required],
    direccion: ['', Validators.maxLength(250)],
    ubigeo: ['', Validators.pattern(/^\d{6}$/)],
    telefono: ['', Validators.maxLength(30)],
    codigoEstablecimientoSunat: ['', Validators.pattern(/^\d{4}$/)],
  });

  protected readonly nuevoAlmacen = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern(PATRON_CODIGO)]],
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
  });

  protected readonly nombreAlmacen = this.fb.control('', [
    Validators.required,
    Validators.maxLength(150),
  ]);

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.formulario.controls.codigo.disable();
      void this.cargar(id);
    }
    if (!this.puedeEditar()) {
      this.formulario.disable();
    }
  }

  private async cargar(id: string): Promise<void> {
    try {
      const s = await firstValueFrom(this.api.obtener(id));
      this.sucursal.set(s);
      this.formulario.patchValue({
        codigo: s.codigo,
        nombre: s.nombre,
        tipo: s.tipo,
        direccion: s.direccion ?? '',
        ubigeo: s.ubigeo ?? '',
        telefono: s.telefono ?? '',
        codigoEstablecimientoSunat: s.codigoEstablecimientoSunat ?? '',
      });
      if (this.sesion.tiene(PERMISOS.almacenesLeer)) {
        this.almacenes.set(await firstValueFrom(this.api.almacenes(id)));
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async guardar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const v = this.formulario.getRawValue();
    const datos: SucursalGuardar = {
      nombre: v.nombre,
      tipo: v.tipo,
      direccion: v.direccion || null,
      ubigeo: v.ubigeo || null,
      telefono: v.telefono || null,
      codigoEstablecimientoSunat: v.codigoEstablecimientoSunat || null,
    };
    await this.ejecutar(async () => {
      const id = this.id();
      if (id) {
        this.sucursal.set(await firstValueFrom(this.api.actualizar(id, datos)));
        this.avisos.exito('Sucursal actualizada.');
      } else {
        const creada = await firstValueFrom(this.api.crear({ ...datos, codigo: v.codigo }));
        this.avisos.exito(`Sucursal ${creada.codigo} creada con su almacén principal.`);
        await this.router.navigate(['/sucursales', creada.id]);
      }
    });
  }

  protected async cambiarEstado(): Promise<void> {
    const s = this.sucursal();
    if (!s) {
      return;
    }
    await this.ejecutar(async () => {
      this.sucursal.set(await firstValueFrom(this.api.cambiarEstado(s.id, !s.activa)));
      this.avisos.exito(s.activa ? 'Sucursal desactivada.' : 'Sucursal activada.');
    });
  }

  protected async agregarAlmacen(): Promise<void> {
    const s = this.sucursal();
    if (!s || this.nuevoAlmacen.invalid) {
      this.nuevoAlmacen.markAllAsTouched();
      return;
    }
    const { codigo, nombre } = this.nuevoAlmacen.getRawValue();
    await this.ejecutar(async () => {
      await firstValueFrom(this.api.crearAlmacen(s.id, codigo, nombre));
      this.nuevoAlmacen.reset();
      await this.recargarAlmacenes(s.id);
      this.avisos.exito('Almacén creado.');
    });
  }

  protected editar(a: Almacen): void {
    this.editandoAlmacen.set(a.id);
    this.nombreAlmacen.setValue(a.nombre);
  }

  protected async renombrar(a: Almacen): Promise<void> {
    if (this.nombreAlmacen.invalid) {
      return;
    }
    await this.ejecutar(async () => {
      await firstValueFrom(this.api.renombrarAlmacen(a.id, this.nombreAlmacen.getRawValue()));
      this.editandoAlmacen.set(null);
      await this.recargarAlmacenes(a.sucursalId);
    });
  }

  protected async alternarAlmacen(a: Almacen): Promise<void> {
    await this.ejecutar(async () => {
      await firstValueFrom(this.api.cambiarEstadoAlmacen(a.id, !a.activo));
      await this.recargarAlmacenes(a.sucursalId);
    });
  }

  protected async marcarPrincipal(a: Almacen): Promise<void> {
    await this.ejecutar(async () => {
      await firstValueFrom(this.api.marcarPrincipal(a.id));
      await this.recargarAlmacenes(a.sucursalId);
      this.avisos.exito(`${a.codigo} es ahora el almacén principal.`);
    });
  }

  private async recargarAlmacenes(sucursalId: string): Promise<void> {
    this.almacenes.set(await firstValueFrom(this.api.almacenes(sucursalId)));
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
