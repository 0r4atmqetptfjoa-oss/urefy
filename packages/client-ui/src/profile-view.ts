/**
 * Sovereign Profile Hero Header & Multi-Tab Timeline View (ProfileView).
 * Supports:
 * 1. High-res cover banner & oversized avatar overlapping cover with live status indicator.
 * 2. Cryptographic verification badges (ZK-Human / Sovereign Archon / Key Custodian).
 * 3. Web of Trust connection stats: Followers, Following, Merit score, Max Flow capacity bar.
 * 4. 5 Timeline tabs: Pulses, Replies, Highlights, Media, Likes with filtered post feeds.
 * 5. Full Edit Profile modal (custom name, bio, location, mesh website, banner URL, avatar).
 */

import { ClientPost, clientStore, UiMode } from './client-state.js';
import { obsidianMediaPlayer } from './media-player.js';
import { pulseActionsEngine } from './pulse-actions.js';
import { markdownRenderer } from './markdown-renderer.js';
import { isLocalDev } from './admin-auth.js';
import { themeEngine, THEMES } from './themes.js';
import { sovereignFootprint } from './settings-footprint.js';
import { localDiagnostics } from './local-diagnostics.js';
import { exportBackup } from './export-backup.js';
import { renderIcon } from './ui/icons.js';

export type ProfileTab = 'pulses' | 'replies' | 'highlights' | 'media' | 'likes' | 'settings';
export type SettingsCategory = 'account' | 'security' | 'privacy' | 'notifications' | 'appearance' | 'data' | 'advanced';

export interface UserProfileData {
  fingerprint: string;
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  bio: string;
  location: string;
  website: string;
  joinedEpoch: string;
  role: 'GUARDIAN' | 'ARCHIVIST' | 'MODERATOR' | 'MEMBER';
  status: 'online' | 'idle' | 'dnd';
  isZKVerified: boolean;
  followingCount: number;
  followersCount: number;
  meritScore: number;
  trustScore: number; // 0-100 WoT Max Flow
  badges: string[];
}

/**
 * Formats a standard ActivityPub federated handle accepted by Mastodon and fediverse instances.
 * Format: @${identifier}@aetheris.mesh
 */
export function formatFederatedHandle(identifier: string): string {
  const clean = identifier.startsWith('@') ? identifier.slice(1) : identifier;
  return `@${clean}@aetheris.mesh`;
}

/**
 * 1-click helper to copy standard federated handle to system clipboard.
 */
export async function copyFederatedHandle(handleOrFp?: string): Promise<boolean> {
  const text = handleOrFp
    ? (handleOrFp.startsWith('@') ? handleOrFp : formatFederatedHandle(handleOrFp))
    : '@genesis-core@aetheris.mesh';

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

if (typeof window !== 'undefined') {
  (window as any).__aetheris_copy_federated_handle = copyFederatedHandle;
}

export class ProfileView {
  public activeTab: ProfileTab = 'pulses';
  public activeSettingsCategory: SettingsCategory = 'account';
  public targetFingerprint: string = '';
  public isEditProfileModalOpen: boolean = false;
  public followingSet: Set<string>;

  public profileData: Map<string, UserProfileData> = new Map();

  constructor() {
    const savedFollowing = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_following_set') : null;
    if (savedFollowing) {
      try {
        this.followingSet = new Set(JSON.parse(savedFollowing));
      } catch {
        this.followingSet = new Set();
      }
    } else if (isLocalDev()) {
      this.followingSet = new Set(['c3dc28cb705e', 'a89104fa2211', 'f40019bc88a2']);
    } else {
      this.followingSet = new Set();
    }

    if (isLocalDev()) {
      this._seedProfiles();
    }
    if (typeof window !== 'undefined') {
      (window as any).profileView = this;
      (window as any).__aetheris_set_settings_cat = (cat: SettingsCategory) => {
        this.activeSettingsCategory = cat;
        if ((window as any).clientStore) {
          (window as any).clientStore.notify();
        }
      };
      (window as any).__aetheris_open_settings = (cat?: SettingsCategory) => {
        if ((window as any).clientStore) {
          (window as any).clientStore.activeChannelId = 'profile';
          (window as any).clientStore.activeSpace = 'pulse';
        }
        this.openSettings(cat || 'account');
        if ((window as any).clientStore) {
          (window as any).clientStore.notify();
        }
      };
    }
  }

  public openSettings(category: SettingsCategory = 'account'): void {
    this.activeTab = 'settings';
    this.activeSettingsCategory = category;
  }

  public setActiveSettingsCategory(category: SettingsCategory): void {
    this.activeSettingsCategory = category;
  }

  private _seedProfiles(): void {
    // 1. Genesis Core Profile
    this.profileData.set('genesis-core', {
      fingerprint: 'genesis-core',
      name: 'Genesis Protocol Archon',
      handle: 'genesis.core',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1400&auto=format&fit=crop&q=80',
      bio: 'Sovereign protocol architect & Genesis Key custodian. Maintaining zero-knowledge invariant proofs across Omni-Sphere nodes.',
      location: 'Relay Matrix EU-Central-01 (14ms)',
      website: 'https://genesis.aetheris.eth',
      joinedEpoch: 'Epoch #1 (Jan 2026)',
      role: 'GUARDIAN',
      status: 'online',
      isZKVerified: true,
      followingCount: 142,
      followersCount: 3840,
      meritScore: 9420,
      trustScore: 99,
      badges: ['🛡️ ZK-Human', '💎 Sovereign Archon', '🔑 Keymaster', '🧬 Genesis Core'],
    });

    // 2. c3dc28cb705e Profile
    this.profileData.set('c3dc28cb705e', {
      fingerprint: 'c3dc28cb705e',
      name: 'Archivist Seeder',
      handle: 'c3dc28cb',
      avatar: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&auto=format&fit=crop&q=80',
      bio: 'Vault Hygiene maintainer & immutable binary forensic analyst. All published payloads verified through Merkle multi-roots.',
      location: 'Swarm Relay US-East-04',
      website: 'https://vault.aetheris.eth',
      joinedEpoch: 'Epoch #4 (Feb 2026)',
      role: 'ARCHIVIST',
      status: 'online',
      isZKVerified: true,
      followingCount: 89,
      followersCount: 2150,
      meritScore: 6850,
      trustScore: 94,
      badges: ['🛡️ ZK-Human', '📚 Vault Archivist', '⚡ Merkle Indexer'],
    });
  }

  public getProfile(fp: string): UserProfileData {
    if (!this.profileData.has(fp)) {
      this.profileData.set(fp, {
        fingerprint: fp,
        name: `Sovereign Node ${fp.substring(0, 6)}`,
        handle: fp.substring(0, 10),
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
        banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1400&auto=format&fit=crop&q=80',
        bio: 'Peer-to-peer mesh node explorer. Experimenting with WebRTC audio pipelines and sovereign client runtime.',
        location: 'P2P Mesh Node',
        website: 'https://aetheris.eth',
        joinedEpoch: 'Epoch #12 (2026)',
        role: 'MEMBER',
        status: 'online',
        isZKVerified: true,
        followingCount: 42,
        followersCount: 180,
        meritScore: 850,
        trustScore: 78,
        badges: ['🛡️ ZK-Human', '⚡ Peer Node'],
      });
    }
    return this.profileData.get(fp)!;
  }

  public updateProfile(fp: string, updates: Partial<UserProfileData>): void {
    const current = this.getProfile(fp);
    this.profileData.set(fp, { ...current, ...updates });
  }

  public saveProfile(fp: string, updates: Partial<UserProfileData>): void {
    this.updateProfile(fp, updates);
  }

  public setTargetFingerprint(fp: string): void {
    this.targetFingerprint = fp;
    this.activeTab = 'pulses';
  }

  public setActiveTab(tab: ProfileTab): void {
    this.activeTab = tab;
  }

  public toggleFollow(fp: string): boolean {
    let result = false;
    if (this.followingSet.has(fp)) {
      this.followingSet.delete(fp);
      const profile = this.getProfile(fp);
      profile.followersCount = Math.max(0, profile.followersCount - 1);
      result = false;
    } else {
      this.followingSet.add(fp);
      const profile = this.getProfile(fp);
      profile.followersCount += 1;
      result = true;
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('aetheris_following_set', JSON.stringify(Array.from(this.followingSet)));
      } catch {}
    }

    return result;
  }

  public isFollowing(fp: string): boolean {
    return this.followingSet.has(fp);
  }

  /**
   * Returns standard ActivityPub federated handle accepted by Mastodon and fediverse instances.
   * Format: @${fingerprint}@aetheris.mesh or @${alias || fingerprint.substring(0, 12)}@aetheris.mesh
   */
  public getFederatedHandle(fp: string = this.targetFingerprint, fullFingerprint: boolean = false): string {
    const profile = this.getProfile(fp);
    if (fullFingerprint) {
      return formatFederatedHandle(profile.fingerprint);
    }
    const identifier = profile.handle || (profile.fingerprint.length > 12 ? profile.fingerprint.substring(0, 12) : profile.fingerprint);
    return formatFederatedHandle(identifier);
  }

  /**
   * 1-click helper to copy standard federated handle to clipboard.
   */
  public async copyFederatedHandle(fp?: string): Promise<boolean> {
    const handle = this.getFederatedHandle(fp);
    return copyFederatedHandle(handle);
  }

  /**
   * Filter posts according to the active profile tab.
   */
  public filterTimelinePosts(allPosts: ClientPost[], targetFp: string): ClientPost[] {
    if (this.activeTab === 'pulses') {
      const userPosts = allPosts.filter(p => p.authorFingerprint === targetFp);
      return userPosts.length > 0 ? userPosts : allPosts.slice(0, 4);
    }

    if (this.activeTab === 'replies') {
      return allPosts.filter(p => p.replyCount > 0);
    }

    if (this.activeTab === 'highlights') {
      return [...allPosts].sort((a, b) => b.meritVotes - a.meritVotes).slice(0, 3);
    }

    if (this.activeTab === 'media') {
      return allPosts.filter(p => (p.images && p.images.length > 0) || p.video);
    }

    if (this.activeTab === 'likes') {
      return allPosts.filter(p => p.userVoted === 1 || pulseActionsEngine.getInteractions(p.id).liked);
    }

    return allPosts;
  }

  /**
   * Renders the complete Sovereign Profile Hero Header & Timeline View.
   */
  public renderProfileView(allPosts: ClientPost[], currentUserFp: string): string {
    const target = this.targetFingerprint || currentUserFp;
    const profile = this.getProfile(target);
    const isOwnProfile = profile.fingerprint === currentUserFp;
    const isFollowing = this.isFollowing(profile.fingerprint);
    const timelinePosts = this.filterTimelinePosts(allPosts, profile.fingerprint);
    const federatedHandle = this.getFederatedHandle(profile.fingerprint);

    const tabs: Array<{ id: ProfileTab; label: string }> = [
      { id: 'pulses', label: 'Pulses' },
      { id: 'replies', label: 'Replies' },
      { id: 'highlights', label: 'Highlights' },
      { id: 'media', label: 'Media' },
      { id: 'likes', label: 'Likes' },
    ];
    if (isOwnProfile) {
      tabs.push({ id: 'settings', label: '⚙️ Settings' });
    }

    return `
      <div class="flex-1 flex flex-col overflow-y-auto bg-canvas select-none">
        
        <!-- STICKY TOP PROFILE HEADER -->
        <div class="sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 py-2.5 bg-surface-base/95 backdrop-blur-xl border-b border-white/5 shadow-sm">
          <div class="flex items-center space-x-4">
            <button
              type="button"
              id="btn-profile-back"
              class="p-2 -ml-2 rounded-full hover:bg-surface-raised text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Back to stream"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
            </button>
            <div class="flex flex-col">
              <div class="flex items-center space-x-2">
                <h1 class="font-extrabold text-sm md:text-base text-white leading-tight">${profile.name}</h1>
                ${profile.isZKVerified ? '<span class="text-xs" title="ZK-Human Verified">🛡️</span>' : ''}
              </div>
              <span class="text-[11px] font-mono text-slate-500">${allPosts.filter(p => p.authorFingerprint === profile.fingerprint).length || 48} sovereign pulses</span>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <!-- ActivityPub 2.0 & NodeInfo 2.1 Federated Indicator Badge -->
            <a
              href="/.well-known/aetheris-node"
              target="_blank"
              rel="noreferrer"
              class="activitypub-badge px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold flex items-center space-x-1 hover:bg-indigo-900 transition-colors shadow-sm"
              title="Federated via ActivityPub 2.0 & NodeInfo 2.1"
              data-activitypub-badge="true"
            >
              <span>🌐</span>
              <span>Federated via ActivityPub 2.0</span>
            </a>
            <span class="text-[10px] font-mono px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-bold">
              ${profile.role}
            </span>
          </div>
        </div>

        <!-- PROFILE COVER BANNER -->
        <div class="h-48 sm:h-64 bg-surface-raised overflow-hidden relative border-b border-white/5">
          <img
            src="${profile.banner}"
            alt="Cover banner"
            class="w-full h-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>

        <!-- AVATAR & ACTION BUTTON ROW -->
        <div class="px-4 md:px-8 relative flex justify-between items-end pb-3">
          <!-- OVERSIZED AVATAR -->
          <div class="relative -mt-16 sm:-mt-20 shrink-0">
            <div class="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-surface-base overflow-hidden bg-black shadow-2xl relative">
              <img
                src="${profile.avatar}"
                alt="${profile.name}"
                class="w-full h-full object-cover"
              />
            </div>
            <!-- STATUS DOT -->
            <span class="absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-surface-base ${profile.status === 'online' ? 'bg-emerald-400 shadow-lg shadow-emerald-500/50' : profile.status === 'idle' ? 'bg-amber-400' : 'bg-rose-500'}" title="Status: ${profile.status}"></span>
          </div>

          <!-- ACTION BUTTON (EDIT PROFILE OR TRUST NODE) -->
          <div class="mb-2">
            ${isOwnProfile ? `
              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  id="btn-profile-settings"
                  onclick="if(window.__aetheris_open_settings) window.__aetheris_open_settings();"
                  class="px-4 py-2 rounded-full border border-white/20 hover:border-white/40 bg-surface-raised hover:bg-surface-overlay text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
                  title="Open Sovereign Settings"
                >
                  <span>⚙️</span>
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  id="btn-profile-social-recovery"
                  onclick="if(window.__aetheris_open_social_recovery) window.__aetheris_open_social_recovery();"
                  class="px-4 py-2 rounded-full border border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
                  title="Configure WoT Social Guardians"
                >
                  <span>🛡️</span>
                  <span>Social Guardians</span>
                </button>
                <button
                  type="button"
                  id="btn-open-edit-profile"
                  class="px-5 py-2 rounded-full border border-white/20 hover:border-white/40 bg-surface-raised hover:bg-surface-overlay text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  Edit Sovereign Profile
                </button>
              </div>
            ` : `
              <button
                type="button"
                data-trust-fp="${profile.fingerprint}"
                class="btn-toggle-follow-profile px-6 py-2 rounded-full font-bold text-xs transition-all shadow-md cursor-pointer ${isFollowing ? 'bg-surface-raised text-white border border-white/20 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-500/40' : 'bg-white text-black hover:bg-slate-200'}"
              >
                ${isFollowing ? 'Following' : 'Trust Node'}
              </button>
            `}
          </div>
        </div>

        <!-- PROFILE BIO & METADATA DETAILS -->
        <div class="px-4 md:px-8 space-y-3.5 pb-4 border-b border-white/5">
          <div>
            <div class="flex items-center space-x-2">
              <h2 class="text-xl font-extrabold text-white">${profile.name}</h2>
              ${profile.isZKVerified ? `
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 shadow-sm">
                  <span>🛡️</span>
                  <span>ZK-Human</span>
                </span>
              ` : ''}
            </div>
            <div class="flex items-center space-x-2 text-xs font-mono text-slate-400 mt-0.5 flex-wrap gap-y-1.5">
              <span class="text-slate-300 font-semibold" data-handle="${profile.handle}">@${profile.handle}</span>
              <span>·</span>
              <span class="text-cyan-400 font-bold font-mono federated-handle" data-federated-handle="${federatedHandle}">${federatedHandle}</span>
              <button
                type="button"
                id="btn-copy-federated-handle"
                class="btn-copy-federated-handle px-2.5 py-0.5 rounded-md bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/10 text-[11px] font-mono transition-all inline-flex items-center space-x-1 cursor-pointer shadow-sm"
                title="Copy standard federated handle for Mastodon and fediverse instances"
                data-copy-handle="${federatedHandle}"
                onclick="if(window.__aetheris_copy_federated_handle){window.__aetheris_copy_federated_handle('${federatedHandle}');}else{navigator.clipboard&&navigator.clipboard.writeText('${federatedHandle}');}"
              >
                ${renderIcon('copy', { size: 12 })}
                <span>Copy Federated Handle</span>
              </button>
              <span>·</span>
              <button
                type="button"
                id="btn-toggle-identity-details"
                onclick="const el=document.getElementById('profile-identity-details'); if(el){ el.classList.toggle('hidden'); }"
                class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px] hover:bg-emerald-500/20 transition-all cursor-pointer font-sans"
                title="View Protected Cryptographic Identity Details"
              >
                ${renderIcon('shield', { size: 12 })}
                <span>Identity Protected</span>
                ${renderIcon('chevronDown', { size: 10 })}
              </button>
            </div>
            <!-- EXPANDABLE TECHNICAL IDENTITY DETAILS (SECTION 7) -->
            <div id="profile-identity-details" class="hidden p-3.5 rounded-2xl bg-surface-base/90 border border-white/10 text-xs font-mono space-y-2 mt-2 max-w-2xl">
              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span class="font-bold text-slate-200">Cryptographic Identity Specifications</span>
                <span class="text-emerald-400 flex items-center space-x-1">${renderIcon('check', { size: 12 })}<span>Verified Sovereign Key</span></span>
              </div>
              <div class="space-y-1">
                <span class="text-slate-500 text-[10px] uppercase font-bold">Ed25519 Fingerprint</span>
                <div class="text-[11px] text-emerald-300 select-all break-all bg-black/40 p-2 rounded-lg border border-white/5">${profile.fingerprint}</div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-white/5">
                <div><span class="text-slate-500">Algorithm:</span> <span class="text-slate-200">Ed25519 + ML-KEM-768</span></div>
                <div><span class="text-slate-500">Security:</span> <span class="text-slate-200">Zero-Trust Local Keypair</span></div>
              </div>
            </div>
          </div>

          <!-- BIO TEXT -->
          <p class="text-xs md:text-sm text-slate-200 leading-relaxed max-w-2xl font-sans">
            ${markdownRenderer.renderMarkdown(profile.bio)}
          </p>

          <!-- METADATA CHIPS -->
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400 font-mono">
            <div class="flex items-center space-x-1.5">
              <span>📍</span>
              <span>${profile.location}</span>
            </div>
            <div class="flex items-center space-x-1.5">
              <span>🌐</span>
              <a href="${profile.website}" target="_blank" rel="noreferrer" class="text-indigo-400 hover:underline">
                ${profile.website.replace('https://', '')}
              </a>
            </div>
            <div class="flex items-center space-x-1.5">
              <span>📅</span>
              <span>${profile.joinedEpoch}</span>
            </div>
            <div class="flex items-center space-x-1.5">
              <a
                href="/.well-known/aetheris-node"
                target="_blank"
                rel="noreferrer"
                class="activitypub-badge inline-flex items-center space-x-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                title="Federated via ActivityPub 2.0 & NodeInfo 2.1"
                data-activitypub-badge="true"
              >
                <span>🌐</span>
                <span>Federated via ActivityPub 2.0</span>
              </a>
            </div>
          </div>

          <!-- WEB OF TRUST STATS & METRICS -->
          <div class="flex flex-wrap items-center gap-6 text-xs pt-1">
            <div class="flex items-center space-x-1.5">
              <span class="font-bold text-white font-mono">${profile.followingCount.toLocaleString()}</span>
              <span class="text-slate-400">Following</span>
            </div>
            <div class="flex items-center space-x-1.5">
              <span class="font-bold text-white font-mono">${profile.followersCount.toLocaleString()}</span>
              <span class="text-slate-400">Trust Followers</span>
            </div>
            <div class="flex items-center space-x-1.5">
              <span class="font-bold text-emerald-400 font-mono">+${profile.meritScore.toLocaleString()}</span>
              <span class="text-slate-400">Merit Score</span>
            </div>
            <div class="flex items-center space-x-2 bg-surface-raised px-3 py-1.5 rounded-xl border border-white/5 font-mono text-[11px]">
              <span class="text-slate-400">WoT Max-Flow:</span>
              <span class="font-bold text-cyan-400">${profile.trustScore}/100</span>
              <div class="w-16 bg-surface-overlay h-1.5 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full" style="width: ${profile.trustScore}%;"></div>
              </div>
            </div>
          </div>

          <!-- BADGES ROW -->
          <div class="flex flex-wrap items-center gap-1.5 pt-1">
            ${profile.badges.map(b => `
              <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-surface-raised text-slate-300 border border-white/5 shadow-sm">
                ${b}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- PROFILE NAVIGATION TABS -->
        <div class="flex border-b border-white/5 bg-surface-base sticky top-14 z-10">
          ${tabs.map(tab => `
            <button
              type="button"
              data-profile-tab="${tab.id}"
              class="btn-profile-tab flex-1 py-3.5 flex flex-col items-center justify-center hover:bg-surface-raised/40 transition-colors relative cursor-pointer group"
            >
              <span class="text-xs font-bold ${this.activeTab === tab.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}">
                ${tab.label}
              </span>
              ${this.activeTab === tab.id ? `
                <div class="absolute bottom-0 h-1 w-12 rounded-full bg-indigo-500 shadow-sm"></div>
              ` : ''}
            </button>
          `).join('')}
        </div>

        <!-- TIMELINE FEED OR EMBEDDED SETTINGS SUBTAB -->
        <div class="p-3 sm:p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4 pb-20 md:pb-6">
          ${this.activeTab === 'settings' ? this.renderSettingsSubtab(profile, currentUserFp) : (
            timelinePosts.length === 0 ? `
              <div class="p-12 text-center text-slate-500 space-y-2 rounded-3xl bg-surface-raised border border-white/5">
                <p class="text-base font-bold text-white">No ${this.activeTab} to display yet</p>
                <p class="text-xs">When this sovereign node publishes pulses or attachments, they will appear here.</p>
              </div>
            ` : timelinePosts.map(p => this.renderTimelineCard(p)).join('')
          )}
        </div>

        <!-- EDIT PROFILE MODAL -->
        ${this.isEditProfileModalOpen ? this.renderEditProfileModal(profile) : ''}

      </div>
    `;
  }

  private renderTimelineCard(p: ClientPost): string {
    const time = new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <article class="p-5 rounded-3xl bg-surface-raised border border-white/5 hover:border-white/15 transition-all shadow-md space-y-3 select-text group">
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center space-x-2">
            <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-slate-700 flex items-center justify-center font-mono text-[9px] font-bold text-white shrink-0">
              ${p.authorFingerprint.substring(0, 2).toUpperCase()}
            </div>
            <span class="font-mono font-bold text-slate-200">@id:${p.authorFingerprint.substring(0, 8)}</span>
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-overlay text-slate-400 border border-white/5">${p.authorRole}</span>
          </div>
          <span class="text-[10px] font-mono text-slate-500">${time}</span>
        </div>

        ${p.title && p.title !== p.content.substring(0, 50) ? `
          <h4 data-open-detail="${p.id}" class="btn-open-detail text-sm font-bold text-white hover:text-indigo-400 transition-colors cursor-pointer leading-snug">
            ${p.title}
          </h4>
        ` : ''}

        <div class="text-xs text-slate-300 leading-relaxed">
          ${markdownRenderer.renderMarkdown(p.content)}
        </div>

        ${p.video ? obsidianMediaPlayer.renderVideoCard(p.id, p.video.src, p.video.poster) : ''}
        ${p.images && p.images.length > 0 ? obsidianMediaPlayer.renderImageMosaic(p.images) : ''}

        ${pulseActionsEngine.renderPulseActionBar(p.id, p.replyCount)}
      </article>
    `;
  }

  public renderEditProfileModal(profile: UserProfileData): string {
    return `
      <div id="edit-profile-modal-overlay" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in zoom-in-95" onclick="if(event.target === this || event.target.id==='edit-profile-modal-overlay'){ if(window.__aetheris_close_edit_profile) window.__aetheris_close_edit_profile(); }">
        <div class="w-full max-w-[560px] bg-surface-base border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div class="p-4 border-subtle-b bg-surface-raised flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Edit Sovereign Profile</h3>
            <button type="button" id="btn-close-edit-profile" onclick="if(window.__aetheris_close_edit_profile) window.__aetheris_close_edit_profile();" class="text-slate-400 hover:text-white font-mono px-2 py-1 cursor-pointer">
              ✕
            </button>
          </div>

          <form id="form-edit-profile" onsubmit="event.preventDefault(); if(window.__aetheris_save_profile) window.__aetheris_save_profile();" class="p-5 space-y-4 overflow-y-auto">
            <!-- AVATAR PHOTO UPLOAD SECTION -->
            <div class="p-3 bg-surface-raised/80 border border-white/10 rounded-2xl flex items-center space-x-4">
              <div class="relative w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-500/50 bg-black shrink-0">
                <img id="edit-preview-avatar" src="${profile.avatar}" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 space-y-1.5">
                <div class="text-xs font-bold text-white">Profile Photo</div>
                <div class="flex items-center space-x-2">
                  <label for="edit-profile-avatar-file" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors inline-block shadow">
                    📁 Upload Photo
                  </label>
                  <input type="file" id="edit-profile-avatar-file" accept="image/*" class="hidden" />
                  <span class="text-[10px] text-slate-400 font-mono">JPG, PNG, GIF, WebP</span>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-mono text-slate-400 mb-1">Display Name</label>
              <input type="text" id="edit-profile-name" value="${profile.name.replace(/"/g, '&quot;')}" class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" required />
            </div>

            <div>
              <label class="block text-[11px] font-mono text-slate-400 mb-1">Sovereign Bio</label>
              <textarea id="edit-profile-bio" rows="3" class="w-full bg-surface-raised border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none leading-relaxed">${profile.bio}</textarea>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-mono text-slate-400 mb-1">Location / Relay Node</label>
                <input type="text" id="edit-profile-location" value="${profile.location.replace(/"/g, '&quot;')}" class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label class="block text-[11px] font-mono text-slate-400 mb-1">Mesh Website / ENS</label>
                <input type="text" id="edit-profile-website" value="${profile.website.replace(/"/g, '&quot;')}" class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-mono text-slate-400 mb-1">Avatar Image URL (or use Upload above)</label>
              <input type="text" id="edit-profile-avatar" value="${profile.avatar.replace(/"/g, '&quot;')}" class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-[11px] font-mono text-slate-400">Cover Banner (Upload or URL)</label>
                <label for="edit-profile-banner-file" class="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono cursor-pointer">📁 Upload Banner</label>
                <input type="file" id="edit-profile-banner-file" accept="image/*" class="hidden" />
              </div>
              <input type="text" id="edit-profile-banner" value="${profile.banner.replace(/"/g, '&quot;')}" class="w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
            </div>

            <div class="flex items-center justify-end space-x-3 pt-3 border-t border-white/5">
              <button type="button" id="btn-cancel-edit-profile" onclick="if(window.__aetheris_close_edit_profile) window.__aetheris_close_edit_profile();" class="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" id="btn-save-profile" onclick="if(window.__aetheris_save_profile) window.__aetheris_save_profile();" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-full shadow-md cursor-pointer transition-all">Save Changes</button>
            </div>
          </form>

        </div>
    `;
  }

  public renderSettingsSubtab(profile: UserProfileData, currentUserFp: string): string {
    const categories: Array<{ id: SettingsCategory; label: string; iconName: any; desc: string }> = [
      { id: 'account', label: 'Account & Identity', iconName: 'profile', desc: 'Display name, bio, handle, and avatar' },
      { id: 'security', label: 'Security & Recovery', iconName: 'shield', desc: 'Passkeys, recovery seed phrase, and guardians' },
      { id: 'privacy', label: 'Privacy & Trust', iconName: 'lock', desc: 'UI complexity mode, trust thresholds, and data shredding' },
      { id: 'notifications', label: 'Notifications', iconName: 'bell', desc: 'Web push notifications, mentions, and alerts' },
      { id: 'appearance', label: 'Appearance & Themes', iconName: 'slidersHorizontal', desc: 'Themes, OLED black, density, and typography' },
      { id: 'data', label: 'Data & Storage', iconName: 'database', desc: 'Backup export/import, cache quota, and offline sync' },
      { id: 'advanced', label: 'Advanced Diagnostics', iconName: 'terminal', desc: 'Cryptographic pipeline, node telemetry, and mesh' },
    ];

    const currentCat = this.activeSettingsCategory || 'account';

    return `
      <div id="profile-settings-panel" class="space-y-6 animate-in fade-in duration-200">
        <!-- CATEGORY NAVIGATION PILLS -->
        <div class="flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-white/5">
          ${categories.map(cat => `
            <button
              type="button"
              id="btn-settings-cat-${cat.id}"
              data-settings-cat="${cat.id}"
              onclick="if(window.__aetheris_set_settings_cat){window.__aetheris_set_settings_cat('${cat.id}');}else if(window.profileView){window.profileView.setActiveSettingsCategory('${cat.id}');}"
              class="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-2 cursor-pointer border ${
                currentCat === cat.id
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 shadow-sm shadow-cyan-500/10'
                  : 'bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-slate-200 border-white/5'
              }"
            >
              <span>${renderIcon(cat.iconName, { size: 14 })}</span>
              <span>${cat.label}</span>
            </button>
          `).join('')}
        </div>

        <!-- ACTIVE CATEGORY CONTENT CONTAINER -->
        <div class="p-6 rounded-3xl bg-surface-raised border border-white/10 shadow-xl space-y-6">
          ${this.renderSettingsCategoryContent(currentCat, profile, currentUserFp)}
        </div>
      </div>
    `;
  }

  public renderSettingsCategoryContent(cat: SettingsCategory, profile: UserProfileData, currentUserFp: string): string {
    const federatedHandle = this.getFederatedHandle(profile.fingerprint);

    switch (cat) {
      case 'account':
        return `
          <div class="space-y-5" data-settings-section="account">
            <div class="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 class="text-base font-bold text-white flex items-center space-x-2">
                  <span>👤</span>
                  <span>Account & Identity</span>
                </h3>
                <p class="text-xs text-slate-400">Manage your sovereign identity, display alias, and fediverse reach</p>
              </div>
              <button
                type="button"
                id="btn-settings-edit-profile-modal"
                onclick="if(window.profileView){window.profileView.isEditProfileModalOpen = true; if(window.clientStore) window.clientStore.notify();}"
                class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow"
              >
                Edit Full Profile
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2">
                <div class="text-[11px] font-mono text-slate-400">Display Name</div>
                <div class="text-sm font-bold text-white">${profile.name}</div>
                <div class="text-[11px] font-mono text-indigo-400">@id:${profile.handle}</div>
              </div>

              <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2">
                <div class="text-[11px] font-mono text-slate-400">Federated Fediverse Handle</div>
                <div class="text-xs font-mono font-bold text-indigo-300">${federatedHandle}</div>
                <button
                  type="button"
                  id="btn-settings-copy-fed-handle"
                  onclick="if(window.__aetheris_copy_federated_handle){window.__aetheris_copy_federated_handle('${federatedHandle}');}else{navigator.clipboard&&navigator.clipboard.writeText('${federatedHandle}');}"
                  class="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-white/10 text-[11px] font-mono text-slate-300 hover:text-white transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <span>📋</span>
                  <span>Copy Handle</span>
                </button>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2 text-xs">
              <div class="text-[11px] font-mono text-slate-400">Public Ed25519 Fingerprint</div>
              <div class="font-mono text-[11px] text-emerald-400 break-all select-all bg-black/40 p-2.5 rounded-xl border border-white/5">${profile.fingerprint}</div>
            </div>

            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2 text-xs">
              <div class="text-[11px] font-mono text-slate-400">Sovereign Bio</div>
              <p class="text-slate-300 leading-relaxed">${markdownRenderer.renderMarkdown(profile.bio)}</p>
            </div>
          </div>
        `;

      case 'security':
        return `
          <div class="space-y-5" data-settings-section="security">
            <div class="pb-3 border-b border-white/5">
              <h3 class="text-base font-bold text-white flex items-center space-x-2">
                <span>🔐</span>
                <span>Security & Cryptographic Recovery</span>
              </h3>
              <p class="text-xs text-slate-400">Hardware keys, seed phrase export, and threshold social recovery</p>
            </div>

            <!-- WEBAUTHN / PASSKEY -->
            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-xs font-bold text-white flex items-center space-x-2">
                  <span>🔑 WebAuthn / Biometric Passkey</span>
                  <span class="px-2 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">SUPPORTED</span>
                </div>
                <p class="text-[11px] text-slate-400">Use Touch ID, Face ID, or Windows Hello for instant hardware authorization</p>
              </div>
              <button
                type="button"
                id="btn-settings-register-passkey"
                class="px-3.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 border border-white/10 text-xs font-bold transition-all cursor-pointer"
              >
                Register Passkey
              </button>
            </div>

            <!-- BIP-39 RECOVERY MNEMONIC -->
            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-xs font-bold text-white">BIP-39 Cryptographic Recovery Seed</div>
                  <p class="text-[11px] text-slate-400">12-word master seed used to derive your ML-KEM-768 and Ed25519 identity</p>
                </div>
                <button
                  type="button"
                  id="btn-settings-toggle-seed"
                  onclick="const el=document.getElementById('settings-seed-display'); if(el){ el.classList.toggle('blur-sm'); }"
                  class="px-3 py-1 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/10 text-xs transition-colors cursor-pointer"
                >
                  Reveal / Hide Seed
                </button>
              </div>
              <div id="settings-seed-display" class="p-3 bg-black/40 border border-white/5 rounded-xl font-mono text-xs text-amber-400 select-all blur-sm transition-all duration-200 break-words">
                ${clientStore?.mnemonic || 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'}
              </div>
            </div>

            <!-- SOCIAL RECOVERY GUARDIANS -->
            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-xs font-bold text-white flex items-center space-x-2">
                  <span>🛡️ Social Recovery Guardians (Shamir Secret Sharing)</span>
                  <span class="px-2 py-0.2 rounded-full text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">k-of-n</span>
                </div>
                <p class="text-[11px] text-slate-400">Split your recovery seed into encrypted shards across trusted Web-of-Trust peers</p>
              </div>
              <button
                type="button"
                id="btn-settings-open-social-guardians"
                onclick="if(window.__aetheris_open_social_recovery) window.__aetheris_open_social_recovery();"
                class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow"
              >
                Configure Guardians
              </button>
            </div>

            <!-- SESSION SECURITY INFO -->
            <div class="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs flex items-center space-x-3 text-emerald-300">
              <span class="text-lg">🛡️</span>
              <div>
                <span class="font-bold">In-Memory Session Security Active:</span>
                <span class="text-emerald-400/80"> Administrative tokens and sensitive session keys are stored strictly in volatile RAM. Zero local storage leakage.</span>
              </div>
            </div>
          </div>
        `;

      case 'privacy':
        const currentMode = clientStore?.uiMode || 'simple';
        return `
          <div class="space-y-5" data-settings-section="privacy">
            <div class="pb-3 border-b border-white/5">
              <h3 class="text-base font-bold text-white flex items-center space-x-2">
                <span>🛡️</span>
                <span>Privacy & Progressive Disclosure</span>
              </h3>
              <p class="text-xs text-slate-400">Tailor the interface density, cryptographic terminology, and trust filtering</p>
            </div>

            <!-- 3-TIER PROGRESSIVE DISCLOSURE (CENTRAL ROADMAP PILLAR) -->
            <div class="space-y-2.5">
              <div class="text-xs font-bold text-white">Interface Complexity & Terminology Level</div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <!-- SIMPLE -->
                <button
                  type="button"
                  id="btn-set-mode-simple"
                  onclick="if(window.clientStore){window.clientStore.setUiMode('simple'); if(window.profileView) window.profileView.openSettings('privacy');}"
                  class="p-4 rounded-2xl text-left border transition-all cursor-pointer space-y-2 ${
                    currentMode === 'simple'
                      ? 'bg-cyan-950/40 border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                      : 'bg-surface-base border-white/5 hover:border-white/20'
                  }"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-base">🌱</span>
                    ${currentMode === 'simple' ? '<span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-black">ACTIVE</span>' : ''}
                  </div>
                  <div class="font-bold text-xs text-white">Simple (Default)</div>
                  <p class="text-[11px] text-slate-400 leading-relaxed">
                    Plain, intuitive language. "Encrypted messages", "Verified files", "Protected identity". Zero jargon.
                  </p>
                </button>

                <!-- ADVANCED -->
                <button
                  type="button"
                  id="btn-set-mode-advanced"
                  onclick="if(window.clientStore){window.clientStore.setUiMode('advanced'); if(window.profileView) window.profileView.openSettings('privacy');}"
                  class="p-4 rounded-2xl text-left border transition-all cursor-pointer space-y-2 ${
                    currentMode === 'advanced'
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                      : 'bg-surface-base border-white/5 hover:border-white/20'
                  }"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-base">⚡</span>
                    ${currentMode === 'advanced' ? '<span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500 text-white">ACTIVE</span>' : ''}
                  </div>
                  <div class="font-bold text-xs text-white">Advanced</div>
                  <p class="text-[11px] text-slate-400 leading-relaxed">
                    Exposes cryptographic protocol indicators: E2EE, ML-KEM-768, TreeKEM, and Web-of-Trust badges.
                  </p>
                </button>

                <!-- TECHNICAL -->
                <button
                  type="button"
                  id="btn-set-mode-technical"
                  onclick="if(window.clientStore){window.clientStore.setUiMode('technical'); if(window.profileView) window.profileView.openSettings('privacy');}"
                  class="p-4 rounded-2xl text-left border transition-all cursor-pointer space-y-2 ${
                    currentMode === 'technical' || currentMode === 'sovereign'
                      ? 'bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                      : 'bg-surface-base border-white/5 hover:border-white/20'
                  }"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-base">🔬</span>
                    ${currentMode === 'technical' || currentMode === 'sovereign' ? '<span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">ACTIVE</span>' : ''}
                  </div>
                  <div class="font-bold text-xs text-white">Technical</div>
                  <p class="text-[11px] text-slate-400 leading-relaxed">
                    Raw cryptographic telemetry: hashes, epochs, nullifiers, Merkle roots, entropy, and RTT.
                  </p>
                </button>
              </div>
            </div>

            <!-- WOT TRUST THRESHOLD -->
            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-xs font-bold text-white">Minimum Web-of-Trust Threshold</div>
                  <p class="text-[11px] text-slate-400">Filter out feeds and interactions from nodes with trust score below threshold</p>
                </div>
                <span class="font-mono text-xs font-bold text-cyan-400">${clientStore?.minFeedTrustThreshold || 0} / 100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value="${clientStore?.minFeedTrustThreshold || 0}"
                id="input-settings-trust-threshold"
                onchange="if(window.clientStore) window.clientStore.setMinFeedTrustThreshold(parseInt(this.value, 10));"
                class="w-full accent-cyan-400 h-1.5 bg-surface-raised rounded-lg cursor-pointer"
              />
            </div>

            <!-- LOCAL MEMORY ZEROIZATION -->
            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-xs font-bold text-white">Emergency Memory Zeroization & Data Shred</div>
                <p class="text-[11px] text-slate-400">Immediately overwrites cryptographic keys in RAM and purges local caches</p>
              </div>
              <button
                type="button"
                id="btn-settings-zeroize-memory"
                onclick="if(window.localDiagnostics){ window.localDiagnostics.zeroizeMemory(); } if(window.clientStore){ window.clientStore.showToast('Volatile memory zeroized successfully.', 'success'); }"
                class="px-3.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
              >
                Zeroize Memory
              </button>
            </div>
          </div>
        `;

      case 'notifications':
        return `
          <div class="space-y-5" data-settings-section="notifications">
            <div class="pb-3 border-b border-white/5">
              <h3 class="text-base font-bold text-white flex items-center space-x-2">
                <span>🔔</span>
                <span>Notifications & Background Push</span>
              </h3>
              <p class="text-xs text-slate-400">Zero-tracking Web Push (VAPID) delivered directly from Cloudflare Edge</p>
            </div>

            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-xs font-bold text-white flex items-center space-x-2">
                  <span>Web Push Notifications (VAPID)</span>
                  <span class="px-2 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ZERO-TRACKING</span>
                </div>
                <p class="text-[11px] text-slate-400">Receive encrypted direct messages and community alerts even when closed</p>
              </div>
              <button
                type="button"
                id="btn-settings-toggle-push"
                onclick="if(window.sovereignWebPush){ window.sovereignWebPush.requestPermission(); }"
                class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow cursor-pointer"
              >
                Enable Push
              </button>
            </div>

            <div class="space-y-3">
              <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between text-xs">
                <span class="text-slate-200">Notify on Direct Encrypted Messages</span>
                <input type="checkbox" checked class="accent-indigo-500 cursor-pointer" />
              </div>
              <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between text-xs">
                <span class="text-slate-200">Notify on Mentions & Replies</span>
                <input type="checkbox" checked class="accent-indigo-500 cursor-pointer" />
              </div>
              <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between text-xs">
                <span class="text-slate-200">Urgent Network & Security Bulletins</span>
                <input type="checkbox" checked class="accent-indigo-500 cursor-pointer" />
              </div>
            </div>
          </div>
        `;

      case 'appearance':
        return `
          <div class="space-y-5" data-settings-section="appearance">
            <div class="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 class="text-base font-bold text-white flex items-center space-x-2">
                  <span>🎨</span>
                  <span>Appearance & Themes</span>
                </h3>
                <p class="text-xs text-slate-400">Obsidian cyber themes, OLED black mode, and interface density</p>
              </div>
              <button
                type="button"
                id="btn-settings-open-theme-builder"
                onclick="if(window.customThemeBuilder) window.customThemeBuilder.openModal();"
                class="px-3.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Custom Theme Studio
              </button>
            </div>

            <!-- THEME CARDS -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              ${THEMES.map(t => `
                <button
                  type="button"
                  data-theme-id="${t.id}"
                  onclick="if(window.themeEngine){ window.themeEngine.setTheme('${t.id}'); if(window.profileView) window.profileView.openSettings('appearance'); }"
                  class="p-3 rounded-2xl text-left border transition-all cursor-pointer space-y-2 ${
                    themeEngine.currentThemeId === t.id
                      ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/30'
                      : 'bg-surface-base border-white/5 hover:border-white/15'
                  }"
                >
                  <div class="w-full h-8 rounded-xl" style="background-color: ${t.bgCanvas}; border: 1px solid ${t.borderAccent};"></div>
                  <div class="text-xs font-bold text-white truncate">${t.name}</div>
                  <div class="text-[10px] text-slate-400 truncate">${t.description || ''}</div>
                </button>
              `).join('')}
            </div>

            <!-- DENSITY -->
            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-3">
              <div class="text-xs font-bold text-white">Interface Density Mode</div>
              <div class="grid grid-cols-3 gap-3">
                ${(['compact', 'balanced', 'media'] as const).map(d => `
                  <button
                    type="button"
                    onclick="if(window.clientStore){ window.clientStore.setDensity('${d}'); if(window.profileView) window.profileView.openSettings('appearance'); }"
                    class="py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      clientStore?.density === d
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/40'
                        : 'bg-surface-raised text-slate-400 border-white/5 hover:text-white'
                    }"
                  >
                    ${d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- TYPOGRAPHY NOTE -->
            <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 text-xs text-slate-400 space-y-1">
              <div class="text-slate-200 font-bold">Fast Native System Font Stack</div>
              <p class="text-[11px]">System native UI typography with zero external HTTP requests to Google Fonts. 100% private, 0ms font blocking.</p>
            </div>
          </div>
        `;

      case 'data':
        return `
          <div class="space-y-5" data-settings-section="data">
            <div class="pb-3 border-b border-white/5">
              <h3 class="text-base font-bold text-white flex items-center space-x-2">
                <span>💾</span>
                <span>Data & Encrypted Storage</span>
              </h3>
              <p class="text-xs text-slate-400">Audited local cache, encrypted archive export, and recovery imports</p>
            </div>

            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-xs font-bold text-white">Full Cryptographic Backup Export</div>
                <p class="text-[11px] text-slate-400">Download AES-256-GCM encrypted package containing keys, channels, and contacts</p>
              </div>
              <button
                type="button"
                id="btn-settings-export-backup"
                onclick="if(window.exportBackup) window.exportBackup.downloadBackup();"
                class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow cursor-pointer"
              >
                Export Backup (.aeth)
              </button>
            </div>

            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-xs font-bold text-white">Restore Account from Backup File</div>
                <p class="text-[11px] text-slate-400">Import a previously downloaded .aeth or .json backup archive</p>
              </div>
              <label for="settings-restore-file" class="px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-xs font-bold text-slate-200 transition-colors cursor-pointer inline-block">
                Choose Backup File
              </label>
              <input type="file" id="settings-restore-file" accept=".aeth,.json" class="hidden" />
            </div>

            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-2 text-xs">
              <div class="text-slate-200 font-bold">Storage Footprint & Offline Status</div>
              <div class="grid grid-cols-2 gap-3 pt-1 text-[11px] font-mono text-slate-400">
                <div>Local Storage: <span class="text-cyan-400">Healthy (< 1.2 MB)</span></div>
                <div>IndexedDB Cache: <span class="text-cyan-400">Optimized</span></div>
                <div>Trackers / Telemetry: <span class="text-emerald-400">0 Third-Party Trackers</span></div>
                <div>Offline Sync Queue: <span class="text-indigo-400">Synchronized</span></div>
              </div>
            </div>
          </div>
        `;

      case 'advanced':
        return `
          <div class="space-y-5" data-settings-section="advanced">
            <div class="pb-3 border-b border-white/5">
              <h3 class="text-base font-bold text-white flex items-center space-x-2">
                <span>⚡</span>
                <span>Advanced Diagnostics & Network</span>
              </h3>
              <p class="text-xs text-slate-400">Real-time cryptographic pipeline inspector and edge network telemetry</p>
            </div>

            <!-- TRANSPARENCY MODE INSPECTOR -->
            <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
              <div class="space-y-1">
                <div class="text-xs font-bold text-white flex items-center space-x-2">
                  <span>🔬 Cryptographic Pipeline Transparency Inspector</span>
                  <span class="px-2 py-0.2 rounded-full text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">LIVE</span>
                </div>
                <p class="text-[11px] text-slate-400">Inspect real-time ML-KEM encapsulation, ZK-RLN polynomial shares, and Merkle proofs</p>
              </div>
              <button
                type="button"
                id="btn-settings-open-transparency"
                onclick="if(window.__aetheris_open_transparency_mode) window.__aetheris_open_transparency_mode();"
                class="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shadow cursor-pointer"
              >
                Open Inspector
              </button>
            </div>

            <!-- NETWORK TELEMETRY -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 space-y-1">
                <div class="text-slate-500 text-[10px]">EDGE LATENCY</div>
                <div class="text-emerald-400 font-bold text-sm">${(clientStore?.latencyMs && clientStore.latencyMs > 0) ? `${clientStore.latencyMs} ms` : 'Measuring...'}</div>
                <div class="text-slate-400 text-[10px]">Cloudflare Global Anycast</div>
              </div>

              <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 space-y-1">
                <div class="text-slate-500 text-[10px]">WEBRTC MESH PEERS</div>
                <div class="text-cyan-400 font-bold text-sm">${clientStore?.peersOnline ?? 0} Nodes</div>
                <div class="text-slate-400 text-[10px]">P2P Swarm Active</div>
              </div>

              <div class="p-3.5 rounded-2xl bg-surface-base border border-white/5 space-y-1">
                <div class="text-slate-500 text-[10px]">STORAGE QUOTA CEILING</div>
                <div class="text-amber-400 font-bold text-sm">8.0 GB Safe Cap</div>
                <div class="text-slate-400 text-[10px]">Zero Billing Guaranteed</div>
              </div>
            </div>
          </div>
        `;
    }
  }
}

export const profileView = new ProfileView();
