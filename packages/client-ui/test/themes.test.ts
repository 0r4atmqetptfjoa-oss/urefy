import { describe, it, expect, beforeEach } from 'vitest';
import {
  ThemeEngine,
  themeEngine,
  displaySettingsModal,
  THEMES,
  ACCENT_COLOR_OPTIONS,
  type ThemeDefinition,
  type AccentColorOption,
} from '../src/themes.js';

describe('Obsidian Theme Engine, Display Customizer & Typography System', () => {
  beforeEach(() => {
    themeEngine.resetToDefaults();
  });

  // ─── 1. INITIALIZARE TEMA DEFAULT ──────────────────────────────────────────

  describe('1. Default Theme Initialization', () => {
    it('should initialize with default mineral-basalt theme and standard typography', () => {
      expect(themeEngine.currentThemeId).toBe('mineral-basalt');
      expect(themeEngine.fontSize).toBe(15);
      expect(themeEngine.fontFamily).toBe('sans');
      expect(themeEngine.isModalOpen).toBe(false);
      expect(themeEngine.customAccentColor).toBeNull();

      const current = themeEngine.getCurrentTheme();
      expect(current.id).toBe('mineral-basalt');
      expect(current.name).toBe('Mineral Basalt 2027');
      expect(current.emoji).toBe('🪨');
      expect(current.accentColor).toBe('#38bdf8');
      expect(current.bgCanvas).toBe('#08090d');
      expect(current.bgSurfaceBase).toBe('#0e1117');
      expect(current.bgSurfaceRaised).toBe('#161b26');
      expect(current.bgSurfaceOverlay).toBe('rgba(22, 27, 38, 0.88)');
      expect(current.textAccent).toBe('#38bdf8');
      expect(current.mode).toBe('dim');
    });

    it('should provide sovereign theme definitions in THEMES and getThemes()', () => {
      expect(THEMES.length).toBe(7);
      expect(themeEngine.getThemes().length).toBe(7);

      const themeIds = themeEngine.getThemes().map((t: ThemeDefinition) => t.id);
      expect(themeIds).toEqual([
        'mineral-basalt',
        'obsidian-cyber',
        'matrix-monolith',
        'alabaster-light',
        'tokyo-neon',
        'nordic-frost',
        'solar-amber',
      ]);
    });

    it('should retrieve individual theme by ID correctly', () => {
      const theme = themeEngine.getThemeById('mineral-basalt');
      expect(theme).toBeDefined();
      expect(theme?.name).toBe('Mineral Basalt 2027');
      expect(themeEngine.getThemeById('non-existent-id')).toBeUndefined();
    });
  });

  // ─── 2. DAYLIGHT / ALABASTER LIGHT MODE (SOVEREIGN DUAL HORIZON) ────────────

  describe('2. Daylight / Alabaster Light Mode (Sovereign Dual Horizon)', () => {
    it('should switch to alabaster-light and verify all light mode parameters', () => {
      themeEngine.setTheme('alabaster-light');

      expect(themeEngine.currentThemeId).toBe('alabaster-light');

      const current = themeEngine.getCurrentTheme();
      expect(current.id).toBe('alabaster-light');
      expect(current.name).toBe('Alabaster Daylight');
      expect(current.emoji).toBe('☀️');
      expect(current.bgCanvas).toBe('#f6f5f2');
      expect(current.bgSurfaceBase).toBe('#ffffff');
      expect(current.bgSurfaceRaised).toBe('#f1efe9');
      expect(current.bgSurfaceOverlay).toBe('rgba(255, 255, 255, 0.92)');
      expect(current.accentColor).toBe('#0284c7');
      expect(current.textAccent).toBe('#0284c7');
      expect(current.mode).toBe('light');
      expect(current.badgeText).toBe('LIGHT');
    });
  });

  // ─── 3. PURE OLED BLACK MODE (X LIGHTS OUT + MATRIX MONOLITH) ─────────────

  describe('3. Pure OLED Black Mode (X Lights Out + Matrix Monolith)', () => {
    it('should switch active theme to matrix-monolith and verify all OLED black properties', () => {
      themeEngine.setTheme('matrix-monolith');

      expect(themeEngine.currentThemeId).toBe('matrix-monolith');

      const current = themeEngine.getCurrentTheme();
      expect(current.id).toBe('matrix-monolith');
      expect(current.name).toBe('OLED Pitch Black');
      expect(current.emoji).toBe('🖤');
      expect(current.accentColor).toBe('#10b981');
      expect(current.bgCanvas).toBe('#000000');
      expect(current.bgSurfaceBase).toBe('#07090c');
      expect(current.bgSurfaceRaised).toBe('#0f1319');
      expect(current.bgSurfaceOverlay).toBe('rgba(7, 9, 12, 0.94)');
      expect(current.textAccent).toBe('#10b981');
      expect(current.borderAccent).toBe('rgba(16, 185, 129, 0.38)');
      expect(current.secondaryAccent).toBe('#00e5ff');
      expect(current.badgeText).toBe('LIGHTS OUT');
      expect(current.mode).toBe('lights-out');
    });

    it('should retain current theme if an invalid theme ID is passed', () => {
      themeEngine.setTheme('matrix-monolith');
      expect(themeEngine.currentThemeId).toBe('matrix-monolith');

      themeEngine.setTheme('invalid-unknown-theme');
      expect(themeEngine.currentThemeId).toBe('matrix-monolith');
      expect(themeEngine.getCurrentTheme().id).toBe('matrix-monolith');
    });
  });

  // ─── 4. COMUTAREA PE TOATE TEMELE ──────────────────────────────────────────

  describe('4. Switching to Solar Amber, Tokyo Neon, and Nordic Frost', () => {
    it('should switch to solar-amber and verify colors and emoji', () => {
      themeEngine.setTheme('solar-amber');

      expect(themeEngine.currentThemeId).toBe('solar-amber');
      const current = themeEngine.getCurrentTheme();
      expect(current.name).toBe('Solaris Gold');
      expect(current.emoji).toBe('🔥');
      expect(current.accentColor).toBe('#f59e0b');
      expect(current.bgCanvas).toBe('#0c0906');
      expect(current.bgSurfaceBase).toBe('#16110b');
      expect(current.bgSurfaceRaised).toBe('#221a11');
      expect(current.bgSurfaceOverlay).toBe('rgba(22, 17, 11, 0.90)');
      expect(current.badgeText).toBe('AMBER');
    });

    it('should switch to tokyo-neon and verify colors and emoji', () => {
      themeEngine.setTheme('tokyo-neon');

      expect(themeEngine.currentThemeId).toBe('tokyo-neon');
      const current = themeEngine.getCurrentTheme();
      expect(current.name).toBe('Tokyo Synthwave');
      expect(current.emoji).toBe('⚡');
      expect(current.accentColor).toBe('#f43f5e');
      expect(current.bgCanvas).toBe('#0d0714');
      expect(current.bgSurfaceBase).toBe('#150c21');
      expect(current.bgSurfaceRaised).toBe('#201233');
      expect(current.bgSurfaceOverlay).toBe('rgba(21, 12, 33, 0.90)');
      expect(current.badgeText).toBe('SYNTH');
    });

    it('should switch to nordic-frost and verify colors and emoji', () => {
      themeEngine.setTheme('nordic-frost');

      expect(themeEngine.currentThemeId).toBe('nordic-frost');
      const current = themeEngine.getCurrentTheme();
      expect(current.name).toBe('Nordic Aurora');
      expect(current.emoji).toBe('❄️');
      expect(current.accentColor).toBe('#38bdf8');
      expect(current.bgCanvas).toBe('#080d16');
      expect(current.bgSurfaceBase).toBe('#0f172a');
      expect(current.bgSurfaceRaised).toBe('#1e293b');
      expect(current.bgSurfaceOverlay).toBe('rgba(15, 23, 42, 0.90)');
      expect(current.badgeText).toBe('ARCTIC');
    });
  });

  // ─── 5. SCALAREA FONTULUI (Dense, Standard, Relaxed, Large) ────────────────

  describe('5. Font Scaling and Range Clamping (Dense, Standard, Relaxed, Large)', () => {
    it('should set font size to 16px (Relaxed)', () => {
      themeEngine.setFontSize(16);
      expect(themeEngine.fontSize).toBe(16);
    });

    it('should clamp font size to minimum 12px (Dense) when smaller values are passed', () => {
      themeEngine.setFontSize(8);
      expect(themeEngine.fontSize).toBe(12);

      themeEngine.setFontSize(0);
      expect(themeEngine.fontSize).toBe(12);

      themeEngine.setFontSize(-10);
      expect(themeEngine.fontSize).toBe(12);
    });

    it('should clamp font size to maximum 18px (Large) when larger values are passed', () => {
      themeEngine.setFontSize(24);
      expect(themeEngine.fontSize).toBe(18);

      themeEngine.setFontSize(100);
      expect(themeEngine.fontSize).toBe(18);
    });

    it('should round fractional font sizes and clamp appropriately', () => {
      themeEngine.setFontSize(15.7);
      expect(themeEngine.fontSize).toBe(16);

      themeEngine.setFontSize(13.2);
      expect(themeEngine.fontSize).toBe(13);
    });

    it('should parse string inputs via handleFontSizeInput', () => {
      themeEngine.handleFontSizeInput('17');
      expect(themeEngine.fontSize).toBe(17);

      themeEngine.handleFontSizeInput('10');
      expect(themeEngine.fontSize).toBe(12);

      themeEngine.handleFontSizeInput('20');
      expect(themeEngine.fontSize).toBe(18);
    });
  });

  // ─── 6. SELECTOR DE CULORI DE ACCENT (6 SOVEREIGN ACCENTS) ─────────────────

  describe('6. Accent Color Options (Cyphr, Horizon Sky, Signal Emerald, Aether Violet, Solar Amber, Pulse Rose)', () => {
    it('should define all 6 sovereign accent colors in ACCENT_COLOR_OPTIONS', () => {
      expect(ACCENT_COLOR_OPTIONS.length).toBe(6);
      const ids = ACCENT_COLOR_OPTIONS.map((a: AccentColorOption) => a.id);
      expect(ids).toEqual([
        'cyphr',
        'sky',
        'signal',
        'aether',
        'amber',
        'crimson',
      ]);

      const colors = ACCENT_COLOR_OPTIONS.map((a: AccentColorOption) => a.hex);
      expect(colors).toContain('#00e5ff');
      expect(colors).toContain('#38bdf8');
      expect(colors).toContain('#10b981');
      expect(colors).toContain('#a855f7');
      expect(colors).toContain('#f59e0b');
      expect(colors).toContain('#f43f5e');
    });

    it('should set and get custom accent color override', () => {
      expect(themeEngine.getEffectiveAccentColor()).toBe('#38bdf8');

      themeEngine.setAccentColor('#f43f5e');
      expect(themeEngine.customAccentColor).toBe('#f43f5e');
      expect(themeEngine.getEffectiveAccentColor()).toBe('#f43f5e');

      themeEngine.setAccentColor('10b981');
      expect(themeEngine.customAccentColor).toBe('10b981');
      expect(themeEngine.getEffectiveAccentColor()).toBe('10b981');

      themeEngine.setAccentColor(null);
      expect(themeEngine.customAccentColor).toBeNull();
      expect(themeEngine.getEffectiveAccentColor()).toBe('#38bdf8');
    });

    it('should return accent colors via getAccentColors()', () => {
      const accents = themeEngine.getAccentColors();
      expect(accents.length).toBe(6);
      expect(accents[0].name).toBe('Cyphr Cyan');
      expect(accents[1].name).toBe('Horizon Sky');
      expect(accents[2].name).toBe('Signal Emerald');
      expect(accents[3].name).toBe('Aether Violet');
      expect(accents[4].name).toBe('Solar Amber');
      expect(accents[5].name).toBe('Pulse Rose');
    });
  });

  // ─── 7. COMUTAREA TIPOGRAFIEI (SANS / MONO) ──────────────────────────────────

  describe('7. Typography Toggle between Sans and Mono', () => {
    it('should toggle font family from sans to mono and back', () => {
      expect(themeEngine.fontFamily).toBe('sans');

      themeEngine.toggleFontFamily();
      expect(themeEngine.fontFamily).toBe('mono');

      themeEngine.toggleFontFamily();
      expect(themeEngine.fontFamily).toBe('sans');
    });

    it('should set font family explicitly with setFontFamily', () => {
      themeEngine.setFontFamily('mono');
      expect(themeEngine.fontFamily).toBe('mono');

      themeEngine.setFontFamily('sans');
      expect(themeEngine.fontFamily).toBe('sans');
    });
  });

  // ─── 8. GENERARE HTML: BUTON HEADER ȘI DISPLAY & THEME CUSTOMIZER MODAL ─────

  describe('8. HTML Rendering for Button and DisplaySettingsModal', () => {
    it('should render theme header button containing active theme details and Tailwind classes', () => {
      themeEngine.setTheme('matrix-monolith');
      themeEngine.setFontSize(16);

      const html = themeEngine.renderThemeButton();

      expect(html).toContain('id="btn-open-theme-matrix"');
      expect(html).toContain('OLED Pitch Black');
      expect(html).toContain('🖤');
      expect(html).toContain('data-action="theme.open"');
    });

    it('should render complete DisplaySettingsModal with font slider, 6 accent colors, background selector, and real-time live preview', () => {
      themeEngine.setTheme('alabaster-light');
      themeEngine.setFontSize(14);
      themeEngine.setFontFamily('sans');
      themeEngine.setAccentColor('#00e5ff');

      const modalHtml = themeEngine.renderDisplaySettingsModal();

      // Modal container & accessibility
      expect(modalHtml).toContain('role="dialog"');
      expect(modalHtml).toContain('aria-modal="true"');
      expect(modalHtml).toContain('Display & Theme Matrix');
      expect(modalHtml).toContain('2027 OKLCH Spatial Appearance');
      expect(modalHtml).toContain('OKLCH Accent Spectrum');

      // Accent colors rendered
      expect(modalHtml).toContain('Cyphr Cyan');
      expect(modalHtml).toContain('Horizon Sky');
      expect(modalHtml).toContain('Signal Emerald');
      expect(modalHtml).toContain('Aether Violet');
      expect(modalHtml).toContain('Solar Amber');
      expect(modalHtml).toContain('Pulse Rose');

      // Themes rendered
      expect(modalHtml).toContain('Mineral Basalt 2027');
      expect(modalHtml).toContain('Obsidian Cyber');
      expect(modalHtml).toContain('OLED Pitch Black');
      expect(modalHtml).toContain('Alabaster Daylight');
      expect(modalHtml).toContain('Tokyo Synthwave');
      expect(modalHtml).toContain('Solaris Gold');
      expect(modalHtml).toContain('Nordic Aurora');

      // Diagnostics section included
      expect(modalHtml).toContain('Local Crash Diagnostics');
    });

    it('should support renderThemeSelectorModal as alias to renderDisplaySettingsModal', () => {
      const modal1 = themeEngine.renderDisplaySettingsModal();
      const modal2 = themeEngine.renderThemeSelectorModal();
      expect(modal1).toBe(modal2);
    });

    it('should control modal open and close state via DisplaySettingsModal wrapper', () => {
      expect(displaySettingsModal.isOpen).toBe(false);

      displaySettingsModal.open();
      expect(displaySettingsModal.isOpen).toBe(true);

      displaySettingsModal.close();
      expect(displaySettingsModal.isOpen).toBe(false);

      displaySettingsModal.toggle();
      expect(displaySettingsModal.isOpen).toBe(true);

      displaySettingsModal.toggle();
      expect(displaySettingsModal.isOpen).toBe(false);

      const html = displaySettingsModal.render();
      expect(html).toContain('Display & Theme Matrix');
    });

    it('should instantiate independent ThemeEngine instances cleanly', () => {
      const customEngine = new ThemeEngine();
      expect(customEngine.currentThemeId).toBe('mineral-basalt');
      expect(customEngine.fontSize).toBe(15);
      expect(customEngine.fontFamily).toBe('sans');

      customEngine.setTheme('solar-amber');
      customEngine.setFontSize(18);
      customEngine.setFontFamily('mono');
      customEngine.setAccentColor('#f59e0b');

      expect(customEngine.currentThemeId).toBe('solar-amber');
      expect(customEngine.fontSize).toBe(18);
      expect(customEngine.fontFamily).toBe('mono');
      expect(customEngine.getEffectiveAccentColor()).toBe('#f59e0b');

      customEngine.resetToDefaults();
      expect(customEngine.currentThemeId).toBe('mineral-basalt');
      expect(customEngine.fontSize).toBe(15);
      expect(customEngine.fontFamily).toBe('sans');
      expect(customEngine.customAccentColor).toBeNull();
    });
  });
});
