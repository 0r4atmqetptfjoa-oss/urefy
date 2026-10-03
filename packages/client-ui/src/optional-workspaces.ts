/** Cold route views stay outside the Home bootstrap graph. */
export let settingsView: typeof import('./settings-view.js').settingsView | undefined;
export let exploreView: typeof import('./explore-view.js').exploreView | undefined;
export let communityView: typeof import('./community-view.js').communityView | undefined;
export let profileView: typeof import('./profile-view.js').profileView | undefined;
let settingsPending: Promise<NonNullable<typeof settingsView>> | undefined;
let explorePending: Promise<NonNullable<typeof exploreView>> | undefined;
let communityPending: Promise<NonNullable<typeof communityView>> | undefined;
let profilePending: Promise<NonNullable<typeof profileView>> | undefined;

export function loadSettingsView() {
  return settingsPending ??= import('./settings-view.js').then(module => {
    settingsView = module.settingsView;
    if (typeof window !== 'undefined') (window as any).settingsView = settingsView;
    return settingsView;
  }).catch(error => { settingsPending = undefined; throw error; });
}
export function loadExploreView() {
  return explorePending ??= import('./explore-view.js').then(module => exploreView = module.exploreView)
    .catch(error => { explorePending = undefined; throw error; });
}
export function loadCommunityView() {
  return communityPending ??= import('./community-view.js').then(module => communityView = module.communityView)
    .catch(error => { communityPending = undefined; throw error; });
}
export function loadProfileView() {
  return profilePending ??= import('./profile-view.js').then(module => {
    profileView = module.profileView;
    if (typeof window !== 'undefined') (window as any).profileView = profileView;
    return profileView;
  }).catch(error => { profilePending = undefined; throw error; });
}
