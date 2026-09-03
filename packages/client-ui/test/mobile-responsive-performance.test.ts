import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MobileResponsivePerformanceManager,
  mobilePerformance,
  type MobilePerformanceMetrics,
} from '../src/mobile-performance.js';

// ─── LIGHTWEIGHT TEST DOM ENVIRONMENT MOCK ────────────────────────────────────

class TestClassList {
  private classes = new Set<string>();

  constructor(initial: string = '') {
    if (initial) {
      initial.split(/\s+/).filter(Boolean).forEach((c) => this.classes.add(c));
    }
  }

  public add(...tokens: string[]): void {
    tokens.forEach((t) => {
      t.split(/\s+/).filter(Boolean).forEach((c) => this.classes.add(c));
    });
  }

  public remove(...tokens: string[]): void {
    tokens.forEach((t) => {
      t.split(/\s+/).filter(Boolean).forEach((c) => this.classes.delete(c));
    });
  }

  public contains(token: string): boolean {
    return this.classes.has(token);
  }

  public toggle(token: string, force?: boolean): boolean {
    if (force !== undefined) {
      if (force) this.classes.add(token);
      else this.classes.delete(token);
      return force;
    }
    if (this.classes.has(token)) {
      this.classes.delete(token);
      return false;
    }
    this.classes.add(token);
    return true;
  }

  public toString(): string {
    return Array.from(this.classes).join(' ');
  }
}

class TestElement {
  public id: string = '';
  public tagName: string = 'DIV';
  public parentNode: TestElement | null = null;
  public children: TestElement[] = [];
  public attributes: Map<string, string> = new Map();
  public classList: TestClassList;
  private listeners: Map<string, Set<Function>> = new Map();
  private _innerHTML: string = '';

  constructor(tagName: string = 'div') {
    this.tagName = tagName.toUpperCase();
    this.classList = new TestClassList();
  }

  public get className(): string {
    return this.classList.toString();
  }

  public set className(val: string) {
    this.classList = new TestClassList(val);
  }

  public get innerHTML(): string {
    return this._innerHTML;
  }

  public set innerHTML(val: string) {
    this._innerHTML = val;
    this.children = [];
    // Basic parser to detect child tags and data-placeholder-ids or id attributes in test templates
    const idMatches = val.matchAll(/(?:^|\s)id="([^"]+)"/g);
    for (const match of idMatches) {
      const child = new TestElement('div');
      child.id = match[1];
      child.parentNode = this;
      this.children.push(child);
    }
    const placeholderMatches = val.matchAll(/data-placeholder-id="([^"]+)"/g);
    for (const match of placeholderMatches) {
      const child = new TestElement('div');
      child.setAttribute('data-placeholder-id', match[1]);
      child.parentNode = this;
      this.children.push(child);
    }
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === 'id') this.id = value;
    if (name === 'class') this.className = value;
  }

  public getAttribute(name: string): string | null {
    if (name === 'id') return this.id || null;
    if (name === 'class') return this.className || null;
    return this.attributes.get(name) || null;
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  public appendChild(child: TestElement): TestElement {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  public removeChild(child: TestElement): TestElement {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  public replaceChild(newChild: TestElement, oldChild: TestElement): TestElement {
    const idx = this.children.indexOf(oldChild);
    if (idx !== -1) {
      this.children[idx] = newChild;
      newChild.parentNode = this;
      oldChild.parentNode = null;
    }
    return newChild;
  }

  public querySelector(selector: string): TestElement | null {
    if (selector.startsWith('#')) {
      const targetId = selector.slice(1);
      return this.findElement((el) => el.id === targetId);
    }
    if (selector.startsWith('[data-placeholder-id="')) {
      const targetId = selector.match(/\[data-placeholder-id="([^"]+)"\]/)?.[1];
      return this.findElement((el) => el.getAttribute('data-placeholder-id') === targetId);
    }
    return null;
  }

  public querySelectorAll(selector: string): TestElement[] {
    const results: TestElement[] = [];
    this.walkElements((el) => {
      if (selector.startsWith('.') && el.classList.contains(selector.slice(1))) {
        results.push(el);
      }
    });
    return results;
  }

  private findElement(predicate: (el: TestElement) => boolean): TestElement | null {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const found = child.findElement(predicate);
      if (found) return found;
    }
    return null;
  }

  private walkElements(visitor: (el: TestElement) => void): void {
    for (const child of this.children) {
      visitor(child);
      child.walkElements(visitor);
    }
  }

  public addEventListener(type: string, listener: Function, options?: any): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  public removeEventListener(type: string, listener: Function, options?: any): void {
    this.listeners.get(type)?.delete(listener);
  }

  public dispatchEvent(event: any): boolean {
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      for (const listener of Array.from(typeListeners)) {
        listener.call(this, event);
      }
    }
    return true;
  }

  public click(): void {
    this.dispatchEvent({ type: 'click', target: this });
  }
}

class TestDocument {
  public body: TestElement = new TestElement('BODY');

  public createElement(tagName: string): TestElement {
    return new TestElement(tagName);
  }

  public getElementById(id: string): TestElement | null {
    if (this.body.id === id) return this.body;
    return this.body.querySelector(`#${id}`);
  }

  public querySelector(selector: string): TestElement | null {
    return this.body.querySelector(selector);
  }

  public querySelectorAll(selector: string): TestElement[] {
    return this.body.querySelectorAll(selector);
  }
}

// Setup simulated globals for Vitest
const testDoc = new TestDocument();
(globalThis as any).document = testDoc;
(globalThis as any).HTMLElement = TestElement;
(globalThis as any).HTMLButtonElement = TestElement;
(globalThis as any).Event = class {
  constructor(public type: string) {}
};

describe('Mobile Responsive & Cross-Device Performance Test Suite', () => {
  let manager: MobileResponsivePerformanceManager;

  beforeEach(() => {
    (globalThis as any).document = testDoc;
    (globalThis as any).HTMLElement = TestElement;
    (globalThis as any).HTMLButtonElement = TestElement;
    (globalThis as any).Event = class {
      constructor(public type: string) {}
    };
    testDoc.body = new TestElement('BODY');
    manager = new MobileResponsivePerformanceManager();
  });

  afterEach(() => {
    testDoc.body = new TestElement('BODY');
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. MOBILE BOTTOM NAVIGATION DOCK (#app-mobile-bottom-nav)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Mobile Bottom Navigation Dock (#app-mobile-bottom-nav)', () => {
    it('should generate valid HTML containing #app-mobile-bottom-nav and required action buttons', () => {
      const html = manager.renderMobileBottomNav('pulse-global');
      expect(html).toContain('id="app-mobile-bottom-nav"');
      expect(html).toContain('data-nav-mode="pulse"');
      expect(html).toContain('data-nav-mode="vault"');
      expect(html).toContain('id="btn-mobile-composer"');
      expect(html).toContain('data-nav-mode="relays"');
      expect(html).toContain('id="btn-mobile-search"');
      expect(html).toContain('gpu-accelerated');
      expect(html).toContain('no-flicker');
    });

    it('should detect the presence of #app-mobile-bottom-nav when mounted in the DOM', () => {
      expect(manager.isMobileNavPresent()).toBe(false);

      const navEl = testDoc.createElement('nav') as any;
      navEl.id = 'app-mobile-bottom-nav';
      testDoc.body.appendChild(navEl);

      expect(manager.isMobileNavPresent()).toBe(true);
    });

    it('should highlight active tab in rendered template based on activeChannelId', () => {
      const pulseHtml = manager.renderMobileBottomNav('pulse-global');
      expect(pulseHtml).toContain('text-indigo-400 font-bold');

      const vaultHtml = manager.renderMobileBottomNav('vault-archive');
      expect(vaultHtml).toContain('text-emerald-400 font-bold');
    });

    it('should update and retrieve active mobile navigation tab correctly', () => {
      expect(manager.getActiveMobileTab()).toBe('pulse');
      manager.setActiveMobileTab('vault');
      expect(manager.getActiveMobileTab()).toBe('vault');
      manager.setActiveMobileTab('relays');
      expect(manager.getActiveMobileTab()).toBe('relays');
    });

    it('should interact with bottom navigation buttons in live DOM', () => {
      const bottomNav = testDoc.createElement('nav') as any;
      bottomNav.id = 'app-mobile-bottom-nav';

      const composerBtn = testDoc.createElement('button') as any;
      composerBtn.id = 'btn-mobile-composer';
      bottomNav.appendChild(composerBtn);

      const searchBtn = testDoc.createElement('button') as any;
      searchBtn.id = 'btn-mobile-search';
      bottomNav.appendChild(searchBtn);

      testDoc.body.appendChild(bottomNav);

      expect(testDoc.getElementById('app-mobile-bottom-nav')).not.toBeNull();
      expect(testDoc.getElementById('btn-mobile-composer')).not.toBeNull();
      expect(testDoc.getElementById('btn-mobile-search')).not.toBeNull();

      const clickSpy = vi.fn();
      composerBtn.addEventListener('click', clickSpy);
      composerBtn.click();
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MOBILE DRAWER OPENING & CLOSING DYNAMICS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Mobile Drawer Opening & Closing Dynamics', () => {
    let leftRail: any;
    let toggleBtn: any;
    let closeBtn: any;

    beforeEach(() => {
      leftRail = testDoc.createElement('aside');
      leftRail.id = 'left-rail-container';
      leftRail.className = 'w-64 bg-surface-base border-subtle-r hidden lg:flex';
      testDoc.body.appendChild(leftRail);

      toggleBtn = testDoc.createElement('button');
      toggleBtn.id = 'btn-toggle-mobile-drawer';
      testDoc.body.appendChild(toggleBtn);

      closeBtn = testDoc.createElement('button');
      closeBtn.id = 'btn-close-mobile-drawer';
      testDoc.body.appendChild(closeBtn);
    });

    it('should open mobile drawer and add fixed overlay and GPU acceleration classes', () => {
      expect(manager.isDrawerOpen).toBe(false);
      expect(leftRail.classList.contains('hidden')).toBe(true);

      manager.openDrawer(leftRail);

      expect(manager.isDrawerOpen).toBe(true);
      expect(leftRail.classList.contains('hidden')).toBe(false);
      expect(leftRail.classList.contains('fixed')).toBe(true);
      expect(leftRail.classList.contains('inset-y-0')).toBe(true);
      expect(leftRail.classList.contains('left-0')).toBe(true);
      expect(leftRail.classList.contains('z-50')).toBe(true);
      expect(leftRail.classList.contains('w-72')).toBe(true);
      expect(leftRail.classList.contains('gpu-accelerated')).toBe(true);
      expect(leftRail.getAttribute('aria-hidden')).toBe('false');
    });

    it('should close mobile drawer and restore hidden class', () => {
      manager.openDrawer(leftRail);
      expect(manager.isDrawerOpen).toBe(true);

      manager.closeDrawer(leftRail);

      expect(manager.isDrawerOpen).toBe(false);
      expect(leftRail.classList.contains('hidden')).toBe(true);
      expect(leftRail.classList.contains('fixed')).toBe(false);
      expect(leftRail.getAttribute('aria-hidden')).toBe('true');
    });

    it('should toggle mobile drawer state back and forth cleanly', () => {
      expect(manager.isDrawerOpen).toBe(false);

      const state1 = manager.toggleDrawer(leftRail);
      expect(state1).toBe(true);
      expect(manager.isDrawerOpen).toBe(true);
      expect(leftRail.classList.contains('hidden')).toBe(false);

      const state2 = manager.toggleDrawer(leftRail);
      expect(state2).toBe(false);
      expect(manager.isDrawerOpen).toBe(false);
      expect(leftRail.classList.contains('hidden')).toBe(true);
    });

    it('should handle simulated click events on toggle and close drawer buttons', () => {
      toggleBtn.addEventListener('click', () => {
        manager.toggleDrawer(leftRail);
      });

      closeBtn.addEventListener('click', () => {
        manager.closeDrawer(leftRail);
      });

      // Toggle Open
      toggleBtn.click();
      expect(manager.isDrawerOpen).toBe(true);
      expect(leftRail.classList.contains('fixed')).toBe(true);

      // Close via Close Button
      closeBtn.click();
      expect(manager.isDrawerOpen).toBe(false);
      expect(leftRail.classList.contains('hidden')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ZERO-FLICKER & ISOLATED DOM CONTAINER PERSISTENCE
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Zero-Flicker & Isolated DOM Container Persistence', () => {
    it('should register and retrieve isolated DOM containers with proper classes', () => {
      const container = testDoc.createElement('div') as any;
      container.id = 'chat-mesh-stream';

      manager.registerIsolatedContainer('chat-mesh-stream', container);

      expect(manager.hasIsolatedContainer('chat-mesh-stream')).toBe(true);
      expect(manager.getIsolatedContainer('chat-mesh-stream')).toBe(container);
      expect(container.classList.contains('isolated-dom-container')).toBe(true);
      expect(container.classList.contains('no-flicker')).toBe(true);
    });

    it('should remove and clear isolated containers safely', () => {
      const container1 = testDoc.createElement('div') as any;
      const container2 = testDoc.createElement('div') as any;

      manager.registerIsolatedContainer('c1', container1);
      manager.registerIsolatedContainer('c2', container2);
      expect(manager.hasIsolatedContainer('c1')).toBe(true);
      expect(manager.hasIsolatedContainer('c2')).toBe(true);

      const removed = manager.removeIsolatedContainer('c1');
      expect(removed).toBe(true);
      expect(manager.hasIsolatedContainer('c1')).toBe(false);
      expect(manager.hasIsolatedContainer('c2')).toBe(true);

      manager.clearIsolatedContainers();
      expect(manager.hasIsolatedContainer('c2')).toBe(false);
    });

    it('should preserve and recall arbitrary DOM state across view re-renders', () => {
      manager.preserveDOMState('feed-scroll', { scrollTop: 1420, activeIndex: 7 });
      const state = manager.getPreservedDOMState('feed-scroll');
      expect(state).toEqual({ scrollTop: 1420, activeIndex: 7 });

      manager.preserveDOMState('feed-scroll', { filter: 'zk-proofs' });
      const updatedState = manager.getPreservedDOMState('feed-scroll');
      expect(updatedState).toEqual({ scrollTop: 1420, activeIndex: 7, filter: 'zk-proofs' });

      manager.clearPreservedDOMState('feed-scroll');
      expect(manager.getPreservedDOMState('feed-scroll')).toBeUndefined();
    });

    it('should execute renderWithoutFlicker and re-inject preserved child nodes without destruction', () => {
      const stage = testDoc.createElement('div') as any;
      stage.id = 'main-stage-container';
      testDoc.body.appendChild(stage);

      // Create an active element (e.g. WebGL canvas or interactive input)
      const persistentNode = testDoc.createElement('div') as any;
      persistentNode.id = 'persistent-webgl-canvas';
      persistentNode.innerHTML = '<span>Active GL Context</span>';
      persistentNode.__secretMarker = 'persisted-node-ref';

      stage.appendChild(persistentNode);

      // Re-render outer layout while preserving the node
      manager.renderWithoutFlicker(
        'main-stage-container',
        '<div class="header">New Layout Header</div><div data-placeholder-id="persistent-webgl-canvas"></div>',
        ['persistent-webgl-canvas']
      );

      const reAttached = stage.querySelector('#persistent-webgl-canvas');
      expect(reAttached).not.toBeNull();
      expect((reAttached as any).__secretMarker).toBe('persisted-node-ref');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. PASSIVE EVENT LISTENERS & TOUCH SWIPE SUPPORT
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. Passive Event Listeners & Touch Swipe Support', () => {
    it('should support passive event detection', () => {
      const supported = manager.supportsPassive();
      expect(typeof supported).toBe('boolean');
    });

    it('should attach passive listeners and increment passive listener count', () => {
      const div = testDoc.createElement('div') as any;
      const handler = vi.fn();

      expect(manager.getPassiveListenerCount()).toBe(0);

      const unsubscribe = manager.addPassiveListener(div, 'touchstart', handler);
      expect(manager.getPassiveListenerCount()).toBe(1);

      // Dispatch event
      const event = { type: 'touchstart' };
      div.dispatchEvent(event);
      expect(handler).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();
      expect(manager.getPassiveListenerCount()).toBe(0);

      div.dispatchEvent(event);
      expect(handler).toHaveBeenCalledTimes(1); // Should not fire again
    });

    it('should attach smooth passive touch swipe gesture handlers for mobile ergonomics', () => {
      const swipeTarget = testDoc.createElement('div') as any;
      const onLeft = vi.fn();
      const onRight = vi.fn();

      const detach = manager.attachTouchSwipeGesture(swipeTarget, onLeft, onRight, {
        thresholdPx: 40,
        maxVerticalDeviationPx: 50,
      });

      expect(manager.getPassiveListenerCount()).toBe(2); // touchstart + touchend

      // Simulate Right Swipe (startX: 10, endX: 80, deltaX: 70 > 40)
      const touchStartEvent: any = { type: 'touchstart', touches: [{ clientX: 10, clientY: 20 }] };
      swipeTarget.dispatchEvent(touchStartEvent);

      const touchEndEvent: any = { type: 'touchend', changedTouches: [{ clientX: 80, clientY: 25 }] };
      swipeTarget.dispatchEvent(touchEndEvent);

      expect(onRight).toHaveBeenCalledTimes(1);
      expect(onLeft).toHaveBeenCalledTimes(0);

      // Simulate Left Swipe (startX: 100, endX: 30, deltaX: -70 < -40)
      touchStartEvent.touches = [{ clientX: 100, clientY: 20 }];
      swipeTarget.dispatchEvent(touchStartEvent);

      touchEndEvent.changedTouches = [{ clientX: 30, clientY: 25 }];
      swipeTarget.dispatchEvent(touchEndEvent);

      expect(onLeft).toHaveBeenCalledTimes(1);

      detach();
      expect(manager.getPassiveListenerCount()).toBe(0);
    });

    it('should ignore gestures exceeding vertical deviation limits', () => {
      const swipeTarget = testDoc.createElement('div') as any;
      const onRight = vi.fn();

      manager.attachTouchSwipeGesture(swipeTarget, undefined, onRight, {
        thresholdPx: 40,
        maxVerticalDeviationPx: 30,
      });

      // Swipe right with large vertical scroll (deltaX: 60, deltaY: 100 > 30)
      const start: any = { type: 'touchstart', touches: [{ clientX: 10, clientY: 10 }] };
      swipeTarget.dispatchEvent(start);

      const end: any = { type: 'touchend', changedTouches: [{ clientX: 70, clientY: 110 }] };
      swipeTarget.dispatchEvent(end);

      expect(onRight).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. GPU-ACCELERATED CSS CLASSES & HARDWARE OPTIMIZATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('5. GPU-Accelerated CSS Classes & Hardware Optimizations', () => {
    it('should provide the standard sovereign GPU acceleration classes', () => {
      const gpuClasses = manager.getGPUClasses();
      expect(gpuClasses).toContain('gpu-accelerated');
      expect(gpuClasses).toContain('hardware-accelerated');
      expect(gpuClasses).toContain('no-flicker');
      expect(gpuClasses).toContain('will-change-transform');
    });

    it('should apply and verify GPU acceleration classes on target DOM nodes', () => {
      const card = testDoc.createElement('article') as any;
      expect(manager.isGPUAccelerated(card)).toBe(false);

      manager.applyGPUAcceleration(card);
      expect(manager.isGPUAccelerated(card)).toBe(true);
      expect(card.classList.contains('gpu-accelerated')).toBe(true);
      expect(card.classList.contains('no-flicker')).toBe(true);

      manager.removeGPUAcceleration(card);
      expect(manager.isGPUAccelerated(card)).toBe(false);
      expect(card.classList.contains('gpu-accelerated')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. FRAME BUDGET & PERFORMANCE TELEMETRY
  // ─────────────────────────────────────────────────────────────────────────────
  describe('6. Frame Budget & Performance Telemetry', () => {
    it('should provide default 60 FPS metrics when no frames are recorded', () => {
      const metrics = manager.getPerformanceMetrics();
      expect(metrics.averageFps).toBe(60);
      expect(metrics.droppedFrames).toBe(0);
      expect(metrics.isHighPerformance).toBe(true);
    });

    it('should compute frame metrics accurately for 60fps budget (<16.67ms)', () => {
      // Record 10 smooth frames of ~16ms
      for (let i = 0; i < 10; i++) {
        manager.recordFrameTime(16.0);
      }

      const metrics = manager.getPerformanceMetrics();
      expect(metrics.averageFps).toBe(63); // 1000/16 = 62.5 -> 63
      expect(metrics.droppedFrames).toBe(0);
      expect(metrics.isHighPerformance).toBe(true);
      expect(metrics.totalFramesRecorded).toBe(10);
    });

    it('should detect dropped frames (>16.67ms) and flag low performance', () => {
      // Record 5 frames of 33ms (30 FPS, dropped)
      for (let i = 0; i < 5; i++) {
        manager.recordFrameTime(33.33);
      }

      const metrics = manager.getPerformanceMetrics();
      expect(metrics.averageFps).toBe(30);
      expect(metrics.droppedFrames).toBe(5);
      expect(metrics.isHighPerformance).toBe(false);

      manager.resetPerformanceMetrics();
      const resetMetrics = manager.getPerformanceMetrics();
      expect(resetMetrics.totalFramesRecorded).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. SINGLETON INSTANCE INTEGRATION
  // ─────────────────────────────────────────────────────────────────────────────
  describe('7. Singleton Instance Export', () => {
    it('should export a ready-to-use singleton instance', () => {
      expect(mobilePerformance).toBeInstanceOf(MobileResponsivePerformanceManager);
      expect(typeof mobilePerformance.openDrawer).toBe('function');
      expect(typeof mobilePerformance.renderMobileBottomNav).toBe('function');
    });
  });
});
