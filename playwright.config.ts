import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas e2e contra la imagen de producción (nginx con las cabeceras reales), no contra `ng serve`:
 * así se verifica que la CSP estricta y Trusted Types no rompan la aplicación.
 *   podman run -d -p 127.0.0.1:18090:8080 repuestos-front:local
 *   pnpm e2e
 */
export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://127.0.0.1:18090',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: process.env['CI'] ? undefined : 'chrome' },
    },
    {
      name: 'movil',
      use: { ...devices['Pixel 7'], channel: process.env['CI'] ? undefined : 'chrome' },
    },
  ],
});
