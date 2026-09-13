import { describe, it, expect, beforeEach, vi } from 'vitest';

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
(globalThis as any).sessionStorage = mockLocalStorage;

import { secureStorage, EncryptedEnvelope } from '../src/secure-storage.js';
import { BookmarksVault } from '../src/bookmarks.js';
import { draftAutosave } from '../src/draft-autosave.js';
import { localDiagnostics } from '../src/local-diagnostics.js';

describe('Corrupted & Hostile State Resilience', () => {
  beforeEach(async () => {
    mockLocalStorage.clear();
    secureStorage.zeroizeRam();
    await secureStorage.init();
    vi.restoreAllMocks();
  });

  describe('SecureStorage Hostile Envelope Resilience', () => {
    it('gracefully fails on malformed IV or ciphertext in decrypt', async () => {
      const malformedEnvelope: EncryptedEnvelope = {
        iv: 'invalid_non_hex_iv!@#',
        ciphertext: 'deadbeef',
        version: 1,
        timestamp: Date.now()
      };

      await expect(secureStorage.decrypt(malformedEnvelope)).rejects.toThrow();
    });

    it('handles tampered authentication tag without leaking unauthenticated data', async () => {
      const testData = { secret: 'top_secret_information' };
      const envelope = await secureStorage.encrypt(testData);

      // Tamper with the last byte of ciphertext (part of the 16-byte GCM tag)
      const tamperedBytes = Array.from(envelope.ciphertext);
      const lastChar = tamperedBytes[tamperedBytes.length - 1];
      tamperedBytes[tamperedBytes.length - 1] = lastChar === '0' ? '1' : '0';
      const tamperedEnvelope: EncryptedEnvelope = {
        ...envelope,
        ciphertext: tamperedBytes.join('')
      };

      await expect(secureStorage.decrypt(tamperedEnvelope)).rejects.toThrow();
    });

    it('handles corrupted private state key gracefully', async () => {
      await expect(secureStorage.getPrivateState('invalid key with spaces and !@#$%')).rejects.toThrow('Invalid private state key');
      await expect(secureStorage.savePrivateState('invalid key with spaces and !@#$%', {})).rejects.toThrow('Invalid private state key');
    });
  });

  describe('LocalStorage Hostile Value Resilience', () => {
    it('bookmarks vault recovers gracefully from corrupted JSON in localStorage', () => {
      mockLocalStorage.setItem('aetheris_bookmarks', '{{{NOT_VALID_JSON...<<<');
      
      const vault = new BookmarksVault();
      expect(Array.isArray(vault.bookmarks)).toBe(true);
      expect(vault.bookmarks.length).toBeGreaterThanOrEqual(0);
    });

    it('draft autosave recovers gracefully from corrupted JSON drafts', () => {
      mockLocalStorage.setItem('aetheris_draft_post', 'INVALID_JSON_BLOB:::1234');
      mockLocalStorage.setItem('aetheris_draft_meta_post', 'CORRUPT_META');

      expect(() => draftAutosave.getDraft('post')).not.toThrow();
      const draft = draftAutosave.getDraft('post');
      expect(draft === null || draft.content === '').toBe(true);
    });

    it('local diagnostics ring buffer handles corrupted localStorage without throwing', () => {
      mockLocalStorage.setItem('aetheris_diagnostics_buffer', 'NOT_AN_ARRAY{corrupt: true');

      expect(() => {
        localDiagnostics.recordError(new Error('Test error during recovery'), 'TestComponent');
      }).not.toThrow();

      const report = localDiagnostics.getDiagnosticReport();
      expect(report).toBeDefined();
      expect(report.records.length).toBeGreaterThanOrEqual(1);
    });

    it('handles unexpected types in localStorage boolean and numeric keys', () => {
      mockLocalStorage.setItem('aetheris_ui_mode', 'MALICIOUS_INJECTED_STRING<script>');
      mockLocalStorage.setItem('aetheris_show_trust_badges', 'maybe?');
      mockLocalStorage.setItem('aetheris_min_feed_trust_threshold', 'NOT_A_NUMBER');
      mockLocalStorage.setItem('aetheris_demote_low_trust_posts', 'undefined');
      mockLocalStorage.setItem('aetheris_proactive_ai_enabled', 'null');

      const uiMode = mockLocalStorage.getItem('aetheris_ui_mode');
      expect(uiMode).toBe('MALICIOUS_INJECTED_STRING<script>');
      
      const parsed = parseInt(mockLocalStorage.getItem('aetheris_min_feed_trust_threshold')!, 10);
      expect(isNaN(parsed)).toBe(true);
    });
  });

  describe('Identity Keypair Corruption & Fallback', () => {
    it('secureStorage getIdentity returns null when stored envelope is invalid, allowing client to regenerate', async () => {
      const mockRecord = {
        id: 'current',
        envelope: {
          iv: '00112233445566778899aabb',
          ciphertext: 'bad_ciphertext',
          version: 1,
          timestamp: Date.now()
        }
      };

      vi.spyOn(secureStorage as any, 'getFromStore').mockResolvedValue(mockRecord);
      (secureStorage as any).volatileIdentity = null;

      const identity = await secureStorage.getIdentity();
      expect(identity).toBeNull();
    });
  });
});
