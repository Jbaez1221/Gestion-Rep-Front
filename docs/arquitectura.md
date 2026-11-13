# Arquitectura del front

## Principios

- **Componentes standalone y zoneless**: sin `NgModule` ni `zone.js`; la detección de cambios la
  disparan los signals. Todo componente usa `ChangeDetectionStrategy.OnPush` (regla de lint).
- **Estado con signals**: estado local en el componente; estado compartido en servicios de `core/`
  o del feature. RxJS solo para flujos asíncronos (HTTP, eventos).
- **Carga bajo demanda**: cada feature es una ruta con `loadComponent` o `loadChildren`, así el
  bundle inicial no crece con cada módulo (presupuesto: 400 kB de aviso, 700 kB de error).
- **Plantillas con el control flow nuevo** (`@if`, `@for`) y etiquetas autocerradas (reglas de lint).

## Capas

| Carpeta              | Contiene                                                                   | Puede usar         |
| -------------------- | -------------------------------------------------------------------------- | ------------------ |
| `core/`              | Servicios únicos: HTTP (interceptores, errores), sesión, seguridad         | Angular            |
| `shared/`            | Componentes, directivas y pipes de UI reutilizables, sin lógica de negocio | `core/`            |
| `features/<modulo>/` | Páginas, componentes y servicios de un módulo de negocio                   | `core/`, `shared/` |

Un feature **no importa de otro feature**: lo común sube a `shared/` o a `core/`. Es la misma regla
que separa los módulos del backend.

## Comunicación con la API

- Todas las llamadas van a `API` (`/api/v1`), mismo origen que el front.
- Cada petición lleva un `X-Request-Id` único (`idSolicitudInterceptor`) que el backend escribe en
  sus logs y en la auditoría.
- Los errores se leen con `aProblema()`, que interpreta el formato RFC 9457 del backend y su
  `codigo` (`CAMBIO_PASSWORD_REQUERIDO`, `SUCURSAL_NO_PERMITIDA`, `SIN_PERMISO`...).
- La sesión vive en cookies `HttpOnly` que pone el backend: el front nunca ve ni guarda tokens.

## Regionalización

`es-PE`: fechas `dd/MM/yyyy` en hora de Lima (UTC-5) y moneda `PEN`, configurados en `app.config.ts`.

## Agregar un módulo

1. `src/app/features/<modulo>/` con su página y sus rutas.
2. Registrar la ruta en `app.routes.ts` con `loadComponent`/`loadChildren` y `title`.
3. Tests unitarios junto a cada archivo (`*.spec.ts`) y, si es un flujo crítico, un e2e en `e2e/`.
