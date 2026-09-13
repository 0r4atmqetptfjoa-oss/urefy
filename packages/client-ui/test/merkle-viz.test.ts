import { describe, it, expect, beforeEach } from 'vitest';
import { MerkleSwarmVisualizer } from '../src/merkle-viz';

describe('MerkleSwarmVisualizer — Interactive Merkle Grid & Swarm Validation', () => {
  let viz: MerkleSwarmVisualizer;

  beforeEach(() => {
    viz = new MerkleSwarmVisualizer();
  });

  it('should generate a valid swarm manifest with verified and active pieces', () => {
    const manifest = viz.generateSampleManifest('test-binary.bin', 65536, 16);
    expect(manifest.fileName).toBe('test-binary.bin');
    expect(manifest.pieces.length).toBe(16);
    expect(manifest.merkleRoot.startsWith('0x')).toBe(true);
    expect(manifest.overallProgressPct).toBeGreaterThan(0);
  });

  it('should toggle visualizer open and close state', () => {
    expect(viz.isOpen).toBe(false);
    viz.open('kernel.bin');
    expect(viz.isOpen).toBe(true);
    expect(viz.manifest.fileName).toBe('kernel.bin');
    viz.close();
    expect(viz.isOpen).toBe(false);
  });

  it('should render interactive piece grid with piece buttons', () => {
    const gridHtml = viz.renderMerkleGrid();
    expect(gridHtml).toContain('btn-merkle-piece');
    expect(gridHtml).toContain('data-piece-index="0"');
  });

  it('should render modal with selected piece details', () => {
    viz.open();
    viz.selectPiece(3);
    const modalHtml = viz.renderMerkleModal();
    expect(modalHtml).toContain('Merkle Tree Swarm Verification Matrix');
    expect(modalHtml).toContain('Piece #4 Attestation');
    expect(modalHtml).toContain('Shannon Entropy:');
  });
});
