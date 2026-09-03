import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AetherisClientStore } from '../src/client-state.js';
import { i18n } from '../src/i18n.js';

class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const mockStorage = new LocalStorageMock();
(globalThis as any).localStorage = mockStorage;

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    location: { protocol: 'https:', host: 'localhost:5173' },
  };
} else if (!(globalThis as any).window.location) {
  (globalThis as any).window.location = { protocol: 'https:', host: 'localhost:5173' };
}

describe('Ticket 1.1: Simple / Sovereign Mode Switcher & Progressive Disclosure', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();
  });

  it('1. should default to simple mode when localStorage is empty', () => {
    const store = new AetherisClientStore();
    expect(store.uiMode).toBe('simple');
  });

  it('2. should rehydrate sovereign mode from localStorage on initialization', () => {
    mockStorage.setItem('aetheris_ui_mode', 'sovereign');
    const store = new AetherisClientStore();
    expect(store.uiMode).toBe('sovereign');
  });

  it('3. should persist mode change to localStorage and notify listeners', () => {
    const store = new AetherisClientStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setUiMode('sovereign');
    expect(store.uiMode).toBe('sovereign');
    expect(mockStorage.getItem('aetheris_ui_mode')).toBe('sovereign');
    expect(listener).toHaveBeenCalledWith('UI_MODE_CHANGED', { uiMode: 'sovereign' });

    store.setUiMode('simple');
    expect(store.uiMode).toBe('simple');
    expect(mockStorage.getItem('aetheris_ui_mode')).toBe('simple');
    expect(listener).toHaveBeenCalledWith('UI_MODE_CHANGED', { uiMode: 'simple' });
  });

  it('4. should toggle seamlessly between simple and sovereign modes', () => {
    const store = new AetherisClientStore();
    expect(store.uiMode).toBe('simple');

    store.toggleUiMode();
    expect(store.uiMode).toBe('sovereign');
    expect(mockStorage.getItem('aetheris_ui_mode')).toBe('sovereign');

    store.toggleUiMode();
    expect(store.uiMode).toBe('simple');
    expect(mockStorage.getItem('aetheris_ui_mode')).toBe('simple');
  });

  it('5. should have i18n localization keys for UI mode switching', () => {
    expect(i18n.t('uiMode.simple')).toBe('Simple');
    expect(i18n.t('uiMode.sovereign')).toBe('Sovereign');
    expect(i18n.t('uiMode.advancedTools')).toBe('Advanced Tools');
    expect(i18n.t('uiMode.switchMode')).toBe('Switch Interface Mode');

    // Switch to Romanian and check
    i18n.setLanguage('ro');
    expect(i18n.t('uiMode.simple')).toBe('Simplu');
    expect(i18n.t('uiMode.sovereign')).toBe('Suveran');
    expect(i18n.t('uiMode.advancedTools')).toBe('Unelte avansate');
    expect(i18n.t('uiMode.switchMode')).toBe('Comut\u0103 modul interfe\u021bei');

    // Reset back to English
    i18n.setLanguage('en');
  });

  it('6. should wire and toggle through global window helpers', () => {
    const store = new AetherisClientStore();
    (window as any).clientStore = store;
    
    (window as any).__aetheris_set_ui_mode = (mode: 'simple' | 'sovereign') => { store.setUiMode(mode); };
    (window as any).__aetheris_toggle_ui_mode = () => { store.toggleUiMode(); };

    (window as any).__aetheris_set_ui_mode('sovereign');
    expect(store.uiMode).toBe('sovereign');

    (window as any).__aetheris_toggle_ui_mode();
    expect(store.uiMode).toBe('simple');
  });
});
