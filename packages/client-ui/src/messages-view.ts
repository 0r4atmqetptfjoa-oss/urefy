/**
 * @file messages-view.ts
 * @package @aetheris/client-ui
 * @description Sovereign Relays & Live E2EE Direct Messaging Workspace View.
 */

import { clientStore, ClientMessage, DirectMessageAttachment } from './client-state.js';
import { relaysManager } from './relays-manager.js';
import { zkReputation } from './zk-reputation.js';
import { sovereignDM, DirectMessage } from './sovereign-dm.js';
import { MAX_PRIVATE_ATTACHMENT_BYTES } from './direct-messaging-client.js';
import { renderIcon } from './ui/icons.js';
import { branchOf, MESSAGE_REACTIONS } from './conversation-context.js';
import { compileContextQuery } from './local-context-query.js';
import { processChatMessageContent } from './chat-rich-embed.js';
import { canonicalVault } from './canonical-vault.js';

import { voiceNotesManager } from './messages-voice.js';
import { contextCapsuleManager, type CapsuleItem, parseCapsuleFromText, renderCapsuleArtifact } from './messages-capsule.js';
import { chatSearchEngine } from './messages-search.js';

if (typeof window !== 'undefined') {
  (window as any).voiceNotesManager = voiceNotesManager;
  (window as any).contextCapsuleManager = contextCapsuleManager;
  (window as any).chatSearchEngine = chatSearchEngine;
}

// A touch hold reveals the same contextual actions as desktop hover.
if (typeof document !== 'undefined') {
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let startX = 0;
  let startY = 0;
  const cancelHold = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = undefined; };
  document.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || !(event.target instanceof Element)) return;
    if (event.target.closest('button, summary, a, input, textarea')) return;
    const message = event.target.closest<HTMLElement>('.dm-message');
    if (!message) return;
    cancelHold();
    startX = event.clientX;
    startY = event.clientY;
    holdTimer = setTimeout(() => { message.focus({ preventScroll: true }); holdTimer = undefined; }, 420);
  }, { passive: true });
  document.addEventListener('pointermove', event => {
    if (Math.abs(event.clientX - startX) > 8 || Math.abs(event.clientY - startY) > 8) cancelHold();
  }, { passive: true });
  document.addEventListener('pointerup', cancelHold, { passive: true });
  document.addEventListener('pointercancel', cancelHold, { passive: true });
}

export type MessagesTab = 'relays' | 'dm';
export type DMFilterGroup = 'all' | 'direct' | 'communities' | 'unread';
export let activeMessagesTab: MessagesTab = 'relays';
export let dmFilterGroup: DMFilterGroup = 'all';
export let isDMContextDrawerOpen: boolean = false;
export let isNewDMPickerOpen: boolean = false;
export let isDMEmojiPickerOpen: boolean = false;
export let isRelayEmojiPickerOpen: boolean = false;
export let isOutcomePickerOpen: boolean = false;
export let isCatchMeUpOpen: boolean = false;
export let isDMComposerMenuOpen: boolean = false;
export let isRelayComposerMenuOpen: boolean = false;
export let chatEmojiCategory: string = 'smileys';
export let chatEmojiSearchQuery: string = '';

export function toggleComposerMenu(targetType: 'dm' | 'relay', open?: boolean): void {
  if (targetType === 'dm') {
    isDMComposerMenuOpen = typeof open === 'boolean' ? open : !isDMComposerMenuOpen;
    isRelayComposerMenuOpen = false;
  } else {
    isRelayComposerMenuOpen = typeof open === 'boolean' ? open : !isRelayComposerMenuOpen;
    isDMComposerMenuOpen = false;
  }
}

export function closeComposerMenu(): void {
  isDMComposerMenuOpen = false;
  isRelayComposerMenuOpen = false;
}

export async function saveMessageMoment(messageId: string, text: string, senderName: string, contextName: string, timestamp?: number): Promise<void> {
  await canonicalVault.saveMessage({
    id: messageId,
    content: text,
    authorName: senderName,
    channelId: contextName,
    createdAt: timestamp || Date.now(),
  });
  clientStore.showToast('✨ Moment saved to your Vault', 'success');
  clientStore.notifySync();
}

export function setDMFilterGroup(group: DMFilterGroup): void {
  dmFilterGroup = group;
}

export function toggleDMContextDrawer(open?: boolean): void {
  isDMContextDrawerOpen = typeof open === 'boolean' ? open : !isDMContextDrawerOpen;
}

let loadedEmojiData: any = null;
let emojiDataLoading = false;

export function ensureEmojiDataLoaded(): void {
  if (loadedEmojiData || emojiDataLoading) return;
  emojiDataLoading = true;
  void import('./emoji-data.js').then((mod) => {
    loadedEmojiData = mod;
    emojiDataLoading = false;
    clientStore.notifySync();
  }).catch(() => {
    emojiDataLoading = false;
  });
}

export function setChatEmojiCategory(cat: string): void {
  chatEmojiCategory = cat;
}

export function setChatEmojiSearchQuery(q: string): void {
  chatEmojiSearchQuery = q;
}

export function getActiveBranch(): string {
  return sovereignDM.getActiveBranch();
}

export function setActiveBranch(branch: string): void {
  sovereignDM.selectBranch(branch);
}

export function getBranchesForPeer(peerFP: string): string[] {
  return ['main', ...sovereignDM.getBranches(peerFP).map(branch => branch.id)];
}

export async function createBranchForPeer(peerFP: string, branchName: string, sourceMessageId?: string): Promise<void> {
  const messages = sovereignDM.getConversation(peerFP)?.messages || [];
  const source = sourceMessageId || messages.filter(message => !message.context?.reaction && branchOf(message) === sovereignDM.getActiveBranch()).at(-1)?.id;
  if (!source) throw new Error('Send a message before starting a branch');
  await sovereignDM.createBranch(peerFP, branchName, source);
}

export function toggleCatchMeUp(): void {
  isCatchMeUpOpen = !isCatchMeUpOpen;
}

export function toggleOutcomePicker(open?: boolean): void {
  isOutcomePickerOpen = typeof open === 'boolean' ? open : !isOutcomePickerOpen;
}

export function insertOutcomeTemplate(type: string): void {
  let template = '';
  switch (type) {
    case 'decision':
      template = '[DECISION] ';
      break;
    case 'task':
      template = '[TASK] ';
      break;
    case 'question':
      template = '[QUESTION] ';
      break;
    case 'poll':
      template = '[POLL] ';
      break;
    default:
      return;
  }
  setMessageDraft('dm', getMessageDraft('dm') + template);
  isOutcomePickerOpen = false;
  restoreMessageSelection('dm', true);
}

let dmSearchQuery: string = '';
const messageSelections: Record<'dm' | 'relay', { start: number; end: number }> = {
  dm: { start: 0, end: 0 },
  relay: { start: 0, end: 0 },
};

const inMemoryDrafts: Record<string, string> = {
  dm: '',
  relay: '',
};

function getDraftStorageKey(targetType: 'dm' | 'relay', targetId?: string): string {
  if (targetType === 'dm') {
    const peer = targetId || sovereignDM.activePeerFP || 'default';
    return `urefy_msg_draft_dm_${peer}`;
  }
  const channel = targetId || clientStore.activeChannelId || 'relays-general';
  return `urefy_msg_draft_relay_${channel}`;
}

export function setMessageDraft(targetType: 'dm' | 'relay', value: string, targetId?: string): void {
  const key = getDraftStorageKey(targetType, targetId);
  inMemoryDrafts[key] = value;
  inMemoryDrafts[targetType] = value;
  if (typeof localStorage !== 'undefined') {
    try {
      if (value) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    } catch (_) {}
  }
}

export function getMessageDraft(targetType: 'dm' | 'relay', targetId?: string): string {
  const key = getDraftStorageKey(targetType, targetId);
  if (inMemoryDrafts[key] !== undefined && inMemoryDrafts[key] !== '') return inMemoryDrafts[key];
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null && stored !== '') return stored;
    } catch (_) {}
  }
  if (inMemoryDrafts[targetType] !== undefined) return inMemoryDrafts[targetType];
  return '';
}

export function hasConversationDraft(targetType: 'dm' | 'relay', targetId: string): boolean {
  return Boolean(getMessageDraft(targetType, targetId).trim());
}

export function captureMessageSelection(targetType: 'dm' | 'relay', input: HTMLInputElement | null, explicitSelection = false): void {
  if (!input || input.isConnected === false) return;
  // A freshly rendered, unfocused input may have its caret reset to the end.
  // Only the active editor can replace the selection retained for its toolbar.
  if (!explicitSelection && typeof document !== 'undefined' && document.activeElement && document.activeElement !== input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  setMessageDraft(targetType, input.value);
  messageSelections[targetType] = { start, end };
}

export function insertMessageEmoji(targetType: 'dm' | 'relay', emoji: string): number {
  const value = getMessageDraft(targetType);
  const selection = messageSelections[targetType];
  const start = Math.max(0, Math.min(selection.start, value.length));
  const end = Math.max(start, Math.min(selection.end, value.length));
  const nextValue = value.slice(0, start) + emoji + value.slice(end);
  setMessageDraft(targetType, nextValue);
  const caret = start + emoji.length;
  messageSelections[targetType] = { start: caret, end: caret };
  return caret;
}

export function restoreMessageSelection(targetType: 'dm' | 'relay', focus = true): void {
  const input = document.getElementById(targetType === 'dm' ? 'input-dm-message' : 'input-message') as HTMLInputElement | null;
  if (!input) return;
  const selection = messageSelections[targetType];
  const draft = getMessageDraft(targetType);
  if (input.value !== draft) input.value = draft;
  if (focus) input.focus({ preventScroll: true });
  input.setSelectionRange(selection.start, selection.end);
}

export function setActiveMessagesTab(tab: MessagesTab): void {
  activeMessagesTab = tab;
  if (typeof window !== 'undefined') {
    (window as any).__aetheris_activeMessagesTab = tab;
    try { localStorage.setItem('urefy_active_messages_tab', tab); } catch {}
  }
  sovereignDM.setInlineMode(true);
  sovereignDM.isOpen = tab === 'dm';
  if (tab === 'dm') void sovereignDM.startLiveSync();
}

export function getActiveMessagesTab(): MessagesTab {
  if (typeof window !== 'undefined') {
    if ((window as any).__aetheris_activeMessagesTab) {
      return (window as any).__aetheris_activeMessagesTab;
    }
    try {
      const saved = localStorage.getItem('urefy_active_messages_tab') as MessagesTab;
      if (saved === 'relays' || saved === 'dm') {
        (window as any).__aetheris_activeMessagesTab = saved;
        return saved;
      }
    } catch {}
  }
  return activeMessagesTab;
}

export function openNewDMPicker(): void {
  isNewDMPickerOpen = true;
}

export function closeNewDMPicker(): void {
  isNewDMPickerOpen = false;
}

export function toggleDMEmojiPicker(open?: boolean): void {
  isDMEmojiPickerOpen = typeof open === 'boolean' ? open : !isDMEmojiPickerOpen;
  isRelayEmojiPickerOpen = false;
  if (isDMEmojiPickerOpen) {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    ensureEmojiDataLoaded();
  }
}

export function toggleRelayEmojiPicker(open?: boolean): void {
  isRelayEmojiPickerOpen = typeof open === 'boolean' ? open : !isRelayEmojiPickerOpen;
  isDMEmojiPickerOpen = false;
  if (isRelayEmojiPickerOpen) {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    ensureEmojiDataLoaded();
  }
}

export function closeEmojiPickers(): void {
  isDMEmojiPickerOpen = false;
  isRelayEmojiPickerOpen = false;
}

export function setDMSearchQuery(query: string): void {
  dmSearchQuery = query;
}

export const CHAT_EMOJIS = [
  '😊', '😀', '😂', '🥰', '😎', '🤔', '🫡', '🤯', '🥳', '😴', '👀',
  '⚡', '🛡️', '🔐', '📡', '🛰️', '🚀', '💎', '🧠', '🔥', '💻',
  '👍', '👎', '🤝', '🙌', '✌️', '❤️', '✨', '⭐', '🎉', '✅'
];

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTime(ts: number): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '00:00';
  }
}

function formatRelative(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function generateDeterministicGradient(fingerprint: string): string {
  if (!fingerprint || fingerprint === 'genesis-core' || fingerprint === 'unknown') {
    return 'from-slate-800 to-slate-900 text-slate-300 border-slate-700/50';
  }
  const gradients = [
    'from-[#1e2330] to-[#141722] text-slate-200 border-white/10',
    'from-[#24202e] to-[#161420] text-slate-200 border-white/10',
    'from-[#1a2628] to-[#121c1e] text-teal-200/90 border-teal-500/20',
    'from-[#282218] to-[#1a1610] text-amber-200/90 border-amber-500/20',
    'from-[#1e252b] to-[#13191d] text-slate-200 border-white/10',
    'from-[#251e22] to-[#181316] text-rose-200/90 border-rose-500/20',
  ];
  let hash = 0x811c9dc5;
  for (let i = 0; i < fingerprint.length; i++) {
    hash ^= fingerprint.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const idx = Math.abs(hash) % gradients.length;
  return gradients[idx];
}

function escapeAttr(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function isSameCalendarDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export function formatDateSeparator(ts: number): string {
  const d = new Date(ts);
  const formattedDate = d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
  });
  const today = new Date();
  if (isSameCalendarDay(ts, today.getTime())) {
    return `Today · ${formattedDate}`;
  }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(ts, yesterday.getTime())) {
    return `Yesterday · ${formattedDate}`;
  }
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  return `${weekday} · ${formattedDate}`;
}

export function resolveHumanDisplayName(fp: string, isMine?: boolean): { name: string; handle: string } {
  const safeFp = fp || '';
  if (isMine) return { name: 'You', handle: '@me' };
  const member = clientStore.members?.find((m: any) => m.fingerprint === safeFp);
  if (member?.name || member?.alias) {
    return {
      name: (member.name || member.alias) as string,
      handle: member.handle ? `@${member.handle.replace(/^@/, '')}` : '',
    };
  }
  if (safeFp === 'genesis-core') return { name: 'System', handle: '@system' };
  if (safeFp === 'c3dc28cb705e') return { name: 'Elena Rostova', handle: '@elena_r' };
  if (safeFp === 'a89104fa2211') return { name: 'David Chen', handle: '@david_c' };
  if (safeFp === 'f40019bc88a2') return { name: 'Maya Patel', handle: '@maya_p' };
  if (safeFp === '9b22a011cd44') return { name: 'Samira Khan', handle: '@samira' };

  if (typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(`aetheris_profile_${safeFp}`);
      if (cached) {
        const p = JSON.parse(cached);
        if (p?.name && p.name !== 'Profile not set up' && !p.name.startsWith('Member ')) {
          return { name: p.name, handle: p.handle ? `@${p.handle.replace(/^@/, '')}` : '' };
        }
      }
    } catch (_) {}
  }

  return {
    name: 'Profile not set up',
    handle: '',
  };
}

export function renderSharedPostCard(text: string): string {
  if (!text) return '';
  if (typeof localStorage !== 'undefined' && localStorage.getItem('urefy_msg_rich_previews') === 'false') {
    return '';
  }
  const match = text.match(/(?:urefy\.com\/p\/|\/p\/|post:)([a-zA-Z0-9_-]+)/);
  if (!match) return '';
  const postId = match[1];
  const post = clientStore.posts?.find(p => p.id === postId);
  if (!post) {
    return `
      <div class="mt-2.5 p-3 rounded-2xl bg-surface-raised/80 border border-white/10 flex items-center justify-between text-xs">
        <div class="flex items-center space-x-2">
          <span>📜</span>
          <span class="font-medium text-slate-300">Shared Post</span>
        </div>
        <button type="button" data-action="open-post" data-post-id="${escapeHtml(postId)}" class="text-[var(--color-accent,#e59b3c)] hover:underline font-bold cursor-pointer">View Post →</button>
      </div>
    `;
  }
  if (post.status === 'deleted' || post.status === 'tombstone') {
    return `
      <div class="mt-2.5 p-3 rounded-2xl bg-surface-raised/40 border border-white/5 flex items-center space-x-2 text-xs text-slate-500 italic">
        <span>🗑️</span>
        <span>This shared post has been deleted.</span>
      </div>
    `;
  }
  const postAuthor = resolveHumanDisplayName(post.authorFingerprint);
  return `
    <div class="dialogue-shared-post mt-2.5 p-3 space-y-1.5 text-xs text-left cursor-pointer group/card" data-action="open-post" data-post-id="${escapeHtml(post.id)}">
      <div class="flex items-center justify-between text-[11px] text-slate-400">
        <div class="flex items-center space-x-1.5 truncate">
          <span>📜</span>
          <span class="font-bold text-slate-200">${escapeHtml(postAuthor.name)}</span>
          <span class="text-slate-500 font-mono">${escapeHtml(postAuthor.handle)}</span>
          <span class="text-slate-600">•</span>
          <span>${formatRelative(post.createdAt)}</span>
        </div>
        <span class="text-[var(--color-accent,#e59b3c)] font-semibold shrink-0 group-hover/card:translate-x-0.5 transition-transform">View →</span>
      </div>
      <div class="font-semibold text-slate-100 line-clamp-1">${escapeHtml(post.title || 'Untitled Post')}</div>
      <p class="text-slate-400 text-[11px] line-clamp-2 leading-relaxed">${escapeHtml(post.content || '')}</p>
    </div>
  `;
}

export function renderAttachmentCard(att?: DirectMessageAttachment): string {
  if (!att || !att.dataUrl) return '';

  const isImg = att.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name);
  const isVideo = att.type?.startsWith('video/') || (!att.type && /\.(mp4|webm|ogg)$/i.test(att.name));
  const isAudio = att.type?.startsWith('audio/') || (!att.type && /\.(mp3|wav|ogg|m4a)$/i.test(att.name));
  const sizeFormatted = att.size ? (att.size < 1024 * 1024 ? `${(att.size / 1024).toFixed(1)} KB` : `${(att.size / (1024 * 1024)).toFixed(1)} MB`) : '';

  if (isImg) {
    return `
      <div class="mt-2 rounded-xl overflow-hidden border border-white/10 max-w-sm group relative bg-black/40">
        <img src="${escapeHtml(att.dataUrl)}" alt="${escapeHtml(att.name)}" class="w-full max-h-64 object-contain cursor-pointer hover:scale-[1.01] transition-transform" data-action="open-lightbox" data-src="${escapeHtml(att.dataUrl)}" loading="lazy" />
        <div class="p-1.5 bg-black/70 flex items-center justify-between text-[10px] font-mono text-slate-300">
          <span class="truncate max-w-[200px]">${escapeHtml(att.name)}</span>
          <span>${sizeFormatted}</span>
        </div>
      </div>
    `;
  }

  if (isVideo) {
    return `
      <div class="mt-2 rounded-xl overflow-hidden border border-white/10 max-w-md bg-black">
        <video src="${escapeHtml(att.dataUrl)}" controls playsinline preload="metadata" class="w-full max-h-64 object-contain"></video>
        <div class="p-1.5 bg-surface-raised flex items-center justify-between text-[10px] font-mono text-slate-300">
          <span class="truncate max-w-[200px]">🎬 ${escapeHtml(att.name)}</span>
          <span>${sizeFormatted}</span>
        </div>
      </div>
    `;
  }

  if (isAudio) {
    return `
      <div class="chat-voice-card dialogue-audio mt-2">
        <button type="button" class="chat-voice-play-btn" data-action="toggle-audio-play" data-audio-src="${escapeHtml(att.dataUrl)}" aria-label="Play voice note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
        <div class="chat-voice-track" aria-hidden="true">
          ${Array.from({ length: 18 }).map((_, i) => `<span class="chat-voice-bar ${i < 6 ? 'is-active' : ''}" style="height: ${Math.max(6, (Math.sin(i * 0.8) * 8 + 10))}px"></span>`).join('')}
        </div>
        <span class="chat-voice-duration font-mono text-[11px] text-slate-400">${escapeHtml(att.name)}</span>
        <audio src="${escapeHtml(att.dataUrl)}" preload="metadata" controls class="hidden"></audio>
      </div>
    `;
  }

  return `
    <div class="mt-2 flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-raised border border-white/10 max-w-sm shadow-xs">
      <div class="flex items-center space-x-2.5 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-[var(--color-accent,#e89e38)]/15 text-[var(--color-accent,#e89e38)] border border-[var(--color-accent,#e89e38)]/30 flex items-center justify-center text-sm shrink-0">
          📁
        </div>
        <div class="min-w-0">
          <div class="text-xs font-semibold text-slate-200 truncate">${escapeHtml(att.name)}</div>
          <div class="text-[10px] text-slate-400">${sizeFormatted} ${att.sha256 ? `• ${att.sha256.slice(0, 8)}` : ''}</div>
        </div>
      </div>
      <a 
        href="${escapeHtml(att.dataUrl)}" 
        download="${escapeHtml(att.name)}"
        class="px-2.5 py-1.5 rounded-lg bg-[var(--color-accent,#e89e38)] hover:brightness-110 text-slate-950 text-[11px] font-bold transition-all shrink-0 flex items-center space-x-1 cursor-pointer"
        title="Download file"
      >
        <span>⬇</span>
      </a>
    </div>
  `;
}

export function getRecentEmojis(): string[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const rec = localStorage.getItem('urefy_recent_emojis');
      if (rec) return JSON.parse(rec);
    } catch (_) {}
  }
  return ['👍', '❤️', '🔥', '✨', '😂', '🎉', '💡', '✅'];
}

export function addRecentEmoji(emoji: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      let recents = getRecentEmojis().filter(e => e !== emoji);
      recents.unshift(emoji);
      recents = recents.slice(0, 16);
      localStorage.setItem('urefy_recent_emojis', JSON.stringify(recents));
    } catch (_) {}
  }
}

export function renderEmojiPopover(targetType: 'dm' | 'relay'): string {
  const isOpen = targetType === 'dm' ? isDMEmojiPickerOpen : isRelayEmojiPickerOpen;
  if (!isOpen) return '';

  const categories = [
    { key: 'recent', icon: '🕒', label: 'Recent' },
    { key: 'smileys', icon: '🙂', label: 'Smileys' },
    { key: 'people', icon: '👋', label: 'People' },
    { key: 'animals', icon: '🐱', label: 'Animals' },
    { key: 'food', icon: '🍔', label: 'Food' },
    { key: 'activities', icon: '⚽', label: 'Activities' },
    { key: 'travel', icon: '🚀', label: 'Travel' },
    { key: 'objects', icon: '💡', label: 'Objects' },
    { key: 'symbols', icon: '❤️', label: 'Symbols' },
  ];

  let displayEmojis: string[] = [];
  const q = chatEmojiSearchQuery.trim();

  if (q && loadedEmojiData?.searchEmojis) {
    const searchResults = loadedEmojiData.searchEmojis(q, 48);
    displayEmojis = searchResults.map((r: { emoji: string }) => r.emoji);
  } else if (q) {
    displayEmojis = CHAT_EMOJIS;
  } else if (chatEmojiCategory === 'recent') {
    displayEmojis = getRecentEmojis();
  } else if (loadedEmojiData?.RAW_CATEGORY_EMOJIS?.[chatEmojiCategory]) {
    displayEmojis = loadedEmojiData.RAW_CATEGORY_EMOJIS[chatEmojiCategory];
  } else {
    displayEmojis = CHAT_EMOJIS;
  }

  return `
    <div class="emoji-picker-backdrop fixed inset-0 z-40 bg-black/60 backdrop-blur-xs sm:hidden" data-action="${targetType === 'dm' ? 'toggle-dm-emoji' : 'toggle-relay-emoji'}"></div>
    <div class="emoji-picker-container fixed sm:absolute inset-x-0 sm:inset-x-auto bottom-0 sm:bottom-full sm:mb-3 sm:left-2 z-50 p-3 bg-surface-base/98 border-t sm:border border-white/12 shadow-[0_24px_50px_rgba(0,0,0,0.65)] backdrop-blur-2xl w-full sm:w-[350px] sm:h-[390px] h-[52vh] max-h-[52vh] sm:max-h-[390px] select-none rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-2 duration-150">
      <div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2.5 sm:hidden shrink-0"></div>
      <div class="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-xs text-slate-400 shrink-0">
        <span class="font-bold text-white flex items-center gap-1.5">
          <span>😊</span>
          <span>Emojis</span>
        </span>
        <button type="button" data-action="${targetType === 'dm' ? 'toggle-dm-emoji' : 'toggle-relay-emoji'}" class="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer text-xs transition-colors" aria-label="Close emoji picker">✕</button>
      </div>

      <!-- Emoji search input -->
      <div class="relative mb-2 shrink-0">
        <input 
          type="text" 
          id="input-${targetType}-emoji-search"
          data-input="search-chat-emojis"
          value="${escapeHtml(chatEmojiSearchQuery)}"
          placeholder="Search emojis (e.g. smile, heart, fire)..."
          class="w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e59b3c)] font-sans transition-colors"
          autocomplete="off"
        />
        ${chatEmojiSearchQuery ? `
          <button type="button" data-action="clear-chat-emoji-search" class="absolute right-2.5 top-1.5 text-slate-400 hover:text-white text-xs cursor-pointer">✕</button>
        ` : ''}
      </div>

      <!-- Categories row -->
      <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5 text-sm shrink-0 px-0.5">
        ${categories.map(c => `
          <button
            type="button"
            data-action="select-chat-emoji-category"
            data-category="${c.key}"
            title="${c.label}"
            class="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${chatEmojiCategory === c.key ? 'bg-[var(--color-accent,#e59b3c)]/25 border border-[var(--color-accent,#e89e38)]/60 scale-110 shadow-xs text-white' : 'hover:bg-white/10 opacity-70 hover:opacity-100'}"
          >
            ${c.icon}
          </button>
        `).join('')}
      </div>

      <!-- Emoji Grid -->
      <div class="grid grid-cols-7 sm:grid-cols-8 gap-1.5 flex-1 min-h-0 overflow-y-auto pr-1 text-2xl sm:text-xl overscroll-contain">
        ${displayEmojis.length === 0 ? `
          <div class="col-span-full py-8 text-center text-slate-500 text-xs">No emojis found</div>
        ` : displayEmojis.map(e => `
          <button 
            type="button" 
            data-action="${targetType === 'dm' ? 'insert-dm-emoji' : 'insert-relay-emoji'}" 
            data-emoji="${e}"
            class="w-9 h-9 sm:w-8 sm:h-8 rounded-xl hover:bg-white/10 flex items-center justify-center transition-transform hover:scale-125 cursor-pointer active:scale-90"
          >
            ${e}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

export function renderComposerMenu(targetType: 'dm' | 'relay'): string {
  const isOpen = targetType === 'dm' ? isDMComposerMenuOpen : isRelayComposerMenuOpen;
  if (!isOpen) return '';

  return `
    <div class="composer-menu-backdrop fixed inset-0 z-30" data-action="close-composer-menu"></div>
    <div class="composer-menu-dropdown absolute bottom-full mb-2 left-0 z-40 w-56 p-2 rounded-2xl bg-surface-base border border-white/10 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none">
      <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 mb-1 border-b border-white/5">
        Add to conversation
      </div>
      <div class="space-y-0.5 text-xs">
        <button
          type="button"
          data-action="${targetType === 'dm' ? 'trigger-dm-attachment' : 'trigger-relay-attachment'}"
          class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-surface-raised text-slate-200 hover:text-white flex items-center space-x-2.5 transition-colors cursor-pointer group"
        >
          <span class="text-base group-hover:scale-110 transition-transform">📎</span>
          <div>
            <div class="font-semibold text-slate-100">Attach File</div>
            <div class="text-[10px] text-slate-400">${targetType === 'dm' ? 'Encrypted media (up to 128 KiB)' : 'Media or doc (up to 50 MB)'}</div>
          </div>
        </button>

        <button
          type="button"
          data-action="start-voice-note"
          data-target="${targetType}"
          class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-surface-raised text-slate-200 hover:text-white flex items-center space-x-2.5 transition-colors cursor-pointer group"
        >
          <span class="text-base group-hover:scale-110 transition-transform">🎙️</span>
          <div>
            <div class="font-semibold text-slate-100">Voice Note</div>
            <div class="text-[10px] text-slate-400">Record audio (Experimental · Max 30s)</div>
          </div>
        </button>

        <button
          type="button"
          data-action="toggle-outcome-picker"
          class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-surface-raised text-slate-200 hover:text-white flex items-center space-x-2.5 transition-colors cursor-pointer group"
        >
          <span class="text-base group-hover:scale-110 transition-transform">📋</span>
          <div>
            <div class="font-semibold text-slate-100">Structured Label</div>
            <div class="text-[10px] text-slate-400">Decision, question or task</div>
          </div>
        </button>

        <button
          type="button"
          data-action="open-capsule-creator"
          class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-surface-raised text-slate-200 hover:text-white flex items-center space-x-2.5 transition-colors cursor-pointer group"
        >
          <span class="text-base group-hover:scale-110 transition-transform">📦</span>
          <div>
            <div class="font-semibold text-slate-100">Context Capsule</div>
            <div class="text-[10px] text-slate-400">Curate notes & save to Vault</div>
          </div>
        </button>

        <button
          type="button"
          data-action="insert-code-snippet"
          data-target="${targetType}"
          class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-surface-raised text-slate-200 hover:text-white flex items-center space-x-2.5 transition-colors cursor-pointer group"
        >
          <span class="text-base group-hover:scale-110 transition-transform">💻</span>
          <div>
            <div class="font-semibold text-slate-100">Code Snippet</div>
            <div class="text-[10px] text-slate-400">Insert formatted code block</div>
          </div>
        </button>
      </div>
    </div>
  `;
}

export function renderStagedAttachmentChip(att: DirectMessageAttachment | null, targetType: 'dm' | 'relay'): string {
  if (!att) return '';
  const sizeStr = att.size < 1024 * 1024 ? `${(att.size / 1024).toFixed(1)} KB` : `${(att.size / (1024 * 1024)).toFixed(1)} MB`;

  return `
    <div class="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-xs font-mono max-w-md animate-in fade-in">
      <span class="shrink-0">📎</span>
      <span class="truncate font-bold">${escapeHtml(att.name)}</span>
      <span class="text-indigo-400 text-[10px] shrink-0">(${sizeStr})</span>
      <button 
        type="button" 
        data-action="${targetType === 'dm' ? 'clear-dm-attachment' : 'clear-relay-attachment'}" 
        class="ml-auto text-slate-400 hover:text-rose-400 font-bold p-1 cursor-pointer shrink-0"
        title="Remove attachment"
      >
        ✕
      </button>
    </div>
  `;
}

export function renderOutcomePopover(): string {
  if (!isOutcomePickerOpen) return '';

  return `
    <div class="absolute bottom-full mb-2 left-14 z-30 p-2.5 rounded-2xl bg-surface-base border border-white/10 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 w-64 select-none">
      <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/5 text-[10px] font-mono text-slate-400">
        <span class="font-bold text-white">Give your message context</span>
        <button type="button" data-action="toggle-outcome-picker" class="hover:text-white p-0.5 cursor-pointer">✕</button>
      </div>
      <div class="space-y-1 text-xs">
        <button type="button" data-action="insert-outcome-template" data-template="decision" class="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-surface-raised text-slate-200 hover:text-purple-300 flex items-center space-x-2 transition-colors cursor-pointer">
          <span>⚖️</span>
          <div>
            <div class="font-bold">Decision</div>
            <div class="text-[10px] text-slate-400">Write down a decision in your own words</div>
          </div>
        </button>
        <button type="button" data-action="insert-outcome-template" data-template="question" class="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-surface-raised text-slate-200 hover:text-cyan-300 flex items-center space-x-2 transition-colors cursor-pointer">
          <span>❓</span>
          <div>
            <div class="font-bold">Question</div>
            <div class="text-[10px] text-slate-400">Structured question requiring input</div>
          </div>
        </button>
      </div>
    </div>
  `;
}

export function renderCatchMeUpCard(messages: DirectMessage[], peerName: string): string {
  if (!isCatchMeUpOpen) return '';

  const count = messages.length;
  if (count === 0) {
    return `
      <div class="p-3.5 mb-3 rounded-2xl bg-surface-raised border border-white/5 text-xs text-slate-300 space-y-1.5 animate-in fade-in duration-150">
        <div class="flex items-center justify-between font-bold">
          <span class="flex items-center gap-1.5"><span class="text-[var(--color-accent,#e89e38)]">✨</span><span>Local Catch-Up Summary</span></span>
          <button type="button" data-action="toggle-catch-me-up" class="text-slate-400 hover:text-white p-0.5 cursor-pointer">✕</button>
        </div>
        <p class="text-slate-400">No recent messages to summarize in this conversation yet.</p>
      </div>
    `;
  }

  const recentMsgs = messages.slice(-10);
  const hasFiles = recentMsgs.some(m => !!m.attachment);
  const questions = recentMsgs.filter(m => m.plaintext.includes('?')).length;
  const outcomes = recentMsgs.filter(m => m.plaintext.includes('[DECISION]') || m.plaintext.includes('[TASK]') || m.plaintext.includes('[POLL]')).length;

  return `
    <div class="p-4 mb-4 rounded-2xl bg-surface-raised border border-white/10 text-xs space-y-2.5 animate-in fade-in duration-200">
      <div class="flex items-center justify-between border-b border-white/5 pb-2">
        <div class="flex items-center space-x-2">
          <span class="text-base text-[var(--color-accent,#e89e38)]">✨</span>
          <span class="font-bold text-white tracking-wide">Recent context</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Client-Side Private</span>
        </div>
        <button type="button" data-action="toggle-catch-me-up" class="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer text-xs" title="Dismiss summary">✕</button>
      </div>
      <div class="space-y-1 text-slate-300 leading-relaxed">
        <p>You have <b>${recentMsgs.length}</b> recent messages with <b>${escapeHtml(peerName)}</b>.</p>
        <ul class="list-disc list-inside space-y-1 text-slate-400 text-[11px] pt-1">
          ${questions > 0 ? `<li>${questions} messages contain questions. Replies may already answer them.</li>` : ''}
          ${hasFiles ? `<li>Encrypted files and attachments shared in this channel.</li>` : ''}
          ${outcomes > 0 ? `<li>${outcomes} messages were labelled by their authors.</li>` : ''}
          <li>Latest message: "${escapeHtml(recentMsgs[recentMsgs.length - 1].plaintext.slice(0, 70))}${recentMsgs[recentMsgs.length - 1].plaintext.length > 70 ? '...' : ''}"</li>
        </ul>
      </div>
    </div>
  `;
}

export function renderOutcomeCard(plaintext: string): string {
  if (plaintext.startsWith('[DECISION]')) {
    const title = plaintext.replace(/^\[DECISION\]\s*/, '').trim();
    return `
      <div class="p-3 rounded-xl bg-surface-raised border border-white/10 space-y-1.5 my-1 text-xs">
        <div class="flex items-center justify-between font-mono text-[10px]">
          <span class="px-2 py-0.5 rounded bg-[var(--color-accent,#e89e38)]/15 text-[var(--color-accent,#e89e38)] font-bold uppercase flex items-center gap-1">⚖️ Decision Outcome</span>
        </div>
        <div class="text-slate-200 font-semibold">${escapeHtml(title)}</div>
        <div class="text-[10px] text-slate-400">Decision recorded by the message author.</div>
      </div>
    `;
  }
  if (plaintext.startsWith('[TASK]')) {
    const title = plaintext.replace(/^\[TASK\]\s*/, '').trim();
    return `
      <div class="p-3 rounded-xl bg-surface-raised border border-white/10 space-y-1.5 my-1 text-xs">
        <div class="flex items-center justify-between font-mono text-[10px]">
          <span class="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold uppercase flex items-center gap-1">📌 Actionable Task</span>
        </div>
        <div class="text-slate-200 font-semibold flex items-center gap-2">
          <span>${escapeHtml(title)}</span>
        </div>
      </div>
    `;
  }
  if (plaintext.startsWith('[QUESTION]')) {
    const title = plaintext.replace(/^\[QUESTION\]\s*/, '').trim();
    return `
      <div class="p-3 rounded-xl bg-surface-raised border border-white/10 space-y-1.5 my-1 text-xs">
        <div class="flex items-center justify-between font-mono text-[10px]">
          <span class="px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 font-bold uppercase flex items-center gap-1">❓ Structured Question</span>
          <span class="text-sky-400 font-bold">OPEN FOR INPUT</span>
        </div>
        <div class="text-slate-200 font-semibold">${escapeHtml(title)}</div>
      </div>
    `;
  }
  if (plaintext.startsWith('[POLL]')) {
    const title = plaintext.replace(/^\[POLL\]\s*/, '').trim();
    return `
      <div class="p-3 rounded-xl bg-indigo-950/50 border border-indigo-500/30 space-y-2 my-1 text-xs">
        <div class="flex items-center justify-between font-mono text-[10px]">
          <span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase flex items-center gap-1">📊 Chat Poll</span>
          <span class="text-slate-400">Text proposal</span>
        </div>
        <div class="text-slate-200 font-semibold">${escapeHtml(title)}</div>
        <p class="text-slate-400">Reply to this proposal to share your view.</p>
      </div>
    `;
  }
  return '';
}

export async function handleFileAttachment(file: File, targetType: 'dm' | 'relay'): Promise<void> {
  const MAX_SIZE = targetType === 'dm' ? MAX_PRIVATE_ATTACHMENT_BYTES : 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    clientStore.showToast(`File "${file.name}" exceeds the ${targetType === 'dm' ? '128 KiB private-message' : '50 MB'} limit.`, 'warning');
    return;
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const attachment: DirectMessageAttachment = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      dataUrl,
    };

    if (targetType === 'dm') {
      sovereignDM.setPendingAttachment(attachment);
    } else {
      clientStore.pendingRelayAttachment = attachment;
      clientStore.notifySync();
    }
    clientStore.showToast(`Attached: ${file.name}`, 'info');
  } catch (err: any) {
    clientStore.showToast(`Failed to attach file: ${err.message || err}`, 'warning');
  }
}

export function attachChatDropzoneListeners(): void {
  if (typeof document === 'undefined') return;

  const dmContainer = document.getElementById('dm-thread-messages');
  if (dmContainer && !(dmContainer as any).__dropzoneBound) {
    (dmContainer as any).__dropzoneBound = true;
    dmContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      dmContainer.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-950/20');
    });
    dmContainer.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dmContainer.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-950/20');
    });
    dmContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      dmContainer.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-950/20');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileAttachment(e.dataTransfer.files[0], 'dm');
      }
    });
  }

  const relayContainer = document.getElementById('messages-container');
  if (relayContainer && !(relayContainer as any).__dropzoneBound) {
    (relayContainer as any).__dropzoneBound = true;
    relayContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      relayContainer.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-950/20');
    });
    relayContainer.addEventListener('dragleave', (e) => {
      e.preventDefault();
      relayContainer.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-950/20');
    });
    relayContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      relayContainer.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-950/20');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileAttachment(e.dataTransfer.files[0], 'relay');
      }
    });
  }
}

function isSameSenderWithin5Min(
  curr: { authorFingerprint: string; createdAt: number },
  prev?: { authorFingerprint: string; createdAt: number }
): boolean {
  if (!prev) return false;
  if (curr.authorFingerprint !== prev.authorFingerprint) return false;
  return Math.abs(curr.createdAt - prev.createdAt) < 5 * 60 * 1000;
}

export interface DMCluster {
  senderFP: string;
  isMine: boolean;
  isSystem: boolean;
  messages: DirectMessage[];
}

export interface DMScene {
  dateSepText?: string;
  clusters: DMCluster[];
}

export function groupDirectMessagesIntoScenes(msgs: DirectMessage[], myFP: string): DMScene[] {
  const scenes: DMScene[] = [];
  let currentScene: DMScene | null = null;
  let currentCluster: DMCluster | null = null;
  let lastTimestamp = 0;

  for (let i = 0; i < msgs.length; i++) {
    const msg = msgs[i];
    const isNewDay = i === 0 || !isSameCalendarDay(msg.timestamp, msgs[i - 1].timestamp);
    const isTemporalGap = i > 0 && Math.abs(msg.timestamp - lastTimestamp) > 15 * 60 * 1000;
    const isSystem = msg.senderFP === 'genesis-core' || (msg as any).isSystem;
    const isMine =
      msg.senderFP === myFP ||
      msg.senderFP === 'me_local_node_0x9f4e' ||
      (typeof window !== 'undefined' && Boolean((window as any).clientStore?.keypair?.fingerprint) && msg.senderFP === (window as any).clientStore?.keypair?.fingerprint);

    if (!currentScene || isNewDay || isTemporalGap) {
      currentScene = {
        dateSepText: isNewDay ? formatDateSeparator(msg.timestamp) : undefined,
        clusters: [],
      };
      scenes.push(currentScene);
      currentCluster = null;
    }

    const canGroupInCluster =
      currentCluster &&
      !isSystem &&
      !currentCluster.isSystem &&
      currentCluster.senderFP === msg.senderFP &&
      Math.abs(msg.timestamp - lastTimestamp) < 5 * 60 * 1000;

    if (canGroupInCluster && currentCluster) {
      currentCluster.messages.push(msg);
    } else {
      currentCluster = {
        senderFP: msg.senderFP,
        isMine,
        isSystem: Boolean(isSystem),
        messages: [msg],
      };
      currentScene.clusters.push(currentCluster);
    }

    lastTimestamp = msg.timestamp;
  }

  return scenes;
}

export function renderMessageItem(m: ClientMessage, prevMsg?: ClientMessage): string {
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const author = resolveHumanDisplayName(m.authorFingerprint, m.isMine);
  const isGrouped = isSameSenderWithin5Min(m, prevMsg);
  const showDateSep = !prevMsg || !isSameCalendarDay(m.createdAt, prevMsg.createdAt);
  const dateSepHtml = showDateSep ? `
    <div class="scene-date-separator chat-date-chip-wrapper flex justify-center my-3 select-none" role="separator">
      <span class="chat-date-pill px-3.5 py-1 rounded-full bg-surface-raised/90 border border-white/10 text-[11px] font-semibold text-slate-300 shadow-xs backdrop-blur-sm">${formatDateSeparator(m.createdAt)}</span>
    </div>
  ` : '';

  if (m.authorFingerprint === 'genesis-core' || (m as any).isSystem) {
    return `
      ${dateSepHtml}
      <div class="weave-system-event journal-dialogue-context journal-dialogue-message journal-dialogue-context--system flex items-center justify-center my-2 select-none px-4" data-message-id="${escapeAttr(m.id)}" role="status">
        <div class="text-[12px] text-slate-400 flex items-center space-x-2 text-center max-w-lg">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          <span class="leading-relaxed select-text">${processChatMessageContent(m.text || '')}</span>
          <span class="text-[10px] text-slate-500 font-mono">${time}</span>
        </div>
      </div>
    `;
  }

  const avatarInitials = author.name === 'Profile not set up' ? '?' : author.name.substring(0, 2).toUpperCase();
  const capsule = m.text ? parseCapsuleFromText(m.text) : null;

  if (isGrouped) {
    return `
      ${dateSepHtml}
      <div class="message-row message-row--subsequent group/msg-row relative relay-message journal-dialogue-message ${m.isMine ? 'relay-message--own journal-dialogue-message--outgoing' : 'journal-dialogue-message--incoming'} py-0.5 max-w-full overflow-visible transition-colors" data-message-id="${escapeAttr(m.id)}" data-author-fp="${escapeAttr(m.authorFingerprint)}" data-author-profile="${escapeAttr(m.authorFingerprint)}">
        <div class="weave-spine ${m.isMine ? 'is-mine' : ''} ${m.isMine ? 'pl-2' : 'pl-9 sm:pl-10'} pr-3 py-0.5 space-y-1">
          <div class="message-body text-[14px] sm:text-[15px] text-slate-100 select-text leading-[1.55] break-words [overflow-wrap:anywhere] min-w-0">
            ${capsule ? renderCapsuleArtifact(capsule) : (m.text ? `<div class="whitespace-pre-wrap">${processChatMessageContent(m.text)}</div>` : '')}
            ${renderAttachmentCard(m.attachment)}
          </div>
        </div>
        <span class="message-timestamp-hover absolute right-3 top-1 text-[10px] text-slate-500 font-mono opacity-0 group-hover/msg-row:opacity-100 transition-opacity select-none">${time}</span>
        <div class="message-actions-bar opacity-0 group-hover/msg-row:opacity-100 focus-within:opacity-100 transition-all duration-150 flex items-center space-x-0.5 absolute -top-4.5 right-3 bg-slate-900/95 border border-white/15 rounded-full px-2 py-0.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl z-30 pointer-events-none group-hover/msg-row:pointer-events-auto">
          <button type="button" class="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center text-xs transition-transform hover:scale-130 active:scale-90 cursor-pointer" title="React ❤️" data-action="toggle-relay-emoji">❤️</button>
          <button type="button" class="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center text-xs transition-transform hover:scale-130 active:scale-90 cursor-pointer" title="React 👍" data-action="toggle-relay-emoji">👍</button>
          <button type="button" class="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center text-xs transition-transform hover:scale-130 active:scale-90 cursor-pointer" title="React 🔥" data-action="toggle-relay-emoji">🔥</button>
          <div class="w-px h-3.5 bg-white/15 mx-1"></div>
          <button type="button" class="p-1.5 rounded-full hover:bg-white/15 text-xs text-slate-300 hover:text-white transition-all cursor-pointer" title="Reply" data-action="reply-relay-message" data-message-id="${escapeHtml(m.id)}">↩</button>
          <button type="button" class="p-1.5 rounded-full hover:bg-white/15 text-xs text-slate-300 hover:text-white transition-all cursor-pointer" title="Add to Context Capsule" data-action="add-to-capsule" data-message-id="${escapeHtml(m.id)}" data-sender-name="${escapeAttr(author.name)}" data-sender-handle="${escapeAttr(author.handle)}" data-text="${escapeAttr(m.text || '')}" data-timestamp="${m.createdAt}">📦</button>
          <button type="button" class="p-1.5 rounded-full hover:bg-white/15 text-xs ${canonicalVault.isMessageSaved(m.id) ? 'text-[var(--color-accent,#e89e38)] font-bold' : 'text-slate-300 hover:text-white'} transition-all cursor-pointer" title="${canonicalVault.isMessageSaved(m.id) ? 'Remove from Vault' : 'Save to Vault'}" data-action="${canonicalVault.isMessageSaved(m.id) ? 'unsave-message-vault' : 'keep-live-message'}" data-message-id="${escapeHtml(m.id)}">${canonicalVault.isMessageSaved(m.id) ? '💾' : '🔒'}</button>
          <button type="button" class="p-1.5 rounded-full hover:bg-white/15 text-xs text-slate-300 hover:text-white transition-all cursor-pointer" title="Copy text" data-action="copy-message-text" data-text="${escapeAttr(m.text || '')}">📋</button>
        </div>
      </div>
    `;
  }

  return `
    ${dateSepHtml}
    <div class="message-row group/msg-row relative relay-message journal-dialogue-message ${m.isMine ? 'relay-message--own journal-dialogue-message--outgoing' : 'journal-dialogue-message--incoming'} mt-2 max-w-full overflow-visible transition-colors" data-message-id="${escapeAttr(m.id)}" data-author-fp="${escapeAttr(m.authorFingerprint)}" data-author-profile="${escapeAttr(m.authorFingerprint)}">
      <div class="stanza-header flex items-center gap-2 mb-1 px-1 select-none">
        ${!m.isMine ? `
          <div class="dialogue-identity-mark w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border border-white/10 shadow-xs">
            ${avatarInitials}
          </div>
          <div class="flex items-baseline gap-2 min-w-0 flex-wrap">
            <span class="text-[13px] sm:text-[14px] font-semibold text-slate-100">${escapeHtml(author.name)}</span>
            ${author.handle ? `<span class="text-[11px] text-slate-400 font-mono">${escapeHtml(author.handle)}</span>` : ''}
          </div>
          <span class="text-[11px] text-slate-500 font-mono ml-auto sm:ml-0">${time}</span>
        ` : `
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--color-accent,#e89e38)]"></span>
            <span class="text-[12px] sm:text-[13px] font-semibold text-[var(--color-accent,#e89e38)]">You</span>
            <span class="text-slate-600 font-mono text-[10px]">·</span>
            <span class="text-[11px] text-slate-500 font-mono">${time}</span>
          </div>
        `}
      </div>
      <div class="weave-spine ${m.isMine ? 'is-mine' : ''} ${m.isMine ? 'pl-2' : 'pl-9 sm:pl-10'} pr-3 py-0.5 space-y-1">
        <div class="message-body text-[14px] sm:text-[15px] text-slate-100 select-text leading-[1.55] break-words [overflow-wrap:anywhere] min-w-0">
          ${capsule ? renderCapsuleArtifact(capsule) : (m.text ? `<div class="whitespace-pre-wrap">${processChatMessageContent(m.text)}</div>` : '')}
          ${renderAttachmentCard(m.attachment)}
        </div>
      </div>
      <div class="message-actions-bar opacity-0 group-hover/msg-row:opacity-100 focus-within:opacity-100 transition-all duration-150 flex items-center space-x-0.5 absolute -top-4.5 right-3 bg-slate-900/95 border border-white/15 rounded-full px-2 py-0.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl z-30 pointer-events-none group-hover/msg-row:pointer-events-auto">
        <button type="button" class="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center text-xs transition-transform hover:scale-130 active:scale-90 cursor-pointer" title="React ❤️" data-action="toggle-relay-emoji">❤️</button>
        <button type="button" class="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center text-xs transition-transform hover:scale-130 active:scale-90 cursor-pointer" title="React 👍" data-action="toggle-relay-emoji">👍</button>
        <button type="button" class="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center text-xs transition-transform hover:scale-130 active:scale-90 cursor-pointer" title="React 🔥" data-action="toggle-relay-emoji">🔥</button>
        <div class="w-px h-3.5 bg-white/15 mx-1"></div>
        <button type="button" class="p-1.5 rounded-full hover:bg-white/15 text-xs text-slate-300 hover:text-white transition-all cursor-pointer" title="Reply" data-action="reply-relay-message" data-message-id="${escapeHtml(m.id)}">↩</button>
        <button type="button" class="p-1.5 rounded-full hover:bg-white/15 text-xs text-slate-300 hover:text-white transition-all cursor-pointer" title="Add to Context Capsule" data-action="add-to-capsule" data-message-id="${escapeHtml(m.id)}" data-sender-name="${escapeAttr(author.name)}" data-sender-handle="${escapeAttr(author.handle)}" data-text="${escapeAttr(m.text || '')}" data-timestamp="${m.createdAt}">📦</button>
        <button type="button" class="p-1.5 rounded-full hover:bg-white/15 text-xs ${canonicalVault.isMessageSaved(m.id) ? 'text-[var(--color-accent,#e89e38)] font-bold' : 'text-slate-300 hover:text-white'} transition-all cursor-pointer" title="${canonicalVault.isMessageSaved(m.id) ? 'Remove from Vault' : 'Save to Vault'}" data-action="${canonicalVault.isMessageSaved(m.id) ? 'unsave-message-vault' : 'keep-live-message'}" data-message-id="${escapeHtml(m.id)}">${canonicalVault.isMessageSaved(m.id) ? '💾' : '🔒'}</button>
        <button type="button" class="p-1.5 rounded-full hover:bg-white/15 text-xs text-slate-300 hover:text-white transition-all cursor-pointer" title="Copy text" data-action="copy-message-text" data-text="${escapeAttr(m.text || '')}">📋</button>
      </div>
    </div>
  `;
}

/**
 * Renders Top Navigation Switcher between Sovereign Relays (channels) and Direct Messages (E2EE 1-on-1).
 */
export function renderMessagesTabHeader(): string {
  const currentTab = getActiveMessagesTab();
  const totalUnread = sovereignDM.getTotalUnreadCount();
  const isMobileThreadActive = currentTab === 'dm' && Boolean(sovereignDM.activePeerFP);

  return `
    <div class="messages-header journal-dialogue-header h-14 border-b border-white/5 bg-surface-base/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 ${isMobileThreadActive ? 'hidden md:flex' : ''}">
      <h1 class="sr-only">Messages</h1>
      <div class="flex items-center space-x-1.5 p-1 bg-surface-raised/60 rounded-2xl border border-white/5" role="group" aria-label="Message type">
        <button 
          type="button" 
          data-action="switch-messages-tab" 
          data-tab="relays"
          aria-pressed="${currentTab === 'relays'}"
          class="px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            currentTab === 'relays'
              ? 'bg-[var(--color-accent,#e89e38)] text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-surface-raised/80'
          }"
        >
          <span class="font-bold text-sm">#</span>
          <span>Communities</span>
        </button>
        <button 
          type="button" 
          data-action="switch-messages-tab" 
          data-tab="dm"
          aria-pressed="${currentTab === 'dm'}"
          class="px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            currentTab === 'dm'
              ? 'bg-[var(--color-accent,#e89e38)] text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-surface-raised/80'
          }"
        >
          <span>💬</span>
          <span>Direct Messages</span>
          ${
            totalUnread > 0
              ? `<span class="px-1.5 py-0.2 bg-crimson text-white rounded-full text-[10px] font-bold animate-pulse">${totalUnread}</span>`
              : ''
          }
        </button>
      </div>
      <div class="hidden sm:flex items-center space-x-3 text-[11px] font-sans text-slate-400">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-raised/60 border border-white/5 text-[11px] text-slate-300">
          <span class="w-2 h-2 rounded-full ${currentTab === 'dm' ? 'bg-emerald-400 ring-2 ring-emerald-400/20' : 'bg-amber-400 ring-2 ring-amber-400/20'}"></span>
          <span>${currentTab === 'dm' ? '🔒 MLS TreeKEM v2.4 (E2EE)' : '🌐 Sovereign Channels'}</span>
        </span>
      </div>
    </div>
  `;
}

/**
 * Renders modal for initiating a new direct message conversation.
 */
export function renderNewDMModal(): string {
  if (!isNewDMPickerOpen) return '';

  const humanRole = (role: string): string => {
    switch (role) {
      case 'GUARDIAN': return 'Team';
      case 'ARCHIVIST': return 'Contributor';
      case 'MODERATOR': return 'Moderator';
      case 'SENTINEL': return 'Moderator';
      default: return 'Member';
    }
  };

  const knownPeers = clientStore.members.filter((member: { fingerprint: string }) => member.fingerprint !== clientStore.keypair.fingerprint)
    .map((member: { fingerprint: string; role: string; alias?: string; name?: string; handle?: string }) => ({
      fp: member.fingerprint,
      role: member.role,
      displayName: member.alias || member.name || member.handle || 'Anonymous',
      handle: member.handle || member.alias || '',
    }));

  return `
    <div id="new-dm-modal-backdrop" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" data-action="close-new-dm">
      <div class="bg-surface-base border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" data-action="stop-propagation">
        <div class="p-4 border-b border-white/5 flex items-center justify-between bg-surface-raised/50">
          <div class="flex items-center space-x-2">
            <span class="text-lg">💬</span>
            <h3 class="text-sm font-bold text-white">Start a conversation</h3>
          </div>
          <button type="button" data-action="close-new-dm" class="text-slate-400 hover:text-white p-1 rounded-lg text-xs cursor-pointer">✕</button>
        </div>

        <div class="p-4 space-y-4">
          <div>
              <label for="input-new-dm-peer" class="block text-[11px] text-slate-400 font-semibold mb-1.5">Search by name or @handle</label>
            <div class="flex space-x-2">
              <input 
                type="text" 
                id="input-new-dm-peer" 
                placeholder="@username" 
                class="flex-1 bg-surface-raised border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e59b3c)]"
              />
              <button 
                type="button" 
                data-action="submit-new-dm-peer" 
                class="px-4 py-2 bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Chat
              </button>
            </div>
          </div>

          <div>
            <label class="block text-[11px] text-slate-400 font-semibold mb-2">Suggested people</label>
            <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              ${knownPeers.map((p: { fp: string; role: string; displayName: string; handle: string }) => `
                <div 
                  data-action="start-dm-with-peer" 
                  data-peer="${p.fp}" 
                  data-role="${p.role}"
                  class="p-2.5 rounded-xl bg-surface-raised/60 hover:bg-surface-raised border border-white/5 hover:border-indigo-500/30 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div class="flex items-center space-x-2.5">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-tr ${generateDeterministicGradient(p.fp)} flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                      ${p.displayName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div class="text-xs font-semibold text-white group-hover:text-cyphr transition-colors">${escapeHtml(p.displayName)}</div>
                      ${p.handle ? `<div class="text-[10px] text-slate-500">@${escapeHtml(p.handle)}</div>` : ''}
                    </div>
                  </div>
                  <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                    p.role === 'GUARDIAN' ? 'bg-amber/15 text-amber border-amber/30' :
                    p.role === 'ARCHIVIST' ? 'bg-cyphr/15 text-cyphr border-cyphr/30' :
                    'bg-slate-800 text-slate-300 border-white/10'
                  }">
                    ${escapeHtml(humanRole(p.role))}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="p-3 bg-surface-raised/30 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span class="flex items-center space-x-1.5"><span>🔒</span><span>End-to-end encrypted</span></span>
          <button type="button" data-action="close-new-dm" class="hover:text-white transition-colors cursor-pointer">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders full Direct Messages Workspace with conversations list, active thread, safety status, and composer.
 */
export function renderDirectMessagesWorkspace(): string {
  const allConversations = sovereignDM.getAllConversations();
  const activePeerFP = sovereignDM.activePeerFP;
  const myFP = clientStore.keypair?.fingerprint || 'me_local_node_0x9f4e';

  const activeConv = activePeerFP ? sovereignDM.getConversation(activePeerFP) : null;
  const allMessages: DirectMessage[] = activeConv?.messages || [];
  const branchId = sovereignDM.getActiveBranch();
  const branch = activePeerFP ? sovereignDM.getBranches(activePeerFP).find(item => item.id === branchId) : undefined;
  const source = branch ? allMessages.find(message => message.id === branch.sourceMessageId) : undefined;
  const reply = allMessages.find(message => message.id === sovereignDM.replyToId);
  const messages = allMessages.filter(message => !message.context?.reaction && branchOf(message) === branchId);

  const matchesQuery = compileContextQuery(dmSearchQuery);
  const baseConversations = allConversations.filter(c => {
    if (dmFilterGroup === 'unread') {
      return c.unreadCount > 0;
    }
    if (dmFilterGroup === 'direct') {
      return c.peerFingerprint !== 'genesis-core' && !c.peerFingerprint.startsWith('relay-');
    }
    return true;
  });
  const filteredConversations = baseConversations.filter(c => {
    if (!dmSearchQuery.trim()) return true;
    const member = clientStore.members?.find(member => member.fingerprint === c.peerFingerprint);
    const humanInfo = resolveHumanDisplayName(c.peerFingerprint);
    const identity = [c.peerFingerprint, c.peerRole, member?.alias, member?.name, member?.handle, humanInfo.name, humanInfo.handle].filter(Boolean).join(' ');
    const messages = c.messages.filter(message => !message.context?.reaction);
    return messages.length ? messages.some(message => matchesQuery({ text: `${identity}\n${message.plaintext}`, author: message.senderFP, createdAt: message.timestamp, kind: 'message' })) : matchesQuery({ text: identity });
  });
  const matchingMessages = dmSearchQuery.trim() ? allConversations.flatMap(conversation => conversation.messages
    .filter(message => !message.context?.reaction && matchesQuery({ text: message.plaintext, author: message.senderFP, createdAt: message.timestamp, kind: 'message' }))
    .map(message => ({ peer: conversation.peerFingerprint, message }))).sort((a, b) => b.message.timestamp - a.message.timestamp).slice(0, 20) : [];

  const resolvePeerName = (fp: string): string => {
    const info = resolveHumanDisplayName(fp);
    return info.name;
  };

  const humanPeerRole = (role: string): string => {
    switch (role) {
      case 'GUARDIAN': return 'Team';
      case 'ARCHIVIST': return 'Contributor';
      case 'MODERATOR': return 'Moderator';
      case 'SENTINEL': return 'Moderator';
      default: return 'Member';
    }
  };

  return `
    <div class="direct-messages-workspace journal-dialogue-workspace ${activeConv ? 'has-active-conversation' : ''} flex-1 flex overflow-hidden bg-canvas">
      <!-- 1. LEFT SIDEBAR: PEER CONVERSATIONS LIST -->
      <aside class="conversation-list w-80 border-subtle-r bg-surface-base/80 flex flex-col shrink-0 overflow-hidden">
        <!-- SEARCH & NEW CHAT BAR -->
        <div class="p-3 border-b border-white/5 space-y-2.5">
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <span>💬</span>
              <span>Direct Messages</span>
            </h2>
            <button 
              type="button" 
              data-action="new-dm-conversation"
              class="px-3 py-1 bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
              title="Start a new private conversation"
            >
              <span>+</span>
              <span>New Chat</span>
            </button>
          </div>
          <div class="relative">
            <input 
              type="text" 
              id="input-dm-search" 
              placeholder="Search people or message text" aria-label="Search private conversations" aria-describedby="dm-search-help"
              value="${escapeHtml(dmSearchQuery)}"
              data-input="search-dm-peers"
              class="w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e59b3c)] transition-all font-sans"
            />
          </div>
          <!-- Filter pills -->
          <div class="flex items-center gap-1.5 p-1 bg-surface-raised/40 rounded-xl border border-white/5" role="tablist" aria-label="Conversation filters">
            <button type="button" data-action="set-dm-filter" data-group="all" class="flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-center ${dmFilterGroup === 'all' || dmFilterGroup === 'direct' ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white hover:bg-surface-raised'}">All</button>
            <button type="button" data-action="set-dm-filter" data-group="unread" class="flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-center ${dmFilterGroup === 'unread' ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white hover:bg-surface-raised'}">Unread</button>
          </div>
          <p id="dm-search-help" class="context-help">On this device only. Use &quot;exact phrase&quot; or -exclude.</p>
        </div>

        <!-- CONVERSATIONS LIST -->
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          ${filteredConversations.length === 0 ? `
            <div class="p-6 text-center text-slate-500 text-xs space-y-2">
              <p>${dmSearchQuery.trim() ? 'No matching conversations. Try another phrase.' : 'No conversations yet.'}</p>
              <button 
                type="button" 
                data-action="new-dm-conversation"
                class="text-[var(--color-accent,#e59b3c)] hover:underline font-semibold cursor-pointer"
              >
                Start a direct message
              </button>
            </div>
          ` : filteredConversations.map(conv => {
            const isSelected = activePeerFP === conv.peerFingerprint;
            const lastMsg = conv.messages.filter(message => !message.context?.reaction).at(-1);
            const isLastMsgMine =
              lastMsg?.senderFP === myFP ||
              lastMsg?.senderFP === 'me_local_node_0x9f4e' ||
              (typeof window !== 'undefined' && Boolean((window as any).clientStore?.keypair?.fingerprint) && lastMsg?.senderFP === (window as any).clientStore?.keypair?.fingerprint);
            const snippet = lastMsg ? lastMsg.plaintext : 'No messages yet';
            const peerInfo = resolveHumanDisplayName(conv.peerFingerprint);
            const avatarInitials = peerInfo.name === 'Profile not set up' ? '?' : peerInfo.name.substring(0, 2).toUpperCase();
            const avatarBg = 'dialogue-identity-mark';

            return `
              <div class="relative group/conv flex items-center">
                <button type="button"
                  data-action="select-dm-peer" 
                  data-peer="${conv.peerFingerprint}"
                  class="w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex items-center space-x-3 border ${
                    isSelected 
                      ? 'bg-surface-raised border-[var(--color-accent,#e59b3c)]/40 shadow-sm' 
                      : 'bg-transparent hover:bg-surface-raised/50 border-transparent'
                  }"
                >
                  <!-- Avatar with Online Presence Dot -->
                  <div class="relative shrink-0">
                    <div class="w-10 h-10 rounded-2xl ${avatarBg} flex items-center justify-center font-bold text-xs shadow-sm border border-white/10">
                      ${avatarInitials}
                    </div>
                    <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-surface-base ring-1 ring-emerald-500/40" title="Active now"></span>
                  </div>

                  <!-- Text details -->
                  <div class="flex-1 min-w-0 pr-6">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-slate-200 truncate">${escapeHtml(peerInfo.name)}</span>
                      <span class="text-[10px] text-slate-500 shrink-0 font-mono">${formatRelative(conv.lastMessageAt)}</span>
                    </div>
                    <div class="flex items-center justify-between mt-0.5">
                      <p class="text-[11px] text-slate-400 truncate pr-2 flex items-center">
                        ${isLastMsgMine ? `<span class="mr-1 text-[10px] font-mono leading-none ${lastMsg?.isPeerRead ? 'text-[#00e5ff] font-bold' : 'text-slate-400'}" title="${lastMsg?.isPeerRead ? 'Read' : 'Delivered'}">${lastMsg?.isPeerRead ? '✓✓' : (lastMsg?.deliveryStatus === 'sent' ? '✓' : '✓✓')}</span>` : ''}
                        <span>${escapeHtml(snippet)}</span>
                      </p>
                      ${conv.unreadCount > 0 ? `
                        <span class="px-2 py-0.5 bg-[var(--color-accent,#e59b3c)] text-slate-950 rounded-full text-[10px] font-bold shrink-0 shadow-xs">
                          ${conv.unreadCount}
                        </span>
                      ` : ''}
                    </div>
                  </div>
                </button>
                <button 
                  type="button" 
                  data-action="delete-dm-conversation" 
                  data-peer="${conv.peerFingerprint}" 
                  class="absolute right-2 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover/conv:opacity-100 transition-all cursor-pointer" 
                  title="Delete conversation"
                >
                  ${renderIcon('trash', { size: 14 })}
                </button>
              </div>
            `;
          }).join('')}
          ${matchingMessages.length ? `<section class="context-search-results" aria-label="Matching private messages"><h3>Matching messages · up to 20</h3>${matchingMessages.map(({ peer, message }) => `<button type="button" class="context-search-result" data-action="open-message-context" data-peer="${escapeHtml(peer)}" data-message-id="${escapeHtml(message.id)}"><strong>${escapeHtml(resolvePeerName(peer))}</strong><span>${escapeHtml(message.plaintext.slice(0, 160) || 'Attachment')}</span><small>${escapeHtml(new Date(message.timestamp).toLocaleDateString())} · ${branchOf(message) === 'main' ? 'Conversation' : 'Branch'}</small></button>`).join('')}</section>` : ''}
        </div>
      </aside>


      <!-- 2. RIGHT CHAT THREAD AREA -->
      <main class="conversation-pane flex-1 flex flex-col overflow-hidden bg-canvas ${activeConv ? 'messages-thread-active' : ''}">
        ${!activeConv ? `
          <div class="dialogue-empty flex-1 flex flex-col justify-center p-8 md:p-14 select-none">
            <span class="dialogue-eyebrow">◈ &nbsp; DIRECT</span>
            <h3 class="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-2">Private conversations</h3>
            <p class="text-sm md:text-base text-slate-400 max-w-sm leading-relaxed mb-6">A quieter place for conversations that matter.</p>
            <button 
              type="button" 
              data-action="new-dm-conversation"
              class="px-5 py-2.5 bg-[var(--color-accent,#e89e38)] hover:brightness-105 text-slate-950 text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <span>+</span>
              <span>New message</span>
            </button>
            <div class="mt-8 flex items-center gap-2 text-xs text-slate-500">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400/80"></span>
              <span>Private · End-to-end encrypted</span>
            </div>
          </div>
        ` : `
          <!-- ACTIVE THREAD HEADER -->
          <div class="h-16 px-4 md:px-6 border-b border-white/5 bg-surface-base/80 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
            <div class="flex items-center space-x-3 min-w-0">
              <button type="button" data-action="dm-back" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-raised cursor-pointer md:hidden" aria-label="Back to conversations">
                ${renderIcon('chevronRight', { size: 18, className: 'rotate-180' })}
              </button>
              <div class="relative shrink-0">
                <div class="dialogue-identity-mark w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shadow-sm border border-white/10">
                  ${resolveHumanDisplayName(activeConv.peerFingerprint).name === 'Profile not set up' ? '?' : resolveHumanDisplayName(activeConv.peerFingerprint).name.substring(0, 2).toUpperCase()}
                </div>
                <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-surface-base ring-1 ring-emerald-500/40" title="Active now"></span>
              </div>
              <div class="min-w-0">
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-bold text-white truncate">${escapeHtml(resolveHumanDisplayName(activeConv.peerFingerprint).name)}</span>
                  <span class="text-[11px] text-slate-400 font-mono hidden sm:inline">${escapeHtml(resolveHumanDisplayName(activeConv.peerFingerprint).handle)}</span>
                  ${activeConv.peerRole === 'GUARDIAN' || activeConv.peerRole === 'ARCHIVIST' ? `
                    <span class="text-[9px] px-2 py-0.5 rounded-full border ${
                      activeConv.peerRole === 'GUARDIAN' ? 'bg-amber/15 text-amber border-amber/30' :
                      'bg-cyphr/15 text-cyphr border-cyphr/30'
                    }">
                      ${escapeHtml(humanPeerRole(activeConv.peerRole))}
                    </span>
                  ` : ''}
                  ${sovereignDM.isPeerBlocked(activeConv.peerFingerprint) ? `
                    <span class="text-[9px] px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/40 font-bold">Blocked</span>
                  ` : ''}
                </div>
                <div class="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-400">
                  ${sovereignDM.isPeerTyping(activeConv.peerFingerprint) ? `
                    <span class="flex items-center space-x-1.5 text-[var(--color-accent,#e89e38)] font-semibold animate-pulse">
                      <span class="typing-dot !w-1.5 !h-1.5"></span>
                      <span class="typing-dot !w-1.5 !h-1.5"></span>
                      <span class="typing-dot !w-1.5 !h-1.5"></span>
                      <span>typing...</span>
                    </span>
                  ` : `
                    <button type="button" data-action="open-dm-safety" class="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer transition-colors" title="View conversation security">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20 shrink-0"></span>
                      <span class="hidden lg:inline">Active now · MLS Quantum-Ratcheted (E2EE)</span>
                      <span class="lg:hidden">Active now</span>
                    </button>
                  `}
                </div>
              </div>
            </div>

            <!-- HEADER ACTIONS: SEARCH, AUDIO/VIDEO RELAY, CAPSULE, CONTEXT & OPTIONS -->
            <div class="flex items-center space-x-1 shrink-0">
              <button
                type="button"
                data-action="open-chat-search"
                class="context-button"
                title="Search conversation"
                aria-label="Search conversation"
              >
                ${renderIcon('search', { size: 15 })}
                <span class="text-[11px] hidden xl:inline">Search</span>
              </button>

              <button
                type="button"
                data-action="open-capsule-creator"
                class="context-button hover:border-amber-500/40 hidden xs:flex"
                title="Create Context Capsule"
                aria-label="Create Context Capsule"
              >
                <span class="text-xs">📦</span>
                <span class="text-[11px] hidden xl:inline">Capsule</span>
              </button>

              <button
                type="button"
                data-action="toggle-catch-me-up"
                class="context-button"
                title="Catch up / conversation summary"
                aria-label="Catch up"
              >
                ${renderIcon('sparkles', { size: 15 })}
                <span class="text-[11px] hidden xl:inline">Catch Up</span>
              </button>

              <button
                type="button"
                data-action="toggle-dm-context"
                class="context-button ${isDMContextDrawerOpen ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold' : ''}"
                title="Context Shelf — capsules, media, and safety"
                aria-label="Context Shelf"
              >
                ${renderIcon('bookmark', { size: 15 })}
                <span class="text-[11px] hidden xl:inline">Context Shelf</span>
              </button>

              <details class="relative inline-block text-left group">
                <summary class="list-none p-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 text-xs flex items-center justify-center transition-colors cursor-pointer select-none" title="Conversation Options" aria-label="Conversation Options">
                  ${renderIcon('more', { size: 16 })}
                </summary>
                <div class="absolute right-0 mt-1 w-56 p-1.5 bg-surface-base border border-white/10 rounded-2xl shadow-2xl z-30 space-y-1 backdrop-blur-md">
                  <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1 border-b border-white/5">
                    Conversation Options
                  </div>
                  <button type="button" data-action="open-capsule-creator" class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-surface-raised text-slate-200 text-xs xl:hidden">Context Capsules</button>
                  <button type="button" data-action="toggle-catch-me-up" class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-surface-raised text-slate-200 text-xs xl:hidden">Catch up</button>
                  <button type="button" data-action="toggle-dm-context" class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-surface-raised text-slate-200 text-xs xl:hidden">Context Shelf</button>
                  <button 
                    type="button" 
                    data-action="open-dm-safety" 
                    class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-surface-raised text-slate-200 text-xs flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <span>🛡️</span>
                    <span>Verify Safety Numbers</span>
                  </button>
                  <button 
                    type="button" 
                    data-action="clear-dm-history" 
                    data-peer="${activeConv.peerFingerprint}"
                    class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-surface-raised text-slate-200 text-xs flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <span>🧹</span>
                    <span>Clear Message History</span>
                  </button>
                  <button 
                    type="button" 
                    data-action="${sovereignDM.isPeerBlocked(activeConv.peerFingerprint) ? 'unblock-dm-peer' : 'block-dm-peer'}" 
                    data-peer="${activeConv.peerFingerprint}"
                    class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-surface-raised ${sovereignDM.isPeerBlocked(activeConv.peerFingerprint) ? 'text-emerald-300' : 'text-amber-300'} text-xs flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <span>${sovereignDM.isPeerBlocked(activeConv.peerFingerprint) ? '✅' : '🚫'}</span>
                    <span>${sovereignDM.isPeerBlocked(activeConv.peerFingerprint) ? 'Unblock User' : 'Block User'}</span>
                  </button>
                  <div class="border-t border-white/5 my-1"></div>
                  <button 
                    type="button" 
                    data-action="delete-dm-conversation" 
                    data-peer="${activeConv.peerFingerprint}"
                    class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-rose-500/20 text-rose-300 text-xs flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <span>🗑️</span>
                    <span class="font-bold">Delete Conversation</span>
                  </button>
                </div>
              </details>
            </div>
          </div>

          <!-- CONVERSATION BRANCHES BAR (Exposed only when branches exist or when inside a secondary branch) -->
          ${(() => {
            const peerBranches = getBranchesForPeer(activeConv.peerFingerprint);
            const hasMultipleBranches = peerBranches.length > 1 || branchId !== 'main';
            if (!hasMultipleBranches) return '';
            return `
              <div class="flex items-center space-x-2 px-4 md:px-6 py-2 border-b border-white/5 bg-surface-base/50 text-xs overflow-x-auto no-scrollbar shrink-0">
                <span class="text-[10px] font-mono text-slate-500 uppercase tracking-wider shrink-0">Branch:</span>
                ${peerBranches.map(b => `
                  <button
                    type="button"
                    data-action="switch-dm-branch"
                    data-branch="${escapeHtml(b)}" aria-pressed="${b === branchId}"
                    class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center space-x-1 shrink-0 ${
                      b === branchId
                        ? 'bg-[var(--color-accent,#e59b3c)] text-slate-950 font-bold shadow-xs'
                        : 'bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-white border border-white/5'
                    }"
                  >
                    <span>${b === 'main' ? 'Conversation' : escapeHtml(sovereignDM.getBranches(activeConv.peerFingerprint).find(item => item.id === b)?.title || b)}</span>
                    ${allMessages.some(message => !message.isRead && branchOf(message) === b) ? '<span aria-label="Unread messages"> •</span>' : ''}
                  </button>
                `).join('')}
              </div>
            `;
          })()}

          ${branch ? `<section class="context-trail" aria-label="Conversation source">
            <div><span class="context-eyebrow">Context trail · same participants</span><strong>${escapeHtml(branch.title)}</strong>
              <p>${source ? escapeHtml(source.plaintext.slice(0, 180)) : 'Source message is not available on this device.'}</p>
              ${source ? `<small>From ${source.senderFP === myFP ? 'you' : escapeHtml(resolvePeerName(source.senderFP))} · ${escapeHtml(new Date(source.timestamp).toLocaleString())}</small>` : ''}
            </div>
            <div class="context-actions"><button type="button" class="context-button" data-action="open-message-context" data-message-id="${escapeHtml(branch.sourceMessageId)}" ${source ? '' : 'disabled'}>Return to source</button>
            <button type="button" class="context-button" data-action="keep-dm-branch">Keep in Vault</button>
            </div>
          </section>` : ''}

          <!-- MESSAGES THREAD SCROLL -->
          <div id="dm-thread-messages" data-peer-id="${escapeAttr(activeConv.peerFingerprint)}" class="journal-dialogue-list flex-1 min-h-0 p-3 sm:p-5 md:p-6 overflow-y-auto space-y-3 max-w-[940px] mx-auto w-full dialogue-canvas">
            ${renderCatchMeUpCard(messages, resolvePeerName(activeConv.peerFingerprint))}
            ${messages.length === 0 ? `
              <div class="dialogue-thread-empty space-y-4 my-8">
                <span class="dialogue-eyebrow">◈ &nbsp; A NEW CONVERSATION</span>
                <div>
                  <h4 class="text-base font-bold text-white">${escapeHtml(resolveHumanDisplayName(activeConv.peerFingerprint).name)}</h4>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-[11px] font-mono text-slate-400">${escapeHtml(resolveHumanDisplayName(activeConv.peerFingerprint).handle)}</span>
                    ${activeConv.peerRole === 'GUARDIAN' || activeConv.peerRole === 'ARCHIVIST' ? `
                      <span class="text-[9px] px-1.5 py-0.2 rounded border ${
                        activeConv.peerRole === 'GUARDIAN' ? 'bg-amber/15 text-amber border-amber/30' :
                        'bg-cyphr/15 text-cyphr border-cyphr/30'
                      }">
                        ${escapeHtml(humanPeerRole(activeConv.peerRole))}
                      </span>
                    ` : ''}
                  </div>
                </div>
                <p class="text-sm text-slate-400 leading-relaxed max-w-xs">
                  Start a conversation with ${escapeHtml(resolveHumanDisplayName(activeConv.peerFingerprint).name)}.
                </p>
                <div class="space-y-2 pt-2">
                  <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Suggested conversation starters</div>
                   <div class="flex flex-wrap gap-2">
                    <button 
                      type="button" 
                      data-action="insert-chat-prompt" 
                      data-prompt="👋 Hi! Hope you are having a great day."
                      class="px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 hover:text-white border border-white/5 text-xs font-medium transition-all cursor-pointer"
                    >
                      👋 Say hello
                    </button>
                    <button 
                      type="button" 
                      data-action="insert-chat-prompt" 
                      data-prompt="🤝 Excited to collaborate on UREfy!"
                      class="px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 hover:text-white border border-white/5 text-xs font-medium transition-all cursor-pointer"
                    >
                      🤝 Collaborate
                    </button>
                    <button 
                      type="button" 
                      data-action="insert-chat-prompt" 
                      data-prompt="💡 Let's discuss a governance proposal."
                      class="px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 hover:text-white border border-white/5 text-xs font-medium transition-all cursor-pointer"
                    >
                      💡 Discuss proposal
                    </button>
                  </div>
                </div>
              </div>
            ` : (() => {
              const scenes = groupDirectMessagesIntoScenes(messages, myFP);
              const readReceiptsEnabled = typeof localStorage !== 'undefined' && localStorage.getItem('urefy_msg_read_receipts') !== 'false';

              return `
                <div class="dialogue-flow journal-dialogue-flow space-y-3">
                  ${scenes.map(scene => `
                    ${scene.dateSepText ? `
                      <div class="scene-date-separator journal-dialogue-day-break" role="separator">
                        <span>${escapeHtml(scene.dateSepText)}</span>
                      </div>
                    ` : ''}
                    ${scene.clusters.map(cluster => {
                    if (cluster.isSystem) {
                      return cluster.messages.filter(msg => !/encrypt|ratchet|key exchange|safety number|ml-kem|x25519/i.test(msg.plaintext || '')).map(msg => `
                        <div class="dialogue-system-event journal-dialogue-context journal-dialogue-context--system flex items-center justify-center my-2 select-none px-4" role="status">
                          <div class="text-[11px] text-slate-400 flex items-center space-x-2 text-center max-w-lg">
                            <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            <span class="leading-relaxed select-text">${processChatMessageContent(msg.plaintext || '')}</span>
                            <span class="text-[10px] text-slate-500 font-mono ml-1">${formatTime(msg.timestamp)}</span>
                          </div>
                        </div>
                      `).join('');
                    }

                    const isMine = cluster.isMine;
                    const senderInfo = isMine ? { name: 'You', handle: '@me' } : resolveHumanDisplayName(cluster.senderFP);
                    const firstMsg = cluster.messages[0];
                    const timeStr = formatTime(firstMsg.timestamp);

                    // Compute delivery status for own messages
                    const lastMsg = cluster.messages[cluster.messages.length - 1];
                    let statusHtml = '';
                    if (isMine) {
                      if (lastMsg.deliveryStatus === 'sending') {
                        statusHtml = '<span class="text-amber-400/90 text-[11px] flex items-center gap-1 font-mono"><span>⏳</span><span>Sending...</span></span>';
                      } else if (lastMsg.deliveryStatus === 'failed') {
                        statusHtml = `<span class="text-rose-400 text-[11px] flex items-center gap-1 font-mono"><span>⚠️</span><button type="button" data-action="retry-send-dm" data-message-id="${lastMsg.id}" class="underline text-rose-300 hover:text-white cursor-pointer ml-1">Retry</button></span>`;
                      } else if (lastMsg.isPeerRead && readReceiptsEnabled) {
                        statusHtml = '<span class="text-emerald-400/80 text-[11px] flex items-center gap-1 font-mono" title="Read by recipient"><span>✓✓</span><span>Read</span></span>';
                      } else if (lastMsg.deliveryStatus === 'sent') {
                        statusHtml = '<span class="text-slate-400 text-[11px] flex items-center gap-1 font-mono"><span>✓</span><span>Sent</span></span>';
                      }
                    }

                    return `
                      <div class="dialogue-stanza ${isMine ? 'dialogue-stanza--own' : 'dialogue-stanza--peer'}">
                        <!-- Stanza Header -->
                        ${!isMine ? `
                          <div class="stanza-header flex items-center gap-2 mb-1.5 px-1 select-none">
                            <div class="dialogue-identity-mark w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border border-white/10">
                              ${senderInfo.name === 'Profile not set up' ? '?' : senderInfo.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div class="flex items-baseline gap-2 min-w-0 flex-wrap">
                              <span class="text-[13px] sm:text-[14px] font-semibold text-slate-100">${escapeHtml(senderInfo.name)}</span>
                              ${senderInfo.handle ? `<span class="text-[11px] text-slate-400 font-mono">${escapeHtml(senderInfo.handle)}</span>` : ''}
                            </div>
                            <span class="text-[11px] text-slate-500 font-mono ml-auto sm:ml-0">${timeStr}</span>
                          </div>
                        ` : (statusHtml && lastMsg?.deliveryStatus === 'failed' ? `
                          <div class="stanza-header flex items-center justify-end gap-1.5 mb-1 px-1 select-none">
                            ${statusHtml}
                          </div>
                        ` : '')}

                        <!-- Messages in Stanza -->
                        <div class="cluster-messages stanza-messages space-y-1.5 ${isMine ? 'items-end' : 'pl-8 sm:pl-10'} pr-1">
                          ${cluster.messages.map((msg, mIdx) => {
                            const existingReactions = sovereignDM.getReactions(msg.id);
                            const msgTime = formatTime(msg.timestamp);

                            return `
                              <div id="dm-message-${escapeHtml(msg.id)}" tabindex="0" class="dm-message chat-bubble-modern ${isMine ? 'chat-bubble--outgoing journal-dialogue-message--outgoing' : 'chat-bubble--incoming journal-dialogue-message--incoming'} group/msg-row relative flex flex-col transition-all select-text">
                                <!-- Visual Reply Branch -->
                                ${msg.context?.replyToId ? `
                                  <div class="dialogue-reply-branch flex items-center gap-1.5 text-xs text-slate-400 mb-1 select-none ${isMine ? 'justify-end' : ''}">
                                    <span class="text-slate-500 font-mono text-[12px] leading-none">↳</span>
                                    <span class="text-slate-400 text-[11px]">${escapeHtml(allMessages.find(item => item.id === msg.context?.replyToId)?.senderFP === myFP ? 'You' : senderInfo.name)} ·</span>
                                    <button type="button" class="context-quote context-quote-link text-slate-300 hover:text-[var(--color-accent,#e89e38)] underline font-medium cursor-pointer truncate max-w-xs sm:max-w-md text-[11px] bg-transparent border-none p-0 inline" data-action="open-message-context" data-message-id="${escapeHtml(msg.context.replyToId)}" aria-label="Return to replied message">${escapeHtml(allMessages.find(item => item.id === msg.context?.replyToId)?.plaintext.slice(0, 100) || 'Earlier message unavailable')}</button>
                                  </div>
                                ` : ''}

                                <!-- Message Body -->
                                <div class="weave-message-body text-[14.5px] sm:text-[15px] select-text leading-[1.6] break-words [overflow-wrap:anywhere] min-w-0 ${isMine ? 'text-slate-50' : 'text-slate-100'}">
                                  ${sovereignDM.showCiphertextToggle ? `
                                    <div class="font-mono text-[10px] text-emerald-400 bg-black/40 p-2.5 rounded-xl border border-emerald-500/30 break-all space-y-1">
                                      <div class="text-slate-400 font-bold">SIGNED ENCRYPTED ENVELOPE:</div>
                                      <div>${escapeHtml(msg.encryptedPayload)}</div>
                                    </div>
                                  ` : `
                                    ${(() => {
                                      if (!msg.plaintext) return '';
                                      const capsule = parseCapsuleFromText(msg.plaintext);
                                      if (capsule) return renderCapsuleArtifact(capsule);
                                      const outcome = renderOutcomeCard(msg.plaintext);
                                      if (outcome) return outcome;
                                      return `<div class="whitespace-pre-wrap py-0.5">${processChatMessageContent(msg.plaintext)}</div>`;
                                    })()}
                                  `}
                                  ${renderAttachmentCard(msg.attachment)}
                                </div>

                                <!-- WhatsApp-style Meta (Timestamp & Checkmark status) -->
                                <div class="message-meta-inline flex items-center justify-end gap-1.5 mt-1 -mb-0.5 select-none text-[10px] font-mono text-slate-400/80">
                                  <span>${msgTime}</span>
                                  ${isMine ? `
                                    <span class="text-[11px] leading-none ${msg.isPeerRead ? 'text-[#00e5ff] font-bold drop-shadow-[0_0_6px_rgba(0,229,255,0.4)]' : 'text-slate-400'}" title="${msg.isPeerRead ? 'Read by recipient' : (msg.deliveryStatus === 'sent' ? 'Sent' : 'Delivered')}">
                                      ${msg.deliveryStatus === 'sending' ? '⏳' : msg.deliveryStatus === 'failed' ? '⚠️' : (msg.isPeerRead ? '✓✓' : (msg.deliveryStatus === 'sent' ? '✓' : '✓✓'))}
                                    </span>
                                  ` : ''}
                                </div>

                                <!-- Attached Branch Marker if this message spawned branches -->
                                ${sovereignDM.getBranches(activeConv.peerFingerprint).filter(b => b.sourceMessageId === msg.id).map(b => {
                                  const count = allMessages.filter(m => branchOf(m) === b.id).length;
                                  return `
                                    <button type="button" data-action="jump-dm-branch" data-branch="${escapeHtml(b.id)}" class="weave-branch-marker inline-flex items-center gap-1.5 mt-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer">
                                      <span class="text-[var(--color-accent,#e89e38)] font-mono text-[12px]">↳</span>
                                      <span class="font-semibold text-slate-200">${count} replies</span>
                                      <span class="text-[11px] text-slate-400">· ${escapeHtml(b.title)}</span>
                                    </button>
                                  `;
                                }).join('')}

                                ${isMine && msg.deliveryStatus === 'failed' ? `
                                  <div class="mt-1 flex items-center gap-1.5 text-[11px] text-rose-400 font-medium">
                                    <span>⚠️ Couldn’t send</span>
                                    <span>•</span>
                                    <button type="button" data-action="retry-send-dm" data-message-id="${escapeHtml(msg.id)}" class="underline hover:text-rose-200 cursor-pointer font-semibold">Retry</button>
                                  </div>
                                ` : ''}

                                <!-- Existing reactions shelf -->
                                ${existingReactions.length > 0 ? `
                                  <div class="message-reactions-shelf flex flex-wrap gap-1.5 mt-2 ${isMine ? 'justify-end' : 'justify-start'} select-none">
                                    ${existingReactions.map(reaction => `
                                      <button 
                                        type="button" 
                                        class="reaction-pill group/pill inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs transition-all duration-150 cursor-pointer active:scale-95 ${
                                          reaction.mine 
                                            ? 'reaction-pill--mine' 
                                            : 'reaction-pill--peer'
                                        }" 
                                        aria-pressed="${reaction.mine}" 
                                        data-action="react-dm-message" 
                                        data-message-id="${escapeHtml(msg.id)}" 
                                        data-emoji="${reaction.emoji}"
                                      >
                                        <span class="text-[13px] leading-none group-hover/pill:scale-125 transition-transform duration-150">${reaction.emoji}</span>
                                        <span class="text-[11px] font-mono leading-none">${reaction.count}</span>
                                      </button>
                                    `).join('')}
                                  </div>
                                ` : ''}

                                <!-- 2026 Floating Action Dock (hover) -->
                                ${!sovereignDM.showCiphertextToggle && msg.deliveryStatus !== 'failed' ? `
                                  <div class="message-actions-bar opacity-0 group-hover/msg-row:opacity-100 focus-within:opacity-100 transition-all duration-150 flex items-center space-x-0.5 absolute -top-4.5 right-2 bg-slate-900/95 border border-white/15 rounded-full px-2 py-0.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl z-30 pointer-events-none group-hover/msg-row:pointer-events-auto" aria-label="Message actions">
                                    <button type="button" class="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center text-xs transition-transform hover:scale-130 active:scale-90 cursor-pointer" title="React ❤️" data-action="react-dm-message" data-message-id="${escapeHtml(msg.id)}" data-emoji="❤️">❤️</button>
                                    <button type="button" class="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center text-xs transition-transform hover:scale-130 active:scale-90 cursor-pointer" title="React 👍" data-action="react-dm-message" data-message-id="${escapeHtml(msg.id)}" data-emoji="👍">👍</button>
                                    <button type="button" class="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center text-xs transition-transform hover:scale-130 active:scale-90 cursor-pointer" title="React 🔥" data-action="react-dm-message" data-message-id="${escapeHtml(msg.id)}" data-emoji="🔥">🔥</button>
                                    <button type="button" class="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center text-xs transition-transform hover:scale-130 active:scale-90 cursor-pointer" title="React 🚀" data-action="react-dm-message" data-message-id="${escapeHtml(msg.id)}" data-emoji="🚀">🚀</button>
                                    <div class="w-px h-3.5 bg-white/15 mx-1"></div>
                                    <button type="button" class="p-1.5 rounded-full hover:bg-white/15 text-xs text-slate-300 hover:text-white transition-all cursor-pointer" title="Reply" data-action="reply-dm-message" data-message-id="${escapeHtml(msg.id)}">↩</button>
                                    <button type="button" class="p-1.5 rounded-full hover:bg-white/15 text-xs text-slate-300 hover:text-white transition-all cursor-pointer" title="Add to Context Capsule" data-action="add-to-capsule" data-message-id="${escapeHtml(msg.id)}" data-sender-name="${escapeAttr(senderInfo.name)}" data-sender-handle="${escapeAttr(senderInfo.handle)}" data-text="${escapeAttr(msg.plaintext || '')}" data-timestamp="${msg.timestamp}">📦</button>
                                    <button type="button" class="p-1.5 rounded-full hover:bg-white/15 text-xs ${canonicalVault.isMessageSaved(msg.id) ? 'text-[var(--color-accent,#e89e38)] font-bold' : 'text-slate-300 hover:text-white'} transition-all cursor-pointer" title="${canonicalVault.isMessageSaved(msg.id) ? 'Remove from Vault' : 'Save to Vault'}" data-action="${canonicalVault.isMessageSaved(msg.id) ? 'unsave-message-vault' : 'save-message-vault'}" data-message-id="${escapeHtml(msg.id)}">${canonicalVault.isMessageSaved(msg.id) ? '💾' : '🔒'}</button>
                                    <button type="button" class="p-1.5 rounded-full hover:bg-white/15 text-xs text-slate-300 hover:text-white transition-all cursor-pointer" title="Copy text" data-action="copy-message-text" data-text="${escapeAttr(msg.plaintext || '')}">📋</button>
                                  </div>
                                ` : ''}

                                ${mIdx > 0 ? `<span class="message-timestamp-hover text-[10px] text-slate-500 font-mono opacity-0 group-hover/msg-row:opacity-100 transition-opacity absolute ${isMine ? 'left-0' : 'right-1'} top-1 select-none">${msgTime}</span>` : ''}
                              </div>
                            `;
                          }).join('')}
                        </div>
                      </div>
                    `;
                  }).join('')}
                `).join('')}
              </div>
            `;
          })()}
            ${sovereignDM.isPeerTyping(activeConv.peerFingerprint) ? `
              <div class="typing-indicator-bubble flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-surface-raised border border-white/10 w-fit shadow-xs my-2 self-start animate-fade-in">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="text-[12px] text-slate-300 font-medium ml-1.5">${escapeHtml(resolvePeerName(activeConv.peerFingerprint))} is typing...</span>
              </div>
            ` : ''}
          </div>

          <!-- DM COMPOSER FORM -->
          <div class="journal-dialogue-composer p-3 md:p-4 border-subtle-t bg-surface-base shrink-0 shadow-sm relative">
            ${sovereignDM.syncError ? `<div role="status" class="mb-2 text-xs text-amber-300">${escapeHtml(sovereignDM.syncError)}</div>` : ''}
            ${renderEmojiPopover('dm')}
            ${renderOutcomePopover()}
            ${renderStagedAttachmentChip(sovereignDM.getPendingAttachment(), 'dm')}
            ${voiceNotesManager.renderRecorderBar()}
            ${reply ? `<div class="context-trail dialogue-composer-reply"><p>↳ Replying to: ${escapeHtml(reply.plaintext.slice(0, 100))}</p><button type="button" class="context-button" data-action="cancel-dm-reply">Cancel</button></div>` : ''}

            <!-- Hidden File Input -->
            <input 
              type="file" 
              id="input-dm-attachment-file" 
              class="hidden" 
              data-change="dm-file-attached"
              accept="image/*,video/*,audio/*,.pdf,.zip,.tar,.gz,.txt,.md,.json,.csv,.doc,.docx"
            />

            <form id="form-send-dm-message" data-submit="submit-dm-message" class="flex items-center space-x-2 max-w-4xl mx-auto">
              <!-- Plus Menu -->
              <div class="relative">
                <button
                  type="button"
                  data-action="toggle-composer-menu"
                  data-target="dm"
                  class="p-2.5 rounded-2xl bg-surface-raised hover:bg-surface-elevated text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer shrink-0 flex items-center justify-center font-bold text-sm"
                  title="Add media, voice note, context capsule, or formatting"
                  aria-label="Composer actions menu"
                >
                  <span class="${isDMComposerMenuOpen ? 'rotate-45' : ''} transition-transform inline-block">➕</span>
                </button>
                ${renderComposerMenu('dm')}
              </div>

              <!-- Emoji Button -->
              <button
                type="button"
                data-action="toggle-dm-emoji"
                class="p-2.5 rounded-2xl bg-surface-raised hover:bg-surface-elevated text-slate-400 hover:text-amber-400 border border-white/10 transition-colors cursor-pointer shrink-0 text-sm"
                title="Add emoji"
              >
                😊
              </button>

              <div class="relative flex-1 min-w-0 flex items-center bg-surface-raised border border-white/10 rounded-2xl focus-within:border-[var(--color-accent,#e59b3c)] transition-all">
                <input 
                  type="text" 
                  id="input-dm-message"
                  data-input="update-dm-draft"
                  value="${escapeHtml(getMessageDraft('dm'))}"
                  placeholder="Write a private message to ${escapeHtml(resolveHumanDisplayName(activeConv.peerFingerprint).name)}..." aria-label="Private message"
                  class="w-full bg-transparent border-0 px-2.5 py-2.5 sm:py-3 text-sm sm:text-[15px] text-slate-100 placeholder-slate-400 focus:outline-none font-sans"
                  autocomplete="off"
                />
              </div>
              <button 
                type="submit" 
                class="px-5 py-2.5 sm:py-3 bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 text-sm font-semibold rounded-2xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <span>Send</span>
              </button>
            </form>
          </div>
        `}
      </main>

      <!-- 3. RIGHT SIDEBAR: CONVERSATION CONTEXT SHELF (On-demand drawer on desktop, bottom sheet on mobile) -->
      ${activeConv && isDMContextDrawerOpen ? `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 md:bg-black/25" data-action="toggle-dm-context"></div>
        <aside class="dialogue-context-shelf flex fixed inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 z-40 w-full md:w-[360px] max-h-[85vh] md:max-h-full border-t md:border-t-0 md:border-l border-white/10 bg-surface-base/95 flex-col p-4 space-y-4 shrink-0 overflow-y-auto shadow-2xl rounded-t-3xl md:rounded-none">
          <!-- Mobile drag handle -->
          <div class="w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-1 mb-1 md:hidden"></div>

          <!-- Header -->
          <div class="flex items-center justify-between pb-2 border-b border-white/5">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Context Shelf</span>
              <span class="text-[10px] text-slate-500 font-mono">What matters here</span>
            </div>
            <button type="button" data-action="toggle-dm-context" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer" aria-label="Close context shelf">
              ✕
            </button>
          </div>

          <!-- 1. PERSON -->
          <div class="dialogue-shelf-person py-4 border-b border-white/5 space-y-2">
            <div class="dialogue-identity-mark w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base">
              ${resolveHumanDisplayName(activeConv.peerFingerprint).name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 class="text-sm font-semibold text-white">${escapeHtml(resolveHumanDisplayName(activeConv.peerFingerprint).name)}</h3>
              <p class="text-[11px] text-slate-500 font-mono">${escapeHtml(resolveHumanDisplayName(activeConv.peerFingerprint).handle)}</p>
            </div>
            ${activeConv.peerRole === 'GUARDIAN' || activeConv.peerRole === 'ARCHIVIST' ? `
              <span class="inline-block text-[9px] px-2 py-0.5 rounded-full border ${
                activeConv.peerRole === 'GUARDIAN' ? 'bg-amber/15 text-amber border-amber/30' :
                'bg-cyphr/15 text-cyphr border-cyphr/30'
              }">
                ${escapeHtml(humanPeerRole(activeConv.peerRole))}
              </span>
            ` : ''}
          </div>

          <!-- 2. CONVERSATION: WHAT MATTERS (Capsules, Vault, Media) -->
          <div class="py-3 border-b border-white/5 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Context Capsules</span>
              <button type="button" data-action="open-capsule-creator" class="text-[10px] text-[var(--color-accent,#e89e38)] hover:underline cursor-pointer font-medium">+ New Capsule</button>
            </div>
            <p class="text-[11px] text-slate-400 leading-relaxed">Curated syntheses of this conversation kept securely in your local Vault.</p>
            <button type="button" data-action="keep-dm-branch" class="w-full py-1.5 px-2.5 bg-surface-raised hover:bg-surface-overlay border border-white/10 rounded-lg text-slate-200 hover:text-white font-medium text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
              <span>🔒</span>
              <span>Keep Current Thread in Vault</span>
            </button>
          </div>

          <!-- 3. PRIVACY & VERIFICATION -->
          <div class="py-3 border-b border-white/5 space-y-2">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Privacy & Verification
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-emerald-400 font-medium flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>End-to-end encrypted</span>
              </span>
              ${(() => {
                const safetyStatus = sovereignDM.getSafetyVerificationStatus(activeConv.peerFingerprint);
                if (safetyStatus === 'verified') {
                  return '<span class="text-[10px] font-semibold text-emerald-400">✓ Verified</span>';
                } else if (safetyStatus === 'changed') {
                  return '<span class="text-[10px] font-semibold text-rose-400 animate-pulse">⚠️ Key Changed</span>';
                }
                return '<span class="text-[10px] text-slate-500 font-mono">Unverified</span>';
              })()}
            </div>
            <button 
              type="button" 
              data-action="open-dm-safety" 
              class="w-full py-1.5 px-2.5 rounded-lg bg-surface-raised hover:bg-surface-overlay text-xs text-slate-200 hover:text-white border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>🛡️</span>
              <span>Verify Safety Numbers</span>
            </button>
          </div>

          <!-- 4. THREAD MANAGEMENT -->
          <div class="space-y-1.5 pt-2 border-t border-white/5">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Conversation Controls
            </div>
            <button 
              type="button" 
              data-action="clear-dm-history" 
              data-peer="${activeConv.peerFingerprint}"
              class="w-full text-left p-2 rounded-xl hover:bg-surface-raised text-slate-300 text-xs flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <span>🧹</span>
              <span>Clear Message History</span>
            </button>
            <button 
              type="button" 
              data-action="${sovereignDM.isPeerBlocked(activeConv.peerFingerprint) ? 'unblock-dm-peer' : 'block-dm-peer'}" 
              data-peer="${activeConv.peerFingerprint}"
              class="w-full text-left p-2 rounded-xl hover:bg-surface-raised ${sovereignDM.isPeerBlocked(activeConv.peerFingerprint) ? 'text-emerald-300' : 'text-amber-300'} text-xs flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <span>${sovereignDM.isPeerBlocked(activeConv.peerFingerprint) ? '✅' : '🚫'}</span>
              <span>${sovereignDM.isPeerBlocked(activeConv.peerFingerprint) ? 'Unblock User' : 'Block User'}</span>
            </button>
          </div>

          <!-- 5. ADVANCED TECHNICAL DETAILS (Collapsible) -->
          <details class="text-[11px] bg-surface-raised/30 border border-white/5 rounded-xl p-2.5 space-y-1.5 mt-2">
            <summary class="font-semibold text-slate-400 hover:text-slate-200 cursor-pointer list-none flex items-center justify-between select-none">
              <span>Technical Security Details</span>
              <span class="text-xs">▾</span>
            </summary>
            <div class="pt-2 border-t border-white/5 space-y-1 text-[10px] font-mono text-slate-400">
              <div><strong>Encapsulation:</strong> NIST FIPS 203 ML-KEM-768 + X25519</div>
              <div><strong>Cipher:</strong> AES-256-GCM authenticated</div>
              <div><strong>Signatures:</strong> Ed25519 envelopes</div>
              <div><strong>Ratchet:</strong> Double Ratchet forward secrecy</div>
            </div>
          </details>
        </aside>
      ` : ''}
    </div>
    ${renderNewDMModal()}
  `;
}

/**
 * Main Workspace View for Messages: provides seamless switching between Sovereign Relays and Direct Messages.
 */
export function renderRelaysWorkspace(): string {
  const currentTab = getActiveMessagesTab();
  if (currentTab === 'dm' || sovereignDM.isOpen) {
    return `
      <div class="flex-1 flex flex-col overflow-hidden bg-canvas">
        ${renderMessagesTabHeader()}
        ${renderDirectMessagesWorkspace()}
        ${contextCapsuleManager.renderCreatorModal()}
        ${chatSearchEngine.renderSearchDrawer()}
      </div>
    `;
  }

  const activeRelay = relaysManager.getActiveRelay();
  const messages = [...(clientStore.messages.get(clientStore.activeChannelId) || [])]
    .sort((a, b) => a.createdAt - b.createdAt);
  const channelName = clientStore.activeChannelId.replace(/^relay-.*?-(general|announcements|voice-room|dev-core|dev|community|lounge)/, '$1').replace('relays-', '');

  return `
    <div class="flex-1 flex flex-col overflow-hidden bg-canvas">
      <!-- WORKSPACE TAB SWITCHER -->
      ${renderMessagesTabHeader()}

      <!-- SOVEREIGN RELAYS SPLIT WORKSPACE -->
      <div class="relay-messages-workspace journal-dialogue-workspace flex-1 flex overflow-hidden">
        <!-- 1. SOVEREIGN RELAY SERVER RAIL (LEFT-MOST ICON STRIP) -->
        ${relaysManager.renderRelayServerRail()}

        <!-- 2. RELAY CHANNELS LIST & MAIN CHAT AREA -->
        <div class="flex-1 flex flex-col overflow-hidden">
          <!-- RELAY TOP BANNER WITH INVITE FRIENDS BUTTON -->
          ${relaysManager.renderRelayHeader(activeRelay, channelName, clientStore.keypair?.fingerprint)}

          <!-- MESSAGES FEED -->
          <div id="messages-container" data-channel-id="${escapeAttr(clientStore.activeChannelId)}" role="log" aria-label="${escapeAttr(channelName)} conversation" aria-live="off" class="journal-dialogue-list flex-1 min-h-0 p-3 sm:p-4 md:p-6 overflow-y-auto space-y-${clientStore.density === 'compact' ? '0.5' : clientStore.density === 'balanced' ? '2' : '3'} w-full pb-20 md:pb-6">
            <div class="journal-dialogue-flow">
              ${messages.length === 0 ? `<div class="dialogue-community-empty"><span class="dialogue-eyebrow">◈ &nbsp; ${escapeHtml(relaysManager.resolveTopicName(channelName))}</span><h3>Start this conversation</h3><p>Ask a question, share an idea, or bring something worth discussing.</p></div>` : messages.map((m, idx) => renderMessageItem(m, idx > 0 ? messages[idx - 1] : undefined)).join('')}
            </div>
          </div>

          <!-- RELAYS COMPOSER -->
          <div class="journal-dialogue-composer p-3 md:p-4 border-subtle-t bg-surface-base shrink-0 shadow-sm relative">
            ${renderEmojiPopover('relay')}
            ${renderStagedAttachmentChip(clientStore.pendingRelayAttachment, 'relay')}
            ${voiceNotesManager.renderRecorderBar()}

            <!-- Hidden File Input -->
            <input 
              type="file" 
              id="input-relay-attachment-file" 
              class="hidden" 
              data-change="relay-file-attached"
              accept="image/*,video/*,audio/*,.pdf,.zip,.tar,.gz,.txt,.md,.json,.csv,.doc,.docx"
            />

            <form id="form-send-message" data-submit="submit-relay-message" class="flex items-center space-x-2 max-w-4xl mx-auto">
              <!-- Plus Menu -->
              <div class="relative">
                <button
                  type="button"
                  data-action="toggle-composer-menu"
                  data-target="relay"
                  class="p-2.5 rounded-2xl bg-surface-raised hover:bg-surface-elevated text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer shrink-0 flex items-center justify-center font-bold text-sm"
                  title="Add media, voice note, context capsule, or formatting"
                  aria-label="Composer actions menu"
                >
                  <span class="${isRelayComposerMenuOpen ? 'rotate-45' : ''} transition-transform inline-block">➕</span>
                </button>
                ${renderComposerMenu('relay')}
              </div>

              <!-- Emoji Button -->
              <button
                type="button"
                data-action="toggle-relay-emoji"
                class="p-2.5 rounded-2xl bg-surface-raised hover:bg-surface-elevated text-slate-400 hover:text-amber-400 border border-white/10 transition-colors cursor-pointer shrink-0 text-sm"
                title="Add emoji"
              >
                😊
              </button>

              <div class="relative flex-1 min-w-0">
                <input 
                  type="text" 
                  id="input-message"
                  aria-label="Community message"
                  data-input="update-relay-draft"
                  value="${escapeHtml(getMessageDraft('relay'))}"
                  placeholder="Message ${relaysManager.resolveTopicName(channelName)}..."
                  class="w-full bg-surface-raised border border-white/10 rounded-2xl px-4 py-2.5 sm:py-3 text-sm sm:text-[15px] text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[var(--color-accent,#e59b3c)] transition-all font-sans"
                  autocomplete="off"
                />
              </div>
              <button type="submit" class="px-5 py-2.5 sm:py-3 bg-[var(--color-accent,#e59b3c)] hover:brightness-105 text-slate-950 text-sm font-semibold rounded-2xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer shrink-0">
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
      ${contextCapsuleManager.renderCreatorModal()}
      ${chatSearchEngine.renderSearchDrawer()}
    </div>
  `;
}

// Schedule dropzone attachment after rendering
setTimeout(() => {
  attachChatDropzoneListeners();
}, 50);
