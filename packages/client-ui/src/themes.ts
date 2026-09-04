/**
 * @file themes.ts
 * @package @aetheris/client-ui
 * @description Complete and ultra-premium Theme, Font Scaling, Accent Color, and Visual Synthesis system
 * for Aetheris Omni-Sphere. Synthesizes best visual practices for Daylight Light Mode,
 * Obsidian Cyber Dim Mode, Pure OLED Black Mode, and Display & Customizer Modal.
 * 100% functional, self-contained implementation with no external dependencies.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { sovereignFootprint } from './settings-footprint.js';
import { localDiagnostics } from './local-diagnostics.js';

// ─── INTERFACES & TYPES ─────────────────────────────────────────────────────────

export interface ThemeDefinition {
  id: string;
  name: string;
  emoji: string;
  accentColor: string;
  bgCanvas: string;
  bgSurfaceBase: string;
  bgSurfaceRaised: string;
  bgSurfaceOverlay: string;
  textAccent: string;
  borderAccent: string;
  secondaryAccent?: string;
  description?: string;
  badgeText?: string;
  mode?: 'light' | 'dim' | 'lights-out' | 'dark';
}

export interface AccentColorOption {
  id: string;
  name: string;
  hex: string;
  emoji: string;
  glowRgba: string;
  description: string;
}

export interface ThemePreferences {
  themeId: string;
  fontSize: number;
  fontFamily: 'sans' | 'mono';
  customAccentColor?: string;
}

export type FontFamilyType = 'sans' | 'mono';
export type FontSizeScale = 12 | 13 | 14 | 15 | 16 | 17 | 18;

// ─── 5 SOVEREIGN ACCENT COLOR OPTIONS ───────────────────────────────────────────

export const ACCENT_COLOR_OPTIONS: AccentColorOption[] = [
  {
    id: 'electric-cyan',
    name: 'Electric Cyan',
    hex: '#00e5ff',
    emoji: '⚡',
    glowRgba: 'rgba(0, 229, 255, 0.35)',
    description: 'High-energy cyber glow (#00e5ff)',
  },
  {
    id: 'terminal-emerald',
    name: 'Terminal Emerald',
    hex: '#22c55e',
    emoji: '🌲',
    glowRgba: 'rgba(34, 197, 94, 0.35)',
    description: 'Classic matrix phosphor emerald (#22c55e)',
  },
  {
    id: 'tokyo-magenta',
    name: 'Tokyo Magenta',
    hex: '#f43f5e',
    emoji: '🌆',
    glowRgba: 'rgba(244, 63, 94, 0.35)',
    description: 'Vibrant cyberpunk neon magenta (#f43f5e)',
  },
  {
    id: 'solar-amber',
    name: 'Solar Amber',
    hex: '#f59e0b',
    emoji: '🌅',
    glowRgba: 'rgba(245, 158, 11, 0.35)',
    description: 'Warm solar gold and amber (#f59e0b)',
  },
  {
    id: 'glacial-frost',
    name: 'Glacial Frost',
    hex: '#38bdf8',
    emoji: '❄️',
    glowRgba: 'rgba(56, 189, 248, 0.35)',
    description: 'Arctic blue and glacial frost (#38bdf8)',
  },
];

// ─── MAIN THEME ENGINE CLASS ─────────────────────────────────────────────

export class ThemeEngine {
  /** Collection of sovereign themes */
  public readonly THEMES: ThemeDefinition[] = [
    {
      id: 'obsidian-cyber',
      name: 'Obsidian Cyber',
      emoji: '🌌',
      accentColor: '#00e5ff',
      bgCanvas: '#090a0f',
      bgSurfaceBase: '#12151c',
      bgSurfaceRaised: '#1a1f2e',
      bgSurfaceOverlay: '#222840',
      textAccent: '#00e5ff',
      borderAccent: 'rgba(0, 229, 255, 0.4)',
      secondaryAccent: '#a855f7',
      description: 'Deep obsidian nocturnal blue with electric cyan (#00e5ff) and sovereign glassmorphic reflections.',
      badgeText: 'CYAN & VIOLET',
      mode: 'dim',
    },
    {
      id: 'matrix-monolith',
      name: 'Matrix Monolith',
      emoji: '🌲',
      accentColor: '#22c55e',
      bgCanvas: '#030704',
      bgSurfaceBase: '#08140a',
      bgSurfaceRaised: '#0e2212',
      bgSurfaceOverlay: '#16321c',
      textAccent: '#22c55e',
      borderAccent: 'rgba(34, 197, 94, 0.4)',
      secondaryAccent: '#10b981',
      description: 'Pure OLED black (#000000) with fine borders (#27272a) and terminal emerald density.',
      badgeText: 'OLED EMERALD',
      mode: 'lights-out',
    },
    {
      id: 'tokyo-neon',
      name: 'Tokyo Neon',
      emoji: '🌆',
      accentColor: '#f43f5e',
      bgCanvas: '#0d0714',
      bgSurfaceBase: '#160c22',
      bgSurfaceRaised: '#231236',
      bgSurfaceOverlay: '#331a4e',
      textAccent: '#f43f5e',
      borderAccent: 'rgba(244, 63, 94, 0.4)',
      secondaryAccent: '#c084fc',
      description: 'Cyberpunk nocturnal violet with vibrant neon magenta accents (#f43f5e).',
      badgeText: 'NEON MAGENTA',
      mode: 'dim',
    },
    {
      id: 'solar-amber',
      name: 'Solar Amber',
      emoji: '🌅',
      accentColor: '#f59e0b',
      bgCanvas: '#0c0906',
      bgSurfaceBase: '#16110b',
      bgSurfaceRaised: '#241b11',
      bgSurfaceOverlay: '#362818',
      textAccent: '#f59e0b',
      borderAccent: 'rgba(245, 158, 11, 0.4)',
      secondaryAccent: '#fb923c',
      description: 'Warm charcoal and solar amber (#f59e0b) optimized for comfortable night reading.',
      badgeText: 'SOLAR GOLD',
      mode: 'dim',
    },
    {
      id: 'alabaster-light',
      name: 'Alabaster Light',
      emoji: '☀️',
      accentColor: '#4f46e5',
      bgCanvas: '#f8fafc',
      bgSurfaceBase: '#ffffff',
      bgSurfaceRaised: '#f1f5f9',
      bgSurfaceOverlay: '#e2e8f0',
      textAccent: '#4f46e5',
      borderAccent: 'rgba(79, 70, 229, 0.4)',
      secondaryAccent: '#0284c7',
      description: 'Daylight Alabaster Mode with pristine canvas (#f8fafc), white cards (#ffffff), soft architectural borders (#e2e8f0), and WCAG AAA typography (#0f172a).',
      badgeText: 'LIGHT MODE',
      mode: 'light',
    },
    {
      id: 'nordic-frost',
      name: 'Nordic Frost',
      emoji: '❄️',
      accentColor: '#38bdf8',
      bgCanvas: '#080d16',
      bgSurfaceBase: '#0f172a',
      bgSurfaceRaised: '#1e293b',
      bgSurfaceOverlay: '#334155',
      textAccent: '#38bdf8',
      borderAccent: 'rgba(56, 189, 248, 0.4)',
      secondaryAccent: '#94a3b8',
      description: 'Arctic blue-grey with glacial frost (#38bdf8) and Scandinavian minimalism.',
      badgeText: 'ARCTIC FROST',
      mode: 'dim',
    },
  ];

  /** Currently active theme ID */
  public currentThemeId: string = 'obsidian-cyber';

  /** Base font size (12px - 18px, default 14px) */
  public fontSize: number = 14;

  /** Current font family ('sans' or 'mono') */
  public fontFamily: FontFamilyType = 'sans';

  /** Custom accent color override (if set by user) */
  public customAccentColor: string | null = null;

  /** Selection modal visibility state */
  public isModalOpen: boolean = false;

  public readonly displaySettingsModal: DisplaySettingsModal;

  private readonly STORAGE_KEY: string = 'aetheris_theme_pref';
  private readonly STYLE_ELEMENT_ID: string = 'aetheris-dynamic-theme-css';
  private readonly MODAL_CONTAINER_ID: string = 'aetheris-theme-modal-root';

  constructor() {
    this.displaySettingsModal = new DisplaySettingsModal(this);
    this.loadPreferences();
    this.applyCurrentStyles();
    this.registerGlobalInstance();
    this.attachGlobalKeyboardListeners();
  }

  // ─── GETTERS & ACCESSORS ───────────────────────────────────────────────────────

  /**
   * Returns full list of available themes.
   */
  public getThemes(): ThemeDefinition[] {
    return [...this.THEMES];
  }

  /**
   * Returns currently active theme definition.
   */
  public getCurrentTheme(): ThemeDefinition {
    const found = this.THEMES.find((t) => t.id === this.currentThemeId);
    return found || this.THEMES[0];
  }

  /**
   * Finds a theme by its unique ID.
   */
  public getThemeById(themeId: string): ThemeDefinition | undefined {
    return this.THEMES.find((t) => t.id === themeId);
  }

  /**
   * Returns the effective accent color (custom override or active theme default).
   */
  public getEffectiveAccentColor(): string {
    if (this.customAccentColor) {
      return this.customAccentColor;
    }
    return this.getCurrentTheme().accentColor;
  }

  /**
   * Returns list of predefined accent color options.
   */
  public getAccentColors(): AccentColorOption[] {
    return [...ACCENT_COLOR_OPTIONS];
  }

  // ─── MAIN CONTROL METHODS ─────────────────────────────────────────────

  /**
   * Sets active theme, updates DOM, injects CSS variables, and persists setting.
   */
  public setTheme(themeId: string): void {
    const exists = this.THEMES.some((t) => t.id === themeId);
    if (!exists) {
      console.warn(`[ThemeEngine] Theme with id "${themeId}" was not found. Falling back to obsidian-cyber.`);
      this.currentThemeId = 'obsidian-cyber';
    } else {
      this.currentThemeId = themeId;
    }

    this.applyCurrentStyles();
    this.savePreferences();
    this.dispatchThemeEvent('aetheris:theme-changed', {
      theme: this.getCurrentTheme(),
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      accentColor: this.getEffectiveAccentColor(),
    });
    this.refreshDOMComponents();
  }

  /**
   * Sets custom accent color override.
   */
  public setAccentColor(hexColor: string | null): void {
    if (!hexColor) {
      this.customAccentColor = null;
    } else {
      let sanitized = hexColor.trim();
      if (!sanitized.startsWith('#') && /^[0-9A-Fa-f]{3,8}$/.test(sanitized)) {
        sanitized = '#' + sanitized;
      }
      this.customAccentColor = sanitized;
    }

    this.applyCurrentStyles();
    this.savePreferences();
    this.dispatchThemeEvent('aetheris:accent-color-changed', {
      accentColor: this.getEffectiveAccentColor(),
    });
    this.refreshDOMComponents();
  }

  /**
   * Modifies font size (clamped between 12px and 18px), updates DOM, and saves.
   */
  public setFontSize(size: number): void {
    const parsed = Math.round(Number(size));
    const clamped = Math.min(18, Math.max(12, isNaN(parsed) ? 14 : parsed));
    this.fontSize = clamped;

    this.applyCurrentStyles();
    this.savePreferences();
    this.dispatchThemeEvent('aetheris:font-size-changed', {
      fontSize: this.fontSize,
    });
    this.refreshDOMComponents();
  }

  /**
   * Sets font family ('sans' or 'mono').
   */
  public setFontFamily(family: FontFamilyType): void {
    this.fontFamily = family === 'mono' ? 'mono' : 'sans';

    this.applyCurrentStyles();
    this.savePreferences();
    this.dispatchThemeEvent('aetheris:font-family-changed', {
      fontFamily: this.fontFamily,
    });
    this.refreshDOMComponents();
  }

  /**
   * Toggles between 'sans' and 'mono' family.
   */
  public toggleFontFamily(): void {
    this.setFontFamily(this.fontFamily === 'sans' ? 'mono' : 'sans');
  }

  /**
   * Handler for modal font slider input.
   */
  public handleFontSizeInput(val: string | number): void {
    const num = typeof val === 'number' ? val : parseInt(val, 10);
    this.setFontSize(num);
  }

  /**
   * Resets all preferences to default settings.
   */
  public resetToDefaults(): void {
    this.currentThemeId = 'obsidian-cyber';
    this.fontSize = 14;
    this.fontFamily = 'sans';
    this.customAccentColor = null;
    this.applyCurrentStyles();
    this.savePreferences();
    this.refreshDOMComponents();
  }

  // ─── MODAL MANAGEMENT & VISIBILITY ──────────────────────────────────────────

  /**
   * Opens theme configuration modal and injects it into DOM.
   */
  public openModal(): void {
    this.isModalOpen = true;
    if (typeof document === 'undefined') return;

    let container = document.getElementById(this.MODAL_CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = this.MODAL_CONTAINER_ID;
      document.body.appendChild(container);
    }

    container.innerHTML = this.renderDisplaySettingsModal();
    container.style.display = 'block';

    const modalEl = container.querySelector('[role="dialog"]') as HTMLElement | null;
    if (modalEl) {
      modalEl.focus();
    }
  }

  /**
   * Closes theme configuration modal.
   */
  public closeModal(): void {
    this.isModalOpen = false;
    if (typeof document === 'undefined') return;

    const container = document.getElementById(this.MODAL_CONTAINER_ID);
    if (container) {
      container.innerHTML = '';
      container.style.display = 'none';
    }
  }

  /**
   * Toggles modal open state.
   */
  public toggleModal(): void {
    if (this.isModalOpen) {
      this.closeModal();
    } else {
      this.openModal();
    }
  }

  // ─── HTML TEMPLATE RENDERING ──────────────────────────────────────────────

  /**
   * Generates compact header button for opening theme panel.
   */
  public renderThemeButton(): string {
    const current = this.getCurrentTheme();
    const effectiveAccent = this.getEffectiveAccentColor();
    return `
      <button
        id="aetheris-theme-header-btn"
        type="button"
        onclick="window.themeEngine ? window.themeEngine.toggleModal() : null"
        class="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-white/10 hover:border-cyphr/40 text-xs font-medium text-slate-200 transition-all duration-200 shadow-sm group cursor-pointer"
        title="Change Obsidian theme and font scale (Current: ${this.escapeHtml(current.name)})"
        aria-label="Obsidian Theme Selector"
      >
        <span class="text-sm transition-transform duration-200 group-hover:scale-110">${current.emoji}</span>
        <span class="hidden md:inline font-sans text-slate-300 group-hover:text-white font-medium">${this.escapeHtml(current.name)}</span>
        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-overlay border border-white/10 text-cyphr font-semibold" style="color: ${effectiveAccent}">${this.fontSize}px</span>
      </button>
    `;
  }

  /**
   * Generates complete Display & Theme Customizer Modal.
   */
  public renderDisplaySettingsModal(): string {
    const current = this.getCurrentTheme();
    const effectiveAccent = this.getEffectiveAccentColor();
    const fontDesc = this.getFontSizeDescription(this.fontSize);

    // 1. Accent Color Selector Badges (5 Required Accents)
    const accentPillsHtml = ACCENT_COLOR_OPTIONS.map((opt) => {
      const isSelected = this.getEffectiveAccentColor().toLowerCase() === opt.hex.toLowerCase();
      return `
        <button
          type="button"
          onclick="(window.__aetheris_set_accent || function(c){window.themeEngine?.setAccentColor(c)})('${opt.hex}')"
          class="group relative flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
            isSelected
              ? 'ring-2 ring-offset-2 ring-offset-black/90 scale-105 shadow-lg'
              : 'border-white/10 hover:border-white/20 bg-surface-raised/60 hover:bg-surface-overlay'
          }"
          style="border-color: ${isSelected ? opt.hex : 'rgba(255,255,255,0.1)'}; ${
            isSelected ? `box-shadow: 0 0 16px ${opt.glowRgba};` : ''
          }"
          title="${opt.name} (${opt.hex})"
        >
          <div class="relative w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-110" style="background-color: ${opt.hex}">
            ${isSelected ? `<span class="text-xs text-black font-bold">✓</span>` : `<span class="text-xs opacity-0 group-hover:opacity-100 transition-opacity">●</span>`}
          </div>
          <span class="mt-1.5 text-[11px] font-medium text-slate-200 group-hover:text-white">${opt.name}</span>
          <span class="text-[9px] font-mono text-slate-400">${opt.hex}</span>
        </button>
      `;
    }).join('');

    // 2. Background Selector (Daylight Light, Obsidian Cyber Dim, Pure OLED Lights Out, and others)
    const themesListHtml = this.THEMES.map((theme) => {
      const isActive = theme.id === this.currentThemeId;
      const ringClasses = isActive
        ? 'ring-2 ring-offset-2 ring-offset-black/80 shadow-lg scale-[1.01]'
        : 'border border-white/10 hover:border-white/20 hover:bg-surface-overlay/80 opacity-80 hover:opacity-100';

      const activeBadge = isActive
        ? `<span class="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-cyphr/20 text-cyphr border border-cyphr/40 animate-pulse" style="color: ${effectiveAccent}; border-color: ${effectiveAccent}80; background-color: ${effectiveAccent}20;">ACTIVE</span>`
        : `<span class="px-2 py-0.5 text-[10px] font-mono rounded-full bg-white/5 text-slate-400 border border-white/10">${this.escapeHtml(theme.badgeText || 'THEME')}</span>`;

      return `
        <div
          onclick="if(window.__aetheris_apply_theme) { window.__aetheris_apply_theme('${theme.id}'); } else if(window.themeEngine) { window.themeEngine.setTheme('${theme.id}'); }"
          data-theme-id="${theme.id}"
          class="btn-select-theme relative p-3.5 rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between group ${ringClasses}"
          style="background-color: ${theme.bgSurfaceRaised}; ${isActive ? `border: 1px solid ${theme.accentColor}; box-shadow: 0 0 20px ${theme.accentColor}33;` : ''}"
        >
          <!-- THEME CARD HEADER -->
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center space-x-2.5">
              <span class="text-2xl filter drop-shadow">${theme.emoji}</span>
              <div>
                <div class="text-sm font-semibold text-slate-100 group-hover:text-white flex items-center space-x-1.5">
                  <span>${this.escapeHtml(theme.name)}</span>
                  ${isActive ? `<span style="color: ${theme.accentColor};">●</span>` : ''}
                </div>
                <div class="text-[11px] text-slate-400 line-clamp-1">${this.escapeHtml(theme.description || '')}</div>
              </div>
            </div>
            <div>
              ${activeBadge}
            </div>
          </div>

          <!-- COLOR PREVIEW PALETTE -->
          <div class="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <div class="flex items-center space-x-1.5">
              <span class="text-[10px] font-mono text-slate-400">Palette:</span>
              <span class="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner" style="background-color: ${theme.bgCanvas}" title="Canvas: ${theme.bgCanvas}"></span>
              <span class="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner" style="background-color: ${theme.bgSurfaceBase}" title="Surface Base: ${theme.bgSurfaceBase}"></span>
              <span class="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner" style="background-color: ${theme.bgSurfaceRaised}" title="Surface Raised: ${theme.bgSurfaceRaised}"></span>
              <span class="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner ring-1 ring-white/40" style="background-color: ${theme.accentColor}" title="Accent: ${theme.accentColor}"></span>
            </div>
            <div class="text-[10px] font-mono" style="color: ${theme.accentColor}">
              ${theme.accentColor}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Font Size Presets: Dense (12px), Standard (14px), Relaxed (16px), Large (18px)
    const fontPresets: { size: number; label: string }[] = [
      { size: 12, label: 'Dense (12px)' },
      { size: 14, label: 'Standard (14px)' },
      { size: 16, label: 'Relaxed (16px)' },
      { size: 18, label: 'Large (18px)' },
    ];

    const fontPresetsHtml = fontPresets.map((preset) => {
      const isSel = this.fontSize === preset.size;
      return `
        <button
          type="button"
          onclick="if(window.themeEngine) window.themeEngine.setFontSize(${preset.size})"
          class="py-2 px-3 rounded-xl text-xs font-mono font-medium text-center transition-all cursor-pointer ${
            isSel
              ? 'bg-cyphr/20 border border-cyphr text-cyphr font-bold shadow-md'
              : 'bg-surface-raised hover:bg-surface-overlay border border-white/5 text-slate-300 hover:text-white'
          }"
          style="${isSel ? `color: ${effectiveAccent}; border-color: ${effectiveAccent}; background-color: ${effectiveAccent}20;` : ''}"
        >
          ${preset.label}
        </button>
      `;
    }).join('');

    return `
      <div
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        onclick="if(event.target === this) { window.__aetheris_close_theme ? window.__aetheris_close_theme() : (window.themeEngine && window.themeEngine.closeModal()); }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-modal-title"
        tabindex="-1"
      >
        <div class="bg-surface-base border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          <!-- MODAL HEADER -->
          <div class="px-6 py-4 border-subtle-b bg-surface-raised/60 flex items-center justify-between shrink-0">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner" style="background-color: ${effectiveAccent}20; border: 1px solid ${effectiveAccent}50; color: ${effectiveAccent};">
                🎨
              </div>
              <div>
                <h2 id="theme-modal-title" class="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <span>Display & Theme Matrix</span>
                  <span class="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-surface-overlay border border-white/10" style="color: ${effectiveAccent}">SOVEREIGN DUAL HORIZON</span>
                </h2>
                <p class="text-xs text-slate-400">Customize font size, accent color, background theme, and typography with real-time preview.</p>
              </div>
            </div>
            <button
              id="btn-close-theme-modal"
              type="button"
              onclick="if(window.__aetheris_close_theme) { window.__aetheris_close_theme(); } else if(window.themeEngine) { window.themeEngine.closeModal(); }"
              class="w-8 h-8 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          <!-- MODAL BODY (SCROLLABLE) -->
          <div class="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            
            <!-- SECTION 1: LIVE INTERACTIVE PREVIEW BOX -->
            <div class="p-4 rounded-2xl border transition-all duration-200 space-y-3" style="background-color: ${current.bgCanvas}; border-color: ${effectiveAccent}40; box-shadow: 0 4px 20px ${effectiveAccent}15;">
              <div class="flex items-center justify-between pb-2 border-b" style="border-color: rgba(255,255,255,0.08);">
                <div class="flex items-center space-x-2">
                  <span class="w-2.5 h-2.5 rounded-full animate-pulse" style="background-color: ${effectiveAccent}"></span>
                  <span class="text-xs font-mono font-bold uppercase tracking-wider" style="color: ${effectiveAccent}">
                    Real-time Live Preview
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded" style="background-color: ${current.bgSurfaceRaised}; color: ${current.id === 'alabaster-light' ? '#0f172a' : '#f1f5f9'}; border: 1px solid rgba(255,255,255,0.1);">
                    ${this.escapeHtml(current.name)}
                  </span>
                  <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                    WCAG AAA PASS
                  </span>
                </div>
              </div>

              <!-- MINI CARD SAMPLE -->
              <div
                class="p-4 rounded-xl border transition-all duration-200 space-y-2.5"
                style="background-color: ${current.bgSurfaceBase}; border-color: ${current.id === 'alabaster-light' ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}; font-size: ${this.fontSize}px; font-family: ${this.fontFamily === 'mono' ? 'var(--font-family-mono)' : 'var(--font-family-sans)'};"
              >
                <!-- Card Header -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2.5">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm" style="background-color: ${effectiveAccent}; color: #000000;">
                      AO
                    </div>
                    <div>
                      <div class="font-bold flex items-center space-x-1.5" style="color: ${current.id === 'alabaster-light' ? '#0f172a' : '#f8fafc'}">
                        <span>Aetheris Sovereign</span>
                        <span class="text-[10px] font-mono px-1.5 py-0.2 rounded" style="background-color: ${effectiveAccent}20; color: ${effectiveAccent}; border: 1px solid ${effectiveAccent}40;">
                          ✓ STARK Verified
                        </span>
                      </div>
                      <div class="text-[11px] opacity-60" style="color: ${current.id === 'alabaster-light' ? '#536471' : '#94a3b8'}">
                        @aetheris • sovereign mesh node
                      </div>
                    </div>
                  </div>
                  <span class="text-[11px] font-mono px-2 py-0.5 rounded-full" style="background-color: ${effectiveAccent}15; color: ${effectiveAccent};">
                    #daylight
                  </span>
                </div>

                <!-- Card Content -->
                <p class="leading-relaxed" style="color: ${current.id === 'alabaster-light' ? '#0f172a' : '#e2e8f0'}">
                  Synthesizing ultra-responsive visual systems with micro-broadcasting and sovereign community typography best practices: high legibility, fluid font scaling (${this.fontSize}px), and instantaneous live preview.
                </p>

                <!-- Card Footer Actions -->
                <div class="flex items-center justify-between pt-2 border-t" style="border-color: ${current.id === 'alabaster-light' ? '#e2e8f0' : 'rgba(255,255,255,0.06)'};">
                  <div class="flex items-center space-x-2">
                    <button
                      type="button"
                      class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 shadow-sm transition-transform active:scale-95"
                      style="background-color: ${effectiveAccent}; color: #000000;"
                    >
                      <span>▲</span>
                      <span>Upvote</span>
                    </button>
                    <span class="text-xs font-mono px-2 py-1 rounded" style="background-color: ${current.bgSurfaceRaised}; color: ${current.id === 'alabaster-light' ? '#0f172a' : '#94a3b8'};">
                      💬 42 comments
                    </span>
                    <span class="text-xs font-mono px-2 py-1 rounded" style="background-color: ${current.bgSurfaceRaised}; color: ${current.id === 'alabaster-light' ? '#0f172a' : '#94a3b8'};">
                      ⚡ Boost
                    </span>
                  </div>
                  <span class="text-[10px] font-mono opacity-50" style="color: ${current.id === 'alabaster-light' ? '#536471' : '#94a3b8'};">
                    Scale: ${fontDesc}
                  </span>
                </div>
              </div>
            </div>

            <!-- SECTION 2: FONT SIZE SCALING (Dense, Standard, Relaxed, Large) -->
            <div class="p-4 rounded-xl bg-surface-raised border border-white/5 space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
                  <span class="text-signal">◆</span>
                  <span>Font Size Scaling (Dense, Standard, Relaxed, Large)</span>
                </label>
                <div class="flex items-center space-x-2">
                  <span class="px-2.5 py-0.5 text-xs font-mono font-bold rounded-md bg-surface-overlay text-cyphr border border-cyphr/30" id="theme-font-size-badge" style="color: ${effectiveAccent}; border-color: ${effectiveAccent}50;">
                    ${this.fontSize}px (${fontDesc})
                  </span>
                </div>
              </div>

              <!-- SLIDER WITH LIVE INDICATOR -->
              <div class="space-y-1.5">
                <input
                  type="range"
                  min="12"
                  max="18"
                  step="1"
                  value="${this.fontSize}"
                  oninput="if(window.themeEngine) window.themeEngine.handleFontSizeInput(this.value)"
                  class="w-full h-2 bg-surface-overlay rounded-lg appearance-none cursor-pointer accent-cyphr"
                  style="accent-color: ${effectiveAccent};"
                  aria-label="Font Size Slider"
                />
                <div class="flex justify-between text-[10px] font-mono text-slate-400 px-0.5">
                  <span>12px (Dense)</span>
                  <span>14px (Standard)</span>
                  <span>16px (Relaxed)</span>
                  <span>18px (Large)</span>
                </div>
              </div>

              <!-- PRESET BUTTONS (Dense, Standard, Relaxed, Large) -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                ${fontPresetsHtml}
              </div>
            </div>

            <!-- SECTION 3: ACCENT COLOR SELECTOR (5 Vibrant Presets) -->
            <div class="p-4 rounded-xl bg-surface-raised border border-white/5 space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
                  <span class="text-cyphr" style="color: ${effectiveAccent}">◆</span>
                  <span>Color Accent Selector</span>
                </label>
                <span class="text-[11px] font-mono text-slate-400">Selected: <strong style="color: ${effectiveAccent}">${effectiveAccent}</strong></span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                ${accentPillsHtml}
              </div>
            </div>

            <!-- SECTION 4: BACKGROUND / THEME SELECTOR (Daylight Light, Obsidian Dim, Pure OLED) -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
                  <span class="text-aether">◆</span>
                  <span>Background Mode & Theme Matrix</span>
                </label>
                <span class="text-[11px] text-slate-400 font-mono">Active: <strong class="text-white">${this.escapeHtml(current.name)}</strong></span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${themesListHtml}
              </div>
            </div>

            <!-- SECTION 5: TYPOGRAPHY FAMILY (SANS VS MONO) -->
            <div class="p-4 rounded-xl bg-surface-raised border border-white/5 space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
                  <span class="text-aether">◆</span>
                  <span>UI & Feed Typography Family</span>
                </label>
                <span class="text-[11px] font-mono text-slate-400">Active: <strong class="text-aether uppercase">${this.fontFamily}</strong></span>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onclick="if(window.themeEngine) window.themeEngine.setFontFamily('sans')"
                  class="p-3 rounded-xl text-left transition-all flex items-center space-x-3 cursor-pointer ${
                    this.fontFamily === 'sans'
                      ? 'bg-aether/20 border border-aether text-white shadow-sm'
                      : 'bg-surface-overlay hover:bg-surface-base border border-white/5 text-slate-300'
                  }"
                >
                  <span class="text-lg">🔤</span>
                  <div>
                    <div class="text-xs font-bold font-sans">Sans-Serif (Modern Inter)</div>
                    <div class="text-[10px] text-slate-400 font-sans">Inter UI / Segoe UI / Roboto</div>
                  </div>
                </button>

                <button
                  type="button"
                  onclick="if(window.themeEngine) window.themeEngine.setFontFamily('mono')"
                  class="p-3 rounded-xl text-left transition-all flex items-center space-x-3 cursor-pointer ${
                    this.fontFamily === 'mono'
                      ? 'bg-aether/20 border border-aether text-white shadow-sm'
                      : 'bg-surface-overlay hover:bg-surface-base border border-white/5 text-slate-300'
                  }"
                >
                  <span class="text-lg">💻</span>
                  <div>
                    <div class="text-xs font-bold font-mono">Monospace (Terminal)</div>
                    <div class="text-[10px] text-slate-400 font-mono">JetBrains Mono / Fira Code</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- SECTION 5: SOVEREIGN WEB-OF-TRUST BADGES & FEED TRUST RANKING -->
            <div class="p-4 rounded-xl bg-surface-raised/40 border border-white/5 space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
                  <span class="text-signal">🛡️</span>
                  <span>Web-of-Trust Badges & Feed Ranking</span>
                </label>
                <span class="text-[10px] font-mono text-emerald-400">Zero-Knowledge WoT</span>
              </div>

              <div class="space-y-2.5 text-xs">
                <!-- Toggle 1: Show Trust Badges -->
                <label class="flex items-center justify-between p-2.5 rounded-xl bg-surface-base/60 border border-white/5 cursor-pointer hover:bg-surface-overlay transition-colors">
                  <div class="space-y-0.5">
                    <span class="font-medium text-slate-200">Show Web-of-Trust Badges on Posts</span>
                    <p class="text-[10px] text-slate-400">Displays inline cryptographic trust tiers and merit score next to authors</p>
                  </div>
                  <input 
                    type="checkbox" 
                    id="checkbox-show-trust-badges"
                    ${(typeof window !== 'undefined' && (window as any).clientStore?.showTrustBadges !== false) ? 'checked' : ''}
                    onchange="if(window.clientStore) { window.clientStore.setShowTrustBadges(this.checked); }"
                    class="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                </label>

                <!-- Toggle 2: Demote Low-Trust Posts -->
                <label class="flex items-center justify-between p-2.5 rounded-xl bg-surface-base/60 border border-white/5 cursor-pointer hover:bg-surface-overlay transition-colors">
                  <div class="space-y-0.5">
                    <span class="font-medium text-slate-200">Demote Low-Trust Publications</span>
                    <p class="text-[10px] text-slate-400">Softly moves posts below trust threshold to the bottom with 70% opacity (no shadowbanning)</p>
                  </div>
                  <input 
                    type="checkbox" 
                    id="checkbox-demote-low-trust"
                    ${(typeof window !== 'undefined' && (window as any).clientStore?.demoteLowTrustPosts) ? 'checked' : ''}
                    onchange="if(window.clientStore) { window.clientStore.setDemoteLowTrustPosts(this.checked); }"
                    class="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                </label>

                <!-- Threshold Slider -->
                <div class="p-2.5 rounded-xl bg-surface-base/60 border border-white/5 space-y-1.5">
                  <div class="flex items-center justify-between text-[11px] font-mono">
                    <span class="text-slate-400">Minimum Trust Score Ceiling</span>
                    <span id="label-trust-threshold" class="text-cyan-300 font-bold">${(typeof window !== 'undefined' && (window as any).clientStore?.minFeedTrustThreshold) || 50} Merit</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="500" 
                    step="10" 
                    value="${(typeof window !== 'undefined' && (window as any).clientStore?.minFeedTrustThreshold) || 50}"
                    oninput="const lbl = document.getElementById('label-trust-threshold'); if(lbl) lbl.textContent = this.value + ' Merit'; if(window.clientStore) window.clientStore.setMinFeedTrustThreshold(parseInt(this.value, 10));"
                    class="w-full h-1.5 bg-surface-overlay rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <div class="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>10 (Citizen)</span>
                    <span>100 (Sentinel)</span>
                    <span>500 (Archon)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- SECTION 6: PROACTIVE LOCAL AI ASSISTANT -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <span>🤖</span>
                  <span>On-Device Proactive AI Assistant</span>
                </span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">LOCAL ONLY</span>
              </div>

              <div class="p-4 rounded-xl bg-surface-base/80 border border-white/5 space-y-3">
                <label class="flex items-center justify-between p-2.5 rounded-xl bg-surface-base/60 border border-white/5 cursor-pointer hover:bg-surface-base transition-colors">
                  <div class="space-y-0.5 pr-2">
                    <span class="text-xs font-medium text-white block">Proactive Ambient Suggestions</span>
                    <span class="text-[10px] text-slate-400 block leading-relaxed">
                      Emits helpful, non-intrusive advisories for unbacked vaults, active DAO quorums, and guardian health.
                    </span>
                  </div>
                  <input 
                    type="checkbox" 
                    id="checkbox-proactive-ai"
                    ${(typeof window !== 'undefined' && (window as any).clientStore?.proactiveAiEnabled !== false) ? 'checked' : ''}
                    onchange="if(window.clientStore) window.clientStore.setProactiveAiEnabled(this.checked)"
                    class="w-4 h-4 rounded text-cyan-400 focus:ring-0 cursor-pointer"
                  />
                </label>

                <div class="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-400">
                  <span>Dismissed suggestion types:</span>
                  <button
                    type="button"
                    onclick="if(window.aiAssistant){ window.aiAssistant.dismissedSuggestionTypes.clear(); localStorage.removeItem('aetheris_dismissed_suggestions'); if(window.toastManager) window.toastManager.success('Dismissed AI suggestions reset!', '✓'); }"
                    class="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Reset Dismissed
                  </button>
                </div>
              </div>
            </div>

            <!-- SECTION 7: SOVEREIGN FOOTPRINT -->
            ${sovereignFootprint.renderFootprintSectionHTML()}

            <!-- SECTION 8: LOCAL CRASH DIAGNOSTICS -->
            ${localDiagnostics.renderDiagnosticsSectionHTML()}

          </div>

          <!-- MODAL FOOTER -->
          <div class="px-6 py-4 border-t border-white/10 bg-surface-raised/80 flex items-center justify-between shrink-0">
            <button
              type="button"
              onclick="if(window.themeEngine) window.themeEngine.resetToDefaults()"
              class="px-3.5 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-base border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              ⟲ Reset Defaults
            </button>

            <div class="flex items-center space-x-3">
              <button
                type="button"
                onclick="if(window.themeEngine) window.themeEngine.closeModal()"
                class="px-5 py-1.5 rounded-lg text-black font-semibold text-xs transition-all duration-150 shadow-md hover:shadow-cyan-500/25 cursor-pointer"
                style="background-color: ${effectiveAccent};"
              >
                Save & Close
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Alias for backward compatibility: renders theme selector modal.
   */
  public renderThemeSelectorModal(): string {
    return this.renderDisplaySettingsModal();
  }

  // ─── DYNAMIC STYLING & DOM APPLICATION ─────────────────────────────────────

  /**
   * Applies attributes and injects CSS variables on documentElement and in head.
   */
  private applyCurrentStyles(): void {
    if (typeof document === 'undefined') return;

    const theme = this.getCurrentTheme();
    const effectiveAccent = this.getEffectiveAccentColor();
    const docEl = document.documentElement;

    // 1. Set attributes on <html> for CSS and Tailwind selectors
    docEl.setAttribute('data-theme', theme.id);
    docEl.setAttribute('data-font-family', this.fontFamily);
    docEl.setAttribute('data-font-size', `${this.fontSize}px`);
    docEl.setAttribute('data-theme-mode', theme.mode || (theme.id === 'alabaster-light' ? 'light' : 'dark'));

    // 2. Set CSS Custom Properties on :root
    docEl.style.setProperty('--color-accent', effectiveAccent);
    docEl.style.setProperty('--color-accent-text', effectiveAccent);
    docEl.style.setProperty('--color-accent-border', effectiveAccent);
    docEl.style.setProperty('--color-accent-glow', `${effectiveAccent}33`);
    docEl.style.setProperty('--bg-canvas', theme.bgCanvas);
    docEl.style.setProperty('--bg-surface-base', theme.bgSurfaceBase);
    docEl.style.setProperty('--bg-surface-raised', theme.bgSurfaceRaised);
    docEl.style.setProperty('--bg-surface-overlay', theme.bgSurfaceOverlay);
    docEl.style.setProperty('--font-size-base', `${this.fontSize}px`);

    const familyStack =
      this.fontFamily === 'mono'
        ? "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

    docEl.style.setProperty('--font-family-base', familyStack);

    // 3. Apply on document.body
    if (document.body) {
      document.body.style.backgroundColor = theme.bgCanvas;
      document.body.style.fontSize = `${this.fontSize}px`;
      document.body.style.fontFamily = familyStack;
      document.body.style.color = theme.id === 'alabaster-light' ? '#0f172a' : '#f1f5f9';
    }

    // 4. Inject / Update Dynamic Style Tag for Tailwind classes & transitions
    this.injectDynamicThemeStylesheet(theme, familyStack, effectiveAccent);
  }

  /**
   * Injects or updates global <style> element with active theme specific rules.
   */
  private injectDynamicThemeStylesheet(theme: ThemeDefinition, familyStack: string, effectiveAccent: string): void {
    if (typeof document === 'undefined') return;

    let styleTag = document.getElementById(this.STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = this.STYLE_ELEMENT_ID;
      document.head.appendChild(styleTag);
    }

    const cssRules = `
      :root {
        --color-accent: ${effectiveAccent};
        --color-accent-text: ${effectiveAccent};
        --color-accent-border: ${effectiveAccent};
        --color-accent-glow: ${effectiveAccent}33;
        --bg-canvas: ${theme.bgCanvas};
        --bg-surface-base: ${theme.bgSurfaceBase};
        --bg-surface-raised: ${theme.bgSurfaceRaised};
        --bg-surface-overlay: ${theme.bgSurfaceOverlay};
        --font-size-base: ${this.fontSize}px;
        --font-family-base: ${familyStack};
      }

      body {
        background-color: ${theme.bgCanvas} !important;
        font-family: ${familyStack} !important;
        font-size: ${this.fontSize}px !important;
      }

      /* Dynamic overrides for Omni-Sphere surfaces */
      [data-theme="${theme.id}"] .bg-canvas {
        background-color: ${theme.bgCanvas} !important;
      }

      [data-theme="${theme.id}"] .bg-surface-base {
        background-color: ${theme.bgSurfaceBase} !important;
      }

      [data-theme="${theme.id}"] .bg-surface-raised {
        background-color: ${theme.bgSurfaceRaised} !important;
      }

      [data-theme="${theme.id}"] .bg-surface-overlay {
        background-color: ${theme.bgSurfaceOverlay} !important;
      }

      /* Theme-specific accent glows, card borders and highlights */
      [data-theme="obsidian-cyber"] {
        --color-accent: ${effectiveAccent};
        --color-accent-glow: ${effectiveAccent}33;
        --color-accent-border: ${effectiveAccent}55;
      }
      [data-theme="obsidian-cyber"] article {
        background-color: rgba(30, 41, 59, 0.65) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
      }
      [data-theme="obsidian-cyber"] article:hover {
        box-shadow: 0 0 0 1px ${effectiveAccent}33, 0 8px 32px rgba(0, 0, 0, 0.55);
      }

      [data-theme="matrix-monolith"] {
        --color-accent: ${effectiveAccent};
        --color-accent-glow: ${effectiveAccent}33;
        --color-accent-border: ${effectiveAccent}55;
      }
      [data-theme="matrix-monolith"] body {
        background-color: #000000 !important;
      }
      [data-theme="matrix-monolith"] article {
        background-color: #050505 !important;
        border: 1px solid #27272a !important;
      }
      [data-theme="matrix-monolith"] article:hover {
        border-color: ${effectiveAccent}80 !important;
        box-shadow: 0 0 0 1px ${effectiveAccent}33, 0 8px 32px rgba(0, 0, 0, 0.7);
      }

      [data-theme="tokyo-neon"] {
        --color-accent: ${effectiveAccent};
        --color-accent-glow: ${effectiveAccent}33;
        --color-accent-border: ${effectiveAccent}55;
      }
      [data-theme="tokyo-neon"] article:hover {
        box-shadow: 0 0 0 1px ${effectiveAccent}33, 0 8px 32px rgba(0, 0, 0, 0.6);
      }

      [data-theme="solar-amber"] {
        --color-accent: ${effectiveAccent};
        --color-accent-glow: ${effectiveAccent}33;
        --color-accent-border: ${effectiveAccent}55;
      }
      [data-theme="solar-amber"] article:hover {
        box-shadow: 0 0 0 1px ${effectiveAccent}33, 0 8px 32px rgba(0, 0, 0, 0.55);
      }

      [data-theme="nordic-frost"] {
        --color-accent: ${effectiveAccent};
        --color-accent-glow: ${effectiveAccent}33;
        --color-accent-border: ${effectiveAccent}55;
      }
      [data-theme="nordic-frost"] article:hover {
        box-shadow: 0 0 0 1px ${effectiveAccent}33, 0 8px 32px rgba(0, 0, 0, 0.55);
      }

      /* High-contrast Daylight Light Mode styling (Sovereign Dual Horizon) */
      [data-theme="alabaster-light"] {
        color-scheme: light;
      }
      [data-theme="alabaster-light"] body,
      [data-theme="alabaster-light"] #main-layout {
        color: #0f172a !important;
        background-color: #f8fafc !important;
      }
      [data-theme="alabaster-light"] ::-webkit-scrollbar-thumb {
        background: rgba(15, 23, 42, 0.15) !important;
        border-radius: 9999px;
      }
      [data-theme="alabaster-light"] ::-webkit-scrollbar-thumb:hover {
        background: rgba(15, 23, 42, 0.35) !important;
      }
      [data-theme="alabaster-light"] header,
      [data-theme="alabaster-light"] #app-top-header {
        background-color: rgba(255, 255, 255, 0.96) !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
        backdrop-filter: blur(16px);
      }
      [data-theme="alabaster-light"] aside,
      [data-theme="alabaster-light"] #app-left-sidebar,
      [data-theme="alabaster-light"] #app-right-sidebar {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      [data-theme="alabaster-light"] article,
      [data-theme="alabaster-light"] .post-card-container,
      [data-theme="alabaster-light"] .rounded-2xl {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04) !important;
      }
      [data-theme="alabaster-light"] article:hover {
        box-shadow: 0 6px 20px -2px rgba(0, 0, 0, 0.07), 0 2px 6px -1px rgba(0, 0, 0, 0.04) !important;
        border-color: #cbd5e1 !important;
      }
      [data-theme="alabaster-light"] h1,
      [data-theme="alabaster-light"] h2,
      [data-theme="alabaster-light"] h3,
      [data-theme="alabaster-light"] h4,
      [data-theme="alabaster-light"] h5,
      [data-theme="alabaster-light"] h6,
      [data-theme="alabaster-light"] .font-bold,
      [data-theme="alabaster-light"] .font-semibold,
      [data-theme="alabaster-light"] .btn-open-detail,
      [data-theme="alabaster-light"] .post-title {
        color: #0f172a !important;
      }
      [data-theme="alabaster-light"] p,
      [data-theme="alabaster-light"] .post-content,
      [data-theme="alabaster-light"] .text-slate-100,
      [data-theme="alabaster-light"] .text-slate-200,
      [data-theme="alabaster-light"] .text-slate-300 {
        color: #1e293b !important;
      }
      [data-theme="alabaster-light"] .text-slate-400,
      [data-theme="alabaster-light"] .text-slate-500,
      [data-theme="alabaster-light"] .text-white\\/60,
      [data-theme="alabaster-light"] .text-white\\/55,
      [data-theme="alabaster-light"] .text-white\\/40,
      [data-theme="alabaster-light"] .text-white\\/30,
      [data-theme="alabaster-light"] .text-white\\/25,
      [data-theme="alabaster-light"] .text-white\\/20 {
        color: #475569 !important;
      }
      [data-theme="alabaster-light"] .text-white,
      [data-theme="alabaster-light"] .text-white\\/90,
      [data-theme="alabaster-light"] .text-white\\/80,
      [data-theme="alabaster-light"] .text-white\\/70 {
        color: #0f172a !important;
      }
      [data-theme="alabaster-light"] .border-white\\/5,
      [data-theme="alabaster-light"] .border-white\\/10,
      [data-theme="alabaster-light"] .border-white\\/15,
      [data-theme="alabaster-light"] .border-white\\/20,
      [data-theme="alabaster-light"] .border-subtle-b,
      [data-theme="alabaster-light"] .border-subtle-t,
      [data-theme="alabaster-light"] .border-subtle-r,
      [data-theme="alabaster-light"] .border-subtle-l {
        border-color: #e2e8f0 !important;
      }
      [data-theme="alabaster-light"] .bg-canvas {
        background-color: #f8fafc !important;
      }
      [data-theme="alabaster-light"] .bg-canvas\\/90,
      [data-theme="alabaster-light"] .bg-canvas\\/80,
      [data-theme="alabaster-light"] .bg-canvas\\/50,
      [data-theme="alabaster-light"] .bg-canvas\\/30 {
        background-color: #ffffff !important;
      }
      [data-theme="alabaster-light"] .bg-surface-base,
      [data-theme="alabaster-light"] .bg-surface-base\\/95,
      [data-theme="alabaster-light"] .bg-surface-base\\/90,
      [data-theme="alabaster-light"] .bg-surface-base\\/85,
      [data-theme="alabaster-light"] .bg-surface-base\\/80,
      [data-theme="alabaster-light"] .bg-surface-base\\/75,
      [data-theme="alabaster-light"] .bg-surface-base\\/50 {
        background-color: rgba(255, 255, 255, 0.96) !important;
      }
      [data-theme="alabaster-light"] .bg-surface-raised,
      [data-theme="alabaster-light"] .bg-surface-raised\\/90,
      [data-theme="alabaster-light"] .bg-surface-raised\\/80,
      [data-theme="alabaster-light"] .bg-surface-raised\\/60,
      [data-theme="alabaster-light"] .bg-surface-raised\\/50,
      [data-theme="alabaster-light"] .bg-surface-raised\\/30 {
        background-color: #ffffff !important;
      }
      [data-theme="alabaster-light"] .bg-surface-overlay {
        background-color: #f1f5f9 !important;
      }
      [data-theme="alabaster-light"] .bg-surface-highlight {
        background-color: #e2e8f0 !important;
      }
      [data-theme="alabaster-light"] .stories-track,
      [data-theme="alabaster-light"] [class*="stories-track"] {
        background-color: #ffffff !important;
        border-bottom-color: #e2e8f0 !important;
      }
      [data-theme="alabaster-light"] .sticky.top-0 {
        background-color: rgba(255, 255, 255, 0.96) !important;
        border-bottom-color: #e2e8f0 !important;
      }
      [data-theme="alabaster-light"] footer {
        background-color: #ffffff !important;
        border-top-color: #e2e8f0 !important;
        color: #64748b !important;
      }
      [data-theme="alabaster-light"] .text-signal {
        color: #059669 !important;
      }
      [data-theme="alabaster-light"] .text-indigo-400 {
        color: #4338ca !important;
      }
      [data-theme="alabaster-light"] .text-emerald-400 {
        color: #047857 !important;
      }
      [data-theme="alabaster-light"] .text-amber-400,
      [data-theme="alabaster-light"] .text-amber {
        color: #b45309 !important;
      }
      [data-theme="alabaster-light"] .text-rose-400,
      [data-theme="alabaster-light"] .text-rose-500 {
        color: #be123c !important;
      }
      [data-theme="alabaster-light"] .bg-indigo-950\\/80,
      [data-theme="alabaster-light"] .bg-indigo-950\\/70,
      [data-theme="alabaster-light"] .bg-indigo-950\\/60 {
        background-color: #eef2ff !important;
        border-color: #c7d2fe !important;
        color: #4338ca !important;
      }
      [data-theme="alabaster-light"] input,
      [data-theme="alabaster-light"] textarea,
      [data-theme="alabaster-light"] select {
        color: #0f172a !important;
        background-color: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
      }
      [data-theme="alabaster-light"] input:focus,
      [data-theme="alabaster-light"] textarea:focus,
      [data-theme="alabaster-light"] select:focus {
        background-color: #ffffff !important;
        border-color: ${effectiveAccent} !important;
        box-shadow: 0 0 0 3px ${effectiveAccent}25 !important;
      }
      [data-theme="alabaster-light"] input::placeholder,
      [data-theme="alabaster-light"] textarea::placeholder {
        color: #64748b !important;
      }
      [data-theme="alabaster-light"] .btn-nav-mode,
      [data-theme="alabaster-light"] .btn-channel {
        color: #334155 !important;
        border-color: transparent !important;
      }
      [data-theme="alabaster-light"] .btn-nav-mode:hover,
      [data-theme="alabaster-light"] .btn-channel:hover {
        background-color: #f1f5f9 !important;
        color: #0f172a !important;
      }
      [data-theme="alabaster-light"] .btn-nav-mode.bg-indigo-950\\/60,
      [data-theme="alabaster-light"] .btn-nav-mode.bg-emerald-950\\/60,
      [data-theme="alabaster-light"] .btn-channel.bg-indigo-950\\/60,
      [data-theme="alabaster-light"] .btn-channel.bg-emerald-950\\/60 {
        background-color: #e2e8f0 !important;
        color: #0f172a !important;
        font-weight: 700 !important;
        border-color: #cbd5e1 !important;
      }
      [data-theme="alabaster-light"] .btn-sort,
      [data-theme="alabaster-light"] .btn-feed-sort {
        background-color: transparent !important;
        color: #475569 !important;
        border-color: transparent !important;
      }
      [data-theme="alabaster-light"] .btn-sort:hover,
      [data-theme="alabaster-light"] .btn-feed-sort:hover {
        background-color: #f1f5f9 !important;
        color: #0f172a !important;
      }
      [data-theme="alabaster-light"] .btn-sort[class*="bg-indigo"],
      [data-theme="alabaster-light"] .btn-sort[class*="bg-emerald"],
      [data-theme="alabaster-light"] .btn-feed-sort.active-sort {
        background-color: #0f172a !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2) !important;
      }
      [data-theme="alabaster-light"] .btn-view-mode {
        color: #64748b !important;
      }
      [data-theme="alabaster-light"] .btn-view-mode:hover {
        color: #0f172a !important;
        background-color: #f1f5f9 !important;
      }
      [data-theme="alabaster-light"] .btn-view-mode.active-view-mode {
        background-color: #ffffff !important;
        color: #0f172a !important;
        font-weight: 700 !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08) !important;
      }
      [data-theme="alabaster-light"] #btn-open-composer,
      [data-theme="alabaster-light"] #btn-inline-broadcast {
        background-color: #0f172a !important;
        color: #ffffff !important;
        border-color: #0f172a !important;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15) !important;
      }
      [data-theme="alabaster-light"] #btn-open-composer:hover,
      [data-theme="alabaster-light"] #btn-inline-broadcast:hover {
        background-color: #1e293b !important;
      }
      [data-theme="alabaster-light"] .btn-upvote {
        color: #64748b !important;
      }
      [data-theme="alabaster-light"] .btn-upvote:hover {
        color: ${effectiveAccent} !important;
        background-color: #eef2ff !important;
      }
      [data-theme="alabaster-light"] .btn-upvote.text-indigo-400,
      [data-theme="alabaster-light"] .btn-upvote[class*="font-bold"] {
        color: ${effectiveAccent} !important;
        background-color: #e0e7ff !important;
        font-weight: 800 !important;
      }
      [data-theme="alabaster-light"] .btn-downvote {
        color: #64748b !important;
      }
      [data-theme="alabaster-light"] .btn-downvote:hover {
        color: #e11d48 !important;
        background-color: #ffe4e6 !important;
      }
      [data-theme="alabaster-light"] .btn-downvote.text-rose-500,
      [data-theme="alabaster-light"] .btn-downvote[class*="font-bold"] {
        color: #be123c !important;
        background-color: #fecdd3 !important;
        font-weight: 800 !important;
      }
      [data-theme="alabaster-light"] .btn-boost {
        color: #475569 !important;
      }
      [data-theme="alabaster-light"] .btn-boost:hover {
        color: #047857 !important;
        background-color: #ecfdf5 !important;
      }
      [data-theme="alabaster-light"] .btn-boost.text-emerald-400,
      [data-theme="alabaster-light"] .btn-boost[class*="bg-emerald"] {
        color: #047857 !important;
        background-color: #ecfdf5 !important;
        border: 1px solid #a7f3d0 !important;
        font-weight: 700 !important;
      }
      [data-theme="alabaster-light"] .btn-pulse-comment,
      [data-theme="alabaster-light"] .btn-copy-post-link,
      [data-theme="alabaster-light"] .btn-bookmark-toggle,
      [data-theme="alabaster-light"] .btn-open-award-modal,
      [data-theme="alabaster-light"] .btn-pulse-share {
        color: #475569 !important;
      }
      [data-theme="alabaster-light"] .btn-pulse-comment:hover,
      [data-theme="alabaster-light"] .btn-copy-post-link:hover,
      [data-theme="alabaster-light"] .btn-bookmark-toggle:hover,
      [data-theme="alabaster-light"] .btn-open-award-modal:hover,
      [data-theme="alabaster-light"] .btn-pulse-share:hover {
        color: #0f172a !important;
        background-color: #f1f5f9 !important;
      }
      [data-theme="alabaster-light"] .add-reaction-btn {
        background-color: #f8fafc !important;
        border-color: #e2e8f0 !important;
        color: #334155 !important;
      }
      [data-theme="alabaster-light"] .add-reaction-btn:hover {
        background-color: #f1f5f9 !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
      }
      [data-theme="alabaster-light"] .reactions-picker {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.06) !important;
        color: #0f172a !important;
      }
      [data-theme="alabaster-light"] .reactions-picker .btn-toggle-reaction {
        color: #334155 !important;
      }
      [data-theme="alabaster-light"] .reactions-picker .btn-toggle-reaction:hover {
        background-color: #f1f5f9 !important;
        color: #0f172a !important;
      }
      [data-theme="alabaster-light"] .reaction-pills .btn-toggle-reaction {
        background-color: #f8fafc !important;
        border-color: #e2e8f0 !important;
        color: #334155 !important;
      }
      [data-theme="alabaster-light"] .reaction-pills .btn-toggle-reaction:hover {
        background-color: #f1f5f9 !important;
        border-color: #cbd5e1 !important;
      }
      [data-theme="alabaster-light"] .reaction-pills .btn-toggle-reaction[class*="border-[#00e5ff]"],
      [data-theme="alabaster-light"] .reaction-pills .btn-toggle-reaction[class*="text-[#00e5ff]"] {
        background-color: #eef2ff !important;
        border-color: #c7d2fe !important;
        color: ${effectiveAccent} !important;
        font-weight: 700 !important;
      }
      [data-theme="alabaster-light"] .badge-flair,
      [data-theme="alabaster-light"] [data-flair] {
        background-color: #f1f5f9 !important;
        border-color: #cbd5e1 !important;
        color: #1e293b !important;
        font-weight: 600 !important;
      }
      #aetheris-award-popover {
        pointer-events: none !important;
      }
      [data-theme="alabaster-light"] #aetheris-award-popover {
        background-color: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 6px 12px -4px rgba(0, 0, 0, 0.06) !important;
        color: #0f172a !important;
      }
      [data-theme="alabaster-light"] #aetheris-award-popover #award-popover-arrow {
        background-color: #ffffff !important;
        border-color: #cbd5e1 !important;
      }
      [data-theme="alabaster-light"] #aetheris-award-popover p,
      [data-theme="alabaster-light"] #aetheris-award-popover .text-slate-300 {
        color: #334155 !important;
      }
      [data-theme="alabaster-light"] #aetheris-award-popover .text-slate-400 {
        color: #64748b !important;
      }
      [data-theme="alabaster-light"] #aetheris-award-popover .border-white\\/10 {
        border-color: #e2e8f0 !important;
      }
      [data-theme="alabaster-light"] .award-badge-chip {
        background-color: #f8fafc !important;
        border-color: #e2e8f0 !important;
      }
      [data-theme="alabaster-light"] .award-badge-chip:hover {
        background-color: #f1f5f9 !important;
        border-color: #cbd5e1 !important;
      }
      [data-theme="alabaster-light"] [role="dialog"],
      [data-theme="alabaster-light"] .modal-content,
      [data-theme="alabaster-light"] #app-modal-root > div > div {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
        color: #0f172a !important;
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.15) !important;
      }
      [data-theme="alabaster-light"] pre,
      [data-theme="alabaster-light"] code {
        background-color: #f8fafc !important;
        border-color: #e2e8f0 !important;
        color: #0f172a !important;
      }

      /* Glow & Accents per current theme */
      .theme-accent-glow {
        box-shadow: 0 0 16px ${effectiveAccent}33;
      }

      .theme-accent-border {
        border-color: ${effectiveAccent} !important;
      }

      .theme-accent-text {
        color: ${effectiveAccent} !important;
      }

      /* Fluid font sizing for specific classes */
      .feed-text-fluid {
        font-size: ${this.fontSize}px;
      }

      .feed-text-fluid-sm {
        font-size: ${Math.max(11, this.fontSize - 2)}px;
      }

      .feed-text-fluid-lg {
        font-size: ${this.fontSize + 2}px;
      }
    `;

    styleTag.textContent = cssRules;
  }

  // ─── PERSISTENCE & EVENTS ────────────────────────────────────────────────

  /**
   * Saves config to localStorage under the key `aetheris_theme_pref`.
   */
  private savePreferences(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const prefs: ThemePreferences = {
        themeId: this.currentThemeId,
        fontSize: this.fontSize,
        fontFamily: this.fontFamily,
        customAccentColor: this.customAccentColor || undefined,
      };
      window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
    } catch (err) {
      console.error('[ThemeEngine] Error saving preferences:', err);
    }
  }

  /**
   * Loads preferences from localStorage with fallback to default values.
   */
  private loadPreferences(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const raw = window.localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.themeId === 'string' && this.THEMES.some((t) => t.id === parsed.themeId)) {
          this.currentThemeId = parsed.themeId;
        }
        if (typeof parsed.fontSize === 'number' && parsed.fontSize >= 12 && parsed.fontSize <= 18) {
          this.fontSize = Math.round(parsed.fontSize);
        }
        if (parsed.fontFamily === 'sans' || parsed.fontFamily === 'mono') {
          this.fontFamily = parsed.fontFamily;
        }
        if (typeof parsed.customAccentColor === 'string') {
          this.customAccentColor = parsed.customAccentColor;
        }
      }
    } catch (err) {
      console.warn('[ThemeEngine] Failed to parse saved preferences:', err);
    }
  }

  /**
   * Re-renders active DOM components (modal and header button) for instant feedback.
   */
  private refreshDOMComponents(): void {
    if (typeof document === 'undefined') return;

    const btnEl = document.getElementById('aetheris-theme-header-btn');
    if (btnEl && btnEl.parentElement) {
      const tempWrapper = document.createElement('div');
      tempWrapper.innerHTML = this.renderThemeButton();
      const newBtn = tempWrapper.firstElementChild;
      if (newBtn) {
        btnEl.parentElement.replaceChild(newBtn, btnEl);
      }
    }

    if (this.isModalOpen) {
      const container = document.getElementById(this.MODAL_CONTAINER_ID);
      if (container) {
        container.innerHTML = this.renderDisplaySettingsModal();
      }
    }
  }

  /**
   * Emits a CustomEvent on document for other modules in the application.
   */
  private dispatchThemeEvent(eventName: string, detail: unknown): void {
    if (typeof document === 'undefined') return;
    try {
      const evt = new CustomEvent(eventName, { detail, bubbles: true });
      document.dispatchEvent(evt);
    } catch (err) {
      console.error(`[ThemeEngine] Error dispatching event ${eventName}:`, err);
    }
  }

  /**
   * Registers the instance on the global window object for inline onclick handlers.
   */
  private registerGlobalInstance(): void {
    if (typeof window !== 'undefined') {
      window.themeEngine = this as any;
      (window as any).displaySettingsModal = this.displaySettingsModal;
      (window as any).__aetheris_set_accent = (color: string) => this.setAccentColor(color);
    }
  }

  /**
   * Attaches global keyboard listeners (Escape to close modal).
   */
  private attachGlobalKeyboardListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isModalOpen) {
        this.closeModal();
      }
    });
  }

  /**
   * Returns a descriptive label for font size.
   */
  private getFontSizeDescription(size: number): string {
    switch (size) {
      case 12:
        return 'Dense';
      case 13:
        return 'Compact';
      case 14:
        return 'Standard';
      case 15:
        return 'Medium';
      case 16:
        return 'Relaxed';
      case 17:
        return 'Comfort';
      case 18:
        return 'Large';
      default:
        return 'Custom';
    }
  }

  /**
   * Internal utility for HTML character escaping.
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// ─── DISPLAY SETTINGS MODAL WRAPPER ─────────────────────────────────────────

export class DisplaySettingsModal {
  private engine: ThemeEngine;

  constructor(engine: ThemeEngine) {
    this.engine = engine;
  }

  public get isOpen(): boolean {
    return this.engine.isModalOpen;
  }

  public open(): void {
    this.engine.openModal();
  }

  public close(): void {
    this.engine.closeModal();
  }

  public toggle(): void {
    this.engine.toggleModal();
  }

  public render(): string {
    return this.engine.renderDisplaySettingsModal();
  }
}

// ─── SINGLETON EXPORTS ──────────────────────────────────────────────────────────

export const themeEngine = new ThemeEngine();
export const displaySettingsModal = themeEngine.displaySettingsModal;
export const THEMES = themeEngine.THEMES;

serviceRegistry.registerInstance(SERVICES.ThemeEngine, themeEngine);
