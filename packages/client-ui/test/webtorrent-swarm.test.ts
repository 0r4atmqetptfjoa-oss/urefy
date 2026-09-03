import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import {
  PIECE_LENGTH,
  WIRE_MSG_ID,
  SwarmTorrentMetadata,
  PieceState,
  WebTorrentSwarmEngine,
  webTorrentSwarm,
  chunkBinary,
  computeMerkleRoot,
  computeInfoHash,
  createBitfield,
  parseBitfield,
  encodeWireMessage,
  decodeWireMessage,
  selectRarestPieces,
  renderSwarmHeatmapHTML,
  formatBytes,
  PeerWireSession,
} from '../src/webtorrent-swarm.js';
import { serviceRegistry, SERVICES } from '../src/service-registry.js';

/**
 * In-memory Mock RTCDataChannel implementation for paired peer simulation.
 */
class MockRTCDataChannel {
  public readyState: RTCDataChannelState = 'open';
  public binaryType: BinaryType = 'arraybuffer';
  public onmessage: ((this: RTCDataChannel, ev: MessageEvent) => any) | null = null;
  public onopen: ((this: RTCDataChannel, ev: Event) => any) | null = null;
  public onclose: ((this: RTCDataChannel, ev: Event) => any) | null = null;
  public onerror: ((this: RTCDataChannel, ev: Event) => any) | null = null;
  public peerChannel?: MockRTCDataChannel;

  public sentPackets: any[] = [];

  constructor(readyState: RTCDataChannelState = 'open') {
    this.readyState = readyState;
  }

  public send(data: any): void {
    this.sentPackets.push(data);
    if (this.peerChannel && this.peerChannel.readyState === 'open') {
      let eventData: any;
      if (data instanceof Uint8Array) {
        eventData = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      } else {
        eventData = data;
      }
      const event = { data: eventData } as MessageEvent;
      queueMicrotask(() => {
        if (this.peerChannel?.onmessage) {
          this.peerChannel.onmessage.call(this.peerChannel as any, event);
        }
      });
    }
  }

  public close(): void {
    this.readyState = 'closed';
    if (this.onclose) {
      this.onclose.call(this as any, {} as Event);
    }
  }

  public simulateOpen(): void {
    this.readyState = 'open';
    if (this.onopen) {
      this.onopen.call(this as any, {} as Event);
    }
  }
}

function createMockChannelPair(): [MockRTCDataChannel, MockRTCDataChannel] {
  const channelA = new MockRTCDataChannel('open');
  const channelB = new MockRTCDataChannel('open');
  channelA.peerChannel = channelB;
  channelB.peerChannel = channelA;
  return [channelA, channelB];
}

describe('Aetheris WebTorrent Swarm Engine — P2P Knowledge Vault', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Piece Chunking, SHA-256 Verification & Merkle Root Consistency
  // ──────────────────────────────────────────────────────────────────────────
  describe('1. Piece Chunking & Merkle Cryptography', () => {
    it('should split 160KB binary buffer into 3 pieces of 64KB chunks', () => {
      const size = 160 * 1024; // 163,840 bytes
      const testBuffer = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        testBuffer[i] = (i * 17) % 256;
      }

      const chunked = chunkBinary(testBuffer);
      expect(chunked.pieceLength).toBe(65536);
      expect(chunked.length).toBe(size);
      expect(chunked.totalPieces).toBe(3); // 65536 + 65536 + 32768
      expect(chunked.pieceHashes).toHaveLength(3);

      // Verify SHA-256 of each slice matches the reported piece hash
      const piece0 = testBuffer.subarray(0, 65536);
      const piece1 = testBuffer.subarray(65536, 131072);
      const piece2 = testBuffer.subarray(131072, size);

      expect(chunked.pieceHashes[0]).toBe(bytesToHex(sha256(piece0)));
      expect(chunked.pieceHashes[1]).toBe(bytesToHex(sha256(piece1)));
      expect(chunked.pieceHashes[2]).toBe(bytesToHex(sha256(piece2)));
    });

    it('should calculate Merkle Root consistently for single piece', () => {
      const singleData = new TextEncoder().encode('Aetheris Sovereign Microkernel v2.4');
      const hash = bytesToHex(sha256(singleData));
      const merkleRoot = computeMerkleRoot([hash]);

      expect(merkleRoot).toBe(hash);
    });

    it('should calculate pairwise Merkle Root consistently for 4 pieces', () => {
      const h0 = bytesToHex(sha256(new Uint8Array([1])));
      const h1 = bytesToHex(sha256(new Uint8Array([2])));
      const h2 = bytesToHex(sha256(new Uint8Array([3])));
      const h3 = bytesToHex(sha256(new Uint8Array([4])));

      const root = computeMerkleRoot([h0, h1, h2, h3]);
      expect(root).toHaveLength(64);

      // Manual verification: level 1 = sha256(h0+h1), sha256(h2+h3)
      const encoder = new TextEncoder();
      const parent0 = bytesToHex(sha256(encoder.encode(h0 + h1)));
      const parent1 = bytesToHex(sha256(encoder.encode(h2 + h3)));
      const expectedRoot = bytesToHex(sha256(encoder.encode(parent0 + parent1)));

      expect(root).toBe(expectedRoot);

      // Re-computation must yield exact deterministic result
      const repeatRoot = computeMerkleRoot([h0, h1, h2, h3]);
      expect(repeatRoot).toBe(root);
    });

    it('should handle odd number of pieces in Merkle tree by promoting/duplicating', () => {
      const h0 = bytesToHex(sha256(new Uint8Array([10])));
      const h1 = bytesToHex(sha256(new Uint8Array([20])));
      const h2 = bytesToHex(sha256(new Uint8Array([30])));

      const root = computeMerkleRoot([h0, h1, h2]);
      expect(root).toHaveLength(64);

      const encoder = new TextEncoder();
      const parent0 = bytesToHex(sha256(encoder.encode(h0 + h1)));
      const parent1 = bytesToHex(sha256(encoder.encode(h2 + h2))); // paired with itself
      const expectedRoot = bytesToHex(sha256(encoder.encode(parent0 + parent1)));

      expect(root).toBe(expectedRoot);
    });

    it('should return 64-char zeroes for empty piece array', () => {
      const emptyRoot = computeMerkleRoot([]);
      expect(emptyRoot).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('should compute deterministic infoHash from metadata properties', () => {
      const name = 'vault-snapshot-epoch-89.tar.gz';
      const length = 131072;
      const pieceLength = PIECE_LENGTH;
      const merkleRoot = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0';

      const infoHash1 = computeInfoHash(name, length, pieceLength, merkleRoot);
      const infoHash2 = computeInfoHash(name, length, pieceLength, merkleRoot);

      expect(infoHash1).toBe(infoHash2);
      expect(infoHash1).toHaveLength(64);
    });

    it('should seed file into engine and return complete SwarmTorrentMetadata', async () => {
      const engine = new WebTorrentSwarmEngine();
      const payload = new Uint8Array(120000);
      for (let i = 0; i < payload.length; i++) payload[i] = i % 256;

      const metadata = await engine.seedFile(payload, 'genesis-state.bin');
      expect(metadata.name).toBe('genesis-state.bin');
      expect(metadata.length).toBe(120000);
      expect(metadata.pieceLength).toBe(65536);
      expect(metadata.totalPieces).toBe(2);
      expect(metadata.pieceHashes).toHaveLength(2);
      expect(metadata.merkleRoot).toHaveLength(64);
      expect(metadata.infoHash).toHaveLength(64);
      expect(metadata.createdAt).toBeGreaterThan(0);

      const session = engine.getSession(metadata.infoHash);
      expect(session).toBeDefined();
      expect(session?.isComplete).toBe(true);
      expect(session?.verifiedPieces).toBe(2);
      expect(session?.pieceStates).toEqual(['verified', 'verified']);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Bitfield Generation & Wire Packet Serialization
  // ──────────────────────────────────────────────────────────────────────────
  describe('2. Bitfield & BitTorrent Wire Protocol Packet Serialization', () => {
    it('should generate BEP 3 compliant bitfields accurately', () => {
      // 10 pieces, pieces 0, 2, 7, 9 are verified
      const bitfield = createBitfield(10, [0, 2, 7, 9]);
      expect(bitfield.length).toBe(2); // Math.ceil(10 / 8) = 2 bytes

      // Byte 0: bits 7, 5, 0 set = 128 + 32 + 1 = 161 (0xA1)
      expect(bitfield[0]).toBe(0b10100001);
      // Byte 1: bit 7 (which is piece 8) is 0, bit 6 (piece 9) is 1 = 64 (0x40)
      expect(bitfield[1]).toBe(0b01000000);

      const parsed = parseBitfield(bitfield, 10);
      expect(parsed[0]).toBe(true);
      expect(parsed[1]).toBe(false);
      expect(parsed[2]).toBe(true);
      expect(parsed[3]).toBe(false);
      expect(parsed[4]).toBe(false);
      expect(parsed[5]).toBe(false);
      expect(parsed[6]).toBe(false);
      expect(parsed[7]).toBe(true);
      expect(parsed[8]).toBe(false);
      expect(parsed[9]).toBe(true);
    });

    it('should encode and decode CHOKE, UNCHOKE, INTERESTED, NOT_INTERESTED wire packets', () => {
      const chokeBuf = encodeWireMessage({ type: 'CHOKE' });
      expect(chokeBuf.length).toBe(5);
      expect(decodeWireMessage(chokeBuf)).toEqual({ type: 'CHOKE' });

      const unchokeBuf = encodeWireMessage({ type: 'UNCHOKE' });
      expect(unchokeBuf.length).toBe(5);
      expect(decodeWireMessage(unchokeBuf)).toEqual({ type: 'UNCHOKE' });

      const interestedBuf = encodeWireMessage({ type: 'INTERESTED' });
      expect(interestedBuf.length).toBe(5);
      expect(decodeWireMessage(interestedBuf)).toEqual({ type: 'INTERESTED' });

      const notInterestedBuf = encodeWireMessage({ type: 'NOT_INTERESTED' });
      expect(notInterestedBuf.length).toBe(5);
      expect(decodeWireMessage(notInterestedBuf)).toEqual({ type: 'NOT_INTERESTED' });
    });

    it('should encode and decode HAVE message with uint32 piece index', () => {
      const haveBuf = encodeWireMessage({ type: 'HAVE', pieceIndex: 42 });
      expect(haveBuf.length).toBe(9); // 4 len + 1 id + 4 index
      const decoded = decodeWireMessage(haveBuf);
      expect(decoded).toEqual({ type: 'HAVE', pieceIndex: 42 });
    });

    it('should encode and decode BITFIELD message', () => {
      const bitfield = new Uint8Array([0xfa, 0x05]);
      const buf = encodeWireMessage({ type: 'BITFIELD', bitfield });
      expect(buf.length).toBe(4 + 1 + 2); // 7 bytes
      const decoded = decodeWireMessage(buf);
      expect(decoded.type).toBe('BITFIELD');
      if (decoded.type === 'BITFIELD') {
        expect(Array.from(decoded.bitfield)).toEqual([0xfa, 0x05]);
      }
    });

    it('should encode and decode REQUEST message', () => {
      const req = { type: 'REQUEST' as const, pieceIndex: 7, offset: 16384, length: 32768 };
      const buf = encodeWireMessage(req);
      expect(buf.length).toBe(17); // 4 len + 1 id + 4 index + 4 offset + 4 len
      const decoded = decodeWireMessage(buf);
      expect(decoded).toEqual(req);
    });

    it('should encode and decode PIECE message with raw binary payload', () => {
      const data = new Uint8Array([11, 22, 33, 44, 55, 66]);
      const piece = { type: 'PIECE' as const, pieceIndex: 3, offset: 64, data };
      const buf = encodeWireMessage(piece);
      expect(buf.length).toBe(4 + 1 + 4 + 4 + 6); // 19 bytes
      const decoded = decodeWireMessage(buf);
      expect(decoded.type).toBe('PIECE');
      if (decoded.type === 'PIECE') {
        expect(decoded.pieceIndex).toBe(3);
        expect(decoded.offset).toBe(64);
        expect(Array.from(decoded.data)).toEqual([11, 22, 33, 44, 55, 66]);
      }
    });

    it('should encode and decode CANCEL message', () => {
      const cancel = { type: 'CANCEL' as const, pieceIndex: 5, offset: 0, length: 16384 };
      const buf = encodeWireMessage(cancel);
      expect(buf.length).toBe(17);
      expect(decodeWireMessage(buf)).toEqual(cancel);
    });

    it('should encode and decode HANDSHAKE message', () => {
      const handshake = { type: 'HANDSHAKE' as const, infoHash: 'hash123', peerId: 'peer456' };
      const buf = encodeWireMessage(handshake);
      const decoded = decodeWireMessage(buf);
      expect(decoded).toEqual(handshake);
    });

    it('should reject malformed or truncated wire packets', () => {
      expect(() => decodeWireMessage(new Uint8Array([0, 0, 0]))).toThrow(/too short/);
      // Malformed ID
      expect(() => decodeWireMessage(new Uint8Array([0, 0, 0, 1, 99]))).toThrow(/Unknown wire message/);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Rarest-First Piece Selection Strategy
  // ──────────────────────────────────────────────────────────────────────────
  describe('3. Rarest-First Piece Selection Algorithm', () => {
    it('should select rarest pieces first across unchoked peers', () => {
      // 4 pieces total: 0, 1, 2, 3
      const pieceStates: PieceState[] = ['missing', 'missing', 'missing', 'missing'];

      const mockPeers = new Map<string, PeerWireSession>();

      // Peer A has piece 0, 1
      mockPeers.set('peer-A', {
        peerId: 'peer-A',
        channel: new MockRTCDataChannel() as any,
        infoHash: 'test',
        peerChoking: false,
        peerInterested: false,
        amChoking: false,
        amInterested: false,
        pieces: new Set([0, 1]),
        pendingRequests: new Set(),
        lastActive: Date.now(),
      });

      // Peer B has piece 1 (making piece 1 common)
      mockPeers.set('peer-B', {
        peerId: 'peer-B',
        channel: new MockRTCDataChannel() as any,
        infoHash: 'test',
        peerChoking: false,
        peerInterested: false,
        amChoking: false,
        amInterested: false,
        pieces: new Set([1]),
        pendingRequests: new Set(),
        lastActive: Date.now(),
      });

      // Peer C has piece 1, 2 (piece 2 is rare, piece 1 is held by all 3)
      mockPeers.set('peer-C', {
        peerId: 'peer-C',
        channel: new MockRTCDataChannel() as any,
        infoHash: 'test',
        peerChoking: false,
        peerInterested: false,
        amChoking: false,
        amInterested: false,
        pieces: new Set([1, 2]),
        pendingRequests: new Set(),
        lastActive: Date.now(),
      });

      // Availability:
      // Piece 0: 1 peer (Peer A) -> RAREST
      // Piece 2: 1 peer (Peer C) -> RAREST
      // Piece 1: 3 peers (Peer A, B, C) -> COMMON
      // Piece 3: 0 peers -> UNAVAILABLE

      const selections = selectRarestPieces(pieceStates, mockPeers, 4);

      // Selected pieces should be 0 and 2 first (rarity = 1)
      const selectedPieceIndices = selections.map((s) => s.pieceIndex);
      expect(selectedPieceIndices.slice(0, 2)).toEqual(expect.arrayContaining([0, 2]));
      expect(selectedPieceIndices).toContain(1); // Piece 1 is common, selected after
      expect(selectedPieceIndices).not.toContain(3); // Piece 3 has 0 availability
    });

    it('should ignore pieces already in downloading or verified states', () => {
      const pieceStates: PieceState[] = ['verified', 'downloading', 'missing'];
      const mockPeers = new Map<string, PeerWireSession>();
      mockPeers.set('peer-X', {
        peerId: 'peer-X',
        channel: new MockRTCDataChannel() as any,
        infoHash: 'test',
        peerChoking: false,
        peerInterested: false,
        amChoking: false,
        amInterested: false,
        pieces: new Set([0, 1, 2]),
        pendingRequests: new Set(),
        lastActive: Date.now(),
      });

      const selections = selectRarestPieces(pieceStates, mockPeers);
      expect(selections).toHaveLength(1);
      expect(selections[0].pieceIndex).toBe(2);
    });

    it('should not select from choking peers', () => {
      const pieceStates: PieceState[] = ['missing', 'missing'];
      const mockPeers = new Map<string, PeerWireSession>();
      mockPeers.set('peer-choked', {
        peerId: 'peer-choked',
        channel: new MockRTCDataChannel() as any,
        infoHash: 'test',
        peerChoking: true, // Choking!
        peerInterested: false,
        amChoking: false,
        amInterested: false,
        pieces: new Set([0, 1]),
        pendingRequests: new Set(),
        lastActive: Date.now(),
      });

      const selections = selectRarestPieces(pieceStates, mockPeers);
      expect(selections).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. P2P Piece Exchange Simulation (Seeder & Leecher)
  // ──────────────────────────────────────────────────────────────────────────
  describe('4. P2P Swarm Piece Exchange Simulation (Seeder <-> Leecher)', () => {
    it('should transfer multi-piece binary file between seeder and leecher over WebRTC channels', async () => {
      const seederEngine = new WebTorrentSwarmEngine();
      const leecherEngine = new WebTorrentSwarmEngine();

      // 130KB binary payload (3 pieces: 64KB, 64KB, 2KB)
      const fileSize = 130 * 1024;
      const originalPayload = new Uint8Array(fileSize);
      for (let i = 0; i < fileSize; i++) {
        originalPayload[i] = ((i * 37) + 13) % 256;
      }

      // 1. Seeder seeds the file
      const metadata = await seederEngine.seedFile(originalPayload, 'sovereign-kernel.bin');
      expect(metadata.totalPieces).toBe(3);

      // 2. Leecher begins download
      const downloadPromise = leecherEngine.downloadTorrent(metadata);

      // 3. Connect WebRTC data channels between seeder and leecher
      const [seederChannel, leecherChannel] = createMockChannelPair();
      seederEngine.connectPeer('leecher-node', seederChannel as any, metadata.infoHash);
      leecherEngine.connectPeer('seeder-node', leecherChannel as any, metadata.infoHash);

      // 4. Await complete P2P transfer
      const assembledFile = await downloadPromise;

      // 5. Verify byte integrity
      expect(assembledFile.length).toBe(fileSize);
      expect(assembledFile).toEqual(originalPayload);

      // 6. Verify leecher state & telemetry
      const leecherSession = leecherEngine.getSession(metadata.infoHash);
      expect(leecherSession?.isComplete).toBe(true);
      expect(leecherSession?.verifiedPieces).toBe(3);
      expect(leecherSession?.pieceStates).toEqual(['verified', 'verified', 'verified']);

      const telemetry = leecherEngine.getTelemetry(metadata.infoHash);
      expect(telemetry?.progress).toBe(100);
      expect(telemetry?.totalPieces).toBe(3);
      expect(telemetry?.verifiedPieces).toBe(3);
      expect(telemetry?.seeders).toBe(1);
    });

    it('should return immediately if torrent is already complete on the engine', async () => {
      const engine = new WebTorrentSwarmEngine();
      const payload = new Uint8Array([1, 2, 3, 4, 5]);
      const metadata = await engine.seedFile(payload, 'quick.bin');

      const result = await engine.downloadTorrent(metadata);
      expect(result).toEqual(payload);
    });

    it('should handle zero-length file downloads gracefully', async () => {
      const engine = new WebTorrentSwarmEngine();
      const emptyData = new Uint8Array(0);
      const metadata = await engine.seedFile(emptyData, 'empty.bin');
      expect(metadata.totalPieces).toBe(0);

      const downloaded = await engine.downloadTorrent(metadata);
      expect(downloaded.length).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Corrupted Piece Detection & Rejection
  // ──────────────────────────────────────────────────────────────────────────
  describe('5. Corrupted Piece Detection & Swarm Rejection', () => {
    it('should detect corrupted piece hash, reject the block, and preserve missing state', async () => {
      const engine = new WebTorrentSwarmEngine();
      const testData = new Uint8Array(65536); // Exactly 1 piece
      testData.fill(42);

      const metadata: SwarmTorrentMetadata = {
        infoHash: 'test-hash-corruption-check',
        name: 'secure-vault.bin',
        pieceLength: 65536,
        totalPieces: 1,
        length: 65536,
        pieceHashes: [bytesToHex(sha256(testData))],
        merkleRoot: bytesToHex(sha256(testData)),
        createdAt: Date.now(),
      };

      // Start download
      engine.downloadTorrent(metadata);
      const session = engine.getSession(metadata.infoHash)!;
      expect(session.pieceStates[0]).toBe('missing');

      // Mock peer connects
      const [localChannel, remoteChannel] = createMockChannelPair();
      engine.connectPeer('peer-corrupted', localChannel as any, metadata.infoHash);

      // Malicious peer transmits corrupted piece (tampered byte)
      const corruptedData = new Uint8Array(65536);
      corruptedData.fill(99); // Corrupted!

      const corruptedPieceMsg = encodeWireMessage({
        type: 'PIECE',
        pieceIndex: 0,
        offset: 0,
        data: corruptedData,
      });

      // Send to local channel
      localChannel.onmessage?.({ data: corruptedPieceMsg.buffer } as MessageEvent);

      // Allow event loop processing
      await new Promise((r) => setTimeout(r, 10));

      // Piece must NOT be verified!
      expect(session.pieceStates[0]).toBe('missing');
      expect(session.verifiedPieces).toBe(0);
      expect(session.corruptedPiecesCount).toBe(1);
      expect(session.isComplete).toBe(false);

      // Now send genuine piece
      const authenticPieceMsg = encodeWireMessage({
        type: 'PIECE',
        pieceIndex: 0,
        offset: 0,
        data: testData,
      });

      localChannel.onmessage?.({ data: authenticPieceMsg.buffer } as MessageEvent);
      await new Promise((r) => setTimeout(r, 10));

      // Must now be verified
      expect(session.pieceStates[0]).toBe('verified');
      expect(session.verifiedPieces).toBe(1);
      expect(session.isComplete).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Interactive Heatmap UI Component Rendering
  // ──────────────────────────────────────────────────────────────────────────
  describe('6. Interactive Swarm Heatmap HTML Rendering', () => {
    it('should render heatmap with emerald, cyan, and slate pixel states', () => {
      const metadata: SwarmTorrentMetadata = {
        infoHash: '0123456789abcdef0123456789abcdef01234567',
        name: 'knowledge-vault-epoch-99.bin',
        pieceLength: 65536,
        totalPieces: 4,
        length: 262144,
        pieceHashes: ['h0', 'h1', 'h2', 'h3'],
        merkleRoot: 'merkle12345678901234567890123456789012',
        createdAt: Date.now(),
      };

      const states: PieceState[] = ['verified', 'downloading', 'missing', 'verified'];
      const html = renderSwarmHeatmapHTML(metadata, states, {
        totalPeers: 5,
        seeders: 2,
        leechers: 3,
        downloadSpeedBps: 1048576, // 1 MB/s
        uploadSpeedBps: 524288,    // 512 KB/s
      });

      // Check piece color styling
      expect(html).toContain('bg-emerald-500'); // verified
      expect(html).toContain('bg-cyan-500');    // downloading
      expect(html).toContain('bg-slate-800');   // needed / missing
      expect(html).toContain('animate-pulse');  // active pulse on cyan

      // Check badges
      expect(html).toContain('Zero-Server Bandwidth (100% P2P Swarm)');
      expect(html).toContain('Peers in Swarm');
      expect(html).toContain('5'); // total peers

      // Check torrent info
      expect(html).toContain('knowledge-vault-epoch-99.bin');
      expect(html).toContain('50% Verified'); // 2/4 = 50%
      expect(html).toContain('2/4 Pieces');
      expect(html).toContain('256.0 KB');
      expect(html).toContain('Seeders: <strong class="text-emerald-400">2</strong>');
      expect(html).toContain('Leechers: <strong class="text-cyan-400">3</strong>');
    });

    it('should escape malicious HTML in file names to prevent XSS', () => {
      const maliciousMetadata: SwarmTorrentMetadata = {
        infoHash: 'xss-safe-hash',
        name: '<script>alert("pwned")</script>.bin',
        pieceLength: 65536,
        totalPieces: 1,
        length: 65536,
        pieceHashes: ['h0'],
        merkleRoot: 'm0',
        createdAt: Date.now(),
      };

      const html = renderSwarmHeatmapHTML(maliciousMetadata, ['verified']);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;.bin');
    });

    it('should format bytes helper properly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(1073741824)).toBe('1.0 GB');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Service Registry & IoC Integration
  // ──────────────────────────────────────────────────────────────────────────
  describe('7. Service Registry & IoC Container Integration', () => {
    it('should resolve WebTorrentSwarm singleton from serviceRegistry', () => {
      expect(serviceRegistry.has(SERVICES.WebTorrentSwarm)).toBe(true);
      const resolved = serviceRegistry.resolve(SERVICES.WebTorrentSwarm);
      expect(resolved).toBeDefined();
      expect(resolved).toBe(webTorrentSwarm);
      expect(typeof (resolved as any).seedFile).toBe('function');
      expect(typeof (resolved as any).downloadTorrent).toBe('function');
      expect(typeof (resolved as any).connectPeer).toBe('function');
      expect(typeof (resolved as any).renderSwarmHeatmapHTML).toBe('function');
    });

    it('should expose global webTorrentSwarm in browser context if window is defined', () => {
      if (typeof window !== 'undefined') {
        expect((window as any).webTorrentSwarm).toBeDefined();
        expect((window as any).webTorrentSwarm).toBe(webTorrentSwarm);
      }
    });
  });
});
