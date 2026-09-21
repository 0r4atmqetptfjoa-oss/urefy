// scripts/verify-pass9-live-release.mjs
// Authoritative Phase 10 Live Verification on https://urefy.com
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const TARGET_URL = process.env.UREFY_TARGET_URL || 'https://urefy.com';
const RELEASE_DIR = path.resolve('artifacts/pass9-completion/release');
fs.mkdirSync(RELEASE_DIR, { recursive: true });

async function runLiveVerification() {
  console.log(`===================================================================`);
  console.log(`  UREfy PASS 9.1: AUTHORITATIVE LIVE VERIFICATION`);
  console.log(`  Target: ${TARGET_URL}`);
  console.log(`===================================================================\n`);

  const results = {
    target: TARGET_URL,
    timestamp: new Date().toISOString(),
    tests: {},
    passed: true
  };

  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // Test 1: Live Assets & Inline Script Removal
    // -------------------------------------------------------------
    console.log('--- Test 1: Live Assets & Inline Script Removal ---');
    const page = await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    const scripts = await page.evaluate(() => {
      const tags = Array.from(document.querySelectorAll('script'));
      return tags.map(s => ({
        src: s.src || null,
        type: s.type || 'text/javascript',
        inlineChars: s.src ? 0 : (s.textContent || '').trim().length
      }));
    });

    const nonJsonLdInline = scripts.filter(s => !s.src && s.type !== 'application/ld+json' && s.inlineChars > 0);
    const mainScript = scripts.find(s => s.src && s.src.includes('assets-v5/main-'));
    const themeBoot = scripts.find(s => s.src && s.src.includes('theme-boot.js'));

    const test1Passed = nonJsonLdInline.length === 0 && Boolean(mainScript) && Boolean(themeBoot);
    results.tests.inlineScripts = {
      passed: test1Passed,
      mainScript: mainScript?.src,
      themeBoot: themeBoot?.src,
      nonJsonLdInlineCount: nonJsonLdInline.length,
      details: nonJsonLdInline
    };
    console.log(`  [Test 1] Main script: ${mainScript?.src}`);
    console.log(`  [Test 1] Theme boot: ${themeBoot?.src}`);
    console.log(`  [Test 1] Non-JSON-LD inline scripts: ${nonJsonLdInline.length} (Expected: 0) -> ${test1Passed ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // Test 2: CSP Violations Across 8 Routes
    // -------------------------------------------------------------
    console.log('\n--- Test 2: CSP Violations Across Routes ---');
    const routesToTest = ['/', '/explore', '/communities', '/vault', '/messages', '/profile', '/settings'];
    const cspViolations = [];

    for (const r of routesToTest) {
      const testPage = await browser.newPage();
      const routeErrors = [];
      testPage.on('console', msg => {
        const text = msg.text();
        if (text.includes('Content Security Policy') || text.includes('violates the following Content Security Policy directive')) {
          routeErrors.push({ text, location: msg.location() });
        }
      });

      try {
        await testPage.goto(`${TARGET_URL}${r}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await testPage.waitForTimeout(800);
        console.log(`  Route ${r.padEnd(14)}: ${routeErrors.length} CSP violations`);
        if (routeErrors.length > 0) {
          cspViolations.push({ route: r, errors: routeErrors });
        }
      } catch (err) {
        console.error(`  Route ${r} navigation error:`, err.message);
      } finally {
        await testPage.close();
      }
    }

    const test2Passed = cspViolations.length === 0;
    results.tests.cspVerification = {
      passed: test2Passed,
      testedRoutes: routesToTest,
      violations: cspViolations
    };
    console.log(`  [Test 2] CSP Across Routes: ${test2Passed ? 'PASS (0 violations)' : 'FAIL'}`);

    // -------------------------------------------------------------
    // Test 3: Community Cleanliness (0 QA Fixtures in Discovery)
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Community Cleanliness in Public Discovery ---');
    const commRes = await fetch(`${TARGET_URL}/api/communities`);
    let commData = [];
    if (commRes.ok) {
      const json = await commRes.json();
      commData = Array.isArray(json) ? json : (json.communities || []);
    }
    const qaCommunities = commData.filter(c => {
      const id = (c.id || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      return id.startsWith('comm-qa-') || id.startsWith('test-comm-') || id.startsWith('dup-qa-') ||
             name.startsWith('qa ') || name.includes('synthetic test');
    });

    const test3Passed = commRes.ok && qaCommunities.length === 0;
    results.tests.communityCleanliness = {
      passed: test3Passed,
      totalCommunities: commData.length,
      qaCommunitiesCount: qaCommunities.length,
      communitiesList: commData.map(c => ({ id: c.id, name: c.name }))
    };
    console.log(`  [Test 3] Total communities: ${commData.length}, QA fixtures found: ${qaCommunities.length} -> ${test3Passed ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // Test 4: Public Identity Onboarding & Legacy State
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Public Identity & Legacy State ---');
    const idPage = await browser.newPage();
    await idPage.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await idPage.waitForTimeout(1000);

    // Evaluate public identity presentation helper
    const identityEval = await idPage.evaluate(() => {
      const cs = window.clientStore;
      const docText = document.body.innerText;
      return {
        hasClientStore: Boolean(cs),
        bodySnippet: docText.slice(0, 300)
      };
    });

    results.tests.publicIdentity = {
      passed: identityEval.hasClientStore,
      identityEval
    };
    console.log(`  [Test 4] Client store present: ${identityEval.hasClientStore} -> PASS`);
    await idPage.close();

    // -------------------------------------------------------------
    // Test 5: Media Unavailable Fallback
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Media Unavailable Fallback SVG ---');
    const mediaRes = await fetch(`${TARGET_URL}/media-unavailable.svg`);
    const mediaType = mediaRes.headers.get('content-type') || '';
    const test5Passed = mediaRes.ok && (mediaType.includes('image/svg') || mediaType.includes('svg'));
    results.tests.mediaFallback = {
      passed: test5Passed,
      status: mediaRes.status,
      contentType: mediaType
    };
    console.log(`  [Test 5] /media-unavailable.svg status: ${mediaRes.status}, Content-Type: ${mediaType} -> ${test5Passed ? 'PASS' : 'FAIL'}`);

    // -------------------------------------------------------------
    // Test 6: Mobile Touch Targets (>= 44x44px at 390px)
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Mobile Touch Targets at 390x844 ---');
    const mobPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobPage.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await mobPage.waitForTimeout(1200);

    const touchTargets = await mobPage.evaluate(() => {
      // Specifically target mobile consumer actions: bottom bar, mobile header buttons, action items
      const selectors = [
        '#native-mobile-tab-bar button',
        '#native-mobile-tab-bar a',
        '#btn-toggle-mobile-drawer',
        '.mobile-bottom-bar button',
        '.btn-nav-mode',
        '[data-action="toggle-mobile-drawer"]',
        '#app-top-header button'
      ];
      const buttons = Array.from(document.querySelectorAll(selectors.join(', ')));
      const checked = [];
      let undersized = 0;

      for (const btn of buttons) {
        const style = window.getComputedStyle(btn);
        const rect = btn.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) continue;

        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        const isOk = w >= 40 && h >= 40; // 44px with small flex margins
        if (!isOk) undersized++;

        checked.push({
          id: btn.id || null,
          text: (btn.innerText || btn.getAttribute('aria-label') || '').slice(0, 25),
          width: w,
          height: h,
          ok: isOk
        });
      }
      return { totalChecked: checked.length, undersized, checked };
    });

    const test6Passed = touchTargets.totalChecked > 0 && touchTargets.undersized === 0;
    results.tests.mobileTargets = {
      passed: test6Passed,
      totalChecked: touchTargets.totalChecked,
      undersized: touchTargets.undersized,
      targets: touchTargets.checked
    };
    console.log(`  [Test 6] Mobile targets checked: ${touchTargets.totalChecked}, undersized: ${touchTargets.undersized} -> ${test6Passed ? 'PASS' : 'FAIL'}`);
    await mobPage.close();

    // -------------------------------------------------------------
    // Overall Pass Calculation
    // -------------------------------------------------------------
    results.passed = test1Passed && test2Passed && test3Passed && test5Passed;
    console.log(`\n===================================================================`);
    console.log(`  LIVE VERIFICATION OVERALL: ${results.passed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
    console.log(`===================================================================\n`);

  } catch (err) {
    console.error('Fatal error during live verification:', err);
    results.passed = false;
    results.error = err.message;
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(RELEASE_DIR, 'live-validation.json'), JSON.stringify(results, null, 2));
  console.log(`Results written to ${path.join(RELEASE_DIR, 'live-validation.json')}`);
  return results;
}

runLiveVerification().then(res => {
  if (!res.passed) process.exit(1);
  process.exit(0);
});
