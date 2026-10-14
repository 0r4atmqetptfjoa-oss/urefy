/**
 * @file workspace-layout.ts
 * @package @aetheris/client-ui
 * @description 2027 Spatial Dual-Pane & Focus Workspace Engine.
 */

import { clientStore } from './client-state.js';
import { zenModeManager } from './zen-mode.js';
import { renderIcon } from './ui/icons.js';
import { t } from './i18n.js';

export type WorkspaceLayout = 'standard' | 'focus' | 'split';
export type SplitSecondaryPane = 'messages' | 'vault' | 'sandbox' | 'ai';

const LAYOUT_STORAGE_KEY = 'urefy_workspace_layout';
const SPLIT_PANE_STORAGE_KEY = 'urefy_split_secondary_pane';
const SPLIT_RATIO_STORAGE_KEY = 'urefy_split_ratio_pct';

let currentSplitPane: SplitSecondaryPane = 'messages';
let currentSplitRatioPct = 55;
let observingZen = false;

export function getWorkspaceLayout(): WorkspaceLayout {
  if (zenModeManager.getIsActive()) return 'focus';
  return (clientStore as any).isDualHorizon ? 'split' : 'standard';
}

export function getSplitSecondaryPane(): SplitSecondaryPane {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(SPLIT_PANE_STORAGE_KEY);
      if (saved === 'messages' || saved === 'vault' || saved === 'sandbox' || saved === 'ai') {
        currentSplitPane = saved;
      }
    }
  } catch {}
  return currentSplitPane;
}

export function setSplitSecondaryPane(pane: SplitSecondaryPane): void {
  currentSplitPane = pane;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SPLIT_PANE_STORAGE_KEY, pane);
    }
  } catch {}
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-split-pane', pane);
  }
  clientStore.notify('WORKSPACE_LAYOUT_CHANGED', { layout: getWorkspaceLayout(), splitPane: pane });
}

export function getSplitRatio(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = Number(localStorage.getItem(SPLIT_RATIO_STORAGE_KEY));
      if (Number.isFinite(raw) && raw >= 35 && raw <= 70) {
        currentSplitRatioPct = raw;
      }
    }
  } catch {}
  return currentSplitRatioPct;
}

export function setSplitRatio(ratioPct: number): void {
  const clamped = Math.max(35, Math.min(70, Math.round(ratioPct)));
  currentSplitRatioPct = clamped;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, String(clamped));
    }
  } catch {}
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--urefy-split-primary-pct', `${clamped}%`);
  }
}

function applyLayoutAttributes(layout: WorkspaceLayout): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-workspace-layout', layout);
    document.documentElement.setAttribute('data-split-pane', getSplitSecondaryPane());
    document.documentElement.style.setProperty('--urefy-split-primary-pct', `${getSplitRatio()}%`);
    document.body?.setAttribute('data-workspace-layout', layout);
  }
}

export function setWorkspaceLayout(layout: unknown): boolean {
  if (layout !== 'standard' && layout !== 'focus' && layout !== 'split') return false;
  zenModeManager.setZen(layout === 'focus');
  if ((clientStore as any).isDualHorizon !== (layout === 'split')) {
    (clientStore as any).toggleDualHorizon();
  } else {
    clientStore.notify('WORKSPACE_LAYOUT_CHANGED', layout);
  }
  try { localStorage.setItem(LAYOUT_STORAGE_KEY, layout); } catch {}
  applyLayoutAttributes(layout as WorkspaceLayout);
  return true;
}

export function restoreWorkspaceLayout(): void {
  if (!observingZen) {
    observingZen = true;
    zenModeManager.subscribe(() => {
      try { localStorage.setItem(LAYOUT_STORAGE_KEY, getWorkspaceLayout()); } catch {}
      clientStore.notify('WORKSPACE_LAYOUT_CHANGED', getWorkspaceLayout());
    });
  }
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved !== null) setWorkspaceLayout(saved);
  } catch {}
}

export function renderWorkspaceLayoutControls(): string {
  const selected = getWorkspaceLayout();
  const options: { id: WorkspaceLayout; icon: string; label: string }[] = [
    { id: 'standard', icon: 'layout', label: t('workspace.standard', undefined, 'Standard layout') },
    { id: 'focus', icon: 'maximize-2', label: t('workspace.focus', undefined, 'Focus layout') },
    { id: 'split', icon: 'columns-2', label: t('workspace.split', undefined, 'Split workspace') },
  ];

  return `<div data-layout-switcher="true" class="workspace-layout-control inline-flex items-center gap-1 p-1 rounded-xl bg-surface-base/75 backdrop-blur-xl border border-white/[0.08]" role="group" aria-label="${t('workspace.layout', undefined, 'Workspace layout')}">
    ${options.map((option) => `<button type="button" class="workspace-layout-button" data-action="set-workspace-layout" data-layout="${option.id}" aria-label="${option.label}" title="${option.label}" aria-pressed="${selected === option.id}" style="position:static;display:inline-flex;align-items:center;gap:6px;padding:6px 10px;min-height:32px;width:auto;height:auto;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;cursor:pointer;${selected === option.id ? 'background:rgba(56,189,248,0.18);color:#7dd3fc;border:1px solid rgba(56,189,248,0.35);' : 'background:transparent;color:#94a3b8;border:1px solid transparent;'}">${renderIcon(option.icon, { size: 14, ariaHidden: true })}<span style="position:static;display:inline;opacity:1;pointer-events:auto;">${option.label.split(' ')[0]}</span></button>`).join('')}
  </div>`;
}
