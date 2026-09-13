import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  onRequestPost as handleBackupPost,
  onRequestGet as handleBackupGet,
  onRequestOptions as handleBackupOptions,
  scheduled as handleScheduledBackup,
  executeBackup,
  dumpD1Tables,
  compressGzip,
  decompressGzip,
  deriveBackupKey,
  encryptBackupPayload,
  decryptBackupPayload,
  rotateOldSnapshots,
  restoreBackup,
  DAILY_BACKUP_KEY,
  BACKUP_PREFIX,
  RETENTION_PERIOD_MS,
  BACKUP_TABLES,
  resetBackupSnapshots,
  inMemoryBackupSnapshots,
  globalLastBackupMetadata,
} from '../functions/api/cron-backup.js';
import {
  R2Bucket,
  R2Object,
  D1Database,
  D1PreparedStatement,
  D1Result,
  globalPostsStore,
  globalChannelsStore,
  globalMessagesStore,
  globalSpentNullifiers,
  globalPushSubscriptionsStore,
} from '../functions/api/_db.js';
import { DEFAULT_ADMIN_PIN } from '../functions/api/admin.js';

// ─── MOCK CLOUDFLARE R2 BUCKET ───────────────────────────────────────────────

class MockR2Bucket implements R2Bucket {
  public objects = new Map<string, { data: Uint8Array; metadata?: any; uploaded: Date }>();
  public listCalledCount = 0;
  public deleteCalledCount = 0;
  public putCalledCount = 0;

  async head(key: string): Promise<R2Object | null> {
    const obj = this.objects.get(key);
    if (!obj) return null;
    return {
      key,
      version: '1',
      size: obj.data.byteLength,
      etag: 'etag-' + key,
      httpEtag: '"etag-' + key + '"',
      checksums: {},
      uploaded: obj.uploaded,
      customMetadata: obj.metadata?.customMetadata,
    };
  }

  async get(key: string): Promise<any> {
    const obj = this.objects.get(key);
    if (!obj) return null;
    return {
      key,
      size: obj.data.byteLength,
      uploaded: obj.uploaded,
      customMetadata: obj.metadata?.customMetadata,
      arrayBuffer: async () => obj.data.buffer,
      text: async () => new TextDecoder().decode(obj.data),
      json: async () => JSON.parse(new TextDecoder().decode(obj.data)),
    };
  }

  async put(key: string, value: any, options?: any): Promise<R2Object | null> {
    this.putCalledCount++;
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    const uploaded = options?.uploaded || new Date();
    this.objects.set(key, { data: bytes, metadata: options, uploaded });
    return {
      key,
      version: '1',
      size: bytes.byteLength,
      etag: 'etag-' + key,
      httpEtag: '"etag-' + key + '"',
      checksums: {},
      uploaded,
      customMetadata: options?.customMetadata,
    };
  }

  async delete(keys: string | string[]): Promise<void> {
    this.deleteCalledCount++;
    const arr = Array.isArray(keys) ? keys : [keys];
    for (const k of arr) {
      this.objects.delete(k);
    }
  }

  async list(options?: any): Promise<{ objects: R2Object[]; truncated: boolean }> {
    this.listCalledCount++;
    const prefix = options?.prefix || '';
    const result: R2Object[] = [];
    for (const [key, item] of this.objects.entries()) {
      if (!prefix || key.startsWith(prefix)) {
        result.push({
          key,
          version: '1',
          size: item.data.byteLength,
          etag: 'etag-' + key,
          httpEtag: '"etag-' + key + '"',
          checksums: {},
          uploaded: item.uploaded,
          customMetadata: item.metadata?.customMetadata,
        });
      }
    }
    return { objects: result, truncated: false };
  }
}

// ─── MOCK CLOUDFLARE D1 DATABASE ─────────────────────────────────────────────

class MockD1Database implements D1Database {
  public tablesData: Record<string, any[]> = {};

  constructor(initialData: Record<string, any[]> = {}) {
    this.tablesData = initialData;
  }

  prepare(query: string): D1PreparedStatement {
    const self = this;
    const match = query.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    const tableName = match ? match[1] : '';

    return {
      bind(..._values: any[]) {
        return this;
      },
      async first<T = unknown>(_colName?: string): Promise<T | null> {
        const rows = self.tablesData[tableName] || [];
        return (rows[0] as T) || null;
      },
      async run<T = unknown>(): Promise<any> {
        return { success: true, meta: {} };
      },
      async all<T = unknown>(): Promise<D1Result<T>> {
        const rows = self.tablesData[tableName] || [];
        return {
          results: rows as T[],
          success: true,
          meta: { duration: 1.2 },
        };
      },
      async raw<T = unknown>(): Promise<T[]> {
        return (self.tablesData[tableName] || []) as T[];
      },
    };
  }

  async batch<T = unknown>(_statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    return [];
  }

  async exec(_query: string): Promise<any> {
    return { count: 0, duration: 1 };
  }
}

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe('Automated D1 SQLite to Cloudflare R2 Encrypted Backup Engine (Item 19)', () => {
  beforeEach(() => {
    resetBackupSnapshots();
    globalSpentNullifiers.clear();
    globalSpentNullifiers.add('nullifier-alpha-001');
    globalSpentNullifiers.add('nullifier-beta-002');
  });

  afterEach(() => {
    resetBackupSnapshots();
    vi.restoreAllMocks();
  });

  describe('1. Table Extraction & Manifest Serialization', () => {
    it('dumps all 5 required tables (posts, channels, messages, nullifiers, push_subscriptions)', async () => {
      const { tables, counts, totalRecords } = await dumpD1Tables();

      expect(tables).toHaveProperty('posts');
      expect(tables).toHaveProperty('channels');
      expect(tables).toHaveProperty('messages');
      expect(tables).toHaveProperty('nullifiers');
      expect(tables).toHaveProperty('push_subscriptions');

      expect(Array.isArray(tables.posts)).toBe(true);
      expect(Array.isArray(tables.channels)).toBe(true);
      expect(Array.isArray(tables.messages)).toBe(true);
      expect(Array.isArray(tables.nullifiers)).toBe(true);
      expect(Array.isArray(tables.push_subscriptions)).toBe(true);

      // Verify nullifiers populated from spent registry
      expect(tables.nullifiers.length).toBeGreaterThanOrEqual(2);
      expect(tables.nullifiers.some((n: any) => n.nullifier === 'nullifier-alpha-001')).toBe(true);

      expect(totalRecords).toBe(
        counts.posts + counts.channels + counts.messages + counts.nullifiers + counts.push_subscriptions
      );
    });

    it('queries tables from D1Database when env.DB binding is present', async () => {
      const mockD1 = new MockD1Database({
        posts: [{ id: 'post-d1-1', title: 'D1 Post Title', content: 'D1 Content' }],
        channels: [{ id: 'ch-d1-1', name: 'd1-channel' }],
        messages: [{ id: 'msg-d1-1', text: 'Hello D1' }],
        nullifiers: [{ nullifier: 'd1-nullifier-xyz' }],
        push_subscriptions: [{ endpoint: 'https://push.example.com/sub/1' }],
      });

      const { tables, counts } = await dumpD1Tables({ DB: mockD1 });

      expect(counts.posts).toBe(1);
      expect(tables.posts[0].id).toBe('post-d1-1');
      expect(counts.channels).toBe(1);
      expect(counts.messages).toBe(1);
      expect(counts.nullifiers).toBe(1);
      expect(counts.push_subscriptions).toBe(1);
    });
  });

  describe('2. Gzip Compression and AES-256-GCM Encryption', () => {
    it('compresses JSON payload with Gzip and decompresses back with byte-for-byte fidelity', async () => {
      const testJson = JSON.stringify({
        space: 'pulse',
        records: Array.from({ length: 100 }, (_, i) => ({
          id: `item-${i}`,
          data: `Payload string with repeated text compression potential ${i}`,
        })),
      });
      const originalBytes = new TextEncoder().encode(testJson);

      const compressed = await compressGzip(originalBytes);
      expect(compressed.byteLength).toBeLessThan(originalBytes.byteLength);

      const decompressed = await decompressGzip(compressed);
      const reconstructedText = new TextDecoder().decode(decompressed);

      expect(reconstructedText).toBe(testJson);
    });

    it('encrypts payload with AES-256-GCM and decrypts back to original bytes using backup key', async () => {
      const secret = 'custom-sovereign-vault-key-test-2026';
      const sampleData = new TextEncoder().encode('Confidential SQLite Database Dump Payload');

      const { encryptedPayload, iv, checksumSha256 } = await encryptBackupPayload(sampleData, secret);

      // IV must be 12 bytes
      expect(iv.byteLength).toBe(12);
      // Encrypted payload must have IV prepended
      expect(encryptedPayload.byteLength).toBeGreaterThan(sampleData.byteLength + 12);
      // Checksum must be 64-char hex
      expect(checksumSha256).toMatch(/^[a-f0-9]{64}$/i);

      // Decrypt using same key
      const decrypted = await decryptBackupPayload(encryptedPayload, secret);
      expect(new TextDecoder().decode(decrypted)).toBe('Confidential SQLite Database Dump Payload');
    });

    it('fails to decrypt if an incorrect secret is used', async () => {
      const secret = 'correct-secret-key';
      const wrongSecret = 'wrong-secret-key';
      const sampleData = new TextEncoder().encode('Important Sovereign State Data');

      const { encryptedPayload } = await encryptBackupPayload(sampleData, secret);

      await expect(decryptBackupPayload(encryptedPayload, wrongSecret)).rejects.toThrow();
    });
  });

  describe('3. Cloudflare R2 Bucket Persistence & Metadata Requirements', () => {
    it('stores backup under backups/d1-snapshot-daily.enc with SHA-256 checksum and ISO timestamp', async () => {
      const mockR2 = new MockR2Bucket();
      const env = { R2: mockR2 };

      const result = await executeBackup(env);

      expect(result.success).toBe(true);
      expect(result.key).toBe(DAILY_BACKUP_KEY);
      expect(result.storage).toBe('Cloudflare-R2');
      expect(result.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Verify that object exists in R2 bucket
      const storedObj = await mockR2.head(DAILY_BACKUP_KEY);
      expect(storedObj).not.toBeNull();
      expect(storedObj?.customMetadata?.sha256).toBe(result.checksumSha256);
      expect(storedObj?.customMetadata?.timestamp).toBe(result.timestamp);
      expect(storedObj?.customMetadata?.tables).toContain('posts');
      expect(storedObj?.customMetadata?.tables).toContain('nullifiers');
    });
  });

  describe('4. Automatic 7-Day Retention & Snapshot Rotation', () => {
    it('rotates out snapshots older than 7 days while preserving younger snapshots and daily pointer', async () => {
      const mockR2 = new MockR2Bucket();
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      // Seed mock snapshots in R2:
      // 1. Canonical daily pointer
      await mockR2.put(DAILY_BACKUP_KEY, new Uint8Array([1, 2, 3]), {
        uploaded: new Date(now - 1 * dayMs),
      });

      // 2. Recent snapshot (2 days old -> KEEP)
      const recentKey = `backups/d1-snapshot-${now - 2 * dayMs}.enc`;
      await mockR2.put(recentKey, new Uint8Array([1, 2, 3]), {
        uploaded: new Date(now - 2 * dayMs),
      });

      // 3. Snapshot right on boundary (6 days old -> KEEP)
      const boundaryKey = `backups/d1-snapshot-${now - 6 * dayMs}.enc`;
      await mockR2.put(boundaryKey, new Uint8Array([1, 2, 3]), {
        uploaded: new Date(now - 6 * dayMs),
      });

      // 4. Stale snapshot (8 days old -> ROTATE OUT)
      const staleKey1 = `backups/d1-snapshot-${now - 8 * dayMs}.enc`;
      await mockR2.put(staleKey1, new Uint8Array([1, 2, 3]), {
        uploaded: new Date(now - 8 * dayMs),
      });

      // 5. Very old snapshot (30 days old -> ROTATE OUT)
      const staleKey2 = `backups/d1-snapshot-${now - 30 * dayMs}.enc`;
      await mockR2.put(staleKey2, new Uint8Array([1, 2, 3]), {
        uploaded: new Date(now - 30 * dayMs),
      });

      const rotation = await rotateOldSnapshots(mockR2, RETENTION_PERIOD_MS, now);

      expect(rotation.rotatedCount).toBe(2);
      expect(rotation.deletedKeys).toContain(staleKey1);
      expect(rotation.deletedKeys).toContain(staleKey2);

      expect(rotation.remainingKeys).toContain(DAILY_BACKUP_KEY);
      expect(rotation.remainingKeys).toContain(recentKey);
      expect(rotation.remainingKeys).toContain(boundaryKey);

      // Verify actual R2 bucket content
      expect(await mockR2.head(staleKey1)).toBeNull();
      expect(await mockR2.head(staleKey2)).toBeNull();
      expect(await mockR2.head(recentKey)).not.toBeNull();
      expect(await mockR2.head(DAILY_BACKUP_KEY)).not.toBeNull();
    });
  });

  describe('5. HTTP Endpoint & Cron Trigger Conformance', () => {
    it('POST /api/cron-backup rejects unauthorized requests with 401', async () => {
      const req = new Request('https://urefy.com/api/cron-backup', {
        method: 'POST',
      });
      const res = await handleBackupPost({ request: req });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Unauthorized');
    });

    it('POST /api/cron-backup succeeds when authenticated with Admin PIN', async () => {
      const req = new Request('https://urefy.com/api/cron-backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEFAULT_ADMIN_PIN}`,
        },
      });
      const res = await handleBackupPost({ request: req });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.key).toBe(DAILY_BACKUP_KEY);
      expect(json.checksumSha256).toBeDefined();
    });

    it('POST /api/cron-backup succeeds when triggered via Cloudflare CF-Cron header', async () => {
      const req = new Request('https://urefy.com/api/cron-backup', {
        method: 'POST',
        headers: {
          'CF-Cron': 'true',
        },
      });
      const res = await handleBackupPost({ request: req });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('scheduled() background handler runs backup cleanly', async () => {
      let waitUntilPromise: Promise<any> | null = null;
      const mockCtx = {
        waitUntil: (p: Promise<any>) => {
          waitUntilPromise = p;
        },
      };

      await handleScheduledBackup({}, {}, mockCtx);
      if (waitUntilPromise) await waitUntilPromise;

      expect(globalLastBackupMetadata).not.toBeNull();
      expect(globalLastBackupMetadata?.key).toBe(DAILY_BACKUP_KEY);
    });

    it('GET /api/cron-backup returns backup status and retention policy', async () => {
      // Run a backup first
      await executeBackup();

      const req = new Request('https://urefy.com/api/cron-backup');
      const res = await handleBackupGet({ request: req });
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.status).toBe('SUCCESS');
      expect(json.retentionDays).toBe(7);
      expect(json.safeStorageCapGB).toBe(8.0);
      expect(json.lastBackup).toBeDefined();
    });

    it('OPTIONS /api/cron-backup returns 204 No Content with CORS', async () => {
      const res = await handleBackupOptions();
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  describe('6. Admin UI Integration Verification', () => {
    it('verifies that admin.html contains the backup trigger button, status badge, and timestamp elements', () => {
      const adminHtmlPath = path.resolve(__dirname, '../admin.html');
      const content = fs.readFileSync(adminHtmlPath, 'utf8');

      expect(content).toContain('btn-trigger-backup');
      expect(content).toContain('backup-status-badge');
      expect(content).toContain('backup-last-timestamp');
      expect(content).toContain('Automated D1 SQLite to R2 Encrypted Backup');
      expect(content).toContain('7-Day Automatic Rotation');
      expect(content).toContain('AES-256-GCM + Gzip');
    });
  });

  describe('7. Backup Restoration & Disaster Recovery Verification', () => {
    it('successfully restores encrypted backup snapshot payload roundtrip', async () => {
      // 1. Create a backup first
      const backupRes = await executeBackup();
      expect(backupRes.success).toBe(true);

      const snapshot = inMemoryBackupSnapshots.get(DAILY_BACKUP_KEY);
      expect(snapshot).toBeDefined();

      // 2. Clear stores to simulate data loss
      const initialPostCount = globalPostsStore.length;
      expect(initialPostCount).toBeGreaterThan(0);
      globalPostsStore.length = 0;
      expect(globalPostsStore.length).toBe(0);

      // 3. Restore backup
      const restoreRes = await restoreBackup(snapshot!.data);
      expect(restoreRes.success).toBe(true);
      expect(restoreRes.restoredRecords).toBeGreaterThan(0);
      expect(globalPostsStore.length).toBe(initialPostCount);
    });

    it('rejects tampered encrypted payload or invalid passphrase during restore', async () => {
      const backupRes = await executeBackup();
      const snapshot = inMemoryBackupSnapshots.get(DAILY_BACKUP_KEY);
      expect(snapshot).toBeDefined();

      // Corrupt the ciphertext bytes
      const corrupted = new Uint8Array(snapshot!.data);
      corrupted[corrupted.length - 1] ^= 0xff;

      await expect(restoreBackup(corrupted)).rejects.toThrow();
      await expect(restoreBackup(snapshot!.data, undefined, 'wrong-password')).rejects.toThrow();
    });

    it('handles POST /api/cron-backup?action=restore via HTTP endpoint with admin auth', async () => {
      const backupRes = await executeBackup();
      const snapshot = inMemoryBackupSnapshots.get(DAILY_BACKUP_KEY);

      const req = new Request('https://urefy.com/api/cron-backup?action=restore', {
        method: 'POST',
        headers: {
          'X-Admin-PIN': DEFAULT_ADMIN_PIN,
          'Content-Type': 'application/octet-stream',
        },
        body: snapshot!.data,
      });

      const res = await handleBackupPost({ request: req });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.restoredRecords).toBeGreaterThan(0);
    });
  });
});
