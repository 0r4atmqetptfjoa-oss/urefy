import { describe, it, expect, beforeEach, vi } from 'vitest';
import { touchGestureEngine } from '../src/touch-gestures.js';
import { crossTabSync, CrossTabSyncEngine, CrossTabMessage } from '../src/cross-tab-sync.js';
import { clientStore } from '../src/client-state.js';

describe('Phase 2: Touch Gestures Engine & Cross-Tab BroadcastChannel Sync', () => {
  describe('1. Touch Gestures Engine', () => {
    it('should initialize with resting state', () => {
      expect(touchGestureEngine.isRefreshing).toBe(false);
      expect(touchGestureEngine.pullDistance).toBe(0);
    });

    it('should render pull-to-refresh indicator HTML with pull-icon', () => {
      const html = touchGestureEngine.renderIndicatorHTML();
      expect(html).toContain('id="pull-to-refresh-indicator"');
      expect(html).toContain('class="pull-icon');
    });
  });

  describe('2. Cross-Tab State Synchronization Engine', () => {
    let syncEngine: CrossTabSyncEngine;

    beforeEach(() => {
      syncEngine = new CrossTabSyncEngine();
      vi.restoreAllMocks();
    });

    it('should generate an ephemeral unique tabId', () => {
      expect(syncEngine.tabId).toBeDefined();
      expect(syncEngine.tabId.startsWith('tab-')).toBe(true);
    });

    it('should ignore incoming messages originating from the same tabId', () => {
      const notifySpy = vi.spyOn(clientStore, 'notify');
      const ownMessage: CrossTabMessage = {
        type: 'POST_VOTED',
        payload: { postId: 'test-p', direction: 1, meritVotes: 100 },
        sourceTabId: syncEngine.tabId,
        timestamp: Date.now(),
      };

      syncEngine.handleIncomingMessage(ownMessage);
      expect(notifySpy).not.toHaveBeenCalled();
    });

    it('should process POST_CREATED from another tab and update clientStore', () => {
      const notifySpy = vi.spyOn(clientStore, 'notify');
      const foreignMessage: CrossTabMessage = {
        type: 'POST_CREATED',
        payload: {
          id: 'p-remote-sync-1',
          title: 'Remote Broadcast from Peer Tab',
          content: 'Synchronized over native BroadcastChannel without HTTP request.',
          authorFingerprint: 'id:peer-tab',
          meritVotes: 1,
          createdAt: Date.now(),
        },
        sourceTabId: 'tab-foreign-99',
        timestamp: Date.now(),
      };

      syncEngine.handleIncomingMessage(foreignMessage);
      expect(clientStore.posts.some(p => p.id === 'p-remote-sync-1')).toBe(true);
      expect(notifySpy).toHaveBeenCalledWith('NEW_POST', expect.anything());
    });

    it('should process POST_VOTED from another tab and update vote count', () => {
      // Ensure post exists in store
      const testPost = {
        id: 'p-vote-test',
        title: 'Vote Target Post',
        content: 'Content',
        meritVotes: 10,
        replyCount: 0,
        boostCount: 0,
        userVoted: 0,
        authorFingerprint: 'id:test',
        isExpanded: false,
        createdAt: Date.now(),
      };
      clientStore.posts.unshift(testPost);

      const foreignVoteMsg: CrossTabMessage = {
        type: 'POST_VOTED',
        payload: {
          postId: 'p-vote-test',
          direction: 1,
          meritVotes: 11,
        },
        sourceTabId: 'tab-foreign-88',
        timestamp: Date.now(),
      };

      syncEngine.handleIncomingMessage(foreignVoteMsg);
      const updated = clientStore.posts.find(p => p.id === 'p-vote-test');
      expect(updated?.meritVotes).toBe(11);
    });

    it('should process MESSAGE_SENT from another tab and append to channel messages', () => {
      const foreignChatMsg: CrossTabMessage = {
        type: 'MESSAGE_SENT',
        payload: {
          channelId: 'relays-general',
          message: {
            id: 'msg-remote-tab-1',
            channelId: 'relays-general',
            authorFingerprint: 'id:remote-agent',
            text: 'Incoming message from background tab.',
            createdAt: Date.now(),
          },
        },
        sourceTabId: 'tab-foreign-77',
        timestamp: Date.now(),
      };

      syncEngine.handleIncomingMessage(foreignChatMsg);
      const generalMsgs = clientStore.messages.get('relays-general') || [];
      expect(generalMsgs.some(m => m.id === 'msg-remote-tab-1')).toBe(true);
    });
  });
});
