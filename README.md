# Repuestos Front

Front del sistema de ventas Repuestos: inventario, compras, ventas, centros de costo y sucursales.
**Angular 22** (standalone, zoneless, signals) + **Tailwind CSS 4**, como app web responsive y
**PWA** instalable en PC y celular. Consume la API de
[Repuestos-Back](https://github.com/Jbaez1221/Gestion-Rep-Back).

## Requisitos

- Node 24 (ver `.nvmrc`; también sirve Node 22.22.3 o superior)
- pnpm 11.9 o superior (`corepack enable` lo instala desde `packageManager`)
- Para las pruebas e2e: Podman o Docker y Google Chrome

## Desarrollo

```bash
pnpm install        # instala dependencias y los hooks de git (lefthook)
pnpm start          # http://localhost:4200, con /api redirigido al backend en :8080
```

El backend debe estar levantado (`./mvnw quarkus:dev` en Repuestos-Back). `proxy.conf.json` envía
`/api` al backend, así front y API comparten origen y las cookies de sesión funcionan sin CORS.

## Pantallas

| Ruta                                                              | Qué hace                                                                                                                                                                                                | Permiso                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `/login`                                                          | Inicio de sesión                                                                                                                                                                                        | —                                                    |
| `/cambiar-password`                                               | Cambio de contraseña (obligatorio si es provisional)                                                                                                                                                    | sesión                                               |
| `/inicio`                                                         | Accesos según el rol y "mi cuenta"                                                                                                                                                                      | sesión                                               |
| `/sucursales`, `/sucursales/:id`                                  | Sucursales con filtros; ficha con sus almacenes                                                                                                                                                         | `sucursales:read`                                    |
| `/usuarios`, `/usuarios/:id`                                      | Usuarios; alta con contraseña provisional, edición, restablecer clave, desactivar                                                                                                                       | `usuarios:read`                                      |
| `/articulos/lista` · `nuevo` · `:id`                              | Búsqueda por código, barras o N.° de parte; ficha con propiedades de la categoría, control por lote o serie, unidades de compra y venta, barras por presentación, imágenes y PDF, equivalencias y stock | `articulos:read` (+ `create`/`update`)               |
| `/articulos/catalogos`                                            | Categorías (prefijo, valores propuestos y propiedades), marcas y unidades SUNAT                                                                                                                         | `articulos:read` / `articulos.catalogos:update`      |
| `/articulos/importar`                                             | Carga masiva desde la plantilla Excel: validar y luego importar (todo o nada)                                                                                                                           | `articulos:importar`                                 |
| `/inventario/existencias` · `valorizacion`                        | Stock valorizado al costo promedio, lo que hay que reponer, parámetros de reposición y valorización por almacén y tabla 5                                                                               | `inventario:read` (+ `inventario.parametros:update`) |
| `/inventario/movimientos`                                         | Saldo inicial, ajustes, mermas, desmedros, consumo interno, transferencia directa y revalorización, con lotes y series; anulación                                                                       | `inventario:read` (+ permisos de cada acción)        |
| `/inventario/traslados`                                           | Solicitud, envío (en tránsito) y recepción confirmada con diferencias                                                                                                                                   | `inventario:read` (+ `inventario.traslado:*`)        |
| `/inventario/lotes-series` · `resumen`                            | Lotes por vencer, ubicación e historia de series; resumen del período con Excel                                                                                                                         | `inventario:read`                                    |
| `/inventario/kardex` · `conteos`                                  | Kardex valorizado (formato 13.1) e inventario físico con aplicación de ajustes                                                                                                                          | `inventario:read` (+ `inventario.conteo:*`)          |
| `/centros/costo` · `beneficio`                                    | Centros de costo (con función PCGE 94/95/97/90) y de beneficio, en árbol                                                                                                                                | `centros:read`                                       |
| `/centros/presupuesto` · `imputaciones` · `reportes` · `periodos` | Presupuesto mensual, imputaciones con reparto y extorno, real vs. presupuesto, resultado por negocio, estado por función y cierre de períodos                                                           | `centros:read` (+ permisos de cada acción)           |
| `/roles`                                                          | Roles y sus permisos agrupados por módulo                                                                                                                                                               | `roles:read`                                         |
| `/auditoria/cambios` · `eventos` · `flujo`                        | Historial de cambios, eventos de seguridad y flujo de documentos                                                                                                                                        | `auditoria:read` / `auditoria.eventos:read`          |

El menú y las acciones se muestran según los permisos de `/api/v1/auth/me`, pero quien decide es
el backend. La sesión se renueva sola ante un 401; si no se puede, vuelve al login recordando la
ruta. La sucursal elegida en la cabecera viaja en `X-Sucursal-Id`.

## Scripts

| Script                              | Qué hace                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `pnpm start`                        | Servidor de desarrollo con recarga en caliente                            |
| `pnpm test` / `pnpm test:watch`     | Tests unitarios (Vitest)                                                  |
| `pnpm test:coverage`                | Tests con cobertura; falla bajo 80 % de líneas o 70 % de ramas            |
| `pnpm lint`                         | ESLint: TypeScript estricto, reglas de Angular, accesibilidad y seguridad |
| `pnpm format` / `pnpm format:check` | Prettier                                                                  |
| `pnpm verify`                       | Todo lo anterior + build de producción (lo mismo que corre el CI)         |
| `pnpm e2e`                          | Pruebas e2e con Playwright contra la imagen de producción                 |
| `pnpm audit:prod`                   | Vulnerabilidades altas o críticas en dependencias de producción           |

## Pruebas e2e

`e2e/seguridad.spec.ts` corre contra la imagen real (nginx con la CSP estricta y Trusted Types):

```bash
podman build -f Containerfile -t repuestos-front:local .
podman run -d --name repuestos-front -p 127.0.0.1:18090:8080 repuestos-front:local
pnpm e2e
```

`e2e/flujo-completo.spec.ts` recorre todo con el backend real: login del admin, cambio de clave,
sucursal, rol, usuario, auditoría y acceso del nuevo usuario. Necesita la base recién creada (admin
con su contraseña provisional) y se salta si no se le pasa:

```bash
E2E_BASE_URL=http://localhost:4200 E2E_ADMIN_PASSWORD='<la del log del backend>' pnpm e2e --project=chromium flujo
```

## Despliegue

`Containerfile` compila con Node y sirve con **nginx sin root** (puerto 8080, imagen de ~60 MB),
con cabeceras de seguridad, CSP con nonce por respuesta y caché correcto: archivos con hash por
un año, `index.html` y service worker siempre revalidados.

El proxy inverso del hosting (con HTTPS) envía `/api/` al backend y el resto a este contenedor:
mismo dominio para front y API. Debe **conservar el `Host` original** (en nginx,
`proxy_set_header Host $http_host;`): el backend compara `Origin` con `Host` para reconocer las
peticiones del mismo origen, y si no coinciden las rechaza por CORS (403).

## Estructura

```
src/app
├── core/       servicios únicos de la app: HTTP, sesión, seguridad
├── shared/     componentes, directivas y pipes reutilizables (sin estado de negocio)
├── features/   una carpeta por módulo de negocio, cargada bajo demanda (lazy)
├── app.config.ts
└── app.routes.ts
```

## Documentación

- [docs/arquitectura.md](docs/arquitectura.md): capas, convenciones y cómo agregar un módulo.
- [docs/seguridad-owasp.md](docs/seguridad-owasp.md): controles OWASP Top 10 del front.
- [docs/estandares.md](docs/estandares.md): estándares de referencia y cómo se aplican.
- [CONTRIBUTING.md](CONTRIBUTING.md): ramas, commits y revisión.
