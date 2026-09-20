/**
 * scripts/torture-viewports-and-stability.mjs
 * 
 * PASS 7 — Stage 2: 9 Viewport Physical Responsiveness & Layout Destruction Test
 */

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const TARGET_URL = 'https://urefy.com';
const ARTIFACTS_DIR = 'C:/Users/razva/.gemini/antigravity/brain/259f4798-355b-4037-ba23-d1ad4471236c';

const VIEWPORTS = [
  { name: 'mobile_small_360x740', width: 360, height: 740, isMobile: true },
  { name: 'mobile_standard_390x844', width: 390, height: 844, isMobile: true },
  { name: 'mobile_large_414x896', width: 414, height: 896, isMobile: true },
  { name: 'mobile_extra_430x932', width: 430, height: 932, isMobile: true },
  { name: 'tablet_portrait_768x1024', width: 768, height: 1024, isMobile: false },
  { name: 'tablet_landscape_1024x768', width: 1024, height: 768, isMobile: false },
  { name: 'laptop_1280x800', width: 1280, height: 800, isMobile: false },
  { name: 'desktop_1440x900', width: 1440, height: 900, isMobile: false },
  { name: 'fullhd_1920x1080', width: 1920, height: 1080, isMobile: false }
];

async function run() {
  console.log('===============================================================');
  console.log('  PASS 7: 9 VIEWPORT RESPONSIVENESS & OVERFLOW TORTURE');
  console.log(`  Target: ${TARGET_URL}`);
  console.log('===============================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];

  try {
    for (const vp of VIEWPORTS) {
      console.log(`Testing Viewport ${vp.name} (${vp.width}x${vp.height})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile
      });

      await context.addInitScript(() => {
        window.localStorage.setItem('aetheris_onboarding_completed', 'true');
      });

      const page = await context.newPage();
      await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);

      // Check for horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      // Check mobile bottom navigation on mobile widths
      let bottomNavVisible = false;
      if (vp.isMobile) {
        bottomNavVisible = await page.locator('nav.fixed.bottom-0, nav[data-mobile-bottom-nav], .mobile-tab-bar').first().isVisible().catch(() => false);
      }

      const screenshotPath = path.join(ARTIFACTS_DIR, `pass7_vp_${vp.name}.png`);
      await page.screenshot({ path: screenshotPath });

      console.log(`  Overflow: ${overflow} | Mobile Bottom Nav: ${bottomNavVisible}`);

      results.push({
        name: vp.name,
        width: vp.width,
        height: vp.height,
        hasHorizontalOverflow: overflow,
        bottomNavVisible,
        pass: !overflow
      });

      await context.close();
    }

  } catch (err) {
    console.error('Error during viewport torture:', err);
  } finally {
    await browser.close();
  }

  console.log('\n===============================================================');
  console.log('  VIEWPORT AUDIT RESULTS');
  console.log('===============================================================');
  console.log(JSON.stringify(results, null, 2));

  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'viewport_torture_report.json'),
    JSON.stringify(results, null, 2)
  );

  return results;
}

run().catch(console.error);
