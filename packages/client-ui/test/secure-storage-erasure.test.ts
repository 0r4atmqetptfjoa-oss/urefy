import { describe, it, expect, beforeEach, vi } from 'vitest';

// Node test environment mock for localStorage
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

import { SecureStorageEngine, secureStorage } from '../src/secure-storage.js';

describe('Area 5: Secure Key Erasure, Zeroization & Identity Lifecycle', () => {
  beforeEach(async () => {
    mockLocalStorage.clear();
    secureStorage.zeroizeRam();
    await secureStorage.init();
  });

  it('zeroizeRam deep-zeroizes all Uint8Array buffers inside sovereignIdentity and volatile messages', async () => {
    const mnemonic = 'apple banana cherry date elderberry fig grape hazelnut iris jungle kiwi lemon';
    const seed = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const secretKeyBuf = new Uint8Array([42, 42, 42, 42, 42, 42, 42, 42]);
    const messagePayloadBuf = new Uint8Array([99, 98, 97, 96]);

    const complexIdentity = {
      nested: {
        signingKey: secretKeyBuf,
        subKey: new Uint8Array([10, 20, 30, 40]),
      },
      publicKeyHex: 'abcd1234',
    };

    await secureStorage.saveIdentity(mnemonic, seed, 'fp_deep_test', complexIdentity);
    await secureStorage.saveChannelMessages('ch-secret', [
      { id: 'm1', rawBuffer: messagePayloadBuf },
    ]);

    expect(secureStorage.getIdentitySync()).not.toBeNull();
    expect(secureStorage.isLocked()).toBe(false);

    // Trigger zeroizeRam
    secureStorage.zeroizeRam();

    // 1. Vault is locked and sync identity is null
    expect(secureStorage.getIdentitySync()).toBeNull();
    expect(secureStorage.isLocked()).toBe(true);

    // 2. Underlying Uint8Array buffers inside sovereignIdentity were overwritten with zeroes (0x00)
    expect(Array.from(secretKeyBuf).every((b) => b === 0)).toBe(true);
    expect(Array.from(complexIdentity.nested.subKey).every((b) => b === 0)).toBe(true);

    // 3. Volatile message buffer was also zeroized
    expect(Array.from(messagePayloadBuf).every((b) => b === 0)).toBe(true);
  });

  it('logout({ clearIdentity: true }) prevents secret rehydration from storage', async () => {
    const mnemonic = 'ocean river lake pond stream waterfall spring lagoon brook creek estuary basin';
    const seed = new Uint8Array(32).fill(88);
    const fp = 'fp_no_rehydrate';

    await secureStorage.saveIdentity(mnemonic, seed, fp);
    expect(await secureStorage.getIdentity()).not.toBeNull();

    // Perform full logout with clearIdentity: true
    await secureStorage.logout({ clearIdentity: true });

    // Both synchronous and asynchronous getters must return null (no silent rehydration!)
    expect(secureStorage.getIdentitySync()).toBeNull();
    const rehydrated = await secureStorage.getIdentity();
    expect(rehydrated).toBeNull();
  });

  it('logout({ clearIdentity: false }) clears RAM while preserving encrypted vault', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const seed = new Uint8Array(32).fill(11);
    const fp = 'fp_preserve_vault';

    await secureStorage.saveIdentity(mnemonic, seed, fp);

    // Normal logout (e.g. screen lock / session timeout)
    await secureStorage.logout({ clearIdentity: false });

    // Volatile RAM is zeroized
    expect(secureStorage.getIdentitySync()).toBeNull();

    // But identity can be re-loaded from the encrypted vault
    const loaded = await secureStorage.getIdentity();
    expect(loaded).not.toBeNull();
    expect(loaded?.fingerprint).toBe(fp);
  });

  it('switchAccount completely purges Account A secrets from RAM and storage before saving Account B', async () => {
    const accA_mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const accA_seed = new Uint8Array(32).fill(1);
    const accA_keyBuf = new Uint8Array([111, 111, 111, 111]);
    const accA_fp = 'fp_account_a';

    await secureStorage.saveIdentity(accA_mnemonic, accA_seed, accA_fp, { key: accA_keyBuf });
    await secureStorage.saveChannelMessages('ch-private-a', [{ text: 'Account A confidential' }]);

    // Switch to Account B
    const accB_mnemonic = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
    const accB_seed = new Uint8Array(32).fill(2);
    const accB_fp = 'fp_account_b';

    await secureStorage.switchAccount(accB_mnemonic, accB_seed, accB_fp);

    // 1. Account A's in-memory key buffer was zeroized
    expect(Array.from(accA_keyBuf).every((b) => b === 0)).toBe(true);

    // 2. Active identity is strictly Account B
    const active = secureStorage.getIdentitySync();
    expect(active?.fingerprint).toBe(accB_fp);
    expect(active?.mnemonic).toBe(accB_mnemonic);

    // 3. Old channel messages from Account A were cleared
    const chMessages = await secureStorage.getChannelMessages('ch-private-a');
    expect(chMessages.length).toBe(0);
  });

  it('handles simulated crash and recovery gracefully without leaking plaintext to localStorage', async () => {
    const mnemonic = 'letter advice cage absurd amount doctor acoustic avoid letter advice cage above';
    const seed = new Uint8Array(32).fill(77);
    const fp = 'fp_crash_test';

    await secureStorage.saveIdentity(mnemonic, seed, fp);

    // Simulate process crash / ungraceful shutdown: all RAM is lost
    secureStorage.zeroizeRam();

    // Verify localStorage NEVER contained plaintext during the crash
    expect(mockLocalStorage.getItem('aetheris_identity_mnemonic')).toBeNull();
    expect(mockLocalStorage.getItem('aetheris_identity_seed')).toBeNull();
    expect(mockLocalStorage.getItem('aetheris_messages_cache')).toBeNull();

    // On reboot: client re-initializes engine
    await secureStorage.init();
    const restored = await secureStorage.getIdentity();
    expect(restored?.fingerprint).toBe(fp);
    expect(restored?.mnemonic).toBe(mnemonic);
  });

  it('handles environment fallback when IndexedDB is blocked (Safari / WebKit private mode)', async () => {
    const fallbackEngine = new SecureStorageEngine();
    // Simulate Safari private browsing throwing SecurityError on indexedDB.open
    vi.spyOn(fallbackEngine as any, 'openDatabase').mockRejectedValue(
      new Error('SecurityError: The operation is insecure')
    );

    // Engine should not crash, but fallback gracefully to memory vault
    await fallbackEngine.init();

    const mnemonic = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';
    const seed = new Uint8Array(32).fill(99);

    await fallbackEngine.saveIdentity(mnemonic, seed, 'fp_safari_private');
    const id = await fallbackEngine.getIdentity();
    expect(id?.fingerprint).toBe('fp_safari_private');

    // Memory zeroization works even in fallback mode
    fallbackEngine.zeroizeRam();
    expect(fallbackEngine.getIdentitySync()).toBeNull();
  });
});
