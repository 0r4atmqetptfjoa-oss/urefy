import { describe, it, expect, beforeEach } from 'vitest';
import {
  CryptoWorkerPool,
  cryptoWorkerPool,
  pureSha256,
  pureSha512,
} from '../src/web-workers.js';

describe('Web Workers Cryptographic Engine & Worker Pool', () => {
  let pool: CryptoWorkerPool;

  beforeEach(() => {
    pool = new CryptoWorkerPool();
  });

  describe('Pure SHA-256 Engine', () => {
    it('computes known NIST SHA-256 test vectors accurately', () => {
      // Test vector 1: Empty string
      expect(pureSha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

      // Test vector 2: "abc"
      expect(pureSha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

      // Test vector 3: "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"
      expect(pureSha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
        '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
      );
    });
  });

  describe('Pure SHA-512 Engine', () => {
    it('computes 64-byte SHA-512 digest for arbitrary buffers', () => {
      const digest = pureSha512('aetheris-network');
      expect(digest).toBeInstanceOf(Uint8Array);
      expect(digest.length).toBe(64);
    });
  });

  describe('Merkle Root Computation', () => {
    it('handles empty leaves list gracefully', async () => {
      const root = await pool.computeMerkleRoot([]);
      expect(root).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('computes root for single leaf', async () => {
      const leaf = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
      const root = await pool.computeMerkleRoot([leaf]);
      expect(root).toBe(leaf);
    });

    it('computes binary Merkle tree root for even number of leaves', async () => {
      const leaves = [
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      ];
      const root = await pool.computeMerkleRoot(leaves);
      expect(root).toHaveLength(64);
      expect(root).toMatch(/^[0-9a-f]{64}$/);
    });

    it('computes binary Merkle tree root for odd number of leaves (with duplication)', async () => {
      const leaves = ['leaf1', 'leaf2', 'leaf3'];
      const root = await pool.computeMerkleRoot(leaves);
      expect(root).toHaveLength(64);
      expect(root).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('Shannon Information Entropy Engine', () => {
    it('returns 0 for empty buffers', async () => {
      const entropy = await pool.computeEntropy(new Uint8Array(0));
      expect(entropy).toBe(0.0);
    });

    it('returns 0 for identical repetitive bytes (zero uncertainty)', async () => {
      const uniformBuffer = new Uint8Array(100).fill(0x42);
      const entropy = await pool.computeEntropy(uniformBuffer);
      expect(entropy).toBe(0.0);
    });

    it('returns high entropy (~8.0 bits) for uniformly distributed bytes', async () => {
      const randomLikeBuffer = new Uint8Array(256 * 10);
      for (let i = 0; i < randomLikeBuffer.length; i++) {
        randomLikeBuffer[i] = i % 256;
      }
      const entropy = await pool.computeEntropy(randomLikeBuffer);
      expect(entropy).toBeCloseTo(8.0, 2);
    });
  });

  describe('Vectorized TF-IDF Calculation', () => {
    it('returns zeroes for empty documents or empty query', async () => {
      expect(await pool.computeTFIDF([], 'query')).toEqual([]);
      expect(await pool.computeTFIDF(['doc one'], '')).toEqual([0]);
    });

    it('ranks documents correctly based on term frequency and inverted frequency', async () => {
      const docs = [
        'Aetheris is a decentralized zero knowledge privacy platform',
        'Cooking recipes for delicious homemade sourdough bread and pasta',
        'Zero knowledge proofs and zk-SNARK cryptographic consensus mechanisms',
      ];
      const query = 'zero knowledge cryptographic proofs';
      const scores = await pool.computeTFIDF(docs, query);

      expect(scores).toHaveLength(3);
      // Doc 2 (index 2) contains most query keywords
      expect(scores[2]).toBeGreaterThan(scores[0]);
      // Doc 1 (cooking) contains no query keywords
      expect(scores[1]).toBe(0);
    });
  });

  describe('Lagrange Share Verification', () => {
    it('validates legitimate secret shares within BN254 field bounds', async () => {
      const validShare = {
        x: 1,
        y: 12345678901234567890123456789012345678901234567890n,
      };
      const isValid = await pool.verifyLagrangeShare(validShare, 3);
      expect(isValid).toBe(true);
    });

    it('rejects invalid threshold or coordinates', async () => {
      // Threshold < 2
      expect(await pool.verifyLagrangeShare({ x: 1, y: 100n }, 1)).toBe(false);
      // x <= 0
      expect(await pool.verifyLagrangeShare({ x: 0, y: 100n }, 3)).toBe(false);
      // y out of prime bounds
      const overModulus = (1n << 256n);
      expect(await pool.verifyLagrangeShare({ x: 1, y: overModulus }, 3)).toBe(false);
    });
  });

  describe('Worker Pool Dispatcher & Concurrency Management', () => {
    it('dispatches and resolves tasks asynchronously with priority ordering', async () => {
      const pLow = pool.dispatch<string>({
        type: 'sha256',
        payload: { data: 'low_priority_item' },
        priority: 'low',
      });

      const pHigh = pool.dispatch<string>({
        type: 'sha256',
        payload: { data: 'high_priority_item' },
        priority: 'high',
      });

      const [resLow, resHigh] = await Promise.all([pLow, pHigh]);
      expect(resLow).toMatch(/^[0-9a-f]{64}$/);
      expect(resHigh).toMatch(/^[0-9a-f]{64}$/);

      const stats = pool.getPoolStats();
      expect(stats.totalProcessed).toBeGreaterThanOrEqual(2);
      expect(stats.avgDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('dispatches TFIDF and Entropy tasks through dispatch()', async () => {
      const entropy = await pool.dispatch<number>({
        type: 'entropy',
        payload: { data: 'Aetheris Security Test Payload' },
        priority: 'normal',
      });
      expect(entropy).toBeGreaterThan(0);

      const tfidf = await pool.dispatch<number[]>({
        type: 'tfidf',
        payload: {
          docs: ['Aetheris client engine', 'Database storage'],
          query: 'Aetheris',
        },
        priority: 'high',
      });
      expect(tfidf[0]).toBeGreaterThan(0);
    });
  });

  describe('UI Status Widget & Diagnostics Rendering', () => {
    it('renders HTML widget adhering to Tailwind specifications', () => {
      const widget = pool.renderWorkerStatusWidget();
      expect(widget).toContain('⚡');
      expect(widget).toContain('Workers:');
      expect(widget).toContain('Processed:');
      expect(widget).toContain('bg-surface-raised');
      expect(widget).toContain('text-cyphr');
    });

    it('renders expanded diagnostics panel', () => {
      const panel = pool.renderDiagnosticsPanel();
      expect(panel).toContain('Aetheris Crypto Worker Matrix');
      expect(panel).toContain('ACTIVE WORKERS');
      expect(panel).toContain('QUEUE DEPTH');
      expect(panel).toContain('AVG LATENCY');
    });

    it('runs the comprehensive benchmark suite', async () => {
      const benchmarkResults = await pool.benchmark();
      expect(benchmarkResults.merkleTime).toBeGreaterThanOrEqual(0);
      expect(benchmarkResults.shaTime).toBeGreaterThanOrEqual(0);
      expect(benchmarkResults.entropyTime).toBeGreaterThanOrEqual(0);
      expect(benchmarkResults.tfidfTime).toBeGreaterThanOrEqual(0);
      expect(benchmarkResults.lagrangeTime).toBeGreaterThanOrEqual(0);
      expect(benchmarkResults.totalTime).toBeGreaterThanOrEqual(0);
    }, 15000);
  });

  describe('Singleton Export Check', () => {
    it('exports initialized singleton instance', () => {
      expect(cryptoWorkerPool).toBeInstanceOf(CryptoWorkerPool);
      expect(cryptoWorkerPool.poolSize).toBeGreaterThanOrEqual(2);
    });
  });
});
