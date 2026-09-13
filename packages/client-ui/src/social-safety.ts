/**
 * UREfy — Social Safety Engine (social-safety.ts)
 * Manages user-level blocking, muting, and decentralized abuse reporting.
 *
 * Invariants:
 * 1. Blocking immediately suppresses content, comments, notifications, and dissolves mutual follow connections.
 * 2. Muting suppresses notifications and home feed appearances without breaking social graph connectivity.
 * 3. Reporting sends privacy-preserving reports to server-edge moderation queues.
 * 4. Zero Math.random() — only crypto.randomUUID() and CSPRNG.
 * 5. Full client-side offline persistence with server-edge synchronization.
 */

export interface SocialReportInput {
  targetType: 'post' | 'comment' | 'user' | 'community';
  targetId: string;
  reasonCategory: 'harassment' | 'hate_speech' | 'spam' | 'impersonation' | 'illegal_content' | 'misinformation' | 'other';
  details?: string;
  communityId?: string;
}

const STORAGE_KEYS = {
  BLOCKED_USERS: 'aetheris_social_blocked_users_v1',
  MUTED_USERS: 'aetheris_social_muted_users_v1',
} as const;

export class SocialSafetyEngine {
  private blockedUsers: Set<string> = new Set();
  private mutedUsers: Set<string> = new Set();
  private isInitialized = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      this.isInitialized = true;
      return;
    }

    try {
      const blockedRaw = localStorage.getItem(STORAGE_KEYS.BLOCKED_USERS);
      if (blockedRaw) {
        const arr = JSON.parse(blockedRaw);
        if (Array.isArray(arr)) {
          this.blockedUsers = new Set(arr.filter((x): x is string => typeof x === 'string'));
        }
      }

      const mutedRaw = localStorage.getItem(STORAGE_KEYS.MUTED_USERS);
      if (mutedRaw) {
        const arr = JSON.parse(mutedRaw);
        if (Array.isArray(arr)) {
          this.mutedUsers = new Set(arr.filter((x): x is string => typeof x === 'string'));
        }
      }
    } catch {
      // Gracefully recover on corrupt local storage
    }
    this.isInitialized = true;
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.BLOCKED_USERS, JSON.stringify(Array.from(this.blockedUsers)));
      localStorage.setItem(STORAGE_KEYS.MUTED_USERS, JSON.stringify(Array.from(this.mutedUsers)));
    } catch {
      // Storage quota or disabled storage
    }
  }

  private dispatchEvent(name: string, detail: unknown): void {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } else if (typeof globalThis !== 'undefined' && typeof (globalThis as any).dispatchEvent === 'function') {
      (globalThis as any).dispatchEvent(new CustomEvent(name, { detail }));
    }
  }

  public isBlocked(userId?: string | null): boolean {
    if (!userId) return false;
    return this.blockedUsers.has(userId);
  }

  public isMuted(userId?: string | null): boolean {
    if (!userId) return false;
    return this.mutedUsers.has(userId);
  }

  public getBlockedUsers(): string[] {
    return Array.from(this.blockedUsers);
  }

  public getMutedUsers(): string[] {
    return Array.from(this.mutedUsers);
  }

  public async blockUser(userId: string): Promise<boolean> {
    if (!userId || typeof userId !== 'string') return false;
    this.blockedUsers.add(userId);
    this.saveToStorage();
    this.dispatchEvent('aetheris:social:blocked', { userId });

    // Sync to backend edge API
    try {
      await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'block', targetUserId: userId }),
      });
    } catch {
      // Offline fallback: locally blocked immediately
    }

    return true;
  }

  public async unblockUser(userId: string): Promise<boolean> {
    if (!userId || typeof userId !== 'string') return false;
    const removed = this.blockedUsers.delete(userId);
    if (removed) {
      this.saveToStorage();
      this.dispatchEvent('aetheris:social:unblocked', { userId });

      try {
        await fetch('/api/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unblock', targetUserId: userId }),
        });
      } catch {
        // Offline fallback
      }
    }
    return removed;
  }

  public async muteUser(userId: string): Promise<boolean> {
    if (!userId || typeof userId !== 'string') return false;
    this.mutedUsers.add(userId);
    this.saveToStorage();
    this.dispatchEvent('aetheris:social:muted', { userId });

    try {
      await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mute', targetUserId: userId }),
      });
    } catch {
      // Offline fallback
    }

    return true;
  }

  public async unmuteUser(userId: string): Promise<boolean> {
    if (!userId || typeof userId !== 'string') return false;
    const removed = this.mutedUsers.delete(userId);
    if (removed) {
      this.saveToStorage();
      this.dispatchEvent('aetheris:social:unmuted', { userId });

      try {
        await fetch('/api/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unmute', targetUserId: userId }),
        });
      } catch {
        // Offline fallback
      }
    }
    return removed;
  }

  public async reportContent(report: SocialReportInput): Promise<boolean> {
    if (!report || !report.targetId || !report.reasonCategory) return false;

    try {
      const resp = await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report',
          targetType: report.targetType,
          targetId: report.targetId,
          reasonCategory: report.reasonCategory,
          details: report.details || '',
          communityId: report.communityId,
        }),
      });
      return resp.ok;
    } catch {
      // Non-blocking report attempt
      return false;
    }
  }

  public async syncSafetyLists(): Promise<void> {
    try {
      const resp = await fetch('/api/blocks');
      if (resp.ok) {
        const data = await resp.json() as { blockedUsers?: string[]; mutedUsers?: string[] };
        if (Array.isArray(data.blockedUsers)) {
          for (const u of data.blockedUsers) this.blockedUsers.add(u);
        }
        if (Array.isArray(data.mutedUsers)) {
          for (const u of data.mutedUsers) this.mutedUsers.add(u);
        }
        this.saveToStorage();
      }
    } catch {
      // Keep existing local state if sync fails
    }
  }

  public clearAll(): void {
    this.blockedUsers.clear();
    this.mutedUsers.clear();
    this.saveToStorage();
  }
}

export const socialSafety = new SocialSafetyEngine();
