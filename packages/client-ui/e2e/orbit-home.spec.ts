import { expect, test } from '@playwright/test';

async function expectReadableHeading(page: import('@playwright/test').Page): Promise<void> {
  // Assert the accessibility requirement instead of a retired theme's exact RGB.
  await expect.poll(() => page.locator('.view-header h1').evaluate(element => {
    const luminance = (value: string) => {
      const numbers = value.match(/[\d.]+/g);
      if (!numbers || numbers.length < 3) return NaN;
      const rgb = numbers.slice(0, 3).map(value => { const c = Number(value) / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    const foreground = luminance(getComputedStyle(element).color);
    const background = luminance(getComputedStyle(element.closest('.view-header')!).backgroundColor);
    return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
  })).toBeGreaterThanOrEqual(4.5);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
    localStorage.setItem('aetheris_dismissed_suggestions', '["low_vault_entropy","dao_quorum_near","guardian_inactive"]');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  });
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { success: false, error: 'Offline UI test' } }));
  await page.goto('/');
  await expect(page.locator('.quick-composer')).toBeVisible();
});

test('empty workspace has useful actions without simulated social proof', async ({ page }) => {
  await expect(page.locator('#since-you-were-away-card')).toHaveCount(0);
  await expect(page.locator('.orbit-signal')).toHaveCount(0);
  await expect(page.locator('.horizon')).toHaveCount(0);
  await page.evaluate(() => {
    const store = (window as any).clientStore;
    if (store) {
      store.posts = [];
      store.isSyncing = false;
      store.notifySync();
    }
  });
  await page.getByRole('button', { name: 'Explore UREfy', exact: true }).click();
  await expect(page.locator('.explore-workspace')).toBeVisible();
});

test('community and saved shortcuts open their workspaces', async ({ page }) => {
  await page.locator('.orbit-shortcuts').getByRole('link', { name: 'Communities', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).clientStore?.activeChannelId)).toBe('communities');
  await page.reload();
  await expect.poll(() => page.evaluate(() => (window as any).clientStore?.activeChannelId)).toBe('communities');
  await page.locator('.urefy-brand').click();
  await page.getByRole('button', { name: 'Kept in Vault', exact: true }).click();
  await expect(page.locator('#memory-title')).toBeVisible();
});

test('light theme preserves the home panel contrast', async ({ page }) => {
  await page.evaluate(() => (window as any).themeEngine.setTheme('alabaster-light'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'alabaster-light');
  await expectReadableHeading(page);
  await expect(page.locator('.orbit-layout-tools')).toBeVisible();
});

test('available post opens its discussion and user text stays escaped', async ({ page }) => {
  await page.evaluate(() => {
    const store = (window as any).clientStore;
    store.posts = [{ id: 'orbit-test-post', createdAt: Date.now() - 1000, channelId: 'c/technology', title: 'Building <tomorrow> together', content: 'A real test conversation.', authorFingerprint: store.keypair.fingerprint, authorRole: 'MEMBER', flair: 'MICRO-PULSE', meritVotes: 0, userVoted: 0, replyCount: 0, boostCount: 0, isExpanded: false }];
    store.isSyncing = false;
    store.notifySync();
  });
  const radar = page.locator('.social-post__title a');
  await expect(radar).toContainText('Building <tomorrow> together');
  await expect(radar.locator('tomorrow')).toHaveCount(0);
  await expect(radar).toHaveAttribute('href', '/p/orbit-test-post');
  await page.locator('.social-post__body').click();
  await expect(page.locator('#btn-close-post-detail')).toBeVisible();
});

for (const width of [360, 390, 768, 1440]) {
  test(`home fits ${width}px with readable content and accessible layout controls`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    for (const selector of ['#app-top-header', '#main-feed-scroll', '.quick-composer', '.orbit-shortcuts']) {
      await expect.poll(() => page.locator(selector).evaluate(el => el.scrollWidth <= el.clientWidth), { message: `${selector} overflows at ${width}px` }).toBe(true);
    }
    await expect(page.locator('.horizon')).toHaveCount(0);
    await expectReadableHeading(page);
    await page.getByRole('button', { name: 'Focus layout', exact: true }).click();
    await expect(page.locator('body')).toHaveClass(/zen-mode-active/);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Standard layout', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
}
