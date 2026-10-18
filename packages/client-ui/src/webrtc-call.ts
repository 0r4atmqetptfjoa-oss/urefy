import { clientStore } from './client-state';

export interface CallSignalPayload {
  type: 'offer' | 'answer' | 'ice' | 'hangup' | 'busy';
  callId: string;
  callMode: 'audio' | 'video';
  senderId: string;
  senderName: string;
  targetChannelId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  timestamp: number;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const SAS_EMOJIS = ['🔐', '🛡️', '🚀', '💎', '⚡', '🌌', '🔥', '🧬', '🛰️', '🔮', '🦅', '🍀', '🎯', '🏆', '⚓', '👑'];

const WebRTCElementBase: { new(): HTMLElement; prototype: HTMLElement } =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as any);

export class WebRTCCallModal extends WebRTCElementBase {
  private shadow: ShadowRoot | null = null;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private callState: 'idle' | 'outgoing' | 'incoming' | 'connected' = 'idle';
  private callMode: 'audio' | 'video' = 'video';
  private activeCallId = '';
  private remotePeerName = '';
  private isMuted = false;
  private isCameraOff = false;
  private isScreenSharing = false;
  private isMinimized = false;
  private sasEmojis: string[] = [];
  private callSeconds = 0;
  private timerInterval: any = null;
  private ringtoneTimer: any = null;
  private processedSignals: Set<string> = new Set();
  private pendingOffer: RTCSessionDescriptionInit | null = null;

  constructor() {
    super();
    if (typeof this.attachShadow === 'function') {
      this.shadow = this.attachShadow({ mode: 'open' });
    }
  }

  connectedCallback(): void {
    this.render();
  }

  public async startCall(mode: 'audio' | 'video', channelName: string): Promise<void> {
    if (this.callState !== 'idle') return;
    this.callMode = mode;
    this.remotePeerName = channelName;

    const randomSuffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Date.now().toString(36);
    this.activeCallId = `call_${Date.now()}_${randomSuffix}`;
    this.callState = 'outgoing';
    this.isCameraOff = mode === 'audio';
    this.isMuted = false;
    this.render();
    this.startRingtone(true);

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('WebRTC mediaDevices indisponibil');
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });

      this.createPeerConnection();

      this.localStream.getTracks().forEach((track) => {
        if (this.pc && this.localStream) {
          this.pc.addTrack(track, this.localStream);
        }
      });

      const offer = await this.pc!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode === 'video',
      });
      await this.pc!.setLocalDescription(offer);

      await this.computeSasEmojis(offer.sdp || this.activeCallId);
      this.attachMediaStreams();

      this.sendSignal({
        type: 'offer',
        callId: this.activeCallId,
        callMode: mode,
        sdp: offer,
      });
    } catch (err) {
      console.error('[WebRTC] Call initiation error:', err);
      this.endCall(false);
      this.showCallError('Unable to access microphone/camera. Check browser permissions.');
    }
  }

  public async handleIncomingSignal(rawSignalJson: string): Promise<void> {
    try {
      const signal = JSON.parse(rawSignalJson) as CallSignalPayload;
      const currentUser = clientStore.getCurrentUser();
      if (!signal || !signal.callId || signal.senderId === currentUser?.id) return;

      const sigHash = `${signal.callId}:${signal.type}:${signal.timestamp}`;
      if (this.processedSignals.has(sigHash)) return;
      this.processedSignals.add(sigHash);

      if (signal.type === 'offer') {
        if (this.callState !== 'idle') {
          this.sendSignal({ type: 'busy', callId: signal.callId, callMode: signal.callMode });
          return;
        }
        this.activeCallId = signal.callId;
        this.callMode = signal.callMode;
        this.remotePeerName = signal.senderName || 'Encrypted Peer';
        this.callState = 'incoming';
        this.pendingOffer = signal.sdp || null;
        await this.computeSasEmojis(signal.sdp?.sdp || signal.callId);
        this.startRingtone(false);
        this.render();
      } else if (signal.type === 'answer' && signal.callId === this.activeCallId) {
        this.stopRingtone();
        if (this.pc && signal.sdp) {
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          this.callState = 'connected';
          this.startCallTimer();
          this.render();
          this.attachMediaStreams();
        }
      } else if (signal.type === 'ice' && signal.callId === this.activeCallId) {
        if (this.pc && signal.candidate) {
          await this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } else if ((signal.type === 'hangup' || signal.type === 'busy') && signal.callId === this.activeCallId) {
        this.endCall(false);
      }
    } catch (err) {
      console.error('[WebRTC] Signal processing error:', err);
    }
  }

  private async acceptIncomingCall(): Promise<void> {
    if (!this.pendingOffer) return;
    this.stopRingtone();

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('WebRTC mediaDevices unavailable');
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: this.callMode === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });

      this.createPeerConnection();

      this.localStream.getTracks().forEach((track) => {
        if (this.pc && this.localStream) {
          this.pc.addTrack(track, this.localStream);
        }
      });

      await this.pc!.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);

      this.callState = 'connected';
      this.startCallTimer();
      this.render();
      this.attachMediaStreams();

      this.sendSignal({
        type: 'answer',
        callId: this.activeCallId,
        callMode: this.callMode,
        sdp: answer,
      });
    } catch (err) {
      console.error('[WebRTC] Error answering call:', err);
      this.endCall(true);
      this.showCallError('Error connecting audio/video stream.');
    }
  }

  private createPeerConnection(): void {
    if (typeof RTCPeerConnection === 'undefined') return;
    this.pc = new RTCPeerConnection(RTC_CONFIG);
    this.remoteStream = new MediaStream();

    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
      this.attachMediaStreams();
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'ice',
          callId: this.activeCallId,
          callMode: this.callMode,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc?.connectionState === 'disconnected' || this.pc?.connectionState === 'failed') {
        this.endCall(false);
      }
    };
  }

  private sendSignal(partial: Partial<CallSignalPayload>): void {
    const user = clientStore.getCurrentUser();
    const activeChannel = clientStore.getActiveChannel();

    const fullSignal: CallSignalPayload = {
      type: partial.type || 'offer',
      callId: partial.callId || this.activeCallId,
      callMode: partial.callMode || this.callMode,
      senderId: user?.id || 'anon',
      senderName: user?.name || (user as any)?.displayName || 'User',
      targetChannelId: activeChannel?.id || 'general',
      sdp: partial.sdp,
      candidate: partial.candidate,
      timestamp: Date.now(),
    };

    clientStore.sendMessage(`[CALL_SIGNAL:${JSON.stringify(fullSignal)}]`);
  }

  private async toggleScreenShare(): Promise<void> {
    if (!this.pc) return;

    if (this.isScreenSharing) {
      this.screenStream?.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
      this.isScreenSharing = false;
      const camTrack = this.localStream?.getVideoTracks()[0];
      const sender = this.pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && camTrack) await sender.replaceTrack(camTrack);
      this.render();
      this.attachMediaStreams();
      return;
    }

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen sharing is not supported by this browser');
      }

      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = this.screenStream.getVideoTracks()[0];
      const sender = this.pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && screenTrack) {
        await sender.replaceTrack(screenTrack);
      }

      screenTrack.addEventListener('ended', () => {
        if (this.isScreenSharing) this.toggleScreenShare();
      });

      this.isScreenSharing = true;
      this.render();
      this.attachMediaStreams();
    } catch {
      // Utilizatorul a anulat selecția ecranului
    }
  }

  private toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !this.isMuted;
    });
    this.render();
    this.attachMediaStreams();
  }

  private toggleCamera(): void {
    this.isCameraOff = !this.isCameraOff;
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !this.isCameraOff;
    });
    this.render();
    this.attachMediaStreams();
  }

  public endCall(notifyRemote = true): void {
    if (notifyRemote && this.activeCallId) {
      this.sendSignal({ type: 'hangup', callId: this.activeCallId, callMode: this.callMode });
    }
    this.stopRingtone();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.callSeconds = 0;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.screenStream = null;
    this.callState = 'idle';
    this.isScreenSharing = false;
    this.pendingOffer = null;
    this.render();
  }

  private startCallTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.callSeconds = 0;
    this.timerInterval = setInterval(() => {
      this.callSeconds++;
      const timerEl = this.shadow?.getElementById('call-duration');
      if (timerEl) timerEl.textContent = this.formatDuration(this.callSeconds);
    }, 1000);
  }

  private formatDuration(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  private startRingtone(isOutgoing: boolean): void {
    this.stopRingtone();
    try {
      const AudioCtx = typeof window !== 'undefined'
        ? (window.AudioContext || (window as any).webkitAudioContext)
        : null;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playBeep = () => {
        if (this.callState === 'idle' || this.callState === 'connected') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isOutgoing ? 440 : 587.33, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.65);
      };

      playBeep();
      this.ringtoneTimer = setInterval(playBeep, 2000);
    } catch {
      // AudioContext blocat până la interacțiune
    }
  }

  private stopRingtone(): void {
    if (this.ringtoneTimer) {
      clearInterval(this.ringtoneTimer);
      this.ringtoneTimer = null;
    }
  }

  private async computeSasEmojis(material: string): Promise<void> {
    try {
      const data = new TextEncoder().encode(material);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const bytes = new Uint8Array(hashBuffer);
      this.sasEmojis = [
        SAS_EMOJIS[bytes[0] % SAS_EMOJIS.length],
        SAS_EMOJIS[bytes[1] % SAS_EMOJIS.length],
        SAS_EMOJIS[bytes[2] % SAS_EMOJIS.length],
        SAS_EMOJIS[bytes[3] % SAS_EMOJIS.length],
      ];
    } catch {
      this.sasEmojis = ['🔐', '🛡️', '⚡', '🚀'];
    }
  }

  private attachMediaStreams(): void {
    setTimeout(() => {
      if (!this.shadow) return;
      const localVideo = this.shadow.getElementById('local-video') as HTMLVideoElement | null;
      const remoteVideo = this.shadow.getElementById('remote-video') as HTMLVideoElement | null;
      if (localVideo && (this.screenStream || this.localStream)) {
        localVideo.srcObject = this.isScreenSharing ? this.screenStream : this.localStream;
      }
      if (remoteVideo && this.remoteStream) {
        remoteVideo.srcObject = this.remoteStream;
      }
    }, 50);
  }

  private showCallError(msg: string): void {
    console.warn('[WebRTC Alert]', msg);
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 z-[100000] bg-rose-950/90 border border-rose-500/40 text-rose-200 px-4 py-3 rounded-xl shadow-2xl text-xs backdrop-blur-md animate-bounce';
    toast.textContent = msg;
    document.body?.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
  }

  private render(): void {
    if (!this.shadow) return;
    if (this.callState === 'idle') {
      this.shadow.innerHTML = '';
      return;
    }

    this.shadow.innerHTML = `
      <style>
        .call-backdrop {
          position: fixed;
          inset: ${this.isMinimized ? 'auto 24px 24px auto' : '0'};
          width: ${this.isMinimized ? '340px' : '100vw'};
          height: ${this.isMinimized ? '220px' : '100vh'};
          background: ${this.isMinimized ? '#0f172a' : 'rgba(6, 10, 20, 0.92)'};
          backdrop-filter: blur(20px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: ${this.isMinimized ? '20px' : '0'};
          border: ${this.isMinimized ? '1px solid rgba(99,102,241,0.5)' : 'none'};
          box-shadow: 0 25px 70px rgba(0,0,0,0.75);
          font-family: 'Inter', system-ui, sans-serif;
          color: #f8fafc;
          overflow: hidden;
        }
        .call-container {
          width: 100%;
          max-width: 960px;
          height: 100%;
          max-height: 680px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: ${this.isMinimized ? '12px' : '28px'};
          position: relative;
        }
        .call-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 5;
        }
        .sas-badge {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(16, 185, 129, 0.4);
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .video-stage {
          flex: 1;
          position: relative;
          margin: 16px 0;
          border-radius: 24px;
          background: radial-gradient(circle, #1e1b4b, #0f172a);
          border: 1px solid rgba(148, 163, 184, 0.16);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #remote-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        #local-video {
          position: absolute;
          bottom: 16px;
          right: 16px;
          width: ${this.isMinimized ? '80px' : '210px'};
          height: ${this.isMinimized ? '55px' : '135px'};
          object-fit: cover;
          border-radius: 14px;
          border: 2px solid #6366f1;
          background: #090d16;
          box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        }
        .avatar-pulse {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          pointer-events: none;
        }
        .pulse-circle {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 38px;
          box-shadow: 0 0 0 16px rgba(99, 102, 241, 0.15);
        }
        .call-controls {
          display: flex;
          justify-content: center;
          gap: 14px;
          z-index: 5;
          flex-wrap: wrap;
        }
        .ctrl-btn {
          padding: 13px 20px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(30, 41, 59, 0.85);
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ctrl-btn.active-danger {
          background: rgba(239, 68, 68, 0.3);
          border-color: #ef4444;
        }
        .ctrl-btn.accept {
          background: #10b981;
          border-color: #059669;
        }
        .ctrl-btn.hangup {
          background: #ef4444;
          border-color: #dc2626;
        }
      </style>
      <div class="call-backdrop">
        <div class="call-container">
          <div class="call-top">
            <div>
              <strong style="font-size:16px;">${this.remotePeerName}</strong>
              <span id="call-duration" style="margin-left:10px;color:#34d399;font-family:monospace;">
                ${this.callState === 'connected' ? this.formatDuration(this.callSeconds) : this.callState === 'incoming' ? 'Incoming Encrypted Call...' : 'Calling P2P...'}
              </span>
            </div>
            <div class="sas-badge" title="Verify if peer sees the same 4 emojis for E2EE authentication">
              <span>E2EE SAS Key:</span>
              <span style="font-size:16px;letter-spacing:3px;">${this.sasEmojis.join(' ')}</span>
            </div>
            <button class="ctrl-btn" id="btn-min-call">${this.isMinimized ? '⤢ Expand' : '⤡ Minimize'}</button>
          </div>

          <div class="video-stage">
            <video id="remote-video" autoplay playsinline></video>
            <video id="local-video" autoplay playsinline muted></video>
            ${
              this.callMode === 'audio' || this.callState !== 'connected'
                ? `
              <div class="avatar-pulse">
                <div class="pulse-circle">${this.callMode === 'video' ? '📹' : '🎧'}</div>
                <div style="font-weight:700;font-size:18px;">${this.remotePeerName}</div>
                <div style="font-size:12px;color:#94a3b8;">DTLS-SRTP End-to-End Encrypted</div>
              </div>
            `
                : ''
            }
          </div>

          <div class="call-controls">
            ${
              this.callState === 'incoming'
                ? `
              <button class="ctrl-btn accept" id="btn-accept-call">📞 Answer (${this.callMode.toUpperCase()})</button>
              <button class="ctrl-btn hangup" id="btn-reject-call">✕ Decline</button>
            `
                : `
              <button class="ctrl-btn ${this.isMuted ? 'active-danger' : ''}" id="btn-toggle-mic">
                ${this.isMuted ? '🔇 Mic Muted' : '🎙️ Mic Active'}
              </button>
              ${
                this.callMode === 'video'
                  ? `
                <button class="ctrl-btn ${this.isCameraOff ? 'active-danger' : ''}" id="btn-toggle-cam">
                  ${this.isCameraOff ? '🚫 Camera Off' : '📹 Camera Active'}
                </button>
                <button class="ctrl-btn" id="btn-share-screen">
                  ${this.isScreenSharing ? '🛑 Stop Share' : '🖥️ Share Screen'}
                </button>
              `
                  : ''
              }
              <button class="ctrl-btn hangup" id="btn-hangup-call">☎️ End Call</button>
            `
            }
          </div>
        </div>
      </div>
    `;

    this.shadow.getElementById('btn-min-call')?.addEventListener('click', () => {
      this.isMinimized = !this.isMinimized;
      this.render();
      this.attachMediaStreams();
    });
    this.shadow.getElementById('btn-accept-call')?.addEventListener('click', () => this.acceptIncomingCall());
    this.shadow.getElementById('btn-reject-call')?.addEventListener('click', () => this.endCall(true));
    this.shadow.getElementById('btn-hangup-call')?.addEventListener('click', () => this.endCall(true));
    this.shadow.getElementById('btn-toggle-mic')?.addEventListener('click', () => this.toggleMute());
    this.shadow.getElementById('btn-toggle-cam')?.addEventListener('click', () => this.toggleCamera());
    this.shadow.getElementById('btn-share-screen')?.addEventListener('click', () => this.toggleScreenShare());
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('webrtc-call-modal')) {
  customElements.define('webrtc-call-modal', WebRTCCallModal);
}
