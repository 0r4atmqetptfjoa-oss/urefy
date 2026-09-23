import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/razva/.gemini/antigravity/brain/f79e8250-398d-43ed-8b46-622de3a557d7/screenshots';
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: '320x568_iPhoneSE', width: 320, height: 568 },
  { name: '360x800_Android', width: 360, height: 800 },
  { name: '390x844_iPhone13', width: 390, height: 844 },
  { name: '412x915_Pixel', width: 412, height: 915 },
  { name: '1280x720_Desktop720p', width: 1280, height: 720 },
  { name: '1440x900_DesktopMac', width: 1440, height: 900 },
  { name: '1920x1080_Desktop1080p', width: 1920, height: 1080 },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // Mock profiles API so local preview can test complete Step 1 -> 2 -> 3
    await page.route('**/api/profiles*', async (route) => {
      const url = new URL(route.request().url());
      if (route.request().method() === 'GET') {
        const handle = url.searchParams.get('handle');
        if (handle === 'taken') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, profile: { userId: 'other_user', handle: 'taken' } }),
          });
        }
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Profile not found' }),
        });
      }
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });

    // Wait for onboarding modal
    await page.waitForSelector('#onboarding-modal', { timeout: 10000 });

    // Step 1 checks
    const modalBox = await page.locator('#onboarding-modal').boundingBox();
    const bodyBox = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      modalScrollWidth: document.getElementById('onboarding-modal').scrollWidth,
      modalClientWidth: document.getElementById('onboarding-modal').clientWidth,
    }));

    const continueBtn = page.locator('#btn-onboarding-continue');
    const continueBox = await continueBtn.boundingBox();
    const isInitiallyDisabled = await continueBtn.isDisabled();

    // Capture Step 1 screenshot
    const s1Path = path.join(ARTIFACT_DIR, `step1_profile_${vp.name}.png`);
    await page.screenshot({ path: s1Path, fullPage: false });

    // Fill Step 1
    const nameInput = page.locator('#onboarding-display-name');
    const handleInput = page.locator('#onboarding-handle');
    await nameInput.fill('Alex Rivera');
    await handleInput.fill('alexrivera');

    // Wait for availability check
    await page.waitForTimeout(400);

    const isNowEnabled = !(await continueBtn.isDisabled());

    // Advance to Step 2
    await continueBtn.click();
    await page.waitForTimeout(400);

    // Capture Step 2 screenshot
    const s2Path = path.join(ARTIFACT_DIR, `step2_interests_${vp.name}.png`);
    await page.screenshot({ path: s2Path, fullPage: false });

    // Toggle 3 interests
    const interestButtons = page.locator('button[data-global-method="onboardingWizard.toggleInterest"]');
    await interestButtons.nth(0).click();
    await interestButtons.nth(1).click();
    await interestButtons.nth(2).click();
    await page.waitForTimeout(200);

    // Advance to Step 3
    await page.locator('#btn-onboarding-continue').click();
    await page.waitForTimeout(400);

    // Reveal seed words
    const revealBtn = page.locator('button:has-text("Show recovery words")');
    if (await revealBtn.isVisible()) {
      await revealBtn.click();
    }
    await page.waitForTimeout(200);

    // Capture Step 3 screenshot
    const s3Path = path.join(ARTIFACT_DIR, `step3_recovery_${vp.name}.png`);
    await page.screenshot({ path: s3Path, fullPage: false });

    // Confirm checkbox and enter
    await page.locator('#chk-saved-seed').check();
    await page.waitForTimeout(200);

    const finishBtn = page.locator('#btn-onboarding-finish');
    const finishBox = await finishBtn.boundingBox();
    await finishBtn.click();
    await page.waitForTimeout(500);

    // Verify modal is gone and home is visible
    const modalVisibleAfterFinish = await page.locator('#onboarding-modal').isVisible();

    // Reload test to verify state resilience
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const modalVisibleAfterReload = await page.locator('#onboarding-modal').isVisible();

    const hasHorizontalOverflow = bodyBox.scrollWidth > bodyBox.clientWidth;

    results.push({
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      hasHorizontalOverflow,
      isInitiallyDisabled,
      isNowEnabled,
      continueBtnHeight: continueBox ? Math.round(continueBox.height) : 0,
      finishBtnHeight: finishBox ? Math.round(finishBox.height) : 0,
      completedAndDismissed: !modalVisibleAfterFinish,
      persistedAfterReload: !modalVisibleAfterReload,
    });

    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
