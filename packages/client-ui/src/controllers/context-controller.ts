import { clientStore } from '../client-state.js';
import { sovereignDM } from '../sovereign-dm.js';
import { sovereignDialog } from '../dialog-modal.js';
import { branchOf } from '../conversation-context.js';
import { knowledgeMemory } from '../knowledge-memory.js';

export async function handleContextAction(action: string, element: HTMLElement): Promise<void> {
  const peer = sovereignDM.activePeerFP;
  const conversation = peer ? sovereignDM.getConversation(peer) : null;
  const message = conversation?.messages.find(item => item.id === element.dataset.messageId);
  if (action === 'dm-back') { sovereignDM.activePeerFP = null; sovereignDM.replyToId = null; }
  else if (action === 'reply-dm-message' && message) sovereignDM.replyToId = message.id;
  else if (action === 'cancel-dm-reply') sovereignDM.replyToId = null;
  else if (action === 'react-dm-message' && message) await sovereignDM.reactToMessage(message.id, element.dataset.emoji || '');
  else if ((action === 'keep-dm-message' || action === 'keep-dm-branch') && peer && conversation) {
    const branchId = sovereignDM.getActiveBranch();
    const branch = sovereignDM.getBranches(peer).find(item => item.id === branchId);
    const selected = message ? [message] : conversation.messages.filter(item => !item.context?.reaction && branchOf(item) === branchId && item.deliveryStatus !== 'failed');
    const source = branch && conversation.messages.find(item => item.id === branch.sourceMessageId);
    if (!selected.length && !source) throw new Error('There are no delivered messages to keep');
    const entries = source && !message ? [source, ...selected] : selected;
    await knowledgeMemory.keep({ title: message ? message.plaintext.slice(0, 100) || 'Saved message' : branch?.title || 'Saved conversation',
      text: entries.map(item => `${item.senderFP} · ${new Date(item.timestamp).toISOString()}\n${item.plaintext}${item.attachment ? `\nAttachment: ${item.attachment.name} (return to the source to open)` : ''}`).join('\n\n'),
      source: { kind: message ? 'message' : 'branch', id: message?.id || branchId, peer, branchId,
        author: message?.senderFP || branch?.createdBy || clientStore.keypair.fingerprint,
        createdAt: message?.timestamp || branch?.createdAt || Date.now() } });
    clientStore.showToast('Kept in your encrypted Vault on this device.', 'success');
  } else if (action === 'keep-post') {
    const post = clientStore.posts.find(item => item.id === element.dataset.postId);
    if (!post) throw new Error('The source post is not available');
    await knowledgeMemory.keep({ title: post.title.slice(0, 160) || 'Saved post', text: post.content || post.title,
      source: { kind: 'post', id: post.id, channelId: post.channelId, author: post.authorFingerprint, createdAt: post.createdAt } });
    clientStore.showToast('Post and source kept in your encrypted Vault.', 'success');
  } else if (action === 'keep-note' || action === 'save-link') {
    const value = await sovereignDialog.prompt(action === 'save-link' ? 'Paste an http or https link. UREfy will not fetch it automatically.' : 'Write something you want to return to.', { title: action === 'save-link' ? 'Keep a link' : 'Private note' });
    if (!value?.trim()) return;
    const url = action === 'save-link' ? new URL(value.trim()) : undefined;
    if (url && !['https:', 'http:'].includes(url.protocol)) throw new Error('Use an http or https link');
    await knowledgeMemory.keep({ title: url?.hostname || value.slice(0, 100), text: value,
      source: { kind: url ? 'link' : 'note', id: url?.href || crypto.randomUUID(), author: clientStore.keypair.fingerprint, createdAt: Date.now(), ...(url ? { url: url.href } : {}) } });
    clientStore.showToast('Kept privately on this device.', 'success');
  }
  clientStore.notifySync();
  if (action === 'reply-dm-message') document.getElementById('input-dm-message')?.focus();
}
