/**
 * @file workspace-layout.ts
 * @package @aetheris/client-ui
 * @description 2027 Spatial Dual-Pane & Focus Workspace Engine.
 * Enables simultaneous side-by-side execution of Feed/Discussions and E2EE Direct Messages,
 * Knowledge Vault, or WebWorker Code Sandbox.
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

export function getWorkspaceLayout(): WorkspaceLayout {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved === 'standard' || saved === 'focus' || saved === 'split') {
        return saved;
      }
    }
  } catch {
    // ignore storage access issues
  }
  if (zenModeManager.getIsActive()) return 'focus';
  if ((clientStore as any).isDualHorizon) return 'split';
  return 'standard';
}

export function getSplitSecondaryPane(): SplitSecondaryPane {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(SPLIT_PANE_STORAGE_KEY);
      if (saved === 'messages' || saved === 'vault' || saved === 'sandbox' || saved === 'ai') {
        currentSplitPane = saved;
      }
    }
  } catch {
    // ignore
  }
  return currentSplitPane;
}

export function setSplitSecondaryPane(pane: SplitSecondaryPane): void {
  currentSplitPane = pane;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SPLIT_PANE_STORAGE_KEY, pane);
    }
  } catch {
    // ignore
  }
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
  } catch {
    // ignore
  }
  return currentSplitRatioPct;
}

export function setSplitRatio(ratioPct: number): void {
  const clamped = Math.max(35, Math.min(70, Math.round(ratioPct)));
  currentSplitRatioPct = clamped;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, String(clamped));
    }
  } catch {
    // ignore
  }
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
  if (layout !== 'standard' && layout !== 'focus' && layout !== 'split') {
    return false;
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
    }
  } catch {
    // ignore
  }

  if (layout === 'focus') {
    (clientStore as any).isDualHorizon = false;
    if (!zenModeManager.getIsActive()) {
      zenModeManager.setZen(true);
    }
  } else if (layout === 'split') {
    if (zenModeManager.getIsActive()) {
      zenModeManager.setZen(false);
    }
    (clientStore as any).isDualHorizon = true;
  } else {
    if (zenModeManager.getIsActive()) {
      zenModeManager.setZen(false);
    }
    (clientStore as any).isDualHorizon = false;
  }

  applyLayoutAttributes(layout);
  clientStore.notify('WORKSPACE_LAYOUT_CHANGED', layout);
  return true;
}

export function restoreWorkspaceLayout(): void {
  const layout = getWorkspaceLayout();
  setWorkspaceLayout(layout);
}

export function renderWorkspaceLayoutControls(): string {
  const active = getWorkspaceLayout();
  const activeSplitPane = getSplitSecondaryPane();

  const options: Array<{ id: WorkspaceLayout; label: string; icon: string; title: string }> = [
    {
      id: 'standard',
      label: t('layout.standard', undefined, 'Standard'),
      icon: 'layout',
      title: 'Standard 3-column sovereign workspace',
    },
    {
      id: 'focus',
      label: t('layout.focus', undefined, 'Focus'),
      icon: 'maximize-2',
      title: 'Distraction-free centered reading & writing',
    },
    {
      id: 'split',
      label: t('layout.split', undefined, 'Split 2027'),
      icon: 'columns-2',
      title: 'Side-by-side spatial dual workspace',
    },
  ];

  return `<div class="inline-flex items-center gap-1 p-1 rounded-xl bg-surface-base/75 backdrop-blur-xl border border-white/[0.08]" role="group" aria-label="Workspace layout controls">
    ${options
      .map((opt) => {
        const isCurrent = active === opt.id;
        return `<button
          type="button"
          data-action="workspace.setLayout"
          data-layout="${opt.id}"
          aria-pressed="${isCurrent ? 'true' : 'false'}"
          title="${opt.title}"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] rounded-lg text-xs font-medium transition-all cursor-pointer ${
            isCurrent
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/35 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
          }"
        >
          ${renderIcon(opt.icon, { size: 13, ariaHidden: true })}
          <span class="hidden sm:inline">${opt.label}</span>
        </button>`;
      })
      .join('')}
    ${
      active === 'split'
        ? `<div class="hidden md:flex items-center gap-1 pl-1.5 ml-1 border-l border-white/10" aria-label="Split secondary pane selector">
            ${(['messages', 'vault', 'sandbox'] as SplitSecondaryPane[])
              .map(
                (pane) => `<button
                  type="button"
                  data-action="workspace.setSplitPane"
                  data-pane="${pane}"
                  class="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                    activeSplitPane === pane
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                      : 'text-slate-400 hover:text-slate-200'
                  }"
                >${pane}</button>`
              )
              .join('')}
          </div>`
        : ''
    }
  </div>`;
}
