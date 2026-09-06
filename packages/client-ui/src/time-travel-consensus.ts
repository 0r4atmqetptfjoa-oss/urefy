/**
 * AETHERIS SOVEREIGN TIME-TRAVEL CONSENSUS (COMMUNITY-GOVERNED ROLLBACKS)
 *
 * Decentralized community rollback proposals:
 * - Any member with WoT reputation >= 70 can propose a rollback on a contested
 *   moderation action or malicious state change.
 * - Gathers threshold signatures from WoT guardians (e.g. 5 of 7 signatures).
 * - When threshold is reached, executes atomic state rollback without central
 *   admin intervention!
 */

import { verifySignature } from '@aetheris/core-crypto';

export type ModerationActionType =
  | 'BAN_NODE'
  | 'HIDE_POST'
  | 'MUTE_AUTHOR'
  | 'DELETE_CONTENT'
  | 'MODIFY_CONFIG'
  | 'QUARANTINE_PEER';

export type ConsensusStatus = 'ACTIVE' | 'CONTESTED' | 'ROLLED_BACK' | 'CONSENSUS_REACHED';

export type ProposalStatus = 'PENDING' | 'EXECUTED' | 'REJECTED' | 'EXPIRED';

export interface ModerationEvent {
  id: string;
  targetId: string;
  actionType: ModerationActionType;
  moderatorId: string;
  moderatorFingerprint: string;
  timestamp: number;
  reason: string;
  beforeState: Record<string, any> | string;
  afterState: Record<string, any> | string;
  consensusStatus: ConsensusStatus;
  rollbackProposalId?: string;
}

export interface GuardianSignature {
  guardianId: string;
  guardianFingerprint: string;
  publicKeyHex?: string;
  signature: string;
  timestamp: number;
  wotScore: number;
}

export interface RollbackProposal {
  id: string;
  targetEventId: string;
  targetId: string;
  proposerId: string;
  proposerFingerprint: string;
  proposerWotScore: number;
  justification: string;
  thresholdRequired: number; // e.g. 5
  totalGuardians: number;    // e.g. 7
  signatures: GuardianSignature[];
  status: ProposalStatus;
  createdAt: number;
  executedAt?: number;
  restoredState?: Record<string, any> | string;
}

export type RollbackExecutionCallback = (
  event: ModerationEvent,
  proposal: RollbackProposal
) => Promise<boolean> | boolean;

export const MIN_PROPOSER_WOT_REPUTATION = 70;
export const DEFAULT_THRESHOLD_SIGNATURES = 5;
export const DEFAULT_TOTAL_GUARDIANS = 7;
export const MIN_GUARDIAN_WOT_REPUTATION = 70;

export class TimeTravelConsensusEngine {
  private events: Map<string, ModerationEvent> = new Map();
  private proposals: Map<string, RollbackProposal> = new Map();
  private executionHandlers: RollbackExecutionCallback[] = [];

  constructor() {}

  /**
   * Records a moderation event or state transition in the chronological ledger.
   */
  public recordModerationEvent(
    data: Omit<ModerationEvent, 'consensusStatus'> & { consensusStatus?: ConsensusStatus }
  ): ModerationEvent {
    const event: ModerationEvent = {
      ...data,
      consensusStatus: data.consensusStatus || 'ACTIVE',
    };
    this.events.set(event.id, event);
    return event;
  }

  /**
   * Creates a community rollback proposal for a contested moderation action.
   * Requires proposer WoT reputation >= 70.
   */
  public proposeRollback(params: {
    eventId: string;
    proposerId: string;
    proposerFingerprint: string;
    proposerWotScore: number;
    justification: string;
    thresholdRequired?: number;
    totalGuardians?: number;
  }): RollbackProposal {
    if (params.proposerWotScore < MIN_PROPOSER_WOT_REPUTATION) {
      throw new Error(
        `Proposer WoT reputation must be >= ${MIN_PROPOSER_WOT_REPUTATION} to initiate rollback (got ${params.proposerWotScore})`
      );
    }

    const event = this.events.get(params.eventId);
    if (!event) {
      throw new Error(`Moderation event not found: ${params.eventId}`);
    }

    if (event.consensusStatus === 'ROLLED_BACK') {
      throw new Error(`Contested event ${params.eventId} has already been rolled back`);
    }

    const proposalId = `prop_rollback_${Date.now()}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
    const proposal: RollbackProposal = {
      id: proposalId,
      targetEventId: event.id,
      targetId: event.targetId,
      proposerId: params.proposerId,
      proposerFingerprint: params.proposerFingerprint,
      proposerWotScore: params.proposerWotScore,
      justification: params.justification,
      thresholdRequired: params.thresholdRequired || DEFAULT_THRESHOLD_SIGNATURES,
      totalGuardians: params.totalGuardians || DEFAULT_TOTAL_GUARDIANS,
      signatures: [],
      status: 'PENDING',
      createdAt: Date.now(),
      restoredState: event.beforeState,
    };

    this.proposals.set(proposalId, proposal);

    // Update event state to CONTESTED
    event.consensusStatus = 'CONTESTED';
    event.rollbackProposalId = proposalId;

    return proposal;
  }

  /**
   * Adds a threshold signature from a WoT guardian.
   * When threshold (e.g. 5 of 7 signatures) is reached, executes atomic state
   * rollback without central admin intervention!
   */
  public async signRollbackProposal(params: {
    proposalId: string;
    guardianId: string;
    guardianFingerprint: string;
    signature: string;
    wotScore: number;
    publicKeyHex?: string;
  }): Promise<{ proposal: RollbackProposal; executed: boolean }> {
    const proposal = this.proposals.get(params.proposalId);
    if (!proposal) {
      throw new Error(`Rollback proposal not found: ${params.proposalId}`);
    }

    if (proposal.status !== 'PENDING') {
      throw new Error(`Proposal is not in PENDING state (status: ${proposal.status})`);
    }

    if (params.wotScore < MIN_GUARDIAN_WOT_REPUTATION) {
      throw new Error(
        `Guardian WoT score must be >= ${MIN_GUARDIAN_WOT_REPUTATION} (got ${params.wotScore})`
      );
    }

    // Prevent duplicate signatures
    if (
      proposal.signatures.some(
        (s) => s.guardianId === params.guardianId || s.guardianFingerprint === params.guardianFingerprint
      )
    ) {
      throw new Error(`Guardian ${params.guardianFingerprint} has already signed this proposal`);
    }

    // Verify Ed25519 signature if public key provided
    if (params.publicKeyHex) {
      const payload = `${proposal.id}:${params.guardianFingerprint}:${params.wotScore}`;
      const isValid = verifySignature(params.signature, payload, params.publicKeyHex);
      if (!isValid) {
        throw new Error(`Cryptographic signature verification failed for guardian ${params.guardianFingerprint}`);
      }
    }

    const sigRecord: GuardianSignature = {
      guardianId: params.guardianId,
      guardianFingerprint: params.guardianFingerprint,
      publicKeyHex: params.publicKeyHex,
      signature: params.signature,
      timestamp: Date.now(),
      wotScore: params.wotScore,
    };

    proposal.signatures.push(sigRecord);

    // Check if threshold reached
    let executed = false;
    if (proposal.signatures.length >= proposal.thresholdRequired) {
      executed = await this.executeAtomicRollback(proposal);
    }

    return { proposal, executed };
  }

  /**
   * Executes atomic state rollback without central admin intervention.
   */
  private async executeAtomicRollback(proposal: RollbackProposal): Promise<boolean> {
    const event = this.events.get(proposal.targetEventId);
    if (!event) {
      throw new Error(`Target moderation event missing during rollback: ${proposal.targetEventId}`);
    }

    proposal.status = 'EXECUTED';
    proposal.executedAt = Date.now();

    // Revert event state and record consensus status ROLLED_BACK
    event.consensusStatus = 'ROLLED_BACK';

    // Trigger all atomic execution callbacks
    for (const handler of this.executionHandlers) {
      try {
        await handler(event, proposal);
      } catch (err) {
        console.error('Error during rollback execution callback:', err);
      }
    }

    return true;
  }

  /**
   * Registers a callback to be triggered upon threshold consensus rollback execution.
   */
  public registerRollbackHandler(handler: RollbackExecutionCallback): void {
    this.executionHandlers.push(handler);
  }

  public getEvent(id: string): ModerationEvent | undefined {
    return this.events.get(id);
  }

  public getAllEvents(): ModerationEvent[] {
    return Array.from(this.events.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public getProposal(id: string): RollbackProposal | undefined {
    return this.proposals.get(id);
  }

  public getAllProposals(): RollbackProposal[] {
    return Array.from(this.proposals.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public clear(): void {
    this.events.clear();
    this.proposals.clear();
  }
}

export const timeTravelConsensus = new TimeTravelConsensusEngine();
