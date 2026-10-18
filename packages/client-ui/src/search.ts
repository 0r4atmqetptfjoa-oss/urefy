// Fișier: packages/client-ui/src/search.ts
import { escapeHtml } from './sanitize.js';
import { renderIcon } from './ui/icons.js';

export type SearchCategory = 'all' | 'posts' | 'code' | 'channels' | 'users';

export interface SearchablePost {
  id: string;
  channelId: string;
  authorId: string;
  authorRole?: string;
  title: string;
  content: string;
  flair: string;
  meritVotes: number;
  createdAt: string | number;
}

export interface SearchableChannel {
  id: string;
  name: string;
  description?: string;
  category?: string;
  activeCount?: number;
}

export interface SearchParsedQuery {
  raw: string;
  terms: string[];
  channelFilter?: string;
  flairFilter?: string;
  authorFilter?: string;
  onlyCode: boolean;
  minMerit?: number;
}

export interface UnifiedSearchResult {
  id: string;
  type: 'post' | 'code' | 'channel' | 'user';
  title: string;
  subtitle: string;
  snippetHtml: string;
  codeSnippet?: { lang: string; code: string };
  badge?: string;
  merit?: number;
  channelId?: string;
  score: number;
  action: () => void;
}

/**
 * Parsează operatori avansați direct din căutare:
 * Ex: "channel:cryptography has:code merit:10 ml-kem"
 */
export function parseSearchQuery(rawQuery: string): SearchParsedQuery {
  const tokens = rawQuery.trim().split(/\s+/).filter(Boolean);
  const terms: string[] = [];
  let channelFilter: string | undefined;
  let flairFilter: string | undefined;
  let authorFilter: string | undefined;
  let onlyCode = false;
  let minMerit: number | undefined;

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower.startsWith('channel:') || lower.startsWith('in:')) {
      channelFilter = token.split(':')[1]?.toLowerCase();
    } else if (lower.startsWith('flair:') || lower.startsWith('tag:')) {
      flairFilter = token.split(':')[1]?.toLowerCase();
    } else if (lower.startsWith('author:') || lower.startsWith('from:')) {
      authorFilter = token.split(':')[1]?.toLowerCase();
    } else if (lower === 'has:code' || lower === 'is:code') {
      onlyCode = true;
    } else if (lower.startsWith('merit:>')) {
      const val = parseInt(lower.replace('merit:>', ''), 10);
      if (!Number.isNaN(val)) minMerit = val;
    } else {
      terms.push(token);
    }
  }

  return {
    raw: rawQuery,
    terms,
    channelFilter,
    flairFilter,
    authorFilter,
    onlyCode,
    minMerit,
  };
}

/**
 * Extrage blocurile de cod ```lang ... ``` sau cod inline din conținutul postării
 */
export function extractCodeBlocks(content: string): Array<{ lang: string; code: string }> {
  const blocks: Array<{ lang: string; code: string }> = [];
  const fenceRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fenceRegex.exec(content)) !== null) {
    const lang = (match[1] || 'code').trim().toUpperCase();
    const code = (match[2] || '').trim();
    if (code) blocks.push({ lang, code });
  }
  return blocks;
}

/**
 * Evidențiază în siguranță (XSS-safe) termenii găsiți în text
 */
export function highlightSearchTerms(text: string, terms: string[], maxLength = 160): string {
  const cleanText = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleanText) return '';

  let excerpt = cleanText;
  if (terms.length > 0 && cleanText.length > maxLength) {
    const firstTerm = terms[0].toLowerCase();
    const idx = cleanText.toLowerCase().indexOf(firstTerm);
    if (idx > 35) {
      const start = Math.max(0, idx - 30);
      excerpt = '…' + cleanText.slice(start, start + maxLength) + (start + maxLength < cleanText.length ? '…' : '');
    } else {
      excerpt = cleanText.slice(0, maxLength) + '…';
    }
  } else if (cleanText.length > maxLength) {
    excerpt = cleanText.slice(0, maxLength) + '…';
  }

  let safe = escapeHtml(excerpt);
  for (const rawTerm of terms) {
    const escapedTerm = escapeHtml(rawTerm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escapedTerm.length < 2) continue;
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    safe = safe.replace(regex, '<mark class="urefy-search-mark">$1</mark>');
  }
  return safe;
}

/**
 * Calculează scorul de relevanță (Fuzzy + Exact + Code + Merit boost)
 */
export function scoreTextMatch(haystack: string, terms: string[], weight = 1): number {
  if (!haystack) return 0;
  if (terms.length === 0) return 1;
  const lower = haystack.toLowerCase();
  let score = 0;

  for (const term of terms) {
    const t = term.toLowerCase();
    if (!t) continue;
    if (lower === t) {
      score += 40 * weight;
    } else if (lower.startsWith(t)) {
      score += 25 * weight;
    } else if (lower.includes(t)) {
      score += 12 * weight;
    } else {
      // Subsequence fuzzy match pentru typos ușoare
      let ti = 0;
      let streak = 0;
      for (let i = 0; i < lower.length && ti < t.length; i++) {
        if (lower[i] === t[ti]) {
          ti++;
          streak++;
        }
      }
      if (ti === t.length && t.length >= 3) {
        score += 4 * weight + streak * 0.5;
      } else {
        return 0; // Toți termenii trebuie să aibă cel puțin o potrivire parțială
      }
    }
  }
  return score;
}

export class SovereignOmniSearch {
  private activeCategory: SearchCategory = 'all';
  private selectedIndex = 0;
  private currentResults: UnifiedSearchResult[] = [];
  private abortController: AbortController | null = null;
  private recentSearches: string[] = [];
  private modalEl: HTMLElement | null = null;
  private isOpen = false;

  private getPosts: () => SearchablePost[];
  private getChannels: () => SearchableChannel[];
  private onSelectPost: (postId: string, channelId?: string) => void;
  private onSelectChannel: (channelId: string) => void;
  private onSelectUser: (fingerprint: string) => void;

  constructor(options: {
    getPosts: () => SearchablePost[];
    getChannels: () => SearchableChannel[];
    onSelectPost: (postId: string, channelId?: string) => void;
    onSelectChannel: (channelId: string) => void;
    onSelectUser: (fingerprint: string) => void;
  }) {
    this.getPosts = options.getPosts;
    this.getChannels = options.getChannels;
    this.onSelectPost = options.onSelectPost;
    this.onSelectChannel = options.onSelectChannel;
    this.onSelectUser = options.onSelectUser;

    try {
      const saved = localStorage.getItem('urefy_recent_searches_v1');
      if (saved) this.recentSearches = JSON.parse(saved).slice(0, 6);
    } catch (_) {}

    this.initGlobalShortcuts();
  }

  private saveRecentSearch(query: string): void {
    const clean = query.trim();
    if (clean.length < 2) return;
    this.recentSearches = [clean, ...this.recentSearches.filter((q) => q !== clean)].slice(0, 6);
    try {
      localStorage.setItem('urefy_recent_searches_v1', JSON.stringify(this.recentSearches));
    } catch (_) {}
  }

  private initGlobalShortcuts(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggleModal();
      } else if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.closeModal();
      }
    });
  }

  public toggleModal(initialQuery = ''): void {
    if (this.isOpen) {
      this.closeModal();
    } else {
      this.openModal(initialQuery);
    }
  }

  public openModal(initialQuery = ''): void {
    if (typeof document === 'undefined') return;
    if (!this.modalEl) {
      this.modalEl = document.createElement('div');
      this.modalEl.id = 'urefy-omni-search-backdrop';
      this.modalEl.className = 'urefy-omni-backdrop';
      document.body.appendChild(this.modalEl);
    }

    this.isOpen = true;
    this.selectedIndex = 0;
    this.renderModalStructure(initialQuery);

    const input = this.modalEl.querySelector<HTMLInputElement>('#urefy-omni-input');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      this.executeSearch(input.value);
    }
  }

  public closeModal(): void {
    this.isOpen = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.modalEl) {
      this.modalEl.classList.remove('is-open');
      setTimeout(() => {
        if (!this.isOpen && this.modalEl) {
          this.modalEl.innerHTML = '';
        }
      }, 180);
    }
  }

  private renderModalStructure(initialQuery: string): void {
    if (!this.modalEl) return;
    this.modalEl.innerHTML = `
      <div class="urefy-omni-dialog" role="dialog" aria-modal="true" aria-label="Sovereign Omni-Search">
        <div class="urefy-omni-header">
          <span class="urefy-omni-search-icon">${renderIcon('search', { size: 18 })}</span>
          <input
            id="urefy-omni-input"
            type="text"
            class="urefy-omni-input"
            placeholder="Caută în postări, blocuri de cod, #canale sau folosește has:code, channel:rust..."
            value="${escapeHtml(initialQuery)}"
            autocomplete="off"
            spellcheck="false"
          />
          <div class="urefy-omni-kbd-group">
            <kbd class="urefy-kbd">ESC</kbd>
          </div>
        </div>

        <div class="urefy-omni-filter-bar">
          <div class="urefy-omni-tabs" role="tablist">
            <button type="button" class="urefy-omni-tab active" data-cat="all">Toate</button>
            <button type="button" class="urefy-omni-tab" data-cat="posts">Postări</button>
            <button type="button" class="urefy-omni-tab" data-cat="code">⚡ Cod Sursă</button>
            <button type="button" class="urefy-omni-tab" data-cat="channels"># Canale</button>
            <button type="button" class="urefy-omni-tab" data-cat="users">Noduri / Membri</button>
          </div>
          <div class="urefy-omni-syntax-chips">
            <button type="button" class="urefy-syntax-chip" data-insert="has:code ">has:code</button>
            <button type="button" class="urefy-syntax-chip" data-insert="channel:">channel:</button>
            <button type="button" class="urefy-syntax-chip" data-insert="merit:>10 ">merit:&gt;10</button>
          </div>
        </div>

        <div id="urefy-omni-results" class="urefy-omni-results" role="listbox"></div>

        <div class="urefy-omni-footer">
          <div class="urefy-omni-footer-hints">
            <span><kbd class="urefy-kbd">↑</kbd><kbd class="urefy-kbd">↓</kbd> Navigare</span>
            <span><kbd class="urefy-kbd">↵</kbd> Deschide</span>
            <span><kbd class="urefy-kbd">Tab</kbd> Schimbă filtrul</span>
          </div>
          <div id="urefy-omni-status" class="urefy-omni-status">Index local + D1 FTS5 activ</div>
        </div>
      </div>
    `;

    requestAnimationFrame(() => {
      this.modalEl?.classList.add('is-open');
    });

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.closeModal();
    });

    const input = this.modalEl.querySelector<HTMLInputElement>('#urefy-omni-input');
    input?.addEventListener('input', () => {
      this.selectedIndex = 0;
      this.executeSearch(input.value);
    });

    input?.addEventListener('keydown', (e) => this.handleKeyNavigation(e));

    this.modalEl.querySelectorAll<HTMLButtonElement>('.urefy-omni-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeCategory = (btn.dataset.cat as SearchCategory) || 'all';
        this.modalEl?.querySelectorAll('.urefy-omni-tab').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedIndex = 0;
        this.executeSearch(input?.value || '');
        input?.focus();
      });
    });

    this.modalEl.querySelectorAll<HTMLButtonElement>('.urefy-syntax-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (!input) return;
        const token = chip.dataset.insert || '';
        if (!input.value.includes(token.trim())) {
          input.value = `${input.value.trim()} ${token}`.trimStart();
          input.focus();
          this.executeSearch(input.value);
        }
      });
    });
  }

  private handleKeyNavigation(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.currentResults.length > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % this.currentResults.length;
        this.updateSelectionHighlight();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.currentResults.length > 0) {
        this.selectedIndex = (this.selectedIndex - 1 + this.currentResults.length) % this.currentResults.length;
        this.updateSelectionHighlight();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const order: SearchCategory[] = ['all', 'posts', 'code', 'channels', 'users'];
      const nextIdx = (order.indexOf(this.activeCategory) + 1) % order.length;
      this.activeCategory = order[nextIdx];
      this.modalEl?.querySelectorAll<HTMLButtonElement>('.urefy-omni-tab').forEach((b) => {
        b.classList.toggle('active', b.dataset.cat === this.activeCategory);
      });
      const input = this.modalEl?.querySelector<HTMLInputElement>('#urefy-omni-input');
      this.executeSearch(input?.value || '');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = this.currentResults[this.selectedIndex];
      if (item) {
        const input = this.modalEl?.querySelector<HTMLInputElement>('#urefy-omni-input');
        if (input?.value) this.saveRecentSearch(input.value);
        this.closeModal();
        item.action();
      }
    }
  }

  private updateSelectionHighlight(): void {
    const container = this.modalEl?.querySelector('#urefy-omni-results');
    if (!container) return;
    const rows = container.querySelectorAll<HTMLElement>('.urefy-omni-item');
    rows.forEach((row, idx) => {
      const active = idx === this.selectedIndex;
      row.classList.toggle('is-selected', active);
      row.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) {
        row.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  private async executeSearch(rawQuery: string): Promise<void> {
    const parsed = parseSearchQuery(rawQuery);
    const localResults = this.computeLocalResults(parsed);
    this.currentResults = localResults;
    this.renderResultsList(parsed);

    // Sincronizare asincronă cu API-ul FTS5 /api/search pentru rezultate suplimentare din baza D1
    if (parsed.terms.join(' ').length >= 2) {
      if (this.abortController) this.abortController.abort();
      this.abortController = new AbortController();
      const statusEl = this.modalEl?.querySelector('#urefy-omni-status');
      if (statusEl) statusEl.textContent = 'Sincronizare index criptografic D1...';

      try {
        const q = encodeURIComponent(parsed.raw.trim() || parsed.terms.join(' '));
        const res = await fetch(`/api/search?q=${q}&limit=15`, {
          signal: this.abortController.signal,
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const remoteList = Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data?.results?.posts)
            ? data.results.posts
            : [];
          if (remoteList.length > 0) {
            this.mergeRemoteResults(remoteList, parsed);
          }
        }
        if (statusEl) statusEl.textContent = `${this.currentResults.length} rezultate verificate`;
      } catch (err: any) {
        if (err?.name !== 'AbortError' && statusEl) {
          statusEl.textContent = `${this.currentResults.length} rezultate locale`;
        }
      }
    }
  }

  private computeLocalResults(parsed: SearchParsedQuery): UnifiedSearchResult[] {
    const results: UnifiedSearchResult[] = [];
    const posts = this.getPosts();
    const channels = this.getChannels();
    const effectiveCat = parsed.onlyCode ? 'code' : this.activeCategory;

    // 1. Canale
    if (effectiveCat === 'all' || effectiveCat === 'channels') {
      for (const ch of channels) {
        const score =
          parsed.terms.length === 0
            ? 10
            : scoreTextMatch(ch.name, parsed.terms, 3) + scoreTextMatch(ch.description || '', parsed.terms, 1.5);
        if (score > 0) {
          results.push({
            id: `ch-${ch.id}`,
            type: 'channel',
            title: `#${ch.name}`,
            subtitle: ch.category || 'Sovereign Channel',
            snippetHtml: highlightSearchTerms(ch.description || `Canal activ în rețeaua UREfy`, parsed.terms),
            badge: `${ch.activeCount || 1} online`,
            score: score + 15,
            action: () => this.onSelectChannel(ch.id),
          });
        }
      }
    }

    // 2. Postări & Blocuri de Cod
    const seenUsers = new Set<string>();
    for (const post of posts) {
      if (parsed.channelFilter && !post.channelId.toLowerCase().includes(parsed.channelFilter)) continue;
      if (parsed.flairFilter && !post.flair.toLowerCase().includes(parsed.flairFilter)) continue;
      if (parsed.authorFilter && !post.authorId.toLowerCase().includes(parsed.authorFilter)) continue;
      if (parsed.minMerit !== undefined && post.meritVotes < parsed.minMerit) continue;

      const codeBlocks = extractCodeBlocks(post.content);

      // Rezultate dedicate pentru cod sursă
      if ((effectiveCat === 'all' || effectiveCat === 'code') && codeBlocks.length > 0) {
        for (let i = 0; i < codeBlocks.length; i++) {
          const block = codeBlocks[i];
          const codeScore =
            parsed.terms.length === 0
              ? 20
              : scoreTextMatch(block.code, parsed.terms, 3.5) +
                scoreTextMatch(block.lang, parsed.terms, 2) +
                scoreTextMatch(post.title, parsed.terms, 1.5);

          if (codeScore > 0) {
            results.push({
              id: `code-${post.id}-${i}`,
              type: 'code',
              title: post.title,
              subtitle: `#${post.channelId} • ${post.authorId}`,
              snippetHtml: highlightSearchTerms(block.code, parsed.terms, 140),
              codeSnippet: block,
              badge: block.lang || 'CODE',
              merit: post.meritVotes,
              channelId: post.channelId,
              score: codeScore + Math.min(post.meritVotes, 25),
              action: () => this.onSelectPost(post.id, post.channelId),
            });
          }
        }
      }

      // Rezultate postări
      if (effectiveCat === 'all' || effectiveCat === 'posts') {
        const postScore =
          parsed.terms.length === 0
            ? 15 + Math.min(post.meritVotes, 20)
            : scoreTextMatch(post.title, parsed.terms, 3.5) +
              scoreTextMatch(post.content, parsed.terms, 1.5) +
              scoreTextMatch(post.flair, parsed.terms, 2);

        if (postScore > 0) {
          results.push({
            id: `post-${post.id}`,
            type: 'post',
            title: post.title,
            subtitle: `#${post.channelId} • ${post.authorId}`,
            snippetHtml: highlightSearchTerms(post.content, parsed.terms, 150),
            badge: post.flair,
            merit: post.meritVotes,
            channelId: post.channelId,
            score: postScore + Math.min(post.meritVotes, 30) * 0.4,
            action: () => this.onSelectPost(post.id, post.channelId),
          });
        }
      }

      // 3. Utilizatori / Noduri Criptografice
      if ((effectiveCat === 'all' || effectiveCat === 'users') && !seenUsers.has(post.authorId)) {
        const uScore = parsed.terms.length === 0 ? 5 : scoreTextMatch(post.authorId, parsed.terms, 3);
        if (uScore > 0) {
          seenUsers.add(post.authorId);
          results.push({
            id: `user-${post.authorId}`,
            type: 'user',
            title: post.authorId,
            subtitle: post.authorRole || 'VERIFIED SOVEREIGN NODE',
            snippetHtml: `Deschide canal E2EE Direct Message sau verifică amprenta Ed25519`,
            badge: post.authorRole || 'MEMBER',
            score: uScore + 8,
            action: () => this.onSelectUser(post.authorId),
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 25);
  }

  private mergeRemoteResults(remoteRows: any[], parsed: SearchParsedQuery): void {
    const existingIds = new Set(this.currentResults.map((r) => r.id));
    for (const row of remoteRows) {
      const key = `post-${row.id}`;
      if (existingIds.has(key)) continue;
      this.currentResults.push({
        id: key,
        type: 'post',
        title: row.title || 'Postare arhivată',
        subtitle: `#${row.channel_id || 'general'} • ${row.author_id || 'anon'}`,
        snippetHtml: highlightSearchTerms(row.content || '', parsed.terms, 150),
        badge: row.flair || 'ARCHIVE',
        merit: Number(row.merit_votes || 0),
        channelId: row.channel_id,
        score: 18,
        action: () => this.onSelectPost(row.id, row.channel_id),
      });
    }
    this.renderResultsList(parsed);
  }

  private renderResultsList(parsed: SearchParsedQuery): void {
    const container = this.modalEl?.querySelector('#urefy-omni-results');
    if (!container) return;

    if (this.currentResults.length === 0) {
      container.innerHTML = `
        <div class="urefy-omni-empty">
          <div class="urefy-omni-empty-icon">${renderIcon('search', { size: 28 })}</div>
          <div class="urefy-omni-empty-title">Niciun rezultat găsit pentru „${escapeHtml(parsed.raw)}”</div>
          <div class="urefy-omni-empty-sub">Încearcă termeni mai scurți sau filtrează cu <code>has:code</code> ori <code>channel:general</code>.</div>
        </div>
      `;
      return;
    }

    const recentSection =
      !parsed.raw.trim() && this.recentSearches.length > 0
        ? `
        <div class="urefy-omni-recent-bar">
          <span class="urefy-omni-section-label">Căutări recente:</span>
          ${this.recentSearches
            .map(
              (q) =>
                `<button type="button" class="urefy-recent-pill" data-recent="${escapeHtml(q)}">${escapeHtml(q)}</button>`
            )
            .join('')}
        </div>`
        : '';

    container.innerHTML =
      recentSection +
      this.currentResults
        .map((item, idx) => {
          const isSelected = idx === this.selectedIndex;
          const typeIcon =
            item.type === 'code'
              ? '⚡'
              : item.type === 'channel'
              ? '#'
              : item.type === 'user'
              ? '🛡️'
              : '📄';

          return `
            <div
              class="urefy-omni-item ${isSelected ? 'is-selected' : ''}"
              role="option"
              aria-selected="${isSelected ? 'true' : 'false'}"
              data-idx="${idx}"
            >
              <div class="urefy-omni-item-icon type-${item.type}">${typeIcon}</div>
              <div class="urefy-omni-item-body">
                <div class="urefy-omni-item-top">
                  <span class="urefy-omni-item-title">${highlightSearchTerms(item.title, parsed.terms, 90)}</span>
                  <div class="urefy-omni-item-badges">
                    ${item.merit !== undefined ? `<span class="urefy-omni-merit">▲ ${item.merit}</span>` : ''}
                    ${item.badge ? `<span class="urefy-omni-badge">${escapeHtml(item.badge)}</span>` : ''}
                  </div>
                </div>
                <div class="urefy-omni-item-sub">${escapeHtml(item.subtitle)}</div>
                ${
                  item.type === 'code' && item.codeSnippet
                    ? `<pre class="urefy-omni-code-preview"><code>${item.snippetHtml}</code></pre>`
                    : `<div class="urefy-omni-item-snippet">${item.snippetHtml}</div>`
                }
              </div>
            </div>
          `;
        })
        .join('');

    container.querySelectorAll<HTMLButtonElement>('.urefy-recent-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const input = this.modalEl?.querySelector<HTMLInputElement>('#urefy-omni-input');
        if (input && pill.dataset.recent) {
          input.value = pill.dataset.recent;
          input.focus();
          this.executeSearch(input.value);
        }
      });
    });

    container.querySelectorAll<HTMLElement>('.urefy-omni-item').forEach((row) => {
      row.addEventListener('mouseenter', () => {
        const idx = Number(row.dataset.idx || 0);
        this.selectedIndex = idx;
        this.updateSelectionHighlight();
      });
      row.addEventListener('click', () => {
        const idx = Number(row.dataset.idx || 0);
        const item = this.currentResults[idx];
        if (item) {
          const input = this.modalEl?.querySelector<HTMLInputElement>('#urefy-omni-input');
          if (input?.value) this.saveRecentSearch(input.value);
          this.closeModal();
          item.action();
        }
      });
    });
  }
}
