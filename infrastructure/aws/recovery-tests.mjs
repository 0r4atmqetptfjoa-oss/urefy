import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createCipheriv, generateKeyPairSync, publicEncrypt, constants } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { encryptPortable, decryptPortable } from './portable-recovery-lib.mjs';
import { sha256, decryptArchive, verifyDatabaseRestore, verifyFileParts } from './full-recovery-lib.mjs';
import { verifyPortable } from './verify-portable-recovery.mjs';

const manifest = {
  version: '2.0.0', timestamp: '2026-09-30T06:00:00.000Z', totalRecords: 2,
  schema: [{ type: 'table', name: 'items', sql: 'CREATE TABLE items(id INTEGER PRIMARY KEY AUTOINCREMENT, data BLOB, label TEXT, label_length INTEGER GENERATED ALWAYS AS (length(label)) STORED)' },
    { type: 'index', name: 'items_label', sql: 'CREATE INDEX items_label ON items(label)' }],
  tables: { items: [{ id: 1, data: [0, 127, 255], label: "quoted ' value", label_length: 14 }, { id: 2, data: [], label: null, label_length: null }] },
  counts: { items: 2 }, sequences: [{ name: 'items', seq: 50 }], objects: [],
};
function encrypted(bytes, key) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  return Buffer.concat([iv, cipher.update(gzipSync(bytes)), cipher.final(), cipher.getAuthTag()]);
}
test('in-memory restore preserves blobs, generated columns, indexes and counts', () => {
  const result = verifyDatabaseRestore(manifest);
  assert.equal(result.integrity, 'ok'); assert.equal(result.foreignKeyViolations, 0); assert.equal(result.totalRecords, 2);
});
test('row-count mismatch fails restore', () => {
  assert.throws(() => verifyDatabaseRestore({ ...manifest, counts: { items: 1 } }));
});
test('authenticated archive rejects corruption', () => {
  const key = randomBytes(32), bytes = encrypted(Buffer.from('test'), key), original = sha256(bytes);
  assert.equal(decryptArchive(bytes, key, original).toString(), 'test');
  bytes[15] ^= 1; assert.throws(() => decryptArchive(bytes, key, original));
});
test('file-part validation detects size/hash mismatch', async () => {
  const key = randomBytes(32), bytes = encrypted(Buffer.from('abc'), key);
  const partKey = 'backups/full-dr/1790748886997-b815cdbc-a30a-4942-b9df-a3e9c79ee4fb/part-000000.enc';
  const part = { key: partKey, localKey: partKey.replace('backups/full-dr/', 'dr/'), checksumSha256: sha256(bytes), encryptedBytes: bytes.length, offset: 0, bytes: 3, plainSha256: sha256('abc') };
  const m = { objects: [{ binding: 'VAULT_BUCKET', size: 3, parts: [part] }] };
  assert.equal((await verifyFileParts(m, key, async () => bytes)).mediaBytes, 3);
  await assert.rejects(verifyFileParts({ objects: [{ ...m.objects[0], size: 4 }] }, key, async () => bytes));
});
test('portable encryption is authenticated and rejects wrong passwords', async () => {
  const password = randomBytes(32).toString('hex'), data = { fixture: true };
  const encrypted = await encryptPortable(data, password);
  assert.deepEqual(await decryptPortable(encrypted, password), data);
  await assert.rejects(decryptPortable(encrypted, password + 'wrong'));
  await assert.rejects(decryptPortable({ ...encrypted, N: 1 }, password));
});
test('portable kit verifies without DPAPI, filesystem, AWS or production access', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 4096 });
  const key = randomBytes(32), bytes = encrypted(Buffer.from(JSON.stringify(manifest)), key);
  const wrapped = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key);
  const payload = { privatePemBase64: Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64'), parts: {},
    fullSnapshot: { success: true, snapshotKey: 'dr/full-snapshot-daily.enc', checksumSha256: sha256(bytes), encryptedBytes: bytes.length, ciphertextBase64: bytes.toString('base64'),
      envelope: { version: 1, algorithm: 'RSA-OAEP-SHA256', keyDerivation: 'AES256GCM-SHA256', wrappedKey: wrapped.toString('base64') } } };
  const password = randomBytes(32).toString('hex');
  const proof = await verifyPortable(await encryptPortable(payload, password), password);
  assert.equal(proof.verified, true); assert.equal(proof.requiresWindowsProfile, false); assert.equal(proof.liveDatabaseModified, false);
});
