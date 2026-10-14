/**
 * @file admin-overview.ts
 * @package @aetheris/client-ui
 * @description 2027 Swiss Sovereign Studio Admin Mission Control — High-density Linear/Cloudflare-style
 * operational telemetry view with 24h activity sparkbars, D1/R2 health indicators, and zero visual clutter.
 */

export interface AdminActivityBucket {
  hour: number;
  posts: number;
  messages: number;
}

export interface AdminOverview {
  observedAt: number;
  source: 'Cloudflare D1' | 'Unavailable' | string;
  counts: {
    identities: number | null;
    posts: number | null;
    messages: number | null;
    channels: number | null;
    pendingReports: number | null;
  };
  activity: AdminActivityBucket[] | null;
  unavailable: string[];
}

function escape(value: string | undefined | null): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c] || c)
  );
}

function fmtCount(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return 'Data unavailable';
  return val.toLocaleString('en-US');
}

export function renderAdminOverviewCard(overview: AdminOverview): string {
  const isHealthy = overview.source === 'Cloudflare D1' && overview.unavailable.length === 0;
  const buckets = overview.activity || [];
  const maxVolume = Math.max(1, ...buckets.map((b) => (b.posts || 0) + (b.messages || 0)));
  const totalActivity = buckets.reduce((sum, b) => sum + (b.posts || 0) + (b.messages || 0), 0);

  return `
    <section class="rounded-2xl bg-[#0E1015] border border-white/10 p-6 space-y-6 text-slate-100 font-sans shadow-xl">
      <!-- Top Bar -->
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400' : 'bg-amber-400'}"></span>
            <span class="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              ${escape(overview.source)} · Live Telemetry
            </span>
          </div>
          <h2 class="text-lg font-bold text-white mt-0.5">Instance Operations & Moderation Overview</h2>
        </div>
        <div class="text-xs font-mono text-slate-400">
          Synced ${overview.observedAt ? new Date(overview.observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
        </div>
      </div>

      <!-- 5-Metric Bento Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div data-admin-metric="identities" class="p-4 rounded-xl bg-[#14171F] border border-white/5">
          <div class="text-xs text-slate-400">Active Identities</div>
          <div class="text-2xl font-bold font-mono text-white mt-1">${fmtCount(overview.counts.identities)}</div>
        </div>
        <div data-admin-metric="posts" class="p-4 rounded-xl bg-[#14171F] border border-white/5">
          <div class="text-xs text-slate-400">Published Posts</div>
          <div class="text-2xl font-bold font-mono text-white mt-1">${fmtCount(overview.counts.posts)}</div>
        </div>
        <div data-admin-metric="messages" class="p-4 rounded-xl bg-[#14171F] border border-white/5">
          <div class="text-xs text-slate-400">Relay Messages</div>
          <div class="text-2xl font-bold font-mono text-sky-400 mt-1">${fmtCount(overview.counts.messages)}</div>
        </div>
        <div data-admin-metric="channels" class="p-4 rounded-xl bg-[#14171F] border border-white/5">
          <div class="text-xs text-slate-400">Community Channels</div>
          <div class="text-2xl font-bold font-mono text-amber-400 mt-1">${fmtCount(overview.counts.channels)}</div>
        </div>
        <div data-admin-metric="pendingReports" class="p-4 rounded-xl bg-[#14171F] border ${
          (overview.counts.pendingReports || 0) > 0 ? 'border-rose-500/40 bg-rose-950/20' : 'border-white/5'
        }">
          <div class="text-xs text-slate-400">Pending DSA Reports</div>
          <div class="text-2xl font-bold font-mono ${
            (overview.counts.pendingReports || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
          } mt-1">${fmtCount(overview.counts.pendingReports)}</div>
        </div>
      </div>

      <!-- 24-Hour Activity Histogram -->
      <div class="p-4 rounded-xl bg-[#14171F] border border-white/5 space-y-3">
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-slate-200">24-Hour Throughput (Posts & Encrypted Relay Messages)</span>
          <div class="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-amber-400"></span> Posts</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-sky-400"></span> Messages</span>
          </div>
        </div>
        ${
          overview.activity === null
            ? `<div data-admin-activity="unavailable" class="py-6 text-center text-xs font-mono text-slate-400">
                Data unavailable (Cloudflare D1 binding not connected).
              </div>`
            : totalActivity === 0
            ? `<div class="text-xs text-slate-400 py-6 text-center font-mono">No stored activity in this window.</div>`
            : `
          <div data-admin-activity="24h" class="h-28 flex items-end gap-1 pt-2">
            ${buckets
              .map((b) => {
                const total = (b.posts || 0) + (b.messages || 0);
                const heightPct = total === 0 ? 4 : Math.max(6, Math.round((total / maxVolume) * 100));
                const hourLabel = new Date(b.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `
                  <div
                    class="flex-1 flex flex-col justify-end items-center group relative h-full"
                    title="${escape(hourLabel)}: ${b.posts} posts, ${b.messages} messages"
                  >
                    <div class="w-full rounded-t bg-sky-400/80 group-hover:bg-sky-300 transition-all" style="height: ${heightPct}%"></div>
                  </div>
                `;
              })
              .join('')}
          </div>
        `
        }
      </div>
    </section>
  `;
}

export function renderAdminOverview(
  overview: AdminOverview | null,
  syncing: boolean,
  error: string
): string {
  const safeOverview: AdminOverview = overview || {
    observedAt: 0,
    source: 'Unavailable',
    counts: { identities: null, posts: null, messages: null, channels: null, pendingReports: null },
    activity: null,
    unavailable: ['all'],
  };

  const statusMessage = error
    ? `<div role="alert" class="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 font-mono">
        ${escape(error)} ${overview ? 'Showing the last successful snapshot.' : 'No snapshot available.'}
      </div>`
    : syncing
    ? `<div class="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs font-mono">
        Refreshing workspace data…
      </div>`
    : overview === null
    ? `<div id="admin-overview-status" role="status" class="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-mono">
        Waiting for the first snapshot…
      </div>`
    : safeOverview.unavailable && safeOverview.unavailable.length > 0
    ? `<div class="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-mono">
        Some data is unavailable: ${escape(safeOverview.unavailable.join(', '))}
      </div>`
    : '';

  return `
    <section id="admin-overview-panel" aria-label="Operational overview" class="space-y-5">
      ${statusMessage}
      ${renderAdminOverviewCard(safeOverview)}
    </section>
  `;
}
