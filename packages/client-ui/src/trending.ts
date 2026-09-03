import { serviceRegistry, SERVICES } from './service-registry.js';

export interface TrendingTopic {
  tag: string;
  count: number;
  category: string;
}

export class TrendingEngine {
  private predefinedTrends: TrendingTopic[] = [
    { tag: '#ZeroKnowledge', count: 184, category: 'Cryptography' },
    { tag: '#TreeKEM_MLS', count: 142, category: 'Protocol' },
    { tag: '#ReverseEngineering', count: 98, category: 'Security' },
    { tag: '#BinaryHygiene', count: 76, category: 'Vault' },
    { tag: '#AirGapGhost', count: 52, category: 'Privacy' },
  ];

  public getTrendingTopics(): TrendingTopic[] {
    return this.predefinedTrends;
  }

  public renderTrendingCard(): string {
    return `
      <div class="p-3 rounded-xl bg-surface-raised border border-white/5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-100 flex items-center space-x-1.5">
            <span>🔥</span>
            <span>Trending in Sovereign Network</span>
          </span>
          <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-overlay text-cyphr border border-cyphr/20">
            Algo-Free
          </span>
        </div>

        <div class="space-y-2">
          ${this.predefinedTrends.map(t => `
            <button data-search-tag="${t.tag}" class="btn-trending-tag w-full text-left p-1.5 rounded-lg hover:bg-surface-overlay flex items-center justify-between transition-colors group">
              <div>
                <div class="text-[10px] font-mono text-slate-500">${t.category}</div>
                <div class="text-xs font-bold text-slate-300 group-hover:text-cyphr transition-colors">${t.tag}</div>
              </div>
              <span class="font-mono text-[10px] text-slate-500 group-hover:text-cyphr">${t.count} posts</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }
}

export const trendingEngine = new TrendingEngine();
serviceRegistry.registerInstance(SERVICES.TrendingEngine, trendingEngine);
