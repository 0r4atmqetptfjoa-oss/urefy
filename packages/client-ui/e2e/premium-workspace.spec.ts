import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  });
  await page.route('**/api/**', (route) => route.fulfill({ status: 503, json: { success: false, error: 'Offline UI test' } }));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await expect(page.locator('#app-top-header')).toBeVisible();
});

test('desktop shell has a usable search field and no duplicate navigation', async ({ page }) => {
  await expect(page.locator('#left-rail-container')).toBeVisible();
  await expect(page.locator('#header-primary-nav')).toBeHidden();
  await expect(page.locator('#btn-toggle-mobile-drawer')).toBeHidden();
  const search = await page.locator('#btn-open-command-rail').boundingBox();
  expect(search?.width).toBeGreaterThan(200);
  const overflow = await page.locator('#app-top-header').evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(overflow).toBe(false);
});

test('focus can be entered and exited by keyboard without stale state', async ({ page }) => {
  const focus = page.getByRole('button', { name: 'Focus layout', exact: true });
  await focus.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveClass(/zen-mode-active/);
  await expect(page.locator('#left-rail-container')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Standard layout', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#left-rail-container')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('urefy_workspace_layout'))).toBe('standard');
});

test('split layout survives reload and can return to standard', async ({ page }) => {
  await page.getByRole('button', { name: 'Split workspace', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Split workspace', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Standard layout', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Standard layout', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('chat preserves message newlines without template whitespace', async ({ page }) => {
  await page.locator('[data-testid="nav-item-messages"]').click();
  await page.evaluate(() => {
    const store = (window as any).clientStore;
    store.messages.set(store.activeChannelId, [{
      id: 'whitespace-rendering-fixture', channelId: store.activeChannelId,
      authorFingerprint: store.keypair.fingerprint, text: 'First line\nSecond line',
      epoch: 'test', status: 'local-only', createdAt: Date.now(), isMine: true,
    }]);
    store.notifySync();
  });
  const message = page.locator('.message-body').first();
  await expect(message).toBeVisible();
  await expect(message).toHaveCSS('white-space', 'normal');
  await expect(message.locator('.whitespace-pre-wrap')).toHaveCSS('white-space', 'pre-wrap');
});

for (const width of [360, 390, 768]) {
  test(`mobile navigation and header fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('#native-mobile-tab-bar')).toBeVisible();
    await expect(page.locator('#left-rail-container')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const header = page.locator('#app-top-header');
    expect(await header.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    for (const selector of ['#btn-toggle-mobile-drawer', '#btn-mobile-search-trigger', '#btn-toggle-notifs']) {
      const bounds = await page.locator(selector).boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
    }
    await page.locator('#native-mobile-tab-bar').getByRole('button', { name: 'Feed', exact: true }).click();
    await expect(page.locator('#main-feed-scroll')).toBeVisible();
  });
}