import { describe, it, expect, beforeEach } from 'vitest';
import { clientStore, AetherisClientStore, type ClientPost } from '../src/client-state.js';
import { omniComposer, OmniComposer } from '../src/composer.js';
import { pollEngine, PollEngine } from '../src/polls.js';
import { reactionsEngine, ReactionsEngine } from '../src/reactions.js';
import { obsidianMediaPlayer, ObsidianMediaPlayer } from '../src/media-player.js';
import { awardsSystem, AwardsSystem, type SovereignAwardType } from '../src/awards.js';
import { crossPostEngine } from '../src/crosspost.js';
import { bookmarksVault } from '../src/bookmarks.js';
import { trendingEngine } from '../src/trending.js';
import { storiesEngine } from '../src/stories.js';
import { notificationCenter } from '../src/notifications.js';
import { markdownRenderer } from '../src/markdown-renderer.js';
import { i18n } from '../src/i18n.js';
import { globalScale } from '../src/global-scale.js';
import { themeEngine, ThemeEngine, THEMES } from '../src/themes.js';
import { serviceRegistry, SERVICES } from '../src/service-registry.js';

describe('Sovereign Board & Micro-Broadcasting Synthesis Engine - Comprehensive Test Suite', () => {

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. VIEW MODE SWITCHING (CARD, CLASSIC, COMPACT)
  // ═══════════════════════════════════════════════════════════════════════════════
  describe('1. View Mode & Density Switching (Card, Classic, Compact)', () => {
    let store: AetherisClientStore;

    beforeEach(() => {
      store = new AetherisClientStore();
    });

    it('should initialize with default card view mode and balanced density', () => {
      expect(store.viewMode).toBe('card');
      expect(store.density).toBe('balanced');
    });

    it('should correctly switch to Card, Classic, and Compact view modes', () => {
      let notified = 0;
      store.subscribe(() => notified++);

      // Switch to Card
      store.setViewMode('card');
      expect(store.viewMode).toBe('card');
      expect(store.density).toBe('media');
      expect(notified).toBe(1);

      // Switch to Classic
      store.setViewMode('classic');
      expect(store.viewMode).toBe('classic');
      expect(store.density).toBe('balanced');
      expect(notified).toBe(2);

      // Switch to Compact
      store.setViewMode('compact');
      expect(store.viewMode).toBe('compact');
      expect(store.density).toBe('compact');
      expect(notified).toBe(3);
    });

    it('should maintain bi-directional synchronization between setDensity and viewMode', () => {
      store.setDensity('media');
      expect(store.viewMode).toBe('card');
      expect(store.density).toBe('media');

      store.setDensity('balanced');
      expect(store.viewMode).toBe('classic');
      expect(store.density).toBe('balanced');

      store.setDensity('compact');
      expect(store.viewMode).toBe('compact');
      expect(store.density).toBe('compact');
    });

    it('should register and resolve ClientStore from ServiceRegistry IoC container', () => {
      expect(serviceRegistry.has(SERVICES.ClientStore)).toBe(true);
      const resolvedStore = serviceRegistry.resolve<typeof clientStore>(SERVICES.ClientStore);
      expect(resolvedStore).toBeDefined();
      expect(resolvedStore.posts).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. HYBRID COMPOSER (POLLS, MEDIA GRIDS, CIRCULAR LIMIT RING)
  // ═══════════════════════════════════════════════════════════════════════════════
  describe('2. Hybrid Composer (Polls, Media Grids, Radial SVG Character Ring)', () => {
    let composer: OmniComposer;

    beforeEach(() => {
      composer = new OmniComposer();
    });

    it('should support tab switching across article, pulse, poll, and vault', () => {
      composer.activeTab = 'article';
      expect(composer.activeTab).toBe('article');

      composer.activeTab = 'pulse';
      expect(composer.activeTab).toBe('pulse');

      composer.activeTab = 'poll';
      expect(composer.activeTab).toBe('poll');

      composer.activeTab = 'vault';
      expect(composer.activeTab).toBe('vault');
    });

    it('should compute and render radial character counter ring correctly for micro-pulse mode', () => {
      // 50% capacity test
      const metrics50 = composer.getCharacterRingMetrics(140, 280);
      expect(metrics50.radius).toBe(12);
      expect(metrics50.charsLeft).toBe(140);
      expect(metrics50.progressPercent).toBe(50);
      expect(metrics50.strokeColor).toBe('#6366f1');
      expect(metrics50.isWarning).toBe(false);
      expect(metrics50.isExceeded).toBe(false);

      const html50 = composer.renderCircularCountdownRing(140, 280);
      expect(html50).toContain('stroke-dashoffset');
      expect(html50).toContain('140 characters remaining');

      // 96% capacity (warning / red alert stroke)
      const metrics96 = composer.getCharacterRingMetrics(270, 280);
      expect(metrics96.charsLeft).toBe(10);
      expect(metrics96.strokeColor).toBe('#ef4444');
      expect(metrics96.isWarning).toBe(true);

      const html96 = composer.renderCircularCountdownRing(270, 280);
      expect(html96).toContain('#ef4444');
      expect(html96).toContain('10');
    });

    it('should support cryptographic poll creation, voting, and vote updates', () => {
      const pollEngineInstance = new PollEngine();
      const pollId = 'test-poll-synthesis-1';
      const question = 'Should we upgrade to post-quantum Dilithium signatures?';
      const options = ['Yes, migrate immediately', 'No, remain with Ed25519', 'Hybrid duel-signature'];

      const created = pollEngineInstance.createPoll(pollId, question, options);
      expect(created.id).toBe(pollId);
      expect(created.question).toBe(question);
      expect(created.options.length).toBe(3);
      expect(created.totalVotes).toBe(0);

      // Cast initial vote
      const vote1 = pollEngineInstance.castVote(pollId, 'opt-0', 'fp_alice');
      expect(vote1).toBe(true);
      expect(pollEngineInstance.getPoll(pollId)?.totalVotes).toBe(1);
      expect(pollEngineInstance.getPoll(pollId)?.options[0].voteCount).toBe(1);

      // Cast second vote
      const vote2 = pollEngineInstance.castVote(pollId, 'opt-2', 'fp_bob');
      expect(vote2).toBe(true);
      expect(pollEngineInstance.getPoll(pollId)?.totalVotes).toBe(2);

      // Change vote from opt-0 to opt-1 for alice
      const voteChange = pollEngineInstance.castVote(pollId, 'opt-1', 'fp_alice');
      expect(voteChange).toBe(true);
      expect(pollEngineInstance.getPoll(pollId)?.totalVotes).toBe(2); // total unchanged
      expect(pollEngineInstance.getPoll(pollId)?.options[0].voteCount).toBe(0);
      expect(pollEngineInstance.getPoll(pollId)?.options[1].voteCount).toBe(1);

      // Render Poll Card HTML
      const pollCardHtml = pollEngineInstance.renderPollCard(pollId, 'fp_alice');
      expect(pollCardHtml).toContain('Cryptographic Community Poll');
      expect(pollCardHtml).toContain('2 Total Votes');
      expect(pollCardHtml).toContain('Yes, migrate immediately');
    });

    it('should generate responsive mosaic image grids for 1, 2, 3, and 4 images', () => {
      const player = new ObsidianMediaPlayer();

      // 1 Image
      const mosaic1 = player.renderImageMosaic(['https://example.com/img1.png']);
      expect(mosaic1).toContain('btn-lightbox-img');
      expect(mosaic1).toContain('https://example.com/img1.png');

      // 2 Images
      const mosaic2 = player.renderImageMosaic(['https://example.com/1.png', 'https://example.com/2.png']);
      expect(mosaic2).toContain('grid-cols-2');

      // 3 Images
      const mosaic3 = player.renderImageMosaic(['https://example.com/1.png', 'https://example.com/2.png', 'https://example.com/3.png']);
      expect(mosaic3).toContain('grid-rows-2');

      // 4 Images
      const mosaic4 = player.renderImageMosaic(['https://example.com/1.png', 'https://example.com/2.png', 'https://example.com/3.png', 'https://example.com/4.png']);
      expect(mosaic4).toContain('grid-cols-2');

      // Empty
      expect(player.renderImageMosaic([])).toBe('');
    });

    it('should render sleek Obsidian video cards with custom scrubbers', () => {
      const player = new ObsidianMediaPlayer();
      const videoHtml = player.renderVideoCard('video-test-99', 'https://example.com/stream.mp4', 'https://example.com/poster.jpg');
      expect(videoHtml).toContain('id="video-video-test-99"');
      expect(videoHtml).toContain('id="controls-video-test-99"');
      expect(videoHtml).toContain('btn-video-play');
      expect(videoHtml).toContain('btn-video-mute');
      expect(videoHtml).toContain('btn-video-pip');
      expect(videoHtml).toContain('btn-video-fs');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. VOTING, PARTICLE BURST LIKES, REPOST/QUOTE
  // ═══════════════════════════════════════════════════════════════════════════════
  describe('3. Voting, Likes with Particle Burst, Repost/Quote', () => {
    let store: AetherisClientStore;
    let reactions: ReactionsEngine;

    beforeEach(() => {
      store = new AetherisClientStore();
      reactions = new ReactionsEngine();
      if (store.posts.length === 0) {
        store.createPost({
          title: 'Genesis Test Post',
          content: 'Consensus protocol validation.',
        });
      }
    });

    it('should handle upvoting and downvoting with merit scores and toggles', () => {
      const post = store.posts[0];
      const initialMerit = post.meritVotes;

      // Upvote
      post.userVoted = 0; // reset
      store.votePost(post.id, 1);
      expect(post.userVoted).toBe(1);
      expect(post.meritVotes).toBe(initialMerit + 1);

      // Upvote again -> toggle off
      store.votePost(post.id, 1);
      expect(post.userVoted).toBe(0);
      expect(post.meritVotes).toBe(initialMerit);

      // Downvote
      store.votePost(post.id, -1);
      expect(post.userVoted).toBe(-1);
      expect(post.meritVotes).toBe(initialMerit - 1);
    });

    it('should boost (repost) posts to the sovereign chrono-stream', () => {
      const post = store.posts[0];
      const initialBoosts = post.boostCount;

      store.boostPost(post.id);
      expect(post.boostCount).toBe(initialBoosts + 1);
    });

    it('should handle emoji reactions with single reaction per user enforcement', () => {
      const postId = 'post-test-reactions';
      const fpAlice = 'fp_alice';
      const fpBob = 'fp_bob';

      // 1. Alice reacts with ❤️
      reactions.toggleReaction(postId, '❤️', fpAlice);
      expect(reactions.hasReacted(postId, '❤️', fpAlice)).toBe(true);
      expect(reactions.getUserReaction(postId, fpAlice)).toBe('❤️');
      expect(reactions.getTotalReactions(postId)).toBe(1);

      // 2. Bob reacts with ❤️
      reactions.toggleReaction(postId, '❤️', fpBob);
      expect(reactions.hasReacted(postId, '❤️', fpBob)).toBe(true);
      expect(reactions.getTotalReactions(postId)).toBe(2);

      // 3. Alice switches her reaction to ⚡ (single reaction per user: ❤️ is replaced by ⚡)
      reactions.toggleReaction(postId, '⚡', fpAlice);
      expect(reactions.hasReacted(postId, '⚡', fpAlice)).toBe(true);
      expect(reactions.hasReacted(postId, '❤️', fpAlice)).toBe(false);
      expect(reactions.getUserReaction(postId, fpAlice)).toBe('⚡');
      expect(reactions.getTotalReactions(postId)).toBe(2); // 1 Bob (❤️) + 1 Alice (⚡)

      // 4. Alice unreacts by clicking ⚡ again
      reactions.toggleReaction(postId, '⚡', fpAlice);
      expect(reactions.hasReacted(postId, '⚡', fpAlice)).toBe(false);
      expect(reactions.getUserReaction(postId, fpAlice)).toBeNull();
      expect(reactions.getTotalReactions(postId)).toBe(1); // only Bob left
    });

    it('should trigger particle bursts and generate sparks in DOM', () => {
      const sparks = reactions.triggerParticleBurst(150, 200, '❤️');
      expect(sparks).toBeDefined();
      expect(Array.isArray(sparks)).toBe(true);
      expect(sparks.length).toBe(12);
      expect(sparks[0].textContent).toBe('❤️');
    });

    it('should support X-style quote posts in ClientPost models', () => {
      const quoted = {
        id: 'post-1',
        authorFingerprint: 'genesis-core',
        authorRole: 'GUARDIAN',
        title: 'Original Consensus Advisory',
        content: 'Original content of quoted publication.',
      };

      const created = store.createPost({
        title: 'Quote Reflection',
        content: 'I agree with the consensus protocol described above.',
        quotedPost: quoted,
      });

      expect(created.quotedPost).toBeDefined();
      expect(created.quotedPost?.id).toBe('post-1');
      expect(created.quotedPost?.authorFingerprint).toBe('genesis-core');
    });

    it('should support cross-posting across sovereign hubs without duplicate spam', () => {
      const postId = 'post-1';
      const userFP = 'c3dc28cb705e';

      const res1 = crossPostEngine.crossPost(postId, 'vault-guides', userFP, 'Relevant guide for vault developers');
      expect(res1).toBe(true);
      expect(crossPostEngine.hasCrossPosted(postId, 'vault-guides', userFP)).toBe(true);

      // Duplicate attempt should return false
      const resDuplicate = crossPostEngine.crossPost(postId, 'vault-guides', userFP, 'Duplicate attempt');
      expect(resDuplicate).toBe(false);

      // Invalid channel attempt
      const resInvalid = crossPostEngine.crossPost(postId, 'invalid-channel-xyz', userFP, 'Invalid channel');
      expect(resInvalid).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. MEDIA LIGHTBOX & AWARD MODAL
  // ═══════════════════════════════════════════════════════════════════════════════
  describe('4. Media Lightbox and Sovereign Award Modal', () => {
    let player: ObsidianMediaPlayer;
    let awards: AwardsSystem;

    beforeEach(() => {
      player = new ObsidianMediaPlayer();
      awards = new AwardsSystem();
    });

    it('should manage lightbox lifecycle: open, navigate, zoom in/out/reset, and close', () => {
      const images = ['https://example.com/1.png', 'https://example.com/2.png', 'https://example.com/3.png'];

      expect(player.isLightboxOpen()).toBe(false);

      // Open Lightbox
      player.openLightbox(images[0], images);
      expect(player.isLightboxOpen()).toBe(true);

      let modalHtml = player.renderLightboxModal();
      expect(modalHtml).toContain('id="lightbox-overlay"');
      expect(modalHtml).toContain('1 / 3');

      // Next image
      player.nextImage();
      modalHtml = player.renderLightboxModal();
      expect(modalHtml).toContain('2 / 3');

      // Prev image
      player.prevImage();
      modalHtml = player.renderLightboxModal();
      expect(modalHtml).toContain('1 / 3');

      // Zoom
      player.zoomIn();
      modalHtml = player.renderLightboxModal();
      expect(modalHtml).toContain('Zoom: 125%');

      player.zoomOut();
      modalHtml = player.renderLightboxModal();
      expect(modalHtml).toContain('Zoom: 100%');

      player.resetZoom();

      // Close
      player.closeLightbox();
      expect(player.isLightboxOpen()).toBe(false);
      expect(player.renderLightboxModal()).toBe('');
    });

    it('should manage 7 sovereign medals and enforce role hierarchy', () => {
      expect(awards.AWARDS.length).toBe(7);

      const types: SovereignAwardType[] = [
        'PLATINUM',
        'GOLD',
        'SILVER',
        'BRONZE',
        'ZK_VERIFIED',
        'GUARDIAN_CHOICE',
        'COMMUNITY_PICK',
      ];

      for (const t of types) {
        expect(awards.getAwardByType(t)).toBeDefined();
      }

      // Permissions check
      expect(awards.canGiveAward('GUARDIAN', 'PLATINUM')).toBe(true);
      expect(awards.canGiveAward('MEMBER', 'PLATINUM')).toBe(false);
      expect(awards.canGiveAward('MEMBER', 'COMMUNITY_PICK')).toBe(true);
      expect(awards.canGiveAward('ARCHIVIST', 'GOLD')).toBe(true);
      expect(awards.canGiveAward('ARCHIVIST', 'BRONZE')).toBe(false);
      expect(awards.canGiveAward('MODERATOR', 'SILVER')).toBe(true);
    });

    it('should confer awards, render badge summaries, and render full award modal', () => {
      const postId = 'post-award-test-99';

      const success = awards.giveAward(postId, 'COMMUNITY_PICK', 'fp_alice', 'MEMBER', 'Great article!');
      expect(success).toBe(true);

      const total = awards.getTotalAwardsCount(postId);
      expect(total).toBe(1);

      const badgesHtml = awards.renderAwardBadges(postId);
      expect(badgesHtml).toContain('✨');
      expect(badgesHtml).toContain('×1');

      const modalHtml = awards.renderAwardModal(postId, 'GUARDIAN');
      expect(modalHtml).toContain('id="aetheris-award-modal"');
      expect(modalHtml).toContain('Award');
      expect(modalHtml).toContain('Diamond Consensus');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. LIGHT AND DARK OBSIDIAN THEME SWITCHING
  // ═══════════════════════════════════════════════════════════════════════════════
  describe('5. Light & Dark Theme Switching & Typography System', () => {
    let themes: ThemeEngine;

    beforeEach(() => {
      themes = new ThemeEngine();
      themes.resetToDefaults();
    });

    it('should initialize with default mineral-basalt dark theme', () => {
      expect(themes.currentThemeId).toBe('mineral-basalt');
      const current = themes.getCurrentTheme();
      expect(current.id).toBe('mineral-basalt');
      expect(current.accentColor).toBe('#38bdf8');
      expect(current.bgCanvas).toBe('#08090d');
    });

    it('should switch seamlessly to Alabaster Daylight (Light Mode)', () => {
      themes.setTheme('alabaster-light');
      expect(themes.currentThemeId).toBe('alabaster-light');

      const light = themes.getCurrentTheme();
      expect(light.name).toBe('Alabaster Daylight');
      expect(light.emoji).toBe('☀️');
      expect(light.bgCanvas).toBe('#f6f5f2');
      expect(light.bgSurfaceBase).toBe('#ffffff');
      expect(light.accentColor).toBe('#0284c7');
      expect(light.badgeText).toBe('LIGHT');
    });

    it('should switch across dark themes: Matrix Monolith, Tokyo Synthwave, Solaris Gold, Nordic Aurora, Obsidian Cyber', () => {
      // Matrix Monolith
      themes.setTheme('matrix-monolith');
      expect(themes.currentThemeId).toBe('matrix-monolith');
      expect(themes.getCurrentTheme().accentColor).toBe('#10b981');

      // Tokyo Synthwave
      themes.setTheme('tokyo-neon');
      expect(themes.currentThemeId).toBe('tokyo-neon');
      expect(themes.getCurrentTheme().accentColor).toBe('#f43f5e');

      // Solaris Gold
      themes.setTheme('solar-amber');
      expect(themes.currentThemeId).toBe('solar-amber');
      expect(themes.getCurrentTheme().accentColor).toBe('#f59e0b');

      // Nordic Aurora
      themes.setTheme('nordic-frost');
      expect(themes.currentThemeId).toBe('nordic-frost');
      expect(themes.getCurrentTheme().accentColor).toBe('#38bdf8');

      // Obsidian Cyber
      themes.setTheme('obsidian-cyber');
      expect(themes.currentThemeId).toBe('obsidian-cyber');
      expect(themes.getCurrentTheme().accentColor).toBe('#00e5ff');
    });

    it('should support font size adjustments and font family selection', () => {
      themes.setFontSize(16);
      expect(themes.fontSize).toBe(16);

      themes.setFontFamily('mono');
      expect(themes.fontFamily).toBe('mono');

      themes.setFontFamily('sans');
      expect(themes.fontFamily).toBe('sans');
    });

    it('should render the theme selector modal with all themes represented', () => {
      const modalHtml = themes.renderThemeSelectorModal();
      expect(modalHtml).toContain('Mineral Basalt 2027');
      expect(modalHtml).toContain('Obsidian Cyber');
      expect(modalHtml).toContain('Alabaster Daylight');
      expect(modalHtml).toContain('OLED Pitch Black');
      expect(modalHtml).toContain('Tokyo Synthwave');
      expect(modalHtml).toContain('Solaris Gold');
      expect(modalHtml).toContain('Nordic Aurora');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // 6. FULL SYSTEM SYNTHESIS & IOC RESOLUTION
  // ═══════════════════════════════════════════════════════════════════════════════
  describe('6. Full System Synthesis & IoC Container Resolution', () => {
    it('should resolve all core services from IoC container without errors', () => {
      const tokensToTest = [
        SERVICES.ClientStore,
        SERVICES.ThemeEngine,
        SERVICES.Reactions,
        SERVICES.Awards,
        SERVICES.OmniComposer,
        SERVICES.PollEngine,
        SERVICES.MediaPlayer,
        SERVICES.BookmarksVault,
        SERVICES.CrossPostEngine,
        SERVICES.TrendingEngine,
        SERVICES.StoriesEngine,
        SERVICES.Notifications,
        SERVICES.MarkdownRenderer,
        SERVICES.I18nEngine,
        SERVICES.GlobalScale,
      ];

      serviceRegistry.registerInstance(SERVICES.ClientStore, clientStore);
      serviceRegistry.registerInstance(SERVICES.ThemeEngine, themeEngine);
      serviceRegistry.registerInstance(SERVICES.Reactions, reactionsEngine);
      serviceRegistry.registerInstance(SERVICES.Awards, awardsSystem);
      serviceRegistry.registerInstance(SERVICES.OmniComposer, omniComposer);
      serviceRegistry.registerInstance(SERVICES.PollEngine, pollEngine);
      serviceRegistry.registerInstance(SERVICES.MediaPlayer, obsidianMediaPlayer);
      serviceRegistry.registerInstance(SERVICES.BookmarksVault, bookmarksVault);
      serviceRegistry.registerInstance(SERVICES.CrossPostEngine, crossPostEngine);
      serviceRegistry.registerInstance(SERVICES.TrendingEngine, trendingEngine);
      serviceRegistry.registerInstance(SERVICES.StoriesEngine, storiesEngine);
      serviceRegistry.registerInstance(SERVICES.Notifications, notificationCenter);
      serviceRegistry.registerInstance(SERVICES.MarkdownRenderer, markdownRenderer);
      serviceRegistry.registerInstance(SERVICES.I18nEngine, i18n);
      serviceRegistry.registerInstance(SERVICES.GlobalScale, globalScale);

      for (const token of tokensToTest) {
        const hasService = serviceRegistry.has(token);
        expect(hasService, `Service token "${token.description}" should be registered in serviceRegistry`).toBe(true);
        const resolved = serviceRegistry.resolve(token);
        expect(resolved).toBeDefined();
      }
    });
  });
});
