import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

test.use({ serviceWorkers: 'block' });

test('dashboard displays persisted counts, refresh failures, and reports on desktop and mobile', async ({ page }) => {
  let failed = false;
  let version = 1;
  const now = Date.now();
  const overview = () => ({ observedAt: now, source: 'Cloudflare D1', counts: { identities: 7, posts: version * 123, messages: 45, channels: 3, pendingReports: 2 },
    unavailable: [], activity: Array.from({ length: 24 }, (_, i) => ({ hour: Math.floor(now / 3600000) * 3600000 - (23 - i) * 3600000, posts: i % 3, messages: i % 5 })) });
  await page.route('**/api/admin*', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('action') === 'stats') return route.fulfill({ json: { success: true } });
    await route.fulfill({ status: failed ? 503 : 200, json: failed ? { success: false } : {
      success: true, overview: overview(), users: [], channels: [], posts: [], bannedIPs: [], logs: [],
    } });
  });
  await page.route('**/api/report*', route => route.fulfill({ json: { reports: [] } }));
  await page.goto('/admin.html');
  await page.getByText('Emergency Break-Glass & Dev Override', { exact: false }).click();
  await page.locator('#login-pin-input').fill('test-only-pin');
  await page.locator('#btn-login-submit').click();
  await expect(page.locator('[data-overview-metric="posts"]')).toContainText('123');
  await expect(page.locator('#admin-overview')).toContainText('Not connected');
  await expect(page.locator('#admin-overview')).not.toContainText('148,920');
  await page.locator('#btn-admin-toggle-autosync').click();
  version = 2;
  await page.locator('#btn-admin-refresh-now').click();
  await expect(page.locator('[data-overview-metric="posts"]')).toContainText('246');
  failed = true;
  await page.locator('#btn-admin-refresh-now').click();
  await expect(page.locator('#admin-overview-status')).toContainText('last successful snapshot');
  await expect(page.locator('[data-overview-metric="posts"]')).toContainText('246');
  failed = false;
  await page.locator('#btn-admin-refresh-now').click();
  await expect(page.locator('#admin-overview-status')).toContainText('Snapshot updated');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect.poll(() => page.locator('#admin-tab-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: fileURLToPath(new URL(`../../../artifacts/admin-overview-${width}.png`, import.meta.url)) });
  }
  await page.getByRole('button', { name: 'Open reports', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'EU DSA Notice & Takedown Queue (Art. 16)', exact: true })).toBeVisible();
});
