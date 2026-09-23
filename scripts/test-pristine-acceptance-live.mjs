import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/razva/.gemini/antigravity/brain/f79e8250-398d-43ed-8b46-622de3a557d7/screenshots';
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const TARGET_URL = 'https://urefy.com';

const USERS = [
  { name: 'Elena Rostova', handlePrefix: 'elena' },
  { name: 'Marcus Vance', handlePrefix: 'marcus' },
  { name: 'Aria Thorne', handlePrefix: 'aria' },
  { name: 'Kai Takahashi', handlePrefix: 'kai' },
  { name: 'Sora Lindholm', handlePrefix: 'sora' },
];

async function runAcceptance() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const epoch = Date.now().toString(36).slice(-4);

  console.log(`Starting 5 Pristine Browser Profile Acceptance Tests against ${TARGET_URL}...`);

  for (let i = 0; i < USERS.length; i++) {
    const user = USERS[i];
    const userIndex = i + 1;
    const testHandle = `${user.handlePrefix}_${epoch}_${userIndex}`;

    console.log(`\n--- [User ${userIndex}/5] Testing pristine flow for: ${user.name} (@${testHandle}) ---`);

    // A completely clean context with zero cookies/storage
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // mobile standard
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    try {
      // 1. Open urefy.com
      await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('#onboarding-modal', { timeout: 15000 });

      // Verify initial placeholders & disabled Continue
      const nameInput = page.locator('#onboarding-display-name');
      const handleInput = page.locator('#onboarding-handle');
      const continueBtn = page.locator('#btn-onboarding-continue');

      const namePlaceholder = await nameInput.getAttribute('placeholder');
      const handlePlaceholder = await handleInput.getAttribute('placeholder');
      const initiallyDisabled = await continueBtn.isDisabled();

      console.log(`Step 1 Loaded: placeholders = "${namePlaceholder}", "@${handlePlaceholder}", Continue disabled = ${initiallyDisabled}`);

      // 2. Enter display name and handle
      await nameInput.fill(user.name);
      await handleInput.fill(testHandle);

      // 3. Verify availability check
      await page.waitForTimeout(600); // Debounce
      const availabilityText = await page.locator('#onboarding-modal').innerText();
      const isAvailable = availabilityText.includes(`✓ @${testHandle} is available`) || availabilityText.includes(`✓ @${testHandle} is valid`);
      const continueEnabled = !(await continueBtn.isDisabled());

      console.log(`Availability check: isAvailable = ${isAvailable}, Continue enabled = ${continueEnabled}`);

      // 4. Click Continue -> Verify saving & advance to Step 2
      await continueBtn.click();
      await page.waitForTimeout(1000); // Allow backend D1 profile save

      // Verify we arrived at Step 2 (Interests)
      const h3Step2 = await page.locator('#onboarding-modal h3').innerText();
      console.log(`Arrived at Step 2: "${h3Step2}"`);

      // Take Step 2 screenshot
      const s2Path = path.join(ARTIFACT_DIR, `live_user_${userIndex}_step2_interests.png`);
      await page.screenshot({ path: s2Path });

      // 5. Select 3 interests
      const interestBtns = page.locator('button[data-global-method="onboardingWizard.toggleInterest"]');
      await interestBtns.nth(0).click();
      await interestBtns.nth(1).click();
      await interestBtns.nth(2).click();
      await page.waitForTimeout(200);

      // 6. Continue to Step 3 (Recovery)
      await page.locator('#btn-onboarding-continue').click();
      await page.waitForTimeout(400);

      const h3Step3 = await page.locator('#onboarding-modal h3').innerText();
      console.log(`Arrived at Step 3: "${h3Step3}"`);

      // 7. Reveal seed words and confirm saved
      const revealBtn = page.locator('button:has-text("Show recovery words")');
      if (await revealBtn.isVisible()) {
        await revealBtn.click();
        await page.waitForTimeout(200);
      }

      // Copy words
      await page.locator('#btn-copy-seed-words').click();
      await page.waitForTimeout(200);

      // Check confirmation
      await page.locator('#chk-saved-seed').check();
      await page.waitForTimeout(200);

      // Take Step 3 screenshot
      const s3Path = path.join(ARTIFACT_DIR, `live_user_${userIndex}_step3_recovery.png`);
      await page.screenshot({ path: s3Path });

      // 8. ENTER UREfy
      const finishBtn = page.locator('#btn-onboarding-finish');
      await finishBtn.click();
      await page.waitForTimeout(800);

      // 9. Verify landed on Home Feed
      const modalDismissed = !(await page.locator('#onboarding-modal').isVisible());
      console.log(`Landed on Home Feed: modal dismissed = ${modalDismissed}`);

      // Take Home screenshot
      const sHomePath = path.join(ARTIFACT_DIR, `live_user_${userIndex}_home_feed.png`);
      await page.screenshot({ path: sHomePath });

      // 10. Refresh and verify persistence
      await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);

      const modalStillDismissed = !(await page.locator('#onboarding-modal').isVisible());
      const clientInfo = await page.evaluate(() => {
        const store = window.clientStore;
        return {
          hasKeypair: Boolean(store && store.keypair && store.keypair.fingerprint),
          fingerprint: store?.keypair?.fingerprint,
          onboardingCompleted: localStorage.getItem('aetheris_onboarding_completed'),
          onboardingStage: localStorage.getItem('urefy_onboarding_stage'),
        };
      });

      console.log(`Post-Refresh: modal still dismissed = ${modalStillDismissed}, fingerprint = ${clientInfo.fingerprint}, stage = ${clientInfo.onboardingStage}`);

      results.push({
        userIndex,
        name: user.name,
        handle: `@${testHandle}`,
        initiallyDisabled,
        isAvailable,
        steppedToInterests: h3Step2.includes('into'),
        steppedToRecovery: h3Step3.includes('identity'),
        modalDismissed,
        persistedAfterRefresh: modalStillDismissed && clientInfo.onboardingStage === 'ONBOARDING_COMPLETE',
        fingerprint: clientInfo.fingerprint,
        success: modalDismissed && modalStillDismissed && clientInfo.onboardingStage === 'ONBOARDING_COMPLETE',
      });
    } catch (err) {
      console.error(`Error in user ${userIndex}:`, err);
      results.push({
        userIndex,
        name: user.name,
        handle: `@${testHandle}`,
        success: false,
        error: err.message,
      });
    } finally {
      await context.close();
    }
  }

  await browser.close();

  console.log('\n================ ACCEPTANCE RESULTS ================');
  console.log(JSON.stringify(results, null, 2));

  const allSuccess = results.length === 5 && results.every((r) => r.success);
  console.log(`\nOverall pristine user acceptance: ${results.filter((r) => r.success).length}/5 PASSED (All success: ${allSuccess})`);

  if (!allSuccess) {
    process.exit(1);
  }
}

runAcceptance().catch((err) => {
  console.error(err);
  process.exit(1);
});
