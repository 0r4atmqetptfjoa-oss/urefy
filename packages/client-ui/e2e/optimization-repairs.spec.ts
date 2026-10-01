import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  // Fixtures live only in this disposable browser context, never in the product DB.
  await page.addInitScript(() => {
    localStorage.setItem('urefy:demo_mode', 'true');
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
    localStorage.setItem('aetheris_proactive_ai_enabled', 'false');
    localStorage.setItem('aetheris_pref_autoplay_video', 'false');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.locator('#app-top-header')).toBeVisible();
});

test('feed mounts 20 posts and defers external players until activation', async ({ page }) => {
  await page.route('https://www.youtube.com/embed/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Isolated player fixture</title>' }));
  await page.evaluate(() => {
    const store = (window as any).clientStore;
    store.loadDemoData();
    const original = store.posts[0];
    store.posts = Array.from({ length: 100 }, (_, index) => ({
      ...original, id: `optimization-fixture-${index}`, channelId: 'pulse-global',
      title: `Fixture ${index}`, content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      video: { src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }, images: [],
    }));
    store.isSyncing = false;
    store.notifySync();
  });
  const stream = page.locator('.social-home__stream');
  await expect(stream.locator('[data-post-card-id]')).toHaveCount(20);
  await expect(stream.locator('iframe')).toHaveCount(0);
  const poster = stream.getByRole('button', { name: 'Play embedded video' }).first();
  await poster.click();
  await expect(stream.locator('iframe')).toHaveCount(1);
  await expect(stream.locator('iframe')).toHaveAttribute('src', /autoplay=1/);
  await stream.locator('iframe').evaluate(element => (window as any).__optimizationPlayer = element);
  const loadMore = page.getByRole('button', { name: /Load more posts/ });
  await loadMore.scrollIntoViewIfNeeded();
  await expect(loadMore).toBeInViewport();
  await loadMore.click();
  await expect(stream.locator('[data-post-card-id]')).toHaveCount(40);
  await expect(stream.locator('iframe')).toHaveCount(1);
  expect(await stream.locator('iframe').evaluate(element => element === (window as any).__optimizationPlayer)).toBe(true);
  expect(await page.evaluate(() => (window as any).clientStore.posts.length)).toBe(100);
});

test('message append preserves editor and existing message nodes', async ({ page }) => {
  await page.locator('[data-testid="nav-item-messages"]').click();
  await expect(page.locator('#messages-container')).toBeVisible();
  await page.evaluate(() => {
    const store = (window as any).clientStore;
    const messages = Array.from({ length: 30 }, (_, index) => ({
      id: `optimization-message-${index}`, channelId: store.activeChannelId,
      authorFingerprint: 'fixture-peer', text: `Message ${index}`, epoch: 'test',
      status: 'local-only', createdAt: Date.now() + index, isMine: false,
    }));
    store.messages.set(store.activeChannelId, messages);
    store.notifySync();
  });
  await expect(page.locator('.relay-message')).toHaveCount(30);
  const input = page.locator('#input-message');
  await input.fill('Unsent local draft');
  await input.evaluate((element: HTMLInputElement) => {
    element.focus(); element.setSelectionRange(7, 12);
    (window as any).__optimizationEditor = element;
    (window as any).__optimizationRow = document.querySelector('[data-message-id="optimization-message-0"]');
    const store = (window as any).clientStore;
    const messages = store.messages.get(store.activeChannelId);
    messages.push({ ...messages[0], id: 'optimization-message-30', text: 'New arrival', createdAt: Date.now() + 31 });
    store.notifySync();
  });
  await expect(page.locator('.relay-message')).toHaveCount(31);
  expect(await input.evaluate(element => element === (window as any).__optimizationEditor)).toBe(true);
  expect(await page.evaluate(() => document.querySelector('[data-message-id="optimization-message-0"]') === (window as any).__optimizationRow)).toBe(true);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Unsent local draft');
  expect(await input.evaluate((element: HTMLInputElement) => [element.selectionStart, element.selectionEnd])).toEqual([7, 12]);
});

test('optional pages load on navigation and stay outside Home resources', async ({ page }) => {
  const optional = /\/(?:settings-view|explore-view|community-view)-[^/]+\.js/;
  expect(await page.evaluate(pattern => performance.getEntriesByType('resource').some(entry => new RegExp(pattern).test(entry.name)), optional.source)).toBe(false);
  await page.locator('[data-testid="nav-item-explore"]').click();
  await expect(page.locator('#explore-search-input')).toBeVisible();
  await page.locator('[data-testid="nav-item-communities"]').click();
  await expect(page.locator('#input-community-search')).toBeVisible();
});
