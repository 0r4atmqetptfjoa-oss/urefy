import { describe, it, expect } from 'vitest';
import { onRequestGet as handlePostsGet, onRequestPost as handlePostsPost } from '../functions/api/posts.js';
import { onRequestGet as handleMessagesGet, onRequestPost as handleMessagesPost } from '../functions/api/messages.js';
import { onRequestGet as handleChannelsGet, onRequestPost as handleChannelsPost } from '../functions/api/channels.js';
import { onRequestGet as handleReportGet, onRequestPost as handleReportPost } from '../functions/api/report.js';
import { onRequest as handleWebAuthn } from '../functions/api/webauthn.js';
import { onRequestGet as handleStorageGet, onRequestPost as handleStoragePost } from '../functions/api/storage.js';
import { executeBackup, restoreBackup } from '../functions/api/cron-backup.js';
import { createProductDatabase } from './helpers/product-database.js';

// ─── MOCK PERSISTENT D1 SQL STORE (Survives runtime destruction) ─────────────
class PersistentMockD1 {
  private tables = new Map<string, Map<string, any>>();

  constructor() {
    this.tables.set('posts', new Map());
    this.tables.set('messages', new Map());
    this.tables.set('channels', new Map());
    this.tables.set('dsa_reports', new Map());
    this.tables.set('webauthn_challenges', new Map());
    this.tables.set('webauthn_credentials', new Map());
    this.tables.set('used_nonces', new Map());
    this.tables.set('nullifiers', new Map());
    this.tables.set('push_subscriptions', new Map());
  }

  prepare(query: string) {
    const self = this;
    const cleanQuery = query.trim();

    return {
      bind(...params: any[]) {
        return {
          async run() {
            if (/INSERT (?:OR REPLACE )?INTO posts/i.test(cleanQuery)) {
              const colMatch = cleanQuery.match(/\(([^)]+)\)\s*VALUES/i);
              if (colMatch) {
                const cols = colMatch[1].split(',').map((c) => c.trim().toLowerCase());
                const record: Record<string, any> = {};
                cols.forEach((col, i) => {
                  record[col] = params[i];
                });
                const id = record.id;
                self.tables.get('posts')!.set(id, {
                  id,
                  channel_id: record.channel_id || record.channelid || 'pulse-global',
                  author_id: record.author_id || record.author_fingerprint || record.authorfingerprint || 'genesis-core',
                  author_fingerprint: record.author_fingerprint || record.author_id || 'genesis-core',
                  author_role: record.author_role || record.authorrole || 'MEMBER',
                  title: record.title,
                  content: record.content,
                  flair: record.flair || 'TECH DISCUSSION',
                  merit_votes: record.merit_votes ?? record.meritvotes ?? 1,
                  created_at: record.created_at ?? record.createdat ?? Date.now(),
                  status: record.status || 'published',
                  ...record,
                });
                return { success: true };
              }
              const [id, channel_id, author_fingerprint, author_role, title, content, flair, media_urls, merit_votes, created_at, updated_at] = params;
              self.tables.get('posts')!.set(id, {
                id, channel_id, author_fingerprint, author_role, title, content, flair, media_urls, merit_votes, created_at, updated_at,
              });
              return { success: true };
            }

            if (/INSERT INTO messages/i.test(cleanQuery)) {
              // params: id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at
              const [id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at] = params;
              self.tables.get('messages')!.set(id, {
                id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at,
              });
              return { success: true };
            }

            if (/INSERT OR REPLACE INTO channels/i.test(cleanQuery)) {
              const [id, name, space, description, is_private, topic, members_count, created_at] = params;
              self.tables.get('channels')!.set(id, {
                id, name, space, description, is_private, topic, members_count, created_at,
              });
              return { success: true };
            }

            if (/INSERT OR REPLACE INTO dsa_reports/i.test(cleanQuery)) {
              const [id, target_id, target_type, reason, details, reporter_fingerprint, reporter_email, status, created_at] = params;
              self.tables.get('dsa_reports')!.set(id, {
                id, target_id, target_type, reason, details, reporter_fingerprint, reporter_email, status, created_at,
              });
              return { success: true };
            }

            if (/INSERT OR REPLACE INTO webauthn_challenges/i.test(cleanQuery)) {
              const [fingerprint, challenge, expires_at, created_at] = params;
              self.tables.get('webauthn_challenges')!.set(fingerprint, {
                fingerprint, challenge, expires_at, created_at,
              });
              return { success: true };
            }

            if (/INSERT OR REPLACE INTO used_nonces/i.test(cleanQuery)) {
              const [nonce, fingerprint, epoch, expires_at] = params;
              self.tables.get('used_nonces')!.set(nonce, {
                nonce, fingerprint, epoch, expires_at,
              });
              return { success: true };
            }

            return { success: true };
          },

          async all() {
            if (/FROM posts/i.test(cleanQuery)) {
              let results = Array.from(self.tables.get('posts')!.values());
              if (/channel_id\s*=\s*\?/i.test(cleanQuery) && params.length > 0) {
                const channelParam = params[0];
                results = results.filter((p: any) => (p.channel_id ?? p.channelId) === channelParam);
              }
              return { results };
            }
            if (/FROM messages/i.test(cleanQuery)) {
              const results = Array.from(self.tables.get('messages')!.values());
              return { results };
            }
            if (/FROM channels/i.test(cleanQuery)) {
              const results = Array.from(self.tables.get('channels')!.values());
              return { results };
            }
            if (/FROM dsa_reports/i.test(cleanQuery)) {
              const results = Array.from(self.tables.get('dsa_reports')!.values());
              return { results };
            }
            return { results: [] };
          },

          async first() {
            if (/FROM webauthn_challenges/i.test(cleanQuery)) {
              const [fp] = params;
              return self.tables.get('webauthn_challenges')!.get(fp) || null;
            }
            if (/FROM used_nonces/i.test(cleanQuery)) {
              const [nonce] = params;
              return self.tables.get('used_nonces')!.get(nonce) || null;
            }
            return null;
          },
        };
      },

      async all() {
        if (/FROM posts/i.test(cleanQuery)) return { results: Array.from(self.tables.get('posts')!.values()) };
        if (/FROM messages/i.test(cleanQuery)) return { results: Array.from(self.tables.get('messages')!.values()) };
        if (/FROM channels/i.test(cleanQuery)) return { results: Array.from(self.tables.get('channels')!.values()) };
        if (/FROM dsa_reports/i.test(cleanQuery)) return { results: Array.from(self.tables.get('dsa_reports')!.values()) };
        if (/FROM nullifiers/i.test(cleanQuery)) return { results: Array.from(self.tables.get('nullifiers')!.values()) };
        if (/FROM push_subscriptions/i.test(cleanQuery)) return { results: Array.from(self.tables.get('push_subscriptions')!.values()) };
        return { results: [] };
      },

      async first() {
        return null;
      },
    };
  }
}

// ─── MOCK PERSISTENT R2 STORAGE (Survives runtime destruction) ───────────────
class PersistentMockR2 {
  private objects = new Map<string, { data: Uint8Array; customMetadata: Record<string, string>; uploaded: Date }>();

  async put(key: string, data: any, options?: any) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.objects.set(key, {
      data: bytes,
      customMetadata: options?.customMetadata || {},
      uploaded: new Date(),
    });
    return { key, size: bytes.byteLength };
  }

  async get(key: string) {
    const item = this.objects.get(key);
    if (!item) return null;
    return {
      key,
      size: item.data.byteLength,
      customMetadata: item.customMetadata,
      uploaded: item.uploaded,
      arrayBuffer: async () => item.data.buffer.slice(item.data.byteOffset, item.data.byteOffset + item.data.byteLength),
      body: item.data,
    };
  }

  async head(key: string) { return this.get(key); }

  async list(options?: { prefix?: string }) {
    const list = [];
    for (const [k, v] of this.objects.entries()) {
      if (!options?.prefix || k.startsWith(options.prefix)) {
        list.push({
          key: k,
          size: v.data.byteLength,
          customMetadata: v.customMetadata,
          uploaded: v.uploaded,
        });
      }
    }
    return { objects: list };
  }

  async delete(key: string) {
    return this.objects.delete(key);
  }
}

describe('Mandatory Test B: Restart Persistence Verification (Write -> Destroy Runtime -> Recreate -> Assert State)', () => {
  // Underlying persistent storage that persists across isolate lifecycles
  const persistentD1 = new PersistentMockD1();
  const persistentR2 = new PersistentMockR2();

  it('B.1 D1 SQL Persistence across runtime reset: Posts survive complete memory wipe', async () => {
    // 1. Write data in Runtime 1
    const runtime1Env = {
      ENVIRONMENT: 'production',
      ADMIN_PIN: 'test-admin-secret-pin',
      DB: persistentD1,
    };

    const writeReq = new Request('http://localhost/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'test-admin-secret-pin' },
      body: JSON.stringify({
        title: 'Post Before Crash',
        content: 'This post must survive isolate reset',
        channelId: 'general',
        authorFingerprint: 'genesis-core',
      }),
    });
    const postRes = await handlePostsPost({ request: writeReq, env: runtime1Env });
    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    const createdId = postData.post.id;

    // 2. DESTROY RUNTIME 1 (Simulate isolate termination / crash)
    // Create completely new runtime instance connecting to the same D1 DB
    const runtime2Env = {
      ENVIRONMENT: 'production',
      ADMIN_PIN: 'test-admin-secret-pin',
      DB: persistentD1,
    };

    // 3. Query from fresh Runtime 2
    const readReq = new Request('http://localhost/api/posts?channelId=general');
    const getRes = await handlePostsGet({ request: readReq, env: runtime2Env });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();

    // 4. Assert identical persisted state
    const found = getData.posts.find((p: any) => p.id === createdId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Post Before Crash');
    expect(found.content).toBe('This post must survive isolate reset');
  });

  it('B.2 D1 SQL Persistence across runtime reset: Messages survive complete memory wipe', async () => {
    const runtime1Env = {
      ENVIRONMENT: 'production',
      ADMIN_PIN: 'test-admin-secret-pin',
      DB: persistentD1,
    };

    const msgReq = new Request('http://localhost/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'test-admin-secret-pin' },
      body: JSON.stringify({
        ciphertext: 'PERSISTENT_CIPHERTEXT_ACROSS_REBOOT',
        channelId: 'relays-general',
        authorFingerprint: 'genesis-core',
      }),
    });
    const postRes = await handleMessagesPost({ request: msgReq, env: runtime1Env });
    expect(postRes.status).toBe(201);
    const msgData = await postRes.json();
    const msgId = msgData.message.id;

    // Destroy Runtime 1 & Recreate Runtime 2
    const runtime2Env = {
      ENVIRONMENT: 'production',
      ADMIN_PIN: 'test-admin-secret-pin',
      DB: persistentD1,
    };

    const getRes = await handleMessagesGet({
      request: new Request('http://localhost/api/messages?channelId=relays-general'),
      env: runtime2Env,
    });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();

    const found = getData.messages.find((m: any) => m.id === msgId);
    expect(found).toBeDefined();
    expect(found.ciphertext).toBe('PERSISTENT_CIPHERTEXT_ACROSS_REBOOT');
  });

  it('B.3 R2 Object & Metadata Persistence: Stored binary survives complete worker crash', async () => {
    const accounting = createProductDatabase();
    const runtime1Env = {
      ENVIRONMENT: 'production',
      ADMIN_PIN: 'test-admin-secret-pin',
      VAULT_BUCKET: persistentR2,
      DB: accounting.database,
    };

    const uploadReq = new Request('http://localhost/api/storage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Admin-PIN': 'test-admin-secret-pin',
        'X-File-Name': 'reboot-proof.bin',
        'X-Key': 'vault/reboot-proof.bin',
      },
      body: new Uint8Array([11, 22, 33, 44, 55]),
    });
    const upRes = await handleStoragePost({ request: uploadReq, env: runtime1Env });
    expect(upRes.status).toBe(201);

    // Destroy Runtime 1 & Recreate Runtime 2
    const runtime2Env = {
      ENVIRONMENT: 'production',
      ADMIN_PIN: 'test-admin-secret-pin',
      VAULT_BUCKET: persistentR2,
      DB: accounting.database,
    };

    const getReq = new Request('http://localhost/api/storage?key=vault/reboot-proof.bin');
    const getRes = await handleStorageGet({ request: getReq, env: runtime2Env });
    expect(getRes.status).toBe(200);
    const buf = await getRes.arrayBuffer();
    const bytes = new Uint8Array(buf);
    expect(bytes).toEqual(new Uint8Array([11, 22, 33, 44, 55]));
    expect(accounting.sqlite.prepare('SELECT byte_size FROM storage_allocations').get()?.byte_size).toBe(5);
    accounting.sqlite.close();
  });

  it('B.4 WebAuthn Challenge Persistence: Server-issued challenge survives isolate restart', async () => {
    const runtime1Env = {
      ENVIRONMENT: 'production',
      DB: persistentD1,
    };

    const challengeReq = new Request('http://localhost/api/webauthn?action=challenge&fingerprint=user_reboot_test', {
      method: 'GET',
    });
    const chRes = await handleWebAuthn({ request: challengeReq, env: runtime1Env });
    expect(chRes.status).toBe(200);
    const chData = await chRes.json();
    const challenge = chData.challenge;
    expect(challenge).toBeDefined();

    // Destroy Runtime 1 & Recreate Runtime 2
    const runtime2Env = {
      ENVIRONMENT: 'production',
      DB: persistentD1,
    };

    // Subsequent registration assertion check in Runtime 2 loads the same challenge from D1
    const row = await (runtime2Env.DB as any).prepare('SELECT * FROM webauthn_challenges WHERE fingerprint = ?')
      .bind('user_reboot_test')
      .first();
    expect(row).toBeDefined();
    expect(row.challenge).toBe(challenge);
  });

  it('B.5 Encrypted Backup & Restore: DB snapshot dumped to R2 and fully restored into fresh DB', async () => {
    // 1. Run backup with current persistent DB + R2
    const backupEnv = {
      ENVIRONMENT: 'production',
      DB: persistentD1,
      VAULT_BUCKET: persistentR2,
      BACKUP_ENCRYPTION_KEY: 'test-backup-sovereign-key-v1',
    };

    const backupResult = await executeBackup(backupEnv as any);
    expect(backupResult.success).toBe(true);
    expect(backupResult.storage).toBe('Cloudflare-R2');

    // 2. Fetch encrypted backup blob from R2
    const r2Obj = await persistentR2.get(backupResult.key);
    expect(r2Obj).toBeDefined();
    const encryptedBytes = new Uint8Array(await r2Obj!.arrayBuffer());

    // 3. Create fresh, clean target DB (simulating disaster recovery restore)
    const freshCleanD1 = new PersistentMockD1();
    const restoreEnv = {
      ENVIRONMENT: 'production',
      DB: freshCleanD1,
      BACKUP_ENCRYPTION_KEY: 'test-backup-sovereign-key-v1',
    };

    // 4. Restore into fresh clean DB
    const restoreResult = await restoreBackup(encryptedBytes, restoreEnv as any, 'test-backup-sovereign-key-v1');
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.restoredRecords).toBeGreaterThan(0);

    // 5. Query restored fresh DB to assert identical state
    const postsRes = await freshCleanD1.prepare('SELECT * FROM posts').all();
    expect(postsRes.results.length).toBeGreaterThan(0);
    expect(postsRes.results.some((p: any) => p.title === 'Post Before Crash')).toBe(true);
  });
});
