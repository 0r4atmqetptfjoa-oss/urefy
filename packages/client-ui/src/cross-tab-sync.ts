import { clientStore, type ClientPost } from './client-state.js';
import { localSearchIndex } from './search-index.js';
import { themeEngine } from './themes.js';

export type CrossTabEventType =
  | 'POST_CREATED'
  | 'POST_VOTED'
  | 'MESSAGE_SENT'
  | 'THEME_CHANGED'
  | 'IDENTITY_RESTORED'
  | 'REFRESH_STREAM';

export interface CrossTabMessage {
  type: CrossTabEventType;
  payload: any;
  sourceTabId: string;
  timestamp: number;
}

export class CrossTabSyncEngine {
  public tabId: string;
  private channel: BroadcastChannel | null = null;
  private isInitialized: boolean = false;
  private storageFallbackHandler: ((e: StorageEvent) => void) | null = null;

  constructor() {
    this.tabId = 'tab-' + Math.random().toString(36).slice(2, 8);
  }

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('aetheris_tab_mesh');
        this.channel.onmessage = (event: MessageEvent<CrossTabMessage>) => {
          this.handleIncomingMessage(event.data);
        };
      } catch (_) {
        this.setupStorageFallback();
      }
    } else {
      this.setupStorageFallback();
    }
  }

  public destroy(): void {
    if (!this.isInitialized) return;
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.storageFallbackHandler && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageFallbackHandler);
      this.storageFallbackHandler = null;
    }
    this.isInitialized = false;
  }

  private setupStorageFallback(): void {
    if (typeof window === 'undefined') return;
    this.storageFallbackHandler = (e: StorageEvent) => {
      if (e.key === 'aetheris_cross_tab_event' && e.newValue) {
        try {
          const msg = JSON.parse(e.newValue) as CrossTabMessage;
          this.handleIncomingMessage(msg);
        } catch (_) {}
      }
    };
    window.addEventListener('storage', this.storageFallbackHandler);
  }

  public broadcast(type: CrossTabEventType, payload: any = {}): void {
    const message: CrossTabMessage = {
      type,
      payload,
      sourceTabId: this.tabId,
      timestamp: Date.now(),
    };

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (_) {}
    } else if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('aetheris_cross_tab_event', JSON.stringify(message));
      } catch (_) {}
    }
  }

  public handleIncomingMessage(msg: CrossTabMessage): void {
    if (!msg || typeof msg !== 'object' || msg.sourceTabId === this.tabId) return;
    if (typeof msg.timestamp === 'number' && Math.abs(Date.now() - msg.timestamp) > 30_000) return;

    switch (msg.type) {
      case 'POST_CREATED': {
        const post = msg.payload as ClientPost;
        if (post && typeof post.id === 'string' && !clientStore.posts.some((p) => p.id === post.id)) {
          clientStore.posts.unshift(post);
          if (clientStore.posts.length > 500) {
            clientStore.posts.length = 500;
          }
          localSearchIndex.indexPost(post);
          clientStore.notify('NEW_POST', post);
        }
        break;
      }

      case 'POST_VOTED': {
        const { postId, direction, meritVotes } = msg.payload;
        const post = clientStore.posts.find(p => p.id === postId);
        if (post) {
          post.meritVotes = meritVotes;
          clientStore.notify('VOTE', { postId, direction, meritVotes });
        }
        break;
      }

      case 'MESSAGE_SENT': {
        const { channelId, message } = msg.payload;
        if (channelId && message) {
          const chMsgs = clientStore.messages.get(channelId) || [];
          if (!chMsgs.some(m => m.id === message.id)) {
            chMsgs.push(message);
            clientStore.messages.set(channelId, chMsgs);
            clientStore.notify('NEW_MESSAGE', { channelId, message });
          }
        }
        break;
      }

      case 'THEME_CHANGED': {
        const { themeId } = msg.payload;
        if (themeId && themeEngine) {
          themeEngine.setTheme(themeId);
        }
        break;
      }

      case 'IDENTITY_RESTORED': {
        clientStore.syncFromEdge();
        break;
      }

      case 'REFRESH_STREAM': {
        clientStore.syncFromEdge();
        break;
      }
    }
  }
}

export const crossTabSync = new CrossTabSyncEngine();
