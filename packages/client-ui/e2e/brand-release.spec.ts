import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

test.use({ serviceWorkers: 'block' });

test('onboarding and public tools display only UREfy product branding', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.addInitScript(() => {
    localStorage.setItem('aetheris_proactive_ai_enabled', 'false');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  });
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { success: false, error: 'Service unavailable for UI-only verification' } }));
  await page.goto('/');
  await expect(page.getByText('UREfy // SOVEREIGN WELCOME', { exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/\baetheris\b/i);
  await page.locator('#btn-skip-onboarding').click();
  await expect(page.locator('#app-top-header')).toBeVisible();
  if (await page.locator('#main-layout').getAttribute('data-ui-mode') !== 'sovereign') {
    await page.locator('#btn-rail-more').click();
    await page.locator('#btn-toggle-advanced-sidebar').click();
  }
  for (const [button, modal] of [
    ['nav-btn-dao', 'governance-modal-backdrop'],
    ['btn-open-rss-panel', 'rss-modal-backdrop'],
    ['btn-open-cve-monitor', 'cve-modal-backdrop'],
    ['btn-open-gossip-viz', 'gossip-modal-backdrop'],
    ['btn-open-backup-export', 'export-modal-backdrop'],
  ]) {
    await page.locator(`#${button}`).click();
    await expect(page.locator(`#${modal}`)).toBeVisible();
    await expect(page.locator(`#${modal}`)).not.toContainText(/\baetheris\b/i);
    await page.locator(`#${modal} button[data-action="close-feature"]`).click();
  }
  const legacyAttributes = await page.locator('[title], [aria-label], [placeholder], [alt]').evaluateAll(elements => elements.flatMap(element =>
    ['title', 'aria-label', 'placeholder', 'alt'].map(name => element.getAttribute(name) ?? '').filter(value => /\baetheris\b/i.test(value))));
  expect(legacyAttributes).toEqual([]);
  await expect(page).toHaveTitle(/UREfy/);
});

test('PWA screenshots show the rendered UREfy workspace on desktop and mobile', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
    localStorage.setItem('aetheris_proactive_ai_enabled', 'false');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  });
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { success: false } }));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/#feed');
  await expect(page.locator('#app-top-header')).toBeVisible();
  await page.locator('[data-testid="nav-item-feed"]').click();
  await expect(page.locator('#main-feed-scroll')).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page.locator('body')).not.toContainText(/\baetheris\b/i);
  if (process.env.UPDATE_PWA_SCREENSHOTS === '1') {
    await page.screenshot({ path: fileURLToPath(new URL('../public/screenshot-desktop.png', import.meta.url)), animations: 'disabled' });
  }
  await page.setViewportSize({ width: 540, height: 960 });
  await expect(page.locator('#native-mobile-tab-bar')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.UPDATE_PWA_SCREENSHOTS === '1') {
    await page.screenshot({ path: fileURLToPath(new URL('../public/screenshot-mobile.png', import.meta.url)), animations: 'disabled' });
  }
});
