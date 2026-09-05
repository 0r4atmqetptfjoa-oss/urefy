import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSovereignIdentity,
  createSignedEnvelope,
  verifySignedEnvelope,
  canonicalizeEnvelopeDigest,
  SovereignIdentity,
  SovereignKeyPairSet,
  generateKeyPair,
  signMessage,
  bytesToHex,
} from '@aetheris/core-crypto';
import { resetReplayNonceCache } from '../functions/api/_auth.js';
import { onRequestPost as handleMessagePost } from '../functions/api/messages.js';
import { onRequestPost as handlePostPost } from '../functions/api/posts.js';
import { onRequestPost as handleChannelPost } from '../functions/api/channels.js';
import { onRequestPost as handleStoragePost } from '../functions/api/storage.js';
import { onRequestPost as handleInteractionPost } from '../functions/api/interactions.js';
import { onRequestPost as handleNanopubPost } from '../functions/api/nanopublications.js';
import { onRequestPost as handleAnalyticsPost } from '../functions/api/analytics.js';
import { AetherisClientStore } from '../src/client-state.js';

describe('Phase 2: Unified Identity Architecture & Signed Request Envelope Protocol', () => {
  let aliceKeySet: SovereignKeyPairSet;
  let bobKeySet: SovereignKeyPairSet;

  beforeEach(() => {
    resetReplayNonceCache();
    aliceKeySet = createSovereignIdentity();
    bobKeySet = createSovereignIdentity();
  });

  describe('1. Canonical Sovereign Identity Schema & Generation', () => {
    it('creates a complete sovereign identity with all required cryptographic parameters', () => {
      const { identity, signingPrivateKey, encryptionPrivateKey, pqPrivateKey } = aliceKeySet;

      expect(identity.fingerprint).toBeDefined();
      expect(identity.fingerprint.length).toBe(16);
      expect(identity.signingPublicKey).toBeDefined();
      expect(identity.signingPublicKey.length).toBe(64);
      expect(identity.encryptionPublicKey).toBeDefined();
      expect(identity.encryptionPublicKey.length).toBe(64);
      expect(identity.pqPublicKey).toBeDefined();
      expect(identity.pqPublicKey.length).toBe(2368);

      expect(signingPrivateKey.length).toBe(32);
      expect(encryptionPrivateKey.length).toBe(32);
      expect(pqPrivateKey.length).toBe(2400);

      expect(identity.capabilities).toEqual([
        'post:create',
        'post:vote',
        'channel:create',
        'storage:upload',
        'relay:publish',
        'dm:send',
        'node:telemetry',
      ]);
    });

    it('derives identical sovereign identity deterministically from identical seed', () => {
      const testSeed = new Uint8Array(32).fill(42);
      const set1 = createSovereignIdentity({ seed: testSeed });
      const set2 = createSovereignIdentity({ seed: testSeed });

      expect(set1.identity.fingerprint).toBe(set2.identity.fingerprint);
      expect(set1.identity.signingPublicKey).toBe(set2.identity.signingPublicKey);
      expect(set1.identity.encryptionPublicKey).toBe(set2.identity.encryptionPublicKey);
      expect(set1.identity.pqPublicKey).toBe(set2.identity.pqPublicKey);
    });
  });

  describe('2. Signed Request Envelope Protocol Across Edge API Routes', () => {
    it('allows POST /api/messages with valid envelope and relay:publish capability', async () => {
      const payload = {
        id: `msg-${Date.now()}`,
        channelId: 'relays-general',
        authorFingerprint: aliceKeySet.identity.fingerprint,
        ciphertext: 'aetheris_encrypted_payload_hex_sample_data_test',
        epoch: '#100',
      };

      const envelope = createSignedEnvelope(payload, aliceKeySet);
      const req = new Request('https://aetheris.pages.dev/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handleMessagePost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message.ciphertext).toBe(payload.ciphertext);
      expect(json.message.authorFingerprint).toBe(aliceKeySet.identity.fingerprint);
    });

    it('allows POST /api/posts create with valid envelope and post:create capability', async () => {
      const payload = {
        action: 'create',
        id: `post-${Date.now()}`,
        title: 'Sovereign Architecture Update',
        content: 'Decentralized signed envelopes operational.',
        flair: 'TECH DISCUSSION',
        channelId: 'relays-general',
        authorFingerprint: aliceKeySet.identity.fingerprint,
      };

      const envelope = createSignedEnvelope(payload, aliceKeySet);
      const req = new Request('https://aetheris.pages.dev/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handlePostPost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.post.title).toBe(payload.title);
      expect(json.post.authorFingerprint).toBe(aliceKeySet.identity.fingerprint);
    });

    it('allows POST /api/posts vote with valid envelope and post:vote capability', async () => {
      const createPayload = {
        action: 'create',
        id: `post-vote-target-${Date.now()}`,
        title: 'Post to be voted',
        content: 'Testing vote envelope',
        flair: 'TECH DISCUSSION',
        channelId: 'relays-general',
        authorFingerprint: aliceKeySet.identity.fingerprint,
      };
      await handlePostPost({
        request: new Request('https://aetheris.pages.dev/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createSignedEnvelope(createPayload, aliceKeySet)),
        }),
        env: {},
      });

      const votePayload = {
        action: 'vote',
        postId: createPayload.id,
        direction: 1,
      };

      const envelope = createSignedEnvelope(votePayload, aliceKeySet);
      const req = new Request('https://aetheris.pages.dev/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handlePostPost({ request: req, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('allows POST /api/channels with valid envelope and channel:create capability', async () => {
      const payload = {
        id: `chan-${Date.now()}`,
        name: 'Quantum Cryptography Circle',
        description: 'Post-quantum ML-KEM-768 channel',
        space: 'relays',
      };

      const envelope = createSignedEnvelope(payload, aliceKeySet);
      const req = new Request('https://aetheris.pages.dev/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handleChannelPost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.channel.name).toBe(payload.name.toLowerCase().trim());
    });

    it('allows POST /api/storage with valid envelope and storage:upload capability', async () => {
      const payload = {
        content: 'Sovereign encrypted binary chunk content',
        key: `release-${Date.now()}.bin`,
        fileName: 'release.bin',
      };

      const envelope = createSignedEnvelope(payload, aliceKeySet);
      const req = new Request('https://aetheris.pages.dev/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handleStoragePost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('allows POST /api/interactions with valid envelope and post:vote capability', async () => {
      const payload = {
        targetId: 'post-1',
        action: 'like',
      };

      const envelope = createSignedEnvelope(payload, aliceKeySet);
      const req = new Request('https://aetheris.pages.dev/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handleInteractionPost({ request: req, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('allows POST /api/nanopublications with valid envelope and storage:upload capability', async () => {
      const payload = {
        id: `nano-${Date.now()}`,
        title: 'Formally Verified Micro-Kernel',
        fileName: 'kernel.elf',
        byteSize: 2048,
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      };

      const envelope = createSignedEnvelope(payload, aliceKeySet);
      const req = new Request('https://aetheris.pages.dev/api/nanopublications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handleNanopubPost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('allows POST /api/analytics with valid envelope and node:telemetry capability', async () => {
      const payload = {
        nodeId: `node-${aliceKeySet.identity.fingerprint}`,
        name: 'Sovereign Node Alpha',
        latencyMs: 12.4,
      };

      const envelope = createSignedEnvelope(payload, aliceKeySet);
      const req = new Request('https://aetheris.pages.dev/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handleAnalyticsPost({ request: req, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('3. Strict 5-Stage Sequential Verification Invariants & Attack Defenses', () => {
    it('Stage 1: Rejects tampered envelope payload with HTTP 401', async () => {
      const payload = {
        id: `chan-${Date.now()}`,
        name: 'Genuine Channel Name',
      };
      const envelope = createSignedEnvelope(payload, aliceKeySet);

      (envelope.payload as any).name = 'Malicious Injected Channel Name';

      const req = new Request('https://aetheris.pages.dev/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handleChannelPost({ request: req, env: {} });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/signature/i);
    });

    it('Stage 1: Rejects corrupted signature with HTTP 401', async () => {
      const payload = {
        id: `chan-${Date.now()}`,
        name: 'Channel with Bad Sig',
      };
      const envelope = createSignedEnvelope(payload, aliceKeySet);
      envelope.signature = envelope.signature.slice(0, -2) + (envelope.signature.endsWith('00') ? '11' : '00');

      const req = new Request('https://aetheris.pages.dev/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handleChannelPost({ request: req, env: {} });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/signature/i);
    });

    it('Stage 2: Rejects spoofed fingerprint mismatch with HTTP 401', async () => {
      const payload = {
        id: `chan-${Date.now()}`,
        name: 'Spoofed Fingerprint Channel',
      };
      const envelope = createSignedEnvelope(payload, aliceKeySet);

      envelope.identity.fingerprint = bobKeySet.identity.fingerprint;
      const digest = canonicalizeEnvelopeDigest(
        envelope.payload,
        envelope.nonce,
        envelope.timestamp,
        envelope.identity.fingerprint,
        envelope.identity.capabilities
      );
      envelope.signature = bytesToHex(signMessage(digest, aliceKeySet.signingPrivateKey));

      const req = new Request('https://aetheris.pages.dev/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handleChannelPost({ request: req, env: {} });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.stage).toBe('fingerprint');
      expect(json.error).toMatch(/fingerprint/i);
    });

    it('Stage 3: Rejects request missing required capability with HTTP 403 Forbidden', async () => {
      const restrictedKeySet = createSovereignIdentity({
        capabilities: ['post:vote'],
      });

      const payload = {
        id: `chan-${Date.now()}`,
        name: 'Unauthorized Channel Attempt',
      };
      const envelope = createSignedEnvelope(payload, restrictedKeySet);

      const req = new Request('https://aetheris.pages.dev/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handleChannelPost({ request: req, env: {} });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.stage).toBe('authorization');
      expect(json.error).toMatch(/missing required capability|channel:create/i);
    });

    it('Stage 4: Rejects replayed nonce with HTTP 401', async () => {
      const payload = {
        id: `post-replay-${Date.now()}`,
        title: 'Replay Attack Attempt',
        content: 'Payload',
      };
      const envelope = createSignedEnvelope(payload, aliceKeySet);

      const req1 = new Request('https://aetheris.pages.dev/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      const res1 = await handlePostPost({ request: req1, env: {} });
      expect(res1.status).toBe(201);

      const req2 = new Request('https://aetheris.pages.dev/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      const res2 = await handlePostPost({ request: req2, env: {} });
      expect(res2.status).toBe(401);
      const json2 = await res2.json();
      expect(json2.success).toBe(false);
      expect(json2.error).toMatch(/replay|duplicate nonce/i);
    });

    it('Stage 4: Rejects expired timestamp with HTTP 401', async () => {
      const payload = {
        id: `post-expired-${Date.now()}`,
        title: 'Expired Timestamp Post',
      };
      const oldTimestamp = Date.now() - 360000;
      const envelope = createSignedEnvelope(payload, aliceKeySet, {
        timestamp: oldTimestamp,
      });

      const req = new Request('https://aetheris.pages.dev/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handlePostPost({ request: req, env: {} });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/expired|clock drift/i);
    });
  });

  describe('4. Backward Compatibility with Phase 1 Flat Payloads', () => {
    it('seamlessly accepts legacy flat signed payload on POST /api/channels', async () => {
      const legacyUser = generateKeyPair();
      const timestamp = Date.now();
      const payloadToSign = `${legacyUser.fingerprint}:${timestamp}`;
      const signatureHex = bytesToHex(signMessage(payloadToSign, legacyUser.privateKey));

      const req = new Request('https://aetheris.pages.dev/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Author-Fingerprint': legacyUser.fingerprint,
          'X-Public-Key': legacyUser.publicKeyHex,
          'X-Signature': signatureHex,
          'X-Timestamp': String(timestamp),
        },
        body: JSON.stringify({
          id: `chan-legacy-${Date.now()}`,
          name: 'Legacy Phase 1 Channel',
          authorFingerprint: legacyUser.fingerprint,
          publicKey: legacyUser.publicKeyHex,
          signature: signatureHex,
          timestamp,
        }),
      });

      const res = await handleChannelPost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.channel.name).toBe('legacy phase 1 channel');
    });
  });

  describe('5. Client State Sovereign Store Envelope Integration', () => {
    it('initializes sovereignIdentity on AetherisClientStore and generates envelopes', () => {
      const store = new AetherisClientStore();

      expect(store.sovereignIdentity).toBeDefined();
      expect(store.sovereignIdentity.fingerprint).toBe(store.keypair.fingerprint);
      expect(store.sovereignIdentity.signingPublicKey).toBe(store.keypair.publicKeyHex);
      expect(store.sovereignIdentity.capabilities).toContain('post:create');

      const testPayload = { action: 'test_action', value: 123 };
      const envelope = store.createSignedEnvelope(testPayload);

      expect(envelope.payload).toEqual(testPayload);
      expect(envelope.identity.fingerprint).toBe(store.keypair.fingerprint);
      expect(envelope.signature).toBeDefined();
      expect(envelope.nonce).toBeDefined();

      const verification = verifySignedEnvelope(envelope);
      expect(verification.authorized).toBe(true);
      expect(verification.fingerprint).toBe(store.keypair.fingerprint);
    });
  });
});
