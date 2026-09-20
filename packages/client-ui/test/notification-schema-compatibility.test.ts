import { expect, it } from 'vitest';
import { createProductDatabase } from './helpers/product-database.js';
import { storeNotification } from '../functions/api/_notification-storage.js';
import { onRequestGet } from '../functions/api/notifications.js';
import { createSignedEnvelope, createSovereignIdentity } from '@aetheris/core-crypto';

it('writes and reads notifications using the actual early-production D1 layout', async () => {
  const fixture = createProductDatabase();
  const owner = createSovereignIdentity();
  try {
    fixture.sqlite.exec('DROP TABLE notifications; CREATE TABLE notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, actor_id TEXT NOT NULL, actor_name TEXT, actor_avatar TEXT, action_type TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, content_snippet TEXT, is_read INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)');
    await storeNotification(fixture.database, { id: 'legacy-notice', userId: owner.identity.fingerprint, actorId: 'actor', type: 'reply_post', previewText: 'A durable reply', targetId: 'post', createdAt: Date.now() });
    const envelope = createSignedEnvelope({ scope: 'urefy-notifications-v1', action: 'list' }, owner);
    const response = await onRequestGet({ env: { DB: fixture.database, ENVIRONMENT: 'production' }, request: new Request(`https://urefy.com/api/notifications?userId=${owner.identity.fingerprint}`, { headers: { 'X-Sovereign-Envelope': JSON.stringify(envelope) } }) });
    expect(response.status).toBe(200);
    expect((await response.json()).notifications[0]).toMatchObject({ id: 'legacy-notice', type: 'reply_post', previewText: 'A durable reply', isRead: false });
  } finally { fixture.sqlite.close(); }
});
