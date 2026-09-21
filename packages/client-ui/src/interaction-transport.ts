export type SocialAction = 'like' | 'repost' | 'bookmark' | 'reaction' | 'award';
export interface InteractionResult { success: true; active: boolean; newCount: number; value?: string; targetId?: string; targetType?: string; }

/** Mutations carry a desired state, so retrying cannot accidentally toggle it back. */
export async function persistInteraction(
  targetId: string,
  action: SocialAction,
  active: boolean,
  value?: string,
  targetType: 'post' | 'comment' = 'post'
): Promise<InteractionResult> {
  const { clientStore } = await import('./client-state.js');
  await clientStore.identityPersistence;
  const envelope = clientStore.createSignedEnvelope({
    scope: 'urefy-interaction-v1',
    targetId,
    targetType,
    action,
    active,
    ...(value ? { value } : {}),
  });
  const response = await fetch('/api/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success !== true || typeof data.active !== 'boolean' || !Number.isFinite(data.newCount)) {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || data?.retryAfterSeconds || 60;
      clientStore.setRateLimitCooldown(Number(retryAfter));
      throw new Error(`Rate limit reached. Please wait ${retryAfter} seconds before reacting again.`);
    }
    throw new Error(data?.error || 'Could not save this action. Check your connection and try again.');
  }
  return data;
}

export async function notifyInteractionChange(error?: unknown): Promise<void> {
  const { clientStore } = await import('./client-state.js');
  if (error) clientStore.showToast(error instanceof Error ? error.message : 'Could not save this action. Try again.', 'warning');
  clientStore.notify();
}

export async function persistCommentVote(
  commentId: string,
  direction: number
): Promise<{ meritVotes: number; userVote: number }> {
  const { clientStore } = await import('./client-state.js');
  await clientStore.identityPersistence;
  const envelope = clientStore.createSignedEnvelope({
    action: 'vote-comment',
    commentId,
    direction,
  });
  const response = await fetch('/api/comments', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success !== true || typeof data.meritVotes !== 'number') {
    throw new Error(data?.error || 'Could not save comment vote. Try again.');
  }
  return { meritVotes: data.meritVotes, userVote: data.userVote ?? direction };
}

