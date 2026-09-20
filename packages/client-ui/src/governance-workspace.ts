import { GovernanceClient, type GovernanceSnapshot, type ProposalDraft } from './governance-client.js';
import type { VoteChoice } from './governance.js';
import { renderIcon } from './ui/icons.js';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const inputClass = 'w-full rounded-lg border border-white/20 bg-surface-base px-3 py-2 text-sm text-white';
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50';

export class GovernanceWorkspace {
  private snapshot: GovernanceSnapshot = { proposals: [], myVotes: [] };
  private busy = false;
  private error = '';
  private active = false;
  private generation = 0;
  private creating = false;
  private selected = '';
  private ballotChoices = new Map<string, VoteChoice>();
  private filter = 'all';
  private draft = this.emptyDraft();
  private bound = false;

  constructor(private readonly client: GovernanceClient, private readonly notify: () => void) {}

  private emptyDraft(): ProposalDraft {
    return { id: crypto.randomUUID(), title: '', description: '', category: 'community', quorum: 1, durationHours: 72 };
  }

  open(): void {
    this.active = true;
    this.snapshot = { proposals: [], myVotes: [] };
    this.bind();
    void this.run(() => this.client.list());
  }

  close(): void {
    this.active = false;
    this.generation++;
    this.busy = false;
    this.creating = false;
    this.selected = '';
    this.ballotChoices.clear();
    this.error = '';
    this.draft = this.emptyDraft();
  }

  private async run(operation: () => Promise<GovernanceSnapshot>, after?: () => void): Promise<void> {
    if (this.busy) return;
    const generation = ++this.generation;
    this.busy = true;
    this.error = '';
    this.notify();
    try {
      const result = await operation();
      if (!this.active || generation !== this.generation) return;
      this.snapshot = result;
      after?.();
    } catch (error) {
      if (this.active && generation === this.generation) this.error = error instanceof Error ? error.message : 'Governance request failed';
    } finally {
      if (this.active && generation === this.generation) { this.busy = false; this.notify(); }
    }
  }

  private bind(): void {
    if (this.bound || typeof document === 'undefined') return;
    this.bound = true;
    document.addEventListener('click', event => {
      const target = (event.target as Element).closest<HTMLElement>('[data-governance-action]');
      if (!target || !this.active || this.busy) return;
      const action = target.dataset.governanceAction;
      if (action === 'refresh') { void this.run(() => this.client.list()); return; }
      if (action === 'create') { this.creating = true; this.selected = ''; }
      if (action === 'back') { this.creating = false; this.selected = ''; }
      if (action === 'select') { this.selected = target.dataset.proposalId ?? ''; this.creating = false; }
      this.error = '';
      this.notify();
    });
    document.addEventListener('change', event => {
      const target = event.target as HTMLInputElement;
      if (!this.active) return;
      if (target.id === 'governance-filter') { this.filter = target.value; this.notify(); }
      if (target.name === 'choice' && target.closest('#governance-vote-form') && ['for', 'against', 'abstain'].includes(target.value)) {
        this.ballotChoices.set(this.selected, target.value as VoteChoice);
      }
    });
    document.addEventListener('input', event => {
      const form = (event.target as Element).closest<HTMLFormElement>('#governance-create-form');
      if (this.active && form) this.captureDraft(form);
    });
    document.addEventListener('submit', event => {
      const form = event.target as HTMLFormElement;
      if (!this.active || !['governance-create-form', 'governance-vote-form'].includes(form.id)) return;
      event.preventDefault();
      if (this.busy) return;
      if (form.id === 'governance-create-form') {
        this.captureDraft(form);
        const draft = { ...this.draft };
        void this.run(() => this.client.create(draft), () => { this.creating = false; this.selected = draft.id; this.draft = this.emptyDraft(); });
      } else {
        const choice = new FormData(form).get('choice') as VoteChoice;
        if (['for', 'against', 'abstain'].includes(choice)) void this.run(() => this.client.vote(this.selected, choice));
      }
    });
  }

  private captureDraft(form: HTMLFormElement): void {
    const data = new FormData(form);
    this.draft = { ...this.draft, title: String(data.get('title') ?? ''), description: String(data.get('description') ?? ''),
      category: String(data.get('category')) as ProposalDraft['category'], quorum: Number(data.get('quorum')), durationHours: Number(data.get('durationHours')) };
  }

  render(): string {
    const selected = this.snapshot.proposals.find(proposal => proposal.id === this.selected);
    const ownVote = this.snapshot.myVotes.find(vote => vote.proposalId === this.selected);
    const ballotChoice = this.ballotChoices.get(this.selected) ?? ownVote?.choice;
    const disabled = this.busy ? 'disabled' : '';
    const list = this.snapshot.proposals.filter(proposal => this.filter === 'all' || proposal.status === this.filter);

    const statusBadge = (status: string): string => {
      switch (status) {
        case 'active':
          return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>Active</span>';
        case 'passed':
          return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">Passed</span>';
        case 'rejected':
          return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">Rejected</span>';
        case 'expired':
          return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">Expired</span>';
        default:
          return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">${escape(status)}</span>`;
      }
    };

    const categoryBadge = (cat: string): string => {
      const icons: Record<string, string> = {
        community: '👥',
        protocol: '⚡',
        security: '🛡️',
        funding: '🪙',
      };
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-surface-raised text-slate-300 border border-white/5 font-sans">${icons[cat] || '📋'} ${escape(cat)}</span>`;
    };

    const formatRelativeDeadline = (expiresAt: number): string => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) return 'Ended';
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 24) return `${hours}h left`;
      const days = Math.floor(hours / 24);
      return `${days}d left`;
    };

    return `<section id="governance-workspace" class="space-y-5" aria-busy="${this.busy}">
      <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <span>🏛️</span>
            <span>Community Proposals</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Advisory votes. One sovereign signing identity, one verified ballot.</p>
          <div class="mt-2 flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Normal Sovereign Voting: Server-Confirmed &amp; Active
            </span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-400 border border-white/10">
              <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              Anonymous ZK Ballot: Offline
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" data-governance-action="refresh" class="${buttonClass}" title="Refresh proposals" aria-label="Refresh proposals" ${disabled}>${renderIcon('RefreshCw', { size: 16 })}</button>
          <button type="button" data-governance-action="create" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold px-4 py-2 text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50" ${disabled}>${renderIcon('Plus', { size: 18 })}New proposal</button>
        </div>
      </div>
      ${this.error ? `<p role="alert" class="text-sm text-rose-300 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30">${escape(this.error)}</p>` : ''}
      ${this.busy ? '<p role="status" class="text-sm text-slate-400 animate-pulse">Waiting for server confirmation...</p>' : ''}
      ${this.creating ? `<form id="governance-create-form" class="space-y-4 max-w-2xl mx-auto p-5 rounded-2xl bg-surface-base/80 border border-white/10 shadow-xl">
        <div class="text-sm font-bold text-white pb-2 border-b border-white/5">Create New Advisory Proposal</div>
        <fieldset ${disabled} class="space-y-4">
          <label class="block text-sm font-semibold text-slate-200">Title<input name="title" required maxlength="200" placeholder="Clear, concise proposal summary" class="${inputClass} mt-1" value="${escape(this.draft.title)}"></label>
          <label class="block text-sm font-semibold text-slate-200">Proposal<textarea name="description" required maxlength="10000" rows="6" placeholder="Provide background context, rationale, and specific proposal specifications..." class="${inputClass} mt-1 font-sans">${escape(this.draft.description)}</textarea></label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label class="text-sm font-semibold text-slate-200">Category<select name="category" class="${inputClass} mt-1">${['community', 'protocol', 'security', 'funding'].map(category => `<option ${category === this.draft.category ? 'selected' : ''}>${category}</option>`).join('')}</select></label>
            <label class="text-sm font-semibold text-slate-200">Quorum (identities)<input name="quorum" type="number" required min="1" max="100000" step="1" value="${this.draft.quorum}" class="${inputClass} mt-1"></label>
            <label class="text-sm font-semibold text-slate-200">Duration (hours)<input name="durationHours" type="number" required min="1" max="720" step="1" value="${this.draft.durationHours}" class="${inputClass} mt-1"></label>
          </div>
          <div class="flex gap-2 pt-2"><button type="button" data-governance-action="back" class="${buttonClass}">Cancel</button><button type="submit" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold px-5 py-2 text-sm shadow-sm transition-all cursor-pointer">${renderIcon('Send', { size: 16 })}Publish proposal</button></div>
        </fieldset>
      </form>` : selected ? `
        <div class="space-y-5 max-w-3xl mx-auto">
          <div class="flex items-center justify-between">
            <button type="button" data-governance-action="back" class="${buttonClass}">${renderIcon('ArrowLeft', { size: 16 })}All proposals</button>
            <div class="flex items-center gap-2">
              ${categoryBadge(selected.category)}
              ${statusBadge(selected.status)}
            </div>
          </div>

          <div class="space-y-2">
            <h3 class="text-2xl font-bold text-white break-words">${escape(selected.title)}</h3>
            <div class="flex items-center gap-2 text-xs text-slate-400 flex-wrap font-mono">
              <span>Author: @${escape(selected.authorFP ? selected.authorFP.slice(0, 12) : 'anonymous')}</span>
              <span>•</span>
              <span>Closes ${escape(new Date(selected.expiresAt).toLocaleString())}</span>
            </div>
          </div>

          <div class="p-5 rounded-2xl bg-surface-raised/40 border border-white/5 text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-wrap break-words font-sans shadow-xs">
            ${escape(selected.description)}
          </div>

          <!-- Voting Distribution Breakdown -->
          <div class="p-4 rounded-2xl bg-surface-raised/30 border border-white/5 space-y-3">
            <div class="text-xs font-bold text-slate-300 uppercase tracking-wider">Vote Distribution</div>
            <dl class="grid grid-cols-3 gap-3 border-y border-white/10 py-3">
              <div class="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-center">
                <dt class="text-xs text-emerald-400 font-semibold uppercase">For</dt>
                <dd data-vote-total="for" class="text-2xl font-bold text-white mt-1">${selected.votes.for}</dd>
              </div>
              <div class="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-center">
                <dt class="text-xs text-rose-400 font-semibold uppercase">Against</dt>
                <dd data-vote-total="against" class="text-2xl font-bold text-white mt-1">${selected.votes.against}</dd>
              </div>
              <div class="p-3 rounded-xl bg-slate-900/40 border border-white/5 text-center">
                <dt class="text-xs text-slate-400 font-semibold uppercase">Abstain</dt>
                <dd data-vote-total="abstain" class="text-2xl font-bold text-white mt-1">${selected.votes.abstain}</dd>
              </div>
            </dl>
            <div class="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>${selected.votes.totalVoters} / ${selected.quorumRequired} identities</span>
              <span class="font-mono">${(selected.votes.totalVoters >= selected.quorumRequired) ? '✅ Quorum Reached' : `⏳ ${selected.quorumRequired - selected.votes.totalVoters} needed for quorum`}</span>
            </div>
          </div>

          ${ownVote ? `
            <div class="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span>✅</span>
                <span data-governance-receipt class="text-sm text-emerald-300 font-semibold">Server-confirmed ballot: ${escape(ownVote.choice)}</span>
              </div>
              <span class="text-[11px] font-mono text-emerald-400/80">Signed envelope stored</span>
            </div>
          ` : ''}

          <!-- 1-Click Ballot Selection & Submission -->
          <form id="governance-vote-form" class="space-y-3">
            <div class="text-xs font-bold text-slate-300 uppercase tracking-wider">Cast Your Ballot</div>
            <fieldset ${this.busy || selected.status !== 'active' ? 'disabled' : ''} class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                ${(['for', 'against', 'abstain'] as const).map(choice => {
                  const isSelected = ballotChoice === choice;
                  const icons = { for: '👍', against: '👎', abstain: '🤝' };
                  const titles = { for: 'Support proposal', against: 'Oppose proposal', abstain: 'No preference' };
                  return `
                    <label class="p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected 
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-sm text-white ring-1 ring-amber-500/30' 
                        : 'bg-surface-base/60 hover:bg-surface-raised/60 border-white/10 text-slate-300'
                    }">
                      <input type="radio" name="choice" value="${choice}" required ${isSelected ? 'checked' : ''} class="accent-[var(--color-accent,#e59b3c)] w-4 h-4 cursor-pointer">
                      <div class="min-w-0">
                        <div class="text-xs font-bold flex items-center gap-1.5">
                          <span>${icons[choice]}</span>
                          <span class="capitalize">${choice}</span>
                        </div>
                        <div class="text-[10px] text-slate-400">${titles[choice]}</div>
                      </div>
                    </label>
                  `;
                }).join('')}
              </div>
              <button type="submit" class="w-full sm:w-auto px-6 py-2.5 bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                ${renderIcon('Vote', { size: 16 })}
                <span>${ownVote ? 'Update ballot' : 'Submit ballot'}</span>
              </button>
            </fieldset>
          </form>

          <!-- Anonymous ZK Voting Status Disclosure -->
          <div class="p-3.5 rounded-2xl bg-surface-base/40 border border-white/10 space-y-1.5 text-xs">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-2 text-slate-300 font-semibold">
                <span>🔒</span>
                <span>Anonymous ZK Ballot (Groth16 / RLN)</span>
              </div>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                OFFLINE / UNAVAILABLE
              </span>
            </div>
            <p class="text-slate-400 text-[11px] leading-relaxed font-sans">
              The anonymous ZK ballot issuer and on-chain Groth16 proof verifier are currently offline. Anonymous voting is disabled to prevent unverified ballot pollution. Ballots cast above are recorded with your sovereign signing identity via server-confirmed cryptographic envelopes.
            </p>
          </div>

          <!-- Collapsible Cryptographic Disclosure -->
          <details class="p-3.5 rounded-2xl bg-surface-base/40 border border-white/5 text-xs text-slate-400 group">
            <summary class="cursor-pointer font-mono font-semibold text-[11px] text-slate-300 flex items-center justify-between select-none">
              <span class="flex items-center gap-1.5">
                <span>🔐</span>
                <span>Cryptographic Verification & Envelope Metadata</span>
              </span>
              <span class="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div class="pt-3 space-y-1.5 font-mono text-[11px] text-slate-400 border-t border-white/5 mt-2">
              <div>Proposal ID: <span class="text-slate-300">${escape(selected.id)}</span></div>
              <div>Author Fingerprint: <span class="text-slate-300">${escape(selected.authorFP)}</span></div>
              <div>Ballot Verification: <span class="text-emerald-400 font-bold">ECDSA P-256 + Sovereign Envelope</span></div>
              <div>Replay Nonce: <span class="text-slate-300">Distributed D1 Authority</span></div>
              <div>ZK Proof Engine: <span class="text-amber-400/90 font-bold">Offline (Issuer & Verifier Disconnected)</span></div>
            </div>
          </details>
        </div>
      ` : `
        <div class="flex items-center justify-between gap-3">
          <label class="flex items-center gap-2 text-xs font-semibold text-slate-400">Filter by status:
            <select id="governance-filter" class="${inputClass} max-w-40 py-1.5 text-xs">
              ${['all', 'active', 'passed', 'rejected', 'expired'].map(status => `<option ${this.filter === status ? 'selected' : ''}>${status}</option>`).join('')}
            </select>
          </label>
          <span class="text-xs text-slate-400 font-mono">${list.length} proposal${list.length === 1 ? '' : 's'}</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          ${list.map(proposal => {
            const total = proposal.votes.totalVoters;
            const forPct = total > 0 ? (proposal.votes.for / total) * 100 : 0;
            const againstPct = total > 0 ? (proposal.votes.against / total) * 100 : 0;
            const abstainPct = total > 0 ? (proposal.votes.abstain / total) * 100 : 0;

            return `
              <button 
                type="button" 
                data-governance-action="select" 
                data-proposal-id="${escape(proposal.id)}" 
                class="w-full text-left p-4 rounded-2xl bg-surface-base/80 hover:bg-surface-raised/80 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer space-y-3 group shadow-xs" 
                ${disabled}
              >
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <div class="flex items-center gap-2">
                    ${categoryBadge(proposal.category)}
                    ${statusBadge(proposal.status)}
                  </div>
                  <span class="text-xs font-mono text-slate-400">${formatRelativeDeadline(proposal.expiresAt)}</span>
                </div>
                <div>
                  <h3 class="text-base font-bold text-white group-hover:text-amber-300 transition-colors break-words">${escape(proposal.title)}</h3>
                  <p class="text-xs text-slate-400 line-clamp-2 mt-1 break-words">${escape(proposal.description)}</p>
                </div>
                <!-- Visual vote distribution progress bar -->
                <div class="space-y-1.5 pt-1">
                  <div class="h-2 w-full rounded-full bg-surface-raised overflow-hidden flex">
                    <div style="width: ${forPct}%" class="bg-emerald-500 transition-all"></div>
                    <div style="width: ${againstPct}%" class="bg-rose-500 transition-all"></div>
                    <div style="width: ${abstainPct}%" class="bg-slate-500 transition-all"></div>
                  </div>
                  <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>${proposal.votes.totalVoters} votes (${forPct.toFixed(0)}% For)</span>
                    <span>Quorum: ${proposal.quorumRequired}</span>
                  </div>
                </div>
              </button>
            `;
          }).join('')}
        </div>
        ${!list.length && !this.busy && !this.error ? '<p class="py-12 text-center text-sm text-slate-500">No proposals found.</p>' : ''}
      `}
    </section>`;
  }
}

export const governanceWorkspace = new GovernanceWorkspace(new GovernanceClient(async () => {
  const { clientStore } = await import('./client-state.js');
  await clientStore.identityPersistence;
  if (!clientStore.sovereignKeySet) throw new Error('Signing identity is not ready');
  return clientStore.sovereignKeySet;
}), () => { if (typeof window !== 'undefined') window.clientStore?.notifySync(); });