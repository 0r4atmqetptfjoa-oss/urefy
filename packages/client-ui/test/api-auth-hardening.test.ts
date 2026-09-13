import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateKeyPair,
  signMessage,
  createSovereignIdentity,
  createSignedEnvelope,
} from '@aetheris/core-crypto';
import { bytesToHex } from '@noble/hashes/utils';
import { onRequestDelete as handleChannelDelete, onRequestPost as handleChannelPost } from '../functions/api/channels.js';
import { onRequestPost as handleMessagePost } from '../functions/api/messages.js';
import { onRequestPost as handlePostPost } from '../functions/api/posts.js';
import { onRequestPost as handleStoragePost, onRequestDelete as handleStorageDelete } from '../functions/api/storage.js';
import { onRequestPost as handleInteractionPost } from '../functions/api/interactions.js';
import { onRequestPost as handleNanopubPost } from '../functions/api/nanopublications.js';
import { onRequestPost as handlePushPost } from '../functions/api/push.js';
import { resetAdminStores, DEFAULT_ADMIN_PIN } from '../functions/api/admin.js';

describe('UREfy Mutating API Cryptographic Authorization & Hardening Suite', () => {
  beforeEach(() => {
    resetAdminStores();
  });

  describe('1. Channels Endpoint Protection (channels.ts)', () => {
    it('rejects DELETE /api/channels without admin authorization with 401', async () => {
      const req = new Request('https://urefy.com/api/channels?id=chan-random', {
        method: 'DELETE',
      });
      const res = await handleChannelDelete({ request: req, env: {} });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('allows DELETE /api/channels with valid Admin PIN', async () => {
      const req = new Request('https://urefy.com/api/channels?id=chan-target', {
        method: 'DELETE',
        headers: { 'X-Admin-PIN': DEFAULT_ADMIN_PIN },
      });
      const res = await handleChannelDelete({ request: req, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('rejects POST /api/channels when unauthenticated', async () => {
      const req = new Request('https://urefy.com/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Unauth Channel', id: 'chan-unauth' }),
      });
      const res = await handleChannelPost({ request: req, env: {} });
      expect(res.status).toBe(401);
    });

    it('accepts POST /api/channels when signed with sovereign envelope', async () => {
      const alice = createSovereignIdentity();
      const envelope = createSignedEnvelope({
        id: 'chan-alice-1',
        name: 'Alice Sovereign Channel',
      }, alice);

      const req = new Request('https://urefy.com/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handleChannelPost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('2. E2EE Messages API Hardening (messages.ts)', () => {
    it('strictly rejects plaintext message transmission lacking ciphertext with 400', async () => {
      const alice = createSovereignIdentity();
      const envelope = createSignedEnvelope({
        text: 'This is dangerous raw plaintext',
        authorFingerprint: alice.identity.fingerprint,
      }, alice);

      const req = new Request('https://urefy.com/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      const res = await handleMessagePost({ request: req, env: {} });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/ciphertext is required/i);
    });

    it('rejects POST /api/messages when signature or identity is missing with 401', async () => {
      const alice = generateKeyPair();
      const req = new Request('https://urefy.com/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciphertext: 'enc_payload_12345',
          channelId: 'relays-general',
          authorFingerprint: alice.fingerprint,
        }),
      });
      const res = await handleMessagePost({ request: req, env: {} });
      expect(res.status).toBe(401);
    });

    it('rejects POST /api/messages when public key does not match claimed fingerprint (anti-spoofing)', async () => {
      const alice = createSovereignIdentity();
      const bob = createSovereignIdentity();
      const envelope = createSignedEnvelope({
        ciphertext: 'enc_ciphertext_secure',
        channelId: 'relays-general',
      }, alice);
      envelope.identity.fingerprint = bob.identity.fingerprint;

      const req = new Request('https://urefy.com/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      const res = await handleMessagePost({ request: req, env: {} });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/Identity spoofing detected|Cryptographic signature verification failed/i);
    });

    it('accepts and verifies valid signed E2EE message', async () => {
      const alice = createSovereignIdentity();
      const ciphertext = 'cipher_e2ee_quantum_packet_xyz';
      const envelope = createSignedEnvelope({
        id: 'msg-alice-01',
        ciphertext,
        channelId: 'relays-general',
      }, alice);

      const req = new Request('https://urefy.com/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      const res = await handleMessagePost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message.ciphertext).toBe(ciphertext);
      expect(json.message.authorFingerprint).toBe(alice.identity.fingerprint);
    });
  });

  describe('3. Posts Endpoint Authentication (posts.ts)', () => {
    it('rejects unauthenticated post creation with 401', async () => {
      const req = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Unauthenticated Pulse',
          content: 'Should be rejected',
        }),
      });
      const res = await handlePostPost({ request: req, env: {} });
      expect(res.status).toBe(401);
    });

    it('accepts valid cryptographically signed post creation', async () => {
      const alice = createSovereignIdentity();
      const content = 'Sovereign encrypted post content';
      const envelope = createSignedEnvelope({
        title: 'Alice First Post',
        content,
      }, alice);

      const req = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      const res = await handlePostPost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.post.authorFingerprint).toBe(alice.identity.fingerprint);
    });

    it('rejects unauthenticated non-anonymous vote with 401', async () => {
      const req = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote',
          postId: 'post-123',
          direction: 1,
        }),
      });
      const res = await handlePostPost({ request: req, env: {} });
      expect(res.status).toBe(401);
    });

    it('accepts valid signed vote from verified identity', async () => {
      const alice = createSovereignIdentity();
      const bob = createSovereignIdentity();

      // Step 1: Create a post by Alice
      const createReq = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createSignedEnvelope({
          id: 'post-vote-target-01',
          title: 'Vote Target',
          content: 'A post to vote on',
        }, alice)),
      });
      await handlePostPost({ request: createReq, env: {} });

      // Step 2: Bob votes on Alice\'s post
      const targetId = 'post-vote-target-01';
      const voteReq = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createSignedEnvelope({
          action: 'vote',
          postId: targetId,
          direction: 1,
        }, bob)),
      });
      const res = await handlePostPost({ request: voteReq, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('accepts anonymous Chaumian vote with unlinked nullifier', async () => {
      const alice = createSovereignIdentity();

      // Step 1: Create a post
      const createReq = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createSignedEnvelope({
          id: 'post-anon-target-01',
          title: 'Anon Vote Target',
          content: 'Anon Target Post',
        }, alice)),
      });
      await handlePostPost({ request: createReq, env: {} });

      // Step 2: Cast anonymous ballot
      const req = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'anonymous-vote',
          postId: 'post-anon-target-01',
          direction: 1,
          nullifier: 'nullifier-ballot-abc123xyz',
        }),
      });
      const res = await handlePostPost({ request: req, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('4. Storage Object Protection & Ownership (storage.ts)', () => {
    it('rejects unauthenticated storage upload with 401', async () => {
      const req = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Hello World File Data',
          fileName: 'test.txt',
        }),
      });
      const res = await handleStoragePost({ request: req, env: {} });
      expect(res.status).toBe(401);
    });

    it('accepts signed storage upload from sovereign identity', async () => {
      const alice = createSovereignIdentity();
      const envelope = createSignedEnvelope({
        content: 'Sovereign encrypted vault asset',
        fileName: 'vault-asset.enc',
        key: 'vault-asset-alice',
      }, alice);

      const req = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sovereign-Envelope': JSON.stringify(envelope),
        },
        body: JSON.stringify(envelope),
      });

      const res = await handleStoragePost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.author).toBe(alice.identity.fingerprint);
    });

    it('rejects DELETE /api/storage without authorization with 401', async () => {
      const req = new Request('https://urefy.com/api/storage?key=vault-asset-alice', {
        method: 'DELETE',
      });
      const res = await handleStorageDelete({ request: req, env: {} });
      expect(res.status).toBe(401);
    });

    it('rejects DELETE /api/storage by a non-owner with 403 Forbidden', async () => {
      const alice = createSovereignIdentity();
      const bob = createSovereignIdentity();

      // Step 1: Alice uploads her file
      const uploadReq = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createSignedEnvelope({
          content: 'Secret file belonging to Alice',
          fileName: 'alice-vault.enc',
          key: 'alice-protected-vault',
        }, alice)),
      });
      await handleStoragePost({ request: uploadReq, env: {} });

      // Step 2: Bob attempts to delete Alice\'s file
      const deleteEnvelope = createSignedEnvelope({
        action: 'delete',
        key: 'alice-protected-vault',
      }, bob);

      const deleteReq = new Request('https://urefy.com/api/storage?key=alice-protected-vault', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Sovereign-Envelope': JSON.stringify(deleteEnvelope),
        },
        body: JSON.stringify(deleteEnvelope),
      });

      const res = await handleStorageDelete({ request: deleteReq, env: {} });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/author mismatch|permission/i);
    });

    it('allows DELETE /api/storage by the verified owner', async () => {
      const alice = createSovereignIdentity();

      // Step 1: Alice uploads her file
      const uploadReq = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createSignedEnvelope({
          content: 'Alice personal file to delete',
          fileName: 'alice-disposable.enc',
          key: 'alice-disposable-vault',
        }, alice)),
      });
      await handleStoragePost({ request: uploadReq, env: {} });

      // Step 2: Alice deletes her own file
      const deleteEnvelope = createSignedEnvelope({
        action: 'delete',
        key: 'alice-disposable-vault',
      }, alice);

      const deleteReq = new Request('https://urefy.com/api/storage?key=alice-disposable-vault', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Sovereign-Envelope': JSON.stringify(deleteEnvelope),
        },
        body: JSON.stringify(deleteEnvelope),
      });

      const res = await handleStorageDelete({ request: deleteReq, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('5. Mutating Interactions & Nanopublications Protection', () => {
    it('rejects mutating interaction lacking cryptographic identity with 401', async () => {
      const req = new Request('https://urefy.com/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'post-test-1',
          action: 'like',
        }),
      });
      const res = await handleInteractionPost({ request: req, env: {} });
      expect(res.status).toBe(401);
    });

    it('accepts verified signed interaction', async () => {
      const alice = createSovereignIdentity();
      const envelope = createSignedEnvelope({
        targetId: 'post-interact-1',
        action: 'like',
      }, alice);

      const req = new Request('https://urefy.com/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      const res = await handleInteractionPost({ request: req, env: {} });
      expect(res.status).toBe(200);
    });

    it('rejects nanopublication upload lacking signature with 401', async () => {
      const req = new Request('https://urefy.com/api/nanopublications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Quantum Discovery',
          fileName: 'data.bin',
          sha256: 'abc1234567890abcdef',
        }),
      });
      const res = await handleNanopubPost({ request: req, env: {} });
      expect(res.status).toBe(401);
    });

    it('accepts verified signed nanopublication release', async () => {
      const alice = createSovereignIdentity();
      const envelope = createSignedEnvelope({
        title: 'Quantum Entanglement Research',
        fileName: 'paper.bin',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      }, alice);

      const req = new Request('https://urefy.com/api/nanopublications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      const res = await handleNanopubPost({ request: req, env: {} });
      expect(res.status).toBe(201);
    });
  });

  describe('6. Web Push Identity Ownership Protection (/api/push)', () => {
    it('rejects signed push subscribe with mismatched fingerprint spoofing with 403', async () => {
      const alice = createSovereignIdentity();
      const envelope = createSignedEnvelope({
        action: 'subscribe',
        endpoint: 'https://fcm.googleapis.com/fcm/send/fake-endpoint',
        keys: { p256dh: 'fake-p256dh', auth: 'fake-auth' },
        fingerprint: 'spoofed-victim-fp',
      }, alice);

      const req = new Request('https://urefy.com/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handlePushPost({ request: req, env: {} });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/fingerprint mismatch/i);
    });

    it('accepts signed push subscribe with valid cryptographic identity with 201', async () => {
      const alice = createSovereignIdentity();
      const envelope = createSignedEnvelope({
        action: 'subscribe',
        endpoint: 'https://fcm.googleapis.com/fcm/send/alice-valid-endpoint',
        keys: { p256dh: 'valid-p256dh', auth: 'valid-auth' },
        fingerprint: alice.identity.fingerprint,
      }, alice);

      const req = new Request('https://urefy.com/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handlePushPost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('rejects signed push unsubscribe with mismatched fingerprint spoofing with 403', async () => {
      const alice = createSovereignIdentity();
      const envelope = createSignedEnvelope({
        action: 'unsubscribe',
        endpoint: 'https://fcm.googleapis.com/fcm/send/alice-valid-endpoint',
        fingerprint: 'spoofed-victim-fp',
      }, alice);

      const req = new Request('https://urefy.com/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handlePushPost({ request: req, env: {} });
      expect(res.status).toBe(403);
    });

    it('allows signed push unsubscribe matching authenticated cryptographic identity', async () => {
      const alice = createSovereignIdentity();
      const envelope = createSignedEnvelope({
        action: 'unsubscribe',
        endpoint: 'https://fcm.googleapis.com/fcm/send/alice-valid-endpoint',
        fingerprint: alice.identity.fingerprint,
      }, alice);

      const req = new Request('https://urefy.com/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      const res = await handlePushPost({ request: req, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
