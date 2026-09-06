import { describe, it, expect, beforeEach } from 'vitest';
import { sovereignDM, SovereignDMManager } from '../src/sovereign-dm.js';
import { clientStore, DirectMessageAttachment } from '../src/client-state.js';
import { sovereignCircleEngine } from '../src/sovereign-circle.js';
import {
  renderAttachmentCard,
  renderEmojiPopover,
  renderStagedAttachmentChip,
  isDMEmojiPickerOpen,
  isRelayEmojiPickerOpen,
  toggleDMEmojiPicker,
  toggleRelayEmojiPicker,
  closeEmojiPickers,
  renderDirectMessagesWorkspace,
  renderRelaysWorkspace,
} from '../src/messages-view.js';
import { renderCommunityHeaderBanner, renderPulseWorkspace } from '../src/feed-view.js';

describe('Production Live Chat, Attachments, Emojis & Reddit-Style Communities', () => {
  beforeEach(() => {
    clientStore.pendingRelayAttachment = null;
    sovereignDM.setPendingAttachment(null);
    closeEmojiPickers();
  });

  describe('1. Chat Bubble Overflow Constraints & Wrapping', () => {
    it('renders messages with word-break and overflow constraints for unbreakable strings', () => {
      const dmHtml = renderDirectMessagesWorkspace();
      expect(dmHtml).toContain('break-words');
      expect(dmHtml).toContain('break-all');
      expect(dmHtml).toContain('[overflow-wrap:anywhere]');
      expect(dmHtml).toContain('min-w-0');
    });

    it('prevents native form page refresh with data-submit delegation', () => {
      const dmHtml = renderDirectMessagesWorkspace();
      expect(dmHtml).toContain('data-submit="submit-dm-message"');

      const relayHtml = renderRelaysWorkspace();
      expect(relayHtml).toContain('data-submit="submit-relay-message"');
    });
  });

  describe('2. Chat Emoji Popover and Insertion', () => {
    it('manages emoji picker state cleanly for DMs and Relays', () => {
      expect(isDMEmojiPickerOpen).toBe(false);
      expect(isRelayEmojiPickerOpen).toBe(false);

      toggleDMEmojiPicker(true);
      expect(isDMEmojiPickerOpen).toBe(true);
      expect(isRelayEmojiPickerOpen).toBe(false);

      toggleRelayEmojiPicker(true);
      expect(isDMEmojiPickerOpen).toBe(false);
      expect(isRelayEmojiPickerOpen).toBe(true);

      closeEmojiPickers();
      expect(isDMEmojiPickerOpen).toBe(false);
      expect(isRelayEmojiPickerOpen).toBe(false);
    });

    it('renders emoji popover with interactive emoji buttons', () => {
      toggleDMEmojiPicker(true);
      const dmPopover = renderEmojiPopover('dm');
      expect(dmPopover).toContain('data-action="insert-dm-emoji"');
      expect(dmPopover).toContain('data-emoji="⚡"');
      expect(dmPopover).toContain('data-emoji="🛡️"');
      expect(dmPopover).toContain('data-emoji="😊"');

      toggleRelayEmojiPicker(true);
      const relayPopover = renderEmojiPopover('relay');
      expect(relayPopover).toContain('data-action="insert-relay-emoji"');
      expect(relayPopover).toContain('data-emoji="🔥"');
    });
  });

  describe('3. Chat Media and File Attachments (50MB ceiling & cards)', () => {
    it('renders staged attachment chips with removal button', () => {
      const testAtt: DirectMessageAttachment = {
        name: 'audit_report.pdf',
        size: 1048576, // 1MB
        type: 'application/pdf',
        dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      };

      const dmChip = renderStagedAttachmentChip(testAtt, 'dm');
      expect(dmChip).toContain('audit_report.pdf');
      expect(dmChip).toContain('1.0 MB');
      expect(dmChip).toContain('data-action="clear-dm-attachment"');

      const relayChip = renderStagedAttachmentChip(testAtt, 'relay');
      expect(relayChip).toContain('data-action="clear-relay-attachment"');
    });

    it('renders image attachment card with lightbox zoom trigger', () => {
      const imgAtt: DirectMessageAttachment = {
        name: 'topology.png',
        size: 512000,
        type: 'image/png',
        dataUrl: 'data:image/png;base64,iVBORw0KGgo...',
      };

      const card = renderAttachmentCard(imgAtt);
      expect(card).toContain('<img');
      expect(card).toContain('data-action="open-lightbox"');
      expect(card).toContain('topology.png');
    });

    it('renders video and audio player cards appropriately', () => {
      const vidAtt: DirectMessageAttachment = {
        name: 'demo.mp4',
        size: 5242880,
        type: 'video/mp4',
        dataUrl: 'data:video/mp4;base64,AAAA...',
      };

      const vidCard = renderAttachmentCard(vidAtt);
      expect(vidCard).toContain('<video');
      expect(vidCard).toContain('controls');

      const audAtt: DirectMessageAttachment = {
        name: 'voice_memo.mp3',
        size: 262144,
        type: 'audio/mp3',
        dataUrl: 'data:audio/mp3;base64,SUQz...',
      };

      const audCard = renderAttachmentCard(audAtt);
      expect(audCard).toContain('<audio');
      expect(audCard).toContain('controls');
    });

    it('attaches and transmits file in sovereign DM', async () => {
      const testManager = new SovereignDMManager();
      const peer = 'c3dc28cb705e';
      testManager.openDM(peer, 'GUARDIAN');

      const att: DirectMessageAttachment = {
        name: 'contract.pdf',
        size: 2048,
        type: 'application/pdf',
        dataUrl: 'data:application/pdf;base64,dGVzdA==',
      };

      await testManager.sendMessage('Enclosed contract', 'my_fingerprint', att);

      const conv = testManager.getConversation(peer);
      expect(conv).toBeDefined();
      const lastMsg = conv!.messages[conv!.messages.length - 1];
      expect(lastMsg.attachment).toBeDefined();
      expect(lastMsg.attachment?.name).toBe('contract.pdf');
    });
  });

  describe('4. Sovereign Communities Reddit-Style Architecture', () => {
    it('renders Reddit-style community header banner with members, online nodes, and rules', () => {
      const circle = sovereignCircleEngine.getCircle('pulse-global')!;
      expect(circle).toBeDefined();

      const bannerHtml = renderCommunityHeaderBanner(circle);
      expect(bannerHtml).toContain(`c/${circle.name}`);
      expect(bannerHtml).toContain('Sovereign Community');
      expect(bannerHtml).toContain(`${circle.onlineCount} online`);
      expect(bannerHtml).toContain(circle.membersCount.toLocaleString());
      expect(bannerHtml).toContain('data-action="toggle-join-circle"');
      expect(bannerHtml).toContain('data-action="open-composer-for-circle"');
      expect(bannerHtml).toContain('Rules:');
      expect(bannerHtml).toContain(circle.rules[0].title);
    });

    it('allows real-time joining and leaving of sovereign communities', () => {
      const circle = sovereignCircleEngine.getCircle('vault-guides')!;
      const initialJoined = circle.isJoined;
      const initialMembers = circle.membersCount;

      const newStatus = sovereignCircleEngine.toggleJoin(circle.id);
      expect(newStatus).toBe(!initialJoined);
      expect(circle.membersCount).toBe(initialJoined ? initialMembers - 1 : initialMembers + 1);

      // Revert
      sovereignCircleEngine.toggleJoin(circle.id);
      expect(circle.isJoined).toBe(initialJoined);
    });

    it('filters feed posts according to active sovereign community', () => {
      clientStore.activeChannelId = 'vault-releases';
      const workspaceHtml = renderPulseWorkspace();
      expect(workspaceHtml).toContain('c/CLEAN-RELEASES');
      expect(workspaceHtml).toContain('Reproducible Binary Knowledge Vault');
    });
  });
});
