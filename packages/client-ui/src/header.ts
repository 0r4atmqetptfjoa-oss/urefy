/**
 * @file header.ts
 * @package @aetheris/client-ui
 * @description 2027 Sovereign Header with Dynamic Cryptographic & P2P Swarm Capsule.
 */

import { clientStore } from './client-state.js';
import { pwaService } from './pwa-service.js';
import { notificationCenter } from './notifications-facade.js';
import { i18n } from './i18n.js';
import { renderIcon } from './ui/icons.js';
import { facetSwitcher } from './facet-switcher.js';
import { PRIMARY_NAV_ITEMS, renderNavIcon, getLocalizedNavLabel } from './nav-config.js';
import { sovereignRouter } from './router.js';
import { reactiveTelemetry } from './reactive-signals.js';

function escapeHtml(text: string): string {
  return String(text ?? '')
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
 * Renders the 2027 Dynamic Island Status Capsule (live ML-KEM-768 epoch, P2P Swarm & ZK-RLN badge).
 */
export function renderDynamicStatusCapsule(): string {
  const isOnline = clientStore.isConnected;
  const epoch = reactiveTelemetry.pqRatchetEpoch.peek();
  const activeMode = clientStore.uiMode || 'simple';

  return `<button
    type="button"
    id="header-dynamic-capsule"
    data-action="modal.open"
    data-feature="transparency"
    title="Inspect Live Post-Quantum ML-KEM-768 Ratchet & P2P Mesh Telemetry"
    aria-label="Live cryptographic protocol status"
    class="hidden xl:inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#0b0e17]/90 backdrop-blur-2xl border border-cyan-500/25 hover:border-cyan-400/55 shadow-[0_2px_18px_rgba(0,229,255,0.10)] transition-all duration-200 group cursor-pointer"
  >
    <span class="relative flex h-2 w-2">
      <span class="${
        isOnline ? 'animate-ping bg-emerald-400' : 'bg-amber-400'
      } absolute inline-flex h-full w-full rounded-full opacity-75"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 ${
        isOnline ? 'bg-emerald-400' : 'bg-amber-400'
      }"></span>
    </span>
    <span class="text-[11px] font-mono font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
      PQ-KEM <span class="text-cyan-400">#${epoch}</span>
    </span>
    <span class="h-3 w-[1px] bg-white/10" aria-hidden="true"></span>
    <span class="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
      ${activeMode === 'simple' ? 'E2EE Ready' : 'ZK-RLN Active'}
    </span>
  </button>`;
}

export function renderHeaderPrimaryNav(): string {
  const currentRoute = sovereignRouter.route;
  const primaryItems = PRIMARY_NAV_ITEMS.filter((item) => item.id !== 'more');

  return `<nav aria-label="Primary Workspace Navigation" class="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-surface-base/75 backdrop-blur-xl border border-white/[0.07]">
    ${primaryItems
      .map((item) => {
        const isActive =
          currentRoute === item.id ||
          (currentRoute === 'feed' && item.id === 'feed') ||
          (currentRoute === 'messages' && item.id === 'messages');
        const label = getLocalizedNavLabel(item);
        return `<button
          type="button"
          id="header-nav-${escapeHtml(item.id)}"
          data-testid="${escapeHtml(item.testId)}"
          data-nav-id="${escapeHtml(item.id)}"
          data-action="nav.primary"
          aria-current="${isActive ? 'page' : 'false'}"
          class="inline-flex items-center gap-2 px-3.5 py-1.5 min-h-[38px] rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            isActive
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/35 shadow-[0_2px_12px_rgba(0,229,255,0.14)]'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
          }"
        >
          ${renderNavIcon(item, { isActive, size: 16 })}
          <span>${escapeHtml(label)}</span>
        </button>`;
      })
      .join('')}
  </nav>`;
}

export function renderBroadcastBanner(): string {
  const msg = (clientStore as any).serverBroadcastMessage;
  if (!msg || (clientStore as any).broadcastDismissed) return '';

  return `<div id="system-broadcast-banner" role="region" aria-label="System broadcast notice" class="w-full bg-gradient-to-r from-amber-500/15 via-cyan-500/15 to-amber-500/15 border-b border-amber-400/30 px-4 py-2 text-xs text-amber-200 flex items-center justify-between gap-3 backdrop-blur-md">
    <div class="flex items-center gap-2 truncate">
      <span class="text-amber-400 shrink-0">${renderIcon('info', { size: 15, ariaHidden: true })}</span>
      <span class="font-medium truncate">${escapeHtml(msg)}</span>
    </div>
    <button
      type="button"
      data-action="header.dismissBroadcast"
      aria-label="Dismiss announcement"
      class="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] text-white shrink-0 cursor-pointer"
    >Dismiss</button>
  </div>`;
}

export function renderHeaderTools(options: HeaderToolsOptions): string {
  const unreadNotifs = notificationCenter.unreadCount;
  const currentLang = i18n.getCurrentLanguageMeta();

  return `<div class="flex items-center gap-2">
    ${renderDynamicStatusCapsule()}

    ${facetSwitcher.render()}

    ${pwaService.renderOfflineBadge()}

    <button
      type="button"
      id="btn-open-command-palette"
      data-action="command.open"
      aria-label="Search or run command (Ctrl+K)"
      title="Universal Command & Search Rail (Ctrl+K)"
      class="inline-flex items-center gap-2 min-h-[40px] px-3 py-1.5 rounded-xl bg-surface-raised/80 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition-all cursor-pointer"
    >
      ${renderIcon('search', { size: 15, ariaHidden: true })}
      <span class="hidden lg:inline text-slate-400">Search...</span>
      <kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-black/40 text-slate-300 rounded border border-white/10">⌘K</kbd>
    </button>

    <button
      type="button"
      id="header-notifications-btn"
      data-action="notifications.toggle"
      aria-label="Notifications${unreadNotifs > 0 ? ` (${unreadNotifs} unread)` : ''}"
      title="Notifications"
      class="relative inline-flex items-center justify-center w-10 h-10 min-h-[40px] rounded-xl bg-surface-raised/80 hover:bg-white/10 text-slate-200 border border-white/10 transition-all cursor-pointer"
    >
      ${renderIcon('bell', { size: 17, ariaHidden: true })}
      ${
        unreadNotifs > 0
          ? `<span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center shadow">${
              unreadNotifs > 99 ? '99+' : unreadNotifs
            }</span>`
          : ''
      }
    </button>

    <button
      type="button"
      id="header-theme-btn"
      data-action="theme.open"
      aria-label="Display & Theme Matrix"
      title="Display & Theme Matrix"
      class="inline-flex items-center justify-center w-10 h-10 min-h-[40px] rounded-xl bg-surface-raised/80 hover:bg-white/10 text-slate-200 border border-white/10 transition-all cursor-pointer"
    >
      ${renderIcon('sliders-horizontal', { size: 17, ariaHidden: true })}
    </button>

    <button
      type="button"
      id="header-lang-btn"
      data-action="lang.open"
      aria-label="Language (${escapeHtml(currentLang.name)})"
      title="Language: ${escapeHtml(currentLang.nativeName)}"
      class="hidden sm:inline-flex items-center gap-1 min-h-[40px] px-2.5 py-1.5 rounded-xl bg-surface-raised/80 hover:bg-white/10 text-xs font-mono text-slate-200 border border-white/10 transition-all cursor-pointer"
    >
      <span>${escapeHtml(currentLang.flag)}</span>
      <span class="uppercase">${escapeHtml(currentLang.code)}</span>
    </button>

    <div class="relative">
      <button
        type="button"
        id="btn-header-advanced-overflow"
        data-action="header.toggleOverflow"
        aria-expanded="${options.isAdvancedOverflowOpen ? 'true' : 'false'}"
        aria-label="More sovereign tools"
        title="More tools & diagnostics"
        class="inline-flex items-center justify-center w-10 h-10 min-h-[40px] rounded-xl bg-surface-raised/80 hover:bg-white/10 text-slate-200 border border-white/10 transition-all cursor-pointer"
      >
        ${renderIcon('more-horizontal', { size: 18, ariaHidden: true })}
      </button>
      ${
        options.isAdvancedOverflowOpen
          ? `<div id="header-advanced-overflow-menu" class="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0e121d]/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-3 z-50">
              ${options.renderAdvancedTools(true)}
            </div>`
          : ''
      }
    </div>
  </div>`;
}
