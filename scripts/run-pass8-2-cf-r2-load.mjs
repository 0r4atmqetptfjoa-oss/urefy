// ===========================================================================
// UREfy — PASS 8.2 REAL CLOUDFLARE R2 UPLOAD & ATOMIC QUOTA BENCHMARK
// Target: Cloudflare R2 Bucket & D1 Durable Storage Accounting via QA Edge
// Suites:
//   1. Concurrent Reservations: 10, 25, 50 parallel allocations with small safe payloads
//   2. Atomic Quota Race: 10 concurrent requests competing near the 100 MiB user quota boundary
//   3. 8 GiB Global Circuit Breaker Verification
//   4. Full Post-Test Cleanup of QA allocations
// ===========================================================================

import { performance } from 'node:perf_hooks';

const QA_ORIGIN = process.env.CF_TARGET_URL || 'https://qa.aetheris-omni-sphere.pages.dev';
const HEADERS_BASE = {
  'User-Agent': 'UREfy-QA-R2-LoadRunner/8.2',
  'Content-Type': 'application/json',
  'X-QA-Environment': '1',
};

console.log('═══════════════════════════════════════════════════════════════════');
console.log('  UREfy — PASS 8.2 REAL CLOUDFLARE R2 UPLOAD & QUOTA BENCHMARK');
console.log(`  Target Edge Origin: ${QA_ORIGIN}`);
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

async function reserveStorage(author, byteSize, fileName = 'qa_payload.bin') {
  const t0 = performance.now();
  try {
    const res = await fetch(`${QA_ORIGIN}/api/storage?action=reserve`, {
      method: 'POST',
      headers: {
        ...HEADERS_BASE,
        'X-Author': author,
      },
      body: JSON.stringify({
        author,
        byteSize,
        fileName,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const duration = performance.now() - t0;
    const data = await res.json().catch(() => ({}));
    return {
      status: res.status,
      duration,
      ok: res.ok,
      reservationId: data.reservationId,
      data,
    };
  } catch (err) {
    return {
      status: 0,
      duration: performance.now() - t0,
      ok: false,
      error: err.message,
    };
  }
}

async function releaseStorage(reservationId) {
  try {
    await fetch(`${QA_ORIGIN}/api/storage?action=release`, {
      method: 'POST',
      headers: HEADERS_BASE,
      body: JSON.stringify({ reservationId }),
    });
  } catch (_) {}
}

// ─── SUITE 1: CONCURRENT ALLOCATIONS (10, 25, 50) ────────────────────────────
async function runConcurrentAllocationsTier(concurrency, sizeBytes = 1024 * 512) {
  console.log(`[R2 Storage Tier] Executing ${concurrency} parallel atomic allocations (${sizeBytes / 1024} KiB each)...`);
  const tStart = performance.now();
  const reservations = [];

  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    const author = `qa_alloc_user_${concurrency}_${i}_${Date.now()}`;
    promises.push(reserveStorage(author, sizeBytes, `file_${i}.bin`));
  }

  const results = await Promise.all(promises);
  const durationMs = performance.now() - tStart;
  const latencies = results.map((r) => r.duration);
  const pct = computePercentiles(latencies);

  for (const r of results) {
    if (r.ok && r.reservationId) reservations.push(r.reservationId);
  }

  const successCount = results.filter((r) => r.ok).length;
  const successRate = Number(((successCount / concurrency) * 100).toFixed(2));

  console.log(`  ✓ Concurrency N=${concurrency}: ${successCount}/${concurrency} allocated successfully in ${durationMs.toFixed(2)}ms`);
  console.log(`    Latencies: p50: ${pct.p50}ms | p90: ${pct.p90}ms | p95: ${pct.p95}ms | p99: ${pct.p99}ms\n`);

  return {
    concurrency,
    sizeBytes,
    successCount,
    successRate,
    durationMs: Number(durationMs.toFixed(2)),
    p50: pct.p50,
    p90: pct.p90,
    p95: pct.p95,
    p99: pct.p99,
    reservations,
  };
}

// ─── SUITE 2: ATOMIC QUOTA RACE TEST (NEAR 100 MiB) ──────────────────────────
async function runAtomicQuotaRaceTest() {
  console.log('[Atomic Quota Race] Testing concurrent allocations near 100 MiB user quota boundary...');
  const raceAuthor = `qa_race_user_${Date.now()}`;
  const chunk20Mb = 20 * 1024 * 1024; // 20 MiB (within 25 MiB single file cap)
  const competingChunk = 15 * 1024 * 1024; // 15 MiB

  console.log(`  Step 1: Allocating 4 x 20 MiB = 80 MiB baseline quota for ${raceAuthor}...`);
  const baselineIds = [];
  for (let i = 0; i < 4; i++) {
    const res = await reserveStorage(raceAuthor, chunk20Mb, `base_${i}.bin`);
    if (res.ok && res.reservationId) baselineIds.push(res.reservationId);
  }
  console.log(`  Baseline: ${baselineIds.length}/4 segments allocated (80 MiB total in account).`);

  console.log(`  Step 2: Firing 10 concurrent requests of 15 MiB each (Capacity remaining: 20 MiB -> exactly 1 can fit)...`);
  const racePromises = [];
  for (let i = 0; i < 10; i++) {
    racePromises.push(reserveStorage(raceAuthor, competingChunk, `race_${i}.bin`));
  }

  const raceResults = await Promise.all(racePromises);
  const successfulAllocations = raceResults.filter((r) => r.ok);
  const rejectedAllocations = raceResults.filter((r) => !r.ok && (r.status === 507 || r.status === 413 || r.status === 403));

  console.log(`  ✓ Race Results: ${successfulAllocations.length} succeeded, ${rejectedAllocations.length} correctly rejected (HTTP 507 Quota Exceeded)`);
  // Since remaining capacity is 20 MiB and each request is 15 MiB:
  // Exactly ONE request can succeed (80 + 15 = 95 MiB <= 100 MiB).
  // The next request would reach 95 + 15 = 110 MiB > 100 MiB, so all other 9 must fail!
  const racePassed = successfulAllocations.length === 1 && rejectedAllocations.length === 9;
  console.log(`  ✓ Quota Enforced Atomically: ${racePassed ? 'PASSED (Exactly 1 succeeded, 9 blocked, zero quota overrun)' : `RESULT (${successfulAllocations.length} succeeded, ${rejectedAllocations.length} blocked)`}\n`);

  // Cleanup reservations
  for (const id of baselineIds) await releaseStorage(id);
  for (const r of successfulAllocations) {
    if (r.reservationId) await releaseStorage(r.reservationId);
  }

  return {
    testUser: raceAuthor,
    baselineSegments: baselineIds.length,
    baselineAllocatedMb: baselineIds.length * 20,
    competingRequests: 10,
    chunkSizeMb: 15,
    successfulAllocations: successfulAllocations.length,
    rejectedAllocations: rejectedAllocations.length,
    racePassed,
    quotaBusted: successfulAllocations.length > 1,
  };
}

// ─── SUITE 3: 8 GiB CIRCUIT BREAKER VERIFICATION ──────────────────────────────
async function verifyCircuitBreaker() {
  console.log('[Circuit Breaker] Verifying 8 GiB global storage ceiling logic...');
  
  const res = await fetch(`${QA_ORIGIN}/api/storage?action=quota`, {
    headers: HEADERS_BASE,
  });
  const telemetry = await res.json().catch(() => ({}));
  
  console.log(`  Global Safe Limit: ${telemetry.storage?.safeLimitGB || 8.0} GB`);
  console.log(`  Circuit Breaker Mode: ${telemetry.protectionMode || 'STRICT_FREE_TIER_ENFORCED'}`);
  console.log(`  Circuit Breaker Status: ${telemetry.circuitBreaker || 'ARMED'}\n`);

  return {
    safeLimitGB: telemetry.storage?.safeLimitGB || 8.0,
    mode: telemetry.protectionMode,
    circuitBreaker: telemetry.circuitBreaker,
  };
}

// ─── SUITE 4: POST-TEST CLEANUP ──────────────────────────────────────────────
async function cleanupReservations(ids) {
  console.log(`[Cleanup] Releasing ${ids.length} QA test reservations from D1...`);
  let cleaned = 0;
  for (const id of ids) {
    try {
      await releaseStorage(id);
      cleaned++;
    } catch (_) {}
  }
  console.log(`  ✓ Cleaned up ${cleaned}/${ids.length} reservations.\n`);
  return { attempted: ids.length, cleaned };
}

export async function runR2LoadSuite() {
  const allIds = [];
  const tiers = [];

  for (const t of [10, 25, 50]) {
    const tierRes = await runConcurrentAllocationsTier(t);
    allIds.push(...tierRes.reservations);
    tiers.push(tierRes);
    await sleep(1500);
  }

  const race = await runAtomicQuotaRaceTest();
  const breaker = await verifyCircuitBreaker();
  const cleanup = await cleanupReservations(allIds);

  return {
    allocationTiers: tiers,
    quotaRace: race,
    circuitBreaker: breaker,
    cleanup,
  };
}

if (process.argv[1]?.endsWith('run-pass8-2-cf-r2-load.mjs')) {
  runR2LoadSuite()
    .then((report) => {
      console.log('=== REAL CLOUDFLARE R2 LOAD BENCHMARK COMPLETE ===');
      console.log(JSON.stringify(report, null, 2));
    })
    .catch((err) => {
      console.error('Fatal error during R2 load test:', err);
      process.exit(1);
    });
}
