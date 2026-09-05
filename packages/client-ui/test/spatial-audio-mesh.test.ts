import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  spatialAudioMesh,
  SpatialAudioMeshEngine,
  Participant3D,
  Spatial3DMetrics,
} from '../src/spatial-audio-mesh.js';

// --- Mock Web Audio API & DOM Node Environment ---

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

class MockPannerNode {
  public panningModel: string = 'HRTF';
  public distanceModel: string = 'exponential';
  public refDistance: number = 1.0;
  public maxDistance: number = 100.0;
  public rolloffFactor: number = 1.0;
  public coneInnerAngle: number = 360;
  public coneOuterAngle: number = 360;
  public coneOuterGain: number = 0;

  public positionX = new MockAudioParam();
  public positionY = new MockAudioParam();
  public positionZ = new MockAudioParam();

  public setPosition(x: number, y: number, z: number): void {
    this.positionX.value = x;
    this.positionY.value = y;
    this.positionZ.value = z;
  }

  public connect(_target?: unknown): void {}
  public disconnect(): void {}
}

class MockAudioListener {
  public positionX = new MockAudioParam();
  public positionY = new MockAudioParam();
  public positionZ = new MockAudioParam();
  public forwardX = new MockAudioParam();
  public forwardY = new MockAudioParam();
  public forwardZ = new MockAudioParam();
  public upX = new MockAudioParam();
  public upY = new MockAudioParam();
  public upZ = new MockAudioParam();

  public setPosition(x: number, y: number, z: number): void {
    this.positionX.value = x;
    this.positionY.value = y;
    this.positionZ.value = z;
  }

  public setOrientation(fx: number, fy: number, fz: number, ux: number, uy: number, uz: number): void {
    this.forwardX.value = fx;
    this.forwardY.value = fy;
    this.forwardZ.value = fz;
    this.upX.value = ux;
    this.upY.value = uy;
    this.upZ.value = uz;
  }
}

class MockAnalyserNode {
  public fftSize: number = 256;
  public smoothingTimeConstant: number = 0.2;
  public mockData: Float32Array | null = null;

  public getFloatTimeDomainData(array: Float32Array): void {
    if (this.mockData) {
      array.set(this.mockData);
    } else {
      array.fill(0);
    }
  }

  public getByteTimeDomainData(array: Uint8Array): void {
    if (this.mockData) {
      for (let i = 0; i < array.length && i < this.mockData.length; i++) {
        array[i] = Math.round((this.mockData[i] + 1) * 127.5);
      }
    } else {
      array.fill(128);
    }
  }

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
  public listener = new MockAudioListener();

  public async resume(): Promise<void> {
    this.state = 'running';
  }

  public createGain(): MockGainNode {
    return new MockGainNode();
  }

  public createBiquadFilter(): MockBiquadFilterNode {
    return new MockBiquadFilterNode();
  }

  public createPanner(): MockPannerNode {
    return new MockPannerNode();
  }

  public createAnalyser(): MockAnalyserNode {
    return new MockAnalyserNode();
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
  public onwheel: ((e: unknown) => void) | null = null;
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
    if (type === 'wheel') this.onwheel = listener;
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
    this.parseElementsFromHTML(html);
  }

  public get outerHTML(): string {
    return this._innerHTML;
  }

  public set outerHTML(html: string) {
    this._innerHTML = html;
    this.parseElementsFromHTML(html);
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

  private parseElementsFromHTML(html: string): void {
    this.children = [];

    // Parse elements with id
    const idRegex = /<([a-zA-Z0-9-]+)[^>]*id="([^"]+)"[^>]*>/g;
    let match: RegExpExecArray | null;
    while ((match = idRegex.exec(html)) !== null) {
      const tag = match[1];
      const id = match[2];
      const el = new MockDOMElement(tag);
      el.id = id;
      el.parentElement = this;

      const classMatch = match[0].match(/class="([^"]+)"/);
      if (classMatch) {
        el.className = classMatch[1];
        classMatch[1].split(/\s+/).forEach((c) => el.classList.add(c));
      }

      this.children.push(el);
    }

    // Parse speaking-fluorescent-ring elements
    const ringRegex = /<div[^>]*class="([^"]*speaking-fluorescent-ring[^"]*)"[^>]*>/g;
    while ((match = ringRegex.exec(html)) !== null) {
      const el = new MockDOMElement('div');
      el.className = match[1];
      match[1].split(/\s+/).forEach((c) => el.classList.add(c));
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

describe('3D Spatial Audio Mesh Engine (Item 6)', () => {
  let mockDoc: MockDocument;
  let originalWindow: unknown;
  let originalDocument: unknown;

  beforeEach(() => {
    mockDoc = new MockDocument();
    originalWindow = (globalThis as unknown as { window?: unknown }).window;
    originalDocument = (globalThis as unknown as { document?: unknown }).document;

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

  describe('1. 3D Panner Position Mathematics & Distance Attenuation', () => {
    it('initializes room configuration with 40px/m scale and 1m reference distance', () => {
      const engine = new SpatialAudioMeshEngine();
      expect(engine.roomConfig.scalePixelsPerMeter).toBe(40);
      expect(engine.roomConfig.refDistance).toBe(1.0);
      expect(engine.roomConfig.rolloffFactor).toBe(1.0);
      expect(engine.listener.x).toBe(200);
      expect(engine.listener.y).toBe(200);
      expect(engine.listener.z).toBe(0);
    });

    it('calculates 3D Euclidean distance correctly incorporating X, Y, and Z elevation', () => {
      const engine = new SpatialAudioMeshEngine();
      // Listener at (200, 200, 0)
      // Participant at (240, 200, 0) -> dx = 40px = 1.0m
      const flat = engine.calculate3DMetrics(240, 200, 0);
      expect(flat.distancePixels).toBe(40);
      expect(flat.distanceMeters).toBe(1.0);

      // Participant at (200, 200, 40) -> dz = 40px = 1.0m elevation
      const elevated = engine.calculate3DMetrics(200, 200, 40);
      expect(elevated.distancePixels).toBe(40);
      expect(elevated.distanceMeters).toBe(1.0);
      expect(elevated.elevationDeg).toBe(90);

      // 3D diagonal: dx = 40, dy = 40, dz = 20
      // distancePixels = sqrt(1600 + 1600 + 400) = sqrt(3600) = 60px
      // 60px / 40 = 1.5m
      const diagonal = engine.calculate3DMetrics(240, 240, 20);
      expect(diagonal.distancePixels).toBe(60);
      expect(diagonal.distanceMeters).toBe(1.5);
    });

    it('computes exponential distance attenuation accurately based on Web Audio spec', () => {
      const engine = new SpatialAudioMeshEngine();

      // Within refDistance (<= 1.0m): gain is 1.0
      expect(engine.calculateDistanceAttenuation(0.5)).toBe(1.0);
      expect(engine.calculateDistanceAttenuation(1.0)).toBe(1.0);

      // At 2.0m with rolloff 1.0: gain = (2/1)^(-1) = 0.5
      expect(engine.calculateDistanceAttenuation(2.0)).toBeCloseTo(0.5, 3);

      // At 4.0m: gain = (4/1)^(-1) = 0.25
      expect(engine.calculateDistanceAttenuation(4.0)).toBeCloseTo(0.25, 3);

      // At 10.0m: gain = (10/1)^(-1) = 0.1
      expect(engine.calculateDistanceAttenuation(10.0)).toBeCloseTo(0.1, 3);
    });

    it('clamps attenuation at maxDistance boundary', () => {
      const engine = new SpatialAudioMeshEngine();
      const maxAtten = engine.calculateDistanceAttenuation(engine.roomConfig.maxDistance);
      const beyondAtten = engine.calculateDistanceAttenuation(100.0);

      expect(beyondAtten).toBe(maxAtten);
    });

    it('computes azimuth angles and clock positions in 3D audio space', () => {
      const engine = new SpatialAudioMeshEngine();

      // Directly North / Front (Y < 200)
      const north = engine.calculate3DMetrics(200, 120, 0);
      expect(north.azimuthDeg).toBe(0);
      expect(north.clockPos).toBe("12 o'clock");

      // Directly East / Right (X > 200)
      const east = engine.calculate3DMetrics(280, 200, 0);
      expect(east.azimuthDeg).toBe(90);
      expect(east.clockPos).toBe("3 o'clock");

      // Directly South / Rear (Y > 200)
      const south = engine.calculate3DMetrics(200, 280, 0);
      expect(south.azimuthDeg).toBe(180);
      expect(south.clockPos).toBe("6 o'clock");

      // Directly West / Left (X < 200)
      const west = engine.calculate3DMetrics(120, 200, 0);
      expect(west.azimuthDeg).toBe(270);
      expect(west.clockPos).toBe("9 o'clock");
    });
  });

  describe('2. Web Audio API HRTF PannerNode & AudioListener Integration', () => {
    it('configures per-participant PannerNode with HRTF and exponential distanceModel', async () => {
      const engine = new SpatialAudioMeshEngine();
      await engine.initAudioContext();

      const p = engine.participants[0];
      expect(p.pannerNode).toBeDefined();
      expect(p.pannerNode?.panningModel).toBe('HRTF');
      expect(p.pannerNode?.distanceModel).toBe('exponential');
      expect(p.pannerNode?.refDistance).toBe(1.0);
      expect(p.pannerNode?.rolloffFactor).toBe(1.0);

      engine.stopVADProcessingLoop();
    });

    it('updates AudioListener head position and yaw orientation vector', async () => {
      const engine = new SpatialAudioMeshEngine();
      await engine.initAudioContext();

      // Face East (yaw = 90°)
      engine.setListenerHeadOrientation(90);
      expect(engine.listener.yawDeg).toBe(90);

      const listener = engine.audioCtx?.listener as unknown as MockAudioListener;
      expect(listener).toBeDefined();
      // Forward vector for East (90 deg): forwardX ~ 1, forwardZ ~ 0
      expect(listener.forwardX.value).toBeCloseTo(1.0, 1);
      expect(listener.forwardZ.value).toBeCloseTo(0.0, 1);

      // Face North (yaw = 0°)
      engine.setListenerHeadOrientation(0);
      expect(listener.forwardX.value).toBeCloseTo(0.0, 1);
      expect(listener.forwardZ.value).toBeCloseTo(-1.0, 1);

      engine.stopVADProcessingLoop();
    });

    it('translates participant canvas coordinates into meters for PannerNode.setPosition', async () => {
      const engine = new SpatialAudioMeshEngine();
      await engine.initAudioContext();

      const p = engine.participants[0];
      // Move participant to (240, 200, 40)
      // relative to center (200, 200): dx = +40px (+1.0m), dz = 40px (+1.0m elevation), dy = 0px (0.0m)
      engine.updateParticipantPosition(p.id, 240, 200, 40);

      const panner = p.pannerNode as unknown as MockPannerNode;
      expect(panner.positionX.value).toBeCloseTo(1.0, 2); // X = +1.0m
      expect(panner.positionY.value).toBeCloseTo(1.0, 2); // Elevation Y = +1.0m
      expect(panner.positionZ.value).toBeCloseTo(0.0, 2); // Depth Z = 0.0m

      engine.stopVADProcessingLoop();
    });
  });

  describe('3. Voice Activity Detection (VAD) RMS Energy Threshold & Glow Rings', () => {
    it('calculates RMS energy correctly on Float32Array and Uint8Array buffers', () => {
      const engine = new SpatialAudioMeshEngine();

      // Silence: all zeros
      const silence = new Float32Array(256);
      expect(engine.calculateRMS(silence)).toBe(0);

      // Constant amplitude of 0.5: RMS = 0.5
      const constAudio = new Float32Array(256);
      constAudio.fill(0.5);
      expect(engine.calculateRMS(constAudio)).toBeCloseTo(0.5, 3);

      // Uint8Array: byte 128 is silence (normalized 0)
      const byteSilence = new Uint8Array(256);
      byteSilence.fill(128);
      expect(engine.calculateRMS(byteSilence)).toBe(0);

      // Uint8Array: byte 255 is ~1.0
      const byteLouder = new Uint8Array(256);
      byteLouder.fill(255);
      expect(engine.calculateRMS(byteLouder)).toBeCloseTo(0.99, 1);
    });

    it('detects voice activity when RMS exceeds vadThreshold and sets isSpeaking', async () => {
      const engine = new SpatialAudioMeshEngine();
      await engine.initAudioContext();

      const p = engine.participants[0];
      const analyser = p.analyserNode as unknown as MockAnalyserNode;
      expect(analyser).toBeDefined();

      // 1. Silent buffer below threshold (vadThreshold = 0.015)
      analyser.mockData = new Float32Array(256).fill(0.005);
      let res = engine.detectVoiceActivity(p.id);
      expect(res.isSpeaking).toBe(false);
      expect(res.rms).toBeCloseTo(0.005, 3);
      expect(p.isSpeaking).toBe(false);

      // 2. Active voice buffer above threshold
      analyser.mockData = new Float32Array(256).fill(0.08);
      res = engine.detectVoiceActivity(p.id);
      expect(res.isSpeaking).toBe(true);
      expect(res.rms).toBeCloseTo(0.08, 3);
      expect(p.isSpeaking).toBe(true);

      engine.stopVADProcessingLoop();
    });

    it('does not trigger VAD if participant is muted', async () => {
      const engine = new SpatialAudioMeshEngine();
      await engine.initAudioContext();

      const p = engine.participants[0];
      p.isMuted = true;

      const analyser = p.analyserNode as unknown as MockAnalyserNode;
      analyser.mockData = new Float32Array(256).fill(0.5); // very loud

      const res = engine.detectVoiceActivity(p.id);
      expect(res.isSpeaking).toBe(false);
      expect(res.rms).toBe(0);

      engine.stopVADProcessingLoop();
    });

    it('processes VAD across all participants via processAllVAD()', async () => {
      const engine = new SpatialAudioMeshEngine();
      await engine.initAudioContext();

      const map = engine.processAllVAD();
      expect(map.size).toBe(engine.participants.length);
      for (const p of engine.participants) {
        expect(map.has(p.id)).toBe(true);
      }

      engine.stopVADProcessingLoop();
    });
  });

  describe('4. Interactive Radar Coordinate Clamping & Drag Bounds', () => {
    it('clamps coordinates to stay strictly within radar perimeter circle', () => {
      const engine = new SpatialAudioMeshEngine();
      // Radar center: (200, 200), max radius: 175 - 16 = 159px
      const inside = engine.clampToRadarCircle(200, 250);
      expect(inside).toEqual({ x: 200, y: 250 });

      // Point far outside: (600, 600)
      const clamped = engine.clampToRadarCircle(600, 600);
      const dx = clamped.x - 200;
      const dy = clamped.y - 200;
      const dist = Math.sqrt(dx * dx + dy * dy);
      expect(dist).toBeLessThanOrEqual(160);
    });

    it('clamps listener position and updates AudioListener coordinates', () => {
      const engine = new SpatialAudioMeshEngine();
      engine.setListenerPosition(180, 210, 10);

      expect(engine.listener.x).toBe(180);
      expect(engine.listener.y).toBe(210);
      expect(engine.listener.z).toBe(10);
    });

    it('resets grid and listener to default arrangement via resetPositions()', () => {
      const engine = new SpatialAudioMeshEngine();
      engine.setListenerPosition(140, 140, 20);
      engine.resetPositions();

      expect(engine.listener.x).toBe(200);
      expect(engine.listener.y).toBe(200);
      expect(engine.listener.z).toBe(0);
      expect(engine.participants.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('5. Multi-Peer Participant Management (Add, Remove, Mute)', () => {
    it('adds a new participant with 3D elevation and assigns audio pipeline', () => {
      const engine = new SpatialAudioMeshEngine();
      const initialCount = engine.participants.length;

      const newPeer: Participant3D = engine.addParticipant({
        name: 'Cryptographic Operative',
        role: 'SENTINEL',
        z: 25,
      });

      expect(newPeer).toBeDefined();
      expect(newPeer.name).toBe('Cryptographic Operative');
      expect(newPeer.z).toBe(25);
      expect(engine.participants.length).toBe(initialCount + 1);
    });

    it('removes an existing participant by cryptographic ID cleanly', () => {
      const engine = new SpatialAudioMeshEngine();
      const p = engine.addParticipant({ name: 'Temporary Peer' });
      expect(engine.participants.some((item) => item.id === p.id)).toBe(true);

      engine.removeParticipant(p.id);
      expect(engine.participants.some((item) => item.id === p.id)).toBe(false);
    });

    it('toggles participant mute status correctly', () => {
      const engine = new SpatialAudioMeshEngine();
      const p = engine.participants[0];
      expect(p.isMuted).toBe(false);

      const muted = engine.toggleParticipantMute(p.id);
      expect(muted).toBe(true);
      expect(p.isMuted).toBe(true);

      const unmuted = engine.toggleParticipantMute(p.id);
      expect(unmuted).toBe(false);
      expect(p.isMuted).toBe(false);
    });

    it('toggles self microphone mute and self deafen states', () => {
      const engine = new SpatialAudioMeshEngine();
      expect(engine.isMicMuted).toBe(false);
      expect(engine.isDeafened).toBe(false);

      expect(engine.toggleSelfMute()).toBe(true);
      expect(engine.isMicMuted).toBe(true);

      expect(engine.toggleSelfDeafen()).toBe(true);
      expect(engine.isDeafened).toBe(true);
    });

    it('adjusts master volume clamped between 0.0 and 1.0', () => {
      const engine = new SpatialAudioMeshEngine();
      engine.setMasterVolume(0.7);
      expect(engine.masterVolume).toBe(0.7);

      engine.setMasterVolume(1.8);
      expect(engine.masterVolume).toBe(1.0);

      engine.setMasterVolume(-0.4);
      expect(engine.masterVolume).toBe(0.0);
    });
  });

  describe('6. HRTF 3D Spatial Chirp Playback & Modal Lifecycle', () => {
    it('plays spatial acoustic chirp at 3D target coordinates without throwing', () => {
      const engine = new SpatialAudioMeshEngine();
      expect(() => engine.playSpatialChirp({ x: 260, y: 160, z: 20 }, 520)).not.toThrow();
      engine.stopVADProcessingLoop();
    });

    it('opens and closes the modal lifecycle managing DOM container elements', () => {
      const engine = new SpatialAudioMeshEngine();
      expect(engine.isOpen).toBe(false);

      engine.openModal();
      expect(engine.isOpen).toBe(true);
      expect(mockDoc.getElementById('spatial-mesh-container')).not.toBeNull();

      engine.closeModal();
      expect(engine.isOpen).toBe(false);
      expect(mockDoc.getElementById('spatial-mesh-container')).toBeNull();
    });

    it('renders complete HTML with 3D Radar SVG, HRTF exponential badge, and peer matrix', () => {
      const engine = new SpatialAudioMeshEngine();
      const html = engine.renderSpatialMeshModal();

      expect(html).toContain('3D SPATIAL AUDIO MESH CHANNEL');
      expect(html).toContain('HRTF EXPONENTIAL 3D');
      expect(html).toContain('id="mesh-radar-canvas"');
      expect(html).toContain('id="mesh-node-self"');
      expect(html).toContain('id="mesh-master-volume"');
      expect(html).toContain('id="mesh-vad-threshold"');
    });

    it('exports singleton spatialAudioMesh instance correctly', () => {
      expect(spatialAudioMesh).toBeDefined();
      expect(spatialAudioMesh).toBeInstanceOf(SpatialAudioMeshEngine);
      expect(spatialAudioMesh.participants.length).toBeGreaterThanOrEqual(4);
    });
  });
});
