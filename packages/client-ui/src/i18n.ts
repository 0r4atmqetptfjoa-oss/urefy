/**
 * AETHERIS OMNI-SPHERE — INTERNATIONALIZATION & LOCALIZATION ENGINE (i18n)
 *
 * Enterprise-grade Sovereign i18n & L10n Engine supporting:
 * 1. Dynamic language switching without page reload (100% reactive).
 * 2. 7 Major World Languages:
 *    - English (en) - Default Sovereign Standard
 *    - French (fr) - Français
 *    - German (de) - Deutsch
 *    - Spanish (es) - Español
 *    - Romanian (ro) - Română
 *    - Japanese (ja) - 日本語
 *    - Arabic (ar) - العربية (Native Bidirectional RTL Layout `dir="rtl"`)
 * 3. Regional Formatting via `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`, `Intl.ListFormat`.
 * 4. Automatic locale detection from browser `navigator.languages` with secure fallback and persistent storage.
 * 5. Strongly-typed dictionary with nested keys, parametric interpolation (`{name}`, `{count}`), and pluralization.
 * 6. DOM automated translator & Language Picker UI component.
 */

import { serviceRegistry, SERVICES } from './service-registry.js';

export type SupportedLocale = 'en' | 'fr' | 'de' | 'es' | 'ro' | 'ja' | 'ar';
export type TextDirection = 'ltr' | 'rtl';

export interface LanguageMeta {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: TextDirection;
  flag: string;
  region: string;
  dateFormat: string;
  tier: 'official' | 'beta';
}

export const SUPPORTED_LANGUAGES: Record<SupportedLocale, LanguageMeta> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English (Official - 100%)',
    direction: 'ltr',
    flag: '🌐',
    region: 'Global / Sovereign Standard',
    dateFormat: 'MM/DD/YYYY',
    tier: 'official',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français (Officiel - 100%)',
    direction: 'ltr',
    flag: '🇫🇷',
    region: 'France / Europe',
    dateFormat: 'DD/MM/YYYY',
    tier: 'official',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch (Offiziell - 100%)',
    direction: 'ltr',
    flag: '🇩🇪',
    region: 'Germany / DACH',
    dateFormat: 'DD.MM.YYYY',
    tier: 'official',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español (Oficial - 100%)',
    direction: 'ltr',
    flag: '🇪🇸',
    region: 'Spain / Latin America',
    dateFormat: 'DD/MM/YYYY',
    tier: 'official',
  },
  ro: {
    code: 'ro',
    name: 'Romanian',
    nativeName: 'Română (Oficial - 100%)',
    direction: 'ltr',
    flag: '🇷🇴',
    region: 'Romania / Eastern Europe',
    dateFormat: 'DD.MM.YYYY',
    tier: 'official',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語 (公式 - 100%)',
    direction: 'ltr',
    flag: '🇯🇵',
    region: 'Japan / Asia-Pacific',
    dateFormat: 'YYYY/MM/DD',
    tier: 'official',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية (رسمي - 100%)',
    direction: 'rtl',
    flag: '🇦🇪',
    region: 'Middle East & North Africa (MENA)',
    dateFormat: 'DD/MM/YYYY',
    tier: 'official',
  },
};

// ─── MODULAR LOCALES & DICTIONARIES ─────────────────────────────────────────
export type { TranslationDictionary } from './i18n/types.js';
import { enDict, frDict, deDict, esDict, roDict, jaDict, arDict, DICTIONARIES } from './i18n/locales/index.js';
export { enDict, frDict, deDict, esDict, roDict, jaDict, arDict, DICTIONARIES };


// ─── LOCAL STORAGE KEYS & EVENT DISPATCHER ───────────────────────────────────

const STORAGE_KEY = 'aetheris_locale_v1';

export type LanguageChangeListener = (locale: SupportedLocale, meta: LanguageMeta) => void;

// ─── i18n ENGINE CLASS IMPLEMENTATION ────────────────────────────────────────

export class I18nEngine {
  private currentLocale: SupportedLocale = 'en';
  private listeners: LanguageChangeListener[] = [];
  private numberFormatters: Map<string, Intl.NumberFormat> = new Map();
  private dateTimeFormatters: Map<string, Intl.DateTimeFormat> = new Map();
  private relativeTimeFormatters: Map<string, Intl.RelativeTimeFormat> = new Map();

  constructor() {
    this.initLocale();
  }

  /**
   * Initializes the engine detecting from storage, query param, or browser language.
   */
  private initLocale(): void {
    let initialLocale: SupportedLocale = 'en';

    // 1. Check URL search param (?lang=xx)
    if (typeof window !== 'undefined' && window.location?.search) {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlLang = params.get('lang') || params.get('locale');
        if (urlLang && this.isValidLocale(urlLang)) {
          initialLocale = this.normalizeLocale(urlLang);
        }
      } catch (_) {}
    }

    // 2. Check local persistence
    if (initialLocale === 'en') {
      const stored = this.getStoredLocale();
      if (stored && this.isValidLocale(stored)) {
        initialLocale = stored;
      } else {
        // Strict Sovereign Default: English ('en') is standard default across all platforms
        initialLocale = 'en';
      }
    }

    this.setLanguage(initialLocale, false);
  }

  /**
   * Validates whether a string matches any supported locale code.
   */
  public isValidLocale(code: string): boolean {
    if (!code) return false;
    const clean = code.toLowerCase().split(/[-_]/)[0];
    return Object.keys(SUPPORTED_LANGUAGES).includes(clean);
  }

  /**
   * Normalizes locale string to one of SupportedLocale.
   */
  public normalizeLocale(code: string): SupportedLocale {
    if (!code) return 'en';
    const clean = code.toLowerCase().split(/[-_]/)[0] as SupportedLocale;
    return SUPPORTED_LANGUAGES[clean] ? clean : 'en';
  }

  /**
   * Detects the best matching locale from navigator.languages or navigator.language.
   */
  public detectBrowserLocale(): SupportedLocale {
    if (typeof navigator === 'undefined') return 'en';

    const preferredLanguages = navigator.languages || [navigator.language || 'en'];

    for (const raw of preferredLanguages) {
      if (!raw) continue;
      const normalized = this.normalizeLocale(raw);
      if (this.isValidLocale(raw)) {
        return normalized;
      }
    }

    return 'en';
  }

  /**
   * Reads stored locale from localStorage with fail-safe error handling.
   */
  private getStoredLocale(): SupportedLocale | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(STORAGE_KEY);
        if (val && this.isValidLocale(val)) {
          return this.normalizeLocale(val);
        }
      }
    } catch (_) {}
    return null;
  }

  /**
   * Persists locale to localStorage.
   */
  private persistLocale(locale: SupportedLocale): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, locale);
      }
    } catch (_) {}
  }

  /**
   * Get the active locale code.
   */
  public getLanguage(): SupportedLocale {
    return this.currentLocale;
  }

  /**
   * Get metadata for the active locale.
   */
  public getCurrentLanguageMeta(): LanguageMeta {
    return SUPPORTED_LANGUAGES[this.currentLocale];
  }

  /**
   * Get metadata for all supported languages.
   */
  public getSupportedLanguages(): LanguageMeta[] {
    return Object.values(SUPPORTED_LANGUAGES);
  }

  /**
   * Switches language dynamically without page reload.
   * Updates `html` `lang` and `dir` attributes, flushes formatters, and notifies subscribers.
   */
  public setLanguage(locale: string, persist = true): boolean {
    const nextLocale = this.normalizeLocale(locale);
    this.currentLocale = nextLocale;

    if (persist) {
      this.persistLocale(nextLocale);
    }

    // Flush cached formatters for new locale
    this.numberFormatters.clear();
    this.dateTimeFormatters.clear();
    this.relativeTimeFormatters.clear();

    const meta = SUPPORTED_LANGUAGES[nextLocale];

    // Update DOM documentElement attributes if in browser environment
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = meta.direction;

      if (meta.direction === 'rtl') {
        document.documentElement.classList.add('rtl-layout');
      } else {
        document.documentElement.classList.remove('rtl-layout');
      }
    }

    // Notify registered listeners
    this.notifyListeners(nextLocale, meta);
    return true;
  }

  /**
   * Register a subscriber callback for language changes.
   */
  public onLanguageChange(callback: LanguageChangeListener): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(locale: SupportedLocale, meta: LanguageMeta): void {
    for (const listener of this.listeners) {
      try {
        listener(locale, meta);
      } catch (err) {
        console.error('[i18n Listener Error]', err);
      }
    }
  }

  // ─── TRANSLATION METHODS ───────────────────────────────────────────────────

  /**
   * Translates a dot-notation key (e.g. 'common.appName', 'vault.merkleRoot').
   * Supports parametric interpolation: `t('common.hello', { name: 'Alice' })` -> "Hello, Alice!"
   */
  public t(key: string, params?: Record<string, string | number>, fallback?: string): string {
    if (!key) return fallback || '';

    const dict = DICTIONARIES[this.currentLocale] || DICTIONARIES.en;
    const enDictionary = DICTIONARIES.en;

    const resolved = this.resolveNestedKey(dict, key) ?? this.resolveNestedKey(enDictionary, key) ?? fallback ?? key;

    if (typeof resolved !== 'string') {
      return fallback || key;
    }

    if (!params || Object.keys(params).length === 0) {
      return resolved;
    }

    // Interpolate {paramName}
    return resolved.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, paramName) => {
      if (params[paramName] !== undefined) {
        return String(params[paramName]);
      }
      return match;
    });
  }

  /**
   * Helper to resolve nested object keys by dot notation.
   */
  private resolveNestedKey(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr && typeof curr === 'object' && part in curr) {
        curr = curr[part];
      } else {
        return undefined;
      }
    }
    return curr;
  }

  /**
   * Plural-aware translation helper.
   */
  public tPlural(key: string, count: number, params?: Record<string, string | number>): string {
    const fullParams = { count, ...(params || {}) };
    if (count === 0) {
      const zeroKey = `${key}_zero`;
      const zeroVal = this.t(zeroKey, fullParams, '');
      if (zeroVal) return zeroVal;
    } else if (count === 1) {
      const oneKey = `${key}_one`;
      const oneVal = this.t(oneKey, fullParams, '');
      if (oneVal) return oneVal;
    }
    return this.t(key, fullParams);
  }

  // ─── REGIONAL INTL FORMATTING METHODS ──────────────────────────────────────

  /**
   * Format numbers according to active locale.
   */
  public formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    const cacheKey = JSON.stringify(options || {});
    let formatter = this.numberFormatters.get(cacheKey);
    if (!formatter) {
      try {
        formatter = new Intl.NumberFormat(this.currentLocale, options);
        this.numberFormatters.set(cacheKey, formatter);
      } catch (_) {
        return String(value);
      }
    }
    return formatter.format(value);
  }

  /**
   * Format currency values.
   */
  public formatCurrency(amount: number, currency = 'USD'): string {
    return this.formatNumber(amount, {
      style: 'currency',
      currency,
    });
  }

  /**
   * Format percentage values (e.g. 0.985 -> 98.5%).
   */
  public formatPercent(value: number, maximumFractionDigits = 1): string {
    return this.formatNumber(value, {
      style: 'percent',
      maximumFractionDigits,
    });
  }

  /**
   * Format byte sizes with localized units.
   */
  public formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return `0 ${this.t('units.byte')}`;
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = [
      this.t('units.byte'),
      this.t('units.kilobyte'),
      this.t('units.megabyte'),
      this.t('units.gigabyte'),
      this.t('units.terabyte'),
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const index = Math.min(i, sizes.length - 1);
    const formattedNum = this.formatNumber(parseFloat((bytes / Math.pow(k, index)).toFixed(dm)));
    return `${formattedNum} ${sizes[index]}`;
  }

  /**
   * Format date according to active locale.
   */
  public formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const defaultOptions: Intl.DateTimeFormatOptions = options || {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    const cacheKey = JSON.stringify(defaultOptions);
    let formatter = this.dateTimeFormatters.get(cacheKey);
    if (!formatter) {
      try {
        formatter = new Intl.DateTimeFormat(this.currentLocale, defaultOptions);
        this.dateTimeFormatters.set(cacheKey, formatter);
      } catch (_) {
        return d.toLocaleDateString();
      }
    }
    return formatter.format(d);
  }

  /**
   * Format time according to active locale.
   */
  public formatTime(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const defaultOptions: Intl.DateTimeFormatOptions = options || {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };

    return this.formatDate(d, defaultOptions);
  }

  /**
   * Format combined Date and Time.
   */
  public formatDateTime(date: Date | number): string {
    return this.formatDate(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Format relative time (e.g. "3 minutes ago", "in 2 hours", "just now").
   */
  public formatRelativeTime(date: Date | number, baseDate: Date | number = Date.now()): string {
    const targetMs = typeof date === 'number' ? date : date.getTime();
    const baseMs = typeof baseDate === 'number' ? baseDate : baseDate.getTime();
    const diffSec = Math.round((targetMs - baseMs) / 1000);

    if (Math.abs(diffSec) < 10) {
      return this.t('units.justNow');
    }

    try {
      let formatter = this.relativeTimeFormatters.get(this.currentLocale);
      if (!formatter) {
        formatter = new Intl.RelativeTimeFormat(this.currentLocale, { numeric: 'auto' });
        this.relativeTimeFormatters.set(this.currentLocale, formatter);
      }

      const intervals: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
        { unit: 'year', seconds: 31536000 },
        { unit: 'month', seconds: 2592000 },
        { unit: 'week', seconds: 604800 },
        { unit: 'day', seconds: 86400 },
        { unit: 'hour', seconds: 3600 },
        { unit: 'minute', seconds: 60 },
        { unit: 'second', seconds: 1 },
      ];

      for (const { unit, seconds } of intervals) {
        const count = Math.round(diffSec / seconds);
        if (Math.abs(diffSec) >= seconds || unit === 'second') {
          return formatter.format(count, unit);
        }
      }
    } catch (_) {
      // Fallback
      const absSec = Math.abs(diffSec);
      if (absSec < 60) return `${absSec} ${this.t('units.seconds')} ${this.t('units.ago')}`;
      if (absSec < 3600) return `${Math.floor(absSec / 60)} ${this.t('units.minutes')} ${this.t('units.ago')}`;
      if (absSec < 86400) return `${Math.floor(absSec / 3600)} ${this.t('units.hours')} ${this.t('units.ago')}`;
      return `${Math.floor(absSec / 86400)} ${this.t('units.days')} ${this.t('units.ago')}`;
    }

    return this.t('units.justNow');
  }

  // ─── UI COMPONENTS & SELECTOR HELPERS ──────────────────────────────────────

  /**
   * Generates HTML markup for the Sovereign Language Picker Dropdown / Selector.
   */
  public renderLanguagePicker(variant: 'dropdown' | 'inline' | 'compact' = 'dropdown'): string {
    const current = this.getCurrentLanguageMeta();
    const allLanguages = this.getSupportedLanguages();

    if (variant === 'compact') {
      return `
        <div class="relative inline-block text-left" id="aetheris-lang-picker-compact">
          <button
            type="button"
            id="btn-toggle-lang-menu"
            class="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-xs font-mono text-slate-200 transition-all cursor-pointer shadow-sm"
            title="Switch Language (${current.name})"
          >
            <span>${current.flag}</span>
            <span class="font-bold uppercase">${current.code}</span>
            <span class="text-[10px] text-slate-400">▼</span>
          </button>
        </div>
      `;
    }

    if (variant === 'inline') {
      return `
        <div class="flex flex-wrap gap-2 p-2 rounded-2xl bg-surface-raised border border-white/10" id="aetheris-lang-picker-inline">
          ${allLanguages
            .map(
              (lang) => `
            <button
              type="button"
              data-action="select-lang"
              data-lang="${lang.code}"
              data-lang-code="${lang.code}"
              class="lang-select-btn flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                lang.code === this.currentLocale
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 border border-indigo-400'
                  : 'bg-surface-overlay/60 text-slate-300 hover:bg-surface-overlay hover:text-white border border-white/5'
              }"
            >
              <span>${lang.flag}</span>
              <span>${lang.nativeName}</span>
              ${lang.direction === 'rtl' ? '<span class="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">RTL</span>' : ''}
            </button>
          `
            )
            .join('')}
        </div>
      `;
    }

    // Default Dropdown Modal/Card
    return `
      <div class="p-4 rounded-2xl bg-surface-base border border-white/10 space-y-3 font-mono text-xs select-none shadow-xl max-w-sm">
        <div class="flex items-center justify-between pb-2 border-subtle-b">
          <div class="flex items-center space-x-2">
            <span class="text-base">🌐</span>
            <h4 class="font-bold text-white">${this.t('nav.language')}</h4>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">
              ${current.direction.toUpperCase()}
            </span>
            <button type="button" id="btn-close-lang" data-action="close-lang" class="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer" title="Close">✕</button>
          </div>
        </div>
        <p class="text-[11px] text-slate-400">
          Seamless zero-reload dynamic localization. Arabic natively activates bidirectional RTL layout.
        </p>
        <div class="grid grid-cols-1 gap-1.5">
          ${allLanguages
            .map(
              (lang) => `
            <button
              type="button"
              data-action="select-lang"
              data-lang="${lang.code}"
              data-lang-code="${lang.code}"
              class="lang-select-btn w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                lang.code === this.currentLocale
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 font-bold shadow-sm'
                  : 'bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5'
              }"
            >
              <div class="flex items-center space-x-2.5">
                <span class="text-base">${lang.flag}</span>
                <div class="text-left ${lang.direction === 'rtl' ? 'text-right' : ''}">
                  <div class="font-bold text-white">${lang.nativeName}</div>
                  <div class="text-[10px] text-slate-400">${lang.name} · ${lang.region}</div>
                </div>
              </div>
              <div class="flex items-center space-x-1.5">
                <span class="text-[9px] px-1.5 py-0.5 rounded font-mono ${lang.tier === 'official' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-white/10'}">${lang.tier === 'official' ? '100%' : 'Beta'}</span>
                ${lang.direction === 'rtl' ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">RTL</span>' : ''}
                ${lang.code === this.currentLocale ? '<span class="text-emerald-400 font-bold">✓</span>' : ''}
              </div>
            </button>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }
}

// ─── SINGLETON EXPORT & CONVENIENCE ALIASES ──────────────────────────────────

export const i18n = new I18nEngine();
serviceRegistry.registerInstance(SERVICES.I18nEngine, i18n);
export const t = (key: string, params?: Record<string, string | number>, fallback?: string) =>
  i18n.t(key, params, fallback);
