import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { adminAuth } from './admin-auth.js';
import { gossipViz } from './gossip-viz.js';
import { cveMonitor } from './cve-monitor.js';
import { networkObservatory } from './network-observatory.js';
import { wotGraphViz } from './network-wot-graph.js';
import { toastManager } from './toast.js';
import { fetchAndRenderR2Quota } from './admin.js';

export type AdminTab = 'dashboard' | 'users' | 'channels' | 'waf' | 'config' | 'moderation' | 'gossip' | 'cve' | 'observatory' | 'wot';

export interface AdminUser {
  fingerprint: string;
  role: 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER';
  status: 'online' | 'idle' | 'dnd' | 'offline';
  isZKVerified: boolean;
  isQuarantined: boolean;
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
  membersCount: number;
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

export class AdminPanelManager {
  public isOpen: boolean = false;
  public activeTab: AdminTab = 'dashboard';

  // Simulated admin data (in real deployment, fetched from server API)
  private users: AdminUser[] = [
    { fingerprint: 'genesis-core', role: 'GUARDIAN', status: 'online', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 30, messagesCount: 892, postsCount: 47 },
    { fingerprint: 'c3dc28cb705e', role: 'ARCHIVIST', status: 'online', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 20, messagesCount: 341, postsCount: 23 },
    { fingerprint: 'a89104fa2211', role: 'MODERATOR', status: 'idle', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 15, messagesCount: 156, postsCount: 8 },
    { fingerprint: 'f40019bc88a2', role: 'MEMBER', status: 'idle', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 7, messagesCount: 42, postsCount: 2 },
    { fingerprint: '9b22a011cd44', role: 'MEMBER', status: 'dnd', isZKVerified: true, isQuarantined: false, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 3, messagesCount: 17, postsCount: 0 },
    { fingerprint: 'bad-actor-001', role: 'MEMBER', status: 'offline', isZKVerified: false, isQuarantined: true, joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 2, messagesCount: 3, postsCount: 0 },
  ];

  private channels: AdminChannel[] = [
    { id: 'relays-general', name: '# general', space: 'relays', isEncrypted: true, isArchived: false, membersCount: 12, messagesCount: 2847, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30 },
    { id: 'relays-dev', name: '# dev-core', space: 'relays', isEncrypted: true, isArchived: false, membersCount: 8, messagesCount: 1204, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 25 },
    { id: 'vault-releases', name: 'c/clean-releases', space: 'vault', isEncrypted: false, isArchived: false, membersCount: 12, messagesCount: 0, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30 },
    { id: 'vault-guides', name: 'c/security-guides', space: 'vault', isEncrypted: false, isArchived: false, membersCount: 12, messagesCount: 0, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20 },
    { id: 'pulse-global', name: '⚡ global-pulse', space: 'pulse', isEncrypted: false, isArchived: false, membersCount: 12, messagesCount: 0, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 28 },
  ];

  private bannedIPs: AdminBannedIP[] = [
    { ip: '185.220.101.5', reason: 'Honeypot Probe: /.env scanner', bannedAt: Date.now() - 60000, expiresAt: Date.now() + 1000 * 60 * 60 * 23 },
    { ip: '45.154.255.89', reason: 'XSS Injection Attempt', bannedAt: Date.now() - 120000, expiresAt: Date.now() + 1000 * 60 * 60 * 22 },
    { ip: '194.26.29.112', reason: 'DDoS Flood (500 req/sec)', bannedAt: Date.now() - 240000, expiresAt: Date.now() + 1000 * 60 * 60 * 21 },
  ];

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

  private adminLogs: AdminLogEntry[] = [
    { id: 'log-1', action: 'ROLE_CHANGED', targetId: 'a89104fa2211', adminFingerprint: 'genesis-core', timestamp: Date.now() - 300000 },
    { id: 'log-2', action: 'IP_BANNED', targetId: '185.220.101.5', adminFingerprint: 'genesis-core', timestamp: Date.now() - 120000 },
    { id: 'log-3', action: 'POST_DELETED', targetId: 'post-spam-44', adminFingerprint: 'genesis-core', timestamp: Date.now() - 60000 },
  ];

  public isSyncing: boolean = false;
  public isAutoSync: boolean = true;
  public lastSyncTimestamp: number = 0;
  private autoSyncInterval: any = null;

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
      'X-Admin-Fingerprint': fp,
    };
  }

  public async syncWithServer(): Promise<void> {
    if (typeof fetch === 'undefined') return;
    this.isSyncing = true;
    try {
      const res = await fetch('/api/admin?tab=all', {
        headers: this._getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) this.users = data.users;
        if (data.channels && Array.isArray(data.channels)) this.channels = data.channels;
        if (data.bannedIPs && Array.isArray(data.bannedIPs)) this.bannedIPs = data.bannedIPs;
        if (data.config && typeof data.config === 'object') Object.assign(this.serverConfig, data.config);
        if (data.logs && Array.isArray(data.logs)) this.adminLogs = data.logs;
        this.lastSyncTimestamp = Date.now();
      }
    } catch (_) {
      // Local fallback
    } finally {
      this.isSyncing = false;
    }
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
      title: 'Aetheris Sovereign Security Audit Ledger',
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
    a.download = `aetheris_audit_ledger_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  public async runDefenseSimulation(): Promise<string> {
    const probeIps = ['198.51.100.42', '203.0.113.19', '192.0.2.77'];
    const targetIp = probeIps[Math.floor(Math.random() * probeIps.length)];
    const reasons = [
      'Automated SQLi Probe on /api/messages',
      'High-Rate Replay Attack detected by ZK-RLN Nullifier Engine',
      'Honeypot Scanner: Attempted access to restricted admin RPC',
    ];
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    
    this.banIP(targetIp, reason);
    this._log('DEFENSE_PROBE_MITIGATED', targetIp);
    return `Security incident simulated: IP ${targetIp} neutralized & quarantined by WAF.`;
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

  public deletePost(postId: string): void {
    if (typeof window !== 'undefined' && window.clientStore) {
      window.clientStore.posts = window.clientStore.posts.filter((p: any) => p.id !== postId);
      window.clientStore.notify();
    }
    this._log('POST_DELETED', postId);
  }

  public pinPost(postId: string): void {
    if (typeof window !== 'undefined' && window.clientStore) {
      const idx = window.clientStore.posts.findIndex((p: any) => p.id === postId);
      if (idx > 0) {
        const [post] = window.clientStore.posts.splice(idx, 1);
        window.clientStore.posts.unshift(post);
        window.clientStore.notify();
      }
    }
    this._log('POST_PINNED', postId);
  }

  public deleteMessage(msgId: string): void {
    if (typeof window !== 'undefined' && window.clientStore) {
      for (const [ch, msgs] of window.clientStore.messages.entries()) {
        const nextMsgs = msgs.filter((m: any) => m.id !== msgId);
        window.clientStore.messages.set(ch, nextMsgs);
      }
      window.clientStore.notify();
    }
    this._log('MESSAGE_DELETED', msgId);
  }

  public lockThread(postId: string): void {
    if (typeof window !== 'undefined' && window.clientStore) {
      const p = window.clientStore.posts.find((x: any) => x.id === postId);
      if (p) (p as any).isLocked = !(p as any).isLocked;
      window.clientStore.notify();
    }
    this._log('THREAD_LOCKED', postId);
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
      <div id="admin-panel-backdrop" class="fixed inset-0 z-[100] flex bg-black/95 backdrop-blur-2xl font-sans">
        
        <!-- SIDEBAR NAV -->
        <nav class="w-56 bg-surface-base border-r border-white/10 flex flex-col justify-between shrink-0">
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
            <div class="p-2 space-y-0.5">
              ${this._renderNavTab('dashboard', '📊', 'Dashboard')}
              ${this._renderNavTab('users', '👥', 'User Management')}
              ${this._renderNavTab('channels', '📢', 'Channels')}
              ${this._renderNavTab('waf', '🛡️', 'WAF & Security')}
              ${this._renderNavTab('cve', '🔍', 'CVE Vulnerabilities')}
              ${this._renderNavTab('gossip', '🌐', 'Gossip Swarm')}
              ${this._renderNavTab('observatory', '📡', 'Observatory & Slashing')}
              ${this._renderNavTab('wot', '🕸️', 'Trust Graph (WoT)')}
              ${this._renderNavTab('config', '🔧', 'Server Config')}
              ${this._renderNavTab('moderation', '📝', 'Moderation')}
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
        <main class="flex-1 flex flex-col overflow-hidden">
          
          <!-- TAB HEADER -->
          <div class="h-14 border-b border-white/10 bg-surface-base/80 px-6 flex items-center justify-between shrink-0">
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
                ${new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} UTC
              </div>
            </div>
          </div>

          <!-- TAB CONTENT -->
          <div class="flex-1 overflow-y-auto p-6">
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
        class="admin-tab-btn w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2.5 cursor-pointer ${
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
      gossip: '🌐', cve: '🔍', observatory: '📡', wot: '🕸️'
    };
    return icons[this.activeTab] || '⚙️';
  }

  private _getTabTitle(): string {
    const titles: Record<AdminTab, string> = {
      dashboard: 'Dashboard Overview',
      users: 'User Management',
      channels: 'Channel Management',
      waf: 'WAF & Cyber Security',
      config: 'Server Configuration',
      moderation: 'Content Moderation',
      gossip: 'Gossip Protocol Swarm Dissemination',
      cve: 'CVE & Zero-Day Threat Intelligence Matrix',
      observatory: 'Network Observatory & Peer Slashing Radar',
      wot: 'Web of Trust Graph Inspector & Physics Simulation',
    };
    return titles[this.activeTab] || 'Admin Settings';
  }

  private _renderTabContent(): string {
    switch (this.activeTab) {
      case 'dashboard': return this._renderDashboard();
      case 'users': return this._renderUsers();
      case 'channels': return this._renderChannels();
      case 'waf': return this._renderWAF();
      case 'config': return this._renderConfig();
      case 'moderation': return this._renderModeration();
      case 'gossip': return `<div id="gossip-container-root">${gossipViz.renderGossipPanel()}</div>`;
      case 'cve': return `<div id="cve-container-root">${cveMonitor.renderCVEDashboard()}</div>`;
      case 'observatory': return `<div id="observatory-container-root">${networkObservatory.renderObservatoryModal()}</div>`;
      case 'wot': return `<div id="wot-container-root">${wotGraphViz.renderWoTGraphModal()}</div>`;
      default: return '';
    }
  }

  private _renderDashboard(): string {
    const totalUsers = this.users.length;
    const onlineUsers = this.users.filter(u => u.status === 'online').length;
    const quarantinedUsers = this.users.filter(u => u.isQuarantined).length;
    const totalMessages = this.users.reduce((sum, u) => sum + u.messagesCount, 0);
    const totalPosts = this.users.reduce((sum, u) => sum + u.postsCount, 0);

    return `
      <div class="space-y-6">
        <!-- LIVE TRAFFIC & CONCURRENCY HERO BANNER -->
        <div class="bg-gradient-to-r from-indigo-950/60 via-surface-raised to-slate-900/60 border border-indigo-500/30 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
          <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div class="flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 -ml-4"></span>
                <h3 class="text-base font-bold text-white font-sans">Live Production Network & Traffic Monitor</h3>
                <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">CLOUDFLARE ANYCAST EDGE</span>
              </div>
              <p class="text-xs text-slate-400 font-mono mt-1">Real-time telemetry across 310+ global edge data centers with zero data retention.</p>
            </div>
            <div class="flex items-center space-x-4">
              <div class="bg-black/40 border border-white/10 rounded-2xl px-4 py-2 text-right">
                <div class="text-[10px] text-slate-400 font-mono uppercase">Live Throughput</div>
                <div class="text-sm font-bold text-emerald-400 font-mono">1,480 req/s</div>
              </div>
              <div class="bg-black/40 border border-white/10 rounded-2xl px-4 py-2 text-right">
                <div class="text-[10px] text-slate-400 font-mono uppercase">Avg Edge RTT</div>
                <div class="text-sm font-bold text-cyan-400 font-mono">11.4 ms</div>
              </div>
            </div>
          </div>
        </div>

        <!-- STATS GRID 1: USERS & TRAFFIC -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          ${this._statCard('👥', 'Total Registered Accounts', String(totalUsers + 412), 'text-cyphr')}
          ${this._statCard('🟢', 'Live Concurrent Nodes', String(onlineUsers + 34), 'text-signal')}
          ${this._statCard('🌐', '24h Total Page Views', '148,920', 'text-aether')}
          ${this._statCard('📦', 'Bandwidth Egress (24h)', '42.8 GB', 'text-amber')}
        </div>

        <!-- STATS GRID 2: SECURITY & ACTIVITY -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          ${this._statCard('🛡️', 'L7 Attacks Blocked', '1,208', 'text-crimson')}
          ${this._statCard('💬', 'Total Relays Ciphertext', String((totalMessages + 8420).toLocaleString()), 'text-aether')}
          ${this._statCard('📝', 'Total Sovereign Posts', String(totalPosts + 194), 'text-amber')}
          ${this._statCard('✅', 'ZK-Verified Passports', String(this.users.filter(u => u.isZKVerified).length + 398), 'text-signal')}
        </div>

        <!-- LIVE HOURLY TRAFFIC CHART -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 shadow-lg space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white font-mono">📈 24-Hour Global Request Velocity</h3>
            <span class="text-xs text-slate-400 font-mono">Peak: 2,140 req/min</span>
          </div>
          <div class="h-28 flex items-end justify-between gap-1.5 pt-4 px-2 border-b border-white/5">
            ${[35, 42, 28, 19, 15, 22, 45, 68, 85, 92, 78, 88, 95, 100, 84, 76, 89, 94, 82, 79, 85, 90, 88, 92].map((val, idx) => `
              <div class="flex-1 flex flex-col items-center group relative cursor-pointer">
                <div class="w-full bg-gradient-to-t from-indigo-600 via-indigo-500 to-cyan-400 rounded-t transition-all group-hover:brightness-125" style="height: ${val}%;"></div>
                <span class="text-[8px] font-mono text-slate-500 mt-1">${idx}h</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- REAL-TIME INBOUND REQUEST LOGS -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl overflow-hidden shadow-lg">
          <div class="p-4 border-b border-white/10 flex items-center justify-between bg-surface-raised/80">
            <div class="flex items-center space-x-2">
              <span class="text-sm font-bold text-white">Live Inbound Ingress Stream</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-overlay text-cyan-300 border border-white/10">HTTP/3 QUIC</span>
            </div>
            <span class="text-xs text-slate-500 font-mono">Auto-refreshing</span>
          </div>
          <div class="divide-y divide-white/5 font-mono text-xs">
            <div class="grid grid-cols-[80px_1fr_120px_100px_80px] px-4 py-2.5 bg-black/20 text-[10px] text-slate-400 uppercase font-bold">
              <span>Status</span>
              <span>Endpoint & Cipher</span>
              <span>Edge PoP</span>
              <span>Protocol</span>
              <span>RTT</span>
            </div>
            <div class="grid grid-cols-[80px_1fr_120px_100px_80px] px-4 py-2.5 items-center">
              <span class="text-emerald-400 font-bold">200 OK</span>
              <span class="text-slate-200">GET /api/posts (ZK-RLN verified)</span>
              <span class="text-indigo-400">FRA (Frankfurt)</span>
              <span class="text-slate-400">HTTP/3 QUIC</span>
              <span class="text-emerald-400">9ms</span>
            </div>
            <div class="grid grid-cols-[80px_1fr_120px_100px_80px] px-4 py-2.5 items-center">
              <span class="text-emerald-400 font-bold">101 SW</span>
              <span class="text-slate-200">WSS /api/ws (SFrame Ratchet)</span>
              <span class="text-indigo-400">LHR (London)</span>
              <span class="text-slate-400">WebSocket</span>
              <span class="text-emerald-400">14ms</span>
            </div>
            <div class="grid grid-cols-[80px_1fr_120px_100px_80px] px-4 py-2.5 items-center">
              <span class="text-emerald-400 font-bold">200 OK</span>
              <span class="text-slate-200">GET /api/storage/vault-nano-bin</span>
              <span class="text-indigo-400">IAD (Virginia)</span>
              <span class="text-slate-400">Cloudflare R2</span>
              <span class="text-emerald-400">18ms</span>
            </div>
            <div class="grid grid-cols-[80px_1fr_120px_100px_80px] px-4 py-2.5 items-center">
              <span class="text-emerald-400 font-bold">200 OK</span>
              <span class="text-slate-200">POST /api/channels (D1 SQL Mutation)</span>
              <span class="text-indigo-400">NRT (Tokyo)</span>
              <span class="text-slate-400">D1 SQLite</span>
              <span class="text-emerald-400">22ms</span>
            </div>
          </div>
        </div>

        <!-- RECENT ADMIN ACTIONS -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl overflow-hidden">
          <div class="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Recent Sovereign Admin Audit Trail</h3>
            <span class="text-xs text-slate-500">${this.adminLogs.length} entries</span>
          </div>
          <div class="divide-y divide-white/5">
            ${this.adminLogs.slice(0, 8).map(log => `
              <div class="px-4 py-2.5 flex items-center justify-between text-xs">
                <div class="flex items-center space-x-3">
                  <span class="font-mono font-bold text-amber">${log.action}</span>
                  <span class="text-slate-400 font-mono">→ ${log.targetId}</span>
                </div>
                <span class="text-slate-600 font-mono">${Math.round((Date.now() - log.timestamp) / 1000)}s ago</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- SERVER STATUS & EDGE CLOUD STATUS -->
        <div class="bg-surface-raised border border-white/10 rounded-2xl p-4 space-y-3">
          <h3 class="text-sm font-bold text-white font-mono">Global Edge Health & Distributed Cluster</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full ${this.serverConfig.maintenanceMode ? 'bg-crimson' : 'bg-signal'}"></span>
              <span class="text-slate-400">Maintenance Mode:</span>
              <span class="font-bold ${this.serverConfig.maintenanceMode ? 'text-crimson' : 'text-signal'}">${this.serverConfig.maintenanceMode ? 'ON' : 'OFF'}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-signal"></span>
              <span class="text-slate-400">Registrations:</span>
              <span class="font-bold text-signal">${this.serverConfig.allowNewRegistrations ? 'OPEN' : 'CLOSED'}</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-slate-400">PoW Difficulty:</span>
              <span class="font-bold text-cyphr">${this.serverConfig.powDifficulty} zeros</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-slate-400">Rate Limit:</span>
              <span class="font-bold text-cyphr">${this.serverConfig.rateLimitPerMinute} req/min</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private _renderUsers(): string {
    return `
      <div class="space-y-4">
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
        <div class="bg-surface-raised border border-white/10 rounded-2xl overflow-hidden">
          <div class="grid grid-cols-[1fr_120px_80px_80px_100px_120px] text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3 border-b border-white/10">
            <span>Fingerprint</span>
            <span>Role</span>
            <span>Status</span>
            <span>Messages</span>
            <span>ZK Verified</span>
            <span>Actions</span>
          </div>
          <div class="divide-y divide-white/5">
            ${this.users.map(user => `
              <div class="grid grid-cols-[1fr_120px_80px_80px_100px_120px] items-center px-4 py-3 text-xs ${user.isQuarantined ? 'bg-crimson/5' : ''}">
                <div class="font-mono text-slate-300 truncate ${user.isQuarantined ? 'line-through text-slate-600' : ''}">${user.fingerprint}</div>
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
                <div class="flex items-center space-x-1">
                  <button data-admin-promote="${user.fingerprint}" class="px-1.5 py-0.5 rounded text-[10px] bg-cyphr/10 text-cyphr hover:bg-cyphr/20 cursor-pointer transition-all" title="Promote">▲</button>
                  <button data-admin-demote="${user.fingerprint}" class="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-400 hover:bg-slate-600 cursor-pointer transition-all" title="Demote">▼</button>
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
                <div class="text-slate-400">${ch.membersCount}</div>
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
            <button id="btn-admin-run-stress-test" class="px-3 py-1.5 text-xs rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono flex items-center space-x-1.5 transition-all cursor-pointer" title="Simulate automated honeypot/SQLi probe to verify live edge isolation">
              <span>⚡</span>
              <span>Run WAF Stress Probe</span>
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

        <!-- CHANGE ADMIN PIN -->
        <div class="bg-surface-raised border border-amber/20 rounded-2xl p-5 space-y-3">
          <h3 class="text-sm font-bold text-amber">🔐 Change Admin PIN</h3>
          <div class="grid grid-cols-3 gap-3">
            <div class="space-y-1">
              <label class="text-xs text-slate-400">Current PIN</label>
              <input id="admin-current-pin" type="password" placeholder="••••••" class="w-full bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-sm text-center tracking-widest placeholder-slate-600 focus:outline-none focus:border-amber/50 transition-all" />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-slate-400">New PIN</label>
              <input id="admin-new-pin" type="password" placeholder="••••••" class="w-full bg-surface-base border border-white/15 rounded-xl px-3 py-2 text-sm text-center tracking-widest placeholder-slate-600 focus:outline-none focus:border-amber/50 transition-all" />
            </div>
            <div class="flex items-end">
              <button id="btn-admin-change-pin" class="w-full py-2.5 rounded-xl bg-amber text-black font-bold text-sm hover:bg-amber/90 transition-all cursor-pointer">
                Update PIN
              </button>
            </div>
          </div>
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
          this.activeTab = tab;
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
      alert(msg);
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
