// ============================================================
// notifications.ts — UREfy Notification Center
// Self-contained, no external dependencies.
// ============================================================

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { sovereignWebPush } from './web-push.js';
import { t } from './i18n.js';
import { socialSafety } from './social-safety.js';

export interface NotificationItem {
  id: string;
  type: 'reply' | 'upvote' | 'mention' | 'award' | 'slashing' | 'download_complete' | 'follow' | 'reply_post' | 'reply_comment' | 'reaction' | 'mod_action' | 'message_request' | 'community_activity';
  title: string;
  body: string;
  postId?: string;
  fromFingerprint?: string;
  createdAt: number; // Unix ms
  isRead: boolean;
  count?: number;
}

// ─── Helpers ────────────────────────────────────────────────

function generateId(): string {
  return `notif_${Date.now().toString(36)}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type NotificationIconMap = Record<NotificationItem['type'], string>;

const ICONS: NotificationIconMap = {
  reply:              '🔔',
  reply_post:         '💬',
  reply_comment:      '↩️',
  upvote:             '▲',
  reaction:           '❤️',
  mention:            '@',
  follow:             '👤',
  award:              '🏅',
  slashing:           '🚨',
  download_complete:  '✅',
  mod_action:         '🛡️',
  message_request:    '✉️',
  community_activity: '🏛️',
};

const ICON_COLOR: Record<NotificationItem['type'], string> = {
  reply:              'text-cyphr',
  reply_post:         'text-cyphr',
  reply_comment:      'text-cyphr',
  upvote:             'text-signal',
  reaction:           'text-rose-400',
  mention:            'text-aether',
  follow:             'text-sky-400',
  award:              'text-amber',
  slashing:           'text-crimson',
  download_complete:  'text-signal',
  mod_action:         'text-indigo-400',
  message_request:    'text-emerald-400',
  community_activity: 'text-purple-400',
};

// ─── NotificationCenter Class ────────────────────────────────

class NotificationCenter {
  private _notifications: NotificationItem[] = [];
  private static readonly MAX_ITEMS = 50;

  constructor() {
    this._attachGlobalHandlers();
  }

  // ── Computed ──────────────────────────────────────────────

  get unreadCount(): number {
    return this._notifications.filter(n => !n.isRead && (!n.fromFingerprint || !socialSafety.isBlocked(n.fromFingerprint))).length;
  }

  get notifications(): NotificationItem[] {
    return this._notifications.filter(n => !n.fromFingerprint || !socialSafety.isBlocked(n.fromFingerprint));
  }

  // ── Public API ────────────────────────────────────────────

  addNotification(item: Omit<NotificationItem, 'id' | 'isRead'>): NotificationItem {
    if (item.fromFingerprint && socialSafety.isBlocked(item.fromFingerprint)) {
      // Silently suppress notifications from blocked users
      return {
        ...item,
        id: generateId(),
        isRead: true,
      };
    }

    const newItem: NotificationItem = {
      ...item,
      id: generateId(),
      isRead: false,
    };

    this._notifications = [newItem, ...this._notifications].slice(0, NotificationCenter.MAX_ITEMS);

    if (item.type === 'mention') {
      sovereignWebPush.triggerMentionNotification(item.title, item.body, item.postId).catch(() => {});
    } else if (item.type === 'slashing') {
      sovereignWebPush.triggerEmergencyBroadcast(item.body).catch(() => {});
    }

    this._dispatchEvent('aetheris:notification:added', { notification: newItem });
    this._refreshUI();

    return newItem;
  }

  async syncFromApi(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const resp = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
      if (resp.ok) {
        const data = await resp.json() as { notifications?: Array<{
          id: string;
          type: string;
          actor_name?: string;
          preview_text?: string;
          target_id?: string;
          actor_id?: string;
          created_at?: number;
          is_read?: number | boolean;
        }> };
        if (Array.isArray(data.notifications)) {
          for (const item of data.notifications) {
            if (this._notifications.some(n => n.id === item.id)) continue;
            if (item.actor_id && socialSafety.isBlocked(item.actor_id)) continue;
            this._notifications.unshift({
              id: item.id,
              type: item.type as NotificationItem['type'],
              title: item.actor_name || 'Notification',
              body: item.preview_text || item.type,
              postId: item.target_id,
              fromFingerprint: item.actor_id,
              createdAt: item.created_at || Date.now(),
              isRead: Boolean(item.is_read),
            });
          }
          this._notifications = this._notifications.slice(0, NotificationCenter.MAX_ITEMS);
          this._refreshUI();
        }
      }
    } catch {
      // Offline fallback: keep memory notifications
    }
  }

  markRead(id: string): void {
    const notif = this._notifications.find(n => n.id === id);
    if (notif && !notif.isRead) {
      notif.isRead = true;
      this._dispatchEvent('aetheris:notification:read', { id });
      this._refreshUI();
    }
  }

  markAllRead(): void {
    let changed = false;
    for (const n of this._notifications) {
      if (!n.isRead) {
        n.isRead = true;
        changed = true;
      }
    }
    if (changed) {
      this._dispatchEvent('aetheris:notification:all_read', {});
      this._refreshUI();
    }
  }

  clearAll(): void {
    this._notifications = [];
    this._dispatchEvent('aetheris:notification:cleared', {});
    this._refreshUI();
  }

  public activeFilter: 'all' | 'unread' | 'mentions' | 'awards' = 'all';

  setFilter(filter: 'all' | 'unread' | 'mentions' | 'awards'): void {
    this.activeFilter = filter;
    this._refreshUI();
  }

  getFiltered(): NotificationItem[] {
    let list = this._notifications.filter(n => !n.fromFingerprint || !socialSafety.isBlocked(n.fromFingerprint));
    if (this.activeFilter === 'unread') {
      list = list.filter(n => !n.isRead);
    } else if (this.activeFilter === 'mentions') {
      list = list.filter(n => n.type === 'mention' || n.type === 'reply' || n.type === 'reply_post' || n.type === 'reply_comment');
    } else if (this.activeFilter === 'awards') {
      list = list.filter(n => n.type === 'award');
    }
    return [...list].slice(0, NotificationCenter.MAX_ITEMS);
  }

  getUnread(): NotificationItem[] {
    return this._notifications.filter(n => !n.isRead);
  }

  getAll(): NotificationItem[] {
    return [...this._notifications].slice(0, NotificationCenter.MAX_ITEMS);
  }

  // ── Render: Bell Button ───────────────────────────────────

  renderBellButton(): string {
    const count = this.unreadCount;
    const badge =
      count > 0
        ? `<span class="absolute -top-1 -right-1 w-4 h-4 bg-crimson text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none pointer-events-none">${count > 99 ? '99+' : count}</span>`
        : '';

    return `<button
  id="btn-notifications"
  aria-label="Notifications${count > 0 ? ` (${count} unread)` : ''}"
  class="relative flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-white hover:bg-surface-overlay transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-white/20" data-action="call-global" data-raw-click="window.__aetherisNotifCenter && window.__aetherisNotifCenter.togglePanel()"
>
  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
    <path stroke-linecap="round" stroke-linejoin="round"
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
  ${badge}
</button>`.trim();
  }

  // ── Render: Notification Panel ────────────────────────────

  renderNotificationPanel(): string {
    const all = this.getFiltered();
    const listHTML = all.length === 0
      ? this._renderEmptyState()
      : all.map(n => this._renderNotificationRow(n)).join('');

    const markAllDisabled = this.unreadCount === 0 ? 'opacity-40 pointer-events-none' : '';

    return `
      <div id="notification-modal-wrapper" class="fixed inset-0 z-[9999] pointer-events-none flex justify-center sm:justify-end">
        <!-- BACKDROP -->
        <div id="notification-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer pointer-events-auto" data-action="close-notifs"></div>

        <!-- NOTIFICATION PANEL -->
        <div
          id="notification-panel"
          role="dialog"
          aria-label="Notifications panel"
          class="relative z-[10000] mt-14 mx-3 sm:mx-0 sm:mr-6 w-full max-w-[94vw] sm:w-96 max-h-[520px] flex flex-col rounded-2xl border border-white/10 bg-surface-overlay/95 backdrop-blur-2xl shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-150 overflow-hidden pointer-events-auto"
          data-action="stop-propagation"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3.5 border-b border-white/10 flex-shrink-0 bg-surface-raised/60">
            <div class="flex items-center space-x-2">
              <span class="text-base">🔔</span>
              <h3 class="text-sm font-bold text-white tracking-wide">${t('notifications.title', undefined, 'Notifications')}</h3>
              ${this.unreadCount > 0 ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">${this.unreadCount} new</span>` : ''}
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="text-xs text-indigo-400 hover:text-white transition-colors cursor-pointer ${markAllDisabled}" data-action="notif-mark-all-read"
              >
                ${t('notifications.markAllRead', undefined, 'Mark read')}
              </button>
              <span class="text-white/20 text-xs">|</span>
              <button
                type="button"
                class="text-xs text-slate-500 hover:text-rose-400 transition-colors cursor-pointer" data-action="notif-clear-all"
              >
                ${t('notifications.clearAll', undefined, 'Clear')}
              </button>
              <span class="text-white/20 text-xs">|</span>
              <button
                type="button"
                class="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer p-1" data-action="close-notifs"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Filter Pills -->
          <div class="flex items-center space-x-1.5 px-3 py-2 border-b border-white/10 bg-surface-raised/40 text-xs flex-shrink-0">
            <button
              type="button"
              class="notif-filter-btn px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${this.activeFilter === 'all' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-400 hover:text-white'}" data-action="set-notif-filter" data-filter="all"
            >
              ${t('notifications.filterAll', undefined, 'All')} (${this._notifications.length})
            </button>
            <button
              type="button"
              class="notif-filter-btn px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${this.activeFilter === 'unread' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-400 hover:text-white'}" data-action="set-notif-filter" data-filter="unread"
            >
              ${t('notifications.filterUnread', undefined, 'Unread')} (${this.unreadCount})
            </button>
            <button
              type="button"
              class="notif-filter-btn px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${this.activeFilter === 'mentions' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-400 hover:text-white'}" data-action="set-notif-filter" data-filter="mentions"
            >
              ${t('notifications.filterMentions', undefined, 'Mentions')}
            </button>
            <button
              type="button"
              class="notif-filter-btn px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${this.activeFilter === 'awards' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-400 hover:text-white'}" data-action="set-notif-filter" data-filter="awards"
            >
              ${t('notifications.filterAwards', undefined, 'Awards')}
            </button>
          </div>

          <!-- Notification List -->
          <div class="overflow-y-auto flex-1 divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            ${listHTML}
          </div>
        </div>
      </div>
    `.trim();
  }

  // ── Toggle panel ──────────────────────────────────────────

  togglePanel(): void {
    if (typeof window !== 'undefined' && (window as any).__aetherisToggleNotifs) {
      (window as any).__aetherisToggleNotifs();
      return;
    }
  }

  // ── Private Helpers ───────────────────────────────────────

  private _renderNotificationRow(n: NotificationItem): string {
    const icon = ICONS[n.type];
    const iconColor = ICON_COLOR[n.type];
    const unreadDot = !n.isRead
      ? `<span class="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5 animate-pulse"></span>`
      : `<span class="w-2 h-2 flex-shrink-0"></span>`;
    const rowBg = n.isRead ? 'bg-transparent' : 'bg-surface-raised/40';
    const timestamp = relativeTime(n.createdAt);
    const typeLabel = n.type.replace('_', ' ');

    return `<div
  class="${rowBg} px-4 py-3 flex items-start gap-3 hover:bg-surface-highlight cursor-pointer transition-colors group select-none"
  data-notif-id="${n.id}" data-post-id="${n.postId || ''}" data-action="notif-open-item"
  role="listitem"
  aria-label="${this._escapeHtml(n.title)}"
>
  <span class="w-8 h-8 rounded-xl bg-surface-raised flex items-center justify-center text-sm flex-shrink-0 ${iconColor} font-mono select-none" title="${typeLabel}">
    ${icon}
  </span>
  <div class="flex-1 min-w-0">
    <p class="text-xs font-semibold text-slate-100 group-hover:text-white truncate leading-snug">${this._escapeHtml(n.title)}</p>
    <p class="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">${this._escapeHtml(n.body)}</p>
    ${n.fromFingerprint ? `<p class="text-[10px] text-slate-500 font-mono mt-1 truncate">${this._escapeHtml(n.fromFingerprint)}</p>` : ''}
    <p class="text-[10px] text-slate-500 mt-1 font-mono">${timestamp}</p>
  </div>
  ${unreadDot}
</div>`.trim();
  }

  private _renderEmptyState(): string {
    return `<div class="flex flex-col items-center justify-center py-14 gap-3 text-center select-none">
  <span class="text-3xl opacity-30">🔔</span>
  <p class="text-sm font-medium text-slate-500">${t('notifications.noNotifications', undefined, 'No notifications yet')}</p>
  <p class="text-xs text-slate-600 max-w-[180px] leading-relaxed">${t('emptyState.notificationsDesc', undefined, 'Activity on your posts and mentions will appear here.')}</p>
</div>`.trim();
  }

  private _escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private _dispatchEvent(name: string, detail: Record<string, unknown>): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(name, { detail, bubbles: false }));
    }
  }

  private _refreshUI(): void {
    if (typeof window !== 'undefined' && (window as any).clientStore) {
      (window as any).clientStore.notify();
    }
  }

  private _attachGlobalHandlers(): void {
    if (typeof window !== 'undefined') {
      window.__aetherisNotifCenter = this;
    }
  }

  private _seedDemoNotifications(): void {
    const now = Date.now();
    const minute = 60_000;
    const hour = 3_600_000;

    const seeds: Omit<NotificationItem, 'id' | 'isRead'>[] = [
      {
        type: 'reply',
        title: 'New reply on your post',
        body: 'anon_9f3a replied: "This is exactly what I\'ve been researching. Great breakdown!"',
        postId: 'post_demo_001',
        fromFingerprint: 'anon_9f3a::0xAB12',
        createdAt: now - 3 * minute,
      },
      {
        type: 'upvote',
        title: 'Your post gained merit',
        body: 'Your post "ZK Identity Layer: Why It Matters" received 24 new upvotes.',
        postId: 'post_demo_002',
        fromFingerprint: undefined,
        createdAt: now - 41 * minute,
      },
      {
        type: 'award',
        title: 'Award received 🏅',
        body: 'You received a "Signal Boost" award from vault_entity_7c4b for your analysis post.',
        postId: 'post_demo_003',
        fromFingerprint: 'vault_entity_7c4b::0xCC99',
        createdAt: now - 3 * hour,
      },
      {
        type: 'slashing',
        title: 'Slashing event detected',
        body: 'A validator in your monitored relay set was slashed. Review activity on pulse board.',
        postId: undefined,
        fromFingerprint: 'relay_monitor::0xDEAD',
        createdAt: now - 8 * hour,
      },
    ];

    for (const seed of seeds) {
      this._notifications.push({
        ...seed,
        id: generateId(),
        isRead: false,
      });
    }
  }
}

// ─── Singleton Export ────────────────────────────────────────

export const notificationCenter = new NotificationCenter();

serviceRegistry.registerInstance(SERVICES.Notifications, notificationCenter);
