/**
 * @file ui/icons.ts
 * @package @aetheris/client-ui
 * @description Centralized Lucide & Sovereign SVG Icon Engine for UREfy.
 * Replaces ad-hoc emojis and provides unified Lucide-compatible icons,
 * proprietary sovereign glyphs (Merit Prism, Repost), and active/solid state variants.
 */

import Newspaper from 'lucide/dist/esm/icons/newspaper.mjs';
import Compass from 'lucide/dist/esm/icons/compass.mjs';
import MessageCircle from 'lucide/dist/esm/icons/message-circle.mjs';
import Vault from 'lucide/dist/esm/icons/vault.mjs';
import User from 'lucide/dist/esm/icons/user.mjs';
import MoreHorizontal from 'lucide/dist/esm/icons/ellipsis.mjs';
import Bell from 'lucide/dist/esm/icons/bell.mjs';
import Shield from 'lucide/dist/esm/icons/shield.mjs';
import Settings from 'lucide/dist/esm/icons/settings.mjs';
import Search from 'lucide/dist/esm/icons/search.mjs';
import Plus from 'lucide/dist/esm/icons/plus.mjs';
import Trash2 from 'lucide/dist/esm/icons/trash.mjs';
import Share2 from 'lucide/dist/esm/icons/share-2.mjs';
import Bookmark from 'lucide/dist/esm/icons/bookmark.mjs';
import Sparkles from 'lucide/dist/esm/icons/sparkles.mjs';
import Check from 'lucide/dist/esm/icons/check.mjs';
import CheckCheck from 'lucide/dist/esm/icons/check-check.mjs';
import AlertTriangle from 'lucide/dist/esm/icons/triangle-alert.mjs';
import X from 'lucide/dist/esm/icons/x.mjs';
import ChevronDown from 'lucide/dist/esm/icons/chevron-down.mjs';
import ChevronUp from 'lucide/dist/esm/icons/chevron-up.mjs';
import ChevronRight from 'lucide/dist/esm/icons/chevron-right.mjs';
import ArrowUp from 'lucide/dist/esm/icons/arrow-up.mjs';
import ArrowDown from 'lucide/dist/esm/icons/arrow-down.mjs';
import Lock from 'lucide/dist/esm/icons/lock.mjs';
import Unlock from 'lucide/dist/esm/icons/lock-open.mjs';
import Wifi from 'lucide/dist/esm/icons/wifi.mjs';
import WifiOff from 'lucide/dist/esm/icons/wifi-off.mjs';
import Activity from 'lucide/dist/esm/icons/activity.mjs';
import FileText from 'lucide/dist/esm/icons/file-text.mjs';
import Layers from 'lucide/dist/esm/icons/layers.mjs';
import Columns2 from 'lucide/dist/esm/icons/columns-2.mjs';
import ExternalLink from 'lucide/dist/esm/icons/external-link.mjs';
import Copy from 'lucide/dist/esm/icons/copy.mjs';
import RefreshCw from 'lucide/dist/esm/icons/refresh-cw.mjs';
import Sliders from 'lucide/dist/esm/icons/sliders-vertical.mjs';
import SlidersHorizontal from 'lucide/dist/esm/icons/sliders-horizontal.mjs';
import Terminal from 'lucide/dist/esm/icons/terminal.mjs';
import Key from 'lucide/dist/esm/icons/key.mjs';
import Cpu from 'lucide/dist/esm/icons/cpu.mjs';
import Network from 'lucide/dist/esm/icons/network.mjs';
import Radio from 'lucide/dist/esm/icons/radio.mjs';
import Database from 'lucide/dist/esm/icons/database.mjs';
import Eye from 'lucide/dist/esm/icons/eye.mjs';
import EyeOff from 'lucide/dist/esm/icons/eye-off.mjs';
import Upload from 'lucide/dist/esm/icons/upload.mjs';
import Download from 'lucide/dist/esm/icons/download.mjs';
import Info from 'lucide/dist/esm/icons/info.mjs';
import Globe from 'lucide/dist/esm/icons/globe.mjs';
import Filter from 'lucide/dist/esm/icons/funnel.mjs';
import Maximize2 from 'lucide/dist/esm/icons/maximize-2.mjs';
import Minimize2 from 'lucide/dist/esm/icons/minimize-2.mjs';
import Play from 'lucide/dist/esm/icons/play.mjs';
import Pause from 'lucide/dist/esm/icons/pause.mjs';
import Volume2 from 'lucide/dist/esm/icons/volume-2.mjs';
import VolumeX from 'lucide/dist/esm/icons/volume-x.mjs';
import Users from 'lucide/dist/esm/icons/users.mjs';
import MessageSquare from 'lucide/dist/esm/icons/message-square.mjs';
import Paperclip from 'lucide/dist/esm/icons/paperclip.mjs';
import Send from 'lucide/dist/esm/icons/send.mjs';
import HelpCircle from 'lucide/dist/esm/icons/circle-question-mark.mjs';
import LogOut from 'lucide/dist/esm/icons/log-out.mjs';
import Moon from 'lucide/dist/esm/icons/moon.mjs';
import Sun from 'lucide/dist/esm/icons/sun.mjs';
import Laptop from 'lucide/dist/esm/icons/laptop.mjs';
import Smartphone from 'lucide/dist/esm/icons/smartphone.mjs';
import Tablet from 'lucide/dist/esm/icons/tablet.mjs';
import CheckCircle2 from 'lucide/dist/esm/icons/circle-check.mjs';
import XCircle from 'lucide/dist/esm/icons/circle-x.mjs';
import RotateCcw from 'lucide/dist/esm/icons/rotate-ccw.mjs';
import Smile from 'lucide/dist/esm/icons/face-slightly-smiling.mjs';
import Heart from 'lucide/dist/esm/icons/heart.mjs';
import Menu from 'lucide/dist/esm/icons/menu.mjs';
import Rss from 'lucide/dist/esm/icons/rss.mjs';
import Vote from 'lucide/dist/esm/icons/vote.mjs';
import FileKey from 'lucide/dist/esm/icons/file-key.mjs';
import Image from 'lucide/dist/esm/icons/image.mjs';
import Link from 'lucide/dist/esm/icons/link.mjs';
import Hash from 'lucide/dist/esm/icons/hash.mjs';
import Flame from 'lucide/dist/esm/icons/flame.mjs';
import Clock from 'lucide/dist/esm/icons/clock.mjs';
import TrendingUp from 'lucide/dist/esm/icons/trending-up.mjs';
import LayoutGrid from 'lucide/dist/esm/icons/layout-grid.mjs';
import List from 'lucide/dist/esm/icons/list.mjs';
import Pin from 'lucide/dist/esm/icons/pin.mjs';
import Wallet from 'lucide/dist/esm/icons/wallet.mjs';
import Trophy from 'lucide/dist/esm/icons/trophy.mjs';
import Award from 'lucide/dist/esm/icons/award.mjs';
import Repeat from 'lucide/dist/esm/icons/repeat.mjs';
import Flag from 'lucide/dist/esm/icons/flag.mjs';
import Crown from 'lucide/dist/esm/icons/crown.mjs';
import Ban from 'lucide/dist/esm/icons/ban.mjs';
import Save from 'lucide/dist/esm/icons/save.mjs';
import Landmark from 'lucide/dist/esm/icons/landmark.mjs';
import Scroll from 'lucide/dist/esm/icons/scroll.mjs';
import Tag from 'lucide/dist/esm/icons/tag.mjs';
import Mic from 'lucide/dist/esm/icons/mic.mjs';
import Scale from 'lucide/dist/esm/icons/scale.mjs';
import Mail from 'lucide/dist/esm/icons/mail.mjs';
import Archive from 'lucide/dist/esm/icons/archive.mjs';
import ShieldCheck from 'lucide/dist/esm/icons/shield-check.mjs';
import Layout from 'lucide/dist/esm/icons/panels-top-left.mjs';
import type { IconNode } from 'lucide';

export type IconDefinition = IconNode;
export type IconVariant = 'outline' | 'solid';

export interface IconOptions {
  size?: number | string;
  class?: string;
  className?: string;
  color?: string;
  strokeWidth?: number | string;
  variant?: IconVariant;
  ariaLabel?: string;
  ariaHidden?: boolean;
}

// ─── PROPRIETARY UREFY VECTOR GLYPHS (0 0 24 24) ────────────────────────────

export const CUSTOM_ICONS: Record<string, { outline: IconNode; solid: IconNode }> = {
  merit: {
    outline: [
      ['path', { d: 'M12 2.5L20.5 8.5L12 14L3.5 8.5L12 2.5Z' }],
      ['path', { d: 'M3.5 8.5L12 21.5L20.5 8.5' }],
      ['path', { d: 'M12 14V21.5' }],
    ],
    solid: [
      ['polygon', { points: '12,2.5 20.5,8.5 12,14 3.5,8.5', fill: 'currentColor' }],
      ['polygon', { points: '3.5,8.5 12,14 12,21.5', fill: 'currentColor', opacity: '0.85' }],
      ['polygon', { points: '20.5,8.5 12,14 12,21.5', fill: 'currentColor', opacity: '0.7' }],
      ['path', { d: 'M12 2.5L20.5 8.5L12 14L3.5 8.5L12 2.5Z', stroke: 'currentColor', 'stroke-width': '1.75' }],
      ['path', { d: 'M3.5 8.5L12 21.5L20.5 8.5', stroke: 'currentColor', 'stroke-width': '1.75' }],
      ['path', { d: 'M12 14V21.5', stroke: 'currentColor', 'stroke-width': '1.75' }],
    ],
  },
  repost: {
    outline: [
      ['path', { d: 'M17 2l4 4-4 4' }],
      ['path', { d: 'M3 11V9a4 4 0 0 1 4-4h14' }],
      ['path', { d: 'M7 22l-4-4 4-4' }],
      ['path', { d: 'M21 13v2a4 4 0 0 1-4 4H3' }],
    ],
    solid: [
      ['path', { d: 'M17 2l4 4-4 4', 'stroke-width': '2.5' }],
      ['path', { d: 'M3 11V9a4 4 0 0 1 4-4h14', 'stroke-width': '2.5' }],
      ['path', { d: 'M7 22l-4-4 4-4', 'stroke-width': '2.5' }],
      ['path', { d: 'M21 13v2a4 4 0 0 1-4 4H3', 'stroke-width': '2.5' }],
    ],
  },
  circleSovereign: {
    outline: [
      ['path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }],
      ['circle', { cx: '12', cy: '11', r: '3' }],
    ],
    solid: [
      ['path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', fill: 'currentColor' }],
      ['circle', { cx: '12', cy: '11', r: '3', fill: '#0a0b0e' }],
    ],
  },
};

// ─── SOLID NAVIGATION MAPPINGS ──────────────────────────────────────────────

export const SOLID_ICONS: Record<string, IconNode> = {
  feed: [
    ['path', { d: 'M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2', fill: 'currentColor' }],
    ['path', { d: 'M18 14h-8', stroke: '#0a0b0e', 'stroke-width': '2' }],
    ['path', { d: 'M15 18h-5', stroke: '#0a0b0e', 'stroke-width': '2' }],
    ['path', { d: 'M10 6h8v4h-8V6Z', fill: '#0a0b0e' }],
  ],
  explore: [
    ['circle', { cx: '12', cy: '12', r: '10', fill: 'currentColor' }],
    ['polygon', { points: '16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76', fill: '#0a0b0e' }],
  ],
  messages: [
    ['path', { d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z', fill: 'currentColor' }],
  ],
  vault: [
    ['rect', { width: '18', height: '18', x: '3', y: '3', rx: '3', fill: 'currentColor' }],
    ['circle', { cx: '12', cy: '12', r: '4', fill: '#0a0b0e' }],
    ['circle', { cx: '12', cy: '12', r: '1.5', fill: 'currentColor' }],
  ],
  profile: [
    ['path', { d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', fill: 'currentColor' }],
    ['circle', { cx: '12', cy: '7', r: '4', fill: 'currentColor' }],
  ],
  bookmark: [
    ['path', { d: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z', fill: 'currentColor' }],
  ],
};

// ─── CENTRAL ICON REGISTRY ──────────────────────────────────────────────────

export const ICONS: Record<string, IconDefinition> = {
  // Primary Navigation
  feed: Newspaper,
  explore: Compass,
  messages: MessageCircle,
  vault: Vault,
  profile: User,
  more: MoreHorizontal,

  // Common UI
  bell: Bell,
  shield: Shield,
  settings: Settings,
  search: Search,
  plus: Plus,
  trash: Trash2,
  share: Share2,
  bookmark: Bookmark,
  sparkles: Sparkles,
  check: Check,
  checkCheck: CheckCheck,
  alert: AlertTriangle,
  close: X,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  chevronRight: ChevronRight,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  lock: Lock,
  unlock: Unlock,
  wifi: Wifi,
  wifiOff: WifiOff,
  activity: Activity,
  fileText: FileText,
  layers: Layers,
  columns: Columns2,
  externalLink: ExternalLink,
  copy: Copy,
  refresh: RefreshCw,
  sliders: Sliders,
  slidersHorizontal: SlidersHorizontal,
  terminal: Terminal,
  key: Key,
  cpu: Cpu,
  network: Network,
  radio: Radio,
  database: Database,
  eye: Eye,
  eyeOff: EyeOff,
  upload: Upload,
  download: Download,
  info: Info,
  globe: Globe,
  filter: Filter,
  maximize: Maximize2,
  minimize: Minimize2,
  play: Play,
  pause: Pause,
  volume: Volume2,
  mute: VolumeX,
  users: Users,
  messageSquare: MessageSquare,
  paperclip: Paperclip,
  send: Send,
  help: HelpCircle,
  logout: LogOut,
  moon: Moon,
  sun: Sun,
  laptop: Laptop,
  phone: Smartphone,
  tablet: Tablet,
  checkCircle: CheckCircle2,
  errorCircle: XCircle,
  rotateCcw: RotateCcw,
  smile: Smile,
  heart: Heart,
  menu: Menu,
  rss: Rss,
  vote: Vote,
  fileKey: FileKey,
  image: Image,
  link: Link,
  hash: Hash,
  flame: Flame,
  clock: Clock,
  trending: TrendingUp,
  grid: LayoutGrid,
  list: List,
  pin: Pin,
  wallet: Wallet,
  trophy: Trophy,
  award: Award,
  repost: Repeat,
  flag: Flag,
  crown: Crown,
  ban: Ban,
  save: Save,
  landmark: Landmark,
  scroll: Scroll,
  tag: Tag,
  mic: Mic,
  scale: Scale,
  mail: Mail,
  archive: Archive,
  shieldCheck: ShieldCheck,
  layout: Layout,
};

export type IconName = keyof typeof ICONS | keyof typeof CUSTOM_ICONS;

function escapeAttribute(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;');
}

/**
 * Converts an IconDefinition into an SVG string with state variants and customizable stroke.
 */
export function iconToSvg(iconDef: IconDefinition, options: IconOptions = {}): string {
  const size = options.size ?? 18;
  const strokeWidth = options.strokeWidth ?? 1.75;
  const cls = options.className || options.class || '';
  const color = options.color || 'currentColor';
  const ariaAttr = options.ariaLabel
    ? `aria-label="${escapeAttribute(options.ariaLabel)}" role="img"`
    : options.ariaHidden !== false ? 'aria-hidden="true"' : '';

  const children = iconDef
    .map(([tag, attrs]) => {
      const attrStr = Object.entries(attrs)
        .filter(([, value]) => value !== undefined)
        .map(([attribute, value]) => `${attribute}="${escapeAttribute(value!)}"`)
        .join(' ');
      return `<${tag} ${attrStr} />`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${escapeAttribute(size)}" height="${escapeAttribute(size)}" viewBox="0 0 24 24" fill="none" stroke="${escapeAttribute(color)}" stroke-width="${escapeAttribute(strokeWidth)}" stroke-linecap="round" stroke-linejoin="round" focusable="false" class="urefy-icon lucide-icon ${escapeAttribute(cls)}" ${ariaAttr}>${children}</svg>`;
}

/**
 * Renders an icon by name from the dictionary with support for 'outline' and 'solid' variants.
 * Falls back to an info icon if not found.
 */
export function renderIcon(name: IconName | string, options: IconOptions = {}): string {
  const variant = options.variant || 'outline';

  // 1. Custom proprietary glyphs (Merit, Repost, Sovereign Circle)
  if (CUSTOM_ICONS[name]) {
    const customDef = variant === 'solid' ? CUSTOM_ICONS[name].solid : CUSTOM_ICONS[name].outline;
    return iconToSvg(customDef, options);
  }

  // 2. Solid navigation icons
  if (variant === 'solid' && SOLID_ICONS[name]) {
    return iconToSvg(SOLID_ICONS[name], { ...options, strokeWidth: 0 });
  }

  // 3. Standard Lucide dictionary
  const def = ICONS[name as string] || ICONS.info;
  return iconToSvg(def, options);
}

/**
 * Renders the proprietary Sovereign Merit Prism ("Ascendant Crest").
 * Inactive: Outline with subtle cyan hover.
 * Endorsed: Radiant solid crystalline prism with luminous duotone.
 */
export function renderMeritIcon(isEndorsed: boolean, options: IconOptions = {}): string {
  if (isEndorsed) {
    const size = options.size ?? 20;
    const cls = options.className || options.class || '';
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${escapeAttribute(size)}" height="${escapeAttribute(size)}" viewBox="0 0 24 24" fill="none" class="urefy-merit-icon is-active ${escapeAttribute(cls)}" aria-hidden="true">
        <defs>
          <linearGradient id="meritGlow" x1="12" y1="2.5" x2="12" y2="21.5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#00E5FF" />
            <stop offset="50%" stop-color="#3B82F6" />
            <stop offset="100%" stop-color="#6366F1" />
          </linearGradient>
          <linearGradient id="meritFacet" x1="3.5" y1="8.5" x2="20.5" y2="14" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0.1" />
          </linearGradient>
        </defs>
        <polygon points="12,2.5 20.5,8.5 12,14 3.5,8.5" fill="url(#meritGlow)" />
        <polygon points="3.5,8.5 12,14 12,21.5" fill="url(#meritGlow)" opacity="0.85" />
        <polygon points="20.5,8.5 12,14 12,21.5" fill="url(#meritGlow)" opacity="0.7" />
        <polygon points="12,2.5 20.5,8.5 12,14 3.5,8.5" fill="url(#meritFacet)" />
        <path d="M12 2.5L20.5 8.5L12 14L3.5 8.5L12 2.5Z" stroke="#00E5FF" stroke-width="1.75" stroke-linejoin="round" />
        <path d="M3.5 8.5L12 21.5L20.5 8.5" stroke="#00E5FF" stroke-width="1.75" stroke-linejoin="round" />
        <path d="M12 14V21.5" stroke="#00E5FF" stroke-width="1.75" stroke-linecap="round" />
      </svg>
    `.trim();
  }

  return renderIcon('merit', {
    ...options,
    variant: 'outline',
    strokeWidth: 1.75,
    className: `urefy-merit-icon ${options.className || options.class || ''}`.trim(),
  });
}

/**
 * Renders the official UREfy Concept F ("The Geometric Keystone") SVG mark inline.
 * Inlined SVG prevents browser image cache staleness and guarantees instant display.
 */
export function renderBrandLogoMark(options: { size?: number; className?: string } = {}): string {
  const size = options.size ?? 24;
  const cls = options.className || '';
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" class="urefy-keystone-mark ${escapeAttribute(cls)}" role="img" aria-label="UREfy Keystone Logo">
      <defs>
        <linearGradient id="inline_gradF_left" x1="20" y1="16" x2="42" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#F8FAFC" />
          <stop offset="100%" stop-color="#94A3B8" />
        </linearGradient>
        <linearGradient id="inline_gradF_right" x1="80" y1="16" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#CBD5E1" />
          <stop offset="100%" stop-color="#64748B" />
        </linearGradient>
        <linearGradient id="inline_gradF_base" x1="20" y1="65" x2="80" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#F59E0B" />
          <stop offset="100%" stop-color="#D97706" />
        </linearGradient>
      </defs>
      <!-- Left Pillar Facet (Rounded Precision Monolith) -->
      <path d="M 22 20 C 22 17.8, 23.8 16, 26 16 L 38 16 C 40.2 16, 42 17.8, 42 20 L 42 56 C 42 58.2, 40.2 60, 38 60 L 26 60 C 23.8 60, 22 58.2, 22 56 Z" fill="url(#inline_gradF_left)" />
      <!-- Right Pillar Facet -->
      <path d="M 58 20 C 58 17.8, 59.8 16, 62 16 L 74 16 C 76.2 16, 78 17.8, 78 20 L 78 56 C 78 58.2, 76.2 60, 74 60 L 62 60 C 59.8 60, 58 58.2, 58 56 Z" fill="url(#inline_gradF_right)" />
      <!-- Keystone Foundation Base Facet (4px Airgap Calibration) -->
      <path d="M 22 66 C 22 64.2, 23.6 63, 25.4 63.4 C 33.2 65, 41.5 66, 50 66 C 58.5 66, 66.8 65, 74.6 63.4 C 76.4 63, 78 64.2, 78 66 C 78 77, 66 86, 50 86 C 34 86, 22 77, 22 66 Z" fill="url(#inline_gradF_base)" />
    </svg>
  `.trim();
}
