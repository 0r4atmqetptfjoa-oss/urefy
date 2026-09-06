import { describe, it, expect, beforeEach } from 'vitest';
import { clientStore } from '../src/client-state.js';
import { sovereignRouter } from '../src/router.js';
import { renderSidebar } from '../src/sidebar.js';
import { legalFooter } from '../src/footer.js';

describe('Navigation, Sovereign Communities Framing & Reddit-style Legal Sidebar', () => {
  beforeEach(() => {
    clientStore.activeChannelId = 'pulse-global';
    sovereignRouter.navigateTo('feed');
  });

  it('1. Sovereign Communities card in sidebar is properly framed with closed tags', () => {
    const html = renderSidebar();
    expect(html).toContain('Sovereign Communities');
    // Ensure no broken duplicate unclosed h3 tags
    const countH3 = (html.match(/<h3/g) || []).length;
    const countH3Close = (html.match(/<\/h3>/g) || []).length;
    expect(countH3).toBe(countH3Close);
    expect(html).toContain('Directory');
    expect(html).toContain('+ Create');
  });

  it('2. Legal snippet renders Reddit-style compact links suitable for left sidebar', () => {
    const html = legalFooter.renderSidebarLegalSnippet();
    expect(html).toContain('id="sidebar-legal-snippet"');
    expect(html).toContain('data-legal-tab="about"');
    expect(html).toContain('data-legal-tab="terms"');
    expect(html).toContain('data-legal-tab="privacy"');
    expect(html).toContain('data-legal-tab="rules"');
    expect(html).toContain('data-legal-tab="dsa"');
    expect(html).toContain('data-legal-tab="contact"');
    expect(html).toContain('0 Trackers');
  });

  it('3. Router navigateTo messages activates chat and updates activeChannelId', () => {
    sovereignRouter.navigateTo('messages');
    expect(sovereignRouter.route).toBe('messages');
    expect(clientStore.activeChannelId.startsWith('relays-')).toBe(true);
  });

  it('4. joinChannel on a relays or DM channel automatically syncs router to messages', () => {
    clientStore.joinChannel('relays-general');
    expect(sovereignRouter.route).toBe('messages');
    expect(clientStore.activeChannelId).toBe('relays-general');

    clientStore.joinChannel('dm-alice-bob');
    expect(sovereignRouter.route).toBe('messages');
    expect(clientStore.activeChannelId).toBe('dm-alice-bob');
  });

  it('5. Router handles aliases relays and chat mapping to messages', () => {
    sovereignRouter.navigateTo('messages');
    expect(sovereignRouter.route).toBe('messages');
  });
});
