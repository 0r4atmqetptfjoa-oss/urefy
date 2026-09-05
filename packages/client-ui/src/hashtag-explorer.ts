// hashtag-explorer.ts
// Aetheris Omni-Sphere — Hashtag Explorer Module

import { isLocalDev } from './admin-auth.js';

type TagChangeListener = (tag: string | null) => void;

interface TagStat {
  count: number;
  posts: string[];
  lastUsed: number;
  category: string;
}

interface TrendingTag {
  tag: string;
  count: number;
  category: string;
}

const TAG_CATEGORIES: Record<string, string> = {
  ai: "Tech", crypto: "Tech", web3: "Tech", blockchain: "Tech",
  nft: "Tech", defi: "Tech", zk: "Tech", privacy: "Tech",
  opsec: "Tech", linux: "Tech", rust: "Tech", typescript: "Tech",
  python: "Tech", golang: "Tech", wasm: "Tech", ipfs: "Tech",
  tor: "Tech", vpn: "Tech", pgp: "Tech", terminal: "Tech",
  freedom: "Politics", censorship: "Politics", surveillance: "Politics",
  democracy: "Politics", dissent: "Politics", whistleblower: "Politics",
  leaks: "Politics", government: "Politics", rebellion: "Politics",
  art: "Culture", music: "Culture", memes: "Culture", gaming: "Culture",
  philosophy: "Culture", literature: "Culture", cinema: "Culture",
  darknet: "Culture", underground: "Culture", aesthetic: "Culture",
  exploit: "Security", malware: "Security", infosec: "Security",
  redteam: "Security", pentest: "Security", ctf: "Security",
  zeroday: "Security", hacking: "Security", anon: "Security",
};

function classifyTag(tag: string): string {
  return TAG_CATEGORIES[tag.toLowerCase()] ?? "General";
}

export class HashtagExplorer {
  activeTag: string | null = null;
  tagStats: Map<string, TagStat> = new Map();

  private listeners: Set<TagChangeListener> = new Set();
  private postTagIndex: Map<string, Set<string>> = new Map();

  constructor() {
    if (isLocalDev()) {
      this._seedData();
    }
  }

  private _seedData(): void {
    const now = Date.now();
    const m = 60_000;

    const seedEntries: Array<{ tag: string; count: number; posts: string[]; ago: number }> = [
      { tag: "privacy",       count: 312, posts: ["p001","p002","p003","p004","p005","p006"], ago: 2*m },
      { tag: "ai",            count: 289, posts: ["p007","p008","p009","p010","p011"],        ago: 5*m },
      { tag: "zk",            count: 241, posts: ["p012","p013","p014","p015"],               ago: 8*m },
      { tag: "crypto",        count: 198, posts: ["p016","p017","p018","p019","p020"],        ago: 12*m },
      { tag: "opsec",         count: 175, posts: ["p021","p022","p023","p024"],               ago: 15*m },
      { tag: "censorship",    count: 163, posts: ["p025","p026","p027"],                      ago: 20*m },
      { tag: "infosec",       count: 154, posts: ["p028","p029","p030","p031"],               ago: 25*m },
      { tag: "blockchain",    count: 141, posts: ["p032","p033","p034"],                      ago: 30*m },
      { tag: "defi",          count: 128, posts: ["p035","p036","p037","p038"],               ago: 35*m },
      { tag: "freedom",       count: 119, posts: ["p039","p040","p041"],                      ago: 40*m },
      { tag: "tor",           count: 107, posts: ["p042","p043","p044"],                      ago: 45*m },
      { tag: "hacking",       count: 98,  posts: ["p045","p046","p047","p048"],               ago: 50*m },
      { tag: "rust",          count: 89,  posts: ["p049","p050","p051"],                      ago: 55*m },
      { tag: "dissent",       count: 82,  posts: ["p052","p053"],                             ago: 60*m },
      { tag: "memes",         count: 76,  posts: ["p054","p055","p056"],                      ago: 65*m },
      { tag: "exploit",       count: 71,  posts: ["p057","p058"],                             ago: 70*m },
      { tag: "surveillance",  count: 68,  posts: ["p059","p060","p061"],                      ago: 75*m },
      { tag: "linux",         count: 63,  posts: ["p062","p063","p064"],                      ago: 80*m },
      { tag: "whistleblower", count: 57,  posts: ["p065","p066"],                             ago: 90*m },
      { tag: "anon",          count: 52,  posts: ["p067","p068","p069"],                      ago: 95*m },
      { tag: "ipfs",          count: 48,  posts: ["p070","p071"],                             ago: 100*m },
      { tag: "pentest",       count: 44,  posts: ["p072","p073"],                             ago: 105*m },
      { tag: "pgp",           count: 39,  posts: ["p074","p075","p076"],                      ago: 110*m },
      { tag: "ctf",           count: 35,  posts: ["p077","p078"],                             ago: 115*m },
      { tag: "web3",          count: 31,  posts: ["p079","p080"],                             ago: 120*m },
      { tag: "darknet",       count: 28,  posts: ["p081","p082"],                             ago: 125*m },
      { tag: "zeroday",       count: 24,  posts: ["p083"],                                    ago: 130*m },
      { tag: "philosophy",    count: 21,  posts: ["p084","p085"],                             ago: 140*m },
      { tag: "art",           count: 19,  posts: ["p086","p087"],                             ago: 150*m },
      { tag: "typescript",    count: 17,  posts: ["p088","p089"],                             ago: 160*m },
    ];

    const coOccurrencePairs: Array<[string, string]> = [
      ["privacy","opsec"],["privacy","tor"],["privacy","anon"],["privacy","surveillance"],
      ["ai","rust"],["ai","blockchain"],["ai","zk"],
      ["zk","crypto"],["zk","privacy"],["zk","defi"],
      ["crypto","defi"],["crypto","blockchain"],["crypto","web3"],
      ["infosec","exploit"],["infosec","pentest"],["infosec","hacking"],
      ["hacking","ctf"],["hacking","zeroday"],
      ["freedom","censorship"],["freedom","dissent"],["freedom","whistleblower"],
      ["censorship","surveillance"],["censorship","dissent"],
    ];

    for (const entry of seedEntries) {
      this.tagStats.set(entry.tag, {
        count: entry.count,
        posts: [...entry.posts],
        lastUsed: now - entry.ago,
        category: classifyTag(entry.tag),
      });
      for (const postId of entry.posts) {
        if (!this.postTagIndex.has(postId)) this.postTagIndex.set(postId, new Set());
        this.postTagIndex.get(postId)!.add(entry.tag);
      }
    }

    let synthId = 9000;
    for (const [tagA, tagB] of coOccurrencePairs) {
      const pid = `synth_${synthId++}`;
      this._addPostToTag(pid, tagA, now - 30 * m);
      this._addPostToTag(pid, tagB, now - 30 * m);
      this.postTagIndex.set(pid, new Set([tagA, tagB]));
    }
  }

  private _addPostToTag(postId: string, tag: string, ts: number): void {
    const stat = this.tagStats.get(tag);
    if (!stat) return;
    if (!stat.posts.includes(postId)) {
      stat.posts.push(postId);
      stat.count++;
      stat.lastUsed = Math.max(stat.lastUsed, ts);
    }
  }

  extractTagsFromText(text: string): string[] {
    const regex = /#([a-zA-Z][a-zA-Z0-9_]{0,49})/g;
    const found = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      found.add(match[1].toLowerCase());
    }
    return Array.from(found);
  }

  indexPost(postId: string, text: string, _channelId: string): void {
    const tags = this.extractTagsFromText(text);
    if (tags.length === 0) return;
    const now = Date.now();
    if (!this.postTagIndex.has(postId)) this.postTagIndex.set(postId, new Set());
    const postTags = this.postTagIndex.get(postId)!;
    for (const tag of tags) {
      postTags.add(tag);
      if (!this.tagStats.has(tag)) {
        this.tagStats.set(tag, { count: 0, posts: [], lastUsed: now, category: classifyTag(tag) });
      }
      const stat = this.tagStats.get(tag)!;
      if (!stat.posts.includes(postId)) {
        stat.posts.push(postId);
        stat.count++;
      }
      stat.lastUsed = Math.max(stat.lastUsed, now);
    }
  }

  getPostsByTag(tag: string): string[] {
    const normalized = tag.toLowerCase().replace(/^#/, "");
    return this.tagStats.get(normalized)?.posts ?? [];
  }

  getRelatedTags(tag: string): string[] {
    const normalized = tag.toLowerCase().replace(/^#/, "");
    const targetPosts = new Set(this.getPostsByTag(normalized));
    if (targetPosts.size === 0) return [];
    const coCount = new Map<string, number>();
    for (const postId of targetPosts) {
      const tags = this.postTagIndex.get(postId);
      if (!tags) continue;
      for (const t of tags) {
        if (t === normalized) continue;
        coCount.set(t, (coCount.get(t) ?? 0) + 1);
      }
    }
    return Array.from(coCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);
  }

  getTrendingTags(limit: number): TrendingTag[] {
    return Array.from(this.tagStats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([tag, stat]) => ({ tag, count: stat.count, category: stat.category }));
  }

  setActiveTag(tag: string | null): void {
    const normalized = tag ? tag.toLowerCase().replace(/^#/, "") : null;
    this.activeTag = normalized;
    for (const listener of this.listeners) listener(normalized);
  }

  isTagActive(): boolean {
    return this.activeTag !== null;
  }

  onTagChange(listener: TagChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  renderHashtagChip(tag: string, count: number): string {
    const normalized = tag.toLowerCase().replace(/^#/, "");
    const isActive = this.activeTag === normalized;
    const activeClass = isActive
      ? "ring-1 ring-cyphr bg-cyphr/10"
      : "bg-surface-overlay hover:bg-surface-highlight";
    return `<button class="btn-hashtag px-2 py-1 text-xs font-mono rounded-full ${activeClass} border border-white/10 text-cyphr transition-all" data-tag="${normalized}" data-action="call-global" data-global-method="hashtagExplorer.setActiveTag" data-global-args='[hashtagExplorer.activeTag === "${normalized}" ? null : "${normalized}"]' title="Filter by #${normalized}">#${normalized} <span class="text-slate-400 text-[10px]">${count}</span></button>`;
  }

  renderTagExplorerPanel(): string {
    const trending = this.getTrendingTags(10);
    const totalTags = this.tagStats.size;
    const totalPosts = new Set(
      Array.from(this.tagStats.values()).flatMap((s) => s.posts)
    ).size;
    const activeStat = this.activeTag ? this.tagStats.get(this.activeTag) : null;
    const related = this.activeTag ? this.getRelatedTags(this.activeTag) : [];
    const activeCat = activeStat?.category ?? null;

    const header = `<div class="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/5">
  <span class="text-xs font-semibold text-slate-400 uppercase tracking-widest"># Explorer</span>
  ${this.activeTag
    ? `<button class="text-[10px] font-mono text-cyphr hover:text-white transition-colors px-2 py-0.5 rounded bg-cyphr/10 border border-cyphr/30" data-action="call-global" data-global-method="hashtagExplorer.setActiveTag" data-global-args='[null]' title="Clear active tag">✕ #${this.activeTag}</button>`
    : `<span class="text-[10px] text-slate-600 font-mono">no filter</span>`}
</div>`;

    const search = `<div class="px-4 py-3">
  <div class="relative">
    <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">#</span>
    <input id="hashtag-search-input" type="text" placeholder="Search tags..." class="w-full bg-surface-overlay border border-white/10 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 pl-6 pr-3 py-1.5 focus:outline-none focus:border-cyphr/50 focus:ring-1 focus:ring-cyphr/20 transition-all" data-input="call-global" data-global-method="hashtagExplorer._handleSearchInput" />
  </div>
</div>`;

    const activeDetail = this.activeTag && activeStat
      ? `<div class="px-4 pb-3">
  <div class="rounded-lg bg-surface-overlay border border-cyphr/20 px-3 py-2.5">
    <div class="flex items-center justify-between mb-1">
      <span class="text-cyphr font-mono text-sm font-semibold">#${this.activeTag}</span>
      <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-aether/20 text-aether border border-aether/30">${activeCat}</span>
    </div>
    <div class="text-slate-400 text-[11px]">${activeStat.count} posts • last used ${this._relativeTime(activeStat.lastUsed)}</div>
    ${related.length > 0 ? `<div class="mt-2 pt-2 border-t border-white/5">
      <div class="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Related Tags</div>
      <div class="flex flex-wrap gap-1">${related.map((rt) => { const s = this.tagStats.get(rt); return this.renderHashtagChip(rt, s?.count ?? 0); }).join(" ")}</div>
    </div>` : ""}
  </div>
</div>` : "";

    const trendingChips = trending.map(({ tag, count }, i) => {
      const rank = i + 1;
      const rankColor = rank === 1 ? "text-amber" : rank <= 3 ? "text-signal" : "text-slate-500";
      return `<div class="flex items-center gap-2 group"><span class="text-[10px] font-mono ${rankColor} w-4 text-right shrink-0">${rank}</span>${this.renderHashtagChip(tag, count)}</div>`;
    }).join("\n");

    const trendingSection = `<div class="px-4 pb-3">
  <div class="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-semibold">Trending Now</div>
  <div class="grid grid-cols-1 gap-1" id="trending-tags-grid">${trendingChips}</div>
</div>`;

    const statsFooter = `<div class="px-4 py-3 border-t border-white/5 mt-1">
  <div class="grid grid-cols-2 gap-2">
    <div class="rounded-lg bg-surface-overlay border border-white/5 px-3 py-2 text-center">
      <div class="text-signal font-mono text-sm font-semibold">${totalTags}</div>
      <div class="text-slate-500 text-[10px] mt-0.5">Indexed Tags</div>
    </div>
    <div class="rounded-lg bg-surface-overlay border border-white/5 px-3 py-2 text-center">
      <div class="text-cyphr font-mono text-sm font-semibold">${totalPosts}</div>
      <div class="text-slate-500 text-[10px] mt-0.5">Tagged Posts</div>
    </div>
  </div>
</div>`;

    return `<aside id="hashtag-explorer-panel" class="h-full flex flex-col overflow-y-auto bg-surface-base border-l border-white/5 select-none" role="complementary" aria-label="Hashtag Explorer">
${header}
${search}
${activeDetail}
${trendingSection}
${statsFooter}
</aside>`;
  }

  renderActiveTagBanner(): string {
    if (!this.activeTag) return "";
    const count = this.getPostsByTag(this.activeTag).length;
    const stat = this.tagStats.get(this.activeTag);
    const cat = stat?.category ?? "General";
    const catColors: Record<string, string> = {
      Tech: "text-cyphr", Security: "text-crimson",
      Politics: "text-amber", Culture: "text-aether", General: "text-slate-400",
    };
    const colorClass = catColors[cat] ?? "text-slate-400";
    return `<div id="active-tag-banner" class="flex items-center justify-between px-4 py-2.5 bg-surface-overlay border-b border-cyphr/20 animate-in fade-in" role="status" aria-live="polite">
  <div class="flex items-center gap-2.5 min-w-0">
    <div class="w-1.5 h-1.5 rounded-full bg-cyphr animate-pulse shrink-0"></div>
    <span class="text-xs text-slate-300 truncate">Showing posts tagged <span class="font-mono ${colorClass} font-semibold">#${this.activeTag}</span> <span class="text-slate-500 ml-1">(${count} result${count !== 1 ? "s" : ""})</span></span>
    <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-raised border border-white/10 ${colorClass} shrink-0">${cat}</span>
  </div>
  <button class="ml-3 shrink-0 text-[11px] font-mono text-slate-400 hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-surface-raised border border-transparent hover:border-white/10" data-action="call-global" data-global-method="hashtagExplorer.setActiveTag" data-global-args='[null]' aria-label="Clear tag filter">✕ Clear</button>
</div>`;
  }

  private _relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    const m = 60_000; const h = 60 * m; const d = 24 * h;
    if (diff < m) return "just now";
    if (diff < h) return `${Math.floor(diff / m)}m ago`;
    if (diff < d) return `${Math.floor(diff / h)}h ago`;
    return `${Math.floor(diff / d)}d ago`;
  }

  _handleSearchInput(query: string): void {
    const q = query.toLowerCase().replace(/^#/, "").trim();
    const grid = typeof document !== "undefined"
      ? document.getElementById("trending-tags-grid")
      : null;
    if (!grid) return;
    if (!q) {
      const trending = this.getTrendingTags(10);
      grid.innerHTML = trending.map(({ tag, count }, i) => {
        const rank = i + 1;
        const rc = rank === 1 ? "text-amber" : rank <= 3 ? "text-signal" : "text-slate-500";
        return `<div class="flex items-center gap-2 group"><span class="text-[10px] font-mono ${rc} w-4 text-right shrink-0">${rank}</span>${this.renderHashtagChip(tag, count)}</div>`;
      }).join("");
      return;
    }
    const matches = Array.from(this.tagStats.entries())
      .filter(([t]) => t.includes(q))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
    if (matches.length === 0) {
      grid.innerHTML = `<p class="text-slate-600 text-[11px] font-mono px-1">No tags match "#${q}"</p>`;
      return;
    }
    grid.innerHTML = matches.map(([tag, stat], i) => {
      const rc = i === 0 ? "text-amber" : i < 3 ? "text-signal" : "text-slate-500";
      return `<div class="flex items-center gap-2 group"><span class="text-[10px] font-mono ${rc} w-4 text-right shrink-0">${i + 1}</span>${this.renderHashtagChip(tag, stat.count)}</div>`;
    }).join("");
  }
}

export const hashtagExplorer = new HashtagExplorer();
