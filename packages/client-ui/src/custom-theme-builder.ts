/**
 * @file custom-theme-builder.ts
 * @package @aetheris/client-ui
 * @description Visual custom theme builder for the Aetheris Omni-Sphere platform.
 * Enables live configuration of CSS color palettes, interactive preview on mini post cards,
 * buttons, and chat, local storage persistence, and fully functional JSON import/export.
 * 100% functional, strict TypeScript, self-contained, no external libraries.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';

// ─── INTERFACES AND TYPES ─────────────────────────────────────────────────────────

export interface CustomTheme {
  id: string;
  name: string;
  author: string;
  accentColor: string;
  bgCanvas: string;
  bgSurfaceBase: string;
  bgSurfaceRaised: string;
  textPrimary: string;
  textAccent: string;
  borderAccent: string;
  createdAt: number;
}

export interface ColorFieldDefinition {
  key: keyof CustomTheme;
  label: string;
  description: string;
  icon: string;
  defaultValue: string;
}

export interface PresetPalette {
  id: string;
  name: string;
  emoji: string;
  theme: Omit<CustomTheme, 'id' | 'createdAt'>;
}

// ─── CONSTANTS AND DEFAULT PRESETS ───────────────────────────────────────────

export const COLOR_FIELDS: ColorFieldDefinition[] = [
  {
    key: 'accentColor',
    label: 'Primary Accent Color',
    description: 'Base accents, primary buttons, glow effects, and interactive elements.',
    icon: '⚡',
    defaultValue: '#00e5ff',
  },
  {
    key: 'bgCanvas',
    label: 'Canvas Background (Global)',
    description: 'The background color of the entire application and background space.',
    icon: '🌌',
    defaultValue: '#090a0f',
  },
  {
    key: 'bgSurfaceBase',
    label: 'Base Surface',
    description: 'Background for main panels, feed, and navigation.',
    icon: '🏢',
    defaultValue: '#12151c',
  },
  {
    key: 'bgSurfaceRaised',
    label: 'Raised Surface',
    description: 'Post cards, floating containers, and elevated modules.',
    icon: '📦',
    defaultValue: '#1a1f2e',
  },
  {
    key: 'textPrimary',
    label: 'Primary Text',
    description: 'Body text for posts, messages, and UI labels.',
    icon: '✍️',
    defaultValue: '#f1f5f9',
  },
  {
    key: 'textAccent',
    label: 'Accent Text',
    description: 'Text for active elements, links, and UI highlights.',
    icon: '✨',
    defaultValue: '#00e5ff',
  },
  {
    key: 'borderAccent',
    label: 'Accent Border Color',
    description: 'Borders for active elements, focus rings, and separators.',
    icon: '🔲',
    defaultValue: '#00e5ff',
  },
];

export const DEFAULT_THEME_PRESETS: PresetPalette[] = [
  {
    id: 'preset-cyber-cyan',
    name: 'Obsidian Cyan',
    emoji: '🌌',
    theme: {
      name: 'Obsidian Cyan',
      author: 'Aetheris Core',
      accentColor: '#00e5ff',
      bgCanvas: '#090a0f',
      bgSurfaceBase: '#12151c',
      bgSurfaceRaised: '#1a1f2e',
      textPrimary: '#f1f5f9',
      textAccent: '#00e5ff',
      borderAccent: '#00e5ff',
    },
  },
  {
    id: 'preset-matrix-emerald',
    name: 'Matrix Emerald',
    emoji: '🌲',
    theme: {
      name: 'Matrix Emerald',
      author: 'Terminal Ops',
      accentColor: '#22c55e',
      bgCanvas: '#030704',
      bgSurfaceBase: '#08140a',
      bgSurfaceRaised: '#0e2212',
      textPrimary: '#ecfdf5',
      textAccent: '#22c55e',
      borderAccent: '#22c55e',
    },
  },
  {
    id: 'preset-tokyo-magenta',
    name: 'Tokyo Neon',
    emoji: '🌆',
    theme: {
      name: 'Tokyo Neon',
      author: 'Cyber Samurai',
      accentColor: '#f43f5e',
      bgCanvas: '#0d060f',
      bgSurfaceBase: '#180b1e',
      bgSurfaceRaised: '#25112e',
      textPrimary: '#fdf2f8',
      textAccent: '#f43f5e',
      borderAccent: '#f43f5e',
    },
  },
  {
    id: 'preset-solar-amber',
    name: 'Solar Amber',
    emoji: '🌅',
    theme: {
      name: 'Solar Amber',
      author: 'Solaris DAO',
      accentColor: '#f59e0b',
      bgCanvas: '#0d0905',
      bgSurfaceBase: '#17120a',
      bgSurfaceRaised: '#241b10',
      textPrimary: '#fffbeb',
      textAccent: '#f59e0b',
      borderAccent: '#f59e0b',
    },
  },
  {
    id: 'preset-aether-violet',
    name: 'Aetheris Sovereign',
    emoji: '🔮',
    theme: {
      name: 'Aetheris Sovereign',
      author: 'ZK Sentinel',
      accentColor: '#a855f7',
      bgCanvas: '#080710',
      bgSurfaceBase: '#100e1f',
      bgSurfaceRaised: '#191630',
      textPrimary: '#faf5ff',
      textAccent: '#a855f7',
      borderAccent: '#a855f7',
    },
  },
  {
    id: 'preset-crimson-red',
    name: 'Crimson Protocol',
    emoji: '🩸',
    theme: {
      name: 'Crimson Protocol',
      author: 'Red Fleet',
      accentColor: '#ef4444',
      bgCanvas: '#0e0606',
      bgSurfaceBase: '#1a0a0a',
      bgSurfaceRaised: '#291010',
      textPrimary: '#fef2f2',
      textAccent: '#ef4444',
      borderAccent: '#ef4444',
    },
  },
];

// ─── MAIN CUSTOM THEME BUILDER CLASS ─────────────────────────────────────

export class CustomThemeBuilder {
  /** Current draft being edited */
  public currentDraft: Partial<CustomTheme> = {};

  /** List of saved persisted themes */
  public savedThemes: CustomTheme[] = [];

  /** Visibility state of the builder modal */
  public isOpen: boolean = false;

  private readonly STORAGE_KEY: string = 'aetheris_custom_themes_v1';
  private readonly DRAFT_STORAGE_KEY: string = 'aetheris_custom_theme_draft_v1';
  private readonly STYLE_ELEMENT_ID: string = 'aetheris-custom-theme-live-css';
  private readonly MODAL_CONTAINER_ID: string = 'aetheris-custom-theme-modal-container';
  private readonly IMPORT_MODAL_ID: string = 'aetheris-theme-import-submodal';

  constructor() {
    this.initDefaultDraft();
    this.loadSavedThemes();
    this.loadDraftFromStorage();
    this.registerGlobalInstance();
    this.attachKeyboardListeners();
  }

  // ─── INITIALIZATION AND GETTERS ──────────────────────────────────────────────────

  /**
   * Initializes draft with default Obsidian Cyan values.
   */
  private initDefaultDraft(): void {
    this.currentDraft = {
      id: `custom-draft-${Date.now()}`,
      name: 'My Sovereign Theme',
      author: '0xCyphr...88fa',
      accentColor: '#00e5ff',
      bgCanvas: '#090a0f',
      bgSurfaceBase: '#12151c',
      bgSurfaceRaised: '#1a1f2e',
      textPrimary: '#f1f5f9',
      textAccent: '#00e5ff',
      borderAccent: '#00e5ff',
      createdAt: Date.now(),
    };
  }

  /**
   * Returns a copy of the current draft populated with safe fallback values.
   */
  public getResolvedDraft(): CustomTheme {
    return {
      id: this.currentDraft.id || `custom-${Date.now()}`,
      name: (this.currentDraft.name || 'Custom Theme').trim(),
      author: (this.currentDraft.author || 'Anonymous').trim(),
      accentColor: this.sanitizeHex(this.currentDraft.accentColor, '#00e5ff'),
      bgCanvas: this.sanitizeHex(this.currentDraft.bgCanvas, '#090a0f'),
      bgSurfaceBase: this.sanitizeHex(this.currentDraft.bgSurfaceBase, '#12151c'),
      bgSurfaceRaised: this.sanitizeHex(this.currentDraft.bgSurfaceRaised, '#1a1f2e'),
      textPrimary: this.sanitizeHex(this.currentDraft.textPrimary, '#f1f5f9'),
      textAccent: this.sanitizeHex(this.currentDraft.textAccent, '#00e5ff'),
      borderAccent: this.sanitizeHex(this.currentDraft.borderAccent, '#00e5ff'),
      createdAt: this.currentDraft.createdAt || Date.now(),
    };
  }

  // ─── COLOR UPDATES AND LIVE EDITING ────────────────────────────────────────

  /**
   * Updates a color property of the draft and applies it live instantly.
   * @param property The CustomTheme property to update.
   * @param color The color value (HEX format).
   */
  public updateColor(property: keyof CustomTheme, color: string): void {
    if (!color) return;

    let sanitized = color.trim();
    if (!sanitized.startsWith('#') && /^[0-9A-Fa-f]{3,8}$/.test(sanitized)) {
      sanitized = '#' + sanitized;
    }

    (this.currentDraft as Record<string, unknown>)[property] = sanitized;

    this.saveDraftToStorage();
    this.applyDraftLive();
    this.syncFormInputValues(property, sanitized);
    this.updatePreviewElements();
  }

  /**
   * Updates a generic metadata text field in the draft (name, author).
   */
  public updateMetadata(field: 'name' | 'author', value: string): void {
    this.currentDraft[field] = value;
    this.saveDraftToStorage();
    this.updatePreviewElements();
  }

  /**
   * Loads a color preset directly into the draft and applies it live.
   */
  public applyPreset(presetId: string): void {
    const preset = DEFAULT_THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    this.currentDraft = {
      ...this.currentDraft,
      name: `${preset.theme.name} (Custom)`,
      accentColor: preset.theme.accentColor,
      bgCanvas: preset.theme.bgCanvas,
      bgSurfaceBase: preset.theme.bgSurfaceBase,
      bgSurfaceRaised: preset.theme.bgSurfaceRaised,
      textPrimary: preset.theme.textPrimary,
      textAccent: preset.theme.textAccent,
      borderAccent: preset.theme.borderAccent,
    };

    this.saveDraftToStorage();
    this.applyDraftLive();
    this.refreshModalContent();
    this.showToastNotification(`Preset "${preset.name}" loaded into draft!`);
  }

  /**
   * Resets the draft to default values.
   */
  public resetDraft(): void {
    this.initDefaultDraft();
    this.saveDraftToStorage();
    this.applyDraftLive();
    this.refreshModalContent();
    this.showToastNotification('Draft has been reset to default values.');
  }

  // ─── LIVE DOM APPLICATION AND STYLE INJECTION ─────────────────────────────────

  /**
   * Applies the draft theme immediately to the interface for global DOM preview.
   */
  public applyDraftLive(): void {
    if (typeof document === 'undefined') return;

    const theme = this.getResolvedDraft();
    const docEl = document.documentElement;

    // 1. Set theme attributes on <html>
    docEl.setAttribute('data-theme', 'custom-live-draft');

    // 2. Set CSS variables on :root
    docEl.style.setProperty('--color-accent', theme.accentColor);
    docEl.style.setProperty('--color-accent-text', theme.textAccent);
    docEl.style.setProperty('--color-accent-border', theme.borderAccent);
    docEl.style.setProperty('--bg-canvas', theme.bgCanvas);
    docEl.style.setProperty('--bg-surface-base', theme.bgSurfaceBase);
    docEl.style.setProperty('--bg-surface-raised', theme.bgSurfaceRaised);
    docEl.style.setProperty('--text-primary', theme.textPrimary);
    docEl.style.setProperty('--text-accent', theme.textAccent);
    docEl.style.setProperty('--border-accent', theme.borderAccent);

    // 3. Apply to document.body
    if (document.body) {
      document.body.style.backgroundColor = theme.bgCanvas;
      document.body.style.color = theme.textPrimary;
    }

    // 4. Inject / Override Dynamic Style Tag
    let styleTag = document.getElementById(this.STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = this.STYLE_ELEMENT_ID;
      document.head.appendChild(styleTag);
    }

    const cssRules = `
      :root {
        --color-accent: ${theme.accentColor};
        --color-accent-text: ${theme.textAccent};
        --color-accent-border: ${theme.borderAccent};
        --bg-canvas: ${theme.bgCanvas};
        --bg-surface-base: ${theme.bgSurfaceBase};
        --bg-surface-raised: ${theme.bgSurfaceRaised};
        --text-primary: ${theme.textPrimary};
        --text-accent: ${theme.textAccent};
        --border-accent: ${theme.borderAccent};
      }

      /* Dynamic overrides for live draft surfaces */
      [data-theme="custom-live-draft"] .bg-canvas {
        background-color: ${theme.bgCanvas} !important;
      }

      [data-theme="custom-live-draft"] .bg-surface-base {
        background-color: ${theme.bgSurfaceBase} !important;
      }

      [data-theme="custom-live-draft"] .bg-surface-raised {
        background-color: ${theme.bgSurfaceRaised} !important;
      }

      /* Dynamic glow & accents */
      .custom-theme-live-accent {
        color: ${theme.textAccent} !important;
      }

      .custom-theme-live-bg-accent {
        background-color: ${theme.accentColor} !important;
      }

      .custom-theme-live-border {
        border-color: ${theme.borderAccent} !important;
      }

      .custom-theme-glow {
        box-shadow: 0 0 20px ${theme.accentColor}40 !important;
      }
    `;

    styleTag.textContent = cssRules;

    // 5. Emit custom event in application
    this.dispatchCustomEvent('aetheris:custom-theme-applied', { theme });
  }

  // ─── THEME SAVING, MANAGEMENT AND PERSISTENCE ─────────────────────────────────────

  /**
   * Saves the draft theme to the saved themes collection and persists it.
   * @param name Optional name specified for saving.
   */
  public saveDraftAsTheme(name?: string): void {
    const draft = this.getResolvedDraft();
    const finalName = (name || this.currentDraft.name || 'My Custom Theme').trim();

    if (!finalName) {
      this.showToastNotification('Please enter a valid theme name.', 'error');
      return;
    }

    const newTheme: CustomTheme = {
      ...draft,
      id: `theme-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: finalName,
      author: (this.currentDraft.author || '0xCyphr...88fa').trim(),
      createdAt: Date.now(),
    };

    this.savedThemes.unshift(newTheme);
    this.persistSavedThemes();
    this.refreshModalContent();
    this.showToastNotification(`Theme "${newTheme.name}" saved successfully!`);
  }

  /**
   * Loads a previously saved theme into the draft and applies it live.
   */
  public loadSavedTheme(id: string): void {
    const theme = this.savedThemes.find((t) => t.id === id);
    if (!theme) {
      this.showToastNotification('Requested theme not found.', 'error');
      return;
    }

    this.currentDraft = { ...theme };
    this.saveDraftToStorage();
    this.applyDraftLive();
    this.refreshModalContent();
    this.showToastNotification(`Theme "${theme.name}" loaded.`);
  }

  /**
   * Deletes a saved theme from the collection.
   */
  public deleteSavedTheme(id: string): void {
    const index = this.savedThemes.findIndex((t) => t.id === id);
    if (index === -1) return;

    const [deleted] = this.savedThemes.splice(index, 1);
    this.persistSavedThemes();
    this.refreshModalContent();
    this.showToastNotification(`Theme "${deleted.name}" deleted.`);
  }

  /**
   * Duplicates an existing theme in the collection.
   */
  public duplicateSavedTheme(id: string): void {
    const theme = this.savedThemes.find((t) => t.id === id);
    if (!theme) return;

    const duplicated: CustomTheme = {
      ...theme,
      id: `theme-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${theme.name} (Copy)`,
      createdAt: Date.now(),
    };

    this.savedThemes.unshift(duplicated);
    this.persistSavedThemes();
    this.refreshModalContent();
    this.showToastNotification(`Theme duplicated: "${duplicated.name}"`);
  }

  // ─── JSON IMPORT AND EXPORT ────────────────────────────────────────────────────

  /**
   * Exports draft theme or all themes as a formatted JSON string.
   */
  public exportThemeAsJSON(): string {
    const draft = this.getResolvedDraft();
    const payload = {
      version: '1.0.0',
      generator: 'Aetheris Omni-Sphere Custom Theme Builder',
      exportedAt: new Date().toISOString(),
      theme: draft,
      allSavedThemes: this.savedThemes,
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Exports only the current draft theme as a downloadable JSON file in browser.
   */
  public downloadThemeJSON(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const draft = this.getResolvedDraft();
    const jsonContent = JSON.stringify(draft, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const safeName = draft.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const link = document.createElement('a');
    link.href = url;
    link.download = `aetheris-theme-${safeName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToastNotification(`File "${safeName}.json" downloaded.`);
  }

  /**
   * Copies the current theme JSON structure to clipboard.
   */
  public copyJSONToClipboard(): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      this.showToastNotification('Clipboard API unavailable.', 'error');
      return;
    }

    const draft = this.getResolvedDraft();
    const jsonString = JSON.stringify(draft, null, 2);

    navigator.clipboard
      .writeText(jsonString)
      .then(() => {
        this.showToastNotification('Theme JSON copied to clipboard!');
      })
      .catch((err) => {
        console.error('[CustomThemeBuilder] Error copying to clipboard:', err);
        this.showToastNotification('Could not copy JSON.', 'error');
      });
  }

  /**
   * Imports a theme or theme list from a validated JSON string.
   * @param json JSON string containing theme or theme bundle.
   */
  public importThemeFromJSON(json: string): void {
    if (!json || typeof json !== 'string') {
      this.showToastNotification('Invalid JSON format: text is empty.', 'error');
      return;
    }

    try {
      const parsed = JSON.parse(json.trim());
      let candidateTheme: Partial<CustomTheme> | null = null;
      let importedCount = 0;

      // Case 1: Direct array of theme objects
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (this.isValidThemeObject(item)) {
            this.savedThemes.unshift(item);
            importedCount++;
            if (!candidateTheme) candidateTheme = item;
          }
        }
      } else if (parsed && typeof parsed === 'object') {
        // Case 2: Full package exported with 'theme' or 'allSavedThemes'
        if (Array.isArray(parsed.allSavedThemes)) {
          for (const item of parsed.allSavedThemes) {
            if (this.isValidThemeObject(item)) {
              this.savedThemes.unshift(item);
              importedCount++;
            }
          }
        }

        if (parsed.theme && this.isValidThemeObject(parsed.theme)) {
          candidateTheme = parsed.theme;
        } else if (this.isValidThemeObject(parsed)) {
          candidateTheme = parsed;
        }
      }

      if (!candidateTheme && importedCount === 0) {
        throw new Error('No valid Aetheris theme object found in JSON.');
      }

      if (candidateTheme) {
        this.currentDraft = {
          ...candidateTheme,
          id: `custom-imported-${Date.now()}`,
          name: candidateTheme.name || 'Imported Theme',
        };
        this.saveDraftToStorage();
        this.applyDraftLive();
      }

      this.persistSavedThemes();
      this.refreshModalContent();
      this.closeImportModal();
      this.showToastNotification(
        `Import successful! ${importedCount > 0 ? `(${importedCount} saved themes)` : ''}`
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error parsing JSON.';
      console.error('[CustomThemeBuilder] Error importing JSON:', err);
      this.showToastNotification(`Import error: ${errMsg}`, 'error');
    }
  }

  /**
   * Opens native file selector for direct `.json` import.
   */
  public triggerFileInput(): void {
    if (typeof document === 'undefined') return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          this.importThemeFromJSON(content);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ─── MODAL CONTROL AND VISIBILITY ────────────────────────────────────────────

  /**
   * Opens the full visual configuration modal.
   */
  public openModal(): void {
    this.isOpen = true;
    if (typeof document === 'undefined') return;

    let container = document.getElementById(this.MODAL_CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = this.MODAL_CONTAINER_ID;
      document.body.appendChild(container);
    }

    container.innerHTML = this.renderBuilderModal();
    container.style.display = 'block';

    this.applyDraftLive();

    const modalEl = container.querySelector('[role="dialog"]') as HTMLElement | null;
    if (modalEl) {
      modalEl.focus();
    }
  }

  /**
   * Closes the builder modal.
   */
  public closeModal(): void {
    this.isOpen = false;
    if (typeof document === 'undefined') return;

    const container = document.getElementById(this.MODAL_CONTAINER_ID);
    if (container) {
      container.innerHTML = '';
      container.style.display = 'none';
    }
  }

  /**
   * Toggles modal state.
   */
  public toggleModal(): void {
    if (this.isOpen) {
      this.closeModal();
    } else {
      this.openModal();
    }
  }

  /**
   * Opens manual JSON text insertion dialog.
   */
  public openImportModal(): void {
    if (typeof document === 'undefined') return;

    let subModal = document.getElementById(this.IMPORT_MODAL_ID);
    if (!subModal) {
      subModal = document.createElement('div');
      subModal.id = this.IMPORT_MODAL_ID;
      document.body.appendChild(subModal);
    }

    subModal.innerHTML = `
      <div class="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
        <div class="bg-surface-base border border-cyphr/40 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center space-x-2">
              <span class="text-xl text-cyphr">📥</span>
              <h3 class="text-sm font-bold text-white font-sans">Import Theme from JSON</h3>
            </div>
            <button
              type="button"
              onclick="window.customThemeBuilder ? window.customThemeBuilder.closeImportModal() : null"
              class="w-7 h-7 rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-white flex items-center justify-center text-xs"
            >✕</button>
          </div>

          <p class="text-xs text-slate-300">
            Paste the theme JSON code below or use the file upload option:
          </p>

          <textarea
            id="aetheris-import-json-textarea"
            rows="8"
            placeholder='{\\n  "name": "Custom Theme",\\n  "accentColor": "#00e5ff",\\n  "bgCanvas": "#090a0f",\\n  ...\\n}'
            class="w-full p-3 rounded-xl bg-canvas border border-white/10 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyphr focus:ring-1 focus:ring-cyphr placeholder-slate-600 resize-none custom-scrollbar"
          ></textarea>

          <div class="flex items-center justify-between pt-2">
            <button
              type="button"
              onclick="window.customThemeBuilder ? window.customThemeBuilder.triggerFileInput() : null"
              class="px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-white/10 text-xs text-slate-300 flex items-center space-x-1.5"
            >
              <span>📁</span>
              <span>Choose .json file</span>
            </button>

            <div class="flex items-center space-x-2">
              <button
                type="button"
                onclick="window.customThemeBuilder ? window.customThemeBuilder.closeImportModal() : null"
                class="px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onclick="
                  const el = document.getElementById('aetheris-import-json-textarea');
                  if (el && window.customThemeBuilder) {
                    window.customThemeBuilder.importThemeFromJSON(el.value);
                  }
                "
                class="px-4 py-1.5 rounded-lg bg-cyphr hover:bg-cyphr/90 text-black text-xs font-bold shadow-md"
              >
                Process Import
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    subModal.style.display = 'block';
  }

  /**
   * Closes JSON import dialog.
   */
  public closeImportModal(): void {
    if (typeof document === 'undefined') return;
    const subModal = document.getElementById(this.IMPORT_MODAL_ID);
    if (subModal) {
      subModal.innerHTML = '';
      subModal.style.display = 'none';
    }
  }

  // ─── BUTTON & MAIN MODAL RENDERING ────────────────────────────────────────

  /**
   * Generates compact `🎨 Custom Theme` button for theme panel or header integration.
   */
  public renderBuilderButton(): string {
    return `
      <button
        type="button"
        id="aetheris-custom-theme-builder-btn"
        onclick="window.customThemeBuilder ? window.customThemeBuilder.openModal() : null"
        class="flex items-center space-x-2 px-3 py-2 rounded-xl bg-gradient-to-r from-cyphr/15 to-aether/15 hover:from-cyphr/25 hover:to-aether/25 border border-cyphr/30 hover:border-cyphr text-xs font-semibold text-slate-100 transition-all duration-200 shadow-sm hover:shadow-cyan-500/20 group cursor-pointer"
        title="Open Aetheris Custom Theme Visual Builder"
        aria-label="Custom Theme Visual Builder"
      >
        <span class="text-sm transition-transform duration-200 group-hover:scale-125 group-hover:rotate-12">🎨</span>
        <span class="font-sans font-medium text-slate-200 group-hover:text-white">Custom Theme</span>
        <span class="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-cyphr/20 text-cyphr border border-cyphr/40 uppercase">BUILDER</span>
      </button>
    `;
  }

  /**
   * Generates large 2-column modal: Left (Pickers & Controls) and Right (Live Preview).
   */
  public renderBuilderModal(): string {
    const draft = this.getResolvedDraft();

    // Generate Color Pickers for Left Column
    const colorPickersHtml = COLOR_FIELDS.map((field) => {
      const currentValue = (draft[field.key] as string) || field.defaultValue;
      return `
        <div class="p-3 rounded-xl bg-surface-base border border-white/5 hover:border-white/10 transition-colors space-y-2 group">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-sm">${field.icon}</span>
              <div>
                <label class="text-xs font-semibold text-slate-200 block">${this.escapeHtml(field.label)}</label>
                <span class="text-[10px] text-slate-400 line-clamp-1">${this.escapeHtml(field.description)}</span>
              </div>
            </div>
            <div class="w-4 h-4 rounded-full border border-white/20 shadow-inner" style="background-color: ${currentValue};"></div>
          </div>

          <div class="flex items-center space-x-2.5">
            <!-- Native HTML5 Color Picker -->
            <div class="relative w-9 h-9 rounded-lg overflow-hidden border border-white/15 shadow-inner cursor-pointer shrink-0">
              <input
                type="color"
                id="theme-input-${field.key}"
                value="${currentValue}"
                oninput="if(window.customThemeBuilder) window.customThemeBuilder.updateColor('${field.key}', this.value)"
                class="absolute -top-3 -left-3 w-16 h-16 cursor-pointer border-none bg-transparent"
                title="Select color for ${this.escapeHtml(field.label)}"
              />
            </div>

            <!-- Editable Hex Input -->
            <div class="relative flex-1">
              <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">#</span>
              <input
                type="text"
                id="theme-input-${field.key}-hex"
                value="${currentValue.replace(/^#/, '')}"
                maxlength="7"
                oninput="if(window.customThemeBuilder) window.customThemeBuilder.updateColor('${field.key}', '#' + this.value.replace(/#/g, ''))"
                class="w-full pl-6 pr-2.5 py-1.5 rounded-lg bg-canvas border border-white/10 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyphr focus:ring-1 focus:ring-cyphr"
                placeholder="00e5ff"
              />
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Generate Quick Preset Palettes
    const presetsHtml = DEFAULT_THEME_PRESETS.map((preset) => {
      return `
        <button
          type="button"
          onclick="if(window.customThemeBuilder) window.customThemeBuilder.applyPreset('${preset.id}')"
          class="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-surface-base hover:bg-surface-overlay border border-white/5 hover:border-cyphr/40 text-[11px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Load palette ${this.escapeHtml(preset.name)}"
        >
          <span>${preset.emoji}</span>
          <span>${this.escapeHtml(preset.name)}</span>
        </button>
      `;
    }).join('');

    // Generate Saved Themes Cards
    const savedThemesHtml =
      this.savedThemes.length === 0
        ? `
          <div class="p-4 rounded-xl bg-surface-base border border-dashed border-white/10 text-center text-xs text-slate-500 font-mono">
            No custom themes saved yet. Configure colors and click "Save Theme".
          </div>
        `
        : this.savedThemes
            .map((st) => {
              const dateStr = new Date(st.createdAt).toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              return `
                <div class="p-3 rounded-xl bg-surface-base border border-white/5 hover:border-cyphr/40 transition-all flex flex-col justify-between space-y-2 group">
                  <div class="flex items-start justify-between">
                    <div>
                      <div class="text-xs font-bold text-slate-200 group-hover:text-white flex items-center space-x-1.5">
                        <span>🎨</span>
                        <span>${this.escapeHtml(st.name)}</span>
                      </div>
                      <div class="text-[10px] text-slate-500 font-mono">by ${this.escapeHtml(st.author)} • ${dateStr}</div>
                    </div>
                    <div class="flex items-center space-x-1">
                      <button
                        type="button"
                        onclick="if(window.customThemeBuilder) window.customThemeBuilder.duplicateSavedTheme('${st.id}')"
                        class="p-1 rounded bg-surface-raised hover:bg-surface-overlay text-[10px] text-slate-400 hover:text-white"
                        title="Duplicate theme"
                      >📋</button>
                      <button
                        type="button"
                        onclick="if(window.customThemeBuilder) window.customThemeBuilder.deleteSavedTheme('${st.id}')"
                        class="p-1 rounded bg-surface-raised hover:bg-crimson/20 text-[10px] text-slate-400 hover:text-crimson"
                        title="Delete theme"
                      >🗑️</button>
                    </div>
                  </div>

                  <!-- Palette Swatches -->
                  <div class="flex items-center justify-between pt-1 border-t border-white/5">
                    <div class="flex items-center space-x-1">
                      <span class="w-3 h-3 rounded-full border border-white/10" style="background-color: ${st.bgCanvas}" title="Canvas: ${st.bgCanvas}"></span>
                      <span class="w-3 h-3 rounded-full border border-white/10" style="background-color: ${st.bgSurfaceBase}" title="Surface Base: ${st.bgSurfaceBase}"></span>
                      <span class="w-3 h-3 rounded-full border border-white/10" style="background-color: ${st.bgSurfaceRaised}" title="Surface Raised: ${st.bgSurfaceRaised}"></span>
                      <span class="w-3 h-3 rounded-full border border-white/10" style="background-color: ${st.accentColor}" title="Accent: ${st.accentColor}"></span>
                    </div>

                    <button
                      type="button"
                      onclick="if(window.customThemeBuilder) window.customThemeBuilder.loadSavedTheme('${st.id}')"
                      class="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cyphr/15 hover:bg-cyphr/30 text-cyphr border border-cyphr/30 transition-colors"
                    >
                      Load
                    </button>
                  </div>
                </div>
              `;
            })
            .join('');

    return `
      <div
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        onclick="if(event.target === this && (window.__aetheris_close_custom_theme_builder ? window.__aetheris_close_custom_theme_builder() : (window.customThemeBuilder && window.customThemeBuilder.closeModal())));"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-theme-modal-title"
        tabindex="-1"
      >
        <div class="bg-surface-base border border-white/10 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          <!-- MODAL HEADER -->
          <div class="px-6 py-4 border-b border-white/5 bg-surface-raised/80 flex items-center justify-between shrink-0">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyphr/20 to-aether/20 border border-cyphr/40 flex items-center justify-center text-cyphr text-xl shadow-inner">
                🎨
              </div>
              <div>
                <h2 id="custom-theme-modal-title" class="text-base font-bold text-white flex items-center space-x-2">
                  <span>Aetheris Custom Theme Studio</span>
                  <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyphr/15 text-cyphr border border-cyphr/30">VISUAL BUILDER</span>
                </h2>
                <p class="text-xs text-slate-400">Customize OLED colors, visual accents, and live test Omni-Sphere components.</p>
              </div>
            </div>

            <!-- Quick Action Header Buttons -->
            <div class="flex items-center space-x-2">
              <button
                type="button"
                onclick="if(window.customThemeBuilder) window.customThemeBuilder.applyDraftLive()"
                class="px-3 py-1.5 rounded-lg bg-cyphr/20 hover:bg-cyphr/30 border border-cyphr/40 text-cyphr text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                title="Apply current theme to interface"
              >
                <span>⚡</span>
                <span class="hidden sm:inline">Apply Live</span>
              </button>
              <button
                type="button"
                id="btn-close-custom-theme-builder"
                onclick="window.__aetheris_close_custom_theme_builder && window.__aetheris_close_custom_theme_builder()"
                class="w-8 h-8 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close window (Esc)"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- MODAL BODY: 2 COLUMNS -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <!-- LEFT COLUMN: CONTROLS, PICKERS AND PRESETS (5 COLS) -->
            <div class="lg:col-span-5 space-y-5">
              
              <!-- METADATA THEME INPUTS -->
              <div class="p-4 rounded-xl bg-surface-raised border border-white/5 space-y-3">
                <div class="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
                  <span class="text-cyphr">◆</span>
                  <span>Theme Information</span>
                </div>

                <div class="space-y-2">
                  <div>
                    <label class="text-[11px] font-mono text-slate-400 block mb-1">Theme Name:</label>
                    <input
                      type="text"
                      id="theme-builder-name-input"
                      value="${this.escapeHtml(draft.name)}"
                      oninput="if(window.customThemeBuilder) window.customThemeBuilder.updateMetadata('name', this.value)"
                      class="w-full px-3 py-1.5 rounded-lg bg-canvas border border-white/10 text-xs font-sans text-white focus:outline-none focus:border-cyphr focus:ring-1 focus:ring-cyphr"
                      placeholder="e.g. Cyberpunk Neon"
                    />
                  </div>

                  <div>
                    <label class="text-[11px] font-mono text-slate-400 block mb-1">Author / Fingerprint:</label>
                    <input
                      type="text"
                      id="theme-builder-author-input"
                      value="${this.escapeHtml(draft.author)}"
                      oninput="if(window.customThemeBuilder) window.customThemeBuilder.updateMetadata('author', this.value)"
                      class="w-full px-3 py-1.5 rounded-lg bg-canvas border border-white/10 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyphr focus:ring-1 focus:ring-cyphr"
                      placeholder="e.g. 0xCyphr...88fa"
                    />
                  </div>
                </div>
              </div>

              <!-- QUICK PRESETS -->
              <div class="p-4 rounded-xl bg-surface-raised border border-white/5 space-y-2">
                <div class="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
                  <span class="text-aether">◆</span>
                  <span>Preset Palettes (Quick Presets)</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  ${presetsHtml}
                </div>
              </div>

              <!-- COLOR PICKERS FORM -->
              <div class="p-4 rounded-xl bg-surface-raised border border-white/5 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
                    <span class="text-signal">◆</span>
                    <span>CSS Color Variables</span>
                  </div>
                  <span class="text-[10px] font-mono text-slate-500">7 variables</span>
                </div>

                <div class="space-y-2.5">
                  ${colorPickersHtml}
                </div>
              </div>

              <!-- DRAFT & SAVE ACTION BUTTONS -->
              <div class="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onclick="if(window.customThemeBuilder) window.customThemeBuilder.saveDraftAsTheme()"
                  class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyphr to-cyan-400 hover:from-cyan-400 hover:to-cyphr text-black text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>💾</span>
                  <span>Save Theme</span>
                </button>

                <button
                  type="button"
                  onclick="if(window.customThemeBuilder) window.customThemeBuilder.resetDraft()"
                  class="w-full py-2.5 px-3 rounded-xl bg-surface-base hover:bg-surface-overlay border border-white/10 text-slate-300 hover:text-white text-xs font-mono transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>⟲</span>
                  <span>Reset Draft</span>
                </button>
              </div>

              <!-- IMPORT / EXPORT ACTIONS -->
              <div class="p-4 rounded-xl bg-surface-raised border border-white/5 space-y-2.5">
                <div class="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
                  <span class="text-amber">◆</span>
                  <span>Share & Backup JSON</span>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onclick="if(window.customThemeBuilder) window.customThemeBuilder.downloadThemeJSON()"
                    class="py-2 px-2.5 rounded-lg bg-surface-base hover:bg-surface-overlay border border-white/10 text-xs text-slate-200 hover:text-white transition-all flex items-center justify-center space-x-1.5"
                  >
                    <span>📤</span>
                    <span>Export JSON</span>
                  </button>

                  <button
                    type="button"
                    onclick="if(window.customThemeBuilder) window.customThemeBuilder.copyJSONToClipboard()"
                    class="py-2 px-2.5 rounded-lg bg-surface-base hover:bg-surface-overlay border border-white/10 text-xs text-slate-200 hover:text-white transition-all flex items-center justify-center space-x-1.5"
                  >
                    <span>📋</span>
                    <span>Copy JSON</span>
                  </button>
                </div>

                <button
                  type="button"
                  onclick="if(window.customThemeBuilder) window.customThemeBuilder.openImportModal()"
                  class="w-full py-2 px-3 rounded-lg bg-surface-base hover:bg-surface-overlay border border-dashed border-white/20 hover:border-cyphr/50 text-xs text-cyphr font-mono transition-all flex items-center justify-center space-x-1.5"
                >
                  <span>📥</span>
                  <span>Import Theme from JSON / File</span>
                </button>
              </div>

            </div>

            <!-- RIGHT COLUMN: INTERACTIVE LIVE PREVIEW (7 COLS) -->
            <div class="lg:col-span-7 space-y-5">
              
              <!-- LIVE PREVIEW CONTAINER WITH DRAFT COLORS -->
              <div
                id="custom-theme-live-preview-box"
                class="p-5 rounded-2xl border transition-all duration-200 space-y-5 shadow-2xl"
                style="background-color: ${draft.bgCanvas}; border-color: ${draft.borderAccent}40;"
              >
                
                <!-- PREVIEW TOP BAR -->
                <div class="flex items-center justify-between pb-3 border-b" style="border-color: ${draft.borderAccent}25;">
                  <div class="flex items-center space-x-2">
                    <span class="w-3 h-3 rounded-full animate-pulse" style="background-color: ${draft.accentColor};"></span>
                    <span class="text-xs font-mono font-bold uppercase tracking-wider" style="color: ${draft.textAccent};">
                      LIVE COMPONENT PREVIEW
                    </span>
                  </div>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded" style="background-color: ${draft.bgSurfaceRaised}; color: ${draft.textPrimary}; border: 1px solid ${draft.borderAccent}30;">
                    ${this.escapeHtml(draft.name)}
                  </span>
                </div>

                <!-- 1. OMNI-SPHERE MINI POST CARD -->
                <div
                  class="p-4 rounded-xl border transition-all duration-150 space-y-3"
                  style="background-color: ${draft.bgSurfaceRaised}; border-color: ${draft.borderAccent}30;"
                >
                  <!-- Post Header -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2.5">
                      <div
                        class="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold shadow-sm"
                        style="background-color: ${draft.bgSurfaceBase}; border: 1px solid ${draft.accentColor}; color: ${draft.textAccent};"
                      >
                        ZK
                      </div>
                      <div>
                        <div class="text-xs font-bold flex items-center space-x-1.5" style="color: ${draft.textPrimary};">
                          <span>${this.escapeHtml(draft.author)}</span>
                          <span
                            class="px-1.5 py-0.2 text-[9px] font-mono rounded"
                            style="background-color: ${draft.accentColor}20; color: ${draft.textAccent}; border: 1px solid ${draft.borderAccent}40;"
                          >
                            ✓ ZK-STARK
                          </span>
                        </div>
                        <div class="text-[10px] font-mono opacity-60" style="color: ${draft.textPrimary};">
                          4 minutes ago • Channel: #cryptography
                        </div>
                      </div>
                    </div>

                    <span
                      class="text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style="background-color: ${draft.accentColor}15; color: ${draft.textAccent}; border: 1px solid ${draft.borderAccent}30;"
                    >
                      #PROTOCOL
                    </span>
                  </div>

                  <!-- Post Content -->
                  <div class="space-y-1.5">
                    <h4 class="text-sm font-bold leading-tight" style="color: ${draft.textAccent};">
                      Sovereign P2P Consensus & Zero-Knowledge Cryptographic Verification
                    </h4>
                    <p class="text-xs leading-relaxed opacity-90" style="color: ${draft.textPrimary};">
                      Aetheris Omni-Sphere implements confidential off-chain transactions with recursive STARK proofs, guaranteeing absolute mathematical privacy across every mesh node.
                    </p>
                  </div>

                  <!-- Post Footer / Actions -->
                  <div class="flex items-center justify-between pt-2 border-t" style="border-color: ${draft.borderAccent}20;">
                    <div class="flex items-center space-x-2">
                      <button
                        type="button"
                        class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center space-x-1 transition-all"
                        style="background-color: ${draft.accentColor}; color: #000000; box-shadow: 0 0 10px ${draft.accentColor}40;"
                      >
                        <span>▲</span>
                        <span>142 MERIT</span>
                      </button>

                      <button
                        type="button"
                        class="px-2 py-1 rounded-lg text-xs font-mono flex items-center space-x-1 opacity-80 hover:opacity-100 transition-all"
                        style="background-color: ${draft.bgSurfaceBase}; color: ${draft.textPrimary}; border: 1px solid ${draft.borderAccent}25;"
                      >
                        <span>💬</span>
                        <span>38 Replies</span>
                      </button>

                      <button
                        type="button"
                        class="px-2 py-1 rounded-lg text-xs font-mono flex items-center space-x-1 opacity-80 hover:opacity-100 transition-all"
                        style="background-color: ${draft.bgSurfaceBase}; color: ${draft.textPrimary}; border: 1px solid ${draft.borderAccent}25;"
                      >
                        <span>⚡</span>
                        <span>Boost</span>
                      </button>
                    </div>

                    <span class="text-[10px] font-mono opacity-50" style="color: ${draft.textPrimary};">
                      ID: #p88fa2
                    </span>
                  </div>
                </div>

                <!-- 2. UI BUTTONS & CONTROLS SHOWCASE -->
                <div
                  class="p-4 rounded-xl border space-y-3"
                  style="background-color: ${draft.bgSurfaceBase}; border-color: ${draft.borderAccent}25;"
                >
                  <div class="text-[11px] font-mono uppercase tracking-wider font-semibold" style="color: ${draft.textAccent};">
                    UI Buttons & Controls Showcase
                  </div>

                  <div class="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      class="px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans transition-all shadow-md"
                      style="background-color: ${draft.accentColor}; color: #000000; box-shadow: 0 0 12px ${draft.accentColor}50;"
                    >
                      ✦ Primary Button
                    </button>

                    <button
                      type="button"
                      class="px-3.5 py-1.5 rounded-lg text-xs font-medium font-sans border transition-all"
                      style="background-color: transparent; border-color: ${draft.borderAccent}; color: ${draft.textAccent};"
                    >
                      ◈ Outlined Button
                    </button>

                    <button
                      type="button"
                      class="px-3.5 py-1.5 rounded-lg text-xs font-medium font-sans transition-all"
                      style="background-color: ${draft.bgSurfaceRaised}; color: ${draft.textPrimary}; border: 1px solid ${draft.borderAccent}30;"
                    >
                      Raised Surface
                    </button>

                    <span
                      class="px-2.5 py-1 text-[11px] font-mono rounded-full flex items-center space-x-1"
                      style="background-color: ${draft.accentColor}20; color: ${draft.textAccent}; border: 1px solid ${draft.borderAccent}40;"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${draft.accentColor};"></span>
                      <span>Signal Verified</span>
                    </span>
                  </div>
                </div>

                <!-- 3. CHAT PANEL / SOVEREIGN DM PREVIEW -->
                <div
                  class="p-4 rounded-xl border space-y-3"
                  style="background-color: ${draft.bgSurfaceBase}; border-color: ${draft.borderAccent}25;"
                >
                  <!-- Chat Header -->
                  <div class="flex items-center justify-between pb-2 border-b" style="border-color: ${draft.borderAccent}20;">
                    <div class="flex items-center space-x-2">
                      <span class="w-2 h-2 rounded-full" style="background-color: ${draft.accentColor};"></span>
                      <span class="text-xs font-bold" style="color: ${draft.textPrimary};">Sovereign P2P Channel: #general-mesh</span>
                    </div>
                    <span class="text-[10px] font-mono" style="color: ${draft.textAccent};">E2EE ACTIVE</span>
                  </div>

                  <!-- Chat Messages Stream -->
                  <div class="space-y-2 text-xs">
                    <!-- Received Message -->
                    <div class="flex items-start space-x-2">
                      <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono" style="background-color: ${draft.bgSurfaceRaised}; color: ${draft.textPrimary}; border: 1px solid ${draft.borderAccent}30;">
                        0x1
                      </div>
                      <div
                        class="p-2.5 rounded-xl max-w-[80%]"
                        style="background-color: ${draft.bgSurfaceRaised}; color: ${draft.textPrimary}; border: 1px solid ${draft.borderAccent}25;"
                      >
                        The node has synchronized the Merkle tree root. All proofs are valid.
                      </div>
                    </div>

                    <!-- Sent Message (Accent Styled) -->
                    <div class="flex items-start justify-end space-x-2">
                      <div
                        class="p-2.5 rounded-xl max-w-[80%]"
                        style="background-color: ${draft.accentColor}25; color: ${draft.textPrimary}; border: 1px solid ${draft.borderAccent};"
                      >
                        Confirmed. Schnorr signature has been broadcast over gossipsub.
                      </div>
                      <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold" style="background-color: ${draft.accentColor}; color: #000000;">
                        ME
                      </div>
                    </div>
                  </div>

                  <!-- Chat Input Bar -->
                  <div class="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      readonly
                      value="Send an encrypted message..."
                      class="flex-1 px-3 py-1.5 rounded-lg text-xs font-sans cursor-default focus:outline-none"
                      style="background-color: ${draft.bgCanvas}; color: ${draft.textPrimary}; border: 1px solid ${draft.borderAccent}30;"
                    />
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style="background-color: ${draft.accentColor}; color: #000000;"
                    >
                      ➤
                    </button>
                  </div>
                </div>

              </div>

              <!-- SAVED THEMES GALLERY -->
              <div class="p-4 rounded-xl bg-surface-raised border border-white/5 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-1.5">
                    <span class="text-cyphr">◆</span>
                    <span>Your Saved Themes Collection</span>
                  </div>
                  <span class="text-[10px] font-mono text-slate-500">${this.savedThemes.length} saved</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  ${savedThemesHtml}
                </div>
              </div>

            </div>

          </div>

          <!-- MODAL FOOTER -->
          <div class="px-6 py-3.5 border-t border-white/10 bg-surface-raised/90 flex items-center justify-between shrink-0">
            <div class="flex items-center space-x-2 text-xs font-mono text-slate-400">
              <span class="text-cyphr">●</span>
              <span>Live Engine Ready</span>
            </div>

            <div class="flex items-center space-x-2.5">
              <button
                type="button"
                onclick="if(window.customThemeBuilder) window.customThemeBuilder.saveDraftAsTheme()"
                class="px-4 py-1.5 rounded-lg bg-surface-base hover:bg-surface-overlay border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer"
              >
                Save as Theme
              </button>

              <button
                type="button"
                onclick="if(window.__aetheris_close_custom_theme_builder) { window.__aetheris_close_custom_theme_builder(); } else if(window.customThemeBuilder) { window.customThemeBuilder.closeModal(); }"
                class="px-5 py-1.5 rounded-lg bg-cyphr hover:bg-cyphr/90 text-black font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                Done & Close
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // ─── INTERNAL METHODS AND DOM SYNCHRONIZATION ───────────────────────────────────────

  /**
   * Synchronizes form inputs on color change.
   */
  private syncFormInputValues(property: keyof CustomTheme, hex: string): void {
    if (typeof document === 'undefined') return;

    const colorPicker = document.getElementById(`theme-input-${property}`) as HTMLInputElement | null;
    if (colorPicker && colorPicker.value.toLowerCase() !== hex.toLowerCase()) {
      colorPicker.value = hex;
    }

    const hexInput = document.getElementById(`theme-input-${property}-hex`) as HTMLInputElement | null;
    if (hexInput) {
      const pureHex = hex.replace(/^#/, '');
      if (hexInput.value.toLowerCase() !== pureHex.toLowerCase()) {
        hexInput.value = pureHex;
      }
    }
  }

  /**
   * Directly updates live preview container without re-creating entire modal.
   */
  private updatePreviewElements(): void {
    if (typeof document === 'undefined') return;

    const previewContainer = document.getElementById('custom-theme-live-preview-box');
    if (!previewContainer) return;

    const draft = this.getResolvedDraft();

    previewContainer.style.backgroundColor = draft.bgCanvas;
    previewContainer.style.borderColor = `${draft.borderAccent}40`;

    // Fast re-render of preview interior
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.renderBuilderModal();
    const newPreview = tempDiv.querySelector('#custom-theme-live-preview-box');
    if (newPreview && previewContainer.parentElement) {
      previewContainer.innerHTML = newPreview.innerHTML;
    }
  }

  /**
   * Refreshes entire content of open modal.
   */
  private refreshModalContent(): void {
    if (typeof document === 'undefined' || !this.isOpen) return;

    const container = document.getElementById(this.MODAL_CONTAINER_ID);
    if (container) {
      container.innerHTML = this.renderBuilderModal();
    }
  }

  /**
   * Saves saved themes collection to localStorage.
   */
  private persistSavedThemes(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.savedThemes));
    } catch (err) {
      console.error('[CustomThemeBuilder] Error saving themes:', err);
    }
  }

  /**
   * Loads saved themes list from localStorage.
   */
  private loadSavedThemes(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.savedThemes = parsed.filter((item) => this.isValidThemeObject(item));
      }
    } catch (err) {
      console.warn('[CustomThemeBuilder] Could not load saved themes:', err);
    }
  }

  /**
   * Saves current draft to localStorage.
   */
  private saveDraftToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(this.DRAFT_STORAGE_KEY, JSON.stringify(this.currentDraft));
    } catch (err) {
      console.warn('[CustomThemeBuilder] Error saving draft:', err);
    }
  }

  /**
   * Loads previously saved draft from localStorage.
   */
  private loadDraftFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(this.DRAFT_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        this.currentDraft = { ...this.currentDraft, ...parsed };
      }
    } catch (err) {
      console.warn('[CustomThemeBuilder] Error loading draft:', err);
    }
  }

  /**
   * Validates minimum structure of theme object.
   */
  private isValidThemeObject(obj: unknown): obj is CustomTheme {
    if (!obj || typeof obj !== 'object') return false;
    const t = obj as Record<string, unknown>;
    return (
      typeof t.name === 'string' &&
      typeof t.accentColor === 'string' &&
      typeof t.bgCanvas === 'string' &&
      typeof t.bgSurfaceBase === 'string' &&
      typeof t.bgSurfaceRaised === 'string'
    );
  }

  /**
   * Validates and formats a HEX code.
   */
  private sanitizeHex(hex: unknown, fallback: string): string {
    if (typeof hex !== 'string') return fallback;
    const clean = hex.trim();
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(clean)) {
      return clean;
    }
    if (/^[0-9A-Fa-f]{3,8}$/.test(clean)) {
      return '#' + clean;
    }
    return fallback;
  }

  /**
   * Dispatches a CustomEvent on document.
   */
  private dispatchCustomEvent(eventName: string, detail: unknown): void {
    if (typeof document === 'undefined') return;
    try {
      const evt = new CustomEvent(eventName, { detail, bubbles: true });
      document.dispatchEvent(evt);
    } catch (err) {
      console.error(`[CustomThemeBuilder] Error dispatching event ${eventName}:`, err);
    }
  }

  /**
   * Displays a toast notification in UI.
   */
  private showToastNotification(message: string, type: 'info' | 'error' = 'info'): void {
    if (typeof document === 'undefined') return;

    let toastContainer = document.getElementById('aetheris-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'aetheris-toast-container';
      toastContainer.className = 'fixed bottom-5 right-5 z-[10001] flex flex-col space-y-2 pointer-events-none';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    const borderColor = type === 'error' ? 'border-crimson' : 'border-cyphr';
    const textColor = type === 'error' ? 'text-crimson' : 'text-cyphr';

    toast.className = `px-4 py-2.5 rounded-xl bg-surface-base border ${borderColor} shadow-2xl text-xs font-sans text-white flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-auto`;
    toast.innerHTML = `
      <span class="${textColor} text-sm">${type === 'error' ? '⚠️' : '✨'}</span>
      <span>${this.escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 3500);
  }

  /**
   * Registers instance and global close handler on window object.
   */
  private registerGlobalInstance(): void {
    if (typeof window !== 'undefined') {
      window.customThemeBuilder = this;
      window.__aetheris_close_custom_theme_builder = () => this.closeModal();
    }
  }

  /**
   * Attaches keyboard listeners globally (Escape key to close).
   */
  private attachKeyboardListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeModal();
      }
    });
  }

  /**
   * Escapes special HTML characters for XSS protection.
   */
  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// ─── SINGLETON EXPORT ──────────────────────────────────────────────────────────

export const customThemeBuilder = new CustomThemeBuilder();

serviceRegistry.registerInstance(SERVICES.CustomThemeBuilder, customThemeBuilder);
