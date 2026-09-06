#!/usr/bin/env node
/**
 * verify-release.js
 * Pre-release security gate: scans the generated distribution ZIP for
 * forbidden patterns before any artifact is published or shared.
 *
 * Fails fast (exit 1) if any of the following are found inside the archive:
 *   - .env / .env.* files containing real values
 *   - .git directory
 *   - node_modules directory
 *   - Private keys (PEM blocks)
 *   - Cloudflare / API tokens (heuristic pattern match)
 *   - Wrangler state (.wrangler/)
 *
 * Usage:
 *   node scripts/verify-release.js [path/to/archive.zip]
 *   (defaults to ./aetheris-clean.zip)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const archivePath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(rootDir, 'aetheris-clean.zip');

const FORBIDDEN_PATHS = [
  /^(.*\/)?\.env(\..+)?$/i,
  /^(.*\/)?\.git(\/.*)?$/,
  /^(.*\/)?node_modules(\/.*)?$/,
  /^(.*\/)?\.wrangler(\/.*)?$/,
];

const SECRET_CONTENT_PATTERNS = [
  { label: 'Cloudflare API token', pattern: /cfut_[A-Za-z0-9]{30,}/g },
  { label: 'PEM private key', pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { label: 'Generic bearer token', pattern: /Bearer\s+[A-Za-z0-9\-_]{32,}/g },
  { label: 'AWS secret key heuristic', pattern: /AKIA[0-9A-Z]{16}/g },
];

// Paths to skip for secret-content scanning (test fixtures intentionally contain fake keys/tokens)
const SECRET_SCAN_EXCLUDES = [
  /^(.*\/)?test\//,
  /^(.*\/)?\.(env\.)?example$/i,
];

const TEXT_EXTENSIONS = new Set([
  '.ts', '.js', '.cjs', '.mjs', '.json', '.jsonc', '.toml',
  '.env', '.yaml', '.yml', '.txt', '.md', '.sh', '.html', '.css',
]);

function red(str)    { return '\x1b[31m' + str + '\x1b[0m'; }
function green(str)  { return '\x1b[32m' + str + '\x1b[0m'; }
function yellow(str) { return '\x1b[33m' + str + '\x1b[0m'; }
function bold(str)   { return '\x1b[1m'  + str + '\x1b[0m'; }

function fail(message) {
  console.error(red('\n  X RELEASE GATE FAILED: ' + message + '\n'));
  process.exit(1);
}

function pass(message) {
  console.log(green('  OK  ' + message));
}

console.log(bold('\n  Aetheris Release Security Verification\n'));

if (!fs.existsSync(archivePath)) {
  fail('Archive not found: ' + archivePath + '\nRun "node scripts/pack-clean.js" first.');
}
const sizeKb = (fs.statSync(archivePath).size / 1024).toFixed(1);
console.log('  Archive: ' + archivePath + ' (' + sizeKb + ' KB)\n');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aetheris-release-check-'));
console.log('  Extracting to ' + tmpDir + '...');

try {
  execSync('powershell -NoProfile -Command "Expand-Archive -Path \'' + archivePath + '\' -DestinationPath \'' + tmpDir + '\' -Force"', { stdio: 'pipe' });
} catch (e) {
  try {
    execSync('unzip -q "' + archivePath + '" -d "' + tmpDir + '"', { stdio: 'pipe' });
  } catch (_) {
    fail('Could not extract archive.\n' + e.message);
  }
}

function walkDir(dir, results) {
  if (!results) results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const relative = path.relative(tmpDir, full).replace(/\\/g, '/');
    results.push({ full, relative, isFile: entry.isFile() });
    if (entry.isDirectory()) walkDir(full, results);
  }
  return results;
}

const entries = walkDir(tmpDir);
console.log('  Found ' + entries.length + ' entries in archive.\n');

let violations = 0;

console.log(bold('  [1/2] Checking for forbidden paths...'));
for (const { relative } of entries) {
  for (const pattern of FORBIDDEN_PATHS) {
    if (pattern.test(relative)) {
      console.error(red('      X FORBIDDEN PATH: ' + relative));
      violations++;
    }
  }
}
if (violations === 0) pass('No forbidden paths found (.env, .git, node_modules, .wrangler)');

console.log(bold('\n  [2/2] Scanning text files for secret content...'));
let secretsFound = 0;
for (const { full, relative, isFile } of entries) {
  if (!isFile) continue;
  const ext = path.extname(relative).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext) && !relative.includes('.env')) continue;
  if (SECRET_SCAN_EXCLUDES.some(rx => rx.test(relative))) continue;
  let content;
  try { content = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }
  for (const { label, pattern } of SECRET_CONTENT_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match) {
      console.error(red('      X ' + label + ' detected in: ' + relative));
      console.error(yellow('        Match: "' + match[0].substring(0, 30) + '..."'));
      secretsFound++;
      violations++;
    }
  }
}
if (secretsFound === 0) pass('No secret content detected in text files');

try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

console.log('');
if (violations > 0) {
  fail(violations + ' violation(s) found. Fix before distributing the release archive.');
} else {
  console.log(green(bold('  All release security checks passed.\n')));
  console.log('  Archive is clean and safe to distribute: ' + archivePath + '\n');
}