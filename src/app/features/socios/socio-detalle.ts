import { HttpErrorResponse } from '@angular/common/http';
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
import {
  CatalogosSocios,
  DatosSocio,
  MonedaSocio,
  Socio,
  TipoCuentaBancaria,
  TipoDireccion,
  TipoDocumentoIdentidad,
} from '../../core/modelos/api.modelos';
import { NotificacionesService } from '../../core/ui/notificaciones.service';
import { ErrorApi } from '../../shared/ui/error-api';
import { SociosApi } from './socios.api';

/** Resultado de la consulta a SUNAT/RENIEC que se muestra junto al documento. */
interface ResultadoConsulta {
  tipo: 'ok' | 'info';
  mensaje: string;
  advertencias: string[];
}

@Component({
  selector: 'app-socio-detalle',
  imports: [ReactiveFormsModule, RouterLink, ErrorApi],
  templateUrl: './socio-detalle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocioDetalle implements OnInit {
  private readonly api = inject(SociosApi);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly permisos = PERMISOS;

  /** Id de la ruta; ausente al crear. */
  readonly id = input<string>();

  protected readonly socio = signal<Socio | null>(null);
  protected readonly catalogos = signal<CatalogosSocios | null>(null);
  protected readonly consulta = signal<ResultadoConsulta | null>(null);
  protected readonly existente = signal<{ id: string; nombre: string } | null>(null);
  protected readonly error = signal<Problema | null>(null);
  protected readonly ocupado = signal(false);

  protected readonly esNuevo = computed(() => !this.id());
  protected readonly puedeEditar = computed(() =>
    this.sesion.tiene(this.esNuevo() ? PERMISOS.sociosCrear : PERMISOS.sociosEditar),
  );
  protected readonly verDatosPersonales = computed(
    () =>
      this.sesion.tiene(PERMISOS.sociosDatosPersonales) && !this.socio()?.datosPersonalesOcultos,
  );

  protected readonly documento = this.fb.group({
    tipoDocumento: ['RUC' as TipoDocumentoIdentidad, Validators.required],
    numeroDocumento: ['', [Validators.required, Validators.maxLength(15)]],
  });

  protected readonly formulario = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    nombreComercial: ['', Validators.maxLength(150)],
    esCliente: [false],
    esProveedor: [true],
    email: ['', [Validators.email, Validators.maxLength(120)]],
    telefono: ['', Validators.maxLength(30)],
    observaciones: ['', Validators.maxLength(500)],
    diasCreditoProveedor: [0, [Validators.min(0), Validators.max(365)]],
    monedaProveedor: ['PEN' as MonedaSocio],
    plazoEntregaDias: [null as number | null, [Validators.min(0), Validators.max(365)]],
    sujetoDetraccion: [false],
    diasCreditoCliente: [0, [Validators.min(0), Validators.max(365)]],
    limiteCredito: [null as number | null, Validators.min(0)],
    direcciones: this.fb.array([] as ReturnType<SocioDetalle['nuevaDireccion']>[]),
    contactos: this.fb.array([] as ReturnType<SocioDetalle['nuevoContacto']>[]),
    cuentas: this.fb.array([] as ReturnType<SocioDetalle['nuevaCuenta']>[]),
  });

  protected readonly estado = this.fb.group({
    activo: [true],
    bloqueado: [false],
    motivoBloqueo: ['', Validators.maxLength(250)],
  });

  ngOnInit(): void {
    void this.cargarCatalogos();
    const id = this.id();
    if (id) {
      void this.cargar(id);
    } else {
      this.formulario.controls.direcciones.push(this.nuevaDireccion('FISCAL'));
    }
    if (!this.puedeEditar()) {
      this.formulario.disable();
    }
    if (!this.sesion.tiene(PERMISOS.sociosBloquear)) {
      this.estado.disable();
    }
  }

  private nuevaDireccion(
    tipo: TipoDireccion = 'ENTREGA',
    direccion = '',
    ubigeo = '',
    referencia = '',
  ) {
    return this.fb.group({
      tipo: [tipo],
      direccion: [direccion, [Validators.required, Validators.maxLength(250)]],
      ubigeo: [ubigeo, Validators.pattern(/^\d{6}$/)],
      referencia: [referencia, Validators.maxLength(150)],
    });
  }

  private nuevoContacto(
    c?: Partial<{
      nombre: string;
      cargo: string | null;
      area: string | null;
      email: string | null;
      telefono: string | null;
    }>,
  ) {
    return this.fb.group({
      nombre: [c?.nombre ?? '', [Validators.required, Validators.maxLength(120)]],
      cargo: [c?.cargo ?? '', Validators.maxLength(80)],
      area: [c?.area ?? '', Validators.maxLength(60)],
      email: [c?.email ?? '', [Validators.email, Validators.maxLength(120)]],
      telefono: [c?.telefono ?? '', Validators.maxLength(30)],
    });
  }

  private nuevaCuenta(
    c?: Partial<{
      banco: string;
      tipo: TipoCuentaBancaria;
      moneda: MonedaSocio;
      numero: string;
      cci: string | null;
    }>,
  ) {
    return this.fb.group({
      banco: [c?.banco ?? '', Validators.required],
      tipo: [c?.tipo ?? ('CORRIENTE' as TipoCuentaBancaria)],
      moneda: [c?.moneda ?? ('PEN' as MonedaSocio)],
      numero: [c?.numero ?? '', [Validators.required, Validators.pattern(/^[0-9-]{6,30}$/)]],
      cci: [c?.cci ?? '', Validators.pattern(/^\d{20}$/)],
    });
  }

  protected agregarDireccion(): void {
    this.formulario.controls.direcciones.push(this.nuevaDireccion());
  }

  protected agregarContacto(): void {
    this.formulario.controls.contactos.push(this.nuevoContacto());
  }

  protected agregarCuenta(): void {
    this.formulario.controls.cuentas.push(this.nuevaCuenta());
  }

  /** Una cuenta de detracciones siempre es del Banco de la Nación: se completa sola. */
  protected cambiarTipoCuenta(i: number): void {
    const cuenta = this.formulario.controls.cuentas.at(i);
    if (cuenta.controls.tipo.value === 'DETRACCIONES') {
      cuenta.controls.banco.setValue('BANCO DE LA NACION');
    }
  }

  private async cargarCatalogos(): Promise<void> {
    try {
      this.catalogos.set(await firstValueFrom(this.api.catalogos()));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private async cargar(id: string): Promise<void> {
    try {
      this.mostrar(await firstValueFrom(this.api.obtener(id)));
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  private mostrar(s: Socio): void {
    this.socio.set(s);
    this.documento.setValue({ tipoDocumento: s.tipoDocumento, numeroDocumento: s.numeroDocumento });
    this.documento.disable();
    this.formulario.patchValue({
      nombre: s.nombre,
      nombreComercial: s.nombreComercial ?? '',
      esCliente: s.esCliente,
      esProveedor: s.esProveedor,
      email: s.email ?? '',
      telefono: s.telefono ?? '',
      observaciones: s.observaciones ?? '',
      diasCreditoProveedor: s.diasCreditoProveedor,
      monedaProveedor: s.monedaProveedor,
      plazoEntregaDias: s.plazoEntregaDias,
      sujetoDetraccion: s.sujetoDetraccion,
      diasCreditoCliente: s.diasCreditoCliente,
      limiteCredito: s.limiteCredito,
    });
    const f = this.formulario.controls;
    f.direcciones.clear();
    s.direcciones.forEach((d) =>
      f.direcciones.push(
        this.nuevaDireccion(d.tipo, d.direccion, d.ubigeo ?? '', d.referencia ?? ''),
      ),
    );
    f.contactos.clear();
    s.contactos.forEach((c) => f.contactos.push(this.nuevoContacto(c)));
    f.cuentas.clear();
    s.cuentas.forEach((c) => f.cuentas.push(this.nuevaCuenta(c)));
    if (!this.puedeEditar()) {
      this.formulario.disable();
    }
    this.estado.setValue({
      activo: s.activo,
      bloqueado: s.bloqueado,
      motivoBloqueo: s.motivoBloqueo ?? '',
    });
  }

  /**
   * Antes de consultar fuera, revisa si ya está registrado (no gasta una consulta ni duplica). Con
   * RUC trae razón social y domicilio fiscal; con DNI, el nombre.
   */
  protected async consultar(): Promise<void> {
    const { tipoDocumento, numeroDocumento } = this.documento.getRawValue();
    const numero = numeroDocumento.trim().toUpperCase();
    if (!numero) {
      this.documento.markAllAsTouched();
      return;
    }
    this.ocupado.set(true);
    this.error.set(null);
    this.consulta.set(null);
    this.existente.set(null);
    try {
      try {
        const ya = await firstValueFrom(this.api.porDocumento(tipoDocumento, numero));
        this.existente.set({ id: ya.id, nombre: ya.nombre });
        return;
      } catch (e) {
        if (!(e instanceof HttpErrorResponse && e.status === 404)) {
          throw e;
        }
      }
      if (tipoDocumento === 'RUC') {
        const r = await firstValueFrom(this.api.consultarRuc(numero));
        if (r.estadoConsulta === 'ENCONTRADO') {
          this.formulario.patchValue({
            nombre: r.razonSocial ?? '',
            nombreComercial: r.nombreComercial ?? '',
          });
          this.ponerFiscal(r.direccion, r.ubigeo);
          this.consulta.set({
            tipo: 'ok',
            mensaje: `Datos de SUNAT: ${r.estado ?? '—'} · ${r.condicion ?? '—'}`,
            advertencias: r.advertencias,
          });
        } else {
          this.consulta.set({
            tipo: 'info',
            mensaje: r.mensaje ?? 'Ingrese los datos manualmente.',
            advertencias: [],
          });
        }
      } else if (tipoDocumento === 'DNI') {
        const r = await firstValueFrom(this.api.consultarDni(numero));
        if (r.estadoConsulta === 'ENCONTRADO') {
          this.formulario.controls.nombre.setValue(r.nombreCompleto ?? '');
          this.consulta.set({ tipo: 'ok', mensaje: 'Nombre obtenido del DNI.', advertencias: [] });
        } else {
          this.consulta.set({
            tipo: 'info',
            mensaje: r.mensaje ?? 'Ingrese los datos manualmente.',
            advertencias: [],
          });
        }
      } else {
        this.consulta.set({
          tipo: 'info',
          mensaje: 'Este documento no se consulta: ingrese los datos.',
          advertencias: [],
        });
      }
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  private ponerFiscal(direccion: string | null, ubigeo: string | null): void {
    if (!direccion) {
      return;
    }
    const direcciones = this.formulario.controls.direcciones;
    const fiscal = direcciones.controls.find((d) => d.controls.tipo.value === 'FISCAL');
    if (fiscal) {
      fiscal.patchValue({ direccion, ubigeo: ubigeo ?? '' });
    } else {
      direcciones.insert(0, this.nuevaDireccion('FISCAL', direccion, ubigeo ?? ''));
    }
  }

  protected async guardar(): Promise<void> {
    if (this.formulario.invalid || (this.esNuevo() && this.documento.invalid)) {
      this.formulario.markAllAsTouched();
      this.documento.markAllAsTouched();
      return;
    }
    const v = this.formulario.getRawValue();
    const datos: DatosSocio = {
      nombre: v.nombre,
      nombreComercial: v.nombreComercial || null,
      esCliente: v.esCliente,
      esProveedor: v.esProveedor,
      email: v.email || null,
      telefono: v.telefono || null,
      observaciones: v.observaciones || null,
      diasCreditoProveedor: Number(v.diasCreditoProveedor) || 0,
      monedaProveedor: v.monedaProveedor,
      plazoEntregaDias:
        v.plazoEntregaDias === null || String(v.plazoEntregaDias) === ''
          ? null
          : Number(v.plazoEntregaDias),
      sujetoDetraccion: v.sujetoDetraccion,
      diasCreditoCliente: Number(v.diasCreditoCliente) || 0,
      limiteCredito:
        v.limiteCredito === null || String(v.limiteCredito) === '' ? null : Number(v.limiteCredito),
      direcciones: v.direcciones.map((d) => ({
        tipo: d.tipo,
        direccion: d.direccion,
        ubigeo: d.ubigeo || null,
        referencia: d.referencia || null,
      })),
      contactos: v.contactos.map((c) => ({
        nombre: c.nombre,
        cargo: c.cargo || null,
        area: c.area || null,
        email: c.email || null,
        telefono: c.telefono || null,
      })),
      cuentas: v.cuentas.map((c) => ({
        banco: c.banco,
        tipo: c.tipo,
        moneda: c.moneda,
        numero: c.numero,
        cci: c.cci || null,
      })),
    };
    this.ocupado.set(true);
    this.error.set(null);
    try {
      const id = this.id();
      if (id) {
        this.mostrar(await firstValueFrom(this.api.actualizar(id, datos)));
        this.avisos.exito('Socio actualizado.');
      } else {
        const d = this.documento.getRawValue();
        const creado = await firstValueFrom(
          this.api.crear(d.tipoDocumento, d.numeroDocumento.trim().toUpperCase(), datos),
        );
        this.avisos.exito(`${creado.nombre} registrado.`);
        await this.router.navigate(['/socios', creado.id]);
      }
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async guardarEstado(): Promise<void> {
    const id = this.id();
    if (!id) return;
    const v = this.estado.getRawValue();
    try {
      this.error.set(null);
      this.mostrar(
        await firstValueFrom(
          this.api.cambiarEstado(id, {
            activo: v.activo,
            bloqueado: v.bloqueado,
            motivoBloqueo: v.motivoBloqueo || null,
          }),
        ),
      );
      this.avisos.exito('Estado actualizado.');
    } catch (e) {
      this.error.set(aProblema(e));
    }
  }

  protected async actualizarSunat(): Promise<void> {
    const id = this.id();
    if (!id) return;
    this.ocupado.set(true);
    try {
      this.error.set(null);
      this.mostrar(await firstValueFrom(this.api.actualizarSunat(id)));
      this.avisos.exito('Datos de SUNAT actualizados.');
    } catch (e) {
      this.error.set(aProblema(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  protected indicador(valor: boolean | null): string {
    return valor === null ? 'No informado' : valor ? 'Sí' : 'No';
  }
}
