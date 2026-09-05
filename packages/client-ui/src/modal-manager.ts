/**
 * @file modal-manager.ts
 * @package @aetheris/client-ui
 * @description Sovereign Modal & Sheet Orchestrator.
 * Unifies all modal layers into a cleanly managed, accessible portal.
 */

import { clientStore } from './client-state.js';
import { obsidianMediaPlayer } from './media-player.js';
import { storiesEngine } from './stories.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { relaysManager } from './relays-manager.js';
import { zkProofVisualizer } from './zk-proof-viewer.js';
import { profileCardEngine } from './profile-card.js';
import { contextMenuEngine } from './context-menu.js';
import { themeEngine } from './themes.js';
import { spatialAudio } from './spatial-audio.js';
import { sovereignDM } from './sovereign-dm.js';
import { zenModeManager } from './zen-mode.js';
import { walletBridge } from './wallet-bridge.js';
import { zkReputation } from './zk-reputation.js';
import { merkleVisualizer } from './merkle-viz.js';
import { offlineSync } from './offline-sync.js';
import { meshMatrix } from './mesh-matrix.js';
import { paperWallet } from './paper-wallet.js';
import { acousticDSP } from './acoustic-dsp.js';
import { networkObservatory } from './network-observatory.js';
import { wotGraphViz } from './network-wot-graph.js';
import { customThemeBuilder } from './custom-theme-builder.js';
import { governanceDAO } from './governance.js';
import { rssImporter } from './rss-import.js';
import { cveMonitor } from './cve-monitor.js';
import { gossipViz } from './gossip-viz.js';
import { exportBackup } from './export-backup.js';
import { profileView } from './profile-view.js';
import { hybridComposer } from './composer-hybrid.js';
import { omniComposer } from './composer.js';
import { sovereignMnemonicModal } from './mnemonic-modal.js';
import { steganographyModal } from './steganography-modal.js';
import { sovereignArchiveModal } from './archive-modal.js';
import { socialRecoveryModal } from './social-recovery-modal.js';
import { portableTrustModal } from './portable-trust-modal.js';
import { binaryHygienePortal } from './binary-hygiene-portal.js';
import { keyboardNavigator } from './keyboard-nav.js';
import { transparencyMode } from './transparency-mode.js';
import { sovereignWebPush } from './web-push.js';
import { onboardingWizard } from './onboarding.js';
import { legalModal } from './legal-modal.js';
import { commandRailV2 } from './command-rail-v2.js';
import { i18n } from './i18n.js';
import { globalScale } from './global-scale.js';

export interface ModalStateContext {
  isThemeModalOpen: boolean;
  isLangModalOpen: boolean;
  isGlobalScaleModalOpen: boolean;
  isGovernanceModalOpen: boolean;
  isRSSModalOpen: boolean;
  isCVEModalOpen: boolean;
  isGossipModalOpen: boolean;
  isExportBackupModalOpen: boolean;
  renderCommandRailModal: () => string;
  renderPostDetailModal: () => string;
  renderAwardModal: () => string;
  renderCrossPostModal: () => string;
  renderBookmarksModal: () => string;
  renderNotificationsDropdown: () => string;
}

export function buildModalRootHTML(ctx: ModalStateContext): string {
  const fp = clientStore.keypair?.fingerprint || 'genesis-core';
  const pubHex = clientStore.keypair?.publicKeyHex || '';

  return `
    ${ctx.renderCommandRailModal()}
    ${obsidianMediaPlayer.renderLightboxModal()}
    ${storiesEngine.renderStoryModal(fp)}
    ${storiesEngine.renderStoryCreatorModal(fp)}
    ${ctx.renderPostDetailModal()}
    ${ctx.renderAwardModal()}
    ${sovereignCircleEngine.renderCreateCircleModal()}
    ${ctx.renderCrossPostModal()}
    ${ctx.renderBookmarksModal()}
    ${ctx.renderNotificationsDropdown()}
    ${relaysManager.renderCreateRelayModal()}
    ${relaysManager.renderInviteModal()}
    ${relaysManager.renderJoinRelayModal()}
    ${zkProofVisualizer.renderProofViewer()}
    ${profileCardEngine.renderProfileCard()}
    ${contextMenuEngine.renderContextMenu()}
    ${ctx.isThemeModalOpen ? themeEngine.renderThemeSelectorModal() : ''}
    ${spatialAudio.isOpen ? spatialAudio.renderSpatialModal() : ''}
    ${sovereignDM.isOpen ? sovereignDM.renderDMModal(fp) : ''}
    ${zenModeManager.isZenActive ? zenModeManager.renderZenFloatingExit() : ''}
    ${walletBridge.isModalOpen ? walletBridge.renderWalletPanel() : ''}
    ${zkReputation.renderReputationCenterModal(fp, 342)}
    ${merkleVisualizer.renderMerkleModal()}
    ${offlineSync.renderSyncManagerModal()}
    ${meshMatrix.renderMeshMatrixModal()}
    ${paperWallet.renderPaperWalletModal(fp, pubHex)}
    ${acousticDSP.renderDSPModal()}
    ${networkObservatory.isOpen ? networkObservatory.renderObservatoryModal() : ''}
    ${wotGraphViz.isOpen ? wotGraphViz.renderWoTGraphModal() : ''}
    ${customThemeBuilder.isOpen ? customThemeBuilder.renderBuilderModal() : ''}
    ${ctx.isLangModalOpen ? `<div id="lang-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='lang-modal-backdrop'){window.__aetheris_close_lang&&window.__aetheris_close_lang();}">${i18n.renderLanguagePicker('dropdown')}</div>` : ''}
    ${ctx.isGlobalScaleModalOpen ? `<div id="global-scale-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='global-scale-modal-backdrop'){window.__aetheris_close_global_scale&&window.__aetheris_close_global_scale();}"><div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl"><div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5"><span class="text-sm font-bold text-white font-mono">🌐 Edge Infrastructure</span><button id="btn-close-global-scale" onclick="window.__aetheris_close_global_scale&&window.__aetheris_close_global_scale()" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button></div><div>${globalScale.renderGlobalScaleDashboard()}</div></div></div>` : ''}
    ${ctx.isGovernanceModalOpen ? `<div id="governance-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='governance-modal-backdrop'){window.__aetheris_close_governance&&window.__aetheris_close_governance();}"><div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl"><div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5"><span class="text-sm font-bold text-white font-mono">🏛️ DAO Governance</span><button id="btn-close-governance" onclick="window.__aetheris_close_governance&&window.__aetheris_close_governance()" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button></div><div id="dao-container-root">${governanceDAO.renderGovernanceHub(fp, 75)}</div></div></div>` : ''}
    ${ctx.isRSSModalOpen ? `<div id="rss-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='rss-modal-backdrop'){window.__aetheris_close_rss&&window.__aetheris_close_rss();}"><div class="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl"><div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5"><span class="text-sm font-bold text-white font-mono">📡 RSS Importer</span><button id="btn-close-rss" onclick="window.__aetheris_close_rss&&window.__aetheris_close_rss()" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button></div><div id="rss-container-root">${rssImporter.renderRSSPanel()}</div></div></div>` : ''}
    ${ctx.isCVEModalOpen ? `<div id="cve-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='cve-modal-backdrop'){window.__aetheris_close_cve&&window.__aetheris_close_cve();}"><div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl"><div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5"><span class="text-sm font-bold text-white font-mono">🛡️ CVE Monitor</span><button id="btn-close-cve" onclick="window.__aetheris_close_cve&&window.__aetheris_close_cve()" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button></div><div id="cve-container-root">${cveMonitor.renderCVEDashboard()}</div></div></div>` : ''}
    ${ctx.isGossipModalOpen ? `<div id="gossip-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='gossip-modal-backdrop'){window.__aetheris_close_gossip&&window.__aetheris_close_gossip();}"><div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl"><div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5"><span class="text-sm font-bold text-white font-mono">📡 Gossip Visualizer</span><button id="btn-close-gossip" onclick="window.__aetheris_close_gossip&&window.__aetheris_close_gossip()" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button></div><div id="gossip-container-root">${gossipViz.renderGossipPanel()}</div></div></div>` : ''}
    ${ctx.isExportBackupModalOpen ? `<div id="export-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onclick="if(event.target.id==='export-modal-backdrop'){window.__aetheris_close_export&&window.__aetheris_close_export();}"><div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl"><div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5"><span class="text-sm font-bold text-white font-mono">📂 Export & Backup</span><button id="btn-close-export" onclick="window.__aetheris_close_export&&window.__aetheris_close_export()" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button></div><div id="export-container-root">${exportBackup.renderExportPanel()}</div></div></div>` : ''}
    ${profileView.isEditProfileModalOpen ? profileView.renderEditProfileModal(profileView.getProfile(profileView.targetFingerprint)) : ''}
    ${clientStore.isComposerOpen ? hybridComposer.renderComposerModal() : (omniComposer.isModalOpen ? omniComposer.renderComposerModal() : '')}
    ${sovereignMnemonicModal.renderModalHTML()}
    ${steganographyModal.renderModalHTML()}
    ${sovereignArchiveModal.renderModalHTML()}
    ${socialRecoveryModal.renderModalHTML()}
    ${portableTrustModal.renderModalHTML()}
    ${binaryHygienePortal.renderModalHTML()}
    ${keyboardNavigator.renderModal()}
    ${transparencyMode.renderInspectorModal()}
    ${sovereignWebPush.renderPushOptInBanner()}
    ${onboardingWizard.renderWizardModal(fp)}
    ${legalModal.render()}
    ${commandRailV2.isOpen ? commandRailV2.renderModal() : ''}
  `;
}
