/**
 * @file command-rail-v2.ts
 * @package @aetheris/client-ui
 * @description 2027 Spatial Command & Split-Preview Palette (Ctrl+K / Cmd+K) with WoT Trust Telemetry.
 */

import { clientStore } from './client-state.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { sovereignRouter } from './router.js';
import { canonicalVault } from './canonical-vault.js';
import { modalManager } from './modal-manager.js';
import { setWorkspaceLayout } from './workspace-layout.js';

export type CommandRailFilter =
  | 'ALL'
  | 'POSTS'
  | 'COMMUNITIES'
  | 'VAULT'
  | 'MESSAGES'
  | 'MEMBERS'
  | 'BINARIES'
  | 'COMMANDS';

export type SearchItemType = 'post' | 'member' | 'binary' | 'command' | 'vault' | 'message';

export interface CommandItem {
  id: string;
  title: string;
  category:
    | 'Navigation'
    | 'Layout & View'
    | 'Security & Crypto'
    | 'Simulation'
    | 'P2P & Swarm'
    | 'Audio & Voice';
  description: string;
  shortcut?: string;
  safetyLevel?: 'Local Action' | 'Cryptographic Broadcast' | 'Simulation Mode';
  run: () => void;
}

export interface WoTMetrics {
  trustScore: number;
  meritScore: number;
  maxFlowCapacity: number;
  sybilResistanceScore: number;
  directPeers: number;
  joinedEpoch: number;
}

export interface SearchItem {
  id: string;
  type: SearchItemType;
  title: string;
  subtitle: string;
  badge: string;
  category?: string;
  icon?: string;
  shortcut?: string;
  score?: number;
  data: any;
  action?: () => void;
}

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class CommandRailV2Engine {
  public isOpen: boolean = false;
  public query: string = '';
  public activeFilter: CommandRailFilter = 'ALL';
  public selectedIndex: number = 0;
  public commands: CommandItem[] = [];
  public results: SearchItem[] = [];

  constructor() {
    this._initCommands();
    if (typeof window !== 'undefined') {
      (window as any).commandRailV2 = this;
      this.attachEvents();
    }
  }

  private _initCommands(): void {
    this.commands = [
      {
        id: 'cmd-nav-feed',
        title: 'Go to Pulse Feed',
        category: 'Navigation',
        description: 'Open main community discussion stream',
        shortcut: 'G F',
        safetyLevel: 'Local Action',
        run: () => sovereignRouter.navigateTo('feed'),
      },
      {
        id: 'cmd-nav-messages',
        title: 'Open E2EE Direct Messages & Relays',
        category: 'Navigation',
        description: 'Switch to ML-KEM-768 Double Ratchet messaging',
        shortcut: 'G M',
        safetyLevel: 'Local Action',
        run: () => sovereignRouter.navigateTo('messages'),
      },
      {
        id: 'cmd-nav-vault',
        title: 'Open Encrypted Knowledge Vault',
        category: 'Navigation',
        description: 'Browse saved posts, private notes & verified releases',
        shortcut: 'G V',
        safetyLevel: 'Local Action',
        run: () => sovereignRouter.navigateTo('vault'),
      },
      {
        id: 'cmd-layout-split',
        title: 'Toggle 2027 Spatial Split-Screen Workspace',
        category: 'Layout & View',
        description: 'Run Feed and Messages/Vault side-by-side simultaneously',
        shortcut: 'Alt+3',
        safetyLevel: 'Local Action',
        run: () => setWorkspaceLayout('split'),
      },
      {
        id: 'cmd-crypto-transparency',
        title: 'Inspect Live Post-Quantum & ZK-RLN Pipeline',
        category: 'Security & Crypto',
        description: 'Open live hex inspector for ML-KEM-768 & Groth16 proofs',
        shortcut: 'Ctrl+Shift+T',
        safetyLevel: 'Local Action',
        run: () => void modalManager.openFeature('transparency'),
      },
      {
        id: 'cmd-binary-hygiene',
        title: 'Scan Binary for UPX Packers & Shannon Entropy',
        category: 'Security & Crypto',
        description: 'Open static PE/ELF/Mach-O binary hygiene portal',
        safetyLevel: 'Local Action',
        run: () => void modalManager.openFeature('binary-hygiene'),
      },
    ];
  }

  public open(initialQuery: string = '', initialFilter: CommandRailFilter = 'ALL'): void {
    this.isOpen = true;
    this.query = initialQuery;
    this.activeFilter = initialFilter;
    this.selectedIndex = 0;
    this.results = this.search(this.query, this.activeFilter);
    clientStore.isCommandRailOpen = true;
    clientStore.notify('COMMAND_RAIL_OPENED');
    if (typeof document !== 'undefined') {
      let modal = document.getElementById('command-rail-v2-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'command-rail-v2-modal';
        document.body.appendChild(modal);
      }
      modal.outerHTML = this.renderModal(this.results);
      const input = document.getElementById('command-rail-v2-input') as HTMLInputElement | null;
      input?.focus();
    }
  }

  public close(): void {
    this.isOpen = false;
    clientStore.isCommandRailOpen = false;
    clientStore.notify('COMMAND_RAIL_CLOSED');
    if (typeof document !== 'undefined') {
      const modal = document.getElementById('command-rail-v2-modal');
      modal?.remove();
    }
  }

  public setQuery(query: string): void {
    this.query = query;
    this.selectedIndex = 0;
    this.results = this.search(this.query, this.activeFilter);
    this.renderUpdate();
  }

  public setFilter(filter: CommandRailFilter): void {
    this.activeFilter = filter;
    this.selectedIndex = 0;
    this.results = this.search(this.query, this.activeFilter);
    this.renderUpdate();
  }

  public selectIndex(index: number): void {
    if (this.results.length === 0) {
      this.selectedIndex = 0;
      return;
    }
    this.selectedIndex = Math.max(0, Math.min(this.results.length - 1, index));
    this.renderUpdate();
  }

  public navigate(direction: 'up' | 'down'): void {
    if (this.results.length === 0) return;
    if (direction === 'down') {
      this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
    } else {
      this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
    }
    this.renderUpdate();
  }

  public executeSelected(customHandler?: (item: SearchItem) => void): void {
    const selected = this.results[this.selectedIndex];
    if (!selected) return;
    if (customHandler) {
      customHandler(selected);
      return;
    }
    if (typeof selected.action === 'function') {
      selected.action();
    }
    this.close();
  }

  public search(query: string = '', filter: CommandRailFilter = 'ALL'): SearchItem[] {
    const q = query.trim().toLowerCase();
    const out: SearchItem[] = [];

    if (filter === 'ALL' || filter === 'COMMANDS') {
      for (const cmd of this.commands) {
        if (!q || cmd.title.toLowerCase().includes(q) || cmd.description.toLowerCase().includes(q)) {
          out.push({
            id: cmd.id,
            type: 'command',
            title: cmd.title,
            subtitle: cmd.description,
            badge: cmd.category,
            shortcut: cmd.shortcut,
            icon: '⚡',
            score: 10,
            data: cmd,
            action: cmd.run,
          });
        }
      }
    }

    if (filter === 'ALL' || filter === 'POSTS') {
      for (const post of (clientStore.posts || []).slice(0, 25)) {
        if (!q || post.title.toLowerCase().includes(q) || post.content.toLowerCase().includes(q)) {
          out.push({
            id: `post-${post.id}`,
            type: 'post',
            title: post.title || 'Sovereign Pulse',
            subtitle: `c/${post.channelId} · ▲ ${post.meritVotes}`,
            badge: post.flair || 'DISCUSSION',
            icon: '💬',
            score: 8,
            data: post,
            action: () => sovereignRouter.navigateTo('feed'),
          });
        }
      }
    }

    if (filter === 'ALL' || filter === 'COMMUNITIES') {
      for (const circle of sovereignCircleEngine.getAllCircles()) {
        if (!q || circle.name.toLowerCase().includes(q) || circle.displayName.toLowerCase().includes(q)) {
          out.push({
            id: `circle-${circle.id}`,
            type: 'post',
            title: circle.displayName || circle.name,
            subtitle: `${circle.membersCount.toLocaleString()} members · ${circle.description}`,
            badge: 'COMMUNITY',
            icon: circle.icon || '🌐',
            score: 7,
            data: circle,
            action: () => {
              clientStore.joinChannel(circle.channelId);
              sovereignRouter.navigateTo('communities');
            },
          });
        }
      }
    }

    if (filter === 'ALL' || filter === 'VAULT') {
      for (const item of canonicalVault.getAllActiveItems().slice(0, 15)) {
        if (!q || item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q)) {
          out.push({
            id: `vault-${item.id}`,
            type: 'vault',
            title: item.title,
            subtitle: item.content.slice(0, 90),
            badge: 'VAULT',
            icon: '🔐',
            score: 6,
            data: item,
            action: () => sovereignRouter.navigateTo('vault'),
          });
        }
      }
    }

    return out.slice(0, 30);
  }

  public renderUpdate(root?: HTMLElement): void {
    const container =
      root ||
      (typeof document !== 'undefined'
        ? document.getElementById('command-rail-v2-modal') || document.getElementById('command-rail-v2')
        : null);
    if (!container) return;
    const scrollPos = container.querySelector('.max-h-\\[65vh\\]')?.scrollTop || 0;
    container.outerHTML = this.renderModal(this.results);
    const updated = document.getElementById('command-rail-v2-modal');
    const scrollEl = updated?.querySelector('.max-h-\\[65vh\\]');
    if (scrollEl) scrollEl.scrollTop = scrollPos;
    const input = document.getElementById('command-rail-v2-input') as HTMLInputElement | null;
    input?.focus();
  }

  public attachEvents(root: HTMLElement = typeof document !== 'undefined' ? document.body : (undefined as any), onClose?: () => void): void {
    if (!root || typeof root.addEventListener !== 'function') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        if (this.isOpen) {
          this.close();
        } else {
          this.open();
        }
        return;
      }

      if (!this.isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigate('down');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigate('up');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeSelected();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
        if (onClose) onClose();
      }
    });

    document.addEventListener('click', (e: MouseEvent) => {
      if (!this.isOpen) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const filterBtn = target.closest<HTMLElement>('[data-cmd-filter]');
      if (filterBtn) {
        e.preventDefault();
        const f = filterBtn.getAttribute('data-cmd-filter') as CommandRailFilter;
        if (f) this.setFilter(f);
        return;
      }

      const indexBtn = target.closest<HTMLElement>('[data-cmd-index]');
      if (indexBtn) {
        e.preventDefault();
        const idx = Number(indexBtn.getAttribute('data-cmd-index'));
        if (!isNaN(idx)) {
          this.selectIndex(idx);
          this.executeSelected();
        }
        return;
      }

      if (target.id === 'command-rail-v2-modal' || target.closest('#btn-close-command-rail')) {
        e.preventDefault();
        this.close();
        if (onClose) onClose();
      }
    });

    document.addEventListener('input', (e: Event) => {
      if (!this.isOpen) return;
      const target = e.target as HTMLInputElement | null;
      if (target && target.id === 'command-rail-v2-input') {
        this.setQuery(target.value);
      }
    });
  }

  public renderModal(results: SearchItem[] = this.search(this.query, this.activeFilter)): string {
    this.results = results;
    const selectedItem = results[this.selectedIndex] || null;
    const filters: CommandRailFilter[] = ['ALL', 'COMMANDS', 'POSTS', 'COMMUNITIES', 'VAULT'];

    return `<div
      id="command-rail-v2-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Universal Command and Search Palette"
      class="command-rail fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-xl pt-14 px-4 select-none animate-in fade-in duration-150"
    >
      <div id="command-rail-v2" class="w-full max-w-4xl rounded-3xl bg-[#0b0f19]/95 border border-cyan-500/30 shadow-[0_24px_80px_rgba(0,0,0,0.75)] overflow-hidden">
        <div class="p-4 border-b border-white/10 flex items-center gap-3">
          <span class="text-cyan-400 font-mono text-sm font-bold">⌘K</span>
          <input
            id="command-rail-v2-input"
            type="text"
            value="${escapeHtml(this.query)}"
            placeholder="Type a command or search discussions, communities, vault notes..."
            aria-label="Command palette search"
            class="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            autofocus
          />
          <button
            type="button"
            id="btn-close-command-rail"
            data-action="command.close"
            class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-slate-400 hover:text-white cursor-pointer"
          >ESC</button>
        </div>

        <div class="px-4 py-2 border-b border-white/[0.06] flex items-center gap-1.5 overflow-x-auto">
          ${filters
            .map((f) => {
              const active = this.activeFilter === f;
              return `<button
                type="button"
                data-cmd-filter="${f}"
                class="px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35'
                    : 'text-slate-400 hover:text-white'
                }"
              >${f}</button>`;
            })
            .join('')}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 max-h-[65vh]">
          <div class="md:col-span-7 overflow-y-auto divide-y divide-white/[0.04] p-2">
            ${
              results.length > 0
                ? results
                    .map((item, idx) => {
                      const isSel = idx === this.selectedIndex;
                      return `<button
                        type="button"
                        data-cmd-index="${idx}"
                        class="w-full text-left p-3 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isSel
                            ? 'bg-cyan-500/15 border border-cyan-500/35'
                            : 'hover:bg-white/[0.04] border border-transparent'
                        }"
                      >
                        <div class="flex items-center gap-3 min-w-0">
                          <span class="text-base shrink-0">${escapeHtml(item.icon || '⚡')}</span>
                          <div class="min-w-0">
                            <div class="text-xs font-bold text-white truncate">${escapeHtml(item.title)}</div>
                            <div class="text-[11px] text-slate-400 truncate">${escapeHtml(item.subtitle)}</div>
                          </div>
                        </div>
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-cyan-300 shrink-0">${escapeHtml(
                          item.badge
                        )}</span>
                      </button>`;
                    })
                    .join('')
                : `<div class="p-8 text-center text-xs text-slate-400">No matching commands or records.</div>`
            }
          </div>

          <div class="hidden md:block md:col-span-5 border-l border-white/10 p-5 bg-black/25 overflow-y-auto">
            ${
              selectedItem
                ? `<div class="space-y-3">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      ${escapeHtml(selectedItem.badge)}
                    </span>
                    <h4 class="text-sm font-extrabold text-white">${escapeHtml(selectedItem.title)}</h4>
                    <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(selectedItem.subtitle)}</p>${
                      selectedItem.shortcut
                        ? `<div class="pt-2 text-[11px] font-mono text-slate-400">Shortcut: <kbd class="px-2 py-0.5 rounded bg-white/10 text-white">${escapeHtml(
                            selectedItem.shortcut
                          )}</kbd></div>`
                        : ''
                    }
                  </div>`
                : `<div class="text-xs text-slate-500">Select an item to preview details.</div>`
            }
          </div>
        </div>
      </div>
    </div>`;
  }
}

export const commandRailV2 = new CommandRailV2Engine();
