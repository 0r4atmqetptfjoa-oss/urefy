import { chromium } from 'playwright';
import {
  generateMnemonic,
  mnemonicToSeed,
  generateKeyPair,
  createSovereignIdentity,
  signMessage,
  bytesToHex,
} from '@aetheris/core-crypto';
import { execSync } from 'node:child_process';

const BASE_URL = 'https://urefy.com';

function d1Query(sql) {
  const cmd = `npx wrangler d1 execute aetheris-db --remote --command "${sql.replace(/"/g, '\\"')}"`;
  const res = execSync(cmd, { cwd: 'packages/client-ui', encoding: 'utf8' });
  try {
    const jsonStart = res.indexOf('[');
    if (jsonStart >= 0) {
      const parsed = JSON.parse(res.substring(jsonStart));
      return parsed[0]?.results || [];
    }
  } catch (e) {
    console.warn('d1Query parse error:', e.message);
  }
  return [];
}

async function runVirtualWebAuthnSuite() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  PASS 2: VIRTUAL WEBAUTHN & CREDENTIAL LIFECYCLE SUITE');
  console.log('  Target:', BASE_URL);
  console.log('════════════════════════════════════════════════════════════════\n');

  const mnemonic = generateMnemonic(128);
  const seed = mnemonicToSeed(mnemonic).subarray(0, 32);
  const keypair = generateKeyPair(seed);
  const sovereign = createSovereignIdentity({ seed });
  const qaFingerprint = sovereign.identity.fingerprint;
  const qaUser = { keypair, identity: sovereign.identity };
  console.log('QA User Fingerprint:', qaFingerprint);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Create CDP session to control Virtual Authenticator
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');

  // Add Virtual Authenticator: CTAP2, internal (platform authenticator), P-256
  const authenticator = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: false,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });
  console.log('Virtual Authenticator Created:', authenticator.authenticatorId);

  const results = {};

  try {
    // ─── 1. FETCH REGISTRATION CHALLENGE ─────────────────────────────────────
    console.log('\n[Test 1] Requesting registration challenge from /api/webauthn...');
    const challengeRes = await fetch(`${BASE_URL}/api/webauthn?action=challenge&fingerprint=${qaFingerprint}`);
    const challengeData = await challengeRes.json();
    console.log('Challenge response:', challengeRes.status, challengeData);
    results.challengeFetch = {
      status: challengeRes.status,
      rpId: challengeData.rpId,
      challengePresent: typeof challengeData.challenge === 'string' && challengeData.challenge.length > 20,
    };

    // ─── 2. RUN REGISTRATION VIA WEBAUTHN API IN BROWSER ─────────────────────
    console.log('\n[Test 2] Executing navigator.credentials.create() with Virtual Authenticator...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const regResult = await page.evaluate(async ({ fp, challenge, rpId }) => {
      function b64ToBuf(b64) {
        let s = b64.replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4 !== 0) s += '=';
        const bin = atob(s);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes.buffer;
      }
      function bufToB64(buf) {
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }

      const creationOptions = {
        publicKey: {
          challenge: b64ToBuf(challenge),
          rp: { name: 'UREfy Sovereign Edge', id: rpId || window.location.hostname },
          user: {
            id: new TextEncoder().encode(fp),
            name: fp,
            displayName: 'QA Sovereign Node',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            userVerification: 'preferred',
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: 'direct',
        },
      };

      try {
        const cred = await navigator.credentials.create(creationOptions);
        if (!cred) return { error: 'No credential returned' };
        const resp = cred.response;
        return {
          success: true,
          credentialId: cred.id,
          rawId: bufToB64(cred.rawId),
          clientDataJSON: new TextDecoder().decode(resp.clientDataJSON),
          attestationObject: bufToB64(resp.attestationObject),
        };
      } catch (e) {
        return { error: e.message };
      }
    }, { fp: qaFingerprint, challenge: challengeData.challenge, rpId: challengeData.rpId });

    console.log('Browser WebAuthn creation result:', regResult.success ? 'SUCCESS' : regResult.error);
    if (!regResult.success) throw new Error('WebAuthn creation failed: ' + regResult.error);

    // Attach Ed25519 signature proof over challenge
    const challengeStr = challengeData.challenge;
    const sigBytes = signMessage(challengeStr, qaUser.keypair.privateKey);
    const signatureHex = bytesToHex(sigBytes);
    const publicKeyHex = bytesToHex(qaUser.keypair.publicKey);

    console.log('\n[Test 2b] Submitting registration to /api/webauthn...');
    const submitRegRes = await fetch(`${BASE_URL}/api/webauthn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        fingerprint: qaFingerprint,
        credentialId: regResult.credentialId,
        rawId: regResult.rawId,
        clientDataJSON: regResult.clientDataJSON,
        attestationObject: regResult.attestationObject,
        signature: signatureHex,
        publicKeyHex: publicKeyHex,
      }),
    });
    const submitRegData = await submitRegRes.json();
    console.log('Registration response status:', submitRegRes.status, submitRegData);
    results.registration = {
      status: submitRegRes.status,
      success: submitRegData.success,
      credentialId: regResult.credentialId,
    };

    // Verify in D1
    const d1Creds = d1Query(`SELECT credential_id, fingerprint, sign_count FROM webauthn_credentials WHERE credential_id = '${regResult.credentialId}';`);
    console.log('D1 Credential record:', d1Creds);
    results.d1Storage = {
      found: d1Creds.length === 1,
      signCount: d1Creds[0]?.sign_count,
    };

    // ─── 3. WEBAUTHN ASSERTION / AUTHENTICATION ──────────────────────────────
    console.log('\n[Test 3] Requesting assertion challenge from /api/webauthn...');
    const authChallengeRes = await fetch(`${BASE_URL}/api/webauthn?action=challenge&fingerprint=${qaFingerprint}`);
    const authChallengeData = await authChallengeRes.json();

    console.log('\n[Test 3b] Executing navigator.credentials.get() with Virtual Authenticator...');
    const assertionResult = await page.evaluate(async ({ challenge, credId, rpId }) => {
      function b64ToBuf(b64) {
        let s = b64.replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4 !== 0) s += '=';
        const bin = atob(s);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes.buffer;
      }
      function bufToB64(buf) {
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }

      try {
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge: b64ToBuf(challenge),
            rpId: rpId || window.location.hostname,
            allowCredentials: [{ id: b64ToBuf(credId), type: 'public-key' }],
            userVerification: 'preferred',
            timeout: 60000,
          },
        });
        if (!assertion) return { error: 'No assertion returned' };
        const resp = assertion.response;
        return {
          success: true,
          credentialId: assertion.id,
          clientDataJSON: new TextDecoder().decode(resp.clientDataJSON),
          authenticatorData: bufToB64(resp.authenticatorData),
          signature: bufToB64(resp.signature),
        };
      } catch (e) {
        return { error: e.message };
      }
    }, { challenge: authChallengeData.challenge, credId: regResult.credentialId, rpId: authChallengeData.rpId });

    console.log('Browser WebAuthn assertion result:', assertionResult.success ? 'SUCCESS' : assertionResult.error);
    if (!assertionResult.success) throw new Error('Assertion failed: ' + assertionResult.error);

    console.log('\n[Test 3c] Submitting assertion verification to /api/webauthn...');
    const verifyRes = await fetch(`${BASE_URL}/api/webauthn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify',
        fingerprint: qaFingerprint,
        credentialId: assertionResult.credentialId,
        clientDataJSON: assertionResult.clientDataJSON,
        authenticatorData: assertionResult.authenticatorData,
        signature: assertionResult.signature,
      }),
    });
    const verifyData = await verifyRes.json();
    console.log('Assertion verification response:', verifyRes.status, verifyData);
    results.assertionVerification = {
      status: verifyRes.status,
      authenticated: verifyData.authenticated,
      counter: verifyData.counter,
    };

    // ─── 4. UNKNOWN CREDENTIAL TEST ──────────────────────────────────────────
    console.log('\n[Test 4] Attempting assertion with unknown / un-registered credentialId...');
    const fakeCredRes = await fetch(`${BASE_URL}/api/webauthn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify',
        fingerprint: qaFingerprint,
        credentialId: 'fake_non_existent_credential_id',
        clientDataJSON: assertionResult.clientDataJSON,
        authenticatorData: assertionResult.authenticatorData,
        signature: assertionResult.signature,
      }),
    });
    const fakeCredData = await fakeCredRes.json();
    console.log('Fake credential response:', fakeCredRes.status, fakeCredData);
    results.unknownCredential = {
      status: fakeCredRes.status,
      rejected: fakeCredRes.status === 404 || fakeCredRes.status === 401,
      error: fakeCredData.error,
    };

    // ─── 5. REMOVE PASSKEY TEST ──────────────────────────────────────────────
    console.log('\n[Test 5] Removing registered passkey...');
    const delSigBytes = signMessage(regResult.credentialId, qaUser.keypair.privateKey);
    const delRes = await fetch(`${BASE_URL}/api/webauthn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        credentialId: regResult.credentialId,
        fingerprint: qaFingerprint,
        signature: bytesToHex(delSigBytes),
        publicKeyHex: publicKeyHex,
      }),
    });
    const delData = await delRes.json();
    console.log('Deletion response:', delRes.status, delData);
    results.passkeyRemoval = {
      status: delRes.status,
      success: delData.success,
    };

    // Verify pruned from D1
    const d1After = d1Query(`SELECT credential_id FROM webauthn_credentials WHERE credential_id = '${regResult.credentialId}';`);
    console.log('D1 records after deletion (must be 0):', d1After.length);
    results.d1Pruned = { count: d1After.length, isClean: d1After.length === 0 };

    // Attempt authentication with removed credential -> MUST fail
    console.log('\n[Test 5b] Attempting assertion with deleted credential (must fail)...');
    const authDeletedRes = await fetch(`${BASE_URL}/api/webauthn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify',
        fingerprint: qaFingerprint,
        credentialId: regResult.credentialId,
        clientDataJSON: assertionResult.clientDataJSON,
        authenticatorData: assertionResult.authenticatorData,
        signature: assertionResult.signature,
      }),
    });
    const authDeletedData = await authDeletedRes.json();
    console.log('Assertion with deleted credential response:', authDeletedRes.status, authDeletedData);
    results.deletedAuthRejected = {
      status: authDeletedRes.status,
      rejected: authDeletedRes.status >= 400,
    };

  } finally {
    await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId: authenticator.authenticatorId });
    await browser.close();
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  VIRTUAL WEBAUTHN SUITE SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
  console.log('════════════════════════════════════════════════════════════════');
}

runVirtualWebAuthnSuite().catch(err => {
  console.error('Virtual WebAuthn Suite Failed:', err);
  process.exit(1);
});
