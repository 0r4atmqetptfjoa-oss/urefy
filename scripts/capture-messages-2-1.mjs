import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = 'C:/Users/razva/.gemini/antigravity/brain/f0d5c374-ce7a-4f32-ae80-74cc87df3b8d/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const PORT = 3033;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          resolve(true);
        } else {
          setTimeout(check, 300);
        }
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server timed out waiting for ${url}`));
        } else {
          setTimeout(check, 300);
        }
      });
    };
    check();
  });
}

async function run() {
  console.log('[Capture] Starting preview server on port', PORT);
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], {
    cwd: path.resolve('packages/client-ui'),
    shell: true,
    stdio: 'pipe',
  });

  previewProcess.stdout?.on('data', (d) => console.log('[Vite Preview]', d.toString().trim()));
  previewProcess.stderr?.on('data', (d) => console.error('[Vite Preview Error]', d.toString().trim()));

  try {
    await waitForServer(BASE_URL);
    console.log('[Capture] Preview server ready at', BASE_URL);

    const browser = await chromium.launch({ headless: true });

    // ─────────────────────────────────────────────────────────
    // DESKTOP CAPTURES (1920x1080)
    // ─────────────────────────────────────────────────────────
    console.log('\n[Capture] Setting up Desktop context (1920x1080)...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      isMobile: false,
    });

    await desktopContext.addInitScript(() => {
      localStorage.setItem('aetheris_onboarding_completed', 'true');
      localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
      localStorage.setItem('aetheris_onboarding_done', 'true');
      localStorage.setItem('urefy_onboarding_stage', 'ONBOARDING_COMPLETE');
      localStorage.setItem('aetheris_identity_fingerprint', 'c3dc28cb705e');
      localStorage.setItem('aetheris_sovereign_identity', JSON.stringify({
        fingerprint: 'c3dc28cb705e',
        displayName: 'Elena Rostova',
        handle: 'elena_r',
      }));
      localStorage.setItem('aetheris_profile_c3dc28cb705e', JSON.stringify({ name: 'Elena Rostova', handle: 'elena_r' }));
      localStorage.setItem('aetheris_profile_a89104fa2211', JSON.stringify({ name: 'David Chen', handle: 'david_c' }));
      localStorage.setItem('aetheris_profile_f40019bc88a2', JSON.stringify({ name: 'Maya Patel', handle: 'maya_p' }));
      localStorage.setItem('aetheris_seed_verified', 'true');
      sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
    });

    const page = await desktopContext.newPage();
    await page.goto(`${BASE_URL}/#messages`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. STATE 1: DESKTOP COMMUNITY CHAT
    console.log('[Capture] 1. Desktop Community Chat...');
    await page.evaluate(() => {
      const cs = window.clientStore;
      const rm = window.relaysManager;
      if (!cs) return;

      cs.activeChannelId = 'relays-general';
      const now = Date.now();
      const mockMessages = [
        {
          id: 'sys-comm-1',
          channelId: 'relays-general',
          authorFingerprint: 'genesis-core',
          text: 'Welcome to General Discussion. Messages in this space are authenticated and visible to community members.',
          createdAt: now - 3600000,
          isMine: false,
          isSystem: true,
        },
        {
          id: 'm-comm-1',
          channelId: 'relays-general',
          authorFingerprint: 'a89104fa2211',
          text: 'We have updated the hybrid ratchet to NIST FIPS 203 ML-KEM-768 for post-quantum forward secrecy.\n```rust\npub fn ratchet_key_exchange(peer_pk: &[u8; 1184]) -> Result<SharedSecret, CryptoError> {\n    let (ciphertext, secret) = ml_kem_768_encapsulate(peer_pk)?;\n    Ok(secret)\n}\n```',
          createdAt: now - 1800000,
          isMine: false,
        },
        {
          id: 'm-comm-2',
          channelId: 'relays-general',
          authorFingerprint: 'a89104fa2211',
          text: 'Let us know if you encounter any issues during the key rollover test.',
          createdAt: now - 1700000,
          isMine: false,
        },
        {
          id: 'm-comm-3',
          channelId: 'relays-general',
          authorFingerprint: 'c3dc28cb705e',
          text: 'Confirmed, the ratification pass is working cleanly across all test enclaves.',
          createdAt: now - 900000,
          isMine: true,
        },
      ];

      cs.messages.set('relays-general', mockMessages);
      if (rm) {
        rm.activeRelayId = 'relay-global-nexus';
      }
      cs.notifySync();
    });

    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'desktop-community-chat.png'),
      fullPage: false,
    });
    console.log('  -> Saved desktop-community-chat.png');

    // 2. STATE 2: DESKTOP DIRECT MESSAGES EMPTY STATE
    console.log('[Capture] 2. Desktop Direct Messages Empty State...');
    await page.evaluate(() => {
      const dmTabBtn = document.querySelector('[data-action="switch-messages-tab"][data-tab="dm"]');
      if (dmTabBtn) dmTabBtn.click();
      const sDM = window.sovereignDM;
      if (sDM) {
        sDM.activePeerFP = null;
        sDM.isOpen = true;
      }
      if (window.clientStore) window.clientStore.notifySync();
    });

    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'desktop-direct-empty.png'),
      fullPage: false,
    });
    console.log('  -> Saved desktop-direct-empty.png');

    // 3. STATE 3: DESKTOP DIRECT ACTIVE THREAD (with 70% bubbles and Retry badge)
    console.log('[Capture] 3. Desktop Direct Messages Active Thread...');
    await page.evaluate(async () => {
      const cs = window.clientStore;
      const sDM = window.sovereignDM;
      const myFP = cs?.keypair?.fingerprint || 'c3dc28cb705e';
      const peerFP = 'a89104fa2211'; // David Chen
      const now = Date.now();

      if (sDM) {
        Object.defineProperty(sDM, 'syncError', { get: () => null, set: () => {}, configurable: true });
        sDM.syncError = null;
        sDM.activePeerFP = peerFP;
        sDM.isOpen = true;

        const dmMessages = [
          {
            id: 'dm-sys-1',
            senderFP: 'genesis-core',
            receiverFP: myFP,
            encryptedPayload: 'ENCRYPTED_PAYLOAD_HASH',
            plaintext: 'Direct messages are end-to-end encrypted. Tap the header to verify safety numbers.',
            timestamp: now - 7200000,
            isRead: true,
            isSystem: true,
          },
          {
            id: 'dm-msg-1',
            senderFP: peerFP,
            receiverFP: myFP,
            encryptedPayload: 'ENCRYPTED_PAYLOAD_HASH_1',
            plaintext: 'Hey Elena! Did you review the latest device authority revocation spec?',
            timestamp: now - 3600000,
            isRead: true,
            isPeerRead: true,
            deliveryStatus: 'sent',
          },
          {
            id: 'dm-msg-2',
            senderFP: myFP,
            receiverFP: peerFP,
            encryptedPayload: 'ENCRYPTED_PAYLOAD_HASH_2',
            plaintext: 'Yes, looking through the edge-enforced D1 checks right now.',
            timestamp: now - 1800000,
            isRead: true,
            isPeerRead: true,
            deliveryStatus: 'sent',
          },
          {
            id: 'dm-msg-3',
            senderFP: myFP,
            receiverFP: peerFP,
            encryptedPayload: 'ENCRYPTED_PAYLOAD_HASH_3',
            plaintext: 'All endpoints verify device signatures before accepting envelope updates.',
            timestamp: now - 1750000,
            isRead: true,
            isPeerRead: true,
            deliveryStatus: 'sent',
          },
          {
            id: 'dm-msg-4',
            senderFP: peerFP,
            receiverFP: myFP,
            encryptedPayload: 'ENCRYPTED_PAYLOAD_HASH_4',
            plaintext: 'Can you trigger a manual rollover test to confirm fail-closed behavior?',
            timestamp: now - 900000,
            isRead: true,
            isPeerRead: true,
            deliveryStatus: 'sent',
            context: { replyToId: 'dm-msg-3' },
          },
          {
            id: 'dm-msg-5',
            senderFP: myFP,
            receiverFP: peerFP,
            encryptedPayload: 'ENCRYPTED_PAYLOAD_HASH_5',
            plaintext: 'Attempting key exchange test on secondary node...',
            timestamp: now - 60000,
            isRead: true,
            deliveryStatus: 'failed',
          },
          {
            id: 'dm-msg-6',
            senderFP: peerFP,
            receiverFP: myFP,
            encryptedPayload: 'ENCRYPTED_CAPSULE',
            plaintext: '# Context Capsule: Release 2.4 Decisions\n**Context:** Direct with David Chen · 2026-09-24\n### Curator Note\nApproved sub-20ms key encapsulation benchmarks for mobile isolates.\n### Curated Messages (3)\n',
            timestamp: now - 30000,
            isRead: true,
            deliveryStatus: 'sent',
          },
        ];

        sDM.conversations.set(peerFP, {
          peerFingerprint: peerFP,
          peerRole: 'MEMBER',
          messages: dmMessages,
          unreadCount: 0,
          lastMessageAt: now - 60000,
        });

        // Add a second conversation for inbox fullness
        sDM.conversations.set('f40019bc88a2', {
          peerFingerprint: 'f40019bc88a2',
          peerRole: 'MEMBER',
          messages: [
            {
              id: 'dm-maya-1',
              senderFP: 'f40019bc88a2',
              receiverFP: myFP,
              encryptedPayload: 'ENCRYPTED',
              plaintext: 'The consensus tests passed on testnet!',
              timestamp: now - 86400000,
              isRead: true,
              deliveryStatus: 'sent',
            },
          ],
          unreadCount: 0,
          lastMessageAt: now - 86400000,
        });
        sDM.syncError = null;
      }

      if (cs) cs.notifySync();
      const container = document.getElementById('dm-thread-messages');
      if (container) container.scrollTop = container.scrollHeight;
    });

    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const container = document.getElementById('dm-thread-messages');
      if (container) container.scrollTop = container.scrollHeight;
    });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'desktop-direct-active-thread.png'),
      fullPage: false,
    });
    console.log('  -> Saved desktop-direct-active-thread.png');

    // 4. STATE 4: DESKTOP DIRECT CONTEXT DRAWER
    console.log('[Capture] 4. Desktop Direct Context Drawer...');
    await page.evaluate(() => {
      const btn = document.querySelector('[data-action="toggle-dm-context"]');
      if (btn) btn.click();
      else if (window.clientStore) window.clientStore.notifySync();
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'desktop-direct-context-drawer.png'),
      fullPage: false,
    });
    console.log('  -> Saved desktop-direct-context-drawer.png');

    // Close context drawer
    await page.evaluate(() => {
      const btn = document.querySelector('[data-action="toggle-dm-context"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);

    // 5. STATE 5: ON-DEVICE CHAT SEARCH
    console.log('[Capture] 5. On-Device Chat Search...');
    await page.evaluate(() => {
      const searchEngine = window.chatSearchEngine;
      if (searchEngine) {
        searchEngine.openSearch('spec');
      }
      if (window.clientStore) window.clientStore.notifySync();
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'desktop-chat-search.png'),
      fullPage: false,
    });
    console.log('  -> Saved desktop-chat-search.png');

    // Close search
    await page.evaluate(() => {
      const searchEngine = window.chatSearchEngine;
      if (searchEngine) searchEngine.closeSearch();
      if (window.clientStore) window.clientStore.notifySync();
    });
    await page.waitForTimeout(300);

    // 6. STATE 6: VOICE RECORDER BAR
    console.log('[Capture] 6. Voice Note Recorder Bar...');
    await page.evaluate(() => {
      const vnm = window.voiceNotesManager;
      if (vnm && vnm.state) {
        vnm.state.isRecording = true;
        vnm.state.durationSeconds = 14;
      }
      if (window.clientStore) window.clientStore.notifySync();
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'desktop-voice-recorder.png'),
      fullPage: false,
    });
    console.log('  -> Saved desktop-voice-recorder.png');

    // Reset voice recorder
    await page.evaluate(() => {
      const vnm = window.voiceNotesManager;
      if (vnm && vnm.state) vnm.state.isRecording = false;
      if (window.clientStore) window.clientStore.notifySync();
    });
    await page.waitForTimeout(300);

    // 7. STATE 7: CONTEXT CAPSULE MODAL
    console.log('[Capture] 7. Context Capsule Modal...');
    await page.evaluate(() => {
      const ccm = window.contextCapsuleManager;
      if (ccm) {
        ccm.openCreator('Direct with David Chen', [
          {
            id: 'dm-msg-1',
            text: 'Hey Elena! Did you review the latest device authority revocation spec?',
            senderName: 'David Chen',
            senderHandle: '@david_c',
            timestamp: Date.now() - 3600000,
          },
          {
            id: 'dm-msg-4',
            text: 'Can you trigger a manual rollover test to confirm fail-closed behavior?',
            senderName: 'David Chen',
            senderHandle: '@david_c',
            timestamp: Date.now() - 900000,
          },
        ]);
      }
      if (window.clientStore) window.clientStore.notifySync();
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'desktop-context-capsule.png'),
      fullPage: false,
    });
    console.log('  -> Saved desktop-context-capsule.png');

    // Close capsule modal
    await page.evaluate(() => {
      const ccm = window.contextCapsuleManager;
      if (ccm) ccm.closeCreator();
      if (window.clientStore) window.clientStore.notifySync();
    });
    await page.waitForTimeout(300);

    await desktopContext.close();

    // ─────────────────────────────────────────────────────────
    // MOBILE CAPTURES (390x844)
    // ─────────────────────────────────────────────────────────
    console.log('\n[Capture] Setting up Mobile context (390x844)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });

    await mobileContext.addInitScript(() => {
      localStorage.setItem('aetheris_onboarding_completed', 'true');
      localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
      localStorage.setItem('aetheris_onboarding_done', 'true');
      localStorage.setItem('urefy_onboarding_stage', 'ONBOARDING_COMPLETE');
      localStorage.setItem('aetheris_identity_fingerprint', 'c3dc28cb705e');
      localStorage.setItem('aetheris_sovereign_identity', JSON.stringify({
        fingerprint: 'c3dc28cb705e',
        displayName: 'Elena Rostova',
        handle: 'elena_r',
      }));
      localStorage.setItem('aetheris_profile_c3dc28cb705e', JSON.stringify({ name: 'Elena Rostova', handle: 'elena_r' }));
      localStorage.setItem('aetheris_profile_a89104fa2211', JSON.stringify({ name: 'David Chen', handle: 'david_c' }));
      localStorage.setItem('aetheris_seed_verified', 'true');
      sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
    });

    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${BASE_URL}/#messages`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(2000);

    // 8. STATE 8: MOBILE COMMUNITY CHAT
    console.log('[Capture] 8. Mobile Community Chat...');
    await mobilePage.evaluate(() => {
      const relaysTabBtn = document.querySelector('[data-action="switch-messages-tab"][data-tab="relays"]');
      if (relaysTabBtn) relaysTabBtn.click();
      const cs = window.clientStore;
      if (cs) {
        cs.activeChannelId = 'relays-general';
        const now = Date.now();
        cs.messages.set('relays-general', [
          {
            id: 'sys-m-1',
            channelId: 'relays-general',
            authorFingerprint: 'genesis-core',
            text: 'Welcome to General Discussion. Messages in this space are authenticated and visible to community members.',
            createdAt: now - 3600000,
            isMine: false,
            isSystem: true,
          },
          {
            id: 'm-m-1',
            channelId: 'relays-general',
            authorFingerprint: 'a89104fa2211',
            text: 'Updated the ML-KEM-768 hybrid ratchet on test enclaves. Testing rollover now.',
            createdAt: now - 1800000,
            isMine: false,
          },
          {
            id: 'm-m-2',
            channelId: 'relays-general',
            authorFingerprint: 'c3dc28cb705e',
            text: 'Ratification is clean on my node.',
            createdAt: now - 900000,
            isMine: true,
          },
        ]);
        cs.notifySync();
      }
    });

    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'mobile-community-chat.png'),
      fullPage: false,
    });
    console.log('  -> Saved mobile-community-chat.png');

    // 9. STATE 9: MOBILE DIRECT CHAT (Collapsed header)
    console.log('[Capture] 9. Mobile Direct Chat...');
    await mobilePage.evaluate(() => {
      const dmTabBtn = document.querySelector('[data-action="switch-messages-tab"][data-tab="dm"]');
      if (dmTabBtn) dmTabBtn.click();
      const cs = window.clientStore;
      const sDM = window.sovereignDM;
      const myFP = cs?.keypair?.fingerprint || 'c3dc28cb705e';
      const peerFP = 'a89104fa2211';
      const now = Date.now();

      if (sDM) {
        Object.defineProperty(sDM, 'syncError', { get: () => null, set: () => {}, configurable: true });
        sDM.syncError = null;
        sDM.activePeerFP = peerFP;
        sDM.isOpen = true;
        sDM.conversations.set(peerFP, {
          peerFingerprint: peerFP,
          peerRole: 'MEMBER',
          messages: [
            {
              id: 'm-dm-sys',
              senderFP: 'genesis-core',
              receiverFP: myFP,
              encryptedPayload: 'ENCRYPTED',
              plaintext: 'This is the start of your direct conversation with David Chen.',
              timestamp: now - 3600000,
              isRead: true,
              isSystem: true,
            },
            {
              id: 'm-dm-1',
              senderFP: peerFP,
              receiverFP: myFP,
              encryptedPayload: 'ENCRYPTED',
              plaintext: 'Hey Elena! Ready to test fail-closed rollover?',
              timestamp: now - 1800000,
              isRead: true,
              deliveryStatus: 'sent',
            },
            {
              id: 'm-dm-2',
              senderFP: myFP,
              receiverFP: peerFP,
              encryptedPayload: 'ENCRYPTED',
              plaintext: 'Ready on mobile client. Initiating session.',
              timestamp: now - 900000,
              isRead: true,
              deliveryStatus: 'sent',
            },
          ],
          unreadCount: 0,
          lastMessageAt: now - 900000,
        });
        sDM.syncError = null;
      }
      if (cs) cs.notifySync();
    });

    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'mobile-direct-chat.png'),
      fullPage: false,
    });
    console.log('  -> Saved mobile-direct-chat.png');

    // 10. STATE 10: MOBILE DIRECT EMOJI BOTTOM SHEET
    console.log('[Capture] 10. Mobile Direct Emoji Bottom Sheet...');
    await mobilePage.evaluate(() => {
      const emojiBtn = document.querySelector('[data-action="toggle-dm-emoji"]');
      if (emojiBtn) emojiBtn.click();
      else if (window.clientStore) window.clientStore.notifySync();
    });

    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'mobile-direct-emoji-sheet.png'),
      fullPage: false,
    });
    console.log('  -> Saved mobile-direct-emoji-sheet.png');

    await mobileContext.close();
    await browser.close();
    console.log('\n[Capture] All 10 screenshots generated successfully!');
  } finally {
    previewProcess.kill();
  }
}

run().catch((err) => {
  console.error('[Capture Error]', err);
  process.exit(1);
});
