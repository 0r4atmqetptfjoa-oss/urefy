import { serviceRegistry, SERVICES } from './service-registry.js';
import { clientStore, type ClientPost } from './client-state.js';
import { renderIcon } from './ui/icons.js';

export interface TrendingTopic {
  tag: string;
  count: number;
  category: string;
}

export class TrendingEngine {
  constructor(private readonly getPosts: () => Pick<ClientPost, 'id' | 'title' | 'content'>[] = () => clientStore.posts) {}

  public getTrendingTopics(): TrendingTopic[] {
    const counts = new Map<string, number>();
    const seenPosts = new Set<string>();
    for (const post of this.getPosts()) {
      if (seenPosts.has(post.id)) continue;
      seenPosts.add(post.id);
      const tags = new Set(`${post.title}\n${post.content}`.match(/#[\p{L}\p{N}_]{1,64}/gu)?.map(tag => tag.toLowerCase()) ?? []);
      for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts, ([tag, count]) => ({ tag, count, category: 'Loaded posts' }))
      .sort((first, second) => second.count - first.count || first.tag.localeCompare(second.tag))
      .slice(0, 5);
  }

  public renderTrendingCard(): string {
    const topics = this.getTrendingTopics();
    return `
      <div class="p-3 rounded-xl bg-surface-raised border border-white/5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-100 flex items-center space-x-1.5">
            ${renderIcon('Flame', { size: 14 })}
            <span>Hashtags</span>
          </span>
          <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-overlay text-cyphr border border-cyphr/20">
            Loaded posts
          </span>
        </div>

        <div class="space-y-2">
          ${topics.length === 0 ? '<p class="text-xs text-slate-400">No hashtags in loaded posts.</p>' : ''}
          ${topics.map(topic => `
            <button type="button" data-search-tag="${topic.tag}" class="btn-trending-tag w-full text-left p-1.5 rounded-lg hover:bg-surface-overlay flex items-center justify-between transition-colors group">
              <div>
                <div class="text-xs font-bold text-slate-300 group-hover:text-cyphr transition-colors">${topic.tag}</div>
              </div>
              <span class="font-mono text-[10px] text-slate-500 group-hover:text-cyphr">${topic.count} ${topic.count === 1 ? 'post' : 'posts'}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }
}

export const trendingEngine = new TrendingEngine();
serviceRegistry.registerInstance(SERVICES.TrendingEngine, trendingEngine);
