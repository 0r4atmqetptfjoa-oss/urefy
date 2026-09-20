import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Node.js DOM mock environment
const elementRegistry = new Map<string, any>();

function createMockElement(tag: string): any {
  let _id = '';
  const el: any = {
    tagName: tag.toUpperCase(),
    innerHTML: '',
    textContent: '',
    children: [] as any[],
    eventListeners: new Map<string, Function[]>(),
    classList: {
      classes: new Set<string>(),
      add(c: string) { this.classes.add(c); },
      remove(c: string) { this.classes.delete(c); },
      contains(c: string) { return this.classes.has(c); },
    },
    addEventListener(event: string, handler: Function) {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event)?.push(handler);
    },
    click() {
      const handlers = this.eventListeners.get('click') || [];
      for (const h of handlers) h({ target: el });
    },
    querySelector(selector: string) {
      if (selector.startsWith('#')) {
        const targetId = selector.slice(1);
        return elementRegistry.get(targetId) || null;
      }
      return null;
    },
    remove() {
      if (_id) elementRegistry.delete(_id);
      if (globalThis.document?.body) {
        const idx = (globalThis.document.body as any).children.indexOf(this);
        if (idx !== -1) (globalThis.document.body as any).children.splice(idx, 1);
      }
    }
  };

  Object.defineProperty(el, 'id', {
    get() { return _id; },
    set(val: string) {
      if (_id) elementRegistry.delete(_id);
      _id = val;
      if (val) elementRegistry.set(val, el);
    }
  });

  return el;
}

const mockDocument: any = {
  body: {
    children: [] as any[],
    appendChild(child: any) {
      this.children.push(child);
      return child;
    },
  },
  createElement(tag: string) {
    return createMockElement(tag);
  },
  getElementById(id: string) {
    return elementRegistry.get(id) || null;
  },
  querySelectorAll(selector: string) {
    const found = elementRegistry.get(selector.replace(/^#/, ''));
    return found ? [found] : [];
  },
};

(globalThis as any).document = mockDocument;
(globalThis as any).window = {
  location: { origin: 'https://aetheris.mesh' },
  navigator: { clipboard: { writeText: vi.fn() } },
};

import { MicroSaaSDocsModal } from '../src/microsaas-docs-modal.js';

describe('MicroSaaSDocsModal (Micro-SaaS & Developer APIs)', () => {
  let modal: MicroSaaSDocsModal;
  function mount() {
    let container = document.getElementById('microsaas-docs-modal');
    if (!container) { container = document.createElement('div'); container.id = 'microsaas-docs-modal'; document.body.appendChild(container); }
    container.innerHTML = modal.renderModalHTML();
  }

  beforeEach(() => {
    elementRegistry.clear();
    mockDocument.body.children = [];
    modal = new MicroSaaSDocsModal();
  });

  afterEach(() => {
    modal.close();
    elementRegistry.clear();
  });

  it('renders modal with Developer APIs header and tab buttons', () => {
    modal.open();
    mount(); // The shared ModalManager owns insertion into the document.
    const container = document.getElementById('microsaas-docs-modal');
    expect(container).not.toBeNull();
    expect(container?.innerHTML).toContain('Developer APIs & Micro-SaaS Hub');
    expect(container?.innerHTML).toContain('100% Free Edge Tier');

    // Check tabs in innerHTML
    expect(container?.innerHTML).toContain('tab-binary-hygiene-btn');
    expect(container?.innerHTML).toContain('tab-zk-trust-btn');
    expect(container?.innerHTML).toContain('tab-crypto-sdk-btn');
  });

  it('displays Binary Hygiene cURL snippet and test endpoint trigger in default tab', () => {
    modal.open();
    mount();
    const container = document.getElementById('microsaas-docs-modal');
    expect(container?.innerHTML).toContain('/api/scan-binary');
    expect(container?.innerHTML).toContain('Shannon entropy');
    expect(container?.innerHTML).toContain('UPX');
  });

  it('displays ZK Trust Badge and Post-Quantum SDK in respective tabs', () => {
    modal.open();
    mount();
    const container = document.getElementById('microsaas-docs-modal');

    // Simulate switching to zk-trust
    modal.setActiveTab('zk-trust');
    mount();
    const zkContainer = document.getElementById('microsaas-docs-modal');
    expect(zkContainer?.innerHTML).toContain('/embed/trust-badge');
    expect(zkContainer?.innerHTML).toContain('/api/verify-trust');
    expect(zkContainer?.innerHTML).toContain('BN254');

    // Simulate switching to crypto-sdk
    modal.setActiveTab('crypto-sdk');
    mount();
    const pqContainer = document.getElementById('microsaas-docs-modal');
    expect(pqContainer?.innerHTML).toContain('Post-Quantum (ML-KEM-768)');
    expect(pqContainer?.innerHTML).toContain('generateHybridKemKeyPair');
  });

  it('closes cleanly on close method call', () => {
    modal.open();
    mount();
    expect(document.getElementById('microsaas-docs-modal')).not.toBeNull();

    modal.close();
    expect(document.getElementById('microsaas-docs-modal')).toBeNull();
  });
});
