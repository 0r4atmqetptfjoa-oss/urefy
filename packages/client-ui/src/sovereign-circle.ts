// ============================================================================
// sovereign-circle.ts — Sovereign Communities & Circles Engine
// Decentralized Sub-Networks, Governance Rules, Right-Rail & Creation Modal
// 100% Self-contained, TypeScript strict, no external dependencies.
// ============================================================================

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { clientStore } from './client-state.js';
import { t } from './i18n.js';

export interface CircleRule {
  id: number;
  title: string;
  description: string;
}

export type CommunityType = 'public' | 'restricted' | 'private';

export interface SovereignCircle {
  id: string; // e.g. 'c/zeroknowledge' or channelId 'pulse-global'
  name: string; // 'zeroknowledge'
  displayName: string; // 'Zero-Knowledge & Privacy Protocol'
  channelId: string;
  icon: string;
  banner: string;
  description: string;
  category: string;
  communityType?: CommunityType;
  membersCount: number;
  onlineCount: number;
  primaryColor: string;
  rules: CircleRule[];
  flairs: string[];
  isJoined: boolean;
  createdAt: string;
  isCustom?: boolean;
  creatorFingerprint?: string;
  moderators?: string[];
  bannedFingerprints?: string[];
  pinnedPostId?: string;
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
  public isModModalOpen: boolean = false;
  public modModalCircleId: string | null = null;
  public activeModTab: 'settings' | 'rules' | 'flairs' | 'moderation' = 'settings';
  public expandedRuleIndices: Map<string, number | null> = new Map();
  public selectedFlair: string | null = null;

  private readonly STORAGE_CUSTOM_KEY = 'aetheris_sovereign_circles_custom';
  private readonly STORAGE_JOINED_KEY = 'aetheris_sovereign_circles_joined';

  // New circle form state
  public formName: string = '';
  public formDisplayName: string = '';
  public formCategory: string = 'Cryptography & Security';
  public formCommunityType: CommunityType = 'public';
  public formDescription: string = '';
  public formPrimaryColor: string = '#6366f1';
  public formRules: { title: string; description: string }[] = [
    { title: 'Cryptographic Verification Mandatory', description: 'All protocol releases and code assertions must include zero-knowledge proofs or reproducible hashes.' },
    { title: 'Zero Plaintext Telemetry', description: 'Protect user autonomy; do not transmit sensitive identities, private keys, or unmasked IP logs.' },
    { title: 'Maintain Constructive Decorum', description: 'Critique architectures rigorously while fostering collaborative open-source peer review.' }
  ];

  constructor() {
    this.seedDefaultCircles();
    this.loadFromStorage();
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
        membersCount: 0,
        onlineCount: 0,
        primaryColor: '#6366f1',
        rules: [
          { id: 1, title: 'Cryptographic Citations Mandatory', description: 'Submissions must cite verifiable mathematical formulas, RFC specs, or audited circuit repositories.' },
          { id: 2, title: 'Zero Plaintext Secrets', description: 'Never leak nullifiers, private seeds, or unblinded user identities in public discussion streams.' },
          { id: 3, title: 'Rigorous Peer Review Decorum', description: 'Technical critiques should remain civil, evidence-backed, and reproducible.' },
          { id: 4, title: 'No Unverified Heuristics', description: 'Empirical claims must be accompanied by benchmark telemetry or reproducible test harnesses.' }
        ],
        flairs: ['VERIFIED RELEASE', 'SECURITY ADVISORY', 'TECH DISCUSSION', 'MICRO-PULSE', 'ASK COMMUNITY'],
        isJoined: true,
        createdAt: '',
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
        membersCount: 0,
        onlineCount: 0,
        primaryColor: '#10b981',
        rules: [
          { id: 1, title: 'Zero PE/ELF RWX Memory Segments', description: 'All uploaded software must pass static analysis without writable+executable memory sections.' },
          { id: 2, title: 'Strict Entropy Distribution Scan', description: 'Packed or encrypted payload sections must be accompanied by full verifiable source audits.' },
          { id: 3, title: 'Deterministic Hash Matching', description: 'Release SHA256 checksums must match the git commit tree Merkle roots byte-for-byte.' }
        ],
        flairs: ['VERIFIED RELEASE', 'SECURITY ADVISORY', 'TECH DISCUSSION'],
        isJoined: true,
        createdAt: '',
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
        membersCount: 0,
        onlineCount: 0,
        primaryColor: '#ec4899',
        rules: [
          { id: 1, title: 'Responsible Vulnerability Disclosure', description: 'Follow standard zero-day embargo protocols before publicly posting exploit proof-of-concepts.' },
          { id: 2, title: 'Actionable Hardening Recipes', description: 'Guides must include copy-pasteable configuration scripts and test harness validation steps.' }
        ],
        flairs: ['SECURITY ADVISORY', 'TECH DISCUSSION', 'VERIFIED RELEASE'],
        isJoined: false,
        createdAt: '',
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
        membersCount: 0,
        onlineCount: 0,
        primaryColor: '#06b6d4',
        rules: [
          { id: 1, title: 'SFrame Noise Protocol Compliance', description: 'Audio and video payload packets must adhere strictly to TreeKEM RFC 9420 framing.' },
          { id: 2, title: 'Bandwidth & Swarm Courtesy', description: 'Rate-limit automated gossip stress testing to prevent mesh topology congestion.' }
        ],
        flairs: ['MICRO-PULSE', 'TECH DISCUSSION', 'ASK COMMUNITY'],
        isJoined: true,
        createdAt: '',
      }
    ];

    for (const c of defaultCircles) {
      this.circles.set(c.id, c);
      this.circles.set(c.channelId, c);
      this.circles.set(`c/${c.name}`, c);
    }
  }

  public loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const customRaw = localStorage.getItem(this.STORAGE_CUSTOM_KEY);
      if (customRaw) {
        const customCircles: SovereignCircle[] = JSON.parse(customRaw);
        for (const c of customCircles) {
          this.circles.set(c.id, c);
          this.circles.set(c.channelId, c);
          this.circles.set(`c/${c.name}`, c);
          if (typeof window !== 'undefined' && (window as any).clientStore) {
            const exists = (window as any).clientStore.channels.some((ch: any) => ch.id === c.channelId);
            if (!exists) {
              (window as any).clientStore.channels.push({
                id: c.channelId,
                space: 'pulse',
                name: `c/${c.name}`,
                description: c.description,
                isEncrypted: false,
              });
            }
          }
        }
      }

      const joinedRaw = localStorage.getItem(this.STORAGE_JOINED_KEY);
      if (joinedRaw) {
        const joinedMap: Record<string, boolean> = JSON.parse(joinedRaw);
        for (const [cid, isJoined] of Object.entries(joinedMap)) {
          const c = this.getCircle(cid);
          if (c) {
            c.isJoined = isJoined;
          }
        }
      }
    } catch (_) {}
  }

  public saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const custom: SovereignCircle[] = [];
      const joined: Record<string, boolean> = {};
      for (const c of this.getAllCircles()) {
        joined[c.id] = c.isJoined;
        if (c.isCustom) custom.push(c);
      }
      localStorage.setItem(this.STORAGE_CUSTOM_KEY, JSON.stringify(custom));
      localStorage.setItem(this.STORAGE_JOINED_KEY, JSON.stringify(joined));
    } catch (_) {}
  }

  public findCircle(channelOrCircleId: string): SovereignCircle | undefined {
    return this.circles.get(channelOrCircleId);
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

  public getJoinedCircles(): SovereignCircle[] {
    return this.getAllCircles().filter(c => c.isJoined);
  }

  public openCreateModal(): void {
    this.isCreateModalOpen = true;
    clientStore.notifySync();
  }

  public closeCreateModal(): void {
    this.isCreateModalOpen = false;
    clientStore.notifySync();
  }

  public toggleJoin(circleId: string): boolean {
    const c = this.getCircle(circleId);
    if (!c) return false;
    c.isJoined = !c.isJoined;
    c.membersCount += c.isJoined ? 1 : -1;
    if (c.membersCount < 0) c.membersCount = 0;
    this.saveToStorage();
    clientStore.showToast(c.isJoined ? `✓ Joined c/${c.name}` : `Left c/${c.name}`, 'info');
    clientStore.notifySync();
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
    communityType?: CommunityType;
    membersCount?: number;
    primaryColor: string;
    rules: { title: string; description: string }[];
  }): SovereignCircle {
    const cleanName = data.name.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'sovereign_circle';
    const channelId = `pulse-${cleanName}`;
    const icon = data.category.includes('Cryptography') ? '⚡' : 
                 data.category.includes('Vault') ? '📦' : 
                 data.category.includes('Defense') ? '🛡️' : 
                 data.category.includes('P2P') ? '🌐' : '🏛️';

    const newCircle: SovereignCircle = {
      id: channelId,
      name: cleanName,
      displayName: data.displayName || `c/${cleanName}`,
      channelId,
      icon,
      banner: `linear-gradient(135deg, ${data.primaryColor}33 0%, #1e1b4b 100%)`,
      description: data.description || 'A newly chartered sovereign decentralized circle.',
      category: data.category || 'General Discussions',
      communityType: data.communityType || 'public',
      membersCount: data.membersCount !== undefined ? data.membersCount : 1,
      onlineCount: 1,
      primaryColor: data.primaryColor || '#6366f1',
      rules: data.rules.map((r, i) => ({ id: i + 1, title: r.title, description: r.description })),
      flairs: ['TECH DISCUSSION', 'VERIFIED RELEASE', 'MICRO-PULSE', 'SECURITY ADVISORY', 'ANNOUNCEMENT'],
      isJoined: true,
      createdAt: 'Just now',
      isCustom: true,
      creatorFingerprint: clientStore.keypair?.fingerprint,
      moderators: [clientStore.keypair?.fingerprint].filter(Boolean) as string[],
      bannedFingerprints: [],
    };

    this.circles.set(newCircle.id, newCircle);
    this.circles.set(newCircle.channelId, newCircle);
    this.circles.set(`c/${newCircle.name}`, newCircle);

    // Register channel in clientStore
    const exists = clientStore.channels.some(c => c.id === channelId);
    if (!exists) {
      clientStore.channels.push({
        id: channelId,
        space: 'pulse',
        name: `c/${cleanName}`,
        description: newCircle.description,
        isEncrypted: false,
      });
    }

    this.saveToStorage();

    // Auto-join newly created channel and notify
    clientStore.activeChannelId = channelId;
    clientStore.showToast(`✨ Sovereign Community c/${cleanName} successfully chartered!`, 'success');
    clientStore.notifySync();

    return newCircle;
  }

  public isUserModerator(circleIdOrChannel: string, fingerprint: string = clientStore.keypair?.fingerprint): boolean {
    const circle = this.findCircle(circleIdOrChannel) || this.getCircle(circleIdOrChannel);
    if (!circle) return false;
    if (circle.creatorFingerprint && circle.creatorFingerprint === fingerprint) return true;
    if (circle.moderators && circle.moderators.includes(fingerprint)) return true;
    if ((clientStore as any).isAdminMode?.() || (clientStore as any).role === 'GUARDIAN' || (clientStore as any).role === 'MODERATOR') return true;
    return false;
  }

  public isUserCreator(circleIdOrChannel: string, fingerprint: string = clientStore.keypair?.fingerprint): boolean {
    const circle = this.findCircle(circleIdOrChannel) || this.getCircle(circleIdOrChannel);
    if (!circle) return false;
    return circle.creatorFingerprint === fingerprint;
  }

  public openModModal(circleId: string): void {
    const circle = this.findCircle(circleId) || this.getCircle(circleId);
    if (!circle) return;
    this.modModalCircleId = circle.id;
    this.isModModalOpen = true;
    this.activeModTab = 'settings';
    clientStore.notifySync();
  }

  public closeModModal(): void {
    this.isModModalOpen = false;
    this.modModalCircleId = null;
    clientStore.notifySync();
  }

  public setModTab(tab: 'settings' | 'rules' | 'flairs' | 'moderation'): void {
    this.activeModTab = tab;
    clientStore.notifySync();
  }

  public updateCircleSettings(circleId: string, updates: Partial<SovereignCircle>): boolean {
    const circle = this.findCircle(circleId) || this.getCircle(circleId);
    if (!circle) return false;
    if (updates.displayName !== undefined) circle.displayName = updates.displayName;
    if (updates.description !== undefined) circle.description = updates.description;
    if (updates.category !== undefined) circle.category = updates.category;
    if (updates.communityType !== undefined) circle.communityType = updates.communityType;
    if (updates.primaryColor !== undefined) {
      circle.primaryColor = updates.primaryColor;
      circle.banner = `linear-gradient(135deg, ${updates.primaryColor}33 0%, #1e1b4b 100%)`;
    }
    this.saveToStorage();
    clientStore.showToast(`✓ Community c/${circle.name} settings updated!`, 'success');
    clientStore.notifySync();
    return true;
  }

  public addRule(circleId: string, title: string, description: string): boolean {
    const circle = this.findCircle(circleId) || this.getCircle(circleId);
    if (!circle || !title.trim()) return false;
    const nextId = (circle.rules.length > 0 ? Math.max(...circle.rules.map(r => r.id)) : 0) + 1;
    circle.rules.push({
      id: nextId,
      title: title.trim(),
      description: description.trim() || 'Community guideline enforced by moderators.',
    });
    this.saveToStorage();
    clientStore.showToast(`✓ Rule #${nextId} added to c/${circle.name}!`, 'success');
    clientStore.notifySync();
    return true;
  }

  public deleteRule(circleId: string, ruleId: number): boolean {
    const circle = this.findCircle(circleId) || this.getCircle(circleId);
    if (!circle) return false;
    circle.rules = circle.rules.filter(r => r.id !== ruleId);
    this.saveToStorage();
    clientStore.showToast(`✓ Rule removed from c/${circle.name}`, 'info');
    clientStore.notifySync();
    return true;
  }

  public addFlair(circleId: string, flair: string): boolean {
    const circle = this.findCircle(circleId) || this.getCircle(circleId);
    const cleanFlair = flair.trim().toUpperCase();
    if (!circle || !cleanFlair) return false;
    if (!circle.flairs.includes(cleanFlair)) {
      circle.flairs.push(cleanFlair);
      this.saveToStorage();
      clientStore.showToast(`✓ Flair "${cleanFlair}" added to c/${circle.name}`, 'success');
      clientStore.notifySync();
    }
    return true;
  }

  public deleteFlair(circleId: string, flair: string): boolean {
    const circle = this.findCircle(circleId) || this.getCircle(circleId);
    if (!circle) return false;
    circle.flairs = circle.flairs.filter(f => f !== flair);
    this.saveToStorage();
    clientStore.showToast(`✓ Flair "${flair}" removed`, 'info');
    clientStore.notifySync();
    return true;
  }

  public banNode(circleId: string, fingerprint: string): boolean {
    const circle = this.findCircle(circleId) || this.getCircle(circleId);
    const cleanFP = fingerprint.trim().toLowerCase();
    if (!circle || !cleanFP) return false;
    if (!circle.bannedFingerprints) circle.bannedFingerprints = [];
    if (!circle.bannedFingerprints.includes(cleanFP)) {
      circle.bannedFingerprints.push(cleanFP);
      this.saveToStorage();
      clientStore.showToast(`⛔ Node ${cleanFP.slice(0, 10)}... banned from c/${circle.name}`, 'warning');
      clientStore.notifySync();
    }
    return true;
  }

  public unbanNode(circleId: string, fingerprint: string): boolean {
    const circle = this.findCircle(circleId) || this.getCircle(circleId);
    if (!circle || !circle.bannedFingerprints) return false;
    circle.bannedFingerprints = circle.bannedFingerprints.filter(fp => fp !== fingerprint);
    this.saveToStorage();
    clientStore.showToast(`✓ Node ${fingerprint.slice(0, 10)}... unbanned`, 'info');
    clientStore.notifySync();
    return true;
  }

  public addModerator(circleId: string, fingerprint: string): boolean {
    const circle = this.findCircle(circleId) || this.getCircle(circleId);
    const cleanFP = fingerprint.trim().toLowerCase();
    if (!circle || !cleanFP) return false;
    if (!circle.moderators) circle.moderators = [];
    if (!circle.moderators.includes(cleanFP)) {
      circle.moderators.push(cleanFP);
      this.saveToStorage();
      clientStore.showToast(`🛡️ Added moderator ${cleanFP.slice(0, 10)}... to c/${circle.name}`, 'success');
      clientStore.notifySync();
    }
    return true;
  }

  public togglePinPost(circleId: string, postId: string): boolean {
    const circle = this.findCircle(circleId) || this.getCircle(circleId);
    if (!circle) return false;
    if (circle.pinnedPostId === postId) {
      circle.pinnedPostId = undefined;
      clientStore.showToast('Unpinned announcement', 'info');
    } else {
      circle.pinnedPostId = postId;
      clientStore.showToast('📌 Announcement pinned to community top!', 'success');
    }
    this.saveToStorage();
    clientStore.notifySync();
    return true;
  }

  public modRemovePost(circleId: string, postId: string): boolean {
    const circle = this.findCircle(circleId) || this.getCircle(circleId);
    if (!circle) return false;
    clientStore.posts = clientStore.posts.filter(p => p.id !== postId);
    clientStore.showToast(`🗑️ Post removed by Community Moderator`, 'warning');
    clientStore.notifySync();
    return true;
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

          <div class="text-xs text-slate-400 font-mono">${clientStore.posts.filter(post => post.channelId === circle.channelId).length} loaded posts</div>

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
              <span>✍️ ${t('pulse.publishPost', undefined, 'Broadcast')}</span>
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
   * Renders the Community Moderation & Governance Modal.
   */
  public renderCircleModModal(): string {
    if (!this.isModModalOpen || !this.modModalCircleId) return '';
    const circle = this.findCircle(this.modModalCircleId) || this.getCircle(this.modModalCircleId);
    if (!circle) return '';

    const isCreator = this.isUserCreator(circle.id);
    const colorPresets = ['#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

    return `
      <div id="circle-mod-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/85 backdrop-blur-md animate-in fade-in duration-150" data-action="close-circle-mod-tools">
        <div class="relative w-full max-w-2xl bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" data-action="stop-propagation">
          
          <!-- MODAL HEADER -->
          <div class="px-6 py-4 border-b border-white/10 bg-surface-raised flex items-center justify-between shrink-0">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl border border-amber-500/30">
                ⚙️
              </div>
              <div>
                <div class="flex items-center space-x-2">
                  <h2 class="text-sm sm:text-base font-bold text-white font-mono">Mod Tools: c/${escapeHtml(circle.name)}</h2>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${isCreator ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                    ${isCreator ? '👑 Creator' : '🛡️ Moderator'}
                  </span>
                </div>
                <p class="text-[11px] text-slate-400 font-mono">Decentralized governance, rules engine, and member access controls</p>
              </div>
            </div>
            <button 
              type="button" 
              data-action="close-circle-mod-tools"
              class="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-surface-overlay transition-colors font-mono text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- TAB NAVIGATION -->
          <div class="flex items-center space-x-1 px-6 border-b border-white/10 bg-surface-raised/50 text-xs font-semibold shrink-0 overflow-x-auto no-scrollbar">
            <button
              type="button"
              data-action="set-circle-mod-tab"
              data-tab="settings"
              class="px-3.5 py-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${this.activeModTab === 'settings' ? 'border-cyan-400 text-cyan-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}"
            >
              <span>⚙️</span>
              <span>General Settings</span>
            </button>
            <button
              type="button"
              data-action="set-circle-mod-tab"
              data-tab="rules"
              class="px-3.5 py-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${this.activeModTab === 'rules' ? 'border-cyan-400 text-cyan-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}"
            >
              <span>📜</span>
              <span>Rules Engine (${circle.rules.length})</span>
            </button>
            <button
              type="button"
              data-action="set-circle-mod-tab"
              data-tab="flairs"
              class="px-3.5 py-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${this.activeModTab === 'flairs' ? 'border-cyan-400 text-cyan-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}"
            >
              <span>🏷️</span>
              <span>Post Flairs (${circle.flairs.length})</span>
            </button>
            <button
              type="button"
              data-action="set-circle-mod-tab"
              data-tab="moderation"
              class="px-3.5 py-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${this.activeModTab === 'moderation' ? 'border-cyan-400 text-cyan-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}"
            >
              <span>🛡️</span>
              <span>Safety & Nodes (${circle.bannedFingerprints?.length || 0})</span>
            </button>
          </div>

          <!-- TAB CONTENT BODY -->
          <div class="p-6 overflow-y-auto flex-1 space-y-5 text-xs text-slate-200">
            
            ${this.activeModTab === 'settings' ? `
              <!-- GENERAL SETTINGS TAB -->
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Display Title
                  </label>
                  <input
                    type="text"
                    id="input-mod-display-title"
                    value="${escapeHtml(circle.displayName)}"
                    class="w-full bg-surface-raised border border-white/10 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label class="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Community Description
                  </label>
                  <textarea
                    id="input-mod-description"
                    rows="3"
                    class="w-full bg-surface-raised border border-white/10 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none resize-none leading-relaxed"
                  >${escapeHtml(circle.description)}</textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      id="input-mod-category"
                      class="w-full bg-surface-raised border border-white/10 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="Cryptography & Security" ${circle.category === 'Cryptography & Security' ? 'selected' : ''}>Cryptography & Security</option>
                      <option value="Software & Vault" ${circle.category === 'Software & Vault' ? 'selected' : ''}>Software & Vault</option>
                      <option value="P2P Networking" ${circle.category === 'P2P Networking' ? 'selected' : ''}>P2P Networking & Swarms</option>
                      <option value="Cyber Defense" ${circle.category === 'Cyber Defense' ? 'selected' : ''}>Cyber Defense</option>
                      <option value="Governance & DAO" ${circle.category === 'Governance & DAO' ? 'selected' : ''}>Governance & DAO</option>
                      <option value="General Sovereign" ${circle.category === 'General Sovereign' ? 'selected' : ''}>General Sovereign Discussions</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Access Policy
                    </label>
                    <select
                      id="input-mod-access-type"
                      class="w-full bg-surface-raised border border-white/10 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="public" ${circle.communityType === 'public' ? 'selected' : ''}>🌐 Public (Anyone can view & post)</option>
                      <option value="restricted" ${circle.communityType === 'restricted' ? 'selected' : ''}>👁️ Restricted (View open, posting curated)</option>
                      <option value="private" ${circle.communityType === 'private' ? 'selected' : ''}>🔒 Private (Encrypted Sovereign Circle)</option>
                    </select>
                  </div>
                </div>

                <!-- ACCENT COLOR THEME -->
                <div>
                  <label class="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Primary Accent Theme
                  </label>
                  <div class="flex items-center space-x-3">
                    <div class="flex items-center space-x-2">
                      ${colorPresets.map(col => `
                        <button
                          type="button"
                          data-action="select-mod-color"
                          data-color="${col}"
                          class="w-7 h-7 rounded-xl border border-white/20 transition-transform hover:scale-110 cursor-pointer ${circle.primaryColor === col ? 'ring-2 ring-white scale-105' : ''}"
                          style="background-color: ${col};"
                        ></button>
                      `).join('')}
                    </div>
                    <input
                      type="text"
                      id="input-mod-color"
                      value="${circle.primaryColor}"
                      class="w-24 bg-surface-raised border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div class="pt-3 border-t border-white/10 flex justify-end">
                  <button
                    type="button"
                    data-action="save-circle-settings"
                    data-circle-id="${circle.id}"
                    class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>💾</span>
                    <span>Save Community Settings</span>
                  </button>
                </div>
              </div>
            ` : ''}

            ${this.activeModTab === 'rules' ? `
              <!-- RULES ENGINE TAB -->
              <div class="space-y-4">
                <div class="flex items-center justify-between pb-1 border-b border-white/5">
                  <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    Community Rules (${circle.rules.length})
                  </h3>
                  <span class="text-[10px] text-slate-500 font-mono">Enforced across c/${escapeHtml(circle.name)}</span>
                </div>

                <!-- RULES LIST -->
                <div class="space-y-2 max-h-60 overflow-y-auto">
                  ${circle.rules.map((r, i) => `
                    <div class="p-3 rounded-xl bg-surface-raised border border-white/5 flex items-start justify-between gap-3 group">
                      <div class="space-y-0.5 flex-1 min-w-0">
                        <div class="font-bold text-white text-xs flex items-center space-x-1.5">
                          <span class="text-indigo-400 font-mono">${i + 1}.</span>
                          <span class="truncate">${escapeHtml(r.title)}</span>
                        </div>
                        <p class="text-[11px] text-slate-400 leading-relaxed">${escapeHtml(r.description)}</p>
                      </div>
                      <button
                        type="button"
                        data-action="delete-circle-rule"
                        data-circle-id="${circle.id}"
                        data-rule-id="${r.id}"
                        class="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                        title="Delete Rule"
                      >
                        🗑️
                      </button>
                    </div>
                  `).join('')}
                </div>

                <!-- ADD NEW RULE FORM -->
                <div class="p-4 rounded-xl bg-surface-raised/70 border border-white/10 space-y-3 mt-4">
                  <div class="text-xs font-bold text-indigo-300 font-mono flex items-center space-x-1.5">
                    <span>➕</span>
                    <span>Charter New Rule</span>
                  </div>
                  <div>
                    <input
                      type="text"
                      id="input-new-rule-title"
                      placeholder="Rule Title (e.g. Verifiable Proofs Mandatory)"
                      class="w-full bg-surface-base border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <textarea
                      id="input-new-rule-desc"
                      rows="2"
                      placeholder="Detailed rule rationale and compliance expectations..."
                      class="w-full bg-surface-base border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                    ></textarea>
                  </div>
                  <div class="flex justify-end">
                    <button
                      type="button"
                      data-action="add-circle-rule"
                      data-circle-id="${circle.id}"
                      class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      <span>+</span>
                      <span>Add Rule</span>
                    </button>
                  </div>
                </div>
              </div>
            ` : ''}

            ${this.activeModTab === 'flairs' ? `
              <!-- POST FLAIRS TAB -->
              <div class="space-y-4">
                <div class="flex items-center justify-between pb-1 border-b border-white/5">
                  <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    Community Post Flairs (${circle.flairs.length})
                  </h3>
                  <span class="text-[10px] text-slate-500 font-mono">Available tags for posts in this circle</span>
                </div>

                <!-- FLAIR BADGES -->
                <div class="flex flex-wrap gap-2 p-3 rounded-xl bg-surface-raised border border-white/5">
                  ${circle.flairs.map(f => `
                    <div class="px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold flex items-center space-x-2 group">
                      <span>${escapeHtml(f)}</span>
                      <button
                        type="button"
                        data-action="delete-circle-flair"
                        data-circle-id="${circle.id}"
                        data-flair="${escapeHtml(f)}"
                        class="text-indigo-400/60 hover:text-red-400 cursor-pointer text-xs"
                        title="Delete Flair"
                      >
                        ✕
                      </button>
                    </div>
                  `).join('')}
                </div>

                <!-- ADD NEW FLAIR -->
                <div class="p-4 rounded-xl bg-surface-raised/70 border border-white/10 space-y-3 mt-4">
                  <div class="text-xs font-bold text-indigo-300 font-mono flex items-center space-x-1.5">
                    <span>🏷️</span>
                    <span>Add Custom Post Flair</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <input
                      type="text"
                      id="input-new-flair"
                      placeholder="e.g. RESEARCH BENCHMARK"
                      class="flex-1 bg-surface-base border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono uppercase focus:outline-none font-semibold"
                    />
                    <button
                      type="button"
                      data-action="add-circle-flair"
                      data-circle-id="${circle.id}"
                      class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
                    >
                      <span>+</span>
                      <span>Add Flair</span>
                    </button>
                  </div>
                </div>
              </div>
            ` : ''}

            ${this.activeModTab === 'moderation' ? `
              <!-- SAFETY & ACCESS CONTROL TAB -->
              <div class="space-y-5">
                
                <!-- BANNED NODES SECTION -->
                <div class="space-y-3">
                  <div class="flex items-center justify-between pb-1 border-b border-white/5">
                    <div class="flex items-center space-x-1.5">
                      <span class="text-red-400">⛔</span>
                      <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                        Banned / Restricted Peer Nodes (${circle.bannedFingerprints?.length || 0})
                      </h3>
                    </div>
                    <span class="text-[10px] text-slate-500 font-mono">Cannot post in c/${escapeHtml(circle.name)}</span>
                  </div>

                  <div class="space-y-1.5">
                    ${(!circle.bannedFingerprints || circle.bannedFingerprints.length === 0) ? `
                      <div class="p-3 rounded-xl bg-surface-raised/50 border border-white/5 text-center text-slate-500 font-mono text-xs">
                        ✓ No nodes currently banned. All network peers in good standing.
                      </div>
                    ` : circle.bannedFingerprints.map(fp => `
                      <div class="p-2.5 rounded-xl bg-red-950/20 border border-red-500/20 flex items-center justify-between">
                        <div class="flex items-center space-x-2 font-mono text-xs text-red-300">
                          <span class="w-2 h-2 rounded-full bg-red-500"></span>
                          <span class="font-bold">&lt;${escapeHtml(fp)}&gt;</span>
                        </div>
                        <button
                          type="button"
                          data-action="unban-circle-node"
                          data-circle-id="${circle.id}"
                          data-fp="${escapeHtml(fp)}"
                          class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          Lift Ban
                        </button>
                      </div>
                    `).join('')}
                  </div>

                  <!-- BAN NODE INPUT -->
                  <div class="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      id="input-mod-ban-fp"
                      placeholder="Enter node fingerprint to restrict (e.g. e098fa87b120)..."
                      class="flex-1 bg-surface-raised border border-white/10 focus:border-red-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      data-action="ban-circle-node"
                      data-circle-id="${circle.id}"
                      class="px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      <span>⛔ Ban Node</span>
                    </button>
                  </div>
                </div>

                <!-- MODERATORS ROSTER SECTION -->
                <div class="space-y-3 pt-3 border-t border-white/10">
                  <div class="flex items-center justify-between pb-1 border-b border-white/5">
                    <div class="flex items-center space-x-1.5">
                      <span class="text-amber-400">🛡️</span>
                      <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                        Community Moderators Roster (${(circle.moderators?.length || 1)})
                      </h3>
                    </div>
                  </div>

                  <div class="space-y-1.5 font-mono text-xs">
                    <!-- CREATOR NODE -->
                    <div class="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
                      <div class="flex items-center space-x-2 text-indigo-300 font-bold">
                        <span>👑</span>
                        <span>&lt;${circle.creatorFingerprint || clientStore.keypair?.fingerprint || 'genesis-core'}&gt;</span>
                      </div>
                      <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">CREATOR</span>
                    </div>

                    <!-- OTHER MODS -->
                    ${(circle.moderators || []).filter(m => m !== circle.creatorFingerprint).map(mFp => `
                      <div class="p-2.5 rounded-xl bg-surface-raised border border-white/5 flex items-center justify-between">
                        <div class="flex items-center space-x-2 text-slate-300">
                          <span>🛡️</span>
                          <span>&lt;${escapeHtml(mFp)}&gt;</span>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">MODERATOR</span>
                      </div>
                    `).join('')}
                  </div>

                  <!-- ASSIGN MODERATOR INPUT -->
                  <div class="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      id="input-mod-add-fp"
                      placeholder="Assign new moderator by fingerprint..."
                      class="flex-1 bg-surface-raised border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      data-action="add-circle-mod"
                      data-circle-id="${circle.id}"
                      class="px-4 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      <span>🛡️ Assign Mod</span>
                    </button>
                  </div>
                </div>

              </div>
            ` : ''}

          </div>
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
      <div id="create-circle-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-md animate-in fade-in duration-150" data-action="call-global" data-raw-click="if(event.target.id==='create-circle-modal-backdrop'){if(window.sovereignCircleEngine){window.sovereignCircleEngine.isCreateModalOpen=false;window.clientStore&&window.clientStore.notifySync();}}">
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
              id="btn-close-create-circle-modal" data-action="call-global" data-raw-click="if(window.sovereignCircleEngine){window.sovereignCircleEngine.isCreateModalOpen=false;window.clientStore&&window.clientStore.notifySync();}"
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

            <!-- REDDIT-STYLE COMMUNITY PRIVACY TYPE -->
            <div>
              <label class="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
                Community Type
              </label>
              <div class="space-y-2">
                <label class="flex items-start gap-3 p-3 rounded-xl border border-white/10 hover:border-indigo-500/50 hover:bg-surface-raised cursor-pointer transition-all ${this.formCommunityType === 'public' ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/40' : 'bg-surface-base'}">
                  <input type="radio" name="input-circle-type" value="public" ${this.formCommunityType === 'public' ? 'checked' : ''} class="mt-0.5 text-indigo-500 focus:ring-0 cursor-pointer">
                  <div>
                    <div class="flex items-center gap-2 font-bold text-xs text-white">
                      <span>🌐 Public</span>
                      <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded">Recommended</span>
                    </div>
                    <div class="text-[11px] text-slate-400 leading-snug mt-0.5">Anyone can view, post, and comment to this community.</div>
                  </div>
                </label>

                <label class="flex items-start gap-3 p-3 rounded-xl border border-white/10 hover:border-indigo-500/50 hover:bg-surface-raised cursor-pointer transition-all ${this.formCommunityType === 'restricted' ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/40' : 'bg-surface-base'}">
                  <input type="radio" name="input-circle-type" value="restricted" ${this.formCommunityType === 'restricted' ? 'checked' : ''} class="mt-0.5 text-indigo-500 focus:ring-0 cursor-pointer">
                  <div>
                    <div class="flex items-center gap-2 font-bold text-xs text-white">
                      <span>👁️ Restricted</span>
                    </div>
                    <div class="text-[11px] text-slate-400 leading-snug mt-0.5">Anyone can view this community, but only approved users can post.</div>
                  </div>
                </label>

                <label class="flex items-start gap-3 p-3 rounded-xl border border-white/10 hover:border-indigo-500/50 hover:bg-surface-raised cursor-pointer transition-all ${this.formCommunityType === 'private' ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/40' : 'bg-surface-base'}">
                  <input type="radio" name="input-circle-type" value="private" ${this.formCommunityType === 'private' ? 'checked' : ''} class="mt-0.5 text-indigo-500 focus:ring-0 cursor-pointer">
                  <div>
                    <div class="flex items-center gap-2 font-bold text-xs text-white">
                      <span>🔒 Private</span>
                      <span class="text-[10px] font-mono text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded">ZK-Gate</span>
                    </div>
                    <div class="text-[11px] text-slate-400 leading-snug mt-0.5">Only approved users can view and submit to this community.</div>
                  </div>
                </label>
              </div>
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
                id="btn-cancel-create-circle" data-action="call-global" data-raw-click="if(window.sovereignCircleEngine){window.sovereignCircleEngine.isCreateModalOpen=false;window.clientStore&&window.clientStore.notifySync();}"
                class="px-4 py-2 text-xs font-mono font-semibold text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                ${t('common.cancel', undefined, 'Cancel')}
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
      const typeRadio = document.querySelector('input[name="input-circle-type"]:checked') as HTMLInputElement | null;
      const descInput = document.getElementById('input-circle-description') as HTMLTextAreaElement | null;

      const rawName = nameInput ? nameInput.value.trim() : '';
      if (!rawName) return;

      const communityType = (typeRadio?.value as CommunityType) || 'public';

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
        communityType,
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
