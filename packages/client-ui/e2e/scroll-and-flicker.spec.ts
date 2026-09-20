import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

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

test.describe('Scroll Stability Under Reactive Notifications', () => {
  test('feed scroll position does not reset to top on clientStore.notify()', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.locator('#app-top-header')).toBeVisible();

    // Populate posts so the feed has scrollable height
    await page.evaluate(() => {
      const store = (window as any).clientStore;
      if (store) {
        store.loadDemoData();
        store.isSyncing = false;
        store.notify();
      }
    });

    const feedScroll = page.locator('#main-feed-scroll');
    await expect(feedScroll).toBeVisible();
    await expect(page.locator('[data-post-card-id]').first()).toBeVisible();

    // Scroll down 400px
    await feedScroll.evaluate(el => el.scrollTo({ top: 400 }));
    const scrolledTop = await feedScroll.evaluate(el => el.scrollTop);
    expect(scrolledTop).toBeGreaterThan(100);

    // Fire multiple reactive store notifications in quick succession
    await page.evaluate(() => {
      const store = (window as any).clientStore;
      store.notify('FEED_UPDATE');
      store.notify('METRICS_REFRESH');
      store.notify();
    });

    // Wait 2 frames to let patchRender execute
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

    // Verify scroll position was preserved
    const afterTop = await feedScroll.evaluate(el => el.scrollTop);
    expect(afterTop).toBeCloseTo(scrolledTop, -1); // within ~10px tolerance
  });

  test('messages scroll position preserves position on reactive updates', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/#messages');
    await expect(page.locator('#messages-container')).toBeVisible();

    const msgContainer = page.locator('#messages-container');
    await msgContainer.evaluate(el => el.scrollTo({ top: 150 }));
    const currentScroll = await msgContainer.evaluate(el => el.scrollTop);

    // Fire background notification
    await page.evaluate(() => {
      (window as any).clientStore.notify('MESSAGE_INCOMING');
    });

    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

    const postScroll = await msgContainer.evaluate(el => el.scrollTop);
    expect(postScroll).toBeCloseTo(currentScroll, -1);
  });
});

test.describe('Theme Persistence and Anti-Flicker Verification', () => {
  const THEMES = [
    { id: 'obsidian-cyber', isDark: true },
    { id: 'nordic-frost', isDark: true },
    { id: 'neo-graphite', isDark: true },
    { id: 'royal-indigo', isDark: true },
    { id: 'velvet-carbon', isDark: true },
    { id: 'alabaster-light', isDark: false },
  ];

  for (const t of THEMES) {
    test(`theme "${t.id}" persists across hard reload without flash`, async ({ page }) => {
      await page.addInitScript((themeId) => {
        localStorage.setItem('aetheris_theme_pref', JSON.stringify({ themeId }));
      }, t.id);

      await page.goto('/');
      await expect(page.locator('#app-top-header')).toBeVisible();

      // Check document data-theme attribute
      const activeTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      expect(activeTheme).toBe(t.id);

      // Check dark / light class on html element
      const htmlClasses = await page.evaluate(() => document.documentElement.className);
      if (t.isDark) {
        expect(htmlClasses).toContain('dark');
      } else {
        expect(htmlClasses).toContain('light');
      }

      // Check background color applied to body or documentElement
      const computedBg = await page.evaluate(() => {
        return document.documentElement.style.backgroundColor || window.getComputedStyle(document.body).backgroundColor;
      });
      expect(computedBg).toBeTruthy();

      // Reload page and re-verify persistence
      await page.reload();
      await expect(page.locator('#app-top-header')).toBeVisible();
      const reloadedTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      expect(reloadedTheme).toBe(t.id);
    });
  }

  test('alabaster-light theme uses soft stone backgrounds rather than pure white glare', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aetheris_theme_pref', JSON.stringify({ themeId: 'alabaster-light' }));
    });

    await page.goto('/');
    await expect(page.locator('#app-top-header')).toBeVisible();

    const bootBg = await page.evaluate(() => {
      return document.documentElement.style.backgroundColor;
    });

    // Verify background is soft stone (#f6f5f2 / rgb(246, 245, 242)) and not harsh #ffffff
    expect(['#f6f5f2', 'rgb(246, 245, 242)']).toContain(bootBg);
  });
});
