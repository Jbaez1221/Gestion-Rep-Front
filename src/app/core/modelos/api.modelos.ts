/** Contratos de la API de Repuestos-Back (/api/v1). */

export interface Pagina<T> {
  readonly contenido: T[];
  readonly pagina: number;
  readonly tamanio: number;
  readonly totalElementos: number;
  readonly totalPaginas: number;
}

export interface SucursalResumen {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
}

export interface Perfil {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly nombres: string;
  readonly apellidos: string;
  readonly rol: string;
  readonly permisos: string[];
  readonly sucursales: SucursalResumen[];
  readonly todasLasSucursales: boolean;
  readonly requiereCambioPassword: boolean;
}

export type TipoDocumento = 'DNI' | 'CARNET_EXTRANJERIA' | 'PASAPORTE';

export interface Usuario {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly nombres: string;
  readonly apellidos: string;
  readonly tipoDocumento: TipoDocumento | null;
  readonly numeroDocumento: string | null;
  readonly rol: { readonly id: string; readonly nombre: string };
  readonly sucursalIds: string[];
  readonly activo: boolean;
  readonly bloqueado: boolean;
  readonly bloqueadoHasta: string | null;
  readonly requiereCambioPassword: boolean;
  readonly ultimoAcceso: string | null;
  readonly creadoPor: string | null;
  readonly fechaCreacion: string | null;
  readonly modificadoPor: string | null;
  readonly fechaModificacion: string | null;
}

export interface UsuarioCreado {
  readonly usuario: Usuario;
  readonly passwordProvisional: string;
}

export interface UsuarioCrear {
  username: string;
  email: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string | null;
  rolId: string;
  sucursalIds: string[];
}

export interface UsuarioActualizar extends Omit<UsuarioCrear, 'username'> {
  activo: boolean;
  bloqueado: boolean;
}

export interface Rol {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly sistema: boolean;
  readonly permisos: string[];
}

export interface Permiso {
  readonly codigo: string;
  readonly descripcion: string;
  readonly modulo: string;
  readonly seguridad: boolean;
}

export type TipoSucursal = 'TIENDA' | 'ALMACEN' | 'OFICINA';

export interface Sucursal {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly tipo: TipoSucursal;
  readonly direccion: string | null;
  readonly ubigeo: string | null;
  readonly telefono: string | null;
  readonly codigoEstablecimientoSunat: string | null;
  readonly activa: boolean;
}

export interface SucursalGuardar {
  codigo?: string;
  nombre: string;
  tipo: TipoSucursal;
  direccion: string | null;
  ubigeo: string | null;
  telefono: string | null;
  codigoEstablecimientoSunat: string | null;
}

export interface Almacen {
  readonly id: string;
  readonly sucursalId: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly principal: boolean;
  readonly activo: boolean;
}

export interface CambioCampo {
  readonly antes: unknown;
  readonly despues: unknown;
}

export interface CambioAuditoria {
  readonly id: string;
  readonly fecha: string;
  readonly transaccionId: string;
  readonly entidad: string;
  readonly entidadId: string;
  readonly operacion: 'CREACION' | 'MODIFICACION' | 'ELIMINACION';
  readonly cambios: Record<string, CambioCampo>;
  readonly usuario: string;
  readonly sucursalId: string | null;
  readonly ip: string | null;
  readonly requestId: string | null;
}

export interface EventoAuditoria {
  readonly id: string;
  readonly fecha: string;
  readonly tipo: string;
  readonly usuario: string;
  readonly detalle: Record<string, unknown>;
  readonly sucursalId: string | null;
  readonly ip: string | null;
  readonly requestId: string | null;
}

export interface DocumentoRef {
  readonly tipo: string;
  readonly id: string;
}

export interface FlujoDocumentos {
  readonly documentos: DocumentoRef[];
  readonly relaciones: {
    readonly origen: DocumentoRef;
    readonly destino: DocumentoRef;
    readonly tipoRelacion: string;
    readonly fecha: string;
    readonly usuario: string;
  }[];
}

// --- Centros de costo y de beneficio ---

export type TipoCentro = 'COSTO' | 'BENEFICIO';
export type FuncionCosto = 'ADMINISTRACION' | 'VENTAS' | 'FINANCIERO' | 'OPERACIONES';
export type TipoImputacion = 'COSTO' | 'INGRESO';
export type Moneda = 'PEN' | 'USD';

export interface FuncionPcge {
  readonly funcion: FuncionCosto;
  readonly cuentaDestino: string;
  readonly descripcion: string;
}

export interface Centro {
  readonly id: string;
  readonly tipo: TipoCentro;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly imputable: boolean;
  readonly padreId: string | null;
  readonly responsable: {
    readonly id: string;
    readonly username: string;
    readonly nombre: string;
  } | null;
  readonly vigenteDesde: string;
  readonly vigenteHasta: string | null;
  readonly activo: boolean;
  readonly funcion: FuncionCosto | null;
  readonly cuentaDestino: string | null;
  readonly centroBeneficioId: string | null;
}

export interface CentroGuardar {
  codigo?: string;
  imputable?: boolean;
  nombre: string;
  descripcion: string | null;
  padreId: string | null;
  responsableId: string | null;
  vigenteDesde: string;
  vigenteHasta: string | null;
  funcion?: FuncionCosto | null;
  cuentaDestino?: string | null;
  centroBeneficioId?: string | null;
}

export interface Periodo {
  readonly anio: number;
  readonly mes: number;
  readonly estado: 'ABIERTO' | 'CERRADO';
  readonly cerradoPor: string | null;
  readonly fechaCierre: string | null;
}

export interface LineaPresupuesto {
  readonly tipoCentro: TipoCentro;
  readonly centroId: string;
  readonly monto: number;
}

export interface Imputacion {
  readonly id: string;
  readonly grupoId: string;
  readonly tipo: TipoImputacion;
  readonly fecha: string;
  readonly centroCostoCodigo: string | null;
  readonly centroBeneficioCodigo: string | null;
  readonly porcentaje: number;
  readonly monto: number;
  readonly moneda: Moneda;
  readonly montoOriginal: number;
  readonly tipoCambio: number;
  readonly naturaleza: string | null;
  readonly glosa: string | null;
  readonly origenTipo: string;
  readonly origenId: string;
  readonly extornoDe: string | null;
  readonly usuario: string;
}

export interface ImputacionNueva {
  tipo: TipoImputacion;
  fecha: string;
  referencia: string | null;
  naturaleza: string | null;
  glosa: string;
  moneda: Moneda;
  montoOriginal: number;
  tipoCambio: number | null;
  lineas: { centroId: string; porcentaje: number }[];
}

export interface FilaCostos {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly nivel: number;
  readonly imputable: boolean;
  readonly funcion: FuncionCosto | null;
  readonly presupuesto: number;
  readonly real: number;
  readonly diferencia: number;
  readonly ejecucion: number | null;
}

export interface FilaResultado {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly nivel: number;
  readonly imputable: boolean;
  readonly presupuestoIngresos: number;
  readonly ingresos: number;
  readonly costos: number;
  readonly resultado: number;
}

export interface EstadoPorFuncion {
  readonly anio: number;
  readonly mesDesde: number;
  readonly mesHasta: number;
  readonly ingresos: number;
  readonly gastos: {
    readonly funcion: FuncionCosto;
    readonly cuentaDestino: string;
    readonly descripcion: string;
    readonly monto: number;
  }[];
  readonly totalGastos: number;
  readonly resultado: number;
}

// --- Artículos ---

export type TipoArticulo = 'INVENTARIABLE' | 'SERVICIO' | 'NO_INVENTARIABLE';
export type OrigenArticulo = 'ORIGINAL' | 'ALTERNATIVO';
export type TipoExistencia =
  | 'MERCADERIAS'
  | 'PRODUCTOS_TERMINADOS'
  | 'MATERIAS_PRIMAS'
  | 'ENVASES'
  | 'MATERIALES_AUXILIARES'
  | 'SUMINISTROS'
  | 'REPUESTOS'
  | 'EMBALAJES'
  | 'OTROS';
export type AfectacionIgv = 'GRAVADO' | 'EXONERADO' | 'INAFECTO';
export type ControlStock = 'NINGUNO' | 'LOTE' | 'SERIE';
export type TipoPropiedad = 'TEXTO' | 'NUMERO' | 'LISTA' | 'SI_NO';

export interface CodigoBarras {
  readonly codigo: string;
  readonly unidadSunat: string | null;
}

export interface Referencia {
  readonly id: string;
  readonly nombre: string;
}

export interface CodigoAlterno {
  readonly codigo: string;
  readonly referencia: string | null;
}

export interface UnidadAlterna {
  readonly unidadSunat: string;
  readonly factor: number;
}

export interface ArticuloBreve {
  readonly id: string;
  readonly codigo: string;
  readonly descripcion: string;
  readonly numeroParte: string | null;
  readonly marca: string | null;
  readonly activo: boolean;
}

export interface ArticuloListado extends ArticuloBreve {
  readonly categoria: string;
  readonly tipo: TipoArticulo;
  readonly control: ControlStock;
  readonly unidad: string;
  readonly bloqueadoCompra: boolean;
  readonly bloqueadoVenta: boolean;
}

export interface Articulo {
  readonly id: string;
  readonly codigo: string;
  readonly descripcion: string;
  readonly descripcionCorta: string | null;
  readonly numeroParte: string | null;
  readonly marca: Referencia | null;
  readonly origen: OrigenArticulo | null;
  readonly categoria: Referencia;
  readonly tipo: TipoArticulo;
  readonly control: ControlStock;
  readonly tipoExistencia: TipoExistencia | null;
  readonly unidadBase: {
    readonly id: string;
    readonly codigoSunat: string;
    readonly nombre: string;
  };
  readonly unidadCompra: string;
  readonly unidadVenta: string;
  readonly afectacionIgv: AfectacionIgv;
  readonly codigoProductoSunat: string | null;
  readonly centroBeneficioId: string | null;
  readonly pesoKg: number | null;
  readonly volumenM3: number | null;
  readonly activo: boolean;
  readonly bloqueadoCompra: boolean;
  readonly bloqueadoVenta: boolean;
  readonly codigosBarras: CodigoBarras[];
  readonly codigosAlternos: CodigoAlterno[];
  readonly unidadesAlternas: UnidadAlterna[];
  readonly propiedades: Record<string, string>;
  readonly equivalentes: ArticuloBreve[];
  readonly imagenPrincipalId: string | null;
  readonly creadoPor: string | null;
  readonly fechaCreacion: string | null;
  readonly modificadoPor: string | null;
  readonly fechaModificacion: string | null;
}

export interface ArticuloActualizar {
  descripcion: string;
  descripcionCorta: string | null;
  numeroParte: string | null;
  marcaId: string | null;
  origen: OrigenArticulo | null;
  categoriaId: string;
  tipoExistencia: TipoExistencia | null;
  unidadCompra: string | null;
  unidadVenta: string | null;
  afectacionIgv: AfectacionIgv;
  codigoProductoSunat: string | null;
  centroBeneficioId: string | null;
  pesoKg: number | null;
  volumenM3: number | null;
  codigosBarras: CodigoBarras[];
  codigosAlternos: CodigoAlterno[];
  unidadesAlternas: UnidadAlterna[];
  propiedades: Record<string, string>;
}

export interface ArticuloCrear extends ArticuloActualizar {
  codigo: string | null;
  tipo: TipoArticulo | null;
  control: ControlStock;
  unidadBaseId: string | null;
}

export interface Adjunto {
  readonly id: string;
  readonly nombre: string;
  readonly tipoContenido: string;
  readonly tamanio: number;
  readonly principal: boolean;
  readonly creadoPor: string | null;
  readonly fechaCreacion: string | null;
}

export interface Propiedad {
  readonly id: string;
  readonly categoriaId: string;
  readonly categoria: string;
  readonly clave: string;
  readonly etiqueta: string;
  readonly tipo: TipoPropiedad;
  readonly opciones: string[];
  readonly obligatoria: boolean;
  readonly orden: number;
  readonly activo: boolean;
}

export interface PropiedadGuardar {
  clave: string;
  etiqueta: string;
  tipo: TipoPropiedad;
  opciones: string[];
  obligatoria: boolean;
  orden: number;
}

export interface ValoresCategoria {
  readonly categoriaId: string;
  readonly prefijo: string | null;
  readonly tipo: TipoArticulo | null;
  readonly tipoExistencia: TipoExistencia | null;
  readonly unidad: {
    readonly id: string;
    readonly codigoSunat: string;
    readonly nombre: string;
  } | null;
  readonly afectacionIgv: AfectacionIgv | null;
  readonly propiedades: Propiedad[];
}

export interface FilaImportacion {
  readonly fila: number;
  readonly codigo: string | null;
  readonly descripcion: string | null;
  readonly estado: 'NUEVO' | 'ACTUALIZADO' | 'ERROR';
  readonly mensajes: string[];
}

export interface ResultadoImportacion {
  readonly aplicado: boolean;
  readonly filas: number;
  readonly nuevos: number;
  readonly actualizados: number;
  readonly errores: number;
  readonly detalle: FilaImportacion[];
}

export interface Marca {
  readonly id: string;
  readonly nombre: string;
  readonly activo: boolean;
}

export interface Categoria {
  readonly id: string;
  readonly nombre: string;
  readonly prefijo: string | null;
  readonly padreId: string | null;
  readonly activo: boolean;
  readonly tipoDefecto: TipoArticulo | null;
  readonly tipoExistenciaDefecto: TipoExistencia | null;
  readonly unidadDefectoId: string | null;
  readonly afectacionIgvDefecto: AfectacionIgv | null;
}

export interface CategoriaGuardar {
  nombre: string;
  prefijo: string | null;
  padreId: string | null;
  tipoDefecto: TipoArticulo | null;
  tipoExistenciaDefecto: TipoExistencia | null;
  unidadDefectoId: string | null;
  afectacionIgvDefecto: AfectacionIgv | null;
}

export interface UnidadMedida {
  readonly id: string;
  readonly codigoSunat: string;
  readonly nombre: string;
  readonly activo: boolean;
}

export interface OpcionSunat {
  readonly valor: string;
  readonly codigo: string;
  readonly descripcion: string;
}

export interface CatalogosSunat {
  readonly tiposExistencia: OpcionSunat[];
  readonly afectacionesIgv: OpcionSunat[];
}

// --- Inventario ---

export type TipoMovimiento =
  | 'SALDO_INICIAL'
  | 'AJUSTE_ENTRADA'
  | 'AJUSTE_SALIDA'
  | 'MERMA'
  | 'DESMEDRO'
  | 'CONSUMO_INTERNO'
  | 'TRANSFERENCIA_SALIDA'
  | 'TRANSFERENCIA_ENTRADA'
  | 'REVALORIZACION';
export type EstadoTraslado = 'SOLICITADO' | 'EN_TRANSITO' | 'RECIBIDO' | 'ANULADO';

export interface LoteMovido {
  codigo: string;
  fechaVencimiento: string | null;
  cantidad: number;
}
export type EstadoConteo = 'ABIERTO' | 'APLICADO' | 'ANULADO';

export interface AlmacenOpcion {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly sucursalId: string;
  readonly sucursalCodigo: string;
  readonly sucursalNombre: string;
}

export interface ArticuloRef {
  readonly id: string;
  readonly codigo: string;
  readonly descripcion: string;
  readonly unidad: string;
  readonly control: ControlStock;
}

export interface AlmacenRef {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly sucursal: string;
}

export interface Existencia {
  readonly id: string;
  readonly articulo: ArticuloRef;
  readonly almacen: AlmacenRef;
  readonly cantidad: number;
  readonly costoPromedio: number;
  readonly valor: number;
  readonly minimo: number | null;
  readonly maximo: number | null;
  readonly puntoReorden: number | null;
  readonly ubicacion: string | null;
  readonly bajoReposicion: boolean;
  readonly sugeridoReponer: number | null;
  readonly fechaUltimoMovimiento: string | null;
}

export interface ParametrosExistencia {
  articuloId: string;
  almacenId: string;
  minimo: number | null;
  maximo: number | null;
  puntoReorden: number | null;
  ubicacion: string | null;
}

export interface Valorizacion {
  readonly fecha: string;
  readonly total: number;
  readonly porAlmacen: {
    readonly almacen: AlmacenRef;
    readonly articulos: number;
    readonly valor: number;
  }[];
  readonly porTipoExistencia: {
    readonly tipoExistencia: string;
    readonly articulos: number;
    readonly valor: number;
  }[];
}

export interface MovimientoListado {
  readonly id: string;
  readonly numero: string;
  readonly tipo: TipoMovimiento;
  readonly codigoSunat: string;
  readonly entrada: boolean;
  readonly fecha: string;
  readonly almacen: AlmacenRef;
  readonly glosa: string;
  readonly referencia: string | null;
  readonly lineas: number;
  readonly total: number;
  readonly anulaA: string | null;
  readonly anulado: boolean;
  readonly usuario: string;
  readonly fechaRegistro: string;
}

export interface LineaMovimiento {
  readonly linea: number;
  readonly articulo: ArticuloRef;
  readonly cantidad: number;
  readonly costoUnitario: number;
  readonly costoTotal: number;
  readonly saldoCantidad: number;
  readonly saldoCostoPromedio: number;
  readonly saldoValor: number;
  readonly lotes: LoteMovido[];
  readonly series: string[];
}

export interface Movimiento {
  readonly id: string;
  readonly numero: string;
  readonly tipo: TipoMovimiento;
  readonly codigoSunat: string;
  readonly entrada: boolean;
  readonly fecha: string;
  readonly almacen: AlmacenRef;
  readonly glosa: string;
  readonly referencia: string | null;
  readonly centroCostoId: string | null;
  readonly imputacionGrupoId: string | null;
  readonly grupoId: string | null;
  readonly anulaA: string | null;
  readonly anuladoPor: string | null;
  readonly usuario: string;
  readonly fechaRegistro: string;
  readonly total: number;
  readonly lineas: LineaMovimiento[];
}

export interface MovimientoNuevo {
  tipo: TipoMovimiento;
  almacenId: string;
  fecha: string;
  glosa: string;
  referencia: string | null;
  centroCostoId: string | null;
  lineas: LineaConDetalle[];
}

export interface LineaConDetalle {
  articuloId: string;
  cantidad: number;
  costoUnitario?: number | null;
  lotes: LoteMovido[];
  series: string[];
}

export interface TransferenciaNueva {
  almacenOrigenId: string;
  almacenDestinoId: string;
  fecha: string;
  glosa: string;
  referencia: string | null;
  lineas: LineaConDetalle[];
}

export interface RevalorizacionNueva {
  almacenId: string;
  fecha: string;
  glosa: string;
  referencia: string | null;
  lineas: { articuloId: string; costoUnitario: number }[];
}

export interface Lote {
  readonly id: string;
  readonly articulo: ArticuloRef;
  readonly almacen: AlmacenRef;
  readonly codigo: string;
  readonly fechaVencimiento: string | null;
  readonly cantidad: number;
  readonly diasParaVencer: number | null;
}

export interface Serie {
  readonly id: string;
  readonly articulo: ArticuloRef;
  readonly numero: string;
  readonly almacen: AlmacenRef | null;
  readonly enStock: boolean;
}

export interface TrazabilidadSerie {
  readonly serie: Serie;
  readonly movimientos: {
    readonly movimientoId: string;
    readonly numero: string;
    readonly tipo: TipoMovimiento;
    readonly entrada: boolean;
    readonly fecha: string;
    readonly almacen: AlmacenRef;
    readonly glosa: string;
  }[];
}

export interface FilaResumen {
  readonly articulo: ArticuloRef;
  readonly saldoInicialCantidad: number;
  readonly saldoInicialValor: number;
  readonly entradasCantidad: number;
  readonly entradasValor: number;
  readonly salidasCantidad: number;
  readonly salidasValor: number;
  readonly saldoFinalCantidad: number;
  readonly saldoFinalValor: number;
}

export interface Resumen {
  readonly almacen: AlmacenRef;
  readonly desde: string;
  readonly hasta: string;
  readonly filas: FilaResumen[];
  readonly saldoInicialValor: number;
  readonly entradasValor: number;
  readonly salidasValor: number;
  readonly saldoFinalValor: number;
}

export interface LineaTraslado {
  readonly articulo: ArticuloRef;
  readonly cantidadSolicitada: number;
  readonly cantidadEnviada: number | null;
  readonly cantidadRecibida: number | null;
  readonly diferencia: number | null;
  readonly costoEnviado: number | null;
  readonly valorDiferencia: number | null;
  readonly lotesEnviados: LoteMovido[];
  readonly seriesEnviadas: string[];
}

export interface TrasladoListado {
  readonly id: string;
  readonly numero: string;
  readonly origen: AlmacenRef;
  readonly destino: AlmacenRef;
  readonly estado: EstadoTraslado;
  readonly glosa: string;
  readonly lineas: number;
  readonly conDiferencias: boolean;
  readonly creadoPor: string | null;
  readonly fechaCreacion: string | null;
  readonly fechaEnvio: string | null;
  readonly fechaRecepcion: string | null;
}

export interface Traslado {
  readonly id: string;
  readonly numero: string;
  readonly origen: AlmacenRef;
  readonly destino: AlmacenRef;
  readonly estado: EstadoTraslado;
  readonly glosa: string;
  readonly lineas: LineaTraslado[];
  readonly conDiferencias: boolean;
  readonly diferenciaDevuelta: boolean;
  readonly valorEnTransito: number;
  readonly valorFaltante: number;
  readonly creadoPor: string | null;
  readonly fechaCreacion: string | null;
  readonly fechaEnvio: string | null;
  readonly enviadoPor: string | null;
  readonly fechaRecepcion: string | null;
  readonly recibidoPor: string | null;
  readonly observacionRecepcion: string | null;
  readonly movimientoSalidaId: string | null;
  readonly movimientoEntradaId: string | null;
  readonly movimientoDevolucionId: string | null;
  readonly puedeEnviar: boolean;
  readonly puedeRecibir: boolean;
}

export interface SolicitudTraslado {
  almacenOrigenId: string;
  almacenDestinoId: string;
  glosa: string;
  lineas: { articuloId: string; cantidad: number }[];
}

export interface EnvioTraslado {
  fecha: string;
  lineas: LineaConDetalle[];
}

export interface RecepcionTraslado {
  fecha: string;
  observacion: string | null;
  devolverDiferencia: boolean;
  lineas: LineaConDetalle[];
}

export interface SaldoKardex {
  readonly cantidad: number;
  readonly costoUnitario: number;
  readonly valor: number;
}

export interface FilaKardex {
  readonly fecha: string;
  readonly numero: string;
  readonly tipo: TipoMovimiento;
  readonly codigoSunat: string;
  readonly referencia: string | null;
  readonly glosa: string;
  readonly anulacion: boolean;
  readonly entradaCantidad: number | null;
  readonly entradaCostoUnitario: number | null;
  readonly entradaTotal: number | null;
  readonly salidaCantidad: number | null;
  readonly salidaCostoUnitario: number | null;
  readonly salidaTotal: number | null;
  readonly saldo: SaldoKardex;
}

export interface Kardex {
  readonly articulo: ArticuloRef;
  readonly tipoExistencia: string | null;
  readonly almacen: AlmacenRef;
  readonly desde: string;
  readonly hasta: string;
  readonly saldoInicial: SaldoKardex;
  readonly filas: FilaKardex[];
  readonly totalEntradasCantidad: number;
  readonly totalEntradasValor: number;
  readonly totalSalidasCantidad: number;
  readonly totalSalidasValor: number;
  readonly saldoFinal: SaldoKardex;
}

export interface ConteoListado {
  readonly id: string;
  readonly numero: string;
  readonly almacen: AlmacenRef;
  readonly fecha: string;
  readonly glosa: string;
  readonly estado: EstadoConteo;
  readonly congelado: boolean;
  readonly lineas: number;
  readonly contadas: number;
  readonly creadoPor: string | null;
  readonly aplicadoPor: string | null;
  readonly fechaAplicacion: string | null;
}

export interface LineaConteo {
  readonly articulo: ArticuloRef;
  readonly cantidadSistema: number;
  readonly cantidadContada: number | null;
  readonly stockActual: number;
  readonly diferencia: number | null;
  readonly costoUnitario: number | null;
}

export interface Conteo {
  readonly id: string;
  readonly numero: string;
  readonly almacen: AlmacenRef;
  readonly fecha: string;
  readonly glosa: string;
  readonly estado: EstadoConteo;
  readonly congelado: boolean;
  readonly lineas: LineaConteo[];
  readonly movimientos: string[];
  readonly creadoPor: string | null;
  readonly fechaCreacion: string | null;
  readonly aplicadoPor: string | null;
  readonly fechaAplicacion: string | null;
}

export interface LineaContada {
  articuloId: string;
  cantidadContada: number | null;
  costoUnitario: number | null;
}
