// Fișier: packages/client-ui/src/dm-workspace.ts
import { escapeHtml } from './sanitize.js';
import {
  DmClientService,
  type DmDecryptedMessage,
  type DmStoredSessionRecord,
} from './dm-client.js';
import {
  SovereignVoiceRecorder,
  encodeVoiceNoteMessage,
  parseVoiceNoteMessage,
  renderVoiceNoteBubble,
  bindVoiceNotePlayers,
} from './dm-voice-notes.js';
import { renderSovereignCodeBlock } from './code-highlighter.js';

interface DmReactionMap {
  [messageId: string]: { [emoji: string]: string[] };
}

interface DmReplyMetadata {
  replyToId?: string;
  replyToSender?: string;
  replyToSnippet?: string;
  body: string;
}

const QUICK_REACTIONS = ['⚡', '🔥', '🛡️', '❤️', '👀'];

export class DmWorkspaceController {
  private client: DmClientService | null = null;
  private activePeerFingerprint: string | null = null;
  private isOpen = false;
  private pollTimer: number | null = null;
  private unreadTotal = 0;

  // 2027 Hibrid WhatsApp + Discord state
  private peerFilterQuery = '';
  private peerFilterTab: 'all' | 'verified' | 'recent' = 'all';
  private messageSearchQuery = '';
  private replyingToMessage: DmDecryptedMessage | null = null;
  private showSecurityInspector = true;
  private reactions: DmReactionMap = {};
  private verifiedPeers = new Set<string>();

  private getIdentity: () => Promise<{
    fingerprint: string;
    publicKeyHex: string;
    privateKeyHex: string;
  } | null>;
  private notify: (msg: string, type?: 'success' | 'error' | 'info') => void;

  constructor(options: {
    getIdentity: () => Promise<{
      fingerprint: string;
      publicKeyHex: string;
      privateKeyHex: string;
    } | null>;
    notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  }) {
    this.getIdentity = options.getIdentity;
    this.notify = options.notify;
    this.loadLocalChatState();
  }

  private loadLocalChatState(): void {
    try {
      const savedReactions = localStorage.getItem('urefy_dm_reactions_v1');
      if (savedReactions) this.reactions = JSON.parse(savedReactions);
      const savedVerified = localStorage.getItem('urefy_dm_verified_peers_v1');
      if (savedVerified) this.verifiedPeers = new Set(JSON.parse(savedVerified));
    } catch (_) {}
  }

  private saveLocalChatState(): void {
    try {
      localStorage.setItem('urefy_dm_reactions_v1', JSON.stringify(this.reactions));
      localStorage.setItem('urefy_dm_verified_peers_v1', JSON.stringify(Array.from(this.verifiedPeers)));
    } catch (_) {}
  }

  /**
   * Împachetează/despachetează transparent metadatele de Reply în interiorul payload-ului E2EE
   */
  private encodeMessageWithReply(text: string): string {
    if (!this.replyingToMessage) return text;
    const header = `>>> [REPLY:${this.replyingToMessage.id}|${this.replyingToMessage.senderFingerprint.slice(0, 12)}|${this.replyingToMessage.plaintext.replace(/\n/g, ' ').slice(0, 70)}]\n`;
    return header + text;
  }

  private parseMessageWithReply(rawPlaintext: string): DmReplyMetadata {
    const match = rawPlaintext.match(/^>>> \[REPLY:([^|]+)\|([^|]+)\|([^\]]+)\]\n([\s\S]*)$/);
    if (!match) {
      return { body: rawPlaintext };
    }
    return {
      replyToId: match[1],
      replyToSender: match[2],
      replyToSnippet: match[3],
      body: match[4],
    };
  }

  /**
   * Formatează Markdown, note vocale E2EE și blocuri de cod 2027 cu numere de linie
   */
  private renderRichMessageBody(rawBody: string): string {
    const voicePayload = parseVoiceNoteMessage(rawBody.trim());
    if (voicePayload) {
      const msgId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `vn-${Date.now()}`;
      return renderVoiceNoteBubble(voicePayload, msgId);
    }

    const blocks: string[] = [];
    const withPlaceholders = rawBody.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
      const idx = blocks.length;
      blocks.push(renderSovereignCodeBlock(code, lang));
      return `@@NX_CODE_BLOCK_${idx}@@`;
    });

    let safe = escapeHtml(withPlaceholders);
    // Inline code
    safe = safe.replace(/`([^`]+)`/g, '<code class="sh-inline-code">$1</code>');
    // Bold
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Links
    safe = safe.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="nx-msg-link">$1</a>'
    );

    blocks.forEach((html, idx) => {
      safe = safe.replace(`@@NX_CODE_BLOCK_${idx}@@`, html);
    });

    return safe;
  }

  public async ensureClient(): Promise<DmClientService | null> {
    if (this.client) return this.client;
    const id = await this.getIdentity();
    if (!id || !id.fingerprint || !id.publicKeyHex || !id.privateKeyHex) {
      return null;
    }
    this.client = new DmClientService({
      fingerprint: id.fingerprint,
      identityPublicKeyHex: id.publicKeyHex,
      identityPrivateKeyHex: id.privateKeyHex,
    });
    return this.client;
  }

  public async openWithPeer(peerFingerprint: string): Promise<void> {
    const clean = peerFingerprint.trim();
    if (clean) {
      this.activePeerFingerprint = clean;
    }
    await this.open();
  }

  public async toggle(): Promise<void> {
    if (this.isOpen) {
      this.close();
    } else {
      await this.open();
    }
  }

  public close(): void {
    this.isOpen = false;
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    const root = document.getElementById('dm-workspace-modal');
    if (root) {
      root.style.display = 'none';
      root.innerHTML = '';
    }
  }

  public async open(): Promise<void> {
    const client = await this.ensureClient();
    if (!client) {
      this.notify('Deblochează sau generează o Identitate Suverană pentru a folosi Nexus E2EE Chat.', 'error');
      return;
    }

    this.isOpen = true;
    this.renderShell();
    await this.syncAndRender(true);

    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
    }
    this.pollTimer = window.setInterval(() => {
      if (this.isOpen) {
        this.syncAndRender(false).catch(() => {});
      }
    }, 6000);
  }

  public async refreshDevicesAndInbox(): Promise<void> {
    const client = await this.ensureClient();
    if (!client) return;
    try {
      await client.ensureInitialized();
      const incoming = await client.pollInbox();
      if (incoming.length > 0 && !this.isOpen) {
        this.unreadTotal += incoming.length;
        this.updateHeaderBadge();
      }
    } catch (_) {}
  }

  private updateHeaderBadge(): void {
    const badge = document.getElementById('dm-unread-badge');
    if (!badge) return;
    if (this.unreadTotal > 0) {
      badge.textContent = this.unreadTotal > 99 ? '99+' : String(this.unreadTotal);
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  private renderShell(): void {
    let modal = document.getElementById('dm-workspace-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dm-workspace-modal';
      document.body.appendChild(modal);
    }

    this.unreadTotal = 0;
    this.updateHeaderBadge();

    modal.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9998;
      background: rgba(3, 5, 9, 0.82);
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    `;

    modal.innerHTML = `
      <div class="nx-chat-shell" role="dialog" aria-modal="true" aria-label="Nexus Sovereign Chat 2027">
        <!-- TOP COMMAND BAR -->
        <header class="nx-topbar">
          <div class="nx-topbar-left">
            <div class="nx-brand-orb">
              <span class="nx-orb-dot"></span>
              <span>🛡️</span>
            </div>
            <div>
              <div class="nx-brand-title">
                NEXUS SOVEREIGN MESSENGER
                <span class="nx-pqc-pill">HYBRID PQC • X25519 + ML-KEM-768</span>
              </div>
              <div id="dm-device-status-line" class="nx-brand-sub">Inițializare seif criptografic local...</div>
            </div>
          </div>

          <div class="nx-topbar-actions">
            <button id="dm-sync-now-btn" type="button" class="nx-top-btn" title="Sincronizează Inbox-ul acum">
              ↻ Sincronizează
            </button>
            <button id="dm-toggle-inspector-btn" type="button" class="nx-top-btn ${this.showSecurityInspector ? 'active' : ''}" title="Comută panoul de securitate">
              🔐 Criptografie
            </button>
            <button id="dm-close-modal-btn" type="button" class="nx-close-btn" aria-label="Închide">
              ✕
            </button>
          </div>
        </header>

        <!-- 3-PANE DISCORD + WHATSAPP WORKSPACE -->
        <div class="nx-main-grid ${this.showSecurityInspector ? 'with-inspector' : 'no-inspector'}">
          <!-- LEFT SIDEBAR: CHANNELS & CONTACTS -->
          <aside class="nx-sidebar">
            <div class="nx-new-session-box">
              <div class="nx-section-title">CONECTARE NOD NOU (FINGERPRINT)</div>
              <div class="nx-new-peer-row">
                <input
                  id="dm-new-peer-input"
                  type="text"
                  class="nx-input"
                  placeholder="Ex: 0x8f9c... sau fingerprint"
                  autocomplete="off"
                />
                <button id="dm-start-peer-btn" type="button" class="nx-primary-btn" title="Inițiază handshake PQC">
                  +
                </button>
              </div>
              <div class="nx-search-peer-row">
                <input
                  id="dm-filter-peers-input"
                  type="text"
                  class="nx-input nx-input-sm"
                  placeholder="🔍 Filtrează conversații..."
                  value="${escapeHtml(this.peerFilterQuery)}"
                />
              </div>
              <div class="nx-peer-tabs">
                <button type="button" class="nx-peer-tab ${this.peerFilterTab === 'all' ? 'active' : ''}" data-ptab="all">Toate</button>
                <button type="button" class="nx-peer-tab ${this.peerFilterTab === 'verified' ? 'active' : ''}" data-ptab="verified">Verificate ✓</button>
                <button type="button" class="nx-peer-tab ${this.peerFilterTab === 'recent' ? 'active' : ''}" data-ptab="recent">Recente</button>
              </div>
            </div>

            <div class="nx-peers-category-header">
              <span>MESAJE DIRECTE CRIPTATE</span>
              <span id="nx-peers-count" class="nx-count-pill">0</span>
            </div>
            <div id="dm-peers-list" class="nx-peers-list"></div>

            <!-- DISCORD-STYLE SELF USER FOOTER -->
            <div id="nx-self-card" class="nx-self-card"></div>
          </aside>

          <!-- CENTER PANE: WHATSAPP + DISCORD CONVERSATION -->
          <section class="nx-chat-center">
            <div id="dm-active-peer-header" class="nx-conv-header"></div>

            <!-- IN-CHAT SEARCH BAR -->
            <div id="nx-conv-search-bar" class="nx-conv-search-bar" style="display:none;">
              <input
                id="nx-in-chat-search-input"
                type="text"
                class="nx-input nx-input-sm"
                placeholder="Caută în mesajele decriptate din această conversație..."
                value="${escapeHtml(this.messageSearchQuery)}"
              />
              <button type="button" id="nx-clear-chat-search-btn" class="nx-top-btn">Închide</button>
            </div>

            <!-- MESSAGES STREAM -->
            <div id="dm-messages-container" class="nx-messages-stream"></div>

            <!-- WHATSAPP-STYLE REPLY PREVIEW BANNER -->
            <div id="nx-reply-banner" class="nx-reply-banner" style="display:none;"></div>

            <!-- COMPOSER BAR -->
            <form id="dm-compose-form" class="nx-composer-form">
              <div class="nx-composer-toolbar">
                <button type="button" class="nx-tool-chip" data-cmd="code" title="Inserează bloc de cod">
                  &lt;/&gt; Cod
                </button>
                <button type="button" id="nx-voice-record-btn" class="nx-tool-chip" title="Înregistrează Notă Vocală E2EE">
                  🎙️ Voice Note
                </button>
                <button type="button" class="nx-tool-chip" data-cmd="verify" title="Trimite dovadă de verificare">
                  🛡️ Atestare PQC
                </button>
                <button type="button" class="nx-tool-chip" data-cmd="shrug" title="Comandă rapidă">
                  /shrug
                </button>
                <span class="nx-composer-hint">Shift+Enter linie nouă • Enter trimite E2EE</span>
              </div>
              <div class="nx-composer-row">
                <textarea
                  id="dm-compose-input"
                  rows="2"
                  class="nx-composer-textarea"
                  placeholder="Scrie un mesaj criptat E2EE... (suportă **bold**, \`cod\`, \`\`\`blocuri de cod\`\`\` sau /verify)"
                ></textarea>
                <button id="dm-send-btn" type="submit" class="nx-send-btn">
                  <span>Trimite</span>
                  <span class="nx-send-icon">➤</span>
                </button>
              </div>
            </form>
          </section>

          <!-- RIGHT PANE: CRYPTOGRAPHIC SECURITY INSPECTOR -->
          <aside id="nx-security-inspector" class="nx-inspector" style="${this.showSecurityInspector ? '' : 'display:none;'}"></aside>
        </div>
      </div>
    `;

    this.bindShellEvents(modal);
  }

  private bindShellEvents(modal: HTMLElement): void {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });

    document.getElementById('dm-close-modal-btn')?.addEventListener('click', () => this.close());

    document.getElementById('dm-sync-now-btn')?.addEventListener('click', () => {
      this.syncAndRender(true).catch(() => {});
    });

    document.getElementById('dm-toggle-inspector-btn')?.addEventListener('click', (e) => {
      this.showSecurityInspector = !this.showSecurityInspector;
      const btn = e.currentTarget as HTMLElement;
      btn.classList.toggle('active', this.showSecurityInspector);
      const grid = modal.querySelector('.nx-main-grid');
      const inspector = document.getElementById('nx-security-inspector');
      if (grid) {
        grid.classList.toggle('with-inspector', this.showSecurityInspector);
        grid.classList.toggle('no-inspector', !this.showSecurityInspector);
      }
      if (inspector) {
        inspector.style.display = this.showSecurityInspector ? '' : 'none';
      }
    });

    document.getElementById('dm-start-peer-btn')?.addEventListener('click', () => {
      const input = document.getElementById('dm-new-peer-input') as HTMLInputElement | null;
      const peer = input?.value.trim() || '';
      if (!peer) return;
      this.activePeerFingerprint = peer;
      if (input) input.value = '';
      this.renderConversationState();
    });

    document.getElementById('dm-new-peer-input')?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('dm-start-peer-btn')?.click();
      }
    });

    document.getElementById('dm-filter-peers-input')?.addEventListener('input', (e) => {
      this.peerFilterQuery = (e.target as HTMLInputElement).value;
      this.renderConversationState();
    });

    modal.querySelectorAll<HTMLButtonElement>('.nx-peer-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.peerFilterTab = (tab.dataset.ptab as 'all' | 'verified' | 'recent') || 'all';
        modal.querySelectorAll('.nx-peer-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderConversationState();
      });
    });

    document.getElementById('nx-in-chat-search-input')?.addEventListener('input', (e) => {
      this.messageSearchQuery = (e.target as HTMLInputElement).value;
      this.renderConversationState();
    });

    document.getElementById('nx-clear-chat-search-btn')?.addEventListener('click', () => {
      this.messageSearchQuery = '';
      const bar = document.getElementById('nx-conv-search-bar');
      const input = document.getElementById('nx-in-chat-search-input') as HTMLInputElement | null;
      if (input) input.value = '';
      if (bar) bar.style.display = 'none';
      this.renderConversationState();
    });

    // Quick composer toolbar chips
    modal.querySelectorAll<HTMLButtonElement>('.nx-tool-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const textarea = document.getElementById('dm-compose-input') as HTMLTextAreaElement | null;
        if (!textarea) return;
        const cmd = chip.dataset.cmd;
        if (cmd === 'code') {
          textarea.value += (textarea.value ? '\n' : '') + '```ts\n// cod verificat\n```';
        } else if (cmd === 'verify') {
          textarea.value = '🛡️ [ATESTARE PQC]: Am verificat amprenta sesiunii X25519 + ML-KEM-768.';
        } else if (cmd === 'shrug') {
          textarea.value += ' ¯\\_(ツ)_/¯';
        }
        textarea.focus();
      });
    });

    const voiceBtn = document.getElementById('nx-voice-record-btn') as HTMLButtonElement | null;
    let voiceRecorder: SovereignVoiceRecorder | null = null;
    voiceBtn?.addEventListener('click', async () => {
      if (!this.activePeerFingerprint) {
        this.notify('Selectează un contact înainte de a trimite o notă vocală.', 'info');
        return;
      }
      if (!voiceRecorder) {
        voiceRecorder = new SovereignVoiceRecorder();
      }

      if (!voiceRecorder.isRecording()) {
        try {
          await voiceRecorder.start();
          if (voiceBtn) {
            voiceBtn.innerHTML = '⏹️ Înregistrare... (Stop)';
            voiceBtn.classList.add('recording');
          }
        } catch (err: any) {
          this.notify(`Microfon indisponibil: ${err?.message || 'Eroare acces'}`, 'error');
        }
      } else {
        if (voiceBtn) {
          voiceBtn.innerHTML = '⏳ Criptare Opus...';
          voiceBtn.classList.remove('recording');
        }
        try {
          const payload = await voiceRecorder.stop();
          const encoded = encodeVoiceNoteMessage(payload);
          await this.client?.sendMessage(this.activePeerFingerprint, encoded);
          this.saveLocalChatState();
          this.renderConversationState();
        } catch (err: any) {
          this.notify(`Eroare salvare audio: ${err?.message || 'Eroare'}`, 'error');
        } finally {
          if (voiceBtn) voiceBtn.innerHTML = '🎙️ Voice Note';
        }
      }
    });

    const composeInput = document.getElementById('dm-compose-input') as HTMLTextAreaElement | null;
    composeInput?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('dm-compose-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });

    document.getElementById('dm-compose-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSendCurrentMessage();
    });
  }

  private async syncAndRender(showProvisionStatus: boolean): Promise<void> {
    const client = await this.ensureClient();
    if (!client) return;

    const statusLine = document.getElementById('dm-device-status-line');
    try {
      const initRes = await client.ensureInitialized();
      const incoming = await client.pollInbox();
      if (statusLine) {
        statusLine.textContent = `Dispozitiv activ: ${initRes.deviceId} • Pachete OPK în rezervă: ${initRes.remainingOneTimePreKeys}`;
      }
      if (incoming.length > 0 && showProvisionStatus) {
        this.notify(`${incoming.length} mesaje noi decriptate local.`, 'success');
      }
    } catch (err: any) {
      if (statusLine) {
        statusLine.textContent = `Mod local activ (${err?.message || 'se așteaptă conexiunea D1'})`;
      }
    }

    this.renderConversationState();
  }

  private renderConversationState(): void {
    const client = this.client;
    if (!client) return;

    const peersListEl = document.getElementById('dm-peers-list');
    const headerEl = document.getElementById('dm-active-peer-header');
    const messagesEl = document.getElementById('dm-messages-container');
    const selfCardEl = document.getElementById('nx-self-card');
    const inspectorEl = document.getElementById('nx-security-inspector');
    const peersCountEl = document.getElementById('nx-peers-count');
    if (!peersListEl || !headerEl || !messagesEl) return;

    // Self user footer
    if (selfCardEl) {
      const myFp = client.getMyFingerprint();
      selfCardEl.innerHTML = `
        <div class="nx-self-avatar">🟢</div>
        <div class="nx-self-meta">
          <div class="nx-self-name">${escapeHtml(myFp.slice(0, 18))}</div>
          <div class="nx-self-device">Dispozitiv: ${escapeHtml(client.getDeviceId().slice(0, 12))}</div>
        </div>
        <button type="button" id="nx-copy-my-fp-btn" class="nx-mini-copy-btn" title="Copiază propriul Fingerprint">
          📋
        </button>
      `;
      document.getElementById('nx-copy-my-fp-btn')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(myFp).catch(() => {});
        this.notify('Amprenta ta criptografică a fost copiată în clipboard!', 'info');
      });
    }

    const sessions = client.listPeerSessions();
    const allMessages = client.getMessages();

    const peerSet = new Set<string>();
    sessions.forEach((s) => peerSet.add(s.peerFingerprint));
    allMessages.forEach((m) => peerSet.add(m.peerFingerprint));
    if (this.activePeerFingerprint) {
      peerSet.add(this.activePeerFingerprint);
    }

    let peers = Array.from(peerSet);
    if (this.peerFilterQuery.trim()) {
      const q = this.peerFilterQuery.trim().toLowerCase();
      peers = peers.filter((p) => p.toLowerCase().includes(q));
    }
    if (this.peerFilterTab === 'verified') {
      peers = peers.filter((p) => this.verifiedPeers.has(p));
    } else if (this.peerFilterTab === 'recent') {
      peers = peers.slice(0, 8);
    }

    if (peersCountEl) peersCountEl.textContent = String(peers.length);

    if (!this.activePeerFingerprint && peers.length > 0) {
      this.activePeerFingerprint = peers[0];
    }

    // 1. Randare Sidebar Contacte (WhatsApp preview + Discord pill)
    if (peers.length === 0) {
      peersListEl.innerHTML = `
        <div class="nx-empty-peers">
          Introdu un <strong>Fingerprint</strong> mai sus sau apasă pe butonul <strong>💬 E2EE DM</strong> din dreptul oricărui autor din feed.
        </div>
      `;
    } else {
      peersListEl.innerHTML = peers
        .map((peer) => {
          const isActive = peer === this.activePeerFingerprint;
          const peerMsgs = client.getMessages(peer);
          const lastMsg = peerMsgs.length > 0 ? peerMsgs[peerMsgs.length - 1] : null;
          const parsedLast = lastMsg ? this.parseMessageWithReply(lastMsg.plaintext) : null;
          const lastSnippet = parsedLast
            ? parsedLast.body.slice(0, 36) + (parsedLast.body.length > 36 ? '…' : '')
            : 'Sesiune pregătită pentru handshake';
          const lastTime = lastMsg
            ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
          const isVerified = this.verifiedPeers.has(peer);
          const initials = peer.replace(/^0x/i, '').slice(0, 2).toUpperCase();

          return `
            <button type="button" class="nx-peer-item ${isActive ? 'active' : ''}" data-peer="${escapeHtml(peer)}">
              <div class="nx-peer-avatar">
                <span>${escapeHtml(initials)}</span>
                <span class="nx-peer-status-dot ${isVerified ? 'verified' : ''}"></span>
              </div>
              <div class="nx-peer-content">
                <div class="nx-peer-top">
                  <span class="nx-peer-name">
                    ${escapeHtml(peer.slice(0, 16))}${peer.length > 16 ? '…' : ''}
                    ${isVerified ? '<span class="nx-verified-check" title="Cheie PQC verificată">✓</span>' : ''}
                  </span>
                  <span class="nx-peer-time">${escapeHtml(lastTime)}</span>
                </div>
                <div class="nx-peer-bottom">
                  <span class="nx-peer-preview">${escapeHtml(lastSnippet)}</span>
                  ${peerMsgs.length > 0 ? `<span class="nx-peer-msg-count">${peerMsgs.length}</span>` : ''}
                </div>
              </div>
            </button>
          `;
        })
        .join('');

      peersListEl.querySelectorAll<HTMLButtonElement>('.nx-peer-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-peer');
          if (target) {
            this.activePeerFingerprint = target;
            this.replyingToMessage = null;
            this.updateReplyBanner();
            this.renderConversationState();
          }
        });
      });
    }

    // 2. Randare Header + Stream Mesaje pentru conversația activă
    if (!this.activePeerFingerprint) {
      headerEl.innerHTML = `<span class="nx-muted">Selectează sau inițiază o conversație E2EE din panoul stâng.</span>`;
      messagesEl.innerHTML = `
        <div class="nx-empty-conv">
          <div class="nx-empty-conv-orb">🔐</div>
          <h3>Seif de Comunicații Post-Cuantice</h3>
          <p>Fiecare mesaj este sigilat cu <strong>X25519 + ML-KEM-768</strong> și <strong>AES-256-GCM</strong> direct în browserul tău înainte de transport.</p>
        </div>
      `;
      if (inspectorEl) inspectorEl.innerHTML = '';
      return;
    }

    const peerSessions: DmStoredSessionRecord[] = sessions.filter(
      (s) => s.peerFingerprint === this.activePeerFingerprint
    );
    const isPeerVerified = this.verifiedPeers.has(this.activePeerFingerprint);

    headerEl.innerHTML = `
      <div class="nx-conv-peer-info">
        <div class="nx-conv-title-row">
          <span class="nx-conv-hash">@</span>
          <span class="nx-conv-peer-id">${escapeHtml(this.activePeerFingerprint)}</span>
          <span class="nx-security-badge ${isPeerVerified ? 'is-verified' : ''}">
            ${isPeerVerified ? '✓ NOD VERIFICAT' : '⚡ E2EE PQC ACTIV'}
          </span>
        </div>
        <div class="nx-conv-sub">
          ${
            peerSessions.length > 0
              ? `${peerSessions.length} sesiune(i) Double-Ratchet • Criptare Forward-Secret`
              : 'Prima expediere va descărca automat PreKey-ul X25519 + ML-KEM-768 al destinatarului'
          }
        </div>
      </div>
      <div class="nx-conv-actions">
        <button type="button" id="nx-toggle-conv-search-btn" class="nx-top-btn" title="Caută în această conversație">
          🔍 Caută
        </button>
        <button type="button" id="nx-verify-peer-btn" class="nx-top-btn ${isPeerVerified ? 'active' : ''}">
          ${isPeerVerified ? '✓ Verificat' : '🛡️ Marchează Verificat'}
        </button>
      </div>
    `;

    document.getElementById('nx-toggle-conv-search-btn')?.addEventListener('click', () => {
      const bar = document.getElementById('nx-conv-search-bar');
      const input = document.getElementById('nx-in-chat-search-input') as HTMLInputElement | null;
      if (bar) {
        const show = bar.style.display === 'none';
        bar.style.display = show ? 'flex' : 'none';
        if (show) input?.focus();
      }
    });

    document.getElementById('nx-verify-peer-btn')?.addEventListener('click', () => {
      if (!this.activePeerFingerprint) return;
      if (this.verifiedPeers.has(this.activePeerFingerprint)) {
        this.verifiedPeers.delete(this.activePeerFingerprint);
      } else {
        this.verifiedPeers.add(this.activePeerFingerprint);
        this.notify(`Nodul ${this.activePeerFingerprint.slice(0, 12)}… a fost marcat ca verificat criptografic.`, 'success');
      }
      this.saveLocalChatState();
      this.renderConversationState();
    });

    let peerMessages: DmDecryptedMessage[] = client.getMessages(this.activePeerFingerprint);
    if (this.messageSearchQuery.trim()) {
      const q = this.messageSearchQuery.trim().toLowerCase();
      peerMessages = peerMessages.filter((m) => m.plaintext.toLowerCase().includes(q));
    }

    if (peerMessages.length === 0) {
      messagesEl.innerHTML = `
        <div class="nx-empty-conv">
          <div class="nx-empty-conv-orb">⚡</div>
          <h3>Canal Criptat cu ${escapeHtml(this.activePeerFingerprint.slice(0, 16))}…</h3>
          <p>Niciun mesaj încă. Trimite primul mesaj pentru a inițializa tunelul hibrid X25519 + ML-KEM-768.</p>
        </div>
      `;
    } else {
      let lastDateLabel = '';
      messagesEl.innerHTML = peerMessages
        .map((m) => {
          const isOutgoing = m.direction === 'outgoing';
          const msgDate = new Date(m.createdAt);
          const dateLabel = msgDate.toLocaleDateString('ro-RO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
          const showDatePill = dateLabel !== lastDateLabel;
          lastDateLabel = dateLabel;

          const timeLabel = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const parsed = this.parseMessageWithReply(m.plaintext);
          const msgReactions = this.reactions[m.id] || {};

          return `
            ${
              showDatePill
                ? `<div class="nx-date-divider"><span>${escapeHtml(dateLabel)}</span></div>`
                : ''
            }
            <div class="nx-msg-row ${isOutgoing ? 'is-outgoing' : 'is-incoming'}" id="nx-msg-${escapeHtml(m.id)}">
              <div class="nx-msg-bubble">
                <!-- HOVER ACTION BAR (DISCORD + WHATSAPP HYBRID) -->
                <div class="nx-msg-hover-toolbar">
                  ${QUICK_REACTIONS.map(
                    (emoji) =>
                      `<button type="button" class="nx-react-btn" data-msgid="${escapeHtml(m.id)}" data-emoji="${emoji}">${emoji}</button>`
                  ).join('')}
                  <button type="button" class="nx-reply-btn" data-msgid="${escapeHtml(m.id)}" title="Răspunde la mesaj">↩ Răspunde</button>
                </div>

                ${
                  parsed.replyToSnippet
                    ? `
                    <div class="nx-msg-reply-quote" data-jump="${escapeHtml(parsed.replyToId || '')}">
                      <div class="nx-reply-quote-author">↩ ${escapeHtml(parsed.replyToSender || 'Mesaj citat')}</div>
                      <div class="nx-reply-quote-text">${escapeHtml(parsed.replyToSnippet)}</div>
                    </div>`
                    : ''
                }

                <div class="nx-msg-body">${this.renderRichMessageBody(parsed.body)}</div>

                <div class="nx-msg-meta">
                  <span class="nx-msg-cipher" title="Sesiune Double-Ratchet #${m.messageNumber}">
                    🔒 #${m.messageNumber}
                  </span>
                  <span class="nx-msg-time">${escapeHtml(timeLabel)}</span>
                  ${
                    isOutgoing
                      ? `<span class="nx-msg-ticks" title="Sigilat & livrat E2EE">✓✓ PQC</span>`
                      : ''
                  }
                </div>

                ${
                  Object.keys(msgReactions).length > 0
                    ? `<div class="nx-msg-reactions-bar">
                        ${Object.entries(msgReactions)
                          .filter(([, users]) => users.length > 0)
                          .map(
                            ([emoji, users]) =>
                              `<button type="button" class="nx-reaction-pill" data-msgid="${escapeHtml(m.id)}" data-emoji="${emoji}">
                                <span>${emoji}</span>
                                <span>${users.length}</span>
                              </button>`
                          )
                          .join('')}
                      </div>`
                    : ''
                }
              </div>
            </div>
          `;
        })
        .join('');

      messagesEl.scrollTop = messagesEl.scrollHeight;
      this.bindMessageStreamEvents(messagesEl, peerMessages);
    }

    // 3. Randare Inspector Criptografic (Panoul din dreapta)
    if (inspectorEl) {
      const safetyDigest = this.computeSafetyNumberPreview(
        client.getMyFingerprint(),
        this.activePeerFingerprint
      );
      inspectorEl.innerHTML = `
        <div class="nx-inspector-section">
          <div class="nx-section-title">TELEMETRIE CANAL PQC</div>
          <div class="nx-inspector-card">
            <div class="nx-kv-row">
              <span>Protocol Key-Agreement</span>
              <strong>X25519 + ML-KEM-768</strong>
            </div>
            <div class="nx-kv-row">
              <span>Cifru Simetric</span>
              <strong>AES-256-GCM (AEAD)</strong>
            </div>
            <div class="nx-kv-row">
              <span>Derivă Chei (KDF)</span>
              <strong>HKDF-SHA256 Ratchet</strong>
            </div>
            <div class="nx-kv-row">
              <span>Sesiuni Dispozitiv</span>
              <strong>${peerSessions.length} active</strong>
            </div>
          </div>
        </div>

        <div class="nx-inspector-section">
          <div class="nx-section-title">NUMĂR DE SIGURANȚĂ (SAFETY NUMBER)</div>
          <div class="nx-safety-grid">${safetyDigest}</div>
          <p class="nx-inspector-note">
            Compară acest cod cu interlocutorul printr-un canal secundar pentru a garanta absența oricărui interpus (MITM).
          </p>
        </div>

        <div class="nx-inspector-section">
          <div class="nx-section-title">COMENZI SLASH DISPONIBILE</div>
          <ul class="nx-slash-list">
            <li><code>/verify</code> — Trimite atestarea PQC</li>
            <li><code>/shrug</code> — Adaugă ¯\\_(ツ)_/¯</li>
            <li><code>/clear</code> — Curăță filtrul de căutare</li>
          </ul>
        </div>
      `;
    }
  }

  private computeSafetyNumberPreview(fpA: string, fpB: string): string {
    const sorted = [fpA.toLowerCase(), fpB.toLowerCase()].sort().join(':');
    const blocks: string[] = [];
    for (let i = 0; i < 6; i++) {
      let hash = 2166136261 + i * 101;
      for (let j = 0; j < sorted.length; j++) {
        hash ^= sorted.charCodeAt(j);
        hash = Math.imul(hash, 16777619);
      }
      const num = String(Math.abs(hash) % 100000).padStart(5, '0');
      blocks.push(`<span class="nx-safety-block">${num}</span>`);
    }
    return blocks.join('');
  }

  private bindMessageStreamEvents(container: HTMLElement, messages: DmDecryptedMessage[]): void {
    bindVoiceNotePlayers(container);

    // Reacții rapide
    container.querySelectorAll<HTMLButtonElement>('.nx-react-btn, .nx-reaction-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const msgId = btn.dataset.msgid;
        const emoji = btn.dataset.emoji;
        if (!msgId || !emoji || !this.client) return;

        const myFp = this.client.getMyFingerprint();
        if (!this.reactions[msgId]) this.reactions[msgId] = {};
        if (!this.reactions[msgId][emoji]) this.reactions[msgId][emoji] = [];

        const list = this.reactions[msgId][emoji];
        const idx = list.indexOf(myFp);
        if (idx >= 0) {
          list.splice(idx, 1);
        } else {
          list.push(myFp);
        }
        this.saveLocalChatState();
        this.renderConversationState();
      });
    });

    // Reply la mesaj
    container.querySelectorAll<HTMLButtonElement>('.nx-reply-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const msgId = btn.dataset.msgid;
        const found = messages.find((m) => m.id === msgId);
        if (found) {
          this.replyingToMessage = found;
          this.updateReplyBanner();
          document.getElementById('dm-compose-input')?.focus();
        }
      });
    });

    // Click pe citatul de reply -> scroll la mesajul original
    container.querySelectorAll<HTMLElement>('.nx-msg-reply-quote').forEach((quote) => {
      quote.addEventListener('click', () => {
        const targetId = quote.dataset.jump;
        if (!targetId) return;
        const targetEl = document.getElementById(`nx-msg-${targetId}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.classList.add('nx-highlight-flash');
          setTimeout(() => targetEl.classList.remove('nx-highlight-flash'), 1400);
        }
      });
    });

    // Butoane Copy pe blocurile de cod
    container.querySelectorAll<HTMLButtonElement>('.nx-copy-code-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rawCode = decodeURIComponent(btn.dataset.code || '');
        navigator.clipboard?.writeText(rawCode).catch(() => {});
        const prev = btn.textContent;
        btn.textContent = '✓ Copiat!';
        setTimeout(() => {
          btn.textContent = prev || 'Copiază';
        }, 1500);
      });
    });
  }

  private updateReplyBanner(): void {
    const banner = document.getElementById('nx-reply-banner');
    if (!banner) return;
    if (!this.replyingToMessage) {
      banner.style.display = 'none';
      banner.innerHTML = '';
      return;
    }
    const clean = this.parseMessageWithReply(this.replyingToMessage.plaintext).body;
    banner.style.display = 'flex';
    banner.innerHTML = `
      <div class="nx-reply-banner-info">
        <span class="nx-reply-banner-label">↩ Răspunzi către ${escapeHtml(this.replyingToMessage.senderFingerprint.slice(0, 14))}…</span>
        <span class="nx-reply-banner-text">${escapeHtml(clean.slice(0, 90))}</span>
      </div>
      <button type="button" id="nx-cancel-reply-btn" class="nx-cancel-reply-btn">✕</button>
    `;
    document.getElementById('nx-cancel-reply-btn')?.addEventListener('click', () => {
      this.replyingToMessage = null;
      this.updateReplyBanner();
    });
  }

  private async handleSendCurrentMessage(): Promise<void> {
    const client = await this.ensureClient();
    if (!client) return;

    if (!this.activePeerFingerprint) {
      this.notify('Selectează sau introdu mai întâi un destinatar (Fingerprint).', 'error');
      return;
    }

    const input = document.getElementById('dm-compose-input') as HTMLTextAreaElement | null;
    const sendBtn = document.getElementById('dm-send-btn') as HTMLButtonElement | null;
    let rawText = input?.value.trim() || '';
    if (!rawText) return;

    // Procesare Slash Commands stil Discord
    if (rawText === '/clear') {
      this.messageSearchQuery = '';
      if (input) input.value = '';
      this.renderConversationState();
      return;
    } else if (rawText === '/shrug') {
      rawText = '¯\\_(ツ)_/¯';
    } else if (rawText === '/verify') {
      rawText = '🛡️ [ATESTARE PQC]: Am verificat amprenta sesiunii X25519 + ML-KEM-768.';
    }

    const finalPayload = this.encodeMessageWithReply(rawText);

    try {
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span>Criptare PQC...</span>';
      }
      await client.sendMessage(this.activePeerFingerprint, finalPayload);
      if (input) input.value = '';
      this.replyingToMessage = null;
      this.updateReplyBanner();
      this.renderConversationState();
    } catch (err: any) {
      this.notify(err?.message || 'Eroare la criptarea sau expedierea mesajului.', 'error');
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<span>Trimite</span><span class="nx-send-icon">➤</span>';
      }
    }
  }
}
