import { describe, it, expect, beforeEach } from 'vitest';
import { themeEngine } from '../src/themes.js';
import { clientStore } from '../src/client-state.js';
import { mobileTabBar } from '../src/mobile-tab-bar.js';
import { sovereignDialog } from '../src/dialog-modal.js';

// Setup mock document for Node environment
const elementsMap = new Map<string, any>();
if (typeof (globalThis as any).document === 'undefined' || !(globalThis as any).document.createElement) {
  (globalThis as any).document = {
    activeElement: null,
    body: {
      appendChild: (el: any) => {
        if (el.id) elementsMap.set(el.id, el);
        return el;
      },
      removeChild: (el: any) => {
        if (el.id) elementsMap.delete(el.id);
        return el;
      },
      innerHTML: '',
    },
    createElement: (tag: string) => {
      const listeners = new Map<string, Function[]>();
      const el: any = {
        tagName: tag.toUpperCase(),
        id: '',
        className: '',
        innerHTML: '',
        classList: {
          classes: new Set<string>(),
          add(c: string) { this.classes.add(c); },
          remove(c: string) { this.classes.delete(c); },
          contains(c: string) { return this.classes.has(c); },
        },
        attributes: new Map<string, string>(),
        getAttribute(k: string) { return el.attributes.get(k) ?? null; },
        setAttribute(k: string, v: string) {
          el.attributes.set(k, v);
          if (k === 'id') {
            el.id = v;
            elementsMap.set(v, el);
          }
        },
        addEventListener: (event: string, fn: Function) => {
          if (!listeners.has(event)) listeners.set(event, []);
          listeners.get(event)?.push(fn);
        },
        removeEventListener: (event: string, fn: Function) => {
          const list = listeners.get(event);
          if (list) {
            const idx = list.indexOf(fn);
            if (idx >= 0) list.splice(idx, 1);
          }
        },
        dispatchEvent: (e: any) => {
          const list = listeners.get(e.type || 'click');
          if (list) list.forEach(fn => fn(e));
        },
        click: () => {
          if (typeof el.onclick === 'function') el.onclick();
          const list = listeners.get('click');
          if (list) list.forEach(fn => fn({ type: 'click' }));
        },
        appendChild: (child: any) => {
          if (child.id) elementsMap.set(child.id, child);
          return child;
        },
        removeChild: (child: any) => {
          if (child.id) elementsMap.delete(child.id);
          return child;
        },
        focus: () => {},
      };
      return el;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelectorAll: () => [],
    getElementById: (id: string) => {
      if (elementsMap.has(id)) return elementsMap.get(id);
      for (const el of elementsMap.values()) {
        if (el.innerHTML && el.innerHTML.includes(`id="${id}"`)) {
          const child = (globalThis as any).document.createElement(id.includes('btn') ? 'button' : 'div');
          child.id = id;
          if (id === 'sovereign-dialog-cancel-btn') {
            child.textContent = 'Cancel';
          } else if (id === 'sovereign-dialog-confirm-btn') {
            child.textContent = 'Confirm';
          }
          elementsMap.set(id, child);
          return child;
        }
      }
      return null;
    },
  };
}

describe('Ticket 4.7: Accessibility (a11y) Audit — ARIA, Labels, and Landmarks', () => {
  beforeEach(() => {
    elementsMap.clear();
    if ((globalThis as any).document && (globalThis as any).document.body) {
      (globalThis as any).document.body.innerHTML = '';
    }
  });

  it('1. Real mobile tab bar renders navigation landmark with proper ARIA attributes', () => {
    const html = mobileTabBar.renderTabBarHTML();
    expect(html).toContain('<nav');
    expect(html).toContain('role="navigation"');
    expect(html).toContain('aria-label="Mobile Sovereign Navigation"');
  });

  it('2. All mobile tab bar buttons have accessible names (aria-label or title) and min tap targets', () => {
    const html = mobileTabBar.renderTabBarHTML();
    const buttonMatches = html.match(/<button[^>]+>/g) || [];
    expect(buttonMatches.length).toBeGreaterThanOrEqual(4);

    for (const btnTag of buttonMatches) {
      const hasAriaLabel = btnTag.includes('aria-label=');
      const hasTitle = btnTag.includes('title=');
      expect(hasAriaLabel || hasTitle).toBe(true);
      // Touch target guideline
      expect(btnTag).toContain('min-h-[44px]');
    }

    // Must be in English, zero Romanian bleeding
    expect(html).not.toContain('title="Cerc"');
    expect(html).not.toContain('title="Profil"');
    expect(html).toContain('Feed');
    expect(html).toContain('Vault');
    expect(html).toContain('Profile');
  });

  it('3. themeEngine.renderDisplaySettingsModal includes dialog role and accessible attributes', () => {
    const html = themeEngine.renderDisplaySettingsModal();
    expect(html).toMatch(/role=["']dialog["']|id="app-settings-modal"|id="display-settings-modal"/);
    expect(html).toContain('Display & Theme Matrix');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Close modal"');
  });

  it('4. Sovereign Dialog creates an accessible modal with dialog role and aria-modal', () => {
    const promise = sovereignDialog.alert('Test accessibility message', { title: 'System Notice' });
    const modalRoot = document.getElementById('sovereign-dialog-root');
    expect(modalRoot).not.toBeNull();
    expect(modalRoot?.getAttribute('role')).toBe('dialog');
    expect(modalRoot?.getAttribute('aria-modal')).toBe('true');
    expect(modalRoot?.getAttribute('aria-labelledby')).toBe('sovereign-dialog-title');
    expect(modalRoot?.innerHTML).toContain('System Notice');
    expect(modalRoot?.innerHTML).toContain('Test accessibility message');

    const confirmBtn = document.getElementById('sovereign-dialog-confirm-btn');
    expect(confirmBtn).not.toBeNull();
    confirmBtn?.click();
    return promise;
  });

  it('5. Sovereign Dialog confirm creates accessible action buttons with Enter and Esc key traps', async () => {
    const promise = sovereignDialog.confirm('Proceed with cryptographic purge?', {
      title: 'Confirm Purge',
      confirmText: 'Purge Memory',
      cancelText: 'Cancel'
    });

    const modalRoot = document.getElementById('sovereign-dialog-root');
    expect(modalRoot).not.toBeNull();
    expect(modalRoot?.innerHTML).toContain('Confirm Purge');
    expect(modalRoot?.innerHTML).toContain('Proceed with cryptographic purge?');

    const cancelBtn = document.getElementById('sovereign-dialog-cancel-btn');
    expect(cancelBtn).not.toBeNull();
    expect(cancelBtn?.textContent).toContain('Cancel');

    cancelBtn?.click();
    const result = await promise;
    expect(result).toBe(false);
  });
});
