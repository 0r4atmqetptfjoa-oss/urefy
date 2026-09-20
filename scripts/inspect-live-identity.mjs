import { chromium } from 'playwright';

const BASE_URL = 'https://urefy.com';

async function inspectLiveIdentity() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  PASS 2: PHASE 1 — LIVE BROWSER FIRST INSPECTION');
  console.log('  Target:', BASE_URL);
  console.log('════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  // Fresh incognito context
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log('[1] Navigating fresh incognito visitor to', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Check what localStorage keys were generated on first visit
  const storageKeys = await page.evaluate(() => {
    const keys = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k);
      keys[k] = v ? (v.length > 50 ? v.substring(0, 50) + '... (len ' + v.length + ')' : v) : '';
    }
    return keys;
  });
  console.log('\n[2] LocalStorage keys generated on first visit:');
  console.log(JSON.stringify(storageKeys, null, 2));

  // Check if onboarding modal is visible
  const onboardingVisible = await page.evaluate(() => {
    const el = document.getElementById('aetheris-onboarding-overlay');
    return !!el && el.offsetParent !== null;
  });
  console.log('\n[3] Is Onboarding Modal visible on first visit?:', onboardingVisible);

  // Check what identity information is in clientStore / window
  const clientIdentity = await page.evaluate(() => {
    const cs = window.clientStore;
    return {
      fingerprint: cs?.keypair?.fingerprint,
      publicKeyHex: cs?.keypair?.publicKeyHex,
      hasPrivateKey: !!cs?.keypair?.privateKey,
      mnemonic: cs?.mnemonic ? 'PRESENT (len ' + cs.mnemonic.split(' ').length + ' words)' : 'NONE',
    };
  });
  console.log('\n[4] In-Memory Client Identity State:');
  console.log(JSON.stringify(clientIdentity, null, 2));

  // Dismiss onboarding if present
  if (onboardingVisible) {
    console.log('\n[5] Dismissing onboarding modal to inspect app UI...');
    await page.evaluate(() => {
      localStorage.setItem('aetheris_onboarding_completed', 'true');
      localStorage.setItem('aetheris_onboarding_done', 'true');
      const el = document.getElementById('aetheris-onboarding-overlay');
      if (el) el.remove();
    });
    await page.waitForTimeout(500);
  }

  // Check Settings triggers on page
  const settingsButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button[data-action*="settings"], [id*="settings"]'));
    return btns.map(b => ({ id: b.id, dataAction: b.getAttribute('data-action'), text: b.textContent?.trim() }));
  });
  console.log('\n[6] Settings Buttons found in DOM:');
  console.log(JSON.stringify(settingsButtons, null, 2));

  // Open Settings Modal
  console.log('\n[7] Opening Settings Modal via window.sovereignSettings.openModal()...');
  const openedSettings = await page.evaluate(() => {
    if (window.sovereignSettings) {
      window.sovereignSettings.openModal();
      return true;
    }
    return false;
  });
  await page.waitForTimeout(1000);

  if (openedSettings) {
    const modalTabs = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('#unified-settings-modal [data-settings-tab]'));
      return tabs.map(t => ({
        tabId: t.getAttribute('data-settings-tab'),
        text: t.textContent?.trim().replace(/\s+/g, ' '),
      }));
    });
    console.log('\n[8] Tabs exposed in current Settings Modal:');
    console.log(JSON.stringify(modalTabs, null, 2));
  }

  // Check Profile Settings (where profile-security.ts lives)
  console.log('\n[9] Inspecting Profile Settings view...');
  const profileSettingsTabs = await page.evaluate(() => {
    if (window.profileView) {
      // open profile modal or check if present
      const html = window.profileView.renderProfileSettingsHTML ? 'RENDER_METHOD_EXISTS' : 'NO_METHOD';
      return { html };
    }
    return 'NO_PROFILE_VIEW';
  });
  console.log('Profile view inspection:', profileSettingsTabs);

  // Check WebAuthn support and registered credentials
  const webAuthnStatus = await page.evaluate(() => {
    const wa = window.webAuthnManager;
    return {
      managerExists: !!wa,
      isSupported: wa?.isSupported,
      registeredCredentials: wa?.registeredCredentials || [],
      vaultLocked: wa?.vaultLocked,
    };
  });
  console.log('\n[10] Client WebAuthn Manager status on https://urefy.com:');
  console.log(JSON.stringify(webAuthnStatus, null, 2));

  // Test server challenge endpoint on live https://urefy.com
  console.log('\n[11] Testing live /api/webauthn GET endpoint:');
  const challengeRes = await fetch(`${BASE_URL}/api/webauthn?action=challenge&fingerprint=inspect_qa`);
  const challengeData = await challengeRes.json();
  console.log('GET /api/webauthn?action=challenge status:', challengeRes.status, challengeData);

  const credsRes = await fetch(`${BASE_URL}/api/webauthn?action=credentials&fingerprint=inspect_qa`);
  const credsData = await credsRes.json();
  console.log('GET /api/webauthn?action=credentials status:', credsRes.status, credsData);

  await browser.close();
}

inspectLiveIdentity().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
