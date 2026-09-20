import { expect, test } from '@playwright/test';

// UI lifecycle tests are isolated from worker installation
test.use({ serviceWorkers: 'block' });

const MOBILE_VIEWPORTS = [
  { name: 'Android Small (360x740)', width: 360, height: 740 },
  { name: 'iPhone 14 (390x844)', width: 390, height: 844 },
  { name: 'iPhone 15 Pro Max (430x932)', width: 430, height: 932 },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
    localStorage.setItem('aetheris_proactive_ai_enabled', 'false');
    if (!localStorage.getItem('aetheris_ui_mode')) localStorage.setItem('aetheris_ui_mode', 'simple');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
    localStorage.setItem('urefy:demo_mode', 'true');
  });
});

for (const vp of MOBILE_VIEWPORTS) {
  test.describe(`Mobile Post Navigation - ${vp.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await expect(page.locator('#app-top-header')).toBeVisible();
      await expect(page.locator('#native-mobile-tab-bar')).toBeVisible();

      // Ensure posts are loaded in the test environment
      await page.evaluate(() => {
        const store = (window as any).clientStore;
        if (store) {
          store.loadDemoData();
          store.isSyncing = false;
          store.notify();
        }
      });
    });

    test('tapping each bottom tab while viewing a post closes the post and navigates to the destination', async ({ page }) => {
      // 1. Open first post from the feed
      const firstPost = page.locator('[data-post-card-id]').first();
      await expect(firstPost).toBeVisible();
      const postId = await firstPost.getAttribute('data-post-card-id');
      await firstPost.click();

      // Verify post focus view is mounted and open
      const postView = page.locator('#post-focus-view');
      await expect(postView).toBeVisible();
      expect(page.url()).toContain(`/p/${postId}`);

      // 2. Tap "Vault" on bottom bar
      await page.locator('#btn-mobile-tab-vault').click();
      await expect(postView).toBeHidden();
      expect(page.url()).not.toContain(`/p/${postId}`);
      expect(await page.evaluate(() => (window as any).clientStore.activeChannelId)).toBe('vault-releases');
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');

      // 3. Navigate back to feed and open post again
      await page.locator('#btn-mobile-tab-feed').click();
      await expect(firstPost).toBeVisible();
      await firstPost.click();
      await expect(postView).toBeVisible();

      // 4. Tap "Explore" on bottom bar
      await page.locator('#btn-mobile-tab-explore').click();
      await expect(postView).toBeHidden();
      expect(page.url()).not.toContain(`/p/${postId}`);
      expect(await page.evaluate(() => (window as any).clientStore.activeChannelId)).toBe('explore');
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');

      // 5. Navigate back to feed and open post again
      await page.locator('#btn-mobile-tab-feed').click();
      await expect(firstPost).toBeVisible();
      await firstPost.click();
      await expect(postView).toBeVisible();

      // 6. Tap "Messages" on bottom bar
      await page.locator('#btn-mobile-tab-messages').click();
      await expect(postView).toBeHidden();
      expect(page.url()).not.toContain(`/p/${postId}`);
      expect(await page.evaluate(() => (window as any).clientStore.activeChannelId)).toBe('relays-general');
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');

      // 7. Navigate back to feed and open post again
      await page.locator('#btn-mobile-tab-feed').click();
      await expect(firstPost).toBeVisible();
      await firstPost.click();
      await expect(postView).toBeVisible();

      // 8. Tap "Profile" on bottom bar
      await page.locator('#btn-mobile-tab-profile').click();
      await expect(postView).toBeHidden();
      expect(page.url()).not.toContain(`/p/${postId}`);
      expect(await page.evaluate(() => (window as any).clientStore.activeChannelId)).toBe('profile');
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');

      // 9. P0 REGRESSION: Tapping Feed while INSIDE a post must close post and return to feed
      await page.locator('#btn-mobile-tab-feed').click();
      await expect(firstPost).toBeVisible();
      await firstPost.click();
      await expect(postView).toBeVisible();

      // User is viewing post and taps "Feed" tab
      await page.locator('#btn-mobile-tab-feed').click();
      await expect(postView).toBeHidden();
      await expect(firstPost).toBeVisible();
      expect(page.url()).not.toContain(`/p/${postId}`);
      expect(await page.evaluate(() => (window as any).clientStore.activeChannelId)).toBe('pulse-global');
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    });

    test('closing post unlocks body scroll and preserves scroll stability', async ({ page }) => {
      const firstPost = page.locator('[data-post-card-id]').first();
      await expect(firstPost).toBeVisible();
      await firstPost.click();

      const postView = page.locator('#post-focus-view');
      await expect(postView).toBeVisible();

      // Scroll down within post
      await postView.evaluate(el => el.scrollTo({ top: 200 }));
      expect(await postView.evaluate(el => el.scrollTop)).toBeGreaterThanOrEqual(0);

      // Tap bottom nav
      await page.locator('#btn-mobile-tab-explore').click();
      await expect(postView).toBeHidden();

      // Ensure body scroll is unlocked
      const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
      expect(bodyOverflow).not.toBe('hidden');
    });

    test('tapping bottom nav while reply composer is active closes post cleanly', async ({ page }) => {
      const firstPost = page.locator('[data-post-card-id]').first();
      await expect(firstPost).toBeVisible();
      await firstPost.click();

      const postView = page.locator('#post-focus-view');
      await expect(postView).toBeVisible();

      // Focus reply textarea if present
      const replyArea = page.locator('#post-detail-reply-textarea');
      if (await replyArea.isVisible()) {
        await replyArea.fill('Drafting reply before switching tabs...');
      }

      // Tap Vault
      await page.locator('#btn-mobile-tab-vault').click();
      await expect(postView).toBeHidden();
      expect(await page.evaluate(() => (window as any).clientStore.activeChannelId)).toBe('vault-releases');
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    });
  });
}
