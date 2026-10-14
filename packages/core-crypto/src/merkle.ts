import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { constantTimeHexEqual } from './security.js';

export interface MerkleProof {
  leaf: string;
  root: string;
  path: Array<{
    hash: string;
    isRight: boolean;
  }>;
}

function normalizeHexLeaf(leaf: string): string {
  const clean = leaf.trim().toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]*$/.test(clean)) {
    throw new Error(`Invalid hex string in Merkle Tree: ${leaf}`);
  }
  return clean.padStart(64, '0').slice(-64);
}

export class MerkleTree {
  private leaves: string[];
  private leafIndexMap: Map<string, number> = new Map();
  private layers: string[][];

  constructor(leaves: string[] = []) {
    this.leaves = leaves.map(normalizeHexLeaf);
    this.layers = [];
    this.buildTree();
  }

  public static hashPairStatic(a: string, b: string): string {
    const aBytes = hexToBytes(normalizeHexLeaf(a));
    const bBytes = hexToBytes(normalizeHexLeaf(b));
    const combined = new Uint8Array(aBytes.length + bBytes.length);
    combined.set(aBytes, 0);
    combined.set(bBytes, aBytes.length);
    return bytesToHex(sha256(combined));
  }

  private hashPair(a: string, b: string): string {
    return MerkleTree.hashPairStatic(a, b);
  }

  private buildTree(): void {
    this.leafIndexMap.clear();
    for (let i = 0; i < this.leaves.length; i++) {
      if (!this.leafIndexMap.has(this.leaves[i])) {
        this.leafIndexMap.set(this.leaves[i], i);
      }
    }

    if (this.leaves.length === 0) {
      this.layers = [['0'.repeat(64)]];
      return;
    }

    let currentLayer = [...this.leaves];
    this.layers = [currentLayer];

    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
        nextLayer.push(this.hashPair(left, right));
      }
      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }
  }

  public getRoot(): string {
    if (this.layers.length === 0) return '0'.repeat(64);
    const top = this.layers[this.layers.length - 1];
    return top[0] || '0'.repeat(64);
  }

  public getLeafCount(): number {
    return this.leaves.length;
  }

  public insert(leaf: string): void {
    this.leaves.push(normalizeHexLeaf(leaf));
    this.buildTree();
  }

  public insertMany(newLeaves: string[]): void {
    if (!newLeaves.length) return;
    for (const leaf of newLeaves) {
      this.leaves.push(normalizeHexLeaf(leaf));
    }
    this.buildTree();
  }

  public contains(leaf: string): boolean {
    try {
      return this.leafIndexMap.has(normalizeHexLeaf(leaf));
    } catch {
      return false;
    }
  }

  public getProof(leaf: string): MerkleProof {
    const target = normalizeHexLeaf(leaf);
    const index = this.leafIndexMap.get(target) ?? -1;
    if (index === -1) {
      throw new Error(`Leaf not found in Merkle Tree: ${leaf}`);
    }

    const path: MerkleProof['path'] = [];
    let currentIndex = index;

    for (let layerIdx = 0; layerIdx < this.layers.length - 1; layerIdx++) {
      const layer = this.layers[layerIdx];
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
      const siblingHash = siblingIndex < layer.length ? layer[siblingIndex] : layer[currentIndex];
      path.push({
        hash: siblingHash,
        isRight: !isRight,
      });
      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      leaf: target,
      root: this.getRoot(),
      path,
    };
  }

  public static verifyProof(proof: MerkleProof): boolean {
    if (!proof || typeof proof.leaf !== 'string' || typeof proof.root !== 'string' || !Array.isArray(proof.path)) {
      return false;
    }
    try {
      let current = normalizeHexLeaf(proof.leaf);
      for (const step of proof.path) {
        if (!step || typeof step.hash !== 'string') return false;
        const left = step.isRight ? current : step.hash;
        const right = step.isRight ? step.hash : current;
        current = MerkleTree.hashPairStatic(left, right);
      }
      return constantTimeHexEqual(current, normalizeHexLeaf(proof.root));
    } catch {
      return false;
    }
  }
}
