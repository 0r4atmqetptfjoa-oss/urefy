import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isLocalDev } from '../src/admin-auth.js';
import { RSSImporter } from '../src/rss-import.js';
import { CVEMonitor } from '../src/cve-monitor.js';

beforeEach(() => {
  (globalThis as any).__UREFY_DEMO_MODE__ = false;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  (globalThis as any).__UREFY_DEMO_MODE__ = true;
});

describe('Browser fixture and development authentication boundary', () => {
  it('does not display a fabricated scanned dependency inventory in a browser', () => {
    vi.stubEnv('VITEST', 'false');
    vi.stubGlobal('window', { location: { hostname: 'urefy.com' } });
    expect(new CVEMonitor().scannedLibraries).toEqual([]);
  });
  it('does not invent RSS articles or successful fetches in a browser', () => {
    vi.stubEnv('VITEST', 'false');
    vi.stubGlobal('window', { location: { hostname: 'urefy.com' } });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    const importer = new RSSImporter();
    expect(importer.items).toEqual([]);
    expect(importer.feeds.length).toBeGreaterThan(0);
    expect(importer.feeds.every(feed => feed.lastFetched === undefined && feed.itemCount === 0)).toBe(true);
  });

  it('does not enable fixtures or development shortcuts on localhost outside tests', () => {
    vi.stubEnv('VITEST', 'false');
    vi.stubGlobal('window', { location: { hostname: 'localhost' } });
    expect(isLocalDev()).toBe(false);
  });

  it('keeps isolated localhost unit fixtures available to the test runner', () => {
    vi.stubEnv('VITEST', 'true');
    vi.stubGlobal('window', { location: { hostname: 'localhost' } });
    expect(isLocalDev()).toBe(true);
  });

  it('never enables development shortcuts on a public hostname', () => {
    vi.stubEnv('VITEST', 'true');
    vi.stubGlobal('window', { location: { hostname: 'urefy.com' } });
    expect(isLocalDev()).toBe(false);
  });
});
