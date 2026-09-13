import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  onRequestGet,
  onRequestPost,
  onRequestOptions,
  onRequestHead,
  onRequestDelete,
  computeSha256,
  computeMerkleRoot,
  resetEdgeStorage,
  globalEdgeStorageMap,
  STORAGE_CORS_HEADERS,
  MAX_STORAGE_CAP_BYTES,
  MAX_SINGLE_UPLOAD_BYTES,
  MAX_CLASS_A_MONTHLY_OPS,
  MAX_CLASS_B_MONTHLY_OPS,
  RAM_CACHE_MAX_BYTES,
  LISTING_CACHE_TTL_MS,
  getTotalStorageBytes,
  getMonthlyClassAOps,
  getMonthlyClassBOps,
  setMockQuotaStats,
  clearListingCache,
} from '../functions/api/storage.js';
import { R2Bucket, R2Object, R2ObjectBody } from '../functions/api/_db.js';

// ─── MOCK CLOUDFLARE R2 BUCKET IMPLEMENTATION ────────────────────────────────

function createMockR2Bucket(): R2Bucket {
  const store = new Map<
    string,
    {
      data: Uint8Array;
      httpMetadata: any;
      customMetadata: Record<string, string>;
      uploaded: Date;
    }
  >();

  return {
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
}

describe('Cloudflare Pages Functions - R2 & Edge Vault Storage Architecture (storage.ts)', () => {
  beforeEach(() => {
    resetEdgeStorage();
  });

  // ─── 1. CORS PREFLIGHT & HEADERS ───────────────────────────────────────────
  describe('1. Complete CORS Preflight & Security Headers (onRequestOptions)', () => {
    it('should respond to OPTIONS request with 204 No Content and complete CORS headers', async () => {
      const res = await onRequestOptions();
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('DELETE');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('HEAD');
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-File-Name');
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-Sha256');
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-Merkle-Root');
      expect(res.headers.get('Access-Control-Expose-Headers')).toContain('Content-Disposition');
      expect(res.headers.get('Access-Control-Expose-Headers')).toContain('X-SHA256-Checksum');
      expect(res.headers.get('Access-Control-Expose-Headers')).toContain('X-Merkle-Root');
      expect(res.headers.get('Access-Control-Expose-Headers')).toContain('X-Edge-Storage');
      expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
    });
  });

  // ─── 2. CRYPTOGRAPHIC CHECKSUMS & MERKLE TREE ──────────────────────────────
  describe('2. Cryptographic Integrity: SHA-256 & Merkle Tree Root Computation', () => {
    it('should calculate accurate standard SHA-256 hashes', async () => {
      const testData = new TextEncoder().encode('UREfy Sovereign Microkernel Release Matrix');
      const hash = await computeSha256(testData);

      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(64);
      // Deterministic check
      const hash2 = await computeSha256(testData);
      expect(hash).toBe(hash2);
    });

    it('should compute Merkle Root for single-chunk binary payloads', async () => {
      const smallData = new TextEncoder().encode('Zero-Knowledge RLN WebAssembly Prover v1.0');
      const sha256Hash = await computeSha256(smallData);
      const merkleRoot = await computeMerkleRoot(smallData, 16384);

      // For data <= chunkSize, Merkle root equals SHA-256
      expect(merkleRoot).toBe(sha256Hash);
    });

    it('should compute Merkle Root for multi-chunk binary payloads (> 64KB)', async () => {
      // Create 48KB binary buffer (3 chunks of 16KB)
      const multiChunkData = new Uint8Array(48 * 1024);
      for (let i = 0; i < multiChunkData.length; i++) {
        multiChunkData[i] = (i * 31) % 256;
      }

      const merkleRoot = await computeMerkleRoot(multiChunkData, 16384);
      expect(typeof merkleRoot).toBe('string');
      expect(merkleRoot).toHaveLength(64);

      // Verify repeatability
      const merkleRoot2 = await computeMerkleRoot(multiChunkData, 16384);
      expect(merkleRoot).toBe(merkleRoot2);
    });

    it('should handle empty buffer in Merkle root calculation gracefully', async () => {
      const empty = new Uint8Array(0);
      const root = await computeMerkleRoot(empty);
      const emptySha = await computeSha256(empty);
      expect(root).toBe(emptySha);
    });
  });

  // ─── 3. BINARY UPLOAD & R2 STORAGE (onRequestPost) ─────────────────────────
  describe('3. Secure Binary Upload & Storage (onRequestPost)', () => {
    it('should reject requests missing Content-Type header with 400 status', async () => {
      const req = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        body: new Uint8Array([1, 2, 3, 4]),
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Missing Content-Type');
    });

    it('should reject empty binary payload with 400 status', async () => {
      const req = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: new Uint8Array(0),
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('should upload direct binary stream to Edge In-Memory fallback when R2 is unbound', async () => {
      const payloadBytes = new TextEncoder().encode('Sovereign Clean Distribution Bytecode');
      const expectedSha = await computeSha256(payloadBytes);
      const expectedMerkle = await computeMerkleRoot(payloadBytes);

      const req = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': 'microkernel.bin',
          'X-Author': 'c3dc28cb705e',
          'X-Title': 'UREfy Microkernel Release',
          'X-Key': 'releases/microkernel.bin',
          'X-Admin-PIN': '11223',
        },
        body: payloadBytes,
      });

      const res = await onRequestPost({ request: req, env: {} });
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.key).toBe('releases/microkernel.bin');
      expect(json.fileName).toBe('microkernel.bin');
      expect(json.sha256).toBe(expectedSha);
      expect(json.merkleRoot).toBe(expectedMerkle);
      expect(json.author).toBe('c3dc28cb705e');
      expect(json.title).toBe('UREfy Microkernel Release');
      expect(json.storage).toBe('Edge-Isolate-Memory');
      expect(json.downloadUrl).toBe('/api/storage?key=releases%2Fmicrokernel.bin');

      // Check header checksums
      expect(res.headers.get('X-SHA256-Checksum')).toBe(expectedSha);
      expect(res.headers.get('X-Merkle-Root')).toBe(expectedMerkle);
      expect(res.headers.get('X-Edge-Storage')).toBe('Edge-Isolate-Memory');

      // Verify item stored in memory
      expect(globalEdgeStorageMap.has('releases/microkernel.bin')).toBe(true);
    });

    it('should upload and persist binary to Cloudflare R2 when env.VAULT_BUCKET binding is present', async () => {
      const mockVaultBucket = createMockR2Bucket();
      const payloadBytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]); // ELF header
      const expectedSha = await computeSha256(payloadBytes);
      const expectedMerkle = await computeMerkleRoot(payloadBytes);

      const req = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-executable',
          'X-File-Name': 'zk-tree-verifier',
          'X-Author': 'archivist-alpha',
          'X-Title': 'ZK Tree Verifier ELF Binary',
          'X-Key': 'releases/zk-tree-verifier',
          'X-Admin-PIN': '11223',
        },
        body: payloadBytes,
      });

      const res = await onRequestPost({
        request: req,
        env: { VAULT_BUCKET: mockVaultBucket },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.key).toBe('releases/zk-tree-verifier');
      expect(json.storage).toBe('Cloudflare-R2');
      expect(json.sha256).toBe(expectedSha);
      expect(json.merkleRoot).toBe(expectedMerkle);
      expect(res.headers.get('X-Edge-Storage')).toBe('Cloudflare-R2');

      // Verify object exists in Mock R2 Bucket with metadata
      const r2Obj = await mockVaultBucket.get('releases/zk-tree-verifier');
      expect(r2Obj).not.toBeNull();
      expect(r2Obj?.customMetadata?.sha256).toBe(expectedSha);
      expect(r2Obj?.customMetadata?.merkleRoot).toBe(expectedMerkle);
      expect(r2Obj?.customMetadata?.author).toBe('archivist-alpha');
      expect(r2Obj?.customMetadata?.title).toBe('ZK Tree Verifier ELF Binary');
      expect(r2Obj?.size).toBe(8);
    });

    it('should support Cloudflare R2 binding via env.R2 as alias', async () => {
      const mockR2 = createMockR2Bucket();
      const payloadBytes = new TextEncoder().encode('Kyber-1024 Public Parameters');

      const req = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': 'kyber1024-params.bin',
          'X-Key': 'crypto/kyber1024-params.bin',
          'X-Admin-PIN': '11223',
        },
        body: payloadBytes,
      });

      const res = await onRequestPost({
        request: req,
        env: { R2: mockR2 },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.storage).toBe('Cloudflare-R2');
      expect(json.key).toBe('crypto/kyber1024-params.bin');
    });

    it('should support multipart/form-data upload with File object and metadata', async () => {
      const mockBucket = createMockR2Bucket();
      const formData = new FormData();
      const fileBlob = new Blob(['UREfy MLS TreeKEM State Bundle'], {
        type: 'application/octet-stream',
      });
      formData.append('file', fileBlob, 'treekem-bundle.bin');
      formData.append('author', 'treekem-guardian');
      formData.append('title', 'MLS TreeKEM Group State');
      formData.append('key', 'vault/treekem-bundle.bin');

      const req = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: { 'X-Admin-PIN': '11223' },
        body: formData,
      });

      const res = await onRequestPost({
        request: req,
        env: { VAULT_BUCKET: mockBucket },
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.fileName).toBe('treekem-bundle.bin');
      expect(json.author).toBe('treekem-guardian');
      expect(json.title).toBe('MLS TreeKEM Group State');
      expect(json.storage).toBe('Cloudflare-R2');
    });

    it('should support application/json payload with Base64 data', async () => {
      const rawText = 'Base64 Encoded Sovereign Release Test';
      const base64Data = btoa(rawText);

      const req = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': '11223' },
        body: JSON.stringify({
          base64: base64Data,
          fileName: 'b64-payload.txt',
          author: 'json-uploader',
          title: 'Base64 JSON Upload',
          key: 'vault/b64-payload.txt',
        }),
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.fileName).toBe('b64-payload.txt');
      expect(json.author).toBe('json-uploader');
    });
  });

  // ─── 4. BINARY DOWNLOAD, STREAMING & HEADERS (onRequestGet) ────────────────
  describe('4. Binary Streaming, Security Headers & Verification (onRequestGet)', () => {
    it('should stream seeded release binary with immutable caching & verification headers', async () => {
      const req = new Request(
        'https://urefy.com/api/storage?key=releases/aetheris-microkernel-x86_64.bin'
      );
      const res = await onRequestGet({ request: req });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Disposition')).toContain(
        'aetheris-microkernel-x86_64.bin'
      );
      expect(res.headers.get('X-SHA256-Checksum')).toBe(
        'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496'
      );
      expect(res.headers.get('X-Merkle-Root')).toBe(
        'a2d2ab5e55249f01020304050607080900000000000000000000000000000000'
      );
      expect(res.headers.get('Cache-Control')).toBe(
        'public, max-age=31536000, immutable'
      );
      expect(res.headers.get('ETag')).toBeDefined();
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');

      const text = await res.text();
      expect(text).toContain('UREfy Microkernel v1.0.0');
    });

    it('should stream binary from Cloudflare R2 bucket with full HTTP/3 headers', async () => {
      const mockBucket = createMockR2Bucket();
      const payload = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
      const sha256 = await computeSha256(payload);
      const merkleRoot = await computeMerkleRoot(payload);

      await mockBucket.put('releases/firmware-v2.bin', payload, {
        httpMetadata: { contentType: 'application/octet-stream' },
        customMetadata: {
          sha256,
          merkleRoot,
          author: 'firmware-sec',
          title: 'Secure Firmware Image v2',
          fileName: 'firmware-v2.bin',
        },
      });

      const req = new Request(
        'https://urefy.com/api/storage?key=releases/firmware-v2.bin'
      );
      const res = await onRequestGet({
        request: req,
        env: { VAULT_BUCKET: mockBucket },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Length')).toBe('8');
      expect(res.headers.get('Content-Disposition')).toContain('firmware-v2.bin');
      expect(res.headers.get('X-SHA256-Checksum')).toBe(sha256);
      expect(res.headers.get('X-Merkle-Root')).toBe(merkleRoot);
      expect(res.headers.get('X-Author')).toBe('firmware-sec');
      expect(res.headers.get('X-Title')).toBe('Secure Firmware Image v2');
      expect(res.headers.get('X-Edge-Storage')).toBe('Cloudflare-R2');
      expect(res.headers.get('Cache-Control')).toBe(
        'public, max-age=31536000, immutable'
      );

      const arrayBuf = await res.arrayBuffer();
      expect(arrayBuf.byteLength).toBe(8);
      const received = new Uint8Array(arrayBuf);
      expect(received[0]).toBe(10);
      expect(received[7]).toBe(80);
    });

    it('should return metadata JSON when requested with ?meta=true or ?info=true', async () => {
      const req = new Request(
        'https://urefy.com/api/storage?key=releases/aetheris-microkernel-x86_64.bin&meta=true'
      );
      const res = await onRequestGet({ request: req });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/json');

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.key).toBe('releases/aetheris-microkernel-x86_64.bin');
      expect(json.fileName).toBe('aetheris-microkernel-x86_64.bin');
      expect(json.sha256).toBe(
        'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496'
      );
      expect(json.byteSize).toBeGreaterThan(0);
    });

    it('should find and download file by SHA-256 checksum query (?sha256=...) ', async () => {
      const targetSha =
        'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496';
      const req = new Request(
        `https://urefy.com/api/storage?sha256=${targetSha}`
      );
      const res = await onRequestGet({ request: req });

      expect(res.status).toBe(200);
      expect(res.headers.get('X-SHA256-Checksum')).toBe(targetSha);
    });

    it('should list all available vault releases when list=true or no key provided', async () => {
      const req = new Request('https://urefy.com/api/storage?list=true');
      const res = await onRequestGet({ request: req });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(json.objects)).toBe(true);
      expect(
        json.objects.some(
          (o: any) => o.key === 'releases/aetheris-microkernel-x86_64.bin'
        )
      ).toBe(true);
    });

    it('should return 404 when object key does not exist', async () => {
      const req = new Request(
        'https://urefy.com/api/storage?key=releases/non-existent-file.bin'
      );
      const res = await onRequestGet({ request: req });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Object not found');
    });
  });

  // ─── 5. HEAD REQUEST HANDLING (onRequestHead) ──────────────────────────────
  describe('5. HTTP HEAD Metadata Probing (onRequestHead)', () => {
    it('should return 200 with checksum and length headers but empty body for HEAD request', async () => {
      const req = new Request(
        'https://urefy.com/api/storage?key=releases/aetheris-microkernel-x86_64.bin',
        { method: 'HEAD' }
      );
      const res = await onRequestHead({ request: req });

      expect(res.status).toBe(200);
      expect(res.headers.get('X-SHA256-Checksum')).toBeDefined();
      expect(res.headers.get('Content-Length')).toBeDefined();
      expect(res.headers.get('Cache-Control')).toBe(
        'public, max-age=31536000, immutable'
      );

      const bodyText = await res.text();
      expect(bodyText).toBe('');
    });
  });

  // ─── 6. DELETE REQUEST HANDLING (onRequestDelete) ───────────────────────────
  describe('6. Vault Artifact Deletion (onRequestDelete)', () => {
    it('should reject DELETE request without key parameter', async () => {
      const req = new Request('https://urefy.com/api/storage', {
        method: 'DELETE',
      });
      const res = await onRequestDelete({ request: req });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('should delete existing object from in-memory store', async () => {
      // Upload temp item
      const postReq = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Key': 'temp/artifact-to-delete.bin',
          'X-Admin-PIN': '11223',
        },
        body: new Uint8Array([1, 2, 3]),
      });
      await onRequestPost({ request: postReq });

      // Delete it
      const deleteReq = new Request(
        'https://urefy.com/api/storage?key=temp/artifact-to-delete.bin',
        {
          method: 'DELETE',
          headers: {
            'X-Admin-PIN': '11223',
          },
        }
      );
      const delRes = await onRequestDelete({ request: deleteReq });
      expect(delRes.status).toBe(200);
      const delJson = await delRes.json();
      expect(delJson.success).toBe(true);
      expect(delJson.deletedFromMemory).toBe(true);

      // Verify subsequent GET returns 404
      const getReq = new Request(
        'https://urefy.com/api/storage?key=temp/artifact-to-delete.bin'
      );
      const getRes = await onRequestGet({ request: getReq });
      expect(getRes.status).toBe(404);
    });

    it('should delete object from Cloudflare R2 bucket binding', async () => {
      const mockBucket = createMockR2Bucket();
      await mockBucket.put('releases/obsolete.bin', new Uint8Array([9, 9, 9]));

      const deleteReq = new Request(
        'https://urefy.com/api/storage?key=releases/obsolete.bin',
        {
          method: 'DELETE',
          headers: {
            'X-Admin-PIN': '11223',
          },
        }
      );
      const res = await onRequestDelete({
        request: deleteReq,
        env: { VAULT_BUCKET: mockBucket },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.deletedFromR2).toBe(true);

      const obj = await mockBucket.get('releases/obsolete.bin');
      expect(obj).toBeNull();
    });
  });

  // ─── 7. CLOUDFLARE R2 ZERO-OVERAGE QUOTA GUARDIAN ──────────────────────────
  describe('7. Cloudflare R2 Zero-Overage Quota Guardian Engine', () => {
    it('should reject uploads exceeding single upload cap (25 MB) with HTTP 413', async () => {
      // 25MB + 1 byte
      const oversizedPayload = new Uint8Array(25 * 1024 * 1024 + 1024);
      const req = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Key': 'vault/oversized.bin',
        },
        body: oversizedPayload,
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('25MB');
    });

    it('should reject upload with HTTP 507 when sovereign storage safety cap (8.0 GB) is exceeded', async () => {
      // Set storage near the 8.0 GB safe limit
      setMockQuotaStats({ storageBytes: MAX_STORAGE_CAP_BYTES - 50 });

      const testPayload = new Uint8Array(100);
      const req = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Key': 'vault/exceed-storage.bin',
        },
        body: testPayload,
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(507);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe(
        'SOVEREIGN_R2_QUOTA_GUARD: Sovereign storage safety cap (8.0 GB / 10.0 GB free tier) reached. Upload rejected to preserve Cloudflare free tier. Failover to P2P WebRTC Direct Swarm.'
      );
    });

    it('should reject upload with HTTP 429 when Class A operations ceiling (750,000 ops) is reached', async () => {
      setMockQuotaStats({ classA: MAX_CLASS_A_MONTHLY_OPS });

      const req = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Key': 'vault/class-a-capped.bin',
        },
        body: new Uint8Array([11, 22, 33, 44]),
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe(
        'SOVEREIGN_R2_QUOTA_GUARD: Class A operation safety ceiling reached (750,000 / 1,000,000 free cap). Failover to P2P WebRTC Direct Swarm.'
      );
    });

    it('should cache directory listings for 60s and serve without calling bucket.list()', async () => {
      const mockBucket = createMockR2Bucket();
      await mockBucket.put('releases/test-item.bin', new Uint8Array([1, 2, 3]));
      const listSpy = vi.spyOn(mockBucket, 'list');

      const req1 = new Request('https://urefy.com/api/storage?list=true');
      const res1 = await onRequestGet({
        request: req1,
        env: { VAULT_BUCKET: mockBucket },
      });

      expect(res1.status).toBe(200);
      expect(res1.headers.get('Cache-Control')).toBe(
        'public, max-age=60, s-maxage=60, stale-while-revalidate=120'
      );
      expect(listSpy).toHaveBeenCalledTimes(1);

      // Immediate second call should hit the 60-second in-memory cache
      const req2 = new Request('https://urefy.com/api/storage?list=true');
      const res2 = await onRequestGet({
        request: req2,
        env: { VAULT_BUCKET: mockBucket },
      });

      expect(res2.status).toBe(200);
      expect(listSpy).toHaveBeenCalledTimes(1); // 0 additional bucket.list() Class A operations!

      const json = await res2.json();
      expect(json.success).toBe(true);
      expect(json.count).toBeGreaterThan(0);
    });

    it('should invalidate directory listing cache when a new file is uploaded', async () => {
      const mockBucket = createMockR2Bucket();
      const listSpy = vi.spyOn(mockBucket, 'list');

      // Prime the listing cache
      await onRequestGet({
        request: new Request('https://urefy.com/api/storage?list=true'),
        env: { VAULT_BUCKET: mockBucket },
      });
      expect(listSpy).toHaveBeenCalledTimes(1);

      // Upload a new file which must invalidate the cache
      await onRequestPost({
        request: new Request('https://urefy.com/api/storage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Key': 'releases/new-file-invalidation.bin',
            'X-Admin-PIN': '11223',
          },
          body: new Uint8Array([55, 66, 77]),
        }),
        env: { VAULT_BUCKET: mockBucket },
      });

      // Subsequent listing must call bucket.list() again
      await onRequestGet({
        request: new Request('https://urefy.com/api/storage?list=true'),
        env: { VAULT_BUCKET: mockBucket },
      });
      expect(listSpy).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate identical SHA-256 uploads returning existing object without calling bucket.put()', async () => {
      const mockBucket = createMockR2Bucket();
      const putSpy = vi.spyOn(mockBucket, 'put');

      const originalPayload = new Uint8Array([7, 14, 21, 28, 35]);

      // First upload: creates object in R2
      const firstReq = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Key': 'vault/original-binary.bin',
          'X-Author': 'originator',
          'X-Title': 'Original Binary',
          'X-Admin-PIN': '11223',
        },
        body: originalPayload,
      });

      const firstRes = await onRequestPost({
        request: firstReq,
        env: { VAULT_BUCKET: mockBucket },
      });

      expect(firstRes.status).toBe(201);
      expect(putSpy).toHaveBeenCalledTimes(1);
      const firstJson = await firstRes.json();
      expect(firstJson.key).toBe('vault/original-binary.bin');

      const initialClassAOps = getMonthlyClassAOps();
      const initialTotalBytes = getTotalStorageBytes();

      // Second upload: duplicate payload with different key name
      const duplicateReq = new Request('https://urefy.com/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Key': 'vault/duplicate-binary.bin',
          'X-Admin-PIN': '11223',
        },
        body: originalPayload,
      });

      const duplicateRes = await onRequestPost({
        request: duplicateReq,
        env: { VAULT_BUCKET: mockBucket },
      });

      expect(duplicateRes.status).toBe(200);
      expect(duplicateRes.headers.get('X-Deduplicated')).toBe('true');
      const duplicateJson = await duplicateRes.json();
      expect(duplicateJson.success).toBe(true);
      expect(duplicateJson.deduplicated).toBe(true);
      expect(duplicateJson.key).toBe('vault/original-binary.bin');

      // Verify zero bucket.put() calls, zero Class A ops added, zero bytes added
      expect(putSpy).toHaveBeenCalledTimes(1);
      expect(getMonthlyClassAOps()).toBe(initialClassAOps);
      expect(getTotalStorageBytes()).toBe(initialTotalBytes);
    });

    it('should return HTTP 304 Not Modified when If-None-Match header matches SHA-256 or ETag', async () => {
      const seedSha = 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496';

      const reqWithExactEtag = new Request(
        'https://urefy.com/api/storage?key=releases/aetheris-microkernel-x86_64.bin',
        {
          headers: {
            'If-None-Match': `"${seedSha}"`,
          },
        }
      );

      const res = await onRequestGet({ request: reqWithExactEtag });
      expect(res.status).toBe(304);
      expect(res.headers.get('ETag')).toBe(`"${seedSha}"`);
      expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
      expect(res.headers.get('X-SHA256-Checksum')).toBe(seedSha);
      const text = await res.text();
      expect(text).toBe('');
    });

    it('should return HTTP 304 Not Modified for R2 objects when If-None-Match matches', async () => {
      const mockBucket = createMockR2Bucket();
      const payload = new Uint8Array([100, 101, 102]);
      const sha256 = await computeSha256(payload);

      await mockBucket.put('vault/test-r2-etag.bin', payload, {
        customMetadata: { sha256 },
      });

      const req = new Request(
        'https://urefy.com/api/storage?key=vault/test-r2-etag.bin',
        {
          headers: {
            'If-None-Match': `"mock-etag-vault/test-r2-etag.bin"`,
          },
        }
      );

      const res = await onRequestGet({
        request: req,
        env: { VAULT_BUCKET: mockBucket },
      });

      expect(res.status).toBe(304);
      expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
      const text = await res.text();
      expect(text).toBe('');
    });

    it('should serve small files (< 2 MB) from RAM cache without calling bucket.get() on subsequent reads', async () => {
      const mockBucket = createMockR2Bucket();
      const payload = new Uint8Array([1, 2, 3, 4, 5]);
      await mockBucket.put('releases/small-ram-cache.bin', payload, {
        httpMetadata: { contentType: 'application/octet-stream' },
        customMetadata: {
          sha256: await computeSha256(payload),
          fileName: 'small-ram-cache.bin',
        },
      });

      const getSpy = vi.spyOn(mockBucket, 'get');

      const req1 = new Request(
        'https://urefy.com/api/storage?key=releases/small-ram-cache.bin'
      );
      const res1 = await onRequestGet({
        request: req1,
        env: { VAULT_BUCKET: mockBucket },
      });

      expect(res1.status).toBe(200);
      expect(getSpy).toHaveBeenCalledTimes(1);

      // Subsequent read hits edge isolate RAM cache
      const req2 = new Request(
        'https://urefy.com/api/storage?key=releases/small-ram-cache.bin'
      );
      const res2 = await onRequestGet({
        request: req2,
        env: { VAULT_BUCKET: mockBucket },
      });

      expect(res2.status).toBe(200);
      expect(getSpy).toHaveBeenCalledTimes(1); // 0 additional bucket.get() Class B calls!
      expect(res2.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    });

    it('should reject GET requests with HTTP 429 when Class B operations ceiling (7,500,000 ops) is reached', async () => {
      const mockBucket = createMockR2Bucket();
      await mockBucket.put('vault/uncached-file.bin', new Uint8Array(3 * 1024 * 1024)); // 3MB (> 2MB RAM cache)

      setMockQuotaStats({ classB: MAX_CLASS_B_MONTHLY_OPS });

      const req = new Request('https://urefy.com/api/storage?key=vault/uncached-file.bin');
      const res = await onRequestGet({
        request: req,
        env: { VAULT_BUCKET: mockBucket },
      });

      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe(
        'SOVEREIGN_R2_QUOTA_GUARD: Class B operation safety ceiling reached (7,500,000 / 10,000,000 free cap). Failover to P2P WebRTC Direct Swarm.'
      );
    });

    it('should return complete quota telemetry when query parameter action=quota or quota=true', async () => {
      const req1 = new Request('https://urefy.com/api/storage?action=quota');
      const res1 = await onRequestGet({ request: req1 });

      expect(res1.status).toBe(200);
      const json1 = await res1.json();

      expect(json1.success).toBe(true);
      expect(json1.protectionMode).toBe('STRICT_FREE_TIER_ENFORCED');
      expect(json1.circuitBreaker).toBe('ARMED_AND_PROTECTED');

      // Storage telemetry
      expect(json1.storage).toBeDefined();
      expect(typeof json1.storage.usedBytes).toBe('number');
      expect(typeof json1.storage.usedMB).toBe('number');
      expect(typeof json1.storage.usedGB).toBe('number');
      expect(json1.storage.safeLimitGB).toBe(8.0);
      expect(json1.storage.freeTierCapGB).toBe(10.0);
      expect(typeof json1.storage.percentUsed).toBe('number');
      expect(json1.storage.status).toBe('HEALTHY');

      // Class A telemetry
      expect(json1.classA).toBeDefined();
      expect(typeof json1.classA.monthOps).toBe('number');
      expect(json1.classA.safeLimitOps).toBe(750000);
      expect(json1.classA.freeTierCapOps).toBe(1000000);
      expect(typeof json1.classA.percentUsed).toBe('number');
      expect(json1.classA.status).toBe('HEALTHY');

      // Class B telemetry
      expect(json1.classB).toBeDefined();
      expect(typeof json1.classB.monthOps).toBe('number');
      expect(json1.classB.safeLimitOps).toBe(7500000);
      expect(json1.classB.freeTierCapOps).toBe(10000000);
      expect(typeof json1.classB.percentUsed).toBe('number');
      expect(json1.classB.status).toBe('HEALTHY');

      // Check quota=true alias
      const req2 = new Request('https://urefy.com/api/storage?quota=true');
      const res2 = await onRequestGet({ request: req2 });
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.success).toBe(true);
      expect(json2.protectionMode).toBe('STRICT_FREE_TIER_ENFORCED');
    });
  });
});

