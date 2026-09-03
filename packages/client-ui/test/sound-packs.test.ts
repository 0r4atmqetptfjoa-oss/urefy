import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  soundPacks,
  ProceduralSoundPacksEngine,
  SoundThemeId,
  SoundEventId,
  SOUND_THEMES,
  HAPTIC_PATTERNS,
} from '../src/sound-packs.js';

// --- Mock Web Audio API & DOM Node Environment ---

interface OscillatorRecord {
  type: string;
  frequencies: number[];
}

class MockAudioParam {
  public value: number = 0;
  public records: number[] = [];

  public setValueAtTime(val: number, _time?: number): void {
    this.value = val;
    this.records.push(val);
  }

  public linearRampToValueAtTime(val: number, _time?: number): void {
    this.value = val;
    this.records.push(val);
  }

  public exponentialRampToValueAtTime(val: number, _time?: number): void {
    this.value = val;
    this.records.push(val);
  }
}

class MockGainNode {
  public gain = new MockAudioParam();
  public connect(_target?: unknown): void {}
  public disconnect(): void {}
}

class MockBiquadFilterNode {
  public type: string = 'lowpass';
  public frequency = new MockAudioParam();
  public Q = new MockAudioParam();
  public connect(_target?: unknown): void {}
  public disconnect(): void {}
}

class MockOscillatorNode {
  public type: string = 'sine';
  public frequency = new MockAudioParam();
  public connect(_target?: unknown): void {}
  public start(_time?: number): void {}
  public stop(_time?: number): void {}
}

class MockAudioContext {
  public state: string = 'running';
  public currentTime: number = 0;
  public destination = {};

  public createdOscillators: MockOscillatorNode[] = [];
  public createdGainNodes: MockGainNode[] = [];
  public createdFilters: MockBiquadFilterNode[] = [];

  public async resume(): Promise<void> {
    this.state = 'running';
  }

  public createGain(): MockGainNode {
    const g = new MockGainNode();
    this.createdGainNodes.push(g);
    return g;
  }

  public createBiquadFilter(): MockBiquadFilterNode {
    const f = new MockBiquadFilterNode();
    this.createdFilters.push(f);
    return f;
  }

  public createOscillator(): MockOscillatorNode {
    const osc = new MockOscillatorNode();
    this.createdOscillators.push(osc);
    return osc;
  }
}

class MockDOMElement {
  public id: string = '';
  public tagName: string = 'DIV';
  public className: string = '';
  public children: MockDOMElement[] = [];
  public parentElement: MockDOMElement | null = null;
  public onclick: ((e: unknown) => void) | null = null;
  public oninput: ((e: unknown) => void) | null = null;
  public value: string = '';
  private _attributes: Map<string, string> = new Map();
  private _innerHTML: string = '';
  private _listeners: Map<string, Array<(e: unknown) => void>> = new Map();

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

  public get innerHTML(): string {
    return this._innerHTML;
  }

  public set innerHTML(html: string) {
    this._innerHTML = html;
  }

  public get outerHTML(): string {
    return this._innerHTML;
  }

  public set outerHTML(html: string) {
    this._innerHTML = html;
  }

  public addEventListener(event: string, fn: (e: unknown) => void): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event)!.push(fn);
  }

  public dispatchEvent(event: { type: string; preventDefault?: () => void }): boolean {
    const handlers = this._listeners.get(event.type) || [];
    for (const h of handlers) {
      h(event);
    }
    return true;
  }

  public appendChild(child: MockDOMElement): MockDOMElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  public remove(): void {
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx !== -1) {
        this.parentElement.children.splice(idx, 1);
      }
    }
  }

  public querySelector(selector: string): MockDOMElement | null {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  public querySelectorAll(selector: string): MockDOMElement[] {
    const results: MockDOMElement[] = [];
    const traverse = (node: MockDOMElement): void => {
      if (selector.startsWith('#')) {
        const target = selector.slice(1);
        if (node.id === target) results.push(node);
      } else if (selector.startsWith('.')) {
        const target = selector.slice(1);
        if (node.className.includes(target)) results.push(node);
      } else if (selector.startsWith('[') && selector.endsWith(']')) {
        const attr = selector.slice(1, -1);
        if (node.getAttribute(attr) !== null) results.push(node);
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
}

class MockLocalStorage {
  private store: Map<string, string> = new Map();
  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  public removeItem(key: string): void {
    this.store.delete(key);
  }
  public clear(): void {
    this.store.clear();
  }
}

describe('Procedural Sound & Haptic Packs (Item 12)', () => {
  let mockAudioCtx: MockAudioContext;
  let mockStorage: MockLocalStorage;
  let vibrateSpy: ReturnType<typeof vi.fn>;
  let originalWindow: unknown;
  let originalNavigator: unknown;
  let originalLocalStorage: unknown;

  beforeEach(() => {
    mockAudioCtx = new MockAudioContext();
    mockStorage = new MockLocalStorage();
    vibrateSpy = vi.fn((_pattern: number | number[]) => true);

    originalWindow = (globalThis as unknown as { window?: unknown }).window;
    originalNavigator = (globalThis as unknown as { navigator?: unknown }).navigator;
    originalLocalStorage = (globalThis as unknown as { localStorage?: unknown }).localStorage;

    (globalThis as unknown as { localStorage: unknown }).localStorage = mockStorage;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: { vibrate: vibrateSpy },
        configurable: true,
        writable: true,
      });
    } catch {
      (globalThis as any).navigator.vibrate = vibrateSpy;
    }

    (globalThis as unknown as { window: unknown }).window = {
      AudioContext: vi.fn(() => mockAudioCtx),
      webkitAudioContext: vi.fn(() => mockAudioCtx),
      navigator: {
        vibrate: vibrateSpy,
      },
      localStorage: mockStorage,
    };
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    try {
      if (originalNavigator !== undefined) {
        Object.defineProperty(globalThis, 'navigator', {
          value: originalNavigator,
          configurable: true,
          writable: true,
        });
      }
    } catch {
      // ignore
    }
    (globalThis as unknown as { localStorage: unknown }).localStorage = originalLocalStorage;
    vi.restoreAllMocks();
  });

  describe('1. Theme Definitions & Initial State', () => {
    it('defines all 4 procedural sound themes correctly', () => {
      expect(SOUND_THEMES.CYBERPUNK_NEON).toBeDefined();
      expect(SOUND_THEMES.ACOUSTIC_ZEN).toBeDefined();
      expect(SOUND_THEMES.MINIMAL_HAPTIC).toBeDefined();
      expect(SOUND_THEMES.RETRO_8BIT).toBeDefined();

      expect(SOUND_THEMES.CYBERPUNK_NEON.badge).toBe('FM SYNTH');
      expect(SOUND_THEMES.ACOUSTIC_ZEN.badge).toBe('ORGANIC');
      expect(SOUND_THEMES.MINIMAL_HAPTIC.badge).toBe('TACTILE');
      expect(SOUND_THEMES.RETRO_8BIT.badge).toBe('CHIPTUNE');
    });

    it('initializes with default CYBERPUNK_NEON theme, volume 0.45, and haptics active', () => {
      const engine = new ProceduralSoundPacksEngine();
      expect(engine.currentTheme).toBe('CYBERPUNK_NEON');
      expect(engine.isEnabled).toBe(true);
      expect(engine.volume).toBe(0.45);
      expect(engine.isHapticsEnabled).toBe(true);
    });

    it('persists and reloads theme preferences from localStorage', () => {
      const engine1 = new ProceduralSoundPacksEngine();
      engine1.setTheme('ACOUSTIC_ZEN');
      engine1.setVolume(0.72);
      engine1.toggleHaptics(); // turn false

      // Instantiate second engine which should read saved settings
      const engine2 = new ProceduralSoundPacksEngine();
      expect(engine2.currentTheme).toBe('ACOUSTIC_ZEN');
      expect(engine2.volume).toBe(0.72);
      expect(engine2.isHapticsEnabled).toBe(false);
    });

    it('clamps volume accurately within [0.0, 1.0]', () => {
      const engine = new ProceduralSoundPacksEngine();
      engine.setVolume(1.8);
      expect(engine.volume).toBe(1.0);

      engine.setVolume(-0.5);
      expect(engine.volume).toBe(0.0);

      engine.setVolume(0.33);
      expect(engine.volume).toBe(0.33);
    });
  });

  describe('2. Sound Synthesis Frequency Generation across all 4 Packs', () => {
    const allEvents: SoundEventId[] = [
      'POST_UPVOTE',
      'POST_DOWNVOTE',
      'MESSAGE_SENT',
      'MESSAGE_RECEIVED',
      'MODAL_OPEN',
      'MODAL_CLOSE',
      'SWARM_COMPLETE',
    ];

    it('synthesizes all 7 events cleanly in CYBERPUNK_NEON with sawtooth and FM modulation', () => {
      const engine = new ProceduralSoundPacksEngine();
      engine.setTheme('CYBERPUNK_NEON');

      for (const event of allEvents) {
        mockAudioCtx.createdOscillators = [];
        engine.play(event);

        expect(mockAudioCtx.createdOscillators.length).toBeGreaterThan(0);
        // Cyberpunk theme uses sawtooth oscillators
        const hasSawtooth = mockAudioCtx.createdOscillators.some((osc) => osc.type === 'sawtooth');
        expect(hasSawtooth).toBe(true);
      }
    });

    it('synthesizes all 7 events cleanly in ACOUSTIC_ZEN with pure sine waves and harmonics', () => {
      const engine = new ProceduralSoundPacksEngine();
      engine.setTheme('ACOUSTIC_ZEN');

      for (const event of allEvents) {
        mockAudioCtx.createdOscillators = [];
        engine.play(event);

        expect(mockAudioCtx.createdOscillators.length).toBeGreaterThan(0);
        // Acoustic Zen exclusively uses sine waves for peaceful organic timbre
        const allSine = mockAudioCtx.createdOscillators.every((osc) => osc.type === 'sine');
        expect(allSine).toBe(true);
      }
    });

    it('synthesizes all 7 events in MINIMAL_HAPTIC with 45Hz sub-bass thump and micro-clicks', () => {
      const engine = new ProceduralSoundPacksEngine();
      engine.setTheme('MINIMAL_HAPTIC');

      // 1. POST_UPVOTE generates 45Hz sub thump
      mockAudioCtx.createdOscillators = [];
      engine.play('POST_UPVOTE');
      const hasSub45Hz = mockAudioCtx.createdOscillators.some((osc) =>
        osc.frequency.records.includes(45)
      );
      expect(hasSub45Hz).toBe(true);

      // 2. All other events execute without throwing
      for (const event of allEvents) {
        expect(() => engine.play(event)).not.toThrow();
      }
    });

    it('synthesizes all 7 events in RETRO_8BIT using dual square waves for chiptune style', () => {
      const engine = new ProceduralSoundPacksEngine();
      engine.setTheme('RETRO_8BIT');

      for (const event of allEvents) {
        mockAudioCtx.createdOscillators = [];
        engine.play(event);

        expect(mockAudioCtx.createdOscillators.length).toBeGreaterThan(0);
        // Retro 8-bit uses authentic square waves
        const allSquare = mockAudioCtx.createdOscillators.every((osc) => osc.type === 'square');
        expect(allSquare).toBe(true);
      }
    });

    it('verifies arcade level-up fanfare multi-note sequence on SWARM_COMPLETE in RETRO_8BIT', () => {
      const engine = new ProceduralSoundPacksEngine();
      engine.setTheme('RETRO_8BIT');

      mockAudioCtx.createdOscillators = [];
      engine.play('SWARM_COMPLETE');

      // Arcade level-up fanfare produces multiple note pairs (C5, E5, G5, C6)
      expect(mockAudioCtx.createdOscillators.length).toBeGreaterThanOrEqual(8);
    });

    it('supports direct convenience play methods', () => {
      const engine = new ProceduralSoundPacksEngine();
      expect(() => engine.playUpvote()).not.toThrow();
      expect(() => engine.playDownvote()).not.toThrow();
      expect(() => engine.playMessageSent()).not.toThrow();
      expect(() => engine.playMessageReceived()).not.toThrow();
      expect(() => engine.playModalOpen()).not.toThrow();
      expect(() => engine.playModalClose()).not.toThrow();
      expect(() => engine.playSwarmComplete()).not.toThrow();
    });

    it('respects isEnabled mute state by not triggering oscillators when muted', () => {
      const engine = new ProceduralSoundPacksEngine();
      engine.isEnabled = false;

      mockAudioCtx.createdOscillators = [];
      engine.play('POST_UPVOTE');
      expect(mockAudioCtx.createdOscillators.length).toBe(0);
    });
  });

  describe('3. Haptic Feedback Engine & Fallback Logic', () => {
    it('defines distinct haptic patterns according to specifications', () => {
      expect(HAPTIC_PATTERNS.POST_UPVOTE).toEqual([15]); // Upvote: [15] ms (light tap)
      expect(HAPTIC_PATTERNS.AWARD).toEqual([20, 30, 20]); // Award: [20, 30, 20] ms (double burst)
      expect(HAPTIC_PATTERNS.ERROR).toEqual([50, 50, 50]); // Error: [50, 50, 50] ms (warning pulse)
      expect(HAPTIC_PATTERNS.SWARM_COMPLETE).toEqual([30, 50, 30, 50, 60]);
    });

    it('invokes navigator.vibrate with the specified pattern when haptics are enabled', () => {
      const engine = new ProceduralSoundPacksEngine();
      const result = engine.triggerHaptic([15]);

      expect(vibrateSpy).toHaveBeenCalledWith([15]);
      expect(result).toBe(true);
    });

    it('triggers haptic patterns for predefined events via triggerEventHaptic()', () => {
      const engine = new ProceduralSoundPacksEngine();
      engine.triggerEventHaptic('POST_UPVOTE');
      expect(vibrateSpy).toHaveBeenCalledWith([15]);

      engine.triggerEventHaptic('AWARD');
      expect(vibrateSpy).toHaveBeenCalledWith([20, 30, 20]);

      engine.triggerEventHaptic('ERROR');
      expect(vibrateSpy).toHaveBeenCalledWith([50, 50, 50]);
    });

    it('does not vibrate when haptics are toggled off', () => {
      const engine = new ProceduralSoundPacksEngine();
      engine.isHapticsEnabled = false;

      vibrateSpy.mockClear();
      const result = engine.triggerHaptic([15]);
      expect(result).toBe(false);
      expect(vibrateSpy).not.toHaveBeenCalled();
    });

    it('falls back gracefully when navigator.vibrate is undefined without throwing', () => {
      // Remove navigator.vibrate
      try {
        Object.defineProperty(globalThis, 'navigator', {
          value: {},
          configurable: true,
          writable: true,
        });
      } catch {
        delete (globalThis as any).navigator.vibrate;
      }

      const engine = new ProceduralSoundPacksEngine();
      expect(() => {
        const res = engine.triggerHaptic([15]);
        expect(res).toBe(false);
      }).not.toThrow();
    });

    it('handles exceptions in navigator.vibrate gracefully', () => {
      const errFn = () => {
        throw new Error('Haptic hardware error');
      };
      try {
        Object.defineProperty(globalThis, 'navigator', {
          value: { vibrate: errFn },
          configurable: true,
          writable: true,
        });
      } catch {
        (globalThis as any).navigator.vibrate = errFn;
      }

      const engine = new ProceduralSoundPacksEngine();
      expect(() => {
        const res = engine.triggerHaptic([15]);
        expect(res).toBe(false);
      }).not.toThrow();
    });
  });

  describe('4. Theme Customizer Selector Widget UI', () => {
    it('renders the complete selector widget HTML with 4 theme cards and audition pad', () => {
      const engine = new ProceduralSoundPacksEngine();
      const html = engine.renderSoundPackSelector();

      expect(html).toContain('Acoustic & Sensory Sound Packs');
      expect(html).toContain('id="sound-pack-selector-widget"');
      expect(html).toContain('data-sound-theme="CYBERPUNK_NEON"');
      expect(html).toContain('data-sound-theme="ACOUSTIC_ZEN"');
      expect(html).toContain('data-sound-theme="MINIMAL_HAPTIC"');
      expect(html).toContain('data-sound-theme="RETRO_8BIT"');
      expect(html).toContain('id="sound-pack-volume-slider"');
      expect(html).toContain('id="sound-pack-btn-haptics"');
      expect(html).toContain('data-audition-event="POST_UPVOTE"');
      expect(html).toContain('data-audition-event="SWARM_COMPLETE"');
    });

    it('switches themes and triggers confirmation audio when a theme card is clicked', () => {
      const engine = new ProceduralSoundPacksEngine();
      const root = new MockDOMElement('div');
      const card = new MockDOMElement('button');
      card.setAttribute('data-sound-theme', 'RETRO_8BIT');
      root.appendChild(card);

      engine.bindUIEvents(root as unknown as HTMLElement);

      card.dispatchEvent({ type: 'click', preventDefault: () => {} });
      expect(engine.currentTheme).toBe('RETRO_8BIT');
    });

    it('toggles haptics state when haptic button is clicked', () => {
      const engine = new ProceduralSoundPacksEngine();
      expect(engine.isHapticsEnabled).toBe(true);

      const root = new MockDOMElement('div');
      const hapticsBtn = new MockDOMElement('button');
      hapticsBtn.id = 'sound-pack-btn-haptics';
      root.appendChild(hapticsBtn);

      engine.bindUIEvents(root as unknown as HTMLElement);

      hapticsBtn.dispatchEvent({ type: 'click', preventDefault: () => {} });
      expect(engine.isHapticsEnabled).toBe(false);
    });

    it('exports singleton soundPacks instance correctly', () => {
      expect(soundPacks).toBeDefined();
      expect(soundPacks).toBeInstanceOf(ProceduralSoundPacksEngine);
      expect(soundPacks.currentTheme).toBe('CYBERPUNK_NEON');
    });
  });
});
