/**
 * UREfy HYBRID SUITE — BROWSER WEBTORRENT / BITTORRENT P2P SWARM ENGINE
 * Item 5: Decentralized P2P distribution of Knowledge Vault files over WebRTC Data Channels.
 * 
 * Features:
 * - 64KB piece chunking with SHA-256 verification and deterministic Merkle root trees.
 * - BitTorrent wire protocol emulation (CHOKE, UNCHOKE, INTERESTED, NOT_INTERESTED, HAVE, BITFIELD, REQUEST, PIECE, CANCEL).
 * - Rarest-first piece selection strategy for balanced swarm distribution.
 * - Full telemetry tracking (seeders, leechers, speeds, progress, verified pieces, piece states).
 * - Responsive pixel heatmap UI component with zero-server bandwidth badge.
 */

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { serviceRegistry, SERVICES } from './service-registry.js';

// ── Constants & Configuration ────────────────────────────────────────────────────────

export const PIECE_LENGTH = 64 * 1024; // 64 KB (65,536 bytes)

export type PieceState = 'missing' | 'downloading' | 'verified';

export interface SwarmTorrentMetadata {
  infoHash: string;
  name: string;
  pieceLength: number;
  totalPieces: number;
  length: number;
  pieceHashes: string[];
  merkleRoot: string;
  createdAt: number;
}

export interface SwarmTelemetry {
  infoHash: string;
  name: string;
  seeders: number;
  leechers: number;
  totalPeers: number;
  downloadSpeedBps: number;
  uploadSpeedBps: number;
  progress: number; // 0 - 100
  verifiedPieces: number;
  totalPieces: number;
  pieceStates: PieceState[];
  totalDownloadedBytes: number;
  totalUploadedBytes: number;
  merkleRoot: string;
}

// ── BitTorrent Wire Protocol Constants & Types ───────────────────────────────────────

export const WIRE_MSG_ID = {
  CHOKE: 0,
  UNCHOKE: 1,
  INTERESTED: 2,
  NOT_INTERESTED: 3,
  HAVE: 4,
  BITFIELD: 5,
  REQUEST: 6,
  PIECE: 7,
  CANCEL: 8,
  HANDSHAKE: 20,
} as const;

export type WireMessageType =
  | 'CHOKE'
  | 'UNCHOKE'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'HAVE'
  | 'BITFIELD'
  | 'REQUEST'
  | 'PIECE'
  | 'CANCEL'
  | 'HANDSHAKE';

export interface ChokeMessage {
  type: 'CHOKE';
}

export interface UnchokeMessage {
  type: 'UNCHOKE';
}

export interface InterestedMessage {
  type: 'INTERESTED';
}

export interface NotInterestedMessage {
  type: 'NOT_INTERESTED';
}

export interface HaveMessage {
  type: 'HAVE';
  pieceIndex: number;
}

export interface BitfieldMessage {
  type: 'BITFIELD';
  bitfield: Uint8Array;
}

export interface RequestMessage {
  type: 'REQUEST';
  pieceIndex: number;
  offset: number;
  length: number;
}

export interface PieceMessage {
  type: 'PIECE';
  pieceIndex: number;
  offset: number;
  data: Uint8Array;
}

export interface CancelMessage {
  type: 'CANCEL';
  pieceIndex: number;
  offset: number;
  length: number;
}

export interface HandshakeMessage {
  type: 'HANDSHAKE';
  infoHash: string;
  peerId: string;
}

export type WireMessage =
  | ChokeMessage
  | UnchokeMessage
  | InterestedMessage
  | NotInterestedMessage
  | HaveMessage
  | BitfieldMessage
  | RequestMessage
  | PieceMessage
  | CancelMessage
  | HandshakeMessage;

// ── Cryptographic Hashing & Merkle Root Helpers ─────────────────────────────────────

/**
 * Computes pairwise Merkle tree root hash from an array of SHA-256 piece hashes.
 */
export function computeMerkleRoot(pieceHashes: string[]): string {
  if (!pieceHashes || pieceHashes.length === 0) {
    return '0000000000000000000000000000000000000000000000000000000000000000';
  }
  let currentLevel = [...pieceHashes];
  const encoder = new TextEncoder();

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const combined = encoder.encode(left + right);
      const parentHash = bytesToHex(sha256(combined));
      nextLevel.push(parentHash);
    }
    currentLevel = nextLevel;
  }
  return currentLevel[0];
}

/**
 * Computes deterministic infoHash from torrent parameters.
 */
export function computeInfoHash(
  name: string,
  length: number,
  pieceLength: number,
  merkleRoot: string
): string {
  const manifestString = `${name}:${length}:${pieceLength}:${merkleRoot}`;
  return bytesToHex(sha256(new TextEncoder().encode(manifestString)));
}

/**
 * Divvies up a binary file buffer into 64KB pieces and calculates piece hashes and Merkle root.
 */
export function chunkBinary(data: Uint8Array | ArrayBuffer): {
  pieceLength: number;
  totalPieces: number;
  length: number;
  pieceHashes: string[];
  merkleRoot: string;
} {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const length = bytes.length;
  const pieceLength = PIECE_LENGTH;
  const totalPieces = length === 0 ? 0 : Math.ceil(length / pieceLength);
  const pieceHashes: string[] = [];

  for (let i = 0; i < totalPieces; i++) {
    const start = i * pieceLength;
    const end = Math.min(start + pieceLength, length);
    const pieceBytes = bytes.subarray(start, end);
    const hash = bytesToHex(sha256(pieceBytes));
    pieceHashes.push(hash);
  }

  const merkleRoot = computeMerkleRoot(pieceHashes);

  return {
    pieceLength,
    totalPieces,
    length,
    pieceHashes,
    merkleRoot,
  };
}

// ── Bitfield Encoding & Decoding ─────────────────────────────────────────────────────

/**
 * Creates a compact BEP 3 compliant bitfield byte array.
 */
export function createBitfield(totalPieces: number, verifiedIndices: Iterable<number>): Uint8Array {
  const byteCount = Math.ceil(totalPieces / 8);
  const bitfield = new Uint8Array(byteCount);
  for (const idx of verifiedIndices) {
    if (idx >= 0 && idx < totalPieces) {
      const byteIdx = Math.floor(idx / 8);
      const bitOffset = 7 - (idx % 8);
      bitfield[byteIdx] |= 1 << bitOffset;
    }
  }
  return bitfield;
}

/**
 * Parses a BEP 3 bitfield byte array into a boolean array of piece availability.
 */
export function parseBitfield(bitfield: Uint8Array, totalPieces: number): boolean[] {
  const result: boolean[] = new Array(totalPieces);
  for (let i = 0; i < totalPieces; i++) {
    const byteIdx = Math.floor(i / 8);
    const bitOffset = 7 - (i % 8);
    if (byteIdx < bitfield.length) {
      result[i] = (bitfield[byteIdx] & (1 << bitOffset)) !== 0;
    } else {
      result[i] = false;
    }
  }
  return result;
}

// ── BitTorrent Wire Protocol Packet Serialization ───────────────────────────────────

/**
 * Encodes a structured WireMessage into binary wire format.
 * Format: <4 bytes uint32 length prefix><1 byte msgId>[<payload>]
 */
export function encodeWireMessage(msg: WireMessage): Uint8Array {
  switch (msg.type) {
    case 'CHOKE': {
      const buf = new Uint8Array(5);
      const view = new DataView(buf.buffer);
      view.setUint32(0, 1, false);
      buf[4] = WIRE_MSG_ID.CHOKE;
      return buf;
    }
    case 'UNCHOKE': {
      const buf = new Uint8Array(5);
      const view = new DataView(buf.buffer);
      view.setUint32(0, 1, false);
      buf[4] = WIRE_MSG_ID.UNCHOKE;
      return buf;
    }
    case 'INTERESTED': {
      const buf = new Uint8Array(5);
      const view = new DataView(buf.buffer);
      view.setUint32(0, 1, false);
      buf[4] = WIRE_MSG_ID.INTERESTED;
      return buf;
    }
    case 'NOT_INTERESTED': {
      const buf = new Uint8Array(5);
      const view = new DataView(buf.buffer);
      view.setUint32(0, 1, false);
      buf[4] = WIRE_MSG_ID.NOT_INTERESTED;
      return buf;
    }
    case 'HAVE': {
      const buf = new Uint8Array(9);
      const view = new DataView(buf.buffer);
      view.setUint32(0, 5, false); // 1 byte ID + 4 bytes pieceIndex
      buf[4] = WIRE_MSG_ID.HAVE;
      view.setUint32(5, msg.pieceIndex, false);
      return buf;
    }
    case 'BITFIELD': {
      const payloadLen = 1 + msg.bitfield.length;
      const buf = new Uint8Array(4 + payloadLen);
      const view = new DataView(buf.buffer);
      view.setUint32(0, payloadLen, false);
      buf[4] = WIRE_MSG_ID.BITFIELD;
      buf.set(msg.bitfield, 5);
      return buf;
    }
    case 'REQUEST': {
      const buf = new Uint8Array(17);
      const view = new DataView(buf.buffer);
      view.setUint32(0, 13, false); // 1 + 4 + 4 + 4
      buf[4] = WIRE_MSG_ID.REQUEST;
      view.setUint32(5, msg.pieceIndex, false);
      view.setUint32(9, msg.offset, false);
      view.setUint32(13, msg.length, false);
      return buf;
    }
    case 'PIECE': {
      const payloadLen = 1 + 4 + 4 + msg.data.length;
      const buf = new Uint8Array(4 + payloadLen);
      const view = new DataView(buf.buffer);
      view.setUint32(0, payloadLen, false);
      buf[4] = WIRE_MSG_ID.PIECE;
      view.setUint32(5, msg.pieceIndex, false);
      view.setUint32(9, msg.offset, false);
      buf.set(msg.data, 13);
      return buf;
    }
    case 'CANCEL': {
      const buf = new Uint8Array(17);
      const view = new DataView(buf.buffer);
      view.setUint32(0, 13, false);
      buf[4] = WIRE_MSG_ID.CANCEL;
      view.setUint32(5, msg.pieceIndex, false);
      view.setUint32(9, msg.offset, false);
      view.setUint32(13, msg.length, false);
      return buf;
    }
    case 'HANDSHAKE': {
      const jsonBytes = new TextEncoder().encode(
        JSON.stringify({ infoHash: msg.infoHash, peerId: msg.peerId })
      );
      const payloadLen = 1 + jsonBytes.length;
      const buf = new Uint8Array(4 + payloadLen);
      const view = new DataView(buf.buffer);
      view.setUint32(0, payloadLen, false);
      buf[4] = WIRE_MSG_ID.HANDSHAKE;
      buf.set(jsonBytes, 5);
      return buf;
    }
    default:
      throw new Error(`Unsupported wire message: ${(msg as any)?.type}`);
  }
}

/**
 * Decodes a binary wire buffer into a structured WireMessage.
 */
export function decodeWireMessage(input: Uint8Array | ArrayBuffer): WireMessage {
  const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (buf.length < 5) {
    throw new Error(`Wire message packet too short (${buf.length} bytes, minimum 5 required)`);
  }
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const lengthPrefix = view.getUint32(0, false);
  const msgId = buf[4];

  switch (msgId) {
    case WIRE_MSG_ID.CHOKE:
      return { type: 'CHOKE' };
    case WIRE_MSG_ID.UNCHOKE:
      return { type: 'UNCHOKE' };
    case WIRE_MSG_ID.INTERESTED:
      return { type: 'INTERESTED' };
    case WIRE_MSG_ID.NOT_INTERESTED:
      return { type: 'NOT_INTERESTED' };
    case WIRE_MSG_ID.HAVE: {
      if (buf.length < 9) throw new Error('Truncated HAVE wire message');
      const pieceIndex = view.getUint32(5, false);
      return { type: 'HAVE', pieceIndex };
    }
    case WIRE_MSG_ID.BITFIELD: {
      const bitfield = buf.subarray(5, 4 + lengthPrefix);
      return { type: 'BITFIELD', bitfield: new Uint8Array(bitfield) };
    }
    case WIRE_MSG_ID.REQUEST: {
      if (buf.length < 17) throw new Error('Truncated REQUEST wire message');
      const pieceIndex = view.getUint32(5, false);
      const offset = view.getUint32(9, false);
      const length = view.getUint32(13, false);
      return { type: 'REQUEST', pieceIndex, offset, length };
    }
    case WIRE_MSG_ID.PIECE: {
      if (buf.length < 13) throw new Error('Truncated PIECE wire message');
      const pieceIndex = view.getUint32(5, false);
      const offset = view.getUint32(9, false);
      const data = buf.subarray(13, 4 + lengthPrefix);
      return { type: 'PIECE', pieceIndex, offset, data: new Uint8Array(data) };
    }
    case WIRE_MSG_ID.CANCEL: {
      if (buf.length < 17) throw new Error('Truncated CANCEL wire message');
      const pieceIndex = view.getUint32(5, false);
      const offset = view.getUint32(9, false);
      const length = view.getUint32(13, false);
      return { type: 'CANCEL', pieceIndex, offset, length };
    }
    case WIRE_MSG_ID.HANDSHAKE: {
      const jsonBytes = buf.subarray(5, 4 + lengthPrefix);
      const jsonStr = new TextDecoder().decode(jsonBytes);
      const parsed = JSON.parse(jsonStr);
      return { type: 'HANDSHAKE', infoHash: parsed.infoHash, peerId: parsed.peerId };
    }
    default:
      throw new Error(`Unknown wire message ID: ${msgId}`);
  }
}

// ── Rarest-First Strategy Selection ──────────────────────────────────────────────────

export interface PeerWireSession {
  peerId: string;
  channel: RTCDataChannel;
  infoHash: string;
  peerChoking: boolean;
  peerInterested: boolean;
  amChoking: boolean;
  amInterested: boolean;
  pieces: Set<number>;
  pendingRequests: Set<number>;
  lastActive: number;
}

/**
 * Selects missing pieces ordered by rarity (lowest swarm availability first).
 */
export function selectRarestPieces(
  pieceStates: PieceState[],
  peers: Map<string, PeerWireSession>,
  maxConcurrent = 10
): Array<{ pieceIndex: number; targetPeerId: string; pieceLength: number }> {
  const availabilityMap = new Map<number, string[]>();

  for (let i = 0; i < pieceStates.length; i++) {
    if (pieceStates[i] !== 'missing') continue;

    const availablePeers: string[] = [];
    for (const [peerId, peer] of peers.entries()) {
      if (!peer.peerChoking && peer.pieces.has(i) && peer.pendingRequests.size < 5) {
        availablePeers.push(peerId);
      }
    }

    if (availablePeers.length > 0) {
      availabilityMap.set(i, availablePeers);
    }
  }

  if (availabilityMap.size === 0) return [];

  // Sort pieces by rarest first (fewest peers that have it)
  const ranked = Array.from(availabilityMap.entries()).sort((a, b) => {
    const diff = a[1].length - b[1].length;
    if (diff !== 0) return diff;
    return a[0] - b[0];
  });

  const selections: Array<{ pieceIndex: number; targetPeerId: string; pieceLength: number }> = [];
  const assignedPeers = new Set<string>();

  for (const [pieceIndex, availablePeers] of ranked) {
    if (selections.length >= maxConcurrent) break;

    const bestPeer = availablePeers
      .filter((p) => !assignedPeers.has(p) || availablePeers.length === 1)
      .sort(
        (p1, p2) =>
          (peers.get(p1)?.pendingRequests.size || 0) -
          (peers.get(p2)?.pendingRequests.size || 0)
      )[0];

    if (bestPeer) {
      selections.push({ pieceIndex, targetPeerId: bestPeer, pieceLength: PIECE_LENGTH });
      assignedPeers.add(bestPeer);
    }
  }

  return selections;
}

// ── Torrent Session Representation ───────────────────────────────────────────────────

export class TorrentSession {
  public metadata: SwarmTorrentMetadata;
  public pieceStates: PieceState[];
  public receivedPieces: Map<number, Uint8Array> = new Map();
  public fullBuffer?: Uint8Array;
  public verifiedPieces = 0;
  public peers: Map<string, PeerWireSession> = new Map();
  public isComplete = false;

  public totalDownloadedBytes = 0;
  public totalUploadedBytes = 0;
  public downloadSpeedBps = 0;
  public uploadSpeedBps = 0;
  public corruptedPiecesCount = 0;

  private lastSpeedCheckTime = Date.now();
  private bytesDownloadedSinceCheck = 0;
  private bytesUploadedSinceCheck = 0;

  public downloadResolve?: (data: Uint8Array) => void;
  public downloadReject?: (err: any) => void;
  public downloadPromise?: Promise<Uint8Array>;

  public telemetryListeners = new Set<(t: SwarmTelemetry) => void>();

  constructor(metadata: SwarmTorrentMetadata, isSeeder = false, fullBuffer?: Uint8Array) {
    this.metadata = metadata;
    this.pieceStates = new Array(metadata.totalPieces).fill(isSeeder ? 'verified' : 'missing');
    this.verifiedPieces = isSeeder ? metadata.totalPieces : 0;
    this.isComplete = isSeeder;
    this.fullBuffer = fullBuffer;

    if (isSeeder && fullBuffer) {
      for (let i = 0; i < metadata.totalPieces; i++) {
        const start = i * metadata.pieceLength;
        const end = Math.min(start + metadata.pieceLength, fullBuffer.length);
        this.receivedPieces.set(i, fullBuffer.subarray(start, end));
      }
    }
  }

  public recordDownloadedBytes(bytes: number): void {
    this.totalDownloadedBytes += bytes;
    this.bytesDownloadedSinceCheck += bytes;
    this.updateSpeeds();
  }

  public recordUploadedBytes(bytes: number): void {
    this.totalUploadedBytes += bytes;
    this.bytesUploadedSinceCheck += bytes;
    this.updateSpeeds();
  }

  public updateSpeeds(): void {
    const now = Date.now();
    const elapsedSeconds = Math.max(0.001, (now - this.lastSpeedCheckTime) / 1000);
    if (elapsedSeconds >= 0.5) {
      this.downloadSpeedBps = Math.round(this.bytesDownloadedSinceCheck / elapsedSeconds);
      this.uploadSpeedBps = Math.round(this.bytesUploadedSinceCheck / elapsedSeconds);
      this.bytesDownloadedSinceCheck = 0;
      this.bytesUploadedSinceCheck = 0;
      this.lastSpeedCheckTime = now;
    }
  }

  public getTelemetry(): SwarmTelemetry {
    this.updateSpeeds();
    let seeders = 0;
    let leechers = 0;

    for (const peer of this.peers.values()) {
      if (peer.pieces.size === this.metadata.totalPieces && this.metadata.totalPieces > 0) {
        seeders++;
      } else {
        leechers++;
      }
    }

    const progress =
      this.metadata.totalPieces === 0
        ? 100
        : Math.round((this.verifiedPieces / this.metadata.totalPieces) * 100);

    return {
      infoHash: this.metadata.infoHash,
      name: this.metadata.name,
      seeders,
      leechers,
      totalPeers: this.peers.size,
      downloadSpeedBps: this.downloadSpeedBps,
      uploadSpeedBps: this.uploadSpeedBps,
      progress,
      verifiedPieces: this.verifiedPieces,
      totalPieces: this.metadata.totalPieces,
      pieceStates: [...this.pieceStates],
      totalDownloadedBytes: this.totalDownloadedBytes,
      totalUploadedBytes: this.totalUploadedBytes,
      merkleRoot: this.metadata.merkleRoot,
    };
  }

  public emitTelemetry(): void {
    const t = this.getTelemetry();
    for (const listener of this.telemetryListeners) {
      try {
        listener(t);
      } catch (err) {
        console.error('[WebTorrentSwarm] Telemetry listener error:', err);
      }
    }
  }
}

// ── WebTorrent Swarm Engine ─────────────────────────────────────────────────────────

export class WebTorrentSwarmEngine {
  public sessions = new Map<string, TorrentSession>();
  public myPeerId: string;

  constructor() {
    this.myPeerId = `aeth-${Date.now().toString(36)}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
  }

  /**
   * Seeds a binary file or Uint8Array into the P2P swarm.
   */
  public async seedFile(file: File | Uint8Array, name: string): Promise<SwarmTorrentMetadata> {
    let bytes: Uint8Array;
    if (typeof File !== 'undefined' && file instanceof File) {
      const buffer = await file.arrayBuffer();
      bytes = new Uint8Array(buffer);
    } else if (file instanceof Uint8Array) {
      bytes = file;
    } else {
      bytes = new Uint8Array(file as any);
    }

    const chunkData = chunkBinary(bytes);
    const infoHash = computeInfoHash(
      name,
      chunkData.length,
      chunkData.pieceLength,
      chunkData.merkleRoot
    );

    const metadata: SwarmTorrentMetadata = {
      infoHash,
      name,
      pieceLength: chunkData.pieceLength,
      totalPieces: chunkData.totalPieces,
      length: chunkData.length,
      pieceHashes: chunkData.pieceHashes,
      merkleRoot: chunkData.merkleRoot,
      createdAt: Date.now(),
    };

    const session = new TorrentSession(metadata, true, bytes);
    this.sessions.set(infoHash, session);
    session.emitTelemetry();

    return metadata;
  }

  /**
   * Downloads a torrent from the swarm using BitTorrent wire protocol and rarest-first scheduling.
   */
  public async downloadTorrent(metadata: SwarmTorrentMetadata): Promise<Uint8Array> {
    let session = this.sessions.get(metadata.infoHash);

    if (session && session.isComplete && session.fullBuffer) {
      return session.fullBuffer;
    }

    if (!session) {
      session = new TorrentSession(metadata, false);
      this.sessions.set(metadata.infoHash, session);
    }

    if (metadata.totalPieces === 0) {
      const emptyBuffer = new Uint8Array(0);
      session.fullBuffer = emptyBuffer;
      session.isComplete = true;
      return emptyBuffer;
    }

    session.downloadPromise = new Promise<Uint8Array>((resolve, reject) => {
      session!.downloadResolve = resolve;
      session!.downloadReject = reject;
    });

    // Notify connected peers of our interest
    for (const peer of session.peers.values()) {
      this.announceSessionToPeer(session, peer);
    }

    this.scheduleRequests(session);
    session.emitTelemetry();

    return session.downloadPromise;
  }

  /**
   * Connects an active WebRTC DataChannel to the swarm.
   */
  public connectPeer(peerId: string, channel: RTCDataChannel, infoHash?: string): void {
    channel.binaryType = 'arraybuffer';

    const targetInfoHash = infoHash || (this.sessions.size === 1 ? Array.from(this.sessions.keys())[0] : undefined);

    const peerSession: PeerWireSession = {
      peerId,
      channel,
      infoHash: targetInfoHash || '',
      peerChoking: true,
      peerInterested: false,
      amChoking: false,
      amInterested: false,
      pieces: new Set<number>(),
      pendingRequests: new Set<number>(),
      lastActive: Date.now(),
    };

    if (targetInfoHash && this.sessions.has(targetInfoHash)) {
      const session = this.sessions.get(targetInfoHash)!;
      session.peers.set(peerId, peerSession);
    }

    const onOpenHandler = () => {
      if (peerSession.infoHash && this.sessions.has(peerSession.infoHash)) {
        const session = this.sessions.get(peerSession.infoHash)!;
        this.announceSessionToPeer(session, peerSession);
      } else {
        // Send handshake so remote peer can bind
        for (const [hash, sess] of this.sessions.entries()) {
          this.announceSessionToPeer(sess, peerSession);
          break;
        }
      }
    };

    if (channel.readyState === 'open') {
      onOpenHandler();
    } else {
      channel.onopen = onOpenHandler;
    }

    channel.onmessage = (event: MessageEvent) => {
      peerSession.lastActive = Date.now();
      try {
        let msg: WireMessage;
        if (event.data instanceof ArrayBuffer) {
          msg = decodeWireMessage(new Uint8Array(event.data));
        } else if (ArrayBuffer.isView(event.data)) {
          msg = decodeWireMessage(
            new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength)
          );
        } else if (typeof event.data === 'string') {
          try {
            msg = JSON.parse(event.data);
          } catch {
            return;
          }
        } else {
          return;
        }

        this.handleWireMessage(peerSession, msg);
      } catch (err) {
        console.error('[WebTorrentSwarm] Packet decode error from peer', peerId, err);
      }
    };

    channel.onclose = () => {
      this.handlePeerDisconnect(peerSession);
    };

    channel.onerror = (err) => {
      console.warn('[WebTorrentSwarm] DataChannel error for peer', peerId, err);
      this.handlePeerDisconnect(peerSession);
    };
  }

  /**
   * Disconnects a peer from all torrent sessions.
   */
  public disconnectPeer(peerId: string): void {
    for (const session of this.sessions.values()) {
      const peer = session.peers.get(peerId);
      if (peer) {
        this.handlePeerDisconnect(peer);
      }
    }
  }

  /**
   * Safe helper to transmit binary packets across standard RTCDataChannels.
   */
  private sendData(channel: RTCDataChannel, packet: Uint8Array): void {
    (channel as any).send(packet);
  }

  /**
   * Dispatches initial BitTorrent wire protocol announcement messages to a connected peer.
   */
  private announceSessionToPeer(session: TorrentSession, peer: PeerWireSession): void {
    peer.infoHash = session.metadata.infoHash;
    session.peers.set(peer.peerId, peer);

    if (peer.channel.readyState !== 'open') return;

    try {
      // 1. Handshake
      const handshake = encodeWireMessage({
        type: 'HANDSHAKE',
        infoHash: session.metadata.infoHash,
        peerId: this.myPeerId,
      });
      this.sendData(peer.channel, handshake);

      // 2. Bitfield
      const verifiedIndices: number[] = [];
      for (let i = 0; i < session.metadata.totalPieces; i++) {
        if (session.pieceStates[i] === 'verified') {
          verifiedIndices.push(i);
        }
      }
      const bitfieldBytes = createBitfield(session.metadata.totalPieces, verifiedIndices);
      const bitfieldMsg = encodeWireMessage({
        type: 'BITFIELD',
        bitfield: bitfieldBytes,
      });
      this.sendData(peer.channel, bitfieldMsg);

      // 3. Unchoke (allow remote peer to request from us)
      const unchokeMsg = encodeWireMessage({ type: 'UNCHOKE' });
      this.sendData(peer.channel, unchokeMsg);
      peer.amChoking = false;

      // 4. Interested (if we need any pieces)
      if (session.verifiedPieces < session.metadata.totalPieces) {
        const interestedMsg = encodeWireMessage({ type: 'INTERESTED' });
        this.sendData(peer.channel, interestedMsg);
        peer.amInterested = true;
      }
    } catch (err) {
      console.warn('[WebTorrentSwarm] Error announcing to peer', peer.peerId, err);
    }
  }

  /**
   * Processes incoming BitTorrent wire protocol messages.
   */
  private handleWireMessage(peer: PeerWireSession, msg: WireMessage): void {
    let session = peer.infoHash ? this.sessions.get(peer.infoHash) : undefined;

    if (!session && msg.type === 'HANDSHAKE') {
      session = this.sessions.get(msg.infoHash);
      if (session) {
        peer.infoHash = msg.infoHash;
        session.peers.set(peer.peerId, peer);
        this.announceSessionToPeer(session, peer);
      }
      return;
    }

    if (!session) {
      if (this.sessions.size === 1) {
        session = Array.from(this.sessions.values())[0];
        peer.infoHash = session.metadata.infoHash;
        session.peers.set(peer.peerId, peer);
      } else {
        return;
      }
    }

    switch (msg.type) {
      case 'CHOKE': {
        peer.peerChoking = true;
        // Revert any pending requests with this peer back to 'missing'
        for (const pieceIdx of peer.pendingRequests) {
          if (session.pieceStates[pieceIdx] === 'downloading') {
            session.pieceStates[pieceIdx] = 'missing';
          }
        }
        peer.pendingRequests.clear();
        session.emitTelemetry();
        break;
      }

      case 'UNCHOKE': {
        peer.peerChoking = false;
        this.scheduleRequests(session);
        session.emitTelemetry();
        break;
      }

      case 'INTERESTED': {
        peer.peerInterested = true;
        if (peer.amChoking) {
          peer.amChoking = false;
          try {
            this.sendData(peer.channel, encodeWireMessage({ type: 'UNCHOKE' }));
          } catch {}
        }
        session.emitTelemetry();
        break;
      }

      case 'NOT_INTERESTED': {
        peer.peerInterested = false;
        session.emitTelemetry();
        break;
      }

      case 'HAVE': {
        if (msg.pieceIndex >= 0 && msg.pieceIndex < session.metadata.totalPieces) {
          peer.pieces.add(msg.pieceIndex);
          if (session.pieceStates[msg.pieceIndex] === 'missing' && !peer.amInterested) {
            peer.amInterested = true;
            try {
              this.sendData(peer.channel, encodeWireMessage({ type: 'INTERESTED' }));
            } catch {}
          }
          this.scheduleRequests(session);
          session.emitTelemetry();
        }
        break;
      }

      case 'BITFIELD': {
        const booleans = parseBitfield(msg.bitfield, session.metadata.totalPieces);
        let hasNeeded = false;
        for (let i = 0; i < booleans.length; i++) {
          if (booleans[i]) {
            peer.pieces.add(i);
            if (session.pieceStates[i] === 'missing') {
              hasNeeded = true;
            }
          }
        }
        if (hasNeeded && !peer.amInterested) {
          peer.amInterested = true;
          try {
            this.sendData(peer.channel, encodeWireMessage({ type: 'INTERESTED' }));
          } catch {}
        }
        this.scheduleRequests(session);
        session.emitTelemetry();
        break;
      }

      case 'REQUEST': {
        // Peer is requesting a piece block from us
        if (
          msg.pieceIndex >= 0 &&
          msg.pieceIndex < session.metadata.totalPieces &&
          session.pieceStates[msg.pieceIndex] === 'verified'
        ) {
          const pieceData = session.receivedPieces.get(msg.pieceIndex);
          if (pieceData) {
            const start = msg.offset;
            const end = Math.min(start + msg.length, pieceData.length);
            const slice = pieceData.subarray(start, end);

            const pieceMsg = encodeWireMessage({
              type: 'PIECE',
              pieceIndex: msg.pieceIndex,
              offset: msg.offset,
              data: slice,
            });

            try {
              this.sendData(peer.channel, pieceMsg);
              session.recordUploadedBytes(slice.length);
              session.emitTelemetry();
            } catch (err) {
              console.warn('[WebTorrentSwarm] Failed to send piece to peer', peer.peerId, err);
            }
          }
        }
        break;
      }

      case 'PIECE': {
        // Peer responded with piece data block
        peer.pendingRequests.delete(msg.pieceIndex);
        const expectedPieceSize =
          msg.pieceIndex === session.metadata.totalPieces - 1
            ? session.metadata.length - msg.pieceIndex * session.metadata.pieceLength
            : session.metadata.pieceLength;

        // Verify SHA-256 hash of the received piece data
        const pieceHash = bytesToHex(sha256(msg.data));
        const expectedHash = session.metadata.pieceHashes[msg.pieceIndex];

        if (pieceHash.toLowerCase() === expectedHash.toLowerCase()) {
          // Checksum verified!
          session.pieceStates[msg.pieceIndex] = 'verified';
          session.receivedPieces.set(msg.pieceIndex, msg.data);
          session.verifiedPieces++;
          session.recordDownloadedBytes(msg.data.length);

          // Broadcast HAVE(pieceIndex) to all connected peers in swarm
          const havePacket = encodeWireMessage({
            type: 'HAVE',
            pieceIndex: msg.pieceIndex,
          });
          for (const otherPeer of session.peers.values()) {
            try {
              if (otherPeer.channel.readyState === 'open') {
                this.sendData(otherPeer.channel, havePacket);
              }
            } catch {}
          }

          // Check if all pieces are now verified
          if (session.verifiedPieces === session.metadata.totalPieces) {
            session.isComplete = true;
            const assembled = new Uint8Array(session.metadata.length);
            for (let i = 0; i < session.metadata.totalPieces; i++) {
              const p = session.receivedPieces.get(i);
              if (p) {
                assembled.set(p, i * session.metadata.pieceLength);
              }
            }
            session.fullBuffer = assembled;
            if (session.downloadResolve) {
              session.downloadResolve(assembled);
            }
          } else {
            // Schedule next rarest pieces
            this.scheduleRequests(session);
          }
        } else {
          // Corrupted piece detected! Reject and re-request
          console.warn(
            `[WebTorrentSwarm] Corrupted piece #${msg.pieceIndex} received from peer ${peer.peerId}. Expected SHA-256: ${expectedHash}, got: ${pieceHash}. Rejecting and re-queuing.`
          );
          session.corruptedPiecesCount++;
          session.pieceStates[msg.pieceIndex] = 'missing';
          this.scheduleRequests(session);
        }

        session.emitTelemetry();
        break;
      }

      case 'CANCEL': {
        // Optional cancel request
        break;
      }
    }
  }

  /**
   * Schedules rarest-first requests for missing pieces across unchoked peers.
   */
  private scheduleRequests(session: TorrentSession): void {
    if (session.isComplete || session.verifiedPieces >= session.metadata.totalPieces) {
      return;
    }

    const selections = selectRarestPieces(session.pieceStates, session.peers, 10);

    for (const sel of selections) {
      const peer = session.peers.get(sel.targetPeerId);
      if (!peer || peer.peerChoking || peer.channel.readyState !== 'open') continue;

      session.pieceStates[sel.pieceIndex] = 'downloading';
      peer.pendingRequests.add(sel.pieceIndex);

      const expectedLength =
        sel.pieceIndex === session.metadata.totalPieces - 1
          ? session.metadata.length - sel.pieceIndex * session.metadata.pieceLength
          : session.metadata.pieceLength;

      const reqMsg = encodeWireMessage({
        type: 'REQUEST',
        pieceIndex: sel.pieceIndex,
        offset: 0,
        length: expectedLength,
      });

      try {
        this.sendData(peer.channel, reqMsg);
      } catch (err) {
        console.warn('[WebTorrentSwarm] Failed to send request for piece', sel.pieceIndex, err);
        session.pieceStates[sel.pieceIndex] = 'missing';
        peer.pendingRequests.delete(sel.pieceIndex);
      }
    }
  }

  /**
   * Handles peer disconnection cleanup.
   */
  private handlePeerDisconnect(peer: PeerWireSession): void {
    const session = this.sessions.get(peer.infoHash);
    if (session) {
      session.peers.delete(peer.peerId);
      for (const pieceIdx of peer.pendingRequests) {
        if (session.pieceStates[pieceIdx] === 'downloading') {
          session.pieceStates[pieceIdx] = 'missing';
        }
      }
      peer.pendingRequests.clear();
      this.scheduleRequests(session);
      session.emitTelemetry();
    }
  }

  public getSession(infoHash: string): TorrentSession | undefined {
    return this.sessions.get(infoHash);
  }

  public getTelemetry(infoHash: string): SwarmTelemetry | undefined {
    return this.sessions.get(infoHash)?.getTelemetry();
  }

  public onTelemetry(infoHash: string, callback: (t: SwarmTelemetry) => void): () => void {
    const session = this.sessions.get(infoHash);
    if (!session) return () => {};
    session.telemetryListeners.add(callback);
    callback(session.getTelemetry());
    return () => {
      session.telemetryListeners.delete(callback);
    };
  }

  /**
   * Interactive UI Component: renders responsive pixel heatmap of piece states, active peer count, and zero-server bandwidth badge.
   */
  public renderSwarmHeatmapHTML(
    metadata: SwarmTorrentMetadata,
    states?: PieceState[],
    telemetry?: Partial<SwarmTelemetry>
  ): string {
    const session = metadata.infoHash ? this.sessions.get(metadata.infoHash) : undefined;
    const resolvedStates = states || session?.pieceStates || [];
    const resolvedTelemetry = telemetry || (metadata.infoHash ? this.getTelemetry(metadata.infoHash) : undefined);
    return renderSwarmHeatmapHTML(metadata, resolvedStates, resolvedTelemetry);
  }
}

// ── Interactive UI Component: Swarm Heatmap Renderer ────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Renders a responsive pixel heatmap HTML component showing piece states:
 * - emerald = verified
 * - cyan = active / downloading
 * - slate = needed / missing
 * Also displays active peer swarm count and zero-server bandwidth badge.
 */
export function renderSwarmHeatmapHTML(
  metadata: SwarmTorrentMetadata,
  states: PieceState[] = [],
  telemetry?: Partial<SwarmTelemetry>
): string {
  const safeStates = Array.isArray(states) ? states : [];
  const verifiedCount = safeStates.filter((s) => s === 'verified').length;
  const downloadingCount = states.filter((s) => s === 'downloading').length;
  const neededCount = states.filter((s) => s === 'missing').length;
  const totalPieces = metadata.totalPieces;
  const progress = totalPieces === 0 ? 100 : Math.round((verifiedCount / totalPieces) * 100);

  const activePeers = telemetry?.totalPeers ?? 0;
  const seeders = telemetry?.seeders ?? 0;
  const leechers = telemetry?.leechers ?? 0;
  const downloadSpeed = telemetry?.downloadSpeedBps ? `${formatBytes(telemetry.downloadSpeedBps)}/s` : '0 B/s';
  const uploadSpeed = telemetry?.uploadSpeedBps ? `${formatBytes(telemetry.uploadSpeedBps)}/s` : '0 B/s';

  const safeName = escapeHtml(metadata.name);
  const truncatedHash = metadata.infoHash ? `${metadata.infoHash.substring(0, 12)}…` : 'N/A';
  const truncatedMerkle = metadata.merkleRoot ? `${metadata.merkleRoot.substring(0, 12)}…` : 'N/A';

  // Render individual piece blocks
  const pieceGridHTML = states
    .map((state, i) => {
      let colorClasses = '';
      let label = '';

      switch (state) {
        case 'verified':
          colorClasses =
            'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] border border-emerald-400/40 hover:scale-125';
          label = 'Verified';
          break;
        case 'downloading':
          colorClasses =
            'bg-cyan-500 animate-pulse shadow-[0_0_6px_rgba(6,182,212,0.8)] border border-cyan-300 hover:scale-125';
          label = 'Downloading';
          break;
        case 'missing':
        default:
          colorClasses =
            'bg-slate-800 border border-slate-700/50 hover:bg-slate-700 hover:scale-125';
          label = 'Needed';
          break;
      }

      return `<div class="aspect-square rounded-xs transition-transform duration-100 cursor-pointer ${colorClasses}" data-piece-index="${i}" data-state="${state}" title="Piece #${i}: ${label} (64KB)" aria-label="Piece #${i}: ${label}"></div>`;
    })
    .join('');

  return `
<div class="aether-swarm-heatmap bg-slate-900/95 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 shadow-2xl backdrop-blur-md">
  <!-- Swarm Header -->
  <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
    <div class="flex items-center gap-2 min-w-0">
      <span class="text-cyan-400 text-sm">⚡</span>
      <span class="font-bold text-sm text-cyan-300 truncate max-w-[220px]" title="${safeName}">${safeName}</span>
      <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]" title="InfoHash: ${metadata.infoHash}">${truncatedHash}</span>
    </div>

    <!-- Sovereign Swarm Badges -->
    <div class="flex items-center gap-2">
      <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
        Zero-Server Bandwidth (100% P2P Swarm)
      </span>
      <span class="px-2 py-1 rounded-full text-[11px] bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
        <span class="font-bold">${activePeers}</span> Peers in Swarm
      </span>
    </div>
  </div>

  <!-- Progress Bar & Primary Stats -->
  <div class="mb-3">
    <div class="flex justify-between items-center text-[11px] text-slate-400 mb-1">
      <div class="flex items-center gap-2">
        <span class="text-slate-200 font-semibold">${progress}% Verified</span>
        <span>•</span>
        <span>${verifiedCount}/${totalPieces} Pieces</span>
        <span>•</span>
        <span>${formatBytes(metadata.length)}</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-cyan-400">↓ ${downloadSpeed}</span>
        <span class="text-emerald-400">↑ ${uploadSpeed}</span>
      </div>
    </div>

    <div class="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/50">
      <div class="bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 h-full transition-all duration-300" style="width: ${progress}%"></div>
    </div>
  </div>

  <!-- Responsive Heatmap Pixel Matrix -->
  <div class="mb-3">
    <div class="grid grid-cols-12 sm:grid-cols-16 md:grid-cols-24 lg:grid-cols-32 gap-1 p-2 bg-black/50 rounded-lg border border-slate-800/90 max-h-52 overflow-y-auto">
      ${pieceGridHTML || '<div class="text-slate-500 col-span-full py-2 text-center">No pieces present</div>'}
    </div>
  </div>

  <!-- Footer Legend & Swarm Topology -->
  <div class="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-slate-400 border-t border-slate-800/60">
    <!-- Heatmap Legend -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block shadow-[0_0_3px_rgba(16,185,129,0.5)]"></span>
        <span class="text-emerald-300">${verifiedCount} Verified</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-xs bg-cyan-500 animate-pulse inline-block shadow-[0_0_3px_rgba(6,182,212,0.8)]"></span>
        <span class="text-cyan-300">${downloadingCount} Active</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-xs bg-slate-800 border border-slate-700 inline-block"></span>
        <span class="text-slate-400">${neededCount} Needed</span>
      </div>
    </div>

    <!-- Swarm Topology Summary -->
    <div class="flex items-center gap-3 text-[10px] text-slate-400">
      <span>Seeders: <strong class="text-emerald-400">${seeders}</strong></span>
      <span>Leechers: <strong class="text-cyan-400">${leechers}</strong></span>
      <span>Merkle: <code class="text-slate-300" title="${metadata.merkleRoot}">${truncatedMerkle}</code></span>
    </div>
  </div>
</div>
`.trim();
}

// ── Export Singleton Instance & Register in IoC Container ───────────────────────────

export const webTorrentSwarm = new WebTorrentSwarmEngine();

try {
  serviceRegistry.registerInstance(SERVICES.WebTorrentSwarm, webTorrentSwarm);
} catch (err) {
  console.warn('[WebTorrentSwarm] Auto-registration note:', err);
}

if (typeof window !== 'undefined') {
  (window as any).webTorrentSwarm = webTorrentSwarm;
}
