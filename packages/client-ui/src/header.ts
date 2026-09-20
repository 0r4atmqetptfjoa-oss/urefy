/**
 * Calm, consumer-first application header.
 * Protocol and diagnostics controls are deliberately kept under More.
 */

import { clientStore } from './client-state.js';
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

export function renderHeaderPrimaryNav(): string {
  const items = [
    { mode: 'pulse', label: 'Home', icon: 'feed' as const },
    { mode: 'explore', label: 'Explore', icon: 'explore' as const },
    { mode: 'communities', label: 'Communities', icon: 'users' as const },
    { mode: 'relays', label: 'Messages', icon: 'messages' as const },
    { mode: 'vault', label: 'Vault', icon: 'vault' as const },
    { mode: 'profile', label: 'Profile', icon: 'profile' as const },
  ];

  return items.map(item => `
    <button type="button" data-nav-mode="${item.mode}" class="btn-nav-mode header-nav-item" aria-current="false">
      ${renderIcon(item.icon, { size: 17 })}
      <span>${item.label}</span>
    </button>
  `).join('');
}

export function renderBroadcastBanner(): string {
  const message = clientStore.broadcastAnnouncement?.trim();
  if (!message) return '';

  let dismissed: string | null = null;
  try { dismissed = sessionStorage.getItem('aetheris_dismissed_broadcast'); } catch {}
  if (message === dismissed) return '';

  return `
    <div id="network-announcement-banner" class="consumer-announcement" role="status">
      <span class="consumer-announcement__label">Update</span>
      <span class="consumer-announcement__message">${escapeHtml(message)}</span>
      <button type="button" id="btn-dismiss-broadcast" data-action="dismiss-broadcast" aria-label="Dismiss update">
        ${renderIcon('close', { size: 16 })}
      </button>
    </div>
  `;
}

export function renderHeaderTools(options: HeaderToolsOptions): string {
  return `
    <button type="button" id="btn-pwa-install" data-action="pwa-install" class="${pwaService.isInstallable && !pwaService.isInstalled ? 'hidden sm:inline-flex' : 'hidden'} header-install-button" title="${i18n.t('common.install', undefined, 'Install UREfy')}">
      ${renderIcon('download', { size: 17 })}
      <span>${i18n.t('common.install', undefined, 'Install')}</span>
    </button>

    <button type="button" data-action="open-composer" class="header-create-button hidden sm:inline-flex" aria-label="Create a post">
      ${renderIcon('plus', { size: 17, strokeWidth: 2.4 })}
      <span>Post</span>
    </button>

    <div class="relative lg:hidden">
      <button type="button" id="btn-open-advanced-overflow" data-action="toggle-advanced-overflow" class="header-icon-button" title="More" aria-label="Open more options" aria-expanded="${options.isAdvancedOverflowOpen}">
        ${renderIcon('more', { size: 20 })}
      </button>
      ${options.isAdvancedOverflowOpen ? `
        <div id="advanced-overflow-backdrop" class="fixed inset-0 z-40" data-action="close-advanced-overflow"></div>
        <div id="advanced-overflow-menu" class="consumer-more-menu absolute right-0 top-full mt-2 w-80 p-3 z-50 select-none">
          <div class="consumer-more-menu__header">
            <div><strong>More</strong><span>Saved items, settings and advanced tools</span></div>
            <button type="button" id="btn-toggle-ui-mode" data-action="toggle-ui-mode" class="consumer-mode-button" title="Show or hide advanced tools">
              ${clientStore.isSimpleMode() ? 'Advanced' : 'Simple view'}
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">${options.renderAdvancedTools(true)}</div>
        </div>
      ` : ''}
    </div>

    <div class="relative flex items-center">
      <button type="button" id="btn-toggle-notifs" data-action="toggle-notifs" class="header-icon-button relative" title="Notifications" aria-label="Notifications${notificationCenter.unreadCount > 0 ? `, ${notificationCenter.unreadCount} unread` : ''}">
        ${renderIcon('bell', { size: 20 })}
        ${notificationCenter.unreadCount > 0 ? '<span class="notification-dot" aria-hidden="true"></span>' : ''}
      </button>
    </div>
  `;
}
