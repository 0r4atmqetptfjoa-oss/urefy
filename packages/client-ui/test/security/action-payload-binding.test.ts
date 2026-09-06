import { describe, it, expect } from 'vitest';
import {
  createSovereignIdentity,
  createSignedEnvelope,
  signMessage,
  bytesToHex,
} from '@aetheris/core-crypto';
import {
  verifyIdentitySignature,
  requireSignedEnvelope,
  resetReplayNonceCache,
} from '../../functions/api/_auth.js';

describe('Security Gate: Cryptographic Action-Payload Binding & Anti-Rebinding', () => {
  it('rejects cross-action signature reuse (signature for "like" cannot authorize "delete")', () => {
    const identity = createSovereignIdentity();
    const targetId = 'post-xyz-999';
    const timestamp = Date.now();

    // Alice signs a "like" action
    const likePayload = `${targetId}:like:${identity.identity.fingerprint}`;
    const signatureLike = bytesToHex(signMessage(likePayload, identity.signingPrivateKey));

    // Attacker intercepts signatureLike and attempts to use it for "delete" action on the same post
    const deleteReq = new Request('https://aetheris.pages.dev/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Author-Fingerprint': identity.identity.fingerprint,
        'X-Public-Key': identity.identity.signingPublicKey,
        'X-Signature': signatureLike,
        'X-Timestamp': String(timestamp),
      },
      body: JSON.stringify({
        targetId,
        action: 'delete',
        authorFingerprint: identity.identity.fingerprint,
        publicKey: identity.identity.signingPublicKey,
        signature: signatureLike,
        timestamp,
      }),
    });

    const result = verifyIdentitySignature({
      targetId,
      action: 'delete',
      authorFingerprint: identity.identity.fingerprint,
      publicKey: identity.identity.signingPublicKey,
      signature: signatureLike,
      timestamp,
    }, deleteReq);

    expect(result.valid).toBe(false);
    expect(result.response?.status).toBe(401);
  });

  it('rejects cross-target signature reuse (signature for "post-1" cannot authorize "post-2")', () => {
    const identity = createSovereignIdentity();
    const timestamp = Date.now();

    // Alice signs "upvote" for post-1
    const post1Payload = `post-1:vote:${identity.identity.fingerprint}`;
    const signaturePost1 = bytesToHex(signMessage(post1Payload, identity.signingPrivateKey));

    const post2Req = new Request('https://aetheris.pages.dev/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Author-Fingerprint': identity.identity.fingerprint,
        'X-Public-Key': identity.identity.signingPublicKey,
        'X-Signature': signaturePost1,
        'X-Timestamp': String(timestamp),
      },
      body: JSON.stringify({
        targetId: 'post-2',
        action: 'vote',
        authorFingerprint: identity.identity.fingerprint,
        publicKey: identity.identity.signingPublicKey,
        signature: signaturePost1,
        timestamp,
      }),
    });

    const result = verifyIdentitySignature({
      targetId: 'post-2',
      action: 'vote',
      authorFingerprint: identity.identity.fingerprint,
      publicKey: identity.identity.signingPublicKey,
      signature: signaturePost1,
      timestamp,
    }, post2Req);

    expect(result.valid).toBe(false);
    expect(result.response?.status).toBe(401);
  });

  it('enforces strict capability boundary in requireSignedEnvelope (channel:create != storage:upload)', async () => {
    resetReplayNonceCache();
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
