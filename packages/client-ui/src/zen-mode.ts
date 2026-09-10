/**
 * zen-mode.ts
 * UREfy — Zen / Focus Mode System
 * 
 * Provides a distraction-free, ultra-focused reading and writing environment.
 * Hides sidebars, expands the central feed stage, enhances reading typography,
 * and attaches seamless global keyboard shortcuts ('Z' and 'Escape').
 */

// ─── Interfaces & Types ───────────────────────────────────────────────────────

export interface ZenSessionMetrics {
  sessionDurationSec: number;
  totalDurationSec: number;
  isZenActive: boolean;
  sessionCount: number;
  lastActivatedAt: number | null;
}

export type ZenListener = (isActive: boolean) => void;

// ─── ZenModeManager Class ─────────────────────────────────────────────────────

export class ZenModeManager {
  /** Public flag indicating whether Zen Mode is currently active */
  public isZenActive: boolean = false;

  /** Listeners subscribed to Zen Mode state transitions */
  private listeners: Set<ZenListener> = new Set<ZenListener>();

  /** Epoch timestamp when the current active session started */
  private sessionStartTime: number | null = null;

  /** Cumulative historical focus time in milliseconds */
  private totalFocusTimeMs: number = 0;

  /** Total number of times Zen Mode has been engaged */
  private sessionCount: number = 0;

  /** ID of the dynamically injected style element */
  private readonly STYLE_ELEMENT_ID: string = 'aetheris-zen-mode-styles';

  /** LocalStorage key for user preference persistence */
  private readonly STORAGE_KEY: string = 'aetheris_zen_mode_enabled';

  /** Reference to bound keyboard listener for clean teardown */
  private boundKeyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  /** Tracks whether manager has been initialized */
  private isInitialized: boolean = false;

  constructor() {
    // Attempt to restore saved state in browser environments
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.init();
    }
  }

  // ─── Lifecycle & Initialization ─────────────────────────────────────────────

  /**
   * Initializes the ZenModeManager, injects CSS rules, binds global keyboard shortcuts,
   * and restores previous preferences if saved.
   */
  public init(): void {
    if (this.isInitialized || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.isInitialized = true;
    this.injectZenStyles();
    this.attachGlobalKeyboardListeners();

    const savedPreference = this.loadPreference();
    if (savedPreference) {
      this.setZen(true);
    }
  }

  /**
   * Cleans up listeners, removes injected styles, and resets DOM state.
   */
  public destroy(): void {
    this.detachGlobalKeyboardListeners();
    this.removeZenStyles();
    this.listeners.clear();
    this.isInitialized = false;
  }

  // ─── State Modifiers ────────────────────────────────────────────────────────

  /**
   * Toggles Zen Mode between active and inactive states.
   */
  public toggleZen(): void {
    this.setZen(!this.isZenActive);
  }

  /**
   * Sets the Zen Mode to a specific state (true = enabled, false = disabled).
   * Updates DOM classes, triggers CSS layout shifts, updates metrics, and notifies subscribers.
   */
  public setZen(active: boolean): void {
    if (this.isZenActive === active && (typeof document === 'undefined' || document.body?.classList.contains('zen-mode-active') === active)) {
      return;
    }

    this.isZenActive = active;

    const now = Date.now();
    if (active) {
      this.sessionStartTime = now;
      this.sessionCount += 1;
    } else {
      if (this.sessionStartTime !== null) {
        this.totalFocusTimeMs += Math.max(0, now - this.sessionStartTime);
        this.sessionStartTime = null;
      }
    }

    this.updateDOMClasses();
    this.savePreference(active);
    this.notifyListeners();
  }

  /**
   * Returns current active state.
   */
  public getIsActive(): boolean {
    return this.isZenActive;
  }

  // ─── Subscription System ────────────────────────────────────────────────────

  /**
   * Subscribes a listener to Zen Mode state changes.
   * @returns Unsubscribe function
   */
  public subscribe(listener: ZenListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifies all registered listeners of a state change.
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.isZenActive);
      } catch (err) {
        console.error('[ZenModeManager] Error in listener execution:', err);
      }
    }
  }

  // ─── DOM & CSS Engine ───────────────────────────────────────────────────────

  /**
   * Updates CSS classes on #app, document.body, and document.documentElement.
   */
  private updateDOMClasses(): void {
    if (typeof document === 'undefined') return;

    const appEl = document.getElementById('app');
    const bodyEl = document.body;
    const htmlEl = document.documentElement;

    const targetClass = 'zen-mode-active';

    if (this.isZenActive) {
      bodyEl?.classList.add(targetClass);
      htmlEl?.classList.add(targetClass);
      appEl?.classList.add(targetClass);
    } else {
      bodyEl?.classList.remove(targetClass);
      htmlEl?.classList.remove(targetClass);
      appEl?.classList.remove(targetClass);
    }

    // Update floating exit visibility if element exists in DOM
    const floatingExitEl = document.getElementById('zen-floating-exit-indicator');
    if (floatingExitEl) {
      if (this.isZenActive) {
        floatingExitEl.classList.remove('hidden', 'pointer-events-none', 'opacity-0');
        floatingExitEl.classList.add('opacity-100', 'pointer-events-auto');
      } else {
        floatingExitEl.classList.add('hidden', 'pointer-events-none', 'opacity-0');
        floatingExitEl.classList.remove('opacity-100', 'pointer-events-auto');
      }
    }

    // Update top bar zen button state if rendered
    const zenBtn = document.getElementById('btn-toggle-zen-mode');
    if (zenBtn) {
      if (this.isZenActive) {
        zenBtn.classList.add('bg-cyphr/20', 'text-cyphr', 'border-cyphr/40', 'shadow-cyphr-sm');
        zenBtn.classList.remove('text-slate-400', 'bg-surface-raised', 'border-white/5');
        zenBtn.setAttribute('aria-pressed', 'true');
      } else {
        zenBtn.classList.remove('bg-cyphr/20', 'text-cyphr', 'border-cyphr/40', 'shadow-cyphr-sm');
        zenBtn.classList.add('text-slate-400', 'bg-surface-raised', 'border-white/5');
        zenBtn.setAttribute('aria-pressed', 'false');
      }
    }
  }

  /**
   * Injects dynamic CSS rules that handle distraction-free layout transforms.
   * - Hides left navigation rail (aside)
   * - Hides right member & widget rail (aside)
   * - Expands central feed stage from max-w-4xl to max-w-5xl with centered layout and generous padding
   * - Adds smooth transitions and soothing background aura
   */
  private injectZenStyles(): void {
    if (typeof document === 'undefined') return;

    if (document.getElementById(this.STYLE_ELEMENT_ID)) {
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.id = this.STYLE_ELEMENT_ID;
    styleEl.innerHTML = `
      /* ==========================================================================
         UREfy ZEN / FOCUS MODE DYNAMIC STYLES
         ========================================================================== */

      /* Base smooth transitions on layout elements */
      aside, main, header, footer, .btn-channel, article {
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      /* When Zen Mode is active: Collapse & hide sidebars smoothly */
      .zen-mode-active aside {
        display: none !important;
        width: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transform: scale(0.96);
      }

      /* Expand center main container */
      .zen-mode-active main {
        width: 100% !important;
        max-width: 100vw !important;
        flex: 1 1 auto !important;
        justify-content: center !important;
        background-color: #08090c !important;
      }

      /* Enlarge and center feed container (max-w-4xl -> max-w-5xl) with reading comfort */
      .zen-mode-active .max-w-4xl {
        max-width: 64rem !important; /* max-w-5xl (1024px) */
        padding-left: 2rem !important;
        padding-right: 2rem !important;
        padding-top: 1.5rem !important;
        padding-bottom: 3rem !important;
        margin-left: auto !important;
        margin-right: auto !important;
        transition: max-width 0.35s ease, padding 0.35s ease;
      }

      /* Reading typography enhancements in Zen Mode */
      .zen-mode-active article {
        border-color: rgba(255, 255, 255, 0.08) !important;
        background-color: rgba(18, 21, 28, 0.95) !important;
        backdrop-filter: blur(16px);
        box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.6) !important;
        margin-bottom: 1.5rem !important;
      }

      .zen-mode-active article:hover {
        border-color: rgba(0, 229, 255, 0.3) !important;
        box-shadow: 0 0 25px rgba(0, 229, 255, 0.1) !important;
      }

      /* Discreet minimal header in Zen Mode */
      .zen-mode-active header {
        background-color: rgba(13, 15, 20, 0.75) !important;
        backdrop-filter: blur(12px) !important;
        border-bottom-color: rgba(255, 255, 255, 0.04) !important;
      }

      /* Dim non-essential header clutter while in Zen Mode */
      .zen-mode-active header .btn-hub,
      .zen-mode-active header #btn-toggle-dual-horizon,
      .zen-mode-active header #density-compact,
      .zen-mode-active header #density-balanced,
      .zen-mode-active header #density-media,
      .zen-mode-active header .xl\\:flex {
        opacity: 0.35;
        transition: opacity 0.2s ease;
      }

      .zen-mode-active header:hover .btn-hub,
      .zen-mode-active header:hover #btn-toggle-dual-horizon,
      .zen-mode-active header:hover #density-compact,
      .zen-mode-active header:hover #density-balanced,
      .zen-mode-active header:hover #density-media,
      .zen-mode-active header:hover .xl\\:flex {
        opacity: 1;
      }

      /* Subtle breathing ambient vignette in Zen Mode */
      .zen-mode-active #app::before {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        box-shadow: inset 0 0 120px rgba(0, 0, 0, 0.75);
        z-index: 40;
      }

      /* Floating Exit indicator keyframe animation */
      @keyframes zen-pill-enter {
        from {
          opacity: 0;
          transform: translateY(-12px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .zen-floating-pill {
        animation: zen-pill-enter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
    `;

    document.head.appendChild(styleEl);
  }

  /**
   * Removes injected Zen CSS styles.
   */
  private removeZenStyles(): void {
    if (typeof document === 'undefined') return;
    const styleEl = document.getElementById(this.STYLE_ELEMENT_ID);
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
  }

  // ─── Keyboard Shortcut Handling ─────────────────────────────────────────────

  /**
   * Binds global keydown listener for 'Z' toggle and 'Escape' exit.
   */
  public attachGlobalKeyboardListeners(): void {
    if (typeof window === 'undefined' || this.boundKeyboardHandler) return;

    this.boundKeyboardHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    window.addEventListener('keydown', this.boundKeyboardHandler, { passive: false });
  }

  /**
   * Detaches global keyboard listeners.
   */
  public detachGlobalKeyboardListeners(): void {
    if (typeof window === 'undefined' || !this.boundKeyboardHandler) return;

    window.removeEventListener('keydown', this.boundKeyboardHandler);
    this.boundKeyboardHandler = null;
  }

  /**
   * Handles keyboard events.
   * - Key 'Z' or 'z' (when outside text inputs) -> toggleZen()
   * - Key 'Escape' -> if isZenActive, setZen(false)
   */
  private handleKeyDown(e: KeyboardEvent): void {
    // Escape key always closes Zen Mode if active
    if (e.key === 'Escape') {
      if (this.isZenActive) {
        // Prevent default only if not in an input, or if user explicitly wishes to exit Zen
        if (!this.isInputElement(e.target)) {
          e.preventDefault();
        }
        this.setZen(false);
      }
      return;
    }

    // Ignore if target is typing inside an editable field or modifier keys (Ctrl/Cmd/Alt) are pressed
    if (this.isInputElement(e.target) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    // 'Z' key toggles Zen Focus Mode
    if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      this.toggleZen();
    }
  }

  /**
   * Checks if an event target is an interactive text input element.
   */
  private isInputElement(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;

    const tagName = target.tagName.toUpperCase();
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
      return true;
    }

    if (target.isContentEditable || target.getAttribute('contenteditable') === 'true') {
      return true;
    }

    return false;
  }

  // ─── UI Rendering Components ────────────────────────────────────────────────

  /**
   * Renders a discreet Zen Mode toggle button for the top header bar.
   * [🧘 Zen] or [Focus Mode (Z)]
   */
  public renderZenButton(): string {
    const isActive = this.isZenActive;

    const activeClasses = 'bg-cyphr/20 text-cyphr border-cyphr/40 shadow-cyphr-sm';
    const inactiveClasses = 'bg-surface-raised text-slate-400 border-white/5 hover:text-slate-200 hover:bg-surface-overlay';

    return `
      <button 
        id="btn-toggle-zen-mode" 
        type="button"
        title="Toggle Zen Focus Mode (Press Z to toggle, Esc to exit)"
        aria-label="Toggle Zen Focus Mode"
        aria-pressed="${isActive ? 'true' : 'false'}"
        class="px-2.5 py-1 text-xs rounded-lg border flex items-center space-x-1.5 transition-all font-medium ${isActive ? activeClasses : inactiveClasses}"
      >
        <span class="text-sm select-none">🧘</span>
        <span class="font-medium tracking-wide">Zen</span>
        <span class="kbd-badge text-[9px] px-1 py-0.2 ml-0.5 opacity-75">Z</span>
      </button>
    `.trim();
  }

  /**
   * Renders the floating exit pill indicator fixed at top-right.
   * Visible only when Zen Mode is active: "🧘 Zen Mode Active · Press Z or Esc to exit"
   */
  public renderZenFloatingExit(): string {
    const isVisible = this.isZenActive;

    return `
      <div 
        id="zen-floating-exit-indicator" 
        class="fixed top-3 right-5 z-50 transition-all duration-200 ${isVisible ? 'opacity-100 pointer-events-auto zen-floating-pill' : 'hidden pointer-events-none opacity-0'}"
      >
        <div class="flex items-center space-x-3 px-3.5 py-1.5 rounded-full bg-surface-overlay/90 backdrop-blur-md border border-cyphr/30 text-slate-200 shadow-2xl hover:border-cyphr/60 transition-all">
          <div class="flex items-center space-x-2 text-xs font-mono">
            <span class="text-sm">🧘</span>
            <span class="text-cyphr font-semibold">Zen Mode Active</span>
            <span class="text-slate-500">·</span>
            <span class="text-[11px] text-slate-400">Press <kbd class="kbd-badge text-[10px] text-cyphr">Z</kbd> or <kbd class="kbd-badge text-[10px] text-slate-300">Esc</kbd> to exit</span>
          </div>
          
          <button 
            id="btn-zen-exit-pill" 
            type="button"
            title="Exit Zen Focus Mode"
            aria-label="Exit Zen Mode"
            class="w-5 h-5 rounded-full bg-white/5 hover:bg-crimson/20 text-slate-400 hover:text-crimson flex items-center justify-center text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    `.trim();
  }

  /**
   * Renders an optional focused reading progress / stats badge.
   */
  public renderZenStatsBadge(): string {
    const stats = this.getFocusSessionStats();
    const minutes = Math.floor(stats.sessionDurationSec / 60);
    const seconds = stats.sessionDurationSec % 60;
    const formattedDuration = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

    return `
      <div class="flex items-center space-x-2 text-[10px] font-mono text-slate-400 bg-surface-raised/80 px-2.5 py-1 rounded-md border border-white/5">
        <span class="text-signal">●</span>
        <span>Focus Time:</span>
        <span class="text-cyphr font-bold">${formattedDuration}</span>
      </div>
    `.trim();
  }

  // ─── Event Binding Helper ───────────────────────────────────────────────────

  /**
   * Binds click events to interactive Zen Mode elements in the DOM.
   * Can be called whenever the view is re-rendered.
   */
  public bindEvents(container?: HTMLElement | Document): void {
    const root = container || (typeof document !== 'undefined' ? document : null);
    if (!root) return;

    // Toggle button in top bar
    const toggleBtn = root.querySelector('#btn-toggle-zen-mode');
    if (toggleBtn) {
      toggleBtn.replaceWith(toggleBtn.cloneNode(true));
      const freshToggle = root.querySelector('#btn-toggle-zen-mode');
      freshToggle?.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleZen();
      });
    }

    // Exit pill close button
    const exitBtn = root.querySelector('#btn-zen-exit-pill');
    if (exitBtn) {
      exitBtn.replaceWith(exitBtn.cloneNode(true));
      const freshExit = root.querySelector('#btn-zen-exit-pill');
      freshExit?.addEventListener('click', (e) => {
        e.preventDefault();
        this.setZen(false);
      });
    }

    // Exit pill container click (optional quick dismiss)
    const pillContainer = root.querySelector('#zen-floating-exit-indicator');
    if (pillContainer) {
      pillContainer.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).id !== 'btn-zen-exit-pill') {
          // If clicked inside the pill, exit Zen Mode as well
          this.setZen(false);
        }
      });
    }
  }

  // ─── Metrics & Statistics ───────────────────────────────────────────────────

  /**
   * Returns current active focus session stats and cumulative historical metrics.
   */
  public getFocusSessionStats(): ZenSessionMetrics {
    const currentActiveSec = this.sessionStartTime
      ? Math.max(0, Math.floor((Date.now() - this.sessionStartTime) / 1000))
      : 0;

    const totalSec = Math.floor((this.totalFocusTimeMs + (this.sessionStartTime ? Date.now() - this.sessionStartTime : 0)) / 1000);

    return {
      sessionDurationSec: currentActiveSec,
      totalDurationSec: totalSec,
      isZenActive: this.isZenActive,
      sessionCount: this.sessionCount,
      lastActivatedAt: this.sessionStartTime,
    };
  }

  /**
   * Resets focus statistics counters.
   */
  public resetStats(): void {
    this.totalFocusTimeMs = 0;
    this.sessionCount = 0;
    if (this.isZenActive) {
      this.sessionStartTime = Date.now();
    } else {
      this.sessionStartTime = null;
    }
  }

  // ─── Preferences Storage ────────────────────────────────────────────────────

  /**
   * Persists Zen Mode preference to localStorage.
   */
  private savePreference(active: boolean): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ active, updatedAt: Date.now() }));
      }
    } catch {
      // Storage unavailable or disabled
    }
  }

  /**
   * Retrieves stored Zen Mode preference from localStorage.
   */
  private loadPreference(): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(this.STORAGE_KEY);
        if (item) {
          const parsed = JSON.parse(item);
          return Boolean(parsed?.active);
        }
      }
    } catch {
      // Storage unavailable or invalid JSON
    }
    return false;
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const zenModeManager: ZenModeManager = new ZenModeManager();
