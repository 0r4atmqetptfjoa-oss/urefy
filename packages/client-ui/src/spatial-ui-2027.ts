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
    }
  });

  // 3. Dock-ul flotant 2027 în colțul dreapta-jos
  if (!document.getElementById('urefy-spatial-dock')) {
    const dock = document.createElement('div');
    dock.id = 'urefy-spatial-dock';
    dock.className = 'urefy-spatial-dock';
    dock.innerHTML = `
      <button type="button" class="urefy-dock-btn" data-dock="search" title="Omni-Search (Ctrl+K)">
        <span>🔍</span>
        <span class="urefy-dock-label">Search</span>
        <kbd>⌘K</kbd>
      </button>
      <button type="button" class="urefy-dock-btn" data-dock="chat" title="Nexus E2EE Chat (Ctrl+M)">
        <span>💬</span>
        <span class="urefy-dock-label">Nexus Chat</span>
        <kbd>⌘M</kbd>
      </button>
    `;
    document.body.appendChild(dock);

    dock.querySelector('[data-dock="search"]')?.addEventListener('click', () => options.onOpenSearch());
    dock.querySelector('[data-dock="chat"]')?.addEventListener('click', () => options.onOpenChat());
  }
}
