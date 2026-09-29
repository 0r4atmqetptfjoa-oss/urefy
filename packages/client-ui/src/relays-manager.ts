// ===========================================================================
// UREfy — SOVEREIGN RELAYS & GUILDS MANAGER
// Enables user-created decentralized real-time chat spaces, guilds,
// sub-channels, and 1-click shareable invite codes / links.
// Zero external trademarks (Sovereign Relays / Guild Hubs).
// ===========================================================================

import { serviceRegistry, SERVICES } from './service-registry.js';
import { zkDeliveryManager, renderZKDeliveryBadge } from './delivery-proof.js';
import { t } from './i18n.js';
import './window-augmentation.js';

export interface RelayChannel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  isEncrypted: boolean;
}

export interface SovereignRelay {
  id: string;
  name: string;
  icon: string;
  description: string;
  ownerFingerprint: string;
  inviteCode: string;
  channels: RelayChannel[];
  members: string[];
  createdAt: number;
}

const RELAYS_STORAGE_KEY = 'aetheris_sovereign_relays';

export class RelaysManager {
  private relays: SovereignRelay[] = [];
  public activeRelayId: string = 'relay-global-nexus';
  public isCreateModalOpen: boolean = false;
  public isInviteModalOpen: boolean = false;
  public isJoinModalOpen: boolean = false;
  public targetInviteRelayId: string | null = null;

  constructor() {
    this._loadRelays();
  }

  private _loadRelays(): void {
    const defaultRelay: SovereignRelay = {
      id: 'relay-global-nexus',
      name: 'Global Sovereign Nexus',
      icon: '⚡',
      description: 'A welcoming place for everyone on UREfy.',
      ownerFingerprint: 'genesis-core',
      inviteCode: 'NEXUS-01',
      channels: [
        { id: 'relays-general', name: 'general', type: 'text', isEncrypted: true },
        { id: 'relays-announcements', name: 'announcements', type: 'text', isEncrypted: true },
        { id: 'relays-dev', name: 'dev', type: 'text', isEncrypted: true },
        { id: 'relays-random', name: 'random', type: 'text', isEncrypted: true },
        { id: 'relays-questions', name: 'questions', type: 'text', isEncrypted: true },
        { id: 'relays-off-topic', name: 'off-topic', type: 'text', isEncrypted: true },
        { id: 'relays-community', name: 'community', type: 'text', isEncrypted: true },
      ],
      members: ['genesis-core', 'c3dc28cb705e', 'a89104fa2211'],
      createdAt: 1700000000000,
    };

    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(RELAYS_STORAGE_KEY);
        if (saved) {
          this.relays = JSON.parse(saved);
        }
      } catch (_) {}
    }

    if (this.relays.length === 0) {
      this.relays = [defaultRelay];
      this._saveRelays();
    } else {
      if (!this.relays.some(r => r.id === 'relay-global-nexus')) {
        this.relays.unshift(defaultRelay);
      }
    }

    // Ensure persistent community topics exist on global nexus
    let didMigrate = false;
    const nexus = this.relays.find(r => r.id === 'relay-global-nexus');
    if (nexus) {
      const requiredChannels: RelayChannel[] = [
        { id: 'relays-general', name: 'general', type: 'text', isEncrypted: true },
        { id: 'relays-announcements', name: 'announcements', type: 'text', isEncrypted: true },
        { id: 'relays-dev', name: 'dev', type: 'text', isEncrypted: true },
        { id: 'relays-random', name: 'random', type: 'text', isEncrypted: true },
        { id: 'relays-questions', name: 'questions', type: 'text', isEncrypted: true },
        { id: 'relays-off-topic', name: 'off-topic', type: 'text', isEncrypted: true },
      ];
      for (const req of requiredChannels) {
        if (!nexus.channels.some(ch => ch.id === req.id || ch.name === req.name)) {
          nexus.channels.push(req);
          didMigrate = true;
        }
      }
    }

    // Migrate any legacy voice-radar channels in local storage to standard text community channel
    for (const relay of this.relays) {
      for (const ch of relay.channels) {
        if (ch.id === 'voice-radar' || ch.name === 'voice-radar') {
          ch.id = 'relays-community';
          ch.name = 'community';
          ch.type = 'text';
          didMigrate = true;
        }
      }
    }
    if (didMigrate) {
      this._saveRelays();
    }
  }

  private _saveRelays(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(RELAYS_STORAGE_KEY, JSON.stringify(this.relays));
      } catch (_) {}
    }
  }

  public getRelays(): SovereignRelay[] {
    return [...this.relays];
  }

  public getActiveRelay(): SovereignRelay {
    return this.relays.find(r => r.id === this.activeRelayId) || this.relays[0];
  }

  public getRelayById(id: string): SovereignRelay | undefined {
    return this.relays.find(r => r.id === id);
  }

  public getRelayByInviteCode(code: string): SovereignRelay | undefined {
    const clean = code.trim().toUpperCase().replace(/^(HTTPS?:\/\/.*?(\?INVITE=|\?RELAY=))/, '');
    return this.relays.find(r => r.inviteCode.toUpperCase() === clean || r.id.toLowerCase() === clean.toLowerCase());
  }

  public createRelay(
    name: string,
    icon: string,
    description: string,
    ownerFingerprint: string,
    customChannels?: string[]
  ): SovereignRelay {
    const id = `relay-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const randomCode = `RELAY-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const defaultChannels: RelayChannel[] = customChannels && customChannels.length > 0
      ? customChannels.map(ch => ({
          id: `${id}-${ch.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
          name: ch.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
          type: 'text',
          isEncrypted: true,
        }))
      : [
          { id: `${id}-general`, name: 'general', type: 'text', isEncrypted: true },
          { id: `${id}-announcements`, name: 'announcements', type: 'text', isEncrypted: true },
          { id: `${id}-voice-room`, name: 'voice-room', type: 'voice', isEncrypted: true },
        ];

    const newRelay: SovereignRelay = {
      id,
      name: name.trim() || 'New community',
      icon: icon.trim() || '🔮',
      description: description.trim() || 'A private sovereign communication enclave.',
      ownerFingerprint,
      inviteCode: randomCode,
      channels: defaultChannels,
      members: [ownerFingerprint],
      createdAt: Date.now(),
    };

    this.relays.push(newRelay);
    this.activeRelayId = id;
    this._saveRelays();

    if (typeof window !== 'undefined' && window.clientStore) {
      newRelay.channels.forEach(ch => {
        const exists = window.clientStore.channels.some((c: any) => c.id === ch.id);
        if (!exists) {
          window.clientStore.channels.push({
            id: ch.id,
            name: ch.name,
            space: 'relays',
            unreadCount: 0,
            isEncrypted: ch.isEncrypted,
          });
        }
      });
      window.clientStore.activeChannelId = newRelay.channels[0].id;
      window.clientStore.notify();
    }

    return newRelay;
  }

  public joinRelay(codeOrUrl: string, userFingerprint: string): SovereignRelay | null {
    const relay = this.getRelayByInviteCode(codeOrUrl);
    if (!relay) {
      const cleanCode = codeOrUrl.trim().toUpperCase().replace(/^.*[?&](invite|relay)=/, '');
      if (cleanCode) {
        const synthesizedRelay: SovereignRelay = {
          id: `relay-invite-${cleanCode.toLowerCase()}`,
          name: `Enclave [${cleanCode}]`,
          icon: '🛡️',
          description: 'Joined via cryptographic invitation.',
          ownerFingerprint: 'remote-peer',
          inviteCode: cleanCode,
          channels: [
            { id: `relay-invite-${cleanCode.toLowerCase()}-general`, name: 'general', type: 'text', isEncrypted: true },
            { id: `relay-invite-${cleanCode.toLowerCase()}-lounge`, name: 'lounge', type: 'text', isEncrypted: true },
          ],
          members: [userFingerprint],
          createdAt: Date.now(),
        };
        this.relays.push(synthesizedRelay);
        this.activeRelayId = synthesizedRelay.id;
        this._saveRelays();

        if (typeof window !== 'undefined' && window.clientStore) {
          synthesizedRelay.channels.forEach(ch => {
            window.clientStore.channels.push({
              id: ch.id,
              name: ch.name,
              space: 'relays',
              unreadCount: 0,
              isEncrypted: ch.isEncrypted,
            });
          });
          window.clientStore.activeChannelId = synthesizedRelay.channels[0].id;
          window.clientStore.notify();
        }
        return synthesizedRelay;
      }
      return null;
    }

    if (!relay.members.includes(userFingerprint)) {
      relay.members.push(userFingerprint);
      this._saveRelays();
    }

    this.activeRelayId = relay.id;

    if (typeof window !== 'undefined' && window.clientStore) {
      relay.channels.forEach(ch => {
        const exists = window.clientStore.channels.some((c: any) => c.id === ch.id);
        if (!exists) {
          window.clientStore.channels.push({
            id: ch.id,
            name: ch.name,
            space: 'relays',
            unreadCount: 0,
            isEncrypted: ch.isEncrypted,
          });
        }
      });
      window.clientStore.activeChannelId = relay.channels[0].id;
      window.clientStore.notify();
    }

    return relay;
  }

  public addChannel(relayId: string, channelName: string, type: 'text' | 'voice' = 'text'): boolean {
    const relay = this.getRelayById(relayId);
    if (!relay) return false;

    const clean = channelName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!clean) return false;

    const channelId = `${relayId}-${clean}`;
    if (relay.channels.some(c => c.id === channelId)) return false;

    const newChan: RelayChannel = {
      id: channelId,
      name: clean,
      type,
      isEncrypted: true,
    };

    relay.channels.push(newChan);
    this._saveRelays();

    if (typeof window !== 'undefined' && window.clientStore) {
      window.clientStore.channels.push({
        id: newChan.id,
        name: newChan.name,
        space: 'relays',
        unreadCount: 0,
        isEncrypted: newChan.isEncrypted,
      });
      window.clientStore.activeChannelId = newChan.id;
      window.clientStore.notify();
    }

    return true;
  }

  public deleteChannel(relayId: string, channelId: string): boolean {
    const relay = this.getRelayById(relayId);
    if (!relay || relay.channels.length <= 1) return false;

    relay.channels = relay.channels.filter(c => c.id !== channelId);
    this._saveRelays();

    if (typeof window !== 'undefined' && window.clientStore) {
      window.clientStore.channels = window.clientStore.channels.filter((c: any) => c.id !== channelId);
      if (window.clientStore.activeChannelId === channelId) {
        window.clientStore.activeChannelId = relay.channels[0].id;
      }
      window.clientStore.notify();
    }

    return true;
  }

  public deleteRelay(relayId: string, userFingerprint?: string): boolean {
    if (relayId === 'relay-global-nexus') return false; // Protected root nexus enclave

    const relayIndex = this.relays.findIndex(r => r.id === relayId);
    if (relayIndex === -1) return false;

    const relay = this.relays[relayIndex];
    // If userFingerprint provided, verify ownership or permit if creator/standalone
    if (userFingerprint && relay.ownerFingerprint && relay.ownerFingerprint !== 'remote-peer' && relay.ownerFingerprint !== userFingerprint) {
      return false;
    }

    // Remove relay channels from clientStore
    if (typeof window !== 'undefined' && window.clientStore) {
      const channelIds = new Set(relay.channels.map(c => c.id));
      window.clientStore.channels = window.clientStore.channels.filter((c: any) => !channelIds.has(c.id));

      if (channelIds.has(window.clientStore.activeChannelId)) {
        window.clientStore.activeChannelId = 'relays-general';
      }
    }

    this.relays.splice(relayIndex, 1);

    if (this.activeRelayId === relayId) {
      this.activeRelayId = this.relays[0]?.id || 'relay-global-nexus';
    }

    this._saveRelays();

    if (typeof window !== 'undefined' && window.clientStore) {
      window.clientStore.notify();
    }

    return true;
  }

  public leaveRelay(relayId: string, userFingerprint: string): boolean {
    if (relayId === 'relay-global-nexus') return false; // Protected root nexus enclave

    const relayIndex = this.relays.findIndex(r => r.id === relayId);
    if (relayIndex === -1) return false;

    const relay = this.relays[relayIndex];

    // Remove user fingerprint from members
    relay.members = relay.members.filter(m => m !== userFingerprint);

    // Remove channels from clientStore
    if (typeof window !== 'undefined' && window.clientStore) {
      const channelIds = new Set(relay.channels.map(c => c.id));
      window.clientStore.channels = window.clientStore.channels.filter((c: any) => !channelIds.has(c.id));

      if (channelIds.has(window.clientStore.activeChannelId)) {
        window.clientStore.activeChannelId = 'relays-general';
      }
    }

    // Remove from local relays list so it no longer appears in the rail
    this.relays.splice(relayIndex, 1);

    if (this.activeRelayId === relayId) {
      this.activeRelayId = this.relays[0]?.id || 'relay-global-nexus';
    }

    this._saveRelays();

    if (typeof window !== 'undefined' && window.clientStore) {
      window.clientStore.notify();
    }

    return true;
  }

  public generateInviteLink(relayId: string): string {
    const relay = this.getRelayById(relayId);
    const code = relay?.inviteCode || 'NEXUS-01';
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://aetheris-omni-sphere.pages.dev';
    return `${base}/?invite=${code}`;
  }

  // ─────────────────────────────────────────────────────────
  // UI RENDERERS
  // ─────────────────────────────────────────────────────────

  public resolveTopicName(rawName: string): string {
    const clean = (rawName || '').replace(/^relays-/, '').toLowerCase();
    switch (clean) {
      case 'general': return 'General Discussion';
      case 'announcements': return 'Dispatches & Updates';
      case 'dev':
      case 'dev-core': return 'Builds & Engineering';
      case 'random':
      case 'lounge': return 'Ideas & Casual';
      case 'questions':
      case 'help': return 'Questions & Support';
      case 'off-topic': return 'Off-topic';
      case 'community': return 'Community Pulse';
      default: return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Discussion';
    }
  }

  public resolveTopicIcon(rawName: string): string {
    const clean = (rawName || '').replace(/^relays-/, '').toLowerCase();
    switch (clean) {
      case 'general': return '💬';
      case 'announcements': return '📢';
      case 'dev':
      case 'dev-core': return '🛠️';
      case 'random':
      case 'lounge': return '💡';
      case 'questions':
      case 'help': return '❓';
      case 'off-topic': return '☕';
      case 'community': return '🌐';
      default: return '💬';
    }
  }

  /** Unified Navigation Pane on the Left Side of Relays Chat */
  public renderRelayServerRail(): string {
    const activeRelay = this.getActiveRelay();
    const windowClientStore = typeof window !== 'undefined' ? (window as any).clientStore : null;
    const activeChId = windowClientStore?.activeChannelId || activeRelay.channels[0]?.id || 'relays-general';

    return `
      <aside class="hidden md:flex w-72 border-subtle-r bg-surface-base/80 flex-col shrink-0 overflow-hidden select-none">
        <!-- Top header: Conversations in this space -->
        <div class="p-3.5 border-b border-white/5 flex items-center justify-between" data-select-relay="${activeRelay.id}">
          <div class="flex items-center space-x-2">
            <span class="text-base text-[var(--color-accent,#e89e38)]">◈</span>
            <h2 class="text-xs font-bold text-slate-200 tracking-tight">Conversations in this space</h2>
          </div>
          <div class="flex items-center space-x-1">
            <button
              type="button"
              id="btn-open-join-relay"
              class="px-2 py-1 bg-surface-raised hover:bg-surface-elevated text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-white/10 transition-all cursor-pointer"
              title="Join space"
            >
              <span>Join</span>
            </button>
            <button
              type="button"
              id="btn-open-create-relay"
              class="px-2 py-1 bg-surface-raised hover:bg-surface-elevated text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-white/10 transition-all cursor-pointer"
              title="Start conversation topic"
            >
              <span>+ New</span>
            </button>
          </div>
        </div>

        <!-- Conversations in this space: List of conversation topics -->
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          ${activeRelay.channels.map(ch => {
            const isChActive = activeChId === ch.id;
            const topicTitle = this.resolveTopicName(ch.name);
            return `
              <button
                type="button"
                  data-channel-id="${ch.id}"
                  aria-current="${isChActive ? 'true' : 'false'}"
                class="btn-channel w-full text-left px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-between border ${
                  isChActive
                    ? 'bg-white/[0.04] text-white border-white/10 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-transparent'
                }"
              >
                <div class="flex-1 min-w-0 pr-2 flex items-center">
                  <span class="text-slate-500 font-bold mr-1.5 text-xs select-none ${isChActive ? 'text-[var(--color-accent,#e89e38)]' : ''}">#</span>
                  <div class="text-xs font-semibold truncate ${isChActive ? 'text-[var(--color-accent,#e89e38)] font-bold' : 'text-slate-200'}">
                    ${this._escapeHtml(topicTitle)}
                  </div>
                </div>
                ${isChActive ? `
                  <span class="w-1.5 h-1.5 rotate-45 bg-[var(--color-accent,#e89e38)] shrink-0" title="Current conversation"></span>
                ` : ''}
              </button>
            `;
          }).join('')}
        </div>
      </aside>
    `;
  }

  /** Relay Header Bar with Invite Friends, Leave & Delete Buttons */
  public renderRelayHeader(relay: SovereignRelay, activeChannelName: string, userFingerprint?: string): string {
    const isGlobal = relay.id === 'relay-global-nexus';
    const displayName = isGlobal ? 'UREfy Community' : relay.name;
    const currentFp = userFingerprint || (typeof window !== 'undefined' && (window as any).clientStore?.keypair?.fingerprint) || '';
    const isOwner = !isGlobal && (
      !relay.ownerFingerprint ||
      relay.ownerFingerprint === 'remote-peer' ||
      (Boolean(currentFp) && relay.ownerFingerprint === currentFp) ||
      (!currentFp)
    );

    const topicTitle = this.resolveTopicName(activeChannelName);

    return `
      <div class="relay-conversation-header h-16 border-b border-white/5 bg-surface-base/70 backdrop-blur-sm px-4 md:px-6 flex items-center justify-between shrink-0 select-none">
        <div class="relay-header-identity flex items-center space-x-3.5 min-w-0">
          <div class="w-9 h-9 flex items-center justify-center text-lg text-[var(--color-accent,#e89e38)] shrink-0" aria-hidden="true">
            ◈
          </div>
          <div class="min-w-0">
            <div class="relay-header-title flex items-center space-x-2">
              <h2 class="text-sm font-bold text-white tracking-tight">${this._escapeHtml(displayName)}</h2>
              <span class="text-xs text-slate-400 font-normal">· ${this._escapeHtml(topicTitle)}</span>
            </div>
            <div class="text-[11px] text-slate-400 font-sans flex items-center space-x-2 mt-0.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>${isGlobal ? 'Visible to community members' : `${relay.members.length} members · Visible to members`}</span>
            </div>
          </div>
        </div>

        <div class="relay-header-actions flex items-center space-x-2 shrink-0">
          <!-- Local Search Button -->
          <button
            type="button"
            data-action="open-chat-search"
            class="context-button"
            title="Search conversation"
          >
            <span>🔍</span>
            <span class="text-[11px] hidden sm:inline">Search</span>
          </button>

          <!-- Space details button -->
          <button
            type="button"
            data-action="call-global"
            data-raw-click="if(window.__aetherisTransparency) window.__aetherisTransparency.open('pipeline');"
            class="context-button"
            title="Space details"
          >
            <span>🛡️</span>
            <span class="text-[11px] hidden sm:inline">Details</span>
          </button>

          <!-- Invite Friends Button -->
          <button
            type="button"
            data-open-relay-invite="${relay.id}"
            class="px-3 py-1.5 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            title="Invite people"
          >
            <span>Invite</span>
          </button>

          <details class="relay-mobile-more relative md:hidden">
            <summary class="context-button" aria-label="More community actions">More</summary>
            <div class="relay-mobile-more-menu">
              <button type="button" data-action="call-global" data-raw-click="if(window.__aetherisTransparency) window.__aetherisTransparency.open('pipeline');">Details</button>
              <button type="button" data-open-relay-invite="${relay.id}">Invite people</button>
            </div>
          </details>

          ${!isGlobal ? `
            <!-- Leave Relay Button -->
            <button
              type="button"
              data-leave-relay="${relay.id}"
              class="btn-leave-relay px-2.5 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
              title="Leave this community chat"
            >
              <span>🚪</span>
              <span class="hidden sm:inline">Leave</span>
            </button>
          ` : ''}

          ${isOwner ? `
            <!-- Delete Relay Button (Owner) -->
            <button
              type="button"
              data-delete-relay="${relay.id}"
              class="btn-delete-relay px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
              title="Delete this community chat permanently"
            >
              <span>🗑️</span>
              <span class="hidden sm:inline">Delete</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  /** Modal: Create New Sovereign Relay */
  public renderCreateRelayModal(): string {
    if (!this.isCreateModalOpen) return '';

    const emojis = ['⚡', '🔮', '🛡️', '⚔️', '🪐', '🌌', '🧬', '👁️', '💎', '🔥', '💻', '🗝️'];

    return `
      <div id="create-relay-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150" data-action="call-global" data-raw-click="if(event.target.id==='create-relay-backdrop'){if(window.relaysManager){window.relaysManager.isCreateModalOpen=false;window.clientStore&&window.clientStore.notifySync();}}">
        <div class="w-full max-w-md bg-surface-overlay border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
          
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div class="flex items-center space-x-2.5">
              <div class="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-lg">⚡</div>
              <div>
                <h3 class="text-base font-bold text-white tracking-tight">Create a community chat</h3>
                <p class="text-xs text-slate-400">Bring a group together in one private space</p>
              </div>
            </div>
            <button type="button" id="btn-close-create-relay" data-action="call-global" data-raw-click="if(window.relaysManager){window.relaysManager.isCreateModalOpen=false;window.clientStore&&window.clientStore.notifySync();}" class="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-surface-raised transition-all cursor-pointer">✕</button>
          </div>

          <form id="form-create-relay" class="space-y-4">
            <!-- Icon Picker -->
            <div class="space-y-1.5">
              <label class="text-xs text-slate-300 font-medium">Community icon</label>
              <div class="flex items-center space-x-2">
                <input type="text" id="create-relay-icon" value="⚡" maxlength="4" class="w-14 text-center text-xl bg-surface-raised border border-white/15 rounded-xl p-2 focus:outline-none focus:border-indigo-400 font-mono" />
                <div class="flex-1 flex items-center gap-1.5 flex-wrap">
                  ${emojis.map(e => `
                    <button type="button" class="btn-select-emoji-icon px-2 py-1 rounded-lg bg-surface-raised hover:bg-surface-base text-sm cursor-pointer" data-emoji="${e}">${e}</button>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Name -->
            <div class="space-y-1.5">
              <label class="text-xs text-slate-300 font-medium">Community name</label>
              <input
                type="text"
                id="create-relay-name"
                placeholder="e.g. Weekend photographers"
                required
                class="w-full bg-surface-raised border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-all font-sans"
              />
            </div>

            <!-- Description -->
            <div class="space-y-1.5">
              <label class="text-xs text-slate-300 font-medium">Description (Optional)</label>
              <textarea
                id="create-relay-desc"
                rows="2"
                placeholder="What will people talk about here?"
                class="w-full bg-surface-raised border border-white/15 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-all font-sans"
              ></textarea>
            </div>

            <!-- Submit -->
            <div class="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                id="btn-cancel-create-relay"
                class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-surface-raised transition-all cursor-pointer"
              >
                ${t('common.cancel', undefined, 'Cancel')}
              </button>
              <button
                type="submit"
                class="px-5 py-2.5 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
              >
                Create community
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  /** Modal: Invite Friends with 1-Click Link Copy & Code */
  public renderInviteModal(): string {
    if (!this.isInviteModalOpen || !this.targetInviteRelayId) return '';

    const relay = this.getRelayById(this.targetInviteRelayId) || this.getActiveRelay();
    const link = this.generateInviteLink(relay.id);

    return `
      <div id="relay-invite-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
        <div class="w-full max-w-md bg-surface-overlay border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
          
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div class="flex items-center space-x-2.5">
              <div class="w-9 h-9 rounded-2xl bg-surface-raised border border-white/10 flex items-center justify-center text-lg">${relay.icon}</div>
              <div>
                <h3 class="text-base font-bold text-white tracking-tight">Invite Friends to ${this._escapeHtml(relay.name)}</h3>
                <p class="text-xs text-slate-400">Share this invitation with people you trust</p>
              </div>
            </div>
            <button type="button" id="btn-close-invite-modal" class="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-surface-raised transition-all cursor-pointer">✕</button>
          </div>

          <!-- Share Link Box -->
          <div class="space-y-2">
            <label class="text-xs text-slate-300 font-medium">Shareable Invite Link</label>
            <div class="flex items-center space-x-2 bg-surface-raised border border-white/15 rounded-xl p-2">
              <input
                type="text"
                id="relay-invite-url-input"
                readonly
                value="${link}"
                class="flex-1 bg-transparent text-xs text-[var(--color-accent,#e59b3c)] font-mono focus:outline-none select-all"
              />
              <button
                type="button"
                id="btn-copy-relay-invite"
                class="px-3 py-1.5 rounded-lg bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 text-xs font-bold shrink-0 transition-all cursor-pointer active:scale-95 flex items-center space-x-1"
              >
                <span>📋</span>
                <span id="copy-btn-text">Copy</span>
              </button>
            </div>
          </div>

          <!-- Short Invite Code -->
          <div class="bg-black/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div class="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Short Code</div>
              <div class="text-base font-bold font-mono text-emerald-400 mt-0.5">${relay.inviteCode}</div>
            </div>
            <div class="text-right">
              <div class="text-[10px] text-slate-500 uppercase tracking-wider">Privacy</div>
              <div class="text-xs text-slate-300 mt-0.5">Protected conversation</div>
            </div>
          </div>

          <div class="text-[11px] text-slate-400 leading-relaxed font-sans">
            People who join with this link can take part in the private conversation.
          </div>

          <div class="pt-2 flex justify-end">
            <button
              type="button"
              id="btn-done-invite-modal"
              class="px-5 py-2 rounded-xl bg-surface-raised hover:bg-surface-base border border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
            >
              ${t('modal.confirm', undefined, 'Done')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /** Modal: Join Relay with Invite Code or Link */
  public renderJoinRelayModal(): string {
    if (!this.isJoinModalOpen) return '';

    return `
      <div id="join-relay-backdrop" data-action="call-global" data-raw-click="if(event.target.id==='join-relay-backdrop'){if(window.relaysManager){window.relaysManager.isJoinModalOpen=false;window.clientStore&&window.clientStore.notifySync();}}" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
        <div class="w-full max-w-md bg-surface-overlay border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
          
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div class="flex items-center space-x-2.5">
              <div class="w-9 h-9 rounded-2xl bg-surface-raised border border-white/10 flex items-center justify-center text-lg">📥</div>
              <div>
                <h3 class="text-base font-bold text-white tracking-tight">Join a community chat</h3>
                <p class="text-xs text-slate-400">Enter an invite link or code</p>
              </div>
            </div>
            <button type="button" id="btn-close-join-modal" data-action="call-global" data-raw-click="if(window.relaysManager){window.relaysManager.isJoinModalOpen=false;window.clientStore&&window.clientStore.notifySync();}" class="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-surface-raised transition-all cursor-pointer">✕</button>
          </div>

          <form id="form-join-relay" class="space-y-4">
            <div class="space-y-1.5">
              <label class="text-xs text-slate-300 font-medium">Invite Code or URL</label>
              <input
                type="text"
                id="join-relay-input"
                placeholder="Paste an invite link or code"
                required
                class="w-full bg-surface-raised border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e59b3c)] transition-all font-mono"
              />
            </div>

            <div id="join-relay-error" class="hidden text-xs text-rose-400 font-mono"></div>

            <div class="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                id="btn-cancel-join-modal" data-action="call-global" data-raw-click="if(window.relaysManager){window.relaysManager.isJoinModalOpen=false;window.clientStore&&window.clientStore.notifySync();}"
                class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-surface-raised transition-all cursor-pointer"
              >
                ${t('common.cancel', undefined, 'Cancel')}
              </button>
              <button
                type="submit"
                class="px-5 py-2.5 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
              >
                🔑 Join Enclave
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private _escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export const relaysManager = new RelaysManager();

serviceRegistry.registerInstance(SERVICES.RelaysManager || ('RelaysManager' as any), relaysManager);

if (typeof window !== 'undefined') {
  (window as any).relaysManager = relaysManager;
}
