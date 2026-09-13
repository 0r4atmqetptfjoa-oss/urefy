/**
 * @file messages-view.ts
 * @package @aetheris/client-ui
 * @description Sovereign Relays & Live E2EE Direct Messaging Workspace View.
 */

import { clientStore, ClientMessage, DirectMessageAttachment } from './client-state.js';
import { relaysManager } from './relays-manager.js';
import { renderRelaysEmptyState } from './empty-states.js';
import { zkReputation } from './zk-reputation.js';
import { sovereignDM, DirectMessage } from './sovereign-dm.js';
import { MAX_PRIVATE_ATTACHMENT_BYTES } from './direct-messaging-client.js';
import { renderIcon } from './ui/icons.js';

export type MessagesTab = 'relays' | 'dm';
export let activeMessagesTab: MessagesTab = 'relays';
export let isNewDMPickerOpen: boolean = false;
export let isDMEmojiPickerOpen: boolean = false;
export let isRelayEmojiPickerOpen: boolean = false;
let dmSearchQuery: string = '';
let dmMessageDraft: string = '';
let relayMessageDraft: string = '';
const messageSelections: Record<'dm' | 'relay', { start: number; end: number }> = {
  dm: { start: 0, end: 0 },
  relay: { start: 0, end: 0 },
};

export function setMessageDraft(targetType: 'dm' | 'relay', value: string): void {
  const changed = getMessageDraft(targetType) !== value;
  if (targetType === 'dm') dmMessageDraft = value;
  else relayMessageDraft = value;
  if (changed) messageSelections[targetType] = { start: value.length, end: value.length };
}

export function getMessageDraft(targetType: 'dm' | 'relay'): string {
  return targetType === 'dm' ? dmMessageDraft : relayMessageDraft;
}

export function captureMessageSelection(targetType: 'dm' | 'relay', input: HTMLInputElement | null): void {
  if (!input || input.isConnected === false) return;
  setMessageDraft(targetType, input.value);
  messageSelections[targetType] = {
    start: input.selectionStart ?? input.value.length,
    end: input.selectionEnd ?? input.value.length,
  };
}

export function insertMessageEmoji(targetType: 'dm' | 'relay', emoji: string): number {
  const value = getMessageDraft(targetType);
  const selection = messageSelections[targetType];
  const start = Math.max(0, Math.min(selection.start, value.length));
  const end = Math.max(start, Math.min(selection.end, value.length));
  setMessageDraft(targetType, value.slice(0, start) + emoji + value.slice(end));
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
  sovereignDM.setInlineMode(true);
  sovereignDM.isOpen = tab === 'dm';
  if (tab === 'dm') void sovereignDM.startLiveSync();
}

export function getActiveMessagesTab(): MessagesTab {
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
}

export function toggleRelayEmojiPicker(open?: boolean): void {
  isRelayEmojiPickerOpen = typeof open === 'boolean' ? open : !isRelayEmojiPickerOpen;
  isDMEmojiPickerOpen = false;
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

function generateDeterministicGradient(seed: string): string {
  const gradients = [
    'from-cyan-500 via-blue-600 to-indigo-700',
    'from-purple-500 via-violet-600 to-pink-600',
    'from-emerald-400 via-teal-600 to-cyan-700',
    'from-amber-400 via-orange-500 to-red-600',
    'from-fuchsia-500 via-rose-500 to-purple-700',
    'from-sky-400 via-indigo-500 to-purple-600',
    'from-teal-400 via-emerald-600 to-blue-700',
  ];
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const idx = Math.abs(hash) % gradients.length;
  return gradients[idx];
}

export function renderAttachmentCard(att?: DirectMessageAttachment): string {
  if (!att || !att.dataUrl) return '';

  const isImg = att.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name);
  const isVideo = att.type?.startsWith('video/') || /\.(mp4|webm|ogg)$/i.test(att.name);
  const isAudio = att.type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(att.name);
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
      <div class="mt-2 p-2.5 rounded-xl border border-white/10 bg-surface-raised/80 max-w-sm space-y-1">
        <div class="text-[11px] font-mono font-bold text-slate-200 flex items-center space-x-1.5 truncate">
          <span>🎵</span>
          <span class="truncate">${escapeHtml(att.name)}</span>
        </div>
        <audio src="${escapeHtml(att.dataUrl)}" controls class="w-full h-8"></audio>
      </div>
    `;
  }

  return `
    <div class="mt-2 flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-raised/90 border border-white/10 max-w-sm shadow-xs">
      <div class="flex items-center space-x-2.5 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-sm shrink-0">
          📁
        </div>
        <div class="min-w-0">
          <div class="text-xs font-mono font-bold text-slate-200 truncate">${escapeHtml(att.name)}</div>
          <div class="text-[10px] font-mono text-slate-400">${sizeFormatted} ${att.sha256 ? `• ${att.sha256.slice(0, 8)}` : ''}</div>
        </div>
      </div>
      <a 
        href="${escapeHtml(att.dataUrl)}" 
        download="${escapeHtml(att.name)}"
        class="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[11px] font-bold transition-all shrink-0 flex items-center space-x-1 cursor-pointer"
        title="Download file"
      >
        <span>⬇</span>
      </a>
    </div>
  `;
}

export function renderEmojiPopover(targetType: 'dm' | 'relay'): string {
  const isOpen = targetType === 'dm' ? isDMEmojiPickerOpen : isRelayEmojiPickerOpen;
  if (!isOpen) return '';

  return `
    <div class="absolute bottom-full mb-2 left-2 z-30 p-2.5 rounded-2xl bg-surface-base border border-white/10 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 max-w-xs select-none">
      <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/5 text-[10px] font-mono text-slate-400">
        <span class="font-bold text-white">Emoji</span>
        <button type="button" data-action="${targetType === 'dm' ? 'toggle-dm-emoji' : 'toggle-relay-emoji'}" class="hover:text-white p-0.5 cursor-pointer">✕</button>
      </div>
      <div class="grid grid-cols-6 gap-1 text-lg">
        ${CHAT_EMOJIS.map(e => `
          <button 
            type="button" 
            data-action="${targetType === 'dm' ? 'insert-dm-emoji' : 'insert-relay-emoji'}" 
            data-emoji="${e}"
            class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-all hover:scale-125 cursor-pointer"
          >
            ${e}
          </button>
        `).join('')}
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

export function renderMessageItem(m: ClientMessage): string {
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (clientStore.density === 'compact') {
    return `
      <div class="font-mono text-xs leading-tight py-1 hover:bg-surface-raised/40 px-2 rounded-lg flex items-baseline space-x-2 transition-colors msg-bubble-enter max-w-full overflow-hidden">
        <span class="text-slate-500 text-[10px] shrink-0">${time}</span>
        <span class="text-cyphr font-bold shrink-0">&lt;id:${m.authorFingerprint.substring(0, 8)}&gt;</span>
        <div class="text-slate-200 select-text break-words break-all [overflow-wrap:anywhere] min-w-0 flex-1">
          ${m.text ? `<div>${escapeHtml(m.text)}</div>` : ''}
          ${renderAttachmentCard(m.attachment)}
        </div>
      </div>
    `;
  }

  return `
    <div class="relay-message p-3.5 rounded-lg bg-surface-raised/80 hover:bg-surface-raised border border-white/5 transition-colors space-y-1.5 msg-bubble-enter max-w-full overflow-hidden">
      <div class="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap min-w-0">
          <div class="w-6 h-6 rounded-xl bg-gradient-to-br from-cyphr/30 to-aether/30 border border-cyphr/30 flex items-center justify-center font-mono text-[10px] font-bold text-white shadow-sm">
            ${m.authorFingerprint.substring(0, 2).toUpperCase()}
          </div>
          <span class="font-mono text-xs font-semibold text-cyphr">id:${m.authorFingerprint.substring(0, 12)}...</span>
          ${m.isMine ? '<span class="text-[9px] font-mono font-bold bg-cyphr/15 text-cyphr border border-cyphr/30 px-1.5 py-0.2 rounded-md">YOU</span>' : '<span class="text-[9px] font-mono bg-emerald-950 text-signal border border-signal/20 px-1.5 py-0.2 rounded-md">ZK-Verified</span>'}
          ${clientStore.showTrustBadges ? zkReputation.renderInlineTrustBadge(m.authorFingerprint) : ''}
        </div>
        <span class="text-[10px] font-mono text-slate-500">${time}</span>
      </div>
      <div class="message-body text-sm text-slate-200 select-text leading-relaxed pl-8 break-words [overflow-wrap:anywhere] min-w-0">
        ${m.text ? `<div class="whitespace-pre-wrap">${escapeHtml(m.text)}</div>` : ''}
        ${renderAttachmentCard(m.attachment)}
      </div>
    </div>
  `;
}

/**
 * Renders Top Navigation Switcher between Sovereign Relays (channels) and Direct Messages (E2EE 1-on-1).
 */
export function renderMessagesTabHeader(): string {
  const totalUnread = sovereignDM.getTotalUnreadCount();

  return `
    <div class="h-12 border-subtle-b bg-surface-base/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-10">
      <div class="flex items-center space-x-2">
        <button 
          type="button" 
          data-action="switch-messages-tab" 
          data-tab="relays"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeMessagesTab === 'relays'
              ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-white/20'
              : 'bg-surface-raised/60 hover:bg-surface-raised text-slate-300 border border-white/5'
          }"
        >
          ${renderIcon('radio', { size: 17 })}
          <span>Communities</span>
        </button>
        <button 
          type="button" 
          data-action="switch-messages-tab" 
          data-tab="dm"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
            activeMessagesTab === 'dm'
              ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-white/20'
              : 'bg-surface-raised/60 hover:bg-surface-raised text-slate-300 border border-white/5'
          }"
        >
          ${renderIcon('messages', { size: 17 })}
          <span>Direct</span>
          ${
            totalUnread > 0
              ? `<span class="px-1.5 py-0.2 bg-crimson text-white rounded-full text-[10px] font-bold animate-pulse">${totalUnread}</span>`
              : ''
          }
        </button>
      </div>
      <div class="hidden sm:flex items-center space-x-3 text-[11px] font-mono text-slate-400">
        <span class="flex items-center space-x-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-signal animate-pulse"></span>
          <span>${activeMessagesTab === 'dm' ? 'Private conversation' : 'Community chat'}</span>
        </span>
        <span class="text-slate-600">•</span>
        <span class="text-cyphr">End-to-end encrypted</span>
      </div>
    </div>
  `;
}

/**
 * Renders modal for initiating a new direct message conversation.
 */
export function renderNewDMModal(): string {
  if (!isNewDMPickerOpen) return '';

  const knownPeers = clientStore.members.filter(member => member.fingerprint !== clientStore.keypair.fingerprint)
    .map(member => ({ fp: member.fingerprint, role: member.role, alias: `id:${member.fingerprint.slice(0, 12)}` }));

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
            <label class="block text-[11px] text-slate-400 font-semibold mb-1.5">Handle or UREfy ID</label>
            <div class="flex space-x-2">
              <input 
                type="text" 
                id="input-new-dm-peer" 
                placeholder="@username" 
                class="flex-1 bg-surface-raised border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button 
                type="button" 
                data-action="submit-new-dm-peer" 
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Chat
              </button>
            </div>
          </div>

          <div>
            <label class="block text-[11px] text-slate-400 font-semibold mb-2">Suggested people</label>
            <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              ${knownPeers.map(p => `
                <div 
                  data-action="start-dm-with-peer" 
                  data-peer="${p.fp}" 
                  data-role="${p.role}"
                  class="p-2.5 rounded-xl bg-surface-raised/60 hover:bg-surface-raised border border-white/5 hover:border-indigo-500/30 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div class="flex items-center space-x-2.5">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-tr ${generateDeterministicGradient(p.fp)} flex items-center justify-center text-white font-mono font-bold text-[10px] shadow-sm">
                      ${p.fp.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div class="text-xs font-semibold text-white group-hover:text-cyphr transition-colors">${escapeHtml(p.alias)}</div>
                      <div class="text-[10px] font-mono text-slate-500">node_${escapeHtml(p.fp.substring(0, 8))}</div>
                    </div>
                  </div>
                  <span class="text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                    p.role === 'GUARDIAN' ? 'bg-amber/15 text-amber border-amber/30' :
                    p.role === 'ARCHIVIST' ? 'bg-cyphr/15 text-cyphr border-cyphr/30' :
                    'bg-slate-800 text-slate-300 border-white/10'
                  }">
                    ${p.role}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="p-3 bg-surface-raised/30 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>🔒 100% Zero-Knowledge forward secrecy</span>
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
  const activePeerFP = sovereignDM.activePeerFP || (allConversations.length > 0 ? allConversations[0].peerFingerprint : null);
  const myFP = clientStore.keypair?.fingerprint || 'me_local_node_0x9f4e';

  const activeConv = activePeerFP ? sovereignDM.getConversation(activePeerFP) : null;
  const messages: DirectMessage[] = activeConv?.messages || [];

  const filteredConversations = allConversations.filter(c => {
    if (!dmSearchQuery.trim()) return true;
    const q = dmSearchQuery.toLowerCase();
    return c.peerFingerprint.toLowerCase().includes(q) || c.peerRole.toLowerCase().includes(q);
  });

  return `
    <div class="direct-messages-workspace ${activeConv ? 'has-active-conversation' : ''} flex-1 flex overflow-hidden bg-canvas">
      <!-- 1. LEFT SIDEBAR: PEER CONVERSATIONS LIST -->
      <aside class="conversation-list w-80 border-subtle-r bg-surface-base/80 flex flex-col shrink-0 overflow-hidden">
        <!-- SEARCH & NEW CHAT BAR -->
        <div class="p-3 border-b border-white/5 space-y-2.5">
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <span>💬</span>
              <span>Direct Messages</span>
            </h2>
            <button 
              type="button" 
              data-action="new-dm-conversation"
              class="px-2.5 py-1 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
              title="Start a new E2EE conversation"
            >
              <span>+</span>
              <span>New Chat</span>
            </button>
          </div>
          <div class="relative">
            <input 
              type="text" 
              id="input-dm-search" 
              placeholder="Search conversations..." 
              value="${escapeHtml(dmSearchQuery)}"
              data-action="search-dm-peers"
              class="w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans"
            />
          </div>
        </div>

        <!-- CONVERSATIONS LIST -->
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          ${filteredConversations.length === 0 ? `
            <div class="p-6 text-center text-slate-500 text-xs space-y-2">
              <p>No conversations yet.</p>
              <button 
                type="button" 
                data-action="new-dm-conversation"
                class="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline"
              >
                Start a direct message
              </button>
            </div>
          ` : filteredConversations.map(conv => {
            const isSelected = activePeerFP === conv.peerFingerprint;
            const lastMsg = conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
            const snippet = lastMsg ? lastMsg.plaintext : 'No messages yet';
            const gradient = generateDeterministicGradient(conv.peerFingerprint);

            return `
              <div 
                data-action="select-dm-peer" 
                data-peer="${conv.peerFingerprint}"
                class="p-2.5 rounded-xl transition-all cursor-pointer flex items-center space-x-3 border ${
                  isSelected 
                    ? 'bg-surface-raised border-indigo-500/40 shadow-sm' 
                    : 'bg-transparent hover:bg-surface-raised/40 border-transparent'
                }"
              >
                <!-- Avatar -->
                <div class="relative shrink-0">
                  <div class="w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-mono font-bold text-xs shadow-sm border border-white/10">
                    ${conv.peerFingerprint.substring(0, 2).toUpperCase()}
                  </div>
                  <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-signal border-2 border-surface-base"></span>
                </div>

                <!-- Text details -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-200 truncate">${escapeHtml(conv.peerFingerprint.substring(0, 10))}</span>
                    <span class="text-[10px] font-mono text-slate-500 shrink-0">${formatRelative(conv.lastMessageAt)}</span>
                  </div>
                  <div class="flex items-center justify-between mt-0.5">
                    <p class="text-[11px] text-slate-400 truncate pr-2">${escapeHtml(snippet)}</p>
                    ${conv.unreadCount > 0 ? `
                      <span class="px-1.5 py-0.2 bg-crimson text-white rounded-full text-[10px] font-bold shrink-0">
                        ${conv.unreadCount}
                      </span>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </aside>

      <!-- 2. RIGHT CHAT THREAD AREA -->
      <main class="conversation-pane flex-1 flex flex-col overflow-hidden bg-canvas">
        ${!activeConv ? `
          <div class="flex-1 flex items-center justify-center p-8 text-center">
            <div class="max-w-md space-y-3">
              <div class="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-3xl">
                💬
              </div>
              <h3 class="text-base font-bold text-white">Private messages</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Select a conversation or start a private chat with someone on UREfy.
              </p>
              <button 
                type="button" 
                data-action="new-dm-conversation"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Start New Chat
              </button>
            </div>
          </div>
        ` : `
          <!-- ACTIVE THREAD HEADER -->
          <div class="h-16 px-4 md:px-6 border-b border-white/5 bg-surface-base/70 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0">
            <div class="flex items-center space-x-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr ${generateDeterministicGradient(activeConv.peerFingerprint)} flex items-center justify-center text-white font-mono font-bold text-xs shadow-sm border border-white/10 shrink-0">
                ${activeConv.peerFingerprint.substring(0, 2).toUpperCase()}
              </div>
              <div class="min-w-0">
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-bold text-white truncate">${escapeHtml(activeConv.peerFingerprint.substring(0, 10))}</span>
                  <span class="text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                    activeConv.peerRole === 'GUARDIAN' ? 'bg-amber/15 text-amber border-amber/30' :
                    activeConv.peerRole === 'ARCHIVIST' ? 'bg-cyphr/15 text-cyphr border-cyphr/30' :
                    'bg-surface-raised text-slate-300 border-white/10'
                  }">
                    ${escapeHtml(activeConv.peerRole)}
                  </span>
                </div>
                <div class="flex items-center space-x-2 mt-0.5 text-[10px] font-mono text-slate-400">
                  <span class="flex items-center space-x-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-signal"></span>
                    <span class="text-signal">Online</span>
                  </span>
                  <span>•</span>
                  <span>Private conversation</span>
                </div>
              </div>
            </div>

            <!-- HEADER ACTIONS -->
            <div class="flex items-center space-x-2 shrink-0">
              <button 
                type="button" 
                data-action="open-dm-safety" 
                class="px-2.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5 text-xs font-mono flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Verify cryptographic safety numbers"
              >
                <span>🛡️</span>
                <span class="hidden sm:inline">Verify</span>
              </button>

              <button 
                type="button" 
                data-action="toggle-dm-ciphertext" 
                class="px-2.5 py-1.5 rounded-xl ${
                  sovereignDM.showCiphertextToggle 
                    ? 'bg-emerald-950 text-signal border border-signal/40' 
                    : 'bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5'
                } text-xs font-mono flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Toggle ciphertext vs plaintext view"
              >
                <span>🔐</span>
                <span class="hidden sm:inline">${sovereignDM.showCiphertextToggle ? 'Ciphertext: ON' : 'Inspect Cipher'}</span>
              </button>

              <button 
                type="button" 
                data-action="send-dm-ping"
                class="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Send an encrypted connectivity check"
              >
                <span>⚡</span>
                <span class="hidden sm:inline">Secure Ping</span>
              </button>
            </div>
          </div>

          <!-- MESSAGES THREAD SCROLL -->
          <div id="dm-thread-messages" class="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 max-w-4xl mx-auto w-full">
            ${messages.length === 0 ? `
              <div class="p-8 text-center space-y-2 text-slate-500 text-xs">
                <p>This is the beginning of your private conversation.</p>
                <p class="text-[11px] text-slate-600">Only you and the other person can read messages here.</p>
              </div>
            ` : messages.map(msg => {
              const isMine = msg.senderFP === myFP;
              const timeStr = formatTime(msg.timestamp);

              return `
                <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1">
                  <div class="flex items-center space-x-2 text-[10px] font-mono text-slate-500 px-1">
                    <span>${isMine ? 'YOU' : `node_${msg.senderFP.substring(0, 6)}`}</span>
                    <span>•</span>
                    <span>${timeStr}</span>
                    ${isMine ? '<span class="text-signal">✓ Encrypted</span>' : ''}
                  </div>

                  <div class="max-w-[85%] md:max-w-lg rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed select-text break-words break-all [overflow-wrap:anywhere] min-w-0 overflow-hidden ${
                    isMine 
                      ? 'bg-indigo-600 text-white rounded-br-sm' 
                      : 'bg-surface-raised text-slate-200 border border-white/5 rounded-bl-sm'
                  }">
                    ${sovereignDM.showCiphertextToggle ? `
                      <div class="font-mono text-[10px] text-emerald-400 bg-black/40 p-2 rounded-lg border border-emerald-500/30 break-all space-y-1">
                        <div class="text-slate-400 font-bold">SIGNED ENCRYPTED ENVELOPE:</div>
                        <div>${escapeHtml(msg.encryptedPayload)}</div>
                      </div>
                    ` : `
                      ${msg.plaintext ? `<div class="whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere] min-w-0">${escapeHtml(msg.plaintext)}</div>` : ''}
                    `}
                    ${renderAttachmentCard(msg.attachment)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- DM COMPOSER FORM -->
          <div class="p-3 md:p-4 border-subtle-t bg-surface-base shrink-0 shadow-sm relative">
            ${sovereignDM.syncError ? `<div role="status" class="mb-2 text-xs text-amber-300">${escapeHtml(sovereignDM.syncError)}</div>` : ''}
            ${renderEmojiPopover('dm')}
            ${renderStagedAttachmentChip(sovereignDM.getPendingAttachment(), 'dm')}

            <!-- Hidden File Input -->
            <input 
              type="file" 
              id="input-dm-attachment-file" 
              class="hidden" 
              data-change="dm-file-attached"
              accept="image/*,video/*,audio/*,.pdf,.zip,.tar,.gz,.txt,.md,.json,.csv,.doc,.docx"
            />

            <form id="form-send-dm-message" data-submit="submit-dm-message" class="flex items-center space-x-2 max-w-4xl mx-auto">
              <!-- Attachment Button -->
              <button
                type="button"
                data-action="trigger-dm-attachment"
                class="p-2.5 rounded-xl bg-surface-raised hover:bg-surface-elevated text-slate-400 hover:text-slate-200 border border-white/10 transition-colors cursor-pointer shrink-0"
                title="Attach encrypted file (up to 128 KiB)" aria-label="Attach encrypted file"
              >
                📎
              </button>

              <!-- Emoji Button -->
              <button
                type="button"
                data-action="toggle-dm-emoji"
                class="p-2.5 rounded-xl bg-surface-raised hover:bg-surface-elevated text-slate-400 hover:text-amber-400 border border-white/10 transition-colors cursor-pointer shrink-0"
                title="Add emoji"
              >
                😊
              </button>

              <div class="relative flex-1">
                <input 
                  type="text" 
                  id="input-dm-message"
                  data-input="update-dm-draft"
                  value="${escapeHtml(dmMessageDraft)}"
                  placeholder="Write a private message..."
                  class="w-full bg-surface-raised border border-white/10 rounded-2xl px-4 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans"
                  autocomplete="off"
                />
              </div>
              <button 
                type="submit" 
                class="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <span>Send</span>
                <span>⚡</span>
              </button>
            </form>
          </div>
        `}
      </main>
    </div>
    ${renderNewDMModal()}
  `;
}

/**
 * Main Workspace View for Messages: provides seamless switching between Sovereign Relays and Direct Messages.
 */
export function renderRelaysWorkspace(): string {
  if (activeMessagesTab === 'dm') {
    return `
      <div class="flex-1 flex flex-col overflow-hidden bg-canvas">
        ${renderMessagesTabHeader()}
        ${renderDirectMessagesWorkspace()}
      </div>
    `;
  }

  const activeRelay = relaysManager.getActiveRelay();
  const messages = clientStore.messages.get(clientStore.activeChannelId) || [];
  const channelName = clientStore.activeChannelId.replace(/^relay-.*?-(general|announcements|voice-room|dev-core|dev|voice-radar|lounge)/, '$1').replace('relays-', '');

  return `
    <div class="flex-1 flex flex-col overflow-hidden bg-canvas">
      <!-- WORKSPACE TAB SWITCHER -->
      ${renderMessagesTabHeader()}

      <!-- SOVEREIGN RELAYS SPLIT WORKSPACE -->
      <div class="relay-messages-workspace flex-1 flex overflow-hidden">
        <!-- 1. SOVEREIGN RELAY SERVER RAIL (LEFT-MOST ICON STRIP) -->
        ${relaysManager.renderRelayServerRail()}

        <!-- 2. RELAY CHANNELS LIST & MAIN CHAT AREA -->
        <div class="flex-1 flex flex-col overflow-hidden">
          <!-- RELAY TOP BANNER WITH INVITE FRIENDS BUTTON -->
          ${relaysManager.renderRelayHeader(activeRelay, channelName, clientStore.keypair?.fingerprint)}

          <!-- MESSAGES FEED -->
          <div id="messages-container" class="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto space-y-${clientStore.density === 'compact' ? '1' : clientStore.density === 'balanced' ? '3' : '5'} max-w-4xl mx-auto w-full pb-20 md:pb-6">
            ${messages.length === 0 ? renderRelaysEmptyState({
              title: `Channel #${channelName} has no messages yet`,
              description: `This is the beginning of #${channelName}. Messages in this space are protected in transit.`,
              actionText: 'Send the first message',
            }) : messages.map(m => renderMessageItem(m)).join('')}
          </div>

          <!-- RELAYS COMPOSER -->
          <div class="p-3 md:p-4 border-subtle-t bg-surface-base shrink-0 shadow-sm relative">
            ${renderEmojiPopover('relay')}
            ${renderStagedAttachmentChip(clientStore.pendingRelayAttachment, 'relay')}

            <!-- Hidden File Input -->
            <input 
              type="file" 
              id="input-relay-attachment-file" 
              class="hidden" 
              data-change="relay-file-attached"
              accept="image/*,video/*,audio/*,.pdf,.zip,.tar,.gz,.txt,.md,.json,.csv,.doc,.docx"
            />

            <form id="form-send-message" data-submit="submit-relay-message" class="flex items-center space-x-2 max-w-4xl mx-auto">
              <!-- Attachment Button -->
              <button
                type="button"
                data-action="trigger-relay-attachment"
                class="p-2.5 rounded-xl bg-surface-raised hover:bg-surface-elevated text-slate-400 hover:text-slate-200 border border-white/10 transition-colors cursor-pointer shrink-0"
                title="Attach file or media (up to 50MB)"
              >
                📎
              </button>

              <!-- Emoji Button -->
              <button
                type="button"
                data-action="toggle-relay-emoji"
                class="p-2.5 rounded-xl bg-surface-raised hover:bg-surface-elevated text-slate-400 hover:text-amber-400 border border-white/10 transition-colors cursor-pointer shrink-0"
                title="Add emoji"
              >
                😊
              </button>

              <div class="relative flex-1">
                <input 
                  type="text" 
                  id="input-message"
                  data-input="update-relay-draft"
                  value="${escapeHtml(relayMessageDraft)}"
                  placeholder="Message #${channelName}"
                  class="w-full bg-surface-raised border border-white/10 rounded-2xl px-4 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all font-sans"
                  autocomplete="off"
                />
              </div>
              <button type="submit" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer shrink-0">
                <span>Send</span>
                <span>⚡</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Schedule dropzone attachment after rendering
setTimeout(() => {
  attachChatDropzoneListeners();
}, 50);
