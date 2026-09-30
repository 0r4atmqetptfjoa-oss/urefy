import { generateKeyPairSync, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const dir = new URL('.aws-recovery/', root);
const privateFile = new URL('recovery-private-key.dpapi', dir);
const publicFile = new URL('recovery-public-key.spki', dir);
if (process.platform !== 'win32') throw new Error('Windows CurrentUser DPAPI required');
await mkdir(dir, { recursive: true });
let present = false;
try { await access(privateFile); present = true; } catch {}
if (!present) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 4096 });
  const plain = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const wrapped = spawnSync('powershell.exe', ['-NoProfile', '-File', fileURLToPath(new URL('./recovery-key-protection.ps1', import.meta.url)), '-Mode', 'protect'], {
    input: Buffer.from(plain).toString('base64'), encoding: 'utf8', windowsHide: true,
  });
  if (wrapped.status !== 0 || !/^[A-Za-z0-9+/=]+$/.test(wrapped.stdout)) throw new Error('Private recovery key protection failed');
  await writeFile(privateFile, Buffer.from(wrapped.stdout, 'base64'), { flag: 'wx' });
  await writeFile(publicFile, publicKey.export({ type: 'spki', format: 'der' }).toString('base64'), { flag: 'wx' });
}
const publicDer = (await readFile(publicFile, 'utf8')).trim();
const configFile = new URL('packages/client-ui/wrangler.toml', root);
let config = await readFile(configFile, 'utf8');
const binding = `BACKUP_RECOVERY_PUBLIC_KEY = "${publicDer}"`;
if (/^BACKUP_RECOVERY_PUBLIC_KEY\s*=/m.test(config)) config = config.replace(/^BACKUP_RECOVERY_PUBLIC_KEY\s*=.*$/m, binding);
else config = config.replace(/^(AWS_REGION\s*=.*)$/m, `$1\n${binding}`);
await writeFile(configFile, config);
console.log(JSON.stringify({ prepared: true, privateKeyProtection: 'Windows DPAPI CurrentUser', rsaBits: 4096, publicKeySha256: createHash('sha256').update(Buffer.from(publicDer, 'base64')).digest('hex') }));
