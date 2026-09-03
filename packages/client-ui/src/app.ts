import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { clientStore, ClientMessage, ClientPost, ClientNanopublication, SpaceType } from './client-state.js';
import { setupKeyboardShortcuts, getAvailableCommands } from './command-rail.js';
import { NeuralDSPPipeline } from './audio-dsp.js';
import { inspectBinary } from '@aetheris/vault-engine';
import { threadManager, ThreadComment, DEPTH_COLORS } from './threads.js';
import { voiceVisualizer } from './webrtc-voice.js';
import { p2pFileClient } from './p2p-client.js';
import { ZKPassportVerifier } from '@aetheris/core-crypto';
import { localSearchIndex, SearchResult } from './search-index.js';
import { screenShareEngine } from './screenshare.js';
import { obsidianMediaPlayer } from './media-player.js';
import { pollEngine } from './polls.js';
import { trendingEngine } from './trending.js';
import { omniComposer, OmniComposer } from './composer.js';
import { hybridComposer, HybridComposer } from './composer-hybrid.js';
import { exploreView } from './explore-view.js';
import { profileView } from './profile-view.js';
import { pulseActionsEngine } from './pulse-actions.js';
import { storiesEngine } from './stories.js';
import { notificationCenter } from './notifications.js';
import { reactionsEngine } from './reactions.js';
import { bookmarksVault } from './bookmarks.js';
import { relaysManager } from './relays-manager.js';
import { awardsSystem, awardPopoverManager } from './awards.js';
import { crossPostEngine } from './crosspost.js';
import { profileCardEngine } from './profile-card.js';
import { keyboardNavigator } from './keyboard-nav.js';
import { sovereignMnemonicModal } from './mnemonic-modal.js';
import { steganographyModal } from './steganography-modal.js';
import { sovereignArchiveModal } from './archive-modal.js';
import { socialRecoveryModal } from './social-recovery-modal.js';
import { exportSovereignArchive, importSovereignArchive, downloadArchiveFile } from './data-archive.js';
import { touchGestureEngine } from './touch-gestures.js';
import { crossTabSync } from './cross-tab-sync.js';
import { hashtagExplorer } from './hashtag-explorer.js';
import { flairFilter } from './flair-filter.js';
import { postDetailView } from './post-detail.js';
import { contextMenuEngine } from './context-menu.js';
import { downloadManager } from './download-manager.js';
import { networkActivityFeed } from './activity-feed.js';
import { localAnalytics } from './analytics-widget.js';
import { zkProofVisualizer } from './zk-proof-viewer.js';
import { linkPreviewEngine } from './link-preview.js';
import { collectionsEngine } from './collections.js';
import { onboardingWizard } from './onboarding.js';
import { markdownRenderer } from './markdown-renderer.js';
import { diagramRenderer } from './diagram-renderer.js';
import { themeEngine } from './themes.js';
import { breadcrumbsManager } from './breadcrumbs.js';
import { zenModeManager } from './zen-mode.js';
import { soundEffects } from './sound-effects.js';
import { draftAutosave } from './draft-autosave.js';
import { autocompleteEngine } from './autocomplete.js';
import { floatingPiP } from './pip-float.js';
import { inlineDiffViewer } from './diff-viewer.js';
import { wotSlider } from './wot-slider.js';
import { timelineScrubber } from './timeline-scrubber.js';
import { commandRailV2 } from './command-rail-v2.js';
import { sovereignDM } from './sovereign-dm.js';
import { spatialAudio } from './spatial-audio.js';
import { spatialAudioMesh } from './spatial-audio-mesh.js';
import { soundPacks } from './sound-packs.js';
import { sharePostOrCopyLink } from './dry-utils.js';
import { toastManager } from './toast.js';

// V4 Imports
import { aiAssistant } from './ai-assistant.js';
import { richEditor } from './rich-editor.js';
import { virtualScroll } from './virtual-scroll.js';
import { aethDB } from './indexed-db.js';
import { gossipViz } from './gossip-viz.js';
import { webrtcTransfer } from './webrtc-transfer.js';
import { networkObservatory } from './network-observatory.js';
import { customThemeBuilder } from './custom-theme-builder.js';
import { slideDeckManager } from './slide-deck.js';
import { governanceDAO } from './governance.js';
import { rssImporter } from './rss-import.js';
import { cryptoWorkerPool } from './web-workers.js';
import { pwaService } from './pwa-service.js';
import { cveMonitor } from './cve-monitor.js';
import { webAuthnManager } from './webauthn.js';
import { viewTransitions } from './view-transitions.js';
import { moduleLoader } from './code-splitting.js';
import { feedPersonalization } from './feed-personalization.js';
import { exportBackup } from './export-backup.js';
import { walletBridge } from './wallet-bridge.js';
import { wotGraphViz } from './network-wot-graph.js';
import { cyberDefenseHub } from './cyber-defense-hub.js';
import { sovereignOnboarding } from './first-time-onboarding.js';
import { zkReputation } from './zk-reputation.js';
import { merkleVisualizer } from './merkle-viz.js';
import { offlineSync } from './offline-sync.js';
import { meshMatrix } from './mesh-matrix.js';
import { paperWallet } from './paper-wallet.js';
import { acousticDSP } from './acoustic-dsp.js';
import { errorBoundary, structuredLogger } from './error-boundary.js';
import { i18n, t, SUPPORTED_LANGUAGES } from './i18n.js';
import { globalScale } from './global-scale.js';
import { feedControlsEngine } from './feed-controls.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { sovereignWebPush } from './web-push.js';
import { codeSandbox, attachSandboxRunnersToDOM } from './code-sandbox.js';
import { chaumianVotingManager } from './chaumian-voting.js';
import { webTorrentSwarm } from './webtorrent-swarm.js';
import { nodeFederationEngine } from './node-federation.js';
import { transparencyMode } from './transparency-mode.js';
import { zkDeliveryManager } from './delivery-proof.js';

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

// Register Core Singletons into Inversion of Control Container
serviceRegistry.registerInstance(SERVICES.ClientStore, clientStore);
serviceRegistry.registerInstance(SERVICES.ThemeEngine, themeEngine);
serviceRegistry.registerInstance(SERVICES.ZKReputation, zkReputation);
serviceRegistry.registerInstance(SERVICES.MerkleVisualizer, merkleVisualizer);
serviceRegistry.registerInstance(SERVICES.OfflineSync, offlineSync);
serviceRegistry.registerInstance(SERVICES.MeshMatrix, meshMatrix);
serviceRegistry.registerInstance(SERVICES.PaperWallet, paperWallet);
serviceRegistry.registerInstance(SERVICES.AcousticDSP, acousticDSP);
serviceRegistry.registerInstance(SERVICES.NetworkObservatory, networkObservatory);
serviceRegistry.registerInstance(SERVICES.WotGraph, wotGraphViz);
serviceRegistry.registerInstance(SERVICES.CustomThemeBuilder, customThemeBuilder);
serviceRegistry.registerInstance(SERVICES.WalletBridge, walletBridge);
serviceRegistry.registerInstance(SERVICES.ErrorBoundary, errorBoundary);
serviceRegistry.registerInstance(SERVICES.StructuredLogger, structuredLogger);
serviceRegistry.registerInstance(SERVICES.I18nEngine, i18n);
serviceRegistry.registerInstance(SERVICES.GlobalScale, globalScale);
serviceRegistry.registerInstance(SERVICES.OmniComposer, omniComposer);
serviceRegistry.registerInstance(SERVICES.PollEngine, pollEngine);
serviceRegistry.registerInstance(SERVICES.MediaPlayer, obsidianMediaPlayer);
serviceRegistry.registerInstance(SERVICES.Reactions, reactionsEngine);
serviceRegistry.registerInstance(SERVICES.Awards, awardsSystem);
serviceRegistry.registerInstance(SERVICES.BookmarksVault, bookmarksVault);
serviceRegistry.registerInstance(SERVICES.CrossPostEngine, crossPostEngine);
serviceRegistry.registerInstance(SERVICES.ProfileCardEngine, profileCardEngine);
serviceRegistry.registerInstance(SERVICES.PostDetailView, postDetailView);
serviceRegistry.registerInstance(SERVICES.TrendingEngine, trendingEngine);
serviceRegistry.registerInstance(SERVICES.StoriesEngine, storiesEngine);
serviceRegistry.registerInstance(SERVICES.Notifications, notificationCenter);
serviceRegistry.registerInstance(SERVICES.MarkdownRenderer, markdownRenderer);
serviceRegistry.registerInstance(SERVICES.DiagramRenderer, diagramRenderer);
serviceRegistry.registerInstance(SERVICES.ZenMode, zenModeManager);
serviceRegistry.registerInstance(SERVICES.TimelineScrubber, timelineScrubber);
serviceRegistry.registerInstance(SERVICES.ViewTransitions, viewTransitions);
serviceRegistry.registerInstance(SERVICES.VirtualScroll, virtualScroll);
serviceRegistry.registerInstance(SERVICES.FeedPersonalization, feedPersonalization);
serviceRegistry.registerInstance(SERVICES.ExportBackup, exportBackup);
serviceRegistry.registerInstance(SERVICES.GovernanceDAO, governanceDAO);
serviceRegistry.registerInstance(SERVICES.RSSImporter, rssImporter);
serviceRegistry.registerInstance(SERVICES.CVEMonitor, cveMonitor);
serviceRegistry.registerInstance(SERVICES.GossipViz, gossipViz);
serviceRegistry.registerInstance(SERVICES.SearchIndex, localSearchIndex);
serviceRegistry.registerInstance(SERVICES.LinkPreview, linkPreviewEngine);
serviceRegistry.registerInstance(SERVICES.CollectionsEngine, collectionsEngine);
serviceRegistry.registerInstance(SERVICES.SoundEffects, soundEffects);
serviceRegistry.registerInstance(SERVICES.ContextMenu, contextMenuEngine);
serviceRegistry.registerInstance(SERVICES.KeyboardNav, keyboardNavigator);
serviceRegistry.registerInstance(SERVICES.FlairFilter, flairFilter);
serviceRegistry.registerInstance(SERVICES.HashtagExplorer, hashtagExplorer);
serviceRegistry.registerInstance(SERVICES.AutocompleteEngine, autocompleteEngine);
serviceRegistry.registerInstance(SERVICES.DraftAutosave, draftAutosave);
serviceRegistry.registerInstance(SERVICES.FloatingPiP, floatingPiP);
serviceRegistry.registerInstance(SERVICES.WotSlider, wotSlider);
serviceRegistry.registerInstance(SERVICES.CommandRail, commandRailV2);
serviceRegistry.registerInstance(SERVICES.AIAssistant, aiAssistant);
serviceRegistry.registerInstance(SERVICES.RichEditor, richEditor);
serviceRegistry.registerInstance(SERVICES.PWAService, pwaService);
serviceRegistry.registerInstance(SERVICES.CryptoWorkerPool, cryptoWorkerPool);
serviceRegistry.registerInstance(SERVICES.ModuleLoader, moduleLoader);
serviceRegistry.registerInstance(SERVICES.SovereignOnboarding, sovereignOnboarding);
serviceRegistry.registerInstance(SERVICES.SpatialAudio, spatialAudio);
serviceRegistry.registerInstance(SERVICES.SteganographyModal, steganographyModal);
serviceRegistry.registerInstance(SERVICES.CodeSandbox, codeSandbox);
serviceRegistry.registerInstance(SERVICES.WebTorrentSwarm, webTorrentSwarm);
serviceRegistry.registerInstance(SERVICES.SpatialAudioMesh, spatialAudioMesh);
serviceRegistry.registerInstance(SERVICES.SoundPacks, soundPacks);
serviceRegistry.registerInstance(SERVICES.NodeFederation, nodeFederationEngine);

if (typeof window !== 'undefined') {
  window.codeSandbox = codeSandbox;
  window.chaumianVotingManager = chaumianVotingManager;
  window.sovereignWebPush = sovereignWebPush;
  window.webTorrentSwarm = webTorrentSwarm;
  window.spatialAudioMesh = spatialAudioMesh;
  window.soundPacks = soundPacks;
  window.nodeFederationEngine = nodeFederationEngine;
  window.__aetheris_close_gossip = () => { isGossipModalOpen = false; clientStore.notify(); };
  window.__aetheris_close_rss = () => { isRSSModalOpen = false; clientStore.notify(); };
  window.__aetheris_close_cve = () => { isCVEModalOpen = false; clientStore.notify(); };
  window.__aetheris_close_dao = () => { isGovernanceModalOpen = false; clientStore.notify(); };
  window.__aetheris_close_governance = () => { isGovernanceModalOpen = false; clientStore.notify(); };
  window.__aetheris_close_export = () => { isExportBackupModalOpen = false; clientStore.notify(); };
  window.__aetheris_open_theme = () => { isThemeModalOpen = true; clientStore.notify(); };
  window.__aetheris_close_theme = () => { isThemeModalOpen = false; clientStore.notify(); };
  window.__aetheris_apply_theme = (id: string) => { themeEngine.setTheme(id); isThemeModalOpen = false; clientStore.notify(); };
  window.__aetherisToggleNotifs = () => { isNotificationPanelOpen = !isNotificationPanelOpen; clientStore.notify(); };
  window.__aetherisCloseNotifs = () => { isNotificationPanelOpen = false; clientStore.notify(); };
  window.__aetheris_close_lang = () => { isLangModalOpen = false; clientStore.notify(); };
  window.__aetheris_close_observatory = () => { networkObservatory.close(); clientStore.notify(); };
  window.__aetheris_close_wot_graph = () => { wotGraphViz.close(); clientStore.notify(); };
  window.__aetheris_close_custom_theme_builder = () => { customThemeBuilder.closeModal(); clientStore.notify(); };
  window.__aetheris_close_wallet = () => { walletBridge.closeModal(); clientStore.notify(); };
  window.__aetheris_close_reputation = () => { zkReputation.close(); clientStore.notify(); };
  window.__aetheris_close_merkle = () => { merkleVisualizer.close(); clientStore.notify(); };
  window.__aetheris_close_sync = () => { offlineSync.close(); clientStore.notify(); };
  window.__aetheris_open_mnemonic = () => { sovereignMnemonicModal.openModal(); clientStore.notify(); };
  window.__aetheris_close_mnemonic = () => { sovereignMnemonicModal.closeModal(); clientStore.notify(); };
  window.__aetheris_open_steganography = () => { steganographyModal.openModal(); clientStore.notify(); };
  window.__aetheris_close_steganography = () => { steganographyModal.closeModal(); clientStore.notify(); };
  window.__aetheris_open_archive_modal = (tab?: 'export' | 'restore') => { sovereignArchiveModal.openModal(tab); clientStore.notify(); };
  window.__aetheris_close_archive_modal = () => { sovereignArchiveModal.closeModal(); clientStore.notify(); };
  window.__aetheris_open_social_recovery = (tab?: 'setup' | 'recover') => { socialRecoveryModal.openModal(tab); clientStore.notify(); };
  window.__aetheris_close_social_recovery = () => { socialRecoveryModal.closeModal(); clientStore.notify(); };
  window.__aetheris_dismiss_broadcast = () => {
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('aetheris_dismissed_broadcast', clientStore.broadcastAnnouncement || '');
      } catch (_) {}
    }
    clientStore.notify();
  };
  window.__aetheris_close_mesh = () => { meshMatrix.close(); clientStore.notify(); };
  window.__aetheris_close_paper_wallet = () => { paperWallet.close(); clientStore.notify(); };
  window.__aetheris_close_dsp = () => { acousticDSP.close(); clientStore.notify(); };
  window.__aetheris_toggle_mobile_drawer = () => { isMobileDrawerOpen = !isMobileDrawerOpen; clientStore.notify(); };
  window.__aetheris_close_mobile_drawer = () => { isMobileDrawerOpen = false; clientStore.notify(); };
  window.__aetheris_toggle_ui_mode = () => { clientStore.toggleUiMode(); };
  window.__aetheris_set_ui_mode = (mode: 'simple' | 'sovereign') => { clientStore.setUiMode(mode); };
  window.__aetheris_toggle_advanced_overflow = () => { isAdvancedOverflowOpen = !isAdvancedOverflowOpen; clientStore.notify(); };
  window.__aetheris_close_advanced_overflow = () => { isAdvancedOverflowOpen = false; clientStore.notify(); };
  window.zkReputation = zkReputation;
  window.merkleVisualizer = merkleVisualizer;
  window.offlineSync = offlineSync;
  window.meshMatrix = meshMatrix;
  window.paperWallet = paperWallet;
  window.acousticDSP = acousticDSP;
  window.steganographyModal = steganographyModal;
  window.archiveModal = sovereignArchiveModal;
  window.errorBoundary = errorBoundary;
  window.structuredLogger = structuredLogger;
  window.i18n = i18n;
  window.globalScale = globalScale;
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
  window.diagramRenderer = diagramRenderer;
}

let activeAwardPostId: string | null = null;
let activeCrossPostId: string | null = null;
let isNotificationPanelOpen = false;
let isBookmarkModalOpen = false;
let _escListenerAdded = false;

const dsp = new NeuralDSPPipeline();
let currentFilter = '';
let activeDownloadName: string | null = null;
let activeDownloadProgress: number = 0;


function updateReactionBarDOM(postId: string): void {
  const bar = document.querySelector(`.reactions-bar[data-post-id="${postId}"]`);
  if (bar) {
    const newHtml = reactionsEngine.renderReactionBar(postId, clientStore.keypair.fingerprint);
    const temp = document.createElement('div');
    temp.innerHTML = newHtml;
    const newBar = temp.firstElementChild as HTMLElement;
    if (newBar) {
      bar.replaceWith(newBar);
      bindReactionBarEvents(newBar);
    }
  }
}

function bindReactionBarEvents(container: Document | HTMLElement = document): void {
  // 1. Add Reaction (+ React button)
  container.querySelectorAll<HTMLButtonElement>('.add-reaction-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pickerId = btn.getAttribute('data-picker-id');
      if (pickerId) {
        const pk = document.getElementById(pickerId);
        if (pk) {
          const isCurrentlyHidden = pk.classList.contains('hidden');
          // Close all other open reaction pickers first
          document.querySelectorAll('.reactions-picker').forEach(p => {
            if (p.id !== pickerId) p.classList.add('hidden');
          });
          document.querySelectorAll('.add-reaction-btn').forEach(b => {
            if (b !== btn) b.setAttribute('aria-expanded', 'false');
          });

          if (isCurrentlyHidden) {
            pk.classList.remove('hidden');
            btn.setAttribute('aria-expanded', 'true');
            soundEffects.playClick();
          } else {
            pk.classList.add('hidden');
            btn.setAttribute('aria-expanded', 'false');
          }
        }
      }
    });
  });

  // 2. Close Picker Button (Close ✕)
  container.querySelectorAll<HTMLButtonElement>('.close-picker-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pickerId = btn.getAttribute('data-picker-id');
      if (pickerId) {
        const pk = document.getElementById(pickerId);
        if (pk) pk.classList.add('hidden');
        const addBtn = document.querySelector(`.add-reaction-btn[data-picker-id="${pickerId}"]`);
        if (addBtn) addBtn.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // 3. Emoji Reaction Buttons (both in pills and in picker)
  container.querySelectorAll<HTMLButtonElement>('.btn-toggle-reaction').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      const emoji = btn.getAttribute('data-emoji');
      if (postId && emoji) {
        reactionsEngine.toggleReaction(postId, emoji, clientStore.keypair.fingerprint);
        soundEffects.playReaction();
        localAnalytics.recordUpvote();

        // Particle burst from button
        const rect = btn.getBoundingClientRect();
        if (rect && rect.top > 0) {
          reactionsEngine.triggerParticleBurst(rect.left + rect.width / 2, rect.top, emoji);
        }

        // Close parent picker if clicked inside picker
        const parentPicker = btn.closest('.reactions-picker');
        if (parentPicker) {
          parentPicker.classList.add('hidden');
          const pickerId = parentPicker.id;
          const addBtn = document.querySelector(`.add-reaction-btn[data-picker-id="${pickerId}"]`);
          if (addBtn) addBtn.setAttribute('aria-expanded', 'false');
        }

        // Fast in-place DOM update of this post's reaction bar
        updateReactionBarDOM(postId);

        // Fast notify
        clientStore.notify('REACTION', { postId, emoji });
      }
    });
  });
}

export function initApp(): void {
  errorBoundary.init();
  awardPopoverManager.init();
  setupKeyboardShortcuts();
  keyboardNavigator.bindGlobalShortcuts();
  touchGestureEngine.init();
  crossTabSync.init();

  // Proactive Local AI Assistant Observer
  if (clientStore.proactiveAiEnabled) {
    aiAssistant.startObserver(30000);
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

  // Background Edge Sync Interval (polls public announcements & live state every 30s)
  setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      clientStore.syncFromEdge();
    }
  }, 30000);

  // Initialize DSP
  dsp.start((metrics) => {
    const dbIndicator = document.getElementById('dsp-db-meter');
    const gateIndicator = document.getElementById('dsp-gate-indicator');
    if (dbIndicator) dbIndicator.textContent = `${metrics.currentDb} dB`;
    if (gateIndicator) {
      gateIndicator.className = metrics.isGateOpen ? 'w-2 h-2 rounded-full bg-signal shadow-signal-sm' : 'w-2 h-2 rounded-full bg-gray-600';
    }
  });

  const appEl = document.getElementById('app');
  if (!appEl) return;

  const render = () => {
    errorBoundary.wrapRender(() => {
      // Preserve scroll positions across re-renders
      const rightRail = document.getElementById('right-rail-scroll');
      const rightScroll = rightRail ? rightRail.scrollTop : 0;
      const leftRail = document.getElementById('left-rail-scroll');
      const leftScroll = leftRail ? leftRail.scrollTop : 0;
      const mainFeed = document.getElementById('main-feed-scroll');
      const mainScroll = mainFeed ? mainFeed.scrollTop : 0;

    // Sync search index
    for (const [chId, msgs] of clientStore.messages.entries()) {
      for (const m of msgs) {
        localSearchIndex.indexDocument({
          id: m.id,
          channelId: chId,
          authorFingerprint: m.authorFingerprint,
          content: m.text,
          createdAt: m.createdAt,
          type: 'message',
        });
      }
    }
    for (const p of clientStore.posts) {
      localSearchIndex.indexDocument({
        id: p.id,
        channelId: p.channelId,
        authorFingerprint: p.authorFingerprint,
        content: `${p.title} ${p.content} ${p.flair}`,
        createdAt: p.createdAt,
        type: 'thread',
      });
    }

    const renderAdvancedHeaderTools = (inDropdown: boolean = false): string => {
      if (inDropdown) {
        return `
          <!-- DUAL HORIZON -->
          <button type="button" id="btn-toggle-dual-horizon" title="Toggle Split Screen: Stream + Vault simultaneously (Ctrl+\\)" class="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer ${clientStore.isDualHorizon ? 'border-indigo-500/40 text-indigo-300' : ''}">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4v16m6-16v16M4 4h16v16H4z"></path></svg>
            <span class="font-sans font-medium text-[11px] truncate">Dual Horizon</span>
          </button>

          <!-- ANYCAST EDGE OBSERVATORY -->
          <button type="button" id="btn-open-global-scale" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 font-mono transition-all cursor-pointer" title="Worldwide Anycast Edge Infrastructure (<15ms SLA)">
            <span class="text-xs shrink-0">🌐</span>
            <span class="font-sans font-medium text-[11px] truncate">Anycast Edge (${globalScale.getActivePoP().measuredRttMs}ms)</span>
          </button>

          <!-- SEED VAULT -->
          <button type="button" id="btn-open-seed-vault" onclick="if(window.__aetheris_open_mnemonic) window.__aetheris_open_mnemonic();" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono transition-all cursor-pointer" title="Sovereign Identity Seed Vault (BIP-39)">
            <span class="shrink-0">🔐</span>
            <span class="font-sans font-medium text-[11px] truncate">Seed Vault</span>
          </button>

          <!-- STEGANOGRAPHY -->
          <button type="button" id="btn-open-steganography" onclick="if(window.__aetheris_open_steganography) window.__aetheris_open_steganography();" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono transition-all cursor-pointer" title="Pixel Canvas Steganography (LSB PNG E2EE)">
            <span class="shrink-0">🖼️</span>
            <span class="font-sans font-medium text-[11px] truncate">Stego Canvas</span>
          </button>

          <!-- DATA ARCHIVE -->
          <button type="button" id="btn-open-archive-vault" onclick="if(window.__aetheris_open_archive_modal) window.__aetheris_open_archive_modal();" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-mono transition-all cursor-pointer" title="Sovereign Data Archive (AES-256-GCM Export / Restore)">
            <span class="shrink-0">📦</span>
            <span class="font-sans font-medium text-[11px] truncate">Data Archive</span>
          </button>

          <!-- SOCIAL RECOVERY -->
          <button type="button" id="btn-open-social-recovery" onclick="if(window.__aetheris_open_social_recovery) window.__aetheris_open_social_recovery();" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono transition-all cursor-pointer" title="Social Identity Recovery via WoT Guardians">
            <span class="shrink-0">🛡️</span>
            <span class="font-sans font-medium text-[11px] truncate">Social Recovery</span>
          </button>

          <!-- TRANSPARENCY MODE -->
          <div class="col-span-1 sm:col-span-2">
            ${transparencyMode.renderHeaderToggle()}
          </div>

          <!-- KEYBOARD SHORTCUTS -->
          <button type="button" id="btn-open-keyboard-help" onclick="if(window.keyboardNavigator) window.keyboardNavigator.toggleHelpModal();" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 font-mono transition-all cursor-pointer" title="Keyboard Shortcuts (?)">
            <span class="shrink-0">⌨️</span>
            <span class="font-sans font-medium text-[11px] truncate">Shortcuts (?)</span>
          </button>

          <!-- LANGUAGE SELECTOR -->
          <button type="button" id="btn-open-lang-picker" class="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-base/60 hover:bg-surface-overlay text-slate-300 font-mono transition-all cursor-pointer" title="Switch Language & RTL Mode (${i18n.getCurrentLanguageMeta().name})">
            <span class="shrink-0">${i18n.getCurrentLanguageMeta().flag}</span>
            <span class="font-sans font-medium text-[11px] truncate">${i18n.getLanguage().toUpperCase()}</span>
          </button>

          <!-- BOOKMARKS -->
          <button type="button" id="btn-open-bookmarks-modal" class="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border border-white/5 bg-surface-base/60 text-slate-300 hover:text-amber-400 hover:bg-surface-overlay transition-all cursor-pointer" title="Saved Bookmarks">
            <span class="text-xs shrink-0">🔖</span>
            <span class="font-sans font-medium text-[11px] truncate">Bookmarks</span>
          </button>

          <!-- SOUND, ZEN & OFFLINE SYNC -->
          <div class="col-span-1 sm:col-span-2 flex items-center justify-between p-2 rounded-xl bg-surface-base/40 border border-white/5">
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

      // Sovereign mode (full individual buttons)
      return `
        <button type="button" id="btn-toggle-dual-horizon" title="Toggle Split Screen: Stream + Vault simultaneously (Ctrl+\\)" class="hidden md:flex p-2 text-xs rounded-xl border items-center justify-center transition-all cursor-pointer ${clientStore.isDualHorizon ? 'bg-indigo-950 text-indigo-300 border-indigo-500/40' : 'bg-surface-raised/80 text-slate-400 border-white/5 hover:text-slate-200'}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4v16m6-16v16M4 4h16v16H4z"></path></svg>
        </button>

        <button type="button" id="btn-open-global-scale" class="hidden sm:flex px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-raised/80 hover:bg-surface-overlay text-slate-300 font-mono items-center space-x-1.5 transition-all shadow-sm cursor-pointer" title="Worldwide Anycast Edge Infrastructure (<15ms SLA)">
          <span class="text-xs">🌐</span>
          <span class="hidden xl:inline text-emerald-400 font-bold">${globalScale.getActivePoP().measuredRttMs}ms</span>
        </button>

        <button type="button" id="btn-open-seed-vault" onclick="if(window.__aetheris_open_mnemonic) window.__aetheris_open_mnemonic();" class="hidden sm:flex px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono items-center space-x-1.5 transition-all shadow-sm cursor-pointer" title="Sovereign Identity Seed Vault (BIP-39)">
          <span>🔐</span>
          <span class="hidden 2xl:inline font-sans font-medium">Seed</span>
        </button>

        <button type="button" id="btn-open-steganography" onclick="if(window.__aetheris_open_steganography) window.__aetheris_open_steganography();" class="hidden sm:flex px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono items-center space-x-1.5 transition-all shadow-sm cursor-pointer" title="Pixel Canvas Steganography (LSB PNG E2EE)">
          <span>🖼️</span>
          <span class="hidden 2xl:inline font-sans font-medium">Stego</span>
        </button>

        <button type="button" id="btn-open-archive-vault" onclick="if(window.__aetheris_open_archive_modal) window.__aetheris_open_archive_modal();" class="hidden sm:flex px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-mono items-center space-x-1.5 transition-all shadow-sm cursor-pointer" title="Sovereign Data Archive (AES-256-GCM Export / Restore)">
          <span>📦</span>
          <span class="hidden 2xl:inline font-sans font-medium">Archive</span>
        </button>

        <button type="button" id="btn-open-social-recovery" onclick="if(window.__aetheris_open_social_recovery) window.__aetheris_open_social_recovery();" class="hidden sm:flex px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono items-center space-x-1.5 transition-all shadow-sm cursor-pointer" title="Social Identity Recovery via WoT Guardians">
          <span>🛡️</span>
          <span class="hidden 2xl:inline font-sans font-medium">Recovery</span>
        </button>

        ${transparencyMode.renderHeaderToggle()}

        <button type="button" id="btn-open-keyboard-help" onclick="if(window.keyboardNavigator) window.keyboardNavigator.toggleHelpModal();" class="hidden lg:flex px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-raised/80 hover:bg-surface-overlay text-slate-300 font-mono items-center space-x-1.5 transition-all shadow-sm cursor-pointer" title="Keyboard Shortcuts (?)">
          <span>⌨️</span>
          <span class="hidden 2xl:inline font-sans font-medium">Keys</span>
        </button>

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
          <button type="button" id="btn-open-bookmarks-modal" class="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-surface-raised transition-all cursor-pointer" title="Saved Bookmarks">
            <span class="text-sm">🔖</span>
          </button>
        </div>
      `;
    };

    appEl.innerHTML = `
      <div id="main-layout" class="flex flex-col h-screen w-screen bg-canvas text-slate-200 overflow-hidden font-sans select-none">
        
        <!-- PULL TO REFRESH INDICATOR -->
        ${touchGestureEngine.renderIndicatorHTML()}

        <!-- TOAST CONTAINER -->
        <div id="toast-root">${renderToasts()}</div>

        <!-- QUARANTINE / SLASHING ALERT BANNER -->
        ${renderQuarantineAlert()}

        <!-- SYSTEM EMERGENCY BROADCAST BANNER -->
        <div id="broadcast-root">${renderBroadcastBanner()}</div>

        <!-- TOP BAR: SOVEREIGN HEADER & CONTROLS -->
        <header class="h-14 border-subtle-b bg-surface-base/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 shadow-md">
          
          <!-- LEFT: LOGO + PRIMARY WORKSPACE MODES -->
          <div class="flex items-center space-x-3 sm:space-x-6">
            <button type="button" id="btn-toggle-mobile-drawer" class="lg:hidden p-2 rounded-xl bg-surface-raised border border-white/5 text-slate-300 hover:text-white cursor-pointer" title="Toggle Navigation Drawer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <div class="flex items-center space-x-3 cursor-pointer group" onclick="window.clientStore?.joinChannel('pulse-global')">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-slate-800 flex items-center justify-center font-bold text-sm text-white tracking-widest shadow-md group-hover:scale-105 transition-transform">
                Æ
              </div>
              <div class="flex flex-col">
                <div class="flex items-center space-x-2">
                  <span class="font-bold tracking-wider text-sm text-white font-sans">
                    AETHERIS
                  </span>
                  <span class="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 font-semibold">
                    Sovereign Core
                  </span>
                </div>
                <span class="text-[10px] text-slate-400 font-mono -mt-0.5">Zero-Trust Protocol</span>
              </div>
            </div>

            <!-- PRIMARY WORKSPACE NAVIGATION DOCK -->
            <nav class="hidden md:flex items-center space-x-1 bg-surface-raised/80 p-1 rounded-2xl border border-white/5 text-xs shadow-inner">
              <button type="button" data-nav-mode="pulse" class="btn-nav-mode px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${clientStore.activeChannelId.startsWith('pulse-') ? 'bg-surface-overlay text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-overlay/50'}">
                <span>⚡</span>
                <span>Pulse Stream</span>
              </button>

              <button type="button" data-nav-mode="explore" class="btn-nav-mode px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${clientStore.activeChannelId === 'explore' ? 'bg-surface-overlay text-cyan-400 shadow-sm border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-overlay/50'}">
                <span>🔍</span>
                <span>Explore</span>
              </button>

              <button type="button" data-nav-mode="profile" class="btn-nav-mode px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${clientStore.activeChannelId.startsWith('profile') ? 'bg-surface-overlay text-indigo-300 shadow-sm border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-overlay/50'}">
                <span>👤</span>
                <span>Profile</span>
              </button>

              <button type="button" data-nav-mode="vault" class="btn-nav-mode px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${clientStore.activeChannelId.startsWith('vault-') ? 'bg-surface-overlay text-emerald-400 shadow-sm border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-overlay/50'}">
                <span>📚</span>
                <span>Knowledge Vault</span>
              </button>

              <button type="button" data-nav-mode="relays" class="btn-nav-mode px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${clientStore.activeChannelId.startsWith('relays-') ? 'bg-surface-overlay text-indigo-400 shadow-sm border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-overlay/50'}">
                <span>💬</span>
                <span>Live Relays</span>
              </button>
            </nav>
          </div>

          <!-- CENTER: UNIFIED SEARCH & COMMAND OMNIBAR -->
          <div class="hidden lg:flex items-center flex-1 max-w-md mx-6">
            <button type="button" id="btn-open-command-rail" class="w-full flex items-center justify-between px-3.5 py-1.5 bg-surface-raised/80 hover:bg-surface-overlay text-slate-400 hover:text-slate-200 text-xs rounded-xl border border-white/5 transition-all shadow-sm hover:border-indigo-500/30 group cursor-pointer">
              <div class="flex items-center space-x-2.5">
                <svg class="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <span class="text-slate-300 font-medium">Search ledger, circles, or commands...</span>
              </div>
              <span class="kbd-badge">Ctrl+K</span>
            </button>
          </div>

          <!-- RIGHT: USER CONTROL HUB -->
          <div class="flex items-center space-x-2 sm:space-x-2.5">
            
            <!-- MOBILE SEARCH TRIGGER (visible on mobile/tablet) -->
            <button type="button" id="btn-mobile-search-trigger" class="lg:hidden p-2 text-xs rounded-xl border border-white/5 bg-surface-raised/80 hover:bg-surface-overlay text-slate-300 transition-all cursor-pointer" title="Search (Ctrl+K)">
              <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </button>

            <!-- PWA 1-CLICK INSTALL (visible when installable) -->
            <button type="button" id="btn-pwa-install" onclick="if(window.pwaService) window.pwaService.promptInstall();" class="hidden px-2.5 py-1.5 text-xs rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono items-center space-x-1.5 transition-all shadow-sm cursor-pointer" title="Install Aetheris as Native App">
              <span>📲</span>
              <span class="font-sans font-medium">Install</span>
            </button>

            <!-- NETWORK STATUS BADGE -->
            <div id="network-status-badge" class="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 select-none">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="hidden 2xl:inline">Synced</span>
            </div>

            <!-- UI MODE SWITCHER PILL (Simple / Sovereign) -->
            <button type="button" id="btn-toggle-ui-mode" onclick="window.clientStore?.toggleUiMode()" class="px-2.5 py-1.5 rounded-xl text-xs font-mono border transition-all flex items-center space-x-1.5 cursor-pointer ${clientStore.uiMode === 'simple' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30'}" title="${i18n.t('uiMode.switchMode', undefined, 'Switch Interface Mode')}">
              <span>${clientStore.uiMode === 'simple' ? '🌱' : '⚡'}</span>
              <span class="font-sans text-[11px] font-semibold">${clientStore.uiMode === 'simple' ? i18n.t('uiMode.simple', undefined, 'Simple') : i18n.t('uiMode.sovereign', undefined, 'Sovereign')}</span>
            </button>

            ${clientStore.uiMode === 'sovereign' 
              ? renderAdvancedHeaderTools(false)
              : `
                <!-- ADVANCED TOOLS OVERFLOW DROPDOWN (SIMPLE MODE) -->
                <div class="relative">
                  <button type="button" id="btn-open-advanced-overflow" onclick="window.__aetheris_toggle_advanced_overflow && window.__aetheris_toggle_advanced_overflow()" class="p-2 text-xs rounded-xl border border-white/5 bg-surface-raised/80 hover:bg-surface-overlay text-slate-300 transition-all flex items-center space-x-1.5 cursor-pointer" title="${i18n.t('uiMode.advancedTools', undefined, 'Advanced Tools')}">
                    <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    <span class="hidden xl:inline text-[11px] font-sans text-slate-300 font-medium">${i18n.t('uiMode.advancedTools', undefined, 'Advanced Tools')}</span>
                  </button>

                  ${isAdvancedOverflowOpen ? `
                    <div id="advanced-overflow-backdrop" class="fixed inset-0 z-40" onclick="window.__aetheris_close_advanced_overflow && window.__aetheris_close_advanced_overflow()"></div>
                    <div id="advanced-overflow-menu" class="absolute right-0 top-full mt-2 w-80 p-3 bg-surface-raised/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-2.5 select-none">
                      <div class="flex items-center justify-between pb-2 border-b border-white/5">
                        <span class="text-xs font-bold text-white font-mono flex items-center space-x-1.5">
                          <span>🛠️</span>
                          <span>${i18n.t('uiMode.advancedTools', undefined, 'Advanced Tools')}</span>
                        </span>
                        <button type="button" onclick="window.clientStore?.setUiMode('sovereign')" class="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer">
                          Switch to Sovereign ⚡
                        </button>
                      </div>
                      <div class="grid grid-cols-2 gap-2">
                        ${renderAdvancedHeaderTools(true)}
                      </div>
                    </div>
                  ` : ''}
                </div>
              `
            }

            <!-- THEME SELECTOR (all screens) -->
            <button type="button" id="btn-open-theme-picker" onclick="if(window.__aetheris_open_theme) window.__aetheris_open_theme();" class="px-2.5 py-1.5 text-xs rounded-xl border border-white/5 bg-surface-raised/80 hover:bg-surface-overlay text-slate-300 font-mono flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer" title="Choose Theme & Typography">
              <span>🎨</span>
              <span class="hidden xl:inline font-sans font-medium">Theme</span>
            </button>

            <!-- NOTIFICATIONS BELL (all screens) -->
            <div class="relative flex items-center">
              <button type="button" id="btn-toggle-notifs" onclick="if(window.__aetherisToggleNotifs) window.__aetherisToggleNotifs();" class="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-raised transition-all cursor-pointer" title="Notifications">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                ${notificationCenter.unreadCount > 0 ? `<span class="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span><span class="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>` : ''}
              </button>
            </div>

            <!-- WALLET & IDENTITY PILL -->
            <div class="flex items-center space-x-1.5 pl-1.5 sm:pl-2 border-l border-white/10">
              <div id="aetheris-wallet-button-container" class="hidden sm:block">
                ${walletBridge.renderWalletButton()}
              </div>

              <button type="button" id="btn-identity-info" class="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-surface-raised/80 hover:bg-surface-overlay border border-white/5 transition-all cursor-pointer group" title="Sovereign Identity Passport & ZK Reputation">
                <div class="w-2 h-2 rounded-full ${clientStore.isConnected ? 'bg-emerald-400' : 'bg-rose-500'}"></div>
                <span class="font-mono text-xs text-slate-200 group-hover:text-indigo-300 truncate max-w-[70px] sm:max-w-none">id:${clientStore.keypair.fingerprint.substring(0, 6)}...</span>
                <span class="hidden sm:inline">${zkReputation.renderReputationBadge(342)}</span>
              </button>
            </div>

          </div>
        </header>

        <!-- MAIN TRIPLE-COLUMN BODY -->
        <div class="flex-1 flex overflow-hidden relative">
          
          <!-- LEFT COMMAND RAIL + SOVEREIGN CIRCLES -->
          <aside id="left-rail-container" class="w-64 bg-surface-base border-subtle-r flex flex-col justify-between shrink-0 select-none hidden lg:flex">
            <div id="left-rail-scroll" class="p-3 overflow-y-auto space-y-4">
              
              <!-- PRIMARY NAVIGATION DOCK -->
              <div class="space-y-1">
                <button type="button" data-nav-mode="pulse" class="btn-nav-mode w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId.startsWith('pulse-') ? 'bg-indigo-950/60 text-white border border-indigo-500/30 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
                  <span class="text-base">⚡</span>
                  <span class="flex-1">Pulse Stream</span>
                  ${clientStore.activeChannelId.startsWith('pulse-') ? '<span class="w-2 h-2 rounded-full bg-indigo-400"></span>' : ''}
                </button>

                <button type="button" data-nav-mode="explore" class="btn-nav-mode w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId === 'explore' ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
                  <span class="text-base">🔍</span>
                  <span class="flex-1">Explore & Trends</span>
                  ${clientStore.activeChannelId === 'explore' ? '<span class="w-2 h-2 rounded-full bg-cyan-400"></span>' : ''}
                </button>

                <button type="button" data-nav-mode="profile" class="btn-nav-mode w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId.startsWith('profile') ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
                  <span class="text-base">👤</span>
                  <span class="flex-1">Sovereign Profile</span>
                  ${clientStore.activeChannelId.startsWith('profile') ? '<span class="w-2 h-2 rounded-full bg-indigo-400"></span>' : ''}
                </button>

                <button type="button" data-nav-mode="vault" class="btn-nav-mode w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId.startsWith('vault-') ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
                  <span class="text-base">📚</span>
                  <span class="flex-1">Knowledge Vault</span>
                  ${clientStore.activeChannelId.startsWith('vault-') ? '<span class="w-2 h-2 rounded-full bg-emerald-400"></span>' : ''}
                </button>

                <button type="button" data-nav-mode="relays" class="btn-nav-mode w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId.startsWith('relays-') || clientStore.activeChannelId.startsWith('relay-') ? 'bg-slate-800/80 text-indigo-300 border border-indigo-500/30 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
                  <span class="text-base">💬</span>
                  <span class="flex-1">Live Relays</span>
                  ${clientStore.activeChannelId.startsWith('relays-') || clientStore.activeChannelId.startsWith('relay-') ? '<span class="w-2 h-2 rounded-full bg-indigo-400"></span>' : ''}
                </button>

                <button type="button" id="rail-btn-bookmarks" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                  <span class="text-base">🔖</span>
                  <span class="flex-1">Saved Bookmarks</span>
                </button>

                <button type="button" id="rail-btn-theme" onclick="if(window.__aetheris_open_theme) window.__aetheris_open_theme();" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                  <span class="text-base">🎨</span>
                  <span class="flex-1">Display & Themes</span>
                  <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">${themeEngine.currentThemeId}</span>
                </button>

                ${meshMatrix.renderMeshMatrixButton()}

                <!-- DAO GOVERNANCE -->
                <button type="button" id="nav-btn-dao" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                  <span class="text-base">🏛️</span>
                  <span class="flex-1">DAO Governance</span>
                </button>

                <!-- RSS IMPORTER -->
                <button type="button" id="btn-open-rss-panel" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                  <span class="text-base">📡</span>
                  <span class="flex-1">RSS Importer</span>
                </button>

                <!-- CVE SECURITY MONITOR -->
                <button type="button" id="btn-open-cve-monitor" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                  <span class="text-base">🛡️</span>
                  <span class="flex-1">CVE Monitor</span>
                </button>

                <!-- NETWORK OBSERVATORY -->
                <button type="button" id="btn-open-network-observatory" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                  <span class="text-base">🔭</span>
                  <span class="flex-1">Network Observatory</span>
                </button>

                <!-- WOT GRAPH -->
                <button type="button" id="btn-open-wot-graph" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                  <span class="text-base">🕸️</span>
                  <span class="flex-1">Trust Graph</span>
                </button>

                <!-- GOSSIP VISUALIZER -->
                <button type="button" id="btn-open-gossip-viz" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                  <span class="text-base">📡</span>
                  <span class="flex-1">Gossip Visualizer</span>
                </button>

                <!-- EXPORT BACKUP -->
                <button type="button" id="btn-open-backup-export" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
                  <span class="text-base">💾</span>
                  <span class="flex-1">Export & Backup</span>
                </button>

                <!-- SOVEREIGN ADMIN PANEL -->
                <a href="/admin.html" id="link-open-admin-panel" class="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 transition-all flex items-center space-x-3 cursor-pointer" title="Open Sovereign Admin Control Panel">
                  <span class="text-base">⚙️</span>
                  <span class="flex-1 font-mono">Admin Console</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                </a>
              </div>

              <!-- SOVEREIGN CIRCLES & COLLECTIVES -->
              <div class="pt-2 border-t border-white/5 space-y-1">
                <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 px-2 flex items-center justify-between">
                  <span>🏛️ Sovereign Circles</span>
                  <span class="text-emerald-400 text-[9px] font-mono">P2P Mesh</span>
                </div>
                
                <button type="button" data-channel-id="vault-releases" class="btn-channel w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${clientStore.activeChannelId === 'vault-releases' ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
                  <div class="flex items-center space-x-2 truncate">
                    <span class="text-xs">📦</span>
                    <span class="truncate font-semibold">c/clean-releases</span>
                  </div>
                  <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/20">342p</span>
                </button>

                <button type="button" data-channel-id="vault-guides" class="btn-channel w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${clientStore.activeChannelId === 'vault-guides' ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
                  <div class="flex items-center space-x-2 truncate">
                    <span class="text-xs">🛡️</span>
                    <span class="truncate font-semibold">c/security-guides</span>
                  </div>
                  <span class="text-[9px] font-mono text-slate-500">Docs</span>
                </button>

                <button type="button" data-channel-id="pulse-global" class="btn-channel w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${clientStore.activeChannelId === 'pulse-global' ? 'bg-indigo-950/60 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
                  <div class="flex items-center space-x-2 truncate">
                    <span class="text-xs">⚡</span>
                    <span class="truncate font-semibold">c/zeroknowledge</span>
                  </div>
                  <span class="text-[9px] font-mono text-indigo-400">RLN</span>
                </button>

                <button type="button" data-channel-id="relays-general" class="btn-channel w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${clientStore.activeChannelId === 'relays-general' ? 'bg-indigo-950/60 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
                  <div class="flex items-center space-x-2 truncate">
                    <span class="text-xs">🌐</span>
                    <span class="truncate font-semibold">c/p2p-mesh</span>
                  </div>
                  <span class="text-[9px] font-mono text-slate-400">Mesh</span>
                </button>
              </div>

              <!-- PROMINENT BROADCAST BUTTON -->
              <div class="pt-2">
                <button type="button" id="btn-open-composer" class="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer group">
                  <span class="text-base group-hover:scale-110 transition-transform">✍️</span>
                  <span>Broadcast Publication</span>
                </button>
              </div>

              <!-- ACOUSTIC VOICE LOUNGE -->
              <div class="p-3 rounded-2xl bg-surface-raised/90 border border-white/5 space-y-2.5 shadow-sm">
                <div class="flex items-center justify-between text-xs font-bold text-indigo-300">
                  <span class="flex items-center space-x-1.5">
                    <span class="text-sm">🔊</span>
                    <span>Acoustic Lounge</span>
                  </span>
                  <span class="text-[9px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-surface-base border border-white/5">SFrame</span>
                </div>
                
                <canvas id="voice-oscilloscope" width="200" height="20" class="w-full bg-surface-base rounded-xl border border-white/5"></canvas>

                <div class="flex items-center space-x-1.5">
                  <button type="button" id="btn-toggle-voice" class="flex-1 py-1.5 text-[10px] font-semibold rounded-xl cursor-pointer ${voiceVisualizer.isConnected ? 'bg-rose-950 text-rose-300 border border-rose-500/30' : 'bg-surface-overlay text-slate-200 hover:text-white border border-white/5'}">
                    ${voiceVisualizer.isConnected ? 'Disconnect' : 'Join Voice'}
                  </button>
                  <button type="button" id="btn-toggle-ghost" title="Toggle Quantum Ghost Mode (RAM only)" class="py-1.5 px-2.5 text-[10px] rounded-xl border cursor-pointer ${voiceVisualizer.isGhostSpaceActive ? 'bg-indigo-900 text-indigo-200 border-indigo-500/50' : 'bg-surface-overlay text-slate-400 border-white/5'}">
                    👻 Ghost
                  </button>
                </div>

                <button type="button" id="btn-toggle-screen" class="w-full py-1.5 text-[10px] font-medium rounded-xl border ${screenShareEngine.isStreaming ? 'bg-rose-950 text-rose-300 border-rose-500/40' : 'bg-surface-overlay text-slate-200 hover:text-white border-white/5'} transition-all flex items-center justify-center space-x-1 cursor-pointer">
                  <span>📺</span>
                  <span>${screenShareEngine.isStreaming ? 'Stop Streaming' : 'Screen Share (Ultrawide)'}</span>
                </button>
              </div>

              <!-- AUDIO NOISE GATE & DSP EQUALIZER -->
              <div class="p-2.5 rounded-2xl bg-surface-raised/50 border border-white/5 flex items-center space-x-1.5">
                <span id="dsp-gate-indicator" class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <button type="button" id="btn-toggle-dsp" class="flex-1 py-1 text-[10px] font-medium rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/5 transition-all flex items-center justify-center space-x-1.5 cursor-pointer">
                  <span>${dsp.getIsEnabled() ? '🔇 Mute Filter' : '🎙️ Audio Noise Filter'}</span>
                </button>
                <button type="button" id="btn-open-dsp-modal" class="p-1 rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/5 cursor-pointer" title="5-Band DSP Equalizer">
                  🎛️
                </button>
              </div>

            </div>

            <!-- USER IDENTITY CAPSULE -->
            <div class="p-3 border-t border-white/5 bg-surface-base">
              <div class="flex items-center space-x-2.5">
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-slate-700 p-0.5 shrink-0">
                  <div class="w-full h-full rounded-full bg-surface-base flex items-center justify-center font-mono text-[10px] font-bold text-white">
                    ${clientStore.keypair.fingerprint.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-1">
                    <span class="text-xs font-bold text-white truncate">@id:${clientStore.keypair.fingerprint.substring(0, 8)}</span>
                    <span class="text-[8px] font-mono px-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">ZK</span>
                  </div>
                  <div class="text-[10px] font-mono text-slate-500 truncate">sovereign.aetheris.eth</div>
                </div>
                <button type="button" id="btn-open-paper-wallet" class="p-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-white border border-white/5 cursor-pointer transition-all" title="Cold Storage Paper Wallet Certificate">
                  📜
                </button>
              </div>
            </div>
          </aside>

          <!-- CENTER STAGE (THE SOVEREIGN UNIFIED STAGE) -->
          <main id="main-stage" class="flex-1 flex overflow-hidden bg-canvas">
            ${renderMainStage()}
          </main>

          <!-- RIGHT SOVEREIGN DISCOVERY & NETWORK RAIL -->
          <aside id="right-rail-container" class="w-80 bg-surface-base border-subtle-l flex flex-col justify-between shrink-0 select-none hidden xl:flex">
            <div id="right-rail-scroll" class="p-3.5 overflow-y-auto space-y-4">
              
              <!-- SOVEREIGN CIRCLE & COMMUNITY GOVERNANCE CARD -->
              ${sovereignCircleEngine.renderSidebarCircleCard(clientStore.activeChannelId)}

              <!-- TRENDING IN SOVEREIGN NET -->
              <div class="p-4 rounded-2xl bg-surface-raised/90 border border-white/5 space-y-3 shadow-sm">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-white tracking-wide">Trending Topics</h4>
                  <span class="text-[9px] font-mono text-slate-500">Algorithm-Free</span>
                </div>

                <div class="space-y-2.5">
                  <div class="cursor-pointer group">
                    <div class="text-[10px] text-slate-500 font-mono">Cryptography · Trending</div>
                    <div class="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">#ZeroKnowledge</div>
                    <div class="text-[10px] text-slate-500 font-mono">184 pulses</div>
                  </div>

                  <div class="cursor-pointer group">
                    <div class="text-[10px] text-slate-500 font-mono">Protocol · Trending</div>
                    <div class="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">#TreeKEM_MLS</div>
                    <div class="text-[10px] text-slate-500 font-mono">142 pulses</div>
                  </div>

                  <div class="cursor-pointer group">
                    <div class="text-[10px] text-slate-500 font-mono">Security · Trending</div>
                    <div class="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">#ReverseEngineering</div>
                    <div class="text-[10px] text-slate-500 font-mono">98 releases</div>
                  </div>

                  <div class="cursor-pointer group">
                    <div class="text-[10px] text-slate-500 font-mono">Vault · Trending</div>
                    <div class="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">#BinaryHygiene</div>
                    <div class="text-[10px] text-slate-500 font-mono">76 releases</div>
                  </div>
                </div>
              </div>

              <!-- WEB OF TRUST: RECOMMENDED NODES -->
              <div class="p-4 rounded-2xl bg-surface-raised/90 border border-white/5 space-y-3 shadow-sm">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-white tracking-wide">Web of Trust (WoT)</h4>
                  <button type="button" id="btn-open-wot-graph-right" class="text-[9px] font-mono text-emerald-400 hover:text-emerald-300 cursor-pointer underline">View Graph</button>
                </div>

                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2 min-w-0">
                      <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-slate-700 flex items-center justify-center font-mono text-[9px] font-bold text-white shrink-0">C3</div>
                      <div class="min-w-0">
                        <div class="text-xs font-bold text-white truncate">@id:c3dc28cb</div>
                        <div class="text-[9px] font-mono text-emerald-400">Archivist · 342 Merit</div>
                      </div>
                    </div>
                    <button type="button" data-peer-id="c3dc28cb705e" class="btn-wot-trust px-3 py-1 rounded-xl bg-white text-black text-[11px] font-bold hover:bg-slate-200 transition-all cursor-pointer shrink-0">Trust</button>
                  </div>

                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2 min-w-0">
                      <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-slate-700 flex items-center justify-center font-mono text-[9px] font-bold text-white shrink-0">A8</div>
                      <div class="min-w-0">
                        <div class="text-xs font-bold text-white truncate">@id:a89104fa</div>
                        <div class="text-[9px] font-mono text-indigo-300">Moderator · 276 Merit</div>
                      </div>
                    </div>
                    <button type="button" data-peer-id="a89104fa2211" class="btn-wot-trust px-3 py-1 rounded-xl bg-white text-black text-[11px] font-bold hover:bg-slate-200 transition-all cursor-pointer shrink-0">Trust</button>
                  </div>

                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2 min-w-0">
                      <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-slate-700 flex items-center justify-center font-mono text-[9px] font-bold text-white shrink-0">F4</div>
                      <div class="min-w-0">
                        <div class="text-xs font-bold text-white truncate">@id:f40019bc</div>
                        <div class="text-[9px] font-mono text-emerald-400">Security Lab · 194 Merit</div>
                      </div>
                    </div>
                    <button type="button" data-peer-id="f40019bc1337" class="btn-wot-trust px-3 py-1 rounded-xl bg-white text-black text-[11px] font-bold hover:bg-slate-200 transition-all cursor-pointer shrink-0">Trust</button>
                  </div>
                </div>
              </div>

              <!-- LIVE NETWORK ACTIVITY FEED -->
              ${networkActivityFeed.renderActivityWidget()}

              <!-- P2P SWARM INGRESS & DOWNLOAD MANAGER -->
              ${downloadManager.renderSidebarCard()}

            </div>

            <!-- SYSTEM INTEGRITY TICKER -->
            <div class="p-3 border-subtle-t bg-surface-base/50 text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span>TreeKEM RFC 9420</span>
              <span class="text-emerald-400">● 0.8ms Rekey</span>
            </div>
          </aside>

        </div>

        <!-- FOOTER STATUS BAR -->
        <footer class="h-6 border-subtle-t bg-surface-base px-3 flex items-center justify-between text-[11px] font-mono text-slate-500 shrink-0">
          <div class="flex items-center space-x-4">
            <span class="text-cyphr flex items-center space-x-1">
              <span>🔒</span>
              <span>MLS TreeKEM Group Epoch #4</span>
            </span>
            <span>•</span>
            <span class="text-slate-400">RAM: 38 MB</span>
            <span>•</span>
            <span class="text-slate-400">Indexed: ${localSearchIndex.size()} docs (ZK-SSE)</span>
          </div>
          <div class="flex items-center space-x-4">
            ${activeDownloadName ? `<span class="text-signal animate-pulse">⬇ Downloading ${activeDownloadName}: ${activeDownloadProgress}%</span> •` : ''}
            <span>Density: ${clientStore.density.toUpperCase()}</span>
            <span>•</span>
            <span class="text-signal">WebRTC Mesh: 100% Operational</span>
          </div>
        </footer>

        ${renderMobileDrawer()}
        ${renderMobileBottomNav()}

        <!-- DYNAMIC ISOLATED MODAL ROOT -->
        <div id="app-modal-root" class="fixed inset-0 z-[9999] pointer-events-none">
          ${buildModalRootHTML()}
        </div>

      </div>
    `;

    voiceVisualizer.init('voice-oscilloscope');
    bindEvents();

    requestAnimationFrame(() => {
      const newRight = document.getElementById('right-rail-scroll');
      if (newRight && rightScroll > 0) newRight.scrollTop = rightScroll;
      const newLeft = document.getElementById('left-rail-scroll');
      if (newLeft && leftScroll > 0) newLeft.scrollTop = leftScroll;
      const newMain = document.getElementById('main-feed-scroll');
      if (newMain && mainScroll > 0) newMain.scrollTop = mainScroll;
    });
    }, appEl, {
      onRetry: () => render(),
    });
  };

  // ─── ZERO-FLICKER INCREMENTAL DOM PATCH ENGINE ─────────────────────────────
  // First render: full scaffold write. Subsequent renders: patch only dynamic zones
  // (#main-stage, #app-modal-root, #toast-root, mobile nav) without touching the
  // stable chrome (header, sidebars, footer) to eliminate any white-flash flicker.

  let _scaffoldRendered = false;

  /** Patch an element's innerHTML only if it actually changed — avoids browser reflow */
  const patchEl = (id: string, html: string): void => {
    const el = document.getElementById(id);
    if (el && el.innerHTML !== html) {
      el.innerHTML = html;
    }
  };

  /** Build modal root HTML (extracted to share between full and patch renders) */
  const buildModalRootHTML = (): string => `
    ${renderCommandRailModal()}
    ${renderComposerModal()}
    ${obsidianMediaPlayer.renderLightboxModal()}
    ${storiesEngine.renderStoryModal(clientStore.keypair.fingerprint)}
    ${storiesEngine.renderStoryCreatorModal(clientStore.keypair.fingerprint)}
    ${renderPostDetailModal()}
    ${renderAwardModal()}
    ${sovereignCircleEngine.renderCreateCircleModal()}
    ${renderCrossPostModal()}
    ${renderBookmarksModal()}
    ${renderNotificationsDropdown()}
    ${relaysManager.renderCreateRelayModal()}
    ${relaysManager.renderInviteModal()}
    ${relaysManager.renderJoinRelayModal()}
    ${zkProofVisualizer.renderProofViewer()}
    ${profileCardEngine.renderProfileCard()}
    ${contextMenuEngine.renderContextMenu()}
    ${isThemeModalOpen ? themeEngine.renderThemeSelectorModal() : ''}
    ${spatialAudio.isOpen ? spatialAudio.renderSpatialModal() : ''}
    ${sovereignDM.isOpen ? sovereignDM.renderDMModal(clientStore.keypair.fingerprint) : ''}
    ${zenModeManager.isZenActive ? zenModeManager.renderZenFloatingExit() : ''}
    ${walletBridge.isModalOpen ? walletBridge.renderWalletPanel() : ''}
    ${zkReputation.renderReputationCenterModal(clientStore.keypair.fingerprint, 342)}
    ${merkleVisualizer.renderMerkleModal()}
    ${offlineSync.renderSyncManagerModal()}
    ${meshMatrix.renderMeshMatrixModal()}
    ${paperWallet.renderPaperWalletModal(clientStore.keypair.fingerprint, clientStore.keypair.publicKeyHex)}
    ${acousticDSP.renderDSPModal()}
    ${networkObservatory.isOpen ? networkObservatory.renderObservatoryModal() : ''}
    ${wotGraphViz.isOpen ? wotGraphViz.renderWoTGraphModal() : ''}
    ${customThemeBuilder.isOpen ? customThemeBuilder.renderBuilderModal() : ''}
    ${isLangModalOpen ? `<div id="lang-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='lang-modal-backdrop'){window.__aetheris_close_lang&&window.__aetheris_close_lang();}">${i18n.renderLanguagePicker('dropdown')}</div>` : ''}
    ${isGlobalScaleModalOpen ? `<div id="global-scale-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='global-scale-modal-backdrop'){window.__aetheris_close_global_scale&&window.__aetheris_close_global_scale();}"><div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl"><div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5"><span class="text-sm font-bold text-white font-mono">🌐 Edge Infrastructure</span><button onclick="window.__aetheris_close_global_scale&&window.__aetheris_close_global_scale()" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button></div><div>${globalScale.renderGlobalScaleDashboard()}</div></div></div>` : ''}
    ${isGovernanceModalOpen ? `<div id="governance-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='governance-modal-backdrop'){window.__aetheris_close_governance&&window.__aetheris_close_governance();}"><div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl"><div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5"><span class="text-sm font-bold text-white font-mono">🏛️ DAO Governance</span><button onclick="window.__aetheris_close_governance&&window.__aetheris_close_governance()" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button></div><div id="dao-container-root">${governanceDAO.renderGovernanceHub(clientStore.keypair.fingerprint, 75)}</div></div></div>` : ''}
    ${isRSSModalOpen ? `<div id="rss-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='rss-modal-backdrop'){window.__aetheris_close_rss&&window.__aetheris_close_rss();}"><div class="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl"><div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5"><span class="text-sm font-bold text-white font-mono">📡 RSS Importer</span><button onclick="window.__aetheris_close_rss&&window.__aetheris_close_rss()" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button></div><div id="rss-container-root">${rssImporter.renderRSSPanel()}</div></div></div>` : ''}
    ${isCVEModalOpen ? `<div id="cve-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='cve-modal-backdrop'){window.__aetheris_close_cve&&window.__aetheris_close_cve();}"><div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl"><div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5"><span class="text-sm font-bold text-white font-mono">🛡️ CVE Monitor</span><button onclick="window.__aetheris_close_cve&&window.__aetheris_close_cve()" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button></div><div id="cve-container-root">${cveMonitor.renderCVEDashboard()}</div></div></div>` : ''}
    ${isGossipModalOpen ? `<div id="gossip-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='gossip-modal-backdrop'){window.__aetheris_close_gossip&&window.__aetheris_close_gossip();}"><div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl"><div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5"><span class="text-sm font-bold text-white font-mono">📡 Gossip Visualizer</span><button onclick="window.__aetheris_close_gossip&&window.__aetheris_close_gossip()" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button></div><div id="gossip-container-root">${gossipViz.renderGossipPanel()}</div></div></div>` : ''}

    ${isExportBackupModalOpen ? `<div id="export-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='export-modal-backdrop'){window.__aetheris_close_export&&window.__aetheris_close_export();}"><div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl"><div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5"><span class="text-sm font-bold text-white font-mono">📂 Export & Backup</span><button onclick="window.__aetheris_close_export&&window.__aetheris_close_export()" class="text-slate-400 hover:text-white px-2 py-1">✕</button></div><div id="export-container-root">${exportBackup.renderExportPanel()}</div></div></div>` : ''}
    ${profileView.isEditProfileModalOpen ? profileView.renderEditProfileModal(profileView.getProfile(profileView.targetFingerprint)) : ''}
    ${clientStore.isComposerOpen ? hybridComposer.renderComposerModal() : (omniComposer.isModalOpen ? omniComposer.renderComposerModal() : '')}
    ${sovereignMnemonicModal.renderModalHTML()}
    ${steganographyModal.renderModalHTML()}
    ${sovereignArchiveModal.renderModalHTML()}
    ${socialRecoveryModal.renderModalHTML()}
    ${keyboardNavigator.renderModal()}
    ${transparencyMode.renderInspectorModal()}
    ${sovereignWebPush.renderPushOptInBanner()}
    ${onboardingWizard.renderWizardModal(clientStore.keypair?.fingerprint)}
  `;

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

    errorBoundary.wrapRender(() => {
      // Sync search index (no DOM touch)
      for (const [chId, msgs] of clientStore.messages.entries()) {
        for (const m of msgs) {
          localSearchIndex.indexDocument({
            id: m.id, channelId: chId, authorFingerprint: m.authorFingerprint,
            content: m.text, createdAt: m.createdAt, type: 'message',
          });
        }
      }

      // Preserve scroll positions before any patch
      const rightRailEl = document.getElementById('right-rail-scroll');
      const savedRightScroll = rightRailEl ? rightRailEl.scrollTop : 0;
      const leftRailEl = document.getElementById('left-rail-scroll');
      const savedLeftScroll = leftRailEl ? leftRailEl.scrollTop : 0;
      const mainFeedEl = document.getElementById('main-feed-scroll');
      const savedMainScroll = mainFeedEl ? mainFeedEl.scrollTop : 0;

      // Preserve focused input
      const focusedEl = document.activeElement as HTMLInputElement | null;
      const focusedId = focusedEl?.id ?? null;
      const focusedValue = focusedEl?.value ?? null;
      const focusedSelStart = (typeof focusedEl?.selectionStart === 'number') ? focusedEl.selectionStart : null;

      // Patch only the dynamic zones — stable chrome is NEVER touched
      patchEl('toast-root', renderToasts());
      patchEl('broadcast-root', renderBroadcastBanner());
      patchEl('main-stage', renderMainStage());
      patchEl('app-modal-root', buildModalRootHTML());

      // Patch mobile drawer open/closed state reactively
      const drawerEl = document.getElementById('mobile-drawer');
      if (drawerEl) {
        if (isMobileDrawerOpen) {
          drawerEl.classList.remove('pointer-events-none');
          drawerEl.classList.add('pointer-events-auto');
          drawerEl.setAttribute('aria-hidden', 'false');
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

      // Patch mobile bottom nav active states only
      patchEl('app-mobile-bottom-nav', renderMobileBottomNavButtons());

      // Patch WebRTC transfer indicator (smart: show/remove based on active transfers)
      const widgetHtml = webrtcTransfer.renderFloatingWidget();
      const existingWidget = document.getElementById('webrtc-floating-transfer-widget') || document.getElementById('webrtc-transfer-indicator');
      if (widgetHtml && !existingWidget) {
        // Inject new widget at top level
        const tmp = document.createElement('div');
        tmp.innerHTML = widgetHtml.trim();
        const widgetEl = tmp.firstElementChild;
        if (widgetEl) document.getElementById('main-layout')?.appendChild(widgetEl);
      } else if (widgetHtml && existingWidget) {
        // Update existing widget content
        const tmp = document.createElement('div');
        tmp.innerHTML = widgetHtml.trim();
        const newWidget = tmp.firstElementChild;
        if (newWidget && existingWidget.outerHTML !== newWidget.outerHTML) {
          existingWidget.replaceWith(newWidget);
        }
      } else if (!widgetHtml && existingWidget) {
        // No active transfers: smoothly remove the indicator
        existingWidget.remove();
      }

      // Patch status bar density text directly
      const densityEl = document.getElementById('status-bar-density');
      if (densityEl) densityEl.textContent = `Density: ${clientStore.density.toUpperCase()}`;



      // Re-bind event listeners on updated dynamic elements
      bindEvents();

      requestAnimationFrame(() => {
        // Restore focused input value & cursor position without scroll jump
        if (focusedId) {
          const el = document.getElementById(focusedId) as HTMLInputElement | null;
          if (el) {
            if (focusedValue !== null && el.value !== focusedValue) el.value = focusedValue;
            if (focusedSelStart !== null) {
              try { el.setSelectionRange(focusedSelStart, focusedSelStart); } catch (_) {}
            }
            el.focus({ preventScroll: true });
          }
        }

        // Restore scroll positions
        const rr = document.getElementById('right-rail-scroll');
        if (rr && savedRightScroll > 0) rr.scrollTop = savedRightScroll;
        const lr = document.getElementById('left-rail-scroll');
        if (lr && savedLeftScroll > 0) lr.scrollTop = savedLeftScroll;
        const mf = document.getElementById('main-feed-scroll');
        if (mf && savedMainScroll > 0) mf.scrollTop = savedMainScroll;
      });

      voiceVisualizer.init('voice-oscilloscope');
    }, appEl, { onRetry: () => patchRender() });
  };

  clientStore.subscribe(patchRender);

  // Seed initial ephemeral stories so the carousel has content
  if (storiesEngine.stories.length === 0) {
    storiesEngine.addStory('Zero-Trust architecture is not a product—it is a philosophy. Every packet verified, every identity cryptographic.', 'text', 'genesis-core...', 'GUARDIAN');
    storiesEngine.addStory('BitTorrent Merkle pieces for Micro-Kernel v1.0.0 propagated to all 14 seeder nodes. 100% byte-match verified.', 'text', 'c3dc28cb705e...', 'ARCHIVIST');
    storiesEngine.addStory('ZK-RLN slashing event: rate-limit breacher nullified. Sovereign mesh remains clean.', 'text', 'a89104fa2211...', 'SENTINEL');
    storiesEngine.addStory('New consensus proposal: Ephemeral key rotation every 48h. Vote closes in 12h.', 'text', 'f40019bc...', 'MODERATOR');
    storiesEngine.addStory('WebRTC DTLS tunnels holding at 14ms RTT. Zero packet loss across all mesh nodes.', 'text', '83cdf925...', 'MEMBER');
  }

  patchRender();
}

function renderToasts(): string {
  if (clientStore.toasts.length === 0) return '';
  return `
    <div class="fixed top-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
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
          <span class="font-bold uppercase tracking-wider">ZK-RLN Anti-Spam Slashing Executed:</span>
          <span class="ml-1">Identity <code class="bg-black/30 px-1 py-0.5 rounded font-mono">${a.nullifier.substring(0, 16)}...</code> has breached rate limit.</span>
          <span class="ml-1 font-mono text-[10px]">Extracted Secret: ${a.extractedSecretKey.substring(0, 20)}...</span>
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
        onclick="window.__aetheris_dismiss_broadcast && window.__aetheris_dismiss_broadcast()"
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
  const isChat = clientStore.activeChannelId.startsWith('relays-') || clientStore.activeChannelId.startsWith('relay-');
  const isVault = clientStore.activeChannelId.startsWith('vault-');
  const isExplore = clientStore.activeChannelId === 'explore';
  const isProfile = clientStore.activeChannelId.startsWith('profile');
  const onboardingHTML = sovereignOnboarding.renderWelcomeBanner();

  if (clientStore.isDualHorizon) {
    return `
      <div class="flex-1 flex flex-col overflow-hidden">
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
  if (isExplore) {
    contentHTML = exploreView.renderExploreView(clientStore.posts);
  } else if (isProfile) {
    contentHTML = profileView.renderProfileView(clientStore.posts, clientStore.keypair.fingerprint);
  } else if (isChat) {
    contentHTML = renderRelaysWorkspace();
  } else if (isVault) {
    contentHTML = renderVaultWorkspace();
  } else {
    contentHTML = renderPulseWorkspace();
  }

  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      ${onboardingHTML}
      ${contentHTML}
    </div>
  `;
}

function renderRelaysWorkspace(): string {
  const activeRelay = relaysManager.getActiveRelay();
  const messages = clientStore.messages.get(clientStore.activeChannelId) || [];
  const channelName = clientStore.activeChannelId.replace(/^relay-.*?-(general|announcements|voice-room|dev-core|dev|voice-radar|lounge)/, '$1').replace('relays-', '');

  return `
    <div class="flex-1 flex overflow-hidden bg-canvas">
      <!-- 1. SOVEREIGN RELAY SERVER RAIL (LEFT-MOST ICON STRIP) -->
      ${relaysManager.renderRelayServerRail()}

      <!-- 2. RELAY CHANNELS LIST & MAIN CHAT AREA -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- RELAY TOP BANNER WITH INVITE FRIENDS BUTTON -->
        ${relaysManager.renderRelayHeader(activeRelay, channelName)}

        <!-- MESSAGES FEED -->
        <div id="messages-container" class="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto space-y-${clientStore.density === 'compact' ? '1' : clientStore.density === 'balanced' ? '3' : '5'} max-w-4xl mx-auto w-full pb-20 md:pb-6">
          ${messages.length === 0 ? `
            <div class="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-500 text-xs font-mono space-y-3 p-8 border border-dashed border-white/10 rounded-2xl bg-surface-base/50 my-auto">
              <div class="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-2xl text-indigo-400 shadow-sm">${activeRelay.icon}</div>
              <div class="text-center space-y-1">
                <div class="text-sm font-bold text-slate-200">Welcome to #${channelName}!</div>
                <p class="text-slate-400 max-w-md text-center">This is the start of the #${channelName} channel in ${escapeHtml(activeRelay.name)}. Messages are encrypted client-side using MLS TreeKEM.</p>
              </div>
              <div class="flex items-center space-x-2 pt-2">
                <button type="button" data-open-relay-invite="${activeRelay.id}" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer">
                  🔗 Invite Peers with 1-Click Link
                </button>
              </div>
            </div>
          ` : messages.map(m => renderMessageItem(m)).join('')}
        </div>

        <!-- RELAYS COMPOSER -->
        <div class="p-3 md:p-4 border-subtle-t bg-surface-base shrink-0 shadow-sm">
          <form id="form-send-message" class="flex items-center space-x-2 max-w-4xl mx-auto">
            <div class="relative flex-1">
              <input 
                type="text" 
                id="input-message"
                placeholder="Message #${channelName} (E2EE encrypted & ZK-RLN verified)..."
                class="w-full bg-surface-raised border border-white/10 rounded-2xl px-4 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all font-sans"
                autocomplete="off"
              />
            </div>
            <button type="submit" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer shrink-0">
              <span>Send</span>
              <span>⚡</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function renderInlineQuickComposer(): string {
  return `
    <div class="p-4 rounded-2xl bg-surface-raised/90 border border-white/5 hover:border-white/10 transition-all shadow-sm space-y-3 mb-5">
      <div class="flex space-x-3.5">
        <!-- USER AVATAR -->
        <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-slate-700 p-0.5 shrink-0">
          <div class="w-full h-full rounded-full bg-[#0c0e14] flex items-center justify-center font-mono text-[10px] font-bold text-white">
            ${clientStore.keypair.fingerprint.substring(0, 2).toUpperCase()}
          </div>
        </div>

        <!-- COMPOSER MAIN -->
        <div class="flex-1 space-y-2.5">
          <div class="flex items-center justify-between">
            <!-- MODE TOGGLE -->
            <div class="flex items-center space-x-1 bg-surface-overlay p-0.5 rounded-xl border border-white/5 text-[11px] font-medium">
              <button id="btn-mode-quick-pulse" type="button" class="px-2.5 py-1 rounded-lg text-indigo-300 font-bold bg-surface-raised border border-indigo-500/30 transition-all cursor-pointer">
                ⚡ Micro-Pulse
              </button>
              <button id="btn-mode-quick-article" type="button" class="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer">
                📦 Verified Release
              </button>
            </div>

            <!-- CIRCLE SELECTOR -->
            <select id="inline-composer-hub" class="bg-surface-overlay border border-white/10 text-slate-300 rounded-xl px-2.5 py-1 text-xs font-mono focus:outline-none cursor-pointer">
              <option value="pulse-global">c/zeroknowledge (Feed)</option>
              <option value="vault-releases">c/clean-releases (P2P)</option>
              <option value="vault-guides">c/security-guides (Docs)</option>
              <option value="relays-general">c/p2p-mesh (Swarm)</option>
            </select>
          </div>

          <!-- TITLE INPUT (FOR ARTICLES/RELEASES) -->
          <input 
            type="text" 
            id="inline-composer-title" 
            placeholder="Publication Title / Release Header..." 
            class="hidden w-full bg-surface-overlay border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-bold focus:outline-none focus:border-indigo-500/50"
          />

          <!-- MAIN TEXTAREA -->
          <textarea 
            id="inline-composer-textarea"
            rows="2"
            placeholder="What is happening in the sovereign matrix? (Markdown, #tags and @mentions supported)"
            class="w-full bg-transparent border-0 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
          ></textarea>

          <!-- ATTACHMENT TRAY & ACTIONS -->
          <div class="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
            <div class="flex items-center space-x-2 text-slate-400">
              <button id="btn-inline-open-full" title="Open Full Rich Editor" type="button" class="p-1.5 hover:text-indigo-300 hover:bg-surface-overlay rounded-lg transition-colors cursor-pointer flex items-center space-x-1">
                <span>📝</span>
                <span class="text-[10px] hidden sm:inline">Rich Editor</span>
              </button>
              <button id="btn-inline-attach-poll" title="Create Cryptographic Poll" type="button" class="p-1.5 hover:text-indigo-300 hover:bg-surface-overlay rounded-lg transition-colors cursor-pointer flex items-center space-x-1">
                <span>📊</span>
                <span class="text-[10px] hidden sm:inline">Poll</span>
              </button>
              <button id="btn-inline-attach-binary" title="Attach Binary Release" type="button" class="p-1.5 hover:text-emerald-400 hover:bg-surface-overlay rounded-lg transition-colors cursor-pointer flex items-center space-x-1">
                <span>📦</span>
                <span class="text-[10px] hidden sm:inline">Binary</span>
              </button>
              <span class="text-slate-600">|</span>
              <span class="text-[10px] font-mono text-slate-500">ZK-RLN Protected</span>
            </div>

            <div class="flex items-center space-x-2.5">
              <div id="inline-char-ring-container" class="flex items-center">
                ${omniComposer.renderCircularCountdownRing(0, 280)}
              </div>
              <button id="btn-inline-broadcast" type="button" class="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-sm flex items-center space-x-1 cursor-pointer">
                <span>Broadcast</span>
                <span>⚡</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderVaultWorkspace(): string {
  let posts = clientStore.posts.filter(p => p.channelId.startsWith('vault-') || p.flair === 'VERIFIED RELEASE' || p.flair === 'SECURITY ADVISORY');
  flairFilter.updateCounts(clientStore.posts);
  posts = flairFilter.filterPosts(posts);

  return `
    <div class="flex-1 flex flex-col overflow-hidden bg-canvas">
      
      <!-- STICKY TOP VAULT NAVIGATION BAR -->
      <div class="sticky top-0 z-10 border-subtle-b bg-surface-base/90 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between shrink-0 h-14 shadow-sm">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-base font-bold shadow-sm">
            📚
          </div>
          <div>
            <h1 class="text-xs font-bold text-white tracking-wide">KNOWLEDGE VAULT & REPRODUCIBLE REPOSITORY</h1>
            <p class="text-[10px] text-slate-400 font-mono">Decentralized binary distribution ledger with Merkle tree verification.</p>
          </div>
        </div>

        <!-- CATEGORY & SORT BUTTONS -->
        <div class="flex items-center space-x-2">
          <div class="flex items-center space-x-1 bg-surface-raised p-0.5 rounded-xl border border-white/5 text-xs">
            <button data-sort="hot" class="btn-sort px-2.5 py-1 rounded-lg font-medium ${clientStore.sortMode === 'hot' ? 'bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}">
              🔥 Audited
            </button>
            <button data-sort="new" class="btn-sort px-2.5 py-1 rounded-lg font-medium ${clientStore.sortMode === 'new' ? 'bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}">
              ⏱️ Latest
            </button>
            <button data-sort="top" class="btn-sort px-2.5 py-1 rounded-lg font-medium ${clientStore.sortMode === 'top' ? 'bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}">
              🏆 Top Merit
            </button>
          </div>

          <button id="btn-open-composer" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer">
            <span>📦</span>
            <span class="hidden sm:inline">Publish Release</span>
          </button>
        </div>
      </div>

      <!-- VAULT TELEMETRY & INTEGRITY HERO -->
      <div class="border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-surface-base to-surface-base p-4 md:p-5 shrink-0">
        <div class="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div class="p-3 rounded-xl bg-surface-raised/80 border border-emerald-500/20">
            <div class="text-[10px] text-slate-400 uppercase">ACTIVE SEEDERS</div>
            <div class="text-sm font-bold text-emerald-400 mt-0.5">342 Mesh Nodes</div>
          </div>
          <div class="p-3 rounded-xl bg-surface-raised/80 border border-white/5">
            <div class="text-[10px] text-slate-400 uppercase">REPRODUCIBILITY</div>
            <div class="text-sm font-bold text-indigo-300 mt-0.5">100% Byte-Match</div>
          </div>
          <div class="p-3 rounded-xl bg-surface-raised/80 border border-white/5">
            <div class="text-[10px] text-slate-400 uppercase">ENTROPY VERDICT</div>
            <div class="text-sm font-bold text-emerald-400 mt-0.5">Zero Malicious Sections</div>
          </div>
          <div class="p-3 rounded-xl bg-surface-raised/80 border border-white/5">
            <div class="text-[10px] text-slate-400 uppercase">LEDGER STATE</div>
            <div class="text-sm font-bold text-slate-200 mt-0.5">Merkle Tree Level 4</div>
          </div>
        </div>
      </div>

      <!-- VAULT RELEASES CATALOG -->
      <div id="main-feed-scroll" class="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto space-y-4 max-w-5xl mx-auto w-full pb-20 md:pb-6">
        ${posts.length === 0 ? `
          <div class="p-12 text-center text-slate-500 text-xs font-mono border border-dashed border-white/10 rounded-2xl">
            No audited releases found in this category.
          </div>
        ` : posts.map(p => renderVaultReleaseCard(p)).join('')}
      </div>
    </div>
  `;
}

function renderVaultReleaseCard(p: ClientPost): string {
  const time = new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const fileName = p.attachment?.fileName || `${p.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-x86_64.bin`;
  const sha = p.attachment?.sha256 || 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496';
  const byteSize = p.attachment?.byteSize || 131072;
  const entropy = p.attachment?.entropy || 6.12;

  return `
    <div class="p-3.5 sm:p-4 md:p-5 rounded-2xl bg-surface-raised border border-white/5 hover:border-emerald-500/30 transition-all shadow-md space-y-4">
      
      <!-- TOP RELEASE HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-950/90 border border-emerald-500/30 flex items-center justify-center text-xl text-emerald-400 shadow-sm shrink-0">
            📦
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h3 data-open-detail="${p.id}" class="btn-open-detail text-sm font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer">${escapeHtml(p.title)}</h3>
              <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">100% REPRODUCIBLE</span>
            </div>
            <div class="flex items-center space-x-2 text-[11px] font-mono text-slate-400 mt-0.5">
              <span>Author: @id:${p.authorFingerprint.substring(0, 8)}</span>
              <span>•</span>
              <span>Published: ${time}</span>
              <span>•</span>
              <span class="text-emerald-400">c/clean-releases</span>
            </div>
          </div>
        </div>

        <!-- MERIT SCORE PILL -->
        <div class="flex items-center space-x-1.5 bg-surface-overlay px-3 py-1.5 rounded-xl border border-white/5 self-start sm:self-auto font-mono text-xs">
          <button data-vote-id="${p.id}" data-dir="1" class="btn-upvote text-slate-400 hover:text-emerald-400 cursor-pointer p-1" title="Endorse (+1 Merit)">▲</button>
          <span class="font-bold text-emerald-400">${p.meritVotes} Merit</span>
          <button data-vote-id="${p.id}" data-dir="-1" class="btn-downvote text-slate-400 hover:text-rose-400 cursor-pointer p-1" title="Divergent (-1)">▼</button>
        </div>
      </div>

      <!-- RELEASE BODY & SYNTHESIS -->
      <div class="text-xs text-slate-300 leading-relaxed space-y-2">
        ${markdownRenderer.renderMarkdown(p.content)}
      </div>

      <!-- BINARY HYGIENE SPECIFICATIONS MATRIX -->
      <div class="p-4 rounded-xl bg-surface-base border border-white/5 space-y-3 font-mono text-xs">
        <div class="flex items-center justify-between text-[11px] border-b border-white/5 pb-2">
          <span class="text-slate-400 font-bold">Cryptographic Software Attestation:</span>
          <span class="text-emerald-400">Audit Status: PASS</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <div>
            <span class="text-slate-500">File Name:</span>
            <div class="text-slate-200 font-bold truncate">${fileName} (${(byteSize / 1024).toFixed(1)} KB)</div>
          </div>
          <div>
            <span class="text-slate-500">Shannon Entropy:</span>
            <div class="text-emerald-400 font-bold">${entropy.toFixed(2)} bits/byte (Clean / Unpacked)</div>
          </div>
        </div>

        <div class="p-2 rounded-lg bg-surface-overlay flex items-center justify-between text-[10px] text-slate-400">
          <span class="truncate pr-2">SHA256: ${sha}</span>
          <button class="btn-copy-sha px-2.5 py-1 bg-surface-highlight hover:bg-slate-700 text-slate-200 rounded text-[9px] cursor-pointer shrink-0" data-sha="${sha}">
            Copy SHA
          </button>
        </div>
      </div>

      <!-- ACTIONS BAR -->
      <div class="flex items-center justify-between pt-1 border-t border-white/5 text-xs font-mono">
        <div class="flex items-center space-x-3 text-slate-400">
          <button data-expand-post="${p.id}" class="btn-toggle-post-expand flex items-center space-x-1 hover:text-white transition-colors cursor-pointer">
            <span>💬</span>
            <span>${p.replyCount} Notes</span>
          </button>
          <button data-boost-post="${p.id}" class="btn-boost flex items-center space-x-1 hover:text-white transition-colors cursor-pointer">
            <span>⟳</span>
            <span>${p.boostCount} Re-broadcasts</span>
          </button>
          ${bookmarksVault.renderBookmarkButton(p.id)}
        </div>

        <button data-file-name="${fileName}" data-byte-size="${byteSize}" data-sha="${sha}" class="btn-download-p2p px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center space-x-2 cursor-pointer">
          <span>⬇</span>
          <span>Download via P2P Mesh</span>
        </button>
      </div>

      <!-- INLINE DISCUSSION TREE -->
      ${p.isExpanded ? `
        <div class="pt-3 border-t border-white/5 space-y-3">
          <div class="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Technical Review & Discussion Tree:
          </div>
          <div class="space-y-3">
            ${threadManager.getRootComments().map(c => renderThreadNode(c)).join('')}
          </div>
        </div>
      ` : ''}

    </div>
  `;
}

function renderPulseWorkspace(): string {
  let posts = clientStore.posts;
  flairFilter.updateCounts(clientStore.posts);
  posts = flairFilter.filterPosts(posts);

  // Apply Sovereign Circle active flair filter if selected
  if (sovereignCircleEngine.selectedFlair) {
    posts = posts.filter(p => p.flair === sovereignCircleEngine.selectedFlair);
  }

  // Apply Feed Controls sort & timeframe algorithm
  posts = feedControlsEngine.filterAndSortPosts(posts);

  return `
    <div class="flex-1 flex flex-col overflow-hidden bg-canvas">
      
      <!-- STICKY TOP PULSE HEADER -->
      <div class="sticky top-0 z-10 border-subtle-b bg-surface-base/90 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between shrink-0 h-14 shadow-sm">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-base font-bold shadow-sm">
            ⚡
          </div>
          <div>
            <h1 class="text-xs font-bold text-white tracking-wide">PULSE STREAM & SOVEREIGN BOARD</h1>
            <p class="text-[10px] text-slate-400 font-mono">Real-time uncensored sovereign flash broadcasts & collective discussions.</p>
          </div>
        </div>
      </div>

      <!-- EPHEMERAL STORIES CAROUSEL -->
      ${storiesEngine.renderStoriesCarousel(clientStore.keypair.fingerprint)}

      <!-- ACTIVE HASHTAG BANNER -->
      ${hashtagExplorer.renderActiveTagBanner()}

      <!-- PULSE POSTS STREAM -->
      <div id="main-feed-scroll" class="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto space-y-4 max-w-3xl mx-auto w-full pb-20 md:pb-6">
        <!-- INLINE QUICK COMPOSER -->
        ${renderInlineQuickComposer()}

        <!-- FEED CONTROLS: SORT FILTERS (HOT, NEW, TOP, RISING) & VIEW MODES (CARD, CLASSIC, COMPACT) -->
        ${feedControlsEngine.renderFeedControlsToolbar()}

        <!-- POSTS STREAM -->
        ${posts.length === 0 ? `
          <div class="p-12 text-center text-slate-500 text-xs font-mono border border-dashed border-white/10 rounded-2xl bg-surface-base/50">
            No publications found matching the active filters.
          </div>
        ` : posts.map(p => feedControlsEngine.renderPost(p, feedControlsEngine.getViewMode())).join('')}
      </div>
    </div>
  `;
}

function renderPulsePostCard(p: ClientPost): string {
  const time = new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const rootComments = threadManager.getRootComments();
  const circleName = p.channelId.startsWith('vault-') ? (p.channelId === 'vault-releases' ? 'c/clean-releases' : 'c/security-guides') :
                     p.channelId.startsWith('relays-') ? 'c/p2p-mesh' : 'c/zeroknowledge';

  return `
    <article class="p-3 sm:p-4 md:p-5 rounded-2xl bg-surface-raised border border-white/5 hover:border-white/10 transition-all shadow-sm flex space-x-2.5 sm:space-x-3.5 group">
      
      <!-- MERIT VOTING COLUMN -->
      <div class="flex flex-col items-center justify-start space-y-1 shrink-0 pt-0.5">
        <button data-vote-id="${p.id}" data-dir="1" class="btn-upvote text-slate-400 hover:text-indigo-400 transition-colors p-1.5 rounded-xl hover:bg-surface-overlay cursor-pointer ${p.userVoted === 1 ? 'text-indigo-400 font-bold bg-indigo-950/60' : ''}" title="Endorse (+1 Merit)">
          ▲
        </button>
        <span class="font-mono text-xs font-bold ${p.userVoted === 1 ? 'text-indigo-400' : p.userVoted === -1 ? 'text-rose-500' : 'text-slate-300'}">
          ${p.meritVotes}
        </span>
        <button data-vote-id="${p.id}" data-dir="-1" class="btn-downvote text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-xl hover:bg-surface-overlay cursor-pointer ${p.userVoted === -1 ? 'text-rose-500 font-bold bg-rose-950/60' : ''}" title="Divergent View (-1)">
          ▼
        </button>
      </div>

      <!-- MAIN CONTENT COLUMN -->
      <div class="flex-1 space-y-2.5 min-w-0">
        <!-- HEADER METADATA -->
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center space-x-2 flex-wrap gap-y-1">
            <!-- CIRCLE BADGE -->
            <button data-channel-id="${p.channelId}" class="btn-channel font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-surface-overlay text-white border border-white/5 hover:border-white/20 transition-all cursor-pointer">
              ${circleName}
            </button>

            <!-- AUTHOR HANDLE & PROFILE TRIGGER -->
            <div data-author-profile="${p.authorFingerprint}" class="btn-open-author-profile flex items-center space-x-1.5 cursor-pointer hover:opacity-80 transition-opacity" title="View Sovereign Profile">
              <div class="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-slate-700 flex items-center justify-center font-mono text-[9px] font-bold text-white shrink-0">
                ${p.authorFingerprint.substring(0, 2).toUpperCase()}
              </div>
              <span class="font-mono text-xs font-semibold text-slate-200 hover:text-indigo-300">@id:${p.authorFingerprint.substring(0, 8)}</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-overlay text-slate-400 border border-white/5">${p.authorRole}</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/20">🛡️ ZK-Human</span>
            </div>
          </div>
          <span class="text-[10px] font-mono text-slate-500">${time}</span>
        </div>

        <!-- POST TITLE IF PRESENT -->
        ${p.title && p.title !== p.content.substring(0, 50) ? `
          <h3 data-open-detail="${p.id}" class="btn-open-detail text-sm font-bold text-white leading-snug hover:text-indigo-400 transition-colors cursor-pointer select-text">
            ${escapeHtml(p.title)}
          </h3>
        ` : ''}

        <!-- POST BODY -->
        <div class="text-xs text-slate-300 leading-relaxed select-text space-y-2">
          ${markdownRenderer.renderMarkdown(p.content)}
        </div>

        <!-- MULTIMEDIA & POLLS -->
        ${p.video ? obsidianMediaPlayer.renderVideoCard(p.id, p.video.src, p.video.poster) : ''}
        ${p.images && p.images.length > 0 ? obsidianMediaPlayer.renderImageMosaic(p.images) : ''}
        ${p.pollId ? pollEngine.renderPollCard(p.pollId, clientStore.keypair.fingerprint) : ''}

        <!-- QUOTED PULSE PREVIEW IF ATTACHED -->
        ${p.quotedPost ? `
          <div data-open-detail="${p.quotedPost.id}" class="btn-open-detail p-3 rounded-2xl bg-surface-base/80 border border-white/10 hover:border-white/20 transition-all space-y-1.5 my-2 cursor-pointer">
            <div class="flex items-center space-x-2 text-xs">
              <span class="text-indigo-400 font-bold text-[11px]">❝ Quoted Pulse</span>
              <span class="text-slate-500">·</span>
              <span class="font-mono text-xs font-bold text-slate-200">@id:${p.quotedPost.authorFingerprint.substring(0, 8)}</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-overlay text-slate-400 border border-white/5">${p.quotedPost.authorRole}</span>
            </div>
            ${p.quotedPost.title ? `<div class="text-xs font-bold text-slate-200">${escapeHtml(p.quotedPost.title)}</div>` : ''}
            <div class="text-xs text-slate-400 line-clamp-2">${escapeHtml(p.quotedPost.content)}</div>
          </div>
        ` : ''}

        <!-- EMOJI REACTIONS BAR -->
        <div class="pt-1">
          ${reactionsEngine.renderReactionBar(p.id, clientStore.keypair.fingerprint)}
        </div>

        <!-- MICRO-BROADCASTING ACTION BAR -->
        ${pulseActionsEngine.renderPulseActionBar(p.id, p.replyCount)}

        <!-- INLINE DISCUSSION TREE -->
        ${p.isExpanded ? `
          <div class="pt-3 border-subtle-t space-y-3">
            <div class="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Discussion Tree:
            </div>
            <div class="space-y-3">
              ${rootComments.map(c => renderThreadNode(c)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </article>
  `;
}

function renderMessageItem(m: ClientMessage): string {
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (clientStore.density === 'compact') {
    return `
      <div class="font-mono text-xs leading-tight py-1 hover:bg-surface-raised/40 px-2 rounded-lg flex items-baseline space-x-2 transition-colors msg-bubble-enter">
        <span class="text-slate-500 text-[10px]">${time}</span>
        <span class="text-cyphr font-bold">&lt;id:${m.authorFingerprint.substring(0, 8)}&gt;</span>
        <span class="text-slate-200 select-text">${escapeHtml(m.text)}</span>
      </div>
    `;
  }

  return `
    <div class="p-3.5 rounded-2xl bg-surface-raised/80 hover:bg-surface-raised border border-white/5 transition-all shadow-sm space-y-1.5 msg-bubble-enter">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center space-x-2.5">
          <div class="w-6 h-6 rounded-xl bg-gradient-to-br from-cyphr/30 to-aether/30 border border-cyphr/30 flex items-center justify-center font-mono text-[10px] font-bold text-white shadow-sm">
            ${m.authorFingerprint.substring(0, 2).toUpperCase()}
          </div>
          <span class="font-mono text-xs font-semibold text-cyphr">id:${m.authorFingerprint.substring(0, 12)}...</span>
          ${m.isMine ? '<span class="text-[9px] font-mono font-bold bg-cyphr/15 text-cyphr border border-cyphr/30 px-1.5 py-0.2 rounded-md">YOU</span>' : '<span class="text-[9px] font-mono bg-emerald-950 text-signal border border-signal/20 px-1.5 py-0.2 rounded-md">ZK-Verified</span>'}
          ${clientStore.showTrustBadges ? zkReputation.renderInlineTrustBadge(m.authorFingerprint) : ''}
        </div>
        <span class="text-[10px] font-mono text-slate-500">${time}</span>
      </div>
      <div class="text-xs text-slate-200 select-text leading-relaxed whitespace-pre-wrap pl-8">${escapeHtml(m.text)}</div>
    </div>
  `;
}

function renderPostCard(p: ClientPost): string {
  return feedControlsEngine.renderPost(p, feedControlsEngine.getViewMode());
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
        onclick="if(window.clientStore) { window.clientStore.joinChannel('pulse-global'); }"
        class="btn-nav-mode min-w-[44px] min-h-[44px] flex flex-col items-center justify-center rounded-xl p-1 transition-all cursor-pointer ${isPulse ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'}"
        title="Pulse Stream"
      >
        <span class="text-base leading-none">⚡</span>
        <span class="text-[9px] mt-0.5 font-sans">Stream</span>
      </button>

      <!-- 2. LIVE RELAYS (CHAT) -->
      <button 
        type="button" 
        data-nav-mode="relays" 
        id="btn-mobile-relays"
        onclick="if(window.clientStore) { window.clientStore.joinChannel('relays-general'); }"
        class="btn-nav-mode min-w-[44px] min-h-[44px] flex flex-col items-center justify-center rounded-xl p-1 transition-all cursor-pointer ${isRelays ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'}"
        title="Live Relays"
      >
        <span class="text-base leading-none">💬</span>
        <span class="text-[9px] mt-0.5 font-sans">Relays</span>
      </button>

      <!-- 3. FAB FLOATING ACTION BUTTON (OVERSIZED CENTRAL BUTTON) -->
      <button 
        type="button" 
        id="btn-mobile-composer" 
        onclick="if(window.clientStore) { window.clientStore.isComposerOpen = true; window.clientStore.notify(); }"
        class="w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-indigo-600/40 border-2 border-surface-base transform active:scale-90 transition-all cursor-pointer shrink-0" 
        title="Broadcast Publication"
      >
        <span>➕</span>
      </button>

      <!-- 4. ALERTS / NOTIFICATIONS -->
      <button 
        type="button" 
        id="btn-mobile-notifs"
        onclick="if(window.__aetherisToggleNotifs) window.__aetherisToggleNotifs();"
        class="relative min-w-[44px] min-h-[44px] flex flex-col items-center justify-center rounded-xl p-1 transition-all cursor-pointer ${isNotificationPanelOpen ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'}"
        title="Notifications & Alerts"
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
        onclick="if(window.clientStore) { window.clientStore.activeChannelId = 'profile'; window.clientStore.notify(); }"
        class="btn-nav-mode min-w-[44px] min-h-[44px] flex flex-col items-center justify-center rounded-xl p-1 transition-all cursor-pointer ${isProfile ? 'text-indigo-300 font-bold' : 'text-slate-400 hover:text-white'}"
        title="Sovereign Profile"
      >
        <div class="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-slate-700 flex items-center justify-center text-[9px] font-mono font-bold text-white shrink-0 border ${isProfile ? 'border-indigo-400' : 'border-transparent'}">
          ${clientStore.keypair.fingerprint.substring(0, 2).toUpperCase()}
        </div>
        <span class="text-[9px] mt-0.5 font-sans">Profile</span>
      </button>
  `;
}

function renderMobileBottomNav(): string {
  return `
    <!-- MOBILE BOTTOM NAVIGATION BAR -->
    <nav id="app-mobile-bottom-nav" class="fixed bottom-0 inset-x-0 z-40 bg-surface-base/95 backdrop-blur-2xl border-t border-white/10 h-14 md:hidden flex items-center justify-around px-2 pb-safe select-none shadow-2xl">
      ${renderMobileBottomNavButtons()}
    </nav>
  `;
}

function renderMobileDrawer(): string {
  return `
    <!-- MOBILE SLIDE-OVER DRAWER -->
    <div id="mobile-drawer" class="fixed inset-0 z-50 lg:hidden transition-all ${isMobileDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}" aria-hidden="${!isMobileDrawerOpen}">
      <!-- BACKDROP OVERLAY -->
      <div id="mobile-drawer-backdrop" class="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300 ease-in-out cursor-pointer ${isMobileDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}"></div>
      
      <!-- DRAWER CONTENT PANEL -->
      <div class="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-surface-base border-r border-white/10 shadow-2xl flex flex-col justify-between z-10 transform transition-transform duration-300 ease-in-out ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}">
        <!-- DRAWER HEADER -->
        <div class="p-4 border-b border-white/10 flex items-center justify-between bg-surface-raised/60">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-slate-800 flex items-center justify-center font-bold text-sm text-white tracking-widest shadow-md">
              Æ
            </div>
            <div>
              <div class="font-bold text-sm text-white font-sans flex items-center space-x-1.5">
                <span>AETHERIS</span>
                <span class="text-[8px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">ZK</span>
              </div>
              <div class="text-[10px] text-slate-400 font-mono">Sovereign Knowledge Vault</div>
            </div>
          </div>
          <button type="button" id="btn-close-mobile-drawer" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-raised cursor-pointer transition-colors" title="Close Drawer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- DRAWER SCROLLABLE BODY -->
        <div class="flex-1 overflow-y-auto p-3 space-y-4">
          <!-- WORKSPACES -->
          <div class="space-y-1">
            <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 px-2 flex items-center justify-between">
              <span>🧭 Workspaces</span>
              <span class="text-indigo-400 text-[9px] font-mono">V4 Engine</span>
            </div>
            <button type="button" data-nav-mode="pulse" class="btn-drawer-item w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId.startsWith('pulse-') ? 'bg-indigo-950/60 text-white border border-indigo-500/30 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
              <span class="text-base">⚡</span>
              <span class="flex-1">Pulse Stream</span>
              ${clientStore.activeChannelId.startsWith('pulse-') ? '<span class="w-2 h-2 rounded-full bg-indigo-400"></span>' : ''}
            </button>
            <button type="button" data-nav-mode="explore" class="btn-drawer-item w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId === 'explore' ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
              <span class="text-base">🔍</span>
              <span class="flex-1">Explore & Trends</span>
              ${clientStore.activeChannelId === 'explore' ? '<span class="w-2 h-2 rounded-full bg-cyan-400"></span>' : ''}
            </button>
            <button type="button" data-nav-mode="vault" class="btn-drawer-item w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId.startsWith('vault-') ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
              <span class="text-base">📚</span>
              <span class="flex-1">Knowledge Vault</span>
              ${clientStore.activeChannelId.startsWith('vault-') ? '<span class="w-2 h-2 rounded-full bg-emerald-400"></span>' : ''}
            </button>
            <button type="button" data-nav-mode="relays" class="btn-drawer-item w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId.startsWith('relays-') ? 'bg-slate-800/80 text-indigo-300 border border-indigo-500/30 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
              <span class="text-base">💬</span>
              <span class="flex-1">Live Relays</span>
              ${clientStore.activeChannelId.startsWith('relays-') ? '<span class="w-2 h-2 rounded-full bg-indigo-400"></span>' : ''}
            </button>
            <button type="button" data-nav-mode="profile" class="btn-drawer-item w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-3 cursor-pointer ${clientStore.activeChannelId.startsWith('profile') ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
              <span class="text-base">👤</span>
              <span class="flex-1">Sovereign Profile</span>
              ${clientStore.activeChannelId.startsWith('profile') ? '<span class="w-2 h-2 rounded-full bg-indigo-400"></span>' : ''}
            </button>
          </div>

          <!-- SOVEREIGN CIRCLES -->
          <div class="pt-2 border-t border-white/5 space-y-1">
            <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 px-2 flex items-center justify-between">
              <span>🏛️ Sovereign Circles</span>
              <span class="text-emerald-400 text-[9px] font-mono">P2P Mesh</span>
            </div>
            <button type="button" data-channel-id="pulse-global" class="btn-channel btn-drawer-channel w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${clientStore.activeChannelId === 'pulse-global' ? 'bg-indigo-950/60 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
              <div class="flex items-center space-x-2 truncate">
                <span class="text-xs">⚡</span>
                <span class="truncate font-semibold">c/zeroknowledge</span>
              </div>
              <span class="text-[9px] font-mono text-indigo-400">RLN</span>
            </button>
            <button type="button" data-channel-id="vault-releases" class="btn-channel btn-drawer-channel w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${clientStore.activeChannelId === 'vault-releases' ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
              <div class="flex items-center space-x-2 truncate">
                <span class="text-xs">📦</span>
                <span class="truncate font-semibold">c/clean-releases</span>
              </div>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/20">342p</span>
            </button>
            <button type="button" data-channel-id="vault-guides" class="btn-channel btn-drawer-channel w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${clientStore.activeChannelId === 'vault-guides' ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
              <div class="flex items-center space-x-2 truncate">
                <span class="text-xs">🛡️</span>
                <span class="truncate font-semibold">c/security-guides</span>
              </div>
              <span class="text-[9px] font-mono text-slate-500">Docs</span>
            </button>
            <button type="button" data-channel-id="relays-general" class="btn-channel btn-drawer-channel w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${clientStore.activeChannelId === 'relays-general' ? 'bg-indigo-950/60 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-surface-raised'}">
              <div class="flex items-center space-x-2 truncate">
                <span class="text-xs">🌐</span>
                <span class="truncate font-semibold">c/p2p-mesh</span>
              </div>
              <span class="text-[9px] font-mono text-slate-400">Mesh</span>
            </button>
          </div>

          <!-- SOVEREIGN TOOLS & PROTOCOLS -->
          <div class="pt-2 border-t border-white/5 space-y-1">
            <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 px-2">
              🛠️ Sovereign Hubs & Utilities
            </div>
            <button type="button" id="drawer-btn-theme" onclick="if(window.__aetheris_close_mobile_drawer) window.__aetheris_close_mobile_drawer(); if(window.__aetheris_open_theme) window.__aetheris_open_theme();" class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-300 hover:text-white bg-amber-950/30 hover:bg-surface-raised border border-amber-500/30 transition-all flex items-center space-x-3 cursor-pointer">
              <span class="text-base">🎨</span>
              <span class="flex-1">Display & Theme Matrix</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">THEME</span>
            </button>
            <button type="button" id="drawer-btn-lang" class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="text-base">${i18n.getCurrentLanguageMeta().flag}</span>
              <span class="flex-1">Language (${i18n.getCurrentLanguageMeta().name})</span>
              <span class="text-[9px] font-mono text-slate-400 uppercase">${i18n.getLanguage()}</span>
            </button>
            <button type="button" id="drawer-btn-dao" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="text-base">🏛️</span>
              <span class="flex-1">DAO Governance</span>
            </button>
            <button type="button" id="drawer-btn-cve" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="text-base">🛡️</span>
              <span class="flex-1">CVE Security Monitor</span>
            </button>
            <button type="button" id="drawer-btn-observatory" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="text-base">🔭</span>
              <span class="flex-1">Network Observatory</span>
            </button>
            <button type="button" id="drawer-btn-backup" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="text-base">💾</span>
              <span class="flex-1">Export & Backup</span>
            </button>
            <button type="button" id="drawer-btn-wot" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="text-base">🕸️</span>
              <span class="flex-1">Web of Trust Graph</span>
            </button>
            <button type="button" id="drawer-btn-gossip" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="text-base">📡</span>
              <span class="flex-1">Gossip Visualizer</span>
            </button>
            <button type="button" id="drawer-btn-rss" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="text-base">📡</span>
              <span class="flex-1">RSS Importer</span>
            </button>
            <button type="button" id="drawer-btn-paper-wallet" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="text-base">📜</span>
              <span class="flex-1">Paper Wallet Certificate</span>
            </button>
            <button type="button" id="drawer-btn-steganography" onclick="if(window.__aetheris_close_mobile_drawer) window.__aetheris_close_mobile_drawer(); if(window.__aetheris_open_steganography) window.__aetheris_open_steganography();" class="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-300 hover:text-white hover:bg-surface-raised transition-all flex items-center space-x-3 cursor-pointer">
              <span class="text-base">🖼️</span>
              <span class="flex-1">Pixel Canvas Steganography</span>
            </button>
          </div>
        </div>

        <!-- DRAWER FOOTER / USER IDENTITY -->
        <div class="p-3 border-t border-white/10 bg-surface-raised/40">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-slate-700 p-0.5 shrink-0">
              <div class="w-full h-full rounded-full bg-surface-base flex items-center justify-center font-mono text-[10px] font-bold text-white">
                ${clientStore.keypair.fingerprint.substring(0, 2).toUpperCase()}
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-1">
                <span class="text-xs font-bold text-white truncate">@id:${clientStore.keypair.fingerprint.substring(0, 8)}</span>
                <span class="text-[8px] font-mono px-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">ZK</span>
              </div>
              <div class="text-[10px] font-mono text-slate-500 truncate">sovereign.aetheris.eth</div>
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

  return `
    <div id="command-rail-overlay" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <div class="w-[560px] max-w-[94vw] bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div class="p-3.5 border-subtle-b flex items-center space-x-3 bg-surface-raised/40">
          <svg class="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            id="command-rail-input"
            value="${escapeHtml(currentFilter)}"
            placeholder="Search posts, circles, encrypted messages, or type / for commands..." 
            class="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-mono"
            autofocus
          />
          <span class="kbd-badge">ESC</span>
        </div>

        <div class="max-h-96 overflow-y-auto p-2.5 space-y-2">
          ${matchingPosts.length > 0 ? `
            <div class="px-2 py-1 text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>📝 Sovereign Posts (BM25: ${matchingPosts.length})</span>
              <span class="text-[9px] text-slate-500">Fuzzy Relevance</span>
            </div>
            <div class="space-y-1">
              ${matchingPosts.map(p => {
                const searchMatch = searchResults.find(r => r.doc.id === p.id);
                const displaySnippet = searchMatch ? searchMatch.snippet : escapeHtml(p.content ? p.content.slice(0, 110) : '');
                return `
                <button type="button" class="btn-open-post-detail w-full text-left p-2.5 rounded-xl bg-surface-overlay hover:bg-surface-highlight border border-white/5 text-xs space-y-1 transition-all cursor-pointer group" data-post-id="${p.id}">
                  <div class="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span class="text-amber-300 font-bold group-hover:text-amber-200">${escapeHtml(p.title || 'Untitled Post')}</span>
                    <div class="flex items-center space-x-2">
                      ${searchMatch ? `<span class="text-[9px] font-mono text-cyan-400 font-bold">score: ${searchMatch.score.toFixed(1)}</span>` : ''}
                      <span class="text-emerald-400 font-bold">▲ ${p.meritVotes || 0}</span>
                    </div>
                  </div>
                  <div class="text-slate-400 text-[11px] truncate">${displaySnippet}</div>
                </button>
              `;
              }).join('')}
            </div>
            <div class="border-subtle-t my-1.5"></div>
          ` : ''}

          ${matchingChannels.length > 0 ? `
            <div class="px-2 py-1 text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>🏛️ Sovereign Circles & Relays (${matchingChannels.length})</span>
              <span class="text-[9px] text-slate-500">Switch channel</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              ${matchingChannels.map(c => `
                <button type="button" class="btn-channel text-left p-2 rounded-xl bg-surface-overlay hover:bg-surface-highlight border border-white/5 text-xs flex items-center justify-between transition-all cursor-pointer" data-channel-id="${c.id}">
                  <span class="font-medium text-slate-200 truncate">${escapeHtml(c.name)}</span>
                  <span class="text-[9px] uppercase px-1.5 py-0.5 rounded bg-surface-raised text-slate-400 font-mono">${c.space}</span>
                </button>
              `).join('')}
            </div>
            <div class="border-subtle-t my-1.5"></div>
          ` : ''}

          ${searchResults.length > 0 ? `
            <div class="px-2 py-1 text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
              🔍 Decrypted Message Results (BM25)
            </div>
            ${searchResults.map(r => `
              <div class="p-2 rounded-xl bg-surface-overlay hover:bg-surface-highlight border border-white/5 text-xs space-y-1 transition-all">
                <div class="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span class="text-cyan-400 font-bold">&lt;${r.doc.authorFingerprint}&gt;</span>
                  <span>Score: ${r.score.toFixed(2)}</span>
                </div>
                <div class="text-slate-200">${escapeHtml(r.snippet)}</div>
              </div>
            `).join('')}
            <div class="border-subtle-t my-1.5"></div>
          ` : ''}

          <div class="px-2 py-1 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
            ⚡ Quick System Commands
          </div>
          ${commands.map(c => `
            <button data-cmd-id="${c.id}" class="btn-exec-cmd w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-surface-overlay text-slate-300 hover:text-white transition-all cursor-pointer">
              <div class="flex items-center space-x-2">
                <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-raised text-slate-400">${c.category}</span>
                <span>${c.title}</span>
              </div>
              ${c.shortcut ? `<span class="kbd-badge">${c.shortcut}</span>` : ''}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}



function renderPostDetailModal(): string {
  if (!postDetailView.isOpen() || !postDetailView.activePostId) return '';
  const post = clientStore.posts.find(p => p.id === postDetailView.activePostId);
  if (!post) return '';
  const comments = threadManager.getRootComments();
  const related = postDetailView.findRelatedPosts(post, clientStore.posts);
  return postDetailView.renderFullPostModal(post, comments, related);
}

function renderAwardModal(): string {
  if (!activeAwardPostId) return '';
  return awardsSystem.renderAwardModal(activeAwardPostId, 'GUARDIAN');
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
  // Abort all listeners from the previous bindEvents() call
  _bindEventsController?.abort();
  _bindEventsController = new AbortController();
  const { signal } = _bindEventsController;

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

  // ─── ESC key global handler — only registered once ──────────────────────────
  if (!(document as any).__escListenerAdded) {
    (document as any).__escListenerAdded = true;
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Close any open modal in priority order
      if (clientStore.isComposerOpen) { clientStore.isComposerOpen = false; clientStore.notify(); return; }
    });
  }

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
    spatialAudio.openModal();
    soundEffects.playVoiceJoin();
    clientStore.notify();
  }, { signal });
  document.getElementById('spatial-modal-close-btn')?.addEventListener('click', () => {
    spatialAudio.closeModal();
    clientStore.notify();
  }, { signal });

  // 3D Spatial Audio Mesh Channel Modal
  document.getElementById('btn-open-spatial-audio-mesh')?.addEventListener('click', () => {
    spatialAudioMesh.openModal();
    soundPacks.play('MESSAGE_SENT');
    clientStore.notify();
  }, { signal });
  document.getElementById('mesh-modal-close-btn')?.addEventListener('click', () => {
    spatialAudioMesh.closeModal();
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
    wotGraphViz.open();
    clientStore.notify();
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
          clientStore.showToast('Bookmark removed', 'info');
        } else {
          const p = clientStore.posts.find(x => x.id === postId);
          if (p) {
            bookmarksVault.save({
              id: p.id,
              title: p.title,
              authorFingerprint: p.authorFingerprint,
              channelId: p.channelId
            });
            clientStore.showToast('Post bookmarked in local vault', 'success');
          }
        }
        clientStore.notify();
      }
    }, { signal });
  });

  // 4. Reactions Toggle & Emoji Picker (Handled centrally in bindReactionBarEvents)

  // 5. Awards Modal
  document.querySelectorAll('.btn-open-award-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        activeAwardPostId = postId;
        clientStore.notify();
      }
    }, { signal });
  });
  document.getElementById('btn-close-award-modal')?.addEventListener('click', () => {
    activeAwardPostId = null;
    clientStore.notify();
  }, { signal });
  document.querySelectorAll('.btn-select-award').forEach(btn => {
    btn.addEventListener('click', () => {
      const awardType = btn.getAttribute('data-award-type') as any;
      if (activeAwardPostId && awardType) {
        awardsSystem.giveAward(activeAwardPostId, awardType, clientStore.keypair.fingerprint, 'GUARDIAN');
        clientStore.showToast(`🏅 Award ${awardType} granted!`, 'success');
        activeAwardPostId = null;
        clientStore.notify();
      }
    }, { signal });
  });

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

  // 7. Full Thread Detail Modal
  document.querySelectorAll('.btn-open-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-open-detail');
      if (postId) {
        postDetailView.openPost(postId);
        localAnalytics.recordPostView();
        clientStore.notify();
      }
    }, { signal });
  });
  document.getElementById('btn-close-post-detail')?.addEventListener('click', () => {
    postDetailView.closePost();
    clientStore.notify();
  }, { signal });

  // 8. ZK Proof Visualizer
  document.getElementById('btn-open-zk-rln')?.addEventListener('click', () => {
    zkProofVisualizer.open('rln');
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-proof-viewer')?.addEventListener('click', () => {
    zkProofVisualizer.close();
    clientStore.notify();
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

  // Command rail (Omnibar Search)
  document.getElementById('btn-open-command-rail')?.addEventListener('click', () => clientStore.toggleCommandRail(), { signal });
  document.getElementById('btn-mobile-search-trigger')?.addEventListener('click', () => clientStore.toggleCommandRail(), { signal });
  document.getElementById('command-rail-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('command-rail-overlay')) {
      clientStore.toggleCommandRail();
    }
  }, { signal });

  const cmdInput = document.getElementById('command-rail-input') as HTMLInputElement;
  if (cmdInput) {
    cmdInput.focus();
    cmdInput.addEventListener('input', (e) => {
      currentFilter = (e.target as HTMLInputElement).value;
      const railModal = document.getElementById('command-rail-overlay');
      if (railModal) {
        railModal.outerHTML = renderCommandRailModal();
        bindEvents();
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
  attachSandboxRunnersToDOM();

  // Identity info modal -> ZK Passport
  document.getElementById('btn-identity-info')?.addEventListener('click', () => {
    zkReputation.open();
    clientStore.notify();
  }, { signal });

  // Voice toggle
  document.getElementById('btn-toggle-voice')?.addEventListener('click', async () => {
    if (voiceVisualizer.isConnected) {
      voiceVisualizer.zeroizeRam();
      clientStore.showToast('Voice disconnected. RAM zeroized.', 'info');
    } else {
      await voiceVisualizer.connectVoice();
      clientStore.showToast('Voice connected with SFrame E2EE', 'success');
    }
  }, { signal });

  // Ghost space toggle
  document.getElementById('btn-toggle-ghost')?.addEventListener('click', () => {
    const active = voiceVisualizer.toggleGhostSpace();
    if (active) {
      clientStore.showToast('👻 Ghost Space active: volatile RAM only', 'warning');
    }
  }, { signal });

  // Screen share button
  document.getElementById('btn-toggle-screen')?.addEventListener('click', async () => {
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

  // Primary Workspace Mode Navigation
  document.querySelectorAll('.btn-nav-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-nav-mode');
      if (mode === 'pulse') clientStore.joinChannel('pulse-global');
      else if (mode === 'vault') clientStore.joinChannel('vault-releases');
      else if (mode === 'relays') clientStore.joinChannel('relays-general');
      else if (mode === 'explore') {
        clientStore.activeChannelId = 'explore';
        clientStore.notify();
      } else if (mode === 'profile') {
        clientStore.activeChannelId = 'profile';
        profileView.setTargetFingerprint(clientStore.keypair.fingerprint);
        clientStore.notify();
      }
    }, { signal });
  });

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
        const res = pulseActionsEngine.toggleLike(postId);
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
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        pulseActionsEngine.closeRepostMenu();
        clientStore.boostPost(postId);
      }
    }, { signal });
  });

  document.querySelectorAll('[data-pulse-action="do-quote"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        const post = clientStore.posts.find(x => x.id === postId);
        if (post) {
          omniComposer.clearComposer();
          omniComposer.activeTab = 'pulse';
          omniComposer.setQuotedPulse({
            id: post.id,
            authorFingerprint: post.authorFingerprint,
            authorRole: post.authorRole,
            title: post.title,
            content: post.content,
          });
          omniComposer.isModalOpen = true;
          clientStore.notify();
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
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.getAttribute('data-post-id');
      if (postId) {
        const isSaved = pulseActionsEngine.toggleBookmark(postId);
        clientStore.showToast(isSaved ? '🔖 Pulse saved to bookmarks' : 'Bookmark removed', 'info');
        clientStore.notify();
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
          clientStore.showToast(`🔗 Copied pulse permalink: ${window.location.origin}/#post-${postId}`, 'success');
        }
      }
    }, { signal });
  });

  // Explore View Handlers
  document.querySelectorAll('.btn-explore-category').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-explore-cat') as any;
      if (cat) {
        exploreView.setActiveCategory(cat);
        clientStore.notify();
      }
    }, { signal });
  });
  const exploreInput = document.getElementById('explore-search-input') as HTMLInputElement;
  if (exploreInput) {
    exploreInput.addEventListener('input', (e) => {
      exploreView.setSearchQuery((e.target as HTMLInputElement).value);
      clientStore.notify();
      const next = document.getElementById('explore-search-input') as HTMLInputElement;
      if (next) {
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      }
    }, { signal });
  }
  document.getElementById('btn-clear-explore-search')?.addEventListener('click', () => {
    exploreView.clearSearch();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-clear-explore-empty')?.addEventListener('click', () => {
    exploreView.clearSearch();
    clientStore.notify();
  }, { signal });
  document.querySelectorAll('.btn-select-trend').forEach(btn => {
    btn.addEventListener('click', () => {
      const trend = btn.getAttribute('data-search-trend');
      if (trend) {
        exploreView.setSearchQuery(trend);
        clientStore.notify();
      }
    }, { signal });
  });
  document.querySelectorAll('.btn-open-featured').forEach(btn => {
    btn.addEventListener('click', () => {
      const topic = btn.getAttribute('data-featured-topic');
      if (topic) {
        exploreView.setSearchQuery(topic);
        clientStore.notify();
      }
    }, { signal });
  });
  document.getElementById('btn-explore-refresh')?.addEventListener('click', () => {
    clientStore.showToast('⚡ Explore chronicle refreshed', 'success');
    clientStore.notify();
  }, { signal });

  // Sovereign Federated Mesh Widget Event Handlers
  nodeFederationEngine.bindEvents();

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
        const isNowFollowing = profileView.toggleFollow(fp);
        clientStore.showToast(isNowFollowing ? `🤝 Trust connection established with @id:${fp.substring(0, 8)}` : `Trust connection removed`, 'info');
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
    formEditProf.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (document.getElementById('edit-profile-name') as HTMLInputElement)?.value;
      const bio = (document.getElementById('edit-profile-bio') as HTMLTextAreaElement)?.value;
      const location = (document.getElementById('edit-profile-location') as HTMLInputElement)?.value;
      const website = (document.getElementById('edit-profile-website') as HTMLInputElement)?.value;
      const avatar = (document.getElementById('edit-profile-avatar') as HTMLInputElement)?.value;
      const banner = (document.getElementById('edit-profile-banner') as HTMLInputElement)?.value;
      profileView.updateProfile(profileView.targetFingerprint, {
        name: name || undefined,
        bio: bio || undefined,
        location: location || undefined,
        website: website || undefined,
        avatar: avatar || undefined,
        banner: banner || undefined,
      });
      profileView.isEditProfileModalOpen = false;
      clientStore.showToast('✨ Sovereign Profile updated!', 'success');
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
      if (id) clientStore.joinChannel(id);
    }, { signal });
  });

  // Send live chat message form
  const formSend = document.getElementById('form-send-message') as HTMLFormElement;
  if (formSend) {
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
  document.getElementById('btn-toggle-dsp')?.addEventListener('click', () => {
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
      const hygiene = inspectBinary(data);

      alert(`🛡️ BINARY HYGIENE INSPECTION AUDIT\n\n` +
        `File: ${file.name}\n` +
        `Format: ${hygiene.format} (${hygiene.architecture})\n` +
        `Shannon Entropy: ${hygiene.overallEntropy.toFixed(3)} bits/byte\n` +
        `Verdict: ${hygiene.verdict}\n` +
        `Anomalies Detected: ${hygiene.anomalies.length ? hygiene.anomalies.join(', ') : 'None (Clean sections)'}\n\n` +
        `Clicking OK will publish this to the Sovereign Vault.`
      );

      await clientStore.auditAndPublishLocalFile(file, `Community Release: ${file.name}`);
      clientStore.showToast(`Verified clean file published: ${file.name}`, 'success');
    }, { signal });
  }

  // Copy SHA
  document.querySelectorAll('.btn-copy-sha').forEach(btn => {
    btn.addEventListener('click', () => {
      const sha = btn.getAttribute('data-sha') || '';
      navigator.clipboard.writeText(sha);
      clientStore.showToast('SHA-256 copied to clipboard', 'info');
    }, { signal });
  });

  // P2P File Download
  document.querySelectorAll('.btn-download-p2p').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fileName = btn.getAttribute('data-file-name') || 'aetheris-payload.bin';
      const byteSize = parseInt(btn.getAttribute('data-byte-size') || '131072', 10);
      const sha = btn.getAttribute('data-sha') || '';

      activeDownloadName = fileName;
      btn.textContent = 'Connecting Swarm...';

      await p2pFileClient.downloadFileFromSwarm(fileName, byteSize, sha, (p) => {
        activeDownloadProgress = p.percentage;
        btn.textContent = `Downloading ${p.percentage}%`;
      });

      btn.textContent = '✅ Verified & Downloaded';
      clientStore.showToast(`P2P File ${fileName} verified & downloaded`, 'success');
      activeDownloadName = null;
      setTimeout(() => btn.textContent = '⬇ Download via P2P Mesh', 3000);
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
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-endorse-id');
      if (id) {
        threadManager.endorseComment(id);
        clientStore.showToast('Endorsed comment (+1 Merit)', 'success');
      }
    }, { signal });
  });

  // Thread reply
  document.querySelectorAll('.btn-reply').forEach(btn => {
    btn.addEventListener('click', () => {
      const parentId = btn.getAttribute('data-reply-to');
      if (!parentId) return;
      const text = prompt('Write sovereign technical reply:');
      if (text && text.trim()) {
        threadManager.addReply(parentId, clientStore.keypair.fingerprint, text.trim());
        clientStore.showToast('Reply added to discussion tree', 'success');
      }
    }, { signal });
  });

  // V4 Sidebar Modal Buttons
  document.getElementById('btn-open-network-observatory')?.addEventListener('click', () => {
    networkObservatory.open();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-network-observatory')?.addEventListener('click', () => {
    networkObservatory.close();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-open-wot-graph')?.addEventListener('click', () => {
    wotGraphViz.open();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-wot-graph-modal')?.addEventListener('click', () => {
    wotGraphViz.close();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-regen-wot-graph')?.addEventListener('click', () => {
    wotGraphViz.regenerateGraph();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-open-custom-theme-builder')?.addEventListener('click', () => {
    customThemeBuilder.openModal();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-custom-theme-builder')?.addEventListener('click', () => {
    customThemeBuilder.closeModal();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-open-gossip-viz')?.addEventListener('click', () => {
    isGossipModalOpen = !isGossipModalOpen;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-open-rss-panel')?.addEventListener('click', () => {
    isRSSModalOpen = !isRSSModalOpen;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-open-cve-monitor')?.addEventListener('click', () => {
    isCVEModalOpen = !isCVEModalOpen;
    clientStore.notify();
  }, { signal });
  document.getElementById('nav-btn-dao')?.addEventListener('click', () => {
    isGovernanceModalOpen = !isGovernanceModalOpen;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-open-backup-export')?.addEventListener('click', () => {
    isExportBackupModalOpen = !isExportBackupModalOpen;
    clientStore.notify();
  }, { signal });

  // Rail Navigation Buttons
  document.getElementById('rail-btn-notifs')?.addEventListener('click', (e) => {
    e.preventDefault();
    isNotificationPanelOpen = !isNotificationPanelOpen;
    clientStore.notify();
  }, { signal });
  document.getElementById('rail-btn-bookmarks')?.addEventListener('click', (e) => {
    e.preventDefault();
    isBookmarkModalOpen = !isBookmarkModalOpen;
    clientStore.notify();
  }, { signal });

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
      const charCount = document.getElementById('inline-char-count');
      if (charCount) {
        const remaining = 280 - inlineTextEl.value.length;
        charCount.textContent = `${remaining}`;
        charCount.className = remaining < 0 ? 'text-[10px] font-mono text-rose-500 font-bold' : 'text-[10px] font-mono text-slate-500';
      }
    }, { signal });
  }

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

  document.getElementById('btn-inline-broadcast')?.addEventListener('click', () => {
    const titleInput = document.getElementById('inline-composer-title') as HTMLInputElement;
    const textarea = document.getElementById('inline-composer-textarea') as HTMLTextAreaElement;
    const hubSelect = document.getElementById('inline-composer-hub') as HTMLSelectElement;

    const content = textarea?.value?.trim();
    if (!content) {
      clientStore.showToast('Please enter post text before broadcasting', 'warning');
      return;
    }

    const title = titleInput && !titleInput.classList.contains('hidden') && titleInput.value.trim() 
      ? titleInput.value.trim() 
      : content.substring(0, 50);

    const channelId = hubSelect?.value || clientStore.activeChannelId;
    const flair = channelId.startsWith('vault-') ? 'VERIFIED RELEASE' : (titleInput && !titleInput.classList.contains('hidden') ? 'TECH DISCUSSION' : 'MICRO-PULSE');

    clientStore.createPost({
      title,
      content,
      channelId,
      flair,
    });

    if (textarea) textarea.value = '';
    if (titleInput) titleInput.value = '';
  }, { signal });
  document.getElementById('btn-dismiss-onboarding-tour')?.addEventListener('click', () => {
    sovereignOnboarding.dismiss();
    clientStore.showToast('🚀 Tour completed! Welcome to Aetheris Sovereign Network.', 'success');
    clientStore.notify();
  }, { signal });

  // Mobile Drawer Handlers
  document.getElementById('btn-toggle-mobile-drawer')?.addEventListener('click', () => {
    isMobileDrawerOpen = !isMobileDrawerOpen;
    clientStore.notify();
  }, { signal });

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
    isGovernanceModalOpen = true;
    clientStore.notify();
  }, { signal });

  document.getElementById('drawer-btn-theme')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    isThemeModalOpen = true;
    clientStore.notify();
  }, { signal });

  document.getElementById('drawer-btn-lang')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    isLangModalOpen = true;
    clientStore.notify();
  }, { signal });

  document.getElementById('drawer-btn-cve')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    isCVEModalOpen = true;
    clientStore.notify();
  }, { signal });

  document.getElementById('drawer-btn-backup')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    isExportBackupModalOpen = true;
    clientStore.notify();
  }, { signal });

  document.getElementById('drawer-btn-gossip')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    isGossipModalOpen = true;
    clientStore.notify();
  }, { signal });

  document.getElementById('drawer-btn-rss')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    isRSSModalOpen = true;
    clientStore.notify();
  }, { signal });

  document.getElementById('drawer-btn-paper-wallet')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    paperWallet.openModal();
    clientStore.notify();
  }, { signal });

  document.getElementById('drawer-btn-observatory')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    networkObservatory.toggle();
    clientStore.notify();
  }, { signal });

  document.getElementById('drawer-btn-wot')?.addEventListener('click', () => {
    isMobileDrawerOpen = false;
    wotGraphViz.toggle();
    clientStore.notify();
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

  // Avatar file input change -> convert to DataURL & preview
  document.getElementById('edit-profile-avatar-file')?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          const avatarInput = document.getElementById('edit-profile-avatar') as HTMLInputElement;
          const previewImg = document.getElementById('edit-preview-avatar') as HTMLImageElement;
          if (avatarInput) avatarInput.value = dataUrl;
          if (previewImg) previewImg.src = dataUrl;
        }
      };
      reader.readAsDataURL(file);
    }
  }, { signal });

  // Banner file input change -> convert to DataURL
  document.getElementById('edit-profile-banner-file')?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          const bannerInput = document.getElementById('edit-profile-banner') as HTMLInputElement;
          if (bannerInput) bannerInput.value = dataUrl;
        }
      };
      reader.readAsDataURL(file);
    }
  }, { signal });

  // Save profile form submission
  document.getElementById('form-edit-profile')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('edit-profile-name') as HTMLInputElement)?.value.trim() || 'Sovereign Node';
    const bio = (document.getElementById('edit-profile-bio') as HTMLTextAreaElement)?.value.trim() || '';
    const location = (document.getElementById('edit-profile-location') as HTMLInputElement)?.value.trim() || 'Cyberspace';
    const website = (document.getElementById('edit-profile-website') as HTMLInputElement)?.value.trim() || 'aetheris.eth';
    const avatar = (document.getElementById('edit-profile-avatar') as HTMLInputElement)?.value.trim() || profileView.getProfile(clientStore.keypair.fingerprint).avatar;
    const banner = (document.getElementById('edit-profile-banner') as HTMLInputElement)?.value.trim() || profileView.getProfile(clientStore.keypair.fingerprint).banner;

    profileView.saveProfile(clientStore.keypair.fingerprint, {
      name,
      bio,
      location,
      website,
      avatar,
      banner,
    });

    profileView.isEditProfileModalOpen = false;
    clientStore.showToast('👤 Sovereign Profile & Photo Updated!', 'success');
    clientStore.notify();
  }, { signal });

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
      clientStore.showToast(`Reaction ${reaction} signed with ZK-RLN`, 'success');
    }, { signal });
  });

  // V4 Active Modal DOM Listeners
  if (isExportBackupModalOpen) {
    const root = document.getElementById('export-container-root');
    if (root) exportBackup.attachEventListeners(root);
  }
  if (isRSSModalOpen) {
    const root = document.getElementById('rss-container-root');
    if (root) rssImporter.attachEventListeners(root);
  }
  if (isCVEModalOpen) {
    const root = document.getElementById('cve-container-root');
    if (root) cveMonitor.bindEvents(root);
  }
  if (isGovernanceModalOpen) {
    const root = document.getElementById('dao-container-root');
    if (root) governanceDAO.bindEvents(root, clientStore.keypair.fingerprint, 75, () => clientStore.notify());
  }
  if (isGossipModalOpen) {
    const root = document.getElementById('gossip-container-root');
    if (root) gossipViz.attachEventListeners(root);
  }

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
    zkReputation.close();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-generate-zk-proof')?.addEventListener('click', () => {
    const proof = zkReputation.createProof(clientStore.keypair.fingerprint, 342);
    clientStore.showToast(`🔒 ZK-SNARK Passport Generated (Nullifier: ${proof.nullifierHash.substring(0, 12)}...)`, 'success');
  }, { signal });

  // Merkle Swarm Visualizer Listeners
  document.querySelectorAll('.btn-inspect-merkle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const fileName = btn.getAttribute('data-file-name') || undefined;
      merkleVisualizer.open(fileName);
      clientStore.notify();
    }, { signal });
  });
  document.getElementById('btn-close-merkle-modal')?.addEventListener('click', () => {
    merkleVisualizer.close();
    clientStore.notify();
  }, { signal });
  document.querySelectorAll('.btn-merkle-piece').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-piece-index') || '0', 10);
      merkleVisualizer.selectPiece(idx);
      clientStore.notify();
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
    meshMatrix.open();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-mesh-modal')?.addEventListener('click', () => {
    meshMatrix.close();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-ping-mesh-peers')?.addEventListener('click', () => {
    meshMatrix.pingAllPeers();
    clientStore.showToast('⚡ Mesh peer latencies measured', 'success');
    clientStore.notify();
  }, { signal });

  // Paper Wallet Listeners
  document.getElementById('btn-open-paper-wallet')?.addEventListener('click', () => {
    paperWallet.open();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-paper-wallet')?.addEventListener('click', () => {
    paperWallet.close();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-print-paper-wallet')?.addEventListener('click', () => {
    if (typeof window !== 'undefined') window.print();
  }, { signal });

  // Acoustic DSP Equalizer Listeners
  document.getElementById('btn-open-dsp-modal')?.addEventListener('click', () => {
    acousticDSP.open();
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-close-dsp-modal')?.addEventListener('click', () => {
    acousticDSP.close();
    clientStore.notify();
  }, { signal });
  document.querySelectorAll('.btn-audio-profile').forEach(btn => {
    btn.addEventListener('click', () => {
      const profId = btn.getAttribute('data-profile-id');
      if (profId) {
        acousticDSP.applyProfile(profId);
        clientStore.notify();
      }
    }, { signal });
  });
  document.querySelectorAll('.slider-eq-gain').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const idx = parseInt((e.target as HTMLElement).getAttribute('data-band-index') || '0', 10);
      const val = parseInt((e.target as HTMLInputElement).value || '0', 10);
      acousticDSP.setGain(idx, val);
    }, { signal });
  });
  document.getElementById('btn-reset-dsp-eq')?.addEventListener('click', () => {
    acousticDSP.applyProfile('flat');
    clientStore.notify();
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
        clientStore.showToast(`🌐 Language switched to ${i18n.getCurrentLanguageMeta().name}`, 'success');
        clientStore.notify();
      }
    }, { signal });
  });

  // Global Scale & Worldwide Anycast Edge Listeners
  document.getElementById('btn-open-global-scale')?.addEventListener('click', () => {
    isGlobalScaleModalOpen = true;
    clientStore.notify();
  }, { signal });
  document.getElementById('btn-probe-edge-pops')?.addEventListener('click', () => {
    globalScale.probeAllPoPs();
    clientStore.showToast('⚡ Global Edge PoP RTT Latencies Measured', 'success');
    clientStore.notify();
  }, { signal });
  document.querySelectorAll('.geo-policy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pol = btn.getAttribute('data-geo-policy');
      if (pol) {
        globalScale.setGeoPolicy(pol as any);
        clientStore.showToast(`🛡️ Geo-Fencing Policy updated: ${pol}`, 'info');
        clientStore.notify();
      }
    }, { signal });
  });
  document.getElementById('btn-toggle-p2p-failover')?.addEventListener('click', () => {
    const nextState = !globalScale.isP2PFailoverActive();
    globalScale.triggerEmergencyP2PFailover(nextState);
    clientStore.showToast(nextState ? '📡 Switched to WebRTC Direct P2P Swarm' : '🌐 Connected to Anycast Global Edge', 'info');
    clientStore.notify();
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

  // Sovereign Mnemonic Vault & Steganography & Archive & Social Recovery & Keyboard Shortcuts Modals
  sovereignMnemonicModal.bindEvents();
  steganographyModal.bindEvents();
  sovereignArchiveModal.bindEvents();
  socialRecoveryModal.bindEvents();
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
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        let changed = false;
        if (obsidianMediaPlayer.isLightboxOpen()) { obsidianMediaPlayer.closeLightbox(); changed = true; }
        if (storiesEngine.activeStoryId) { storiesEngine.activeStoryId = null; changed = true; }
        if (storiesEngine.isCreatorOpen) { storiesEngine.closeCreator(); changed = true; }
        if (zkReputation.isOpen) { zkReputation.close(); changed = true; }
        if (merkleVisualizer.isOpen) { merkleVisualizer.close(); changed = true; }
        if (offlineSync.isOpen) { offlineSync.close(); changed = true; }
        if (meshMatrix.isOpen) { meshMatrix.close(); changed = true; }
        if (paperWallet.isOpen) { paperWallet.close(); changed = true; }
        if (acousticDSP.isOpen) { acousticDSP.close(); changed = true; }
        if (cyberDefenseHub.isOpen) { cyberDefenseHub.close(); changed = true; }
        if (isThemeModalOpen) { isThemeModalOpen = false; changed = true; }
        if (isLangModalOpen) { isLangModalOpen = false; changed = true; }
        if (isGlobalScaleModalOpen) { isGlobalScaleModalOpen = false; changed = true; }
        if (networkObservatory.isOpen) { networkObservatory.close(); changed = true; }
        if (wotGraphViz.isOpen) { wotGraphViz.close(); changed = true; }
        if (customThemeBuilder.isOpen) { customThemeBuilder.closeModal(); changed = true; }
        if (walletBridge.isModalOpen) { walletBridge.closeModal(); changed = true; }
        if (isGossipModalOpen) { isGossipModalOpen = false; changed = true; }
        if (isRSSModalOpen) { isRSSModalOpen = false; changed = true; }
        if (isCVEModalOpen) { isCVEModalOpen = false; changed = true; }
        if (isGovernanceModalOpen) { isGovernanceModalOpen = false; changed = true; }
        if (sovereignMnemonicModal.isOpen) { sovereignMnemonicModal.closeModal(); changed = true; }
        if (steganographyModal.isOpen) { steganographyModal.closeModal(); changed = true; }
        if (sovereignArchiveModal.isOpen) { sovereignArchiveModal.closeModal(); changed = true; }
        if (socialRecoveryModal.isOpen) { socialRecoveryModal.closeModal(); changed = true; }
        if (keyboardNavigator.isHelpModalOpen) { keyboardNavigator.closeHelpModal(); changed = true; }
        if (transparencyMode.isOpen) { transparencyMode.close(); changed = true; }
        if (isExportBackupModalOpen) { isExportBackupModalOpen = false; changed = true; }
        if (isBookmarkModalOpen) { isBookmarkModalOpen = false; changed = true; }
        if (isNotificationPanelOpen) { isNotificationPanelOpen = false; changed = true; }
        if (profileView.isEditProfileModalOpen) { profileView.isEditProfileModalOpen = false; changed = true; }
        if (omniComposer.isModalOpen) { omniComposer.isModalOpen = false; changed = true; }
        pulseActionsEngine.closeRepostMenu();
        if (clientStore.isCommandRailOpen) { clientStore.toggleCommandRail(); changed = true; }
        if (clientStore.isComposerOpen) { clientStore.toggleComposer(); changed = true; }
        if (activeAwardPostId) { activeAwardPostId = null; changed = true; }
        if (activeCrossPostId) { activeCrossPostId = null; changed = true; }
        if (postDetailView.isOpen()) { postDetailView.closePost(); changed = true; }
        if (changed) clientStore.notify();
      } else if (obsidianMediaPlayer.isLightboxOpen()) {
        if (e.key === 'ArrowRight') { obsidianMediaPlayer.nextImage(); clientStore.notify(); }
        else if (e.key === 'ArrowLeft') { obsidianMediaPlayer.prevImage(); clientStore.notify(); }
        else if (e.key === '+') { obsidianMediaPlayer.zoomIn(); clientStore.notify(); }
        else if (e.key === '-') { obsidianMediaPlayer.zoomOut(); clientStore.notify(); }
      }
    });
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}




