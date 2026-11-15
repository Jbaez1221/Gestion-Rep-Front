import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PERMISOS } from '../../core/auth/permisos';
import { SesionService } from '../../core/auth/sesion.service';
import { Problema, aProblema } from '../../core/http/problema';
import { Pagina, SocioListado } from '../../core/modelos/api.modelos';
import { ErrorApi } from '../../shared/ui/error-api';
import { Paginador } from '../../shared/ui/paginador';
import { SociosApi } from './socios.api';

export const SIGLAS_DOCUMENTO: Record<string, string> = {
  SIN_DOCUMENTO: '—',
  DNI: 'DNI',
  CARNET_EXTRANJERIA: 'CE',
  RUC: 'RUC',
  PASAPORTE: 'PAS',
};

@Component({
  selector: 'app-socios-lista',
  imports: [ReactiveFormsModule, RouterLink, ErrorApi, Paginador],
  template: `
    <section class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="titulo-pagina">Socios comerciales</h1>
          <p class="mt-1 text-sm text-slate-600">Clientes y proveedores, con sus datos de SUNAT.</p>
        </div>
        @if (sesion.tiene(permisos.sociosCrear)) {
          <a routerLink="nuevo" class="btn-primario">Nuevo socio</a>
        }
      </div>
      <form [formGroup]="filtros" (ngSubmit)="buscar(0)" class="flex flex-wrap items-end gap-3">
        <div class="min-w-64">
          <label for="s-texto" class="etiqueta">Buscar</label>
          <input
            id="s-texto"
            type="search"
            class="campo"
            formControlName="texto"
            placeholder="Nombre o número de documento"
          />
        </div>
        <div>
          <label for="s-rol" class="etiqueta">Tipo</label>
          <select id="s-rol" class="campo" formControlName="rol">
            <option value="">Todos</option>
            <option value="PROVEEDOR">Proveedores</option>
            <option value="CLIENTE">Clientes</option>
          </select>
        </div>
        <div>
          <label for="s-estado" class="etiqueta">Estado</label>
          <select id="s-estado" class="campo" formControlName="estado">
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <button type="submit" class="btn-secundario">Buscar</button>
      </form>

      <app-error-api [problema]="error()" />

      <div class="tarjeta overflow-x-auto p-0 sm:p-0">
        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Documento</th>
              <th scope="col">Nombre</th>
              <th scope="col">Tipo</th>
              <th scope="col">SUNAT</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (s of pagina()?.contenido ?? []; track s.id) {
              <tr>
                <td class="whitespace-nowrap font-mono">
                  <a [routerLink]="s.id" class="text-marca-700 hover:underline">
                    {{ siglas[s.tipoDocumento] }} {{ s.numeroDocumento }}
                  </a>
                </td>
                <td>
                  {{ s.nombre }}
                  @if (s.nombreComercial) {
                    <span class="block text-xs text-slate-500">{{ s.nombreComercial }}</span>
                  }
                </td>
                <td class="space-x-1 whitespace-nowrap">
                  @if (s.esProveedor) {
                    <span class="insignia-neutra">Proveedor</span>
                  }
                  @if (s.esCliente) {
                    <span class="insignia-neutra">Cliente</span>
                  }
                </td>
                <td>
                  @if (s.condicionSunat) {
                    <span
                      [class]="s.condicionSunat === 'HABIDO' ? 'insignia-ok' : 'insignia-alerta'"
                      >{{ s.condicionSunat }}</span
                    >
                  } @else {
                    —
                  }
                </td>
                <td>
                  @if (s.bloqueado) {
                    <span class="insignia-alerta">Bloqueado</span>
                  } @else {
                    <span [class]="s.activo ? 'insignia-ok' : 'insignia-neutra'">{{
                      s.activo ? 'Activo' : 'Inactivo'
                    }}</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="py-6 text-center text-slate-500">
                  No hay socios con esos filtros.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-paginador [pagina]="pagina()" (cambiar)="buscar($event)" />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SociosLista implements OnInit {
  private readonly api = inject(SociosApi);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;
  protected readonly siglas = SIGLAS_DOCUMENTO;

  protected readonly pagina = signal<Pagina<SocioListado> | null>(null);
  protected readonly error = signal<Problema | null>(null);

  protected readonly filtros = this.fb.group({
    texto: [''],
    rol: ['' as 'CLIENTE' | 'PROVEEDOR' | ''],
    estado: ['activos' as 'activos' | 'inactivos' | 'todos'],
  });

  ngOnInit(): void {
    void this.buscar(0);
  }

  protected async buscar(numero = 0): Promise<void> {
    const f = this.filtros.getRawValue();
    try {
      this.error.set(null);
      this.pagina.set(
        await firstValueFrom(
          this.api.listar({
            texto: f.texto,
            rol: f.rol,
            activo: f.estado === 'todos' ? null : f.estado === 'activos',
            pagina: numero,
          }),
        ),
      );
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }
}
