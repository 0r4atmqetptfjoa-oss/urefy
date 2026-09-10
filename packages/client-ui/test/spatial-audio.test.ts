import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spatialAudio, SpatialAudioEngine, RoomAcousticType, SpatialParticipant } from '../src/spatial-audio.js';

// --- Lightweight Mock Environment for Web Audio API & DOM in Node.js ---
class MockAudioParam {
  public value: number = 0;

  public setValueAtTime(val: number, _time?: number): void {
    this.value = val;
  }

  public linearRampToValueAtTime(val: number, _time?: number): void {
    this.value = val;
  }

  public exponentialRampToValueAtTime(val: number, _time?: number): void {
    this.value = val;
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

class MockStereoPannerNode {
  public pan = new MockAudioParam();
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

  public async resume(): Promise<void> {
    this.state = 'running';
  }

  public createGain(): MockGainNode {
    return new MockGainNode();
  }

  public createBiquadFilter(): MockBiquadFilterNode {
    return new MockBiquadFilterNode();
  }

  public createStereoPanner(): MockStereoPannerNode {
    return new MockStereoPannerNode();
  }

  public createOscillator(): MockOscillatorNode {
    return new MockOscillatorNode();
  }
}

class MockDOMElement {
  public id: string = '';
  public tagName: string = 'DIV';
  public className: string = '';
  public style: Record<string, string> = {};
  public children: MockDOMElement[] = [];
  public parentElement: MockDOMElement | null = null;
  public onclick: ((e: unknown) => void) | null = null;
  public oninput: ((e: unknown) => void) | null = null;
  public onpointerdown: ((e: unknown) => void) | null = null;
  public textContent: string = '';
  private _attributes: Map<string, string> = new Map();
  private _innerHTML: string = '';
  private _listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  public addEventListener(type: string, listener: (...args: any[]) => void): void {
    const list = this._listeners.get(type) || [];
    list.push(listener);
    this._listeners.set(type, list);
    if (type === 'click') this.onclick = listener;
    if (type === 'input') this.oninput = listener;
    if (type === 'pointerdown') this.onpointerdown = listener;
  }

  public removeEventListener(type: string, listener: (...args: any[]) => void): void {
    const list = this._listeners.get(type);
    if (list) {
      this._listeners.set(type, list.filter(l => l !== listener));
    }
  }

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

  public get innerHTML(): string {
    return this._innerHTML;
  }

  public set innerHTML(html: string) {
    this._innerHTML = html;
    this.parseMockChildrenFromHTML(html);
  }

  public get outerHTML(): string {
    return this._innerHTML;
  }

  public set outerHTML(html: string) {
    this._innerHTML = html;
    this.parseMockChildrenFromHTML(html);
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

  public getBoundingClientRect(): { left: number; top: number; width: number; height: number; right: number; bottom: number } {
    return { left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400 };
  }

  public setPointerCapture(_id: number): void {}
  public releasePointerCapture(_id: number): void {}

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
      } else if (selector.startsWith('[') && selector.endsWith(']')) {
        const attrName = selector.slice(1, -1);
        if (node.getAttribute(attrName) !== null) {
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

  private parseMockChildrenFromHTML(html: string): void {
    this.children = [];

    // Extract elements with id="..."
    const idRegex = /<([a-zA-Z0-9-]+)[^>]*id="([^"]+)"[^>]*>/g;
    let match: RegExpExecArray | null;
    while ((match = idRegex.exec(html)) !== null) {
      const tag = match[1];
      const id = match[2];
      const el = new MockDOMElement(tag);
      el.id = id;
      el.parentElement = this;

      // Extract class
      const classMatch = match[0].match(/class="([^"]+)"/);
      if (classMatch) {
        el.className = classMatch[1];
        classMatch[1].split(/\s+/).forEach((c) => el.classList.add(c));
      }

      // Extract data-* attributes
      const dataAttrRegex = /(data-[a-zA-Z0-9-]+)="([^"]+)"/g;
      let dataMatch: RegExpExecArray | null;
      while ((dataMatch = dataAttrRegex.exec(match[0])) !== null) {
        el.setAttribute(dataMatch[1], dataMatch[2]);
      }

      this.children.push(el);
    }

    // Extract elements with room-preset-btn class
    const presetRegex = /<button[^>]*data-room-preset="([^"]+)"[^>]*>/g;
    while ((match = presetRegex.exec(html)) !== null) {
      const presetId = match[1];
      const el = new MockDOMElement('button');
      el.className = 'room-preset-btn';
      el.classList.add('room-preset-btn');
      el.setAttribute('data-room-preset', presetId);
      el.parentElement = this;
      this.children.push(el);
    }

    // Extract data-mute-fp, data-chirp-fp, data-remove-fp
    const actionBtnRegex = /<button[^>]*data-(chirp|mute|remove)-fp="([^"]+)"[^>]*>/g;
    while ((match = actionBtnRegex.exec(html)) !== null) {
      const actionType = match[1];
      const fp = match[2];
      const el = new MockDOMElement('button');
      el.setAttribute(`data-${actionType}-fp`, fp);
      el.parentElement = this;
      this.children.push(el);
    }
  }
}

class MockDocument {
  public body = new MockDOMElement('body');

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

  public querySelectorAll(selector: string): MockDOMElement[] {
    return this.body.querySelectorAll(selector);
  }
}

describe('UREfy — SpatialAudioEngine Unit Tests', () => {
  let mockDoc: MockDocument;
  let originalWindow: unknown;
  let originalDocument: unknown;

  beforeEach(() => {
    mockDoc = new MockDocument();
    originalWindow = (globalThis as unknown as { window?: unknown }).window;
    originalDocument = (globalThis as unknown as { document?: unknown }).document;

    // Install global mocks
    (globalThis as unknown as { document: MockDocument }).document = mockDoc;
    (globalThis as unknown as { window: unknown }).window = {
      AudioContext: MockAudioContext,
      webkitAudioContext: MockAudioContext,
      setInterval: (fn: () => void, ms: number) => setInterval(fn, ms),
      clearInterval: (id: NodeJS.Timeout) => clearInterval(id),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    (globalThis as unknown as { document: unknown }).document = originalDocument;
    vi.restoreAllMocks();
  });

  describe('1. Listener Initial Position & Bounds Clamping', () => {
    it('initializes listener position at coordinates (200, 200)', () => {
      const engine = new SpatialAudioEngine();
      expect(engine.myPosition).toEqual({ x: 200, y: 200 });
      expect(engine.myPosition.x).toBe(200);
      expect(engine.myPosition.y).toBe(200);
    });

    it('allows updating listener position and updates participant coordinates relative to listener', () => {
      const engine = new SpatialAudioEngine();
      engine.setMyPosition(180, 220);
      expect(engine.myPosition).toEqual({ x: 180, y: 220 });
    });

    it('clamps listener position within radar radius boundaries', () => {
      const engine = new SpatialAudioEngine();
      // Moving listener beyond radar boundary (radius is 175 - 18 = 157px max offset from center 200, 200)
      engine.setMyPosition(500, 500);
      const dx = engine.myPosition.x - 200;
      const dy = engine.myPosition.y - 200;
      const dist = Math.sqrt(dx * dx + dy * dy);
      expect(dist).toBeLessThanOrEqual(158);
    });

    it('resets grid positions to default symmetrical arrangement', () => {
      const engine = new SpatialAudioEngine();
      engine.setMyPosition(150, 150);
      expect(engine.myPosition).toEqual({ x: 150, y: 150 });

      engine.resetGridPositions();
      expect(engine.myPosition).toEqual({ x: 200, y: 200 });
      expect(engine.participants.length).toBeGreaterThan(0);
    });
  });

  describe('2. Participant Management (Add / Remove / Seed)', () => {
    it('seeds 4 initial sovereign participants on instantiation', () => {
      const engine = new SpatialAudioEngine();
      expect(engine.participants.length).toBe(4);
      expect(engine.participants[0].fingerprint).toBe('0x8F3A...4C91');
      expect(engine.participants[0].role).toBe('ARCHON');
      expect(engine.participants[1].role).toBe('SENTINEL');
      expect(engine.participants[2].role).toBe('SCRIBE');
      expect(engine.participants[3].role).toBe('OPERATIVE');
    });

    it('adds a new participant with specified displayName and role', () => {
      const engine = new SpatialAudioEngine();
      const initialCount = engine.participants.length;

      const newParticipant: SpatialParticipant = engine.addParticipant({
        displayName: 'Node-Test',
        role: 'SENTINEL',
      });

      expect(newParticipant).toBeDefined();
      expect(newParticipant.displayName).toBe('Node-Test');
      expect(newParticipant.role).toBe('SENTINEL');
      expect(newParticipant.fingerprint).toMatch(/^0x/);
      expect(newParticipant.isMuted).toBe(false);
      expect(newParticipant.isSpeaking).toBe(false);
      expect(engine.participants.length).toBe(initialCount + 1);
      expect(engine.participants).toContain(newParticipant);
    });

    it('removes an existing participant by cryptographic fingerprint', () => {
      const engine = new SpatialAudioEngine();
      const p = engine.addParticipant({ displayName: 'Ephemeral-Peer', role: 'GUEST' });
      expect(engine.participants.some((item) => item.fingerprint === p.fingerprint)).toBe(true);

      engine.removeParticipant(p.fingerprint);
      expect(engine.participants.some((item) => item.fingerprint === p.fingerprint)).toBe(false);
    });

    it('handles removing non-existent participant gracefully without errors', () => {
      const engine = new SpatialAudioEngine();
      const initialCount = engine.participants.length;
      expect(() => engine.removeParticipant('0xNON_EXISTENT')).not.toThrow();
      expect(engine.participants.length).toBe(initialCount);
    });
  });

  describe('3. Stereophonic Panning & Spatial Acoustic Calculations', () => {
    it('calculates negative pan (left channel) when X < listener X (200)', () => {
      const engine = new SpatialAudioEngine();
      // Listener at (200, 200), participant at X = 120 (< 200)
      const metrics = engine.calculateSpatialMetrics(120, 200);

      expect(metrics.pan).toBeLessThan(0);
      expect(metrics.pan).toBeGreaterThanOrEqual(-1.0);
      // Relative dx = -80, panRange = 175 * 0.85 = 148.75 -> pan ~ -0.54
      expect(metrics.pan).toBeCloseTo(-0.54, 1);
    });

    it('calculates positive pan (right channel) when X > listener X (200)', () => {
      const engine = new SpatialAudioEngine();
      // Listener at (200, 200), participant at X = 280 (> 200)
      const metrics = engine.calculateSpatialMetrics(280, 200);

      expect(metrics.pan).toBeGreaterThan(0);
      expect(metrics.pan).toBeLessThanOrEqual(1.0);
      // Relative dx = +80, panRange ~ 148.75 -> pan ~ +0.54
      expect(metrics.pan).toBeCloseTo(0.54, 1);
    });

    it('calculates center pan (0.0) when X == listener X (200)', () => {
      const engine = new SpatialAudioEngine();
      const metrics = engine.calculateSpatialMetrics(200, 150);
      expect(metrics.pan).toBe(0);
    });

    it('clamps panning strictly between -1.0 and +1.0 for far coordinates', () => {
      const engine = new SpatialAudioEngine();
      const farLeft = engine.calculateSpatialMetrics(-500, 200);
      expect(farLeft.pan).toBe(-1.0);

      const farRight = engine.calculateSpatialMetrics(900, 200);
      expect(farRight.pan).toBe(1.0);
    });

    it('calculates distance rolloff and inverse-distance acoustic gain', () => {
      const engine = new SpatialAudioEngine();
      const closeMetrics = engine.calculateSpatialMetrics(200, 210); // 10px away
      const farMetrics = engine.calculateSpatialMetrics(200, 390);   // 190px away

      expect(closeMetrics.distance).toBe(10);
      expect(farMetrics.distance).toBe(190);
      expect(closeMetrics.gain).toBeGreaterThan(farMetrics.gain);
      expect(closeMetrics.gain).toBeLessThanOrEqual(1.0);
      expect(farMetrics.gain).toBeGreaterThanOrEqual(0.02);
    });

    it('computes azimuth angles and human-readable clock positions', () => {
      const engine = new SpatialAudioEngine();
      // Directly in front (North / Y < 200)
      const north = engine.calculateSpatialMetrics(200, 100);
      expect(north.angleDeg).toBe(0);
      expect(north.clockPos).toBe("12 o'clock");

      // Directly to the right (East / X > 200)
      const east = engine.calculateSpatialMetrics(300, 200);
      expect(east.angleDeg).toBe(90);
      expect(east.clockPos).toBe("3 o'clock");

      // Directly behind (South / Y > 200)
      const south = engine.calculateSpatialMetrics(200, 300);
      expect(south.angleDeg).toBe(180);
      expect(south.clockPos).toBe("6 o'clock");

      // Directly to the left (West / X < 200)
      const west = engine.calculateSpatialMetrics(100, 200);
      expect(west.angleDeg).toBe(270);
      expect(west.clockPos).toBe("9 o'clock");
    });
  });

  describe('4. Participant Mute & Unmute Operations', () => {
    it('toggles participant mute state correctly with toggleParticipantMute(fp)', () => {
      const engine = new SpatialAudioEngine();
      const p = engine.participants[0];
      const fp = p.fingerprint;

      expect(p.isMuted).toBe(false);

      // First toggle: Mute
      engine.toggleParticipantMute(fp);
      expect(p.isMuted).toBe(true);

      // Second toggle: Unmute
      engine.toggleParticipantMute(fp);
      expect(p.isMuted).toBe(false);
    });

    it('handles toggleParticipantMute on non-existent fingerprint without throwing', () => {
      const engine = new SpatialAudioEngine();
      expect(() => engine.toggleParticipantMute('0xUNKNOWN_FP')).not.toThrow();
    });

    it('toggles self microphone mute with toggleSelfMute()', () => {
      const engine = new SpatialAudioEngine();
      expect(engine.isMicMuted).toBe(false);

      const muted = engine.toggleSelfMute();
      expect(muted).toBe(true);
      expect(engine.isMicMuted).toBe(true);

      const unmuted = engine.toggleSelfMute();
      expect(unmuted).toBe(false);
      expect(engine.isMicMuted).toBe(false);
    });

    it('toggles self deafen state with toggleSelfDeafen()', () => {
      const engine = new SpatialAudioEngine();
      expect(engine.isDeafened).toBe(false);

      const deafened = engine.toggleSelfDeafen();
      expect(deafened).toBe(true);
      expect(engine.isDeafened).toBe(true);

      const undeafened = engine.toggleSelfDeafen();
      expect(undeafened).toBe(false);
      expect(engine.isDeafened).toBe(false);
    });
  });

  describe('5. Modal Lifecycle: openModal(), closeModal(), and toggleModal()', () => {
    it('opens the modal, sets isOpen to true, and creates DOM elements in document.body', () => {
      const engine = new SpatialAudioEngine();
      expect(engine.isOpen).toBe(false);

      engine.openModal();
      expect(engine.isOpen).toBe(true);

      const container = mockDoc.getElementById('spatial-audio-container');
      expect(container).not.toBeNull();
      expect(mockDoc.body.children.length).toBeGreaterThan(0);
    });

    it('closes the modal, sets isOpen to false, and removes DOM elements', () => {
      const engine = new SpatialAudioEngine();
      engine.openModal();
      expect(engine.isOpen).toBe(true);

      engine.closeModal();
      expect(engine.isOpen).toBe(false);

      const container = mockDoc.getElementById('spatial-audio-container');
      expect(container).toBeNull();
    });

    it('toggles modal visibility seamlessly with toggleModal()', () => {
      const engine = new SpatialAudioEngine();
      expect(engine.isOpen).toBe(false);

      engine.toggleModal();
      expect(engine.isOpen).toBe(true);

      engine.toggleModal();
      expect(engine.isOpen).toBe(false);
    });

    it('renders the complete HTML structure with radar SVG, listener node, and peer matrix', () => {
      const engine = new SpatialAudioEngine();
      const html = engine.renderSpatialModal();

      expect(html).toContain('VOICE LOUNGE · 2D SPATIAL GRID');
      expect(html).toContain('OPUS 48kHz BINAURAL');
      expect(html).toContain('id="spatial-radar-canvas"');
      expect(html).toContain('id="spatial-node-self"');
      expect(html).toContain('id="spatial-btn-self-mute"');
      expect(html).toContain('id="spatial-btn-self-deafen"');
      expect(html).toContain('id="spatial-master-volume"');
      expect(html).toContain('id="spatial-participant-list-hud"');
      expect(html).toContain('UREfy Spatial Audio v2.4');
    });
  });

  describe('6. Acoustic Room Environment Presets', () => {
    it('contains all 4 sovereign acoustic environment presets', () => {
      const engine = new SpatialAudioEngine();
      const presets = engine.roomPresets;

      expect(presets.intimate_studio).toBeDefined();
      expect(presets.cyphr_vault).toBeDefined();
      expect(presets.open_amphitheater).toBeDefined();
      expect(presets.anechoic_chamber).toBeDefined();

      expect(presets.intimate_studio.filterFrequency).toBe(18000);
      expect(presets.cyphr_vault.filterFrequency).toBe(14000);
      expect(presets.open_amphitheater.filterFrequency).toBe(8500);
      expect(presets.anechoic_chamber.filterFrequency).toBe(20000);
    });

    it('switches acoustic presets correctly via setRoomPreset()', () => {
      const engine = new SpatialAudioEngine();

      engine.setRoomPreset('intimate_studio');
      expect(engine.roomPreset).toBe('intimate_studio');

      engine.setRoomPreset('anechoic_chamber');
      expect(engine.roomPreset).toBe('anechoic_chamber');

      engine.setRoomPreset('open_amphitheater');
      expect(engine.roomPreset).toBe('open_amphitheater');

      engine.setRoomPreset('cyphr_vault');
      expect(engine.roomPreset).toBe('cyphr_vault');
    });

    it('ignores invalid room preset identifiers gracefully', () => {
      const engine = new SpatialAudioEngine();
      engine.setRoomPreset('cyphr_vault');

      // @ts-expect-error Testing invalid preset fallback
      engine.setRoomPreset('unknown_preset_xyz');
      expect(engine.roomPreset).toBe('cyphr_vault');
    });
  });

  describe('7. Master Hardware, DSP, Volume & Simulation Engine', () => {
    it('sets master volume clamped within [0.0, 1.0]', () => {
      const engine = new SpatialAudioEngine();
      engine.setMasterVolume(0.75);
      expect(engine.masterVolume).toBe(0.75);

      engine.setMasterVolume(1.5);
      expect(engine.masterVolume).toBe(1.0);

      engine.setMasterVolume(-0.5);
      expect(engine.masterVolume).toBe(0);
    });

    it('initializes Web Audio context and audio graph successfully', async () => {
      const engine = new SpatialAudioEngine();
      const initialized = await engine.initAudioContext();
      expect(initialized).toBe(true);
      engine.stopSpeakingSimulation();
    });

    it('starts and stops background speaking simulation cleanly', () => {
      const engine = new SpatialAudioEngine();
      expect(engine.isSimulationActive).toBe(false);

      engine.startSpeakingSimulation();
      expect(engine.isSimulationActive).toBe(true);

      // Calling start again does not create duplicate intervals
      engine.startSpeakingSimulation();
      expect(engine.isSimulationActive).toBe(true);

      engine.stopSpeakingSimulation();
      expect(engine.isSimulationActive).toBe(false);
    });

    it('plays spatial acoustic test chirp without errors', () => {
      const engine = new SpatialAudioEngine();
      expect(() => engine.playSpatialChirp(250, 180, 520)).not.toThrow();
      engine.stopSpeakingSimulation();
    });

    it('exports singleton spatialAudio instance correctly', () => {
      expect(spatialAudio).toBeDefined();
      expect(spatialAudio).toBeInstanceOf(SpatialAudioEngine);
      expect(spatialAudio.myPosition).toEqual({ x: 200, y: 200 });
      expect(spatialAudio.participants.length).toBeGreaterThanOrEqual(4);
    });
  });
});
