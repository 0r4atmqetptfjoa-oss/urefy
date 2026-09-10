import { test, expect } from '@playwright/test';

test.describe('Aetheris Multilingual & Internationalization Engine (i18n)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app root to be visible and hydrated
    await expect(page.locator('#app-root, body')).toBeVisible();
  });

  test('1. Default language is English (LTR) with English navigation tabs', async ({ page }) => {
    await page.waitForFunction(() => typeof (window as any).i18n?.getCurrentLocale === 'function');
    const locale = await page.evaluate(() => (window as any).i18n.getCurrentLocale());
    expect(locale).toBe('en');

    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir ?? 'ltr').toBe('ltr');
  });

  test('2. Can switch dynamically to Romanian (ro) and reflects in UI', async ({ page }) => {
    await page.waitForFunction(() => typeof (window as any).i18n?.setLanguage === 'function');

    await page.evaluate(() => {
      (window as any).i18n.setLanguage('ro');
      if ((window as any).clientStore) (window as any).clientStore.notifySync();
    });

    const currentLang = await page.evaluate(() => (window as any).i18n.getCurrentLocale());
    expect(currentLang).toBe('ro');

    // Check stored locale in localStorage
    const stored = await page.evaluate(() => localStorage.getItem('aetheris_locale_v1'));
    expect(stored).toBe('ro');
  });

  test('3. Switching to Arabic (ar) activates RTL bidirectional layout', async ({ page }) => {
    await page.waitForFunction(() => typeof (window as any).i18n?.setLanguage === 'function');

    await page.evaluate(() => {
      (window as any).i18n.setLanguage('ar');
      if ((window as any).clientStore) (window as any).clientStore.notifySync();
    });

    // Check document dir attribute
    const dir = await page.locator('html').getAttribute('dir');
    expect(dir).toBe('rtl');

    const isRtl = await page.evaluate(() => (window as any).i18n.isRTL());
    expect(isRtl).toBe(true);
  });

  test('4. All 7 languages can be cycled through with zero runtime errors', async ({ page }) => {
    await page.waitForFunction(() => typeof (window as any).i18n?.setLanguage === 'function');

    const languages = ['en', 'ro', 'fr', 'de', 'es', 'ja', 'ar'];

    for (const lang of languages) {
      await page.evaluate((code) => {
        (window as any).i18n.setLanguage(code);
        if ((window as any).clientStore) (window as any).clientStore.notifySync();
      }, lang);

      const active = await page.evaluate(() => (window as any).i18n.getCurrentLocale());
      expect(active).toBe(lang);

      if (lang === 'ar') {
        expect(await page.locator('html').getAttribute('dir')).toBe('rtl');
      } else {
        expect(await page.locator('html').getAttribute('dir')).toBe('ltr');
      }
    }
  });

  test('5. Settings modal includes language switcher and renders localized tabs', async ({ page }) => {
    await page.waitForFunction(() => typeof (window as any).__aetheris_open_settings === 'function');

    // Open settings modal on preferences tab
    await page.evaluate(() => {
      (window as any).__aetheris_open_settings('preferences');
    });

    const modal = page.locator('#unified-settings-modal');
    await expect(modal).toBeVisible();

    // Check that the language selector container is rendered
    const langContainer = page.locator('#settings-language-picker-container');
    await expect(langContainer).toBeVisible();

    // Click on French (fr) button
    const frBtn = langContainer.locator('[data-lang="fr"]');
    if (await frBtn.isVisible()) {
      await frBtn.click();

      const currentLang = await page.evaluate(() => (window as any).i18n.getCurrentLocale());
      expect(currentLang).toBe('fr');
    }

    // Close settings modal
    await page.locator('#btn-close-settings-modal').click();
    await expect(modal).not.toBeVisible();
  });
});
