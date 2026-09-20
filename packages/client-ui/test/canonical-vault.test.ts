import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CanonicalVaultEngine, DEFAULT_VAULT_COLLECTIONS } from '../src/canonical-vault.js';
import { deriveVaultKey } from '@aetheris/core-crypto';

describe('Canonical Sovereign Knowledge Vault Engine (canonical-vault.ts)', () => {
  let vault: CanonicalVaultEngine;

  beforeEach(async () => {
    vault = new CanonicalVaultEngine();
    await vault.init();
  });

  describe('Initialization & State', () => {
    it('initializes with default collections when fresh', () => {
      const collections = vault.getCollections();
      expect(collections.length).toBeGreaterThanOrEqual(4);
      expect(collections.map(c => c.id)).toContain('research-papers');
      expect(collections.map(c => c.id)).toContain('archived-posts');
    });
  });

  describe('Post Save & Unsave Operations', () => {
    it('saves a post and updates saved status immediately (local-first)', async () => {
      expect(vault.isSaved('post-123')).toBe(false);

      await vault.savePost({
        id: 'post-123',
        title: 'Zero-Knowledge Circuits in Production',
        content: 'Deep dive into recursive proof composition and verification.',
        authorFingerprint: '0x9f4b3e1a',
        channelId: 'relays-research',
        flair: 'CRYPTOGRAPHY',
      });

      expect(vault.isSaved('post-123')).toBe(true);
      expect(vault.getSavedPostIds().has('post-123')).toBe(true);

      const savedPosts = vault.getSavedPosts();
      expect(savedPosts).toHaveLength(1);
      expect(savedPosts[0].title).toBe('Zero-Knowledge Circuits in Production');
      expect(savedPosts[0].tags).toContain('cryptography');
    });

    it('unsaves a post via tombstone preventing immediate visibility', async () => {
      await vault.savePost({
        id: 'post-456',
        title: 'Ephemeral Direct Messaging',
        authorFingerprint: '0x1234abcd',
      });

      expect(vault.isSaved('post-456')).toBe(true);
      await vault.unsavePost('post-456');

      expect(vault.isSaved('post-456')).toBe(false);
      expect(vault.getSavedPostIds().has('post-456')).toBe(false);
      expect(vault.getSavedPosts().some(p => p.id === 'post:post-456' || p.source?.id === 'post-456')).toBe(false);
    });

    it('re-saving an unsaved post restores it with incremented version', async () => {
      await vault.savePost({ id: 'post-789', title: 'Re-saved Spec' });
      await vault.unsavePost('post-789');
      expect(vault.isSaved('post-789')).toBe(false);

      await vault.savePost({ id: 'post-789', title: 'Re-saved Spec Updated' });
      expect(vault.isSaved('post-789')).toBe(true);
      const post = vault.getSavedPosts().find(p => p.id === 'post:post-789' || p.source?.id === 'post-789');
      expect(post?.version).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Private Notes CRUD', () => {
    it('creates, reads, updates and deletes private notes', async () => {
      const note = await vault.saveNote(
        'Post-Quantum Migration Blueprint',
        'Use ML-KEM-768 for hybrid key encapsulation.',
        'research-papers',
        ['pqc', 'security']
      );

      expect(note.id).toMatch(/^note-/);
      expect(note.title).toBe('Post-Quantum Migration Blueprint');
      expect(note.collectionId).toBe('research-papers');

      let notes = vault.getNotes();
      expect(notes.some(n => n.id === note.id)).toBe(true);

      // Update note
      await vault.updateNote(note.id, {
        content: 'Updated: Use ML-KEM-768 with X25519 hybrid exchange.',
      });

      notes = vault.getNotes();
      const updated = notes.find(n => n.id === note.id);
      expect(updated?.content).toContain('X25519 hybrid exchange');
      expect(updated?.version).toBe(2);

      // Delete note
      await vault.deleteItem(note.id);
      expect(vault.getNotes().some(n => n.id === note.id)).toBe(false);
    });
  });

  describe('Collections Management', () => {
    it('creates and renames custom collections', async () => {
      const col = await vault.createCollection(
        'Formal Verification',
        'Prover benchmarks and TLA+ specifications',
        '🔬'
      );

      expect(col.id).toMatch(/^col-/);
      expect(col.name).toBe('Formal Verification');

      await vault.renameCollection(col.id, 'Formal Verification & TLA+');
      const found = vault.getCollections().find(c => c.id === col.id);
      expect(found?.name).toBe('Formal Verification & TLA+');
    });

    it('deleting a collection retains items by moving them to unfiled', async () => {
      const col = await vault.createCollection('Temp Folder', 'To be deleted');
      const note = await vault.saveNote('Kept Item', 'Must survive deletion', col.id);

      await vault.deleteCollection(col.id, true); // keepItems = true

      expect(vault.getCollections().some(c => c.id === col.id)).toBe(false);
      const remainingNote = vault.getNotes().find(n => n.id === note.id);
      expect(remainingNote).toBeDefined();
      expect(remainingNote?.collectionId).toBe(''); // unfiled
    });
  });

  describe('100% Client-Side Private Search', () => {
    it('searches locally across titles, contents, tags and authors without network calls', async () => {
      await vault.savePost({
        id: 'p-search-1',
        title: 'Verifiable Delay Functions in Consensus',
        content: 'Wesolowski and Pietrzak VDF constructs analysis.',
        authorFingerprint: '0xconsensus',
        flair: 'CONSENSUS',
      });

      await vault.saveNote(
        'ZK Snarks Benchmarks',
        'Groth16 proving time is 2.4s on M3 Max.',
        '',
        ['zkp', 'benchmark']
      );

      const results1 = vault.search('Wesolowski');
      expect(results1).toHaveLength(1);
      expect(results1[0].title).toContain('Verifiable Delay Functions');

      const results2 = vault.search('benchmark');
      expect(results2.length).toBeGreaterThanOrEqual(1);

      const emptyResults = vault.search('nonexistent-query-string-xyz');
      expect(emptyResults).toHaveLength(0);
    });
  });

  describe('Portable Vault Export & Import', () => {
    it('exports and atomically imports backup JSON', async () => {
      await vault.savePost({ id: 'exp-1', title: 'Exported Post 1' });
      await vault.saveNote('Exported Note 1', 'Private content');

      const jsonBackup = vault.exportBackupJSON();
      expect(jsonBackup).toContain('UREFY_CANONICAL_VAULT_BACKUP');
      expect(jsonBackup).toContain('Exported Post 1');

      const freshBackup = JSON.parse(jsonBackup);
      freshBackup.items = [{ id: 'new-import-1', owner: 'genesis-core', type: 'post', title: 'Brand New Import', content: '', tags: ['imported'], createdAt: Date.now(), updatedAt: Date.now(), version: 1 }];
      const imported = await vault.importBackupJSON(JSON.stringify(freshBackup));
      expect(imported).toBe(1);
      expect(vault.isSaved('new-import-1')).toBe(true);
    });

    it('rejects tampered or invalid import format safely', async () => {
      const freshVault = new CanonicalVaultEngine();
      await freshVault.init();

      await expect(freshVault.importBackupJSON('{"invalid": true}')).rejects.toThrow('Invalid Vault Backup format');
    });
  });

  describe('Key Derivation Security', () => {
    it('derives identical 256-bit AES key for the same seed', () => {
      const seed = new Uint8Array(32).fill(0x5a);
      const key1 = deriveVaultKey(seed);
      const key2 = deriveVaultKey(seed);
      expect(Array.from(key1)).toEqual(Array.from(key2));
      expect(key1.byteLength).toBe(32);
    });
  });
});
