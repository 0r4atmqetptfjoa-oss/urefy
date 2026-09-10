import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  });
  await page.goto('/');
  await expect(page.locator('#app-top-header')).toBeVisible();
});

test('public metadata uses real PNG assets and shortcuts reach their workspace', async ({ page, request }) => {
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://urefy.com/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://urefy.com/icon-512.png');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icon-192.png');
  const manifestResponse = await request.get('/manifest.json');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  for (const icon of manifest.icons.filter((icon: { type: string }) => icon.type === 'image/png')) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    const bytes = await response.body();
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(icon.sizes);
  }
  const channels: Record<string, string> = { Feed: 'pulse-global', Messages: 'relays-general', Vault: 'vault-releases' };
  expect(manifest.shortcuts).toHaveLength(3);
  for (const shortcut of manifest.shortcuts) {
    await page.goto(shortcut.url);
    await expect.poll(() => page.evaluate(() => (window as any).clientStore.activeChannelId)).toBe(channels[shortcut.name]);
  }
});

test('installed worker supports offline reload without caching private endpoints', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit does not support Service Worker controllers');
  test.setTimeout(45000);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? ''), { timeout: 15000 }).toContain('/sw.js');
  const before = await page.evaluate(async () => {
    const store = (window as any).clientStore;
    await store.identityPersistence;
    return store.keypair.fingerprint;
  });
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('requestfailed', request => failures.push(`${new URL(request.url()).pathname}: ${request.failure()?.errorText}`));
  const cachedPaths = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async key =>
    (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)))).flat());
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#app-top-header'), JSON.stringify({ failures, cachedPaths })).toBeVisible();
  expect(await page.evaluate(() => (window as any).clientStore.keypair.fingerprint)).toBe(before);
  const cachedPrivate = await page.evaluate(async () => {
    const keys = await caches.keys();
    const urls = (await Promise.all(keys.map(async key => (await (await caches.open(key)).keys()).map(request => request.url)))).flat();
    return urls.filter(url => /\/api\/(direct-messages|messages|auth|admin|recovery)/.test(url));
  });
  expect(cachedPrivate).toEqual([]);
  await context.setOffline(false);
});