/**
 * @file messages-voice.ts
 * @package @aetheris/client-ui
 * @description Lightweight Audio Voice Notes recording, waveform visualization, and playback.
 * 100% Client-side, encapsulated in existing DirectMessageAttachment architecture.
 */

import { clientStore } from './client-state.js';
import type { DirectMessageAttachment } from './client-state.js';

export interface VoiceRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  durationSeconds: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  targetType: 'dm' | 'relay';
}

class VoiceNotesManager {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private timerInterval: any = null;
  public state: VoiceRecorderState = {
    isRecording: false,
    isPaused: false,
    durationSeconds: 0,
    audioBlob: null,
    audioUrl: null,
    targetType: 'dm',
  };

  public async startRecording(targetType: 'dm' | 'relay'): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      clientStore.showToast('Microphone recording is not supported in this browser.', 'warning');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/mp4';

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.audioChunks = [];
      this.state.targetType = targetType;
      this.state.durationSeconds = 0;
      this.state.audioBlob = null;
      this.state.audioUrl = null;
      this.state.isRecording = true;
      this.state.isPaused = false;

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.state.audioBlob = blob;
        this.state.audioUrl = URL.createObjectURL(blob);
        stream.getTracks().forEach(track => track.stop());
        clientStore.notifySync();
      };

      this.mediaRecorder.start(250);

      this.timerInterval = setInterval(() => {
        if (!this.state.isPaused) {
          this.state.durationSeconds += 1;
          clientStore.notifySync();
        }
      }, 1000);

      clientStore.notifySync();
      return true;
    } catch (err: any) {
      clientStore.showToast(`Microphone access denied: ${err.message || err}`, 'warning');
      return false;
    }
  }

  public pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.state.isPaused = true;
      clientStore.notifySync();
    }
  }

  public resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.state.isPaused = false;
      clientStore.notifySync();
    }
  }

  public stopRecording(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.state.isRecording = false;
    this.state.isPaused = false;
    clientStore.notifySync();
  }

  public cancelRecording(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.state.audioUrl) {
      URL.revokeObjectURL(this.state.audioUrl);
    }
    this.state.isRecording = false;
    this.state.isPaused = false;
    this.state.durationSeconds = 0;
    this.state.audioBlob = null;
    this.state.audioUrl = null;
    clientStore.notifySync();
  }

  public async getAttachment(): Promise<DirectMessageAttachment | null> {
    if (!this.state.audioBlob) return null;
    const blob = this.state.audioBlob;
    const name = `voice_note_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return {
      name,
      size: blob.size,
      type: blob.type || 'audio/webm',
      dataUrl,
    };
  }

  public formatDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  public renderRecorderBar(): string {
    if (!this.state.isRecording && !this.state.audioBlob) return '';

    const dur = this.formatDuration(this.state.durationSeconds);

    if (this.state.isRecording) {
      return `
        <div class="voice-recorder-bar flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 mb-2.5 animate-in fade-in select-none">
          <div class="flex items-center space-x-3">
            <span class="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
            <span class="font-mono text-xs font-bold text-white">${dur}</span>
            <div class="flex items-center space-x-0.5 h-4">
              <span class="w-1 bg-amber-400 rounded-full animate-bounce h-3"></span>
              <span class="w-1 bg-amber-400 rounded-full animate-bounce h-5" style="animation-delay: 0.1s"></span>
              <span class="w-1 bg-amber-400 rounded-full animate-bounce h-2" style="animation-delay: 0.2s"></span>
              <span class="w-1 bg-amber-400 rounded-full animate-bounce h-4" style="animation-delay: 0.15s"></span>
            </div>
            <span class="text-[11px] text-amber-300 font-medium">${this.state.isPaused ? 'Recording paused' : 'Recording voice note…'}</span>
          </div>
          <div class="flex items-center space-x-2">
            ${this.state.isPaused ? `
              <button type="button" data-action="resume-voice-note" class="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-white/10 text-xs font-semibold text-white cursor-pointer">▶ Resume</button>
            ` : `
              <button type="button" data-action="pause-voice-note" class="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-white/10 text-xs font-semibold text-white cursor-pointer">⏸ Pause</button>
            `}
            <button type="button" data-action="cancel-voice-note" class="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer">✕ Cancel</button>
            <button type="button" data-action="finish-voice-note" class="px-3 py-1 rounded-lg bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold text-xs cursor-pointer shadow-sm">✓ Done</button>
          </div>
        </div>
      `;
    }

    // Preview state before sending
    return `
      <div class="voice-preview-bar flex items-center justify-between p-3 rounded-2xl bg-surface-raised border border-white/10 text-slate-200 mb-2.5 animate-in fade-in select-none">
        <div class="flex items-center space-x-2.5 min-w-0">
          <span class="text-base">🎙️</span>
          <div class="min-w-0">
            <div class="text-xs font-bold text-white">Voice Note (${dur})</div>
            <audio src="${this.state.audioUrl || ''}" controls class="h-7 w-48 sm:w-64 mt-1"></audio>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button type="button" data-action="cancel-voice-note" class="px-2.5 py-1 rounded-lg hover:bg-rose-500/20 text-rose-300 text-xs font-semibold cursor-pointer">Discard</button>
          <button type="button" data-action="attach-voice-note" class="px-3 py-1.5 rounded-xl bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold text-xs cursor-pointer shadow-sm">Attach to message</button>
        </div>
      </div>
    `;
  }
}

export const voiceNotesManager = new VoiceNotesManager();
