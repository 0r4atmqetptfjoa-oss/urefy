import { describe, expect, it } from 'vitest';
import { createSignedEnvelope, createSovereignIdentity } from '../src/identity.js';
import { decryptDirectMessage, encryptDirectMessage, MAX_DIRECT_MESSAGE_BYTES, validateDirectMessageFrame, verifyDirectMessageRegistration } from '../src/direct-message.js';

describe('Authenticated hybrid direct messages', () => {
  it('allows only the sender and recipient to decrypt the signed message', async () => {
    const sender = createSovereignIdentity();
    const recipient = createSovereignIdentity();
    const outsider = createSovereignIdentity();
    const body = { text: 'Private message \u{1f44b}', attachment: null };
    const envelope = await encryptDirectMessage(body, sender, recipient.identity);
    expect(validateDirectMessageFrame(envelope.payload.message)).toBe(true);
    expect(JSON.stringify(envelope)).not.toContain(body.text);
    expect(await decryptDirectMessage(envelope, recipient)).toEqual(body);
    expect(await decryptDirectMessage(envelope, sender)).toEqual(body);
    await expect(decryptDirectMessage(envelope, outsider)).rejects.toThrow('not a participant');
  });

  it('rejects modified ciphertext and sender metadata before decryption', async () => {
    const sender = createSovereignIdentity();
    const recipient = createSovereignIdentity();
    const envelope = await encryptDirectMessage({ text: 'Private' }, sender, recipient.identity);
    const modified = structuredClone(envelope);
    const ciphertext = modified.payload.message.recipientCopy.ciphertext;
    modified.payload.message.recipientCopy.ciphertext = (ciphertext[0] === '0' ? '1' : '0') + ciphertext.slice(1);
    await expect(decryptDirectMessage(modified, recipient)).rejects.toThrow();
    const impersonated = structuredClone(envelope);
    impersonated.payload.message.senderPublicKey = recipient.identity.signingPublicKey;
    await expect(decryptDirectMessage(impersonated, recipient)).rejects.toThrow();
  });

  it('binds encryption keys into signed identity registration payloads', () => {
    const owner = createSovereignIdentity();
    const registration = createSignedEnvelope({ action: 'register' as const, identity: owner.identity }, owner);
    expect(verifyDirectMessageRegistration(registration, owner.identity.fingerprint)).toBe(true);
    const modified = structuredClone(registration);
    modified.identity.encryptionPublicKey = '01'.repeat(32);
    expect(verifyDirectMessageRegistration(modified, owner.identity.fingerprint)).toBe(false);
  });

  it('rejects oversized messages before encrypting', async () => {
    const owner = createSovereignIdentity();
    await expect(encryptDirectMessage({ text: 'x'.repeat(MAX_DIRECT_MESSAGE_BYTES) }, owner, owner.identity)).rejects.toThrow('size limit');
  });
});