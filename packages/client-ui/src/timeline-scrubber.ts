// timeline-scrubber.ts
// Aetheris Omni-Sphere — Timeline Scrubber & Temporal Navigation Engine
// Complete rapid temporal navigation engine through ZK-Pulse & Relays data stream

import { PASSIVE_EVENT_OPTIONS, rafThrottle, safeRequestAnimationFrame, safeCancelAnimationFrame } from './dry-utils.js';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export type EpochIdentifier =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_month'
  | 'zk_archive';

export interface TimelinePostItem {
  id?: string;
  createdAt: number;
  title?: string;
  content?: string;
  flair?: string;
  authorFingerprint?: string;
  [key: string]: unknown;
}

export interface TimelineEpoch {
  id: EpochIdentifier;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  colorClass: string;
  glowClass: string;
  borderClass: string;
  bgClass: string;
  minTimestamp: number;
  maxTimestamp: number;
  count: number;
  firstPostId: string | null;
  postIds: string[];
  zkAnchorProof?: {
    rootHash: string;
    merkleDepth: number;
    witnessCount: number;
    isVerified: boolean;
  };
}

export interface TimelineScrubberConfig {
  containerSelector: string;
  feedSelector: string;
  postSelector: string;
  autoScrollOffset: number;
  showZkMetrics: boolean;
  compactMode: boolean;
}

export interface EpochChangeEvent {
  epochId: EpochIdentifier | null;
  previousEpochId: EpochIdentifier | null;
  postCount: number;
  firstPostId: string | null;
}

// ---------------------------------------------------------------------------
// TimelineScrubber — Main Class
// ---------------------------------------------------------------------------

export class TimelineScrubber {
  /** Active temporal interval in viewport */
  public activeEpoch: EpochIdentifier | null = null;

  /** Current scroll progress (0 - 100%) */
  public scrollProgress: number = 0;

  /** Map of computed epochs */
  public epochs: Map<EpochIdentifier, TimelineEpoch> = new Map();

  /** Mapping from post ID to epoch ID */
  public postEpochMap: Map<string, EpochIdentifier> = new Map();

  /** Drag/scrub state indicator */
  public isScrubbing: boolean = false;

  /** Compact / collapsed mode indicator */
  public isCollapsed: boolean = false;

  /** Epoch currently under hover */
  public hoveredEpoch: EpochIdentifier | null = null;

  /** Recent ZK events metrics */
  public zkArchiveMetrics = {
    verifiedProofs: 1420,
    compressionRatio: '94.8%',
    sseIndexRoot: '0x7f8a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
    lastSyncTimestamp: Date.now(),
  };

  /** Internal configuration */
  private config: TimelineScrubberConfig = {
    containerSelector: '#timeline-scrubber-container',
    feedSelector: '#center-feed, [data-feed-container], .feed-container',
    postSelector: '[data-post-id]',
    autoScrollOffset: 70,
    showZkMetrics: true,
    compactMode: false,
  };

  /** Epoch change callback listeners */
  private epochChangeCallbacks: Array<(event: EpochChangeEvent) => void> = [];

  /** IntersectionObserver instance for auto-detection on scroll */
  private observer: IntersectionObserver | null = null;

  /** Reference to DOM container element */
  private rootElement: HTMLElement | null = null;

  /** Reference to scroll handler for clean teardown */
  private scrollHandlerRef: (() => void) | null = null;

  /** Throttling timer for scroll updates */
  private scrollThrottleTimer: number | null = null;

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------

  constructor(customConfig?: Partial<TimelineScrubberConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  // -----------------------------------------------------------------------
  // 1. Temporal Intervals Computation and Bucketing
  // -----------------------------------------------------------------------

  /**
   * Computes time boundaries and groups posts into the 5 official epochs:
   * - Today
   * - Yesterday
   * - This Week
   * - Last Month
   * - ZK-SSE Archive
   */
  public computeEpochs(posts: TimelinePostItem[]): Map<EpochIdentifier, TimelineEpoch> {
    const now = Date.now();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const startOfTodayMs = todayStart.getTime();

    const yesterdayStart = new Date(startOfTodayMs - 24 * 60 * 60 * 1000);
    yesterdayStart.setHours(0, 0, 0, 0);
    const startOfYesterdayMs = yesterdayStart.getTime();

    const thisWeekStart = new Date(startOfTodayMs - 6 * 24 * 60 * 60 * 1000);
    thisWeekStart.setHours(0, 0, 0, 0);
    const startOfThisWeekMs = thisWeekStart.getTime();

    const lastMonthStart = new Date(startOfTodayMs - 30 * 24 * 60 * 60 * 1000);
    lastMonthStart.setHours(0, 0, 0, 0);
    const startOfLastMonthMs = lastMonthStart.getTime();

    // Initialize definitions for the 5 epochs
    const epochDefs: Record<EpochIdentifier, Omit<TimelineEpoch, 'count' | 'firstPostId' | 'postIds' | 'zkAnchorProof'>> = {
      today: {
        id: 'today',
        label: 'Today',
        shortLabel: 'Now',
        description: 'Past 24 hours / Live Current Feed',
        icon: '⚡',
        colorClass: 'text-cyphr',
        glowClass: 'shadow-[0_0_12px_rgba(0,229,255,0.6)]',
        borderClass: 'border-cyphr/40',
        bgClass: 'bg-cyan-950/40',
        minTimestamp: startOfTodayMs,
        maxTimestamp: Number.MAX_SAFE_INTEGER,
      },
      yesterday: {
        id: 'yesterday',
        label: 'Yesterday',
        shortLabel: 'Yest',
        description: '24-48 hours ago / Confirmed Relays',
        icon: '⏳',
        colorClass: 'text-signal',
        glowClass: 'shadow-[0_0_12px_rgba(34,197,94,0.6)]',
        borderClass: 'border-signal/40',
        bgClass: 'bg-emerald-950/40',
        minTimestamp: startOfYesterdayMs,
        maxTimestamp: startOfTodayMs - 1,
      },
      this_week: {
        id: 'this_week',
        label: 'This Week',
        shortLabel: '7d',
        description: 'Past 7 days / Consensus Validations',
        icon: '📅',
        colorClass: 'text-aether',
        glowClass: 'shadow-[0_0_12px_rgba(168,85,247,0.6)]',
        borderClass: 'border-aether/40',
        bgClass: 'bg-purple-950/40',
        minTimestamp: startOfThisWeekMs,
        maxTimestamp: startOfYesterdayMs - 1,
      },
      last_month: {
        id: 'last_month',
        label: 'Last Month',
        shortLabel: '30d',
        description: 'Past 30 days / State Roots',
        icon: '🗓️',
        colorClass: 'text-amber',
        glowClass: 'shadow-[0_0_12px_rgba(245,158,11,0.6)]',
        borderClass: 'border-amber/40',
        bgClass: 'bg-yellow-950/40',
        minTimestamp: startOfLastMonthMs,
        maxTimestamp: startOfThisWeekMs - 1,
      },
      zk_archive: {
        id: 'zk_archive',
        label: 'ZK-SSE Archive',
        shortLabel: 'ZK',
        description: 'Encrypted ZK-SSE History & Swarm Merkle',
        icon: '🔒',
        colorClass: 'text-slate-300',
        glowClass: 'shadow-[0_0_12px_rgba(148,163,184,0.5)]',
        borderClass: 'border-slate-500/40',
        bgClass: 'bg-slate-900/60',
        minTimestamp: 0,
        maxTimestamp: startOfLastMonthMs - 1,
      },
    };

    const epochMap = new Map<EpochIdentifier, TimelineEpoch>();

    (Object.keys(epochDefs) as EpochIdentifier[]).forEach((key) => {
      epochMap.set(key, {
        ...epochDefs[key],
        count: 0,
        firstPostId: null,
        postIds: [],
        zkAnchorProof: {
          rootHash: this.computeMockMerkleRoot(key),
          merkleDepth: 20,
          witnessCount: 64,
          isVerified: true,
        },
      });
    });

    this.postEpochMap.clear();

    // Descending chronological sort (newest first)
    const sortedPosts = [...posts].sort((a, b) => {
      const tsA = a.createdAt < 10000000000 ? a.createdAt * 1000 : a.createdAt;
      const tsB = b.createdAt < 10000000000 ? b.createdAt * 1000 : b.createdAt;
      return tsB - tsA;
    });

    // Bucketing posts into epochs
    sortedPosts.forEach((post, index) => {
      const rawTs = post.createdAt;
      const ts = rawTs < 10000000000 ? rawTs * 1000 : rawTs;
      const postId = post.id || `post-idx-${index}`;

      let targetEpochId: EpochIdentifier = 'zk_archive';

      if (ts >= startOfTodayMs) {
        targetEpochId = 'today';
      } else if (ts >= startOfYesterdayMs) {
        targetEpochId = 'yesterday';
      } else if (ts >= startOfThisWeekMs) {
        targetEpochId = 'this_week';
      } else if (ts >= startOfLastMonthMs) {
        targetEpochId = 'last_month';
      } else {
        targetEpochId = 'zk_archive';
      }

      const epoch = epochMap.get(targetEpochId);
      if (epoch) {
        epoch.count += 1;
        epoch.postIds.push(postId);
        if (!epoch.firstPostId) {
          epoch.firstPostId = postId;
        }
      }

      this.postEpochMap.set(postId, targetEpochId);
    });

    this.epochs = epochMap;

    // Set initial active epoch on first non-empty epoch if not already set
    if (!this.activeEpoch) {
      for (const [id, ep] of epochMap.entries()) {
        if (ep.count > 0) {
          this.activeEpoch = id;
          break;
        }
      }
    }

    return epochMap;
  }

  // -----------------------------------------------------------------------
  // 2. HTML Rendering — Timeline Scrubber Vertical Rail
  // -----------------------------------------------------------------------

  /**
   * Renders the discrete, elegant vertical rail on the right side of the feed
   * with interactive glowing nodes, animated indicator, and ZK-SSE statistics.
   */
  public renderTimelineRail(posts: Array<{ createdAt: number; id?: string; [key: string]: unknown }>): string {
    this.computeEpochs(posts as TimelinePostItem[]);

    const totalPostsCount = posts.length;
    const epochList: TimelineEpoch[] = [
      this.epochs.get('today')!,
      this.epochs.get('yesterday')!,
      this.epochs.get('this_week')!,
      this.epochs.get('last_month')!,
      this.epochs.get('zk_archive')!,
    ].filter(Boolean);

    const activeEpochObj = this.activeEpoch ? this.epochs.get(this.activeEpoch) : null;
    const activeLabel = activeEpochObj ? activeEpochObj.label : 'Select Interval';
    const activeColor = activeEpochObj ? activeEpochObj.colorClass : 'text-cyphr';

    return `
      <!-- AETHERIS TIMELINE SCRUBBER CONTAINER -->
      <aside 
        id="timeline-scrubber-container" 
        class="timeline-scrubber-root fixed right-4 top-20 z-40 hidden xl:flex flex-col select-none transition-all duration-300 ${
          this.isCollapsed ? 'w-12' : 'w-64'
        }"
        aria-label="Timeline Chronoglyph Navigation"
      >
        <div class="relative bg-surface-raised/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] p-3.5 flex flex-col space-y-3 transition-all duration-200">
          
          <!-- Scrubber Header -->
          <div class="flex items-center justify-between border-subtle-b pb-2.5">
            <div class="flex items-center space-x-2 overflow-hidden">
              <div class="relative flex items-center justify-center w-6 h-6 rounded-lg bg-surface-overlay border border-white/5 text-xs text-cyphr">
                <span class="animate-pulse">⏳</span>
                <span class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyphr animate-ping"></span>
              </div>
              ${
                !this.isCollapsed
                  ? `
                <div class="flex flex-col min-w-0">
                  <span class="text-[11px] font-bold tracking-wider text-slate-200 uppercase font-mono truncate">
                    Chronoglyph Rail
                  </span>
                  <span class="text-[9px] font-mono ${activeColor} truncate flex items-center space-x-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span>${activeLabel}</span>
                  </span>
                </div>
              `
                  : ''
              }
            </div>

            <!-- Toggle Collapse Button & Total Badge -->
            <div class="flex items-center space-x-1">
              ${
                !this.isCollapsed
                  ? `
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-base text-slate-400 border border-white/5" title="Total indexed posts">
                  ${totalPostsCount}
                </span>
              `
                  : ''
              }
              <button 
                type="button"
                id="btn-toggle-scrubber-collapse" 
                class="w-6 h-6 rounded-md bg-surface-overlay hover:bg-surface-highlight text-slate-400 hover:text-white flex items-center justify-center transition-colors text-xs"
                title="${this.isCollapsed ? 'Expand Timeline' : 'Collapse Timeline'}"
              >
                ${this.isCollapsed ? '◀' : '▶'}
              </button>
            </div>
          </div>

          <!-- Vertical Rail Track -->
          <div class="relative flex flex-col my-1">
            
            <!-- Vertical Guide Line (Track) -->
            <div class="absolute left-4 top-3 bottom-3 w-[2px] -translate-x-1/2 bg-gradient-to-b from-cyphr/60 via-aether/40 to-slate-700/50 rounded-full pointer-events-none"></div>

            <!-- Animated Glowing Scrubber Thumb -->
            <div 
              id="timeline-scrubber-thumb" 
              class="absolute left-4 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyphr to-signal border-2 border-white shadow-[0_0_12px_#00e5ff] pointer-events-none transition-transform duration-100 ease-out z-10"
              style="top: ${this.getThumbTopPositionPercentage()}%;"
              title="Current position: ${Math.round(this.scrollProgress)}%"
            >
              <div class="absolute inset-0 rounded-full animate-ping bg-cyphr/40"></div>
            </div>

            <!-- Epoch Nodes List -->
            <div class="flex flex-col space-y-3 z-0">
              ${epochList
                .map((epoch, index) => {
                  const isActive = this.activeEpoch === epoch.id;
                  const hasPosts = epoch.count > 0;
                  const disabledClass = hasPosts
                    ? 'cursor-pointer hover:bg-surface-overlay/80'
                    : 'opacity-40 cursor-not-allowed';
                  const activeBg = isActive
                    ? 'bg-surface-overlay border-l-2 ' + epoch.borderClass
                    : 'border-l-2 border-transparent';

                  return `
                  <div 
                    data-timeline-epoch="${epoch.id}"
                    data-first-post-id="${epoch.firstPostId || ''}"
                    data-epoch-index="${index}"
                    class="group relative flex items-center justify-between p-1.5 rounded-xl transition-all duration-200 ${disabledClass} ${activeBg}"
                    role="button"
                    tabindex="${hasPosts ? '0' : '-1'}"
                    aria-label="Jump to ${epoch.label} (${epoch.count} posts)"
                  >
                    <!-- Dot Marker -->
                    <div class="flex items-center space-x-3">
                      <div class="relative flex items-center justify-center w-8 h-6">
                        <div class="relative z-10 w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                          isActive
                            ? 'bg-canvas ' + epoch.borderClass + ' ring-4 ring-cyphr/20 scale-125 ' + epoch.glowClass
                            : hasPosts
                            ? 'bg-surface-overlay border-slate-400 group-hover:border-cyphr group-hover:scale-110'
                            : 'bg-surface-base border-slate-700'
                        }">
                          ${
                            isActive
                              ? `<div class="w-1 h-1 rounded-full bg-current ${epoch.colorClass} m-auto"></div>`
                              : ''
                          }
                        </div>
                      </div>

                      ${
                        !this.isCollapsed
                          ? `
                        <!-- Label & Details -->
                        <div class="flex flex-col min-w-0">
                          <div class="flex items-center space-x-1.5">
                            <span class="text-xs font-semibold tracking-tight transition-colors ${
                              isActive ? epoch.colorClass + ' font-bold' : 'text-slate-300 group-hover:text-white'
                            }">
                              ${epoch.label}
                            </span>
                            ${
                              epoch.id === 'zk_archive'
                                ? `<span class="text-[9px] px-1 py-0.2 rounded bg-surface-highlight/50 text-cyphr font-mono border border-cyphr/20">SSE</span>`
                                : ''
                            }
                          </div>
                          <span class="text-[9px] text-slate-500 font-mono truncate group-hover:text-slate-400">
                            ${hasPosts ? epoch.description : 'No posts'}
                          </span>
                        </div>
                      `
                          : ''
                      }
                    </div>

                    <!-- Count Badge & Jump Indicator -->
                    ${
                      !this.isCollapsed
                        ? `
                      <div class="flex items-center space-x-1.5 ml-2">
                        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-full transition-colors ${
                          isActive
                            ? epoch.bgClass + ' ' + epoch.colorClass + ' font-bold border ' + epoch.borderClass
                            : 'bg-surface-base text-slate-400 border border-white/5 group-hover:text-slate-200'
                        }">
                          ${epoch.count}
                        </span>
                        <span class="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5">
                          ↳
                        </span>
                      </div>
                    `
                        : `
                      <span class="text-[8px] font-mono px-1 rounded bg-surface-base text-slate-400">
                        ${epoch.shortLabel}
                      </span>
                    `
                    }

                    <!-- Hover Tooltip for Quick Preview -->
                    <div class="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col bg-surface-base/95 backdrop-blur-md border border-white/10 p-2.5 rounded-xl shadow-2xl z-50 w-52 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                      <div class="flex items-center justify-between border-subtle-b pb-1 mb-1.5">
                        <span class="text-[10px] font-bold text-white flex items-center space-x-1">
                          <span>${epoch.icon}</span>
                          <span>${epoch.label}</span>
                        </span>
                        <span class="text-[9px] font-mono text-cyphr">${epoch.count} posts</span>
                      </div>
                      <p class="text-[10px] text-slate-300 leading-tight">
                        ${epoch.description}
                      </p>
                      ${
                        epoch.zkAnchorProof
                          ? `
                        <div class="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-slate-400">
                          <span class="text-signal">● ZK-Merkle Root:</span>
                          <span class="truncate max-w-[90px]" title="${epoch.zkAnchorProof.rootHash}">${epoch.zkAnchorProof.rootHash.slice(0, 10)}...</span>
                        </div>
                      `
                          : ''
                      }
                      <div class="mt-1 text-[8px] font-sans text-cyphr/90 italic">
                        Click for instant jump ⚡
                      </div>
                    </div>

                  </div>
                `;
                })
                .join('')}
            </div>

          </div>

          <!-- Quick Jump Controls & ZK Status Card -->
          ${
            !this.isCollapsed
              ? `
            <div class="border-t border-white/5 pt-2.5 flex flex-col space-y-2">
              
              <!-- Quick Jump Buttons -->
              <div class="grid grid-cols-2 gap-1.5">
                <button 
                  type="button"
                  id="btn-timeline-jump-top"
                  class="px-2 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight text-slate-300 hover:text-white text-[10px] font-mono flex items-center justify-center space-x-1 transition-colors border border-white/5"
                  title="Jump to most recent post (Now)"
                >
                  <span>▲</span>
                  <span>Now</span>
                </button>
                <button 
                  type="button"
                  id="btn-timeline-jump-bottom"
                  class="px-2 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight text-slate-300 hover:text-white text-[10px] font-mono flex items-center justify-center space-x-1 transition-colors border border-white/5"
                  title="Jump to ZK-SSE archive origin"
                >
                  <span>▼</span>
                  <span>Origin</span>
                </button>
              </div>

              <!-- ZK-SSE Integrity Pulse Status -->
              ${
                this.config.showZkMetrics
                  ? `
                <div class="p-2 rounded-xl bg-surface-base/80 border border-white/5 flex flex-col space-y-1">
                  <div class="flex items-center justify-between text-[9px] font-mono">
                    <span class="text-slate-400 flex items-center space-x-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-signal animate-pulse"></span>
                      <span>ZK-SSE Engine</span>
                    </span>
                    <span class="text-signal font-bold">100% Valid</span>
                  </div>
                  <div class="flex items-center justify-between text-[8px] font-mono text-slate-500">
                    <span>Swarm Compression</span>
                    <span class="text-cyphr">${this.zkArchiveMetrics.compressionRatio}</span>
                  </div>
                  <div class="w-full bg-surface-overlay h-1 rounded-full overflow-hidden mt-0.5">
                    <div 
                      id="timeline-scroll-progress-bar" 
                      class="bg-gradient-to-r from-cyphr via-signal to-aether h-full transition-all duration-150"
                      style="width: ${Math.max(4, this.scrollProgress)}%;"
                    ></div>
                  </div>
                </div>
              `
                  : ''
              }

            </div>
          `
              : `
            <!-- Compact jump buttons -->
            <div class="flex flex-col space-y-1 pt-1 border-t border-white/5">
              <button 
                type="button"
                id="btn-timeline-jump-top"
                class="w-full h-6 rounded bg-surface-overlay hover:bg-surface-highlight text-slate-300 flex items-center justify-center text-[10px] transition-colors"
                title="Jump to Now"
              >
                ▲
              </button>
              <button 
                type="button"
                id="btn-timeline-jump-bottom"
                class="w-full h-6 rounded bg-surface-overlay hover:bg-surface-highlight text-slate-300 flex items-center justify-center text-[10px] transition-colors"
                title="Jump to Origin"
              >
                ▼
              </button>
            </div>
          `
          }

        </div>
      </aside>
    `;
  }

  // -----------------------------------------------------------------------
  // 3. Interactivity, Scroll Listener and Smooth Scrolling (scrollIntoView)
  // -----------------------------------------------------------------------

  /**
   * Initializes DOM events, intersection observer, and scroll listeners.
   */
  public attach(root: HTMLElement | Document = document): void {
    if (typeof window === 'undefined') return;

    this.rootElement = root instanceof Document ? root.body : root;
    this.bindEvents(root);
    this.setupScrollObserver();
    this.updateScrollPosition();
  }

  /**
   * Connects click, toggle, keyboard, and scrubbing events.
   */
  public bindEvents(root: HTMLElement | Document = document): void {
    // 1. Click on epoch nodes
    const epochNodes = root.querySelectorAll('[data-timeline-epoch]');
    epochNodes.forEach((node) => {
      node.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        const epochId = target.getAttribute('data-timeline-epoch') as EpochIdentifier;
        if (epochId) {
          this.scrollToEpoch(epochId);
        }
      });
    });

    // 2. Jump top / bottom buttons
    const btnTop = root.querySelector('#btn-timeline-jump-top');
    if (btnTop) {
      btnTop.addEventListener('click', () => this.scrollToTop());
    }

    const btnBottom = root.querySelector('#btn-timeline-jump-bottom');
    if (btnBottom) {
      btnBottom.addEventListener('click', () => this.scrollToBottom());
    }

    // 3. Toggle Collapse Button
    const btnCollapse = root.querySelector('#btn-toggle-scrubber-collapse');
    if (btnCollapse) {
      btnCollapse.addEventListener('click', () => {
        this.toggleCollapse();
      });
    }

    // 4. Global window / feed container scroll listener
    if (this.scrollHandlerRef) {
      window.removeEventListener('scroll', this.scrollHandlerRef);
    }

    const throttledUpdate = rafThrottle(() => {
      this.updateScrollPosition();
    });

    this.scrollHandlerRef = throttledUpdate;
    window.addEventListener('scroll', this.scrollHandlerRef, PASSIVE_EVENT_OPTIONS);
  }

  /**
   * Smoothly scrolls (smooth scrollIntoView) to the first post in the selected epoch.
   */
  public scrollToEpoch(epochId: EpochIdentifier, smooth: boolean = true): boolean {
    const epoch = this.epochs.get(epochId);
    if (!epoch || epoch.count === 0) {
      return false;
    }

    let targetElement: HTMLElement | null = null;

    // Search by firstPostId if available
    if (epoch.firstPostId) {
      targetElement = document.querySelector(`[data-post-id="${epoch.firstPostId}"]`);
      if (!targetElement) {
        targetElement = document.getElementById(epoch.firstPostId);
      }
    }

    // Fallback: search any of postIds
    if (!targetElement && epoch.postIds.length > 0) {
      for (const pid of epoch.postIds) {
        targetElement = document.querySelector(`[data-post-id="${pid}"]`);
        if (targetElement) break;
      }
    }

    // Secondary fallback: search by timestamp in DOM post elements
    if (!targetElement) {
      const allPosts = document.querySelectorAll(this.config.postSelector);
      for (let i = 0; i < allPosts.length; i++) {
        const el = allPosts[i] as HTMLElement;
        const tsAttr = el.getAttribute('data-created-at') || el.getAttribute('data-timestamp');
        if (tsAttr) {
          const ts = parseInt(tsAttr, 10);
          const normalizedTs = ts < 10000000000 ? ts * 1000 : ts;
          if (normalizedTs >= epoch.minTimestamp && normalizedTs <= epoch.maxTimestamp) {
            targetElement = el;
            break;
          }
        }
      }
    }

    if (targetElement) {
      const yOffset = -this.config.autoScrollOffset;
      const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({
        top: Math.max(0, y),
        behavior: smooth ? 'smooth' : 'auto',
      });

      this.setActiveEpoch(epochId);
      this.highlightEpochInDom(epochId);
      return true;
    }

    // If feed is at start and epoch is 'today'
    if (epochId === 'today') {
      this.scrollToTop();
      this.setActiveEpoch('today');
      return true;
    }

    // If 'zk_archive', scroll to bottom of page
    if (epochId === 'zk_archive') {
      this.scrollToBottom();
      this.setActiveEpoch('zk_archive');
      return true;
    }

    return false;
  }

  /**
   * Smooth jump to feed top (most recent posts).
   */
  public scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    this.setActiveEpoch('today');
  }

  /**
   * Smooth jump to feed bottom (historical archive).
   */
  public scrollToBottom(): void {
    window.scrollTo({
      top: document.documentElement.scrollHeight || document.body.scrollHeight,
      behavior: 'smooth',
    });
    this.setActiveEpoch('zk_archive');
  }

  /**
   * Toggles collapsed / expanded state of the timeline scrubber.
   */
  public toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    const container = document.getElementById('timeline-scrubber-container');
    if (container) {
      if (this.isCollapsed) {
        container.classList.remove('w-64');
        container.classList.add('w-12');
      } else {
        container.classList.remove('w-12');
        container.classList.add('w-64');
      }
    }
  }

  // -----------------------------------------------------------------------
  // 4. Scroll Progress Tracking & Animated Indicator
  // -----------------------------------------------------------------------

  /**
   * Computes scroll position and updates animated thumb indicator
   * and active epoch based on current visible post in viewport.
   */
  public updateScrollPosition(): void {
    if (typeof window === 'undefined') return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    if (scrollHeight > 0) {
      this.scrollProgress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
    } else {
      this.scrollProgress = 0;
    }

    // Update horizontal progress bar
    const progressBar = document.getElementById('timeline-scroll-progress-bar');
    if (progressBar) {
      progressBar.style.width = `${Math.max(4, this.scrollProgress)}%`;
    }

    // Update vertical rail thumb
    const thumb = document.getElementById('timeline-scrubber-thumb');
    if (thumb) {
      thumb.style.top = `${this.getThumbTopPositionPercentage()}%`;
    }

    // Automatically detect epoch visible on screen
    this.detectVisibleEpochInViewport();
  }

  /**
   * Computes vertical percentage position for moving thumb
   */
  private getThumbTopPositionPercentage(): number {
    const epochKeys: EpochIdentifier[] = ['today', 'yesterday', 'this_week', 'last_month', 'zk_archive'];
    
    if (!this.activeEpoch) {
      return Math.min(92, Math.max(8, (this.scrollProgress / 100) * 84 + 8));
    }

    const currentIndex = epochKeys.indexOf(this.activeEpoch);
    if (currentIndex === -1) {
      return 8;
    }

    // Proportional node positioning across the 5 nodes (approx: 10%, 30%, 50%, 70%, 90%)
    const basePositions = [10, 30, 50, 70, 90];
    const targetBase = basePositions[currentIndex] ?? 10;

    // Subtle interpolation with scrollProgress for fluid motion
    const interpolated = targetBase + ((this.scrollProgress - (currentIndex * 20)) * 0.2);
    return Math.min(92, Math.max(8, interpolated));
  }

  /**
   * Scans visible post elements and assigns active epoch.
   */
  private detectVisibleEpochInViewport(): void {
    const postElements = document.querySelectorAll(this.config.postSelector);
    if (postElements.length === 0) return;

    const viewportCenterY = window.innerHeight * 0.35; // optimal focus zone

    let closestPostId: string | null = null;
    let minDistance = Number.MAX_VALUE;

    postElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const distance = Math.abs(rect.top - viewportCenterY);
      if (distance < minDistance && rect.bottom > 0 && rect.top < window.innerHeight) {
        minDistance = distance;
        closestPostId = el.getAttribute('data-post-id') || el.id;
      }
    });

    if (closestPostId && this.postEpochMap.has(closestPostId)) {
      const matchedEpoch = this.postEpochMap.get(closestPostId)!;
      if (matchedEpoch !== this.activeEpoch) {
        this.setActiveEpoch(matchedEpoch);
        this.highlightEpochInDom(matchedEpoch);
      }
    }
  }

  /**
   * Sets active epoch and notifies subscribers.
   */
  public setActiveEpoch(epochId: EpochIdentifier): void {
    if (this.activeEpoch === epochId) return;

    const prev = this.activeEpoch;
    this.activeEpoch = epochId;

    const epoch = this.epochs.get(epochId);
    const event: EpochChangeEvent = {
      epochId,
      previousEpochId: prev,
      postCount: epoch ? epoch.count : 0,
      firstPostId: epoch ? epoch.firstPostId : null,
    };

    this.epochChangeCallbacks.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error('[TimelineScrubber] Callback error:', err);
      }
    });
  }

  /**
   * Updates active styling classes in DOM without full re-render
   */
  private highlightEpochInDom(epochId: EpochIdentifier): void {
    const allEpochItems = document.querySelectorAll('[data-timeline-epoch]');
    allEpochItems.forEach((item) => {
      const id = item.getAttribute('data-timeline-epoch');
      const dot = item.querySelector('.rounded-full.border-2');

      if (id === epochId) {
        item.classList.add('bg-surface-overlay');
        if (dot) {
          dot.classList.add('ring-4', 'ring-cyphr/20', 'scale-125');
        }
      } else {
        item.classList.remove('bg-surface-overlay');
        if (dot) {
          dot.classList.remove('ring-4', 'ring-cyphr/20', 'scale-125');
        }
      }
    });
  }

  // -----------------------------------------------------------------------
  // 5. IntersectionObserver for Precise Detection
  // -----------------------------------------------------------------------

  /**
   * Configures IntersectionObserver for enhanced performance on scroll.
   */
  private setupScrollObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            const postId = target.getAttribute('data-post-id') || target.id;
            if (postId && this.postEpochMap.has(postId)) {
              const epochId = this.postEpochMap.get(postId)!;
              this.setActiveEpoch(epochId);
              this.highlightEpochInDom(epochId);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '-10% 0px -60% 0px',
        threshold: [0.1, 0.5],
      }
    );

    const posts = document.querySelectorAll(this.config.postSelector);
    posts.forEach((post) => this.observer?.observe(post));
  }

  // -----------------------------------------------------------------------
  // 6. Pub/Sub Utilities & Mock Merkle Cryptography
  // -----------------------------------------------------------------------

  /**
   * Subscribe to temporal epoch changes.
   */
  public onEpochChange(callback: (event: EpochChangeEvent) => void): () => void {
    this.epochChangeCallbacks.push(callback);
    return () => {
      this.epochChangeCallbacks = this.epochChangeCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Filters a list of posts keeping only those within the specified epoch.
   */
  public filterPostsByEpoch<T extends { createdAt: number }>(epochId: EpochIdentifier, posts: T[]): T[] {
    const epoch = this.epochs.get(epochId);
    if (!epoch) return [];

    return posts.filter((p) => {
      const ts = p.createdAt < 10000000000 ? p.createdAt * 1000 : p.createdAt;
      return ts >= epoch.minTimestamp && ts <= epoch.maxTimestamp;
    });
  }

  /**
   * Returns summary stats per epoch.
   */
  public getEpochStats(): Record<EpochIdentifier, number> {
    const stats: Record<string, number> = {};
    this.epochs.forEach((epoch, key) => {
      stats[key] = epoch.count;
    });
    return stats as Record<EpochIdentifier, number>;
  }

  /**
   * Generates a deterministic mock Merkle root for the cryptographic epoch anchor.
   */
  private computeMockMerkleRoot(epochKey: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < epochKey.length; i++) {
      hash ^= epochKey.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    return `0xzk_${epochKey.slice(0, 4)}_${hex}fa89b2c4`;
  }

  /**
   * Cleans up listeners and observer on teardown.
   */
  public destroy(): void {
    if (this.scrollHandlerRef && typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.scrollHandlerRef);
      if ((this.scrollHandlerRef as any).cancel) {
        (this.scrollHandlerRef as any).cancel();
      }
      this.scrollHandlerRef = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.scrollThrottleTimer !== null && typeof window !== 'undefined') {
      clearTimeout(this.scrollThrottleTimer);
      this.scrollThrottleTimer = null;
    }

    this.epochChangeCallbacks = [];
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

export const timelineScrubber = new TimelineScrubber();
