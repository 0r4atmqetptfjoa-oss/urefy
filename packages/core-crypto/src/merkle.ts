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

/**
 * Binary Merkle Tree for Identity and Revocation Accumulation.
 */
export class MerkleTree {
  private leaves: string[];
  private layers: string[][];

  constructor(leaves: string[] = []) {
    this.leaves = leaves.map(l => l.toLowerCase());
    this.layers = [];
    this.buildTree();
  }

  private hashPair(a: string, b: string): string {
    const aBytes = hexToBytes(a.padStart(64, '0'));
    const bBytes = hexToBytes(b.padStart(64, '0'));
    const combined = new Uint8Array(aBytes.length + bBytes.length);
    combined.set(aBytes, 0);
    combined.set(bBytes, aBytes.length);
    return bytesToHex(sha256(combined));
  }

  private buildTree(): void {
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

  public insert(leaf: string): void {
    this.leaves.push(leaf.toLowerCase());
    this.buildTree();
  }

  public contains(leaf: string): boolean {
    return this.leaves.includes(leaf.toLowerCase());
  }

  public getProof(leaf: string): MerkleProof {
    const target = leaf.toLowerCase();
    const index = this.leaves.indexOf(target);
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
        isRight: !isRight, // indicates where the sibling sits relative to the current hash
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
    let current = proof.leaf;
    for (const step of proof.path) {
      const left = step.isRight ? current : step.hash;
      const right = step.isRight ? step.hash : current;
      
      const leftBytes = hexToBytes(left.padStart(64, '0'));
      const rightBytes = hexToBytes(right.padStart(64, '0'));
      const combined = new Uint8Array(leftBytes.length + rightBytes.length);
      combined.set(leftBytes, 0);
      combined.set(rightBytes, leftBytes.length);
      current = bytesToHex(sha256(combined));
    }
    return constantTimeHexEqual(current, proof.root);
  }
}
