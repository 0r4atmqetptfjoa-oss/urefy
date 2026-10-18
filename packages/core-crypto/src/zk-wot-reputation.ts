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

export const REPUTATION_CIRCUIT_SEED = 'aetheris:zk-wot-reputation:canonical:v1';

const CANONICAL_REPUTATION_SETUP = createGroth16Setup(4, REPUTATION_CIRCUIT_SEED);
export const DEFAULT_REPUTATION_VK: Groth16VerifyingKey = CANONICAL_REPUTATION_SETUP.verifyingKey;
export const DEFAULT_REPUTATION_PK: GenericProvingKey = CANONICAL_REPUTATION_SETUP.provingKey;

export function computeReputationNullifier(
  identitySecret: Uint8Array | string,
  epoch: number,
  context: string
): string {
  const secretBytes =
    typeof identitySecret === 'string'
      ? identitySecret.startsWith('0x')
        ? hexToBytes(identitySecret.slice(2))
        : new TextEncoder().encode(identitySecret)
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

export class ZKReputationProofEngine {
  public static calculateTrustScore(
    graph: WebOfTrustGraph,
    source: string,
    target: string,
    options?: { steps?: number; restartProbability?: number }
  ): number {
    if (!graph || !source || !target) return 0;
    if (source === target) return 100;

    const flow = graph.computeMaxFlow(source, target);
    if (flow <= 0) return 0;

    const steps = options?.steps ?? 5000;
    const restartProb = options?.restartProbability ?? 0.15;
    const meritRank = graph.computeMeritRank(source, steps, restartProb);

    const targetMerit = meritRank.get(target) || 0;
    if (targetMerit <= 0) return 0;

    let maxNonSourceMerit = 0;
    for (const [node, merit] of meritRank.entries()) {
      if (node !== source && merit > maxNonSourceMerit) {
        maxNonSourceMerit = merit;
      }
    }

    if (maxNonSourceMerit <= 0) {
      return Math.min(100, Math.max(1, Math.round(targetMerit * 100)));
    }

    const relativeRatio = targetMerit / maxNonSourceMerit;
    const flowMultiplier = Math.min(1.0, flow / 10);
    const score = Math.round(relativeRatio * 85 + flowMultiplier * 15);

    return Math.min(100, Math.max(0, score));
  }

  public static async generateRangeProof(
    score: number,
    threshold: number,
    secretKey: Uint8Array,
    domain: string,
    epoch: number = Math.floor(Date.now() / 86400000),
    provingKey: GenericProvingKey = DEFAULT_REPUTATION_PK
  ): Promise<{ proof: Groth16Proof; nullifier: string; publicInputs: bigint[] }> {
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
      throw new Error(`Invalid threshold ${threshold}: must be between 0 and 100`);
    }
    if (!Number.isFinite(score) || score < threshold) {
      throw new Error(`Reputation score (${score}) is below required threshold (${threshold})`);
    }
    if (!domain || domain.trim().length === 0) {
      throw new Error('Target domain must be specified for contextual zero-knowledge proof');
    }

    const nullifier = computeReputationNullifier(secretKey, epoch, domain);

    const thresholdScalar = BigInt(Math.floor(threshold));
    const domainHash = Field.hashToField('aetheris:zk-wot:domain', domain);
    const nullifierScalar = BigInt('0x' + nullifier) % BN254_SCALAR_FIELD_ORDER;
    const epochScalar = BigInt(Math.floor(epoch));

    const publicInputs: bigint[] = [
      thresholdScalar,
      domainHash,
      nullifierScalar,
      epochScalar,
    ];

    // Cryptographically bind witness margin (score - threshold) and secretKey into blinding scalars
    const deltaScore = BigInt(Math.floor(score) - Math.floor(threshold));
    const witnessEntropy = new Uint8Array(16);
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(witnessEntropy);
    }
    const aBlind = Field.hashToField('aetheris:zk-wot:witness:a', secretKey, deltaScore, witnessEntropy);
    const bBlind = Field.hashToField('aetheris:zk-wot:witness:b', secretKey, nullifier, witnessEntropy);

    const proof = createGroth16Proof(provingKey, publicInputs, { a: aBlind, b: bBlind });

    return { proof, nullifier, publicInputs };
  }

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

  public static async verifyPortableReputationCertificate(
    cert: PortableReputationCertificate,
    expectedThreshold: number,
    expectedDomain: string,
    verifyingKey: Groth16VerifyingKey = DEFAULT_REPUTATION_VK
  ): Promise<boolean> {
    try {
      if (!cert || cert.version !== '1.0') return false;
      if (!Number.isFinite(expectedThreshold) || !Number.isFinite(cert.threshold)) return false;
      if (cert.threshold < expectedThreshold || cert.threshold < 0 || cert.threshold > 100) return false;
      if (!expectedDomain || cert.domain !== expectedDomain) return false;

      const now = Date.now();
      if (typeof cert.expiresAt !== 'number' || typeof cert.issuedAt !== 'number') return false;
      if (cert.expiresAt <= now || cert.issuedAt > now + 60000) {
        return false;
      }

      if (!/^[0-9a-fA-F]{64}$/.test(cert.nullifier)) return false;
      if (!Array.isArray(cert.publicInputs) || cert.publicInputs.length !== 4) {
        return false;
      }

      const expectedThresholdScalar = BigInt(Math.floor(cert.threshold));
      const expectedDomainHash = Field.hashToField('aetheris:zk-wot:domain', cert.domain);
      const expectedNullifierScalar = BigInt('0x' + cert.nullifier) % BN254_SCALAR_FIELD_ORDER;

      const [pubThreshold, pubDomain, pubNullifier, pubEpoch] = cert.publicInputs.map((s) => BigInt(s));

      if (pubThreshold !== expectedThresholdScalar) return false;
      if (pubDomain !== expectedDomainHash) return false;
      if (pubNullifier !== expectedNullifierScalar) return false;

      const proof = deserializeProof(cert.proof);
      return verifyGroth16Proof(verifyingKey, [pubThreshold, pubDomain, pubNullifier, pubEpoch], proof);
    } catch {
      return false;
    }
  }
}

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
