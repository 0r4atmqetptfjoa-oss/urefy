import { MerkleTree, MerkleProof, verifySignature, hexToBytes, computeFingerprint } from '@aetheris/core-crypto';

export type ReputationVerdict = 'CLEAN' | 'SUSPICIOUS' | 'PACKED' | 'MALICIOUS' | 'UNKNOWN' | 'NOT_SCANNED';

export interface PeerVerdict {
  protocolVersion?: 2;
  networkId?: string;
  sha256: string;
  verdict: ReputationVerdict;
  confidence: number; // 0.0 to 1.0 (or percentage up to 100)
  seederCount: number;
  timestamp: number;
  nodeId?: string;
  nodePublicKeyHex?: string;
  signature?: string;
  entropy?: number;
}

export const FILE_REPUTATION_PROTOCOL_VERSION = 2 as const;
export const DEFAULT_REPUTATION_NETWORK_ID = 'urefy-mainnet';

export function canonicalizePeerVerdict(verdict: PeerVerdict, nodeId: string): string {
  return JSON.stringify({
    domain: 'urefy:file-reputation:v2',
    protocolVersion: FILE_REPUTATION_PROTOCOL_VERSION,
    networkId: verdict.networkId,
    nodeId,
    sha256: verdict.sha256.toLowerCase(),
    verdict: verdict.verdict,
    confidence: verdict.confidence,
    seederCount: verdict.seederCount,
    timestamp: verdict.timestamp,
  });
}

export interface FileReputationConsensus {
  sha256: string;
  verdict: ReputationVerdict;
  confidence: number;
  seederCount: number;
  nodeCount: number;
  entropy?: number;
  timestamp: number;
  isMerkleVerified: boolean;
  merkleProof?: MerkleProof;
  verdictBreakdown: Record<ReputationVerdict, number>;
  summary: string;
}

/**
 * Synchronized Merkle Tree of community-verified SHA-256 binary file hashes.
 * Allows sovereign nodes to cryptographically prove that a binary has achieved
 * decentralized consensus verification without querying central servers.
 */
export class ReputationMerkleTree {
  private tree: MerkleTree;
  private verifiedHashes: Set<string> = new Set();

  constructor(initialHashes: string[] = []) {
    for (const h of initialHashes) {
      if (h && typeof h === 'string') {
        this.verifiedHashes.add(h.toLowerCase());
      }
    }
    const hashList = Array.from(this.verifiedHashes);
    this.tree = new MerkleTree(hashList.length > 0 ? hashList : ['0'.repeat(64)]);
  }

  /**
   * Adds a community-verified hash into the reputation tree and rebuilds root.
   */
  public addVerifiedHash(sha256: string): string {
    const cleanHash = sha256.toLowerCase();
    if (!this.verifiedHashes.has(cleanHash)) {
      this.verifiedHashes.add(cleanHash);
      this.tree = new MerkleTree(Array.from(this.verifiedHashes));
    }
    return this.tree.getRoot();
  }

  /**
   * Returns whether a given SHA-256 hash is in the verified tree.
   */
  public hasHash(sha256: string): boolean {
    return this.verifiedHashes.has(sha256.toLowerCase());
  }

  /**
   * Returns current root hash of the reputation Merkle tree.
   */
  public getRoot(): string {
    return this.tree.getRoot();
  }

  /**
   * Generates a cryptographic Merkle audit proof for a verified hash.
   */
  public getProof(sha256: string): MerkleProof {
    return this.tree.getProof(sha256.toLowerCase());
  }

  /**
   * Validates a cryptographic Merkle audit proof against the current root.
   */
  public verifyProof(proof: MerkleProof): boolean {
    return MerkleTree.verifyProof(proof);
  }

  public getVerifiedCount(): number {
    return this.verifiedHashes.size;
  }

  public getAllHashes(): string[] {
    return Array.from(this.verifiedHashes);
  }
}

/**
 * Decentralized Collaborative Binary Reputation Registry & Vault.
 * Aggregates peer-signed verdicts, executes weighted consensus scoring,
 * and maintains the synchronized ReputationMerkleTree.
 */
export class CollaborativeFileReputationVault {
  private merkleTree: ReputationMerkleTree;
  private peerVerdicts: Map<string, PeerVerdict[]> = new Map();
  private consensusCache: Map<string, FileReputationConsensus> = new Map();

  constructor(initialVerifiedHashes: string[] = []) {
    this.merkleTree = new ReputationMerkleTree(initialVerifiedHashes);
  }

  /**
   * Formats a standard human-readable sovereign consensus summary.
   * e.g. "Verified by 40 sovereign nodes (Entropy 6.12, Clean)"
   */
  public static formatSummary(
    nodeOrSeederCount: number,
    entropy: number | undefined,
    verdict: ReputationVerdict
  ): string {
    if (verdict === 'UNKNOWN' || verdict === 'NOT_SCANNED') {
      const entropyStr = entropy !== undefined ? ` (Entropy ${entropy.toFixed(2)})` : '';
      return `Unrated binary (Status: ${verdict}${entropyStr}, zero peer attestations)`;
    }
    const formattedVerdict = verdict.charAt(0).toUpperCase() + verdict.slice(1).toLowerCase();
    const entropyStr = entropy !== undefined ? `Entropy ${entropy.toFixed(2)}, ` : '';
    return `Verified by ${nodeOrSeederCount} sovereign nodes (${entropyStr}${formattedVerdict})`;
  }

  /**
   * Registers a signed peer verdict into the collaborative registry.
   * Cryptographically validates Ed25519 signature and enforces nodeId === computeFingerprint(pubKey).
   * Rejects unsigned or unauthenticated verdicts to guarantee Sybil resistance.
   */
  public registerVerdict(verdict: PeerVerdict): boolean {
    if (!verdict || !verdict.sha256 || !verdict.verdict) {
      return false;
    }

    // MANDATORY: Reject unsigned verdicts
    if (!verdict.signature || !verdict.nodePublicKeyHex) {
      return false;
    }
    if (verdict.protocolVersion !== FILE_REPUTATION_PROTOCOL_VERSION || verdict.networkId !== DEFAULT_REPUTATION_NETWORK_ID) return false;
    if (!/^[0-9a-f]{64}$/i.test(verdict.sha256)) return false;
    if (!Number.isFinite(verdict.confidence) || verdict.confidence < 0 || verdict.confidence > 1) return false;
    if (!Number.isSafeInteger(verdict.seederCount) || verdict.seederCount < 0) return false;
    if (!Number.isSafeInteger(verdict.timestamp) || verdict.timestamp > Date.now() + 300_000 || verdict.timestamp < Date.now() - 7 * 86_400_000) return false;

    // Enforce cryptographic binding: nodeId MUST match fingerprint of public key
    let expectedNodeId: string;
    try {
      const pubBytes = hexToBytes(verdict.nodePublicKeyHex);
      if (pubBytes.length !== 32) {
        return false;
      }
      expectedNodeId = computeFingerprint(pubBytes);
    } catch {
      return false;
    }

    if (verdict.nodeId && verdict.nodeId.toLowerCase() !== expectedNodeId.toLowerCase()) {
      return false;
    }
    verdict.nodeId = expectedNodeId;

    const cleanSha = verdict.sha256.toLowerCase();

    // Version 1 payloads are intentionally rejected: they are not domain,
    // network, or identity bound and cannot be migrated safely in place.
    let isSigValid = false;
    try {
      isSigValid = verifySignature(verdict.signature, canonicalizePeerVerdict(verdict, expectedNodeId), verdict.nodePublicKeyHex);
    } catch {
      return false;
    }

    if (!isSigValid) {
      return false;
    }

    const key = cleanSha;
    if (!this.peerVerdicts.has(key)) {
      this.peerVerdicts.set(key, []);
    }

    const list = this.peerVerdicts.get(key)!;
    // Deduplicate by verified nodeId
    const idx = list.findIndex((v) => v.nodeId === verdict.nodeId);
    if (idx >= 0) {
      list[idx] = verdict;
    } else {
      list.push(verdict);
    }

    // Recompute consensus score and update tree if verified clean
    this.recomputeConsensus(key, verdict.entropy);
    return true;
  }

  /**
   * Recomputes consensus scoring across all submitted peer verdicts for a binary hash.
   * Enforces bounded Sybil weighting: each node capped at weight <= 1.0; seederCount does NOT multiply weight.
   */
  private recomputeConsensus(key: string, currentEntropy?: number): FileReputationConsensus {
    const verdicts = this.peerVerdicts.get(key) || [];
    const breakdown: Record<ReputationVerdict, number> = {
      CLEAN: 0,
      SUSPICIOUS: 0,
      PACKED: 0,
      MALICIOUS: 0,
      UNKNOWN: 0,
      NOT_SCANNED: 0,
    };

    const weightedScores: Record<ReputationVerdict, number> = {
      CLEAN: 0,
      SUSPICIOUS: 0,
      PACKED: 0,
      MALICIOUS: 0,
      UNKNOWN: 0,
      NOT_SCANNED: 0,
    };

    let totalWeight = 0;
    let maxSeederCount = 0;
    let sumConfidence = 0;
    let latestTimestamp = 0;
    let recordedEntropy = currentEntropy;

    const seenNodeIds = new Set<string>();

    for (const v of verdicts) {
      const nodeId = v.nodeId!;
      if (seenNodeIds.has(nodeId)) {
        continue;
      }
      seenNodeIds.add(nodeId);

      breakdown[v.verdict] = (breakdown[v.verdict] || 0) + 1;
      const normalizedConfidence = v.confidence > 1 ? v.confidence / 100 : v.confidence;

      // Sybil-resistant bounded weighting:
      // Each unique validated cryptographic node identity is capped at weight <= 1.0.
      // seederCount is NEVER allowed to multiply consensus voting weight!
      const boundedWeight = Math.min(1.0, Math.max(0.1, normalizedConfidence));

      weightedScores[v.verdict] += boundedWeight;
      totalWeight += boundedWeight;
      sumConfidence += normalizedConfidence;
      maxSeederCount = Math.max(maxSeederCount, v.seederCount || 0);
      latestTimestamp = Math.max(latestTimestamp, v.timestamp);
      if (v.entropy !== undefined && recordedEntropy === undefined) {
        recordedEntropy = v.entropy;
      }
    }

    // Determine leading verdict by weighted score
    let winningVerdict: ReputationVerdict = 'CLEAN';
    let highestScore = -1;

    for (const [verdictType, score] of Object.entries(weightedScores) as [ReputationVerdict, number][]) {
      if (score > highestScore) {
        highestScore = score;
        winningVerdict = verdictType;
      }
    }

    const nodeCount = seenNodeIds.size;
    const avgConfidence = nodeCount > 0 ? Math.round((sumConfidence / nodeCount) * 100) / 100 : 0.95;
    const finalSeederCount = Math.max(maxSeederCount, nodeCount);

    // If consensus is CLEAN and has sufficient peer support, register into Merkle Tree
    if (winningVerdict === 'CLEAN' && nodeCount >= 1) {
      this.merkleTree.addVerifiedHash(key);
    }

    const isMerkleVerified = this.merkleTree.hasHash(key);
    let merkleProof: MerkleProof | undefined;
    if (isMerkleVerified) {
      try {
        merkleProof = this.merkleTree.getProof(key);
      } catch {
        // Ignored if tree build in progress
      }
    }

    const consensus: FileReputationConsensus = {
      sha256: key,
      verdict: winningVerdict,
      confidence: avgConfidence,
      seederCount: finalSeederCount,
      nodeCount,
      entropy: recordedEntropy,
      timestamp: latestTimestamp || Date.now(),
      isMerkleVerified,
      merkleProof,
      verdictBreakdown: breakdown,
      summary: CollaborativeFileReputationVault.formatSummary(
        nodeCount || finalSeederCount,
        recordedEntropy,
        winningVerdict
      ),
    };

    this.consensusCache.set(key, consensus);
    return consensus;
  }

  /**
   * Instant local lookup for binary reputation.
   * Resolves consensus verdict, Merkle verification status, and formatted summary string.
   */
  public lookupReputation(
    sha256: string,
    entropy?: number,
    options?: { defaultToUnknown?: boolean }
  ): FileReputationConsensus | null {
    const key = sha256.toLowerCase();
    let consensus = this.consensusCache.get(key);

    if (!consensus) {
      if (this.peerVerdicts.has(key)) {
        consensus = this.recomputeConsensus(key, entropy);
      } else if (this.merkleTree.hasHash(key)) {
        // Membership proves inclusion only; it does not prove a clean verdict
        // or a fabricated number of independent attestations.
        consensus = {
          sha256: key,
          verdict: 'UNKNOWN',
          confidence: 0,
          seederCount: 0,
          nodeCount: 0,
          entropy,
          timestamp: Date.now(),
          isMerkleVerified: true,
          merkleProof: this.merkleTree.getProof(key),
          verdictBreakdown: { CLEAN: 0, SUSPICIOUS: 0, PACKED: 0, MALICIOUS: 0, UNKNOWN: 1, NOT_SCANNED: 0 },
          summary: 'Hash is present in the reputation Merkle set, but no signed verdict attestations are available',
        };
        this.consensusCache.set(key, consensus);
      } else if (options?.defaultToUnknown) {
        consensus = {
          sha256: key,
          verdict: 'UNKNOWN',
          confidence: 0,
          seederCount: 0,
          nodeCount: 0,
          entropy,
          timestamp: Date.now(),
          isMerkleVerified: false,
          verdictBreakdown: { CLEAN: 0, SUSPICIOUS: 0, PACKED: 0, MALICIOUS: 0, UNKNOWN: 1, NOT_SCANNED: 0 },
          summary: CollaborativeFileReputationVault.formatSummary(0, entropy, 'UNKNOWN'),
        };
      }
    } else {
      if (entropy !== undefined && consensus.entropy !== entropy) {
        consensus = {
          ...consensus,
          entropy,
          summary: CollaborativeFileReputationVault.formatSummary(
            consensus.nodeCount || consensus.seederCount,
            entropy,
            consensus.verdict
          ),
        };
        this.consensusCache.set(key, consensus);
      }
    }

    return consensus || null;
  }

  /**
   * Returns reputation consensus if known, or an honest UNKNOWN consensus record
   * if no peer verdicts or Merkle attestations exist yet for this file hash.
   */
  public getReputationOrUnknown(sha256: string, entropy?: number): FileReputationConsensus {
    const existing = this.lookupReputation(sha256, entropy);
    if (existing) {
      return existing;
    }

    return {
      sha256: sha256.toLowerCase(),
      verdict: 'UNKNOWN',
      confidence: 0,
      seederCount: 0,
      nodeCount: 0,
      entropy,
      timestamp: Date.now(),
      isMerkleVerified: false,
      verdictBreakdown: { CLEAN: 0, SUSPICIOUS: 0, PACKED: 0, MALICIOUS: 0, UNKNOWN: 1, NOT_SCANNED: 0 },
      summary: CollaborativeFileReputationVault.formatSummary(0, entropy, 'UNKNOWN'),
    };
  }

  /**
   * Returns the underlying synchronized Reputation Merkle Tree.
   */
  public getMerkleTree(): ReputationMerkleTree {
    return this.merkleTree;
  }

  /**
   * Returns list of all stored peer verdicts for a binary hash.
   */
  public getPeerVerdicts(sha256: string): PeerVerdict[] {
    return this.peerVerdicts.get(sha256.toLowerCase()) || [];
  }
}
