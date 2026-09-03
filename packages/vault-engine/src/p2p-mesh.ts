import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { MerkleTree } from '@aetheris/core-crypto';

export const CHUNK_SIZE = 64 * 1024; // 64 KB pieces

export interface FilePiece {
  index: number;
  totalPieces: number;
  hash: string;
  data: Uint8Array;
}

export interface SwarmManifest {
  fileSize: number;
  chunkSize: number;
  pieceCount: number;
  merkleRoot: string;
  pieceHashes: string[];
}

/**
 * Splits a file buffer into deterministic pieces and computes a Swarm Manifest.
 */
export function createSwarmManifest(fileData: Uint8Array): {
  manifest: SwarmManifest;
  pieces: FilePiece[];
} {
  const pieces: FilePiece[] = [];
  const pieceHashes: string[] = [];
  const pieceCount = Math.ceil(fileData.length / CHUNK_SIZE);

  for (let i = 0; i < pieceCount; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileData.length);
    const chunkData = fileData.subarray(start, end);
    const hash = bytesToHex(sha256(chunkData));

    pieceHashes.push(hash);
    pieces.push({
      index: i,
      totalPieces: pieceCount,
      hash,
      data: chunkData,
    });
  }

  const merkleTree = new MerkleTree(pieceHashes);

  const manifest: SwarmManifest = {
    fileSize: fileData.length,
    chunkSize: CHUNK_SIZE,
    pieceCount,
    merkleRoot: merkleTree.getRoot(),
    pieceHashes,
  };

  return { manifest, pieces };
}

/**
 * Verifies and reassembles received pieces into the original file buffer.
 */
export function reassembleSwarm(manifest: SwarmManifest, receivedPieces: FilePiece[]): Uint8Array {
  if (receivedPieces.length !== manifest.pieceCount) {
    throw new Error(`Missing pieces: expected ${manifest.pieceCount}, received ${receivedPieces.length}`);
  }

  // Sort pieces by index
  const sorted = [...receivedPieces].sort((a, b) => a.index - b.index);
  const result = new Uint8Array(manifest.fileSize);

  let offset = 0;
  for (let i = 0; i < sorted.length; i++) {
    const piece = sorted[i];
    if (piece.index !== i) {
      throw new Error(`Piece index mismatch at position ${i}`);
    }

    // Cryptographic piece verification against manifest hash
    const computedHash = bytesToHex(sha256(piece.data));
    if (computedHash !== manifest.pieceHashes[i]) {
      throw new Error(`Corrupt piece detected at index ${i}: hash mismatch`);
    }

    result.set(piece.data, offset);
    offset += piece.data.length;
  }

  return result;
}
