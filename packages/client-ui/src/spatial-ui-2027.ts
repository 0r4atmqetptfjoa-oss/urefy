// ===========================================================================
// UREfy — SPATIAL UI 2027 (AURORA SPOTLIGHT & FLOATING QUICK-ACTION DOCK)
// Hardware-accelerated cursor illumination, shortcuts & navigation
// ===========================================================================

import { initGlobalCodeCardInteractions } from './code-highlighter.js';

export function initSpatialUi2027(options: {
  onOpenSearch: () => void;
  onOpenChat: () => void;
  onNewPost?: () => void;
}): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  initGlobalCodeCardInteractions();

  // 1. Iluminare speculară dinamică pe carduri (2027 Spatial Glass)
  document.addEventListener(
    'mousemove',
    (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        '.post-card, .nx-msg-bubble, .urefy-omni-item, .sh-card'
      );
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
      target.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
    },
    { passive: true }
  );

  // 2. Scurtătura globală Ctrl+M / Cmd+M pentru deschiderea instantă a Chat-ului E2EE
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      e.preventDefault();
      options.onOpenChat();
      return;
    }

    // 3. Scurtătura globală Ctrl+Shift+A / Cmd+Shift+A pentru deschiderea consolei Sovereign Mission Control
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      e.preventDefault();
      import('./admin-dashboard.js').then((m) => {
        m.adminDashboard.open();
      });
    }
  });

  // 3. Eliminare dock flotant redundant care interfera cu bara de navigare de pe mobil
  const existingDock = document.getElementById('urefy-spatial-dock');
  if (existingDock) {
    existingDock.remove();
  }
}
