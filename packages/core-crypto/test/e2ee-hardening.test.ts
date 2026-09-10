import { afterEach, describe, expect, it, vi } from 'vitest';
import { E2EEEngine } from '../src/e2ee.js';

afterEach(() => vi.restoreAllMocks());

describe('AES-256-GCM boundary and authenticated context', () => {
  it('decrypts the NIST AES-256-GCM zero-key vector without changing the legacy format', async () => {
    const result = await E2EEEngine.decrypt({
      iv: '00'.repeat(12), epoch: 0, fingerprint: '',
      ciphertext: 'cea7403d4d606b6e074ec5d3baf39d18d0d1c8a799996bf0265b98b5d48ab919',
    }, new Uint8Array(32));
    expect(result).toBe('\0'.repeat(16));
  });

  it('keeps legacy encrypt/decrypt interoperable', async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const encrypted = await E2EEEngine.encrypt('legacy message', key, 4, 'sender');
    expect(encrypted.version).toBeUndefined();
    expect(await E2EEEngine.decrypt(encrypted, key)).toBe('legacy message');
    const second = await E2EEEngine.encrypt('legacy message', key);
    expect(second.iv).not.toBe(encrypted.iv);
  });

  it('authenticates the supplied context, epoch and fingerprint in v2', async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const encrypted = await E2EEEngine.encrypt('bound message', key, 7, 'sender', 'conversation:message-id');
    expect(encrypted.version).toBe(2);
    expect(await E2EEEngine.decrypt(encrypted, key, 'conversation:message-id')).toBe('bound message');
    await expect(E2EEEngine.decrypt(encrypted, key, 'other-conversation:message-id')).rejects.toThrow();
    await expect(E2EEEngine.decrypt({ ...encrypted, epoch: 8 }, key, 'conversation:message-id')).rejects.toThrow();
    await expect(E2EEEngine.decrypt({ ...encrypted, fingerprint: 'other' }, key, 'conversation:message-id')).rejects.toThrow();
    await expect(E2EEEngine.decrypt({ ...encrypted, version: undefined }, key, 'conversation:message-id')).rejects.toThrow('downgrade');
    await expect(E2EEEngine.decrypt({ ...encrypted, version: undefined }, key)).rejects.toThrow();
    await expect(E2EEEngine.decrypt(encrypted, key)).rejects.toThrow('context');
  });

  it.each([0, 16, 24, 31, 33])('does not silently accept a %s-byte AES key', async length => {
    await expect(E2EEEngine.encrypt('data', new Uint8Array(length))).rejects.toThrow('32-byte key');
  });

  it('rejects a truncated tag and a non-standard IV before decryption', async () => {
    const key = new Uint8Array(32);
    await expect(E2EEEngine.decrypt({ iv: '00'.repeat(12), ciphertext: '00'.repeat(15), epoch: 0, fingerprint: '' }, key)).rejects.toThrow('encoding');
    await expect(E2EEEngine.decrypt({ iv: '00'.repeat(16), ciphertext: '00'.repeat(16), epoch: 0, fingerprint: '' }, key)).rejects.toThrow('encoding');
  });

  it('wipes the owned decrypted buffer after decoding', async () => {
    const plaintext = new TextEncoder().encode('temporary plaintext');
    vi.spyOn(crypto.subtle, 'decrypt').mockResolvedValue(plaintext.buffer);
    expect(await E2EEEngine.decrypt({ iv: '00'.repeat(12), ciphertext: '00'.repeat(16), epoch: 0, fingerprint: '' }, new Uint8Array(32)))
      .toBe('temporary plaintext');
    expect(plaintext.every(byte => byte === 0)).toBe(true);
  });

  it('returns ratchet keys in independent buffers without modifying the root key', () => {
    const root = new Uint8Array(32).fill(7);
    const result = E2EEEngine.deriveNextKey(root);
    expect(result.nextKey.buffer).not.toBe(result.messageKey.buffer);
    expect(result.nextKey.buffer.byteLength).toBe(32);
    expect(result.messageKey.buffer.byteLength).toBe(32);
    expect(root.every(byte => byte === 7)).toBe(true);
  });
});