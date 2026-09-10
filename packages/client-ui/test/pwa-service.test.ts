import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PWAService,
  pwaService,
  type BeforeInstallPromptEvent,
  type WebManifest,
  type PWAEngineState,
} from '../src/pwa-service.js';

describe('UREfy Progressive Web App (PWAService)', () => {
  let listenersMap: Map<string, Array<(event: any) => void>>;
  let mockMatchMedia: ReturnType<typeof vi.fn>;
  let mockDocumentHeadChildren: HTMLElement[];
  let originalOnLine: boolean;

  beforeEach(() => {
    listenersMap = new Map();
    mockDocumentHeadChildren = [];
    originalOnLine = globalThis.navigator?.onLine ?? true;

    // Mock matchMedia
    mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Mock window & document
    const mockWindow: any = {
      matchMedia: mockMatchMedia,
      addEventListener: (type: string, listener: any) => {
        if (!listenersMap.has(type)) {
          listenersMap.set(type, []);
        }
        listenersMap.get(type)!.push(listener);
      },
      removeEventListener: (type: string, listener: any) => {
        const arr = listenersMap.get(type) || [];
        listenersMap.set(
          type,
          arr.filter(l => l !== listener)
        );
      },
      dispatchEvent: (event: Event) => {
        const handlers = listenersMap.get(event.type) || [];
        handlers.forEach(h => h(event));
        return true;
      },
    };

    const mockDocument: any = {
      head: {
        appendChild: (el: HTMLElement) => {
          mockDocumentHeadChildren.push(el);
          return el;
        },
      },
      querySelector: (selector: string) => {
        if (selector.startsWith('link[rel="manifest"]')) {
          return mockDocumentHeadChildren.find(el => (el as any).rel === 'manifest') || null;
        }
        if (selector.startsWith('meta[name=')) {
          const match = selector.match(/meta\[name="([^"]+)"\]/);
          if (match) {
            const name = match[1];
            return mockDocumentHeadChildren.find(el => (el as any).name === name) || null;
          }
        }
        return null;
      },
      createElement: (tagName: string) => {
        const el: any = {
          tagName: tagName.toUpperCase(),
          setAttribute: (k: string, v: string) => {
            el[k] = v;
          },
          getAttribute: (k: string) => el[k] || null,
          classList: {
            add: vi.fn(),
            remove: vi.fn(),
          },
          remove: vi.fn(),
        };
        return el;
      },
      getElementById: vi.fn(() => null),
      addEventListener: vi.fn(),
    };

    (globalThis as any).window = mockWindow;
    (globalThis as any).document = mockDocument;

    // Define navigator properties safely on globalThis.navigator
    if (globalThis.navigator) {
      Object.defineProperty(globalThis.navigator, 'onLine', {
        value: true,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis.navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue({
            addEventListener: vi.fn(),
            active: { state: 'activated' },
          }),
        },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis.navigator, 'standalone', {
        value: undefined,
        configurable: true,
        writable: true,
      });
    }

    if (typeof URL.createObjectURL !== 'function') {
      (URL as any).createObjectURL = vi.fn(() => 'blob:https://aetheris.local/manifest-blob-uuid');
    }
    if (typeof URL.revokeObjectURL !== 'function') {
      (URL as any).revokeObjectURL = vi.fn();
    }

    const mockCache = {
      put: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true),
    };
    (globalThis as any).caches = {
      open: vi.fn().mockResolvedValue(mockCache),
      keys: vi.fn().mockResolvedValue(['aetheris-omni-core-v1', 'aetheris-omni-dynamic-v1']),
      delete: vi.fn().mockResolvedValue(true),
    };

    (globalThis as any).CustomEvent = class CustomEvent<T = any> {
      type: string;
      detail: T;
      constructor(type: string, params?: { detail?: T }) {
        this.type = type;
        this.detail = params?.detail as T;
      }
    };
  });

  afterEach(() => {
    if (globalThis.navigator) {
      Object.defineProperty(globalThis.navigator, 'onLine', {
        value: originalOnLine,
        configurable: true,
        writable: true,
      });
    }
    vi.restoreAllMocks();
  });

  // ─── 1. WEB MANIFEST GENERATION ────────────────────────────────────────────

  describe('1. Web App Manifest Generation (generateWebManifest)', () => {
    it('registers the static same-origin worker without duplicate concurrent registrations', async () => {
      const service = new PWAService();
      await service.register();
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
      expect(navigator.serviceWorker.register).toHaveBeenCalledTimes(1);
      expect(service.getState().swStatus).toBe('active');
    });

    it('reports registration errors instead of claiming offline support is active', async () => {
      vi.mocked(navigator.serviceWorker.register).mockRejectedValue(new Error('Registration denied'));
      const service = new PWAService();
      await service.register();
      expect(service.getState().swStatus).toBe('error');
      expect(service.swRegistration).toBeNull();
    });

    it('reports an unregistered worker when the browser has no service worker support', async () => {
      delete (navigator as any).serviceWorker;
      const service = new PWAService();
      await service.register();
      expect(service.getState().swStatus).toBe('unregistered');
    });

    it('should generate a compliant W3C Web App Manifest with required metadata', () => {
      const service = new PWAService();
      const manifest: WebManifest = service.generateWebManifest();

      // Required Core Fields
      expect(manifest.name).toBe('UREfy — Unified Relay Enclave Framework for You');
      expect(manifest.short_name).toBe('UREfy');
      expect(manifest.description).toContain('Decentralized Sovereign Intelligence');
      expect(manifest.start_url).toBe('/');
      expect(manifest.scope).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.orientation).toBe('any');
      expect(manifest.theme_color).toBe('#00e5ff');
      expect(manifest.background_color).toBe('#090a0f');
      expect(manifest.lang).toBe('en-US');
      expect(manifest.dir).toBe('ltr');
      expect(manifest.prefer_related_applications).toBe(false);
      expect(manifest.categories).toEqual(['social', 'productivity', 'security']);
    });

    it('should include compliant 192x192 and 512x512 SVG icons in manifest', () => {
      const service = new PWAService();
      const manifest = service.generateWebManifest();

      expect(manifest.icons.length).toBe(2);

      const icon192 = manifest.icons.find(i => i.sizes === '192x192');
      expect(icon192).toBeDefined();
      expect(icon192?.type).toBe('image/svg+xml');
      expect(icon192?.purpose).toBe('any');
      expect(icon192?.src).toContain('data:image/svg+xml');

      const icon512 = manifest.icons.find(i => i.sizes === '512x512');
      expect(icon512).toBeDefined();
      expect(icon512?.type).toBe('image/svg+xml');
      expect(icon512?.purpose).toBe('maskable');
      expect(icon512?.src).toContain('data:image/svg+xml');
    });

    it('should configure shortcuts for Relays and Vault spaces in manifest', () => {
      const service = new PWAService();
      const manifest = service.generateWebManifest();

      expect(manifest.shortcuts.length).toBe(2);

      const relaysShortcut = manifest.shortcuts.find(s => s.name === 'ZK Relays Pulse');
      expect(relaysShortcut).toBeDefined();
      expect(relaysShortcut?.short_name).toBe('Relays');
      expect(relaysShortcut?.url).toBe('/#relays');

      const vaultShortcut = manifest.shortcuts.find(s => s.name === 'Sovereign Vault');
      expect(vaultShortcut).toBeDefined();
      expect(vaultShortcut?.short_name).toBe('Vault');
      expect(vaultShortcut?.url).toBe('/#vault');
    });
  });

  // ─── 2. INSTALLABILITY DETECTION & PROMPT ──────────────────────────────────

  describe('2. Installability Detection & Native Prompt (detectInstallability & promptInstall)', () => {
    it('should detect when app is already running in standalone display mode', () => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query.includes('standalone'),
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const service = new PWAService();
      service.detectInstallability();

      expect(service.isInstalled).toBe(true);
      expect(service.isInstallable).toBe(false);
    });

    it('should detect when app is running in iOS standalone mode', () => {
      Object.defineProperty(globalThis.navigator, 'standalone', {
        value: true,
        configurable: true,
        writable: true,
      });

      const service = new PWAService();
      service.detectInstallability();

      expect(service.isInstalled).toBe(true);
      expect(service.isInstallable).toBe(false);
    });

    it('should capture beforeinstallprompt event and flag app as installable', () => {
      const service = new PWAService();
      service.detectInstallability();

      const preventDefaultMock = vi.fn();
      const mockPromptEvent: Partial<BeforeInstallPromptEvent> = {
        type: 'beforeinstallprompt',
        preventDefault: preventDefaultMock,
        platforms: ['web'],
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      };

      const handlers = listenersMap.get('beforeinstallprompt') || [];
      handlers.forEach(h => h(mockPromptEvent));

      expect(preventDefaultMock).toHaveBeenCalled();
      expect(service.isInstallable).toBe(true);
      expect(service.isInstalled).toBe(false);
      expect(service.deferredInstallPrompt).toBe(mockPromptEvent);
    });

    it('should handle appinstalled event and update installation state', () => {
      const service = new PWAService();
      service.detectInstallability();

      const handlers = listenersMap.get('appinstalled') || [];
      handlers.forEach(h => h(new Event('appinstalled')));

      expect(service.isInstalled).toBe(true);
      expect(service.isInstallable).toBe(false);
      expect(service.deferredInstallPrompt).toBeNull();
      expect(service.getState().installOutcome).toBe('accepted');
    });

    it('should prompt user and return true when installation is accepted', async () => {
      const service = new PWAService();
      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const mockPromptEvent: Partial<BeforeInstallPromptEvent> = {
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      };

      service.deferredInstallPrompt = mockPromptEvent as BeforeInstallPromptEvent;
      service.isInstallable = true;

      const accepted = await service.promptInstall();
      expect(accepted).toBe(true);
      expect(mockPrompt).toHaveBeenCalled();
      expect(service.isInstalled).toBe(true);
      expect(service.isInstallable).toBe(false);
      expect(service.deferredInstallPrompt).toBeNull();
    });

    it('should return false when user dismisses the install prompt', async () => {
      const service = new PWAService();
      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const mockPromptEvent: Partial<BeforeInstallPromptEvent> = {
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
      };

      service.deferredInstallPrompt = mockPromptEvent as BeforeInstallPromptEvent;
      service.isInstallable = true;

      const accepted = await service.promptInstall();
      expect(accepted).toBe(false);
      expect(mockPrompt).toHaveBeenCalled();
      expect(service.getState().installOutcome).toBe('dismissed');
    });

    it('should return true on promptInstall if already installed even without prompt event', async () => {
      const service = new PWAService();
      service.isInstalled = true;
      service.deferredInstallPrompt = null;

      const result = await service.promptInstall();
      expect(result).toBe(true);
    });

    it('should return false on promptInstall if neither prompt nor installed state exists', async () => {
      const service = new PWAService();
      service.isInstalled = false;
      service.deferredInstallPrompt = null;

      const result = await service.promptInstall();
      expect(result).toBe(false);
    });
  });

  // ─── 3. ONLINE / OFFLINE STATUS DETECTION ──────────────────────────────────

  describe('3. Network Status Detection (detectOnlineStatus)', () => {
    it('should initialize online status from navigator.onLine', () => {
      Object.defineProperty(globalThis.navigator, 'onLine', {
        value: true,
        configurable: true,
        writable: true,
      });
      const serviceOnline = new PWAService();
      expect(serviceOnline.isOnline).toBe(true);

      Object.defineProperty(globalThis.navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true,
      });
      const serviceOffline = new PWAService();
      expect(serviceOffline.isOnline).toBe(false);
    });

    it('should react to window offline and online events', () => {
      Object.defineProperty(globalThis.navigator, 'onLine', {
        value: true,
        configurable: true,
        writable: true,
      });
      const service = new PWAService();
      service.detectOnlineStatus();

      expect(service.isOnline).toBe(true);

      // Trigger offline event
      const offlineHandlers = listenersMap.get('offline') || [];
      offlineHandlers.forEach(h => h(new Event('offline')));
      expect(service.isOnline).toBe(false);
      expect(service.getState().isOnline).toBe(false);

      // Trigger online event
      const onlineHandlers = listenersMap.get('online') || [];
      onlineHandlers.forEach(h => h(new Event('online')));
      expect(service.isOnline).toBe(true);
      expect(service.getState().isOnline).toBe(true);
    });
  });

  // ─── 4. MANIFEST LINK & META HEADERS INJECTION ─────────────────────────────

  describe('4. Manifest & Meta Tag Injection (injectManifestLink)', () => {
    it('should create link[rel="manifest"] and apple mobile meta tags in document head', () => {
      const service = new PWAService();
      service.injectManifestLink();

      expect(mockDocumentHeadChildren.length).toBeGreaterThanOrEqual(5);

      const manifestLink = mockDocumentHeadChildren.find(el => (el as any).rel === 'manifest');
      expect(manifestLink).toBeDefined();
      expect((manifestLink as any).href).toBe('/manifest.json');

      const themeColorMeta = mockDocumentHeadChildren.find(el => (el as any).name === 'theme-color');
      expect(themeColorMeta).toBeDefined();
      expect((themeColorMeta as any).content).toBe('#00e5ff');

      const appleCapableMeta = mockDocumentHeadChildren.find(
        el => (el as any).name === 'apple-mobile-web-app-capable'
      );
      expect(appleCapableMeta).toBeDefined();
      expect((appleCapableMeta as any).content).toBe('yes');

      const appleStatusMeta = mockDocumentHeadChildren.find(
        el => (el as any).name === 'apple-mobile-web-app-status-bar-style'
      );
      expect(appleStatusMeta).toBeDefined();
      expect((appleStatusMeta as any).content).toBe('black-translucent');

      const appleTitleMeta = mockDocumentHeadChildren.find(
        el => (el as any).name === 'apple-mobile-web-app-title'
      );
      expect(appleTitleMeta).toBeDefined();
      expect((appleTitleMeta as any).content).toBe('UREfy');
    });
  });

  // ─── 5. UI RENDERING: INSTALL BANNER ───────────────────────────────────────

  describe('5. UI Rendering: Install Banner (renderInstallBanner)', () => {
    it('should render the install banner with cyber styling and action triggers', () => {
      const service = new PWAService();
      service.isInstalled = false;

      const html = service.renderInstallBanner();

      expect(html).toContain('id="aetheris-pwa-install-banner"');
      expect(html).toContain('PWA Ready');
      expect(html).toContain('Install UREfy');
      expect(html).toContain('data-action="pwa-dismiss"');
      expect(html).toContain('data-action="pwa-install"');
      expect(html).toContain('bg-surface-raised/95');
      expect(html).toContain('border-cyphr/40');
    });

    it('should return empty string when app is already installed', () => {
      const service = new PWAService();
      service.isInstalled = true;

      const html = service.renderInstallBanner();
      expect(html).toBe('');
    });

    it('should return empty string when banner has been dismissed', () => {
      const service = new PWAService();
      service.isInstalled = false;
      service.dismissInstallBanner();

      const html = service.renderInstallBanner();
      expect(html).toBe('');
    });
  });

  // ─── 6. UI RENDERING: OFFLINE BADGE ────────────────────────────────────────

  describe('6. UI Rendering: Offline Badge (renderOfflineBadge)', () => {
    it('should render online badge with signal green styling when online', () => {
      const service = new PWAService();
      service.isOnline = true;

      const html = service.renderOfflineBadge();

      expect(html).toContain('id="aetheris-network-badge"');
      expect(html).toContain('ONLINE • MATRIX ACTIVE');
      expect(html).toContain('bg-signal/10');
      expect(html).toContain('text-signal');
      expect(html).toContain('border-signal/20');
      expect(html).not.toContain('animate-pulse');
    });

    it('should render offline badge with crimson styling and pulse animation when offline', () => {
      const service = new PWAService();
      service.isOnline = false;

      const html = service.renderOfflineBadge();

      expect(html).toContain('id="aetheris-network-badge"');
      expect(html).toContain('OFFLINE • CACHE ACTIVE');
      expect(html).toContain('bg-crimson/15');
      expect(html).toContain('text-crimson');
      expect(html).toContain('border-crimson/30');
      expect(html).toContain('animate-pulse');
    });
  });

  // ─── 7. UI RENDERING: PWA STATUS WIDGET ────────────────────────────────────

  describe('7. UI Rendering: PWA Status Widget (renderPWAStatusWidget)', () => {
    it('should render the full PWA status widget with SW metrics and management buttons', () => {
      const service = new PWAService();
      service.isOnline = true;
      service.isInstalled = false;
      service.isInstallable = true;

      const html = service.renderPWAStatusWidget();

      expect(html).toContain('id="aetheris-pwa-status-widget"');
      expect(html).toContain('PWA & Offline Cache Engine');
      expect(html).toContain('Service Worker v1.0 • Cache Stale-While-Revalidate');
      expect(html).toContain('Application Mode');
      expect(html).toContain('Browser Web Client');
      expect(html).toContain('Sovereign Network Status');
      expect(html).toContain('Online (Mesh Synchronized)');
      expect(html).toContain('Local Cache Footprint');
      expect(html).toContain('Last Cache Sync');
      expect(html).toContain('data-action="pwa-check-update"');
      expect(html).toContain('data-action="pwa-clear-cache"');
      expect(html).toContain('data-action="pwa-install"');
    });

    it('should render standalone native badge when installed', () => {
      const service = new PWAService();
      service.isInstalled = true;
      service.isInstallable = false;

      const html = service.renderPWAStatusWidget();
      expect(html).toContain('Standalone Desktop/Mobile App');
      expect(html).toContain('NATIVE');
      // Should not show the install button when already installed
      expect(html).not.toContain('Install Native Application');
    });
  });

  // ─── 8. CACHE MANAGEMENT, UPDATES & STATE SUBSCRIPTIONS ────────────────────

  describe('8. Cache Management & Subscriptions', () => {
    it('should provide complete state snapshot via getState()', () => {
      const service = new PWAService();
      const state: PWAEngineState = service.getState();

      expect(typeof state.isInstallable).toBe('boolean');
      expect(typeof state.isInstalled).toBe('boolean');
      expect(typeof state.isOnline).toBe('boolean');
      expect(typeof state.swStatus).toBe('string');
      expect(typeof state.lastSyncTimestamp).toBe('number');
      expect(typeof state.totalCachedEntries).toBe('number');
      expect(typeof state.formattedStorageUsage).toBe('string');
      expect(typeof state.bannerDismissed).toBe('boolean');
      expect(typeof state.installOutcome).toBe('string');
    });

    it('should allow subscribing to PWA state changes and unsubscribing cleanly', () => {
      const service = new PWAService();
      const listenerMock = vi.fn();

      const unsubscribe = service.subscribe(listenerMock);

      // Listener is called immediately upon subscription
      expect(listenerMock).toHaveBeenCalledTimes(1);

      service.dismissInstallBanner();
      expect(listenerMock).toHaveBeenCalledTimes(2);

      unsubscribe();

      service.dismissInstallBanner();
      expect(listenerMock).toHaveBeenCalledTimes(2); // Unsubscribed
    });

    it('should export the global singleton pwaService instance', () => {
      expect(pwaService).toBeDefined();
      expect(pwaService).toBeInstanceOf(PWAService);
    });
  });
});
