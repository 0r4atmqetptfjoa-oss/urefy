/**
 * @file themes.ts
 * @package @aetheris/client-ui
 * @description 2027 Perceptual OKLCH & Spatial Glass Theme Engine.
 */

import { serviceRegistry, SERVICES } from './service-registry.js';
import { sovereignFootprint } from './settings-footprint.js';
import { localDiagnostics } from './local-diagnostics.js';
import { t } from './i18n.js';

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
  oklchCanvas?: string;
  oklchAccent?: string;
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

export const THEMES: ThemeDefinition[] = [
  {
    id: 'mineral-basalt',
    name: 'Mineral Basalt 2027',
    emoji: '🪨',
    accentColor: '#38bdf8',
    bgCanvas: '#08090d',
    bgSurfaceBase: '#0e1117',
    bgSurfaceRaised: '#161b26',
    bgSurfaceOverlay: 'rgba(22, 27, 38, 0.88)',
    textAccent: '#38bdf8',
    borderAccent: 'rgba(56, 189, 248, 0.35)',
    secondaryAccent: '#10b981',
    description: 'Deep volcanic basalt with wide-gamut OKLCH cyan refraction',
    badgeText: 'DEFAULT 2027',
    mode: 'dim',
    oklchCanvas: 'oklch(0.13 0.015 265)',
    oklchAccent: 'oklch(0.78 0.15 215)',
  },
  {
    id: 'obsidian-cyber',
    name: 'Obsidian Cyber',
    emoji: '🌌',
    accentColor: '#00e5ff',
    bgCanvas: '#090a0f',
    bgSurfaceBase: '#10131c',
    bgSurfaceRaised: '#171c28',
    bgSurfaceOverlay: 'rgba(16, 19, 28, 0.90)',
    textAccent: '#00e5ff',
    borderAccent: 'rgba(0, 229, 255, 0.40)',
    secondaryAccent: '#a855f7',
    description: 'High-contrast cryptographic command console',
    badgeText: 'CYPHR',
    mode: 'dark',
    oklchCanvas: 'oklch(0.14 0.02 260)',
    oklchAccent: 'oklch(0.84 0.17 205)',
  },
  {
    id: 'matrix-monolith',
    name: 'OLED Pitch Black',
    emoji: '🖤',
    accentColor: '#10b981',
    bgCanvas: '#000000',
    bgSurfaceBase: '#07090c',
    bgSurfaceRaised: '#0f1319',
    bgSurfaceOverlay: 'rgba(7, 9, 12, 0.94)',
    textAccent: '#10b981',
    borderAccent: 'rgba(16, 185, 129, 0.38)',
    secondaryAccent: '#00e5ff',
    description: 'Zero-nit true black for OLED panels and maximum battery efficiency',
    badgeText: 'LIGHTS OUT',
    mode: 'lights-out',
    oklchCanvas: 'oklch(0.0 0.0 0)',
    oklchAccent: 'oklch(0.76 0.18 160)',
  },
  {
    id: 'alabaster-light',
    name: 'Alabaster Daylight',
    emoji: '☀️',
    accentColor: '#0284c7',
    bgCanvas: '#f6f5f2',
    bgSurfaceBase: '#ffffff',
    bgSurfaceRaised: '#f1efe9',
    bgSurfaceOverlay: 'rgba(255, 255, 255, 0.92)',
    textAccent: '#0284c7',
    borderAccent: 'rgba(2, 132, 199, 0.30)',
    secondaryAccent: '#059669',
    description: 'Warm editorial paper daylight theme with crisp ink contrast',
    badgeText: 'LIGHT',
    mode: 'light',
    oklchCanvas: 'oklch(0.97 0.005 85)',
    oklchAccent: 'oklch(0.55 0.16 235)',
  },
  {
    id: 'tokyo-neon',
    name: 'Tokyo Synthwave',
    emoji: '⚡',
    accentColor: '#f43f5e',
    bgCanvas: '#0d0714',
    bgSurfaceBase: '#150c21',
    bgSurfaceRaised: '#201233',
    bgSurfaceOverlay: 'rgba(21, 12, 33, 0.90)',
    textAccent: '#f43f5e',
    borderAccent: 'rgba(244, 63, 94, 0.40)',
    secondaryAccent: '#38bdf8',
    description: 'Deep ultraviolet glass with neon crimson & cyan highlights',
    badgeText: 'SYNTH',
    mode: 'dark',
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Aurora',
    emoji: '❄️',
    accentColor: '#38bdf8',
    bgCanvas: '#080d16',
    bgSurfaceBase: '#0f172a',
    bgSurfaceRaised: '#1e293b',
    bgSurfaceOverlay: 'rgba(15, 23, 42, 0.90)',
    textAccent: '#38bdf8',
    borderAccent: 'rgba(56, 189, 248, 0.35)',
    secondaryAccent: '#818cf8',
    description: 'Arctic slate blue with boreal glass luminance',
    badgeText: 'ARCTIC',
    mode: 'dim',
  },
  {
    id: 'solar-amber',
    name: 'Solaris Gold',
    emoji: '🔥',
    accentColor: '#f59e0b',
    bgCanvas: '#0c0906',
    bgSurfaceBase: '#16110b',
    bgSurfaceRaised: '#221a11',
    bgSurfaceOverlay: 'rgba(22, 17, 11, 0.90)',
    textAccent: '#f59e0b',
    borderAccent: 'rgba(245, 158, 11, 0.40)',
    secondaryAccent: '#fbbf24',
    description: 'Warm amber phosphor terminal aesthetic',
    badgeText: 'AMBER',
    mode: 'dark',
  },
];

export const CURATED_THEMES: ThemeDefinition[] = THEMES;

export const ACCENT_COLORS: AccentColorOption[] = [
  { id: 'cyphr', name: 'Cyphr Cyan', hex: '#00e5ff', emoji: '💎', glowRgba: 'rgba(0, 229, 255, 0.28)', description: 'Zero-knowledge primary cyan' },
  { id: 'sky', name: 'Horizon Sky', hex: '#38bdf8', emoji: '🌊', glowRgba: 'rgba(56, 189, 248, 0.28)', description: 'Balanced sovereign blue' },
  { id: 'signal', name: 'Signal Emerald', hex: '#10b981', emoji: '🛡️', glowRgba: 'rgba(168, 185, 129, 0.28)', description: 'Verified cryptographic green' },
  { id: 'aether', name: 'Aether Violet', hex: '#a855f7', emoji: '🔮', glowRgba: 'rgba(168, 85, 247, 0.28)', description: 'Quantum lattice purple' },
  { id: 'amber', name: 'Solar Amber', hex: '#f59e0b', emoji: '⚡', glowRgba: 'rgba(245, 158, 11, 0.28)', description: 'High-visibility gold' },
  { id: 'crimson', name: 'Pulse Rose', hex: '#f43f5e', emoji: '🌹', glowRgba: 'rgba(244, 63, 94, 0.28)', description: 'Energetic crimson' },
];

const STORAGE_KEY = 'aetheris_theme_preferences_v2';

export class ThemeEngine {
  public currentThemeId: string = 'mineral-basalt';
  public fontSize: number = 14;
  public fontFamily: FontFamilyType = 'sans';
  public customAccentColor: string | null = null;
  public isModalOpen: boolean = false;

  constructor() {
    this.loadPreferences();
    this.applyCurrentStyles();
    this.registerGlobalInstance();
    this.attachGlobalKeyboardListeners();
  }

  public getThemes(): ThemeDefinition[] {
    return THEMES;
  }

  public getCuratedThemes(): ThemeDefinition[] {
    return CURATED_THEMES;
  }

  public getCurrentTheme(): ThemeDefinition {
    return THEMES.find((t) => t.id === this.currentThemeId) || THEMES[0];
  }

  public getTheme(): ThemeDefinition {
    return this.getCurrentTheme();
  }

  public getCurrentThemeId(): string {
    return this.currentThemeId;
  }

  public cycleTheme(): ThemeDefinition {
    const idx = THEMES.findIndex((t) => t.id === this.currentThemeId);
    const nextIdx = (idx + 1) % THEMES.length;
    const next = THEMES[nextIdx];
    this.setTheme(next.id);
    return next;
  }

  public getThemeById(themeId: string): ThemeDefinition | undefined {
    return THEMES.find((t) => t.id === themeId);
  }

  public getEffectiveAccentColor(): string {
    return this.customAccentColor || this.getCurrentTheme().accentColor;
  }

  public getAccentColors(): AccentColorOption[] {
    return ACCENT_COLORS;
  }

  public setTheme(themeId: string): void {
    const found = this.getThemeById(themeId);
    if (!found) return;
    this.currentThemeId = found.id;
    this.savePreferences();
    this.applyCurrentStyles();
    this.refreshDOMComponents();
    this.dispatchThemeEvent('aetheris:theme-changed', { themeId: this.currentThemeId });
  }

  public setAccentColor(hexColor: string | null): void {
    this.customAccentColor = hexColor;
    this.savePreferences();
    this.applyCurrentStyles();
    this.refreshDOMComponents();
  }

  public setFontSize(size: number): void {
    const clamped = Math.max(12, Math.min(18, Math.round(size)));
    this.fontSize = clamped;
    this.savePreferences();
    this.applyCurrentStyles();
    this.refreshDOMComponents();
  }

  public setFontFamily(family: FontFamilyType): void {
    if (family !== 'sans' && family !== 'mono') return;
    this.fontFamily = family;
    this.savePreferences();
    this.applyCurrentStyles();
    this.refreshDOMComponents();
  }

  public toggleFontFamily(): void {
    this.setFontFamily(this.fontFamily === 'sans' ? 'mono' : 'sans');
  }

  public handleFontSizeInput(val: string | number): void {
    const num = typeof val === 'number' ? val : parseInt(val, 10);
    if (!isNaN(num)) {
      this.setFontSize(num);
    }
  }

  public resetToDefaults(): void {
    this.currentThemeId = 'mineral-basalt';
    this.fontSize = 14;
    this.fontFamily = 'sans';
    this.customAccentColor = null;
    this.savePreferences();
    this.applyCurrentStyles();
    this.refreshDOMComponents();
  }

  public openModal(): void {
    this.isModalOpen = true;
    this.refreshDOMComponents();
  }

  public closeModal(): void {
    this.isModalOpen = false;
    this.refreshDOMComponents();
  }

  public toggleModal(): void {
    this.isModalOpen = !this.isModalOpen;
    this.refreshDOMComponents();
  }

  public renderThemeButton(): string {
    const theme = this.getCurrentTheme();
    return `<button
      type="button"
      id="btn-open-theme-matrix"
      data-action="theme.open"
      aria-label="Open Display & Theme Matrix"
      class="inline-flex items-center gap-2 px-3 py-1.5 min-h-[40px] rounded-xl bg-surface-raised/80 hover:bg-white/10 text-xs font-medium text-slate-200 border border-white/10 transition-all cursor-pointer"
    >
      <span>${theme.emoji}</span>
      <span class="hidden sm:inline">${this.escapeHtml(theme.name)}</span>
    </button>`;
  }

  public renderDisplaySettingsModal(): string {
    const currentTheme = this.getCurrentTheme();
    const effectiveAccent = this.getEffectiveAccentColor();

    return `<div
      id="display-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="display-settings-modal-title"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl p-4 overflow-y-auto"
    >
      <div class="w-full max-w-2xl rounded-3xl bg-[#0c101a]/95 border border-white/15 shadow-[0_24px_64px_rgba(0,0,0,0.65)] p-6 text-slate-100 my-8">
        <div class="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
          <div>
            <span class="text-[10px] font-mono uppercase tracking-widest text-cyan-400">2027 OKLCH Spatial Appearance</span>
            <h2 id="display-settings-modal-title" class="text-lg font-extrabold text-white">Display & Theme Matrix</h2>
          </div>
          <button
            type="button"
            data-action="theme.close"
            aria-label="Close modal"
            class="w-10 h-10 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >✕</button>
        </div>

        <div class="space-y-6">
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">${t('settings.themeSelect', undefined, 'Surface Atmosphere')}</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${THEMES.map((theme) => {
                const active = theme.id === currentTheme.id;
                return `<button
                  type="button"
                  data-action="theme.apply"
                  data-theme-id="${this.escapeHtml(theme.id)}"
                  aria-pressed="${active ? 'true' : 'false'}"
                  class="flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    active
                      ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(0,229,255,0.15)]'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                  }"
                >
                  <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl flex items-center justify-center text-base border border-white/15" style="background:${theme.bgCanvas}">${theme.emoji}</span>
                    <div>
                      <div class="text-xs font-bold text-white">${this.escapeHtml(theme.name)}</div>
                      <div class="text-[11px] text-slate-400">${this.escapeHtml(theme.description || '')}</div>
                    </div>
                  </div>
                  <span class="w-3 h-3 rounded-full" style="background:${theme.accentColor}"></span>
                </button>`;
              }).join('')}
            </div>
          </div>

          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">OKLCH Accent Spectrum</h3>
            <div class="flex flex-wrap gap-2.5">
              ${ACCENT_COLORS.map((acc) => {
                const isSelected = effectiveAccent.toLowerCase() === acc.hex.toLowerCase();
                return `<button
                  type="button"
                  data-action="theme.setAccent"
                  data-accent-hex="${this.escapeHtml(acc.hex)}"
                  aria-label="${this.escapeHtml(acc.name)}"
                  class="inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected ? 'border-white bg-white/15 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }"
                >
                  <span class="w-3.5 h-3.5 rounded-full" style="background:${acc.hex}"></span>
                  <span>${this.escapeHtml(acc.name)}</span>
                </button>`;
              }).join('')}
            </div>
          </div>

          <div class="pt-4 border-t border-white/10">
            ${sovereignFootprint.renderFootprintSectionHTML()}
          </div>

          <div class="pt-4 border-t border-white/10">
            ${localDiagnostics.renderDiagnosticsSectionHTML()}
          </div>
        </div>
      </div>
    </div>`;
  }

  public renderThemeSelectorModal(): string {
    return this.renderDisplaySettingsModal();
  }

  private applyCurrentStyles(): void {
    if (typeof document === 'undefined') return;
    const theme = this.getCurrentTheme();
    const effectiveAccent = this.getEffectiveAccentColor();
    const root = document.documentElement;

    root.setAttribute('data-theme', theme.id);
    if (theme.mode === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }

    root.style.setProperty('--bg-canvas', theme.bgCanvas);
    root.style.setProperty('--bg-surface-base', theme.bgSurfaceBase);
    root.style.setProperty('--bg-surface-raised', theme.bgSurfaceRaised);
    root.style.setProperty('--bg-surface-overlay', theme.bgSurfaceOverlay);
    root.style.setProperty('--color-accent', effectiveAccent);
    root.style.setProperty('--text-accent', effectiveAccent);
    root.style.setProperty('--border-accent', theme.borderAccent);
    root.style.setProperty('--urefy-font-size', `${this.fontSize}px`);
    if (theme.oklchCanvas) {
      root.style.setProperty('--oklch-canvas', theme.oklchCanvas);
    }
    if (theme.oklchAccent) {
      root.style.setProperty('--oklch-accent', theme.oklchAccent);
    }

    const familyStack =
      this.fontFamily === 'mono'
        ? "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
        : "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    this.injectDynamicThemeStylesheet(theme, familyStack, effectiveAccent);
  }

  private injectDynamicThemeStylesheet(theme: ThemeDefinition, familyStack: string, effectiveAccent: string): void {
    if (typeof document === 'undefined' || !document.head) return;
    let styleEl = document.getElementById('aetheris-dynamic-theme-styles') as HTMLStyleElement | null;
    if (!styleEl && typeof document.createElement === 'function') {
      styleEl = document.createElement('style');
      styleEl.id = 'aetheris-dynamic-theme-styles';
      document.head.appendChild(styleEl);
    }
    if (styleEl) {
      styleEl.textContent = `:root {
        --bg-canvas: ${theme.bgCanvas};
        --bg-surface-base: ${theme.bgSurfaceBase};
        --bg-surface-raised: ${theme.bgSurfaceRaised};
        --bg-surface-overlay: ${theme.bgSurfaceOverlay};
        --color-accent: ${effectiveAccent};
        font-size: ${this.fontSize}px;
        font-family: ${familyStack};
      }`;
    }
  }

  private savePreferences(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const prefs: ThemePreferences = {
          themeId: this.currentThemeId,
          fontSize: this.fontSize,
          fontFamily: this.fontFamily,
          customAccentColor: this.customAccentColor || undefined,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        localStorage.setItem('urefy_theme', this.currentThemeId);
      }
    } catch {}
  }

  private loadPreferences(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<ThemePreferences>;
          if (parsed.themeId && this.getThemeById(parsed.themeId)) {
            this.currentThemeId = parsed.themeId;
          }
          if (typeof parsed.fontSize === 'number') {
            this.fontSize = Math.max(12, Math.min(18, parsed.fontSize));
          }
          if (parsed.fontFamily === 'sans' || parsed.fontFamily === 'mono') {
            this.fontFamily = parsed.fontFamily;
          }
          if (parsed.customAccentColor) {
            this.customAccentColor = parsed.customAccentColor;
          }
        }
      }
    } catch {}
  }

  private refreshDOMComponents(): void {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('display-settings-modal');
    if (this.isModalOpen && existing) {
      existing.outerHTML = this.renderDisplaySettingsModal();
    } else if (!this.isModalOpen && existing) {
      existing.remove();
    }
  }

  private dispatchThemeEvent(eventName: string, detail: unknown): void {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
      } catch {}
    }
  }

  private registerGlobalInstance(): void {
    if (typeof window !== 'undefined') {
      (window as any).themeEngine = this;
      (window as any).__aetheris_open_theme = () => this.openModal();
      (window as any).__aetheris_close_theme = () => this.closeModal();
      (window as any).__aetheris_apply_theme = (id: string) => this.setTheme(id);
      (window as any).__aetheris_set_accent = (hex: string) => this.setAccentColor(hex);
    }
  }

  private attachGlobalKeyboardListeners(): void {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isModalOpen) {
        this.closeModal();
      }
    });
  }

  private escapeHtml(str: string): string {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export class DisplaySettingsModal {
  constructor(private engine: ThemeEngine) {}

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

export const themeEngine = new ThemeEngine();
export const displaySettingsModal = new DisplaySettingsModal(themeEngine);
serviceRegistry.registerInstance(SERVICES.ThemeEngine, themeEngine);
