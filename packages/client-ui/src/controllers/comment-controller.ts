import { clientStore } from '../client-state.js';
import { threadManager } from '../threads.js';
import { pulseActionsEngine } from '../pulse-actions.js';

/** Reconcile only acknowledged comments. A failed send leaves the composer's draft intact. */
export async function publishComment(postId: string, text: string, parentId?: string): Promise<void> {
  await clientStore.identityPersistence;
  const owner = clientStore.keypair.fingerprint;
  const envelope = clientStore.createSignedEnvelope({ action: 'create-comment', postId, content: text, ...(parentId ? { parentId } : {}) });
  const response = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envelope) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success || typeof data.comment?.id !== 'string' || data.comment.postId !== postId || data.comment.authorId !== owner) {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || data?.retryAfterSeconds || 60;
      clientStore.setRateLimitCooldown(Number(retryAfter));
      throw new Error(`Rate limit reached. Please wait ${retryAfter} seconds before trying again. Your reply draft is preserved.`);
    }
    throw new Error(data?.error || 'Your reply was not confirmed. Your draft is still here.');
  }
  if (clientStore.keypair.fingerprint !== owner) return;
  if (threadManager.getComment(data.comment.id)) return;
  threadManager.addReply(parentId || postId, owner, data.comment.content, postId, { id: data.comment.id, createdAt: data.comment.createdAt, meritScore: data.comment.meritVotes || 0 });
  const post = clientStore.posts.find(post => post.id === postId);
  if (post) post.replyCount = (post.replyCount || 0) + 1;
  const state = pulseActionsEngine.getInteractions(postId);
  state.repliesCount = Math.max(state.repliesCount + 1, post?.replyCount || 1);
}
