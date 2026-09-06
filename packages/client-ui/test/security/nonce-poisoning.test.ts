import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSovereignIdentity,
  createSignedEnvelope,
  generateEnvelopeNonce,
} from '@aetheris/core-crypto';
import {
  requireSignedEnvelope,
  resetReplayNonceCache,
  globalReplayNonceCache,
} from '../../functions/api/_auth.js';
import { onRequestPost as handlePostPost } from '../../functions/api/posts.js';

describe('Security: Anti-Poisoning Nonce Verification Order', () => {
  beforeEach(() => {
    resetReplayNonceCache();
  });

  it('does NOT record or consume nonce when signature is invalid (prevents nonce pre-poisoning)', async () => {
    const victim = createSovereignIdentity();
    const targetedNonce = generateEnvelopeNonce();

    // Attacker crafts an envelope targeting the victim's identity and nonce, but with an invalid signature
    const forgedEnvelope = {
      payload: { action: 'create', title: 'Malicious Forged Post', content: 'Exploit test' },
      signature: '0'.repeat(128),
      nonce: targetedNonce,
      timestamp: Date.now(),
      identity: victim.identity,
    };

    const mockEnv: any = {
      DB: {
        prepare: () => ({
          bind: () => ({
            run: async () => ({ success: true }),
          }),
        }),
      },
    };

    // 1. Attacker sends forged request
    const forgedReq = new Request('https://aetheris.pages.dev/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forgedEnvelope),
    });

    const forgedRes = await handlePostPost({ request: forgedReq, env: mockEnv });
    expect(forgedRes.status).toBe(401);
    const forgedJson = await forgedRes.json();
    expect(forgedJson.success).toBe(false);
    expect(forgedJson.stage).toBe('signature');

    // Verify nonce was NOT recorded in memory cache
    const memoryKey = `${victim.identity.fingerprint}:${targetedNonce}`;
    expect(globalReplayNonceCache.has(memoryKey)).toBe(false);

    // 2. Genuine victim now creates a legitimate post using the EXACT SAME targeted nonce
    const legitimatePayload = {
      action: 'create',
      id: `post-legit-${Date.now()}`,
      title: 'Genuine Post from Alice',
      content: 'This should succeed because attacker could not poison the nonce',
      channelId: 'relays-general',
      authorFingerprint: victim.identity.fingerprint,
    };

    const genuineEnvelope = createSignedEnvelope(legitimatePayload, victim, {
      nonce: targetedNonce,
    });

    const genuineReq = new Request('https://aetheris.pages.dev/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genuineEnvelope),
    });

    const genuineRes = await handlePostPost({ request: genuineReq, env: mockEnv });
    expect(genuineRes.status).toBe(201);
    const genuineJson = await genuineRes.json();
    expect(genuineJson.success).toBe(true);

    // Verify nonce is NOW recorded after valid signature verification
    expect(globalReplayNonceCache.has(memoryKey)).toBe(true);

    // 3. Replay of the genuine request with the now-spent nonce must be rejected
    const replayReq = new Request('https://aetheris.pages.dev/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genuineEnvelope),
    });

    const replayRes = await handlePostPost({ request: replayReq, env: mockEnv });
    expect(replayRes.status).toBe(401);
    const replayJson = await replayRes.json();
    expect(replayJson.success).toBe(false);
    expect(replayJson.error).toMatch(/replay/i);
  });

  it('rejects tampered payload without burning genuine nonce', async () => {
    const victim = createSovereignIdentity();
    const targetedNonce = generateEnvelopeNonce();

    // Genuine signed envelope
    const legitimatePayload = {
      action: 'create',
      id: `post-tamper-${Date.now()}`,
      title: 'Untampered Title',
      content: 'Original Content',
    };

    const envelope = createSignedEnvelope(legitimatePayload, victim, {
      nonce: targetedNonce,
    });

    // Attacker modifies the payload in transit (invalidating signature)
    envelope.payload.title = 'Tampered Title In Transit';

    const req = new Request('https://aetheris.pages.dev/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });

    const res = await handlePostPost({ request: req, env: {} });
    expect(res.status).toBe(401);

    // Nonce should remain fresh because signature failed before recording nonce
    const memoryKey = `${victim.identity.fingerprint}:${targetedNonce}`;
    expect(globalReplayNonceCache.has(memoryKey)).toBe(false);
  });
});
