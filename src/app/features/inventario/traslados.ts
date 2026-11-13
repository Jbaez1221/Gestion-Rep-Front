import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import {
  AlmacenOpcion,
  ArticuloListado,
  ControlStock,
  EstadoTraslado,
  Pagina,
  Traslado,
  TrasladoListado,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { BuscadorArticulo } from '../articulos/buscador-articulo';
import { hoyEnLima } from '../centros/arbol';
import { DetalleStock, controlesDetalle, detalleDe } from './detalle-stock';
import { ESTADOS_TRASLADO } from './etiquetas';
import { InventarioApi } from './inventario.api';

type Accion = 'enviar' | 'recibir' | null;

@Component({
  selector: 'app-traslados',
  imports: [ReactiveFormsModule, DecimalPipe, ErrorApi, Paginador, BuscadorArticulo, DetalleStock],
  templateUrl: './traslados.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Traslados implements OnInit {
  private readonly api = inject(InventarioApi);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly estados = ESTADOS_TRASLADO;

  protected readonly almacenes = signal<AlmacenOpcion[]>([]);
  protected readonly todos = signal<AlmacenOpcion[]>([]);
  protected readonly pagina = signal<Pagina<TrasladoListado> | null>(null);
  protected readonly traslado = signal<Traslado | null>(null);
  protected readonly creando = signal(false);
  protected readonly accion = signal<Accion>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly idsSolicitud = signal<string[]>([]);

  protected readonly filtros = this.fb.group({
    almacenId: [''],
    estado: ['' as EstadoTraslado | ''],
  });

  protected readonly solicitud = this.fb.group({
    origenId: ['', Validators.required],
    destinoId: ['', Validators.required],
    glosa: ['', [Validators.required, Validators.maxLength(250)]],
    lineas: this.fb.array([] as ReturnType<Traslados['lineaSolicitud']>[]),
  });

  protected readonly paso = this.fb.group({
    fecha: [hoyEnLima(), Validators.required],
    observacion: ['', Validators.maxLength(250)],
    devolverDiferencia: [false],
    lineas: this.fb.array([] as ReturnType<Traslados['lineaPaso']>[]),
  });

  ngOnInit(): void {
    void this.iniciar();
  }

  private async iniciar(): Promise<void> {
    try {
      this.almacenes.set(await firstValueFrom(this.api.almacenes()));
      if (this.sesion.tiene(PERMISOS.inventarioTrasladoSolicitar)) {
        this.todos.set(await firstValueFrom(this.api.destinos()));
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
    await this.buscar(0);
  }

  private lineaSolicitud(a: ArticuloListado) {
    return this.fb.group({
      articuloId: [a.id],
      codigo: [a.codigo],
      descripcion: [a.descripcion],
      cantidad: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    });
  }

  private lineaPaso(
    articuloId: string,
    codigo: string,
    control: ControlStock,
    cantidad: number | null,
  ) {
    return this.fb.group({
      articuloId: [articuloId],
      codigo: [codigo],
      control: [control],
      cantidad: [cantidad, [Validators.required, Validators.min(0)]],
      ...controlesDetalle(this.fb),
    });
  }

  protected async buscar(numero = 0): Promise<void> {
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(this.api.traslados({ ...this.filtros.getRawValue(), pagina: numero })),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected iniciarSolicitud(): void {
    this.creando.set(true);
    this.traslado.set(null);
    this.solicitud.reset({ origenId: '', destinoId: '', glosa: '' });
    this.solicitud.controls.lineas.clear();
    this.idsSolicitud.set([]);
  }

  protected agregar(a: ArticuloListado): void {
    this.solicitud.controls.lineas.push(this.lineaSolicitud(a));
    this.idsSolicitud.update((l) => [...l, a.id]);
  }

  protected quitar(i: number): void {
    this.solicitud.controls.lineas.removeAt(i);
    this.idsSolicitud.update((l) => l.filter((_, j) => j !== i));
  }

  protected async solicitar(): Promise<void> {
    const v = this.solicitud.getRawValue();
    if (this.solicitud.invalid || v.lineas.length === 0) {
      this.solicitud.markAllAsTouched();
      this.error.set({
        status: 400,
        title: 'Datos incompletos',
        detail: 'Elija origen, destino, glosa y al menos un artículo con su cantidad.',
      });
      return;
    }
    try {
      this.error.set(null);
      const t = await firstValueFrom(
        this.api.solicitarTraslado({
          almacenOrigenId: v.origenId,
          almacenDestinoId: v.destinoId,
          glosa: v.glosa,
          lineas: v.lineas.map((l) => ({ articuloId: l.articuloId, cantidad: Number(l.cantidad) })),
        }),
      );
      this.avisos.exito(`Traslado ${t.numero} solicitado.`);
      this.creando.set(false);
      this.mostrar(t);
      await this.buscar(0);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async abrir(id: string): Promise<void> {
    try {
      this.error.set(null);
      this.creando.set(false);
      this.mostrar(await firstValueFrom(this.api.traslado(id)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private mostrar(t: Traslado): void {
    this.traslado.set(t);
    this.accion.set(null);
  }

  protected prepararEnvio(): void {
    const t = this.traslado();
    if (!t) return;
    this.paso.reset({ fecha: hoyEnLima(), observacion: '', devolverDiferencia: false });
    this.paso.controls.lineas.clear();
    t.lineas.forEach((l) =>
      this.paso.controls.lineas.push(
        this.lineaPaso(l.articulo.id, l.articulo.codigo, l.articulo.control, l.cantidadSolicitada),
      ),
    );
    this.accion.set('enviar');
  }

  protected prepararRecepcion(): void {
    const t = this.traslado();
    if (!t) return;
    this.paso.reset({ fecha: hoyEnLima(), observacion: '', devolverDiferencia: false });
    this.paso.controls.lineas.clear();
    t.lineas
      .filter((l) => (l.cantidadEnviada ?? 0) > 0)
      .forEach((l) =>
        this.paso.controls.lineas.push(
          this.lineaPaso(l.articulo.id, l.articulo.codigo, l.articulo.control, l.cantidadEnviada),
        ),
      );
    this.accion.set('recibir');
  }

  protected async confirmar(): Promise<void> {
    const t = this.traslado();
    if (!t || this.paso.invalid) {
      this.paso.markAllAsTouched();
      return;
    }
    const v = this.paso.getRawValue();
    const lineas = v.lineas.map((l) => ({
      articuloId: l.articuloId,
      cantidad: Number(l.cantidad),
      ...detalleDe(l),
    }));
    this.ocupado.set(true);
    try {
      this.error.set(null);
      const r =
        this.accion() === 'enviar'
          ? await firstValueFrom(this.api.enviarTraslado(t.id, { fecha: v.fecha, lineas }))
          : await firstValueFrom(
              this.api.recibirTraslado(t.id, {
                fecha: v.fecha,
                observacion: v.observacion || null,
                devolverDiferencia: v.devolverDiferencia,
                lineas,
              }),
            );
      this.avisos.exito(
        this.accion() === 'enviar'
          ? `Traslado ${r.numero} enviado.`
          : `Traslado ${r.numero} recibido.`,
      );
      this.mostrar(r);
      await this.buscar(0);
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async anular(): Promise<void> {
    const t = this.traslado();
    const aviso =
      t?.estado === 'EN_TRANSITO'
        ? `¿Anular el traslado ${t.numero}? Lo enviado vuelve completo al almacén de origen.`
        : `¿Anular la solicitud ${t?.numero}?`;
    if (!t || !window.confirm(aviso)) {
      return;
    }
    try {
      this.error.set(null);
      this.mostrar(await firstValueFrom(this.api.anularTraslado(t.id)));
      this.avisos.exito(`Traslado ${t.numero} anulado.`);
      await this.buscar(0);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
