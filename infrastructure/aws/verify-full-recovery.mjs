import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unwrapKey, decryptArchive, verifyDatabaseRestore, verifyFileParts, sha256 } from './full-recovery-lib.mjs';

const root = new URL('../../', import.meta.url), dir = new URL('.aws-recovery/', root);
const offline = process.argv.includes('--offline');
await mkdir(new URL('full-parts/', dir), { recursive: true });
let recovered;
if (offline) recovered = JSON.parse(await readFile(new URL('full-snapshot-envelope.json', dir), 'utf8'));
else {
  const env = await readFile(new URL('.env', root), 'utf8');
  const token = env.match(/^\s*CRON_SECRET\s*=\s*(.*?)\s*$/m)?.[1].replace(/^(['"])(.*)\1$/, '$2');
  if (!token || token.length < 32) throw new Error('Backup trigger unavailable');
  const response = await fetch('https://urefy.com/api/full-backup-recovery', { method: 'POST', headers: { 'X-Cron-Secret': token }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Full recovery HTTP ${response.status}`);
  recovered = await response.json();
}
const der = Buffer.from((await readFile(new URL('recovery-public-key.spki', dir), 'utf8')).trim(), 'base64');
if (!recovered.success || recovered.snapshotKey !== 'dr/full-snapshot-daily.enc' || recovered.envelope?.recipientKeySha256 !== sha256(der)) throw new Error('Full recovery recipient mismatch');
const protectedPrivate = await readFile(new URL('recovery-private-key.dpapi', dir));
const result = spawnSync('powershell.exe', ['-NoProfile', '-File', fileURLToPath(new URL('./recovery-key-protection.ps1', import.meta.url)), '-Mode', 'unprotect'], { input: protectedPrivate.toString('base64'), encoding: 'utf8', windowsHide: true });
if (result.status !== 0) throw new Error('Owner recovery key unavailable');
const pem = Buffer.from(result.stdout, 'base64'), key = unwrapKey(recovered, pem);
try {
  const cipher = Buffer.from(recovered.ciphertextBase64, 'base64');
  if (cipher.length !== recovered.encryptedBytes) throw new Error('Full ciphertext size mismatch');
  const plain = decryptArchive(cipher, key, recovered.checksumSha256);
  let manifest;
  try { manifest = JSON.parse(plain.toString('utf8')); } finally { plain.fill(0); }
  const database = verifyDatabaseRestore(manifest);
  const files = await verifyFileParts(manifest, key, async part => {
    const name = `${sha256(part.key)}.enc`, destination = new URL(`full-parts/${name}`, dir);
    if (!offline) {
      const cli = fileURLToPath(new URL('node_modules/wrangler/bin/wrangler.js', root));
      const download = spawnSync(process.execPath, [cli, 'r2', 'object', 'get', `aetheris-vault/${part.localKey}`, '--file', fileURLToPath(destination), '--remote'], { cwd: fileURLToPath(new URL('packages/client-ui/', root)), encoding: 'utf8', windowsHide: true, timeout: 60000 });
      if (download.status !== 0) throw new Error('Encrypted archive part download failed');
    }
    return readFile(destination);
  });
  if (!offline) {
    await writeFile(new URL('full-snapshot-envelope.json', dir), JSON.stringify(recovered, null, 2));
    await writeFile(new URL('full-snapshot.enc', dir), cipher);
  }
  console.log(JSON.stringify({ verified: true, offline, timestamp: manifest.timestamp, checksumSha256: recovered.checksumSha256, encryptedManifestBytes: cipher.length, ...database, ...files }));
} finally { key.fill(0); pem.fill(0); }
