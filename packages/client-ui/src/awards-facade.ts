/**
 * @file awards-facade.ts
 * @package @aetheris/client-ui
 * @description Lightweight Awards Facade for startup and home feed rendering.
 * Provides badge containers and award button markup without loading
 * the 55 kB modal templates, sound fx, and cryptographic submission engine
 * until the user actually opens or interacts with an award.
 */

import { clientStore } from './client-state.js';
import type { PostAward, SovereignAwardType, Award, GroupedAwardSummary } from './awards-types.js';

export type { PostAward, SovereignAwardType, Award, GroupedAwardSummary };

let fullAwardsModule: typeof import('./awards.js') | null = null;
let loadPromise: Promise<typeof import('./awards.js')> | null = null;

export function loadAwardsSystem(): Promise<typeof import('./awards.js')> {
  return loadPromise ??= import('./awards.js').then(m => {
    fullAwardsModule = m;
    if (typeof window !== 'undefined') {
      (window as any).awardsSystem = m.awardsSystem;
      (window as any).awardPopoverManager = m.awardPopoverManager;
    }
    clientStore.notify();
    return m;
  }).catch(err => {
    loadPromise = null;
    throw err;
  });
}

export class AwardsSystemFacade {
  private postAwards = new Map<string, PostAward[]>();
  private commentAwards = new Map<string, PostAward[]>();
  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).awardsSystem = this;
    }
  }

  private initStorage(): void {
    if (this.initialized || typeof localStorage === 'undefined') return;
    this.initialized = true;
    try {
      const rawPost = localStorage.getItem('aetheris_awards_cache');
      if (rawPost) {
        const obj = JSON.parse(rawPost);
        Object.keys(obj).forEach(k => this.postAwards.set(k, obj[k]));
      }
      const rawComm = localStorage.getItem('aetheris_comment_awards_cache');
      if (rawComm) {
        const obj = JSON.parse(rawComm);
        Object.keys(obj).forEach(k => this.commentAwards.set(k, obj[k]));
      }
    } catch {}
  }

  public renderAwardBadges(postId: string): string {
    if (fullAwardsModule) {
      return fullAwardsModule.awardsSystem.renderAwardBadges(postId);
    }
    this.initStorage();
    const list = this.postAwards.get(postId);
    if (!list || list.length === 0) {
      return `<div class="award-badges-container inline-flex items-center gap-1.5 empty:hidden" data-post-id="${postId}"></div>`;
    }
    // If post has awards in cache, load full module to render them faithfully
    void loadAwardsSystem();
    return `<div class="award-badges-container inline-flex items-center gap-1.5" data-post-id="${postId}"></div>`;
  }

  public renderGiveAwardButton(postId: string, userRole: string = 'GUARDIAN'): string {
    return `
      <button 
        type="button" 
        class="btn-open-award-modal group inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-mono text-slate-400 hover:text-amber hover:bg-surface-overlay border border-white/5 transition-all cursor-pointer" 
        data-post-id="${postId}" 
        data-user-role="${userRole}" 
        title="Bestow Sovereign Award"
      >
        <span class="group-hover:scale-110 transition-transform">🏅</span>
        <span>Award</span>
      </button>
    `;
  }

  public renderCommentAwardBadges(commentId: string): string {
    if (fullAwardsModule) {
      return fullAwardsModule.awardsSystem.renderCommentAwardBadges(commentId);
    }
    this.initStorage();
    const list = this.commentAwards.get(commentId);
    if (!list || list.length === 0) {
      return `<div class="comment-award-badges inline-flex items-center gap-1 my-0.5 empty:hidden" data-comment-id="${commentId}"></div>`;
    }
    void loadAwardsSystem();
    return `<div class="comment-award-badges inline-flex items-center gap-1 my-0.5" data-comment-id="${commentId}"></div>`;
  }

  public renderGiveCommentAwardButton(commentId: string, postId: string, userRole: string = 'GUARDIAN'): string {
    return `
      <button 
        type="button" 
        class="btn-open-comment-award-modal group inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg hover:bg-surface-overlay text-slate-400 hover:text-amber transition-all font-mono text-[11px] cursor-pointer" 
        data-comment-id="${commentId}" 
        data-post-id="${postId}" 
        data-user-role="${userRole}" 
        title="Bestow Award on Comment" 
      >
        <span class="text-xs group-hover:scale-110 transition-transform">🏅</span>
        <span>Award</span>
      </button>
    `;
  }

  public hydrateCommentAwards(commentId: string, awards: PostAward[]): void {
    this.initStorage();
    this.commentAwards.set(commentId, awards);
    if (fullAwardsModule) {
      fullAwardsModule.awardsSystem.hydrateCommentAwards(commentId, awards);
    }
  }

  public hydratePostAwards(postId: string, awards: PostAward[]): void {
    this.initStorage();
    this.postAwards.set(postId, awards);
    if (fullAwardsModule) {
      fullAwardsModule.awardsSystem.hydratePostAwards(postId, awards);
    }
  }

  public openModal(postId: string, userRole: string = 'GUARDIAN'): void {
    void loadAwardsSystem().then(m => m.awardsSystem.openModal(postId, userRole));
  }

  public openCommentModal(commentId: string, postId: string, userRole: string = 'GUARDIAN'): void {
    void loadAwardsSystem().then(m => m.awardsSystem.openCommentModal(commentId, postId, userRole));
  }

  public renderModal(): string {
    return '';
  }

  public closeModal(): void {
    if (fullAwardsModule) {
      fullAwardsModule.awardsSystem.closeModal();
    }
  }
}

export const awardsSystem = new AwardsSystemFacade();

export const awardPopoverManager = {
  init(): void {
    if (typeof document === 'undefined') return;
    const triggerLoad = () => {
      void loadAwardsSystem().then(m => m.awardPopoverManager.init());
    };
    document.addEventListener('mouseover', (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest('.award-badge-chip')) {
        triggerLoad();
      }
    }, { passive: true, once: true });
    document.addEventListener('click', (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest('.btn-open-award-modal, .btn-open-comment-award-modal, .btn-detail-award')) {
        triggerLoad();
      }
    }, { passive: true });
  }
};
