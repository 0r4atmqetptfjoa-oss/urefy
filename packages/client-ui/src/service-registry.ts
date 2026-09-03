/**
 * AETHERIS HYBRID SUITE - SERVICE REGISTRY & DEPENDENCY INJECTION CONTAINER
 * Type-safe, modular, testable Inversion of Control (IoC) container.
 * Eliminates ad-hoc global state mutation and promotes loose coupling across modules.
 */

export type ServiceFactory<T> = (registry: ServiceRegistry) => T;
export type ServiceLifecycle = 'singleton' | 'transient';

export interface ServiceToken<T> {
  readonly description: string;
  readonly _type?: T;
}

export function createServiceToken<T>(description: string): ServiceToken<T> {
  return { description };
}

interface ServiceRegistration<T> {
  factory: ServiceFactory<T>;
  lifecycle: ServiceLifecycle;
  cachedInstance?: T;
}

export type ServiceListener = (tokenDescription: string, instance: unknown) => void;

export class ServiceRegistry {
  private _services = new Map<string, ServiceRegistration<unknown>>();
  private _parent: ServiceRegistry | null = null;
  private _registerListeners: ServiceListener[] = [];
  private _resolveListeners: ServiceListener[] = [];

  constructor(parent: ServiceRegistry | null = null) {
    this._parent = parent;
  }

  /**
   * Register a direct pre-instantiated singleton instance.
   */
  public registerInstance<T>(token: ServiceToken<T> | string, instance: T): this {
    const key = typeof token === 'string' ? token : token.description;
    this._services.set(key, {
      factory: () => instance,
      lifecycle: 'singleton',
      cachedInstance: instance,
    });
    this._emitRegister(key, instance);
    return this;
  }

  /**
   * Register a lazy singleton factory. Instantiated once on first resolution.
   */
  public registerSingleton<T>(token: ServiceToken<T> | string, factory: ServiceFactory<T>): this {
    const key = typeof token === 'string' ? token : token.description;
    this._services.set(key, {
      factory: factory as ServiceFactory<unknown>,
      lifecycle: 'singleton',
    });
    this._emitRegister(key, null);
    return this;
  }

  /**
   * Register a transient factory. Instantiated fresh on every resolution.
   */
  public registerTransient<T>(token: ServiceToken<T> | string, factory: ServiceFactory<T>): this {
    const key = typeof token === 'string' ? token : token.description;
    this._services.set(key, {
      factory: factory as ServiceFactory<unknown>,
      lifecycle: 'transient',
    });
    this._emitRegister(key, null);
    return this;
  }

  /**
   * Resolve a registered service. Throws if service not found.
   */
  public resolve<T>(token: ServiceToken<T> | string): T {
    const key = typeof token === 'string' ? token : token.description;
    const resolved = this.tryResolve<T>(token);
    if (resolved === undefined) {
      throw new Error(`[ServiceRegistry] Service not found for token: "${key}"`);
    }
    return resolved;
  }

  /**
   * Attempt to resolve a registered service without throwing.
   */
  public tryResolve<T>(token: ServiceToken<T> | string): T | undefined {
    const key = typeof token === 'string' ? token : token.description;
    const reg = this._services.get(key) as ServiceRegistration<T> | undefined;

    if (reg) {
      if (reg.lifecycle === 'singleton') {
        if (reg.cachedInstance === undefined) {
          reg.cachedInstance = reg.factory(this);
        }
        this._emitResolve(key, reg.cachedInstance);
        return reg.cachedInstance;
      } else {
        const instance = reg.factory(this);
        this._emitResolve(key, instance);
        return instance;
      }
    }

    if (this._parent) {
      return this._parent.tryResolve<T>(token);
    }

    return undefined;
  }

  /**
   * Check whether a service is registered in this registry or ancestor chain.
   */
  public has(token: ServiceToken<unknown> | string): boolean {
    const key = typeof token === 'string' ? token : token.description;
    return this._services.has(key) || (this._parent ? this._parent.has(key) : false);
  }

  /**
   * Unregister a service from this local registry level.
   */
  public remove(token: ServiceToken<unknown> | string): boolean {
    const key = typeof token === 'string' ? token : token.description;
    return this._services.delete(key);
  }

  /**
   * Clear all registrations in this registry level.
   */
  public clear(): void {
    this._services.clear();
  }

  /**
   * Create a scoped child registry that falls back to this registry.
   */
  public createChildScope(): ServiceRegistry {
    return new ServiceRegistry(this);
  }

  /**
   * Subscribe to service registration events.
   */
  public onRegistered(listener: ServiceListener): () => void {
    this._registerListeners.push(listener);
    return () => {
      this._registerListeners = this._registerListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Subscribe to service resolution events.
   */
  public onResolved(listener: ServiceListener): () => void {
    this._resolveListeners.push(listener);
    return () => {
      this._resolveListeners = this._resolveListeners.filter((l) => l !== listener);
    };
  }

  private _emitRegister(token: string, instance: unknown): void {
    for (const listener of this._registerListeners) {
      try {
        listener(token, instance);
      } catch (err) {
        console.error('[ServiceRegistry] Registration listener error:', err);
      }
    }
  }

  private _emitResolve(token: string, instance: unknown): void {
    for (const listener of this._resolveListeners) {
      try {
        listener(token, instance);
      } catch (err) {
        console.error('[ServiceRegistry] Resolution listener error:', err);
      }
    }
  }
}

// ── Predefined Typed Service Tokens ────────────────────────────────────────────────
export const SERVICES = {
  ClientStore: createServiceToken<unknown>('ClientStore'),
  AdminAuth: createServiceToken<unknown>('AdminAuth'),
  AdminPanel: createServiceToken<unknown>('AdminPanel'),
  CyberDefense: createServiceToken<unknown>('CyberDefense'),
  SovereignDM: createServiceToken<unknown>('SovereignDM'),
  WebAuthn: createServiceToken<unknown>('WebAuthn'),
  WebRTCTransfer: createServiceToken<unknown>('WebRTCTransfer'),
  VoiceChat: createServiceToken<unknown>('VoiceChat'),
  ThemeEngine: createServiceToken<unknown>('ThemeEngine'),
  CustomThemeBuilder: createServiceToken<unknown>('CustomThemeBuilder'),
  WalletBridge: createServiceToken<unknown>('WalletBridge'),
  OfflineSync: createServiceToken<unknown>('OfflineSync'),
  AcousticDSP: createServiceToken<unknown>('AcousticDSP'),
  MeshMatrix: createServiceToken<unknown>('MeshMatrix'),
  PaperWallet: createServiceToken<unknown>('PaperWallet'),
  MerkleVisualizer: createServiceToken<unknown>('MerkleVisualizer'),
  ZKReputation: createServiceToken<unknown>('ZKReputation'),
  IndexedDB: createServiceToken<unknown>('IndexedDB'),
  Notifications: createServiceToken<unknown>('Notifications'),
  Breadcrumbs: createServiceToken<unknown>('Breadcrumbs'),
  Onboarding: createServiceToken<unknown>('Onboarding'),
  SlideDeck: createServiceToken<unknown>('SlideDeck'),
  DiffViewer: createServiceToken<unknown>('DiffViewer'),
  DownloadManager: createServiceToken<unknown>('DownloadManager'),
  Reactions: createServiceToken<unknown>('Reactions'),
  AudioDSP: createServiceToken<unknown>('AudioDSP'),
  NetworkObservatory: createServiceToken<unknown>('NetworkObservatory'),
  WotGraph: createServiceToken<unknown>('WotGraph'),
  Awards: createServiceToken<unknown>('Awards'),
  ErrorBoundary: createServiceToken<unknown>('ErrorBoundary'),
  StructuredLogger: createServiceToken<unknown>('StructuredLogger'),
  I18nEngine: createServiceToken<unknown>('I18nEngine'),
  GlobalScale: createServiceToken<unknown>('GlobalScale'),
  OmniComposer: createServiceToken<unknown>('OmniComposer'),
  PollEngine: createServiceToken<unknown>('PollEngine'),
  MediaPlayer: createServiceToken<unknown>('MediaPlayer'),
  BookmarksVault: createServiceToken<unknown>('BookmarksVault'),
  CrossPostEngine: createServiceToken<unknown>('CrossPostEngine'),
  ProfileCardEngine: createServiceToken<unknown>('ProfileCardEngine'),
  PostDetailView: createServiceToken<unknown>('PostDetailView'),
  TrendingEngine: createServiceToken<unknown>('TrendingEngine'),
  StoriesEngine: createServiceToken<unknown>('StoriesEngine'),
  MarkdownRenderer: createServiceToken<unknown>('MarkdownRenderer'),
  DiagramRenderer: createServiceToken<unknown>('DiagramRenderer'),
  ZenMode: createServiceToken<unknown>('ZenMode'),
  TimelineScrubber: createServiceToken<unknown>('TimelineScrubber'),
  ViewTransitions: createServiceToken<unknown>('ViewTransitions'),
  VirtualScroll: createServiceToken<unknown>('VirtualScroll'),
  FeedPersonalization: createServiceToken<unknown>('FeedPersonalization'),
  ExportBackup: createServiceToken<unknown>('ExportBackup'),
  GovernanceDAO: createServiceToken<unknown>('GovernanceDAO'),
  RSSImporter: createServiceToken<unknown>('RSSImporter'),
  CVEMonitor: createServiceToken<unknown>('CVEMonitor'),
  GossipViz: createServiceToken<unknown>('GossipViz'),
  SearchIndex: createServiceToken<unknown>('SearchIndex'),
  LinkPreview: createServiceToken<unknown>('LinkPreview'),
  CollectionsEngine: createServiceToken<unknown>('CollectionsEngine'),
  SoundEffects: createServiceToken<unknown>('SoundEffects'),
  ContextMenu: createServiceToken<unknown>('ContextMenu'),
  KeyboardNav: createServiceToken<unknown>('KeyboardNav'),
  FlairFilter: createServiceToken<unknown>('FlairFilter'),
  HashtagExplorer: createServiceToken<unknown>('HashtagExplorer'),
  AutocompleteEngine: createServiceToken<unknown>('AutocompleteEngine'),
  DraftAutosave: createServiceToken<unknown>('DraftAutosave'),
  FloatingPiP: createServiceToken<unknown>('FloatingPiP'),
  WotSlider: createServiceToken<unknown>('WotSlider'),
  CommandRail: createServiceToken<unknown>('CommandRail'),
  AIAssistant: createServiceToken<unknown>('AIAssistant'),
  RichEditor: createServiceToken<unknown>('RichEditor'),
  PWAService: createServiceToken<unknown>('PWAService'),
  CryptoWorkerPool: createServiceToken<unknown>('CryptoWorkerPool'),
  ModuleLoader: createServiceToken<unknown>('ModuleLoader'),
  SovereignOnboarding: createServiceToken<unknown>('SovereignOnboarding'),
  SpatialAudio: createServiceToken<unknown>('SpatialAudio'),
  RelaysManager: createServiceToken<unknown>('RelaysManager'),
  SovereignCircle: createServiceToken<unknown>('SovereignCircle'),
  Governance: createServiceToken<unknown>('Governance'),
  MnemonicModal: createServiceToken<unknown>('MnemonicModal'),
  Steganography: createServiceToken<unknown>('Steganography'),
  SteganographyModal: createServiceToken<unknown>('SteganographyModal'),
  ArchiveModal: createServiceToken<unknown>('ArchiveModal'),
  WebPush: createServiceToken<unknown>('WebPush'),
  CodeSandbox: createServiceToken<unknown>('CodeSandbox'),
  WebTorrentSwarm: createServiceToken<unknown>('WebTorrentSwarm'),
  SpatialAudioMesh: createServiceToken<unknown>('SpatialAudioMesh'),
  SoundPacks: createServiceToken<unknown>('SoundPacks'),
  NodeFederation: createServiceToken<unknown>('NodeFederation'),
  SocialRecoveryModal: createServiceToken<unknown>('SocialRecoveryModal'),
  NetworkMinimap: createServiceToken<unknown>('NetworkMinimap'),
  MobileTabBar: createServiceToken<unknown>('MobileTabBar'),
} as const;

// ── Default Global Container Instance ──────────────────────────────────────────────
export const serviceRegistry = new ServiceRegistry();
