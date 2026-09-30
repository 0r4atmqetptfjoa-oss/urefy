import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { executeFullBackup, inventoryBucket, FULL_DAILY_KEY } from '../functions/api/_full-backup.js';
import { onRequestPost as recovery } from '../functions/api/full-backup-recovery.js';

const schema = [{ type: 'table', name: 'posts', tbl_name: 'posts', sql: 'CREATE TABLE posts (id TEXT PRIMARY KEY)' }];
function fixture() {
  const rows = [{ id: 'test-post' }];
  const db: any = {
    prepare: vi.fn((sql: string) => ({ sql, all: async () => ({ success: true, results: schema, meta: { size_after: 40960 } }), first: async () => null })),
    batch: vi.fn(async (statements: any[]) => statements[0].sql.startsWith('PRAGMA')
      ? [{ success: true, results: [{ page_count: 10 }] }, { success: true, results: [{ page_size: 4096 }] }]
      : [{ success: true, results: schema }, { success: true, results: rows }]),
  };
  const makeBucket = () => ({ list: vi.fn(async () => ({ objects: [], truncated: false })), get: vi.fn(), put: vi.fn(async () => ({ key: 'saved' })) });
  const storage = makeBucket(), vault = makeBucket();
  const env: any = { DB: db, STORAGE_BUCKET: storage, VAULT_BUCKET: vault, AWS_REGION: 'eu-central-1', AWS_S3_BUCKET: 'test-bucket', AWS_ACCESS_KEY_ID: 'fake-test-id', AWS_SECRET_ACCESS_KEY: 'fake-test-secret' };
  const protect = vi.fn(async (plain: Uint8Array) => ({ encryptedPayload: new Uint8Array(plain.length + 28), checksumSha256: 'a'.repeat(64) }));
  return { db, storage, vault, env, protect };
}
describe('complete infrastructure backup', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200, headers: { etag: 'test' } }))));
  afterEach(() => vi.unstubAllGlobals());
  it('captures all discovered application tables and commits the encrypted pointer last', async () => {
    const f = fixture();
    const result = await executeFullBackup(f.env, f.protect, '2026-09-30T06:00:00.000Z');
    expect(result.tableCount).toBe(1); expect(result.totalRecords).toBe(1);
    expect(f.vault.put.mock.calls.at(-1)![0]).toBe(FULL_DAILY_KEY);
    expect(f.db.prepare.mock.calls.every(([sql]) => !/INSERT|DELETE|UPDATE|DROP|ALTER/i.test(sql))).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('paginates inventories and excludes archive prefixes from both buckets', async () => {
    const bucket: any = { list: vi.fn().mockResolvedValueOnce({ objects: [{ key: 'backups/old.enc' }, { key: 'dr/x' }, { key: 'media/a', size: 3 }], truncated: true, cursor: 'page2' }).mockResolvedValueOnce({ objects: [{ key: 'media/b', size: 4 }], truncated: false }) };
    expect((await inventoryBucket(bucket)).map(x => x.key)).toEqual(['media/a', 'media/b']);
    expect(bucket.list.mock.calls[1][0].cursor).toBe('page2');
  });
  it('rejects repeating pagination cursors', async () => {
    const bucket: any = { list: vi.fn(async () => ({ objects: [], truncated: true, cursor: 'repeat' })) };
    await expect(inventoryBucket(bucket)).rejects.toThrow('CURSOR');
  });
  it('rejects unsupported virtual tables before uploading anything', async () => {
    const f = fixture();
    f.db.prepare.mockImplementation((sql: string) => ({ sql, all: async () => ({ success: true, results: [{ ...schema[0], sql: 'CREATE VIRTUAL TABLE v USING fts5(text)' }], meta: { size_after: 40960 } }) }));
    await expect(executeFullBackup(f.env, f.protect, 'now')).rejects.toThrow('VIRTUAL');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects a schema change during the transactional read', async () => {
    const f = fixture();
    f.db.batch.mockImplementation(async (s: any[]) => s[0].sql.startsWith('PRAGMA') ? [{ success: true, results: [{ page_count: 1 }] }, { success: true, results: [{ page_size: 4096 }] }] : [{ success: true, results: [] }, { success: true, results: [] }]);
    await expect(executeFullBackup(f.env, f.protect, 'now')).rejects.toThrow('SCHEMA_CHANGED');
  });
  it('fails without committing a manifest when an object changes', async () => {
    const f = fixture();
    f.storage.list.mockResolvedValue({ objects: [{ key: 'media/a', size: 3, etag: 'original' }], truncated: false });
    f.storage.get.mockResolvedValue(null);
    await expect(executeFullBackup(f.env, f.protect, 'now')).rejects.toThrow('OBJECT_CHANGED');
    expect(f.vault.put).not.toHaveBeenCalled();
  });
  it('encrypts file parts and records hashes without changing source objects', async () => {
    const f = fixture();
    const item = { key: 'media/a', size: 3, etag: 'original', version: 'v1' };
    f.storage.list.mockResolvedValue({ objects: [item], truncated: false });
    f.storage.get.mockResolvedValue({ ...item, arrayBuffer: async () => Uint8Array.of(1, 2, 3).buffer });
    const result = await executeFullBackup(f.env, f.protect, 'now');
    expect(result.objectCount).toBe(1); expect(result.mediaBytes).toBe(3); expect(result.partCount).toBe(1);
    expect(f.storage.put).not.toHaveBeenCalled(); expect(f.vault.put.mock.calls.at(-1)![0]).toBe(FULL_DAILY_KEY);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('does not commit a successful pointer on S3 failure', async () => {
    const f = fixture(); vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403 })));
    await expect(executeFullBackup(f.env, f.protect, 'now')).rejects.toThrow('403');
    expect(f.vault.put).not.toHaveBeenCalled();
  });
  it('denies anonymous full recovery and keeps authenticated export disabled without a fixed owner recipient', async () => {
    const env: any = { CRON_SECRET: 'test-token-'.repeat(4) };
    expect((await recovery({ request: new Request('https://urefy.com/api/full-backup-recovery', { method: 'POST' }), env })).status).toBe(401);
    expect((await recovery({ request: new Request('https://urefy.com/api/full-backup-recovery', { method: 'POST', headers: { 'X-Cron-Secret': env.CRON_SECRET } }), env })).status).toBe(503);
  });
});
