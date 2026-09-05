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
    sublabel: 'Decentralized stream & news',
    icon: '⚡',
    description: 'Decentralized pulse feed, sovereign publications, and real-time updates',
    testId: 'nav-item-pulse',
  },
  {
    id: 'explore',
    mode: 'explore',
    label: 'Explore',
    sublabel: 'Trends & nodes',
    icon: '🔍',
    description: 'Discover active nodes, trending topics, and curated network content',
    testId: 'nav-item-explore',
  },
  {
    id: 'vault',
    mode: 'vault',
    label: 'Vault',
    sublabel: 'Files & releases',
    icon: '📚',
    description: 'Decentralized encrypted storage, audited packages, and release files',
    testId: 'nav-item-vault',
  },
  {
    id: 'relays',
    mode: 'relays',
    label: 'Relays',
    sublabel: 'Channels & E2EE chat',
    icon: '📡',
    description: 'Federated servers, discussion channels, and sovereign E2EE messaging',
    testId: 'nav-item-relays',
  },
  {
    id: 'profile',
    mode: 'profile',
    label: 'Profile',
    sublabel: 'Your sovereign identity',
    icon: '👤',
    description: 'Cryptographic key management, Web-of-Trust reputation, and identity',
    testId: 'nav-item-profile',
  },
];

export const ADVANCED_TOOLS_ITEMS: NavItemConfig[] = [
  {
    id: 'bookmarks',
    label: 'Saved Bookmarks',
    icon: '🔖',
    description: 'Articles, publications, and offline-saved resources',
    testId: 'rail-btn-bookmarks',
    action: 'bookmarks',
  },
  {
    id: 'theme',
    label: 'Display & Themes',
    icon: '🎨',
    description: 'Visual theme customization, color palettes, and contrast settings',
    testId: 'rail-btn-theme',
    action: 'theme',
  },
  {
    id: 'dao',
    label: 'DAO Governance',
    icon: '🏛️',
    description: 'Decentralized governance, community proposals, and quadratic voting',
    testId: 'nav-btn-dao',
    action: 'dao',
  },
  {
    id: 'rss',
    label: 'RSS Importer',
    icon: '📡',
    description: 'External RSS/Atom feed import, parsing, and aggregation',
    testId: 'btn-open-rss-panel',
    action: 'rss',
  },
  {
    id: 'cve',
    label: 'CVE Monitor',
    icon: '🛡️',
    description: 'Real-time security vulnerability monitoring and CVE threat alerts',
    testId: 'btn-open-cve-monitor',
    action: 'cve',
  },
  {
    id: 'observatory',
    label: 'Network Observatory',
    icon: '🔭',
    description: 'P2P network monitor, node telemetry, and swarm topology',
    testId: 'btn-open-network-observatory',
    action: 'observatory',
  },
  {
    id: 'wot',
    label: 'Trust Graph',
    icon: '🕸️',
    description: 'Interactive Web-of-Trust graph and cryptographic reputation scoring',
    testId: 'btn-open-wot-graph',
    action: 'wot',
  },
  {
    id: 'gossip',
    label: 'Gossip Visualizer',
    icon: '📡',
    description: 'Real-time visualizer for mesh gossip message propagation',
    testId: 'btn-open-gossip-viz',
    action: 'gossip',
  },
  {
    id: 'backup',
    label: 'Export & Backup',
    icon: '💾',
    description: 'Encrypted archive export, sovereign keys backup, and data restore',
    testId: 'btn-open-backup-export',
    action: 'backup',
  },
  {
    id: 'steganography',
    label: 'Pixel Canvas Steganography',
    icon: '🖼️',
    description: 'Steganographic encoding and payload hiding in canvas pixels',
    testId: 'drawer-btn-steganography',
    action: 'steganography',
  },
  {
    id: 'binary-hygiene',
    label: 'Binary Hygiene Portal',
    icon: '🛡️',
    description: 'Secure PE/ELF binary analysis, Shannon entropy & UPX packer detection',
    testId: 'btn-open-binary-hygiene',
    action: 'binary-hygiene',
    badge: 'FREE',
  },
  {
    id: 'portable-trust',
    label: 'Portable ZK Trust Score',
    icon: '💎',
    description: 'BN254 zero-knowledge reputation certificates and embeddable badges',
    testId: 'btn-open-portable-trust',
    action: 'portable-trust',
    badge: 'ZK',
  },
  {
    id: 'microsaas-docs',
    label: 'Micro-SaaS & Dev APIs',
    icon: '⚡',
    description: 'Interactive developer documentation, cURL endpoints, and embed widgets',
    testId: 'btn-open-microsaas-docs',
    action: 'microsaas-docs',
    badge: 'B2B',
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
