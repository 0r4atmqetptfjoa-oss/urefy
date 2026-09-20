import { chromium } from '@playwright/test';

async function verifyFixes() {
  const browser = await chromium.launch({ headless: true });

  // 1. Light Theme Hard Refresh & Zero Dark Flash Test
  console.log('--- TEST 1: Light Theme Hard Refresh & Zero Dark Flash ---');
  const contextLight = await browser.newContext();
  await contextLight.addInitScript(() => {
    window.localStorage.setItem('aetheris_onboarding_completed', 'true');
    window.localStorage.setItem('aetheris_theme_pref', 'alabaster-light');
  });
  const pageLight = await contextLight.newPage();
  await pageLight.goto('https://urefy.com/', { waitUntil: 'commit' });
  const rootClassAtCommit = await pageLight.evaluate(() => document.documentElement.className);
  const dataTheme = await pageLight.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('Root class at commit:', rootClassAtCommit);
  console.log('data-theme attribute:', dataTheme);
  const zeroDarkFlash = rootClassAtCommit.includes('light') && !rootClassAtCommit.includes('dark');
  console.log('Zero Dark Flash Confirmed:', zeroDarkFlash);
  await contextLight.close();

  // 2. Direct Navigation to /settings
  console.log('\n--- TEST 2: Direct URL to /settings ---');
  const contextSettings = await browser.newContext();
  await contextSettings.addInitScript(() => {
    window.localStorage.setItem('aetheris_onboarding_completed', 'true');
  });
  const pageSettings = await contextSettings.newPage();
  const resSet = await pageSettings.goto('https://urefy.com/settings', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Settings HTTP status:', resSet.status());
  await pageSettings.waitForTimeout(2000);
  const settingsModalVisible = await pageSettings.locator('#aetheris-settings-modal-wrapper, [role="dialog"], h2:has-text("Settings"), h3:has-text("Settings")').first().isVisible().catch(() => false);
  console.log('Settings Modal/View rendered on direct URL:', settingsModalVisible);
  await contextSettings.close();

  // 3. Direct Navigation to /governance
  console.log('\n--- TEST 3: Direct URL to /governance ---');
  const contextGov = await browser.newContext();
  await contextGov.addInitScript(() => {
    window.localStorage.setItem('aetheris_onboarding_completed', 'true');
  });
  const pageGov = await contextGov.newPage();
  const resGov = await pageGov.goto('https://urefy.com/governance', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Governance HTTP status:', resGov.status());
  await pageGov.waitForTimeout(2000);
  const govModalVisible = await pageGov.locator('#aetheris-governance-workspace-overlay, [role="dialog"], h2:has-text("Governance"), h3:has-text("Governance")').first().isVisible().catch(() => false);
  console.log('Governance Modal/View rendered on direct URL:', govModalVisible);
  await contextGov.close();

  await browser.close();

  return {
    zeroDarkFlash,
    settingsHttp: resSet.status(),
    settingsModalVisible,
    govHttp: resGov.status(),
    govModalVisible
  };
}

verifyFixes().catch(console.error);
