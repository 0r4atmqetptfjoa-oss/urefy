import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WebRTCFileTransfer,
  WebSocketSignalingClient,
  webrtcTransfer,
  type P2PTransfer,
  type TransferOffer,
  type ChunkVerificationState,
  type TransferTelemetry,
} from '../src/webrtc-transfer.js';
import { toastManager } from '../src/toast.js';
import { clientStore } from '../src/client-state.js';

describe('UREfy — WebRTC P2P File Transfer Engine', () => {
  let transferEngine: WebRTCFileTransfer;

  beforeEach(() => {
    vi.useFakeTimers();
    transferEngine = new WebRTCFileTransfer();
  });

  afterEach(() => {
    // Clear any running intervals
    transferEngine.activeTransfers.forEach((_, id) => {
      transferEngine.cancelTransfer(id);
    });
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // 1. Initialization & Seed Data
  // ---------------------------------------------------------------------------
  describe('1. Engine Initialization & Default State', () => {
    it('should initialize with CHUNK_SIZE = 64KB (65536 bytes)', () => {
      expect(transferEngine.CHUNK_SIZE).toBe(65536);
      expect(transferEngine.MIN_CHUNK_SIZE).toBe(16384);
      expect(transferEngine.MAX_CHUNK_SIZE).toBe(131072);
    });

    it('should seed demonstration transfers and pending offers on creation', () => {
      expect(transferEngine.activeTransfers.size).toBeGreaterThanOrEqual(2);
      expect(transferEngine.pendingOffers.size).toBeGreaterThanOrEqual(1);

      // Verify completed proving key transfer
      const completedTx = transferEngine.activeTransfers.get('p2p-tx-zkbn254-completed');
      expect(completedTx).toBeDefined();
      expect(completedTx?.status).toBe('complete');
      expect(completedTx?.progress).toBe(100);
      expect(completedTx?.direction).toBe('receive');

      // Verify active outgoing microkernel transfer
      const uploadingTx = transferEngine.activeTransfers.get('p2p-tx-kernel-uploading');
      expect(uploadingTx).toBeDefined();
      expect(uploadingTx?.status).toBe('transferring');
      expect(uploadingTx?.direction).toBe('send');

      // Verify pending incoming offer
      const pendingOffer = transferEngine.pendingOffers.get('offer-audit-epoch4912');
      expect(pendingOffer).toBeDefined();
      expect(pendingOffer?.fileName).toBe('epoch-4912-consensus-audit.json.gz');
    });

    it('should bind window global variable if window is defined', () => {
      if (typeof window !== 'undefined') {
        expect((window as any).aetherisWebRTCTransfer).toBeDefined();
      }
    });

    it('should manage event subscriptions and notifications properly', () => {
      let notifiedTransfer: P2PTransfer | null = null;
      const unsubscribe = transferEngine.subscribe((transfer) => {
        notifiedTransfer = transfer;
      });

      const tx = transferEngine.activeTransfers.get('p2p-tx-kernel-uploading')!;
      transferEngine.pauseTransfer(tx.id);

      expect(notifiedTransfer).not.toBeNull();
      expect(notifiedTransfer?.id).toBe(tx.id);
      expect(notifiedTransfer?.status).toBe('pending');

      // Test unsubscribe
      notifiedTransfer = null;
      unsubscribe();
      transferEngine.resumeTransfer(tx.id);
      expect(notifiedTransfer).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Cryptographic Hashing, Merkle Root & Verification
  // ---------------------------------------------------------------------------
  describe('2. Cryptography & Merkle Tree Verification', () => {
    it('should compute deterministic SHA-256 hash for Uint8Array chunks', async () => {
      const encoder = new TextEncoder();
      const testData = encoder.encode('aetheris-sovereign-p2p-chunk-data');
      const hash = await transferEngine.computeChunkHash(testData);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);

      // Empty buffer check
      const emptyHash = await transferEngine.computeChunkHash(new Uint8Array(0));
      expect(emptyHash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should compute full file SHA-256 checksum asynchronously', async () => {
      const fileContent = 'UREfy Decentralized Peer-to-Peer Protocol Verification Payload';
      const file = new File([fileContent], 'payload.txt', { type: 'text/plain' });

      const hash = await transferEngine.computeFileSHA256(file);
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should compute binary Merkle Root from sequential chunk hashes', async () => {
      // 1. Empty list
      const emptyRoot = await transferEngine.computeMerkleRoot([]);
      expect(emptyRoot).toBe('0000000000000000000000000000000000000000000000000000000000000000');

      // 2. Single item
      const singleHash = '4a1b8e90c3d5f2a1b7e6c8d0e4f2a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8fa';
      const singleRoot = await transferEngine.computeMerkleRoot([singleHash]);
      expect(singleRoot).toBe(singleHash);

      // 3. Power-of-two leaves (4 chunks)
      const fourHashes = [
        '1111111111111111111111111111111111111111111111111111111111111111',
        '2222222222222222222222222222222222222222222222222222222222222222',
        '3333333333333333333333333333333333333333333333333333333333333333',
        '4444444444444444444444444444444444444444444444444444444444444444',
      ];
      const merkleRoot4 = await transferEngine.computeMerkleRoot(fourHashes);
      expect(merkleRoot4).toBeDefined();
      expect(merkleRoot4.length).toBe(64);

      // 4. Odd number of leaves (3 chunks with duplicate right promotion)
      const threeHashes = fourHashes.slice(0, 3);
      const merkleRoot3 = await transferEngine.computeMerkleRoot(threeHashes);
      expect(merkleRoot3).toBeDefined();
      expect(merkleRoot3.length).toBe(64);
    });

    it('should verify assembled received chunks against expected SHA-256 checksum', async () => {
      const part1 = new TextEncoder().encode('Part 1: Sovereign Mesh, ');
      const part2 = new TextEncoder().encode('Part 2: Zero Knowledge Proof.');
      const assembled = new Uint8Array([...part1, ...part2]);
      const validHash = await transferEngine.computeChunkHash(assembled);

      const isValid = await transferEngine.verifyReceivedFile([part1, part2], validHash);
      expect(isValid).toBe(true);

      const isInvalid = await transferEngine.verifyReceivedFile(
        [part1, part2],
        '0000000000000000000000000000000000000000000000000000000000000000'
      );
      expect(isInvalid).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Transfer Lifecycle & Chunking Logic
  // ---------------------------------------------------------------------------
  describe('3. Transfer Initiation, Chunking & State Transitions', () => {
    it('should reject invalid or 0-byte file transfers', async () => {
      const emptyFile = new File([], 'empty.dat', { type: 'application/octet-stream' });
      await expect(
        transferEngine.initiateTransfer(emptyFile, '0xAAAA...1111')
      ).rejects.toThrow('Invalid file provided');
    });

    it('should split file into sequential 64KB chunks and calculate Merkle state', async () => {
      // 150 KB test buffer -> 3 chunks (64KB + 64KB + 22KB)
      const dataSize = 65536 * 2 + 22528;
      const buffer = new Uint8Array(dataSize);
      for (let i = 0; i < dataSize; i++) {
        buffer[i] = i % 256;
      }
      const testFile = new File([buffer], 'large-kernel.bin', { type: 'application/octet-stream' });

      const transferId = await transferEngine.initiateTransfer(testFile, '0x71A4...B902');
      expect(transferId).toBeDefined();

      const transfer = transferEngine.activeTransfers.get(transferId);
      expect(transfer).toBeDefined();
      expect(transfer?.fileName).toBe('large-kernel.bin');
      expect(transfer?.fileSize).toBe(dataSize);
      expect(transfer?.direction).toBe('send');
      expect(transfer?.status).toBe('transferring');
      expect(transfer?.sha256).toBeDefined();

      // Verify chunk matrix
      const matrixHtml = transferEngine.renderChunkMerkleMatrix(transferId);
      expect(matrixHtml).toContain('64KB Merkle Tree Pieces (3 chunks)');
    });

    it('should support receiveTransfer from incoming offer', async () => {
      const offerId = 'offer-audit-epoch4912';
      expect(transferEngine.pendingOffers.has(offerId)).toBe(true);

      await transferEngine.receiveTransfer(offerId, '0x71C4...2E90');

      expect(transferEngine.pendingOffers.has(offerId)).toBe(false);
      const incomingTx = transferEngine.activeTransfers.get(offerId);
      expect(incomingTx).toBeDefined();
      expect(incomingTx?.direction).toBe('receive');
      expect(incomingTx?.status).toBe('transferring');
    });

    it('should pause, resume, and cancel active transfers accurately', () => {
      const tx = transferEngine.activeTransfers.get('p2p-tx-kernel-uploading')!;

      // 1. Pause
      transferEngine.pauseTransfer(tx.id);
      expect(tx.status).toBe('pending');

      // 2. Resume
      transferEngine.resumeTransfer(tx.id);
      expect(tx.status).toBe('transferring');

      // 3. Cancel
      transferEngine.cancelTransfer(tx.id);
      expect(tx.status).toBe('error');
    });

    it('should clean up completed and error transfers with clearCompleted()', () => {
      expect(transferEngine.activeTransfers.size).toBeGreaterThan(0);

      transferEngine.clearCompleted();

      const remaining = Array.from(transferEngine.activeTransfers.values());
      const hasCompletedOrError = remaining.some(
        (t) => t.status === 'complete' || t.status === 'error'
      );
      expect(hasCompletedOrError).toBe(false);
    });

    it('should decline incoming offers and remove them from pending queue', () => {
      const offerId = 'offer-audit-epoch4912';
      expect(transferEngine.pendingOffers.has(offerId)).toBe(true);

      transferEngine.declineIncomingOffer(offerId);
      expect(transferEngine.pendingOffers.has(offerId)).toBe(false);
    });

    it('should accept incoming offers and start receiveTransfer', () => {
      const offerId = 'offer-audit-epoch4912';
      expect(transferEngine.pendingOffers.has(offerId)).toBe(true);

      transferEngine.acceptIncomingOffer(offerId);
      expect(transferEngine.pendingOffers.has(offerId)).toBe(false);
      expect(transferEngine.activeTransfers.has(offerId)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Bandwidth, ETA & Byte Formatters
  // ---------------------------------------------------------------------------
  describe('4. Formatting & Telemetry Calculations', () => {
    it('should format bytes into human-readable units (B, KB, MB, GB)', () => {
      expect(transferEngine.formatBytes(0)).toBe('0 B');
      expect(transferEngine.formatBytes(-50)).toBe('0 B');
      expect(transferEngine.formatBytes(512)).toBe('512 B');
      expect(transferEngine.formatBytes(1024)).toBe('1.0 KB');
      expect(transferEngine.formatBytes(1048576 * 4.5)).toBe('4.5 MB');
      expect(transferEngine.formatBytes(1073741824 * 2.1)).toBe('2.1 GB');
    });

    it('should format transmission speeds (KB/s, MB/s)', () => {
      expect(transferEngine.formatSpeed(0)).toBe('0 KB/s');
      expect(transferEngine.formatSpeed(512000)).toBe('500.0 KB/s');
      expect(transferEngine.formatSpeed(3500000)).toBe('3.34 MB/s');
    });

    it('should calculate accurate ETA for various transfer states', () => {
      const mockTx: P2PTransfer = {
        id: 'tx-mock',
        fileName: 'test.iso',
        fileSize: 10000000,
        mimeType: 'application/octet-stream',
        progress: 50,
        status: 'complete',
        peerFP: '0x1234',
        direction: 'send',
        startedAt: Date.now(),
        bytesTransferred: 10000000,
      };

      expect(transferEngine.calculateETA(mockTx)).toBe('Completed');

      mockTx.status = 'verifying';
      expect(transferEngine.calculateETA(mockTx)).toBe('Verifying SHA-256...');

      mockTx.status = 'connecting';
      expect(transferEngine.calculateETA(mockTx)).toBe('Connecting...');

      mockTx.status = 'pending';
      expect(transferEngine.calculateETA(mockTx)).toBe('Paused');

      mockTx.status = 'error';
      expect(transferEngine.calculateETA(mockTx)).toBe('Stalled');
    });

    it('should compute aggregated bandwidth and active stream counters', () => {
      const activeCount = transferEngine.getActiveCount();
      expect(activeCount).toBeGreaterThanOrEqual(1);

      const totalSpeed = transferEngine.getTotalSpeed();
      expect(totalSpeed).toBeGreaterThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Adaptive Chunking & SHA-256 Piece Verification
  // ---------------------------------------------------------------------------
  describe('5. Adaptive Chunking & Checksum Verification', () => {
    it('should adapt chunk size based on RTT and loss percentage', () => {
      // High loss / high RTT -> 16 KB
      expect(transferEngine.calculateAdaptiveChunkSize(300, 6.0)).toBe(16384);
      // Moderate conditions -> 32 KB
      expect(transferEngine.calculateAdaptiveChunkSize(120, 2.0)).toBe(32768);
      // Standard conditions -> 64 KB
      expect(transferEngine.calculateAdaptiveChunkSize(50, 0.5)).toBe(65536);
      // Pristine conditions -> 128 KB
      expect(transferEngine.calculateAdaptiveChunkSize(15, 0.0)).toBe(131072);
    });

    it('should process incoming chunks and verify checksum individually', async () => {
      const txId = 'p2p-tx-zkbn254-completed';
      const chunkData = new Uint8Array(65536);
      chunkData.fill(42);
      const expectedHash = await transferEngine.computeChunkHash(chunkData);

      const result = await transferEngine.processIncomingChunk(txId, 0, chunkData, expectedHash);
      expect(result.valid).toBe(true);
      expect(result.verifiedChunks).toBeGreaterThan(0);
    });

    it('should detect checksum corruption and request retransmission', async () => {
      const txId = 'p2p-tx-kernel-uploading';
      const chunkData = new Uint8Array(65536);
      chunkData.fill(1);

      // Pass intentionally mismatched hash
      const result = await transferEngine.processIncomingChunk(
        txId,
        0,
        chunkData,
        'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      );
      expect(result.valid).toBe(false);

      const chunks = transferEngine.transferChunks.get(txId);
      expect(chunks?.[0].status).toBe('retransmitting');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Packet Loss & Automatic Retransmission
  // ---------------------------------------------------------------------------
  describe('6. Packet Loss Simulation & Automatic Retransmission Recovery', () => {
    it('should recover failed chunks via retransmission', async () => {
      const txId = 'p2p-tx-kernel-uploading';
      const res = await transferEngine.simulatePacketLossAndRecovery(txId, [0, 1, 2]);

      expect(res.recovered).toBe(3);
      expect(res.allVerified).toBe(true);

      const telem = transferEngine.transferTelemetry.get(txId);
      expect(telem?.retransmitsTotal).toBeGreaterThanOrEqual(3);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. WebSocket Signaling Client with Exponential Backoff & Jitter
  // ---------------------------------------------------------------------------
  describe('7. WebSocket Signaling Client', () => {
    it('should calculate exponential backoff with full randomized jitter', () => {
      const signaling = new WebSocketSignalingClient();

      const delay0 = signaling.calculateBackoffWithJitter(0);
      expect(delay0).toBeGreaterThanOrEqual(500);
      expect(delay0).toBeLessThanOrEqual(1000);

      const delay3 = signaling.calculateBackoffWithJitter(3);
      expect(delay3).toBeGreaterThanOrEqual(2000);
      expect(delay3).toBeLessThanOrEqual(30000);
    });

    it('should queue signaling messages while disconnected and support subscribe', () => {
      const signaling = new WebSocketSignalingClient('ws://localhost:4000');
      let received = false;

      signaling.subscribe(() => {
        received = true;
      });

      const sent = signaling.send({
        type: 'chunk-ack',
        transferId: 'tx-1',
        senderFP: 'fp1',
        targetFP: 'fp2',
        chunkIndex: 0,
      });

      expect(sent).toBe(false); // Queued offline
    });
  });

  // ---------------------------------------------------------------------------
  // 8. UI Component Rendering
  // ---------------------------------------------------------------------------
  describe('8. HTML Rendering (renderTransferButton & renderTransferPanel)', () => {
    it('should render Send File button with peer fingerprint and SVG icon', () => {
      const buttonHtml = transferEngine.renderTransferButton('0x9E71...B412');

      expect(buttonHtml).toContain('btn-webrtc-send');
      expect(buttonHtml).toContain('0x9E71...B412');
      expect(buttonHtml).toContain('Send File');
      expect(buttonHtml).toContain('P2P');
    });

    it('should escape double quotes in peer fingerprints safely', () => {
      const buttonHtml = transferEngine.renderTransferButton('0x"MALICIOUS"...FP');
      expect(buttonHtml).not.toContain('0x"MALICIOUS"');
      expect(buttonHtml).toContain('0x&quot;MALICIOUS&quot;...FP');
    });

    it('should render Merkle piece matrix with status styling', () => {
      const matrixHtml = transferEngine.renderChunkMerkleMatrix('p2p-tx-zkbn254-completed');

      expect(matrixHtml).toContain('64KB Merkle Tree Pieces');
      expect(matrixHtml).toContain('100% Merkle Verified');
      expect(matrixHtml).toContain('bg-signal');
    });

    it('should render individual transfer cards with progress bar and SHA-256', () => {
      const tx = transferEngine.activeTransfers.get('p2p-tx-zkbn254-completed')!;
      const cardHtml = transferEngine.renderTransferCard(tx);

      expect(cardHtml).toContain('webrtc-transfer-card');
      expect(cardHtml).toContain('zk-circuit-plonk-bn254.zkey');
      expect(cardHtml).toContain('VERIFIED CLEAN (100% Merkle Match)');
      expect(cardHtml).toContain('Save File');
      expect(cardHtml).toContain('SHA-256:');
      expect(cardHtml).toContain(tx.sha256);
    });

    it('should render complete WebRTC P2P Transfer Panel dashboard', () => {
      const panelHtml = transferEngine.renderTransferPanel();

      expect(panelHtml).toContain('webrtc-transfer-panel');
      expect(panelHtml).toContain('WebRTC Direct Peer-to-Peer Transfer');
      expect(panelHtml).toContain('DTLS-SRTP / SCTP DataChannel');
      expect(panelHtml).toContain('P2P Bandwidth');
      expect(panelHtml).toContain('Active Streams');
      expect(panelHtml).toContain('Clear Done');
      expect(panelHtml).toContain('Pending Direct Transfer Requests');
      expect(panelHtml).toContain('epoch-4912-consensus-audit.json.gz');
      expect(panelHtml).toContain('zk-circuit-plonk-bn254.zkey');
    });

    it('should render empty queue message when no transfers exist', () => {
      transferEngine.activeTransfers.clear();
      transferEngine.pendingOffers.clear();

      const panelHtml = transferEngine.renderTransferPanel();
      expect(panelHtml).toContain('No WebRTC P2P Transfers in Queue');
    });

    it('should render floating status pill when active transfers exist', () => {
      const widgetHtml = transferEngine.renderFloatingWidget();

      expect(widgetHtml).toContain('id="webrtc-floating-transfer-widget"');
      expect(widgetHtml).toContain('WebRTC P2P Transfer');
      expect(widgetHtml).toContain('DTLS Direct');
    });

    it('should return empty string for floating widget when no active transfers exist', () => {
      transferEngine.activeTransfers.clear();
      const widgetHtml = transferEngine.renderFloatingWidget();
      expect(widgetHtml).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. File Download Trigger & Singleton Export
  // ---------------------------------------------------------------------------
  describe('9. File Download & Singleton Export', () => {
    it('should export singleton instance webrtcTransfer', () => {
      expect(webrtcTransfer).toBeInstanceOf(WebRTCFileTransfer);
      expect(webrtcTransfer.CHUNK_SIZE).toBe(65536);
    });

    it('should execute downloadReceivedFile without throwing on completed transfer', () => {
      // Mock createObjectURL and revokeObjectURL
      const origCreate = URL.createObjectURL;
      const origRevoke = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      URL.revokeObjectURL = vi.fn();

      expect(() => {
        transferEngine.downloadReceivedFile('p2p-tx-zkbn254-completed');
      }).not.toThrow();

      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Sovereign Cloudflare R2 Free-Tier Quota Shield & P2P Swarm Failover
  // ---------------------------------------------------------------------------
  describe('10. Sovereign Cloudflare R2 Quota Guard & P2P Swarm Failover', () => {
    it('should pre-flight intercept files > 25MB, prevent /api/storage upload, and fallback to P2P WebRTC Direct Swarm', async () => {
      // Create simulated 28 MB file
      const rawData = new Uint8Array(1024);
      rawData.fill(77);
      const largeFile = new File([rawData], 'sovereign-archive-full.tar.gz', { type: 'application/gzip' });
      Object.defineProperty(largeFile, 'size', { value: 28 * 1024 * 1024, configurable: true });

      const toastSpy = vi.spyOn(toastManager, 'show');
      let xhrConstructed = false;
      const originalXHR = globalThis.XMLHttpRequest;

      (globalThis as any).XMLHttpRequest = vi.fn().mockImplementation(() => {
        xhrConstructed = true;
        return {
          open: vi.fn(),
          setRequestHeader: vi.fn(),
          send: vi.fn(),
          upload: {},
        };
      });

      try {
        const progressUpdates: number[] = [];
        const result = await transferEngine.uploadToCloudflareR2(largeFile, (pct) => {
          progressUpdates.push(pct);
        });

        // 1. Zero data sent to R2 (/api/storage)
        expect(xhrConstructed).toBe(false);

        // 2. Friendly warning toast shown
        expect(toastSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'File (28.0MB) exceeds 25MB sovereign safe ceiling to preserve Cloudflare R2 free tier. Automatically transferring via zero-cost P2P WebRTC Direct Swarm.',
            type: 'warning',
          })
        );

        // 3. P2P Swarm descriptor returned
        expect(result.success).toBe(true);
        expect(result.storage).toBe('P2P-WebRTC-Direct-Swarm');
        expect(result.fileName).toBe('sovereign-archive-full.tar.gz');
        expect(result.byteSize).toBe(28 * 1024 * 1024);
        expect(result.r2Key).toBe('p2p-swarm/sovereign-archive-full.tar.gz');
      } finally {
        globalThis.XMLHttpRequest = originalXHR;
      }
    });

    it('should include X-File-SHA256 header and proceed with upload for files <= 25MB', async () => {
      const smallData = new TextEncoder().encode('sovereign microkernel payload');
      const smallFile = new File([smallData], 'payload.bin', { type: 'application/octet-stream' });

      let capturedHeaders: Record<string, string> = {};
      const originalXHR = globalThis.XMLHttpRequest;

      (globalThis as any).XMLHttpRequest = vi.fn().mockImplementation(function (this: any) {
        this.open = vi.fn();
        this.setRequestHeader = vi.fn((key: string, val: string) => {
          capturedHeaders[key] = val;
        });
        this.upload = { onprogress: null };
        this.status = 200;
        this.responseText = JSON.stringify({
          success: true,
          r2Key: 'vault/payload.bin',
          storage: 'Cloudflare-R2',
          fileName: 'payload.bin',
        });
        this.send = vi.fn(() => {
          if (this.onload) this.onload();
        });
        return this;
      });

      try {
        const result = await transferEngine.uploadToCloudflareR2(smallFile);

        expect(result.success).toBe(true);
        expect(result.storage).toBe('Cloudflare-R2');
        expect(capturedHeaders['X-File-SHA256']).toBeDefined();
        expect(capturedHeaders['X-File-SHA256'].length).toBe(64);
        expect(capturedHeaders['X-File-Name']).toBe(encodeURIComponent('payload.bin'));
      } finally {
        globalThis.XMLHttpRequest = originalXHR;
      }
    });

    it('should show HUD toast and failover to P2P WebRTC Swarm when server returns 413, 429, 507 or SOVEREIGN_R2_QUOTA_GUARD', async () => {
      const fileData = new TextEncoder().encode('quota test content');
      const file = new File([fileData], 'shield-test.dat', { type: 'application/octet-stream' });

      const toastSpy = vi.spyOn(toastManager, 'show');
      const originalXHR = globalThis.XMLHttpRequest;

      // Scenario 1: HTTP 507 with SOVEREIGN_R2_QUOTA_GUARD error message
      (globalThis as any).XMLHttpRequest = vi.fn().mockImplementation(function (this: any) {
        this.open = vi.fn();
        this.setRequestHeader = vi.fn();
        this.upload = { onprogress: null };
        this.status = 507;
        this.responseText = JSON.stringify({
          error: 'SOVEREIGN_R2_QUOTA_GUARD',
          message: 'Free-tier storage safety ceiling reached (8.0 GB cap).',
        });
        this.send = vi.fn(() => {
          if (this.onload) this.onload();
        });
        return this;
      });

      try {
        const result = await transferEngine.uploadToCloudflareR2(file);

        expect(toastSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'R2 free-tier quota shield active. Seamless failover to zero-cost P2P WebRTC Direct Swarm.',
            type: 'warning',
          })
        );
        expect(result.success).toBe(true);
        expect(result.storage).toBe('P2P-WebRTC-Direct-Swarm');
        expect(result.r2Key).toBe('p2p-swarm/shield-test.dat');
      } finally {
        globalThis.XMLHttpRequest = originalXHR;
      }
    });

    it('should failover to P2P WebRTC Swarm on XMLHttpRequest error handler when quota shield is triggered', async () => {
      const fileData = new TextEncoder().encode('error quota test content');
      const file = new File([fileData], 'shield-error-test.dat', { type: 'application/octet-stream' });

      const toastSpy = vi.spyOn(toastManager, 'show');
      const originalXHR = globalThis.XMLHttpRequest;

      // Scenario 2: Network error with status 429 (Rate / Ops Limit Exceeded)
      (globalThis as any).XMLHttpRequest = vi.fn().mockImplementation(function (this: any) {
        this.open = vi.fn();
        this.setRequestHeader = vi.fn();
        this.upload = { onprogress: null };
        this.status = 429;
        this.responseText = 'SOVEREIGN_R2_QUOTA_GUARD: Class A operation limit shield active';
        this.send = vi.fn(() => {
          if (this.onerror) this.onerror();
        });
        return this;
      });

      try {
        const result = await transferEngine.uploadToCloudflareR2(file);

        expect(toastSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'R2 free-tier quota shield active. Seamless failover to zero-cost P2P WebRTC Direct Swarm.',
            type: 'warning',
          })
        );
        expect(result.success).toBe(true);
        expect(result.storage).toBe('P2P-WebRTC-Direct-Swarm');
      } finally {
        globalThis.XMLHttpRequest = originalXHR;
      }
    });

    it('should support createTransferSession and sendBinaryDirectWebRTC methods', async () => {
      const testBuffer = new Uint8Array(131072); // 128KB -> 2 chunks
      testBuffer.fill(33);
      const testFile = new File([testBuffer], 'direct-mesh.iso');

      const transferId = await transferEngine.createTransferSession(testFile, '0xSwarm...Node1');
      expect(transferId).toBeDefined();
      expect(transferId).toMatch(/^p2p-tx-/);

      const activeTx = transferEngine.activeTransfers.get(transferId);
      expect(activeTx).toBeDefined();
      expect(activeTx?.fileName).toBe('direct-mesh.iso');
      expect(activeTx?.peerFP).toBe('0xSwarm...Node1');

      let progressCalled = false;
      const sendResult = await transferEngine.sendBinaryDirectWebRTC(testFile, () => {
        progressCalled = true;
      });

      expect(sendResult.success).toBe(true);
      expect(sendResult.storage).toBe('P2P-WebRTC-Direct-Swarm');
      expect(sendResult.fileName).toBe('direct-mesh.iso');
      expect(sendResult.sha256).toBeDefined();
    });

    it('should query /api/storage?action=quota via clientStore.checkR2Quota()', async () => {
      const mockQuota = {
        success: true,
        quota: {
          storageCapBytes: 8589934592, // 8.0 GB
          storageUsedBytes: 1073741824, // 1.0 GB
          classAOpsCap: 750000,
          classAOpsUsed: 5420,
          classBOpsCap: 7500000,
          classBOpsUsed: 89320,
          shieldActive: false,
        },
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockQuota,
      } as any);

      const result = await clientStore.checkR2Quota();

      expect(fetchSpy).toHaveBeenCalledWith('/api/storage?action=quota');
      expect(result).toEqual(mockQuota);
      expect(result.quota.storageCapBytes).toBe(8589934592);
      expect(result.quota.shieldActive).toBe(false);
    });
  });
});
