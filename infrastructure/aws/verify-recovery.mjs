import { readFile, writeFile } from 'node:fs/promises';
import { createHash, privateDecrypt, constants, createDecipheriv } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const dir = new URL('.aws-recovery/', root);
const fromS3 = process.argv.includes('--s3');
const offline = process.argv.includes('--offline') || fromS3;
let recovered;
if (offline) recovered = JSON.parse(await readFile(new URL('snapshot-envelope.json', dir), 'utf8'));
else {
  const config = {};
  for (const line of (await readFile(new URL('.env', root), 'utf8')).split(/\r?\n/)) {
    const match = line.match(/^\s*CRON_SECRET\s*=\s*(.*?)\s*$/);
    if (match) config.CRON_SECRET = match[1].replace(/^(['"])(.*)\1$/, '$2');
  }
  if (!config.CRON_SECRET || config.CRON_SECRET.length < 32) throw new Error('Backup trigger unavailable');
  const response = await fetch('https://urefy.com/api/backup-recovery', { method: 'POST', headers: { 'X-Cron-Secret': config.CRON_SECRET }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Recovery preparation HTTP ${response.status}`);
  recovered = await response.json();
}
const der = Buffer.from((await readFile(new URL('recovery-public-key.spki', dir), 'utf8')).trim(), 'base64');
const envelope = recovered.envelope;
if (!recovered.success || recovered.snapshotKey !== 'backups/d1-snapshot-daily.enc' || envelope?.version !== 1 || envelope.algorithm !== 'RSA-OAEP-SHA256' || envelope.keyDerivation !== 'AES256GCM-SHA256' || envelope.recipientKeySha256 !== createHash('sha256').update(der).digest('hex')) throw new Error('Recovery envelope does not match owner key');
const ciphertext = fromS3 ? await readFile(new URL('s3-snapshot.enc', dir)) : Buffer.from(recovered.ciphertextBase64, 'base64');
if (ciphertext.length < 28 || ciphertext.length > 8 * 1024 * 1024 || ciphertext.length !== recovered.encryptedBytes || createHash('sha256').update(ciphertext).digest('hex') !== recovered.checksumSha256) throw new Error('Ciphertext integrity mismatch');
const protectedPrivate = await readFile(new URL('recovery-private-key.dpapi', dir));
const unprotected = spawnSync('powershell.exe', ['-NoProfile', '-File', fileURLToPath(new URL('./recovery-key-protection.ps1', import.meta.url)), '-Mode', 'unprotect'], { input: protectedPrivate.toString('base64'), encoding: 'utf8', windowsHide: true });
if (unprotected.status !== 0) throw new Error('Local recovery key could not be opened');
const privatePem = Buffer.from(unprotected.stdout, 'base64');
const aesKey = privateDecrypt({ key: privatePem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(envelope.wrappedKey, 'base64'));
try {
  if (aesKey.length !== 32) throw new Error('Recovery key length mismatch');
  const decipher = createDecipheriv('aes-256-gcm', aesKey, ciphertext.subarray(0, 12));
  decipher.setAuthTag(ciphertext.subarray(-16));
  const compressed = Buffer.concat([decipher.update(ciphertext.subarray(12, -16)), decipher.final()]);
  const plain = gunzipSync(compressed, { maxOutputLength: 64 * 1024 * 1024 });
  try {
    const manifest = JSON.parse(plain.toString('utf8'));
    const tables = ['posts', 'channels', 'messages', 'nullifiers', 'push_subscriptions'];
    if (manifest.version !== '1.0.0' || !manifest.tables || Object.keys(manifest.tables).sort().join(',') !== tables.sort().join(',')) throw new Error('Manifest schema mismatch');
    const counts = Object.fromEntries(tables.map(t => { if (!Array.isArray(manifest.tables[t]) || manifest.counts?.[t] !== manifest.tables[t].length) throw new Error('Manifest count mismatch'); return [t, manifest.tables[t].length]; }));
    if (Object.values(counts).reduce((sum, n) => sum + n, 0) !== manifest.totalRecords) throw new Error('Manifest total mismatch');
    if (!offline) {
      await writeFile(new URL('snapshot-envelope.json', dir), JSON.stringify(recovered, null, 2));
      await writeFile(new URL('snapshot.enc', dir), ciphertext);
    }
    console.log(JSON.stringify({ verified: true, offline, source: fromS3 ? 'local S3 console download' : 'R2 recovery package', encryptedBytes: ciphertext.length, checksumSha256: recovered.checksumSha256, manifestTimestamp: manifest.timestamp, tableCounts: counts, totalRecords: manifest.totalRecords, liveDatabaseModified: false, plaintextSaved: false }));
  } finally { plain.fill(0); compressed.fill(0); }
} finally { aesKey.fill(0); privatePem.fill(0); }
