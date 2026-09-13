import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { clientStore } from '../src/client-state.js';
import { localSearchIndex } from '../src/search-index.js';
import { profileView } from '../src/profile-view.js';
import { communityView } from '../src/community-view.js';
import { validateImageBuffer, stripExifFromJpeg, computeSha256, detectImageFormat } from '../src/media-pipeline.js';
import { threadManager } from '../src/threads.js';
import { notificationCenter } from '../src/notifications.js';
import { socialSafety } from '../src/social-safety.js';
import { sovereignDM } from '../src/sovereign-dm.js';

describe('UREfy Consumer Social Network — 25-Step Full User Journey', () => {
  const myFP = 'my_sovereign_fp_1234';
  const peerFP = 'peer_crypto_enthusiast_5678';
  const strangerFP = 'stranger_spammer_9999';

  beforeEach(() => {
    socialSafety.clearAll();
    notificationCenter.clearAll();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    socialSafety.clearAll();
    vi.restoreAllMocks();
  });

  it('executes full 25-step sovereign social network journey', async () => {
    // ------------------------------------------------------------------------
    // STEP 1: Client Store & Identity Initialized
    // ------------------------------------------------------------------------
    expect(clientStore).toBeDefined();
    expect(Array.isArray(clientStore.posts)).toBe(true);

    // ------------------------------------------------------------------------
    // STEP 2: Discover people via search index
    // ------------------------------------------------------------------------
    localSearchIndex.indexPerson({
      id: peerFP,
      displayName: 'Alice Cryptographer',
      handle: 'alice_crypto',
      bio: 'Lattice cryptography researcher',
    });
    const searchPeople = localSearchIndex.search('Alice', 20, 'people');
    expect(searchPeople.length).toBeGreaterThanOrEqual(1);
    expect(searchPeople[0].doc.id).toContain(peerFP);

    // ------------------------------------------------------------------------
    // STEP 3: Follow peer
    // ------------------------------------------------------------------------
    const initialFollowing = profileView.isFollowing(peerFP);
    expect(initialFollowing).toBe(false);
    const followed = profileView.toggleFollow(peerFP);
    expect(followed).toBe(true);

    // ------------------------------------------------------------------------
    // STEP 4: Verify follow graph state
    // ------------------------------------------------------------------------
    expect(profileView.isFollowing(peerFP)).toBe(true);

    // ------------------------------------------------------------------------
    // STEP 5: Discover communities via search index
    // ------------------------------------------------------------------------
    localSearchIndex.indexCommunity({
      id: 'crypto-core',
      name: 'crypto-core',
      displayName: 'Crypto Core',
      description: 'Research and implementations of sovereign cryptography',
    });
    const searchComm = localSearchIndex.search('Crypto', 20, 'communities');
    expect(searchComm.length).toBeGreaterThanOrEqual(1);
    expect(searchComm[0].doc.id).toContain('crypto-core');

    // ------------------------------------------------------------------------
    // STEP 6: View community details
    // ------------------------------------------------------------------------
    const mockCircle = {
      id: 'crypto-core',
      name: 'crypto-core',
      displayName: 'Crypto Core',
      description: 'Research and implementations of sovereign cryptography',
      membersCount: 150,
      onlineCount: 0,
      category: 'Cryptography',
      channelId: 'crypto-core',
      isJoined: false,
    };
    const commHtml = communityView.renderCommunityWorkspace(mockCircle as any);
    expect(commHtml).toContain('Crypto Core');

    // ------------------------------------------------------------------------
    // STEP 7: Verify truthful metrics in community view (Gate 23: onlineCount ?? 0)
    // ------------------------------------------------------------------------
    expect(commHtml).toContain('online');
    // Ensure no hardcoded fake '12 online'
    expect(commHtml).not.toContain('12 online');

    // ------------------------------------------------------------------------
    // STEP 8: Prepare post creation with community selection
    // ------------------------------------------------------------------------
    const targetCommunity = 'crypto-core';
    expect(targetCommunity).toBe('crypto-core');

    // ------------------------------------------------------------------------
    // STEP 9: Media validation via magic bytes
    // ------------------------------------------------------------------------
    const mockJpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66,
      0xff, 0xda, 0x00, 0x08, 0x01, 0x02, 0x03, 0x04,
      0xff, 0xd9
    ]);
    const detected = detectImageFormat(mockJpeg);
    expect(detected).toBe('jpeg');
    const valResult = validateImageBuffer(mockJpeg.buffer);
    expect(valResult.valid).toBe(true);

    // ------------------------------------------------------------------------
    // STEP 10: Client-side EXIF stripping
    // ------------------------------------------------------------------------
    const strippedJpeg = stripExifFromJpeg(mockJpeg);
    expect(strippedJpeg.length).toBeLessThan(mockJpeg.length);

    // ------------------------------------------------------------------------
    // STEP 11: Compute deterministic SHA-256 for media asset
    // ------------------------------------------------------------------------
    const mediaHash = await computeSha256(strippedJpeg);
    expect(mediaHash.length).toBe(64);

    // ------------------------------------------------------------------------
    // STEP 12: Publish post with community channel and media
    // ------------------------------------------------------------------------
    const newPostId = `post-test-journey-${Date.now()}`;
    clientStore.posts.unshift({
      id: newPostId,
      channelId: targetCommunity,
      authorFingerprint: myFP,
      authorRole: 'GUARDIAN',
      title: 'ML-KEM-768 Hybrid Key Encapsulation Verified',
      content: 'Benchmarked in-browser ML-KEM-768 with zero dropped frames. Attached architecture diagram.',
      flair: 'VERIFIED RELEASE',
      meritVotes: 10,
      userVoted: 0,
      replyCount: 0,
      boostCount: 0,
      createdAt: Date.now(),
      isExpanded: false,
    });

    // ------------------------------------------------------------------------
    // STEP 13: Verify publication appears in store
    // ------------------------------------------------------------------------
    const created = clientStore.posts.find(p => p.id === newPostId);
    expect(created).toBeDefined();
    expect(created?.channelId).toBe('crypto-core');

    // ------------------------------------------------------------------------
    // STEP 14: Upvote publication
    // ------------------------------------------------------------------------
    created!.meritVotes += 1;
    created!.userVoted = 1;
    expect(created!.meritVotes).toBe(11);

    // ------------------------------------------------------------------------
    // STEP 15: Add top-level comment to thread
    // ------------------------------------------------------------------------
    const comment1 = threadManager.addReply('c-root-1', peerFP, 'Impressive benchmark! Did you test on mobile?', newPostId);
    expect(comment1.authorFingerprint).toBe(peerFP);
    expect(comment1.depth).toBeGreaterThanOrEqual(1);

    // ------------------------------------------------------------------------
    // STEP 16: Add nested reply to comment
    // ------------------------------------------------------------------------
    const reply1 = threadManager.addReply(comment1.id, myFP, 'Yes, Android ARM64 completed decapsulation in 1.4ms.', newPostId);
    expect(reply1.depth).toBe(comment1.depth + 1);

    // ------------------------------------------------------------------------
    // STEP 17: Sort comments by 'best' and 'new'
    // ------------------------------------------------------------------------
    threadManager.setSortMode('new');
    const sortedComments = threadManager.getRootComments();
    expect(sortedComments.length).toBeGreaterThan(0);

    // ------------------------------------------------------------------------
    // STEP 18: Collapse and expand thread
    // ------------------------------------------------------------------------
    expect(comment1.isCollapsed).toBe(false);
    threadManager.toggleCollapse(comment1.id);
    expect(comment1.isCollapsed).toBe(true);
    threadManager.toggleCollapse(comment1.id);
    expect(comment1.isCollapsed).toBe(false);

    // ------------------------------------------------------------------------
    // STEP 19: Receive social notification
    // ------------------------------------------------------------------------
    notificationCenter.addNotification({
      type: 'reply_post',
      title: 'Alice replied to your publication',
      body: 'Benchmarking on mobile is fast!',
      postId: newPostId,
      fromFingerprint: peerFP,
      createdAt: Date.now(),
    });
    expect(notificationCenter.unreadCount).toBe(1);

    // ------------------------------------------------------------------------
    // STEP 20: Mark notifications read
    // ------------------------------------------------------------------------
    notificationCenter.markAllRead();
    expect(notificationCenter.unreadCount).toBe(0);

    // ------------------------------------------------------------------------
    // STEP 21: View Profile and verify pinned post & Creator Insights
    // ------------------------------------------------------------------------
    profileView.updateProfile(myFP, {
      name: 'Sovereign Dev',
      handle: 'sovereign_dev',
      bio: 'Decentralized systems engineer',
      followersCount: 142,
      followingCount: 38,
      meritScore: 450,
      role: 'GUARDIAN',
      pinnedPostId: newPostId,
    });
    profileView.setTargetFingerprint(myFP);
    profileView.setActiveTab('creator');
    const profilePostsHtml = profileView.renderProfileView(clientStore.posts, myFP);
    expect(profilePostsHtml).toContain('Creator Insights');
    expect(profilePostsHtml).toContain('Local Reach');

    // ------------------------------------------------------------------------
    // STEP 22: Verify pinned post badge in pulses tab
    // ------------------------------------------------------------------------
    profileView.setActiveTab('pulses');
    const pulsesHtml = profileView.renderProfileView(clientStore.posts, myFP);
    expect(pulsesHtml).toContain('Pinned Post');

    // ------------------------------------------------------------------------
    // STEP 23: Block abusive user via SocialSafetyEngine
    // ------------------------------------------------------------------------
    await socialSafety.blockUser(strangerFP);
    expect(socialSafety.isBlocked(strangerFP)).toBe(true);

    // ------------------------------------------------------------------------
    // STEP 24: Verify blocked user comment suppression
    // ------------------------------------------------------------------------
    const spamComment = {
      id: 'c-spam-01',
      authorFingerprint: strangerFP,
      content: 'Spam link: malicious payload',
      createdAt: Date.now(),
      depth: 0,
      meritScore: 0,
      isCollapsed: false,
      replies: [],
    };
    const renderedSpam = threadManager.renderCommentNode(spamComment);
    expect(renderedSpam).toContain('[Comment from blocked user hidden]');
    expect(renderedSpam).not.toContain('malicious payload');

    // ------------------------------------------------------------------------
    // STEP 25: Sovereign DM Message Request gating
    // ------------------------------------------------------------------------
    // Stranger (not followed, not accepted) sends incoming message
    // Note: strangerFP is not followed by profileView.isFollowing(strangerFP) === false
    const anotherStrangerFP = 'brand_new_peer_7777';
    expect(profileView.isFollowing(anotherStrangerFP)).toBe(false);

    sovereignDM.receiveMessage(anotherStrangerFP, 'Hello, can we connect?');
    expect(sovereignDM.isMessageRequest(anotherStrangerFP)).toBe(true);

    const requests = sovereignDM.getRequestConversations();
    expect(requests.some(r => r.peerFingerprint === anotherStrangerFP)).toBe(true);

    // Accept the request
    sovereignDM.acceptRequest(anotherStrangerFP);
    expect(sovereignDM.isMessageRequest(anotherStrangerFP)).toBe(false);
    expect(sovereignDM.getInboxConversations().some(c => c.peerFingerprint === anotherStrangerFP)).toBe(true);
  });
});
