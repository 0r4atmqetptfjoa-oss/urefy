/**
 * @file mobile-performance.ts
 * @module @aetheris/client-ui/mobile-performance
 * @description Sovereign Cross-Device & Mobile Responsive Performance Engine.
 * Provides zero-flicker isolated DOM container persistence, passive touch/scroll
 * event listener orchestration, GPU hardware acceleration classes, frame budget telemetry,
 * and seamless mobile navigation & drawer ergonomics.
 */

export interface MobilePerformanceMetrics {
  averageFps: number;
  droppedFrames: number;
  frameBudgetMs: number;
  isHighPerformance: boolean;
  totalFramesRecorded: number;
}

export interface SwipeGestureOptions {
  thresholdPx?: number;
  maxVerticalDeviationPx?: number;
  passive?: boolean;
}

export class MobileResponsivePerformanceManager {
  private _isDrawerOpen: boolean = false;
  private _activeMobileTab: string = 'pulse';
  private _isolatedContainers: Map<string, HTMLElement> = new Map();
  private _preservedState: Map<string, Record<string, any>> = new Map();
  private _passiveListenersCount: number = 0;
  private _frameTimes: number[] = [];
  private _maxFrameTimeSamples: number = 60;
  private _passiveSupported: boolean | null = null;
  private _viewportAdaptationInitialized: boolean = false;

  public static readonly GPU_CLASSES = [
    'gpu-accelerated',
    'hardware-accelerated',
    'no-flicker',
    'will-change-transform',
  ] as const;

  constructor() {
    this.checkPassiveSupport();
  }

  // ─── 1. PASSIVE EVENT LISTENER ORCHESTRATION ────────────────────────────────

  /**
   * Detects whether the runtime browser / environment supports passive event listeners.
   */
  public checkPassiveSupport(): boolean {
    if (this._passiveSupported !== null) {
      return this._passiveSupported;
    }

    let supported = false;
    try {
      if (typeof window !== 'undefined') {
        const opts = Object.defineProperty({}, 'passive', {
          get() {
            supported = true;
            return true;
          },
        });
        const dummyListener = () => {};
        window.addEventListener('test-passive' as any, dummyListener, opts as any);
        window.removeEventListener('test-passive' as any, dummyListener, opts as any);
      } else {
        supported = true; // In test environments, treat as supported
      }
    } catch {
      supported = false;
    }

    this._passiveSupported = supported;
    return supported;
  }

  /**
   * Check if passive event listeners are supported.
   */
  public supportsPassive(): boolean {
    return this.checkPassiveSupport();
  }

  /**
   * Keeps the installed PWA shell aligned to the visual viewport. This avoids
   * clipped navigation and composer controls when browser chrome or the mobile
   * keyboard changes the usable height without updating legacy vh units.
   */
  public initViewportAdaptation(): void {
    if (this._viewportAdaptationInitialized || typeof window === 'undefined' || typeof document === 'undefined') return;
    this._viewportAdaptationInitialized = true;

    const updateViewport = () => {
      const viewport = window.visualViewport;
      const height = Math.round(viewport?.height || window.innerHeight);
      const width = Math.round(viewport?.width || window.innerWidth);
      const keyboardOpen = window.innerHeight - height > 140;
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;

      document.documentElement.style.setProperty('--app-viewport-height', `${height}px`);
      document.documentElement.style.setProperty('--app-viewport-width', `${width}px`);
      document.documentElement.dataset.keyboardOpen = String(keyboardOpen);
      document.documentElement.dataset.displayMode = standalone ? 'standalone' : 'browser';
    };

    updateViewport();
    window.addEventListener('resize', updateViewport, { passive: true });
    window.addEventListener('orientationchange', updateViewport, { passive: true });
    window.visualViewport?.addEventListener('resize', updateViewport, { passive: true });
    window.visualViewport?.addEventListener('scroll', updateViewport, { passive: true });
  }

  /**
   * Safely adds a passive event listener for scroll, touch, or wheel events.
   * Returns a clean unsubscribe function.
   */
  public addPassiveListener<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K | string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): () => void {
    const isPassiveSupported = this.supportsPassive();
    let listenerOptions: boolean | AddEventListenerOptions;

    if (typeof options === 'object') {
      listenerOptions = isPassiveSupported
        ? { passive: true, ...options }
        : Boolean(options.capture);
    } else if (typeof options === 'boolean') {
      listenerOptions = options;
    } else {
      listenerOptions = isPassiveSupported ? { passive: true } : false;
    }

    target.addEventListener(type, listener, listenerOptions);
    this._passiveListenersCount++;

    return () => {
      target.removeEventListener(type, listener, listenerOptions);
      this._passiveListenersCount = Math.max(0, this._passiveListenersCount - 1);
    };
  }

  /**
   * Returns total count of active registered passive listeners.
   */
  public getPassiveListenerCount(): number {
    return this._passiveListenersCount;
  }

  // ─── 2. MOBILE DRAWER & DOCK NAVIGATION ─────────────────────────────────────

  /**
   * Whether the mobile drawer navigation is currently open.
   */
  public get isDrawerOpen(): boolean {
    return this._isDrawerOpen;
  }

  /**
   * Opens the mobile navigation drawer and adds GPU acceleration classes.
   */
  public openDrawer(drawerEl?: HTMLElement | null): void {
    this._isDrawerOpen = true;
    const target = drawerEl || (typeof document !== 'undefined' ? document.getElementById('left-rail-container') : null);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('fixed', 'inset-y-0', 'left-0', 'z-50', 'shadow-2xl', 'w-72', 'bg-surface-base', 'gpu-accelerated', 'no-flicker');
      target.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Closes the mobile navigation drawer.
   */
  public closeDrawer(drawerEl?: HTMLElement | null): void {
    this._isDrawerOpen = false;
    const target = drawerEl || (typeof document !== 'undefined' ? document.getElementById('left-rail-container') : null);
    if (target) {
      target.classList.add('hidden');
      target.classList.remove('fixed', 'inset-y-0', 'left-0', 'z-50', 'shadow-2xl', 'w-72', 'bg-surface-base');
      target.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Toggles the mobile drawer state.
   */
  public toggleDrawer(drawerEl?: HTMLElement | null): boolean {
    if (this._isDrawerOpen) {
      this.closeDrawer(drawerEl);
    } else {
      this.openDrawer(drawerEl);
    }
    return this._isDrawerOpen;
  }

  /**
   * Gets the active mobile navigation tab id.
   */
  public getActiveMobileTab(): string {
    return this._activeMobileTab;
  }

  /**
   * Sets the active mobile navigation tab.
   */
  public setActiveMobileTab(tab: string): void {
    this._activeMobileTab = tab;
  }

  /**
   * Checks if the mobile bottom navigation element exists in DOM.
   */
  public isMobileNavPresent(): boolean {
    if (typeof document === 'undefined') return false;
    return document.getElementById('app-mobile-bottom-nav') !== null;
  }

  /**
   * Renders the mobile bottom navigation dock HTML template.
   */
  public renderMobileBottomNav(activeChannelId: string): string {
    const isPulse = activeChannelId.startsWith('pulse-');
    const isVault = activeChannelId.startsWith('vault-');
    const isRelays = activeChannelId.startsWith('relays-');

    return `
      <nav id="app-mobile-bottom-nav" class="md:hidden fixed bottom-0 inset-x-0 h-14 bg-surface-base/95 backdrop-blur-lg border-t border-subtle-t flex items-center justify-around z-40 px-2 text-xs font-mono shadow-2xl gpu-accelerated no-flicker">
        <button type="button" data-nav-mode="pulse" class="btn-nav-mode flex flex-col items-center justify-center p-1.5 rounded-xl cursor-pointer ${isPulse ? 'text-indigo-400 font-bold' : 'text-slate-400'}">
          <span class="text-base leading-none">⚡</span>
          <span class="text-[9px] mt-0.5 font-sans">Stream</span>
        </button>
        <button type="button" data-nav-mode="vault" class="btn-nav-mode flex flex-col items-center justify-center p-1.5 rounded-xl cursor-pointer ${isVault ? 'text-emerald-400 font-bold' : 'text-slate-400'}">
          <span class="text-base leading-none">📚</span>
          <span class="text-[9px] mt-0.5 font-sans">Vault</span>
        </button>
        <button type="button" id="btn-mobile-composer" class="w-10 h-10 -mt-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center text-lg shadow-lg cursor-pointer transform active:scale-95 transition-transform gpu-accelerated" title="New Publication">
          ✍️
        </button>
        <button type="button" data-nav-mode="relays" class="btn-nav-mode flex flex-col items-center justify-center p-1.5 rounded-xl cursor-pointer ${isRelays ? 'text-indigo-400 font-bold' : 'text-slate-400'}">
          <span class="text-base leading-none">💬</span>
          <span class="text-[9px] mt-0.5 font-sans">Relays</span>
        </button>
        <button type="button" id="btn-mobile-search" class="flex flex-col items-center justify-center p-1.5 rounded-xl cursor-pointer text-slate-400 hover:text-white">
          <span class="text-base leading-none">🔍</span>
          <span class="text-[9px] mt-0.5 font-sans">Search</span>
        </button>
      </nav>
    `.trim();
  }

  // ─── 3. ZERO-FLICKER & ISOLATED DOM CONTAINER PERSISTENCE ────────────────────

  /**
   * Registers a persistent isolated DOM container to avoid remounting/flicker.
   */
  public registerIsolatedContainer(id: string, element: HTMLElement): void {
    element.classList.add('isolated-dom-container', 'no-flicker');
    this._isolatedContainers.set(id, element);
  }

  /**
   * Retrieves an isolated container by ID.
   */
  public getIsolatedContainer(id: string): HTMLElement | undefined {
    return this._isolatedContainers.get(id);
  }

  /**
   * Checks if an isolated container is registered.
   */
  public hasIsolatedContainer(id: string): boolean {
    return this._isolatedContainers.has(id);
  }

  /**
   * Removes an isolated container registration.
   */
  public removeIsolatedContainer(id: string): boolean {
    return this._isolatedContainers.delete(id);
  }

  /**
   * Clears all isolated container registrations.
   */
  public clearIsolatedContainers(): void {
    this._isolatedContainers.clear();
  }

  /**
   * Saves DOM state (e.g. scroll position, input draft, active child index) for a container.
   */
  public preserveDOMState(containerId: string, state: Record<string, any>): void {
    const existing = this._preservedState.get(containerId) || {};
    this._preservedState.set(containerId, { ...existing, ...state });
  }

  /**
   * Gets preserved DOM state for a container.
   */
  public getPreservedDOMState(containerId: string): Record<string, any> | undefined {
    return this._preservedState.get(containerId);
  }

  /**
   * Clears preserved DOM state.
   */
  public clearPreservedDOMState(containerId?: string): void {
    if (containerId) {
      this._preservedState.delete(containerId);
    } else {
      this._preservedState.clear();
    }
  }

  /**
   * Zero-flicker DOM update: Updates target innerHTML while preserving isolated child elements.
   */
  public renderWithoutFlicker(
    targetId: string,
    htmlContent: string,
    preserveChildrenIds: string[] = []
  ): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const target = document.getElementById(targetId);
    if (!target) return null;

    // 1. Detach and preserve child nodes if requested
    const savedNodes = new Map<string, Node>();
    for (const childId of preserveChildrenIds) {
      const childNode = target.querySelector(`#${childId}`) || this._isolatedContainers.get(childId);
      if (childNode && childNode.parentNode) {
        savedNodes.set(childId, childNode);
      }
    }

    // 2. Perform smooth DOM update
    target.innerHTML = htmlContent;

    // 3. Re-inject preserved nodes into their designated placeholder slots
    for (const [childId, node] of savedNodes.entries()) {
      const placeholder = target.querySelector(`[data-placeholder-id="${childId}"]`);
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.replaceChild(node, placeholder);
      }
    }

    return target;
  }

  // ─── 4. GPU ACCELERATION CSS UTILITIES ──────────────────────────────────────

  /**
   * Returns list of supported GPU acceleration class names.
   */
  public getGPUClasses(): readonly string[] {
    return MobileResponsivePerformanceManager.GPU_CLASSES;
  }

  /**
   * Applies GPU hardware acceleration CSS classes to a target element.
   */
  public applyGPUAcceleration(element: HTMLElement): void {
    element.classList.add('gpu-accelerated', 'no-flicker');
  }

  /**
   * Removes GPU acceleration CSS classes from a target element.
   */
  public removeGPUAcceleration(element: HTMLElement): void {
    element.classList.remove('gpu-accelerated', 'hardware-accelerated', 'no-flicker', 'will-change-transform');
  }

  /**
   * Checks if an element has GPU acceleration classes applied.
   */
  public isGPUAccelerated(element: HTMLElement): boolean {
    return (
      element.classList.contains('gpu-accelerated') ||
      element.classList.contains('hardware-accelerated') ||
      element.classList.contains('no-flicker')
    );
  }

  // ─── 5. PERFORMANCE & FRAME BUDGET TELEMETRY ────────────────────────────────

  /**
   * Records a frame duration sample in milliseconds (e.g. from requestAnimationFrame).
   */
  public recordFrameTime(durationMs: number): void {
    if (durationMs > 0) {
      this._frameTimes.push(durationMs);
      if (this._frameTimes.length > this._maxFrameTimeSamples) {
        this._frameTimes.shift();
      }
    }
  }

  /**
   * Computes average FPS, frame budget, and dropped frame counts.
   */
  public getPerformanceMetrics(): MobilePerformanceMetrics {
    if (this._frameTimes.length === 0) {
      return {
        averageFps: 60,
        droppedFrames: 0,
        frameBudgetMs: 16.67,
        isHighPerformance: true,
        totalFramesRecorded: 0,
      };
    }

    const sum = this._frameTimes.reduce((acc, val) => acc + val, 0);
    const avgDuration = sum / this._frameTimes.length;
    const avgFps = Math.min(120, Math.round(1000 / Math.max(avgDuration, 1)));
    const droppedFrames = this._frameTimes.filter((d) => d > 16.67).length;

    return {
      averageFps: avgFps,
      droppedFrames,
      frameBudgetMs: Math.round(avgDuration * 100) / 100,
      isHighPerformance: avgFps >= 55 && droppedFrames / this._frameTimes.length < 0.1,
      totalFramesRecorded: this._frameTimes.length,
    };
  }

  /**
   * Resets performance metrics history.
   */
  public resetPerformanceMetrics(): void {
    this._frameTimes = [];
  }

  // ─── 6. TOUCH SWIPE GESTURE HANDLER (PASSIVE) ────────────────────────────────

  /**
   * Attaches passive touch swipe handlers to trigger drawer or tab changes smoothly.
   */
  public attachTouchSwipeGesture(
    element: HTMLElement,
    onSwipeLeft?: () => void,
    onSwipeRight?: () => void,
    options: SwipeGestureOptions = {}
  ): () => void {
    const threshold = options.thresholdPx ?? 50;
    const maxVertical = options.maxVerticalDeviationPx ?? 80;

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: Event) => {
      const touchEvent = e as TouchEvent;
      if (touchEvent.touches && touchEvent.touches.length > 0) {
        startX = touchEvent.touches[0].clientX;
        startY = touchEvent.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e: Event) => {
      const touchEvent = e as TouchEvent;
      if (!touchEvent.changedTouches || touchEvent.changedTouches.length === 0) return;
      const endX = touchEvent.changedTouches[0].clientX;
      const endY = touchEvent.changedTouches[0].clientY;

      const deltaX = endX - startX;
      const deltaY = Math.abs(endY - startY);

      if (deltaY <= maxVertical) {
        if (deltaX > threshold && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < -threshold && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    };

    const unregStart = this.addPassiveListener(element, 'touchstart', handleTouchStart);
    const unregEnd = this.addPassiveListener(element, 'touchend', handleTouchEnd);

    return () => {
      unregStart();
      unregEnd();
    };
  }
}

export const mobilePerformance = new MobileResponsivePerformanceManager();
