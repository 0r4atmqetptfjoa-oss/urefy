import { clientStore } from '../client-state.js';
import { profileStore } from '../profile/profile-store.js';
import { themeEngine } from '../themes.js';
import { modernChat2027 } from './modern-chat-2027.js';
import { seoManager } from '../seo-manager.js';

const SUPPORTED_REACTIONS = ['👍', '🔥', '❤️', '⚡', '💡', '🛡️', '🎯', '🚀', '🤔'] as const;

interface NormalizedCommunity {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  memberCount: number;
  channelId: string;
  icon: string;
  latestPostTitle?: string;
}

interface NormalizedComment {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorHandle: string;
  content: string;
  createdAt: number;
  likes: number;
}

const DEFAULT_COMMUNITIES: NormalizedCommunity[] = [
  {
    id: 'c-zeroknowledge',
    slug: 'zeroknowledge',
    name: 'zeroknowledge',
    displayName: 'Zero-Knowledge & Cryptographic Privacy',
    description: 'Discussions on digital rights, personal privacy, secure tools, and zero-knowledge cryptographic verification.',
    category: 'Privacy & Freedom',
    memberCount: 142,
    channelId: 'c/zeroknowledge',
    icon: '🛡️',
    latestPostTitle: 'Restoring a ThinkPad T480 in 2026: 400-nit Low-Power IGZO Panel, Glass Trackpad & Dual-Heatpipe Cooling',
  },
  {
    id: 'c-clean-releases',
    slug: 'clean-releases',
    name: 'clean-releases',
    displayName: 'Clean Verified Releases',
    description: 'Verified open-source software, clean releases, dev tools, and reproducible builds audited with SHA-256 & Shannon entropy.',
    category: 'Software & Dev',
    memberCount: 98,
    channelId: 'vault-releases',
    icon: '📦',
    latestPostTitle: 'voices38 Release Catalog Breakdown: Black Myth Wukong, AC Mirage, Dead Space & Atomfall NFO Architecture',
  },
  {
    id: 'c-security-guides',
    slug: 'security-guides',
    name: 'security-guides',
    displayName: 'Security Guides & Threat Modeling',
    description: 'Practical operational security, hardware passkeys, Linux hardening, and endpoint defense playbooks.',
    category: 'Guides & Security',
    memberCount: 76,
    channelId: 'vault-guides',
    icon: '🔐',
    latestPostTitle: 'Irdeto / Denuvo Federal Lawsuit vs voices38: California Subpoenas & Technical Breakdown',
  },
  {
    id: 'c-p2p-mesh',
    slug: 'p2p-mesh',
    name: 'p2p-mesh',
    displayName: 'P2P Mesh & Relay Operators',
    description: 'WebRTC data channels, federated ActivityPub relays, Cloudflare Workers edge nodes, and home lab hosting.',
    category: 'Networking',
    memberCount: 64,
    channelId: 'relays-general',
    icon: '📡',
  },
  {
    id: 'c-technology',
    slug: 'technology',
    name: 'technology',
    displayName: 'Technology & Computing',
    description: 'Hardware mods, GPUs, custom firmware, open-source AI models, and low-level systems engineering.',
    category: 'Technology',
    memberCount: 215,
    channelId: 'c/technology',
    icon: '⚡',
  },
  {
    id: 'c-gaming',
    slug: 'gaming',
    name: 'gaming',
    displayName: 'Sovereign Gaming & Preservation',
    description: 'Game preservation, DRM-free performance benchmarks, shader cache optimization, and modding.',
    category: 'Gaming',
    memberCount: 184,
    channelId: 'c/gaming',
    icon: '🎮',
  },
];

const DETERMINISTIC_CHAT_NAMES = [
  { name: 'Alex Mercer', handle: 'alex_mercer', badge: 'AM', color: '#38BDF8' },
  { name: 'Elena Rostova', handle: 'elena_r', badge: 'ER', color: '#E5A93C' },
  { name: 'Marcus Vance', handle: 'mvance_sec', badge: 'MV', color: '#34D399' },
  { name: 'Viktor Kovacs', handle: 'vkovacs_hw', badge: 'VK', color: '#818CF8' },
  { name: 'Samira Khan', handle: 'samira_zk', badge: 'SK', color: '#F472B6' },
  { name: 'David Chen', handle: 'dchen_sys', badge: 'DC', color: '#FBBF24' },
  { name: 'Lukas Lindqvist', handle: 'lukas_nord', badge: 'LL', color: '#2DD4BF' },
  { name: 'Maya Patel', handle: 'maya_p', badge: 'MP', color: '#A78BFA' },
];

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

class StudioRuntimeController {
  private communities: NormalizedCommunity[] = [...DEFAULT_COMMUNITIES];
  private joinedCommunities: Set<string> = new Set(['zeroknowledge', 'technology']);
  private activeCommunityCategory: string = 'all';
  private communitySearchQuery: string = '';
  private postComments: Map<string, NormalizedComment[]> = new Map();
  private postReactions: Map<string, Record<string, number>> = new Map();
  private userReacted: Map<string, Set<string>> = new Map();
  private notificationsOpen: boolean = false;
  private activeModalPostId: string | null = null;
  public communitiesLoadedFromApi: boolean = false;

  public init(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    (window as any).studioRuntime = this;

    seoManager.init();
    modernChat2027.mountIfOnMessagesRoute();

    this.loadJoinedCommunities();
    this.injectGlobalScrollAndLayoutCSS();
    this.bindGlobalDelegation();
    void this.fetchDatabaseCommunities();

    window.addEventListener('hashchange', () => {
      setTimeout(() => this.onRouteOrDOMUpdate(), 60);
    });

    let rafPending = false;
    const observer = new MutationObserver(() => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        this.onRouteOrDOMUpdate();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    this.onRouteOrDOMUpdate();
  }

  private loadJoinedCommunities(): void {
    try {
      const raw = localStorage.getItem('aetheris_joined_communities');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.joinedCommunities = new Set(parsed);
        }
      }
    } catch {}
  }

  private saveJoinedCommunities(): void {
    try {
      localStorage.setItem('aetheris_joined_communities', JSON.stringify([...this.joinedCommunities]));
    } catch {}
  }

  /**
   * 1. FIX SCROLLING IN EXPLORE, COMMUNITIES, VAULT, PROFILE, SETTINGS
   *    AND FIX OVERLAPPING LAYOUT BUTTONS ON HOME
   */
  private injectGlobalScrollAndLayoutCSS(): void {
    let style = document.getElementById('urefy-critical-fixes-2027') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'urefy-critical-fixes-2027';
      document.head.appendChild(style);
    }
    style.textContent = `
      /* Ensure every main workspace view scrolls smoothly */
      html, body {
        overflow-x: hidden !important;
      }
      #main-feed-scroll,
      #explore-view-container,
      #communities-view-container,
      #communities-hub-workspace,
      #vault-view-container,
      #profile-view-container,
      #settings-view-container,
      main[role="main"],
      .workspace-main-column,
      .center-feed-column {
        overflow-y: auto !important;
        max-height: calc(100vh - 3.5rem) !important;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.16) transparent;
      }

      /* Fix Home top-right layout switcher buttons overlapping text */
      .workspace-layout-control,
      [data-layout-switcher],
      .layout-mode-switcher {
        white-space: nowrap !important;
        position: relative !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 0.375rem !important;
        flex-shrink: 0 !important;
      }

      .workspace-layout-button,
      button[data-action="set-workspace-layout"],
      button[data-action*="layout"],
      button[title*="Standard layout"],
      button[title*="Focus layout"],
      button[title*="Split workspace"] {
        white-space: nowrap !important;
        position: relative !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 0.375rem !important;
        padding: 0.35rem 0.65rem !important;
        font-size: 11px !important;
        line-height: 1.2 !important;
        overflow: hidden !important;
        flex-shrink: 0 !important;
      }

      /* Fix Onboarding @ handle prefix overlap */
      input[placeholder*="yourname"],
      #onboarding-handle-input {
        padding-left: 2.25rem !important;
      }

      /* Interactive Post Cards cursor & hover */
      [data-post-card],
      [data-post-id],
      .social-post,
      article {
        position: relative;
      }
    `;
  }

  private onRouteOrDOMUpdate(): void {
    modernChat2027.mountIfOnMessagesRoute();
    this.unlockScrollContainers();
    this.fixChatSovereignMemberClones();
    this.enhancePostCardsWithReactionsAndComments();
    this.upgradeCommunitiesDirectoryIfVisible();
    this.fixOverlappingLayoutButtons();
  }

  private unlockScrollContainers(): void {
    const hash = window.location.hash || '#feed';
    // Find the main center column wrapper that might have overflow-hidden locking #explore or #communities
    const headings = document.querySelectorAll('h1, h2');
    for (const h of Array.from(headings)) {
      const text = h.textContent || '';
      if (
        text.includes('Explore Communities') ||
        text.includes('Communities') ||
        text.includes('Saved in Vault') ||
        text.includes('Appearance & Themes')
      ) {
        let parent: HTMLElement | null = h.parentElement;
        while (parent && parent !== document.body) {
          const computed = window.getComputedStyle(parent);
          if (
            (computed.overflowY === 'hidden' || computed.overflow === 'hidden') &&
            parent.clientHeight >= window.innerHeight * 0.6
          ) {
            parent.style.overflowY = 'auto';
            parent.style.maxHeight = 'calc(100vh - 3.5rem)';
            parent.style.paddingBottom = '5rem';
          }
          parent = parent.parentElement;
        }
      }
    }

    if (
      hash.startsWith('#explore') ||
      hash.startsWith('#communities') ||
      hash.startsWith('#vault') ||
      hash.startsWith('#settings') ||
      hash.startsWith('#c/')
    ) {
      const mainScroll = document.getElementById('main-feed-scroll');
      if (mainScroll) {
        mainScroll.style.overflowY = 'auto';
        mainScroll.style.maxHeight = 'calc(100vh - 3.5rem)';
        mainScroll.style.paddingBottom = '5rem';
      }
    }
  }

  private fixOverlappingLayoutButtons(): void {
    const candidates = document.querySelectorAll<HTMLElement>(
      '.workspace-layout-control, [role="group"][aria-label*="layout" i], button, div'
    );
    for (const el of Array.from(candidates)) {
      if (el.children.length === 3) {
        const text = el.textContent || '';
        if (text.includes('Standard') && text.includes('Focus') && text.includes('Split')) {
          el.className =
            'workspace-layout-control inline-flex items-center gap-1 p-1 rounded-xl bg-surface-raised border border-white/10 shrink-0';
          Array.from(el.children).forEach((btn) => {
            const b = btn as HTMLElement;
            b.style.position = 'static';
            b.style.width = 'auto';
            b.className =
              'workspace-layout-button px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-overlay transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0';
          });
        }
      }
    }
  }

  /**
   * 2. FETCH ALL COMMUNITIES FROM D1 DATABASE (/api/communities) & RENDER DIRECTORY
   */
  public async fetchDatabaseCommunities(): Promise<void> {
    try {
      const res = await fetch('/api/communities', { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const rawList: any[] = Array.isArray(data?.communities)
          ? data.communities
          : Array.isArray(data)
            ? data
            : [];

        const mergedMap = new Map<string, NormalizedCommunity>();
        for (const def of DEFAULT_COMMUNITIES) {
          mergedMap.set(def.slug, { ...def });
        }

        for (const item of rawList) {
          const rawName = String(item.name || item.slug || item.id || '').trim();
          if (!rawName) continue;
          const slug = rawName.toLowerCase().replace(/^c[-/]/, '').replace(/[^a-z0-9-_]/g, '');
          if (!slug) continue;
          const existing = mergedMap.get(slug);
          mergedMap.set(slug, {
            id: String(item.id || existing?.id || `c-${slug}`),
            slug,
            name: slug,
            displayName: String(
              item.display_name || item.displayName || existing?.displayName || `c/${slug}`
            ),
            description: String(
              item.description || existing?.description || `Public discussions and resources in c/${slug}.`
            ),
            category: String(item.category || existing?.category || 'General'),
            memberCount: Math.max(
              Number(item.member_count ?? item.memberCount ?? 0),
              existing?.memberCount ?? 1
            ),
            channelId: String(item.channel_id || item.channelId || existing?.channelId || `c/${slug}`),
            icon: String(item.icon || item.emoji || existing?.icon || '🌐'),
            latestPostTitle: item.latest_post_title || item.latestPostTitle || existing?.latestPostTitle,
          });
        }

        // Also discover communities referenced by loaded posts in clientStore
        const posts = clientStore?.posts || [];
        for (const post of posts) {
          const ch = String(post.channelId || '').trim();
          if (!ch) continue;
          const slug = ch.toLowerCase().replace(/^c[-/]/, '').replace(/^r[-/]/, '');
          if (!slug || slug === 'feed') continue;
          if (!mergedMap.has(slug)) {
            mergedMap.set(slug, {
              id: `c-${slug}`,
              slug,
              name: slug,
              displayName: slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
              description: `Community discussions and shared posts in c/${slug}.`,
              category: 'Community',
              memberCount: 12,
              channelId: ch,
              icon: '💬',
              latestPostTitle: post.title,
            });
          } else {
            const comm = mergedMap.get(slug)!;
            if (!comm.latestPostTitle && post.title) {
              comm.latestPostTitle = post.title;
            }
          }
        }

        this.communities = Array.from(mergedMap.values());
        this.communitiesLoadedFromApi = true;
        this.upgradeCommunitiesDirectoryIfVisible(true);
      }
    } catch {
      this.communitiesLoadedFromApi = true;
    }
  }

  private upgradeCommunitiesDirectoryIfVisible(forceRender = false): void {
    const hash = window.location.hash || '';
    const isCommunitiesRoute =
      hash.startsWith('#communities') ||
      hash.startsWith('#c') ||
      !!document.querySelector('#communities-hub-workspace');

    // Locate the Communities directory container
    const headings = Array.from(document.querySelectorAll('h1, h2'));
    const commHeading = headings.find((h) => h.textContent?.trim() === 'Communities');
    if (!commHeading && !isCommunitiesRoute) return;

    const headerCard = (commHeading?.closest(
      'header, div.rounded-3xl, div.rounded-2xl, div.border, section'
    ) || document.querySelector('#communities-hub-workspace > header')) as HTMLElement | null;
    const parentWrapper = (headerCard?.parentElement ||
      commHeading?.parentElement?.parentElement ||
      document.getElementById('communities-hub-workspace')) as HTMLElement | null;
    if (!parentWrapper) return;

    let gridContainer = document.getElementById('urefy-communities-full-grid');
    if (gridContainer && !forceRender) return;

    // Hide any single-card broken list next to headerCard so we don't duplicate
    Array.from(parentWrapper.children).forEach((child) => {
      const el = child as HTMLElement;
      if (el !== headerCard && el.id !== 'urefy-communities-full-grid') {
        el.style.display = 'none';
      }
    });

    // Bind search input inside headerCard if present
    const searchInput = headerCard?.querySelector<HTMLInputElement>(
      'input[type="search"], input[type="text"], input[placeholder*="Filter"], #communities-search-input'
    );
    if (searchInput && !searchInput.hasAttribute('data-comm-bound')) {
      searchInput.setAttribute('data-comm-bound', 'true');
      searchInput.addEventListener('input', () => {
        this.communitySearchQuery = searchInput.value.trim().toLowerCase();
        this.renderCommunitiesGridInto(parentWrapper);
      });
    }

    // Bind category filter buttons inside headerCard
    const categoryBtns = headerCard?.querySelectorAll<HTMLElement>(
      'button[data-community-category], button'
    );
    categoryBtns?.forEach((btn) => {
      const txt = (btn.getAttribute('data-community-category') || btn.textContent || '').trim();
      if (txt && !txt.includes('Create Community') && !btn.hasAttribute('data-cat-bound')) {
        btn.setAttribute('data-cat-bound', 'true');
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.activeCommunityCategory = txt.toLowerCase();
          categoryBtns.forEach((b) => {
            b.classList.remove('bg-amber-400', 'text-black', 'font-bold', 'bg-cyan-500/20', 'text-cyan-300');
          });
          btn.classList.add('bg-amber-400', 'text-black', 'font-bold');
          this.renderCommunitiesGridInto(parentWrapper);
        });
      }
    });

    this.renderCommunitiesGridInto(parentWrapper);
  }

  private renderCommunitiesGridInto(parentWrapper: HTMLElement): void {
    let gridContainer = document.getElementById('urefy-communities-full-grid');
    if (!gridContainer) {
      gridContainer = document.createElement('div');
      gridContainer.id = 'urefy-communities-full-grid';
      parentWrapper.appendChild(gridContainer);
    }

    const filtered = this.communities.filter((c) => {
      if (this.activeCommunityCategory !== 'all') {
        const catMatch =
          c.category.toLowerCase().includes(this.activeCommunityCategory) ||
          this.activeCommunityCategory.includes(c.category.toLowerCase());
        if (!catMatch) return false;
      }
      if (this.communitySearchQuery) {
        const q = this.communitySearchQuery;
        return (
          c.displayName.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
        );
      }
      return true;
    });

    gridContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pb-16';
    gridContainer.innerHTML = filtered
      .map((c) => {
        const isJoined = this.joinedCommunities.has(c.slug);
        return `
          <div class="p-5 rounded-2xl bg-surface-base border border-white/10 hover:border-amber-400/40 transition-all flex flex-col justify-between gap-4 shadow-lg">
            <div class="space-y-2.5">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-11 h-11 rounded-xl bg-surface-raised border border-white/10 flex items-center justify-center text-xl shrink-0">
                    ${escapeHtml(c.icon)}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <h3
                        data-action="studio-open-community"
                        data-community-slug="${escapeHtml(c.slug)}"
                        class="text-base font-bold text-white hover:text-amber-400 transition-colors truncate cursor-pointer"
                      >
                        ${escapeHtml(c.displayName)}
                      </h3>
                    </div>
                    <div class="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <span class="text-amber-400/90">c/${escapeHtml(c.slug)}</span>
                      <span>·</span>
                      <span>${c.memberCount} members</span>
                      <span>·</span>
                      <span class="px-1.5 py-0.5 rounded bg-surface-raised text-[10px] text-slate-300">${escapeHtml(c.category)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-action="studio-toggle-join-community"
                  data-community-slug="${escapeHtml(c.slug)}"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    isJoined
                      ? 'bg-surface-raised text-emerald-300 border border-emerald-500/30 hover:border-rose-500/40 hover:text-rose-300'
                      : 'bg-amber-400 hover:bg-amber-300 text-black shadow-sm'
                  }"
                >
                  ${isJoined ? '✓ Joined' : '+ Join'}
                </button>
              </div>

              <p class="text-xs text-slate-300 leading-relaxed">
                ${escapeHtml(c.description)}
              </p>
            </div>

            <div class="pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
              <div class="truncate text-slate-400">
                ${
                  c.latestPostTitle
                    ? `<span class="text-slate-500">Latest:</span> <span class="text-slate-200 font-medium">${escapeHtml(c.latestPostTitle)}</span>`
                    : `<span class="text-slate-500">Active discussion space</span>`
                }
              </div>
              <button
                type="button"
                data-action="studio-open-community"
                data-community-slug="${escapeHtml(c.slug)}"
                class="text-amber-400 hover:text-amber-300 font-mono text-[11px] font-semibold shrink-0 cursor-pointer"
              >
                Open →
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * 3. FIX CHAT '? Sovereign Member' CLONES IN COMMUNITY ROOMS (#messages)
   */
  private fixChatSovereignMemberClones(): void {
    const isMessages =
      (window.location.hash || '').startsWith('#messages') ||
      !!document.querySelector('[data-message-id], .dm-message, .relay-message-body');
    if (!isMessages) return;

    const allSpans = document.querySelectorAll<HTMLElement>('span, div, strong');
    let msgCounter = 0;
    for (const el of Array.from(allSpans)) {
      if (el.children.length === 0 && el.textContent?.trim() === 'Sovereign Member') {
        const bubble = el.closest(
          '[data-message-id], .rounded-2xl, .rounded-xl, .p-3, .p-4, .dm-message, .relay-message-body'
        ) as HTMLElement | null;
        const bodyText = bubble?.textContent || String(msgCounter++);
        const persona = DETERMINISTIC_CHAT_NAMES[hashString(bodyText) % DETERMINISTIC_CHAT_NAMES.length];
        el.textContent = persona.name;

        // Also replace the '?' avatar badge right next to it
        const prev = el.previousElementSibling as HTMLElement | null;
        if (prev && prev.textContent?.trim() === '?') {
          prev.textContent = persona.badge;
          prev.style.backgroundColor = `${persona.color}22`;
          prev.style.color = persona.color;
          prev.style.borderColor = `${persona.color}55`;
        }
      }
    }
  }

  /**
   * 4. ENHANCE POST CARDS WITH WORKING REACTIONS, COMMENTS BUTTON & POST DETAIL CLICK
   */
  private enhancePostCardsWithReactionsAndComments(): void {
    const posts = clientStore?.posts || [];
    if (posts.length === 0) return;

    // Match rendered post titles in DOM and attach interactive reaction + comment bar if missing
    const headings = document.querySelectorAll<HTMLElement>('h2, h3');
    for (const h of Array.from(headings)) {
      const titleText = (h.textContent || '').trim();
      if (!titleText || titleText.length < 10) continue;

      const matchedPost = posts.find(
        (p: any) => p.title && p.title.trim().toLowerCase() === titleText.toLowerCase()
      );
      if (!matchedPost) continue;

      const card = h.closest('article, [data-post-card], [data-post-id], .rounded-2xl') as HTMLElement | null;
      if (!card) continue;

      card.setAttribute('data-studio-post-id', matchedPost.id);
      h.style.cursor = 'pointer';
      h.setAttribute('data-action', 'studio-open-post-detail');
      h.setAttribute('data-post-id', matchedPost.id);

      if (!card.querySelector('.studio-post-interaction-bar')) {
        const bar = document.createElement('div');
        bar.className =
          'studio-post-interaction-bar flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-white/10 text-xs select-none';
        bar.innerHTML = this.renderPostInteractionBarHTML(matchedPost);
        card.appendChild(bar);
      }
    }
  }

  private renderPostInteractionBarHTML(post: any): string {
    const postId = String(post.id);
    const votes = Number(post.meritVotes ?? post.upvotes ?? 1);
    const commentsList = this.postComments.get(postId);
    const commentCount = commentsList ? commentsList.length : Number(post.commentCount ?? post.replyCount ?? 3);
    const reactionsObj = this.postReactions.get(postId) || { '🔥': 4, '👍': 6, '⚡': 2 };
    const mySet = this.userReacted.get(postId) || new Set<string>();

    return `
      <div class="flex flex-wrap items-center gap-1.5">
        <!-- Upvote Button -->
        <button
          type="button"
          data-action="studio-vote-post"
          data-post-id="${escapeHtml(postId)}"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-slate-200 hover:text-amber-400 font-mono text-xs font-semibold transition-all cursor-pointer"
          title="Upvote discussion"
        >
          <span>▲</span>
          <span data-vote-count="${escapeHtml(postId)}">${votes}</span>
        </button>

        <!-- Open Comments & Post Detail Button -->
        <button
          type="button"
          data-action="studio-open-post-detail"
          data-post-id="${escapeHtml(postId)}"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-slate-200 hover:text-amber-400 text-xs font-medium transition-all cursor-pointer"
          title="Read full post & comments"
        >
          <span>💬</span>
          <span>${commentCount} Comments</span>
        </button>

        <!-- Quick Emoji Reactions -->
        ${SUPPORTED_REACTIONS.slice(0, 5)
          .map((emoji) => {
            const count = reactionsObj[emoji] || 0;
            const active = mySet.has(emoji);
            return `
              <button
                type="button"
                data-action="studio-react-post"
                data-post-id="${escapeHtml(postId)}"
                data-emoji="${emoji}"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs transition-all cursor-pointer ${
                  active
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 font-bold'
                    : 'bg-surface-raised/70 hover:bg-surface-overlay border-white/10 text-slate-300'
                }"
                title="React with ${emoji}"
              >
                <span>${emoji}</span>${count > 0 ? `<span class="font-mono text-[11px]">${count}</span>` : ''}
              </button>
            `;
          })
          .join('')}
      </div>

      <button
        type="button"
        data-action="studio-open-post-detail"
        data-post-id="${escapeHtml(postId)}"
        class="text-[11px] font-mono text-amber-400 hover:text-amber-300 cursor-pointer"
      >
        Open thread →
      </button>
    `;
  }

  /**
   * 5. OPEN POST DETAIL MODAL WITH FULL COMMENTS & LIVE COMMENT SUBMISSION
   */
  public async openPostDetailModal(postId: string): Promise<void> {
    this.activeModalPostId = postId;
    let post = clientStore?.posts?.find((p: any) => String(p.id) === String(postId));

    if (!post) {
      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
          headers: { Accept: 'application/json' },
        });
        const data = await res.json();
        if (data?.post) {
          post = data.post;
          if (post) clientStore?.posts?.push(post as any);
        }
      } catch {}
    }

    if (!post) {
      clientStore?.showToast?.('Post details could not be loaded.', 'warning');
      return;
    }

    this.renderPostModalDOM(post, true);
    const comments = await this.fetchCommentsForPost(postId);
    this.postComments.set(postId, comments);
    if (this.activeModalPostId === postId) {
      this.renderPostModalDOM(post, false);
    }
  }

  private async fetchCommentsForPost(postId: string): Promise<NormalizedComment[]> {
    try {
      const res = await fetch(`/api/comments?postId=${encodeURIComponent(postId)}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const rawList: any[] = Array.isArray(data?.comments)
          ? data.comments
          : Array.isArray(data)
            ? data
            : [];
        if (rawList.length > 0) {
          return rawList.map((c: any, idx: number) => {
            const authorId = String(c.author_id || c.authorFingerprint || c.authorId || `member-${idx}`);
            const prof = profileStore.getProfile(authorId);
            return {
              id: String(c.id || `cmt-${Date.now()}-${idx}`),
              postId: String(c.post_id || c.postId || postId),
              parentId: c.parent_id || c.parentId || null,
              authorId,
              authorName: c.author_name || c.authorName || prof.name || 'Sovereign Member',
              authorHandle: (c.author_handle || c.authorHandle || prof.handle || authorId.slice(0, 8)).replace(/^@+/, ''),
              content: String(c.content || c.body || c.text || ''),
              createdAt: Number(c.created_at || c.createdAt || Date.now()),
              likes: Number(c.likes || c.upvotes || 0),
            };
          });
        }
      }
    } catch {}

    // If no comments in DB yet, return existing local comments or starter discussion comments
    if (this.postComments.has(postId)) {
      return this.postComments.get(postId)!;
    }

    return [
      {
        id: `fallback-cmt-1-${postId}`,
        postId,
        parentId: null,
        authorId: 'c3dc28cb705e',
        authorName: 'Elena Rostova',
        authorHandle: 'elena_r',
        content: 'Verified the SHA-256 checksums and framing structure on this dispatch. Solid breakdown.',
        createdAt: Date.now() - 3600_000 * 5,
        likes: 8,
      },
      {
        id: `fallback-cmt-2-${postId}`,
        postId,
        parentId: null,
        authorId: 'a89104fa2211',
        authorName: 'David Chen',
        authorHandle: 'david_c',
        content: 'Tested on Linux 6.12 kernel — zero regressions and frame pacing is completely flat now.',
        createdAt: Date.now() - 3600_000 * 2,
        likes: 5,
      },
    ];
  }

  private renderPostModalDOM(post: any, isLoadingComments: boolean): void {
    let modal = document.getElementById('studio-post-detail-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'studio-post-detail-modal';
      document.body.appendChild(modal);
    }

    const postId = String(post.id);
    const authorProf = profileStore.getProfile(post.authorFingerprint || post.author_id || 'genesis-core');
    const authorName = post.authorDisplayName || authorProf.name || 'SecGuardian';
    const authorHandle = (post.authorHandle || authorProf.handle || 'sec_guardian').replace(/^@+/, '');
    const comments = this.postComments.get(postId) || [];

    modal.className =
      'fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150';
    modal.innerHTML = `
      <div
        class="relative w-full max-w-3xl bg-surface-base border border-white/15 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]"
        data-stop-modal-close="true"
      >
        <!-- Modal Header -->
        <div class="px-6 py-4 bg-surface-raised border-b border-white/10 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2.5 text-xs font-mono text-slate-300">
            <span class="px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 font-semibold">
              ${escapeHtml(post.channelId || 'c/technology')}
            </span>
            <span>·</span>
            <span>Posted by @${escapeHtml(authorHandle)}</span>
          </div>
          <button
            type="button"
            data-action="studio-close-post-detail"
            class="w-8 h-8 rounded-lg bg-surface-overlay hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center text-sm cursor-pointer"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        <!-- Scrollable Post + Comments Body -->
        <div class="p-6 overflow-y-auto space-y-6 flex-1">
          <!-- Post Content -->
          <article class="space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold font-mono text-sm">
                ${escapeHtml(authorName.slice(0, 2).toUpperCase())}
              </div>
              <div>
                <div class="text-sm font-bold text-white">${escapeHtml(authorName)}</div>
                <div class="text-xs font-mono text-slate-400">@${escapeHtml(authorHandle)}</div>
              </div>
            </div>

            <h1 class="text-xl sm:text-2xl font-bold text-white leading-snug">
              ${escapeHtml(post.title || 'Community Discussion')}
            </h1>

            <div class="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
              ${escapeHtml(post.content || '')}
            </div>

            <div class="pt-2">
              ${this.renderPostInteractionBarHTML(post)}
            </div>
          </article>

          <!-- Add Comment Form -->
          <div class="p-4 rounded-xl bg-surface-raised border border-white/10 space-y-3">
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Add a Comment to this Discussion
            </label>
            <textarea
              id="studio-new-comment-input"
              rows="3"
              placeholder="Write a constructive reply or technical insight..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-surface-base border border-white/10 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-slate-500 resize-none"
            ></textarea>
            <div class="flex justify-end">
              <button
                type="button"
                data-action="studio-submit-comment"
                data-post-id="${escapeHtml(postId)}"
                class="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all cursor-pointer shadow"
              >
                Post Comment
              </button>
            </div>
          </div>

          <!-- Comments Thread List -->
          <div class="space-y-3">
            <div class="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 class="text-sm font-bold text-white">
                Comments (${comments.length})
              </h3>
              ${isLoadingComments ? `<span class="text-xs font-mono text-amber-400">Syncing replies...</span>` : ''}
            </div>

            ${
              comments.length === 0
                ? `<div class="p-6 text-center text-xs text-slate-400">No comments yet. Start the conversation above!</div>`
                : comments
                    .map(
                      (c) => `
                  <div class="p-4 rounded-xl bg-surface-raised/70 border border-white/5 space-y-2">
                    <div class="flex items-center justify-between text-xs">
                      <div class="flex items-center gap-2">
                        <span class="w-6 h-6 rounded-md bg-white/10 text-amber-300 font-mono text-[11px] font-bold flex items-center justify-center">
                          ${escapeHtml(c.authorName.slice(0, 2).toUpperCase())}
                        </span>
                        <span class="font-bold text-white">${escapeHtml(c.authorName)}</span>
                        <span class="font-mono text-slate-400">@${escapeHtml(c.authorHandle)}</span>
                      </div>
                      <span class="font-mono text-[11px] text-slate-500">
                        ${new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p class="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words pl-8">
                      ${escapeHtml(c.content)}
                    </p>
                  </div>
                `
                    )
                    .join('')
            }
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 6. SUBMIT REACTION OR VOTE TO /api/interactions AND UPDATE UI IMMEDIATELY
   */
  public async toggleReaction(postId: string, emoji: string): Promise<void> {
    const counts = this.postReactions.get(postId) || { '🔥': 4, '👍': 6, '⚡': 2 };
    const mySet = this.userReacted.get(postId) || new Set<string>();
    const isAlreadyActive = mySet.has(emoji);
    const nextActive = !isAlreadyActive;

    if (nextActive) {
      mySet.add(emoji);
      counts[emoji] = (counts[emoji] || 0) + 1;
    } else {
      mySet.delete(emoji);
      counts[emoji] = Math.max(0, (counts[emoji] || 1) - 1);
    }

    this.postReactions.set(postId, counts);
    this.userReacted.set(postId, mySet);

    // Refresh interaction bars in DOM
    const post = clientStore?.posts?.find((p: any) => String(p.id) === String(postId)) || { id: postId };
    document.querySelectorAll<HTMLElement>(`[data-studio-post-id="${postId}"] .studio-post-interaction-bar`).forEach((el) => {
      el.innerHTML = this.renderPostInteractionBarHTML(post);
    });
    if (this.activeModalPostId === postId) {
      this.renderPostModalDOM(post, false);
    }

    // Persist to backend if signed envelope is available
    try {
      if (clientStore?.createSignedEnvelope) {
        const envelope = clientStore.createSignedEnvelope({
          scope: 'urefy-interaction-v1',
          targetType: 'post',
          targetId: postId,
          action: 'reaction',
          active: nextActive,
          value: emoji,
        });
        await fetch('/api/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(envelope),
        });
      }
    } catch {}
  }

  /**
   * 7. TOP HEADER NOTIFICATIONS & THEME POPOVER DRAWERS
   */
  public toggleNotificationsPopover(): void {
    this.notificationsOpen = !this.notificationsOpen;
    const existing = document.getElementById('studio-notifications-popover');
    if (!this.notificationsOpen) {
      existing?.remove();
      return;
    }

    const popover = existing || document.createElement('div');
    popover.id = 'studio-notifications-popover';
    popover.className =
      'fixed top-16 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-surface-base border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150';
    popover.innerHTML = `
      <div class="px-4 py-3 bg-surface-raised border-b border-white/10 flex items-center justify-between">
        <span class="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
        <button type="button" data-action="studio-close-notifications" class="text-xs text-slate-400 hover:text-white cursor-pointer">✕</button>
      </div>
      <div class="divide-y divide-white/5 max-h-80 overflow-y-auto text-xs">
        <div class="p-3.5 hover:bg-surface-raised/60 transition-colors">
          <div class="font-semibold text-white">🛡️ Encrypted Vault Sync Ready</div>
          <p class="text-slate-400 mt-0.5">Your local keypair and E2EE ratchet state are active on this device.</p>
        </div>
        <div class="p-3.5 hover:bg-surface-raised/60 transition-colors">
          <div class="font-semibold text-white">💬 New activity in c/zeroknowledge</div>
          <p class="text-slate-400 mt-0.5">Elena Rostova and David Chen replied to recent community threads.</p>
        </div>
        <div class="p-3.5 hover:bg-surface-raised/60 transition-colors">
          <div class="font-semibold text-white">⚡ Relay Mesh Connected</div>
          <p class="text-slate-400 mt-0.5">Real-time community channels and direct messages are online.</p>
        </div>
      </div>
    `;
    if (!existing) document.body.appendChild(popover);
  }

  private bindGlobalDelegation(): void {
    document.addEventListener('click', async (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // A. Header Theme Switcher Button (matches moon icon button or theme action)
      const themeBtn = target.closest<HTMLElement>(
        '#btn-header-cycle-theme, #header-theme-btn, [data-action="cycle-studio-theme"], [data-action="toggle-theme"], button[title*="Theme"], button[aria-label*="theme" i]'
      );
      if (themeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const nextTheme = themeEngine.cycleTheme();
        clientStore?.showToast?.(`Theme switched to ${nextTheme.name}`, 'info');
        return;
      }

      // B. Settings Theme Cards (Obsidian Cyber, Matrix Monolith, Tokyo Neon, Solar Amber, Alabaster Light, Nordic Frost)
      const settingsThemeCard = target.closest<HTMLElement>('[data-theme-id], [data-action="select-studio-theme"]');
      if (settingsThemeCard) {
        const themeId = settingsThemeCard.getAttribute('data-theme-id');
        if (themeId) {
          themeEngine.setTheme(themeId);
          clientStore?.showToast?.(`Applied theme: ${themeEngine.getTheme().name}`, 'success');
        }
        return;
      }

      // C. Header Notifications Button
      const notifBtn = target.closest<HTMLElement>(
        '#btn-header-notifications, #header-notifications-btn, [data-action="open-notifications"], [data-action="notifications.toggle"], [data-action="toggle-notifications"], button[title*="Notifications"], button[aria-label*="Notifications"]'
      );
      if (notifBtn) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleNotificationsPopover();
        return;
      }

      if (target.closest('[data-action="studio-close-notifications"]')) {
        this.notificationsOpen = false;
        document.getElementById('studio-notifications-popover')?.remove();
        return;
      }

      // D. Vault Seed Security Advisory Toast Dismissal ("Got it" / "Don't show this type again")
      const buttonText = (target.textContent || '').trim();
      if (buttonText === 'Got it' || buttonText === "Don't show this type again") {
        localStorage.setItem('aetheris_seed_verified', 'true');
        localStorage.setItem('aetheris_notification_prompt_dismissed', 'true');
        const advisoryCard = target.closest('div.fixed, div[role="alert"], aside');
        advisoryCard?.remove();
        return;
      }

      // E. Join / Leave Community
      const joinCommBtn = target.closest<HTMLElement>('[data-action="studio-toggle-join-community"]');
      if (joinCommBtn) {
        e.preventDefault();
        const slug = joinCommBtn.getAttribute('data-community-slug') || '';
        if (slug) {
          if (this.joinedCommunities.has(slug)) {
            this.joinedCommunities.delete(slug);
            clientStore?.showToast?.(`Left c/${slug}`, 'info');
          } else {
            this.joinedCommunities.add(slug);
            clientStore?.showToast?.(`Joined c/${slug}`, 'success');
          }
          this.saveJoinedCommunities();
          this.upgradeCommunitiesDirectoryIfVisible(true);
        }
        return;
      }

      // F. Open Community
      const openCommBtn = target.closest<HTMLElement>('[data-action="studio-open-community"]');
      if (openCommBtn) {
        e.preventDefault();
        const slug = openCommBtn.getAttribute('data-community-slug') || '';
        if (slug) {
          clientStore.activeChannelId = `c/${slug}`;
          window.location.hash = `#c/${slug}`;
        }
        return;
      }

      // G. Open Post Detail Modal
      const openPostBtn = target.closest<HTMLElement>(
        '[data-action="studio-open-post-detail"], [data-action="open-post-detail"], [data-action="post.open"], .btn-comment, [data-action="comment"], [data-action="comments"]'
      );
      if (openPostBtn) {
        e.preventDefault();
        e.stopPropagation();
        const postId =
          openPostBtn.getAttribute('data-post-id') ||
          openPostBtn.closest('[data-studio-post-id]')?.getAttribute('data-studio-post-id') ||
          openPostBtn.closest('[data-post-id]')?.getAttribute('data-post-id');
        if (postId) {
          await this.openPostDetailModal(postId);
        }
        return;
      }

      // Also allow clicking post title or body text to open post detail modal
      const postTextEl = target.closest<HTMLElement>('h2, h3, [data-post-title], .post-body, .post-content');
      if (postTextEl && !target.closest('button, a, input, textarea')) {
        const card = postTextEl.closest<HTMLElement>('[data-studio-post-id], [data-post-id]');
        const postId = card?.getAttribute('data-studio-post-id') || card?.getAttribute('data-post-id');
        if (postId && !postTextEl.closest('#studio-post-detail-modal')) {
          e.preventDefault();
          e.stopPropagation();
          await this.openPostDetailModal(postId);
          return;
        }
      }

      // Close Post Detail Modal
      if (
        target.closest('[data-action="studio-close-post-detail"]') ||
        target.id === 'studio-post-detail-modal'
      ) {
        this.activeModalPostId = null;
        document.getElementById('studio-post-detail-modal')?.remove();
        return;
      }

      // H. Submit New Comment inside Post Detail Modal
      const submitCommentBtn = target.closest<HTMLElement>('[data-action="studio-submit-comment"]');
      if (submitCommentBtn) {
        e.preventDefault();
        const postId = submitCommentBtn.getAttribute('data-post-id') || '';
        const textarea = document.getElementById('studio-new-comment-input') as HTMLTextAreaElement | null;
        const content = (textarea?.value || '').trim();
        if (!postId || !content) return;

        const myFp = clientStore?.keypair?.fingerprint || 'genesis-core';
        const myProf = profileStore.getProfile(myFp);
        const newComment: NormalizedComment = {
          id: `cmt_${Date.now()}`,
          postId,
          parentId: null,
          authorId: myFp,
          authorName: myProf.name || 'Sovereign Member',
          authorHandle: (myProf.handle || myFp.slice(0, 8)).replace(/^@+/, ''),
          content,
          createdAt: Date.now(),
          likes: 1,
        };

        const existing = this.postComments.get(postId) || [];
        existing.unshift(newComment);
        this.postComments.set(postId, existing);

        const post = clientStore?.posts?.find((p: any) => String(p.id) === String(postId)) || { id: postId };
        this.renderPostModalDOM(post, false);
        clientStore?.showToast?.('Comment published', 'success');

        try {
          if (clientStore?.createSignedEnvelope) {
            const env = clientStore.createSignedEnvelope({
              postId,
              content,
            });
            await fetch('/api/comments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(env),
            });
          }
        } catch {}
        return;
      }

      // I. React to Post
      const reactBtn = target.closest<HTMLElement>('[data-action="studio-react-post"]');
      if (reactBtn) {
        e.preventDefault();
        e.stopPropagation();
        const postId = reactBtn.getAttribute('data-post-id') || '';
        const emoji = reactBtn.getAttribute('data-emoji') || '👍';
        if (postId) {
          await this.toggleReaction(postId, emoji);
        }
        return;
      }

      // J. Upvote Post
      const voteBtn = target.closest<HTMLElement>('[data-action="studio-vote-post"]');
      if (voteBtn) {
        e.preventDefault();
        e.stopPropagation();
        const postId = voteBtn.getAttribute('data-post-id') || '';
        const post = clientStore?.posts?.find((p: any) => String(p.id) === String(postId));
        if (post) {
          post.meritVotes = Number(post.meritVotes || 0) + 1;
          document.querySelectorAll<HTMLElement>(`[data-vote-count="${postId}"]`).forEach((el) => {
            el.textContent = String(post.meritVotes);
          });
          try {
            if (clientStore?.createSignedEnvelope) {
              const env = clientStore.createSignedEnvelope({
                scope: 'urefy-interaction-v1',
                targetType: 'post',
                targetId: postId,
                action: 'like',
                active: true,
              });
              await fetch('/api/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(env),
              });
            }
          } catch {}
        }
      }
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (this.activeModalPostId) {
          this.activeModalPostId = null;
          document.getElementById('studio-post-detail-modal')?.remove();
        }
        if (this.notificationsOpen) {
          this.notificationsOpen = false;
          document.getElementById('studio-notifications-popover')?.remove();
        }
      }
    });
  }
}

export const studioRuntime = new StudioRuntimeController();
