import { clientStore } from '../client-state.js';
import { sovereignDM } from '../sovereign-dm.js';
import { sovereignDialog } from '../dialog-modal.js';
import { branchOf } from '../conversation-context.js';
import { knowledgeMemory } from '../knowledge-memory.js';
import { canonicalVault } from '../canonical-vault.js';

export async function handleContextAction(action: string, element: HTMLElement): Promise<void> {
  const peer = sovereignDM.activePeerFP;
  const conversation = peer ? sovereignDM.getConversation(peer) : null;
  const message = conversation?.messages.find(item => item.id === element.dataset.messageId);
  if (action === 'react-dm-message' && message) await sovereignDM.reactToMessage(message.id, element.dataset.emoji || '');
  else if ((action === 'keep-dm-message' || action === 'save-message-vault' || action === 'keep-dm-branch') && peer && conversation) {
    const branchId = sovereignDM.getActiveBranch();
    const branch = sovereignDM.getBranches(peer).find(item => item.id === branchId);
    if ((action === 'keep-dm-message' || action === 'save-message-vault') && !message) throw new Error('The source message is no longer available');
    if (message?.deliveryStatus === 'failed' || message?.deliveryStatus === 'sending') throw new Error('Wait until this message is sent before keeping it');
    const selected = message ? [message] : conversation.messages.filter(item => !item.context?.reaction && branchOf(item) === branchId && item.deliveryStatus !== 'failed' && item.deliveryStatus !== 'sending');
    const source = branch && conversation.messages.find(item => item.id === branch.sourceMessageId);
    if (!selected.length && !source) throw new Error('There are no delivered messages to keep');
    const entries = source && !message ? [source, ...selected] : selected;
    await knowledgeMemory.keep({ title: message ? message.plaintext.slice(0, 100) || 'Saved message' : branch?.title || 'Saved conversation',
      text: entries.map(item => `${item.senderFP} · ${new Date(item.timestamp).toISOString()}\n${item.plaintext}${item.attachment ? `\nAttachment: ${item.attachment.name} (return to the source to open)` : ''}`).join('\n\n'),
      source: { kind: message ? 'message' : 'branch', id: message?.id || branchId, peer, branchId,
        author: message?.senderFP || branch?.createdBy || clientStore.keypair.fingerprint,
        createdAt: message?.timestamp || branch?.createdAt || Date.now() } });
    if (message) {
      void canonicalVault.saveMessage({
        id: message.id,
        content: message.plaintext,
        authorFingerprint: message.senderFP,
        authorName: message.senderFP.substring(0, 10),
        peer,
        createdAt: message.timestamp,
      });
    }
    clientStore.showToast('Saved to your encrypted Vault on this device.', 'success');
  } else if (action === 'unsave-message-vault') {
    const msgId = element.dataset.messageId;
    if (msgId) {
      await canonicalVault.unsaveMessage(msgId);
      clientStore.showToast('Message removed from Vault.', 'info');
    }
  } else if (action === 'keep-post' || action === 'keep-post-vault') {
    const post = clientStore.posts.find(item => item.id === element.dataset.postId);
    if (!post) throw new Error('The source post is not available');
    await knowledgeMemory.keep({ title: post.title.slice(0, 160) || 'Saved post', text: post.content || post.title,
      source: { kind: 'post', id: post.id, channelId: post.channelId, author: post.authorFingerprint, createdAt: post.createdAt } });
    clientStore.showToast('Post and source kept in your encrypted Vault.', 'success');
  } else if (action === 'keep-comment') {
    const commentId = element.dataset.commentId || '';
    const postId = element.dataset.postId || '';
    const { threadManager } = await import('../threads.js');
    const comment = threadManager.getComment(commentId);
    if (!comment || comment.postId !== postId) throw new Error('The source comment is no longer available');
    await knowledgeMemory.keep({
      title: `Comment from @${comment.authorFingerprint.slice(0, 10)}`,
      text: comment.content,
      source: { kind: 'comment', id: comment.id, postId, author: comment.authorFingerprint, createdAt: comment.createdAt }
    });
    clientStore.showToast('Comment preserved in your encrypted Vault.', 'success');
  } else if (action === 'keep-live-message') {
    const channelId = element.dataset.channel || '';
    const source = clientStore.messages.get(channelId)?.find(item => item.id === element.dataset.messageId);
    if (!source) throw new Error('The source message is no longer available');
    await knowledgeMemory.keep({ title: source.text.slice(0, 100) || 'Community message', text: source.text,
      source: { kind: 'message', id: source.id, channelId, author: source.authorFingerprint, createdAt: source.createdAt } });
    void canonicalVault.saveMessage({
      id: source.id,
      content: source.text,
      authorFingerprint: source.authorFingerprint,
      channelId,
      createdAt: source.createdAt,
    });
    clientStore.showToast('Community message saved to your encrypted Vault.', 'success');
  } else if (action === 'keep-note' || action === 'save-link') {
    const value = await sovereignDialog.prompt(action === 'save-link' ? 'Paste an http or https link. UREfy will not fetch it automatically.' : 'Write something you want to return to.', { title: action === 'save-link' ? 'Keep a link' : 'Private note' });
    if (!value?.trim()) return;
    const url = action === 'save-link' ? new URL(value.trim()) : undefined;
    if (url && !['https:', 'http:'].includes(url.protocol)) throw new Error('Use an http or https link');
    const title = url?.hostname || value.slice(0, 100);
    await knowledgeMemory.keep({ title, text: value,
      source: { kind: url ? 'link' : 'note', id: url?.href || crypto.randomUUID(), author: clientStore.keypair.fingerprint, createdAt: Date.now(), ...(url ? { url: url.href } : {}) } });
    void canonicalVault.saveNote(title, value, '', url ? ['link'] : ['note']);
    clientStore.showToast('Kept privately in your encrypted Vault.', 'success');
  }
  clientStore.notifySync();
}
