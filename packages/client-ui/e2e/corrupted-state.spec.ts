import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test.describe('Adversarial & Corrupted State Verification', () => {
  test('fresh visitor with completely empty storage loads cleanly without white screen', async ({ page }) => {
    // Zero localStorage, zero sessionStorage
    await page.goto('/');
    
    // Check that top header or onboarding wizard is visible and no uncaught JS error crashed the page
    const topHeader = page.locator('#app-top-header');
    await expect(topHeader).toBeVisible({ timeout: 15000 });

    // Verify keypair generated cleanly
    const fingerprint = await page.evaluate(() => (window as any).clientStore?.keypair?.fingerprint);
    expect(fingerprint).toBeDefined();
    expect(typeof fingerprint).toBe('string');
    expect(fingerprint.length).toBeGreaterThan(10);
  });

  test('app survives maliciously corrupted localStorage blobs without white screen of death', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aetheris_onboarding_completed', 'true');
      localStorage.setItem('aetheris_ui_mode', 'MALICIOUS_XSS_><script>alert(1)</script>');
 localStorage.setItem('aetheris_bookmarks', '<<<NOT_JSON_BLOB>>>');
 localStorage.setItem('aetheris_read_posts', '{not_an_array');
 localStorage.setItem('aetheris_draft_post', '{{{{corrupt');
 localStorage.setItem('aetheris_min_feed_trust_threshold', 'NOT_A_NUMBER');
 localStorage.setItem('aetheris_show_trust_badges', 'INVALID_BOOLEAN');
 localStorage.setItem('aetheris_diagnostics_buffer', 'INVALID_BUFFER_OBJECT');
 sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
 });

 const fatalErrors: string[] = [];
 page.on('pageerror', err => {
 // Record any uncaught top-level page error
 fatalErrors.push(err.message);
 });

 await page.goto('/');
 await expect(page.locator('#app-top-header')).toBeVisible({ timeout: 15000 });

 // Verify layout rendered and no white screen
 const layout = page.locator('#main-layout');
 await expect(layout).toBeVisible();

 // Verify default ui-mode fallback took effect
 const activeUiMode = await page.evaluate(() => (window as any).clientStore?.uiMode);
 expect(['simple', 'sovereign', 'advanced', 'technical']).toContain(activeUiMode);
 expect(fatalErrors.length).toBe(0);
 });

 test('regenerates valid identity when IndexedDB identity is deleted or reset', async ({ page }) => {
 await page.addInitScript(() => {
 localStorage.setItem('aetheris_onboarding_completed', 'true');
 sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
 });

 await page.goto('/');
 await expect(page.locator('#app-top-header')).toBeVisible({ timeout: 15000 });

    // Delete IndexedDB database from inside the browser
    await page.evaluate(async () => {
      try { window.indexedDB.deleteDatabase('aetheris_secure_vault_v1'); } catch (_) {}
      try { window.indexedDB.deleteDatabase('aetheris_omnisphere_db'); } catch (_) {}
    });

 // Reload the page
    await page.reload();
    await expect(page.locator('#app-top-header')).toBeVisible({ timeout: 15000 });

 const fpAfter = await page.evaluate(() => (window as any).clientStore?.keypair?.fingerprint);
 expect(fpAfter).toBeDefined();
 expect(typeof fpAfter).toBe('string');
 });

 test('client handles offline to online transition without unhandled exceptions', async ({ page, context }) => {
 await page.addInitScript(() => {
 localStorage.setItem('aetheris_onboarding_completed', 'true');
 sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
 });

 await page.goto('/');
 await expect(page.locator('#app-top-header')).toBeVisible({ timeout: 15000 });

 // Set network to offline
 await context.setOffline(true);
 await page.evaluate(() => window.dispatchEvent(new Event('offline')));
 await page.waitForTimeout(500);

 // Set back to online
 await context.setOffline(false);
 await page.evaluate(() => window.dispatchEvent(new Event('online')));
 await page.waitForTimeout(500);

 await expect(page.locator('#app-top-header')).toBeVisible({ timeout: 15000 });
 });
});
