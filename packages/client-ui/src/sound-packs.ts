/**
 * UREfy HYBRID SUITE — PROCEDURAL SOUND & HAPTIC PACKS (Item 12)
 *
 * 100% Mathematically Synthesized Web Audio API Acoustic Themes with Zero External HTTP Assets.
 * Provides 4 distinct procedural sound themes:
 *   1. CYBERPUNK_NEON: Sawtooth FM synthesized chirps, high-resonance cyber blips, neon chime on upvotes.
 *   2. ACOUSTIC_ZEN: Soft pure sine waves, wooden percussion harmonics, gentle meditative notification tone.
 *   3. MINIMAL_HAPTIC: Sub-bass thump (45Hz sine), crisp 2ms mechanical micro-click.
 *   4. RETRO_8BIT: Dual square-wave retro arpeggio, arcade level-up fanfare.
 *
 * Sound Events: POST_UPVOTE, POST_DOWNVOTE, MESSAGE_SENT, MESSAGE_RECEIVED, MODAL_OPEN, MODAL_CLOSE, SWARM_COMPLETE.
 * Haptic Feedback Engine: navigator.vibrate integration with distinct haptic rhythms & desktop fallbacks.
 * Interactive UI widget for Theme Customizer and Settings.
 */

import { createSafeAudioContext } from './dry-utils.js';

export type SoundThemeId = 'CYBERPUNK_NEON' | 'ACOUSTIC_ZEN' | 'MINIMAL_HAPTIC' | 'RETRO_8BIT';

export type SoundEventId =
  | 'POST_UPVOTE'
  | 'POST_DOWNVOTE'
  | 'MESSAGE_SENT'
  | 'MESSAGE_RECEIVED'
  | 'MODAL_OPEN'
  | 'MODAL_CLOSE'
  | 'SWARM_COMPLETE';

export interface SoundThemeConfig {
  id: SoundThemeId;
  name: string;
  badge: string;
  description: string;
  accentColor: string;
  icon: string;
}

export interface SoundPackPreferences {
  theme: SoundThemeId;
  isEnabled: boolean;
  volume: number; // [0.0, 1.0]
  isHapticsEnabled: boolean;
}

export const SOUND_THEMES: Record<SoundThemeId, SoundThemeConfig> = {
  CYBERPUNK_NEON: {
    id: 'CYBERPUNK_NEON',
    name: 'Cyberpunk Neon',
    badge: 'FM SYNTH',
    description: 'Sawtooth FM synthesized chirps, high-resonance cyber blips, and neon bell chimes.',
    accentColor: '#00e5ff',
    icon: '⚡',
  },
  ACOUSTIC_ZEN: {
    id: 'ACOUSTIC_ZEN',
    name: 'Acoustic Zen',
    badge: 'ORGANIC',
    description: 'Soft pure sine waves, wooden percussion harmonics, and meditative singing bowl tones.',
    accentColor: '#10b981',
    icon: '🍃',
  },
  MINIMAL_HAPTIC: {
    id: 'MINIMAL_HAPTIC',
    name: 'Minimal Haptic',
    badge: 'TACTILE',
    description: 'Sub-bass thumps (45Hz sine), crisp 2ms mechanical micro-clicks, and clean pulses.',
    accentColor: '#6366f1',
    icon: '🎯',
  },
  RETRO_8BIT: {
    id: 'RETRO_8BIT',
    name: 'Retro 8-Bit',
    badge: 'CHIPTUNE',
    description: 'Dual square-wave retro arpeggios, classic game blips, and arcade level-up fanfares.',
    accentColor: '#f59e0b',
    icon: '👾',
  },
};

export const HAPTIC_PATTERNS: Record<string, number[]> = {
  POST_UPVOTE: [15],
  AWARD: [20, 30, 20],
  ERROR: [50, 50, 50],
  MESSAGE_SENT: [10],
  MESSAGE_RECEIVED: [15, 30, 15],
  MODAL_OPEN: [8],
  MODAL_CLOSE: [8],
  SWARM_COMPLETE: [30, 50, 30, 50, 60],
};

export class ProceduralSoundPacksEngine {
  public audioCtx: AudioContext | null = null;
  public currentTheme: SoundThemeId = 'CYBERPUNK_NEON';
  public isEnabled: boolean = true;
  public volume: number = 0.45;
  public isHapticsEnabled: boolean = true;

  private readonly STORAGE_KEY = 'aetheris_sound_pack_prefs';

  constructor() {
    this.loadPreferences();
  }

  /**
   * Load stored preferences from localStorage.
   */
  public loadPreferences(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SoundPackPreferences>;
        if (parsed.theme && SOUND_THEMES[parsed.theme]) {
          this.currentTheme = parsed.theme;
        }
        if (typeof parsed.isEnabled === 'boolean') {
          this.isEnabled = parsed.isEnabled;
        }
        if (typeof parsed.volume === 'number' && !isNaN(parsed.volume)) {
          this.volume = Math.max(0, Math.min(1.0, parsed.volume));
        }
        if (typeof parsed.isHapticsEnabled === 'boolean') {
          this.isHapticsEnabled = parsed.isHapticsEnabled;
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }

  /**
   * Persist current audio and haptic preferences to localStorage.
   */
  public savePreferences(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const payload: SoundPackPreferences = {
        theme: this.currentTheme,
        isEnabled: this.isEnabled,
        volume: this.volume,
        isHapticsEnabled: this.isHapticsEnabled,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage write errors
    }
  }

  /**
   * Initialize or resume Web Audio API AudioContext.
   */
  public initAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        this.audioCtx = createSafeAudioContext();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (err) {
      console.warn('[SoundPacks] AudioContext initialization deferred:', err);
      return null;
    }
  }

  /**
   * Set active sound theme.
   */
  public setTheme(theme: SoundThemeId): void {
    if (!SOUND_THEMES[theme]) return;
    this.currentTheme = theme;
    this.savePreferences();
  }

  /**
   * Set master sound pack volume [0.0 to 1.0].
   */
  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1.0, vol));
    this.savePreferences();
  }

  /**
   * Toggle sound synthesis on or off.
   */
  public toggleSound(): boolean {
    this.isEnabled = !this.isEnabled;
    this.savePreferences();
    return this.isEnabled;
  }

  /**
   * Toggle physical haptic feedback on or off.
   */
  public toggleHaptics(): boolean {
    this.isHapticsEnabled = !this.isHapticsEnabled;
    this.savePreferences();
    return this.isHapticsEnabled;
  }

  /**
   * Trigger physical haptic feedback with pattern via navigator.vibrate.
   * Graceful fallback when unsupported or when disabled.
   */
  public triggerHaptic(pattern: number | number[]): boolean {
    if (!this.isHapticsEnabled) return false;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return false;
    }
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  /**
   * Trigger haptics for predefined event key.
   */
  public triggerEventHaptic(event: SoundEventId | 'AWARD' | 'ERROR'): boolean {
    const pattern = HAPTIC_PATTERNS[event];
    if (pattern) {
      return this.triggerHaptic(pattern);
    }
    return false;
  }

  /**
   * Helper to create master volume gain node for consistent attenuation.
   */
  private createMasterGain(ctx: AudioContext): GainNode {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume, ctx.currentTime);
    gain.connect(ctx.destination);
    return gain;
  }

  /**
   * Play any sound event using current active theme or specified theme override.
   */
  public play(event: SoundEventId, themeOverride?: SoundThemeId): void {
    const theme = themeOverride || this.currentTheme;

    // Trigger haptic vibration first for instantaneous sensory response
    this.triggerEventHaptic(event);

    if (!this.isEnabled || this.volume < 0.001) return;
    const ctx = this.initAudioContext();
    if (!ctx) return;

    switch (theme) {
      case 'CYBERPUNK_NEON':
        this.synthesizeCyberpunkNeon(ctx, event);
        break;
      case 'ACOUSTIC_ZEN':
        this.synthesizeAcousticZen(ctx, event);
        break;
      case 'MINIMAL_HAPTIC':
        this.synthesizeMinimalHaptic(ctx, event);
        break;
      case 'RETRO_8BIT':
        this.synthesizeRetro8Bit(ctx, event);
        break;
    }
  }

  // ── Convenience Methods ───────────────────────────────────────────────────

  public playUpvote(): void {
    this.play('POST_UPVOTE');
  }

  public playDownvote(): void {
    this.play('POST_DOWNVOTE');
  }

  public playMessageSent(): void {
    this.play('MESSAGE_SENT');
  }

  public playMessageReceived(): void {
    this.play('MESSAGE_RECEIVED');
  }

  public playModalOpen(): void {
    this.play('MODAL_OPEN');
  }

  public playModalClose(): void {
    this.play('MODAL_CLOSE');
  }

  public playSwarmComplete(): void {
    this.play('SWARM_COMPLETE');
  }

  // ── Procedural Theme 1: CYBERPUNK_NEON ────────────────────────────────────
  /**
   * Sawtooth FM synthesized chirps, high-resonance cyber blips, neon bell chimes.
   */
  private synthesizeCyberpunkNeon(ctx: AudioContext, event: SoundEventId): void {
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    switch (event) {
      case 'POST_UPVOTE': {
        // Neon Chime: FM bell synthesis with sawtooth carrier & high-resonance shimmer
        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        const carrierGain = ctx.createGain();

        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(587.33, now); // D5
        carrier.frequency.exponentialRampToValueAtTime(880, now + 0.14);

        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(1174.66, now); // 2x harmonic
        modGain.gain.setValueAtTime(450, now);
        modGain.gain.exponentialRampToValueAtTime(10, now + 0.16);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        // High shimmer bandpass filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2400, now);
        filter.Q.setValueAtTime(4.5, now);

        carrierGain.gain.setValueAtTime(0.0001, now);
        carrierGain.gain.linearRampToValueAtTime(0.35, now + 0.008);
        carrierGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        carrier.connect(filter);
        filter.connect(carrierGain);
        carrierGain.connect(master);

        modulator.start(now);
        carrier.start(now);
        modulator.stop(now + 0.18);
        carrier.stop(now + 0.18);
        break;
      }

      case 'POST_DOWNVOTE': {
        // High-resonance cyber blip descending
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(460, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.09);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(320, now + 0.09);
        filter.Q.setValueAtTime(7.0, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.38, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'MESSAGE_SENT': {
        // Sawtooth FM synthesized chirp
        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        const gain = ctx.createGain();

        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(440, now);
        carrier.frequency.exponentialRampToValueAtTime(880, now + 0.065);

        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(220, now);
        modGain.gain.setValueAtTime(300, now);
        modGain.gain.exponentialRampToValueAtTime(20, now + 0.065);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        carrier.connect(gain);
        gain.connect(master);

        modulator.start(now);
        carrier.start(now);
        modulator.stop(now + 0.07);
        carrier.stop(now + 0.07);
        break;
      }

      case 'MESSAGE_RECEIVED': {
        // Dual high-resonance cyber blip
        const notes = [
          { freq: 880, offset: 0, dur: 0.05 },
          { freq: 1320, offset: 0.045, dur: 0.07 },
        ];

        for (const n of notes) {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(n.freq, now + n.offset);

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(n.freq * 1.6, now + n.offset);
          filter.Q.setValueAtTime(8.5, now + n.offset);

          gain.gain.setValueAtTime(0.0001, now + n.offset);
          gain.gain.linearRampToValueAtTime(0.32, now + n.offset + 0.004);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + n.offset + n.dur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(master);

          osc.start(now + n.offset);
          osc.stop(now + n.offset + n.dur);
        }
        break;
      }

      case 'MODAL_OPEN': {
        // Cyber holographic sweep up
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.11);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(2400, now + 0.11);
        filter.Q.setValueAtTime(5.5, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.32, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case 'MODAL_CLOSE': {
        // Cyber holographic sweep down
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(740, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.09);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.frequency.exponentialRampToValueAtTime(380, now + 0.09);
        filter.Q.setValueAtTime(4.0, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'SWARM_COMPLETE': {
        // Cyberspace neon crescendo
        const chord = [261.63, 329.63, 392.0, 523.25]; // C-E-G-C triad
        const duration = 0.38;

        for (let i = 0; i < chord.length; i++) {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(chord[i], now);
          osc.frequency.exponentialRampToValueAtTime(chord[i] * 1.5, now + duration);

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(600 + i * 200, now);
          filter.frequency.exponentialRampToValueAtTime(2800, now + duration);
          filter.Q.setValueAtTime(6.0, now);

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(0.22, now + 0.02 + i * 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(master);

          osc.start(now);
          osc.stop(now + duration);
        }
        break;
      }
    }
  }

  // ── Procedural Theme 2: ACOUSTIC_ZEN ─────────────────────────────────────
  /**
   * Soft pure sine waves, wooden percussion harmonics, gentle meditative notification tones.
   */
  private synthesizeAcousticZen(ctx: AudioContext, event: SoundEventId): void {
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    switch (event) {
      case 'POST_UPVOTE': {
        // Warm wooden marimba resonant interval (ascending)
        const notes = [
          { freq: 440, offset: 0, dur: 0.12 },
          { freq: 554.37, offset: 0.04, dur: 0.16 }, // C#5
        ];

        for (const n of notes) {
          const osc = ctx.createOscillator();
          const overtone = ctx.createOscillator();
          const gain = ctx.createGain();
          const otGain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.freq, now + n.offset);

          // Wooden percussion 3.9x harmonic overtone
          overtone.type = 'sine';
          overtone.frequency.setValueAtTime(n.freq * 3.9, now + n.offset);

          gain.gain.setValueAtTime(0.0001, now + n.offset);
          gain.gain.linearRampToValueAtTime(0.35, now + n.offset + 0.004);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + n.offset + n.dur);

          otGain.gain.setValueAtTime(0.0001, now + n.offset);
          otGain.gain.linearRampToValueAtTime(0.12, now + n.offset + 0.002);
          otGain.gain.exponentialRampToValueAtTime(0.0001, now + n.offset + n.dur * 0.4);

          osc.connect(gain);
          overtone.connect(otGain);
          gain.connect(master);
          otGain.connect(master);

          osc.start(now + n.offset);
          overtone.start(now + n.offset);
          osc.stop(now + n.offset + n.dur);
          overtone.stop(now + n.offset + n.dur * 0.4);
        }
        break;
      }

      case 'POST_DOWNVOTE': {
        // Soft descending sine drop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(329.63, now); // E4
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.13);
        break;
      }

      case 'MESSAGE_SENT': {
        // Soft pure sine droplet
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.05);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.32, now + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }

      case 'MESSAGE_RECEIVED': {
        // Gentle meditative notification tone (432Hz fundamental + 540Hz singing bowl chime)
        const partials = [
          { freq: 432, gain: 0.32, dur: 0.32 },
          { freq: 540, gain: 0.18, dur: 0.28 },
          { freq: 864, gain: 0.08, dur: 0.18 },
        ];

        for (const p of partials) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(p.freq, now);

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(p.gain, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);

          osc.connect(gain);
          gain.connect(master);

          osc.start(now);
          osc.stop(now + p.dur);
        }
        break;
      }

      case 'MODAL_OPEN': {
        // Breath-like soft sine swell
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(288, now);
        osc.frequency.exponentialRampToValueAtTime(432, now + 0.14);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case 'MODAL_CLOSE': {
        // Soft sine harmonic release
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(432, now);
        osc.frequency.exponentialRampToValueAtTime(216, now + 0.12);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.24, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case 'SWARM_COMPLETE': {
        // Zen meditation bowl multi-harmonic wash
        const bowls = [
          { freq: 216, gain: 0.28, dur: 0.55 },
          { freq: 432, gain: 0.25, dur: 0.52 },
          { freq: 648, gain: 0.16, dur: 0.45 },
          { freq: 864, gain: 0.10, dur: 0.35 },
        ];

        for (const b of bowls) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(b.freq, now);

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(b.gain, now + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + b.dur);

          osc.connect(gain);
          gain.connect(master);

          osc.start(now);
          osc.stop(now + b.dur);
        }
        break;
      }
    }
  }

  // ── Procedural Theme 3: MINIMAL_HAPTIC ────────────────────────────────────
  /**
   * Sub-bass thump (45Hz sine), crisp 2ms mechanical micro-click.
   */
  private synthesizeMinimalHaptic(ctx: AudioContext, event: SoundEventId): void {
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    // Helper: Crisp 2ms mechanical micro-click
    const playMechanicalMicroClick = (time: number, startFreq = 1600, endFreq = 400): void => {
      const clickOsc = ctx.createOscillator();
      const clickFilter = ctx.createBiquadFilter();
      const clickGain = ctx.createGain();

      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(startFreq, time);
      clickOsc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.003);

      clickFilter.type = 'highpass';
      clickFilter.frequency.setValueAtTime(500, time);

      clickGain.gain.setValueAtTime(0.0001, time);
      clickGain.gain.linearRampToValueAtTime(0.38, time + 0.0006);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.0035);

      clickOsc.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(master);

      clickOsc.start(time);
      clickOsc.stop(time + 0.004);
    };

    // Helper: 45Hz sub-bass thump
    const playSubBassThump = (time: number, dur = 0.065): void => {
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(45, time);
      subOsc.frequency.exponentialRampToValueAtTime(30, time + dur);

      subGain.gain.setValueAtTime(0.0001, time);
      subGain.gain.linearRampToValueAtTime(0.48, time + 0.005);
      subGain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      subOsc.connect(subGain);
      subGain.connect(master);

      subOsc.start(time);
      subOsc.stop(time + dur);
    };

    switch (event) {
      case 'POST_UPVOTE': {
        // Sub-bass thump (45Hz sine) + crisp 2ms mechanical micro-click
        playSubBassThump(now, 0.06);
        playMechanicalMicroClick(now, 1600, 420);
        break;
      }

      case 'POST_DOWNVOTE': {
        // Low tactile dull click
        playSubBassThump(now, 0.04);
        playMechanicalMicroClick(now, 900, 200);
        break;
      }

      case 'MESSAGE_SENT': {
        // Crisp 2ms mechanical micro-click
        playMechanicalMicroClick(now, 1500, 380);
        break;
      }

      case 'MESSAGE_RECEIVED': {
        // Double micro-click with light sub body
        playMechanicalMicroClick(now, 1600, 450);
        playMechanicalMicroClick(now + 0.024, 1800, 500);
        playSubBassThump(now, 0.04);
        break;
      }

      case 'MODAL_OPEN': {
        // Mechanical micro-latch open
        playMechanicalMicroClick(now, 1200, 300);
        break;
      }

      case 'MODAL_CLOSE': {
        // Mechanical micro-latch close
        playMechanicalMicroClick(now, 800, 220);
        break;
      }

      case 'SWARM_COMPLETE': {
        // Deep sub-bass pulse (45Hz) with tactile rhythm
        playSubBassThump(now, 0.12);
        playMechanicalMicroClick(now, 1600, 400);
        playMechanicalMicroClick(now + 0.04, 1800, 450);
        playMechanicalMicroClick(now + 0.08, 2000, 500);
        break;
      }
    }
  }

  // ── Procedural Theme 4: RETRO_8BIT ───────────────────────────────────────
  /**
   * Dual square-wave retro arpeggios, arcade level-up fanfares.
   */
  private synthesizeRetro8Bit(ctx: AudioContext, event: SoundEventId): void {
    const now = ctx.currentTime;
    const master = this.createMasterGain(ctx);

    switch (event) {
      case 'POST_UPVOTE': {
        // Dual square-wave retro arpeggio: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
        const arpeggio = [523.25, 659.25, 783.99, 1046.5];
        const stepTime = 0.028;

        for (let i = 0; i < arpeggio.length; i++) {
          const t = now + i * stepTime;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'square';
          osc1.frequency.setValueAtTime(arpeggio[i], t);

          osc2.type = 'square';
          osc2.frequency.setValueAtTime(arpeggio[i] * 1.005, t); // Slight detune for authentic retro chorus

          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.28, t + 0.002);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + stepTime);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(master);

          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + stepTime);
          osc2.stop(t + stepTime);
        }
        break;
      }

      case 'POST_DOWNVOTE': {
        // Classic 8-bit descending square-wave slide
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.085);
        break;
      }

      case 'MESSAGE_SENT': {
        // 8-bit jump chirp
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.05);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.055);
        break;
      }

      case 'MESSAGE_RECEIVED': {
        // 8-bit coin pickup arpeggio (B5 -> E6)
        const notes = [
          { freq: 987.77, offset: 0, dur: 0.04 },
          { freq: 1318.51, offset: 0.035, dur: 0.07 },
        ];

        for (const n of notes) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'square';
          osc.frequency.setValueAtTime(n.freq, now + n.offset);

          gain.gain.setValueAtTime(0.0001, now + n.offset);
          gain.gain.linearRampToValueAtTime(0.28, now + n.offset + 0.002);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + n.offset + n.dur);

          osc.connect(gain);
          gain.connect(master);

          osc.start(now + n.offset);
          osc.stop(now + n.offset + n.dur);
        }
        break;
      }

      case 'MODAL_OPEN': {
        // 8-bit menu sweep up
        const notes = [261.63, 523.25];
        for (let i = 0; i < notes.length; i++) {
          const t = now + i * 0.03;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'square';
          osc.frequency.setValueAtTime(notes[i], t);

          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.26, t + 0.002);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

          osc.connect(gain);
          gain.connect(master);

          osc.start(t);
          osc.stop(t + 0.04);
        }
        break;
      }

      case 'MODAL_CLOSE': {
        // 8-bit menu sweep down
        const notes = [523.25, 261.63];
        for (let i = 0; i < notes.length; i++) {
          const t = now + i * 0.03;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'square';
          osc.frequency.setValueAtTime(notes[i], t);

          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.24, t + 0.002);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

          osc.connect(gain);
          gain.connect(master);

          osc.start(t);
          osc.stop(t + 0.04);
        }
        break;
      }

      case 'SWARM_COMPLETE': {
        // Arcade level-up fanfare (classic 5-note fanfare with dual square waves)
        const fanfare = [
          { freq: 523.25, offset: 0, dur: 0.07 },      // C5
          { freq: 659.25, offset: 0.065, dur: 0.07 },  // E5
          { freq: 783.99, offset: 0.13, dur: 0.07 },   // G5
          { freq: 1046.5, offset: 0.195, dur: 0.18 },  // C6
        ];

        for (const f of fanfare) {
          const t = now + f.offset;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'square';
          osc1.frequency.setValueAtTime(f.freq, t);

          osc2.type = 'square';
          osc2.frequency.setValueAtTime(f.freq * 1.008, t);

          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.28, t + 0.004);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + f.dur);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(master);

          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + f.dur);
          osc2.stop(t + f.dur);
        }
        break;
      }
    }
  }

  // ── UI Widget: Theme Customizer & Settings ─────────────────────────────────

  /**
   * Render the Sound & Haptic Packs Selector component.
   */
  public renderSoundPackSelector(): string {
    const active = SOUND_THEMES[this.currentTheme];
    const volPercent = Math.round(this.volume * 100);

    return `
      <div id="sound-pack-selector-widget" class="p-4 bg-surface-raised rounded-xl border border-white/5 space-y-4 font-sans text-xs">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-subtle-b pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-surface-overlay border border-white/10 flex items-center justify-center text-base">
              ${active.icon}
            </div>
            <div>
              <div class="font-bold text-white flex items-center gap-2">
                <span>Acoustic & Sensory Sound Packs</span>
                <span class="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  ${active.badge}
                </span>
              </div>
              <div class="text-[11px] text-slate-400 font-mono">100% Procedural Web Audio API</div>
            </div>
          </div>

          <!-- Master Sound FX Toggle -->
          <button
            type="button"
            id="sound-pack-btn-toggle"
            class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all border ${
              this.isEnabled
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'bg-surface-base hover:bg-surface-overlay border-white/10 text-slate-400'
            }"
          >
            <span>${this.isEnabled ? '🔊' : '🔇'}</span>
            <span>${this.isEnabled ? 'FX ON' : 'MUTED'}</span>
          </button>
        </div>

        <!-- 4 Theme Option Cards -->
        <div class="space-y-1.5">
          <div class="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">Sound Theme Selection</div>
          <div class="grid grid-cols-2 gap-2">
            ${(Object.keys(SOUND_THEMES) as SoundThemeId[]).map((themeKey) => {
              const theme = SOUND_THEMES[themeKey];
              const isSelected = this.currentTheme === themeKey;
              return `
                <button
                  type="button"
                  data-sound-theme="${themeKey}"
                  class="sound-theme-card p-2.5 rounded-lg text-left transition-all border ${
                    isSelected
                      ? 'bg-surface-overlay border-cyan-400/50 shadow-sm text-white'
                      : 'bg-surface-base hover:bg-surface-overlay border-white/5 text-slate-400 hover:text-slate-200'
                  }"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-bold text-xs flex items-center gap-1.5">
                      <span>${theme.icon}</span>
                      <span>${theme.name}</span>
                    </span>
                    <span class="text-[9px] font-mono px-1 rounded bg-white/5 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}">
                      ${theme.badge}
                    </span>
                  </div>
                  <p class="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                    ${theme.description}
                  </p>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Controls: Volume & Haptics Slider -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <!-- Volume Slider -->
          <div class="space-y-1.5">
            <div class="flex justify-between items-center text-[11px] text-slate-300 font-mono">
              <span>Synthesizer Volume</span>
              <span class="text-cyan-400 font-bold">${volPercent}%</span>
            </div>
            <input
              id="sound-pack-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value="${this.volume}"
              class="w-full h-1.5 bg-surface-base rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <!-- Physical Haptic Feedback Toggle -->
          <div class="flex items-center justify-between p-2 rounded-lg bg-surface-base border border-white/5">
            <div>
              <div class="font-medium text-slate-200 text-xs flex items-center gap-1.5">
                <span>📳</span> Physical Haptics
              </div>
              <div class="text-[10px] text-slate-400 font-mono">navigator.vibrate pulses</div>
            </div>
            <button
              type="button"
              id="sound-pack-btn-haptics"
              class="px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all border ${
                this.isHapticsEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-surface-overlay text-slate-500 border-white/5'
              }"
            >
              ${this.isHapticsEnabled ? 'ACTIVE' : 'OFF'}
            </button>
          </div>
        </div>

        <!-- Test Event Audio Preview Pad -->
        <div class="pt-2 border-subtle-t">
          <div class="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider mb-2">
            Sound Event Audition Pad (${active.name})
          </div>
          <div class="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            <button type="button" data-audition-event="POST_UPVOTE" class="p-1.5 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-emerald-400 font-mono border border-white/5 transition-all text-center">
              ▲ Upvote
            </button>
            <button type="button" data-audition-event="POST_DOWNVOTE" class="p-1.5 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-amber-400 font-mono border border-white/5 transition-all text-center">
              ▼ Downvote
            </button>
            <button type="button" data-audition-event="MESSAGE_SENT" class="p-1.5 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-cyan-400 font-mono border border-white/5 transition-all text-center">
              ⚡ Sent
            </button>
            <button type="button" data-audition-event="MESSAGE_RECEIVED" class="p-1.5 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-indigo-400 font-mono border border-white/5 transition-all text-center">
              🔔 Recv
            </button>
            <button type="button" data-audition-event="MODAL_OPEN" class="p-1.5 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-purple-400 font-mono border border-white/5 transition-all text-center">
              ↗ Open
            </button>
            <button type="button" data-audition-event="MODAL_CLOSE" class="p-1.5 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-slate-300 font-mono border border-white/5 transition-all text-center">
              ↙ Close
            </button>
            <button type="button" data-audition-event="SWARM_COMPLETE" class="p-1.5 rounded bg-surface-base hover:bg-surface-overlay text-[10px] text-yellow-400 font-mono border border-white/5 transition-all text-center font-bold">
              👑 Swarm
            </button>
          </div>
        </div>

      </div>
    `.trim();
  }

  /**
   * Bind DOM event listeners for the sound pack selector widget.
   */
  public bindUIEvents(root: Document | HTMLElement = typeof document !== 'undefined' ? document : ({} as Document)): void {
    if (!root || typeof root.querySelectorAll !== 'function') return;

    // Theme card clicks
    const themeCards = root.querySelectorAll<HTMLElement>('[data-sound-theme]');
    themeCards.forEach((card) => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const theme = card.getAttribute('data-sound-theme') as SoundThemeId | null;
        if (theme && SOUND_THEMES[theme]) {
          this.setTheme(theme);
          this.play('POST_UPVOTE');
          this.refreshWidgetDOM();
        }
      });
    });

    // Sound toggle
    const toggleBtn = root.querySelector('#sound-pack-btn-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleSound();
        if (this.isEnabled) this.play('POST_UPVOTE');
        this.refreshWidgetDOM();
      });
    }

    // Haptic toggle
    const hapticsBtn = root.querySelector('#sound-pack-btn-haptics');
    if (hapticsBtn) {
      hapticsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleHaptics();
        if (this.isHapticsEnabled) this.triggerHaptic(HAPTIC_PATTERNS.POST_UPVOTE);
        this.refreshWidgetDOM();
      });
    }

    // Volume slider
    const volumeSlider = root.querySelector<HTMLInputElement>('#sound-pack-volume-slider');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        if (!isNaN(val)) {
          this.setVolume(val);
        }
      });
    }

    // Audition event pad buttons
    const auditionBtns = root.querySelectorAll<HTMLElement>('[data-audition-event]');
    auditionBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const eventId = btn.getAttribute('data-audition-event') as SoundEventId | null;
        if (eventId) {
          this.play(eventId);
        }
      });
    });
  }

  /**
   * Refresh widget DOM in-place when selection changes.
   */
  private refreshWidgetDOM(): void {
    if (typeof document === 'undefined') return;
    const widget = document.getElementById('sound-pack-selector-widget');
    if (!widget) return;

    widget.outerHTML = this.renderSoundPackSelector();
    const newWidget = document.getElementById('sound-pack-selector-widget');
    if (newWidget) {
      this.bindUIEvents(newWidget);
    }
  }
}

export const soundPacks = new ProceduralSoundPacksEngine();
