import { clientStore } from './client-state.js';
import { zenModeManager } from './zen-mode.js';
import { renderIcon } from './ui/icons.js';
import { t } from './i18n.js';

export type WorkspaceLayout = 'standard' | 'focus' | 'split';
const STORAGE_KEY = 'urefy_workspace_layout';
let observingZen = false;

export function getWorkspaceLayout(): WorkspaceLayout {
  if (zenModeManager.getIsActive()) return 'focus';
  return clientStore.isDualHorizon ? 'split' : 'standard';
}

export function setWorkspaceLayout(layout: unknown): boolean {
  if (layout !== 'standard' && layout !== 'focus' && layout !== 'split') return false;
  zenModeManager.setZen(layout === 'focus');
  if (clientStore.isDualHorizon !== (layout === 'split')) clientStore.toggleDualHorizon();
  else clientStore.notify();
  try { localStorage.setItem(STORAGE_KEY, layout); } catch {}
  return true;
}

export function restoreWorkspaceLayout(): void {
  if (!observingZen) {
    observingZen = true;
    zenModeManager.subscribe(() => {
      try { localStorage.setItem(STORAGE_KEY, getWorkspaceLayout()); } catch {}
      clientStore.notify();
    });
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setWorkspaceLayout(saved);
  } catch {}
}

export function renderWorkspaceLayoutControls(): string {
  const selected = getWorkspaceLayout();
  const options: { id: WorkspaceLayout; icon: string; label: string }[] = [
    { id: 'standard', icon: 'layers', label: t('workspace.standard', undefined, 'Standard layout') },
    { id: 'focus', icon: 'maximize', label: t('workspace.focus', undefined, 'Focus layout') },
    { id: 'split', icon: 'columns', label: t('workspace.split', undefined, 'Split workspace') },
  ];
  return `<div class="workspace-layout-control" role="group" aria-label="${t('workspace.layout', undefined, 'Workspace layout')}">
    ${options.map((option) => `<button type="button" class="workspace-layout-button" data-action="set-workspace-layout" data-layout="${option.id}" aria-label="${option.label}" title="${option.label}" aria-pressed="${selected === option.id}">${renderIcon(option.icon, { size: 17 })}</button>`).join('')}
  </div>`;
}