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
        <div class="voice-recorder-bar compact-voice-bar flex items-center justify-between px-3.5 py-2 rounded-full bg-surface-raised/90 border border-[var(--color-accent,#e89e38)]/30 text-slate-200 mb-2 select-none shadow-sm">
          <div class="flex items-center space-x-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span class="font-mono text-xs font-semibold text-white tracking-wide">${dur}</span>
            <div class="flex items-center space-x-0.5 h-3 px-1">
              <span class="w-0.5 bg-[var(--color-accent,#e89e38)] rounded-full animate-bounce h-2"></span>
              <span class="w-0.5 bg-[var(--color-accent,#e89e38)] rounded-full animate-bounce h-3.5" style="animation-delay: 0.1s"></span>
              <span class="w-0.5 bg-[var(--color-accent,#e89e38)] rounded-full animate-bounce h-1.5" style="animation-delay: 0.2s"></span>
              <span class="w-0.5 bg-[var(--color-accent,#e89e38)] rounded-full animate-bounce h-3" style="animation-delay: 0.15s"></span>
            </div>
            <span class="text-[11px] text-slate-400 font-medium hidden sm:inline">${this.state.isPaused ? 'Paused' : 'Recording…'}</span>
          </div>
          <div class="flex items-center space-x-1.5">
            ${this.state.isPaused ? `
              <button type="button" data-action="resume-voice-note" class="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-[11px] font-medium text-slate-200 cursor-pointer">▶ Resume</button>
            ` : `
              <button type="button" data-action="pause-voice-note" class="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-[11px] font-medium text-slate-200 cursor-pointer">⏸ Pause</button>
            `}
            <button type="button" data-action="cancel-voice-note" class="px-2 py-0.5 rounded-full hover:bg-rose-500/10 text-rose-400 text-[11px] font-medium cursor-pointer">Cancel</button>
            <button type="button" data-action="finish-voice-note" class="px-3 py-0.5 rounded-full bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold text-[11px] cursor-pointer shadow-xs">Send</button>
          </div>
        </div>
      `;
    }

    // Preview state before sending
    return `
      <div class="voice-preview-bar compact-voice-bar flex items-center justify-between px-3.5 py-2 rounded-full bg-surface-raised/90 border border-white/10 text-slate-200 mb-2 select-none">
        <div class="flex items-center space-x-2 min-w-0">
          <span class="text-sm">🎙️</span>
          <span class="text-[11px] font-semibold text-white">Voice Note (${dur})</span>
          <audio src="${this.state.audioUrl || ''}" controls class="h-6 w-36 sm:w-48 ml-1"></audio>
        </div>
        <div class="flex items-center space-x-1.5">
          <button type="button" data-action="cancel-voice-note" class="px-2 py-0.5 rounded-full hover:bg-rose-500/10 text-rose-400 text-[11px] font-medium cursor-pointer">Discard</button>
          <button type="button" data-action="attach-voice-note" class="px-3 py-0.5 rounded-full bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold text-[11px] cursor-pointer shadow-xs">Attach</button>
        </div>
      </div>
    `;
  }
}

export const voiceNotesManager = new VoiceNotesManager();
