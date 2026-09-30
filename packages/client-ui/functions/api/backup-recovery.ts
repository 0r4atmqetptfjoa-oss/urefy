import { getR2Bucket, type Env } from './_db.js';
import { wrapBackupRecoveryKey } from './_backup-recovery.js';

const DAILY_KEY = 'backups/d1-snapshot-daily.enc';
const MAX_RECOVERY_BYTES = 8 * 1024 * 1024;
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

/** Disabled unless the owner's public recovery key is configured. Never accepts a recipient key from the caller. */
export async function onRequestPost({ request, env }: { request: Request; env?: Env }): Promise<Response> {
  const token = env?.CRON_SECRET;
  if (typeof token !== 'string' || token.length < 32 || request.headers.get('X-Cron-Secret') !== token) {
    return reply(401, { success: false, error: 'Unauthorized' });
  }
  if (typeof env?.BACKUP_RECOVERY_PUBLIC_KEY !== 'string' || !env.BACKUP_RECOVERY_PUBLIC_KEY) {
    return reply(503, { success: false, error: 'Recovery is disabled' });
  }
  if (typeof env.BACKUP_ENCRYPTION_KEY !== 'string' || env.BACKUP_ENCRYPTION_KEY.trim().length < 16) {
    return reply(503, { success: false, error: 'Dedicated backup key unavailable' });
  }
  // Fixed current snapshot only; no arbitrary R2 key, request body or restore action.
  if (new URL(request.url).search || (await request.arrayBuffer()).byteLength !== 0) {
    return reply(400, { success: false, error: 'Recovery takes no parameters or payload' });
  }
  try {
    const object = await getR2Bucket(env)?.get(DAILY_KEY);
    if (!object) return reply(404, { success: false, error: 'Encrypted snapshot unavailable' });
    if (object.size > MAX_RECOVERY_BYTES) return reply(413, { success: false, error: 'Snapshot exceeds recovery download limit' });
    const ciphertext = new Uint8Array(await object.arrayBuffer());
    if (ciphertext.byteLength < 28 || ciphertext.byteLength > MAX_RECOVERY_BYTES) throw new Error('Invalid ciphertext size');
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', ciphertext));
    const checksumSha256 = Array.from(digest, b => b.toString(16).padStart(2, '0')).join('');
    if (!object.customMetadata?.sha256 || object.customMetadata.sha256 !== checksumSha256) throw new Error('Checksum mismatch');
    const envelope = await wrapBackupRecoveryKey(env.BACKUP_ENCRYPTION_KEY, env.BACKUP_RECOVERY_PUBLIC_KEY);
    const chunks: string[] = [];
    for (let i = 0; i < ciphertext.length; i += 8192) chunks.push(String.fromCharCode(...ciphertext.subarray(i, i + 8192)));
    return reply(200, {
      success: true, snapshotKey: DAILY_KEY, checksumSha256,
      encryptedBytes: ciphertext.byteLength, envelope,
      ciphertextBase64: btoa(chunks.join('')),
    });
  } catch {
    return reply(500, { success: false, error: 'Encrypted recovery preparation failed' });
  }
}

export function onRequestGet(): Response { return reply(405, { success: false, error: 'POST required' }); }
