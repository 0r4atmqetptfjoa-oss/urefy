import { describe, it, expect, beforeEach, vi } from 'vitest';

// Provide clean Node.js test environment mocks for localStorage and document
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => storageMap.set(k, String(v)),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
  get length() { return storageMap.size; },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
};
(globalThis as any).localStorage = mockLocalStorage;

class MockElement {
  public tagName: string;
  public classList = {
    classes: new Set<string>(),
    add: (c: string) => MockElement.prototype.classListAdd.call(this, c),
    remove: (c: string) => MockElement.prototype.classListRemove.call(this, c),
    contains: (c: string) => MockElement.prototype.classListContains.call(this, c),
  };
  public attributes = new Map<string, string>();
  public innerHTML: string = '';
  public value: string = '';
  public isContentEditable: boolean = false;
  public listeners = new Map<string, ((e: any) => void)[]>();

  private classListAdd(c: string) { this.classList.classes.add(c); }
  private classListRemove(c: string) { this.classList.classes.delete(c); }
  private classListContains(c: string) { return this.classList.classes.has(c); }

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  getAttribute(k: string) { return this.attributes.get(k) ?? null; }
  setAttribute(k: string, v: string) { this.attributes.set(k, v); }
  addEventListener(event: string, fn: (e: any) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(fn);
  }
  removeEventListener(event: string, fn: (e: any) => void) {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.indexOf(fn);
      if (idx >= 0) list.splice(idx, 1);
    }
  }
  dispatchEvent(e: any) {
    const list = this.listeners.get(e.type) || [];
    list.forEach(fn => fn(e));
  }
  scrollIntoView() {}
  appendChild(child: any) { return child; }
  removeChild(child: any) { return child; }
  focus() {
    (globalThis as any).document.activeElement = this;
  }
  closest() { return null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
}

let mockElements: MockElement[] = [];
if (typeof (globalThis as any).document === 'undefined' || !(globalThis as any).document.createElement) {
  (globalThis as any).document = {
    activeElement: null,
    body: { appendChild: () => {} },
    createElement: (tag: string) => new MockElement(tag),
    addEventListener: (event: string, fn: (e: any) => void) => {},
    removeEventListener: (event: string, fn: (e: any) => void) => {},
    querySelectorAll: (sel: string) => mockElements,
    getElementById: (id: string) => null,
  };
}

import { clientStore } from '../src/client-state.js';
import { sovereignMnemonicModal } from '../src/mnemonic-modal.js';
import { keyboardNav, SOVEREIGN_SHORTCUTS } from '../src/keyboard-nav.js';
import { validateMnemonic, generateMnemonic } from '@aetheris/core-crypto';

describe('Phase 1: Sovereign Mnemonic Recovery & Keyboard Navigation Suite', () => {
  beforeEach(() => {
    storageMap.clear();
    sovereignMnemonicModal.closeModal();
    keyboardNav.destroy();
    keyboardNav.init();
    vi.restoreAllMocks();
    (globalThis as any).document.activeElement = null;
  });

  describe('1. Sovereign Mnemonic Identity Store', () => {
    it('should initialize clientStore with a valid 12-word BIP-39 mnemonic', () => {
      expect(clientStore.mnemonic).toBeDefined();
      expect(typeof clientStore.mnemonic).toBe('string');
      expect(clientStore.mnemonic.split(' ').length).toBe(12);
      expect(validateMnemonic(clientStore.mnemonic)).toBe(true);
    });

    it('should fail to restore identity from an invalid or corrupted mnemonic phrase', () => {
      const invalidPhrase = 'abandon ability able invalidword foo bar baz';
      const result = clientStore.restoreIdentityFromMnemonic(invalidPhrase);
      expect(result).toBe(false);
    });

    it('should successfully restore sovereign identity from a valid 12-word mnemonic phrase', () => {
      const testMnemonic = generateMnemonic(128);
      const restored = clientStore.restoreIdentityFromMnemonic(testMnemonic);
      expect(restored).toBe(true);
      expect(clientStore.mnemonic).toBe(testMnemonic);
      expect(clientStore.keypair).toBeDefined();
      // Invariant: Plaintext mnemonic is NEVER persisted in localStorage (Blocker 1)
      expect(mockLocalStorage.getItem('aetheris_identity_mnemonic')).toBeFalsy();
    });
  });

  describe('2. Sovereign Mnemonic Modal & Verification Quiz', () => {
    it('should open and close modal and toggle reveal state', () => {
      expect(sovereignMnemonicModal.isOpen).toBe(false);

      sovereignMnemonicModal.openModal('backup');
      expect(sovereignMnemonicModal.isOpen).toBe(true);
      expect(sovereignMnemonicModal.activeTab).toBe('backup');
      expect(sovereignMnemonicModal.isRevealed).toBe(false);

      sovereignMnemonicModal.toggleReveal();
      expect(sovereignMnemonicModal.isRevealed).toBe(true);

      sovereignMnemonicModal.closeModal();
      expect(sovereignMnemonicModal.isOpen).toBe(false);
    });

    it('should render modal HTML with BIP-39 badge and 12-word grid', () => {
      sovereignMnemonicModal.openModal('backup');
      const html = sovereignMnemonicModal.renderModalHTML();
      expect(html).toContain('Sovereign Identity Seed Vault');
      expect(html).toContain('BIP-39');
      expect(html).toContain('Click to Reveal Seed Phrase');
    });

    it('should validate backup quiz correctly', () => {
      const words = clientStore.mnemonic.trim().split(/\s+/);
      const indices = sovereignMnemonicModal.quizIndices; // [2, 6, 10]

      // Wrong answers
      const wrongAnswers = {
        [indices[0]]: 'wrongword',
        [indices[1]]: words[indices[1]],
        [indices[2]]: words[indices[2]],
      };
      expect(sovereignMnemonicModal.submitQuiz(wrongAnswers)).toBe(false);

      // Correct answers
      const correctAnswers = {
        [indices[0]]: words[indices[0]],
        [indices[1]]: words[indices[1]],
        [indices[2]]: words[indices[2]],
      };
      expect(sovereignMnemonicModal.submitQuiz(correctAnswers)).toBe(true);
      expect(sovereignMnemonicModal.quizPassed).toBe(true);
      expect(mockLocalStorage.getItem('aetheris_seed_verified')).toBe('true');
    });
  });

  describe('3. Power Keyboard Navigation Engine', () => {
    it('should have standard sovereign shortcuts registered', () => {
      expect(SOVEREIGN_SHORTCUTS.length).toBeGreaterThanOrEqual(8);
      expect(SOVEREIGN_SHORTCUTS.some(s => s.key.includes('J'))).toBe(true);
      expect(SOVEREIGN_SHORTCUTS.some(s => s.key.includes('K'))).toBe(true);
      expect(SOVEREIGN_SHORTCUTS.some(s => s.key === '?')).toBe(true);
    });

    it('should toggle and render keyboard shortcuts guide modal', () => {
      expect(keyboardNav.isHelpModalOpen).toBe(false);

      keyboardNav.openHelpModal();
      expect(keyboardNav.isHelpModalOpen).toBe(true);

      const html = keyboardNav.renderHelpModalHTML();
      expect(html).toContain('Keyboard Shortcuts');
      expect(html).toContain('Vim Mode');

      keyboardNav.closeHelpModal();
      expect(keyboardNav.isHelpModalOpen).toBe(false);
    });

    it('should navigate between feed post cards on J and K key events', () => {
      const card1 = new MockElement('div');
      card1.setAttribute('data-post-card-id', 'post-1');
      const card2 = new MockElement('div');
      card2.setAttribute('data-post-card-id', 'post-2');
      const card3 = new MockElement('div');
      card3.setAttribute('data-post-card-id', 'post-3');

      mockElements = [card1, card2, card3];

      keyboardNav.selectNext();
      expect(keyboardNav.activeIndex).toBe(0);
      expect(keyboardNav.getActivePostId()).toBe('post-1');

      keyboardNav.selectNext();
      expect(keyboardNav.activeIndex).toBe(1);
      expect(keyboardNav.getActivePostId()).toBe('post-2');

      keyboardNav.selectPrevious();
      expect(keyboardNav.activeIndex).toBe(0);
      expect(keyboardNav.getActivePostId()).toBe('post-1');
    });

    it('should ignore single-character shortcuts when an input or textarea is focused', () => {
      const input = new MockElement('input');
      input.focus();

      const initialIndex = keyboardNav.activeIndex;
      const event = { key: 'j', ctrlKey: false, metaKey: false, altKey: false, preventDefault: vi.fn() } as any;
      keyboardNav.handleKeyDown(event);

      expect(keyboardNav.activeIndex).toBe(initialIndex); // Unchanged
    });
  });
});
