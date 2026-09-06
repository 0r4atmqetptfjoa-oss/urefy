/**
 * @file profile-view.ts
 * @package @aetheris/client-ui/profile
 * @description Sovereign Profile Master Orchestrator (ProfileView).
 */

import { UserProfileData, ProfileTab, SettingsCategory, formatFederatedHandle, copyFederatedHandle } from './types.js';
import { renderProfileHeaderHTML, renderEditProfileModalHTML } from './profile-header.js';
import { renderProfileTabsHTML } from './profile-tabs.js';
import { filterProfilePosts, renderProfileTimelinePostsHTML } from './profile-posts.js';
import { renderProfileSettingsHTML, renderSettingsCategoryContentHTML } from './profile-settings.js';
import { ClientPost } from '../client-state.js';
import { isLocalDev } from '../admin-auth.js';

export class ProfileView {
  public activeTab: ProfileTab = 'pulses';
  public activeSettingsCategory: SettingsCategory = 'account';
  public targetFingerprint: string = '';
  public isEditProfileModalOpen: boolean = false;
  public lastTabSwitched: boolean = false;
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
      this.seedDevProfiles();
    }
  }

  private seedDevProfiles(): void {
    this.profileData.set('genesis-core', {
      fingerprint: 'genesis-core-ed25519-master-key-000000000001',
      name: 'Genesis Protocol Archon',
      handle: 'genesis',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      bio: 'Sovereign root node for the Aetheris Mesh. Decoupled from central state, running Post-Quantum Cryptography and Web-of-Trust validation.',
      location: 'Global Anycast Mesh (Cloudflare)',
      website: 'https://aetheris-omni-sphere.pages.dev',
      joinedEpoch: 'Epoch 0 (Genesis)',
      role: 'GUARDIAN',
      status: 'online',
      isZKVerified: true,
      followingCount: 12,
      followersCount: 1420,
      meritScore: 9940,
      trustScore: 98,
      badges: ['🛡️ ZK-Human', '💎 Sovereign Archon', '🔑 Keymaster', '🔐 ML-KEM-768'],
    });

    this.profileData.set('c3dc28cb705e', {
      fingerprint: 'c3dc28cb705e8912aafe0192837465bd',
      name: 'Elena Rostova',
      handle: 'elena_zk',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
      banner: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
      bio: 'Applied Cryptographer & Zero-Knowledge researcher. Building Chaumian blind voting protocols and privacy-preserving reputation proofs.',
      location: 'Bucharest, RO',
      website: 'https://zk-research.eth',
      joinedEpoch: 'Epoch 12',
      role: 'ARCHIVIST',
      status: 'online',
      isZKVerified: true,
      followingCount: 84,
      followersCount: 512,
      meritScore: 4320,
      trustScore: 92,
      badges: ['🔬 ZK-Researcher', '🛡️ Key Custodian'],
    });
  }

  public getProfile(fp: string): UserProfileData {
    if (!this.profileData.has(fp)) {
      if (typeof localStorage !== 'undefined') {
        try {
          const cached = localStorage.getItem(`aetheris_profile_${fp}`);
          if (cached) {
            this.profileData.set(fp, JSON.parse(cached));
            return this.profileData.get(fp)!;
          }
        } catch (_) {}
      }
      const alias = fp.length > 12 ? fp.substring(0, 8) : fp;
      this.profileData.set(fp, {
        fingerprint: fp,
        name: `Sovereign Node (${alias})`,
        handle: alias,
        avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80`,
        banner: '',
        bio: 'Peer node participating in the decentralized sovereign mesh.',
        location: 'Decentralized P2P',
        website: '',
        joinedEpoch: 'Epoch 42',
        role: 'MEMBER',
        status: 'online',
        isZKVerified: true,
        followingCount: 0,
        followersCount: 0,
        meritScore: 100,
        trustScore: 70,
        badges: ['🛡️ Peer Node'],
      });
    }
    return this.profileData.get(fp)!;
  }

  public updateProfile(fp: string, updates: Partial<UserProfileData>): void {
    const current = this.getProfile(fp);
    const updated = { ...current, ...updates };
    this.profileData.set(fp, updated);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`aetheris_profile_${fp}`, JSON.stringify(updated));
      } catch (_) {}
    }
  }

  public saveProfile(fp: string, updates: Partial<UserProfileData>): void {
    this.updateProfile(fp, updates);
  }

  public setTargetFingerprint(fp: string): void {
    if (this.targetFingerprint !== fp) {
      this.lastTabSwitched = true;
    }
    this.targetFingerprint = fp;
    this.activeTab = 'pulses';
  }

  public setActiveTab(tab: ProfileTab): void {
    if (this.activeTab !== tab) {
      this.lastTabSwitched = true;
    }
    this.activeTab = tab;
  }

  public setActiveSettingsCategory(cat: SettingsCategory): void {
    this.activeSettingsCategory = cat;
    this.activeTab = 'settings';
  }

  public openSettings(category: SettingsCategory = 'account'): void {
    this.setActiveSettingsCategory(category);
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

  public getFederatedHandle(fp: string = this.targetFingerprint, fullFingerprint: boolean = false): string {
    const profile = this.getProfile(fp);
    if (fullFingerprint) {
      return formatFederatedHandle(profile.fingerprint);
    }
    const identifier = profile.handle || (profile.fingerprint.length > 12 ? profile.fingerprint.substring(0, 12) : profile.fingerprint);
    return formatFederatedHandle(identifier);
  }

  public async copyFederatedHandle(fp?: string): Promise<boolean> {
    const handle = this.getFederatedHandle(fp);
    return copyFederatedHandle(handle);
  }

  public filterTimelinePosts(allPosts: ClientPost[], targetFp: string): ClientPost[] {
    return filterProfilePosts(allPosts, this.activeTab, targetFp);
  }

  public renderEditProfileModal(profile?: UserProfileData): string {
    const p = profile || this.getProfile(this.targetFingerprint || 'genesis-core');
    return renderEditProfileModalHTML(p);
  }

  public renderSettingsCategoryContent(cat: SettingsCategory, profile: UserProfileData, currentUserFp: string): string {
    return renderSettingsCategoryContentHTML(cat, profile, currentUserFp);
  }

  public renderProfileView(allPosts: ClientPost[], currentUserFp: string): string {
    const target = this.targetFingerprint || currentUserFp;
    const profile = this.getProfile(target);
    const isOwnProfile = target === currentUserFp;
    const isFollowing = this.isFollowing(target);

    return `
      <div id="sovereign-profile-container" class="flex-1 w-full h-full min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 pb-28 lg:pb-12 scroll-smooth">
        <div class="max-w-4xl mx-auto space-y-6">
          <!-- 1. HERO HEADER -->
          ${renderProfileHeaderHTML(profile, isOwnProfile, isFollowing, this.isEditProfileModalOpen)}

          <!-- 2. TIMELINE TABS BAR -->
          ${renderProfileTabsHTML(this.activeTab, isOwnProfile)}

          <!-- 3. TAB CONTENT -->
          <div id="profile-tab-content-area" class="transition-all duration-200">
            ${
              this.activeTab === 'settings' && isOwnProfile
                ? renderProfileSettingsHTML(this.activeSettingsCategory, profile, currentUserFp)
                : renderProfileTimelinePostsHTML(this.filterTimelinePosts(allPosts, target), this.activeTab, target)
            }
          </div>
        </div>
      </div>
    `;
  }
}

export const profileView = new ProfileView();

if (typeof window !== 'undefined') {
  (window as any).profileView = profileView;
  (window as any).__aetheris_set_settings_cat = (cat: SettingsCategory) => {
    profileView.setActiveSettingsCategory(cat);
    if ((window as any).clientStore) (window as any).clientStore.notify();
  };
  (window as any).__aetheris_save_profile = () => {
    const nameInput = document.getElementById('edit-profile-name') as HTMLInputElement;
    const bioInput = document.getElementById('edit-profile-bio') as HTMLTextAreaElement;
    const locInput = document.getElementById('edit-profile-location') as HTMLInputElement;
    const webInput = document.getElementById('edit-profile-website') as HTMLInputElement;
    const avInput = document.getElementById('edit-profile-avatar') as HTMLInputElement;
    const banInput = document.getElementById('edit-profile-banner') as HTMLInputElement;

    const targetFp = profileView.targetFingerprint || (window as any).clientStore?.keypair?.fingerprint || 'genesis-core';
    profileView.updateProfile(targetFp, {
      name: nameInput?.value || 'Sovereign Node',
      bio: bioInput?.value || '',
      location: locInput?.value || '',
      website: webInput?.value || '',
      avatar: avInput?.value || profileView.getProfile(targetFp).avatar,
      banner: banInput?.value || profileView.getProfile(targetFp).banner,
    });
    profileView.isEditProfileModalOpen = false;
    if ((window as any).clientStore) {
      (window as any).clientStore.showToast?.('✨ Sovereign Profile updated!', 'success');
      (window as any).clientStore.notifySync();
    }
  };
}
