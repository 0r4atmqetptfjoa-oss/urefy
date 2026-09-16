import { secureStorage } from './secure-storage.js';

export interface MemorySource {
  kind: 'post' | 'message' | 'branch' | 'link' | 'note';
  id: string;
  author: string;
  createdAt: number;
  channelId?: string;
  peer?: string;
  branchId?: string;
  url?: string;
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

/** Small encrypted, identity-scoped snapshots. No cloud writes, remote fetching, or public indexing. */
export class KnowledgeMemoryStore {
  private state: MemoryState | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: PrivateStorage, private owner: () => Promise<string>) {}

  private async load(): Promise<MemoryState> {
    if (this.storage.isLocked()) { this.state = null; throw new Error('Unlock your Vault first'); }
    const owner = await this.owner();
    if (!owner) throw new Error('An unlocked identity is required');
    // Read through on every operation so another tab's completed save is not lost to a stale cache.
    const saved = await this.storage.getPrivateState<MemoryState>(`knowledge:${owner}`);
    if (saved && (saved.version !== 1 || saved.owner !== owner || !Array.isArray(saved.items))) throw new Error('Saved knowledge could not be read');
    this.state = saved || { version: 1, owner, items: [] };
    return this.state;
  }

  public async list(): Promise<KnowledgeMemory[]> {
    await this.queue.catch(() => {});
    return structuredClone((await this.load()).items);
  }

  private mutate(change: (state: MemoryState) => Promise<void> | void): Promise<void> {
    const run = async () => {
      const state = structuredClone(await this.load());
      await change(state);
      if (state.owner !== await this.owner() || this.storage.isLocked()) throw new Error('Identity changed before saving');
      if (state.items.length > MEMORY_LIMIT || new TextEncoder().encode(JSON.stringify(state)).byteLength > MEMORY_BYTES) {
        throw new Error('Local knowledge limit reached. Remove a snapshot before saving another.');
      }
      await this.storage.savePrivateState(`knowledge:${state.owner}`, state);
      this.state = state;
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
    if (input.source.url && !/^https?:\/\//i.test(input.source.url)) throw new Error('Only http or https links can be saved');
    const source = structuredClone(input.source);
    const text = input.text;
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ text, source }))))).map(byte => byte.toString(16).padStart(2, '0')).join('');
    await this.mutate(state => {
      const existing = state.items.find(item => item.source.kind === source.kind && item.source.id === source.id && item.source.peer === source.peer);
      const item: KnowledgeMemory = { id: existing?.id || crypto.randomUUID(), title, text, source, savedAt: Date.now(), digest, collection: existing?.collection || '' };
      state.items = [item, ...state.items.filter(entry => entry.id !== item.id)];
    });
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
