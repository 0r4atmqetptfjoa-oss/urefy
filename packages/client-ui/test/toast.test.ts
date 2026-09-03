import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToastManager } from '../src/toast.js';

class MockElement {
  public id: string = '';
  public className: string = '';
  public innerHTML: string = '';
  public attributes: Record<string, string> = {};
  public classList = {
    add: (...classes: string[]) => {},
    remove: (...classes: string[]) => {},
  };
  public children: MockElement[] = [];

  constructor(public tagName: string = 'div') {}

  public appendChild(child: MockElement): void {
    this.children.push(child);
  }

  public remove(): void {
    if ((globalThis as any).document?.body) {
      const idx = (globalThis as any).document.body.children.indexOf(this);
      if (idx !== -1) (globalThis as any).document.body.children.splice(idx, 1);
    }
  }

  public setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  public addEventListener(event: string, handler: Function): void {}
}

describe('Aetheris Sovereign HUD Toast Notification System', () => {
  let toastManager: ToastManager;

  beforeEach(() => {
    const body = new MockElement('body');
    const elements = new Map<string, MockElement>();

    (globalThis as any).document = {
      body,
      getElementById: (id: string) => elements.get(id) || null,
      createElement: (tag: string) => {
        const el = new MockElement(tag);
        return el;
      },
    };

    // Override appendChild on body to index IDs
    const origAppend = body.appendChild.bind(body);
    body.appendChild = (child: MockElement) => {
      origAppend(child);
      if (child.id) elements.set(child.id, child);
    };

    toastManager = new ToastManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes and renders toast notifications', () => {
    const toast = toastManager.show({
      message: 'Post link copied to clipboard',
      type: 'success',
      icon: '🔗',
    });

    expect(toast).toBeDefined();
    expect(toast.message).toBe('Post link copied to clipboard');
    expect(toast.type).toBe('success');
    expect(toast.icon).toBe('🔗');
  });

  it('supports success, info, warning, and error helpers', () => {
    const s = toastManager.success('Operation completed');
    const i = toastManager.info('Information note');
    const w = toastManager.warning('Rate limit warning');
    const e = toastManager.error('Failed to broadcast');

    expect(s.type).toBe('success');
    expect(i.type).toBe('info');
    expect(w.type).toBe('warning');
    expect(e.type).toBe('error');

    expect(toastManager.activeToasts.length).toBe(4);
  });

  it('auto-dismisses toast after durationMs', () => {
    const toast = toastManager.show({
      message: 'Temporary alert',
      durationMs: 1000,
    });

    expect(toastManager.activeToasts.length).toBe(1);

    vi.advanceTimersByTime(1100);

    expect(toastManager.activeToasts.length).toBe(0);
  });

  it('dismisses toast on manual dismiss call', () => {
    const toast = toastManager.info('Dismiss test');
    expect(toastManager.activeToasts.length).toBe(1);

    toastManager.dismiss(toast.id);
    expect(toastManager.activeToasts.length).toBe(0);
  });
});
