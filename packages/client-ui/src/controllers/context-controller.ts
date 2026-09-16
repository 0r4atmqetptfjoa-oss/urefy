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
  } else if (action === 'keep-post' || action === 'keep-post-vault') {
    const post = clientStore.posts.find(item => item.id === element.dataset.postId);
    if (!post) throw new Error('The source post is not available');
    await knowledgeMemory.keep({ title: post.title.slice(0, 160) || 'Saved post', text: post.content || post.title,
      source: { kind: 'post', id: post.id, channelId: post.channelId, author: post.authorFingerprint, createdAt: post.createdAt } });
    clientStore.showToast('Post and source kept in your encrypted Vault.', 'success');
  } else if (action === 'keep-comment') {
    const commentId = element.dataset.commentId || '';
    const postId = element.dataset.postId || '';
    const author = element.dataset.commentAuthor || 'author';
    const commentEl = element.closest('.relative');
    const content = commentEl?.querySelector('.select-text')?.textContent?.trim() || element.dataset.commentContent || 'Saved comment';
    await knowledgeMemory.keep({
      title: `Comment from @${author.slice(0, 10)} in ${postId || 'discussion'}`,
      text: content,
      source: { kind: 'post', id: commentId || crypto.randomUUID(), channelId: postId, author, createdAt: Date.now() }
    });
    clientStore.showToast('Comment preserved in your encrypted Vault.', 'success');
  } else if (action === 'promote-post-knowledge') {
    const postId = element.dataset.postId;
    const post = clientStore.posts.find(item => item.id === postId);
    if (!post) throw new Error('The source post is not available');
    post.flair = 'VERIFIED RELEASE';
    await knowledgeMemory.keep({
      title: `[Community Knowledge] ${post.title.slice(0, 140)}`,
      text: post.content || post.title,
      source: { kind: 'post', id: post.id, channelId: post.channelId, author: post.authorFingerprint, createdAt: post.createdAt },
    });
    clientStore.showToast('Promoted to Community Knowledge Base & Vault!', 'success');
    clientStore.notifySync();
  } else if (action === 'live-msg-branch-to-discussion') {
    const channel = element.dataset.channel || 'c/general';
    const text = element.dataset.text || '';
    clientStore.activeChannelId = channel;
    clientStore.isComposerOpen = true;
    setTimeout(() => {
      const titleInput = document.getElementById('input-article-title') as HTMLInputElement | null;
      const bodyInput = (document.getElementById('input-article-body') || document.getElementById('input-inline-composer-text')) as HTMLTextAreaElement | null;
      if (titleInput && !titleInput.value) titleInput.value = `Discussion: ${text.slice(0, 60)}`;
      if (bodyInput) bodyInput.value = `> Evolved from Live Chat in ${channel}:\n> "${text}"\n\n`;
    }, 50);
    clientStore.showToast('Live message evolved into discussion draft.', 'info');
  } else if (action === 'dm-branch-to-discussion') {
    const branchId = sovereignDM.getActiveBranch();
    const branch = peer ? sovereignDM.getBranches(peer).find(item => item.id === branchId) : null;
    const title = branch?.title || 'Evolved Conversation';
    clientStore.activeChannelId = 'c/general';
    clientStore.isComposerOpen = true;
    setTimeout(() => {
      const titleInput = document.getElementById('input-article-title') as HTMLInputElement | null;
      const bodyInput = (document.getElementById('input-article-body') || document.getElementById('input-inline-composer-text')) as HTMLTextAreaElement | null;
      if (titleInput && !titleInput.value) titleInput.value = `Discussion: ${title}`;
      if (bodyInput) bodyInput.value = `> [ 🔗 Evolved from sovereign conversation branch: "${title}" ]\n\n`;
    }, 50);
    clientStore.showToast('Branch summary prepared for community discussion.', 'info');
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
