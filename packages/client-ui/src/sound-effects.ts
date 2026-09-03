// sound-effects.ts — Aetheris Omni-Sphere Procedural Web Audio API Sound Generator
// 100% Mathematically Synthesized Acoustic Engine — Zero external audio files

import { createSafeAudioContext } from './dry-utils.js';

export interface SoundPreferences {
  isEnabled: boolean;
  volume: number;
}

export type SoundEffectType =
  | 'upvote'
  | 'downvote'
  | 'notification'
  | 'reaction'
  | 'rekey'
  | 'voice-join'
  | 'voice-leave'
  | 'success'
  | 'security-alert'
  | 'send'
  | 'pop'
  | 'shield'
  | 'boost'
  | 'click';

/**
 * ProceduralSoundEffects provides fully synthesized, zero-latency acoustic feedback
 * using the Web Audio API without requiring any external audio assets or network requests.
 */
export class ProceduralSoundEffects {
  public audioCtx: AudioContext | null = null;
  public isEnabled: boolean = true;
  public volume: number = 0.2; // Value between 0.0 and 1.0

  private readonly STORAGE_KEY: string = 'aetheris_audio_fx';
  private hasRegisteredGestureListener: boolean = false;

  constructor() {
    this.loadPreferences();
    this.setupAutoInit();
  }

  // ─── Lifecycle & Settings ──────────────────────────────────────────────────

  /**
   * Loads user audio preferences from localStorage
   */
  private loadPreferences(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<SoundPreferences>;
        if (typeof parsed.isEnabled === 'boolean') {
          this.isEnabled = parsed.isEnabled;
        }
        if (typeof parsed.volume === 'number' && !isNaN(parsed.volume)) {
          this.volume = Math.max(0, Math.min(1, parsed.volume));
        }
      }
    } catch {
      // Fallback for legacy raw boolean string
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw === 'false') this.isEnabled = false;
      if (raw === 'true') this.isEnabled = true;
    }
  }

  /**
   * Persists user audio preferences to localStorage
   */
  private savePreferences(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

    try {
      const payload: SoundPreferences = {
        isEnabled: this.isEnabled,
        volume: this.volume,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('[SoundEffects] Failed to save preferences to localStorage:', err);
    }
  }

  /**
   * Registers one-time user interaction listeners to initialize AudioContext
   * to comply with modern browser autoplay policies.
   */
  private setupAutoInit(): void {
    if (typeof window === 'undefined' || this.hasRegisteredGestureListener) return;

    this.hasRegisteredGestureListener = true;
    const gestureEvents = ['click', 'keydown', 'touchstart', 'pointerdown'];

    const onGesture = (): void => {
      this.initAudio();
      for (const evt of gestureEvents) {
        window.removeEventListener(evt, onGesture);
      }
    };

    for (const evt of gestureEvents) {
      window.addEventListener(evt, onGesture, { once: true, passive: true });
    }
  }

  /**
   * Initializes or resumes the AudioContext upon user gesture.
   */
  public initAudio(): void {
    if (typeof window === 'undefined') return;

    try {
      if (!this.audioCtx) {
        this.audioCtx = createSafeAudioContext();
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }
    } catch (err) {
      console.warn('[SoundEffects] AudioContext initialization failed:', err);
    }
  }

  /**
   * Toggles sound on/off and triggers a subtle acoustic confirmation if enabled.
   */
  public toggleSound(): void {
    this.isEnabled = !this.isEnabled;
    this.savePreferences();

    if (this.isEnabled) {
      this.initAudio();
      this.playReaction();
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aetheris:sound-toggle', {
          detail: { isEnabled: this.isEnabled, volume: this.volume },
        })
      );
    }
  }

  /**
   * Sets the global volume (clamped between 0.0 and 1.0)
   */
  public setVolume(vol: number): void {
    if (isNaN(vol)) return;
    this.volume = Math.max(0, Math.min(1, vol));
    this.savePreferences();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aetheris:volume-change', {
          detail: { isEnabled: this.isEnabled, volume: this.volume },
        })
      );
    }
  }

  /**
   * Internal helper to verify if audio playback can proceed
   */
  private canPlay(): boolean {
    return this.isEnabled && this.volume > 0.001;
  }

  /**
   * Internal helper to create a calibrated Master Gain node for consistent volume scaling
   */
  private createMasterGain(ctx: AudioContext): GainNode {
    const gain = ctx.createGain();
    const effectiveGain = Math.max(0.0001, Math.min(1.0, this.volume));
    gain.gain.setValueAtTime(effectiveGain, ctx.currentTime);
    gain.connect(ctx.destination);
    return gain;
  }

  // ─── Procedural Acoustic Synthesizers ──────────────────────────────────────

  /**
   * 1. Upvote: Satisfying mechanical click with ascending pitch
   *    Frequency 320Hz -> 520Hz over 45ms with bandpass filtering.
   */
  public playUpvote(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    // Resonant tone generator (320Hz -> 520Hz over 45ms)
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.045);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(820, now);
    filter.Q.setValueAtTime(3.2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.48, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    // Mechanical transient click impulse
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();

    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(1450, now);
    clickOsc.frequency.exponentialRampToValueAtTime(320, now + 0.006);

    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.linearRampToValueAtTime(0.32, now + 0.001);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.006);

    clickOsc.connect(clickGain);
    clickGain.connect(master);

    osc.start(now);
    osc.stop(now + 0.045);
    clickOsc.start(now);
    clickOsc.stop(now + 0.007);
  }

  /**
   * 2. Downvote: Discrete subtle mechanical click with descending pitch
   *    Frequency 480Hz -> 260Hz over 55ms.
   */
  public playDownvote(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.055);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(580, now);
    filter.Q.setValueAtTime(1.8, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + 0.055);
  }

  /**
   * 3. Notification: Crystal angelic chiming
   *    Two harmonic sine frequencies (880Hz + 1320Hz) with 200ms exponential decay.
   */
  public playNotification(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);
    const duration = 0.22; // ~200ms

    // Dual harmonic sine generators: Fundamental (A5 = 880Hz) + Perfect 5th (E6 = 1320Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const oscShimmer = ctx.createOscillator();

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const gainShimmer = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now);

    oscShimmer.type = 'sine';
    oscShimmer.frequency.setValueAtTime(2640, now); // 2nd octave shimmer

    // Crystal envelope curves
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.38, now + 0.006);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.linearRampToValueAtTime(0.28, now + 0.008);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    gainShimmer.gain.setValueAtTime(0.0001, now);
    gainShimmer.gain.linearRampToValueAtTime(0.08, now + 0.004);
    gainShimmer.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc1.connect(gain1);
    osc2.connect(gain2);
    oscShimmer.connect(gainShimmer);

    gain1.connect(master);
    gain2.connect(master);
    gainShimmer.connect(master);

    osc1.start(now);
    osc2.start(now);
    oscShimmer.start(now);

    osc1.stop(now + duration);
    osc2.stop(now + duration);
    oscShimmer.stop(now + duration);
  }

  /**
   * 4. Reaction: Playful little "bloop" with modulating frequency
   *    Frequency 600Hz -> 900Hz over 80ms.
   */
  public playReaction(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + 0.085);
  }

  /**
   * 5. Rekey: Filtered "white noise" whoosh signifying TreeKEM continuous rekeying
   */
  public playRekey(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);
    const duration = 0.24; // 240ms

    // Synthesize 1-channel white noise buffer
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Sweeping resonant bandpass filter (whoosh curve)
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.6, now);
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(2900, now + 0.09);
    filter.frequency.exponentialRampToValueAtTime(420, now + duration);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(0.36, now + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(master);

    // Cryptographic low sub-ratchet pulse
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(190, now);
    subOsc.frequency.exponentialRampToValueAtTime(80, now + duration);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    subOsc.connect(subGain);
    subGain.connect(master);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
    subOsc.start(now);
    subOsc.stop(now + duration);
  }

  /**
   * 6. VoiceJoin: Spatial harmony for entering voice lounge
   *    Rich multi-harmonic celestial arpeggio with spatial stereo spread.
   */
  public playVoiceJoin(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    // Celestial major 9th chord arpeggio: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), B5 (987.77Hz)
    const chordNotes = [
      { freq: 523.25, offset: 0.000, pan: -0.45, gain: 0.28 },
      { freq: 659.25, offset: 0.035, pan: 0.35, gain: 0.25 },
      { freq: 783.99, offset: 0.070, pan: -0.25, gain: 0.22 },
      { freq: 987.77, offset: 0.105, pan: 0.45, gain: 0.18 },
    ];

    const totalDuration = 0.52;

    for (const note of chordNotes) {
      const startTime = now + note.offset;
      const noteDuration = totalDuration - note.offset;

      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, startTime);

      noteGain.gain.setValueAtTime(0.0001, startTime);
      noteGain.gain.linearRampToValueAtTime(note.gain, startTime + 0.025);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDuration);

      osc.connect(filter);
      filter.connect(noteGain);

      // Stereo spatial positioning if browser supports StereoPannerNode
      if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(note.pan, startTime);
        noteGain.connect(panner);
        panner.connect(master);
      } else {
        noteGain.connect(master);
      }

      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    }
  }

  /**
   * VoiceLeave: Soothing descending harmonic release when disconnecting from voice
   */
  public playVoiceLeave(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    const chordNotes = [
      { freq: 783.99, offset: 0.000, gain: 0.24 },
      { freq: 659.25, offset: 0.040, gain: 0.22 },
      { freq: 523.25, offset: 0.080, gain: 0.26 },
    ];

    const totalDuration = 0.42;

    for (const note of chordNotes) {
      const startTime = now + note.offset;
      const noteDuration = totalDuration - note.offset;

      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, startTime);

      noteGain.gain.setValueAtTime(0.0001, startTime);
      noteGain.gain.linearRampToValueAtTime(note.gain, startTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDuration);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(master);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    }
  }

  /**
   * Success: Ascending three-tone triumph chime
   */
  public playSuccess(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    const notes = [
      { freq: 523.25, offset: 0.000, duration: 0.12 }, // C5
      { freq: 659.25, offset: 0.060, duration: 0.12 }, // E5
      { freq: 1046.50, offset: 0.120, duration: 0.25 }, // C6
    ];

    for (const note of notes) {
      const startTime = now + note.offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.32, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + note.duration);

      osc.connect(gain);
      gain.connect(master);

      osc.start(startTime);
      osc.stop(startTime + note.duration);
    }
  }

  /**
   * SecurityAlert: Two-tone cryptographic advisory alert
   */
  public playSecurityAlert(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    const pulses = [
      { freq: 620, offset: 0.000, duration: 0.08 },
      { freq: 440, offset: 0.090, duration: 0.14 },
    ];

    for (const pulse of pulses) {
      const startTime = now + pulse.offset;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pulse.freq, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + pulse.duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(startTime);
      osc.stop(startTime + pulse.duration);
    }
  }

  /**
   * Send: Sleek transmission sweep for publishing nanopublications or sending messages
   */
  public playSend(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.075);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Pop: Subtle micro bubble pop for toggle buttons and dropdown menus
   */
  public playPop(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.025);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    osc.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + 0.025);
  }

  /**
   * Shield: Resonant harmonic sweep for Zero-Knowledge proof and cryptographic shield verification
   */
  public playShield(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);
    const duration = 0.28;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(440, now);
    filter.frequency.exponentialRampToValueAtTime(1760, now + duration);
    filter.Q.setValueAtTime(4.5, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Boost: Dual-oscillator ascending warp sweep with dynamic resonance & harmonic spread
   * Ascending harmonic major 3rd (380Hz & 475Hz -> 760Hz & 950Hz over 130ms).
   */
  public playBoost(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);
    const duration = 0.14;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(380, now);
    osc1.frequency.exponentialRampToValueAtTime(760, now + duration);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(475, now);
    osc2.frequency.exponentialRampToValueAtTime(950, now + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + duration);
    filter.Q.setValueAtTime(3.5, now);

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.42, now + 0.008);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.linearRampToValueAtTime(0.28, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(master);

    osc2.connect(gain2);
    gain2.connect(master);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  /**
   * Click: Crisp tactile micro-impulse for buttons and UI interactive elements
   */
  public playClick(): void {
    if (!this.canPlay()) return;
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.015);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(600, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + 0.016);
  }

  /**
   * Play any effect by name key
   */
  public play(name: SoundEffectType): void {
    switch (name) {
      case 'upvote':
        this.playUpvote();
        break;
      case 'downvote':
        this.playDownvote();
        break;
      case 'notification':
        this.playNotification();
        break;
      case 'reaction':
        this.playReaction();
        break;
      case 'rekey':
        this.playRekey();
        break;
      case 'voice-join':
        this.playVoiceJoin();
        break;
      case 'voice-leave':
        this.playVoiceLeave();
        break;
      case 'success':
        this.playSuccess();
        break;
      case 'security-alert':
        this.playSecurityAlert();
        break;
      case 'send':
        this.playSend();
        break;
      case 'pop':
        this.playPop();
        break;
      case 'shield':
        this.playShield();
        break;
      case 'boost':
        this.playBoost();
        break;
      case 'click':
        this.playClick();
        break;
    }
  }

  // ─── UI Renderers & Bindings ───────────────────────────────────────────────

  /**
   * Renders a small toggle button (🔊 / 🔇) for inclusion in header or footer.
   * Conforms strictly to Aetheris dark Tailwind theme classes.
   */
  public renderSoundToggle(): string {
    const isMuted = !this.isEnabled;
    const volPercent = Math.round(this.volume * 100);

    return `
      <button
        type="button"
        data-action="toggle-sound"
        id="aetheris-sound-toggle-btn"
        title="${this.isEnabled ? `Mute Audio Effects (${volPercent}%)` : 'Unmute Audio Effects'}"
        aria-label="${this.isEnabled ? 'Audio FX Enabled' : 'Audio FX Muted'}"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all border border-white/5 ${
          this.isEnabled
            ? 'bg-surface-raised hover:bg-surface-overlay text-cyphr shadow-sm shadow-cyan-950/20'
            : 'bg-surface-base hover:bg-surface-raised text-slate-500 hover:text-slate-300'
        }"
      >
        <span class="text-sm select-none" aria-hidden="true">${isMuted ? '🔇' : '🔊'}</span>
        <span class="hidden sm:inline font-sans text-[11px] font-medium tracking-wide">
          ${isMuted ? 'FX OFF' : 'FX ON'}
        </span>
        ${
          this.isEnabled
            ? '<span class="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" title="Acoustic Engine Active"></span>'
            : '<span class="w-1.5 h-1.5 rounded-full bg-crimson/60" title="Acoustic Engine Muted"></span>'
        }
      </button>
    `.trim();
  }

  /**
   * Renders a complete acoustic settings widget with volume slider and test triggers.
   */
  public renderSoundControls(): string {
    const volPercent = Math.round(this.volume * 100);

    return `
      <div class="p-3 bg-surface-raised rounded-lg border border-white/5 space-y-3 font-sans text-xs">
        <div class="flex items-center justify-between border-subtle-b pb-2">
          <div class="flex items-center gap-2">
            <span class="text-base select-none">${this.isEnabled ? '🔊' : '🔇'}</span>
            <div>
              <div class="font-medium text-slate-200">Acoustic Synthesizer</div>
              <div class="text-[10px] text-slate-400 font-mono">Zero-Asset Web Audio FX</div>
            </div>
          </div>
          ${this.renderSoundToggle()}
        </div>

        <div class="space-y-1.5">
          <div class="flex justify-between items-center text-[11px] text-slate-300 font-mono">
            <span>FX Volume</span>
            <span class="text-cyphr font-bold">${volPercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value="${this.volume}"
            data-action="sound-volume"
            aria-label="Sound Effects Volume"
            class="w-full h-1.5 bg-surface-base rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div class="pt-1">
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-mono mb-1.5">Test FX Triggers</div>
          <div class="grid grid-cols-4 gap-1.5">
            <button type="button" data-sound-test="upvote" class="px-2 py-1 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-signal font-mono border border-white/5 transition-all text-center">
              ▲ Upvote
            </button>
            <button type="button" data-sound-test="downvote" class="px-2 py-1 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-amber font-mono border border-white/5 transition-all text-center">
              ▼ Downvote
            </button>
            <button type="button" data-sound-test="boost" class="px-2 py-1 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-emerald-400 font-mono border border-white/5 transition-all text-center">
              ⟳ Boost
            </button>
            <button type="button" data-sound-test="send" class="px-2 py-1 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-indigo-400 font-mono border border-white/5 transition-all text-center">
              ⚡ Send
            </button>
            <button type="button" data-sound-test="notification" class="px-2 py-1 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-cyphr font-mono border border-white/5 transition-all text-center">
              🔔 Chime
            </button>
            <button type="button" data-sound-test="reaction" class="px-2 py-1 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-aether font-mono border border-white/5 transition-all text-center">
              💬 Bloop
            </button>
            <button type="button" data-sound-test="rekey" class="px-2 py-1 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-slate-300 font-mono border border-white/5 transition-all text-center">
              🔑 Rekey
            </button>
            <button type="button" data-sound-test="voice-join" class="px-2 py-1 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-cyphr font-mono border border-white/5 transition-all text-center">
              🎙️ Voice
            </button>
          </div>
        </div>
      </div>
    `.trim();
  }

  /**
   * Binds interactive click and input handlers for rendered sound toggle and control elements.
   */
  public bindUIEvents(root: Document | HTMLElement = typeof document !== 'undefined' ? document : ({} as Document)): void {
    if (typeof document === 'undefined' || !root || typeof root.querySelectorAll !== 'function') return;

    // Toggle sound button clicks
    const toggleButtons = root.querySelectorAll('[data-action="toggle-sound"]');
    toggleButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleSound();
      });
    });

    // Volume range slider inputs
    const volumeSliders = root.querySelectorAll<HTMLInputElement>('[data-action="sound-volume"]');
    volumeSliders.forEach((slider) => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const val = parseFloat(target.value);
        if (!isNaN(val)) {
          this.setVolume(val);
        }
      });
    });

    // Test preview buttons
    const testButtons = root.querySelectorAll('[data-sound-test]');
    testButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const soundType = btn.getAttribute('data-sound-test') as SoundEffectType | null;
        if (soundType) {
          this.play(soundType);
        }
      });
    });
  }
}

// Export singleton instance
export const soundEffects: ProceduralSoundEffects = new ProceduralSoundEffects();
