/**
 * @file admin-overview.ts
 * @package @aetheris/client-ui
 * @description 2027 Executive Telemetry Matrix & 24-Hour Cloudflare D1 Activity Visualizer.
 */

export interface AdminOverview {
  observedAt: number;
  source: string;
  counts: {
    identities: number | null;
    posts: number | null;
    messages: number | null;
    channels: number | null;
    pendingReports: number | null;
  };
  activity: Array<{ hour: number; posts: number; messages: number }> | null;
  unavailable: string[];
}

const escape = (value: string): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c] || c)
  );

const number = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US') : 'Unavailable';

export function renderAdminOverview(
  overview: AdminOverview | null,
  syncing: boolean,
  error: string
): string {
  const counts = overview?.counts ?? {
    identities: null,
    posts: null,
    messages: null,
    channels: null,
    pendingReports: null,
  };

  const card = (
    key: string,
    label: string,
    value: number | null | undefined,
    detail: string,
    accentClass = 'text-cyan-300'
  ): string => `<div
    data-admin-metric="${escape(key)}"
    class="p-4 rounded-2xl bg-surface-base/80 backdrop-blur-xl border border-white/10 shadow-lg"
  >
    <div class="text-[11px] font-mono uppercase tracking-wider text-slate-400">${escape(label)}</div>
    <div class="mt-2 text-2xl font-extrabold font-mono ${
      typeof value === 'number' ? accentClass : 'text-slate-500 text-base'
    }">${number(value)}</div>
    <div class="mt-1 text-[11px] text-slate-400">${value == null ? 'Data unavailable' : escape(detail)}</div>
  </div>`;

  const activity = overview?.activity;
  const maxBucket =
    activity && activity.length > 0
      ? Math.max(1, ...activity.map((b) => (b.posts || 0) + (b.messages || 0)))
      : 1;
  const totalActivity = activity?.reduce((sum, b) => sum + (b.posts || 0) + (b.messages || 0), 0) ?? 0;

  return `<section id="admin-overview-panel" aria-label="Operational overview" class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-surface-base/85 border border-white/10">
      <div>
        <span class="text-[10px] font-mono uppercase tracking-widest text-cyan-400">2027 Authoritative Edge Telemetry</span>
        <h2 class="text-base font-extrabold text-white">Instance Operational Overview</h2>
        <p class="text-xs text-slate-400 font-mono mt-0.5">
          Source: <strong>${escape(overview?.source || 'Unavailable')}</strong>
          ${
            overview?.observedAt
              ? ` · Observed: ${escape(new Date(overview.observedAt).toISOString())}`
              : ''
          }
          ${syncing ? ' · Syncing live D1 metrics...' : ''}
        </p>
      </div>
      ${
        overview?.unavailable && overview.unavailable.length > 0
          ? `<span class="px-2.5 py-1 rounded-full text-[11px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Some data is unavailable: ${escape(overview.unavailable.join(', '))}
            </span>`
          : `<span class="px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              All D1 Telemetry Queries Verified
            </span>`
      }
    </div>

    ${
      error
        ? `<div role="alert" class="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 font-mono">
            ${escape(error)} ${overview ? 'Showing the last successful snapshot.' : 'No snapshot available.'}
          </div>`
        : ''
    }

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      ${card('identities', 'Known Identities', counts.identities, 'Distinct authors & role holders', 'text-cyan-300')}
      ${card('posts', 'Public Posts', counts.posts, 'Stored in D1 posts table', 'text-emerald-300')}
      ${card('messages', 'Relay Messages', counts.messages, 'Stored in D1 messages table', 'text-sky-300')}
      ${card('channels', 'Configured Channels', counts.channels, 'Relays, Vault & Pulse channels', 'text-purple-300')}
      ${card(
        'pendingReports',
        'Pending DSA Reports',
        counts.pendingReports,
        'Awaiting moderator review',
        counts.pendingReports && counts.pendingReports > 0 ? 'text-amber-300' : 'text-slate-200'
      )}
    </div>

    <div class="p-5 rounded-3xl bg-surface-base/85 backdrop-blur-xl border border-white/10">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-xs font-extrabold uppercase tracking-wider text-white">24-Hour D1 Write Activity (Hourly UTC Buckets)</h3>
          <p class="text-[11px] text-slate-400">Cyan = Public Posts · Emerald = Relay Messages</p>
        </div>
      </div>
      ${totalActivity === 0 ? '<p class="text-xs text-slate-400 mb-3">No stored activity in this window.</p>' : ''}
      ${
        activity && activity.length === 24
          ? `<div data-admin-activity="24h" class="grid grid-cols-24 gap-1 items-end h-28 pt-4 px-1 border-b border-white/10">
              ${activity
                .map((bucket) => {
                  const total = (bucket.posts || 0) + (bucket.messages || 0);
                  const heightPct = total === 0 ? 4 : Math.max(10, Math.round((total / maxBucket) * 100));
                  const label = new Date(bucket.hour).toISOString().slice(11, 16);
                  return `<div
                    title="${escape(label)} UTC — Posts: ${bucket.posts}, Messages: ${bucket.messages}"
                    class="flex flex-col items-center justify-end h-full group"
                  >
                    <div
                      class="w-full rounded-t bg-gradient-to-t from-cyan-500/70 to-emerald-400/80 group-hover:from-cyan-400 group-hover:to-emerald-300 transition-all"
                      style="height: ${heightPct}%"
                    ></div>
                  </div>`;
                })
                .join('')}
            </div>`
          : `<div data-admin-activity="unavailable" class="py-6 text-center text-xs font-mono text-slate-400">
              24-hour activity histogram unavailable (Cloudflare D1 binding not connected).
            </div>`
      }
    </div>
  </section>`;
}
