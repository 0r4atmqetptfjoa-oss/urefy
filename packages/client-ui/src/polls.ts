import { serviceRegistry, SERVICES } from './service-registry.js';

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
}

export interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  voterMap: Map<string, string>; // voterFingerprint -> optionId
}

export class PollEngine {
  private polls: Map<string, PollData> = new Map();

  constructor() {
    // Seed initial poll
    this.createPoll('poll-genesis-1', 'Should UREfy prioritize native mobile NFC ZK-Passport reading or Tor / I2P onion onion routing bridges first?', [
      'Native Mobile NFC ZK-Passport (Android/iOS)',
      'Tor / I2P Hidden Service Onion Bridges',
      'Quantum-Resistant Kyber-1024 Ratchet Expansion',
    ]);

    // Seed some initial community votes
    this.castVote('poll-genesis-1', 'opt-0', 'genesis-core');
    this.castVote('poll-genesis-1', 'opt-0', 'c3dc28cb705e');
    this.castVote('poll-genesis-1', 'opt-1', 'a89104fa2211');
    this.castVote('poll-genesis-1', 'opt-0', 'f40019bc88a2');
    this.castVote('poll-genesis-1', 'opt-2', '9b22a011cd44');
  }

  public createPoll(pollId: string, question: string, optionTexts: string[]): PollData {
    const options: PollOption[] = optionTexts.map((text, idx) => ({
      id: `opt-${idx}`,
      text,
      voteCount: 0,
    }));

    const poll: PollData = {
      id: pollId,
      question,
      options,
      totalVotes: 0,
      voterMap: new Map(),
    };

    this.polls.set(pollId, poll);
    return poll;
  }

  public getPoll(pollId: string): PollData | undefined {
    return this.polls.get(pollId);
  }

  public castVote(pollId: string, optionId: string, voterFingerprint: string): boolean {
    const poll = this.polls.get(pollId);
    if (!poll) return false;

    // Check if user already voted
    const existingVote = poll.voterMap.get(voterFingerprint);
    if (existingVote) {
      if (existingVote === optionId) return false; // same vote
      // change vote
      const prevOpt = poll.options.find(o => o.id === existingVote);
      if (prevOpt) prevOpt.voteCount--;
    } else {
      poll.totalVotes++;
    }

    const newOpt = poll.options.find(o => o.id === optionId);
    if (!newOpt) return false;

    newOpt.voteCount++;
    poll.voterMap.set(voterFingerprint, optionId);
    return true;
  }

  public renderPollCard(pollId: string, currentFingerprint: string): string {
    const poll = this.polls.get(pollId);
    if (!poll) return '';

    const userVotedOptionId = poll.voterMap.get(currentFingerprint);
    const hasVoted = Boolean(userVotedOptionId);

    return `
      <div class="p-3.5 rounded-xl bg-surface-base border border-white/10 my-2 space-y-3 select-none">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-slate-200 flex items-center space-x-1.5">
            <span>📊</span>
            <span>Cryptographic Community Poll</span>
          </span>
          <span class="font-mono text-[10px] text-slate-500">${poll.totalVotes} Total Votes</span>
        </div>

        <h4 class="text-xs font-semibold text-slate-100 leading-snug">
          ${poll.question}
        </h4>

        <div class="space-y-2">
          ${poll.options.map(opt => {
            const isSelected = userVotedOptionId === opt.id;
            const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0;

            if (hasVoted) {
              return `
                <div class="relative overflow-hidden rounded-lg bg-surface-raised border ${isSelected ? 'border-cyphr shadow-cyphr-sm' : 'border-white/5'} p-2.5 transition-all">
                  <!-- PROGRESS BAR BACKGROUND -->
                  <div class="absolute inset-y-0 left-0 bg-cyphr/15 transition-all duration-500 ease-out" style="width: ${pct}%;"></div>
                  
                  <div class="relative flex items-center justify-between text-xs z-10">
                    <span class="flex items-center space-x-1.5 font-medium ${isSelected ? 'text-cyphr font-bold' : 'text-slate-200'}">
                      ${isSelected ? '<span>✓</span>' : ''}
                      <span>${opt.text}</span>
                    </span>
                    <span class="font-mono text-[11px] font-bold ${isSelected ? 'text-cyphr' : 'text-slate-400'}">
                      ${pct}% (${opt.voteCount})
                    </span>
                  </div>
                </div>
              `;
            }

            return `
              <button 
                data-poll-id="${poll.id}" 
                data-option-id="${opt.id}" 
                class="btn-vote-poll w-full text-left p-2.5 rounded-lg bg-surface-raised hover:bg-surface-overlay hover:border-cyphr/50 border border-white/10 text-xs font-medium text-slate-200 transition-all flex items-center justify-between group"
              >
                <span class="group-hover:text-cyphr transition-colors">${opt.text}</span>
                <span class="text-[10px] font-mono text-slate-500 group-hover:text-cyphr">Vote</span>
              </button>
            `;
          }).join('')}
        </div>

        <div class="text-[10px] font-mono text-slate-500 flex items-center justify-between pt-1">
          <span>Tied to Ed25519 sovereign keypair</span>
          <span>1 Vote / Identity</span>
        </div>
      </div>
    `;
  }
}

export const pollEngine = new PollEngine();
serviceRegistry.registerInstance(SERVICES.PollEngine, pollEngine);
