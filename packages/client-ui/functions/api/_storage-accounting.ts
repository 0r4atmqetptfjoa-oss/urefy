import { getD1Database, type Env } from './_db.js';

const MiB = 1024 * 1024;
function limit(value: unknown, fallback: number, ceiling: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, ceiling) : fallback;
}
export function storageLimits(env?: Env) {
  return {
    maxFileBytes: limit(env?.MAX_UPLOAD_BYTES, 25 * MiB, 25 * MiB),
    accountQuotaBytes: limit(env?.MAX_ACCOUNT_STORAGE_BYTES, 100 * MiB, 1024 * MiB),
    globalQuotaBytes: limit(env?.MAX_STORAGE_CAP_BYTES, 8192 * MiB, 8192 * MiB),
  };
}
export async function getAccountStorage(env: Env | undefined, owner: string) {
  const db = getD1Database(env);
  if (!db) throw new Error('Durable storage accounting is unavailable');
  const row = await db.prepare('SELECT COALESCE(SUM(byte_size), 0) AS bytes FROM storage_allocations WHERE owner_fingerprint = ?').bind(owner).first<{ bytes: number }>();
  return { ...storageLimits(env), usedBytes: Number(row?.bytes) || 0 };
}
/** Single conditional INSERT serializes quota checks across isolates. Reservations
 * do not expire: uncertain writes count until deletion proves the bytes are gone. */
export async function allocateStorage(env: Env | undefined, key: string, owner: string, bytes: number): Promise<boolean> {
  const db = getD1Database(env);
  if (!db) throw new Error('Durable storage accounting is unavailable');
  const caps = storageLimits(env);
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > caps.maxFileBytes) return false;
  const result = await db.prepare(`INSERT INTO storage_allocations (object_key, owner_fingerprint, byte_size, created_at)
    SELECT ?, ?, ?, ? WHERE
      (SELECT COALESCE(SUM(byte_size), 0) FROM storage_allocations WHERE owner_fingerprint = ?) + ? <= ?
      AND (SELECT COALESCE(SUM(byte_size), 0) FROM storage_allocations) + ? +
        (SELECT COALESCE(SUM(byte_size), 0) FROM nanopublications WHERE r2_key IS NOT NULL
          AND r2_key NOT IN (SELECT object_key FROM storage_allocations)) <= ?`)
    .bind(key, owner, bytes, Date.now(), owner, bytes, caps.accountQuotaBytes, bytes, caps.globalQuotaBytes).run();
  if (!result.success) throw new Error('Storage accounting could not be updated');
  return Number(result.meta?.changes) === 1;
}
export async function releaseStorage(env: Env | undefined, key: string): Promise<void> {
  const db = getD1Database(env);
  if (!db) throw new Error('Durable storage accounting is unavailable');
  await db.batch([
    db.prepare('DELETE FROM nanopublications WHERE r2_key = ?').bind(key),
    db.prepare('DELETE FROM storage_allocations WHERE object_key = ?').bind(key),
  ]);
}
export function validateUploadMime(type: string, data: Uint8Array): boolean {
  const mime = type.split(';')[0].trim().toLowerCase();
  const signatures: Record<string, number[]> = {
    'image/png': [137, 80, 78, 71, 13, 10, 26, 10], 'image/jpeg': [255, 216, 255],
    'image/gif': [71, 73, 70, 56], 'application/pdf': [37, 80, 68, 70, 45],
  };
  if (signatures[mime]) return signatures[mime].every((byte, index) => data[index] === byte);
  if (mime === 'image/webp') return new TextDecoder().decode(data.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(data.slice(8, 12)) === 'WEBP';
  return ['application/octet-stream', 'application/zip', 'application/gzip', 'application/x-gzip', 'application/x-tar', 'application/json', 'text/plain', 'text/markdown', 'text/csv', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'application/x-msdownload', 'application/x-executable'].includes(mime);
}
