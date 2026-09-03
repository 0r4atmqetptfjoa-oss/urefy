import { describe, it, expect, vi } from 'vitest';
import {
  clamp,
  formatBytes,
  safeJsonParse,
  debounce,
  throttle,
  isBrowser,
  safeWindow,
  safeLocalStorage,
  getAudioContextClass,
  getEthereumProvider,
  isMetaMaskInstalled,
  PASSIVE_EVENT_OPTIONS,
  rafThrottle,
  createAbortableSignal,
} from '../src/dry-utils.js';

describe('DRY Reusable Utilities', () => {
  it('should clamp numbers correctly within bounds', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('should format byte values into readable strings', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('should safely parse JSON with fallback support', () => {
    expect(safeJsonParse('{"valid": true}', { valid: false })).toEqual({ valid: true });
    expect(safeJsonParse('{bad_json', { fallback: 42 })).toEqual({ fallback: 42 });
  });

  it('should debounce function executions', async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('should throttle function executions', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('should provide safe environment and web3 accessors', () => {
    // In test environment, window may be mocked or present
    expect(typeof isBrowser()).toBe('boolean');
    const win = safeWindow();
    expect(win).toBeDefined();

    // Local storage
    const storage = safeLocalStorage();
    expect(storage).toBeDefined();

    // Web3 helpers
    expect(typeof isMetaMaskInstalled()).toBe('boolean');
  });

  it('should export standard passive event options', () => {
    expect(PASSIVE_EVENT_OPTIONS.passive).toBe(true);
    expect(PASSIVE_EVENT_OPTIONS.capture).toBe(false);
  });

  it('should throttle function executions using rafThrottle', async () => {
    const fn = vi.fn();
    const throttled = rafThrottle(fn);

    throttled('a');
    throttled('b');
    throttled('c');

    // Wait for animation frame / microtask
    await new Promise((r) => setTimeout(r, 40));

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');

    // Test cancel
    const fn2 = vi.fn();
    const throttled2 = rafThrottle(fn2);
    throttled2('test');
    throttled2.cancel();
    await new Promise((r) => setTimeout(r, 40));
    expect(fn2).not.toHaveBeenCalled();
  });

  it('should create abortable signal with parent signal and timeout', () => {
    const parent = new AbortController();
    const { controller, signal, cleanup } = createAbortableSignal(parent.signal);
    expect(signal.aborted).toBe(false);

    parent.abort();
    expect(signal.aborted).toBe(true);
    cleanup();
  });
});
