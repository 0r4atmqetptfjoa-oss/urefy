import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  isDualHorizon: false,
  focus: false,
  notify: vi.fn(),
  toggleDualHorizon: vi.fn(),
  zenListeners: new Set<() => void>(),
}));

vi.mock('../src/client-state.js', () => ({ clientStore: state }));
vi.mock('../src/zen-mode.js', () => ({ zenModeManager: {
  getIsActive: () => state.focus,
  setZen: (active: boolean) => {
    if (state.focus === active) return;
    state.focus = active;
    state.zenListeners.forEach((listener) => listener());
  },
  subscribe: (listener: () => void) => { state.zenListeners.add(listener); return () => state.zenListeners.delete(listener); },
} }));
vi.mock('../src/i18n.js', () => ({ t: (_key: string, _parameters: unknown, fallback: string) => fallback }));

import { getWorkspaceLayout, renderWorkspaceLayoutControls, restoreWorkspaceLayout, setWorkspaceLayout } from '../src/workspace-layout.js';
import { zenModeManager } from '../src/zen-mode.js';

describe('Workspace layout controls', () => {
  let preferences: Map<string, string>;
  beforeEach(() => {
    preferences = new Map();
    state.focus = false;
    state.isDualHorizon = false;
    state.notify.mockClear();
    state.toggleDualHorizon.mockReset().mockImplementation(() => { state.isDualHorizon = !state.isDualHorizon; });
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => preferences.get(key) ?? null,
      setItem: (key: string, value: string) => preferences.set(key, value),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('switches between exclusive layouts using existing engines', () => {
    setWorkspaceLayout('split');
    expect(getWorkspaceLayout()).toBe('split');
    setWorkspaceLayout('focus');
    expect(getWorkspaceLayout()).toBe('focus');
    expect(state.isDualHorizon).toBe(false);
    setWorkspaceLayout('standard');
    expect(getWorkspaceLayout()).toBe('standard');
  });

  it('does not toggle an already active split layout off', () => {
    setWorkspaceLayout('split');
    setWorkspaceLayout('split');
    expect(state.toggleDualHorizon).toHaveBeenCalledTimes(1);
  });

  it('restores the saved local preference', () => {
    preferences.set('urefy_workspace_layout', 'split');
    restoreWorkspaceLayout();
    expect(getWorkspaceLayout()).toBe('split');
  });

  it('synchronizes keyboard-driven focus changes and persisted layout', () => {
    restoreWorkspaceLayout();
    setWorkspaceLayout('focus');
    state.notify.mockClear();
    zenModeManager.setZen(false);
    expect(state.notify).toHaveBeenCalled();
    expect(preferences.get('urefy_workspace_layout')).toBe('standard');
    expect(getWorkspaceLayout()).toBe('standard');
  });

  it('rejects unknown preferences without changing layout', () => {
    expect(setWorkspaceLayout('invalid')).toBe(false);
    expect(state.notify).not.toHaveBeenCalled();
    expect(preferences.size).toBe(0);
  });

  it('remains usable when storage is unavailable', () => {
    vi.stubGlobal('localStorage', { setItem: () => { throw new Error('Storage blocked'); } });
    expect(() => setWorkspaceLayout('focus')).not.toThrow();
    expect(getWorkspaceLayout()).toBe('focus');
  });

  it('exposes an accessible selected state and delegated actions', () => {
    setWorkspaceLayout('focus');
    const html = renderWorkspaceLayoutControls();
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain('data-layout="focus" aria-label="Focus layout" title="Focus layout" aria-pressed="true"');
    expect(html.match(/data-action="set-workspace-layout"/g)).toHaveLength(3);
    expect(html).not.toMatch(/\sonclick=/);
  });
});