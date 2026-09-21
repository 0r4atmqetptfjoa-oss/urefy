// ===========================================================================
// UREfy — PASS 8.2 REAL CLOUDFLARE EDGE HTTP LOAD BENCHMARK
// Target: Cloudflare Edge (Pages Functions & Workers)
// Realistic Virtual User Journey:
//   Home -> Feed Page 1 -> Feed Page 2 (Scroll) -> Community -> Post Detail ->
//   Comments -> Profile -> Search
// Real concurrency tiers: 100, 250, 500, 1000 simulated clients with realistic pacing
// ===========================================================================

import { performance } from 'node:perf_hooks';

const QA_ORIGIN = process.env.CF_TARGET_URL || 'https://qa.aetheris-omni-sphere.pages.dev';
const HEADERS_BASE = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) UREfy-QA-LoadRunner/8.2',
  'Accept': 'application/json',
  'X-QA-Environment': '1',
};

console.log('═══════════════════════════════════════════════════════════════════');
console.log('  UREfy — PASS 8.2 REAL CLOUDFLARE EDGE HTTP LOAD BENCHMARK');
console.log(`  Target Edge URL: ${QA_ORIGIN}`);
console.log('═══════════════════════════════════════════════════════════════════\n');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function computePercentiles(latencies) {
  if (latencies.length === 0) return { p50: 0, p90: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const getP = (p) => {
    const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
    return Number(sorted[idx].toFixed(2));
  };
  return {
    p50: getP(50),
    p90: getP(90),
    p95: getP(95),
    p99: getP(99),
  };
}

async function fetchWithStats(url, options = {}) {
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...HEADERS_BASE, ...options.headers },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });
    const duration = performance.now() - t0;
    const cfRay = res.headers.get('cf-ray') || 'N/A';
    const reqId = res.headers.get('x-request-id') || cfRay;
    const rateLimitRemaining = res.headers.get('x-ratelimit-remaining');

    return {
      status: res.status,
      duration,
      ok: res.ok,
      cfRay,
      reqId,
      rateLimitRemaining,
      is429: res.status === 429,
      is4xx: res.status >= 400 && res.status < 500 && res.status !== 429,
      is5xx: res.status >= 500,
      timeout: false,
    };
  } catch (err) {
    const duration = performance.now() - t0;
    const isTimeout = err.name === 'TimeoutError' || err.message?.includes('timeout');
    return {
      status: isTimeout ? 408 : 0,
      duration,
      ok: false,
      cfRay: 'ERR',
      reqId: 'ERR',
      rateLimitRemaining: null,
      is429: false,
      is4xx: false,
      is5xx: true,
      timeout: isTimeout,
      error: err.message,
    };
  }
}

// ─── 1. COLD VS WARM EDGE BASELINE ───────────────────────────────────────────
async function measureColdVsWarm() {
  console.log('[Phase 1] Measuring Cold vs Warm Cloudflare Edge Latency...');
  
  // Cold request (first request to an unhit route / fresh connection)
  const coldRes = await fetchWithStats(`${QA_ORIGIN}/api/health?t=${Date.now()}`);
  console.log(`  Cold-Edge Request: ${coldRes.duration.toFixed(2)}ms (Status: ${coldRes.status}, cf-ray: ${coldRes.cfRay})`);
  
  // Warm requests (reusing edge connection & warm worker isolate)
  const warmLatencies = [];
  for (let i = 0; i < 5; i++) {
    await sleep(20);
    const warm = await fetchWithStats(`${QA_ORIGIN}/api/health`);
    warmLatencies.push(warm.duration);
  }
  const warmAvg = Number((warmLatencies.reduce((a, b) => a + b, 0) / warmLatencies.length).toFixed(2));
  console.log(`  Warm-Edge Latency: ${warmAvg}ms (5 consecutive samples: ${warmLatencies.map(l => l.toFixed(1)).join(', ')} ms)\n`);

  return { coldMs: Number(coldRes.duration.toFixed(2)), warmAvgMs: warmAvg };
}

// ─── 2. REALISTIC VIRTUAL USER JOURNEY ────────────────────────────────────────
async function executeUserJourney(userId) {
  const userResults = [];
  const thinkTime = 40 + Math.floor(Math.random() * 80); // 40-120ms realistic pacing

  // Step 1: Health & Boot
  userResults.push(await fetchWithStats(`${QA_ORIGIN}/api/health`));
  await sleep(thinkTime);

  // Step 2: Feed Page 1
  userResults.push(await fetchWithStats(`${QA_ORIGIN}/api/posts?limit=10`));
  await sleep(thinkTime);

  // Step 3: Feed Scroll (Page 2)
  userResults.push(await fetchWithStats(`${QA_ORIGIN}/api/posts?limit=10&offset=10`));
  await sleep(thinkTime);

  // Step 4: Community Exploration
  userResults.push(await fetchWithStats(`${QA_ORIGIN}/api/communities`));
  await sleep(thinkTime);

  // Step 5: Specific Community Feed
  userResults.push(await fetchWithStats(`${QA_ORIGIN}/api/posts?communityId=comm-tech`));
  await sleep(thinkTime);

  // Step 6: Post Detail
  userResults.push(await fetchWithStats(`${QA_ORIGIN}/api/posts/p_post_1`));
  await sleep(thinkTime);

  // Step 7: Comments on Post
  userResults.push(await fetchWithStats(`${QA_ORIGIN}/api/comments?postId=p_post_1`));
  await sleep(thinkTime);

  // Step 8: User Profile
  userResults.push(await fetchWithStats(`${QA_ORIGIN}/api/profile?user=u_${userId % 20}`));
  await sleep(thinkTime);

  // Step 9: Search query
  const query = ['sovereign', 'mesh', 'ratchet', 'crypto', 'privacy'][userId % 5];
  userResults.push(await fetchWithStats(`${QA_ORIGIN}/api/search?q=${query}`));

  return userResults;
}

// ─── 3. CONCURRENT LOAD TIERS ────────────────────────────────────────────────
async function runTier(concurrency, maxTotalUsers = concurrency) {
  console.log(`[HTTP Load Tier] Launching ${concurrency} concurrent virtual users (Total Users: ${maxTotalUsers})...`);
  const tStart = performance.now();

  const allRequests = [];
  let completedUsers = 0;

  // Run in chunks matching concurrency
  const userBatches = [];
  for (let i = 0; i < maxTotalUsers; i += concurrency) {
    const batch = [];
    const batchSize = Math.min(concurrency, maxTotalUsers - i);
    for (let j = 0; j < batchSize; j++) {
      const uId = i + j + 1;
      batch.push(
        executeUserJourney(uId).then((results) => {
          allRequests.push(...results);
          completedUsers++;
        })
      );
    }
    userBatches.push(batch);
  }

  for (const batch of userBatches) {
    await Promise.all(batch);
  }

  const durationMs = performance.now() - tStart;
  const durationSec = durationMs / 1000;
  const totalReqs = allRequests.length;
  const rps = Number((totalReqs / durationSec).toFixed(2));

  const latencies = allRequests.map((r) => r.duration);
  const percentiles = computePercentiles(latencies);

  const count429 = allRequests.filter((r) => r.is429).length;
  const count404 = allRequests.filter((r) => r.status === 404).length;
  const count400 = allRequests.filter((r) => r.status === 400).length;
  const count401 = allRequests.filter((r) => r.status === 401).length;
  const count403 = allRequests.filter((r) => r.status === 403).length;
  const count409 = allRequests.filter((r) => r.status === 409).length;
  const count413 = allRequests.filter((r) => r.status === 413).length;
  const count415 = allRequests.filter((r) => r.status === 415).length;
  const countOther4xx = allRequests.filter((r) => r.is4xx && ![404, 400, 401, 403, 409, 413, 415].includes(r.status)).length;
  const countNon429_4xx = allRequests.filter((r) => r.is4xx).length;
  const count5xx = allRequests.filter((r) => r.is5xx).length;
  const countTimeout = allRequests.filter((r) => r.timeout).length;
  const countSuccess = allRequests.filter((r) => r.ok).length;

  const sumTerminal = countSuccess + count429 + countNon429_4xx + count5xx + countTimeout;
  if (sumTerminal !== totalReqs) {
    throw new Error(`[ACCOUNTING INVARIANT FAILED] sumTerminal (${sumTerminal}) !== totalReqs (${totalReqs})`);
  }

  const pct429 = Number(((count429 / totalReqs) * 100).toFixed(2));
  const pctNon429_4xx = Number(((countNon429_4xx / totalReqs) * 100).toFixed(2));
  const pct4xxTotal = Number((((count429 + countNon429_4xx) / totalReqs) * 100).toFixed(2));
  const pct5xx = Number(((count5xx / totalReqs) * 100).toFixed(2));
  const pctTimeout = Number(((countTimeout / totalReqs) * 100).toFixed(2));
  const pctSuccess = Number(((countSuccess / totalReqs) * 100).toFixed(2));

  console.log(`  ✓ Concurrency N=${concurrency}: ${totalReqs} requests in ${durationSec.toFixed(2)}s (${rps} RPS)`);
  console.log(`    Latencies: p50: ${percentiles.p50}ms | p90: ${percentiles.p90}ms | p95: ${percentiles.p95}ms | p99: ${percentiles.p99}ms`);
  console.log(`    Accounting: 2xx Success: ${countSuccess} (${pctSuccess}%) | 429 RateLimit: ${count429} (${pct429}%) | 404 Missing: ${count404} | 5xx: ${count5xx} | Timeouts: ${countTimeout}`);
  console.log(`    [Invariant Verified] attempted (${totalReqs}) === sumTerminal (${sumTerminal})\n`);

  return {
    concurrency,
    durationSec: Number(durationSec.toFixed(2)),
    totalRequests: totalReqs,
    rps,
    p50: percentiles.p50,
    p90: percentiles.p90,
    p95: percentiles.p95,
    p99: percentiles.p99,
    pctSuccess,
    pct429,
    pctNon429_4xx,
    pct4xxTotal,
    pct5xx,
    pctTimeout,
    counts: {
      total: totalReqs,
      success2xx: countSuccess,
      rateLimited429: count429,
      notFound404: count404,
      badRequest400: count400,
      unauthorized401: count401,
      forbidden403: count403,
      conflict409: count409,
      payloadTooLarge413: count413,
      unsupportedMedia415: count415,
      otherNon429_4xx: countOther4xx,
      server5xx: count5xx,
      timeouts: countTimeout,
    },
    invariantPassed: sumTerminal === totalReqs,
  };
}

export async function runHttpLoadSuite() {
  const coldWarm = await measureColdVsWarm();

  const results = [];
  const tiers = [100, 250, 500, 1000];

  for (const tier of tiers) {
    const tierRes = await runTier(tier);
    results.push(tierRes);

    // Saturation check: If 5xx > 10% or timeouts > 5%, pause/escalate
    if (tierRes.pct5xx > 10 || tierRes.pctTimeout > 5) {
      console.warn(`[SATURATION WARNING] Material degradation observed at Concurrency N=${tier}. Stopping further escalation.`);
      break;
    }
    // Rest between tiers to clear rate limit windows
    await sleep(2000);
  }

  return {
    coldWarm,
    tiers: results,
  };
}

if (process.argv[1]?.endsWith('run-pass8-2-cf-http-load.mjs')) {
  runHttpLoadSuite()
    .then((report) => {
      console.log('=== REAL CLOUDFLARE HTTP LOAD COMPLETE ===');
      console.log(JSON.stringify(report, null, 2));
    })
    .catch((err) => {
      console.error('Fatal error during HTTP load test:', err);
      process.exit(1);
    });
}
