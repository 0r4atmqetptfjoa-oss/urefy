/**
 * @file ui/icons.ts
 * @package @aetheris/client-ui
 * @description Centralized Lucide SVG Icon Engine for Aetheris.
 * Replaces ad-hoc emojis with high-performance, tree-shakable SVG icons.
 */

import {
  Newspaper,
  Compass,
  MessageCircle,
  Vault,
  User,
  MoreHorizontal,
  Bell,
  Shield,
  Settings,
  Search,
  Plus,
  Trash2,
  Share2,
  Bookmark,
  Sparkles,
  Check,
  CheckCheck,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Wifi,
  WifiOff,
  Activity,
  FileText,
  Layers,
  ExternalLink,
  Copy,
  RefreshCw,
  Sliders,
  Terminal,
  Key,
  Cpu,
  Network,
  Radio,
  Database,
  Eye,
  EyeOff,
  Upload,
  Download,
  Info,
  Globe,
  SlidersHorizontal,
  Filter,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Users,
  MessageSquare,
  Paperclip,
  Send,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide';

export type IconDefinition = Array<[string, Record<string, string | number>]>;

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
};

export type IconName = keyof typeof ICONS;

export interface IconOptions {
  size?: number | string;
  class?: string;
  className?: string;
  color?: string;
  strokeWidth?: number | string;
  ariaLabel?: string;
  ariaHidden?: boolean;
}

/**
 * Converts a Lucide Icon Definition into an SVG string.
 */
export function iconToSvg(iconDef: IconDefinition, options: IconOptions = {}): string {
  const size = options.size ?? 18;
  const strokeWidth = options.strokeWidth ?? 2;
  const cls = options.className || options.class || '';
  const color = options.color || 'currentColor';
  const ariaAttr = options.ariaLabel
    ? `aria-label="${options.ariaLabel}" role="img"`
    : options.ariaHidden !== false ? 'aria-hidden="true"' : '';

  const children = iconDef
    .map(([tag, attrs]) => {
      const attrStr = Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      return `<${tag} ${attrStr} />`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon ${cls}" ${ariaAttr}>${children}</svg>`;
}

/**
 * Renders an icon by name from the central dictionary.
 * Falls back to an info icon if not found.
 */
export function renderIcon(name: IconName | string, options: IconOptions = {}): string {
  const def = ICONS[name as string] || ICONS.info;
  return iconToSvg(def, options);
}
