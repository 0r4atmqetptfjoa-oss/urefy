/**
 * @file settings-view.ts
 * @package @aetheris/client-ui
 * @description Sovereign Unified Settings Engine for Aetheris Omni-Sphere.
 * Provides a responsive obsidian-styled modal dialog unifying:
 * 1. Appearance (Teme & Aspect) - Theme switcher, OLED black mode, font family, Custom Theme Studio launcher.
 * 2. Preferences (Preferințe Rețea & WoT) - Web-of-Trust badges, demote low trust, merit threshold, proactive AI, zen mode.
 * 3. Footprint (Amprentă & Resurse) - Audits storage, bundle size, zero trackers, and network efficiency.
 * 4. Backup (Salvare & Export Cont) - Encrypted AES-256-GCM backup, restore, and JSON export.
 * 5. Telemetry (Diagnostic & Confidențialitate) - 100% on-device error logs and memory zeroization.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { sovereignFootprint } from './settings-footprint.js';
import { exportBackup } from './export-backup.js';
import { localDiagnostics } from './local-diagnostics.js';
import { themeEngine, THEMES } from './themes.js';
import { clientStore } from './client-state.js';
import { zenModeManager } from './zen-mode.js';

// ─── INTERFACES & DEFINITIONS ──────────────────────────────────────────────────

export type SettingsTab = 'appearance' | 'preferences' | 'footprint' | 'backup' | 'telemetry';

export interface SettingsSectionDefinition {
  id: SettingsTab;
  label: string;
  icon: string;
  description: string;
}

export const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
  {
    id: 'appearance',
    label: 'Teme & Aspect',
    icon: '🎨',
    description: 'Palete de culori, modul OLED și tipografie',
  },
  {
    id: 'preferences',
    label: 'Preferințe Rețea & WoT',
    icon: '⚙️',
    description: 'Insigne Web-of-Trust, praguri de merit și asistent AI',
  },
  {
    id: 'footprint',
    label: 'Amprentă & Resurse',
    icon: '📊',
    description: 'Audit stocare locală, trackeri zero și eficiență',
  },
  {
    id: 'backup',
    label: 'Salvare & Export Cont',
    icon: '💾',
    description: 'Copii de rezervă criptate și restaurare date',
  },
  {
    id: 'telemetry',
    label: 'Diagnostic & Confidențialitate',
    icon: '🛡️',
    description: 'Jurnal local de erori și zeroizare memorie',
  },
];

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
    if (initialTab && SETTINGS_SECTIONS.some(s => s.id === initialTab)) {
      this.activeTab = initialTab;
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
    if (!SETTINGS_SECTIONS.some(s => s.id === tab)) return;
    this.activeTab = tab;

    if (this.isOpen && typeof document !== 'undefined') {
      const container = document.getElementById(this.MODAL_CONTAINER_ID);
      if (container) {
        container.innerHTML = this.renderSettingsModal();
        this.attachEventListeners(container);
      }
    }

    if (typeof window !== 'undefined' && clientStore) {
      try {
        clientStore.notify('SETTINGS_TAB_CHANGED', { tab });
      } catch (_) {}
    }
  }

  /**
   * Generates the complete HTML string for the responsive settings modal.
   */
  public renderSettingsModal(): string {
    const tabsHTML = SETTINGS_SECTIONS.map((sec) => {
      const isSelected = this.activeTab === sec.id;
      return `
        <button
          type="button"
          data-settings-tab="${sec.id}"
          onclick="if(window.settingsView) window.settingsView.setActiveTab('${sec.id}');"
          class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-left text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap md:whitespace-normal w-full group ${
            isSelected
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-[0_0_12px_rgba(0,229,255,0.15)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }"
        >
          <span class="text-base md:text-lg shrink-0 group-hover:scale-110 transition-transform">${sec.icon}</span>
          <div class="hidden sm:block min-w-0 flex-1">
            <div class="truncate ${isSelected ? 'text-cyan-200 font-semibold' : 'text-slate-300'}">${sec.label}</div>
            <div class="text-[10px] text-slate-500 truncate hidden md:block">${sec.description}</div>
          </div>
        </button>
      `;
    }).join('');

    let contentHTML = '';
    switch (this.activeTab) {
      case 'appearance':
        contentHTML = this.renderAppearanceTab();
        break;
      case 'preferences':
        contentHTML = this.renderPreferencesTab();
        break;
      case 'footprint':
        contentHTML = sovereignFootprint.renderFootprintSectionHTML();
        break;
      case 'backup':
        contentHTML = exportBackup.renderExportPanel();
        break;
      case 'telemetry':
        contentHTML = localDiagnostics.renderDiagnosticsSectionHTML();
        break;
      default:
        contentHTML = this.renderAppearanceTab();
        break;
    }

    return `
      <div
        id="settings-modal-backdrop"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
        onclick="if(event.target.id==='settings-modal-backdrop') { if(window.__aetheris_close_settings) window.__aetheris_close_settings(); }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <div
          id="unified-settings-modal"
          class="relative w-full max-w-5xl h-[90vh] max-h-[850px] bg-surface-base border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans backdrop-blur-xl animate-in zoom-in-95 duration-200"
          onclick="event.stopPropagation()"
        >
          <!-- HEADER -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-surface-raised/40">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-lg shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                ⚙️
              </div>
              <div>
                <h2 id="settings-modal-title" class="text-lg md:text-xl font-bold text-white tracking-wide flex items-center gap-2">
                  <span>⚙️ Setări Suverane (Settings)</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">SOVEREIGN CORE</span>
                </h2>
                <p class="text-xs text-slate-400">Control total, zero telemetrie terță și autonomie completă pe dispozitiv</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-settings-modal"
              onclick="if(window.__aetheris_close_settings) window.__aetheris_close_settings();"
              class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-sm font-mono flex items-center justify-center"
              title="Închide Setări"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          <!-- BODY: TWO COLUMNS (desktop) / COLUMN WITH TOP TABS (mobile) -->
          <div class="flex flex-col md:flex-row flex-1 overflow-hidden">
            <!-- LEFT COLUMN / TOP BAR TABS -->
            <nav class="w-full md:w-64 shrink-0 bg-surface-raised/30 border-b md:border-b-0 md:border-r border-white/10 p-3 md:p-4 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto no-scrollbar">
              ${tabsHTML}
            </nav>

            <!-- RIGHT CONTENT AREA -->
            <main class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-surface-base/50" id="settings-tab-content">
              ${contentHTML}
            </main>
          </div>
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
      { id: 'alabaster-light', name: 'Alabaster Light', emoji: '☀️', accentColor: '#4f46e5', description: 'Daylight clean light mode' },
      { id: 'nordic-frost', name: 'Nordic Frost', emoji: '❄️', accentColor: '#38bdf8', description: 'Arctic blue & glacial frost' },
    ];

    const themeCardsHTML = themesList.map((t) => {
      const isSelected = currentThemeId === t.id;
      return `
        <button
          type="button"
          id="theme-card-${t.id}"
          onclick="if(window.__aetheris_apply_theme) { window.__aetheris_apply_theme('${t.id}'); } else if(window.themeEngine) { window.themeEngine.setTheme('${t.id}'); } if(window.settingsView) { window.settingsView.setActiveTab('appearance'); }"
          class="p-3.5 rounded-2xl border text-left flex flex-col justify-between space-y-2 transition-all cursor-pointer group ${
            isSelected
              ? 'bg-cyan-500/15 border-cyan-400 ring-2 ring-cyan-500/40 shadow-lg'
              : 'bg-surface-raised/70 hover:bg-surface-overlay border-white/5 hover:border-white/20'
          }"
        >
          <div class="flex items-center justify-between">
            <span class="text-xl group-hover:scale-110 transition-transform">${t.emoji}</span>
            <span class="w-3 h-3 rounded-full border border-white/20" style="background-color: ${t.accentColor};"></span>
          </div>
          <div>
            <div class="text-xs font-bold text-white group-hover:text-cyan-200 transition-colors">${t.name}</div>
            <div class="text-[10px] text-slate-400 line-clamp-1">${t.description || ''}</div>
          </div>
          ${isSelected ? '<span class="text-[9px] font-mono font-bold text-cyan-300 uppercase tracking-wider">✓ Activ</span>' : ''}
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
              <span>Teme &amp; Aspect Suveran</span>
            </h3>
            <p class="text-xs text-slate-400">Personalizează paleta de culori, afișajul OLED și tipografia interfeței.</p>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            SOVEREIGN UI
          </span>
        </div>

        <!-- THEME SWITCHER -->
        <div class="space-y-3">
          <label class="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
            <span class="text-cyan-400">◆</span>
            <span>Palete de Culori Predefinite (Theme Switcher)</span>
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
              <span>Mod Pure OLED Black (#000000)</span>
            </span>
            <p class="text-[11px] text-slate-400">
              Activează fundalul negru absolut pentru conservare maximă a bateriei pe ecrane OLED și contrast optimizat.
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              id="toggle-oled-mode"
              ${isOledActive ? 'checked' : ''}
              onchange="if(window.themeEngine) { window.themeEngine.setTheme(this.checked ? 'matrix-monolith' : 'obsidian-cyber'); } if(window.settingsView) { window.settingsView.setActiveTab('appearance'); }"
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
              <span>Tipografie Sistem (Font Family)</span>
            </span>
            <span class="text-[11px] font-mono text-cyan-300 uppercase">${currentFont}</span>
          </div>
          <!-- Hidden input for programmatic/form testing -->
          <input
            type="checkbox"
            id="toggle-font-family"
            ${currentFont === 'mono' ? 'checked' : ''}
            onchange="if(window.themeEngine) { window.themeEngine.setFontFamily(this.checked ? 'mono' : 'sans'); } if(window.settingsView) { window.settingsView.setActiveTab('appearance'); }"
            class="sr-only"
          />
          <div class="grid grid-cols-2 gap-3" id="settings-font-family-controls">
            <button
              type="button"
              id="btn-font-sans"
              onclick="if(window.themeEngine) { window.themeEngine.setFontFamily('sans'); } if(window.settingsView) { window.settingsView.setActiveTab('appearance'); }"
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
              id="btn-font-mono"
              onclick="if(window.themeEngine) { window.themeEngine.setFontFamily('mono'); } if(window.settingsView) { window.settingsView.setActiveTab('appearance'); }"
              class="p-3.5 rounded-xl border text-left flex items-center space-x-3 transition-all cursor-pointer ${
                currentFont === 'mono'
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 shadow-md font-semibold'
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
        <div class="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-purple-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <span class="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
              <span>🎨</span>
              <span>Custom Theme Studio &amp; Paletă Live</span>
            </span>
            <p class="text-[11px] text-slate-300 leading-relaxed">
              Creează propria temă vizuală personalizată, alege culorile hexazecimale de accent, previzualizează componentele și exportă JSON.
            </p>
          </div>
          <button
            type="button"
            id="btn-settings-open-theme-builder"
            onclick="if(window.customThemeBuilder) window.customThemeBuilder.openModal();"
            class="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer active:scale-95"
            title="Deschide Custom Theme Studio"
          >
            <span>⚡</span>
            <span>Deschide Theme Studio</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renders the Preferences (Preferințe Rețea & WoT) tab content.
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
              <span>Preferințe Rețea &amp; Web-of-Trust</span>
            </h3>
            <p class="text-xs text-slate-400">Configurează regulile de atestare criptografică, filtrarea fluxului și asistentul AI.</p>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            WOT &amp; AI GOVERNANCE
          </span>
        </div>

        <div class="space-y-4">
          <!-- 1. WOT BADGES TOGGLE -->
          <label class="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-white/5 cursor-pointer hover:bg-surface-overlay transition-colors">
            <div class="space-y-0.5 pr-4">
              <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Insigne Web-of-Trust (WoT Badges)</span>
              </span>
              <p class="text-[11px] text-slate-400">
                Afișează nivelul de încredere criptografic și calea de atestare ZK-Human lângă numele autorilor.
              </p>
            </div>
            <input
              type="checkbox"
              id="toggle-wot-badges"
              ${showTrustBadges ? 'checked' : ''}
              onchange="if(window.clientStore) window.clientStore.setShowTrustBadges(this.checked);"
              class="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
            />
          </label>

          <!-- 2. DEMOTE LOW TRUST TOGGLE -->
          <label class="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-white/5 cursor-pointer hover:bg-surface-overlay transition-colors">
            <div class="space-y-0.5 pr-4">
              <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>📉</span>
                <span>Retrogradare Conținut Low-Trust</span>
              </span>
              <p class="text-[11px] text-slate-400">
                Deplasează automat la sfârșitul fluxului postările venite de la noduri neverificate sau cu flux de încredere scăzut.
              </p>
            </div>
            <input
              type="checkbox"
              id="toggle-demote-low-trust"
              ${demoteLowTrust ? 'checked' : ''}
              onchange="if(window.clientStore) window.clientStore.setDemoteLowTrustPosts(this.checked);"
              class="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
            />
          </label>

          <!-- 3. MERIT THRESHOLD SLIDER -->
          <div class="p-4 rounded-2xl bg-surface-raised border border-white/5 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>⭐</span>
                <span>Prag Minim de Merit (Score Threshold)</span>
              </span>
              <span class="text-xs font-mono font-bold text-cyan-300 px-2.5 py-0.5 rounded bg-surface-base border border-cyan-500/30">
                <span id="merit-threshold-value">${meritThreshold}</span> Merit
              </span>
            </div>
            <p class="text-[11px] text-slate-400">
              Filtrează din fluxul principal publicațiile care au un scor de merit cumulat sub această valoare.
            </p>
            <input
              type="range"
              id="slider-merit-threshold"
              min="0"
              max="500"
              step="10"
              value="${meritThreshold}"
              oninput="const el = document.getElementById('merit-threshold-value'); if(el) el.textContent = this.value; if(window.clientStore) window.clientStore.setMinFeedTrustThreshold(parseInt(this.value, 10));"
              class="w-full h-2 bg-surface-base rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div class="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0 (Toate)</span>
              <span>50 (Standard)</span>
              <span>200 (Filtru Înalt)</span>
              <span>500 (Numai Archon)</span>
            </div>
          </div>

          <!-- 4. PROACTIVE AI TOGGLE -->
          <label class="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-white/5 cursor-pointer hover:bg-surface-overlay transition-colors">
            <div class="space-y-0.5 pr-4">
              <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>🤖</span>
                <span>Asistent AI Proactiv Local (On-Device)</span>
              </span>
              <p class="text-[11px] text-slate-400">
                Permite asistentului AI local să ofere sugestii proactive, avertismente de securitate și sumarizări fără date externe.
              </p>
            </div>
            <input
              type="checkbox"
              id="toggle-proactive-ai"
              ${proactiveAi ? 'checked' : ''}
              onchange="if(window.clientStore) window.clientStore.setProactiveAiEnabled(this.checked);"
              class="w-4 h-4 rounded text-cyan-500 focus:ring-0 cursor-pointer accent-cyan-500"
            />
          </label>

          <!-- 5. ZEN MODE TOGGLE -->
          <label class="flex items-center justify-between p-4 rounded-2xl bg-surface-raised border border-white/5 cursor-pointer hover:bg-surface-overlay transition-colors">
            <div class="space-y-0.5 pr-4">
              <span class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>🧘</span>
                <span>Mod Zen / Concentrare Imersivă</span>
              </span>
              <p class="text-[11px] text-slate-400">
                Ascunde panourile laterale și maximizează lizibilitatea fluxului de lectură pentru o experiență minimalistă.
              </p>
            </div>
            <input
              type="checkbox"
              id="toggle-zen-mode"
              ${isZenActive ? 'checked' : ''}
              onchange="if(window.zenModeManager) window.zenModeManager.toggle();"
              class="w-4 h-4 rounded text-purple-500 focus:ring-0 cursor-pointer accent-purple-500"
            />
          </label>
        </div>
      </div>
    `;
  }

  /**
   * Attaches interactive DOM listeners to ensure 100% responsiveness in browser contexts.
   */
  public attachEventListeners(root: HTMLElement | Document = document): void {
    if (typeof window === 'undefined') return;

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

    // Close button
    const closeBtn = root.querySelector('#btn-close-settings-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
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
      try {
        exportBackup.attachEventListeners(root);
      } catch (_) {}
    }
  }
}

// ─── SINGLETON EXPORT & SERVICE REGISTRATION ──────────────────────────────────

export const settingsView = new SettingsView();
serviceRegistry.registerInstance(SERVICES.SettingsView, settingsView);
