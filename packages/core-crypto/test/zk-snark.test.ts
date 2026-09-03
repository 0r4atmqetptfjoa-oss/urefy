import { describe, it, expect } from 'vitest';
import {
  BN254_BASE_FIELD_ORDER,
  BN254_SCALAR_FIELD_ORDER,
  BN254_Q,
  BN254_R,
  BN254G1,
  BN254G2,
  computePairing,
  verifyPairingEquality,
  verifyGroth16Proof,
  createGroth16Setup,
  createGroth16Proof,
  serializeVerifyingKey,
  deserializeVerifyingKey,
  serializeProof,
  deserializeProof,
  computeIdentityCommitment,
  computeMembershipNullifier,
  computeCircleMerkleRoot,
  createCircleMembershipVerifier,
  generateCircleMembershipProof,
  CircleMembershipGuard,
  DEFAULT_CIRCLE_MEMBERSHIP_VK,
  DEFAULT_CIRCLE_MEMBERSHIP_PK,
  G1Point,
  G2Point,
  Groth16Proof,
} from '../src/zk-snark.js';

describe('BN254 / Alt-bn128 Cryptographic Primitives', () => {
  it('verifies exact mathematical field order constants', () => {
    expect(BN254_BASE_FIELD_ORDER).toBe(
      21888242871839275222246405745257275088696311157297823662689037894645226208583n
    );
    expect(BN254_SCALAR_FIELD_ORDER).toBe(
      21888242871839275222246405745257275088548364400416034343698204186575808495617n
    );
    expect(BN254_Q).toBe(BN254_BASE_FIELD_ORDER);
    expect(BN254_R).toBe(BN254_SCALAR_FIELD_ORDER);
  });

  it('performs G1 point operations: generator, addition, doubling, subtraction, negation, and zero', () => {
    const G = BN254G1.GENERATOR;
    expect(G.x).toBe(1n);
    expect(G.y).toBe(2n);
    expect(BN254G1.isValid(G)).toBe(true);

    // G + 0 = G
    const gPlusZero = BN254G1.add(G, BN254G1.ZERO);
    expect(BN254G1.equals(gPlusZero, G)).toBe(true);

    // 0 + G = G
    const zeroPlusG = BN254G1.add(BN254G1.ZERO, G);
    expect(BN254G1.equals(zeroPlusG, G)).toBe(true);

    // G + G = 2 * G
    const gDouble = BN254G1.add(G, G);
    const gMul2 = BN254G1.multiply(G, 2n);
    expect(BN254G1.equals(gDouble, gMul2)).toBe(true);
    expect(BN254G1.isValid(gDouble)).toBe(true);

    // G - G = ZERO
    const gSubG = BN254G1.subtract(G, G);
    expect(BN254G1.isZero(gSubG)).toBe(true);

    // G + (-G) = ZERO
    const negG = BN254G1.negate(G);
    const gPlusNegG = BN254G1.add(G, negG);
    expect(BN254G1.isZero(gPlusNegG)).toBe(true);

    // 0 * G = ZERO
    const gMul0 = BN254G1.multiply(G, 0n);
    expect(BN254G1.isZero(gMul0)).toBe(true);

    // r * G = ZERO (subgroup order)
    const gMulR = BN254G1.multiply(G, BN254_SCALAR_FIELD_ORDER);
    expect(BN254G1.isZero(gMulR)).toBe(true);

    // (r + 3) * G = 3 * G
    const gMulRPlus3 = BN254G1.multiply(G, BN254_SCALAR_FIELD_ORDER + 3n);
    const gMul3 = BN254G1.multiply(G, 3n);
    expect(BN254G1.equals(gMulRPlus3, gMul3)).toBe(true);
  });

  it('performs G1 Multi-Scalar Multiplication (MSM)', () => {
    const G = BN254G1.GENERATOR;
    const P1 = BN254G1.multiply(G, 3n);
    const P2 = BN254G1.multiply(G, 5n);

    // MSM([P1, P2], [7, 11]) == 7*P1 + 11*P2 = (7*3 + 11*5)*G = (21 + 55)*G = 76*G
    const msmRes = BN254G1.msm([P1, P2], [7n, 11n]);
    const expected = BN254G1.multiply(G, 76n);
    expect(BN254G1.equals(msmRes, expected)).toBe(true);

    // MSM with 0 scalar handles correctly
    const msmZero = BN254G1.msm([P1, P2], [0n, 11n]);
    const expectedZero = BN254G1.multiply(P2, 11n);
    expect(BN254G1.equals(msmZero, expectedZero)).toBe(true);

    // Empty MSM returns ZERO
    expect(BN254G1.isZero(BN254G1.msm([], []))).toBe(true);
  });

  it('rejects invalid points off the G1 curve', () => {
    const invalidPt: G1Point = { x: 1n, y: 1n }; // y^2 = 1 != 1^3 + 3 = 4
    expect(BN254G1.isValid(invalidPt)).toBe(false);
  });

  it('performs G2 point operations: generator, addition, scalar multiplication, and negation', () => {
    const G2Gen = BN254G2.GENERATOR;
    expect(BN254G2.isValid(G2Gen)).toBe(true);

    // G2 + ZERO = G2
    const gPlusZero = BN254G2.add(G2Gen, BN254G2.ZERO);
    expect(BN254G2.equals(gPlusZero, G2Gen)).toBe(true);

    // G2 + G2 = 2 * G2
    const g2Double = BN254G2.add(G2Gen, G2Gen);
    const g2Mul2 = BN254G2.multiply(G2Gen, 2n);
    expect(BN254G2.equals(g2Double, g2Mul2)).toBe(true);

    // G2 - G2 = ZERO
    const g2Sub = BN254G2.subtract(G2Gen, G2Gen);
    expect(BN254G2.isZero(g2Sub)).toBe(true);

    // G2 + (-G2) = ZERO
    const negG2 = BN254G2.negate(G2Gen);
    const g2PlusNeg = BN254G2.add(G2Gen, negG2);
    expect(BN254G2.isZero(g2PlusNeg)).toBe(true);

    // r * G2 = ZERO (subgroup order)
    const g2MulR = BN254G2.multiply(G2Gen, BN254_SCALAR_FIELD_ORDER);
    expect(BN254G2.isZero(g2MulR)).toBe(true);
  });

  it('rejects invalid points off the G2 curve', () => {
    const invalidPt: G2Point = { x: [1n, 2n], y: [3n, 4n] };
    expect(BN254G2.isValid(invalidPt)).toBe(false);
  });

  it('verifies bilinear pairing properties on BN254', () => {
    const G1 = BN254G1.GENERATOR;
    const G2 = BN254G2.GENERATOR;

    const a = 5n;
    const b = 7n;

    const aG1 = BN254G1.multiply(G1, a);
    const bG2 = BN254G2.multiply(G2, b);

    // Bilinearity: e(a*G1, b*G2) == e(ab*G1, G2)
    const abG1 = BN254G1.multiply(G1, a * b);
    const isBilinear = verifyPairingEquality(
      [{ g1: aG1, g2: bG2 }],
      [{ g1: abG1, g2: G2 }]
    );
    expect(isBilinear).toBe(true);

    // e(G1, G2) * e(-G1, G2) = 1
    const negG1 = BN254G1.negate(G1);
    const isIdentity = verifyPairingEquality(
      [{ g1: G1, g2: G2 }, { g1: negG1, g2: G2 }],
      []
    );
    expect(isIdentity).toBe(true);
  });
});

describe('Groth16 Verifying Key and Proof Serialization', () => {
  it('serializes and deserializes verifying keys with complete fidelity', () => {
    const { verifyingKey } = createGroth16Setup(2, 'test-serialization-key');
    const jsonStr = serializeVerifyingKey(verifyingKey);

    expect(typeof jsonStr).toBe('string');
    expect(jsonStr).toContain('"alpha1"');
    expect(jsonStr).toContain('"beta2"');
    expect(jsonStr).toContain('"gamma2"');
    expect(jsonStr).toContain('"delta2"');
    expect(jsonStr).toContain('"IC"');

    const recovered = deserializeVerifyingKey(jsonStr);

    expect(BN254G1.equals(recovered.alpha1, verifyingKey.alpha1)).toBe(true);
    expect(BN254G2.equals(recovered.beta2, verifyingKey.beta2)).toBe(true);
    expect(BN254G2.equals(recovered.gamma2, verifyingKey.gamma2)).toBe(true);
    expect(BN254G2.equals(recovered.delta2, verifyingKey.delta2)).toBe(true);
    expect(recovered.IC.length).toBe(verifyingKey.IC.length);

    for (let i = 0; i < verifyingKey.IC.length; i++) {
      expect(BN254G1.equals(recovered.IC[i], verifyingKey.IC[i])).toBe(true);
    }
  });

  it('supports SnarkJS JSON format for verifying keys', () => {
    const G1 = BN254G1.GENERATOR;
    const G2 = BN254G2.GENERATOR;

    const snarkJsVk = {
      protocol: 'groth16',
      curve: 'bn128',
      nPublic: 1,
      vk_alpha_1: [G1.x.toString(), G1.y.toString(), '1'],
      vk_beta_2: [
        [G2.x[1].toString(), G2.x[0].toString()],
        [G2.y[1].toString(), G2.y[0].toString()],
        ['1', '0'],
      ],
      vk_gamma_2: [
        [G2.x[1].toString(), G2.x[0].toString()],
        [G2.y[1].toString(), G2.y[0].toString()],
        ['1', '0'],
      ],
      vk_delta_2: [
        [G2.x[1].toString(), G2.x[0].toString()],
        [G2.y[1].toString(), G2.y[0].toString()],
        ['1', '0'],
      ],
      IC: [[G1.x.toString(), G1.y.toString(), '1']],
    };

    const parsed = deserializeVerifyingKey(JSON.stringify(snarkJsVk));
    expect(BN254G1.equals(parsed.alpha1, G1)).toBe(true);
    expect(BN254G2.equals(parsed.beta2, G2)).toBe(true);
    expect(BN254G2.equals(parsed.gamma2, G2)).toBe(true);
    expect(BN254G2.equals(parsed.delta2, G2)).toBe(true);
    expect(parsed.IC.length).toBe(1);
    expect(BN254G1.equals(parsed.IC[0], G1)).toBe(true);
  });

  it('serializes and deserializes proofs with complete fidelity', () => {
    const { provingKey } = createGroth16Setup(1, 'test-proof-serialization');
    const publicInputs = [42n];
    const proof = createGroth16Proof(provingKey, publicInputs);

    const jsonStr = serializeProof(proof);
    expect(typeof jsonStr).toBe('string');
    expect(jsonStr).toContain('"pi_a"');
    expect(jsonStr).toContain('"pi_b"');
    expect(jsonStr).toContain('"pi_c"');

    const recovered = deserializeProof(jsonStr);
    expect(BN254G1.equals(recovered.pi_a, proof.pi_a)).toBe(true);
    expect(BN254G2.equals(recovered.pi_b, proof.pi_b)).toBe(true);
    expect(BN254G1.equals(recovered.pi_c, proof.pi_c)).toBe(true);
  });
});

describe('Groth16 Zero-Knowledge Proof Verifier Engine', () => {
  it('verifies a valid Groth16 proof returning true in both batch and non-batch modes', () => {
    const { verifyingKey, provingKey } = createGroth16Setup(2, 'algebraic-test-setup-1');
    const publicInputs = [100n, 200n];

    const proof = createGroth16Proof(provingKey, publicInputs);

    // Batch pairing verification
    const verifiedBatch = verifyGroth16Proof(verifyingKey, publicInputs, proof, { useBatch: true });
    expect(verifiedBatch).toBe(true);

    // Direct multi-pairing verification
    const verifiedDirect = verifyGroth16Proof(verifyingKey, publicInputs, proof, { useBatch: false });
    expect(verifiedDirect).toBe(true);
  });

  it('rejects tampered pi_a proof point', () => {
    const { verifyingKey, provingKey } = createGroth16Setup(1, 'tamper-test-setup');
    const publicInputs = [777n];
    const proof = createGroth16Proof(provingKey, publicInputs);

    const tamperedProof: Groth16Proof = {
      ...proof,
      pi_a: BN254G1.multiply(proof.pi_a, 2n),
    };

    expect(verifyGroth16Proof(verifyingKey, publicInputs, tamperedProof)).toBe(false);
  });

  it('rejects tampered pi_b proof point', () => {
    const { verifyingKey, provingKey } = createGroth16Setup(1, 'tamper-test-setup');
    const publicInputs = [777n];
    const proof = createGroth16Proof(provingKey, publicInputs);

    const tamperedProof: Groth16Proof = {
      ...proof,
      pi_b: BN254G2.multiply(proof.pi_b, 2n),
    };

    expect(verifyGroth16Proof(verifyingKey, publicInputs, tamperedProof)).toBe(false);
  });

  it('rejects tampered pi_c proof point', () => {
    const { verifyingKey, provingKey } = createGroth16Setup(1, 'tamper-test-setup');
    const publicInputs = [777n];
    const proof = createGroth16Proof(provingKey, publicInputs);

    const tamperedProof: Groth16Proof = {
      ...proof,
      pi_c: BN254G1.multiply(proof.pi_c, 2n),
    };

    expect(verifyGroth16Proof(verifyingKey, publicInputs, tamperedProof)).toBe(false);
  });

  it('rejects altered public inputs', () => {
    const { verifyingKey, provingKey } = createGroth16Setup(2, 'altered-input-setup');
    const publicInputs = [12345n, 67890n];
    const proof = createGroth16Proof(provingKey, publicInputs);

    // Alter first public input
    expect(verifyGroth16Proof(verifyingKey, [99999n, 67890n], proof)).toBe(false);

    // Alter second public input
    expect(verifyGroth16Proof(verifyingKey, [12345n, 99999n], proof)).toBe(false);

    // Swap public inputs
    expect(verifyGroth16Proof(verifyingKey, [67890n, 12345n], proof)).toBe(false);
  });

  it('rejects public inputs out of scalar field range (>= r)', () => {
    const { verifyingKey, provingKey } = createGroth16Setup(1, 'range-check-setup');
    const publicInputs = [42n];
    const proof = createGroth16Proof(provingKey, publicInputs);

    const outOfRangeInput = [BN254_SCALAR_FIELD_ORDER + 1n];
    expect(verifyGroth16Proof(verifyingKey, outOfRangeInput, proof)).toBe(false);

    const negativeInput = [-1n];
    expect(verifyGroth16Proof(verifyingKey, negativeInput, proof)).toBe(false);
  });

  it('rejects public input length mismatch', () => {
    const { verifyingKey, provingKey } = createGroth16Setup(2, 'dimension-setup');
    const proof = createGroth16Proof(provingKey, [10n, 20n]);

    // Passed 1 input instead of 2
    expect(verifyGroth16Proof(verifyingKey, [10n], proof)).toBe(false);

    // Passed 3 inputs instead of 2
    expect(verifyGroth16Proof(verifyingKey, [10n, 20n, 30n], proof)).toBe(false);
  });

  it('safely rejects off-curve proof points without throwing uncaught exceptions', () => {
    const { verifyingKey } = createGroth16Setup(1, 'safe-rejection-setup');
    const malformedProof: Groth16Proof = {
      pi_a: { x: 1n, y: 1n }, // not on curve
      pi_b: BN254G2.GENERATOR,
      pi_c: BN254G1.GENERATOR,
    };

    expect(verifyGroth16Proof(verifyingKey, [42n], malformedProof)).toBe(false);
  });

  it('rejects proof with point at infinity for pi_a or pi_b', () => {
    const { verifyingKey, provingKey } = createGroth16Setup(1, 'infinity-setup');
    const proof = createGroth16Proof(provingKey, [42n]);

    const zeroAProof: Groth16Proof = { ...proof, pi_a: BN254G1.ZERO };
    expect(verifyGroth16Proof(verifyingKey, [42n], zeroAProof)).toBe(false);

    const zeroBProof: Groth16Proof = { ...proof, pi_b: BN254G2.ZERO };
    expect(verifyGroth16Proof(verifyingKey, [42n], zeroBProof)).toBe(false);
  });
});

describe('Anonymous Sovereign Circle Membership ZK Verifier', () => {
  it('demonstrates zero-knowledge circle membership proof and verification', () => {
    // 1. Members create identity secrets and commitments
    const member1Secret = 1111111111111111111111111111111111111111111111111111111111111111n;
    const member2Secret = 2222222222222222222222222222222222222222222222222222222222222222n;
    const member3Secret = 3333333333333333333333333333333333333333333333333333333333333333n;

    const leaf1 = computeIdentityCommitment(member1Secret);
    const leaf2 = computeIdentityCommitment(member2Secret);
    const leaf3 = computeIdentityCommitment(member3Secret);

    const circleLeaves = [leaf1, leaf2, leaf3];

    // 2. Compute Sovereign Circle Merkle Root
    const circleRoot = computeCircleMerkleRoot(circleLeaves);
    expect(circleRoot).toBeGreaterThan(0n);
    expect(circleRoot).toBeLessThan(BN254_SCALAR_FIELD_ORDER);

    // 3. Create Circle Membership Verifier bound to circleRoot
    const verifier = createCircleMembershipVerifier(circleRoot);

    // 4. Member 2 generates anonymous membership proof
    const { proof, nullifierHash } = generateCircleMembershipProof(
      member2Secret,
      circleLeaves,
      circleRoot
    );

    expect(nullifierHash).toBeGreaterThan(0n);
    expect(BN254G1.isValid(proof.pi_a)).toBe(true);
    expect(BN254G2.isValid(proof.pi_b)).toBe(true);
    expect(BN254G1.isValid(proof.pi_c)).toBe(true);

    // 5. Circle Verifier accepts genuine proof
    const isValid = verifier(proof, nullifierHash);
    expect(isValid).toBe(true);

    // 6. Verifier rejects tampered nullifier hash
    const fakeNullifier = (nullifierHash + 1n) % BN254_SCALAR_FIELD_ORDER;
    expect(verifier(proof, fakeNullifier)).toBe(false);

    // 7. Verifier bound to different root rejects the proof
    const wrongRoot = (circleRoot + 100n) % BN254_SCALAR_FIELD_ORDER;
    const wrongVerifier = createCircleMembershipVerifier(wrongRoot);
    expect(wrongVerifier(proof, nullifierHash)).toBe(false);

    // 8. Verifier rejects tampered proof points
    const tamperedProof: Groth16Proof = {
      ...proof,
      pi_c: BN254G1.multiply(proof.pi_c, 3n),
    };
    expect(verifier(tamperedProof, nullifierHash)).toBe(false);
  });

  it('strictly rejects non-members from generating valid circle membership proofs', () => {
    const member1Secret = 101n;
    const member2Secret = 102n;
    const outsiderSecret = 999n;

    const circleLeaves = [
      computeIdentityCommitment(member1Secret),
      computeIdentityCommitment(member2Secret),
    ];
    const circleRoot = computeCircleMerkleRoot(circleLeaves);

    expect(() => {
      generateCircleMembershipProof(outsiderSecret, circleLeaves, circleRoot);
    }).toThrow('Identity commitment not found in circle Merkle tree leaves');
  });

  it('preserves zero-knowledge anonymity across multiple proofs from the same member', () => {
    const memberSecret = 8888888888888888888888888888888888888888888888888888888888888888n;
    const leaves = [computeIdentityCommitment(memberSecret)];
    const root = computeCircleMerkleRoot(leaves);
    const verifier = createCircleMembershipVerifier(root);

    // Generate proof 1
    const { proof: proof1, nullifierHash: nullifier1 } = generateCircleMembershipProof(
      memberSecret,
      leaves,
      root
    );

    // Generate proof 2 (blinding factors randomized by default)
    const { proof: proof2, nullifierHash: nullifier2 } = generateCircleMembershipProof(
      memberSecret,
      leaves,
      root
    );

    // Both proofs verify
    expect(verifier(proof1, nullifier1)).toBe(true);
    expect(verifier(proof2, nullifier2)).toBe(true);

    // Nullifiers match for the same circle root
    expect(nullifier1).toBe(nullifier2);

    // But proof points are completely different due to ZK blinding factors!
    expect(BN254G1.equals(proof1.pi_a, proof2.pi_a)).toBe(false);
    expect(BN254G2.equals(proof1.pi_b, proof2.pi_b)).toBe(false);
    expect(BN254G1.equals(proof1.pi_c, proof2.pi_c)).toBe(false);
  });

  it('CircleMembershipGuard enforces single-use nullifiers and detects double-signaling replay attacks', () => {
    const memberSecret = 54321n;
    const leaves = [computeIdentityCommitment(memberSecret)];
    const root = computeCircleMerkleRoot(leaves);

    const guard = new CircleMembershipGuard(root);
    expect(guard.getRoot()).toBe(root);
    expect(guard.getConsumedCount()).toBe(0);

    const { proof, nullifierHash } = generateCircleMembershipProof(
      memberSecret,
      leaves,
      root
    );

    expect(guard.isSpent(nullifierHash)).toBe(false);

    // First presentation succeeds
    const res1 = guard.verifyAndConsume(proof, nullifierHash);
    expect(res1.success).toBe(true);
    expect(res1.error).toBeUndefined();
    expect(guard.isSpent(nullifierHash)).toBe(true);
    expect(guard.getConsumedCount()).toBe(1);

    // Second presentation with the same nullifier is rejected (double-signaling detected)
    const res2 = guard.verifyAndConsume(proof, nullifierHash);
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('Nullifier already consumed');

    // Tampered proof rejected without consuming nullifier
    const unspentNullifier = 99999999n;
    const tamperedProof: Groth16Proof = {
      ...proof,
      pi_a: BN254G1.multiply(proof.pi_a, 2n),
    };
    const resTampered = guard.verifyAndConsume(tamperedProof, unspentNullifier);
    expect(resTampered.success).toBe(false);
    expect(resTampered.error).toContain('Invalid Groth16 circle membership proof');
    expect(guard.isSpent(unspentNullifier)).toBe(false);

    // Guard reset works
    guard.reset();
    expect(guard.getConsumedCount()).toBe(0);
    expect(guard.isSpent(nullifierHash)).toBe(false);
  });
});
