import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './helpers/disable-demo.js';

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}

import {
  isSimulationModeEnabled,
  setSimulationMode,
  renderSimulationBadgeHTML,
  SIMULATION_BADGE_TEXT,
} from '../src/simulation-mode.js';
import * as envCheck from '../src/env-check.js';

describe('Centralized Simulation Mode Engine', () => {
  const originalWindowSimulation = (window as any).__AETHERIS_ENABLE_SIMULATION;

  beforeEach(() => {
    delete (window as any).__AETHERIS_ENABLE_SIMULATION;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (window as any).__AETHERIS_ENABLE_SIMULATION = originalWindowSimulation;
    vi.restoreAllMocks();
  });

  it('is disabled by default when no explicit flag is set', () => {
    vi.spyOn(envCheck, 'isProductionBuild').mockReturnValue(false);
    expect(isSimulationModeEnabled()).toBe(false);
  });

  it('enables simulation when window.__AETHERIS_ENABLE_SIMULATION is set to true in dev', () => {
    vi.spyOn(envCheck, 'isProductionBuild').mockReturnValue(false);
    setSimulationMode(true);
    expect(isSimulationModeEnabled()).toBe(true);
  });

  it('strictly disallows simulation mode in production builds', () => {
    vi.spyOn(envCheck, 'isProductionBuild').mockReturnValue(true);
    (window as any).__AETHERIS_ENABLE_SIMULATION = true;
    
    // In production build, must strictly return false regardless of window flags
    expect(isSimulationModeEnabled()).toBe(false);

    // setSimulationMode cannot enable simulation in production
    setSimulationMode(true);
    expect(isSimulationModeEnabled()).toBe(false);
  });

  it('renders simulation badge containing [Synthetic Simulation / Testbed]', () => {
    const badgeHTML = renderSimulationBadgeHTML();
    expect(badgeHTML).toContain(SIMULATION_BADGE_TEXT);
    expect(badgeHTML).toContain('[Synthetic Simulation / Testbed]');
    expect(badgeHTML).toContain('bg-amber-500/20');
  });
});
(globalThis as any).__UREFY_DEMO_MODE__ = false;
