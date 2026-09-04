import { createSafeAudioContext } from './dry-utils.js';

export interface DSPMetrics {
  currentDb: number;
  isGateOpen: boolean;
  noiseFloorDb: number;
}

export class NeuralDSPPipeline {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private isEnabled: boolean = true;
  private gateThresholdDb: number = -50; // Noise gate threshold in dB
  private onMetricsCallback?: (metrics: DSPMetrics) => void;
  private animFrameId: number | null = null;

  constructor() {}

  public async start(onMetrics?: (metrics: DSPMetrics) => void): Promise<boolean> {
    this.onMetricsCallback = onMetrics;

    try {
      this.ctx = createSafeAudioContext();
      if (!this.ctx) return false;
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // We perform custom DSP noise reduction
          autoGainControl: false,
        },
      });

      this.sourceNode = this.ctx.createMediaStreamSource(this.stream);

      // High-pass filter at 85Hz to cut desk thumps and sub-bass hum
      this.highPassFilter = this.ctx.createBiquadFilter();
      this.highPassFilter.type = 'highpass';
      this.highPassFilter.frequency.setValueAtTime(85, this.ctx.currentTime);

      // Analyser for real-time DSP noise gating
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;

      // Gain node for gate attenuation
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

      // Connect pipeline
      this.sourceNode.connect(this.highPassFilter);
      this.highPassFilter.connect(this.analyser);
      this.highPassFilter.connect(this.gainNode);

      this.startAnalysisLoop();
      return true;
    } catch {
      // Gracefully handle when microphone is not present or permission not yet requested
      return false;
    }
  }

  private startAnalysisLoop(): void {
    if (!this.analyser) return;

    const buffer = new Float32Array(this.analyser.fftSize);

    const loop = () => {
      if (!this.analyser || !this.gainNode || !this.ctx) return;

      this.analyser.getFloatTimeDomainData(buffer);

      // Calculate Root Mean Square (RMS)
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sum / buffer.length);
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;

      // Noise Gate logic
      const isGateOpen = db > this.gateThresholdDb;

      if (this.isEnabled) {
        // Smooth gain transition
        const targetGain = isGateOpen ? 1.0 : 0.02;
        this.gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.04);
      } else {
        this.gainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);
      }

      if (this.onMetricsCallback) {
        this.onMetricsCallback({
          currentDb: Math.round(db),
          isGateOpen,
          noiseFloorDb: this.gateThresholdDb,
        });
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    loop();
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setThreshold(db: number): void {
    this.gateThresholdDb = db;
  }

  public stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.sourceNode = null;
    this.highPassFilter = null;
    this.analyser = null;
    this.gainNode = null;
  }
}
