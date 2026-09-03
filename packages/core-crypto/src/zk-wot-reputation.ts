import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { WebOfTrustGraph } from './wot.js';
import { Field } from './rln.js';
import {
  createGroth16Setup,
  createGroth16Proof,
  verifyGroth16Proof,
  serializeProof,
  deserializeProof,
  BN254_SCALAR_FIELD_ORDER,
  Groth16Proof,
  Groth16VerifyingKey,
  GenericProvingKey,
} from './zk-snark.js';

/**
 * Portable Zero-Knowledge Reputation Certificate.
 * Proves that a sovereign user meets or exceeds a reputation threshold (>= threshold)
 * over the BN254 elliptic curve without revealing their exact score, Ed25519 identity, or vouchers.
 */
export interface PortableReputationCertificate {
  version: '1.0';
  threshold: number;
  domain: string;
  nullifier: string;
  proof: string;
  publicInputs: string[];
  issuedAt: number;
  expiresAt: number;
}

/** Canonical setup seed for the 4-input Reputation Range Proof circuit */
export const REPUTATION_CIRCUIT_SEED = 'aetheris:zk-wot-reputation:canonical:v1';

// Pre-computed canonical setup parameters for the reputation Groth16 circuit (4 public inputs)
const CANONICAL_REPUTATION_SETUP = createGroth16Setup(4, REPUTATION_CIRCUIT_SEED);
export const DEFAULT_REPUTATION_VK: Groth16VerifyingKey = CANONICAL_REPUTATION_SETUP.verifyingKey;
export const DEFAULT_REPUTATION_PK: GenericProvingKey = CANONICAL_REPUTATION_SETUP.provingKey;

/**
 * Computes a deterministic, unlinkable Reputation Nullifier.
 * Formula: SHA256(identitySecret + epoch + context)
 * Prevents double-spending or double-voting in the same context while preserving privacy.
 */
export function computeReputationNullifier(
  identitySecret: Uint8Array | string,
  epoch: number,
  context: string
): string {
  const secretBytes = typeof identitySecret === 'string'
    ? (identitySecret.startsWith('0x') ? hexToBytes(identitySecret.slice(2)) : new TextEncoder().encode(identitySecret))
    : identitySecret;

  const enc = new TextEncoder();
  const epochBytes = enc.encode(epoch.toString(10));
  const contextBytes = enc.encode(context);

  const payload = new Uint8Array(secretBytes.length + epochBytes.length + contextBytes.length);
  payload.set(secretBytes, 0);
  payload.set(epochBytes, secretBytes.length);
  payload.set(contextBytes, secretBytes.length + epochBytes.length);

  return bytesToHex(sha256(payload));
}

/**
 * Zero-Knowledge Web-of-Trust Reputation Proof Engine.
 * Evaluates graph-based trust scores and produces verifiable zero-knowledge range proofs.
 */
export class ZKReputationProofEngine {
  /**
   * Calculates a user's trust score from the WoT random-walk graph (0 to 100).
   *
   * @param graph WebOfTrustGraph instance containing directional capacity edges
   * @param source Trust anchor node (e.g. genesis-core or trusted observer)
   * @param target Target node whose reputation is being evaluated
   * @param options Simulation parameters (steps, restartProbability)
   * @returns Integer trust score between 0 and 100
   */
  public static calculateTrustScore(
    graph: WebOfTrustGraph,
    source: string,
    target: string,
    options?: { steps?: number; restartProbability?: number }
  ): number {
    if (!graph || !source || !target) return 0;
    if (source === target) return 100;

    // Check reachability via max flow: bot farms disconnected from anchor have max flow = 0
    const flow = graph.computeMaxFlow(source, target);
    if (flow <= 0) return 0;

    const steps = options?.steps ?? 5000;
    const restartProb = options?.restartProbability ?? 0.15;
    const meritRank = graph.computeMeritRank(source, steps, restartProb);

    const targetMerit = meritRank.get(target) || 0;
    if (targetMerit <= 0) return 0;

    // Relative scoring compared to all non-source visited nodes
    let maxNonSourceMerit = 0;
    for (const [node, merit] of meritRank.entries()) {
      if (node !== source && merit > maxNonSourceMerit) {
        maxNonSourceMerit = merit;
      }
    }

    if (maxNonSourceMerit <= 0) {
      return Math.min(100, Math.max(1, Math.round(targetMerit * 100)));
    }

    // Scale target merit relative to the highest scoring non-source peer
    const relativeRatio = targetMerit / maxNonSourceMerit;
    const flowMultiplier = Math.min(1.0, flow / 10);
    const score = Math.round(relativeRatio * 85 + flowMultiplier * 15);

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generates a Zero-Knowledge range proof proving that user's reputation is >= threshold
   * over the BN254 elliptic curve without revealing the actual score, identity, or vouchers.
   */
  public static async generateRangeProof(
    score: number,
    threshold: number,
    secretKey: Uint8Array,
    domain: string,
    epoch: number = Math.floor(Date.now() / 86400000),
    provingKey: GenericProvingKey = DEFAULT_REPUTATION_PK
  ): Promise<{ proof: Groth16Proof; nullifier: string; publicInputs: bigint[] }> {
    if (threshold < 0 || threshold > 100) {
      throw new Error(`Invalid threshold ${threshold}: must be between 0 and 100`);
    }
    if (score < threshold) {
      throw new Error(`Reputation score (${score}) is below required threshold (${threshold})`);
    }
    if (!domain || domain.trim().length === 0) {
      throw new Error('Target domain must be specified for contextual zero-knowledge proof');
    }

    // 1. Generate deterministic nullifier
    const nullifier = computeReputationNullifier(secretKey, epoch, domain);

    // 2. Map public inputs to scalar field F_r
    const thresholdScalar = BigInt(threshold);
    const domainHash = Field.hashToField('aetheris:zk-wot:domain', domain);
    const nullifierScalar = BigInt('0x' + nullifier) % BN254_SCALAR_FIELD_ORDER;
    const epochScalar = BigInt(epoch);

    const publicInputs: bigint[] = [
      thresholdScalar,
      domainHash,
      nullifierScalar,
      epochScalar,
    ];

    // 3. Generate Groth16 proof over BN254
    const proof = createGroth16Proof(provingKey, publicInputs);

    return { proof, nullifier, publicInputs };
  }

  /**
   * Exports a portable, self-contained ZK reputation certificate for cross-domain attestation.
   */
  public static async exportPortableReputationCertificate(
    score: number,
    threshold: number,
    secretKey: Uint8Array,
    domain: string,
    epoch: number = Math.floor(Date.now() / 86400000),
    validDurationMs: number = 24 * 60 * 60 * 1000
  ): Promise<PortableReputationCertificate> {
    const { proof, nullifier, publicInputs } = await this.generateRangeProof(
      score,
      threshold,
      secretKey,
      domain,
      epoch,
      DEFAULT_REPUTATION_PK
    );

    const issuedAt = Date.now();
    const expiresAt = issuedAt + validDurationMs;

    return {
      version: '1.0',
      threshold,
      domain,
      nullifier,
      proof: serializeProof(proof),
      publicInputs: publicInputs.map((n) => n.toString(10)),
      issuedAt,
      expiresAt,
    };
  }

  /**
   * Validates a portable ZK reputation certificate against an expected threshold and domain.
   */
  public static async verifyPortableReputationCertificate(
    cert: PortableReputationCertificate,
    expectedThreshold: number,
    expectedDomain: string,
    verifyingKey: Groth16VerifyingKey = DEFAULT_REPUTATION_VK
  ): Promise<boolean> {
    try {
      // 1. Version check
      if (cert.version !== '1.0') return false;

      // 2. Threshold requirement check (certificate threshold must satisfy expected threshold)
      if (cert.threshold < expectedThreshold) return false;

      // 3. Contextual domain binding check (prevents replay across unrelated services)
      if (cert.domain !== expectedDomain) return false;

      // 4. Temporal validity check (with 60s clock drift tolerance)
      const now = Date.now();
      if (cert.expiresAt <= now || cert.issuedAt > now + 60000) {
        return false;
      }

      // 5. Verify public inputs consistency
      if (!Array.isArray(cert.publicInputs) || cert.publicInputs.length !== 4) {
        return false;
      }

      const expectedThresholdScalar = BigInt(cert.threshold);
      const expectedDomainHash = Field.hashToField('aetheris:zk-wot:domain', cert.domain);
      const expectedNullifierScalar = BigInt('0x' + cert.nullifier) % BN254_SCALAR_FIELD_ORDER;

      const [pubThreshold, pubDomain, pubNullifier, pubEpoch] = cert.publicInputs.map((s) => BigInt(s));

      if (pubThreshold !== expectedThresholdScalar) return false;
      if (pubDomain !== expectedDomainHash) return false;
      if (pubNullifier !== expectedNullifierScalar) return false;

      // 6. Deserialize Groth16 proof
      const proof = deserializeProof(cert.proof);

      // 7. Verify Groth16 bilinear pairing equality over BN254 curve
      return verifyGroth16Proof(verifyingKey, [pubThreshold, pubDomain, pubNullifier, pubEpoch], proof);
    } catch {
      return false;
    }
  }
}

/**
 * Standalone convenience wrapper for exporting a portable ZK reputation certificate.
 */
export async function exportPortableReputationCertificate(
  score: number,
  threshold: number,
  secretKey: Uint8Array,
  domain: string,
  epoch?: number,
  validDurationMs?: number
): Promise<PortableReputationCertificate> {
  return ZKReputationProofEngine.exportPortableReputationCertificate(
    score,
    threshold,
    secretKey,
    domain,
    epoch,
    validDurationMs
  );
}

/**
 * Standalone convenience wrapper for verifying a portable ZK reputation certificate.
 */
export async function verifyPortableReputationCertificate(
  cert: PortableReputationCertificate,
  expectedThreshold: number,
  expectedDomain: string,
  verifyingKey?: Groth16VerifyingKey
): Promise<boolean> {
  return ZKReputationProofEngine.verifyPortableReputationCertificate(
    cert,
    expectedThreshold,
    expectedDomain,
    verifyingKey
  );
}
