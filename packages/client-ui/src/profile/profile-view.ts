/**
 * @file profile-view.ts
 * @package @aetheris/client-ui/profile
 * @description Sovereign Profile Master Orchestrator (ProfileView).
 * Wraps the lightweight ProfileStore and provides HTML template rendering
 * for profile hero, timeline tabs, and settings categories.
 */

import { UserProfileData, ProfileTab, SettingsCategory } from './types.js';
import { renderProfileHeaderHTML, renderEditProfileModalHTML } from './profile-header.js';
import { renderProfileTabsHTML } from './profile-tabs.js';
import { renderProfileSettingsHTML, renderSettingsCategoryContentHTML } from './profile-settings.js';
import { renderProfileTimelinePostsHTML, filterProfilePosts } from './profile-posts.js';
import { ClientPost, clientStore } from '../client-state.js';
import { presentPublicIdentity } from '../public-identity.js';
import { ProfileStore, profileStore } from './profile-store.js';

export class ProfileView {
  public _store: ProfileStore;

  constructor(store?: ProfileStore) {
    this._store = store || new ProfileStore();
    (globalThis as any).profileView = this;
    if (typeof window !== 'undefined') (window as any).profileView = this;
  }

  get followingSet(): Set<string> {
    return this._store.followingSet;
  }
  set followingSet(v: Set<string>) {
    this._store.followingSet = v;
  }

  get profileData(): Map<string, UserProfileData> {
    return this._store.profileData;
  }
  set profileData(v: Map<string, UserProfileData>) {
    this._store.profileData = v;
  }

  get pendingFollows(): Set<string> {
    return this._store.pendingFollows;
  }
  set pendingFollows(v: Set<string>) {
    this._store.pendingFollows = v;
  }

  get savingProfiles(): Set<string> {
    return this._store.savingProfiles;
  }
  set savingProfiles(v: Set<string>) {
    this._store.savingProfiles = v;
  }

  get targetFingerprint(): string {
    return this._store.targetFingerprint;
  }
  set targetFingerprint(v: string) {
    this._store.targetFingerprint = v;
  }

  get editDraft(): Partial<UserProfileData> | null {
    return this._store.editDraft;
  }
  set editDraft(v: Partial<UserProfileData> | null) {
    this._store.editDraft = v;
  }

  get isEditProfileModalOpen(): boolean {
    return this._store.isEditProfileModalOpen;
  }
  set isEditProfileModalOpen(v: boolean) {
    this._store.isEditProfileModalOpen = v;
  }

  get activeTab(): ProfileTab {
    return this._store.activeTab;
  }
  set activeTab(v: ProfileTab) {
    this._store.activeTab = v;
  }

  get activeSettingsCategory(): SettingsCategory {
    return this._store.activeSettingsCategory;
  }
  set activeSettingsCategory(v: SettingsCategory) {
    this._store.activeSettingsCategory = v;
  }

  get lastTabSwitched(): boolean {
    return this._store.lastTabSwitched;
  }
  set lastTabSwitched(v: boolean) {
    this._store.lastTabSwitched = v;
  }

  public getProfile(fp: string): UserProfileData {
    return this._store.getProfile(fp);
  }

  public updateProfile(fp: string, updates: Partial<UserProfileData>): void {
    this._store.updateProfile(fp, updates);
  }

  public async saveProfile(fp: string, updates: Partial<UserProfileData>): Promise<boolean> {
    return this._store.saveProfileDirect(fp, updates);
  }

  public async loadPublicProfile(fp: string): Promise<void> {
    return this._store.loadPublicProfile(fp);
  }

  public setTargetFingerprint(fp: string): void {
    this._store.setTargetFingerprint(fp);
  }

  public setActiveTab(tab: ProfileTab): void {
    this._store.setActiveTab(tab);
  }

  public setActiveSettingsCategory(cat: SettingsCategory): void {
    this._store.setActiveSettingsCategory(cat);
  }

  public openSettings(category: SettingsCategory = 'account'): void {
    this._store.openSettings(category);
  }

  public toggleFollow(fp: string): boolean {
    return this._store.toggleFollow(fp);
  }

  public isFollowing(fp: string): boolean {
    return this._store.isFollowing(fp);
  }

  public getFederatedHandle(fp?: string, full?: boolean): string {
    return this._store.getFederatedHandle(fp, full);
  }

  public async copyFederatedHandle(fp?: string): Promise<boolean> {
    return this._store.copyFederatedHandle(fp);
  }

  public filterTimelinePosts(allPosts: ClientPost[], targetFp: string): ClientPost[] {
    return filterProfilePosts(allPosts, this.activeTab, targetFp);
  }

  public renderEditProfileModal(profile?: UserProfileData): string {
    const p = profile || this.getProfile(this.targetFingerprint || 'genesis-core');
    return renderEditProfileModalHTML({ ...p, ...this.editDraft }, this.savingProfiles.has(p.fingerprint));
  }

  public renderSettingsCategoryContent(cat: SettingsCategory, profile: UserProfileData, currentUserFp: string): string {
    return renderSettingsCategoryContentHTML(cat, profile, currentUserFp);
  }

  public renderProfileView(allPosts: ClientPost[], currentUserFp: string): string {
    const target = this.targetFingerprint || currentUserFp;
    const profile = this.getProfile(target);
    const isOwnProfile = target === currentUserFp;
    const isFollowing = this.isFollowing(target);
    const publicIdentity = presentPublicIdentity(profile, target, isOwnProfile);

    return `
      <div id="sovereign-profile-container" class="journal-profile flex-1 w-full h-full min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 pb-28 lg:pb-12 scroll-smooth" style="-webkit-overflow-scrolling: touch; overscroll-behavior-y: contain;">
        <div class="journal-profile__layout max-w-4xl mx-auto space-y-6">
          <!-- 1. HERO HEADER -->
          ${publicIdentity.needsSetup && isOwnProfile ? `
            <section class="profile-setup-callout journal-profile__setup" role="status">
              <div><span>Public identity</span><strong>Choose how people see you</strong><p>Add a display name, an @handle and an optional photo before you join conversations.</p></div>
              <button type="button" data-action="open-edit-profile" class="primary-button">Set up profile</button>
            </section>` : ''}
          <div class="journal-profile__hero-wrap">${renderProfileHeaderHTML(profile, isOwnProfile, isFollowing, false, this.pendingFollows.has(target))}</div>

          <!-- 2. TIMELINE TABS BAR -->
          <div class="journal-profile__tabs">${renderProfileTabsHTML(this.activeTab, isOwnProfile)}</div>

          <!-- 3. TAB CONTENT -->
          <div id="profile-tab-content-area" class="journal-profile__content transition-all duration-200">
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

export const profileView = new ProfileView(profileStore);

if (typeof window !== 'undefined') {
  (window as any).profileView = profileView;
  (window as any).__aetheris_set_settings_cat = (cat: SettingsCategory) => {
    profileView.setActiveSettingsCategory(cat);
    if ((window as any).clientStore) (window as any).clientStore.notify();
  };
  (window as any).__aetheris_save_profile = () => {
    const nameInput = document.getElementById('edit-profile-name') as HTMLInputElement;
    const handleInput = document.getElementById('edit-profile-handle') as HTMLInputElement;
    const bioInput = document.getElementById('edit-profile-bio') as HTMLTextAreaElement;
    const locInput = document.getElementById('edit-profile-location') as HTMLInputElement;
    const webInput = document.getElementById('edit-profile-website') as HTMLInputElement;
    const avInput = document.getElementById('edit-profile-avatar') as HTMLInputElement;
    const banInput = document.getElementById('edit-profile-banner') as HTMLInputElement;

    const targetFp = profileView.targetFingerprint || (window as any).clientStore?.keypair?.fingerprint || 'genesis-core';
    const cleanHandle = handleInput?.value ? handleInput.value.replace(/^@/, '').trim() : '';
    void profileView.saveProfile(targetFp, {
      name: nameInput?.value || 'Sovereign Node',
      handle: cleanHandle || profileView.getProfile(targetFp).handle,
      bio: bioInput?.value || '',
      location: locInput?.value || '',
      website: webInput?.value || '',
      avatar: avInput?.value || profileView.getProfile(targetFp).avatar,
      banner: banInput?.value || profileView.getProfile(targetFp).banner,
    });
  };
}
