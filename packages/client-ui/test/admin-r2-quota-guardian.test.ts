import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Provide lightweight Mock DOM for headless test environment
class MockDOMElement {
  public id: string = '';
  public textContent: string = '';
  public style: Record<string, string> = {};
  public classList = {
    _classes: new Set<string>(),
    add: (...classes: string[]) => classes.forEach((c) => this.classList._classes.add(c)),
    remove: (...classes: string[]) => classes.forEach((c) => this.classList._classes.delete(c)),
    contains: (c: string) => this.classList._classes.has(c),
  };
  public listeners: Record<string, ((e: any) => void)[]> = {};

  constructor(id: string = '') {
    this.id = id;
  }

  addEventListener(event: string, fn: (e: any) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  click() {
    if (this.listeners['click']) {
      this.listeners['click'].forEach((fn) => fn({ preventDefault: () => {} }));
    }
    // Also trigger document delegated listeners
    if ((globalThis as any).document?._dispatchDelegated) {
      (globalThis as any).document._dispatchDelegated('click', {
        target: this,
        preventDefault: () => {},
      });
    }
  }

  closest(selector: string) {
    if (selector === `#${this.id}` || (this.id && selector.includes(this.id))) {
      return this;
    }
    return null;
  }
}

const domStore = new Map<string, MockDOMElement>();

function getMockElement(id: string): MockDOMElement {
  if (!domStore.has(id)) {
    domStore.set(id, new MockDOMElement(id));
  }
  return domStore.get(id)!;
}

const delegatedListeners: Record<string, ((e: any) => void)[]> = {};

(globalThis as any).document = {
  getElementById(id: string) {
    return getMockElement(id);
  },
  querySelectorAll(selector: string) {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return [getMockElement(id)];
    }
    return [];
  },
  addEventListener(event: string, fn: (e: any) => void) {
    if (!delegatedListeners[event]) delegatedListeners[event] = [];
    delegatedListeners[event].push(fn);
  },
  _dispatchDelegated(event: string, evObj: any) {
    if (delegatedListeners[event]) {
      delegatedListeners[event].forEach((fn) => fn(evObj));
    }
  },
  readyState: 'complete',
  body: {
    innerHTML: '',
  },
};
(globalThis as any).window = globalThis;
if (!(globalThis as any).addEventListener) {
  (globalThis as any).addEventListener = (event: string, fn: any) => {};
  (globalThis as any).removeEventListener = (event: string, fn: any) => {};
}
if (!(globalThis as any).window.addEventListener) {
  (globalThis as any).window.addEventListener = (event: string, fn: any) => {};
  (globalThis as any).window.removeEventListener = (event: string, fn: any) => {};
}

// Dynamic import after document mock setup
const {
  fetchAndRenderR2Quota,
  renderR2QuotaDOM,
  normalizeR2QuotaResponse,
  initR2QuotaGuardian,
  R2_FREE_TIER_LIMITS,
} = await import('../src/admin.js');

const { adminPanel } = await import('../src/admin-panel.js');

describe('Admin Dashboard — Cloudflare R2 Free Tier Quota Guardian', () => {
  beforeEach(() => {
    domStore.clear();
    // Pre-create standard quota elements in mock DOM
    [
      'btn-refresh-r2-quota',
      'r2-storage-val',
      'r2-storage-bar',
      'r2-storage-pct',
      'r2-class-a-val',
      'r2-class-a-bar',
      'r2-class-a-pct',
      'r2-class-b-val',
      'r2-class-b-bar',
      'r2-class-b-pct',
    ].forEach((id) => getMockElement(id));

    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Static HTML Template Verification in admin.html', () => {
    it('verifies that admin.html contains the dedicated Cloudflare R2 Quota Guardian card', () => {
      const adminHtmlPath = path.resolve(__dirname, '../admin.html');
      const content = fs.readFileSync(adminHtmlPath, 'utf8');

      expect(content).toContain('CLOUDFLARE R2 ZERO-OVERAGE QUOTA GUARDIAN');
      expect(content).toContain('Cloudflare R2 Free Tier Guardian');
      expect(content).toContain('100% FREE TIER PROTECTED');
      expect(content).toContain('btn-refresh-r2-quota');
      expect(content).toContain('r2-storage-val');
      expect(content).toContain('r2-storage-bar');
      expect(content).toContain('r2-storage-pct');
      expect(content).toContain('r2-class-a-val');
      expect(content).toContain('r2-class-a-bar');
      expect(content).toContain('r2-class-a-pct');
      expect(content).toContain('r2-class-b-val');
      expect(content).toContain('r2-class-b-bar');
      expect(content).toContain('r2-class-b-pct');
      expect(content).toContain('8.0 GB');
      expect(content).toContain('750,000');
      expect(content).toContain('7,500,000');
    });

    it('verifies that admin-panel.ts renders the Quota Guardian card in the WAF tab', () => {
      adminPanel.setTab('waf');
      const renderedHtml = adminPanel.renderAdminPanel('genesis-core', '25m');

      expect(renderedHtml).toContain('CLOUDFLARE R2 ZERO-OVERAGE QUOTA GUARDIAN');
      expect(renderedHtml).toContain('Cloudflare R2 Free Tier Guardian');
      expect(renderedHtml).toContain('100% FREE TIER PROTECTED');
      expect(renderedHtml).toContain('btn-refresh-r2-quota');
      expect(renderedHtml).toContain('r2-storage-val');
      expect(renderedHtml).toContain('r2-class-a-val');
      expect(renderedHtml).toContain('r2-class-b-val');
    });
  });

  describe('2. fetchAndRenderR2Quota() Telemetry & DOM Updating', () => {
    it('fetches /api/storage?action=quota and updates all 9 meter elements correctly', async () => {
      const mockQuotaResponse = {
        success: true,
        protectionMode: 'STRICT_FREE_TIER_ENFORCED',
        circuitBreaker: 'ARMED_AND_PROTECTED',
        storage: {
          usedBytes: 2147483648, // 2.0 GB
          usedGB: 2.0,
          safeLimitGB: 8.0,
          percentUsed: 25.0,
        },
        classA: {
          used: 150000,
          cap: 750000,
          percentUsed: 20.0,
        },
        classB: {
          used: 750000,
          cap: 7500000,
          percentUsed: 10.0,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockQuotaResponse,
      });

      const metrics = await fetchAndRenderR2Quota();

      expect(global.fetch).toHaveBeenCalledWith('/api/storage?action=quota', expect.any(Object));
      expect(metrics.storage.usedGB).toBe(2.0);
      expect(metrics.classA.used).toBe(150000);
      expect(metrics.classB.used).toBe(750000);

      // Verify DOM updates
      const storageVal = getMockElement('r2-storage-val');
      const storageBar = getMockElement('r2-storage-bar');
      const storagePct = getMockElement('r2-storage-pct');

      expect(storageVal.textContent).toBe('2.00 GB / 8.0 GB');
      expect(storageBar.style.width).toBe('25%');
      expect(storagePct.textContent).toBe('25.0% used');

      const classAVal = getMockElement('r2-class-a-val');
      const classABar = getMockElement('r2-class-a-bar');
      const classAPct = getMockElement('r2-class-a-pct');

      expect(classAVal.textContent).toBe('150,000 / 750,000');
      expect(classABar.style.width).toBe('20%');
      expect(classAPct.textContent).toBe('20.0% used');

      const classBVal = getMockElement('r2-class-b-val');
      const classBBar = getMockElement('r2-class-b-bar');
      const classBPct = getMockElement('r2-class-b-pct');

      expect(classBVal.textContent).toBe('750,000 / 7,500,000');
      expect(classBBar.style.width).toBe('10%');
      expect(classBPct.textContent).toBe('10.0% used');
    });

    it('falls back safely to zero-overage baseline upon network error without crashing', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline or edge unreachable'));

      const metrics = await fetchAndRenderR2Quota();

      expect(metrics).toBeDefined();
      expect(metrics.storage.usedGB).toBe(0);
      expect(metrics.classA.used).toBe(0);
      expect(metrics.classB.used).toBe(0);

      expect(getMockElement('r2-storage-val').textContent).toBe('0.00 GB / 8.0 GB');
      expect(getMockElement('r2-class-a-val').textContent).toBe('0 / 750,000');
      expect(getMockElement('r2-class-b-val').textContent).toBe('0 / 7,500,000');
    });

    it('normalizes various payload schemas from storage endpoint', () => {
      // Direct raw bytes schema
      const normalized1 = normalizeR2QuotaResponse({
        usedBytes: 1073741824, // 1 GB
        classAUsed: 5000,
        classBUsed: 20000,
      });

      expect(normalized1.storage.usedGB).toBe(1);
      expect(normalized1.storage.capGB).toBe(8.0);
      expect(normalized1.classA.used).toBe(5000);
      expect(normalized1.classB.used).toBe(20000);

      // Explicit nested schema
      const normalized2 = normalizeR2QuotaResponse({
        storage: { usedGB: 4.5, capGB: 8.0, percentUsed: 56.25 },
        classA: { used: 375000, cap: 750000, percentUsed: 50 },
        classB: { used: 3750000, cap: 7500000, percentUsed: 50 },
      });

      expect(normalized2.storage.usedGB).toBe(4.5);
      expect(normalized2.classA.percentUsed).toBe(50);
      expect(normalized2.classB.percentUsed).toBe(50);
    });
  });

  describe('3. Event Wiring & Interactive Quota Refresh', () => {
    it('refreshes quota when #btn-refresh-r2-quota is clicked', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          storage: { usedGB: 0.5, capGB: 8.0, percentUsed: 6.25 },
          classA: { used: 1000, cap: 750000, percentUsed: 0.13 },
          classB: { used: 5000, cap: 7500000, percentUsed: 0.07 },
        }),
      });

      initR2QuotaGuardian();

      const refreshBtn = getMockElement('btn-refresh-r2-quota');
      refreshBtn.click();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(global.fetch).toHaveBeenCalled();
      expect(getMockElement('r2-storage-val').textContent).toBe('0.50 GB / 8.0 GB');
    });

    it('handles global delegated click events on dynamically added buttons', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          storage: { usedGB: 1.25, capGB: 8.0, percentUsed: 15.63 },
          classA: { used: 2500, cap: 750000, percentUsed: 0.33 },
          classB: { used: 12000, cap: 7500000, percentUsed: 0.16 },
        }),
      });

      const dynamicBtn = new MockDOMElement('btn-refresh-r2-quota');
      dynamicBtn.click();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(global.fetch).toHaveBeenCalled();
      expect(getMockElement('r2-storage-val').textContent).toBe('1.25 GB / 8.0 GB');
    });
  });

  describe('4. Invariant Compliance', () => {
    it('strictly enforces Cloudflare R2 Free Tier safe caps', () => {
      expect(R2_FREE_TIER_LIMITS.storageCapGB).toBe(8.0);
      expect(R2_FREE_TIER_LIMITS.storageMaxFreeGB).toBe(10.0);
      expect(R2_FREE_TIER_LIMITS.singleUploadCapMB).toBe(25);
      expect(R2_FREE_TIER_LIMITS.classACap).toBe(750000);
      expect(R2_FREE_TIER_LIMITS.classAMaxFree).toBe(1000000);
      expect(R2_FREE_TIER_LIMITS.classBCap).toBe(7500000);
      expect(R2_FREE_TIER_LIMITS.classBMaxFree).toBe(10000000);
    });
  });
});
