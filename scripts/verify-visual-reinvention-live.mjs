import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = 'C:/Users/razva/.gemini/antigravity/brain/9748bee8-5521-434c-9761-d28586697e9f/screenshots/visual_reinvention';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'desktop_1440x900', width: 1440, height: 900, isMobile: false },
  { name: 'desktop_1920x1080', width: 1920, height: 1080, isMobile: false },
  { name: 'mobile_390x844', width: 390, height: 844, isMobile: true },
];

const BASE_URL = 'https://urefy.com';

async function runVisualVerification() {
  console.log(`[Visual Verification] Launching Chromium browser against ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n==================================================`);
    console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`==================================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });
    const page = await context.newPage();

    console.log(`[${vp.name}] Navigating to clean instance for Onboarding verification...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if onboarding modal is visible
    const modal = page.locator('#onboarding-modal');
    if (await modal.isVisible()) {
      console.log(`[${vp.name}] Step 1: Profile visible.`);
      
      // Step 1: Profile Screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${vp.name}_01_onboarding_step1_profile.png`),
        fullPage: false,
      });

      // Fill in Name and Handle
      const nameInput = page.locator('#onboarding-display-name');
      const handleInput = page.locator('#onboarding-handle');
      const randSuffix = Math.random().toString(36).substring(2, 6);
      const testHandle = `user_${randSuffix}`;
      
      await nameInput.fill('Sovereign Explorer');
      await handleInput.fill(testHandle);
      await page.waitForTimeout(800);

      // Click Continue
      const continueBtn = page.locator('#btn-onboarding-continue');
      console.log(`[${vp.name}] Submitting Step 1...`);
      await continueBtn.click();
      
      // Wait for Step 2
      await page.waitForSelector('button[data-global-method="onboardingWizard.toggleInterest"]', { timeout: 10000 });
      console.log(`[${vp.name}] Step 2: Interests loaded.`);

      // Step 2: Interests Screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${vp.name}_02_onboarding_step2_interests.png`),
        fullPage: false,
      });

      // Select 3 interests
      const interestBtns = page.locator('button[data-global-method="onboardingWizard.toggleInterest"]');
      await interestBtns.nth(0).click();
      await interestBtns.nth(1).click();
      await interestBtns.nth(2).click();
      await page.waitForTimeout(400);

      // Click Continue from Step 2
      console.log(`[${vp.name}] Submitting Step 2...`);
      await continueBtn.click();

      // Wait for Step 3
      await page.waitForSelector('#chk-saved-seed', { timeout: 10000 });
      console.log(`[${vp.name}] Step 3: Recovery loaded.`);

      // Reveal seed words if hidden
      const revealBtn = page.locator('button:has-text("Show recovery words")');
      if (await revealBtn.isVisible()) {
        await revealBtn.click();
        await page.waitForTimeout(300);
      }

      // Check confirmation
      await page.locator('#chk-saved-seed').check();
      await page.waitForTimeout(300);

      // Step 3: Recovery Screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${vp.name}_03_onboarding_step3_recovery.png`),
        fullPage: false,
      });

      const enterBtn = page.locator('#btn-onboarding-finish');
      console.log(`[${vp.name}] Clicking ENTER UREFY...`);
      await enterBtn.click();

      // Wait for modal to disappear
      await page.waitForSelector('#onboarding-modal', { state: 'hidden', timeout: 10000 });
      console.log(`[${vp.name}] Onboarding complete, entered app.`);
      await page.waitForTimeout(1500);
    }

    // 2. HOME / FEED VERIFICATION
    console.log(`[${vp.name}] Capturing Home Feed...`);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_04_home_feed.png`),
      fullPage: false,
    });

    // 3. EXPLORE SCREEN
    console.log(`[${vp.name}] Navigating to Explore...`);
    const exploreBtn = page.locator('[data-nav-mode="explore"]').first();
    if (await exploreBtn.isVisible()) {
      await exploreBtn.click();
    } else {
      await page.goto(`${BASE_URL}/#explore`);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_05_explore.png`),
      fullPage: false,
    });

    // 4. COMMUNITIES SCREEN
    console.log(`[${vp.name}] Navigating to Communities...`);
    const commBtn = page.locator('[data-nav-mode="communities"]').first();
    if (await commBtn.isVisible()) {
      await commBtn.click();
    } else {
      await page.goto(`${BASE_URL}/#communities`);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_06_communities.png`),
      fullPage: false,
    });

    // 5. MESSAGES DIRECT SCREEN
    console.log(`[${vp.name}] Navigating to Direct Messages...`);
    const msgBtn = page.locator('[data-nav-mode="relays"]').first();
    if (await msgBtn.isVisible()) {
      await msgBtn.click();
    } else {
      await page.goto(`${BASE_URL}/#messages`);
    }
    await page.waitForTimeout(1000);
    const dmTab = page.locator('button[data-messages-tab="dm"]').first();
    if (await dmTab.isVisible()) {
      await dmTab.click();
    }
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_07_messages_direct.png`),
      fullPage: false,
    });

    // 6. MESSAGES COMMUNITY SCREEN (Channel Chat)
    console.log(`[${vp.name}] Navigating to Community Channel Messages...`);
    const channelTab = page.locator('button[data-messages-tab="relays"]').first();
    if (await channelTab.isVisible()) {
      await channelTab.click();
    }
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_08_messages_community.png`),
      fullPage: false,
    });

    // 7. PROFILE SCREEN
    console.log(`[${vp.name}] Navigating to Profile...`);
    const profBtn = page.locator('[data-nav-mode="profile"]').first();
    if (await profBtn.isVisible()) {
      await profBtn.click();
    } else {
      await page.goto(`${BASE_URL}/#profile`);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_09_profile.png`),
      fullPage: false,
    });

    // 8. SETTINGS SCREEN
    console.log(`[${vp.name}] Navigating to Settings...`);
    const setBtn = page.locator('[data-action="open-settings"]').first();
    if (await setBtn.isVisible()) {
      await setBtn.click();
    } else {
      await page.goto(`${BASE_URL}/#settings`);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}_10_settings.png`),
      fullPage: false,
    });

    await context.close();
  }

  await browser.close();
  console.log(`\n[Visual Verification] All screenshots saved to: ${SCREENSHOT_DIR}`);
}

runVisualVerification().catch((err) => {
  console.error('[Visual Verification Error]', err);
  process.exit(1);
});
