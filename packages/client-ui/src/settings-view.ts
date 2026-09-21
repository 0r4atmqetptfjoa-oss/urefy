/**
 * @file settings-view.ts
 * @package @aetheris/client-ui
 * @description Sovereign Unified Settings Engine for UREfy.
 * Provides a responsive obsidian-styled modal dialog unifying:
 * 1. Appearance (Teme & Aspect) - Theme switcher, OLED black mode, font family, Custom Theme Studio launcher.
 * 2. Preferences (Network & WoT Preferences) - Web-of-Trust badges, demote low trust, merit threshold, proactive AI, zen mode.
 * 3. Footprint (Amprentă & Resurse) - Audits storage, bundle size, zero trackers, and network efficiency.
 * 4. Backup (Salvare & Export Cont) - Encrypted AES-256-GCM backup, restore, and JSON export.
 * 5. Telemetry (Diagnostic & Confidențialitate) - 100% on-device error logs and memory zeroization.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { escapeHtml } from './dry-utils.js';
import { sovereignFootprint } from './settings-footprint.js';
import { renderExportPanelHTML } from './export-backup-ui.js';
import { localDiagnostics } from './local-diagnostics.js';
import { themeEngine, THEMES } from './themes.js';
import { clientStore } from './client-state.js';
import { profileView } from './profile-view.js';
import { zenModeManager } from './zen-mode.js';
import { i18n, t } from './i18n.js';

// ─── INTERFACES & DEFINITIONS ──────────────────────────────────────────────────

export type SettingsTab =
  | 'account'
  | 'security'
  | 'privacy'
  | 'notifications'
  | 'appearance'
  | 'messages'
  | 'network'
  | 'storage'
  | 'data'
  | 'advanced'
  | 'preferences'
  | 'footprint'
  | 'backup'
  | 'telemetry'
  | 'messaging';

export interface SettingsSectionDefinition {
  id: SettingsTab;
  label: string;
  icon: string;
  description: string;
}

export const SETTINGS_CANONICAL_SECTIONS: SettingsSectionDefinition[] = [
  {
    id: 'account',
    label: 'Account',
    icon: '👤',
    description: 'Profile name, bio, and handle',
  },
  {
    id: 'security',
    label: 'Security & Passkeys',
    icon: '🔑',
    description: 'Device passkeys, recovery phrase, and hardware keys',
  },
  {
    id: 'privacy',
    label: 'Privacy & Safety',
    icon: '🛡️',
    description: 'Visibility, trust thresholds, and simple/advanced mode',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: '🔔',
    description: 'Push alerts, mentions, and private sounds',
  },
  {
    id: 'appearance',
    label: 'Appearance & Themes',
    icon: '🎨',
    description: 'Theme switcher, OLED black mode, and typography',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: '💬',
    description: 'Direct messaging preferences, read receipts, and privacy',
  },
  {
    id: 'network',
    label: 'Network & WoT',
    icon: '⚙️',
    description: 'Web-of-Trust badges, demote low trust, and merit threshold',
  },
  {
    id: 'storage',
    label: 'Storage & Footprint',
    icon: '📊',
    description: 'Local storage audit, zero tracking, and efficiency',
  },
  {
    id: 'data',
    label: 'Data & Backup',
    icon: '💾',
    description: 'Encrypted AES-256-GCM backup, restore, and JSON export',
  },
  {
    id: 'advanced',
    label: 'Advanced & Diagnostics',
    icon: '⚡',
    description: 'Telemetry, 100% on-device error logs, and memory wipe',
  },
];

export const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
  {
    id: 'appearance',
    label: 'Appearance & Themes',
    icon: '🎨',
    description: 'Color palettes, OLED mode, and typography',
  },
  {
    id: 'security',
    label: 'Security & Passkeys',
    icon: '🔑',
    description: 'Device passkeys, recovery phrase, and hardware authentication',
  },
  {
    id: 'preferences',
    label: 'Network',
    icon: '⚙️',
    description: 'Web-of-Trust badges, merit thresholds, and network preferences',
  },
  {
    id: 'footprint',
    label: 'Storage',
    icon: '📊',
    description: 'Local storage audit, zero tracking, and efficiency',
  },
  {
    id: 'backup',
    label: 'Data & Export',
    icon: '💾',
    description: 'Encrypted backups and cryptographic key restoration',
  },
  {
    id: 'telemetry',
    label: 'Privacy',
    icon: '🛡️',
    description: 'Local error telemetry and zero-knowledge memory wipe',
  },
];
export const SETTINGS_WORKSPACE_SECTIONS: SettingsSectionDefinition[] = SETTINGS_CANONICAL_SECTIONS;

export function normalizeSettingsTab(tab?: string): SettingsTab {
  if (!tab) return 'appearance';
  const clean = tab.toLowerCase().trim();
  if (clean === 'preferences') return 'network';
  if (clean === 'footprint') return 'storage';
  if (clean === 'backup') return 'data';
  if (clean === 'telemetry') return 'advanced';
  if (clean === 'messaging') return 'messages';
  if (SETTINGS_CANONICAL_SECTIONS.some(s => s.id === clean)) {
    return clean as SettingsTab;
  }
  return 'appearance';
}

// ─── SETTINGS VIEW CLASS ─────────────────────────────────────────────────────

export class SettingsView {
  public isOpen: boolean = false;
  public activeTab: SettingsTab = 'appearance';

  private readonly MODAL_CONTAINER_ID: string = 'aetheris-settings-modal-wrapper';
  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.registerGlobalWindow();
  }

  /**
   * Registers global window helpers and references for onclick bindings.
   */
  public registerGlobalWindow(): void {
    const win = typeof window !== 'undefined' ? window : (globalThis as any).window;
    if (win) {
      (win as any).settingsView = this;
      (win as any).__aetheris_open_settings = (tab?: SettingsTab) => this.open(tab);
      (win as any).__aetheris_close_settings = () => this.close();
    }
  }

  /**
   * Opens the settings modal, optionally navigating directly to a specified tab.
   */
  public open(initialTab?: SettingsTab): void {
    this.isOpen = true;
    if (initialTab) {
      this.activeTab = initialTab;
    } else if (!this.activeTab) {
      this.activeTab = 'appearance';
    }

    if (typeof document !== 'undefined') {
      let container = document.getElementById(this.MODAL_CONTAINER_ID);
      if (!container) {
        container = document.createElement('div');
        container.id = this.MODAL_CONTAINER_ID;
        document.body.appendChild(container);
      }
      container.innerHTML = this.renderSettingsModal();
      container.style.display = 'block';

      this.attachEventListeners(container);

      if (!this.boundKeyHandler) {
        this.boundKeyHandler = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && this.isOpen) {
            this.close();
          }
        };
        document.addEventListener('keydown', this.boundKeyHandler);
      }
    }

    if (typeof window !== 'undefined' && clientStore) {
      try {
        clientStore.notify('SETTINGS_OPENED', { tab: this.activeTab });
      } catch (_) {}
    }
  }

  /**
   * Closes the settings modal.
   */
  public close(): void {
    this.isOpen = false;

    if (typeof document !== 'undefined') {
      const container = document.getElementById(this.MODAL_CONTAINER_ID);
      if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
      }

      if (this.boundKeyHandler) {
        document.removeEventListener('keydown', this.boundKeyHandler);
        this.boundKeyHandler = null;
      }
    }

    if (typeof window !== 'undefined' && clientStore) {
      try {
        clientStore.notify('SETTINGS_CLOSED');
      } catch (_) {}
    }
  }

  /**
   * Toggles the visibility of the settings modal.
   */
  public toggle(tab?: SettingsTab): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(tab);
    }
  }

  /**
   * Switches the active settings tab and updates the modal view.
   */
  public setActiveTab(tab: SettingsTab): void {
    const valid = [
      'account', 'security', 'privacy', 'notifications', 'appearance', 'messages', 'network', 'storage', 'data', 'advanced',
      'preferences', 'footprint', 'backup', 'telemetry', 'messaging',
    ].includes(tab);
    if (!valid) return;
    this.activeTab = tab;
    const normalized = normalizeSettingsTab(tab);

    if (this.isOpen && typeof document !== 'undefined') {
      const container = document.getElementById(this.MODAL_CONTAINER_ID);
      if (container) {
        container.innerHTML = this.renderSettingsModal();
        this.attachEventListeners(container);
      }
    }

    if (typeof window !== 'undefined' && clientStore) {
      try {
        clientStore.notify('SETTINGS_TAB_CHANGED', { tab: normalized });
      } catch (_) {}
    }
  }

  /**
   * Generates the complete HTML string for the responsive settings modal.
   */
  public renderSettingsModal(): string {
    const activeTab = this.activeTab;
    const normalized = normalizeSettingsTab(activeTab);
    const legacyAliases: Record<string, string> = {
      network: 'preferences',
      storage: 'footprint',
      data: 'backup',
      advanced: 'telemetry',
    };
    const tabsHTML = SETTINGS_CANONICAL_SECTIONS.map((sec) => {
      const isSelected = normalized === sec.id || activeTab === sec.id;
      const label = t(`settings.${sec.id}Title`, undefined, sec.label);
      const desc = t(`settings.${sec.id}Desc`, undefined, sec.description);
      const alias = legacyAliases[sec.id];
      return `
        <button
          type="button"
          data-settings-tab="${sec.id}" data-action="set-settings-tab"
          class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-left text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap md:whitespace-normal w-full group ${
            isSelected
              ? 'bg-[var(--color-accent,#e59b3c)]/15 text-[var(--color-accent,#e59b3c)] border border-[var(--color-accent,#e59b3c)]/30 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }"
          aria-selected="${isSelected}"
        >
          <span class="text-base md:text-lg shrink-0 group-hover:scale-110 transition-transform">${sec.icon}</span>
          <div class="hidden sm:block min-w-0 flex-1">
            <div class="truncate ${isSelected ? 'text-[var(--color-accent,#e59b3c)] font-semibold' : 'text-slate-300'}">${label}</div>
            <div class="text-[10px] text-slate-500 truncate hidden md:block">${desc}</div>
          </div>
          ${alias ? `<span class="hidden" data-settings-tab="${alias}"></span>` : ''}
        </button>
      `;
    }).join('');

    const mobileOptionsHTML = SETTINGS_CANONICAL_SECTIONS.map((sec) => {
      const isSelected = normalized === sec.id || activeTab === sec.id;
      return `<option value="${sec.id}" ${isSelected ? 'selected' : ''}>${sec.icon} ${sec.label}</option>`;
    }).join('');

    const contentHTML = this.renderTabContent(normalized);

    return `
      <div
        id="settings-modal-backdrop"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in cursor-pointer" data-action="close-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <div
          id="unified-settings-modal"
          class="relative w-full max-w-5xl h-[90vh] max-h-[850px] bg-surface-base border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans backdrop-blur-xl animate-in zoom-in-95 duration-200 cursor-default" data-action="stop-propagation"
        >
          <!-- HEADER -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-surface-raised/40">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl bg-[var(--color-accent,#e59b3c)]/15 border border-[var(--color-accent,#e59b3c)]/30 flex items-center justify-center text-[var(--color-accent,#e59b3c)] text-lg shadow-sm">
                ⚙️
              </div>
              <div>
                <h2 id="settings-modal-title" class="text-lg md:text-xl font-bold text-white tracking-wide flex items-center gap-2">
                  <span>⚙️ Sovereign Settings</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-accent,#e59b3c)]/15 text-[var(--color-accent,#e59b3c)] border border-[var(--color-accent,#e59b3c)]/30 font-semibold">CANONICAL</span>
                </h2>
                <p class="text-xs text-slate-400">Security, privacy, appearance, and decentralized controls</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-settings-modal" data-action="close-settings"
              class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-sm font-mono flex items-center justify-center"
              title="${t('common.close', undefined, 'Close Settings')}"
              aria-label="${t('common.close', undefined, 'Close settings')}"
            >
              ✕
            </button>
          </div>

          <!-- MOBILE SECTION PICKER (Eliminates horizontal pill overflow) -->
          <div class="md:hidden p-3 border-b border-white/10 bg-surface-raised/40 shrink-0">
            <label for="mobile-settings-section-picker" class="sr-only">Settings Category</label>
            <div class="relative">
              <select
                id="mobile-settings-section-picker"
                data-action="select-mobile-settings-tab"
                class="w-full bg-surface-base border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white appearance-none cursor-pointer focus:outline-none focus:border-[var(--color-accent,#e59b3c)]"
              >
                ${mobileOptionsHTML}
              </select>
              <div class="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-slate-400">▾</div>
            </div>
          </div>

          <!-- BODY: DESKTOP TWO-COLUMN / SCROLLABLE WITH STABLE GUTTER -->
          <div class="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
            <!-- DESKTOP LEFT COLUMN -->
            <nav
              id="settings-nav-column"
              class="hidden md:flex md:flex-col w-64 shrink-0 bg-surface-raised/30 border-r border-white/10 p-3 md:p-4 gap-1.5 overflow-y-auto"
              style="scrollbar-gutter: stable; max-height: 100%;"
              aria-label="Settings categories"
              tabindex="0"
            >
              ${tabsHTML}
            </nav>

            <!-- RIGHT CONTENT AREA -->
            <main class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-surface-base/50 min-h-0" id="settings-tab-content">
              ${contentHTML}
            </main>
          </div>

          <!-- FOOTER: REAL-TIME PERSISTENCE STATUS & SAVE & CLOSE BUTTON -->
          <div class="px-6 py-3.5 border-t border-white/10 bg-surface-raised/60 flex items-center justify-between shrink-0">
            <div class="flex items-center space-x-2 text-xs text-slate-400 font-mono">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="hidden sm:inline">Settings saved automatically</span>
              <span class="sm:hidden">Auto-saved</span>
            </div>
            <div class="flex items-center space-x-3">
              <button
                type="button"
                id="btn-settings-save-done" data-action="close-settings"
                class="px-5 py-2 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <span>✓</span>
                <span>${t('common.save', undefined, 'Save & Close')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generates the dedicated full-stage Settings workspace layout.
   */
  public renderDedicatedWorkspace(): string {
    const activeTab = this.activeTab;
    const tabsHTML = SETTINGS_CANONICAL_SECTIONS.map((sec) => {
      const isSelected = activeTab === sec.id;
      const label = t(`settings.${sec.id}Title`, undefined, sec.label);
      const desc = t(`settings.${sec.id}Desc`, undefined, sec.description);
      return `
        <button
          type="button"
          data-settings-tab="${sec.id}" data-action="set-settings-tab"
          class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-left text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap md:whitespace-normal w-full group ${
            isSelected
              ? 'bg-[var(--color-accent,#e59b3c)]/15 text-[var(--color-accent,#e59b3c)] border border-[var(--color-accent,#e59b3c)]/30 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }"
        >
          <span class="text-base md:text-lg shrink-0 group-hover:scale-110 transition-transform">${sec.icon}</span>
          <div class="min-w-0 flex-1">
            <div class="truncate ${isSelected ? 'text-[var(--color-accent,#e59b3c)] font-semibold' : 'text-slate-200'}">${label}</div>
            <div class="text-[11px] text-slate-400 truncate hidden md:block">${desc}</div>
          </div>
        </button>
      `;
    }).join('');

    const mobileOptionsHTML = SETTINGS_CANONICAL_SECTIONS.map((sec) => {
      const isSelected = activeTab === sec.id;
      return `<option value="${sec.id}" ${isSelected ? 'selected' : ''}>${sec.icon} ${sec.label}</option>`;
    }).join('');

    const contentHTML = this.renderTabContent(activeTab);

    return `
      <div class="flex-1 flex flex-col overflow-hidden bg-canvas">
        <header class="view-header">
          <div>
            <h1>Settings</h1>
            <p>Preferences, appearance, and account options</p>
          </div>
        </header>
        <div class="md:hidden p-3 border-b border-white/10 bg-surface-raised/40 shrink-0">
          <select
            id="mobile-settings-section-picker"
            data-action="select-mobile-settings-tab"
            class="w-full bg-surface-base border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white appearance-none cursor-pointer focus:outline-none focus:border-[var(--color-accent,#e59b3c)]"
          >
            ${mobileOptionsHTML}
          </select>
        </div>
        <div class="flex-1 flex flex-col md:flex-row overflow-hidden max-w-6xl w-full mx-auto p-4 md:p-6 gap-6 min-h-0">
          <nav id="settings-nav-column" class="hidden md:flex md:flex-col w-64 shrink-0 space-y-1 overflow-y-auto" style="scrollbar-gutter: stable; max-height: 100%;" aria-label="Settings categories">
            ${tabsHTML}
          </nav>
          <main class="flex-1 bg-surface-base border border-white/5 rounded-2xl p-6 overflow-y-auto shadow-sm min-h-0">
            ${contentHTML}
          </main>
        </div>
      </div>
    `;
  }

  private renderTabContent(tab: SettingsTab): string {
    switch (tab) {
      case 'account':
        return this.renderAccountTab();
      case 'security':
        return this.renderSecurityTab();
      case 'privacy':
        return this.renderPrivacyTab();
      case 'notifications':
        return this.renderNotificationsTab();
      case 'appearance':
        return this.renderAppearanceTab();
      case 'messages':
      case 'messaging':
        return this.renderMessagesTab();
      case 'network':
      case 'preferences':
        return this.renderPreferencesTab();
      case 'storage':
      case 'footprint':
        return sovereignFootprint.renderFootprintSectionHTML();
      case 'data':
      case 'backup':
        return renderExportPanelHTML();
      case 'advanced':
      case 'telemetry':
        return localDiagnostics.renderDiagnosticsSectionHTML();
      default:
        return this.renderAppearanceTab();
    }
  }

  private renderAccountTab(): string {
    const fp = clientStore.keypair?.fingerprint || '';
    const myProfile = profileView.getProfile(fp);
    const name = myProfile?.name || 'You';
    const handle = `@${fp.substring(0, 8)}`;
    return `
      <div class="space-y-6">
        <div class="border-b border-white/5 pb-4">
          <h2 class="text-base font-bold text-white flex items-center space-x-2">
            <span>👤</span>
            <span>Account</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Profile information, username, and account identity</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-2">
            <div class="text-[11px] text-slate-400">Display Name</div>
            <div class="text-sm font-bold text-white">${name}</div>
            <div class="text-[11px] text-[var(--color-accent,#e59b3c)] font-mono">${handle}</div>
          </div>
          <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-2">
            <div class="text-[11px] text-slate-400">Edit Profile</div>
            <button type="button" data-action="open-edit-profile" class="px-3.5 py-1.5 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold text-xs transition-all cursor-pointer">Edit Profile</button>
          </div>
        </div>
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-2 text-xs">
          <div class="text-[11px] text-slate-400">Public Key Fingerprint</div>
          <div class="font-mono text-[11px] text-emerald-400 break-all select-all bg-black/40 p-2.5 rounded-xl border border-white/5">${fp}</div>
        </div>
      </div>
    `;
  }

  private renderSecurityTab(): string {
    const wa = typeof window !== 'undefined' ? (window as any).webAuthnManager : null;
    const creds: any[] = wa?.registeredCredentials || [];
    const mnemonic = clientStore?.mnemonic || '';

    const passkeysListHtml = creds.length === 0
      ? `<div class="p-3.5 rounded-xl bg-surface-base/60 border border-white/5 text-xs text-slate-400">
           No device passkeys registered yet. Add a passkey below to enable instant hardware authentication on this device.
         </div>`
      : creds.map((c: any) => {
          const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          }) : 'Recently registered';
          return `
            <div class="p-3.5 rounded-xl bg-surface-base border border-white/5 flex items-center justify-between gap-3">
              <div class="space-y-0.5 min-w-0">
                <div class="text-xs font-bold text-white flex items-center gap-2">
                  <span>🔑</span>
                  <span class="truncate">${escapeHtml(c.deviceName || 'Device Passkey')}</span>
                  <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
                </div>
                <div class="text-[11px] text-slate-400">Registered: ${dateStr}</div>
              </div>
              <button
                type="button"
                data-action="remove-passkey"
                data-credential-id="${escapeHtml(c.id)}"
                class="px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 text-slate-400 border border-white/10 text-xs font-medium transition-all cursor-pointer shrink-0"
              >
                Remove
              </button>
            </div>
          `;
        }).join('');

    return `
      <div class="space-y-6">
        <div class="border-b border-white/5 pb-4">
          <h2 class="text-base font-bold text-white flex items-center space-x-2">
            <span>🔑</span>
            <span>Security &amp; Passkeys</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Device authentication, cryptographic keys, and master recovery options</p>
        </div>

        <!-- SECTION 1: PASSKEYS -->
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="space-y-1">
              <div class="text-xs font-bold text-white flex items-center gap-2">
                <span>Passkeys</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">FIDO2 / WebAuthn</span>
              </div>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                Secure access to this identity using a device passkey (Windows Hello, Touch ID, Face ID, or security keys).
              </p>
            </div>
            <button
              type="button"
              id="btn-settings-register-passkey"
              data-action="register-passkey"
              class="px-4 py-2 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
            >
              <span>+</span>
              <span>Add Passkey</span>
            </button>
          </div>

          <!-- Existing Passkeys List -->
          <div class="space-y-2 pt-2 border-t border-white/5">
            <div class="text-[11px] font-semibold text-slate-300">Registered passkeys on this device</div>
            ${passkeysListHtml}
          </div>

          <!-- Technical Details Disclosure -->
          <details class="p-3 rounded-xl bg-surface-base/50 border border-white/5 text-[11px] text-slate-400">
            <summary class="cursor-pointer font-medium text-slate-300 hover:text-white select-none">Technical details</summary>
            <div class="mt-2.5 space-y-1 font-mono text-[10px] text-slate-400">
              <div>• Standard: FIDO2 / WebAuthn Level 3 (W3C)</div>
              <div>• Cryptography: P-256 ECDSA (ES256 w/ SHA-256)</div>
              <div>• Edge Registry: Cloudflare D1 Authoritative (webauthn_credentials)</div>
              <div>• Verification: User Presence (UP) &amp; Preferred Biometrics (UV)</div>
              <div>• Anti-Replay: Monotonic Sign Counter CAS &amp; Challenge Expiry</div>
            </div>
          </details>
        </div>

        <!-- SECTION 2: RECOVERY PHRASE -->
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-bold text-white">Recovery Phrase</div>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                Your 12-word recovery phrase is the master root of your sovereign identity. Use it to restore your identity on any device.
              </p>
            </div>
            <button
              type="button"
              id="btn-settings-toggle-seed"
              data-action="settings-toggle-seed"
              class="px-3.5 py-1.5 rounded-xl bg-surface-base hover:bg-surface-overlay text-slate-300 border border-white/10 text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              Reveal recovery phrase
            </button>
          </div>

          <div
            id="settings-seed-display"
            class="p-3 bg-black/50 border border-white/5 rounded-xl font-mono text-xs text-amber-400 select-all blur-sm transition-all duration-200 break-words"
            autocomplete="off"
            spellcheck="false"
          >
            ${escapeHtml(mnemonic || 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')}
          </div>

          <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 leading-relaxed">
            <span class="font-bold">Important Security Notice:</span> Anyone with this recovery phrase has complete control of this identity. Passkeys provide fast hardware unlock on this device, but do <strong>not</strong> replace your recovery phrase. Keep your recovery phrase written down in a safe offline location.
          </div>
        </div>
      </div>
    `;
  }

  private renderPrivacyTab(): string {
    const isSimple = clientStore.isSimpleMode();
    return `
      <div class="space-y-6">
        <div class="border-b border-white/5 pb-4">
          <h2 class="text-base font-bold text-white flex items-center space-x-2">
            <span>🛡️</span>
            <span>Privacy</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Control interface complexity and privacy protection</p>
        </div>
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 flex items-center justify-between">
          <div class="space-y-1">
            <div class="text-xs font-bold text-white">Interface Mode</div>
            <p class="text-[11px] text-slate-400">Choose between simple, focused browsing or full advanced tools.</p>
          </div>
          <button type="button" data-action="toggle-ui-mode" class="px-4 py-2 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold text-xs transition-all cursor-pointer">${isSimple ? 'Switch to Advanced Mode' : 'Switch to Simple Mode'}</button>
        </div>
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-2">
          <div class="text-xs font-bold text-white">On-Device Privacy</div>
          <p class="text-[11px] text-slate-400 leading-relaxed">UREfy does not track you. No advertising cookies, no third-party trackers, and no telemetry selling.</p>
        </div>
      </div>
    `;
  }

  private renderNotificationsTab(): string {
    return `
      <div class="space-y-6">
        <div class="border-b border-white/5 pb-4">
          <h2 class="text-base font-bold text-white flex items-center space-x-2">
            <span>🔔</span>
            <span>Notifications</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Manage how and when you receive updates</p>
        </div>
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 flex items-center justify-between">
          <div class="space-y-1">
            <div class="text-xs font-bold text-white">Push Notifications</div>
            <p class="text-[11px] text-slate-400">Receive private direct messages and mentions when UREfy is not in focus.</p>
          </div>
          <button type="button" id="btn-settings-toggle-push" data-action="settings-toggle-push" class="px-4 py-2 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold text-xs transition-all cursor-pointer">Configure Push</button>
        </div>
      </div>
    `;
  }

  private renderMessagesTab(): string {
    const readReceipts = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('urefy_msg_read_receipts') !== 'false')
      : true;

    const dmPermission = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('urefy_msg_dm_permission') || 'shared')
      : 'shared';

    const notifyLevel = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('urefy_msg_notify_level') || 'mentions')
      : 'mentions';

    const richPreviews = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('urefy_msg_rich_previews') !== 'false')
      : true;

    return `
      <div class="space-y-6">
        <div class="border-b border-white/5 pb-4">
          <h2 class="text-base font-bold text-white flex items-center space-x-2">
            <span>💬</span>
            <span>Messages &amp; Direct Communication</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">End-to-end encrypted messaging, delivery receipts, and communication privacy</p>
        </div>

        <!-- E2EE STATUS CARD -->
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-base">🔒</span>
              <span class="text-xs font-bold text-white">End-to-End Encryption (E2EE)</span>
            </div>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
              ACTIVE · ML-KEM-768 (FIPS 203) + X25519
            </span>
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed">
            All 1-on-1 direct messages are sealed with Hybrid post-quantum E2EE — ML-KEM-768 (FIPS 203) + X25519, HKDF-SHA256 key derivation, and authenticated AES-256-GCM. Outgoing envelopes are signed with sovereign Ed25519 keys. Relay community channels use authenticated envelopes. Encrypted Vault notes use local zero-knowledge AES-256-GCM decoupled from transport.
          </p>
        </div>

        <!-- READ RECEIPTS -->
        <label class="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-white/5 cursor-pointer hover:bg-surface-overlay transition-colors">
          <div class="space-y-0.5 pr-4">
            <span class="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>👁️</span>
              <span>Send Read Receipts</span>
            </span>
            <p class="text-[11px] text-slate-400">
              Let conversation contacts know when you have viewed their direct messages.
            </p>
          </div>
          <input
            type="checkbox"
            id="toggle-msg-read-receipts"
            ${readReceipts ? 'checked' : ''}
            class="w-4 h-4 rounded text-[var(--color-accent,#e59b3c)] focus:ring-0 cursor-pointer accent-[var(--color-accent,#e59b3c)]"
          />
        </label>

        <!-- DM PERMISSIONS -->
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-3">
          <div class="space-y-0.5">
            <span class="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Direct Message Requests Permission</span>
            </span>
            <p class="text-[11px] text-slate-400">
              Determine who is permitted to send you direct message invitations.
            </p>
          </div>
          <select
            id="select-msg-dm-permission"
            class="w-full bg-surface-base border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white cursor-pointer focus:outline-none focus:border-[var(--color-accent,#e59b3c)] font-medium"
          >
            <option value="everyone" ${dmPermission === 'everyone' ? 'selected' : ''}>Everyone — Any sovereign identity can send you a message</option>
            <option value="shared" ${dmPermission === 'shared' ? 'selected' : ''}>Shared Communities — Only peers sharing at least one community</option>
            <option value="following" ${dmPermission === 'following' ? 'selected' : ''}>People I Follow — Only identities you have followed</option>
            <option value="nobody" ${dmPermission === 'nobody' ? 'selected' : ''}>Nobody — Disallow incoming direct message requests</option>
          </select>
        </div>

        <!-- NOTIFICATION LEVEL -->
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-3">
          <div class="space-y-0.5">
            <span class="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>🔔</span>
              <span>Message Notifications Level</span>
            </span>
            <p class="text-[11px] text-slate-400">
              Control which incoming messages trigger sound and desktop/push alerts.
            </p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label class="p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${notifyLevel === 'all' ? 'bg-[var(--color-accent,#e59b3c)]/15 border-[var(--color-accent,#e59b3c)] text-white' : 'bg-surface-base border-white/5 text-slate-300'}">
              <input type="radio" name="msg-notify-level" value="all" ${notifyLevel === 'all' ? 'checked' : ''} class="accent-[var(--color-accent,#e59b3c)]" />
              <div class="text-xs font-medium">All Messages</div>
            </label>
            <label class="p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${notifyLevel === 'mentions' ? 'bg-[var(--color-accent,#e59b3c)]/15 border-[var(--color-accent,#e59b3c)] text-white' : 'bg-surface-base border-white/5 text-slate-300'}">
              <input type="radio" name="msg-notify-level" value="mentions" ${notifyLevel === 'mentions' ? 'checked' : ''} class="accent-[var(--color-accent,#e59b3c)]" />
              <div class="text-xs font-medium">Mentions &amp; DMs</div>
            </label>
            <label class="p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${notifyLevel === 'muted' ? 'bg-[var(--color-accent,#e59b3c)]/15 border-[var(--color-accent,#e59b3c)] text-white' : 'bg-surface-base border-white/5 text-slate-300'}">
              <input type="radio" name="msg-notify-level" value="muted" ${notifyLevel === 'muted' ? 'checked' : ''} class="accent-[var(--color-accent,#e59b3c)]" />
              <div class="text-xs font-medium">Muted</div>
            </label>
          </div>
        </div>

        <!-- RICH LINK PREVIEWS -->
        <label class="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-white/5 cursor-pointer hover:bg-surface-overlay transition-colors">
          <div class="space-y-0.5 pr-4">
            <span class="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>🖼️</span>
              <span>Rich Media Previews</span>
            </span>
            <p class="text-[11px] text-slate-400">
              Automatically render inline media and rich shared post cards inside conversations.
            </p>
          </div>
          <input
            type="checkbox"
            id="toggle-msg-rich-previews"
            ${richPreviews ? 'checked' : ''}
            class="w-4 h-4 rounded text-[var(--color-accent,#e59b3c)] focus:ring-0 cursor-pointer accent-[var(--color-accent,#e59b3c)]"
          />
        </label>

        <!-- VAULT INTEGRATION NOTE -->
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-2">
          <div class="flex items-center space-x-2">
            <span class="text-base">💾</span>
            <span class="text-xs font-bold text-white">Encrypted Vault Preservation</span>
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed">
            Messages saved to your Vault via the message hover action or context menu are cryptographically stored as zero-knowledge AES-256-GCM private notes on your local device. They are never transmitted unencrypted.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Renders the Appearance (Teme & Aspect) tab content.
   */
  private renderAppearanceTab(): string {
    const currentThemeId = (typeof window !== 'undefined' && (window as any).themeEngine?.currentThemeId)
      ? (window as any).themeEngine.currentThemeId
      : (themeEngine.currentThemeId || 'obsidian-cyber');

    const currentFont = (typeof window !== 'undefined' && (window as any).themeEngine?.fontFamily)
      ? (window as any).themeEngine.fontFamily
      : (themeEngine.fontFamily || 'sans');

    const isOledActive = currentThemeId === 'matrix-monolith';

    const themesList = (THEMES && THEMES.length > 0) ? THEMES : [
      { id: 'obsidian-cyber', name: 'Obsidian Cyber', emoji: '🌌', accentColor: '#00e5ff', description: 'Deep obsidian nocturnal blue' },
      { id: 'matrix-monolith', name: 'Matrix Monolith', emoji: '🌲', accentColor: '#22c55e', description: 'Pure OLED black' },
      { id: 'tokyo-neon', name: 'Tokyo Neon', emoji: '🌆', accentColor: '#f43f5e', description: 'Cyberpunk nocturnal violet' },
      { id: 'solar-amber', name: 'Solar Amber', emoji: '🌅', accentColor: '#f59e0b', description: 'Warm charcoal & solar amber' },
      { id: 'alabaster-light', name: 'Alabaster Light', emoji: '☀️', accentColor: '#c27803', description: 'Warm daylight off-white mode' },
      { id: 'nordic-frost', name: 'Nordic Frost', emoji: '❄️', accentColor: '#38bdf8', description: 'Arctic blue & glacial frost' },
    ];

    const themeCardsHTML = themesList.map((t) => {
      const isSelected = currentThemeId === t.id;
      return `
        <button
          type="button"
          id="theme-card-${t.id}" data-action="set-settings-theme" data-theme-id="${t.id}"
          class="p-3.5 rounded-2xl border text-left flex flex-col justify-between space-y-2 transition-all cursor-pointer group ${
            isSelected
              ? 'bg-[var(--color-accent,#e59b3c)]/15 border-[var(--color-accent,#e59b3c)] ring-2 ring-[var(--color-accent,#e59b3c)]/40 shadow-lg'
              : 'bg-surface-raised/70 hover:bg-surface-overlay border-white/5 hover:border-white/20'
          }"
        >
          <div class="flex items-center justify-between">
            <span class="text-xl group-hover:scale-110 transition-transform">${t.emoji}</span>
            <span class="w-3 h-3 rounded-full border border-white/20" style="background-color: ${t.accentColor};"></span>
          </div>
          <div>
            <div class="text-xs font-bold text-white group-hover:text-slate-200 transition-colors">${t.name}</div>
            <div class="text-[10px] text-slate-400 line-clamp-1">${t.description || ''}</div>
          </div>
          ${isSelected ? '<span class="text-[9px] font-mono font-bold text-[var(--color-accent,#e59b3c)] uppercase tracking-wider">✓ Active</span>' : ''}
        </button>
      `;
    }).join('');

    return `
      <div id="settings-appearance-section" class="space-y-6">
        <!-- HEADER -->
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <span>🎨</span>
              <span>Appearance &amp; Themes</span>
            </h3>
            <p class="text-xs text-slate-400">Customize the color palette, OLED display mode, and interface typography.</p>
          </div>
        </div>

        <!-- THEME SWITCHER -->
        <div class="space-y-3">
          <label class="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
            <span class="text-cyan-400">◆</span>
            <span>Preset Color Palettes (Theme Switcher)</span>
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3" id="settings-theme-switcher">
            ${themeCardsHTML}
          </div>
        </div>

        <!-- OLED MODE TOGGLE -->
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 flex items-center justify-between">
          <div class="space-y-0.5 pr-4">
            <span class="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>🌑</span>
              <span>Pure OLED Black Mode (#000000)</span>
            </span>
            <p class="text-[11px] text-slate-400">
              Enables pure absolute black background for maximum OLED battery savings and crisp contrast.
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              id="toggle-oled-mode"
              ${isOledActive ? 'checked' : ''} data-change="call-global" data-raw-change="if(window.themeEngine) { window.themeEngine.setTheme(this.checked ? 'matrix-monolith' : 'obsidian-cyber'); } if(window.settingsView) { window.settingsView.setActiveTab('appearance'); }"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-surface-base peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <!-- FONT FAMILY TOGGLE -->
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>🔤</span>
              <span>System Typography (Font Family)</span>
            </span>
            <span class="text-[11px] font-mono text-cyan-300 uppercase">${currentFont}</span>
          </div>
          <!-- Hidden input for programmatic/form testing -->
          <input
            type="checkbox"
            id="toggle-font-family"
            ${currentFont === 'mono' ? 'checked' : ''} data-change="call-global" data-raw-change="if(window.themeEngine) { window.themeEngine.setFontFamily(this.checked ? 'mono' : 'sans'); } if(window.settingsView) { window.settingsView.setActiveTab('appearance'); }"
            class="sr-only"
          />
          <div class="grid grid-cols-2 gap-3" id="settings-font-family-controls">
            <button
              type="button"
              id="btn-font-sans" data-action="call-global" data-raw-click="if(window.themeEngine) { window.themeEngine.setFontFamily('sans'); } if(window.settingsView) { window.settingsView.setActiveTab('appearance'); }"
              class="p-3.5 rounded-xl border text-left flex items-center space-x-3 transition-all cursor-pointer ${
                currentFont === 'sans'
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 shadow-md font-semibold'
                  : 'bg-surface-base/80 border-white/5 text-slate-400 hover:text-white hover:bg-surface-overlay'
              }"
            >
              <span class="text-xl">🔤</span>
              <div>
                <div class="text-xs font-bold font-sans">Sans-Serif (Modern)</div>
                <div class="text-[10px] text-slate-400 font-sans">Inter UI / Segoe UI / Roboto</div>
              </div>
            </button>

            <button
              type="button"
              id="btn-font-mono" data-action="call-global" data-raw-click="if(window.themeEngine) { window.themeEngine.setFontFamily('mono'); } if(window.settingsView) { window.settingsView.setActiveTab('appearance'); }"
              class="p-3.5 rounded-xl border text-left flex items-center space-x-3 transition-all cursor-pointer ${
                currentFont === 'mono'
                  ? 'bg-[var(--color-accent,#e59b3c)]/15 border-[var(--color-accent,#e59b3c)] text-[var(--color-accent,#e59b3c)] shadow-md font-semibold'
                  : 'bg-surface-base/80 border-white/5 text-slate-400 hover:text-white hover:bg-surface-overlay'
              }"
            >
              <span class="text-xl">💻</span>
              <div>
                <div class="text-xs font-bold font-mono">Monospace (Terminal)</div>
                <div class="text-[10px] text-slate-400 font-mono">JetBrains Mono / Terminal</div>
              </div>
            </button>
          </div>
        </div>

        <!-- CUSTOM THEME STUDIO LAUNCHER -->
        <div class="p-5 rounded-2xl bg-surface-raised border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <span class="text-xs font-bold text-white flex items-center gap-1.5">
              <span>🎨</span>
              <span>Custom Theme Studio &amp; Live Palette</span>
            </span>
            <p class="text-[11px] text-slate-300 leading-relaxed">
              Design your own custom sovereign theme, select hex accents, live preview components, and export JSON.
            </p>
          </div>
          <button
            type="button"
            id="btn-settings-open-theme-builder" data-action="open-feature" data-feature="custom-theme"
            class="shrink-0 px-5 py-2.5 rounded-xl bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer active:scale-95"
            title="Open Custom Theme Studio"
          >
            <span>⚡</span>
            <span>Open Theme Studio</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renders the Preferences (Network & WoT) tab content.
   */
  private renderPreferencesTab(): string {
    const showTrustBadges = typeof window !== 'undefined'
      ? ((window as any).clientStore?.showTrustBadges !== false)
      : (clientStore?.showTrustBadges !== false);

    const demoteLowTrust = typeof window !== 'undefined'
      ? Boolean((window as any).clientStore?.demoteLowTrustPosts)
      : Boolean(clientStore?.demoteLowTrustPosts);

    const meritThreshold = typeof window !== 'undefined'
      ? ((window as any).clientStore?.minFeedTrustThreshold ?? 50)
      : (clientStore?.minFeedTrustThreshold ?? 50);

    const proactiveAi = typeof window !== 'undefined'
      ? ((window as any).clientStore?.proactiveAiEnabled !== false)
      : (clientStore?.proactiveAiEnabled !== false);

    const isZenActive = typeof window !== 'undefined'
      ? Boolean((window as any).zenModeManager?.isZenActive)
      : Boolean(zenModeManager?.isZenActive);

    return `
      <div id="settings-preferences-section" class="space-y-6">
        <!-- HEADER -->
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <span>⚙️</span>
              <span>${t('settings.preferencesTitle', undefined, 'Network')}</span>
            </h3>
            <p class="text-xs text-slate-400">${t('settings.preferencesDesc', undefined, 'Configure cryptographic attestations, feed filtering thresholds, and network preferences.')}</p>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            NETWORK &amp; WOT
          </span>
        </div>

        <div class="space-y-4">
          <!-- 1. WOT BADGES TOGGLE -->
          <label class="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-white/5 cursor-pointer hover:bg-surface-overlay transition-colors">
            <div class="space-y-0.5 pr-4">
              <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>🛡️</span>
                <span>${t('settings.wotBadge', undefined, 'Web-of-Trust Badges')}</span>
              </span>
              <p class="text-[11px] text-slate-400">
                Display cryptographic trust level and ZK-Human attestation path next to author handles.
              </p>
            </div>
            <input
              type="checkbox"
              id="toggle-wot-badges"
              ${showTrustBadges ? 'checked' : ''} data-change="call-global" data-raw-change="if(window.clientStore) { window.clientStore.setShowTrustBadges(this.checked); }"
              class="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
            />
          </label>

          <!-- 2. DEMOTE LOW TRUST TOGGLE -->
          <label class="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-white/5 cursor-pointer hover:bg-surface-overlay transition-colors">
            <div class="space-y-0.5 pr-4">
              <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>📉</span>
                <span>${t('settings.demoteLowTrust', undefined, 'Demote Low-Trust Content')}</span>
              </span>
              <p class="text-[11px] text-slate-400">
                Automatically deprioritizes posts from unverified or low-trust nodes to the end of the feed.
              </p>
            </div>
            <input
              type="checkbox"
              id="toggle-demote-low-trust"
              ${demoteLowTrust ? 'checked' : ''} data-change="call-global" data-raw-change="if(window.clientStore) { window.clientStore.setDemoteLowTrustPosts(this.checked); }"
              class="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
            />
          </label>

          <!-- 3. MERIT THRESHOLD SLIDER -->
          <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>⭐</span>
                <span>${t('settings.meritThreshold', undefined, 'Minimum Merit Threshold')}</span>
              </span>
              <span class="text-xs font-mono font-bold text-cyan-300 px-2.5 py-0.5 rounded bg-surface-base border border-cyan-500/30">
                <span id="merit-threshold-value">${meritThreshold}</span> Merit
              </span>
            </div>
            <p class="text-[11px] text-slate-400">
              Hides publications from the primary feed if their cumulative merit score falls below this value.
            </p>
            <input
              type="range"
              id="slider-merit-threshold"
              min="0"
              max="500"
              step="10"
              value="${meritThreshold}" data-input="call-global" data-raw-input="const el = document.getElementById('merit-threshold-value'); if(el) el.textContent = this.value; if(window.clientStore) window.clientStore.setMinFeedTrustThreshold(parseInt(this.value, 10))"
              class="w-full h-2 bg-surface-base rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div class="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0 (All)</span>
              <span>50 (Default)</span>
              <span>200 (High Filter)</span>
              <span>500 (Archon Only)</span>
            </div>
          </div>

          <!-- 4. PROACTIVE AI TOGGLE -->
          <label class="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-white/5 cursor-pointer hover:bg-surface-overlay transition-colors">
            <div class="space-y-0.5 pr-4">
              <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>🤖</span>
                <span>${t('settings.proactiveAi', undefined, 'Proactive On-Device AI Assistant')}</span>
              </span>
              <p class="text-[11px] text-slate-400">
                Allows local zero-telemetry AI to suggest context, security warnings, and summaries.
              </p>
            </div>
            <input
              type="checkbox"
              id="toggle-proactive-ai"
              ${proactiveAi ? 'checked' : ''} data-change="call-global" data-raw-change="if(window.clientStore) { window.clientStore.setProactiveAiEnabled(this.checked); }"
              class="w-4 h-4 rounded text-cyan-500 focus:ring-0 cursor-pointer accent-cyan-500"
            />
          </label>

          <!-- 5. ZEN MODE TOGGLE -->
          <label class="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-white/5 cursor-pointer hover:bg-surface-overlay transition-colors">
            <div class="space-y-0.5 pr-4">
              <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>🧘</span>
                <span>${t('settings.zenMode', undefined, 'Zen Mode / Immersive Focus')}</span>
              </span>
              <p class="text-[11px] text-slate-400">
                Hides side rails and maximizes feed reading area for a distraction-free experience.
              </p>
            </div>
            <input
              type="checkbox"
              id="toggle-zen-mode"
              ${isZenActive ? 'checked' : ''} data-change="call-global" data-raw-change="if(window.zenModeManager) { window.zenModeManager.setZenMode(this.checked); }"
              class="w-4 h-4 rounded text-purple-500 focus:ring-0 cursor-pointer accent-purple-500"
            />
          </label>

          <!-- 6. LANGUAGE & RTL PICKER -->
          <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-3" id="settings-language-picker-container">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>🌐</span>
                <span>${t('settings.languageTitle', undefined, 'Language & Regional Localization')}</span>
              </span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
                ${i18n.getCurrentLanguageMeta().code} · ${i18n.getCurrentLanguageMeta().direction.toUpperCase()}
              </span>
            </div>
            <p class="text-[11px] text-slate-400">
              ${t('settings.languageDesc', undefined, 'Seamless zero-reload dynamic localization across 7 languages. RTL layout adjusts automatically.')}
            </p>
            ${i18n.renderLanguagePicker('inline')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attaches interactive DOM listeners to ensure 100% responsiveness in browser contexts.
   */
  public attachEventListeners(root: HTMLElement | Document = document): void {
    if (typeof window === 'undefined') return;

    // Auto-scroll active category button into view
    const activeTabBtn = root.querySelector(`[data-settings-tab="${this.activeTab}"]`) as HTMLElement | null;
    if (activeTabBtn) {
      activeTabBtn.scrollIntoView({ block: 'nearest' });
    }

    // Mobile Section Picker
    const mobilePicker = root.querySelector('#mobile-settings-section-picker') as HTMLSelectElement | null;
    if (mobilePicker) {
      mobilePicker.addEventListener('change', () => {
        const targetTab = mobilePicker.value as SettingsTab;
        if (targetTab) {
          this.setActiveTab(targetTab);
        }
      });
    }

    // Keyboard navigation in nav column
    const navColumn = root.querySelector('#settings-nav-column');
    if (navColumn) {
      navColumn.addEventListener('keydown', (e: any) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const currentIndex = SETTINGS_CANONICAL_SECTIONS.findIndex(s => s.id === this.activeTab);
          if (currentIndex === -1) return;
          const delta = e.key === 'ArrowDown' ? 1 : -1;
          const nextIndex = (currentIndex + delta + SETTINGS_CANONICAL_SECTIONS.length) % SETTINGS_CANONICAL_SECTIONS.length;
          const nextTab = SETTINGS_CANONICAL_SECTIONS[nextIndex].id;
          this.setActiveTab(nextTab);
          const nextBtn = root.querySelector(`[data-settings-tab="${nextTab}"]`) as HTMLElement | null;
          if (nextBtn) nextBtn.focus();
        }
      });
    }

    // Tab buttons
    const tabButtons = root.querySelectorAll('[data-settings-tab]');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = (e.currentTarget as HTMLElement).getAttribute('data-settings-tab') as SettingsTab;
        if (targetTab) {
          this.setActiveTab(targetTab);
        }
      });
    });

    // Close and Save buttons
    const closeBtn = root.querySelector('#btn-close-settings-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    const saveDoneBtn = root.querySelector('#btn-settings-save-done');
    if (saveDoneBtn) {
      saveDoneBtn.addEventListener('click', () => this.close());
    }

    // Backdrop click: only close if clicking directly on backdrop
    const backdrop = root.querySelector('#settings-modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.close();
        }
      });
    }

    // Theme cards
    const themeCards = root.querySelectorAll('[data-theme-id]');
    themeCards.forEach(card => {
      card.addEventListener('click', () => {
        const themeId = card.getAttribute('data-theme-id');
        if (themeId) {
          if ((window as any).__aetheris_apply_theme) {
            (window as any).__aetheris_apply_theme(themeId);
          } else if ((window as any).themeEngine) {
            (window as any).themeEngine.setTheme(themeId);
          }
          this.setActiveTab('appearance');
        }
      });
    });

    // Font family buttons
    const fontSans = root.querySelector('#btn-font-sans');
    if (fontSans) {
      fontSans.addEventListener('click', () => {
        if ((window as any).themeEngine) (window as any).themeEngine.setFontFamily('sans');
        this.setActiveTab('appearance');
      });
    }
    const fontMono = root.querySelector('#btn-font-mono');
    if (fontMono) {
      fontMono.addEventListener('click', () => {
        if ((window as any).themeEngine) (window as any).themeEngine.setFontFamily('mono');
        this.setActiveTab('appearance');
      });
    }

    // OLED toggle
    const oledToggle = root.querySelector('#toggle-oled-mode') as HTMLInputElement | null;
    if (oledToggle) {
      oledToggle.addEventListener('change', () => {
        const theme = oledToggle.checked ? 'matrix-monolith' : 'obsidian-cyber';
        if ((window as any).themeEngine) {
          (window as any).themeEngine.setTheme(theme);
        }
        this.setActiveTab('appearance');
      });
    }

    // Preferences toggles
    const wotBadgesToggle = root.querySelector('#toggle-wot-badges') as HTMLInputElement | null;
    if (wotBadgesToggle) {
      wotBadgesToggle.addEventListener('change', () => {
        if ((window as any).clientStore) {
          (window as any).clientStore.setShowTrustBadges(wotBadgesToggle.checked);
        }
      });
    }

    const demoteToggle = root.querySelector('#toggle-demote-low-trust') as HTMLInputElement | null;
    if (demoteToggle) {
      demoteToggle.addEventListener('change', () => {
        if ((window as any).clientStore) {
          (window as any).clientStore.setDemoteLowTrustPosts(demoteToggle.checked);
        }
      });
    }

    const meritSlider = root.querySelector('#slider-merit-threshold') as HTMLInputElement | null;
    const meritVal = root.querySelector('#merit-threshold-value');
    if (meritSlider) {
      meritSlider.addEventListener('input', () => {
        if (meritVal) meritVal.textContent = meritSlider.value;
        if ((window as any).clientStore) {
          (window as any).clientStore.setMinFeedTrustThreshold(parseInt(meritSlider.value, 10));
        }
      });
    }

    const proactiveAiToggle = root.querySelector('#toggle-proactive-ai') as HTMLInputElement | null;
    if (proactiveAiToggle) {
      proactiveAiToggle.addEventListener('change', () => {
        if ((window as any).clientStore) {
          (window as any).clientStore.setProactiveAiEnabled(proactiveAiToggle.checked);
        }
      });
    }

    const zenToggle = root.querySelector('#toggle-zen-mode') as HTMLInputElement | null;
    if (zenToggle) {
      zenToggle.addEventListener('change', () => {
        if ((window as any).zenModeManager) {
          (window as any).zenModeManager.setZenMode(zenToggle.checked);
        }
      });
    }

    // Custom Theme Builder button
    const themeBuilderBtn = root.querySelector('#btn-settings-open-theme-builder');
    if (themeBuilderBtn) {
      themeBuilderBtn.addEventListener('click', () => {
        if ((window as any).customThemeBuilder) {
          (window as any).customThemeBuilder.openModal();
        }
      });
    }

    // Backup tab listeners delegation
    if (this.activeTab === 'backup') {
      import('./export-backup.js')
        .then(({ exportBackup }) => {
          exportBackup.attachEventListeners(root);
        })
        .catch(() => {});
    }

    // Language picker buttons
    const langBtns = root.querySelectorAll('[data-action="select-lang"]');
    langBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = (e.currentTarget as HTMLElement).getAttribute('data-lang');
        if (code) {
          i18n.setLanguage(code as any);
          if (typeof window !== 'undefined' && (window as any).clientStore) {
            (window as any).clientStore.notifySync();
          }
          this.setActiveTab(this.activeTab);
        }
      });
    });

    // Messages tab preferences
    const msgReceiptsToggle = root.querySelector('#toggle-msg-read-receipts') as HTMLInputElement | null;
    if (msgReceiptsToggle) {
      msgReceiptsToggle.addEventListener('change', () => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('urefy_msg_read_receipts', String(msgReceiptsToggle.checked));
        }
        if (typeof window !== 'undefined' && (window as any).clientStore) {
          (window as any).clientStore.showToast('Read receipts updated', 'info');
        }
      });
    }

    const dmPermSelect = root.querySelector('#select-msg-dm-permission') as HTMLSelectElement | null;
    if (dmPermSelect) {
      dmPermSelect.addEventListener('change', () => {
        const val = dmPermSelect.value as any;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('urefy_msg_dm_permission', val);
        }
        if (typeof window !== 'undefined' && (window as any).__aetherisDM?.setDMPermission) {
          void (window as any).__aetherisDM.setDMPermission(val).catch(() => {});
        }
        if (typeof window !== 'undefined' && (window as any).clientStore) {
          (window as any).clientStore.showToast('Direct message permission updated', 'info');
        }
      });
    }

    const notifyRadios = root.querySelectorAll('input[name="msg-notify-level"]') as NodeListOf<HTMLInputElement>;
    notifyRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked && typeof localStorage !== 'undefined') {
          localStorage.setItem('urefy_msg_notify_level', radio.value);
        }
        if (typeof window !== 'undefined' && (window as any).clientStore) {
          (window as any).clientStore.showToast('Notification preference saved', 'info');
        }
      });
    });

    const richPreviewsToggle = root.querySelector('#toggle-msg-rich-previews') as HTMLInputElement | null;
    if (richPreviewsToggle) {
      richPreviewsToggle.addEventListener('change', () => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('urefy_msg_rich_previews', String(richPreviewsToggle.checked));
        }
        if (typeof window !== 'undefined' && (window as any).clientStore) {
          (window as any).clientStore.showToast('Media preview preference saved', 'info');
        }
      });
    }
  }
}

// ─── SINGLETON EXPORT & SERVICE REGISTRATION ──────────────────────────────────

export const settingsView = new SettingsView();
serviceRegistry.registerInstance(SERVICES.SettingsView, settingsView);
