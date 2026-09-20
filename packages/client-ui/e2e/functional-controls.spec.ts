import { expect, test } from '@playwright/test';

// UI lifecycle tests are isolated from worker installation; pwa-runtime.spec.ts
// exercises service-worker caching and offline behavior explicitly.
test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
    localStorage.setItem('aetheris_proactive_ai_enabled', 'false');
    if (!localStorage.getItem('aetheris_ui_mode')) localStorage.setItem('aetheris_ui_mode', 'simple');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  });
  await page.goto('/');
  await expect(page.locator('#app-top-header')).toBeVisible();
});

test('mobile drawer navigates repeatedly between Vault, Feed and Profile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [mode, channel] of [['vault', 'vault-releases'], ['pulse', 'pulse-global'], ['profile', 'profile']]) {
    await page.locator('#btn-toggle-mobile-drawer').click();
    await page.locator(`#mobile-drawer [data-nav-mode="${mode}"]`).click();
    await expect.poll(() => page.evaluate(() => (window as any).clientStore.activeChannelId)).toBe(channel);
  }
});

test('relay emojis follow the cursor and replace the selected text', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.locator('[data-testid="nav-item-messages"]').click();
  const input = page.locator('#input-message');
  for (const [start, end, expected] of [[0, 0, '😊hello world'], [6, 6, 'hello 😊world'], [11, 11, 'hello world😊'], [6, 11, 'hello 😊']] as const) {
    await input.fill('hello world');
    await input.evaluate((element: HTMLInputElement, range) => {
      element.setSelectionRange(range[0], range[1]);
      element.dispatchEvent(new Event('select', { bubbles: true }));
    }, [start, end]);
    await page.locator('[data-action="toggle-relay-emoji"]').first().focus();
    await page.evaluate(() => (window as any).clientStore.notifySync());
    await page.locator('[data-action="toggle-relay-emoji"]').first().click();
    await page.locator('[data-action="insert-relay-emoji"][data-emoji="😊"]').click();
    await expect(input).toHaveValue(expected);
    await expect.poll(() => input.evaluate((element: HTMLInputElement) => element.selectionStart)).toBe(start + 2);
  }
});

test('interface mode changes visible tools and survives a reload', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  const advancedTools = page.locator('#left-rail-scroll > [aria-label="Advanced tools"]');
  await expect(advancedTools).toBeHidden();
  await page.locator('#btn-rail-more').click();
  await page.locator('#btn-toggle-advanced-sidebar').click();
  await expect(page.locator('#main-layout')).toHaveAttribute('data-ui-mode', 'sovereign');
  await expect(advancedTools).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('aetheris_ui_mode'))).toBe('sovereign');
  await page.reload();
  await expect(page.locator('#main-layout')).toHaveAttribute('data-ui-mode', 'sovereign');
  await expect(advancedTools).toBeVisible();
  await page.locator('#btn-return-simple-sidebar').click();
  await expect(advancedTools).toBeHidden();
});

test('profile settings retain the selected section and its scroll position', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.locator('[data-testid="nav-item-profile"]').click();
  await page.locator('#btn-profile-settings').click();
  await page.locator('#btn-settings-cat-security').click();
  await expect(page.locator('[data-settings-section="security"]')).toBeVisible();
  await expect(async () => {
    await page.locator('#profile-settings-nav').scrollIntoViewIfNeeded();
  }).toPass({ timeout: 5000 });
  const before = await page.locator('#sovereign-profile-container').evaluate(element => element.scrollTop);
  await page.locator('#btn-settings-cat-privacy').click();
  await expect(page.locator('[data-settings-section="privacy"]')).toBeVisible();
  await expect(page.locator('#btn-settings-cat-privacy')).toHaveAttribute('aria-selected', 'true');
  const after = await page.locator('#sovereign-profile-container').evaluate(element => element.scrollTop);
  expect(after).toBeGreaterThanOrEqual(Math.min(before, 100));
});

test('wallet tabs and close controls work without a fabricated account', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some(entry => /wallet-vendor-/.test(entry.name)))).toBe(false);
  await page.locator('#btn-rail-more').click();
  await page.locator('#btn-toggle-advanced-sidebar').click();
  await page.locator('#rail-wallet').click();
  await expect(page.getByText('Wallet not connected', { exact: true })).toBeVisible();
  for (const tab of ['signatures', 'token-gate', 'networks', 'identity']) {
    await page.locator(`[data-action="set-wallet-tab"][data-tab="${tab}"]`).click();
    await expect.poll(() => page.evaluate(() => (window as any).walletBridge.activeTab)).toBe(tab);
  }
  await page.locator('#btn-close-wallet-bridge').click();
  await expect(page.locator('#btn-close-wallet-bridge')).toBeHidden();
});

test('encrypted identity and API signer survive a complete page reload', async ({ page }) => {
  const before = await page.evaluate(async () => {
    const store = (window as any).clientStore;
    await store.identityPersistence;
    return { fingerprint: store.keypair.fingerprint, signer: store.sovereignIdentity.fingerprint };
  });
  await page.reload();
  await expect(page.locator('#app-top-header')).toBeVisible();
  const after = await page.evaluate(async () => {
    const store = (window as any).clientStore;
    await store.identityPersistence;
    return { fingerprint: store.keypair.fingerprint, signer: store.sovereignIdentity.fingerprint };
  });
  expect(after).toEqual(before);
});

test('product branding never rewrites user content', async ({ page }) => {
  await page.evaluate(() => {
    const container = document.createElement('div');
    container.id = 'branding-regression';
    container.innerHTML = '<article title="Aetheris Network">Aetheris Network</article><input placeholder="Aetheris"><span data-product-brand>Aetheris<span>Aetheris user content</span></span>';
    document.body.append(container);
  });
  const container = page.locator('#branding-regression');
  await expect(container.locator('[data-product-brand]')).toHaveText('UREfyAetheris user content');
  await expect(container.locator('article')).toHaveText('Aetheris Network');
  await expect(container.locator('article')).toHaveAttribute('title', 'Aetheris Network');
  await expect(container.locator('input')).toHaveAttribute('placeholder', 'Aetheris');
});

test('advanced tools repeatedly open and close their own modal', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.locator('#btn-rail-more').click();
  await page.locator('#btn-toggle-advanced-sidebar').click();
  for (const [button, modal] of [
    ['btn-open-rss-panel', 'rss-modal-backdrop'],
    ['btn-open-cve-monitor', 'cve-modal-backdrop'],
    ['btn-open-gossip-viz', 'gossip-modal-backdrop'],
    ['btn-open-backup-export', 'export-modal-backdrop'],
  ]) {
    for (let iteration = 0; iteration < 2; iteration++) {
      await page.locator(`#${button}`).click();
      await expect(page.locator(`#${modal}`)).toBeVisible();
      await page.locator(`#${modal} button[data-action="close-feature"]`).click();
      await expect(page.locator(`#${modal}`)).toBeHidden();
    }
  }
});
