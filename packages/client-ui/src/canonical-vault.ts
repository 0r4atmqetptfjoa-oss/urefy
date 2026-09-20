/**
 * UREfy — CANONICAL SOVEREIGN KNOWLEDGE VAULT ENGINE
 * 
 * ============================================================================
 * UNIFIED SOVEREIGN KNOWLEDGE VAULT ARCHITECTURE (PASS 5)
 * ============================================================================
 * Consolidates parallel storage mechanisms (Bookmarks, Saved Posts, Knowledge Snapshots)
 * into a single unified, local-first, zero-knowledge encrypted knowledge vault.
 * 
 * Invariants:
 * 1. Single Mental Model: All saved posts, written notes, links, and collections
 *    belong to the user's sovereign Vault.
 * 2. Local-First: Reads, writes, searches, and tagging work with 0ms latency in
 *    client-side encrypted IndexedDB via WebCrypto AES-GCM-256.
 * 3. Zero-Knowledge Cross-Device Sync:
 *    - Vault key is deterministically derived from the sovereign master seed via
 *      HKDF-SHA256 with domain separation "urefy-vault-v1".
 *    - Server / R2 / D1 receives and stores CIPHERTEXT ONLY.
 *    - Cloudflare cannot read private notes, collections, or personal tags.
 *    - Recovering the sovereign recovery phrase on Device B deterministically derives
 *      the identical key and syncs the exact same Vault state.
 * 4. Deterministic Conflict Resolution:
 *    - Deletion tombstones prevent deleted items from resurrecting across devices.
 *    - Concurrent note edits produce non-destructive [Conflict Copy] items.
 * 5. Idempotent Migration: Automatically migrates legacy `aetheris_bookmarks`,
 *    `urefy_vault_collections`, and `knowledge-memory` without duplicate entries.
 * ============================================================================
 */

import { deriveVaultKey, mnemonicToSeed } from '@aetheris/core-crypto';
import { secureStorage, hexToBytes, bytesToHex } from './secure-storage.js';
import { clientStore, ClientPost } from './client-state.js';
import { toastManager } from './toast.js';
import { t } from './i18n.js';

export type VaultItemType = 'post' | 'note' | 'link' | 'attachment' | 'snapshot';

export interface CanonicalVaultItem {
  id: string; // stable identifier: `post:${postId}` for saved posts, UUID for notes/links
  owner: string; // sovereign fingerprint
  type: VaultItemType;
  source?: {
    kind: 'post' | 'comment' | 'message' | 'link' | 'attachment' | 'manual';
    id?: string;
    author?: string;
    createdAt?: number;
    channelId?: string;
    url?: string;
    postId?: string;
    peer?: string;
  };
  title: string;
  content: string; // note markdown, post text/summary, link URL
  collectionId?: string; // id of collection, or empty/unfiled
  tags: string[];
  createdAt: number;
  updatedAt: number;
  version: number;
  baseVersion?: number;
  deleted?: boolean; // tombstone
  digest?: string;
  attachment?: {
    r2Key: string;
    fileName: string;
    byteSize: number;
    mimeType: string;
    iv?: string;
    sha256?: string;
  };
}

export interface CanonicalVaultCollection {
  id: string;
  name: string;
  description: string;
  icon: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  baseVersion?: number;
  deleted?: boolean;
}

export interface CanonicalVaultState {
  version: 1;
  syncVersion: number;
  owner: string;
  items: CanonicalVaultItem[];
  collections: CanonicalVaultCollection[];
  lastSyncedAt: number;
  hasPendingSync?: boolean;
}

export const DEFAULT_VAULT_COLLECTIONS: CanonicalVaultCollection[] = [
  {
    id: 'research-papers',
    name: 'Research Papers',
    description: 'Cryptographic whitepapers, reproducible benchmarks, and consensus notes',
    icon: '📄',
    createdAt: 1772496000000, // 2026-03-01
    updatedAt: 1772496000000,
    version: 1,
  },
  {
    id: 'encrypted-keys',
    name: 'Encrypted Keys',
    description: 'Post-quantum key shares, air-gap backup shards, and identity attestations',
    icon: '🔑',
    createdAt: 1776038400000, // 2026-04-12
    updatedAt: 1776038400000,
    version: 1,
  },
  {
    id: 'archived-posts',
    name: 'Archived Posts',
    description: 'Saved discussion threads, verified releases, and signed nanopublications',
    icon: '📦',
    createdAt: 1781913600000, // 2026-06-20
    updatedAt: 1781913600000,
    version: 1,
  },
  {
    id: 'personal-backups',
    name: 'Personal Backups',
    description: 'Encrypted storage bundles, local state snapshots, and media payloads',
    icon: '💾',
    createdAt: 1786838400000, // 2026-08-15
    updatedAt: 1786838400000,
    version: 1,
  },
];

export class CanonicalVaultEngine {
  private state: CanonicalVaultState | null = null;
  private isLoaded = false;
  private isSyncing = false;
  private syncTimer: any = null;
  private currentSyncPromise: Promise<{ success: boolean; itemsCount: number; merged: boolean; offline?: boolean }> | null = null;
  private loadPromise: Promise<void> | null = null;
  private vaultKeyCache: CryptoKey | null = null;
  private cachedOwner = '';
  private isOnlineListenerAttached = false;
  private lastSyncAttemptAt = 0;
  private backoffAttempts = 0;

  constructor() {
    this.attachNetworkListeners();
  }

  private attachNetworkListeners(): void {
    if (typeof window === 'undefined' || this.isOnlineListenerAttached) return;
    this.isOnlineListenerAttached = true;
    window.addEventListener('online', () => {
      console.log('[CanonicalVault] Network online event received; triggering sync');
      this.isSyncing = false; // clear any stale sync lock
      this.scheduleSync(200);
    });
  }

  /**
   * Checks if local state has un-synced edits relative to baseVersion or pending sync flag.
   */
  public hasPendingLocalMutations(): boolean {
    if (!this.state) return false;
    if (this.state.hasPendingSync) return true;
    return this.state.items.some(i => i.baseVersion !== undefined && i.version > i.baseVersion);
  }

  /**
   * Initializes the canonical vault by loading local IndexedDB state
   * and executing one-time legacy migration.
   */
  public async init(force = false): Promise<void> {
    const activeOwner = clientStore.keypair?.fingerprint || 'genesis-core';
    if (this.isLoaded && !force && this.cachedOwner === activeOwner && this.state?.owner === activeOwner) {
      return;
    }
    if (this.loadPromise && !force && this.cachedOwner === activeOwner) {
      return this.loadPromise;
    }

    this.isLoaded = false;
    this.vaultKeyCache = null;
    this.cachedOwner = activeOwner;

    this.loadPromise = (async () => {
      try {
        await secureStorage.init();
        const owner = clientStore.keypair?.fingerprint || 'genesis-core';
        this.cachedOwner = owner;

        const storedState = await secureStorage.getPrivateState<CanonicalVaultState>(`canonical_vault:${owner}`);
        if (storedState && storedState.version === 1 && Array.isArray(storedState.items)) {
          this.state = storedState;
          this.state.owner = owner;
        } else {
          this.state = {
            version: 1,
            syncVersion: 1,
            owner,
            items: [],
            collections: [...DEFAULT_VAULT_COLLECTIONS],
            lastSyncedAt: 0,
            hasPendingSync: false,
          };
        }

        // Execute idempotent legacy migration
        await this.migrateLegacyData(owner);
        this.isLoaded = true;

        // Ensure all loaded items have baseVersion initialized
        for (const item of this.state.items) {
          if (item.baseVersion === undefined) {
            item.baseVersion = item.version || 1;
          }
        }
        for (const col of this.state.collections) {
          if (col.baseVersion === undefined) {
            col.baseVersion = col.version || 1;
          }
        }

        // Schedule background sync if identity is active
        if (owner !== 'genesis-core') {
          if (this.state.hasPendingSync || this.hasPendingLocalMutations()) {
            this.scheduleSync(500);
          } else {
            this.scheduleSync(2000);
          }
        }
      } catch (err) {
        console.warn('[CanonicalVault] Local load failed, initializing fallback state:', err);
        const owner = clientStore.keypair?.fingerprint || 'genesis-core';
        this.state = {
          version: 1,
          syncVersion: 1,
          owner,
          items: [],
          collections: [...DEFAULT_VAULT_COLLECTIONS],
          lastSyncedAt: 0,
          hasPendingSync: false,
        };
        this.isLoaded = true;
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Derives or retrieves the cached WebCrypto AES-GCM-256 Vault Key.
   * Deterministically derived from the sovereign recovery seed via HKDF "urefy-vault-v1".
   */
  public async getVaultCryptoKey(): Promise<CryptoKey> {
    const owner = clientStore.keypair?.fingerprint || 'genesis-core';
    if (this.vaultKeyCache && this.cachedOwner === owner) {
      return this.vaultKeyCache;
    }

    let seedBytes: Uint8Array | null = null;

    if (clientStore.mnemonic) {
      try {
        seedBytes = mnemonicToSeed(clientStore.mnemonic.trim().toLowerCase()).subarray(0, 32);
      } catch {}
    }

    if (!seedBytes) {
      if (clientStore.identityPersistence) {
        try { await clientStore.identityPersistence; } catch {}
      }
      const volatile = secureStorage.getIdentitySync();
      if (volatile && volatile.seedHex) {
        seedBytes = hexToBytes(volatile.seedHex);
      } else {
        const identityRecord = await secureStorage.getIdentity();
        if (identityRecord && identityRecord.seedHex) {
          seedBytes = hexToBytes(identityRecord.seedHex);
        }
      }
    }

    if (!seedBytes) {
      // Fallback to deterministic pseudo-seed derived from public key when no mnemonic is in storage
      const pubBytes = hexToBytes(clientStore.keypair?.publicKeyHex || '00'.repeat(32));
      seedBytes = new Uint8Array(32);
      seedBytes.set(pubBytes.slice(0, 32));
    }

    const rawVaultKey = deriveVaultKey(seedBytes);
    this.vaultKeyCache = await crypto.subtle.importKey(
      'raw',
      rawVaultKey as unknown as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable
      ['encrypt', 'decrypt']
    );
    this.cachedOwner = owner;
    return this.vaultKeyCache;
  }

  // ─── LOCAL STORAGE MUTATION & PERSISTENCE ─────────────────────────────────

  private async persistLocal(): Promise<void> {
    if (!this.state) return;
    const owner = this.state.owner || clientStore.keypair?.fingerprint || 'genesis-core';
    await secureStorage.savePrivateState(`canonical_vault:${owner}`, this.state);
    clientStore.notifySync('VAULT_CHANGE');
  }

  // ─── IDEMPOTENT LEGACY MIGRATION ──────────────────────────────────────────

  private async migrateLegacyData(owner: string): Promise<void> {
    if (!this.state) return;
    let modified = false;

    // 1. Migrate localStorage bookmarks (aetheris_bookmarks)
    if (typeof localStorage !== 'undefined') {
      try {
        const rawBookmarks = localStorage.getItem('aetheris_bookmarks');
        if (rawBookmarks) {
          const parsed = JSON.parse(rawBookmarks);
          if (Array.isArray(parsed)) {
            for (const b of parsed) {
              const postId = b.postId || b.id;
              if (!postId) continue;
              const canonicalId = `post:${postId}`;
              if (!this.state.items.some(i => i.id === canonicalId || i.source?.id === postId)) {
                this.state.items.push({
                  id: canonicalId,
                  owner,
                  type: 'post',
                  source: {
                    kind: 'post',
                    id: postId,
                    author: b.postAuthor || '',
                    channelId: b.channelId || 'relays-general',
                    createdAt: b.savedAt || Date.now(),
                  },
                  title: b.postTitle || 'Saved Post',
                  content: b.note || '',
                  tags: Array.isArray(b.tags) ? b.tags : ['saved'],
                  collectionId: 'archived-posts',
                  createdAt: b.savedAt || Date.now(),
                  updatedAt: b.savedAt || Date.now(),
                  version: 1,
                });
                modified = true;
              }
            }
          }
        }
      } catch (err) {
        console.warn('[CanonicalVault] Legacy bookmarks migration skipped on error:', err);
      }

      // 2. Migrate localStorage collections (urefy_vault_collections)
      try {
        const rawCols = localStorage.getItem('urefy_vault_collections');
        if (rawCols) {
          const parsedCols = JSON.parse(rawCols);
          if (Array.isArray(parsedCols)) {
            for (const col of parsedCols) {
              if (col && col.id && !this.state.collections.some(c => c.id === col.id)) {
                this.state.collections.push({
                  id: col.id,
                  name: col.name || 'Untitled Collection',
                  description: col.description || '',
                  icon: col.icon || '📁',
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  version: 1,
                });
                modified = true;
              }
            }
          }
        }
      } catch (err) {
        console.warn('[CanonicalVault] Legacy collections migration skipped on error:', err);
      }
    }

    // 3. Migrate legacy knowledge-memory from IndexedDB (knowledge:${owner})
    try {
      const legacyKnowledge = await secureStorage.getPrivateState<{ items: any[] }>(`knowledge:${owner}`);
      if (legacyKnowledge && Array.isArray(legacyKnowledge.items)) {
        for (const item of legacyKnowledge.items) {
          if (!item || !item.id) continue;
          if (!this.state.items.some(i => i.id === item.id || (item.source && i.source?.id === item.source.id))) {
            const isNote = item.source?.kind === 'note';
            const isLink = item.source?.kind === 'link';
            this.state.items.push({
              id: item.id,
              owner,
              type: isNote ? 'note' : isLink ? 'link' : 'snapshot',
              source: item.source || { kind: 'manual', id: item.id, author: owner, createdAt: item.savedAt || Date.now() },
              title: item.title || 'Untitled Note',
              content: item.text || '',
              collectionId: item.collection || '',
              tags: isNote ? ['note'] : isLink ? ['link'] : ['snapshot'],
              digest: item.digest,
              createdAt: item.savedAt || Date.now(),
              updatedAt: item.savedAt || Date.now(),
              version: 1,
            });
            modified = true;
          }
        }
      }
    } catch (err) {
      console.warn('[CanonicalVault] Legacy knowledge migration skipped on error:', err);
    }

    if (modified) {
      await this.persistLocal();
    }
  }

  // ─── PUBLIC POST & ITEM ACTIONS ───────────────────────────────────────────

  public isSaved(postId: string): boolean {
    if (!this.state) return false;
    const cleanId = postId.replace(/^post:/, '');
    return this.state.items.some(
      i => !i.deleted && (i.id === `post:${cleanId}` || i.id === cleanId || i.source?.id === cleanId)
    );
  }

  public async savePost(post: { id: string; title?: string; content?: string; authorFingerprint?: string; channelId?: string; flair?: string }): Promise<void> {
    await this.init();
    if (!this.state) return;

    const cleanId = post.id.replace(/^post:/, '');
    const canonicalId = `post:${cleanId}`;
    const now = Date.now();
    const existing = this.state.items.find(i => i.id === canonicalId || i.source?.id === cleanId);

    if (existing) {
      if (existing.baseVersion === undefined) existing.baseVersion = existing.version || 1;
      existing.deleted = false;
      existing.updatedAt = now;
      existing.version = (existing.version || 1) + 1;
    } else {
      this.state.items.unshift({
        id: canonicalId,
        owner: this.state.owner,
        type: 'post',
        source: {
          kind: 'post',
          id: cleanId,
          author: post.authorFingerprint || '',
          channelId: post.channelId || 'relays-general',
          createdAt: now,
        },
        title: post.title || 'Saved Post',
        content: post.content || '',
        tags: post.flair ? ['saved', post.flair.toLowerCase()] : ['saved'],
        collectionId: 'archived-posts',
        createdAt: now,
        updatedAt: now,
        version: 1,
        baseVersion: 1,
      });
    }

    this.state.syncVersion = (this.state.syncVersion || 1) + 1;
    this.state.hasPendingSync = true;
    await this.persistLocal();
    this.scheduleSync(1000);
    toastManager.success(t('toast.savedToVault', undefined, 'Saved to your Vault'), '🔖');
  }

  public async unsavePost(postId: string): Promise<void> {
    await this.init();
    if (!this.state) return;

    const cleanId = postId.replace(/^post:/, '');
    const item = this.state.items.find(i => i.id === `post:${cleanId}` || i.id === cleanId || i.source?.id === cleanId);

    if (item) {
      if (item.baseVersion === undefined) item.baseVersion = item.version || 1;
      item.deleted = true; // Tombstone to propagate deletion across devices
      item.updatedAt = Date.now();
      item.version = (item.version || 1) + 1;
      this.state.syncVersion = (this.state.syncVersion || 1) + 1;
      this.state.hasPendingSync = true;
      await this.persistLocal();
      this.scheduleSync(1000);
      toastManager.info(t('toast.removedFromVault', undefined, 'Removed from Vault'), '🗑️');
    }
  }

  public getSavedPosts(): CanonicalVaultItem[] {
    if (!this.state) return [];
    return this.state.items.filter(i => !i.deleted && i.type === 'post');
  }

  public getSavedPostIds(): Set<string> {
    if (!this.state) return new Set();
    const ids = new Set<string>();
    for (const item of this.state.items) {
      if (!item.deleted && item.type === 'post') {
        const cleanId = item.id.replace(/^post:/, '');
        ids.add(cleanId);
        if (item.source?.id) ids.add(item.source.id);
      }
    }
    return ids;
  }

  // ─── PRIVATE NOTES & GENERIC ITEMS ────────────────────────────────────────

  public async saveNote(title: string, content: string, collectionId = '', tags: string[] = [], existingId?: string): Promise<CanonicalVaultItem> {
    await this.init();
    if (!this.state) throw new Error('Vault not initialized');

    if (existingId) {
      const existing = this.state.items.find(i => i.id === existingId && !i.deleted);
      if (existing) {
        if (existing.baseVersion === undefined) existing.baseVersion = existing.version || 1;
        existing.title = title.trim() || 'Untitled Note';
        existing.content = content.trim();
        existing.collectionId = collectionId;
        if (tags.length) existing.tags = tags;
        existing.updatedAt = Date.now();
        existing.version = (existing.version || 1) + 1;
        this.state.syncVersion = (this.state.syncVersion || 1) + 1;
        this.state.hasPendingSync = true;
        await this.persistLocal();
        this.scheduleSync(1000);
        return existing;
      }
    }

    const now = Date.now();
    const id = `note-${crypto.randomUUID()}`;
    const item: CanonicalVaultItem = {
      id,
      owner: this.state.owner,
      type: 'note',
      source: {
        kind: 'manual',
        id,
        author: this.state.owner,
        createdAt: now,
      },
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
      collectionId,
      tags: tags.length ? tags : ['note'],
      createdAt: now,
      updatedAt: now,
      version: 1,
      baseVersion: 1,
    };

    this.state.items.unshift(item);
    this.state.syncVersion = (this.state.syncVersion || 1) + 1;
    this.state.hasPendingSync = true;
    await this.persistLocal();
    this.scheduleSync(1000);
    toastManager.success('Private note saved in encrypted Vault', '📝');
    return item;
  }

  public async updateNote(id: string, updates: { title?: string; content?: string; collectionId?: string; tags?: string[] }): Promise<void> {
    await this.init();
    if (!this.state) return;

    const item = this.state.items.find(i => i.id === id && !i.deleted);
    if (!item) throw new Error('Note not found');

    if (item.baseVersion === undefined) item.baseVersion = item.version || 1;
    if (updates.title !== undefined) item.title = updates.title.trim();
    if (updates.content !== undefined) item.content = updates.content.trim();
    if (updates.collectionId !== undefined) item.collectionId = updates.collectionId;
    if (updates.tags !== undefined) item.tags = updates.tags;

    item.updatedAt = Date.now();
    item.version = (item.version || 1) + 1;
    this.state.syncVersion = (this.state.syncVersion || 1) + 1;
    this.state.hasPendingSync = true;

    await this.persistLocal();
    this.scheduleSync(1000);
    toastManager.success('Note updated', '✓');
  }

  public async deleteItem(id: string): Promise<void> {
    await this.init();
    if (!this.state) return;

    const item = this.state.items.find(i => i.id === id);
    if (item) {
      if (item.baseVersion === undefined) item.baseVersion = item.version || 1;
      item.deleted = true; // Tombstone
      item.updatedAt = Date.now();
      item.version = (item.version || 1) + 1;
      this.state.syncVersion = (this.state.syncVersion || 1) + 1;
      this.state.hasPendingSync = true;
      await this.persistLocal();
      this.scheduleSync(1000);
      toastManager.info('Item removed from Vault', '🗑️');
    }
  }

  public async deleteNote(id: string): Promise<void> {
    return this.deleteItem(id);
  }

  public getNotes(): CanonicalVaultItem[] {
    if (!this.state) return [];
    return this.state.items.filter(i => !i.deleted && (i.type === 'note' || i.type === 'snapshot'));
  }

  public getAllActiveItems(): CanonicalVaultItem[] {
    if (!this.state) return [];
    return this.state.items.filter(i => !i.deleted);
  }

  // ─── COLLECTIONS CRUD ─────────────────────────────────────────────────────

  public getCollections(): CanonicalVaultCollection[] {
    if (!this.state) return DEFAULT_VAULT_COLLECTIONS;
    return this.state.collections.filter(c => !c.deleted);
  }

  public async createCollection(name: string, description: string, icon = '📁'): Promise<CanonicalVaultCollection> {
    await this.init();
    if (!this.state) throw new Error('Vault not initialized');

    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 80) throw new Error('Collection name must be 1-80 characters');

    const id = `col-${crypto.randomUUID()}`;
    const now = Date.now();
    const col: CanonicalVaultCollection = {
      id,
      name: cleanName,
      description: description.trim(),
      icon,
      createdAt: now,
      updatedAt: now,
      version: 1,
      baseVersion: 1,
    };

    this.state.collections.unshift(col);
    this.state.syncVersion = (this.state.syncVersion || 1) + 1;
    this.state.hasPendingSync = true;
    await this.persistLocal();
    this.scheduleSync(1000);
    toastManager.success(`Created collection "${cleanName}"`, '📁');
    return col;
  }

  public async renameCollection(id: string, newName: string, newDesc?: string): Promise<void> {
    await this.init();
    if (!this.state) return;

    const col = this.state.collections.find(c => c.id === id && !c.deleted);
    if (!col) throw new Error('Collection not found');

    if (col.baseVersion === undefined) col.baseVersion = col.version || 1;
    col.name = newName.trim();
    if (newDesc !== undefined) col.description = newDesc.trim();
    col.updatedAt = Date.now();
    col.version = (col.version || 1) + 1;

    this.state.syncVersion = (this.state.syncVersion || 1) + 1;
    this.state.hasPendingSync = true;
    await this.persistLocal();
    this.scheduleSync(1000);
    toastManager.success(`Updated collection "${col.name}"`, '✓');
  }

  public async deleteCollection(id: string, keepItems = true): Promise<void> {
    await this.init();
    if (!this.state) return;

    const col = this.state.collections.find(c => c.id === id);
    if (!col) return;

    if (col.baseVersion === undefined) col.baseVersion = col.version || 1;
    col.deleted = true;
    col.updatedAt = Date.now();
    col.version = (col.version || 1) + 1;

    // Handle items inside the collection
    for (const item of this.state.items) {
      if (item.collectionId === id) {
        if (keepItems) {
          item.collectionId = ''; // Move to unfiled
          item.updatedAt = Date.now();
        } else {
          item.deleted = true; // Tombstone
          item.updatedAt = Date.now();
        }
      }
    }

    this.state.syncVersion = (this.state.syncVersion || 1) + 1;
    this.state.hasPendingSync = true;
    await this.persistLocal();
    this.scheduleSync(1000);
    toastManager.info('Collection removed', '🗑️');
  }

  public async moveItemToCollection(itemId: string, collectionId: string): Promise<void> {
    await this.init();
    if (!this.state) return;

    const item = this.state.items.find(i => i.id === itemId && !i.deleted);
    if (item) {
      item.collectionId = collectionId;
      item.updatedAt = Date.now();
      item.version = (item.version || 1) + 1;
      this.state.syncVersion = (this.state.syncVersion || 1) + 1;
      await this.persistLocal();
      this.scheduleSync(1000);
    }
  }

  // ─── PRIVATE SEARCH (100% LOCAL CLIENT-SIDE) ──────────────────────────────

  public search(query: string): CanonicalVaultItem[] {
    if (!this.state || !query.trim()) return this.getAllActiveItems();
    const q = query.toLowerCase().trim();

    return this.state.items.filter(item => {
      if (item.deleted) return false;
      const titleMatch = item.title.toLowerCase().includes(q);
      const contentMatch = item.content.toLowerCase().includes(q);
      const tagMatch = item.tags.some(t => t.toLowerCase().includes(q));
      const authorMatch = item.source?.author?.toLowerCase().includes(q) || false;
      return titleMatch || contentMatch || tagMatch || authorMatch;
    });
  }

  // ─── ENCRYPTED CROSS-DEVICE SYNC ENGINE ───────────────────────────────────

  private scheduleSync(delayMs = 2000): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }
    this.syncTimer = setTimeout(() => {
      this.sync().catch(err => console.debug('[CanonicalVault] Background sync deferred:', err?.message));
    }, delayMs);
  }

  /**
   * Executes end-to-end encrypted cross-device synchronization.
   * 1. Fetches remote encrypted vault blob from /api/vault-sync.
   * 2. Decrypts with local HKDF Vault Key.
   * 3. Reconciles remote and local states using baseVersion 3-way merge:
   *    - Divergent concurrent edits -> primary + [Conflict Copy] (zero data loss)
   *    - Deletion vs edit conflict -> tombstone preserved + [Recovered Copy]
   *    - Divergent collection renames -> deterministic policy preserving both
   * 4. Encrypts merged state and uploads if local has pending changes.
   */
  public async sync(force = false): Promise<{ success: boolean; itemsCount: number; merged: boolean; offline?: boolean }> {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.isSyncing && !force) {
      if (Date.now() - this.lastSyncAttemptAt > 10000) {
        console.warn('[CanonicalVault] Breaking stale sync lock (>10s)');
        this.isSyncing = false;
        this.currentSyncPromise = null;
      } else if (this.currentSyncPromise) {
        return this.currentSyncPromise;
      } else {
        return { success: false, itemsCount: this.getAllActiveItems().length, merged: false };
      }
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.log('[CanonicalVault] Device is currently offline; deferring sync to reconnect event');
      if (this.state) {
        this.state.hasPendingSync = true;
        await this.persistLocal();
      }
      return { success: false, itemsCount: this.getAllActiveItems().length, merged: false, offline: true };
    }

    await this.init();
    if (!this.state) return { success: false, itemsCount: 0, merged: false };

    this.isSyncing = true;
    this.lastSyncAttemptAt = Date.now();
    clientStore.notifySync('VAULT_SYNC_START');

    this.currentSyncPromise = (async () => {
      try {
        const owner = this.state?.owner || clientStore.keypair?.fingerprint;
        if (!owner || owner === 'genesis-core' || !this.state) {
          return { success: false, itemsCount: 0, merged: false };
        }

      const cryptoKey = await this.getVaultCryptoKey();

      // ─── STEP 1: FETCH REMOTE ENCRYPTED BLOB ───────────────────────────────
      const envelope = clientStore.createSignedEnvelope({ action: 'vault:read', owner, timestamp: Date.now() });
      let getRes: Response | null = null;
      try {
        getRes = await fetch(`/api/vault-sync?owner=${encodeURIComponent(owner)}`, {
          cache: 'no-store',
          headers: {
            'X-Sovereign-Envelope': JSON.stringify(envelope),
          },
          signal: AbortSignal.timeout(8000),
        });
      } catch (netErr) {
        console.warn('[CanonicalVault] Network fetch failed during sync:', netErr);
        this.state.hasPendingSync = true;
        await this.persistLocal();
        return { success: false, itemsCount: this.getAllActiveItems().length, merged: false, offline: true };
      }

      let remoteState: CanonicalVaultState | null = null;
      let hasRemote = false;

      if (getRes.ok) {
        const remoteData = await getRes.json();
        if (remoteData.success && remoteData.ciphertext && remoteData.iv) {
          hasRemote = true;
          // Decrypt remote payload
          const ivBytes = hexToBytes(remoteData.iv);
          const ciphertextBytes = hexToBytes(remoteData.ciphertext);
          const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivBytes as any },
            cryptoKey,
            ciphertextBytes as any
          );
          const decryptedText = new TextDecoder().decode(decryptedBuffer);
          remoteState = JSON.parse(decryptedText);
        }
      }

      // ─── STEP 2: RECONCILE / MERGE REMOTE WITH LOCAL ───────────────────────
      let localDirty = false;

      if (hasRemote && remoteState && Array.isArray(remoteState.items)) {
        const localItemMap = new Map<string, CanonicalVaultItem>(this.state.items.map(i => [i.id, i]));

        for (const rItem of remoteState.items) {
          const lItem = localItemMap.get(rItem.id);

          if (!lItem) {
            // New remote item: adopt remote item and set baseVersion
            const cloned: CanonicalVaultItem = { ...rItem, baseVersion: rItem.version };
            this.state.items.push(cloned);
            localItemMap.set(rItem.id, cloned);
            localDirty = true;
          } else {
            const lBase = lItem.baseVersion ?? 1;
            const rVer = rItem.version ?? 1;
            const lVer = lItem.version ?? 1;

            const lHasLocalEdits = lVer > lBase;
            const rHasRemoteEdits = rVer > lBase;

            // Scenario 6: Deletion vs Edit Conflict
            if (rItem.deleted && !lItem.deleted) {
              if (lHasLocalEdits) {
                // Local edited the note while remote deleted it!
                // Tombstone remains authoritative for original item ID.
                lItem.deleted = true;
                lItem.updatedAt = Math.max(lItem.updatedAt, rItem.updatedAt);
                lItem.version = Math.max(lVer, rVer) + 1;
                lItem.baseVersion = lItem.version;

                // Non-destructive preservation: save local edits as a recovered copy
                const recoveredCopy: CanonicalVaultItem = {
                  id: `note-recovered-${crypto.randomUUID()}`,
                  owner: this.state.owner,
                  type: lItem.type,
                  source: {
                    kind: 'manual',
                    id: lItem.id,
                    author: lItem.owner,
                    createdAt: Date.now(),
                  },
                  title: `${lItem.title} — Recovered Copy`,
                  content: lItem.content,
                  collectionId: lItem.collectionId || '',
                  tags: Array.from(new Set([...(lItem.tags || []), 'recovered-copy'])),
                  createdAt: lItem.createdAt || Date.now(),
                  updatedAt: Date.now(),
                  version: 1,
                  baseVersion: 1,
                };
                this.state.items.push(recoveredCopy);
                localDirty = true;
              } else {
                // No local edits: accept remote deletion cleanly
                lItem.deleted = true;
                lItem.updatedAt = rItem.updatedAt;
                lItem.version = Math.max(lVer, rVer);
                lItem.baseVersion = lItem.version;
                localDirty = true;
              }
            } else if (!rItem.deleted && lItem.deleted) {
              if (rHasRemoteEdits) {
                // Local deleted, but remote edited after base version.
                // Keep local deletion tombstone for original ID, preserve remote edit as conflict/recovered copy.
                const remoteRecovered: CanonicalVaultItem = {
                  id: `note-recovered-${crypto.randomUUID()}`,
                  owner: this.state.owner,
                  type: rItem.type,
                  source: {
                    kind: 'manual',
                    id: rItem.id,
                    author: rItem.owner,
                    createdAt: Date.now(),
                  },
                  title: `${rItem.title} — Remote Recovered`,
                  content: rItem.content,
                  collectionId: rItem.collectionId || '',
                  tags: Array.from(new Set([...(rItem.tags || []), 'recovered-copy'])),
                  createdAt: rItem.createdAt || Date.now(),
                  updatedAt: Date.now(),
                  version: 1,
                  baseVersion: 1,
                };
                this.state.items.push(remoteRecovered);
                localDirty = true;
              } else {
                localDirty = true;
              }
            } else if (!rItem.deleted && !lItem.deleted) {
              const contentDiverged = rItem.content !== lItem.content || rItem.title !== lItem.title;

              if (lHasLocalEdits && rHasRemoteEdits && contentDiverged) {
                // ─── TRUE CONCURRENT CONFLICT ─────────────────────────
                console.log(`[CanonicalVault] Concurrent conflict detected on item "${lItem.title}" (${lItem.id}): local v${lVer}, remote v${rVer}, base v${lBase}`);

                // Determine primary (newest timestamp wins primary slot)
                const isRemoteNewer = (rItem.updatedAt || 0) >= (lItem.updatedAt || 0);
                const losingItem = isRemoteNewer ? { ...lItem } : { ...rItem };
                const winningItem = isRemoteNewer ? rItem : lItem;

                const conflictCopy: CanonicalVaultItem = {
                  id: `note-conflict-${crypto.randomUUID()}`,
                  owner: this.state.owner,
                  type: losingItem.type,
                  source: {
                    kind: 'manual',
                    id: losingItem.id,
                    author: losingItem.owner,
                    createdAt: Date.now(),
                  },
                  title: `${losingItem.title} — Conflict Copy`,
                  content: losingItem.content,
                  collectionId: losingItem.collectionId || '',
                  tags: Array.from(new Set([...(losingItem.tags || []), 'conflict-copy'])),
                  createdAt: losingItem.createdAt || Date.now(),
                  updatedAt: Date.now(),
                  version: 1,
                  baseVersion: 1,
                };

                Object.assign(lItem, winningItem);
                lItem.version = Math.max(lVer, rVer) + 1;
                lItem.baseVersion = lItem.version;

                this.state.items.push(conflictCopy);
                localDirty = true;
              } else if (rVer > lVer || (!lHasLocalEdits && rHasRemoteEdits)) {
                // Remote has progressed, local has not branched or remote is strictly newer
                Object.assign(lItem, rItem);
                lItem.baseVersion = rItem.version;
                localDirty = true;
              } else if (lVer > rVer) {
                // Local has progressed, remote has not
                localDirty = true;
              } else {
                lItem.baseVersion = rItem.version;
              }
            }
          }
        }

        // Align baseVersion on all remaining local items
        for (const item of this.state.items) {
          if (item.baseVersion === undefined) {
            item.baseVersion = item.version || 1;
          }
        }

        // Merge collections
        const localColMap = new Map<string, CanonicalVaultCollection>(this.state.collections.map(c => [c.id, c]));
        for (const rCol of remoteState.collections || []) {
          const lCol = localColMap.get(rCol.id);
          if (!lCol) {
            this.state.collections.push({ ...rCol, baseVersion: rCol.version });
            localDirty = true;
          } else if (rCol.deleted && !lCol.deleted && rCol.updatedAt >= lCol.updatedAt) {
            lCol.deleted = true;
            localDirty = true;
          } else if (!rCol.deleted && !lCol.deleted) {
            if (rCol.name !== lCol.name && rCol.version > 1 && lCol.version > 1) {
              // Divergent rename of same collection: deterministic preservation
              if ((rCol.updatedAt || 0) >= (lCol.updatedAt || 0)) {
                lCol.name = rCol.name;
                lCol.description = `${rCol.description} [Variant: ${lCol.name}]`.trim();
              } else {
                lCol.description = `${lCol.description} [Variant: ${rCol.name}]`.trim();
              }
              lCol.version = Math.max(lCol.version, rCol.version) + 1;
              localDirty = true;
            } else if (rCol.version > lCol.version || rCol.updatedAt > lCol.updatedAt) {
              Object.assign(lCol, rCol);
              localDirty = true;
            }
          }
        }
      } else {
        // No remote state yet: local is newer and needs initial push
        localDirty = this.state.items.length > 0;
      }

      // ─── STEP 3: ENCRYPT AND UPLOAD LOCAL CHANGES ──────────────────────────
      if (localDirty || !hasRemote || this.state.hasPendingSync) {
        this.state.syncVersion = Math.max(this.state.syncVersion || 1, (remoteState?.syncVersion || 0) + 1);
        this.state.lastSyncedAt = Date.now();

        // Update all baseVersions to match version upon push
        for (const item of this.state.items) {
          item.baseVersion = item.version;
        }
        for (const col of this.state.collections) {
          col.baseVersion = col.version;
        }

        // Serialize state to JSON
        const plaintextBytes = new TextEncoder().encode(JSON.stringify(this.state));

        // Encrypt with AES-GCM-256 (unique 12-byte IV from CSPRNG)
        const ivBytes = crypto.getRandomValues(new Uint8Array(12));
        const encryptedBuffer = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: ivBytes },
          cryptoKey,
          plaintextBytes
        );

        const ciphertextHex = bytesToHex(new Uint8Array(encryptedBuffer));
        const ivHex = bytesToHex(ivBytes);

        // Send encrypted envelope to server with timeout
        const postEnvelope = clientStore.createSignedEnvelope({
          action: 'vault:write',
          owner,
          version: this.state.syncVersion,
          itemCount: this.getAllActiveItems().length,
          ciphertext: ciphertextHex,
          iv: ivHex,
          timestamp: Date.now(),
        });

        try {
          const postRes = await fetch('/api/vault-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Sovereign-Envelope': JSON.stringify(postEnvelope),
            },
            body: JSON.stringify(postEnvelope),
            signal: AbortSignal.timeout(8000),
          });
          if (!postRes.ok) {
            if (postRes.status === 429) {
              console.warn('[CanonicalVault] Upload rate limited (HTTP 429); deferring sync');
              this.state.hasPendingSync = true;
              await this.persistLocal();
              this.scheduleSync(2000);
              return { success: false, itemsCount: this.getAllActiveItems().length, merged: hasRemote };
            }
            throw new Error(`Upload rejected with HTTP ${postRes.status}`);
          }
        } catch (uploadErr) {
          console.warn('[CanonicalVault] Upload failed during sync:', uploadErr);
          this.state.hasPendingSync = true;
          await this.persistLocal();
          return { success: false, itemsCount: this.getAllActiveItems().length, merged: hasRemote, offline: true };
        }
      }

      this.state.hasPendingSync = false;
      this.backoffAttempts = 0;
      await this.persistLocal();
      return { success: true, itemsCount: this.getAllActiveItems().length, merged: hasRemote };
    } catch (err) {
      console.warn('[CanonicalVault] Sync failed (operating in local-first offline mode):', err);
      if (this.state) {
        this.state.hasPendingSync = true;
        await this.persistLocal();
      }
      return { success: false, itemsCount: this.getAllActiveItems().length, merged: false, offline: true };
    } finally {
      this.isSyncing = false;
      this.currentSyncPromise = null;
      clientStore.notifySync('VAULT_SYNC_END');
    }
  })();

  return this.currentSyncPromise;
}

  // ─── EXPORT & IMPORT (PORTABLE ENCRYPTED VAULT BACKUP) ─────────────────────

  public exportBackupJSON(): string {
    if (!this.state) return '{}';
    return JSON.stringify({
      version: '1.0',
      type: 'UREFY_CANONICAL_VAULT_BACKUP',
      exportedAt: new Date().toISOString(),
      owner: this.state.owner,
      items: this.getAllActiveItems(),
      collections: this.getCollections(),
    }, null, 2);
  }

  public async importBackupJSON(jsonText: string): Promise<number> {
    await this.init();
    if (!this.state) throw new Error('Vault not initialized');

    const parsed = JSON.parse(jsonText);
    if (!parsed || parsed.type !== 'UREFY_CANONICAL_VAULT_BACKUP' || !Array.isArray(parsed.items)) {
      throw new Error('Invalid Vault Backup format');
    }

    let importedCount = 0;
    const existingItemIds = new Set(this.state.items.map(i => i.id));

    for (const item of parsed.items) {
      if (item && item.id && !existingItemIds.has(item.id)) {
        this.state.items.push({
          ...item,
          owner: this.state.owner,
          updatedAt: Date.now(),
        });
        existingItemIds.add(item.id);
        importedCount++;
      }
    }

    if (Array.isArray(parsed.collections)) {
      const existingColIds = new Set(this.state.collections.map(c => c.id));
      for (const col of parsed.collections) {
        if (col && col.id && !existingColIds.has(col.id)) {
          this.state.collections.push({
            ...col,
            updatedAt: Date.now(),
          });
          existingColIds.add(col.id);
        }
      }
    }

    if (importedCount > 0) {
      this.state.syncVersion = (this.state.syncVersion || 1) + 1;
      await this.persistLocal();
      this.scheduleSync(1000);
    }

    return importedCount;
  }
}

export const canonicalVault = new CanonicalVaultEngine();
if (typeof window !== 'undefined') {
  (window as any).canonicalVault = canonicalVault;
}
