/**
 * @file data-archive.test.ts
 * @package @aetheris/client-ui
 * @description Comprehensive unit and integration test suite for Sovereign Data Archive
 * (Item 16 roadmap: 1-click password-protected AES-256-GCM export and import).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  exportSovereignArchive,
  importSovereignArchive,
  downloadArchiveFile,
  deriveArchiveKey,
  ARCHIVE_MAGIC,
  MAGIC_LENGTH,
  SALT_LENGTH,
  IV_LENGTH,
  TAG_LENGTH,
  HEADER_LENGTH,
} from '../src/data-archive.js';
import { clientStore, ClientPost, ClientMessage } from '../src/client-state.js';
import { bookmarksVault, BookmarkEntry } from '../src/bookmarks.js';
import { themeEngine } from '../src/themes.js';
import { sovereignArchiveModal, calculatePasswordStrength } from '../src/archive-modal.js';
import { generateMnemonic } from '@aetheris/core-crypto';

describe('Sovereign Data Archive Engine (AES-256-GCM)', () => {
  const TEST_PASSPHRASE = 'Hardened-Sovereign-Passphrase-2026!';
  const WRONG_PASSPHRASE = 'Incorrect-Passphrase-9999!';

  beforeEach(() => {
    // Ensure clean known identity and store state before each test
    clientStore.mnemonic = generateMnemonic(128);
    clientStore.restoreIdentityFromMnemonic(clientStore.mnemonic);

    // Seed test posts
    clientStore.posts = [
      {
        id: 'post-user-archive-01',
        channelId: 'relays-general',
        authorFingerprint: clientStore.keypair.fingerprint,
        authorRole: 'MEMBER',
        title: 'Zero-Knowledge Archive Verification Standard',
        content: 'Self-custody of sovereign encrypted backups ensures protocol resilience.',
        flair: 'TECH DISCUSSION',
        meritVotes: 42,
        userVoted: 1,
        replyCount: 3,
        boostCount: 12,
        createdAt: 1700000000000,
        isExpanded: false,
      },
      {
        id: 'post-user-archive-02',
        channelId: 'vault-releases',
        authorFingerprint: clientStore.keypair.fingerprint,
        authorRole: 'MEMBER',
        title: 'Micro-Broadcast Protocol Whitepaper Release',
        content: 'Full reproducible binaries and Merkle tree leaves.',
        flair: 'VERIFIED RELEASE',
        meritVotes: 98,
        userVoted: 1,
        replyCount: 5,
        boostCount: 24,
        createdAt: 1700000005000,
        isExpanded: false,
      },
    ];

    // Seed test bookmarks
    bookmarksVault.bookmarks = [
      {
        id: 'bm-test-01',
        postId: 'post-user-archive-01',
        postTitle: 'Zero-Knowledge Archive Verification Standard',
        postAuthor: clientStore.keypair.fingerprint,
        channelId: 'relays-general',
        savedAt: 1700000001000,
        tags: ['cryptography', 'security'],
        note: 'Important reference for decentralized archival recovery.',
      },
    ];

    // Seed test messages
    const msgs: ClientMessage[] = [
      {
        id: 'msg-test-01',
        channelId: 'relays-general',
        authorFingerprint: clientStore.keypair.fingerprint,
        text: 'Initial sovereign handshake message.',
        epoch: '#1',
        status: 'verified',
        createdAt: 1700000002000,
        isMine: true,
      },
    ];
    clientStore.messages = new Map([['relays-general', msgs]]);

    // Seed preferences
    clientStore.density = 'compact';
    if (themeEngine) {
      themeEngine.setTheme('obsidian-cyber');
    }
  });

  describe('1. Cryptographic Key Derivation & Protocol Constants', () => {
    it('should define correct protocol envelope constants', () => {
      expect(ARCHIVE_MAGIC).toBe('AETH_VAULT_V1');
      expect(MAGIC_LENGTH).toBe(13);
      expect(SALT_LENGTH).toBe(16);
      expect(IV_LENGTH).toBe(12);
      expect(TAG_LENGTH).toBe(16);
      expect(HEADER_LENGTH).toBe(41); // 13 + 16 + 12
    });

    it('should derive a 256-bit AES-GCM key from passphrase and 16-byte salt', async () => {
      const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
      const key = await deriveArchiveKey(TEST_PASSPHRASE, salt);

      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
      expect((key.algorithm as any).length).toBe(256);
      expect(key.usages).toContain('encrypt');
      expect(key.usages).toContain('decrypt');
    });
  });

  describe('2. Archive Export Engine', () => {
    it('should export sovereign archive as an encrypted Blob with application/octet-stream MIME type', async () => {
      const blob = await exportSovereignArchive(TEST_PASSPHRASE);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/octet-stream');
      expect(blob.size).toBeGreaterThan(HEADER_LENGTH + TAG_LENGTH);
    });

    it('should structure binary envelope with magic bytes, 16-byte salt, 12-byte IV, and ciphertext with tag', async () => {
      const blob = await exportSovereignArchive(TEST_PASSPHRASE);
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Verify minimum length
      expect(bytes.length).toBeGreaterThanOrEqual(HEADER_LENGTH + TAG_LENGTH);

      // Verify Magic Header (13 bytes)
      const magicSlice = bytes.subarray(0, MAGIC_LENGTH);
      const magicStr = new TextDecoder().decode(magicSlice);
      expect(magicStr).toBe(ARCHIVE_MAGIC);

      // Verify Salt Length (16 bytes)
      const saltSlice = bytes.subarray(MAGIC_LENGTH, MAGIC_LENGTH + SALT_LENGTH);
      expect(saltSlice.length).toBe(16);

      // Verify IV Length (12 bytes)
      const ivSlice = bytes.subarray(MAGIC_LENGTH + SALT_LENGTH, HEADER_LENGTH);
      expect(ivSlice.length).toBe(12);

      // Verify Ciphertext presence with 16-byte GCM Tag
      const ciphertextSlice = bytes.subarray(HEADER_LENGTH);
      expect(ciphertextSlice.length).toBeGreaterThanOrEqual(16);
    });

    it('should reject export if passphrase is empty or invalid', async () => {
      await expect(exportSovereignArchive('')).rejects.toThrow(
        'A secure passphrase is required to export your sovereign archive'
      );
      await expect(exportSovereignArchive('   ')).rejects.toThrow(
        'A secure passphrase is required to export your sovereign archive'
      );
    });

    it('should execute downloadArchiveFile without throwing in non-browser or mock environments', () => {
      const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' });
      expect(() => downloadArchiveFile(blob, 'test-archive.aeth')).not.toThrow();
    });
  });

  describe('3. Archive Import & Cryptographic Decryption', () => {
    it('should successfully decrypt and rehydrate platform state with the correct passphrase', async () => {
      const originalMnemonic = clientStore.mnemonic;
      const originalFingerprint = clientStore.keypair.fingerprint;

      // Export state
      const blob = await exportSovereignArchive(TEST_PASSPHRASE);
      const buffer = await blob.arrayBuffer();

      // Mutate current store to verify rehydration
      clientStore.posts = [];
      bookmarksVault.bookmarks = [];
      clientStore.messages.clear();

      // Generate temporary random identity
      const tempMnemonic = generateMnemonic(128);
      clientStore.restoreIdentityFromMnemonic(tempMnemonic);
      expect(clientStore.mnemonic).not.toBe(originalMnemonic);

      // Spy on notify to check for ARCHIVE_RESTORED
      const notifySpy = vi.fn();
      clientStore.subscribe(notifySpy);

      // Import archive
      const result = await importSovereignArchive(buffer, TEST_PASSPHRASE);

      expect(result.success).toBe(true);
      expect(result.stats.posts).toBe(2);
      expect(result.stats.bookmarks).toBe(1);
      expect(result.stats.messages).toBe(1);

      // Verify identity rehydration
      expect(clientStore.mnemonic).toBe(originalMnemonic);
      expect(clientStore.keypair.fingerprint).toBe(originalFingerprint);

      // Verify posts restored
      expect(clientStore.posts.length).toBe(2);
      expect(clientStore.posts.some(p => p.id === 'post-user-archive-01')).toBe(true);
      expect(clientStore.posts.some(p => p.id === 'post-user-archive-02')).toBe(true);

      // Verify bookmarks restored
      expect(bookmarksVault.bookmarks.length).toBe(1);
      expect(bookmarksVault.bookmarks[0].id).toBe('bm-test-01');

      // Verify messages restored
      expect(clientStore.messages.get('relays-general')?.length).toBe(1);
      expect(clientStore.messages.get('relays-general')?.[0].id).toBe('msg-test-01');

      // Verify clientStore.notify('ARCHIVE_RESTORED') was invoked
      expect(notifySpy).toHaveBeenCalledWith('ARCHIVE_RESTORED', expect.anything());
    });

    it('should reject decryption with incorrect passphrase and throw "Invalid passphrase or corrupted archive"', async () => {
      const blob = await exportSovereignArchive(TEST_PASSPHRASE);
      const buffer = await blob.arrayBuffer();

      await expect(importSovereignArchive(buffer, WRONG_PASSPHRASE)).rejects.toThrow(
        'Invalid passphrase or corrupted archive'
      );
    });

    it('should reject decryption with empty passphrase', async () => {
      const blob = await exportSovereignArchive(TEST_PASSPHRASE);
      const buffer = await blob.arrayBuffer();

      await expect(importSovereignArchive(buffer, '')).rejects.toThrow(
        'Invalid passphrase or corrupted archive'
      );
    });

    it('should reject archive with corrupted magic bytes', async () => {
      const blob = await exportSovereignArchive(TEST_PASSPHRASE);
      const buffer = await blob.arrayBuffer();
      const corruptedBytes = new Uint8Array(buffer);

      // Corrupt magic header
      corruptedBytes[0] = 0x58; // 'X' instead of 'A'
      corruptedBytes[1] = 0x58;

      await expect(importSovereignArchive(corruptedBytes, TEST_PASSPHRASE)).rejects.toThrow(
        /Invalid passphrase or corrupted archive/
      );
    });

    it('should reject archive with corrupted ciphertext payload', async () => {
      const blob = await exportSovereignArchive(TEST_PASSPHRASE);
      const buffer = await blob.arrayBuffer();
      const corruptedBytes = new Uint8Array(buffer);

      // Corrupt bytes in the ciphertext body
      corruptedBytes[HEADER_LENGTH + 5] ^= 0xff;
      corruptedBytes[HEADER_LENGTH + 6] ^= 0xaa;

      await expect(importSovereignArchive(corruptedBytes, TEST_PASSPHRASE)).rejects.toThrow(
        'Invalid passphrase or corrupted archive'
      );
    });

    it('should reject truncated data smaller than envelope header and tag', async () => {
      const tinyBytes = new Uint8Array([0x41, 0x45, 0x54, 0x48]); // 4 bytes

      await expect(importSovereignArchive(tinyBytes, TEST_PASSPHRASE)).rejects.toThrow(
        'Invalid passphrase or corrupted archive'
      );
    });
  });

  describe('4. Password Strength Meter & Modal UI Components', () => {
    it('should evaluate password strength dynamically', () => {
      // Empty
      const s0 = calculatePasswordStrength('');
      expect(s0.score).toBe(0);
      expect(s0.label).toBe('Enter Passphrase');

      // Very Weak (< 8 chars)
      const s1 = calculatePasswordStrength('short');
      expect(s1.score).toBe(0);
      expect(s1.label).toContain('Very Weak');

      // Weak (8 chars, simple lowercase)
      const s2 = calculatePasswordStrength('password');
      expect(s2.score).toBe(1);
      expect(s2.label).toBe('Weak');

      // Fair (mix of lower + upper + length)
      const s3 = calculatePasswordStrength('PassWord1');
      expect(s3.score).toBe(2);
      expect(s3.label).toBe('Fair');

      // Good (longer with numbers)
      const s4 = calculatePasswordStrength('PassWord12345');
      expect(s4.score).toBe(3);
      expect(s4.label).toBe('Good');

      // Cryptographically Strong (>=12, upper, lower, numbers, symbols)
      const s5 = calculatePasswordStrength('P@ssw0rd!Secure2026');
      expect(s5.score).toBe(4);
      expect(s5.label).toBe('Cryptographically Strong');
      expect(s5.colorClass).toBe('bg-emerald-500');
    });

    it('should manage modal open/close lifecycle and tab selection', () => {
      expect(sovereignArchiveModal.isOpen).toBe(false);

      sovereignArchiveModal.openModal('export');
      expect(sovereignArchiveModal.isOpen).toBe(true);
      expect(sovereignArchiveModal.activeTab).toBe('export');

      sovereignArchiveModal.setTab('restore');
      expect(sovereignArchiveModal.activeTab).toBe('restore');

      sovereignArchiveModal.closeModal();
      expect(sovereignArchiveModal.isOpen).toBe(false);
    });

    it('should render modal HTML with both Export and Restore tabs', () => {
      sovereignArchiveModal.openModal('export');
      const exportHtml = sovereignArchiveModal.renderModalHTML();

      expect(exportHtml).toContain('Sovereign Data Archive');
      expect(exportHtml).toContain('AES-256-GCM');
      expect(exportHtml).toContain('Export Archive');
      expect(exportHtml).toContain('Restore Archive');
      expect(exportHtml).toContain('input-export-passphrase');
      expect(exportHtml).toContain('btn-execute-export');

      sovereignArchiveModal.setTab('restore');
      const restoreHtml = sovereignArchiveModal.renderModalHTML();

      expect(restoreHtml).toContain('archive-dropzone');
      expect(restoreHtml).toContain('input-restore-passphrase');
      expect(restoreHtml).toContain('btn-execute-restore');

      sovereignArchiveModal.closeModal();
      expect(sovereignArchiveModal.renderModalHTML()).toBe('');
    });

    it('should set restore file metadata correctly', () => {
      const sampleData = new Uint8Array([1, 2, 3, 4]);
      sovereignArchiveModal.setRestoreFile(sampleData, 'backup-vault.aeth', 4);

      expect(sovereignArchiveModal.restoreFileData).toBe(sampleData);
      expect(sovereignArchiveModal.restoreFileName).toBe('backup-vault.aeth');
      expect(sovereignArchiveModal.restoreFileSize).toBe(4);
    });
  });

  describe('5. Full End-to-End Round-Trip State Preservation', () => {
    it('should faithfully preserve all posts, bookmarks, messages, identity, and preferences', async () => {
      const snapshotMnemonic = clientStore.mnemonic;
      const snapshotFp = clientStore.keypair.fingerprint;

      // 1. Export initial state
      const blob = await exportSovereignArchive(TEST_PASSPHRASE);
      const rawEnvelope = new Uint8Array(await blob.arrayBuffer());

      // 2. Wipe memory & inject dummy state
      clientStore.posts = [];
      bookmarksVault.bookmarks = [];
      clientStore.messages.clear();
      clientStore.density = 'media';
      const dummyMnemonic = generateMnemonic(128);
      clientStore.restoreIdentityFromMnemonic(dummyMnemonic);

      // Confirm clean state
      expect(clientStore.posts.length).toBe(0);
      expect(bookmarksVault.bookmarks.length).toBe(0);
      expect(clientStore.messages.size).toBe(0);
      expect(clientStore.mnemonic).not.toBe(snapshotMnemonic);

      // 3. Import from exported envelope
      const importRes = await importSovereignArchive(rawEnvelope, TEST_PASSPHRASE);
      expect(importRes.success).toBe(true);

      // 4. Assert full equality of rehydrated state
      expect(clientStore.mnemonic).toBe(snapshotMnemonic);
      expect(clientStore.keypair.fingerprint).toBe(snapshotFp);
      expect(clientStore.posts.length).toBe(2);
      expect(clientStore.posts[0].title).toBe('Zero-Knowledge Archive Verification Standard');
      expect(bookmarksVault.bookmarks.length).toBe(1);
      expect(bookmarksVault.bookmarks[0].note).toBe('Important reference for decentralized archival recovery.');
      expect(clientStore.messages.get('relays-general')?.length).toBe(1);
      expect(clientStore.messages.get('relays-general')?.[0].text).toBe('Initial sovereign handshake message.');
      expect(clientStore.density).toBe('compact');
    });
  });
});
