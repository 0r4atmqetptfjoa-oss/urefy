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
    return `<section id="governance-workspace" class="space-y-4" aria-busy="${this.busy}">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">Community Proposals</h2>
        <div class="flex gap-2">
          <button type="button" data-governance-action="refresh" class="${buttonClass}" title="Refresh proposals" aria-label="Refresh proposals" ${disabled}>${renderIcon('RefreshCw', { size: 18 })}</button>
          <button type="button" data-governance-action="create" class="${buttonClass}" ${disabled}>${renderIcon('Plus', { size: 18 })}New proposal</button>
        </div>
      </div>
      <p class="text-xs text-slate-400">Advisory votes. One signing identity, one ballot. Not anonymous or Sybil-resistant.</p>
      ${this.error ? `<p role="alert" class="text-sm text-red-300">${escape(this.error)}</p>` : ''}
      ${this.busy ? '<p role="status" class="text-sm text-slate-400">Waiting for server confirmation...</p>' : ''}
      ${this.creating ? `<form id="governance-create-form" class="space-y-4">
        <fieldset ${disabled} class="space-y-4">
          <label class="block text-sm">Title<input name="title" required maxlength="200" class="${inputClass}" value="${escape(this.draft.title)}"></label>
          <label class="block text-sm">Proposal<textarea name="description" required maxlength="10000" rows="6" class="${inputClass}">${escape(this.draft.description)}</textarea></label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label class="text-sm">Category<select name="category" class="${inputClass}">${['community', 'protocol', 'security', 'funding'].map(category => `<option ${category === this.draft.category ? 'selected' : ''}>${category}</option>`).join('')}</select></label>
            <label class="text-sm">Quorum (identities)<input name="quorum" type="number" required min="1" max="100000" step="1" value="${this.draft.quorum}" class="${inputClass}"></label>
            <label class="text-sm">Duration (hours)<input name="durationHours" type="number" required min="1" max="720" step="1" value="${this.draft.durationHours}" class="${inputClass}"></label>
          </div>
          <div class="flex gap-2"><button type="button" data-governance-action="back" class="${buttonClass}">Cancel</button><button type="submit" class="${buttonClass}">${renderIcon('Send', { size: 18 })}Publish proposal</button></div>
        </fieldset>
      </form>` : selected ? `
        <button type="button" data-governance-action="back" class="${buttonClass}">${renderIcon('ArrowLeft', { size: 18 })}All proposals</button>
        <h3 class="text-lg font-semibold break-words">${escape(selected.title)}</h3>
        <p class="text-xs text-slate-400 break-all">${escape(selected.authorFP)} · ${escape(selected.category)} · ${escape(selected.status)}</p>
        <p class="text-sm whitespace-pre-wrap break-words">${escape(selected.description)}</p>
        <dl class="grid grid-cols-3 gap-3 border-y border-white/10 py-3">${(['for', 'against', 'abstain'] as const).map(choice => `<div><dt class="text-xs text-slate-400 capitalize">${choice}</dt><dd data-vote-total="${choice}" class="text-lg font-semibold">${selected.votes[choice]}</dd></div>`).join('')}</dl>
        <p class="text-xs text-slate-400">${selected.votes.totalVoters} / ${selected.quorumRequired} identities · Closes ${escape(new Date(selected.expiresAt).toLocaleString())}</p>
        ${ownVote ? `<p data-governance-receipt class="text-sm text-emerald-300">Server-confirmed ballot: ${escape(ownVote.choice)}</p>` : ''}
        <form id="governance-vote-form"><fieldset ${this.busy || selected.status !== 'active' ? 'disabled' : ''} class="flex flex-wrap items-center gap-4">
          ${(['for', 'against', 'abstain'] as const).map(choice => `<label class="flex min-h-11 items-center gap-2 text-sm capitalize"><input type="radio" name="choice" value="${choice}" required ${ballotChoice === choice ? 'checked' : ''}>${choice}</label>`).join('')}
          <button type="submit" class="${buttonClass}">${renderIcon('Vote', { size: 18 })}${ownVote ? 'Update ballot' : 'Submit ballot'}</button>
        </fieldset></form>
      ` : `
        <label class="flex items-center gap-2 text-sm">Status<select id="governance-filter" class="${inputClass} max-w-48">${['all', 'active', 'passed', 'rejected', 'expired'].map(status => `<option ${this.filter === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label>
        <div class="divide-y divide-white/10">${list.map(proposal => `<button type="button" data-governance-action="select" data-proposal-id="${escape(proposal.id)}" class="w-full py-4 text-left hover:bg-white/5" ${disabled}>
          <span class="block text-sm font-semibold break-words">${escape(proposal.title)}</span><span class="text-xs text-slate-400">${escape(proposal.status)} · ${proposal.votes.totalVoters} votes · ${escape(proposal.category)}</span></button>`).join('')}</div>
        ${!list.length && !this.busy && !this.error ? '<p class="py-6 text-sm text-slate-400">No proposals found.</p>' : ''}
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