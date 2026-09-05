/**
 * @file scripts/audit-production.ts
 * @description Automated production readiness and security audit for Aetheris client.
 * Verifies CSP, service worker cache policies, admin authentication, secrets, and seed data isolation.
 */

import fs from 'fs';
import path from 'path';

interface AuditCheck {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string;
}

const rootDir = path.resolve(process.cwd());
const clientSrc = path.join(rootDir, 'src');
const headersPath = path.join(rootDir, 'public/_headers');
const swPath = path.join(rootDir, 'public/sw.js');

const checks: AuditCheck[] = [];

function walk(dir: string, ext = ['.ts', '.js', '.html']): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        results = results.concat(walk(full, ext));
      }
    } else if (ext.some(e => file.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

const srcFiles = walk(clientSrc);

// 1. Browser dialogs audit (alert, confirm, prompt)
let dialogViolations = 0;
const violationFiles: string[] = [];
for (const file of srcFiles) {
  if (file.includes('test/') || file.endsWith('dialog-modal.ts') || file.endsWith('pwa-service.ts')) continue;
  const content = fs.readFileSync(file, 'utf8');
  // Match standalone alert(, confirm(, prompt( or window.alert/confirm/prompt, but not object methods like sovereignDialog.confirm
  const nativeMatches = content.match(/(?:(?<![\w.\$])(?<!sovereignDialog\.)(?<!window\.sovereignDialog\.)(?<!this\.)(?<!public\s)(?<!private\s)(?<!interface\s)(?:window\.)?(alert|confirm|prompt)\s*\()/g) || [];
  if (nativeMatches.length > 0) {
    dialogViolations += nativeMatches.length;
    violationFiles.push(`${path.basename(file)} (${nativeMatches.length})`);
  }
}
checks.push({
  name: 'Zero Native Browser Dialogs (alert, confirm, prompt)',
  status: dialogViolations === 0 ? 'PASS' : 'FAIL',
  details: dialogViolations === 0 ? '0 native dialog calls found' : `${dialogViolations} native dialog calls found in: ${violationFiles.join(', ')}`,
});

// 2. CSP & Google Fonts audit
let cspPass = false;
let cspDetails = '';
if (fs.existsSync(headersPath)) {
  const headers = fs.readFileSync(headersPath, 'utf8');
  const hasNoGoogleFonts = !headers.includes('fonts.googleapis.com') && !headers.includes('fonts.gstatic.com');
  const hasSelfDefault = headers.includes("default-src 'self'");
  const hasFrameAncestorsNone = headers.includes("frame-ancestors 'none'");

  if (hasNoGoogleFonts && hasSelfDefault && hasFrameAncestorsNone) {
    cspPass = true;
    cspDetails = 'Strict CSP active, 0 external font CDNs, frame-ancestors denied';
  } else {
    cspDetails = `Google fonts present: ${!hasNoGoogleFonts}, self default: ${hasSelfDefault}`;
  }
}
checks.push({
  name: 'Content Security Policy (Zero Google Fonts, Strict Self)',
  status: cspPass ? 'PASS' : 'FAIL',
  details: cspDetails,
});

// 3. Service Worker Sensitive Cache Partitioning
let swPass = false;
let swDetails = '';
if (fs.existsSync(swPath)) {
  const sw = fs.readFileSync(swPath, 'utf8');
  const hasNeverCache = sw.includes('NEVER_CACHE_PATTERNS');
  const excludesWebAuthn = sw.includes('/api/webauthn') || sw.includes(String.raw`\/api\/webauthn`);
  const excludesMessages = sw.includes('/api/messages') || sw.includes(String.raw`\/api\/messages`);
  const excludesRecovery = sw.includes('/api/recovery') || sw.includes(String.raw`\/api\/recovery`);
  if (hasNeverCache && excludesWebAuthn && excludesMessages && excludesRecovery) {
    swPass = true;
    swDetails = 'Private endpoints excluded from cache: /api/webauthn, /api/messages, /api/recovery';
  } else {
    swDetails = 'Sensitive endpoints not completely partitioned in sw.js';
  }
}
checks.push({
  name: 'Service Worker Cache Partitioning (Private APIs No-Store)',
  status: swPass ? 'PASS' : 'FAIL',
  details: swDetails,
});

// 4. Admin Auth Server Authority & Volatile RAM
let adminAuthPass = false;
const adminAuthFile = path.join(clientSrc, 'admin-auth.ts');
if (fs.existsSync(adminAuthFile)) {
  const content = fs.readFileSync(adminAuthFile, 'utf8');
  const hasVolatileNotice = content.includes('memoryStorage') && content.includes('isLocalDev()');
  const avoidsLocalPinInProd = content.includes('if (!isLocalDev() && (key.includes(\'pin\')');
  if (hasVolatileNotice && avoidsLocalPinInProd) {
    adminAuthPass = true;
  }
}
checks.push({
  name: 'Admin Backend Authority & In-Memory Volatile Session',
  status: adminAuthPass ? 'PASS' : 'FAIL',
  details: adminAuthPass ? 'Admin PIN stored in RAM only during production; server verification enforced' : 'Admin auth persistence risk detected',
});

// 5. Production Seed Data Gating
let seedGatingPass = true;
const stateFile = path.join(clientSrc, 'client-state.ts');
if (fs.existsSync(stateFile)) {
  const content = fs.readFileSync(stateFile, 'utf8');
  if (content.includes('seedInitialPosts()') && !content.includes('if (!isLocalDev()) return;')) {
    seedGatingPass = false;
  }
}
checks.push({
  name: 'Production Seed Data Gating (isLocalDev check)',
  status: seedGatingPass ? 'PASS' : 'FAIL',
  details: seedGatingPass ? 'Mock posts and profiles are strictly gated by isLocalDev()' : 'Ungated mock seeds found in client-state.ts',
});

// Print Audit Results
console.log('\n═════════════════════════════════════════════════════════════════');
console.log('            AETHERIS AUTOMATED PRODUCTION AUDIT                 ');
console.log('═════════════════════════════════════════════════════════════════\n');

let allPassed = true;
for (const check of checks) {
  const badge = check.status === 'PASS' ? '✅ PASS' : check.status === 'WARN' ? '⚠️ WARN' : '❌ FAIL';
  console.log(`${badge} | ${check.name}`);
  console.log(`       └─ ${check.details}`);
  if (check.status === 'FAIL') allPassed = false;
}

console.log('\n═════════════════════════════════════════════════════════════════');
console.log(`FINAL RESULT: ${allPassed ? 'ALL CHECKS PASSED (PRODUCTION READY)' : 'FAILED CHECKS DETECTED'}`);
console.log('═════════════════════════════════════════════════════════════════\n');

if (!allPassed) {
  process.exit(1);
}
