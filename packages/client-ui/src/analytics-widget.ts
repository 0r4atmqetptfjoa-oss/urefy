// analytics-widget.ts
// UREfy — Local Analytics Dashboard
// Zero external dependencies. All data stays on device.

import { isDemoModeEnabled } from './demo-mode.js';

export interface DailyMetric {
  date: string;          // ISO date string: 'YYYY-MM-DD'
  postsRead: number;
  upvotes: number;
  replies: number;
  sessionMinutes: number;
}

const STORAGE_KEY = 'aetheris_analytics';

/** Returns 'YYYY-MM-DD' for a given Date (or today if omitted). */
function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns an empty DailyMetric for the given date string. */
function emptyMetric(date: string): DailyMetric {
  return { date, postsRead: 0, upvotes: 0, replies: 0, sessionMinutes: 0 };
}

/** Realistic 7-day seeds — values simulate an active user. */
const SEED_OFFSETS: Array<[number, number, number, number]> = [
  // [postsRead, upvotes, replies, sessionMinutes]
  [34, 8, 3, 47],
  [19, 4, 1, 22],
  [51, 12, 7, 68],
  [28, 6, 2, 35],
  [43, 9, 5, 54],
  [15, 3, 0, 18],
  [37, 7, 4, 49],
];

class LocalAnalyticsDashboard {
  public metrics: DailyMetric[];
  public sessionStart: number;

  constructor() {
    this.sessionStart = Date.now();
    this.metrics = this._load();
    this._ensureToday();
  }

  // ─── Persistence ────────────────────────────────────────────────────────────

  private _load(): DailyMetric[] {
    try {
      const raw = typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY)
        : null;
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return (parsed as DailyMetric[]).slice(-7);
        }
      }
    } catch {
      // localStorage unavailable or corrupted — seed fresh data
    }
    return this._seedData();
  }

  private _save(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.metrics.slice(-7)));
      }
    } catch {
      // ignore write errors (private browsing, quota, etc.)
    }
  }

  /** Generates realistic seed data in dev, or starts clean at zero in live production. */
  private _seedData(): DailyMetric[] {
    const result: DailyMetric[] = [];
    const now = new Date();
    const isDev = isDemoModeEnabled();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = toDateKey(d);
      const [postsRead, upvotes, replies, sessionMinutes] = (isDev && SEED_OFFSETS[6 - i])
        ? SEED_OFFSETS[6 - i]
        : [0, 0, 0, 0];
      result.push({ date: dateKey, postsRead, upvotes, replies, sessionMinutes });
    }
    return result;
  }

  /** Ensure there's a record for today; append if missing. */
  private _ensureToday(): void {
    const todayKey = toDateKey();
    const exists = this.metrics.some(m => m.date === todayKey);
    if (!exists) {
      // Trim to keep only last 6, then push today
      if (this.metrics.length >= 7) {
        this.metrics = this.metrics.slice(-6);
      }
      this.metrics.push(emptyMetric(todayKey));
      this._save();
    }
  }

  // ─── Mutators ────────────────────────────────────────────────────────────────

  /** Increments today's postsRead counter and updates sessionMinutes. */
  public recordPostView(): void {
    const today = this._todayRecord();
    today.postsRead += 1;
    today.sessionMinutes = this._currentSessionMinutes();
    this._save();
  }

  /** Increments today's upvotes counter. */
  public recordUpvote(): void {
    const today = this._todayRecord();
    today.upvotes += 1;
    this._save();
  }

  /** Increments today's replies counter. */
  public recordReply(): void {
    const today = this._todayRecord();
    today.replies += 1;
    this._save();
  }

  private _currentSessionMinutes(): number {
    return Math.floor((Date.now() - this.sessionStart) / 60_000);
  }

  private _todayRecord(): DailyMetric {
    const todayKey = toDateKey();
    let record = this.metrics.find(m => m.date === todayKey);
    if (!record) {
      this._ensureToday();
      record = this.metrics.find(m => m.date === todayKey)!;
    }
    return record;
  }

  // ─── Accessors ───────────────────────────────────────────────────────────────

  /** Returns this week's DailyMetric for today. */
  public getToday(): DailyMetric {
    return { ...this._todayRecord() };
  }

  /** Aggregates all stored metrics into week-level totals. */
  public getWeekTotal(): Record<string, number> {
    return this.metrics.reduce(
      (acc, m) => {
        acc['postsRead'] = (acc['postsRead'] ?? 0) + m.postsRead;
        acc['upvotes'] = (acc['upvotes'] ?? 0) + m.upvotes;
        acc['replies'] = (acc['replies'] ?? 0) + m.replies;
        acc['sessionMinutes'] = (acc['sessionMinutes'] ?? 0) + m.sessionMinutes;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * Returns the date string ('YYYY-MM-DD') of the day with the highest
   * combined activity score (postsRead + upvotes * 2 + replies * 3).
   */
  public getMostActiveDay(): string {
    if (this.metrics.length === 0) return toDateKey();
    let best = this.metrics[0];
    let bestScore = this._activityScore(best);
    for (const m of this.metrics) {
      const score = this._activityScore(m);
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best.date;
  }

  private _activityScore(m: DailyMetric): number {
    return m.postsRead + m.upvotes * 2 + m.replies * 3;
  }

  // ─── Rendering helpers ───────────────────────────────────────────────────────

  /**
   * Renders a mini sparkline SVG (100x24px) from an array of numeric values.
   * No axes — just a glowing polyline whose stroke is determined by `color`.
   */
  public renderSparkline(values: number[], color: string): string {
    if (values.length === 0) return '';

    const W = 100;
    const H = 24;
    const padding = 2;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points: string = values
      .map((v, i) => {
        const x = padding + (i / Math.max(values.length - 1, 1)) * (W - padding * 2);
        const y = H - padding - ((v - min) / range) * (H - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const filterId = `glow-${color.replace(/[^a-z0-9]/gi, '')}`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
  <defs>
    <filter id="${filterId}" x="-20%" y="-60%" width="140%" height="220%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <polyline
    points="${points}"
    fill="none"
    stroke="${color}"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    filter="url(#${filterId})"
  />
</svg>`;
  }

  // ─── Main panel ──────────────────────────────────────────────────────────────

  /**
   * Renders the full analytics panel as an HTML string.
   * Uses Tailwind classes consistent with the UREfy design system.
   */
  public renderAnalyticsPanel(): string {
    const week = this.getWeekTotal();
    const today = this.getToday();
    const mostActive = this.getMostActiveDay();
    const sessionMins = this._currentSessionMinutes();

    const postsReadValues = this.metrics.map(m => m.postsRead);
    const upvotesValues = this.metrics.map(m => m.upvotes);

    const sparklinePosts = this.renderSparkline(postsReadValues, '#00e5ff');
    const sparklineUpvotes = this.renderSparkline(upvotesValues, '#22c55e');

    /** Format a short label from 'YYYY-MM-DD' => 'Weekday, DD Mon'. */
    const formatDate = (iso: string): string => {
      const d = new Date(iso + 'T12:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
    };

    /** Format minutes => 'Xh Ym' or 'Ym'. */
    const fmtTime = (mins: number): string => {
      if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
      return `${mins}m`;
    };

    const statCard = (
      label: string,
      value: string | number,
      colorClass: string,
      sparklineSvg: string = ''
    ): string => `
      <div class="flex flex-col gap-1 bg-surface-overlay rounded-lg p-3 min-w-0">
        <span class="text-xs text-white/40 font-sans uppercase tracking-wide">${label}</span>
        <span class="text-2xl font-mono font-bold ${colorClass}">${value}</span>
        ${sparklineSvg ? `<div class="mt-1 opacity-80">${sparklineSvg}</div>` : ''}
      </div>`;

    return `
<div class="flex flex-col gap-3 p-4 bg-surface-raised rounded-xl border border-white/5 font-sans select-none animate-in fade-in"
     role="region" aria-label="Local Engagement Analytics">

  <!-- Header -->
  <div class="flex flex-col gap-0.5">
    <h2 class="text-sm font-semibold text-white/90 tracking-tight">
      📊 Engagement Analytics
      <span class="ml-1 text-xs font-normal text-white/30 font-mono">Local Only · No Data Leaves Device</span>
    </h2>
    <p class="text-xs italic text-white/30">
      All metrics are computed on-device and persisted exclusively in your browser's localStorage.
    </p>
  </div>

  <!-- 2x2 Stats Grid -->
  <div class="grid grid-cols-2 gap-2">
    ${statCard('Posts Read (7d)', week['postsRead'] ?? 0, 'text-cyphr', sparklinePosts)}
    ${statCard('Upvotes Given (7d)', week['upvotes'] ?? 0, 'text-signal', sparklineUpvotes)}
    ${statCard('Replies (7d)', week['replies'] ?? 0, 'text-aether')}
    ${statCard('Session Time', fmtTime(sessionMins), 'text-amber')}
  </div>

  <!-- Today snapshot -->
  <div class="flex items-center gap-3 bg-surface-overlay rounded-lg px-3 py-2 text-xs text-white/50 font-mono">
    <span class="text-white/30">Today</span>
    <span class="text-cyphr">${today.postsRead} posts</span>
    <span class="text-white/20">·</span>
    <span class="text-signal">${today.upvotes} up</span>
    <span class="text-white/20">·</span>
    <span class="text-aether">${today.replies} replies</span>
  </div>

  <!-- Most Active Day -->
  <div class="flex items-center gap-2 rounded-lg bg-surface-overlay px-3 py-2 border-l-2 border-amber">
    <span class="text-xs text-white/40 font-sans">Most Active Day</span>
    <span class="ml-auto text-xs font-mono font-semibold text-amber">${formatDate(mostActive)}</span>
  </div>

  <!-- Privacy note -->
  <div class="flex items-center gap-2 text-xs text-white/30 font-sans border-t border-white/5 pt-2">
    <span class="text-signal">🔒</span>
    <span>Zero-knowledge analytics. No remote tracking.</span>
  </div>
</div>`.trim();
  }

  // ─── Compact stats ───────────────────────────────────────────────────────────

  /**
   * Returns a compact inline HTML snippet — suitable for footers or sidebars.
   * Shows 3 key counters in a single row.
   */
  public renderCompactStats(): string {
    const week = this.getWeekTotal();
    const sessionMins = this._currentSessionMinutes();

    const fmtTime = (mins: number): string =>
      mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60}m` : `${mins}m`;

    return `
<div class="inline-flex items-center gap-3 px-3 py-1.5 bg-surface-overlay rounded-full text-xs font-mono border border-white/5 select-none"
     role="status" aria-label="Quick analytics summary">
  <span class="flex items-center gap-1">
    <span class="text-white/30">📖</span>
    <span class="text-cyphr font-semibold">${week['postsRead'] ?? 0}</span>
  </span>
  <span class="text-white/10">|</span>
  <span class="flex items-center gap-1">
    <span class="text-white/30">↑</span>
    <span class="text-signal font-semibold">${week['upvotes'] ?? 0}</span>
  </span>
  <span class="text-white/10">|</span>
  <span class="flex items-center gap-1">
    <span class="text-white/30">⏱</span>
    <span class="text-amber font-semibold">${fmtTime(sessionMins)}</span>
  </span>
  <span class="text-white/20 text-[9px] ml-1">🔒 local</span>
</div>`.trim();
  }
}

export const localAnalytics = new LocalAnalyticsDashboard();
