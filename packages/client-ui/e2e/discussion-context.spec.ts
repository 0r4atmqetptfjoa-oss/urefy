import { expect, test } from '@playwright/test';
import { onRequestGet as getPosts } from '../functions/api/posts.js';
import { onRequestGet as getPost } from '../functions/api/posts/[id].js';
import { onRequestGet as getComments, onRequestPost as createComment } from '../functions/api/comments.js';
import { createProductDatabase } from '../test/helpers/product-database.js';
import { resetReplayNonceCache } from '../functions/api/_auth.js';

test.use({ serviceWorkers: 'block' });

test('signed nested replies, failed-send recovery and private source round-trip', async ({ page }) => {
  const fixture = createProductDatabase();
  resetReplayNonceCache();
  const env = { DB: fixture.database, ENVIRONMENT: 'production' };
  const id = 'Post_Context_CaseSensitive';
  fixture.sqlite.prepare('INSERT INTO posts (id, channel_id, author_id, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, 'c/technology', 'fixture-author', 'A useful discussion', 'Public source context', Date.now());
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
    localStorage.setItem('aetheris_proactive_ai_enabled', 'false');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  });
  let rejectSend = false;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const request = new Request(url, { method: route.request().method(), headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, ...(route.request().postData() ? { body: route.request().postData()! } : {}) });
    let response = new Response(JSON.stringify({ success: false, error: 'Unavailable in isolated test' }), { status: 503 });
    if (url.pathname === '/api/posts' && request.method === 'GET') response = await getPosts({ request, env });
    else if (url.pathname === `/api/posts/${id}`) response = await getPost({ request, env, params: { id } });
    else if (url.pathname === '/api/comments') response = request.method === 'GET' ? await getComments({ request, env }) : rejectSend ? new Response(JSON.stringify({ success: false, error: 'Test connection interrupted; draft retained' }), { status: 503 }) : await createComment({ request, env });
    await route.fulfill({ status: response.status, body: await response.text(), contentType: 'application/json' });
  });
  try {
    await page.goto(`/#post-${id}`);
    const form = page.locator('#form-post-detail-reply');
    await expect(form).toBeVisible();
    const input = form.locator('textarea');
    await input.fill('The useful original reply');
    rejectSend = true;
    await form.locator('button[type="submit"]').click();
    await expect(page.getByText('Test connection interrupted; draft retained')).toBeVisible();
    await expect(input).toHaveValue('The useful original reply');
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM comments').get()?.n).toBe(0);
    rejectSend = false;
    await form.locator('button[type="submit"]').click();
    await expect(input).toHaveValue('');
    await expect.poll(() => fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM comments').get()?.n).toBe(1);
    const rootId = fixture.sqlite.prepare('SELECT id FROM comments').get()!.id as string;
    await page.locator(`[data-comment-reply-toggle="${rootId}"]`).click();
    const nested = page.locator('.form-inline-comment-reply');
    await expect(nested).toBeVisible();
    await nested.locator('textarea').fill('The nested answer worth keeping');
    await nested.locator('button[type="submit"]').click();
    await expect.poll(() => fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM comments').get()?.n).toBe(2);
    const child = fixture.sqlite.prepare('SELECT * FROM comments WHERE parent_id = ?').get(rootId)!;
    expect(child.content).toBe('The nested answer worth keeping');
    expect(fixture.sqlite.prepare('SELECT reply_count FROM posts WHERE id = ?').get(id)?.reply_count).toBe(2);
    await page.locator(`[data-action="keep-comment"][data-comment-id="${child.id}"]`).click();
    await expect(page.getByText('Comment preserved in your encrypted Vault.')).toBeVisible();
    await page.locator('#btn-close-post-detail').click();
    await page.goto('/#vault');
    const item = page.locator('.memory-item');
    await expect(item).toHaveCount(1);
    await item.locator('details').first().locator('summary').click();
    await expect(item.locator('.memory-text')).toHaveText('The nested answer worth keeping');
    await item.locator('.memory-provenance summary').click();
    await item.getByRole('button', { name: 'Check snapshot integrity' }).click();
    await expect(item.locator('[data-memory-verification]')).toHaveText('Snapshot matches its saved checksum.');
    await page.reload();
    await expect(page.locator('.memory-item')).toHaveCount(1);
    await page.locator('[data-memory-action="source"]').click();
    await expect(page.locator(`#context-comment-${child.id}`)).toBeFocused();
    await expect(page.locator(`#context-comment-${child.id}`)).toContainText('The nested answer worth keeping');
    expect(errors).toEqual([]);
  } finally { fixture.sqlite.close(); }
});
