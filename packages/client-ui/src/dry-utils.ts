/**
 * AETHERIS HYBRID SUITE - REUSABLE DRY UTILITIES
 * Centralized, shared helper utilities eliminating duplicate patterns across the monorepo.
 */

import { EIP1193Provider, WindowAugmentation } from './window-augmentation.js';

/**
 * Checks if running in a client-side browser environment with DOM access.
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Safe accessor for global window with strict typing.
 */
export function safeWindow(): (Window & WindowAugmentation) | null {
  return typeof window !== 'undefined' ? (window as unknown as Window & WindowAugmentation) : null;
}

/**
 * Safe accessor for global document.
 */
export function safeDocument(): Document | null {
  return typeof document !== 'undefined' ? document : null;
}

/**
 * Safe accessor for localStorage.
 */
export function safeLocalStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // Storage restricted or running in isolated context
  }
  return null;
}

/**
 * Returns the browser AudioContext constructor with cross-browser webkitAudioContext fallback.
 */
export function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  return win.AudioContext || win.webkitAudioContext || null;
}

/**
 * Instantiates an AudioContext safely across modern and legacy browsers.
 */
export function createSafeAudioContext(options?: AudioContextOptions): AudioContext | null {
  const AudioClass = getAudioContextClass();
  if (!AudioClass) return null;
  try {
    return new AudioClass(options);
  } catch (e) {
    console.warn('[DRY:Audio] Failed to instantiate AudioContext:', e);
    return null;
  }
}

/**
 * Retrieves the EIP-1193 Ethereum provider from window.ethereum if injected.
 */
export function getEthereumProvider(): EIP1193Provider | null {
  const win = safeWindow();
  return win?.ethereum || null;
}

/**
 * Checks if MetaMask or an EVM-compatible injected wallet is present.
 */
export function isMetaMaskInstalled(): boolean {
  const eth = getEthereumProvider();
  return Boolean(eth);
}

/**
 * Safe requestAnimationFrame with fallback for test environments or Node SSR.
 */
export function safeRequestAnimationFrame(callback: FrameRequestCallback): number {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(callback);
  }
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }
  return (setTimeout(() => callback(Date.now()), 16) as unknown as number);
}

/**
 * Safe cancelAnimationFrame with fallback.
 */
export function safeCancelAnimationFrame(id: number): void {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(id);
    return;
  }
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(id);
    return;
  }
  clearTimeout(id);
}

/**
 * Safe requestIdleCallback with setTimeout fallback.
 */
export function safeRequestIdleCallback(
  callback: (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void,
  options?: { timeout?: number }
): number {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(callback, options);
  }
  const start = Date.now();
  return (setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    });
  }, 1) as unknown as number);
}

/**
 * Safe cancelIdleCallback with fallback.
 */
export function safeCancelIdleCallback(handle: number): void {
  if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(handle);
    return;
  }
  clearTimeout(handle);
}

/**
 * Debounce a function call by delay in ms.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: any = null;
  return function (this: unknown, ...args: Parameters<T>) {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      func.apply(this, args);
      timer = null;
    }, delayMs);
  };
}

/**
 * Throttle a function call by limit in ms.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limitMs);
    }
  };
}

/**
 * Clamp a numeric value between min and max bounds.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Format bytes into human-readable unit string (B, KB, MB, GB, TB).
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Safe JSON parsing with fallback value.
 */
export function safeJsonParse<T>(jsonStr: string, fallback: T): T {
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

/**
 * Standard passive event listener options for non-blocking scrolling/touch handling.
 */
export const PASSIVE_EVENT_OPTIONS: AddEventListenerOptions = Object.freeze({
  passive: true,
  capture: false,
});

/**
 * Throttles function executions using requestAnimationFrame for optimal 60/120fps UI performance.
 */
export function rafThrottle<T extends (...args: any[]) => void>(
  func: T
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let isQueued = false;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown = null;
  let rafId: number | null = null;

  const throttled = function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;
    if (!isQueued) {
      isQueued = true;
      rafId = safeRequestAnimationFrame(() => {
        isQueued = false;
        rafId = null;
        if (lastArgs !== null) {
          const currentArgs = lastArgs;
          const currentThis = lastThis;
          lastArgs = null;
          lastThis = null;
          func.apply(currentThis, currentArgs);
        }
      });
    }
  };

  throttled.cancel = () => {
    if (rafId !== null) {
      safeCancelAnimationFrame(rafId);
      rafId = null;
    }
    isQueued = false;
    lastArgs = null;
    lastThis = null;
  };

  return throttled;
}

/**
 * Creates an AbortController linked optionally to a parent AbortSignal or a timeout.
 */
export function createAbortableSignal(
  parentSignal?: AbortSignal,
  timeoutMs?: number
): { controller: AbortController; signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  let timeoutId: any = null;

  if (timeoutMs && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
  }

  const onParentAbort = () => {
    controller.abort();
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener('abort', onParentAbort, { once: true });
    }
  }

  const cleanup = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (parentSignal) {
      parentSignal.removeEventListener('abort', onParentAbort);
    }
  };

  return { controller, signal: controller.signal, cleanup };
}

/**
 * Shares a post via native Web Share API with robust multi-layer fallback to clipboard copy.
 */
export async function sharePostOrCopyLink(
  postId: string,
  title?: string,
  content?: string,
  targetButton?: HTMLElement | null
): Promise<boolean> {
  const origin = typeof window !== 'undefined' ? (window.location.origin || '') : 'https://aetheris-omni-sphere.pages.dev';
  const url = `${origin}/#post-${postId}`;
  const shareData = {
    title: title || 'Aetheris Sovereign Pulse',
    text: content ? (content.slice(0, 140) + '...') : 'Check out this publication on Aetheris Omni-Sphere:',
    url,
  };

  // 1. Try native Web Share API (mobile devices, modern Safari/Chrome/Edge)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData);
      showTemporaryButtonFeedback(targetButton, '✓ Shared!');
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError') return true; // User cancelled share sheet
      // Otherwise fall through to clipboard
    }
  }

  // 2. Try modern Clipboard API
  let copied = false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch (_) {
      copied = false;
    }
  }

  // 3. Fallback using hidden textarea and execCommand
  if (!copied && typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (_) {
      copied = false;
    }
  }

  // 4. Prompt fallback if clipboard is strictly blocked
  if (!copied && typeof window !== 'undefined' && typeof window.prompt === 'function') {
    window.prompt('Copy post permalink:', url);
    copied = true;
  }

  if (copied) {
    showTemporaryButtonFeedback(targetButton, '✓ Copied!');
    if (typeof window !== 'undefined' && (window as any).toastManager) {
      (window as any).toastManager.success('Post link copied to clipboard', '🔗');
    }
  }

  return copied;
}

function showTemporaryButtonFeedback(btn?: HTMLElement | null, text: string = '✓ Copied!'): void {
  if (!btn) return;
  const labelEl = btn.querySelector('.share-btn-label') || btn;
  const originalHtml = labelEl.innerHTML;
  labelEl.innerHTML = `<span class="text-emerald-400 font-bold">${text}</span>`;
  setTimeout(() => {
    labelEl.innerHTML = originalHtml;
  }, 2000);
}

export interface FetchRetryOptions extends RequestInit {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOnStatus?: number[];
}

/**
 * Resilient HTTP Fetch with exponential backoff, randomized jitter, and abort signal preservation.
 * Designed to seamlessly survive transient packet loss, tunnel handovers, and temporary edge gateway errors (502, 503, 504).
 */
export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {}
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 200;
  const maxDelayMs = options.maxDelayMs ?? 3000;
  const retryOnStatus = options.retryOnStatus ?? [408, 429, 500, 502, 503, 504];

  let attempt = 0;

  while (true) {
    try {
      if (options.signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      const res = await fetch(url, options);

      // If response status is not a transient error, or we reached max retries, return response
      if (!retryOnStatus.includes(res.status) || attempt >= maxRetries) {
        return res;
      }

      // If rate-limited (429), respect Retry-After header if provided
      const retryAfterHeader = res.headers.get('Retry-After');
      let delayMs = baseDelayMs * Math.pow(2, attempt);
      if (retryAfterHeader) {
        const parsedSec = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsedSec)) {
          delayMs = parsedSec * 1000;
        }
      }
      // Add randomized jitter (0 to 50% extra) to prevent thundering herd
      const jitter = Math.random() * (delayMs * 0.5);
      const totalDelay = Math.min(maxDelayMs, delayMs + jitter);

      attempt++;
      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw err;
      }

      attempt++;
      if (attempt > maxRetries) {
        throw err;
      }

      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * (delayMs * 0.5);
      const totalDelay = Math.min(maxDelayMs, delayMs + jitter);

      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }
}
