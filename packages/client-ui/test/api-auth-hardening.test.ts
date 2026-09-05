import { describe, it, expect, beforeEach } from 'vitest';
import { generateKeyPair, signMessage } from '@aetheris/core-crypto';
import { bytesToHex } from '@noble/hashes/utils';
import { onRequestDelete as handleChannelDelete, onRequestPost as handleChannelPost } from '../functions/api/channels.js';
import { onRequestPost as handleMessagePost } from '../functions/api/messages.js';
import { onRequestPost as handlePostPost } from '../functions/api/posts.js';
import { onRequestPost as handleStoragePost, onRequestDelete as handleStorageDelete } from '../functions/api/storage.js';
import { onRequestPost as handleInteractionPost } from '../functions/api/interactions.js';
import { onRequestPost as handleNanopubPost } from '../functions/api/nanopublications.js';
import { resetAdminStores, DEFAULT_ADMIN_PIN } from '../functions/api/admin.js';

describe('Aetheris Mutating API Cryptographic Authorization & Hardening Suite', () => {
  beforeEach(() => {
    resetAdminStores();
  });

  describe('1. Channels Endpoint Protection (channels.ts)', () => {
    it('rejects DELETE /api/channels without admin authorization with 401', async () => {
      const req = new Request('https://aetheris.pages.dev/api/channels?id=chan-random', {
        method: 'DELETE',
      });
      const res = await handleChannelDelete({ request: req, env: {} });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('allows DELETE /api/channels with valid Admin PIN', async () => {
      const req = new Request('https://aetheris.pages.dev/api/channels?id=chan-target', {
        method: 'DELETE',
        headers: { 'X-Admin-PIN': DEFAULT_ADMIN_PIN },
      });
      const res = await handleChannelDelete({ request: req, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('rejects POST /api/channels when unauthenticated', async () => {
      const req = new Request('https://aetheris.pages.dev/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Unauth Channel', id: 'chan-unauth' }),
      });
      const res = await handleChannelPost({ request: req, env: {} });
      expect(res.status).toBe(401);
    });

    it('accepts POST /api/channels when cryptographically signed by sovereign identity', async () => {
      const alice = generateKeyPair();
      const timestamp = Date.now();
      const payloadToSign = `${alice.fingerprint}:${timestamp}`;
      const signatureHex = bytesToHex(signMessage(payloadToSign, alice.privateKey));

      const req = new Request('https://aetheris.pages.dev/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Author-Fingerprint': alice.fingerprint,
          'X-Public-Key': alice.publicKeyHex,
          'X-Signature': signatureHex,
          'X-Timestamp': String(timestamp),
        },
        body: JSON.stringify({
          id: 'chan-alice-1',
          name: 'Alice Sovereign Channel',
          authorFingerprint: alice.fingerprint,
          publicKey: alice.publicKeyHex,
          signature: signatureHex,
          timestamp,
        }),
      });

      const res = await handleChannelPost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('2. E2EE Messages API Hardening (messages.ts)', () => {
    it('strictly rejects plaintext message transmission lacking ciphertext with 400', async () => {
      const alice = generateKeyPair();
      const req = new Request('https://aetheris.pages.dev/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'This is dangerous raw plaintext',
          authorFingerprint: alice.fingerprint,
        }),
      });
      const res = await handleMessagePost({ request: req, env: {} });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/ciphertext is required/i);
    });

    it('rejects POST /api/messages when signature or identity is missing with 401', async () => {
      const alice = generateKeyPair();
      const req = new Request('https://aetheris.pages.dev/api/messages', {
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
      const alice = generateKeyPair();
      const bob = generateKeyPair();
      const timestamp = Date.now();
      const ciphertext = 'enc_ciphertext_secure';
      const signatureHex = bytesToHex(signMessage(ciphertext, alice.privateKey));

      const req = new Request('https://aetheris.pages.dev/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciphertext,
          channelId: 'relays-general',
          authorFingerprint: bob.fingerprint,
          publicKey: alice.publicKeyHex,
          signature: signatureHex,
          timestamp,
        }),
      });
      const res = await handleMessagePost({ request: req, env: {} });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/Identity spoofing detected/i);
    });

    it('accepts and verifies valid signed E2EE message', async () => {
      const alice = generateKeyPair();
      const timestamp = Date.now();
      const ciphertext = 'cipher_e2ee_quantum_packet_xyz';
      const signatureHex = bytesToHex(signMessage(ciphertext, alice.privateKey));

      const req = new Request('https://aetheris.pages.dev/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'msg-alice-01',
          ciphertext,
          channelId: 'relays-general',
          authorFingerprint: alice.fingerprint,
          publicKey: alice.publicKeyHex,
          signature: signatureHex,
          timestamp,
        }),
      });
      const res = await handleMessagePost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message.ciphertext).toBe(ciphertext);
      expect(json.message.authorFingerprint).toBe(alice.fingerprint);
    });
  });

  describe('3. Posts Endpoint Authentication (posts.ts)', () => {
    it('rejects unauthenticated post creation with 401', async () => {
      const req = new Request('https://aetheris.pages.dev/api/posts', {
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
      const alice = generateKeyPair();
      const timestamp = Date.now();
      const content = 'Sovereign encrypted post content';
      const signatureHex = bytesToHex(signMessage(content, alice.privateKey));

      const req = new Request('https://aetheris.pages.dev/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Alice First Post',
          content,
          authorFingerprint: alice.fingerprint,
          publicKey: alice.publicKeyHex,
          signature: signatureHex,
          timestamp,
        }),
      });
      const res = await handlePostPost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.post.authorFingerprint).toBe(alice.fingerprint);
    });

    it('rejects unauthenticated non-anonymous vote with 401', async () => {
      const req = new Request('https://aetheris.pages.dev/api/posts', {
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
      const alice = generateKeyPair();
      const bob = generateKeyPair();

      // Step 1: Create a post by Alice
      const postTimestamp = Date.now();
      const postContent = 'A post to vote on';
      const postSig = bytesToHex(signMessage(postContent, alice.privateKey));
      const createReq = new Request('https://aetheris.pages.dev/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'post-vote-target-01',
          title: 'Vote Target',
          content: postContent,
          authorFingerprint: alice.fingerprint,
          publicKey: alice.publicKeyHex,
          signature: postSig,
          timestamp: postTimestamp,
        }),
      });
      await handlePostPost({ request: createReq, env: {} });

      // Step 2: Bob votes on Alice\'s post
      const voteTimestamp = Date.now();
      const targetId = 'post-vote-target-01';
      const signPayload = `${targetId}:vote:${bob.fingerprint}`;
      const signatureHex = bytesToHex(signMessage(signPayload, bob.privateKey));

      const voteReq = new Request('https://aetheris.pages.dev/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote',
          postId: targetId,
          direction: 1,
          userFingerprint: bob.fingerprint,
          publicKey: bob.publicKeyHex,
          signature: signatureHex,
          timestamp: voteTimestamp,
        }),
      });
      const res = await handlePostPost({ request: voteReq, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('accepts anonymous Chaumian vote with unlinked nullifier', async () => {
      const alice = generateKeyPair();

      // Step 1: Create a post
      const postSig = bytesToHex(signMessage('Anon Target Post', alice.privateKey));
      const createReq = new Request('https://aetheris.pages.dev/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'post-anon-target-01',
          title: 'Anon Vote Target',
          content: 'Anon Target Post',
          authorFingerprint: alice.fingerprint,
          publicKey: alice.publicKeyHex,
          signature: postSig,
          timestamp: Date.now(),
        }),
      });
      await handlePostPost({ request: createReq, env: {} });

      // Step 2: Cast anonymous ballot
      const req = new Request('https://aetheris.pages.dev/api/posts', {
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
      const req = new Request('https://aetheris.pages.dev/api/storage', {
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
      const alice = generateKeyPair();
      const timestamp = Date.now();
      const content = 'Sovereign encrypted vault asset';
      const signatureHex = bytesToHex(signMessage(`${alice.fingerprint}:${timestamp}`, alice.privateKey));

      const req = new Request('https://aetheris.pages.dev/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Author-Fingerprint': alice.fingerprint,
          'X-Public-Key': alice.publicKeyHex,
          'X-Signature': signatureHex,
          'X-Timestamp': String(timestamp),
        },
        body: JSON.stringify({
          content,
          fileName: 'vault-asset.enc',
          key: 'vault-asset-alice',
          authorFingerprint: alice.fingerprint,
          publicKey: alice.publicKeyHex,
          signature: signatureHex,
          timestamp,
        }),
      });

      const res = await handleStoragePost({ request: req, env: {} });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.author).toBe(alice.fingerprint);
    });

    it('rejects DELETE /api/storage without authorization with 401', async () => {
      const req = new Request('https://aetheris.pages.dev/api/storage?key=vault-asset-alice', {
        method: 'DELETE',
      });
      const res = await handleStorageDelete({ request: req, env: {} });
      expect(res.status).toBe(401);
    });

    it('rejects DELETE /api/storage by a non-owner with 403 Forbidden', async () => {
      const alice = generateKeyPair();
      const bob = generateKeyPair();

      // Step 1: Alice uploads her file
      const uploadTimestamp = Date.now();
      const content = 'Secret file belonging to Alice';
      const uploadSig = bytesToHex(signMessage(`${alice.fingerprint}:${uploadTimestamp}`, alice.privateKey));

      const uploadReq = new Request('https://aetheris.pages.dev/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Author-Fingerprint': alice.fingerprint,
          'X-Public-Key': alice.publicKeyHex,
          'X-Signature': uploadSig,
          'X-Timestamp': String(uploadTimestamp),
        },
        body: JSON.stringify({
          content,
          fileName: 'alice-vault.enc',
          key: 'alice-protected-vault',
          authorFingerprint: alice.fingerprint,
          publicKey: alice.publicKeyHex,
          signature: uploadSig,
          timestamp: uploadTimestamp,
        }),
      });
      await handleStoragePost({ request: uploadReq, env: {} });

      // Step 2: Bob attempts to delete Alice\'s file
      const deleteTimestamp = Date.now();
      const key = 'alice-protected-vault';
      const bobSig = bytesToHex(signMessage(`${bob.fingerprint}:${deleteTimestamp}`, bob.privateKey));

      const deleteReq = new Request(`https://aetheris.pages.dev/api/storage?key=${key}&timestamp=${deleteTimestamp}`, {
        method: 'DELETE',
        headers: {
          'X-Author-Fingerprint': bob.fingerprint,
          'X-Public-Key': bob.publicKeyHex,
          'X-Signature': bobSig,
          'X-Timestamp': String(deleteTimestamp),
        },
      });

      const res = await handleStorageDelete({ request: deleteReq, env: {} });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/author mismatch|permission/i);
    });

    it('allows DELETE /api/storage by the verified owner', async () => {
      const alice = generateKeyPair();

      // Step 1: Alice uploads her file
      const uploadTimestamp = Date.now();
      const content = 'Alice personal file to delete';
      const uploadSig = bytesToHex(signMessage(`${alice.fingerprint}:${uploadTimestamp}`, alice.privateKey));

      const uploadReq = new Request('https://aetheris.pages.dev/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Author-Fingerprint': alice.fingerprint,
          'X-Public-Key': alice.publicKeyHex,
          'X-Signature': uploadSig,
          'X-Timestamp': String(uploadTimestamp),
        },
        body: JSON.stringify({
          content,
          fileName: 'alice-disposable.enc',
          key: 'alice-disposable-vault',
          authorFingerprint: alice.fingerprint,
          publicKey: alice.publicKeyHex,
          signature: uploadSig,
          timestamp: uploadTimestamp,
        }),
      });
      await handleStoragePost({ request: uploadReq, env: {} });

      // Step 2: Alice deletes her own file
      const deleteTimestamp = Date.now();
      const key = 'alice-disposable-vault';
      const aliceDeleteSig = bytesToHex(signMessage(`${alice.fingerprint}:${deleteTimestamp}`, alice.privateKey));

      const deleteReq = new Request(`https://aetheris.pages.dev/api/storage?key=${key}&timestamp=${deleteTimestamp}`, {
        method: 'DELETE',
        headers: {
          'X-Author-Fingerprint': alice.fingerprint,
          'X-Public-Key': alice.publicKeyHex,
          'X-Signature': aliceDeleteSig,
          'X-Timestamp': String(deleteTimestamp),
        },
      });

      const res = await handleStorageDelete({ request: deleteReq, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('5. Mutating Interactions & Nanopublications Protection', () => {
    it('rejects unauthenticated like/repost interaction with 401', async () => {
      const alice = generateKeyPair();
      const req = new Request('https://aetheris.pages.dev/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: 'post-123',
          action: 'like',
          userFingerprint: alice.fingerprint,
        }),
      });
      const res = await handleInteractionPost({ request: req, env: {} });
      expect(res.status).toBe(401);
    });

    it('accepts verified signed interaction', async () => {
      const alice = generateKeyPair();
      const timestamp = Date.now();
      const targetId = 'post-123';
      const payloadToSign = `${targetId}:like:${alice.fingerprint}`;
      const signatureHex = bytesToHex(signMessage(payloadToSign, alice.privateKey));

      const req = new Request('https://aetheris.pages.dev/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          action: 'like',
          userFingerprint: alice.fingerprint,
          publicKey: alice.publicKeyHex,
          signature: signatureHex,
          timestamp,
        }),
      });
      const res = await handleInteractionPost({ request: req, env: {} });
      expect(res.status).toBe(200);
    });

    it('rejects unauthenticated nanopublication release with 401', async () => {
      const req = new Request('https://aetheris.pages.dev/api/nanopublications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Quantum Release 1.0',
          fileName: 'release.tar.gz',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        }),
      });
      const res = await handleNanopubPost({ request: req, env: {} });
      expect(res.status).toBe(401);
    });

    it('accepts verified signed nanopublication release', async () => {
      const alice = generateKeyPair();
      const timestamp = Date.now();
      const payloadToSign = `${alice.fingerprint}:${timestamp}`;
      const signatureHex = bytesToHex(signMessage(payloadToSign, alice.privateKey));

      const req = new Request('https://aetheris.pages.dev/api/nanopublications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Quantum Release 1.0',
          fileName: 'release.tar.gz',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          authorFingerprint: alice.fingerprint,
          publicKey: alice.publicKeyHex,
          signature: signatureHex,
          timestamp,
        }),
      });
      const res = await handleNanopubPost({ request: req, env: {} });
      expect(res.status).toBe(201);
    });
  });
});
