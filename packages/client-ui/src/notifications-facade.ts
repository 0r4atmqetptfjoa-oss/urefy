/**
 * @file notifications-facade.ts
 * @package @aetheris/client-ui
 * @description Lightweight Notification Center Facade for startup.
 * Calculates unread count from localStorage instantly without loading
 * heavy push handlers, audio chimes, or DOM templates into the bootstrap bundle.
 */

import { clientStore } from './client-state.js';
import type { NotificationItem } from './notifications.js';

let fullNotificationsModule: typeof import('./notifications.js') | null = null;
let loadPromise: Promise<typeof import('./notifications.js')> | null = null;

export function loadNotificationCenter(): Promise<typeof import('./notifications.js')> {
  return loadPromise ??= import('./notifications.js').then(m => {
    fullNotificationsModule = m;
    if (typeof window !== 'undefined') (window as any).notificationCenter = m.notificationCenter;
    return m;
  }).catch(err => {
    loadPromise = null;
    throw err;
  });
}

export class NotificationCenterFacade {
  private readonly STORAGE_KEY = 'urefy_notifications_v1';

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).notificationCenter = this;
    }
  }

  get unreadCount(): number {
    if (fullNotificationsModule) {
      return fullNotificationsModule.notificationCenter.unreadCount;
    }
    if (typeof localStorage === 'undefined') return 0;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((n: any) => !n.isRead).length;
      }
    } catch {}
    return 0;
  }

  get notifications(): NotificationItem[] {
    if (fullNotificationsModule) {
      return fullNotificationsModule.notificationCenter.notifications;
    }
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public async syncFromApi(userId: string): Promise<void> {
    const mod = await loadNotificationCenter();
    return mod.notificationCenter.syncFromApi(userId);
  }

  public renderNotificationPanel(): string {
    if (fullNotificationsModule) {
      return fullNotificationsModule.notificationCenter.renderNotificationPanel();
    }
    void loadNotificationCenter().then(() => clientStore.notify()).catch(() => {});
    return `
      <div id="notifications-dropdown" class="fixed right-4 top-16 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface-raised border border-white/10 shadow-2xl p-6 text-center text-slate-400 font-sans text-xs animate-in fade-in duration-150">
        <div class="flex items-center justify-center space-x-2">
          <span class="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
          <span>Loading notifications...</span>
        </div>
      </div>
    `;
  }
}

export const notificationCenter = new NotificationCenterFacade();
