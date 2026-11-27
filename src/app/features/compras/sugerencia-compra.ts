import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import {
  AlmacenOpcion,
  GrupoSugerido,
  LineaSugerida,
  ProveedorRef,
  SocioListado,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { hoyEnLima } from '../centros/arbol';
import { InventarioApi } from '../inventario/inventario.api';
import { BuscadorProveedor } from './buscador-proveedor';
import { ComprasApi } from './compras.api';

interface LineaEditable {
  readonly l: LineaSugerida;
  incluir: boolean;
  cantidad: number;
  precio: number | null;
}

interface GrupoEditable {
  readonly grupo: GrupoSugerido;
  proveedor: ProveedorRef | null;
  readonly lineas: LineaEditable[];
  orden: { id: string; numero: string } | null;
}

/**
 * Sugerencia de compra del almacén: lo que llegó a su punto de reposición, por proveedor, con la
 * cantidad hasta el máximo. Cada grupo, revisado, se crea como orden de compra en borrador.
 */
@Component({
  selector: 'app-sugerencia-compra',
  imports: [RouterLink, DecimalPipe, DatePipe, ErrorApi, BuscadorProveedor],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label for="sg-almacen" class="etiqueta">Almacén</label>
          <select
            id="sg-almacen"
            class="campo"
            [value]="almacenId()"
            (change)="elegirAlmacen($event)"
          >
            <option value="">Elija…</option>
            @for (a of almacenes(); track a.id) {
              <option [value]="a.id">{{ a.sucursalNombre }} · {{ a.nombre }}</option>
            }
          </select>
        </div>
        <button type="button" class="btn-secundario" (click)="calcular()">Calcular</button>
      </div>
      <p class="text-sm text-slate-600">
        Artículos en su punto de reposición (o mínimo), contando lo ya pedido. Se sugiere llegar al
        máximo en la unidad y al precio (sin IGV) de la última compra; sin máximo, al doble del
        punto de reposición.
      </p>
      <app-error-api [problema]="error()" />

      @for (g of grupos(); track $index; let gi = $index) {
        <section class="tarjeta space-y-3" [attr.aria-label]="'Grupo ' + (gi + 1)">
          <div class="flex flex-wrap items-center justify-between gap-2">
            @if (g.grupo.proveedor; as p) {
              <h2 class="font-semibold">
                {{ p.nombre }}
                <span class="font-mono text-sm text-slate-500">{{ p.documento }}</span> ·
                {{ g.grupo.moneda }}
              </h2>
            } @else {
              <div>
                <h2 class="font-semibold">Sin compras anteriores</h2>
                @if (g.proveedor; as p) {
                  <p class="text-sm">
                    Proveedor: {{ p.nombre }}
                    <button type="button" class="btn-enlace ml-1" (click)="quitarProveedor(gi)">
                      Cambiar
                    </button>
                  </p>
                } @else if (!g.orden) {
                  <app-buscador-proveedor (elegido)="elegirProveedor(gi, $event)" />
                }
              </div>
            }
            @if (g.orden; as o) {
              <a
                [routerLink]="['/compras/orden', o.id]"
                class="font-mono text-marca-700 hover:underline"
                >{{ o.numero }}</a
              >
            }
          </div>
          <div class="overflow-x-auto">
            <table class="tabla">
              <thead>
                <tr>
                  <th scope="col"><span class="sr-only">Incluir</span></th>
                  <th scope="col">Artículo</th>
                  <th scope="col" class="text-right">Proyectado</th>
                  <th scope="col" class="text-right">Reposición / máximo</th>
                  <th scope="col" class="text-right">Cantidad</th>
                  <th scope="col" class="text-right">Precio sin IGV</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (e of g.lineas; track e.l.articuloId; let li = $index) {
                  <tr>
                    <td>
                      <input
                        type="checkbox"
                        [id]="'sg-incluir-' + gi + '-' + li"
                        [checked]="e.incluir"
                        [disabled]="!!g.orden"
                        (change)="e.incluir = marcado($event)"
                        [attr.aria-label]="'Incluir ' + e.l.codigo"
                      />
                    </td>
                    <td>
                      <span class="font-mono">{{ e.l.codigo }}</span> · {{ e.l.descripcion }}
                      @if (e.l.ultimaCompra) {
                        <span class="block text-xs text-slate-500">
                          Última compra: {{ e.l.ultimaCompra | date: 'dd/MM/yyyy' }}
                        </span>
                      }
                      @if (e.l.sinMaximo) {
                        <span class="insignia-alerta">Sin máximo</span>
                      }
                    </td>
                    <td class="text-right">
                      {{ e.l.proyectado | number: '1.0-2' }} {{ e.l.unidadBase }}
                    </td>
                    <td class="text-right">
                      {{ e.l.umbral | number: '1.0-2' }} /
                      {{ e.l.maximo === null ? '—' : (e.l.maximo | number: '1.0-2') }}
                    </td>
                    <td class="text-right">
                      <label [for]="'sg-cant-' + gi + '-' + li" class="sr-only">Cantidad</label>
                      <input
                        [id]="'sg-cant-' + gi + '-' + li"
                        type="number"
                        min="0.0001"
                        class="campo inline w-20 text-right"
                        [value]="e.cantidad"
                        [disabled]="!!g.orden"
                        (input)="e.cantidad = numero($event) ?? 0"
                      />
                      {{ e.l.unidad }}
                    </td>
                    <td class="text-right">
                      <label [for]="'sg-precio-' + gi + '-' + li" class="sr-only">Precio</label>
                      <input
                        [id]="'sg-precio-' + gi + '-' + li"
                        type="number"
                        min="0"
                        step="0.01"
                        class="campo w-24 text-right"
                        [value]="e.precio ?? ''"
                        [disabled]="!!g.orden"
                        (input)="e.precio = numero($event)"
                      />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (!g.orden && sesion.tiene(permisos.comprasOrdenCrear)) {
            <button
              type="button"
              class="btn-primario"
              [disabled]="creando()"
              (click)="crearOrden(gi)"
            >
              Crear orden de compra
            </button>
          }
        </section>
      } @empty {
        @if (calculado()) {
          <p class="tarjeta text-sm text-slate-600">
            No hay artículos por reponer en este almacén.
          </p>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SugerenciaCompraPagina implements OnInit {
  private readonly api = inject(ComprasApi);
  private readonly inventarioApi = inject(InventarioApi);
  private readonly avisos = inject(NotificacionesService);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly almacenes = signal<AlmacenOpcion[]>([]);
  protected readonly almacenId = signal('');
  protected readonly grupos = signal<GrupoEditable[]>([]);
  protected readonly calculado = signal(false);
  protected readonly creando = signal(false);
  protected readonly error = signal<Problema | null>(null);

  ngOnInit(): void {
    void this.cargarAlmacenes();
  }

  private async cargarAlmacenes(): Promise<void> {
    try {
      const almacenes = await firstValueFrom(this.inventarioApi.almacenes());
      this.almacenes.set(almacenes);
      const propio =
        almacenes.length === 1
          ? almacenes[0]
          : almacenes.find((a) => a.sucursalId === this.sesion.sucursalActiva()?.id);
      if (propio) {
        this.almacenId.set(propio.id);
        await this.calcular();
      }
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected elegirAlmacen(evento: Event): void {
    this.almacenId.set((evento.target as HTMLSelectElement).value);
    this.grupos.set([]);
    this.calculado.set(false);
  }

  protected async calcular(): Promise<void> {
    if (!this.almacenId()) return;
    try {
      this.error.set(null);
      const s = await firstValueFrom(this.api.sugerencia(this.almacenId()));
      this.grupos.set(
        s.grupos.map((grupo) => ({
          grupo,
          proveedor: grupo.proveedor,
          orden: null,
          lineas: grupo.lineas.map((l) => ({
            l,
            incluir: true,
            cantidad: l.cantidad,
            precio: l.precioUnitario,
          })),
        })),
      );
      this.calculado.set(true);
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected elegirProveedor(indice: number, s: SocioListado): void {
    this.actualizar(
      indice,
      (g) => (g.proveedor = { id: s.id, documento: s.numeroDocumento, nombre: s.nombre }),
    );
  }

  protected quitarProveedor(indice: number): void {
    this.actualizar(indice, (g) => (g.proveedor = null));
  }

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  protected numero(evento: Event): number | null {
    const v = (evento.target as HTMLInputElement).value;
    return v === '' ? null : Number(v);
  }

  /** La orden queda en borrador para revisarla y aprobarla desde Órdenes de compra. */
  protected async crearOrden(indice: number): Promise<void> {
    const g = this.grupos()[indice];
    const lineas = g.lineas.filter((e) => e.incluir);
    if (!g.proveedor) {
      this.error.set({
        status: 400,
        title: 'Falta el proveedor',
        detail: 'Elija a quién se le compra.',
      });
      return;
    }
    if (
      lineas.length === 0 ||
      lineas.some((e) => !(e.cantidad > 0) || e.precio === null || e.precio < 0)
    ) {
      this.error.set({
        status: 400,
        title: 'Orden incompleta',
        detail: 'Incluya al menos un artículo, cada uno con su cantidad y su precio.',
      });
      return;
    }
    try {
      this.creando.set(true);
      this.error.set(null);
      const o = await firstValueFrom(
        this.api.crearOrden({
          proveedorId: g.proveedor.id,
          almacenId: this.almacenId(),
          fecha: hoyEnLima(),
          fechaEntrega: null,
          moneda: g.grupo.moneda,
          diasCredito: null,
          observacion: 'Generada desde la sugerencia de compra',
          lineas: lineas.map((e) => ({
            articuloId: e.l.articuloId,
            unidad: e.l.unidad,
            cantidad: e.cantidad,
            precioUnitario: e.precio ?? 0,
          })),
        }),
      );
      this.actualizar(indice, (x) => (x.orden = { id: o.id, numero: o.numero }));
      this.avisos.exito(`Orden ${o.numero} creada en borrador.`);
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.creando.set(false);
    }
  }

  private actualizar(indice: number, cambio: (g: GrupoEditable) => void): void {
    this.grupos.update((todos) =>
      todos.map((g, i) => {
        if (i !== indice) return g;
        const copia = { ...g };
        cambio(copia);
        return copia;
      }),
    );
  }
}
