import { describe, it, expect, beforeEach } from 'vitest';
import { MeshTopologyMatrix, meshMatrix, type MeshPeerNode } from '../src/mesh-matrix.js';

describe('MeshTopologyMatrix — WebRTC Mesh Latency & Cipher Inspector', () => {
  let matrix: MeshTopologyMatrix;

  beforeEach(() => {
    matrix = new MeshTopologyMatrix();
  });

  it('should initialize with connected mesh peers and compute average RTT and jitter', () => {
    expect(matrix.peers.length).toBeGreaterThanOrEqual(4);
    const avg = matrix.getAverageRTT();
    expect(avg).toBeGreaterThan(0);
    expect(avg).toBeLessThan(100);

    const jitter = matrix.getAverageJitter();
    expect(jitter).toBeGreaterThan(0);
  });

  it('should ping all peers and update latency without errors', () => {
    matrix.pingAllPeers();
    expect(matrix.peers[0].rttMs).toBeGreaterThanOrEqual(4);
    expect(matrix.peers[0].jitterMs).toBeDefined();
  });

  it('should support adding, getting, and removing peer nodes dynamically', () => {
    const newPeer: MeshPeerNode = {
      peerId: 'peer-zeta-9',
      fingerprint: 'z99900112233',
      rttMs: 12,
      packetLossPct: 0.0,
      cipher: 'ChaCha20-Poly1305',
      ratchetEpoch: 1,
      bytesIn: 1024,
      bytesOut: 2048,
      status: 'connected',
      role: 'MEMBER',
    };

    matrix.addPeer(newPeer);
    expect(matrix.peers.length).toBe(5);

    const fetched = matrix.getPeer('peer-zeta-9');
    expect(fetched).toBeDefined();
    expect(fetched?.fingerprint).toBe('z99900112233');

    const removed = matrix.removePeer('peer-zeta-9');
    expect(removed).toBe(true);
    expect(matrix.peers.length).toBe(4);
  });

  it('should trigger TreeKEM ratchet rekeying on peer nodes', () => {
    const peer = matrix.peers[0];
    const initialEpoch = peer.ratchetEpoch;
    const initialCipher = peer.cipher;

    const success = matrix.rekeyPeer(peer.peerId);
    expect(success).toBe(true);
    expect(peer.ratchetEpoch).toBe(initialEpoch + 1);
    expect(peer.cipher).not.toBe(initialCipher);
  });

  it('should select optimal route based on RTT and packet loss', () => {
    const optimal = matrix.getOptimalRoute();
    expect(optimal).toBeDefined();
    expect(optimal?.rttMs).toBeLessThanOrEqual(50);
  });

  it('should compute comprehensive network telemetry summary', () => {
    const summary = matrix.getNetworkTelemetrySummary();
    expect(summary.totalPeers).toBe(4);
    expect(summary.connectedPeers).toBeGreaterThanOrEqual(3);
    expect(summary.averageRttMs).toBeGreaterThan(0);
    expect(summary.totalThroughputInBytes).toBeGreaterThan(0);
  });

  it('should calculate exponential backoff with full jitter', () => {
    const delay = matrix.calculateBackoffWithJitter(0);
    expect(delay).toBeGreaterThanOrEqual(500);
    expect(delay).toBeLessThanOrEqual(1000);
  });

  it('should toggle mesh modal open/close state and render modal markup', () => {
    expect(matrix.isOpen).toBe(false);
    matrix.open();
    expect(matrix.isOpen).toBe(true);

    const html = matrix.renderMeshMatrixModal();
    expect(html).toContain('Mesh');
    expect(html).toContain('btn-ping-mesh-peers');
    expect(html).toContain('btn-close-mesh-modal');

    matrix.close();
    expect(matrix.isOpen).toBe(false);
  });

  it('should render sidebar button with average latency badge', () => {
    const btnHtml = matrix.renderMeshMatrixButton();
    expect(btnHtml).toContain('btn-open-mesh-matrix');
    expect(btnHtml).toContain('Matrix');
    expect(btnHtml).toContain('ms');
  });

  it('should export singleton instance meshMatrix', () => {
    expect(meshMatrix).toBeInstanceOf(MeshTopologyMatrix);
  });
});
