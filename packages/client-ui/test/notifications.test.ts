import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe('NotificationCenter', () => {
  let notificationCenter: any;

  beforeAll(async () => {
    (globalThis as any).localStorage = new LocalStorageMock();
    const mod = await import('../src/notifications.js');
    notificationCenter = mod.notificationCenter;
  });

  beforeEach(() => {
    globalThis.localStorage.clear();
    notificationCenter.clearAll();
  });

  it('should allow adding a notification and computing unreadCount', () => {
    const item = notificationCenter.addNotification({
      type: 'reply',
      title: 'New Response',
      body: 'Someone replied to your post',
      createdAt: Date.now(),
    });

    expect(item.id).toBeDefined();
    expect(item.isRead).toBe(false);
    expect(notificationCenter.notifications.length).toBe(1);
    expect(notificationCenter.unreadCount).toBe(1);
  });

  it('should mark a notification as read', () => {
    const item = notificationCenter.addNotification({
      type: 'upvote',
      title: 'Merit Upvote',
      body: 'Your post gained merit',
      createdAt: Date.now(),
    });

    expect(notificationCenter.unreadCount).toBe(1);
    notificationCenter.markRead(item.id);
    expect(notificationCenter.unreadCount).toBe(0);
  });

  it('should mark all notifications as read', () => {
    notificationCenter.addNotification({
      type: 'reply',
      title: 'Reply 1',
      body: 'Content 1',
      createdAt: Date.now(),
    });
    notificationCenter.addNotification({
      type: 'reply',
      title: 'Reply 2',
      body: 'Content 2',
      createdAt: Date.now(),
    });

    expect(notificationCenter.unreadCount).toBe(2);
    notificationCenter.markAllRead();
    expect(notificationCenter.unreadCount).toBe(0);
  });

  it('should clear all notifications', () => {
    notificationCenter.addNotification({
      type: 'award',
      title: 'Signal Boost',
      body: 'Received award',
      createdAt: Date.now(),
    });

    expect(notificationCenter.notifications.length).toBe(1);
    notificationCenter.clearAll();
    expect(notificationCenter.notifications.length).toBe(0);
    expect(notificationCenter.unreadCount).toBe(0);
  });

  it('should persist notifications to localStorage', () => {
    notificationCenter.addNotification({
      type: 'download_complete',
      title: 'Vault Sync',
      body: 'Synced to storage',
      createdAt: Date.now(),
    });

    const stored = globalThis.localStorage.getItem('urefy_notifications_v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].title).toBe('Vault Sync');
  });
});
