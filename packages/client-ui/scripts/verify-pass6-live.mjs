import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/razva/.gemini/antigravity/brain/259f4798-355b-4037-ba23-d1ad4471236c';
const TARGET_URL = 'https://urefy.com';

const VIEWPORTS = [
  { name: 'mobile_small_360x740', width: 360, height: 740, isMobile: true },
  { name: 'mobile_standard_390x844', width: 390, height: 844, isMobile: true },
  { name: 'mobile_large_414x896', width: 414, height: 896, isMobile: true },
  { name: 'tablet_portrait_768x1024', width: 768, height: 1024, isMobile: false },
  { name: 'tablet_landscape_1024x768', width: 1024, height: 768, isMobile: false },
  { name: 'laptop_1280x800', width: 1280, height: 800, isMobile: false },
  { name: 'desktop_1440x900', width: 1440, height: 900, isMobile: false },
  { name: 'fullhd_1920x1080', width: 1920, height: 1080, isMobile: false },
];

async function runLiveVerification() {
  console.log(`\n======================================================`);
  console.log(`  PASS 6: LIVE PHYSICAL VERIFICATION AT ${TARGET_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({ headless: true });
  const results = {
    viewports: [],
    onboardingSteps: {},
    feedPersonalization: {},
    communityCreation: {},
    responsiveLayout: {},
    regressions: {},
    consoleErrors: [],
  };

  try {
    // -------------------------------------------------------------------------
    // Phase 1: 4-Stage Progressive Onboarding Walkthrough (Standard Desktop)
    // -------------------------------------------------------------------------
    console.log(`--- PHASE 1: Fresh User Onboarding Flow (1440x900) ---`);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      storageState: undefined, // fresh incognito
    });
    const page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected third-party or benign telemetry errors if any
        if (!text.includes('favicon') && !text.includes('chrome-extension')) {
          results.consoleErrors.push(text);
          console.warn(`[Live Console Error]: ${text}`);
        }
      }
    });

    console.log(`Navigating to ${TARGET_URL}...`);
    const response = await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`HTTP Status: ${response?.status()}`);
    results.httpStatus = response?.status();

    // Verify Onboarding Wizard modal appears
    await page.waitForTimeout(1500);
    const modalLocator = page.locator('#aetheris-onboarding-overlay, #onboarding-modal').first();
    const modalVisible = await modalLocator.isVisible();
    console.log(`Onboarding Modal visible on fresh visit: ${modalVisible}`);
    results.onboardingSteps.modalVisible = modalVisible;

    // Step 0: Sovereign Identity
    const step0Title = await modalLocator.locator('h3').first().textContent();
    console.log(`Step 0 Title: "${step0Title?.trim()}"`);
    results.onboardingSteps.step0 = {
      title: step0Title?.trim(),
      hasKeysNotice: (await page.content()).includes('Your Identity Belongs to You') || (await page.content()).includes('device'),
    };
    const step0Screenshot = path.join(ARTIFACTS_DIR, 'onboarding_step0_identity.png');
    await page.screenshot({ path: step0Screenshot });
    console.log(`Saved screenshot: ${step0Screenshot}`);

    // Click Next -> Step 1: Interests
    await modalLocator.locator('button[data-global-method="onboardingWizard.next"]').click();
    await page.waitForTimeout(600);

    const step1Title = await modalLocator.locator('h3').first().textContent();
    console.log(`Step 1 Title: "${step1Title?.trim()}"`);
    // Click some interest buttons (e.g. Technology, Gaming)
    const interestButtons = modalLocator.locator('button[data-global-method="onboardingWizard.toggleInterest"]');
    const interestCount = await interestButtons.count();
    console.log(`Available Curated Interest Buttons: ${interestCount}`);
    if (interestCount > 0) {
      await interestButtons.nth(0).click(); // Tech
      await interestButtons.nth(2).click(); // Gaming
    }
    const step1Screenshot = path.join(ARTIFACTS_DIR, 'onboarding_step1_interests.png');
    await page.screenshot({ path: step1Screenshot });
    results.onboardingSteps.step1 = {
      title: step1Title?.trim(),
      interestCount,
    };

    // Click Next -> Step 2: Communities & Creators
    await modalLocator.locator('button[data-global-method="onboardingWizard.next"]').click();
    await page.waitForTimeout(600);

    const step2Title = await modalLocator.locator('h3').first().textContent();
    console.log(`Step 2 Title: "${step2Title?.trim()}"`);
    // Test 1-click Join community
    const joinButtons = modalLocator.locator('button[data-global-method="onboardingWizard.toggleJoinCommunity"]');
    const starterCommCount = await joinButtons.count();
    console.log(`Available Starter Communities: ${starterCommCount}`);
    if (starterCommCount > 0) {
      await joinButtons.first().click(); // 1-click Join
      await page.waitForTimeout(300);
    }
    // Test 1-click Follow creator
    const followButtons = modalLocator.locator('button[data-global-method="onboardingWizard.toggleFollowCreator"]');
    const starterCreatorCount = await followButtons.count();
    console.log(`Available Starter Creators: ${starterCreatorCount}`);
    if (starterCreatorCount > 0) {
      await followButtons.first().click(); // 1-click Follow
      await page.waitForTimeout(300);
    }
    const step2Screenshot = path.join(ARTIFACTS_DIR, 'onboarding_step2_communities.png');
    await page.screenshot({ path: step2Screenshot });
    results.onboardingSteps.step2 = {
      title: step2Title?.trim(),
      starterCommCount,
      starterCreatorCount,
    };

    // Click Next -> Step 3: Recovery Key
    await modalLocator.locator('button[data-global-method="onboardingWizard.next"]').click();
    await page.waitForTimeout(600);

    const step3Title = await modalLocator.locator('h3').first().textContent();
    console.log(`Step 3 Title: "${step3Title?.trim()}"`);
    const mnemonicWords = await modalLocator.locator('.select-all').count();
    console.log(`Rendered Recovery Mnemonic Words: ${mnemonicWords}`);
    // Check confirmation checkbox
    const confirmCheckbox = page.locator('#checkbox-seed-saved-confirm');
    if (await confirmCheckbox.isVisible()) {
      await confirmCheckbox.check();
      await page.waitForTimeout(300);
    }
    const step3Screenshot = path.join(ARTIFACTS_DIR, 'onboarding_step3_recovery.png');
    await page.screenshot({ path: step3Screenshot });
    results.onboardingSteps.step3 = {
      title: step3Title?.trim(),
      mnemonicWords,
    };

    // Click Finish / Enter UREfy
    const finishBtn = modalLocator.locator('button[data-global-method="onboardingWizard.finish"]').first();
    if (await finishBtn.isVisible()) {
      await finishBtn.click();
      await page.waitForTimeout(1000);
    }
    const modalDismissed = !(await modalLocator.isVisible());
    console.log(`Onboarding Modal dismissed and feed entered: ${modalDismissed}`);
    results.onboardingSteps.completedAndEntered = modalDismissed;

    // -------------------------------------------------------------------------
    // Phase 2: Feed Personalization & Stream Switching
    // -------------------------------------------------------------------------
    console.log(`\n--- PHASE 2: Feed Personalization & Streams ---`);
    const streamTabs = page.locator('[data-stream-tab], [data-action="switch-stream"]');
    const streamCount = await streamTabs.count();
    console.log(`Feed Stream Tabs visible: ${streamCount}`);
    
    // Switch to Following stream
    const followingTab = page.locator('button:has-text("Following")').first();
    if (await followingTab.isVisible()) {
      await followingTab.click();
      await page.waitForTimeout(600);
      const followingScreenshot = path.join(ARTIFACTS_DIR, 'feed_following_stream.png');
      await page.screenshot({ path: followingScreenshot });
      console.log(`Following stream captured: ${followingScreenshot}`);
      results.feedPersonalization.followingStream = true;
    }

    // Switch back to Recommended stream
    const recommendedTab = page.locator('button:has-text("Recommended"), button:has-text("For You")').first();
    if (await recommendedTab.isVisible()) {
      await recommendedTab.click();
      await page.waitForTimeout(600);
    }

    // Check Consumer Polish on Post Cards (Upvote/Downvote, clean profile)
    const feedHtml = await page.content();
    results.feedPersonalization.cleanVoting = feedHtml.includes('Upvote') || feedHtml.includes('+1');
    results.feedPersonalization.noRawHexPrefix = !feedHtml.includes('BC Profile');
    console.log(`Clean Voting labels present: ${results.feedPersonalization.cleanVoting}`);
    console.log(`No raw hex "BC Profile" in UI: ${results.feedPersonalization.noRawHexPrefix}`);

    // -------------------------------------------------------------------------
    // Phase 3: Create Community Modal
    // -------------------------------------------------------------------------
    console.log(`\n--- PHASE 3: Community Creation Experience ---`);
    const createCommBtn = page.locator('button:has-text("Create Community"), #btn-open-create-circle-modal').first();
    if (await createCommBtn.isVisible()) {
      await createCommBtn.click();
      await page.waitForTimeout(500);
      const commModal = page.locator('#form-create-sovereign-circle');
      const isCommModalOpen = await commModal.isVisible();
      console.log(`Create Community Modal opened: ${isCommModalOpen}`);
      results.communityCreation.modalOpens = isCommModalOpen;

      const commModalScreenshot = path.join(ARTIFACTS_DIR, 'create_community_modal.png');
      await page.screenshot({ path: commModalScreenshot });
      console.log(`Saved screenshot: ${commModalScreenshot}`);

      // Close modal
      const closeCommBtn = page.locator('#btn-close-create-circle-modal, #btn-cancel-create-circle').first();
      if (await closeCommBtn.isVisible()) {
        await closeCommBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // -------------------------------------------------------------------------
    // Phase 4: Pass 1-5 Regression Checks
    // -------------------------------------------------------------------------
    console.log(`\n--- PHASE 4: Pass 1-5 Regression Checks ---`);
    // Vault view
    const vaultBtn = page.locator('button:has-text("Vault"), [data-action="open-vault"]').first();
    if (await vaultBtn.isVisible()) {
      await vaultBtn.click();
      await page.waitForTimeout(600);
      const vaultVisible = (await page.content()).includes('Encrypted Vault') || (await page.content()).includes('Notes');
      results.regressions.vaultAccessible = vaultVisible;
      console.log(`Pass 5 Vault accessible: ${vaultVisible}`);
      const vaultScreenshot = path.join(ARTIFACTS_DIR, 'regression_vault_view.png');
      await page.screenshot({ path: vaultScreenshot });
    }

    await context.close();

    // -------------------------------------------------------------------------
    // Phase 5: 8 Viewport Physical Responsiveness Audit
    // -------------------------------------------------------------------------
    console.log(`\n--- PHASE 5: 8 Viewports Physical Responsiveness Audit ---`);
    for (const vp of VIEWPORTS) {
      console.log(`Testing viewport ${vp.name} (${vp.width}x${vp.height})...`);
      const vpContext = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
      });
      const vpPage = await vpContext.newPage();
      
      // Bypass onboarding for viewport layout check
      await vpPage.addInitScript(() => {
        window.localStorage.setItem('aetheris_onboarding_completed', 'true');
        window.localStorage.setItem('aetheris_onboarding_done', 'true');
      });

      await vpPage.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await vpPage.waitForTimeout(1000);

      // Verify no horizontal overflow scroll
      const overflowWidth = await vpPage.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      const shotPath = path.join(ARTIFACTS_DIR, `viewport_${vp.name}.png`);
      await vpPage.screenshot({ path: shotPath });
      console.log(`  Screenshot: ${shotPath} | Horizontal Overflow: ${overflowWidth}`);

      results.viewports.push({
        name: vp.name,
        width: vp.width,
        height: vp.height,
        hasHorizontalOverflow: overflowWidth,
        screenshot: shotPath,
      });

      await vpContext.close();
    }

  } catch (err) {
    console.error(`Error during live verification:`, err);
    results.error = err.message;
  } finally {
    await browser.close();
  }

  console.log(`\n======================================================`);
  console.log(`  VERIFICATION RUN FINISHED`);
  console.log(`======================================================\n`);
  console.log(JSON.stringify(results, null, 2));

  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'live_verification_report.json'),
    JSON.stringify(results, null, 2)
  );

  return results;
}

runLiveVerification();
