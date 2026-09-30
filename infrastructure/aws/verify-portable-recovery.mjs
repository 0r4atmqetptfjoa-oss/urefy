import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { decryptPortable } from './portable-recovery-lib.mjs';
import { sha256, unwrapKey, decryptArchive, verifyDatabaseRestore, verifyFileParts } from './full-recovery-lib.mjs';

export async function verifyPortable(bundle, password) {
  const payload = await decryptPortable(bundle, password);
  const pem = Buffer.from(payload.privatePemBase64, 'base64');
  const recovered = payload.fullSnapshot;
  if (!recovered?.success || recovered.snapshotKey !== 'dr/full-snapshot-daily.enc') throw new Error('Portable full snapshot unavailable');
  const key = unwrapKey(recovered, pem);
  try {
    const cipher = Buffer.from(recovered.ciphertextBase64, 'base64');
    if (cipher.length !== recovered.encryptedBytes) throw new Error('Portable manifest size mismatch');
    const plain = decryptArchive(cipher, key, recovered.checksumSha256);
    let manifest;
    try { manifest = JSON.parse(plain.toString('utf8')); } finally { plain.fill(0); }
    const database = verifyDatabaseRestore(manifest);
    const files = await verifyFileParts(manifest, key, async part => {
      const data = payload.parts?.[sha256(part.key)];
      if (typeof data !== 'string') throw new Error('Portable media part missing');
      return Buffer.from(data, 'base64');
    });
    return { verified: true, portable: true, requiresWindowsProfile: false, timestamp: manifest.timestamp, ...database, ...files };
  } finally { key.fill(0); pem.fill(0); payload.privatePemBase64 = ''; }
}

// CLI receives password via stdin only, never argv/environment/logs. Prefer the local form for interactive use.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const path = process.argv[2];
    if (!path) throw new Error('Encrypted bundle path required');
    let password = '';
    for await (const chunk of process.stdin) { password += chunk; if (password.length > 1024) throw new Error('Password input too large'); }
    password = password.replace(/\r?\n$/, '');
    console.log(JSON.stringify(await verifyPortable(JSON.parse(await readFile(path, 'utf8')), password)));
    password = '';
  } catch { console.error('Portable recovery verification failed'); process.exitCode = 1; }
}
