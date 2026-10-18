import { t } from '../i18n.js';
import { clientStore } from '../client-state.js';

export interface FeedPostCardData {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  authorFingerprint?: string;
  communitySlug?: string;
  createdAt: number | string;
  upvotes: number;
  commentCount: number;
  boostCount?: number;
  userVote?: 1 | -1 | 0;
  isBookmarked?: boolean;
  zkVerified?: boolean;
  wotScore?: number;
  audience?: 'public' | 'community' | 'followers';
  flair?: string;
  signatureHex?: string;
  reactions?: Record<string, number>;
  userReactions?: string[];
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRelativeTime(timestamp: number | string): string {
  const ms = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (Number.isNaN(ms)) return t('feed.justNow', undefined, 'acum');
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return t('feed.justNow', undefined, 'acum');
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}z`;
}

export function renderFeedPostCard(post: FeedPostCardData, uiMode: 'simple' | 'pro' = 'simple'): string {
  const safeId = escapeHtml(post.id);
  const safeTitle = escapeHtml(post.title);
  const safeAuthor = escapeHtml(post.authorName || 'Sovereign Peer');
  const safeHandle = escapeHtml(post.authorHandle || 'peer');
  const safeCommunity = escapeHtml(post.communitySlug || 'general');
  const relativeTime = formatRelativeTime(post.createdAt);
  const wotScore = typeof post.wotScore === 'number' ? post.wotScore : 94;
  const audienceLabel =
    post.audience === 'community'
      ? t('post.audienceCommunity', undefined, 'Community')
      : post.audience === 'followers'
        ? t('post.audienceFollowers', undefined, 'Followers')
        : t('post.audiencePublic', undefined, 'Public');

  const reactionCounts = post.reactions || { '🔥': 0, '⚡': 0, '🧠': 0, '🛡️': 0 };
  const activeReactions = new Set(post.userReactions || []);

  const reactionButtonsHtml = (['🔥', '⚡', '🧠', '🛡️'] as const)
    .map((emoji) => {
      const count = reactionCounts[emoji] || 0;
      const isActive = activeReactions.has(emoji);
      return `
        <button type="button"
                data-action="toggle-post-reaction"
                data-post-id="${safeId}"
                data-reaction="${emoji}"
                class="urefy-reaction-pill inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'
                }"
                aria-pressed="${isActive}">
          <span>${emoji}</span>
          ${count > 0 ? `<span class="tabular-nums">${count}</span>` : ''}
        </button>
      `;
    })
    .join('');

  return `
    <article class="urefy-post-card group relative bg-slate-900/75 hover:bg-slate-900/95 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition-all duration-150 shadow-sm"
             data-post-id="${safeId}"
             data-studio-enhanced="1">
      
      <!-- Header: Avatar + Identitate + Popover Criptografic (Progressive Disclosure) -->
      <header class="flex items-start justify-between gap-3 mb-3">
        <div class="flex items-center gap-3 min-w-0">
          <button type="button"
                  data-action="open-author-profile"
                  data-handle="${safeHandle}"
                  class="relative flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 p-[1.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <span class="flex items-center justify-center w-full h-full rounded-full bg-slate-950 text-slate-100 font-semibold text-sm">
              ${safeAuthor.charAt(0).toUpperCase()}
            </span>
          </button>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <button type="button"
                      data-action="open-author-profile"
                      data-handle="${safeHandle}"
                      class="font-semibold text-sm text-slate-100 hover:text-indigo-400 truncate transition-colors">
                ${safeAuthor}
              </button>

              <!-- Indicator unificat cu Popover Criptografic la Hover/Focus -->
              <div class="relative inline-flex items-center group/trust">
                <button type="button"
                        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        aria-label="${t('post.cryptoTrustBadge', undefined, 'Certificat Criptografic Suveran')}">
                  <span>🛡️</span>
                  ${uiMode === 'pro' ? `<span>ZK • WoT ${wotScore}%</span>` : ''}
                </button>

                <!-- Popover Criptografic (vizibil la hover sau focus în ambele moduri) -->
                <div class="urefy-trust-popover pointer-events-none opacity-0 group-hover/trust:opacity-100 group-focus-within/trust:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-2 z-30 w-64 p-3 rounded-xl bg-slate-950/95 border border-slate-700/80 shadow-xl text-xs text-slate-300 space-y-1.5">
                  <div class="flex items-center justify-between font-semibold text-slate-100 border-b border-slate-800 pb-1.5">
                    <span>${t('post.trustVerification', undefined, 'Verificare Zero-Knowledge')}</span>
                    <span class="text-emerald-400">Ed25519 OK</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Scor Web of Trust:</span>
                    <span class="font-mono text-emerald-400">${wotScore}%</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Audiență (Privacy Lens):</span>
                    <span class="text-indigo-300">${audienceLabel}</span>
                  </div>
                  ${
                    post.authorFingerprint
                      ? `<div class="flex justify-between">
                           <span class="text-slate-400">Amprentă Cheie:</span>
                           <span class="font-mono text-[11px] text-slate-300">${escapeHtml(post.authorFingerprint.slice(0, 12))}…</span>
                         </div>`
                      : ''
                  }
                </div>
              </div>

              <span class="text-xs text-slate-500 truncate">@${safeHandle}</span>
              <span class="text-slate-600">•</span>
              <button type="button"
                      data-action="open-community"
                      data-community="${safeCommunity}"
                      class="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                c/${safeCommunity}
              </button>
              <span class="text-slate-600">•</span>
              <time class="text-xs text-slate-400 tabular-nums">${relativeTime}</time>
            </div>

            ${
              uiMode === 'pro'
                ? `<div class="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                     <span>SIG: ${post.signatureHex ? escapeHtml(post.signatureHex.slice(0, 16)) + '…' : 'Ed25519-Verified'}</span>
                     <span>•</span>
                     <span>LENS: ${audienceLabel.toUpperCase()}</span>
                   </div>`
                : ''
            }
          </div>
        </div>

        <!-- Meniul Secundar Unificat (⋯) -->
        <div class="relative">
          <button type="button"
                  data-action="toggle-post-more-menu"
                  data-post-id="${safeId}"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
                  aria-label="${t('post.moreActions', undefined, 'Mai multe acțiuni')}"
                  aria-haspopup="menu">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>

          <div id="post-more-menu-${safeId}"
               class="hidden absolute right-0 top-full mt-1.5 z-40 w-52 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl text-xs text-slate-200"
               role="menu">
            <button type="button" data-action="award-post" data-post-id="${safeId}" class="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-left transition-colors" role="menuitem">
              <span>🏅</span> <span>${t('post.giveAward', undefined, 'Award Cryptographic Merit')}</span>
            </button>
            <button type="button" data-action="crosspost" data-post-id="${safeId}" class="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-left transition-colors" role="menuitem">
              <span>🔀</span> <span>${t('post.crosspost', undefined, 'Share to another community')}</span>
            </button>
            <button type="button" data-action="save-to-vault" data-post-id="${safeId}" class="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-left transition-colors" role="menuitem">
              <span>🔐</span> <span>${t('post.saveVault', undefined, 'Save to Local Vault')}</span>
            </button>
            <button type="button" data-action="verify-envelope" data-post-id="${safeId}" class="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-left transition-colors" role="menuitem">
              <span>🔍</span> <span>${t('post.verifySignature', undefined, 'Inspect Ed25519 Signature')}</span>
            </button>
            <div class="my-1 border-t border-slate-800"></div>
            <button type="button" data-action="report-post" data-post-id="${safeId}" class="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-rose-500/10 text-rose-400 text-left transition-colors" role="menuitem">
              <span>🚩</span> <span>${t('post.report', undefined, 'Report to Community Council')}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Corpul Postării -->
      <div class="cursor-pointer space-y-2 mb-3" data-action="open-post-detail" data-post-id="${safeId}">
        <h2 class="text-base sm:text-lg font-semibold text-slate-100 leading-snug group-hover:text-indigo-300 transition-colors">
          ${ post.flair ? `<span class="inline-block mr-2 px-2 py-0.5 text-[11px] font-medium rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 align-middle">${escapeHtml(post.flair)}</span>` : '' }
          ${safeTitle}
        </h2>
        <div class="text-sm text-slate-300 leading-relaxed line-clamp-4">
          ${post.content}
        </div>
      </div>

      <!-- Bara Nativă de Reacții Rapide (Fără CLS) -->
      <div class="flex items-center gap-1.5 flex-wrap mb-3 pt-1">
        ${reactionButtonsHtml}
      </div>

      <!-- Footer: Doar cele 4 Acțiuni Primare -->
      <footer class="flex items-center justify-between pt-2.5 border-t border-slate-800/60 text-xs text-slate-400">
        <div class="flex items-center gap-1 sm:gap-2">
          <!-- 1. Vot / Merit -->
          <div class="inline-flex items-center rounded-lg bg-slate-800/70 border border-slate-700/50 p-0.5">
            <button type="button"
                    data-action="vote-post"
                    data-post-id="${safeId}"
                    data-dir="up"
                    class="px-2 py-1 rounded-md hover:bg-slate-700/70 ${post.userVote === 1 ? 'text-emerald-400 font-semibold' : 'text-slate-300'} transition-colors"
                    aria-label="${t('post.upvote', undefined, 'Votează pozitiv')}">
              ▲
            </button>
            <span class="px-2 font-semibold tabular-nums text-slate-200" id="post-score-${safeId}">
              ${post.upvotes || 0}
            </span>
            <button type="button"
                    data-action="vote-post"
                    data-post-id="${safeId}"
                    data-dir="down"
                    class="px-2 py-1 rounded-md hover:bg-slate-700/70 ${post.userVote === -1 ? 'text-rose-400 font-semibold' : 'text-slate-400'} transition-colors"
                    aria-label="${t('post.downvote', undefined, 'Votează negativ')}">
              ▼
            </button>
          </div>

          <!-- 2. Comentarii (Deschide PostDetailView unificat) -->
          <button type="button"
                  data-action="open-post-detail"
                  data-post-id="${safeId}"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-transparent hover:border-slate-700/60 transition-all">
            <svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h8M8 14h5m-9 4l2.5-2.5H19a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12z" />
            </svg>
            <span class="tabular-nums font-medium">${post.commentCount || 0}</span>
            <span class="hidden sm:inline">${t('post.comments', undefined, 'Comentarii')}</span>
          </button>

          <!-- 3. Boost / Repost -->
          <button type="button"
                  data-action="boost-post"
                  data-post-id="${safeId}"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors">
            <span>🔁</span>
            <span class="tabular-nums">${post.boostCount || 0}</span>
          </button>
        </div>

        <!-- 4. Bookmark & Share -->
        <div class="flex items-center gap-1">
          <button type="button"
                  data-action="bookmark-post"
                  data-post-id="${safeId}"
                  class="p-1.5 rounded-lg hover:bg-slate-800 ${post.isBookmarked ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'} transition-colors"
                  aria-label="${t('post.bookmark', undefined, 'Bookmark post')}">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="${post.isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          <button type="button"
                  data-action="share-post"
                  data-post-id="${safeId}"
                  class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label="${t('post.share', undefined, 'Share link')}">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </footer>
    </article>
  `;
}
