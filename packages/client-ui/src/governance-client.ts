import { createSignedEnvelope, type SovereignKeyPairSet } from '@aetheris/core-crypto';
import type { Proposal, ProposalCategory, Vote, VoteChoice } from './governance.js';

export interface GovernanceSnapshot {
  proposals: Proposal[];
  myVotes: Vote[];
}

export interface ProposalDraft {
  id: string;
  title: string;
  description: string;
  category: ProposalCategory;
  quorum: number;
  durationHours: number;
}

export class GovernanceClient {
  constructor(private readonly getKeys: () => Promise<SovereignKeyPairSet>, private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis)) {}

  private async request(payload: Record<string, unknown>): Promise<GovernanceSnapshot> {
    const keys = await this.getKeys();
    const envelope = createSignedEnvelope({ scope: 'urefy-governance-v1', ...payload }, keys);
    const response = await this.fetcher('/api/governance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envelope),
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) throw new Error(result?.error ?? 'Governance service unavailable');
    if ((await this.getKeys()).identity.signingPublicKey !== keys.identity.signingPublicKey) throw new Error('Identity changed during the governance request');
    if (!Array.isArray(result.proposals) || !Array.isArray(result.myVotes)) throw new Error('Invalid governance response');
    for (const proposal of result.proposals) {
      if (typeof proposal.id !== 'string' || typeof proposal.title !== 'string' || typeof proposal.description !== 'string'
        || !proposal.votes || !['for', 'against', 'abstain', 'totalVoters'].every(key => Number.isSafeInteger(proposal.votes[key]) && proposal.votes[key] >= 0)) {
        throw new Error('Invalid proposal response');
      }
    }
    return result;
  }

  list(): Promise<GovernanceSnapshot> { return this.request({ action: 'list' }); }
  create(draft: ProposalDraft): Promise<GovernanceSnapshot> { return this.request({ action: 'create', ...draft }); }
  vote(proposalId: string, choice: VoteChoice): Promise<GovernanceSnapshot> { return this.request({ action: 'vote', proposalId, choice }); }
}