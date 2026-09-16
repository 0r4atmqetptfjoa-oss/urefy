export interface AdminOverview {
  observedAt: number;
  source: string;
  counts: { identities: number | null; posts: number | null; messages: number | null; channels: number | null; pendingReports: number | null };
  activity: Array<{ hour: number; posts: number; messages: number }> | null;
  unavailable: string[];
}

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const number = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';

export function renderAdminOverview(overview: AdminOverview | null, syncing: boolean, error: string): string {
  const counts = overview?.counts;
  const card = (key: string, label: string, value: number | null | undefined, detail: string) => `
    <div role="group" aria-label="${label}" data-overview-metric="${key}" class="min-w-0 rounded-2xl border border-white/10 bg-surface-raised p-5">
      <p class="text-xs text-slate-400">${label}</p><p class="my-3 text-3xl font-bold text-white tabular-nums">${number(value)}</p>
      <p class="text-xs text-slate-400">${value == null ? 'Data unavailable' : detail}</p>
    </div>`;
  const activity = overview?.activity;
  const max = Math.max(1, ...(activity || []).map(item => item.posts + item.messages));
  const total = activity?.reduce((sum, item) => sum + item.posts + item.messages, 0);
  const stamp = overview ? new Date(overview.observedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' }) : '';
  return `<div id="admin-overview" class="space-y-6">
    <section class="rounded-3xl border border-amber/20 bg-gradient-to-br from-amber/10 via-surface-raised to-surface-base p-6 sm:p-8">
      <p class="text-xs tracking-widest uppercase text-amber font-mono">Workspace overview</p>
      <h2 class="mt-3 text-2xl sm:text-3xl font-bold text-white">A clear view of your workspace.</h2>
      <p class="mt-3 text-sm text-slate-400 max-w-2xl">Recorded content, activity, and reports from your database. Traffic and security analytics are not connected.</p>
      <div id="admin-overview-status" role="status" class="mt-5 text-xs text-slate-300">
        ${error ? `<span class="text-amber">${escape(error)}</span> ${overview ? 'Showing the last successful snapshot.' : 'No snapshot available.'}` : syncing ? 'Refreshing workspace data…' : overview ? overview.unavailable.length ? 'Some data is unavailable.' : 'Snapshot updated.' : 'Waiting for the first snapshot…'}
        ${stamp ? `<span class="block mt-2 text-slate-400">${escape(overview!.source)} · ${escape(stamp)} (local time)</span>` : ''}
      </div>
    </section>
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      ${card('identities', 'Recorded identities', counts?.identities, 'Distinct authors and assigned roles')}
      ${card('posts', 'Stored posts', counts?.posts, 'All statuses, across the database')}
      ${card('messages', 'Stored messages', counts?.messages, 'Messages persisted to the database')}
      ${card('channels', 'Channels', counts?.channels, 'Channels recorded in the database')}
    </div>
    <section class="rounded-2xl border border-white/10 bg-surface-raised p-5 sm:p-6" aria-labelledby="admin-activity-title">
      <div class="flex flex-wrap justify-between gap-3"><div><h3 id="admin-activity-title" class="font-bold text-white">Content activity</h3><p class="text-xs text-slate-400 mt-1">Last 24 hourly buckets · current hour is partial · UTC</p></div><p class="text-sm text-amber">${number(total)} recorded items</p></div>
      ${activity ? `<div class="flex gap-1 items-end h-32 mt-6" role="img" aria-label="Hourly stored posts and messages. ${total} items in this window.">
        ${activity.map(item => `<div class="flex-1 h-full flex items-end" title="${new Date(item.hour).toISOString().slice(11, 16)} UTC: ${item.posts} posts, ${item.messages} messages"><div class="w-full bg-amber/80 rounded-t" style="height:${(item.posts + item.messages) / max * 100}%;min-height:${item.posts + item.messages ? 3 : 0}px"></div></div>`).join('')}
      </div><div class="flex justify-between border-t border-white/10 pt-2 text-xs text-slate-400"><span>${new Date(activity[0].hour).toISOString().slice(11, 16)} UTC</span><span>Current hour</span></div>
      ${total === 0 ? '<p class="text-sm text-slate-400 mt-4">No stored activity in this window.</p>' : ''}
      <details class="mt-4 text-xs text-slate-400"><summary class="cursor-pointer">View hourly counts</summary><div class="overflow-x-auto mt-3"><table class="w-full text-left"><thead><tr><th>Hour (UTC)</th><th>Posts</th><th>Messages</th></tr></thead><tbody>${activity.map(item => `<tr><td class="py-1">${new Date(item.hour).toISOString().slice(0,16).replace('T', ' ')}</td><td>${item.posts}</td><td>${item.messages}</td></tr>`).join('')}</tbody></table></div></details>` : '<p class="py-10 text-center text-sm text-slate-400">Activity data is unavailable. Refresh to try again.</p>'}
    </section>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section class="rounded-2xl border border-white/10 bg-surface-raised p-6"><h3 class="font-bold text-white">Reports awaiting review</h3><p class="text-3xl text-amber font-bold my-3">${number(counts?.pendingReports)}</p><p class="text-sm text-slate-400">${counts?.pendingReports == null ? 'Report count unavailable.' : counts.pendingReports === 0 ? 'No pending reports in the database.' : 'Review the report details before taking action.'}</p><button class="admin-tab-btn mt-5 px-4 py-2 rounded-xl border border-amber/30 text-amber text-sm" data-admin-tab="dsa">Open reports</button></section>
      <section class="rounded-2xl border border-white/10 bg-surface-raised p-6"><h3 class="font-bold text-white">Traffic & security analytics</h3><span class="inline-block my-3 px-2 py-1 rounded bg-white/5 text-xs text-slate-300">Not connected</span><p class="text-sm text-slate-400">Page views, bandwidth, live connections, request latency, and blocked attacks are unavailable. No incident feed is connected.</p><p class="mt-4 text-xs text-slate-400">Content counts above are database records, not visitor or traffic measurements.</p></section>
    </div>
  </div>`;
}
