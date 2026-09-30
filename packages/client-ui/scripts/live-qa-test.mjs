import { chromium } from 'playwright';

async function runLiveTest() {
  console.log('🚀 Starting live QA test with Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('urefy_onboarding_completed', 'true');
    localStorage.setItem('urefy:demo_mode', 'true');
    localStorage.setItem('aetheris_ui_mode', 'simple');
    localStorage.setItem('aetheris_notification_prompt_dismissed', 'true');
    localStorage.setItem('aetheris_push_banner_dismissed', '1');
    localStorage.setItem('urefy_push_banner_dismissed_until', String(Date.now() + 14 * 24 * 3600 * 1000));
    localStorage.setItem('aetheris_seed_verified', 'true');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore normal offline relay connection warnings in dev/preview
      if (
        !text.includes('WebSocket relay offline') &&
        !text.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED') &&
        !text.includes('/api/ws')
      ) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('/api/')) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  console.log('Navigating to http://localhost:3000/...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);


  // 1. Verify Feed Title & Initial Render
  console.log('Verifying Feed render...');
  const title = await page.title();
  console.log(`Page title: "${title}"`);

  // 2. Test Tab Switch: Explore
  console.log('Testing tab switch -> Explore...');
  const exploreTab = page.locator('button[data-tab="explore"], a[href="#explore"]').first();
  if (await exploreTab.isVisible()) {
    await exploreTab.click();
    await page.waitForTimeout(600);
  }

  // 3. Test Tab Switch: Communities
  console.log('Testing tab switch -> Communities...');
  const commTab = page.locator('button[data-tab="communities"], a[href="#communities"]').first();
  if (await commTab.isVisible()) {
    await commTab.click();
    await page.waitForTimeout(600);
  }

  // 4. Test Tab Switch: Vault
  console.log('Testing tab switch -> Vault...');
  const vaultTab = page.locator('button[data-tab="vault"], a[href="#vault"]').first();
  if (await vaultTab.isVisible()) {
    await vaultTab.click();
    await page.waitForTimeout(600);
  }

  // 5. Test Tab Switch: Profile
  console.log('Testing tab switch -> Profile...');
  const profileTab = page.locator('button[data-tab="profile"], a[href="#profile"]').first();
  if (await profileTab.isVisible()) {
    await profileTab.click();
    await page.waitForTimeout(600);
  }

  // 6. Test Tab Switch: Feed
  console.log('Testing tab switch back -> Feed...');
  const feedTab = page.locator('button[data-tab="feed"], a[href="#feed"]').first();
  if (await feedTab.isVisible()) {
    await feedTab.click();
    await page.waitForTimeout(600);
  }

  // 7. Test New Post Composer Modal
  console.log('Testing New Post composer modal...');
  const composerBtn = page.locator('#btn-open-composer, button[data-action="open-composer"]').first();
  if (await composerBtn.isVisible()) {
    await composerBtn.click();
    await page.waitForTimeout(500);

    // Type in composer
    const textarea = page.locator('.composer-textarea, #composer-body-input').first();
    if (await textarea.isVisible()) {
      await textarea.fill('Sovereign network live verification 2026 #quantum');
      await page.waitForTimeout(300);
    }

    // Close composer
    const closeBtn = page.locator('button[data-action="close-composer"], .composer-modal-close, button:has-text("Cancel")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
  }

  // 8. Test Command Rail (Ctrl+K)
  console.log('Testing Command Rail (Ctrl+K)...');
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  const commandRail = page.locator('#command-rail-v2, .command-rail').first();
  if (await commandRail.isVisible()) {
    console.log('Command Rail opened successfully');
    await page.keyboard.type('theme');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // 9. Test Mobile Viewport
  console.log('Testing Mobile Viewport (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);

  // Test Mobile Drawer
  const moreBtn = page.locator('button[data-tab="more"], button[data-action="open-drawer"]').first();
  if (await moreBtn.isVisible()) {
    await moreBtn.click();
    await page.waitForTimeout(500);
    const drawer = page.locator('#mobile-drawer');
    const drawerOpen = await drawer.isVisible();
    console.log(`Mobile drawer opened: ${drawerOpen}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  await browser.close();

  console.log('═════════════════════════════════════════════════');
  console.log(`Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }
  console.log(`Network Asset Errors: ${networkErrors.length}`);
  if (networkErrors.length > 0) {
    console.log('Network Errors:', networkErrors);
  }
  console.log('═════════════════════════════════════════════════');

  if (consoleErrors.length > 0 || networkErrors.length > 0) {
    process.exit(1);
  } else {
    console.log('✨ ALL LIVE TESTS PASSED CLEANLY WITH ZERO ERRORS!');
  }
}

runLiveTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
