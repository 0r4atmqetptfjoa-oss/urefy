import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileView, profileView } from '../src/profile-view.js';
import type { ClientPost } from '../src/client-state.js';

describe('ProfileView - Sovereign Profile Hero Header & Multi-Tab Timeline', () => {
  let profile: ProfileView;
  let samplePosts: ClientPost[];

  beforeEach(() => {
    profile = new ProfileView();
    samplePosts = [
      {
        id: 'post-1',
        channelId: 'pulse-global',
        authorFingerprint: 'genesis-core',
        authorRole: 'GUARDIAN',
        title: 'Genesis Core Invariants',
        content: 'Maintaining zero-knowledge invariant proofs across Omni-Sphere nodes.',
        flair: 'SECURITY ADVISORY',
        meritVotes: 120,
        userVoted: 1,
        replyCount: 18,
        boostCount: 10,
        createdAt: Date.now() - 5000,
        images: ['https://example.com/cover.png'],
      },
      {
        id: 'post-2',
        channelId: 'pulse-global',
        authorFingerprint: 'other-node',
        authorRole: 'MEMBER',
        title: 'Peer Exploration',
        content: 'Testing peer gossip propagation.',
        flair: 'TECH DISCUSSION',
        meritVotes: 15,
        userVoted: 0,
        replyCount: 0,
        boostCount: 2,
        createdAt: Date.now() - 15000,
      },
    ];
  });

  it('should initialize with default profiles and allow fetching seeded profiles', () => {
    const genesis = profile.getProfile('genesis-core');
    expect(genesis).toBeDefined();
    expect(genesis.name).toBe('Genesis Protocol Archon');
    expect(genesis.isZKVerified).toBe(true);
    expect(genesis.badges).toContain('🛡️ ZK-Human');
    expect(genesis.badges).toContain('💎 Sovereign Archon');
    expect(genesis.badges).toContain('🔑 Keymaster');
  });

  it('should dynamically create default profile for unseeded nodes', () => {
    const fresh = profile.getProfile('node-abc-123456');
    expect(fresh).toBeDefined();
    expect(fresh.fingerprint).toBe('node-abc-123456');
    expect(fresh.role).toBe('MEMBER');
  });

  it('should allow updating profile information', () => {
    profile.updateProfile('genesis-core', {
      name: 'Archon Prime Sovereign',
      location: 'Relay Matrix Orbital',
      meritScore: 12500,
    });

    const updated = profile.getProfile('genesis-core');
    expect(updated.name).toBe('Archon Prime Sovereign');
    expect(updated.location).toBe('Relay Matrix Orbital');
    expect(updated.meritScore).toBe(12500);
  });

  it('should toggle trust follow connections and update follower counts', () => {
    const target = 'unseeded-node-999';
    expect(profile.isFollowing(target)).toBe(false);
    const initialCount = profile.getProfile(target).followersCount;

    // Follow
    const isNowFollowing = profile.toggleFollow(target);
    expect(isNowFollowing).toBe(true);
    expect(profile.isFollowing(target)).toBe(true);
    expect(profile.getProfile(target).followersCount).toBe(initialCount + 1);

    // Unfollow
    const isNowFollowing2 = profile.toggleFollow(target);
    expect(isNowFollowing2).toBe(false);
    expect(profile.isFollowing(target)).toBe(false);
    expect(profile.getProfile(target).followersCount).toBe(initialCount);
  });

  it('should filter posts according to timeline tabs: pulses, replies, highlights, media, likes', () => {
    profile.setActiveTab('pulses');
    let filtered = profile.filterTimelinePosts(samplePosts, 'genesis-core');
    expect(filtered.some(p => p.authorFingerprint === 'genesis-core')).toBe(true);

    profile.setActiveTab('replies');
    filtered = profile.filterTimelinePosts(samplePosts, 'genesis-core');
    expect(filtered.every(p => p.replyCount > 0)).toBe(true);

    profile.setActiveTab('media');
    filtered = profile.filterTimelinePosts(samplePosts, 'genesis-core');
    expect(filtered.every(p => (p.images && p.images.length > 0) || p.video)).toBe(true);

    profile.setActiveTab('highlights');
    filtered = profile.filterTimelinePosts(samplePosts, 'genesis-core');
    expect(filtered[0].meritVotes).toBe(120);
  });

  it('should render the Sovereign Profile Hero Header HTML with avatar, badges, stats, and tabs', () => {
    const html = profile.renderProfileView(samplePosts, 'genesis-core');
    expect(html).toContain('Genesis Protocol Archon');
    expect(html).toContain('🛡️ ZK-Human');
    expect(html).toContain('💎 Sovereign Archon');
    expect(html).toContain('WoT Max-Flow:');
    expect(html).toContain('data-profile-tab="pulses"');
    expect(html).toContain('data-profile-tab="media"');
    expect(html).toContain('data-profile-tab="likes"');
  });

  it('should render the Edit Profile Modal with form fields', () => {
    const genesis = profile.getProfile('genesis-core');
    const modalHtml = profile.renderEditProfileModal(genesis);
    expect(modalHtml).toContain('id="edit-profile-modal-overlay"');
    expect(modalHtml).toContain('id="edit-profile-name"');
    expect(modalHtml).toContain('id="edit-profile-bio"');
    expect(modalHtml).toContain('id="edit-profile-location"');
    expect(modalHtml).toContain('id="edit-profile-website"');
  });

  it('should render the embedded Settings subtab with all 7 categories without opening a popup modal', () => {
    const genesis = profile.getProfile('genesis-core');
    profile.openSettings('account');
    expect(profile.activeTab).toBe('settings');
    expect(profile.activeSettingsCategory).toBe('account');

    // Render full view for own profile
    const html = profile.renderProfileView(samplePosts, 'genesis-core');
    expect(html).toContain('id="profile-settings-panel"');
    expect(html).toContain('data-settings-cat="account"');
    expect(html).toContain('data-settings-cat="security"');
    expect(html).toContain('data-settings-cat="privacy"');
    expect(html).toContain('data-settings-cat="notifications"');
    expect(html).toContain('data-settings-cat="appearance"');
    expect(html).toContain('data-settings-cat="data"');
    expect(html).toContain('data-settings-cat="advanced"');
    expect(html).toContain('data-settings-section="account"');

    // Switch to privacy category and check 3-tier progressive disclosure
    profile.setActiveSettingsCategory('privacy');
    const privacyHtml = profile.renderSettingsCategoryContent('privacy', genesis, 'genesis-core');
    expect(privacyHtml).toContain('id="btn-set-mode-simple"');
    expect(privacyHtml).toContain('id="btn-set-mode-advanced"');
    expect(privacyHtml).toContain('id="btn-set-mode-technical"');
    expect(privacyHtml).toContain('Simple (Default)');

    // Switch to security category and check passkeys + seed + guardians
    profile.setActiveSettingsCategory('security');
    const secHtml = profile.renderSettingsCategoryContent('security', genesis, 'genesis-core');
    expect(secHtml).toContain('WebAuthn / Biometric Passkey');
    expect(secHtml).toContain('BIP-39 Cryptographic Recovery Seed');
    expect(secHtml).toContain('btn-settings-open-social-guardians');
  });
});
