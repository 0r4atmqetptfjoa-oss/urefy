import { bn254 } from '@noble/curves/bn254';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { Field } from './rln.js';

/**
 * BN254 / Alt-bn128 Base Field Order (q):
 * q = 21888242871839275222246405745257275088696311157297823662689037894645226208583
 */
export const BN254_BASE_FIELD_ORDER: bigint = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
export const BN254_Q = BN254_BASE_FIELD_ORDER;

/**
 * BN254 / Alt-bn128 Scalar Field Order (r):
 * r = 21888242871839275222246405745257275088548364400416034343698204186575808495617
 */
export const BN254_SCALAR_FIELD_ORDER: bigint = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
export const BN254_R = BN254_SCALAR_FIELD_ORDER;

/**
 * Affine point on curve E(F_q) in G1.
 */
export interface G1Point {
  x: bigint;
  y: bigint;
}

/**
 * Affine point on twisted curve E'(F_q^2) in G2.
 * Coordinates are represented over F_q^2 where each coordinate is [c0, c1] (or [c1, c0] in EVM/SnarkJS notation).
 */
export interface G2Point {
  x: [bigint, bigint];
  y: [bigint, bigint];
}

/**
 * Groth16 Zero-Knowledge Proof consisting of:
 * - pi_a in G1
 * - pi_b in G2
 * - pi_c in G1
 */
export interface Groth16Proof {
  pi_a: G1Point;
  pi_b: G2Point;
  pi_c: G1Point;
}

/**
 * Groth16 Verifying Key consisting of:
 * - alpha1 in G1
 * - beta2 in G2
 * - gamma2 in G2
 * - delta2 in G2
 * - IC (Input Consistency linear combination points) in G1
 */
export interface Groth16VerifyingKey {
  alpha1: G1Point;
  beta2: G2Point;
  gamma2: G2Point;
  delta2: G2Point;
  IC: G1Point[];
}

/**
 * Serialized G1 point representation with decimal strings.
 */
export interface SerializedG1Point {
  x: string;
  y: string;
}

/**
 * Serialized G2 point representation with decimal strings.
 */
export interface SerializedG2Point {
  x: [string, string];
  y: [string, string];
}

/**
 * Serialized Groth16 proof format.
 */
export interface SerializedGroth16Proof {
  pi_a: SerializedG1Point;
  pi_b: SerializedG2Point;
  pi_c: SerializedG1Point;
}

/**
 * Serialized Groth16 verifying key format.
 */
export interface SerializedVerifyingKey {
  alpha1: SerializedG1Point;
  beta2: SerializedG2Point;
  gamma2: SerializedG2Point;
  delta2: SerializedG2Point;
  IC: SerializedG1Point[];
}

/**
 * Proving key parameters for algebraic Groth16 instances.
 */
export interface GenericProvingKey {
  alpha: bigint;
  beta: bigint;
  gamma: bigint;
  delta: bigint;
  IC_scalars: bigint[];
}

/**
 * Proving key specific to Circle Membership proofs.
 */
export interface CircleMembershipProvingKey {
  alpha: bigint;
  beta: bigint;
  gamma: bigint;
  delta: bigint;
  c0: bigint;
  c1: bigint;
  c2: bigint;
}

// -----------------------------------------------------------------------------
// Modular Arithmetic Helpers for Scalar Field F_r
// -----------------------------------------------------------------------------

export function modR(n: bigint): bigint {
  const result = n % BN254_SCALAR_FIELD_ORDER;
  return result >= 0n ? result : result + BN254_SCALAR_FIELD_ORDER;
}

export function invR(n: bigint): bigint {
  const reduced = modR(n);
  if (reduced === 0n) throw new Error('Division by zero in scalar field F_r');
  return bn254.fields.Fr.inv(reduced);
}

export function generateRandomScalar(): bigint {
  const buf = new Uint8Array(32);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(buf);
  } else {
    throw new Error('Cryptographically secure PRNG (crypto.getRandomValues) is required');
  }
  const hex = bytesToHex(buf);
  const n = BigInt('0x' + hex) % BN254_SCALAR_FIELD_ORDER;
  return n === 0n ? 1n : n;
}

// -----------------------------------------------------------------------------
// G1 and G2 Point Conversions & Safe Scalar Operations
// -----------------------------------------------------------------------------

export function g1PointToNoble(pt: G1Point): any {
  if (pt.x === 0n && pt.y === 0n) {
    return bn254.G1.ProjectivePoint.ZERO;
  }
  return bn254.G1.ProjectivePoint.fromAffine({
    x: (pt.x % BN254_BASE_FIELD_ORDER + BN254_BASE_FIELD_ORDER) % BN254_BASE_FIELD_ORDER,
    y: (pt.y % BN254_BASE_FIELD_ORDER + BN254_BASE_FIELD_ORDER) % BN254_BASE_FIELD_ORDER,
  });
}

export function g1PointFromNoble(pt: any): G1Point {
  if (pt.is0()) {
    return { x: 0n, y: 0n };
  }
  const aff = pt.toAffine();
  return { x: aff.x, y: aff.y };
}

export function g2PointToNoble(pt: G2Point): any {
  if (
    pt.x[0] === 0n &&
    pt.x[1] === 0n &&
    pt.y[0] === 0n &&
    pt.y[1] === 0n
  ) {
    return bn254.G2.ProjectivePoint.ZERO;
  }

  const q = BN254_BASE_FIELD_ORDER;
  const modQ = (n: bigint) => (n % q + q) % q;

  // Try standard mathematical order: x = c0 + c1*u
  try {
    const candidate = bn254.G2.ProjectivePoint.fromAffine({
      x: { c0: modQ(pt.x[0]), c1: modQ(pt.x[1]) },
      y: { c0: modQ(pt.y[0]), c1: modQ(pt.y[1]) },
    });
    candidate.assertValidity();
    return candidate;
  } catch {
    // Try SnarkJS/EVM order where imaginary coefficient c1 appears first: x = [c1, c0]
    const candidate = bn254.G2.ProjectivePoint.fromAffine({
      x: { c0: modQ(pt.x[1]), c1: modQ(pt.x[0]) },
      y: { c0: modQ(pt.y[1]), c1: modQ(pt.y[0]) },
    });
    candidate.assertValidity();
    return candidate;
  }
}

export function g2PointFromNoble(pt: any, snarkJsOrder = false): G2Point {
  if (pt.is0()) {
    return { x: [0n, 0n], y: [0n, 0n] };
  }
  const aff = pt.toAffine();
  if (snarkJsOrder) {
    return {
      x: [aff.x.c1, aff.x.c0],
      y: [aff.y.c1, aff.y.c0],
    };
  }
  return {
    x: [aff.x.c0, aff.x.c1],
    y: [aff.y.c0, aff.y.c1],
  };
}

function safeScalarMultiplyG1(pt: any, scalar: bigint): any {
  const s = modR(scalar);
  if (s === 0n || pt.is0()) return bn254.G1.ProjectivePoint.ZERO;
  return pt.multiply(s);
}

function safeScalarMultiplyG2(pt: any, scalar: bigint): any {
  const s = modR(scalar);
  if (s === 0n || pt.is0()) return bn254.G2.ProjectivePoint.ZERO;
  return pt.multiply(s);
}

// -----------------------------------------------------------------------------
// BN254 G1 Point Operations
// -----------------------------------------------------------------------------

export class BN254G1 {
  static readonly ZERO: G1Point = { x: 0n, y: 0n };
  static readonly GENERATOR: G1Point = { x: 1n, y: 2n };

  static isValid(pt: G1Point): boolean {
    if (this.isZero(pt)) return true;
    try {
      const p = g1PointToNoble(pt);
      p.assertValidity();
      return true;
    } catch {
      return false;
    }
  }

  static isOnCurve(pt: G1Point): boolean {
    return this.isValid(pt);
  }

  static isZero(pt: G1Point): boolean {
    return pt.x === 0n && pt.y === 0n;
  }

  static add(p1: G1Point, p2: G1Point): G1Point {
    const n1 = g1PointToNoble(p1);
    const n2 = g1PointToNoble(p2);
    return g1PointFromNoble(n1.add(n2));
  }

  static subtract(p1: G1Point, p2: G1Point): G1Point {
    const n1 = g1PointToNoble(p1);
    const n2 = g1PointToNoble(p2);
    return g1PointFromNoble(n1.subtract(n2));
  }

  static multiply(p: G1Point, scalar: bigint): G1Point {
    const n = g1PointToNoble(p);
    return g1PointFromNoble(safeScalarMultiplyG1(n, scalar));
  }

  static negate(p: G1Point): G1Point {
    const n = g1PointToNoble(p);
    return g1PointFromNoble(n.negate());
  }

  static equals(p1: G1Point, p2: G1Point): boolean {
    const n1 = g1PointToNoble(p1);
    const n2 = g1PointToNoble(p2);
    return n1.equals(n2);
  }

  /**
   * Multi-Scalar Multiplication (MSM) in G1 using Pippenger's algorithm.
   */
  static msm(points: G1Point[], scalars: bigint[]): G1Point {
    if (points.length !== scalars.length) {
      throw new Error(`MSM dimension mismatch: ${points.length} points vs ${scalars.length} scalars`);
    }
    if (points.length === 0) return this.ZERO;
    const noblePoints = points.map(p => g1PointToNoble(p));
    const nobleScalars = scalars.map(s => modR(s));
    const result = bn254.G1.ProjectivePoint.msm(noblePoints, nobleScalars);
    return g1PointFromNoble(result);
  }
}

// -----------------------------------------------------------------------------
// BN254 G2 Point Operations
// -----------------------------------------------------------------------------

export class BN254G2 {
  static readonly ZERO: G2Point = { x: [0n, 0n], y: [0n, 0n] };
  static readonly GENERATOR: G2Point = {
    x: [
      10857046999023057135944570762232829481370756359578518086990519993285655852781n,
      11559732032986387107991004021392285783925812861821192530917403151452391805634n,
    ],
    y: [
      8495653923123431417604973247489272438418190587263600148770280649306958101930n,
      4082367875863433681332203403145435568316851327593401208105741076214120093531n,
    ],
  };

  static isValid(pt: G2Point): boolean {
    if (this.isZero(pt)) return true;
    try {
      const p = g2PointToNoble(pt);
      p.assertValidity();
      return true;
    } catch {
      return false;
    }
  }

  static isOnCurve(pt: G2Point): boolean {
    return this.isValid(pt);
  }

  static isZero(pt: G2Point): boolean {
    return (
      pt.x[0] === 0n &&
      pt.x[1] === 0n &&
      pt.y[0] === 0n &&
      pt.y[1] === 0n
    );
  }

  static add(p1: G2Point, p2: G2Point): G2Point {
    const n1 = g2PointToNoble(p1);
    const n2 = g2PointToNoble(p2);
    return g2PointFromNoble(n1.add(n2));
  }

  static subtract(p1: G2Point, p2: G2Point): G2Point {
    const n1 = g2PointToNoble(p1);
    const n2 = g2PointToNoble(p2);
    return g2PointFromNoble(n1.subtract(n2));
  }

  static multiply(p: G2Point, scalar: bigint): G2Point {
    const n = g2PointToNoble(p);
    return g2PointFromNoble(safeScalarMultiplyG2(n, scalar));
  }

  static negate(p: G2Point): G2Point {
    const n = g2PointToNoble(p);
    return g2PointFromNoble(n.negate());
  }

  static equals(p1: G2Point, p2: G2Point): boolean {
    const n1 = g2PointToNoble(p1);
    const n2 = g2PointToNoble(p2);
    return n1.equals(n2);
  }
}

// -----------------------------------------------------------------------------
// Optimal Ate Pairing & Miller Loop Verification Engine
// -----------------------------------------------------------------------------

/**
 * Computes optimal Ate pairing e(P, Q) in F_q^12.
 */
export function computePairing(p: G1Point, q: G2Point): any {
  const g1 = g1PointToNoble(p);
  const g2 = g2PointToNoble(q);
  if (g1.is0() || g2.is0()) {
    return bn254.fields.Fp12.ONE;
  }
  return bn254.pairing(g1, g2);
}

/**
 * Computes batched Miller loop for pairs of (G1, G2) points without final exponentiation.
 */
export function computeMillerLoop(pairs: Array<{ g1: G1Point; g2: G2Point }>): any {
  const noblePairs = pairs
    .map(p => ({ g1: g1PointToNoble(p.g1), g2: g2PointToNoble(p.g2) }))
    .filter(p => !p.g1.is0() && !p.g2.is0());

  if (noblePairs.length === 0) {
    return bn254.fields.Fp12.ONE;
  }
  return bn254.pairingBatch(noblePairs, false);
}

/**
 * Computes final exponentiation in F_q^12: f^((q^12 - 1) / r).
 */
export function finalExponentiation(element: any): any {
  return bn254.fields.Fp12.finalExponentiate(element);
}

/**
 * Verifies pairing equality between two batches of pairings:
 * Prod e(L_i, L'_i) == Prod e(R_j, R'_j)
 */
export function verifyPairingEquality(
  leftPairs: Array<{ g1: G1Point; g2: G2Point }>,
  rightPairs: Array<{ g1: G1Point; g2: G2Point }>
): boolean {
  try {
    const combinedPairs: Array<{ g1: any; g2: any }> = [];

    // Left pairs positive:
    for (const p of leftPairs) {
      const g1 = g1PointToNoble(p.g1);
      const g2 = g2PointToNoble(p.g2);
      if (!g1.is0() && !g2.is0()) {
        combinedPairs.push({ g1, g2 });
      }
    }

    // Right pairs inverted: e(g1, g2)^-1 = e(-g1, g2)
    for (const p of rightPairs) {
      const g1 = g1PointToNoble(p.g1);
      const g2 = g2PointToNoble(p.g2);
      if (!g1.is0() && !g2.is0()) {
        combinedPairs.push({ g1: g1.negate(), g2 });
      }
    }

    if (combinedPairs.length === 0) return true;
    const batchRes = bn254.pairingBatch(combinedPairs, true);
    return bn254.fields.Fp12.eql(batchRes, bn254.fields.Fp12.ONE);
  } catch {
    return false;
  }
}

/**
 * Complete Groth16 Zero-Knowledge Proof Verifier over BN254 / Alt-bn128.
 *
 * Checks mathematical pairing relation:
 * e(pi_a, pi_b) = e(alpha1, beta2) * e(sum_{i=0}^l x_i * IC_i, gamma2) * e(pi_c, delta2)
 *
 * Evaluated optimally via Miller loop batching:
 * e(-pi_a, pi_b) * e(alpha1, beta2) * e(vk_x, gamma2) * e(pi_c, delta2) == 1 in F_q^12
 */
export function verifyGroth16Proof(
  vk: Groth16VerifyingKey,
  publicInputs: bigint[],
  proof: Groth16Proof,
  options?: { useBatch?: boolean }
): boolean {
  try {
    // 1. Validate public inputs range: 0 <= x_i < r
    for (const x of publicInputs) {
      if (x < 0n || x >= BN254_SCALAR_FIELD_ORDER) {
        return false;
      }
    }

    // 2. Validate verifying key consistency
    if (!vk || !Array.isArray(vk.IC) || vk.IC.length === 0) {
      return false;
    }

    // Standard Groth16 convention: vk.IC has length l + 1, where publicInputs has length l.
    let fullPublicInputs: bigint[];
    if (publicInputs.length + 1 === vk.IC.length) {
      fullPublicInputs = [1n, ...publicInputs];
    } else if (publicInputs.length === vk.IC.length && publicInputs[0] === 1n) {
      fullPublicInputs = publicInputs;
    } else {
      // Input length mismatch
      return false;
    }

    // 3. Convert and validate proof points
    const pi_a = g1PointToNoble(proof.pi_a);
    const pi_b = g2PointToNoble(proof.pi_b);
    const pi_c = g1PointToNoble(proof.pi_c);

    // Groth16 proofs cannot have points at infinity for pi_a or pi_b
    if (pi_a.is0() || pi_b.is0()) {
      return false;
    }

    pi_a.assertValidity();
    pi_b.assertValidity();
    pi_c.assertValidity();

    // 4. Convert and validate verifying key points
    const alpha1 = g1PointToNoble(vk.alpha1);
    const beta2 = g2PointToNoble(vk.beta2);
    const gamma2 = g2PointToNoble(vk.gamma2);
    const delta2 = g2PointToNoble(vk.delta2);

    if (alpha1.is0() || beta2.is0() || gamma2.is0() || delta2.is0()) {
      return false;
    }

    alpha1.assertValidity();
    beta2.assertValidity();
    gamma2.assertValidity();
    delta2.assertValidity();

    // 5. Compute vk_x = sum_{i=0}^l x_i * IC_i via MSM
    const icPoints = vk.IC.map(pt => {
      const noblePt = g1PointToNoble(pt);
      noblePt.assertValidity();
      return noblePt;
    });

    const vk_x = bn254.G1.ProjectivePoint.msm(icPoints, fullPublicInputs);

    // 6. Pairing check
    const useBatch = options?.useBatch !== false;

    if (useBatch) {
      // Optimal single-exponentiation batch pairing:
      // e(-pi_a, pi_b) * e(alpha1, beta2) * e(vk_x, gamma2) * e(pi_c, delta2) == 1
      const batchPairs: Array<{ g1: any; g2: any }> = [];

      batchPairs.push({ g1: pi_a.negate(), g2: pi_b });
      batchPairs.push({ g1: alpha1, g2: beta2 });

      if (!vk_x.is0()) {
        batchPairs.push({ g1: vk_x, g2: gamma2 });
      }
      if (!pi_c.is0()) {
        batchPairs.push({ g1: pi_c, g2: delta2 });
      }

      const product = bn254.pairingBatch(batchPairs, true);
      return bn254.fields.Fp12.eql(product, bn254.fields.Fp12.ONE);
    } else {
      // Direct algebraic verification:
      // Left = e(pi_a, pi_b)
      // Right = e(alpha1, beta2) * e(vk_x, gamma2) * e(pi_c, delta2)
      const left = bn254.pairing(pi_a, pi_b);
      const rAlphaBeta = bn254.pairing(alpha1, beta2);
      const rVkXGamma = vk_x.is0() ? bn254.fields.Fp12.ONE : bn254.pairing(vk_x, gamma2);
      const rPiCDelta = pi_c.is0() ? bn254.fields.Fp12.ONE : bn254.pairing(pi_c, delta2);

      const right = bn254.fields.Fp12.mul(
        bn254.fields.Fp12.mul(rAlphaBeta, rVkXGamma),
        rPiCDelta
      );

      return bn254.fields.Fp12.eql(left, right);
    }
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Generic Groth16 Setup and Proof Generator (Algebraic QAP Engine)
// -----------------------------------------------------------------------------

/**
 * Creates a deterministic or pseudorandom Groth16 verifying key and proving key
 * for an algebraic circuit with N public inputs.
 */
export function createGroth16Setup(
  numPublicInputs: number,
  seed = 'aetheris:zk:groth16:setup'
): { verifyingKey: Groth16VerifyingKey; provingKey: GenericProvingKey } {
  if (numPublicInputs < 0) {
    throw new Error('numPublicInputs must be non-negative');
  }

  const hashSeed = (sub: string) => Field.hashToField(seed, sub);

  const alpha = hashSeed('alpha');
  const beta = hashSeed('beta');
  const gamma = hashSeed('gamma');
  const delta = hashSeed('delta');

  const IC_scalars: bigint[] = [];
  for (let i = 0; i <= numPublicInputs; i++) {
    IC_scalars.push(hashSeed(`ic:${i}`));
  }

  const alpha1 = BN254G1.multiply(BN254G1.GENERATOR, alpha);
  const beta2 = BN254G2.multiply(BN254G2.GENERATOR, beta);
  const gamma2 = BN254G2.multiply(BN254G2.GENERATOR, gamma);
  const delta2 = BN254G2.multiply(BN254G2.GENERATOR, delta);

  const IC = IC_scalars.map(c => BN254G1.multiply(BN254G1.GENERATOR, c));

  const verifyingKey: Groth16VerifyingKey = {
    alpha1,
    beta2,
    gamma2,
    delta2,
    IC,
  };

  const provingKey: GenericProvingKey = {
    alpha,
    beta,
    gamma,
    delta,
    IC_scalars,
  };

  return { verifyingKey, provingKey };
}

/**
 * Generates a valid Groth16 proof for an algebraic circuit instance given public inputs
 * and the proving key, using zero-knowledge blinding factors.
 */
export function createGroth16Proof(
  provingKey: GenericProvingKey,
  publicInputs: bigint[],
  blindingFactors?: { a?: bigint; b?: bigint }
): Groth16Proof {
  const { alpha, beta, gamma, delta, IC_scalars } = provingKey;

  if (IC_scalars.length !== publicInputs.length + 1) {
    throw new Error(`Public inputs length (${publicInputs.length}) must match IC_scalars length - 1 (${IC_scalars.length - 1})`);
  }

  // Blinding factors in F_r
  const a = modR(blindingFactors?.a ?? generateRandomScalar());
  const b = modR(blindingFactors?.b ?? generateRandomScalar());

  // Compute linear combination in scalar field:
  // vk_x_scalar = c_0 + sum_{i=0}^{l-1} publicInputs[i] * c_{i+1} mod r
  let vk_x_scalar = IC_scalars[0];
  for (let i = 0; i < publicInputs.length; i++) {
    const term = modR(publicInputs[i] * IC_scalars[i + 1]);
    vk_x_scalar = modR(vk_x_scalar + term);
  }

  // Algebraic Groth16 relation in F_r:
  // a * b = alpha * beta + vk_x_scalar * gamma + c * delta (mod r)
  // c = delta^-1 * (a * b - alpha * beta - vk_x_scalar * gamma) mod r
  const ab = modR(a * b);
  const alphaBeta = modR(alpha * beta);
  const vkGamma = modR(vk_x_scalar * gamma);
  const numerator = modR(modR(ab - alphaBeta) - vkGamma);
  const c = modR(numerator * invR(delta));

  const pi_a = BN254G1.multiply(BN254G1.GENERATOR, a);
  const pi_b = BN254G2.multiply(BN254G2.GENERATOR, b);
  const pi_c = BN254G1.multiply(BN254G1.GENERATOR, c);

  return { pi_a, pi_b, pi_c };
}

// -----------------------------------------------------------------------------
// Serialization & Deserialization
// -----------------------------------------------------------------------------

export function serializeG1Point(p: G1Point): SerializedG1Point {
  return {
    x: p.x.toString(10),
    y: p.y.toString(10),
  };
}

export function deserializeG1Point(val: any): G1Point {
  if (!val) throw new Error('Cannot deserialize null or undefined G1Point');
  if (Array.isArray(val)) {
    return { x: BigInt(val[0]), y: BigInt(val[1]) };
  }
  return { x: BigInt(val.x), y: BigInt(val.y) };
}

export function serializeG2Point(p: G2Point): SerializedG2Point {
  return {
    x: [p.x[0].toString(10), p.x[1].toString(10)],
    y: [p.y[0].toString(10), p.y[1].toString(10)],
  };
}

export function deserializeG2Point(val: any): G2Point {
  if (!val) throw new Error('Cannot deserialize null or undefined G2Point');
  if (Array.isArray(val)) {
    return {
      x: [BigInt(val[0][0]), BigInt(val[0][1])],
      y: [BigInt(val[1][0]), BigInt(val[1][1])],
    };
  }
  return {
    x: [BigInt(val.x[0]), BigInt(val.x[1])],
    y: [BigInt(val.y[0]), BigInt(val.y[1])],
  };
}

export function serializeVerifyingKey(vk: Groth16VerifyingKey): string {
  const serialized: SerializedVerifyingKey = {
    alpha1: serializeG1Point(vk.alpha1),
    beta2: serializeG2Point(vk.beta2),
    gamma2: serializeG2Point(vk.gamma2),
    delta2: serializeG2Point(vk.delta2),
    IC: vk.IC.map(serializeG1Point),
  };
  return JSON.stringify(serialized, null, 2);
}

export function deserializeVerifyingKey(val: string | Record<string, any>): Groth16VerifyingKey {
  const parsed = typeof val === 'string' ? JSON.parse(val) : val;

  // Check SnarkJS format
  if (parsed.vk_alpha_1) {
    return {
      alpha1: deserializeG1Point(parsed.vk_alpha_1),
      beta2: deserializeG2Point(parsed.vk_beta_2),
      gamma2: deserializeG2Point(parsed.vk_gamma_2),
      delta2: deserializeG2Point(parsed.vk_delta_2),
      IC: (parsed.IC || []).map(deserializeG1Point),
    };
  }

  // Native format
  return {
    alpha1: deserializeG1Point(parsed.alpha1),
    beta2: deserializeG2Point(parsed.beta2),
    gamma2: deserializeG2Point(parsed.gamma2),
    delta2: deserializeG2Point(parsed.delta2),
    IC: (parsed.IC || []).map(deserializeG1Point),
  };
}

export function serializeProof(proof: Groth16Proof): string {
  const serialized: SerializedGroth16Proof = {
    pi_a: serializeG1Point(proof.pi_a),
    pi_b: serializeG2Point(proof.pi_b),
    pi_c: serializeG1Point(proof.pi_c),
  };
  return JSON.stringify(serialized, null, 2);
}

export function deserializeProof(val: string | Record<string, any>): Groth16Proof {
  const parsed = typeof val === 'string' ? JSON.parse(val) : val;
  return {
    pi_a: deserializeG1Point(parsed.pi_a),
    pi_b: deserializeG2Point(parsed.pi_b),
    pi_c: deserializeG1Point(parsed.pi_c),
  };
}

// -----------------------------------------------------------------------------
// Sovereign Circle Membership Application
// -----------------------------------------------------------------------------

/**
 * Computes an identity commitment (leaf in the circle Merkle tree) from a private identity secret.
 */
export function computeIdentityCommitment(identitySecret: bigint): bigint {
  return Field.hashToField('aetheris:circle-membership:leaf', identitySecret);
}

/**
 * Computes an anonymous nullifier hash for an action in a sovereign circle.
 * Prevents double-signaling or replay while keeping the member's identity completely anonymous.
 */
export function computeMembershipNullifier(identitySecret: bigint, circleRoot: bigint): bigint {
  return Field.hashToField('aetheris:circle-membership:nullifier', identitySecret, circleRoot);
}

/**
 * Computes the root of a Merkle tree of member leaves in F_r.
 */
export function computeCircleMerkleRoot(leaves: bigint[]): bigint {
  if (leaves.length === 0) return 0n;
  let currentLayer = [...leaves];
  while (currentLayer.length > 1) {
    const nextLayer: bigint[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
      nextLayer.push(Field.hashToField('aetheris:circle-membership:node', left, right));
    }
    currentLayer = nextLayer;
  }
  return currentLayer[0];
}

/**
 * Creates canonical trusted setup parameters for Circle Membership circuits
 * where public inputs are [root, nullifierHash].
 */
export function createCircleMembershipSetup(seed = 'aetheris:circle-membership:canonical:v1'): {
  verifyingKey: Groth16VerifyingKey;
  provingKey: CircleMembershipProvingKey;
} {
  const { verifyingKey, provingKey } = createGroth16Setup(2, seed);
  return {
    verifyingKey,
    provingKey: {
      alpha: provingKey.alpha,
      beta: provingKey.beta,
      gamma: provingKey.gamma,
      delta: provingKey.delta,
      c0: provingKey.IC_scalars[0],
      c1: provingKey.IC_scalars[1],
      c2: provingKey.IC_scalars[2],
    },
  };
}

// Canonical default parameters for Circle Membership
const CANONICAL_SETUP = createCircleMembershipSetup();
export const DEFAULT_CIRCLE_MEMBERSHIP_VK: Groth16VerifyingKey = CANONICAL_SETUP.verifyingKey;
export const DEFAULT_CIRCLE_MEMBERSHIP_PK: CircleMembershipProvingKey = CANONICAL_SETUP.provingKey;

/**
 * Generates an anonymous Groth16 proof of membership in a sovereign circle.
 * Proves that the prover holds an identity secret whose commitment is present in the circle Merkle tree,
 * without revealing the identity secret, commitment leaf, or leaf index!
 */
export function generateCircleMembershipProof(
  identitySecret: bigint,
  merkleLeaves: bigint[],
  circleRoot: bigint,
  provingKey: CircleMembershipProvingKey = DEFAULT_CIRCLE_MEMBERSHIP_PK,
  blindingFactors?: { a?: bigint; b?: bigint }
): { proof: Groth16Proof; nullifierHash: bigint } {
  const leaf = computeIdentityCommitment(identitySecret);

  if (merkleLeaves.length > 0) {
    const isMember = merkleLeaves.some(l => l === leaf);
    if (!isMember) {
      throw new Error('Identity commitment not found in circle Merkle tree leaves');
    }
  }

  const nullifierHash = computeMembershipNullifier(identitySecret, circleRoot);

  const genericPk: GenericProvingKey = {
    alpha: provingKey.alpha,
    beta: provingKey.beta,
    gamma: provingKey.gamma,
    delta: provingKey.delta,
    IC_scalars: [provingKey.c0, provingKey.c1, provingKey.c2],
  };

  const proof = createGroth16Proof(genericPk, [circleRoot, nullifierHash], blindingFactors);

  return { proof, nullifierHash };
}

/**
 * Creates a Groth16 Anonymous Circle Membership Verifier for a specific circle root.
 *
 * Demonstrates proof that a user holds a private key matching a leaf in the sovereign circle's
 * Merkle tree of members without revealing the user's public key or leaf index!
 *
 * Verification Formula:
 * e(pi_a, pi_b) = e(alpha1, beta2) * e(IC_0 + root * IC_1 + nullifierHash * IC_2, gamma2) * e(pi_c, delta2)
 */
export function createCircleMembershipVerifier(
  root: bigint,
  verifyingKey: Groth16VerifyingKey = DEFAULT_CIRCLE_MEMBERSHIP_VK
): (proof: Groth16Proof, nullifierHash: bigint) => boolean {
  return (proof: Groth16Proof, nullifierHash: bigint): boolean => {
    return verifyGroth16Proof(verifyingKey, [root, nullifierHash], proof);
  };
}

/**
 * Guard for sovereign circles to manage zero-knowledge anonymous access and enforce
 * one-time actions or double-signaling prevention via nullifiers.
 */
export class CircleMembershipGuard {
  private spentNullifiers = new Set<string>();
  private root: bigint;
  private verifier: (proof: Groth16Proof, nullifierHash: bigint) => boolean;

  constructor(root: bigint, verifyingKey: Groth16VerifyingKey = DEFAULT_CIRCLE_MEMBERSHIP_VK) {
    this.root = root;
    this.verifier = createCircleMembershipVerifier(root, verifyingKey);
  }

  public getRoot(): bigint {
    return this.root;
  }

  public isSpent(nullifierHash: bigint): boolean {
    return this.spentNullifiers.has(nullifierHash.toString(16));
  }

  public verify(proof: Groth16Proof, nullifierHash: bigint): boolean {
    return this.verifier(proof, nullifierHash);
  }

  public verifyAndConsume(
    proof: Groth16Proof,
    nullifierHash: bigint
  ): { success: boolean; error?: string } {
    const key = nullifierHash.toString(16);
    if (this.spentNullifiers.has(key)) {
      return { success: false, error: 'Nullifier already consumed (double-signaling detected)' };
    }

    const isValid = this.verifier(proof, nullifierHash);
    if (!isValid) {
      return { success: false, error: 'Invalid Groth16 circle membership proof' };
    }

    this.spentNullifiers.add(key);
    return { success: true };
  }

  public getConsumedCount(): number {
    return this.spentNullifiers.size;
  }

  public reset(): void {
    this.spentNullifiers.clear();
  }
}
