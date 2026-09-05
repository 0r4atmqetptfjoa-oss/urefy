/**
 * Aetheris Omni-Sphere — Voice Lounge 2D Spatial Grid Audio Engine
 *
 * Implements real-time 2D binaural stereophonic sound localization, distance-based
 * acoustic rolloff, interactive acoustic radar canvas with draggable nodes, active speaker
 * audio visualizers, and Web Audio API Spatial Panner integration.
 *
 * 100% Self-Contained, Strict TypeScript, Zero External Dependencies.
 */

import { createSafeAudioContext } from './dry-utils.js';

export interface SpatialParticipant {
  fingerprint: string;
  role: string;
  x: number;
  y: number;
  isMuted: boolean;
  isSpeaking: boolean;
  pannerNode?: StereoPannerNode;
  gainNode?: GainNode;
  displayName?: string;
  avatarColor?: string;
  lastSpokeAt?: number;
  latencyMs?: number;
  audioFrequency?: number;
}

export type RoomAcousticType = 'intimate_studio' | 'cyphr_vault' | 'open_amphitheater' | 'anechoic_chamber';

export interface RoomPresetConfig {
  id: RoomAcousticType;
  name: string;
  description: string;
  filterFrequency: number;
  filterQ: number;
  reverbDecay: number;
  icon: string;
}

export interface SpatialMetrics {
  pan: number;          // [-1.0 (full left) to +1.0 (full right)]
  distance: number;     // Euclidean distance in radar coordinate pixels
  gain: number;         // Normalized amplitude [0.0 to 1.0]
  angleDeg: number;     // Azimuth angle [0 to 360 deg]
  clockPos: string;     // e.g. "2 o'clock"
  distanceMeters: string; // e.g. "1.8m"
}

export class SpatialAudioEngine {
  public isOpen: boolean = false;
  public participants: SpatialParticipant[] = [];
  public myPosition: { x: number; y: number } = { x: 200, y: 200 };
  public isMicMuted: boolean = false;
  public isDeafened: boolean = false;
  public masterVolume: number = 0.85;
  public roomPreset: RoomAcousticType = 'cyphr_vault';
  public activeDragTarget: string | null = null; // 'self' or participant fingerprint
  public dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  public isSimulationActive: boolean = false;

  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private roomFilter: BiquadFilterNode | null = null;
  private simIntervalId: number | null = null;
  private readonly radarRadius: number = 175;
  private readonly canvasCenter: { x: number; y: number } = { x: 200, y: 200 };
  private readonly maxAcousticDistance: number = 220;

  public readonly roomPresets: Record<RoomAcousticType, RoomPresetConfig> = {
    intimate_studio: {
      id: 'intimate_studio',
      name: 'Intimate Studio',
      description: 'Tight near-field response, warm vocal proximity boost',
      filterFrequency: 18000,
      filterQ: 0.7,
      reverbDecay: 0.4,
      icon: '🎙️',
    },
    cyphr_vault: {
      id: 'cyphr_vault',
      name: 'Cyphr Vault',
      description: 'Sub-bass dampening, crystalline mids, high acoustic isolation',
      filterFrequency: 14000,
      filterQ: 1.1,
      reverbDecay: 1.2,
      icon: '🏛️',
    },
    open_amphitheater: {
      id: 'open_amphitheater',
      name: 'Amphitheater',
      description: 'Wide acoustic dispersion with natural open-air high rolloff',
      filterFrequency: 8500,
      filterQ: 0.5,
      reverbDecay: 2.4,
      icon: '🏟️',
    },
    anechoic_chamber: {
      id: 'anechoic_chamber',
      name: 'Anechoic Chamber',
      description: 'Zero reflections, absolute dry positional localization',
      filterFrequency: 20000,
      filterQ: 0.1,
      reverbDecay: 0.05,
      icon: '🔇',
    },
  };

  constructor() {
    this.seedInitialParticipants();
  }

  /**
   * Seed realistic Aetheris cryptographic identities for the Voice Lounge.
   */
  private seedInitialParticipants(): void {
    this.participants = [
      {
        fingerprint: '0x8F3A...4C91',
        displayName: 'Kaelen (Cyphr Lead)',
        role: 'ARCHON',
        x: 120,
        y: 130,
        isMuted: false,
        isSpeaking: true,
        avatarColor: '#00e5ff',
        latencyMs: 14,
        audioFrequency: 440,
      },
      {
        fingerprint: '0x1B9E...D420',
        displayName: 'Aria (Security)',
        role: 'SENTINEL',
        x: 290,
        y: 140,
        isMuted: false,
        isSpeaking: false,
        avatarColor: '#22c55e',
        latencyMs: 19,
        audioFrequency: 523,
      },
      {
        fingerprint: '0x7C11...990A',
        displayName: 'Vesper (ZK Scribe)',
        role: 'SCRIBE',
        x: 110,
        y: 270,
        isMuted: false,
        isSpeaking: false,
        avatarColor: '#a855f7',
        latencyMs: 24,
        audioFrequency: 330,
      },
      {
        fingerprint: '0x4A22...E10B',
        displayName: 'Dante (P2P Relay)',
        role: 'OPERATIVE',
        x: 280,
        y: 290,
        isMuted: true,
        isSpeaking: false,
        avatarColor: '#f59e0b',
        latencyMs: 31,
        audioFrequency: 293,
      },
    ];
  }

  /**
   * Initialize Web Audio API Context and master audio bus.
   */
  public async initAudioContext(): Promise<boolean> {
    try {
      if (!this.audioCtx) {
        this.audioCtx = createSafeAudioContext();
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      if (!this.masterGain && this.audioCtx) {
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.isDeafened ? 0 : this.masterVolume, this.audioCtx.currentTime);

        this.roomFilter = this.audioCtx.createBiquadFilter();
        this.roomFilter.type = 'lowpass';
        this.applyRoomPreset(this.roomPreset);

        this.roomFilter.connect(this.masterGain);
        this.masterGain.connect(this.audioCtx.destination);
      }

      // Initialize panner & gain nodes for all participants
      this.participants.forEach((p) => {
        this.setupParticipantAudioNodes(p);
      });

      this.startSpeakingSimulation();
      return true;
    } catch (err: unknown) {
      console.warn('[Spatial Audio] Web Audio initialization deferred:', err);
      return false;
    }
  }

  /**
   * Configure Web Audio StereoPannerNode and GainNode for a single participant.
   */
  private setupParticipantAudioNodes(participant: SpatialParticipant): void {
    if (!this.audioCtx || !this.roomFilter) return;

    try {
      if (!participant.gainNode) {
        participant.gainNode = this.audioCtx.createGain();
      }

      if (!participant.pannerNode && typeof this.audioCtx.createStereoPanner === 'function') {
        participant.pannerNode = this.audioCtx.createStereoPanner();
      }

      const metrics = this.calculateSpatialMetrics(participant.x, participant.y);

      if (participant.pannerNode) {
        participant.pannerNode.pan.setValueAtTime(metrics.pan, this.audioCtx.currentTime);
        if (participant.gainNode) {
          participant.gainNode.connect(participant.pannerNode);
          participant.pannerNode.connect(this.roomFilter);
        }
      } else if (participant.gainNode) {
        participant.gainNode.connect(this.roomFilter);
      }

      const effectiveGain = this.isDeafened || participant.isMuted ? 0 : metrics.gain;
      if (participant.gainNode) {
        participant.gainNode.gain.setValueAtTime(effectiveGain, this.audioCtx.currentTime);
      }
    } catch (err) {
      console.warn(`[Spatial Audio] Failed to attach audio nodes for ${participant.fingerprint}:`, err);
    }
  }

  /**
   * Calculate stereo panning [-1.0, 1.0], distance attenuation, and spatial angle
   * based on coordinates relative to listener (myPosition).
   */
  public calculateSpatialMetrics(x: number, y: number): SpatialMetrics {
    const dx = x - this.myPosition.x;
    const dy = y - this.myPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalizing stereo pan [-1.0 (full left), 1.0 (full right)]
    // Based on relative X displacement across auditory field
    const panRange = this.radarRadius * 0.85;
    const rawPan = dx / (panRange || 1);
    const pan = Math.max(-1.0, Math.min(1.0, Math.round(rawPan * 100) / 100));

    // Distance attenuation with smooth inverse-distance rolloff
    const normalizedDist = Math.min(1.0, distance / this.maxAcousticDistance);
    const attenuation = Math.max(0.0, 1.0 - normalizedDist);
    const gain = Math.max(0.02, Math.min(1.0, Math.pow(attenuation, 1.35)));

    // Calculate azimuth angle (0° = North, 90° = East, 180° = South, 270° = West)
    let angleDeg = Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360);

    // Human readable clock position (e.g. 12 o'clock, 3 o'clock)
    const clockHour = Math.round(angleDeg / 30) % 12 || 12;
    const clockPos = `${clockHour} o'clock`;

    // Distance in simulated acoustic meters
    const meters = (distance / 45).toFixed(1);
    const distanceMeters = `${meters}m`;

    return {
      pan,
      distance: Math.round(distance),
      gain: Math.round(gain * 100) / 100,
      angleDeg,
      clockPos,
      distanceMeters,
    };
  }

  /**
   * Update participant position in 2D space and recalculate stereo panning & gain.
   */
  public updateParticipantPosition(fp: string, x: number, y: number): void {
    const participant = this.participants.find((p) => p.fingerprint === fp);
    if (!participant) return;

    // Constrain within radar circle bounds
    const clampedPos = this.clampToRadarCircle(x, y);
    participant.x = clampedPos.x;
    participant.y = clampedPos.y;

    const metrics = this.calculateSpatialMetrics(participant.x, participant.y);

    if (this.audioCtx) {
      if (participant.pannerNode) {
        participant.pannerNode.pan.setValueAtTime(metrics.pan, this.audioCtx.currentTime);
      }
      if (participant.gainNode) {
        const effectiveGain = this.isDeafened || participant.isMuted ? 0 : metrics.gain;
        participant.gainNode.gain.setValueAtTime(effectiveGain, this.audioCtx.currentTime);
      }
    }
  }

  /**
   * Update listener (Self) position and update all participants' acoustic parameters.
   */
  public setMyPosition(x: number, y: number): void {
    const clampedPos = this.clampToRadarCircle(x, y);
    this.myPosition = clampedPos;

    this.participants.forEach((p) => {
      this.updateParticipantPosition(p.fingerprint, p.x, p.y);
    });
  }

  /**
   * Clamp an (x, y) point to stay inside the radar circle bounds.
   */
  private clampToRadarCircle(x: number, y: number): { x: number; y: number } {
    const dx = x - this.canvasCenter.x;
    const dy = y - this.canvasCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = this.radarRadius - 18;

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
   * Toggle Self Microphone Mute state.
   */
  public toggleSelfMute(): boolean {
    this.isMicMuted = !this.isMicMuted;
    return this.isMicMuted;
  }

  /**
   * Toggle Self Deafen state (mutes all incoming audio).
   */
  public toggleSelfDeafen(): boolean {
    this.isDeafened = !this.isDeafened;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.isDeafened ? 0 : this.masterVolume, this.audioCtx.currentTime);
    }
    return this.isDeafened;
  }

  /**
   * Set Master Output Volume [0.0 to 1.0].
   */
  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1.0, vol));
    if (this.masterGain && this.audioCtx && !this.isDeafened) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioCtx.currentTime);
    }
  }

  /**
   * Apply an Acoustic Room Preset.
   */
  public setRoomPreset(preset: RoomAcousticType): void {
    if (!this.roomPresets[preset]) return;
    this.roomPreset = preset;
    this.applyRoomPreset(preset);
  }

  private applyRoomPreset(preset: RoomAcousticType): void {
    const cfg = this.roomPresets[preset];
    if (this.roomFilter && this.audioCtx) {
      this.roomFilter.frequency.setValueAtTime(cfg.filterFrequency, this.audioCtx.currentTime);
      this.roomFilter.Q.setValueAtTime(cfg.filterQ, this.audioCtx.currentTime);
    }
  }

  /**
   * Toggle remote participant mute state.
   */
  public toggleParticipantMute(fp: string): void {
    const p = this.participants.find((item) => item.fingerprint === fp);
    if (!p) return;
    p.isMuted = !p.isMuted;
    if (p.gainNode && this.audioCtx) {
      const metrics = this.calculateSpatialMetrics(p.x, p.y);
      const effectiveGain = this.isDeafened || p.isMuted ? 0 : metrics.gain;
      p.gainNode.gain.setValueAtTime(effectiveGain, this.audioCtx.currentTime);
    }
  }

  /**
   * Add a new participant to the Spatial Voice Lounge.
   */
  public addParticipant(p: Partial<SpatialParticipant>): SpatialParticipant {
    const newParticipant: SpatialParticipant = {
      fingerprint: p.fingerprint || `0x${Math.random().toString(16).slice(2, 6).toUpperCase()}...${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
      displayName: p.displayName || 'Anonymous Peer',
      role: p.role || 'GUEST',
      x: p.x ?? Math.round(150 + Math.random() * 100),
      y: p.y ?? Math.round(150 + Math.random() * 100),
      isMuted: !!p.isMuted,
      isSpeaking: !!p.isSpeaking,
      avatarColor: p.avatarColor || '#00e5ff',
      latencyMs: p.latencyMs || Math.floor(12 + Math.random() * 25),
      audioFrequency: p.audioFrequency || 440,
    };

    this.participants.push(newParticipant);
    this.setupParticipantAudioNodes(newParticipant);
    return newParticipant;
  }

  /**
   * Remove a participant from the Voice Lounge.
   */
  public removeParticipant(fp: string): void {
    const idx = this.participants.findIndex((p) => p.fingerprint === fp);
    if (idx !== -1) {
      const [removed] = this.participants.splice(idx, 1);
      if (removed.gainNode) {
        try {
          removed.gainNode.disconnect();
        } catch {
          // ignore disconnect errors
        }
      }
      if (removed.pannerNode) {
        try {
          removed.pannerNode.disconnect();
        } catch {
          // ignore disconnect errors
        }
      }
    }
  }

  /**
   * Reset grid positions to symmetric default arrangement.
   */
  public resetGridPositions(): void {
    this.myPosition = { x: 200, y: 200 };
    const defaultCoords = [
      { x: 120, y: 130 },
      { x: 290, y: 140 },
      { x: 110, y: 270 },
      { x: 280, y: 290 },
      { x: 200, y: 100 },
      { x: 200, y: 300 },
    ];

    this.participants.forEach((p, idx) => {
      const coord = defaultCoords[idx % defaultCoords.length];
      this.updateParticipantPosition(p.fingerprint, coord.x, coord.y);
    });
  }

  /**
   * Randomize positions across the radar perimeter for acoustic testing.
   */
  public randomizePositions(): void {
    this.participants.forEach((p) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 110;
      const newX = Math.round(this.canvasCenter.x + Math.cos(angle) * radius);
      const newY = Math.round(this.canvasCenter.y + Math.sin(angle) * radius);
      this.updateParticipantPosition(p.fingerprint, newX, newY);
    });
  }

  /**
   * Play an acoustic binaural spatial chirp (440Hz - 880Hz) localized at (x, y)
   * to immediately demo 3D spatial panning & distance attenuation in the browser.
   */
  public playSpatialChirp(x: number, y: number, freq: number = 440): void {
    if (!this.audioCtx) {
      this.initAudioContext().then(() => this.playSpatialChirp(x, y, freq));
      return;
    }

    try {
      const now = this.audioCtx.currentTime;
      const metrics = this.calculateSpatialMetrics(x, y);

      const osc = this.audioCtx.createOscillator();
      const chirpGain = this.audioCtx.createGain();
      let panner: StereoPannerNode | null = null;

      if (typeof this.audioCtx.createStereoPanner === 'function') {
        panner = this.audioCtx.createStereoPanner();
        panner.pan.setValueAtTime(metrics.pan, now);
      }

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.12);

      const targetGain = this.isDeafened ? 0 : metrics.gain * this.masterVolume * 0.4;
      chirpGain.gain.setValueAtTime(0, now);
      chirpGain.gain.linearRampToValueAtTime(targetGain, now + 0.02);
      chirpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      if (panner) {
        osc.connect(chirpGain);
        chirpGain.connect(panner);
        panner.connect(this.masterGain || this.audioCtx.destination);
      } else {
        osc.connect(chirpGain);
        chirpGain.connect(this.masterGain || this.audioCtx.destination);
      }

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (err) {
      console.warn('[Spatial Audio] Chirp playback error:', err);
    }
  }

  /**
   * Background simulation for active speaker voice ticks.
   */
  public startSpeakingSimulation(): void {
    if (this.simIntervalId !== null) return;
    this.isSimulationActive = true;

    this.simIntervalId = window.setInterval(() => {
      if (!this.isOpen || !this.isSimulationActive) return;

      const randomIdx = Math.floor(Math.random() * (this.participants.length + 1));
      this.participants.forEach((p, idx) => {
        if (p.isMuted) {
          p.isSpeaking = false;
          return;
        }

        // Periodically toggle speaking flag for realistic UI activity
        if (idx === randomIdx) {
          p.isSpeaking = Math.random() > 0.35;
          if (p.isSpeaking) {
            p.lastSpokeAt = Date.now();
            // Trigger quiet spatial audio pulse if audio is alive
            if (this.audioCtx && Math.random() > 0.6) {
              this.playSpatialChirp(p.x, p.y, p.audioFrequency || 440);
            }
          }
        } else if (Math.random() > 0.7) {
          p.isSpeaking = false;
        }
      });

      this.updateActiveSpeakerDOM();
    }, 1400);
  }

  public stopSpeakingSimulation(): void {
    if (this.simIntervalId !== null) {
      clearInterval(this.simIntervalId);
      this.simIntervalId = null;
    }
    this.isSimulationActive = false;
  }

  /**
   * Update active speaker pulsing rings directly in the DOM without destroying dragging state.
   */
  private updateActiveSpeakerDOM(): void {
    if (!this.isOpen) return;

    this.participants.forEach((p) => {
      const nodeEl = document.getElementById(`spatial-node-${p.fingerprint}`);
      if (nodeEl) {
        const ringEl = nodeEl.querySelector('.speaking-indicator-ring');
        if (ringEl) {
          if (p.isSpeaking && !p.isMuted) {
            ringEl.classList.remove('hidden', 'opacity-0');
            ringEl.classList.add('animate-ping', 'opacity-75');
          } else {
            ringEl.classList.add('hidden', 'opacity-0');
            ringEl.classList.remove('animate-ping', 'opacity-75');
          }
        }
      }

      // Update VU meter bar in sidebar
      const vuEl = document.getElementById(`spatial-vu-${p.fingerprint}`);
      if (vuEl) {
        if (p.isSpeaking && !p.isMuted) {
          const randWidth = Math.floor(40 + Math.random() * 60);
          (vuEl as HTMLElement).style.width = `${randWidth}%`;
          vuEl.className = 'h-1.5 rounded-full bg-signal transition-all duration-150';
        } else {
          (vuEl as HTMLElement).style.width = '4%';
          vuEl.className = 'h-1.5 rounded-full bg-slate-700 transition-all duration-300';
        }
      }
    });
  }

  /**
   * Open the Spatial Audio Voice Lounge Modal.
   */
  public openModal(): void {
    this.isOpen = true;
    this.initAudioContext();

    const existingOverlay = document.getElementById('spatial-audio-modal-overlay');
    if (existingOverlay) {
      existingOverlay.outerHTML = this.renderSpatialModal();
    } else {
      const container = document.createElement('div');
      container.id = 'spatial-audio-container';
      container.innerHTML = this.renderSpatialModal();
      document.body.appendChild(container);
    }

    this.attachEvents(document);
  }

  /**
   * Close the Spatial Audio Voice Lounge Modal.
   */
  public closeModal(): void {
    this.isOpen = false;
    this.stopSpeakingSimulation();
    const overlay = document.getElementById('spatial-audio-modal-overlay');
    if (overlay) {
      overlay.remove();
    }
    const container = document.getElementById('spatial-audio-container');
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
   * Main Render Method: Generates the full HTML markup for the 2D Spatial Voice Lounge.
   */
  public renderSpatialModal(): string {
    const currentPreset = this.roomPresets[this.roomPreset];

    return `
      <div id="spatial-audio-modal-overlay" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
        <div class="relative w-full max-w-4xl bg-surface-base border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans max-h-[92vh]">
          
          <!-- Modal Header -->
          <div class="px-6 py-4 bg-surface-raised border-subtle-b flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-cyphr/10 border border-cyphr/30 flex items-center justify-center text-cyphr text-xl shadow-cyphr-sm">
                🎙️
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-base font-bold text-white tracking-wide">VOICE LOUNGE · 2D SPATIAL GRID</h2>
                  <span class="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded bg-signal/10 text-signal border border-signal/30">
                    OPUS 48kHz BINAURAL
                  </span>
                  <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-white/5 text-slate-300 border border-white/10">
                    ${this.participants.length + 1} PEERS IN RADAR
                  </span>
                </div>
                <p class="text-xs text-slate-400 font-mono mt-0.5">
                  Interactive acoustic field: Drag nodes to position stereo audio & distance attenuation.
                </p>
              </div>
            </div>

            <!-- Header Quick Actions -->
            <div class="flex items-center gap-2">
              <button id="spatial-btn-test-chirp" class="px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-surface-overlay hover:bg-slate-700 text-cyphr border border-cyphr/30 transition-all flex items-center gap-1.5 shadow-sm" title="Emit test binaural acoustic chirp">
                <span>⚡</span> Spatial Test Ping
              </button>
              <button id="spatial-modal-close-btn" class="w-8 h-8 rounded-lg bg-surface-overlay hover:bg-crimson/20 text-slate-400 hover:text-crimson transition-all flex items-center justify-center border border-white/5 text-lg font-bold" title="Close Lounge">
                ✕
              </button>
            </div>
          </div>

          <!-- Main Modal Body: 2D Radar Canvas & Side Controls -->
          <div class="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto bg-canvas/60">
            
            <!-- Left 7 Cols: 2D Acoustic Radar Interactive Viewport -->
            <div class="lg:col-span-7 flex flex-col items-center justify-center">
              <div class="relative w-full max-w-[400px] aspect-square rounded-2xl bg-surface-base border border-white/10 shadow-inner p-2 flex items-center justify-center overflow-hidden" id="spatial-radar-wrapper">
                
                <!-- Radar SVG Grid Backdrop -->
                ${this.renderRadarGridSVG()}

                <!-- Radar Scanning Sweep Line -->
                <div class="absolute inset-0 pointer-events-none rounded-full overflow-hidden flex items-center justify-center">
                  <div class="w-[360px] h-[360px] rounded-full border border-cyphr/15 animate-spin duration-[8000ms] linear opacity-40 bg-gradient-to-tr from-transparent via-cyphr/5 to-transparent"></div>
                </div>

                <!-- Interactive Radar Nodes Container -->
                <div id="spatial-radar-canvas" class="relative w-[400px] h-[400px] pointer-events-auto">
                  
                  <!-- Listener Node (Self) -->
                  ${this.renderListenerNode()}

                  <!-- Draggable Participant Nodes -->
                  ${this.renderParticipantNodes()}

                </div>

                <!-- Radar Compass Overlay Labels -->
                <div class="absolute top-2 text-[10px] font-mono font-bold text-slate-500 pointer-events-none">0° [N] FRONT</div>
                <div class="absolute bottom-2 text-[10px] font-mono font-bold text-slate-500 pointer-events-none">180° [S] REAR</div>
                <div class="absolute left-2 text-[10px] font-mono font-bold text-slate-500 pointer-events-none">270° [L]</div>
                <div class="absolute right-2 text-[10px] font-mono font-bold text-slate-500 pointer-events-none">90° [R]</div>

                <!-- Drag Instruction Badge -->
                <div class="absolute bottom-4 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-surface-raised/90 border border-white/10 text-[10px] font-mono text-slate-400 pointer-events-none shadow-md backdrop-blur-sm">
                  🖱️ Drag circles to pan & distance-fade
                </div>
              </div>

              <!-- Radar Auxiliary Toolbar -->
              <div class="w-full max-w-[400px] mt-3 flex items-center justify-between gap-2 px-1">
                <button id="spatial-btn-reset-grid" class="flex-1 py-1.5 text-xs font-mono rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/10 transition-all text-center">
                  ↺ Reset Positions
                </button>
                <button id="spatial-btn-randomize-grid" class="flex-1 py-1.5 text-xs font-mono rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/10 transition-all text-center">
                  🎲 Scatter Peers
                </button>
                <button id="spatial-btn-add-peer" class="flex-1 py-1.5 text-xs font-mono rounded-lg bg-cyphr/10 hover:bg-cyphr/20 text-cyphr border border-cyphr/30 transition-all text-center font-bold">
                  + Add Test Node
                </button>
              </div>
            </div>

            <!-- Right 5 Cols: Controls, Active Speakers & Room Acoustic HUD -->
            <div class="lg:col-span-5 flex flex-col gap-4">
              
              <!-- Acoustic Profile Selector -->
              <div class="p-3.5 rounded-xl bg-surface-raised border border-white/5 flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>${currentPreset.icon}</span> Acoustic Environment
                  </span>
                  <span class="text-[10px] font-mono text-cyphr">${currentPreset.filterFrequency} Hz LPF</span>
                </div>
                <div class="grid grid-cols-2 gap-1.5 mt-1">
                  ${(Object.keys(this.roomPresets) as RoomAcousticType[]).map((key) => {
                    const preset = this.roomPresets[key];
                    const isSelected = this.roomPreset === key;
                    return `
                      <button data-room-preset="${key}" class="room-preset-btn px-2.5 py-1.5 rounded-lg text-left text-xs transition-all border ${
                        isSelected
                          ? 'bg-cyphr/15 border-cyphr/40 text-cyphr font-bold shadow-cyphr-sm'
                          : 'bg-surface-base hover:bg-surface-overlay border-white/5 text-slate-400'
                      }">
                        <div class="flex items-center gap-1.5">
                          <span>${preset.icon}</span>
                          <span class="truncate">${preset.name}</span>
                        </div>
                      </button>
                    `;
                  }).join('')}
                </div>
                <p class="text-[11px] text-slate-400 mt-1 leading-snug">
                  ${currentPreset.description}
                </p>
              </div>

              <!-- Master Audio & Self Controls -->
              <div class="p-3.5 rounded-xl bg-surface-raised border border-white/5 flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Master Hardware & DSP</span>
                  <span class="text-[11px] font-mono ${this.isDeafened ? 'text-crimson font-bold' : 'text-signal'}">
                    ${this.isDeafened ? 'DEAFENED' : `${Math.round(this.masterVolume * 100)}% GAIN`}
                  </span>
                </div>

                <!-- Master Volume Slider -->
                <div class="flex items-center gap-3">
                  <span class="text-xs text-slate-400">🔊</span>
                  <input id="spatial-master-volume" type="range" min="0" max="100" value="${Math.round(this.masterVolume * 100)}" class="w-full accent-cyphr bg-surface-overlay h-1.5 rounded-lg cursor-pointer" />
                </div>

                <!-- Self Toggle Action Buttons -->
                <div class="grid grid-cols-2 gap-2 pt-1">
                  <button id="spatial-btn-self-mute" class="py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all border ${
                    this.isMicMuted
                      ? 'bg-crimson/20 border-crimson/40 text-crimson'
                      : 'bg-surface-base hover:bg-surface-overlay border-white/10 text-slate-200'
                  }">
                    <span>${this.isMicMuted ? '🔇' : '🎙️'}</span>
                    <span>${this.isMicMuted ? 'MIC MUTED' : 'MIC ACTIVE'}</span>
                  </button>

                  <button id="spatial-btn-self-deafen" class="py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all border ${
                    this.isDeafened
                      ? 'bg-crimson/20 border-crimson/40 text-crimson'
                      : 'bg-surface-base hover:bg-surface-overlay border-white/10 text-slate-200'
                  }">
                    <span>${this.isDeafened ? '🔕' : '🎧'}</span>
                    <span>${this.isDeafened ? 'DEAFENED' : 'DEAFEN'}</span>
                  </button>
                </div>
              </div>

              <!-- Participant Acoustic HUD List -->
              <div class="p-3.5 rounded-xl bg-surface-raised border border-white/5 flex flex-col gap-2 flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Spatial Audio Matrix</span>
                  <span class="text-[10px] font-mono text-slate-400">PAN / DISTANCE / LEVEL</span>
                </div>
                
                <div class="flex flex-col gap-2 max-h-[190px] overflow-y-auto pr-1" id="spatial-participant-list-hud">
                  ${this.renderSpeakerListHUD()}
                </div>
              </div>

            </div>

          </div>

          <!-- Modal Footer HUD -->
          <div class="px-6 py-3 bg-surface-raised border-t border-white/5 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono">
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1.5 text-cyphr">
                <span class="w-2 h-2 rounded-full bg-cyphr animate-ping"></span>
                Binaural 3D Pan Engine Active
              </span>
              <span class="text-slate-500">|</span>
              <span>Listener Pos: <span class="text-white font-bold">X:${this.myPosition.x} Y:${this.myPosition.y}</span></span>
              <span class="text-slate-500">|</span>
              <span>Acoustic Radius: <span class="text-white">${this.radarRadius}px</span></span>
            </div>
            
            <div class="flex items-center gap-3">
              <span class="text-slate-500">Aetheris Spatial Audio v2.4</span>
              <button id="spatial-modal-done-btn" class="px-4 py-1.5 bg-cyphr hover:bg-cyphr-light text-black font-bold rounded-lg transition-all shadow-cyphr-sm">
                Done
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Render the Background SVG Radar Rings, Angles, and Acoustic Thresholds.
   */
  private renderRadarGridSVG(): string {
    return `
      <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
        <defs>
          <radialGradient id="radarAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.08" />
            <stop offset="60%" stop-color="#00e5ff" stop-opacity="0.02" />
            <stop offset="100%" stop-color="#00e5ff" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Radar Background Gradient -->
        <circle cx="200" cy="200" r="175" fill="url(#radarAura)" stroke="#00e5ff" stroke-opacity="0.25" stroke-width="1.5" />

        <!-- Acoustic Concentric Range Circles -->
        <circle cx="200" cy="200" r="130" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1" stroke-dasharray="3,3" />
        <circle cx="200" cy="200" r="85" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="1" stroke-dasharray="3,3" />
        <circle cx="200" cy="200" r="40" fill="none" stroke="#00e5ff" stroke-opacity="0.2" stroke-width="1" />

        <!-- Crosshair Axes -->
        <line x1="200" y1="25" x2="200" y2="375" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
        <line x1="25" y1="200" x2="375" y2="200" stroke="rgba(255,255,255,0.08)" stroke-width="1" />

        <!-- 45 Degree Diagonal Guides -->
        <line x1="76" y1="76" x2="324" y2="324" stroke="rgba(255,255,255,0.04)" stroke-width="1" stroke-dasharray="2,4" />
        <line x1="324" y1="76" x2="76" y2="324" stroke="rgba(255,255,255,0.04)" stroke-width="1" stroke-dasharray="2,4" />

        <!-- Distance Range Markers in Metres -->
        <text x="204" y="165" fill="#64748b" font-size="9" font-family="monospace">1.0m</text>
        <text x="204" y="118" fill="#64748b" font-size="9" font-family="monospace">2.0m</text>
        <text x="204" y="73" fill="#64748b" font-size="9" font-family="monospace">3.5m</text>
      </svg>
    `;
  }

  /**
   * Render Listener Center Node (You / Self).
   */
  private renderListenerNode(): string {
    const left = this.myPosition.x - 22;
    const top = this.myPosition.y - 22;

    return `
      <div 
        id="spatial-node-self" 
        data-node-id="self"
        class="spatial-draggable-node absolute w-11 h-11 rounded-full cursor-grab active:cursor-grabbing flex flex-col items-center justify-center transition-transform duration-75 z-30 group"
        style="left: ${left}px; top: ${top}px;"
      >
        <!-- Listening Cone Indicator (Directional Beacon Facing Forward) -->
        <div class="absolute -top-3 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-cyphr opacity-80 pointer-events-none"></div>

        <!-- Glowing Core Circle -->
        <div class="w-10 h-10 rounded-full bg-surface-overlay border-2 border-cyphr flex items-center justify-center text-cyphr shadow-[0_0_15px_rgba(0,229,255,0.45)] group-hover:scale-105 transition-all">
          <span class="text-xs font-black font-mono">YOU</span>
        </div>

        <!-- Label Tag -->
        <div class="absolute top-11 px-2 py-0.5 rounded bg-surface-raised/95 border border-cyphr/30 text-[9px] font-mono text-cyphr font-bold whitespace-nowrap pointer-events-none shadow-md backdrop-blur-sm">
          Listener (Self)
        </div>
      </div>
    `;
  }

  /**
   * Render Draggable Participant Radar Nodes.
   */
  private renderParticipantNodes(): string {
    return this.participants.map((p) => {
      const left = p.x - 20;
      const top = p.y - 20;
      const metrics = this.calculateSpatialMetrics(p.x, p.y);
      const roleStyle = this.getRoleBadgeStyle(p.role);

      return `
        <div 
          id="spatial-node-${p.fingerprint}" 
          data-node-id="${p.fingerprint}"
          class="spatial-draggable-node absolute w-10 h-10 rounded-full cursor-grab active:cursor-grabbing flex flex-col items-center justify-center transition-transform duration-75 z-20 group"
          style="left: ${left}px; top: ${top}px;"
        >
          <!-- Active Speaker Acoustic Pulse Ring -->
          <div class="speaking-indicator-ring absolute -inset-2 rounded-full border-2 border-signal ${p.isSpeaking && !p.isMuted ? 'animate-ping opacity-75' : 'hidden opacity-0'} pointer-events-none"></div>
          
          <!-- Secondary Steady Aura Ring when Speaking -->
          <div class="speaking-aura absolute -inset-1 rounded-full bg-signal/20 ${p.isSpeaking && !p.isMuted ? 'opacity-100' : 'opacity-0'} transition-opacity pointer-events-none"></div>

          <!-- Participant Node Circle -->
          <div 
            class="w-9 h-9 rounded-full bg-surface-raised border-2 flex items-center justify-center text-white text-xs font-bold shadow-md transition-all group-hover:scale-110"
            style="border-color: ${p.isMuted ? '#ef4444' : roleStyle.borderColor};"
          >
            ${p.isMuted ? '🔇' : (p.displayName ? p.displayName.charAt(0).toUpperCase() : 'P')}
          </div>

          <!-- Participant Floating Badge -->
          <div class="absolute top-10 flex flex-col items-center pointer-events-none whitespace-nowrap z-30">
            <div class="px-1.5 py-0.5 rounded bg-surface-base/95 border border-white/10 text-[9px] font-mono flex items-center gap-1 shadow-md">
              <span class="font-bold text-white">${this.escapeHtml(p.displayName || p.fingerprint)}</span>
              <span class="text-[8px] font-mono ${p.isMuted ? 'text-crimson' : 'text-cyphr'}">
                ${metrics.pan === 0 ? 'C' : (metrics.pan > 0 ? `R${Math.round(metrics.pan * 100)}` : `L${Math.round(Math.abs(metrics.pan) * 100)}`)}
              </span>
            </div>
            <span class="text-[8px] font-mono text-slate-400 mt-0.5">${metrics.distanceMeters}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render Right-Side Participant Acoustic HUD list with live pan gauges and mute toggles.
   */
  private renderSpeakerListHUD(): string {
    if (this.participants.length === 0) {
      return `
        <div class="py-6 text-center text-xs text-slate-500 font-mono">
          No peers currently in the acoustic field.
        </div>
      `;
    }

    return this.participants.map((p) => {
      const metrics = this.calculateSpatialMetrics(p.x, p.y);
      const roleStyle = this.getRoleBadgeStyle(p.role);
      const panPercent = Math.round((metrics.pan + 1) * 50); // 0 (left) to 100 (right)

      return `
        <div class="p-2 rounded-lg bg-surface-base border border-white/5 flex flex-col gap-1.5 hover:border-white/10 transition-all">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border" style="background-color: ${roleStyle.bg}; border-color: ${roleStyle.borderColor};">
                ${p.isMuted ? '🔇' : (p.displayName ? p.displayName.charAt(0) : 'P')}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-xs font-bold text-white truncate max-w-[120px]">${this.escapeHtml(p.displayName || p.fingerprint)}</span>
                <span class="text-[9px] font-mono text-slate-400">${p.fingerprint}</span>
              </div>
            </div>

            <!-- Action Buttons: Ping & Mute -->
            <div class="flex items-center gap-1.5">
              <button 
                data-chirp-fp="${p.fingerprint}" 
                class="px-1.5 py-0.5 rounded bg-surface-overlay hover:bg-slate-700 text-[10px] font-mono text-cyphr border border-cyphr/20 transition-all"
                title="Ping Acoustic Node"
              >
                🔊 Ping
              </button>
              <button 
                data-mute-fp="${p.fingerprint}" 
                class="p-1 rounded bg-surface-overlay hover:bg-slate-700 text-xs transition-all ${p.isMuted ? 'text-crimson' : 'text-slate-300'}"
                title="${p.isMuted ? 'Unmute peer' : 'Mute peer'}"
              >
                ${p.isMuted ? '🔇' : '🎙️'}
              </button>
              <button 
                data-remove-fp="${p.fingerprint}" 
                class="p-1 rounded bg-surface-overlay hover:bg-crimson/20 text-xs text-slate-400 hover:text-crimson transition-all"
                title="Disconnect peer"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Pan Gauge & Distance Readout -->
          <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
            <span>Pan: <span class="text-slate-200">${metrics.pan === 0 ? 'Center' : (metrics.pan > 0 ? `Right ${Math.round(metrics.pan * 100)}%` : `Left ${Math.round(Math.abs(metrics.pan) * 100)}%`)}</span></span>
            <span>Dist: <span class="text-slate-200">${metrics.distanceMeters} (${metrics.distance}px)</span></span>
            <span>Gain: <span class="text-slate-200">${Math.round(metrics.gain * 100)}%</span></span>
          </div>

          <!-- Visual Stereophonic Panning Balance Bar -->
          <div class="w-full bg-surface-overlay h-1.5 rounded-full relative overflow-hidden flex items-center">
            <!-- Center Indicator Notch -->
            <div class="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-white/30 z-10"></div>
            <!-- Pan Slider Position Pin -->
            <div 
              class="h-full bg-cyphr transition-all duration-100" 
              style="width: 6px; position: absolute; left: calc(${panPercent}% - 3px); border-radius: 2px;"
            ></div>
          </div>

          <!-- Real-Time Voice VU Meter Bar -->
          <div class="w-full bg-surface-overlay h-1.5 rounded-full overflow-hidden">
            <div 
              id="spatial-vu-${p.fingerprint}" 
              class="h-full rounded-full transition-all duration-150 ${p.isSpeaking && !p.isMuted ? 'w-3/5 bg-signal' : 'w-[4%] bg-slate-700'}"
            ></div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Helper to return theme colors based on participant role.
   */
  private getRoleBadgeStyle(role: string): { bg: string; text: string; borderColor: string } {
    switch (role.toUpperCase()) {
      case 'ARCHON':
      case 'ADMIN':
        return { bg: 'rgba(0, 229, 255, 0.2)', text: '#00e5ff', borderColor: '#00e5ff' };
      case 'SENTINEL':
      case 'MODERATOR':
        return { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e', borderColor: '#22c55e' };
      case 'SCRIBE':
      case 'DEVELOPER':
        return { bg: 'rgba(168, 85, 247, 0.2)', text: '#a855f7', borderColor: '#a855f7' };
      case 'OPERATIVE':
        return { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b', borderColor: '#f59e0b' };
      default:
        return { bg: 'rgba(100, 116, 139, 0.2)', text: '#94a3b8', borderColor: '#64748b' };
    }
  }

  /**
   * Attach Interactive Pointer/Mouse/Drag & Action Event Listeners.
   */
  public attachEvents(root: HTMLElement | Document = document): void {
    const doc = typeof document !== 'undefined' ? document : (root as Document);
    // 1. Close Modal Handlers
    const closeBtn = doc.getElementById('spatial-modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }
    const doneBtn = doc.getElementById('spatial-modal-done-btn');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => this.closeModal());
    }

    // 2. Room Preset Switching
    const presetBtns = (root as HTMLElement).querySelectorAll?.('.room-preset-btn') || doc.querySelectorAll('.room-preset-btn');
    presetBtns.forEach((btn) => {
      (btn as HTMLElement).addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).getAttribute('data-room-preset') as RoomAcousticType;
        if (target && this.roomPresets[target]) {
          this.setRoomPreset(target);
          this.refreshModalDOM();
        }
      });
    });

    // 3. Master Volume Slider
    const volumeSlider = doc.getElementById('spatial-master-volume') as HTMLInputElement | null;
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
        this.setMasterVolume(val);
      });
    }

    // 4. Self Mute & Deafen Toggles
    const muteBtn = doc.getElementById('spatial-btn-self-mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        this.toggleSelfMute();
        this.refreshModalDOM();
      });
    }

    const deafenBtn = doc.getElementById('spatial-btn-self-deafen');
    if (deafenBtn) {
      deafenBtn.addEventListener('click', () => {
        this.toggleSelfDeafen();
        this.refreshModalDOM();
      });
    }

    // 5. Test Spatial Chirp Button
    const chirpBtn = doc.getElementById('spatial-btn-test-chirp');
    if (chirpBtn) {
      chirpBtn.addEventListener('click', () => {
        // Play acoustic test sweep at top-right position
        this.playSpatialChirp(280, 130, 520);
      });
    }

    // 6. Grid Auxiliary Buttons
    const resetBtn = doc.getElementById('spatial-btn-reset-grid');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetGridPositions();
        this.refreshModalDOM();
      });
    }

    const randomBtn = doc.getElementById('spatial-btn-randomize-grid');
    if (randomBtn) {
      randomBtn.addEventListener('click', () => {
        this.randomizePositions();
        this.refreshModalDOM();
      });
    }

    const addPeerBtn = doc.getElementById('spatial-btn-add-peer');
    if (addPeerBtn) {
      addPeerBtn.addEventListener('click', () => {
        const roles = ['ARCHON', 'SENTINEL', 'SCRIBE', 'OPERATIVE', 'GUEST'];
        const randomRole = roles[Math.floor(Math.random() * roles.length)];
        this.addParticipant({
          displayName: `Node-${Math.floor(100 + Math.random() * 900)}`,
          role: randomRole,
        });
        this.refreshModalDOM();
      });
    }

    // 7. Remote Participant HUD Action Buttons (Ping, Mute, Remove)
    const listHUD = doc.getElementById('spatial-participant-list-hud');
    if (listHUD) {
      listHUD.querySelectorAll('[data-chirp-fp]').forEach((btn: Element) => {
        (btn as HTMLElement).addEventListener('click', (e) => {
          const fp = (e.currentTarget as HTMLElement).getAttribute('data-chirp-fp');
          const p = this.participants.find((item) => item.fingerprint === fp);
          if (p) {
            this.playSpatialChirp(p.x, p.y, p.audioFrequency || 440);
          }
        });
      });

      listHUD.querySelectorAll('[data-mute-fp]').forEach((btn: Element) => {
        (btn as HTMLElement).addEventListener('click', (e) => {
          const fp = (e.currentTarget as HTMLElement).getAttribute('data-mute-fp');
          if (fp) {
            this.toggleParticipantMute(fp);
            this.refreshModalDOM();
          }
        });
      });

      listHUD.querySelectorAll('[data-remove-fp]').forEach((btn: Element) => {
        (btn as HTMLElement).addEventListener('click', (e) => {
          const fp = (e.currentTarget as HTMLElement).getAttribute('data-remove-fp');
          if (fp) {
            this.removeParticipant(fp);
            this.refreshModalDOM();
          }
        });
      });
    }

    // 8. Draggable 2D Radar Canvas Pointer Events
    this.setupRadarDragEvents();
  }

  /**
   * Set up PointerEvent-based 2D dragging for listener and participant nodes.
   */
  private setupRadarDragEvents(): void {
    const radarCanvas = document.getElementById('spatial-radar-canvas');
    if (!radarCanvas) return;

    const draggableNodes = radarCanvas.querySelectorAll<HTMLElement>('.spatial-draggable-node');

    draggableNodes.forEach((node) => {
      node.addEventListener('pointerdown', (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const nodeId = node.getAttribute('data-node-id');
        if (!nodeId) return;

        this.activeDragTarget = nodeId;
        node.setPointerCapture(e.pointerId);

        const canvasRect = radarCanvas.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();

        // Calculate offset from node center to cursor
        this.dragOffset = {
          x: e.clientX - (nodeRect.left + nodeRect.width / 2),
          y: e.clientY - (nodeRect.top + nodeRect.height / 2),
        };

        const onPointerMove = (moveEv: PointerEvent) => {
          if (this.activeDragTarget !== nodeId) return;

          const currentX = moveEv.clientX - canvasRect.left - this.dragOffset.x;
          const currentY = moveEv.clientY - canvasRect.top - this.dragOffset.y;

          if (nodeId === 'self') {
            this.setMyPosition(currentX, currentY);
            // Move self node DOM
            node.style.left = `${this.myPosition.x - 22}px`;
            node.style.top = `${this.myPosition.y - 22}px`;
          } else {
            this.updateParticipantPosition(nodeId, currentX, currentY);
            const p = this.participants.find((item) => item.fingerprint === nodeId);
            if (p) {
              node.style.left = `${p.x - 20}px`;
              node.style.top = `${p.y - 20}px`;
            }
          }

          this.updateHUDLiveMetrics();
        };

        const onPointerUp = (upEv: PointerEvent) => {
          node.releasePointerCapture(upEv.pointerId);
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
   * Update live metrics and pan gauges in HUD without destroying DOM during smooth dragging.
   */
  private updateHUDLiveMetrics(): void {
    const listHUD = document.getElementById('spatial-participant-list-hud');
    if (!listHUD) return;

    this.participants.forEach((p) => {
      const metrics = this.calculateSpatialMetrics(p.x, p.y);
      const nodeEl = document.getElementById(`spatial-node-${p.fingerprint}`);
      if (nodeEl) {
        const badgeSpan = nodeEl.querySelector('.text-cyphr');
        if (badgeSpan) {
          badgeSpan.textContent = metrics.pan === 0 ? 'C' : (metrics.pan > 0 ? `R${Math.round(metrics.pan * 100)}` : `L${Math.round(Math.abs(metrics.pan) * 100)}`);
        }
      }
    });
  }

  /**
   * Refresh modal content in place and re-bind event listeners.
   */
  private refreshModalDOM(): void {
    const overlay = document.getElementById('spatial-audio-modal-overlay');
    if (!overlay) return;

    const newHTML = this.renderSpatialModal();
    overlay.outerHTML = newHTML;
    this.attachEvents(document);
  }

  /**
   * Basic string escaping to prevent XSS.
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

export const spatialAudio = new SpatialAudioEngine();
