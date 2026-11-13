import { expect, test, type Page } from '@playwright/test';

/**
 * Flujo completo contra el backend real, con la base de datos recién creada:
 *   E2E_BASE_URL=http://localhost:4200 E2E_ADMIN_PASSWORD='<la del log>' pnpm e2e --project=chromium flujo
 * El admin debe tener todavía su contraseña provisional.
 */
const CLAVE_ADMIN = process.env['E2E_ADMIN_PASSWORD'];
const NUEVA_CLAVE_ADMIN = 'Repuestos-e2e-2026';
const SUFIJO = Date.now().toString(36).slice(-5).toUpperCase();

test.describe.configure({ mode: 'serial', timeout: 120_000 });
test.skip(!CLAVE_ADMIN, 'Requiere E2E_ADMIN_PASSWORD y el backend levantado');

function erroresDeConsola(page: Page): string[] {
  const errores: string[] = [];
  page.on('console', (m) => {
    // Un 401 esperado (sesión ausente) aparece como recurso fallido: no es un error de la app.
    if (m.type() === 'error' && !m.text().includes('401')) {
      errores.push(m.text());
    }
  });
  page.on('pageerror', (e) => errores.push(e.message));
  return errores;
}

async function ingresar(page: Page, usuario: string, clave: string): Promise<void> {
  await page.getByLabel('Usuario').fill(usuario);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

async function cambiarClave(page: Page, actual: string, nueva: string): Promise<void> {
  await expect(page.getByText('Su contraseña es provisional')).toBeVisible();
  await page.getByLabel('Contraseña actual').fill(actual);
  await page.getByLabel('Nueva contraseña', { exact: true }).fill(nueva);
  await page.getByLabel('Confirmar nueva contraseña').fill(nueva);
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}

test('flujo completo: admin, sucursal, rol, usuario, auditoría, centros, inventario y acceso del nuevo usuario', async ({
  page,
}) => {
  const errores = erroresDeConsola(page);
  const codigoSucursal = `T${SUFIJO}`;
  const rol = `CAJERO_${SUFIJO}`;
  const usuario = `cajero${SUFIJO.toLowerCase()}`;

  // Sin sesión, cualquier ruta lleva al login recordando a dónde iba.
  await page.goto('/usuarios');
  await expect(page).toHaveURL(/\/login\?volver=%2Fusuarios/);

  // Clave provisional del admin: obliga a cambiarla antes de entrar.
  await ingresar(page, 'admin', CLAVE_ADMIN ?? '');
  await expect(page).toHaveURL(/\/cambiar-password$/);
  await cambiarClave(page, CLAVE_ADMIN ?? '', NUEVA_CLAVE_ADMIN);
  await expect(
    page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link'),
  ).toHaveCount(8);

  // Sucursal nueva: nace con su almacén principal.
  await page
    .getByRole('navigation', { name: 'Menú principal' })
    .getByRole('link', { name: 'Sucursales' })
    .click();
  await page.getByRole('link', { name: 'Nueva sucursal' }).click();
  await page.getByLabel('Código', { exact: true }).fill(codigoSucursal);
  await page.getByLabel('Nombre').fill('Tienda e2e');
  await page.getByLabel('Ubigeo').fill('080101');
  await page.getByRole('button', { name: 'Crear sucursal' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tienda e2e' })).toBeVisible();
  await expect(page.getByRole('cell', { name: `${codigoSucursal}-01` })).toBeVisible();
  await expect(page.getByText('Principal', { exact: true })).toBeVisible();

  // Rol nuevo con un permiso.
  await page
    .getByRole('navigation', { name: 'Menú principal' })
    .getByRole('link', { name: 'Roles y permisos' })
    .click();
  await page.getByLabel('Nombre').first().waitFor();
  await page.locator('#nuevo-nombre').fill(rol);
  await page.getByRole('button', { name: 'Crear rol' }).click();
  await expect(page.getByRole('button', { name: rol })).toBeVisible();
  await page.getByRole('checkbox', { name: /Ver sucursales/ }).check();
  await page.getByRole('button', { name: 'Guardar permisos' }).click();
  await expect(page.getByRole('heading', { name: 'Permisos (1)' })).toBeVisible();

  // Usuario nuevo: la contraseña provisional se muestra una sola vez.
  await page
    .getByRole('navigation', { name: 'Menú principal' })
    .getByRole('link', { name: 'Usuarios' })
    .click();
  await page.getByRole('link', { name: 'Nuevo usuario' }).click();
  await expect(page.getByLabel('Rol').locator('option', { hasText: rol })).toHaveCount(1);
  await page.locator('#username').fill(usuario);
  await expect(page.locator('#username')).toHaveValue(usuario);
  await page.getByLabel('Correo').fill(`${usuario}@prueba.local`);
  await page.getByLabel('Nombres').fill('Cajero');
  await page.getByLabel('Apellidos').fill('De Prueba');
  await page.getByLabel('Rol').selectOption({ label: rol });
  await page.getByRole('checkbox', { name: new RegExp(codigoSucursal) }).check();
  await page.getByRole('button', { name: 'Crear usuario' }).click();
  const clave = (await page.locator('.select-all').textContent())?.trim() ?? '';
  expect(clave).toHaveLength(16);

  // Auditoría: el historial y los eventos reflejan lo que se hizo.
  await page
    .getByRole('navigation', { name: 'Menú principal' })
    .getByRole('link', { name: 'Auditoría' })
    .click();
  await page.getByLabel('Entidad').fill('Sucursal');
  const filtrado = page.waitForResponse(
    (r) => r.url().includes('/auditoria/cambios?') && r.url().includes('entidad=Sucursal'),
  );
  await page.getByRole('button', { name: 'Buscar' }).click();
  await filtrado;
  const registro = page.locator('details', { hasText: 'Sucursal' }).first();
  await registro.locator('summary').click();
  await expect(registro.getByRole('cell', { name: 'codigo' })).toBeVisible();
  await page.getByRole('link', { name: 'Eventos de seguridad' }).click();
  await expect(page.getByRole('cell', { name: 'PASSWORD_CAMBIADA' }).first()).toBeVisible();

  // Centros de costo: estructura inicial, centro nuevo, presupuesto, imputación repartida y reportes.
  const codigoCentro = `CC-E${SUFIJO.slice(-3)}`;
  await page
    .getByRole('navigation', { name: 'Menú principal' })
    .getByRole('link', { name: 'Centros de costo' })
    .click();
  await expect(page.getByRole('cell', { name: 'CC-GER' })).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo centro' }).click();
  await page.locator('#c-codigo').fill(codigoCentro);
  await page.locator('#c-nombre').fill('Cobranzas e2e');
  await page.locator('#c-padre').selectOption({ label: 'CC-ADM · Administración' });
  await page.locator('#c-funcion').selectOption('ADMINISTRACION');
  await expect(page.locator('#c-cuenta')).toHaveValue('94');
  await page.locator('#c-beneficio').selectOption({ label: 'CB-COR · Corporativo' });
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  await expect(page.getByRole('cell', { name: codigoCentro })).toBeVisible();

  await page.getByRole('link', { name: 'Presupuesto' }).click();
  await page.getByLabel(new RegExp(`${codigoCentro} · Cobranzas e2e`)).fill('1000');
  await page.getByRole('button', { name: 'Guardar presupuesto' }).click();
  await expect(page.getByText(/Presupuesto de .* guardado/)).toBeVisible();

  await page.getByRole('link', { name: 'Imputaciones' }).click();
  await page.getByRole('button', { name: 'Imputación manual' }).click();
  await page.locator('#n-glosa').fill('Servicio de cobranza e2e');
  await page.locator('#n-naturaleza').fill('63');
  await page.locator('#n-monto').fill('500');
  await page.locator('#l-centro-0').selectOption({ label: `${codigoCentro} · Cobranzas e2e` });
  await page.locator('#l-porc-0').fill('60');
  await page.getByRole('button', { name: '+ Agregar centro' }).click();
  await page.locator('#l-centro-1').selectOption({ label: 'CC-SIS · Sistemas' });
  await page.locator('#l-porc-1').fill('40');
  await page.getByRole('button', { name: 'Registrar' }).click();
  await expect(page.getByText('Imputación registrada.')).toBeVisible();
  await expect(page.getByRole('cell', { name: codigoCentro })).toBeVisible();

  await page.getByRole('link', { name: 'Reportes' }).click();
  const filaCentro = page.getByRole('row', { name: new RegExp(codigoCentro) });
  await expect(filaCentro).toContainText('1,000.00');
  await expect(filaCentro).toContainText('300.00');
  await expect(filaCentro).toContainText('30.0 %');
  await expect(page.getByRole('row', { name: /\(94\) Gastos de administración/ })).toContainText(
    '500.00',
  );

  // Artículos e inventario: artículo con código automático, saldo inicial, existencias y kardex.
  await page
    .getByRole('navigation', { name: 'Menú principal' })
    .getByRole('link', { name: 'Artículos' })
    .click();
  await page.getByRole('link', { name: 'Nuevo artículo' }).click();
  await page.locator('#ar-descripcion').fill(`Filtro de aceite e2e ${SUFIJO}`);
  await page.locator('#ar-categoria').selectOption({ label: 'Filtros (FIL)' });
  await page.locator('#ar-unidad').selectOption({ label: 'NIU · Unidad (bienes)' });
  await page.getByRole('button', { name: 'Crear artículo' }).click();
  await expect(page).toHaveURL(/\/articulos\/[0-9a-f-]{36}$/);
  const codigoArticulo = (await page.locator('h2 .font-mono').textContent())?.trim() ?? '';
  expect(codigoArticulo).toMatch(/^FIL-\d{6}$/);

  await page
    .getByRole('navigation', { name: 'Menú principal' })
    .getByRole('link', { name: 'Inventario' })
    .click();
  await page.getByRole('link', { name: 'Movimientos' }).click();
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click();
  const almacen = await page
    .locator('#f-almacen option', { hasText: codigoSucursal })
    .first()
    .getAttribute('value');
  await page.locator('#f-almacen').selectOption(almacen ?? '');
  await page.locator('#f-glosa').fill('Apertura e2e');
  await page.getByLabel('Agregar artículo').fill(codigoArticulo);
  await page.getByRole('button', { name: new RegExp(codigoArticulo) }).click();
  await page.locator('#f-cant-0').fill('10');
  await page.locator('#f-costo-0').fill('5');
  await page.getByRole('button', { name: 'Registrar' }).click();
  await expect(page.getByText(/Movimiento MI-\d{8} registrado\./)).toBeVisible();

  await page.getByRole('link', { name: 'Existencias' }).click();
  await page.locator('#e-texto').fill(codigoArticulo);
  await page.getByRole('button', { name: 'Buscar' }).click();
  const filaStock = page.getByRole('row', { name: new RegExp(codigoArticulo) });
  await expect(filaStock).toContainText('50.00');
  await filaStock.getByRole('link', { name: codigoArticulo }).click();
  await expect(page.getByText('formato 13.1')).toBeVisible();
  await expect(page.getByRole('row', { name: /16 · Saldo inicial/ })).toContainText('50.00');

  // El nuevo usuario entra, cambia su clave y solo ve lo que su rol permite.
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login/);
  await ingresar(page, usuario, clave);
  await cambiarClave(page, clave, 'Cajero-e2e-2026');
  const menu = page.getByRole('navigation', { name: 'Menú principal' });
  await expect(menu.getByRole('link', { name: 'Sucursales' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Usuarios' })).toHaveCount(0);
  await expect(page.getByLabel('Sucursal')).toHaveValue(/.+/);

  // Una ruta sin permiso redirige al inicio.
  await page.goto('/usuarios');
  await expect(page).toHaveURL(/\/inicio$/);

  expect(errores).toEqual([]);
});
