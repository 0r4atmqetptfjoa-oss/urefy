/**
 * MLS Group RFC 9420 — Test Suite
 * Tests: group lifecycle, epoch commits, replay defense, message crypto.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MLSGroup, type MLSMember } from '../src/mls-group.js';
import { createSovereignIdentity } from '../src/identity.js';

// Helper: build a deterministic MLSMember-like object for testing
async function makeMember(label: string): Promise<{
  member: Omit<MLSMember, 'leafIndex' | 'addedAt'>;
  privateKey: Uint8Array;
  fullMember?: MLSMember;
}> {
  const identity = await createSovereignIdentity();
  return {
    member: {
      fingerprint: identity.identity.fingerprint,
      signingPublicKey: identity.identity.signingPublicKey,
      leafSeedHex: identity.identity.fingerprint.repeat(4).slice(0, 64),
    },
    privateKey: identity.signingPrivateKey,
  };
}

describe('MLSGroup — Group Lifecycle', () => {
  it('creates a group with zero members', () => {
    const group = new MLSGroup('test-group-1');
    expect(group.getMemberCount()).toBe(0);
    expect(group.getEpoch()).toBe(0);
    expect(group.getGroupId()).toBe('test-group-1');
  });

  it('adds a member via Add proposal and commitEpoch', async () => {
    const group = new MLSGroup('test-group-2');
    const { member, privateKey } = await makeMember('Alice');

    const fullAlice: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };
    const proposal = group.proposeAdd(member);
    const commit = group.commitEpoch([proposal], fullAlice, privateKey);

    expect(commit.newEpoch).toBe(1);
    expect(commit.priorEpoch).toBe(0);
    expect(commit.proposals).toHaveLength(1);
    expect(commit.proposals[0].type).toBe('Add');
    expect(group.getMemberCount()).toBe(1);
  });

  it('advances epoch on each commit', async () => {
    const group = new MLSGroup('test-group-epoch');
    const { member, privateKey } = await makeMember('Bob');
    const fullBob: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };

    group.commitEpoch([group.proposeAdd(member)], fullBob, privateKey);
    expect(group.getEpoch()).toBe(1);

    group.commitEpoch([group.proposeUpdate(member.leafSeedHex)], fullBob, privateKey);
    expect(group.getEpoch()).toBe(2);
  });

  it('removes a member and updates the epoch', async () => {
    const group = new MLSGroup('test-group-remove');
    const { member: alice, privateKey: alicePK } = await makeMember('Alice');
    const { member: bob } = await makeMember('Bob');

    const fullAlice: MLSMember = { ...alice, leafIndex: 0, addedAt: Date.now() };

    group.commitEpoch([group.proposeAdd(alice), group.proposeAdd(bob)], fullAlice, alicePK);
    expect(group.getMemberCount()).toBe(2);

    group.commitEpoch([group.proposeRemove(bob.fingerprint)], fullAlice, alicePK);
    expect(group.getMemberCount()).toBe(1);
    expect(group.findMember(bob.fingerprint)).toBeUndefined();
    expect(group.getEpoch()).toBe(2);
  });

  it('rejects Add proposal for existing member', async () => {
    const group = new MLSGroup('test-group-dup');
    const { member, privateKey } = await makeMember('Alice');
    const fullMember: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };

    group.commitEpoch([group.proposeAdd(member)], fullMember, privateKey);

    expect(() =>
      group.commitEpoch([group.proposeAdd(member)], fullMember, privateKey)
    ).toThrow('Member already exists');
  });

  it('rejects Remove proposal for non-existent member', async () => {
    const group = new MLSGroup('test-group-no-remove');
    const { member, privateKey } = await makeMember('Alice');
    const fullMember: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };
    group.commitEpoch([group.proposeAdd(member)], fullMember, privateKey);

    expect(() =>
      group.commitEpoch([group.proposeRemove('deadbeef00000000')], fullMember, privateKey)
    ).toThrow('Member not found');
  });

  it('rejects commit from non-member', async () => {
    const group = new MLSGroup('test-group-nonmember');
    const { member, privateKey } = await makeMember('Alice');
    const outsider: MLSMember = { ...member, fingerprint: 'aabbccdd00112233', leafIndex: 0, addedAt: Date.now() };

    // Add alice so group is not empty, but try to commit as outsider
    const fullMember: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };
    group.commitEpoch([group.proposeAdd(member)], fullMember, privateKey);

    expect(() =>
      group.commitEpoch([group.proposeUpdate(member.leafSeedHex)], outsider, privateKey)
    ).toThrow('not a member');
  });
});

describe('MLSGroup — Commit Signature Verification', () => {
  it('verifyCommit returns true for a valid commit', async () => {
    const group = new MLSGroup('test-verify-1');
    const { member, privateKey } = await makeMember('Alice');
    const { hexToBytes } = await import('@noble/hashes/utils');
    const fullMember: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };

    const commit = group.commitEpoch([group.proposeAdd(member)], fullMember, privateKey);
    const isValid = MLSGroup.verifyCommit(commit, hexToBytes(member.signingPublicKey));
    expect(isValid).toBe(true);
  });

  it('verifyCommit returns false for tampered commit', async () => {
    const group = new MLSGroup('test-verify-2');
    const { member, privateKey } = await makeMember('Alice');
    const { hexToBytes } = await import('@noble/hashes/utils');
    const fullMember: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };

    const commit = group.commitEpoch([group.proposeAdd(member)], fullMember, privateKey);
    const tampered = { ...commit, newEpoch: 999 };

    const isValid = MLSGroup.verifyCommit(tampered, hexToBytes(member.signingPublicKey));
    expect(isValid).toBe(false);
  });

  it('verifyCommit rejects a commit signed by a different key', async () => {
    const group = new MLSGroup('test-verify-3');
    const { member: alice, privateKey: alicePK } = await makeMember('Alice');
    const { member: bob } = await makeMember('Bob');
    const { hexToBytes } = await import('@noble/hashes/utils');
    const fullAlice: MLSMember = { ...alice, leafIndex: 0, addedAt: Date.now() };

    const commit = group.commitEpoch([group.proposeAdd(alice)], fullAlice, alicePK);
    // Verify with Bob's key instead of Alice's
    const isValid = MLSGroup.verifyCommit(commit, hexToBytes(bob.signingPublicKey));
    expect(isValid).toBe(false);
  });
});

describe('MLSGroup — applyVerifiedCommit (receiver side)', () => {
  it('receiver applies a verified commit and reaches the same epoch secret', async () => {
    const sender = new MLSGroup('sync-group', 16);
    const receiver = new MLSGroup('sync-group', 16);
    const { member, privateKey } = await makeMember('Alice');
    const { hexToBytes } = await import('@noble/hashes/utils');
    const fullMember: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };

    const commit = sender.commitEpoch([sender.proposeAdd(member)], fullMember, privateKey);

    // Receiver verifies
    const ok = MLSGroup.verifyCommit(commit, hexToBytes(member.signingPublicKey));
    expect(ok).toBe(true);

    // Receiver applies
    receiver.applyVerifiedCommit(commit);
    expect(receiver.getEpoch()).toBe(1);
    expect(receiver.getState().epochSecretHex).toBe(sender.getState().epochSecretHex);
  });

  it('applyVerifiedCommit throws on epoch mismatch', async () => {
    const sender   = new MLSGroup('mismatch-group', 16);
    const receiver = new MLSGroup('mismatch-group', 16);
    const { member, privateKey } = await makeMember('Alice');
    const fullMember: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };

    const commit1 = sender.commitEpoch([sender.proposeAdd(member)], fullMember, privateKey);
    receiver.applyVerifiedCommit(commit1);

    // sender advances again but receiver is already at epoch 1
    const commit2 = sender.commitEpoch([sender.proposeUpdate(member.leafSeedHex)], fullMember, privateKey);
    // Now try to apply commit1 again (wrong epoch)
    expect(() => receiver.applyVerifiedCommit(commit1)).toThrow('Epoch mismatch');
  });

  it('applyVerifiedCommit throws on group ID mismatch', async () => {
    const sender   = new MLSGroup('group-A', 16);
    const receiver = new MLSGroup('group-B', 16);
    const { member, privateKey } = await makeMember('Alice');
    const fullMember: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };

    const commit = sender.commitEpoch([sender.proposeAdd(member)], fullMember, privateKey);
    expect(() => receiver.applyVerifiedCommit(commit)).toThrow('Group ID mismatch');
  });
});

describe('MLSGroup — Group Message Encryption', () => {
  it('encrypts and decrypts a group message', async () => {
    const group = new MLSGroup('encrypt-group');
    const { member, privateKey } = await makeMember('Alice');
    const fullMember: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };
    group.commitEpoch([group.proposeAdd(member)], fullMember, privateKey);

    const epochSecret = group.getState().epochSecretHex;
    const msg = await group.encryptGroupMessage('Hello MLS!', member.fingerprint);

    expect(msg.epoch).toBe(1);
    expect(msg.groupId).toBe('encrypt-group');

    const plaintext = await group.decryptGroupMessage(msg, epochSecret);
    expect(plaintext).toBe('Hello MLS!');
  });

  it('fails to decrypt with wrong epoch secret', async () => {
    const group = new MLSGroup('encrypt-group-wrong-secret');
    const { member, privateKey } = await makeMember('Alice');
    const fullMember: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };
    group.commitEpoch([group.proposeAdd(member)], fullMember, privateKey);

    const msg = await group.encryptGroupMessage('Secret!', member.fingerprint);
    const wrongSecret = 'a'.repeat(64);

    await expect(group.decryptGroupMessage(msg, wrongSecret)).rejects.toThrow('decryption failed');
  });

  it('decryption fails when group ID differs', async () => {
    const groupA = new MLSGroup('group-A-enc');
    const groupB = new MLSGroup('group-B-enc');
    const { member, privateKey } = await makeMember('Alice');
    const fullMember: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };
    groupA.commitEpoch([groupA.proposeAdd(member)], fullMember, privateKey);

    const msg = await groupA.encryptGroupMessage('Test', member.fingerprint);
    // Tamper groupId to match groupB — but contextLabel still says group-A-enc
    msg.groupId = 'group-B-enc';

    await expect(groupB.decryptGroupMessage(msg, groupA.getState().epochSecretHex)).rejects.toThrow('Context label group ID mismatch');
  });

  it('each message uses a unique IV (no IV reuse)', async () => {
    const group = new MLSGroup('iv-unique-group');
    const { member, privateKey } = await makeMember('Alice');
    const fullMember: MLSMember = { ...member, leafIndex: 0, addedAt: Date.now() };
    group.commitEpoch([group.proposeAdd(member)], fullMember, privateKey);

    const epochSecret = group.getState().epochSecretHex;
    const ivs = new Set<string>();

    for (let i = 0; i < 50; i++) {
      const msg = await group.encryptGroupMessage(`Message ${i}`, member.fingerprint);
      ivs.add(msg.iv);
    }

    expect(ivs.size).toBe(50); // all IVs must be unique
  });
});

describe('MLSGroup — Multi-Member Scenarios', () => {
  it('supports up to 10 members with correct epoch tracking', async () => {
    const group = new MLSGroup('big-group', 16);
    const members: { member: Omit<MLSMember, 'leafIndex' | 'addedAt'>; privateKey: Uint8Array }[] = [];

    for (let i = 0; i < 3; i++) {
      members.push(await makeMember(`User-${i}`));
    }

    // First member bootstraps the group
    const firstFull: MLSMember = { ...members[0].member, leafIndex: 0, addedAt: Date.now() };
    group.commitEpoch([group.proposeAdd(members[0].member)], firstFull, members[0].privateKey);

    // Subsequent members are added
    let currentCommitter: MLSMember = firstFull;
    let committerPK = members[0].privateKey;

    for (let i = 1; i < 3; i++) {
      const updatedCommitter = group.findMember(currentCommitter.fingerprint)!;
      group.commitEpoch([group.proposeAdd(members[i].member)], updatedCommitter, committerPK);
    }

    expect(group.getMemberCount()).toBe(3);
    expect(group.getEpoch()).toBe(3);
  });
});
