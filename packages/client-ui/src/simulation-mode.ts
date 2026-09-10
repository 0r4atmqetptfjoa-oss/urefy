/**
 * @file simulation-mode.ts
 * @package @aetheris/client-ui
 * @description Centralized Simulation Mode Governance & Explicit Opt-In Engine.
 * 
 * Invariants:
 * 1. Production: Simulation strictly disabled (impossible to trigger).
 * 2. Development: Simulation disabled by default.
 * 3. Explicit Opt-In: Enabled only via VITE_ENABLE_SIMULATION === 'true' or window.__AETHERIS_ENABLE_SIMULATION === true.
 * 4. Synthetic state MUST permanently display '[Synthetic Simulation / Testbed]'.
 */

import { isProductionBuild } from './admin-auth.js';
import { isDemoModeEnabled } from './demo-mode.js';

export const isSimulationModeEnabled = (): boolean => {
  if (isProductionBuild()) {
    return false;
  }

  if (isDemoModeEnabled()) {
    return true;
  }

  if (typeof globalThis !== 'undefined' && (globalThis as any).__AETHERIS_ENABLE_SIMULATION === true) {
    return true;
  }

  if (typeof window !== 'undefined' && (window as any).__AETHERIS_ENABLE_SIMULATION === true) {
    return true;
  }

  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_ENABLE_SIMULATION === 'true') {
    return true;
  }

  return false;
};

export const setSimulationMode = (enabled: boolean): void => {
  if (isProductionBuild()) {
    console.error('[SimulationMode] Cannot enable simulation in production environment.');
    return;
  }
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__AETHERIS_ENABLE_SIMULATION = enabled;
  }
  if (typeof window !== 'undefined') {
    (window as any).__AETHERIS_ENABLE_SIMULATION = enabled;
  }
};

/** Test/logout helper: clear every explicit simulation override. */
export const resetSimulationMode = (): void => {
  if (typeof globalThis !== 'undefined') {
    delete (globalThis as any).__AETHERIS_ENABLE_SIMULATION;
  }
  if (typeof window !== 'undefined') {
    delete (window as any).__AETHERIS_ENABLE_SIMULATION;
  }
};

export const SIMULATION_BADGE_TEXT = '[Synthetic Simulation / Testbed]';

export const renderSimulationBadgeHTML = (extraClasses: string = ''): string => {
  return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 ${extraClasses}" title="Operating in explicit simulation or synthetic testbed mode">${SIMULATION_BADGE_TEXT}</span>`;
};
