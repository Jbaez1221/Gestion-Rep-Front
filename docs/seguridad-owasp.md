# Seguridad del front: OWASP Top 10

"Hecho" = implementado y verificado (tests unitarios, e2e contra la imagen real o CI).
Los controles del servidor (autenticación, permisos, auditoría) están en Repuestos-Back.

| Riesgo                          | Control                                                                                                                                                                   | Estado             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **A01 Control de acceso**       | Guards y menú según los permisos del perfil, solo para la experiencia de uso: la autorización real la decide el backend en cada petición                                  | Hecho (por diseño) |
|                                 | `frame-ancestors 'none'` y `X-Frame-Options: DENY`: la app no se puede incrustar (clickjacking)                                                                           | Hecho              |
| **A02 Fallas criptográficas**   | Sesión en cookies `HttpOnly; Secure; SameSite=Strict` del backend: el JavaScript nunca ve tokens. HSTS                                                                    | Hecho              |
|                                 | Prohibido por lint usar `localStorage`/`sessionStorage` para datos sensibles                                                                                              | Hecho              |
| **A03 Inyección (XSS)**         | CSP estricta sin `unsafe-inline` ni `unsafe-eval`, con nonce aleatorio por respuesta                                                                                      | Hecho (e2e)        |
|                                 | Trusted Types: solo las políticas de Angular y una `default` que admite únicamente el service worker                                                                      | Hecho (e2e)        |
|                                 | Sanitización de Angular siempre activa: lint prohíbe `bypassSecurityTrust*`, `innerHTML` manual, `eval` y URLs `javascript:`                                              | Hecho              |
| **A04 Diseño inseguro**         | Capas `core/shared/features` sin dependencias entre features; TypeScript y plantillas en modo estricto                                                                    | Hecho              |
| **A05 Configuración insegura**  | nginx sin root, `server_tokens off`, solo GET/HEAD, archivos ocultos bloqueados                                                                                           | Hecho (e2e/manual) |
|                                 | Cabeceras: `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP y CORP                                                                                   | Hecho (e2e)        |
|                                 | Sin source maps en producción                                                                                                                                             | Hecho              |
|                                 | El service worker nunca cachea ni sirve respuestas de `/api`                                                                                                              | Hecho              |
| **A06 Componentes vulnerables** | pnpm: solo versiones con 3 días o más de publicadas, sin scripts de instalación, sin dependencias de git/tarball, y rechazo de versiones que pierden la procedencia       | Hecho              |
|                                 | `pnpm audit` de producción en el CI; Dependabot; Trivy en cada PR; actions fijadas por SHA                                                                                | Hecho              |
| **A07 Autenticación**           | Login, renovación automática de la sesión ante un 401 (una sola a la vez) y cambio de contraseña obligatorio; el front no ve tokens y reacciona a los códigos del backend | Hecho (unit + e2e) |
|                                 | Tras el login solo se redirige a rutas internas: un `?volver=//sitio-externo` se ignora (open redirect)                                                                   | Hecho              |
| **A08 Integridad**              | Subresource Integrity (SRI) en todos los scripts y estilos; lockfile congelado en el CI                                                                                   | Hecho              |
| **A09 Registro y monitoreo**    | `X-Request-Id` en cada llamada, correlacionado con los logs y la auditoría del backend                                                                                    | Hecho              |
| **A10 SSRF**                    | No aplica al front: no hace peticiones del lado del servidor                                                                                                              | —                  |

## Pendientes conocidos

- `minimatch` (moderada, DoS) en las herramientas de lint: no llega al navegador; se resuelve al
  actualizar ESLint (Dependabot).
