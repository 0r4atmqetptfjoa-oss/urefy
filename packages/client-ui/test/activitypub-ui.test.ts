import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileView, formatFederatedHandle } from '../src/profile-view.js';
import { clientStore } from '../src/client-state.js';

describe('Ticket 4.3: ActivityPub UI Federated Handle & Badge', () => {
  let view: ProfileView;

  beforeEach(() => {
    view = new ProfileView();
  });

  it('1. formatFederatedHandle produces valid Mastodon-compatible handle format', () => {
    const handle = formatFederatedHandle('genesis-core');
    expect(handle).toMatch(/^@[^@]+@aetheris\.mesh$/);
    expect(handle).toBe('@genesis-core@aetheris.mesh');
  });

  it('2. getFederatedHandle uses alias/handle if available, falls back to fingerprint prefix', () => {
    const h = view.getFederatedHandle('genesis-core');
    expect(h).toMatch(/^@[^@]+@aetheris\.mesh$/);
    expect(h.startsWith('@')).toBe(true);
  });

  it('3. renderProfileView includes federated handle in rendered HTML', () => {
    const html = view.renderProfileView([], 'genesis-core');
    expect(html).toContain('federated-handle');
    expect(html).toContain('@aetheris.mesh');
    expect(html).toContain('data-federated-handle');
  });

  it('4. renderProfileView includes Copy Federated Handle button', () => {
    const html = view.renderProfileView([], 'genesis-core');
    expect(html).toContain('btn-copy-federated-handle');
    expect(html).toContain('Copy Federated Handle');
    expect(html).toContain('data-copy-handle');
  });

  it('5. renderProfileView includes ActivityPub 2.0 federation badge with NodeInfo link', () => {
    const html = view.renderProfileView([], 'genesis-core');
    expect(html).toContain('activitypub-badge');
    expect(html).toContain('Federated via ActivityPub 2.0');
    expect(html).toContain('/.well-known/aetheris-node');
    expect(html).toContain('data-activitypub-badge="true"');
  });

  it('6. federated handle format is accepted by Mastodon (@ prefix, domain suffix, no spaces)', () => {
    const fingerprints = ['c3dc28cb705e', 'genesis-core', 'short'];
    for (const fp of fingerprints) {
      const h = formatFederatedHandle(fp);
      expect(h.startsWith('@')).toBe(true);
      expect(h.includes(' ')).toBe(false);
      expect(h).toContain('@aetheris.mesh');
    }
  });
});
