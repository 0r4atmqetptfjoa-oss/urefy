import { expect, test } from '@playwright/test';

// These are local Vault UI tests. Worker lifecycle is covered by pwa-runtime.
test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
    localStorage.setItem('aetheris_proactive_ai_enabled', 'false');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  });
  await page.goto('/#vault');
  await expect(page.locator('#app-top-header')).toBeVisible();
});

async function submitDialog(page: import('@playwright/test').Page, value: string): Promise<void> {
  const field = page.locator('#sovereign-dialog-root textbox, #sovereign-dialog-root input').first();
  await field.fill(value);
  await page.locator('#sovereign-dialog-confirm-btn').click();
}

test('keeps a private note with provenance and survives a reload', async ({ page }) => {
  await expect(page.locator('#memory-title')).toBeVisible();
  await expect(page.locator('.memory-empty h3')).toHaveText('Keep the part worth returning to');

  await page.locator('[data-action="keep-note"]').click();
  await submitDialog(page, 'Offline reading list for the zine');

  const item = page.locator('.memory-item').first();
  await expect(item).toBeVisible();
  await expect(item.locator('h3')).toHaveText('Offline reading list for the zine');
  await expect(item.locator('.memory-provenance code')).toHaveText(/^SHA-256 [a-f0-9]{64}$/);
  await expect(item.getByText('Saved on this device. Source access may change.')).toBeAttached();

  await page.reload();
  await expect(page.locator('#app-top-header')).toBeVisible();
  await page.goto('/#vault');
  await expect(page.locator('.memory-item')).toHaveCount(1);
  await expect(page.locator('.memory-item h3').first()).toHaveText('Offline reading list for the zine');
});

test('searches kept knowledge and refuses a javascript link', async ({ page }) => {
  await page.locator('[data-action="keep-note"]').click();
  await submitDialog(page, 'Alpha research note');

  await page.locator('#memory-search').fill('alpha');
  await expect(page.locator('.memory-item')).toHaveCount(1);
  await page.locator('#memory-search').fill('nothing-matches-this');
  await expect(page.locator('.memory-empty h3')).toHaveText('No matching snapshots');

  await page.locator('#memory-search').fill('');
  await page.locator('[data-action="save-link"]').click();
  const field = page.locator('#sovereign-dialog-root textbox, #sovereign-dialog-root input').first();
  await field.fill('javascript:alert(1)');
  await page.locator('#sovereign-dialog-confirm-btn').click();
  await expect(page.locator('#memory-items')).not.toContainText('javascript:alert');
});

test('organizes and removes a snapshot from the Vault', async ({ page }) => {
  await page.locator('[data-action="keep-note"]').click();
  await submitDialog(page, 'Sprint retro notes');

  await page.locator('[data-memory-action="collect"]').click();
  await submitDialog(page, 'Retros');
  await expect(page.locator('.memory-item')).toContainText('Retros');

  await page.locator('[data-memory-action="remove"]').click();
  await page.locator('#sovereign-dialog-confirm-btn').click();
  await expect(page.locator('.memory-item')).toHaveCount(0);
});

test('local query operators and integrity checks stay on device and fit mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.locator('[data-action="keep-note"]').click();
  await submitDialog(page, 'Open source reading list');
  await page.locator('[data-memory-action="collect"]').click();
  await submitDialog(page, 'Privacy research');
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url() + (request.postData() || '')));
  await page.locator('#memory-search').fill('"Open source" -cloud kind:note collection:"Privacy research"');
  await expect(page.locator('.memory-item')).toHaveCount(1);
  await page.locator('.memory-provenance summary').click();
  await page.getByRole('button', { name: 'Check snapshot integrity' }).click();
  await expect(page.locator('[data-memory-verification]')).toHaveText('Snapshot matches its saved checksum.');
  expect(requests.some(request => request.includes('Privacy research') || request.includes('Open source'))).toBe(false);
  expect(await page.locator('.knowledge-memory').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  const button = page.getByRole('button', { name: 'Check snapshot integrity' });
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.locator('#memory-search').fill('"Open source" -reading');
  await expect(page.locator('.memory-item')).toHaveCount(0);
});
