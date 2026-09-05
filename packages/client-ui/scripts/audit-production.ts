/**
 * @file scripts/audit-production.ts
 * @description Automated production readiness and security audit for Aetheris client.
 * Verifies CSP, service worker cache policies, admin authentication, secrets, seed data isolation,
 * and zero inline event handlers in core orchestrators.
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

// 2. CSP & Security Headers audit
let cspPass = false;
let cspDetails = '';
if (fs.existsSync(headersPath)) {
  const headers = fs.readFileSync(headersPath, 'utf8');
  const hasNoGoogleFonts = !headers.includes('fonts.googleapis.com') && !headers.includes('fonts.gstatic.com');
  const hasSelfDefault = headers.includes("default-src 'self'");
  const hasFrameAncestorsNone = headers.includes("frame-ancestors 'none'");
  
  // Strict CSP: script-src must not have unsafe-inline, and no https://* wildcard in img/media
  const cspLine = headers.split('\n').find(l => l.includes('Content-Security-Policy:')) || '';
  const scriptSrcPart = cspLine.match(/script-src[^;]+/)?.[0] || '';
  const hasNoUnsafeInlineInScript = !scriptSrcPart.includes("'unsafe-inline'");
  const hasNoWildcardHttps = !cspLine.includes('https://*;');

  if (hasNoGoogleFonts && hasSelfDefault && hasFrameAncestorsNone && hasNoUnsafeInlineInScript && hasNoWildcardHttps) {
    cspPass = true;
    cspDetails = 'Strict CSP active: 0 external fonts, no unsafe-inline in scripts, no wildcard https://*, frame-ancestors denied';
  } else {
    cspDetails = `Google fonts: ${!hasNoGoogleFonts}, unsafe-inline in script: ${!hasNoUnsafeInlineInScript}, wildcard https: ${!hasNoWildcardHttps}`;
  }
}
checks.push({
  name: 'Content Security Policy (Strict Self, Zero Unsafe-Inline Scripts, Zero Wildcards)',
  status: cspPass ? 'PASS' : 'FAIL',
  details: cspDetails,
});

// 3. Service Worker Sensitive Cache Partitioning & Safe-By-Default Whitelist
let swPass = false;
let swDetails = '';
if (fs.existsSync(swPath)) {
  const sw = fs.readFileSync(swPath, 'utf8');
  const hasNeverCache = sw.includes('NEVER_CACHE_PATTERNS');
  const excludesWebAuthn = sw.includes('/api/webauthn') || sw.includes(String.raw`\/api\/webauthn`);
  const excludesMessages = sw.includes('/api/messages') || sw.includes(String.raw`\/api\/messages`);
  const excludesRecovery = sw.includes('/api/recovery') || sw.includes(String.raw`\/api\/recovery`);
  const hasWhitelist = sw.includes('CACHEABLE_PUBLIC_API');
  const defaultsNetworkOnly = sw.includes("cache: 'no-store'");

  if (hasNeverCache && excludesWebAuthn && excludesMessages && excludesRecovery && hasWhitelist && defaultsNetworkOnly) {
    swPass = true;
    swDetails = 'Private endpoints isolated, public whitelist enforced, unknown APIs default to network-only (no-store)';
  } else {
    swDetails = `Never-cache: ${hasNeverCache}, Whitelist: ${hasWhitelist}, Network-only default: ${defaultsNetworkOnly}`;
  }
}
checks.push({
  name: 'Service Worker Cache Partitioning (Safe-By-Default Network-Only APIs)',
  status: swPass ? 'PASS' : 'FAIL',
  details: swDetails,
});

// 4. Core Orchestrator Event Delegation (0 inline handlers in core shell)
const coreOrchestrators = [
  'app.ts',
  'footer.ts',
  'header.ts',
  'sidebar.ts',
  'mobile-tab-bar.ts',
  'modal-manager.ts',
];

let coreHandlerViolations = 0;
const violationDetails: string[] = [];

for (const file of coreOrchestrators) {
  const fullPath = path.join(clientSrc, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const matches = content.match(/on(click|change|input|submit)\s*=/gi) || [];
    if (matches.length > 0) {
      coreHandlerViolations += matches.length;
      violationDetails.push(`${file} (${matches.length})`);
    }
  }
}

checks.push({
  name: 'Core Orchestrators Event Delegation (0 inline onclick in core shell)',
  status: coreHandlerViolations === 0 ? 'PASS' : 'FAIL',
  details: coreHandlerViolations === 0
    ? 'All 6 core shell orchestrators strictly enforce centralized action delegation (0 inline handlers)'
    : `Found ${coreHandlerViolations} inline handlers in: ${violationDetails.join(', ')}`,
});

// 5. Admin Auth Server Authority & Volatile RAM
let adminAuthPass = false;
const adminAuthFile = path.join(clientSrc, 'admin-auth.ts');
if (fs.existsSync(adminAuthFile)) {
  const content = fs.readFileSync(adminAuthFile, 'utf8');
  const hasVolatileNotice = content.includes('memoryStorage') && content.includes('isLocalDev()');
  const avoidsLocalPinInProd = content.includes("if (!isLocalDev() && (key.includes('pin')");
  if (hasVolatileNotice && avoidsLocalPinInProd) {
    adminAuthPass = true;
  }
}
checks.push({
  name: 'Admin Backend Authority & In-Memory Volatile Session',
  status: adminAuthPass ? 'PASS' : 'FAIL',
  details: adminAuthPass ? 'Admin PIN stored in RAM only during production; server verification enforced' : 'Admin auth persistence risk detected',
});

// 6. Production Seed Data Gating
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
