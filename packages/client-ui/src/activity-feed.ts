// ─── activity-feed.ts ────────────────────────────────────────────────────────
// Live Network Activity stream for Aetheris Omni-Sphere — Right Rail widget
// Self-contained, no external dependencies.
// ─────────────────────────────────────────────────────────────────────────────

import { isLocalDev } from './admin-auth.js';

export interface ActivityEvent {
  id: string;
  type:
    | 'post'
    | 'vote'
    | 'reply'
    | 'join'
    | 'slashing'
    | 'download'
    | 'award'
    | 'boost';
  actorFP: string;
  actorRole: 'admin' | 'moderator' | 'contributor' | 'member' | 'ghost';
  targetTitle?: string;
  targetId?: string;
  timestamp: number;
  meta: Record<string, any>;
}

// ─── Role colour map ──────────────────────────────────────────────────────────
const ROLE_COLOUR: Record<string, string> = {
  admin:       'text-crimson',
  moderator:   'text-amber',
  contributor: 'text-aether',
  member:      'text-cyphr',
  ghost:       'text-white/40',
};

// ─── Type descriptors ─────────────────────────────────────────────────────────
const TYPE_EMOJI: Record<string, string> = {
  post:      '📝',
  vote:      '🗳️',
  reply:     '💬',
  join:      '🌐',
  slashing:  '⚔️',
  download:  '⬇️',
  award:     '🏆',
  boost:     '🚀',
};

const TYPE_COLOUR: Record<string, string> = {
  post:      'text-cyphr',
  vote:      'text-signal',
  reply:     'text-blue-400',
  join:      'text-aether',
  slashing:  'text-crimson',
  download:  'text-white/70',
  award:     'text-amber',
  boost:     'text-signal',
};

// bg tint applied to each event row
const TYPE_BG: Record<string, string> = {
  post:      'bg-blue-900/20',
  vote:      'bg-green-900/20',
  reply:     'bg-blue-800/10',
  join:      'bg-purple-900/20',
  slashing:  'bg-red-900/25',
  download:  'bg-slate-700/20',
  award:     'bg-yellow-900/25',
  boost:     'bg-green-800/15',
};

// ─── Action description templates ─────────────────────────────────────────────
const ACTION_TEMPLATES: Record<string, (e: ActivityEvent) => string> = {
  post:     (e) => `posted "${(e.targetTitle ?? 'untitled').slice(0, 28)}"`,
  vote:     (e) => `voted on "${(e.targetTitle ?? 'post').slice(0, 26)}"`,
  reply:    (e) => `replied to "${(e.targetTitle ?? 'thread').slice(0, 24)}"`,
  join:     (_) => `joined the network`,
  slashing: (e) => `slashed ${(e.meta['target'] as string | undefined ?? 'node').slice(0, 24)}`,
  download: (e) => `downloaded "${(e.targetTitle ?? 'file').slice(0, 24)}"`,
  award:    (e) => `awarded "${(e.meta['badge'] as string | undefined ?? 'badge').slice(0, 26)}"`,
  boost:    (e) => `boosted "${(e.targetTitle ?? 'post').slice(0, 26)}"`,
};

// ─── Utility ──────────────────────────────────────────────────────────────────
let _idCounter = 0;
function generateId(): string {
  return `evt-${Date.now()}-${++_idCounter}`;
}

// ─── Simulator data pools ─────────────────────────────────────────────────────
const DEMO_FPS: string[] = [
  'a3f9d1', 'c7b82e', '4d5f1a', 'e2a0b5', '9c3d7f',
  'b1e4c6', '7f02a3', 'd8c5b2', '3e9f4d', '6a1b0c',
  '1d7e5f', 'f3a2b9', '5c8d0e', '2b6f4a', '8e1c3d',
];

const DEMO_ROLES: ActivityEvent['actorRole'][] = [
  'admin', 'moderator', 'contributor', 'member', 'member', 'member', 'ghost',
];

const DEMO_TITLES: string[] = [
  'ZK Proof Collusion Patterns',
  'Relay Node Architecture v2',
  'Aetheris Governance Proposal #17',
  'Deep Dive: Mesh Propagation',
  'Anonymous Voting Protocol',
  'Security Audit Q3 2026',
  'New Consensus Algorithm RFC',
  'Fingerprint Rotation Guide',
  'Signal Detection Heuristics',
  'Vault Encryption Benchmark',
];

const DEMO_BADGES: string[] = [
  'Pioneer', 'Sentinel', 'Cipher', 'Architect', 'Validator',
];

const EVENT_TYPES: ActivityEvent['type'][] = [
  'post', 'vote', 'reply', 'join', 'slashing', 'download', 'award', 'boost',
];

// ─── Main class ───────────────────────────────────────────────────────────────
class NetworkActivityFeed {
  public events: ActivityEvent[] = [];
  public isPaused: boolean = false;

  private _simulatorHandle: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_live_activity_events') : null;
    if (saved) {
      try {
        this.events = JSON.parse(saved);
      } catch {
        this.events = [];
      }
    } else if (isLocalDev()) {
      this._seedDemoEvents();
    }
  }

  // ─── Seed 5 demo events ───────────────────────────────────────────────────
  private _seedDemoEvents(): void {
    const now = Date.now();
    const seeds: Omit<ActivityEvent, 'id'>[] = [
      {
        type: 'post',
        actorFP: 'a3f9d1',
        actorRole: 'contributor',
        targetTitle: 'ZK Proof Collusion Patterns',
        targetId: 'post-001',
        timestamp: now - 12_000,
        meta: {},
      },
      {
        type: 'vote',
        actorFP: 'c7b82e',
        actorRole: 'member',
        targetTitle: 'New Consensus Algorithm RFC',
        targetId: 'post-002',
        timestamp: now - 27_000,
        meta: { direction: 'up' },
      },
      {
        type: 'join',
        actorFP: '4d5f1a',
        actorRole: 'ghost',
        timestamp: now - 55_000,
        meta: { relay: 'relay-eu-04' },
      },
      {
        type: 'slashing',
        actorFP: 'e2a0b5',
        actorRole: 'moderator',
        timestamp: now - 93_000,
        meta: { target: 'node-7f02a3', reason: 'double-sign' },
      },
      {
        type: 'award',
        actorFP: '9c3d7f',
        actorRole: 'admin',
        targetTitle: 'Security Audit Q3 2026',
        timestamp: now - 140_000,
        meta: { badge: 'Sentinel', recipient: 'b1e4c6' },
      },
    ];

    for (const seed of seeds) {
      this.events.push({ id: generateId(), ...seed });
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Prepend a new event to the feed.  Trims the list to the newest 50.
   */
  addEvent(event: Omit<ActivityEvent, 'id'>): void {
    const full: ActivityEvent = { id: generateId(), ...event };
    this.events.unshift(full);
    if (this.events.length > 50) {
      this.events = this.events.slice(0, 50);
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('aetheris_live_activity_events', JSON.stringify(this.events));
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aetheris:activity-event', { detail: full }));
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  getTypeEmoji(type: string): string {
    return TYPE_EMOJI[type] ?? '❓';
  }

  getTypeColor(type: string): string {
    return TYPE_COLOUR[type] ?? 'text-white/60';
  }

  /**
   * Human-readable relative timestamp.
   * Outputs: "2s ago", "14m ago", "3h ago", "2d ago"
   */
  formatTimeAgo(ts: number): string {
    const diffMs = Date.now() - ts;
    const diffSec = Math.floor(diffMs / 1_000);
    if (diffSec < 60)  return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60)  return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)   return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  /**
   * Renders the full right-rail widget as an HTML string.
   * Uses Tailwind utility classes per Aetheris dark-theme spec.
   */
  renderActivityWidget(): string {
    const visibleEvents = this.events.slice(0, 15);

    const pauseBanner = this.isPaused
      ? `<div class="flex items-center justify-center gap-2 py-2 px-3 mb-2
                     bg-amber/10 border border-amber/30 rounded-lg text-amber text-xs font-mono">
           ⏸ Activity paused
         </div>`
      : '';

    const pauseButtonLabel = this.isPaused ? 'Resume ▶' : 'Pause ⏸';
    const pauseButtonClass = this.isPaused
      ? 'bg-signal/20 hover:bg-signal/30 text-signal border-signal/40'
      : 'bg-surface-overlay hover:bg-surface-highlight text-white/60 border-white/10';

    const eventRows = visibleEvents.map((evt, index) => {
      const emoji       = this.getTypeEmoji(evt.type);
      const typeColour  = this.getTypeColor(evt.type);
      const typeBg      = TYPE_BG[evt.type] ?? 'bg-surface-raised/30';
      const roleColour  = ROLE_COLOUR[evt.actorRole] ?? 'text-white/60';
      const fpShort     = evt.actorFP.slice(0, 6);
      const actionFn    = ACTION_TEMPLATES[evt.type];
      const actionText  = actionFn ? actionFn(evt).slice(0, 40) : evt.type;
      const timeStr     = this.formatTimeAgo(evt.timestamp);

      // Newest event gets slide-in animation class
      const animClass = index === 0 && !this.isPaused
        ? 'animate-in slide-in-from-top-2 fade-in duration-300'
        : '';

      return `
        <div class="flex items-start gap-2 px-3 py-2 rounded-lg ${typeBg} ${animClass}
                    border border-white/5 hover:bg-surface-overlay transition-all cursor-default"
             data-event-id="${evt.id}" data-event-type="${evt.type}">

          <!-- Emoji badge -->
          <div class="flex-shrink-0 w-6 h-6 flex items-center justify-center
                      rounded-full bg-surface-base text-sm mt-0.5" title="${evt.type}">
            ${emoji}
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-1 flex-wrap">
              <span class="font-mono text-xs ${roleColour} font-semibold leading-tight
                           truncate" title="Fingerprint: ${evt.actorFP}">
                id:${fpShort}
              </span>
              <span class="text-white/40 text-xs">·</span>
              <span class="text-white/55 text-xs truncate leading-tight max-w-[140px]"
                    title="${actionText}">
                ${actionText}
              </span>
            </div>
          </div>

          <!-- Timestamp -->
          <div class="flex-shrink-0 text-white/30 text-[10px] font-mono mt-0.5 whitespace-nowrap">
            ${timeStr}
          </div>
        </div>`;
    }).join('\n');

    const emptyState = visibleEvents.length === 0
      ? `<div class="flex flex-col items-center justify-center py-8 text-white/25 text-sm gap-1">
           <span class="text-2xl">📭</span>
           <span>No activity yet</span>
         </div>`
      : '';

    const footerIcons = EVENT_TYPES
      .map(t => `<span class="text-[9px] ${TYPE_COLOUR[t] ?? ''} opacity-60" title="${t}">${TYPE_EMOJI[t] ?? ''}</span>`)
      .join('');

    const pulseClass = this.isPaused ? '' : 'animate-pulse';

    return `
<div class="flex flex-col w-72 bg-surface-base rounded-xl border border-white/5
            overflow-hidden shadow-xl"
     id="network-activity-feed">

  <!-- Header -->
  <div class="flex items-center justify-between px-3 py-2.5
              border-b border-white/5 bg-surface-raised">
    <div class="flex items-center gap-2">
      <div class="w-1.5 h-1.5 rounded-full bg-signal ${pulseClass}"></div>
      <span class="text-white/90 text-sm font-semibold tracking-tight">⚡ Live Network Activity</span>
    </div>
    <button
      class="px-2 py-0.5 rounded border text-xs font-mono transition-all ${pauseButtonClass}"
      onclick="networkActivityFeed.isPaused ? networkActivityFeed.resume() : networkActivityFeed.pause()"
      title="${this.isPaused ? 'Resume activity stream' : 'Pause activity stream'}"
    >
      ${pauseButtonLabel}
    </button>
  </div>

  <!-- Event count pill -->
  <div class="flex items-center justify-between px-3 pt-2 pb-1">
    <span class="text-white/30 text-[10px] font-mono">
      ${this.events.length} events · showing ${visibleEvents.length}
    </span>
    <span class="text-white/25 text-[10px] font-mono">max 50</span>
  </div>

  <!-- Pause banner -->
  <div class="px-3">
    ${pauseBanner}
  </div>

  <!-- Event list -->
  <div class="flex flex-col gap-1 px-3 pb-3 overflow-y-auto max-h-[480px]
              scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
       id="activity-event-list">
    ${emptyState}
    ${eventRows}
  </div>

  <!-- Footer -->
  <div class="px-3 py-2 border-t border-white/5 bg-surface-raised/50">
    <div class="flex items-center justify-between">
      <span class="text-white/20 text-[10px] font-mono">NETWORK ACTIVITY STREAM</span>
      <div class="flex gap-1">
        ${footerIcons}
      </div>
    </div>
  </div>
</div>`;
  }

  // ─── Simulator ────────────────────────────────────────────────────────────

  /**
   * Starts a realistic random event simulator.
   * Fires every 3-8 seconds; respects isPaused.
   * Call once; self-reschedules until stopped.
   */
  startSimulator(): void {
    if (!isLocalDev()) return; // Never run simulation loop in live production
    if (this._simulatorHandle !== null) return; // already running

    const schedule = (): void => {
      const delayMs = 3_000 + Math.random() * 5_000; // 3-8 s
      this._simulatorHandle = setTimeout(() => {
        if (!this.isPaused) {
          this._emitRandomEvent();
        }
        // Reschedule regardless of pause state so we resume cleanly
        this._simulatorHandle = null;
        schedule();
      }, delayMs);
    };

    schedule();
  }

  /** Stop the simulator (clears pending timeout). */
  stopSimulator(): void {
    if (this._simulatorHandle !== null) {
      clearTimeout(this._simulatorHandle);
      this._simulatorHandle = null;
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private _randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private _emitRandomEvent(): void {
    const type    = this._randomItem(EVENT_TYPES);
    const actorFP = this._randomItem(DEMO_FPS);
    const role    = this._randomItem(DEMO_ROLES);

    const baseEvent: Omit<ActivityEvent, 'id'> = {
      type,
      actorFP,
      actorRole: role,
      timestamp: Date.now(),
      meta: {},
    };

    switch (type) {
      case 'post':
        baseEvent.targetTitle = this._randomItem(DEMO_TITLES);
        baseEvent.targetId    = `post-${Math.floor(Math.random() * 9000 + 1000)}`;
        break;

      case 'vote':
        baseEvent.targetTitle = this._randomItem(DEMO_TITLES);
        baseEvent.targetId    = `post-${Math.floor(Math.random() * 9000 + 1000)}`;
        baseEvent.meta        = { direction: Math.random() > 0.2 ? 'up' : 'down' };
        break;

      case 'reply':
        baseEvent.targetTitle = this._randomItem(DEMO_TITLES);
        baseEvent.targetId    = `post-${Math.floor(Math.random() * 9000 + 1000)}`;
        baseEvent.meta        = { length: Math.floor(Math.random() * 200 + 20) };
        break;

      case 'join':
        baseEvent.meta = {
          relay: `relay-${this._randomItem(['eu', 'us', 'ap', 'sa'])}-${Math.floor(Math.random() * 20 + 1).toString().padStart(2, '0')}`,
        };
        break;

      case 'slashing': {
        const targetFP = this._randomItem(DEMO_FPS.filter(fp => fp !== actorFP));
        baseEvent.meta = {
          target:   `node-${targetFP}`,
          reason:   this._randomItem(['double-sign', 'downtime', 'equivocation', 'invalid-block']),
          severity: this._randomItem(['low', 'medium', 'high']),
        };
        break;
      }

      case 'download':
        baseEvent.targetTitle = this._randomItem(DEMO_TITLES);
        baseEvent.targetId    = `file-${Math.floor(Math.random() * 9000 + 1000)}`;
        baseEvent.meta        = { sizeKb: Math.floor(Math.random() * 4096 + 64) };
        break;

      case 'award': {
        const recipientFP = this._randomItem(DEMO_FPS.filter(fp => fp !== actorFP));
        baseEvent.meta = {
          badge:     this._randomItem(DEMO_BADGES),
          recipient: recipientFP,
        };
        break;
      }

      case 'boost':
        baseEvent.targetTitle = this._randomItem(DEMO_TITLES);
        baseEvent.targetId    = `post-${Math.floor(Math.random() * 9000 + 1000)}`;
        baseEvent.meta        = { boostAmount: Math.floor(Math.random() * 50 + 1) };
        break;

      default:
        break;
    }

    this.addEvent(baseEvent);
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────
export const networkActivityFeed = new NetworkActivityFeed();
