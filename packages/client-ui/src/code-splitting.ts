/**
 * Aetheris Omni-Sphere — Code Splitting & Dynamic Module Loader
 * Zero external dependencies. Self-contained strict TypeScript module.
 * 
 * Provides dynamic chunk loading, idle-time preloading (requestIdleCallback),
 * initial bundle reduction telemetry, progressive splash initialization,
 * and obsidian-themed UI rendering widgets.
 */

import { safeRequestIdleCallback } from './dry-utils.js';

export interface LazyModule {
  name: string;
  isLoaded: boolean;
  isLoading: boolean;
  loadedAt?: number;
  sizeEstimateKB: number;
  error?: string | null;
  loadDurationMs?: number;
  category?: 'critical' | 'interactive' | 'heavy' | 'background';
  isPreloaded?: boolean;
}

export interface BundleStats {
  totalRegistered: number;
  totalLoaded: number;
  totalPreloaded: number;
  estimatedSavedKB: number;
  totalRegisteredSizeKB: number;
  loadedSizeKB: number;
}

export interface ModuleDescriptor {
  name: string;
  importFn: () => Promise<unknown>;
  sizeEstimateKB?: number;
  category?: 'critical' | 'interactive' | 'heavy' | 'background';
  delayMs?: number;
}

export type ModuleLoaderListener = (event: {
  name: string;
  status: 'registered' | 'loading' | 'loaded' | 'error' | 'preloaded';
  module: LazyModule;
  durationMs?: number;
}) => void;

/**
 * High-performance Dynamic Module & Bundle Orchestrator
 */
export class ModuleLoader {
  public modules: Map<string, LazyModule> = new Map();
  public loadedModules: Map<string, unknown> = new Map();
  private loadingPromises: Map<string, Promise<unknown>> = new Map();
  private preloadedModules: Set<string> = new Set();
  private listeners: Set<ModuleLoaderListener> = new Set();
  
  public criticalModulesLoaded: boolean = false;
  public progressiveProgress: number = 0;
  public currentStatusText: string = 'Initialized';
  private idleQueue: Array<{ name: string; importFn: () => Promise<unknown> }> = [];
  private isProcessingIdleQueue: boolean = false;

  constructor() {
    this.seedDefaultModules();
  }

  /**
   * Seed realistic Aetheris Omni-Sphere module registry
   */
  private seedDefaultModules(): void {
    const defaultModules: Array<{ name: string; sizeKB: number; category: 'critical' | 'interactive' | 'heavy' | 'background' }> = [
      { name: 'app-core', sizeKB: 120, category: 'critical' },
      { name: 'client-state', sizeKB: 95, category: 'critical' },
      { name: 'audio-dsp', sizeKB: 84, category: 'heavy' },
      { name: 'media-player', sizeKB: 48, category: 'heavy' },
      { name: 'screenshare', sizeKB: 52, category: 'heavy' },
      { name: 'gossip-viz', sizeKB: 95, category: 'heavy' },
      { name: 'spatial-audio', sizeKB: 42, category: 'heavy' },
      { name: 'zk-proof-viewer', sizeKB: 64, category: 'heavy' },
      { name: 'rich-editor', sizeKB: 72, category: 'interactive' },
      { name: 'download-manager', sizeKB: 68, category: 'interactive' },
      { name: 'stories', sizeKB: 44, category: 'interactive' },
      { name: 'custom-theme-builder', sizeKB: 38, category: 'interactive' },
      { name: 'diff-viewer', sizeKB: 28, category: 'interactive' },
      { name: 'slide-deck', sizeKB: 36, category: 'interactive' },
      { name: 'analytics-widget', sizeKB: 32, category: 'background' },
      { name: 'rss-import', sizeKB: 26, category: 'background' },
    ];

    for (const mod of defaultModules) {
      this.registerLazyModule(mod.name, mod.sizeKB, mod.category);
    }
  }

  /**
   * Subscribe to module lifecycle events
   */
  public subscribe(listener: ModuleLoaderListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all registered listeners
   */
  private notify(
    name: string,
    status: 'registered' | 'loading' | 'loaded' | 'error' | 'preloaded',
    module: LazyModule,
    durationMs?: number
  ): void {
    for (const listener of this.listeners) {
      try {
        listener({ name, status, module, durationMs });
      } catch (err) {
        console.error(`[ModuleLoader] Listener error on module ${name}:`, err);
      }
    }
  }

  /**
   * Register a module as lazy-loadable
   */
  public registerLazyModule(
    name: string,
    sizeEstimateKB: number,
    category: 'critical' | 'interactive' | 'heavy' | 'background' = 'interactive'
  ): void {
    const existing = this.modules.get(name);
    if (existing) {
      existing.sizeEstimateKB = sizeEstimateKB;
      existing.category = category;
      return;
    }

    const lazyMod: LazyModule = {
      name,
      isLoaded: false,
      isLoading: false,
      sizeEstimateKB,
      category,
      error: null,
      isPreloaded: false
    };

    this.modules.set(name, lazyMod);
    this.notify(name, 'registered', lazyMod);
  }

  /**
   * Check if a module is loaded
   */
  public isLoaded(name: string): boolean {
    if (this.loadedModules.has(name)) return true;
    const mod = this.modules.get(name);
    return Boolean(mod && mod.isLoaded);
  }

  /**
   * Check if a module is currently loading
   */
  public isLoading(name: string): boolean {
    if (this.loadingPromises.has(name)) return true;
    const mod = this.modules.get(name);
    return Boolean(mod && mod.isLoading);
  }

  /**
   * Check if a module was preloaded
   */
  public isPreloaded(name: string): boolean {
    return this.preloadedModules.has(name);
  }

  /**
   * Get lazy module metadata
   */
  public getModule(name: string): LazyModule | undefined {
    return this.modules.get(name);
  }

  /**
   * Retrieve an already loaded module from cache
   */
  public getLoadedModule<T = unknown>(name: string): T | undefined {
    return this.loadedModules.get(name) as T | undefined;
  }

  /**
   * Dynamically import and cache a module on demand
   */
  public async loadModule(name: string, importFn: () => Promise<unknown>): Promise<unknown> {
    // Return cached module if already loaded
    if (this.loadedModules.has(name)) {
      return this.loadedModules.get(name);
    }

    // Return in-flight promise if currently loading
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name);
    }

    let mod = this.modules.get(name);
    if (!mod) {
      this.registerLazyModule(name, 50, 'interactive');
      mod = this.modules.get(name)!;
    }

    mod.isLoading = true;
    mod.error = null;
    this.notify(name, 'loading', mod);

    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const loadPromise = (async () => {
      try {
        const resolvedModule = await importFn();
        const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const duration = Math.round(endTime - startTime);

        mod.isLoaded = true;
        mod.isLoading = false;
        mod.loadedAt = Date.now();
        mod.loadDurationMs = duration;
        mod.error = null;

        this.loadedModules.set(name, resolvedModule);
        this.loadingPromises.delete(name);

        this.notify(name, 'loaded', mod, duration);
        return resolvedModule;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        mod.isLoading = false;
        mod.isLoaded = false;
        mod.error = errMsg;
        this.loadingPromises.delete(name);

        this.notify(name, 'error', mod);
        console.error(`[ModuleLoader] Failed to dynamically load module '${name}':`, err);
        throw err;
      }
    })();

    this.loadingPromises.set(name, loadPromise);
    return loadPromise;
  }

  /**
   * Preload modules during browser idle time using requestIdleCallback
   */
  public preloadOnIdle(names: string[], importFns: (() => Promise<unknown>)[]): void {
    if (names.length !== importFns.length) {
      console.warn('[ModuleLoader] preloadOnIdle: names and importFns arrays must have identical length.');
      return;
    }

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const importFn = importFns[i];

      if (!this.isLoaded(name) && !this.isLoading(name)) {
        this.idleQueue.push({ name, importFn });
      }
    }

    this.processNextIdleTask();
  }

  /**
   * Internal scheduler for idle queue processing
   */
  private processNextIdleTask(): void {
    if (this.isProcessingIdleQueue || this.idleQueue.length === 0) {
      return;
    }

    this.isProcessingIdleQueue = true;

    safeRequestIdleCallback(async (deadline) => {
      while (this.idleQueue.length > 0 && (deadline.timeRemaining() > 5 || deadline.didTimeout)) {
        const item = this.idleQueue.shift();
        if (!item) break;

        const { name, importFn } = item;
        if (!this.isLoaded(name) && !this.isLoading(name)) {
          try {
            await this.loadModule(name, importFn);
            this.preloadedModules.add(name);
            const mod = this.modules.get(name);
            if (mod) {
              mod.isPreloaded = true;
              this.notify(name, 'preloaded', mod);
            }
          } catch {
            // Error already logged by loadModule
          }
        }
      }

      this.isProcessingIdleQueue = false;

      if (this.idleQueue.length > 0) {
        this.processNextIdleTask();
      }
    });
  }

  /**
   * Compute comprehensive bundle reduction & memory stats
   */
  public getBundleStats(): { totalRegistered: number; totalLoaded: number; estimatedSavedKB: number } {
    let totalRegistered = 0;
    let totalLoaded = 0;
    let estimatedSavedKB = 0;

    for (const mod of this.modules.values()) {
      totalRegistered++;
      if (mod.isLoaded) {
        totalLoaded++;
      } else {
        estimatedSavedKB += mod.sizeEstimateKB;
      }
    }

    return {
      totalRegistered,
      totalLoaded,
      estimatedSavedKB
    };
  }

  /**
   * Compute detailed bundle metrics
   */
  public getDetailedBundleStats(): BundleStats {
    let totalRegistered = 0;
    let totalLoaded = 0;
    let totalPreloaded = this.preloadedModules.size;
    let estimatedSavedKB = 0;
    let totalRegisteredSizeKB = 0;
    let loadedSizeKB = 0;

    for (const mod of this.modules.values()) {
      totalRegistered++;
      totalRegisteredSizeKB += mod.sizeEstimateKB;

      if (mod.isLoaded) {
        totalLoaded++;
        loadedSizeKB += mod.sizeEstimateKB;
      } else {
        estimatedSavedKB += mod.sizeEstimateKB;
      }
    }

    return {
      totalRegistered,
      totalLoaded,
      totalPreloaded,
      estimatedSavedKB,
      totalRegisteredSizeKB,
      loadedSizeKB
    };
  }

  /**
   * Render loading spinner component for lazy chunks
   */
  public renderLoadingSpinner(moduleName: string): string {
    const mod = this.modules.get(moduleName);
    const sizeKB = mod ? mod.sizeEstimateKB : 45;
    const category = mod ? mod.category || 'interactive' : 'interactive';

    return `
      <div class="flex flex-col items-center justify-center p-8 bg-surface-base border border-white/5 rounded-xl text-center shadow-2xl relative overflow-hidden group">
        <!-- Ambient Neon Glow Background -->
        <div class="absolute -top-24 -left-24 w-48 h-48 bg-cyphr/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyphr/20 transition-all duration-700"></div>
        <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-aether/10 rounded-full blur-3xl pointer-events-none group-hover:bg-aether/20 transition-all duration-700"></div>

        <!-- Cyber Spinner Rings -->
        <div class="relative w-14 h-14 mb-4 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full border-2 border-white/10"></div>
          <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-cyphr border-r-cyphr animate-spin"></div>
          <div class="absolute inset-1.5 rounded-full border-2 border-transparent border-b-aether border-l-aether animate-spin" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
          
          <div class="w-2.5 h-2.5 rounded-full bg-cyphr animate-ping"></div>
          <div class="w-2 h-2 rounded-full bg-signal absolute"></div>
        </div>

        <!-- Module Info & Status -->
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-xs font-mono uppercase tracking-wider text-slate-400">Loading Module</span>
          <span class="px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface-raised border border-white/10 text-cyphr font-bold">${this.escapeHtml(moduleName)}</span>
        </div>

        <p class="text-sm font-sans font-medium text-slate-200 mb-2">
          Decompressing dynamic bytecode bundle...
        </p>

        <div class="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-cyphr"></span>
            ~${sizeKB} KB payload
          </span>
          <span>•</span>
          <span class="capitalize text-slate-300 font-medium">${category}</span>
          <span>•</span>
          <span class="text-signal flex items-center gap-1">
            <svg class="w-3.5 h-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Zero Blocking
          </span>
        </div>
      </div>
    `;
  }

  /**
   * Render bundle statistics widget for the application footer
   * Format: 📦 Bundle: 12 modules lazy | Saved ~340 KB initial | 4 preloaded
   */
  public renderBundleStatsWidget(): string {
    const stats = this.getBundleStats();
    const totalPreloaded = this.preloadedModules.size;
    const detailed = this.getDetailedBundleStats();
    const percentSaved = detailed.totalRegisteredSizeKB > 0
      ? Math.round((detailed.estimatedSavedKB / detailed.totalRegisteredSizeKB) * 100)
      : 0;

    return `
      <div id="bundle-stats-widget" class="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-surface-base border border-white/5 hover:border-cyphr/30 hover:bg-surface-raised text-xs font-mono text-slate-300 shadow-lg transition-all duration-200 cursor-pointer select-none group" title="Click to view Code Splitting & Dynamic Imports Dashboard" onclick="if(window.toggleBundleManagerModal) window.toggleBundleManagerModal();">
        <!-- Package Icon with Glow -->
        <span class="flex items-center justify-center text-cyphr group-hover:scale-110 transition-transform">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </span>

        <!-- Core Text Metric -->
        <div class="flex items-center gap-1.5">
          <span class="font-bold text-slate-100">Bundle:</span>
          <span class="text-cyphr font-bold">${stats.totalRegistered} modules lazy</span>
          <span class="text-slate-600">|</span>
          <span class="text-signal font-semibold">Saved ~${stats.estimatedSavedKB} KB initial</span>
          <span class="text-slate-600">|</span>
          <span class="text-aether font-semibold">${totalPreloaded} preloaded</span>
        </div>

        <!-- Savings Badge -->
        <span class="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-signal/10 border border-signal/30 text-signal text-[10px] font-bold">
          -${percentSaved}% Init
        </span>

        <!-- Chevron Icon -->
        <svg class="w-3.5 h-3.5 text-slate-500 group-hover:text-cyphr group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    `;
  }

  /**
   * Initialize and eagerly load critical core modules (app.ts, client-state.ts)
   */
  public async initCriticalModules(modules: unknown[]): Promise<void> {
    this.currentStatusText = 'Initializing critical system kernels...';
    this.progressiveProgress = 15;

    const criticalTasks: Promise<unknown>[] = [];

    for (const item of modules) {
      if (typeof item === 'function') {
        const fn = item as () => Promise<unknown>;
        criticalTasks.push(fn());
      } else if (item && typeof item === 'object' && 'importFn' in item && 'name' in item) {
        const desc = item as ModuleDescriptor;
        this.registerLazyModule(desc.name, desc.sizeEstimateKB || 100, 'critical');
        criticalTasks.push(this.loadModule(desc.name, desc.importFn));
      }
    }

    try {
      this.progressiveProgress = 35;
      await Promise.all(criticalTasks);
      this.criticalModulesLoaded = true;
      this.progressiveProgress = 60;
      this.currentStatusText = 'Critical subsystem ready. Sovereign storage mounted.';
    } catch (err) {
      console.error('[ModuleLoader] Critical initialization failed:', err);
      this.currentStatusText = 'Critical core initialization encountered an alert.';
      throw err;
    }
  }

  /**
   * Schedule non-critical modules after a delay (e.g. 2s) or during idle
   */
  public scheduleNonCritical(modules: unknown[]): void {
    const descriptors: ModuleDescriptor[] = [];

    for (const item of modules) {
      if (item && typeof item === 'object' && 'importFn' in item && 'name' in item) {
        const desc = item as ModuleDescriptor;
        this.registerLazyModule(
          desc.name,
          desc.sizeEstimateKB || 40,
          desc.category || 'interactive'
        );
        descriptors.push(desc);
      }
    }

    const scheduleTimer = typeof window !== 'undefined' ? window.setTimeout : setTimeout;

    const timer = scheduleTimer(() => {
      this.currentStatusText = 'Preloading deferred auxiliary packages...';
      const names = descriptors.map(d => d.name);
      const fns = descriptors.map(d => d.importFn);
      this.preloadOnIdle(names, fns);
      this.progressiveProgress = 100;
    }, 2000);

    if (timer && typeof (timer as unknown as { unref?: () => void }).unref === 'function') {
      (timer as unknown as { unref: () => void }).unref();
    }
  }

  /**
   * Render progressive splash screen loading bar
   */
  public renderProgressiveLoader(): string {
    const stats = this.getBundleStats();
    const percent = Math.min(100, Math.max(0, this.progressiveProgress));

    return `
      <div id="progressive-splash-loader" class="w-full max-w-md mx-auto p-6 bg-surface-base/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden font-sans">
        <!-- Neon Header with Status -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-3 h-3 rounded-full bg-cyphr animate-ping"></div>
            <span class="text-sm font-bold tracking-wide text-slate-100 uppercase">Aetheris Omni-Sphere</span>
          </div>
          <span class="text-xs font-mono font-bold text-cyphr bg-cyphr/10 border border-cyphr/30 px-2 py-0.5 rounded">
            ${percent}%
          </span>
        </div>

        <!-- Progress Track -->
        <div class="w-full h-2.5 bg-surface-raised rounded-full overflow-hidden border border-white/5 p-0.5 mb-3.5 relative">
          <div class="h-full bg-gradient-to-r from-cyphr via-signal to-aether rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(0,229,255,0.6)]" style="width: ${percent}%;"></div>
        </div>

        <!-- Telemetry Status Log -->
        <div class="flex items-center justify-between text-xs font-mono text-slate-400">
          <div class="flex items-center gap-1.5 truncate max-w-[280px]">
            <span class="text-signal font-bold">›</span>
            <span class="truncate text-slate-300">${this.escapeHtml(this.currentStatusText)}</span>
          </div>
          <div class="text-[11px] text-slate-400 whitespace-nowrap pl-2">
            <span class="text-cyphr font-semibold">${stats.totalLoaded}</span> / <span>${stats.totalRegistered} modules</span>
          </div>
        </div>

        <!-- Memory Saved Footer -->
        <div class="mt-4 pt-3 border-t border-subtle-b flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span class="flex items-center gap-1 text-slate-400">
            <svg class="w-3.5 h-3.5 text-signal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Zero Main-Thread Jitter
          </span>
          <span class="text-signal font-bold">Saved ~${stats.estimatedSavedKB} KB init</span>
        </div>
      </div>
    `;
  }

  /**
   * Render complete module management modal/dashboard
   */
  public renderModuleListDashboard(): string {
    const detailed = this.getDetailedBundleStats();
    const modulesArray = Array.from(this.modules.values());

    const moduleRows = modulesArray.map(mod => {
      const isLoaded = mod.isLoaded;
      const isLoading = mod.isLoading;
      const isPreloaded = mod.isPreloaded;

      let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">Lazy Standby</span>`;
      if (isLoading) {
        statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-amber/10 text-amber border border-amber/30 animate-pulse">Loading...</span>`;
      } else if (isLoaded) {
        statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-signal/10 text-signal border border-signal/30 font-bold">Loaded (${mod.loadDurationMs || 0}ms)</span>`;
      } else if (isPreloaded) {
        statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-aether/10 text-aether border border-aether/30 font-semibold">Preloaded</span>`;
      }

      return `
        <tr class="border-b border-white/5 hover:bg-surface-overlay/50 transition-colors">
          <td class="py-2.5 px-3 font-mono font-bold text-slate-200 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${isLoaded ? 'bg-signal' : (isLoading ? 'bg-amber' : 'bg-slate-600')}"></span>
            ${this.escapeHtml(mod.name)}
          </td>
          <td class="py-2.5 px-3 font-mono text-xs text-slate-400 capitalize">
            ${this.escapeHtml(mod.category || 'interactive')}
          </td>
          <td class="py-2.5 px-3 font-mono text-xs text-slate-300 font-semibold">
            ${mod.sizeEstimateKB} KB
          </td>
          <td class="py-2.5 px-3">
            ${statusBadge}
          </td>
          <td class="py-2.5 px-3 text-right">
            ${!isLoaded && !isLoading ? `
              <button 
                class="px-2.5 py-1 text-xs font-mono font-medium rounded bg-surface-raised hover:bg-cyphr/20 border border-white/10 hover:border-cyphr/40 text-cyphr transition-all"
                onclick="window.dispatchEvent(new CustomEvent('aetheris-load-module', { detail: '${this.escapeHtml(mod.name)}' }))"
              >
                Force Load
              </button>
            ` : (isLoaded ? `
              <span class="text-xs font-mono text-slate-500">Ready</span>
            ` : `
              <span class="text-xs font-mono text-amber">Active</span>
            `)}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div id="bundle-manager-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div class="w-full max-w-3xl bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          <!-- Modal Header -->
          <div class="px-6 py-4 bg-surface-raised border-b border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-cyphr/10 text-cyphr border border-cyphr/20">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-100 font-sans">Code Splitting & Bundle Telemetry</h3>
                <p class="text-xs font-mono text-slate-400">Dynamic Chunk Registry & On-Demand Execution</p>
              </div>
            </div>
            <button 
              class="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-surface-overlay transition-colors"
              onclick="if(window.toggleBundleManagerModal) window.toggleBundleManagerModal();"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Top Stat Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-surface-base border-b border-white/5">
            <div class="p-3 rounded-xl bg-surface-raised border border-white/5">
              <span class="text-[11px] font-mono text-slate-400 uppercase">Registered</span>
              <p class="text-lg font-bold font-mono text-cyphr mt-0.5">${detailed.totalRegistered} <span class="text-xs font-normal text-slate-400">chunks</span></p>
            </div>
            <div class="p-3 rounded-xl bg-surface-raised border border-white/5">
              <span class="text-[11px] font-mono text-slate-400 uppercase">Loaded</span>
              <p class="text-lg font-bold font-mono text-signal mt-0.5">${detailed.totalLoaded} <span class="text-xs font-normal text-slate-400">active</span></p>
            </div>
            <div class="p-3 rounded-xl bg-surface-raised border border-white/5">
              <span class="text-[11px] font-mono text-slate-400 uppercase">Preloaded</span>
              <p class="text-lg font-bold font-mono text-aether mt-0.5">${detailed.totalPreloaded} <span class="text-xs font-normal text-slate-400">idle</span></p>
            </div>
            <div class="p-3 rounded-xl bg-surface-raised border border-white/5">
              <span class="text-[11px] font-mono text-slate-400 uppercase">Initial Saved</span>
              <p class="text-lg font-bold font-mono text-signal mt-0.5">~${detailed.estimatedSavedKB} <span class="text-xs font-normal text-slate-400">KB</span></p>
            </div>
          </div>

          <!-- Module Table -->
          <div class="flex-1 overflow-y-auto p-5">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-white/10 text-[11px] font-mono uppercase text-slate-400">
                  <th class="py-2 px-3">Module Name</th>
                  <th class="py-2 px-3">Category</th>
                  <th class="py-2 px-3">Size (KB)</th>
                  <th class="py-2 px-3">State</th>
                  <th class="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                ${moduleRows}
              </tbody>
            </table>
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-3 bg-surface-raised border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Dynamic imports execute on demand via Webpack/Vite runtime</span>
            <button 
              class="px-4 py-1.5 rounded-lg bg-surface-overlay hover:bg-slate-700 text-slate-200 font-semibold border border-white/10 transition-all"
              onclick="if(window.toggleBundleManagerModal) window.toggleBundleManagerModal();"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Escape HTML special characters for safe inline template rendering
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/**
 * Singleton instance export
 */
export const moduleLoader = new ModuleLoader();
