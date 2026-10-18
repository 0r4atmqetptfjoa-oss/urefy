import { clientStore } from '../client-state.js';

export interface ChatReactionMap {
  [emoji: string]: string[]; // emoji -> array of user fingerprints
}

export interface ChatReplyRef {
  messageId: string;
  authorName: string;
  snippet: string;
}

export interface RichChatMessage {
  id: string;
  channelOrPeerId: string;
  senderFp: string;
  senderName: string;
  senderHandle: string;
  senderAvatarBadge: string;
  senderColor: string;
  senderRole?: 'GUARDIAN' | 'MODERATOR' | 'CURATOR' | 'MEMBER';
  text: string;
  createdAt: number;
  status: 'SENT' | 'DELIVERED' | 'READ_ZK';
  reactions: ChatReactionMap;
  replyTo?: ChatReplyRef;
  isPinned?: boolean;
  voiceNote?: {
    durationSec: number;
    waveform: number[];
  };
  attachment?: {
    name: string;
    sizeLabel: string;
    kind: 'image' | 'code' | 'archive';
    previewUrl?: string;
  };
}

export interface ChatPeerContact {
  fp: string;
  name: string;
  handle: string;
  badge: string;
  color: string;
  role: 'GUARDIAN' | 'MODERATOR' | 'CURATOR' | 'MEMBER';
  status: 'online' | 'idle' | 'dnd';
  statusText: string;
  unreadCount: number;
  safetyNumber: string;
}

export interface CommunityRoomChannel {
  id: string;
  name: string;
  category: 'CORE CHANNELS' | 'ENGINEERING & SECOPS' | 'COMMUNITY LOUNGE';
  topic: string;
  unreadCount?: number;
  activeCount: number;
}

const QUICK_EMOJIS = ['❤️', '👍', '🔥', '😂', '🚀', '⚡'] as const;
const PICKER_EMOJIS = [
  '😀', '😂', '🥹', '😎', '🤔', '🫡', '🔥', '⚡',
  '🚀', '❤️', '👍', '🙌', '👏', '🛡️', '🔐', '💎',
  '🎯', '💻', '🧠', '👀', '✨', '🎉', '💯', '🤝',
  '👾', '🕹️', '📡', '🧬', '🧪', '📦', '🏆', '☕',
];

const PEER_CONTACTS: ChatPeerContact[] = [
  {
    fp: 'c3dc28cb705e',
    name: 'Elena Rostova',
    handle: 'elena_r',
    badge: 'ER',
    color: '#E5A93C',
    role: 'CURATOR',
    status: 'online',
    statusText: 'Auditing zero-knowledge circuits',
    unreadCount: 2,
    safetyNumber: '48291 00394 88120 77419 30291 66502',
  },
  {
    fp: 'a89104fa2211',
    name: 'David Chen',
    handle: 'david_c',
    badge: 'DC',
    color: '#38BDF8',
    role: 'GUARDIAN',
    status: 'online',
    statusText: 'Kernel 6.12 benchmarking',
    unreadCount: 0,
    safetyNumber: '91044 22819 55401 33910 11827 90412',
  },
  {
    fp: 'f40019bc88a2',
    name: 'Maya Patel',
    handle: 'maya_p',
    badge: 'MP',
    color: '#34D399',
    role: 'MODERATOR',
    status: 'online',
    statusText: 'Maintaining c/clean-releases',
    unreadCount: 1,
    safetyNumber: '77301 99201 44182 65019 28371 55091',
  },
  {
    fp: '7e1190ab44c1',
    name: 'Viktor Kovacs',
    handle: 'vkovacs_hw',
    badge: 'VK',
    color: '#818CF8',
    role: 'MEMBER',
    status: 'idle',
    statusText: 'ThinkPad T480 BIOS mod',
    unreadCount: 0,
    safetyNumber: '60192 38471 92018 47561 29384 10293',
  },
  {
    fp: '9b22a011cd44',
    name: 'Samira Khan',
    handle: 'samira_zk',
    badge: 'SK',
    color: '#F472B6',
    role: 'MEMBER',
    status: 'online',
    statusText: 'Groth16 BN254 prover',
    unreadCount: 0,
    safetyNumber: '19283 74650 91827 36451 82736 45192',
  },
  {
    fp: '3d8812fe901a',
    name: 'Alex Mercer',
    handle: 'alex_mercer',
    badge: 'AM',
    color: '#2DD4BF',
    role: 'MEMBER',
    status: 'dnd',
    statusText: 'Reverse engineering Denuvo v19',
    unreadCount: 0,
    safetyNumber: '84756 10293 84756 29103 48576 19203',
  },
];

const COMMUNITY_CHANNELS: CommunityRoomChannel[] = [
  {
    id: 'general-discussion',
    name: 'General Discussion',
    category: 'CORE CHANNELS',
    topic: 'Real-time community discussion, releases, and hardware talk',
    activeCount: 42,
  },
  {
    id: 'dispatches-updates',
    name: 'Dispatches & Updates',
    category: 'CORE CHANNELS',
    topic: 'Official protocol announcements, relay upgrades, and verified Advisories',
    unreadCount: 1,
    activeCount: 19,
  },
  {
    id: 'builds-engineering',
    name: 'Builds & Engineering',
    category: 'ENGINEERING & SECOPS',
    topic: 'Systems architecture, Rust/TypeScript, custom kernels, and cryptography',
    activeCount: 28,
  },
  {
    id: 'questions-support',
    name: 'Questions & Support',
    category: 'ENGINEERING & SECOPS',
    topic: 'Troubleshooting, key recovery setup, and self-hosting guides',
    activeCount: 14,
  },
  {
    id: 'ideas-casual',
    name: 'Ideas & Casual',
    category: 'COMMUNITY LOUNGE',
    topic: 'Feature proposals, UI feedback, and open lounge chat',
    activeCount: 23,
  },
  {
    id: 'off-topic',
    name: 'Off-topic',
    category: 'COMMUNITY LOUNGE',
    topic: 'Gaming benchmarks, sim racing, custom keyboards, and music',
    activeCount: 31,
  },
  {
    id: 'community-pulse',
    name: 'Community Pulse',
    category: 'COMMUNITY LOUNGE',
    topic: 'Live feed highlights and cross-community discussions',
    activeCount: 17,
  },
];

const STORAGE_KEY = 'urefy_modern_chat_2027_v1';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export class ModernChatWorkspace2027 {
  public mode: 'channels' | 'dm' = 'channels';
  public activeChannelId: string = 'general-discussion';
  public activePeerFp: string = 'c3dc28cb705e';
  public sidebarSearch: string = '';
  public inChatSearch: string = '';
  public showInChatSearch: boolean = false;
  public showRightPanel: boolean = true;
  public showEmojiPicker: boolean = false;
  public showPinnedOnly: boolean = false;
  public showNewChatModal: boolean = false;
  public showMobileSidebar: boolean = false;
  public replyingTo: ChatReplyRef | null = null;
  public typingIndicatorPeer: string | null = null;
  public playingVoiceId: string | null = null;
  public contacts: ChatPeerContact[] = [...PEER_CONTACTS];
  public channels: CommunityRoomChannel[] = [...COMMUNITY_CHANNELS];
  private messagesByThread: Map<string, RichChatMessage[]> = new Map();
  private isBound: boolean = false;

  constructor() {
    this.loadFallbackMessages();
    this.loadFromStorage();
  }

  private getMyIdentity() {
    const fp = clientStore?.keypair?.fingerprint || 'me-sovereign';
    return {
      fp,
      name: 'You',
      handle: 'sovereign_user',
      badge: 'YO',
      color: '#E5A93C',
    };
  }

  private loadFallbackMessages(): void {
    const now = Date.now();
    // 1. Fallback General Discussion (Community Channel)
    this.messagesByThread.set('general-discussion', [
      {
        id: 'msg-gen-1',
        channelOrPeerId: 'general-discussion',
        senderFp: '3d8812fe901a',
        senderName: 'Alex Mercer',
        senderHandle: 'alex_mercer',
        senderAvatarBadge: 'AM',
        senderColor: '#2DD4BF',
        senderRole: 'MEMBER',
        text: 'Speaking of engines, anyone notice how good the grass deformation looks in Ghost of Yotei? They definitely upgraded their GPU compute pipeline.',
        createdAt: now - 3600_000 * 3,
        status: 'READ_ZK',
        reactions: { '🔥': ['c3dc28cb705e', 'a89104fa2211'], '👍': ['f40019bc88a2'] },
      },
      {
        id: 'msg-gen-2',
        channelOrPeerId: 'general-discussion',
        senderFp: 'a89104fa2211',
        senderName: 'David Chen',
        senderHandle: 'david_c',
        senderAvatarBadge: 'DC',
        senderColor: '#38BDF8',
        senderRole: 'GUARDIAN',
        text: 'That CapFrameX benchmark on Black Myth Wukong without Denuvo proves what we all suspected. Those micro-stutters during boss transitions were heartbeat token checks, not shader compilation.',
        createdAt: now - 3600_000 * 2.2,
        status: 'READ_ZK',
        isPinned: true,
        reactions: { '💯': ['c3dc28cb705e', '3d8812fe901a', '7e1190ab44c1'], '⚡': ['9b22a011cd44'] },
      },
      {
        id: 'msg-gen-3',
        channelOrPeerId: 'general-discussion',
        senderFp: '7e1190ab44c1',
        senderName: 'Viktor Kovacs',
        senderHandle: 'vkovacs_hw',
        senderAvatarBadge: 'VK',
        senderColor: '#818CF8',
        senderRole: 'MEMBER',
        replyTo: {
          messageId: 'msg-gen-2',
          authorName: 'David Chen',
          snippet: 'Those micro-stutters during boss transitions were heartbeat token checks...',
        },
        text: '100%. 1% lows jumped from 48 FPS to 89 FPS on the exact same NVMe drive once the VM hooks were stripped.',
        createdAt: now - 3600_000 * 1.8,
        status: 'READ_ZK',
        reactions: { '🚀': ['a89104fa2211', 'c3dc28cb705e'] },
      },
      {
        id: 'msg-gen-4',
        channelOrPeerId: 'general-discussion',
        senderFp: 'c3dc28cb705e',
        senderName: 'Elena Rostova',
        senderHandle: 'elena_r',
        senderAvatarBadge: 'ER',
        senderColor: '#E5A93C',
        senderRole: 'CURATOR',
        text: 'Uploaded the SHA-256 verification manifest and Shannon entropy scan report to the Vault. Zero RWX anomalies across all binaries.',
        createdAt: now - 3600_000 * 0.9,
        status: 'READ_ZK',
        attachment: {
          name: 'release-hygiene-audit-2026.json',
          sizeLabel: '42.8 KB · SHA-256 Verified',
          kind: 'code',
        },
        reactions: { '🛡️': ['a89104fa2211', 'f40019bc88a2', '9b22a011cd44'], '❤️': ['3d8812fe901a'] },
      },
    ]);

    // 2. Fallback Builds & Engineering
    this.messagesByThread.set('builds-engineering', [
      {
        id: 'msg-eng-1',
        channelOrPeerId: 'builds-engineering',
        senderFp: '9b22a011cd44',
        senderName: 'Samira Khan',
        senderHandle: 'samira_zk',
        senderAvatarBadge: 'SK',
        senderColor: '#F472B6',
        senderRole: 'MEMBER',
        text: 'Groth16 BN254 pairing verification time is down to 4.2ms in WebAssembly Workers. Portable reputation certificates now verify instantaneously on Cloudflare Edge.',
        createdAt: now - 3600_000 * 4,
        status: 'READ_ZK',
        isPinned: true,
        reactions: { '⚡': ['c3dc28cb705e', 'a89104fa2211'], '🔥': ['7e1190ab44c1'] },
      },
    ]);

    // 3. Fallback Direct Messages — Elena Rostova
    this.messagesByThread.set('c3dc28cb705e', [
      {
        id: 'dm-elena-1',
        channelOrPeerId: 'c3dc28cb705e',
        senderFp: 'c3dc28cb705e',
        senderName: 'Elena Rostova',
        senderHandle: 'elena_r',
        senderAvatarBadge: 'ER',
        senderColor: '#E5A93C',
        text: 'Hey! Welcome to the upgraded E2EE Direct Messaging workspace. Every message here is protected with our ML-KEM-768 + X25519 Double Ratchet.',
        createdAt: now - 3600_000 * 5,
        status: 'READ_ZK',
        reactions: { '❤️': ['me-sovereign'] },
      },
      {
        id: 'dm-elena-2',
        channelOrPeerId: 'c3dc28cb705e',
        senderFp: 'c3dc28cb705e',
        senderName: 'Elena Rostova',
        senderHandle: 'elena_r',
        senderAvatarBadge: 'ER',
        senderColor: '#E5A93C',
        text: 'Here is a quick voice note with the summary of today’s community audit:',
        createdAt: now - 3600_000 * 4.9,
        status: 'READ_ZK',
        voiceNote: {
          durationSec: 14,
          waveform: [25, 45, 70, 35, 85, 95, 60, 40, 75, 90, 55, 30, 65, 80, 50, 35, 60, 45, 30, 20],
        },
        reactions: { '🔥': ['me-sovereign'] },
      },
      {
        id: 'dm-elena-3',
        channelOrPeerId: 'c3dc28cb705e',
        senderFp: 'me-sovereign',
        senderName: 'You',
        senderHandle: 'sovereign_user',
        senderAvatarBadge: 'YO',
        senderColor: '#E5A93C',
        text: 'Salut! Se vede impecabil acum, cu grupare de mesaje, reply, reacții și voice notes.',
        createdAt: now - 3600_000 * 1.2,
        status: 'READ_ZK',
        reactions: { '🚀': ['c3dc28cb705e'] },
      },
    ]);

    // 4. Fallback Direct Messages — David Chen & Maya Patel
    this.messagesByThread.set('a89104fa2211', [
      {
        id: 'dm-david-1',
        channelOrPeerId: 'a89104fa2211',
        senderFp: 'a89104fa2211',
        senderName: 'David Chen',
        senderHandle: 'david_c',
        senderAvatarBadge: 'DC',
        senderColor: '#38BDF8',
        text: 'Let me know when you want to test the WebRTC P2P file transfer tunnel.',
        createdAt: now - 3600_000 * 8,
        status: 'READ_ZK',
        reactions: {},
      },
    ]);

    this.messagesByThread.set('f40019bc88a2', [
      {
        id: 'dm-maya-1',
        channelOrPeerId: 'f40019bc88a2',
        senderFp: 'f40019bc88a2',
        senderName: 'Maya Patel',
        senderHandle: 'maya_p',
        senderAvatarBadge: 'MP',
        senderColor: '#34D399',
        text: 'Your community moderation permissions for c/zeroknowledge are active.',
        createdAt: now - 3600_000 * 12,
        status: 'READ_ZK',
        reactions: {},
      },
    ]);
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (Array.isArray(v) && v.length > 0) {
            this.messagesByThread.set(k, v as RichChatMessage[]);
          }
        }
      }
    } catch {}
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const obj: Record<string, RichChatMessage[]> = {};
      for (const [k, v] of this.messagesByThread.entries()) {
        obj[k] = v.slice(-100);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {}
  }

  public getActiveThreadId(): string {
    return this.mode === 'channels' ? this.activeChannelId : this.activePeerFp;
  }

  public getActiveMessages(): RichChatMessage[] {
    const threadId = this.getActiveThreadId();
    if (!this.messagesByThread.has(threadId)) {
      this.messagesByThread.set(threadId, [
        {
          id: `welcome-${threadId}`,
          channelOrPeerId: threadId,
          senderFp: 'c3dc28cb705e',
          senderName: 'Elena Rostova',
          senderHandle: 'elena_r',
          senderAvatarBadge: 'ER',
          senderColor: '#E5A93C',
          senderRole: 'CURATOR',
          text: `Welcome to #${threadId}! Share your thoughts, code snippets, or files below.`,
          createdAt: Date.now() - 1800_000,
          status: 'READ_ZK',
          reactions: { '👋': ['a89104fa2211'] },
        },
      ]);
    }
    let list = this.messagesByThread.get(threadId) || [];
    if (this.showPinnedOnly) {
      list = list.filter((m) => m.isPinned);
    }
    if (this.inChatSearch.trim()) {
      const q = this.inChatSearch.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.text.toLowerCase().includes(q) ||
          m.senderName.toLowerCase().includes(q) ||
          m.senderHandle.toLowerCase().includes(q)
      );
    }
    return list;
  }

  public sendMessage(rawText: string, extra?: Partial<RichChatMessage>): void {
    let text = rawText.trim();
    if (!text && !extra?.voiceNote && !extra?.attachment) return;

    const threadId = this.getActiveThreadId();
    if (text === '/clear') {
      this.messagesByThread.set(threadId, []);
      this.saveToStorage();
      this.mountIfOnMessagesRoute(true);
      return;
    }
    if (text === '/shrug') {
      text = '¯\\_(ツ)_/¯';
    } else if (text.startsWith('/code ')) {
      text = '```ts\n' + text.slice(6) + '\n```';
    }

    const me = this.getMyIdentity();
    const list = this.messagesByThread.get(threadId) || [];
    const newMsg: RichChatMessage = {
      id: `msg-${Date.now()}-${
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID().slice(0, 6)
          : Date.now().toString(36).slice(-4)
      }`,
      channelOrPeerId: threadId,
      senderFp: me.fp,
      senderName: me.name,
      senderHandle: me.handle,
      senderAvatarBadge: me.badge,
      senderColor: me.color,
      text,
      createdAt: Date.now(),
      status: 'READ_ZK',
      reactions: {},
      replyTo: this.replyingTo || undefined,
      ...extra,
    };

    list.push(newMsg);
    this.messagesByThread.set(threadId, list);
    this.replyingTo = null;
    this.showEmojiPicker = false;
    this.saveToStorage();

    try {
      if (text && typeof clientStore?.sendMessage === 'function') {
        clientStore.sendMessage(text);
      }
    } catch (_) {}

    this.mountIfOnMessagesRoute(true);
    this.scrollToBottom();

    // If in Direct Messages, simulate a realistic smart E2EE reply so the user can test live interaction
    if (this.mode === 'dm') {
      const peer = this.contacts.find((c) => c.fp === this.activePeerFp);
      if (peer) {
        this.typingIndicatorPeer = peer.name;
        this.mountIfOnMessagesRoute(true);
        setTimeout(() => {
          this.typingIndicatorPeer = null;
          const currentList = this.messagesByThread.get(peer.fp) || [];
          currentList.push({
            id: `reply-${Date.now()}`,
            channelOrPeerId: peer.fp,
            senderFp: peer.fp,
            senderName: peer.name,
            senderHandle: peer.handle,
            senderAvatarBadge: peer.badge,
            senderColor: peer.color,
            senderRole: peer.role,
            replyTo: {
              messageId: newMsg.id,
              authorName: 'You',
              snippet: newMsg.text.slice(0, 60) || 'Voice / Attachment',
            },
            text: `Received over ML-KEM-768 ratchet ✓✓. Everything looks crystal clear on my end!`,
            createdAt: Date.now(),
            status: 'READ_ZK',
            reactions: {},
          });
          this.messagesByThread.set(peer.fp, currentList);
          this.saveToStorage();
          this.mountIfOnMessagesRoute(true);
          this.scrollToBottom();
        }, 1100);
      }
    }
  }

  public toggleReaction(messageId: string, emoji: string): void {
    const threadId = this.getActiveThreadId();
    const list = this.messagesByThread.get(threadId) || [];
    const msg = list.find((m) => m.id === messageId);
    if (!msg) return;
    const myFp = this.getMyIdentity().fp;
    const arr = msg.reactions[emoji] || [];
    if (arr.includes(myFp)) {
      msg.reactions[emoji] = arr.filter((id) => id !== myFp);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      msg.reactions[emoji] = [...arr, myFp];
    }
    this.saveToStorage();
    this.mountIfOnMessagesRoute(true);
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const stream = document.getElementById('modern-chat-stream');
      if (stream) {
        stream.scrollTop = stream.scrollHeight;
      }
    });
  }

  public mountIfOnMessagesRoute(force = false): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const hash = window.location.hash || '';
    const existingRoot = document.getElementById('urefy-modern-chat-2027-root');
    const isMessages =
      hash === '#studio-chat' ||
      hash.startsWith('#messages') ||
      hash.startsWith('#relays') ||
      hash.startsWith('#chat') ||
      hash.startsWith('#dm-');

    const mainArea =
      document.getElementById('main-stage') ||
      document.querySelector<HTMLElement>('main') ||
      document.querySelector<HTMLElement>('main[role="main"]') ||
      document.getElementById('main-feed-scroll') ||
      document.querySelector<HTMLElement>('.workspace-main-column');

    if (!isMessages) {
      if (existingRoot) {
        existingRoot.remove();
        if (mainArea) {
          Array.from(mainArea.children).forEach((child) => {
            (child as HTMLElement).style.display = '';
          });
        }
      }
      return;
    }

    if (!mainArea) return;
    if (existingRoot && !force) return;

    Array.from(mainArea.children).forEach((child) => {
      const el = child as HTMLElement;
      if (el.id !== 'urefy-modern-chat-2027-root') {
        el.style.display = 'none';
      }
    });

    mainArea.style.overflow = 'hidden';
    mainArea.style.padding = '0';
    mainArea.style.maxWidth = '100%';

    let root = existingRoot;
    if (!root) {
      root = document.createElement('div');
      root.id = 'urefy-modern-chat-2027-root';
      mainArea.appendChild(root);
    }
    root.className = 'w-full h-[calc(100dvh-4rem)] flex bg-canvas text-slate-100 select-none overflow-hidden relative';
    root.innerHTML = this.renderWorkspaceHTML();
    this.bindEventsOnce();
  }

  private renderWorkspaceHTML(): string {
    const totalUnreadDMs = this.contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    const activeChannel =
      this.channels.find((c) => c.id === this.activeChannelId) || this.channels[0];
    const activePeer =
      this.contacts.find((c) => c.fp === this.activePeerFp) || this.contacts[0];
    const messages = this.getActiveMessages();
    const myFp = this.getMyIdentity().fp;

    return `
      <!-- MOBILE DRAWER BACKDROP -->
      ${
        this.showMobileSidebar
          ? `<div data-chat-action="toggle-mobile-sidebar" class="fixed inset-0 z-30 bg-black/70 backdrop-blur-xs md:hidden"></div>`
          : ''
      }
      <!-- 1. LEFT SIDEBAR (CHANNELS & DIRECT MESSAGES DIRECTORY) -->
      <aside class="${
        this.showMobileSidebar ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden md:flex'
      } w-72 sm:w-80 bg-surface-base border-r border-white/10 flex-col shrink-0 h-full shadow-2xl md:shadow-none">
        <!-- Mode Switcher Tabs (Communities vs Direct Messages) -->
        <div class="p-3 border-b border-white/10 space-y-2.5">
          <div class="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface-raised border border-white/5">
            <button
              type="button"
              data-chat-action="switch-mode"
              data-mode="channels"
              class="py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                this.mode === 'channels'
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }"
            >
              <span># Communities</span>
            </button>
            <button
              type="button"
              data-chat-action="switch-mode"
              data-mode="dm"
              class="py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                this.mode === 'dm'
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }"
            >
              <span>💬 Direct</span>
              ${
                totalUnreadDMs > 0
                  ? `<span class="px-1.5 py-0.5 rounded-full text-[10px] font-mono ${ this.mode === 'dm' ? 'bg-black text-amber-400' : 'bg-amber-400 text-black' }">${totalUnreadDMs}</span>`
                  : ''
              }
            </button>
          </div>

          <!-- Search Filter -->
          <div class="relative">
            <input
              type="text"
              id="modern-chat-sidebar-search"
              value="${escapeHtml(this.sidebarSearch)}"
              placeholder="${this.mode === 'channels' ? 'Jump to #channel...' : 'Search direct messages...'}"
              class="w-full h-9 pl-3 pr-8 rounded-xl bg-surface-raised border border-white/10 focus:border-amber-400 focus:outline-none text-xs text-white placeholder-slate-500"
            />
          </div>
        </div>

        <!-- Scrollable Channel or DM Contact List -->
        <div class="flex-1 overflow-y-auto p-2.5 space-y-4">
          ${this.mode === 'channels' ? this.renderChannelsListHTML() : this.renderDirectMessagesListHTML()}
        </div>

        <!-- Bottom Voice & Audio DSP Lounge Bar (Discord-style) -->
        <div class="p-3 bg-surface-raised/90 border-t border-white/10 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="relative">
              <div class="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-xs font-bold text-amber-300 font-mono">
                YO
              </div>
              <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#14171F]"></span>
            </div>
            <div class="min-w-0">
              <div class="text-xs font-bold text-white truncate">Connected · E2EE</div>
              <div class="text-[10px] font-mono text-emerald-400 truncate">ML-KEM-768 Active</div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              data-chat-action="open-audio-dsp"
              class="w-8 h-8 rounded-lg bg-surface-base hover:bg-surface-overlay border border-white/10 flex items-center justify-center text-xs text-slate-300 hover:text-amber-400 cursor-pointer"
              title="Open 5-Band Acoustic DSP Equalizer"
            >
              🎛️
            </button>
            <button
              type="button"
              data-chat-action="open-new-dm-modal"
              class="w-8 h-8 rounded-lg bg-surface-base hover:bg-surface-overlay border border-white/10 flex items-center justify-center text-xs text-slate-300 hover:text-amber-400 cursor-pointer"
              title="Start New Direct Message"
            >
              ➕
            </button>
          </div>
        </div>
      </aside>

      <!-- 2. CENTER CHAT STREAM & COMPOSER -->
      <section class="flex-1 flex flex-col h-full min-w-0 bg-canvas relative">
        <!-- Sticky Conversation Header -->
        <header class="h-14 px-5 bg-surface-base/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <button
              type="button"
              data-chat-action="toggle-mobile-sidebar"
              class="md:hidden w-9 h-9 rounded-xl bg-surface-raised border border-white/10 flex items-center justify-center text-slate-300 hover:text-white shrink-0 cursor-pointer"
              title="Browse Channels & DMs"
            >
              ☰
            </button>
            ${
              this.mode === 'channels'
                ? `
                <div class="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 font-mono font-bold text-base shrink-0">
                  #
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h2 class="text-sm font-bold text-white truncate">${escapeHtml(activeChannel.name)}</h2>
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      ${activeChannel.activeCount} online
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-400 truncate">${escapeHtml(activeChannel.topic)}</p>
                </div>
              `
                : `
                <div class="relative shrink-0">
                  <div
                    class="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs border"
                    style="background:${activePeer.color}22; color:${activePeer.color}; border-color:${activePeer.color}55"
                  >
                    ${escapeHtml(activePeer.badge)}
                  </div>
                  <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${
                    activePeer.status === 'online'
                      ? 'bg-emerald-400'
                      : activePeer.status === 'idle'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                  } ring-2 ring-[#0E1015]"></span>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h2 class="text-sm font-bold text-white truncate">${escapeHtml(activePeer.name)}</h2>
                    <span class="text-xs font-mono text-slate-400">@${escapeHtml(activePeer.handle)}</span>
                    <span class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      🔒 ML-KEM-768 E2EE
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-400 truncate">${escapeHtml(activePeer.statusText)}</p>
                </div>
              `
            }
          </div>

          <!-- Header Utility Controls -->
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-chat-action="toggle-pinned-filter"
              class="h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                this.showPinnedOnly
                  ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                  : 'bg-surface-raised hover:bg-surface-overlay border-white/10 text-slate-300'
              }"
              title="View Pinned Messages"
            >
              <span>📌</span>
              <span class="hidden md:inline">Pinned</span>
            </button>

            <button
              type="button"
              data-chat-action="toggle-inchat-search"
              class="h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                this.showInChatSearch
                  ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                  : 'bg-surface-raised hover:bg-surface-overlay border-white/10 text-slate-300'
              }"
              title="Search in conversation"
            >
              <span>🔍</span>
              <span class="hidden md:inline">Find</span>
            </button>

            <button
              type="button"
              data-chat-action="toggle-right-panel"
              class="h-8 px-2.5 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-white/10 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Toggle Members & Security Inspector"
            >
              <span>👥</span>
              <span class="hidden lg:inline">${this.mode === 'channels' ? 'Members' : 'Security'}</span>
            </button>
          </div>
        </header>

        <!-- Optional In-Chat Search Bar -->
        ${
          this.showInChatSearch
            ? `
            <div class="px-5 py-2 bg-surface-raised border-b border-white/10 flex items-center gap-2">
              <span class="text-xs text-slate-400">🔍</span>
              <input
                type="text"
                id="modern-chat-inchat-search"
                value="${escapeHtml(this.inChatSearch)}"
                placeholder="Filter messages in this conversation..."
                class="flex-1 bg-transparent text-xs text-white focus:outline-none"
              />
              <button type="button" data-chat-action="clear-inchat-search" class="text-xs text-slate-400 hover:text-white cursor-pointer">Clear</button>
            </div>
          `
            : ''
        }

        <!-- Scrollable Messages Stream -->
        <div
          id="modern-chat-stream"
          class="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3"
        >
          <!-- Date Pill Divider -->
          <div class="flex items-center justify-center my-2">
            <span class="px-3 py-0.5 rounded-full bg-surface-raised border border-white/10 text-[11px] font-mono text-slate-400">
              Today · End-to-End Verified
            </span>
          </div>

          ${messages.map((msg, idx) => this.renderMessageRowHTML(msg, messages[idx - 1], myFp)).join('')}

          ${
            this.typingIndicatorPeer
              ? `
              <div class="flex items-center gap-2 px-3 py-2 text-xs text-amber-300 font-mono animate-pulse">
                <span>💬</span>
                <span>${escapeHtml(this.typingIndicatorPeer)} is typing an encrypted reply...</span>
              </div>
            `
              : ''
          }
        </div>

        <!-- Bottom Rich Composer (Reply Banner + Emoji Picker + Voice Note + Input) -->
        <div class="p-3.5 bg-surface-base border-t border-white/10 relative shrink-0">
          ${
            this.replyingTo
              ? `
              <div class="mb-2 px-3.5 py-2 rounded-xl bg-surface-raised border-l-4 border-amber-400 flex items-center justify-between gap-2 text-xs">
                <div class="truncate">
                  <span class="text-amber-400 font-semibold">Replying to ${escapeHtml(this.replyingTo.authorName)}:</span>
                  <span class="text-slate-300 ml-1.5">${escapeHtml(this.replyingTo.snippet)}</span>
                </div>
                <button
                  type="button"
                  data-chat-action="cancel-reply"
                  class="text-slate-400 hover:text-white font-mono cursor-pointer"
                >✕</button>
              </div>
            `
              : ''
          }

          ${
            this.showEmojiPicker
              ? `
              <div class="absolute bottom-20 left-4 z-40 w-72 p-3 rounded-2xl bg-surface-raised border border-white/15 shadow-2xl grid grid-cols-8 gap-1.5">
                ${PICKER_EMOJIS.map(
                  (em) => `
                  <button
                    type="button"
                    data-chat-action="insert-emoji"
                    data-emoji="${em}"
                    class="w-7 h-7 rounded-lg hover:bg-surface-overlay flex items-center justify-center text-base transition-transform hover:scale-110 cursor-pointer"
                  >${em}</button>
                `
                ).join('')}
              </div>
            `
              : ''
          }

          <div class="flex items-center gap-2">
            <!-- Attach File / Code -->
            <button
              type="button"
              data-chat-action="send-sample-attachment"
              class="w-10 h-10 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Share Verified File or Code Snippet"
            >
              📎
            </button>

            <!-- Emoji Picker Toggle -->
            <button
              type="button"
              data-chat-action="toggle-emoji-picker"
              class="w-10 h-10 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 flex items-center justify-center text-slate-300 hover:text-amber-400 transition-colors cursor-pointer shrink-0"
              title="Insert Emoji"
            >
              😊
            </button>

            <!-- Record Voice Note -->
            <button
              type="button"
              data-chat-action="send-voice-note"
              class="w-10 h-10 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 flex items-center justify-center text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
              title="Send Encrypted Voice Note"
            >
              🎙️
            </button>

            <!-- Main Text Input -->
            <input
              type="text"
              id="modern-chat-composer-input"
              placeholder="${
                this.mode === 'channels'
                  ? `Message #${escapeHtml(activeChannel.name)} (try /shrug or /code)...`
                  : `Write an E2EE message to ${escapeHtml(activePeer.name)}...`
              }"
              class="flex-1 h-10 px-4 rounded-xl bg-surface-raised border border-white/10 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-slate-500"
            />

            <!-- Send Button -->
            <button
              type="button"
              data-chat-action="send-message"
              class="h-10 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
            >
              <span>Send</span>
              <span>↵</span>
            </button>
          </div>
        </div>
      </section>

      <!-- 3. RIGHT CONTEXT SIDEBAR (ONLINE MEMBERS / E2EE SECURITY DETAILS) -->
      ${
        this.showRightPanel
          ? `
          <aside class="hidden xl:flex w-72 bg-surface-base border-l border-white/10 flex-col shrink-0 h-full p-4 overflow-y-auto space-y-5">
            ${this.mode === 'channels' ? this.renderRightMembersSidebarHTML() : this.renderRightDmSecuritySidebarHTML(activePeer)}
          </aside>
        `
          : ''
      }
    `;
  }

  private renderChannelsListHTML(): string {
    const categories = ['CORE CHANNELS', 'ENGINEERING & SECOPS', 'COMMUNITY LOUNGE'] as const;
    const q = this.sidebarSearch.trim().toLowerCase();

    return categories
      .map((cat) => {
        const list = this.channels.filter(
          (c) => c.category === cat && (!q || c.name.toLowerCase().includes(q) || c.topic.toLowerCase().includes(q))
        );
        if (list.length === 0) return '';
        return `
          <div class="space-y-1">
            <div class="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
              ${cat}
            </div>
            ${list
              .map((ch) => {
                const active = ch.id === this.activeChannelId;
                return `
                  <button
                    type="button"
                    data-chat-action="select-channel"
                    data-channel-id="${escapeHtml(ch.id)}"
                    class="w-full px-3 py-2 rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      active
                        ? 'bg-surface-overlay text-amber-300 border border-amber-400/30 font-semibold'
                        : 'text-slate-300 hover:bg-surface-raised hover:text-white border border-transparent'
                    }"
                  >
                    <span class="flex items-center gap-2 truncate text-xs">
                      <span class="font-mono text-slate-500">#</span>
                      <span class="truncate">${escapeHtml(ch.name)}</span>
                    </span>
                    <span class="text-[10px] font-mono text-slate-500">${ch.activeCount}</span>
                  </button>
                `;
              })
              .join('')}
          </div>
        `;
      })
      .join('');
  }

  private renderDirectMessagesListHTML(): string {
    const q = this.sidebarSearch.trim().toLowerCase();
    const list = this.contacts.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q)
    );

    return `
      <div class="space-y-1">
        <div class="px-2 pb-1 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
          <span>Direct Conversations (${list.length})</span>
          <span class="text-emerald-400">E2EE</span>
        </div>
        ${list
          .map((peer) => {
            const active = peer.fp === this.activePeerFp;
            const threadMsgs = this.messagesByThread.get(peer.fp) || [];
            const lastMsg = threadMsgs[threadMsgs.length - 1];
            const preview = lastMsg
              ? lastMsg.voiceNote
                ? '🎙️ Voice Note (0:14)'
                : lastMsg.text
              : peer.statusText;

            return `
              <button
                type="button"
                data-chat-action="select-dm-peer"
                data-peer-fp="${escapeHtml(peer.fp)}"
                class="w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-all cursor-pointer ${
                  active
                    ? 'bg-surface-overlay border border-amber-400/40 shadow-sm'
                    : 'hover:bg-surface-raised border border-transparent'
                }"
              >
                <div class="relative shrink-0">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs border"
                    style="background:${peer.color}22; color:${peer.color}; border-color:${peer.color}55"
                  >
                    ${escapeHtml(peer.badge)}
                  </div>
                  <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${
                    peer.status === 'online'
                      ? 'bg-emerald-400'
                      : peer.status === 'idle'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                  } ring-2 ring-[#0E1015]"></span>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-xs font-bold text-white truncate">${escapeHtml(peer.name)}</span>${
                      lastMsg
                        ? `<span class="text-[10px] font-mono text-slate-500">${formatTime(lastMsg.createdAt)}</span>`
                        : ''
                    }
                  </div>
                  <div class="flex items-center justify-between gap-1 mt-0.5">
                    <span class="text-[11px] text-slate-400 truncate">${escapeHtml(preview)}</span>${
                      peer.unreadCount > 0
                        ? `<span class="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-mono font-bold">${peer.unreadCount}</span>`
                        : `<span class="text-[10px] font-mono text-emerald-400">✓✓</span>`
                    }
                  </div>
                </div>
              </button>
            `;
          })
          .join('')}
      </div>
    `;
  }

  private renderMessageRowHTML(
    msg: RichChatMessage,
    prevMsg: RichChatMessage | undefined,
    myFp: string
  ): string {
    const isMe = msg.senderFp === myFp;
    const isGrouped =
      prevMsg &&
      prevMsg.senderFp === msg.senderFp &&
      msg.createdAt - prevMsg.createdAt < 5 * 60 * 1000 &&
      !msg.replyTo;

    const reactionEntries = Object.entries(msg.reactions || {}).filter(([, arr]) => arr.length > 0);

    return `
      <div
        id="chat-msg-${escapeHtml(msg.id)}"
        class="group relative flex items-start gap-3 px-3 py-1.5 rounded-2xl hover:bg-surface-raised/50 transition-colors ${
          isGrouped ? 'mt-0.5' : 'mt-3'
        }"
      >
        <!-- Avatar or Timestamp Gutter -->
        ${
          !isGrouped
            ? `
            <button
              type="button"
              data-chat-action="open-peer-dm"
              data-peer-fp="${escapeHtml(msg.senderFp)}"
              class="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs border shrink-0 mt-0.5 cursor-pointer"
              style="background:${msg.senderColor}22; color:${msg.senderColor}; border-color:${msg.senderColor}55"
              title="Click to message ${escapeHtml(msg.senderName)}"
            >
              ${escapeHtml(msg.senderAvatarBadge)}
            </button>
          `
            : `<div class="w-9 shrink-0 text-[10px] font-mono text-slate-600 opacity-0 group-hover:opacity-100 text-center pt-1">${formatTime(msg.createdAt)}</div>`
        }

        <!-- Message Body Column -->
        <div class="flex-1 min-w-0 space-y-1">
          ${
            !isGrouped
              ? `
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-chat-action="open-peer-dm"
                  data-peer-fp="${escapeHtml(msg.senderFp)}"
                  class="text-xs font-bold text-white hover:underline cursor-pointer"
                >
                  ${escapeHtml(msg.senderName)}
                </button>
                <span class="text-[11px] font-mono text-slate-400">@${escapeHtml(msg.senderHandle)}</span>${
                  msg.senderRole && msg.senderRole !== 'MEMBER'
                    ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/30">${msg.senderRole}</span>`
                    : ''
                }
                <span class="text-[10px] font-mono text-slate-500">${formatTime(msg.createdAt)}</span>${
                  isMe
                    ? `<span class="text-[10px] font-mono text-emerald-400" title="Zero-Knowledge Verified Delivery">✓✓ ZK</span>`
                    : ''
                }
                ${
                  msg.isPinned
                    ? `<span class="text-[10px] font-mono text-amber-400">📌 Pinned</span>`
                    : ''
                }
              </div>
            `
              : ''
          }

          <!-- Inline Reply Reference -->
          ${
            msg.replyTo
              ? `
              <div class="flex items-center gap-1.5 text-xs text-slate-400 pl-2.5 border-l-2 border-amber-400/60 py-0.5">
                <span class="text-amber-300 font-semibold">↩ ${escapeHtml(msg.replyTo.authorName)}:</span>
                <span class="truncate">${escapeHtml(msg.replyTo.snippet)}</span>
              </div>
            `
              : ''
          }

          <!-- Text Content -->
          ${
            msg.text
              ? `<div class="text-sm text-slate-100 leading-relaxed break-words whitespace-pre-wrap">${escapeHtml(msg.text)}</div>`
              : ''
          }

          <!-- Playable Voice Note Bubble -->
          ${
            msg.voiceNote
              ? `
              <div class="inline-flex items-center gap-3 p-2.5 rounded-2xl bg-surface-raised border border-white/10 mt-1">
                <button
                  type="button"
                  data-chat-action="toggle-voice-play"
                  data-msg-id="${escapeHtml(msg.id)}"
                  class="w-8 h-8 rounded-xl bg-amber-400 text-black font-bold flex items-center justify-center text-xs cursor-pointer"
                >
                  ${this.playingVoiceId === msg.id ? '⏸' : '▶'}
                </button>
                <div class="flex items-end gap-0.5 h-6">
                  ${msg.voiceNote.waveform
                    .map(
                      (bar) =>
                        `<span class="w-1 rounded-full ${
                          this.playingVoiceId === msg.id ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'
                        }" style="height:${Math.max(20, bar)}%"></span>`
                    )
                    .join('')}
                </div>
                <span class="text-xs font-mono text-slate-300">0:${String(msg.voiceNote.durationSec).padStart(2, '0')}</span>
              </div>
            `
              : ''
          }

          <!-- File / Code Attachment Card -->
          ${
            msg.attachment
              ? `
              <div class="inline-flex items-center gap-3 p-3 rounded-xl bg-surface-raised border border-white/10 mt-1 max-w-md">
                <div class="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 text-base">
                  📦
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-bold text-white truncate">${escapeHtml(msg.attachment.name)}</div>
                  <div class="text-[10px] font-mono text-emerald-400">${escapeHtml(msg.attachment.sizeLabel)}</div>
                </div>
              </div>
            `
              : ''
          }

          <!-- Active Reaction Pills -->
          ${
            reactionEntries.length > 0
              ? `
              <div class="flex flex-wrap items-center gap-1.5 pt-1">
                ${reactionEntries
                  .map(([emoji, users]) => {
                    const iReacted = users.includes(myFp);
                    return `
                      <button
                        type="button"
                        data-chat-action="react-msg"
                        data-msg-id="${escapeHtml(msg.id)}"
                        data-emoji="${emoji}"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs border transition-all cursor-pointer ${
                          iReacted
                            ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 font-bold'
                            : 'bg-surface-raised border-white/10 text-slate-300 hover:border-white/25'
                        }"
                      >
                        <span>${emoji}</span>
                        <span class="font-mono text-[11px]">${users.length}</span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            `
              : ''
          }
        </div>

        <!-- Hover Floating Action Dock (WhatsApp / Messenger / Discord style) -->
        <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 right-4 z-20 flex items-center gap-0.5 p-1 rounded-xl bg-surface-raised border border-white/15 shadow-xl">
          ${QUICK_EMOJIS.map(
            (em) => `
              <button
                type="button"
                data-chat-action="react-msg"
                data-msg-id="${escapeHtml(msg.id)}"
                data-emoji="${em}"
                class="w-7 h-7 rounded-lg hover:bg-surface-overlay flex items-center justify-center text-xs transition-transform hover:scale-110 cursor-pointer"
                title="React ${em}"
              >${em}</button>
            `
          ).join('')}
          <span class="w-px h-4 bg-white/10 mx-0.5"></span>
          <button
            type="button"
            data-chat-action="reply-msg"
            data-msg-id="${escapeHtml(msg.id)}"
            class="px-2 h-7 rounded-lg hover:bg-surface-overlay text-[11px] font-medium text-slate-200 hover:text-amber-300 cursor-pointer"
            title="Reply to message"
          >↩ Reply</button>
          <button
            type="button"
            data-chat-action="pin-msg"
            data-msg-id="${escapeHtml(msg.id)}"
            class="w-7 h-7 rounded-lg hover:bg-surface-overlay text-xs text-slate-300 hover:text-amber-300 cursor-pointer"
            title="Pin / Unpin"
          >📌</button>
          <button
            type="button"
            data-chat-action="copy-msg"
            data-msg-id="${escapeHtml(msg.id)}"
            class="w-7 h-7 rounded-lg hover:bg-surface-overlay text-xs text-slate-300 hover:text-white cursor-pointer"
            title="Copy text"
          >📋</button>
        </div>
      </div>
    `;
  }

  private renderRightMembersSidebarHTML(): string {
    const guardians = this.contacts.filter((c) => c.role === 'GUARDIAN' || c.role === 'CURATOR' || c.role === 'MODERATOR');
    const members = this.contacts.filter((c) => c.role === 'MEMBER');

    return `
      <div class="space-y-4">
        <div>
          <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-2">
            GUARDIANS & CURATORS — ${guardians.length}
          </div>
          <div class="space-y-1.5">
            ${guardians
              .map(
                (m) => `
              <button
                type="button"
                data-chat-action="open-peer-dm"
                data-peer-fp="${escapeHtml(m.fp)}"
                class="w-full p-2 rounded-xl hover:bg-surface-raised flex items-center gap-2.5 text-left transition-colors cursor-pointer group"
                title="Click to start Direct Message with ${escapeHtml(m.name)}"
              >
                <div class="relative">
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs border"
                    style="background:${m.color}22; color:${m.color}; border-color:${m.color}55"
                  >
                    ${escapeHtml(m.badge)}
                  </div>
                  <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold text-white group-hover:text-amber-300 truncate">${escapeHtml(m.name)}</div>
                  <div class="text-[10px] text-slate-400 truncate">${escapeHtml(m.statusText)}</div>
                </div>
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        <div>
          <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-2">
            ONLINE MEMBERS — ${members.length}
          </div>
          <div class="space-y-1.5">
            ${members
              .map(
                (m) => `
              <button
                type="button"
                data-chat-action="open-peer-dm"
                data-peer-fp="${escapeHtml(m.fp)}"
                class="w-full p-2 rounded-xl hover:bg-surface-raised flex items-center gap-2.5 text-left transition-colors cursor-pointer group"
                title="Click to start Direct Message with ${escapeHtml(m.name)}"
              >
                <div class="relative">
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs border"
                    style="background:${m.color}22; color:${m.color}; border-color:${m.color}55"
                  >
                    ${escapeHtml(m.badge)}
                  </div>
                  <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${
                    m.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'
                  }"></span>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold text-white group-hover:text-amber-300 truncate">${escapeHtml(m.name)}</div>
                  <div class="text-[10px] text-slate-400 truncate">${escapeHtml(m.statusText)}</div>
                </div>
              </button>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  private renderRightDmSecuritySidebarHTML(peer: ChatPeerContact): string {
    return `
      <div class="space-y-4">
        <div class="p-4 rounded-2xl bg-surface-raised border border-white/10 text-center space-y-2">
          <div
            class="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center font-mono font-bold text-lg border"
            style="background:${peer.color}22; color:${peer.color}; border-color:${peer.color}55"
          >
            ${escapeHtml(peer.badge)}
          </div>
          <div class="text-sm font-bold text-white">${escapeHtml(peer.name)}</div>
          <div class="text-xs font-mono text-slate-400">@${escapeHtml(peer.handle)}@urefy.com</div>
        </div>

        <div class="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
          <div class="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Post-Quantum E2EE Verified</span>
          </div>
          <p class="text-[11px] text-slate-300 leading-relaxed">
            Messages and voice notes are encrypted on your device using ML-KEM-768 + X25519 Double Ratchet.
          </p>
          <div class="p-2 rounded-lg bg-black/40 font-mono text-[10px] text-emerald-300 tracking-wider text-center select-all">
            ${escapeHtml(peer.safetyNumber)}
          </div>
        </div>
      </div>
    `;
  }

  private bindEventsOnce(): void {
    if (this.isBound || typeof document === 'undefined') return;
    this.isBound = true;

    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const actionEl = target.closest<HTMLElement>('[data-chat-action]');
      if (!actionEl) return;

      const action = actionEl.getAttribute('data-chat-action');
      switch (action) {
        case 'toggle-mobile-sidebar': {
          this.showMobileSidebar = !this.showMobileSidebar;
          this.mountIfOnMessagesRoute(true);
          break;
        }
        case 'switch-mode': {
          const nextMode = actionEl.getAttribute('data-mode') as 'channels' | 'dm';
          if (nextMode) {
            this.mode = nextMode;
            this.showPinnedOnly = false;
            this.mountIfOnMessagesRoute(true);
            this.scrollToBottom();
          }
          break;
        }
        case 'select-channel': {
          const chId = actionEl.getAttribute('data-channel-id');
          if (chId) {
            this.mode = 'channels';
            this.activeChannelId = chId;
            this.showPinnedOnly = false;
            this.showMobileSidebar = false;
            this.mountIfOnMessagesRoute(true);
            this.scrollToBottom();
          }
          break;
        }
        case 'select-dm-peer':
        case 'open-peer-dm': {
          const fp = actionEl.getAttribute('data-peer-fp');
          if (fp && fp !== 'me-sovereign') {
            this.mode = 'dm';
            this.activePeerFp = fp;
            this.showMobileSidebar = false;
            const contact = this.contacts.find((c) => c.fp === fp);
            if (contact) contact.unreadCount = 0;
            this.mountIfOnMessagesRoute(true);
            this.scrollToBottom();
          }
          break;
        }
        case 'send-message': {
          const input = document.getElementById('modern-chat-composer-input') as HTMLInputElement | null;
          if (input && input.value.trim()) {
            this.sendMessage(input.value);
          }
          break;
        }
        case 'toggle-emoji-picker': {
          this.showEmojiPicker = !this.showEmojiPicker;
          this.mountIfOnMessagesRoute(true);
          break;
        }
        case 'insert-emoji': {
          const em = actionEl.getAttribute('data-emoji') || '';
          const input = document.getElementById('modern-chat-composer-input') as HTMLInputElement | null;
          if (input && em) {
            input.value += em;
            input.focus();
          }
          break;
        }
        case 'send-voice-note': {
          this.sendMessage('', {
            voiceNote: {
              durationSec: 9,
              waveform: [30, 60, 85, 45, 95, 70, 50, 80, 90, 65, 40, 75, 85, 55, 35, 60, 40, 25],
            },
          });
          break;
        }
        case 'send-sample-attachment': {
          this.sendMessage('Shared a verified cryptographic package:', {
            attachment: {
              name: `snapshot-${new Date().toISOString().slice(0, 10)}.tar.zst`,
              sizeLabel: '1.24 MB · SHA-256 Clean',
              kind: 'archive',
            },
          });
          break;
        }
        case 'toggle-voice-play': {
          const msgId = actionEl.getAttribute('data-msg-id') || '';
          this.playingVoiceId = this.playingVoiceId === msgId ? null : msgId;
          this.mountIfOnMessagesRoute(true);
          break;
        }
        case 'react-msg': {
          const msgId = actionEl.getAttribute('data-msg-id') || '';
          const emoji = actionEl.getAttribute('data-emoji') || '👍';
          if (msgId) this.toggleReaction(msgId, emoji);
          break;
        }
        case 'reply-msg': {
          const msgId = actionEl.getAttribute('data-msg-id') || '';
          const msg = this.getActiveMessages().find((m) => m.id === msgId);
          if (msg) {
            this.replyingTo = {
              messageId: msg.id,
              authorName: msg.senderName,
              snippet: (msg.text || 'Voice Note / Attachment').slice(0, 80),
            };
            this.mountIfOnMessagesRoute(true);
            (document.getElementById('modern-chat-composer-input') as HTMLInputElement | null)?.focus();
          }
          break;
        }
        case 'cancel-reply': {
          this.replyingTo = null;
          this.mountIfOnMessagesRoute(true);
          break;
        }
        case 'pin-msg': {
          const msgId = actionEl.getAttribute('data-msg-id') || '';
          const msg = this.getActiveMessages().find((m) => m.id === msgId);
          if (msg) {
            msg.isPinned = !msg.isPinned;
            this.saveToStorage();
            this.mountIfOnMessagesRoute(true);
          }
          break;
        }
        case 'copy-msg': {
          const msgId = actionEl.getAttribute('data-msg-id') || '';
          const msg = this.getActiveMessages().find((m) => m.id === msgId);
          if (msg && navigator.clipboard) {
            void navigator.clipboard.writeText(msg.text || '');
            clientStore?.showToast?.('Message copied to clipboard', 'info');
          }
          break;
        }
        case 'toggle-pinned-filter': {
          this.showPinnedOnly = !this.showPinnedOnly;
          this.mountIfOnMessagesRoute(true);
          break;
        }
        case 'toggle-inchat-search': {
          this.showInChatSearch = !this.showInChatSearch;
          this.mountIfOnMessagesRoute(true);
          break;
        }
        case 'clear-inchat-search': {
          this.inChatSearch = '';
          this.showInChatSearch = false;
          this.mountIfOnMessagesRoute(true);
          break;
        }
        case 'toggle-right-panel': {
          this.showRightPanel = !this.showRightPanel;
          this.mountIfOnMessagesRoute(true);
          break;
        }
        case 'open-audio-dsp': {
          if ((window as any).acousticDSP) {
            (window as any).acousticDSP.open();
          }
          break;
        }
        case 'open-new-dm-modal': {
          this.mode = 'dm';
          this.mountIfOnMessagesRoute(true);
          break;
        }
      }
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.id === 'modern-chat-composer-input' && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const input = target as HTMLInputElement;
        if (input.value.trim()) {
          this.sendMessage(input.value);
        }
      }
    });

    document.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement | null;
      if (!target) return;
      if (target.id === 'modern-chat-sidebar-search') {
        this.sidebarSearch = target.value;
        this.mountIfOnMessagesRoute(true);
        const reFocused = document.getElementById('modern-chat-sidebar-search') as HTMLInputElement | null;
        if (reFocused) {
          reFocused.focus();
          reFocused.setSelectionRange(reFocused.value.length, reFocused.value.length);
        }
      } else if (target.id === 'modern-chat-inchat-search') {
        this.inChatSearch = target.value;
        this.mountIfOnMessagesRoute(true);
        const reFocused = document.getElementById('modern-chat-inchat-search') as HTMLInputElement | null;
        if (reFocused) {
          reFocused.focus();
          reFocused.setSelectionRange(reFocused.value.length, reFocused.value.length);
        }
      }
    });
  }
}

export const modernChat2027 = new ModernChatWorkspace2027();
