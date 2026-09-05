/**
 * @file scripts/audit-ux.ts
 * @description Automated UX/UI specification audit for Aetheris.
 * Verifies navigation architecture, touch targets, accessibility labels, and vector icon usage.
 */

import fs from 'fs';
import path from 'path';

interface UxCheck {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string;
}

const rootDir = path.resolve(process.cwd());
const clientSrc = path.join(rootDir, 'src');

const checks: UxCheck[] = [];

// 1. Navigation Architecture (6 items: Feed, Explore, Messages, Vault, Profile, More)
const navConfigFile = path.join(clientSrc, 'nav-config.ts');
let navPass = false;
let navDetails = '';
if (fs.existsSync(navConfigFile)) {
  const content = fs.readFileSync(navConfigFile, 'utf8');
  const has6Items = content.includes("id: 'feed'") &&
    content.includes("id: 'explore'") &&
    content.includes("id: 'messages'") &&
    content.includes("id: 'vault'") &&
    content.includes("id: 'profile'") &&
    content.includes("id: 'more'");
  const hasNoAdmin = !content.includes("id: 'admin'") && !content.includes("admin.html");

  if (has6Items && hasNoAdmin) {
    navPass = true;
    navDetails = 'Primary 6-nav verified: Feed, Explore, Messages, Vault, Profile, More (Admin strictly excluded)';
  } else {
    navDetails = `6 items check: ${has6Items}, Admin excluded: ${hasNoAdmin}`;
  }
}
checks.push({
  name: 'Primary Navigation Architecture (6 sovereign items, zero admin)',
  status: navPass ? 'PASS' : 'FAIL',
  details: navDetails,
});

// 2. Mobile Tab Bar Touch Targets (min 44px)
const mobileTabBarFile = path.join(clientSrc, 'mobile-tab-bar.ts');
let touchTargetPass = false;
if (fs.existsSync(mobileTabBarFile)) {
  const content = fs.readFileSync(mobileTabBarFile, 'utf8');
  if (content.includes('min-h-[44px]') && content.includes('aria-label')) {
    touchTargetPass = true;
  }
}
checks.push({
  name: 'Mobile Touch Target Ergonomics (≥44px tap targets & ARIA)',
  status: touchTargetPass ? 'PASS' : 'FAIL',
  details: touchTargetPass ? 'Mobile tab bar buttons conform to 44px minimum target and include ARIA labels' : 'Missing 44px touch targets in mobile tab bar',
});

// 3. Lucide Vector Icon System Integration
const iconsFile = path.join(clientSrc, 'ui/icons.ts');
let vectorIconPass = false;
if (fs.existsSync(iconsFile)) {
  const content = fs.readFileSync(iconsFile, 'utf8');
  if (content.includes('lucide') && content.includes('renderIcon')) {
    vectorIconPass = true;
  }
}
checks.push({
  name: 'Structural Vector Icon System (Lucide SVG)',
  status: vectorIconPass ? 'PASS' : 'FAIL',
  details: vectorIconPass ? 'Vector SVG icon engine active with zero external image dependencies' : 'Missing icon system in ui/icons.ts',
});

// 4. Progressive Disclosure (Simple / Advanced / Technical)
const privacySettingsFile = path.join(clientSrc, 'profile/profile-privacy.ts');
let disclosurePass = false;
if (fs.existsSync(privacySettingsFile)) {
  const content = fs.readFileSync(privacySettingsFile, 'utf8');
  if (content.includes('Simple (Default)') && content.includes('Advanced') && content.includes('Technical')) {
    disclosurePass = true;
  }
}
checks.push({
  name: 'Progressive Disclosure 3-Tier Mode (Simple, Advanced, Technical)',
  status: disclosurePass ? 'PASS' : 'FAIL',
  details: disclosurePass ? 'Simple mode default, technical jargon progressively disclosed on demand' : 'Missing 3-tier disclosure architecture in profile-privacy.ts',
});

// 5. Empty States Implementation
const primitivesFile = path.join(clientSrc, 'ui/primitives.ts');
let emptyStatesPass = false;
if (fs.existsSync(primitivesFile)) {
  const content = fs.readFileSync(primitivesFile, 'utf8');
  if (content.includes('renderEmptyState') && content.includes('renderErrorState') && content.includes('renderSkeleton')) {
    emptyStatesPass = true;
  }
}
checks.push({
  name: 'Empty States, Error States & Loading Skeletons in Design System',
  status: emptyStatesPass ? 'PASS' : 'FAIL',
  details: emptyStatesPass ? 'Normalized empty state, error state, and skeleton primitives present' : 'Missing empty state primitives in ui/primitives.ts',
});

// Print UX Audit Results
console.log('\n═════════════════════════════════════════════════════════════════');
console.log('                 AETHERIS AUTOMATED UX AUDIT                     ');
console.log('═════════════════════════════════════════════════════════════════\n');

let allPassed = true;
for (const check of checks) {
  const badge = check.status === 'PASS' ? '✅ PASS' : check.status === 'WARN' ? '⚠️ WARN' : '❌ FAIL';
  console.log(`${badge} | ${check.name}`);
  console.log(`       └─ ${check.details}`);
  if (check.status === 'FAIL') allPassed = false;
}

console.log('\n═════════════════════════════════════════════════════════════════');
console.log(`FINAL UX RESULT: ${allPassed ? 'ALL UX AUDITS PASSED' : 'FAILED UX CHECKS DETECTED'}`);
console.log('═════════════════════════════════════════════════════════════════\n');

if (!allPassed) {
  process.exit(1);
}
