import { test, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { onRequestGet, onRequestPost, resetAdminStores } from '../functions/api/admin.js';

// WebAuthn RP IDs must be domain names; localhost is supported for development.
test.use({ baseURL: (process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000').replace('127.0.0.1', 'localhost') });

test('administrator enrolls, signs in with, and revokes a passkey', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Chromium virtual authenticator');
  resetAdminStores();
  const sql = new DatabaseSync(':memory:');
  const migrations = new URL('../migrations/', import.meta.url);
  for (const name of readdirSync(migrations).filter(n => n.endsWith('.sql')).sort()) sql.exec(readFileSync(new URL(name, migrations), 'utf8'));
  const db: any = {
    prepare(query: string) {
      let values: any[] = [];
      return {
        bind(...args: any[]) { values = args; return this; },
        async first() { return sql.prepare(query).get(...values) || null; },
        async all() { return { success: true, results: sql.prepare(query).all(...values) }; },
        async run() { const result = sql.prepare(query).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
      };
    },
  };
  const pin = 'test-admin-passkey-4098';
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/admin*', async route => {
    const incoming = route.request();
    const request = new Request(incoming.url(), { method: incoming.method(), headers: incoming.headers(),
      ...(incoming.method() === 'POST' ? { body: incoming.postData() } : {}) });
    const handler = incoming.method() === 'POST' ? onRequestPost : onRequestGet;
    const response = await handler({ request, env: { DB: db, ADMIN_PIN: pin, ENVIRONMENT: 'development' } });
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal',
    hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
  try {
    await page.goto('/admin.html');
    await page.locator('#login-pin-input').fill(pin);
    await page.locator('#btn-login-submit').click();
    await page.locator('[data-admin-tab="config"]').click();
    await expect(page.locator('#admin-passkey-list')).toContainText('No admin passkeys');
    await page.locator('#btn-admin-add-passkey').click();
    await expect(page.locator('#admin-passkey-status')).toContainText('Passkey added');
    await expect(page.locator('#admin-passkey-list')).toContainText('Added');
    await page.reload();
    await page.locator('#btn-login-passkey').click();
    await page.locator('[data-admin-tab="config"]').click();
    await expect(page.locator('#admin-passkey-list')).toContainText('Added');
    await page.getByRole('button', { name: 'Revoke', exact: true }).click();
    await expect(page.locator('#admin-passkey-list')).toContainText('No admin passkeys');
    await page.reload();
    await page.locator('#btn-login-passkey').click();
    await expect(page.locator('#login-error')).toContainText('Passkey verification failed');
    await expect(page.locator('#login-pin-input')).toBeVisible();
    await page.screenshot({ path: fileURLToPath(new URL('../../../artifacts/admin-passkey-login.png', import.meta.url)) });
    expect(errors).toEqual([]);
  } finally { sql.close(); }
});
