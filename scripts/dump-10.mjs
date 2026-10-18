import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const TOTAL_PARTS = 10;

// Fișiere mari de date statice / dicționare pe care le excludem ca să nu consume spațiu inutil
const EXCLUDED_FILES = new Set([
  'packages/core-crypto/src/bip39-wordlist.ts',
  'packages/client-ui/src/emoji-data.ts',
  'packages/client-ui/src/discovery-data.ts',
  'packages/client-ui/src/profile/seed-profiles-data.ts',
  'packages/client-ui/src/profile/production-profiles-data.ts',
  'packages/client-ui/src/i18n/locales/ar.ts',
  'packages/client-ui/src/i18n/locales/de.ts',
  'packages/client-ui/src/i18n/locales/es.ts',
  'packages/client-ui/src/i18n/locales/fr.ts',
  'packages/client-ui/src/i18n/locales/ja.ts',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.js',
  '.mjs',
  '.json',
  '.sql',
  '.toml',
  '.html',
  '.css',
]);

function walkDir(dirRelPath, collected = []) {
  const fullDir = path.join(ROOT, dirRelPath);
  if (!fs.existsSync(fullDir)) return collected;

  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = path.posix.join(
      dirRelPath.replace(/\\/g, '/'),
      entry.name
    );
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === '.git' ||
        entry.name === 'coverage'
      ) {
        continue;
      }
      walkDir(relPath, collected);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;
      if (EXCLUDED_FILES.has(relPath)) continue;
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) continue;
      collected.push(relPath);
    }
  }
  return collected;
}

// 1. Colectăm toate fișierele relevante din proiect
const rootFiles = [
  'package.json',
  'tsconfig.base.json',
  'packages/core-crypto/package.json',
  'packages/core-crypto/tsconfig.json',
  'packages/vault-engine/package.json',
  'packages/vault-engine/tsconfig.json',
  'packages/server-edge/package.json',
  'packages/server-edge/tsconfig.json',
  'packages/server-edge/wrangler.toml',
  'packages/daemon-archivist/package.json',
  'packages/daemon-archivist/tsconfig.json',
  'packages/client-ui/package.json',
  'packages/client-ui/tsconfig.json',
  'packages/client-ui/wrangler.toml',
  'packages/client-ui/index.html',
  'packages/client-ui/admin.html',
  'packages/client-ui/vite.config.ts',
].filter((f) => fs.existsSync(path.join(ROOT, f)));

const targetDirs = [
  'packages/core-crypto/src',
  'packages/vault-engine/src',
  'packages/server-edge/src',
  'packages/daemon-archivist/src',
  'packages/client-ui/functions',
  'packages/client-ui/migrations',
  'packages/client-ui/src',
];

const allFilesSet = new Set(rootFiles);
for (const dir of targetDirs) {
  for (const file of walkDir(dir)) {
    allFilesSet.add(file);
  }
}

// 2. Calculăm dimensiunea fiecărui fișier
const filesWithSize = Array.from(allFilesSet).map((relPath) => {
  const size = fs.statSync(path.join(ROOT, relPath)).size;
  return { relPath, size };
});

// 3. Împărțim fișierele în 10 găleți echilibrate (Greedy Bin Packing)
const buckets = Array.from({ length: TOTAL_PARTS }, (_, i) => ({
  index: i + 1,
  totalBytes: 0,
  files: [],
}));

const sortedBySize = [...filesWithSize].sort((a, b) => b.size - a.size);
for (const item of sortedBySize) {
  buckets.sort((a, b) => a.totalBytes - b.totalBytes);
  buckets[0].files.push(item.relPath);
  buckets[0].totalBytes += item.size;
}

buckets.sort((a, b) => a.index - b.index);

// Ștergem vechile fișiere XML și config-uri temporare
for (const f of fs.readdirSync(ROOT)) {
  if (/^urefy-.*\.xml$/.test(f) || /^repomix\.part\d+\.json$/.test(f)) {
    fs.unlinkSync(path.join(ROOT, f));
  }
}

console.log(`\n📦 Împărțire ${filesWithSize.length} fișiere în ${TOTAL_PARTS} arhive Repomix...\n`);

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

for (const bucket of buckets) {
  bucket.files.sort();
  const partNum = String(bucket.index).padStart(2, '0');
  const outXml = `urefy-part-${partNum}.xml`;
  const tempConfig = `.repomix.part-${partNum}.tmp.json`;

  const repomixConfig = {
    output: {
      filePath: outXml,
      style: 'xml',
      compress: false,
      removeComments: true,
      removeEmptyLines: true,
      showLineNumbers: false,
      fileSummary: false,
      directoryStructure: true,
      git: {
        sortByChanges: false,
      },
    },
    include: bucket.files,
    ignore: {
      useGitignore: true,
      useDefaultPatterns: true,
    },
  };

  fs.writeFileSync(path.join(ROOT, tempConfig), JSON.stringify(repomixConfig, null, 2));

  try {
    execFileSync(npxCmd, ['repomix', '-c', tempConfig], {
      cwd: ROOT,
      stdio: 'pipe',
      shell: true,
    });
  } finally {
    if (fs.existsSync(path.join(ROOT, tempConfig))) {
      fs.unlinkSync(path.join(ROOT, tempConfig));
    }
  }

  const outSizeKb = (fs.statSync(path.join(ROOT, outXml)).size / 1024).toFixed(1);
  console.log(
    `✅ ${outXml} — ${bucket.files.length} fișiere — ${outSizeKb} KB`
  );
}

console.log('\n🎉 Gata! Toate cele 10 fișiere urefy-part-01.xml ... urefy-part-10.xml au fost generate.\n');