// ===========================================================================
// UREfy — AUTOMATED D1 SQLITE -> CLOUDFLARE R2 ENCRYPTED BACKUP
// Item 19: Automated Scheduled D1 SQLite -> Cloudflare R2 Backups
// Features:
// - Endpoint POST /api/cron-backup (Cron secret or Admin-authorized trigger).
// - Dumps D1 tables: posts, channels, messages, nullifiers, push_subscriptions.
// - Serializes, compresses with Gzip (CompressionStream), and encrypts with AES-256-GCM using backup key.
// - Stores in Cloudflare R2 bucket under backups/d1-snapshot-daily.enc with SHA-256 checksum and ISO timestamp metadata.
// - Automatic 7-day retention: rotates out snapshots older than 7 days to preserve the 8.0 GB safe storage ceiling!
// ===========================================================================

import {
  Env,
  R2Bucket,
  getD1Database,
  getR2Bucket,
  globalPostsStore,
  globalChannelsStore,
  globalMessagesStore,
  globalSpentNullifiers,
  globalPushSubscriptionsStore,
  isProductionEnv,
} from './_db.js';
import {
  computeSha256,
  recordClassAOp,
  MAX_STORAGE_CAP_BYTES,
  getTotalStorageBytes,
} from './storage.js';
import { verifyAdminAuthorization, timingSafeEqualHash } from './admin.js';
import { mirrorEncryptedBackupToS3, type S3BackupResult } from './_aws-s3.js';
import { executeFullBackup, FULL_DAILY_KEY } from './_full-backup.js';

export const DAILY_BACKUP_KEY = 'backups/d1-snapshot-daily.enc';
export const BACKUP_PREFIX = 'backups/';
export const RETENTION_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
export const BACKUP_TABLES = [
  'posts',
  'channels',
  'messages',
  'nullifiers',
  'push_subscriptions',
] as const;

export const DEFAULT_BACKUP_PASSPHRASE = 'aetheris-sovereign-r2-backup-key-v1';

function resolveBackupSecret(env?: Env, requestedSecret?: string): string {
  if (requestedSecret !== undefined) {
    if (isProductionEnv(env) && requestedSecret.trim().length < 16) {
      throw new Error('Production backup encryption key is missing or shorter than 16 characters.');
    }
    return requestedSecret;
  }
  const configured = env?.BACKUP_ENCRYPTION_KEY || env?.BACKUP_KEY || env?.ADMIN_PIN;
  if (typeof configured === 'string' && configured.trim().length >= 16) return configured;
  if (isProductionEnv(env)) {
    throw new Error('Production backup encryption key is missing or shorter than 16 characters.');
  }
  return DEFAULT_BACKUP_PASSPHRASE;
}

export interface D1BackupManifest {
  version: '1.0.0';
  timestamp: string; // ISO 8601 string
  unixTimestamp: number;
  tables: {
    posts: any[];
    channels: any[];
    messages: any[];
    nullifiers: any[];
    push_subscriptions: any[];
  };
  counts: Record<string, number>;
  totalRecords: number;
}

export interface BackupExecutionResult {
  success: boolean;
  key: string;
  timestamp: string;
  checksumSha256: string;
  rawBytes: number;
  compressedBytes: number;
  encryptedBytes: number;
  totalRecords: number;
  tableCounts: Record<string, number>;
  storage: 'Cloudflare-R2' | 'Edge-Isolate-Memory';
  awsS3Backup?: S3BackupResult;
  fullBackup?: Awaited<ReturnType<typeof executeFullBackup>>;
  rotation: {
    rotatedCount: number;
    deletedKeys: string[];
    remainingKeys: string[];
  };
  metadata?: Record<string, string>;
  error?: string;
}

export interface StoredBackupSnapshot {
  key: string;
  data: Uint8Array;
  uploadedAt: number;
  metadata: Record<string, string>;
  checksumSha256: string;
}

// In-memory fallback registry for testing and edge environments without live R2 binding
export const inMemoryBackupSnapshots = new Map<string, StoredBackupSnapshot>();

// Last executed backup metadata
export let globalLastBackupMetadata: BackupExecutionResult | null = null;

export function setGlobalLastBackupMetadata(meta: BackupExecutionResult | null): void {
  globalLastBackupMetadata = meta;
}

export function resetBackupSnapshots(): void {
  inMemoryBackupSnapshots.clear();
  globalLastBackupMetadata = null;
}

// ─── GZIP COMPRESSION & DECOMPRESSION ────────────────────────────────────────

/**
 * Compresses payload using standard Web CompressionStream('gzip'),
 * with dynamic fallback to Node.js zlib for test/headless runtime compatibility.
 */
export async function compressGzip(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Response(data as unknown as BufferSource).body!.pipeThrough(
      new CompressionStream('gzip')
    );
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }

  // Node.js fallback
  try {
    const zlib = await import('node:zlib');
    return new Uint8Array(zlib.gzipSync(data));
  } catch {
    return data;
  }
}

/**
 * Decompresses gzip payload using standard Web DecompressionStream('gzip'),
 * with dynamic fallback to Node.js zlib.
 */
export async function decompressGzip(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new Response(data as unknown as BufferSource).body!.pipeThrough(
      new DecompressionStream('gzip')
    );
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }

  try {
    const zlib = await import('node:zlib');
    return new Uint8Array(zlib.gunzipSync(data));
  } catch {
    return data;
  }
}

// ─── AES-256-GCM CRYPTOGRAPHIC ENCRYPTION ───────────────────────────────────

const PBKDF2_MAGIC = new Uint8Array([0x55, 0x52, 0x45, 0x32]); // "URE2" header magic
const BACKUP_KDF_SALT = new TextEncoder().encode('urefy:aetheris:backup:v2:aes-gcm');
const SAFE_SQL_IDENTIFIER = /^[a-zA-Z0-9_]+$/;

export async function deriveBackupKey(passphrase: string, salt?: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(passphrase);
  if (salt && salt.byteLength === 16) {
    const baseKey = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: 100_000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  const combined = new Uint8Array(BACKUP_KDF_SALT.length + enc.length);
  combined.set(BACKUP_KDF_SALT, 0);
  combined.set(enc, BACKUP_KDF_SALT.length);
  const digest = await crypto.subtle.digest('SHA-256', combined);
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptBackupPayload(
  plainBytes: Uint8Array,
  keyOrSecret: CryptoKey | string
): Promise<{
  encryptedPayload: Uint8Array;
  iv: Uint8Array;
  checksumSha256: string;
}> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  if (typeof keyOrSecret === 'string') {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const key = await deriveBackupKey(keyOrSecret, salt);
    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plainBytes as unknown as BufferSource
    );
    const cipherBytes = new Uint8Array(ciphertextBuffer);
    // Format: [4B Magic "URE2"][16B Salt][12B IV][Ciphertext + Auth Tag]
    const encryptedPayload = new Uint8Array(4 + 16 + 12 + cipherBytes.byteLength);
    encryptedPayload.set(PBKDF2_MAGIC, 0);
    encryptedPayload.set(salt, 4);
    encryptedPayload.set(iv, 20);
    encryptedPayload.set(cipherBytes, 32);
    const checksumSha256 = await computeSha256(encryptedPayload);
    return { encryptedPayload, iv, checksumSha256 };
  }

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keyOrSecret,
    plainBytes as unknown as BufferSource
  );
  const cipherBytes = new Uint8Array(ciphertextBuffer);
  const encryptedPayload = new Uint8Array(iv.byteLength + cipherBytes.byteLength);
  encryptedPayload.set(iv, 0);
  encryptedPayload.set(cipherBytes, iv.byteLength);
  const checksumSha256 = await computeSha256(encryptedPayload);
  return { encryptedPayload, iv, checksumSha256 };
}

export async function decryptBackupPayload(
  encryptedPayload: Uint8Array,
  keyOrSecret: CryptoKey | string
): Promise<Uint8Array> {
  const hasMagic =
    encryptedPayload.byteLength > 32 &&
    encryptedPayload[0] === 0x55 &&
    encryptedPayload[1] === 0x52 &&
    encryptedPayload[2] === 0x45 &&
    encryptedPayload[3] === 0x32;

  if (hasMagic && typeof keyOrSecret === 'string') {
    const salt = encryptedPayload.slice(4, 20);
    const iv = encryptedPayload.slice(20, 32);
    const ciphertext = encryptedPayload.slice(32);
    const key = await deriveBackupKey(keyOrSecret, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext as unknown as BufferSource
    );
    return new Uint8Array(decrypted);
  }

  const key = typeof keyOrSecret === 'string' ? await deriveBackupKey(keyOrSecret) : keyOrSecret;
  const iv = encryptedPayload.slice(0, 12);
  const ciphertext = encryptedPayload.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext as unknown as BufferSource
  );
  return new Uint8Array(decrypted);
}

// ─── D1 DATABASE TABLE EXTRACTION ────────────────────────────────────────────

function getInMemoryTableFallback(tableName: string): any[] {
  switch (tableName) {
    case 'posts':
      return [...globalPostsStore];
    case 'channels':
      return [...globalChannelsStore];
    case 'messages':
      return [...globalMessagesStore];
    case 'nullifiers':
      return Array.from(globalSpentNullifiers).map((nullifier) => ({
        id: `nullifier-${nullifier.substring(0, 16)}`,
        nullifier,
        epoch: 1,
        spentAt: Date.now(),
        spent_at: Date.now(),
      }));
    case 'push_subscriptions':
      return [...globalPushSubscriptionsStore];
    default:
      return [];
  }
}

/**
 * Dumps all required D1 tables: posts, channels, messages, nullifiers, push_subscriptions.
 */
export async function dumpD1Tables(env?: Env): Promise<{
  tables: {
    posts: any[];
    channels: any[];
    messages: any[];
    nullifiers: any[];
    push_subscriptions: any[];
  };
  counts: Record<string, number>;
  totalRecords: number;
}> {
  const isProd = isProductionEnv(env);
  const db = getD1Database(env);
  if (isProd && !db) {
    throw new Error('Production backup failed: D1 database binding is unavailable. In-memory fallback is disabled in production.');
  }

  const tables: any = {
    posts: [],
    channels: [],
    messages: [],
    nullifiers: [],
    push_subscriptions: [],
  };
  const counts: Record<string, number> = {};
  let totalRecords = 0;

  for (const table of BACKUP_TABLES) {
    if (db) {
      try {
        const result = await db.prepare(`SELECT * FROM ${table}`).all();
        if (result && Array.isArray(result.results)) {
          tables[table] = result.results;
        } else if (isProd) {
          throw new Error(`Production backup failed: query for table ${table} returned unexpected structure.`);
        } else {
          tables[table] = getInMemoryTableFallback(table);
        }
      } catch (err: any) {
        // The deployed schema never defines a D1 nullifiers table. Its legacy
        // in-memory registry is not durable production data. Preserve manifest
        // compatibility with an empty array only for this known absent table;
        // missing core tables and other query errors still fail closed.
        if (table === 'nullifiers' && /no such table:\s*nullifiers\b/i.test(String(err?.message))) {
          tables[table] = [];
          counts[table] = 0;
          continue;
        }
        if (isProd) {
          throw new Error(`Production backup failed: error querying table ${table}: ${err?.message || err}`);
        }
        // Table not yet migrated or queried, fallback safely in dev
        tables[table] = getInMemoryTableFallback(table);
      }
    } else {
      tables[table] = getInMemoryTableFallback(table);
    }

    counts[table] = tables[table].length;
    totalRecords += counts[table];
  }

  return { tables, counts, totalRecords };
}

// ─── AUTOMATIC 7-DAY RETENTION & ROTATION ────────────────────────────────────

/**
 * Rotates out snapshot files older than 7 days to preserve the 8.0 GB safe storage ceiling.
 */
export async function rotateOldSnapshots(
  r2: R2Bucket | null,
  retentionMs: number = RETENTION_PERIOD_MS,
  now: number = Date.now()
): Promise<{
  rotatedCount: number;
  deletedKeys: string[];
  remainingKeys: string[];
}> {
  const deletedKeys: string[] = [];
  const remainingKeys: string[] = [];

  if (r2) {
    try {
      recordClassAOp(); // list operation
      const list = await r2.list({ prefix: BACKUP_PREFIX });
      for (const obj of list.objects) {
        // The active daily snapshot pointer is preserved
        if (obj.key === DAILY_BACKUP_KEY) {
          remainingKeys.push(obj.key);
          continue;
        }

        const uploadedTime = obj.uploaded ? new Date(obj.uploaded).getTime() : 0;
        const age = now - uploadedTime;

        if (age > retentionMs) {
          recordClassAOp(); // delete operation
          await r2.delete(obj.key);
          deletedKeys.push(obj.key);
        } else {
          remainingKeys.push(obj.key);
        }
      }
    } catch (err) {
      console.warn('[cron-backup] R2 snapshot rotation warning:', err);
    }
  }

  // Also rotate in-memory snapshots map
  for (const [key, item] of inMemoryBackupSnapshots.entries()) {
    if (key === DAILY_BACKUP_KEY) {
      if (!remainingKeys.includes(key)) remainingKeys.push(key);
      continue;
    }

    const age = now - item.uploadedAt;
    if (age > retentionMs) {
      inMemoryBackupSnapshots.delete(key);
      if (!deletedKeys.includes(key)) deletedKeys.push(key);
    } else {
      if (!remainingKeys.includes(key)) remainingKeys.push(key);
    }
  }

  return {
    rotatedCount: deletedKeys.length,
    deletedKeys,
    remainingKeys,
  };
}

// ─── CORE BACKUP EXECUTION SERVICE ──────────────────────────────────────────

/**
 * Executes full D1 SQLite -> Cloudflare R2 backup pipeline.
 */
export async function executeBackup(
  env?: Env,
  options?: {
    keyOverride?: string;
    customSecret?: string;
    skipRotation?: boolean;
  }
): Promise<BackupExecutionResult> {
  const now = Date.now();
  const isoTimestamp = new Date(now).toISOString();

  // 1. Dump D1 Tables
  const { tables, counts, totalRecords } = await dumpD1Tables(env);

  // 2. Build Manifest
  const manifest: D1BackupManifest = {
    version: '1.0.0',
    timestamp: isoTimestamp,
    unixTimestamp: now,
    tables,
    counts,
    totalRecords,
  };

  const rawJson = JSON.stringify(manifest);
  const rawBytes = new TextEncoder().encode(rawJson);

  // 3. Compress with Gzip
  const compressedBytes = await compressGzip(rawBytes);

  // 4. Encrypt with AES-256-GCM
  const backupSecret = resolveBackupSecret(env, options?.customSecret);

  const { encryptedPayload, checksumSha256 } = await encryptBackupPayload(
    compressedBytes,
    backupSecret
  );

  // 5. Quota Guardian Check: Verify Storage Cap (8.0 GB safe ceiling)
  const currentUsed = getTotalStorageBytes();
  if (currentUsed + encryptedPayload.byteLength > MAX_STORAGE_CAP_BYTES) {
    throw new Error(
      `SOVEREIGN_R2_QUOTA_GUARD: Backup rejected. Storage cap (8.0 GB) would be exceeded.`
    );
  }

  // 6. Persist to Cloudflare R2 Bucket
  const isProd = isProductionEnv(env);
  const r2 = getR2Bucket(env);
  if (isProd && !r2) {
    throw new Error('Production backup failed: Cloudflare R2 bucket binding is unavailable. In-memory fallback is disabled in production.');
  }

  const primaryKey = options?.keyOverride || DAILY_BACKUP_KEY;
  const timestampedKey = `backups/d1-snapshot-${now}.enc`;

  const metadata: Record<string, string> = {
    sha256: checksumSha256,
    timestamp: isoTimestamp,
    uploadedAt: String(now),
    rawBytes: String(rawBytes.byteLength),
    compressedBytes: String(compressedBytes.byteLength),
    encryptedBytes: String(encryptedPayload.byteLength),
    totalRecords: String(totalRecords),
    tables: BACKUP_TABLES.join(','),
  };

  let storageType: 'Cloudflare-R2' | 'Edge-Isolate-Memory' = 'Edge-Isolate-Memory';

  if (r2) {
    try {
      recordClassAOp(2); // Two puts: daily pointer and timestamped snapshot
      await r2.put(primaryKey, encryptedPayload, {
        httpMetadata: { contentType: 'application/octet-stream' },
        customMetadata: metadata,
      });
      await r2.put(timestampedKey, encryptedPayload, {
        httpMetadata: { contentType: 'application/octet-stream' },
        customMetadata: metadata,
      });
      storageType = 'Cloudflare-R2';
    } catch (r2Err: any) {
      if (isProd) {
        throw new Error(`Production backup failed: R2 persistence error: ${r2Err?.message || r2Err}`);
      }
      console.warn('[cron-backup] R2 persistence fallback to memory:', r2Err);
      storageType = 'Edge-Isolate-Memory';
    }
  }

  // Maintain in-memory snapshot store only for local development & fallback
  if (!isProd) {
    inMemoryBackupSnapshots.set(primaryKey, {
      key: primaryKey,
      data: encryptedPayload,
      uploadedAt: now,
      metadata,
      checksumSha256,
    });
    inMemoryBackupSnapshots.set(timestampedKey, {
      key: timestampedKey,
      data: encryptedPayload,
      uploadedAt: now,
      metadata,
      checksumSha256,
    });
  }

  // 7. Automatic 7-Day Retention: rotate out old snapshots
  let rotationResult = { rotatedCount: 0, deletedKeys: [] as string[], remainingKeys: [] as string[] };
  if (!options?.skipRotation) {
    rotationResult = await rotateOldSnapshots(r2, RETENTION_PERIOD_MS, now);
  }

  // S3 receives only the same AES-GCM ciphertext already persisted in R2.
  // It is an optional disaster-recovery mirror and never replaces Cloudflare storage.
  const awsS3Backup = await mirrorEncryptedBackupToS3(env, timestampedKey, encryptedPayload);
  const fullBackup = env?.AWS_FULL_DR_ENABLED === 'true'
    ? await executeFullBackup(env, async (plain) => encryptBackupPayload(await compressGzip(plain), backupSecret), isoTimestamp)
    : undefined;

  const result: BackupExecutionResult = {
    success: true,
    key: primaryKey,
    timestamp: isoTimestamp,
    checksumSha256,
    rawBytes: rawBytes.byteLength,
    compressedBytes: compressedBytes.byteLength,
    encryptedBytes: encryptedPayload.byteLength,
    totalRecords,
    tableCounts: counts,
    storage: storageType,
    awsS3Backup,
    fullBackup,
    rotation: rotationResult,
    metadata,
  };

  globalLastBackupMetadata = result;
  return result;
}

// ─── BACKUP RESTORATION SERVICE ─────────────────────────────────────────────

export interface RestoreExecutionResult {
  success: boolean;
  restoredRecords: number;
  tableCounts: Record<string, number>;
  manifestTimestamp: string;
  error?: string;
}

/**
 * Restores a D1 SQLite database from an encrypted backup snapshot payload.
 * Decrypts AES-256-GCM -> Decompresses Gzip -> Parses D1BackupManifest -> Restores records into D1 SQLite or fallback stores.
 */
export async function restoreBackup(
  encryptedData: ArrayBuffer | Uint8Array,
  env?: Env,
  passphrase?: string
): Promise<RestoreExecutionResult> {
  const encryptedBytes = encryptedData instanceof Uint8Array ? encryptedData : new Uint8Array(encryptedData);
  const isProd = isProductionEnv(env);
  const db = getD1Database(env);

  if (isProd && !db) {
    throw new Error('Production restore failed: D1 database binding is unavailable. In-memory fallback is disabled in production.');
  }

  const secret = resolveBackupSecret(env, passphrase);

  // 1. Decrypt AES-256-GCM
  const decompressedGzipBytes = await decryptBackupPayload(encryptedBytes, secret);

  // 2. Decompress Gzip
  const rawBytes = await decompressGzip(decompressedGzipBytes);
  const jsonStr = new TextDecoder().decode(rawBytes);

  // 3. Parse Manifest
  const manifest = JSON.parse(jsonStr) as D1BackupManifest;
  if (!manifest || manifest.version !== '1.0.0' || !manifest.tables) {
    throw new Error('Invalid backup manifest: schema mismatch or corrupted payload.');
  }

  let totalRestored = 0;
  const tableCounts: Record<string, number> = {};

  // 4. Restore into D1 database or memory
  for (const table of BACKUP_TABLES) {
    const rows = manifest.tables[table] || [];
    tableCounts[table] = rows.length;

    if (db) {
      const statements: any[] = [];
      for (const row of rows) {
        const keys = Object.keys(row);
        if (keys.length === 0) continue;
        for (const k of keys) {
          if (!SAFE_SQL_IDENTIFIER.test(k)) {
            throw new Error(`Invalid column identifier in backup payload: ${k}`);
          }
        }
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        const values = keys.map((k) => row[k]);
        statements.push(db.prepare(sql).bind(...values));
      }

      for (let i = 0; i < statements.length; i += 100) {
        const chunk = statements.slice(i, i + 100);
        if (typeof db.batch === 'function') {
          await db.batch(chunk);
        } else {
          for (const stmt of chunk) {
            await stmt.run();
          }
        }
      }
    } else {
      // In-memory fallback
      switch (table) {
        case 'posts':
          for (const post of rows) {
            const idx = globalPostsStore.findIndex((p) => p.id === post.id);
            if (idx >= 0) globalPostsStore[idx] = post;
            else globalPostsStore.push(post);
          }
          break;
        case 'channels':
          for (const ch of rows) {
            const idx = globalChannelsStore.findIndex((c) => c.id === ch.id);
            if (idx >= 0) globalChannelsStore[idx] = ch;
            else globalChannelsStore.push(ch);
          }
          break;
        case 'messages':
          for (const msg of rows) {
            const idx = globalMessagesStore.findIndex((m) => m.id === msg.id);
            if (idx >= 0) globalMessagesStore[idx] = msg;
            else globalMessagesStore.push(msg);
          }
          break;
        case 'nullifiers':
          for (const n of rows) {
            if (n.nullifier) globalSpentNullifiers.add(n.nullifier);
          }
          break;
        case 'push_subscriptions':
          for (const sub of rows) {
            const idx = globalPushSubscriptionsStore.findIndex((s) => s.endpoint === sub.endpoint);
            if (idx >= 0) globalPushSubscriptionsStore[idx] = sub;
            else globalPushSubscriptionsStore.push(sub);
          }
          break;
      }
    }

    totalRestored += rows.length;
  }

  return {
    success: true,
    restoredRecords: totalRestored,
    tableCounts,
    manifestTimestamp: manifest.timestamp,
  };
}

// ─── CLOUDFLARE CRON TRIGGER HANDLER ─────────────────────────────────────────

/**
 * Cloudflare Worker Cron Trigger Handler.
 * Invoked automatically by Cloudflare Edge cron schedule (e.g. daily at midnight: 0 0 * * *).
 */
export async function scheduled(event: any, env?: Env, ctx?: any): Promise<void> {
  const task = executeBackup(env);
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(task);
  } else {
    await task;
  }
}

// ─── HTTP ENDPOINT HANDLERS ──────────────────────────────────────────────────

/**
 * POST /api/cron-backup
 * Triggers automated snapshot creation or restore. Supports:
 * - Cloudflare Cron Trigger / Internal Worker calls
 * - Admin authorization via Bearer Token, X-Admin-PIN, or genesis fingerprint.
 */
export async function onRequestPost(context: {
  request: Request;
  env?: Env;
}): Promise<Response> {
  try {
    const req = context.request;
    const url = new URL(req.url);
    const cronSecretHeader = req.headers.get('X-Cron-Secret') || '';
    const configuredCronSecret = context.env?.CRON_SECRET;
    const isCronAuthorized = Boolean(
      typeof configuredCronSecret === 'string' &&
      configuredCronSecret.length >= 16 &&
      cronSecretHeader &&
      url.searchParams.get('action') !== 'restore' &&
      (await timingSafeEqualHash(cronSecretHeader, configuredCronSecret))
    );

    if (!isCronAuthorized) {
      const auth = await verifyAdminAuthorization(req, context.env);
      if (!auth.authorized) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unauthorized: Admin authentication or cron trigger token required',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    // Support action=restore
    const action = url.searchParams.get('action');
    if (action === 'restore') {
      let backupBytes: Uint8Array | null = null;
      const bodyBuffer = await req.arrayBuffer();
      if (bodyBuffer && bodyBuffer.byteLength > 0) {
        backupBytes = new Uint8Array(bodyBuffer);
      } else {
        // Read from storage using key or DAILY_BACKUP_KEY
        const key = url.searchParams.get('key') || DAILY_BACKUP_KEY;
        const r2 = getR2Bucket(context.env);
        if (r2) {
          const obj = await r2.get(key);
          if (obj) {
            const buf = await obj.arrayBuffer();
            backupBytes = new Uint8Array(buf);
          }
        }
        if (!backupBytes && !isProductionEnv(context.env) && inMemoryBackupSnapshots.has(key)) {
          backupBytes = inMemoryBackupSnapshots.get(key)!.data;
        }
      }

      if (!backupBytes) {
        return new Response(
          JSON.stringify({ success: false, error: 'No backup payload provided or found in storage' }),
          { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      const restoreResult = await restoreBackup(backupBytes, context.env);
      return new Response(JSON.stringify(restoreResult, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const backupResult = await executeBackup(context.env);

    return new Response(JSON.stringify(backupResult, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-SHA256-Checksum': backupResult.checksumSha256,
        'X-Backup-Timestamp': backupResult.timestamp,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Internal Backup Execution Error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

/**
 * GET /api/cron-backup
 * Returns telemetry regarding the last backup, active snapshots, and retention policy.
 */
export async function onRequestGet(context: {
  request: Request;
  env?: Env;
}): Promise<Response> {
  const isProd = isProductionEnv(context.env);
  const r2 = getR2Bucket(context.env);
  const db = getD1Database(context.env);

  if (isProd && (!r2 || !db)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Production backup service requires active R2 and D1 bindings' }),
      { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const activeSnapshots: string[] = [];
  let lastBackup: Partial<BackupExecutionResult> | null = globalLastBackupMetadata;
  let fullBackup: Record<string, unknown> | null = null;

  if (r2) {
    try {
      const list = await r2.list({ prefix: BACKUP_PREFIX });
      for (const obj of list.objects) {
        activeSnapshots.push(obj.key);
      }
      // Worker isolates do not share globals. Read the durable daily pointer's
      // metadata so the admin status remains correct after a scheduled backup.
      const daily = await r2.head(DAILY_BACKUP_KEY);
      if (context.env?.AWS_FULL_DR_ENABLED === 'true') {
        const full = await r2.head(FULL_DAILY_KEY);
        const meta = full?.customMetadata;
        if (meta && /^[a-f0-9]{64}$/.test(meta.sha256 || '') && Number.isFinite(Date.parse(meta.timestamp || ''))) {
          fullBackup = { success: true, timestamp: meta.timestamp, tableCount: Number(meta.tables), totalRecords: Number(meta.records), objectCount: Number(meta.objects), mediaBytes: Number(meta.mediaBytes), checksumSha256: meta.sha256 };
        }
      }
      const metadata = daily?.customMetadata;
      if (metadata && /^[a-f0-9]{64}$/.test(metadata.sha256 || '') && Number.isFinite(Date.parse(metadata.timestamp || ''))) {
        lastBackup = {
          success: true,
          key: DAILY_BACKUP_KEY,
          timestamp: metadata.timestamp,
          checksumSha256: metadata.sha256,
          encryptedBytes: daily!.size,
          storage: 'Cloudflare-R2',
        };
      } else if (isProd) {
        lastBackup = null;
      }
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Backup status storage unavailable' }), {
        status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
  }

  if (!isProd) {
    for (const key of inMemoryBackupSnapshots.keys()) {
      if (!activeSnapshots.includes(key)) activeSnapshots.push(key);
    }
  }

  return new Response(
    JSON.stringify(
      {
        success: true,
        status: lastBackup ? 'SUCCESS' : 'IDLE',
        lastBackup,
        fullBackup,
        retentionDays: 7,
        retentionPeriodMs: RETENTION_PERIOD_MS,
        safeStorageCapGB: 8.0,
        activeSnapshotsCount: activeSnapshots.length,
        activeSnapshots,
        timestamp: Date.now(),
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}

/**
 * OPTIONS /api/cron-backup
 */
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-PIN, X-Cron-Secret',
      'Access-Control-Max-Age': '86400',
    },
  });
}
