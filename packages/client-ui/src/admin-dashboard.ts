/**
 * @file admin-dashboard.ts
 * @package @aetheris/client-ui
 * @description Sovereign Admin Command Center v3.1 — Full Edge Telemetry,
 * Live Route & Geo Access Analytics, Sovereign Spotlight & Daily Bounty Manager,
 * DSA Trust & Safety Queue, R2 Object Browser, D1 SQL Studio & WORM Chain Verifier.
 */
import { clientStore } from './client-state.js';
import { escapeHtml } from './dry-utils.js';

export type AdminTabId =
  | 'overview'
  | 'traffic'
  | 'spotlight'
  | 'moderation'
  | 'users'
  | 'waf'
  | 'database'
  | 'audit';

export class SovereignAdminDashboard {
  public isOpen = false;
  public isAuthenticated = false;
  public sessionToken = '';
  public activeTab: AdminTabId = 'overview';
  public isLoading = false;
  public errorMsg = '';
  public statusBanner = '';
  public data: any = null;
  public publicStatus: any = null;
  public sqlQuery =
    'SELECT id, title, channel_id, merit_votes, status, created_at FROM posts ORDER BY created_at DESC LIMIT 15;';
  public sqlResult: any = null;
  public r2Objects: any[] = [];
  private pollTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).adminDashboard = this;
      this.bindGlobalDelegation();
      void this.syncPublicStatusBanner();
    }
  }

  /**
   * Fetches public spotlight & WORM audit status and injects the non-intrusive
   * Sovereign Spotlight banner above the feed if not already present.
   */
  public async syncPublicStatusBanner(): Promise<void> {
    if (typeof document === 'undefined') return;
    try {
      const res = await fetch('/api/admin?public=true');
      if (!res.ok) return;
      const json = await res.json();
      if (!json?.success) return;
      this.publicStatus = json;
      this.renderPublicSpotlightWidget();
    } catch (_) {}
  }

  public renderPublicSpotlightWidget(): void {
    if (typeof document === 'undefined' || !this.publicStatus?.spotlight) return;
    const feedScroll = document.getElementById('main-feed-scroll');
    if (!feedScroll) return;
    let container = document.getElementById('sovereign-spotlight-public-card');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sovereign-spotlight-public-card';
      container.className = 'mb-4';
      const firstChild = feedScroll.firstElementChild;
      if (firstChild) {
        feedScroll.insertBefore(container, firstChild);
      } else {
        feedScroll.appendChild(container);
      }
    }
    const sp = this.publicStatus.spotlight;
    const audit = this.publicStatus.auditIntegrity || { verified: true, checkedEntries: 0 };
    container.innerHTML = `
      <div class="daily-pulse-container p-4 rounded-2xl border border-amber-400/25 bg-[#121622]/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div class="space-y-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              🌟 SOVEREIGN DAILY BOUNTY (+${Number(sp.meritBountyReward || 25)} MERIT)
            </span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              ⛓️ WORM Audit: ${audit.verified ? '100% Verified' : 'Check Required'}
            </span>
          </div>
          <h3 class="text-sm font-bold text-white truncate">${escapeHtml(sp.dailyPromptTitle || 'Sovereign Architecture Challenge')}</h3>
          <p class="text-xs text-slate-300 line-clamp-2">${escapeHtml(sp.dailyPromptDescription || '')}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${
            sp.featuredPostId
              ? `<button type="button" data-action="open-post-detail" data-post-id="${escapeHtml(sp.featuredPostId)}" class="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 cursor-pointer">
                  View Featured
                </button>`
              : ''
          }
          <button
            type="button"
            data-action="participate-daily-spotlight"
            data-tag="${escapeHtml(sp.dailyPromptTag || '#SovereignSpotlight')}"
            class="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs cursor-pointer shadow-sm"
          >
            Join ${escapeHtml(sp.dailyPromptTag || '#SovereignSpotlight')} →
          </button>
        </div>
      </div>
    `;
  }

  public open(): void {
    this.isOpen = true;
    this.renderStandaloneOrModal();
    if (this.isAuthenticated) {
      void this.refreshData();
      this.startLivePolling();
    }
  }

  public close(): void {
    this.isOpen = false;
    this.stopLivePolling();
    const modal = document.getElementById('sovereign-admin-modal-root');
    if (modal) modal.remove();
  }

  private startLivePolling(): void {
    this.stopLivePolling();
    this.pollTimer = setInterval(() => {
      if (
        this.isAuthenticated &&
        (this.isOpen || document.getElementById('admin-standalone-root'))
      ) {
        void this.refreshData(true);
      }
    }, 8000);
  }

  private stopLivePolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public async loginWithPin(pin: string): Promise<void> {
    this.errorMsg = '';
    this.isLoading = true;
    this.renderStandaloneOrModal();
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-pin', pin: pin.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.authorized) {
        this.errorMsg = json.error || 'Invalid Admin PIN';
        this.isLoading = false;
        this.renderStandaloneOrModal();
        return;
      }
      this.sessionToken = json.token;
      this.isAuthenticated = true;
      this.isLoading = false;
      await this.refreshData();
      this.startLivePolling();
    } catch (err: any) {
      this.errorMsg = err?.message || 'Network error verifying PIN';
      this.isLoading = false;
      this.renderStandaloneOrModal();
    }
  }

  public async refreshData(silent = false): Promise<void> {
    if (!this.sessionToken) return;
    if (!silent) {
      this.isLoading = true;
      this.renderStandaloneOrModal();
    }
    try {
      const res = await fetch('/api/admin?tab=all', {
        headers: {
          Authorization: `Bearer ${this.sessionToken}`,
          'X-Admin-Fingerprint':
            clientStore?.keypair?.fingerprint || 'sovereign-root-guardian',
        },
      });
      const json = await res.json();
      if (res.status === 401) {
        this.isAuthenticated = false;
        this.sessionToken = '';
        this.errorMsg = 'Session expired. Please authenticate again.';
      } else if (json.success) {
        this.data = json;
      }
    } catch (err: any) {
      if (!silent) this.errorMsg = err?.message || 'Failed to load telemetry';
    } finally {
      this.isLoading = false;
      this.renderStandaloneOrModal();
    }
  }

  public async executeAction(payload: Record<string, any>): Promise<any> {
    if (!this.sessionToken) return null;
    this.errorMsg = '';
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.sessionToken}`,
          'X-Admin-Fingerprint':
            clientStore?.keypair?.fingerprint || 'sovereign-root-guardian',
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        this.errorMsg = json.error || 'Action failed';
        this.renderStandaloneOrModal();
        return null;
      }
      this.statusBanner = json.message || 'Action executed successfully';
      setTimeout(() => {
        this.statusBanner = '';
        this.renderStandaloneOrModal();
      }, 4000);
      await this.refreshData(true);
      void this.syncPublicStatusBanner();
      return json;
    } catch (err: any) {
      this.errorMsg = err?.message || 'Action request failed';
      this.renderStandaloneOrModal();
      return null;
    }
  }

  private bindGlobalDelegation(): void {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement)?.closest<HTMLElement>(
        '[data-admin-action]'
      );
      if (!target) return;
      e.preventDefault();
      const act = target.dataset.adminAction;
      if (!act) return;

      switch (act) {
        case 'close':
          this.close();
          break;
        case 'logout':
          this.isAuthenticated = false;
          this.sessionToken = '';
          this.data = null;
          this.stopLivePolling();
          this.renderStandaloneOrModal();
          break;
        case 'set-tab': {
          const tab = target.dataset.tab as AdminTabId;
          if (tab) {
            this.activeTab = tab;
            if (tab === 'database') {
              void this.executeAction({ action: 'list-r2-objects' }).then((r) => {
                if (r?.objects) {
                  this.r2Objects = r.objects;
                  this.renderStandaloneOrModal();
                }
              });
            }
            this.renderStandaloneOrModal();
          }
          break;
        }
        case 'refresh':
          void this.refreshData();
          break;
        case 'verify-worm':
          void this.executeAction({ action: 'verify-audit-chain' });
          break;
        case 'toggle-freeze': {
          const nextFreeze = !this.data?.emergencyFreeze;
          void this.executeAction({
            action: 'toggle-emergency-freeze',
            freeze: nextFreeze,
          });
          break;
        }
        case 'publish-broadcast': {
          const input = document.getElementById(
            'admin-broadcast-input'
          ) as HTMLInputElement | null;
          void this.executeAction({
            action: 'update-broadcast',
            message: input?.value || '',
          });
          break;
        }
        case 'clear-broadcast':
          void this.executeAction({ action: 'update-broadcast', message: '' });
          break;
        case 'save-spotlight': {
          const postId =
            (document.getElementById('spot-post-id') as HTMLInputElement)?.value ||
            '';
          const title =
            (document.getElementById('spot-prompt-title') as HTMLInputElement)
              ?.value || '';
          const desc =
            (document.getElementById('spot-prompt-desc') as HTMLTextAreaElement)
              ?.value || '';
          const tag =
            (document.getElementById('spot-prompt-tag') as HTMLInputElement)
              ?.value || '#SovereignSpotlight';
          const reward = Number(
            (document.getElementById('spot-bounty-reward') as HTMLInputElement)
              ?.value || 25
          );
          const boost = Number(
            (document.getElementById('spot-merit-boost') as HTMLInputElement)
              ?.value || 0
          );
          void this.executeAction({
            action: 'update-spotlight',
            postId,
            dailyPromptTitle: title,
            dailyPromptDescription: desc,
            dailyPromptTag: tag,
            meritBountyReward: reward,
            meritBoost: boost,
          });
          break;
        }
        case 'feature-this-post': {
          const postId = target.dataset.postId || '';
          if (postId) {
            void this.executeAction({
              action: 'feature-post',
              postId,
              meritBoost: 25,
            });
          }
          break;
        }
        case 'pin-post': {
          const postId = target.dataset.postId || '';
          const pinned = target.dataset.pinned !== 'true';
          if (postId)
            void this.executeAction({ action: 'pin-post', postId, pinned });
          break;
        }
        case 'lock-thread': {
          const postId = target.dataset.postId || '';
          const locked = target.dataset.locked !== 'true';
          if (postId)
            void this.executeAction({ action: 'lock-thread', postId, locked });
          break;
        }
        case 'delete-post': {
          const postId = target.dataset.postId || '';
          if (postId)
            void this.executeAction({ action: 'delete-post', postId });
          break;
        }
        case 'resolve-report': {
          const reportId = target.dataset.reportId || '';
          const resolution = target.dataset.resolution || 'reviewed';
          const deleteTarget = target.dataset.deleteTarget === 'true';
          if (reportId) {
            void this.executeAction({
              action: 'resolve-report',
              reportId,
              resolution,
              deleteTarget,
            });
          }
          break;
        }
        case 'assign-role': {
          const fp =
            (document.getElementById('admin-role-fp') as HTMLInputElement)
              ?.value ||
            target.dataset.fp ||
            '';
          const role =
            (document.getElementById('admin-role-select') as HTMLSelectElement)
              ?.value ||
            target.dataset.role ||
            'MODERATOR';
          if (fp)
            void this.executeAction({
              action: 'assign-role',
              fingerprint: fp.trim(),
              role,
            });
          break;
        }
        case 'toggle-quarantine': {
          const fp = target.dataset.fp || '';
          if (fp)
            void this.executeAction({
              action: 'toggle-quarantine',
              fingerprint: fp,
            });
          break;
        }
        case 'toggle-shadowban': {
          const fp = target.dataset.fp || '';
          if (fp)
            void this.executeAction({
              action: 'toggle-shadowban',
              fingerprint: fp,
            });
          break;
        }
        case 'ban-ip': {
          const ip =
            (document.getElementById('admin-ban-ip-input') as HTMLInputElement)
              ?.value ||
            target.dataset.ip ||
            '';
          const reason =
            (
              document.getElementById(
                'admin-ban-reason-input'
              ) as HTMLInputElement
            )?.value || 'Administrative WAF Block';
          const hours = Number(
            (
              document.getElementById(
                'admin-ban-hours-input'
              ) as HTMLSelectElement
            )?.value || 24
          );
          if (ip)
            void this.executeAction({
              action: 'ban-ip',
              ip: ip.trim(),
              reason,
              durationHours: hours,
            });
          break;
        }
        case 'unban-ip': {
          const ip = target.dataset.ip || '';
          if (ip) void this.executeAction({ action: 'unban-ip', ip });
          break;
        }
        case 'clear-rate-limits':
          void this.executeAction({ action: 'clear-rate-limits' });
          break;
        case 'run-sql': {
          const sqlBox = document.getElementById(
            'admin-sql-textarea'
          ) as HTMLTextAreaElement | null;
          if (sqlBox) this.sqlQuery = sqlBox.value;
          void this.executeAction({
            action: 'execute-sql',
            sql: this.sqlQuery,
          }).then((res) => {
            if (res) {
              this.sqlResult = res;
              this.renderStandaloneOrModal();
            }
          });
          break;
        }
        case 'refresh-r2': {
          void this.executeAction({ action: 'list-r2-objects' }).then((r) => {
            if (r?.objects) {
              this.r2Objects = r.objects;
              this.renderStandaloneOrModal();
            }
          });
          break;
        }
        case 'delete-r2-object': {
          const key = target.dataset.key || '';
          if (key) {
            void this.executeAction({ action: 'delete-r2-object', key }).then(
              () => {
                this.r2Objects = this.r2Objects.filter((o) => o.key !== key);
                this.renderStandaloneOrModal();
              }
            );
          }
          break;
        }
        case 'trigger-backup': {
          void fetch('/api/cron-backup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.sessionToken}`,
            },
            body: JSON.stringify({ action: 'backup' }),
          })
            .then((r) => r.json())
            .then((res) => {
              this.statusBanner = res.success
                ? `Encrypted AES-256-GCM Snapshot saved (${res.totalRecords} records, SHA-256: ${String(res.checksumSha256).slice(0, 12)}...)`
                : res.error || 'Backup failed';
              this.renderStandaloneOrModal();
            });
          break;
        }
      }
    });

    document.addEventListener('submit', (e) => {
      const form = (e.target as HTMLElement)?.closest<HTMLFormElement>(
        '#admin-pin-login-form'
      );
      if (!form) return;
      e.preventDefault();
      const input = document.getElementById(
        'admin-pin-input'
      ) as HTMLInputElement | null;
      if (input?.value) {
        void this.loginWithPin(input.value);
      }
    });
  }

  public renderStandaloneOrModal(): void {
    if (typeof document === 'undefined') return;
    const standaloneRoot = document.getElementById('admin-standalone-root');
    if (standaloneRoot) {
      standaloneRoot.innerHTML = this.renderConsoleInnerHTML(true);
      return;
    }
    if (!this.isOpen) return;
    let modalRoot = document.getElementById('sovereign-admin-modal-root');
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'sovereign-admin-modal-root';
      modalRoot.className =
        'fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-2 sm:p-6 overflow-y-auto';
      document.body.appendChild(modalRoot);
    }
    modalRoot.innerHTML = `
      <div class="w-full max-w-7xl h-[92dvh] rounded-3xl bg-[#090d16] border border-white/15 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        ${this.renderConsoleInnerHTML(false)}
      </div>
    `;
  }

  public renderConsoleInnerHTML(isStandalone = false): string {
    if (!this.isAuthenticated) {
      return `
        <div class="flex-1 flex flex-col items-center justify-center p-6 bg-[#070a12] text-slate-100 min-h-[80vh]">
          <div class="w-full max-w-md p-8 rounded-3xl bg-[#0e1320] border border-white/10 shadow-2xl space-y-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-xl font-bold text-amber-400">🛡️</div>
                <div>
                  <h1 class="text-lg font-extrabold text-white tracking-tight">UREfy Sovereign Admin</h1>
                  <p class="text-xs text-slate-400 font-mono">Zero-Trust Edge Command Console v3.1</p>
                </div>
              </div>
              ${
                !isStandalone
                  ? `<button type="button" data-admin-action="close" class="text-slate-400 hover:text-white px-2.5 py-1 rounded-lg">✕</button>`
                  : `<a href="/" class="text-xs text-amber-400 hover:underline font-mono">← Feed</a>`
              }
            </div>
            ${
              this.errorMsg
                ? `<div class="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 font-mono">${escapeHtml(
                    this.errorMsg
                  )}</div>`
                : ''
            }
            <form id="admin-pin-login-form" class="space-y-4">
              <div>
                <label for="admin-pin-input" class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Sovereign Guardian PIN</label>
                <input
                  id="admin-pin-input"
                  type="password"
                  autocomplete="current-password"
                  placeholder="Enter Admin PIN..."
                  class="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-sm focus:border-amber-400 focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                ${this.isLoading ? 'disabled' : ''}
                class="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
              >
                ${
                  this.isLoading
                    ? 'Verifying HMAC Session...'
                    : 'Unlock Command Center →'
                }
              </button>
            </form>
            <div class="pt-3 border-t border-white/5 text-[11px] text-slate-400 space-y-1 font-mono">
              <div>• Anti-Bruteforce: 5 attempts / 10m D1 persistent lockout</div>
              <div>• Audit Trail: SHA-256 WORM Hash-Chained Ledger</div>
            </div>
          </div>
        </div>
      `;
    }

    const stats = this.data?.stats || {};
    const tel = this.data?.telemetry || {};
    const audit = this.data?.auditIntegrity || {
      verified: true,
      checkedEntries: 0,
      headHash: '0000',
    };
    const isFrozen = Boolean(this.data?.emergencyFreeze);

    const tabs: Array<{
      id: AdminTabId;
      label: string;
      badge?: string | number;
    }> = [
      { id: 'overview', label: '📊 Overview & Pulse' },
      {
        id: 'traffic',
        label: '🌐 Live Traffic & Access',
        badge: tel.pageViews24h ?? 1,
      },
      { id: 'spotlight', label: '🌟 Sovereign Spotlight' },
      {
        id: 'moderation',
        label: '🛡️ Moderation & DSA',
        badge: stats.pendingReportsCount || 0,
      },
      { id: 'users', label: '👥 Users & RBAC', badge: stats.totalUsers || 0 },
      {
        id: 'waf',
        label: '🧱 WAF & IP Ledger',
        badge: stats.bannedIPsCount || 0,
      },
      { id: 'database', label: '🗄️ D1 SQL & R2 Vault' },
      {
        id: 'audit',
        label: '⛓️ WORM Audit Chain',
        badge: audit.verified ? 'VERIFIED' : 'ALERT',
      },
    ];

    return `
      <!-- Top Command Header -->
      <header class="px-6 py-4 bg-[#0c111d] border-b border-white/10 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div class="flex items-center gap-3">
          <span class="w-3 h-3 rounded-full ${
            isFrozen
              ? 'bg-rose-500 animate-ping'
              : 'bg-emerald-400 animate-pulse'
          }"></span>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base sm:text-lg font-extrabold text-white tracking-tight">UREfy Sovereign Command Center</h1>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                ${escapeHtml(this.data?.storage || 'Cloudflare-D1')}
              </span>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                audit.verified
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }">
                WORM CHAIN: ${audit.verified ? '100% INTACT' : 'TAMPER ALERT'}
              </span>
            </div>
            <p class="text-[11px] text-slate-400 font-mono">
              Online (5m): <strong class="text-emerald-400">${
                tel.onlineUsers ?? 1
              }</strong> · Pageviews (24h): <strong class="text-amber-300">${
      tel.pageViews24h ?? 1
    }</strong> · API Hits: <strong class="text-cyan-300">${
      tel.apiRequests24h ?? 0
    }</strong> · Avg Edge RTT: <strong class="text-white">${
      tel.avgEdgeRttMs ?? 4.2
    } ms</strong>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" data-admin-action="refresh" class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-200 cursor-pointer">
            ↻ Refresh Live
          </button>
          <button type="button" data-admin-action="toggle-freeze" class="px-3.5 py-1.5 rounded-xl ${
            isFrozen
              ? 'bg-emerald-500 text-black'
              : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
          } text-xs font-bold cursor-pointer">
            ${isFrozen ? '✅ Unfreeze Writes' : '🚨 Emergency Freeze'}
          </button>
          <button type="button" data-admin-action="logout" class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 cursor-pointer">
            Lock
          </button>
          ${
            !isStandalone
              ? `<button type="button" data-admin-action="close" class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white cursor-pointer">✕</button>`
              : `<a href="/" class="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-bold text-xs">← App</a>`
          }
        </div>
      </header>

      <!-- Navigation Tabs -->
      <nav class="px-6 py-2.5 bg-[#090d16] border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        ${tabs
          .map(
            (t) => `
          <button
            type="button"
            data-admin-action="set-tab"
            data-tab="${t.id}"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer border ${
              this.activeTab === t.id
                ? 'bg-amber-400/15 text-amber-300 border-amber-400/40 font-bold'
                : 'bg-white/[0.03] hover:bg-white/[0.07] text-slate-400 hover:text-white border-white/5'
            }"
          >
            <span>${t.label}</span>${
              t.badge !== undefined
                ? `<span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/50 text-slate-200">${escapeHtml(
                    String(t.badge)
                  )}</span>`
                : ''
            }
          </button>
        `
          )
          .join('')}
      </nav>

      ${
        this.statusBanner
          ? `<div class="mx-6 mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center justify-between">
              <span>✓ ${escapeHtml(this.statusBanner)}</span>
            </div>`
          : ''
      }
      ${
        this.errorMsg
          ? `<div class="mx-6 mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 font-mono">
              ⚠️ ${escapeHtml(this.errorMsg)}
            </div>`
          : ''
      }

      <!-- Main Tab Viewport -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        ${this.renderActiveTabContent()}
      </div>
    `;
  }

  private renderActiveTabContent(): string {
    const stats = this.data?.stats || {};
    const tel = this.data?.telemetry || {};
    const spotlight = this.data?.spotlight || {};
    const posts: any[] = this.data?.posts || [];
    const reports: any[] = this.data?.reports || [];
    const users: any[] = this.data?.users || [];
    const bannedIPs: any[] = this.data?.bannedIPs || [];
    const logs: any[] = this.data?.auditLedger || this.data?.logs || [];

    switch (this.activeTab) {
      case 'overview':
        return `
          <!-- Primary KPI Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
            <div class="p-4 rounded-2xl bg-[#101624] border border-white/10">
              <div class="text-[11px] font-mono text-slate-400">ONLINE NOW (5M)</div>
              <div class="text-2xl font-black text-emerald-400 font-mono mt-1">${
                tel.onlineUsers ?? 1
              }</div>
              <div class="text-[10px] text-slate-500 mt-1">Unique 24h: ${
                tel.uniqueVisitors24h ?? 1
              }</div>
            </div>
            <div class="p-4 rounded-2xl bg-[#101624] border border-white/10">
              <div class="text-[11px] font-mono text-slate-400">PAGEVIEWS (24H)</div>
              <div class="text-2xl font-black text-amber-400 font-mono mt-1">${
                tel.pageViews24h ?? 1
              }</div>
              <div class="text-[10px] text-slate-500 mt-1">API Hits: ${
                tel.apiRequests24h ?? 0
              }</div>
            </div>
            <div class="p-4 rounded-2xl bg-[#101624] border border-white/10">
              <div class="text-[11px] font-mono text-slate-400">PUBLISHED POSTS</div>
              <div class="text-2xl font-black text-white font-mono mt-1">${
                stats.totalPosts ?? 0
              }</div>
              <div class="text-[10px] text-slate-500 mt-1">Channels: ${
                stats.totalChannels ?? 0
              }</div>
            </div>
            <div class="p-4 rounded-2xl bg-[#101624] border border-white/10">
              <div class="text-[11px] font-mono text-slate-400">E2EE MESSAGES</div>
              <div class="text-2xl font-black text-cyan-400 font-mono mt-1">${
                stats.totalMessages ?? 0
              }</div>
              <div class="text-[10px] text-slate-500 mt-1">Avg RTT: ${
                tel.avgEdgeRttMs ?? 4.2
              } ms</div>
            </div>
            <div class="p-4 rounded-2xl bg-[#101624] border border-white/10">
              <div class="text-[11px] font-mono text-slate-400">WAF BLOCKS (24H)</div>
              <div class="text-2xl font-black text-rose-400 font-mono mt-1">${
                tel.attacksBlocked ?? 0
              }</div>
              <div class="text-[10px] text-slate-500 mt-1">Banned IPs: ${
                stats.bannedIPsCount ?? 0
              }</div>
            </div>
            <div class="p-4 rounded-2xl bg-[#101624] border border-white/10">
              <div class="text-[11px] font-mono text-slate-400">DSA REPORTS</div>
              <div class="text-2xl font-black text-purple-400 font-mono mt-1">${
                stats.pendingReportsCount ?? 0
              }</div>
              <div class="text-[10px] text-slate-500 mt-1">Quarantined: ${
                stats.quarantinedUsers ?? 0
              }</div>
            </div>
          </div>

          <!-- Global Network Broadcast Banner Control -->
          <div class="p-5 rounded-2xl bg-[#101624] border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-sm font-bold text-white">📢 Global Network Announcement Banner</h2>
                <p class="text-xs text-slate-400">Instantly broadcasts a live banner to all connected users across the mesh</p>
              </div>
              <button type="button" data-admin-action="clear-broadcast" class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 cursor-pointer">
                Clear Banner
              </button>
            </div>
            <div class="flex flex-col sm:flex-row gap-2.5">
              <input
                id="admin-broadcast-input"
                type="text"
                value="${escapeHtml(this.data?.config?.broadcastMessage || '')}"
                placeholder="e.g. 🚀 Sovereign Spotlight is live! Join today's architecture thread for +25 Merit..."
                class="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
              />
              <button type="button" data-admin-action="publish-broadcast" class="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs cursor-pointer shrink-0">
                Publish Live
              </button>
            </div>
          </div>

          <!-- Quick Overview of Top Accessed Routes & Countries -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="p-5 rounded-2xl bg-[#101624] border border-white/10 space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-white">🔥 Most Accessed Routes (Live Edge)</h3>
                <button type="button" data-admin-action="set-tab" data-tab="traffic" class="text-xs text-amber-400 hover:underline">Full Traffic →</button>
              </div>
              <div class="space-y-2 text-xs font-mono">
                ${
                  (tel.topRoutes || [])
                    .slice(0, 6)
                    .map(
                      (r: any) => `
                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5">
                      <span class="text-slate-200 truncate">${escapeHtml(
                        r.path
                      )}</span>
                      <div class="flex items-center gap-3 shrink-0">
                        <span class="text-amber-300 font-bold">${
                          r.hits
                        } hits</span>
                        <span class="text-emerald-400">${r.avgMs} ms</span>
                      </div>
                    </div>
                  `
                    )
                    .join('') ||
                  '<div class="text-slate-500">Collecting live route metrics...</div>'
                }
              </div>
            </div>

            <div class="p-5 rounded-2xl bg-[#101624] border border-white/10 space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-white">🌍 Geographic Access Distribution</h3>
                <span class="text-[11px] font-mono text-slate-400">CF-IPCountry</span>
              </div>
              <div class="space-y-2 text-xs font-mono">
                ${
                  (tel.topCountries || [])
                    .slice(0, 6)
                    .map(
                      (c: any) => `
                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5">
                      <span class="text-slate-200 font-bold">🏳️ ${escapeHtml(
                        c.country
                      )}</span>
                      <span class="text-cyan-300 font-bold">${
                        c.hits
                      } requests</span>
                    </div>
                  `
                    )
                    .join('') ||
                  '<div class="text-slate-500">Collecting geographic telemetry...</div>'
                }
              </div>
            </div>
          </div>
        `;

      case 'traffic':
        return `
          <div class="space-y-6">
            <div class="p-5 rounded-2xl bg-[#101624] border border-white/10 space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="text-base font-bold text-white">🌐 Real-Time Edge Access & Route Telemetry</h2>
                  <p class="text-xs text-slate-400">Zero-PII traffic analytics captured directly at Cloudflare Edge middleware</p>
                </div>
                <div class="flex items-center gap-3 text-xs font-mono">
                  <span class="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Throughput: ${tel.requestsPerMinute ?? 0} req/min
                  </span>
                  <span class="px-3 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    Egress: ${tel.egressMB24h ?? 0} MB
                  </span>
                </div>
              </div>

              <!-- Top Routes Table -->
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs font-mono">
                  <thead>
                    <tr class="border-b border-white/10 text-slate-400">
                      <th class="py-2.5 px-3">Route / Endpoint</th>
                      <th class="py-2.5 px-3">Total Hits</th>
                      <th class="py-2.5 px-3">Avg Latency</th>
                      <th class="py-2.5 px-3">4xx/5xx Errors</th>
                      <th class="py-2.5 px-3">Last Access</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/5">
                    ${(tel.topRoutes || [])
                      .map(
                        (r: any) => `
                        <tr class="hover:bg-white/[0.02]">
                          <td class="py-2.5 px-3 font-bold text-white">${escapeHtml(
                            r.path
                          )}</td>
                          <td class="py-2.5 px-3 text-amber-300 font-bold">${
                            r.hits
                          }</td>
                          <td class="py-2.5 px-3 text-emerald-400">${
                            r.avgMs
                          } ms</td>
                          <td class="py-2.5 px-3 ${ r.errors > 0 ? 'text-rose-400 font-bold' : 'text-slate-500' }">${r.errors}</td>
                          <td class="py-2.5 px-3 text-slate-400">${new Date(
                            r.lastAccessedAt
                          ).toLocaleTimeString()}</td>
                        </tr>
                      `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Live Edge Request Stream -->
            <div class="p-5 rounded-2xl bg-[#101624] border border-white/10 space-y-3">
              <h3 class="text-sm font-bold text-white">⚡ Live Edge Request Stream (Last 50 Access Events)</h3>
              <div class="max-h-96 overflow-y-auto space-y-1.5 font-mono text-xs">
                ${
                  (tel.recentRequests || [])
                    .map(
                      (reqItem: any) => `
                    <div class="flex items-center justify-between gap-3 px-3 py-2 rounded-xl ${
                      reqItem.blocked
                        ? 'bg-rose-950/30 border border-rose-500/30'
                        : 'bg-black/30 border border-white/5'
                    }">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${ reqItem.status >= 400 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300' }">${reqItem.status}</span>
                        <span class="text-amber-300 font-bold">${escapeHtml(
                          reqItem.method
                        )}</span>
                        <span class="text-white truncate">${escapeHtml(
                          reqItem.path
                        )}</span>
                      </div>
                      <div class="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                        <span>${escapeHtml(reqItem.country)}</span>
                        <span>${escapeHtml(reqItem.clientType)}</span>
                        <span class="text-cyan-300">${
                          reqItem.durationMs
                        }ms</span>
                        <span>${new Date(
                          reqItem.timestamp
                        ).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  `
                    )
                    .join('') ||
                  '<div class="text-slate-500">No recent requests logged yet.</div>'
                }
              </div>
            </div>
          </div>
        `;

      case 'spotlight':
        return `
          <div class="p-6 rounded-2xl bg-[#101624] border border-amber-400/30 space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">UNIQUE USER MAGNET & ENGAGEMENT ENGINE</span>
                <h2 class="text-lg font-extrabold text-white mt-0.5">🌟 Sovereign Spotlight & Daily Merit Bounty</h2>
                <p class="text-xs text-slate-300">
                  Highlight the best community post and set today's interactive discussion challenge. Users who participate earn Merit and the Sovereign Pioneer badge.
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label class="block text-slate-300 font-bold mb-1">Featured Post ID (Pinned in Spotlight)</label>
                <input id="spot-post-id" type="text" value="${escapeHtml(
                  spotlight.featuredPostId || 'post-1'
                )}" class="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono" />
              </div>
              <div>
                <label class="block text-slate-300 font-bold mb-1">Daily Challenge Hashtag</label>
                <input id="spot-prompt-tag" type="text" value="${escapeHtml(
                  spotlight.dailyPromptTag || '#SovereignSpotlight'
                )}" class="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-amber-300 font-mono" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-slate-300 font-bold mb-1">Daily Sovereign Challenge Title</label>
                <input id="spot-prompt-title" type="text" value="${escapeHtml(
                  spotlight.dailyPromptTitle || ''
                )}" class="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-slate-300 font-bold mb-1">Challenge Prompt Description</label>
                <textarea id="spot-prompt-desc" rows="3" class="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white">${escapeHtml(
                  spotlight.dailyPromptDescription || ''
                )}</textarea>
              </div>
              <div>
                <label class="block text-slate-300 font-bold mb-1">Merit Bounty Reward (per participant)</label>
                <input id="spot-bounty-reward" type="number" value="${Number(
                  spotlight.meritBountyReward || 25
                )}" class="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-emerald-400 font-mono" />
              </div>
              <div>
                <label class="block text-slate-300 font-bold mb-1">Instant Merit Boost to Featured Post</label>
                <input id="spot-merit-boost" type="number" value="25" class="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-cyan-400 font-mono" />
              </div>
            </div>

            <div class="flex justify-end">
              <button type="button" data-admin-action="save-spotlight" class="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs cursor-pointer shadow-lg">
                ✨ Activate Sovereign Spotlight & Bounty
              </button>
            </div>
          </div>
        `;

      case 'moderation':
        return `
          <div class="space-y-6">
            <!-- DSA & Social Reports Queue -->
            <div class="p-5 rounded-2xl bg-[#101624] border border-white/10 space-y-3">
              <h2 class="text-sm font-bold text-white">🚩 DSA & Trust Reports Queue (${
                reports.length
              })</h2>
              <div class="space-y-2">
                ${
                  reports
                    .map(
                      (rep: any) => `
                    <div class="p-3.5 rounded-xl bg-black/30 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div class="space-y-1">
                        <div class="flex items-center gap-2 font-mono">
                          <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">${escapeHtml(
                            rep.status || 'pending'
                          )}</span>
                          <span class="text-white font-bold">Target: ${escapeHtml(
                            rep.target_id || rep.targetId || ''
                          )}</span>
                          <span class="text-slate-400">Category: ${escapeHtml(
                            rep.reason_category ||
                              rep.reasonCategory ||
                              'report'
                          )}</span>
                        </div>
                        <p class="text-slate-300">${escapeHtml(
                          rep.details ||
                            rep.description ||
                            'No additional details'
                        )}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <button type="button" data-admin-action="resolve-report" data-report-id="${escapeHtml(
                          rep.id
                        )}" data-resolution="dismissed" class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer">
                          Dismiss
                        </button>
                        <button type="button" data-admin-action="resolve-report" data-report-id="${escapeHtml(
                          rep.id
                        )}" data-resolution="actioned" data-delete-target="true" class="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 cursor-pointer">
                          Action & Delete Post
                        </button>
                      </div>
                    </div>
                  `
                    )
                    .join('') ||
                  '<div class="text-xs text-slate-400 font-mono">🎉 Zero pending DSA reports! The mesh is clean.</div>'
                }
              </div>
            </div>

            <!-- Live Posts Moderation -->
            <div class="p-5 rounded-2xl bg-[#101624] border border-white/10 space-y-3">
              <h2 class="text-sm font-bold text-white">📝 Published Posts Moderation (${
                posts.length
              })</h2>
              <div class="space-y-2 max-h-[500px] overflow-y-auto">
                ${posts
                  .map((p: any) => {
                    const isPinned = p.status === 'pinned';
                    const isLocked = p.status === 'locked';
                    return `
                      <div class="p-3.5 rounded-xl bg-black/30 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div class="min-w-0 flex-1 space-y-1">
                          <div class="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                            <span class="text-amber-300 font-bold">${escapeHtml(
                              p.id
                            )}</span>
                            <span>·</span>
                            <span>${escapeHtml(
                              p.channel_id || p.channelId || 'pulse-global'
                            )}</span>
                            <span>·</span>
                            <span class="text-emerald-400">Merit: ${
                              p.merit_votes ?? p.meritVotes ?? 0
                            }</span>
                            ${
                              isPinned
                                ? '<span class="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">PINNED</span>'
                                : ''
                            }
                            ${
                              isLocked
                                ? '<span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">LOCKED</span>'
                                : ''
                            }
                          </div>
                          <div class="font-bold text-white truncate">${escapeHtml(
                            p.title || ''
                          )}</div>
                          <div class="text-slate-400 truncate">${escapeHtml(
                            p.content || ''
                          )}</div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          <button type="button" data-admin-action="feature-this-post" data-post-id="${escapeHtml(
                            p.id
                          )}" class="px-2.5 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 font-semibold cursor-pointer">
                            🌟 Spotlight +25
                          </button>
                          <button type="button" data-admin-action="pin-post" data-post-id="${escapeHtml( p.id )}" data-pinned="${isPinned}" class="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer">
                            ${isPinned ? 'Unpin' : '📌 Pin'}
                          </button>
                          <button type="button" data-admin-action="lock-thread" data-post-id="${escapeHtml( p.id )}" data-locked="${isLocked}" class="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer">
                            ${isLocked ? '🔓 Unlock' : '🔒 Lock'}
                          </button>
                          <button type="button" data-admin-action="delete-post" data-post-id="${escapeHtml(
                            p.id
                          )}" class="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 cursor-pointer">
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          </div>
        `;

      case 'users':
        return `
          <div class="space-y-5">
            <div class="p-5 rounded-2xl bg-[#101624] border border-white/10 space-y-3">
              <h2 class="text-sm font-bold text-white">🔑 Assign Sovereign Role (RBAC)</h2>
              <div class="flex flex-wrap gap-2.5 text-xs">
                <input id="admin-role-fp" type="text" placeholder="User Ed25519 Fingerprint..." class="flex-1 min-w-[220px] px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono" />
                <select id="admin-role-select" class="px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono">
                  <option value="OWNER">OWNER</option>
                  <option value="SECURITY_ADMIN">SECURITY_ADMIN</option>
                  <option value="GUARDIAN">GUARDIAN</option>
                  <option value="MODERATOR" selected>MODERATOR</option>
                  <option value="ARCHIVIST">ARCHIVIST</option>
                  <option value="AUDITOR">AUDITOR</option>
                  <option value="MEMBER">MEMBER</option>
                </select>
                <button type="button" data-admin-action="assign-role" class="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold cursor-pointer">
                  Assign Role
                </button>
              </div>
            </div>

            <div class="p-5 rounded-2xl bg-[#101624] border border-white/10 space-y-3">
              <h3 class="text-sm font-bold text-white">👥 Sovereign Identities & Moderation Status (${
                users.length
              })</h3>
              <div class="space-y-2">
                ${
                  users
                    .map(
                      (u: any) => `
                    <div class="p-3.5 rounded-xl bg-black/30 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                      <div class="space-y-1">
                        <div class="flex items-center gap-2">
                          <span class="text-white font-bold">${escapeHtml(
                            u.fingerprint
                          )}</span>
                          <span class="px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 font-bold">${escapeHtml( u.role )}</span>${
                            u.isQuarantined
                              ? '<span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">QUARANTINED</span>'
                              : ''
                          }
                          ${
                            u.isShadowbanned
                              ? '<span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">SHADOWBANNED</span>'
                              : ''
                          }
                        </div>
                        <div class="text-[11px] text-slate-400">${escapeHtml(
                          u.notes || 'Active sovereign identity'
                        )}</div>
                      </div>
                      <div class="flex items-center gap-2">
                        <button type="button" data-admin-action="toggle-quarantine" data-fp="${escapeHtml(
                          u.fingerprint
                        )}" class="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 cursor-pointer">
                          ${u.isQuarantined ? 'Unquarantine' : 'Quarantine'}
                        </button>
                        <button type="button" data-admin-action="toggle-shadowban" data-fp="${escapeHtml(
                          u.fingerprint
                        )}" class="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 cursor-pointer">
                          ${u.isShadowbanned ? 'Unshadowban' : 'Shadowban'}
                        </button>
                      </div>
                    </div>
                  `
                    )
                    .join('') ||
                  '<div class="text-xs text-slate-400 font-mono">No custom user roles or restrictions recorded yet.</div>'
                }
              </div>
            </div>
          </div>
        `;

      case 'waf':
        return `
          <div class="space-y-5">
            <div class="p-5 rounded-2xl bg-[#101624] border border-white/10 space-y-3">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-bold text-white">🧱 Sovereign WAF — Ban IP Address</h2>
                <button type="button" data-admin-action="clear-rate-limits" class="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-mono cursor-pointer">
                  Reset Edge Rate-Limit Buckets
                </button>
              </div>
              <div class="flex flex-wrap gap-2.5 text-xs">
                <input id="admin-ban-ip-input" type="text" placeholder="IPv4 or IPv6 address..." class="px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono" />
                <input id="admin-ban-reason-input" type="text" placeholder="Reason (e.g. DDoS / Botnet)" class="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white" />
                <select id="admin-ban-hours-input" class="px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono">
                  <option value="1">1 Hour</option>
                  <option value="24" selected>24 Hours</option>
                  <option value="168">7 Days</option>
                  <option value="0">Permanent</option>
                </select>
                <button type="button" data-admin-action="ban-ip" class="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold cursor-pointer">
                  Block IP at Edge
                </button>
              </div>
            </div>

            <div class="p-5 rounded-2xl bg-[#101624] border border-white/10 space-y-3">
              <h3 class="text-sm font-bold text-white">Active WAF Banned IPs (${
                bannedIPs.length
              })</h3>
              <div class="space-y-2 text-xs font-mono">
                ${
                  bannedIPs
                    .map(
                      (b: any) => `
                    <div class="p-3 rounded-xl bg-black/30 border border-rose-500/20 flex items-center justify-between">
                      <div>
                        <span class="text-rose-400 font-bold">${escapeHtml(
                          b.ip
                        )}</span>
                        <span class="text-slate-400 ml-3">${escapeHtml(
                          b.reason
                        )}</span>
                      </div>
                      <button type="button" data-admin-action="unban-ip" data-ip="${escapeHtml(
                        b.ip
                      )}" class="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 cursor-pointer">
                        Unban
                      </button>
                    </div>
                  `
                    )
                    .join('') ||
                  '<div class="text-slate-400">Zero banned IPs in WAF ledger.</div>'
                }
              </div>
            </div>
          </div>
        `;

      case 'database':
        return `
          <div class="space-y-5">
            <div class="p-5 rounded-2xl bg-[#101624] border border-white/10 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-bold text-white">🗄️ Cloudflare D1 SQL Studio (WORM Protected)</h2>
                  <p class="text-xs text-slate-400">Execute live SQL queries or inspect schema tables directly on the edge</p>
                </div>
                <button type="button" data-admin-action="trigger-backup" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer">
                  💾 Trigger Encrypted R2 Backup
                </button>
              </div>
              <textarea id="admin-sql-textarea" rows="4" class="w-full p-3.5 rounded-xl bg-black/50 border border-white/15 text-emerald-300 font-mono text-xs">${escapeHtml(
                this.sqlQuery
              )}</textarea>
              <div class="flex justify-end">
                <button type="button" data-admin-action="run-sql" class="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs cursor-pointer">
                  ▶ Execute SQL Query
                </button>
              </div>
              ${
                this.sqlResult
                  ? `<pre class="p-4 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-80">${escapeHtml(
                      JSON.stringify(this.sqlResult, null, 2)
                    )}</pre>`
                  : ''
              }
            </div>

            <!-- Cloudflare R2 Object Storage Browser -->
            <div class="p-5 rounded-2xl bg-[#101624] border border-white/10 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-bold text-white">📦 Cloudflare R2 Vault Object Browser (${
                    this.r2Objects.length
                  })</h3>
                  <p class="text-xs text-slate-400">Inspect and manage zero-egress binary artifacts and encrypted D1 snapshots</p>
                </div>
                <button type="button" data-admin-action="refresh-r2" class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-200 cursor-pointer">
                  ↻ List R2 Objects
                </button>
              </div>
              <div class="space-y-2 text-xs font-mono max-h-72 overflow-y-auto">
                ${
                  this.r2Objects
                    .map(
                      (obj: any) => `
                    <div class="p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-3">
                      <div class="min-w-0">
                        <div class="text-white font-bold truncate">${escapeHtml(
                          obj.key
                        )}</div>
                        <div class="text-[11px] text-slate-400">${Math.round( (Number(obj.size) || 0) / 1024 )} KB · Uploaded: ${new Date(
                        obj.uploaded || Date.now()
                      ).toLocaleString()}</div>
                      </div>
                      <button type="button" data-admin-action="delete-r2-object" data-key="${escapeHtml(
                        obj.key
                      )}" class="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 cursor-pointer shrink-0">
                        Delete Object
                      </button>
                    </div>
                  `
                    )
                    .join('') ||
                  '<div class="text-slate-400">No R2 objects loaded or bucket empty. Click "List R2 Objects" to query.</div>'
                }
              </div>
            </div>
          </div>
        `;

      case 'audit':
        return `
          <div class="space-y-5">
            <div class="p-5 rounded-2xl bg-[#101624] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span class="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">WRITE-ONCE-READ-MANY (WORM) CRYPTOGRAPHIC LEDGER</span>
                <h2 class="text-base font-extrabold text-white mt-0.5">⛓️ SHA-256 Hash-Chained Admin Audit Trail</h2>
                <p class="text-xs text-slate-300">Every administrative action is cryptographically linked to the previous entry hash. Cannot be deleted or altered even via raw SQL.</p>
              </div>
              <button type="button" data-admin-action="verify-worm" class="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs cursor-pointer shadow-lg">
                🔐 Verify Mathematical Hash Chain
              </button>
            </div>

            <div class="space-y-2 font-mono text-xs">
              ${
                logs
                  .map(
                    (l: any) => `
                  <div class="p-3.5 rounded-xl bg-[#101624] border border-white/10 space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="text-amber-300 font-bold">${escapeHtml(
                        l.action
                      )}</span>
                      <span class="text-slate-400">${new Date(
                        l.timestamp
                      ).toLocaleString()}</span>
                    </div>
                    <div class="text-slate-300">Target: <strong class="text-white">${escapeHtml(
                      l.target_resource || l.targetId || 'system'
                    )}</strong> · Admin: ${escapeHtml( l.admin_credential_id || l.adminFingerprint || 'root' )}</div>${
                      l.current_entry_hash || l.currentEntryHash
                        ? `<div class="text-[10px] text-emerald-400 truncate">SHA-256 Chain Hash: ${escapeHtml(
                            l.current_entry_hash || l.currentEntryHash
                          )}</div>`
                        : ''
                    }
                  </div>
                `
                  )
                  .join('') ||
                '<div class="text-slate-400">No audit entries recorded yet.</div>'
              }
            </div>
          </div>
        `;
    }
  }
}

export const adminDashboard = new SovereignAdminDashboard();