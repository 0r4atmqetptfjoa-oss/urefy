import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CustomThemeBuilder,
  customThemeBuilder,
  COLOR_FIELDS,
  DEFAULT_THEME_PRESETS,
  type CustomTheme,
  type PresetPalette,
} from '../src/custom-theme-builder.js';

describe('Custom Theme Visual Builder & Real-time CSS Customizer', () => {
  let builder: CustomThemeBuilder;

  beforeEach(() => {
    // Clear localStorage and DOM elements if present
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    builder = new CustomThemeBuilder();
  });

  afterEach(() => {
    builder.closeModal();
    builder.closeImportModal();
  });

  // ─── 1. INITIALIZATION & CONSTANTS ──────────────────────────────────────────

  describe('1. Initialization & Constant Configurations', () => {
    it('should initialize with default draft values matching Obsidian Cyan palette', () => {
      expect(builder).toBeInstanceOf(CustomThemeBuilder);
      expect(builder.isOpen).toBe(false);

      const draft = builder.getResolvedDraft();
      expect(draft.name).toBe('My Sovereign Theme');
      expect(draft.author).toBe('0xCyphr...88fa');
      expect(draft.accentColor).toBe('#00e5ff');
      expect(draft.bgCanvas).toBe('#090a0f');
      expect(draft.bgSurfaceBase).toBe('#12151c');
      expect(draft.bgSurfaceRaised).toBe('#1a1f2e');
      expect(draft.textPrimary).toBe('#f1f5f9');
      expect(draft.textAccent).toBe('#00e5ff');
      expect(draft.borderAccent).toBe('#00e5ff');
      expect(draft.createdAt).toBeGreaterThan(0);
    });

    it('should export singleton instance customThemeBuilder properly', () => {
      expect(customThemeBuilder).toBeInstanceOf(CustomThemeBuilder);
      expect(customThemeBuilder.currentDraft).toBeDefined();
    });

    it('should provide exactly 7 standard COLOR_FIELDS with icons and labels', () => {
      expect(COLOR_FIELDS.length).toBe(7);

      const keys = COLOR_FIELDS.map((f) => f.key);
      expect(keys).toEqual([
        'accentColor',
        'bgCanvas',
        'bgSurfaceBase',
        'bgSurfaceRaised',
        'textPrimary',
        'textAccent',
        'borderAccent',
      ]);

      COLOR_FIELDS.forEach((f) => {
        expect(f.label).toBeDefined();
        expect(f.description).toBeDefined();
        expect(f.icon).toBeDefined();
        expect(f.defaultValue.startsWith('#')).toBe(true);
      });
    });

    it('should provide 6 curated DEFAULT_THEME_PRESETS', () => {
      expect(DEFAULT_THEME_PRESETS.length).toBe(6);

      const presetIds = DEFAULT_THEME_PRESETS.map((p) => p.id);
      expect(presetIds).toEqual([
        'preset-cyber-cyan',
        'preset-matrix-emerald',
        'preset-tokyo-magenta',
        'preset-solar-amber',
        'preset-aether-violet',
        'preset-crimson-red',
      ]);
    });
  });

  // ─── 2. COLOR UPDATES & PRESETS ─────────────────────────────────────

  describe('2. Color Updates & Preset Switcher', () => {
    it('should update individual color properties and sanitize hex values', () => {
      builder.updateColor('accentColor', '#ff0055');
      expect(builder.getResolvedDraft().accentColor).toBe('#ff0055');

      // Without '#' prefix — should automatically add it
      builder.updateColor('bgCanvas', '020408');
      expect(builder.getResolvedDraft().bgCanvas).toBe('#020408');

      builder.updateColor('bgSurfaceBase', '#0a101d');
      expect(builder.getResolvedDraft().bgSurfaceBase).toBe('#0a101d');

      builder.updateColor('bgSurfaceRaised', '#141e33');
      expect(builder.getResolvedDraft().bgSurfaceRaised).toBe('#141e33');

      builder.updateColor('textPrimary', '#ffffff');
      expect(builder.getResolvedDraft().textPrimary).toBe('#ffffff');

      builder.updateColor('textAccent', '#38bdf8');
      expect(builder.getResolvedDraft().textAccent).toBe('#38bdf8');

      builder.updateColor('borderAccent', '#0284c7');
      expect(builder.getResolvedDraft().borderAccent).toBe('#0284c7');
    });

    it('should update metadata properties (name and author)', () => {
      builder.updateMetadata('name', 'Galactic Obsidian');
      builder.updateMetadata('author', '0xArchon...1122');

      const draft = builder.getResolvedDraft();
      expect(draft.name).toBe('Galactic Obsidian');
      expect(draft.author).toBe('0xArchon...1122');
    });

    it('should load preset colors into draft when applyPreset is called', () => {
      builder.applyPreset('preset-matrix-emerald');

      const draft = builder.getResolvedDraft();
      expect(draft.name).toContain('Matrix Emerald');
      expect(draft.accentColor).toBe('#22c55e');
      expect(draft.bgCanvas).toBe('#030704');
      expect(draft.bgSurfaceBase).toBe('#08140a');
      expect(draft.bgSurfaceRaised).toBe('#0e2212');
      expect(draft.textAccent).toBe('#22c55e');
      expect(draft.borderAccent).toBe('#22c55e');
    });

    it('should ignore invalid preset IDs gracefully', () => {
      const before = builder.getResolvedDraft();
      builder.applyPreset('unknown-non-existent-preset');
      const after = builder.getResolvedDraft();
      expect(after.accentColor).toBe(before.accentColor);
    });

    it('should reset draft to original default values on resetDraft', () => {
      builder.updateColor('accentColor', '#ff0000');
      builder.updateMetadata('name', 'Temp Custom');
      expect(builder.getResolvedDraft().accentColor).toBe('#ff0000');

      builder.resetDraft();
      const reset = builder.getResolvedDraft();
      expect(reset.accentColor).toBe('#00e5ff');
      expect(reset.name).toBe('My Sovereign Theme');
    });
  });

  // ─── 3. THEME PERSISTENCE & COLLECTION MANAGEMENT ──────────────────────────────────

  describe('3. Theme Persistence & Collection Management', () => {
    it('should save active draft into savedThemes collection with saveDraftAsTheme', () => {
      expect(builder.savedThemes.length).toBe(0);

      builder.updateColor('accentColor', '#a855f7');
      builder.saveDraftAsTheme('Purple Aether Theme');

      expect(builder.savedThemes.length).toBe(1);
      const saved = builder.savedThemes[0];
      expect(saved.name).toBe('Purple Aether Theme');
      expect(saved.accentColor).toBe('#a855f7');
      expect(saved.id.startsWith('theme-user-')).toBe(true);
      expect(saved.createdAt).toBeGreaterThan(0);
    });

    it('should load a saved theme back into draft using loadSavedTheme', () => {
      builder.updateColor('accentColor', '#f59e0b');
      builder.saveDraftAsTheme('Solar Glow');
      const savedId = builder.savedThemes[0].id;

      // Modify draft
      builder.updateColor('accentColor', '#ef4444');
      expect(builder.getResolvedDraft().accentColor).toBe('#ef4444');

      // Reload saved theme
      builder.loadSavedTheme(savedId);
      expect(builder.getResolvedDraft().accentColor).toBe('#f59e0b');
      expect(builder.getResolvedDraft().name).toBe('Solar Glow');
    });

    it('should duplicate an existing theme in collection with duplicateSavedTheme', () => {
      builder.saveDraftAsTheme('Original Theme');
      expect(builder.savedThemes.length).toBe(1);
      const originalId = builder.savedThemes[0].id;

      builder.duplicateSavedTheme(originalId);
      expect(builder.savedThemes.length).toBe(2);
      expect(builder.savedThemes[0].name).toBe('Original Theme (Copy)');
      expect(builder.savedThemes[0].id).not.toBe(originalId);
    });

    it('should delete a saved theme with deleteSavedTheme', () => {
      builder.saveDraftAsTheme('Theme A');
      builder.saveDraftAsTheme('Theme B');
      expect(builder.savedThemes.length).toBe(2);

      const toDeleteId = builder.savedThemes[0].id;
      builder.deleteSavedTheme(toDeleteId);

      expect(builder.savedThemes.length).toBe(1);
      expect(builder.savedThemes.find((t) => t.id === toDeleteId)).toBeUndefined();
    });
  });

  // ─── 4. JSON IMPORT AND EXPORT ──────────────────────────────────────────────

  describe('4. Theme JSON Import / Export Engine', () => {
    it('should export theme and all saved themes as formatted JSON with exportThemeAsJSON', () => {
      builder.updateColor('accentColor', '#22c55e');
      builder.saveDraftAsTheme('Saved Emerald');

      const jsonStr = builder.exportThemeAsJSON();
      expect(typeof jsonStr).toBe('string');

      const parsed = JSON.parse(jsonStr);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.generator).toContain('Aetheris Omni-Sphere');
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.theme).toBeDefined();
      expect(parsed.theme.accentColor).toBe('#22c55e');
      expect(Array.isArray(parsed.allSavedThemes)).toBe(true);
      expect(parsed.allSavedThemes.length).toBe(1);
    });

    it('should import a full exported theme bundle from JSON string', () => {
      const exportPayload = {
        version: '1.0.0',
        generator: 'Aetheris Omni-Sphere Custom Theme Builder',
        exportedAt: new Date().toISOString(),
        theme: {
          id: 'imported-theme-1',
          name: 'Cyber Samurai Magenta',
          author: '0xRonin',
          accentColor: '#f43f5e',
          bgCanvas: '#0d060f',
          bgSurfaceBase: '#180b1e',
          bgSurfaceRaised: '#25112e',
          textPrimary: '#fdf2f8',
          textAccent: '#f43f5e',
          borderAccent: '#f43f5e',
          createdAt: Date.now(),
        },
        allSavedThemes: [
          {
            id: 'saved-extra-1',
            name: 'Extra Saved Theme',
            author: '0xExtra',
            accentColor: '#10b981',
            bgCanvas: '#020617',
            bgSurfaceBase: '#0f172a',
            bgSurfaceRaised: '#1e293b',
            textPrimary: '#f8fafc',
            textAccent: '#10b981',
            borderAccent: '#10b981',
            createdAt: Date.now(),
          },
        ],
      };

      builder.importThemeFromJSON(JSON.stringify(exportPayload));

      expect(builder.getResolvedDraft().name).toBe('Cyber Samurai Magenta');
      expect(builder.getResolvedDraft().accentColor).toBe('#f43f5e');
      expect(builder.savedThemes.length).toBe(1);
      expect(builder.savedThemes[0].name).toBe('Extra Saved Theme');
    });

    it('should import a single raw theme object from JSON', () => {
      const singleTheme = {
        name: 'Single Nordic Frost',
        author: '0xViking',
        accentColor: '#38bdf8',
        bgCanvas: '#080d14',
        bgSurfaceBase: '#0f172a',
        bgSurfaceRaised: '#1e293b',
        textPrimary: '#f0f9ff',
        textAccent: '#38bdf8',
        borderAccent: '#38bdf8',
      };

      builder.importThemeFromJSON(JSON.stringify(singleTheme));
      expect(builder.getResolvedDraft().name).toBe('Single Nordic Frost');
      expect(builder.getResolvedDraft().accentColor).toBe('#38bdf8');
    });

    it('should import an array of theme objects from JSON', () => {
      const themesArray = [
        {
          name: 'Batch Theme 1',
          author: '0xBatch',
          accentColor: '#ec4899',
          bgCanvas: '#0f050d',
          bgSurfaceBase: '#1f0b1a',
          bgSurfaceRaised: '#2e1227',
          textPrimary: '#fdf2f8',
          textAccent: '#ec4899',
          borderAccent: '#ec4899',
        },
        {
          name: 'Batch Theme 2',
          author: '0xBatch',
          accentColor: '#8b5cf6',
          bgCanvas: '#090514',
          bgSurfaceBase: '#130b29',
          bgSurfaceRaised: '#1f1242',
          textPrimary: '#faf5ff',
          textAccent: '#8b5cf6',
          borderAccent: '#8b5cf6',
        },
      ];

      builder.importThemeFromJSON(JSON.stringify(themesArray));
      expect(builder.savedThemes.length).toBe(2);
      expect(builder.getResolvedDraft().name).toBe('Batch Theme 1');
    });

    it('should handle malformed JSON and empty strings without crashing', () => {
      expect(() => builder.importThemeFromJSON('')).not.toThrow();
      expect(() => builder.importThemeFromJSON('{ invalid json ...')).not.toThrow();
      expect(() => builder.importThemeFromJSON(JSON.stringify({ notATheme: true }))).not.toThrow();
    });
  });

  // ─── 5. HTML RENDERING AND MODAL CONTROLS ───────────────────────────────────

  describe('5. HTML Rendering & Modal Controls', () => {
    it('should render builder trigger button with appropriate styling and icon', () => {
      const buttonHtml = builder.renderBuilderButton();

      expect(buttonHtml).toContain('id="aetheris-custom-theme-builder-btn"');
      expect(buttonHtml).toContain('🎨');
      expect(buttonHtml).toContain('Custom Theme');
      expect(buttonHtml).toContain('BUILDER');
      expect(buttonHtml).toContain('window.customThemeBuilder.openModal');
    });

    it('should render complete 2-column builder modal HTML with controls and live preview', () => {
      const modalHtml = builder.renderBuilderModal();

      // Modal shell and header
      expect(modalHtml).toContain('Aetheris Custom Theme Studio');
      expect(modalHtml).toContain('VISUAL BUILDER');
      expect(modalHtml).toContain('role="dialog"');
      expect(modalHtml).toContain('id="btn-close-custom-theme-builder"');
      expect(modalHtml).toContain('window.__aetheris_close_custom_theme_builder');

      // Left Column Controls
      expect(modalHtml).toContain('theme-builder-name-input');
      expect(modalHtml).toContain('theme-builder-author-input');
      expect(modalHtml).toContain('Preset Palettes (Quick Presets)');
      expect(modalHtml).toContain('CSS Color Variables');
      expect(modalHtml).toContain('theme-input-accentColor');
      expect(modalHtml).toContain('theme-input-bgCanvas');
      expect(modalHtml).toContain('theme-input-bgSurfaceBase');
      expect(modalHtml).toContain('theme-input-bgSurfaceRaised');
      expect(modalHtml).toContain('theme-input-textPrimary');
      expect(modalHtml).toContain('theme-input-textAccent');
      expect(modalHtml).toContain('theme-input-borderAccent');
      expect(modalHtml).toContain('Save Theme');
      expect(modalHtml).toContain('Reset Draft');
      expect(modalHtml).toContain('Share & Backup JSON');

      // Right Column Live Preview Box
      expect(modalHtml).toContain('id="custom-theme-live-preview-box"');
      expect(modalHtml).toContain('LIVE COMPONENT PREVIEW');
      expect(modalHtml).toContain('ZK-STARK');
      expect(modalHtml).toContain('142 MERIT');
      expect(modalHtml).toContain('UI Buttons & Controls Showcase');
      expect(modalHtml).toContain('Sovereign P2P Channel: #general-mesh');
      expect(modalHtml).toContain('E2EE ACTIVE');
      expect(modalHtml).toContain('Your Saved Themes Collection');

      // Footer
      expect(modalHtml).toContain('Live Engine Ready');
      expect(modalHtml).toContain('Save as Theme');
      expect(modalHtml).toContain('Done & Close');
    });

    it('should toggle and manage modal visibility state', () => {
      expect(builder.isOpen).toBe(false);

      builder.openModal();
      expect(builder.isOpen).toBe(true);

      builder.closeModal();
      expect(builder.isOpen).toBe(false);

      builder.toggleModal();
      expect(builder.isOpen).toBe(true);

      builder.toggleModal();
      expect(builder.isOpen).toBe(false);
    });
  });
});
