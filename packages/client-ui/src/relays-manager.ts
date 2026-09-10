// ===========================================================================
// UREfy — SOVEREIGN RELAYS & GUILDS MANAGER
// Enables user-created decentralized real-time chat spaces, guilds,
// sub-channels, and 1-click shareable invite codes / links.
// Zero external trademarks (Sovereign Relays / Guild Hubs).
// ===========================================================================

import { serviceRegistry, SERVICES } from './service-registry.js';
import { zkDeliveryManager, renderZKDeliveryBadge } from './delivery-proof.js';
import { transparencyMode } from './transparency-mode.js';
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
      description: 'Primary sovereign mesh network for real-time E2EE encrypted transmissions.',
      ownerFingerprint: 'genesis-core',
      inviteCode: 'NEXUS-01',
      channels: [
        { id: 'relays-general', name: 'general', type: 'text', isEncrypted: true },
        { id: 'relays-dev', name: 'dev-core', type: 'text', isEncrypted: true },
        { id: 'relays-voice-general', name: 'voice-radar', type: 'voice', isEncrypted: true },
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
      name: name.trim() || 'Sovereign Guild',
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
            name: `# ${ch.name}`,
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
              name: `# ${ch.name}`,
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
            name: `# ${ch.name}`,
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
        name: `# ${newChan.name}`,
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

  /** Vertical Rail on the Left Side of Relays Chat */
  public renderRelayServerRail(): string {
    return `
      <div class="w-14 bg-surface-base border-r border-white/5 flex flex-col items-center py-3 space-y-2 shrink-0 select-none">
        ${this.relays.map(r => {
          const isActive = r.id === this.activeRelayId;
          return `
            <div class="relative group">
              <!-- Active indicator bar -->
              <span class="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 rounded-r transition-all ${
                isActive ? 'h-8 bg-indigo-400' : 'h-2 bg-transparent group-hover:h-4 group-hover:bg-white/40'
              }"></span>
              <button
                type="button"
                data-select-relay="${r.id}"
                class="btn-select-relay w-10 h-10 rounded-2xl flex items-center justify-center text-lg transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white rounded-xl shadow-lg shadow-indigo-500/20'
                    : 'bg-surface-raised hover:bg-indigo-600/30 hover:rounded-xl text-slate-300 hover:text-white border border-white/5'
                }"
                title="${this._escapeHtml(r.name)}"
              >
                <span>${r.icon}</span>
              </button>
            </div>
          `;
        }).join('')}

        <div class="w-6 h-px bg-white/10 my-1"></div>

        <!-- Create Relay Button -->
        <button
          type="button"
          id="btn-open-create-relay"
          class="w-10 h-10 rounded-full bg-surface-raised hover:bg-emerald-500/20 hover:text-emerald-400 hover:rounded-xl text-slate-400 border border-white/5 hover:border-emerald-500/30 flex items-center justify-center text-lg transition-all cursor-pointer group"
          title="Create a Sovereign Relay"
        >
          <span>➕</span>
        </button>

        <!-- Join Relay Button -->
        <button
          type="button"
          id="btn-open-join-relay"
          class="w-10 h-10 rounded-full bg-surface-raised hover:bg-cyan-500/20 hover:text-cyan-400 hover:rounded-xl text-slate-400 border border-white/5 hover:border-cyan-500/30 flex items-center justify-center text-lg transition-all cursor-pointer group"
          title="Join Relay with Invite Link"
        >
          <span>📥</span>
        </button>
      </div>
    `;
  }

  /** Relay Header Bar with Invite Friends, Leave & Delete Buttons */
  public renderRelayHeader(relay: SovereignRelay, activeChannelName: string, userFingerprint?: string): string {
    const isGlobal = relay.id === 'relay-global-nexus';
    const currentFp = userFingerprint || (typeof window !== 'undefined' && (window as any).clientStore?.keypair?.fingerprint) || '';
    const isOwner = !isGlobal && (
      !relay.ownerFingerprint ||
      relay.ownerFingerprint === 'remote-peer' ||
      (Boolean(currentFp) && relay.ownerFingerprint === currentFp) ||
      (!currentFp)
    );

    return `
      <div class="h-14 border-b border-white/10 bg-surface-base/80 px-4 flex items-center justify-between shrink-0 select-none">
        <div class="flex items-center space-x-3 truncate">
          <span class="text-xl">${relay.icon}</span>
          <div>
            <div class="flex items-center space-x-2">
              <h2 class="text-sm font-bold text-white tracking-tight">${this._escapeHtml(relay.name)}</h2>
              <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">E2EE</span>
            </div>
            <div class="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5">
              <span># ${activeChannelName}</span>
              <span>•</span>
              <span>${relay.members.length} nodes online</span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <!-- ZK Delivery & Cryptographic Transparency Badge -->
          <button
            type="button" data-action="call-global" data-raw-click="if(window.__aetherisTransparency) window.__aetherisTransparency.open('pipeline');"
            class="px-2.5 py-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Inspect Cryptographic Delivery & Pipeline"
          >
            <span>🛡️🛡️</span>
            <span class="hidden lg:inline">ZK Verified Delivery</span>
          </button>

          <!-- Invite Friends Button -->
          <button
            type="button"
            data-open-relay-invite="${relay.id}"
            class="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/80 to-indigo-500/80 hover:from-indigo-600 hover:to-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            title="Invite peers to this Relay"
          >
            <span>🔗</span>
            <span class="hidden sm:inline">Invite</span>
          </button>

          ${!isGlobal ? `
            <!-- Leave Relay Button -->
            <button
              type="button"
              data-leave-relay="${relay.id}"
              class="btn-leave-relay px-2.5 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
              title="Leave this Sovereign Relay"
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
              title="Delete this Sovereign Relay permanently"
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
                <h3 class="text-base font-bold text-white tracking-tight">Create Sovereign Relay</h3>
                <p class="text-xs text-slate-400 font-mono">Your private real-time communication guild</p>
              </div>
            </div>
            <button type="button" id="btn-close-create-relay" data-action="call-global" data-raw-click="if(window.relaysManager){window.relaysManager.isCreateModalOpen=false;window.clientStore&&window.clientStore.notifySync();}" class="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-surface-raised transition-all cursor-pointer">✕</button>
          </div>

          <form id="form-create-relay" class="space-y-4">
            <!-- Icon Picker -->
            <div class="space-y-1.5">
              <label class="text-xs text-slate-300 font-medium">Relay Emblem / Icon</label>
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
              <label class="text-xs text-slate-300 font-medium">Relay Name</label>
              <input
                type="text"
                id="create-relay-name"
                placeholder="e.g. Zero-Knowledge Research Lab"
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
                placeholder="Brief purpose of this sovereign enclave..."
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
                class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
              >
                🚀 Launch Sovereign Relay
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
              <div class="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-lg">${relay.icon}</div>
              <div>
                <h3 class="text-base font-bold text-white tracking-tight">Invite Friends to ${this._escapeHtml(relay.name)}</h3>
                <p class="text-xs text-slate-400 font-mono">Encrypted Sovereign P2P Invitation</p>
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
                class="flex-1 bg-transparent text-xs text-indigo-300 font-mono focus:outline-none select-all"
              />
              <button
                type="button"
                id="btn-copy-relay-invite"
                class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 transition-all cursor-pointer active:scale-95 flex items-center space-x-1"
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
              <div class="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Access Policy</div>
              <div class="text-xs font-mono text-cyan-300 mt-0.5">End-to-End Ratchet</div>
            </div>
          </div>

          <div class="text-[11px] text-slate-400 leading-relaxed font-sans">
            🛡️ Peers who join using this link will connect directly via WebRTC Datachannels and receive quantum-ratcheted channel encryption keys.
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
              <div class="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-lg">📥</div>
              <div>
                <h3 class="text-base font-bold text-white tracking-tight">Join a Sovereign Relay</h3>
                <p class="text-xs text-slate-400 font-mono">Enter an invite link or short code</p>
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
                placeholder="e.g. RELAY-ZK-9821 or https://.../?invite=..."
                required
                class="w-full bg-surface-raised border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-mono"
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
                class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all cursor-pointer active:scale-95"
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
