// ===========================================================================
// UREfy — E2EE OPUS VOICE NOTES & REAL-TIME WEBAUDIO WAVEFORM ENGINE 2027
// Fully compatible with WhatsApp + Discord PQC Messenger Architecture
// ===========================================================================

import { escapeHtml } from './sanitize.js';

export interface VoiceNotePayload {
  durationSec: number;
  mimeType: string;
  peaks: number[]; // 28 normalizate [10..100]
  audioBase64: string;
}

const VOICE_PREFIX = '>>> [VOICE_E2EE_V1:';

export function encodeVoiceNoteMessage(payload: VoiceNotePayload): string {
  const json = JSON.stringify(payload);
  return `${VOICE_PREFIX}${json}]`;
}

export function parseVoiceNoteMessage(plaintext: string): VoiceNotePayload | null {
  if (!plaintext || !plaintext.startsWith(VOICE_PREFIX) || !plaintext.endsWith(']')) {
    return null;
  }
  try {
    const rawJson = plaintext.slice(VOICE_PREFIX.length, -1);
    const parsed = JSON.parse(rawJson) as VoiceNotePayload;
    if (typeof parsed.audioBase64 === 'string' && Array.isArray(parsed.peaks)) {
      return parsed;
    }
  } catch (_) {}
  return null;
}

/**
 * Randează player-ul interactiv în stil WhatsApp + Discord 2027 pentru o notă vocală E2EE
 */
export function renderVoiceNoteBubble(payload: VoiceNotePayload, messageId: string): string {
  const mins = Math.floor(payload.durationSec / 60);
  const secs = String(Math.round(payload.durationSec % 60)).padStart(2, '0');
  const barsHtml = payload.peaks
    .slice(0, 28)
    .map(
      (h, idx) =>
        `<span class="nx-wave-bar" data-bar-idx="${idx}" style="height:${Math.max(14, Math.min(100, Number(h) || 20))}%;"></span>`
    )
    .join('');

  return `
    <div class="nx-voice-player" data-voice-id="${escapeHtml(messageId)}" data-mime="${escapeHtml(payload.mimeType || 'audio/webm')}" data-b64="${escapeHtml(payload.audioBase64)}">
      <button type="button" class="nx-voice-play-btn" aria-label="Redă nota vocală criptată">
        ▶
      </button>
      <div class="nx-voice-waveform-wrap">
        <div class="nx-voice-bars">${barsHtml}</div>
        <div class="nx-voice-footer">
          <span class="nx-voice-timer">${mins}:${secs}</span>
          <span class="nx-voice-e2ee-tag">🎙️ E2EE OPUS PQC</span>
        </div>
      </div>
      <button type="button" class="nx-voice-speed-btn" data-speed="1">1x</button>
    </div>
  `;
}

/**
 * Activează redarea audio, animația barelor Waveform și schimbarea vitezei (1x / 1.5x / 2x)
 */
export function bindVoiceNotePlayers(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.nx-voice-player').forEach((player) => {
    if (player.dataset.bound === '1') return;
    player.dataset.bound = '1';

    let audio: HTMLAudioElement | null = null;
    let rafId: number | null = null;

    const playBtn = player.querySelector<HTMLButtonElement>('.nx-voice-play-btn');
    const speedBtn = player.querySelector<HTMLButtonElement>('.nx-voice-speed-btn');
    const timerEl = player.querySelector<HTMLElement>('.nx-voice-timer');
    const bars = Array.from(player.querySelectorAll<HTMLElement>('.nx-wave-bar'));

    const updateProgress = () => {
      if (!audio) return;
      const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
      const activeCount = Math.floor(ratio * bars.length);
      bars.forEach((b, idx) => b.classList.toggle('is-played', idx <= activeCount));

      if (timerEl && !Number.isNaN(audio.currentTime)) {
        const m = Math.floor(audio.currentTime / 60);
        const s = String(Math.floor(audio.currentTime % 60)).padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
      }
      if (!audio.paused) {
        rafId = requestAnimationFrame(updateProgress);
      }
    };

    playBtn?.addEventListener('click', () => {
      if (!audio) {
        const b64 = player.getAttribute('data-b64') || '';
        const mime = player.getAttribute('data-mime') || 'audio/webm';
        audio = new Audio(`data:${mime};base64,${b64}`);
        audio.addEventListener('ended', () => {
          if (playBtn) playBtn.textContent = '▶';
          bars.forEach((b) => b.classList.remove('is-played'));
          if (rafId) cancelAnimationFrame(rafId);
        });
      }

      if (audio.paused) {
        audio.play().catch(() => {});
        playBtn.textContent = '⏸';
        rafId = requestAnimationFrame(updateProgress);
      } else {
        audio.pause();
        playBtn.textContent = '▶';
        if (rafId) cancelAnimationFrame(rafId);
      }
    });

    speedBtn?.addEventListener('click', () => {
      const speeds = [1, 1.5, 2];
      const current = Number(speedBtn.dataset.speed || '1');
      const next = speeds[(speeds.indexOf(current) + 1) % speeds.length];
      speedBtn.dataset.speed = String(next);
      speedBtn.textContent = `${next}x`;
      if (audio) audio.playbackRate = next;
    });
  });
}

/**
 * Recorder audio cu analizor de frecvență WebAudio API în timp real
 */
export class SovereignVoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private startTime = 0;
  private sampledPeaks: number[] = [];
  private peakTimer: number | null = null;

  public async start(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Browserul nu suportă înregistrarea audio.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 64;
    source.connect(this.analyser);

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.chunks = [];
    this.sampledPeaks = [];
    this.startTime = Date.now();

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
      audioBitsPerSecond: 24000, // Compresie optimă pentru plicuri E2EE D1
    });

    // Zero property event handlers (Gate 1 compliant)
    this.mediaRecorder.addEventListener('dataavailable', (e: BlobEvent) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    });

    const freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.peakTimer = window.setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(freqData);
      const avg = freqData.reduce((a, b) => a + b, 0) / Math.max(1, freqData.length);
      const norm = Math.min(100, Math.max(14, Math.round((avg / 180) * 100)));
      this.sampledPeaks.push(norm);
    }, 120);

    this.mediaRecorder.start(150);
  }

  public async stop(): Promise<VoiceNotePayload> {
    if (!this.mediaRecorder) {
      throw new Error('Nu există o înregistrare activă.');
    }

    const recorder = this.mediaRecorder;
    const durationSec = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

    return new Promise((resolve, reject) => {
      recorder.addEventListener(
        'stop',
        async () => {
          try {
            this.cleanup();
            const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' });
            const buffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const audioBase64 = btoa(binary);
            const peaks = this.normalizePeaks(this.sampledPeaks, 28);

            resolve({
              durationSec,
              mimeType: recorder.mimeType || 'audio/webm',
              peaks,
              audioBase64,
            });
          } catch (err) {
            reject(err);
          }
        },
        { once: true }
      );
      recorder.stop();
    });
  }

  public cancel(): void {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    } catch (_) {}
    this.cleanup();
  }

  public isRecording(): boolean {
    return Boolean(this.mediaRecorder && this.mediaRecorder.state === 'recording');
  }

  private cleanup(): void {
    if (this.peakTimer !== null) {
      clearInterval(this.peakTimer);
      this.peakTimer = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  private normalizePeaks(raw: number[], targetCount: number): number[] {
    if (raw.length === 0) return Array(targetCount).fill(28);
    const out: number[] = [];
    for (let i = 0; i < targetCount; i++) {
      const idx = Math.min(raw.length - 1, Math.floor((i / targetCount) * raw.length));
      out.push(raw[idx]);
    }
    return out;
  }
}
