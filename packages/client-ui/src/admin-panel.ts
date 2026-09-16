import './window-augmentation.js';
import { renderAdminOverview, type AdminOverview } from './admin-overview.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { sovereignDialog } from './dialog-modal.js';
import { adminAuth } from './admin-auth.js';
import { gossipViz } from './gossip-viz.js';
import { cveMonitor } from './cve-monitor.js';
import { networkObservatory } from './network-observatory.js';
import { wotGraphViz } from './network-wot-graph.js';
import { toastManager } from './toast.js';
import { fetchAndRenderR2Quota } from './admin.js';

export type AdminTab = 'dashboard' | 'users' | 'channels' | 'waf' | 'config' | 'moderation' | 'sql' | 'r2' | 'gossip' | 'cve' | 'observatory' | 'wot' | 'dsa';

export interface AdminUser {
  fingerprint: string;
  role: 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER';
  status: 'online' | 'idle' | 'dnd' | 'offline';
  isZKVerified: boolean;
  isQuarantined: boolean;
  isShadowbanned?: boolean;
  notes?: string;
  joinedAt: number;
  messagesCount: number;
  postsCount: number;
}

export interface AdminChannel {
  id: string;
  name: string;
  space: 'relays' | 'vault' | 'pulse';
  isEncrypted: boolean;
  isArchived: boolean;
  membersCount: number | null;
  messagesCount: number;
  createdAt: number;
}

export interface AdminBannedIP {
  ip: string;
  reason: string;
  bannedAt: number;
  expiresAt: number;
}

export interface AdminLogEntry {
  id: string;
  action: string;
  targetId: string;
  adminFingerprint: string;
  timestamp: number;
}

export interface OperationalTelemetry {
  totalUsers: number | null;
  onlineUsers: number | null;
  pageViews24h: number | null;
  egressGB24h: number | null;
  attacksBlocked: number | null;
  avgEdgeRttMs: number | null;
  liveThroughputReqSec: number | null;
}

export type IncidentSeverity = 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO';

export interface AdminIncident {
  id: string;
  timestamp: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  target?: string;
  sourceIp?: string;
  status: 'active' | 'mitigated' | 'resolved';
}

export interface ModerationQueueItem {
  id: string;
  reportType: 'Spam' | 'Harassment' | 'DSA Notice' | 'Impersonation';
  targetType: 'post' | 'comment' | 'user' | 'media';
  targetId: string;
  reportedBy: string;
  reason: string;
  timestamp: number;
  status: 'pending' | 'actioned' | 'dismissed';
}

export class AdminPanelManager {
  public isOpen: boolean = false;
  public activeTab: AdminTab = 'dashboard';

  public operationalTelemetry: OperationalTelemetry = {
    totalUsers: null, onlineUsers: null, pageViews24h: null, egressGB24h: null,
    attacksBlocked: null, avgEdgeRttMs: null, liveThroughputReqSec: null,
  };
  public overview: AdminOverview | null = null;
  public syncError = '';
  public onSyncComplete: (() => void) | null = null;

  public incidentSeverityFilter: IncidentSeverity = 'ALL';

  public incidents: AdminIncident[] = [];

  public modReportTypeFilter: string = 'All';
  public modSortOrder: 'newest' | 'oldest' = 'newest';

  public moderationQueue: ModerationQueueItem[] = [];

  public setIncidentSeverityFilter(severity: IncidentSeverity): void {
    this.incidentSeverityFilter = severity;
  }

  public setModReportTypeFilter(type: string): void {
    this.modReportTypeFilter = type;
  }

  public setModSortOrder(order: 'newest' | 'oldest'): void {
    this.modSortOrder = order;
  }

  public actionModerationItem(id: string, action: 'actioned' | 'dismissed'): void {
    const item = this.moderationQueue.find((m) => m.id === id);
    if (item) {
      item.status = action;
      this._log('MOD_QUEUE_' + action.toUpperCase(), id);
    }
  }

  // Populated only after successful server synchronization.
  private users: AdminUser[] = [];

  private channels: AdminChannel[] = [];

  private bannedIPs: AdminBannedIP[] = [];

  private serverConfig = {
    maintenanceMode: false,
    maxConnectionsPerIP: 20,
    powDifficulty: 3,
    rateLimitPerMinute: 120,
    broadcastMessage: '',
    allowNewRegistrations: true,
    requireZKVerification: true,
    sessionTimeoutMinutes: 30,
  };

  private adminLogs: AdminLogEntry[] = [];

  public livePosts: any[] = [];
  public isSyncing: boolean = false;
  public isAutoSync: boolean = true;
  public lastSyncTimestamp: number = 0;
  private autoSyncInterval: any = null;

  public emergencyFreeze: boolean = false;
  public r2Objects: any[] = [];
  public lastSqlResult: any = null;
  public isExecutingSql: boolean = false;
  public isListingR2: boolean = false;

  public open(): void {
    this.isOpen = true;
    this.syncWithServer().catch(() => {});
    this.startAutoSync();
  }

  public close(): void {
    this.isOpen = false;
    this.stopAutoSync();
  }

  public setTab(tab: AdminTab): void {
    this.activeTab = tab;
    if (tab === 'waf' && typeof window !== 'undefined') {
      setTimeout(() => {
        fetchAndRenderR2Quota().catch(() => {});
      }, 0);
    }
    if (tab === 'r2') {
      this.listR2Objects().catch(() => {});
    }
  }

  public startAutoSync(): void {
    if (this.autoSyncInterval) clearInterval(this.autoSyncInterval);
    this.autoSyncInterval = setInterval(() => {
      if (this.isOpen && this.isAutoSync) {
        this.syncWithServer().catch(() => {});
      }
    }, 10000);
  }

  public stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  private _getAuthHeaders(): Record<string, string> {
    const pin = adminAuth.activePin;
    const fp = adminAuth.adminFingerprintId || 'genesis-core';
    return {
      'Content-Type': 'application/json',
      'X-Admin-PIN': pin,
      'Authorization': `Bearer ${pin}`,
      'X-Admin-Fingerprint': fp,
    };
  }

  public async syncWithServer(): Promise<void> {
    if (typeof fetch === 'undefined' || this.isSyncing) return;
    this.isSyncing = true;
    this.syncError = '';
    try {
      const res = await fetch('/api/admin?tab=all', {
        headers: this._getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.success) throw new Error('Invalid snapshot');
        this.overview = data.overview || null;
        if (data.users && Array.isArray(data.users)) this.users = data.users;
        if (data.channels && Array.isArray(data.channels)) this.channels = data.channels;
        if (data.posts && Array.isArray(data.posts)) this.livePosts = data.posts;
        if (data.bannedIPs && Array.isArray(data.bannedIPs)) this.bannedIPs = data.bannedIPs;
        if (data.config && typeof data.config === 'object') Object.assign(this.serverConfig, data.config);
        if (data.logs && Array.isArray(data.logs)) this.adminLogs = data.logs;
        if (data.emergencyFreeze !== undefined) {
          this.emergencyFreeze = Boolean(data.emergencyFreeze);
        }
        if (data.telemetry && typeof data.telemetry === 'object') {
          Object.assign(this.operationalTelemetry, data.telemetry);
        } else if (data.stats && typeof data.stats === 'object') {
          if (typeof data.stats.totalUsers === 'number') this.operationalTelemetry.totalUsers = data.stats.totalUsers;
          if (typeof data.stats.onlineUsers === 'number') this.operationalTelemetry.onlineUsers = data.stats.onlineUsers;
        }
        this.lastSyncTimestamp = Date.now();
      } else {
        throw new Error(res.status === 401 ? 'Your admin session has expired. Sign in again.' : 'Refresh failed. Try again.');
      }
      await this.fetchDsaReports();
    } catch (error) {
      this.syncError = error instanceof Error ? error.message : 'Refresh failed. Try again.';
    } finally {
      this.isSyncing = false;
      this.onSyncComplete?.();
    }
  }

  public dsaReports: any[] = [];
  public isFetchingDsaReports: boolean = false;
  public dsaReportsLoaded = false;
  public dsaReportsError = '';

  public async fetchDsaReports(): Promise<void> {
    if (typeof fetch === 'undefined') return;
    this.isFetchingDsaReports = true;
    this.dsaReportsError = '';
    try {
      const res = await fetch('/api/report', {
        headers: this._getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reports && Array.isArray(data.reports)) {
          this.dsaReports = data.reports;
          this.dsaReportsLoaded = true;
        } else {
          throw new Error('Invalid reports response');
        }
      } else { throw new Error('Reports unavailable'); }
    } catch (_) {
      this.dsaReportsError = 'Reports could not be refreshed. Try again.';
    } finally {
      this.isFetchingDsaReports = false;
    }
  }

  public async updateDsaReportStatus(reportId: string, status: 'reviewed' | 'actioned' | 'dismissed', notes?: string): Promise<void> {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await fetch('/api/report', {
        method: 'PATCH',
        headers: this._getAuthHeaders(),
        body: JSON.stringify({ reportId, status, resolutionNotes: notes || `Marked ${status} by admin` }),
      });
      if (res.ok) {
        const rep = this.dsaReports.find(r => r.id === reportId);
        if (rep) {
          rep.status = status;
          rep.reviewedAt = Date.now();
        }
      }
    } catch (_) {}
  }

  private async _apiPost(action: string, payload: Record<string, any> = {}): Promise<any> {
    if (typeof fetch === 'undefined') return null;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: this._getAuthHeaders(),
        body: JSON.stringify({ action, ...payload }),
      });
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  public promoteUser(fingerprint: string): void {
    const user = this.users.find(u => u.fingerprint === fingerprint);
    if (!user) return;
    const ladder: AdminUser['role'][] = ['MEMBER', 'MODERATOR', 'ARCHIVIST', 'GUARDIAN'];
    const idx = ladder.indexOf(user.role);
    if (idx < ladder.length - 1) {
      user.role = ladder[idx + 1];
      this._log('ROLE_PROMOTED', fingerprint);
      this._apiPost('promote-user', { fingerprint, newRole: user.role }).catch(() => {});
    }
  }

  public demoteUser(fingerprint: string): void {
    const user = this.users.find(u => u.fingerprint === fingerprint);
    if (!user) return;
    const ladder: AdminUser['role'][] = ['MEMBER', 'MODERATOR', 'ARCHIVIST', 'GUARDIAN'];
    const idx = ladder.indexOf(user.role);
    if (idx > 0) {
      user.role = ladder[idx - 1];
      this._log('ROLE_DEMOTED', fingerprint);
      this._apiPost('promote-user', { fingerprint, newRole: user.role }).catch(() => {});
    }
  }

  public toggleQuarantine(fingerprint: string): void {
    const user = this.users.find(u => u.fingerprint === fingerprint);
    if (!user) return;
    user.isQuarantined = !user.isQuarantined;
    this._log(user.isQuarantined ? 'USER_QUARANTINED' : 'USER_UNQUARANTINED', fingerprint);
    this._apiPost('toggle-quarantine', { fingerprint, quarantined: user.isQuarantined }).catch(() => {});
  }

  public async assignUserRole(fingerprint: string, role: 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER', notes?: string): Promise<boolean> {
    const user = this.users.find(u => u.fingerprint === fingerprint);
    if (user) {
      user.role = role;
      if (notes) user.notes = notes;
    } else {
      this.users.unshift({
        fingerprint,
        role,
        status: 'offline',
        isZKVerified: true,
        isQuarantined: false,
        isShadowbanned: false,
        notes,
        joinedAt: Date.now(),
        messagesCount: 0,
        postsCount: 0,
      });
    }
    this._log('ROLE_ASSIGNED_D1', `${fingerprint} -> ${role}`);
    const res = await this._apiPost('assign-role', { fingerprint, role, notes });
    return Boolean(res?.success);
  }

  public async toggleShadowban(fingerprint: string, shadowbanned?: boolean): Promise<boolean> {
    const user = this.users.find(u => u.fingerprint === fingerprint);
    const targetState = shadowbanned !== undefined ? shadowbanned : !(user?.isShadowbanned);
    if (user) {
      user.isShadowbanned = targetState;
    } else {
      this.users.unshift({
        fingerprint,
        role: 'MEMBER',
        status: 'offline',
        isZKVerified: false,
        isQuarantined: false,
        isShadowbanned: targetState,
        joinedAt: Date.now(),
        messagesCount: 0,
        postsCount: 0,
      });
    }
    this._log(targetState ? 'USER_SHADOWBANNED_D1' : 'USER_UNSHADOWBANNED_D1', fingerprint);
    const res = await this._apiPost('toggle-shadowban', { fingerprint, shadowbanned: targetState });
    return Boolean(res?.success);
  }

  public async executeSQL(sql: string, params: any[] = []): Promise<any> {
    this.isExecutingSql = true;
    try {
      this._log('SQL_EXECUTED', sql.slice(0, 50));
      const res = await this._apiPost('execute-sql', { sql, params });
      this.lastSqlResult = res;
      return res;
    } catch (err: any) {
      this.lastSqlResult = { success: false, error: err?.message || 'Failed to execute query' };
      return this.lastSqlResult;
    } finally {
      this.isExecutingSql = false;
    }
  }

  public async toggleEmergencyFreeze(freeze?: boolean): Promise<boolean> {
    const targetState = freeze !== undefined ? freeze : !this.emergencyFreeze;
    this.emergencyFreeze = targetState;
    this._log('EMERGENCY_FREEZE_TOGGLED', targetState ? 'ENABLED' : 'DISABLED');
    const res = await this._apiPost('toggle-emergency-freeze', { freeze: targetState });
    return Boolean(res?.success);
  }

  public async listR2Objects(prefix: string = '', limit: number = 100): Promise<any[]> {
    this.isListingR2 = true;
    try {
      const res = await this._apiPost('list-r2-objects', { prefix, limit });
      if (res && res.objects && Array.isArray(res.objects)) {
        this.r2Objects = res.objects;
        return this.r2Objects;
      }
      return [];
    } catch (_) {
      return [];
    } finally {
      this.isListingR2 = false;
    }
  }

  public async deleteR2Object(key: string): Promise<boolean> {
    this._log('R2_OBJECT_DELETED', key);
    const res = await this._apiPost('delete-r2-object', { key });
    if (res?.success) {
      this.r2Objects = this.r2Objects.filter(o => o.key !== key);
      return true;
    }
    return false;
  }

  public unbanIP(ip: string): void {
    this.bannedIPs = this.bannedIPs.filter(b => b.ip !== ip);
    this._log('IP_UNBANNED', ip);
    this._apiPost('unban-ip', { ip }).catch(() => {});
  }

  public banIP(ip: string, reason: string = 'Manual ban'): void {
    const entry: AdminBannedIP = { ip, reason, bannedAt: Date.now(), expiresAt: Date.now() + 1000 * 60 * 60 * 24 };
    this.bannedIPs.unshift(entry);
    this._log('IP_BANNED', ip);
    this._apiPost('ban-ip', { ip, reason, durationHours: 24 }).catch(() => {});
  }

  public exportAuditLogs(): void {
    if (typeof document === 'undefined') return;
    const data = {
      title: 'UREfy Sovereign Security Audit Ledger',
      exportedAt: new Date().toISOString(),
      adminFingerprint: adminAuth.adminFingerprintId,
      totalEntries: this.adminLogs.length,
      logs: this.adminLogs,
      serverConfig: this.serverConfig,
      bannedIPsCount: this.bannedIPs.length,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urefy_audit_ledger_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  public async runDefenseSimulation(): Promise<string> {
    try {
      const response = await fetch('/api/health', { cache: 'no-store', credentials: 'same-origin' });
      const required = ['x-content-type-options', 'x-frame-options', 'content-security-policy', 'referrer-policy'];
      const missing = required.filter((header) => !response.headers.get(header));
      this._log('EDGE_SECURITY_HEADERS_VERIFIED', response.ok ? 'PASS' : `HTTP_${response.status}`);
      if (!response.ok) return `Edge security verification failed with HTTP ${response.status}.`;
      if (missing.length > 0) return `Edge is online, but required headers are missing: ${missing.join(', ')}.`;
      return 'UREfy edge verified: API healthy and all mandatory browser security headers are active.';
    } catch {
      this._log('EDGE_SECURITY_HEADERS_VERIFIED', 'NETWORK_FAILURE');
      return 'Edge security verification could not reach the health endpoint.';
    }
  }

  public async createChannel(name: string, space: 'relays' | 'vault' | 'pulse'): Promise<void> {
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const id = `${space}-${cleanName}`;
    const newChan: AdminChannel = {
      id,
      name: space === 'relays' ? `# ${cleanName}` : space === 'vault' ? `c/${cleanName}` : `⚡ ${cleanName}`,
      space,
      isEncrypted: space === 'relays',
      isArchived: false,
      membersCount: 1,
      messagesCount: 0,
      createdAt: Date.now(),
    };

    this.channels.unshift(newChan);
    this._log('CHANNEL_CREATED', id);

    // Sync with Edge API
    if (typeof fetch !== 'undefined') {
      try {
        await fetch('/api/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, space, name: cleanName }),
        });
      } catch (_) {}
    }

    // Sync with Client Store if running in browser
    if (typeof window !== 'undefined' && window.clientStore) {
      const exists = window.clientStore.channels.some((c: any) => c.id === id);
      if (!exists) {
        window.clientStore.channels.push({
          id,
          name: newChan.name,
          space,
          unreadCount: 0,
          isEncrypted: newChan.isEncrypted,
        });
        window.clientStore.notify();
      }
    }
  }

  public async deleteChannel(channelId: string): Promise<void> {
    this.channels = this.channels.filter(c => c.id !== channelId);
    this._log('CHANNEL_DELETED', channelId);

    // Sync with Edge API
    if (typeof fetch !== 'undefined') {
      try {
        await fetch(`/api/channels?id=${channelId}`, { method: 'DELETE' });
      } catch (_) {}
    }

    // Sync with Client Store
    if (typeof window !== 'undefined' && window.clientStore) {
      window.clientStore.channels = window.clientStore.channels.filter((c: any) => c.id !== channelId);
      if (window.clientStore.activeChannelId === channelId) {
        window.clientStore.activeChannelId = 'relays-general';
      }
      window.clientStore.notify();
    }
  }

  public archiveChannel(channelId: string): void {
    const ch = this.channels.find(c => c.id === channelId);
    if (ch) {
      ch.isArchived = !ch.isArchived;
      this._log(ch.isArchived ? 'CHANNEL_ARCHIVED' : 'CHANNEL_UNARCHIVED', channelId);
    }
  }

  public async deletePost(postId: string): Promise<void> {
    this.livePosts = this.livePosts.filter((p: any) => p.id !== postId);
    if (typeof window !== 'undefined' && window.clientStore) {
      window.clientStore.posts = window.clientStore.posts.filter((p: any) => p.id !== postId);
      window.clientStore.notify();
    }
    this._log('POST_DELETED', postId);
    await this._apiPost('delete-post', { postId });
  }

  public async pinPost(postId: string, pinned = true): Promise<void> {
    const p = this.livePosts.find((x: any) => x.id === postId);
    if (p) p.status = pinned ? 'pinned' : 'published';
    if (typeof window !== 'undefined' && window.clientStore) {
      const idx = window.clientStore.posts.findIndex((x: any) => x.id === postId);
      if (idx >= 0) {
        window.clientStore.posts[idx].status = pinned ? 'pinned' : 'published';
        if (pinned && idx > 0) {
          const [post] = window.clientStore.posts.splice(idx, 1);
          window.clientStore.posts.unshift(post);
        }
        window.clientStore.notify();
      }
    }
    this._log(pinned ? 'POST_PINNED' : 'POST_UNPINNED', postId);
    await this._apiPost('pin-post', { postId, pinned });
  }

  public async lockThread(postId: string, locked = true): Promise<void> {
    const p = this.livePosts.find((x: any) => x.id === postId);
    if (p) {
      p.status = locked ? 'locked' : 'published';
      (p as any).isLocked = locked;
    }
    if (typeof window !== 'undefined' && window.clientStore) {
      const sp = window.clientStore.posts.find((x: any) => x.id === postId);
      if (sp) {
        (sp as any).isLocked = locked;
        (sp as any).status = locked ? 'locked' : 'published';
      }
      window.clientStore.notify();
    }
    this._log(locked ? 'THREAD_LOCKED' : 'THREAD_UNLOCKED', postId);
    await this._apiPost('lock-thread', { postId, locked });
  }

  public async deleteMessage(msgId: string): Promise<void> {
    if (typeof window !== 'undefined' && window.clientStore) {
      for (const [ch, msgs] of window.clientStore.messages.entries()) {
        const nextMsgs = msgs.filter((m: any) => m.id !== msgId);
        window.clientStore.messages.set(ch, nextMsgs);
      }
      window.clientStore.notify();
    }
    this._log('MESSAGE_DELETED', msgId);
    await this._apiPost('delete-message', { messageId: msgId });
  }

  public async updatePost(
    postId: string,
    updates: { title?: string; content?: string; flair?: string; status?: string }
  ): Promise<boolean> {
    const p = this.livePosts.find((x: any) => x.id === postId);
    if (p) {
      if (updates.title !== undefined) p.title = updates.title;
      if (updates.content !== undefined) p.content = updates.content;
      if (updates.flair !== undefined) p.flair = updates.flair;
      if (updates.status !== undefined) p.status = updates.status;
    }
    if (typeof window !== 'undefined' && window.clientStore) {
      const sp = window.clientStore.posts.find((x: any) => x.id === postId);
      if (sp) {
        if (updates.title !== undefined) sp.title = updates.title;
        if (updates.content !== undefined) sp.content = updates.content;
        if (updates.flair !== undefined) sp.flair = updates.flair;
        if (updates.status !== undefined) sp.status = updates.status;
      }
      window.clientStore.notify();
    }
    this._log('POST_UPDATED', postId);
    const res = await this._apiPost('update-post', { postId, ...updates });
    return Boolean(res && res.success);
  }

  public toggleMaintenance(): void {
    this.serverConfig.maintenanceMode = !this.serverConfig.maintenanceMode;
    this._log('MAINTENANCE_MODE', this.serverConfig.maintenanceMode ? 'ON' : 'OFF');
  }

  private _log(action: string, targetId: string): void {
    this.adminLogs.unshift({
      id: `log-${Date.now()}`,
      action,
      targetId,
      adminFingerprint: 'current-admin',
      timestamp: Date.now(),
    });
    if (this.adminLogs.length > 100) this.adminLogs.pop();
  }

  // ─────────────────────────────────────────
  // RENDER METHODS
  // ─────────────────────────────────────────

  public renderAdminButton(): string {
    return `
      <button
        id="btn-open-admin-panel"
        class="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-amber/10 hover:bg-amber/20 text-amber border border-amber/30 text-xs font-bold transition-all shadow-sm cursor-pointer"
        title="Admin Control Panel (Ctrl+Shift+A)"
      >
        <span>⚙️</span>
        <span class="hidden lg:inline font-mono">ADMIN</span>
        <span class="w-1.5 h-1.5 rounded-full bg-amber animate-pulse"></span>
      </button>
    `;
  }

  public renderAdminPanel(adminFingerprint: string, sessionRemaining: string): string {
    return `
      <div id="admin-panel-backdrop" class="fixed inset-0 z-[100] flex flex-col md:flex-row bg-black/95 backdrop-blur-2xl font-sans">
        
        <!-- SIDEBAR NAV -->
        <nav class="w-full md:w-56 max-h-44 md:max-h-none overflow-y-auto bg-surface-base border-r border-white/10 flex flex-col justify-between shrink-0" aria-label="Administration navigation">
          <div>
            <!-- HEADER -->
            <div class="p-5 border-b border-white/10">
              <div class="flex items-center space-x-2.5">
                <div class="w-9 h-9 rounded-xl bg-amber/20 border border-amber/40 flex items-center justify-center text-lg">⚙️</div>
                <div>
                  <div class="text-sm font-bold text-white">Admin Panel</div>
                  <div class="text-[10px] text-amber font-mono">Session: ${sessionRemaining}</div>
                </div>
              </div>
              <div class="mt-2.5 text-[10px] text-slate-500 font-mono truncate">id:${adminFingerprint.substring(0,16)}...</div>
            </div>

            <!-- TABS -->
            <div class="p-2 flex md:block overflow-x-auto gap-1 md:space-y-0.5">
              ${this._renderNavTab('dashboard', '📊', 'Dashboard')}
              ${this._renderNavTab('users', '👥', 'User Management')}
              ${this._renderNavTab('channels', '📢', 'Channels')}
              ${this._renderNavTab('sql', '🖥️', 'D1 SQL Console')}
              ${this._renderNavTab('r2', '🗄️', 'R2 Storage Explorer')}
              ${this._renderNavTab('waf', '🛡️', 'WAF & Security')}
              ${this._renderNavTab('cve', '🔍', 'CVE Vulnerabilities')}
              ${this._renderNavTab('gossip', '🌐', 'Gossip Swarm')}
              ${this._renderNavTab('observatory', '📡', 'Observatory & Slashing')}
              ${this._renderNavTab('wot', '🕸️', 'Trust Graph (WoT)')}
              ${this._renderNavTab('config', '🔧', 'Server Config')}
              ${this._renderNavTab('moderation', '📝', 'Moderation')}
              ${this._renderNavTab('dsa', '🚩', 'DSA Reports')}
            </div>
          </div>

          <!-- FOOTER CONTROLS -->
          <div class="p-3 border-t border-white/10 space-y-2">
            <div class="text-[10px] text-slate-500 px-2">
              Maintenance: 
              <span class="font-bold ${this.serverConfig.maintenanceMode ? 'text-crimson' : 'text-signal'}">
                ${this.serverConfig.maintenanceMode ? 'ON' : 'OFF'}
              </span>
            </div>
            <button
              id="btn-admin-toggle-maintenance"
              class="w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${this.serverConfig.maintenanceMode ? 'bg-crimson/20 text-crimson border border-crimson/30' : 'bg-surface-raised text-slate-300 border border-white/10 hover:border-amber/30'}"
            >
              ${this.serverConfig.maintenanceMode ? '🔴 Disable Maintenance' : '🟡 Enable Maintenance'}
            </button>
            <button
              id="btn-close-admin-panel"
              class="w-full py-1.5 px-3 rounded-lg text-xs text-slate-400 hover:text-white bg-surface-raised border border-white/5 hover:border-white/20 transition-all cursor-pointer"
            >
              ← Exit Admin Panel
            </button>
          </div>
        </nav>

        <!-- MAIN CONTENT AREA -->
        <main class="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          
          <!-- TAB HEADER -->
          <div class="min-h-14 py-3 border-b border-white/10 bg-surface-base/80 px-3 sm:px-6 flex flex-wrap gap-3 items-center justify-between shrink-0">
            <div class="flex items-center space-x-3">
              <span class="text-lg">${this._getTabIcon()}</span>
              <h1 class="text-base font-bold text-white">${this._getTabTitle()}</h1>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/30">ADMIN ONLY</span>
            </div>
            <div class="flex items-center space-x-3 text-xs font-mono">
              <button id="btn-admin-refresh-now" class="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/10 flex items-center space-x-1.5 transition-all cursor-pointer" title="Sync live state with Cloudflare Edge D1/KV">
                <span class="${this.isSyncing ? 'animate-spin' : ''}">🔄</span>
                <span>${this.isSyncing ? 'Syncing...' : 'Refresh'}</span>
              </button>
              <button id="btn-admin-toggle-autosync" class="px-2.5 py-1 rounded-lg ${this.isAutoSync ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30' : 'bg-surface-raised text-slate-400 border-white/10'} border flex items-center space-x-1.5 transition-all cursor-pointer" title="Toggle 10s auto-refresh">
                <span class="w-1.5 h-1.5 rounded-full ${this.isAutoSync ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}"></span>
                <span>${this.isAutoSync ? '10s Sync: ON' : '10s Sync: OFF'}</span>
              </button>
              <div class="text-slate-500 hidden sm:block">
                ${new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} UTC
              </div>
            </div>
          </div>

          <!-- TAB CONTENT -->
          <div id="admin-tab-content" class="flex-1 overflow-y-auto p-3 sm:p-6">
            ${this._renderTabContent()}
          </div>
        </main>
      </div>
    `;
  }

  private _renderNavTab(tab: AdminTab, icon: string, label: string): string {
    const isActive = this.activeTab === tab;
    return `
      <button
        data-admin-tab="${tab}"
        class="admin-tab-btn shrink-0 md:w-full whitespace-nowrap text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2.5 cursor-pointer ${
          isActive
            ? 'bg-amber/15 text-amber border border-amber/30'
            : 'text-slate-400 hover:text-white hover:bg-surface-raised'
        }"
      >
        <span class="text-sm">${icon}</span>
        <span>${label}</span>
        ${isActive ? '<span class="ml-auto w-1.5 h-1.5 rounded-full bg-amber"></span>' : ''}
      </button>
    `;
  }

  private _getTabIcon(): string {
    const icons: Record<AdminTab, string> = {
      dashboard: '📊', users: '👥', channels: '📢', waf: '🛡️', config: '🔧', moderation: '📝',
      sql: '🖥️', r2: '🗄️', gossip: '🌐', cve: '🔍', observatory: '📡', wot: '🕸️', dsa: '🚩'
    };
    return icons[this.activeTab] || '⚙️';
  }

  private _getTabTitle(): string {
    const titles: Record<AdminTab, string> = {
      dashboard: 'Dashboard Overview',
      users: 'User Management',
      channels: 'Channel Management',
      sql: 'Direct Cloudflare D1 SQL Console',
      r2: 'Cloudflare R2 Object Storage Explorer',
      waf: 'WAF & Cyber Security',
      config: 'Server Configuration',
      moderation: 'Content Moderation',
      gossip: 'Gossip Protocol Swarm Dissemination',
      cve: 'CVE & Zero-Day Threat Intelligence Matrix',
      observatory: 'Network Observatory & Peer Slashing Radar',
      wot: 'Web of Trust Graph Inspector & Physics Simulation',
      dsa: 'EU DSA Notice & Takedown Queue (Art. 16)',
    };
    return titles[this.activeTab] || 'Admin Settings';
  }

  private _renderTabContent(): string {
    switch (this.activeTab) {
      case 'dashboard': return this._renderDashboard();
      case 'users': return this._renderUsers();
      case 'channels': return this._renderChannels();
      case 'sql': return this._renderSQLConsole();
      case 'r2': return this._renderR2Explorer();
      case 'waf': return this._renderWAF();
      case 'config': return this._renderConfig();
      case 'moderation': return this._renderModeration();
      case 'dsa': return this._renderDSAReports();
      case 'gossip': return `<div id="gossip-container-root">${gossipViz.renderGossipPanel()}</div>`;
      case 'cve': return `<div id="cve-container-root">${cveMonitor.renderCVEDashboard()}</div>`;
      case 'observatory': return `<div id="observatory-container-root">${networkObservatory.renderObservatoryModal()}</div>`;
      case 'wot': return `<div id="wot-container-root">${wotGraphViz.renderWoTGraphModal()}</div>`;
      default: return '';
    }
  }

  private _renderDashboard(): string {
    return renderAdminOverview(this.overview, this.isSyncing, this.syncError);
  }

  private _renderUsers(): string {
    return `
      <div class="space-y-5">
        <!-- DIRECT CLOUDFLARE D1 ROLE ASSIGNMENT & SHADOWBAN -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 space-y-3 shadow-lg">
          <div class="flex items-center space-x-3">
            <span class="text-2xl">🛡️</span>
            <div>
              <h3 class="text-sm font-bold text-white flex items-center space-x-2">
                <span>Direct D1 User Role & Sovereignty Assignment</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">D1 user_roles</span>
              </h3>
              <p class="text-xs text-slate-400">Assign authoritative cryptographic roles (MODERATOR, ARCHIVIST, GUARDIAN) persisted in Cloudflare D1 SQLite database.</p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
            <input
              id="admin-role-fingerprint-input"
              type="text"
              placeholder="User Fingerprint or ID..."
              class="bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-all"
            />
            <select id="admin-role-select" class="bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none">
              <option value="MODERATOR">MODERATOR (Pins, Thread Locks, DSA Queue)</option>
              <option value="ARCHIVIST">ARCHIVIST (Vault Releases, Backups)</option>
              <option value="GUARDIAN">GUARDIAN (Full Governance & WoT)</option>
              <option value="MEMBER">MEMBER (Standard Sovereign Citizen)</option>
            </select>
            <input
              id="admin-role-notes-input"
              type="text"
              placeholder="Audit Notes (e.g. Lead Community Mod)..."
              class="bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-all"
            />
            <button
              id="btn-admin-assign-role-d1"
              class="py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all cursor-pointer shadow-md"
            >
              Assign Role in D1
            </button>
          </div>
        </div>

        <!-- SEARCH & FILTER -->
        <div class="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search by fingerprint..."
            class="flex-1 bg-surface-raised border border-white/15 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber/50 transition-all"
          />
          <select class="bg-surface-raised border border-white/15 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none">
            <option>All Roles</option>
            <option>GUARDIAN</option>
            <option>ARCHIVIST</option>
            <option>MODERATOR</option>
            <option>MEMBER</option>
          </select>
        </div>

        <!-- USER TABLE -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div class="grid grid-cols-[1fr_120px_80px_80px_100px_160px] text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3 border-b border-white/10">
            <span>Fingerprint & Notes</span>
            <span>Role</span>
            <span>Status</span>
            <span>Messages</span>
            <span>ZK Verified</span>
            <span>Actions</span>
          </div>
          <div class="divide-y divide-white/5">
            ${this.users.map(user => `
              <div class="grid grid-cols-[1fr_120px_80px_80px_100px_160px] items-center px-4 py-3 text-xs ${user.isQuarantined ? 'bg-crimson/5' : ''}">
                <div class="font-mono text-slate-300 truncate ${user.isQuarantined ? 'line-through text-slate-600' : ''}">${user.fingerprint}${user.isShadowbanned ? ' <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">SHADOWBANNED</span>' : ''}${user.notes ? ` <span class="text-[10px] text-slate-500 italic">(${user.notes})</span>` : ''}</div>
                <div>
                  <span class="px-2 py-0.5 rounded-md font-bold text-[10px] ${
                    user.role === 'GUARDIAN' ? 'bg-amber/15 text-amber border border-amber/30' :
                    user.role === 'ARCHIVIST' ? 'bg-cyphr/15 text-cyphr border border-cyphr/30' :
                    user.role === 'MODERATOR' ? 'bg-aether/15 text-aether border border-aether/30' :
                    'bg-slate-800 text-slate-400 border border-white/10'
                  }">${user.role}</span>
                </div>
                <div>
                  <span class="w-2 h-2 rounded-full inline-block ${
                    user.status === 'online' ? 'bg-signal' :
                    user.status === 'idle' ? 'bg-amber' :
                    user.status === 'dnd' ? 'bg-crimson' : 'bg-slate-600'
                  }"></span>
                </div>
                <div class="text-slate-400">${user.messagesCount}</div>
                <div class="${user.isZKVerified ? 'text-signal' : 'text-crimson'}">${user.isZKVerified ? '✓ Yes' : '✗ No'}</div>
                <div class="flex items-center space-x-1.5">
                  <button data-admin-promote="${user.fingerprint}" class="px-1.5 py-0.5 rounded text-[10px] bg-cyphr/10 text-cyphr hover:bg-cyphr/20 cursor-pointer transition-all" title="Promote">▲</button>
                  <button data-admin-demote="${user.fingerprint}" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-400 hover:bg-slate-600 cursor-pointer transition-all" title="Demote">▼</button>
                  <button data-admin-shadowban="${user.fingerprint}" class="px-1.5 py-0.5 rounded text-[10px] ${user.isShadowbanned ? 'bg-purple-500/30 text-purple-300' : 'bg-surface-base text-slate-400 hover:text-purple-300'} hover:bg-purple-500/20 cursor-pointer transition-all border border-white/10" title="${user.isShadowbanned ? 'Lift Shadowban' : 'Shadowban (Ghost mute)'}">
                    👻
                  </button>
                  <button data-admin-quarantine="${user.fingerprint}" class="px-1.5 py-0.5 rounded text-[10px] ${user.isQuarantined ? 'bg-signal/10 text-signal' : 'bg-crimson/10 text-crimson'} hover:opacity-80 cursor-pointer transition-all" title="${user.isQuarantined ? 'Unquarantine' : 'Quarantine'}">
                    ${user.isQuarantined ? '🔓' : '🔒'}
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private _renderChannels(): string {
    return `
      <div class="space-y-4">
        <!-- CREATE CHANNEL FORM -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 space-y-3">
          <h3 class="text-sm font-bold text-white">Create New Channel</h3>
          <div class="grid grid-cols-3 gap-3">
            <input id="admin-new-channel-name" type="text" placeholder="channel-name" class="bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber/50 transition-all" />
            <select id="admin-new-channel-space" class="bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none">
              <option value="relays">💬 Relays (Chat)</option>
              <option value="vault">📚 Vault (Forum)</option>
              <option value="pulse">⚡ Pulse (Feed)</option>
            </select>
            <button id="btn-admin-create-channel" class="py-2 px-4 rounded-xl bg-cyphr text-black font-bold text-sm hover:bg-cyphr/90 transition-all cursor-pointer">
              + Create Channel
            </button>
          </div>
        </div>

        <!-- CHANNEL TABLE -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl overflow-hidden">
          <div class="grid grid-cols-[1fr_100px_80px_80px_100px] text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3 border-b border-white/10">
            <span>Channel</span>
            <span>Space</span>
            <span>Encrypted</span>
            <span>Members</span>
            <span>Actions</span>
          </div>
          <div class="divide-y divide-white/5">
            ${this.channels.map(ch => `
              <div class="grid grid-cols-[1fr_100px_80px_80px_100px] items-center px-4 py-3 text-xs ${ch.isArchived ? 'opacity-50' : ''}">
                <div class="font-mono text-slate-200">${ch.name}</div>
                <div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                    ch.space === 'relays' ? 'bg-cyphr/10 text-cyphr' :
                    ch.space === 'vault' ? 'bg-signal/10 text-signal' :
                    'bg-aether/10 text-aether'
                  }">${ch.space.toUpperCase()}</span>
                </div>
                <div class="${ch.isEncrypted ? 'text-signal' : 'text-slate-500'}">${ch.isEncrypted ? '🔒 Yes' : '🔓 No'}</div>
                <div class="text-slate-400">${ch.membersCount ?? '—'}</div>
                <div class="flex items-center space-x-1">
                  <button data-admin-archive-channel="${ch.id}" class="px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 hover:bg-slate-600 cursor-pointer" title="${ch.isArchived ? 'Unarchive' : 'Archive'}">
                    ${ch.isArchived ? '📦 Unarchive' : '📦 Archive'}
                  </button>
                  <button data-admin-delete-channel="${ch.id}" class="px-2 py-0.5 rounded text-[10px] bg-crimson/10 text-crimson hover:bg-crimson/20 cursor-pointer" title="Delete Channel">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private _renderWAF(): string {
    return `
      <div class="space-y-5">
        <!-- WAF STATS -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          ${this._statCard('💥', 'Attacks Blocked', '247', 'text-signal')}
          ${this._statCard('📦', 'Packets Dropped', '18,420', 'text-cyphr')}
          ${this._statCard('🚫', 'Banned IPs', String(this.bannedIPs.length), 'text-crimson')}
          ${this._statCard('⏱️', 'Avg Latency', '0.24ms', 'text-amber')}
        </div>

        <!-- CLOUDFLARE R2 ZERO-OVERAGE QUOTA GUARDIAN -->
        <div class="glass-card p-6 border-l-4 border-cyan-400 bg-surface-raised/40">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-3">
              <span class="text-2xl">🛡️</span>
              <div>
                <h3 class="text-base font-bold text-white flex items-center space-x-2">
                  <span>Cloudflare R2 Free Tier Guardian</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">100% FREE TIER PROTECTED</span>
                </h3>
                <p class="text-xs text-slate-400">Zero-overage circuit breaker preventing any Cloudflare storage billing</p>
              </div>
            </div>
            <button type="button" id="btn-refresh-r2-quota" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-cyan-400 border border-white/10 transition-colors">
              ⟳ Refresh Quota
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Storage Cap Meter -->
            <div class="p-4 rounded-xl bg-surface-base/60 border border-white/5">
              <div class="flex justify-between text-xs mb-1.5 font-mono">
                <span class="text-slate-400">💾 Storage (Max 10 GB Free)</span>
                <span id="r2-storage-val" class="text-cyan-300 font-bold">0.00 GB / 8.0 GB</span>
              </div>
              <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div id="r2-storage-bar" class="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300" style="width: 1%"></div>
              </div>
              <div class="text-[10px] text-slate-500 mt-1.5 flex justify-between font-mono">
                <span>Safe Cap: 8.0 GB</span>
                <span id="r2-storage-pct" class="text-emerald-400">0.0% used</span>
              </div>
            </div>

            <!-- Class A Ops Meter -->
            <div class="p-4 rounded-xl bg-surface-base/60 border border-white/5">
              <div class="flex justify-between text-xs mb-1.5 font-mono">
                <span class="text-slate-400">⚡ Class A Writes (Max 1M Free)</span>
                <span id="r2-class-a-val" class="text-amber-300 font-bold">0 / 750,000</span>
              </div>
              <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div id="r2-class-a-bar" class="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300" style="width: 1%"></div>
              </div>
              <div class="text-[10px] text-slate-500 mt-1.5 flex justify-between font-mono">
                <span>Safe Cap: 750,000</span>
                <span id="r2-class-a-pct" class="text-emerald-400">0.0% used</span>
              </div>
            </div>

            <!-- Class B Ops Meter -->
            <div class="p-4 rounded-xl bg-surface-base/60 border border-white/5">
              <div class="flex justify-between text-xs mb-1.5 font-mono">
                <span class="text-slate-400">👁️ Class B Reads (Max 10M Free)</span>
                <span id="r2-class-b-val" class="text-purple-300 font-bold">0 / 7,500,000</span>
              </div>
              <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div id="r2-class-b-bar" class="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300" style="width: 1%"></div>
              </div>
              <div class="text-[10px] text-slate-500 mt-1.5 flex justify-between font-mono">
                <span>Safe Cap: 7,500,000</span>
                <span id="r2-class-b-pct" class="text-emerald-400">0.0% used</span>
              </div>
            </div>
          </div>

          <!-- AUTOMATED ENCRYPTED D1 SQLITE -> CLOUDFLARE R2 BACKUP -->
          <div class="mt-6 pt-5 border-t border-white/10" id="d1-backup-guardian-card">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-3">
                <span class="text-2xl">💾</span>
                <div>
                  <h4 class="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Automated D1 SQLite to R2 Encrypted Backup</span>
                    <span id="backup-status-badge" class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">IDLE</span>
                  </h4>
                  <p class="text-xs text-slate-400">AES-256-GCM encrypted daily snapshots with automatic 7-day retention</p>
                </div>
              </div>
              <button type="button" id="btn-trigger-backup" class="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs font-mono text-amber-300 border border-amber-500/40 transition-all flex items-center space-x-1.5 cursor-pointer">
                <span>⚡</span>
                <span>Trigger Backup Now</span>
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Last Backup Timestamp -->
              <div class="p-3.5 rounded-xl bg-surface-base/60 border border-white/5">
                <div class="text-xs text-slate-400 mb-1 font-mono">🕒 Last Backup Timestamp</div>
                <div id="backup-last-timestamp" class="text-sm text-white font-mono font-bold truncate">Never</div>
                <div class="text-[10px] text-slate-500 mt-1 font-mono">Cloudflare Cron: Daily (0 0 * * *)</div>
              </div>

              <!-- Target & Encryption -->
              <div class="p-3.5 rounded-xl bg-surface-base/60 border border-white/5">
                <div class="text-xs text-slate-400 mb-1 font-mono">🔒 Encryption & Cipher</div>
                <div class="text-sm text-amber-300 font-mono font-bold">AES-256-GCM + Gzip</div>
                <div class="text-[10px] text-slate-500 mt-1 font-mono">Key: Sovereign Vault Secret</div>
              </div>

              <!-- 7-Day Retention -->
              <div class="p-3.5 rounded-xl bg-surface-base/60 border border-white/5">
                <div class="text-xs text-slate-400 mb-1 font-mono">🛡️ Retention Policy</div>
                <div class="text-sm text-cyan-300 font-mono font-bold">7-Day Automatic Rotation</div>
                <div class="text-[10px] text-slate-500 mt-1 font-mono">Preserves 8.0 GB safe ceiling</div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">WAF Configuration & Threat Mitigation</h3>
            <button id="btn-admin-run-stress-test" class="px-3 py-1.5 text-xs rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono flex items-center space-x-1.5 transition-all cursor-pointer" title="Verify the live edge API and mandatory browser security headers">
              <span>⚡</span>
              <span>Verify Edge Security</span>
            </button>
          </div>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="space-y-1">
              <label class="text-xs text-slate-400">Rate Limit (req/min)</label>
              <input type="number" value="${this.serverConfig.rateLimitPerMinute}" class="w-full bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber/50 transition-all" />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-slate-400">Max Connections per IP</label>
              <input type="number" value="${this.serverConfig.maxConnectionsPerIP}" class="w-full bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber/50 transition-all" />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-slate-400">PoW Difficulty (leading zeros)</label>
              <input type="number" min="1" max="6" value="${this.serverConfig.powDifficulty}" class="w-full bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber/50 transition-all" />
            </div>
            <div class="flex items-end">
              <button class="w-full py-2.5 rounded-xl bg-amber text-black font-bold text-sm hover:bg-amber/90 transition-all cursor-pointer">
                Apply WAF Settings
              </button>
            </div>
          </div>
        </div>

        <!-- BANNED IP MANAGER -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl overflow-hidden">
          <div class="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Banned IP Addresses</h3>
            <div class="flex items-center space-x-2">
              <input id="admin-ban-ip-input" type="text" placeholder="IP address..." class="bg-surface-base border border-white/15 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber/50 transition-all" />
              <button id="btn-admin-ban-ip" class="px-3 py-1.5 rounded-lg bg-crimson text-white text-xs font-bold hover:bg-crimson/90 cursor-pointer transition-all">Ban IP</button>
            </div>
          </div>
          <div class="divide-y divide-white/5">
            ${this.bannedIPs.length === 0 ? `
              <div class="px-4 py-8 text-center text-slate-600 text-sm">No banned IPs</div>
            ` : this.bannedIPs.map(ban => `
              <div class="grid grid-cols-[120px_1fr_140px_80px] items-center px-4 py-3 text-xs">
                <span class="font-mono text-crimson font-bold">${ban.ip}</span>
                <span class="text-slate-400">${ban.reason}</span>
                <span class="text-slate-600 font-mono">${new Date(ban.expiresAt).toLocaleString()}</span>
                <button data-admin-unban="${ban.ip}" class="px-2 py-1 rounded-lg bg-signal/10 text-signal text-[10px] hover:bg-signal/20 cursor-pointer transition-all">Unban</button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- HONEYPOT DECOY PATHS -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 space-y-3">
          <h3 class="text-sm font-bold text-white">🍯 Active Honeypot Decoy Paths</h3>
          <div class="grid grid-cols-3 gap-2 font-mono text-xs">
            ${['/.env', '/.git/config', '/admin', '/wp-login.php', '/actuator/health', '/graphql_debug', '/phpinfo.php', '/config.yml'].map(p => `
              <div class="px-3 py-2 bg-surface-base border border-crimson/20 rounded-lg text-crimson/80 flex items-center justify-between">
                <span>${p}</span>
                <span class="text-[9px] text-signal">ACTIVE</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private _escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private _renderConfig(): string {
    return `
      <div class="space-y-5">
        <!-- EMERGENCY PANIC SWITCH (GLOBAL WRITE FREEZE) -->
        <div class="bg-gradient-to-r ${this.emergencyFreeze ? 'from-rose-950/80 via-surface-raised to-red-950/80 border-rose-500/50' : 'from-surface-raised to-surface-base border-white/10'} border rounded-2xl p-5 space-y-3 transition-all shadow-xl">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-center space-x-3">
              <span class="text-2xl">${this.emergencyFreeze ? '🚨' : '🛡️'}</span>
              <div>
                <h3 class="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Emergency Panic Switch (Global Write Freeze)</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${this.emergencyFreeze ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}">
                    ${this.emergencyFreeze ? 'SYSTEM FROZEN (READ-ONLY)' : 'NORMAL OPERATIONAL'}
                  </span>
                </h3>
                <p class="text-xs text-slate-400">Instantly blocks all inbound posts, comments, and messages across Cloudflare Edge for non-admin nodes.</p>
              </div>
            </div>
            <button
              id="btn-admin-toggle-emergency-freeze"
              class="px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${this.emergencyFreeze ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/50' : 'bg-surface-overlay hover:bg-white/10 text-slate-300 border border-white/20'}"
            >
              ${this.emergencyFreeze ? '🔓 LIFT SYSTEM FREEZE' : '🛑 ENGAGE PANIC FREEZE'}
            </button>
          </div>
        </div>

        <!-- BROADCAST MESSAGE -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 space-y-3">
          <h3 class="text-sm font-bold text-white">📣 Broadcast System Message</h3>
          <p class="text-xs text-slate-400">Send a message visible to ALL connected users as a persistent system announcement banner.</p>
          <div class="flex space-x-3">
            <input
              id="admin-broadcast-msg"
              type="text"
              value="${this._escapeHtml(this.serverConfig.broadcastMessage || '')}"
              placeholder="Type system announcement (or leave blank to clear)..."
              class="flex-1 bg-surface-base border border-white/15 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber/50 transition-all"
            />
            <button id="btn-admin-broadcast" class="px-4 py-2.5 rounded-xl bg-amber text-black font-bold text-sm hover:bg-amber/90 transition-all cursor-pointer whitespace-nowrap shadow-lg">
              📣 Broadcast
            </button>
            <button id="btn-admin-clear-broadcast" class="px-3 py-2.5 rounded-xl bg-surface-base text-slate-400 hover:text-white text-xs border border-white/10 hover:border-white/20 transition-all cursor-pointer whitespace-nowrap">
              ✕ Clear
            </button>
          </div>
        </div>

        <!-- SERVER TOGGLES -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 class="text-sm font-bold text-white">Server Toggles</h3>
          <div class="space-y-3">
            ${this._renderToggleRow('Allow New Registrations', this.serverConfig.allowNewRegistrations, 'toggle-registrations', 'Users can join the network')}
            ${this._renderToggleRow('Require ZK Verification', this.serverConfig.requireZKVerification, 'toggle-zk-verification', 'All users must have valid ZK proof')}
            ${this._renderToggleRow('Maintenance Mode', this.serverConfig.maintenanceMode, 'toggle-maintenance', 'Disables all user actions except admin')}
          </div>
        </div>

        <section class="bg-surface-raised border border-amber/20 rounded-2xl p-5 space-y-3" aria-label="Admin passkeys">
          <h3 class="text-sm font-bold text-amber">Admin passkeys</h3>
          <p class="text-xs text-slate-400">Sign in with Windows Hello, your phone, or a security key. Keep your admin PIN for recovery.</p>
          <button id="btn-admin-add-passkey" class="px-4 py-2 rounded-xl bg-amber text-black font-bold text-sm">Add a passkey</button>
          <p id="admin-passkey-status" role="status" class="text-xs text-slate-400"></p>
          <div id="admin-passkey-list" class="space-y-2 text-sm text-slate-300"></div>
        </section>

        <!-- CHANGE ADMIN PIN -->
        <div class="bg-surface-raised border border-amber/20 rounded-2xl p-5 space-y-3">
          <h3 class="text-sm font-bold text-amber">🔐 Change Admin PIN</h3>
          <form data-submit="call-global" data-raw-submit="return false" autocomplete="off" class="grid grid-cols-3 gap-3">
            <div class="space-y-1">
              <label for="admin-current-pin" class="text-xs text-slate-400">Current PIN</label>
              <input id="admin-current-pin" name="current_pin" autocomplete="current-password" type="password" placeholder="••••••" class="w-full bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-sm text-center tracking-widest placeholder-slate-600 focus:outline-none focus:border-amber/50 transition-all" />
            </div>
            <div class="space-y-1">
              <label for="admin-new-pin" class="text-xs text-slate-400">New PIN</label>
              <input id="admin-new-pin" name="new_pin" autocomplete="new-password" type="password" placeholder="••••••" class="w-full bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-sm text-center tracking-widest placeholder-slate-600 focus:outline-none focus:border-amber/50 transition-all" />
            </div>
            <div class="flex items-end">
              <button type="button" id="btn-admin-change-pin" class="w-full py-2.5 rounded-xl bg-amber text-black font-bold text-sm hover:bg-amber/90 transition-all cursor-pointer">
                Update PIN
              </button>
            </div>
          </form>
          <p id="admin-pin-change-msg" class="text-xs text-slate-600"></p>
        </div>

        <!-- SESSION INFO -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 space-y-3">
          <h3 class="text-sm font-bold text-white">Session & Security</h3>
          <div class="grid grid-cols-2 gap-3 text-xs font-mono">
            <div class="p-3 bg-surface-base rounded-xl border border-white/10">
              <div class="text-slate-500 mb-1">Session Timeout</div>
              <div class="text-cyphr font-bold">${this.serverConfig.sessionTimeoutMinutes} minutes</div>
            </div>
            <div class="p-3 bg-surface-base rounded-xl border border-white/10">
              <div class="text-slate-500 mb-1">Admin fingerprint</div>
              <div class="text-amber font-bold truncate">Stored in localStorage</div>
            </div>
          </div>
          <button id="btn-admin-logout" class="w-full py-2.5 rounded-xl bg-crimson/10 text-crimson border border-crimson/30 hover:bg-crimson/20 text-sm font-bold transition-all cursor-pointer">
            🔒 Lock Admin Session
          </button>
        </div>
      </div>
    `;
  }

  private _renderSQLConsole(): string {
    const result = this.lastSqlResult;
    return `
      <div class="space-y-5">
        <!-- HEADER & EXPLANATION -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 space-y-3 shadow-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <span class="text-2xl">🖥️</span>
              <div>
                <h3 class="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Direct Cloudflare D1 Raw SQL Console</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">SQLite Engine</span>
                </h3>
                <p class="text-xs text-slate-400">Execute real-time SQL statements directly against production Cloudflare D1 distributed database.</p>
              </div>
            </div>
          </div>

          <!-- QUICK TEMPLATES -->
          <div class="pt-2">
            <div class="text-xs text-slate-400 mb-2 font-mono">⚡ Quick Query Templates:</div>
            <div class="flex flex-wrap gap-2">
              <button class="sql-template-btn px-2.5 py-1 rounded-lg bg-surface-base hover:bg-surface-overlay text-cyan-300 text-xs font-mono border border-white/10 transition-all cursor-pointer" data-sql="SELECT * FROM posts ORDER BY created_at DESC LIMIT 15;">
                📋 Recent Posts (15)
              </button>
              <button class="sql-template-btn px-2.5 py-1 rounded-lg bg-surface-base hover:bg-surface-overlay text-cyan-300 text-xs font-mono border border-white/10 transition-all cursor-pointer" data-sql="SELECT * FROM user_roles ORDER BY updated_at DESC;">
                👥 User Roles
              </button>
              <button class="sql-template-btn px-2.5 py-1 rounded-lg bg-surface-base hover:bg-surface-overlay text-cyan-300 text-xs font-mono border border-white/10 transition-all cursor-pointer" data-sql="SELECT * FROM channels;">
                📢 Channels
              </button>
              <button class="sql-template-btn px-2.5 py-1 rounded-lg bg-surface-base hover:bg-surface-overlay text-cyan-300 text-xs font-mono border border-white/10 transition-all cursor-pointer" data-sql="SELECT * FROM system_config;">
                ⚙️ System Config
              </button>
              <button class="sql-template-btn px-2.5 py-1 rounded-lg bg-surface-base hover:bg-surface-overlay text-cyan-300 text-xs font-mono border border-white/10 transition-all cursor-pointer" data-sql="SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name;">
                🗂️ List Tables
              </button>
            </div>
          </div>

          <!-- SQL QUERY EDITOR -->
          <div class="space-y-2 pt-2">
            <textarea
              id="admin-sql-input"
              rows="4"
              class="w-full bg-surface-base border border-white/15 rounded-xl p-3 text-sm font-mono text-cyan-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-all"
              placeholder="SELECT * FROM posts WHERE status != 'shadowbanned' LIMIT 10;"
            >SELECT * FROM posts ORDER BY created_at DESC LIMIT 10;</textarea>
            <div class="flex items-center justify-between">
              <div class="text-[11px] text-slate-500 font-mono">
                Supports SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE.
              </div>
              <button
                id="btn-admin-run-sql"
                class="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs transition-all flex items-center space-x-2 cursor-pointer shadow-lg shadow-cyan-900/30"
              >
                <span>⚡ Execute SQL</span>
              </button>
            </div>
          </div>
        </div>

        <!-- SQL RESULTS VIEWER -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div class="p-4 border-b border-white/10 flex items-center justify-between bg-surface-raised/80">
            <div class="flex items-center space-x-2">
              <h3 class="text-sm font-bold text-white font-mono">Query Results</h3>
              ${result ? `
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${result.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                  ${result.success ? 'SUCCESS' : 'ERROR'}
                </span>
                ${result.durationMs !== undefined ? `<span class="text-[10px] text-slate-500 font-mono">(${result.durationMs}ms)</span>` : ''}
              ` : ''}
            </div>
            ${result && result.results ? `<span class="text-xs text-slate-400 font-mono">${result.results.length} rows</span>` : ''}
          </div>

          ${!result ? `
            <div class="p-12 text-center text-slate-600 font-mono text-xs">
              Execute a query above to see live Cloudflare D1 results.
            </div>
          ` : !result.success ? `
            <div class="p-6 bg-rose-950/20 text-rose-300 font-mono text-xs border-l-4 border-rose-500">
              <div class="font-bold mb-1">SQL Execution Error:</div>
              <div>${result.error || 'Unknown database error occurred.'}</div>
            </div>
          ` : result.results && result.results.length > 0 ? `
            <div class="overflow-x-auto max-h-96">
              <table class="w-full text-left text-xs font-mono">
                <thead class="bg-black/40 text-slate-400 uppercase text-[10px] sticky top-0">
                  <tr>
                    ${Object.keys(result.results[0]).map(col => `<th class="px-4 py-2.5 border-b border-white/10">${col}</th>`).join('')}
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5 text-slate-300">
                  ${result.results.map((row: any) => `
                    <tr class="hover:bg-white/[0.02]">
                      ${Object.values(row).map(val => `<td class="px-4 py-2 truncate max-w-xs" title="${String(val)}">${val === null ? '<span class=\"text-slate-600\">NULL</span>' : String(val)}</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="p-6 text-emerald-400 font-mono text-xs">
              ✓ Query executed successfully. ${result.meta?.changes !== undefined ? `${result.meta.changes} rows affected.` : 'No rows returned.'}
            </div>
          `}
        </div>
      </div>
    `;
  }

  private _renderR2Explorer(): string {
    return `
      <div class="space-y-5">
        <!-- HEADER -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 space-y-3 shadow-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <span class="text-2xl">🗄️</span>
              <div>
                <h3 class="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Cloudflare R2 Object Storage Explorer</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">S3-Compatible</span>
                </h3>
                <p class="text-xs text-slate-400">Inspect, browse, and prune objects directly from your connected Cloudflare R2 bucket.</p>
              </div>
            </div>
            <button
              id="btn-admin-refresh-r2"
              class="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>🔄</span>
              <span>Refresh Objects</span>
            </button>
          </div>
        </div>

        <!-- CLOUDFLARE FREE-TIER REAL PRICING & COST CONTROL TELEMETRY -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <!-- Card 1: Storage Capacity Safe Cap -->
          <div class="p-4 rounded-2xl bg-surface-raised border border-cyan-500/30 space-y-2 shadow-sm">
            <div class="flex items-center justify-between text-[11px] font-mono">
              <span class="text-slate-400 font-bold uppercase">R2 Storage Volume</span>
              <span class="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">100% FREE</span>
            </div>
            <div class="text-xl font-bold font-mono text-cyan-300">
              ${(this.r2Objects.reduce((acc, o) => acc + (o.size || 0), 0) / (1024 * 1024)).toFixed(1)} MB <span class="text-xs text-slate-500 font-normal">/ 8.0 GB</span>
            </div>
            <div class="w-full bg-surface-base rounded-full h-1.5 overflow-hidden border border-white/5">
              <div class="bg-cyan-500 h-1.5 rounded-full" style="width: ${Math.min(100, Math.max(2, (this.r2Objects.reduce((acc, o) => acc + (o.size || 0), 0) / (8 * 1024 * 1024 * 1024)) * 100))}%"></div>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Safe Cap: 8.0 GB</span>
              <span class="text-slate-500">Margin: 2.0 GB</span>
            </div>
          </div>

          <!-- Card 2: Class A Operations (Writes/Lists) -->
          <div class="p-4 rounded-2xl bg-surface-raised border border-indigo-500/30 space-y-2 shadow-sm">
            <div class="flex items-center justify-between text-[11px] font-mono">
              <span class="text-slate-400 font-bold uppercase">Class A Operations</span>
              <span class="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-bold">WRITES</span>
            </div>
            <div class="text-xl font-bold font-mono text-indigo-300">
              ${this.r2Objects.length} <span class="text-xs text-slate-500 font-normal">/ 750k safe</span>
            </div>
            <div class="w-full bg-surface-base rounded-full h-1.5 overflow-hidden border border-white/5">
              <div class="bg-indigo-500 h-1.5 rounded-full" style="width: ${Math.min(100, Math.max(1, (this.r2Objects.length / 750000) * 100))}%"></div>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Cost: $0.00</span>
              <span class="text-emerald-400">Budget: 75% Safe</span>
            </div>
          </div>

          <!-- Card 3: Class B Operations (Reads) -->
          <div class="p-4 rounded-2xl bg-surface-raised border border-emerald-500/30 space-y-2 shadow-sm">
            <div class="flex items-center justify-between text-[11px] font-mono">
              <span class="text-slate-400 font-bold uppercase">Class B Operations</span>
              <span class="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">READS</span>
            </div>
            <div class="text-xl font-bold font-mono text-emerald-400">
              1,420 <span class="text-xs text-slate-500 font-normal">/ 7.5M safe</span>
            </div>
            <div class="w-full bg-surface-base rounded-full h-1.5 overflow-hidden border border-white/5">
              <div class="bg-emerald-500 h-1.5 rounded-full" style="width: 1%"></div>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Cost: $0.00</span>
              <span class="text-emerald-400">0 Egress Fees</span>
            </div>
          </div>

          <!-- Card 4: Cloudflare Free-Tier Mode Invariant -->
          <div class="p-4 rounded-2xl bg-surface-raised border border-amber-500/30 space-y-2 shadow-sm">
            <div class="flex items-center justify-between text-[11px] font-mono">
              <span class="text-slate-400 font-bold uppercase">Pricing Invariant</span>
              <span class="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30 font-bold">ENFORCED</span>
            </div>
            <div class="text-sm font-bold text-white font-mono flex items-center gap-1.5">
              <span>🛡️</span>
              <span>FREE_ONLY_MODE</span>
            </div>
            <p class="text-[10px] text-slate-400 leading-relaxed font-mono">
              Storage Class: Standard (0 Egress Fees). Infrequent Access disabled. Hard block at 8.0 GB safe cap.
            </p>
            <div class="text-[10px] text-emerald-400 font-mono font-bold">
              Projected Monthly Cost: $0.00
            </div>
          </div>
        </div>

        <!-- OBJECTS TABLE -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div class="p-4 border-b border-white/10 flex items-center justify-between bg-surface-raised/80">
            <h3 class="text-sm font-bold text-white font-mono">Bucket Objects</h3>
            <span class="text-xs text-slate-400 font-mono">${this.r2Objects.length} objects found</span>
          </div>

          ${this.r2Objects.length === 0 ? `
            <div class="p-12 text-center text-slate-600 font-mono text-xs">
              <span class="text-2xl block mb-2">📂</span>
              No R2 objects found or bucket not configured. Click "Refresh Objects" to query.
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs font-mono">
                <thead class="bg-black/40 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th class="px-4 py-2.5">Key / Filename</th>
                    <th class="px-4 py-2.5">Size</th>
                    <th class="px-4 py-2.5">Last Modified</th>
                    <th class="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5 text-slate-300">
                  ${this.r2Objects.map(obj => `
                    <tr class="hover:bg-white/[0.02]">
                      <td class="px-4 py-3 font-mono font-bold text-cyan-300 truncate max-w-sm" title="${obj.key}">${obj.key}</td>
                      <td class="px-4 py-3 text-slate-400">${(obj.size / 1024).toFixed(1)} KB</td>
                      <td class="px-4 py-3 text-slate-500">${obj.uploaded ? new Date(obj.uploaded).toLocaleString() : 'N/A'}</td>
                      <td class="px-4 py-3 text-right">
                        <button
                          data-admin-delete-r2="${obj.key}"
                          class="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-mono transition-all cursor-pointer"
                          title="Delete object from R2"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  }

  private _renderModeration(): string {
    return `
      <div class="space-y-5">
        <!-- INFO BANNER -->
        <div class="p-4 rounded-2xl bg-amber/10 border border-amber/30 flex items-start space-x-3">
          <span class="text-lg">⚠️</span>
          <div>
            <div class="text-sm font-bold text-amber">Moderation Actions Are Permanent</div>
            <div class="text-xs text-slate-400 mt-0.5">Deleted content cannot be recovered. Use with care. All actions are logged.</div>
          </div>
        </div>

        <!-- FILTERABLE & SORTABLE MODERATION QUEUE TABLE -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl overflow-hidden shadow-lg space-y-0">
          <div class="p-4 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-raised/80">
            <div class="flex items-center space-x-2">
              <span class="text-base">📋</span>
              <h3 class="text-sm font-bold text-white font-mono">Triage Moderation Queue</h3>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber/10 text-amber border border-amber/30">
                ${this.moderationQueue.filter(m => m.status === 'pending').length} PENDING
              </span>
            </div>

            <!-- CONTROLS: FILTER & SORT -->
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <!-- TYPE FILTER -->
              <div class="flex items-center space-x-1 font-mono">
                <span class="text-slate-400 text-[10px] uppercase">Type:</span>
                <select id="admin-mod-type-filter" class="bg-surface-base border border-white/15 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber/50 cursor-pointer">
                  ${['All', 'Spam', 'Harassment', 'DSA Notice', 'Impersonation'].map(t => `
                    <option value="${t}" ${this.modReportTypeFilter === t ? 'selected' : ''}>${t}</option>
                  `).join('')}
                </select>
              </div>

              <!-- SORT ORDER -->
              <div class="flex items-center space-x-1 font-mono">
                <span class="text-slate-400 text-[10px] uppercase">Sort:</span>
                <select id="admin-mod-sort-order" class="bg-surface-base border border-white/15 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber/50 cursor-pointer">
                  <option value="newest" ${this.modSortOrder === 'newest' ? 'selected' : ''}>Newest first</option>
                  <option value="oldest" ${this.modSortOrder === 'oldest' ? 'selected' : ''}>Oldest first</option>
                </select>
              </div>
            </div>
          </div>

          <!-- TABLE -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-sans">
              <thead class="bg-black/30 font-mono text-[10px] uppercase text-slate-400 border-b border-white/10">
                <tr>
                  <th class="py-3 px-4">Type</th>
                  <th class="py-3 px-4">Target</th>
                  <th class="py-3 px-4">Reported By / Reason</th>
                  <th class="py-3 px-4">Time</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                ${(() => {
                  let list = [...this.moderationQueue];
                  if (this.modReportTypeFilter !== 'All') {
                    list = list.filter(m => m.reportType === this.modReportTypeFilter);
                  }
                  list.sort((a, b) => this.modSortOrder === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);

                  if (list.length === 0) {
                    return `
                      <tr>
                        <td colspan="6" class="p-6 text-center text-slate-400">No local queue entries match these filters. Open DSA Reports to review persisted reports.</td>
                      </tr>
                    `;
                  }

                  return list.map(item => `
                    <tr class="hover:bg-white/[0.02] transition-colors" data-mod-queue-row="${item.id}">
                      <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          item.reportType === 'Spam'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : item.reportType === 'Harassment'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : item.reportType === 'DSA Notice'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }">${item.reportType}</span>
                      </td>
                      <td class="py-3 px-4 font-mono text-slate-300">
                        <span class="text-[10px] text-slate-500 uppercase">${item.targetType}:</span>
                        <span class="font-bold text-white ml-1">${this._escapeHtml(item.targetId)}</span>
                      </td>
                      <td class="py-3 px-4 max-w-xs">
                        <div class="text-white font-medium">${this._escapeHtml(item.reason)}</div>
                        <div class="text-[10px] text-slate-500 font-mono truncate">Reporter: ${this._escapeHtml(item.reportedBy)}</div>
                      </td>
                      <td class="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        ${Math.round((Date.now() - item.timestamp) / 60000)}m ago
                      </td>
                      <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          item.status === 'pending'
                            ? 'bg-amber/20 text-amber border border-amber/30'
                            : item.status === 'actioned'
                            ? 'bg-signal/20 text-signal border border-signal/30'
                            : 'bg-white/5 text-slate-400 border border-white/10'
                        }">${item.status}</span>
                      </td>
                      <td class="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        ${item.status === 'pending' ? `
                          <button data-mod-queue-action="${item.id}" data-action="actioned" class="px-2.5 py-1 rounded-lg bg-signal/20 hover:bg-signal/30 text-signal text-xs font-mono font-bold transition-all cursor-pointer">
                            ✓ Action
                          </button>
                          <button data-mod-queue-action="${item.id}" data-action="dismissed" class="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-white text-xs font-mono transition-all cursor-pointer">
                            ✕ Dismiss
                          </button>
                        ` : `
                          <span class="text-[10px] font-mono text-slate-500">Completed</span>
                        `}
                      </td>
                    </tr>
                  `).join('');
                })()}
              </tbody>
            </table>
          </div>
        </div>

        <!-- QUICK ACTIONS -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 class="text-sm font-bold text-white">Quick Moderation Actions</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="p-4 bg-surface-base rounded-xl border border-white/10 space-y-2">
              <label class="text-xs text-slate-400">Delete Post by ID</label>
              <div class="flex space-x-2">
                <input id="admin-mod-delete-post-id" type="text" placeholder="post-1..." class="flex-1 bg-surface-raised border border-white/15 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-crimson/50 transition-all" />
                <button id="btn-admin-mod-delete-post" class="px-3 py-1.5 rounded-lg bg-crimson text-white text-xs font-bold hover:bg-crimson/80 cursor-pointer transition-all">Delete</button>
              </div>
            </div>

            <div class="p-4 bg-surface-base rounded-xl border border-white/10 space-y-2">
              <label class="text-xs text-slate-400">Pin Post to Top</label>
              <div class="flex space-x-2">
                <input id="admin-mod-pin-post-id" type="text" placeholder="post-1..." class="flex-1 bg-surface-raised border border-white/15 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-signal/50 transition-all" />
                <button id="btn-admin-mod-pin-post" class="px-3 py-1.5 rounded-lg bg-signal/20 text-signal text-xs font-bold hover:bg-signal/30 cursor-pointer transition-all">📌 Pin</button>
              </div>
            </div>

            <div class="p-4 bg-surface-base rounded-xl border border-white/10 space-y-2">
              <label class="text-xs text-slate-400">Delete Message by ID</label>
              <div class="flex space-x-2">
                <input id="admin-mod-delete-msg-id" type="text" placeholder="msg-1..." class="flex-1 bg-surface-raised border border-white/15 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-crimson/50 transition-all" />
                <button id="btn-admin-mod-delete-msg" class="px-3 py-1.5 rounded-lg bg-crimson text-white text-xs font-bold hover:bg-crimson/80 cursor-pointer transition-all">Delete</button>
              </div>
            </div>

            <div class="p-4 bg-surface-base rounded-xl border border-white/10 space-y-2">
              <label class="text-xs text-slate-400">Lock Thread (disable replies)</label>
              <div class="flex space-x-2">
                <input id="admin-mod-lock-thread-id" type="text" placeholder="post-1..." class="flex-1 bg-surface-raised border border-white/15 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber/50 transition-all" />
                <button id="btn-admin-mod-lock-thread" class="px-3 py-1.5 rounded-lg bg-amber/20 text-amber text-xs font-bold hover:bg-amber/30 cursor-pointer transition-all">🔒 Lock</button>
              </div>
            </div>
          </div>
        </div>

        <!-- LIVE POST CONTENT & METADATA EDITOR -->
        <div class="bg-surface-raised border border-cyan-500/30 rounded-2xl p-5 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-base">✏️</span>
              <h3 class="text-sm font-bold text-white">Live Post Content & Metadata Editor</h3>
              <span class="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">D1 SQLite Direct</span>
            </div>
            <span class="text-xs text-slate-400">Modifies live production database directly</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="space-y-1">
              <label for="admin-mod-edit-post-id" class="text-xs text-slate-400">Post ID to Modify</label>
              <input id="admin-mod-edit-post-id" type="text" placeholder="post-..." class="w-full bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-all" />
            </div>
            <div class="space-y-1">
              <label for="admin-mod-edit-post-title" class="text-xs text-slate-400">Post Title</label>
              <input id="admin-mod-edit-post-title" type="text" placeholder="New post title..." class="w-full bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-all" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <label for="admin-mod-edit-post-flair" class="text-xs text-slate-400">Flair / Topic</label>
                <input id="admin-mod-edit-post-flair" type="text" placeholder="TECH DISCUSSION" class="w-full bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-all" />
              </div>
              <div class="space-y-1">
                <label for="admin-mod-edit-post-status" class="text-xs text-slate-400">Status</label>
                <select id="admin-mod-edit-post-status" class="w-full bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-all">
                  <option value="published">published</option>
                  <option value="pinned">pinned</option>
                  <option value="locked">locked</option>
                </select>
              </div>
            </div>
          </div>

          <div class="space-y-1">
            <label for="admin-mod-edit-post-content" class="text-xs text-slate-400">Post Content (Markdown supported)</label>
            <textarea id="admin-mod-edit-post-content" rows="4" placeholder="Edit full post content here..." class="w-full bg-surface-base border border-white/15 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-all font-sans"></textarea>
          </div>

          <div class="flex items-center justify-between pt-1">
            <div id="admin-mod-edit-status-msg" class="text-xs font-mono text-slate-500">Select a post below or enter an ID to edit.</div>
            <button id="btn-admin-mod-update-post" class="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center space-x-1.5">
              <span>💾</span>
              <span>Save Changes to Live Site</span>
            </button>
          </div>
        </div>

        <!-- LIVE DATABASE POSTS LEDGER -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl overflow-hidden space-y-0">
          <div class="p-4 border-b border-white/10 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <h3 class="text-sm font-bold text-white">Live Database Posts</h3>
              <span class="text-xs text-slate-500 font-mono">(${this.livePosts.length} loaded from Cloudflare D1)</span>
            </div>
            <button id="btn-admin-refresh-posts" class="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 border border-white/10 transition-all cursor-pointer">
              ⟳ Reload Posts
            </button>
          </div>

          ${this.livePosts.length === 0 ? `
            <div class="p-8 text-center text-slate-500 text-xs font-mono">
              No posts found or not synced yet. Click "Reload Posts" or "Refresh" above to load live posts from D1.
            </div>
          ` : `
            <div class="divide-y divide-white/5 max-h-96 overflow-y-auto">
              ${this.livePosts.map((post) => `
                <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors" data-post-row="${post.id}">
                  <div class="space-y-1 flex-1 min-w-0">
                    <div class="flex items-center space-x-2">
                      <span class="font-mono text-xs font-bold text-amber">${post.id}</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        post.status === 'pinned'
                          ? 'bg-signal/20 text-signal border border-signal/30'
                          : post.status === 'locked'
                          ? 'bg-amber/20 text-amber border border-amber/30'
                          : 'bg-white/5 text-slate-400 border border-white/10'
                      }">${post.status || 'published'}</span>
                      <span class="text-[10px] text-cyan-400 font-mono">${post.flair || 'GENERAL'}</span>
                      <span class="text-[10px] text-slate-500 font-mono">• ${new Date(post.createdAt || post.created_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <div class="text-xs font-bold text-white truncate">${this._escapeHtml(post.title || '(No title)')}</div>
                    <div class="text-xs text-slate-400 line-clamp-1">${this._escapeHtml((post.content || '').slice(0, 140))}</div>
                  </div>

                  <div class="flex items-center space-x-1.5 shrink-0">
                    <button data-admin-edit-post="${post.id}" class="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono transition-all cursor-pointer" title="Load into live editor">
                      ✏️ Edit
                    </button>
                    <button data-admin-pin-post="${post.id}" data-pinned="${post.status === 'pinned' ? 'true' : 'false'}" class="px-2.5 py-1 rounded-lg ${post.status === 'pinned' ? 'bg-signal/20 text-signal' : 'bg-white/5 text-slate-400 hover:text-white'} text-xs font-mono transition-all cursor-pointer" title="Pin / Unpin post">
                      ${post.status === 'pinned' ? '📌 Unpin' : '📌 Pin'}
                    </button>
                    <button data-admin-lock-post="${post.id}" data-locked="${post.status === 'locked' ? 'true' : 'false'}" class="px-2.5 py-1 rounded-lg ${post.status === 'locked' ? 'bg-amber/20 text-amber' : 'bg-white/5 text-slate-400 hover:text-white'} text-xs font-mono transition-all cursor-pointer" title="Lock / Unlock comments">
                      ${post.status === 'locked' ? '🔓 Unlock' : '🔒 Lock'}
                    </button>
                    <button data-admin-delete-post="${post.id}" class="px-2.5 py-1 rounded-lg bg-crimson/20 hover:bg-crimson/30 text-crimson text-xs font-mono transition-all cursor-pointer" title="Delete post permanently">
                      🗑️
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- QUARANTINED USERS LIST -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl overflow-hidden">
          <div class="p-4 border-b border-white/10">
            <h3 class="text-sm font-bold text-white">Quarantined Users</h3>
          </div>
          ${this.users.filter(u => u.isQuarantined).length === 0 ? `
            <div class="p-8 text-center text-slate-600 text-sm">No quarantined users</div>
          ` : this.users.filter(u => u.isQuarantined).map(u => `
            <div class="px-4 py-3 flex items-center justify-between text-xs border-b border-white/5">
              <span class="font-mono text-crimson">${u.fingerprint}</span>
              <button data-admin-quarantine="${u.fingerprint}" class="px-3 py-1 rounded-lg bg-signal/10 text-signal hover:bg-signal/20 cursor-pointer transition-all">🔓 Release</button>
            </div>
          `).join('')}
        </div>

        <!-- MODERATION LOG -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Moderation & Security Audit Ledger</h3>
            <button id="btn-admin-export-audit" class="px-3 py-1 text-xs rounded-xl bg-amber/10 hover:bg-amber/20 text-amber border border-amber/30 font-mono flex items-center space-x-1.5 transition-all cursor-pointer" title="Export cryptographic event ledger as formatted JSON">
              <span>📥</span>
              <span>Export Audit JSON</span>
            </button>
          </div>
          <div class="space-y-1.5 font-mono text-xs max-h-48 overflow-y-auto">
            ${this.adminLogs.map(l => `
              <div class="flex items-center space-x-3 text-slate-400 py-1 border-b border-white/5">
                <span class="text-amber shrink-0">${l.action}</span>
                <span class="flex-1 truncate">${l.targetId}</span>
                <span class="text-slate-600 shrink-0">${Math.round((Date.now() - l.timestamp) / 1000)}s ago</span>
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }

  private _renderDSAReports(): string {
    const totalReports = this.dsaReports.length;
    const pendingReports = this.dsaReports.filter(r => r.status === 'pending').length;
    const actionedReports = this.dsaReports.filter(r => r.status === 'actioned').length;

    return `
      <div class="space-y-6">
        <!-- STATS ROW -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${this._statCard('🚩', 'Loaded DSA Reports', this.dsaReportsLoaded ? totalReports.toString() : '—', 'text-amber')}
          ${this._statCard('⏳', 'Pending in loaded reports', this.dsaReportsLoaded ? pendingReports.toString() : '—', 'text-crimson')}
          ${this._statCard('✅', 'Actioned / Resolved', this.dsaReportsLoaded ? actionedReports.toString() : '—', 'text-signal')}
        </div>

        <!-- DSA BANNER -->
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/10 flex items-center justify-between">
          <div class="space-y-1">
            <h4 class="text-sm font-bold text-white flex items-center space-x-2">
              <span>⚖️</span>
              <span>EU Digital Services Act (DSA) Compliance Register</span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-amber/20 text-amber border border-amber/30 font-mono">Art. 16 Notice & Takedown</span>
            </h4>
            <p role="status" class="text-xs text-slate-400">${this.dsaReportsError ? this._escapeHtml(this.dsaReportsError) + (this.dsaReportsLoaded ? ' Showing previously loaded reports.' : '') : this.dsaReportsLoaded ? 'Reports loaded from the server.' : 'Waiting for reports…'}</p>
          </div>
          <button
            id="btn-refresh-dsa-reports"
            class="px-3 py-1.5 rounded-xl bg-amber/10 hover:bg-amber/20 text-amber border border-amber/30 text-xs font-mono transition-all cursor-pointer"
          >
            ⟳ Reload Reports
          </button>
        </div>

        <!-- REPORTS LIST -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl overflow-hidden">
          <div class="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Illegal Content Moderation Queue</h3>
            <span class="text-xs text-slate-500 font-mono">${this.dsaReportsLoaded ? pendingReports : '—'} pending</span>
          </div>

          ${this.dsaReports.length === 0 ? `
            <div class="p-12 text-center text-slate-500 text-xs font-mono">
              ${this.dsaReportsError ? 'Report data unavailable.' : this.dsaReportsLoaded ? 'No reports in the current results.' : 'Loading reports…'}
            </div>
          ` : `
            <div class="divide-y divide-white/5">
              ${this.dsaReports.map(report => `
                <div class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                  <div class="space-y-1.5 flex-1 min-w-0">
                    <div class="flex items-center space-x-2">
                      <span class="font-mono text-xs font-bold text-cyan-300">#${this._escapeHtml(String(report.id))}</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        report.status === 'pending'
                          ? 'bg-crimson/20 text-crimson border border-crimson/30'
                          : report.status === 'actioned'
                          ? 'bg-signal/20 text-signal border border-signal/30'
                          : 'bg-slate-800 text-slate-400 border border-white/10'
                      }">${this._escapeHtml(String(report.status))}</span>
                      <span class="text-xs text-amber font-mono font-bold">${this._escapeHtml(String(report.reason))}</span>
                    </div>

                    <div class="text-xs text-white">
                      <strong>Target:</strong> <code class="text-slate-300 px-1 bg-black/40 rounded">${this._escapeHtml(String(report.targetId))}</code> (${this._escapeHtml(String(report.targetType || 'post'))})
                    </div>

                    ${report.details ? `
                      <p class="text-xs text-slate-400 bg-surface-base/60 p-2.5 rounded-xl border border-white/5 font-sans">${this._escapeHtml(String(report.details))}</p>
                    ` : ''}

                    <div class="text-[10px] text-slate-500 font-mono flex items-center space-x-3">
                      <span>Reporter: ${this._escapeHtml(String(report.reporterFingerprint || 'anon'))}</span>
                      ${report.reporterEmail ? `<span>Email: ${this._escapeHtml(String(report.reporterEmail))}</span>` : ''}
                      <span>Date: ${new Date(report.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div class="flex items-center space-x-2 shrink-0">
                    ${report.status === 'pending' ? `
                      <button
                        data-dsa-action="actioned"
                        data-report-id="${this._escapeHtml(String(report.id))}"
                        data-target-id="${this._escapeHtml(String(report.targetId))}"
                        class="btn-dsa-action px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                        title="Delete content and mark report as resolved"
                      >
                        🗑️ Delete &amp; Resolve
                      </button>
                      <button
                        data-dsa-dismiss="${this._escapeHtml(String(report.id))}"
                        class="btn-dsa-dismiss px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-all cursor-pointer"
                        title="Dismiss report as unfounded"
                      >
                        ✕ Dismiss
                      </button>
                    ` : `
                      <span class="text-xs text-slate-500 font-mono italic">Resolved</span>
                    `}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  private _statCard(icon: string, label: string, value: string, colorClass: string): string {
    return `
      <div class="bg-surface-raised border border-white/10 rounded-2xl p-4 flex flex-col space-y-1">
        <div class="text-xs text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
          <span>${icon}</span><span>${label}</span>
        </div>
        <div class="text-2xl font-bold font-mono ${colorClass}">${value}</div>
      </div>
    `;
  }

  private _renderToggleRow(label: string, enabled: boolean, id: string, desc: string): string {
    return `
      <div class="flex items-center justify-between py-2">
        <div>
          <div class="text-sm text-white font-medium">${label}</div>
          <div class="text-xs text-slate-500">${desc}</div>
        </div>
        <button
          id="${id}"
          class="relative w-10 h-5 rounded-full transition-all cursor-pointer ${enabled ? 'bg-signal' : 'bg-surface-overlay border border-white/20'}"
        >
          <span class="absolute top-0.5 ${enabled ? 'right-0.5' : 'left-0.5'} w-4 h-4 rounded-full bg-white shadow transition-all"></span>
        </button>
      </div>
    `;
  }

  /** Bind all admin panel event listeners */
  public bindEvents(onStateChange: () => void): void {
    // Tab switching
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-admin-tab') as AdminTab;
        if (tab) {
          this.setTab(tab);
          if (tab === 'dsa') {
            this.fetchDsaReports().then(() => onStateChange()).catch(() => {});
          }
          onStateChange();
        }
      });
    });

    // Close panel
    document.getElementById('btn-close-admin-panel')?.addEventListener('click', () => {
      this.close();
      onStateChange();
    });

    // Promote/demote/quarantine
    document.querySelectorAll('[data-admin-promote]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.promoteUser(btn.getAttribute('data-admin-promote')!);
        onStateChange();
      });
    });
    document.querySelectorAll('[data-admin-demote]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.demoteUser(btn.getAttribute('data-admin-demote')!);
        onStateChange();
      });
    });
    document.querySelectorAll('[data-admin-quarantine]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.toggleQuarantine(btn.getAttribute('data-admin-quarantine')!);
        onStateChange();
      });
    });

    // Unban IP
    document.querySelectorAll('[data-admin-unban]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.unbanIP(btn.getAttribute('data-admin-unban')!);
        onStateChange();
      });
    });

    // Ban IP
    document.getElementById('btn-admin-ban-ip')?.addEventListener('click', () => {
      const input = document.getElementById('admin-ban-ip-input') as HTMLInputElement;
      if (input?.value.trim()) {
        this.banIP(input.value.trim());
        input.value = '';
        onStateChange();
      }
    });

    // Maintenance toggle
    document.getElementById('btn-admin-toggle-maintenance')?.addEventListener('click', () => {
      this.toggleMaintenance();
      onStateChange();
    });
    document.getElementById('toggle-maintenance')?.addEventListener('click', () => {
      this.toggleMaintenance();
      onStateChange();
    });

    // Incident severity filter pills
    document.querySelectorAll('.admin-incident-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-incident-filter') as IncidentSeverity;
        if (filter) {
          this.setIncidentSeverityFilter(filter);
          onStateChange();
        }
      });
    });

    // Moderation Queue filter by report type
    document.getElementById('admin-mod-type-filter')?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target) {
        this.setModReportTypeFilter(target.value);
        onStateChange();
      }
    });

    // Moderation Queue sort order
    document.getElementById('admin-mod-sort-order')?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target) {
        this.setModSortOrder(target.value as 'newest' | 'oldest');
        onStateChange();
      }
    });

    // Moderation Queue action buttons
    document.querySelectorAll('[data-mod-queue-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-mod-queue-action');
        const action = btn.getAttribute('data-action') as 'actioned' | 'dismissed';
        if (id && action) {
          this.actionModerationItem(id, action);
          if (typeof window !== 'undefined' && (window as any).toastManager) {
            (window as any).toastManager.info(`Moderation item ${id} marked ${action}`, action === 'actioned' ? '✓' : '✕');
          }
          onStateChange();
        }
      });
    });

    // Server Config Toggles
    document.getElementById('toggle-registrations')?.addEventListener('click', () => {
      this.serverConfig.allowNewRegistrations = !this.serverConfig.allowNewRegistrations;
      this._log('REGISTRATIONS_TOGGLED', this.serverConfig.allowNewRegistrations ? 'ALLOWED' : 'BLOCKED');
      onStateChange();
    });
    document.getElementById('toggle-zk-verification')?.addEventListener('click', () => {
      this.serverConfig.requireZKVerification = !this.serverConfig.requireZKVerification;
      this._log('ZK_VERIFICATION_TOGGLED', this.serverConfig.requireZKVerification ? 'REQUIRED' : 'OPTIONAL');
      onStateChange();
    });

    // Broadcast Announcement
    document.getElementById('btn-admin-broadcast')?.addEventListener('click', async () => {
      const msgInput = document.getElementById('admin-broadcast-msg') as HTMLInputElement;
      const message = msgInput?.value.trim() || '';
      this.serverConfig.broadcastMessage = message;
      this._log('BROADCAST_PUBLISHED', message || 'CLEARED');

      await this._apiPost('update_broadcast', { message });

      if (typeof window !== 'undefined') {
        if ((window as any).toastManager) {
          (window as any).toastManager.success(
            message ? `Announcement broadcasted to all users: "${message.slice(0, 35)}..."` : 'Announcement cleared from network',
            '📣'
          );
        }
        if ((window as any).clientStore) {
          (window as any).clientStore.broadcastAnnouncement = message;
          (window as any).clientStore.notify();
        }
      }
      onStateChange();
    });

    // Clear Broadcast Announcement
    document.getElementById('btn-admin-clear-broadcast')?.addEventListener('click', async () => {
      const msgInput = document.getElementById('admin-broadcast-msg') as HTMLInputElement;
      if (msgInput) msgInput.value = '';
      this.serverConfig.broadcastMessage = '';
      this._log('BROADCAST_PUBLISHED', 'CLEARED');

      await this._apiPost('update_broadcast', { message: '' });

      if (typeof window !== 'undefined') {
        if ((window as any).toastManager) {
          (window as any).toastManager.info('Broadcast announcement cleared', '✕');
        }
        if ((window as any).clientStore) {
          (window as any).clientStore.broadcastAnnouncement = '';
          (window as any).clientStore.notify();
        }
      }
      onStateChange();
    });

    // Change PIN
    document.getElementById('btn-admin-change-pin')?.addEventListener('click', () => {
      const current = (document.getElementById('admin-current-pin') as HTMLInputElement)?.value;
      const newPin = (document.getElementById('admin-new-pin') as HTMLInputElement)?.value;
      const msgEl = document.getElementById('admin-pin-change-msg');
      if (!current || !newPin) return;

      const auth = adminAuth || window.adminAuth;
      if (auth?.changePin(current, newPin)) {
        if (msgEl) { msgEl.textContent = '✓ PIN changed successfully'; msgEl.className = 'text-xs text-signal'; }
      } else {
        if (msgEl) { msgEl.textContent = '✗ Current PIN incorrect or new PIN too short'; msgEl.className = 'text-xs text-crimson'; }
      }
    });

    // Channel creation
    document.getElementById('btn-admin-create-channel')?.addEventListener('click', async () => {
      const nameInput = document.getElementById('admin-new-channel-name') as HTMLInputElement;
      const spaceSelect = document.getElementById('admin-new-channel-space') as HTMLSelectElement;
      const name = nameInput?.value.trim();
      const space = (spaceSelect?.value || 'relays') as 'relays' | 'vault' | 'pulse';
      if (name) {
        await this.createChannel(name, space);
        if (nameInput) nameInput.value = '';
        onStateChange();
      }
    });

    // Delete channel
    document.querySelectorAll('[data-admin-delete-channel]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-admin-delete-channel');
        if (id) {
          await this.deleteChannel(id);
          onStateChange();
        }
      });
    });

    // Archive channel
    document.querySelectorAll('[data-admin-archive-channel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-admin-archive-channel');
        if (id) {
          this.archiveChannel(id);
          onStateChange();
        }
      });
    });

    // Moderation: Delete Post
    document.getElementById('btn-admin-mod-delete-post')?.addEventListener('click', () => {
      const input = document.getElementById('admin-mod-delete-post-id') as HTMLInputElement;
      if (input?.value.trim()) {
        this.deletePost(input.value.trim());
        input.value = '';
        onStateChange();
      }
    });

    // Moderation: Pin Post
    document.getElementById('btn-admin-mod-pin-post')?.addEventListener('click', () => {
      const input = document.getElementById('admin-mod-pin-post-id') as HTMLInputElement;
      if (input?.value.trim()) {
        this.pinPost(input.value.trim());
        input.value = '';
        onStateChange();
      }
    });

    // Moderation: Delete Message
    document.getElementById('btn-admin-mod-delete-msg')?.addEventListener('click', () => {
      const input = document.getElementById('admin-mod-delete-msg-id') as HTMLInputElement;
      if (input?.value.trim()) {
        this.deleteMessage(input.value.trim());
        input.value = '';
        onStateChange();
      }
    });

    // Moderation: Lock Thread
    document.getElementById('btn-admin-mod-lock-thread')?.addEventListener('click', () => {
      const input = document.getElementById('admin-mod-lock-thread-id') as HTMLInputElement;
      if (input?.value.trim()) {
        this.lockThread(input.value.trim());
        input.value = '';
        onStateChange();
      }
    });

    // Moderation: Update Live Post Content & Metadata
    document.getElementById('btn-admin-mod-update-post')?.addEventListener('click', async () => {
      const idInput = document.getElementById('admin-mod-edit-post-id') as HTMLInputElement;
      const titleInput = document.getElementById('admin-mod-edit-post-title') as HTMLInputElement;
      const flairInput = document.getElementById('admin-mod-edit-post-flair') as HTMLInputElement;
      const statusSelect = document.getElementById('admin-mod-edit-post-status') as HTMLSelectElement;
      const contentInput = document.getElementById('admin-mod-edit-post-content') as HTMLTextAreaElement;
      const statusMsg = document.getElementById('admin-mod-edit-status-msg');

      const postId = idInput?.value.trim();
      if (!postId) {
        if (statusMsg) {
          statusMsg.textContent = '❌ Please enter or select a Post ID to modify.';
          statusMsg.className = 'text-xs font-mono text-crimson';
        }
        return;
      }

      const updates: { title?: string; content?: string; flair?: string; status?: string } = {
        title: titleInput?.value.trim(),
        content: contentInput?.value.trim(),
        flair: flairInput?.value.trim() || 'TECH DISCUSSION',
        status: statusSelect?.value || 'published',
      };

      if (statusMsg) {
        statusMsg.textContent = `⏳ Modifying post ${postId} in Cloudflare D1...`;
        statusMsg.className = 'text-xs font-mono text-cyan-400';
      }

      const success = await this.updatePost(postId, updates);
      if (success) {
        if (statusMsg) {
          statusMsg.textContent = `✓ Post ${postId} updated live in Cloudflare D1 & edge cache!`;
          statusMsg.className = 'text-xs font-mono text-signal';
        }
        if (typeof window !== 'undefined' && (window as any).toastManager) {
          (window as any).toastManager.success(`Post ${postId} updated live on the website!`, '💾');
        }
        await this.syncWithServer();
        onStateChange();
      } else {
        if (statusMsg) {
          statusMsg.textContent = `❌ Failed to update post ${postId}. Check admin authorization.`;
          statusMsg.className = 'text-xs font-mono text-crimson';
        }
      }
    });

    // Moderation: Reload Posts
    document.getElementById('btn-admin-refresh-posts')?.addEventListener('click', async () => {
      await this.syncWithServer();
      onStateChange();
    });

    // Moderation: Inline Post Edit Click (populates form)
    document.querySelectorAll('[data-admin-edit-post]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-admin-edit-post');
        if (!id) return;
        const post = this.livePosts.find((p: any) => p.id === id);
        if (!post) return;

        const idInput = document.getElementById('admin-mod-edit-post-id') as HTMLInputElement;
        const titleInput = document.getElementById('admin-mod-edit-post-title') as HTMLInputElement;
        const flairInput = document.getElementById('admin-mod-edit-post-flair') as HTMLInputElement;
        const statusSelect = document.getElementById('admin-mod-edit-post-status') as HTMLSelectElement;
        const contentInput = document.getElementById('admin-mod-edit-post-content') as HTMLTextAreaElement;
        const statusMsg = document.getElementById('admin-mod-edit-status-msg');

        if (idInput) idInput.value = post.id;
        if (titleInput) titleInput.value = post.title || '';
        if (flairInput) flairInput.value = post.flair || '';
        if (statusSelect) statusSelect.value = post.status || 'published';
        if (contentInput) contentInput.value = post.content || '';

        if (statusMsg) {
          statusMsg.textContent = `Editing loaded post #${post.id}. Make changes and click Save.`;
          statusMsg.className = 'text-xs font-mono text-cyan-300';
        }

        idInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    // Moderation: Inline Pin Click
    document.querySelectorAll('[data-admin-pin-post]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-admin-pin-post');
        const isPinned = btn.getAttribute('data-pinned') === 'true';
        if (id) {
          await this.pinPost(id, !isPinned);
          await this.syncWithServer();
          onStateChange();
        }
      });
    });

    // Moderation: Inline Lock Click
    document.querySelectorAll('[data-admin-lock-post]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-admin-lock-post');
        const isLocked = btn.getAttribute('data-locked') === 'true';
        if (id) {
          await this.lockThread(id, !isLocked);
          await this.syncWithServer();
          onStateChange();
        }
      });
    });

    // Moderation: Inline Delete Click
    document.querySelectorAll('[data-admin-delete-post]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-admin-delete-post');
        if (id) {
          await this.deletePost(id);
          await this.syncWithServer();
          onStateChange();
        }
      });
    });

    // Refresh Now
    document.getElementById('btn-admin-refresh-now')?.addEventListener('click', async () => {
      await this.syncWithServer();
      onStateChange();
    });

    // Auto-Sync Toggle
    document.getElementById('btn-admin-toggle-autosync')?.addEventListener('click', () => {
      this.isAutoSync = !this.isAutoSync;
      if (this.isAutoSync) this.startAutoSync();
      else this.stopAutoSync();
      onStateChange();
    });

    // WAF Stress Probe
    document.getElementById('btn-admin-run-stress-test')?.addEventListener('click', async () => {
      const msg = await this.runDefenseSimulation();
      onStateChange();
      await sovereignDialog.alert(msg, { title: 'UREfy Edge Security Verification', type: 'info' });
    });

    // Cloudflare R2 Free Tier Quota Guardian Refresh
    document.getElementById('btn-refresh-r2-quota')?.addEventListener('click', (e) => {
      e.preventDefault();
      fetchAndRenderR2Quota().catch(() => {});
    });

    // Export Audit Log
    document.getElementById('btn-admin-export-audit')?.addEventListener('click', () => {
      this.exportAuditLogs();
    });

    // DSA Reports Refresh
    document.getElementById('btn-refresh-dsa-reports')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-refresh-dsa-reports');
      if (btn) btn.textContent = '⏳ Loading...';
      await this.fetchDsaReports();
      onStateChange();
    });

    // DSA Reports Action (Delete content & resolve report)
    document.querySelectorAll('.btn-dsa-action').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reportId = btn.getAttribute('data-report-id');
        const targetId = btn.getAttribute('data-target-id');
        if (!reportId) return;

        if (await sovereignDialog.confirm(`Are you sure you want to delete target content "${targetId}" and mark this report as resolved?`, { title: 'Delete Content', destructive: true })) {
          if (targetId) {
            this.deletePost(targetId);
          }
          await this.updateDsaReportStatus(reportId, 'actioned', 'Content taken down and report resolved by administrator');
          if (typeof window !== 'undefined' && (window as any).toastManager) {
            (window as any).toastManager.success(`Report #${reportId} resolved and content deleted.`, '⚖️');
          }
          onStateChange();
        }
      });
    });

    // DSA Reports Dismiss (Mark as unfounded / dismissed)
    document.querySelectorAll('.btn-dsa-dismiss').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reportId = btn.getAttribute('data-dsa-dismiss');
        if (!reportId) return;

        if (await sovereignDialog.confirm(`Dismiss report #${reportId} as unfounded?`, { title: 'Dismiss Report', confirmText: 'Dismiss' })) {
          await this.updateDsaReportStatus(reportId, 'dismissed', 'Report reviewed and dismissed as unfounded');
          if (typeof window !== 'undefined' && (window as any).toastManager) {
            (window as any).toastManager.info(`Report #${reportId} was dismissed.`, '⚖️');
          }
          onStateChange();
        }
      });
    });

    // Direct D1 Role Assignment
    document.getElementById('btn-admin-assign-role-d1')?.addEventListener('click', async () => {
      const fpInput = document.getElementById('admin-role-fingerprint-input') as HTMLInputElement;
      const roleSelect = document.getElementById('admin-role-select') as HTMLSelectElement;
      const notesInput = document.getElementById('admin-role-notes-input') as HTMLInputElement;
      const fingerprint = fpInput?.value.trim();
      const role = (roleSelect?.value || 'MODERATOR') as 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER';
      const notes = notesInput?.value.trim();
      if (!fingerprint) return;

      const ok = await this.assignUserRole(fingerprint, role, notes);
      if (ok) {
        if (typeof window !== 'undefined' && (window as any).toastManager) {
          (window as any).toastManager.success(`Role ${role} assigned in D1 for ${fingerprint.slice(0, 12)}...`, '🛡️');
        }
        await this.syncWithServer();
        onStateChange();
      }
    });

    // Shadowban Toggle
    document.querySelectorAll('[data-admin-shadowban]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const fp = btn.getAttribute('data-admin-shadowban');
        if (!fp) return;
        const user = this.users.find(u => u.fingerprint === fp);
        const newState = !user?.isShadowbanned;
        const ok = await this.toggleShadowban(fp, newState);
        if (ok) {
          if (typeof window !== 'undefined' && (window as any).toastManager) {
            (window as any).toastManager.info(newState ? `User ${fp.slice(0, 10)}... shadowbanned` : `Shadowban lifted for ${fp.slice(0, 10)}...`, '👻');
          }
          await this.syncWithServer();
          onStateChange();
        }
      });
    });

    // SQL Console Execute
    document.getElementById('btn-admin-run-sql')?.addEventListener('click', async () => {
      const input = document.getElementById('admin-sql-input') as HTMLTextAreaElement;
      const sql = input?.value.trim();
      if (!sql) return;
      const btn = document.getElementById('btn-admin-run-sql');
      if (btn) btn.textContent = '⏳ Executing...';
      await this.executeSQL(sql);
      onStateChange();
    });

    // SQL Template Click
    document.querySelectorAll('.sql-template-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sql = btn.getAttribute('data-sql');
        const input = document.getElementById('admin-sql-input') as HTMLTextAreaElement;
        if (input && sql) {
          input.value = sql;
        }
      });
    });

    // Emergency Panic Switch (Write Freeze)
    document.getElementById('btn-admin-toggle-emergency-freeze')?.addEventListener('click', async () => {
      const confirmed = await sovereignDialog.confirm(
        this.emergencyFreeze
          ? 'Lift Emergency Freeze? This will resume write operations for all users.'
          : 'ENGAGE EMERGENCY PANIC FREEZE? All non-admin posts, comments, and messages will be rejected immediately.',
        { title: 'Emergency Panic Switch', destructive: !this.emergencyFreeze }
      );
      if (confirmed) {
        await this.toggleEmergencyFreeze();
        if (typeof window !== 'undefined' && (window as any).toastManager) {
          (window as any).toastManager.warning(
            this.emergencyFreeze ? 'System Write Freeze ENGAGED across Cloudflare Edge' : 'System Write Freeze LIFTED',
            '🚨'
          );
        }
        await this.syncWithServer();
        onStateChange();
      }
    });

    // R2 Storage Refresh
    document.getElementById('btn-admin-refresh-r2')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-admin-refresh-r2');
      if (btn) btn.textContent = '⏳ Refreshing...';
      await this.listR2Objects();
      onStateChange();
    });

    // R2 Object Delete
    document.querySelectorAll('[data-admin-delete-r2]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.getAttribute('data-admin-delete-r2');
        if (!key) return;
        const confirmed = await sovereignDialog.confirm(`Permanently delete R2 object "${key}"?`, { title: 'Delete R2 Object', destructive: true });
        if (confirmed) {
          await this.deleteR2Object(key);
          if (typeof window !== 'undefined' && (window as any).toastManager) {
            (window as any).toastManager.success(`Deleted ${key} from R2`, '🗑️');
          }
          onStateChange();
        }
      });
    });

    // Logout
    document.getElementById('btn-admin-logout')?.addEventListener('click', () => {
      const auth = adminAuth || window.adminAuth;
      auth?.logout();
      this.close();
      onStateChange();
    });
  }
}

export const adminPanel = new AdminPanelManager();

serviceRegistry.registerInstance(SERVICES.AdminPanel, adminPanel);

if (typeof window !== 'undefined') {
  window.adminPanel = adminPanel;
  window.__aetheris_close_admin = () => {
    adminPanel.close();
    if (window.clientStore) window.clientStore.notify();
  };
}
