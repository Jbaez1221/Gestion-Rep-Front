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
  readonly avisos: string[];
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
  /** Sin marcaId: la marca con ese nombre, o una nueva. */
  marcaNombre?: string | null;
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
  readonly codigoProductoSunat: string | null;
  readonly control: ControlStock | null;
  readonly centroBeneficioId: string | null;
  readonly propiedades: Propiedad[];
}

/** Artículo con el mismo N.° de parte: posible duplicado (misma marca) o equivalente. */
export interface CoincidenciaParte {
  readonly id: string;
  readonly codigo: string;
  readonly descripcion: string;
  readonly numeroParte: string | null;
  readonly marca: { readonly id: string; readonly nombre: string } | null;
  readonly mismaMarca: boolean;
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
  readonly codigoProductoSunatDefecto: string | null;
  readonly controlDefecto: ControlStock | null;
  readonly centroBeneficioDefectoId: string | null;
}

export interface CategoriaGuardar {
  nombre: string;
  prefijo: string | null;
  padreId: string | null;
  tipoDefecto: TipoArticulo | null;
  tipoExistenciaDefecto: TipoExistencia | null;
  unidadDefectoId: string | null;
  afectacionIgvDefecto: AfectacionIgv | null;
  codigoProductoSunatDefecto: string | null;
  controlDefecto: ControlStock | null;
  centroBeneficioDefectoId: string | null;
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
  | 'REVALORIZACION'
  | 'COMPRA'
  | 'DEVOLUCION_PROVEEDOR'
  | 'AJUSTE_COSTO_COMPRA';
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
  readonly cantidadPedida: number;
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
  /** Guía de remisión que sustenta el traslado entre sucursales. */
  readonly guiaId: string | null;
  readonly guia: string | null;
  /** Entre sucursales: el envío va con guía de remisión. */
  readonly requiereGuia: boolean;
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
  guia?: DatosGuia & { fechaTraslado?: string | null };
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

// --- Socios comerciales ---

export type TipoDocumentoIdentidad =
  'SIN_DOCUMENTO' | 'DNI' | 'CARNET_EXTRANJERIA' | 'RUC' | 'PASAPORTE';
export type TipoDireccion = 'FISCAL' | 'ENTREGA' | 'ALMACEN' | 'OTRA';
export type TipoCuentaBancaria = 'CORRIENTE' | 'AHORROS' | 'DETRACCIONES';
export type MonedaSocio = 'PEN' | 'USD';
export type EstadoConsulta = 'ENCONTRADO' | 'NO_ENCONTRADO' | 'SIN_SERVICIO' | 'DESACTIVADA';

export interface DireccionSocio {
  tipo: TipoDireccion;
  direccion: string;
  ubigeo: string | null;
  referencia: string | null;
}

export interface ContactoSocio {
  nombre: string;
  cargo: string | null;
  area: string | null;
  email: string | null;
  telefono: string | null;
}

export interface CuentaSocio {
  banco: string;
  tipo: TipoCuentaBancaria;
  moneda: MonedaSocio;
  numero: string;
  cci: string | null;
}

export interface DatosSocio {
  nombre: string;
  nombreComercial: string | null;
  esCliente: boolean;
  esProveedor: boolean;
  email: string | null;
  telefono: string | null;
  observaciones: string | null;
  diasCreditoProveedor: number;
  monedaProveedor: MonedaSocio;
  plazoEntregaDias: number | null;
  sujetoDetraccion: boolean;
  diasCreditoCliente: number;
  limiteCredito: number | null;
  direcciones: DireccionSocio[];
  contactos: ContactoSocio[];
  cuentas: CuentaSocio[];
}

export interface SocioListado {
  readonly id: string;
  readonly tipoDocumento: TipoDocumentoIdentidad;
  readonly numeroDocumento: string;
  readonly nombre: string;
  readonly nombreComercial: string | null;
  readonly esCliente: boolean;
  readonly esProveedor: boolean;
  readonly condicionSunat: string | null;
  readonly activo: boolean;
  readonly bloqueado: boolean;
}

export interface Socio extends DatosSocio {
  readonly id: string;
  readonly tipoDocumento: TipoDocumentoIdentidad;
  readonly numeroDocumento: string;
  readonly tipoPersona: 'NATURAL' | 'JURIDICA';
  readonly activo: boolean;
  readonly bloqueado: boolean;
  readonly motivoBloqueo: string | null;
  readonly estadoSunat: string | null;
  readonly condicionSunat: string | null;
  readonly agenteRetencion: boolean | null;
  readonly agentePercepcion: boolean | null;
  readonly buenContribuyente: boolean | null;
  readonly fechaConsultaSunat: string | null;
  readonly datosPersonalesOcultos: boolean;
  readonly avisos: string[];
  readonly creadoPor: string | null;
  readonly fechaCreacion: string | null;
  readonly modificadoPor: string | null;
  readonly fechaModificacion: string | null;
}

export interface CatalogosSocios {
  readonly tiposDocumento: {
    readonly valor: TipoDocumentoIdentidad;
    readonly codigo: string;
    readonly descripcion: string;
  }[];
  readonly bancos: string[];
}

export interface ConsultaRuc {
  readonly ruc: string;
  readonly tipoPersona: 'NATURAL' | 'JURIDICA';
  readonly dniVinculado: string | null;
  readonly estadoConsulta: EstadoConsulta;
  readonly mensaje: string | null;
  readonly razonSocial: string | null;
  readonly nombreComercial: string | null;
  readonly estado: string | null;
  readonly condicion: string | null;
  readonly direccion: string | null;
  readonly ubigeo: string | null;
  readonly departamento: string | null;
  readonly provincia: string | null;
  readonly distrito: string | null;
  readonly advertencias: string[];
}

export interface ConsultaDni {
  readonly dni: string;
  readonly estadoConsulta: EstadoConsulta;
  readonly mensaje: string | null;
  readonly nombreCompleto: string | null;
}

// --- Compras ---

export type AfectacionCompra = 'GRAVADO' | 'EXONERADO' | 'INAFECTO';
export type TipoComprobante = 'FACTURA' | 'BOLETA' | 'NOTA_CREDITO' | 'NOTA_DEBITO';
export type EstadoCompra = 'REGISTRADA' | 'ANULADA';
export type EstadoOrden = 'BORRADOR' | 'EMITIDA' | 'PARCIAL' | 'RECIBIDA' | 'CERRADA' | 'ANULADA';
export type TipoLineaCompra = 'INVENTARIO' | 'GASTO' | 'COSTO' | 'AJUSTE';
export type EstadoRecepcion = 'PENDIENTE' | 'FACTURADA' | 'ANULADA';

export interface RecepcionBreve {
  readonly id: string;
  readonly numero: string;
  readonly guia: string | null;
  readonly fecha: string;
  readonly totalSoles: number;
  readonly estado: EstadoRecepcion;
}

export interface LineaRecepcion {
  readonly linea: number;
  readonly articuloId: string;
  readonly articuloCodigo: string;
  readonly descripcion: string;
  readonly unidad: string;
  readonly factor: number;
  readonly cantidad: number;
  readonly costoUnitario: number;
  readonly costoSoles: number;
  readonly ordenLinea: number | null;
}

export interface Recepcion {
  readonly id: string;
  readonly numero: string;
  readonly proveedor: ProveedorRef;
  readonly almacen: AlmacenCompraRef | null;
  readonly sucursalId: string;
  readonly orden: ReferenciaDocumento | null;
  readonly guia: string | null;
  readonly fecha: string;
  readonly moneda: Moneda;
  readonly tipoCambio: number;
  readonly glosa: string | null;
  readonly totalSoles: number;
  readonly estado: EstadoRecepcion;
  readonly compra: ReferenciaDocumento | null;
  readonly movimientoId: string | null;
  readonly lineas: LineaRecepcion[];
  readonly anuladoPor: string | null;
  readonly fechaAnulacion: string | null;
  readonly motivoAnulacion: string | null;
  readonly creadoPor: string | null;
  readonly fechaCreacion: string | null;
}

export interface RecepcionListado {
  readonly id: string;
  readonly numero: string;
  readonly proveedor: ProveedorRef;
  readonly almacen: AlmacenCompraRef | null;
  readonly guia: string | null;
  readonly fecha: string;
  readonly totalSoles: number;
  readonly estado: EstadoRecepcion;
}

export interface RecepcionGuardar {
  proveedorId: string;
  almacenId: string | null;
  ordenId: string | null;
  guiaSerie: string | null;
  guiaNumero: string | null;
  fecha: string;
  moneda: Moneda;
  tipoCambio: number | null;
  glosa: string | null;
  lineas: {
    articuloId: string;
    unidad: string | null;
    cantidad: number;
    costoUnitario: number | null;
    ordenLinea: number | null;
    lotes: LoteMovido[];
    series: string[];
  }[];
}

export interface ProveedorRef {
  readonly id: string;
  readonly documento: string;
  readonly nombre: string;
}

export interface AlmacenCompraRef {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly sucursal: string;
}

export interface ReferenciaDocumento {
  readonly id: string;
  readonly numero: string;
}

export interface TipoCambio {
  readonly fecha: string;
  readonly compra: number;
  readonly venta: number;
  readonly modificadoPor: string | null;
}

export interface LineaOrden {
  readonly linea: number;
  readonly articuloId: string;
  readonly articuloCodigo: string;
  readonly descripcion: string;
  readonly unidad: string;
  readonly factor: number;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly afectacion: AfectacionCompra;
  readonly cantidadRecibida: number;
  readonly pendiente: number;
}

export interface CompraBreve {
  readonly id: string;
  readonly numero: string;
  readonly tipoComprobante: TipoComprobante;
  readonly comprobante: string;
  readonly fechaEmision: string;
  readonly total: number;
  readonly estado: EstadoCompra;
}

export interface OrdenCompra {
  readonly id: string;
  readonly numero: string;
  readonly proveedor: ProveedorRef;
  readonly almacen: AlmacenCompraRef | null;
  readonly sucursalId: string;
  readonly fecha: string;
  readonly fechaEntrega: string | null;
  readonly moneda: Moneda;
  readonly diasCredito: number;
  readonly observacion: string | null;
  readonly estado: EstadoOrden;
  readonly subtotal: number;
  readonly igv: number;
  readonly total: number;
  readonly aprobadoPor: string | null;
  readonly fechaAprobacion: string | null;
  readonly motivoCierre: string | null;
  readonly lineas: LineaOrden[];
  readonly compras: CompraBreve[];
  readonly recepciones: RecepcionBreve[];
  readonly creadoPor: string | null;
  readonly fechaCreacion: string | null;
}

export interface OrdenListado {
  readonly id: string;
  readonly numero: string;
  readonly proveedor: ProveedorRef;
  readonly almacen: AlmacenCompraRef | null;
  readonly fecha: string;
  readonly fechaEntrega: string | null;
  readonly moneda: Moneda;
  readonly total: number;
  readonly estado: EstadoOrden;
}

export interface OrdenGuardar {
  proveedorId: string;
  almacenId: string;
  fecha: string;
  fechaEntrega: string | null;
  moneda: Moneda;
  diasCredito: number | null;
  observacion: string | null;
  lineas: { articuloId: string; unidad: string | null; cantidad: number; precioUnitario: number }[];
}

export interface LineaCompraGuardar {
  articuloId: string | null;
  descripcion: string | null;
  unidad: string | null;
  cantidad: number;
  precio: number;
  afectacion: AfectacionCompra | null;
  centroCostoId: string | null;
  naturaleza: string | null;
  ordenLinea: number | null;
  lotes: LoteMovido[];
  series: string[];
  sumaAlCosto: boolean;
}

export interface CompraGuardar {
  proveedorId: string;
  tipoComprobante: TipoComprobante;
  serie: string;
  numero: string;
  fechaEmision: string;
  fechaVencimiento: string | null;
  fechaContable: string | null;
  moneda: Moneda;
  tipoCambio: number | null;
  preciosIncluyenIgv: boolean;
  almacenId: string | null;
  ordenId: string | null;
  referenciaId: string | null;
  motivoNota: string | null;
  glosa: string | null;
  detraccionCodigo: string | null;
  totalDocumento: number | null;
  lineas: LineaCompraGuardar[];
  recepcionIds: string[];
}

export interface LineaCompra {
  readonly linea: number;
  readonly tipo: TipoLineaCompra;
  readonly articuloId: string | null;
  readonly articuloCodigo: string | null;
  readonly descripcion: string;
  readonly unidad: string;
  readonly factor: number;
  readonly cantidad: number;
  readonly valorUnitario: number;
  readonly afectacion: AfectacionCompra;
  readonly valorVenta: number;
  readonly igv: number;
  readonly total: number;
  readonly costoSoles: number;
  readonly costoAdicional: number;
  readonly centroCostoId: string | null;
  readonly naturaleza: string | null;
  readonly ordenLinea: number | null;
}

export interface Compra {
  readonly id: string;
  readonly numero: string;
  readonly proveedor: ProveedorRef;
  readonly tipoComprobante: TipoComprobante;
  readonly comprobante: string;
  readonly fechaEmision: string;
  readonly fechaVencimiento: string | null;
  readonly fechaContable: string;
  readonly moneda: Moneda;
  readonly tipoCambio: number;
  readonly preciosIncluyenIgv: boolean;
  readonly sucursalId: string;
  readonly almacen: AlmacenCompraRef | null;
  readonly orden: ReferenciaDocumento | null;
  readonly referencia: ReferenciaDocumento | null;
  readonly motivoNota: {
    readonly valor: string;
    readonly codigo: string;
    readonly descripcion: string;
  } | null;
  readonly glosa: string | null;
  readonly gravado: number;
  readonly exonerado: number;
  readonly inafecto: number;
  readonly igv: number;
  readonly total: number;
  readonly totalSoles: number;
  readonly creditoFiscal: boolean;
  readonly detraccion: {
    readonly codigo: string;
    readonly descripcion: string | null;
    readonly porcentaje: number;
    readonly monto: number;
  } | null;
  readonly estado: EstadoCompra;
  readonly movimientoId: string | null;
  readonly ajusteMovimientoId: string | null;
  readonly diferenciaNoAplicada: number;
  readonly lineas: LineaCompra[];
  readonly notas: CompraBreve[];
  readonly recepciones: RecepcionBreve[];
  readonly avisos: string[];
  readonly anuladoPor: string | null;
  readonly fechaAnulacion: string | null;
  readonly motivoAnulacion: string | null;
  readonly creadoPor: string | null;
  readonly fechaCreacion: string | null;
}

export interface CompraListado {
  readonly id: string;
  readonly numero: string;
  readonly proveedor: ProveedorRef;
  readonly tipoComprobante: TipoComprobante;
  readonly comprobante: string;
  readonly fechaEmision: string;
  readonly fechaContable: string;
  readonly moneda: Moneda;
  readonly total: number;
  readonly totalSoles: number;
  readonly creditoFiscal: boolean;
  readonly estado: EstadoCompra;
}

export interface CatalogosCompras {
  readonly tiposComprobante: {
    readonly valor: TipoComprobante;
    readonly codigo: string;
    readonly descripcion: string;
  }[];
  readonly motivosNota: {
    readonly valor: string;
    readonly tipo: TipoComprobante;
    readonly codigo: string;
    readonly descripcion: string;
    readonly devolucion: boolean;
  }[];
  readonly detracciones: {
    readonly codigo: string;
    readonly descripcion: string;
    readonly porcentaje: number;
    readonly umbral: number;
  }[];
  readonly tasaIgv: number;
}

// --- Ventas ---

export type TipoComprobanteVenta = 'BOLETA' | 'FACTURA';
export type EstadoPedido = 'BORRADOR' | 'ENVIADO' | 'COBRADO' | 'ANULADO' | 'VENCIDO';
export type OrigenPrecio = 'FIJO' | 'MARGEN';

export interface Referencia {
  readonly id: string;
  readonly nombre: string;
}

export interface ClienteRef {
  readonly id: string;
  /** Código del catálogo 06 de SUNAT: 6 RUC, 1 DNI, 0 sin documento. */
  readonly tipoDocumento: string;
  readonly documento: string;
  readonly nombre: string;
}

export interface MargenCategoria {
  categoriaId: string;
  margen: number;
}

export interface ListaPrecios {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly margenDefecto: number | null;
  readonly descuentoMaximo: number;
  readonly porDefecto: boolean;
  readonly activo: boolean;
  readonly margenes: MargenCategoria[];
}

export interface ListaGuardar {
  codigo: string | null;
  nombre: string;
  margenDefecto: number | null;
  descuentoMaximo: number;
  porDefecto: boolean;
  activo: boolean;
  margenes: MargenCategoria[];
}

export interface PrecioFijo {
  readonly id: string;
  readonly articuloId: string;
  readonly articuloCodigo: string;
  readonly unidad: string;
  readonly precio: number;
  readonly modificadoPor: string | null;
}

export interface ClienteLista {
  readonly socioId: string;
  readonly lista: Referencia;
  readonly asignada: boolean;
}

export interface PrecioUnidad {
  readonly unidad: string;
  readonly factor: number;
  readonly precio: number | null;
  readonly origen: OrigenPrecio | null;
  readonly bajoCosto: boolean;
}

export interface ArticuloVenta {
  readonly articuloId: string;
  readonly codigo: string;
  readonly descripcion: string;
  readonly numeroParte: string | null;
  readonly marca: string | null;
  readonly unidadBase: string;
  readonly unidadVenta: string;
  readonly afectacionIgv: AfectacionCompra;
  readonly disponible: number | null;
  readonly unidades: PrecioUnidad[];
  readonly alternativas: ArticuloVenta[];
}

export interface Mostrador {
  readonly lista: Referencia;
  readonly cliente: ClienteRef;
  readonly descuentoMaximo: number;
  readonly articulos: ArticuloVenta[];
}

export interface LineaPedido {
  readonly linea: number;
  readonly articuloId: string;
  readonly articuloCodigo: string;
  readonly descripcion: string;
  readonly unidad: string;
  readonly factor: number;
  readonly cantidad: number;
  readonly precioLista: number;
  readonly origenPrecio: OrigenPrecio;
  readonly descuento: number;
  readonly precioUnitario: number;
  readonly afectacion: AfectacionCompra;
  readonly valorVenta: number;
  readonly igv: number;
  readonly total: number;
}

export interface PedidoVenta {
  readonly id: string;
  readonly numero: string;
  readonly sucursalId: string;
  readonly almacen: AlmacenCompraRef | null;
  readonly vendedor: string;
  readonly cliente: ClienteRef;
  readonly lista: Referencia;
  readonly tipoComprobante: TipoComprobanteVenta;
  readonly estado: EstadoPedido;
  readonly fecha: string;
  readonly fechaEnvio: string | null;
  readonly gravado: number;
  readonly exonerado: number;
  readonly inafecto: number;
  readonly igv: number;
  readonly total: number;
  readonly descuento: number;
  readonly autorizadoPor: string | null;
  readonly observacion: string | null;
  readonly cobroId: string | null;
  readonly fechaCierre: string | null;
  readonly cerradoPor: string | null;
  readonly motivoAnulacion: string | null;
  readonly lineas: LineaPedido[];
  readonly avisos: string[];
  readonly creadoPor: string | null;
  readonly fechaCreacion: string | null;
}

export interface PedidoListado {
  readonly id: string;
  readonly numero: string;
  readonly fecha: string;
  readonly cliente: ClienteRef;
  readonly vendedor: string;
  readonly tipoComprobante: TipoComprobanteVenta;
  readonly total: number;
  readonly estado: EstadoPedido;
}

export interface PedidoGuardar {
  almacenId: string;
  clienteId: string | null;
  tipoComprobante: TipoComprobanteVenta;
  observacion: string | null;
  lineas: { articuloId: string; unidad: string; cantidad: number; descuento: number }[];
}

// --- Facturación ---

/** Lo que emite facturación: boletas, facturas, notas de crédito (07) y guías de remisión (09). */
export type TipoComprobanteEmitido = TipoComprobanteVenta | 'NOTA_CREDITO' | 'GUIA_REMISION';

/**
 * PENDIENTE_ENVIO: aún no lo recibe el facturador (se reintenta solo). ENVIADO: espera respuesta
 * de SUNAT. ACEPTADO / OBSERVADO: válido. RECHAZADO: sin valor tributario. ERROR: datos inválidos.
 */
export type EstadoComprobante =
  'PENDIENTE_ENVIO' | 'ENVIADO' | 'ACEPTADO' | 'OBSERVADO' | 'RECHAZADO' | 'ERROR';

export type ArchivoComprobante = 'PDF' | 'XML' | 'CDR';

export interface SerieComprobante {
  readonly serie: string;
  readonly tipo: TipoComprobanteEmitido;
  readonly sucursalId: string;
  readonly sucursal: string | null;
  readonly ultimoNumero: number;
  readonly activo: boolean;
}

export interface ComprobanteVentaListado {
  readonly id: string;
  readonly tipo: TipoComprobanteEmitido;
  readonly comprobante: string;
  readonly fechaEmision: string;
  readonly clienteDocumento: string;
  readonly clienteNombre: string;
  readonly total: number;
  readonly origenNumero: string;
  readonly estado: EstadoComprobante;
}

export interface ReferenciaComprobante {
  readonly id: string;
  readonly tipo: TipoComprobanteEmitido;
  readonly comprobante: string;
}

export interface ComprobanteVenta extends ComprobanteVentaListado {
  readonly sucursalId: string;
  readonly clienteTipoDocumento: string;
  readonly clienteDireccion: string | null;
  readonly moneda: Moneda;
  readonly gravado: number;
  readonly exonerado: number;
  readonly inafecto: number;
  readonly igv: number;
  readonly origenTipo: string;
  readonly origenId: string;
  readonly lineas: {
    readonly codigo: string;
    readonly descripcion: string;
    readonly unidad: string;
    readonly cantidad: number;
    readonly precioUnitario: number;
    readonly afectacionIgv: string;
    readonly valorVenta: number;
    readonly igv: number;
    readonly total: number;
  }[];
  readonly creadoPor: string | null;
  readonly formaPago: 'CONTADO' | 'CREDITO';
  readonly fechaVencimiento: string | null;
  readonly cuotas: { readonly monto: number; readonly fechaPago: string }[];
  /** En una nota de crédito, el comprobante que modifica. */
  readonly referencia: ReferenciaComprobante | null;
  readonly motivoNota: string | null;
  readonly descripcionMotivo: string | null;
  readonly codigoSunat: string | null;
  readonly descripcionSunat: string | null;
  readonly observacionesSunat: string | null;
  readonly intentos: number;
  readonly ultimoError: string | null;
  readonly fechaEnvio: string | null;
  /** Notas de crédito que lo modifican. */
  readonly notas: ReferenciaComprobante[];
  /** Guías de remisión que sustentan su traslado. */
  readonly guias: ReferenciaComprobante[];
}

/** Catálogo 20: 01 venta, 04 traslado entre establecimientos de la empresa, 13 otros. */
export type MotivoTraslado = '01' | '04' | '13';
/** Catálogo 18: 01 transporte público, 02 privado. */
export type ModalidadTransporte = '01' | '02';

export interface TransporteGuia {
  modalidad: ModalidadTransporte;
  vehiculoM1L: boolean;
  transportista: { ruc: string; razonSocial: string; registroMtc: string | null } | null;
  placa: string | null;
  conductor: {
    tipoDocumento: string;
    documento: string;
    nombres: string;
    apellidos: string;
    licencia: string;
  } | null;
}

/** Transporte, peso bruto (kg; null lo calcula con el peso de los artículos) y bultos. */
export interface DatosGuia {
  transporte: TransporteGuia;
  pesoTotal: number | null;
  bultos: number | null;
}

export interface GuiaVenta extends DatosGuia {
  fechaTraslado: string;
  llegadaUbigeo: string;
  llegadaDireccion: string;
}

export interface GuiaRemisionListado {
  readonly id: string;
  readonly guia: string;
  readonly fechaEmision: string;
  readonly fechaTraslado: string;
  readonly motivo: MotivoTraslado;
  readonly destinatarioNombre: string;
  readonly llegadaDireccion: string;
  readonly origenNumero: string;
  readonly estado: EstadoComprobante;
}

export interface PuntoGuia {
  readonly ubigeo: string;
  readonly direccion: string;
  readonly establecimiento: string | null;
}

export interface GuiaRemision {
  readonly id: string;
  readonly guia: string;
  readonly fechaEmision: string;
  readonly fechaTraslado: string;
  readonly sucursalId: string;
  readonly motivo: MotivoTraslado;
  readonly descripcionMotivo: string | null;
  readonly destinatarioTipoDocumento: string;
  readonly destinatarioDocumento: string;
  readonly destinatarioNombre: string;
  readonly partida: PuntoGuia;
  readonly llegada: PuntoGuia;
  readonly modalidad: ModalidadTransporte;
  readonly vehiculoM1L: boolean;
  readonly transportistaRuc: string | null;
  readonly transportistaNombre: string | null;
  readonly transportistaMtc: string | null;
  readonly vehiculoPlaca: string | null;
  readonly conductor: string | null;
  readonly conductorDocumento: string | null;
  readonly conductorLicencia: string | null;
  readonly pesoTotal: number;
  readonly bultos: number | null;
  readonly documentoId: string | null;
  readonly documento: string | null;
  readonly origenTipo: string;
  readonly origenId: string;
  readonly origenNumero: string;
  readonly estado: EstadoComprobante;
  readonly lineas: {
    readonly codigo: string;
    readonly descripcion: string;
    readonly unidad: string;
    readonly cantidad: number;
  }[];
  readonly codigoSunat: string | null;
  readonly descripcionSunat: string | null;
  readonly observacionesSunat: string | null;
  readonly intentos: number;
  readonly ultimoError: string | null;
  readonly fechaEnvio: string | null;
  readonly creadoPor: string | null;
}

// --- Caja ---

/** CREDITO: la parte vendida al crédito, que queda como cuenta por cobrar del cliente. */
export type MedioPago = 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN' | 'TRANSFERENCIA' | 'CREDITO';
/** Catálogo 09: 01 anulación de la operación, 06 devolución total, 07 devolución por ítem. */
export type MotivoNotaCredito = '01' | '06' | '07';
export type EstadoSesion = 'ABIERTA' | 'CERRADA';
export type TipoMovimientoCaja = 'INGRESO' | 'EGRESO';

export interface Caja {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly sucursalId: string;
  readonly serieBoleta: string;
  readonly serieFactura: string;
  readonly serieNcBoleta: string | null;
  readonly serieNcFactura: string | null;
  readonly activo: boolean;
  readonly sesionAbierta: string | null;
}

export interface Pago {
  medio: MedioPago;
  monto: number;
  referencia: string | null;
}

export interface Cobro {
  readonly id: string;
  readonly numero: string;
  readonly pedidoNumero: string;
  readonly tipoComprobante: TipoComprobanteVenta;
  readonly comprobante: string;
  readonly comprobanteId: string;
  readonly clienteNombre: string;
  readonly total: number;
  readonly recibido: number;
  readonly vuelto: number;
  readonly pagos: Pago[];
  readonly fecha: string;
  readonly cajero: string;
}

export interface MovimientoCaja {
  readonly id: string;
  readonly tipo: TipoMovimientoCaja;
  readonly monto: number;
  readonly motivo: string;
  readonly fecha: string;
  readonly usuario: string;
}

export interface SesionCaja {
  readonly id: string;
  readonly numero: string;
  readonly cajaId: string;
  readonly caja: string | null;
  readonly sucursalId: string;
  readonly cajero: string;
  readonly apertura: string;
  readonly montoApertura: number;
  readonly estado: EstadoSesion;
  readonly cierre: string | null;
  readonly cobros: number;
  readonly totalCobrado: number;
  readonly porMedio: { readonly medio: MedioPago; readonly monto: number }[];
  readonly ingresos: number;
  readonly egresos: number;
  readonly efectivoEsperado: number;
  readonly efectivoContado: number | null;
  readonly diferencia: number | null;
  readonly observacionCierre: string | null;
  readonly detalleCobros: Cobro[];
  readonly movimientos: MovimientoCaja[];
  readonly abonos: number;
  readonly totalAbonos: number;
  readonly detalleAbonos: AbonoCaja[];
  readonly totalReembolsado: number;
  readonly detalleDevoluciones: DevolucionCaja[];
}

export interface AbonoCaja {
  readonly id: string;
  readonly numero: string;
  readonly cuentaNumero: string;
  readonly comprobante: string;
  readonly clienteNombre: string;
  readonly monto: number;
  /** Saldo que queda; null en el detalle de la sesión. */
  readonly saldo: number | null;
  readonly pagos: Pago[];
  readonly fecha: string;
  readonly usuario: string;
}

export interface CuentaPendiente {
  readonly id: string;
  readonly numero: string;
  readonly clienteNombre: string;
  readonly comprobante: string;
  readonly fechaVencimiento: string;
  readonly monto: number;
  readonly saldo: number;
  readonly vencida: boolean;
}

export interface DevolucionCaja {
  readonly id: string;
  readonly numero: string;
  readonly cobroNumero: string;
  readonly comprobante: string;
  readonly notaId: string;
  readonly nota: string;
  readonly motivo: MotivoNotaCredito;
  readonly descripcion: string;
  readonly clienteNombre: string;
  readonly total: number;
  readonly aplicadoCredito: number;
  readonly reembolso: number;
  readonly medioReembolso: MedioPago | null;
  readonly fecha: string;
  readonly usuario: string;
}

export interface CobroDevolvible {
  readonly cobroId: string;
  readonly cobroNumero: string;
  readonly comprobanteId: string;
  readonly comprobante: string;
  readonly tipoComprobante: TipoComprobanteVenta;
  readonly estadoComprobante: EstadoComprobante;
  readonly clienteNombre: string;
  readonly total: number;
  readonly devuelto: number;
  readonly alCredito: number;
  readonly serieNota: string | null;
  readonly lineas: {
    readonly linea: number;
    readonly codigo: string;
    readonly descripcion: string;
    readonly unidad: string;
    readonly cantidad: number;
    readonly devuelta: number;
    readonly precioUnitario: number;
    readonly total: number;
  }[];
}

// --- Créditos ---

export type EstadoCuenta = 'PENDIENTE' | 'PAGADA';

export interface CuentaPorCobrarListado {
  readonly id: string;
  readonly numero: string;
  readonly clienteId: string;
  readonly clienteDocumento: string;
  readonly clienteNombre: string;
  readonly comprobante: string;
  readonly fechaEmision: string;
  readonly fechaVencimiento: string;
  readonly monto: number;
  readonly saldo: number;
  readonly estado: EstadoCuenta;
  readonly vencida: boolean;
  readonly diasVencida: number;
}

export interface CuentaPorCobrar {
  readonly id: string;
  readonly numero: string;
  readonly clienteId: string;
  readonly clienteDocumento: string;
  readonly clienteNombre: string;
  readonly comprobanteId: string;
  readonly comprobante: string;
  readonly fechaEmision: string;
  readonly fechaVencimiento: string;
  readonly monto: number;
  readonly saldo: number;
  readonly estado: EstadoCuenta;
  readonly vencida: boolean;
  readonly autorizadoPor: string | null;
  readonly abonos: {
    readonly id: string;
    readonly fecha: string;
    readonly monto: number;
    readonly tipo: 'ABONO' | 'NOTA_CREDITO';
    readonly detalle: string;
    readonly usuario: string;
  }[];
  readonly creadoPor: string | null;
}

export interface EstadoCredito {
  readonly clienteId: string;
  readonly diasCredito: number;
  readonly limite: number | null;
  readonly usado: number;
  readonly disponible: number;
  readonly vencido: number;
  readonly cuentas: CuentaPorCobrarListado[];
}

export interface SesionListado {
  readonly id: string;
  readonly numero: string;
  readonly caja: string | null;
  readonly cajero: string;
  readonly apertura: string;
  readonly cierre: string | null;
  readonly estado: EstadoSesion;
  readonly diferencia: number | null;
}

export interface PedidoPendiente {
  readonly id: string;
  readonly numero: string;
  readonly clienteDocumento: string;
  readonly clienteNombre: string;
  readonly tipoComprobante: TipoComprobanteVenta;
  readonly vendedor: string;
  readonly total: number;
  readonly lineas: {
    readonly codigo: string;
    readonly descripcion: string;
    readonly unidad: string;
    readonly cantidad: number;
    readonly precioUnitario: number;
    readonly total: number;
  }[];
}
