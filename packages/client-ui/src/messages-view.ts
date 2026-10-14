/**
 * @file messages-view.ts
 * @package @aetheris/client-ui
 * @description 2027 Spatial E2EE Direct Messages & Sovereign Relays Workspace.
 * Supports ML-KEM-768 Double Ratchet threads, Conversation Branches, Context Capsules,
 * Voice Notes, and Surgical Input Cursor Preservation.
 */

import { clientStore, ClientMessage, DirectMessageAttachment } from './client-state.js';
import { relaysManager } from './relays-manager.js';
import { zkReputation } from './zk-reputation.js';
import { sovereignDM, DirectMessage } from './sovereign-dm.js';
import { MAX_PRIVATE_ATTACHMENT_BYTES } from './direct-messaging-client.js';
import { renderIcon } from './ui/icons.js';
import { branchOf, MESSAGE_REACTIONS } from './conversation-context.js';
import { processChatMessageContent } from './chat-rich-embed.js';
import { canonicalVault } from './canonical-vault.js';
import { voiceNotesManager } from './messages-voice.js';
import {
  contextCapsuleManager,
  parseCapsuleFromText,
  renderCapsuleArtifact,
} from './messages-capsule.js';
import { chatSearchEngine } from './messages-search.js';
import { profileStore as profileView } from './profile/profile-store.js';

export type MessagesTab = 'relays' | 'dm';
export type DMFilterGroup = 'all' | 'direct' | 'communities' | 'unread';

let activeMessagesTab: MessagesTab = 'dm';
let activeDMFilterGroup: DMFilterGroup = 'all';
let isDMContextDrawerOpen = false;
let isNewDMPickerOpen = false;
let isDMEmojiPickerOpen = false;
let isRelayEmojiPickerOpen = false;
let isComposerMenuOpen: 'dm' | 'relay' | null = null;
let isOutcomePickerOpen = false;
let showCatchMeUpCard = false;
let dmSearchQuery = '';
let chatEmojiCategory = 'all';
let chatEmojiSearchQuery = '';
let activeBranchId = 'main';

const messageDrafts = new Map<string, string>();
const selectionState: Record<
  'dm' | 'relay',
  { start: number; end: number; targetId: string }
> = {
  dm: { start: 0, end: 0, targetId: '' },
  relay: { start: 0, end: 0, targetId: '' },
};

const RECENT_EMOJIS_KEY = 'urefy_recent_chat_emojis_v1';

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(text: string): string {
  return escapeHtml(text);
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '00:00';
  }
}

function formatRelative(ts: number): string {
  const diffMin = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}

function generateDeterministicGradient(fingerprint: string): string {
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    hash = (hash * 31 + fingerprint.charCodeAt(i)) >>> 0;
  }
  const h1 = hash % 360;
  const h2 = (h1 + 55) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 75%, 45%), hsl(${h2}, 80%, 35%))`;
}

export function toggleComposerMenu(targetType: 'dm' | 'relay', open?: boolean): void {
  if (open !== undefined) {
    isComposerMenuOpen = open ? targetType : null;
  } else {
    isComposerMenuOpen = isComposerMenuOpen === targetType ? null : targetType;
  }
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function closeComposerMenu(): void {
  isComposerMenuOpen = null;
}

export async function saveMessageMoment(
  messageId: string,
  text: string,
  senderName: string,
  contextName: string,
  timestamp: number = Date.now()
): Promise<void> {
  await canonicalVault.saveMessage({
    id: messageId,
    content: text,
    authorName: senderName,
    channelId: contextName,
    createdAt: timestamp,
  });
}

export function setDMFilterGroup(group: DMFilterGroup): void {
  activeDMFilterGroup = group;
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function toggleDMContextDrawer(open?: boolean): void {
  isDMContextDrawerOpen = open !== undefined ? open : !isDMContextDrawerOpen;
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function ensureEmojiDataLoaded(): void {}

export function setChatEmojiCategory(cat: string): void {
  chatEmojiCategory = cat;
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function setChatEmojiSearchQuery(q: string): void {
  chatEmojiSearchQuery = q;
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function getActiveBranch(): string {
  return activeBranchId;
}

export function setActiveBranch(branch: string): void {
  activeBranchId = branch || 'main';
  sovereignDM.selectBranch(activeBranchId);
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function getBranchesForPeer(peerFP: string): string[] {
  const branches = sovereignDM.getBranches(peerFP);
  return ['main', ...branches.map((b) => b.id)];
}

export async function createBranchForPeer(
  peerFP: string,
  branchName: string,
  sourceMessageId = 'root'
): Promise<void> {
  await sovereignDM.createBranch(peerFP, branchName, sourceMessageId);
  activeBranchId = sovereignDM.getActiveBranch(peerFP);
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function toggleCatchMeUp(): void {
  showCatchMeUpCard = !showCatchMeUpCard;
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function toggleOutcomePicker(open?: boolean): void {
  isOutcomePickerOpen = open !== undefined ? open : !isOutcomePickerOpen;
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function insertOutcomeTemplate(type: string): void {
  const prefix =
    type === 'decision'
      ? '✅ [DECISION]: '
      : type === 'action'
      ? '🎯 [ACTION ITEM]: '
      : '📌 [SUMMARY]: ';
  const current = getMessageDraft('dm');
  setMessageDraft('dm', current ? `${current}\n${prefix}` : prefix);
  isOutcomePickerOpen = false;
  clientStore.notify('MESSAGES_UI_UPDATED');
}

function getDraftStorageKey(targetType: 'dm' | 'relay', targetId?: string): string {
  const id =
    targetId ||
    (targetType === 'dm'
      ? sovereignDM.activePeerFP || 'default'
      : clientStore.activeChannelId || 'relays-general');
  return `${targetType}:${id}`;
}

export function setMessageDraft(targetType: 'dm' | 'relay', value: string, targetId?: string): void {
  const key = getDraftStorageKey(targetType, targetId);
  messageDrafts.set(key, value);
}

export function getMessageDraft(targetType: 'dm' | 'relay', targetId?: string): string {
  const key = getDraftStorageKey(targetType, targetId);
  return messageDrafts.get(key) || '';
}

export function hasConversationDraft(targetType: 'dm' | 'relay', targetId: string): boolean {
  const val = messageDrafts.get(getDraftStorageKey(targetType, targetId));
  return Boolean(val && val.trim().length > 0);
}

export function captureMessageSelection(
  targetType: 'dm' | 'relay',
  input: HTMLInputElement | HTMLTextAreaElement | null,
  explicitSelection = false
): void {
  const targetId =
    targetType === 'dm'
      ? sovereignDM.activePeerFP || 'default'
      : clientStore.activeChannelId || 'relays-general';
  if (!input || (input as any).isConnected === false) return;

  const val = input.value ?? '';
  setMessageDraft(targetType, val, targetId);

  const start =
    typeof input.selectionStart === 'number'
      ? input.selectionStart
      : explicitSelection
      ? val.length
      : selectionState[targetType].start;
  const end =
    typeof input.selectionEnd === 'number'
      ? input.selectionEnd
      : explicitSelection
      ? val.length
      : selectionState[targetType].end;

  selectionState[targetType] = {
    start: Math.max(0, Math.min(val.length, start)),
    end: Math.max(0, Math.min(val.length, end)),
    targetId,
  };
}

export function insertMessageEmoji(targetType: 'dm' | 'relay', emoji: string): number {
  const inputId = targetType === 'dm' ? 'dm-workspace-input' : 'chat-message-input';
  const input =
    typeof document !== 'undefined'
      ? (document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement | null)
      : null;

  const currentText = input ? input.value : getMessageDraft(targetType);
  const sel = selectionState[targetType];
  const start = Math.max(0, Math.min(currentText.length, sel.start ?? currentText.length));
  const end = Math.max(start, Math.min(currentText.length, sel.end ?? currentText.length));

  const nextText = currentText.slice(0, start) + emoji + currentText.slice(end);
  const nextCursor = start + emoji.length;

  setMessageDraft(targetType, nextText);
  selectionState[targetType] = {
    start: nextCursor,
    end: nextCursor,
    targetId: sel.targetId || '',
  };

  if (input) {
    input.value = nextText;
    if (typeof input.setSelectionRange === 'function') {
      input.setSelectionRange(nextCursor, nextCursor);
    }
  }
  addRecentEmoji(emoji);
  return nextCursor;
}

export function restoreMessageSelection(targetType: 'dm' | 'relay', focus = true): void {
  if (typeof document === 'undefined') return;
  const inputId = targetType === 'dm' ? 'dm-workspace-input' : 'chat-message-input';
  const input = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!input) return;

  const draft = getMessageDraft(targetType);
  if (draft && input.value !== draft) {
    input.value = draft;
  }

  const sel = selectionState[targetType];
  const pos = Math.max(0, Math.min(input.value.length, sel.start ?? input.value.length));
  if (focus && typeof input.focus === 'function') {
    input.focus();
  }
  if (typeof input.setSelectionRange === 'function') {
    try {
      input.setSelectionRange(pos, pos);
    } catch {
      // ignore if unsupported input type
    }
  }
}

export function setActiveMessagesTab(tab: MessagesTab): void {
  activeMessagesTab = tab;
  clientStore.notify('MESSAGES_TAB_CHANGED', tab);
}

export function getActiveMessagesTab(): MessagesTab {
  return activeMessagesTab;
}

export function openNewDMPicker(): void {
  isNewDMPickerOpen = true;
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function closeNewDMPicker(): void {
  isNewDMPickerOpen = false;
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function toggleDMEmojiPicker(open?: boolean): void {
  isDMEmojiPickerOpen = open !== undefined ? open : !isDMEmojiPickerOpen;
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function toggleRelayEmojiPicker(open?: boolean): void {
  isRelayEmojiPickerOpen = open !== undefined ? open : !isRelayEmojiPickerOpen;
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function closeEmojiPickers(): void {
  isDMEmojiPickerOpen = false;
  isRelayEmojiPickerOpen = false;
}

export function setDMSearchQuery(query: string): void {
  dmSearchQuery = query;
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function isSameCalendarDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

export function formatDateSeparator(ts: number): string {
  const now = Date.now();
  if (isSameCalendarDay(ts, now)) return 'Today';
  if (isSameCalendarDay(ts, now - 86400000)) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function resolveHumanDisplayName(
  fp: string,
  isMine?: boolean
): { name: string; handle: string; avatar: string } {
  if (isMine) {
    const myFp = clientStore.keypair?.fingerprint || fp;
    const myProf = profileView.getProfile(myFp);
    return {
      name: myProf.name || 'You',
      handle: myProf.handle || myFp.slice(0, 10),
      avatar: myProf.avatar || '',
    };
  }
  const prof = profileView.getProfile(fp);
  return {
    name: prof.name || fp.slice(0, 12),
    handle: prof.handle || fp.slice(0, 10),
    avatar: prof.avatar || '',
  };
}

export function renderSharedPostCard(text: string): string {
  return processChatMessageContent(text);
}

export function renderAttachmentCard(att?: DirectMessageAttachment): string {
  if (!att) return '';
  if (att.type?.startsWith('image/') && att.dataUrl) {
    return `<div class="mt-2 rounded-2xl overflow-hidden border border-white/10 max-w-xs">
      <img src="${escapeAttr(att.dataUrl)}" alt="${escapeAttr(att.name)}" class="w-full h-auto object-cover" />
    </div>`;
  }
  if (att.type?.startsWith('audio/') && att.dataUrl) {
    return `<div class="mt-2 p-2.5 rounded-2xl bg-black/35 border border-cyan-500/25">
      <audio controls src="${escapeAttr(att.dataUrl)}" class="w-full h-8"></audio>
    </div>`;
  }
  return `<div class="mt-2 p-3 rounded-2xl bg-black/35 border border-white/10 flex items-center justify-between gap-3 text-xs font-mono">
    <span class="truncate text-white">📎 ${escapeHtml(att.name)}</span>
    <span class="text-slate-400 shrink-0">${Math.round((att.size || 0) / 1024)} KB</span>
  </div>`;
}

export function getRecentEmojis(): string[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(RECENT_EMOJIS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return ['🔥', '⚡', '🛡️', '🚀', '❤️', '👍', '🎯', '💡'];
}

export function addRecentEmoji(emoji: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const list = getRecentEmojis().filter((e) => e !== emoji);
      list.unshift(emoji);
      localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(list.slice(0, 16)));
    }
  } catch {
    // ignore
  }
}

export function renderEmojiPopover(targetType: 'dm' | 'relay'): string {
  const isOpen = targetType === 'dm' ? isDMEmojiPickerOpen : isRelayEmojiPickerOpen;
  if (!isOpen) return '';
  const emojis = getRecentEmojis();

  return `<div
    id="${targetType}-emoji-popover"
    role="dialog"
    aria-label="Emoji picker"
    class="absolute bottom-14 right-2 z-50 w-64 rounded-2xl bg-[#0c101c]/95 backdrop-blur-2xl border border-white/15 p-3 shadow-2xl"
  >
    <div class="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">Quick Reactions & Emojis</div>
    <div class="grid grid-cols-4 gap-1.5">
      ${emojis
        .map(
          (emo) => `<button
            type="button"
            data-insert-chat-emoji="${escapeAttr(emo)}"
            data-target-type="${targetType}"
            class="h-9 rounded-xl hover:bg-white/10 text-base flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
          >${emo}</button>`
        )
        .join('')}
    </div>
  </div>`;
}

export function renderComposerMenu(targetType: 'dm' | 'relay'): string {
  if (isComposerMenuOpen !== targetType) return '';
  return `<div class="absolute bottom-14 left-2 z-50 w-56 rounded-2xl bg-[#0c101c]/95 backdrop-blur-2xl border border-white/15 p-2 shadow-2xl space-y-1 text-xs">
    <button type="button" data-trigger-chat-file="${targetType}" class="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 flex items-center gap-2 cursor-pointer">
      📎 Attach Encrypted File
    </button>
    <button type="button" data-trigger-voice-note="${targetType}" class="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 flex items-center gap-2 cursor-pointer">
      🎙️ Record Voice Note
    </button>
    <button type="button" data-trigger-context-capsule="${targetType}" class="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-cyan-300 flex items-center gap-2 cursor-pointer">
      💊 Create Context Capsule
    </button>
  </div>`;
}

export function renderStagedAttachmentChip(
  att: DirectMessageAttachment | null,
  targetType: 'dm' | 'relay'
): string {
  if (!att) return '';
  return `<div class="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-200">
    <span>📎 ${escapeHtml(att.name)} (${Math.round(att.size / 1024)} KB)</span>
    <button type="button" data-clear-staged-attachment="${targetType}" class="text-slate-400 hover:text-white cursor-pointer">✕</button>
  </div>`;
}

export function renderOutcomePopover(): string {
  if (!isOutcomePickerOpen) return '';
  return `<div class="p-3 rounded-2xl bg-surface-raised border border-white/15 text-xs space-y-1">
    <button type="button" data-outcome-type="decision" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-emerald-300">✅ Decision Record</button>
    <button type="button" data-outcome-type="action" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-cyan-300">🎯 Action Item</button>
  </div>`;
}

export function renderCatchMeUpCard(messages: DirectMessage[], peerName: string): string {
  if (!showCatchMeUpCard || messages.length === 0) return '';
  const recent = messages.slice(-5);
  return `<div class="mb-4 p-4 rounded-2xl bg-cyan-950/35 border border-cyan-500/30 text-xs text-slate-200 space-y-1.5">
    <div class="flex items-center justify-between">
      <span class="font-mono text-[10px] uppercase tracking-wider text-cyan-300">✨ Local AI Catch-Me-Up · ${escapeHtml(
        peerName
      )}</span>
      <button type="button" data-action="toggleCatchMeUp()" class="text-slate-400 hover:text-white">✕</button>
    </div>
    <p class="text-slate-300">${recent.length} recent encrypted messages in this session. Latest: "${escapeHtml(
    recent[recent.length - 1].plaintext.slice(0, 120)
  )}"</p>
  </div>`;
}

export function renderOutcomeCard(plaintext: string): string {
  if (
    !plaintext.startsWith('✅ [DECISION]:') &&
    !plaintext.startsWith('🎯 [ACTION ITEM]:') &&
    !plaintext.startsWith('📌 [SUMMARY]:')
  ) {
    return '';
  }
  return `<div class="my-1.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 font-medium">
    ${escapeHtml(plaintext)}
  </div>`;
}

export async function handleFileAttachment(file: File, _targetType: 'dm' | 'relay'): Promise<void> {
  if (!file || file.size > MAX_PRIVATE_ATTACHMENT_BYTES) return;
  const reader = new FileReader();
  const dataUrl: string = await new Promise((resolve) => {
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
  sovereignDM.setPendingAttachment({
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    dataUrl,
  });
  clientStore.notify('MESSAGES_UI_UPDATED');
}

export function attachChatDropzoneListeners(): void {}

function isSameSenderWithin5Min(
  curr: { authorFingerprint: string; createdAt: number },
  prev?: { authorFingerprint: string; createdAt: number }
): boolean {
  if (!prev) return false;
  return (
    curr.authorFingerprint === prev.authorFingerprint &&
    Math.abs(curr.createdAt - prev.createdAt) < 5 * 60 * 1000
  );
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
  let lastTimestamp = 0;

  for (const msg of msgs) {
    const needDateSep = !currentScene || !isSameCalendarDay(msg.timestamp, lastTimestamp);
    if (needDateSep) {
      currentScene = {
        dateSepText: formatDateSeparator(msg.timestamp),
        clusters: [],
      };
      scenes.push(currentScene);
    }

    const isMine = msg.senderFP === myFP || msg.senderFP === 'me_local_node_0x9f4e';
    const lastCluster = currentScene!.clusters[currentScene!.clusters.length - 1];

    if (
      lastCluster &&
      lastCluster.senderFP === msg.senderFP &&
      Math.abs(msg.timestamp - lastTimestamp) < 5 * 60 * 1000
    ) {
      lastCluster.messages.push(msg);
    } else {
      currentScene!.clusters.push({
        senderFP: msg.senderFP,
        isMine,
        isSystem: false,
        messages: [msg],
      });
    }
    lastTimestamp = msg.timestamp;
  }

  return scenes;
}

export function renderMessageItem(m: ClientMessage, prevMsg?: ClientMessage): string {
  const grouped = isSameSenderWithin5Min(m, prevMsg);
  const author = resolveHumanDisplayName(m.authorFingerprint, m.isMine);
  const capsule = parseCapsuleFromText(m.text);

  return `<div
    id="relay-msg-${escapeAttr(m.id)}"
    data-message-id="${escapeAttr(m.id)}"
    class="group flex items-start gap-3 px-4 ${grouped ? 'py-1' : 'pt-3 pb-1'} hover:bg-white/[0.03] rounded-2xl transition-colors"
  >
    ${
      grouped
        ? `<div class="w-9 shrink-0 text-[10px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 text-right pt-1">${formatTime(
            m.createdAt
          )}</div>`
        : `<div class="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold text-white shadow" style="background:${generateDeterministicGradient( m.authorFingerprint )}">${escapeHtml(author.name.slice(0, 2).toUpperCase())}</div>`
    }
    <div class="flex-1 min-w-0">
      ${
        !grouped
          ? `<div class="flex items-center gap-2 mb-0.5">
              <span class="text-xs font-bold text-white">${escapeHtml(author.name)}</span>
              <span class="text-[10px] font-mono text-cyan-400">@${escapeHtml(author.handle)}</span>
              <span class="text-[10px] font-mono text-slate-500">${formatTime(m.createdAt)}</span>${zkReputation.renderInlineTrustBadge(m.authorFingerprint)}
            </div>`
          : ''
      }
      <div class="text-sm text-slate-200 leading-relaxed break-words">
        ${capsule ? renderCapsuleArtifact(capsule) : processChatMessageContent(m.text)}
      </div>
      ${renderAttachmentCard(m.attachment)}
    </div>
  </div>`;
}

export function renderMessagesTabHeader(): string {
  const unreadDMs = sovereignDM.getTotalUnreadCount();

  return `<div class="flex items-center justify-between gap-3 mb-4 px-1 flex-wrap">
    <div role="tablist" aria-label="Messages mode" class="inline-flex items-center gap-1 p-1 rounded-2xl bg-surface-base/85 backdrop-blur-2xl border border-white/10">
      <button
        type="button"
        id="tab-messages-dm"
        role="tab"
        aria-selected="${activeMessagesTab === 'dm' ? 'true' : 'false'}"
        data-action="window.setActiveMessagesTab && window.setActiveMessagesTab('dm')"
        class="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
          activeMessagesTab === 'dm'
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 shadow-sm'
            : 'text-slate-400 hover:text-white'
        }"
      >
        ${renderIcon('lock', { size: 14, ariaHidden: true })}
        <span>Direct Messages (E2EE)</span>
        ${
          unreadDMs > 0
            ? `<span class="px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] text-white font-bold">${unreadDMs}</span>`
            : ''
        }
      </button>
      <button
        type="button"
        id="tab-messages-relays"
        role="tab"
        aria-selected="${activeMessagesTab === 'relays' ? 'true' : 'false'}"
        data-action="window.setActiveMessagesTab && window.setActiveMessagesTab('relays')"
        class="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
          activeMessagesTab === 'relays'
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 shadow-sm'
            : 'text-slate-400 hover:text-white'
        }"
      >
        ${renderIcon('radio', { size: 14, ariaHidden: true })}
        <span>Community Rooms & Relays</span>
      </button>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        id="btn-new-dm-conversation"
        data-action="window.openNewDMPicker && window.openNewDMPicker()"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-gradient-to-b from-cyan-400 to-cyan-500 text-slate-950 font-bold text-xs shadow cursor-pointer"
      >
        ${renderIcon('plus', { size: 14, ariaHidden: true })}
        <span>New Message</span>
      </button>
    </div>
  </div>`;
}

export function renderNewDMModal(): string {
  if (!isNewDMPickerOpen) return '';
  const members = clientStore.members || [];

  return `<div
    id="new-dm-modal"
    role="dialog"
    aria-modal="true"
    aria-label="Start new encrypted conversation"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl p-4"
  >
    <div class="w-full max-w-md rounded-3xl bg-[#0c101c] border border-white/15 p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-white/10">
        <h3 class="text-base font-extrabold text-white">New Encrypted Direct Message</h3>
        <button type="button" data-action="window.closeNewDMPicker && window.closeNewDMPicker()" class="text-slate-400 hover:text-white cursor-pointer">✕</button>
      </div>
      <div class="space-y-2 max-h-72 overflow-y-auto">
        ${members
          .map((m) => {
            const prof = resolveHumanDisplayName(m.fingerprint);
            return `<button
              type="button"
              data-select-dm-peer="${escapeAttr(m.fingerprint)}"
              class="w-full text-left p-3 rounded-2xl hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div>
                <div class="text-xs font-bold text-white">${escapeHtml(prof.name)}</div>
                <div class="text-[11px] font-mono text-cyan-400">@${escapeHtml(prof.handle)}</div>
              </div>
              <span class="text-xs text-cyan-300">Message →</span>
            </button>`;
          })
          .join('')}
      </div>
    </div>
  </div>`;
}

export function renderDirectMessagesWorkspace(): string {
  const myFP = clientStore.keypair?.fingerprint || 'me_local_node_0x9f4e';
  const allConvs = sovereignDM.getAllConversations();
  const q = dmSearchQuery.trim().toLowerCase();

  const filteredConvs = allConvs.filter((c) => {
    if (activeDMFilterGroup === 'unread' && c.unreadCount <= 0) return false;
    if (!q) return true;
    const peer = resolveHumanDisplayName(c.peerFingerprint);
    return (
      c.peerFingerprint.toLowerCase().includes(q) ||
      peer.name.toLowerCase().includes(q) ||
      peer.handle.toLowerCase().includes(q)
    );
  });

  const activePeerFP = sovereignDM.activePeerFP || filteredConvs[0]?.peerFingerprint || 'genesis-core';
  const activeConv = sovereignDM.getConversation(activePeerFP);
  const peerInfo = resolveHumanDisplayName(activePeerFP);
  const messages = (activeConv?.messages || []).filter((m) => {
    const b = branchOf(m);
    return activeBranchId === 'main' ? b === 'main' || !b : b === activeBranchId;
  });

  const scenes = groupDirectMessagesIntoScenes(messages, myFP);
  const currentDraft = getMessageDraft('dm', activePeerFP);
  const safetyStatus = sovereignDM.getSafetyVerificationStatus(activePeerFP);

  return `<div id="dm-workspace" class="w-full max-w-6xl mx-auto pb-14">
    ${renderMessagesTabHeader()}

    <div class="grid grid-cols-1 lg:grid-cols-12 rounded-3xl bg-surface-base/85 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden min-h-[72vh]">
      <!-- Left Conversation Roster -->
      <aside class="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-black/20">
        <div class="p-3.5 border-b border-white/10 space-y-2.5">
          <div class="relative flex items-center">
            <span class="absolute left-3 text-slate-400 pointer-events-none">
              ${renderIcon('search', { size: 14, ariaHidden: true })}
            </span>
            <input
              id="dm-roster-search-input"
              type="search"
              value="${escapeAttr(dmSearchQuery)}"
              data-input-action="dm.search"
              placeholder="Filter conversations..."
              aria-label="Filter conversations"
              class="w-full min-h-[38px] pl-9 pr-3 py-1.5 rounded-xl bg-surface-base/90 text-xs text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:border-cyan-400/60"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          ${filteredConvs
            .map((conv) => {
              const isSelected = conv.peerFingerprint === activePeerFP;
              const p = resolveHumanDisplayName(conv.peerFingerprint);
              const lastMsg = conv.messages[conv.messages.length - 1];
              const hasDraft = hasConversationDraft('dm', conv.peerFingerprint);

              return `<button
                type="button"
                data-select-dm-peer="${escapeAttr(conv.peerFingerprint)}"
                class="w-full text-left p-3.5 flex items-start justify-between gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/15 border-l-4 border-cyan-400'
                    : 'hover:bg-white/[0.04]'
                }"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center text-xs font-bold text-white" style="background:${generateDeterministicGradient( conv.peerFingerprint )}">${escapeHtml(p.name.slice(0, 2).toUpperCase())}</div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-bold text-white truncate">${escapeHtml(p.name)}</span>
                      <span class="text-[10px] font-mono text-slate-400">@${escapeHtml(p.handle)}</span>
                    </div>
                    <div class="text-xs text-slate-400 truncate mt-0.5">
                      ${
                        hasDraft
                          ? `<span class="text-amber-300 font-semibold">[Draft]</span> `
                          : ''
                      }${escapeHtml(lastMsg ? lastMsg.plaintext : 'Start encrypted session')}
                    </div>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-1 shrink-0">
                  <span class="text-[10px] font-mono text-slate-500">${
                    conv.lastMessageAt ? formatRelative(conv.lastMessageAt) : ''
                  }</span>
                  ${
                    conv.unreadCount > 0
                      ? `<span class="px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-extrabold">${conv.unreadCount}</span>`
                      : ''
                  }
                </div>
              </button>`;
            })
            .join('')}
        </div>
      </aside>

      <!-- Active E2EE Conversation Stage -->
      <section class="lg:col-span-8 flex flex-col min-w-0">
        <!-- Thread Header -->
        <header class="p-4 border-b border-white/10 flex items-center justify-between gap-3 bg-surface-base/60">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center text-xs font-bold text-white" style="background:${generateDeterministicGradient(
              activePeerFP
            )}">${escapeHtml(peerInfo.name.slice(0, 2).toUpperCase())}</div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-extrabold text-white truncate">${escapeHtml(peerInfo.name)}</h2>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  safetyStatus === 'verified'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                    : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                }">
                  ${safetyStatus === 'verified' ? '✓ Verified Safety Number' : '🔒 ML-KEM-768 Double Ratchet'}
                </span>
              </div>
              <div class="text-[11px] font-mono text-slate-400 truncate">@${escapeHtml(peerInfo.handle)}</div>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-action="window.sovereignDM && window.sovereignDM.toggleSafetyModal()"
              title="Verify Safety Number"
              class="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-xs font-mono text-slate-200 border border-white/10 cursor-pointer"
            >🛡️ Verify</button>
          </div>
        </header>

        <!-- Message Stream -->
        <div id="dm-messages-scroll" class="flex-1 p-4 overflow-y-auto space-y-4 max-h-[54vh]">
          ${renderCatchMeUpCard(messages, peerInfo.name)}
          ${
            scenes.length > 0
              ? scenes
                  .map(
                    (scene) => `<div class="space-y-3">
                      ${
                        scene.dateSepText
                          ? `<div class="flex items-center justify-center my-2">
                              <span class="px-3 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-[10px] font-mono text-slate-400">${escapeHtml(
                                scene.dateSepText
                              )}</span>
                            </div>`
                          : ''
                      }
                      ${scene.clusters
                        .map(
                          (cluster) => `<div class="flex flex-col ${
                            cluster.isMine ? 'items-end' : 'items-start'
                          } space-y-1">
                            ${cluster.messages
                              .map(
                                (msg) => `<div
                                  id="dm-msg-${escapeAttr(msg.id)}"
                                  data-message-id="${escapeAttr(msg.id)}"
                                  class="max-w-lg rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow ${
                                    cluster.isMine
                                      ? 'bg-gradient-to-br from-cyan-500/25 to-sky-600/25 text-white border border-cyan-400/35'
                                      : 'bg-surface-raised/90 text-slate-100 border border-white/10'
                                  }"
                                >
                                  <div>${ renderOutcomeCard(msg.plaintext) || processChatMessageContent(msg.plaintext) }</div>${renderAttachmentCard(msg.attachment)}
                                  <div class="mt-1 flex items-center justify-end gap-1.5 text-[10px] font-mono text-slate-400">
                                    <span>${formatTime(msg.timestamp)}</span>${cluster.isMine ? '<span>✓✓ ZK</span>' : ''}
                                  </div>
                                </div>`
                              )
                              .join('')}
                          </div>`
                        )
                        .join('')}
                    </div>`
                  )
                  .join('')
              : `<div class="py-12 text-center text-xs text-slate-400">
                  End-to-end encrypted session initialized with <strong>${escapeHtml(peerInfo.name)}</strong>.
                </div>`
          }
        </div>

        <!-- DM Composer Bar -->
        <footer class="p-3.5 border-t border-white/10 bg-surface-base/90 relative">
          ${renderStagedAttachmentChip(sovereignDM.getPendingAttachment(), 'dm')}
          ${voiceNotesManager.renderRecorderBar()}
          ${renderComposerMenu('dm')}
          ${renderEmojiPopover('dm')}

          <form id="dm-workspace-form" class="flex items-center gap-2">
            <button
              type="button"
              data-action="window.toggleComposerMenu && window.toggleComposerMenu('dm')"
              aria-label="Open attachment menu"
              class="w-10 h-10 min-h-[40px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 flex items-center justify-center border border-white/10 cursor-pointer"
            >+</button>
            <input
              id="dm-workspace-input"
              type="text"
              value="${escapeAttr(currentDraft)}"
              placeholder="Write an E2EE message to ${escapeAttr(peerInfo.name)}..."
              aria-label="Encrypted message input"
              autocomplete="off"
              class="flex-1 min-h-[42px] px-4 py-2 rounded-2xl bg-black/40 text-sm text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:border-cyan-400/60"
            />
            <button
              type="button"
              data-action="window.toggleDMEmojiPicker && window.toggleDMEmojiPicker()"
              aria-label="Insert emoji"
              class="w-10 h-10 min-h-[40px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 flex items-center justify-center border border-white/10 cursor-pointer"
            >😊</button>
            <button
              type="submit"
              id="btn-send-dm-workspace"
              aria-label="Send encrypted message"
              class="px-4 py-2 min-h-[42px] rounded-2xl bg-gradient-to-b from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow cursor-pointer"
            >Send</button>
          </form>
        </footer>
      </section>
    </div>

    ${renderNewDMModal()}
    ${contextCapsuleManager.renderCreatorModal()}
    ${chatSearchEngine.renderSearchDrawer()}
  </div>`;
}

export function renderRelaysWorkspace(): string {
  if (activeMessagesTab === 'dm') {
    return renderDirectMessagesWorkspace();
  }

  const activeRelay = relaysManager.getActiveRelay();
  const channelId = clientStore.activeChannelId || 'relays-general';
  const msgs = clientStore.messages.get(channelId) || [];
  const currentDraft = getMessageDraft('relay', channelId);

  return `<div id="relays-workspace" class="w-full max-w-6xl mx-auto pb-14">
    ${renderMessagesTabHeader()}

    <div class="rounded-3xl bg-surface-base/85 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col min-h-[70vh]">
      ${relaysManager.renderRelayHeader(activeRelay, channelId, clientStore.keypair?.fingerprint)}

      <div id="relay-messages-scroll" class="flex-1 p-4 overflow-y-auto space-y-1 max-h-[54vh]">
        ${
          msgs.length > 0
            ? msgs.map((m, i) => renderMessageItem(m, i > 0 ? msgs[i - 1] : undefined)).join('')
            : `<div class="py-12 text-center text-xs text-slate-400">No messages in #${escapeHtml(
                channelId
              )} yet.</div>`
        }
      </div>

      <footer class="p-3.5 border-t border-white/10 bg-surface-base/90 relative">
        ${renderEmojiPopover('relay')}
        <form id="relay-chat-form" class="flex items-center gap-2">
          <input
            id="chat-message-input"
            type="text"
            value="${escapeAttr(currentDraft)}"
            placeholder="Broadcast to #${escapeAttr(channelId)} (ZK-RLN authenticated)..."
            aria-label="Relay channel message input"
            autocomplete="off"
            class="flex-1 min-h-[42px] px-4 py-2 rounded-2xl bg-black/40 text-sm text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:border-cyan-400/60"
          />
          <button
            type="button"
            data-action="window.toggleRelayEmojiPicker && window.toggleRelayEmojiPicker()"
            aria-label="Insert emoji"
            class="w-10 h-10 min-h-[40px] rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 flex items-center justify-center border border-white/10 cursor-pointer"
          >😊</button>
          <button
            type="submit"
            id="btn-send-relay-message"
            class="px-4 py-2 min-h-[42px] rounded-2xl bg-gradient-to-b from-cyan-400 to-cyan-500 text-slate-950 font-bold text-xs shadow cursor-pointer"
          >Broadcast</button>
        </form>
      </footer>
    </div>
  </div>`;
}

if (typeof window !== 'undefined') {
  (window as any).setActiveMessagesTab = setActiveMessagesTab;
  (window as any).openNewDMPicker = openNewDMPicker;
  (window as any).closeNewDMPicker = closeNewDMPicker;
  (window as any).toggleDMEmojiPicker = toggleDMEmojiPicker;
  (window as any).toggleRelayEmojiPicker = toggleRelayEmojiPicker;
  (window as any).toggleComposerMenu = toggleComposerMenu;
  (window as any).toggleCatchMeUp = toggleCatchMeUp;
}