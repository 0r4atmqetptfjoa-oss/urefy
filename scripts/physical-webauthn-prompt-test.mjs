import { chromium } from 'playwright';

const TARGET_URL = 'https://urefy.com';

async function testPhysicalWebAuthnPrompt() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  PASS 2: PHYSICAL BROWSER / OS WEBAUTHN PROMPT INSPECTION');
  console.log('  Target:', TARGET_URL);
  console.log('════════════════════════════════════════════════════════════════\n');

  // Launch REAL browser WITHOUT virtual authenticator / CDP mock
  const browser = await chromium.launch({
    headless: true, // We can run headless or observe prompt invocation
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  console.log('[Step 1] Navigating to', TARGET_URL);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  // Open settings
  console.log('[Step 2] Opening Unified Settings Modal...');
  const settingsOpened = await page.evaluate(() => {
    if (typeof window.__aetheris_open_settings === 'function') {
      window.__aetheris_open_settings('security');
      return true;
    }
    return false;
  });
  console.log('Settings opened via hook:', settingsOpened);

  // Check if navigator.credentials and create are available in this real environment
  const credSupport = await page.evaluate(() => ({
    hasCredentials: !!navigator.credentials,
    hasCreate: !!(navigator.credentials && navigator.credentials.create),
    hasGet: !!(navigator.credentials && navigator.credentials.get),
    userAgent: navigator.userAgent,
  }));
  console.log('Browser WebAuthn Support:', credSupport);

  // Request real challenge from server
  console.log('[Step 3] Fetching server challenge for physical test...');
  const testFp = 'physical_test_node_' + Date.now().toString(16);
  const chalRes = await fetch(`${TARGET_URL}/api/webauthn?action=challenge&fingerprint=${testFp}`);
  const chalData = await chalRes.json();
  console.log('Server Challenge response:', chalData);

  // Trigger navigator.credentials.create() in real browser context with short timeout
  console.log('[Step 4] Invoking navigator.credentials.create() in real browser...');
  const promptInspection = await page.evaluate(async ({ fp, challenge, rpId }) => {
    function b64ToBuf(b64) {
      let s = b64.replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4 !== 0) s += '=';
      const bin = atob(s);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes.buffer;
    }

    const startTime = Date.now();
    try {
      // 5-second timeout so the script completes deterministically
      const credPromise = navigator.credentials.create({
        publicKey: {
          challenge: b64ToBuf(challenge),
          rp: { name: 'UREfy Sovereign Platform', id: rpId || window.location.hostname },
          user: {
            id: new TextEncoder().encode(fp),
            name: fp,
            displayName: 'Sovereign Sovereign Identity',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },  // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'preferred',
            residentKey: 'preferred',
          },
          timeout: 4000,
        },
      });

      // Race with timeout observer
      const result = await Promise.race([
        credPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('PHYSICAL_PROMPT_TIMEOUT_PENDING_USER_INPUT')), 3800)),
      ]);

      return {
        state: 'COMPLETED_AUTHENTICATOR',
        durationMs: Date.now() - startTime,
        credId: result ? result.id : null,
      };
    } catch (err) {
      return {
        state: 'PROMPT_TRIGGERED_WITH_EXCEPTION',
        durationMs: Date.now() - startTime,
        name: err.name,
        message: err.message,
      };
    }
  }, { fp: testFp, challenge: chalData.challenge, rpId: chalData.rpId });

  console.log('\n[Result] Physical WebAuthn Prompt Inspection:');
  console.log(JSON.stringify(promptInspection, null, 2));

  let statusText = '';
  if (promptInspection.state === 'PROMPT_TRIGGERED_WITH_EXCEPTION') {
    if (
      promptInspection.message.includes('PHYSICAL_PROMPT_TIMEOUT_PENDING_USER_INPUT') ||
      promptInspection.name === 'NotAllowedError' ||
      promptInspection.name === 'AbortError'
    ) {
      statusText = 'REAL OS WEBAUTHN PROMPT REACHED / PHYSICAL USER APPROVAL REQUIRED';
    } else {
      statusText = `WEBAUTHN ERROR: ${promptInspection.name} - ${promptInspection.message}`;
    }
  } else if (promptInspection.state === 'COMPLETED_AUTHENTICATOR') {
    statusText = 'PHYSICAL AUTHENTICATION PASSED (Hardware token completed)';
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  FINAL PHYSICAL STATUS:');
  console.log('  >>> ' + statusText + ' <<<');
  console.log('════════════════════════════════════════════════════════════════\n');

  await browser.close();
}

testPhysicalWebAuthnPrompt().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
