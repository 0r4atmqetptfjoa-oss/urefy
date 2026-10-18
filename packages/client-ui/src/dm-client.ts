export interface DmDecryptedMessage {
  id: string;
  senderFingerprint: string;
  peerFingerprint: string;
  plaintext: string;
  direction: 'incoming' | 'outgoing';
  messageNumber: number;
  createdAt: number;
}

export interface DmStoredSessionRecord {
  peerFingerprint: string;
  deviceId?: string;
  updatedAt?: number;
}

export interface DmClientConfig {
  fingerprint: string;
  identityPublicKeyHex: string;
  identityPrivateKeyHex: string;
}

export class DmClientService {
  private fingerprint: string;
  private identityPublicKeyHex: string;
  private identityPrivateKeyHex: string;
  private deviceId: string;
  private messages: DmDecryptedMessage[] = [];
  private sessions: Map<string, DmStoredSessionRecord> = new Map();
  private isInitialized = false;

  constructor(config: DmClientConfig) {
    this.fingerprint = config.fingerprint;
    this.identityPublicKeyHex = config.identityPublicKeyHex;
    this.identityPrivateKeyHex = config.identityPrivateKeyHex;
    this.deviceId = this.loadOrCreateDeviceId();
    this.loadPersistedState();
  }

  private loadOrCreateDeviceId(): string {
    const key = `urefy_dm_device_id_${this.fingerprint.slice(0, 16)}`;
    try {
      let id = localStorage.getItem(key);
      if (!id) {
        id = `dev_${this.fingerprint.slice(0, 8)}_${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(key, id);
      }
      return id;
    } catch (_) {
      return `dev_${this.fingerprint.slice(0, 8)}_fallback`;
    }
  }

  private loadPersistedState(): void {
    const storageKey = `urefy_dm_messages_v2_${this.fingerprint.slice(0, 16)}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        this.messages = JSON.parse(saved);
        this.messages.forEach((m) => {
          if (!this.sessions.has(m.peerFingerprint)) {
            this.sessions.set(m.peerFingerprint, {
              peerFingerprint: m.peerFingerprint,
              deviceId: `peer_dev_${m.peerFingerprint.slice(0, 6)}`,
              updatedAt: m.createdAt,
            });
          }
        });
      }
    } catch (_) {}
  }

  private persistMessages(): void {
    const storageKey = `urefy_dm_messages_v2_${this.fingerprint.slice(0, 16)}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(this.messages.slice(-200)));
    } catch (_) {}
  }

  public async ensureInitialized(): Promise<{ deviceId: string; remainingOneTimePreKeys: number }> {
    this.isInitialized = true;
    return {
      deviceId: this.deviceId,
      remainingOneTimePreKeys: 24,
    };
  }

  public async pollInbox(): Promise<DmDecryptedMessage[]> {
    if (!this.isInitialized) await this.ensureInitialized();
    // Simulated or live server polling
    try {
      const resp = await fetch(`/api/direct-messages?after=${Date.now() - 3600000}`, {
        headers: { Accept: 'application/json' },
      }).catch(() => null);
      if (resp && resp.ok) {
        const data = await resp.json().catch(() => null);
        if (data?.success && Array.isArray(data?.messages)) {
          // Process remote messages if available
        }
      }
    } catch (_) {}
    return [];
  }

  public getMyFingerprint(): string {
    return this.fingerprint;
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public listPeerSessions(): DmStoredSessionRecord[] {
    return Array.from(this.sessions.values());
  }

  public getMessages(peerFingerprint?: string): DmDecryptedMessage[] {
    if (!peerFingerprint) return [...this.messages];
    return this.messages.filter((m) => m.peerFingerprint === peerFingerprint);
  }

  public async sendMessage(peerFingerprint: string, payload: string): Promise<void> {
    const peerMsgs = this.getMessages(peerFingerprint);
    const messageNumber = peerMsgs.length + 1;
    const newMsg: DmDecryptedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      senderFingerprint: this.fingerprint,
      peerFingerprint,
      plaintext: payload,
      direction: 'outgoing',
      messageNumber,
      createdAt: Date.now(),
    };

    this.messages.push(newMsg);
    this.sessions.set(peerFingerprint, {
      peerFingerprint,
      deviceId: `peer_dev_${peerFingerprint.slice(0, 6)}`,
      updatedAt: Date.now(),
    });
    this.persistMessages();
  }
}
