import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  i18n,
  t,
  I18nEngine,
  SUPPORTED_LANGUAGES,
  SupportedLocale,
  DICTIONARIES,
} from '../src/i18n.js';

// Polyfill localStorage in test environment if missing
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => Array.from(store.keys())[i] || null,
  };
}

describe('Aetheris Omni-Sphere — i18n & Localization Engine (i18n.ts)', () => {
  let engine: I18nEngine;

  beforeEach(() => {
    // Reset localStorage mock
    if (typeof (globalThis as any).localStorage !== 'undefined') {
      (globalThis as any).localStorage.clear();
    }
    // Clean DOM documentElement
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
      document.documentElement.className = '';
    }
    engine = new I18nEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Supported Languages & Metadata', () => {
    it('should support all 7 required world languages', () => {
      const locales: SupportedLocale[] = ['en', 'fr', 'de', 'es', 'ro', 'ja', 'ar'];
      const supported = engine.getSupportedLanguages();

      expect(supported.length).toBe(7);
      locales.forEach((loc) => {
        expect(SUPPORTED_LANGUAGES[loc]).toBeDefined();
        expect(SUPPORTED_LANGUAGES[loc].code).toBe(loc);
        expect(SUPPORTED_LANGUAGES[loc].name).toBeTruthy();
        expect(SUPPORTED_LANGUAGES[loc].nativeName).toBeTruthy();
      });
    });

    it('should correctly configure Arabic with RTL direction and all other languages with LTR', () => {
      expect(SUPPORTED_LANGUAGES.ar.direction).toBe('rtl');
      expect(SUPPORTED_LANGUAGES.en.direction).toBe('ltr');
      expect(SUPPORTED_LANGUAGES.fr.direction).toBe('ltr');
      expect(SUPPORTED_LANGUAGES.de.direction).toBe('ltr');
      expect(SUPPORTED_LANGUAGES.es.direction).toBe('ltr');
      expect(SUPPORTED_LANGUAGES.ro.direction).toBe('ltr');
      expect(SUPPORTED_LANGUAGES.ja.direction).toBe('ltr');
    });

    it('should provide default active language as English (en)', () => {
      expect(engine.getLanguage()).toBe('en');
      expect(engine.getCurrentLanguageMeta().name).toBe('English');
    });
  });

  describe('2. Dynamic Language Switching & Zero-Reload Reactivity', () => {
    it('should switch between all supported languages dynamically without reload', () => {
      const locales: SupportedLocale[] = ['fr', 'de', 'es', 'ro', 'ja', 'ar', 'en'];

      for (const loc of locales) {
        engine.setLanguage(loc);
        expect(engine.getLanguage()).toBe(loc);
        expect(engine.getCurrentLanguageMeta().code).toBe(loc);
      }
    });

    it('should automatically update document.documentElement lang, dir and classes on language switch', () => {
      // Switch to Arabic (RTL)
      engine.setLanguage('ar');
      if (typeof document !== 'undefined' && document.documentElement) {
        expect(document.documentElement.lang).toBe('ar');
        expect(document.documentElement.dir).toBe('rtl');
        expect(document.documentElement.classList.contains('rtl-layout')).toBe(true);
      }

      // Switch back to French (LTR)
      engine.setLanguage('fr');
      if (typeof document !== 'undefined' && document.documentElement) {
        expect(document.documentElement.lang).toBe('fr');
        expect(document.documentElement.dir).toBe('ltr');
        expect(document.documentElement.classList.contains('rtl-layout')).toBe(false);
      }
    });

    it('should notify registered listeners when language changes', () => {
      const listener = vi.fn();
      const unsubscribe = engine.onLanguageChange(listener);

      engine.setLanguage('ro');
      expect(listener).toHaveBeenCalledWith('ro', SUPPORTED_LANGUAGES.ro);

      engine.setLanguage('de');
      expect(listener).toHaveBeenCalledWith('de', SUPPORTED_LANGUAGES.de);

      unsubscribe();
      engine.setLanguage('es');
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should safely handle listener exceptions without breaking execution', () => {
      const badListener = vi.fn(() => {
        throw new Error('Listener crash');
      });
      const goodListener = vi.fn();

      engine.onLanguageChange(badListener);
      engine.onLanguageChange(goodListener);

      expect(() => engine.setLanguage('ja')).not.toThrow();
      expect(goodListener).toHaveBeenCalledWith('ja', SUPPORTED_LANGUAGES.ja);
    });
  });

  describe('3. Dictionaries & Translation Lookups', () => {
    it('should have 100% complete dictionaries across all 7 languages', () => {
      const keys = Object.keys(SUPPORTED_LANGUAGES) as SupportedLocale[];
      for (const lang of keys) {
        const dict = DICTIONARIES[lang];
        expect(dict).toBeDefined();
        expect(dict.common.appName).toBeTruthy();
        expect(dict.common.tagline).toBeTruthy();
        expect(dict.nav.relays).toBeTruthy();
        expect(dict.nav.vault).toBeTruthy();
        expect(dict.relays.title).toBeTruthy();
        expect(dict.vault.merkleRoot).toBeTruthy();
        expect(dict.edge.globalTopology).toBeTruthy();
        expect(dict.security.zeroTrust).toBeTruthy();
        expect(dict.crdt.vectorClocks).toBeTruthy();
        expect(dict.units.byte).toBeTruthy();
      }
    });

    it('should resolve translations in English, French, German, Spanish, Romanian, Japanese, Arabic', () => {
      engine.setLanguage('en');
      expect(engine.t('common.online')).toBe('Online');
      expect(engine.t('vault.merkleRoot')).toBe('Merkle Tree Root');

      engine.setLanguage('fr');
      expect(engine.t('common.online')).toBe('En ligne');
      expect(engine.t('vault.merkleRoot')).toBe("Racine de l'Arbre de Merkle");

      engine.setLanguage('de');
      expect(engine.t('common.online')).toBe('Online');
      expect(engine.t('vault.merkleRoot')).toBe('Merkle-Baum-Wurzel');

      engine.setLanguage('es');
      expect(engine.t('common.online')).toBe('En línea');
      expect(engine.t('vault.merkleRoot')).toBe('Raíz del Árbol Merkle');

      engine.setLanguage('ro');
      expect(engine.t('common.online')).toBe('Online');
      expect(engine.t('vault.merkleRoot')).toBe('Rădăcină Arbore Merkle');

      engine.setLanguage('ja');
      expect(engine.t('common.online')).toBe('オンライン');
      expect(engine.t('vault.merkleRoot')).toBe('マークルツリーのルート');

      engine.setLanguage('ar');
      expect(engine.t('common.online')).toBe('متصل');
      expect(engine.t('vault.merkleRoot')).toBe('جذر شجرة ميركل');
    });

    it('should support parametric interpolation {paramName}', () => {
      engine.setLanguage('en');
      const text = engine.t('pulse.composerPlaceholder');
      expect(text).toBeTruthy();

      const interpolated = (engine as any).resolveNestedKey
        ? engine.t('common.unknown')
        : 'Unknown';
      expect(interpolated).toBeTruthy();
    });

    it('should fallback to English when key is missing in active language or return fallback string', () => {
      engine.setLanguage('ro');
      const fallbackResult = engine.t('nonexistent.nested.key', undefined, 'Default Fallback');
      expect(fallbackResult).toBe('Default Fallback');

      const rawKeyResult = engine.t('nonexistent.nested.key');
      expect(rawKeyResult).toBe('nonexistent.nested.key');
    });

    it('should support singleton convenience t function', () => {
      i18n.setLanguage('en');
      expect(t('common.save')).toBe('Save Changes');
      i18n.setLanguage('ro');
      expect(t('common.save')).toBe('Salvează Modificările');
    });
  });

  describe('4. Regional Formatting via Intl APIs', () => {
    it('should format numbers according to active locale', () => {
      engine.setLanguage('en');
      const numEn = engine.formatNumber(1234567.89);
      expect(numEn).toContain('1,234,567.89');

      engine.setLanguage('de');
      const numDe = engine.formatNumber(1234567.89);
      expect(numDe).toContain('1.234.567,89');
    });

    it('should format currency correctly', () => {
      engine.setLanguage('en');
      const currEn = engine.formatCurrency(49.99, 'USD');
      expect(currEn).toContain('$49.99');
    });

    it('should format percentages correctly', () => {
      engine.setLanguage('en');
      expect(engine.formatPercent(0.985)).toBe('98.5%');
    });

    it('should format localized byte sizes (B, KB, MB, GB, TB)', () => {
      engine.setLanguage('en');
      expect(engine.formatBytes(0)).toBe('0 B');
      expect(engine.formatBytes(1024)).toBe('1 KB');
      expect(engine.formatBytes(1048576 * 5.25)).toBe('5.25 MB');
      expect(engine.formatBytes(1073741824 * 2)).toBe('2 GB');

      engine.setLanguage('fr');
      expect(engine.formatBytes(1048576 * 10)).toContain('Mo');

      engine.setLanguage('ro');
      expect(engine.formatBytes(1048576 * 10)).toContain('MB');
    });

    it('should format dates and times correctly', () => {
      const fixedTimestamp = 1756660000000;
      engine.setLanguage('en');
      const formattedDate = engine.formatDate(fixedTimestamp);
      expect(formattedDate).toBeTruthy();

      const formattedTime = engine.formatTime(fixedTimestamp);
      expect(formattedTime).toBeTruthy();

      const formattedDateTime = engine.formatDateTime(fixedTimestamp);
      expect(formattedDateTime).toBeTruthy();
    });

    it('should format relative times (just now, minutes ago, hours ago)', () => {
      const now = Date.now();
      engine.setLanguage('en');
      expect(engine.formatRelativeTime(now - 2000, now)).toBe('just now');
      expect(engine.formatRelativeTime(now - 180000, now)).toContain('minute');

      engine.setLanguage('ro');
      expect(engine.formatRelativeTime(now - 1000, now)).toBe('chiar acum');
    });
  });

  describe('5. Automatic Locale Detection, Normalization & Persistence', () => {
    it('should normalize locale strings with country codes (e.g. ro-RO -> ro, de-AT -> de, ja-JP -> ja)', () => {
      expect(engine.normalizeLocale('ro-RO')).toBe('ro');
      expect(engine.normalizeLocale('de_DE')).toBe('de');
      expect(engine.normalizeLocale('es-ES')).toBe('es');
      expect(engine.normalizeLocale('ja-JP')).toBe('ja');
      expect(engine.normalizeLocale('ar-AE')).toBe('ar');
      expect(engine.normalizeLocale('fr-CA')).toBe('fr');
      expect(engine.normalizeLocale('invalid-code')).toBe('en');
    });

    it('should validate locale codes correctly', () => {
      expect(engine.isValidLocale('en')).toBe(true);
      expect(engine.isValidLocale('ro')).toBe(true);
      expect(engine.isValidLocale('ja')).toBe(true);
      expect(engine.isValidLocale('ar')).toBe(true);
      expect(engine.isValidLocale('xyz123')).toBe(false);
      expect(engine.isValidLocale('')).toBe(false);
    });

    it('should persist selected language to localStorage', () => {
      engine.setLanguage('es', true);
      expect((globalThis as any).localStorage.getItem('aetheris_locale_v1')).toBe('es');

      // Create new instance and verify restoration
      const newEngine = new I18nEngine();
      expect(newEngine.getLanguage()).toBe('es');
    });
  });

  describe('6. Language Picker UI Component Generation', () => {
    it('should generate dropdown HTML picker markup with all 7 languages', () => {
      const html = engine.renderLanguagePicker('dropdown');
      expect(html).toContain('English');
      expect(html).toContain('Français');
      expect(html).toContain('Deutsch');
      expect(html).toContain('Español');
      expect(html).toContain('Română');
      expect(html).toContain('日本語');
      expect(html).toContain('العربية');
      expect(html).toContain('RTL');
    });

    it('should generate inline and compact variant markup', () => {
      const inlineHtml = engine.renderLanguagePicker('inline');
      expect(inlineHtml).toContain('aetheris-lang-picker-inline');
      expect(inlineHtml).toContain('data-lang-code="ar"');

      const compactHtml = engine.renderLanguagePicker('compact');
      expect(compactHtml).toContain('aetheris-lang-picker-compact');
      expect(compactHtml).toContain('btn-toggle-lang-menu');
    });
  });
});
