import { describe, it, expect, beforeEach } from 'vitest';
import { clientStore, ClientMessage, ClientPost } from '../src/client-state.js';
import { renderRelaysWorkspace, renderMessageItem } from '../src/messages-view.js';
import { renderVaultWorkspace, renderVaultReleaseCard } from '../src/vault-view.js';
import { renderPulseWorkspace, renderPulsePostCard, renderInlineQuickComposer, renderPostCard } from '../src/feed-view.js';
import { sovereignDM } from '../src/sovereign-dm.js';

describe('Modular Views Architecture', () => {
  beforeEach(() => {
    clientStore.activeChannelId = 'pulse-global';
  });

  describe('messages-view.ts', () => {
    it('should render relays workspace with required DOM containers and form elements', () => {
      clientStore.activeChannelId = 'relays-general';
      const html = renderRelaysWorkspace();

      expect(html).toContain('id="messages-container"');
      expect(html).toContain('id="form-send-message"');
      expect(html).toContain('id="input-message"');
      expect(html).toContain('type="submit"');
    });

    it('should render message items with proper escaping and formatting', () => {
      const msg: ClientMessage = {
        id: 'msg-101',
        channelId: 'relays-general',
        authorFingerprint: '0123456789abcdef',
        text: 'Hello <script>alert("xss")</script> & welcome!',
        createdAt: Date.now(),
        isMine: false,
      };

      const html = renderMessageItem(msg);
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&amp; welcome!');
      expect(html).toContain('0123456789ab');
    });

    it('should support switching to Direct Messages E2EE tab and rendering DM workspace', async () => {
      const { setActiveMessagesTab, renderRelaysWorkspace, openNewDMPicker, closeNewDMPicker } = await import('../src/messages-view.js');

      // Default relays view has tab header
      setActiveMessagesTab('relays');
      let html = renderRelaysWorkspace();
      expect(html).toContain('data-action="switch-messages-tab"');
      expect(html).toContain('data-tab="relays"');
      expect(html).toContain('data-tab="dm"');
      expect(html).toContain('id="form-send-message"');

      // Switch to DM tab
      const peer = '0123456789abcdef';
      sovereignDM.conversations.set(peer, { peerFingerprint: peer, peerRole: 'MEMBER', messages: [], unreadCount: 0, lastMessageAt: 0 });
      sovereignDM.activePeerFP = peer;
      setActiveMessagesTab('dm');
      html = renderRelaysWorkspace();
      expect(html).toContain('Direct Messages');
      expect(html).toContain('id="input-dm-search"');
      expect(html).toContain('data-action="new-dm-conversation"');
      expect(html).toContain('id="form-send-dm-message"');
      expect(html).toContain('id="input-dm-message"');
      expect(html).toContain('<span>Send</span>');
      expect(html).toContain('type="submit"');

      // Test New DM Modal
      openNewDMPicker();
      html = renderRelaysWorkspace();
      expect(html).toContain('id="new-dm-modal-backdrop"');
      expect(html).toContain('id="input-new-dm-peer"');
      expect(html).toContain('data-action="submit-new-dm-peer"');

      closeNewDMPicker();
      html = renderRelaysWorkspace();
      expect(html).not.toContain('id="new-dm-modal-backdrop"');

      // Reset tab
      setActiveMessagesTab('relays');
    });
  });

  describe('vault-view.ts', () => {
    it('should render vault workspace with telemetry hero and main feed scroll', () => {
      clientStore.activeChannelId = 'vault-releases';
      const html = renderVaultWorkspace();

      expect(html).toContain('id="main-feed-scroll"');
      expect(html).toContain('id="btn-open-composer"');
      expect(html).toContain('KNOWLEDGE VAULT');
      expect(html).toContain('ACTIVE SEEDERS');
    });

    it('should render vault release card with binary hygiene specifications and P2P download button', () => {
      const samplePost: ClientPost = {
        id: 'vault-post-1',
        channelId: 'vault-releases',
        authorFingerprint: 'genesis-archivist-99',
        authorRole: 'ARCHIVIST',
        title: 'Ghost Node v3.4 Binary',
        content: 'Reproducible deterministic binary build.',
        flair: 'VERIFIED RELEASE',
        meritVotes: 42,
        userVoted: 0,
        replyCount: 5,
        boostCount: 2,
        createdAt: Date.now(),
        attachment: {
          fileName: 'ghost-node-v3.4-x86_64.bin',
          sha256: 'deadbeef12345678deadbeef12345678deadbeef12345678deadbeef12345678',
          byteSize: 1048576,
          entropy: 6.45,
        },
      };

      const html = renderVaultReleaseCard(samplePost);
      expect(html).toContain('Ghost Node v3.4 Binary');
      expect(html).toContain('Public resource');
      expect(html).toContain('Publisher-supplied metadata');
      expect(html).not.toContain('Audit Status: PASS');
      expect(html).toContain('btn-download-p2p');
      expect(html).toContain('ghost-node-v3.4-x86_64.bin');
      expect(html).toContain('deadbeef12345678');
      expect(html).toContain('btn-copy-sha');
    });
  });

  describe('feed-view.ts', () => {
    it('should render inline quick composer with action buttons and mode toggles', () => {
      const html = renderInlineQuickComposer();

      expect(html).toContain('id="btn-mode-quick-pulse"');
      expect(html).toContain('id="btn-mode-quick-article"');
      expect(html).toContain('id="inline-composer-hub"');
      expect(html).toContain('id="inline-composer-textarea"');
      expect(html).toContain('id="btn-inline-broadcast"');
      expect(html).toContain('id="btn-inline-open-full"');
    });

    it('should render pulse workspace with quick composer and feed controls', () => {
      clientStore.activeChannelId = 'pulse-global';
      const html = renderPulseWorkspace();

      expect(html).toContain('id="main-feed-scroll"');
      expect(html).toContain('PULSE STREAM');
      expect(html).toContain('id="inline-composer-textarea"');
    });

    it('should render pulse post card with merit voting and author metadata', () => {
      const post: ClientPost = {
        id: 'pulse-post-1',
        channelId: 'pulse-global',
        authorFingerprint: 'sovereign-creator-12',
        authorRole: 'GUARDIAN',
        title: 'Decentralized Gossip Protocol Insights',
        content: 'Zero-round-trip message propagation benchmarks.',
        flair: 'TECH DISCUSSION',
        meritVotes: 15,
        userVoted: 0,
        replyCount: 3,
        boostCount: 1,
        createdAt: Date.now(),
      };

      const html = renderPulsePostCard(post);
      expect(html).toContain('btn-pulse-like');
      expect(html).toContain('btn-downvote');
      expect(html).toContain('15');
      expect(html).toContain('Decentralized Gossip Protocol Insights');
      expect(html).toContain('sovereign-creator-12'.substring(0, 8));
    });

    it('should delegate renderPostCard to feedControlsEngine', () => {
      const post: ClientPost = {
        id: 'pulse-post-2',
        channelId: 'pulse-global',
        authorFingerprint: 'mesh-user-45',
        authorRole: 'MEMBER',
        title: 'Testing Feed Controls Delegation',
        content: 'Content stream testing.',
        flair: 'GENERAL',
        meritVotes: 7,
        userVoted: 0,
        replyCount: 1,
        boostCount: 0,
        createdAt: Date.now(),
      };

      const html = renderPostCard(post);
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain('Testing Feed Controls Delegation');
    });
  });
});
