import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'outputs/chat-review');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  console.log('Launching headless browser...');
  const browser = await chromium.launch({ headless: true });
  
  // Desktop Context
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('urefy_onboarding_completed', 'true');
    localStorage.setItem('urefy:demo_mode', 'true');
    localStorage.setItem('aetheris_ui_mode', 'simple');
    localStorage.setItem('aetheris_notification_prompt_dismissed', 'true');
  });

  const page = await context.newPage();
  console.log('Navigating to http://localhost:3000/?demo=true#messages...');
  await page.goto('http://localhost:3000/?demo=true#messages', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Capture Relay Channels view (with sample message)
  console.log('Sending message in General Discussion channel...');
  const channelInput = page.locator('#input-message');
  if (await channelInput.count() > 0) {
    await channelInput.fill('Welcome to the Sovereign Relays! Testing 2026-2027 modern channel bubbles.');
    await channelInput.press('Enter');
    await page.waitForTimeout(600);
  }
  console.log('Capturing 1-relays-channels.png...');
  await page.screenshot({ path: path.join(outDir, '1-relays-channels.png') });

  // 2. Switch to Direct Messages and open Elena conversation
  console.log('Switching to Direct Messages...');
  await page.evaluate(() => {
    if (window.sovereignDM) {
      window.sovereignDM.seedDemoData();
      window.sovereignDM.activePeerFP = 'c3dc28cb705e';
      const btn = document.querySelector('[data-action="switch-messages-tab"][data-tab="dm"]');
      if (btn) btn.click();
      if (window.clientStore) window.clientStore.notifySync();
    }
  });
  await page.waitForTimeout(800);

  console.log('Capturing 2-dm-chat-overview.png...');
  await page.screenshot({ path: path.join(outDir, '2-dm-chat-overview.png') });

  // 3. Hover over the first message to trigger action dock
  console.log('Hovering over message for action dock...');
  const firstBubble = page.locator('.dm-message').first();
  if (await firstBubble.count() > 0) {
    await firstBubble.hover();
    await page.waitForTimeout(400);
    console.log('Capturing 3-dm-hover-actions.png...');
    await page.screenshot({ path: path.join(outDir, '3-dm-hover-actions.png') });
  }

  // 4. React with heart to message to show reaction pill
  console.log('Reacting with heart emoji...');
  await page.evaluate(async () => {
    const msg = document.querySelector('.dm-message');
    const id = msg?.id?.replace('dm-message-', '');
    if (id && window.sovereignDM) {
      await window.sovereignDM.reactToMessage(id, '❤️');
      if (window.clientStore) window.clientStore.notifySync();
    }
  });
  await page.waitForTimeout(600);

  console.log('Capturing 4-dm-reacted-pill.png...');
  await page.screenshot({ path: path.join(outDir, '4-dm-reacted-pill.png') });

  // 5. Open emoji picker in composer
  console.log('Opening emoji picker...');
  const emojiToggle = page.locator('[data-action="toggle-dm-emoji"]').first();
  if (await emojiToggle.count() > 0) {
    await emojiToggle.click({ force: true });
    await page.waitForTimeout(600);
    console.log('Capturing 6-emoji-picker.png...');
    await page.screenshot({ path: path.join(outDir, '6-emoji-picker.png') });

    // Measure bounds to ensure column is strictly bounded
    const bounds = await page.evaluate(() => {
      const el = document.querySelector('.emoji-picker-container');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        width: r.width,
        height: r.height,
        top: r.top,
        bottom: r.bottom,
        windowHeight: window.innerHeight,
      };
    });
    console.log('Emoji picker dimensions:', bounds);
  }

  // 6. Mobile Viewport (iPhone 14 / modern Android)
  console.log('Capturing Mobile Viewport...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  await mobileContext.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('urefy_onboarding_completed', 'true');
    localStorage.setItem('urefy:demo_mode', 'true');
    localStorage.setItem('aetheris_ui_mode', 'simple');
    localStorage.setItem('aetheris_notification_prompt_dismissed', 'true');
  });

  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000/?demo=true#messages', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(800);

  // Seed demo DM data and open Elena
  await mobilePage.evaluate(() => {
    if (window.sovereignDM) {
      window.sovereignDM.seedDemoData();
      window.sovereignDM.activePeerFP = 'c3dc28cb705e';
      const btn = document.querySelector('[data-action="switch-messages-tab"][data-tab="dm"]');
      if (btn) btn.click();
      if (window.clientStore) window.clientStore.notifySync();
    }
  });
  await mobilePage.waitForTimeout(800);

  console.log('Capturing 7-dm-mobile-chat.png...');
  await mobilePage.screenshot({ path: path.join(outDir, '7-dm-mobile-chat.png') });

  // Open mobile emoji sheet
  const mobileEmojiBtn = mobilePage.locator('[data-action="toggle-dm-emoji"]').first();
  if (await mobileEmojiBtn.count() > 0) {
    await mobileEmojiBtn.click({ force: true });
    await mobilePage.waitForTimeout(600);
    console.log('Capturing 8-dm-mobile-emoji-sheet.png...');
    await mobilePage.screenshot({ path: path.join(outDir, '8-dm-mobile-emoji-sheet.png') });
  }

  await browser.close();
  console.log('All screenshots successfully captured in:', outDir);
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
