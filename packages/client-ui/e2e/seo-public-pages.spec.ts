import { expect, test } from '@playwright/test';

// Run against Pages/Workers with tmp/seo-fixture.sql applied to an isolated local D1.
test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  });
});

test('home content stays visible with and without JavaScript', async ({ page, browser, baseURL }) => {
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const initial = await noJS.newPage();
  await initial.goto(baseURL!);
  await expect(initial.locator('#public-home-title')).toBeVisible();
  expect(await initial.locator('.public-home-intro').evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(100);
  const description = await initial.locator('.public-home-intro p').textContent();
  await page.goto('/');
  await expect(page.locator('.quick-composer')).toBeVisible();
  await expect(page.locator('#public-home-title')).toBeVisible();
  await expect(page.locator('.public-home-intro p')).toHaveText(description!);
  await expect(page.locator('a[href="/explore"]').first()).toBeVisible();
  await expect(page.locator('a[href="/c/technology"]').first()).toBeAttached();
  await expect(page.locator('a[href="/p/seo-test-post"]').first()).toBeAttached();
  await expect(page.locator('a[href="/u/seo-test-user"]').first()).toBeAttached();
  expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join('')).not.toMatch(/aggregateRating|FAQPage/);
  await expect(page.locator('link[hreflang]')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/seo-home.png', fullPage: true });
  await noJS.close();
});

test('native public links open their destinations after hydration', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.quick-composer')).toBeVisible();
  await page.locator('.public-home-intro a[href="/explore"]').click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.locator('.explore-workspace')).toBeVisible();
  await page.goto('/');
  await page.locator('.social-post__title a[href="/p/seo-test-post"]').click();
  await expect(page).toHaveURL(/\/p\/seo-test-post$/);
  await expect(page.locator('#btn-close-post-detail')).toBeVisible();
  await page.goto('/u/seo-test-user');
  await expect(page.locator('#public-home-title')).toHaveCount(0);
  await expect(page.locator('#app')).toContainText('SEO Test Member');
  await page.goto('/c/technology');
  await expect(page.locator('#community-view-workspace h1')).toBeVisible();
});

test('server metadata, aliases, sitemap and missing routes agree', async ({ request, baseURL }) => {
  for (const [path, type] of [['/explore','CollectionPage'], ['/communities','CollectionPage'], ['/c/technology','CollectionPage'], ['/u/seo-test-user','ProfilePage'], ['/p/seo-test-post','DiscussionForumPosting']]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    expect(html).toContain(`rel="canonical" href="${baseURL}${path}"`);
    expect(html).not.toMatch(/aggregateRating|hreflang=/);
    const graphs = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    expect(graphs).toHaveLength(1);
    expect(JSON.parse(graphs[0][1])['@type']).toBe(type);
    if (path !== '/communities') expect(html).toContain('/p/seo-test-post');
  }
  for (const [alias, canonical] of [['/c/c-technology','/c/technology'], ['/u/seo-test','/u/seo-test-user'], ['/post/seo-test-post','/p/seo-test-post']]) {
    const response = await request.get(alias, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers().location).toBe(baseURL + canonical);
  }
  for (const path of ['/invented-seo-page', '/c/not-a-community', '/u/not-a-profile', '/p/not-a-post', '/p/seo-test-draft']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    expect(response.headers()['x-robots-tag']).toContain('noindex');
  }
  const profiles = await (await request.get('/sitemap-profiles.xml')).text();
  expect(profiles).toContain('/u/seo-test-user</loc>');
  expect(profiles).not.toContain('/u/seo-test</loc>');
  const communities = await (await request.get('/sitemap-communities.xml')).text();
  expect(communities).toContain('/c/technology</loc>');
  expect(communities).not.toContain('/c/c-technology');
  const posts = await (await request.get('/sitemap-posts-1.xml')).text();
  expect(posts).not.toContain('seo-test-draft');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots.match(/User-agent:/g)).toHaveLength(1);
  expect(robots).toContain('Disallow: /api/');
});

test('about remains readable after loading', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('h1')).toContainText('UREfy');
  await expect(page.locator('script[type="module"]')).toHaveCount(0);
});
