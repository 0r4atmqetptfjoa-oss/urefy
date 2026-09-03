import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ViewTransitionManager,
  viewTransitions,
  type TransitionType,
  type TransitionEvent,
  type ViewTransitionMetrics,
} from '../src/view-transitions.js';

describe('View Transitions API & Fluid Screen Animation Engine', () => {
  let manager: ViewTransitionManager;

  beforeEach(() => {
    manager = new ViewTransitionManager();
    // Clear localStorage simulation if present
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 1. INITIALIZATION & DEFAULT CONFIGURATION ─────────────────────────────

  describe('1. Default Initialization State', () => {
    it('should initialize with canonical Aetheris default values', () => {
      expect(manager.currentView).toBe('feed');
      expect(manager.transitionHistory).toEqual(['feed']);
      expect(manager.defaultDuration).toBe(250);
      expect(manager.enabled).toBe(true);
      expect(manager.defaultType).toBe('fade');
      expect(manager.respectReducedMotion).toBe(true);
      expect(manager.getHistory()).toEqual(['feed']);

      const metrics: ViewTransitionMetrics = manager.getMetrics();
      expect(metrics.totalTransitions).toBe(0);
      expect(metrics.totalDurationMs).toBe(0);
      expect(metrics.averageDurationMs).toBe(0);
      expect(metrics.lastTransitionTimestamp).toBeNull();
      expect(metrics.lastType).toBeNull();
      expect(metrics.nativeSuccessCount).toBe(0);
      expect(metrics.fallbackCount).toBe(0);
      expect(metrics.historyLength).toBe(1);
    });

    it('should export singleton instance viewTransitions correctly', () => {
      expect(viewTransitions).toBeInstanceOf(ViewTransitionManager);
      expect(viewTransitions.currentView).toBeDefined();
      expect(typeof viewTransitions.transitionTo).toBe('function');
    });
  });

  // ─── 2. CONFIGURATION, GETTERS & SETTERS ────────────────────────────────────

  describe('2. Configuration & Parameter Clamping', () => {
    it('should set and get duration properly within valid range [50, 1000]', () => {
      manager.setDuration(150);
      expect(manager.getDuration()).toBe(150);
      expect(manager.defaultDuration).toBe(150);

      manager.setDuration(400);
      expect(manager.getDuration()).toBe(400);

      // Clamp lower bound to 50
      manager.setDuration(10);
      expect(manager.getDuration()).toBe(50);

      // Clamp upper bound to 1000
      manager.setDuration(5000);
      expect(manager.getDuration()).toBe(1000);
    });

    it('should toggle enabled state properly', () => {
      expect(manager.isEnabled()).toBe(true);

      manager.setEnabled(false);
      expect(manager.isEnabled()).toBe(false);
      expect(manager.enabled).toBe(false);

      manager.setEnabled(true);
      expect(manager.isEnabled()).toBe(true);
      expect(manager.enabled).toBe(true);
    });

    it('should set and get default transition type', () => {
      const types: TransitionType[] = [
        'slide-left',
        'slide-right',
        'fade',
        'zoom-in',
        'zoom-out',
        'slide-up',
        'slide-down',
        'flip',
        'none',
      ];

      for (const t of types) {
        manager.setDefaultType(t);
        expect(manager.getDefaultType()).toBe(t);
        expect(manager.defaultType).toBe(t);
      }
    });

    it('should toggle respectReducedMotion setting', () => {
      manager.setRespectReducedMotion(false);
      expect(manager.respectReducedMotion).toBe(false);

      manager.setRespectReducedMotion(true);
      expect(manager.respectReducedMotion).toBe(true);
    });

    it('should detect prefers-reduced-motion correctly with matchMedia mocking', () => {
      // In node without window.matchMedia -> returns false
      expect(manager.prefersReducedMotion()).toBe(false);

      // Mock window.matchMedia
      const originalWindow = globalThis.window;
      globalThis.window = {
        matchMedia: vi.fn().mockImplementation((query: string) => ({
          matches: query.includes('reduce'),
          media: query,
        })),
      } as unknown as Window & typeof globalThis;

      expect(manager.prefersReducedMotion()).toBe(true);

      // Restore
      globalThis.window = originalWindow;
    });

    it('should persist and load configuration from localStorage', () => {
      const mockStorage: Record<string, string> = {};
      const originalLocalStorage = globalThis.localStorage;

      globalThis.localStorage = {
        getItem: vi.fn((key: string) => mockStorage[key] || null),
        setItem: vi.fn((key: string, val: string) => {
          mockStorage[key] = val;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          for (const k in mockStorage) delete mockStorage[k];
        }),
        length: 0,
        key: vi.fn(() => null),
      } as unknown as Storage;

      manager.setEnabled(false);
      manager.setDuration(400);
      manager.setDefaultType('slide-up');
      manager.setRespectReducedMotion(false);

      // Create new manager to verify loadSettings from storage
      const newManager = new ViewTransitionManager();
      expect(newManager.enabled).toBe(false);
      expect(newManager.defaultDuration).toBe(400);
      expect(newManager.defaultType).toBe('slide-up');
      expect(newManager.respectReducedMotion).toBe(false);

      globalThis.localStorage = originalLocalStorage;
    });
  });

  // ─── 3. TRANSITION EXECUTION & EVENT DISPATCHING ────────────────────────────

  describe('3. Transition Execution, History Tracking & Event Notification', () => {
    it('should execute instant transition when transitions are disabled', async () => {
      manager.setEnabled(false);

      let renderCalled = false;
      const renderFn = () => {
        renderCalled = true;
      };

      const events: TransitionEvent[] = [];
      manager.addListener((e) => events.push(e));

      await manager.transitionTo('channel:crypto-core', renderFn, 'slide-left');

      expect(renderCalled).toBe(true);
      expect(manager.currentView).toBe('channel:crypto-core');
      expect(manager.getHistory()).toEqual(['feed', 'channel:crypto-core']);
      expect(events.length).toBe(1);
      expect(events[0]).toMatchObject({
        fromView: 'feed',
        toView: 'channel:crypto-core',
        type: 'none',
        duration: 0,
        isNative: false,
        success: true,
      });
    });

    it('should execute instant transition when transition type is "none"', async () => {
      let renderExecuted = false;
      const renderFn = async () => {
        renderExecuted = true;
      };

      await manager.transitionTo('settings', renderFn, 'none');

      expect(renderExecuted).toBe(true);
      expect(manager.currentView).toBe('settings');
      expect(manager.getHistory()).toEqual(['feed', 'settings']);
    });

    it('should execute transition and record fallback metrics in Node environment', async () => {
      manager.isSupported = false; // ensure fallback path

      let executed = false;
      const renderFn = () => {
        executed = true;
      };

      const events: TransitionEvent[] = [];
      const unsubscribe = manager.addListener((e) => events.push(e));

      await manager.transitionTo('vault', renderFn, 'fade');

      expect(executed).toBe(true);
      expect(manager.currentView).toBe('vault');
      expect(manager.getHistory()).toEqual(['feed', 'vault']);
      expect(events.length).toBe(1);
      expect(events[0].toView).toBe('vault');
      expect(events[0].type).toBe('fade');

      const metrics = manager.getMetrics();
      expect(metrics.totalTransitions).toBe(1);
      expect(metrics.fallbackCount).toBe(1);
      expect(metrics.nativeSuccessCount).toBe(0);
      expect(metrics.totalDurationMs).toBe(250);
      expect(metrics.lastType).toBe('fade');

      // Unsubscribe test
      unsubscribe();
      await manager.transitionTo('pulse', () => {});
      expect(events.length).toBe(1); // not called after unsubscribe
    });

    it('should execute native transition branch when startViewTransition is available', async () => {
      manager.isSupported = true;

      // Mock document and documentElement
      const fakeStyle = {
        setProperty: vi.fn(),
        removeProperty: vi.fn(),
      };
      const fakeClassList = {
        add: vi.fn(),
        remove: vi.fn(),
      };

      let startVTCalled = false;
      const mockDocument = {
        documentElement: {
          style: fakeStyle,
          classList: fakeClassList,
        },
        startViewTransition: vi.fn((cb: () => Promise<void> | void) => {
          startVTCalled = true;
          cb();
          return {
            finished: Promise.resolve(),
            ready: Promise.resolve(),
            updateCallbackDone: Promise.resolve(),
            skipTransition: vi.fn(),
          };
        }),
      };

      const originalDoc = globalThis.document;
      globalThis.document = mockDocument as unknown as Document;

      let renderCalled = false;
      await manager.transitionTo('relays', () => {
        renderCalled = true;
      }, 'zoom-in');

      expect(startVTCalled).toBe(true);
      expect(renderCalled).toBe(true);
      expect(manager.currentView).toBe('relays');

      const metrics = manager.getMetrics();
      expect(metrics.nativeSuccessCount).toBe(1);
      expect(metrics.fallbackCount).toBe(0);

      globalThis.document = originalDoc;
    });

    it('should cap transition history at 50 entries', async () => {
      manager.setEnabled(false); // Fast instant transitions

      for (let i = 1; i <= 60; i++) {
        await manager.transitionTo(`view-${i}`, () => {});
      }

      const history = manager.getHistory();
      expect(history.length).toBe(50);
      expect(history[0]).toBe('view-11');
      expect(history[49]).toBe('view-60');

      // Clear history
      manager.clearHistory();
      expect(manager.getHistory()).toEqual(['view-60']);
      expect(manager.getMetrics().historyLength).toBe(1);
    });

    it('should safely catch errors in transition listeners without breaking execution', async () => {
      manager.setEnabled(false);

      const faultyListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener crashed');
      });
      const goodListener = vi.fn();

      manager.addListener(faultyListener);
      manager.addListener(goodListener);

      await expect(manager.transitionTo('safe-view', () => {})).resolves.not.toThrow();

      expect(faultyListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
      expect(manager.currentView).toBe('safe-view');

      manager.removeListener(faultyListener);
      manager.removeListener(goodListener);
    });
  });

  // ─── 4. SPECIALIZED NAVIGATION SHORTCUTS ────────────────────────────────────

  describe('4. Specialized View Transition Helpers', () => {
    beforeEach(() => {
      manager.setEnabled(false);
    });

    it('should handle channelSwitch with "slide-left" lateral transition', async () => {
      let switched = false;
      await manager.channelSwitch('mesh-core', () => {
        switched = true;
      });

      expect(switched).toBe(true);
      expect(manager.currentView).toBe('channel:mesh-core');
    });

    it('should handle modalOpen and modalClose with zoom animations', async () => {
      let modalOpened = false;
      await manager.modalOpen(() => {
        modalOpened = true;
      });
      expect(modalOpened).toBe(true);
      expect(manager.currentView).toBe('modal-overlay-open');

      let modalClosed = false;
      await manager.modalClose(() => {
        modalClosed = true;
      });
      expect(modalClosed).toBe(true);
      expect(manager.currentView).toBe('modal-overlay-close');
    });

    it('should handle tabSwitch with fade transition', async () => {
      let tabSwitched = false;
      await manager.tabSwitch('vault', () => {
        tabSwitched = true;
      });
      expect(tabSwitched).toBe(true);
      expect(manager.currentView).toBe('tab:vault');
    });

    it('should handle spaceSwitch with slide-up transition', async () => {
      let spaceSwitched = false;
      await manager.spaceSwitch('pulse', () => {
        spaceSwitched = true;
      });
      expect(spaceSwitched).toBe(true);
      expect(manager.currentView).toBe('space:pulse');
    });

    it('should handle back() navigation correctly through history stack', async () => {
      await manager.transitionTo('view-1', () => {});
      await manager.transitionTo('view-2', () => {});
      await manager.transitionTo('view-3', () => {});

      expect(manager.currentView).toBe('view-3');

      // Go back to view-2
      let backRendered = false;
      await manager.back(() => {
        backRendered = true;
      });
      expect(backRendered).toBe(true);
      expect(manager.currentView).toBe('view-2');
    });
  });

  // ─── 5. HTML RENDERING & DOM COMPONENT INTEGRATION ──────────────────────────

  describe('5. HTML Template Rendering & Style Injection', () => {
    it('should render complete settings widget with Tailwind dark theme classes', () => {
      manager.setDuration(250);
      const html = manager.renderTransitionSettingsWidget();

      expect(html).toContain('id="aetheris-vt-settings-widget"');
      expect(html).toContain('Fluid Animations & Transitions');
      expect(html).toContain('id="aether-vt-toggle"');
      expect(html).toContain('id="aether-vt-duration-display"');
      expect(html).toContain('250ms');
      expect(html).toContain('data-vt-preset="150"');
      expect(html).toContain('data-vt-preset="250"');
      expect(html).toContain('data-vt-preset="400"');
      expect(html).toContain('data-vt-test="slide-left"');
      expect(html).toContain('data-vt-test="slide-right"');
      expect(html).toContain('data-vt-test="fade"');
      expect(html).toContain('data-vt-test="zoom-in"');
      expect(html).toContain('data-vt-test="zoom-out"');
      expect(html).toContain('id="aether-vt-demo-canvas"');
      expect(html).toContain('bg-surface-raised');
      expect(html).toContain('bg-surface-base');
      expect(html).toContain('text-cyphr');
    });

    it('should inject dynamic CSS rules and keyframes into document head', () => {
      const appendedElements: HTMLElement[] = [];
      const mockHead = {
        appendChild: vi.fn((el: HTMLElement) => {
          appendedElements.push(el);
          return el;
        }),
      };

      const originalDoc = globalThis.document;
      globalThis.document = {
        getElementById: vi.fn(() => null),
        createElement: vi.fn((tag: string) => {
          const el = { tagName: tag.toUpperCase(), id: '', textContent: '' } as unknown as HTMLElement;
          return el;
        }),
        head: mockHead,
      } as unknown as Document;

      manager.injectTransitionStyles();

      expect(mockHead.appendChild).toHaveBeenCalled();
      expect(appendedElements.length).toBe(1);
      expect(appendedElements[0].id).toBe('aetheris-view-transitions-styles');
      expect(appendedElements[0].textContent).toContain('::view-transition-old(root)');
      expect(appendedElements[0].textContent).toContain('aether-slide-left-in');
      expect(appendedElements[0].textContent).toContain('prefers-reduced-motion');

      globalThis.document = originalDoc;
    });

    it('should test testTransition demo execution', async () => {
      manager.setEnabled(false);
      await expect(manager.testTransition('zoom-in')).resolves.not.toThrow();
      expect(manager.currentView).toContain('demo-zoom-in-');
    });
  });
});
