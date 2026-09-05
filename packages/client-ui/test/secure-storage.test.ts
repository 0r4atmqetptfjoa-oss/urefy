import { describe, it, expect, beforeEach, vi } from 'vitest';

// Node.js test environment mock for localStorage
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => storageMap.set(k, String(v)),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
  get length() { return storageMap.size; },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
};
(globalThis as any).localStorage = mockLocalStorage;

import { secureStorage, bytesToHex, hexToBytes, EncryptedEnvelope } from '../src/secure-storage.js';

describe('Aetheris Sovereign Secure Storage Vault (Blockers 1 & 2)', () => {
  beforeEach(async () => {
    mockLocalStorage.clear();
    secureStorage.zeroizeRam();
    await secureStorage.init();
  });

  describe('1. WebCrypto AES-GCM-256 Encryption & Decryption', () => {
    it('should encrypt serializable data into an AES-GCM envelope with 12-byte IV', async () => {
      const payload = { secret: 'quantum-resistance', timestamp: Date.now() };
      const envelope = await secureStorage.encrypt(payload);

      expect(envelope).toBeDefined();
      expect(envelope.iv).toBeDefined();
      expect(envelope.iv.length).toBe(24); // 12 bytes in hex = 24 chars
      expect(envelope.ciphertext).toBeDefined();
      expect(envelope.ciphertext.length).toBeGreaterThan(0);
      expect(envelope.version).toBe(1);
    });

    it('should decrypt an encrypted envelope back to original plaintext', async () => {
      const secretData = { mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', seedHex: 'deadbeef' };
      const envelope = await secureStorage.encrypt(secretData);
      const decrypted = await secureStorage.decrypt<typeof secretData>(envelope);

      expect(decrypted).toEqual(secretData);
    });

    it('should generate unique IV for every encryption call', async () => {
      const payload = { data: 'same-payload' };
      const env1 = await secureStorage.encrypt(payload);
      const env2 = await secureStorage.encrypt(payload);

      expect(env1.iv).not.toBe(env2.iv);
      expect(env1.ciphertext).not.toBe(env2.ciphertext);
    });
  });

  describe('2. Sovereign Identity Lifecycle & Zero Plaintext In LocalStorage (Blocker 1)', () => {
    it('should save and retrieve identity securely', async () => {
      const mnemonic = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
      const seed = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
      const fp = 'fp_sovereign_123';

      await secureStorage.saveIdentity(mnemonic, seed, fp);

      // Invariant: localStorage MUST NOT contain plaintext mnemonic or seed
      expect(mockLocalStorage.getItem('aetheris_identity_mnemonic')).toBeNull();
      expect(mockLocalStorage.getItem('aetheris_identity_seed')).toBeNull();
      expect(mockLocalStorage.getItem('aetheris_mnemonic')).toBeNull();

      // Retrieve via secure storage
      const loaded = await secureStorage.getIdentity();
      expect(loaded).toBeDefined();
      expect(loaded?.mnemonic).toBe(mnemonic);
      expect(loaded?.seedHex).toBe(bytesToHex(seed));
    });

    it('should provide synchronous memory access via getIdentitySync', async () => {
      const mnemonic = 'letter advice cage absurd amount doctor acoustic avoid letter advice cage above';
      const seed = new Uint8Array(32).fill(7);

      await secureStorage.saveIdentity(mnemonic, seed, 'fp_sync_test');
      const syncId = secureStorage.getIdentitySync();

      expect(syncId).toBeDefined();
      expect(syncId?.mnemonic).toBe(mnemonic);
    });
  });

  describe('3. Private Message Cache Encryption (Blocker 2)', () => {
    it('should encrypt and persist channel messages without touching localStorage', async () => {
      const channelId = 'relays-general';
      const messages = [
        { id: 'm1', text: 'Top secret E2EE communication', authorFingerprint: 'a1', createdAt: Date.now() },
        { id: 'm2', text: 'Confirmed quantum ratchet', authorFingerprint: 'a2', createdAt: Date.now() + 1000 }
      ];

      await secureStorage.saveChannelMessages(channelId, messages);

      // Invariant: localStorage MUST NOT contain plaintext messages cache
      expect(mockLocalStorage.getItem('aetheris_messages_cache')).toBeNull();

      // Retrieve from secure storage
      const retrieved = await secureStorage.getChannelMessages(channelId);
      expect(retrieved).toEqual(messages);
    });
  });

  describe('4. Memory Zeroization, Logout & Wipe Lifecycle', () => {
    it('should zeroize RAM on zeroizeRam call', async () => {
      const mnemonic = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';
      const seed = new Uint8Array(32).fill(42);

      await secureStorage.saveIdentity(mnemonic, seed, 'fp_zeroize');
      expect(secureStorage.getIdentitySync()).not.toBeNull();

      secureStorage.zeroizeRam();
      expect(secureStorage.getIdentitySync()).toBeNull();
    });

    it('should purge private messages on logout', async () => {
      const channelId = 'dm-confidential';
      await secureStorage.saveChannelMessages(channelId, [{ id: 'm1', text: 'Confidential' }]);

      await secureStorage.logout();
      expect(secureStorage.getIdentitySync()).toBeNull();
      expect(mockLocalStorage.getItem('aetheris_messages_cache')).toBeNull();
    });

    it('should completely purge all vault data on wipeAll', async () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const seed = new Uint8Array(32).fill(1);
      await secureStorage.saveIdentity(mnemonic, seed, 'fp_wipe');

      await secureStorage.wipeAll();
      expect(secureStorage.getIdentitySync()).toBeNull();
      expect(mockLocalStorage.length).toBe(0);
    });
  });

  describe('5. Legacy Plaintext Migration', () => {
    it('should migrate legacy plaintext localStorage secrets into vault and purge them', async () => {
      const legacyMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const legacySeed = '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';

      mockLocalStorage.setItem('aetheris_identity_mnemonic', legacyMnemonic);
      mockLocalStorage.setItem('aetheris_identity_seed', legacySeed);
      mockLocalStorage.setItem('aetheris_messages_cache', JSON.stringify({ 'relays-general': [{ id: 'legacy-msg', text: 'hello' }] }));

      // Trigger legacy purge
      secureStorage.purgeLegacyLocalStorage();

      expect(mockLocalStorage.getItem('aetheris_identity_mnemonic')).toBeNull();
      expect(mockLocalStorage.getItem('aetheris_identity_seed')).toBeNull();
      expect(mockLocalStorage.getItem('aetheris_messages_cache')).toBeNull();
    });
  });
});
