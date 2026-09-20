/**
 * autocomplete.ts
 * UREfy — Intelligent Autocomplete Engine
 * Real-time @mentions and #hashtags popup engine with caret coordinate tracking,
 * full keyboard navigation (ArrowUp, ArrowDown, Enter, Tab, Escape),
 * obsidian dark theme, and zero external dependencies.
 */

// ---------------------------------------------------------------------------
// Interfaces & Types
// ---------------------------------------------------------------------------

import { searchEmojis } from './chat-rich-embed.js';

export type AutocompleteItemType = 'mention' | 'tag' | 'emoji';

export interface AutocompleteItem {
  type: AutocompleteItemType;
  value: string;
  displayLabel: string;
  subtitle?: string;
  icon?: string;
  badge?: string;
  badgeColor?: string;
  count?: number;
  avatarSeed?: string;
}

export interface MemberData {
  fingerprint: string;
  role: string;
  isZKVerified?: boolean;
  status?: string;
  avatarSeed?: string;
}

export interface TagData {
  tag: string;
  count?: number;
  category?: string;
}

export interface CaretCoordinates {
  top: number;
  left: number;
  height: number;
}

export type AutocompleteSelectCallback = (
  item: AutocompleteItem,
  inputEl: HTMLInputElement | HTMLTextAreaElement
) => void;

// ---------------------------------------------------------------------------
// Default Seed Data
// ---------------------------------------------------------------------------

const DEFAULT_MEMBERS: MemberData[] = [
  { fingerprint: '0x9f4a2180e12d', role: 'Core Architect', isZKVerified: true, status: 'Active' },
  { fingerprint: '0x3c8b77a94421', role: 'Security Auditor', isZKVerified: true, status: 'Active' },
  { fingerprint: '0x7e12b45fc890', role: 'Relay Operator', isZKVerified: false, status: 'Online' },
  { fingerprint: '0x1a8dc390e4f1', role: 'ZK Prover', isZKVerified: true, status: 'Active' },
  { fingerprint: '0x5d21fa4476c2', role: 'Community Mod', isZKVerified: false, status: 'Online' },
  { fingerprint: '0x8b3e991c01ff', role: 'Vault Maintainer', isZKVerified: true, status: 'Active' },
  { fingerprint: '0x2f9081ab65dd', role: 'Pulse Curator', isZKVerified: false, status: 'Idle' },
  { fingerprint: '0x44cd02ee991a', role: 'Cryptographer', isZKVerified: true, status: 'Active' },
  { fingerprint: '0x6a1055de338b', role: 'Validator Node', isZKVerified: true, status: 'Active' },
  { fingerprint: '0xb89231acc510', role: 'Mesh Operator', isZKVerified: false, status: 'Online' }
];

const DEFAULT_TAGS: TagData[] = [
  { tag: 'zkproofs', count: 428, category: 'Cryptosystems' },
  { tag: 'zeroknowledge', count: 312, category: 'Privacy' },
  { tag: 'aetheris', count: 890, category: 'Protocol' },
  { tag: 'security', count: 256, category: 'Audits' },
  { tag: 'micro-pulse', count: 740, category: 'Pulse' },
  { tag: 'vault', count: 185, category: 'Binary Releases' },
  { tag: 'p2p-relay', count: 310, category: 'Networking' },
  { tag: 'quantum-resistant', count: 144, category: 'Research' },
  { tag: 'anonymity', count: 520, category: 'Privacy' },
  { tag: 'consensus', count: 98, category: 'Core' },
  { tag: 'rust', count: 367, category: 'Engineering' },
  { tag: 'typescript', count: 215, category: 'UI/UX' },
  { tag: 'mesh-network', count: 189, category: 'Infrastructure' },
  { tag: 'hygiene-check', count: 94, category: 'Security' },
  { tag: 'crypto-merit', count: 412, category: 'Reputation' }
];

// ---------------------------------------------------------------------------
// SVG Icon Helpers
// ---------------------------------------------------------------------------

function generateIdenticonSvg(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 140) % 360;
  const c1 = `hsl(${hue1}, 80%, 55%)`;
  const c2 = `hsl(${hue2}, 85%, 65%)`;

  const p1 = Math.abs((hash >> 2) % 18) + 2;
  const p2 = Math.abs((hash >> 4) % 18) + 2;
  const p3 = Math.abs((hash >> 6) % 18) + 2;

  return `
    <svg class="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-white/20" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" fill="#12151c" />
      <circle cx="${p1}" cy="${p2}" r="8" fill="${c1}" opacity="0.8" />
      <circle cx="${24 - p2}" cy="${p3}" r="7" fill="${c2}" opacity="0.8" />
      <rect x="6" y="6" width="12" height="12" rx="3" fill="#ffffff" opacity="0.15" />
    </svg>
  `;
}

function getHashtagSvg(): string {
  return `
    <svg class="w-5 h-5 text-cyphr shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="4" y1="9" x2="20" y2="9"></line>
      <line x1="4" y1="15" x2="20" y2="15"></line>
      <line x1="10" y1="3" x2="8" y2="21"></line>
      <line x1="16" y1="3" x2="14" y2="21"></line>
    </svg>
  `;
}

function getVerifiedBadgeSvg(): string {
  return `
    <svg class="w-3.5 h-3.5 text-signal shrink-0 inline-block ml-1" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L14.8 5.6L19.4 5.9L19.8 10.5L23.4 13.3L20.6 17L21 21.6L16.4 22L13.6 25.6L12 22.8L10.4 25.6L7.6 22L3 21.6L3.4 17L0.6 13.3L4.2 10.5L4.6 5.9L9.2 5.6L12 2Z" />
      <path d="M9 12L11 14L15 10" stroke="#12151c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

// ---------------------------------------------------------------------------
// AutocompleteEngine Class
// ---------------------------------------------------------------------------

export class AutocompleteEngine {
  public isVisible: boolean = false;
  public items: AutocompleteItem[] = [];
  public selectedIndex: number = 0;
  public currentPrefix: '@' | '#' | ':' | null = null;
  public activeInputElement: HTMLInputElement | HTMLTextAreaElement | null = null;

  public query: string = '';
  public queryStartIndex: number = -1;
  public caretCoords: CaretCoordinates = { top: 0, left: 0, height: 20 };

  private members: MemberData[] = [...DEFAULT_MEMBERS];
  private tags: TagData[] = [...DEFAULT_TAGS];
  private popupContainer: HTMLElement | null = null;
  private attachedElements: WeakSet<HTMLElement> = new WeakSet();
  private selectCallbacks: AutocompleteSelectCallback[] = [];

  constructor() {
    this.ensurePopupContainer();
  }

  // -------------------------------------------------------------------------
  // Container & DOM Setup
  // -------------------------------------------------------------------------

  private ensurePopupContainer(): void {
    if (typeof document === 'undefined') return;

    let container = document.getElementById('omni-autocomplete-popup');
    if (!container) {
      container = document.createElement('div');
      container.id = 'omni-autocomplete-popup';
      container.className = 'fixed z-[99999] pointer-events-auto select-none transition-all duration-75';
      container.style.display = 'none';
      container.style.top = '0px';
      container.style.left = '0px';
      document.body.appendChild(container);
    }
    this.popupContainer = container;

    // Global click listener to dismiss when clicking outside
    document.addEventListener('pointerdown', (e: MouseEvent) => {
      if (!this.isVisible) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (this.popupContainer && this.popupContainer.contains(target)) return;
      if (this.activeInputElement && this.activeInputElement === target) return;
      this.hide();
    });
  }

  // -------------------------------------------------------------------------
  // Public Configuration & Registration
  // -------------------------------------------------------------------------

  public attach(
    inputEl: HTMLInputElement | HTMLTextAreaElement,
    members?: Array<{ fingerprint: string; role: string; isZKVerified?: boolean }>,
    tags?: string[] | TagData[]
  ): void {
    if (!inputEl) return;

    if (members && members.length > 0) {
      this.setMembers(members);
    }
    if (tags && tags.length > 0) {
      this.setTags(tags);
    }

    if (this.attachedElements.has(inputEl)) {
      return;
    }
    this.attachedElements.add(inputEl);

    // Keyboard navigation handlers
    inputEl.addEventListener('keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (this.isVisible) {
        const handled = this.handleKeyDown(keyEvent);
        if (handled) {
          keyEvent.stopPropagation();
        }
      }
    });

    // Input state checks
    inputEl.addEventListener('input', () => {
      this.checkAutocomplete(inputEl);
    });

    inputEl.addEventListener('keyup', (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      // Don't re-trigger for navigation keys handled in keydown
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(keyEvent.key)) return;
      this.checkAutocomplete(inputEl);
    });

    inputEl.addEventListener('click', () => {
      this.checkAutocomplete(inputEl);
    });

    inputEl.addEventListener('blur', () => {
      // Delay hide to allow clicks on dropdown items to fire
      setTimeout(() => {
        if (document.activeElement !== inputEl && !this.isMouseOverPopup()) {
          this.hide();
        }
      }, 200);
    });
  }

  public setMembers(members: Array<{ fingerprint: string; role: string; isZKVerified?: boolean; status?: string }>): void {
    this.members = members.map(m => ({
      fingerprint: m.fingerprint,
      role: m.role || 'Member',
      isZKVerified: m.isZKVerified ?? true,
      status: m.status || 'Active',
      avatarSeed: m.fingerprint
    }));
  }

  public setTags(tags: string[] | TagData[]): void {
    if (tags.length === 0) return;
    if (typeof tags[0] === 'string') {
      this.tags = (tags as string[]).map((t, idx) => ({
        tag: t.replace(/^#/, ''),
        count: 50 + ((idx * 37) % 500),
        category: 'Topic'
      }));
    } else {
      this.tags = tags as TagData[];
    }
  }

  public addMember(member: MemberData): void {
    const exists = this.members.some(m => m.fingerprint.toLowerCase() === member.fingerprint.toLowerCase());
    if (!exists) {
      this.members.unshift(member);
    }
  }

  public addTag(tag: string, count: number = 1, category: string = 'General'): void {
    const cleanTag = tag.replace(/^#/, '').toLowerCase();
    const existing = this.tags.find(t => t.tag.toLowerCase() === cleanTag);
    if (existing) {
      existing.count = (existing.count || 0) + count;
    } else {
      this.tags.unshift({ tag: cleanTag, count, category });
    }
  }

  public onSelect(callback: AutocompleteSelectCallback): () => void {
    this.selectCallbacks.push(callback);
    return () => {
      this.selectCallbacks = this.selectCallbacks.filter(cb => cb !== callback);
    };
  }

  // -------------------------------------------------------------------------
  // Caret & Word Detection Logic
  // -------------------------------------------------------------------------

  public checkAutocomplete(inputEl: HTMLInputElement | HTMLTextAreaElement): void {
    this.activeInputElement = inputEl;
    const cursorPos = inputEl.selectionStart ?? 0;
    const value = inputEl.value;

    const textBeforeCursor = value.slice(0, cursorPos);

    // Look for @, #, or : word currently being typed at cursor
    // Word starts at beginning of string or after whitespace, excluding URLs (e.g. http:)
    const match = textBeforeCursor.match(/(?:^|\s)([@#:](?!\/\/))([a-zA-Z0-9_\-\+]*)$/);

    if (!match) {
      this.hide();
      return;
    }

    const prefix = match[1] as '@' | '#' | ':';
    const query = match[2] || '';
    this.queryStartIndex = cursorPos - query.length - 1;

    this.currentPrefix = prefix;
    this.query = query;

    let filteredItems: AutocompleteItem[] = [];

    if (prefix === '@') {
      filteredItems = this.filterMembers(query);
    } else if (prefix === '#') {
      filteredItems = this.filterTags(query);
    } else if (prefix === ':') {
      filteredItems = this.filterEmojis(query);
    }

    if (filteredItems.length === 0) {
      this.hide();
      return;
    }

    this.show(inputEl, filteredItems, prefix);
  }

  public filterEmojis(query: string): AutocompleteItem[] {
    const emojis = searchEmojis(query, 8);
    return emojis.map(e => ({
      type: 'emoji',
      value: e.emoji,
      displayLabel: `:${e.shortcode}:`,
      subtitle: e.name,
      icon: `<span class="text-base leading-none w-5 text-center">${e.emoji}</span>`,
      badge: e.category,
      badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    }));
  }

  // -------------------------------------------------------------------------
  // Filtering & Ranking
  // -------------------------------------------------------------------------

  public filterMembers(query: string): AutocompleteItem[] {
    const q = query.toLowerCase().trim();
    const matches = this.members.filter(m => {
      if (!q) return true;
      const fpMatch = m.fingerprint.toLowerCase().includes(q);
      const roleMatch = m.role.toLowerCase().includes(q);
      return fpMatch || roleMatch;
    });

    // Sort: exact startsWith first, then others
    matches.sort((a, b) => {
      const aStarts = a.fingerprint.toLowerCase().startsWith(q) || a.role.toLowerCase().startsWith(q);
      const bStarts = b.fingerprint.toLowerCase().startsWith(q) || b.role.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return (b.isZKVerified ? 1 : 0) - (a.isZKVerified ? 1 : 0);
    });

    return matches.slice(0, 7).map(m => {
      let badge = 'MEMBER';
      let badgeColor = 'text-slate-400 bg-white/5';

      if (m.role.toLowerCase().includes('architect') || m.role.toLowerCase().includes('maintainer')) {
        badge = 'CORE';
        badgeColor = 'text-cyphr bg-cyan-950/60 border border-cyphr/30';
      } else if (m.role.toLowerCase().includes('auditor') || m.role.toLowerCase().includes('security')) {
        badge = 'SECURITY';
        badgeColor = 'text-crimson bg-red-950/60 border border-crimson/30';
      } else if (m.role.toLowerCase().includes('zk') || m.role.toLowerCase().includes('prover')) {
        badge = 'ZK-PROVER';
        badgeColor = 'text-aether bg-purple-950/60 border border-aether/30';
      } else if (m.role.toLowerCase().includes('operator') || m.role.toLowerCase().includes('node')) {
        badge = 'RELAY';
        badgeColor = 'text-signal bg-green-950/60 border border-signal/30';
      } else if (m.role.toLowerCase().includes('mod')) {
        badge = 'MOD';
        badgeColor = 'text-amber bg-amber-950/60 border border-amber/30';
      }

      return {
        type: 'mention',
        value: m.fingerprint,
        displayLabel: `@${m.fingerprint}`,
        subtitle: m.role,
        badge,
        badgeColor,
        avatarSeed: m.fingerprint,
        icon: generateIdenticonSvg(m.fingerprint)
      };
    });
  }

  public filterTags(query: string): AutocompleteItem[] {
    const q = query.toLowerCase().trim();
    const matches = this.tags.filter(t => {
      if (!q) return true;
      return t.tag.toLowerCase().includes(q) || (t.category && t.category.toLowerCase().includes(q));
    });

    // Sort by count descending
    matches.sort((a, b) => {
      const aStarts = a.tag.toLowerCase().startsWith(q);
      const bStarts = b.tag.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return (b.count || 0) - (a.count || 0);
    });

    return matches.slice(0, 7).map(t => {
      const count = t.count || 1;
      const isTrending = count > 300;

      return {
        type: 'tag',
        value: t.tag,
        displayLabel: `#${t.tag}`,
        subtitle: `${count.toLocaleString()} posts • ${t.category || 'Topic'}`,
        badge: isTrending ? 'TRENDING' : undefined,
        badgeColor: isTrending ? 'text-amber bg-amber-500/10 border border-amber-500/30' : undefined,
        count,
        icon: getHashtagSvg()
      };
    });
  }

  // -------------------------------------------------------------------------
  // Display & Positioning
  // -------------------------------------------------------------------------

  public show(
    inputEl: HTMLInputElement | HTMLTextAreaElement,
    items: AutocompleteItem[],
    prefix: '@' | '#' | ':'
  ): void {
    this.activeInputElement = inputEl;
    this.items = items;
    this.currentPrefix = prefix;
    this.selectedIndex = 0;
    this.isVisible = true;

    this.ensurePopupContainer();
    if (!this.popupContainer) return;

    // Calculate Caret Coordinates
    const cursorPos = inputEl.selectionStart ?? 0;
    this.caretCoords = this.calculateCaretCoordinates(inputEl, cursorPos);

    // Render HTML inside container
    this.popupContainer.innerHTML = this.renderPopup();
    this.popupContainer.style.display = 'block';

    // Position container with boundary constraints
    this.updatePosition();

    // Bind item click and hover listeners
    this.bindPopupEvents();
  }

  public hide(): void {
    this.isVisible = false;
    this.items = [];
    this.selectedIndex = 0;
    this.currentPrefix = null;
    if (this.popupContainer) {
      this.popupContainer.style.display = 'none';
      this.popupContainer.innerHTML = '';
    }
  }

  private updatePosition(): void {
    if (!this.popupContainer || !this.activeInputElement) return;

    const popupRect = this.popupContainer.getBoundingClientRect();
    const popupWidth = 320;
    const popupHeight = popupRect.height || 260;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let targetLeft = this.caretCoords.left;
    let targetTop = this.caretCoords.top + this.caretCoords.height + 6; // Below caret

    // Horizontal boundary check
    if (targetLeft + popupWidth > viewportWidth - 16) {
      targetLeft = viewportWidth - popupWidth - 16;
    }
    if (targetLeft < 16) {
      targetLeft = 16;
    }

    // Vertical boundary check: Flip above if bottom goes offscreen
    if (targetTop + popupHeight > viewportHeight - 16) {
      const topAbove = this.caretCoords.top - popupHeight - 6;
      if (topAbove > 16) {
        targetTop = topAbove;
      }
    }

    this.popupContainer.style.left = `${Math.round(targetLeft)}px`;
    this.popupContainer.style.top = `${Math.round(targetTop)}px`;
  }

  // -------------------------------------------------------------------------
  // Caret Coordinates Calculation (Vanilla JS Mirror Technique)
  // -------------------------------------------------------------------------

  public calculateCaretCoordinates(
    element: HTMLInputElement | HTMLTextAreaElement,
    position: number
  ): CaretCoordinates {
    const isInput = element.tagName.toLowerCase() === 'input';
    const rect = element.getBoundingClientRect();

    const div = document.createElement('div');
    const style = window.getComputedStyle(element);

    const propertiesToCopy = [
      'direction',
      'boxSizing',
      'width',
      'height',
      'overflowX',
      'overflowY',
      'borderTopWidth',
      'borderRightWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'borderStyle',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'fontStyle',
      'fontVariant',
      'fontWeight',
      'fontStretch',
      'fontSize',
      'fontSizeAdjust',
      'lineHeight',
      'fontFamily',
      'textAlign',
      'textTransform',
      'textIndent',
      'textDecoration',
      'letterSpacing',
      'wordSpacing',
      'tabSize',
      'MozTabSize',
      'whiteSpace',
      'wordWrap',
      'wordBreak'
    ] as const;

    div.id = 'caret-calc-mirror-div';
    div.style.position = 'absolute';
    div.style.top = '0px';
    div.style.left = '-9999px';
    div.style.visibility = 'hidden';
    div.style.pointerEvents = 'none';

    for (const prop of propertiesToCopy) {
      // @ts-ignore
      div.style[prop] = style[prop];
    }

    if (isInput) {
      div.style.whiteSpace = 'nowrap';
    } else {
      div.style.whiteSpace = 'pre-wrap';
      div.style.wordWrap = 'break-word';
    }

    const textContent = element.value.substring(0, position);
    div.textContent = textContent;

    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);

    document.body.appendChild(div);

    const spanOffsetLeft = span.offsetLeft;
    const spanOffsetTop = span.offsetTop;

    const computedLineHeight = parseInt(style.lineHeight, 10) || parseInt(style.fontSize, 10) * 1.3 || 20;

    document.body.removeChild(div);

    const scrollLeft = element.scrollLeft || 0;
    const scrollTop = element.scrollTop || 0;

    const finalLeft = rect.left + spanOffsetLeft - scrollLeft;
    const finalTop = rect.top + spanOffsetTop - scrollTop;

    return {
      left: Math.max(rect.left, Math.min(rect.right - 20, finalLeft)),
      top: Math.max(rect.top, Math.min(rect.bottom, finalTop)),
      height: computedLineHeight
    };
  }

  // -------------------------------------------------------------------------
  // Keyboard Navigation
  // -------------------------------------------------------------------------

  public handleKeyDown(e: KeyboardEvent): boolean {
    if (!this.isVisible || this.items.length === 0) {
      return false;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        this.moveSelection(1);
        return true;
      }
      case 'ArrowUp': {
        e.preventDefault();
        this.moveSelection(-1);
        return true;
      }
      case 'Enter':
      case 'Tab': {
        e.preventDefault();
        this.selectCurrentItem();
        return true;
      }
      case 'Escape': {
        e.preventDefault();
        this.hide();
        return true;
      }
      default:
        return false;
    }
  }

  public moveSelection(delta: number): void {
    if (this.items.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.items.length) % this.items.length;
    this.updateActiveItemHighlight();
  }

  private updateActiveItemHighlight(): void {
    if (!this.popupContainer) return;
    const listItems = this.popupContainer.querySelectorAll<HTMLElement>('[data-autocomplete-index]');
    listItems.forEach((el, idx) => {
      const isSelected = idx === this.selectedIndex;
      if (isSelected) {
        el.className = this.getItemSelectedClass();
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        el.className = this.getItemDefaultClass();
      }
    });
  }

  // -------------------------------------------------------------------------
  // Selection & Value Injection
  // -------------------------------------------------------------------------

  public selectItem(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.selectedIndex = index;
      this.selectCurrentItem();
    }
  }

  public selectCurrentItem(): void {
    if (!this.isVisible || this.selectedIndex < 0 || this.selectedIndex >= this.items.length) {
      return;
    }

    const selectedItem = this.items[this.selectedIndex];
    const inputEl = this.activeInputElement;
    if (!inputEl) return;

    const value = inputEl.value;
    const cursorPos = inputEl.selectionStart ?? value.length;
    const startPos = Math.max(0, this.queryStartIndex);

    // Format replacement string with trailing space
    const replacement = (this.currentPrefix === ':')
      ? `${selectedItem.value} `
      : `${this.currentPrefix}${selectedItem.value} `;

    // Replace matched word
    const before = value.substring(0, startPos);
    const after = value.substring(cursorPos);
    const newValue = before + replacement + after;

    inputEl.value = newValue;

    // Reposition cursor right after inserted token and space
    const newCursorPos = startPos + replacement.length;
    inputEl.setSelectionRange(newCursorPos, newCursorPos);
    inputEl.focus();

    // Trigger input & change events for reactive state engines
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));

    // Notify registered callbacks
    this.selectCallbacks.forEach(callback => {
      try {
        callback(selectedItem, inputEl);
      } catch (err) {
        console.error('[Autocomplete] Callback error:', err);
      }
    });

    this.hide();
  }

  // -------------------------------------------------------------------------
  // Rendering & Templates
  // -------------------------------------------------------------------------

  private getItemDefaultClass(): string {
    return 'flex items-center justify-between px-3 py-2 cursor-pointer transition-colors text-slate-300 hover:bg-surface-overlay hover:text-white border-l-2 border-transparent';
  }

  private getItemSelectedClass(): string {
    return 'flex items-center justify-between px-3 py-2 cursor-pointer transition-colors bg-surface-overlay text-white border-l-2 border-cyphr';
  }

  public renderPopup(): string {
    const isMention = this.currentPrefix === '@';
    const isEmoji = this.currentPrefix === ':';
    const headerTitle = isMention ? 'MEMBERS & KEYS' : isEmoji ? 'EMOJIS' : 'HASHTAGS & TOPICS';
    const headerIcon = isMention ? '@' : isEmoji ? '😊' : '#';
    const countLabel = `${this.items.length} ${this.items.length === 1 ? 'match' : 'matches'}`;

    return `
      <div class="w-80 bg-surface-raised/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden font-sans text-xs border-subtle-b animate-in fade-in zoom-in-95 duration-100">
        
        <!-- HEADER -->
        <div class="px-3 py-2 bg-surface-base/80 border-b border-white/5 flex items-center justify-between">
          <div class="flex items-center space-x-1.5">
            <span class="w-4 h-4 rounded bg-surface-overlay flex items-center justify-center font-mono font-bold text-[10px] text-cyphr">${headerIcon}</span>
            <span class="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">${headerTitle}</span>
          </div>
          <span class="font-mono text-[10px] text-slate-500">${countLabel}</span>
        </div>

        <!-- ITEMS LIST -->
        <div class="max-h-60 overflow-y-auto py-1 divide-y divide-white/[0.03]" id="autocomplete-items-list">
          ${this.items
            .map((item, index) => {
              const isSelected = index === this.selectedIndex;
              const rowClass = isSelected ? this.getItemSelectedClass() : this.getItemDefaultClass();

              return `
                <div data-autocomplete-index="${index}" class="${rowClass}">
                  <div class="flex items-center space-x-2.5 min-w-0 pr-2">
                    ${item.icon || ''}
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center space-x-1 truncate">
                        <span class="font-mono font-semibold ${isSelected ? 'text-cyphr' : 'text-slate-200'} truncate">
                          ${this.highlightMatch(item.displayLabel, this.query)}
                        </span>
                        ${item.type === 'mention' ? getVerifiedBadgeSvg() : ''}
                      </div>
                      ${
                        item.subtitle
                          ? `<div class="text-[10px] text-slate-400 truncate">${item.subtitle}</div>`
                          : ''
                      }
                    </div>
                  </div>

                  <!-- BADGE OR ACTION ICON -->
                  <div class="shrink-0 flex items-center space-x-1.5">
                    ${
                      item.badge
                        ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold tracking-tight ${
                            item.badgeColor || 'bg-white/5 text-slate-300'
                          }">${item.badge}</span>`
                        : ''
                    }
                    ${
                      isSelected
                        ? `<span class="text-[10px] font-mono text-cyphr font-bold opacity-75">↵</span>`
                        : ''
                    }
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>

        <!-- FOOTER SHORTCUTS -->
        <div class="px-3 py-1.5 bg-surface-base/90 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <div class="flex items-center space-x-2">
            <span><kbd class="px-1 py-0.5 rounded bg-surface-overlay text-slate-300 border border-white/5">↑↓</kbd> nav</span>
            <span><kbd class="px-1 py-0.5 rounded bg-surface-overlay text-slate-300 border border-white/5">↵</kbd> select</span>
            <span><kbd class="px-1 py-0.5 rounded bg-surface-overlay text-slate-300 border border-white/5">esc</kbd> close</span>
          </div>
          <span class="text-cyphr/80 font-sans font-medium text-[9px]">UREfy ZK</span>
        </div>

      </div>
    `;
  }

  private highlightMatch(text: string, query: string): string {
    if (!query) return text;
    const cleanQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${cleanQuery})`, 'gi');
    return text.replace(regex, '<span class="text-cyphr font-bold underline decoration-cyphr/40">$1</span>');
  }

  // -------------------------------------------------------------------------
  // Event Bindings for Popup Menu
  // -------------------------------------------------------------------------

  private bindPopupEvents(): void {
    if (!this.popupContainer) return;

    const itemElements = this.popupContainer.querySelectorAll<HTMLElement>('[data-autocomplete-index]');
    itemElements.forEach(el => {
      const idx = parseInt(el.getAttribute('data-autocomplete-index') || '0', 10);

      el.addEventListener('mouseenter', () => {
        this.selectedIndex = idx;
        this.updateActiveItemHighlight();
      });

      el.addEventListener('pointerdown', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectItem(idx);
      });
    });
  }

  private isMouseOverPopup(): boolean {
    if (!this.popupContainer) return false;
    return this.popupContainer.matches(':hover');
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

export const autocompleteEngine: AutocompleteEngine = new AutocompleteEngine();
