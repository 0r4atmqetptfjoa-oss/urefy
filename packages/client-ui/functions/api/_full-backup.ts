import { getD1Database, getR2Bucket, type Env, type R2Bucket, type R2Object } from './_db.js';
import { mirrorEncryptedBackupToS3 } from './_aws-s3.js';

export const FULL_DAILY_KEY = 'dr/full-snapshot-daily.enc';
export const FULL_LIMITS = { objects: 200, mediaBytes: 128 * 1024 * 1024, databaseBytes: 12 * 1024 * 1024, rowsPerTable: 20000, tables: 100, partBytes: 4 * 1024 * 1024 };
type Protector = (plain: Uint8Array) => Promise<{ encryptedPayload: Uint8Array; checksumSha256: string }>;
const encoder = new TextEncoder();
const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;
const schemaSQL = "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\' AND sql IS NOT NULL ORDER BY type,name";
const excluded = (key: string) => key.startsWith('backups/') || key.startsWith('dr/');
const hash = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource)), b => b.toString(16).padStart(2, '0')).join('');

export async function inventoryBucket(bucket: R2Bucket): Promise<R2Object[]> {
  const objects: R2Object[] = [];
  let cursor: string | undefined;
  const cursors = new Set<string>();
  do {
    const page = await bucket.list({ limit: 1000, cursor, include: ['httpMetadata', 'customMetadata'] });
    for (const item of page.objects) if (!excluded(item.key)) {
      objects.push(item);
      if (objects.length > FULL_LIMITS.objects) throw new Error('FULL_DR_OBJECT_LIMIT');
    }
    if (!page.truncated) break;
    if (!page.cursor || cursors.has(page.cursor)) throw new Error('FULL_DR_INVALID_CURSOR');
    cursors.add(page.cursor); cursor = page.cursor;
  } while (true);
  return objects.sort((a, b) => a.key.localeCompare(b.key));
}

/** Read-only capture of all application tables and both R2 bindings. Only encrypted archive writes. */
export async function executeFullBackup(env: Env, protect: Protector, timestamp: string) {
  const db = getD1Database(env), archiveBucket = getR2Bucket(env);
  if (!db || !archiveBucket || !env.STORAGE_BUCKET || !env.VAULT_BUCKET) throw new Error('FULL_DR_BINDINGS_UNAVAILABLE');
  const initial = await db.prepare(schemaSQL).all<any>();
  if (!initial.success || !Array.isArray(initial.results)) throw new Error('FULL_DR_SCHEMA_UNAVAILABLE');
  // D1 restricts page_count/page_size PRAGMAs; its read-result metadata provides database size.
  if (!Number.isSafeInteger(initial.meta?.size_after) || initial.meta.size_after <= 0 || initial.meta.size_after > FULL_LIMITS.databaseBytes) throw new Error('FULL_DR_DATABASE_SIZE_LIMIT');
  const names = initial.results.filter(s => s.type === 'table').map(s => s.name);
  if (!names.length || names.length > FULL_LIMITS.tables || names.some(n => typeof n !== 'string' || n.length > 200)) throw new Error('FULL_DR_TABLE_LIMIT');
  if (initial.results.some(s => /CREATE\s+VIRTUAL\s+TABLE/i.test(s.sql))) throw new Error('FULL_DR_VIRTUAL_TABLE_UNSUPPORTED');
  const sequenceExists = await db.prepare("SELECT name FROM sqlite_schema WHERE name='sqlite_sequence'").first();
  // Schema, table rows and sequences captured by one read-only transactional D1 batch.
  const statements = [db.prepare(schemaSQL), ...names.map(n => db.prepare(`SELECT * FROM ${quote(n)} LIMIT ${FULL_LIMITS.rowsPerTable + 1}`))];
  if (sequenceExists) statements.push(db.prepare('SELECT name,seq FROM sqlite_sequence'));
  const batch = await db.batch<any>(statements);
  if (batch.length !== statements.length || batch.some(r => !r.success || !Array.isArray(r.results))) throw new Error('FULL_DR_DATABASE_READ_FAILED');
  if (JSON.stringify(batch[0].results) !== JSON.stringify(initial.results)) throw new Error('FULL_DR_SCHEMA_CHANGED');
  const tables: Record<string, any[]> = Object.create(null), counts: Record<string, number> = Object.create(null);
  for (let i = 0; i < names.length; i++) {
    const rows = batch[i + 1].results;
    if (rows.length > FULL_LIMITS.rowsPerTable) throw new Error('FULL_DR_ROW_LIMIT');
    tables[names[i]] = rows; counts[names[i]] = rows.length;
  }
  const bindings = [['STORAGE_BUCKET', env.STORAGE_BUCKET], ['VAULT_BUCKET', env.VAULT_BUCKET]] as const;
  const inventories = await Promise.all(bindings.map(async ([binding, bucket]) => ({ binding, bucket, objects: await inventoryBucket(bucket) })));
  const mediaBytes = inventories.reduce((sum, item) => sum + item.objects.reduce((n, obj) => n + obj.size, 0), 0);
  const objectCount = inventories.reduce((sum, item) => sum + item.objects.length, 0);
  if (mediaBytes > FULL_LIMITS.mediaBytes || objectCount > FULL_LIMITS.objects) throw new Error('FULL_DR_MEDIA_LIMIT');
  const runId = `${Date.now()}-${crypto.randomUUID()}`;
  const base = `backups/full-dr/${runId}`;
  const manifest: any = { version: '2.0.0', timestamp, completedAt: null, schema: batch[0].results, tables, counts,
    totalRecords: Object.values(counts).reduce((a, b) => a + b, 0), sequences: sequenceExists ? batch.at(-1)!.results : [], objects: [],
    consistency: 'D1 transactional read; R2 inventory and object versions checked; no cross-service atomic snapshot',
    excludedPrefixes: ['backups/', 'dr/'], excludedState: ['KV cache', 'Durable Object transient relay state', 'client-only sovereign keys'] };
  if (encoder.encode(JSON.stringify(manifest)).length > FULL_LIMITS.databaseBytes) throw new Error('FULL_DR_DATABASE_SIZE_LIMIT');
  let partCount = 0, encryptedBytes = 0;
  const persist = async (key: string, plain: Uint8Array) => {
    const encrypted = await protect(plain);
    const s3 = await mirrorEncryptedBackupToS3(env, key, encrypted.encryptedPayload);
    if (!s3.enabled) throw new Error('FULL_DR_S3_REQUIRED');
    const localKey = key.replace('backups/full-dr/', 'dr/');
    const saved = await archiveBucket.put(localKey, encrypted.encryptedPayload, { httpMetadata: { contentType: 'application/octet-stream' }, customMetadata: { sha256: encrypted.checksumSha256, timestamp } });
    if (!saved) throw new Error('FULL_DR_ARCHIVE_WRITE_FAILED');
    encryptedBytes += encrypted.encryptedPayload.length;
    return { key, localKey, checksumSha256: encrypted.checksumSha256, encryptedBytes: encrypted.encryptedPayload.length };
  };
  for (const { binding, bucket, objects } of inventories) for (const item of objects) {
    const descriptor: any = { binding, key: item.key, size: item.size, etag: item.etag, uploaded: item.uploaded,
      httpMetadata: item.httpMetadata || {}, customMetadata: item.customMetadata || {}, parts: [] };
    // Include zero-length objects with one authenticated encrypted part.
    for (let offset = 0; offset < item.size || (offset === 0 && item.size === 0); offset += FULL_LIMITS.partBytes) {
      const length = Math.min(FULL_LIMITS.partBytes, item.size - offset);
      const object = await bucket.get(item.key, { onlyIf: { etagMatches: item.etag }, ...(item.size ? { range: { offset, length } } : {}) });
      if (!object || typeof object.arrayBuffer !== 'function' || object.etag !== item.etag) throw new Error('FULL_DR_OBJECT_CHANGED');
      const plain = new Uint8Array(await object.arrayBuffer());
      try {
        if (plain.length !== length) throw new Error('FULL_DR_OBJECT_SIZE_MISMATCH');
        descriptor.parts.push({ ...(await persist(`${base}/part-${String(partCount++).padStart(6, '0')}.enc`, plain)), offset, bytes: plain.length, plainSha256: await hash(plain) });
      } finally { plain.fill(0); }
      if (!item.size) break;
    }
    manifest.objects.push(descriptor);
  }
  // Detect objects added, removed or modified while the capture was running.
  for (const previous of inventories) {
    const current = await inventoryBucket(previous.bucket);
    const signature = (items: R2Object[]) => JSON.stringify(items.map(i => [i.key, i.size, i.etag, i.version, i.customMetadata, i.httpMetadata]));
    if (signature(current) !== signature(previous.objects)) throw new Error('FULL_DR_INVENTORY_CHANGED');
  }
  manifest.completedAt = new Date().toISOString();
  const manifestBytes = encoder.encode(JSON.stringify(manifest));
  if (manifestBytes.length > FULL_LIMITS.databaseBytes) throw new Error('FULL_DR_MANIFEST_SIZE_LIMIT');
  try {
    const encrypted = await protect(manifestBytes);
    const key = `${base}/manifest.enc`;
    const s3 = await mirrorEncryptedBackupToS3(env, key, encrypted.encryptedPayload);
    if (!s3.enabled) throw new Error('FULL_DR_S3_REQUIRED');
    // Commit the daily pointer last: an incomplete archive never appears successful.
    const saved = await archiveBucket.put(FULL_DAILY_KEY, encrypted.encryptedPayload, { httpMetadata: { contentType: 'application/octet-stream' }, customMetadata: { sha256: encrypted.checksumSha256, timestamp, s3Key: key, runId, tables: String(names.length), records: String(manifest.totalRecords), objects: String(objectCount), mediaBytes: String(mediaBytes) } });
    if (!saved) throw new Error('FULL_DR_MANIFEST_COMMIT_FAILED');
    return { success: true, version: '2.0.0', timestamp, completedAt: manifest.completedAt, s3Key: key, checksumSha256: encrypted.checksumSha256,
      tableCount: names.length, totalRecords: manifest.totalRecords, objectCount, mediaBytes, partCount, encryptedBytes: encryptedBytes + encrypted.encryptedPayload.length };
  } finally { manifestBytes.fill(0); }
}
