import { createHash, privateDecrypt, constants, createDecipheriv } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const identifier = name => `"${name.replace(/"/g, '""')}"`;
export function unwrapKey(recovered, privatePem) {
  const e = recovered.envelope;
  if (e?.version !== 1 || e.algorithm !== 'RSA-OAEP-SHA256' || e.keyDerivation !== 'AES256GCM-SHA256') throw new Error('Invalid recovery envelope');
  const key = privateDecrypt({ key: privatePem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(e.wrappedKey, 'base64'));
  if (key.length !== 32) throw new Error('Invalid recovery key');
  return key;
}
export function decryptArchive(ciphertext, key, expectedHash, maxOutputLength = 32 * 1024 * 1024) {
  if (ciphertext.length < 28 || sha256(ciphertext) !== expectedHash) throw new Error('Archive integrity mismatch');
  const decipher = createDecipheriv('aes-256-gcm', key, ciphertext.subarray(0, 12));
  decipher.setAuthTag(ciphertext.subarray(-16));
  const compressed = Buffer.concat([decipher.update(ciphertext.subarray(12, -16)), decipher.final()]);
  try { return gunzipSync(compressed, { maxOutputLength }); } finally { compressed.fill(0); }
}

/** Restores into an in-memory SQLite only. No network, no production DB, no plaintext disk files. */
export function verifyDatabaseRestore(manifest) {
  if (manifest.version !== '2.0.0' || !Array.isArray(manifest.schema) || !manifest.tables || !Array.isArray(manifest.objects)) throw new Error('Invalid full manifest');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=OFF');
    const tables = manifest.schema.filter(s => s.type === 'table');
    if (tables.length !== Object.keys(manifest.tables).length) throw new Error('Schema table count mismatch');
    for (const table of tables) {
      if (!/^CREATE\s+TABLE\b/i.test(table.sql) || typeof table.name !== 'string') throw new Error('Unsupported table schema');
      db.exec(table.sql);
    }
    let totalRecords = 0;
    for (const table of tables) {
      const rows = manifest.tables[table.name];
      if (!Array.isArray(rows) || rows.length !== manifest.counts[table.name]) throw new Error('Table count mismatch');
      const writable = db.prepare(`PRAGMA table_xinfo(${identifier(table.name)})`).all().filter(c => c.hidden === 0).map(c => c.name);
      if (rows.length) {
        const statement = db.prepare(`INSERT INTO ${identifier(table.name)} (${writable.map(identifier).join(',')}) VALUES (${writable.map(() => '?').join(',')})`);
        for (const row of rows) statement.run(...writable.map(c => Array.isArray(row[c]) ? Buffer.from(row[c]) : row[c] === undefined ? null : row[c]));
      }
      const restored = db.prepare(`SELECT * FROM ${identifier(table.name)}`).all();
      const normalize = row => JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, ArrayBuffer.isView(v) ? Array.from(v) : v])));
      const expectedRows = rows.map(normalize).sort(), actualRows = restored.map(normalize).sort();
      if (actualRows.length !== rows.length || sha256(JSON.stringify(expectedRows)) !== sha256(JSON.stringify(actualRows))) throw new Error('Restored table data mismatch');
      totalRecords += rows.length;
    }
    if (manifest.sequences?.length) {
      db.exec('DELETE FROM sqlite_sequence');
      const insert = db.prepare('INSERT INTO sqlite_sequence(name,seq) VALUES (?,?)');
      for (const item of manifest.sequences) insert.run(item.name, item.seq);
    }
    for (const object of manifest.schema.filter(s => s.type !== 'table')) {
      if (!['index', 'trigger', 'view'].includes(object.type) || !/^CREATE\s+(?:UNIQUE\s+)?(?:INDEX|TRIGGER|VIEW)\b/i.test(object.sql)) throw new Error('Unsupported secondary schema');
      db.exec(object.sql);
    }
    const integrity = db.prepare('PRAGMA integrity_check').all();
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok' || totalRecords !== manifest.totalRecords) throw new Error('SQLite restore integrity failed');
    const foreignKeyViolations = db.prepare('PRAGMA foreign_key_check').all().length;
    return { tableCount: tables.length, totalRecords, integrity: 'ok', foreignKeyViolations, restoredInMemory: true, liveDatabaseModified: false, plaintextSaved: false };
  } finally { db.close(); }
}

export async function verifyFileParts(manifest, key, readPart) {
  let objects = 0, mediaBytes = 0, partCount = 0;
  for (const object of manifest.objects) {
    if (!['VAULT_BUCKET', 'STORAGE_BUCKET'].includes(object.binding) || !Number.isSafeInteger(object.size) || object.size < 0 || !Array.isArray(object.parts) || !object.parts.length) throw new Error('Invalid file descriptor');
    let offset = 0;
    for (const part of object.parts) {
      if (part.offset !== offset || !/^backups\/full-dr\/\d+-[a-f0-9-]{36}\/part-\d{6}\.enc$/.test(part.key) || part.localKey !== part.key.replace('backups/full-dr/', 'dr/')) throw new Error('Invalid archive part');
      const cipher = await readPart(part);
      if (cipher.length !== part.encryptedBytes) throw new Error('Part size mismatch');
      const bytes = decryptArchive(cipher, key, part.checksumSha256, 4 * 1024 * 1024);
      try {
        if (bytes.length !== part.bytes || sha256(bytes) !== part.plainSha256) throw new Error('Restored file integrity mismatch');
        offset += bytes.length; mediaBytes += bytes.length; partCount++;
      } finally { bytes.fill(0); }
    }
    if (offset !== object.size) throw new Error('Restored file size mismatch');
    objects++;
  }
  return { objectCount: objects, mediaBytes, partCount, allPartsAuthenticated: true };
}
