import { afterAll, describe, expect, it } from 'vitest';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, signMessage } from '../src/ed25519.js';
import { createSignedEnvelope, createSovereignIdentity, verifySignedEnvelope, zeroizeKeyPairSet, type SovereignSignedEnvelope } from '../src/identity.js';

const keys = createSovereignIdentity();
afterAll(() => zeroizeKeyPairSet(keys));

function signedTimestamp(timestamp: unknown): SovereignSignedEnvelope {
  const nonce = '0123456789abcdef0123456789abcdef';
  const capabilities = JSON.stringify([...keys.identity.capabilities].sort());
  const canonical = `{"capabilities":${capabilities},"fingerprint":"${keys.identity.fingerprint}","nonce":"${nonce}","payload":{"ping":true},"timestamp":${JSON.stringify(timestamp)}}`;
  const signature = bytesToHex(signMessage(sha256(new TextEncoder().encode(canonical)), keys.signingPrivateKey));
  return { payload: { ping: true }, signature, nonce, timestamp: timestamp as number, identity: keys.identity };
}

describe('Signed envelope hostile-input boundary', () => {
  it.each([NaN, Infinity, -Infinity, undefined, null, 'not-a-timestamp', String(Date.now()), Date.now() + 0.5])(
    'rejects a cryptographically signed invalid timestamp %s', timestamp => {
      const envelope = signedTimestamp(timestamp);
      const nonces = new Set<string>();
      expect(verifySignedEnvelope(envelope, { seenNonces: nonces }).authorized).toBe(false);
      expect(nonces.size).toBe(0);
    },
  );

  it.each([NaN, Infinity, -1])('rejects an invalid clock-skew policy %s', maxDriftMs => {
    expect(verifySignedEnvelope(createSignedEnvelope({ ping: true }, keys), { maxDriftMs }).authorized).toBe(false);
  });

  it('rejects malformed capability collections without throwing', () => {
    const envelope = createSignedEnvelope({ ping: true }, keys);
    envelope.identity.capabilities = {} as never;
    expect(() => verifySignedEnvelope(envelope)).not.toThrow();
    expect(verifySignedEnvelope(envelope).authorized).toBe(false);
  });

  it('rejects cyclic payloads without throwing or consuming a nonce', () => {
    const envelope = createSignedEnvelope({ ping: true }, keys) as SovereignSignedEnvelope<any>;
    envelope.payload.self = envelope.payload;
    const nonces = new Set<string>();
    expect(() => verifySignedEnvelope(envelope, { seenNonces: nonces })).not.toThrow();
    expect(nonces.size).toBe(0);
  });

  it('continues to verify a valid legacy canonical signature', () => {
    expect(verifySignedEnvelope(signedTimestamp(Date.now())).authorized).toBe(true);
  });
});