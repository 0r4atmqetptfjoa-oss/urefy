import { expect, test } from '@playwright/test';

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
  await expect(page.locator('.horizon')).toBeVisible();
});

test('empty workspace has useful actions without simulated social proof', async ({ page }) => {
  await expect(page.locator('.orbit-connection')).toHaveText('Local workspace');
  await expect(page.locator('#since-you-were-away-card')).toHaveCount(0);
  await expect(page.locator('.orbit-signal')).toHaveCount(0);
  await expect(page.locator('.horizon')).toContainText('Your orbit.');
  await page.getByRole('button', { name: 'Find your next idea' }).click();
  await expect(page.locator('.explore-workspace')).toBeVisible();
});

test('community and saved shortcuts open their workspaces', async ({ page }) => {
  await page.getByRole('button', { name: 'Find your people Explore communities' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).clientStore.activeChannelId)).toBe('communities');
  await page.reload();
  await expect.poll(() => page.evaluate(() => (window as any).clientStore?.activeChannelId)).toBe('communities');
  await page.locator('.urefy-brand').click();
  await page.getByRole('button', { name: 'Keep the good stuff Open saved posts' }).click();
  await expect(page.locator('#bookmarks-vault-modal')).toBeVisible();
});

test('light theme preserves the home panel contrast', async ({ page }) => {
  await page.evaluate(() => (window as any).themeEngine.setTheme('alabaster-light'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'alabaster-light');
  await expect(page.locator('#horizon-title')).toHaveCSS('color', 'rgb(23, 57, 46)');
  await expect(page.locator('.orbit-layout-tools')).toBeVisible();
});

test('available post becomes a working radar link and user text stays escaped', async ({ page }) => {
  await page.evaluate(() => {
    const store = (window as any).clientStore;
    store.posts = [{ id: 'orbit-test-post', createdAt: Date.now() - 1000, channelId: 'c/technology', title: 'Building <tomorrow> together', content: 'A real test conversation.', authorFingerprint: store.keypair.fingerprint, authorRole: 'MEMBER', flair: 'MICRO-PULSE', meritVotes: 0, userVoted: 0, replyCount: 0, boostCount: 0, isExpanded: false }];
    store.isSyncing = false;
    store.notifySync();
  });
  const radar = page.locator('.orbit-signal');
  await expect(radar).toContainText('Building <tomorrow> together');
  await expect(radar.locator('tomorrow')).toHaveCount(0);
  await radar.click();
  await expect(page.locator('#btn-close-post-detail')).toBeVisible();
});

for (const width of [360, 390, 768, 1440]) {
  test(`home fits ${width}px with readable hero and accessible layout controls`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    for (const selector of ['#app-top-header', '#main-feed-scroll', '.horizon__copy', '.orbit-shortcuts']) {
      await expect.poll(() => page.locator(selector).evaluate(el => el.scrollWidth <= el.clientWidth), { message: `${selector} overflows at ${width}px` }).toBe(true);
    }
    await expect(page.locator('.horizon')).toHaveCSS('overflow', 'hidden');
    await expect(page.locator('#horizon-title')).toHaveCSS('color', 'rgb(23, 57, 46)');
    await page.getByRole('button', { name: 'Focus layout', exact: true }).click();
    await expect(page.locator('body')).toHaveClass(/zen-mode-active/);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Standard layout', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
}
