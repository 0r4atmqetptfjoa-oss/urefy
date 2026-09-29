import type { Env } from './_db.js';

const encoder = new TextEncoder();

function hex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function encodePath(path: string): string {
  return path.split('/').map((part) => encodeURIComponent(part).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )).join('/');
}

async function sha256(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  return hex(await crypto.subtle.digest('SHA-256', bytes));
}

async function hmac(key: Uint8Array, value: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value)));
}

function awsDate(date: Date): { full: string; day: string } {
  const full = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { full, day: full.slice(0, 8) };
}

export interface S3BackupResult {
  enabled: boolean;
  key?: string;
  etag?: string;
}

/** Mirrors an already-encrypted backup to S3 using the Pages runtime credential. */
export async function mirrorEncryptedBackupToS3(
  env: Env | undefined,
  objectKey: string,
  ciphertext: Uint8Array,
): Promise<S3BackupResult> {
  const region = env?.AWS_REGION;
  const bucket = env?.AWS_S3_BUCKET;
  const accessKeyId = env?.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env?.AWS_SECRET_ACCESS_KEY;
  const configured = [region, bucket, accessKeyId, secretAccessKey].some(Boolean);

  if (!configured) return { enabled: false };
  if (![region, bucket, accessKeyId, secretAccessKey].every((value) => typeof value === 'string' && value.length > 0)) {
    throw new Error('AWS S3 backup is partially configured; set region, bucket, and runtime credentials together.');
  }

  const key = objectKey.replace(/^\/+/, '');
  if (!key.startsWith('backups/')) throw new Error('AWS S3 backup key must stay under backups/.');
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const canonicalUri = `/${encodePath(key)}`;
  const url = `https://${host}${canonicalUri}`;
  const date = awsDate(new Date());
  const payloadHash = await sha256(ciphertext);
  const signedHeadersMap: Record<string, string> = {
    host,
    'content-type': 'application/octet-stream',
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': date.full,
    'x-amz-server-side-encryption': 'AES256',
  };
  const signedHeaders = Object.keys(signedHeadersMap).sort().join(';');
  const canonicalHeaders = Object.keys(signedHeadersMap).sort().map((name) => `${name}:${signedHeadersMap[name].trim()}\n`).join('');
  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${date.day}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', date.full, scope, await sha256(canonicalRequest)].join('\n');

  let signingKey = await hmac(encoder.encode(`AWS4${secretAccessKey}`), date.day);
  signingKey = await hmac(signingKey, region);
  signingKey = await hmac(signingKey, 's3');
  signingKey = await hmac(signingKey, 'aws4_request');
  const signature = hex(await hmac(signingKey, stringToSign));
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: 'PUT',
    // The runtime supplies Host from the URL; signing uses the same canonical host.
    headers: {
      'content-type': signedHeadersMap['content-type'],
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': date.full,
      'x-amz-server-side-encryption': 'AES256',
      authorization,
    },
    body: ciphertext as unknown as BodyInit,
  });
  if (!response.ok) {
    // Do not include response bodies or request headers; they may contain sensitive diagnostics.
    throw new Error(`AWS S3 backup upload failed with HTTP ${response.status}.`);
  }
  return { enabled: true, key, etag: response.headers.get('etag') ?? undefined };
}
