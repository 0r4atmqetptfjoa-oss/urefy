import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateKeyPair, signMessage } from '@aetheris/core-crypto';
import {
  TimeTravelConsensusEngine,
  MIN_PROPOSER_WOT_REPUTATION,
} from '../src/time-travel-consensus.js';
import {
  renderTimeTravelAuditCard,
  formatStateDiff,
  getConsensusStatusBadge,
} from '../src/admin.js';

describe('Innovation 2: Time-Travel Consensus (Community-Governed Rollbacks)', () => {
  let engine: TimeTravelConsensusEngine;

  beforeEach(() => {
    engine = new TimeTravelConsensusEngine();
  });

  describe('Rollback Proposal Creation & Eligibility', () => {
    it('allows member with WoT reputation >= 70 to propose a rollback on contested moderation action', () => {
      const event = engine.recordModerationEvent({
        id: 'mod_evt_101',
        targetId: 'post_quantum_mesh_99',
        actionType: 'HIDE_POST',
        moderatorId: 'mod_rogue_alpha',
        moderatorFingerprint: '0x9482bf10',
        timestamp: Date.now() - 60000,
        reason: 'Unverified claims of sovereign consensus',
        beforeState: { visibility: 'PUBLIC', score: 142 },
        afterState: { visibility: 'HIDDEN', score: 0 },
      });

      expect(event.consensusStatus).toBe('ACTIVE');

      const proposal = engine.proposeRollback({
        eventId: event.id,
        proposerId: 'user_trusted_guardian',
        proposerFingerprint: '0x71a2bc44',
        proposerWotScore: 78, // >= 70
        justification: 'Post contained legitimate peer-reviewed technical implementation.',
        thresholdRequired: 5,
        totalGuardians: 7,
      });

      expect(proposal).toBeDefined();
      expect(proposal.id).toContain('prop_rollback_');
      expect(proposal.targetEventId).toBe(event.id);
      expect(proposal.status).toBe('PENDING');
      expect(proposal.thresholdRequired).toBe(5);

      // Event consensus status updated to CONTESTED
      const updatedEvent = engine.getEvent(event.id);
      expect(updatedEvent?.consensusStatus).toBe('CONTESTED');
      expect(updatedEvent?.rollbackProposalId).toBe(proposal.id);
    });

    it('rejects rollback proposal if proposer WoT reputation is below 70', () => {
      const event = engine.recordModerationEvent({
        id: 'mod_evt_102',
        targetId: 'node_alpha_3',
        actionType: 'BAN_NODE',
        moderatorId: 'mod_guardian_root',
        moderatorFingerprint: '0x33445566',
        timestamp: Date.now() - 30000,
        reason: 'Sybil anomaly',
        beforeState: { banned: false },
        afterState: { banned: true },
      });

      expect(() => {
        engine.proposeRollback({
          eventId: event.id,
          proposerId: 'low_rep_user',
          proposerFingerprint: '0x00112233',
          proposerWotScore: 68, // < 70
          justification: 'Should not have been banned',
        });
      }).toThrow(`Proposer WoT reputation must be >= ${MIN_PROPOSER_WOT_REPUTATION}`);

      expect(engine.getEvent(event.id)?.consensusStatus).toBe('ACTIVE');
    });

    it('throws error if proposing rollback on non-existent or already rolled-back event', () => {
      expect(() => {
        engine.proposeRollback({
          eventId: 'non_existent_evt',
          proposerId: 'guardian_node',
          proposerFingerprint: '0x88776655',
          proposerWotScore: 85,
          justification: 'Invalid target test',
        });
      }).toThrow(/Moderation event not found/);
    });
  });

  describe('WoT Threshold Signature Collection & Atomic Execution', () => {
    it('gathers threshold signatures (5 of 7) and executes atomic rollback without admin intervention', async () => {
      const rollbackHandler = vi.fn();
      engine.registerRollbackHandler(rollbackHandler);

      const event = engine.recordModerationEvent({
        id: 'mod_contested_state_1',
        targetId: 'author_sovereign_circle',
        actionType: 'MUTE_AUTHOR',
        moderatorId: 'mod_overzealous',
        moderatorFingerprint: '0xdeadbeef',
        timestamp: Date.now() - 120000,
        reason: 'Rate limit dispute',
        beforeState: { muted: false, trustCapacity: 100 },
        afterState: { muted: true, trustCapacity: 0 },
      });

      const proposal = engine.proposeRollback({
        eventId: event.id,
        proposerId: 'proposer_node',
        proposerFingerprint: '0x12345678',
        proposerWotScore: 75,
        justification: 'Unjustified mute during legitimate load spike',
        thresholdRequired: 5,
        totalGuardians: 7,
      });

      // Generate 5 distinct WoT guardian signers
      const guardians = Array.from({ length: 5 }, () => generateKeyPair());

      // Sign 1 through 4: should remain PENDING
      for (let i = 0; i < 4; i++) {
        const kp = guardians[i];
        const payload = `${proposal.id}:${kp.fingerprint}:85`;
        const sig = signMessage(payload, kp.privateKey);
        const sigHex = Array.from(sig).map((b) => b.toString(16).padStart(2, '0')).join('');

        const res = await engine.signRollbackProposal({
          proposalId: proposal.id,
          guardianId: `guardian_${i}`,
          guardianFingerprint: kp.fingerprint,
          signature: sigHex,
          wotScore: 85,
          publicKeyHex: kp.publicKeyHex,
        });

        expect(res.executed).toBe(false);
        expect(res.proposal.status).toBe('PENDING');
        expect(res.proposal.signatures.length).toBe(i + 1);
      }

      expect(rollbackHandler).not.toHaveBeenCalled();

      // 5th signature reaches threshold (5 of 7) -> ATOMIC ROLLBACK EXECUTION!
      const kp5 = guardians[4];
      const payload5 = `${proposal.id}:${kp5.fingerprint}:90`;
      const sig5 = signMessage(payload5, kp5.privateKey);
      const sigHex5 = Array.from(sig5).map((b) => b.toString(16).padStart(2, '0')).join('');

      const finalRes = await engine.signRollbackProposal({
        proposalId: proposal.id,
        guardianId: 'guardian_4',
        guardianFingerprint: kp5.fingerprint,
        signature: sigHex5,
        wotScore: 90,
        publicKeyHex: kp5.publicKeyHex,
      });

      expect(finalRes.executed).toBe(true);
      expect(finalRes.proposal.status).toBe('EXECUTED');
      expect(finalRes.proposal.executedAt).toBeDefined();

      // Moderation event is atomically reverted to ROLLED_BACK!
      const updatedEvt = engine.getEvent(event.id);
      expect(updatedEvt?.consensusStatus).toBe('ROLLED_BACK');

      // Registered execution handler was invoked
      expect(rollbackHandler).toHaveBeenCalledTimes(1);
      expect(rollbackHandler).toHaveBeenCalledWith(updatedEvt, finalRes.proposal);
    });

    it('rejects duplicate signature from the same guardian', async () => {
      const event = engine.recordModerationEvent({
        id: 'mod_dup_test',
        targetId: 'item_test',
        actionType: 'DELETE_CONTENT',
        moderatorId: 'mod_1',
        moderatorFingerprint: '0x11111111',
        timestamp: Date.now(),
        reason: 'Spam filter trigger',
        beforeState: 'Active post content',
        afterState: 'Deleted',
      });

      const proposal = engine.proposeRollback({
        eventId: event.id,
        proposerId: 'proposer_node',
        proposerFingerprint: '0x22222222',
        proposerWotScore: 72,
        justification: 'Valid pulse',
        thresholdRequired: 3,
        totalGuardians: 5,
      });

      const kp = generateKeyPair();
      const payload = `${proposal.id}:${kp.fingerprint}:80`;
      const sigHex = Array.from(signMessage(payload, kp.privateKey))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // First signature succeeds
      await engine.signRollbackProposal({
        proposalId: proposal.id,
        guardianId: 'g_one',
        guardianFingerprint: kp.fingerprint,
        signature: sigHex,
        wotScore: 80,
      });

      // Second attempt from same guardian fingerprint fails
      await expect(
        engine.signRollbackProposal({
          proposalId: proposal.id,
          guardianId: 'g_one',
          guardianFingerprint: kp.fingerprint,
          signature: sigHex,
          wotScore: 80,
        })
      ).rejects.toThrow(/has already signed this proposal/);
    });

    it('rejects guardian signatures with invalid cryptographic signature', async () => {
      const event = engine.recordModerationEvent({
        id: 'mod_crypto_fail',
        targetId: 'item_fail',
        actionType: 'DELETE_CONTENT',
        moderatorId: 'mod_1',
        moderatorFingerprint: '0x11111111',
        timestamp: Date.now(),
        reason: 'Test',
        beforeState: 'data',
        afterState: 'none',
      });

      const proposal = engine.proposeRollback({
        eventId: event.id,
        proposerId: 'proposer',
        proposerFingerprint: '0x2222',
        proposerWotScore: 80,
        justification: 'Test',
      });

      const kp = generateKeyPair();

      await expect(
        engine.signRollbackProposal({
          proposalId: proposal.id,
          guardianId: 'guardian_bad_sig',
          guardianFingerprint: kp.fingerprint,
          signature: 'deadbeef'.repeat(8),
          wotScore: 85,
          publicKeyHex: kp.publicKeyHex,
        })
      ).rejects.toThrow(/Cryptographic signature verification failed/);
    });
  });

  describe('Visual Time-Travel Audit Log Card in Admin Panel', () => {
    it('renders side-by-side visual diff, target ID, moderator fingerprint, and consensus status', () => {
      const event1 = engine.recordModerationEvent({
        id: 'evt_diff_1',
        targetId: 'peer_node_77a',
        actionType: 'BAN_NODE',
        moderatorId: 'mod_prime',
        moderatorFingerprint: '0x4455aa66',
        timestamp: 1725390000000,
        reason: 'Consensus disruption',
        beforeState: { status: 'ACTIVE', tier: 'GUARDIAN' },
        afterState: { status: 'BANNED', tier: 'NONE' },
        consensusStatus: 'ROLLED_BACK',
      });

      const html = renderTimeTravelAuditCard([event1]);

      expect(html).toContain('Time-Travel Consensus Audit Log');
      expect(html).toContain('BAN_NODE');
      expect(html).toContain('peer_node_77a');
      expect(html).toContain('0x4455aa66');
      expect(html).toContain('ROLLED_BACK');
      // Contains side-by-side diff panels
      expect(html).toContain('STATE BEFORE (ORIGINAL)');
      expect(html).toContain('STATE AFTER (ROLLED BACK)');
      expect(html).toContain('ACTIVE');
      expect(html).toContain('BANNED');
    });

    it('formats state diff strings cleanly for objects and strings', () => {
      const objBefore = { count: 10 };
      const objAfter = { count: 0 };
      const diff = formatStateDiff(objBefore, objAfter);

      expect(diff.beforeFormatted).toContain('"count": 10');
      expect(diff.afterFormatted).toContain('"count": 0');
    });

    it('renders appropriate color-coded consensus status badges', () => {
      expect(getConsensusStatusBadge('ACTIVE')).toContain('ACTIVE');
      expect(getConsensusStatusBadge('CONTESTED')).toContain('CONTESTED');
      expect(getConsensusStatusBadge('ROLLED_BACK')).toContain('ROLLED_BACK');
      expect(getConsensusStatusBadge('CONSENSUS_REACHED')).toContain('CONSENSUS_REACHED');
    });
  });
});
