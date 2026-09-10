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
    it('should initialize with default obsidian-cyber theme and standard typography', () => {
      expect(themeEngine.currentThemeId).toBe('obsidian-cyber');
      expect(themeEngine.fontSize).toBe(14);
      expect(themeEngine.fontFamily).toBe('sans');
      expect(themeEngine.isModalOpen).toBe(false);
      expect(themeEngine.customAccentColor).toBeNull();

      const current = themeEngine.getCurrentTheme();
      expect(current.id).toBe('obsidian-cyber');
      expect(current.name).toBe('Obsidian Cyber');
      expect(current.emoji).toBe('🌌');
      expect(current.accentColor).toBe('#00e5ff');
      expect(current.bgCanvas).toBe('#090a0f');
      expect(current.bgSurfaceBase).toBe('#12151c');
      expect(current.bgSurfaceRaised).toBe('#1a1f2e');
      expect(current.bgSurfaceOverlay).toBe('#222840');
      expect(current.textAccent).toBe('#00e5ff');
      expect(current.mode).toBe('dim');
    });

    it('should provide sovereign theme definitions including Alabaster Light in THEMES and getThemes()', () => {
      expect(THEMES.length).toBe(6);
      expect(themeEngine.getThemes().length).toBe(6);

      const themeIds = themeEngine.getThemes().map((t: ThemeDefinition) => t.id);
      expect(themeIds).toEqual([
        'obsidian-cyber',
        'matrix-monolith',
        'tokyo-neon',
        'solar-amber',
        'alabaster-light',
        'nordic-frost',
      ]);
    });

    it('should retrieve individual theme by ID correctly', () => {
      const theme = themeEngine.getThemeById('obsidian-cyber');
      expect(theme).toBeDefined();
      expect(theme?.name).toBe('Obsidian Cyber');
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
      expect(current.name).toBe('Alabaster Light');
      expect(current.emoji).toBe('☀️');
      expect(current.bgCanvas).toBe('#f8fafc');
      expect(current.bgSurfaceBase).toBe('#ffffff');
      expect(current.bgSurfaceRaised).toBe('#f1f5f9');
      expect(current.bgSurfaceOverlay).toBe('#e2e8f0');
      expect(current.accentColor).toBe('#4f46e5');
      expect(current.textAccent).toBe('#4f46e5');
      expect(current.mode).toBe('light');
      expect(current.badgeText).toBe('LIGHT MODE');
    });
  });

  // ─── 3. PURE OLED BLACK MODE (X LIGHTS OUT + MATRIX MONOLITH) ─────────────

  describe('3. Pure OLED Black Mode (X Lights Out + Matrix Monolith)', () => {
    it('should switch active theme to matrix-monolith and verify all OLED black properties', () => {
      themeEngine.setTheme('matrix-monolith');

      expect(themeEngine.currentThemeId).toBe('matrix-monolith');

      const current = themeEngine.getCurrentTheme();
      expect(current.id).toBe('matrix-monolith');
      expect(current.name).toBe('Matrix Monolith');
      expect(current.emoji).toBe('🌲');
      expect(current.accentColor).toBe('#22c55e');
      expect(current.bgCanvas).toBe('#030704');
      expect(current.bgSurfaceBase).toBe('#08140a');
      expect(current.bgSurfaceRaised).toBe('#0e2212');
      expect(current.bgSurfaceOverlay).toBe('#16321c');
      expect(current.textAccent).toBe('#22c55e');
      expect(current.borderAccent).toBe('rgba(34, 197, 94, 0.4)');
      expect(current.secondaryAccent).toBe('#10b981');
      expect(current.badgeText).toBe('OLED EMERALD');
      expect(current.mode).toBe('lights-out');
    });

    it('should fallback to obsidian-cyber if an invalid theme ID is passed', () => {
      themeEngine.setTheme('matrix-monolith');
      expect(themeEngine.currentThemeId).toBe('matrix-monolith');

      themeEngine.setTheme('invalid-unknown-theme');
      expect(themeEngine.currentThemeId).toBe('obsidian-cyber');
      expect(themeEngine.getCurrentTheme().id).toBe('obsidian-cyber');
    });
  });

  // ─── 4. COMUTAREA PE TOATE TEMELE ──────────────────────────────────────────

  describe('4. Switching to Solar Amber, Tokyo Neon, and Nordic Frost', () => {
    it('should switch to solar-amber and verify colors and emoji', () => {
      themeEngine.setTheme('solar-amber');

      expect(themeEngine.currentThemeId).toBe('solar-amber');
      const current = themeEngine.getCurrentTheme();
      expect(current.name).toBe('Solar Amber');
      expect(current.emoji).toBe('🌅');
      expect(current.accentColor).toBe('#f59e0b');
      expect(current.bgCanvas).toBe('#0c0906');
      expect(current.bgSurfaceBase).toBe('#16110b');
      expect(current.bgSurfaceRaised).toBe('#241b11');
      expect(current.bgSurfaceOverlay).toBe('#362818');
      expect(current.badgeText).toBe('SOLAR GOLD');
    });

    it('should switch to tokyo-neon and verify colors and emoji', () => {
      themeEngine.setTheme('tokyo-neon');

      expect(themeEngine.currentThemeId).toBe('tokyo-neon');
      const current = themeEngine.getCurrentTheme();
      expect(current.name).toBe('Tokyo Neon');
      expect(current.emoji).toBe('🌆');
      expect(current.accentColor).toBe('#f43f5e');
      expect(current.bgCanvas).toBe('#0d0714');
      expect(current.bgSurfaceBase).toBe('#160c22');
      expect(current.bgSurfaceRaised).toBe('#231236');
      expect(current.bgSurfaceOverlay).toBe('#331a4e');
      expect(current.badgeText).toBe('NEON MAGENTA');
    });

    it('should switch to nordic-frost and verify colors and emoji', () => {
      themeEngine.setTheme('nordic-frost');

      expect(themeEngine.currentThemeId).toBe('nordic-frost');
      const current = themeEngine.getCurrentTheme();
      expect(current.name).toBe('Nordic Frost');
      expect(current.emoji).toBe('❄️');
      expect(current.accentColor).toBe('#38bdf8');
      expect(current.bgCanvas).toBe('#080d16');
      expect(current.bgSurfaceBase).toBe('#0f172a');
      expect(current.bgSurfaceRaised).toBe('#1e293b');
      expect(current.bgSurfaceOverlay).toBe('#334155');
      expect(current.badgeText).toBe('ARCTIC FROST');
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

  // ─── 6. SELECTOR DE CULORI DE ACCENT (5 SOVEREIGN ACCENTS) ─────────────────

  describe('6. Accent Color Options (Electric Cyan, Terminal Emerald, Tokyo Magenta, Solar Amber, Glacial Frost)', () => {
    it('should define all 5 sovereign accent colors in ACCENT_COLOR_OPTIONS', () => {
      expect(ACCENT_COLOR_OPTIONS.length).toBe(5);
      const ids = ACCENT_COLOR_OPTIONS.map((a: AccentColorOption) => a.id);
      expect(ids).toEqual([
        'electric-cyan',
        'terminal-emerald',
        'tokyo-magenta',
        'solar-amber',
        'glacial-frost',
      ]);

      const colors = ACCENT_COLOR_OPTIONS.map((a: AccentColorOption) => a.hex);
      expect(colors).toContain('#00e5ff');
      expect(colors).toContain('#22c55e');
      expect(colors).toContain('#f43f5e');
      expect(colors).toContain('#f59e0b');
      expect(colors).toContain('#38bdf8');
    });

    it('should set and get custom accent color override', () => {
      expect(themeEngine.getEffectiveAccentColor()).toBe('#00e5ff');

      themeEngine.setAccentColor('#f43f5e');
      expect(themeEngine.customAccentColor).toBe('#f43f5e');
      expect(themeEngine.getEffectiveAccentColor()).toBe('#f43f5e');

      themeEngine.setAccentColor('22c55e');
      expect(themeEngine.customAccentColor).toBe('#22c55e');
      expect(themeEngine.getEffectiveAccentColor()).toBe('#22c55e');

      themeEngine.setAccentColor(null);
      expect(themeEngine.customAccentColor).toBeNull();
      expect(themeEngine.getEffectiveAccentColor()).toBe('#00e5ff');
    });

    it('should return accent colors via getAccentColors()', () => {
      const accents = themeEngine.getAccentColors();
      expect(accents.length).toBe(5);
      expect(accents[0].name).toBe('Electric Cyan');
      expect(accents[1].name).toBe('Terminal Emerald');
      expect(accents[2].name).toBe('Tokyo Magenta');
      expect(accents[3].name).toBe('Solar Amber');
      expect(accents[4].name).toBe('Glacial Frost');
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

      expect(html).toContain('id="aetheris-theme-header-btn"');
      expect(html).toContain('Matrix Monolith');
      expect(html).toContain('🌲');
      expect(html).toContain('16px');
      expect(html).toContain('bg-surface-raised');
      expect(html).toContain('hover:bg-surface-overlay');
      expect(html).toContain('window.themeEngine ? window.themeEngine.toggleModal() : null');
    });

    it('should render complete DisplaySettingsModal with font slider, 5 accent colors, background selector, and real-time live preview', () => {
      themeEngine.setTheme('alabaster-light');
      themeEngine.setFontSize(14);
      themeEngine.setFontFamily('sans');
      themeEngine.setAccentColor('#00e5ff');

      const modalHtml = themeEngine.renderDisplaySettingsModal();

      // Modal container & accessibility
      expect(modalHtml).toContain('role="dialog"');
      expect(modalHtml).toContain('aria-modal="true"');
      expect(modalHtml).toContain('Display & Theme Matrix');

      // Real-time Live Preview
      expect(modalHtml).toContain('Real-time Live Preview');
      expect(modalHtml).toContain('WCAG AAA PASS');
      expect(modalHtml).toContain('UREfy Sovereign');
      expect(modalHtml).toContain('Upvote');

      // All 5 Sovereign Accent colors rendered
      expect(modalHtml).toContain('Electric Cyan');
      expect(modalHtml).toContain('Terminal Emerald');
      expect(modalHtml).toContain('Tokyo Magenta');
      expect(modalHtml).toContain('Solar Amber');
      expect(modalHtml).toContain('Glacial Frost');

      // All themes rendered
      expect(modalHtml).toContain('Obsidian Cyber');
      expect(modalHtml).toContain('Matrix Monolith');
      expect(modalHtml).toContain('Tokyo Neon');
      expect(modalHtml).toContain('Solar Amber');
      expect(modalHtml).toContain('Alabaster Light');
      expect(modalHtml).toContain('Nordic Frost');

      // Font size slider & 4 Presets: Dense, Standard, Relaxed, Large
      expect(modalHtml).toContain('min="12"');
      expect(modalHtml).toContain('max="18"');
      expect(modalHtml).toContain('14px (Standard)');
      expect(modalHtml).toContain('Dense (12px)');
      expect(modalHtml).toContain('Standard (14px)');
      expect(modalHtml).toContain('Relaxed (16px)');
      expect(modalHtml).toContain('Large (18px)');

      // Typography options
      expect(modalHtml).toContain('Sans-Serif (Modern Inter)');
      expect(modalHtml).toContain('Monospace (Terminal)');
      expect(modalHtml).toContain('Active: <strong class="text-aether uppercase">sans</strong>');

      // Reset and close buttons
      expect(modalHtml).toContain('Reset Defaults');
      expect(modalHtml).toContain('Save & Close');
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
      expect(customEngine.currentThemeId).toBe('obsidian-cyber');
      expect(customEngine.fontSize).toBe(14);
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
      expect(customEngine.currentThemeId).toBe('obsidian-cyber');
      expect(customEngine.fontSize).toBe(14);
      expect(customEngine.fontFamily).toBe('sans');
      expect(customEngine.customAccentColor).toBeNull();
    });
  });
});
