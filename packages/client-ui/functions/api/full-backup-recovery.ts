import { getR2Bucket, type Env } from './_db.js';
import { wrapBackupRecoveryKey } from './_backup-recovery.js';
import { FULL_DAILY_KEY } from './_full-backup.js';
import { timingSafeEqualHash } from './admin.js';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers });

export async function onRequestPost({
  request,
  env,
}: {
  request: Request;
  env?: Env;
}): Promise<Response> {
  const token = env?.CRON_SECRET;
  const providedSecret = request.headers.get('X-Cron-Secret') || '';

  if (
    typeof token !== 'string' ||
    token.length < 32 ||
    !providedSecret ||
    !(await timingSafeEqualHash(providedSecret, token))
  ) {
    return reply(401, { success: false, error: 'Unauthorized' });
  }

  if (!env?.BACKUP_RECOVERY_PUBLIC_KEY) {
    return reply(503, { success: false, error: 'Recovery is disabled' });
  }

  if (
    typeof env.BACKUP_ENCRYPTION_KEY !== 'string' ||
    env.BACKUP_ENCRYPTION_KEY.trim().length < 16
  ) {
    return reply(503, { success: false, error: 'Dedicated backup key unavailable' });
  }

  if (new URL(request.url).search || (await request.arrayBuffer()).byteLength !== 0) {
    return reply(400, { success: false, error: 'Recovery takes no parameters or payload' });
  }

  try {
    const object = await getR2Bucket(env)?.get(FULL_DAILY_KEY);
    if (!object) return reply(404, { success: false, error: 'Full snapshot unavailable' });
    if (object.size > 8 * 1024 * 1024) return reply(413, { success: false, error: 'Manifest too large' });

    const bytes = new Uint8Array(await object.arrayBuffer());
    const checksumSha256 = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      (b) => b.toString(16).padStart(2, '0')
    ).join('');

    if (
      bytes.length < 28 ||
      bytes.length > 8 * 1024 * 1024 ||
      checksumSha256 !== object.customMetadata?.sha256
    ) {
      throw new Error('Invalid manifest');
    }

    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 8192) {
      chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
    }

    return reply(200, {
      success: true,
      snapshotKey: FULL_DAILY_KEY,
      s3Key: object.customMetadata?.s3Key,
      checksumSha256,
      encryptedBytes: bytes.length,
      envelope: await wrapBackupRecoveryKey(
        env.BACKUP_ENCRYPTION_KEY,
        env.BACKUP_RECOVERY_PUBLIC_KEY
      ),
      ciphertextBase64: btoa(chunks.join('')),
    });
  } catch {
    return reply(500, { success: false, error: 'Encrypted full recovery failed' });
  }
}

export function onRequestGet(): Response {
  return reply(405, { success: false, error: 'POST required' });
}
