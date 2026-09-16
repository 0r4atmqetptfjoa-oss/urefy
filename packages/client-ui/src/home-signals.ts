import type { ClientPost } from './client-state.js';

/** Rank only content actually available to this client, without inventing activity. */
export function selectHomeHighlights(posts: readonly ClientPost[], now = Date.now()): ClientPost[] {
  const seen = new Set<string>();
  return posts.filter(post => {
    if (seen.has(post.id) || !Number.isFinite(post.createdAt) || post.createdAt > now) return false;
    seen.add(post.id);
    return post.createdAt >= now - 7 * 86400000;
  }).sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id)).slice(0, 3);
}

export function countPostsSince(posts: readonly ClientPost[], lastActive: number, now = Date.now()): number {
  if (!Number.isFinite(lastActive) || lastActive <= 0 || lastActive >= now) return 0;
  return new Set(posts.filter(post => post.createdAt > lastActive && post.createdAt <= now).map(post => post.id)).size;
}
