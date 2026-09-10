import { expect, test } from '@playwright/test';

test('push invitation stays dismissed after Later and reload', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
  });
  await page.route('**/api/**', (route) => route.fulfill({ status: 503, json: { success: false, error: 'Offline UI test' } }));
  await page.goto('/');
  const banner = page.locator('#sovereign-push-opt-in-banner');
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Later', exact: true }).click();
  await expect(banner).toBeHidden();
  expect(await page.evaluate(() => sessionStorage.getItem('aetheris_push_banner_dismissed'))).toBe('1');
  await page.reload();
  await expect(page.locator('#app-top-header')).toBeVisible();
  await expect(banner).toBeHidden();
});