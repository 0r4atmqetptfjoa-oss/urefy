import { describe, expect, it } from 'vitest';
import { createSovereignIdentity, generateMnemonic, mnemonicToSeed, verifySignedEnvelope } from '@aetheris/core-crypto';
import { clientStore } from '../src/client-state.js';

describe('Identity recovery updates the API signer', () => {
  it('signs requests as the restored identity, not the previous account', () => {
    const phrase = generateMnemonic(128);
    const expected = createSovereignIdentity({ seed: mnemonicToSeed(phrase).subarray(0, 32) });
    expect(clientStore.restoreIdentityFromMnemonic(phrase)).toBe(true);
    const envelope = clientStore.createSignedEnvelope({ action: 'recovery-check' });
    expect(envelope.identity.fingerprint).toBe(expected.identity.fingerprint);
    expect(verifySignedEnvelope(envelope).authorized).toBe(true);
  });
});
