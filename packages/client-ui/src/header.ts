/**
 * @file header.ts
 * @package @aetheris/client-ui
 * @description Sovereign Top Navigation Header & Global Control Bar.
 * Encapsulates primary navigation (6-pillar), search/omni-box,
 * UI mode switcher, broadcast banner, and ambient indicators.
 */

import { clientStore } from './client-state.js';
import { ambientNetworkMinimap } from './network-minimap.js';
import { pwaService } from './pwa-service.js';
import { notificationCenter } from './notifications.js';
import { i18n } from './i18n.js';
import { renderIcon } from './ui/icons.js';

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface HeaderToolsOptions {
  isAdvancedOverflowOpen: boolean;
  renderAdvancedTools: (isDropdown: boolean) => string;
}

/**
 * Renders the 5 primary navigation tabs in the top header.
 */
export function renderHeaderPrimaryNav(): string {
  return `
    <button type="button" data-nav-mode="pulse" class="btn-nav-mode px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${clientStore.activeChannelId.startsWith('pulse-') ? 'is-active nav-item-active shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-overlay/50'}" title="Feed & sovereign pulse stream">
      <span class="shrink-0 text-cyan-400">${renderIcon('feed', { size: 14 })}</span>
      <span>Feed</span>
    </button>

    <button type="button" data-nav-mode="explore" class="btn-nav-mode px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${clientStore.activeChannelId === 'explore' ? 'is-active nav-item-active shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-overlay/50'}" title="Explore network and trending nodes">
      <span class="shrink-0 text-indigo-400">${renderIcon('explore', { size: 14 })}</span>
      <span>Explore</span>
    </button>

    <button type="button" data-nav-mode="relays" class="btn-nav-mode px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${clientStore.activeChannelId.startsWith('relays-') || clientStore.activeChannelId.startsWith('relay-') || clientStore.activeChannelId.startsWith('dm-') ? 'is-active nav-item-active shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-overlay/50'}" title="End-to-end encrypted messaging">
      <span class="shrink-0 text-emerald-400">${renderIcon('messages', { size: 14 })}</span>
      <span>Messages</span>
    </button>

    <button type="button" data-nav-mode="vault" class="btn-nav-mode px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${clientStore.activeChannelId.startsWith('vault-') ? 'is-active nav-item-active shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-overlay/50'}" title="Encrypted files vault & audited releases">
      <span class="shrink-0 text-amber-400">${renderIcon('vault', { size: 14 })}</span>
      <span>Vault</span>
    </button>

    <button type="button" data-nav-mode="profile" class="btn-nav-mode px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${clientStore.activeChannelId.startsWith('profile') ? 'is-active nav-item-active shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-overlay/50'}" title="Your sovereign cryptographic identity & settings">
      <span class="shrink-0 text-purple-400">${renderIcon('profile', { size: 14 })}</span>
      <span>Profile</span>
    </button>
  `;
}

/**
 * Renders the global urgent broadcast announcement banner if present.
 */
export function renderBroadcastBanner(): string {
  const msg = clientStore.broadcastAnnouncement?.trim();
  if (!msg) return '';

  let dismissed = null;
  if (typeof sessionStorage !== 'undefined') {
    try {
      dismissed = sessionStorage.getItem('aetheris_dismissed_broadcast');
    } catch (_) {}
  }
  if (msg === dismissed) return '';

  return `
    <div id="network-announcement-banner" class="w-full bg-gradient-to-r from-amber-500/20 via-amber-600/25 to-yellow-500/20 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between z-30 shadow-lg text-amber-200 text-xs font-sans animate-fade-in">
      <div class="flex items-center space-x-2.5 min-w-0 flex-1 mr-3">
        <span class="flex h-2 w-2 relative shrink-0">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span class="font-bold uppercase tracking-wider text-[10px] bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/50 shrink-0 font-mono">
          System Broadcast
        </span>
        <span class="font-medium text-slate-100 truncate">${escapeHtml(msg)}</span>
      </div>
      <button
        type="button"
        id="btn-dismiss-broadcast"
        data-action="dismiss-broadcast"
        class="text-amber-400 hover:text-white p-1 rounded-lg hover:bg-amber-500/20 transition-all cursor-pointer shrink-0 text-xs font-mono"
        title="Dismiss announcement"
      >
        ✕
      </button>
    </div>
  `;
}

/**
 * Renders the header tools (PWA, Minimap, UI mode toggle, overflow menu, theme button, notifs).
 */
export function renderHeaderTools(options: HeaderToolsOptions): string {
  return `
    <!-- PWA 1-CLICK INSTALL (visible when installable) -->
    <button type="button" id="btn-pwa-install" data-action="pwa-install" class="${pwaService.isInstallable && !pwaService.isInstalled ? 'inline-flex' : 'hidden'} px-2.5 py-1.5 text-xs rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono items-center space-x-1.5 transition-all shadow-sm cursor-pointer" title="Install Aetheris as Native App">
      <span>📲</span>
      <span class="font-sans font-medium">Install</span>
    </button>

    <!-- AMBIENT NETWORK MINIMAP & STATUS -->
    ${ambientNetworkMinimap.renderMinimapHTML()}

    <!-- UI MODE SWITCHER PILL (Simple / Sovereign) -->
    <button type="button" id="btn-toggle-ui-mode" data-action="toggle-ui-mode" class="px-2.5 py-1.5 rounded-xl text-xs font-mono border transition-all flex items-center space-x-1.5 cursor-pointer ${clientStore.uiMode === 'simple' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30'}" title="${i18n.t('uiMode.switchMode', undefined, 'Switch Interface Mode')}">
      <span>${clientStore.uiMode === 'simple' ? '🌱' : '⚡'}</span>
      <span class="font-sans text-[11px] font-semibold">${clientStore.uiMode === 'simple' ? i18n.t('uiMode.simple', undefined, 'Simple') : i18n.t('uiMode.sovereign', undefined, 'Sovereign')}</span>
    </button>

    ${clientStore.uiMode === 'sovereign' 
      ? options.renderAdvancedTools(false)
      : `
        <!-- ADVANCED TOOLS OVERFLOW DROPDOWN (SIMPLE MODE) -->
        <div class="relative">
          <button type="button" id="btn-open-advanced-overflow" data-action="toggle-advanced-overflow" class="p-2 text-xs rounded-xl border border-white/5 bg-surface-raised/80 hover:bg-surface-overlay text-slate-300 transition-all flex items-center space-x-1.5 cursor-pointer" title="${i18n.t('uiMode.advancedTools', undefined, 'Advanced Tools')}">
            <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
            <span class="hidden xl:inline text-[11px] font-sans text-slate-300 font-medium">${i18n.t('uiMode.advancedTools', undefined, 'Advanced Tools')}</span>
          </button>

          ${options.isAdvancedOverflowOpen ? `
            <div id="advanced-overflow-backdrop" class="fixed inset-0 z-40" data-action="close-advanced-overflow"></div>
            <div id="advanced-overflow-menu" class="absolute right-0 top-full mt-2 w-80 p-3 bg-surface-raised/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-2.5 select-none">
              <div class="flex items-center justify-between pb-2 border-b border-white/5">
                <span class="text-xs font-bold text-white font-mono flex items-center space-x-1.5">
                  <span>🛠️</span>
                  <span>${i18n.t('uiMode.advancedTools', undefined, 'Advanced Tools')}</span>
                </span>
                <button type="button" data-action="set-ui-mode" data-ui-mode="sovereign" class="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer">
                  Switch to Sovereign ⚡
                </button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                ${options.renderAdvancedTools(true)}
              </div>
            </div>
          ` : ''}
        </div>
      `
    }

    <!-- THEME SELECTOR (all screens) -->
    <button type="button" id="btn-open-theme-picker" data-action="open-theme" class="px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-raised/80 hover:bg-surface-overlay text-slate-300 font-mono flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer" title="Choose Theme & Typography">
      <span>🎨</span>
      <span class="hidden xl:inline font-sans font-medium">Theme</span>
    </button>

    <!-- NOTIFICATIONS BELL (all screens) -->
    <div class="relative flex items-center">
      <button type="button" id="btn-toggle-notifs" data-action="toggle-notifs" class="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-raised transition-all cursor-pointer" title="Notifications">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
        ${notificationCenter.unreadCount > 0 ? `<span class="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span><span class="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>` : ''}
      </button>
    </div>
  `;
}
