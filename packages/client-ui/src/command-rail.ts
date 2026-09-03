import { clientStore } from './client-state.js';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Layout & View' | 'Security & Crypto' | 'Simulation';
  shortcut?: string;
  run: () => void;
}

export function setupKeyboardShortcuts(): void {
  window.addEventListener('keydown', (e) => {
    // Ctrl + K or Cmd + K: Open Command Rail
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      clientStore.toggleCommandRail();
      return;
    }

    // Ctrl + \: Toggle Dual Horizon
    if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
      e.preventDefault();
      clientStore.toggleDualHorizon();
      return;
    }

    // Alt + 1/2/3: Telescopic Density Switcher
    if (e.altKey && e.key === '1') {
      e.preventDefault();
      clientStore.setDensity('compact');
    } else if (e.altKey && e.key === '2') {
      e.preventDefault();
      clientStore.setDensity('balanced');
    } else if (e.altKey && e.key === '3') {
      e.preventDefault();
      clientStore.setDensity('media');
    }

    // Escape: Close Command Rail
    if (e.key === 'Escape' && clientStore.isCommandRailOpen) {
      clientStore.toggleCommandRail();
    }
  });
}

export function getAvailableCommands(): CommandItem[] {
  return [
    {
      id: 'nav-relays',
      title: 'Go to Space: Relays (E2EE Chat & Audio)',
      category: 'Navigation',
      shortcut: 'Alt+R',
      run: () => clientStore.setSpace('relays'),
    },
    {
      id: 'nav-vault',
      title: 'Go to Space: Vault (Knowledge & Clean Binaries)',
      category: 'Navigation',
      shortcut: 'Alt+V',
      run: () => clientStore.setSpace('vault'),
    },
    {
      id: 'nav-pulse',
      title: 'Go to Space: Pulse (Pure Chronological Feed)',
      category: 'Navigation',
      shortcut: 'Alt+P',
      run: () => clientStore.setSpace('pulse'),
    },
    {
      id: 'toggle-split',
      title: 'Toggle Dual-Horizon Split Canvas',
      category: 'Layout & View',
      shortcut: 'Ctrl+\\',
      run: () => clientStore.toggleDualHorizon(),
    },
    {
      id: 'density-compact',
      title: 'Set Density: Compact (IRC / Terminal Mode)',
      category: 'Layout & View',
      shortcut: 'Alt+1',
      run: () => clientStore.setDensity('compact'),
    },
    {
      id: 'density-balanced',
      title: 'Set Density: Balanced (Linear Style)',
      category: 'Layout & View',
      shortcut: 'Alt+2',
      run: () => clientStore.setDensity('balanced'),
    },
    {
      id: 'density-media',
      title: 'Set Density: Expanded (Media / Cards)',
      category: 'Layout & View',
      shortcut: 'Alt+3',
      run: () => clientStore.setDensity('media'),
    },
    {
      id: 'sim-spam',
      title: 'Simulate ZK-RLN Spam Violation (Trigger Lagrange Slashing & Network Alert)',
      category: 'Simulation',
      shortcut: 'Ctrl+Shift+S',
      run: () => clientStore.triggerSpamAttackSimulation(),
    },
    {
      id: 'sec-steganography',
      title: 'Pixel Canvas Steganography (LSB PNG E2EE Concealment)',
      category: 'Security & Crypto',
      shortcut: 'Alt+S',
      run: () => {
        if (typeof window !== 'undefined' && window.__aetheris_open_steganography) {
          window.__aetheris_open_steganography();
        }
      },
    },
    {
      id: 'sec-data-archive',
      title: 'Sovereign Data Archive (AES-256-GCM Export / Restore)',
      category: 'Security & Crypto',
      shortcut: 'Alt+A',
      run: () => {
        if (typeof window !== 'undefined' && (window as any).__aetheris_open_archive_modal) {
          (window as any).__aetheris_open_archive_modal();
        }
      },
    },
  ];
}
