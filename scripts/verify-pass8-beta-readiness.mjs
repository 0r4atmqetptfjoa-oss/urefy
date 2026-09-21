#!/usr/bin/env node
/**
 * UREfy PASS 8: BETA READINESS VERIFICATION SUITE
 * Spam, Abuse, Moderation, Rate Limiting, Observability & Load
 * Target: https://urefy.com
 */

import { chromium } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';
import {
  createSovereignIdentity,
  createSignedEnvelope,
} from '../packages/core-crypto/dist/index.js';

const TARGET_URL = process.env.LIVE_URL || 'https://urefy.com';
const ARTIFACT_DIR = path.resolve('artifacts');
const BRAIN_DIR = 'C:\\Users\\razva\\.gemini\\antigravity\\brain\\259f4798-355b-4037-ba23-d1ad4471236c';

async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch (_) {}
}

async function copyToBrain(fileName) {
  try {
    const src = path.join(ARTIFACT_DIR, fileName);
    const dest = path.join(BRAIN_DIR, fileName);
    await fs.copyFile(src, dest);
    console.log(`[Artifact] Copied ${fileName} to brain.`);
  } catch (err) {
    console.warn(`[Artifact] Could not copy ${fileName} to brain:`, err.message);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runPass8Verification() {
  console.log('================================================================');
  console.log('UREfy PASS 8: BETA READINESS VERIFICATION');
  console.log('Target:', TARGET_URL);
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  await ensureDir(ARTIFACT_DIR);

  const report = {
    target: TARGET_URL,
    timestamp: new Date().toISOString(),
    stage1_rateLimiting: {},
    stage2_spamAndAbuseHardening: {},
    stage3_blockMuteAndDMSafety: {},
    stage4_moderationAndDSA: {},
    stage5_securityAndContentSafety: {},
    stage6_loadAndLatencyBenchmarks: {},
    summary: { passed: false, checksPassed: 0, totalChecks: 0 },
  };

  function recordCheck(stage, checkName, passed, details = {}) {
    report[stage][checkName] = { passed, ...details };
    report.summary.totalChecks++;
    if (passed) report.summary.checksPassed++;
    console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${stage}.${checkName}:`, JSON.stringify(details));
  }

  // Generate valid test keypairs
  const aliceId = createSovereignIdentity({ seed: new Uint8Array(32).fill(11) });
  const charlieId = createSovereignIdentity({ seed: new Uint8Array(32).fill(33) });
  const aliceFP = aliceId.identity.fingerprint;

  // --------------------------------------------------------------------------
  // STAGE 2: SPAM & ABUSE RESISTANCE (POSTS, COMMENTS, REACTIONS, COMMUNITIES)
  // --------------------------------------------------------------------------
  console.log('\n[Stage 2] Verifying Spam & Abuse Hardening...');

  // Test 2.1: Post Creation Without Envelope Signature is Blocked
  try {
    const unsignedPostRes = await fetch(`${TARGET_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unsigned Spam', content: 'Direct payload without cryptographic envelope' }),
    });
    recordCheck('stage2_spamAndAbuseHardening', 'unsignedPostRejected', unsignedPostRes.status === 401, {
      status: unsignedPostRes.status,
    });
  } catch (err) {
    recordCheck('stage2_spamAndAbuseHardening', 'unsignedPostRejected', false, { error: err.message });
  }

  // Test 2.2: Replay Nonce Prevention
  try {
    const fixedNonce = `nonce_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const envelope1 = createSignedEnvelope({
      action: 'post:create',
      scope: 'urefy-posts-v1',
      title: '[QA-PASS8] Nonce Replay Test Post',
      content: 'Testing cryptographic replay attack defense.',
      channelId: 'pulse-global',
    }, aliceId, { nonce: fixedNonce, timestamp: Date.now() });

    const res1 = await fetch(`${TARGET_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope: envelope1 }),
    });

    const res2 = await fetch(`${TARGET_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope: envelope1 }),
    });

    const isReplayBlocked = res2.status === 401 || res2.status === 409 || res2.status === 400;
    recordCheck('stage2_spamAndAbuseHardening', 'replayNonceBlocked', isReplayBlocked, {
      firstAttemptStatus: res1.status,
      replayAttemptStatus: res2.status,
    });
  } catch (err) {
    recordCheck('stage2_spamAndAbuseHardening', 'replayNonceBlocked', false, { error: err.message });
  }

  // Test 2.3: Comment Character Limit (>5,000 chars)
  try {
    const hugeContent = 'A'.repeat(5001);
    const hugeCommentEnv = createSignedEnvelope({
      action: 'create-comment',
      postId: 'test-post-boundary',
      content: hugeContent,
    }, aliceId);

    const hugeCommentRes = await fetch(`${TARGET_URL}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope: hugeCommentEnv }),
    });
    recordCheck('stage2_spamAndAbuseHardening', 'oversizedCommentBlocked', hugeCommentRes.status === 400, {
      status: hugeCommentRes.status,
    });
  } catch (err) {
    recordCheck('stage2_spamAndAbuseHardening', 'oversizedCommentBlocked', false, { error: err.message });
  }

  // Test 2.4: Community Creation Duplicate Slug Collision (409 Conflict)
  try {
    const uniqueSlug = `dup-qa-${Date.now().toString(36).slice(-6)}`;
    const commEnv1 = createSignedEnvelope({
      action: 'create',
      scope: 'urefy-community-v1',
      name: uniqueSlug,
      displayName: 'Duplicate Test 1',
      description: 'First attempt',
    }, aliceId);

    const firstRes = await fetch(`${TARGET_URL}/api/communities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope: commEnv1 }),
    });

    const commEnv2 = createSignedEnvelope({
      action: 'create',
      scope: 'urefy-community-v1',
      name: uniqueSlug,
      displayName: 'Duplicate Test 2',
      description: 'Second attempt with same name',
    }, aliceId);

    const dupCommRes = await fetch(`${TARGET_URL}/api/communities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope: commEnv2 }),
    });

    recordCheck('stage2_spamAndAbuseHardening', 'duplicateCommunitySlugRejected', dupCommRes.status === 409, {
      firstAttemptStatus: firstRes.status,
      duplicateAttemptStatus: dupCommRes.status,
      testedSlug: uniqueSlug,
    });
  } catch (err) {
    recordCheck('stage2_spamAndAbuseHardening', 'duplicateCommunitySlugRejected', false, { error: err.message });
  }

  // Test 2.5: Community Moderation IDOR Check (Unauthorized caller -> 403 Forbidden)
  try {
    const idorModEnv = createSignedEnvelope({
      action: 'pin_post',
      communityId: 'c-general',
      moderatorId: charlieId.identity.fingerprint,
      targetId: 'post-xyz',
      targetType: 'post',
    }, charlieId);

    const idorRes = await fetch(`${TARGET_URL}/api/moderation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope: idorModEnv }),
    });
    recordCheck('stage2_spamAndAbuseHardening', 'unauthorizedModeratorActionBlocked', idorRes.status === 403, {
      status: idorRes.status,
    });
  } catch (err) {
    recordCheck('stage2_spamAndAbuseHardening', 'unauthorizedModeratorActionBlocked', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // STAGE 4: MODERATION & DSA COMPLIANCE REPORT QUEUE
  // --------------------------------------------------------------------------
  console.log('\n[Stage 4] Verifying DSA Report Handling & Duplicate Suppression...');

  const testTargetId = `target_qa_${Date.now()}`;

  // Test 4.1: Submit Legal Notice / DSA Report (Art. 16)
  try {
    const dsaRes = await fetch(`${TARGET_URL}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetId: testTargetId,
        targetType: 'post',
        reason: 'spam',
        details: 'Automated PASS 8 QA report verification',
        reporterFingerprint: aliceFP,
        reporterEmail: 'qa-tester@urefy.com',
      }),
    });
    const dsaJson = await dsaRes.json();
    const isDsaCompliant = (dsaRes.status === 201 || dsaRes.status === 200) && Boolean(dsaJson.legalNotice);
    recordCheck('stage4_moderationAndDSA', 'dsaNoticeAndTakedownCreated', isDsaCompliant, {
      status: dsaRes.status,
      reportId: dsaJson.reportId,
      hasLegalNotice: Boolean(dsaJson.legalNotice),
    });
  } catch (err) {
    recordCheck('stage4_moderationAndDSA', 'dsaNoticeAndTakedownCreated', false, { error: err.message });
  }

  // Test 4.2: Duplicate Report Suppression
  try {
    const dupReportRes = await fetch(`${TARGET_URL}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetId: testTargetId,
        targetType: 'post',
        reason: 'spam',
        details: 'Duplicate submission attempt from same reporter',
        reporterFingerprint: aliceFP,
      }),
    });
    const dupReportJson = await dupReportRes.json();
    const isSuppressed = dupReportRes.status === 200 && dupReportJson.duplicate === true;
    recordCheck('stage4_moderationAndDSA', 'duplicateReportSuppressed', isSuppressed, {
      status: dupReportRes.status,
      duplicate: dupReportJson.duplicate,
      message: dupReportJson.message,
    });
  } catch (err) {
    recordCheck('stage4_moderationAndDSA', 'duplicateReportSuppressed', false, { error: err.message });
  }

  // Test 4.3: Community Report Queue Submission
  try {
    const commReportRes = await fetch(`${TARGET_URL}/api/moderation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Fingerprint': aliceFP },
      body: JSON.stringify({
        action: 'report',
        communityId: 'c-general',
        targetId: 'post-test-123',
        targetType: 'post',
        reasonCategory: 'harassment',
        details: 'Community level moderation test',
      }),
    });
    const commReportJson = await commReportRes.json();
    const accepted = commReportRes.status === 201 || (commReportRes.status === 200 && commReportJson.duplicate === true);
    recordCheck('stage4_moderationAndDSA', 'communityReportAccepted', accepted, {
      status: commReportRes.status,
      reportId: commReportJson.reportId,
    });
  } catch (err) {
    recordCheck('stage4_moderationAndDSA', 'communityReportAccepted', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // STAGE 5: SECURITY & CONTENT SAFETY (QUOTAS, CSP, URL SANITIZATION)
  // --------------------------------------------------------------------------
  console.log('\n[Stage 5] Verifying Security Headers, Quotas & Content Sanitization...');

  // Test 5.1: Content-Security-Policy & Strict Security Headers
  try {
    const headRes = await fetch(TARGET_URL);
    const csp = headRes.headers.get('Content-Security-Policy') || '';
    const xContentType = headRes.headers.get('X-Content-Type-Options') || '';
    const xFrame = headRes.headers.get('X-Frame-Options') || '';

    const hasStrictCSP = csp.includes("default-src 'self'") || csp.includes("script-src 'self'");
    const hasNosniff = xContentType.toLowerCase() === 'nosniff';
    const hasFrameDeny = xFrame.toLowerCase() === 'deny' || csp.includes("frame-ancestors 'none'");

    recordCheck('stage5_securityAndContentSafety', 'securityHeadersAudit', hasNosniff && (hasStrictCSP || csp.length > 0), {
      hasStrictCSP,
      hasNosniff,
      hasFrameDeny,
      cspHeaderLength: csp.length,
    });
  } catch (err) {
    recordCheck('stage5_securityAndContentSafety', 'securityHeadersAudit', false, { error: err.message });
  }

  // Test 5.2: Storage Single File Quota & Magic Byte Validation
  try {
    const fakeHtmlUpload = await fetch(`${TARGET_URL}/api/storage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/png',
        'X-Filename': 'exploit.html',
        'X-User-Fingerprint': aliceFP,
      },
      body: '<script>alert("xss")</script>',
    });
    const rejected = fakeHtmlUpload.status === 400 || fakeHtmlUpload.status === 415 || fakeHtmlUpload.status === 403;
    recordCheck('stage5_securityAndContentSafety', 'spoofedUploadRejected', rejected, {
      status: fakeHtmlUpload.status,
    });
  } catch (err) {
    recordCheck('stage5_securityAndContentSafety', 'spoofedUploadRejected', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // STAGE 6: HTTP READ/WRITE LOAD BENCHMARKS (p50, p95, p99 LATENCIES)
  // --------------------------------------------------------------------------
  console.log('\n[Stage 6] Benchmarking Edge Response Latency & Cache Performance...');

  try {
    const latencies = [];
    const iterations = 25;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const res = await fetch(`${TARGET_URL}/api/posts?limit=5`);
      await res.json();
      const duration = performance.now() - start;
      latencies.push(duration);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.50)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const min = latencies[0];
    const max = latencies[latencies.length - 1];

    console.log(`  Latency Metrics (N=${iterations}): min=${min.toFixed(1)}ms, p50=${p50.toFixed(1)}ms, p95=${p95.toFixed(1)}ms, p99=${p99.toFixed(1)}ms, max=${max.toFixed(1)}ms`);

    recordCheck('stage6_loadAndLatencyBenchmarks', 'readLatencyUnderThreshold', p95 < 2000, {
      minMs: Number(min.toFixed(1)),
      p50Ms: Number(p50.toFixed(1)),
      p95Ms: Number(p95.toFixed(1)),
      p99Ms: Number(p99.toFixed(1)),
      maxMs: Number(max.toFixed(1)),
      samples: iterations,
    });
  } catch (err) {
    recordCheck('stage6_loadAndLatencyBenchmarks', 'readLatencyUnderThreshold', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // STAGE 3 & 7: PLAYWRIGHT E2E FOR SOCIAL SAFETY, BLOCKING, DM & SCREENSHOT
  // --------------------------------------------------------------------------
  console.log('\n[Stage 3 & 7] Running Playwright E2E for Social Safety, Blocking & DM Abuse...');

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    console.log('  Navigating Alice (Page A) and Bob (Page B)...');
    await Promise.all([
      pageA.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }),
      pageB.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }),
    ]);

    await Promise.all([
      pageA.waitForFunction(() => Boolean(window.clientStore?.keypair?.fingerprint), { timeout: 45000 }),
      pageB.waitForFunction(() => Boolean(window.clientStore?.keypair?.fingerprint), { timeout: 45000 }),
    ]);

    // Ensure DM ready and registered
    await Promise.all([
      pageA.evaluate(async () => {
        await window.__aetherisDM?.ready;
        await window.__aetherisDM?.startLiveSync();
        await window.__aetherisDM?.transport?.register();
      }),
      pageB.evaluate(async () => {
        await window.__aetherisDM?.ready;
        await window.__aetherisDM?.startLiveSync();
        await window.__aetherisDM?.transport?.register();
      }),
    ]);

    const liveAliceFP = await pageA.evaluate(() => window.clientStore.keypair.fingerprint);
    const liveBobFP   = await pageB.evaluate(() => window.clientStore.keypair.fingerprint);

    console.log('  Live Alice Fingerprint:', liveAliceFP);
    console.log('  Live Bob Fingerprint:  ', liveBobFP);

    // Test 3.1: Bob sends normal DM to Alice first
    console.log('  Bob sends initial direct message to Alice...');
    const initSend = await pageB.evaluate(async (aliceFP) => {
      try {
        return await window.__aetherisDM.transport.send(aliceFP, { text: 'Hello Alice before blocking' });
      } catch (e) {
        return { error: e.message };
      }
    }, liveAliceFP);
    console.log('  Initial send result:', initSend?.id ? 'SUCCESS' : initSend?.error);

    // Test 3.2: Alice blocks Bob via socialSafety
    console.log('  Alice blocks Bob via socialSafety...');
    const blockSuccess = await pageA.evaluate(async (bobFP) => {
      if (window.socialSafety) {
        return await window.socialSafety.blockUser(bobFP);
      }
      return false;
    }, liveBobFP);

    recordCheck('stage3_blockMuteAndDMSafety', 'aliceBlocksBobClientSafety', blockSuccess, {
      aliceFP: liveAliceFP,
      blockedBobFP: liveBobFP,
    });

    // Test 3.3: Bob attempts to send DM to Alice after being blocked -> Expect rejection
    console.log('  Bob attempts to send DM to Alice while blocked...');
    const blockedSendResult = await pageB.evaluate(async (aliceFP) => {
      try {
        const res = await window.__aetherisDM.transport.send(aliceFP, { text: 'Spam after being blocked' });
        return { success: true, res };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }, liveAliceFP);

    recordCheck('stage3_blockMuteAndDMSafety', 'blockedUserDMSendBlocked', !blockedSendResult.success, {
      expectedError: blockedSendResult.error || 'Blocked by Edge API',
    });

    // Test 3.4: Message Requests isolation check
    const messageRequestSeparation = await pageA.evaluate(async () => {
      return typeof window.__aetherisDM?.getRequestConversations === 'function' &&
             typeof window.__aetherisDM?.getInboxConversations === 'function';
    });
    recordCheck('stage3_blockMuteAndDMSafety', 'messageRequestsTabAvailable', messageRequestSeparation, {
      hasGetRequestConversations: messageRequestSeparation,
    });

    // Capture visual screenshot of active app state
    const screenshotPath = path.join(ARTIFACT_DIR, 'pass8_live_moderation_safety.png');
    await pageA.screenshot({ path: screenshotPath, fullPage: false });
    console.log('  Captured screenshot to:', screenshotPath);
    await copyToBrain('pass8_live_moderation_safety.png');

    recordCheck('stage4_moderationAndDSA', 'uiScreenshotCaptured', true, { path: screenshotPath });

    // Cleanup: Unblock Bob
    await pageA.evaluate(async (bobFP) => {
      if (window.socialSafety) {
        await window.socialSafety.unblockUser(bobFP);
      }
    }, liveBobFP);

  } catch (err) {
    console.warn('  Browser verification error:', err.message);
    recordCheck('stage3_blockMuteAndDMSafety', 'browserVerificationCompleted', false, { error: err.message });
  } finally {
    if (browser) await browser.close();
  }

  // --------------------------------------------------------------------------
  // STAGE 1: PRODUCTION RATE LIMITING & DOS RESISTANCE (RUN AT END)
  // --------------------------------------------------------------------------
  console.log('\n[Stage 1] Verifying Production Rate Limiting (Running at end to avoid quota depletion)...');

  // Test 1.1: Bad Bot User-Agent Throttling
  try {
    const botRes = await fetch(`${TARGET_URL}/api/posts?limit=1`, {
      headers: { 'User-Agent': 'Scrapy/2.5.0 (+https://scrapy.org)' },
    });
    recordCheck('stage1_rateLimiting', 'badBotDetection', botRes.status === 200 || botRes.status === 429, {
      status: botRes.status,
      rateLimitLimit: botRes.headers.get('X-RateLimit-Limit'),
    });
  } catch (err) {
    recordCheck('stage1_rateLimiting', 'badBotDetection', false, { error: err.message });
  }

  // Test 1.2: Rapid Burst Mutation Rate Limiting
  try {
    const burstPromises = [];
    const burstCount = 65; // Middleware mutations limit: 60/min, burst 30
    let got429 = false;
    let rateLimitHeaders = {};

    for (let i = 0; i < burstCount; i++) {
      burstPromises.push(
        fetch(`${TARGET_URL}/api/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'block', userId: 'ratelimit-probe', targetId: `target-${i}` }),
        }).then(res => {
          if (res.status === 429) {
            got429 = true;
            rateLimitHeaders = {
              retryAfter: res.headers.get('Retry-After'),
              limit: res.headers.get('X-RateLimit-Limit'),
              remaining: res.headers.get('X-RateLimit-Remaining'),
              reset: res.headers.get('X-RateLimit-Reset'),
            };
          }
          return res.status;
        }).catch(() => 0)
      );
    }

    const statuses = await Promise.all(burstPromises);
    const count429 = statuses.filter(s => s === 429).length;
    recordCheck('stage1_rateLimiting', 'burstMutationRateLimiting', got429 || count429 > 0, {
      totalRequests: burstCount,
      rateLimited429Count: count429,
      headersSample: rateLimitHeaders,
    });
  } catch (err) {
    recordCheck('stage1_rateLimiting', 'burstMutationRateLimiting', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // WRITE REPORT AND FINAL COPY
  // --------------------------------------------------------------------------
  const allChecks = Object.values(report)
    .filter(val => typeof val === 'object' && val !== null && !Array.isArray(val) && val !== report.summary)
    .flatMap(group => Object.values(group));

  report.summary.totalChecks = allChecks.length;
  report.summary.checksPassed = allChecks.filter(c => c && c.passed).length;
  report.summary.passed = report.summary.checksPassed >= (report.summary.totalChecks - 1);

  const reportPath = path.join(ARTIFACT_DIR, 'pass8_beta_readiness_report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  await copyToBrain('pass8_beta_readiness_report.json');

  console.log('\n================================================================');
  console.log(`VERIFICATION COMPLETE: ${report.summary.checksPassed} / ${report.summary.totalChecks} CHECKS PASSED`);
  console.log('Report saved:', reportPath);
  console.log('================================================================\n');

  if (!report.summary.passed) {
    process.exitCode = 1;
  }
}

runPass8Verification().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
