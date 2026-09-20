/**
 * @file demo-mode.ts
 * @package @aetheris/client-ui
 * @description Centralized single source of truth for Demo Mode and simulated state.
 * Enforces honest empty states on fresh production startups, and displays a prominent
 * persistent watermark banner whenever simulated/demo data or keys are active.
 */

import { isProductionBuild } from './env-check.js';

export const DEMO_MODE_STORAGE_KEY = 'urefy:demo_mode';
export const DEMO_WATERMARK_ELEMENT_ID = 'urefy-demo-watermark-banner';
export const DEMO_WATERMARK_MESSAGE = '⚠️ DEMO MODE ACTIVE — SIMULATED DATA & KEYS — NOT FOR PRODUCTION USE';

let inMemoryDemoFlag: boolean | null = null;

/**
 * Single source of truth determining whether Demo Mode (simulated data) is enabled.
 */
export function isDemoModeEnabled(): boolean {
  // Production is authoritative: console/global mutations cannot activate it.
  if (isProductionBuild()) return false;

  // 1. Explicit in-memory override
  if (inMemoryDemoFlag !== null) {
    return inMemoryDemoFlag;
  }

  // 2. Global / Window flag
  if (typeof globalThis !== 'undefined' && (globalThis as any).__UREFY_DEMO_MODE__ !== undefined) {
    return (globalThis as any).__UREFY_DEMO_MODE__ === true;
  }
  if (typeof window !== 'undefined') {
    if ((window as any).__UREFY_DEMO_MODE__ !== undefined) {
      return (window as any).__UREFY_DEMO_MODE__ === true;
    }

    // 3. URL Query Parameter. Production deliberately ignores URL opt-in so a
    // shared link can never switch a real deployment into synthetic mode.
    try {
      if (window.location && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        if (!isProductionBuild() && (params.get('demo') === 'true' || params.get('mode') === 'demo')) return true;
        if (params.get('demo') === 'false' || params.get('prod') === 'true') return false;
      }
    } catch (_) {}

    // 4. LocalStorage
    try {
      if (window.localStorage) {
        const stored = window.localStorage.getItem(DEMO_MODE_STORAGE_KEY);
        if (!isProductionBuild() && stored === 'true') return true;
        if (stored === 'false') return false;
      }
    } catch (_) {}
  }

  // 5. Development and tests are also honest by default. Demo data always
  // requires an explicit flag, URL opt-in, or enableDemoMode(true).
  return false;
}

/**
 * Dynamically toggles or forces Demo Mode state.
 */
export function enableDemoMode(enable = true): void {
  if (enable && isProductionBuild()) {
    console.error('[DemoMode] Demo mode cannot be enabled in a production build.');
    return;
  }
  inMemoryDemoFlag = enable;
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__UREFY_DEMO_MODE__ = enable;
  }
  if (typeof window !== 'undefined') {
    (window as any).__UREFY_DEMO_MODE__ = enable;
    try {
      if (window.localStorage) {
        if (enable) {
          window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, 'true');
        } else {
          window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, 'false');
        }
      }
    } catch (_) {}
    updateDemoWatermark();
  }
}

/**
 * Renders the persistent watermark banner HTML.
 */
export function renderDemoWatermarkBanner(): string {
  if (!isDemoModeEnabled()) {
    return '';
  }
  return `
    <div id="${DEMO_WATERMARK_ELEMENT_ID}" class="fixed top-0 inset-x-0 z-[9999] bg-amber-500/90 text-black px-4 py-1 text-xs font-mono font-bold flex items-center justify-between shadow-lg backdrop-blur-sm pointer-events-auto border-b border-amber-600">
      <div class="flex items-center space-x-2">
        <span class="animate-pulse text-base">⚠️</span>
        <span>${DEMO_WATERMARK_MESSAGE}</span>
      </div>
      <button
        type="button"
        id="btn-exit-demo-mode"
        data-action="exit-demo-mode"
        class="px-2 py-0.5 rounded bg-black/20 hover:bg-black/40 text-black font-mono text-[10px] uppercase cursor-pointer transition-colors"
        title="Disable Demo Mode and switch to Honest Production State"
      >
        Exit Demo
      </button>
    </div>
  `;
}

/**
 * Inserts or removes the persistent watermark element from the document body.
 */
export function updateDemoWatermark(): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(DEMO_WATERMARK_ELEMENT_ID);
  if (isDemoModeEnabled()) {
    if (!existing) {
      const container = document.createElement('div');
      container.innerHTML = renderDemoWatermarkBanner();
      const firstChild = container.firstElementChild;
      if (firstChild) {
        document.body.appendChild(firstChild);
        if (typeof (firstChild as Element).querySelector === 'function') {
          (firstChild as Element).querySelector('[data-action="exit-demo-mode"]')
            ?.addEventListener('click', () => enableDemoMode(false));
        }
      }
    }
  } else {
    if (existing) {
      existing.remove();
    }
  }
}

// Window Augmentations
if (typeof window !== 'undefined') {
  (window as any).isDemoModeEnabled = isDemoModeEnabled;
  (window as any).enableDemoMode = enableDemoMode;
  (window as any).__aetheris_enable_demo = () => enableDemoMode(true);
  (window as any).__aetheris_disable_demo = () => enableDemoMode(false);
}
