import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = 'C:/Users/razva/.gemini/antigravity/brain/e83cb617-6250-4d0a-b485-4eaf885e4abb/screenshots/phase2';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900, isMobile: false },
  { name: '1920x1080', width: 1920, height: 1080, isMobile: false },
  { name: '390x844', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const BASE_URL = 'https://urefy.com';

async function captureViewport(browser, vp) {
  console.log(`\n==================================================`);
  console.log(`Phase 2 Visual Audit: ${vp.name} (${vp.width}x${vp.height})`);
  console.log(`==================================================`);

  // Helper to get fresh authenticated context
  const createContext = async (authenticated = true) => {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
    });
    if (authenticated) {
      await ctx.addInitScript(() => {
        localStorage.setItem('aetheris_onboarding_completed', 'true');
        localStorage.setItem('aetheris_onboarding_done', 'true');
        localStorage.setItem('urefy_onboarding_stage', 'ONBOARDING_COMPLETE');
        localStorage.setItem('aetheris_identity_fingerprint', 'c3dc28cb705ephase2');
        localStorage.setItem('aetheris_sovereign_identity', JSON.stringify({
          fingerprint: 'c3dc28cb705ephase2',
          displayName: 'Razvan',
          handle: 'razvan',
          publicKey: '02dummykeyforvisualauditc3dc28cb705ephase2'
        }));
      });
    }
    return ctx;
  };

  // 0. Onboarding
  try {
    const unauthCtx = await createContext(false);
    const unauthPage = await unauthCtx.newPage();
    await unauthPage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await unauthPage.waitForTimeout(2000);
    const modal = unauthPage.locator('#onboarding-modal');
    if (await modal.isVisible()) {
      console.log(`[${vp.name}] Capturing Onboarding...`);
      await unauthPage.screenshot({
        path: path.join(SCREENSHOT_DIR, `${vp.name}_00_onboarding.png`),
        fullPage: false,
      });
    }
    await unauthCtx.close();
  } catch (e) {
    console.warn(`[${vp.name}] Onboarding capture skipped:`, e.message);
  }

  // Authenticated Context for standard views
  const ctx = await createContext(true);
  const page = await ctx.newPage();

  // 1. HOME (Conversation River & Dynamic Context Rail)
  console.log(`[${vp.name}] 1. Capturing Home (Conversation River)...`);
  await page.goto(`${BASE_URL}/#home`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${vp.name}_01_home.png`),
    fullPage: false,
  });

  // 2. CONTEXT LENS (Replacing Facet Switcher)
  console.log(`[${vp.name}] 2. Capturing Context Lens...`);
  const contextLensBtn = page.locator('#btn-context-lens, #btn-facet-switcher, [data-action="toggle-facet-switcher"]').first();
  if (await contextLensBtn.isVisible()) {
    await contextLensBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_02_context_lens.png`),
      fullPage: false,
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // 3. COMPOSER (Amber CTA & Progressive Disclosure)
  console.log(`[${vp.name}] 3. Capturing Composer...`);
  const composerTrigger = page.locator('#btn-inline-open-full, [data-action="open-composer"], [data-nav-mode="composer"]').first();
  if (await composerTrigger.isVisible()) {
    await composerTrigger.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_03_composer.png`),
      fullPage: false,
    });
    const closeBtn = page.locator('#btn-close-composer, [data-action="close-composer"], [data-action="cancel-composer"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  // 4. EXPLORE (Directional Discovery Pathway)
  console.log(`[${vp.name}] 4. Capturing Explore...`);
  await page.goto(`${BASE_URL}/#explore`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${vp.name}_04_explore.png`),
    fullPage: false,
  });

  // 5. LIVING SPACES (Communities)
  console.log(`[${vp.name}] 5. Capturing Living Spaces in Communities...`);
  await page.goto(`${BASE_URL}/#communities`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${vp.name}_05_communities.png`),
    fullPage: false,
  });

  // 6. POST DETAIL RIVER & PRIVACY LENS
  console.log(`[${vp.name}] 6. Capturing Post Detail River & Privacy Lens...`);
  await page.goto(`${BASE_URL}/#home`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  const firstPost = page.locator('article.river-item, article.social-post, [data-action="open-post-detail"]').first();
  if (await firstPost.isVisible()) {
    await firstPost.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${vp.name}_06_post_detail.png`),
    fullPage: false,
  });

  // 7. MESSAGES DIRECT
  console.log(`[${vp.name}] 7. Capturing Direct Messages...`);
  await page.goto(`${BASE_URL}/#messages`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);
  const dmTab = page.locator('button[data-messages-tab="dm"]').first();
  if (await dmTab.isVisible()) {
    await dmTab.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${vp.name}_07_messages_direct.png`),
    fullPage: false,
  });

  // 8. MESSAGES LIVING SPACES / CHANNELS
  console.log(`[${vp.name}] 8. Capturing Messages Living Spaces...`);
  const channelTab = page.locator('button[data-messages-tab="relays"], button[data-messages-tab="channels"]').first();
  if (await channelTab.isVisible()) {
    await channelTab.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${vp.name}_08_messages_community.png`),
    fullPage: false,
  });

  // 9. PROFILE
  console.log(`[${vp.name}] 9. Capturing Profile...`);
  await page.goto(`${BASE_URL}/#profile`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${vp.name}_09_profile.png`),
    fullPage: false,
  });

  await ctx.close();
}

async function run() {
  console.log(`Launching browser for Phase 2 visual audit against ${BASE_URL}...`);
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--no-sandbox']
  });

  for (const vp of VIEWPORTS) {
    await captureViewport(browser, vp);
  }

  await browser.close();
  console.log(`\nAll Phase 2 screenshots saved to: ${SCREENSHOT_DIR}`);
}

run().catch(err => {
  console.error('Phase 2 audit run failed:', err);
  process.exit(1);
});
