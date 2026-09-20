import { chromium } from 'playwright';

const TARGET_URL = 'https://urefy.com';

async function testMigrationAndReturningUser() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  PASS 2: DEVICE MIGRATION & RETURNING USER BEHAVIOR SUITE');
  console.log('  Target:', TARGET_URL);
  console.log('════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });

  // ─── 1. BROWSER A: CREATE IDENTITY AND CAPTURE FINGERPRINT & MNEMONIC ───
  console.log('[Browser A] Launching first context (originating device)...');
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await pageA.goto(TARGET_URL, { waitUntil: 'networkidle' });

  const identityA = await pageA.evaluate(async () => {
    const cs = window.clientStore;
    const mnemonic = cs?.mnemonic;
    const fingerprint = cs?.keypair?.fingerprint;
    const pubKey = cs?.keypair?.publicKeyHex;
    return { mnemonic, fingerprint, pubKey };
  });
  console.log('[Browser A] Originating Identity:', identityA);

  // ─── 2. RETURNING USER TEST (RELOAD / REOPEN BROWSER A) ─────────────────
  console.log('\n[Browser A] Testing returning-user behavior (reload page)...');
  await pageA.reload({ waitUntil: 'networkidle' });

  const reloadedA = await pageA.evaluate(() => {
    const cs = window.clientStore;
    return {
      fingerprint: cs?.keypair?.fingerprint,
      pubKey: cs?.keypair?.publicKeyHex,
      hasMnemonic: !!cs?.mnemonic,
    };
  });
  console.log('[Browser A] Reloaded Identity:', reloadedA);
  const returningUserPassed =
    reloadedA.fingerprint === identityA.fingerprint &&
    reloadedA.pubKey === identityA.pubKey;
  console.log('Returning User Persistence:', returningUserPassed ? 'PASS' : 'FAIL');

  // ─── 3. BROWSER B: ISOLATED MIGRATION VIA RECOVERY PHRASE ─────────────
  console.log('\n[Browser B] Launching completely separate context (new target device)...');
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await pageB.goto(TARGET_URL, { waitUntil: 'networkidle' });

  // Browser B initially has its own auto-generated identity
  const initialB = await pageB.evaluate(() => {
    const cs = window.clientStore;
    return { fingerprint: cs?.keypair?.fingerprint };
  });
  console.log('[Browser B] Initial Fresh Identity:', initialB);

  // Now restore Identity A onto Browser B using Identity A's 12-word mnemonic
  console.log('[Browser B] Restoring Identity A via 12-word recovery phrase...');
  const restoredB = await pageB.evaluate(async (mnemonicToRestore) => {
    const cs = window.clientStore;
    if (!cs || typeof cs.restoreIdentityFromMnemonic !== 'function') {
      // Direct sovereign restore via core-crypto if clientStore method name differs
      return { error: 'restoreIdentityFromMnemonic not found on clientStore' };
    }
    const success = await cs.restoreIdentityFromMnemonic(mnemonicToRestore);
    return {
      success,
      fingerprint: cs.keypair?.fingerprint,
      pubKey: cs.keypair?.publicKeyHex,
    };
  }, identityA.mnemonic);

  console.log('[Browser B] Restoration Result:', restoredB);

  await contextA.close();
  await contextB.close();
  await browser.close();

  const migrationPassed = restoredB.fingerprint === identityA.fingerprint;
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  MIGRATION & PERSISTENCE SUMMARY:');
  console.log('  - Returning User Persistence:', returningUserPassed ? 'PASS' : 'FAIL');
  console.log('  - Device Migration (Fingerprint A === B):', migrationPassed ? 'PASS' : 'FAIL');
  console.log('════════════════════════════════════════════════════════════════\n');
}

testMigrationAndReturningUser().catch(err => {
  console.error('Migration suite failed:', err);
  process.exit(1);
});
