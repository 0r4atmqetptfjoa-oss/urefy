import type { ClientPost } from './client-state.js';
import type { SovereignCircle } from './sovereign-circle.js';

export function collectTopics(posts: readonly ClientPost[]): Array<{ topic: string; count: number }> {
  const counts = new Map<string, { topic: string; count: number }>();
  const seenPosts = new Set<string>();
  for (const post of posts) {
    if (seenPosts.has(post.id)) continue;
    seenPosts.add(post.id);
    const perPost = new Map<string, string>();
    for (const tag of post.content.match(/#[\p{L}\p{N}_]+/gu) || []) perPost.set(tag.toLocaleLowerCase(), tag);
    if (post.flair) perPost.set(post.flair.toLowerCase(), post.flair);
    for (const [key, topic] of perPost) {
      const previous = counts.get(key);
      counts.set(key, { topic: previous?.topic || topic, count: (previous?.count || 0) + 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic)).slice(0, 8);
}

export function parseRecentSearches(raw: string | null): string[] {
  try {
    const values: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(values)) return [];
    const seen = new Set<string>();
    return values.filter((item): item is string => typeof item === 'string').map(item => item.trim().slice(0, 200)).filter(item => {
      const key = item.toLocaleLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  } catch { return []; }
}

export function communityCategories(circles: readonly SovereignCircle[]): string[] {
  return ['all', ...new Set(circles.map(circle => circle.category?.trim() || 'General'))].sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));
}

export function filterCommunities(circles: readonly SovereignCircle[], query: string, category: string, membership: 'all' | 'joined'): SovereignCircle[] {
  const term = query.trim().toLocaleLowerCase();
  const normalizedCategory = (category || 'all').trim().toLocaleLowerCase();
  return circles.filter(circle => (membership !== 'joined' || circle.isJoined)
    && (normalizedCategory === 'all' || (circle.category?.trim() || 'General').toLocaleLowerCase() === normalizedCategory)
    && (!term || `${circle.name} ${circle.displayName} ${circle.description} ${circle.category}`.toLocaleLowerCase().includes(term)));
}
