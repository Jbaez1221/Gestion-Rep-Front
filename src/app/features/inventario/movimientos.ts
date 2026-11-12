import { DecimalPipe, KeyValuePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import {
  AlmacenOpcion,
  ArticuloListado,
  Centro,
  Movimiento,
  MovimientoListado,
  Pagina,
  TipoMovimiento,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { BuscadorArticulo } from '../articulos/buscador-articulo';
import { hoyEnLima } from '../centros/arbol';
import { CentrosApi } from '../centros/centros.api';
import { DetalleStock, controlesDetalle, detalleDe } from './detalle-stock';
import { TIPOS_MANUALES, TIPOS_MOVIMIENTO, primerDiaDelMes } from './etiquetas';
import { InventarioApi } from './inventario.api';

type Modo = 'lista' | 'movimiento' | 'transferencia' | 'revalorizacion';

@Component({
  selector: 'app-movimientos',
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    KeyValuePipe,
    ErrorApi,
    Paginador,
    BuscadorArticulo,
    DetalleStock,
  ],
  templateUrl: './movimientos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Movimientos implements OnInit {
  private readonly api = inject(InventarioApi);
  private readonly centrosApi = inject(CentrosApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly tipos = TIPOS_MOVIMIENTO;
  protected readonly manuales = TIPOS_MANUALES;
  protected readonly sinOrden = (): number => 0;

  protected readonly almacenes = signal<AlmacenOpcion[]>([]);
  protected readonly destinos = signal<AlmacenOpcion[]>([]);
  protected readonly centros = signal<Centro[]>([]);
  protected readonly pagina = signal<Pagina<MovimientoListado> | null>(null);
  protected readonly detalle = signal<Movimiento | null>(null);
  protected readonly modo = signal<Modo>('lista');
  protected readonly error = signal<Problema | null>(null);
  protected readonly guardando = signal(false);

  protected readonly filtros = this.fb.group({
    almacenId: [''],
    tipo: ['' as TipoMovimiento | ''],
    desde: [primerDiaDelMes(hoyEnLima())],
    hasta: [hoyEnLima()],
  });

  protected readonly formulario = this.fb.group({
    tipo: ['SALDO_INICIAL' as TipoMovimiento, Validators.required],
    almacenId: ['', Validators.required],
    origenId: [''],
    destinoId: [''],
    fecha: [hoyEnLima(), Validators.required],
    glosa: ['', [Validators.required, Validators.maxLength(250)]],
    referencia: ['', Validators.maxLength(100)],
    centroCostoId: [''],
    lineas: this.fb.array([] as ReturnType<Movimientos['nuevaLinea']>[]),
  });

  private readonly tipo = toSignal(this.formulario.controls.tipo.valueChanges, {
    initialValue: this.formulario.controls.tipo.value,
  });
  protected readonly esEntrada = computed(
    () =>
      this.modo() === 'movimiento' &&
      TIPOS_MANUALES.find((t) => t.tipo === this.tipo())?.entrada === true,
  );
  protected readonly esRevalorizacion = computed(() => this.modo() === 'revalorizacion');
  protected readonly esConsumo = computed(() => this.tipo() === 'CONSUMO_INTERNO');
  protected readonly idsEnLineas = signal<string[]>([]);

  ngOnInit(): void {
    void this.iniciar();
  }

  private async iniciar(): Promise<void> {
    try {
      this.almacenes.set(await firstValueFrom(this.api.almacenes()));
      if (this.sesion.tiene(PERMISOS.inventarioTransferir)) {
        this.destinos.set(await firstValueFrom(this.api.destinos()));
      }
      if (this.sesion.tiene(PERMISOS.inventarioMover) && this.sesion.tiene(PERMISOS.centrosLeer)) {
        this.centros.set(
          (await firstValueFrom(this.centrosApi.listar('COSTO'))).filter(
            (c) => c.imputable && c.activo,
          ),
        );
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
    await this.buscar(0);
  }

  private nuevaLinea(a: ArticuloListado) {
    const revalorizacion = this.modo() === 'revalorizacion';
    return this.fb.group({
      articuloId: [a.id],
      codigo: [a.codigo],
      descripcion: [a.descripcion],
      unidad: [a.unidad],
      control: [a.control],
      cantidad: [
        null as number | null,
        revalorizacion ? [] : [Validators.required, Validators.min(0.0001)],
      ],
      costoUnitario: [
        null as number | null,
        revalorizacion ? [Validators.required, Validators.min(0)] : [Validators.min(0)],
      ],
      ...controlesDetalle(this.fb),
    });
  }

  protected async buscar(numero = 0): Promise<void> {
    const f = this.filtros.getRawValue();
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(
          this.api.movimientos({
            almacenId: f.almacenId,
            tipo: f.tipo,
            desde: f.desde,
            hasta: f.hasta,
            pagina: numero,
          }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async ver(id: string): Promise<void> {
    try {
      this.error.set(null);
      this.detalle.set(await firstValueFrom(this.api.movimiento(id)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected abrir(modo: Modo): void {
    this.modo.set(modo);
    this.detalle.set(null);
    this.formulario.reset({
      tipo: 'SALDO_INICIAL',
      almacenId: this.almacenes().length === 1 ? (this.almacenes()[0]?.id ?? '') : '',
      origenId: '',
      destinoId: '',
      fecha: hoyEnLima(),
      glosa: '',
      referencia: '',
      centroCostoId: '',
    });
    this.formulario.controls.lineas.clear();
    this.idsEnLineas.set([]);
  }

  protected agregar(a: ArticuloListado): void {
    this.formulario.controls.lineas.push(this.nuevaLinea(a));
    this.idsEnLineas.update((l) => [...l, a.id]);
  }

  protected quitar(i: number): void {
    this.formulario.controls.lineas.removeAt(i);
    this.idsEnLineas.update((l) => l.filter((_, j) => j !== i));
  }

  private validar(): boolean {
    const v = this.formulario.getRawValue();
    const transferencia = this.modo() === 'transferencia';
    const faltan =
      this.formulario.controls.glosa.invalid ||
      this.formulario.controls.fecha.invalid ||
      this.formulario.controls.lineas.invalid ||
      (transferencia ? !v.origenId || !v.destinoId : !v.almacenId) ||
      (this.modo() === 'movimiento' && this.esConsumo() && !v.centroCostoId);
    if (faltan) {
      this.formulario.markAllAsTouched();
      this.error.set({
        status: 400,
        title: 'Datos incompletos',
        detail: 'Revise los campos marcados.',
      });
      return false;
    }
    if (v.lineas.length === 0) {
      this.error.set({
        status: 400,
        title: 'Sin artículos',
        detail: 'Agregue al menos un artículo.',
      });
      return false;
    }
    return true;
  }

  protected async guardar(): Promise<void> {
    if (!this.validar()) {
      return;
    }
    const v = this.formulario.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    try {
      if (this.modo() === 'revalorizacion') {
        const m = await firstValueFrom(
          this.api.revalorizar({
            almacenId: v.almacenId,
            fecha: v.fecha,
            glosa: v.glosa,
            referencia: v.referencia || null,
            lineas: v.lineas.map((l) => ({
              articuloId: l.articuloId,
              costoUnitario: Number(l.costoUnitario),
            })),
          }),
        );
        this.avisos.exito(`Revalorización ${m.numero} registrada.`);
        this.detalle.set(m);
      } else if (this.modo() === 'transferencia') {
        const r = await firstValueFrom(
          this.api.transferir({
            almacenOrigenId: v.origenId,
            almacenDestinoId: v.destinoId,
            fecha: v.fecha,
            glosa: v.glosa,
            referencia: v.referencia || null,
            lineas: v.lineas.map((l) => ({
              articuloId: l.articuloId,
              cantidad: Number(l.cantidad),
              ...detalleDe(l),
            })),
          }),
        );
        this.avisos.exito(`Transferencia registrada: ${r.salida.numero} y ${r.entrada.numero}.`);
        this.detalle.set(r.salida);
      } else {
        const entrada = this.esEntrada();
        const m = await firstValueFrom(
          this.api.registrar({
            tipo: v.tipo,
            almacenId: v.almacenId,
            fecha: v.fecha,
            glosa: v.glosa,
            referencia: v.referencia || null,
            centroCostoId: this.esConsumo() ? v.centroCostoId : null,
            lineas: v.lineas.map((l) => ({
              articuloId: l.articuloId,
              cantidad: Number(l.cantidad),
              costoUnitario:
                entrada && l.costoUnitario !== null && String(l.costoUnitario) !== ''
                  ? Number(l.costoUnitario)
                  : null,
              ...detalleDe(l),
            })),
          }),
        );
        this.avisos.exito(`Movimiento ${m.numero} registrado.`);
        this.detalle.set(m);
      }
      this.modo.set('lista');
      await this.buscar(0);
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.guardando.set(false);
    }
  }

  protected async anular(m: Movimiento): Promise<void> {
    const aviso =
      m.grupoId && m.tipo.startsWith('TRANSFERENCIA')
        ? 'Se anularán los dos lados de la transferencia. Motivo:'
        : `Motivo de la anulación de ${m.numero} (se registrará un movimiento inverso con fecha de hoy):`;
    const glosa = window.prompt(aviso);
    if (!glosa?.trim()) {
      return;
    }
    try {
      this.error.set(null);
      const anulacion = await firstValueFrom(this.api.anular(m.id, glosa.trim()));
      this.avisos.exito(`Movimiento anulado con ${anulacion.numero}.`);
      this.detalle.set(await firstValueFrom(this.api.movimiento(m.id)));
      await this.buscar(this.pagina()?.pagina ?? 0);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
