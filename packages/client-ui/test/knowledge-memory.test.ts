import { describe, expect, it } from 'vitest';
import { KnowledgeMemoryStore, MEMORY_LIMIT, type KnowledgeMemory } from '../src/knowledge-memory.js';

function createStorage() {
  const records = new Map<string, unknown>();
  let locked = false;
  return {
    records,
    lock: () => { locked = true; },
    isLocked: () => locked,
    savePrivateState: async (key: string, value: unknown) => { records.set(key, structuredClone(value)); },
    getPrivateState: async <T>(key: string) => (records.get(key) as T | undefined) ?? null,
  };
}

function setup(owner = 'owner-fp-01') {
  const storage = createStorage();
  const store = new KnowledgeMemoryStore(storage, async () => owner);
  return { storage, store };
}

const source = (id: string, extra: Partial<KnowledgeMemory['source']> = {}): KnowledgeMemory['source'] => ({
  kind: 'message', id, author: 'peer-fp', createdAt: 1_700_000_000_000, peer: 'peer-fp', branchId: 'main', ...extra,
});

describe('KnowledgeMemoryStore', () => {
  it('keeps a private snapshot with provenance and a content digest', async () => {
    const { store } = setup();
    await store.keep({ title: 'Zine plan', text: 'Print run of 200', source: source('msg-1') });

    const items = await store.list();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: 'Zine plan', text: 'Print run of 200', digest: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(items[0].source).toMatchObject({ kind: 'message', id: 'msg-1', peer: 'peer-fp' });
  });

  it('scopes saved knowledge per identity', async () => {
    const { storage, store } = setup('owner-a');
    await store.keep({ title: 'A note', text: 'only for A', source: source('msg-a') });

    const otherStore = new KnowledgeMemoryStore(storage, async () => 'owner-b');
    expect(await otherStore.list()).toEqual([]);
  });

  it('upserts the same source instead of duplicating it', async () => {
    const { store } = setup();
    await store.keep({ title: 'First title', text: 'one', source: source('msg-2') });
    await store.keep({ title: 'Updated title', text: 'two', source: source('msg-2') });

    const items = await store.list();
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Updated title');
  });

  it('returns copies so callers cannot mutate the encrypted store', async () => {
    const { store } = setup();
    await store.keep({ title: 'Immutable', text: 'value', source: source('msg-3') });
    const first = await store.list();
    first[0].title = 'tampered';
    expect((await store.list())[0].title).toBe('Immutable');
  });

  it('organizes snapshots into collections and removes them', async () => {
    const { store } = setup();
    await store.keep({ title: 'Collect me', text: 'text', source: source('msg-4') });
    const id = (await store.list())[0].id;

    await store.collect(id, '  Research  ');
    expect((await store.list())[0].collection).toBe('Research');

    await store.remove(id);
    expect(await store.list()).toEqual([]);
    await expect(store.collect('missing-id', 'Research')).rejects.toThrow(/no longer available/);
  });

  it('accepts http links and rejects unsafe or oversized input', async () => {
    const { store } = setup();
    await store.keep({ title: 'Read later', text: 'https://example.test/a', source: { kind: 'link', id: 'https://example.test/a', author: 'me', createdAt: 1, url: 'https://example.test/a' } });
    await expect(store.keep({ title: 'Bad', text: 'x', source: { kind: 'link', id: 'x', author: 'me', createdAt: 1, url: 'javascript:alert(1)' } }))
      .rejects.toThrow(/http or https/);
    await expect(store.keep({ title: '', text: 'x', source: source('msg-5') })).rejects.toThrow(/title/);
    await expect(store.keep({ title: 'Big', text: 'x'.repeat(100_001), source: source('msg-6') })).rejects.toThrow(/100,000/);
  });

  it('refuses to read or write while the vault is locked', async () => {
    const { storage, store } = setup();
    await store.keep({ title: 'Secret', text: 'text', source: source('msg-7') });
    storage.lock();
    await expect(store.list()).rejects.toThrow(/Unlock/);
  });

  it('enforces the local snapshot limit', async () => {
    const { store } = setup();
    for (let index = 0; index < MEMORY_LIMIT; index++) {
      await store.keep({ title: `Note ${index}`, text: 'text', source: source(`msg-limit-${index}`) });
    }
    await expect(store.keep({ title: 'Overflow', text: 'text', source: source('msg-overflow') }))
      .rejects.toThrow(/limit reached/);
  });

  it('aborts the write when the identity changes mid-save', async () => {
    const storage = createStorage();
    let calls = 0;
    // First read establishes owner-a; the pre-write check sees owner-b and must abort the write.
    const store = new KnowledgeMemoryStore(storage, async () => (++calls === 1 ? 'owner-a' : 'owner-b'));
    await expect(store.keep({ title: 'Racing', text: 'text', source: source('msg-race') }))
      .rejects.toThrow(/Identity changed/);
    expect(storage.records.size).toBe(0);
  });

  it('detects changed snapshot content while collection edits preserve integrity', async () => {
    const { store, storage } = setup();
    await store.keep({ title: 'Original', text: 'Original text', source: source('integrity') });
    const id = (await store.list())[0].id;
    await store.collect(id, 'Research');
    expect(await store.verify(id)).toBe(true);
    const saved = storage.records.get('knowledge:owner-fp-01') as { items: KnowledgeMemory[] };
    saved.items[0].text = 'Changed text';
    expect(await store.verify(id)).toBe(false);
  });

  it('keeps identical comment ids from different discussions separate', async () => {
    const { store } = setup();
    for (const postId of ['post-a', 'post-b']) await store.keep({ title: postId, text: 'Comment', source: source('same-id', { kind: 'comment', postId }) });
    expect(await store.list()).toHaveLength(2);
  });

  it('rejects invalid provenance and credential-bearing links', async () => {
    const { store } = setup();
    for (const extra of [{ kind: 'comment' as const }, { createdAt: Infinity }, { author: '' }, { peer: 'x'.repeat(161) }]) {
      await expect(store.keep({ title: 'Bad source', text: 'Text', source: source('bad-source', extra) })).rejects.toThrow(/source/);
    }
    await expect(store.keep({ title: 'Secret URL', text: 'Link', source: source('url', { kind: 'link', url: 'https://user:secret@example.test' }) })).rejects.toThrow(/credentials/);
  });

  it('rejects unsafe URLs read from encrypted legacy state', async () => {
    const { store, storage } = setup();
    await store.keep({ title: 'Link', text: 'Link', source: source('link', { url: 'https://example.test' }) });
    const saved = storage.records.get('knowledge:owner-fp-01') as { items: KnowledgeMemory[] };
    saved.items[0].source.url = 'javascript:alert(1)';
    await expect(store.list()).rejects.toThrow(/http or https/);
  });

  it('serializes concurrent saves without losing a snapshot', async () => {
    const { store } = setup();
    await Promise.all(Array.from({ length: 12 }, (_, i) => store.keep({ title: `Note ${i}`, text: 'Text', source: source(`concurrent-${i}`) })));
    expect(await store.list()).toHaveLength(12);
  });
});
