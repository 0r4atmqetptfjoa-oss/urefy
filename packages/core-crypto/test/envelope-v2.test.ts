import { describe, expect, it } from 'vitest';
import { createSignedEnvelope, createSovereignIdentity, verifySignedEnvelope, type SovereignIdentity } from '../src/identity.js';
import { verifyStoredSignedEnvelope } from '../src/direct-message.js';

describe('Versioned identity-bound signatures', () => {
  it('enforces v2 when the verifier requires full identity binding', () => {
    const keys = createSovereignIdentity();
    expect(verifySignedEnvelope(createSignedEnvelope({}, keys), { requireIdentityBinding: true }).authorized).toBe(false);
    expect(verifySignedEnvelope(createSignedEnvelope({}, keys, { version: 2 }), { requireIdentityBinding: true }).authorized).toBe(true);
  });

  it('keeps v1 as the default and accepts v2 explicitly', () => {
    const keys = createSovereignIdentity();
    const legacy = createSignedEnvelope({ action: 'test' }, keys);
    expect(legacy.version).toBeUndefined();
    expect(verifySignedEnvelope(legacy).identityBinding).toBe('signing-key');
    const bound = createSignedEnvelope({ action: 'test' }, keys, { version: 2 });
    expect(verifySignedEnvelope(JSON.parse(JSON.stringify(bound))).identityBinding).toBe('full');
    expect(verifyStoredSignedEnvelope(bound)).toBe(true);
  });

  it.each(['encryptionPublicKey', 'pqPublicKey', 'createdAt', 'credentialBindings'] as const)('binds identity field %s', field => {
    const keys = createSovereignIdentity();
    const envelope = createSignedEnvelope({ action: 'test' }, keys, { version: 2 });
    const alternate = createSovereignIdentity().identity;
    const replacement = field === 'createdAt' ? envelope.identity.createdAt + 1
      : field === 'credentialBindings' ? [{ type: 'passkey', id: 'unverified-claim', algorithm: 'ES256', boundAt: Date.now() }]
      : alternate[field];
    envelope.identity = { ...envelope.identity, [field]: replacement } as SovereignIdentity;
    expect(verifySignedEnvelope(envelope).authorized).toBe(false);
    expect(verifyStoredSignedEnvelope(envelope)).toBe(false);
  });

  it('rejects stripping or changing the version of a v2 signature', () => {
    const envelope = createSignedEnvelope({ action: 'test' }, createSovereignIdentity(), { version: 2 });
    for (const version of [undefined, 1, 3] as const) {
      expect(verifySignedEnvelope({ ...envelope, version } as never).authorized).toBe(false);
      expect(verifyStoredSignedEnvelope({ ...envelope, version } as never)).toBe(false);
    }
  });

  it('snapshots payloads and metadata before returning a signed object', () => {
    const keys = createSovereignIdentity();
    const payload = { nested: { value: 'signed' } };
    const envelope = createSignedEnvelope(payload, keys, { version: 2 });
    payload.nested.value = 'changed';
    keys.identity.capabilities.push('unverified:claim');
    expect(envelope.payload.nested.value).toBe('signed');
    expect(envelope.identity.capabilities).not.toContain('unverified:claim');
    expect(verifySignedEnvelope(envelope).authorized).toBe(true);
  });

  it('refuses signing invalid metadata or a mismatched private key', () => {
    const keys = createSovereignIdentity();
    expect(() => createSignedEnvelope({}, keys, { timestamp: NaN })).toThrow('timestamp');
    expect(() => createSignedEnvelope({}, keys, { nonce: '' })).toThrow('nonce');
    expect(() => createSignedEnvelope({}, { ...keys, signingPrivateKey: createSovereignIdentity().signingPrivateKey })).toThrow('does not match');
  });

  it('refuses accidental private material in the public identity descriptor', () => {
    const keys = createSovereignIdentity();
    const contaminated = { ...keys, identity: { ...keys.identity, privateKeyHex: 'not-public' } };
    expect(() => createSignedEnvelope({}, contaminated)).toThrow('Invalid signing identity');
  });
});