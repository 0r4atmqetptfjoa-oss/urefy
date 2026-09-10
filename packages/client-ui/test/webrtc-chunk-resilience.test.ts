import { describe, it, expect, beforeEach } from 'vitest';
import {
  WebRTCFileTransfer,
  type P2PTransfer,
  type ChunkVerificationState,
  type SignalingMessage,
} from '../src/webrtc-transfer.js';
import { enableDemoMode } from '../src/demo-mode.js';

describe('Etapa 5.3: WebRTC Chunk Transfer Resilience & Reassembly', () => {
  let transferEngine: WebRTCFileTransfer;

  beforeEach(() => {
    enableDemoMode(false);
    transferEngine = new WebRTCFileTransfer();
  });

  // Helper to generate deterministic synthetic binary payload with distinct chunks
  function generateSyntheticBinary(sizeBytes: number): Uint8Array {
    const data = new Uint8Array(sizeBytes);
    for (let i = 0; i < sizeBytes; i++) {
      data[i] = (((i >> 16) + 1) * 37 + (i * 31 + 7)) & 0xff;
    }
    return data;
  }

  describe('1. Binary Chunking, Hashing & Merkle Root Computation', () => {
    it('slices a 256 KB binary into 4 standard 64 KB chunks and computes distinct SHA-256 hashes', async () => {
      const totalSize = 256 * 1024; // 262,144 bytes = 4 x 64 KB
      const binary = generateSyntheticBinary(totalSize);

      const chunkSize = transferEngine.CHUNK_SIZE;
      expect(chunkSize).toBe(65536);

      const totalChunks = Math.ceil(totalSize / chunkSize);
      expect(totalChunks).toBe(4);

      const chunkHashes: string[] = [];
      const chunks: Uint8Array[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, totalSize);
        const chunk = binary.subarray(start, end);
        chunks.push(chunk);

        const hash = await transferEngine.computeChunkHash(chunk);
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
        chunkHashes.push(hash);
      }

      // Check all 4 chunk hashes are distinct
      const uniqueHashes = new Set(chunkHashes);
      expect(uniqueHashes.size).toBe(4);

      // Verify individual chunk verification
      const isValid0 = await transferEngine.verifyChunkChecksum(chunks[0], chunkHashes[0]);
      expect(isValid0).toBe(true);

      const isInvalid = await transferEngine.verifyChunkChecksum(chunks[0], chunkHashes[1]);
      expect(isInvalid).toBe(false);

      // Verify Merkle root computation
      const merkleRoot = await transferEngine.computeMerkleRoot(chunkHashes);
      expect(merkleRoot).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('2. Out-of-Order Chunk Ingestion & Assembly Resilience', () => {
    it('ingests chunks delivered in random out-of-order sequence and verifies final file integrity', async () => {
      const totalSize = 192 * 1024; // 3 x 64 KB chunks
      const binary = generateSyntheticBinary(totalSize);
      const chunkSize = transferEngine.CHUNK_SIZE;
      const totalChunks = 3;

      const chunks: Uint8Array[] = [];
      const chunkHashes: string[] = [];
      const chunkStates: ChunkVerificationState[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const slice = binary.subarray(i * chunkSize, (i + 1) * chunkSize);
        chunks.push(slice);
        const hash = await transferEngine.computeChunkHash(slice);
        chunkHashes.push(hash);
        chunkStates.push({
          index: i,
          hash,
          status: 'pending',
          size: slice.length,
          retries: 0,
        });
      }

      const txId = 'test-tx-ooo-order';
      const transfer: P2PTransfer = {
        id: txId,
        fileName: 'test-document.iso',
        fileSize: totalSize,
        mimeType: 'application/octet-stream',
        progress: 0,
        status: 'transferring',
        peerFP: '0x1234...5678',
        direction: 'receive',
        startedAt: Date.now(),
        bytesTransferred: 0,
      };

      transferEngine.activeTransfers.set(txId, transfer);
      transferEngine.transferChunks.set(txId, chunkStates);
      transferEngine.transferTelemetry.set(txId, {
        speedBps: 1024 * 1024,
        etaSeconds: 1,
        merkleRoot: 'test-root',
        chunksTotal: totalChunks,
        chunksVerified: 0,
        entropy: 7.9,
        protocol: 'WebRTC-DataChannel',
      });

      // Deliver chunks in deliberate reverse / out-of-order sequence: [2, 0, 1]
      const deliveryOrder = [2, 0, 1];
      for (const idx of deliveryOrder) {
        const result = await transferEngine.processIncomingChunk(
          txId,
          idx,
          chunks[idx],
          chunkHashes[idx]
        );
        expect(result.valid).toBe(true);
      }

      // Check all 3 chunks are verified
      const finalStates = transferEngine.transferChunks.get(txId);
      expect(finalStates?.every((c) => c.status === 'verified')).toBe(true);

      // Verify that the received buffers can assemble and match original binary
      const receivedBuffers = transferEngine.receivedChunkBuffers.get(txId);
      expect(receivedBuffers).toBeDefined();
      expect(receivedBuffers?.length).toBe(3);

      // Expected full hash
      const fullExpectedHash = await transferEngine.computeChunkHash(binary);
      const isAssembledValid = await transferEngine.verifyReceivedFile(receivedBuffers!, fullExpectedHash);
      expect(isAssembledValid).toBe(true);
    });
  });

  describe('3. Chunk Corruption Detection & NACK Handling', () => {
    it('detects corrupted chunk bytes, emits NACK, and updates state to failed', async () => {
      const chunkSize = 64 * 1024;
      const validChunk = generateSyntheticBinary(chunkSize);
      const validHash = await transferEngine.computeChunkHash(validChunk);

      const txId = 'test-tx-corruption';
      const chunkStates: ChunkVerificationState[] = [
        { index: 0, hash: validHash, status: 'pending', size: chunkSize, retries: 0 },
      ];
      transferEngine.transferChunks.set(txId, chunkStates);

      // Create corrupted chunk (flip single byte)
      const corruptedChunk = new Uint8Array(validChunk);
      corruptedChunk[42] ^= 0xff;

      const result = await transferEngine.processIncomingChunk(txId, 0, corruptedChunk, validHash);
      expect(result.valid).toBe(false);

      // Verify chunk state transitioned to failed or retransmitting
      const state = chunkStates[0];
      expect(['failed', 'retransmitting']).toContain(state.status);
      expect(state.retries).toBeGreaterThanOrEqual(1);

      // Verify NACK was queued in signaling client
      const nack = transferEngine.signalingClient.messageQueue.find((m) => m.type === 'chunk-nack');
      expect(nack).toBeDefined();
      expect(nack?.chunkIndex).toBe(0);
      expect(nack?.reason).toContain('SHA-256');
    });
  });

  describe('4. Selective Retransmission Recovery', () => {
    it('recovers corrupted chunks via retransmission with 100% data integrity', async () => {
      const chunkSize = 64 * 1024;
      const originalChunk = generateSyntheticBinary(chunkSize);
      const expectedHash = await transferEngine.computeChunkHash(originalChunk);

      const txId = 'test-tx-retransmit';
      const chunkStates: ChunkVerificationState[] = [
        { index: 0, hash: expectedHash, status: 'pending', size: chunkSize, retries: 0 },
      ];
      transferEngine.transferChunks.set(txId, chunkStates);
      transferEngine.transferTelemetry.set(txId, {
        speedBps: 1024,
        etaSeconds: 5,
        merkleRoot: 'test',
        chunksTotal: 1,
        chunksVerified: 0,
        entropy: 7.5,
        protocol: 'WebRTC-DataChannel',
      });

      // 1. Initial attempt fails due to corruption
      const corrupted = new Uint8Array(originalChunk);
      corrupted[0] = (corrupted[0] + 1) % 256;
      const failResult = await transferEngine.processIncomingChunk(txId, 0, corrupted, expectedHash);
      expect(failResult.valid).toBe(false);

      // 2. Peer retransmits the pristine original chunk
      const successResult = await transferEngine.processIncomingChunk(txId, 0, originalChunk, expectedHash);
      expect(successResult.valid).toBe(true);
      expect(chunkStates[0].status).toBe('verified');

      // 3. Verify assembled payload
      const buffers = transferEngine.receivedChunkBuffers.get(txId);
      const isComplete = await transferEngine.verifyReceivedFile(buffers!, expectedHash);
      expect(isComplete).toBe(true);
    });

    it('simulates multi-chunk drop and batch recovery via simulatePacketLossAndRecovery()', async () => {
      const txId = 'test-tx-batch-recovery';
      const chunkStates: ChunkVerificationState[] = [
        { index: 0, hash: 'hash0', status: 'verified', size: 65536 },
        { index: 1, hash: 'hash1', status: 'verified', size: 65536 },
        { index: 2, hash: 'hash2', status: 'verified', size: 65536 },
        { index: 3, hash: 'hash3', status: 'verified', size: 65536 },
      ];
      transferEngine.transferChunks.set(txId, chunkStates);
      transferEngine.transferTelemetry.set(txId, {
        speedBps: 50000,
        etaSeconds: 2,
        merkleRoot: 'root',
        chunksTotal: 4,
        chunksVerified: 4,
        entropy: 7.8,
        protocol: 'WebRTC-DataChannel',
      });

      // Simulate dropping chunks 1 and 3
      const { recovered, allVerified } = await transferEngine.simulatePacketLossAndRecovery(txId, [1, 3]);

      expect(recovered).toBe(2);
      expect(allVerified).toBe(true);
      expect(chunkStates[1].status).toBe('verified');
      expect(chunkStates[3].status).toBe('verified');
    });
  });

  describe('5. Adaptive Link Speed & Chunk Size Modulation', () => {
    it('adapts chunk size down to 16 KB under high packet loss (>5%)', () => {
      const size = transferEngine.calculateAdaptiveChunkSize(150, 6.2);
      expect(size).toBe(transferEngine.MIN_CHUNK_SIZE); // 16 KB
    });

    it('adapts chunk size down to 16 KB under severe latency (>250ms)', () => {
      const size = transferEngine.calculateAdaptiveChunkSize(320, 0.5);
      expect(size).toBe(transferEngine.MIN_CHUNK_SIZE); // 16 KB
    });

    it('adapts chunk size to 32 KB under moderate network conditions', () => {
      const size = transferEngine.calculateAdaptiveChunkSize(120, 1.5);
      expect(size).toBe(32768); // 32 KB
    });

    it('scales chunk size up to 128 KB for pristine local network links', () => {
      const size = transferEngine.calculateAdaptiveChunkSize(15, 0.0);
      expect(size).toBe(transferEngine.MAX_CHUNK_SIZE); // 128 KB
    });

    it('defaults to standard 64 KB chunk size under normal conditions', () => {
      const size = transferEngine.calculateAdaptiveChunkSize(60, 0.2);
      expect(size).toBe(transferEngine.CHUNK_SIZE); // 64 KB
    });
  });
});
