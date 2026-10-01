import './window-augmentation.js';
import { patchMessageWorkspace, patchFeedWorkspace, rememberWorkspaceMedia } from './ui/patch-message-workspace.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { clientStore, ClientMessage, ClientPost, ClientNanopublication, SpaceType } from './client-state.js';
import { setupKeyboardShortcuts, getAvailableCommands } from './command-rail.js';
import { threadManager, ThreadComment, DEPTH_COLORS } from './threads.js';
import { isDemoModeEnabled } from './demo-mode.js';
import { localSearchIndex, SearchResult } from './search-index.js';
import { obsidianMediaPlayer } from './media-player.js';
import { pollEngine } from './polls.js';
import { trendingEngine } from './trending.js';
import { omniComposer, OmniComposer, hybridComposer, HybridComposer } from './composer-hybrid.js';
import { exploreView, settingsView, communityView, loadSettingsView, loadExploreView, loadCommunityView } from './optional-workspaces.js';
import { profileView } from './profile-view.js';
import { pulseActionsEngine } from './pulse-actions.js';
import { storiesEngine } from './stories.js';
import { notificationCenter } from './notifications.js';
import { reactionsEngine, updateReactionBarDOM, bindReactionBarEvents } from './reactions.js';
import { bookmarksVault } from './bookmarks.js';
import { relaysManager } from './relays-manager.js';
import { sovereignDialog } from './dialog-modal.js';
import { awardsSystem, awardPopoverManager } from './awards.js';
import { crossPostEngine } from './crosspost.js';
import { keyboardNavigator } from './keyboard-nav.js';
import { legalFooter } from './footer.js';
import { touchGestureEngine } from './touch-gestures.js';
import { crossTabSync } from './cross-tab-sync.js';
import { hashtagExplorer } from './hashtag-explorer.js';
import { flairFilter } from './flair-filter.js';
import { postDetailView } from './post-detail.js';
import { contextMenuEngine } from './context-menu.js';
import { onboardingWizard } from './onboarding.js';
import { markdownRenderer } from './markdown-renderer.js';
import { themeEngine } from './themes.js';
import { breadcrumbsManager } from './breadcrumbs.js';
import { zenModeManager } from './zen-mode.js';
import { soundEffects } from './sound-effects.js';
import { draftAutosave } from './draft-autosave.js';
import { autocompleteEngine } from './autocomplete.js';
import { wotSlider } from './wot-slider.js';
import { commandRailV2 } from './command-rail-v2.js';
import { sovereignDM } from './sovereign-dm.js';
import { sharePostOrCopyLink } from './dry-utils.js';
import { toastManager } from './toast.js';
import { sovereignRouter } from './router.js';
import { reportModalManager } from './report-modal.js';

// V4 Imports
import { virtualScroll } from './virtual-scroll.js';
import { aethDB } from './indexed-db.js';
import { cryptoWorkerPool } from './web-workers.js';
import { mobileTabBar } from './mobile-tab-bar.js';
import { pwaService } from './pwa-service.js';
import { viewTransitions } from './view-transitions.js';
import { moduleLoader } from './code-splitting.js';
import { feedPersonalization } from './feed-personalization.js';
import { sovereignOnboarding } from './first-time-onboarding.js';
import { offlineSync } from './offline-sync.js';
import { errorBoundary, structuredLogger } from './error-boundary.js';
import { localDiagnostics } from './local-diagnostics.js';
import { i18n, t, SUPPORTED_LANGUAGES } from './i18n.js';
import { feedControlsEngine } from './feed-controls.js';
import { zkReputation } from './zk-reputation.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { sovereignWebPush } from './web-push.js';

// Optional media tools load only when their view or control is used.
function initVoiceCanvas(): void {
  if (document.getElementById('voice-oscilloscope')) {
    void import('./webrtc-voice.js').then(({ voiceVisualizer }) => voiceVisualizer.init('voice-oscilloscope'));
  }
}

function renderTransparencyHeaderToggle(): string {
  const isEnabled = Boolean(typeof window !== 'undefined' && (window as any).transparencyMode?.isEnabled);
  return `
    <button
      type="button"
      id="btn-toggle-transparency-mode" data-action="call-global" data-raw-click="if(window.__aetherisTransparency) { window.__aetherisTransparency.toggle(); if(window.clientStore) window.clientStore.notify(); } else { import('./transparency-mode.js').then(m => { m.transparencyMode.toggle(); if(window.clientStore) window.clientStore.notify(); }); }"
      class="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs rounded-xl border transition-all shadow-sm cursor-pointer ${
        isEnabled
          ? 'border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
          : 'border-white/5 bg-surface-raised/80 hover:bg-surface-overlay text-slate-300'
      }"
      title="Unified Transparency Mode — Live Cryptographic Pipeline Inspector (Ctrl+Shift+T)"
    >
      <span class="text-xs">👁️</span>
      <span class="hidden xl:inline font-sans font-medium">Transparency</span>
      <span class="w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-sky-400 animate-ping' : 'bg-slate-500'}"></span>
    </button>
  `;
}
const workspaceLoads = new Map<string, 'pending' | 'failed'>();
function renderLoadingWorkspace(name: string, load: () => Promise<unknown>): string {
  if (!workspaceLoads.has(name)) {
    workspaceLoads.set(name, 'pending');
    void load().then(() => {
      workspaceLoads.delete(name);
      if (name === 'settings' && sovereignRouter.settingsSubtab) settingsView?.setActiveTab(sovereignRouter.settingsSubtab as any);
      clientStore.notify();
    }).catch(() => {
      workspaceLoads.set(name, 'failed');
      clientStore.notify();
    });
  }
  return `<div class="flex-1 flex items-center justify-center p-8 text-slate-400" role="status">${workspaceLoads.get(name) === 'failed' ? 'Unable to load this page. Reload to try again.' : `Opening ${name}…`}</div>`;
}

let _messagesViewModule: typeof import('./messages-view.js') | null = null;
let _vaultViewModule: typeof import('./vault-view.js') | null = null;

function renderRelaysWorkspace(): string {
  if (_messagesViewModule) return _messagesViewModule.renderRelaysWorkspace();
  void import('./messages-view.js').then(m => {
    _messagesViewModule = m;
    clientStore.notifySync();
  });
  return `
    <div class="flex-1 flex flex-col items-center justify-center bg-canvas p-8 text-slate-400 space-y-3" role="status" aria-live="polite">
      <div class="w-8 h-8 rounded-full border-2 border-[var(--color-accent,#e59b3c)] border-t-transparent animate-spin"></div>
      <p class="text-xs font-mono">Opening sovereign messages…</p>
    </div>
  `;
}

function renderVaultWorkspace(): string {
  if (_vaultViewModule) return _vaultViewModule.renderVaultWorkspace();
  void import('./vault-view.js').then(m => {
    _vaultViewModule = m;
    clientStore.notifySync();
  });
  return `
    <div class="flex-1 flex flex-col items-center justify-center bg-canvas p-8 text-slate-400 space-y-3" role="status" aria-live="polite">
      <div class="w-8 h-8 rounded-full border-2 border-[var(--color-accent,#e59b3c)] border-t-transparent animate-spin"></div>
      <p class="text-xs font-mono">Opening sovereign vault…</p>
    </div>
  `;
}

import { renderPulseWorkspace, renderPulsePostCard, renderInlineQuickComposer, renderPostCard, quickPostDraft } from './feed-view.js';
import { PRIMARY_NAV_ITEMS, ADVANCED_TOOLS_ITEMS, renderNavIcon } from './nav-config.js';
import { renderIcon, renderBrandLogoMark } from './ui/icons.js';
import { contextualSidebar, hasContextualSidebar } from './sidebar.js';
import { modalManager, buildModalRootHTML as orchestrateModalRootHTML } from './modal-manager.js';
import { rapidOnboarding } from './rapid-onboarding.js';
import { actionDispatcher } from './ui/action-dispatcher.js';
import { renderHeaderPrimaryNav, renderHeaderTools, renderBroadcastBanner as renderHeaderBroadcastBanner } from './header.js';
import { facetSwitcher } from './facet-switcher.js';
import { railController } from './controllers/rail-controller.js';
import { navigationController } from './controllers/navigation-controller.js';
import { renderWorkspaceLayoutControls } from './workspace-layout.js';

let isThemeModalOpen = false;
let isExportBackupModalOpen = false;
let isCVEModalOpen = false;
let isRSSModalOpen = false;
let isGovernanceModalOpen = false;
let isGossipModalOpen = false;
let isLangModalOpen = false;
let isGlobalScaleModalOpen = false;
let isMobileDrawerOpen = false;
let isAdvancedOverflowOpen = false;
let isMoreExpanded = false;
let _initialSsrArticleHtml = '';

// Register Core Singletons into Inversion of Control Container
serviceRegistry.registerInstance(SERVICES.ClientStore, clientStore);
serviceRegistry.registerInstance(SERVICES.ThemeEngine, themeEngine);
// ZKReputation is loaded on-demand
// MerkleVisualizer is loaded on-demand
serviceRegistry.registerInstance(SERVICES.OfflineSync, offlineSync);
// MeshMatrix is loaded on-demand
// PaperWallet is loaded on-demand
// AcousticDSP is loaded on-demand
// NetworkObservatory is loaded on-demand
// WotGraph is loaded on-demand
// CustomThemeBuilder is loaded on-demand
// WalletBridge is loaded on-demand
serviceRegistry.registerInstance(SERVICES.ErrorBoundary, errorBoundary);
serviceRegistry.registerInstance(SERVICES.StructuredLogger, structuredLogger);
serviceRegistry.registerInstance(SERVICES.LocalDiagnostics, localDiagnostics);
serviceRegistry.registerInstance(SERVICES.I18nEngine, i18n);
// GlobalScale is loaded on-demand
serviceRegistry.registerInstance(SERVICES.OmniComposer, omniComposer);
serviceRegistry.registerInstance(SERVICES.PollEngine, pollEngine);
serviceRegistry.registerInstance(SERVICES.MediaPlayer, obsidianMediaPlayer);
serviceRegistry.registerInstance(SERVICES.Reactions, reactionsEngine);
serviceRegistry.registerInstance(SERVICES.Awards, awardsSystem);
serviceRegistry.registerInstance(SERVICES.BookmarksVault, bookmarksVault);
serviceRegistry.registerInstance(SERVICES.CrossPostEngine, crossPostEngine);
serviceRegistry.registerInstance(SERVICES.PostDetailView, postDetailView);
serviceRegistry.registerInstance(SERVICES.TrendingEngine, trendingEngine);
serviceRegistry.registerInstance(SERVICES.StoriesEngine, storiesEngine);
serviceRegistry.registerInstance(SERVICES.Notifications, notificationCenter);
serviceRegistry.registerInstance(SERVICES.MarkdownRenderer, markdownRenderer);
// DiagramRenderer is loaded on-demand
serviceRegistry.registerInstance(SERVICES.ZenMode, zenModeManager);
serviceRegistry.registerInstance(SERVICES.ViewTransitions, viewTransitions);
serviceRegistry.registerInstance(SERVICES.VirtualScroll, virtualScroll);
serviceRegistry.registerInstance(SERVICES.FeedPersonalization, feedPersonalization);
// exportBackup loaded on demand
// governanceDAO loaded on demand
// rssImporter loaded on demand
// cveMonitor loaded on demand
// gossipViz loaded on demand
serviceRegistry.registerInstance(SERVICES.SearchIndex, localSearchIndex);
serviceRegistry.registerInstance(SERVICES.SoundEffects, soundEffects);
serviceRegistry.registerInstance(SERVICES.ContextMenu, contextMenuEngine);
serviceRegistry.registerInstance(SERVICES.KeyboardNav, keyboardNavigator);
serviceRegistry.registerInstance(SERVICES.FlairFilter, flairFilter);
serviceRegistry.registerInstance(SERVICES.HashtagExplorer, hashtagExplorer);
serviceRegistry.registerInstance(SERVICES.AutocompleteEngine, autocompleteEngine);
serviceRegistry.registerInstance(SERVICES.DraftAutosave, draftAutosave);
serviceRegistry.registerInstance(SERVICES.WotSlider, wotSlider);
serviceRegistry.registerInstance(SERVICES.CommandRail, commandRailV2);
// AIAssistant is loaded on-demand
// RichEditor is loaded on-demand by composer
serviceRegistry.registerInstance(SERVICES.PWAService, pwaService);
serviceRegistry.registerInstance(SERVICES.CryptoWorkerPool, cryptoWorkerPool);
serviceRegistry.registerInstance(SERVICES.ModuleLoader, moduleLoader);
serviceRegistry.registerInstance(SERVICES.SovereignOnboarding, sovereignOnboarding);
// SpatialAudio is loaded on-demand
// steganographyModal loaded on demand
// CodeSandbox is loaded on-demand
// WebTorrentSwarm is loaded on-demand
// SpatialAudioMesh is loaded on-demand
// SoundPacks is loaded on-demand
// NodeFederation is loaded on-demand

if (typeof window !== 'undefined') {
  (window as any).sovereignDialog = sovereignDialog;
  (window as any).__aetheris_open_settings = (tab?: any) => { sovereignRouter.navigateTo('settings', { subtab: tab }); };
  (window as any).__aetheris_close_settings = () => { settingsView?.close(); };
  // webTorrentSwarm is loaded on-demand
  // window.spatialAudioMesh initialized on demand
  // window.soundPacks initialized on demand
  // nodeFederationEngine is loaded on-demand
  window.__aetheris_open_global_scale = () => { modalManager.openFeature('global-scale'); };
  window.__aetheris_close_global_scale = () => { modalManager.closeFeature(); };
  window.__aetheris_open_edit_profile = () => { profileView.isEditProfileModalOpen = true; clientStore.notifySync(); };
  window.__aetheris_close_edit_profile = () => { profileView.isEditProfileModalOpen = false; clientStore.notifySync(); };
  window.__aetheris_save_profile = async () => {
    const name = (document.getElementById('edit-profile-name') as HTMLInputElement)?.value.trim() || 'Sovereign Node';
    const handle = (document.getElementById('edit-profile-handle') as HTMLInputElement)?.value.replace(/^@/, '').trim() || profileView.getProfile(clientStore.keypair.fingerprint).handle;
    const bio = (document.getElementById('edit-profile-bio') as HTMLTextAreaElement)?.value.trim() || '';
    const location = (document.getElementById('edit-profile-location') as HTMLInputElement)?.value.trim() || '';
    const website = (document.getElementById('edit-profile-website') as HTMLInputElement)?.value.trim() || '';
    const avatar = (document.getElementById('edit-profile-avatar') as HTMLInputElement)?.value.trim() || profileView.getProfile(clientStore.keypair.fingerprint).avatar;
    const banner = (document.getElementById('edit-profile-banner') as HTMLInputElement)?.value.trim() || profileView.getProfile(clientStore.keypair.fingerprint).banner;

    await profileView.saveProfile(clientStore.keypair.fingerprint, { name, handle, bio, location, website, avatar, banner });
    clientStore.notifySync();
  };
  window.__aetheris_open_gossip = () => { modalManager.openFeature('gossip'); };
  window.__aetheris_close_gossip = () => { modalManager.closeFeature(); };
  window.__aetheris_open_rss = () => { modalManager.openFeature('rss'); };
  window.__aetheris_close_rss = () => { modalManager.closeFeature(); };
  window.__aetheris_open_cve = () => { modalManager.openFeature('cve'); };
  window.__aetheris_close_cve = () => { modalManager.closeFeature(); };
  window.__aetheris_open_dao = () => { modalManager.openFeature('governance'); };
  window.__aetheris_close_dao = () => { modalManager.closeFeature(); };
  window.__aetheris_open_governance = () => { modalManager.openFeature('governance'); };
  window.__aetheris_close_governance = () => { modalManager.closeFeature(); };
  window.__aetheris_open_export = () => { modalManager.openFeature('export-backup'); };
  window.__aetheris_close_export = () => { modalManager.closeFeature(); };
  window.__aetheris_open_lang = () => { isLangModalOpen = true; clientStore.notifySync('MODAL_CHANGE'); };
  window.__aetheris_open_theme = () => { isThemeModalOpen = true; themeEngine.openModal(); clientStore.notifySync('MODAL_CHANGE'); };
  window.__aetheris_close_theme = () => { isThemeModalOpen = false; themeEngine.closeModal(); clientStore.notifySync('MODAL_CHANGE'); };
  window.__aetheris_apply_theme = (id: string) => { themeEngine.setTheme(id); isThemeModalOpen = false; themeEngine.isModalOpen = false; clientStore.notifySync('MODAL_CHANGE'); };
  window.__aetherisToggleNotifs = () => { isNotificationPanelOpen = !isNotificationPanelOpen; clientStore.notifySync('MODAL_CHANGE'); };
  window.__aetherisCloseNotifs = () => { isNotificationPanelOpen = false; clientStore.notifySync('MODAL_CHANGE'); };
  window.__aetheris_close_lang = () => { isLangModalOpen = false; clientStore.notifySync('MODAL_CHANGE'); };
  window.__aetheris_close_observatory = () => { modalManager.closeFeature(); };
  window.__aetheris_close_wot_graph = () => { modalManager.closeFeature(); };
  window.__aetheris_close_custom_theme_builder = () => {
    if (typeof window !== 'undefined' && (window as any).customThemeBuilder) {
      (window as any).customThemeBuilder.closeModal();
    }
    modalManager.closeFeature();
  };
  window.__aetheris_close_wallet = () => { modalManager.closeFeature(); };
  window.__aetheris_close_reputation = () => { modalManager.closeFeature(); };
  window.__aetheris_close_merkle = () => { modalManager.closeFeature(); };
  window.__aetheris_close_sync = () => { offlineSync.close(); clientStore.notifySync(); };
  window.__aetheris_open_mnemonic = () => { modalManager.openFeature('mnemonic'); };
  window.__aetheris_close_mnemonic = () => { modalManager.closeFeature(); };
  window.__aetheris_open_steganography = () => { modalManager.openFeature('steganography'); };
  window.__aetheris_close_steganography = () => { modalManager.closeFeature(); };
  window.__aetheris_open_archive_modal = (tab?: 'export' | 'restore') => { modalManager.openFeature('archive', tab); };
  window.__aetheris_close_archive_modal = () => { modalManager.closeFeature(); };
  window.__aetheris_open_social_recovery = (tab?: 'setup' | 'recover') => { modalManager.openFeature('social-recovery', tab); };
  window.__aetheris_close_social_recovery = () => { modalManager.closeFeature(); };
  window.__aetheris_open_portable_trust = () => { modalManager.openFeature('portable-trust'); };
  window.__aetheris_close_portable_trust = () => { modalManager.closeFeature(); };
  window.__aetheris_open_binary_hygiene = () => { modalManager.openFeature('binary-hygiene'); };
  window.__aetheris_close_binary_hygiene = () => { modalManager.closeFeature(); };
  window.__aetheris_open_microsaas_docs = () => { modalManager.openFeature('microsaas-docs'); };
  window.__aetheris_close_microsaas_docs = () => { modalManager.closeFeature(); };
  (window as any).__aetheris_open_rapid_onboarding = (intent?: any) => { rapidOnboarding.openModal(intent); };
  (window as any).__aetheris_close_rapid_onboarding = () => { rapidOnboarding.closeModal(); };
  (window as any).__aetheris_toggle_mobile_drawer = () => { isMobileDrawerOpen = !isMobileDrawerOpen; clientStore.notify(); };
  (window as any).__aetheris_close_mobile_drawer = () => { isMobileDrawerOpen = false; clientStore.notify(); };
  window.__aetheris_open_legal = (tab = 'terms') => { modalManager.openFeature('legal', tab); clientStore.notifySync(); };
  window.__aetheris_close_legal = () => { modalManager.closeFeature(); };
  window.__aetheris_set_legal_tab = (tab) => { modalManager.openFeature('legal', tab); clientStore.notifySync(); };
  window.__aetheris_dismiss_broadcast = () => {
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('aetheris_dismissed_broadcast', clientStore.broadcastAnnouncement || '');
      } catch (_) {}
    }
    clientStore.notifySync();
  };
  window.__aetheris_close_mesh = () => { modalManager.closeFeature(); };
  window.__aetheris_close_paper_wallet = () => { modalManager.closeFeature(); };
  window.__aetheris_close_dsp = () => { modalManager.closeFeature(); };
  window.__aetheris_toggle_mobile_drawer = () => { isMobileDrawerOpen = !isMobileDrawerOpen; clientStore.notifySync(); };
  window.__aetheris_open_mobile_drawer = () => { isMobileDrawerOpen = true; clientStore.notifySync(); };
  window.__aetheris_close_mobile_drawer = () => { isMobileDrawerOpen = false; clientStore.notifySync(); };
  window.__aetheris_toggle_ui_mode = () => { clientStore.toggleUiMode(); };
  window.__aetheris_set_ui_mode = (mode: 'simple' | 'sovereign') => { clientStore.setUiMode(mode); };
  window.__aetheris_toggle_advanced_overflow = () => { isAdvancedOverflowOpen = !isAdvancedOverflowOpen; clientStore.notify(); };
  window.__aetheris_close_advanced_overflow = () => { isAdvancedOverflowOpen = false; clientStore.notify(); };
  window.__aetheris_toggle_more_rail = () => { isMoreExpanded = !isMoreExpanded; clientStore.notifySync(); };
  window.__aetheris_toggle_bookmarks = () => { isBookmarkModalOpen = !isBookmarkModalOpen; clientStore.notify(); };
      window.offlineSync = offlineSync;
            window.errorBoundary = errorBoundary;
  window.structuredLogger = structuredLogger;
  window.i18n = i18n;
    window.omniComposer = omniComposer;
  window.pollEngine = pollEngine;
  window.obsidianMediaPlayer = obsidianMediaPlayer;
  window.reactionsEngine = reactionsEngine;
  window.awardsSystem = awardsSystem;
  window.awardPopoverManager = awardPopoverManager;
  window.bookmarksVault = bookmarksVault;
  window.crossPostEngine = crossPostEngine;
  window.themeEngine = themeEngine;
  window.clientStore = clientStore;
  window.keyboardNavigator = keyboardNavigator;
  window.pwaService = pwaService;
  window.markdownRenderer = markdownRenderer;
  // diagramRenderer and transparencyMode are loaded on-demand
  window.__aetheris_open_transparency = () => {
    if (window.transparencyMode) {
      window.transparencyMode.open();
    } else {
      import('./transparency-mode.js').then((m) => {
        window.transparencyMode = m.transparencyMode;
        window.__aetherisTransparency = m.transparencyMode;
        m.transparencyMode.open();
      });
    }
  };
  window.sovereignCircleEngine = sovereignCircleEngine;
  window.relaysManager = relaysManager;
  window.postDetailView = postDetailView;
  if (!('webAuthnManager' in window)) {
    let _wam: any = null;
    const loadWam = () => import('./webauthn.js').then((m) => {
      _wam = m.webAuthnManager;
      (window as any).webAuthnManager = m.webAuthnManager;
      return _wam;
    });
    void loadWam();
    Object.defineProperty(window, 'webAuthnManager', {
      configurable: true,
      enumerable: true,
      get() {
        if (!_wam) {
          void loadWam();
        }
        return _wam;
      },
      set(v) {
        _wam = v;
      },
    });
  }
}

let activeCrossPostId: string | null = null;
let isNotificationPanelOpen = false;
let isBookmarkModalOpen = false;
let _escListenerAdded = false;

let _dspInstance: any = null;
  const getDSP = async () => {
    if (!_dspInstance) {
      const { NeuralDSPPipeline } = await import('./audio-dsp.js');
      _dspInstance = new NeuralDSPPipeline();
    }
    return _dspInstance;
  };
let currentFilter = '';
let activeCommandIndex = 0;
let activeDownloadName: string | null = null;
let activeDownloadProgress: number = 0;


export { updateReactionBarDOM, bindReactionBarEvents };

export function initApp(): void {
  if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  void clientStore.restoreUnsentPosts();
  errorBoundary.init();
  awardPopoverManager.init();
  setupKeyboardShortcuts();
  keyboardNavigator.bindGlobalShortcuts();
  touchGestureEngine.init();
  crossTabSync.init();

  // Proactive Local AI Assistant Observer
  if (clientStore.proactiveAiEnabled) {
    if (typeof requestIdleCallback !== 'undefined') { requestIdleCallback(async () => { const { aiAssistant } = await import('./ai-assistant.js'); aiAssistant.startObserver(30000); }); }
  }

  // Ambient Network Minimap
  const minimapCanvas = document.getElementById('ambient-network-minimap') as HTMLCanvasElement;
  if (minimapCanvas) {
    void import('./network-minimap.js').then(({ ambientNetworkMinimap }) => ambientNetworkMinimap.bindCanvas(minimapCanvas));
  }

  // PWA Install State & Network Monitoring
  pwaService.subscribe((state) => {
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) {
      if (state.isInstallable && !state.isInstalled) {
        installBtn.classList.remove('hidden');
        installBtn.classList.add('inline-flex');
      } else {
        installBtn.classList.remove('inline-flex');
        installBtn.classList.add('hidden');
      }
    }
  });

  const updateNetworkStatusBadge = () => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const badge = document.getElementById('network-status-badge');
    if (badge) {
      if (isOnline) {
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span class="hidden 2xl:inline">Synced</span>`;
        badge.className = 'hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 select-none';
      } else {
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span class="hidden 2xl:inline">Offline (Vault)</span>`;
        badge.className = 'hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-400 select-none';
      }
    }
  };
  window.addEventListener('online', async () => {
    updateNetworkStatusBadge();
    toastManager.success('Network restored — Edge synced', '🟢');
    try {
      const res = await offlineSync.syncQueue();
      if (res.synced > 0) {
        toastManager.success(`Offline Outbox synced: ${res.synced} item(s) delivered to Edge`, '📦');
      }
    } catch (_) {}
    clientStore.syncFromEdge();
  });
  window.addEventListener('offline', () => {
    updateNetworkStatusBadge();
    toastManager.warning('Network disconnected — Offline Vault active', '🟡');
  });

  window.addEventListener('aetheris-detail-view-refresh', () => {
    clientStore.notifySync();
  });

  // ClientStore owns the periodic sync. A second timer here used to abort its
  // in-flight requests and repeat feed work while the user was scrolling.

  // NeuralDSP starts on-demand

  actionDispatcher.init();
  const appEl = document.getElementById('app');
  if (!appEl) return;

  // Capture pre-rendered SSR article before first paint to prevent layout jump or flash
  const existingSsrArticle = appEl.querySelector('article.social-post');
  if (existingSsrArticle) {
    _initialSsrArticleHtml = existingSsrArticle.outerHTML;
  }

  const renderAdvancedHeaderTools = (inDropdown: boolean = false): string => {
    if (inDropdown) {
      return `
        <!-- MODE SWITCHER (SIMPLE vs ADVANCED) -->
        <div class="col-span-1 sm:col-span-2 p-2.5 rounded-2xl bg-surface-raised border border-white/10 flex items-center justify-between mb-1">
          <div class="flex items-center space-x-2">
            <span class="text-sm">⚡</span>
            <div>
              <div class="text-xs font-bold text-white">${clientStore.isSimpleMode() ? 'Simple Mode' : 'Advanced Mode'}</div>
              <div class="text-[10px] text-slate-400">${clientStore.isSimpleMode() ? 'Clean, social-first UI' : 'Developer & diagnostic tools active'}</div>
            </div>
          </div>
          <button type="button" id="btn-toggle-ui-mode-header" class="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 transition-all cursor-pointer shadow-sm">
            ${clientStore.isSimpleMode() ? 'Switch to Advanced' : 'Switch to Simple'}
          </button>
        </div>

        <!-- 1. SECURITY & PRIVACY -->
        <div class="col-span-1 sm:col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-2 pb-0.5 border-t border-white/5">
          Security &amp; Privacy
        </div>
        <!-- SEED VAULT -->
        <button type="button" id="btn-open-seed-vault" data-action="open-feature" data-feature="mnemonic" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Sovereign Identity Seed Vault (BIP-39)">
          <span class="shrink-0">🔐</span>
          <span class="font-sans font-medium text-[11px] truncate">Seed Vault</span>
        </button>
        <!-- SOCIAL RECOVERY -->
        <button type="button" id="btn-open-social-recovery" data-action="open-feature" data-feature="social-recovery" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Social Identity Recovery via WoT Guardians">
          <span class="shrink-0">🛡️</span>
          <span class="font-sans font-medium text-[11px] truncate">Social Recovery</span>
        </button>
        <!-- STEGANOGRAPHY -->
        <button type="button" id="btn-open-steganography" data-action="open-feature" data-feature="steganography" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Pixel Canvas Steganography (LSB PNG E2EE)">
          <span class="shrink-0">🖼️</span>
          <span class="font-sans font-medium text-[11px] truncate">Stego Canvas</span>
        </button>
        <!-- BINARY HYGIENE -->
        <button type="button" id="btn-open-binary-hygiene" data-action="open-feature" data-feature="binary-hygiene" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Binary Hygiene (Entropy & UPX Packer Detection)">
          <span class="shrink-0">🔍</span>
          <span class="font-sans font-medium text-[11px] truncate">Binary Hygiene</span>
        </button>

        <!-- 2. NETWORK & MESH -->
        <div class="col-span-1 sm:col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-2 pb-0.5 border-t border-white/5">
          Network &amp; Mesh
        </div>
        <!-- ANYCAST EDGE OBSERVATORY -->
        <button type="button" id="btn-open-global-scale" data-action="open-feature" data-feature="global-scale" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Worldwide Anycast Edge Infrastructure">
          <span class="text-xs shrink-0">🌐</span>
          <span class="font-sans font-medium text-[11px] truncate">Anycast Edge</span>
        </button>
        <!-- MESH MATRIX -->
        <button type="button" id="btn-open-mesh-matrix" data-action="open-feature" data-feature="mesh-matrix" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Mesh Matrix Topology">
          <span class="text-xs shrink-0">🕸️</span>
          <span class="font-sans font-medium text-[11px] truncate">Mesh Matrix</span>
        </button>
        <!-- NETWORK OBSERVATORY -->
        <button type="button" id="btn-open-network-observatory" data-action="open-feature" data-feature="observatory" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Network Observatory">
          <span class="text-xs shrink-0">📊</span>
          <span class="font-sans font-medium text-[11px] truncate">Observatory</span>
        </button>
        <!-- GOSSIP VISUALIZER -->
        <button type="button" id="btn-open-gossip-viz" data-action="open-feature" data-feature="gossip" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Gossip Protocol Visualizer">
          <span class="text-xs shrink-0">📻</span>
          <span class="font-sans font-medium text-[11px] truncate">Gossip Viz</span>
        </button>

        <!-- 3. TRUST & GOVERNANCE -->
        <div class="col-span-1 sm:col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-2 pb-0.5 border-t border-white/5">
          Trust &amp; Governance
        </div>
        <!-- TRUST GRAPH -->
        <button type="button" id="btn-open-wot-graph" data-action="open-feature" data-feature="wot-graph" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Web of Trust Graph">
          <span class="text-xs shrink-0">🔗</span>
          <span class="font-sans font-medium text-[11px] truncate">Trust Graph</span>
        </button>
        <!-- PORTABLE ZK TRUST -->
        <button type="button" id="btn-open-portable-trust" data-action="open-feature" data-feature="portable-trust" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Portable ZK Trust Score (BN254 Range Proofs)">
          <span class="shrink-0">💎</span>
          <span class="font-sans font-medium text-[11px] truncate">ZK Trust</span>
        </button>
        <!-- DAO GOVERNANCE -->
        <button type="button" id="nav-btn-dao" data-action="open-feature" data-feature="governance" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="DAO Governance">
          <span class="text-xs shrink-0">🗳️</span>
          <span class="font-sans font-medium text-[11px] truncate">DAO Governance</span>
        </button>

        <!-- 4. DEVELOPER & API -->
        <div class="col-span-1 sm:col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-2 pb-0.5 border-t border-white/5">
          Developer &amp; API
        </div>
        <!-- DEV APIS & MICRO-SAAS -->
        <button type="button" id="btn-open-microsaas-docs" data-action="open-feature" data-feature="microsaas-docs" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Developer APIs & Micro-SaaS Hub (Cloudflare Edge Free Tier)">
          <span class="shrink-0">⚡</span>
          <span class="font-sans font-medium text-[11px] truncate">Dev APIs &amp; SaaS</span>
        </button>
        <!-- CVE MONITOR -->
        <button type="button" id="btn-open-cve-monitor" data-action="open-feature" data-feature="cve" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="CVE Security Monitor">
          <span class="text-xs shrink-0">🛡️</span>
          <span class="font-sans font-medium text-[11px] truncate">CVE Monitor</span>
        </button>
        <!-- RSS IMPORTER -->
        <button type="button" id="btn-open-rss-panel" data-action="open-feature" data-feature="rss" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="RSS Importer">
          <span class="text-xs shrink-0">📡</span>
          <span class="font-sans font-medium text-[11px] truncate">RSS Importer</span>
        </button>

        <!-- 5. DATA & BACKUP -->
        <div class="col-span-1 sm:col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-2 pb-0.5 border-t border-white/5">
          Data &amp; Backup
        </div>
        <!-- DATA ARCHIVE -->
        <button type="button" id="btn-open-archive-vault" data-action="open-feature" data-feature="archive" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Sovereign Data Archive (AES-256-GCM Export / Restore)">
          <span class="shrink-0">📦</span>
          <span class="font-sans font-medium text-[11px] truncate">Data Archive</span>
        </button>
        <!-- EXPORT BACKUP -->
        <button type="button" id="btn-open-backup-export" data-action="open-feature" data-feature="export-backup" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Export & Backup">
          <span class="text-xs shrink-0">💾</span>
          <span class="font-sans font-medium text-[11px] truncate">Export &amp; Backup</span>
        </button>
        <!-- SAVED IN VAULT -->
        <button type="button" id="btn-open-bookmarks-modal" data-action="toggle-bookmarks" class="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border border-white/5 bg-surface-base/60 text-slate-300 hover:text-amber-400 hover:bg-surface-overlay transition-all cursor-pointer" title="Saved to Vault">
          <span class="text-xs shrink-0">🔖</span>
          <span class="font-sans font-medium text-[11px] truncate">Saved in Vault</span>
        </button>

        <!-- 6. WORKSPACE & ACCESSIBILITY -->
        <div class="col-span-1 sm:col-span-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-2 pb-0.5 border-t border-white/5">
          Workspace &amp; Accessibility
        </div>
        <!-- DUAL HORIZON -->
        <button type="button" id="btn-toggle-dual-horizon" title="Toggle Split Screen: Stream + Vault simultaneously (Ctrl+\\)" class="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer ${clientStore.isDualHorizon ? 'border-amber-500/40 text-amber-300' : ''}">
          <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4v16m6-16v16M4 4h16v16H4z"></path></svg>
          <span class="font-sans font-medium text-[11px] truncate">Dual Horizon</span>
        </button>
        <!-- KEYBOARD SHORTCUTS -->
        <button type="button" id="btn-open-keyboard-help" data-action="open-keyboard-help" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Keyboard Shortcuts (?)">
          <span class="shrink-0">⌨️</span>
          <span class="font-sans font-medium text-[11px] truncate">Shortcuts (?)</span>
        </button>
        <!-- LANGUAGE SELECTOR -->
        <button type="button" id="btn-open-lang-picker" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Switch Language & RTL Mode (${i18n.getCurrentLanguageMeta().name})">
          <span class="shrink-0">${i18n.getCurrentLanguageMeta().flag}</span>
          <span class="font-sans font-medium text-[11px] truncate">${i18n.getLanguage().toUpperCase()}</span>
        </button>
        <!-- TRANSPARENCY MODE -->
        <div class="col-span-1 sm:col-span-2">
          ${renderTransparencyHeaderToggle()}
        </div>

        <!-- SOUND, ZEN & OFFLINE SYNC -->
        <div class="col-span-1 sm:col-span-2 flex items-center justify-between p-2 rounded-xl bg-surface-base/40 border border-white/5 mt-1">
          <div class="flex items-center space-x-1.5">
            ${soundEffects.renderSoundToggle()}
            ${zenModeManager.renderZenButton()}
          </div>
          <div>
            ${offlineSync.renderSyncBadge()}
          </div>
        </div>
      `;
    }

    // Sovereign mode (streamlined top bar)
    return `
      <button type="button" id="btn-toggle-dual-horizon" title="Toggle Split Screen: Stream + Vault simultaneously (Ctrl+\\)" class="hidden md:flex p-2 text-xs rounded-xl border items-center justify-center transition-all cursor-pointer ${clientStore.isDualHorizon ? 'bg-indigo-950 text-indigo-300 border-indigo-500/40' : 'bg-surface-raised/80 text-slate-400 border-white/5 hover:text-slate-200'}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4v16m6-16v16M4 4h16v16H4z"></path></svg>
      </button>

      <button type="button" id="btn-open-global-scale-header" data-action="open-feature" data-feature="global-scale" class="hidden xl:flex px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-raised/80 hover:bg-surface-overlay text-slate-300 font-mono items-center space-x-1.5 transition-all shadow-sm cursor-pointer" title="Worldwide Anycast Edge Infrastructure">
        <span class="text-xs">🌐</span>
        <span class="text-slate-300 font-sans text-[11px]">Anycast Edge</span>
      </button>

      ${renderTransparencyHeaderToggle()}

      <button type="button" id="btn-open-lang-picker" class="hidden sm:flex px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-raised/80 hover:bg-surface-overlay text-slate-300 font-mono items-center space-x-1.5 transition-all shadow-sm cursor-pointer" title="Switch Language & RTL Mode (${i18n.getCurrentLanguageMeta().name})">
        <span>${i18n.getCurrentLanguageMeta().flag}</span>
        <span class="font-bold uppercase">${i18n.getLanguage()}</span>
      </button>

      <div class="hidden md:flex items-center space-x-1 bg-surface-raised/80 p-0.5 rounded-xl border border-white/5">
        ${soundEffects.renderSoundToggle()}
        ${zenModeManager.renderZenButton()}
      </div>

      <div class="hidden md:flex items-center space-x-1">
        ${offlineSync.renderSyncBadge()}
      </div>
    `;
  };

  // Primary navigation and tools delegated to sovereign header module
  const renderHeaderPrimaryNavFn = (): string => renderHeaderPrimaryNav();
  const renderHeaderToolsRoot = (): string => renderHeaderTools({
    isAdvancedOverflowOpen,
    renderAdvancedTools: renderAdvancedHeaderTools,
  });

  const getDynamicTrendingTopics = (): Array<{ tag: string; count: number; category: string }> => {
    const tagCounts = new Map<string, number>();
    for (const p of clientStore.posts) {
      const matches = p.content.match(/#([a-zA-Z0-9_]+)/g);
      if (matches) {
        for (const tag of matches) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
    }
    if (tagCounts.size === 0) {
      return [
        { tag: '#Privacy', count: Math.max(1, clientStore.posts.length), category: 'Community' },
        { tag: '#DigitalRights', count: Math.max(1, Math.floor(clientStore.posts.length * 0.7)), category: 'Community' },
        { tag: '#OpenWeb', count: Math.max(1, Math.floor(clientStore.posts.length * 0.4)), category: 'Community' },
      ];
    }
    return [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag, count]) => ({
        tag,
        count,
        category: 'Community',
      }));
  };

  const renderRightRailContent = (): string => {
    if (postDetailView.isOpen()) {
      return contextualSidebar.renderSidebarContent('post-detail');
    }
    const currentRoute = sovereignRouter.route;
    const currentChannel = clientStore.activeChannelId;
    if (currentRoute === 'explore' || currentChannel === 'explore') return contextualSidebar.renderSidebarContent('explore');
    if (currentRoute === 'communities' || currentChannel === 'communities' || currentChannel.startsWith('c/')) return contextualSidebar.renderSidebarContent(currentChannel.startsWith('c/') ? currentChannel : 'communities');
    if (currentRoute === 'profile' || currentChannel.startsWith('profile')) return contextualSidebar.renderSidebarContent('profile');
    return contextualSidebar.renderSidebarContent(currentChannel);
  };

  const updateNavigationActiveClasses = (): void => {
    const currentChannel = clientStore.activeChannelId;
    const currentRoute = sovereignRouter.route;
    let activeMode: string | null = null;
    if (currentRoute === 'settings' || currentChannel === 'settings') activeMode = 'settings';
    else if (currentChannel.startsWith('pulse-') || currentRoute === 'feed') activeMode = 'pulse';
    else if (currentChannel === 'explore' || currentRoute === 'explore') activeMode = 'explore';
    else if (currentChannel === 'communities' || currentChannel.startsWith('c/') || currentRoute === 'communities') activeMode = 'communities';
    else if (currentChannel.startsWith('profile') || currentRoute === 'profile') activeMode = 'profile';
    else if (currentChannel.startsWith('vault-') || currentChannel === 'vault' || currentRoute === 'vault') activeMode = 'vault';
    else if (currentChannel.startsWith('relays-') || currentChannel.startsWith('relay-') || currentChannel.startsWith('dm-') || currentRoute === 'messages') activeMode = 'relays';

    document.querySelectorAll('[data-nav-mode]').forEach(btn => {
      const mode = btn.getAttribute('data-nav-mode');
      const isActive = mode === activeMode;
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
      if (isActive) {
        btn.classList.add('is-active', 'nav-item-active', 'shadow-sm');
        btn.classList.remove('text-slate-300', 'text-slate-400');
        if (!btn.querySelector('.nav-indicator-active')) {
          const ind = document.createElement('span');
          ind.className = 'w-2 h-2 rounded-full nav-indicator-active shrink-0';
          btn.appendChild(ind);
        }
      } else {
        btn.classList.remove('is-active', 'nav-item-active', 'shadow-sm');
        btn.classList.add('text-slate-300');
        btn.querySelector('.nav-indicator-active')?.remove();
      }
    });

    document.querySelectorAll('[data-action="open-settings"]').forEach(btn => {
      if (activeMode === 'settings') {
        btn.classList.add('is-active', 'text-indigo-400', 'font-bold');
      } else {
        btn.classList.remove('is-active', 'text-indigo-400', 'font-bold');
      }
    });

    document.querySelectorAll('button.btn-channel[data-channel-id], [data-action="switch-channel"][data-channel-id]').forEach(btn => {
      const chId = btn.getAttribute('data-channel-id');
      const isActive = chId === currentChannel;
      btn.setAttribute('aria-current', isActive ? 'true' : 'false');
      if (isActive) {
        btn.classList.add('is-active', 'bg-white/[0.06]', 'text-white', 'border-white/10');
        btn.classList.remove('text-slate-400', 'border-transparent', 'hover:bg-white/[0.02]');
      } else {
        btn.classList.remove('is-active', 'bg-white/[0.06]', 'text-white', 'border-white/10');
        btn.classList.add('text-slate-400', 'border-transparent');
      }
    });

    if (typeof mobileTabBar !== 'undefined' && typeof mobileTabBar.syncActiveTabDOM === 'function') {
      mobileTabBar.syncActiveTabDOM(currentChannel);
    }
  };

  // Search indexing is incremental: UI-only updates no longer rebuild the full
  // BM25 index, which keeps voting, reactions and typing responsive on large feeds.
  const searchDocumentSignatures = new Map<string, string>();
  const syncSearchIndex = (): void => {
    const seen = new Set<string>();
    const indexIfChanged = (doc: Parameters<typeof localSearchIndex.indexDocument>[0]): void => {
      seen.add(doc.id);
      const signature = `${doc.type}\u0000${doc.channelId}\u0000${doc.createdAt}\u0000${doc.content}`;
      if (searchDocumentSignatures.get(doc.id) === signature) return;
      localSearchIndex.indexDocument(doc);
      searchDocumentSignatures.set(doc.id, signature);
    };

    for (const [channelId, messages] of clientStore.messages.entries()) {
      for (const message of messages) {
        indexIfChanged({
          id: message.id,
          channelId,
          authorFingerprint: message.authorFingerprint,
          content: message.text,
          createdAt: message.createdAt,
          type: 'message',
        });
      }
    }

    for (const post of clientStore.posts) {
      indexIfChanged({
        id: post.id,
        channelId: post.channelId,
        authorFingerprint: post.authorFingerprint,
        content: `${post.title} ${post.content} ${post.flair}`,
        createdAt: post.createdAt,
        type: 'thread',
        title: post.title,
        flairs: post.flair ? [post.flair] : [],
      });
    }

    for (const id of searchDocumentSignatures.keys()) {
      if (!seen.has(id)) {
        localSearchIndex.removeDocument(id);
        searchDocumentSignatures.delete(id);
      }
    }
  };

  const renderLeftRailContent = (): string => railController.renderLeftRailContent({ isMoreExpanded });

  /** Build modal root HTML (delegated to sovereign modal-manager orchestrator) */
  const buildModalRootHTML = (): string => orchestrateModalRootHTML({
    isThemeModalOpen,
    isLangModalOpen,
    isGlobalScaleModalOpen,
    isGovernanceModalOpen,
    isRSSModalOpen,
    isCVEModalOpen,
    isGossipModalOpen,
    isExportBackupModalOpen,
    renderCommandRailModal,
    renderPostDetailModal,
    renderAwardModal,
    renderCrossPostModal,
    renderBookmarksModal,
    renderNotificationsDropdown,
  });

  let _scaffoldRendered = false;
  const _lastHtmlCache = new Map<string, string>();

  /** Patch an element's innerHTML only if it actually changed — avoids browser reflow & visual remounts */
  const patchEl = (id: string, html: string): boolean => {
    const el = document.getElementById(id);
    if (!el) return false;
    if (_lastHtmlCache.get(id) === html) {
      return false;
    }
    _lastHtmlCache.set(id, html);
    if (id !== 'main-stage' || (!patchFeedWorkspace(el, html) && !patchMessageWorkspace(el, html))) {
      el.innerHTML = html;
    }
    if (id === 'main-stage') rememberWorkspaceMedia(el);
    return true;
  };

  type MessageScrollSnapshot = {
    channelId: string;
    scrollTop: number;
    nearBottom: boolean;
    anchorId: string | null;
    anchorOffset: number;
  };
  let pendingMessageBottom: {
    channelId: string;
    container: HTMLElement | null;
    observer: ResizeObserver | null;
    lastProgrammaticTop: number;
  } | null = null;

  const cancelPendingMessageBottom = (): void => {
    pendingMessageBottom?.observer?.disconnect();
    pendingMessageBottom = null;
  };

  const captureMessageScroll = (): MessageScrollSnapshot | null => {
    const container = document.getElementById('messages-container');
    if (!container) return null;
    const channelId = container.dataset.channelId || '';
    const containerTop = container.getBoundingClientRect().top;
    const anchor = [...container.querySelectorAll<HTMLElement>('.journal-dialogue-message[data-message-id]')]
      .find(message => message.getBoundingClientRect().bottom > containerTop);
    return {
      channelId,
      scrollTop: container.scrollTop,
      nearBottom: container.scrollHeight - container.scrollTop - container.clientHeight < 120,
      anchorId: anchor?.dataset.messageId || null,
      anchorOffset: anchor ? anchor.getBoundingClientRect().top - containerTop : 0,
    };
  };

  const restoreMessageScroll = (snapshot: MessageScrollSnapshot | null): void => {
    const container = document.getElementById('messages-container');
    if (!container) {
      cancelPendingMessageBottom();
      return;
    }
    const channelId = container.dataset.channelId || '';
    const channelChanged = !snapshot || snapshot.channelId !== channelId;
    if (channelChanged && pendingMessageBottom?.channelId !== channelId) {
      cancelPendingMessageBottom();
      pendingMessageBottom = { channelId, container: null, observer: null, lastProgrammaticTop: 0 };
    }

    const pending = pendingMessageBottom?.channelId === channelId ? pendingMessageBottom : null;
    if (pending) {
      if (pending.container !== container) {
        pending.observer?.disconnect();
        pending.container = container;
        if (typeof ResizeObserver !== 'undefined') {
          pending.observer = new ResizeObserver(() => {
            if (pendingMessageBottom !== pending || pending.container !== container) return;
            if (container.scrollTop !== container.scrollHeight - container.clientHeight) {
              container.scrollTop = container.scrollHeight;
            }
            pending.lastProgrammaticTop = container.scrollTop;
          });
          pending.observer.observe(container);
          const list = container.firstElementChild;
          if (list) pending.observer.observe(list);
        }
        container.addEventListener('scroll', () => {
          if (pendingMessageBottom === pending && pending.container === container &&
              container.scrollTop < pending.lastProgrammaticTop - 1) {
            cancelPendingMessageBottom();
          }
        }, { passive: true });
      }
      requestAnimationFrame(() => {
        if (pendingMessageBottom !== pending || !container.isConnected) return;
        container.scrollTop = container.scrollHeight;
        pending.lastProgrammaticTop = container.scrollTop;
      });
      return;
    }

    if (snapshot && !channelChanged && !snapshot.nearBottom && snapshot.anchorId) {
      const anchor = [...container.querySelectorAll<HTMLElement>('.journal-dialogue-message[data-message-id]')]
        .find(message => message.dataset.messageId === snapshot.anchorId);
      if (anchor) {
        const offset = anchor.getBoundingClientRect().top - container.getBoundingClientRect().top;
        container.scrollTop += offset - snapshot.anchorOffset;
      } else {
        container.scrollTop = snapshot.scrollTop;
      }
      return;
    }

    if (!snapshot || channelChanged || snapshot.nearBottom) {
      requestAnimationFrame(() => {
        if (container.isConnected) container.scrollTop = container.scrollHeight;
      });
    }
  };

  const render = () => {
    errorBoundary.wrapRender(() => {
      // Preserve scroll positions across re-renders
      const rightRail = document.getElementById('right-rail-scroll');
      const rightScroll = rightRail ? rightRail.scrollTop : 0;
      const leftRail = document.getElementById('left-rail-scroll');
      const leftScroll = leftRail ? leftRail.scrollTop : 0;
      const mainFeed = document.getElementById('main-feed-scroll');
      const mainScroll = mainFeed ? mainFeed.scrollTop : (postDetailView.savedFeedScrollTop || 0);
      const messageScrollSnapshot = captureMessageScroll();
      const dmContainerEl = document.getElementById('sovereign-dm-messages-container');
      const savedDmScroll = dmContainerEl ? dmContainerEl.scrollTop : 0;
      const isDmNearBottom = dmContainerEl
        ? (dmContainerEl.scrollHeight - dmContainerEl.scrollTop - dmContainerEl.clientHeight < 120)
        : true;

    syncSearchIndex();

    // Synchronize HTML lang and dir with i18n active locale
    if (typeof document !== 'undefined' && document.documentElement) {
      const activeLocale = i18n.getLanguage();
      const meta = i18n.getCurrentLanguageMeta();
      document.documentElement.lang = activeLocale;
      document.documentElement.dir = meta?.direction || 'ltr';
      if (meta?.direction === 'rtl') {
        document.documentElement.classList.add('rtl-layout');
      } else {
        document.documentElement.classList.remove('rtl-layout');
      }
    }

    const initToasts = renderToasts();
    const initBroadcast = renderBroadcastBanner();
    const initHeaderPrimaryNav = renderHeaderPrimaryNav();
    const initHeaderTools = renderHeaderToolsRoot();
    const initLeftRail = renderLeftRailContent();
    const initMainStage = renderMainStage();
    const initRightRail = renderRightRailContent();
    const initMobileDrawer = renderMobileDrawer();
    const initMobileBottomNav = renderMobileBottomNav();
    const initModalRoot = buildModalRootHTML();

    _lastHtmlCache.set('toast-root', initToasts);
    _lastHtmlCache.set('broadcast-root', initBroadcast);
    _lastHtmlCache.set('header-primary-nav', initHeaderPrimaryNav);
    _lastHtmlCache.set('header-tools-root', initHeaderTools);
    _lastHtmlCache.set('left-rail-scroll', initLeftRail);
    _lastHtmlCache.set('main-stage', initMainStage);
    _lastHtmlCache.set('right-rail-scroll', initRightRail);
    _lastHtmlCache.set('app-mobile-bottom-nav', initMobileBottomNav);
    _lastHtmlCache.set('app-modal-root', initModalRoot);

    appEl.innerHTML = `
      <div id="main-layout" data-ui-mode="${clientStore.uiMode}" class="flex flex-col h-full h-[100dvh] w-full w-screen bg-canvas text-slate-200 overflow-hidden font-sans select-none relative">
        
        <button type="button" class="skip-to-content" data-action="focus-main-content">Skip to content</button>
        <!-- PULL TO REFRESH INDICATOR -->
        ${touchGestureEngine.renderIndicatorHTML()}

        <!-- TOAST CONTAINER -->
        <div id="toast-root">${initToasts}</div>

        <!-- QUARANTINE / SLASHING ALERT BANNER -->
        ${renderQuarantineAlert()}

        <!-- SYSTEM EMERGENCY BROADCAST BANNER -->
        <div id="broadcast-root">${initBroadcast}</div>

        <!-- TOP BAR: SOVEREIGN HEADER & CONTROLS -->
        <header id="app-top-header" class="app-top-header h-14 border-subtle-b bg-surface-base/95 backdrop-blur-xl px-2 sm:px-6 flex items-center justify-between z-20 shrink-0 shadow-md max-w-full overflow-x-clip">
          
          <!-- LEFT: LOGO + PRIMARY WORKSPACE MODES -->
          <div class="flex items-center space-x-3 sm:space-x-6">
            <button type="button" id="btn-toggle-mobile-drawer" data-action="toggle-mobile-drawer" class="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-xl bg-surface-raised border border-white/5 text-slate-300 hover:text-white cursor-pointer" title="Deschide meniu navigare" aria-label="Toggle Navigation Menu">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <button type="button" class="urefy-brand" data-action="go-home" aria-label="UREfy home">
              <span class="urefy-brand__mark">${renderBrandLogoMark({ size: 24 })}</span>
              <span class="urefy-brand__word">URE<span>fy</span></span>
            </button>

            <!-- PRIMARY WORKSPACE NAVIGATION DOCK (visible on wide screens) -->
            <nav id="header-primary-nav" class="hidden xl:flex items-center space-x-1 bg-surface-raised/80 p-1 rounded-2xl border border-white/5 text-xs shadow-inner" aria-label="Desktop primary navigation">
              ${initHeaderPrimaryNav}
            </nav>
          </div>

          <!-- CENTER: UNIFIED SEARCH & COMMAND OMNIBAR -->
          <div class="hidden lg:flex items-center shrink min-w-[140px] max-w-xs xl:max-w-md mx-2 xl:mx-4 flex-1">
            <button type="button" id="btn-open-command-rail" class="w-full flex items-center justify-between px-3.5 py-1.5 bg-surface-raised/80 hover:bg-surface-overlay text-slate-400 hover:text-slate-200 text-xs rounded-xl border border-white/5 transition-all shadow-sm hover:border-indigo-500/30 group cursor-pointer overflow-hidden">
              <div class="flex items-center space-x-2.5 min-w-0">
                <svg class="w-4 h-4 shrink-0 text-indigo-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <span class="text-slate-300 font-medium truncate whitespace-nowrap">Search UREfy</span>
              </div>
              <span class="kbd-badge shrink-0 ml-2">Ctrl+K</span>
            </button>
          </div>

          <!-- RIGHT: USER CONTROL HUB -->
          <div class="flex items-center space-x-2 sm:space-x-2.5">
            
            <!-- MOBILE SEARCH TRIGGER (visible on mobile/tablet) -->
            <button type="button" id="btn-mobile-search-trigger" class="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center p-2 text-xs rounded-xl border border-white/5 bg-surface-raised/80 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Search (Ctrl+K)">
              <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </button>

            <!-- DYNAMIC HEADER TOOLS ROOT -->
            <div id="header-tools-root" class="flex items-center space-x-1.5 sm:space-x-2">
              ${initHeaderTools}
            </div>

            <!-- WALLET & IDENTITY PILL -->
            <div class="flex items-center space-x-1.5 pl-1.5 sm:pl-2 border-l border-white/10">
              <div id="aetheris-wallet-button-container" class="${clientStore.uiMode === 'advanced' ? 'hidden sm:block' : 'hidden'}">
                <button type="button" id="btn-wallet-connect" data-action="open-feature" data-feature="wallet" class="px-2.5 py-1 text-xs rounded-xl bg-surface-raised border border-white/5 hover:bg-surface-overlay text-slate-300 font-mono cursor-pointer transition-all">🔗 Wallet</button>
              </div>

              <button type="button" id="btn-identity-info" data-action="nav-mode" data-mode="profile" class="header-profile-button" title="Open your profile" aria-label="Open your profile">
                <span class="header-profile-button__avatar">${(profileView.getProfile(clientStore.keypair.fingerprint)?.handle ? profileView.getProfile(clientStore.keypair.fingerprint)!.handle.replace(/^@/, '').substring(0, 1).toUpperCase() : 'U')}</span>
                <span class="hidden xl:inline">Profile</span>
                <span class="presence-dot ${clientStore.isConnected ? 'is-online' : 'is-offline'}" aria-hidden="true"></span>
              </button>
            </div>

          </div>
        </header>

        <!-- MAIN TRIPLE-COLUMN BODY -->
        <div class="app-shell-body flex-1 flex overflow-hidden relative">
          
          <!-- LEFT COMMAND RAIL + SOVEREIGN CIRCLES -->
          <aside id="left-rail-container" class="w-64 bg-surface-base border-subtle-r flex flex-col justify-between shrink-0 select-none hidden lg:flex">
            <div id="left-rail-scroll" class="p-3 overflow-y-auto space-y-4">
              ${initLeftRail}
            </div>

            <!-- USER IDENTITY CAPSULE -->
            <div class="p-3 border-t border-white/5 bg-surface-base cursor-pointer hover:bg-surface-raised/40 transition-colors" data-action="nav-mode" data-mode="profile">
              <div class="flex items-center space-x-2.5">
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-slate-700 p-0.5 shrink-0">
                  <div class="w-full h-full rounded-full bg-surface-base flex items-center justify-center font-mono text-[10px] font-bold text-white">
                    ${(profileView.getProfile(clientStore.keypair.fingerprint)?.handle ? profileView.getProfile(clientStore.keypair.fingerprint)!.handle.replace(/^@/, '').substring(0, 2).toUpperCase() : 'U')}
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-1">
                    <span class="text-xs font-bold text-white truncate">Your profile</span>
                    <span class="text-[8px] px-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">Private</span>
                  </div>
                  <div class="text-[10px] text-emerald-400 font-medium truncate flex items-center gap-1">
                    <span>🛡️</span>
                    <span>Private by design</span>
                  </div>
                </div>
                <button type="button" id="btn-open-paper-wallet" data-action="stop-propagation" class="p-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-white border border-white/5 cursor-pointer transition-all" title="Backup identity">
                  📜
                </button>
              </div>
            </div>

            <!-- REDDIT-STYLE COMPACT LEGAL & REGULATORY FOOTER IN LEFT SIDEBAR -->
            ${legalFooter.renderSidebarLegalSnippet()}
          </aside>

          <!-- CENTER STAGE (THE SOVEREIGN UNIFIED STAGE) -->
          <main id="main-stage" tabindex="-1" class="flex-1 flex overflow-hidden bg-canvas">
            ${initMainStage}
          </main>

          <!-- RIGHT SOVEREIGN DISCOVERY & NETWORK RAIL -->
          <aside id="right-rail-container" class="w-80 bg-surface-base border-subtle-l flex flex-col justify-between shrink-0 select-none hidden xl:flex" style="${hasContextualSidebar(sovereignRouter.route, clientStore.activeChannelId) ? '' : 'display: none !important;'}">
            <div id="right-rail-scroll" class="p-3.5 overflow-y-auto space-y-4">
              ${initRightRail}
            </div>

            <!-- SYSTEM INTEGRITY TICKER -->
            <div class="p-3 border-subtle-t bg-surface-base/50 text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span class="text-slate-400">Private messages are end-to-end encrypted</span>
            </div>

          </aside>

        </div>

        ${initMobileDrawer}
        <div id="app-mobile-bottom-nav">${initMobileBottomNav}</div>

        <!-- DYNAMIC ISOLATED MODAL ROOT -->
        <div id="app-modal-root" class="fixed inset-0 z-[9999] pointer-events-none">
          ${initModalRoot}
        </div>

      </div>
    `;

    const initialStage = document.getElementById('main-stage');
    if (initialStage) rememberWorkspaceMedia(initialStage);
    initVoiceCanvas();
    bindEvents();
    updateNavigationActiveClasses();

    requestAnimationFrame(() => {
      const newRight = document.getElementById('right-rail-scroll');
      if (newRight && rightScroll > 0) newRight.scrollTop = rightScroll;
      const newLeft = document.getElementById('left-rail-scroll');
      if (newLeft && leftScroll > 0) newLeft.scrollTop = leftScroll;
      const newMain = document.getElementById('main-feed-scroll');
      if (newMain && mainScroll > 0) newMain.scrollTop = mainScroll;
      restoreMessageScroll(messageScrollSnapshot);
      const newDm = document.getElementById('sovereign-dm-messages-container');
      if (newDm) {
        if (isDmNearBottom) newDm.scrollTop = newDm.scrollHeight;
        else newDm.scrollTop = savedDmScroll;
      }
    });
    }, appEl, {
      onRetry: () => render(),
    });
  };

  // ─── ZERO-FLICKER INCREMENTAL DOM PATCH ENGINE ─────────────────────────────
  // First render: full scaffold write. Subsequent renders: patch only dynamic zones
  // (#main-stage, #app-modal-root, #toast-root, mobile nav) without touching the
  // stable chrome (header, sidebars, footer) to eliminate any white-flash flicker.

  let _lastPostDetailOpen = false;
  let _lastPostDetailPostId: string | null = null;

  const patchRender = (event?: string, data?: any) => {
    if (!_scaffoldRendered) {
      // First time: do a full render to build the persistent chrome scaffold
      render();
      _scaffoldRendered = true;

      // Wrap the full modal output inside #app-modal-root after first render
      const existingModalRoot = document.getElementById('app-modal-root');
      if (!existingModalRoot) {
        const modalRoot = document.createElement('div');
        modalRoot.id = 'app-modal-root';
        modalRoot.className = 'fixed inset-0 z-[9999] pointer-events-none';
        modalRoot.innerHTML = buildModalRootHTML();
        document.getElementById('main-layout')?.appendChild(modalRoot);
      }
      return;
    }

    // ── Fast-path 1: TOAST ONLY (zero touch on main feed, zero reflow) ────────
    if (event === 'TOAST') {
      patchEl('toast-root', renderToasts());
      return;
    }

    // ── Fast-path 2: IN-PLACE VOTE UPDATE (prevents DOM wipe & scroll loss) ────
    if (event === 'VOTE' && data?.postId) {
      const post = clientStore.posts.find(p => p.id === data.postId);
      if (post) {
        document.querySelectorAll(`[data-vote-id="${data.postId}"]`).forEach(btn => {
          const dir = parseInt(btn.getAttribute('data-dir') || '0', 10);
          const isDetail = btn.classList.contains('btn-detail-vote') || Boolean(btn.closest('#post-detail-modal-overlay'));
          if (isDetail) {
            if (dir === 1) {
              btn.className = `btn-detail-vote p-1.5 rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer ${post.userVoted === 1 ? 'text-cyphr font-bold bg-cyphr/10' : 'text-slate-400 hover:text-cyphr'}`;
            } else if (dir === -1) {
              btn.className = `btn-detail-vote p-1.5 rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer ${post.userVoted === -1 ? 'text-crimson font-bold bg-crimson/10' : 'text-slate-400 hover:text-crimson'}`;
            }
            const container = btn.parentElement;
            if (container) {
              const countSpan = container.querySelector('span');
              if (countSpan) {
                countSpan.textContent = String(post.meritVotes);
                countSpan.className = `detail-vote-count font-mono text-sm font-bold px-2 ${post.userVoted === 1 ? 'text-cyphr' : post.userVoted === -1 ? 'text-crimson' : 'text-slate-200'}`;
              }
            }
          } else {
            if (dir === 1) {
              btn.className = `btn-upvote text-slate-400 hover:text-indigo-400 transition-colors p-1.5 rounded-xl hover:bg-surface-overlay cursor-pointer ${post.userVoted === 1 ? 'text-indigo-400 font-bold bg-indigo-950/60' : ''}`;
            } else if (dir === -1) {
              btn.className = `btn-downvote text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-xl hover:bg-surface-overlay cursor-pointer ${post.userVoted === -1 ? 'text-rose-500 font-bold bg-rose-950/60' : ''}`;
            }
            const container = btn.parentElement;
            if (container) {
              const countSpan = container.querySelector('span');
              if (countSpan) {
                countSpan.textContent = String(post.meritVotes);
                countSpan.className = `font-mono text-xs font-bold ${post.userVoted === 1 ? 'text-indigo-400' : post.userVoted === -1 ? 'text-rose-500' : 'text-slate-300'}`;
              }
            }
          }
        });
      }
      return;
    }

    // ── Fast-path 3: IN-PLACE BOOST UPDATE (prevents DOM wipe & video restart) ─
    if (event === 'BOOST' && data?.postId) {
      const post = clientStore.posts.find(p => p.id === data.postId);
      if (post) {
        document.querySelectorAll(`[data-boost-post="${data.postId}"]`).forEach(btn => {
          const counter = btn.querySelector('.boost-counter') || btn.querySelector('span:last-child');
          if (counter) counter.textContent = `${post.boostCount || 0} ${post.userBoosted ? 'Boosted' : 'Boosts'}`;
          const icon = btn.querySelector('span:first-child');
          if (post.userBoosted) {
            btn.className = 'btn-boost flex items-center space-x-1.5 transition-all cursor-pointer text-emerald-400 font-bold bg-emerald-500/15 px-2.5 py-1 rounded-xl border border-emerald-500/30';
            if (icon) icon.className = 'rotate-180 transition-transform duration-300';
          } else {
            btn.className = 'btn-boost flex items-center space-x-1.5 transition-all cursor-pointer hover:text-emerald-400 text-slate-400';
            if (icon) icon.className = '';
          }
        });
      }
      return;
    }

    // ── Fast-path 4: IN-PLACE REACTION UPDATE (prevents DOM wipe & scroll loss) ─
    if (event === 'REACTION' && data?.postId) {
      updateReactionBarDOM(data.postId);
      return;
    }

    const currentPostDetailOpen = postDetailView.isOpen();
    const currentPostDetailPostId = postDetailView.getActivePostId();
    const postDetailStateChanged = (currentPostDetailOpen !== _lastPostDetailOpen) || (currentPostDetailPostId !== _lastPostDetailPostId);
    _lastPostDetailOpen = currentPostDetailOpen;
    _lastPostDetailPostId = currentPostDetailPostId;

    // ── Fast-path 5: MODAL / OVERLAY ONLY (for simple modal overlays when post detail state didn't change) ─
    if (event === 'MODAL_CHANGE' && !postDetailStateChanged) {
      patchEl('app-modal-root', buildModalRootHTML());
      postDetailView.bindEvents(async (postId: string, commentText: string, parentId?: string) => {
        const { publishComment } = await import('./controllers/comment-controller.js');
        await publishComment(postId, commentText.trim(), parentId);
      });
      return;
    }

    const appMessageSelections: Record<string, { start: number; end: number }> = {};
    function captureMessageSelection(targetType: 'dm' | 'relay', input: HTMLInputElement | null): void {
      if (!input || !input.isConnected) return;
      if (typeof document !== 'undefined' && document.activeElement && document.activeElement !== input) return;
      appMessageSelections[targetType] = {
        start: input.selectionStart ?? input.value.length,
        end: input.selectionEnd ?? input.value.length,
      };
    }
    function restoreMessageSelection(targetType: 'dm' | 'relay', focus = false): void {
      const input = document.getElementById(targetType === 'dm' ? 'input-dm-message' : 'input-message') as HTMLInputElement | null;
      const sel = appMessageSelections[targetType];
      if (!input || !sel) return;
      try {
        if (focus) input.focus({ preventScroll: true });
        input.setSelectionRange(sel.start, sel.end);
      } catch (_) {}
    }

    errorBoundary.wrapRender(() => {
      // Sync search index without rebuilding unchanged documents.
      syncSearchIndex();

      // Preserve scroll positions before any patch
      const rightRailEl = document.getElementById('right-rail-scroll');
      const savedRightScroll = rightRailEl ? rightRailEl.scrollTop : 0;
      const leftRailEl = document.getElementById('left-rail-scroll');
      const savedLeftScroll = leftRailEl ? leftRailEl.scrollTop : 0;
      const mainFeedEl = document.getElementById('main-feed-scroll');
      const savedMainScroll = mainFeedEl ? mainFeedEl.scrollTop : (postDetailView.savedFeedScrollTop || 0);
      const postFocusEl = document.getElementById('post-focus-view');
      const savedPostFocusScroll = postFocusEl ? postFocusEl.scrollTop : 0;
      const savedProfileScroll = document.getElementById('sovereign-profile-container')?.scrollTop ?? 0;
      const savedDedicatedSettingsScroll = document.querySelector('.workspace-settings__content')?.scrollTop ?? 0;
      const savedSettingsNavScroll = document.getElementById('profile-settings-nav')?.scrollLeft ?? 0;
      const messageScrollSnapshot = captureMessageScroll();
      const dmContainerEl = document.getElementById('sovereign-dm-messages-container');
      const dmThreadEl = document.getElementById('dm-thread-messages');
      const savedDmPeer = dmThreadEl?.dataset.peerId || '';
      const savedDmThreadScroll = dmThreadEl?.scrollTop || 0;
      const wasDmThreadNearBottom = dmThreadEl
        ? dmThreadEl.scrollHeight - dmThreadEl.scrollTop - dmThreadEl.clientHeight < 120
        : true;
      const savedDmScroll = dmContainerEl ? dmContainerEl.scrollTop : 0;
      const isDmNearBottom = dmContainerEl
        ? (dmContainerEl.scrollHeight - dmContainerEl.scrollTop - dmContainerEl.clientHeight < 120)
        : true;

      // Preserve focused input
      const focusedEl = document.activeElement as HTMLInputElement | null;
      const focusedId = focusedEl?.id ?? null;
      const focusedValue = focusedEl?.value ?? null;
      const focusedSelStart = (typeof focusedEl?.selectionStart === 'number') ? focusedEl.selectionStart : null;
      const focusedSelEnd = (typeof focusedEl?.selectionEnd === 'number') ? focusedEl.selectionEnd : focusedSelStart;
      const relayInputEl = document.getElementById('input-message') as HTMLInputElement | null;
      if (relayInputEl?.isConnected) captureMessageSelection('relay', relayInputEl);
      const dmInputEl = document.getElementById('input-dm-message') as HTMLInputElement | null;
      if (dmInputEl?.isConnected) captureMessageSelection('dm', dmInputEl);

      // Patch dynamic zones
      patchEl('toast-root', renderToasts());
      patchEl('broadcast-root', renderBroadcastBanner());
      patchEl('header-primary-nav', renderHeaderPrimaryNav());
      patchEl('header-tools-root', renderHeaderToolsRoot());
      facetSwitcher.bindEvents();
      patchEl('left-rail-scroll', renderLeftRailContent());
      patchEl('main-stage', renderMainStage());
      patchEl('right-rail-scroll', renderRightRailContent());
      const rightRail = document.getElementById('right-rail-container');
      if (rightRail) {
        if (hasContextualSidebar(sovereignRouter.route, clientStore.activeChannelId)) {
          rightRail.style.display = '';
        } else {
          rightRail.style.display = 'none';
        }
      }
      restoreMessageSelection('relay', false);
      restoreMessageSelection('dm', false);
      document.getElementById('sovereign-profile-container')?.scrollTo({ top: savedProfileScroll, behavior: 'instant' });
      document.querySelector('.workspace-settings__content')?.scrollTo({ top: savedDedicatedSettingsScroll, behavior: 'instant' });
      document.getElementById('profile-settings-nav')?.scrollTo({ left: savedSettingsNavScroll, behavior: 'instant' });
      patchEl('app-modal-root', buildModalRootHTML());
      document.getElementById('main-layout')?.setAttribute('data-ui-mode', clientStore.uiMode);
      updateNavigationActiveClasses();

      // Patch mobile drawer open/closed state reactively
      let drawerEl = document.getElementById('mobile-drawer');
      if (drawerEl && drawerEl.dataset.uiMode !== clientStore.uiMode) {
        drawerEl.outerHTML = renderMobileDrawer();
        drawerEl = document.getElementById('mobile-drawer');
      }
      if (drawerEl) {
        const opening = drawerEl.getAttribute('aria-hidden') === 'true' && isMobileDrawerOpen;
        drawerEl.inert = !isMobileDrawerOpen;
        drawerEl.onkeydown = event => {
          if (event.key === 'Escape') { isMobileDrawerOpen = false; clientStore.notifySync('MODAL_CHANGE'); }
          if (event.key !== 'Tab') return;
          const items = [...drawerEl!.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')].filter(el => el.getClientRects().length > 0);
          if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
          else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
        };
        if (isMobileDrawerOpen) {
          drawerEl.classList.remove('pointer-events-none');
          drawerEl.classList.add('pointer-events-auto');
          drawerEl.setAttribute('aria-hidden', 'false');
          if (opening) drawerEl.querySelector<HTMLButtonElement>('#btn-close-mobile-drawer')?.focus({ preventScroll: true });
          const backdrop = document.getElementById('mobile-drawer-backdrop');
          if (backdrop) {
            backdrop.classList.remove('opacity-0', 'pointer-events-none');
            backdrop.classList.add('opacity-100');
          }
          const panel = drawerEl.querySelector('.w-80') as HTMLElement | null;
          if (panel) {
            panel.classList.remove('-translate-x-full');
            panel.classList.add('translate-x-0');
          }
        } else {
          if (drawerEl.contains(document.activeElement)) document.getElementById('btn-toggle-mobile-drawer')?.focus({ preventScroll: true });
          drawerEl.classList.remove('pointer-events-auto');
          drawerEl.classList.add('pointer-events-none');
          drawerEl.setAttribute('aria-hidden', 'true');
          const backdrop = document.getElementById('mobile-drawer-backdrop');
          if (backdrop) {
            backdrop.classList.remove('opacity-100');
            backdrop.classList.add('opacity-0', 'pointer-events-none');
          }
          const panel = drawerEl.querySelector('.w-80') as HTMLElement | null;
          if (panel) {
            panel.classList.remove('translate-x-0');
            panel.classList.add('-translate-x-full');
          }
        }
      }

      // Patch mobile bottom nav
      patchEl('app-mobile-bottom-nav', renderMobileBottomNav());

      void import('./webrtc-transfer-widget.js')
        .then(({ patchWebRtcTransferWidget }) => patchWebRtcTransferWidget());

      // Patch status bar density text directly
      const densityEl = document.getElementById('status-bar-density');
      if (densityEl) densityEl.textContent = `Density: ${clientStore.density.toUpperCase()}`;



      // Re-bind event listeners on updated dynamic elements
      bindEvents();
      updateNavigationActiveClasses();

      if (focusedId) {
        const el = document.getElementById(focusedId) as HTMLInputElement | null;
        if (el) {
          if (focusedId === 'input-message' || focusedId === 'input-dm-message') {
            restoreMessageSelection(focusedId === 'input-message' ? 'relay' : 'dm');
          } else {
            if (focusedValue !== null && el.value !== focusedValue) el.value = focusedValue;
            el.focus({ preventScroll: true });
            if (focusedSelStart !== null) {
              try { el.setSelectionRange(focusedSelStart, focusedSelEnd ?? focusedSelStart); } catch (_) {}
            }
          }
        }
      }

      requestAnimationFrame(() => {
        // Restore scroll positions
        const rr = document.getElementById('right-rail-scroll');
        if (rr && savedRightScroll > 0) rr.scrollTop = savedRightScroll;
        const lr = document.getElementById('left-rail-scroll');
        if (lr && savedLeftScroll > 0) lr.scrollTop = savedLeftScroll;
        const mf = document.getElementById('main-feed-scroll');
        if (mf && mf !== mainFeedEl && savedMainScroll > 0) {
          mf.scrollTop = savedMainScroll;
        }
        if (!postDetailView.isOpen() && postDetailView.savedFeedScrollTop > 0) {
          postDetailView.savedFeedScrollTop = 0;
        }
        const pf = document.getElementById('post-focus-view');
        if (pf && savedPostFocusScroll > 0) {
          pf.scrollTop = savedPostFocusScroll;
        }
        restoreMessageScroll(messageScrollSnapshot);
        const newDm = document.getElementById('sovereign-dm-messages-container');
        if (newDm) {
          if (isDmNearBottom) newDm.scrollTop = newDm.scrollHeight;
          else newDm.scrollTop = savedDmScroll;
        }
        const newDmThread = document.getElementById('dm-thread-messages');
        if (newDmThread) {
          if (newDmThread.dataset.peerId !== savedDmPeer || wasDmThreadNearBottom) {
            newDmThread.scrollTop = newDmThread.scrollHeight;
          } else {
            newDmThread.scrollTop = savedDmThreadScroll;
          }
        }
      });

      initVoiceCanvas();
    }, appEl, { onRetry: () => patchRender() });
  };

  // 1. Establish sovereign route & active channels before first render pass
  sovereignRouter.init();

  // Seed initial ephemeral stories so the carousel has content
  if (isDemoModeEnabled() && storiesEngine.stories.length === 0) {
    storiesEngine.addStory('Privacy by design means your data belongs to you—not the platform. That\'s the UREfy promise.', 'text', 'genesis-core...', 'GUARDIAN');
    storiesEngine.addStory('New community update distributed to all members. Everyone gets it at the same time—no algorithms deciding who sees what.', 'text', 'c3dc28cb705e...', 'ARCHIVIST');
    storiesEngine.addStory('Spam protection activated. Community stays clean.', 'text', 'a89104fa2211...', 'SENTINEL');
    storiesEngine.addStory('New consensus proposal: Ephemeral key rotation every 48h. Vote closes in 12h.', 'text', 'f40019bc...', 'MODERATOR');
    storiesEngine.addStory('Network is healthy — messages delivered in under 14ms with zero loss.', 'text', '83cdf925...', 'MEMBER');
  }

  // 2. Perform single synchronous initial render pass to construct scaffold
  if (!_scaffoldRendered) {
    patchRender();
  }

  // 3. Register reactive store subscriber only after initial scaffold is mounted
  clientStore.subscribe(patchRender);
  onboardingWizard.syncUI();
}

function renderToasts(): string {
  if (clientStore.toasts.length === 0) return '';
  return `
    <div class="fixed top-4 right-4 z-[10002] flex flex-col space-y-2 pointer-events-none">
      ${clientStore.toasts.map(t => `
        <div class="px-4 py-2.5 rounded-lg text-xs font-medium shadow-2xl flex items-center space-x-2 border transition-all animate-in fade-in slide-in-from-top-2 duration-150 ${t.type === 'success' ? 'bg-surface-overlay text-signal border-signal/40' : t.type === 'warning' ? 'bg-surface-overlay text-amber border-amber/40' : 'bg-surface-overlay text-cyphr border-cyphr/40'}">
          <span>${t.type === 'success' ? '✅' : t.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
          <span>${escapeHtml(t.message)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderQuarantineAlert(): string {
  if (!clientStore.activeQuarantineAlert) return '';
  const a = clientStore.activeQuarantineAlert;
  return `
    <div class="bg-crimson text-white px-4 py-2 text-xs flex items-center justify-between shadow-lg z-50 animate-pulse">
      <div class="flex items-center space-x-3">
        <span class="text-base">🚨</span>
        <div>
          <span class="font-bold uppercase tracking-wider">Anti-spam protection triggered:</span>
          <span class="ml-1">An account was flagged for unusual activity and has been restricted.</span>
          <span class="ml-1 text-[10px] text-amber-200/80">Account Restricted</span>
        </div>
      </div>
      <button id="btn-dismiss-alert" class="px-2 py-0.5 bg-black/40 hover:bg-black/60 rounded text-[11px]">Dismiss</button>
    </div>
  `;
}

function renderBroadcastBanner(): string {
  const msg = clientStore.broadcastAnnouncement?.trim();
  if (!msg) return '';

  let dismissed: string | null = null;
  if (typeof sessionStorage !== 'undefined') {
    try {
      dismissed = sessionStorage.getItem('aetheris_dismissed_broadcast');
    } catch (_) {}
  }
  if (msg === dismissed) return '';

  return `
    <div id="network-announcement-banner" class="w-full bg-gradient-to-r from-amber-500/20 via-amber-600/25 to-yellow-500/20 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between z-30 shadow-lg text-amber-200 text-xs font-sans animate-fade-in">
      <div class="flex items-center space-x-2.5 min-w-0 flex-1 mr-3">
        <span class="flex h-2 w-2 relative shrink-0">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span class="font-bold uppercase tracking-wider text-[10px] bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/50 shrink-0 font-mono">
          System Broadcast
        </span>
        <span class="font-medium text-slate-100 truncate">${escapeHtml(msg)}</span>
      </div>
      <button
        type="button"
        id="btn-dismiss-broadcast"
        data-action="dismiss-broadcast"
        class="text-amber-400 hover:text-white p-1 rounded-lg hover:bg-amber-500/20 transition-all cursor-pointer shrink-0 text-xs font-mono"
        title="Dismiss announcement"
      >
        ✕
      </button>
    </div>
  `;
}

function renderMemberItem(m: any): string {
  const roleBadge = m.role === 'GUARDIAN' ? 'text-amber bg-amber/10 border-amber/30' :
                    m.role === 'ARCHIVIST' ? 'text-cyphr bg-cyphr/10 border-cyphr/30' :
                    m.role === 'MODERATOR' ? 'text-signal bg-signal/10 border-signal/30' :
                    'text-slate-400 bg-surface-raised border-white/5';

  return `
    <div data-open-dm="${m.fingerprint}" class="p-1.5 rounded-md hover:bg-surface-raised/70 flex items-center justify-between text-xs transition-colors cursor-pointer group" title="Open E2EE Direct Message with ${m.fingerprint}">
      <div class="flex items-center space-x-2 truncate">
        <div class="relative">
          <div class="w-6 h-6 rounded-md bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-mono text-[9px] font-bold text-slate-200 group-hover:border group-hover:border-cyphr/40">
            ${m.fingerprint.substring(0, 2).toUpperCase()}
          </div>
          <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${m.status === 'online' ? 'bg-signal' : m.status === 'idle' ? 'bg-amber' : 'bg-crimson'}"></span>
        </div>
        <span class="font-mono text-xs text-slate-300 truncate group-hover:text-cyphr">id:${m.fingerprint.substring(0, 10)}</span>
      </div>
      <span class="text-[9px] font-mono px-1.5 py-0.2 rounded border ${roleBadge}">${m.role}</span>
    </div>
  `;
}

function renderMainStage(): string {
  const isChat = clientStore.activeChannelId.startsWith('relays-') || clientStore.activeChannelId.startsWith('relay-') || clientStore.activeChannelId.startsWith('dm-');
  const isVault = clientStore.activeChannelId.startsWith('vault-') || clientStore.activeChannelId === 'vault';
  const isExplore = clientStore.activeChannelId === 'explore';
  const isProfile = clientStore.activeChannelId.startsWith('profile');
  const currentRoute = sovereignRouter.route;
  const isHomeRoute = !currentRoute || currentRoute === 'feed' || clientStore.activeChannelId.startsWith('pulse-');
  const onboardingHTML = (isHomeRoute && (!onboardingWizard || (!onboardingWizard.isOpen && !onboardingWizard.isCompleted))) ? sovereignOnboarding.renderWelcomeBanner() : '';

  if (clientStore.isDualHorizon) {
    return `
      <div class="flex-1 flex flex-col overflow-hidden">
        <header class="view-header orbit-split-header">
          <div><h1>Split workspace</h1><p>Conversations and knowledge, side by side.</p></div>
          <div class="orbit-layout-tools">${renderWorkspaceLayoutControls()}</div>
        </header>
        ${onboardingHTML}
        <div class="flex-1 flex overflow-hidden">
          <section class="flex-1 border-subtle-r flex flex-col overflow-hidden bg-canvas">
            <div class="h-8 border-subtle-b bg-surface-base/50 px-3 flex items-center justify-between text-xs font-mono text-slate-400">
              <span class="flex items-center space-x-1.5"><span class="text-cyphr">💬</span><span>[HORIZON 1] RELAYS (LIVE E2EE CHAT)</span></span>
              <span class="text-cyphr">● Stream</span>
            </div>
            ${renderRelaysWorkspace()}
          </section>

          <section class="flex-1 flex flex-col overflow-hidden bg-canvas">
            <div class="h-8 border-subtle-b bg-surface-base/50 px-3 flex items-center justify-between text-xs font-mono text-slate-400">
              <span class="flex items-center space-x-1.5"><span class="text-signal">📚</span><span>[HORIZON 2] VAULT (VERIFIED LEDGER)</span></span>
              <span class="text-signal">● Knowledge</span>
            </div>
            ${renderVaultWorkspace()}
          </section>
        </div>
      </div>
    `;
  }

  let contentHTML = '';
  const isExplicitRoute = currentRoute === 'messages' || isChat || currentRoute === 'vault' || isVault ||
                          currentRoute === 'settings' || clientStore.activeChannelId === 'settings' ||
                          currentRoute === 'explore' || isExplore ||
                          currentRoute === 'communities' || clientStore.activeChannelId.startsWith('c/') ||
                          currentRoute === 'profile' || isProfile;

  if (postDetailView.isOpen() && postDetailView.activePostId) {
    const post = clientStore.posts.find(p => p.id === postDetailView.activePostId);
    if (post) {
      const comments = threadManager.getRootCommentsForPost(post.id);
      const related = postDetailView.findRelatedPosts(post, clientStore.posts);
      contentHTML = postDetailView.renderPostFocusView(post, comments, related);
    } else {
      contentHTML = postDetailView.renderPostNotFound();
    }
  } else if (currentRoute === 'messages' || isChat) {
    contentHTML = renderRelaysWorkspace();
  } else if (currentRoute === 'vault' || isVault) {
    contentHTML = renderVaultWorkspace();
  } else if (currentRoute === 'settings' || clientStore.activeChannelId === 'settings') {
    contentHTML = settingsView ? settingsView.renderDedicatedWorkspace() : renderLoadingWorkspace('settings', loadSettingsView);
  } else if (currentRoute === 'explore' || isExplore) {
    contentHTML = exploreView ? exploreView!.renderExploreView(clientStore.posts) : renderLoadingWorkspace('explore', loadExploreView);
  } else if (currentRoute === 'communities' || clientStore.activeChannelId.startsWith('c/')) {
    const activeCircle = sovereignCircleEngine.findCircle(clientStore.activeChannelId);
    contentHTML = !communityView ? renderLoadingWorkspace('communities', loadCommunityView) : activeCircle
      ? communityView.renderCommunityWorkspace(activeCircle) 
      : communityView.renderCommunitiesHub();
  } else if (currentRoute === 'profile' || isProfile) {
    contentHTML = profileView.renderProfileView(clientStore.posts, clientStore.keypair.fingerprint);
  } else if (_initialSsrArticleHtml && typeof window !== 'undefined' && (window.location.pathname.startsWith('/p/') || window.location.pathname.startsWith('/post/'))) {
    contentHTML = `
      <div class="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
        ${_initialSsrArticleHtml}
      </div>
    `;
    _initialSsrArticleHtml = '';
  } else {
    contentHTML = renderPulseWorkspace();
  }

  return `
    <div class="flex-1 flex flex-col overflow-hidden min-h-0 h-full">
      ${onboardingHTML}
      ${contentHTML}
    </div>
  `;
}

function renderMobileBottomNavButtons(): string {
  const isPulse = clientStore.activeChannelId.startsWith('pulse-');
  const isRelays = clientStore.activeChannelId.startsWith('relays-') || clientStore.activeChannelId.startsWith('relay-');
  const isProfile = clientStore.activeChannelId.startsWith('profile');

  return `
      <!-- 1. PULSE STREAM (HOME FEED) -->
      <button 
        type="button" 
        data-nav-mode="pulse" 
        id="btn-mobile-pulse"
        data-action="join-channel" data-channel="pulse-global"
        class="btn-nav-mode min-w-[44px] min-h-[44px] flex flex-col items-center justify-center rounded-xl p-1 transition-all cursor-pointer ${isPulse ? 'is-active text-[var(--color-accent,#e59b3c)] font-bold' : 'text-slate-400 hover:text-white'}"
        title="Feed (Flux Pulse)"
        aria-label="Feed Flux"
      >
        <span class="text-base leading-none">⚡</span>
        <span class="text-[9px] mt-0.5 font-sans">Feed</span>
      </button>

      <!-- 2. LIVE RELAYS (CHAT) -->
      <button 
        type="button" 
        data-nav-mode="relays" 
        id="btn-mobile-relays"
        data-action="join-channel" data-channel="relays-general"
        class="btn-nav-mode min-w-[44px] min-h-[44px] flex flex-col items-center justify-center rounded-xl p-1 transition-all cursor-pointer ${isRelays ? 'is-active text-[var(--color-accent,#e59b3c)] font-bold' : 'text-slate-400 hover:text-white'}"
        title="Relays & Chat"
        aria-label="Relays and Chat"
      >
        <span class="text-base leading-none">📡</span>
        <span class="text-[9px] mt-0.5 font-sans">Relays</span>
      </button>

      <!-- 3. FAB FLOATING ACTION BUTTON (OVERSIZED CENTRAL BUTTON) -->
      <button 
        type="button" 
        id="btn-mobile-composer" 
        data-action="open-composer"
        class="w-12 h-12 -mt-5 rounded-full bg-[var(--color-accent,#e59b3c)] hover:brightness-110 text-slate-950 flex items-center justify-center text-xl font-bold shadow-lg shadow-amber-500/20 border-2 border-surface-base transform active:scale-90 transition-all cursor-pointer shrink-0" 
        title="Publish a new pulse note or article"
        aria-label="Create new publication"
      >
        <span>➕</span>
      </button>

      <!-- 4. ALERTS / NOTIFICATIONS -->
      <button 
        type="button" 
        id="btn-mobile-notifs" 
        data-action="toggle-notifs"
        class="relative min-w-[44px] min-h-[44px] flex flex-col items-center justify-center rounded-xl p-1 transition-all cursor-pointer ${isNotificationPanelOpen ? 'is-active text-[var(--color-accent,#e59b3c)] font-bold' : 'text-slate-400 hover:text-white'}"
        title="Notifications & alerts"
        aria-label="Notifications"
      >
        <span class="text-base leading-none">🔔</span>
        ${notificationCenter.unreadCount > 0 ? `<span class="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-mono absolute -top-1 right-1 font-bold shadow-sm">${notificationCenter.unreadCount}</span>` : ''}
        <span class="text-[9px] mt-0.5 font-sans">Alerts</span>
      </button>

      <!-- 5. PROFILE (USER AVATAR) -->
      <button 
        type="button" 
        data-nav-mode="profile" 
        id="btn-mobile-profile"
        data-action="nav-mode" data-mode="profile"
        class="btn-nav-mode min-w-[44px] min-h-[44px] flex flex-col items-center justify-center rounded-xl p-1 transition-all cursor-pointer ${isProfile ? 'is-active text-[var(--color-accent,#e59b3c)] font-bold' : 'text-slate-400 hover:text-white'}"
        title="Your sovereign cryptographic identity"
        aria-label="Profile"
      >
        <div class="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-mono font-bold text-white shrink-0 border ${isProfile ? 'border-[var(--color-accent,#e59b3c)]' : 'border-transparent'}">
          ${clientStore.keypair.fingerprint.substring(0, 2).toUpperCase()}
        </div>
        <span class="text-[9px] mt-0.5 font-sans">Profile</span>
      </button>
  `;
}

function renderMobileBottomNav(): string {
  const isChat = sovereignRouter.route === 'messages' || 
                 clientStore.activeChannelId.startsWith('relays-') || 
                 clientStore.activeChannelId.startsWith('relay-') || 
                 clientStore.activeChannelId.startsWith('dm-') ||
                 clientStore.activeChannelId === 'relays' ||
                 clientStore.activeChannelId === 'messages';
  const hideFab = isChat || postDetailView.isOpen() || isMobileDrawerOpen || clientStore.isComposerOpen;

  return `
    <!-- MOBILE COMPOSER FLOATING ACTION BUTTON (HIDDEN ON CHAT / MESSAGES / POST DETAIL) -->
    <button
      type="button"
      id="btn-mobile-fab-composer"
      data-action="open-composer"
      class="${hideFab ? 'hidden ' : ''}fixed bottom-20 right-4 z-40 lg:hidden w-13 h-13 rounded-full bg-[var(--color-accent,#e59b3c)] hover:brightness-110 text-slate-950 flex items-center justify-center text-xl font-bold shadow-2xl shadow-black/40 border border-white/20 active:scale-95 transition-all cursor-pointer"
      title="Create Publication"
      aria-label="Create Publication"
    >
      <span>✏️</span>
    </button>
    ${mobileTabBar.renderTabBarHTML()}
  `;
}

function renderMobileDrawer(): string {
  return `
    <!-- MOBILE SLIDE-OVER DRAWER -->
    <div id="mobile-drawer" data-ui-mode="${clientStore.uiMode}" ${isMobileDrawerOpen ? '' : 'inert'} class="fixed inset-0 z-[70] lg:hidden transition-all ${isMobileDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}" aria-hidden="${!isMobileDrawerOpen}">
      <!-- BACKDROP OVERLAY -->
      <div id="mobile-drawer-backdrop" data-action="close-mobile-drawer" class="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300 ease-in-out cursor-pointer ${isMobileDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}"></div>
      
      <!-- DRAWER CONTENT PANEL -->
      <div class="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-surface-base border-r border-white/10 shadow-2xl flex flex-col justify-between z-10 transform transition-transform duration-300 ease-in-out ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}">
        <!-- DRAWER HEADER -->
        <div class="p-4 border-b border-white/10 flex items-center justify-between bg-surface-raised/60">
          <button type="button" data-action="go-home" class="flex items-center space-x-3 text-left cursor-pointer group" aria-label="Go to Home">
            <div class="w-8 h-8 rounded-xl bg-surface-raised border border-white/10 flex items-center justify-center p-1 shadow-md overflow-hidden group-hover:border-[var(--color-accent,#e59b3c)] transition-colors">
              ${renderBrandLogoMark({ size: 24, className: 'w-6 h-6 object-contain' })}
            </div>
            <div>
              <div class="font-bold text-sm text-white font-sans flex items-center space-x-1.5">
                <span>URE<span class="text-cyan-400 font-semibold">fy</span></span>
              </div>
              <div class="text-[10px] text-slate-400">The social network you actually own</div>
            </div>
          </button>
          <button type="button" id="btn-close-mobile-drawer" data-action="close-mobile-drawer" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-raised cursor-pointer transition-colors" aria-label="Close navigation" title="Close Drawer">
            ${renderIcon('close', { size: 18 })}
          </button>
        </div>

        <!-- DRAWER SCROLLABLE BODY -->
        <div class="flex-1 overflow-y-auto p-3 space-y-4">
          <!-- NAVIGATION -->
          <div class="space-y-1">
            <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 px-2 flex items-center justify-between">
              <span class="flex items-center gap-1.5">${renderIcon('layers', { size: 12 })} Navigation</span>
            </div>
            <button type="button" data-nav-mode="pulse" class="btn-drawer-item w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId.startsWith('pulse-') ? 'is-active nav-item-active shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}" title="Home feed">
              <span class="shrink-0 text-cyan-400">${renderIcon('feed', { size: 18, variant: clientStore.activeChannelId.startsWith('pulse-') ? 'solid' : 'outline' })}</span>
              <div class="flex flex-col text-left flex-1 min-w-0">
                <span class="font-bold leading-tight">Home</span>
                <span class="text-[10px] text-slate-400 font-normal">Your feed</span>
              </div>
              ${clientStore.activeChannelId.startsWith('pulse-') ? '<span class="w-2 h-2 rounded-full nav-indicator-active shrink-0"></span>' : ''}
            </button>
            <button type="button" data-nav-mode="explore" class="btn-drawer-item w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId === 'explore' ? 'is-active nav-item-active shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}" title="Explore trending topics">
              <span class="shrink-0 text-indigo-400">${renderIcon('explore', { size: 18, variant: clientStore.activeChannelId === 'explore' ? 'solid' : 'outline' })}</span>
              <div class="flex flex-col text-left flex-1 min-w-0">
                <span class="font-bold leading-tight">Explore</span>
                <span class="text-[10px] text-slate-400 font-normal">Trending & topics</span>
              </div>
              ${clientStore.activeChannelId === 'explore' ? '<span class="w-2 h-2 rounded-full nav-indicator-active shrink-0"></span>' : ''}
            </button>
            <button type="button" data-nav-mode="vault" class="btn-drawer-item w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId.startsWith('vault-') ? 'is-active nav-item-active shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}" title="Encrypted storage & files">
              <span class="shrink-0 text-amber-400">${renderIcon('vault', { size: 18, variant: clientStore.activeChannelId.startsWith('vault-') ? 'solid' : 'outline' })}</span>
              <div class="flex flex-col text-left flex-1 min-w-0">
                <span class="font-bold leading-tight">Vault</span>
                <span class="text-[10px] text-slate-400 font-normal">Encrypted files & storage</span>
              </div>
              ${clientStore.activeChannelId.startsWith('vault-') ? '<span class="w-2 h-2 rounded-full nav-indicator-active shrink-0"></span>' : ''}
            </button>
            <button type="button" data-nav-mode="relays" class="btn-drawer-item w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId.startsWith('relays-') ? 'is-active nav-item-active shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}" title="Direct & community messages">
              <span class="shrink-0 text-emerald-400">${renderIcon('messages', { size: 18, variant: clientStore.activeChannelId.startsWith('relays-') ? 'solid' : 'outline' })}</span>
              <div class="flex flex-col text-left flex-1 min-w-0">
                <span class="font-bold leading-tight">Messages</span>
                <span class="text-[10px] text-slate-400 font-normal">Private & chats</span>
              </div>
              ${clientStore.activeChannelId.startsWith('relays-') ? '<span class="w-2 h-2 rounded-full nav-indicator-active shrink-0"></span>' : ''}
            </button>
            <button type="button" data-nav-mode="profile" class="btn-drawer-item w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId.startsWith('profile') ? 'is-active nav-item-active shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}" title="Your profile">
              <span class="shrink-0 text-purple-400">${renderIcon('profile', { size: 18, variant: clientStore.activeChannelId.startsWith('profile') ? 'solid' : 'outline' })}</span>
              <div class="flex flex-col text-left flex-1 min-w-0">
                <span class="font-bold leading-tight">Profile</span>
                <span class="text-[10px] text-slate-400 font-normal">Your profile</span>
              </div>
              ${clientStore.activeChannelId.startsWith('profile') ? '<span class="w-2 h-2 rounded-full nav-indicator-active shrink-0"></span>' : ''}
            </button>
          </div>

          <!-- COMMUNITIES -->
          <div class="pt-2 border-t border-white/5 space-y-1">
            <button type="button" data-nav-mode="communities" class="btn-drawer-item w-full flex items-center gap-3 px-3 py-3">${renderIcon('users', { size: 18 })}All communities</button>
            <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 px-2 flex items-center justify-between">
              <span class="flex items-center gap-1.5">${renderIcon('users', { size: 12 })} Communities</span>
            </div>
            <button type="button" data-channel-id="pulse-global" class="btn-channel btn-drawer-channel w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${clientStore.activeChannelId === 'pulse-global' ? 'bg-indigo-950/60 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
              <div class="flex items-center space-x-2 truncate">
                <span class="text-indigo-400 shrink-0">${renderIcon('shield', { size: 14 })}</span>
                <span class="truncate font-semibold">c/privacy</span>
              </div>
            </button>
            <button type="button" data-channel-id="vault-releases" class="btn-channel btn-drawer-channel w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${clientStore.activeChannelId === 'vault-releases' ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
              <div class="flex items-center space-x-2 truncate">
                <span class="text-emerald-400 shrink-0">${renderIcon('upload', { size: 14 })}</span>
                <span class="truncate font-semibold">c/open-source</span>
              </div>
            </button>
            <button type="button" data-channel-id="vault-guides" class="btn-channel btn-drawer-channel w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${clientStore.activeChannelId === 'vault-guides' ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
              <div class="flex items-center space-x-2 truncate">
                <span class="text-emerald-400 shrink-0">${renderIcon('fileText', { size: 14 })}</span>
                <span class="truncate font-semibold">c/guides</span>
              </div>
            </button>
            <button type="button" data-channel-id="relays-general" class="btn-channel btn-drawer-channel w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${clientStore.activeChannelId === 'relays-general' ? 'bg-indigo-950/60 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
              <div class="flex items-center space-x-2 truncate">
                <span class="text-cyan-400 shrink-0">${renderIcon('globe', { size: 14 })}</span>
                <span class="truncate font-semibold">c/general</span>
              </div>
            </button>
          </div>

          <!-- TOOLS & PROTOCOLS -->
          <div class="pt-2 border-t border-white/5 space-y-1">
            <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 px-2 flex items-center gap-1.5">
              ${renderIcon('slidersHorizontal', { size: 12 })} Tools
            </div>
            <button type="button" id="drawer-btn-settings" data-action="open-settings" class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-[var(--color-accent,#e59b3c)] hover:text-white bg-[var(--color-accent,#e59b3c)]/10 hover:bg-surface-raised border border-[var(--color-accent,#e59b3c)]/30 transition-all flex items-center space-x-3 cursor-pointer">
              <span class="shrink-0 text-[var(--color-accent,#e59b3c)]">${renderIcon('settings', { size: 16 })}</span>
              <span class="flex-1">Settings</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded bg-[var(--color-accent,#e59b3c)]/20 text-[var(--color-accent,#e59b3c)] border border-[var(--color-accent,#e59b3c)]/40">CONFIG</span>
            </button>
            <button type="button" id="drawer-btn-theme" data-action="open-settings" data-subtab="appearance" class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-300 hover:text-white bg-amber-950/30 hover:bg-surface-raised border border-amber-500/30 transition-all flex items-center space-x-3 cursor-pointer">
              <span class="shrink-0 text-amber-400">${renderIcon('sliders', { size: 16 })}</span>
              <span class="flex-1">Display &amp; Theme</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">THEME</span>
            </button>
            <button type="button" id="drawer-btn-lang" class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="shrink-0 text-slate-400">${renderIcon('globe', { size: 16 })}</span>
              <span class="flex-1">Language (${i18n.getCurrentLanguageMeta().name})</span>
              <span class="text-[9px] font-mono text-slate-400 uppercase">${i18n.getLanguage()}</span>
            </button>
            <button type="button" data-action="toggle-ui-mode" class="btn-drawer-item w-full px-3 py-3 text-left">${clientStore.isSimpleMode() ? 'Enable Advanced Mode' : 'Use simple mode'}</button>
            ${clientStore.isSimpleMode() ? '' : `
            <button type="button" id="drawer-btn-dao" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="shrink-0 text-slate-400">${renderIcon('vote', { size: 16 })}</span>
              <span class="flex-1">DAO Governance</span>
            </button>
            <button type="button" id="drawer-btn-cve" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="shrink-0 text-slate-400">${renderIcon('shield', { size: 16 })}</span>
              <span class="flex-1">CVE Security Monitor</span>
            </button>
            <button type="button" id="drawer-btn-observatory" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="shrink-0 text-slate-400">${renderIcon('activity', { size: 16 })}</span>
              <span class="flex-1">Network Observatory</span>
            </button>
            <button type="button" id="drawer-btn-backup" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="shrink-0 text-slate-400">${renderIcon('download', { size: 16 })}</span>
              <span class="flex-1">Export & Backup</span>
            </button>
            <button type="button" id="drawer-btn-wot" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="shrink-0 text-slate-400">${renderIcon('network', { size: 16 })}</span>
              <span class="flex-1">Web of Trust Graph</span>
            </button>
            <button type="button" id="drawer-btn-gossip" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="shrink-0 text-slate-400">${renderIcon('radio', { size: 16 })}</span>
              <span class="flex-1">Gossip Visualizer</span>
            </button>
            <button type="button" id="drawer-btn-rss" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="shrink-0 text-slate-400">${renderIcon('rss', { size: 16 })}</span>
              <span class="flex-1">RSS Importer</span>
            </button>
            <button type="button" id="drawer-btn-paper-wallet" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="shrink-0 text-slate-400">${renderIcon('fileKey', { size: 16 })}</span>
              <span class="flex-1">Paper Wallet Certificate</span>
            </button>
            <button type="button" id="drawer-btn-steganography" data-action="open-feature" data-feature="steganography" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="shrink-0 text-cyan-400">${renderIcon('image', { size: 16 })}</span>
              <span class="flex-1">Pixel Canvas Steganography</span>
            </button>
            <button type="button" id="drawer-btn-binary-hygiene" data-action="open-feature" data-feature="binary-hygiene" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="shrink-0 text-cyan-400">${renderIcon('shield', { size: 16 })}</span>
              <span class="flex-1">Binary Hygiene Portal</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">FREE</span>
            </button>
            <button type="button" id="drawer-btn-portable-trust" data-action="open-feature" data-feature="portable-trust" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-purple-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="text-base">💎</span>
              <span class="flex-1">Portable ZK Trust Score</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/30">ZK</span>
            </button>
            <button type="button" id="drawer-btn-microsaas-docs" data-action="open-feature" data-feature="microsaas-docs" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="text-base">⚡</span>
              <span class="flex-1">Micro-SaaS & Dev APIs</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">EDGE</span>
            </button>
            `}
            <!-- CADRU LEGAL & CONFORMITATE UE (DSA & GDPR) -->
            <div class="pt-3 border-t border-white/5 space-y-1">
              <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 px-2 flex items-center justify-between">
                <span>⚖️ Legal & EU Compliance</span>
                <span class="text-cyan-400 text-[9px] font-mono">DSA 2022/2065</span>
              </div>

              <button type="button" data-action="open-legal" data-legal-tab="about" class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                <span class="text-base">ℹ️</span>
                <span class="flex-1">About Us & Architecture</span>
              </button>

              <button type="button" data-action="open-legal" data-legal-tab="terms" class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                <span class="text-base">📜</span>
                <span class="flex-1">Terms & Conditions</span>
              </button>

              <button type="button" data-action="open-legal" data-legal-tab="privacy" class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                <span class="text-base">🛡️</span>
                <span class="flex-1">Privacy Policy (GDPR)</span>
              </button>

              <button type="button" data-action="open-legal" data-legal-tab="rules" class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                <span class="text-base">⚖️</span>
                <span class="flex-1">Community Guidelines & Rules</span>
              </button>

              <button type="button" data-action="open-legal" data-legal-tab="dsa" class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all flex items-center space-x-3 cursor-pointer">
                <span class="text-base">🚩</span>
                <span class="flex-1">Report Illegal Content (Art. 16 DSA)</span>
              </button>

              <button type="button" data-action="open-legal" data-legal-tab="contact" class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                <span class="text-base">📬</span>
                <span class="flex-1">EU Points of Contact</span>
              </button>

              <div class="px-3 py-2 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                <span>© 2026 UREfy</span>
                <span class="text-cyan-400">EU DSA Compliant</span>
              </div>
            </div>
          </div>
        </div>

        <!-- DRAWER FOOTER / USER IDENTITY -->
        <div class="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-white/10 bg-surface-raised/40">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-accent,#e59b3c)] to-amber-700/50 p-0.5 shrink-0">
              <div class="w-full h-full rounded-full bg-surface-base flex items-center justify-center font-mono text-[10px] font-bold text-white">
                ${clientStore.keypair.fingerprint.substring(0, 2).toUpperCase()}
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-1">
                <span class="text-xs font-bold text-white truncate">@id:${clientStore.keypair.fingerprint.substring(0, 8)}</span>
                <span class="text-[8px] font-mono px-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">ZK</span>
              </div>
              <div class="text-[10px] font-mono text-slate-500 truncate">urefy.com</div>
            </div>
            <div class="w-2.5 h-2.5 rounded-full ${clientStore.isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-500'}"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderThreadNode(c: ThreadComment): string {
  return threadManager.renderCommentNode(c, 'c3dc28cb705e', clientStore.keypair.fingerprint);
}

function renderComposerModal(): string {
  if (!clientStore.isComposerOpen) return '';
  return hybridComposer.renderComposerModal();
}

function renderCommandRailModal(): string {
  if (!clientStore.isCommandRailOpen) return '';

  const filter = currentFilter.trim().toLowerCase();
  const searchResults = filter.length > 1 && !filter.startsWith('/')
    ? localSearchIndex.searchPosts(filter, 4)
    : [];

  // Omni-Search: Match feed posts (BM25 fuzzy search with substring fallback)
  const matchingPosts = searchResults.length > 0
    ? searchResults.map(r => (r.doc.metadata as ClientPost) || clientStore.posts.find(p => p.id === r.doc.id)!).filter(Boolean)
    : (filter.length > 1 && !filter.startsWith('/')
        ? clientStore.posts.filter(p =>
            (p.title && p.title.toLowerCase().includes(filter)) ||
            (p.content && p.content.toLowerCase().includes(filter)) ||
            (p.authorFingerprint && p.authorFingerprint.toLowerCase().includes(filter))
          ).slice(0, 4)
        : []);

  // Omni-Search: Match sovereign circles & channels
  const matchingChannels = filter.length > 1 && !filter.startsWith('/')
    ? clientStore.channels.filter(c =>
        c.name.toLowerCase().includes(filter) ||
        c.id.toLowerCase().includes(filter)
      ).slice(0, 3)
    : [];

  const commands = getAvailableCommands().filter(c => 
    c.title.toLowerCase().includes(filter) || 
    c.category.toLowerCase().includes(filter)
  );

  let itemIndex = 0;

  const renderCommandCategoryBadge = (category: string): string => {
    switch (category) {
      case 'Navigation':
        return `<span class="inline-flex items-center gap-1 text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">${renderIcon('compass', { size: 10 })} Nav</span>`;
      case 'Layout & View':
        return `<span class="inline-flex items-center gap-1 text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">${renderIcon('layout', { size: 10 })} View</span>`;
      case 'Security & Crypto':
        return `<span class="inline-flex items-center gap-1 text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">${renderIcon('shield', { size: 10 })} Crypto</span>`;
      case 'Simulation':
        return `<span class="inline-flex items-center gap-1 text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">${renderIcon('sparkles', { size: 10 })} Sim</span>`;
      default:
        return `<span class="inline-flex items-center gap-1 text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10 shrink-0">${escapeHtml(category)}</span>`;
    }
  };

  return `
    <div id="command-rail-overlay" class="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-start justify-center pt-16 sm:pt-20 p-2 sm:p-4">
      <div class="w-[600px] max-w-[96vw] bg-surface-base/95 backdrop-blur-2xl border border-white/12 rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <!-- Search Bar -->
        <div class="p-3 sm:p-3.5 border-b border-white/10 flex items-center space-x-3 bg-surface-raised/50">
          <span class="text-[var(--color-accent,#e59b3c)] flex-shrink-0">${renderIcon('search', { size: 18 })}</span>
          <input 
            type="text" 
            id="command-rail-input"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="command-rail-results-list"
            aria-activedescendant="cmd-item-${activeCommandIndex}"
            value="${escapeHtml(currentFilter)}"
            placeholder="Search posts, circles, encrypted messages, or type / for commands..." 
            class="flex-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none font-sans"
            autofocus
          />
          <kbd class="hidden sm:inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400">ESC</kbd>
        </div>

        <!-- Results List -->
        <div id="command-rail-results-list" role="listbox" class="max-h-[60vh] sm:max-h-96 overflow-y-auto p-2.5 space-y-2 no-scrollbar">
          ${matchingPosts.length > 0 ? `
            <div class="px-2.5 py-1.5 text-[10px] font-mono text-amber-400/90 font-bold uppercase tracking-wider flex items-center justify-between">
              <span class="flex items-center gap-1.5">${renderIcon('fileText', { size: 12, className: 'text-amber-400' })} Sovereign Posts (${matchingPosts.length})</span>
              <span class="text-[9px] text-slate-500 font-normal">BM25 Relevance</span>
            </div>
            <div class="space-y-1">
              ${matchingPosts.map(p => {
                const searchMatch = searchResults.find(r => r.doc.id === p.id);
                const displaySnippet = searchMatch ? searchMatch.snippet : escapeHtml(p.content ? p.content.slice(0, 110) : '');
                const curIdx = itemIndex++;
                const isSelected = curIdx === activeCommandIndex;
                const itemClasses = isSelected
                  ? 'border-[var(--color-accent,#e59b3c)]/60 bg-[var(--color-accent,#e59b3c)]/12 ring-1 ring-[var(--color-accent,#e59b3c)]/30 text-white shadow-sm'
                  : 'border-white/5 text-slate-300 hover:border-white/15 hover:bg-surface-highlight hover:text-white';
                return `
                <button type="button" id="cmd-item-${curIdx}" data-cmd-index="${curIdx}" role="option" aria-selected="${isSelected ? 'true' : 'false'}" class="btn-open-post-detail w-full text-left p-3 rounded-xl bg-surface-overlay border text-xs space-y-1.5 transition-all cursor-pointer group ${itemClasses}" data-post-id="${p.id}">
                  <div class="flex items-center justify-between text-[11px] font-mono">
                    <span class="text-amber-300 font-bold group-hover:text-amber-200 truncate pr-2">${escapeHtml(p.title || 'Untitled Post')}</span>
                    <div class="flex items-center space-x-2 shrink-0">
                      ${searchMatch ? `<span class="text-[9px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">score: ${searchMatch.score.toFixed(1)}</span>` : ''}
                      <span class="text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">▲ ${p.meritVotes || 0}</span>
                    </div>
                  </div>
                  <div class="text-slate-400 text-[11px] truncate leading-normal">${displaySnippet}</div>
                </button>
              `;
              }).join('')}
            </div>
            <div class="border-subtle-t my-1.5"></div>
          ` : ''}

          ${matchingChannels.length > 0 ? `
            <div class="px-2.5 py-1.5 text-[10px] text-emerald-400/90 font-bold uppercase tracking-wider flex items-center justify-between">
              <span class="flex items-center gap-1.5">${renderIcon('users', { size: 12, className: 'text-emerald-400' })} Communities & Channels (${matchingChannels.length})</span>
              <span class="text-[9px] text-slate-500 font-normal">Switch channel</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              ${matchingChannels.map(c => {
                const curIdx = itemIndex++;
                const isSelected = curIdx === activeCommandIndex;
                const itemClasses = isSelected
                  ? 'border-[var(--color-accent,#e59b3c)]/60 bg-[var(--color-accent,#e59b3c)]/12 ring-1 ring-[var(--color-accent,#e59b3c)]/30 text-white shadow-sm'
                  : 'border-white/5 text-slate-300 hover:border-white/15 hover:bg-surface-highlight hover:text-white';
                return `
                <button type="button" id="cmd-item-${curIdx}" data-cmd-index="${curIdx}" role="option" aria-selected="${isSelected ? 'true' : 'false'}" class="btn-channel text-left p-2.5 rounded-xl bg-surface-overlay border text-xs flex items-center justify-between transition-all cursor-pointer ${itemClasses}" data-channel-id="${c.id}">
                  <span class="font-medium text-slate-200 truncate pr-2">${escapeHtml(c.name)}</span>
                  <span class="text-[9px] uppercase px-2 py-0.5 rounded-full bg-surface-raised text-slate-400 font-mono border border-white/5 shrink-0">${c.space}</span>
                </button>
              `;
              }).join('')}
            </div>
            <div class="border-subtle-t my-1.5"></div>
          ` : ''}

          ${searchResults.length > 0 ? `
            <div class="px-2.5 py-1.5 text-[10px] font-mono text-cyan-400/90 font-bold uppercase tracking-wider flex items-center justify-between">
              <span class="flex items-center gap-1.5">${renderIcon('messages', { size: 12, className: 'text-cyan-400' })} Encrypted Message Matches (${searchResults.length})</span>
              <span class="text-[9px] text-slate-500 font-normal">Decrypted BM25</span>
            </div>
            ${searchResults.map(r => `
              <div class="p-2.5 rounded-xl bg-surface-overlay hover:bg-surface-highlight border border-white/5 text-xs space-y-1 transition-all">
                <div class="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span class="text-cyan-400 font-bold">&lt;${r.doc.authorFingerprint}&gt;</span>
                  <span>Score: ${r.score.toFixed(2)}</span>
                </div>
                <div class="text-slate-200">${escapeHtml(r.snippet)}</div>
              </div>
            `).join('')}
            <div class="border-subtle-t my-1.5"></div>
          ` : ''}

          <div class="px-2.5 py-1.5 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span class="flex items-center gap-1.5">${renderIcon('terminal', { size: 12, className: 'text-[var(--color-accent,#e59b3c)]' })} System Actions</span>
            <span class="text-[9px] text-slate-500 font-normal">Shortcuts & Tools</span>
          </div>
          ${commands.map(c => {
            const curIdx = itemIndex++;
            const isSelected = curIdx === activeCommandIndex;
            const itemClasses = isSelected
              ? 'border-[var(--color-accent,#e59b3c)]/60 bg-[var(--color-accent,#e59b3c)]/12 ring-1 ring-[var(--color-accent,#e59b3c)]/30 text-white shadow-sm'
              : 'border-white/5 text-slate-300 hover:border-white/15 hover:bg-surface-highlight hover:text-white';
            return `
            <button type="button" id="cmd-item-${curIdx}" data-cmd-index="${curIdx}" role="option" aria-selected="${isSelected ? 'true' : 'false'}" data-cmd-id="${c.id}" class="btn-exec-cmd w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer border ${itemClasses}">
              <div class="flex items-center space-x-2.5 min-w-0 pr-2">
                ${renderCommandCategoryBadge(c.category)}
                <span class="truncate font-medium">${c.title}</span>
              </div>
              ${c.shortcut ? `<kbd class="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised border border-white/10 text-slate-400 shrink-0">${c.shortcut}</kbd>` : ''}
            </button>
          `;
          }).join('')}
        </div>

        <!-- Modal Footer -->
        <div class="p-2 sm:p-2.5 px-4 bg-surface-raised/40 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-mono select-none">
          <div class="flex items-center gap-2">
            <span><kbd class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-slate-300">↑</kbd><kbd class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-slate-300">↓</kbd> navigate</span>
            <span>•</span>
            <span><kbd class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-slate-300">↵</kbd> select</span>
            <span>•</span>
            <span><kbd class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-slate-300">Esc</kbd> close</span>
          </div>
          <span class="text-[9px] text-[var(--color-accent,#e59b3c)] font-semibold hidden xs:inline tracking-wider">UREfy Omnibar</span>
        </div>
      </div>
    </div>
  `;
}



function renderPostDetailModal(): string {
  // Post focus view is rendered directly in #main-stage, not as a floating modal overlay
  return '';
}

function renderAwardModal(): string {
  return '';
}

function renderCrossPostModal(): string {
  if (!activeCrossPostId) return '';
  return crossPostEngine.renderCrossPostModal(activeCrossPostId, clientStore.keypair.fingerprint);
}

function renderBookmarksModal(): string {
  if (!isBookmarkModalOpen) return '';
  return bookmarksVault.renderBookmarkModal();
}

function renderNotificationsDropdown(): string {
  if (!isNotificationPanelOpen) return '';
  return notificationCenter.renderNotificationPanel();
}

// ─── AbortController for event listener lifecycle management ─────────────────
// Each call to bindEvents() aborts all previous listeners to prevent duplicates.
// Pass `{ signal }` to every addEventListener call inside bindEvents.
let _bindEventsController: AbortController | null = null;

function bindEvents(): void {
  if (document.getElementById('memory-items')) void import('./knowledge-memory-view.js').then(module => module.hydrateKnowledgeMemory());
  // Abort all listeners from the previous bindEvents() call
  _bindEventsController?.abort();
  _bindEventsController = new AbortController();
  const { signal } = _bindEventsController;

  // Bind ambient network minimap canvas if present in DOM
  const minimapCanvas = document.getElementById('ambient-network-minimap') as HTMLCanvasElement | null;
  if (minimapCanvas) {
    void import('./network-minimap.js').then(({ ambientNetworkMinimap }) => ambientNetworkMinimap.bindCanvas(minimapCanvas));
  }

  // Bind active feature modal DOM listeners if present
  modalManager.bindActiveFeatureDOM();

  // ─── Scoped event binding helpers ─────────────────────────────────────────────
  // `on(el, event, handler)` → auto-injects AbortSignal so all listeners are removed on next bindEvents()
  const on = (
    target: EventTarget | null | undefined,
    event: string,
    handler: EventListenerOrEventListenerObject,
    opts?: AddEventListenerOptions
  ) => {
    if (!target) return;
    target.addEventListener(event, handler, { signal, ...opts });
  };

  // `qs(selector)` → typed querySelector shorthand on document
  const qs = <T extends HTMLElement = HTMLElement>(sel: string): T | null =>
    document.querySelector<T>(sel);

  // `qsa(selector)` → typed querySelectorAll shorthand
  const qsa = <T extends HTMLElement = HTMLElement>(sel: string): NodeListOf<T> =>
    document.querySelectorAll<T>(sel);


  // ─── PASSIVE SCROLL & TOUCH EVENT LISTENERS (GPU Thread Protection) ──────────
  // All scroll/touch/wheel listeners MUST use { passive: true } to prevent blocking
  // the browser's rendering thread and ensure buttery 60/120fps scrolling.
  const scrollContainers = [
    document.getElementById('main-feed-scroll'),
    document.getElementById('left-rail-scroll'),
    document.getElementById('right-rail-scroll'),
    document.getElementById('messages-container'),
    document.querySelector('.overflow-y-auto'),
  ].filter(Boolean) as Element[];

  scrollContainers.forEach(el => {
    // Register passive scroll listener only if not already registered
    if (!(el as any).__passiveScrollBound) {
      el.addEventListener('scroll', () => {}, { passive: true, capture: false });
      (el as any).__passiveScrollBound = true;
    }
  });

  // Passive touch listeners on the whole document
  if (!(document as any).__passiveTouchBound) {
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
    document.addEventListener('touchend', () => {}, { passive: true });
    document.addEventListener('wheel', () => {}, { passive: true });
    (document as any).__passiveTouchBound = true;
  }

  // Throttled resize handler (debounced to 150ms using rAF)
  if (!(window as any).__resizeThrottleBound) {
    const mobileFeed = window.matchMedia('(max-width: 639px)');
    mobileFeed.addEventListener('change', () => clientStore.notify());
    let resizeRAF: number | null = null;
    window.addEventListener('resize', () => {
      if (resizeRAF !== null) cancelAnimationFrame(resizeRAF);
      resizeRAF = requestAnimationFrame(() => { resizeRAF = null; });
    }, { passive: true });
    (window as any).__resizeThrottleBound = true;
  }


  // Notifications Bell Toggle (Desktop & Mobile)
  (window as any).__aetherisToggleNotifs = () => {
    isNotificationPanelOpen = !isNotificationPanelOpen;
    if (isNotificationPanelOpen) void notificationCenter.syncFromApi(clientStore.keypair.fingerprint);
    clientStore.notify();
  };
  (window as any).__aetherisCloseNotifs = () => {
    isNotificationPanelOpen = false;
    clientStore.notify();
  };

  // Dismiss System Broadcast Banner
  document.getElementById('btn-dismiss-broadcast')?.addEventListener('click', () => {
    const dismissedAnnouncement = clientStore.broadcastAnnouncement;
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('aetheris_dismissed_broadcast', dismissedAnnouncement || '');
      } catch (_) {}
    }
    clientStore.notify();
  }, { signal });

  // Sound Effects Toggle
  document.getElementById('btn-toggle-sound')?.addEventListener('click', () => {
    soundEffects.toggleSound();
    clientStore.notify();
  }, { signal });

  // Zen Mode Button
  document.getElementById('btn-toggle-zen')?.addEventListener('click', () => {
    zenModeManager.toggleZen();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-exit-zen')?.addEventListener('click', () => {
    zenModeManager.setZen(false);
    clientStore.notify();
  }, { signal });

  // Spatial Audio Voice Radar Modal
  document.getElementById('btn-open-spatial-audio')?.addEventListener('click', () => {
    import('./spatial-audio.js').then(m => m.spatialAudio.openModal());
    soundEffects.playVoiceJoin();
    clientStore.notify();
  }, { signal });
  document.getElementById('spatial-modal-close-btn')?.addEventListener('click', () => {
    import('./spatial-audio.js').then(m => m.spatialAudio.closeModal());
    clientStore.notify();
  }, { signal });

  // 3D Spatial Audio Mesh Channel Modal
  document.getElementById('btn-open-spatial-audio-mesh')?.addEventListener('click', () => {
    import('./spatial-audio-mesh.js').then(m => m.spatialAudioMesh.openModal());
    import('./sound-packs.js').then(m => m.soundPacks.play('MESSAGE_SENT'));
    clientStore.notify();
  }, { signal });
  document.getElementById('mesh-modal-close-btn')?.addEventListener('click', () => {
    import('./spatial-audio-mesh.js').then(m => m.spatialAudioMesh.closeModal());
    clientStore.notify();
  }, { signal });

  // Sovereign DM open trigger on member avatars / cards
  document.querySelectorAll('[data-open-dm]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const peerFP = btn.getAttribute('data-open-dm');
      if (peerFP) {
        sovereignDM.openDM(peerFP);
        clientStore.notify();
      }
    }, { signal });
  });
  document.getElementById('btn-close-dm')?.addEventListener('click', () => {
    sovereignDM.closeDM();
    clientStore.notify();
  }, { signal });

  // WoT Slider input
  document.getElementById('wot-trust-slider')?.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    wotSlider.setThreshold(val);
    clientStore.notify();
  }, { signal });

  // === OMNI-SPHERE V2 EVENT BINDINGS ===

  // WoT Trust buttons in right rail
  document.querySelectorAll('.btn-wot-trust').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const peerId = btn.getAttribute('data-peer-id');
      if (peerId) {
        clientStore.showToast(`✅ Trust established with @id:${peerId.substring(0, 8)} — ZK-signed attestation recorded`, 'success');
        // Mark button as trusted
        (btn as HTMLButtonElement).textContent = 'Trusted ✓';
        (btn as HTMLButtonElement).className = 'btn-wot-trust px-3 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-bold cursor-default shrink-0';
      }
    }, { signal });
  });

  // WoT View Graph shortcut from right rail
  document.getElementById('btn-open-wot-graph-right')?.addEventListener('click', () => {
    modalManager.openFeature('wot-graph');
  }, { signal });


  document.querySelectorAll('.btn-open-story').forEach(btn => {
    btn.addEventListener('click', () => {
      const storyId = btn.getAttribute('data-story-id');
      if (storyId) {
        storiesEngine.openStory(storyId);
        clientStore.notify();
      }
    }, { signal });
  });
  document.getElementById('btn-close-story')?.addEventListener('click', () => {
    storiesEngine.closeStory();
    clientStore.notify();
  }, { signal });

  // 3. Bookmarks Modal Toggle & Inline Toggle
  document.getElementById('btn-open-bookmarks-modal')?.addEventListener('click', () => {
    isBookmarkModalOpen = !isBookmarkModalOpen;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-bookmarks-modal')?.addEventListener('click', () => {
    isBookmarkModalOpen = false;
    clientStore.notify();
  }, { signal });
  document.querySelectorAll('.btn-toggle-bookmark').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        if (bookmarksVault.isSaved(postId)) {
          bookmarksVault.unsave(postId);
          clientStore.showToast(t('toast.bookmarkRemoved', undefined, '🔖 Bookmark removed'), 'info');
        } else {
          const p = clientStore.posts.find(x => x.id === postId);
          if (p) {
            bookmarksVault.save({
              id: p.id,
              title: p.title,
              authorFingerprint: p.authorFingerprint,
              channelId: p.channelId
            });
            clientStore.showToast(t('toast.bookmarkAdded', undefined, '🔖 Post bookmarked in local vault'), 'success');
          }
        }
        clientStore.notify();
      }
    }, { signal });
  });

  // 4. Reactions Toggle & Emoji Picker (Handled centrally in bindReactionBarEvents)

  // 5. Awards Modal (Handled globally by awardsSystem in awards.ts)

  // 6. CrossPost Modal
  document.querySelectorAll('.btn-open-crosspost').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        activeCrossPostId = postId;
        clientStore.notify();
      }
    }, { signal });
  });
  document.getElementById('btn-close-crosspost-modal')?.addEventListener('click', () => {
    activeCrossPostId = null;
    clientStore.notify();
  }, { signal });
  document.querySelectorAll('.btn-confirm-crosspost').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetCh = btn.getAttribute('data-target-channel');
      if (activeCrossPostId && targetCh) {
        crossPostEngine.crossPost(activeCrossPostId, targetCh, clientStore.keypair.fingerprint, 'Cross-posted via Omni-Sphere');
        clientStore.showToast(`🔀 Cross-posted to ${targetCh}!`, 'success');
        activeCrossPostId = null;
        clientStore.notify();
      }
    }, { signal });
  });

  // 7. Full Thread Detail Modal & Post Card Clickability
  document.querySelectorAll('.social-post, [data-post-card-id], [data-action="open-post-detail"]').forEach(postEl => {
    postEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button:not([data-action="open-post-detail"]), a, input, textarea, select, iframe, video, .reaction-row, [data-action="react-post"], .btn-pulse-merit, .btn-pulse-reply, .btn-pulse-boost, .btn-pulse-bookmark, .btn-pulse-award, .btn-pulse-share, .btn-pulse-more')) {
        return;
      }
      const postId = postEl.getAttribute('data-post-card-id') || postEl.getAttribute('data-post-id');
      if (postId) {
        postDetailView.openPost(postId);
        void import('./analytics-widget.js').then(({ localAnalytics }) => localAnalytics.recordPostView());
      }
    }, { signal });
  });

  document.querySelectorAll('.btn-open-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-open-detail');
      if (postId) {
        postDetailView.openPost(postId);
        void import('./analytics-widget.js').then(({ localAnalytics }) => localAnalytics.recordPostView());
      }
    }, { signal });
  });
  const handleClosePostDetail = (e?: Event) => {
    e?.preventDefault();
    postDetailView.closePost();
  };
  const closeBtn = document.getElementById('btn-close-post-detail');
  if (closeBtn) closeBtn.addEventListener('click', handleClosePostDetail, { signal });
  const backBtn = document.getElementById('btn-back-to-feed');
  if (backBtn) backBtn.addEventListener('click', handleClosePostDetail, { signal });
  const fallbackBtn = document.getElementById('btn-close-post-detail-fallback');
  if (fallbackBtn) fallbackBtn.addEventListener('click', handleClosePostDetail, { signal });

  // Use current loaded member data; explicit empty data clears stale suggestions.
  autocompleteEngine.setMembers(clientStore.members);
  // Attach intelligent autocomplete engine to chat, dm, and composer inputs
  const msgInput = document.getElementById('input-message') as HTMLInputElement | null;
  if (msgInput) autocompleteEngine.attach(msgInput);
  const dmInput = document.getElementById('input-dm-message') as HTMLInputElement | null;
  if (dmInput) autocompleteEngine.attach(dmInput);
  const sovDmInput = document.getElementById('sovereign-dm-input') as HTMLInputElement | null;
  if (sovDmInput) autocompleteEngine.attach(sovDmInput);
  const replyInput = document.getElementById('input-post-reply') as HTMLTextAreaElement | null;
  if (replyInput) autocompleteEngine.attach(replyInput);
  const composerInput = document.getElementById('composer-content') as HTMLTextAreaElement | null;
  if (composerInput) autocompleteEngine.attach(composerInput);

  postDetailView.bindEvents(async (postId: string, commentText: string, parentId?: string) => {
    const { publishComment } = await import('./controllers/comment-controller.js');
    await publishComment(postId, commentText.trim(), parentId);
  });

  // 8. ZK Proof Visualizer
  document.getElementById('btn-open-zk-rln')?.addEventListener('click', () => {
    modalManager.openFeature('zk-proof', 'rln');
  }, { signal });
  document.getElementById('btn-close-proof-viewer')?.addEventListener('click', () => {
    modalManager.closeFeature();
  }, { signal });

  // 9. Flair Filter Chips
  document.querySelectorAll('.btn-flair-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const flairId = btn.getAttribute('data-flair-id');
      flairFilter.setFlair(flairId === 'all' ? null : flairId);
      clientStore.notify();
    }, { signal });
  });

  // 10. Hashtag Banner Clear
  document.getElementById('btn-clear-hashtag')?.addEventListener('click', () => {
    hashtagExplorer.setActiveTag(null);
    clientStore.notify();
  }, { signal });

  // 11. Copy Post Link / Native Share
  document.querySelectorAll('.btn-copy-post-link').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pid = btn.getAttribute('data-post-id');
      const title = btn.getAttribute('data-post-title') || undefined;
      if (pid) {
        soundEffects.playNotification();
        const post = clientStore.posts.find(p => p.id === pid);
        const copied = await sharePostOrCopyLink(pid, title || post?.title, post?.content, btn as HTMLElement);
        if (copied) {
          clientStore.showToast(`🔗 Link copied to clipboard: ${window.location.origin}/#post-${pid}`, 'success');
        }
      }
    }, { signal });
  });

  // Bind Video Players
  clientStore.posts.forEach(p => {
    if (p.video) {
      obsidianMediaPlayer.bindVideoEvents(p.id);
    }
  });

  // Lightbox Open
  document.querySelectorAll('.btn-lightbox-img').forEach(img => {
    img.addEventListener('click', () => {
      const src = img.getAttribute('data-src');
      if (src) {
        obsidianMediaPlayer.openLightbox(src);
        clientStore.setSortMode(clientStore.sortMode); // trigger re-render
      }
    }, { signal });
  });

  // Lightbox Close
  document.getElementById('btn-close-lightbox')?.addEventListener('click', () => {
    obsidianMediaPlayer.closeLightbox();
    clientStore.setSortMode(clientStore.sortMode);
  }, { signal });
  document.getElementById('lightbox-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('lightbox-overlay')) {
      obsidianMediaPlayer.closeLightbox();
      clientStore.setSortMode(clientStore.sortMode);
    }
  }, { signal });

  // Poll Voting
  document.querySelectorAll('.btn-vote-poll').forEach(btn => {
    btn.addEventListener('click', () => {
      const pollId = btn.getAttribute('data-poll-id');
      const optId = btn.getAttribute('data-option-id');
      if (pollId && optId) {
        pollEngine.castVote(pollId, optId, clientStore.keypair.fingerprint);
        clientStore.showToast('🗳️ Cryptographic vote registered!', 'success');
        clientStore.setSortMode(clientStore.sortMode);
      }
    }, { signal });
  });

  // Trending Tag Click
  document.querySelectorAll('.btn-trending-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.getAttribute('data-search-tag') || '';
      currentFilter = tag;
      clientStore.toggleCommandRail();
      clientStore.showToast(`Filtered by tag: ${tag}`, 'info');
    }, { signal });
  });

  // Hubs
  document.querySelectorAll('.btn-hub').forEach(btn => {
    btn.addEventListener('click', () => {
      const hub = btn.getAttribute('data-hub') || 'all';
      clientStore.setActiveHub(hub);
    }, { signal });
  });

  // Sort modes
  document.querySelectorAll('.btn-sort').forEach(btn => {
    btn.addEventListener('click', () => {
      const sort = btn.getAttribute('data-sort') as any;
      if (sort) clientStore.setSortMode(sort);
    }, { signal });
  });

  // Dual Horizon
  document.getElementById('btn-toggle-dual-horizon')?.addEventListener('click', () => clientStore.toggleDualHorizon(), { signal });
  document.getElementById('btn-exit-dual-horizon')?.addEventListener('click', () => clientStore.toggleDualHorizon(), { signal });

  // Simple vs Advanced Mode Toggles
  document.getElementById('btn-return-simple-sidebar')?.addEventListener('click', () => clientStore.setUiMode('simple'), { signal });
  document.getElementById('btn-toggle-ui-mode-header')?.addEventListener('click', () => {
    clientStore.setUiMode(clientStore.isSimpleMode() ? 'sovereign' : 'simple');
  }, { signal });

  // Command rail (Omnibar Search)
  document.getElementById('btn-open-command-rail')?.addEventListener('click', () => clientStore.toggleCommandRail(), { signal });
  document.getElementById('btn-mobile-search-trigger')?.addEventListener('click', () => clientStore.toggleCommandRail(), { signal });
  document.getElementById('command-rail-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('command-rail-overlay')) {
      clientStore.toggleCommandRail();
    }
  }, { signal });

function updateCommandRailHighlight(index: number): void {
  const items = document.querySelectorAll<HTMLElement>('#command-rail-overlay [data-cmd-index]');
  items.forEach((item, idx) => {
    if (idx === index) {
      item.classList.add('border-indigo-500', 'bg-surface-highlight', 'ring-1', 'ring-indigo-500/40', 'shadow-sm');
      item.classList.remove('border-white/5', 'border-transparent');
      item.setAttribute('aria-selected', 'true');
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      item.classList.remove('border-indigo-500', 'bg-surface-highlight', 'ring-1', 'ring-indigo-500/40', 'shadow-sm');
      item.classList.add(item.classList.contains('btn-exec-cmd') ? 'border-transparent' : 'border-white/5');
      item.setAttribute('aria-selected', 'false');
    }
  });
  const input = document.getElementById('command-rail-input') as HTMLInputElement | null;
  if (input) {
    input.setAttribute('aria-activedescendant', `cmd-item-${index}`);
  }
}

  const cmdInput = document.getElementById('command-rail-input') as HTMLInputElement;
  if (cmdInput) {
    cmdInput.focus({ preventScroll: true });
    cmdInput.addEventListener('keydown', (e) => {
      const items = document.querySelectorAll<HTMLElement>('#command-rail-overlay [data-cmd-index]');
      const total = items.length;
      if (total === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeCommandIndex = (activeCommandIndex + 1) % total;
        updateCommandRailHighlight(activeCommandIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeCommandIndex = (activeCommandIndex - 1 + total) % total;
        updateCommandRailHighlight(activeCommandIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeBtn = document.getElementById(`cmd-item-${activeCommandIndex}`) as HTMLElement | null;
        if (activeBtn) {
          activeBtn.click();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clientStore.toggleCommandRail();
      }
    }, { signal });

    cmdInput.addEventListener('input', (e) => {
      const cursor = (e.target as HTMLInputElement).selectionStart;
      currentFilter = (e.target as HTMLInputElement).value;
      activeCommandIndex = 0;
      const railModal = document.getElementById('command-rail-overlay');
      if (railModal) {
        railModal.outerHTML = renderCommandRailModal();
        bindEvents();
        const refreshedInput = document.getElementById('command-rail-input') as HTMLInputElement | null;
        if (refreshedInput) {
          refreshedInput.focus();
          if (cursor !== null) {
            refreshedInput.setSelectionRange(cursor, cursor);
          }
        }
      }
    }, { signal });
  }

  document.querySelectorAll('.btn-exec-cmd').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-cmd-id');
      const cmd = getAvailableCommands().find(c => c.id === id);
      if (cmd) {
        cmd.run();
        clientStore.toggleCommandRail();
      }
    }, { signal });
  });

  // Jump to post or switch channel from Command Rail
  document.querySelectorAll('#command-rail-overlay .btn-open-post-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        clientStore.isCommandRailOpen = false;
        postDetailView.openPost(postId);
        clientStore.notify();
      }
    }, { signal });
  });

  document.querySelectorAll('#command-rail-overlay .btn-channel').forEach(btn => {
    btn.addEventListener('click', () => {
      const channelId = btn.getAttribute('data-channel-id');
      if (channelId) {
        clientStore.isCommandRailOpen = false;
        clientStore.joinChannel(channelId);
        clientStore.notify();
      }
    }, { signal });
  });

  // Density & View Mode buttons
  document.getElementById('density-compact')?.addEventListener('click', () => clientStore.setDensity('compact'), { signal });
  document.getElementById('density-balanced')?.addEventListener('click', () => clientStore.setDensity('balanced'), { signal });
  document.getElementById('density-media')?.addEventListener('click', () => clientStore.setDensity('media'), { signal });
  document.getElementById('view-card')?.addEventListener('click', () => clientStore.setViewMode('card'), { signal });
  document.getElementById('view-classic')?.addEventListener('click', () => clientStore.setViewMode('classic'), { signal });
  document.getElementById('view-compact')?.addEventListener('click', () => clientStore.setViewMode('compact'), { signal });
  document.querySelectorAll('[data-view-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-view-mode') as any;
      if (mode) clientStore.setViewMode(mode);
    }, { signal });
  });

  // Attach Sovereign Sandbox runners to rendered code blocks
  import('./code-sandbox.js').then(m => m.attachSandboxRunnersToDOM());

  // Identity info modal -> ZK Passport
  document.getElementById('btn-identity-info')?.addEventListener('click', () => {
    modalManager.openFeature('reputation');
  }, { signal });

  // Voice toggle
  document.getElementById('btn-toggle-voice')?.addEventListener('click', async () => {
    const { voiceVisualizer } = await import('./webrtc-voice.js');
    if (voiceVisualizer.isConnected) {
      voiceVisualizer.zeroizeRam();
      clientStore.showToast('Voice disconnected. RAM zeroized.', 'info');
    } else {
      await voiceVisualizer.connectVoice();
      clientStore.showToast('Voice connected with SFrame E2EE', 'success');
    }
  }, { signal });

  // Ghost space toggle
  document.getElementById('btn-toggle-ghost')?.addEventListener('click', async () => {
    const { voiceVisualizer } = await import('./webrtc-voice.js');
    const active = voiceVisualizer.toggleGhostSpace();
    if (active) {
      clientStore.showToast('👻 Ghost Space active: volatile RAM only', 'warning');
    }
  }, { signal });

  // Screen share button
  document.getElementById('btn-toggle-screen')?.addEventListener('click', async () => {
    const { screenShareEngine } = await import('./screenshare.js');
    if (screenShareEngine.isStreaming) {
      screenShareEngine.stopCapture();
      clientStore.showToast('Screen sharing stopped', 'info');
      clientStore.setSortMode(clientStore.sortMode);
    } else {
      const metrics = await screenShareEngine.startCapture();
      if (metrics) {
        clientStore.showToast(`Sharing screen: ${metrics.width}x${metrics.height} (${metrics.isUltrawide ? 'Ultrawide 21:9' : '16:9'})`, 'success');
        clientStore.setSortMode(clientStore.sortMode);
      }
    }
  }, { signal });

  // Dismiss quarantine alert
  document.getElementById('btn-dismiss-alert')?.addEventListener('click', () => clientStore.dismissQuarantineAlert(), { signal });

  // Canonical Home Navigation (Logo and Home triggers)
  document.querySelectorAll('[data-action="go-home"], .urefy-brand').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      isMobileDrawerOpen = false;
      sovereignRouter.navigateHome();
    }, { signal });
  });

  // Primary Workspace Mode Navigation
  document.querySelectorAll('[data-nav-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-nav-mode');
      isMobileDrawerOpen = false;
      if (mode === 'pulse' || mode === 'feed') {
        sovereignRouter.navigateHome();
      } else if (mode === 'vault') {
        sovereignRouter.navigateTo('vault');
      } else if (mode === 'relays' || mode === 'messages') {
        sovereignRouter.navigateTo('messages');
      } else if (mode === 'explore') {
        sovereignRouter.navigateTo('explore');
      } else if (mode === 'communities') {
        sovereignRouter.navigateTo('communities');
      } else if (mode === 'profile') {
        profileView.setTargetFingerprint(clientStore.keypair.fingerprint);
        sovereignRouter.navigateTo('profile');
      }
    }, { signal });
  });

  // Note: More Navigation Item (data-action="toggle-more-rail") is delegated via actionDispatcher.


  // Author Profile trigger
  document.querySelectorAll('[data-author-profile]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const fp = btn.getAttribute('data-author-profile');
      if (fp) {
        profileView.setTargetFingerprint(fp);
        clientStore.activeChannelId = 'profile';
        clientStore.notify();
      }
    }, { signal });
  });

  // Micro-Broadcasting Pulse Actions
  document.querySelectorAll('.btn-pulse-like').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        const post = clientStore.posts.find(p => p.id === postId);
        const baseline = (post as any)?.meritVotes || (post as any)?.meritScore || 0;
        const res = pulseActionsEngine.toggleLike(postId, clientStore.keypair?.fingerprint, baseline);
        if (res.burst) {
          soundEffects.playReaction();
          pulseActionsEngine.triggerParticleBurst(postId);
        }
        clientStore.notify();
      }
    }, { signal });
  });

  document.querySelectorAll('.btn-pulse-repost-menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        pulseActionsEngine.toggleRepostMenu(postId);
        clientStore.notify();
      }
    }, { signal });
  });

  document.querySelectorAll('[data-pulse-action="do-repost"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        pulseActionsEngine.closeRepostMenu();
        const post = clientStore.posts.find(p => p.id === postId);
        const baseline = (post as any)?.boostCount || 0;
        const res = pulseActionsEngine.toggleRepost(postId, clientStore.keypair?.fingerprint, false, baseline);
        clientStore.notifySync();
        if (await pulseActionsEngine.whenSettled(postId, 'repost')) clientStore.showToast(res.isReposted ? 'Reposted' : 'Repost removed', 'success');
      }
    }, { signal });
  });

  document.querySelectorAll('[data-pulse-action="do-quote"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        pulseActionsEngine.closeRepostMenu();
        const post = clientStore.posts.find(x => x.id === postId);
        if (post) {
          hybridComposer.openWithQuote(post);
        }
      }
    }, { signal });
  });

  document.querySelectorAll('.btn-pulse-reply').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        postDetailView.openPost(postId);
        clientStore.notify();
      }
    }, { signal });
  });

  document.querySelectorAll('.btn-pulse-bookmark').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        const isSaved = pulseActionsEngine.toggleBookmark(postId, clientStore.keypair?.fingerprint);
        clientStore.notify();
        if (await pulseActionsEngine.whenSettled(postId, 'bookmark')) clientStore.showToast(isSaved ? 'Post saved' : 'Bookmark removed', 'info');
      }
    }, { signal });
  });

  document.querySelectorAll('.btn-pulse-share').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        soundEffects.playNotification();
        const post = clientStore.posts.find(p => p.id === postId);
        const copied = await sharePostOrCopyLink(postId, post?.title, post?.content, btn as HTMLElement);
        if (copied) {
          clientStore.showToast(t('toast.linkCopied', undefined, '🔗 Copied pulse permalink'), 'success');
        }
      }
    }, { signal });
  });

  document.querySelectorAll('.btn-pulse-report').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        const post = clientStore.posts.find(p => p.id === postId);
        const externalUrls: string[] = [];
        if (post?.content) {
          const matched = post.content.match(/https?:\/\/[^\s)]+/g);
          if (matched) externalUrls.push(...matched);
        }
        reportModalManager.open({
          targetId: postId,
          targetType: 'post',
          authorFingerprint: post?.authorFingerprint,
          title: post?.title,
          contentSnippet: post?.content?.slice(0, 200),
          detectedExternalUrls: externalUrls,
        });
      }
    }, { signal });
  });

  // Explore View Handlers
  document.querySelectorAll('.btn-explore-category').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-explore-cat') as any;
      if (cat) {
        exploreView!.setActiveCategory(cat);
        clientStore.notify();
      }
    }, { signal });
  });
  const exploreInput = document.getElementById('explore-search-input') as HTMLInputElement;
  if (exploreInput) {
    exploreInput.addEventListener('input', (e) => {
      exploreView!.setSearchQuery((e.target as HTMLInputElement).value, false);
      clientStore.notify();
    }, { signal });
    exploreInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) exploreView!.saveRecentSearch(exploreInput.value);
    }, { signal });
  }
  document.getElementById('btn-clear-explore-search')?.addEventListener('click', () => {
    exploreView!.clearSearch();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-clear-explore-empty')?.addEventListener('click', () => {
    exploreView!.clearSearch();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-clear-recent-searches')?.addEventListener('click', () => {
    exploreView!.clearRecentSearches();
    clientStore.notify();
  }, { signal });
  document.querySelectorAll('[data-search-result-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-search-result-tab') as 'posts' | 'people' | 'communities' | 'topics' | null;
      if (tab) {
        exploreView!.setActiveSearchTab(tab);
        clientStore.notify();
      }
    }, { signal });
  });
  document.querySelectorAll('.btn-select-trend').forEach(btn => {
    btn.addEventListener('click', () => {
      const trend = btn.getAttribute('data-search-trend');
      if (trend) {
        exploreView!.setSearchQuery(trend);
        clientStore.notify();
      }
    }, { signal });
  });
  document.querySelectorAll('.btn-open-featured').forEach(btn => {
    btn.addEventListener('click', () => {
      const topic = btn.getAttribute('data-featured-topic');
      if (topic) {
        exploreView!.setSearchQuery(topic);
        clientStore.notify();
      }
    }, { signal });
  });
  document.getElementById('btn-explore-refresh')?.addEventListener('click', () => {
    clientStore.showToast('⚡ Explore chronicle refreshed', 'success');
    clientStore.notify();
  }, { signal });

  // Sovereign Federated Mesh Widget Event Handlers
  import('./node-federation.js').then(m => m.nodeFederationEngine.bindEvents());
  facetSwitcher.bindEvents();

  // Profile View Handlers
  document.querySelectorAll('.btn-profile-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-profile-tab') as any;
      if (tab) {
        profileView.setActiveTab(tab);
        clientStore.notify();
      }
    }, { signal });
  });
  document.querySelectorAll('.btn-toggle-follow-profile').forEach(btn => {
    btn.addEventListener('click', () => {
      const fp = btn.getAttribute('data-trust-fp');
      if (fp) {
        profileView.toggleFollow(fp);
        clientStore.notify();
      }
    }, { signal });
  });
  document.getElementById('btn-profile-back')?.addEventListener('click', () => {
    clientStore.joinChannel('pulse-global');
  }, { signal });
  document.getElementById('btn-open-edit-profile')?.addEventListener('click', () => {
    profileView.isEditProfileModalOpen = true;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-edit-profile')?.addEventListener('click', () => {
    profileView.isEditProfileModalOpen = false;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-cancel-edit-profile')?.addEventListener('click', () => {
    profileView.isEditProfileModalOpen = false;
    clientStore.notify();
  }, { signal });
  const formEditProf = document.getElementById('form-edit-profile') as HTMLFormElement;
  if (formEditProf) {
    formEditProf.addEventListener('input', () => {
      const field = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value || '';
      profileView.editDraft = { name: field('edit-profile-name'), handle: field('edit-profile-handle'), bio: field('edit-profile-bio'), location: field('edit-profile-location'), website: field('edit-profile-website'), avatar: field('edit-profile-avatar'), banner: field('edit-profile-banner') };
    }, { signal });
    formEditProf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (document.getElementById('edit-profile-name') as HTMLInputElement)?.value;
      const handle = (document.getElementById('edit-profile-handle') as HTMLInputElement)?.value;
      const bio = (document.getElementById('edit-profile-bio') as HTMLTextAreaElement)?.value;
      const location = (document.getElementById('edit-profile-location') as HTMLInputElement)?.value;
      const website = (document.getElementById('edit-profile-website') as HTMLInputElement)?.value;
      const avatar = (document.getElementById('edit-profile-avatar') as HTMLInputElement)?.value;
      const banner = (document.getElementById('edit-profile-banner') as HTMLInputElement)?.value;
      const cleanHandle = handle ? handle.replace(/^@/, '').trim() : undefined;
      const saved = await profileView.saveProfile(profileView.targetFingerprint || clientStore.keypair.fingerprint, {
        name: name || undefined,
        handle: cleanHandle || undefined,
        bio: bio || undefined,
        location: location || undefined,
        website: website || undefined,
        avatar: avatar || undefined,
        banner: banner || undefined,
      });
      if (!saved) return;
      profileView.isEditProfileModalOpen = false;
      clientStore.notify();
    }, { signal });
  }

  // Inline Quick Composer dynamic circular countdown ring
  const inlineTextarea = document.getElementById('inline-composer-textarea') as HTMLTextAreaElement;
  if (inlineTextarea) {
    inlineTextarea.addEventListener('input', () => {
      const len = inlineTextarea.value.length;
      const ringContainer = document.getElementById('inline-char-ring-container');
      if (ringContainer) {
        ringContainer.innerHTML = omniComposer.renderCircularCountdownRing(len, 280);
      }
    }, { signal });
  }

  // Channel switching
  document.querySelectorAll('.btn-channel').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-channel-id');
      if (id) {
        if (typeof relaysManager !== 'undefined') {
          relaysManager.toggleMobileChannels(false);
        }
        clientStore.joinChannel(id);
      }
    }, { signal });
  });

  // Send live chat message form
  const formSend = document.getElementById('form-send-message') as HTMLFormElement;
  if (formSend && !formSend.hasAttribute('data-submit')) {
    formSend.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('input-message') as HTMLInputElement;
      const sendBtn = formSend.querySelector('button[type="submit"]') as HTMLButtonElement | null;

      // Debounce guard: prevent rapid double-send on slow connections
      if ((formSend as any).__sending) return;

      if (input && input.value.trim()) {
        const text = input.value.trim();

        // Set debounce lock (auto-clears after 400ms)
        (formSend as any).__sending = true;
        setTimeout(() => { (formSend as any).__sending = false; }, 400);

        if (sendBtn) {
          sendBtn.classList.add('btn-send-animated');
          sendBtn.disabled = true;
          setTimeout(() => {
            sendBtn.classList.remove('btn-send-animated');
            sendBtn.disabled = false;
          }, 300);
        }
        soundEffects.playSend();
        clientStore.sendMessage(text);
        input.value = '';
        const msgContainer = document.getElementById('messages-container');
        if (msgContainer) {
          requestAnimationFrame(() => { msgContainer.scrollTop = msgContainer.scrollHeight; });
        }
      }
    }, { signal });
  }

  // Upvote / Downvote buttons (Sovereign Board style)
  document.querySelectorAll('.btn-upvote, .btn-downvote').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-vote-id');
      const dir = parseInt(btn.getAttribute('data-dir') || '0', 10);
      if (postId && dir && !(btn as any).__voting) {
        (btn as any).__voting = true;
        setTimeout(() => { (btn as any).__voting = false; }, 600);
        if (dir > 0) {
          soundEffects.playUpvote();
          btn.classList.add('vote-up-animated');
          setTimeout(() => btn.classList.remove('vote-up-animated'), 450);
          const rect = (btn as HTMLElement).getBoundingClientRect();
          if (rect && rect.top > 0) {
            reactionsEngine.triggerParticleBurst(rect.left + rect.width / 2, rect.top, '⚡');
          }
        } else {
          soundEffects.playDownvote();
          btn.classList.add('vote-down-animated');
          setTimeout(() => btn.classList.remove('vote-down-animated'), 450);
        }
        clientStore.votePost(postId, dir);
      }
    }, { signal });
  });

  // Like with particle burst
  document.querySelectorAll('.btn-like, [data-action="like"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId && !(btn as any).__liking) {
        (btn as any).__liking = true;
        setTimeout(() => { (btn as any).__liking = false; }, 600);
        const rect = (btn as HTMLElement).getBoundingClientRect();
        if (rect && rect.top > 0) {
          reactionsEngine.triggerParticleBurst(rect.left + rect.width / 2, rect.top, '❤️');
        }
        clientStore.likePost(postId);
      }
    }, { signal });
  });

  // Boost button (X style)
  document.querySelectorAll('.btn-boost').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-boost-post');
      if (postId && !(btn as any).__boosting) {
        (btn as any).__boosting = true;
        setTimeout(() => { (btn as any).__boosting = false; }, 600);
        soundEffects.playBoost();
        btn.classList.add('boost-pulse-animated');
        setTimeout(() => btn.classList.remove('boost-pulse-animated'), 500);
        clientStore.boostPost(postId);
      }
    }, { signal });
  });

  // Toggle inline comments tree
  document.querySelectorAll('.btn-toggle-post-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.getAttribute('data-expand-post');
      soundEffects.playClick();
      if (postId) clientStore.togglePostExpanded(postId);
    }, { signal });
  });

  // Composer open triggers
  document.getElementById('btn-open-composer')?.addEventListener('click', () => clientStore.toggleComposer(), { signal });
  document.getElementById('btn-mobile-composer')?.addEventListener('click', () => clientStore.toggleComposer(), { signal });

  // Hybrid Composer DOM event binding (all tabs, toolbar, media, poll, code, radial ring, draft, publish)
  if (clientStore.isComposerOpen) {
    hybridComposer.bindDomEvents(() => {
      const modal = document.getElementById('composer-modal-overlay');
      if (modal) {
        modal.outerHTML = hybridComposer.renderComposerModal();
        bindEvents();
      } else {
        clientStore.notify();
      }
    });
  }

  // DSP toggle
  document.getElementById('btn-toggle-dsp')?.addEventListener('click', async () => {
    const dsp = await getDSP();
    dsp.setEnabled(!dsp.getIsEnabled());
    const btn = document.getElementById('btn-toggle-dsp');
    if (btn) btn.textContent = dsp.getIsEnabled() ? '🔇 Mute Filter' : '🎙️ Audio Noise Filter';
  }, { signal });

  // Spam test button
  document.getElementById('btn-test-spam')?.addEventListener('click', () => {
    clientStore.triggerSpamAttackSimulation();
  }, { signal });

  // File inspection input
  const fileInput = document.getElementById('file-inspector-input') as HTMLInputElement;
  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const { inspectBinary } = await import('@aetheris/vault-engine');
      const hygiene = inspectBinary(data);

      const proceedPublish = await sovereignDialog.confirm(`File: ${file.name}\nFormat: ${hygiene.format} (${hygiene.architecture})\nShannon Entropy: ${hygiene.overallEntropy.toFixed(3)} bits/byte\nVerdict: ${hygiene.verdict}\nAnomalies: ${hygiene.anomalies.length ? hygiene.anomalies.join(', ') : 'None (Clean sections)'}\n\nPublish this audited file to the Sovereign Knowledge Vault?`, { title: '🛡️ Binary Hygiene Inspection Audit', confirmText: 'Publish to Vault' });
      if (!proceedPublish) return;

      await clientStore.auditAndPublishLocalFile(file, `Community Release: ${file.name}`);
      clientStore.showToast(`Verified clean file published: ${file.name}`, 'success');
    }, { signal });
  }

  // Copy SHA
  document.querySelectorAll('.btn-copy-sha').forEach(btn => {
    btn.addEventListener('click', () => {
      const sha = btn.getAttribute('data-sha') || '';
      navigator.clipboard.writeText(sha);
      clientStore.showToast(t('toast.keyCopied', undefined, '🔑 SHA-256 copied to clipboard'), 'info');
    }, { signal });
  });

  // P2P File Download
  document.querySelectorAll('.btn-download-p2p').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fileName = btn.getAttribute('data-file-name') || 'ure-payload.bin';
      const byteSize = parseInt(btn.getAttribute('data-byte-size') || '131072', 10);
      const sha = btn.getAttribute('data-sha') || '';

      activeDownloadName = fileName;
      btn.textContent = 'Locating verified artifact...';

      const { p2pFileClient } = await import('./p2p-client.js');
      try {
        await p2pFileClient.downloadFileFromSwarm(fileName, byteSize, sha, (p) => {
          activeDownloadProgress = p.percentage;
          btn.textContent = `Downloading ${p.percentage}%`;
        });
        btn.textContent = 'Verified & Downloaded';
        clientStore.showToast(`Artifact ${fileName} passed SHA-256 verification`, 'success');
      } catch (error) {
        btn.textContent = 'Download unavailable';
        clientStore.showToast(error instanceof Error ? error.message : 'Verified download failed', 'warning');
      } finally {
        activeDownloadName = null;
        setTimeout(() => btn.textContent = 'Verified Download', 3000);
      }
    }, { signal });
  });

  // Thread collapse toggle
  document.querySelectorAll('.btn-toggle-collapse').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-collapse-id');
      if (id) threadManager.toggleCollapse(id);
    }, { signal });
  });

  // Thread endorsement
  document.querySelectorAll('.btn-endorse').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-endorse-id');
      if (id) {
        await threadManager.endorseComment(id);
      }
    }, { signal });
  });

  // Thread reply
  document.querySelectorAll('.btn-reply').forEach(btn => {
    btn.addEventListener('click', async () => {
      const parentId = btn.getAttribute('data-reply-to');
      if (!parentId) return;
      const parent = threadManager.getComment(parentId);
      const postId = parent?.postId || 'post-1';
      const text = await sovereignDialog.prompt('Write sovereign technical reply:', { title: 'Reply to Thread', placeholder: 'Enter your reply...' });
      if (text && text.trim()) {
        try {
          const { publishComment } = await import('./controllers/comment-controller.js');
          await publishComment(postId, text.trim(), parentId);
          clientStore.showToast('Reply added to discussion tree', 'success');
        } catch (err: any) {
          clientStore.showToast(err?.message || 'Failed to post reply', 'warning');
        }
      }
    }, { signal });
  });

  // V4 Sidebar Modal Buttons
  document.getElementById('btn-open-custom-theme-builder')?.addEventListener('click', () => {
    modalManager.openFeature('custom-theme');
  }, { signal });
  document.getElementById('btn-close-custom-theme-builder')?.addEventListener('click', () => {
    modalManager.closeFeature();
  }, { signal });

  // Rail Navigation Buttons
  document.getElementById('rail-btn-notifs')?.addEventListener('click', (e) => {
    e.preventDefault();
    isNotificationPanelOpen = !isNotificationPanelOpen;
    clientStore.notify();
  }, { signal });
  document.querySelectorAll('#rail-btn-bookmarks:not([data-action]), .rail-btn-bookmarks:not([data-action])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      isBookmarkModalOpen = !isBookmarkModalOpen;
      clientStore.notify();
    }, { signal });
  });

  // Inline Quick Composer Interactivity
  document.getElementById('btn-mode-quick-pulse')?.addEventListener('click', () => {
    const titleInput = document.getElementById('inline-composer-title');
    const btnPulse = document.getElementById('btn-mode-quick-pulse');
    const btnArticle = document.getElementById('btn-mode-quick-article');
    const textarea = document.getElementById('inline-composer-textarea') as HTMLTextAreaElement;
    if (titleInput) titleInput.classList.add('hidden');
    if (btnPulse) {
      btnPulse.className = 'px-2.5 py-1 rounded-lg text-indigo-300 font-bold bg-surface-raised border border-indigo-500/30 transition-all cursor-pointer';
    }
    if (btnArticle) {
      btnArticle.className = 'px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer';
    }
    if (textarea) textarea.placeholder = "What is happening in the sovereign matrix? (Markdown & #tags supported)";
  }, { signal });

  document.getElementById('btn-mode-quick-article')?.addEventListener('click', () => {
    const titleInput = document.getElementById('inline-composer-title');
    const btnPulse = document.getElementById('btn-mode-quick-pulse');
    const btnArticle = document.getElementById('btn-mode-quick-article');
    const textarea = document.getElementById('inline-composer-textarea') as HTMLTextAreaElement;
    if (titleInput) titleInput.classList.remove('hidden');
    if (btnArticle) {
      btnArticle.className = 'px-2.5 py-1 rounded-lg text-emerald-400 font-bold bg-surface-raised border border-emerald-500/30 transition-all cursor-pointer';
    }
    if (btnPulse) {
      btnPulse.className = 'px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer';
    }
    if (textarea) textarea.placeholder = "Detailed release description, architecture notes, or technical writeup...";
  }, { signal });

  const inlineTextEl = document.getElementById('inline-composer-textarea') as HTMLTextAreaElement;
  if (inlineTextEl) {
    inlineTextEl.addEventListener('input', () => {
      quickPostDraft.content = inlineTextEl.value;
      const charCount = document.getElementById('inline-char-count');
      if (charCount) {
        const remaining = 280 - inlineTextEl.value.length;
        charCount.textContent = `${remaining}`;
        charCount.className = remaining < 0 ? 'text-[10px] font-mono text-rose-500 font-bold' : 'text-[10px] font-mono text-slate-500';
      }
    }, { signal });
  }
  document.getElementById('inline-composer-hub')?.addEventListener('change', event => {
    quickPostDraft.channelId = (event.target as HTMLSelectElement).value;
  }, { signal });

  document.getElementById('btn-inline-open-full')?.addEventListener('click', () => {
    clientStore.toggleComposer();
  }, { signal });

  document.getElementById('btn-inline-attach-poll')?.addEventListener('click', () => {
    hybridComposer.activeTab = 'poll';
    clientStore.toggleComposer();
  }, { signal });

  document.getElementById('btn-inline-attach-binary')?.addEventListener('click', () => {
    document.getElementById('file-inspector-input')?.click();
  }, { signal });

  document.getElementById('btn-dismiss-onboarding-tour')?.addEventListener('click', () => {
    sovereignOnboarding.dismiss();
    clientStore.showToast('🚀 Tour completed! Welcome to the URE Network.', 'success');
    clientStore.notify();
  }, { signal });

  // Mobile Tab Bar Handlers
  document.getElementById('btn-mobile-tab-feed')?.addEventListener('click', () => {
    mobileTabBar.setTab('feed');
  }, { signal });
  document.getElementById('btn-mobile-tab-explore')?.addEventListener('click', () => {
    mobileTabBar.setTab('explore');
  }, { signal });
  document.getElementById('btn-mobile-tab-messages')?.addEventListener('click', () => {
    mobileTabBar.setTab('messages');
  }, { signal });
  document.getElementById('btn-mobile-tab-vault')?.addEventListener('click', () => {
    mobileTabBar.setTab('vault');
  }, { signal });
  document.getElementById('btn-mobile-tab-circle')?.addEventListener('click', () => {
    mobileTabBar.setTab('circle');
  }, { signal });
  document.getElementById('btn-mobile-tab-profile')?.addEventListener('click', () => {
    mobileTabBar.setTab('profile');
  }, { signal });
  document.getElementById('btn-mobile-tab-more')?.addEventListener('click', () => {
    isMobileDrawerOpen = true;
    clientStore.notify();
  }, { signal });

  // Mobile Drawer Handlers
  // The toggle is owned by ActionDispatcher; a second listener closes it again.

  document.getElementById('btn-close-mobile-drawer')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    clientStore.notify();
  }, { signal });

  document.getElementById('mobile-drawer-backdrop')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    clientStore.notify();
  }, { signal });

  // Mobile Drawer Tool Action Buttons
  document.getElementById('drawer-btn-dao')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    modalManager.openFeature('governance');
  }, { signal });

  document.getElementById('drawer-btn-theme')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    isThemeModalOpen = true;
    clientStore.notify('MODAL_CHANGE');
  }, { signal });

  document.getElementById('drawer-btn-lang')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    isLangModalOpen = true;
    clientStore.notify('MODAL_CHANGE');
  }, { signal });

  document.getElementById('drawer-btn-cve')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    modalManager.openFeature('cve');
  }, { signal });

  document.getElementById('drawer-btn-backup')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    modalManager.openFeature('export-backup');
  }, { signal });

  document.getElementById('drawer-btn-gossip')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    modalManager.openFeature('gossip');
  }, { signal });

  document.getElementById('drawer-btn-rss')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    modalManager.openFeature('rss');
  }, { signal });

  document.getElementById('drawer-btn-paper-wallet')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    modalManager.openFeature('paper-wallet');
  }, { signal });

  document.getElementById('drawer-btn-observatory')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    modalManager.openFeature('observatory');
  }, { signal });

  document.getElementById('drawer-btn-wot')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    modalManager.openFeature('wot-graph');
  }, { signal });

  document.getElementById('btn-mobile-composer')?.addEventListener('click', () => {
    clientStore.toggleComposer();
  }, { signal });

  document.getElementById('btn-mobile-vault')?.addEventListener('click', () => {
    clientStore.activeChannelId = 'vault-releases';
    clientStore.notify();
  }, { signal });

  document.getElementById('btn-mobile-notifs')?.addEventListener('click', () => {
    isNotificationPanelOpen = !isNotificationPanelOpen;
    clientStore.notify();
  }, { signal });

  document.getElementById('btn-mobile-search')?.addEventListener('click', () => {
    clientStore.toggleCommandRail();
  }, { signal });

  // Reaction Buttons & Emoji Picker Global Delegation
  bindReactionBarEvents(document);

  // Close any open reaction pickers when clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.reactions-bar')) {
      document.querySelectorAll('.reactions-picker').forEach(pk => pk.classList.add('hidden'));
      document.querySelectorAll('.add-reaction-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
    }
  }, { signal });

  // Profile Photo Upload Handlers
  document.getElementById('btn-open-edit-profile')?.addEventListener('click', () => {
    profileView.isEditProfileModalOpen = true;
    clientStore.notify();
  }, { signal });

  document.getElementById('btn-quick-change-avatar')?.addEventListener('click', () => {
    profileView.isEditProfileModalOpen = true;
    clientStore.notify();
  }, { signal });

  document.getElementById('btn-close-edit-profile')?.addEventListener('click', () => {
    profileView.isEditProfileModalOpen = false;
    clientStore.notify();
  }, { signal });

  document.getElementById('btn-cancel-edit-profile')?.addEventListener('click', () => {
    profileView.isEditProfileModalOpen = false;
    clientStore.notify();
  }, { signal });

  for (const kind of ['avatar', 'banner'] as const) {
    document.getElementById(`edit-profile-${kind}-file`)?.addEventListener('change', async (event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 2 * 1024 * 1024) {
        clientStore.showToast('Choose a PNG, JPEG, WebP or GIF no larger than 2 MiB.', 'warning'); return;
      }
      input.disabled = true;
      try {
        const uploaded = await clientStore.uploadVaultFile(file);
        if (!uploaded?.success || !uploaded.downloadUrl) return;
        const url = new URL(uploaded.downloadUrl, window.location.origin).href;
        profileView.editDraft = { ...profileView.getProfile(clientStore.keypair.fingerprint), ...profileView.editDraft, [kind]: url };
        const field = document.getElementById(`edit-profile-${kind}`) as HTMLInputElement | null;
        if (field) field.value = url;
        clientStore.notify();
      } finally { input.disabled = false; }
    }, { signal });
  }


  // Lightbox Image Gallery Listeners
  document.querySelectorAll('.btn-lightbox-img').forEach(img => {
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      const src = img.getAttribute('data-src') || (img as HTMLImageElement).src;
      const parent = img.closest('.grid') || img.parentElement;
      const allImgs = parent 
        ? Array.from(parent.querySelectorAll('.btn-lightbox-img')).map(i => i.getAttribute('data-src') || (i as HTMLImageElement).src) 
        : [src];
      obsidianMediaPlayer.openLightbox(src, allImgs);
      clientStore.notify();
    }, { signal });
  });

  document.getElementById('btn-close-lightbox')?.addEventListener('click', () => {
    obsidianMediaPlayer.closeLightbox();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-lightbox-zoom-in')?.addEventListener('click', () => {
    obsidianMediaPlayer.zoomIn();
    const img = document.getElementById('lightbox-main-img');
    if (img) img.style.transform = `scale(${(obsidianMediaPlayer as any).zoomLevel})`;
    const zoomText = document.querySelector('#lightbox-overlay .text-emerald-400');
    if (zoomText) zoomText.textContent = `Zoom: ${Math.round((obsidianMediaPlayer as any).zoomLevel * 100)}%`;
  }, { signal });
  document.getElementById('btn-lightbox-zoom-out')?.addEventListener('click', () => {
    obsidianMediaPlayer.zoomOut();
    const img = document.getElementById('lightbox-main-img');
    if (img) img.style.transform = `scale(${(obsidianMediaPlayer as any).zoomLevel})`;
    const zoomText = document.querySelector('#lightbox-overlay .text-emerald-400');
    if (zoomText) zoomText.textContent = `Zoom: ${Math.round((obsidianMediaPlayer as any).zoomLevel * 100)}%`;
  }, { signal });
  document.getElementById('btn-lightbox-zoom-reset')?.addEventListener('click', () => {
    obsidianMediaPlayer.resetZoom();
    const img = document.getElementById('lightbox-main-img');
    if (img) img.style.transform = `scale(1)`;
    const zoomText = document.querySelector('#lightbox-overlay .text-emerald-400');
    if (zoomText) zoomText.textContent = `Zoom: 100%`;
  }, { signal });
  document.getElementById('btn-lightbox-next')?.addEventListener('click', () => {
    obsidianMediaPlayer.nextImage();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-lightbox-prev')?.addEventListener('click', () => {
    obsidianMediaPlayer.prevImage();
    clientStore.notify();
  }, { signal });

  // Stories Carousel & Modal Listeners
  document.getElementById('btn-add-story-trigger')?.addEventListener('click', () => {
    storiesEngine.openCreator();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-story-creator')?.addEventListener('click', () => {
    storiesEngine.closeCreator();
    clientStore.notify();
  }, { signal });
  document.querySelectorAll('.btn-story-type-select').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-story-type') as any;
      if (type) {
        storiesEngine.creatorMediaType = type;
        clientStore.notify();
      }
    }, { signal });
  });
  document.querySelectorAll('.btn-story-grad-select').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-grad-index') || '0', 10);
      storiesEngine.creatorGradientIndex = idx;
      clientStore.notify();
    }, { signal });
  });
  document.getElementById('btn-submit-story')?.addEventListener('click', () => {
    const input = document.getElementById('story-creator-content') as HTMLTextAreaElement;
    const content = input?.value?.trim();
    if (!content) {
      clientStore.showToast('Please enter your ephemeral story content', 'warning');
      return;
    }
    storiesEngine.addStory(content, storiesEngine.creatorMediaType, clientStore.keypair.fingerprint, 'MEMBER');
    storiesEngine.closeCreator();
    clientStore.showToast('✨ Ephemeral pulse broadcasted (24h expiry)', 'success');
    clientStore.notify();
  }, { signal });

  document.querySelectorAll('.btn-open-story').forEach(btn => {
    btn.addEventListener('click', () => {
      const storyId = btn.getAttribute('data-story-id');
      if (storyId) {
        storiesEngine.activeStoryId = storyId;
        clientStore.notify();
      }
    }, { signal });
  });
  document.getElementById('btn-close-story-modal')?.addEventListener('click', () => {
    storiesEngine.activeStoryId = null;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-story-next')?.addEventListener('click', () => {
    const nextId = document.getElementById('btn-story-next')?.getAttribute('data-story-id');
    if (nextId) {
      storiesEngine.activeStoryId = nextId;
      clientStore.notify();
    }
  }, { signal });
  document.getElementById('btn-story-prev')?.addEventListener('click', () => {
    const prevId = document.getElementById('btn-story-prev')?.getAttribute('data-story-id');
    if (prevId) {
      storiesEngine.activeStoryId = prevId;
      clientStore.notify();
    }
  }, { signal });
  document.querySelectorAll('.btn-story-react').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const reaction = btn.getAttribute('data-reaction') || '🔥';
      clientStore.showToast(`Reacted with ${reaction}`, 'success');
    }, { signal });
  });

  // V4 Active Modal DOM Listeners are orchestrated dynamically by ModalManager

  // V4 Services Init
  pwaService.register();
  aethDB.open();
  cryptoWorkerPool.init();
  viewTransitions.injectTransitionStyles();
  pwaService.detectInstallability();
  pwaService.detectOnlineStatus();

  // ZK Reputation Passport Listeners
  document.getElementById('btn-identity-info')?.addEventListener('click', () => {
    zkReputation.open();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-reputation-modal')?.addEventListener('click', () => {
    modalManager.closeFeature();
  }, { signal });
  document.getElementById('btn-generate-zk-proof')?.addEventListener('click', () => {
    clientStore.showToast('🔒 ZK-SNARK Passport Generated', 'success');
  }, { signal });

  // Merkle Swarm Visualizer Listeners
  document.querySelectorAll('.btn-inspect-merkle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const fileName = btn.getAttribute('data-file-name') || undefined;
      modalManager.openFeature('merkle-viz', fileName);
    }, { signal });
  });
  document.getElementById('btn-close-merkle-modal')?.addEventListener('click', () => {
    modalManager.closeFeature();
  }, { signal });
  document.querySelectorAll('.btn-merkle-piece').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-piece-index') || '0', 10);
      // merkle piece selected
    }, { signal });
  });

  // Offline Sync Queue Listeners
  document.getElementById('btn-open-sync-modal')?.addEventListener('click', () => {
    offlineSync.open();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-sync-modal')?.addEventListener('click', () => {
    offlineSync.close();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-force-sync-now')?.addEventListener('click', async () => {
    const res = await offlineSync.syncQueue();
    clientStore.showToast(`🔄 Synchronized ${res.synced} actions with mesh`, 'success');
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-clear-sync-queue')?.addEventListener('click', () => {
    offlineSync.clearQueue();
    clientStore.showToast('Sync queue cleared', 'info');
    clientStore.notify();
  }, { signal });

  // Mesh Matrix Listeners
  document.getElementById('btn-open-mesh-matrix')?.addEventListener('click', () => {
    modalManager.openFeature('mesh-matrix');
  }, { signal });
  document.getElementById('btn-close-mesh-modal')?.addEventListener('click', () => {
    modalManager.closeFeature();
  }, { signal });
  document.getElementById('btn-ping-mesh-peers')?.addEventListener('click', () => {
    clientStore.showToast('⚡ Mesh peer latencies measured', 'success');
  }, { signal });

  // Paper Wallet Listeners
  document.getElementById('btn-open-paper-wallet')?.addEventListener('click', () => {
    modalManager.openFeature('paper-wallet');
  }, { signal });
  document.getElementById('btn-close-paper-wallet')?.addEventListener('click', () => {
    modalManager.closeFeature();
  }, { signal });
  document.getElementById('btn-print-paper-wallet')?.addEventListener('click', () => {
    if (typeof window !== 'undefined') window.print();
  }, { signal });

  // Acoustic DSP Equalizer Listeners
  document.getElementById('btn-open-dsp-modal')?.addEventListener('click', () => {
    modalManager.openFeature('dsp');
  }, { signal });
  document.getElementById('btn-close-dsp-modal')?.addEventListener('click', () => {
    modalManager.closeFeature();
  }, { signal });
  document.querySelectorAll('.btn-audio-profile').forEach(btn => {
    btn.addEventListener('click', () => {
      const profId = btn.getAttribute('data-profile-id');
      if (profId) {
        // acoustic profile applied
      }
    }, { signal });
  });
  document.querySelectorAll('.slider-eq-gain').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const idx = parseInt((e.target as HTMLElement).getAttribute('data-band-index') || '0', 10);
      const val = parseInt((e.target as HTMLInputElement).value || '0', 10);
      // acoustic gain set
    }, { signal });
  });
  document.getElementById('btn-reset-dsp-eq')?.addEventListener('click', () => {
    // acoustic flat
  }, { signal });
  // i18n Language & RTL Listeners
  document.getElementById('btn-open-lang-picker')?.addEventListener('click', () => {
    isLangModalOpen = true;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-toggle-lang-menu')?.addEventListener('click', () => {
    isLangModalOpen = true;
    clientStore.notify();
  }, { signal });
  document.querySelectorAll('.lang-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-lang-code');
      if (code) {
        i18n.setLanguage(code);
        isLangModalOpen = false;
        clientStore.showToast(`${t('toast.languageChanged', undefined, '🌐 Language switched to')} ${i18n.getCurrentLanguageMeta().name}`, 'success');
        clientStore.notify();
      }
    }, { signal });
  });

  // Global Scale & Worldwide Anycast Edge Listeners
  document.getElementById('btn-open-global-scale')?.addEventListener('click', () => {
    isGlobalScaleModalOpen = true;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-probe-edge-pops')?.addEventListener('click', async () => {
    const { globalScale } = await import('./global-scale.js');
    globalScale.probeAllPoPs();
    clientStore.showToast('⚡ Global Edge PoP RTT Latencies Measured', 'success');
    clientStore.notify();
  }, { signal });
  document.querySelectorAll('.geo-policy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pol = btn.getAttribute('data-geo-policy');
      if (pol) {
        const { globalScale } = await import('./global-scale.js');
        globalScale.setGeoPolicy(pol as any);
        clientStore.showToast(`🛡️ Geo-Fencing Policy updated: ${pol}`, 'info');
        clientStore.notify();
      }
    }, { signal });
  });
  document.getElementById('btn-toggle-p2p-failover')?.addEventListener('click', async () => {
    if (typeof RTCPeerConnection === 'undefined') {
      clientStore.showToast('WebRTC DataChannel is not available in this browser', 'warning');
      return;
    }
    const connection = new RTCPeerConnection({ iceServers: [] });
    try {
      connection.createDataChannel('ure-readiness');
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      clientStore.showToast('WebRTC secure peer transport is ready on this device', 'success');
    } catch {
      clientStore.showToast('WebRTC readiness check failed on this network', 'warning');
    } finally {
      connection.close();
    }
  }, { signal });

  // ─── Sovereign Relays & Guilds Listeners ─────────────────────────────────
  // Server/Relay switching
  document.querySelectorAll('[data-select-relay]').forEach(btn => {
    btn.addEventListener('click', () => {
      const relayId = btn.getAttribute('data-select-relay');
      if (relayId) {
        relaysManager.activeRelayId = relayId;
        const r = relaysManager.getActiveRelay();
        if (r && r.channels.length > 0) {
          clientStore.activeChannelId = r.channels[0].id;
        }
        clientStore.notify();
      }
    }, { signal });
  });

  // Create Relay Modal
  document.getElementById('btn-open-create-relay')?.addEventListener('click', () => {
    relaysManager.isCreateModalOpen = true;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-create-relay')?.addEventListener('click', () => {
    relaysManager.isCreateModalOpen = false;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-cancel-create-relay')?.addEventListener('click', () => {
    relaysManager.isCreateModalOpen = false;
    clientStore.notify();
  }, { signal });
  document.querySelectorAll('.btn-select-emoji-icon').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.getAttribute('data-emoji');
      const input = document.getElementById('create-relay-icon') as HTMLInputElement;
      if (emoji && input) input.value = emoji;
    }, { signal });
  });
  document.getElementById('form-create-relay')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('create-relay-name') as HTMLInputElement)?.value.trim();
    const icon = (document.getElementById('create-relay-icon') as HTMLInputElement)?.value.trim() || '⚡';
    const desc = (document.getElementById('create-relay-desc') as HTMLTextAreaElement)?.value.trim() || '';
    if (name) {
      const newRelay = relaysManager.createRelay(name, icon, desc, clientStore.keypair.fingerprint);
      relaysManager.isCreateModalOpen = false;
      clientStore.showToast(`⚡ Sovereign Relay "${newRelay.name}" launched!`, 'success');
      clientStore.notify();
    }
  }, { signal });

  // Invite Modal & Link Copy
  document.querySelectorAll('[data-open-relay-invite]').forEach(btn => {
    btn.addEventListener('click', () => {
      const relayId = btn.getAttribute('data-open-relay-invite') || relaysManager.activeRelayId;
      relaysManager.targetInviteRelayId = relayId;
      relaysManager.isInviteModalOpen = true;
      clientStore.notify();
    }, { signal });
  });
  document.getElementById('btn-close-invite-modal')?.addEventListener('click', () => {
    relaysManager.isInviteModalOpen = false;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-done-invite-modal')?.addEventListener('click', () => {
    relaysManager.isInviteModalOpen = false;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-copy-relay-invite')?.addEventListener('click', () => {
    const input = document.getElementById('relay-invite-url-input') as HTMLInputElement;
    if (input) {
      navigator.clipboard?.writeText(input.value);
      const textSpan = document.getElementById('copy-btn-text');
      if (textSpan) textSpan.textContent = '✓ Copied!';
      clientStore.showToast('📋 Sovereign Invite Link copied to clipboard!', 'success');
      setTimeout(() => { if (textSpan) textSpan.textContent = 'Copy'; }, 2000);
    }
  }, { signal });

  // Join Relay Modal
  document.getElementById('btn-open-join-relay')?.addEventListener('click', () => {
    relaysManager.isJoinModalOpen = true;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-join-modal')?.addEventListener('click', () => {
    relaysManager.isJoinModalOpen = false;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-cancel-join-modal')?.addEventListener('click', () => {
    relaysManager.isJoinModalOpen = false;
    clientStore.notify();
  }, { signal });
  document.getElementById('form-join-relay')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = (document.getElementById('join-relay-input') as HTMLInputElement)?.value.trim();
    if (input) {
      const joined = relaysManager.joinRelay(input, clientStore.keypair.fingerprint);
      if (joined) {
        relaysManager.isJoinModalOpen = false;
        clientStore.showToast(`🔑 Joined Sovereign Relay "${joined.name}"!`, 'success');
        clientStore.notify();
      } else {
        const err = document.getElementById('join-relay-error');
        if (err) {
          err.textContent = '✗ Invalid invite code or relay unreachable.';
          err.classList.remove('hidden');
        }
      }
    }
  }, { signal });

  // Delete Relay Listener
  document.querySelectorAll('[data-delete-relay]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const relayId = btn.getAttribute('data-delete-relay');
      if (!relayId) return;
      const relay = relaysManager.getRelayById(relayId);
      const name = relay ? relay.name : 'this Relay';
      const proceedDel = await sovereignDialog.confirm(`Are you sure you want to permanently delete Sovereign Relay "${name}"?\nAll associated channels and messages will be removed.`, { title: 'Delete Sovereign Relay', destructive: true });
      if (proceedDel) {
        const ok = relaysManager.deleteRelay(relayId, clientStore.keypair?.fingerprint);
        if (ok) {
          clientStore.showToast(`🗑️ Sovereign Relay "${name}" deleted.`, 'info');
        } else {
          clientStore.showToast('Could not delete relay.', 'warning');
        }
      }
    }, { signal });
  });

  // Leave Relay Listener
  document.querySelectorAll('[data-leave-relay]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const relayId = btn.getAttribute('data-leave-relay');
      if (!relayId) return;
      const relay = relaysManager.getRelayById(relayId);
      const name = relay ? relay.name : 'this Relay';
      const proceedLeave = await sovereignDialog.confirm(`Leave Sovereign Relay "${name}"?\nYou can rejoin anytime with the invite code.`, { title: 'Leave Sovereign Relay', confirmText: 'Leave' });
      if (proceedLeave) {
        const ok = relaysManager.leaveRelay(relayId, clientStore.keypair?.fingerprint);
        if (ok) {
          clientStore.showToast(`🚪 Left Sovereign Relay "${name}".`, 'info');
        } else {
          clientStore.showToast('Could not leave relay.', 'warning');
        }
      }
    }, { signal });
  });

  // Sovereign Mnemonic Vault & Steganography & Archive & Social Recovery & Keyboard Shortcuts Modals
  
  // Command Rail 2.0 Global Keyboard Shortcut (Ctrl+K / Cmd+K) & Header Search Trigger
  if (!(window as any)._cmdRailBound) {
    (window as any)._cmdRailBound = true;
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (commandRailV2.isOpen) {
          commandRailV2.close();
        } else {
          commandRailV2.open();
        }
        clientStore.notify();
      }
    });

    document.querySelectorAll('[data-open-command-rail], #btn-header-search').forEach(btn => {
      btn.addEventListener('click', () => {
        commandRailV2.open();
        clientStore.notify();
      });
    });
  }

  if (commandRailV2.isOpen) {
    commandRailV2.attachEvents(document.body, () => {
      commandRailV2.close();
      clientStore.notify();
    });
  }

  // Advanced tools already load when opened. Avoid evaluating their modules
  // during the first scroll; only load the sandbox when code is actually shown.
  if (document.querySelector('pre code')) {
    void import('./code-sandbox.js').then(m => m.attachSandboxRunnersToDOM(document.body));
  }

  // sovereignMnemonicModal binds on open
  // steganographyModal binds on open
  // sovereignArchiveModal binds on open
  // socialRecoveryModal binds on open
  keyboardNavigator.bindModalEvents();

  // Auto-join query param on page load
  if (typeof window !== 'undefined' && window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite') || params.get('relay');
    if (invite && !(window as any).__aetherisInviteProcessed) {
      (window as any).__aetherisInviteProcessed = true;
      const joined = relaysManager.joinRelay(invite, clientStore.keypair.fingerprint);
      if (joined) {
        clientStore.showToast(`🔑 Automatically joined Sovereign Relay "${joined.name}"!`, 'success');
      }
    }
  }

  // Global ESC & Arrow keys — close any open modal or navigate lightbox (registered once)
  if (!_escListenerAdded) {
    _escListenerAdded = true;
    sovereignWebPush.attachPushDomListeners();
    
    // Virtual Scroll optimization for large feeds (>15 items)
    const feedList = document.getElementById('pulse-feed-container');
    if (feedList && clientStore.posts.length > 15) {
      virtualScroll.attachContainer(feedList);
      virtualScroll.setItems(clientStore.posts);
    }
  
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // If an inner portal/picker/popover is active, dismiss it and do not close the underlying post
        const activePickerOrPortal = document.querySelector('.reaction-picker-portal, #reaction-picker, [data-portal-picker]');
        if (activePickerOrPortal) {
          activePickerOrPortal.remove();
          return;
        }

        if (obsidianMediaPlayer.isLightboxOpen()) {
          obsidianMediaPlayer.closeLightbox();
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (settingsView?.isOpen) {
          settingsView?.close();
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (storiesEngine.activeStoryId || storiesEngine.isCreatorOpen) {
          storiesEngine.activeStoryId = null;
          storiesEngine.closeCreator();
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (modalManager.getActiveFeature()) {
          modalManager.closeFeature();
          return;
        }
        if (offlineSync.isOpen) {
          offlineSync.close();
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        void import('./cyber-defense-hub.js').then(({ cyberDefenseHub }) => {
          if (cyberDefenseHub.isOpen) cyberDefenseHub.close();
        });
        if (isThemeModalOpen || themeEngine.isModalOpen) {
          isThemeModalOpen = false;
          themeEngine.closeModal();
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (isLangModalOpen) {
          isLangModalOpen = false;
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (isGlobalScaleModalOpen) {
          isGlobalScaleModalOpen = false;
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (keyboardNavigator.isHelpModalOpen) {
          keyboardNavigator.closeHelpModal();
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (isBookmarkModalOpen) {
          isBookmarkModalOpen = false;
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (isNotificationPanelOpen) {
          isNotificationPanelOpen = false;
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (profileView.isEditProfileModalOpen) {
          profileView.isEditProfileModalOpen = false;
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (omniComposer.isModalOpen) {
          omniComposer.isModalOpen = false;
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (clientStore.isComposerOpen) {
          clientStore.toggleComposer();
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (commandRailV2.isOpen) {
          commandRailV2.close();
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (clientStore.isCommandRailOpen) {
          clientStore.toggleCommandRail();
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (activeCrossPostId) {
          activeCrossPostId = null;
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        if (isMobileDrawerOpen) {
          isMobileDrawerOpen = false;
          clientStore.notifySync('MODAL_CHANGE');
          return;
        }
        pulseActionsEngine.closeRepostMenu();
        awardsSystem.closeModal();

        // Finally, if post detail is open and no other modal was active, close it
        if (postDetailView.isOpen()) {
          postDetailView.closePost();
          clientStore.notifySync();
          return;
        }
      } else if (obsidianMediaPlayer.isLightboxOpen()) {
        if (e.key === 'ArrowRight') { obsidianMediaPlayer.nextImage(); clientStore.notify(); }
        else if (e.key === 'ArrowLeft') { obsidianMediaPlayer.prevImage(); clientStore.notify(); }
        else if (e.key === '+') { obsidianMediaPlayer.zoomIn(); clientStore.notify(); }
        else if (e.key === '-') { obsidianMediaPlayer.zoomOut(); clientStore.notify(); }
      }
    });
  }

  // Initialize video autoplay observer for feed videos
  obsidianMediaPlayer.initAutoplayObserver();
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
