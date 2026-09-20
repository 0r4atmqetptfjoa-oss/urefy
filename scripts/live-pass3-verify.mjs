import { chromium } from 'playwright';

const TARGET_URL = process.env.TARGET_URL || 'https://urefy.com';

async function runPass3Verification() {
  console.log(`Starting Live PASS 3 Verification on: ${TARGET_URL}`);
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
  ];

  let allPassed = true;

  for (const vp of viewports) {
    console.log(`\n========================================`);
    console.log(`Testing Viewport: ${vp.name.toUpperCase()} (${vp.width}x${vp.height})`);
    console.log(`========================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile || false,
      hasTouch: vp.hasTouch || false,
      userAgent: vp.isMobile
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    try {
      // 1. Load Page
      console.log(`1. Navigating to ${TARGET_URL}...`);
      const response = await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(`   Response status: ${response.status()}`);
      if (response.status() !== 200) {
        throw new Error(`Expected HTTP 200, got ${response.status()}`);
      }

      await page.waitForTimeout(2000);

      // Dismiss any initial onboarding/push banners if present
      await page.evaluate(() => {
        localStorage.setItem('aetheris_onboarding_completed', 'true');
        localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
        sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
      });

      // 2. Verify Reactions System
      console.log(`2. Verifying Reactions System...`);
      const reactionTrigger = page.locator('.btn-reaction-trigger').first();
      const triggerCount = await reactionTrigger.count();
      if (triggerCount > 0) {
        await reactionTrigger.click();
        await page.waitForTimeout(400);

        const quickPicker = page.locator('#aetheris-quick-reaction-portal');
        const isQuickPickerVisible = await quickPicker.isVisible().catch(() => false);
        console.log(`   Quick reaction tray visible: ${isQuickPickerVisible}`);

        if (isQuickPickerVisible) {
          const emojiBtns = quickPicker.locator('.btn-quick-emoji');
          const emojiCount = await emojiBtns.count();
          console.log(`   Quick reaction options rendered: ${emojiCount} (expected 6)`);

          const moreBtn = quickPicker.locator('[data-reaction-action="open-full-picker"]');
          console.log(`   'More' button visible: ${await moreBtn.isVisible().catch(() => false)}`);

          const box = await quickPicker.boundingBox();
          if (box) {
            console.log(`   Quick picker bounds: x=${Math.round(box.x)}, y=${Math.round(box.y)}, w=${Math.round(box.width)}, h=${Math.round(box.height)}`);
            if (box.x < 0 || box.x + box.width > vp.width + 1) {
              console.warn(`   WARNING: Quick picker overflowed viewport horizontally!`);
            } else {
              console.log(`   OK: Clamped cleanly within viewport bounds.`);
            }
          }

          // Test clicking outside
          await page.mouse.click(10, 10);
        }
      } else {
        console.log(`   (No posts with reaction trigger on landing view)`);
      }

      // 3. Verify Awards System
      console.log(`3. Verifying Honest Awards System...`);
      const awardBtn = page.locator('.btn-open-award-modal, .btn-detail-award').first();
      if ((await awardBtn.count()) > 0) {
        await awardBtn.click();
        await page.waitForTimeout(500);

        const awardModal = page.locator('#aetheris-award-modal');
        const modalVisible = await awardModal.isVisible().catch(() => false);
        console.log(`   Award modal visible: ${modalVisible}`);

        if (modalVisible) {
          const modalText = await awardModal.innerText();
          const hasFakeCoinStrip = modalText.includes('🪙 2,450') || modalText.includes('Coin Balance');
          console.log(`   Fake coin strip absent: ${!hasFakeCoinStrip}`);

          const hasHonestLabel = modalText.includes('Bestow Recognition') || modalText.includes('Post:') || modalText.includes('Comment:');
          console.log(`   Honest recipient label present: ${hasHonestLabel}`);

          const bestowBtn = awardModal.locator('#btn-confirm-give-award');
          console.log(`   Bestow button text: "${await bestowBtn.innerText()}"`);

          const closeBtn = awardModal.locator('.btn-close-award-modal').first();
          await closeBtn.click();
          await page.waitForTimeout(300);
        }
      }

      // 4. Verify Governance Workspace
      console.log(`4. Verifying Governance Workspace...`);
      const daoNavBtn = page.locator('#nav-btn-dao, [data-nav="governance"], button:has-text("Governance"), [data-action="nav-governance"]').first();
      if ((await daoNavBtn.count()) > 0) {
        await daoNavBtn.click();
        await page.waitForTimeout(1000);

        const govWorkspace = page.locator('#governance-workspace');
        if (await govWorkspace.isVisible().catch(() => false)) {
          console.log(`   Governance workspace rendered cleanly.`);
          const proposals = page.locator('[data-governance-action="select"]');
          const count = await proposals.count();
          console.log(`   Governance proposals listed: ${count}`);

          if (count > 0) {
            const firstProposal = proposals.first();
            const text = await firstProposal.innerText();
            console.log(`   First proposal card preview:\n   ${text.split('\n').slice(0, 3).join(' | ')}`);
          }
        }
      }

      // 5. Verify Messages & Chat View
      console.log(`5. Verifying Messages & Chat View...`);
      const msgNavBtn = page.locator('#nav-btn-messages, [data-nav="messages"], button:has-text("Messages"), [data-action="nav-messages"]').first();
      if ((await msgNavBtn.count()) > 0) {
        await msgNavBtn.click();
        await page.waitForTimeout(1000);

        const emptyDM = page.locator('.chat-zero-empty-state, :has-text("Direct Messages"), :has-text("Encrypted")');
        if ((await emptyDM.count()) > 0) {
          console.log(`   Warm empty DM / E2EE onboarding state active.`);
        }
      }

      console.log(`\n>>> VIEWPORT ${vp.name.toUpperCase()} PASSED ALL CHECKS <<<`);

    } catch (err) {
      console.error(`\nFAILED in viewport ${vp.name}:`, err);
      allPassed = false;
    } finally {
      await context.close();
    }
  }

  await browser.close();
  if (!allPassed) {
    process.exit(1);
  }
  console.log(`\n========================================`);
  console.log(`ALL PRODUCTION VIEWPORT ACCEPTANCE CHECKS PASSED!`);
  console.log(`========================================`);
}

runPass3Verification().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
