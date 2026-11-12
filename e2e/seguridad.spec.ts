import { expect, test } from '@playwright/test';

test.describe('aplicación servida con la configuración de producción', () => {
  test('carga sin violaciones de CSP ni de Trusted Types', async ({ page }) => {
    const errores: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });
    page.on('pageerror', (e) => errores.push(e.message));

    // Sin sesión la portada lleva al login (la API responde 404 en este contenedor).
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Repuestos' })).toBeVisible();
    await expect(page).toHaveTitle('Ingresar · Repuestos');
    expect(errores.filter((e) => !e.includes('404'))).toEqual([]);
  });

  test('responde con las cabeceras de seguridad', async ({ request }) => {
    const r = await request.get('/');
    const csp = r.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("require-trusted-types-for 'script'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
    expect(r.headers()['x-frame-options']).toBe('DENY');
    expect(r.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('cada respuesta trae un nonce distinto', async ({ request }) => {
    const nonce = async () =>
      /'nonce-([a-f0-9]+)'/.exec(
        (await request.get('/')).headers()['content-security-policy'] ?? '',
      )?.[1];
    const [a, b] = [await nonce(), await nonce()];
    expect(a).toMatch(/^[a-f0-9]{32}$/);
    expect(a).not.toBe(b);
  });

  test('registra el service worker para funcionar como PWA', async ({ page }) => {
    await page.goto('/');
    const activo = await page.evaluate(async () => {
      const registro = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((r) => setTimeout(() => r(null), 40_000)),
      ]);
      return registro?.active?.scriptURL ?? null;
    });
    expect(activo).toContain('ngsw-worker.js');
  });

  test('es usable con teclado: el primer Tab lleva al enlace para saltar al contenido', async ({
    page,
  }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
  });
});
