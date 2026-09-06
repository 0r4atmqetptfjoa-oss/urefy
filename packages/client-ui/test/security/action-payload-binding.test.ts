import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSovereignIdentity,
  createSignedEnvelope,
} from '@aetheris/core-crypto';
import {
  requireSignedEnvelope,
  resetReplayNonceCache,
} from '../../functions/api/_auth.js';

describe('Security Gate: Cryptographic Action-Payload Binding & Anti-Rebinding', () => {
  beforeEach(() => {
    resetReplayNonceCache();
  });

  it('rejects cross-action signature reuse (signature for "like" cannot authorize "delete")', async () => {
    const identity = createSovereignIdentity();
    const targetId = 'post-xyz-999';

    // Alice creates signed envelope for a "like" action
    const envelope = createSignedEnvelope(
      { targetId, action: 'like' },
      identity
    );

    // Attacker intercepts envelope and attempts to change payload to "delete" action on the same post
    const tamperedEnvelope = {
      ...envelope,
      payload: { targetId, action: 'delete' },
    };

    const req = new Request('https://aetheris.pages.dev/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tamperedEnvelope),
    });

    const result = await requireSignedEnvelope(
      { request: req, env: {} },
      tamperedEnvelope,
      'post:vote'
    );

    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(401);
  });

  it('rejects cross-target signature reuse (signature for "post-1" cannot authorize "post-2")', async () => {
    const identity = createSovereignIdentity();

    // Alice creates signed envelope for post-1
    const envelope = createSignedEnvelope(
      { targetId: 'post-1', action: 'vote' },
      identity
    );

    // Attacker attempts to apply signature to post-2
    const tamperedEnvelope = {
      ...envelope,
      payload: { targetId: 'post-2', action: 'vote' },
    };

    const req = new Request('https://aetheris.pages.dev/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tamperedEnvelope),
    });

    const result = await requireSignedEnvelope(
      { request: req, env: {} },
      tamperedEnvelope,
      'post:vote'
    );

    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(401);
  });

  it('enforces strict capability boundary in requireSignedEnvelope (channel:create != storage:upload)', async () => {
    const limitedIdentity = createSovereignIdentity({
      capabilities: ['channel:create'],
    });

    const uploadPayload = {
      action: 'upload',
      fileName: 'malicious.bin',
      bytes: '00112233',
    };

    const envelope = createSignedEnvelope(uploadPayload, limitedIdentity);

    // Call route that demands storage:upload capability
    const authResult = await requireSignedEnvelope(
      { request: new Request('https://aetheris.pages.dev/api/storage'), env: {} },
      envelope,
      'storage:upload'
    );

    expect(authResult.authorized).toBe(false);
    expect(authResult.response?.status).toBe(403);
  });
});
