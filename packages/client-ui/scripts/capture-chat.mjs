import { chromium } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../packages/packages/packages/outputs/chat-review');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  await context.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('urefy_onboarding_completed', 'true');
    localStorage.setItem('aetheris_ui_mode', 'simple');
    localStorage.setItem('aetheris_notification_prompt_dismissed', 'true');
  });

  const page = await context.newPage();
  console.log('Navigating to http://localhost:3000/#messages...');
  await page.goto('http://localhost:3000/#messages', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Seed demo DM data
  await page.evaluate(() => {
    if (window.sovereignDM && window.sovereignDM.conversations.size === 0) {
      window.sovereignDM.seedDemoData();
      if (window.clientStore) window.clientStore.notifySync();
    }
  });
  await page.waitForTimeout(500);

  // Switch to Direct Messages
  const directBtn = page.locator('button:has-text("Direct Messages"), button:has-text("Direct")').first();
  if (await directBtn.count() > 0) {
    await directBtn.click({ force: true });
    await page.waitForTimeout(600);
  }

  // Click first conversation
  const peerConv = page.locator('[data-action="select-dm-peer"]').first();
  if (await peerConv.count() > 0) {
    await peerConv.click({ force: true });
    await page.waitForTimeout(600);
  }

  // Click the emoji button in composer
  console.log('Clicking emoji button in composer...');
  const emojiBtn = page.locator('[data-action="toggle-dm-emoji"]').first();
  await emojiBtn.click({ force: true });
  await page.waitForTimeout(1000);

  // Take screenshot of viewport
  await page.screenshot({ path: path.join(outDir, '9-emoji-picker-open.png') });

  // Take screenshot of full page to see if column stretches!
  await page.screenshot({ path: path.join(outDir, '10-emoji-picker-fullpage.png'), fullPage: true });

  // Measure emoji picker height
  const pickerBounds = await page.evaluate(() => {
    const el = document.querySelector('.emoji-picker-container');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      scrollHeight: el.scrollHeight,
      windowHeight: window.innerHeight,
      gridScrollHeight: el.querySelector('.grid')?.scrollHeight
    };
  });
  console.log('Picker bounds:', pickerBounds);

  await browser.close();
  console.log('Emoji screenshot captured!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
