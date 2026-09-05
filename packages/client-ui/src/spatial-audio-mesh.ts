/**
 * AETHERIS HYBRID SUITE — 3D SPATIAL AUDIO MESH ENGINE (Item 6)
 *
 * Real-time 3D Binaural HRTF Audio Localization Engine for Multi-Peer Sovereign Channels.
 * Utilizes Web Audio API AudioContext, AudioListener (with orientation & position vectors),
 * per-participant PannerNode (panningModel: 'HRTF', distanceModel: 'exponential'),
 * AnalyserNode RMS Voice Activity Detection (VAD) with fluorescent speaking glow rings,
 * and an interactive Draggable Radar Canvas with 3D elevation controls.
 *
 * 100% Self-Contained, Strict TypeScript, Zero External HTTP Dependencies.
 */

import { createSafeAudioContext } from './dry-utils.js';

export interface Participant3D {
  id: string;
  name: string;
  role: string;
  x: number; // Room canvas coordinate X [0, 400]
  y: number; // Room canvas coordinate Y [0, 400] (Y represents forward/backward in room plane)
  z: number; // Elevation coordinate Z [-100, 100] (in canvas elevation units)
  isMuted: boolean;
  isSpeaking: boolean;
  rms: number;
  avatarColor: string;
  sourceNode?: AudioNode | null;
  pannerNode?: PannerNode | null;
  gainNode?: GainNode | null;
  analyserNode?: AnalyserNode | null;
  lastSpokeAt?: number;
  latencyMs?: number;
  audioFrequency?: number;
}

export interface ListenerCoordinates {
  x: number;
  y: number;
  z: number;
  yawDeg: number; // Head rotation angle: 0° = North, 90° = East, 180° = South, 270° = West
}

export interface Spatial3DMetrics {
  distanceMeters: number;
  distancePixels: number;
  attenuationGain: number;
  azimuthDeg: number;
  elevationDeg: number;
  clockPos: string;
  vector3D: { x: number; y: number; z: number };
}

export interface MeshRoomConfig {
  width: number;
  height: number;
  depth: number;
  scalePixelsPerMeter: number;
  refDistance: number;
  maxDistance: number;
  rolloffFactor: number;
}

export class SpatialAudioMeshEngine {
  public audioCtx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  public roomFilter: BiquadFilterNode | null = null;
  public participants: Participant3D[] = [];
  public listener: ListenerCoordinates = { x: 200, y: 200, z: 0, yawDeg: 0 };
  public vadThreshold: number = 0.015;
  public isMicMuted: boolean = false;
  public isDeafened: boolean = false;
  public masterVolume: number = 0.85;
  public isOpen: boolean = false;
  public activeDragTarget: string | null = null;
  public dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  public isVADLoopRunning: boolean = false;

  private vadIntervalId: number | null = null;
  public readonly radarRadius: number = 175;
  public readonly canvasCenter: { x: number; y: number } = { x: 200, y: 200 };

  public readonly roomConfig: MeshRoomConfig = {
    width: 400,
    height: 400,
    depth: 200,
    scalePixelsPerMeter: 40, // 40px = 1 meter. 400px = 10m room
    refDistance: 1.0,        // 1 meter reference distance
    maxDistance: 25.0,       // 25 meters max distance
    rolloffFactor: 1.0,      // Exponential rolloff factor
  };

  constructor() {
    this.seedDefaultParticipants();
  }

  /**
   * Seed cryptographic peer identities for initial 3D mesh voice lounge.
   */
  public seedDefaultParticipants(): void {
    this.participants = [
      {
        id: '0x8F3A...4C91',
        name: 'Kaelen (Relay Lead)',
        role: 'ARCHON',
        x: 120,
        y: 130,
        z: 15,
        isMuted: false,
        isSpeaking: false,
        rms: 0,
        avatarColor: '#00e5ff',
        latencyMs: 14,
        audioFrequency: 440,
      },
      {
        id: '0x1B9E...D420',
        name: 'Aria (Mesh Sentinel)',
        role: 'SENTINEL',
        x: 290,
        y: 140,
        z: 0,
        isMuted: false,
        isSpeaking: false,
        rms: 0,
        avatarColor: '#22c55e',
        latencyMs: 19,
        audioFrequency: 523,
      },
      {
        id: '0x7C11...990A',
        name: 'Vesper (ZK Scribe)',
        role: 'SCRIBE',
        x: 110,
        y: 270,
        z: -20,
        isMuted: false,
        isSpeaking: false,
        rms: 0,
        avatarColor: '#a855f7',
        latencyMs: 24,
        audioFrequency: 330,
      },
      {
        id: '0x4A22...E10B',
        name: 'Dante (P2P Archivist)',
        role: 'OPERATIVE',
        x: 280,
        y: 290,
        z: 35,
        isMuted: true,
        isSpeaking: false,
        rms: 0,
        avatarColor: '#f59e0b',
        latencyMs: 31,
        audioFrequency: 293,
      },
    ];
  }

  /**
   * Initialize Web Audio API AudioContext, AudioListener, and Room Output Bus.
   */
  public async initAudioContext(): Promise<boolean> {
    try {
      if (!this.audioCtx) {
        this.audioCtx = createSafeAudioContext();
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      if (this.audioCtx && !this.masterGain) {
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(
          this.isDeafened ? 0 : this.masterVolume,
          this.audioCtx.currentTime
        );

        this.roomFilter = this.audioCtx.createBiquadFilter();
        this.roomFilter.type = 'lowpass';
        this.roomFilter.frequency.setValueAtTime(16000, this.audioCtx.currentTime);
        this.roomFilter.Q.setValueAtTime(0.7, this.audioCtx.currentTime);

        this.roomFilter.connect(this.masterGain);
        this.masterGain.connect(this.audioCtx.destination);
      }

      // Update AudioListener 3D position and head orientation vectors
      this.syncAudioListener();

      // Configure PannerNode and AnalyserNode for each participant
      for (const p of this.participants) {
        this.setupParticipantAudioGraph(p);
      }

      this.startVADProcessingLoop();
      return true;
    } catch (err) {
      console.warn('[SpatialAudioMesh] AudioContext initialization deferred:', err);
      return false;
    }
  }

  /**
   * Synchronize Web Audio AudioListener position and head orientation in 3D space.
   * Coordinate convention:
   * - X: Left (-X) to Right (+X) in meters
   * - Y: Elevation Down (-Y) to Up (+Y) in meters
   * - Z: Front (-Z) to Rear (+Z) in meters
   */
  public syncAudioListener(): void {
    if (!this.audioCtx) return;
    const listener = this.audioCtx.listener;
    if (!listener) return;

    const xMeters = (this.listener.x - this.canvasCenter.x) / this.roomConfig.scalePixelsPerMeter;
    const yMeters = this.listener.z / this.roomConfig.scalePixelsPerMeter;
    const zMeters = (this.listener.y - this.canvasCenter.y) / this.roomConfig.scalePixelsPerMeter;

    // Set listener position (supporting modern AudioParam and legacy setPosition)
    if (listener.positionX && typeof listener.positionX.setValueAtTime === 'function') {
      const now = this.audioCtx.currentTime;
      listener.positionX.setValueAtTime(xMeters, now);
      listener.positionY.setValueAtTime(yMeters, now);
      listener.positionZ.setValueAtTime(zMeters, now);
    } else if (typeof listener.setPosition === 'function') {
      listener.setPosition(xMeters, yMeters, zMeters);
    }

    // Head yaw orientation vector calculation:
    // 0° = North (facing -Z)
    // 90° = East (facing +X)
    // 180° = South (facing +Z)
    // 270° = West (facing -X)
    const rad = (this.listener.yawDeg * Math.PI) / 180;
    const forwardX = Math.sin(rad);
    const forwardY = 0;
    const forwardZ = -Math.cos(rad);
    const upX = 0;
    const upY = 1;
    const upZ = 0;

    if (listener.forwardX && typeof listener.forwardX.setValueAtTime === 'function') {
      const now = this.audioCtx.currentTime;
      listener.forwardX.setValueAtTime(forwardX, now);
      listener.forwardY.setValueAtTime(forwardY, now);
      listener.forwardZ.setValueAtTime(forwardZ, now);
      listener.upX.setValueAtTime(upX, now);
      listener.upY.setValueAtTime(upY, now);
      listener.upZ.setValueAtTime(upZ, now);
    } else if (typeof listener.setOrientation === 'function') {
      listener.setOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ);
    }
  }

  /**
   * Set up PannerNode, GainNode, and AnalyserNode for a participant.
   */
  public setupParticipantAudioGraph(participant: Participant3D): void {
    if (!this.audioCtx || !this.roomFilter) return;

    try {
      // 1. GainNode
      if (!participant.gainNode) {
        participant.gainNode = this.audioCtx.createGain();
      }

      // 2. AnalyserNode for VAD
      if (!participant.analyserNode) {
        participant.analyserNode = this.audioCtx.createAnalyser();
        participant.analyserNode.fftSize = 256;
        participant.analyserNode.smoothingTimeConstant = 0.2;
      }

      // 3. 3D HRTF PannerNode
      if (!participant.pannerNode && typeof this.audioCtx.createPanner === 'function') {
        const panner = this.audioCtx.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'exponential';
        panner.refDistance = this.roomConfig.refDistance;
        panner.maxDistance = this.roomConfig.maxDistance;
        panner.rolloffFactor = this.roomConfig.rolloffFactor;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 360;
        panner.coneOuterGain = 0;
        participant.pannerNode = panner;
      }

      // Connect pipeline: source -> analyser -> gain -> panner -> roomFilter
      if (participant.analyserNode && participant.gainNode) {
        participant.analyserNode.connect(participant.gainNode);
      }

      if (participant.gainNode && participant.pannerNode) {
        participant.gainNode.connect(participant.pannerNode);
        participant.pannerNode.connect(this.roomFilter);
      } else if (participant.gainNode) {
        participant.gainNode.connect(this.roomFilter);
      }

      // Sync 3D PannerNode coordinates
      this.updatePannerNode3DPosition(participant);

      // Apply initial mute/volume gain
      const effectiveGain = this.isDeafened || participant.isMuted ? 0 : 1.0;
      participant.gainNode.gain.setValueAtTime(effectiveGain, this.audioCtx.currentTime);
    } catch (err) {
      console.warn(`[SpatialAudioMesh] Failed to setup audio graph for ${participant.id}:`, err);
    }
  }

  /**
   * Update PannerNode 3D position in meters relative to room coordinates.
   */
  public updatePannerNode3DPosition(participant: Participant3D): void {
    if (!participant.pannerNode) return;
    const panner = participant.pannerNode;

    const xMeters = (participant.x - this.canvasCenter.x) / this.roomConfig.scalePixelsPerMeter;
    const yMeters = participant.z / this.roomConfig.scalePixelsPerMeter;
    const zMeters = (participant.y - this.canvasCenter.y) / this.roomConfig.scalePixelsPerMeter;

    if (panner.positionX && typeof panner.positionX.setValueAtTime === 'function' && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      panner.positionX.setValueAtTime(xMeters, now);
      panner.positionY.setValueAtTime(yMeters, now);
      panner.positionZ.setValueAtTime(zMeters, now);
    } else if (typeof panner.setPosition === 'function') {
      panner.setPosition(xMeters, yMeters, zMeters);
    }
  }

  /**
   * Calculate 3D spatial metrics (distance, attenuation, azimuth, elevation, clock position)
   * relative to listener coordinates.
   */
  public calculate3DMetrics(x: number, y: number, z: number): Spatial3DMetrics {
    const dxPx = x - this.listener.x;
    const dyPx = y - this.listener.y;
    const dzPx = z - this.listener.z;

    const distancePixels = Math.sqrt(dxPx * dxPx + dyPx * dyPx + dzPx * dzPx);
    const distanceMeters = distancePixels / this.roomConfig.scalePixelsPerMeter;

    // Exponential distance attenuation formula:
    // gain = (distance / refDistance) ^ (-rolloffFactor)
    const attenuationGain = this.calculateDistanceAttenuation(distanceMeters);

    // Azimuth angle in plane (0° = North, 90° = East, 180° = South, 270° = West)
    let azimuthDeg = Math.round((Math.atan2(dyPx, dxPx) * (180 / Math.PI) + 90 + 360) % 360);

    // Elevation angle [-90° to +90°]
    const horizontalDistPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
    let elevationDeg = 0;
    if (horizontalDistPx > 0.001 || Math.abs(dzPx) > 0.001) {
      elevationDeg = Math.round(Math.atan2(dzPx, horizontalDistPx) * (180 / Math.PI));
    }

    // Human readable clock position
    const clockHour = Math.round(azimuthDeg / 30) % 12 || 12;
    const clockPos = `${clockHour} o'clock`;

    return {
      distanceMeters: Math.round(distanceMeters * 10) / 10,
      distancePixels: Math.round(distancePixels),
      attenuationGain: Math.round(attenuationGain * 1000) / 1000,
      azimuthDeg,
      elevationDeg,
      clockPos,
      vector3D: {
        x: Math.round((dxPx / this.roomConfig.scalePixelsPerMeter) * 100) / 100,
        y: Math.round((dzPx / this.roomConfig.scalePixelsPerMeter) * 100) / 100,
        z: Math.round((dyPx / this.roomConfig.scalePixelsPerMeter) * 100) / 100,
      },
    };
  }

  /**
   * Calculate Web Audio API exponential distance attenuation.
   */
  public calculateDistanceAttenuation(distanceMeters: number): number {
    const d = Math.max(0.0001, distanceMeters);
    if (d <= this.roomConfig.refDistance) {
      return 1.0;
    }
    const clampedD = Math.min(d, this.roomConfig.maxDistance);
    return Math.pow(clampedD / this.roomConfig.refDistance, -this.roomConfig.rolloffFactor);
  }

  /**
   * Root-Mean-Square (RMS) calculation for Voice Activity Detection (VAD).
   * Supports both Float32Array [-1.0, 1.0] and Uint8Array [0, 255].
   */
  public calculateRMS(data: Float32Array | Uint8Array): number {
    if (!data || data.length === 0) return 0;

    let sum = 0;
    if (data instanceof Float32Array) {
      for (let i = 0; i < data.length; i++) {
        const val = data[i];
        sum += val * val;
      }
      return Math.sqrt(sum / data.length);
    } else {
      for (let i = 0; i < data.length; i++) {
        const normalized = (data[i] - 128) / 128;
        sum += normalized * normalized;
      }
      return Math.sqrt(sum / data.length);
    }
  }

  /**
   * Perform Voice Activity Detection (VAD) on a single participant.
   */
  public detectVoiceActivity(participantId: string): { isSpeaking: boolean; rms: number } {
    const participant = this.participants.find((p) => p.id === participantId);
    if (!participant || participant.isMuted) {
      return { isSpeaking: false, rms: 0 };
    }

    let rms = 0;
    if (participant.analyserNode) {
      try {
        const buffer = new Float32Array(participant.analyserNode.fftSize);
        if (typeof participant.analyserNode.getFloatTimeDomainData === 'function') {
          participant.analyserNode.getFloatTimeDomainData(buffer);
          rms = this.calculateRMS(buffer);
        } else if (typeof participant.analyserNode.getByteTimeDomainData === 'function') {
          const byteBuffer = new Uint8Array(participant.analyserNode.fftSize);
          participant.analyserNode.getByteTimeDomainData(byteBuffer);
          rms = this.calculateRMS(byteBuffer);
        }
      } catch {
        rms = 0;
      }
    }

    const isSpeaking = rms >= this.vadThreshold;
    participant.rms = Math.round(rms * 1000) / 1000;
    participant.isSpeaking = isSpeaking;
    if (isSpeaking) {
      participant.lastSpokeAt = Date.now();
    }

    return { isSpeaking, rms: participant.rms };
  }

  /**
   * Process VAD for all active participants and return snapshot map.
   */
  public processAllVAD(): Map<string, { isSpeaking: boolean; rms: number }> {
    const results = new Map<string, { isSpeaking: boolean; rms: number }>();
    for (const p of this.participants) {
      const res = this.detectVoiceActivity(p.id);
      results.set(p.id, res);
    }
    return results;
  }

  /**
   * Start recurring VAD processing and DOM glow ring update loop.
   */
  public startVADProcessingLoop(): void {
    if (this.vadIntervalId !== null) return;
    this.isVADLoopRunning = true;

    this.vadIntervalId = window.setInterval(() => {
      if (!this.isOpen || !this.isVADLoopRunning) return;

      // Realistic peer activity simulation for demonstration when no physical mic is attached
      const randomIdx = Math.floor(Math.random() * (this.participants.length + 2));
      this.participants.forEach((p, idx) => {
        if (p.isMuted) {
          p.isSpeaking = false;
          p.rms = 0;
          return;
        }

        if (p.analyserNode) {
          this.detectVoiceActivity(p.id);
        } else {
          // Synthetic VAD simulation pulse
          if (idx === randomIdx && Math.random() > 0.4) {
            p.rms = Math.round((0.025 + Math.random() * 0.08) * 1000) / 1000;
            p.isSpeaking = p.rms >= this.vadThreshold;
            p.lastSpokeAt = Date.now();
          } else if (Math.random() > 0.65) {
            p.isSpeaking = false;
            p.rms = 0.002;
          }
        }
      });

      this.updateFluorescentGlowRingsDOM();
    }, 120);
  }

  /**
   * Stop VAD processing loop.
   */
  public stopVADProcessingLoop(): void {
    if (this.vadIntervalId !== null) {
      clearInterval(this.vadIntervalId);
      this.vadIntervalId = null;
    }
    this.isVADLoopRunning = false;
  }

  /**
   * Update participant fluorescent speaking glow rings in the DOM without re-rendering everything.
   */
  public updateFluorescentGlowRingsDOM(): void {
    if (!this.isOpen || typeof document === 'undefined') return;

    for (const p of this.participants) {
      const nodeEl = document.getElementById(`mesh-node-${p.id}`);
      if (nodeEl) {
        const ring = nodeEl.querySelector('.speaking-fluorescent-ring');
        if (ring) {
          if (p.isSpeaking && !p.isMuted) {
            ring.classList.remove('hidden', 'opacity-0');
            ring.classList.add('opacity-100', 'animate-pulse');
          } else {
            ring.classList.add('hidden', 'opacity-0');
            ring.classList.remove('opacity-100', 'animate-pulse');
          }
        }
      }

      // Update VU meter bar
      const vu = document.getElementById(`mesh-vu-${p.id}`);
      if (vu) {
        if (p.isSpeaking && !p.isMuted) {
          const pct = Math.min(100, Math.max(10, Math.round((p.rms / 0.1) * 100)));
          (vu as HTMLElement).style.width = `${pct}%`;
          vu.className = 'h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] transition-all duration-100';
        } else {
          (vu as HTMLElement).style.width = '4%';
          vu.className = 'h-1.5 rounded-full bg-slate-700 transition-all duration-200';
        }
      }
    }
  }

  /**
   * Update participant 3D coordinates (x, y, z) and recalculate PannerNode positioning.
   */
  public updateParticipantPosition(id: string, x: number, y: number, z?: number): void {
    const p = this.participants.find((item) => item.id === id);
    if (!p) return;

    const clamped = this.clampToRadarCircle(x, y);
    p.x = clamped.x;
    p.y = clamped.y;
    if (typeof z === 'number') {
      p.z = Math.max(-100, Math.min(100, z));
    }

    this.updatePannerNode3DPosition(p);
  }

  /**
   * Set listener (Self) position in 3D space.
   */
  public setListenerPosition(x: number, y: number, z?: number): void {
    const clamped = this.clampToRadarCircle(x, y);
    this.listener.x = clamped.x;
    this.listener.y = clamped.y;
    if (typeof z === 'number') {
      this.listener.z = Math.max(-100, Math.min(100, z));
    }

    this.syncAudioListener();

    // Re-sync all participants' relative audio panners
    for (const p of this.participants) {
      this.updatePannerNode3DPosition(p);
    }
  }

  /**
   * Set listener head orientation (yaw angle in degrees).
   */
  public setListenerHeadOrientation(yawDeg: number): void {
    this.listener.yawDeg = (yawDeg + 360) % 360;
    this.syncAudioListener();
  }

  /**
   * Clamp an (x, y) coordinate inside the radar boundary circle.
   */
  public clampToRadarCircle(x: number, y: number): { x: number; y: number } {
    const dx = x - this.canvasCenter.x;
    const dy = y - this.canvasCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = this.radarRadius - 16;

    if (dist <= maxR) {
      return { x: Math.round(x), y: Math.round(y) };
    }

    const ratio = maxR / dist;
    return {
      x: Math.round(this.canvasCenter.x + dx * ratio),
      y: Math.round(this.canvasCenter.y + dy * ratio),
    };
  }

  /**
   * Toggle participant mute status.
   */
  public toggleParticipantMute(id: string): boolean {
    const p = this.participants.find((item) => item.id === id);
    if (!p) return false;
    p.isMuted = !p.isMuted;

    if (p.gainNode && this.audioCtx) {
      const effectiveGain = this.isDeafened || p.isMuted ? 0 : 1.0;
      p.gainNode.gain.setValueAtTime(effectiveGain, this.audioCtx.currentTime);
    }
    return p.isMuted;
  }

  /**
   * Toggle Self Microphone Mute.
   */
  public toggleSelfMute(): boolean {
    this.isMicMuted = !this.isMicMuted;
    return this.isMicMuted;
  }

  /**
   * Toggle Self Deafen state (mutes all audio incoming to headphones).
   */
  public toggleSelfDeafen(): boolean {
    this.isDeafened = !this.isDeafened;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(
        this.isDeafened ? 0 : this.masterVolume,
        this.audioCtx.currentTime
      );
    }
    return this.isDeafened;
  }

  /**
   * Set Master Audio Volume [0.0 to 1.0].
   */
  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1.0, vol));
    if (this.masterGain && this.audioCtx && !this.isDeafened) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioCtx.currentTime);
    }
  }

  /**
   * Set Voice Activity Detection energy threshold.
   */
  public setVADThreshold(threshold: number): void {
    this.vadThreshold = Math.max(0.001, Math.min(0.2, threshold));
  }

  /**
   * Add a new participant to the 3D spatial mesh channel.
   */
  public addParticipant(p: Partial<Participant3D>): Participant3D {
    const newParticipant: Participant3D = {
      id: p.id || `0x${Math.random().toString(16).slice(2, 6).toUpperCase()}...${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
      name: p.name || 'Anonymous Peer',
      role: p.role || 'GUEST',
      x: p.x ?? Math.round(150 + Math.random() * 100),
      y: p.y ?? Math.round(150 + Math.random() * 100),
      z: p.z ?? Math.round(-20 + Math.random() * 40),
      isMuted: !!p.isMuted,
      isSpeaking: !!p.isSpeaking,
      rms: 0,
      avatarColor: p.avatarColor || '#00e5ff',
      latencyMs: p.latencyMs || Math.floor(12 + Math.random() * 25),
      audioFrequency: p.audioFrequency || 440,
    };

    this.participants.push(newParticipant);
    this.setupParticipantAudioGraph(newParticipant);
    return newParticipant;
  }

  /**
   * Remove a participant from the 3D mesh channel.
   */
  public removeParticipant(id: string): void {
    const idx = this.participants.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const [removed] = this.participants.splice(idx, 1);
      if (removed.gainNode) {
        try { removed.gainNode.disconnect(); } catch { /* ignore */ }
      }
      if (removed.pannerNode) {
        try { removed.pannerNode.disconnect(); } catch { /* ignore */ }
      }
      if (removed.analyserNode) {
        try { removed.analyserNode.disconnect(); } catch { /* ignore */ }
      }
    }
  }

  /**
   * Reset participant positions to standard symmetrical arrangement.
   */
  public resetPositions(): void {
    this.listener = { x: 200, y: 200, z: 0, yawDeg: 0 };
    this.syncAudioListener();

    const standardLayout = [
      { x: 120, y: 130, z: 15 },
      { x: 290, y: 140, z: 0 },
      { x: 110, y: 270, z: -20 },
      { x: 280, y: 290, z: 35 },
      { x: 200, y: 90, z: 10 },
      { x: 200, y: 310, z: -10 },
    ];

    this.participants.forEach((p, idx) => {
      const coord = standardLayout[idx % standardLayout.length];
      this.updateParticipantPosition(p.id, coord.x, coord.y, coord.z);
    });
  }

  /**
   * Play an HRTF 3D acoustic chirp localized at target coordinates to immediately
   * audition 3D spatial positioning in headphones.
   */
  public playSpatialChirp(target: string | { x: number; y: number; z: number }, freq: number = 440): void {
    if (!this.audioCtx) {
      this.initAudioContext().then(() => this.playSpatialChirp(target, freq));
      return;
    }

    try {
      let coords: { x: number; y: number; z: number };
      if (typeof target === 'string') {
        const p = this.participants.find((item) => item.id === target);
        if (!p) return;
        coords = { x: p.x, y: p.y, z: p.z };
      } else {
        coords = target;
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const chirpGain = this.audioCtx.createGain();

      let panner: PannerNode | null = null;
      if (typeof this.audioCtx.createPanner === 'function') {
        panner = this.audioCtx.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'exponential';
        panner.refDistance = this.roomConfig.refDistance;
        panner.maxDistance = this.roomConfig.maxDistance;
        panner.rolloffFactor = this.roomConfig.rolloffFactor;

        const xMeters = (coords.x - this.canvasCenter.x) / this.roomConfig.scalePixelsPerMeter;
        const yMeters = coords.z / this.roomConfig.scalePixelsPerMeter;
        const zMeters = (coords.y - this.canvasCenter.y) / this.roomConfig.scalePixelsPerMeter;

        if (panner.positionX && typeof panner.positionX.setValueAtTime === 'function') {
          panner.positionX.setValueAtTime(xMeters, now);
          panner.positionY.setValueAtTime(yMeters, now);
          panner.positionZ.setValueAtTime(zMeters, now);
        } else if (typeof panner.setPosition === 'function') {
          panner.setPosition(xMeters, yMeters, zMeters);
        }
      }

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.1);

      const targetGain = this.isDeafened ? 0 : this.masterVolume * 0.35;
      chirpGain.gain.setValueAtTime(0.0001, now);
      chirpGain.gain.linearRampToValueAtTime(targetGain, now + 0.015);
      chirpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      if (panner) {
        osc.connect(chirpGain);
        chirpGain.connect(panner);
        panner.connect(this.masterGain || this.audioCtx.destination);
      } else {
        osc.connect(chirpGain);
        chirpGain.connect(this.masterGain || this.audioCtx.destination);
      }

      osc.start(now);
      osc.stop(now + 0.26);
    } catch (err) {
      console.warn('[SpatialAudioMesh] Chirp synthesis error:', err);
    }
  }

  /**
   * Open the Spatial Audio Mesh Modal.
   */
  public openModal(): void {
    this.isOpen = true;
    this.initAudioContext();

    const existingOverlay = document.getElementById('spatial-mesh-modal-overlay');
    if (existingOverlay) {
      existingOverlay.outerHTML = this.renderSpatialMeshModal();
    } else {
      const container = document.createElement('div');
      container.id = 'spatial-mesh-container';
      container.innerHTML = this.renderSpatialMeshModal();
      document.body.appendChild(container);
    }

    this.attachEvents(document);
  }

  /**
   * Close the Spatial Audio Mesh Modal.
   */
  public closeModal(): void {
    this.isOpen = false;
    this.stopVADProcessingLoop();
    const overlay = document.getElementById('spatial-mesh-modal-overlay');
    if (overlay) {
      overlay.remove();
    }
    const container = document.getElementById('spatial-mesh-container');
    if (container) {
      container.remove();
    }
  }

  /**
   * Toggle Modal Visibility.
   */
  public toggleModal(): void {
    if (this.isOpen) {
      this.closeModal();
    } else {
      this.openModal();
    }
  }

  /**
   * Render the complete HTML modal markup for the 3D Spatial Audio Mesh Channel.
   */
  public renderSpatialMeshModal(): string {
    return `
      <div id="spatial-mesh-modal-overlay" class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
        <div class="relative w-full max-w-5xl bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans max-h-[94vh]">
          
          <!-- Modal Header -->
          <div class="px-6 py-4 bg-surface-raised border-subtle-b flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                🌐
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-base font-bold text-white tracking-wide">3D SPATIAL AUDIO MESH CHANNEL</h2>
                  <span class="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    HRTF EXPONENTIAL 3D
                  </span>
                  <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-white/5 text-slate-300 border border-white/10">
                    ${this.participants.length + 1} PEERS ACTIVE
                  </span>
                </div>
                <p class="text-xs text-slate-400 font-mono mt-0.5">
                  Binaural 3D Audio Mesh: Drag participant nodes to position sound in 3D headphones space.
                </p>
              </div>
            </div>

            <!-- Header Actions -->
            <div class="flex items-center gap-2">
              <button id="mesh-btn-test-chirp" class="px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-surface-overlay hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 transition-all flex items-center gap-1.5 shadow-sm" title="Emit 3D HRTF test chirp">
                <span>⚡</span> 3D Ping Test
              </button>
              <button id="mesh-modal-close-btn" class="w-8 h-8 rounded-lg bg-surface-overlay hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all flex items-center justify-center border border-white/5 text-lg font-bold" title="Close Lounge">
                ✕
              </button>
            </div>
          </div>

          <!-- Main Body: Interactive 3D Radar Viewport & Control Rail -->
          <div class="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto bg-canvas/70">
            
            <!-- Left 7 Cols: Interactive Draggable Radar Canvas -->
            <div class="lg:col-span-7 flex flex-col items-center justify-center">
              <div class="relative w-full max-w-[400px] aspect-square rounded-2xl bg-surface-base border border-white/10 shadow-inner p-2 flex items-center justify-center overflow-hidden" id="mesh-radar-wrapper">
                
                <!-- Radar SVG Backdrop -->
                ${this.renderRadarSVGGrid()}

                <!-- Radar Scan Sweep Effect -->
                <div class="absolute inset-0 pointer-events-none rounded-full overflow-hidden flex items-center justify-center">
                  <div class="w-[360px] h-[360px] rounded-full border border-cyan-500/20 animate-spin duration-[7000ms] linear opacity-35 bg-gradient-to-tr from-transparent via-cyan-500/5 to-transparent"></div>
                </div>

                <!-- Interactive Draggable Avatars Layer -->
                <div id="mesh-radar-canvas" class="relative w-[400px] h-[400px] pointer-events-auto">
                  ${this.renderListenerAvatarNode()}
                  ${this.renderParticipantAvatarNodes()}
                </div>

                <!-- Compass Heading Overlays -->
                <div class="absolute top-2 text-[10px] font-mono font-bold text-slate-500 pointer-events-none">0° FRONT (NORTH)</div>
                <div class="absolute bottom-2 text-[10px] font-mono font-bold text-slate-500 pointer-events-none">180° REAR (SOUTH)</div>
                <div class="absolute left-2 text-[10px] font-mono font-bold text-slate-500 pointer-events-none">270° LEFT</div>
                <div class="absolute right-2 text-[10px] font-mono font-bold text-slate-500 pointer-events-none">90° RIGHT</div>

                <!-- Interactive Helper Badge -->
                <div class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-surface-raised/95 border border-white/10 text-[10px] font-mono text-slate-300 pointer-events-none shadow-md backdrop-blur-sm">
                  🖱️ Drag nodes to adjust 3D position in headphones
                </div>
              </div>

              <!-- Radar Auxiliary Toolbar -->
              <div class="w-full max-w-[400px] mt-3 flex items-center justify-between gap-2 px-1">
                <button id="mesh-btn-rotate-left" class="py-1.5 px-2 text-xs font-mono rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/10 transition-all text-center" title="Rotate Head 15° Left">
                  ↺ Head -15°
                </button>
                <button id="mesh-btn-rotate-right" class="py-1.5 px-2 text-xs font-mono rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/10 transition-all text-center" title="Rotate Head 15° Right">
                  ↻ Head +15°
                </button>
                <button id="mesh-btn-reset-layout" class="py-1.5 px-2 text-xs font-mono rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/10 transition-all text-center">
                  Reset Layout
                </button>
                <button id="mesh-btn-add-participant" class="py-1.5 px-2.5 text-xs font-mono rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all text-center font-bold">
                  + Add Peer
                </button>
              </div>
            </div>

            <!-- Right 5 Cols: VAD Meters, Hardware Controls & Peer Matrix -->
            <div class="lg:col-span-5 flex flex-col gap-4">
              
              <!-- Listener Hardware & Head Tracker HUD -->
              <div class="p-3.5 rounded-xl bg-surface-raised border border-white/5 flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🎧</span> Listener Head Orientation
                  </span>
                  <span class="text-[11px] font-mono text-cyan-400 font-bold">${this.listener.yawDeg}° YAW</span>
                </div>

                <div class="flex items-center justify-between gap-3 text-xs font-mono text-slate-400">
                  <span>Elevation (Z): <strong class="text-white">${this.listener.z}px</strong></span>
                  <span>Position: <strong class="text-white">X:${this.listener.x} Y:${this.listener.y}</strong></span>
                </div>

                <!-- Master Volume Slider -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-[11px] font-mono text-slate-300">
                    <span>Master Headphone Volume</span>
                    <span class="text-cyan-400 font-bold">${Math.round(this.masterVolume * 100)}%</span>
                  </div>
                  <input id="mesh-master-volume" type="range" min="0" max="100" value="${Math.round(this.masterVolume * 100)}" class="w-full accent-cyan-400 bg-surface-overlay h-1.5 rounded-lg cursor-pointer" />
                </div>

                <!-- Self Toggle Action Buttons -->
                <div class="grid grid-cols-2 gap-2 pt-1">
                  <button id="mesh-btn-self-mute" class="py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all border ${
                    this.isMicMuted
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-surface-base hover:bg-surface-overlay border-white/10 text-slate-200'
                  }">
                    <span>${this.isMicMuted ? '🔇' : '🎙️'}</span>
                    <span>${this.isMicMuted ? 'MIC MUTED' : 'MIC ACTIVE'}</span>
                  </button>

                  <button id="mesh-btn-self-deafen" class="py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all border ${
                    this.isDeafened
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-surface-base hover:bg-surface-overlay border-white/10 text-slate-200'
                  }">
                    <span>${this.isDeafened ? '🔕' : '🎧'}</span>
                    <span>${this.isDeafened ? 'DEAFENED' : 'DEAFEN'}</span>
                  </button>
                </div>
              </div>

              <!-- VAD Sensitivity Control -->
              <div class="p-3.5 rounded-xl bg-surface-raised border border-white/5 flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚡</span> VAD Energy Sensitivity
                  </span>
                  <span class="text-[10px] font-mono text-emerald-400">Threshold: ${this.vadThreshold} RMS</span>
                </div>
                <input id="mesh-vad-threshold" type="range" min="5" max="50" value="${Math.round(this.vadThreshold * 1000)}" class="w-full accent-emerald-400 bg-surface-overlay h-1.5 rounded-lg cursor-pointer" />
                <p class="text-[10px] text-slate-400 font-mono">
                  Voice Activity Detection triggers fluorescent glow rings when voice energy exceeds threshold.
                </p>
              </div>

              <!-- Participant 3D Mesh Matrix HUD -->
              <div class="p-3.5 rounded-xl bg-surface-raised border border-white/5 flex flex-col gap-2 flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">3D Acoustic Peers</span>
                  <span class="text-[10px] font-mono text-slate-400">DISTANCE / ELEVATION / VAD</span>
                </div>

                <div class="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1" id="mesh-participant-hud-list">
                  ${this.renderParticipantListHUD()}
                </div>
              </div>

            </div>

          </div>

          <!-- Modal Footer HUD -->
          <div class="px-6 py-3 bg-surface-raised border-t border-white/5 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono">
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1.5 text-cyan-400">
                <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                HRTF 3D Panner Active
              </span>
              <span class="text-slate-500">|</span>
              <span>Room Scale: <strong class="text-white">10m x 10m</strong></span>
              <span class="text-slate-500">|</span>
              <span>VAD Engine: <strong class="text-emerald-400">RMS Analyser Active</strong></span>
            </div>

            <div class="flex items-center gap-3">
              <span class="text-slate-500">Aetheris 3D Spatial Audio Mesh v3.0</span>
              <button id="mesh-modal-done-btn" class="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                Done
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Render SVG Radar Background with 3D Distance Rings and Acoustic Crosshairs.
   */
  private renderRadarSVGGrid(): string {
    return `
      <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
        <defs>
          <radialGradient id="meshRadarAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.1" />
            <stop offset="60%" stop-color="#06b6d4" stop-opacity="0.03" />
            <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Background Aura -->
        <circle cx="200" cy="200" r="175" fill="url(#meshRadarAura)" stroke="#06b6d4" stroke-opacity="0.28" stroke-width="1.5" />

        <!-- Concentric Distance Range Rings (1m, 2m, 3.5m) -->
        <circle cx="200" cy="200" r="140" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="3,3" />
        <circle cx="200" cy="200" r="95" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="3,3" />
        <circle cx="200" cy="200" r="45" fill="none" stroke="#06b6d4" stroke-opacity="0.25" stroke-width="1" />

        <!-- Crosshair Coordinate Lines -->
        <line x1="200" y1="25" x2="200" y2="375" stroke="rgba(255,255,255,0.09)" stroke-width="1" />
        <line x1="25" y1="200" x2="375" y2="200" stroke="rgba(255,255,255,0.09)" stroke-width="1" />

        <!-- Distance Range Labels -->
        <text x="204" y="160" fill="#64748b" font-size="9" font-family="monospace">1.1m</text>
        <text x="204" y="110" fill="#64748b" font-size="9" font-family="monospace">2.4m</text>
        <text x="204" y="65" fill="#64748b" font-size="9" font-family="monospace">3.5m</text>
      </svg>
    `;
  }

  /**
   * Render Listener Avatar (Self) with Head Yaw Orientation Pointer.
   */
  private renderListenerAvatarNode(): string {
    const left = this.listener.x - 22;
    const top = this.listener.y - 22;

    return `
      <div 
        id="mesh-node-self" 
        data-node-id="self"
        class="mesh-draggable-node absolute w-11 h-11 rounded-full cursor-grab active:cursor-grabbing flex flex-col items-center justify-center transition-transform duration-75 z-30 group"
        style="left: ${left}px; top: ${top}px;"
      >
        <!-- Head Orientation Pointer Vector -->
        <div 
          class="absolute w-12 h-12 pointer-events-none flex items-start justify-center transition-transform duration-100"
          style="transform: rotate(${this.listener.yawDeg}deg);"
        >
          <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-cyan-400 drop-shadow-[0_0_6px_#06b6d4]"></div>
        </div>

        <!-- Glowing Core Circle -->
        <div class="w-10 h-10 rounded-full bg-surface-overlay border-2 border-cyan-400 flex items-center justify-center text-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.5)] group-hover:scale-105 transition-all">
          <span class="text-xs font-black font-mono">YOU</span>
        </div>

        <!-- Label Tag -->
        <div class="absolute top-11 px-2 py-0.5 rounded bg-surface-raised/95 border border-cyan-400/30 text-[9px] font-mono text-cyan-400 font-bold whitespace-nowrap pointer-events-none shadow-md backdrop-blur-sm">
          Listener (3D Head)
        </div>
      </div>
    `;
  }

  /**
   * Render Draggable Participant Avatars with Fluorescent Speaking Rings.
   */
  private renderParticipantAvatarNodes(): string {
    return this.participants.map((p) => {
      const left = p.x - 20;
      const top = p.y - 20;
      const metrics = this.calculate3DMetrics(p.x, p.y, p.z);
      const isSpeaking = p.isSpeaking && !p.isMuted;

      return `
        <div 
          id="mesh-node-${p.id}" 
          data-node-id="${p.id}"
          class="mesh-draggable-node absolute w-10 h-10 rounded-full cursor-grab active:cursor-grabbing flex flex-col items-center justify-center transition-transform duration-75 z-20 group"
          style="left: ${left}px; top: ${top}px;"
        >
          <!-- Fluorescent Speaking Glow Ring (VAD Triggered) -->
          <div class="speaking-fluorescent-ring absolute -inset-2 rounded-full border-2 border-emerald-400 shadow-[0_0_20px_#34d399] ${isSpeaking ? 'opacity-100 animate-pulse' : 'hidden opacity-0'} pointer-events-none transition-all"></div>
          
          <!-- Participant Avatar Circle -->
          <div 
            class="w-9 h-9 rounded-full bg-surface-raised border-2 flex items-center justify-center text-white text-xs font-bold shadow-md transition-all group-hover:scale-110"
            style="border-color: ${p.isMuted ? '#ef4444' : (p.avatarColor || '#00e5ff')};"
          >
            ${p.isMuted ? '🔇' : (p.name ? p.name.charAt(0).toUpperCase() : 'P')}
          </div>

          <!-- Participant Info Badge -->
          <div class="absolute top-10 flex flex-col items-center pointer-events-none whitespace-nowrap z-30">
            <div class="px-1.5 py-0.5 rounded bg-surface-base/95 border border-white/10 text-[9px] font-mono flex items-center gap-1 shadow-md">
              <span class="font-bold text-white">${this.escapeHtml(p.name || p.id)}</span>
              <span class="text-[8px] font-mono ${p.isMuted ? 'text-rose-400' : 'text-cyan-400'}">
                ${metrics.distanceMeters}m
              </span>
            </div>
            <span class="text-[8px] font-mono text-slate-400 mt-0.5">${metrics.clockPos} · Z:${p.z}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render Participant List HUD for right side panel.
   */
  private renderParticipantListHUD(): string {
    if (this.participants.length === 0) {
      return `
        <div class="py-6 text-center text-xs text-slate-500 font-mono">
          No peers currently in the 3D acoustic field.
        </div>
      `;
    }

    return this.participants.map((p) => {
      const metrics = this.calculate3DMetrics(p.x, p.y, p.z);
      const isSpeaking = p.isSpeaking && !p.isMuted;

      return `
        <div class="p-2 rounded-lg bg-surface-base border border-white/5 flex flex-col gap-1.5 hover:border-white/10 transition-all">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border" style="border-color: ${p.avatarColor || '#00e5ff'};">
                ${p.isMuted ? '🔇' : (p.name ? p.name.charAt(0) : 'P')}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-xs font-bold text-white truncate max-w-[120px]">${this.escapeHtml(p.name || p.id)}</span>
                <span class="text-[9px] font-mono text-slate-400">${p.id}</span>
              </div>
            </div>

            <!-- Action Controls -->
            <div class="flex items-center gap-1.5">
              <button 
                data-mesh-chirp-id="${p.id}" 
                class="px-1.5 py-0.5 rounded bg-surface-overlay hover:bg-slate-700 text-[10px] font-mono text-cyan-400 border border-cyan-500/20 transition-all"
                title="Ping 3D Node"
              >
                🔊 Ping
              </button>
              <button 
                data-mesh-mute-id="${p.id}" 
                class="p-1 rounded bg-surface-overlay hover:bg-slate-700 text-xs transition-all ${p.isMuted ? 'text-rose-400' : 'text-slate-300'}"
                title="${p.isMuted ? 'Unmute peer' : 'Mute peer'}"
              >
                ${p.isMuted ? '🔇' : '🎙️'}
              </button>
              <button 
                data-mesh-remove-id="${p.id}" 
                class="p-1 rounded bg-surface-overlay hover:bg-rose-500/20 text-xs text-slate-400 hover:text-rose-400 transition-all"
                title="Disconnect peer"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- 3D Spatial Metrics Readout -->
          <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
            <span>Pos: <span class="text-slate-200">${metrics.clockPos}</span></span>
            <span>Dist: <span class="text-slate-200">${metrics.distanceMeters}m</span></span>
            <span>Elev: <span class="text-slate-200">${p.z > 0 ? `+${p.z}` : p.z}</span></span>
            <span>Gain: <span class="text-slate-200">${Math.round(metrics.attenuationGain * 100)}%</span></span>
          </div>

          <!-- Real-Time Voice Activity (VAD) VU Meter -->
          <div class="w-full bg-surface-overlay h-1.5 rounded-full overflow-hidden">
            <div 
              id="mesh-vu-${p.id}" 
              class="h-full rounded-full transition-all duration-100 ${isSpeaking ? 'w-3/5 bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'w-[4%] bg-slate-700'}"
            ></div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Attach interactive dragging and button listeners.
   */
  public attachEvents(root: HTMLElement | Document = document): void {
    const doc = typeof document !== 'undefined' ? document : (root as Document);

    // 1. Close Modal Handlers
    const closeBtn = doc.getElementById('mesh-modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());

    const doneBtn = doc.getElementById('mesh-modal-done-btn');
    if (doneBtn) doneBtn.addEventListener('click', () => this.closeModal());

    // 2. Head Orientation Rotation Buttons
    const rotLeft = doc.getElementById('mesh-btn-rotate-left');
    if (rotLeft) {
      rotLeft.addEventListener('click', () => {
        this.setListenerHeadOrientation(this.listener.yawDeg - 15);
        this.refreshModalDOM();
      });
    }

    const rotRight = doc.getElementById('mesh-btn-rotate-right');
    if (rotRight) {
      rotRight.addEventListener('click', () => {
        this.setListenerHeadOrientation(this.listener.yawDeg + 15);
        this.refreshModalDOM();
      });
    }

    // 3. Reset Layout Button
    const resetBtn = doc.getElementById('mesh-btn-reset-layout');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetPositions();
        this.refreshModalDOM();
      });
    }

    // 4. Add Participant Button
    const addPeerBtn = doc.getElementById('mesh-btn-add-participant');
    if (addPeerBtn) {
      addPeerBtn.addEventListener('click', () => {
        const roles = ['ARCHON', 'SENTINEL', 'SCRIBE', 'OPERATIVE', 'GUEST'];
        const randomRole = roles[Math.floor(Math.random() * roles.length)];
        this.addParticipant({
          name: `Peer-${Math.floor(100 + Math.random() * 900)}`,
          role: randomRole,
        });
        this.refreshModalDOM();
      });
    }

    // 5. Test Spatial Chirp Button
    const testChirpBtn = doc.getElementById('mesh-btn-test-chirp');
    if (testChirpBtn) {
      testChirpBtn.addEventListener('click', () => {
        this.playSpatialChirp({ x: 290, y: 140, z: 15 }, 520);
      });
    }

    // 6. Master Volume Slider
    const volumeSlider = doc.getElementById('mesh-master-volume') as HTMLInputElement | null;
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
        this.setMasterVolume(val);
      });
    }

    // 7. VAD Threshold Slider
    const vadSlider = doc.getElementById('mesh-vad-threshold') as HTMLInputElement | null;
    if (vadSlider) {
      vadSlider.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10) / 1000;
        this.setVADThreshold(val);
      });
    }

    // 8. Self Mute & Deafen Buttons
    const muteBtn = doc.getElementById('mesh-btn-self-mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        this.toggleSelfMute();
        this.refreshModalDOM();
      });
    }

    const deafenBtn = doc.getElementById('mesh-btn-self-deafen');
    if (deafenBtn) {
      deafenBtn.addEventListener('click', () => {
        this.toggleSelfDeafen();
        this.refreshModalDOM();
      });
    }

    // 9. Participant HUD Action Buttons
    const hudList = doc.getElementById('mesh-participant-hud-list');
    if (hudList) {
      hudList.querySelectorAll('[data-mesh-chirp-id]').forEach((btn) => {
        (btn as HTMLElement).addEventListener('click', (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute('data-mesh-chirp-id');
          if (id) this.playSpatialChirp(id);
        });
      });

      hudList.querySelectorAll('[data-mesh-mute-id]').forEach((btn) => {
        (btn as HTMLElement).addEventListener('click', (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute('data-mesh-mute-id');
          if (id) {
            this.toggleParticipantMute(id);
            this.refreshModalDOM();
          }
        });
      });

      hudList.querySelectorAll('[data-mesh-remove-id]').forEach((btn) => {
        (btn as HTMLElement).addEventListener('click', (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute('data-mesh-remove-id');
          if (id) {
            this.removeParticipant(id);
            this.refreshModalDOM();
          }
        });
      });
    }

    // 10. Draggable 3D Radar Canvas Nodes Setup
    this.setupRadarDragEvents();
  }

  /**
   * Set up PointerEvent-based 2D dragging with mousewheel 3D elevation adjustment.
   */
  private setupRadarDragEvents(): void {
    if (typeof document === 'undefined') return;
    const radarCanvas = document.getElementById('mesh-radar-canvas');
    if (!radarCanvas) return;

    const draggableNodes = radarCanvas.querySelectorAll<HTMLElement>('.mesh-draggable-node');

    draggableNodes.forEach((node) => {
      // Mousewheel adjusts 3D Z elevation
      node.addEventListener('wheel', (e: WheelEvent) => {
        e.preventDefault();
        const nodeId = node.getAttribute('data-node-id');
        if (!nodeId) return;

        const delta = e.deltaY < 0 ? 5 : -5;
        if (nodeId === 'self') {
          this.setListenerPosition(this.listener.x, this.listener.y, this.listener.z + delta);
        } else {
          const p = this.participants.find((item) => item.id === nodeId);
          if (p) {
            this.updateParticipantPosition(p.id, p.x, p.y, p.z + delta);
          }
        }
        this.refreshModalDOM();
      });

      node.addEventListener('pointerdown', (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const nodeId = node.getAttribute('data-node-id');
        if (!nodeId) return;

        this.activeDragTarget = nodeId;
        if (typeof node.setPointerCapture === 'function') {
          node.setPointerCapture(e.pointerId);
        }

        const canvasRect = radarCanvas.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();

        this.dragOffset = {
          x: e.clientX - (nodeRect.left + nodeRect.width / 2),
          y: e.clientY - (nodeRect.top + nodeRect.height / 2),
        };

        const onPointerMove = (moveEv: PointerEvent) => {
          if (this.activeDragTarget !== nodeId) return;

          const currentX = moveEv.clientX - canvasRect.left - this.dragOffset.x;
          const currentY = moveEv.clientY - canvasRect.top - this.dragOffset.y;

          if (nodeId === 'self') {
            this.setListenerPosition(currentX, currentY);
            node.style.left = `${this.listener.x - 22}px`;
            node.style.top = `${this.listener.y - 22}px`;
          } else {
            this.updateParticipantPosition(nodeId, currentX, currentY);
            const p = this.participants.find((item) => item.id === nodeId);
            if (p) {
              node.style.left = `${p.x - 20}px`;
              node.style.top = `${p.y - 20}px`;
            }
          }
        };

        const onPointerUp = (upEv: PointerEvent) => {
          if (typeof node.releasePointerCapture === 'function') {
            node.releasePointerCapture(upEv.pointerId);
          }
          this.activeDragTarget = null;
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          this.refreshModalDOM();
        };

        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerup', onPointerUp, { passive: true });
      });
    });
  }

  /**
   * Refresh Modal DOM in place and re-bind event listeners.
   */
  private refreshModalDOM(): void {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('spatial-mesh-modal-overlay');
    if (!overlay) return;

    overlay.outerHTML = this.renderSpatialMeshModal();
    this.attachEvents(document);
  }

  /**
   * Basic HTML escaping to prevent XSS.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const spatialAudioMesh = new SpatialAudioMeshEngine();
