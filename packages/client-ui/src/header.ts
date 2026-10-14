/**
 * @file header.ts
 * @package @aetheris/client-ui
 * @description 2027 Swiss Sovereign Studio Header.
 * Replaces noisy telemetry capsules and duplicate search bars with a single
 * unified Command Bar trigger (Ctrl+K), quick theme switcher, and clean profile pill.
 */

import { clientStore } from './client-state.js';
import { profileStore } from './profile/profile-store.js';
import { themeEngine } from './themes.js';
import { renderIcon } from './ui/icons.js';
import { notificationCenter } from './notifications-facade.js';
import { pwaService } from './pwa-service.js';
import { PRIMARY_NAV_ITEMS, renderNavIcon, getLocalizedNavLabel } from './nav-config.js';
import { sovereignRouter } from './router.js';

function escapeHtml(str: string): string {
  return String(str ?? '')
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

export function renderStudioHeader(): string {
  const myFp = clientStore?.keypair?.fingerprint || 'genesis-core';
  const myProfile = profileStore.getProfile(myFp);
  const displayName = myProfile.name && myProfile.name !== 'Profile not set up' ? myProfile.name : 'My Profile';
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const activeTheme = themeEngine.getTheme();
  const isAdvancedOrTech = clientStore?.uiMode === 'advanced' || clientStore?.uiMode === 'technical';

  return `
    <header
      id="urefy-studio-header"
      class="sticky top-0 z-30 h-14 w-full bg-surface-base/90 backdrop-blur-xl border-b border-subtle px-4 lg:px-6 flex items-center justify-between gap-4 select-none"
    >
      <!-- Left: Brand Identity -->
      <div class="flex items-center gap-3 shrink-0">
        <button
          type="button"
          id="btn-mobile-menu"
          data-action="toggle-mobile-drawer"
          class="lg:hidden w-9 h-9 rounded-lg bg-surface-raised border border-subtle flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          aria-label="Open navigation menu"
        >
          ${renderIcon('menu', { size: 16, ariaHidden: true })}
        </button>

        <a
          href="#feed"
          data-action="nav-tab"
          data-tab="feed"
          class="flex items-center gap-2.5 group focus:outline-none"
        >
          <div class="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold text-sm shadow-sm group-hover:border-amber-400/60 transition-colors">
            U
          </div>
          <div class="flex items-baseline gap-1.5">
            <span class="font-bold text-base tracking-tight text-white">UREfy</span>
            <span class="hidden sm:inline-block text-[10px] font-mono uppercase tracking-widest text-slate-400 px-1.5 py-0.5 rounded bg-surface-raised border border-subtle">Studio</span>
          </div>
        </a>
      </div>

      <!-- Center: Single Unified Command & Search Trigger (No duplicate search bar) -->
      <div class="flex-1 max-w-xl mx-auto">
        <button
          type="button"
          id="btn-header-command-rail"
          data-action="open-command-rail"
          class="w-full h-9 px-3.5 rounded-xl bg-surface-raised/80 hover:bg-surface-overlay border border-subtle hover:border-strong flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer group"
          title="Search communities, posts, members, or run commands (Ctrl+K)"
        >
          <span class="flex items-center gap-2.5 truncate">
            ${renderIcon('search', { size: 14, ariaHidden: true })}
            <span class="truncate">Search communities, discussions, @members...</span>
          </span>
          <kbd class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-surface-base rounded border border-subtle">
            Ctrl K
          </kbd>
        </button>
      </div>

      <!-- Right: Clean Studio Actions & Single Status Pill -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Progressive Disclosure Telemetry Pill -->
        <button
          type="button"
          data-action="open-network-observatory"
          class="hidden md:inline-flex items-center gap-2 h-8 px-2.5 rounded-lg bg-surface-raised/70 hover:bg-surface-overlay border border-subtle text-[11px] text-slate-300 transition-colors cursor-pointer"
          title="End-to-End Encrypted Relay Status"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span class="font-medium">${isAdvancedOrTech ? 'ML-KEM-768 · E2EE' : 'Encrypted'}</span>
        </button>

        <!-- Theme Studio Cycle Button -->
        <button
          type="button"
          id="btn-header-cycle-theme"
          data-action="cycle-studio-theme"
          class="h-8 px-2.5 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-subtle flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Theme: ${escapeHtml(activeTheme.name)} (Click to switch)"
          aria-label="Switch interface theme"
        >
          ${renderIcon(activeTheme.mode === 'light' ? 'sun' : 'moon', { size: 14, ariaHidden: true })}
          <span class="hidden xl:inline text-[11px] font-medium">${escapeHtml(activeTheme.name.split(' ')[0])}</span>
        </button>

        <!-- Notifications Button -->
        <button
          type="button"
          id="btn-header-notifications"
          data-action="open-notifications"
          class="relative w-8 h-8 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-subtle flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Notifications"
          aria-label="Notifications"
        >
          ${renderIcon('bell', { size: 15, ariaHidden: true })}
        </button>

        <!-- Clean Profile Pill -->
        <button
          type="button"
          id="btn-header-profile"
          data-action="nav-tab"
          data-tab="profile"
          class="h-8 pl-1.5 pr-2.5 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-subtle hover:border-strong flex items-center gap-2 transition-all cursor-pointer"
          title="Open Profile & Settings"
        >
          <span class="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold flex items-center justify-center">
            ${escapeHtml(initials || 'U')}
          </span>
          <span class="hidden sm:inline text-xs font-medium text-slate-200 max-w-[110px] truncate">
            ${escapeHtml(displayName)}
          </span>
        </button>
      </div>
    </header>
  `;
}

export function renderDynamicStatusCapsule(): string {
  const isOnline = clientStore.isConnected;
  return `<button
    type="button"
    id="header-dynamic-capsule"
    data-action="modal.open"
    data-feature="transparency"
    title="Encrypted Mesh Relay Status"
    aria-label="Live cryptographic protocol status"
    class="hidden xl:inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-raised border border-subtle text-[11px] font-mono text-slate-300 cursor-pointer"
  >
    <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}"></span>
    <span>E2EE Sovereign</span>
  </button>`;
}

export function renderHeaderPrimaryNav(): string {
  const currentTab = (sovereignRouter as any).getCurrentTab ? (sovereignRouter as any).getCurrentTab() : sovereignRouter.route;
  return `<nav class="flex items-center gap-1" aria-label="Desktop primary navigation">
    ${PRIMARY_NAV_ITEMS.map((item) => {
      const isActive = currentTab === item.id;
      const label = getLocalizedNavLabel(item);
      return `
        <button
          type="button"
          id="header-nav-${escapeHtml(item.id)}"
          data-testid="${escapeHtml(item.testId)}"
          data-nav-id="${escapeHtml(item.id)}"
          data-action="nav.primary"
          aria-current="${isActive ? 'page' : 'false'}"
          class="inline-flex items-center gap-2 px-3.5 py-1.5 min-h-[38px] rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            isActive
              ? 'bg-amber-500/15 text-amber-300 border border-amber-400/35 shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
          }"
        >
          ${renderNavIcon(item, { isActive, size: 16 })}
          <span>${escapeHtml(label)}</span>
        </button>`;
    }).join('')}
  </nav>`;
}

export function renderBroadcastBanner(): string {
  const msg = (clientStore as any).serverBroadcastMessage;
  if (!msg || (clientStore as any).broadcastDismissed) return '';

  return `<div id="system-broadcast-banner" role="region" aria-label="System broadcast notice" class="w-full bg-gradient-to-r from-amber-500/15 via-sky-500/15 to-amber-500/15 border-b border-amber-400/30 px-4 py-2 text-xs text-amber-200 flex items-center justify-between gap-3 backdrop-blur-md">
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
  const activeTheme = themeEngine.getTheme();

  return `<div class="flex items-center gap-2">
    ${renderDynamicStatusCapsule()}
    ${pwaService.renderOfflineBadge()}

    <button
      type="button"
      id="header-theme-btn"
      data-action="cycle-studio-theme"
      aria-label="Switch interface theme"
      title="Theme: ${escapeHtml(activeTheme.name)} (Click to switch)"
      class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-subtle transition-all cursor-pointer"
    >
      ${renderIcon(activeTheme.mode === 'light' ? 'sun' : 'moon', { size: 16, ariaHidden: true })}
    </button>

    <button
      type="button"
      id="header-notifications-btn"
      data-action="notifications.toggle"
      aria-label="Notifications${unreadNotifs > 0 ? ` (${unreadNotifs} unread)` : ''}"
      title="Notifications"
      class="relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 border border-subtle transition-all cursor-pointer"
    >
      ${renderIcon('bell', { size: 16, ariaHidden: true })}
      ${
        unreadNotifs > 0
          ? `<span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center shadow">${
              unreadNotifs > 99 ? '99+' : unreadNotifs
            }</span>`
          : ''
      }
    </button>
  </div>`;
}
