// scripts/generate-pass9-sums.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve('artifacts/pass9-completion');

function getFiles(dir) {
  const subdirs = fs.readdirSync(dir);
  const files = [];
  for (const f of subdirs) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      files.push(...getFiles(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

const allFiles = getFiles(ROOT).filter(f => !f.endsWith('SHA256SUMS.json'));
const sums = {};

for (const file of allFiles) {
  const rel = path.relative(ROOT, file).replaceAll('\\', '/');
  const buf = fs.readFileSync(file);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  sums[rel] = {
    bytes: buf.length,
    sha256: hash
  };
}

fs.writeFileSync(path.join(ROOT, 'SHA256SUMS.json'), JSON.stringify(sums, null, 2));
console.log(`Hashed ${Object.keys(sums).length} files in artifacts/pass9-completion into SHA256SUMS.json`);
