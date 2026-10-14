import { UserProfileData, ProfileTab, SettingsCategory, formatFederatedHandle, copyFederatedHandle } from './types.js';
import { clientStore } from '../client-state.js';
import { isDemoModeEnabled } from '../demo-mode.js';
import { SOVEREIGN_PERSONAS } from './seed-profiles-data.js';

const KNOWN_NODE_ALIASES: Record<string, { name: string; handle: string; role?: UserProfileData['role'] }> = {
  'genesis-core': { name: 'Genesis Protocol Archon', handle: 'genesis-core', role: 'GUARDIAN' },
  'genesis-co': { name: 'Genesis Core Relay', handle: 'genesis-co', role: 'GUARDIAN' },
  'c3dc28cb705e': { name: 'Elena Rostova', handle: 'elena_r', role: 'ARCHIVIST' },
  'c3dc28cb70': { name: 'Elena Rostova', handle: 'elena_r', role: 'ARCHIVIST' },
  'a89104fa2211': { name: 'David Chen', handle: 'david_c', role: 'MEMBER' },
  'a89104fa22': { name: 'David Chen', handle: 'david_c', role: 'MEMBER' },
  'f40019bc88a2': { name: 'Maya Patel', handle: 'maya_p', role: 'MODERATOR' },
  '9b22a011cd44': { name: 'Samira Khan', handle: 'samira', role: 'MEMBER' },
};

function sanitizeHandle(rawHandle?: string, fallbackFp?: string): string {
  const cleaned = (rawHandle || '').trim().replace(/^@+/, '');
  if (cleaned) return cleaned;
  if (!fallbackFp) return '';
  const fpClean = fallbackFp.trim().replace(/^@+/, '');
  return fpClean.length > 10 ? fpClean.slice(0, 10) : fpClean;
}

function humanizeIdentifier(handleOrFp: string): string {
  const clean = handleOrFp.trim().replace(/^@+/, '');
  if (!clean) return 'Sovereign Member';
  if (KNOWN_NODE_ALIASES[clean]) return KNOWN_NODE_ALIASES[clean].name;

  // If it looks like a hex fingerprint (e.g., 640c401d87), format cleanly as a Member Callsign
  if (/^[0-9a-f]{8,}$/i.test(clean)) {
    return `Member · ${clean.slice(0, 6).toUpperCase()}`;
  }

  // Convert snake_case or kebab-case handle into Title Case name
  return clean
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

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
    if (isDemoModeEnabled()) {
      this.seedDevProfiles();
    }
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).profileStore = this;
      if (!(globalThis as any).profileView) {
        (globalThis as any).profileView = this;
      }
    }
  }

  protected seedDevProfiles(): void {
    for (const p of SOVEREIGN_PERSONAS) {
      this.profileData.set(p.fingerprint, {
        ...p,
        handle: sanitizeHandle(p.handle, p.fingerprint),
      });
    }
    this.profileData.set('genesis-core', {
      fingerprint: 'genesis-core',
      name: 'Genesis Protocol Archon',
      handle: 'genesis-core',
      avatar: '',
      banner: '',
      bio: 'Systems architect & cryptography maintainer. Building UREfy — the social network you actually own.',
      location: 'Zurich · Mesh',
      website: 'https://urefy.com',
      joinedEpoch: 'Genesis Member',
      role: 'GUARDIAN',
      status: 'online',
      isZKVerified: true,
      followingCount: 12,
      followersCount: 1420,
      meritScore: 9940,
      trustScore: 98,
      badges: ['🛡️ ZK-Human', '💎 Sovereign Archon', '🔑 Keymaster', '🛡️ Verified Identity', '💎 Core Maintainer'],
    });
  }

  public getProfile(fp: string): UserProfileData {
    const normalizedFp = (fp || '').trim();
    if (!this.profileData.has(normalizedFp)) {
      if (typeof localStorage !== 'undefined') {
        try {
          const cached = localStorage.getItem(`aetheris_profile_${normalizedFp}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.name && parsed.name !== 'Profile not set up') {
              parsed.handle = sanitizeHandle(parsed.handle, normalizedFp);
              this.profileData.set(normalizedFp, parsed);
              return this.profileData.get(normalizedFp)!;
            }
          }
        } catch {}
      }

      const known = (
        typeof clientStore !== 'undefined'
          ? clientStore.members?.find((m: any) => m.fingerprint === normalizedFp)
          : null
      ) as any;
      const knownPost = (
        typeof clientStore !== 'undefined'
          ? clientStore.posts?.find(
              (p: any) => p.authorFingerprint === normalizedFp && (p.authorDisplayName || p.authorHandle)
            )
          : null
      ) as any;

      const isDemo = isDemoModeEnabled();
      const alias = isDemo ? KNOWN_NODE_ALIASES[normalizedFp] : undefined;
      const rawHandle =
        known?.handle ||
        knownPost?.authorHandle ||
        (isDemo ? alias?.handle || normalizedFp : '');
      const handle = rawHandle ? sanitizeHandle(rawHandle, isDemo ? normalizedFp : undefined) : '';

      const rawName =
        (known?.name && known.name !== 'Profile not set up' ? known.name : null) ||
        (knownPost?.authorDisplayName && knownPost.authorDisplayName !== 'Profile not set up'
          ? knownPost.authorDisplayName
          : null) ||
        (isDemo ? alias?.name || humanizeIdentifier(handle || normalizedFp) : 'Profile not set up');

      const avatar = known?.avatar || knownPost?.authorAvatarUrl || '';

      this.profileData.set(normalizedFp, {
        fingerprint: normalizedFp,
        name: rawName,
        handle,
        avatar,
        banner: '',
        bio: '',
        location: '',
        website: '',
        joinedEpoch: 'Member',
        role: alias?.role || 'MEMBER',
        status: 'online',
        isZKVerified: Boolean(alias),
        followingCount: 0,
        followersCount: 0,
        meritScore: 0,
        trustScore: alias ? 95 : 50,
        badges: [],
      });
    } else {
      const current = this.profileData.get(normalizedFp)!;
      if (current.name === 'Profile not set up' || !current.handle) {
        const knownPost = (typeof clientStore !== 'undefined' ? clientStore.posts?.find((p: any) => p.authorFingerprint === normalizedFp && (p.authorDisplayName || p.authorHandle)) : null) as any;
        if (knownPost?.authorDisplayName || knownPost?.authorHandle) {
          if (knownPost.authorDisplayName) current.name = knownPost.authorDisplayName;
          if (knownPost.authorHandle) current.handle = sanitizeHandle(knownPost.authorHandle);
          if (knownPost.authorAvatarUrl && !current.avatar) current.avatar = knownPost.authorAvatarUrl;
        }
      }
    }
    return this.profileData.get(normalizedFp)!;
  }

  public updateProfile(fp: string, updates: Partial<UserProfileData>): void {
    const current = this.getProfile(fp);
    const cleanUpdates = { ...updates };
    if (typeof cleanUpdates.handle === 'string') {
      cleanUpdates.handle = sanitizeHandle(cleanUpdates.handle, fp);
    }
    if (cleanUpdates.name === 'Profile not set up') {
      cleanUpdates.name = humanizeIdentifier(cleanUpdates.handle || current.handle || fp);
    }
    const updated = { ...current, ...cleanUpdates };
    this.profileData.set(fp, updated);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`aetheris_profile_${fp}`, JSON.stringify(updated));
      } catch {}
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
      } catch {}
    }
    if (typeof window !== 'undefined' && typeof clientStore !== 'undefined' && clientStore.createSignedEnvelope) {
      this.pendingFollows.add(fp);
      const envelope = clientStore.createSignedEnvelope({ action: result ? 'follow' : 'unfollow', followingId: fp });
      void fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error(data.error || 'Follow change could not be saved');
          data.isFollowing ? this.followingSet.add(fp) : this.followingSet.delete(fp);
          clientStore.showToast(data.isFollowing ? 'Following member' : 'Unfollowed', 'info');
        })
        .catch((error) => {
          wasFollowing ? this.followingSet.add(fp) : this.followingSet.delete(fp);
          this.getProfile(fp).followersCount = beforeCount;
          clientStore.showToast(error.message || 'Follow change could not be saved', 'warning');
        })
        .finally(() => {
          this.pendingFollows.delete(fp);
          try {
            localStorage.setItem('aetheris_following_set', JSON.stringify([...this.followingSet]));
          } catch {}
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
        handle: sanitizeHandle(profile.handle, fp),
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        avatarUrl: profile.avatar,
        bannerUrl: profile.banner,
        pinnedPostId: profile.pinnedPostId,
      });
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
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
      if (!response.ok || !result.success || !Array.isArray(result.following) || this.pendingFollows.size || owner !== clientStore.keypair?.fingerprint)
        return;
      this.followingSet = new Set(result.following);
      localStorage.setItem('aetheris_following_set', JSON.stringify(result.following));
      clientStore.notify();
    } catch {}
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
      const cleanHandle = sanitizeHandle(p.handle, fp);
      const resolvedName =
        p.displayName && p.displayName !== 'Profile not set up'
          ? p.displayName
          : humanizeIdentifier(cleanHandle || fp);

      this.updateProfile(fp, {
        name: resolvedName,
        handle: cleanHandle,
        bio: p.bio || '',
        avatar: p.avatarUrl || '',
        banner: p.bannerUrl || '',
        website: p.website || '',
        location: p.location || '',
        ...data.stats,
      });
      clientStore.notify();
    } catch {}
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
    const clean = sanitizeHandle(profile.handle, profile.fingerprint);
    return formatFederatedHandle(clean);
  }

  public async copyFederatedHandle(fp?: string): Promise<boolean> {
    const handle = this.getFederatedHandle(fp);
    return copyFederatedHandle(handle);
  }
}

export const profileStore = new ProfileStore();
