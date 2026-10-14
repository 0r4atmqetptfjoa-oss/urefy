/**
 * @file audio-dsp.ts
 * @package @aetheris/client-ui
 * @description 2027 Zero-Jitter Neural & Acoustic DSP Pipeline powered by Web Audio Worklets.
 * Runs entirely off the main UI thread on the dedicated real-time audio rendering thread.
 */

import { createSafeAudioContext } from './dry-utils.js';

export interface DSPMetrics {
  currentDb: number;
  isGateOpen: boolean;
  noiseFloorDb: number;
  crestFactorDb: number;
  voiceProbability: number;
}

/**
 * Inline AudioWorklet Processor code compiled into a zero-dependency Blob URL.
 * Executes in the real-time audio thread (128 frames per quantum @ 48kHz = ~2.66ms latency).
 */
const WORKLET_PROCESSOR_CODE = `
class SovereignNoiseGateProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isEnabled = true;
    this.thresholdDb = -50;
    this.attackCoeff = 0.005;  // Fast attack (~1.5ms)
    this.releaseCoeff = 0.08;  // Smooth exponential release (~60ms)
    this.envelope = 0.0;
    this.currentGain = 1.0;
    this.noiseFloorDb = -75.0;
    this.frameCounter = 0;

    this.port.onmessage = (e) => {
      const { type, value } = e.data;
      if (type === 'SET_ENABLED') this.isEnabled = Boolean(value);
      if (type === 'SET_THRESHOLD') this.thresholdDb = Number(value);
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input[0] || !output || !output[0]) return true;

    const inChannel = input[0];
    const outChannel = output[0];
    const length = inChannel.length;

    let sumSquares = 0.0;
    let peak = 0.0;

    for (let i = 0; i < length; i++) {
      const sample = inChannel[i];
      const abs = Math.abs(sample);
      sumSquares += sample * sample;
      if (abs > peak) peak = abs;
    }

    const rms = Math.sqrt(sumSquares / length);
    const db = rms > 0.000001 ? 20 * Math.log10(rms) : -100.0;
    const peakDb = peak > 0.000001 ? 20 * Math.log10(peak) : -100.0;
    const crestFactorDb = Math.max(0, peakDb - db);

    // Dynamic noise floor tracker (slow adaptation during silence)
    if (db < this.thresholdDb) {
      this.noiseFloorDb = 0.995 * this.noiseFloorDb + 0.005 * Math.max(-95, db);
    }

    // Hysteresis gate evaluation (3dB hysteresis window prevents chatter)
    const openThreshold = this.thresholdDb;
    const closeThreshold = this.thresholdDb - 3.5;
    const isGateOpen = this.currentGain > 0.5 ? db > closeThreshold : db > openThreshold;

    const targetGain = !this.isEnabled ? 1.0 : (isGateOpen ? 1.0 : 0.015);
    const coeff = targetGain > this.currentGain ? (1.0 - this.attackCoeff) : (1.0 - this.releaseCoeff);

    for (let i = 0; i < length; i++) {
      this.currentGain = coeff * this.currentGain + (1.0 - coeff) * targetGain;
      outChannel[i] = inChannel[i] * this.currentGain;
    }

    // Copy processed signal to any secondary channels
    for (let ch = 1; ch < output.length; ch++) {
      output[ch].set(outChannel);
    }

    // Emit telemetry to UI at ~30Hz (every 12th audio quantum) to avoid postMessage flooding
    this.frameCounter++;
    if (this.frameCounter >= 12) {
      this.frameCounter = 0;
      const snr = Math.max(0, db - this.noiseFloorDb);
      const voiceProbability = Math.min(1, Math.max(0, snr / 35));
      this.port.postMessage({
        currentDb: Math.round(db),
        isGateOpen,
        noiseFloorDb: Math.round(this.noiseFloorDb),
        crestFactorDb: Math.round(crestFactorDb * 10) / 10,
        voiceProbability: Math.round(voiceProbability * 100) / 100
      });
    }

    return true;
  }
}
registerProcessor('sovereign-noise-gate', SovereignNoiseGateProcessor);
`;

export class NeuralDSPPipeline {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private presenceFilter: BiquadFilterNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private fallbackAnalyser: AnalyserNode | null = null;
  private fallbackGain: GainNode | null = null;
  private fallbackTimerId: ReturnType<typeof setInterval> | null = null;
  private workletBlobUrl: string | null = null;

  private isEnabled: boolean = true;
  private gateThresholdDb: number = -50;
  private onMetricsCallback?: (metrics: DSPMetrics) => void;

  public async start(onMetrics?: (metrics: DSPMetrics) => void): Promise<boolean> {
    this.onMetricsCallback = onMetrics;

    try {
      this.ctx = createSafeAudioContext();
      if (!this.ctx) return false;

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000,
        },
      });

      this.sourceNode = this.ctx.createMediaStreamSource(this.stream);

      // 1. Sub-sonic High-Pass Filter (85Hz, 12dB/oct Butterworth)
      this.highPassFilter = this.ctx.createBiquadFilter();
      this.highPassFilter.type = 'highpass';
      this.highPassFilter.frequency.setValueAtTime(85, this.ctx.currentTime);
      this.highPassFilter.Q.setValueAtTime(0.707, this.ctx.currentTime);

      // 2. Vocal Presence Harmonic Boost (+2.5dB @ 3.2kHz for clarity)
      this.presenceFilter = this.ctx.createBiquadFilter();
      this.presenceFilter.type = 'peaking';
      this.presenceFilter.frequency.setValueAtTime(3200, this.ctx.currentTime);
      this.presenceFilter.Q.setValueAtTime(1.1, this.ctx.currentTime);
      this.presenceFilter.gain.setValueAtTime(2.5, this.ctx.currentTime);

      this.sourceNode.connect(this.highPassFilter);
      this.highPassFilter.connect(this.presenceFilter);

      // 3. Attach Real-Time AudioWorklet (with graceful fallback for headless test runners)
      if (this.ctx.audioWorklet && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
        try {
          const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
          this.workletBlobUrl = URL.createObjectURL(blob);
          await this.ctx.audioWorklet.addModule(this.workletBlobUrl);

          this.workletNode = new AudioWorkletNode(this.ctx, 'sovereign-noise-gate');
          this.workletNode.port.onmessage = (event: MessageEvent<DSPMetrics>) => {
            this.onMetricsCallback?.(event.data);
          };

          this.workletNode.port.postMessage({ type: 'SET_ENABLED', value: this.isEnabled });
          this.workletNode.port.postMessage({ type: 'SET_THRESHOLD', value: this.gateThresholdDb });

          this.presenceFilter.connect(this.workletNode);
          return true;
        } catch {
          this.setupFallbackPipeline();
          return true;
        }
      } else {
        this.setupFallbackPipeline();
        return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * Background-safe timer fallback when running in environments without AudioWorklet (e.g. Vitest/JSDOM).
   * Uses setInterval instead of requestAnimationFrame so audio never mutes when tab is backgrounded.
   */
  private setupFallbackPipeline(): void {
    if (!this.ctx || !this.presenceFilter) return;

    this.fallbackAnalyser = this.ctx.createAnalyser();
    this.fallbackAnalyser.fftSize = 256;

    this.fallbackGain = this.ctx.createGain();
    this.fallbackGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.presenceFilter.connect(this.fallbackAnalyser);
    this.presenceFilter.connect(this.fallbackGain);

    const buffer = new Float32Array(this.fallbackAnalyser.fftSize);

    this.fallbackTimerId = setInterval(() => {
      if (!this.fallbackAnalyser || !this.fallbackGain || !this.ctx) return;

      this.fallbackAnalyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) {
        const s = buffer[i];
        sum += s * s;
        const abs = Math.abs(s);
        if (abs > peak) peak = abs;
      }

      const rms = Math.sqrt(sum / buffer.length);
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;
      const peakDb = peak > 0 ? 20 * Math.log10(peak) : -100;
      const isGateOpen = db > this.gateThresholdDb;

      if (this.isEnabled) {
        const targetGain = isGateOpen ? 1.0 : 0.02;
        this.fallbackGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.03);
      } else {
        this.fallbackGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      }

      this.onMetricsCallback?.({
        currentDb: Math.round(db),
        isGateOpen,
        noiseFloorDb: this.gateThresholdDb,
        crestFactorDb: Math.max(0, Math.round((peakDb - db) * 10) / 10),
        voiceProbability: isGateOpen ? 0.92 : 0.05,
      });
    }, 32);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.workletNode?.port.postMessage({ type: 'SET_ENABLED', value: enabled });
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setThreshold(db: number): void {
    this.gateThresholdDb = db;
    this.workletNode?.port.postMessage({ type: 'SET_THRESHOLD', value: db });
  }

  public stop(): void {
    if (this.fallbackTimerId) {
      clearInterval(this.fallbackTimerId);
      this.fallbackTimerId = null;
    }
    if (this.workletBlobUrl && typeof URL !== 'undefined') {
      URL.revokeObjectURL(this.workletBlobUrl);
      this.workletBlobUrl = null;
    }
    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.sourceNode = null;
    this.highPassFilter = null;
    this.presenceFilter = null;
    this.fallbackAnalyser = null;
    this.fallbackGain = null;
  }
}
