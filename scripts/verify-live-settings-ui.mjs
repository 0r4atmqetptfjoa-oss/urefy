import { chromium } from 'playwright';

const TARGET_URL = 'https://urefy.com';

async function verifyLiveSettingsUI() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  PASS 2: VERIFY LIVE SETTINGS -> SECURITY & PASSKEYS UI');
  console.log('  Target:', TARGET_URL);
  console.log('════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('[Step 1] Navigating to target URL...');
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  console.log('[Step 2] Opening Settings Modal to security tab...');
  await page.evaluate(() => {
    if (typeof window.__aetheris_open_settings === 'function') {
      window.__aetheris_open_settings('security');
    }
  });

  await page.waitForTimeout(500);

  console.log('[Step 3] Inspecting rendered DOM elements...');
  const inspection = await page.evaluate(() => {
    const modal = document.getElementById('unified-settings-modal');
    if (!modal) return { modalFound: false };

    const secTabBtn = modal.querySelector('[data-settings-tab="security"]');
    const addPasskeyBtn = modal.querySelector('#btn-settings-register-passkey');
    const toggleSeedBtn = modal.querySelector('#btn-settings-toggle-seed');
    const seedDisplay = modal.querySelector('#settings-seed-display');
    const techDetails = modal.querySelector('details');

    const seedWordsCount = seedDisplay ? seedDisplay.textContent?.trim().split(/\s+/).length : 0;
    const isSeedBlurred = seedDisplay ? seedDisplay.classList.contains('blur-sm') : false;

    return {
      modalFound: true,
      secTabBtnFound: !!secTabBtn,
      secTabBtnText: secTabBtn?.textContent?.replace(/\s+/g, ' ').trim(),
      addPasskeyBtnFound: !!addPasskeyBtn,
      toggleSeedBtnFound: !!toggleSeedBtn,
      seedDisplayFound: !!seedDisplay,
      seedWordsCount,
      isSeedInitiallyBlurred: isSeedBlurred,
      techDetailsFound: !!techDetails,
    };
  });

  console.log('DOM Inspection Results:', JSON.stringify(inspection, null, 2));

  console.log('\n[Step 4] Testing Reveal recovery phrase click toggle...');
  const toggleResult = await page.evaluate(() => {
    const btn = document.querySelector('#btn-settings-toggle-seed');
    const display = document.querySelector('#settings-seed-display');
    if (!btn || !display) return { error: 'elements not found' };

    btn.click();
    const isBlurredAfterFirstClick = display.classList.contains('blur-sm');
    const btnTextAfterClick = btn.textContent?.trim();

    btn.click();
    const isBlurredAfterSecondClick = display.classList.contains('blur-sm');

    return {
      success: true,
      revealed: !isBlurredAfterFirstClick,
      btnTextAfterClick,
      blurredAgainOnSecondClick: isBlurredAfterSecondClick,
    };
  });

  console.log('Seed Toggle Results:', JSON.stringify(toggleResult, null, 2));

  await browser.close();

  const allPassed =
    inspection.modalFound &&
    inspection.secTabBtnFound &&
    inspection.addPasskeyBtnFound &&
    inspection.toggleSeedBtnFound &&
    inspection.seedDisplayFound &&
    inspection.seedWordsCount === 12 &&
    inspection.isSeedInitiallyBlurred &&
    toggleResult.revealed &&
    toggleResult.blurredAgainOnSecondClick;

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  LIVE SETTINGS UI VERIFICATION RESULT:', allPassed ? 'PASS' : 'FAIL');
  console.log('════════════════════════════════════════════════════════════════\n');

  if (!allPassed) process.exit(1);
}

verifyLiveSettingsUI().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});
