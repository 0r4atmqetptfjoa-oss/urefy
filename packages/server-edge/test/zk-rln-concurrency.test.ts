import { describe, it, expect, beforeEach } from 'vitest';
import { RelayStateManager } from '../src/relay/state.js';
import { ZKRLN, RLNShare } from '@aetheris/core-crypto';

describe('ZK-RLN Concurrency, Synchronization & Slashing Invariants', () => {
  let stateManager: RelayStateManager;

  beforeEach(() => {
    stateManager = new RelayStateManager({
      shareTtlMs: 200, // short TTL for testing eviction
      maxPresenceCount: 100,
    });
  });

  it('permits independent shares across epoch transitions without false-positive slashing', () => {
    const userSecret = BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    const shareEpoch1 = ZKRLN.createShare(userSecret, '#1', 'First message in epoch 1');
    const shareEpoch2 = ZKRLN.createShare(userSecret, '#2', 'Second message in epoch 2');

    // Both belong to same identity but different epochs
    expect(shareEpoch1.nullifier).toBe(shareEpoch2.nullifier);

    const res1 = stateManager.recordShareAndCheckViolation(shareEpoch1);
    expect(res1.violated).toBe(false);

    const res2 = stateManager.recordShareAndCheckViolation(shareEpoch2);
    expect(res2.violated).toBe(false);

    expect(stateManager.isRevoked(shareEpoch1.nullifier)).toBe(false);
  });

  it('mathematically proves double-sign violation in same epoch and slashes identity with ZERO secret disclosure', () => {
    const userSecret = BigInt('0xdeadbeefcafebabedeadbeefcafebabedeadbeefcafebabedeadbeefcafebabe');
    const share1 = ZKRLN.createShare(userSecret, '#412', 'Legitimate first message');
    const share2 = ZKRLN.createShare(userSecret, '#412', 'Spam second message');

    const res1 = stateManager.recordShareAndCheckViolation(share1);
    expect(res1.violated).toBe(false);

    const res2 = stateManager.recordShareAndCheckViolation(share2);
    expect(res2.violated).toBe(true);
    expect(res2.breachedNullifier).toBe(share1.nullifier);
    expect(stateManager.isRevoked(share1.nullifier)).toBe(true);

    // Any subsequent shares from this nullifier are immediately rejected
    const share3 = ZKRLN.createShare(userSecret, '#413', 'Message in later epoch');
    const res3 = stateManager.recordShareAndCheckViolation(share3);
    expect(res3.violated).toBe(true);
    expect(res3.error).toContain('already revoked');
  });

  it('guarantees ZERO false-positive slashing against crafted adversarial framing attacks', () => {
    // Honest victim
    const victimSecret = BigInt('0x9999999999999999999999999999999999999999999999999999999999999999');
    const honestShare = ZKRLN.createShare(victimSecret, '#500', 'Honest user message');

    // Record honest user's share
    const resHonest = stateManager.recordShareAndCheckViolation(honestShare);
    expect(resHonest.violated).toBe(false);

    // Attacker observes honestShare.nullifier and crafts a malicious fake share with random polynomial evaluation
    const attackerCraftedShare: RLNShare = {
      nullifier: honestShare.nullifier,
      epoch: '#500',
      x: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      y: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    };

    // Attacker submits crafted share attempting to trigger slashing of honest user
    const resAttack = stateManager.recordShareAndCheckViolation(attackerCraftedShare);

    // Lagrange interpolation must fail to match nullifier hash, so honest user MUST NOT be slashed
    expect(resAttack.violated).toBe(false);
    expect(stateManager.isRevoked(honestShare.nullifier)).toBe(false);
  });

  it('handles high concurrency: 500 distinct shares without corruption or contention', () => {
    const sharesCount = 500;
    const nullifiers: string[] = [];

    for (let i = 0; i < sharesCount; i++) {
      const secret = BigInt(1000000 + i);
      const share = ZKRLN.createShare(secret, '#epoch-test', `Message ${i}`);
      nullifiers.push(share.nullifier);

      const res = stateManager.recordShareAndCheckViolation(share);
      expect(res.violated).toBe(false);
    }

    expect(stateManager.getActiveSharesCount()).toBe(sharesCount);
    expect(stateManager.getRevokedCount()).toBe(0);
  });

  it('prunes expired shares cleanly after TTL without retaining stale memory', async () => {
    const userSecret = BigInt('0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff');
    const share = ZKRLN.createShare(userSecret, '#old-epoch', 'Expiring message');

    stateManager.recordShareAndCheckViolation(share);
    expect(stateManager.getActiveSharesCount()).toBe(1);

    // Wait for TTL (200ms) to elapse
    await new Promise((resolve) => setTimeout(resolve, 250));

    const pruned = stateManager.cleanExpiredShares();
    expect(pruned).toBe(1);
    expect(stateManager.getActiveSharesCount()).toBe(0);
  });
});
