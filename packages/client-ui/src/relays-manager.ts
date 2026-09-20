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
        { id: 'relays-dev', name: 'dev-core', type: 'text', isEncrypted: true },
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

    // Migrate any legacy voice-radar channels in local storage to standard text community channel
    let didMigrate = false;
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

  /** Unified Navigation Pane on the Left Side of Relays Chat */
  public renderRelayServerRail(): string {
    const activeRelay = this.getActiveRelay();
    const windowClientStore = typeof window !== 'undefined' ? (window as any).clientStore : null;
    const activeChId = windowClientStore?.activeChannelId || activeRelay.channels[0]?.id || 'relays-general';

    return `
      <aside class="hidden md:flex w-72 border-subtle-r bg-surface-base/80 flex-col shrink-0 overflow-hidden select-none">
        <!-- Top header: Communities + Actions -->
        <div class="p-3 border-b border-white/5 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-sm">📻</span>
            <h2 class="text-xs font-bold text-slate-300">Community Spaces</h2>
          </div>
          <div class="flex items-center space-x-1">
            <button
              type="button"
              id="btn-open-create-relay"
              class="px-2 py-1 bg-surface-raised hover:bg-surface-elevated text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1 border border-white/10 transition-all cursor-pointer"
              title="Create a community chat"
            >
              <span>+</span>
              <span class="hidden sm:inline">New</span>
            </button>
            <button
              type="button"
              id="btn-open-join-relay"
              class="px-2 py-1 bg-surface-raised hover:bg-surface-elevated text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1 border border-white/10 transition-all cursor-pointer"
              title="Join with an invite"
            >
              <span>📥</span>
            </button>
          </div>
        </div>

        <!-- Communities and Channels List -->
        <div class="flex-1 overflow-y-auto p-2 space-y-2">
          ${this.relays.map(r => {
            const isActive = r.id === this.activeRelayId;
            return `
              <div class="space-y-1">
                <!-- Community Header Button -->
                <button
                  type="button"
                  data-select-relay="${r.id}"
                  class="btn-select-relay w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center space-x-2.5 border ${
                    isActive
                      ? 'bg-surface-raised border-[var(--color-accent,#e59b3c)]/40 shadow-xs'
                      : 'bg-transparent hover:bg-surface-raised/40 border-transparent text-slate-300 hover:text-white'
                  }"
                  title="${this._escapeHtml(r.name)}"
                >
                  <span class="text-lg shrink-0">${r.icon}</span>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-300'}">${this._escapeHtml(r.name)}</div>
                    <div class="text-[10px] text-slate-500 truncate">${r.channels.length} channels</div>
                  </div>
                  ${isActive ? `<span class="w-1.5 h-1.5 rounded-full bg-[var(--color-accent,#e59b3c)] shrink-0"></span>` : ''}
                </button>

                <!-- Channels under active community -->
                ${isActive ? `
                  <div class="pl-4 pr-1 space-y-0.5 border-l border-white/5 ml-4">
                    ${r.channels.map(ch => {
                      const isChActive = activeChId === ch.id;
                      return `
                        <button
                          type="button"
                          data-channel-id="${ch.id}"
                          class="btn-channel w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                            isChActive
                              ? 'bg-[var(--color-accent,#e59b3c)]/15 text-[var(--color-accent,#e59b3c)] font-semibold border border-[var(--color-accent,#e59b3c)]/30'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-surface-raised/50'
                          }"
                        >
                          <span class="truncate"># ${this._escapeHtml(ch.name)}</span>
                          <span class="text-[10px] text-slate-500">${ch.type === 'voice' ? '🎙️' : ''}</span>
                        </button>
                      `;
                    }).join('')}
                  </div>
                ` : ''}
              </div>
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

    return `
      <div class="h-14 border-b border-white/10 bg-surface-base/80 px-4 flex items-center justify-between shrink-0 select-none">
        <div class="flex items-center space-x-3 truncate">
          <span class="text-xl">${relay.icon}</span>
          <div>
            <div class="flex items-center space-x-2">
              <h2 class="text-sm font-bold text-white tracking-tight">${this._escapeHtml(displayName)}</h2>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-surface-raised text-slate-300 border border-white/10">Private</span>
            </div>
            <div class="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5">
              <span># ${activeChannelName}</span>
              <span>•</span>
              <span>${isGlobal ? 'Community chat' : `${relay.members.length} members`}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <!-- Privacy Info Badge -->
          <button
            type="button" data-action="call-global" data-raw-click="if(window.__aetherisTransparency) window.__aetherisTransparency.open('pipeline');"
            class="px-2.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-elevated border border-white/10 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer"
            title="How message privacy works"
          >
            <span>🛡️</span>
            <span class="hidden lg:inline">Privacy</span>
          </button>

          <!-- Invite Friends Button -->
          <button
            type="button"
            data-open-relay-invite="${relay.id}"
            class="px-3 py-1.5 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            title="Invite people"
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
