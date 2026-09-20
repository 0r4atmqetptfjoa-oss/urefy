import { describe, it, expect, beforeEach } from 'vitest';
import { clientStore } from '../src/client-state.js';
import { postDetailView } from '../src/post-detail.js';
import { actionDispatcher } from '../src/ui/action-dispatcher.js';

function createMockElement(attrs: Record<string, string> = {}): any {
  const attributes = { ...attrs };
  return {
    getAttribute: (name: string) => attributes[name] ?? null,
    setAttribute: (name: string, val: string) => { attributes[name] = val; },
    id: attributes['id'] || '',
    dataset: attributes,
    closest: () => null,
  };
}

describe('Post Detail Modal Interactions (Close, Subtabs, Merit Voting)', () => {
  beforeEach(() => {
    // Reset test post
    const p = clientStore.posts.find(x => x.id === 'post-1');
    if (p) {
      p.meritVotes = 100;
      p.userVoted = 0;
    }
    postDetailView.closePost();
  });

  describe('1. Post Detail Modal Markup & Pointer Events', () => {
    it('renders overlay with pointer-events-auto and close-post-detail-backdrop action', () => {
      const p = clientStore.posts.find(x => x.id === 'post-1')!;
      const html = postDetailView.renderFullPostModal(p, [], []);
      expect(html).toContain('id="post-detail-modal-overlay"');
      expect(html).toContain('pointer-events-auto');
      expect(html).toContain('data-action="close-post-detail-backdrop"');
    });

    it('renders Back to Feed and Close (ESC) buttons with close-post-detail action', () => {
      const p = clientStore.posts.find(x => x.id === 'post-1')!;
      const html = postDetailView.renderFullPostModal(p, [], []);
      expect(html).toContain('id="btn-back-to-feed"');
      expect(html).toContain('id="btn-close-post-detail"');
      expect(html).toContain('data-action="close-post-detail"');
    });

    it('renders subtabs with post-detail-subtab action', () => {
      const p = clientStore.posts.find(x => x.id === 'post-1')!;
      const html = postDetailView.renderFullPostModal(p, [], []);
      expect(html).toContain('data-action="post-detail-subtab" data-subtab="discussion"');
      expect(html).toContain('data-action="post-detail-subtab" data-subtab="zk_proof"');
      expect(html).toContain('data-action="post-detail-subtab" data-subtab="raw_json"');
    });

    it('renders Merit vote buttons with post-detail-vote action and direction', () => {
      const p = clientStore.posts.find(x => x.id === 'post-1')!;
      const html = postDetailView.renderFullPostModal(p, [], []);
      expect(html).toContain('data-action="post-detail-vote" data-vote-id="post-1" data-dir="1"');
      expect(html).toContain('data-action="post-detail-vote" data-vote-id="post-1" data-dir="-1"');
      expect(html).toContain('detail-vote-count');
    });
  });

  describe('2. Subtab Switching (ZK-Proof & Raw JSON)', () => {
    it('renders discussion view by default', () => {
      const p = clientStore.posts.find(x => x.id === 'post-1')!;
      postDetailView.activeSubTab = 'discussion';
      const html = postDetailView.renderFullPostModal(p, [], []);
      expect(html).toContain('MERIT VOTING CONTROLLER');
      expect(html).not.toContain('ZK-RLN & Ed25519 Cryptographic Proof');
    });

    it('renders ZK-Proof view when activeSubTab is zk_proof', () => {
      const p = clientStore.posts.find(x => x.id === 'post-1')!;
      postDetailView.activeSubTab = 'zk_proof';
      const html = postDetailView.renderFullPostModal(p, [], []);
      expect(html).toContain('ZK-RLN & Ed25519 Cryptographic Proof');
      expect(html).toContain('RLN NULLIFIER HASH');
      expect(html).toContain('ED25519 SIGNATURE STATUS');
    });

    it('renders Raw JSON view when activeSubTab is raw_json', () => {
      const p = clientStore.posts.find(x => x.id === 'post-1')!;
      postDetailView.activeSubTab = 'raw_json';
      const html = postDetailView.renderFullPostModal(p, [], []);
      expect(html).toContain('Raw Sovereign Post Payload');
      expect(html).toContain('data-action="copy-post-json"');
      expect(html).toContain(p.id);
    });
  });

  describe('3. Action Dispatcher Handlers', () => {
    it('handles close-post-detail and closes modal', () => {
      postDetailView.openPost('post-1');
      expect(postDetailView.isOpen()).toBe(true);

      const btn = createMockElement({ 'data-action': 'close-post-detail' });
      actionDispatcher.dispatch('close-post-detail', btn, { stopPropagation: () => {} } as any);

      expect(postDetailView.isOpen()).toBe(false);
    });

    it('handles close-post-detail-backdrop when event target matches overlay', () => {
      postDetailView.openPost('post-1');
      expect(postDetailView.isOpen()).toBe(true);

      const overlay = createMockElement({
        id: 'post-detail-modal-overlay',
        'data-action': 'close-post-detail-backdrop',
      });

      const clickEvent = {
        target: overlay,
        stopPropagation: () => {},
      } as any;

      actionDispatcher.dispatch('close-post-detail-backdrop', overlay, clickEvent);
      expect(postDetailView.isOpen()).toBe(false);
    });

    it('does not close modal when clicking inside modal card on backdrop handler', () => {
      postDetailView.openPost('post-1');
      expect(postDetailView.isOpen()).toBe(true);

      const overlay = createMockElement({
        id: 'post-detail-modal-overlay',
        'data-action': 'close-post-detail-backdrop',
      });

      const innerCard = createMockElement({ id: 'modal-card' });
      const clickEvent = {
        target: innerCard,
        stopPropagation: () => {},
      } as any;

      actionDispatcher.dispatch('close-post-detail-backdrop', overlay, clickEvent);
      expect(postDetailView.isOpen()).toBe(true);
    });

    it('handles post-detail-subtab and switches subtab', () => {
      postDetailView.openPost('post-1');
      expect(postDetailView.activeSubTab).toBe('discussion');

      const btnZk = createMockElement({
        'data-action': 'post-detail-subtab',
        'data-subtab': 'zk_proof',
      });
      actionDispatcher.dispatch('post-detail-subtab', btnZk, { stopPropagation: () => {} } as any);

      expect(postDetailView.activeSubTab).toBe('zk_proof');

      const btnJson = createMockElement({
        'data-action': 'post-detail-subtab',
        'data-subtab': 'raw_json',
      });
      actionDispatcher.dispatch('post-detail-subtab', btnJson, { stopPropagation: () => {} } as any);

      expect(postDetailView.activeSubTab).toBe('raw_json');
    });

    it('handles post-detail-vote and updates clientStore merit score', () => {
      postDetailView.openPost('post-1');
      const p = clientStore.posts.find(x => x.id === 'post-1')!;
      expect(p.meritVotes).toBe(100);
      expect(p.userVoted).toBe(0);

      const upBtn = createMockElement({
        'data-action': 'post-detail-vote',
        'data-vote-id': 'post-1',
        'data-dir': '1',
      });

      actionDispatcher.dispatch('post-detail-vote', upBtn, { stopPropagation: () => {} } as any);
      expect(p.userVoted).toBe(1);
      expect(p.meritVotes).toBe(101);

      // Toggle off
      actionDispatcher.dispatch('post-detail-vote', upBtn, { stopPropagation: () => {} } as any);
      expect(p.userVoted).toBe(0);
      expect(p.meritVotes).toBe(100);

      // Downvote
      const downBtn = createMockElement({
        'data-action': 'post-detail-vote',
        'data-vote-id': 'post-1',
        'data-dir': '-1',
      });

      actionDispatcher.dispatch('post-detail-vote', downBtn, { stopPropagation: () => {} } as any);
      expect(p.userVoted).toBe(-1);
      expect(p.meritVotes).toBe(99);
    });
  });
});
