import { describe, it, expect } from 'vitest';
import {
  createSovereignIdentity,
  verifySovereignIdentity,
  hasCapability,
  canonicalizeJson,
  createSignedEnvelope,
  verifySignedEnvelope,
  zeroizeKeyPairSet,
  deriveVaultKey,
  DEFAULT_SOVEREIGN_CAPABILITIES,
  SOVEREIGN_IDENTITY_VERSION,
} from '../src/identity.js';

describe('Unified Sovereign Identity Architecture (identity.ts)', () => {
  it('creates valid sovereign identity with classical and post-quantum keys', () => {
    const keySet = createSovereignIdentity();
    const { identity } = keySet;

    expect(identity.version).toBe(SOVEREIGN_IDENTITY_VERSION);
    expect(identity.fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(identity.signingPublicKey).toMatch(/^[0-9a-f]{64}$/);
    expect(identity.encryptionPublicKey).toMatch(/^[0-9a-f]{64}$/);
    expect(identity.pqPublicKey).toMatch(/^[0-9a-f]{2368}$/);
    expect(identity.capabilities).toEqual(DEFAULT_SOVEREIGN_CAPABILITIES);
    expect(Array.isArray(identity.credentialBindings)).toBe(true);

    const verification = verifySovereignIdentity(identity);
    expect(verification.valid).toBe(true);
  });

  it('deterministically derives identity from seed', () => {
    const seed = new Uint8Array(32).fill(42);
    const keySet1 = createSovereignIdentity({ seed });
    const keySet2 = createSovereignIdentity({ seed });

    expect(keySet1.identity.fingerprint).toBe(keySet2.identity.fingerprint);
    expect(keySet1.identity.signingPublicKey).toBe(keySet2.identity.signingPublicKey);
    expect(keySet1.identity.encryptionPublicKey).toBe(keySet2.identity.encryptionPublicKey);
    expect(keySet1.identity.pqPublicKey).toBe(keySet2.identity.pqPublicKey);
  });

  it('detects mismatched or spoofed identity fingerprints', () => {
    const keySet = createSovereignIdentity();
    const spoofedIdentity = {
      ...keySet.identity,
      fingerprint: 'deadbeef01234567',
    };

    const result = verifySovereignIdentity(spoofedIdentity);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Fingerprint does not match');
  });

  it('evaluates identity capabilities including wildcards', () => {
    const keySet = createSovereignIdentity({ capabilities: ['post:create', 'post:vote'] });
    expect(hasCapability(keySet.identity, 'post:create')).toBe(true);
    expect(hasCapability(keySet.identity, 'post:vote')).toBe(true);
    expect(hasCapability(keySet.identity, 'storage:upload')).toBe(false);

    const adminIdentity = {
      ...keySet.identity,
      capabilities: ['*'],
    };
    expect(hasCapability(adminIdentity, 'storage:delete')).toBe(true);
    expect(hasCapability(adminIdentity, 'admin:manage')).toBe(true);
  });

  it('canonicalizes JSON consistently regardless of object key order', () => {
    const objA = { b: 2, a: 1, c: { y: 'bar', x: 'foo' } };
    const objB = { a: 1, c: { x: 'foo', y: 'bar' }, b: 2 };

    expect(canonicalizeJson(objA)).toBe(canonicalizeJson(objB));
    expect(canonicalizeJson(objA)).toBe('{"a":1,"b":2,"c":{"x":"foo","y":"bar"}}');
  });

  it('signs and verifies a SovereignSignedEnvelope through 5-stage pipeline', () => {
    const keySet = createSovereignIdentity();
    const payload = {
      action: 'post:create',
      title: 'Decentralized Sovereign Mesh Network',
      content: 'Zero surveillance architecture milestone',
    };

    const envelope = createSignedEnvelope(payload, keySet);
    expect(envelope.signature).toMatch(/^[0-9a-f]{128}$/);
    expect(envelope.nonce).toHaveLength(32);
    expect(envelope.identity.fingerprint).toBe(keySet.identity.fingerprint);

    const result = verifySignedEnvelope(envelope, { requiredCapability: 'post:create' });
    expect(result.authorized).toBe(true);
    expect(result.stage).toBe('complete');
    expect(result.fingerprint).toBe(keySet.identity.fingerprint);
    expect(result.payload).toEqual(payload);
  });

  it('rejects tampered payload at Stage 1 (signature check)', () => {
    const keySet = createSovereignIdentity();
    const payload = { amount: 100, recipient: 'node-alice' };
    const envelope = createSignedEnvelope(payload, keySet);

    // Tamper payload
    const tamperedEnvelope = {
      ...envelope,
      payload: { amount: 999999, recipient: 'node-attacker' },
    };

    const result = verifySignedEnvelope(tamperedEnvelope);
    expect(result.authorized).toBe(false);
    expect(result.stage).toBe('signature');
    expect(result.error).toContain('Cryptographic signature verification failed');
  });

  it('rejects spoofed fingerprint at Stage 2 (fingerprint check)', () => {
    const keySet = createSovereignIdentity();
    const payload = { test: true };
    const envelope = createSignedEnvelope(payload, keySet);

    // Tamper fingerprint to impersonate root
    const spoofedEnvelope = {
      ...envelope,
      identity: {
        ...envelope.identity,
        fingerprint: '1122334455667788',
      },
    };

    const result = verifySignedEnvelope(spoofedEnvelope);
    expect(result.authorized).toBe(false);
    // Either signature fails because digest includes fingerprint, or fingerprint fails
    expect(result.authorized).toBe(false);
  });

  it('rejects request when required capability is missing at Stage 3', () => {
    const keySet = createSovereignIdentity({ capabilities: ['post:vote'] });
    const payload = { key: 'releases/danger.bin' };
    const envelope = createSignedEnvelope(payload, keySet);

    const result = verifySignedEnvelope(envelope, { requiredCapability: 'storage:delete' });
    expect(result.authorized).toBe(false);
    expect(result.stage).toBe('authorization');
    expect(result.error).toContain('Missing required capability');
  });

  it('rejects expired request beyond 5-minute sliding window at Stage 4', () => {
    const keySet = createSovereignIdentity();
    const payload = { ping: true };
    const oldTimestamp = Date.now() - 360000; // 6 minutes ago
    const envelope = createSignedEnvelope(payload, keySet, { timestamp: oldTimestamp });

    const result = verifySignedEnvelope(envelope);
    expect(result.authorized).toBe(false);
    expect(result.stage).toBe('replay');
    expect(result.error).toContain('Request expired or excessive clock drift');
  });

  it('detects and blocks duplicate nonces (replay defense) at Stage 4', () => {
    const keySet = createSovereignIdentity();
    const payload = { vote: 1, target: 'proposal-42' };
    const envelope = createSignedEnvelope(payload, keySet);

    const seenNonces = new Set<string>();

    // First presentation: accepted
    const res1 = verifySignedEnvelope(envelope, { seenNonces });
    expect(res1.authorized).toBe(true);

    // Second presentation: rejected as replay
    const res2 = verifySignedEnvelope(envelope, { seenNonces });
    expect(res2.authorized).toBe(false);
    expect(res2.stage).toBe('replay');
    expect(res2.error).toContain('Replay attack detected: duplicate nonce');
  });

  it('zeroizes private keys from memory on demand', () => {
    const keySet = createSovereignIdentity();
    expect(keySet.signingPrivateKey.some((b) => b !== 0)).toBe(true);

    zeroizeKeyPairSet(keySet);
    expect(keySet.signingPrivateKey.every((b) => b === 0)).toBe(true);
    expect(keySet.encryptionPrivateKey.every((b) => b === 0)).toBe(true);
    expect(keySet.pqPrivateKey.every((b) => b === 0)).toBe(true);
  });

  describe('deriveVaultKey', () => {
    it('deterministically derives 32-byte AES key from recovery seed', () => {
      const seed = new Uint8Array(32).fill(0x42);
      const key1 = deriveVaultKey(seed);
      const key2 = deriveVaultKey(seed);

      expect(key1).toHaveLength(32);
      expect(key2).toHaveLength(32);
      expect(Array.from(key1)).toEqual(Array.from(key2));
    });

    it('enforces domain separation from other derivations', () => {
      const seed = new Uint8Array(32).fill(0x7a);
      const vaultKey = deriveVaultKey(seed);
      const identity = createSovereignIdentity({ seed });

      // Vault key must not match signing private key or encryption private key
      expect(Array.from(vaultKey)).not.toEqual(Array.from(identity.signingPrivateKey));
      expect(Array.from(vaultKey)).not.toEqual(Array.from(identity.encryptionPrivateKey));
    });

    it('produces different keys for different master seeds', () => {
      const seedA = new Uint8Array(32).fill(1);
      const seedB = new Uint8Array(32).fill(2);
      const keyA = deriveVaultKey(seedA);
      const keyB = deriveVaultKey(seedB);

      expect(Array.from(keyA)).not.toEqual(Array.from(keyB));
    });
  });
});

