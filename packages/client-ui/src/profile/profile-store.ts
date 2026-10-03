/**
 * @file profile-store.ts
 * @package @aetheris/client-ui/profile
 * @description Sovereign Profile Data & Follows Store.
 * Contains in-memory profile cache, following sets, identity resolution,
 * and social graph persistence without dragging in heavy profile timeline
 * renderers or settings HTML.
 */

import { UserProfileData, ProfileTab, SettingsCategory, formatFederatedHandle, copyFederatedHandle } from './types.js';
import { clientStore } from '../client-state.js';
import { isDemoModeEnabled } from '../demo-mode.js';
import { SOVEREIGN_PERSONAS } from './seed-profiles-data.js';

export class ProfileStore {
  public followingSet: Set<string>;
  public profileData: Map<string, UserProfileData> = new Map();
  public pendingFollows = new Set<string>();
  public savingProfiles = new Set<string>();
  public targetFingerprint: string = '';
  public editDraft: Partial<UserProfileData> | null = null;
  public isEditProfileModalOpen: boolean = false;
  public activeTab: ProfileTab = 'pulses';
  public activeSettingsCategory: SettingsCategory = 'account';
  public lastTabSwitched: boolean = false;

  constructor() {
    const savedFollowing = typeof localStorage !== 'undefined' ? localStorage.getItem('aetheris_following_set') : null;
    if (savedFollowing) {
      try {
        this.followingSet = new Set(JSON.parse(savedFollowing));
      } catch {
        this.followingSet = new Set();
      }
    } else if (isDemoModeEnabled()) {
      this.followingSet = new Set(['c3dc28cb705e', 'a89104fa2211', 'f40019bc88a2']);
    } else {
      this.followingSet = new Set();
    }

    if (isDemoModeEnabled()) this.seedDevProfiles();

    if (typeof globalThis !== 'undefined') {
      (globalThis as any).profileStore = this;
      if (!(globalThis as any).profileView) {
        (globalThis as any).profileView = this;
      }
    }
  }

  protected seedDevProfiles(): void {
    for (const p of SOVEREIGN_PERSONAS) {
      this.profileData.set(p.fingerprint, p);
    }

    this.profileData.set('genesis-core', {
      fingerprint: 'genesis-core',
      name: 'Genesis Protocol Archon',
      handle: 'genesis-core',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=genesis-core&backgroundColor=0f172a,1e1b4b,180a3e',
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      bio: 'Product engineer & privacy advocate. Building UREfy — the social network you actually own.',
      location: 'San Francisco, CA',
      website: 'https://urefy.com',
      joinedEpoch: 'Early Member',
      role: 'GUARDIAN',
      status: 'online',
      isZKVerified: true,
      followingCount: 12,
      followersCount: 1420,
      meritScore: 9940,
      trustScore: 98,
      badges: ['🛡️ ZK-Human', '💎 Sovereign Archon', '🔑 Keymaster'],
    });
  }

  public getProfile(fp: string): UserProfileData {
    if (!this.profileData.has(fp)) {
      if (typeof localStorage !== 'undefined') {
        try {
          const cached = localStorage.getItem(`aetheris_profile_${fp}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.name && parsed.name !== 'Profile not set up') {
              this.profileData.set(fp, parsed);
              return this.profileData.get(fp)!;
            }
          }
        } catch (_) {}
      }
      const known = (typeof clientStore !== 'undefined' ? clientStore.members?.find((m: any) => m.fingerprint === fp) : null) as any;
      const knownPost = (typeof clientStore !== 'undefined' ? clientStore.posts?.find((p: any) => p.authorFingerprint === fp && (p.authorDisplayName || p.authorHandle)) : null) as any;
      const postName = knownPost?.authorDisplayName || (knownPost?.authorHandle ? knownPost.authorHandle.replace(/^@/, '') : null);
      const postHandle = knownPost?.authorHandle ? knownPost.authorHandle.replace(/^@/, '') : '';
      const postAvatar = knownPost?.authorAvatarUrl || '';

      const name = known?.name || postName || (!isDemoModeEnabled() ? 'Profile not set up' : fp === 'genesis-core' ? 'Genesis Protocol Archon' : fp === 'c3dc28cb705e' ? 'Elena Rostova' : fp === 'a89104fa2211' ? 'David Chen' : fp === 'f40019bc88a2' ? 'Maya Patel' : fp === '9b22a011cd44' ? 'Samira Khan' : 'Profile not set up');
      const handle = known?.handle?.replace(/^@/, '') || postHandle || (!isDemoModeEnabled() ? '' : fp === 'genesis-core' ? 'genesis-core' : fp === 'c3dc28cb705e' ? 'elena_r' : fp === 'a89104fa2211' ? 'david_c' : fp === 'f40019bc88a2' ? 'maya_p' : fp === '9b22a011cd44' ? 'samira' : '');
      const avatar = known?.avatar || postAvatar || '';

      this.profileData.set(fp, {
        fingerprint: fp,
        name,
        handle,
        avatar,
        banner: '',
        bio: '',
        location: '',
        website: '',
        joinedEpoch: 'Member',
        role: 'MEMBER',
        status: 'idle',
        isZKVerified: false,
        followingCount: 0,
        followersCount: 0,
        meritScore: 0,
        trustScore: 0,
        badges: [],
      });
    } else {
      const current = this.profileData.get(fp)!;
      if (current.name === 'Profile not set up' || !current.handle) {
        const knownPost = (typeof clientStore !== 'undefined' ? clientStore.posts?.find((p: any) => p.authorFingerprint === fp && (p.authorDisplayName || p.authorHandle)) : null) as any;
        if (knownPost?.authorDisplayName || knownPost?.authorHandle) {
          if (knownPost.authorDisplayName) current.name = knownPost.authorDisplayName;
          if (knownPost.authorHandle) current.handle = knownPost.authorHandle.replace(/^@/, '');
          if (knownPost.authorAvatarUrl && !current.avatar) current.avatar = knownPost.authorAvatarUrl;
        }
      }
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

  public isFollowing(fp: string): boolean {
    return this.followingSet.has(fp);
  }

  public toggleFollow(fp: string): boolean {
    if (this.pendingFollows.has(fp) || (typeof clientStore !== 'undefined' && fp === clientStore.keypair?.fingerprint)) {
      return this.isFollowing(fp);
    }
    const wasFollowing = this.isFollowing(fp);
    const beforeCount = this.getProfile(fp).followersCount;
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
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && typeof clientStore !== 'undefined' && clientStore.createSignedEnvelope) {
      this.pendingFollows.add(fp);
      const envelope = clientStore.createSignedEnvelope({ action: result ? 'follow' : 'unfollow', followingId: fp });
      void fetch('/api/follows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envelope) }).then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Follow change could not be saved');
        data.isFollowing ? this.followingSet.add(fp) : this.followingSet.delete(fp);
        clientStore.showToast(data.isFollowing ? 'Following this person' : 'Unfollowed', 'info');
      }).catch(error => {
        wasFollowing ? this.followingSet.add(fp) : this.followingSet.delete(fp);
        this.getProfile(fp).followersCount = beforeCount;
        clientStore.showToast(error.message || 'Follow change could not be saved', 'warning');
      }).finally(() => {
        this.pendingFollows.delete(fp);
        try { localStorage.setItem('aetheris_following_set', JSON.stringify([...this.followingSet])); } catch (_) {}
        clientStore.notify();
      });
    }
    return result;
  }

  public async saveProfile(fp: string, updates: Partial<UserProfileData>): Promise<boolean> {
    const pv = (globalThis as any).profileView;
    if (pv && pv !== this && typeof pv.saveProfile === 'function') {
      return pv.saveProfile(fp, updates);
    }
    return this.saveProfileDirect(fp, updates);
  }

  public async saveProfileDirect(fp: string, updates: Partial<UserProfileData>): Promise<boolean> {
    if (this.savingProfiles.has(fp)) return false;
    const before = { ...this.getProfile(fp) };
    this.updateProfile(fp, updates);
    if (typeof window === 'undefined') return true;
    this.savingProfiles.add(fp);
    clientStore.notify();
    try {
      if (fp !== clientStore.keypair?.fingerprint) throw new Error('Only your own profile can be edited');
      const profile = this.getProfile(fp);
      const envelope = clientStore.createSignedEnvelope({
        scope: 'urefy-profile-v1',
        action: 'save',
        displayName: profile.name,
        handle: profile.handle,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        avatarUrl: profile.avatar,
        bannerUrl: profile.banner,
        pinnedPostId: profile.pinnedPostId
      });
      const response = await fetch('/api/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envelope) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Profile could not be saved');
      this.isEditProfileModalOpen = false;
      this.editDraft = null;
      clientStore.showToast('Profile saved', 'success');
      return true;
    } catch (error) {
      this.editDraft = { ...before, ...updates };
      this.updateProfile(fp, before);
      clientStore.showToast(error instanceof Error ? error.message : 'Profile could not be saved', 'warning');
      return false;
    } finally {
      this.savingProfiles.delete(fp);
      clientStore.notify();
    }
  }

  public async syncFollowing(): Promise<void> {
    const owner = clientStore.keypair?.fingerprint;
    if (!owner) return;
    try {
      const response = await fetch(`/api/follows?userId=${encodeURIComponent(owner)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.following) || this.pendingFollows.size || owner !== clientStore.keypair?.fingerprint) return;
      this.followingSet = new Set(result.following);
      localStorage.setItem('aetheris_following_set', JSON.stringify(result.following));
      clientStore.notify();
    } catch { /* retain the last known social graph while offline */ }
  }

  public async loadPublicProfile(fp: string): Promise<void> {
    try {
      const response = await fetch(`/api/profiles?userId=${encodeURIComponent(fp)}`);
      const data = await response.json();
      if (!response.ok || !data.success || this.savingProfiles.has(fp)) return;
      if (!data.profile) {
        Object.assign(this.getProfile(fp), data.stats || {});
        clientStore.notify();
        return;
      }
      const p = data.profile;
      if (p.displayName || p.handle || p.updatedAt) {
        this.updateProfile(fp, {
          name: p.displayName || p.handle || 'UREfy Member',
          handle: p.handle || '',
          bio: p.bio || '',
          avatar: p.avatarUrl || '',
          banner: p.bannerUrl || '',
          website: p.website || '',
          location: p.location || '',
          ...data.stats
        });
      } else {
        Object.assign(this.getProfile(fp), data.stats || {});
      }
      clientStore.notify();
    } catch { /* keep cached identity while offline */ }
  }

  public setTargetFingerprint(fp: string): void {
    if (this.targetFingerprint !== fp) {
      this.lastTabSwitched = true;
    }
    this.targetFingerprint = fp;
    if (typeof window !== 'undefined') void this.loadPublicProfile(fp);
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
}

export const profileStore = new ProfileStore();
