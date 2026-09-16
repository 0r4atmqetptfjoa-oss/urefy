import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
    localStorage.setItem('aetheris_dismissed_suggestions', '["low_vault_entropy","dao_quorum_near","guardian_inactive"]');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  });
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { success: false, error: 'Offline test' } }));
});

test('every directory category has results and combined filters can be reset', async ({ page }) => {
  await page.goto('/#communities');
  const categories = page.locator('.discovery-category-list button');
  await expect(categories.first()).toBeVisible();
  const names = await categories.allTextContents();
  for (const name of names) {
    await page.getByRole('group', { name: 'Community topics' }).getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.discovery-space').first()).toBeVisible();
  }
  await page.getByRole('textbox', { name: 'Search communities' }).fill('no-matching-community-123');
  await expect(page.locator('.discovery-space')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.locator('.discovery-space').first()).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search communities' })).toHaveValue('');
});

test('joining updates membership, persists on reload, and community links restore the correct space', async ({ page }) => {
  await page.goto('/#communities');
  const join = page.locator('.discovery-space button[aria-pressed="false"]').first();
  await expect(join).toBeVisible();
  const label = await join.getAttribute('aria-label');
  const name = label!.replace('Join c/', '');
  await join.click();
  await page.getByRole('button', { name: /^My communities/ }).click();
  const card = page.locator('.discovery-space').filter({ has: page.getByRole('button', { name: `Leave c/${name}`, exact: true }) });
  await expect(card).toBeVisible();
  await card.locator('.discovery-space__identity').click();
  await expect(page).toHaveURL(new RegExp(`#communities/${name}$`));
  await page.reload();
  await expect(page.locator('#community-view-workspace h1')).toBeVisible();
  await expect(page.locator('.discovery-breadcrumb')).toContainText(`c/${name}`);
  await page.getByRole('button', { name: 'All communities', exact: true }).click();
  await expect(page.getByRole('button', { name: `Leave c/${name}`, exact: true })).toBeVisible();
});

test('search keeps typing out of history, commits on Enter, and clears safely', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#explore');
  await expect(page.locator('.topic-card')).toHaveCount(0);
  const input = page.getByRole('searchbox', { name: 'Search UREfy' });
  await input.fill('privacy');
  expect(await page.evaluate(() => localStorage.getItem('aetheris_recent_searches_v1'))).toBeNull();
  await input.press('Enter');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aetheris_recent_searches_v1') || '[]'))).toEqual(['privacy']);
  await page.getByRole('button', { name: 'Clear search', exact: true }).first().click();
  await expect(input).toHaveValue('');
  await page.getByRole('tab', { name: 'All communities', exact: true }).click();
  await expect(page.locator('.discovery-space').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Technology', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Technology', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'All communities', exact: true })).toHaveAttribute('aria-selected', 'false');
  expect(errors).toEqual([]);
});

for (const width of [360, 768, 1440]) {
  test(`discovery layouts fit ${width}px in dark and light themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ['explore', 'communities']) {
      await page.goto(`/#${route}`);
      await expect(page.locator('.discovery-intro')).toBeVisible();
      const scroll = page.locator(route === 'explore' ? '#explore-feed-scroll' : '#communities-directory-scroll');
      expect(await scroll.evaluate(el => el.scrollWidth <= el.clientWidth), `${route} at ${width}`).toBe(true);
      await page.evaluate(() => (window as any).themeEngine.setTheme('alabaster-light'));
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'alabaster-light');
      await expect(page.locator('.discovery-intro h2')).toHaveCSS('color', route === 'explore' ? 'rgb(71, 56, 41)' : 'rgb(52, 52, 84)');
    }
  });
}
