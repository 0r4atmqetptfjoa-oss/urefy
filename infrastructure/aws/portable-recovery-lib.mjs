import { randomBytes, scrypt as scryptCallback, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
const options = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };
const aad = Buffer.from('UREfy portable infrastructure recovery v1');

export async function encryptPortable(payload, password) {
  if (typeof password !== 'string' || password.length < 16 || password.length > 512) throw new Error('Use a separate recovery passphrase of at least 16 characters');
  const salt = randomBytes(32), iv = randomBytes(12);
  const key = await scrypt(password, salt, 32, options);
  const plain = Buffer.from(JSON.stringify(payload));
  try {
    const cipher = createCipheriv('aes-256-gcm', key, iv); cipher.setAAD(aad);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    return { format: 'urefy-portable-recovery', version: 1, algorithm: 'AES-256-GCM', kdf: 'scrypt', N: options.N, r: options.r, p: options.p,
      salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: encrypted.toString('base64') };
  } finally { key.fill(0); plain.fill(0); }
}

export async function decryptPortable(bundle, password) {
  if (bundle.format !== 'urefy-portable-recovery' || bundle.version !== 1 || bundle.algorithm !== 'AES-256-GCM' || bundle.kdf !== 'scrypt' || bundle.N !== options.N || bundle.r !== options.r || bundle.p !== options.p) throw new Error('Invalid portable recovery format');
  const salt = Buffer.from(bundle.salt, 'base64'), iv = Buffer.from(bundle.iv, 'base64'), tag = Buffer.from(bundle.tag, 'base64'), ciphertext = Buffer.from(bundle.ciphertext, 'base64');
  if (salt.length !== 32 || iv.length !== 12 || tag.length !== 16 || ciphertext.length > 200 * 1024 * 1024) throw new Error('Invalid portable recovery size');
  const key = await scrypt(password, salt, 32, options);
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv); decipher.setAAD(aad); decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    try { return JSON.parse(plain.toString('utf8')); } finally { plain.fill(0); }
  } finally { key.fill(0); }
}
