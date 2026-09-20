import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => storageMap.set(k, String(v)),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
  get length() {
    return storageMap.size;
  },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
};
(globalThis as any).localStorage = mockLocalStorage;
if (typeof (globalThis as any).Event === 'undefined') {
  (globalThis as any).Event = class Event {
    type: string;
    constructor(type: string) { this.type = type; }
    stopPropagation() {}
    preventDefault() {}
  };
}
if (typeof (globalThis as any).MouseEvent === 'undefined') {
  (globalThis as any).MouseEvent = class MouseEvent extends (globalThis as any).Event {};
}

const domElements = new Map<string, any>();
if (typeof (globalThis as any).document === 'undefined' || !(globalThis as any).document.createElement) {
  (globalThis as any).document = {
    activeElement: null,
    documentElement: {
      setAttribute: () => {},
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
      },
    },
    body: { appendChild: () => {}, removeChild: () => {} },
    getElementById: (id: string) => domElements.get(id) || null,
    createElement: (tag: string) => {
      const el: any = {
        id: '',
        tagName: tag.toUpperCase(),
        textContent: '',
        value: '',
        checked: false,
        type: '',
        classList: {
          classes: new Set<string>(),
          add(c: string) { this.classes.add(c); },
          remove(c: string) { this.classes.delete(c); },
          toggle(c: string) {
            if (this.classes.has(c)) {
              this.classes.delete(c);
              return false;
            } else {
              this.classes.add(c);
              return true;
            }
          },
          contains(c: string) { return this.classes.has(c); },
        },
        attributes: new Map<string, string>(),
        getAttribute(k: string) {
          if (k === 'id') return el.id;
          if (k === 'data-action') return el.dataset?.action ?? el.attributes.get('data-action') ?? null;
          return el.attributes.get(k) ?? null;
        },
        setAttribute(k: string, v: string) {
          if (k === 'id') {
            el.id = v;
            domElements.set(v, el);
          }
          el.attributes.set(k, v);
          if (k.startsWith('data-')) {
            const key = k.replace(/^data-/, '').replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
            el.dataset[key] = v;
          }
        },
        dataset: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
        click: () => {},
        appendChild: (child: any) => child,
        removeChild: (child: any) => child,
        remove: () => {
          if (el.id) domElements.delete(el.id);
        },
      };
      return el;
    },
  };
}

import { ProfileView, profileView } from '../src/profile/profile-view.js';
import { SETTINGS_CATEGORIES, renderProfileSettingsHTML, renderSettingsCategoryContentHTML } from '../src/profile/profile-settings.js';
import { clientStore } from '../src/client-state.js';
import { themeEngine } from '../src/themes.js';
import { actionDispatcher } from '../src/ui/action-dispatcher.js';

describe('Sovereign Profile Settings - Comprehensive Functional Audit', () => {
  let profile: ProfileView;

  beforeEach(() => {
    profile = new ProfileView();
    storageMap.clear();
    domElements.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. should include all 9 sovereign settings categories in navigation', () => {
    expect(SETTINGS_CATEGORIES).toHaveLength(9);
    const categoryIds = SETTINGS_CATEGORIES.map(c => c.id);
    expect(categoryIds).toEqual([
      'account',
      'security',
      'privacy',
      'notifications',
      'appearance',
      'messaging',
      'data',
      'accessibility',
      'advanced',
    ]);
  });

  it('2. should render settings pills navigation with data-action="set-profile-settings-cat"', () => {
    const user = profile.getProfile('genesis-core');
    const html = renderProfileSettingsHTML('account', user, 'genesis-core');

    expect(html).toContain('id="profile-settings-panel"');
    expect(html).toContain('data-action="set-profile-settings-cat"');
    expect(html).toContain('data-settings-cat="account"');
    expect(html).toContain('data-settings-cat="security"');
    expect(html).toContain('data-settings-cat="privacy"');
    expect(html).toContain('data-settings-cat="appearance"');
    expect(html).toContain('data-settings-cat="messaging"');
    expect(html).toContain('data-settings-cat="data"');
    expect(html).toContain('data-settings-cat="accessibility"');
    expect(html).toContain('data-settings-cat="advanced"');
  });

  it('3. should render Account category with copy handle and edit profile', () => {
    const user = profile.getProfile('genesis-core');
    const html = renderSettingsCategoryContentHTML('account', user, 'genesis-core');

    expect(html).toContain('data-settings-section="account"');
    expect(html).toContain('data-action="open-edit-profile"');
    expect(html).toContain('data-action="settings-copy-fed-handle"');
    expect(html).toContain('Public Ed25519 Fingerprint');
    expect(html).toContain('genesis-core');
  });

  it('4. should render Security category with passkey, seed phrase, and guardians without call-global', () => {
    const user = profile.getProfile('genesis-core');
    const html = renderSettingsCategoryContentHTML('security', user, 'genesis-core');

    expect(html).toContain('data-settings-section="security"');
    expect(html).toContain('data-action="settings-register-passkey"');
    expect(html).toContain('data-action="settings-toggle-seed"');
    expect(html).toContain('data-action="settings-open-guardians"');
    expect(html).toContain('data-feature="paper-wallet"');
    expect(html).toContain('id="settings-seed-display"');
    expect(html).not.toContain('data-action="call-global"');
  });

  it('5. should render Privacy category with 3-tier progressive complexity and trust slider', () => {
    const user = profile.getProfile('genesis-core');
    const html = renderSettingsCategoryContentHTML('privacy', user, 'genesis-core');

    expect(html).toContain('data-settings-section="privacy"');
    expect(html).toContain('data-action="settings-set-ui-mode"');
    expect(html).toContain('data-mode="simple"');
    expect(html).toContain('data-mode="advanced"');
    expect(html).toContain('data-mode="technical"');
    expect(html).toContain('data-input="settings-set-trust-threshold"');
    expect(html).toContain('data-change="settings-set-trust-threshold"');
    expect(html).toContain('data-action="settings-zeroize-memory"');
    expect(html).not.toContain('data-action="call-global"');
  });

  it('6. should render Appearance category with 12 curated themes and density switcher', () => {
    const user = profile.getProfile('genesis-core');
    const html = renderSettingsCategoryContentHTML('appearance', user, 'genesis-core');

    expect(html).toContain('data-settings-section="appearance"');
    expect(html).toContain('data-action="settings-set-theme"');
    expect(html).toContain('data-theme-id="obsidian-cyber"');
    expect(html).toContain('data-theme-id="matrix-monolith"');
    expect(html).toContain('data-theme-id="tokyo-neon"');
    expect(html).toContain('data-action="settings-set-density"');
    expect(html).toContain('data-density="compact"');
    expect(html).toContain('data-density="balanced"');
    expect(html).toContain('data-density="media"');
    expect(html).not.toContain('data-action="call-global"');
  });

  it('7. should render Messaging category with Sealed Sender toggle and disappearing timer', () => {
    const user = profile.getProfile('genesis-core');
    const html = renderSettingsCategoryContentHTML('messaging', user, 'genesis-core');

    expect(html).toContain('data-settings-section="messaging"');
    expect(html).toContain('data-change="settings-toggle-pref"');
    expect(html).toContain('data-pref="sealed_sender"');
    expect(html).toContain('data-change="settings-set-pref"');
    expect(html).toContain('data-pref="ephemeral_timer"');
  });

  it('8. should render Data & Storage category with full backup export and file restore', () => {
    const user = profile.getProfile('genesis-core');
    const html = renderSettingsCategoryContentHTML('data', user, 'genesis-core');

    expect(html).toContain('data-settings-section="data"');
    expect(html).toContain('data-action="settings-export-backup"');
    expect(html).toContain('data-change="settings-import-backup"');
    expect(html).toContain('data-feature="export-backup"');
    expect(html).not.toContain('data-action="call-global"');
  });

  it('9. should render Accessibility category with motion dynamics and contrast toggles', () => {
    const user = profile.getProfile('genesis-core');
    const html = renderSettingsCategoryContentHTML('accessibility', user, 'genesis-core');

    expect(html).toContain('data-settings-section="accessibility"');
    expect(html).toContain('data-change="settings-set-pref"');
    expect(html).toContain('data-pref="motion_dynamics"');
    expect(html).toContain('data-change="settings-toggle-pref"');
    expect(html).toContain('data-pref="high_contrast"');
    expect(html).toContain('data-pref="focus_ring"');
    expect(html).toContain('data-pref="autoplay_video"');
  });

  it('10. should render Advanced category with transparency inspector and diagnostics export', () => {
    const user = profile.getProfile('genesis-core');
    const html = renderSettingsCategoryContentHTML('advanced', user, 'genesis-core');

    expect(html).toContain('data-settings-section="advanced"');
    expect(html).toContain('data-action="settings-open-transparency"');
    expect(html).toContain('data-action="settings-export-diagnostics"');
    expect(html).not.toContain('data-action="call-global"');
  });

  it('11. clientStore should support setDensity and setUiMode with localStorage persistence', () => {
    clientStore.setDensity('compact');
    expect(clientStore.density).toBe('compact');
    expect(localStorage.getItem('aetheris_density_mode')).toBe('compact');

    clientStore.setDensity('media');
    expect(clientStore.density).toBe('media');
    expect(localStorage.getItem('aetheris_density_mode')).toBe('media');

    clientStore.setUiMode('technical');
    expect(clientStore.uiMode).toBe('technical');
    expect(localStorage.getItem('aetheris_ui_mode')).toBe('technical');

    clientStore.setUiMode('simple');
    expect(clientStore.uiMode).toBe('simple');
    expect(localStorage.getItem('aetheris_ui_mode')).toBe('simple');
  });

  it('12. ActionDispatcher should handle set-profile-settings-cat cleanly', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'set-profile-settings-cat');
    btn.setAttribute('data-settings-cat', 'security');

    actionDispatcher.dispatch('set-profile-settings-cat', btn, new MouseEvent('click'));
    expect(profileView.activeSettingsCategory).toBe('security');
    expect(profileView.activeTab).toBe('settings');

    btn.setAttribute('data-settings-cat', 'appearance');
    actionDispatcher.dispatch('set-profile-settings-cat', btn, new MouseEvent('click'));
    expect(profileView.activeSettingsCategory).toBe('appearance');
  });

  it('13. ActionDispatcher should toggle seed phrase reveal/hide in DOM', () => {
    const seedEl = document.createElement('div');
    seedEl.setAttribute('id', 'settings-seed-display');
    seedEl.classList.add('blur-sm');

    const btn = document.createElement('button');
    btn.setAttribute('id', 'btn-settings-toggle-seed');
    btn.setAttribute('data-action', 'settings-toggle-seed');
    btn.textContent = 'Reveal Seed';

    expect(seedEl.classList.contains('blur-sm')).toBe(true);

    actionDispatcher.dispatch('settings-toggle-seed', btn, new MouseEvent('click'));
    expect(seedEl.classList.contains('blur-sm')).toBe(false);
    expect(btn.textContent).toBe('Hide Seed');

    actionDispatcher.dispatch('settings-toggle-seed', btn, new MouseEvent('click'));
    expect(seedEl.classList.contains('blur-sm')).toBe(true);
    expect(btn.textContent).toBe('Reveal Seed');

    seedEl.remove();
    btn.remove();
  });

  it('14. ActionDispatcher should update trust threshold via dispatchInput', () => {
    const lbl = document.createElement('span');
    lbl.setAttribute('id', 'settings-trust-threshold-val');
    lbl.textContent = '0 / 100';

    const input = document.createElement('input');
    input.setAttribute('id', 'input-settings-trust-threshold');
    input.value = '75';

    actionDispatcher.dispatchInput('settings-set-trust-threshold', input, new Event('input'));
    expect(clientStore.minFeedTrustThreshold).toBe(75);
    expect(lbl.textContent).toBe('75 / 100');

    lbl.remove();
    input.remove();
  });

  it('15. ActionDispatcher should save preferences via dispatchChange', () => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = true;
    input.setAttribute('data-pref', 'notify_security');

    actionDispatcher.dispatchChange('settings-toggle-pref', input, new Event('change'));
    expect(localStorage.getItem('aetheris_pref_notify_security')).toBe('true');

    input.checked = false;
    actionDispatcher.dispatchChange('settings-toggle-pref', input, new Event('change'));
    expect(localStorage.getItem('aetheris_pref_notify_security')).toBe('false');
  });

  it('16. renderProfileTabsHTML strictly renders Posts, Replies, Media, Likes, Communities without coupled settings tab', async () => {
    const { renderProfileTabsHTML } = await import('../src/profile/profile-tabs.js');
    const ownerHtml = renderProfileTabsHTML('pulses', true);
    expect(ownerHtml).not.toContain('btn-profile-tab-settings');
    expect(ownerHtml).toContain('btn-profile-tab-pulses');
    expect(ownerHtml).toContain('btn-profile-tab-replies');
    expect(ownerHtml).toContain('btn-profile-tab-media');
    expect(ownerHtml).toContain('btn-profile-tab-likes');
    expect(ownerHtml).toContain('btn-profile-tab-communities');

    const visitorHtml = renderProfileTabsHTML('pulses', false);
    expect(visitorHtml).not.toContain('btn-profile-tab-settings');
  });

  it('17. ActionDispatcher open-settings navigates to dedicated settings workspace', async () => {
    const { sovereignRouter } = await import('../src/router.js');
    const settingsBtn = document.createElement('button');
    settingsBtn.setAttribute('data-action', 'open-settings');
    settingsBtn.setAttribute('data-subtab', 'security');

    actionDispatcher.dispatch('open-settings', settingsBtn, new MouseEvent('click'));
    expect(sovereignRouter.route).toBe('settings');
  });
});
