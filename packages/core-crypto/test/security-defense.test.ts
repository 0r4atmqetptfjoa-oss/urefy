import { describe, it, expect, beforeEach } from 'vitest';
import { NonceReplayGuard, SignedPayloadHeader } from '../src/nonce-guard.js';
import { PoWChallengeEngine, PoWChallenge } from '../src/pow-challenge.js';

describe('Aetheris Nonce Replay & PoW Anti-DDoS Defense Layer', () => {
  describe('NonceReplayGuard', () => {
    let guard: NonceReplayGuard;

    beforeEach(() => {
      guard = new NonceReplayGuard(30000, 100);
    });

    it('accepts a valid signed payload with fresh timestamp and unique nonce', () => {
      const now = Date.now();
      const header: SignedPayloadHeader = {
        nonce: NonceReplayGuard.generateNonce(),
        timestamp: now,
        senderFingerprint: 'peer_alpha_1',
      };

      const result = guard.verifyAndConsume(header, now);
      expect(result.valid).toBe(true);
      expect(guard.getActiveNonceCount()).toBe(1);
    });

    it('rejects a duplicate nonce from the same sender (replay attack mitigation)', () => {
      const now = Date.now();
      const nonce = NonceReplayGuard.generateNonce();
      const header: SignedPayloadHeader = {
        nonce,
        timestamp: now,
        senderFingerprint: 'peer_alpha_1',
      };

      const first = guard.verifyAndConsume(header, now);
      expect(first.valid).toBe(true);

      const replay = guard.verifyAndConsume(header, now);
      expect(replay.valid).toBe(false);
      expect(replay.reason).toContain('replay attack detected');
    });

    it('rejects payloads with expired or future-skewed timestamps beyond clock drift', () => {
      const now = Date.now();
      const expiredHeader: SignedPayloadHeader = {
        nonce: NonceReplayGuard.generateNonce(),
        timestamp: now - 35000, // 35 seconds old (limit is 30s)
        senderFingerprint: 'peer_alpha_1',
      };

      const result = guard.verifyAndConsume(expiredHeader, now);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('outside acceptable window');
    });

    it('generates 32-character hexadecimal nonces', () => {
      const nonce = NonceReplayGuard.generateNonce();
      expect(nonce).toHaveLength(32);
      expect(/^[0-9a-f]{32}$/.test(nonce)).toBe(true);
    });
  });

  describe('PoWChallengeEngine', () => {
    let powEngine: PoWChallengeEngine;

    beforeEach(() => {
      powEngine = new PoWChallengeEngine(60000);
    });

    it('generates a valid PoW challenge with specified difficulty', () => {
      const challenge = powEngine.generateChallenge(2);
      expect(challenge.challengeId).toBeDefined();
      expect(challenge.difficulty).toBe(2);
      expect(challenge.expiresAt).toBeGreaterThan(Date.now());
    });

    it('solves and verifies a PoW challenge successfully', async () => {
      // Difficulty 2 (starts with "00") - fast to solve in test
      const challenge = powEngine.generateChallenge(2);
      const solution = await PoWChallengeEngine.solve(challenge);

      expect(solution.challengeId).toBe(challenge.challengeId);
      expect(solution.hash.startsWith('00')).toBe(true);
      expect(solution.timeTakenMs).toBeGreaterThanOrEqual(0);

      const verification = await powEngine.verifySolution(solution);
      expect(verification.valid).toBe(true);
    });

    it('rejects a fake or incorrect solution', async () => {
      const challenge = powEngine.generateChallenge(2);
      const fakeSolution = {
        challengeId: challenge.challengeId,
        nonce: 999999,
        hash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        timeTakenMs: 1,
      };

      const verification = await powEngine.verifySolution(fakeSolution);
      expect(verification.valid).toBe(false);
    });

    it('rejects replay of an already-consumed PoW challenge', async () => {
      const challenge = powEngine.generateChallenge(2);
      const solution = await PoWChallengeEngine.solve(challenge);

      const firstVerification = await powEngine.verifySolution(solution);
      expect(firstVerification.valid).toBe(true);

      const replayVerification = await powEngine.verifySolution(solution);
      expect(replayVerification.valid).toBe(false);
      expect(replayVerification.reason).toContain('Challenge not found or expired');
    });
  });

  describe('Constant-Time Equality & Memory Zeroization (Timing Attack & Memory Safety)', () => {
    it('timingSafeEqual correctly matches identical byte arrays and strings', async () => {
      const { timingSafeEqual } = await import('../src/security.js');
      expect(timingSafeEqual('aetheris-secret-key-123', 'aetheris-secret-key-123')).toBe(true);

      const u1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const u2 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(timingSafeEqual(u1, u2)).toBe(true);
    });

    it('timingSafeEqual correctly rejects mismatched buffers and differing lengths', async () => {
      const { timingSafeEqual } = await import('../src/security.js');
      expect(timingSafeEqual('key_abc', 'key_abd')).toBe(false);
      expect(timingSafeEqual('key_abc', 'key_abcd')).toBe(false);

      const u1 = new Uint8Array([1, 2, 3, 4]);
      const u2 = new Uint8Array([1, 2, 3, 5]);
      expect(timingSafeEqual(u1, u2)).toBe(false);

      const u3 = new Uint8Array([1, 2, 3]);
      expect(timingSafeEqual(u1, u3)).toBe(false);
    });

    it('constantTimeHexEqual handles casing and strict equality', async () => {
      const { constantTimeHexEqual } = await import('../src/security.js');
      const hexA = 'deadbeef0123456789abcdef';
      const hexB = 'DEADBEEF0123456789ABCDEF';
      const hexC = 'deadbeef0123456789abcdeg';

      expect(constantTimeHexEqual(hexA, hexB)).toBe(true);
      expect(constantTimeHexEqual(hexA, hexC)).toBe(false);
    });

    it('zeroize securely wipes Uint8Array, ArrayBuffer, and number arrays in-place', async () => {
      const { zeroize } = await import('../src/security.js');

      // 1. Uint8Array
      const secretBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x42, 0x13, 0x37]);
      zeroize(secretBytes);
      expect(secretBytes.every(b => b === 0)).toBe(true);

      // 2. ArrayBuffer
      const ab = new ArrayBuffer(16);
      const abView = new Uint8Array(ab);
      abView.fill(0xff);
      expect(abView[0]).toBe(0xff);
      zeroize(ab);
      expect(abView.every(b => b === 0)).toBe(true);

      // 3. Array of numbers
      const numArr = [10, 20, 30, 40, 50];
      zeroize(numArr);
      expect(numArr.every(n => n === 0)).toBe(true);
    });

    it('fuzzing: tests timingSafeEqual across 100 random variations without crashing', async () => {
      const { timingSafeEqual, zeroize } = await import('../src/security.js');
      for (let i = 0; i < 100; i++) {
        const len = 1 + Math.floor(Math.random() * 64);
        const bufA = new Uint8Array(len);
        crypto.getRandomValues(bufA);
        const bufB = new Uint8Array(bufA);

        expect(timingSafeEqual(bufA, bufB)).toBe(true);

        // Mutate one random byte
        if (len > 0) {
          const mutateIdx = Math.floor(Math.random() * len);
          bufB[mutateIdx] ^= 0x01;
          expect(timingSafeEqual(bufA, bufB)).toBe(false);
        }

        zeroize(bufA);
        zeroize(bufB);
        expect(bufA.every(b => b === 0)).toBe(true);
      }
    });
  });
});
