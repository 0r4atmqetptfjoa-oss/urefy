/**
 * @file canonical-vault.ts
 * @package @aetheris/client-ui
 * @description 2027 Unified Zero-Knowledge Canonical Vault Engine.
 * Consolidates Bookmarks, Knowledge Memory snapshots, Private Notes, and R2/D1 Cross-Device Sync.
 */

import { deriveVaultKey, mnemonicToSeed } from '@aetheris/core-crypto';
import { secureStorage, hexToBytes, bytesToHex } from './secure-storage.js';
import { clientStore, ClientPost } from './client-state.js';
import { toastManager } from './toast.js';
import { t } from './i18n.js';

export type VaultItemType = 'post' | 'note' | 'link' | 'attachment' | 'snapshot';

export interface CanonicalVaultItem {
  id: string;
  owner: string;
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
  content: string;
  collectionId?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  version: number;
  baseVersion?: number;
  deleted?: boolean;
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
    name: 'Cryptography & ZK Research',
    description: 'Saved papers, proofs, and protocol notes',
    icon: '🔐',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  },
  {
    id: 'archived-posts',
    name: 'Saved Discussions',
    description: 'Archived community pulses and threads',
    icon: '📌',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  },
  {
    id: 'code-snippets',
    name: 'Code & Sandboxes',
    description: 'Saved algorithms, contracts, and scripts',
    icon: '💻',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  },
  {
    id: 'media-vault',
    name: 'Media & Attachments',
    description: 'Encrypted images and binaries',
    icon: '🖼️',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  },
];

export class CanonicalVaultEngine {
  public state: CanonicalVaultState = {
    version: 1,
    syncVersion: 0,
    owner: '',
    items: [],
    collections: [...DEFAULT_VAULT_COLLECTIONS],
    lastSyncedAt: 0,
    hasPendingSync: false,
  };

  private initialized = false;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.attachNetworkListeners();
  }

  private attachNetworkListeners(): void {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('online', () => {
        if (this.hasPendingLocalMutations()) {
          void this.sync();
        }
      });
    }
  }

  public hasPendingLocalMutations(): boolean {
    return Boolean(this.state.hasPendingSync);
  }

  private getActiveOwner(): string {
    return clientStore?.keypair?.fingerprint || 'local-sovereign-owner';
  }

  public async init(force = false): Promise<void> {
    const owner = this.getActiveOwner();
    if (this.initialized && !force && this.state.owner === owner) return;

    const saved = await secureStorage.getPrivateState<CanonicalVaultState>(`canonical_vault:${owner}`);
    if (saved && saved.version === 1) {
      this.state = saved;
      if (!this.state.collections || this.state.collections.length === 0) {
        this.state.collections = [...DEFAULT_VAULT_COLLECTIONS];
      }
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
      await this.migrateLegacyData(owner);
      await this.persistLocal();
    }
    this.initialized = true;
  }

  public async getVaultCryptoKey(): Promise<CryptoKey> {
    const mnemonic = clientStore.mnemonic;
    const seed = mnemonic ? mnemonicToSeed(mnemonic) : new Uint8Array(32);
    const rawVaultKey = deriveVaultKey(seed.subarray(0, 32));
    return crypto.subtle.importKey('raw', rawVaultKey as BufferSource, { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  private async persistLocal(): Promise<void> {
    const owner = this.getActiveOwner();
    this.state.owner = owner;
    await secureStorage.savePrivateState(`canonical_vault:${owner}`, this.state);
  }

  private async migrateLegacyData(owner: string): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const rawBm = localStorage.getItem('aetheris_bookmarks_vault');
        if (rawBm) {
          const parsed = JSON.parse(rawBm);
          if (Array.isArray(parsed)) {
            for (const bm of parsed) {
              if (bm && bm.postId && !this.isSaved(bm.postId)) {
                this.state.items.push({
                  id: `vault_post_${bm.postId}`,
                  owner,
                  type: 'post',
                  source: {
                    kind: 'post',
                    id: bm.postId,
                    author: bm.postAuthor || '',
                    channelId: bm.channelId || '',
                  },
                  title: bm.postTitle || 'Saved Discussion',
                  content: bm.note || '',
                  tags: Array.isArray(bm.tags) ? bm.tags : [],
                  createdAt: bm.savedAt || Date.now(),
                  updatedAt: Date.now(),
                  version: 1,
                });
              }
            }
          }
        }
      }
    } catch {
      // ignore migration errors
    }
  }

  public isSaved(postId: string): boolean {
    return this.state.items.some(
      (item) => !item.deleted && item.type === 'post' && (item.id === postId || item.source?.id === postId || item.id === `vault_post_${postId}`)
    );
  }

  public async savePost(post: Partial<ClientPost> & { id: string }): Promise<void> {
    await this.init();
    const owner = this.getActiveOwner();
    const existing = this.state.items.find(
      (i) => i.type === 'post' && (i.source?.id === post.id || i.id === `vault_post_${post.id}`)
    );
    const now = Date.now();

    if (existing) {
      existing.deleted = false;
      existing.title = post.title || existing.title;
      existing.content = post.content || existing.content;
      existing.updatedAt = now;
      existing.version += 1;
    } else {
      this.state.items.unshift({
        id: `vault_post_${post.id}`,
        owner,
        type: 'post',
        source: {
          kind: 'post',
          id: post.id,
          author: post.authorFingerprint || '',
          channelId: post.channelId || '',
          createdAt: post.createdAt || now,
        },
        title: post.title || 'Saved Pulse',
        content: post.content || '',
        tags: post.flair ? [post.flair.toLowerCase()] : [],
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    this.state.hasPendingSync = true;
    await this.persistLocal();
    this.scheduleSync();
    clientStore.notify('VAULT_UPDATED', { postId: post.id, saved: true });
  }

  public async unsavePost(postId: string): Promise<void> {
    await this.init();
    const item = this.state.items.find(
      (i) => !i.deleted && i.type === 'post' && (i.id === postId || i.source?.id === postId || i.id === `vault_post_${postId}`)
    );
    if (item) {
      item.deleted = true;
      item.updatedAt = Date.now();
      item.version += 1;
      this.state.hasPendingSync = true;
      await this.persistLocal();
      this.scheduleSync();
      clientStore.notify('VAULT_UPDATED', { postId, saved: false });
    }
  }

  public isMessageSaved(messageId: string): boolean {
    return this.state.items.some(
      (i) => !i.deleted && i.source?.kind === 'message' && i.source?.id === messageId
    );
  }

  public async saveMessage(message: {
    id: string;
    content: string;
    authorFingerprint?: string;
    authorName?: string;
    channelId?: string;
    peer?: string;
    createdAt?: number;
  }): Promise<void> {
    await this.init();
    const owner = this.getActiveOwner();
    const now = Date.now();
    const existing = this.state.items.find(
      (i) => i.source?.kind === 'message' && i.source?.id === message.id
    );

    if (existing) {
      existing.deleted = false;
      existing.content = message.content;
      existing.updatedAt = now;
      existing.version += 1;
    } else {
      this.state.items.unshift({
        id: `vault_msg_${message.id}`,
        owner,
        type: 'snapshot',
        source: {
          kind: 'message',
          id: message.id,
          author: message.authorName || message.authorFingerprint || 'Peer',
          channelId: message.channelId,
          peer: message.peer,
          createdAt: message.createdAt || now,
        },
        title: `Message from ${message.authorName || message.authorFingerprint || 'Peer'}`,
        content: message.content,
        tags: ['message-snapshot'],
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }

    this.state.hasPendingSync = true;
    await this.persistLocal();
    this.scheduleSync();
    toastManager.success(t('vault.messageSaved', undefined, 'Saved to encrypted Vault'));
  }

  public async unsaveMessage(messageId: string): Promise<void> {
    await this.init();
    const existing = this.state.items.find(
      (i) => !i.deleted && i.source?.kind === 'message' && i.source?.id === messageId
    );
    if (existing) {
      existing.deleted = true;
      existing.updatedAt = Date.now();
      existing.version += 1;
      this.state.hasPendingSync = true;
      await this.persistLocal();
      this.scheduleSync();
    }
  }

  public getSavedPosts(): CanonicalVaultItem[] {
    return this.state.items.filter((i) => !i.deleted && i.type === 'post');
  }

  public getSavedPostIds(): Set<string> {
    return new Set(
      this.getSavedPosts()
        .map((i) => i.source?.id || i.id.replace(/^vault_post_/, ''))
        .filter(Boolean)
    );
  }

  public async saveNote(
    title: string,
    content: string,
    collectionId = '',
    tags: string[] = [],
    existingId?: string
  ): Promise<CanonicalVaultItem> {
    await this.init();
    const owner = this.getActiveOwner();
    const now = Date.now();

    if (existingId) {
      const found = this.state.items.find((i) => i.id === existingId);
      if (found) {
        found.title = title;
        found.content = content;
        found.collectionId = collectionId;
        found.tags = tags;
        found.deleted = false;
        found.updatedAt = now;
        found.version += 1;
        this.state.hasPendingSync = true;
        await this.persistLocal();
        this.scheduleSync();
        return found;
      }
    }

    const note: CanonicalVaultItem = {
      id: `note-${now}-${Math.random().toString(36).slice(2, 7)}`,
      owner,
      type: 'note',
      source: { kind: 'manual', createdAt: now },
      title: title.trim() || 'Untitled Sovereign Note',
      content,
      collectionId,
      tags,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    this.state.items.unshift(note);
    this.state.hasPendingSync = true;
    await this.persistLocal();
    this.scheduleSync();
    return note;
  }

  public async updateNote(
    id: string,
    updates: Partial<Pick<CanonicalVaultItem, 'title' | 'content' | 'collectionId' | 'tags'>>
  ): Promise<void> {
    await this.init();
    const found = this.state.items.find((i) => i.id === id && !i.deleted);
    if (!found) return;
    if (updates.title !== undefined) found.title = updates.title;
    if (updates.content !== undefined) found.content = updates.content;
    if (updates.collectionId !== undefined) found.collectionId = updates.collectionId;
    if (updates.tags !== undefined) found.tags = updates.tags;
    found.updatedAt = Date.now();
    found.version += 1;
    this.state.hasPendingSync = true;
    await this.persistLocal();
    this.scheduleSync();
  }

  public async deleteItem(id: string): Promise<void> {
    await this.init();
    const item = this.state.items.find((i) => i.id === id);
    if (item) {
      item.deleted = true;
      item.updatedAt = Date.now();
      item.version += 1;
      this.state.hasPendingSync = true;
      await this.persistLocal();
      this.scheduleSync();
    }
  }

  public async deleteNote(id: string): Promise<void> {
    await this.deleteItem(id);
  }

  public getNotes(): CanonicalVaultItem[] {
    return this.state.items.filter((i) => !i.deleted && i.type === 'note');
  }

  public getAllActiveItems(): CanonicalVaultItem[] {
    return this.state.items.filter((i) => !i.deleted);
  }

  public getCollections(): CanonicalVaultCollection[] {
    return this.state.collections.filter((c) => !c.deleted);
  }

  public async createCollection(
    name: string,
    description: string,
    icon = '📁'
  ): Promise<CanonicalVaultCollection> {
    await this.init();
    const now = Date.now();
    const col: CanonicalVaultCollection = {
      id: `col-${now}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || 'New Collection',
      description: description.trim(),
      icon,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.state.collections.push(col);
    this.state.hasPendingSync = true;
    await this.persistLocal();
    this.scheduleSync();
    return col;
  }

  public async renameCollection(id: string, newName: string, newDesc?: string): Promise<void> {
    await this.init();
    const col = this.state.collections.find((c) => c.id === id && !c.deleted);
    if (!col) return;
    col.name = newName.trim() || col.name;
    if (newDesc !== undefined) col.description = newDesc.trim();
    col.updatedAt = Date.now();
    col.version += 1;
    this.state.hasPendingSync = true;
    await this.persistLocal();
    this.scheduleSync();
  }

  public async deleteCollection(id: string, keepItems = true): Promise<void> {
    await this.init();
    const col = this.state.collections.find((c) => c.id === id);
    if (col) {
      col.deleted = true;
      col.updatedAt = Date.now();
      col.version += 1;
    }
    for (const item of this.state.items) {
      if (item.collectionId === id) {
        if (keepItems) {
          item.collectionId = '';
        } else {
          item.deleted = true;
        }
        item.updatedAt = Date.now();
        item.version += 1;
      }
    }
    this.state.hasPendingSync = true;
    await this.persistLocal();
    this.scheduleSync();
  }

  public async moveItemToCollection(itemId: string, collectionId: string): Promise<void> {
    await this.init();
    const item = this.state.items.find((i) => i.id === itemId && !i.deleted);
    if (item) {
      item.collectionId = collectionId;
      item.updatedAt = Date.now();
      item.version += 1;
      this.state.hasPendingSync = true;
      await this.persistLocal();
      this.scheduleSync();
    }
  }

  public search(query: string): CanonicalVaultItem[] {
    const q = query.trim().toLowerCase();
    const active = this.getAllActiveItems();
    if (!q) return active;
    return active.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  private scheduleSync(delayMs = 2000): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      void this.sync();
    }, delayMs);
  }

  public async sync(_force = false): Promise<{ synced: boolean; version: number; itemCount: number }> {
    await this.init();
    try {
      const key = await this.getVaultCryptoKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(JSON.stringify(this.state));
      const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
      const ciphertext = bytesToHex(new Uint8Array(cipherBuf));
      const ivHex = bytesToHex(iv);

      const nextVersion = (this.state.syncVersion || 0) + 1;
      const envelope = clientStore.createSignedEnvelope({
        owner: this.getActiveOwner(),
        version: nextVersion,
        itemCount: this.getAllActiveItems().length,
        ciphertext,
        iv: ivHex,
      });

      const res = await fetch('/api/vault-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelope }),
      });

      if (res.ok) {
        this.state.syncVersion = nextVersion;
        this.state.lastSyncedAt = Date.now();
        this.state.hasPendingSync = false;
        await this.persistLocal();
        return { synced: true, version: nextVersion, itemCount: this.getAllActiveItems().length };
      }
    } catch {
      // keep pending sync flag for next online window
    }
    return { synced: false, version: this.state.syncVersion, itemCount: this.getAllActiveItems().length };
  }

  public exportBackupJSON(): string {
    return JSON.stringify({
      format: 'UREFY_CANONICAL_VAULT_BACKUP',
      ...this.state,
    }, null, 2);
  }

  public async importBackupJSON(jsonText: string): Promise<number> {
    await this.init();
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error('Invalid Vault Backup format');
    }
    if (!parsed || !Array.isArray(parsed.items)) {
      throw new Error('Invalid Vault Backup format: Invalid Canonical Vault backup JSON');
    }
    let importedCount = 0;
    for (const incoming of parsed.items) {
      if (!incoming || !incoming.id) continue;
      const existing = this.state.items.find((i) => i.id === incoming.id);
      if (!existing) {
        this.state.items.push(incoming);
        importedCount++;
      } else if ((incoming.updatedAt || 0) > (existing.updatedAt || 0)) {
        Object.assign(existing, incoming);
        importedCount++;
      }
    }
    this.state.hasPendingSync = true;
    await this.persistLocal();
    return importedCount;
  }
}

export const canonicalVault = new CanonicalVaultEngine();
