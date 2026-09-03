// ============================================================================
// sovereign-circle.ts — Sovereign Communities & Circles Engine
// Decentralized Sub-Networks, Governance Rules, Right-Rail & Creation Modal
// 100% Self-contained, TypeScript strict, no external dependencies.
// ============================================================================

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { clientStore } from './client-state.js';

export interface CircleRule {
  id: number;
  title: string;
  description: string;
}

export interface SovereignCircle {
  id: string; // e.g. 'c/zeroknowledge' or channelId 'pulse-global'
  name: string; // 'zeroknowledge'
  displayName: string; // 'Zero-Knowledge & Privacy Protocol'
  channelId: string;
  icon: string;
  banner: string;
  description: string;
  category: string;
  membersCount: number;
  onlineCount: number;
  primaryColor: string;
  rules: CircleRule[];
  flairs: string[];
  isJoined: boolean;
  createdAt: string;
  isCustom?: boolean;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class SovereignCircleEngine {
  public circles: Map<string, SovereignCircle> = new Map();
  public isCreateModalOpen: boolean = false;
  public expandedRuleIndices: Map<string, number | null> = new Map();
  public selectedFlair: string | null = null;

  // New circle form state
  public formName: string = '';
  public formDisplayName: string = '';
  public formCategory: string = 'Cryptography & Security';
  public formDescription: string = '';
  public formPrimaryColor: string = '#6366f1';
  public formRules: { title: string; description: string }[] = [
    { title: 'Cryptographic Verification Mandatory', description: 'All protocol releases and code assertions must include zero-knowledge proofs or reproducible hashes.' },
    { title: 'Zero Plaintext Telemetry', description: 'Protect user autonomy; do not transmit sensitive identities, private keys, or unmasked IP logs.' },
    { title: 'Maintain Constructive Decorum', description: 'Critique architectures rigorously while fostering collaborative open-source peer review.' }
  ];

  constructor() {
    this.seedDefaultCircles();
    this._initGlobalDomListeners();
  }

  private seedDefaultCircles(): void {
    const defaultCircles: SovereignCircle[] = [
      {
        id: 'pulse-global',
        name: 'zeroknowledge',
        displayName: 'Zero-Knowledge & Cryptographic Privacy',
        channelId: 'pulse-global',
        icon: '⚡',
        banner: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        description: 'Decentralized cryptographic research, recursive SNARK verification, zero-leakage rate limiting, and private computing architectures.',
        category: 'Cryptography & Security',
        membersCount: 14200,
        onlineCount: 342,
        primaryColor: '#6366f1',
        rules: [
          { id: 1, title: 'Cryptographic Citations Mandatory', description: 'Submissions must cite verifiable mathematical formulas, RFC specs, or audited circuit repositories.' },
          { id: 2, title: 'Zero Plaintext Secrets', description: 'Never leak nullifiers, private seeds, or unblinded user identities in public discussion streams.' },
          { id: 3, title: 'Rigorous Peer Review Decorum', description: 'Technical critiques should remain civil, evidence-backed, and reproducible.' },
          { id: 4, title: 'No Unverified Heuristics', description: 'Empirical claims must be accompanied by benchmark telemetry or reproducible test harnesses.' }
        ],
        flairs: ['VERIFIED RELEASE', 'SECURITY ADVISORY', 'TECH DISCUSSION', 'MICRO-PULSE', 'ASK COMMUNITY'],
        isJoined: true,
        createdAt: 'Jan 2026',
      },
      {
        id: 'vault-releases',
        name: 'clean-releases',
        displayName: 'Reproducible Binary Knowledge Vault',
        channelId: 'vault-releases',
        icon: '📦',
        banner: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
        description: 'Audited reproducible software distributions, deterministic builds, Merkle tree ledgers, and PE/ELF binary hygiene passports.',
        category: 'Software & Vault',
        membersCount: 8900,
        onlineCount: 184,
        primaryColor: '#10b981',
        rules: [
          { id: 1, title: 'Zero PE/ELF RWX Memory Segments', description: 'All uploaded software must pass static analysis without writable+executable memory sections.' },
          { id: 2, title: 'Strict Entropy Distribution Scan', description: 'Packed or encrypted payload sections must be accompanied by full verifiable source audits.' },
          { id: 3, title: 'Deterministic Hash Matching', description: 'Release SHA256 checksums must match the git commit tree Merkle roots byte-for-byte.' }
        ],
        flairs: ['VERIFIED RELEASE', 'SECURITY ADVISORY', 'TECH DISCUSSION'],
        isJoined: true,
        createdAt: 'Feb 2026',
      },
      {
        id: 'vault-guides',
        name: 'security-guides',
        displayName: 'Decentralized Defensive Playbooks',
        channelId: 'vault-guides',
        icon: '🛡️',
        banner: 'linear-gradient(135deg, #701a75 0%, #86198f 50%, #a21caf 100%)',
        description: 'Hardening protocols, threat modeling documentation, zero-trust cryptographic architectures, and CVE mitigations.',
        category: 'Cyber Defense',
        membersCount: 6500,
        onlineCount: 98,
        primaryColor: '#ec4899',
        rules: [
          { id: 1, title: 'Responsible Vulnerability Disclosure', description: 'Follow standard zero-day embargo protocols before publicly posting exploit proof-of-concepts.' },
          { id: 2, title: 'Actionable Hardening Recipes', description: 'Guides must include copy-pasteable configuration scripts and test harness validation steps.' }
        ],
        flairs: ['SECURITY ADVISORY', 'TECH DISCUSSION', 'VERIFIED RELEASE'],
        isJoined: false,
        createdAt: 'Feb 2026',
      },
      {
        id: 'relays-general',
        name: 'p2p-mesh',
        displayName: 'Peer-to-Peer Swarm & WebRTC Mesh',
        channelId: 'relays-general',
        icon: '🌐',
        banner: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)',
        description: 'Decentralized DHT discovery, WebRTC direct transport, SFrame E2EE media streams, and MLS TreeKEM relay routing.',
        category: 'P2P Networking',
        membersCount: 11300,
        onlineCount: 276,
        primaryColor: '#06b6d4',
        rules: [
          { id: 1, title: 'SFrame Noise Protocol Compliance', description: 'Audio and video payload packets must adhere strictly to TreeKEM RFC 9420 framing.' },
          { id: 2, title: 'Bandwidth & Swarm Courtesy', description: 'Rate-limit automated gossip stress testing to prevent mesh topology congestion.' }
        ],
        flairs: ['MICRO-PULSE', 'TECH DISCUSSION', 'ASK COMMUNITY'],
        isJoined: true,
        createdAt: 'Jan 2026',
      }
    ];

    for (const c of defaultCircles) {
      this.circles.set(c.id, c);
      this.circles.set(c.channelId, c);
      this.circles.set(`c/${c.name}`, c);
    }
  }

  public getCircle(channelOrCircleId: string): SovereignCircle | undefined {
    return this.circles.get(channelOrCircleId) || this.circles.get('pulse-global');
  }

  public getAllCircles(): SovereignCircle[] {
    const set = new Set<SovereignCircle>();
    for (const c of this.circles.values()) {
      set.add(c);
    }
    return Array.from(set);
  }

  public toggleJoin(circleId: string): boolean {
    const c = this.getCircle(circleId);
    if (!c) return false;
    c.isJoined = !c.isJoined;
    c.membersCount += c.isJoined ? 1 : -1;
    return c.isJoined;
  }

  public setSelectedFlair(flair: string | null): void {
    this.selectedFlair = flair;
  }

  public toggleRuleExpansion(circleId: string, ruleIdx: number): void {
    const current = this.expandedRuleIndices.get(circleId);
    if (current === ruleIdx) {
      this.expandedRuleIndices.set(circleId, null);
    } else {
      this.expandedRuleIndices.set(circleId, ruleIdx);
    }
  }

  public createCircle(data: {
    name: string;
    displayName: string;
    description: string;
    category: string;
    primaryColor: string;
    rules: { title: string; description: string }[];
  }): SovereignCircle {
    const cleanName = data.name.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'sovereign_circle';
    const channelId = `pulse-${cleanName}`;
    const newCircle: SovereignCircle = {
      id: channelId,
      name: cleanName,
      displayName: data.displayName || `c/${cleanName}`,
      channelId,
      icon: '🏛️',
      banner: `linear-gradient(135deg, ${data.primaryColor}33 0%, #1e1b4b 100%)`,
      description: data.description || 'A newly chartered sovereign decentralized circle.',
      category: data.category || 'General Discussions',
      membersCount: 1,
      onlineCount: 1,
      primaryColor: data.primaryColor || '#6366f1',
      rules: data.rules.map((r, i) => ({ id: i + 1, title: r.title, description: r.description })),
      flairs: ['TECH DISCUSSION', 'VERIFIED RELEASE', 'MICRO-PULSE', 'SECURITY ADVISORY'],
      isJoined: true,
      createdAt: 'Just now',
      isCustom: true,
    };

    this.circles.set(newCircle.id, newCircle);
    this.circles.set(`c/${newCircle.name}`, newCircle);

    // Register channel in clientStore
    clientStore.channels.push({
      id: channelId,
      space: 'pulse',
      name: `c/${cleanName}`,
      description: newCircle.description,
      isEncrypted: false,
    });

    clientStore.activeChannelId = channelId;
    return newCircle;
  }

  // ─── Renderers ───────────────────────────────────────────────────────────

  /**
   * Renders the Sovereign Circle sidebar widget inside the right-rail.
   */
  public renderSidebarCircleCard(channelId: string = clientStore.activeChannelId): string {
    const circle = this.getCircle(channelId);
    if (!circle) return '';

    const expandedIdx = this.expandedRuleIndices.get(circle.id);

    return `
      <div id="sovereign-circle-sidebar-card" class="rounded-2xl bg-surface-raised/90 border border-white/5 overflow-hidden shadow-sm space-y-0">
        
        <!-- CIRCLE HEADER BANNER -->
        <div class="h-16 w-full relative p-3 flex items-end" style="background: ${circle.banner};">
          <div class="absolute inset-0 bg-gradient-to-t from-surface-raised via-transparent to-transparent opacity-80"></div>
          <div class="relative z-10 flex items-center space-x-2">
            <div class="w-9 h-9 rounded-xl bg-surface-base border border-white/10 flex items-center justify-center text-xl shadow-md">
              ${circle.icon}
            </div>
            <div>
              <h3 class="text-xs font-bold text-white leading-tight font-mono">c/${escapeHtml(circle.name)}</h3>
              <p class="text-[10px] text-indigo-300 font-medium truncate max-w-[160px]">${escapeHtml(circle.displayName)}</p>
            </div>
          </div>
        </div>

        <div class="p-3.5 space-y-3">
          <!-- CIRCLE DESCRIPTION -->
          <p class="text-xs text-slate-300 leading-relaxed">
            ${escapeHtml(circle.description)}
          </p>

          <!-- METRICS GRID -->
          <div class="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
            <div class="p-2 rounded-xl bg-surface-overlay border border-white/5 text-center">
              <div class="text-[10px] text-slate-400 font-bold uppercase">NODES</div>
              <div class="font-bold text-white text-xs mt-0.5">${(circle.membersCount).toLocaleString()}</div>
            </div>
            <div class="p-2 rounded-xl bg-surface-overlay border border-white/5 text-center">
              <div class="text-[10px] text-slate-400 font-bold uppercase">ONLINE</div>
              <div class="font-bold text-emerald-400 text-xs mt-0.5 flex items-center justify-center space-x-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>${circle.onlineCount} Mesh</span>
              </div>
            </div>
          </div>

          <!-- ACTIONS: JOIN & CREATE PUBLICATION -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button 
              type="button" 
              id="btn-toggle-join-circle" 
              data-circle-id="${circle.id}"
              class="py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                circle.isJoined
                  ? 'bg-surface-overlay text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
              }"
            >
              <span>${circle.isJoined ? '✓ Joined' : '+ Join Circle'}</span>
            </button>

            <button 
              type="button" 
              id="btn-circle-create-post" 
              class="py-2 px-3 rounded-xl bg-surface-overlay hover:bg-surface-highlight text-white text-xs font-bold border border-white/10 transition-all flex items-center justify-center space-x-1 cursor-pointer"
            >
              <span>✍️ Broadcast</span>
            </button>
          </div>

          <!-- CREATE COMMUNITY MODAL TRIGGER BUTTON -->
          <button 
            type="button" 
            id="btn-open-create-circle-modal" 
            class="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-cyan-600/20 hover:from-indigo-600/30 hover:to-cyan-600/30 text-indigo-200 border border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <span>✨</span>
            <span>Charter New Sovereign Circle</span>
          </button>

          <!-- SOVEREIGN CIRCLE RULES ACCORDION -->
          <div class="pt-2 border-t border-white/5 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-white uppercase tracking-wide text-[10px] flex items-center space-x-1.5">
                <span>🛡️</span>
                <span>Circle Governance Rules (${circle.rules.length})</span>
              </span>
            </div>

            <div class="space-y-1.5 text-xs">
              ${circle.rules.map((rule, idx) => `
                <div class="p-2 rounded-xl bg-surface-base border border-white/5 space-y-1">
                  <button 
                    type="button" 
                    data-toggle-rule-circle="${circle.id}" 
                    data-rule-idx="${idx}"
                    class="btn-toggle-rule w-full text-left font-semibold text-slate-200 hover:text-white flex items-center justify-between text-[11px] cursor-pointer"
                  >
                    <span class="truncate pr-2">${idx + 1}. ${escapeHtml(rule.title)}</span>
                    <span class="text-slate-500 text-[10px] shrink-0">${expandedIdx === idx ? '▲' : '▼'}</span>
                  </button>
                  ${expandedIdx === idx ? `
                    <p class="text-[10px] text-slate-400 pl-3 leading-relaxed border-l border-indigo-500/40 mt-1 py-0.5">
                      ${escapeHtml(rule.description)}
                    </p>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- FILTER BY FLAIR -->
          ${circle.flairs && circle.flairs.length > 0 ? `
            <div class="pt-2 border-t border-white/5 space-y-2">
              <div class="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span class="uppercase tracking-wider font-bold">Filter by Protocol Flair</span>
                ${this.selectedFlair ? `
                  <button type="button" id="btn-clear-flair-filter" class="text-indigo-400 hover:underline cursor-pointer">Clear</button>
                ` : ''}
              </div>

              <div class="flex flex-wrap gap-1">
                ${circle.flairs.map((flair) => `
                  <button 
                    type="button" 
                    data-select-flair="${flair}" 
                    class="btn-flair-filter text-[10px] font-mono px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                      this.selectedFlair === flair
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'bg-surface-overlay text-slate-300 hover:text-white hover:bg-surface-highlight border border-white/5'
                    }"
                  >
                    ${flair}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    `;
  }

  /**
   * Renders the Create Sovereign Circle Modal.
   */
  public renderCreateCircleModal(): string {
    if (!this.isCreateModalOpen) return '';

    const colorPresets = ['#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

    return `
      <div id="create-circle-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-md animate-in fade-in duration-150">
        <div class="relative w-full max-w-xl bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <!-- MODAL HEADER -->
          <div class="px-6 py-4 border-b border-white/10 bg-surface-raised flex items-center justify-between">
            <div class="flex items-center space-x-2.5">
              <div class="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xl border border-indigo-500/30">
                🏛️
              </div>
              <div>
                <h2 class="text-sm sm:text-base font-bold text-white">Charter Sovereign Circle</h2>
                <p class="text-[11px] text-slate-400 font-mono">Establish a peer-governed collective with custom cryptoeconomic rules</p>
              </div>
            </div>
            <button 
              type="button" 
              id="btn-close-create-circle-modal" 
              class="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-surface-overlay transition-colors font-mono text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- MODAL FORM BODY -->
          <form id="form-create-sovereign-circle" class="p-6 space-y-4 overflow-y-auto flex-1">
            
            <!-- NAME -->
            <div>
              <label class="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                Circle Identifier <span class="text-indigo-400">*</span>
              </label>
              <div class="relative flex items-center">
                <span class="absolute left-3.5 text-xs font-mono font-bold text-slate-500">c/</span>
                <input 
                  type="text" 
                  id="input-circle-name"
                  required
                  placeholder="cryptographic_hub" 
                  value="${escapeHtml(this.formName)}"
                  class="w-full bg-surface-raised border border-white/10 focus:border-indigo-500 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono font-bold"
                />
              </div>
              <p class="text-[10px] text-slate-500 mt-1 font-mono">Lowercase letters, numbers, and underscores only. Immutable once signed.</p>
            </div>

            <!-- DISPLAY TITLE -->
            <div>
              <label class="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                Display Title
              </label>
              <input 
                type="text" 
                id="input-circle-display-title"
                placeholder="e.g. Applied ZK Verification Lab" 
                value="${escapeHtml(this.formDisplayName)}"
                class="w-full bg-surface-raised border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <!-- CATEGORY -->
            <div>
              <label class="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                Domain / Topic Category
              </label>
              <select 
                id="input-circle-category"
                class="w-full bg-surface-raised border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="Cryptography & Security" ${this.formCategory === 'Cryptography & Security' ? 'selected' : ''}>Cryptography & Security</option>
                <option value="Software & Vault" ${this.formCategory === 'Software & Vault' ? 'selected' : ''}>Software & Vault</option>
                <option value="P2P Networking" ${this.formCategory === 'P2P Networking' ? 'selected' : ''}>P2P Networking & Swarms</option>
                <option value="Governance & DAO" ${this.formCategory === 'Governance & DAO' ? 'selected' : ''}>Governance & DAO</option>
                <option value="General Sovereign" ${this.formCategory === 'General Sovereign' ? 'selected' : ''}>General Sovereign Discussions</option>
              </select>
            </div>

            <!-- DESCRIPTION -->
            <div>
              <label class="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                Circle Charter & Description
              </label>
              <textarea 
                id="input-circle-description"
                rows="3"
                placeholder="Explain the mission, goals, and technical focus of this sovereign collective..."
                class="w-full bg-surface-raised border border-white/10 focus:border-indigo-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none leading-relaxed resize-none"
              >${escapeHtml(this.formDescription)}</textarea>
            </div>

            <!-- PRIMARY ACCENT COLOR -->
            <div>
              <label class="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Theme Color Palette
              </label>
              <div class="flex items-center space-x-2">
                ${colorPresets.map(color => `
                  <button 
                    type="button" 
                    data-color="${color}" 
                    class="btn-color-preset w-7 h-7 rounded-full transition-transform flex items-center justify-center cursor-pointer ${
                      this.formPrimaryColor === color ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                    }"
                    style="background-color: ${color};"
                  >
                    ${this.formPrimaryColor === color ? '<span class="text-white text-xs">✓</span>' : ''}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- RULES LIST -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Governance Rules (${this.formRules.length})
                </label>
                <button 
                  type="button" 
                  id="btn-add-circle-rule" 
                  class="text-xs text-indigo-400 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>+ Add Rule</span>
                </button>
              </div>

              <div id="circle-rules-inputs-container" class="space-y-2.5">
                ${this.formRules.map((rule, idx) => `
                  <div class="p-3 rounded-xl bg-surface-raised border border-white/5 space-y-2 relative group/rule">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-xs font-mono font-bold text-indigo-400">${idx + 1}.</span>
                      <input 
                        type="text" 
                        data-rule-title-idx="${idx}"
                        value="${escapeHtml(rule.title)}" 
                        placeholder="Rule Title (e.g. Zero RWX Sections)"
                        class="flex-1 bg-surface-base border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      ${this.formRules.length > 1 ? `
                        <button 
                          type="button" 
                          data-remove-rule-idx="${idx}" 
                          class="btn-remove-rule text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-surface-overlay transition-colors"
                          title="Remove rule"
                        >
                          ✕
                        </button>
                      ` : ''}
                    </div>
                    <input 
                      type="text" 
                      data-rule-desc-idx="${idx}"
                      value="${escapeHtml(rule.description)}" 
                      placeholder="Rule Details & Consequences..."
                      class="w-full bg-surface-base border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- MODAL FOOTER -->
            <div class="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
              <button 
                type="button" 
                id="btn-cancel-create-circle" 
                class="px-4 py-2 text-xs font-mono font-semibold text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button 
                type="submit" 
                id="btn-submit-create-circle" 
                class="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                Charter Circle
              </button>
            </div>

          </form>

        </div>
      </div>
    `;
  }

  // ─── Interactive DOM Event Handling ────────────────────────────────────────

  private _initGlobalDomListeners(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1. Open create circle modal
      if (target.closest('#btn-open-create-circle-modal')) {
        e.preventDefault();
        this.isCreateModalOpen = true;
        this._refreshCircleViewsInDom();
        return;
      }

      // 2. Close create circle modal
      if (target.closest('#btn-close-create-circle-modal') || target.closest('#btn-cancel-create-circle')) {
        e.preventDefault();
        this.isCreateModalOpen = false;
        this._refreshCircleViewsInDom();
        return;
      }

      // 2b. Click backdrop to close
      if (target.id === 'create-circle-modal-backdrop') {
        this.isCreateModalOpen = false;
        this._refreshCircleViewsInDom();
        return;
      }

      // 3. Toggle join circle
      const joinBtn = target.closest('#btn-toggle-join-circle') as HTMLElement | null;
      if (joinBtn) {
        e.preventDefault();
        const cid = joinBtn.getAttribute('data-circle-id') || clientStore.activeChannelId;
        this.toggleJoin(cid);
        this._refreshCircleViewsInDom();
        return;
      }

      // 4. Toggle rule accordion in sidebar
      const ruleBtn = target.closest('.btn-toggle-rule') as HTMLElement | null;
      if (ruleBtn) {
        e.preventDefault();
        const circleId = ruleBtn.getAttribute('data-toggle-rule-circle') || clientStore.activeChannelId;
        const idx = parseInt(ruleBtn.getAttribute('data-rule-idx') || '0', 10);
        this.toggleRuleExpansion(circleId, idx);
        this._refreshCircleViewsInDom();
        return;
      }

      // 5. Select flair filter in sidebar
      const flairBtn = target.closest('.btn-flair-filter') as HTMLElement | null;
      if (flairBtn) {
        e.preventDefault();
        const flair = flairBtn.getAttribute('data-select-flair');
        if (this.selectedFlair === flair) {
          this.selectedFlair = null;
        } else {
          this.selectedFlair = flair;
        }
        clientStore.notify();
        return;
      }

      if (target.closest('#btn-clear-flair-filter')) {
        e.preventDefault();
        this.selectedFlair = null;
        clientStore.notify();
        return;
      }

      // 6. Color preset in modal
      const colorBtn = target.closest('.btn-color-preset') as HTMLElement | null;
      if (colorBtn) {
        e.preventDefault();
        const color = colorBtn.getAttribute('data-color');
        if (color) {
          this.formPrimaryColor = color;
          this._refreshCircleViewsInDom();
        }
        return;
      }

      // 7. Add rule in modal
      if (target.closest('#btn-add-circle-rule')) {
        e.preventDefault();
        this.formRules.push({
          title: `Rule ${this.formRules.length + 1}`,
          description: 'Provide clear expectations for community discourse and submissions.',
        });
        this._refreshCircleViewsInDom();
        return;
      }

      // 8. Remove rule in modal
      const removeRuleBtn = target.closest('.btn-remove-rule') as HTMLElement | null;
      if (removeRuleBtn) {
        e.preventDefault();
        const idx = parseInt(removeRuleBtn.getAttribute('data-remove-rule-idx') || '0', 10);
        this.formRules = this.formRules.filter((_, i) => i !== idx);
        this._refreshCircleViewsInDom();
        return;
      }
    });

    // Form submission
    document.addEventListener('submit', (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.id !== 'form-create-sovereign-circle') return;
      e.preventDefault();

      const nameInput = document.getElementById('input-circle-name') as HTMLInputElement | null;
      const titleInput = document.getElementById('input-circle-display-title') as HTMLInputElement | null;
      const catInput = document.getElementById('input-circle-category') as HTMLSelectElement | null;
      const descInput = document.getElementById('input-circle-description') as HTMLTextAreaElement | null;

      const rawName = nameInput ? nameInput.value.trim() : '';
      if (!rawName) return;

      // Harvest rules
      const ruleTitles = Array.from(document.querySelectorAll('[data-rule-title-idx]')) as HTMLInputElement[];
      const ruleDescs = Array.from(document.querySelectorAll('[data-rule-desc-idx]')) as HTMLInputElement[];

      const rules = ruleTitles.map((tEl, i) => ({
        title: tEl.value.trim() || `Rule ${i + 1}`,
        description: (ruleDescs[i] && ruleDescs[i].value.trim()) || 'Standard governance guideline.',
      }));

      this.createCircle({
        name: rawName,
        displayName: titleInput ? titleInput.value.trim() : `c/${rawName}`,
        category: catInput ? catInput.value : 'Cryptography & Security',
        description: descInput ? descInput.value.trim() : 'Sovereign circle.',
        primaryColor: this.formPrimaryColor,
        rules,
      });

      this.isCreateModalOpen = false;
      this.formName = '';
      this.formDisplayName = '';
      this.formDescription = '';
      clientStore.notify();
    });
  }

  private _refreshCircleViewsInDom(): void {
    if (typeof document === 'undefined') return;
    clientStore.notify();
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────
export const sovereignCircleEngine = new SovereignCircleEngine();
serviceRegistry.registerInstance(SERVICES.Governance || 'SovereignCircle', sovereignCircleEngine);
