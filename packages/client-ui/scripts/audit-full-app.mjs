import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'outputs/site-audit');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runAudit() {
  console.log('Launching headless browser for full site audit...');
  const browser = await chromium.launch({ headless: true });

  const initLocalStorage = () => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('urefy_onboarding_completed', 'true');
    localStorage.setItem('urefy:demo_mode', 'true');
    localStorage.setItem('aetheris_ui_mode', 'simple');
    localStorage.setItem('aetheris_notification_prompt_dismissed', 'true');
    localStorage.setItem('aetheris_push_banner_dismissed', '1');
    localStorage.setItem('urefy_push_banner_dismissed_until', String(Date.now() + 14 * 24 * 3600 * 1000));
    localStorage.setItem('aetheris_seed_verified', 'true');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  };

  // -------------------------------------------------------------
  // 1. DESKTOP 1440x900
  // -------------------------------------------------------------
  console.log('--- DESKTOP (1440x900) ---');
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await desktopCtx.addInitScript(initLocalStorage);
  const page = await desktopCtx.newPage();

  // 1A. FEED (Home top)
  console.log('Capturing 01-feed-desktop-top.png...');
  await page.goto('http://localhost:3000/?demo=true#feed', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '01-feed-desktop-top.png') });

  // 1B. FEED (Home scrolled to post cards)
  console.log('Scrolling feed to post cards...');
  await page.evaluate(() => {
    const el = document.getElementById('main-feed-scroll') || window;
    el.scrollBy(0, 420);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, '01b-feed-posts-desktop.png') });

  // 1C. Hover on first post card
  const firstPost = page.locator('[data-post-card]').first();
  if (await firstPost.count() > 0) {
    await firstPost.hover();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, '01c-feed-post-hover-desktop.png') });

    // Click Upvote on first post
    const upvoteBtn = firstPost.locator('.btn-upvote, [data-pulse-action="upvote"]').first();
    if (await upvoteBtn.count() > 0) {
      await upvoteBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, '01d-feed-post-voted-desktop.png') });
    }
  }

  // 1D. EXPLORE
  console.log('Capturing 02-explore-desktop.png...');
  await page.goto('http://localhost:3000/?demo=true#explore', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '02-explore-desktop.png') });

  // 1E. VAULT
  console.log('Capturing 03-vault-desktop.png...');
  await page.goto('http://localhost:3000/?demo=true#vault', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '03-vault-desktop.png') });

  // 1F. COMMUNITIES
  console.log('Capturing 04-communities-desktop.png...');
  await page.goto('http://localhost:3000/?demo=true#communities', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '04-communities-desktop.png') });

  // 1G. PROFILE
  console.log('Capturing 05-profile-desktop.png...');
  await page.goto('http://localhost:3000/?demo=true#profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '05-profile-desktop.png') });

  // 1H. SETTINGS / MORE
  console.log('Capturing 06-settings-desktop.png...');
  await page.goto('http://localhost:3000/?demo=true#settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '06-settings-desktop.png') });

  // 1I. SEARCH / COMMAND RAIL MODAL (Ctrl+K)
  console.log('Opening Search / Command Rail...');
  await page.goto('http://localhost:3000/?demo=true#feed', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, '07-search-rail-desktop.png') });

  // Type in search rail
  const railInput = page.locator('#command-rail-v2-input').first();
  if (await railInput.count() > 0) {
    await railInput.fill('sovereign');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '07b-search-rail-results-desktop.png') });
  }

  // Close search rail via Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 1J. WRITE POST / COMPOSER MODAL
  console.log('Opening Composer Modal...');
  const openComposerBtn = page.locator('[data-action="open-composer"]').first();
  if (await openComposerBtn.count() > 0) {
    await openComposerBtn.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, '08-composer-modal-desktop.png') });

    // Close composer via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // 1K. POST DETAIL VIEW
  console.log('Opening Post Detail View...');
  await page.evaluate(() => {
    const post = document.querySelector('[data-post-card-id]') || document.querySelector('.social-post');
    const openBtn = post?.querySelector('[data-action="open-post-detail"]') || post?.querySelector('h2, h3, .social-post__body') || post;
    if (openBtn && typeof openBtn.click === 'function') openBtn.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '09-post-detail-desktop.png') });

  // -------------------------------------------------------------
  // 2. MOBILE 390x844 (iPhone 14 / Modern Smartphone)
  // -------------------------------------------------------------
  console.log('--- MOBILE (390x844) ---');
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await mobileCtx.addInitScript(initLocalStorage);
  const mobilePage = await mobileCtx.newPage();

  // Mobile Feed
  console.log('Capturing 10-feed-mobile.png...');
  await mobilePage.goto('http://localhost:3000/?demo=true#feed', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({ path: path.join(outDir, '10-feed-mobile.png') });

  // Mobile Drawer (More)
  console.log('Opening Mobile Drawer...');
  const mobileMenuBtn = mobilePage.locator('#btn-mobile-menu, [data-action="toggle-mobile-drawer"]').first();
  if (await mobileMenuBtn.count() > 0) {
    await mobileMenuBtn.click();
    await mobilePage.waitForTimeout(500);
    await mobilePage.screenshot({ path: path.join(outDir, '11-drawer-mobile.png') });
    // Close drawer
    await mobilePage.click('#mobile-drawer-backdrop', { force: true }).catch(() => {});
    await mobilePage.waitForTimeout(300);
  }

  // Mobile Explore
  console.log('Capturing 12-explore-mobile.png...');
  await mobilePage.goto('http://localhost:3000/?demo=true#explore', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({ path: path.join(outDir, '12-explore-mobile.png') });

  // Mobile Communities
  console.log('Capturing 13-communities-mobile.png...');
  await mobilePage.goto('http://localhost:3000/?demo=true#communities', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({ path: path.join(outDir, '13-communities-mobile.png') });

  // Mobile Vault
  console.log('Capturing 14-vault-mobile.png...');
  await mobilePage.goto('http://localhost:3000/?demo=true#vault', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({ path: path.join(outDir, '14-vault-mobile.png') });

  // Mobile Profile
  console.log('Capturing 15-profile-mobile.png...');
  await mobilePage.goto('http://localhost:3000/?demo=true#profile', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({ path: path.join(outDir, '15-profile-mobile.png') });

  // Mobile Composer
  console.log('Opening Mobile Composer...');
  await mobilePage.goto('http://localhost:3000/?demo=true#feed', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(500);
  const mobileFab = mobilePage.locator('[data-action="open-composer"], #btn-mobile-fab-composer, #btn-mobile-composer').first();
  if (await mobileFab.count() > 0) {
    await mobileFab.click();
    await mobilePage.waitForTimeout(700);
    await mobilePage.screenshot({ path: path.join(outDir, '16-composer-mobile.png') });
  }

  // -------------------------------------------------------------
  // 3. TABLET 768x1024 (iPad / Tablet)
  // -------------------------------------------------------------
  console.log('--- TABLET (768x1024) ---');
  const tabletCtx = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
  });
  await tabletCtx.addInitScript(initLocalStorage);
  const tabletPage = await tabletCtx.newPage();

  console.log('Capturing 17-feed-tablet.png...');
  await tabletPage.goto('http://localhost:3000/?demo=true#feed', { waitUntil: 'networkidle' });
  await tabletPage.waitForTimeout(800);
  await tabletPage.screenshot({ path: path.join(outDir, '17-feed-tablet.png') });

  console.log('Capturing 18-communities-tablet.png...');
  await tabletPage.goto('http://localhost:3000/?demo=true#communities', { waitUntil: 'networkidle' });
  await tabletPage.waitForTimeout(800);
  await tabletPage.screenshot({ path: path.join(outDir, '18-communities-tablet.png') });

  await browser.close();
  console.log('SUCCESS: All audit screenshots captured in:', outDir);
}

runAudit().catch(err => {
  console.error('Audit run failed:', err);
  process.exit(1);
});
