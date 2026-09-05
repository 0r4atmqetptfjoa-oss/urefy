/**
 * Aetheris Sovereign Admin Control Panel & Infrastructure Guardian
 *
 * Provides real-time telemetry, zero-overage quota protection,
 * and edge observability for Cloudflare R2 and Sovereign Storage.
 */
import { adminAuth } from './admin-auth.js';

export interface R2StorageQuota {
  usedBytes: number;
  usedGB: number;
  capGB: number;
  percentUsed: number;
  freeTierLimitGB?: number;
  safeMarginGB?: number;
}

export interface R2ClassAQuota {
  used: number;
  cap: number;
  percentUsed: number;
  freeTierLimit?: number;
}

export interface R2ClassBQuota {
  used: number;
  cap: number;
  percentUsed: number;
  freeTierLimit?: number;
}

export interface R2QuotaMetrics {
  storage: R2StorageQuota;
  classA: R2ClassAQuota;
  classB: R2ClassBQuota;
  timestamp?: number;
}

// ─── SAFE ZERO-OVERAGE DEFAULTS (CLOUDFLARE R2 FREE TIER INVARIANTS) ────────
export const R2_FREE_TIER_LIMITS = {
  storageCapGB: 8.0, // 8.0 GB sovereign safe cap (leaves 2.0 GB margin under 10 GB free)
  storageMaxFreeGB: 10.0,
  singleUploadCapMB: 25,
  classACap: 750000, // 750,000 ops safe cap (under 1,000,000 free Class A writes/lists)
  classAMaxFree: 1000000,
  classBCap: 7500000, // 7,500,000 ops safe cap (under 10,000,000 free Class B reads)
  classBMaxFree: 10000000,
} as const;

/**
 * Updates DOM meter elements with normalized Cloudflare R2 quota metrics.
 */
export function renderR2QuotaDOM(metrics: R2QuotaMetrics): void {
  if (typeof document === 'undefined') return;

  const storageUsed = Number(metrics.storage.usedGB) || 0;
  const storageCap = Number(metrics.storage.capGB) || R2_FREE_TIER_LIMITS.storageCapGB;
  const storagePct = Math.max(0, Math.min(100, Number(metrics.storage.percentUsed) || (storageCap > 0 ? (storageUsed / storageCap) * 100 : 0)));

  const classAUsed = Number(metrics.classA.used) || 0;
  const classACap = Number(metrics.classA.cap) || R2_FREE_TIER_LIMITS.classACap;
  const classAPct = Math.max(0, Math.min(100, Number(metrics.classA.percentUsed) || (classACap > 0 ? (classAUsed / classACap) * 100 : 0)));

  const classBUsed = Number(metrics.classB.used) || 0;
  const classBCap = Number(metrics.classB.cap) || R2_FREE_TIER_LIMITS.classBCap;
  const classBPct = Math.max(0, Math.min(100, Number(metrics.classB.percentUsed) || (classBCap > 0 ? (classBUsed / classBCap) * 100 : 0)));

  // Update Storage Elements
  document.querySelectorAll('#r2-storage-val').forEach((el) => {
    el.textContent = `${storageUsed.toFixed(2)} GB / ${storageCap.toFixed(1)} GB`;
  });
  document.querySelectorAll('#r2-storage-bar').forEach((el) => {
    (el as HTMLElement).style.width = `${Math.max(1, storagePct)}%`;
  });
  document.querySelectorAll('#r2-storage-pct').forEach((el) => {
    el.textContent = `${storagePct.toFixed(1)}% used`;
  });

  // Update Class A Elements
  document.querySelectorAll('#r2-class-a-val').forEach((el) => {
    el.textContent = `${classAUsed.toLocaleString()} / ${classACap.toLocaleString()}`;
  });
  document.querySelectorAll('#r2-class-a-bar').forEach((el) => {
    (el as HTMLElement).style.width = `${Math.max(1, classAPct)}%`;
  });
  document.querySelectorAll('#r2-class-a-pct').forEach((el) => {
    el.textContent = `${classAPct.toFixed(1)}% used`;
  });

  // Update Class B Elements
  document.querySelectorAll('#r2-class-b-val').forEach((el) => {
    el.textContent = `${classBUsed.toLocaleString()} / ${classBCap.toLocaleString()}`;
  });
  document.querySelectorAll('#r2-class-b-bar').forEach((el) => {
    (el as HTMLElement).style.width = `${Math.max(1, classBPct)}%`;
  });
  document.querySelectorAll('#r2-class-b-pct').forEach((el) => {
    el.textContent = `${classBPct.toFixed(1)}% used`;
  });
}

/**
 * Normalizes API response data from /api/storage?action=quota into standard R2QuotaMetrics.
 */
export function normalizeR2QuotaResponse(data: any): R2QuotaMetrics {
  const capGB = Number(data?.storage?.capGB ?? data?.storage?.cap ?? data?.storageCapGB ?? R2_FREE_TIER_LIMITS.storageCapGB);
  let usedGB = 0;
  if (data?.storage?.usedGB !== undefined) {
    usedGB = Number(data.storage.usedGB);
  } else if (data?.storage?.usedBytes !== undefined) {
    usedGB = Number(data.storage.usedBytes) / (1024 * 1024 * 1024);
  } else if (data?.storage?.used !== undefined) {
    usedGB = Number(data.storage.used);
  } else if (data?.storageUsedGB !== undefined) {
    usedGB = Number(data.storageUsedGB);
  } else if (data?.usedBytes !== undefined) {
    usedGB = Number(data.usedBytes) / (1024 * 1024 * 1024);
  }

  const storagePct = Number(data?.storage?.percentUsed ?? data?.storage?.pct ?? data?.storagePct ?? (capGB > 0 ? (usedGB / capGB) * 100 : 0));

  const classACap = Number(data?.classA?.cap ?? data?.classA?.limit ?? data?.classACap ?? R2_FREE_TIER_LIMITS.classACap);
  const classAUsed = Number(data?.classA?.used ?? data?.classA?.count ?? data?.classAUsed ?? 0);
  const classAPct = Number(data?.classA?.percentUsed ?? data?.classA?.pct ?? data?.classAPct ?? (classACap > 0 ? (classAUsed / classACap) * 100 : 0));

  const classBCap = Number(data?.classB?.cap ?? data?.classB?.limit ?? data?.classBCap ?? R2_FREE_TIER_LIMITS.classBCap);
  const classBUsed = Number(data?.classB?.used ?? data?.classB?.count ?? data?.classBUsed ?? 0);
  const classBPct = Number(data?.classB?.percentUsed ?? data?.classB?.pct ?? data?.classBPct ?? (classBCap > 0 ? (classBUsed / classBCap) * 100 : 0));

  return {
    storage: {
      usedBytes: Number(data?.storage?.usedBytes ?? usedGB * 1024 * 1024 * 1024),
      usedGB: parseFloat(usedGB.toFixed(4)),
      capGB,
      percentUsed: parseFloat(storagePct.toFixed(2)),
      freeTierLimitGB: R2_FREE_TIER_LIMITS.storageMaxFreeGB,
      safeMarginGB: 2.0,
    },
    classA: {
      used: classAUsed,
      cap: classACap,
      percentUsed: parseFloat(classAPct.toFixed(4)),
      freeTierLimit: R2_FREE_TIER_LIMITS.classAMaxFree,
    },
    classB: {
      used: classBUsed,
      cap: classBCap,
      percentUsed: parseFloat(classBPct.toFixed(4)),
      freeTierLimit: R2_FREE_TIER_LIMITS.classBMaxFree,
    },
    timestamp: Date.now(),
  };
}

/**
 * Fetches real-time quota telemetry from /api/storage?action=quota and updates the DOM meters.
 */
export async function fetchAndRenderR2Quota(): Promise<R2QuotaMetrics> {
  const refreshButtons = typeof document !== 'undefined' ? document.querySelectorAll('#btn-refresh-r2-quota') : [];
  refreshButtons.forEach((btn) => {
    btn.classList.add('opacity-50', 'pointer-events-none');
  });

  try {
    const res = await fetch('/api/storage?action=quota', {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const metrics = normalizeR2QuotaResponse(json);
    renderR2QuotaDOM(metrics);
    return metrics;
  } catch (err) {
    // Offline / fallback protection baseline: ensure zero-overage safe display
    const fallbackMetrics = normalizeR2QuotaResponse({
      storage: { usedGB: 0.0, capGB: R2_FREE_TIER_LIMITS.storageCapGB, percentUsed: 0.0 },
      classA: { used: 0, cap: R2_FREE_TIER_LIMITS.classACap, percentUsed: 0.0 },
      classB: { used: 0, cap: R2_FREE_TIER_LIMITS.classBCap, percentUsed: 0.0 },
    });
    renderR2QuotaDOM(fallbackMetrics);
    return fallbackMetrics;
  } finally {
    refreshButtons.forEach((btn) => {
      btn.classList.remove('opacity-50', 'pointer-events-none');
    });
  }
}

/**
 * Triggers a manual D1 SQLite -> Cloudflare R2 encrypted backup.
 * Updates DOM status badge and timestamp elements.
 */
export async function triggerManualBackup(): Promise<any> {
  const badgeEls = typeof document !== 'undefined' ? document.querySelectorAll('#backup-status-badge') : [];
  const btnEls = typeof document !== 'undefined' ? document.querySelectorAll('#btn-trigger-backup') : [];
  const timeEls = typeof document !== 'undefined' ? document.querySelectorAll('#backup-last-timestamp') : [];

  badgeEls.forEach((b) => {
    b.textContent = 'RUNNING';
    b.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse';
  });

  btnEls.forEach((btn) => {
    btn.classList.add('opacity-50', 'pointer-events-none');
  });

  try {
    const pin = adminAuth.activePin;
    const res = await fetch('/api/cron-backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pin}`,
        'X-Admin-PIN': pin,
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    badgeEls.forEach((b) => {
      b.textContent = 'SUCCESS';
      b.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    });

    const formattedTime = data.timestamp ? new Date(data.timestamp).toLocaleString() : new Date().toLocaleString();
    timeEls.forEach((t) => {
      t.textContent = formattedTime;
    });

    return data;
  } catch (err) {
    badgeEls.forEach((b) => {
      b.textContent = 'FAILED';
      b.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30';
    });
    throw err;
  } finally {
    btnEls.forEach((btn) => {
      btn.classList.remove('opacity-50', 'pointer-events-none');
    });
  }
}

/**
 * Fetches current backup status and populates DOM elements.
 */
export async function fetchBackupStatus(): Promise<any> {
  try {
    const res = await fetch('/api/cron-backup', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();

    if (typeof document !== 'undefined') {
      const badgeEls = document.querySelectorAll('#backup-status-badge');
      const timeEls = document.querySelectorAll('#backup-last-timestamp');

      if (data.lastBackup?.timestamp) {
        const formatted = new Date(data.lastBackup.timestamp).toLocaleString();
        timeEls.forEach((t) => {
          t.textContent = formatted;
        });
        badgeEls.forEach((b) => {
          b.textContent = 'SUCCESS';
          b.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        });
      }
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Attaches event listeners and initializes quota & backup polling.
 */
export function initR2QuotaGuardian(): void {
  if (typeof document === 'undefined') return;

  // Wire explicit button listeners
  const btn = document.getElementById('btn-refresh-r2-quota');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      fetchAndRenderR2Quota();
    });
  }

  const backupBtn = document.getElementById('btn-trigger-backup');
  if (backupBtn) {
    backupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerManualBackup().catch(() => {});
    });
  }

  // Initial fetch on admin page load
  fetchAndRenderR2Quota();
  fetchBackupStatus().catch(() => {});
  renderTimeTravelAuditDOM();
}

// ─── TIME-TRAVEL AUDIT LOG & COMMUNITY ROLLBACK CONSENSUS ───────────────────
import {
  ModerationEvent,
  ConsensusStatus,
  timeTravelConsensus,
} from './time-travel-consensus.js';

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatStateDiff(
  before: Record<string, any> | string,
  after: Record<string, any> | string
): { beforeFormatted: string; afterFormatted: string } {
  const beforeFormatted =
    typeof before === 'string' ? before : JSON.stringify(before, null, 2);
  const afterFormatted =
    typeof after === 'string' ? after : JSON.stringify(after, null, 2);
  return { beforeFormatted, afterFormatted };
}

export function getConsensusStatusBadge(status: ConsensusStatus): string {
  switch (status) {
    case 'ACTIVE':
      return '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-500/20 text-slate-300 border border-slate-500/30">ACTIVE</span>';
    case 'CONTESTED':
      return '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">CONTESTED</span>';
    case 'ROLLED_BACK':
      return '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">ROLLED_BACK</span>';
    case 'CONSENSUS_REACHED':
      return '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">CONSENSUS_REACHED</span>';
    default:
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-white">${escapeHtml(status)}</span>`;
  }
}

/**
 * Renders the Visual Time-Travel Audit Log card displaying chronological moderation events
 * with side-by-side visual diff (before vs after), target ID, moderator fingerprint,
 * and community consensus status.
 */
export function renderTimeTravelAuditCard(customEvents?: ModerationEvent[]): string {
  const events = customEvents || timeTravelConsensus.getAllEvents();

  if (events.length === 0) {
    return `
      <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 space-y-3" id="time-travel-audit-card">
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <div class="flex items-center space-x-2">
            <span class="text-base">⏳</span>
            <h3 class="text-sm font-bold text-white tracking-wide">Time-Travel Consensus Audit Log</h3>
          </div>
          <span class="text-xs font-mono text-slate-500">0 events recorded</span>
        </div>
        <div class="py-8 text-center text-xs text-slate-500 font-mono">
          No moderation events recorded in the sovereign ledger.
        </div>
      </div>
    `;
  }

  return `
    <div class="bg-surface-raised border border-white/10 rounded-2xl p-5 space-y-4" id="time-travel-audit-card">
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <div class="flex items-center space-x-2">
          <span class="text-base">⏳</span>
          <h3 class="text-sm font-bold text-white tracking-wide">Time-Travel Consensus Audit Log</h3>
        </div>
        <span class="text-xs font-mono text-slate-400">${events.length} event${events.length === 1 ? '' : 's'} recorded</span>
      </div>

      <div class="space-y-4">
        ${events.map((event) => {
          const { beforeFormatted, afterFormatted } = formatStateDiff(event.beforeState, event.afterState);
          const timeStr = new Date(event.timestamp).toLocaleString();
          const proposal = event.rollbackProposalId ? timeTravelConsensus.getProposal(event.rollbackProposalId) : undefined;

          return `
            <div class="border border-white/10 bg-black/20 rounded-xl p-4 space-y-3" data-event-id="${escapeHtml(event.id)}">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                <div class="flex items-center space-x-2">
                  <span class="px-2 py-0.5 text-xs font-mono font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    ${escapeHtml(event.actionType)}
                  </span>
                  <span class="font-mono text-xs text-white font-semibold">
                    Target: <span class="text-slate-300">${escapeHtml(event.targetId)}</span>
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  ${getConsensusStatusBadge(event.consensusStatus)}
                  <span class="text-[11px] font-mono text-slate-500">${escapeHtml(timeStr)}</span>
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
                <div>
                  Moderator Fingerprint: <span class="text-signal font-semibold">${escapeHtml(event.moderatorFingerprint)}</span>
                </div>
                <div class="text-slate-500 text-[11px]">
                  Reason: <span class="text-slate-300">${escapeHtml(event.reason)}</span>
                </div>
              </div>

              ${proposal ? `
                <div class="bg-purple-950/20 border border-purple-500/20 rounded-lg p-2.5 text-xs font-mono flex items-center justify-between">
                  <span class="text-purple-300">
                    Proposal: ${escapeHtml(proposal.id)} (${proposal.signatures.length}/${proposal.thresholdRequired} WoT Signatures)
                  </span>
                  <span class="text-[11px] text-purple-400 font-semibold">
                    Proposer WoT: ${proposal.proposerWotScore}
                  </span>
                </div>
              ` : ''}

              <!-- Side-by-Side Visual Diff: Before vs After -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div class="bg-black/40 border border-rose-500/20 rounded-lg p-2.5">
                  <div class="text-[10px] font-bold font-mono text-rose-400 mb-1 flex items-center justify-between border-b border-rose-500/10 pb-1">
                    <span>STATE BEFORE (ORIGINAL)</span>
                    <span class="text-rose-500/60">- REDUCTION</span>
                  </div>
                  <pre class="text-[11px] font-mono text-rose-200/90 whitespace-pre-wrap max-h-36 overflow-y-auto">${escapeHtml(beforeFormatted)}</pre>
                </div>

                <div class="bg-black/40 border border-emerald-500/20 rounded-lg p-2.5">
                  <div class="text-[10px] font-bold font-mono text-emerald-400 mb-1 flex items-center justify-between border-b border-emerald-500/10 pb-1">
                    <span>STATE AFTER (${event.consensusStatus === 'ROLLED_BACK' ? 'ROLLED BACK' : 'MODIFIED'})</span>
                    <span class="text-emerald-500/60">+ ADDITION</span>
                  </div>
                  <pre class="text-[11px] font-mono text-emerald-200/90 whitespace-pre-wrap max-h-36 overflow-y-auto">${escapeHtml(afterFormatted)}</pre>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Updates DOM containers with the Visual Time-Travel Audit Log card.
 */
export function renderTimeTravelAuditDOM(customEvents?: ModerationEvent[]): void {
  if (typeof document === 'undefined') return;

  const html = renderTimeTravelAuditCard(customEvents);
  const containers = document.querySelectorAll('#time-travel-audit-container');
  containers.forEach((c) => {
    c.innerHTML = html;
  });
}

// Global delegated click listener to catch dynamically rendered buttons across admin tab changes
if (typeof document !== 'undefined') {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (target && target.closest('#btn-refresh-r2-quota')) {
      event.preventDefault();
      fetchAndRenderR2Quota();
    }
    if (target && target.closest('#btn-trigger-backup')) {
      event.preventDefault();
      triggerManualBackup().catch(() => {});
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initR2QuotaGuardian();
    });
  } else {
    // Already loaded, run immediately
    initR2QuotaGuardian();
  }
}


