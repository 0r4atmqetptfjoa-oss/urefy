import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ModuleLoader,
  moduleLoader,
  type LazyModule,
  type BundleStats,
  type ModuleDescriptor,
} from '../src/code-splitting.js';

describe('Code Splitting & Dynamic Module Loader Engine', () => {
  let loader: ModuleLoader;

  beforeEach(() => {
    loader = new ModuleLoader();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 1. SEEDED REGISTRY & DEFAULT INITIALIZATION ────────────────────────────

  describe('1. Default Seeded Registry & Initial State', () => {
    it('should initialize with 16 default sovereign modules', () => {
      expect(loader.modules.size).toBe(16);
      expect(loader.criticalModulesLoaded).toBe(false);
      expect(loader.progressiveProgress).toBe(0);
      expect(loader.currentStatusText).toBe('Initialized');

      const expectedModules = [
        'app-core',
        'client-state',
        'audio-dsp',
        'media-player',
        'screenshare',
        'gossip-viz',
        'spatial-audio',
        'zk-proof-viewer',
        'rich-editor',
        'download-manager',
        'stories',
        'custom-theme-builder',
        'diff-viewer',
        'slide-deck',
        'analytics-widget',
        'rss-import',
      ];

      for (const name of expectedModules) {
        expect(loader.modules.has(name)).toBe(true);
        expect(loader.isLoaded(name)).toBe(false);
        expect(loader.isLoading(name)).toBe(false);
        expect(loader.isPreloaded(name)).toBe(false);

        const mod = loader.getModule(name);
        expect(mod).toBeDefined();
        expect(mod?.isLoaded).toBe(false);
        expect(mod?.sizeEstimateKB).toBeGreaterThan(0);
      }
    });

    it('should calculate initial uncompressed savings of 944 KB', () => {
      const stats = loader.getBundleStats();
      expect(stats.totalRegistered).toBe(16);
      expect(stats.totalLoaded).toBe(0);
      expect(stats.estimatedSavedKB).toBe(944);

      const detailed: BundleStats = loader.getDetailedBundleStats();
      expect(detailed.totalRegistered).toBe(16);
      expect(detailed.totalLoaded).toBe(0);
      expect(detailed.totalPreloaded).toBe(0);
      expect(detailed.loadedSizeKB).toBe(0);
      expect(detailed.totalRegisteredSizeKB).toBe(944);
      expect(detailed.estimatedSavedKB).toBe(944);
    });

    it('should export singleton instance moduleLoader correctly', () => {
      expect(moduleLoader).toBeInstanceOf(ModuleLoader);
      expect(moduleLoader.modules.size).toBeGreaterThanOrEqual(16);
    });
  });

  // ─── 2. REGISTRATION & METADATA MANAGEMENT ──────────────────────────────────

  describe('2. Module Registration & Lifecycle Subscriptions', () => {
    it('should register a new lazy module and notify listeners', () => {
      const events: Array<{ name: string; status: string }> = [];
      const unsubscribe = loader.subscribe((event) => {
        events.push({ name: event.name, status: event.status });
      });

      loader.registerLazyModule('custom-crypto-worker', 110, 'heavy');

      expect(loader.modules.size).toBe(17);
      expect(loader.isLoaded('custom-crypto-worker')).toBe(false);

      const mod = loader.getModule('custom-crypto-worker');
      expect(mod).toBeDefined();
      expect(mod?.name).toBe('custom-crypto-worker');
      expect(mod?.sizeEstimateKB).toBe(110);
      expect(mod?.category).toBe('heavy');

      expect(events.length).toBe(1);
      expect(events[0]).toEqual({ name: 'custom-crypto-worker', status: 'registered' });

      // Unsubscribe test
      unsubscribe();
      loader.registerLazyModule('another-module', 45, 'interactive');
      expect(events.length).toBe(1); // not notified after unsubscribe
    });

    it('should update metadata for already registered module without duplicate entries', () => {
      loader.registerLazyModule('rich-editor', 95, 'heavy');
      expect(loader.modules.size).toBe(16);

      const mod = loader.getModule('rich-editor');
      expect(mod?.sizeEstimateKB).toBe(95);
      expect(mod?.category).toBe('heavy');
    });
  });

  // ─── 3. ON-DEMAND DYNAMIC LOADING & PROMISE RE-ENTRANCY ─────────────────────

  describe('3. Dynamic Loading & Concurrency Resolution', () => {
    it('should dynamically import, cache, and resolve a module cleanly', async () => {
      const mockResult = { initialized: true, engine: 'zk-prover-v2' };
      const importFn = vi.fn().mockResolvedValue(mockResult);

      const events: string[] = [];
      loader.subscribe((e) => events.push(`${e.name}:${e.status}`));

      const loaded = await loader.loadModule('zk-proof-viewer', importFn);

      expect(importFn).toHaveBeenCalledTimes(1);
      expect(loaded).toEqual(mockResult);
      expect(loader.isLoaded('zk-proof-viewer')).toBe(true);
      expect(loader.isLoading('zk-proof-viewer')).toBe(false);
      expect(loader.getLoadedModule('zk-proof-viewer')).toEqual(mockResult);

      const mod = loader.getModule('zk-proof-viewer');
      expect(mod?.isLoaded).toBe(true);
      expect(mod?.loadDurationMs).toBeDefined();
      expect(mod?.loadedAt).toBeDefined();
      expect(mod?.error).toBeNull();

      expect(events).toContain('zk-proof-viewer:loading');
      expect(events).toContain('zk-proof-viewer:loaded');

      // Subsequent loadModule calls should return cached instance immediately
      const cached = await loader.loadModule('zk-proof-viewer', importFn);
      expect(importFn).toHaveBeenCalledTimes(1); // not called again
      expect(cached).toEqual(mockResult);
    });

    it('should return the same in-flight promise for concurrent loading calls', async () => {
      let resolveFn!: (val: unknown) => void;
      const delayedPromise = new Promise((resolve) => {
        resolveFn = resolve;
      });

      const importFn = vi.fn().mockImplementation(() => delayedPromise);

      const load1 = loader.loadModule('gossip-viz', importFn);
      const load2 = loader.loadModule('gossip-viz', importFn);

      expect(loader.isLoading('gossip-viz')).toBe(true);

      resolveFn({ vizActive: true });

      const [res1, res2] = await Promise.all([load1, load2]);
      expect(res1).toEqual({ vizActive: true });
      expect(res2).toEqual({ vizActive: true });
      expect(importFn).toHaveBeenCalledTimes(1);
      expect(loader.isLoaded('gossip-viz')).toBe(true);
    });

    it('should handle import rejection and record error state gracefully', async () => {
      const importFn = vi.fn().mockRejectedValue(new Error('Network offline or 404 chunk'));

      const events: string[] = [];
      loader.subscribe((e) => events.push(`${e.name}:${e.status}`));

      await expect(loader.loadModule('stories', importFn)).rejects.toThrow('Network offline or 404 chunk');

      expect(loader.isLoaded('stories')).toBe(false);
      expect(loader.isLoading('stories')).toBe(false);

      const mod = loader.getModule('stories');
      expect(mod?.error).toBe('Network offline or 404 chunk');
      expect(events).toContain('stories:loading');
      expect(events).toContain('stories:error');
    });

    it('should auto-register unregistered module names upon loadModule invocation', async () => {
      const dummyObj = { custom: true };
      const res = await loader.loadModule('new-unregistered-chunk', async () => dummyObj);

      expect(res).toEqual(dummyObj);
      expect(loader.isLoaded('new-unregistered-chunk')).toBe(true);
      expect(loader.getModule('new-unregistered-chunk')).toBeDefined();
    });
  });

  // ─── 4. IDLE PRELOADING & SCHEDULING ────────────────────────────────────────

  describe('4. Idle Preloading & Scheduling Mechanisms', () => {
    it('should handle preloadOnIdle with requestIdleCallback / timer fallback', async () => {
      const mockMod1 = { id: 'dsp' };
      const mockMod2 = { id: 'media' };

      const fn1 = vi.fn().mockResolvedValue(mockMod1);
      const fn2 = vi.fn().mockResolvedValue(mockMod2);

      loader.preloadOnIdle(['audio-dsp', 'media-player'], [fn1, fn2]);

      // Wait for async task execution
      await new Promise((r) => setTimeout(r, 450));

      expect(loader.isLoaded('audio-dsp')).toBe(true);
      expect(loader.isLoaded('media-player')).toBe(true);
      expect(loader.isPreloaded('audio-dsp')).toBe(true);
      expect(loader.isPreloaded('media-player')).toBe(true);
    });

    it('should warn and skip when array lengths in preloadOnIdle mismatch', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      loader.preloadOnIdle(['audio-dsp'], []);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  // ─── 5. CRITICAL SUBSYSTEM INITIALIZATION & PROGRESSIVE LOADER ─────────────

  describe('5. Critical Initialization & Progressive Loader', () => {
    it('should initialize critical modules with progress tracking', async () => {
      const mockCore = { name: 'core-kernel' };
      const mockState = { name: 'client-state-db' };

      const descriptors: ModuleDescriptor[] = [
        { name: 'app-core', importFn: vi.fn().mockResolvedValue(mockCore), sizeEstimateKB: 120, category: 'critical' },
        { name: 'client-state', importFn: vi.fn().mockResolvedValue(mockState), sizeEstimateKB: 95, category: 'critical' },
      ];

      await loader.initCriticalModules(descriptors);

      expect(loader.criticalModulesLoaded).toBe(true);
      expect(loader.progressiveProgress).toBe(60);
      expect(loader.currentStatusText).toContain('Critical subsystem ready');
      expect(loader.isLoaded('app-core')).toBe(true);
      expect(loader.isLoaded('client-state')).toBe(true);
    });

    it('should handle functional promises in initCriticalModules', async () => {
      let executed = false;
      const criticalFn = async () => {
        executed = true;
        return { ok: true };
      };

      await loader.initCriticalModules([criticalFn]);
      expect(executed).toBe(true);
      expect(loader.criticalModulesLoaded).toBe(true);
    });

    it('should catch critical initialization failures and update status text', async () => {
      const failingDescriptor: ModuleDescriptor = {
        name: 'failing-core',
        importFn: vi.fn().mockRejectedValue(new Error('Corrupted sovereign binary')),
        sizeEstimateKB: 100,
        category: 'critical',
      };

      await expect(loader.initCriticalModules([failingDescriptor])).rejects.toThrow('Corrupted sovereign binary');
      expect(loader.criticalModulesLoaded).toBe(false);
      expect(loader.currentStatusText).toContain('encountered an alert');
    });

    it('should schedule non-critical modules with deferred execution', async () => {
      const nonCriticalDescriptors: ModuleDescriptor[] = [
        { name: 'slide-deck', importFn: vi.fn().mockResolvedValue({}), sizeEstimateKB: 36, category: 'interactive' },
        { name: 'analytics-widget', importFn: vi.fn().mockResolvedValue({}), sizeEstimateKB: 32, category: 'background' },
      ];

      loader.scheduleNonCritical(nonCriticalDescriptors);
      expect(loader.getModule('slide-deck')).toBeDefined();
      expect(loader.getModule('analytics-widget')).toBeDefined();
    });
  });

  // ─── 6. BUNDLE TELEMETRY DYNAMICS ───────────────────────────────────────────

  describe('6. Bundle Statistics & Metrics Accuracy', () => {
    it('should accurately re-calculate savings as modules are dynamically loaded', async () => {
      const initial = loader.getDetailedBundleStats();
      expect(initial.totalLoaded).toBe(0);
      expect(initial.loadedSizeKB).toBe(0);
      expect(initial.estimatedSavedKB).toBe(944);

      // Load app-core (120 KB)
      await loader.loadModule('app-core', async () => ({}));

      const afterCore = loader.getDetailedBundleStats();
      expect(afterCore.totalLoaded).toBe(1);
      expect(afterCore.loadedSizeKB).toBe(120);
      expect(afterCore.estimatedSavedKB).toBe(944 - 120);

      // Load rich-editor (72 KB)
      await loader.loadModule('rich-editor', async () => ({}));

      const afterEditor = loader.getDetailedBundleStats();
      expect(afterEditor.totalLoaded).toBe(2);
      expect(afterEditor.loadedSizeKB).toBe(192);
      expect(afterEditor.estimatedSavedKB).toBe(944 - 192);
    });
  });

  // ─── 7. HTML RENDERING & DASHBOARD COMPONENTS ───────────────────────────────

  describe('7. HTML UI Widgets & Dashboard Rendering', () => {
    it('should render loading spinner with neon glow and module metadata', () => {
      const html = loader.renderLoadingSpinner('spatial-audio');

      expect(html).toContain('spatial-audio');
      expect(html).toContain('Loading Module');
      expect(html).toContain('~42 KB payload');
      expect(html).toContain('heavy');
      expect(html).toContain('Decompressing dynamic bytecode bundle...');
      expect(html).toContain('bg-surface-base');
    });

    it('should render bundle stats footer widget with correct metric strings', () => {
      const html = loader.renderBundleStatsWidget();

      expect(html).toContain('id="bundle-stats-widget"');
      expect(html).toContain('16 modules lazy');
      expect(html).toContain('Saved ~944 KB initial');
      expect(html).toContain('0 preloaded');
      expect(html).toContain('toggleBundleManagerModal');
      expect(html).toContain('bg-surface-base');
    });

    it('should render progressive splash screen loader with progress bar and percent', () => {
      loader.progressiveProgress = 65;
      loader.currentStatusText = 'Mounting ZK Proof Vault...';

      const html = loader.renderProgressiveLoader();

      expect(html).toContain('id="progressive-splash-loader"');
      expect(html).toContain('65%');
      expect(html).toContain('style="width: 65%;"');
      expect(html).toContain('Mounting ZK Proof Vault...');
      expect(html).toContain('16 modules');
      expect(html).toContain('Zero Main-Thread Jitter');
    });

    it('should render complete module management dashboard with table rows and force load triggers', () => {
      const html = loader.renderModuleListDashboard();

      expect(html).toContain('id="bundle-manager-modal"');
      expect(html).toContain('Bundle Telemetry');
      expect(html).toContain('16'); // Registered chunks
      expect(html).toContain('~944'); // Initial saved KB
      expect(html).toContain('app-core');
      expect(html).toContain('client-state');
      expect(html).toContain('Force Load');
      expect(html).toContain('Lazy Standby');
    });
  });
});
