/**
 * @file modal-manager.ts
 * @package @aetheris/client-ui
 * @description Sovereign Modal & Sheet Orchestrator.
 * Dynamically loads heavy modules on demand, traps focus, and eliminates startup bloat.
 */

import { clientStore } from './client-state.js';
import { obsidianMediaPlayer } from './media-player.js';
import { storiesEngine } from './stories.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { relaysManager } from './relays-manager.js';
import { profileCardEngine } from './profile-card.js';
import { contextMenuEngine } from './context-menu.js';
import { themeEngine } from './themes.js';
import { zenModeManager } from './zen-mode.js';
import { offlineSync } from './offline-sync.js';
import { profileView } from './profile-view.js';
import { hybridComposer, omniComposer } from './composer-hybrid.js';
import { keyboardNavigator } from './keyboard-nav.js';
import { sovereignWebPush } from './web-push.js';
import { onboardingWizard } from './onboarding.js';
import { rapidOnboarding } from './rapid-onboarding.js';
import { commandRailV2 } from './command-rail-v2.js';
import { i18n } from './i18n.js';
import { zkReputation } from './zk-reputation.js';

export type FeatureModalId =
  | 'observatory'
  | 'wot-graph'
  | 'custom-theme'
  | 'governance'
  | 'rss'
  | 'cve'
  | 'gossip'
  | 'export-backup'
  | 'steganography'
  | 'archive'
  | 'social-recovery'
  | 'portable-trust'
  | 'binary-hygiene'
  | 'microsaas-docs'
  | 'paper-wallet'
  | 'merkle-viz'
  | 'mesh-matrix'
  | 'dsp'
  | 'zk-proof'
  | 'global-scale'
  | 'legal'
  | 'mnemonic'
  | 'transparency'
  | 'slide-deck'
  | 'wallet'
  | 'reputation'
  | 'spatial-audio';

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

export class ModalManager {
  private activeFeatureId: FeatureModalId | null = null;
  private activeFeatureRender: (() => string) | null = null;
  private activeFeatureClose: (() => void) | null = null;
  private loadedModules: Map<string, any> = new Map();
  private isLoading = false;

  public getActiveFeature(): FeatureModalId | null {
    return this.activeFeatureId;
  }

  public isFeatureOpen(id: FeatureModalId): boolean {
    return this.activeFeatureId === id;
  }

  /**
   * Dynamically loads the target feature module and presents its modal overlay.
   */
  public async openFeature(featureId: FeatureModalId, params?: any): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const fp = clientStore.keypair?.fingerprint || 'genesis-core';
      const pubHex = clientStore.keypair?.publicKeyHex || '';

      switch (featureId) {
        case 'observatory': {
          const mod = this.loadedModules.get('observatory') || (await import('./network-observatory.js'));
          this.loadedModules.set('observatory', mod);
          mod.networkObservatory.open();
          this.setActive(
            'observatory',
            () => mod.networkObservatory.renderObservatoryModal(),
            () => mod.networkObservatory.close()
          );
          break;
        }

        case 'wot-graph': {
          const mod = this.loadedModules.get('wot-graph') || (await import('./network-wot-graph.js'));
          this.loadedModules.set('wot-graph', mod);
          mod.wotGraphViz.open();
          this.setActive(
            'wot-graph',
            () => mod.wotGraphViz.renderWoTGraphModal(),
            () => mod.wotGraphViz.close()
          );
          break;
        }

        case 'custom-theme': {
          const mod = this.loadedModules.get('custom-theme') || (await import('./custom-theme-builder.js'));
          this.loadedModules.set('custom-theme', mod);
          mod.customThemeBuilder.openModal();
          this.setActive(
            'custom-theme',
            () => mod.customThemeBuilder.renderBuilderModal(),
            () => mod.customThemeBuilder.closeModal()
          );
          break;
        }

        case 'governance': {
          const mod = this.loadedModules.get('governance') || (await import('./governance-workspace.js'));
          this.loadedModules.set('governance', mod);
          this.setActive(
            'governance',
            () => `
              <div id="governance-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" data-action="close-feature">
                <div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl" data-action="stop-propagation">
                  <div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5">
                    <span class="text-sm font-bold text-white font-mono">🏛️ DAO Governance</span>
                    <button type="button" data-action="close-feature" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button>
                  </div>
                  <div id="dao-container-root">${mod.governanceWorkspace.render()}</div>
                </div>
              </div>
            `,
            () => mod.governanceWorkspace.close()
          );
          mod.governanceWorkspace.open();
          break;
        }

        case 'rss': {
          const mod = this.loadedModules.get('rss') || (await import('./rss-import.js'));
          this.loadedModules.set('rss', mod);
          this.setActive(
            'rss',
            () => `
              <div id="rss-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" data-action="close-feature">
                <div class="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl" data-action="stop-propagation">
                  <div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5">
                    <span class="text-sm font-bold text-white font-mono">📡 RSS Importer</span>
                    <button type="button" data-action="close-feature" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button>
                  </div>
                  <div id="rss-container-root">${mod.rssImporter.renderRSSPanel()}</div>
                </div>
              </div>
            `,
            () => {}
          );
          break;
        }

        case 'cve': {
          const mod = this.loadedModules.get('cve') || (await import('./cve-monitor.js'));
          this.loadedModules.set('cve', mod);
          this.setActive(
            'cve',
            () => `
              <div id="cve-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" data-action="close-feature">
                <div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl" data-action="stop-propagation">
                  <div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5">
                    <span class="text-sm font-bold text-white font-mono">🛡️ CVE Monitor</span>
                    <button type="button" data-action="close-feature" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button>
                  </div>
                  <div id="cve-container-root">${mod.cveMonitor.renderCVEDashboard()}</div>
                </div>
              </div>
            `,
            () => {}
          );
          break;
        }

        case 'gossip': {
          const mod = this.loadedModules.get('gossip') || (await import('./gossip-viz.js'));
          this.loadedModules.set('gossip', mod);
          this.setActive(
            'gossip',
            () => `
              <div id="gossip-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" data-action="close-feature">
                <div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl" data-action="stop-propagation">
                  <div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5">
                    <span class="text-sm font-bold text-white font-mono">📡 Gossip Visualizer</span>
                    <button type="button" data-action="close-feature" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button>
                  </div>
                  <div id="gossip-container-root">${mod.gossipViz.renderGossipPanel()}</div>
                </div>
              </div>
            `,
            () => {}
          );
          break;
        }

        case 'export-backup': {
          const mod = this.loadedModules.get('export-backup') || (await import('./export-backup.js'));
          this.loadedModules.set('export-backup', mod);
          this.setActive(
            'export-backup',
            () => `
              <div id="export-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" data-action="close-feature">
                <div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl" data-action="stop-propagation">
                  <div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5">
                    <span class="text-sm font-bold text-white font-mono">📂 Export & Backup</span>
                    <button type="button" data-action="close-feature" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button>
                  </div>
                  <div id="export-container-root">${mod.exportBackup.renderExportPanel()}</div>
                </div>
              </div>
            `,
            () => {}
          );
          break;
        }

        case 'steganography': {
          const mod = this.loadedModules.get('steganography') || (await import('./steganography-modal.js'));
          this.loadedModules.set('steganography', mod);
          mod.steganographyModal.openModal();
          this.setActive(
            'steganography',
            () => mod.steganographyModal.renderModalHTML(),
            () => mod.steganographyModal.closeModal()
          );
          break;
        }

        case 'archive': {
          const mod = this.loadedModules.get('archive') || (await import('./archive-modal.js'));
          this.loadedModules.set('archive', mod);
          mod.sovereignArchiveModal.openModal(params);
          this.setActive(
            'archive',
            () => mod.sovereignArchiveModal.renderModalHTML(),
            () => mod.sovereignArchiveModal.closeModal()
          );
          break;
        }

        case 'social-recovery': {
          const mod = this.loadedModules.get('social-recovery') || (await import('./social-recovery-modal.js'));
          this.loadedModules.set('social-recovery', mod);
          mod.socialRecoveryModal.openModal(params);
          this.setActive(
            'social-recovery',
            () => mod.socialRecoveryModal.renderModalHTML(),
            () => mod.socialRecoveryModal.closeModal()
          );
          break;
        }

        case 'portable-trust': {
          const mod = this.loadedModules.get('portable-trust') || (await import('./portable-trust-modal.js'));
          this.loadedModules.set('portable-trust', mod);
          mod.portableTrustModal.open();
          this.setActive(
            'portable-trust',
            () => mod.portableTrustModal.renderModalHTML(),
            () => mod.portableTrustModal.close()
          );
          break;
        }

        case 'binary-hygiene': {
          const mod = this.loadedModules.get('binary-hygiene') || (await import('./binary-hygiene-portal.js'));
          this.loadedModules.set('binary-hygiene', mod);
          mod.binaryHygienePortal.open();
          this.setActive(
            'binary-hygiene',
            () => mod.binaryHygienePortal.renderModalHTML(),
            () => mod.binaryHygienePortal.close()
          );
          break;
        }

        case 'microsaas-docs': {
          const mod = this.loadedModules.get('microsaas-docs') || (await import('./microsaas-docs-modal.js'));
          this.loadedModules.set('microsaas-docs', mod);
          mod.microSaaSDocsModal.open();
          this.setActive(
            'microsaas-docs',
            () => mod.microSaaSDocsModal.renderModalHTML(),
            () => mod.microSaaSDocsModal.close()
          );
          break;
        }

        case 'paper-wallet': {
          const mod = this.loadedModules.get('paper-wallet') || (await import('./paper-wallet.js'));
          this.loadedModules.set('paper-wallet', mod);
          mod.paperWallet.open();
          this.setActive(
            'paper-wallet',
            () => mod.paperWallet.renderPaperWalletModal(fp, pubHex),
            () => mod.paperWallet.close()
          );
          break;
        }

        case 'merkle-viz': {
          const mod = this.loadedModules.get('merkle-viz') || (await import('./merkle-viz.js'));
          this.loadedModules.set('merkle-viz', mod);
          mod.merkleVisualizer.open(params);
          this.setActive(
            'merkle-viz',
            () => mod.merkleVisualizer.renderMerkleModal(),
            () => mod.merkleVisualizer.close()
          );
          break;
        }

        case 'mesh-matrix': {
          const mod = this.loadedModules.get('mesh-matrix') || (await import('./mesh-matrix.js'));
          this.loadedModules.set('mesh-matrix', mod);
          mod.meshMatrix.open();
          this.setActive(
            'mesh-matrix',
            () => mod.meshMatrix.renderMeshMatrixModal(),
            () => mod.meshMatrix.close()
          );
          break;
        }

        case 'dsp': {
          const mod = this.loadedModules.get('dsp') || (await import('./acoustic-dsp.js'));
          this.loadedModules.set('dsp', mod);
          mod.acousticDSP.open();
          this.setActive(
            'dsp',
            () => mod.acousticDSP.renderDSPModal(),
            () => mod.acousticDSP.close()
          );
          break;
        }

        case 'zk-proof': {
          const mod = this.loadedModules.get('zk-proof') || (await import('./zk-proof-viewer.js'));
          this.loadedModules.set('zk-proof', mod);
          mod.zkProofVisualizer.open(params);
          this.setActive(
            'zk-proof',
            () => mod.zkProofVisualizer.renderProofViewer(),
            () => mod.zkProofVisualizer.close()
          );
          break;
        }

        case 'global-scale': {
          const mod = this.loadedModules.get('global-scale') || (await import('./global-scale.js'));
          this.loadedModules.set('global-scale', mod);
          this.setActive(
            'global-scale',
            () => `
              <div id="global-scale-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" data-action="close-feature">
                <div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-base border border-white/10 rounded-2xl p-6 shadow-2xl" data-action="stop-propagation">
                  <div class="flex justify-between items-center pb-3 mb-3 border-b border-white/5">
                    <span class="text-sm font-bold text-white font-mono">🌐 Edge Infrastructure</span>
                    <button type="button" data-action="close-feature" class="text-slate-400 hover:text-white px-2 py-1 cursor-pointer">✕</button>
                  </div>
                  <div>${mod.globalScale.renderGlobalScaleDashboard()}</div>
                </div>
              </div>
            `,
            () => {}
          );
          break;
        }

        case 'legal': {
          const mod = this.loadedModules.get('legal') || (await import('./legal-modal.js'));
          this.loadedModules.set('legal', mod);
          const tab = typeof params === 'string' ? params : (params?.tab || 'terms');
          const targetId = typeof params === 'object' ? (params?.targetId || '') : '';
          mod.legalModal.open(tab, targetId);
          this.setActive(
            'legal',
            () => mod.legalModal.render(),
            () => mod.legalModal.close()
          );
          break;
        }

        case 'mnemonic': {
          const mod = this.loadedModules.get('mnemonic') || (await import('./mnemonic-modal.js'));
          this.loadedModules.set('mnemonic', mod);
          mod.sovereignMnemonicModal.openModal();
          this.setActive(
            'mnemonic',
            () => mod.sovereignMnemonicModal.renderModalHTML(),
            () => mod.sovereignMnemonicModal.closeModal()
          );
          break;
        }

        case 'transparency': {
          const mod = this.loadedModules.get('transparency') || (await import('./transparency-mode.js'));
          this.loadedModules.set('transparency', mod);
          mod.transparencyMode.open();
          this.setActive(
            'transparency',
            () => mod.transparencyMode.renderInspectorModal(),
            () => mod.transparencyMode.close()
          );
          break;
        }

        case 'slide-deck': {
          const mod = this.loadedModules.get('slide-deck') || (await import('./slide-deck.js'));
          this.loadedModules.set('slide-deck', mod);
          mod.slideDeckManager.open();
          this.setActive(
            'slide-deck',
            () => mod.slideDeckManager.render(),
            () => mod.slideDeckManager.close()
          );
          break;
        }

        case 'wallet': {
          const mod = this.loadedModules.get('wallet') || (await import('./wallet-bridge.js'));
          this.loadedModules.set('wallet', mod);
          mod.walletBridge.openModal(true);
          this.setActive(
            'wallet',
            () => mod.walletBridge.renderWalletPanel(),
            () => mod.walletBridge.closeModal()
          );
          break;
        }

        case 'reputation': {
          zkReputation.open();
          this.setActive(
            'reputation',
            () => zkReputation.renderReputationCenterModal(fp, 342),
            () => zkReputation.close()
          );
          break;
        }

        case 'spatial-audio': {
          const mod = this.loadedModules.get('spatial-audio') || (await import('./spatial-audio.js'));
          this.loadedModules.set('spatial-audio', mod);
          mod.spatialAudio.openModal();
          this.setActive(
            'spatial-audio',
            () => mod.spatialAudio.renderSpatialModal(),
            () => mod.spatialAudio.closeModal()
          );
          break;
        }
      }
    } finally {
      this.isLoading = false;
      clientStore.notifySync();
    }
  }

  private setActive(id: FeatureModalId, render: () => string, close: () => void): void {
    this.activeFeatureId = id;
    this.activeFeatureRender = render;
    this.activeFeatureClose = close;
  }

  /**
   * Closes any currently active feature modal.
   */
  public closeFeature(): void {
    if (this.activeFeatureClose) {
      try {
        this.activeFeatureClose();
      } catch (e) {
        console.error('[ModalManager] error in closeFeature handler:', e);
      }
    }
    this.activeFeatureId = null;
    this.activeFeatureRender = null;
    this.activeFeatureClose = null;
    clientStore.notifySync();
  }

  /**
   * Returns rendered HTML for the active feature modal, or empty string.
   */
  public getActiveFeatureHTML(): string {
    if (!this.activeFeatureRender) return '';
    try {
      return this.activeFeatureRender();
    } catch (e) {
      console.error('[ModalManager] error rendering active feature:', e);
      return '';
    }
  }
}

export const modalManager = new ModalManager();

if (typeof window !== 'undefined') {
  (window as any).modalManager = modalManager;
  (window as any).__aetheris_open_feature = (id: FeatureModalId, params?: any) => modalManager.openFeature(id, params);
  (window as any).__aetheris_close_feature = () => modalManager.closeFeature();
}

/**
 * Builds the complete modal root HTML.
 * Only active/open modal structures are included in the output.
 */
export function buildModalRootHTML(ctx: ModalStateContext): string {
  const fp = clientStore.keypair?.fingerprint || 'genesis-core';

  return `
    ${ctx.renderCommandRailModal()}
    ${obsidianMediaPlayer.isLightboxOpen() ? obsidianMediaPlayer.renderLightboxModal() : ''}
    ${storiesEngine.activeStoryId ? storiesEngine.renderStoryModal(fp) : ''}
    ${storiesEngine.isCreatorOpen ? storiesEngine.renderStoryCreatorModal(fp) : ''}
    ${ctx.renderPostDetailModal()}
    ${ctx.renderAwardModal()}
    ${sovereignCircleEngine.isCreateModalOpen ? sovereignCircleEngine.renderCreateCircleModal() : ''}
    ${sovereignCircleEngine.isModModalOpen ? sovereignCircleEngine.renderCircleModModal() : ''}
    ${ctx.renderCrossPostModal()}
    ${ctx.renderBookmarksModal()}
    ${ctx.renderNotificationsDropdown()}
    ${relaysManager.isCreateModalOpen ? relaysManager.renderCreateRelayModal() : ''}
    ${relaysManager.isInviteModalOpen ? relaysManager.renderInviteModal() : ''}
    ${relaysManager.isJoinModalOpen ? relaysManager.renderJoinRelayModal() : ''}
    ${profileCardEngine.activeCardFP ? profileCardEngine.renderProfileCard() : ''}
    ${contextMenuEngine.isOpen ? contextMenuEngine.renderContextMenu() : ''}
    ${ctx.isThemeModalOpen || themeEngine.isModalOpen ? themeEngine.renderThemeSelectorModal() : ''}
    ${zenModeManager.isZenActive ? zenModeManager.renderZenFloatingExit() : ''}
    ${offlineSync.isOpen ? offlineSync.renderSyncManagerModal() : ''}
    ${ctx.isLangModalOpen ? `<div id="lang-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" data-action="close-lang"><div data-action="stop-propagation">${i18n.renderLanguagePicker('dropdown')}</div></div>` : ''}
    ${profileView.isEditProfileModalOpen ? profileView.renderEditProfileModal(profileView.getProfile(profileView.targetFingerprint)) : ''}
    ${clientStore.isComposerOpen ? hybridComposer.renderComposerModal() : ''}
    ${keyboardNavigator.isHelpModalOpen ? keyboardNavigator.renderModal() : ''}
    ${onboardingWizard.isOpen ? '' : sovereignWebPush.renderPushOptInBanner()}
    ${rapidOnboarding.isOpen ? rapidOnboarding.renderModalHTML() : ''}
    ${onboardingWizard.renderWizardModal(fp)}
    ${commandRailV2.isOpen ? commandRailV2.renderModal() : ''}
    ${modalManager.getActiveFeatureHTML()}
  `;
}
