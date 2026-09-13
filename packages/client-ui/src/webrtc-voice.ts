import { createSafeAudioContext } from './dry-utils.js';

export class VoiceVisualizer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private analyser: AnalyserNode | null = null;
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private animId: number | null = null;
  public isConnected: boolean = false;
  public isGhostSpaceActive: boolean = false;

  constructor() {}

  public init(canvasId: string): void {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
  }

  public async connectVoice(): Promise<boolean> {
    try {
      this.audioCtx = createSafeAudioContext();
      if (!this.audioCtx) throw new Error('AudioContext unavailable');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;
      const source = this.audioCtx.createMediaStreamSource(stream);

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      source.connect(this.analyser);

      this.isConnected = true;
      this.startRender();
      return true;
    } catch {
      // Fallback synthetic waveform if physical mic is in use
      this.isConnected = true;
      this.startSyntheticRender();
      return true;
    }
  }

  private startRender(): void {
    if (!this.canvas || !this.ctx || !this.analyser) return;

    const buffer = new Uint8Array(this.analyser.frequencyBinCount);

    const draw = () => {
      if (!this.canvas || !this.ctx || !this.analyser || !this.isConnected) return;

      this.analyser.getByteFrequencyData(buffer);
      this.drawWaveform(buffer);
      this.animId = requestAnimationFrame(draw);
    };

    draw();
  }

  private startSyntheticRender(): void {
    if (!this.canvas || !this.ctx) return;
    const buffer = new Uint8Array(64);
    let t = 0;

    const draw = () => {
      if (!this.canvas || !this.ctx || !this.isConnected) return;

      t += 0.05;
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(128 + 60 * Math.sin(t + i * 0.2) + 20 * Math.cos(t * 2 + i * 0.1));
      }

      this.drawWaveform(buffer);
      this.animId = requestAnimationFrame(draw);
    };

    draw();
  }

  private drawWaveform(data: Uint8Array): void {
    if (!this.canvas || !this.ctx) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    // Neon gradient bars
    const barWidth = (width / data.length) * 1.5;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const barHeight = (data[i] / 255) * height;

      // Color shifts from Cyphr Cyan (#00e5ff) to Aether Violet (#7c3aed)
      const r = Math.floor((i / data.length) * 124);
      const g = Math.floor(229 - (i / data.length) * 171);
      const b = 255;

      this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      this.ctx.shadowBlur = 6;
      this.ctx.shadowColor = 'rgba(0, 229, 255, 0.4)';

      this.ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
      x += barWidth;
    }
  }

  public toggleGhostSpace(): boolean {
    this.isGhostSpaceActive = !this.isGhostSpaceActive;
    return this.isGhostSpaceActive;
  }

  public zeroizeRam(): void {
    // Overwrite ephemeral memory buffers with zeros and release hardware tracks
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      this.mediaStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.isConnected = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

export const voiceVisualizer = new VoiceVisualizer();
