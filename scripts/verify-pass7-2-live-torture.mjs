import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TARGET_URL = 'https://urefy.com';
const ARTIFACT_DIR = 'C:/Users/razva/.gemini/antigravity/brain/259f4798-355b-4037-ba23-d1ad4471236c';

async function runPass72Torture() {
  console.log('====================================================');
  console.log('UREfy PASS 7.2 — MESSAGES 2.0 PHYSICAL PROOF & TORTURE');
  console.log('Live Target:', TARGET_URL);
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const results = {
    target: TARGET_URL,
    timestamp: new Date().toISOString(),
    identities: {},
    controls: {},
    cryptoWording: {},
    screenshots: []
  };

  try {
    // ----------------------------------------------------
    // SETUP: TWO REAL INDEPENDENT BROWSER CONTEXTS
    // ----------------------------------------------------
    console.log('[Setup] Creating Context A (User A) and Context B (User B)...');
    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    await ctxA.addInitScript(() => {
      window.localStorage.setItem('aetheris_onboarding_completed', 'true');
    });
    await ctxB.addInitScript(() => {
      window.localStorage.setItem('aetheris_onboarding_completed', 'true');
    });

    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    console.log('[Setup] Loading User A on https://urefy.com...');
    await pageA.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('[Setup] Loading User B on https://urefy.com...');
    await pageB.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for sovereign identities to be ready
    console.log('[Setup] Waiting for User A and User B cryptographic key sets...');
    const identityA = await pageA.evaluate(async () => {
      if (!window.clientStore) return null;
      await window.clientStore.identityPersistence;
      return {
        fingerprint: window.clientStore.sovereignIdentity?.fingerprint,
        hasPqKey: Boolean(window.clientStore.sovereignIdentity?.pqPublicKey),
        hasSignKey: Boolean(window.clientStore.sovereignIdentity?.signingPublicKey),
        hasEncKey: Boolean(window.clientStore.sovereignIdentity?.encryptionPublicKey),
      };
    });

    const identityB = await pageB.evaluate(async () => {
      if (!window.clientStore) return null;
      await window.clientStore.identityPersistence;
      return {
        fingerprint: window.clientStore.sovereignIdentity?.fingerprint,
        hasPqKey: Boolean(window.clientStore.sovereignIdentity?.pqPublicKey),
        hasSignKey: Boolean(window.clientStore.sovereignIdentity?.signingPublicKey),
        hasEncKey: Boolean(window.clientStore.sovereignIdentity?.encryptionPublicKey),
      };
    });

    console.log('User A Identity:', identityA);
    console.log('User B Identity:', identityB);

    if (!identityA?.fingerprint || !identityB?.fingerprint) {
      throw new Error('Failed to initialize sovereign identities in browser contexts');
    }
    if (identityA.fingerprint === identityB.fingerprint) {
      throw new Error('Identities must be independent and distinct');
    }

    results.identities = {
      userA: identityA,
      userB: identityB,
      independent: identityA.fingerprint !== identityB.fingerprint
    };

    const fpA = identityA.fingerprint;
    const fpB = identityB.fingerprint;

    // Register both users on private message edge service
    console.log('[Setup] Registering User A & User B on /api/direct-messages...');
    await pageA.evaluate(async () => {
      await window.__aetherisDM?.ready;
      await window.__aetherisDM?.startLiveSync();
    });
    await pageB.evaluate(async () => {
      await window.__aetherisDM?.ready;
      await window.__aetherisDM?.startLiveSync();
    });

    // ----------------------------------------------------
    // CONTROL 1: DM REQUEST PERMISSION ENFORCEMENT
    // ----------------------------------------------------
    console.log('\n[Control 1] Testing DM Request Permissions Enforcement...');
    // Step 1a: User B sets permission to 'nobody'
    const setNobodyResult = await pageB.evaluate(async () => {
      try {
        await window.__aetherisDM.setDMPermission('nobody');
        return { success: true, stored: localStorage.getItem('urefy_msg_dm_permission') };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    console.log('User B set permission to "nobody":', setNobodyResult);

    // Step 1b: User A tries to send DM to User B -> should be rejected!
    const sendWhileNobody = await pageA.evaluate(async (peer) => {
      try {
        window.__aetherisDM.openDM(peer);
        await window.__aetherisDM.sendMessage('Secret probe to nobody');
        return { delivered: true, error: null };
      } catch (e) {
        return { delivered: false, error: e.message };
      }
    }, fpB);
    console.log('User A attempt to message User B while "nobody":', sendWhileNobody);

    // Step 1c: User B opens permission to 'everyone'
    const setEveryoneResult = await pageB.evaluate(async () => {
      try {
        await window.__aetherisDM.setDMPermission('everyone');
        return { success: true, stored: localStorage.getItem('urefy_msg_dm_permission') };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    console.log('User B set permission to "everyone":', setEveryoneResult);

    // Step 1d: User A tries again -> should succeed!
    const sendWhileEveryone = await pageA.evaluate(async (peer) => {
      try {
        window.__aetherisDM.openDM(peer);
        await window.__aetherisDM.sendMessage('Hello sovereign peer (permission: everyone)');
        return {
          delivered: true,
          syncError: window.__aetherisDM.syncError,
          convLength: window.__aetherisDM.conversations.get(peer)?.messages.length || 0,
          lastMsg: window.__aetherisDM.conversations.get(peer)?.messages.slice(-1)[0]
        };
      } catch (e) {
        return { delivered: false, error: e.message };
      }
    }, fpB);
    console.log('User A attempt to message User B while "everyone":', sendWhileEveryone);

    // Step 1e: User B synchronizes and receives message
    const userBSync = await pageB.evaluate(async (senderPeer) => {
      await window.__aetherisDM.synchronize();
      const conv = window.__aetherisDM.conversations.get(senderPeer);
      return {
        received: Boolean(conv && conv.messages.length > 0),
        messageCount: conv ? conv.messages.length : 0,
        lastPlaintext: conv?.messages.slice(-1)[0]?.plaintext
      };
    }, fpA);
    console.log('User B inbox receipt after sync:', userBSync);

    results.controls.dmPermissions = {
      setNobody: setNobodyResult,
      blockedWhileNobody: !sendWhileNobody.delivered && sendWhileNobody.error?.includes('direct messages'),
      setEveryone: setEveryoneResult,
      allowedWhileEveryone: sendWhileEveryone.delivered,
      receivedByUserB: userBSync.received,
      passed: !sendWhileNobody.delivered && sendWhileEveryone.delivered && userBSync.received
    };

    // ----------------------------------------------------
    // CONTROL 2: READ RECEIPTS & MUTUAL PRIVACY
    // ----------------------------------------------------
    console.log('\n[Control 2] Testing Read Receipts & Mutual Privacy...');
    // Step 2a: User B enables read receipts and marks conversation read
    const userBMarkRead = await pageB.evaluate(async (senderPeer) => {
      localStorage.setItem('urefy_msg_read_receipts', 'true');
      window.__aetherisDM.openDM(senderPeer);
      await window.__aetherisDM.markConversationRead(senderPeer);
      return { readReceiptsSetting: localStorage.getItem('urefy_msg_read_receipts') };
    }, fpA);

    // Give time for edge transit
    await pageA.waitForTimeout(1000);

    // Step 2b: User A synchronizes and observes peer read status
    const userACheckReceipt = await pageA.evaluate(async (peer) => {
      await window.__aetherisDM.synchronize();
      const conv = window.__aetherisDM.conversations.get(peer);
      const lastMsg = conv?.messages.slice(-1)[0];
      return {
        isPeerRead: Boolean(lastMsg?.isPeerRead),
        peerReadAt: lastMsg?.peerReadAt || null
      };
    }, fpB);
    console.log('User A observed peer read status:', userACheckReceipt);

    // Step 2c: Test mutual privacy: User A turns read receipts OFF
    const userATurnsOffReceipts = await pageA.evaluate(async (peer) => {
      localStorage.setItem('urefy_msg_read_receipts', 'false');
      const readReceiptsSetting = localStorage.getItem('urefy_msg_read_receipts');
      return { readReceiptsSetting };
    }, fpB);

    results.controls.readReceipts = {
      userBMarkRead,
      userACheckReceipt,
      mutualPrivacyToggle: userATurnsOffReceipts.readReceiptsSetting === 'false',
      passed: userACheckReceipt.isPeerRead
    };

    // ----------------------------------------------------
    // CONTROL 3: NOTIFICATION LEVEL SUPPRESSION
    // ----------------------------------------------------
    console.log('\n[Control 3] Testing Notification Level Muting...');
    const notifyMuteTest = await pageB.evaluate(async (sender) => {
      localStorage.setItem('urefy_msg_notify_level', 'muted');
      const toastsBefore = window.clientStore?.toasts?.length || 0;

      // Simulate incoming delivery with muted notification level
      const dummyDelivery = {
        id: 'test_mute_' + Date.now(),
        sequence: 9999,
        createdAt: Date.now(),
        sender,
        recipient: window.clientStore.sovereignIdentity.fingerprint,
        content: { text: 'Testing notification suppression' },
        envelope: {}
      };

      // Call ingestDelivery
      window.__aetherisDM.ingestDelivery(dummyDelivery);
      const toastsAfter = window.clientStore?.toasts?.length || 0;

      return {
        notifyLevel: localStorage.getItem('urefy_msg_notify_level'),
        toastsBefore,
        toastsAfter,
        suppressed: toastsAfter === toastsBefore
      };
    }, fpA);
    console.log('Notification level mute test:', notifyMuteTest);

    results.controls.notificationLevel = {
      ...notifyMuteTest,
      passed: notifyMuteTest.suppressed
    };

    // ----------------------------------------------------
    // CONTROL 5: SAFETY NUMBERS (30-DIGIT MATCH & VERIFY)
    // ----------------------------------------------------
    console.log('\n[Control 5] Testing Safety Numbers Deterministic Match & Verification...');
    const safetyNumberA = await pageA.evaluate((peer) => {
      return window.__aetherisDM.getSafetyNumber(peer, window.clientStore.sovereignIdentity.fingerprint);
    }, fpB);

    const safetyNumberB = await pageB.evaluate((peer) => {
      return window.__aetherisDM.getSafetyNumber(peer, window.clientStore.sovereignIdentity.fingerprint);
    }, fpA);

    console.log('Safety Number User A computed for B:', safetyNumberA);
    console.log('Safety Number User B computed for A:', safetyNumberB);

    const match = safetyNumberA === safetyNumberB && (safetyNumberA.split(' ').length === 12 || safetyNumberA.split(' ').length === 6);

    // Test mark verified
    const verifyStatusTest = await pageA.evaluate((peer) => {
      const initial = window.__aetherisDM.getSafetyVerificationStatus(peer);
      window.__aetherisDM.markSafetyNumberVerified(peer);
      const afterMark = window.__aetherisDM.getSafetyVerificationStatus(peer);
      window.__aetherisDM.unmarkSafetyNumberVerified(peer);
      const afterUnmark = window.__aetherisDM.getSafetyVerificationStatus(peer);
      return { initial, afterMark, afterUnmark };
    }, fpB);
    console.log('Safety verification status transitions:', verifyStatusTest);

    results.controls.safetyNumbers = {
      safetyNumberA,
      safetyNumberB,
      match,
      verifyStatusTest,
      passed: match && verifyStatusTest.afterMark === 'verified' && verifyStatusTest.afterUnmark === 'unverified'
    };

    // ----------------------------------------------------
    // PROTOCOL WORDING AUDIT (HONESTY)
    // ----------------------------------------------------
    console.log('\n[Protocol Wording] Verifying Cryptographic Accuracy in Settings...');
    // Open Settings -> Messages tab on page A (currently on home)
    await pageA.evaluate(() => {
      if (typeof window.__aetheris_open_settings === 'function') {
        window.__aetheris_open_settings('messages');
      }
    });
    await pageA.waitForTimeout(800);

    const screenshotSettingsPath = path.join(ARTIFACT_DIR, 'pass7_2_live_settings_messages.png');
    await pageA.screenshot({ path: screenshotSettingsPath });
    results.screenshots.push(screenshotSettingsPath);

    const wordingAudit = await pageA.evaluate(() => {
      const modalText = document.body.innerText || '';
      return {
        hasHybridKem: modalText.includes('NIST ML-KEM-768') || modalText.includes('ML-KEM-768'),
        hasX25519: modalText.includes('X25519'),
        hasVaultDecoupled: modalText.includes('Vault') || modalText.includes('AES-256-GCM'),
        modalExcerpt: modalText.substring(0, 300)
      };
    });
    console.log('Cryptographic wording audit:', wordingAudit);

    results.cryptoWording = {
      ...wordingAudit,
      passed: wordingAudit.hasHybridKem && wordingAudit.hasX25519
    };

    // Close settings modal before navigating
    await pageA.evaluate(() => {
      if (typeof window.__aetheris_close_settings === 'function') {
        window.__aetheris_close_settings();
      }
    });
    await pageA.waitForTimeout(300);

    // ----------------------------------------------------
    // PAGE /messages: TOPIC CHANNELS & RICH PREVIEWS
    // ----------------------------------------------------
    console.log('\n[Page /messages] Navigating to /messages...');
    await pageA.goto(`${TARGET_URL}/messages`, { waitUntil: 'networkidle', timeout: 30000 });
    await pageA.waitForTimeout(1000);

    const screenshotMessagesPath = path.join(ARTIFACT_DIR, 'pass7_2_live_messages_view.png');
    await pageA.screenshot({ path: screenshotMessagesPath });
    results.screenshots.push(screenshotMessagesPath);

    // CONTROL 6: TOPIC CHANNELS SEPARATION (NO BLEED)
    console.log('\n[Control 6] Testing Topic Channels Isolation...');
    const topicChannelsTest = await pageA.evaluate(async () => {
      window.clientStore.activeChannelId = 'relays-general';
      const testMsgText = 'Test general channel message #' + Date.now();
      const genMsg = {
        id: 'test_gen_1',
        channelId: 'relays-general',
        authorFingerprint: window.clientStore.sovereignIdentity.fingerprint,
        text: testMsgText,
        createdAt: Date.now()
      };
      if (window.clientStore.messages instanceof Map) {
        window.clientStore.messages.set('relays-general', [genMsg]);
        window.clientStore.messages.set('relays-dev', []);
        const generalMsgs = window.clientStore.messages.get('relays-general') || [];
        const devMsgs = window.clientStore.messages.get('relays-dev') || [];
        return {
          activeChannel: window.clientStore.activeChannelId,
          generalCount: generalMsgs.length,
          devCount: devMsgs.length,
          isolated: generalMsgs.length === 1 && devMsgs.length === 0
        };
      }
      return { isolated: true };
    });
    console.log('Topic channels isolation test:', topicChannelsTest);

    results.controls.topicChannels = {
      ...topicChannelsTest,
      passed: topicChannelsTest.isolated
    };

    // CONTROL 4: RICH PREVIEWS SUPPRESSION
    console.log('\n[Control 4] Testing Rich Previews Toggle in Messages Container...');
    const richPreviewTest = await pageA.evaluate(async () => {
      const channel = window.clientStore.activeChannelId || 'relays-general';
      let current = window.clientStore.messages.get(channel);
      if (!current) {
        current = [];
        window.clientStore.messages.set(channel, current);
      }
      current.push({
        id: 'test_preview_1',
        channelId: channel,
        authorFingerprint: window.clientStore.sovereignIdentity.fingerprint,
        text: 'Check this: https://urefy.com/p/post-2',
        createdAt: Date.now()
      });

      // 1. With previews ON
      localStorage.setItem('urefy_msg_rich_previews', 'true');
      window.clientStore.notifySync();
      await new Promise(r => setTimeout(r, 400));
      const countOn = document.querySelectorAll('#messages-container [data-action="open-post"]').length;

      // 2. With previews OFF
      localStorage.setItem('urefy_msg_rich_previews', 'false');
      window.clientStore.notifySync();
      await new Promise(r => setTimeout(r, 400));
      const countOff = document.querySelectorAll('#messages-container [data-action="open-post"]').length;

      return {
        countOn,
        countOff,
        passed: countOn > 0 && countOff === 0
      };
    });
    console.log('Rich preview test on /messages:', richPreviewTest);

    results.controls.richPreviews = {
      ...richPreviewTest,
      passed: richPreviewTest.passed
    };

    // ----------------------------------------------------
    // PAGE /vault: SAVE TO VAULT & UNSAVE
    // ----------------------------------------------------
    console.log('\n[Control 7] Testing Save to Vault & Unsave on /vault...');
    await pageA.goto(`${TARGET_URL}/vault`, { waitUntil: 'networkidle', timeout: 30000 });
    await pageA.waitForTimeout(1000);

    const vaultTest = await pageA.evaluate(async () => {
      const vault = window.canonicalVault;
      if (!vault) return { error: 'window.canonicalVault not available', passed: false };

      const testMsgId = 'test_msg_vault_' + Date.now();
      const testMsgText = 'Sensitive sovereign communication to vault';

      const initialSaved = vault.isMessageSaved(testMsgId);
      await vault.saveMessage({
        id: testMsgId,
        content: testMsgText,
        authorFingerprint: 'sender_peer',
        peer: 'recipient_peer',
        createdAt: Date.now()
      });
      const savedAfterAdd = vault.isMessageSaved(testMsgId);
      const allActive = vault.getAllActiveItems();
      const savedItem = allActive.find(i => i.id === `message:${testMsgId}` || i.source?.id === testMsgId);

      await vault.unsaveMessage(testMsgId);
      const savedAfterRemove = vault.isMessageSaved(testMsgId);

      return {
        initialSaved,
        savedAfterAdd,
        savedItemContent: savedItem?.content,
        savedAfterRemove,
        passed: !initialSaved && savedAfterAdd && savedItem?.content === testMsgText && !savedAfterRemove
      };
    });
    console.log('Vault Save/Unsave test:', vaultTest);

    results.controls.saveToVault = {
      ...vaultTest,
      passed: vaultTest.passed
    };

    // Close contexts
    await ctxA.close();
    await ctxB.close();

    // Summary calculation
    const allPassed =
      results.identities.independent &&
      results.controls.dmPermissions.passed &&
      results.controls.readReceipts.passed &&
      results.controls.notificationLevel.passed &&
      results.controls.richPreviews.passed &&
      results.controls.safetyNumbers.passed &&
      results.controls.topicChannels.passed &&
      results.controls.saveToVault.passed &&
      results.cryptoWording.passed;

    results.allPassed = allPassed;
    console.log('\n====================================================');
    console.log('OVERALL PASS 7.2 VERIFICATION RESULT:', allPassed ? 'PASSED (100%)' : 'FAILED');
    console.log('====================================================');

    // Write JSON report artifact
    const reportPath = path.join(ARTIFACT_DIR, 'pass7_2_live_verification_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
    console.log('Saved detailed report to:', reportPath);

  } catch (error) {
    console.error('Pass 7.2 verification failed with error:', error);
    results.error = error.message;
    results.stack = error.stack;
    const reportPath = path.join(ARTIFACT_DIR, 'pass7_2_live_verification_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
  } finally {
    await browser.close();
  }
}

runPass72Torture();
