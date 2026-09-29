import { test, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { onRequest, resetWebAuthnMemoryStore } from '../functions/api/webauthn.js';

test.use({
  baseURL: (process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000').replace('127.0.0.1', 'localhost'),
});

test.describe('WebAuthn / Passkey Physical & Adversarial Suite', () => {
  let sql: DatabaseSync;
  let db: any;

  test.beforeEach(async ({ page }) => {
    resetWebAuthnMemoryStore();
    sql = new DatabaseSync(':memory:');
    const migrations = new URL('../migrations/', import.meta.url);
    for (const name of readdirSync(migrations).filter((n) => n.endsWith('.sql')).sort()) {
      sql.exec(readFileSync(new URL(name, migrations), 'utf8'));
    }
    db = {
      prepare(query: string) {
        let values: any[] = [];
        return {
          bind(...args: any[]) {
            values = args;
            return this;
          },
          async first() {
            return sql.prepare(query).get(...values) || null;
          },
          async all() {
            return { success: true, results: sql.prepare(query).all(...values) };
          },
          async run() {
            const result = sql.prepare(query).run(...values);
            return { success: true, meta: { changes: Number(result.changes) } };
          },
        };
      },
    };

    // Route /api/webauthn to real server-edge Cloudflare Pages function handler
    await page.route('**/api/webauthn*', async (route) => {
      try {
        const incoming = route.request();
        console.log('[E2E ROUTE] Request:', incoming.method(), incoming.url());
        const request = new Request(incoming.url(), {
          method: incoming.method(),
          headers: incoming.headers(),
          ...(incoming.method() === 'POST' ? { body: incoming.postData() } : {}),
        });
        const response = await onRequest({ request, env: { DB: db, ENVIRONMENT: 'development' } });
        const text = await response.text();
        console.log('[E2E ROUTE] Response:', response.status, text);
        await route.fulfill({
          status: response.status,
          headers: Object.fromEntries(response.headers),
          body: text,
        });
      } catch (err: any) {
        console.error('[E2E ROUTE] Error:', err);
        await route.abort();
      }
    });

    page.on('console', (msg) => {
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    });

    // Dismiss onboarding wizard ahead of time
    await page.addInitScript(() => {
      localStorage.setItem('aetheris_onboarding_completed', 'true');
      localStorage.setItem('aetheris_seed_verified', 'true');
      localStorage.setItem('urefy_home_intro_dismissed', 'true');
    });
  });

  test.afterEach(() => {
    try {
      sql?.close();
    } catch {}
  });

  test('registers a passkey using virtual authenticator and verifies persistence', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium virtual authenticator required for WebAuthn CDP testing');

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Enable CDP Virtual Authenticator
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });

    await page.goto('/');
    await page.waitForSelector('#main-stage', { state: 'attached' });

    // Open Settings -> Security tab directly
    await page.evaluate(() => {
      if ((window as any).settingsView) {
        (window as any).settingsView.open('security');
      }
    });

    // Locate and click the passkey registration button
    const regBtn = page.getByRole('button', { name: 'Register New Passkey' });
    await expect(regBtn).toBeVisible({ timeout: 5000 });
    await regBtn.click();

    // Verify success toast appears with hardware passkey notice
    const toast = page.getByText(/Hardware (pass)?key/i);
    await expect(toast.first()).toBeVisible({ timeout: 10000 });
    await expect(toast.first()).toContainText(/registered|success/i);

    // Verify credential persisted in localStorage
    const savedCreds = await page.evaluate(() => {
      const raw = localStorage.getItem('aetheris_webauthn_credentials_v1');
      return raw ? JSON.parse(raw) : [];
    });
    expect(savedCreds.length).toBeGreaterThan(0);
    expect(savedCreds[0]).toHaveProperty('id');
    expect(savedCreds[0]).toHaveProperty('deviceName');

    expect(errors).toEqual([]);
  });

  test('handles passkey cancellation adversarially without fake success state', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium virtual authenticator required for WebAuthn CDP testing');

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForSelector('#main-stage', { state: 'attached' });

    // Mock navigator.credentials.create to simulate user clicking "Cancel" in browser dialog
    await page.evaluate(() => {
      navigator.credentials.create = async () => {
        const err = new DOMException('The operation was canceled.', 'NotAllowedError');
        throw err;
      };
    });

    // Open Settings -> Security tab directly
    await page.evaluate(() => {
      if ((window as any).settingsView) {
        (window as any).settingsView.open('security');
      }
    });

    const regBtn = page.getByRole('button', { name: 'Register New Passkey' });
    await expect(regBtn).toBeVisible({ timeout: 5000 });
    await regBtn.click();

    // Adversarial verification: Assert that NO fake success message appears!
    await page.waitForTimeout(500);
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('Passkey registration completed.');

    // Assert that a clear cancellation notice or warning is shown
    const toast = page.getByText(/cancell?ed|not completed|Failed to register key/i);
    await expect(toast.first()).toBeVisible();

    // Verify no ghost credentials were saved in localStorage
    const savedCreds = await page.evaluate(() => {
      const raw = localStorage.getItem('aetheris_webauthn_credentials_v1');
      return raw ? JSON.parse(raw) : [];
    });
    expect(savedCreds.length).toBe(0);

    expect(errors).toEqual([]);
  });

  test('FIDO2 hardware vault lock and unlock flow', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium virtual authenticator required for WebAuthn CDP testing');

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });

    await page.goto('/');
    await page.waitForSelector('#main-stage', { state: 'attached' });

    // Register a credential via WebAuthnManager with matching clientStore identity
    const regResult = await page.evaluate(async () => {
      let manager = (window as any).webAuthnManager;
      if (!manager) {
        for (let i = 0; i < 50; i++) {
          if ((window as any).webAuthnManager) {
            manager = (window as any).webAuthnManager;
            break;
          }
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      const cs = (window as any).clientStore;
      const fp = cs?.keypair?.fingerprint || 'sovereign_node';
      if (!manager) return { success: false, error: 'no webAuthnManager on window', hasCs: !!cs };
      try {
        const cred = await manager.registerCredential(fp, 'Virtual Security Key');
        return { success: !!cred, cred, error: null, isSupported: manager.isSupported };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e), isSupported: manager?.isSupported };
      }
    });
    expect(regResult.success, JSON.stringify(regResult)).toBe(true);

    // Lock the vault
    const isLocked = await page.evaluate(async () => {
      const manager = (window as any).webAuthnManager;
      await manager.lockVault();
      return manager.isVaultLocked();
    });
    expect(isLocked).toBe(true);

    // Unlock the vault using the virtual authenticator
    const isUnlocked = await page.evaluate(async () => {
      const manager = (window as any).webAuthnManager;
      const success = await manager.unlockVault();
      return success && !manager.isVaultLocked();
    });
    expect(isUnlocked).toBe(true);
  });
});
