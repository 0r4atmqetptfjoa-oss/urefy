import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  onRequestGet,
  onRequestPost,
  onRequestDelete,
  computeSha256,
  computeMerkleRoot,
  resetEdgeStorage,
  getTotalStorageBytes,
  getMonthlyClassAOps,
  getMonthlyClassBOps,
  setMockQuotaStats,
  clearListingCache,
  findObjectBySha256,
  MAX_SINGLE_UPLOAD_BYTES,
  MAX_STORAGE_CAP_BYTES,
  MAX_CLASS_A_MONTHLY_OPS,
  MAX_CLASS_B_MONTHLY_OPS,
  FREE_TIER_STORAGE_CAP_BYTES,
  FREE_TIER_CLASS_A_OPS,
  FREE_TIER_CLASS_B_OPS,
  LISTING_CACHE_TTL_MS,
  R2_LIMITS,
  r2QuotaGuardian,
  globalEdgeStorageMap,
} from '../functions/api/storage.js';
import { R2Bucket, R2Object, R2ObjectBody } from '../functions/api/_db.js';

// ─── MOCK CLOUDFLARE R2 BUCKET WITH SPY SUPPORT ─────────────────────────────

function createMockR2Bucket(customListSpy?: any): {
  bucket: R2Bucket;
  store: Map<string, { data: Uint8Array; httpMetadata: any; customMetadata: Record<string, string>; uploaded: Date }>;
  listCalls: number;
  getCalls: number;
  putCalls: number;
} {
  const store = new Map<
    string,
    {
      data: Uint8Array;
      httpMetadata: any;
      customMetadata: Record<string, string>;
      uploaded: Date;
    }
  >();

  const stats = {
    listCalls: 0,
    getCalls: 0,
    putCalls: 0,
  };

  const bucket: R2Bucket = {
    async head(key: string): Promise<R2Object | null> {
      const item = store.get(key);
      if (!item) return null;
      return {
        key,
        version: '1',
        size: item.data.byteLength,
        etag: `mock-etag-${key}`,
        httpEtag: `"mock-etag-${key}"`,
        checksums: {},
        uploaded: item.uploaded,
        httpMetadata: item.httpMetadata,
        customMetadata: item.customMetadata,
      };
    },

    async get(key: string): Promise<R2ObjectBody | null> {
      stats.getCalls++;
      const item = store.get(key);
      if (!item) return null;

      const bodyStream = new ReadableStream({
        start(controller) {
          controller.enqueue(item.data);
          controller.close();
        },
      });

      return {
        key,
        version: '1',
        size: item.data.byteLength,
        etag: `mock-etag-${key}`,
        httpEtag: `"mock-etag-${key}"`,
        checksums: {},
        uploaded: item.uploaded,
        httpMetadata: item.httpMetadata,
        customMetadata: item.customMetadata,
        body: bodyStream,
        bodyUsed: false,
        async arrayBuffer() {
          return item.data.buffer.slice(
            item.data.byteOffset,
            item.data.byteOffset + item.data.byteLength
          );
        },
        async text() {
          return new TextDecoder().decode(item.data);
        },
        async json<T>() {
          return JSON.parse(new TextDecoder().decode(item.data)) as T;
        },
        async blob() {
          return new Blob([item.data]);
        },
      };
    },

    async put(key: string, value: any, options?: any): Promise<R2Object | null> {
      stats.putCalls++;
      let data: Uint8Array;
      if (value instanceof Uint8Array) {
        data = value;
      } else if (value instanceof ArrayBuffer) {
        data = new Uint8Array(value);
      } else if (typeof value === 'string') {
        data = new TextEncoder().encode(value);
      } else if (value && typeof value.arrayBuffer === 'function') {
        data = new Uint8Array(await value.arrayBuffer());
      } else {
        data = new TextEncoder().encode(String(value));
      }

      const entry = {
        data,
        httpMetadata: options?.httpMetadata || {},
        customMetadata: options?.customMetadata || {},
        uploaded: new Date(),
      };
      store.set(key, entry);

      return {
        key,
        version: '1',
        size: data.byteLength,
        etag: `mock-etag-${key}`,
        httpEtag: `"mock-etag-${key}"`,
        checksums: {},
        uploaded: entry.uploaded,
        httpMetadata: entry.httpMetadata,
        customMetadata: entry.customMetadata,
      };
    },

    async delete(keys: string | string[]): Promise<void> {
      const arr = Array.isArray(keys) ? keys : [keys];
      for (const k of arr) {
        store.delete(k);
      }
    },

    async list(options?: any): Promise<{ objects: R2Object[]; truncated: boolean }> {
      stats.listCalls++;
      if (customListSpy) {
        customListSpy(options);
      }
      const prefix = options?.prefix || '';
      const objects: R2Object[] = [];
      for (const [k, v] of store.entries()) {
        if (!prefix || k.startsWith(prefix)) {
          objects.push({
            key: k,
            version: '1',
            size: v.data.byteLength,
            etag: `mock-etag-${k}`,
            httpEtag: `"mock-etag-${k}"`,
            checksums: {},
            uploaded: v.uploaded,
            httpMetadata: v.httpMetadata,
            customMetadata: v.customMetadata,
          });
        }
      }
      return { objects, truncated: false };
    },
  };

  return { bucket, store, ...stats, get listCalls() { return stats.listCalls; }, get getCalls() { return stats.getCalls; }, get putCalls() { return stats.putCalls; } };
}

// ─── TEST SUITE: CLOUDFLARE R2 ZERO-OVERAGE QUOTA GUARDIAN ──────────────────

describe('Cloudflare R2 Zero-Overage Quota Guardian Verification Suite', () => {
  beforeEach(() => {
    resetEdgeStorage();
  });

  // ─── TEST 1: SINGLE UPLOAD SIZE LIMIT (> 25MB -> 413) ──────────────────────
  describe('Test 1: Single Upload Safety Cap (25 MB Ceiling)', () => {
    it('rejects an upload greater than 25MB with HTTP 413 Payload Too Large', async () => {
      // 26 MB payload (exceeds 25 MB max single upload limit)
      const oversizedBytes = 26 * 1024 * 1024;
      const oversizedPayload = new Uint8Array(oversizedBytes);
      oversizedPayload[0] = 0x5a;
      oversizedPayload[oversizedBytes - 1] = 0x5a;

      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': 'oversized-release-artifact.iso',
          'X-Author': 'genesis-core',
        },
        body: oversizedPayload,
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(413);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Payload exceeds maximum permitted size of 25MB');
      expect(json.error).toContain('26.0MB');
    });

    it('permits uploads within the 25MB limit', async () => {
      const validPayload = new TextEncoder().encode('Sovereign Microkernel Core Release');
      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': 'valid-release.bin',
          'X-Author': 'genesis-core',
        },
        body: validPayload,
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.byteSize).toBe(validPayload.byteLength);
    });
  });

  // ─── TEST 2: SHA-256 DEDUPLICATION (0 ADDED BYTES) ─────────────────────────
  describe('Test 2: SHA-256 Deduplication (Zero Added Bytes & Zero Waste)', () => {
    it('reuses existing object with zero added bytes upon duplicate binary upload', async () => {
      const binaryPayload = new TextEncoder().encode(
        'Sovereign Zero-Knowledge RLN Prover v2.0 Cryptographic Archive Binary'
      );
      const expectedSha256 = await computeSha256(binaryPayload);
      const expectedMerkle = await computeMerkleRoot(binaryPayload);

      // First upload: creates initial object
      const firstReq = new Request('https://aetheris-omni-sphere.pages.dev/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': 'zk-prover-original.bin',
          'X-Author': 'c3dc28cb705e',
          'X-Title': 'ZK Prover Original Canonical',
          'X-Key': 'releases/zk-prover-original.bin',
        },
        body: binaryPayload,
      });

      const res1 = await onRequestPost({ request: firstReq });
      expect(res1.status).toBe(201);
      const json1 = await res1.json();
      expect(json1.success).toBe(true);
      expect(json1.sha256).toBe(expectedSha256);
      expect(json1.key).toBe('releases/zk-prover-original.bin');

      const storageAfterFirstUpload = getTotalStorageBytes();

      // Second upload: exact same binary payload under a different filename and author
      const secondReq = new Request('https://aetheris-omni-sphere.pages.dev/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': 'zk-prover-mirror-copy.bin',
          'X-Author': 'a89104fa2211',
          'X-Title': 'ZK Prover Mirror Upload',
        },
        body: binaryPayload,
      });

      const res2 = await onRequestPost({ request: secondReq });
      expect(res2.status).toBe(200);

      const json2 = await res2.json();
      expect(json2.success).toBe(true);
      expect(json2.deduplicated).toBe(true);
      // Confirms the existing object key and SHA-256 are reused
      expect(json2.key).toBe('releases/zk-prover-original.bin');
      expect(json2.sha256).toBe(expectedSha256);
      expect(json2.merkleRoot).toBe(expectedMerkle);

      // Confirms headers communicate deduplication
      expect(res2.headers.get('X-Deduplicated')).toBe('true');
      expect(res2.headers.get('X-SHA256-Checksum')).toBe(expectedSha256);

      // Storage size must NOT increase (zero added bytes)
      const storageAfterSecondUpload = getTotalStorageBytes();
      expect(storageAfterSecondUpload).toBe(storageAfterFirstUpload);
    });
  });

  // ─── TEST 3: DIRECTORY LISTING CACHE (60s CLASS A SAVER) ───────────────────
  describe('Test 3: Directory Listing Caching (60s In-Memory Class A Saver)', () => {
    it('returns cached response within 60s without making additional Class A calls', async () => {
      const listSpy = vi.fn();
      const { bucket } = createMockR2Bucket(listSpy);

      // Populate bucket with 2 objects
      await bucket.put('pkg/alpha.bin', new TextEncoder().encode('alpha'));
      await bucket.put('pkg/beta.bin', new TextEncoder().encode('beta'));

      // Initial list request: Cache miss -> calls bucket.list() (1 Class A operation)
      const firstReq = new Request('https://aetheris-omni-sphere.pages.dev/api/storage?list=true&prefix=pkg/');
      const res1 = await onRequestGet({ request: firstReq, env: { VAULT_BUCKET: bucket } });
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.success).toBe(true);
      expect(json1.count).toBe(2);
      expect(listSpy).toHaveBeenCalledTimes(1);

      const classAAfterFirstList = getMonthlyClassAOps();
      expect(classAAfterFirstList).toBeGreaterThanOrEqual(1);

      // Subsequent list request within 60s: Cache hit -> bucket.list() must NOT be called
      const secondReq = new Request('https://aetheris-omni-sphere.pages.dev/api/storage?list=true&prefix=pkg/');
      const res2 = await onRequestGet({ request: secondReq, env: { VAULT_BUCKET: bucket } });
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.success).toBe(true);
      expect(json2.count).toBe(2);

      // Verifies no additional Class A calls occurred
      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(getMonthlyClassAOps()).toBe(classAAfterFirstList);

      // Verify that after cache invalidation, next call properly refreshes
      clearListingCache();
      const thirdReq = new Request('https://aetheris-omni-sphere.pages.dev/api/storage?list=true&prefix=pkg/');
      const res3 = await onRequestGet({ request: thirdReq, env: { VAULT_BUCKET: bucket } });
      expect(res3.status).toBe(200);
      expect(listSpy).toHaveBeenCalledTimes(2);
      expect(getMonthlyClassAOps()).toBe(classAAfterFirstList + 1);
    });
  });

  // ─── TEST 4: SAFE STORAGE CEILING (> 8.0 GB -> 507) ────────────────────────
  describe('Test 4: Sovereign Storage Safety Ceiling (8.0 GB Limit)', () => {
    it('rejects uploads exceeding 8.0 GB safe storage ceiling with HTTP 507 Insufficient Storage', async () => {
      // Simulate storage at exact 8.0 GB safe cap
      setMockQuotaStats({ storageBytes: MAX_STORAGE_CAP_BYTES });

      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': 'exceeding-file.bin',
          'X-Author': 'genesis-core',
        },
        body: new TextEncoder().encode('Any additional byte will breach the 8.0 GB ceiling'),
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(507);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Sovereign storage safety cap');
      expect(json.error).toContain('8.0 GB');
      expect(json.error).toContain('Failover to P2P WebRTC Direct Swarm');
    });

    it('rejects an upload when existing storage plus new file size exceeds 8.0 GB', async () => {
      // 8.0 GB minus 500 KB
      const almostFullBytes = MAX_STORAGE_CAP_BYTES - 500 * 1024;
      setMockQuotaStats({ storageBytes: almostFullBytes });

      // Uploading 1 MB will exceed 8.0 GB
      const payload1MB = new Uint8Array(1024 * 1024);
      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': 'will-exceed.bin',
        },
        body: payload1MB,
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(507);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Sovereign storage safety cap (8.0 GB');
    });
  });

  // ─── TEST 5: CLASS A OPERATIONS CEILING (>= 750k -> 429) ───────────────────
  describe('Test 5: Class A Operations Safety Ceiling (750k Ops Safe Cap)', () => {
    it('rejects upload mutations with HTTP 429 and failover instruction when Class A limit reached', async () => {
      // Simulate reaching the 750,000 Class A monthly ops ceiling
      setMockQuotaStats({ classA: MAX_CLASS_A_MONTHLY_OPS });

      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': 'blocked-by-quota.bin',
          'X-Author': 'c3dc28cb705e',
        },
        body: new TextEncoder().encode('Test mutation under exhausted Class A budget'),
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(429);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Class A operation safety ceiling reached');
      expect(json.error).toContain('750,000');
      expect(json.error).toContain('Failover to P2P WebRTC Direct Swarm');
    });

    it('rejects delete mutations with HTTP 429 and failover instruction when Class A limit reached', async () => {
      setMockQuotaStats({ classA: MAX_CLASS_A_MONTHLY_OPS });

      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/storage?key=releases/test.bin', {
        method: 'DELETE',
      });

      const res = await onRequestDelete({ request: req });
      expect(res.status).toBe(429);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Class A operation safety ceiling reached');
      expect(json.error).toContain('Failover to P2P WebRTC Direct Swarm');
    });
  });

  // ─── TEST 6: IF-NONE-MATCH 304 NOT MODIFIED (CLASS B SAVER) ────────────────
  describe('Test 6: Conditional Binary Download (If-None-Match -> HTTP 304)', () => {
    it('returns HTTP 304 Not Modified when client provides matching SHA-256 ETag for Edge Memory item', async () => {
      const seedSha256 = 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496';
      const seedKey = 'releases/aetheris-microkernel-x86_64.bin';

      const req = new Request(`https://aetheris-omni-sphere.pages.dev/api/storage?key=${seedKey}`, {
        headers: {
          'If-None-Match': `"${seedSha256}"`,
        },
      });

      const res = await onRequestGet({ request: req });
      expect(res.status).toBe(304);
      expect(res.headers.get('ETag')).toBe(`"${seedSha256}"`);
      expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');

      // 304 response must not have body content
      const text = await res.text();
      expect(text).toBe('');
    });

    it('returns HTTP 304 Not Modified when client provides matching unquoted SHA-256', async () => {
      const seedSha256 = 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496';
      const seedKey = 'releases/aetheris-microkernel-x86_64.bin';

      const req = new Request(`https://aetheris-omni-sphere.pages.dev/api/storage?key=${seedKey}`, {
        headers: {
          'If-None-Match': seedSha256,
        },
      });

      const res = await onRequestGet({ request: req });
      expect(res.status).toBe(304);
    });

    it('returns HTTP 304 Not Modified for Cloudflare R2 bucket objects with matching ETag', async () => {
      const { bucket } = createMockR2Bucket();
      const testData = new TextEncoder().encode('R2 Stored Object for 304 verification');
      const sha256 = await computeSha256(testData);

      await bucket.put('artifacts/r2-file.bin', testData, {
        customMetadata: { sha256, author: 'genesis-core' },
      });

      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/storage?key=artifacts/r2-file.bin', {
        headers: {
          'If-None-Match': `"${sha256}"`,
        },
      });

      const res = await onRequestGet({ request: req, env: { VAULT_BUCKET: bucket } });
      expect(res.status).toBe(304);
      expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    });

    it('returns HTTP 200 with full body when If-None-Match does not match', async () => {
      const seedKey = 'releases/aetheris-microkernel-x86_64.bin';
      const req = new Request(`https://aetheris-omni-sphere.pages.dev/api/storage?key=${seedKey}`, {
        headers: {
          'If-None-Match': '"stale-etag-99999"',
        },
      });

      const res = await onRequestGet({ request: req });
      expect(res.status).toBe(200);
      const data = await res.arrayBuffer();
      expect(data.byteLength).toBeGreaterThan(0);
    });
  });

  // ─── TEST 7: QUOTA TELEMETRY TELEMETRY ENDPOINT (GET /api/storage?action=quota) ──
  describe('Test 7: Quota Telemetry Telemetry Endpoint', () => {
    it('returns telemetry matching Cloudflare free monthly tier specifications', async () => {
      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/storage?action=quota');
      const res = await onRequestGet({ request: req });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.protectionMode).toBe('STRICT_FREE_TIER_ENFORCED');
      expect(json.circuitBreaker).toBe('ARMED_AND_PROTECTED');

      // Storage telemetry validation
      expect(json.storage.safeLimitGB).toBe(8.0);
      expect(json.storage.freeTierCapGB).toBe(10.0);
      expect(typeof json.storage.usedBytes).toBe('number');
      expect(typeof json.storage.percentUsed).toBe('number');
      expect(json.storage.percentUsed).toBeLessThanOrEqual(100);
      expect(json.storage.status).toBe('HEALTHY');

      // Class A telemetry validation
      expect(json.classA.safeLimitOps).toBe(750000);
      expect(json.classA.freeTierCapOps).toBe(1000000);
      expect(typeof json.classA.monthOps).toBe('number');
      expect(typeof json.classA.percentUsed).toBe('number');
      expect(json.classA.status).toBe('HEALTHY');

      // Class B telemetry validation
      expect(json.classB.safeLimitOps).toBe(7500000);
      expect(json.classB.freeTierCapOps).toBe(10000000);
      expect(typeof json.classB.monthOps).toBe('number');
      expect(typeof json.classB.percentUsed).toBe('number');
      expect(json.classB.status).toBe('HEALTHY');
    });

    it('returns telemetry via quota=true query parameter', async () => {
      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/storage?quota=true');
      const res = await onRequestGet({ request: req });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.storage.safeLimitGB).toBe(8.0);
    });

    it('reflects simulated quota changes in the telemetry output', async () => {
      // Simulate 6.0 GB usage (75% of safe cap)
      const simulatedBytes = 6.0 * 1024 * 1024 * 1024;
      setMockQuotaStats({
        storageBytes: simulatedBytes,
        classA: 500000,
        classB: 2000000,
      });

      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/storage?action=quota');
      const res = await onRequestGet({ request: req });
      const json = await res.json();

      expect(json.storage.usedBytes).toBe(simulatedBytes);
      expect(json.storage.percentUsed).toBe(75);
      expect(json.storage.status).toBe('WARNING'); // Above 70% threshold

      expect(json.classA.monthOps).toBe(500000);
      expect(json.classA.percentUsed).toBe(66.67);

      expect(json.classB.monthOps).toBe(2000000);
      expect(json.classB.percentUsed).toBe(26.67);
    });
  });
});
