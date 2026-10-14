/**
 * @file nav-config.ts
 * @package @aetheris/client-ui
 * @description Centralized navigation configuration for primary modes and advanced tools.
 * Conforms to Master UX Specification: Feed, Explore, Messages, Vault, Profile, More.
 * Strict exclusion of admin from all user navigation.
 */

import { renderIcon, IconName } from './ui/icons.js';
import { t } from './i18n.js';

export interface NavItemConfig {
  id: string;
  mode?: 'pulse' | 'explore' | 'vault' | 'relays' | 'profile' | 'feed' | 'messages' | 'communities';
  action?: string;
  label: string;
  sublabel?: string;
  iconName: IconName;
  icon?: string; // Fallback string representation
  description: string;
  testId: string;
  badge?: string;
}

export const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'feed',
    mode: 'pulse',
    label: 'Feed',
    sublabel: 'Curated & following feed',
    iconName: 'feed',
    icon: '⚡',
    description: 'Home discovery, discussions, and updates from your communities',
    testId: 'nav-item-feed',
  },
  {
    id: 'explore',
    mode: 'explore',
    label: 'Explore',
    sublabel: 'Topics & people',
    iconName: 'explore',
    icon: '🔍',
    description: 'Discover emerging conversations, trending topics, and people',
    testId: 'nav-item-explore',
  },
  {
    id: 'messages',
    mode: 'relays',
    label: 'Messages',
    sublabel: 'Direct & private chat',
    iconName: 'messages',
    icon: '💬',
    description: 'Private 1-to-1 conversations and group discussions',
    testId: 'nav-item-messages',
  },
  {
    id: 'vault',
    mode: 'vault',
    label: 'Vault',
    sublabel: 'Private storage',
    iconName: 'vault',
    icon: '📚',
    description: 'Your private saved posts, documents, and media storage',
    testId: 'nav-item-vault',
  },
  {
    id: 'profile',
    mode: 'profile',
    label: 'Profile',
    sublabel: 'Identity & posts',
    iconName: 'profile',
    icon: '👤',
    description: 'Your profile, posts, replies, and account settings',
    testId: 'nav-item-profile',
  },
  {
    id: 'more',
    action: 'open_more',
    label: 'More',
    sublabel: 'Preferences & tools',
    iconName: 'more',
    icon: '⋯',
    description: 'Bookmarks, notifications, privacy settings, and sovereign tools',
    testId: 'nav-item-more',
  },
];

export const MORE_MENU_ITEMS: NavItemConfig[] = [
  {
    id: 'bookmarks',
    action: 'bookmarks',
    label: 'Bookmarks',
    iconName: 'bookmark',
    icon: '🔖',
    description: 'Saved sovereign posts, documents, and reference hashes',
    testId: 'rail-btn-bookmarks',
  },
  {
    id: 'notifications',
    action: 'notifications',
    label: 'Notifications',
    iconName: 'bell',
    icon: '🔔',
    description: 'Mentions, direct messages, and system security alerts',
    testId: 'rail-btn-notifications',
  },
  {
    id: 'communities',
    action: 'communities',
    mode: 'communities',
    label: 'Communities',
    iconName: 'users',
    icon: '👥',
    description: 'Join interest communities, discuss topics, and build audiences',
    testId: 'rail-btn-communities',
  },
  {
    id: 'governance',
    action: 'dao',
    label: 'Governance & DAO',
    iconName: 'layers',
    icon: '🏛️',
    description: 'Quadratic voting, community proposals, and transparency logs',
    testId: 'nav-btn-dao',
  },
  {
    id: 'security',
    action: 'security',
    label: 'Security & Recovery',
    iconName: 'shield',
    icon: '🛡️',
    description: 'Passkeys, identity backup, active sessions, and social guardians',
    testId: 'rail-btn-security',
  },
  {
    id: 'backup',
    action: 'backup',
    label: 'Backup & Restore',
    iconName: 'database',
    icon: '💾',
    description: 'Encrypted AES-256 backup archive and local recovery',
    testId: 'btn-open-backup-export',
  },
  {
    id: 'network',
    action: 'observatory',
    label: 'Network Observatory',
    iconName: 'network',
    icon: '🔭',
    description: 'P2P network health, swarm peers, and telemetry',
    testId: 'btn-open-network-observatory',
  },
  {
    id: 'developer',
    action: 'microsaas-docs',
    label: 'Developer & APIs',
    iconName: 'terminal',
    icon: '⚡',
    description: 'Protocol diagnostics, API documentation, and code runner',
    testId: 'btn-open-microsaas-docs',
    badge: 'API',
  },
  {
    id: 'advanced',
    action: 'advanced-tools',
    label: 'Advanced Tools',
    iconName: 'sliders',
    icon: '⚙️',
    description: 'Steganography, CVE monitor, trust graph, and binary scanner',
    testId: 'rail-btn-advanced-tools',
  },
  {
    id: 'help',
    action: 'help',
    label: 'Help & About',
    iconName: 'help',
    icon: '❓',
    description: 'Zero-trust architecture guide, privacy terms, and sovereign FAQ',
    testId: 'rail-btn-help',
  },
];

export const ADVANCED_TOOLS_ITEMS: NavItemConfig[] = [
  ...MORE_MENU_ITEMS,
  {
    id: 'theme',
    label: 'Display & Themes',
    iconName: 'slidersHorizontal',
    icon: '🎨',
    description: 'Visual theme customization, color palettes, and contrast settings',
    testId: 'rail-btn-theme',
    action: 'theme',
  },
  {
    id: 'dao',
    label: 'DAO Governance',
    iconName: 'layers',
    icon: '🏛️',
    description: 'Decentralized governance, community proposals, and quadratic voting',
    testId: 'nav-btn-dao',
    action: 'dao',
  },
  {
    id: 'rss',
    label: 'RSS Importer',
    iconName: 'radio',
    icon: '📡',
    description: 'External RSS/Atom feed import, parsing, and aggregation',
    testId: 'btn-open-rss-panel',
    action: 'rss',
  },
  {
    id: 'cve',
    label: 'CVE Monitor',
    iconName: 'shield',
    icon: '🛡️',
    description: 'Real-time security vulnerability monitoring and CVE threat alerts',
    testId: 'btn-open-cve-monitor',
    action: 'cve',
  },
  {
    id: 'observatory',
    label: 'Network Observatory',
    iconName: 'network',
    icon: '🔭',
    description: 'P2P network monitor, node telemetry, and swarm topology',
    testId: 'btn-open-network-observatory',
    action: 'observatory',
  },
  {
    id: 'wot',
    label: 'Trust Graph',
    iconName: 'activity',
    icon: '🕸️',
    description: 'Interactive Web-of-Trust graph and cryptographic reputation scoring',
    testId: 'btn-open-wot-graph',
    action: 'wot',
  },
  {
    id: 'gossip',
    label: 'Gossip Visualizer',
    iconName: 'radio',
    icon: '📡',
    description: 'Real-time visualizer for mesh gossip message propagation',
    testId: 'btn-open-gossip-viz',
    action: 'gossip',
  },
  {
    id: 'steganography',
    label: 'Pixel Canvas Steganography',
    iconName: 'eye',
    icon: '🖼️',
    description: 'Steganographic encoding and payload hiding in canvas pixels',
    testId: 'drawer-btn-steganography',
    action: 'steganography',
  },
  {
    id: 'binary-hygiene',
    label: 'Binary Hygiene Portal',
    iconName: 'shield',
    icon: '🛡️',
    description: 'Secure PE/ELF binary analysis, Shannon entropy & UPX packer detection',
    testId: 'btn-open-binary-hygiene',
    action: 'binary-hygiene',
    badge: 'FREE',
  },
  {
    id: 'portable-trust',
    label: 'Portable ZK Trust Score',
    iconName: 'sparkles',
    icon: '💎',
    description: 'BN254 zero-knowledge reputation certificates and embeddable badges',
    testId: 'btn-open-portable-trust',
    action: 'portable-trust',
    badge: 'ZK',
  },
];

export const ALL_NAV_ITEMS: NavItemConfig[] = [
  ...PRIMARY_NAV_ITEMS,
  ...MORE_MENU_ITEMS,
  ...ADVANCED_TOOLS_ITEMS,
];

export function getNavItemById(id: string): NavItemConfig | undefined {
  return ALL_NAV_ITEMS.find(item => item.id === id);
}

export function getPrimaryNavItemByMode(mode: string): NavItemConfig | undefined {
  return PRIMARY_NAV_ITEMS.find(item => item.mode === mode || item.id === mode);
}

export function renderNavIcon(item: NavItemConfig, options: { size?: number; isActive?: boolean; [key: string]: any } = { size: 20 }): string {
  if (item.iconName) {
    return renderIcon(item.iconName, options);
  }
  return item.icon || '';
}

export function getLocalizedNavLabel(item: NavItemConfig): string {
  if (!item) return '';
  const keyMap: Record<string, string> = {
    feed: 'nav.feed',
    explore: 'nav.explore',
    messages: 'nav.messages',
    vault: 'nav.vault',
    profile: 'nav.profile',
    more: 'nav.more',
    bookmarks: 'nav.bookmarks',
    notifications: 'notifications.title',
    communities: 'nav.communities',
    governance: 'nav.governance',
    security: 'settings.security',
    backup: 'settings.backupTitle',
    network: 'nav.observatory',
    developer: 'nav.developer',
    advanced: 'settings.advanced',
    theme: 'nav.theme',
    dao: 'nav.governance',
    observatory: 'nav.observatory',
    help: 'footer.about',
  };

  const key = keyMap[item.id] || `nav.${item.id}`;
  return t(key, undefined, item.label);
}

export function getLocalizedNavDescription(item: NavItemConfig): string {
  if (!item) return '';
  return item.description;
}

