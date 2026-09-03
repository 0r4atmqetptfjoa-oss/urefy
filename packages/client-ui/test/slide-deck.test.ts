import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SlideDeckManager,
  slideDeckManager,
  renderSlideMarkdown,
  type Slide,
  type SlideTheme,
  type SlideDeckConfig,
  type SlideDeckStats
} from '../src/slide-deck.js';

// ─── Lightweight Mock DOM Environment for Node / Vitest ──────────────────────

class MockDOMElement {
  public id: string = '';
  public tagName: string = 'DIV';
  public className: string = '';
  public textContent: string = '';
  public value: string = '';
  public checked: boolean = false;
  public style: Record<string, string> = {};
  public children: MockDOMElement[] = [];
  public parentElement: MockDOMElement | null = null;
  private _attributes: Map<string, string> = new Map();
  private _innerHTML: string = '';
  public eventListeners: Record<string, ((e: any) => void)[]> = {};

  public classList = {
    _classes: new Set<string>(),
    add: (...cls: string[]): void => cls.forEach((c) => this.classList._classes.add(c)),
    remove: (...cls: string[]): void => cls.forEach((c) => this.classList._classes.delete(c)),
    contains: (c: string): boolean => this.classList._classes.has(c),
  };

  constructor(tagName: string = 'div') {
    this.tagName = tagName.toUpperCase();
  }

  public getAttribute(name: string): string | null {
    return this._attributes.get(name) ?? null;
  }

  public setAttribute(name: string, value: string): void {
    this._attributes.set(name, value);
    if (name === 'id') this.id = value;
  }

  public removeAttribute(name: string): void {
    this._attributes.delete(name);
  }

  public get innerHTML(): string {
    return this._innerHTML;
  }

  public set innerHTML(html: string) {
    this._innerHTML = html;
    this.children = [];

    // Simple parser to extract elements with id
    const idRegex = /<([a-zA-Z0-9-]+)[^>]*id="([^"]+)"[^>]*>/g;
    let match: RegExpExecArray | null;
    while ((match = idRegex.exec(html)) !== null) {
      const el = new MockDOMElement(match[1]);
      el.id = match[2];
      el.parentElement = this;
      this.children.push(el);
    }
  }

  public appendChild(child: MockDOMElement): MockDOMElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  public removeChild(child: MockDOMElement): MockDOMElement {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentElement = null;
    }
    return child;
  }

  public remove(): void {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }

  public addEventListener(event: string, handler: (e: any) => void): void {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(handler);
  }

  public removeEventListener(event: string, handler: (e: any) => void): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter((h) => h !== handler);
    }
  }

  public dispatchEvent(event: { type: string }): boolean {
    const list = this.eventListeners[event.type] || [];
    for (const h of list) h(event);
    return true;
  }

  public querySelector(selector: string): MockDOMElement | null {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  public querySelectorAll(selector: string): MockDOMElement[] {
    const results: MockDOMElement[] = [];
    const traverse = (node: MockDOMElement): void => {
      if (selector.startsWith('#')) {
        const idTarget = selector.slice(1);
        if (node.id === idTarget) results.push(node);
      } else if (selector.startsWith('.')) {
        const classTarget = selector.slice(1);
        if (node.className.includes(classTarget) || node.classList.contains(classTarget)) {
          results.push(node);
        }
      }
      for (const child of node.children) {
        traverse(child);
      }
    };
    for (const child of this.children) {
      traverse(child);
    }
    return results;
  }

  public focus(): void {}
}

class MockDocument {
  public body = new MockDOMElement('body');
  public documentElement = new MockDOMElement('html');

  public createElement(tag: string): MockDOMElement {
    return new MockDOMElement(tag);
  }

  public getElementById(id: string): MockDOMElement | null {
    const search = (node: MockDOMElement): MockDOMElement | null => {
      if (node.id === id) return node;
      for (const child of node.children) {
        const found = search(child);
        if (found) return found;
      }
      return null;
    };
    return search(this.body);
  }

  public querySelector(selector: string): MockDOMElement | null {
    return this.body.querySelector(selector);
  }

  public querySelectorAll(selector: string): MockDOMElement[] {
    return this.body.querySelectorAll(selector);
  }
}

class MockKeyboardEvent {
  public type: string;
  public key: string;
  public target: unknown = null;
  public defaultPrevented: boolean = false;

  constructor(type: string, init?: { key?: string }) {
    this.type = type;
    this.key = init?.key || '';
  }

  public preventDefault(): void {
    this.defaultPrevented = true;
  }
}

describe('Interactive Slide Deck & Course Presentation Engine', () => {
  let manager: SlideDeckManager;
  let mockDoc: MockDocument;
  let originalWindow: unknown;
  let originalDocument: unknown;
  let originalKeyboardEvent: unknown;

  beforeEach(() => {
    mockDoc = new MockDocument();
    originalWindow = (globalThis as unknown as { window?: unknown }).window;
    originalDocument = (globalThis as unknown as { document?: unknown }).document;
    originalKeyboardEvent = (globalThis as unknown as { KeyboardEvent?: unknown }).KeyboardEvent;

    const windowListeners: Record<string, ((e: any) => void)[]> = {};

    const mockWindow = {
      setInterval: (fn: () => void, ms: number) => setInterval(fn, ms),
      clearInterval: (id: any) => clearInterval(id),
      addEventListener: (type: string, handler: (e: any) => void) => {
        if (!windowListeners[type]) windowListeners[type] = [];
        windowListeners[type].push(handler);
      },
      removeEventListener: (type: string, handler: (e: any) => void) => {
        if (windowListeners[type]) {
          windowListeners[type] = windowListeners[type].filter((h) => h !== handler);
        }
      },
      slideDeckManager: null as unknown as SlideDeckManager,
      document: mockDoc,
    };

    Object.defineProperty(globalThis, 'window', {
      value: mockWindow,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: mockDoc,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'KeyboardEvent', {
      value: MockKeyboardEvent,
      configurable: true,
      writable: true,
    });

    manager = new SlideDeckManager();
    mockWindow.slideDeckManager = manager;
  });

  afterEach(() => {
    if (manager) {
      manager.exitPresentation();
    }
    if (originalWindow !== undefined) {
      Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true, writable: true });
    } else {
      delete (globalThis as any).window;
    }
    if (originalDocument !== undefined) {
      Object.defineProperty(globalThis, 'document', { value: originalDocument, configurable: true, writable: true });
    } else {
      delete (globalThis as any).document;
    }
    if (originalKeyboardEvent !== undefined) {
      Object.defineProperty(globalThis, 'KeyboardEvent', { value: originalKeyboardEvent, configurable: true, writable: true });
    } else {
      delete (globalThis as any).KeyboardEvent;
    }
    vi.restoreAllMocks();
  });

  // ─── 1. Content Parsing Engine ──────────────────────────────────────────────
  describe('1. parsePostAsSlides Content Parser', () => {
    it('should return a fallback slide when content is empty or whitespace', () => {
      const slidesEmpty = manager.parsePostAsSlides('');
      expect(slidesEmpty.length).toBe(1);
      expect(slidesEmpty[0].title).toBe('Aetheris Presentation');
      expect(slidesEmpty[0].content).toContain('No content');

      const slidesCustomFallback = manager.parsePostAsSlides('   ', 'Custom Title');
      expect(slidesCustomFallback.length).toBe(1);
      expect(slidesCustomFallback[0].title).toBe('Custom Title');
      expect(slidesCustomFallback[0].notes).toContain('placeholder');
    });

    it('should split slides using horizontal rule dividers (---, ***, ===)', () => {
      const markdown = `
# Slide 1: Introduction
Introductory content for the first slide.
---
# Slide 2: Architecture
Technical architecture content.
***
# Slide 3: Conclusions
Final conclusions and next steps.
      `;

      const slides = manager.parsePostAsSlides(markdown);
      expect(slides.length).toBe(3);
      expect(slides[0].title).toBe('Slide 1: Introduction');
      expect(slides[0].content).toContain('Introductory content');
      expect(slides[1].title).toBe('Slide 2: Architecture');
      expect(slides[1].content).toContain('Technical architecture');
      expect(slides[2].title).toBe('Slide 3: Conclusions');
      expect(slides[2].content).toContain('Final conclusions');
    });

    it('should split slides by markdown headings when no divider is present', () => {
      const markdown = `
# Zero-Knowledge Introduction
Details about ZK circuits.
## The RLN Protocol
Rate-limiting nullifiers for anti-spam.
### Conclusions & Benchmark
Performance results.
      `;

      const slides = manager.parsePostAsSlides(markdown);
      expect(slides.length).toBe(3);
      expect(slides[0].title).toBe('Zero-Knowledge Introduction');
      expect(slides[1].title).toBe('The RLN Protocol');
      expect(slides[2].title).toBe('Conclusions & Benchmark');
    });

    it('should split long plain text into pairs of paragraphs when no headings or dividers exist', () => {
      const p1 = 'A'.repeat(300);
      const p2 = 'B'.repeat(300);
      const p3 = 'C'.repeat(300);
      const p4 = 'D'.repeat(300);
      const longText = `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;

      const slides = manager.parsePostAsSlides(longText, 'Long Post');
      expect(slides.length).toBe(2);
      expect(slides[0].title).toBe('Long Post');
      expect(slides[1].title).toBe('Slide 2: Architectural Synthesis');
    });

    it('should extract code blocks and syntax language from slides', () => {
      const markdown = `
# Slide with Circom Code
Here is the main circuit:
\`\`\`solidity
contract AetherisZK {
    function verifyProof() public view returns (bool) {
        return true;
    }
}
\`\`\`
      `;

      const slides = manager.parsePostAsSlides(markdown);
      expect(slides.length).toBe(1);
      expect(slides[0].codeLanguage).toBe('solidity');
      expect(slides[0].code).toContain('contract AetherisZK');
      expect(slides[0].content).not.toContain('```solidity');
    });

    it('should extract speaker notes from HTML comments and inline prefixes', () => {
      const markdown1 = `
# Slide Note Comment
Visible content on screen.
<!-- note: Emphasize the importance of post-quantum security -->
      `;
      const slides1 = manager.parsePostAsSlides(markdown1);
      expect(slides1[0].notes).toBe('Emphasize the importance of post-quantum security');
      expect(slides1[0].content).not.toContain('<!-- note:');

      const markdown2 = `
# Slide Note Text
Presented content.
Speaker Note: Do not forget to mention transactions per second.
      `;
      const slides2 = manager.parsePostAsSlides(markdown2);
      expect(slides2[0].notes).toBe('Do not forget to mention transactions per second.');
      expect(slides2[0].content).not.toContain('Speaker Note:');
    });

    it('should clean bold formatting and numeric prefixes from slide titles', () => {
      const markdown = `
**Security Architecture**
Security slide content.
---
# 1. P2P Mesh Structure
Mesh content.
      `;

      const slides = manager.parsePostAsSlides(markdown);
      expect(slides.length).toBe(2);
      expect(slides[0].title).toBe('Security Architecture');
      expect(slides[1].title).toBe('P2P Mesh Structure');
    });
  });

  // ─── 2. Markdown Slide Content Formatter ────────────────────────────────────
  describe('2. renderSlideMarkdown Formatter', () => {
    it('should render default message for empty markdown', () => {
      const html = renderSlideMarkdown('');
      expect(html).toContain('No additional content');
    });

    it('should render alert callouts with specific styles and icons', () => {
      const noteHtml = renderSlideMarkdown('> [!NOTE]\n> This is a note.');
      expect(noteHtml).toContain('IMPORTANT NOTE');
      expect(noteHtml).toContain('text-cyphr');

      const tipHtml = renderSlideMarkdown('> [!TIP]\n> Optimization tip.');
      expect(tipHtml).toContain('PRO TIP & PRACTICE');
      expect(tipHtml).toContain('text-signal');

      const importantHtml = renderSlideMarkdown('> [!IMPORTANT]\n> Crucial detail.');
      expect(importantHtml).toContain('AETHERIS INSIGHT');
      expect(importantHtml).toContain('text-aether');

      const warnHtml = renderSlideMarkdown('> [!WARNING]\n> Watch out for rate limiting.');
      expect(warnHtml).toContain('WARNING / CAUTION');
      expect(warnHtml).toContain('text-amber');

      const cautionHtml = renderSlideMarkdown('> [!CAUTION]\n> Critical security risk.');
      expect(cautionHtml).toContain('CRITICAL / RISK');
      expect(cautionHtml).toContain('text-crimson');

      const zkHtml = renderSlideMarkdown('> [!ZK]\n> ZK Groth16 Verification.');
      expect(zkHtml).toContain('ZERO-KNOWLEDGE VERIFIED');
    });

    it('should render unordered and ordered lists with custom bullet styles', () => {
      const listMd = `
- Punctul unu
* Punctul doi
• Punctul trei
1. Primul pas ordonat
2. Al doilea pas ordonat
      `;
      const html = renderSlideMarkdown(listMd);
      expect(html).toContain('<ul class="my-4 space-y-3 pl-1">');
      expect(html).toContain('✦');
      expect(html).toContain('Punctul unu');
      expect(html).toContain('</ul>');
      expect(html).toContain('<ol class="my-4 space-y-3 pl-1">');
      expect(html).toContain('Primul pas ordonat');
      expect(html).toContain('</ol>');
    });

    it('should render markdown tables with headers and rows', () => {
      const tableMd = `
| Metodă | Latență |
| :--- | :--- |
| ZK Proof | 1.2ms |
| TreeKEM | 2.5ms |
      `;
      const html = renderSlideMarkdown(tableMd);
      expect(html).toContain('<table');
      expect(html).toContain('<thead');
      expect(html).toContain('Metodă');
      expect(html).toContain('ZK Proof');
      expect(html).toContain('1.2ms');
      expect(html).toContain('</table>');
    });

    it('should render inline formatting (bold, italic, code, tags, strikethrough)', () => {
      const md = 'Test **bold text**, *italic text*, ~~deleted~~, `const x = 1;`, și #security';
      const html = renderSlideMarkdown(md);
      expect(html).toContain('<strong class="font-bold text-white tracking-wide bg-white/5 px-1 py-0.5 rounded">bold text</strong>');
      expect(html).toContain('<em class="italic text-slate-300">italic text</em>');
      expect(html).toContain('<del class="line-through text-slate-500">deleted</del>');
      expect(html).toContain('<code class="px-2 py-0.5 rounded bg-surface-overlay text-cyphr font-mono text-base border border-white/10 shadow-inner font-semibold">const x = 1;</code>');
      expect(html).toContain('<span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-aether/20 text-aether border border-aether/30">#security</span>');
    });

    it('should render headings H2, H3, H4', () => {
      const md = `
## Heading 2 Test
### Heading 3 Test
#### Heading 4 Test
      `;
      const html = renderSlideMarkdown(md);
      expect(html).toContain('<h2');
      expect(html).toContain('Heading 2 Test');
      expect(html).toContain('<h3');
      expect(html).toContain('Heading 3 Test');
      expect(html).toContain('<h4');
      expect(html).toContain('Heading 4 Test');
    });
  });

  // ─── 3. Presentation Lifecycle & Navigation ────────────────────────────────
  describe('3. SlideDeck Navigation & Boundaries', () => {
    beforeEach(() => {
      const samplePost = `
# Slide 1
Primul slide.
---
# Slide 2
Al doilea slide.
---
# Slide 3
Al treilea slide.
      `;
      manager.startPresentation('post-100', samplePost, 'Curs Aetheris', 'Alice');
    });

    it('should initialize presentation state properly', () => {
      expect(manager.isPresenting).toBe(true);
      expect(manager.currentIndex).toBe(0);
      expect(manager.slides.length).toBe(3);
      expect(manager.currentPostMeta.postId).toBe('post-100');
      expect(manager.currentPostMeta.title).toBe('Curs Aetheris');
      expect(manager.currentPostMeta.author).toBe('Alice');
    });

    it('should navigate forward with goNext and respect upper boundary', () => {
      expect(manager.currentIndex).toBe(0);
      manager.goNext();
      expect(manager.currentIndex).toBe(1);
      manager.goNext();
      expect(manager.currentIndex).toBe(2);

      // Boundary check: cannot exceed last slide
      manager.goNext();
      expect(manager.currentIndex).toBe(2);
    });

    it('should navigate backward with goPrev and respect lower boundary', () => {
      manager.goToSlide(2);
      expect(manager.currentIndex).toBe(2);

      manager.goPrev();
      expect(manager.currentIndex).toBe(1);
      manager.goPrev();
      expect(manager.currentIndex).toBe(0);

      // Boundary check: cannot go below 0
      manager.goPrev();
      expect(manager.currentIndex).toBe(0);
    });

    it('should jump to specific slide index with goToSlide and ignore invalid indices', () => {
      manager.goToSlide(1);
      expect(manager.currentIndex).toBe(1);

      // Out of bounds - should remain unchanged
      manager.goToSlide(-5);
      expect(manager.currentIndex).toBe(1);

      manager.goToSlide(100);
      expect(manager.currentIndex).toBe(1);
    });

    it('should jump to first and last slide with firstSlide() and lastSlide()', () => {
      manager.lastSlide();
      expect(manager.currentIndex).toBe(2);

      manager.firstSlide();
      expect(manager.currentIndex).toBe(0);
    });

    it('should exit presentation and clean up state', () => {
      manager.exitPresentation();
      expect(manager.isPresenting).toBe(false);
      expect(manager.isAutoplayRunning).toBe(false);
    });
  });

  // ─── 4. Toggles, Autoplay, Themes & Stats ──────────────────────────────────
  describe('4. Settings, Autoplay, Themes & Presentation Metrics', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      const sample = `
# Slide 1
Text 1 cu notă.
<!-- note: Notă pentru prezentator -->
---
# Slide 2
\`\`\`typescript
const a = 10;
\`\`\`
      `;
      manager.startPresentation('post-200', sample, 'Stats Deck', 'Bob');
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should toggle and run autoplay correctly', () => {
      expect(manager.isAutoplayRunning).toBe(false);
      manager.toggleAutoplay();
      expect(manager.isAutoplayRunning).toBe(true);

      // Fast forward by configured autoplay delay (6s)
      vi.advanceTimersByTime(6000);
      expect(manager.currentIndex).toBe(1);

      // Next tick loops back to slide 0
      vi.advanceTimersByTime(6000);
      expect(manager.currentIndex).toBe(0);

      manager.toggleAutoplay();
      expect(manager.isAutoplayRunning).toBe(false);
    });

    it('should toggle speaker notes, thumbnails, and blackout mode', () => {
      expect(manager.config.showNotes).toBe(false);
      manager.toggleSpeakerNotes();
      expect(manager.config.showNotes).toBe(true);

      expect(manager.config.showThumbnails).toBe(true);
      manager.toggleThumbnails();
      expect(manager.config.showThumbnails).toBe(false);

      expect(manager.isBlackoutActive).toBe(false);
      manager.toggleBlackout();
      expect(manager.isBlackoutActive).toBe(true);
      manager.toggleBlackout();
      expect(manager.isBlackoutActive).toBe(false);
    });

    it('should switch presentation themes', () => {
      const themes: SlideTheme[] = ['cyphr', 'matrix', 'crimson', 'aether', 'obsidian'];
      for (const theme of themes) {
        manager.setTheme(theme);
        expect(manager.config.theme).toBe(theme);
      }
    });

    it('should adjust font size within boundaries (0.8 to 1.6)', () => {
      manager.config.fontSizeMultiplier = 1.0;

      manager.increaseFontSize();
      expect(manager.config.fontSizeMultiplier).toBe(1.1);

      manager.decreaseFontSize();
      expect(manager.config.fontSizeMultiplier).toBe(1.0);

      // Test upper bound
      manager.config.fontSizeMultiplier = 1.6;
      manager.increaseFontSize();
      expect(manager.config.fontSizeMultiplier).toBe(1.6);

      // Test lower bound
      manager.config.fontSizeMultiplier = 0.8;
      manager.decreaseFontSize();
      expect(manager.config.fontSizeMultiplier).toBe(0.8);
    });

    it('should calculate presentation stats accurately', () => {
      const stats = manager.getStats();
      expect(stats.totalSlides).toBe(2);
      expect(stats.currentIndex).toBe(0);
      expect(stats.progressPercent).toBe(50);
      expect(stats.hasCodeBlocks).toBe(1);
      expect(stats.hasSpeakerNotes).toBe(1);
      expect(stats.wordCount).toBeGreaterThan(0);
      expect(stats.estimatedTotalTimeMinutes).toBeGreaterThanOrEqual(1);
    });

    it('should format presentation timer and track elapsed seconds', () => {
      expect(manager.formatTime(0)).toBe('00:00');
      expect(manager.formatTime(65)).toBe('01:05');
      expect(manager.formatTime(3600)).toBe('60:00');

      vi.advanceTimersByTime(3000);
      expect(manager.presentationElapsedSec).toBe(3);

      manager.resetTimer();
      expect(manager.presentationElapsedSec).toBe(0);
    });
  });

  // ─── 5. Keyboard Navigation ────────────────────────────────────────────────
  describe('5. Keyboard Shortcuts Handling', () => {
    beforeEach(() => {
      const sample = '# Slide 1\n---\n# Slide 2\n---\n# Slide 3';
      manager.startPresentation('post-keys', sample, 'Keys Deck', 'Carol');
    });

    it('should respond to arrow keys, space, and letter shortcuts', () => {
      // ArrowRight goes next
      const eventRight = new MockKeyboardEvent('keydown', { key: 'ArrowRight' }) as unknown as KeyboardEvent;
      manager.handleKeyDown(eventRight);
      expect(manager.currentIndex).toBe(1);

      // Space goes next
      const eventSpace = new MockKeyboardEvent('keydown', { key: ' ' }) as unknown as KeyboardEvent;
      manager.handleKeyDown(eventSpace);
      expect(manager.currentIndex).toBe(2);

      // ArrowLeft goes prev
      const eventLeft = new MockKeyboardEvent('keydown', { key: 'ArrowLeft' }) as unknown as KeyboardEvent;
      manager.handleKeyDown(eventLeft);
      expect(manager.currentIndex).toBe(1);

      // Home and End
      const eventHome = new MockKeyboardEvent('keydown', { key: 'Home' }) as unknown as KeyboardEvent;
      manager.handleKeyDown(eventHome);
      expect(manager.currentIndex).toBe(0);

      const eventEnd = new MockKeyboardEvent('keydown', { key: 'End' }) as unknown as KeyboardEvent;
      manager.handleKeyDown(eventEnd);
      expect(manager.currentIndex).toBe(2);

      // Toggle notes (n)
      expect(manager.config.showNotes).toBe(false);
      manager.handleKeyDown(new MockKeyboardEvent('keydown', { key: 'n' }) as unknown as KeyboardEvent);
      expect(manager.config.showNotes).toBe(true);

      // Toggle blackout (b)
      expect(manager.isBlackoutActive).toBe(false);
      manager.handleKeyDown(new MockKeyboardEvent('keydown', { key: 'b' }) as unknown as KeyboardEvent);
      expect(manager.isBlackoutActive).toBe(true);
      manager.handleKeyDown(new MockKeyboardEvent('keydown', { key: 'b' }) as unknown as KeyboardEvent);
      expect(manager.isBlackoutActive).toBe(false);

      // Escape exits presentation
      manager.handleKeyDown(new MockKeyboardEvent('keydown', { key: 'Escape' }) as unknown as KeyboardEvent);
      expect(manager.isPresenting).toBe(false);
    });

    it('should ignore shortcuts when typing in inputs or textareas', () => {
      const inputElem = new MockDOMElement('input');
      const event = new MockKeyboardEvent('keydown', { key: 'ArrowRight' }) as unknown as KeyboardEvent;
      Object.defineProperty(event, 'target', { value: inputElem });

      manager.handleKeyDown(event);
      expect(manager.currentIndex).toBe(0);
    });

    it('should ignore shortcuts when isPresenting is false', () => {
      manager.isPresenting = false;
      const event = new MockKeyboardEvent('keydown', { key: 'ArrowRight' }) as unknown as KeyboardEvent;
      manager.handleKeyDown(event);
      expect(manager.currentIndex).toBe(0);
    });
  });

  // ─── 6. HTML Rendering Engine ──────────────────────────────────────────────
  describe('6. HTML Presentation Modal & Trigger Button Rendering', () => {
    it('should return empty string when not presenting', () => {
      manager.isPresenting = false;
      const html = manager.renderPresentationModal();
      expect(html).toBe('');
    });

    it('should render complete presentation modal with title, progress, and controls', () => {
      const sample = `
# Slide Aetheris 1
Conținut slide 1.
\`\`\`typescript
const val: number = 42;
\`\`\`
<!-- note: Notă prezentator test -->
      `;
      manager.startPresentation('post-render', sample, 'Curs Complet', 'Dave');
      manager.config.showNotes = true;
      manager.config.showThumbnails = true;

      const html = manager.renderPresentationModal();
      expect(html).toContain('aetheris-slide-deck-modal-stage');
      expect(html).toContain('Curs Complet');
      expect(html).toContain('Dave');
      expect(html).toContain('Slide Aetheris 1');
      expect(html).toContain('val:');
      expect(html).toContain('number');
      expect(html).toContain('42');
      expect(html).toContain('Notă prezentator test');
      expect(html).toContain('aetheris-slide-timer-value');
      expect(html).toContain('slide-copy-code-btn');
    });

    it('should render blackout overlay HTML when isBlackoutActive is true', () => {
      manager.startPresentation('post-blackout', '# Slide 1\nText');
      manager.isBlackoutActive = true;

      const html = manager.renderPresentationModal();
      expect(html).toContain('Blackout Mode');
      expect(html).toContain('bg-black');
    });

    it('should render feed trigger button with correct attributes and post ID', () => {
      const buttonHtml = manager.renderSlideDeckButton('post-xyz-99', '🎥 Open Slides');
      expect(buttonHtml).toContain('post-xyz-99');
      expect(buttonHtml).toContain('Open Slides');
      expect(buttonHtml).toContain('window.slideDeckManager.startPresentation');
      expect(buttonHtml).toContain('text-cyphr');
    });
  });

  // ─── 7. DOM Mounting and Singleton Export ──────────────────────────────────
  describe('7. DOM Lifecycle and Singleton Integration', () => {
    it('should mount modal to DOM, update, and clean up safely', () => {
      manager.startPresentation('dom-post', '# DOM Slide\nConținut DOM');
      const elem = mockDoc.getElementById(manager.MODAL_DOM_ID);
      expect(elem).not.toBeNull();

      manager.goNext();
      manager.updateModalDom();
      expect(mockDoc.getElementById(manager.MODAL_DOM_ID)).not.toBeNull();

      manager.exitPresentation();
      expect(mockDoc.getElementById(manager.MODAL_DOM_ID)).toBeNull();
    });

    it('should export a functional singleton instance', () => {
      expect(slideDeckManager).toBeDefined();
      expect(slideDeckManager instanceof SlideDeckManager).toBe(true);
    });
  });
});
