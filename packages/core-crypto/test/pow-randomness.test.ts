import { describe, it, expect, vi } from 'vitest';
import { PoWChallengeEngine } from '../src/pow-challenge.js';

describe('Proof-of-Work (PoW) Cryptographic Randomness & Entropy Suite', () => {
  it('does NOT invoke Math.random() during challenge generation', () => {
    const mathRandomSpy = vi.spyOn(Math, 'random');
    const engine = new PoWChallengeEngine();

    engine.generateChallenge(2);

    expect(mathRandomSpy).not.toHaveBeenCalled();
    mathRandomSpy.mockRestore();
  });

  it('generates unique challengeId and high-entropy 32-hex (16-byte) salt on each run', () => {
    const engine = new PoWChallengeEngine();
    const NUM_SAMPLES = 100;
    const challengeIds = new Set<string>();
    const salts = new Set<string>();

    for (let i = 0; i < NUM_SAMPLES; i++) {
      const challenge = engine.generateChallenge(2);

      // Verify format
      expect(challenge.challengeId).toMatch(/^pow_\d+_[0-9a-fA-F]{16}$/);
      expect(challenge.salt).toMatch(/^[0-9a-fA-F]{32}$/);
      expect(challenge.prefix).toMatch(/^aeth_pow_\d+$/);

      challengeIds.add(challenge.challengeId);
      salts.add(challenge.salt);
    }

    // Zero collisions in 100 consecutive generations
    expect(challengeIds.size).toBe(NUM_SAMPLES);
    expect(salts.size).toBe(NUM_SAMPLES);
  });

  it('demonstrates high Shannon entropy across generated salt bytes', () => {
    const engine = new PoWChallengeEngine();
    const NUM_SAMPLES = 200;
    const byteCounts = new Uint32Array(256);
    let totalBytes = 0;

    for (let i = 0; i < NUM_SAMPLES; i++) {
      const challenge = engine.generateChallenge(2);
      const saltHex = challenge.salt;
      for (let j = 0; j < saltHex.length; j += 2) {
        const byte = parseInt(saltHex.substring(j, j + 2), 16);
        byteCounts[byte]++;
        totalBytes++;
      }
    }

    // Compute Shannon entropy: H = - sum(p_i * log2(p_i))
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (byteCounts[i] > 0) {
        const p = byteCounts[i] / totalBytes;
        entropy -= p * Math.log2(p);
      }
    }

    // Theoretical maximum for 256 states is 8.0 bits/byte.
    // With 3200 bytes, random data has entropy > 7.3 bits/byte.
    expect(entropy).toBeGreaterThan(7.0);
  });

  it('solves, verifies, and single-use consumes the PoW challenge', async () => {
    const engine = new PoWChallengeEngine();
    const challenge = engine.generateChallenge(2, 30000); // 2 leading zeros

    const solution = await PoWChallengeEngine.solve(challenge);
    expect(solution.challengeId).toBe(challenge.challengeId);
    expect(solution.hash.startsWith('00')).toBe(true);

    // Initial verification succeeds
    const verification = await engine.verifySolution(solution);
    expect(verification.valid).toBe(true);

    // Double-spend / replay verification is rejected (challenge was consumed)
    const replayVerification = await engine.verifySolution(solution);
    expect(replayVerification.valid).toBe(false);
    expect(replayVerification.reason).toContain('Challenge not found or expired');
  });

  it('rejects tampered or forged PoW solutions', async () => {
    const engine = new PoWChallengeEngine();
    const challenge = engine.generateChallenge(2, 30000);

    const solution = await PoWChallengeEngine.solve(challenge);

    // Alter nonce
    const tamperedSolution = {
      ...solution,
      nonce: solution.nonce + 999999,
    };

    const result = await engine.verifySolution(tamperedSolution);
    expect(result.valid).toBe(false);
  });
});
