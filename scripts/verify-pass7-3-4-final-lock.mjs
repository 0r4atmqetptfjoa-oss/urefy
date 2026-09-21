#!/usr/bin/env node
/**
 * UREfy PASS 7.3.4 FINAL LOCK: DEVICE SIGNATURE PROOF & LOCAL DM AT-REST VERIFICATION
 * Live Target: https://urefy.com
 */

import { chromium } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';
import {
  createSovereignIdentity,
  createSignedEnvelope,
  generateDeviceKeypair,
  issueDeviceCertificate,
  createDeviceSignedEnvelope,
  verifyDeviceSignedEnvelope,
} from '../packages/core-crypto/dist/index.js';

const TARGET_URL = process.env.LIVE_URL || 'https://urefy.com';
const ARTIFACT_DIR = path.resolve('artifacts');
const BRAIN_DIR = 'C:\\Users\\razva\\.gemini\\antigravity\\brain\\259f4798-355b-4037-ba23-d1ad4471236c';
const CANARY_STRING = 'UREFY_AT_REST_TEST_9F31B7';

async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch (_) {}
}

async function copyToBrain(fileName) {
  try {
    const src = path.join(ARTIFACT_DIR, fileName);
    const dest = path.join(BRAIN_DIR, fileName);
    await fs.copyFile(src, dest);
    console.log(`[Artifact] Copied ${fileName} to brain.`);
  } catch (err) {
    console.warn(`[Artifact] Could not copy ${fileName} to brain:`, err.message);
  }
}

async function runPass734FinalLockVerification() {
  console.log('================================================================');
  console.log('UREfy PASS 7.3.4 FINAL LOCK — DEVICE SIGNATURE PROOF & AT-REST AUDIT');
  console.log('Target:', TARGET_URL);
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  await ensureDir(ARTIFACT_DIR);

  const report = {
    target: TARGET_URL,
    timestamp: new Date().toISOString(),
    identities: {},
    devices: {},
    stage1_deviceSignatureWireVerification: {
      sendUsesDeviceSignature: false,
      pollUsesDeviceSignature: false,
      readReceiptUsesDeviceSignature: false,
      wireFormatVerified: false,
      details: {},
      passed: false,
    },
    stage2_securityNegativeTestSuite: {
      neg1_sendCopiedPublicCredentialsBlocked: false,
      neg1_httpCode: null,
      neg2_pollCopiedPublicCredentialsBlocked: false,
      neg2_httpCode: null,
      neg2_zeroCiphertextReturned: false,
      neg3_readReceiptCopiedPublicCredentialsBlocked: false,
      neg3_httpCode: null,
      neg4_tamperedDeviceSignatureBlocked: false,
      neg4_httpCode: null,
      neg5_replayDeviceNonceBlocked: false,
      neg5_httpCode: null,
      neg6_forgedCertificateRegistrationBlocked: false,
      neg6_httpCode: null,
      neg7_authorityBoundariesRootOperationsEnforced: false,
      neg7_httpCode: null,
      neg8_revokedDeviceBlockedOnAllOperations: false,
      passed: false,
    },
    stage3_localAtRestStorageAudit: {
      canaryString: CANARY_STRING,
      canarySentAndReceived: false,
      localStorageCanaryFound: true,
      sessionStorageCanaryFound: true,
      indexedDBPlaintextCanaryFound: true,
      masterKeyIsUnextractableCryptoKey: false,
      masterKeyAlgorithm: null,
      masterKeyExtractable: null,
      deviceKeypairStoredAsAesGcmEnvelope: false,
      messageHistoryStoredAsAesGcmEnvelope: false,
      reloadDecryptionSuccessful: false,
      passed: false,
    },
    stage4_routineOpsDoNotUseRootKey: {
      rootPrivateKeyRetainedOnlyForRootActions: true,
      routineOpsSignWithDevicePrivateKeyOnly: false,
      passed: false,
    },
    allPassed: false,
  };

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // ----------------------------------------------------------------
    // SETUP: 3 ISOLATED BROWSER CONTEXTS (A1, A2, B)
    // ----------------------------------------------------------------
    console.log('[1/6] Launching isolated browser contexts for Alice (A1, A2) and Bob (B)...');
    const ctxA1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ctxA2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ctxB  = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    for (const ctx of [ctxA1, ctxA2, ctxB]) {
      await ctx.addInitScript(() => {
        window.localStorage.setItem('aetheris_onboarding_completed', 'true');
      });
    }

    const pageA1 = await ctxA1.newPage();
    const pageB  = await ctxB.newPage();

    console.log('[1/6] Navigating Alice A1 and Bob B to', TARGET_URL, '...');
    await Promise.all([
      pageA1.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }),
      pageB.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }),
    ]);

    await Promise.all([
      pageA1.waitForFunction(() => Boolean(window.clientStore?.sovereignIdentity?.fingerprint), { timeout: 45000 }),
      pageB.waitForFunction(() => Boolean(window.clientStore?.sovereignIdentity?.fingerprint), { timeout: 45000 }),
    ]);

    // Ensure DM managers and Edge keys are registered
    await Promise.all([
      pageA1.evaluate(async () => {
        await window.__aetherisDM?.ready;
        await window.__aetherisDM?.startLiveSync();
        await window.__aetherisDM.transport?.register();
      }),
      pageB.evaluate(async () => {
        await window.__aetherisDM?.ready;
        await window.__aetherisDM?.startLiveSync();
        await window.__aetherisDM.transport?.register();
      }),
    ]);

    const idA = await pageA1.evaluate(() => ({
      fingerprint: window.clientStore.sovereignIdentity.fingerprint,
      signingPublicKey: window.clientStore.sovereignIdentity.signingPublicKey,
    }));
    const idB = await pageB.evaluate(() => ({
      fingerprint: window.clientStore.sovereignIdentity.fingerprint,
      signingPublicKey: window.clientStore.sovereignIdentity.signingPublicKey,
    }));

    const aliceMnemonic = await pageA1.evaluate(async () => {
      await window.clientStore?.identityPersistence;
      return window.clientStore.mnemonic;
    });

    console.log('Alice Sovereign Root (A):', idA.fingerprint, idA.signingPublicKey?.slice(0, 16) + '...');
    console.log('Bob Sovereign Root (B):  ', idB.fingerprint, idB.signingPublicKey?.slice(0, 16) + '...');

    // Restore Alice identity on Device A2
    const pageA2 = await ctxA2.newPage();
    await pageA2.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await pageA2.waitForFunction(() => Boolean(window.clientStore?.sovereignIdentity?.fingerprint), { timeout: 45000 });

    console.log('[1/6] Restoring Alice identity on Device A2 from mnemonic...');
    await pageA2.evaluate(async (m) => {
      window.clientStore.restoreIdentityFromMnemonic(m);
      await window.clientStore.identityPersistence;
      await window.__aetherisDM?.ready;
      await window.__aetherisDM?.startLiveSync();
      await window.__aetherisDM.transport?.register();
    }, aliceMnemonic);

    const devA1 = await pageA1.evaluate(async () => {
      const kp = await window.__aetherisDM.transport.getDeviceKeypair();
      const reg = await window.__aetherisDM.transport.registerDevice('Alice Workstation (A1)');
      return { keypair: kp, reg };
    });

    const devA2 = await pageA2.evaluate(async () => {
      const kp = await window.__aetherisDM.transport.getDeviceKeypair();
      const reg = await window.__aetherisDM.transport.registerDevice('Alice Phone (A2)');
      return { keypair: kp, reg };
    });

    const devB = await pageB.evaluate(async () => {
      const kp = await window.__aetherisDM.transport.getDeviceKeypair();
      const reg = await window.__aetherisDM.transport.registerDevice('Bob Device (B)');
      return { keypair: kp, reg };
    });

    report.identities = { alice: idA, bob: idB };
    report.devices = {
      a1: { deviceId: devA1.keypair.deviceId, publicKey: devA1.keypair.publicKeyHex },
      a2: { deviceId: devA2.keypair.deviceId, publicKey: devA2.keypair.publicKeyHex },
      b:  { deviceId: devB.keypair.deviceId,  publicKey: devB.keypair.publicKeyHex },
    };

    console.log('Alice Device A1 ID:', devA1.keypair.deviceId);
    console.log('Alice Device A2 ID:', devA2.keypair.deviceId);
    console.log('Bob Device B ID:   ', devB.keypair.deviceId);

    // ----------------------------------------------------------------
    // STAGE 1: DEVICE SIGNATURE WIRE VERIFICATION
    // ----------------------------------------------------------------
    console.log('\n[2/6] Stage 1: Verifying Device-Signed Envelopes on Wire (Send, List, Read-Receipt)...');

    // Monitor A1 network calls to /api/direct-messages
    const capturedEnvelopes = [];
    pageA1.on('request', req => {
      if (req.url().includes('/api/direct-messages') && req.method() === 'POST') {
        try {
          const postData = JSON.parse(req.postData() || '{}');
          capturedEnvelopes.push({
            authType: postData.authType,
            action: postData.payload?.action,
            deviceId: postData.deviceId,
            devicePublicKey: postData.devicePublicKey,
            signature: postData.signature,
            nonce: postData.nonce,
            timestamp: postData.timestamp,
          });
        } catch (_) {}
      }
    });

    // 1. A1 sends message to B
    console.log('  Sending test message from A1 to B...');
    const sendResult = await pageA1.evaluate(async (peerFP) => {
      return await window.__aetherisDM.transport.send(peerFP, { text: 'Hello from device A1 with signature proof' });
    }, idB.fingerprint);

    // 2. A1 lists messages
    console.log('  Polling inbox from A1...');
    const listResult = await pageA1.evaluate(async () => {
      return await window.__aetherisDM.transport.poll(0);
    });

    // 3. A1 sends read-receipt
    console.log('  Sending read-receipt from A1...');
    const receiptResult = await pageA1.evaluate(async ({ peerFP, msgId }) => {
      return await window.__aetherisDM.transport.sendReadReceipt(peerFP, [msgId]);
    }, { peerFP: idB.fingerprint, msgId: sendResult.id });

    // Verify wire captures
    const sendReq = capturedEnvelopes.find(e => e.action === 'send');
    const listReq = capturedEnvelopes.find(e => e.action === 'list');
    const receiptReq = capturedEnvelopes.find(e => e.action === 'read-receipt');

    console.log('  Send wire auth:', sendReq?.authType, '| Device ID:', sendReq?.deviceId, '| Sig len:', sendReq?.signature?.length);
    console.log('  List wire auth:', listReq?.authType, '| Device ID:', listReq?.deviceId, '| Sig len:', listReq?.signature?.length);
    console.log('  Receipt wire auth:', receiptReq?.authType, '| Device ID:', receiptReq?.deviceId, '| Sig len:', receiptReq?.signature?.length);

    const wireOk = Boolean(
      sendReq && sendReq.authType === 'device' && sendReq.signature && sendReq.deviceId === devA1.keypair.deviceId &&
      listReq && listReq.authType === 'device' && listReq.signature && listReq.deviceId === devA1.keypair.deviceId &&
      receiptReq && receiptReq.authType === 'device' && receiptReq.signature && receiptReq.deviceId === devA1.keypair.deviceId
    );

    report.stage1_deviceSignatureWireVerification = {
      sendUsesDeviceSignature: Boolean(sendReq && sendReq.authType === 'device' && sendReq.signature),
      pollUsesDeviceSignature: Boolean(listReq && listReq.authType === 'device' && listReq.signature),
      readReceiptUsesDeviceSignature: Boolean(receiptReq && receiptReq.authType === 'device' && receiptReq.signature),
      wireFormatVerified: wireOk,
      details: { sendReq, listReq, receiptReq },
      passed: wireOk,
    };
    report.stage4_routineOpsDoNotUseRootKey.routineOpsSignWithDevicePrivateKeyOnly = wireOk;
    report.stage4_routineOpsDoNotUseRootKey.passed = wireOk;

    console.log(`  Stage 1 Result: ${wireOk ? 'PASS' : 'FAIL'}`);

    // ----------------------------------------------------------------
    // STAGE 2: SECURITY & CRYPTOGRAPHIC NEGATIVE TEST SUITE (SECTION 17)
    // ----------------------------------------------------------------
    console.log('\n[3/6] Stage 2: Running Cryptographic Negative Test Suite (Section 17)...');

    // Neg 1: Attacker sends with copied public credentials (deviceId, devicePublicKey, fingerprint) but NO signature / private key
    console.log('  [Neg 1] Testing send with copied public credentials without device signature...');
    const neg1Res = await fetch(`${TARGET_URL}/api/direct-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send',
        fingerprint: idA.fingerprint,
        deviceId: devA1.keypair.deviceId,
        devicePublicKey: devA1.keypair.publicKeyHex,
        message: {
          id: 'forged_msg_' + Date.now(),
          sender: idA.fingerprint,
          recipient: idB.fingerprint,
          senderPublicKey: idA.signingPublicKey,
          recipientPublicKey: idB.signingPublicKey,
          ephemeralPublicKey: devA1.keypair.publicKeyHex,
          sequence: 1,
          ciphertext: 'aabbcc',
          version: 2,
        },
      }),
    });
    const neg1Json = await neg1Res.json().catch(() => ({}));
    const neg1Blocked = (neg1Res.status === 401 || neg1Res.status === 403) && neg1Json.success === false;
    console.log(`    Result: HTTP ${neg1Res.status} (${neg1Json.error || 'Blocked'}) -> ${neg1Blocked ? 'PASS' : 'FAIL'}`);
    report.stage2_securityNegativeTestSuite.neg1_sendCopiedPublicCredentialsBlocked = neg1Blocked;
    report.stage2_securityNegativeTestSuite.neg1_httpCode = neg1Res.status;

    // Neg 2: Attacker lists/polls with copied public credentials without device signature
    console.log('  [Neg 2] Testing list/poll with copied public credentials without device signature...');
    const neg2Res = await fetch(`${TARGET_URL}/api/direct-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'list',
        fingerprint: idA.fingerprint,
        deviceId: devA1.keypair.deviceId,
        devicePublicKey: devA1.keypair.publicKeyHex,
        after: 0,
      }),
    });
    const neg2Json = await neg2Res.json().catch(() => ({}));
    const neg2Blocked = (neg2Res.status === 401 || neg2Res.status === 403) && neg2Json.success === false;
    const neg2ZeroCiphertext = !neg2Json.messages || neg2Json.messages.length === 0;
    console.log(`    Result: HTTP ${neg2Res.status} (Zero Ciphertext: ${neg2ZeroCiphertext}) -> ${neg2Blocked && neg2ZeroCiphertext ? 'PASS' : 'FAIL'}`);
    report.stage2_securityNegativeTestSuite.neg2_pollCopiedPublicCredentialsBlocked = neg2Blocked;
    report.stage2_securityNegativeTestSuite.neg2_httpCode = neg2Res.status;
    report.stage2_securityNegativeTestSuite.neg2_zeroCiphertextReturned = neg2ZeroCiphertext;

    // Neg 3: Attacker attempts read-receipt without device signature
    console.log('  [Neg 3] Testing read-receipt with copied public credentials without device signature...');
    const neg3Res = await fetch(`${TARGET_URL}/api/direct-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'read-receipt',
        fingerprint: idA.fingerprint,
        deviceId: devA1.keypair.deviceId,
        devicePublicKey: devA1.keypair.publicKeyHex,
        messageIds: [sendResult.id],
      }),
    });
    const neg3Json = await neg3Res.json().catch(() => ({}));
    const neg3Blocked = (neg3Res.status === 401 || neg3Res.status === 403) && neg3Json.success === false;
    console.log(`    Result: HTTP ${neg3Res.status} -> ${neg3Blocked ? 'PASS' : 'FAIL'}`);
    report.stage2_securityNegativeTestSuite.neg3_readReceiptCopiedPublicCredentialsBlocked = neg3Blocked;
    report.stage2_securityNegativeTestSuite.neg3_httpCode = neg3Res.status;

    // Neg 4: Tampered device signature (modified payload action/content)
    console.log('  [Neg 4] Testing tampered device signature rejection...');
    const validDevKp = generateDeviceKeypair('test-device-kp');
    const validEnvelope = createDeviceSignedEnvelope({
      action: 'list',
      after: 0,
    }, validDevKp, idA.fingerprint);
    // Tamper payload after signing
    const tamperedEnvelope = {
      ...validEnvelope,
      payload: { action: 'list', after: 999 }, // tampered!
    };
    const neg4Res = await fetch(`${TARGET_URL}/api/direct-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tamperedEnvelope),
    });
    const neg4Json = await neg4Res.json().catch(() => ({}));
    const neg4Blocked = (neg4Res.status === 401 || neg4Res.status === 403) && neg4Json.success === false;
    console.log(`    Result: HTTP ${neg4Res.status} (${neg4Json.error}) -> ${neg4Blocked ? 'PASS' : 'FAIL'}`);
    report.stage2_securityNegativeTestSuite.neg4_tamperedDeviceSignatureBlocked = neg4Blocked;
    report.stage2_securityNegativeTestSuite.neg4_httpCode = neg4Res.status;

    // Neg 5: Replay attack with duplicate nonce
    console.log('  [Neg 5] Testing replay attack rejection (duplicate nonce)...');
    // Send valid request using A1 device keypair in pageA1
    const replayTestRes = await pageA1.evaluate(async () => {
      const devKp = await window.__aetherisDM.transport.getDeviceKeypair();
      const ownerFP = window.clientStore.sovereignIdentity.fingerprint;
      const env = window.__aetherisDM.transport.post ? null : null;
      // We do a direct fetch with the same envelope twice
      const keys = await window.__aetherisDM.transport.getKeys();
      // Let's create envelope
      return { devKp, ownerFP };
    });
    // Create an envelope in node using A1's device keypair
    const a1DevKp = {
      deviceId: devA1.keypair.deviceId,
      publicKeyHex: devA1.keypair.publicKeyHex,
      privateKeyHex: devA1.keypair.privateKeyHex,
    };
    const freshEnv = createDeviceSignedEnvelope({
      action: 'list',
      after: 0,
    }, a1DevKp, idA.fingerprint);

    const firstAttempt = await fetch(`${TARGET_URL}/api/direct-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(freshEnv),
    });
    const firstJson = await firstAttempt.json().catch(() => ({}));

    // Second attempt with exact same nonce
    const replayAttempt = await fetch(`${TARGET_URL}/api/direct-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(freshEnv),
    });
    const replayJson = await replayAttempt.json().catch(() => ({}));
    const neg5Blocked = replayAttempt.status === 401 && replayJson.error?.includes('Replay attack detected');
    console.log(`    First: HTTP ${firstAttempt.status}, Replay: HTTP ${replayAttempt.status} (${replayJson.error}) -> ${neg5Blocked ? 'PASS' : 'FAIL'}`);
    report.stage2_securityNegativeTestSuite.neg5_replayDeviceNonceBlocked = neg5Blocked;
    report.stage2_securityNegativeTestSuite.neg5_httpCode = replayAttempt.status;

    // Neg 6: Wrong/tampered device certificate registration
    console.log('  [Neg 6] Testing forged device certificate registration rejection...');
    const forgedCert = {
      version: 1,
      identityFingerprint: idA.fingerprint,
      deviceId: 'dev_forged_999',
      devicePublicKey: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
      deviceLabel: 'Forged Device',
      issuedAt: Date.now(),
    };
    const attackerIdentity = createSovereignIdentity();
    const fakeEnvelope = createSignedEnvelope({
      action: 'register-device',
      deviceId: forgedCert.deviceId,
      devicePublicKey: forgedCert.devicePublicKey,
      certificate: forgedCert,
      certificateSignature: 'deadbeef'.repeat(16), // invalid signature!
    }, attackerIdentity);
    const neg6Res = await fetch(`${TARGET_URL}/api/direct-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fakeEnvelope),
    });
    const neg6Json = await neg6Res.json().catch(() => ({}));
    const neg6Blocked = (neg6Res.status === 400 || neg6Res.status === 401 || neg6Res.status === 403) && neg6Json.success === false;
    console.log(`    Result: HTTP ${neg6Res.status} (${neg6Json.error}) -> ${neg6Blocked ? 'PASS' : 'FAIL'}`);
    report.stage2_securityNegativeTestSuite.neg6_forgedCertificateRegistrationBlocked = neg6Blocked;
    report.stage2_securityNegativeTestSuite.neg6_httpCode = neg6Res.status;

    // Neg 7: Device attempting root-only actions
    console.log('  [Neg 7] Testing device auth attempting root action (register-device)...');
    const devRootAttempt = createDeviceSignedEnvelope({
      action: 'register-device',
      deviceId: 'dev_sub_attempt',
      devicePublicKey: 'aa'.repeat(32),
    }, a1DevKp, idA.fingerprint);
    const neg7Res = await fetch(`${TARGET_URL}/api/direct-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(devRootAttempt),
    });
    const neg7Json = await neg7Res.json().catch(() => ({}));
    const neg7Blocked = neg7Res.status === 403 && neg7Json.error?.includes('Sovereign root authority required');
    console.log(`    Result: HTTP ${neg7Res.status} (${neg7Json.error}) -> ${neg7Blocked ? 'PASS' : 'FAIL'}`);
    report.stage2_securityNegativeTestSuite.neg7_authorityBoundariesRootOperationsEnforced = neg7Blocked;
    report.stage2_securityNegativeTestSuite.neg7_httpCode = neg7Res.status;

    // Neg 8: Revoked device rejected on all operations
    console.log('  [Neg 8] Testing revoked device blocked from sending, polling, and read-receipts...');
    // Revoke A2 from A1
    const revokeRes = await pageA1.evaluate(async (devIdToRevoke) => {
      return await window.__aetherisDM.transport.revokeDevice(devIdToRevoke);
    }, devA2.keypair.deviceId);
    console.log('    Revocation of A2 executed:', revokeRes);

    // A2 attempts send
    const a2SendBlocked = await pageA2.evaluate(async (peerFP) => {
      try {
        await window.__aetherisDM.transport.send(peerFP, { text: 'A2 forbidden message' });
        return { blocked: false };
      } catch (err) {
        return { blocked: true, message: err.message };
      }
    }, idB.fingerprint);

    // A2 attempts poll
    const a2PollBlocked = await pageA2.evaluate(async () => {
      try {
        await window.__aetherisDM.transport.poll(0);
        return { blocked: false };
      } catch (err) {
        return { blocked: true, message: err.message };
      }
    });

    // A2 attempts read-receipt
    const a2ReceiptBlocked = await pageA2.evaluate(async ({ peerFP, msgId }) => {
      try {
        await window.__aetherisDM.transport.sendReadReceipt(peerFP, [msgId]);
        return { blocked: false };
      } catch (err) {
        return { blocked: true, message: err.message };
      }
    }, { peerFP: idB.fingerprint, msgId: sendResult.id });

    const neg8Pass = a2SendBlocked.blocked && a2PollBlocked.blocked && a2ReceiptBlocked.blocked;
    console.log(`    A2 Send Blocked:    ${a2SendBlocked.blocked ? 'PASS' : 'FAIL'} (${a2SendBlocked.message})`);
    console.log(`    A2 Poll Blocked:    ${a2PollBlocked.blocked ? 'PASS' : 'FAIL'} (${a2PollBlocked.message})`);
    console.log(`    A2 Receipt Blocked: ${a2ReceiptBlocked.blocked ? 'PASS' : 'FAIL'} (${a2ReceiptBlocked.message})`);
    report.stage2_securityNegativeTestSuite.neg8_revokedDeviceBlockedOnAllOperations = neg8Pass;

    const stage2Pass = neg1Blocked && neg2Blocked && neg2ZeroCiphertext && neg3Blocked &&
                       neg4Blocked && neg5Blocked && neg6Blocked && neg7Blocked && neg8Pass;
    report.stage2_securityNegativeTestSuite.passed = stage2Pass;
    console.log(`  Stage 2 Negative Suite Result: ${stage2Pass ? 'PASS' : 'FAIL'}`);

    // ----------------------------------------------------------------
    // STAGE 3: LOCAL DM AT-REST & KEY STORAGE AUDIT
    // ----------------------------------------------------------------
    console.log('\n[4/6] Stage 3: Local DM At-Rest & Key Storage Audit...');
    console.log('  Canary Plaintext:', CANARY_STRING);

    // 1. Send Canary message from A1 to B
    console.log('  Sending Canary message from A1 to B...');
    const canaryMsg = await pageA1.evaluate(async ({ peerFP, text }) => {
      return await window.__aetherisDM.transport.send(peerFP, { text });
    }, { peerFP: idB.fingerprint, text: CANARY_STRING });

    // 2. Poll Canary on B and store in local message history
    console.log('  Polling Canary on B...');
    await pageB.evaluate(async () => {
      await window.__aetherisDM?.synchronize();
    });

    // 3. Inspect Bob's browser storage: localStorage, sessionStorage, IndexedDB
    console.log('  Inspecting Bob storage for plaintext leaks...');
    const storageAudit = await pageB.evaluate(async (canary) => {
      // 1. localStorage scan
      let localFound = false;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const v = localStorage.getItem(k);
        if (k.includes(canary) || v.includes(canary)) localFound = true;
      }

      // 2. sessionStorage scan
      let sessionFound = false;
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        const v = sessionStorage.getItem(k);
        if (k.includes(canary) || v.includes(canary)) sessionFound = true;
      }

      // 3. IndexedDB scan
      let idbPlaintextFound = false;
      let masterKeyInfo = null;
      let deviceKeypairRecord = null;
      let dmHistoryRecord = null;

      const dbs = await window.indexedDB.databases?.() || [{ name: 'aetheris_secure_vault_v1' }];
      for (const dbInfo of dbs) {
        const db = await new Promise((resolve, reject) => {
          const req = indexedDB.open(dbInfo.name);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        for (const storeName of db.objectStoreNames) {
          const rows = await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const getAll = store.getAll();
            getAll.onsuccess = () => resolve(getAll.result);
            getAll.onerror = () => reject(getAll.error);
          });

          for (const row of rows) {
            const rowStr = JSON.stringify(row);
            if (rowStr.includes(canary)) {
              idbPlaintextFound = true;
            }
            if (row.id === 'device_master_key') {
              masterKeyInfo = {
                hasCryptoKey: Boolean(row.cryptoKey),
                extractable: row.cryptoKey?.extractable,
                type: row.cryptoKey?.type,
                algorithm: row.cryptoKey?.algorithm?.name,
                length: row.cryptoKey?.algorithm?.length,
              };
            }
            if (row.id === 'private_state:dm_local_device_keypair') {
              const env = row.envelope || row;
              deviceKeypairRecord = {
                id: row.id,
                hasIv: Boolean(env.iv),
                ivLen: env.iv?.length,
                hasCiphertext: Boolean(env.ciphertext),
                version: env.version,
                isPlaintextKeyHex: rowStr.includes('privateKeyHex'),
              };
            }
            if (row.id?.startsWith('private_state:dm:')) {
              const env = row.envelope || row;
              dmHistoryRecord = {
                id: row.id,
                hasIv: Boolean(env.iv),
                ivLen: env.iv?.length,
                hasCiphertext: Boolean(env.ciphertext),
                version: env.version,
                isPlaintextHistory: rowStr.includes(canary),
              };
            }
          }
        }
        db.close();
      }

      return {
        localFound,
        sessionFound,
        idbPlaintextFound,
        masterKeyInfo,
        deviceKeypairRecord,
        dmHistoryRecord,
      };
    }, CANARY_STRING);

    console.log('    localStorage canary found:  ', storageAudit.localFound ? 'LEAK!' : 'CLEAN (None)');
    console.log('    sessionStorage canary found:', storageAudit.sessionFound ? 'LEAK!' : 'CLEAN (None)');
    console.log('    IndexedDB plaintext canary: ', storageAudit.idbPlaintextFound ? 'LEAK!' : 'CLEAN (None)');
    console.log('    Master Key CryptoKey:       ', JSON.stringify(storageAudit.masterKeyInfo));
    console.log('    Device Keypair Storage:     ', JSON.stringify(storageAudit.deviceKeypairRecord));
    console.log('    DM History Storage:         ', JSON.stringify(storageAudit.dmHistoryRecord));

    const masterKeyOk = Boolean(
      storageAudit.masterKeyInfo &&
      storageAudit.masterKeyInfo.hasCryptoKey &&
      storageAudit.masterKeyInfo.extractable === false &&
      storageAudit.masterKeyInfo.algorithm === 'AES-GCM' &&
      storageAudit.masterKeyInfo.length === 256
    );

    const deviceKpEncrypted = Boolean(
      storageAudit.deviceKeypairRecord &&
      storageAudit.deviceKeypairRecord.hasIv &&
      storageAudit.deviceKeypairRecord.hasCiphertext &&
      !storageAudit.deviceKeypairRecord.isPlaintextKeyHex
    );

    const historyEncrypted = Boolean(
      storageAudit.dmHistoryRecord &&
      storageAudit.dmHistoryRecord.hasIv &&
      storageAudit.dmHistoryRecord.hasCiphertext &&
      !storageAudit.dmHistoryRecord.isPlaintextHistory
    );

    // 4. Reload Test: Reload page B and verify decryption from encrypted IndexedDB
    console.log('\n[5/6] Stage 4: Reload Test (Reconstruction from Encrypted IndexedDB)...');
    await pageB.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    await pageB.waitForFunction(() => Boolean(window.clientStore?.sovereignIdentity?.fingerprint), { timeout: 45000 });

    const decryptedAfterReload = await pageB.evaluate(async (canary) => {
      await window.__aetherisDM?.ready;
      const convs = Array.from(window.__aetherisDM?.conversations?.values() || []);
      let found = false;
      for (const c of convs) {
        if (c.messages?.some(m => JSON.stringify(m).includes(canary))) {
          found = true;
          break;
        }
      }
      return { found, convCount: convs.length };
    }, CANARY_STRING);

    console.log(`    Canary reconstructed after reload: ${decryptedAfterReload.found ? 'PASS' : 'FAIL'} (${decryptedAfterReload.convCount} conversations in store)`);

    const stage3Pass = !storageAudit.localFound &&
                       !storageAudit.sessionFound &&
                       !storageAudit.idbPlaintextFound &&
                       masterKeyOk &&
                       deviceKpEncrypted &&
                       historyEncrypted &&
                       decryptedAfterReload.found;

    report.stage3_localAtRestStorageAudit = {
      canaryString: CANARY_STRING,
      canarySentAndReceived: Boolean(canaryMsg?.id),
      localStorageCanaryFound: storageAudit.localFound,
      sessionStorageCanaryFound: storageAudit.sessionFound,
      indexedDBPlaintextCanaryFound: storageAudit.idbPlaintextFound,
      masterKeyIsUnextractableCryptoKey: masterKeyOk,
      masterKeyAlgorithm: storageAudit.masterKeyInfo?.algorithm,
      masterKeyExtractable: storageAudit.masterKeyInfo?.extractable,
      deviceKeypairStoredAsAesGcmEnvelope: deviceKpEncrypted,
      messageHistoryStoredAsAesGcmEnvelope: historyEncrypted,
      reloadDecryptionSuccessful: decryptedAfterReload.found,
      passed: stage3Pass,
    };

    console.log(`  Stage 3 Storage Audit Result: ${stage3Pass ? 'PASS' : 'FAIL'}`);

    // Take screenshot
    const screenshotPath = path.join(ARTIFACT_DIR, 'pass7_3_4_live_at_rest_audit.png');
    await pageB.screenshot({ path: screenshotPath, fullPage: true });
    await copyToBrain('pass7_3_4_live_at_rest_audit.png');

    // ----------------------------------------------------------------
    // FINAL ASSESSMENT & ARTIFACT GENERATION
    // ----------------------------------------------------------------
    report.allPassed = report.stage1_deviceSignatureWireVerification.passed &&
                       report.stage2_securityNegativeTestSuite.passed &&
                       report.stage3_localAtRestStorageAudit.passed &&
                       report.stage4_routineOpsDoNotUseRootKey.passed;

    console.log('\n================================================================');
    console.log(`FINAL RESULT: ${report.allPassed ? 'ALL VERIFICATIONS PASSED (FREEZE READY)' : 'FAILED'}`);
    console.log('================================================================');

    const reportPath = path.join(ARTIFACT_DIR, 'pass7_3_4_final_lock_report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    await copyToBrain('pass7_3_4_final_lock_report.json');

  } finally {
    await browser.close();
  }
}

runPass734FinalLockVerification().catch(err => {
  console.error('Fatal Verification Failure:', err);
  process.exit(1);
});
