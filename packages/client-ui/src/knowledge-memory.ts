import { secureStorage } from './secure-storage.js';

export interface MemorySource {
  kind: 'post' | 'comment' | 'message' | 'branch' | 'link' | 'note';
  id: string;
  author: string;
  createdAt: number;
  channelId?: string;
  peer?: string;
  branchId?: string;
  url?: string;
  postId?: string;
}
export interface KnowledgeMemory {
  id: string;
  title: string;
  text: string;
  source: MemorySource;
  savedAt: number;
  digest: string;
  collection: string;
}
interface MemoryState { version: 1; owner: string; items: KnowledgeMemory[] }
interface PrivateStorage {
  savePrivateState(key: string, value: unknown): Promise<void>;
  getPrivateState<T>(key: string): Promise<T | null>;
  isLocked(): boolean;
}
export const MEMORY_LIMIT = 200;
export const MEMORY_BYTES = 4 * 1024 * 1024;

function validateSource(source: MemorySource): void {
  if (!source || !['post', 'comment', 'message', 'branch', 'link', 'note'].includes(source.kind) ||
    typeof source.id !== 'string' || !source.id || source.id.length > 2048 ||
    typeof source.author !== 'string' || !source.author || source.author.length > 160 ||
    !Number.isSafeInteger(source.createdAt) || source.createdAt < 0 || source.createdAt > 8.64e15 ||
    ['channelId', 'peer', 'branchId', 'postId'].some(key => {
      const value = source[key as keyof MemorySource];
      return value !== undefined && (typeof value !== 'string' || !value || value.length > 160);
    }) || (source.kind === 'comment' && !source.postId)) throw new Error('Invalid snapshot source');
  if (source.url !== undefined) {
    let url: URL;
    try { url = new URL(source.url); } catch { throw new Error('Only valid http or https links can be saved'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || source.url.length > 2048) {
      throw new Error('Only http or https links without credentials can be saved');
    }
  }
}

async function snapshotDigest(text: string, source: MemorySource): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ text, source }))))).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Small encrypted, identity-scoped snapshots. No cloud writes, remote fetching, or public indexing. */
export class KnowledgeMemoryStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: PrivateStorage, private owner: () => Promise<string>) {}

  private async load(): Promise<MemoryState> {
    const owner = await this.owner();
    if (this.storage.isLocked()) throw new Error('Unlock your Vault first');
    if (!owner) throw new Error('An unlocked identity is required');
    // Read through on every operation so another tab's completed save is not lost to a stale cache.
    const saved = await this.storage.getPrivateState<MemoryState>(`knowledge:${owner}`);
    if (this.storage.isLocked() || owner !== await this.owner()) throw new Error('Identity changed before reading');
    if (saved && (saved.version !== 1 || saved.owner !== owner || !Array.isArray(saved.items))) throw new Error('Saved knowledge could not be read');
    if (saved) {
      if (saved.items.length > MEMORY_LIMIT || new TextEncoder().encode(JSON.stringify(saved)).byteLength > MEMORY_BYTES) throw new Error('Saved knowledge exceeds local limits');
      for (const item of saved.items) {
        if (!item || typeof item.id !== 'string' || !item.id || typeof item.title !== 'string' ||
          typeof item.text !== 'string' || typeof item.collection !== 'string' ||
          typeof item.digest !== 'string' || !/^[a-f0-9]{64}$/.test(item.digest) ||
          !Number.isSafeInteger(item.savedAt) || item.savedAt < 0 || item.savedAt > 8.64e15) throw new Error('Saved knowledge could not be read');
        validateSource(item.source);
      }
    }
    return saved || { version: 1, owner, items: [] };
  }

  public async list(): Promise<KnowledgeMemory[]> {
    await this.queue.catch(() => {});
    return structuredClone((await this.load()).items);
  }

  private mutate(change: (state: MemoryState) => Promise<void> | void, expectedOwner?: string): Promise<void> {
    const run = async () => {
      const state = structuredClone(await this.load());
      if (expectedOwner && state.owner !== expectedOwner) throw new Error('Identity changed before saving');
      await change(state);
      if (state.owner !== await this.owner() || this.storage.isLocked()) throw new Error('Identity changed before saving');
      if (state.items.length > MEMORY_LIMIT || new TextEncoder().encode(JSON.stringify(state)).byteLength > MEMORY_BYTES) {
        throw new Error('Local knowledge limit reached. Remove a snapshot before saving another.');
      }
      await this.storage.savePrivateState(`knowledge:${state.owner}`, state);
    };
    const lockedRun = () => typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('urefy-knowledge-write', run) : run();
    const result = this.queue.catch(() => {}).then(lockedRun);
    this.queue = result;
    return result;
  }

  public async keep(input: { title: string; text: string; source: MemorySource }): Promise<void> {
    const title = input.title.trim();
    if (!title || title.length > 160 || !input.text.trim() || input.text.length > 100000) throw new Error('Use a title and a snapshot under 100,000 characters');
    validateSource(input.source);
    const owner = await this.owner();
    if (this.storage.isLocked()) throw new Error('Unlock your Vault first');
    if (!owner) throw new Error('An unlocked identity is required');
    const source = structuredClone(input.source);
    const text = input.text;
    const digest = await snapshotDigest(text, source);
    await this.mutate(state => {
      const existing = state.items.find(item => item.source.kind === source.kind && item.source.id === source.id && item.source.peer === source.peer && item.source.postId === source.postId && item.source.channelId === source.channelId);
      const item: KnowledgeMemory = { id: existing?.id || crypto.randomUUID(), title, text, source, savedAt: Date.now(), digest, collection: existing?.collection || '' };
      state.items = [item, ...state.items.filter(entry => entry.id !== item.id)];
    }, owner);
  }

  public async verify(id: string): Promise<boolean> {
    const item = (await this.list()).find(entry => entry.id === id);
    if (!item) throw new Error('Snapshot is no longer available');
    return item.digest === await snapshotDigest(item.text, item.source);
  }

  public remove(id: string): Promise<void> {
    return this.mutate(state => { state.items = state.items.filter(item => item.id !== id); });
  }

  public collect(id: string, collection: string): Promise<void> {
    if (collection.trim().length > 60) return Promise.reject(new Error('Collection names can have up to 60 characters'));
    return this.mutate(state => {
      const item = state.items.find(item => item.id === id);
      if (!item) throw new Error('Snapshot is no longer available');
      item.collection = collection.trim();
    });
  }
}

export const knowledgeMemory = new KnowledgeMemoryStore(secureStorage, async () => {
  const { clientStore } = await import('./client-state.js');
  await clientStore.identityPersistence;
  return clientStore.keypair.fingerprint;
});
