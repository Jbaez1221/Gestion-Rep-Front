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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import {
  Centro,
  CentroGuardar,
  FuncionCosto,
  FuncionPcge,
  TipoCentro,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { UsuariosApi } from '../usuarios/usuarios.api';
import { conDescendientes, hoyEnLima, indentar, ordenarComoArbol } from './arbol';
import { CentrosApi } from './centros.api';

interface OpcionUsuario {
  readonly id: string;
  readonly nombre: string;
}

@Component({
  selector: 'app-catalogo-centros',
  imports: [ReactiveFormsModule, ErrorApi],
  templateUrl: './catalogo-centros.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoCentros implements OnInit {
  private readonly api = inject(CentrosApi);
  private readonly usuariosApi = inject(UsuariosApi);
  private readonly avisos = inject(NotificacionesService);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly indentar = indentar;

  /** COSTO o BENEFICIO, desde los datos de la ruta. */
  readonly tipo = input<TipoCentro>('COSTO');

  protected readonly centros = signal<Centro[]>([]);
  protected readonly beneficios = signal<Centro[]>([]);
  protected readonly funciones = signal<FuncionPcge[]>([]);
  protected readonly usuarios = signal<OpcionUsuario[]>([]);
  protected readonly editando = signal<Centro | 'nuevo' | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly guardando = signal(false);

  protected readonly esCosto = computed(() => this.tipo() === 'COSTO');
  protected readonly arbol = computed(() => ordenarComoArbol(this.centros()));
  protected readonly esNuevo = computed(() => this.editando() === 'nuevo');
  protected readonly beneficiosImputables = computed(() =>
    this.beneficios().filter((b) => b.imputable && b.activo),
  );
  protected readonly padresPosibles = computed(() => {
    const actual = this.editando();
    const excluidos =
      actual && actual !== 'nuevo'
        ? conDescendientes(this.centros(), actual.id)
        : new Set<string>();
    return this.centros().filter((c) => !c.imputable && !excluidos.has(c.id));
  });
  protected readonly nombreBeneficio = computed(
    () => new Map(this.beneficios().map((b) => [b.id, b.codigo])),
  );

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    codigo: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{2,20}$/)]],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: ['', Validators.maxLength(250)],
    imputable: [true],
    padreId: [''],
    funcion: ['' as FuncionCosto | ''],
    cuentaDestino: ['', Validators.pattern(/^9\d{1,5}$/)],
    centroBeneficioId: [''],
    responsableId: [''],
    vigenteDesde: [hoyEnLima(), Validators.required],
    vigenteHasta: [''],
  });

  constructor() {
    this.formulario.controls.funcion.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.proponerCuenta());
  }

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      this.centros.set(await firstValueFrom(this.api.listar(this.tipo())));
      if (this.esCosto()) {
        this.beneficios.set(await firstValueFrom(this.api.listar('BENEFICIO')));
        if (this.funciones().length === 0) {
          this.funciones.set(await firstValueFrom(this.api.funciones()));
        }
      }
      if (this.usuarios().length === 0 && this.sesion.tiene(PERMISOS.usuariosLeer)) {
        const pagina = await firstValueFrom(
          this.usuariosApi.listar({ activo: true, tamanio: 100 }),
        );
        this.usuarios.set(
          pagina.contenido.map((u) => ({ id: u.id, nombre: `${u.nombres} ${u.apellidos}` })),
        );
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected nuevo(): void {
    this.editando.set('nuevo');
    this.formulario.reset({ imputable: true, vigenteDesde: hoyEnLima() });
    this.formulario.enable();
  }

  protected editar(c: Centro): void {
    this.editando.set(c);
    this.formulario.reset({
      codigo: c.codigo,
      nombre: c.nombre,
      descripcion: c.descripcion ?? '',
      imputable: c.imputable,
      padreId: c.padreId ?? '',
      funcion: c.funcion ?? '',
      cuentaDestino: c.cuentaDestino ?? '',
      centroBeneficioId: c.centroBeneficioId ?? '',
      responsableId: c.responsable?.id ?? '',
      vigenteDesde: c.vigenteDesde,
      vigenteHasta: c.vigenteHasta ?? '',
    });
    this.formulario.controls.codigo.disable();
    this.formulario.controls.imputable.disable();
    if (!this.sesion.tiene(PERMISOS.centrosEditar)) {
      this.formulario.disable();
    }
  }

  /** Al elegir la función se propone su cuenta de destino (94, 95, 97, 90). */
  private proponerCuenta(): void {
    const f = this.funciones().find((x) => x.funcion === this.formulario.controls.funcion.value);
    if (f && !this.formulario.controls.cuentaDestino.value.startsWith(f.cuentaDestino)) {
      this.formulario.controls.cuentaDestino.setValue(f.cuentaDestino);
    }
  }

  protected async guardar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const v = this.formulario.getRawValue();
    const datos: CentroGuardar = {
      nombre: v.nombre,
      descripcion: v.descripcion || null,
      padreId: v.padreId || null,
      responsableId: v.responsableId || null,
      vigenteDesde: v.vigenteDesde,
      vigenteHasta: v.vigenteHasta || null,
      ...(this.esCosto()
        ? {
            funcion: v.funcion || null,
            cuentaDestino: v.cuentaDestino || null,
            centroBeneficioId: v.centroBeneficioId || null,
          }
        : {}),
    };
    await this.ejecutar(async () => {
      const actual = this.editando();
      if (actual === 'nuevo') {
        const creado = await firstValueFrom(
          this.api.crear(this.tipo(), { ...datos, codigo: v.codigo, imputable: v.imputable }),
        );
        this.avisos.exito(`Centro ${creado.codigo} creado.`);
      } else if (actual) {
        await firstValueFrom(this.api.actualizar(this.tipo(), actual.id, datos));
        this.avisos.exito('Centro actualizado.');
      }
      this.editando.set(null);
      await this.cargar();
    });
  }

  protected async cambiarEstado(c: Centro): Promise<void> {
    await this.ejecutar(async () => {
      await firstValueFrom(this.api.cambiarEstado(this.tipo(), c.id, !c.activo));
      this.avisos.exito(c.activo ? `${c.codigo} desactivado.` : `${c.codigo} activado.`);
      this.editando.set(null);
      await this.cargar();
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
