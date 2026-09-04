/**
 * AETHERIS HYBRID SUITE - WINDOW AUGMENTATION & GLOBAL TYPE DEFINITIONS
 * Strict TypeScript typings for all window-level singleton registries,
 * modal triggers, EIP-1193 Ethereum providers, Web Audio APIs, and UI event hooks.
 */

// ── EIP-1193 Ethereum Provider Interface ──────────────────────────────────────────
export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on(event: string, listener: (...args: any[]) => void): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
  selectedAddress?: string | null;
  chainId?: string;
  isMetaMask?: boolean;
}

// ── Minimal Interfaces for Core Singletons ─────────────────────────────────────────
// ── Minimal Interfaces for Core Singletons ─────────────────────────────────────────
export interface ClientStoreLike {
  notify: (...args: any[]) => void;
  joinChannel?: (channel: string) => void;
  [key: string]: any;
}

export interface AdminAuthLike {
  isAdmin: boolean | (() => boolean);
  changePin: (currentPin: string, newPin: string) => boolean;
  logout: () => void;
  [key: string]: any;
}

export interface AdminPanelLike {
  open: () => void;
  close: () => void;
  isOpen: boolean | (() => boolean);
  [key: string]: any;
}

export interface CyberDefenseHubLike {
  open: () => void;
  close: () => void;
  isOpen: boolean | (() => boolean);
  [key: string]: any;
}

export interface ThemeEngineLike {
  setTheme: (themeId: string) => void;
  getCurrentThemeId?: () => string;
  currentThemeId?: string;
  [key: string]: any;
}

export interface CustomThemeBuilderLike {
  openModal: () => void;
  closeModal: () => void;
  isOpen: boolean | (() => boolean);
  [key: string]: any;
}

export interface WalletBridgeLike {
  openModal: () => void;
  closeModal: () => void;
  connectMetaMask?: () => Promise<string | null>;
  [key: string]: any;
}

export interface ModalCloserLike {
  close?: () => void;
  closeModal?: () => void;
  [key: string]: any;
}

// ── Complete WindowAugmentation Interface ──────────────────────────────────────────
export interface WindowAugmentation {
  // Service Singletons & Subsystems
  clientStore?: any;
  adminAuth?: any;
  adminPanel?: any;
  cyberDefenseHub?: any;
  sovereignDM?: any;
  __aetherisDM?: any;
  webAuthnManager?: any;
  aetherisWebRTCTransfer?: any;
  themeEngine?: any;
  customThemeBuilder?: any;
  walletBridge?: any;
  zkReputation?: any;
  merkleVisualizer?: any;
  offlineSync?: any;
  meshMatrix?: any;
  paperWallet?: any;
  acousticDSP?: any;
  networkObservatory?: any;
  nodeFederationEngine?: any;
  wotGraphViz?: any;
  inlineDiffViewer?: any;
  aetherisDownloadManager?: any;
  breadcrumbsManager?: any;
  onboardingWizard?: any;
  slideDeckManager?: any;
  __reactionsEngine?: any;
  __aetherisNotifCenter?: any;
  notificationCenter?: any;
  globalScale?: any;
  omniComposer?: any;
  hybridComposer?: any;
  pollEngine?: any;
  obsidianMediaPlayer?: any;
  reactionsEngine?: any;
  awardsSystem?: any;
  awardPopoverManager?: any;
  bookmarksVault?: any;
  crossPostEngine?: any;
  relaysManager?: any;
  sovereignCircleEngine?: any;
  storiesEngine?: any;
  postDetailView?: any;
  profileCardEngine?: any;
  exploreView?: any;
  profileView?: any;
  pulseActionsEngine?: any;
  feedControlsEngine?: any;
  i18n?: any;
  keyboardNavigator?: any;
  pwaService?: any;
  markdownRenderer?: any;
  diagramRenderer?: any;
  codeSandbox?: any;
  chaumianVotingManager?: any;
  sovereignWebPush?: any;
  aiAssistant?: any;
  settingsView?: any;

  // Error Boundary & Structured Logging
  errorBoundary?: any;
  structuredLogger?: any;

  // Database hooks
  __aetherisDB?: any;
  __aetherisRefreshDB?: () => Promise<void>;

  // AI & Automation state
  __transformers_loaded?: boolean;
  __aetheris_ai_events_bound?: boolean;

  // Active User / Identity Context
  activeUserFP?: string;
  activeUserRole?: string;

  // WebRTC / Cloudflare R2 Upload Helpers
  uploadToCloudflareR2?: (file: File) => any;
  triggerUploadToR2?: () => any;
  createTransferSession?: (file: File, peerFP?: string) => Promise<string>;
  sendBinaryDirectWebRTC?: (file: File, onProgress?: (pct: number) => void, peerFP?: string) => Promise<any>;

  // Modal Closers & Triggers
  __aetheris_close_admin?: () => void;
  __aetheris_close_defense?: () => void;
  __aetheris_close_gossip?: () => void;
  __aetheris_close_rss?: () => void;
  __aetheris_close_cve?: () => void;
  __aetheris_close_dao?: () => void;
  __aetheris_close_governance?: () => void;
  __aetheris_close_export?: () => void;
  __aetheris_open_theme?: () => void;
  __aetheris_close_theme?: () => void;
  __aetheris_apply_theme?: (id: string) => void;
  __aetheris_set_accent?: (hex: string) => void;
  __aetheris_set_language?: (lang: string) => void;
  __aetheris_close_lang?: () => void;
  __aetheris_open_global_scale?: () => void;
  __aetheris_close_global_scale?: () => void;
  __aetheris_open_edit_profile?: () => void;
  __aetheris_close_edit_profile?: () => void;
  __aetheris_toggle_mobile_drawer?: () => void;
  __aetheris_open_mobile_drawer?: () => void;
  __aetheris_close_mobile_drawer?: () => void;
  __aetheris_toggle_ui_mode?: () => void;
  __aetheris_set_ui_mode?: (mode: 'simple' | 'sovereign') => void;
  __aetheris_toggle_advanced_overflow?: () => void;
  __aetheris_close_advanced_overflow?: () => void;
  __aetherisToggleNotifs?: () => void;
  __aetherisCloseNotifs?: () => void;
  __aetheris_close_observatory?: () => void;
  __aetheris_observatory_close?: () => void;
  __aetheris_observatory_toggle?: () => void;
  __aetheris_observatory_refresh?: () => void;
  __aetheris_observatory_select_node?: (nodeId: string | null) => void;
  __aetheris_observatory_set_filter?: (filter: any) => void;
  __aetheris_observatory_export?: () => void;
  __aetheris_close_wot_graph?: () => void;
  __aetheris_close_custom_theme_builder?: () => void;
  __aetheris_close_wallet?: () => void;
  __aetheris_close_reputation?: () => void;
  __aetheris_close_merkle?: () => void;
  __aetheris_close_sync?: () => void;
  __aetheris_open_mnemonic?: () => void;
  __aetheris_close_mnemonic?: () => void;
  __aetheris_open_steganography?: () => void;
  __aetheris_close_steganography?: () => void;
  __aetheris_open_archive_modal?: (tab?: 'export' | 'restore') => void;
  __aetheris_close_archive_modal?: () => void;
  __aetheris_open_settings?: (tab?: any) => void;
  __aetheris_close_settings?: () => void;
  __aetheris_dismiss_broadcast?: () => void;
  sovereignMnemonicModal?: any;
  steganographyModal?: any;
  archiveModal?: any;
  socialRecoveryModal?: any;
  __aetheris_open_social_recovery?: (tab?: 'setup' | 'recover') => void;
  __aetheris_close_social_recovery?: () => void;
  __aetheris_close_mesh?: () => void;
  __aetheris_close_paper_wallet?: () => void;
  __aetheris_close_dsp?: () => void;
  spatialAudioMesh?: any;
  soundPacks?: any;
  webTorrentSwarm?: any;

  // Web Standards & Cross-browser Augmentations
  ethereum?: EIP1193Provider;
  webkitAudioContext?: typeof AudioContext;
  requestIdleCallback?: (callback: (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
}

// ── Global Window Declaration ──────────────────────────────────────────────────────
declare global {
  interface Window extends WindowAugmentation {}
}

/**
 * Returns a strictly typed reference to the global `window` object in browser environments,
 * or `null` when executing in SSR, Node, or worker contexts.
 */
export function getAugmentedWindow(): (Window & WindowAugmentation) | null {
  return typeof window !== 'undefined' ? (window as unknown as Window & WindowAugmentation) : null;
}
