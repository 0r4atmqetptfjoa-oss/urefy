/**
 * @file profile/profile-view.ts
 * @package @aetheris/client-ui/profile
 * @description 2027 Sovereign Profile Workspace & Settings Orchestrator.
 */

import { UserProfileData, ProfileTab, SettingsCategory, formatFederatedHandle, copyFederatedHandle } from './types.js';
import { renderProfileHeaderHTML, renderEditProfileModalHTML } from './profile-header.js';
import { renderProfileTabsHTML } from './profile-tabs.js';
import { renderProfileSettingsHTML, renderSettingsCategoryContentHTML } from './profile-settings.js';
import { renderProfileTimelinePostsHTML, filterProfilePosts } from './profile-posts.js';
import { ClientPost, clientStore } from '../client-state.js';
import { ProfileStore, profileStore } from './profile-store.js';

export { formatFederatedHandle, copyFederatedHandle };

export class ProfileView {
  private store: ProfileStore;

  constructor(store?: ProfileStore) {
    this.store = store || new ProfileStore();
    (globalThis as any).profileView = this;
    if (typeof window !== 'undefined') (window as any).profileView = this;
  }

  get followingSet(): Set<string> {
    return this.store.followingSet;
  }
  set followingSet(v: Set<string>) {
    this.store.followingSet = v;
  }

  get profileData(): Map<string, UserProfileData> {
    return this.store.profileData;
  }
  set profileData(v: Map<string, UserProfileData>) {
    this.store.profileData = v;
  }

  get pendingFollows(): Set<string> {
    return this.store.pendingFollows;
  }
  set pendingFollows(v: Set<string>) {
    this.store.pendingFollows = v;
  }

  get savingProfiles(): Set<string> {
    return this.store.savingProfiles;
  }
  set savingProfiles(v: Set<string>) {
    this.store.savingProfiles = v;
  }

  get targetFingerprint(): string {
    return this.store.targetFingerprint;
  }
  set targetFingerprint(v: string) {
    this.store.targetFingerprint = v;
  }

  get editDraft(): Partial<UserProfileData> | null {
    return this.store.editDraft;
  }
  set editDraft(v: Partial<UserProfileData> | null) {
    this.store.editDraft = v;
  }

  get isEditProfileModalOpen(): boolean {
    return this.store.isEditProfileModalOpen;
  }
  set isEditProfileModalOpen(v: boolean) {
    this.store.isEditProfileModalOpen = v;
  }

  get activeTab(): ProfileTab {
    return this.store.activeTab;
  }
  set activeTab(v: ProfileTab) {
    this.store.activeTab = v;
  }

  get activeSettingsCategory(): SettingsCategory {
    return this.store.activeSettingsCategory;
  }
  set activeSettingsCategory(v: SettingsCategory) {
    this.store.activeSettingsCategory = v;
  }

  get lastTabSwitched(): boolean {
    return this.store.lastTabSwitched;
  }
  set lastTabSwitched(v: boolean) {
    this.store.lastTabSwitched = v;
  }

  public getProfile(fp: string): UserProfileData {
    return this.store.getProfile(fp);
  }

  public updateProfile(fp: string, updates: Partial<UserProfileData>): void {
    this.store.updateProfile(fp, updates);
  }

  public async saveProfile(fp: string, updates: Partial<UserProfileData>): Promise<boolean> {
    return this.store.saveProfileDirect(fp, updates);
  }

  public async loadPublicProfile(fp: string): Promise<void> {
    return this.store.loadPublicProfile(fp);
  }

  public setTargetFingerprint(fp: string): void {
    this.store.setTargetFingerprint(fp);
  }

  public setActiveTab(tab: ProfileTab): void {
    this.store.setActiveTab(tab);
  }

  public setActiveSettingsCategory(cat: SettingsCategory): void {
    this.store.setActiveSettingsCategory(cat);
  }

  public openSettings(category: SettingsCategory = 'account'): void {
    this.store.openSettings(category);
  }

  public toggleFollow(fp: string): boolean {
    return this.store.toggleFollow(fp);
  }

  public isFollowing(fp: string): boolean {
    return this.store.isFollowing(fp);
  }

  public getFederatedHandle(fp?: string, full?: boolean): string {
    return this.store.getFederatedHandle(fp, full);
  }

  public async copyFederatedHandle(fp?: string): Promise<boolean> {
    return this.store.copyFederatedHandle(fp);
  }

  public filterTimelinePosts(allPosts: ClientPost[], targetFp: string): ClientPost[] {
    return filterProfilePosts(allPosts, this.activeTab, targetFp);
  }

  public renderEditProfileModal(profile?: UserProfileData): string {
    const p = profile || this.getProfile(this.targetFingerprint);
    return renderEditProfileModalHTML(p, this.savingProfiles.has(p.fingerprint));
  }

  public renderSettingsCategoryContent(
    cat: SettingsCategory,
    profile: UserProfileData,
    currentUserFp: string
  ): string {
    return renderSettingsCategoryContentHTML(cat, profile, currentUserFp);
  }

  public renderProfileView(allPosts: ClientPost[], currentUserFp: string): string {
    const target = this.targetFingerprint || currentUserFp;
    const profile = this.getProfile(target);
    const isOwnProfile = target === currentUserFp;
    const isFollowing = this.isFollowing(target);

    return `
      <div id="sovereign-profile-container" class="journal-profile flex-1 w-full h-full min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 pb-28 lg:pb-12 scroll-smooth" style="-webkit-overflow-scrolling: touch; overscroll-behavior-y: contain;">
        <div class="journal-profile__layout max-w-4xl mx-auto space-y-6">
          <div class="journal-profile__hero-wrap">${renderProfileHeaderHTML(
            profile,
            isOwnProfile,
            isFollowing,
            this.isEditProfileModalOpen,
            this.pendingFollows.has(target)
          )}</div>

          <div class="journal-profile__tabs">${renderProfileTabsHTML(this.activeTab, isOwnProfile)}</div>

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