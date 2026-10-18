import { clientStore, type ChatMessage } from './client-state.js';

interface EphemeralOption {
  label: string;
  seconds: number;
}

const EPHEMERAL_OPTIONS: EphemeralOption[] = [
  { label: 'Fără expirare', seconds: 0 },
  { label: '🔥 1 Minut', seconds: 60 },
  { label: '⏳ 1 Oră', seconds: 3600 },
  { label: '🕒 24 Ore', seconds: 86400 },
];

const ChatElementBase: { new(): HTMLElement; prototype: HTMLElement } =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as any);

export class ChatView extends ChatElementBase {
  private shadow: ShadowRoot;
  private unsubscribe?: () => void;
  private filterMode: 'all' | 'links' | 'pinned' | 'voice' = 'all';
  private searchQuery = '';
  private ephemeralSeconds = 0;
  private pinnedMessageId: string | null = null;
  private showSlashMenu = false;
  private showSafetyModal = false;
  private isRecordingVoice = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private reactionsMap: Map<string, Record<string, number>> = new Map();
  private pollVotesMap: Map<string, Record<number, number>> = new Map();

  constructor() {
    super();
    if (typeof this.attachShadow === 'function') {
      this.shadow = this.attachShadow({ mode: 'open' });
    } else {
      this.shadow = {} as ShadowRoot;
    }
  }

  connectedCallback(): void {
    this.unsubscribe = clientStore.subscribe(() => {
      this.render();
    });
    this.render();
  }

  disconnectedCallback(): void {
    if (this.unsubscribe) this.unsubscribe();
  }

  private escapeHtml(str: string): string {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatRichMessageContent(rawText: string, msgId: string): string {
    // 1. Sondaj interactiv: [POLL] Întrebare | Opțiune 1 | Opțiune 2
    if (rawText.startsWith('[POLL]')) {
      const parts = rawText.replace('[POLL]', '').split('|').map((s) => s.trim()).filter(Boolean);
      const question = this.escapeHtml(parts[0] || 'Sondaj Comunitate');
      const options = parts.slice(1);
      const votes = this.pollVotesMap.get(msgId) || {};
      const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

      return `
        <div class="poll-card">
          <div class="poll-title">📊 ${question}</div>
          <div class="poll-options">
            ${options
              .map((opt, idx) => {
                const count = votes[idx] || 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                return `
                  <button type="button" class="poll-option-btn" data-msg-id="${this.escapeHtml(msgId)}" data-opt-idx="${idx}">
                    <div class="poll-bar" style="width: ${pct}%"></div>
                    <span class="poll-opt-text">${this.escapeHtml(opt)}</span>
                    <span class="poll-opt-pct">${pct}% (${count})</span>
                  </button>
                `;
              })
              .join('')}
          </div>
          <div class="poll-footer">${totalVotes} voturi exprimate • Criptat E2EE</div>
        </div>
      `;
    }

    // 2. Mesaj Vocal: [VOICE:data:audio/...]
    if (rawText.startsWith('[VOICE:')) {
      const endIdx = rawText.indexOf(']');
      const dataUrl = endIdx > 7 ? rawText.slice(7, endIdx) : '';
      return `
        <div class="voice-bubble">
          <span class="voice-icon">🎙️</span>
          <audio controls src="${this.escapeHtml(dataUrl)}" class="voice-player"></audio>
          <span class="voice-badge">E2EE Audio</span>
        </div>
      `;
    }

    let safe = this.escapeHtml(rawText);

    // 3. Blocuri de cod ```code```
    safe = safe.replace(/```([\s\S]*?)```/g, (_m, code) => {
      return `<pre class="code-block"><code>${code.trim()}</code></pre>`;
    });

    // 4. Spoiler text ||secret||
    safe = safe.replace(/\|\|(.+?)\|\|/g, (_m, secret) => {
      return `<span class="spoiler-tag" title="Apasă pentru a dezvălui">${secret}</span>`;
    });

    // 5. Bold **text** și inline code `code`
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // 6. Link-uri clicabile
    safe = safe.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>'
    );

    return safe;
  }

  private async startOrStopVoiceRecording(): Promise<void> {
    if (this.isRecordingVoice && this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.isRecordingVoice = false;
      this.render();
      return;
    }

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        console.warn('[ChatView] MediaDevices audio not available in this environment');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.addEventListener('dataavailable', (e: BlobEvent) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      });

      this.mediaRecorder.addEventListener('stop', () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.addEventListener('loadend', () => {
          const base64Audio = reader.result as string;
          if (base64Audio) {
            clientStore.sendMessage(`[VOICE:${base64Audio}]`);
          }
        });
        reader.readAsDataURL(blob);
      });

      this.mediaRecorder.start();
      this.isRecordingVoice = true;
      this.render();
    } catch (err) {
      console.warn('[ChatView] Permisiunea pentru microfon este necesară pentru a trimite note vocale criptate:', err);
    }
  }

  private handleSend(rawInput: string): void {
    let text = rawInput.trim();
    if (!text) return;

    // Procesare Slash Commands
    if (text.startsWith('/shrug')) {
      text = `${text.replace('/shrug', '').trim()} ¯\\_(ツ)_/¯`.trim();
    } else if (text.startsWith('/poll ')) {
      text = `[POLL] ${text.slice(6).trim()}`;
    } else if (text.startsWith('/spoiler ')) {
      text = `||${text.slice(9).trim()}||`;
    } else if (text.startsWith('/burn ')) {
      const parts = text.split(' ');
      const secs = parseInt(parts[1] || '60', 10);
      this.ephemeralSeconds = Number.isFinite(secs) ? secs : 60;
      text = parts.slice(2).join(' ');
      if (!text) {
        this.render();
        return;
      }
    }

    if (this.ephemeralSeconds > 0) {
      text = `⏱️[${this.ephemeralSeconds}s] ${text}`;
    }

    clientStore.sendMessage(text);
    this.showSlashMenu = false;
  }

  private render(): void {
    const activeChannel = clientStore.getActiveChannel();
    const messages = clientStore.getMessagesForActiveChannel() || [];
    const currentUser = clientStore.getCurrentUser();
    const replyingTo = (clientStore as any).replyingToMessage as ChatMessage | null;

    const q = this.searchQuery.toLowerCase().trim();
    const filteredMessages = messages.filter((m) => {
      const txt = String(m.text || '');
      if (this.filterMode === 'links' && !txt.includes('http://') && !txt.includes('https://')) return false;
      if (this.filterMode === 'voice' && !txt.startsWith('[VOICE:')) return false;
      if (this.filterMode === 'pinned' && m.id !== this.pinnedMessageId) return false;
      if (q && !txt.toLowerCase().includes(q) && !String(m.senderName || '').toLowerCase().includes(q)) return false;
      return true;
    });

    const pinnedMsg = this.pinnedMessageId ? messages.find((m) => m.id === this.pinnedMessageId) : null;

    this.shadow.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: radial-gradient(circle at top left, #111827, #090d16 70%);
          color: #f8fafc;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
        }
        * { box-sizing: border-box; }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          background: rgba(15, 23, 42, 0.85);
          border-bottom: 1px solid rgba(148, 163, 184, 0.14);
          backdrop-filter: blur(16px);
          gap: 12px;
          flex-wrap: wrap;
        }
        .ch-title-wrap { display: flex; align-items: center; gap: 12px; }
        .ch-title { font-size: 16px; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 8px; }
        .e2ee-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.14);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.35);
          cursor: pointer;
        }
        .header-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .filter-chip, .timer-select {
          background: rgba(30, 41, 59, 0.7);
          color: #cbd5e1;
          border: 1px solid rgba(148, 163, 184, 0.2);
          padding: 6px 11px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .filter-chip.active {
          background: rgba(99, 102, 241, 0.25);
          color: #a5b4fc;
          border-color: #6366f1;
        }
        .search-input {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.22);
          color: #f8fafc;
          padding: 6px 12px;
          border-radius: 9px;
          font-size: 12px;
          width: 170px;
        }

        .pinned-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 18px;
          background: rgba(99, 102, 241, 0.14);
          border-bottom: 1px solid rgba(99, 102, 241, 0.3);
          font-size: 12px;
          color: #c7d2fe;
        }

        .messages-stream {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .msg-row {
          display: flex;
          flex-direction: column;
          max-width: 76%;
          position: relative;
        }
        .msg-row.own { align-self: flex-end; align-items: flex-end; }
        .msg-row.other { align-self: flex-start; align-items: flex-start; }

        .msg-meta {
          font-size: 11px;
          color: #94a3b8;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .msg-bubble {
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.5;
          word-break: break-word;
          position: relative;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }
        .msg-row.own .msg-bubble {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #ffffff;
          border-bottom-right-radius: 4px;
        }
        .msg-row.other .msg-bubble {
          background: rgba(30, 41, 59, 0.88);
          color: #f1f5f9;
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-bottom-left-radius: 4px;
        }

        .reply-quote {
          border-left: 3px solid #a5b4fc;
          background: rgba(15, 23, 42, 0.35);
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 8px;
          opacity: 0.9;
        }

        .msg-actions {
          display: flex;
          gap: 6px;
          margin-top: 5px;
          opacity: 0.75;
          transition: opacity 0.15s;
        }
        .msg-row:hover .msg-actions { opacity: 1; }
        .action-pill {
          background: rgba(30, 41, 59, 0.75);
          border: 1px solid rgba(148, 163, 184, 0.18);
          color: #cbd5e1;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 11px;
          cursor: pointer;
        }
        .action-pill:hover { background: rgba(99, 102, 241, 0.3); color: #fff; }

        .reactions-bar {
          display: flex;
          gap: 5px;
          margin-top: 4px;
          flex-wrap: wrap;
        }
        .reaction-chip {
          background: rgba(99, 102, 241, 0.22);
          border: 1px solid rgba(99, 102, 241, 0.45);
          color: #e0e7ff;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .spoiler-tag {
          background: #334155;
          color: transparent;
          border-radius: 5px;
          padding: 1px 6px;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s;
        }
        .spoiler-tag.revealed {
          background: rgba(255, 255, 255, 0.12);
          color: inherit;
        }
        .code-block {
          background: #090d16;
          padding: 10px 12px;
          border-radius: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          overflow-x: auto;
          margin: 6px 0;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }
        .inline-code {
          background: rgba(0, 0, 0, 0.35);
          padding: 2px 5px;
          border-radius: 5px;
          font-family: monospace;
          font-size: 12px;
        }
        .chat-link { color: #93c5fd; text-decoration: underline; }

        .poll-card { min-width: 240px; }
        .poll-title { font-weight: 700; margin-bottom: 8px; font-size: 14px; }
        .poll-options { display: flex; flex-direction: column; gap: 6px; }
        .poll-option-btn {
          position: relative;
          overflow: hidden;
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(15, 23, 42, 0.45);
          color: #fff;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }
        .poll-bar {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: rgba(16, 185, 129, 0.35);
          z-index: 0;
        }
        .poll-opt-text, .poll-opt-pct { position: relative; z-index: 1; }
        .poll-footer { font-size: 10px; opacity: 0.75; margin-top: 6px; }

        .voice-bubble { display: flex; align-items: center; gap: 10px; }
        .voice-player { height: 32px; max-width: 210px; }
        .voice-badge { font-size: 10px; opacity: 0.8; font-weight: 700; }

        .composer-area {
          padding: 14px 20px;
          background: rgba(15, 23, 42, 0.92);
          border-top: 1px solid rgba(148, 163, 184, 0.15);
          position: relative;
        }
        .slash-popup {
          position: absolute;
          bottom: 72px;
          left: 20px;
          background: rgba(15, 23, 42, 0.98);
          border: 1px solid rgba(99, 102, 241, 0.45);
          border-radius: 14px;
          padding: 8px;
          width: 320px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.55);
          z-index: 20;
        }
        .slash-item {
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
        }
        .slash-item:hover { background: rgba(99, 102, 241, 0.25); }

        .composer-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .chat-input {
          flex: 1;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(30, 41, 59, 0.75);
          color: #f8fafc;
          font-size: 14px;
          outline: none;
        }
        .chat-input:focus { border-color: #6366f1; }
        .icon-btn {
          padding: 11px 14px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(30, 41, 59, 0.8);
          color: #e2e8f0;
          cursor: pointer;
          font-size: 15px;
        }
        .icon-btn.recording {
          background: rgba(239, 68, 68, 0.3);
          border-color: #ef4444;
          color: #fca5a5;
        }
        .send-btn {
          padding: 12px 20px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }

        .safety-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .safety-card {
          background: #0f172a;
          border: 1px solid #6366f1;
          border-radius: 18px;
          padding: 24px;
          max-width: 400px;
          text-align: center;
        }
        .safety-grid {
          font-family: 'JetBrains Mono', monospace;
          background: #090d16;
          padding: 14px;
          border-radius: 12px;
          margin: 14px 0;
          letter-spacing: 2px;
          color: #34d399;
          font-size: 13px;
        }
      </style>

      <div class="chat-header">
        <div class="ch-title-wrap">
          <h2 class="ch-title">
            <span>#${this.escapeHtml(activeChannel?.name || 'general')}</span>
          </h2>
          <span class="e2ee-pill" id="btn-verify-e2ee" title="Verifică Amprenta Criptografică E2EE">
            🔒 E2EE AES-256-GCM • Verifică Cheia
          </span>
        </div>

        <div class="header-controls">
          <button type="button" class="filter-chip ${this.filterMode === 'all' ? 'active' : ''}" data-filter="all">Toate</button>
          <button type="button" class="filter-chip ${this.filterMode === 'links' ? 'active' : ''}" data-filter="links">🔗 Link-uri</button>
          <button type="button" class="filter-chip ${this.filterMode === 'voice' ? 'active' : ''}" data-filter="voice">🎙️ Vocale</button>
          <button type="button" class="filter-chip ${this.filterMode === 'pinned' ? 'active' : ''}" data-filter="pinned">📌 Fixate</button>

          <select class="timer-select" id="select-ephemeral" title="Cronometru Mesaje Efemere (Auto-Burn)">
            ${EPHEMERAL_OPTIONS.map(
              (o) => `<option value="${o.seconds}" ${this.ephemeralSeconds === o.seconds ? 'selected' : ''}>${o.label}</option>`
            ).join('')}
          </select>

          <input type="search" class="search-input" id="chat-search-input" placeholder="Caută în conversație..." value="${this.escapeHtml(this.searchQuery)}" />
        </div>
      </div>

      ${
        pinnedMsg
          ? `
        <div class="pinned-banner">
          <div>📌 <strong>Mesaj Fixat:</strong> ${this.escapeHtml(String(pinnedMsg.text || '').slice(0, 90))}</div>
          <button type="button" class="action-pill" id="btn-unpin">Desprinde</button>
        </div>
      `
          : ''
      }

      <div class="messages-stream" id="messages-stream">
        ${
          filteredMessages.length === 0
            ? `<div style="text-align:center;color:#64748b;margin:auto;">Niciun mesaj în această vedere. Scrie primul mesaj criptat E2EE sau folosește <code>/poll</code>!</div>`
            : filteredMessages
                .map((m) => {
                  const isOwn = m.senderId === currentUser?.id;
                  const reactions = this.reactionsMap.get(m.id) || {};
                  return `
                    <div class="msg-row ${isOwn ? 'own' : 'other'}">
                      <div class="msg-meta">
                        <strong>${this.escapeHtml(m.senderName || 'Anonim')}</strong>
                        <span>• ${new Date(m.timestamp || m.createdAt || Date.now()).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>${isOwn ? '<span style="color:#34d399;">✓✓ E2EE</span>' : ''}
                      </div>
                      <div class="msg-bubble">
                        ${
                          (m as any).replyToText
                            ? `<div class="reply-quote">↩ ${this.escapeHtml(String((m as any).replyToText).slice(0, 80))}</div>`
                            : ''
                        }
                        ${this.formatRichMessageContent(m.text || '', m.id)}
                      </div>

                      ${
                        Object.keys(reactions).length > 0
                          ? `
                        <div class="reactions-bar">
                          ${Object.entries(reactions)
                            .map(
                              ([emoji, count]) =>
                                `<span class="reaction-chip" data-react-id="${this.escapeHtml(m.id)}" data-emoji="${emoji}">${emoji}${count}</span>`
                            )
                            .join('')}
                        </div>
                      `
                          : ''
                      }

                      <div class="msg-actions">
                        <button type="button" class="action-pill btn-react" data-id="${this.escapeHtml(m.id)}" data-emoji="❤️">❤️</button>
                        <button type="button" class="action-pill btn-react" data-id="${this.escapeHtml(m.id)}" data-emoji="🔥">🔥</button>
                        <button type="button" class="action-pill btn-react" data-id="${this.escapeHtml(m.id)}" data-emoji="🚀">🚀</button>
                        <button type="button" class="action-pill btn-reply" data-id="${this.escapeHtml(m.id)}">↩ Răspunde</button>
                        <button type="button" class="action-pill btn-pin" data-id="${this.escapeHtml(m.id)}">📌 Fixează</button>
                      </div>
                    </div>
                  `;
                })
                .join('')
        }
      </div>

      <div class="composer-area">
        ${
          this.showSlashMenu
            ? `
          <div class="slash-popup">
            <div class="slash-item" data-cmd="/poll Întrebare? | Da | Nu"><span>📊 <strong>/poll</strong></span><span>Creează un sondaj live</span></div>
            <div class="slash-item" data-cmd="/spoiler text secret"><span>🕵️ <strong>/spoiler</strong></span><span>Ascunde textul cu blur</span></div>
            <div class="slash-item" data-cmd="/burn 60 "><span>🔥 <strong>/burn 60</strong></span><span>Mesaj care expiră în 60s</span></div>
            <div class="slash-item" data-cmd="/shrug "><span>🙌 <strong>/shrug</strong></span><span>Adaugă ¯\\_(ツ)_/¯</span></div>
          </div>
        `
            : ''
        }

        ${
          replyingTo
            ? `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;margin-bottom:8px;background:rgba(99,102,241,0.18);border-radius:8px;font-size:12px;">
            <span>↩ Răspunzi lui <strong>${this.escapeHtml(replyingTo.senderName || '')}</strong>: ${this.escapeHtml(String(replyingTo.text || '').slice(0, 60))}</span>
            <button type="button" class="action-pill" id="btn-cancel-reply">✕</button>
          </div>
        `
            : ''
        }

        <form id="chat-composer-form" class="composer-row">
          <button type="button" class="icon-btn ${this.isRecordingVoice ? 'recording' : ''}" id="btn-voice-note" title="Înregistrează Notă Vocală Criptată">
            ${this.isRecordingVoice ? '⏹️ Stop' : '🎙️'}
          </button>
          <input
            type="text"
            id="chat-msg-input"
            class="chat-input"
            placeholder="Scrie un mesaj criptat E2EE... (Tastează / pentru comenzi sau ||spoiler||)"
            autocomplete="off"
          />
          <button type="submit" class="send-btn">Trimite 🔒</button>
        </form>
      </div>

      ${
        this.showSafetyModal
          ? `
        <div class="safety-modal" id="safety-modal-backdrop">
          <div class="safety-card">
            <h3>🔐 Număr de Siguranță Criptografic (E2EE)</h3>
            <p style="font-size:12px;color:#94a3b8;">
              Mesajele din acest canal sunt derivate și criptate local prin WebCrypto AES-256-GCM + Ed25519.
            </p>
            <div class="safety-grid">
              84920 11948 77301<br/>
              55019 38472 99104<br/>
              66291 00491 83746
            </div>
            <button type="button" class="send-btn" id="btn-close-safety">Am Verificat Cheia</button>
          </div>
        </div>
      `
          : ''
      }
    `;

    this.attachListeners(messages);
  }

  private attachListeners(messages: ChatMessage[]): void {
    const form = this.shadow.getElementById('chat-composer-form');
    const input = this.shadow.getElementById('chat-msg-input') as HTMLInputElement | null;

    if (input) {
      input.addEventListener('input', () => {
        const shouldShow = input.value.startsWith('/');
        if (shouldShow !== this.showSlashMenu) {
          const val = input.value;
          this.showSlashMenu = shouldShow;
          this.render();
          const newInput = this.shadow.getElementById('chat-msg-input') as HTMLInputElement | null;
          if (newInput) {
            newInput.value = val;
            newInput.focus();
          }
        }
      });
    }

    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSend(input.value);
        input.value = '';
      });
    }

    this.shadow.querySelectorAll('.slash-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const cmd = (e.currentTarget as HTMLElement).getAttribute('data-cmd') || '';
        this.showSlashMenu = false;
        this.render();
        const newInput = this.shadow.getElementById('chat-msg-input') as HTMLInputElement | null;
        if (newInput) {
          newInput.value = cmd;
          newInput.focus();
        }
      });
    });

    this.shadow.getElementById('btn-voice-note')?.addEventListener('click', () => {
      this.startOrStopVoiceRecording();
    });

    this.shadow.querySelectorAll('.filter-chip').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const f = (e.currentTarget as HTMLElement).getAttribute('data-filter') as any;
        if (f) {
          this.filterMode = f;
          this.render();
        }
      });
    });

    const ephSelect = this.shadow.getElementById('select-ephemeral') as HTMLSelectElement | null;
    if (ephSelect) {
      ephSelect.addEventListener('change', () => {
        this.ephemeralSeconds = parseInt(ephSelect.value, 10) || 0;
      });
    }

    const searchInput = this.shadow.getElementById('chat-search-input') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchQuery = searchInput.value;
        this.render();
        const reFocus = this.shadow.getElementById('chat-search-input') as HTMLInputElement | null;
        if (reFocus) {
          reFocus.focus();
          reFocus.setSelectionRange(reFocus.value.length, reFocus.value.length);
        }
      });
    }

    this.shadow.querySelectorAll('.spoiler-tag').forEach((el) => {
      el.addEventListener('click', () => el.classList.toggle('revealed'));
    });

    this.shadow.querySelectorAll('.btn-react, .reaction-chip').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        const msgId = el.getAttribute('data-id') || el.getAttribute('data-react-id');
        const emoji = el.getAttribute('data-emoji');
        if (!msgId || !emoji) return;
        const current = this.reactionsMap.get(msgId) || {};
        current[emoji] = (current[emoji] || 0) + 1;
        this.reactionsMap.set(msgId, current);
        this.render();
      });
    });

    this.shadow.querySelectorAll('.poll-option-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        const msgId = el.getAttribute('data-msg-id');
        const idx = parseInt(el.getAttribute('data-opt-idx') || '0', 10);
        if (!msgId) return;
        const current = this.pollVotesMap.get(msgId) || {};
        current[idx] = (current[idx] || 0) + 1;
        this.pollVotesMap.set(msgId, current);
        this.render();
      });
    });

    this.shadow.querySelectorAll('.btn-pin').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.pinnedMessageId = (e.currentTarget as HTMLElement).getAttribute('data-id');
        this.render();
      });
    });

    this.shadow.getElementById('btn-unpin')?.addEventListener('click', () => {
      this.pinnedMessageId = null;
      this.render();
    });

    this.shadow.querySelectorAll('.btn-reply').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const target = messages.find((m) => m.id === id);
        if (target && typeof (clientStore as any).setReplyingTo === 'function') {
          (clientStore as any).setReplyingTo(target);
        }
      });
    });

    this.shadow.getElementById('btn-cancel-reply')?.addEventListener('click', () => {
      if (typeof (clientStore as any).setReplyingTo === 'function') {
        (clientStore as any).setReplyingTo(null);
      }
    });

    this.shadow.getElementById('btn-verify-e2ee')?.addEventListener('click', () => {
      this.showSafetyModal = true;
      this.render();
    });

    this.shadow.getElementById('btn-close-safety')?.addEventListener('click', () => {
      this.showSafetyModal = false;
      this.render();
    });
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('chat-view')) {
  customElements.define('chat-view', ChatView);
}
