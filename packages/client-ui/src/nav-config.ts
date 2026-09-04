/**
 * @file nav-config.ts
 * @package @aetheris/client-ui
 * @description Centralized navigation configuration for primary modes and advanced tools.
 */

export interface NavItemConfig {
  id: string;
  mode?: 'pulse' | 'explore' | 'vault' | 'relays' | 'profile';
  action?: string;
  label: string;
  sublabel?: string;
  icon: string;
  description: string;
  testId: string;
  badge?: string;
}

export const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'pulse',
    mode: 'pulse',
    label: 'Feed (Pulse)',
    sublabel: 'Flux publicații & știri',
    icon: '⚡',
    description: 'Flux descentralizat de publicații, știri și actualizări în timp real',
    testId: 'nav-item-pulse',
  },
  {
    id: 'explore',
    mode: 'explore',
    label: 'Explorează',
    sublabel: 'Tendințe & noduri',
    icon: '🔍',
    description: 'Descoperă noduri active, tendințe și conținut recomandat din rețea',
    testId: 'nav-item-explore',
  },
  {
    id: 'vault',
    mode: 'vault',
    label: 'Seif (Vault)',
    sublabel: 'Fișiere & release-uri',
    icon: '📚',
    description: 'Stocare descentralizată, fișiere criptate și pachete software',
    testId: 'nav-item-vault',
  },
  {
    id: 'relays',
    mode: 'relays',
    label: 'Servere (Relays)',
    sublabel: 'Canale & chat E2EE',
    icon: '📡',
    description: 'Servere federate, camere de discuție și mesagerie privată E2EE',
    testId: 'nav-item-relays',
  },
  {
    id: 'profile',
    mode: 'profile',
    label: 'Profil',
    sublabel: 'Identitatea ta suverană',
    icon: '👤',
    description: 'Gestionare chei criptografice, reputație și identitate suverană',
    testId: 'nav-item-profile',
  },
];

export const ADVANCED_TOOLS_ITEMS: NavItemConfig[] = [
  {
    id: 'bookmarks',
    label: 'Saved Bookmarks',
    icon: '🔖',
    description: 'Articole, publicații și resurse salvate offline',
    testId: 'rail-btn-bookmarks',
    action: 'bookmarks',
  },
  {
    id: 'theme',
    label: 'Display & Themes',
    icon: '🎨',
    description: 'Personalizare teme vizuale, palete de culori și contrast',
    testId: 'rail-btn-theme',
    action: 'theme',
  },
  {
    id: 'dao',
    label: 'DAO Governance',
    icon: '🏛️',
    description: 'Guvernanță descentralizată, propuneri și vot cvadratic',
    testId: 'nav-btn-dao',
    action: 'dao',
  },
  {
    id: 'rss',
    label: 'RSS Importer',
    icon: '📡',
    description: 'Import și agregare fluxuri RSS/Atom externe',
    testId: 'btn-open-rss-panel',
    action: 'rss',
  },
  {
    id: 'cve',
    label: 'CVE Monitor',
    icon: '🛡️',
    description: 'Monitorizare vulnerabilități de securitate și alerte CVE în timp real',
    testId: 'btn-open-cve-monitor',
    action: 'cve',
  },
  {
    id: 'observatory',
    label: 'Network Observatory',
    icon: '🔭',
    description: 'Observator de rețea P2P, telemetrie noduri și topologie swarm',
    testId: 'btn-open-network-observatory',
    action: 'observatory',
  },
  {
    id: 'wot',
    label: 'Trust Graph',
    icon: '🕸️',
    description: 'Graf interactiv Web of Trust și calcul reputație criptografică',
    testId: 'btn-open-wot-graph',
    action: 'wot',
  },
  {
    id: 'gossip',
    label: 'Gossip Visualizer',
    icon: '📡',
    description: 'Vizualizare în timp real a propagării mesajelor gossip mesh',
    testId: 'btn-open-gossip-viz',
    action: 'gossip',
  },
  {
    id: 'backup',
    label: 'Export & Backup',
    icon: '💾',
    description: 'Export arhive criptate, chei suverane și restaurare date',
    testId: 'btn-open-backup-export',
    action: 'backup',
  },
  {
    id: 'steganography',
    label: 'Pixel Canvas Steganography',
    icon: '🖼️',
    description: 'Criptare și ascundere date secrete în pixeli canvas',
    testId: 'drawer-btn-steganography',
    action: 'steganography',
  },
];

export const ALL_NAV_ITEMS: NavItemConfig[] = [
  ...PRIMARY_NAV_ITEMS,
  ...ADVANCED_TOOLS_ITEMS,
];

export function getNavItemById(id: string): NavItemConfig | undefined {
  return ALL_NAV_ITEMS.find(item => item.id === id);
}

export function getPrimaryNavItemByMode(mode: string): NavItemConfig | undefined {
  return PRIMARY_NAV_ITEMS.find(item => item.mode === mode);
}
