/**
 * view-transitions.ts
 * UREfy — View Transitions API & Fluid Screen Animation Engine
 * 
 * Provides seamless, hardware-accelerated transitions across channels, modals,
 * spaces, and views. Supports native View Transitions API (W3C standard) with an
 * intelligent, frame-accurate requestAnimationFrame CSS fallback for legacy environments.
 * 
 * 100% Self-Contained, Strict TypeScript, Zero External Dependencies.
 */

// ─── Types & Interfaces ───────────────────────────────────────────────────────

export type TransitionType =
  | 'slide-left'
  | 'slide-right'
  | 'fade'
  | 'zoom-in'
  | 'zoom-out'
  | 'slide-up'
  | 'slide-down'
  | 'flip'
  | 'none';

export type DurationPreset = 150 | 250 | 400;

export interface TransitionEvent {
  fromView: string;
  toView: string;
  type: TransitionType;
  duration: number;
  isNative: boolean;
  timestamp: number;
  success: boolean;
}

export type TransitionListener = (event: TransitionEvent) => void;

export interface ViewTransitionMetrics {
  totalTransitions: number;
  totalDurationMs: number;
  averageDurationMs: number;
  lastTransitionTimestamp: number | null;
  lastType: TransitionType | null;
  nativeSuccessCount: number;
  fallbackCount: number;
  historyLength: number;
}

export interface ViewTransitionSettings {
  enabled: boolean;
  duration: number;
  defaultType: TransitionType;
  respectReducedMotion: boolean;
  hapticFeedback: boolean;
}

/**
 * Interface representing the browser's ViewTransition object.
 */
interface NativeViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition(): void;
}

// ─── ViewTransitionManager Class ──────────────────────────────────────────────

export class ViewTransitionManager {
  /** Flag indicating native browser support for document.startViewTransition */
  public isSupported: boolean = typeof document !== 'undefined' && 'startViewTransition' in document;

  /** Name or identifier of the current active view */
  public currentView: string = 'feed';

  /** Sequential navigation history of active views */
  public transitionHistory: string[] = ['feed'];

  /** Default animation duration in milliseconds */
  public defaultDuration: number = 250;

  /** Global switch for fluid view transitions */
  public enabled: boolean = true;

  /** Default transition type when unspecified */
  public defaultType: TransitionType = 'fade';

  /** Whether to respect the user's OS-level prefers-reduced-motion preference */
  public respectReducedMotion: boolean = true;

  /** Internal diagnostics and performance metrics */
  private metrics: ViewTransitionMetrics = {
    totalTransitions: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    lastTransitionTimestamp: null,
    lastType: null,
    nativeSuccessCount: 0,
    fallbackCount: 0,
    historyLength: 1
  };

  /** Set of subscribed event listeners */
  private listeners: Set<TransitionListener> = new Set<TransitionListener>();

  /** ID of the injected CSS style tag */
  private readonly STYLE_TAG_ID: string = 'aetheris-view-transitions-styles';

  /** LocalStorage key for persisting transition settings */
  private readonly STORAGE_KEY: string = 'aetheris_view_transition_settings';

  /** Guard flag preventing overlapping concurrent transitions */
  private isTransitioning: boolean = false;

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.injectTransitionStyles();
    }
  }

  // ─── Core Transitions API ───────────────────────────────────────────────────

  /**
   * Performs a fluid transition to a new view by executing the provided DOM mutation function.
   * Uses native View Transitions API if supported; otherwise falls back to rAF-based CSS animations.
   * 
   * @param newView Identifier of the incoming view
   * @param renderFn Callback function that mutates the DOM to render the new view
   * @param type Optional transition style (defaults to 'fade' or configured default)
   */
  public async transitionTo(
    newView: string,
    renderFn: () => void | Promise<void>,
    type?: TransitionType
  ): Promise<void> {
    const transitionType: TransitionType = type || this.defaultType;
    const fromView = this.currentView;
    const duration = this.defaultDuration;
    const startTime = Date.now();

    // Check if motion should be skipped entirely
    if (!this.enabled || transitionType === 'none' || (this.respectReducedMotion && this.prefersReducedMotion())) {
      try {
        await renderFn();
        this.updateViewHistory(newView);
        this.notifyListeners({
          fromView,
          toView: newView,
          type: 'none',
          duration: 0,
          isNative: false,
          timestamp: startTime,
          success: true
        });
      } catch (err) {
        console.error('[ViewTransitions] Error in instant transition renderFn:', err);
        throw err;
      }
      return;
    }

    // Prevent re-entrant or overlapping transition execution
    if (this.isTransitioning) {
      try {
        await renderFn();
        this.updateViewHistory(newView);
      } catch (err) {
        console.error('[ViewTransitions] Concurrency fallback render error:', err);
      }
      return;
    }

    this.isTransitioning = true;

    try {
      if (this.isSupported && typeof (document as unknown as { startViewTransition: unknown }).startViewTransition === 'function') {
        await this.executeNativeTransition(newView, renderFn, transitionType, duration);
        this.recordMetric(duration, true, transitionType);
      } else {
        await this.executeRafFallback(newView, renderFn, transitionType, duration);
        this.recordMetric(duration, false, transitionType);
      }

      this.updateViewHistory(newView);

      this.notifyListeners({
        fromView,
        toView: newView,
        type: transitionType,
        duration,
        isNative: this.isSupported,
        timestamp: startTime,
        success: true
      });
    } catch (err) {
      console.warn('[ViewTransitions] Transition encountered an error, falling back to direct render:', err);
      try {
        await renderFn();
        this.updateViewHistory(newView);
      } catch (fallbackErr) {
        console.error('[ViewTransitions] Secondary render error:', fallbackErr);
      }
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Switches channels with an elegant 'slide-left' lateral transition.
   * 
   * @param channelId Target channel identifier
   * @param renderFn DOM rendering callback for the channel
   */
  public async channelSwitch(channelId: string, renderFn: () => void | Promise<void>): Promise<void> {
    return this.transitionTo(`channel:${channelId}`, renderFn, 'slide-left');
  }

  /**
   * Opens an overlay modal or dialog with a smooth 'zoom-in' focal transition.
   * 
   * @param renderFn DOM rendering callback to display the modal
   */
  public async modalOpen(renderFn: () => void | Promise<void>): Promise<void> {
    return this.transitionTo('modal-overlay-open', renderFn, 'zoom-in');
  }

  /**
   * Closes an overlay modal with an intuitive 'zoom-out' receding transition.
   * 
   * @param renderFn DOM rendering callback to dismiss the modal
   */
  public async modalClose(renderFn: () => void | Promise<void>): Promise<void> {
    return this.transitionTo('modal-overlay-close', renderFn, 'zoom-out');
  }

  /**
   * Switches between tabs (e.g. Relays / Vault / Pulse) with a directional slide.
   */
  public async tabSwitch(tabName: string, renderFn: () => void | Promise<void>): Promise<void> {
    return this.transitionTo(`tab:${tabName}`, renderFn, 'fade');
  }

  /**
   * Switches space domains with a vertical slide-up transition.
   */
  public async spaceSwitch(space: string, renderFn: () => void | Promise<void>): Promise<void> {
    return this.transitionTo(`space:${space}`, renderFn, 'slide-up');
  }

  /**
   * Navigates back in history with a reverse 'slide-right' transition.
   */
  public async back(renderFn: () => void | Promise<void>): Promise<void> {
    const previousView = this.transitionHistory.length > 1
      ? this.transitionHistory[this.transitionHistory.length - 2]
      : 'feed';
    return this.transitionTo(previousView, renderFn, 'slide-right');
  }

  // ─── Native View Transitions Execution ──────────────────────────────────────

  /**
   * Executes transition via the native document.startViewTransition API.
   */
  private async executeNativeTransition(
    _newView: string,
    renderFn: () => void | Promise<void>,
    type: TransitionType,
    duration: number
  ): Promise<void> {
    if (typeof document === 'undefined') {
      await renderFn();
      return;
    }

    const htmlRoot = document.documentElement;
    const transitionClass = `transition-${type}`;

    // Apply duration variable and transition type class to root
    htmlRoot.style.setProperty('--vt-duration', `${duration}ms`);
    htmlRoot.classList.add(transitionClass);

    try {
      const docWithVT = document as unknown as {
        startViewTransition(callback: () => Promise<void> | void): NativeViewTransition;
      };

      const vt = docWithVT.startViewTransition(async () => {
        await renderFn();
      });

      // Await transition readiness and completion with timeout fallback
      await Promise.race([
        vt.finished,
        new Promise<void>((resolve) => setTimeout(resolve, duration + 300))
      ]);
    } finally {
      htmlRoot.classList.remove(transitionClass);
      htmlRoot.style.removeProperty('--vt-duration');
    }
  }

  // ─── RequestAnimationFrame Fallback Engine ─────────────────────────────────

  /**
   * High-fidelity rAF fallback animation engine for browsers lacking native View Transitions API.
   * Performs an interpolated exit animation on the active view container, executes DOM update,
   * then interpolates an entry animation.
   */
  private async executeRafFallback(
    _newView: string,
    renderFn: () => void | Promise<void>,
    type: TransitionType,
    duration: number
  ): Promise<void> {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      await renderFn();
      return;
    }

    const container = this.getTransitionTargetElement();
    if (!container) {
      await renderFn();
      return;
    }

    const halfDuration = Math.max(40, Math.floor(duration / 2));

    // Phase 1: Animate Out (Exit)
    await this.animateElementExit(container, type, halfDuration);

    // Phase 2: Render new state
    await renderFn();

    // Phase 3: Animate In (Entry)
    await this.animateElementEntry(container, type, halfDuration);
  }

  /**
   * Animates the target container out based on the transition type using rAF.
   */
  private animateElementExit(element: HTMLElement, type: TransitionType, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      const initialStyle = element.style.cssText;

      const frame = (now: number): void => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        const ease = this.easeOutCubic(progress);

        switch (type) {
          case 'slide-left':
            element.style.opacity = `${1 - ease}`;
            element.style.transform = `translateX(${-30 * ease}px)`;
            break;
          case 'slide-right':
            element.style.opacity = `${1 - ease}`;
            element.style.transform = `translateX(${30 * ease}px)`;
            break;
          case 'zoom-in':
            element.style.opacity = `${1 - ease}`;
            element.style.transform = `scale(${1 - 0.05 * ease})`;
            break;
          case 'zoom-out':
            element.style.opacity = `${1 - ease}`;
            element.style.transform = `scale(${1 + 0.05 * ease})`;
            break;
          case 'slide-up':
            element.style.opacity = `${1 - ease}`;
            element.style.transform = `translateY(${-25 * ease}px)`;
            break;
          case 'slide-down':
            element.style.opacity = `${1 - ease}`;
            element.style.transform = `translateY(${25 * ease}px)`;
            break;
          case 'fade':
          default:
            element.style.opacity = `${1 - ease}`;
            break;
        }

        if (progress < 1) {
          requestAnimationFrame(frame);
        } else {
          element.style.cssText = initialStyle;
          resolve();
        }
      };

      requestAnimationFrame(frame);
    });
  }

  /**
   * Animates the target container in based on the transition type using rAF.
   */
  private animateElementEntry(element: HTMLElement, type: TransitionType, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();

      const frame = (now: number): void => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        const ease = this.easeOutCubic(progress);

        switch (type) {
          case 'slide-left':
            element.style.opacity = `${ease}`;
            element.style.transform = `translateX(${30 * (1 - ease)}px)`;
            break;
          case 'slide-right':
            element.style.opacity = `${ease}`;
            element.style.transform = `translateX(${-30 * (1 - ease)}px)`;
            break;
          case 'zoom-in':
            element.style.opacity = `${ease}`;
            element.style.transform = `scale(${0.95 + 0.05 * ease})`;
            break;
          case 'zoom-out':
            element.style.opacity = `${ease}`;
            element.style.transform = `scale(${1.05 - 0.05 * ease})`;
            break;
          case 'slide-up':
            element.style.opacity = `${ease}`;
            element.style.transform = `translateY(${25 * (1 - ease)}px)`;
            break;
          case 'slide-down':
            element.style.opacity = `${ease}`;
            element.style.transform = `translateY(${-25 * (1 - ease)}px)`;
            break;
          case 'fade':
          default:
            element.style.opacity = `${ease}`;
            break;
        }

        if (progress < 1) {
          requestAnimationFrame(frame);
        } else {
          element.style.opacity = '';
          element.style.transform = '';
          resolve();
        }
      };

      requestAnimationFrame(frame);
    });
  }

  /**
   * Resolves the primary DOM element representing the active view stage.
   */
  private getTransitionTargetElement(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return (
      document.querySelector('#feed-container') ||
      document.querySelector('#center-feed') ||
      document.querySelector('#app-stage') ||
      document.querySelector('main') ||
      document.body
    );
  }

  /**
   * Cubic easing curve for smooth deceleration.
   */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // ─── CSS Style Injection ────────────────────────────────────────────────────

  /**
   * Injects dynamic stylesheet containing root View Transitions rules, keyframes,
   * and directional classes into the document head.
   */
  public injectTransitionStyles(): void {
    if (typeof document === 'undefined') return;

    if (document.getElementById(this.STYLE_TAG_ID)) {
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.id = this.STYLE_TAG_ID;
    styleEl.textContent = `
/* ═══════════════════════════════════════════════════════════════════════════
   UREfy — VIEW TRANSITIONS ENGINE
   Hardware-accelerated CSS animations for seamless view cross-fading & sliding.
   ═══════════════════════════════════════════════════════════════════════════ */

:root {
  --vt-duration: 250ms;
  --vt-easing: cubic-bezier(0.22, 1, 0.36, 1);
}

/* ── Base Default View Transition ────────────────────────────────────────── */
::view-transition-old(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-fade-out;
}
::view-transition-new(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-fade-in;
}

/* ── Slide Left (Channel switches, forward navigation) ──────────────────── */
html.transition-slide-left::view-transition-old(root),
.transition-slide-left::view-transition-old(root),
.transition-slide-left > ::view-transition-old(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-slide-left-out;
}
html.transition-slide-left::view-transition-new(root),
.transition-slide-left::view-transition-new(root),
.transition-slide-left > ::view-transition-new(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-slide-left-in;
}

/* ── Slide Right (Back navigation, reverse tabs) ────────────────────────── */
html.transition-slide-right::view-transition-old(root),
.transition-slide-right::view-transition-old(root),
.transition-slide-right > ::view-transition-old(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-slide-right-out;
}
html.transition-slide-right::view-transition-new(root),
.transition-slide-right::view-transition-new(root),
.transition-slide-right > ::view-transition-new(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-slide-right-in;
}

/* ── Fade (Direct tab change, subtle filter refresh) ────────────────────── */
html.transition-fade::view-transition-old(root),
.transition-fade::view-transition-old(root),
.transition-fade > ::view-transition-old(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-fade-out;
}
html.transition-fade::view-transition-new(root),
.transition-fade::view-transition-new(root),
.transition-fade > ::view-transition-new(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-fade-in;
}

/* ── Zoom In (Modal open, card drill-down) ───────────────────────────────── */
html.transition-zoom-in::view-transition-old(root),
.transition-zoom-in::view-transition-old(root),
.transition-zoom-in > ::view-transition-old(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-zoom-in-out;
}
html.transition-zoom-in::view-transition-new(root),
.transition-zoom-in::view-transition-new(root),
.transition-zoom-in > ::view-transition-new(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-zoom-in-in;
}

/* ── Zoom Out (Modal dismiss, card return) ──────────────────────────────── */
html.transition-zoom-out::view-transition-old(root),
.transition-zoom-out::view-transition-old(root),
.transition-zoom-out > ::view-transition-old(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-zoom-out-out;
}
html.transition-zoom-out::view-transition-new(root),
.transition-zoom-out::view-transition-new(root),
.transition-zoom-out > ::view-transition-new(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-zoom-out-in;
}

/* ── Slide Up (Space switches, composer drawer open) ─────────────────────── */
html.transition-slide-up::view-transition-old(root),
.transition-slide-up::view-transition-old(root),
.transition-slide-up > ::view-transition-old(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-slide-up-out;
}
html.transition-slide-up::view-transition-new(root),
.transition-slide-up::view-transition-new(root),
.transition-slide-up > ::view-transition-new(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-slide-up-in;
}

/* ── Slide Down (Space switches, drawer collapse) ───────────────────────── */
html.transition-slide-down::view-transition-old(root),
.transition-slide-down::view-transition-old(root),
.transition-slide-down > ::view-transition-old(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-slide-down-out;
}
html.transition-slide-down::view-transition-new(root),
.transition-slide-down::view-transition-new(root),
.transition-slide-down > ::view-transition-new(root) {
  animation: var(--vt-duration) var(--vt-easing) both aether-slide-down-in;
}

/* ── Keyframes ───────────────────────────────────────────────────────────── */
@keyframes aether-fade-out {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.99); }
}

@keyframes aether-fade-in {
  0% { opacity: 0; transform: scale(1.01); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes aether-slide-left-out {
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(-35px); opacity: 0; }
}

@keyframes aether-slide-left-in {
  0% { transform: translateX(35px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

@keyframes aether-slide-right-out {
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(35px); opacity: 0; }
}

@keyframes aether-slide-right-in {
  0% { transform: translateX(-35px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

@keyframes aether-zoom-in-out {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.94); opacity: 0; }
}

@keyframes aether-zoom-in-in {
  0% { transform: scale(0.94); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes aether-zoom-out-out {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.06); opacity: 0; }
}

@keyframes aether-zoom-out-in {
  0% { transform: scale(1.06); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes aether-slide-up-out {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-25px); opacity: 0; }
}

@keyframes aether-slide-up-in {
  0% { transform: translateY(25px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes aether-slide-down-out {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(25px); opacity: 0; }
}

@keyframes aether-slide-down-in {
  0% { transform: translateY(-25px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

/* ── Accessibility: Reduced Motion Override ──────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(root),
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
    document.head.appendChild(styleEl);
  }

  // ─── Settings Widget HTML Renderer ──────────────────────────────────────────

  /**
   * Renders an interactive Settings Widget component configured with Tailwind CSS classes.
   * Allows users to toggle fluid transitions, choose duration presets (Fast / Normal / Smooth),
   * select transition styles, and trigger live preview benchmarks.
   */
  public renderTransitionSettingsWidget(): string {
    const isChecked = this.enabled;
    const curDuration = this.defaultDuration;
    const apiStatus = this.isSupported
      ? '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-signal/10 text-signal border border-signal/20"><span class="w-1.5 h-1.5 rounded-full bg-signal animate-pulse"></span>Native (W3C API)</span>'
      : '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber/10 text-amber border border-amber/20"><span class="w-1.5 h-1.5 rounded-full bg-amber"></span>Fallback (rAF Engine)</span>';

    return `
<div id="aetheris-vt-settings-widget" class="bg-surface-raised rounded-xl p-5 border border-white/5 shadow-2xl space-y-5 select-none transition-all">
  <!-- Widget Header -->
  <div class="flex items-center justify-between border-b border-white/5 pb-3">
    <div class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-lg bg-surface-overlay flex items-center justify-center text-cyphr border border-white/5 shadow-inner">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
          Fluid Animations & Transitions
        </h4>
        <p class="text-xs text-slate-400">View Transitions API & rAF Accelerator</p>
      </div>
    </div>
    <div>${apiStatus}</div>
  </div>

  <!-- Master Toggle: Fluid Animations -->
  <div class="flex items-center justify-between bg-surface-base p-3.5 rounded-lg border border-white/5">
    <div class="space-y-0.5">
      <div class="text-sm font-medium text-slate-200">Fluid Animations</div>
      <div class="text-xs text-slate-400">Organic transition animations when navigating between channels and views</div>
    </div>
    <label class="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" id="aether-vt-toggle" class="sr-only peer" ${isChecked ? 'checked' : ''}>
      <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyphr shadow-sm"></div>
    </label>
  </div>

  <!-- Duration Presets -->
  <div class="space-y-2.5">
    <div class="flex items-center justify-between text-xs">
      <span class="text-slate-300 font-medium">Transition Speed</span>
      <span id="aether-vt-duration-display" class="font-mono text-cyphr font-bold">${curDuration}ms</span>
    </div>
    <div class="grid grid-cols-3 gap-2">
      <button type="button" data-vt-preset="150" class="vt-preset-btn py-2 px-3 rounded-lg text-xs font-medium text-center border transition-all ${
        curDuration === 150
          ? 'bg-cyphr/15 text-cyphr border-cyphr/40 shadow-sm'
          : 'bg-surface-base text-slate-300 border-white/5 hover:bg-surface-overlay hover:text-white'
      }">
        <div class="font-semibold">Fast</div>
        <div class="text-[10px] opacity-75 font-mono">150ms</div>
      </button>

      <button type="button" data-vt-preset="250" class="vt-preset-btn py-2 px-3 rounded-lg text-xs font-medium text-center border transition-all ${
        curDuration === 250
          ? 'bg-cyphr/15 text-cyphr border-cyphr/40 shadow-sm'
          : 'bg-surface-base text-slate-300 border-white/5 hover:bg-surface-overlay hover:text-white'
      }">
        <div class="font-semibold">Normal</div>
        <div class="text-[10px] opacity-75 font-mono">250ms</div>
      </button>

      <button type="button" data-vt-preset="400" class="vt-preset-btn py-2 px-3 rounded-lg text-xs font-medium text-center border transition-all ${
        curDuration === 400
          ? 'bg-cyphr/15 text-cyphr border-cyphr/40 shadow-sm'
          : 'bg-surface-base text-slate-300 border-white/5 hover:bg-surface-overlay hover:text-white'
      }">
        <div class="font-semibold">Smooth</div>
        <div class="text-[10px] opacity-75 font-mono">400ms</div>
      </button>
    </div>
  </div>

  <!-- Interactive Test Benchmark & Previews -->
  <div class="space-y-2 pt-1">
    <div class="text-xs text-slate-300 font-medium">Test Transition Styles</div>
    <div class="grid grid-cols-5 gap-1.5">
      <button type="button" data-vt-test="slide-left" class="vt-test-btn py-1.5 px-2 rounded bg-surface-overlay text-[11px] font-mono text-slate-300 border border-white/5 hover:border-cyphr/40 hover:text-cyphr transition-all text-center">
        Slide L
      </button>
      <button type="button" data-vt-test="slide-right" class="vt-test-btn py-1.5 px-2 rounded bg-surface-overlay text-[11px] font-mono text-slate-300 border border-white/5 hover:border-cyphr/40 hover:text-cyphr transition-all text-center">
        Slide R
      </button>
      <button type="button" data-vt-test="fade" class="vt-test-btn py-1.5 px-2 rounded bg-surface-overlay text-[11px] font-mono text-slate-300 border border-white/5 hover:border-cyphr/40 hover:text-cyphr transition-all text-center">
        Fade
      </button>
      <button type="button" data-vt-test="zoom-in" class="vt-test-btn py-1.5 px-2 rounded bg-surface-overlay text-[11px] font-mono text-slate-300 border border-white/5 hover:border-cyphr/40 hover:text-cyphr transition-all text-center">
        Zoom In
      </button>
      <button type="button" data-vt-test="zoom-out" class="vt-test-btn py-1.5 px-2 rounded bg-surface-overlay text-[11px] font-mono text-slate-300 border border-white/5 hover:border-cyphr/40 hover:text-cyphr transition-all text-center">
        Zoom Out
      </button>
    </div>
  </div>

  <!-- Live Test Stage Preview Canvas -->
  <div id="aether-vt-demo-canvas" class="bg-surface-base rounded-lg p-3 border border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono overflow-hidden">
    <span class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-cyphr"></span>
      <span id="aether-vt-demo-label">Active View: <strong class="text-white">${this.currentView}</strong></span>
    </span>
    <span id="aether-vt-stats-badge" class="text-[10px] text-slate-500 font-mono">Transitions: ${this.metrics.totalTransitions}</span>
  </div>
</div>
    `.trim();
  }

  // ─── Event Binding & DOM Interactivity ──────────────────────────────────────

  /**
   * Attaches interactive DOM listeners to the settings widget controls.
   * 
   * @param container Optional container root (defaults to document)
   */
  public bindEvents(container?: HTMLElement | Document): void {
    const root = container || (typeof document !== 'undefined' ? document : null);
    if (!root) return;

    // 1. Toggle switch
    const toggleEl = root.querySelector('#aether-vt-toggle') as HTMLInputElement | null;
    if (toggleEl) {
      toggleEl.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.setEnabled(target.checked);
      });
    }

    // 2. Preset buttons
    const presetButtons = root.querySelectorAll('.vt-preset-btn');
    presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetVal = parseInt(btn.getAttribute('data-vt-preset') || '250', 10);
        if (presetVal === 150 || presetVal === 250 || presetVal === 400) {
          this.setDuration(presetVal);
          this.updateWidgetUI(root);
        }
      });
    });

    // 3. Test transition buttons
    const testButtons = root.querySelectorAll('.vt-test-btn');
    testButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const testType = (btn.getAttribute('data-vt-test') || 'fade') as TransitionType;
        await this.testTransition(testType, root);
      });
    });
  }

  /**
   * Triggers a visual test transition in the preview stage.
   */
  public async testTransition(type: TransitionType, root?: HTMLElement | Document): Promise<void> {
    const context = root || (typeof document !== 'undefined' ? document : null);
    const demoLabel = context ? (context.querySelector('#aether-vt-demo-label') as HTMLElement | null) : null;
    const statsBadge = context ? (context.querySelector('#aether-vt-stats-badge') as HTMLElement | null) : null;
    const nextViewName = `demo-${type}-${this.metrics.totalTransitions + 1}`;

    await this.transitionTo(nextViewName, () => {
      if (demoLabel) {
        demoLabel.innerHTML = `Style: <strong class="text-cyphr">${type}</strong> (<span class="text-white">${nextViewName}</span>)`;
      }
      if (statsBadge) {
        statsBadge.textContent = `Transitions: ${this.metrics.totalTransitions + 1}`;
      }
    }, type);
  }

  /**
   * Updates dynamic widget UI classes without full re-render.
   */
  private updateWidgetUI(root: HTMLElement | Document): void {
    const durationDisplay = root.querySelector('#aether-vt-duration-display');
    if (durationDisplay) {
      durationDisplay.textContent = `${this.defaultDuration}ms`;
    }

    const presetButtons = root.querySelectorAll('.vt-preset-btn');
    presetButtons.forEach((btn) => {
      const presetVal = parseInt(btn.getAttribute('data-vt-preset') || '0', 10);
      if (presetVal === this.defaultDuration) {
        btn.className = 'vt-preset-btn py-2 px-3 rounded-lg text-xs font-medium text-center border transition-all bg-cyphr/15 text-cyphr border-cyphr/40 shadow-sm';
      } else {
        btn.className = 'vt-preset-btn py-2 px-3 rounded-lg text-xs font-medium text-center border transition-all bg-surface-base text-slate-300 border-white/5 hover:bg-surface-overlay hover:text-white';
      }
    });
  }

  // ─── Configuration & Getters / Setters ──────────────────────────────────────

  /**
   * Updates the duration setting and saves to local storage.
   */
  public setDuration(durationMs: number): void {
    this.defaultDuration = Math.max(50, Math.min(1000, durationMs));
    this.saveSettings();
  }

  /**
   * Returns current transition duration in milliseconds.
   */
  public getDuration(): number {
    return this.defaultDuration;
  }

  /**
   * Sets whether fluid view transitions are active.
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.saveSettings();
  }

  /**
   * Checks whether transitions are enabled.
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Sets default transition animation style.
   */
  public setDefaultType(type: TransitionType): void {
    this.defaultType = type;
    this.saveSettings();
  }

  /**
   * Gets default transition animation style.
   */
  public getDefaultType(): TransitionType {
    return this.defaultType;
  }

  /**
   * Sets whether to respect prefers-reduced-motion media query.
   */
  public setRespectReducedMotion(respect: boolean): void {
    this.respectReducedMotion = respect;
    this.saveSettings();
  }

  /**
   * Queries window media query to detect if user requested reduced motion.
   */
  public prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Returns complete navigation view history stack.
   */
  public getHistory(): string[] {
    return [...this.transitionHistory];
  }

  /**
   * Clears historical view navigation tracking.
   */
  public clearHistory(): void {
    this.transitionHistory = [this.currentView];
    this.metrics.historyLength = 1;
  }

  /**
   * Returns read-only operational telemetry and metrics.
   */
  public getMetrics(): ViewTransitionMetrics {
    return { ...this.metrics };
  }

  /**
   * Subscribes a listener to transition lifecycle events.
   * Returns an unsubscription callback.
   */
  public addListener(listener: TransitionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Unsubscribes a listener.
   */
  public removeListener(listener: TransitionListener): void {
    this.listeners.delete(listener);
  }

  // ─── Internal Helpers ───────────────────────────────────────────────────────

  /**
   * Dispatches transition event to all registered listeners.
   */
  private notifyListeners(event: TransitionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[ViewTransitions] Error in transition listener:', err);
      }
    }
  }

  /**
   * Updates view history and trims excessive memory backlog.
   */
  private updateViewHistory(newView: string): void {
    this.currentView = newView;
    this.transitionHistory.push(newView);
    if (this.transitionHistory.length > 50) {
      this.transitionHistory.shift();
    }
    this.metrics.historyLength = this.transitionHistory.length;
  }

  /**
   * Records execution telemetry for diagnostics.
   */
  private recordMetric(duration: number, isNative: boolean, type: TransitionType): void {
    this.metrics.totalTransitions += 1;
    this.metrics.totalDurationMs += duration;
    this.metrics.averageDurationMs = Math.round(this.metrics.totalDurationMs / this.metrics.totalTransitions);
    this.metrics.lastTransitionTimestamp = Date.now();
    this.metrics.lastType = type;
    if (isNative) {
      this.metrics.nativeSuccessCount += 1;
    } else {
      this.metrics.fallbackCount += 1;
    }
  }

  /**
   * Saves settings to localStorage with defensive exception handling.
   */
  public saveSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const config: ViewTransitionSettings = {
        enabled: this.enabled,
        duration: this.defaultDuration,
        defaultType: this.defaultType,
        respectReducedMotion: this.respectReducedMotion,
        hapticFeedback: false
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignore quota / security sandbox errors in isolated contexts
    }
  }

  /**
   * Loads settings from localStorage.
   */
  public loadSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ViewTransitionSettings>;
        if (typeof parsed.enabled === 'boolean') this.enabled = parsed.enabled;
        if (typeof parsed.duration === 'number') this.defaultDuration = parsed.duration;
        if (typeof parsed.defaultType === 'string') this.defaultType = parsed.defaultType;
        if (typeof parsed.respectReducedMotion === 'boolean') this.respectReducedMotion = parsed.respectReducedMotion;
      }
    } catch {
      // Ignore parse errors and keep defaults
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const viewTransitions = new ViewTransitionManager();
