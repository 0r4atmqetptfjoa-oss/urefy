import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createSignedEnvelope, createSovereignIdentity } from '@aetheris/core-crypto';
import { createDmDatabase } from './helpers/dm-database.js';
import { onRequestPost } from '../functions/api/governance.js';

describe('Persistent signed governance', () => {
  let fixture: ReturnType<typeof createDmDatabase>;
  const owner = createSovereignIdentity();
  const voter = createSovereignIdentity();
  beforeEach(() => {
    fixture = createDmDatabase();
    fixture.sqlite.exec(readFileSync(new URL('../migrations/0008_governance.sql', import.meta.url), 'utf8'));
  });
  afterEach(() => fixture.sqlite.close());
  function send(payload: Record<string, unknown>, keys = owner) {
    return onRequestPost({ env: { DB: fixture.database, ENVIRONMENT: 'production' },
      request: new Request('https://example.test/api/governance', { method: 'POST', body: JSON.stringify(createSignedEnvelope({ scope: 'urefy-governance-v1', ...payload }, keys)) }) });
  }
  async function proposal() {
    const id = crypto.randomUUID();
    const payload = { action: 'create', id, title: 'Community proposal', description: 'A real persisted proposal', category: 'community', quorum: 1, durationHours: 24 };
    expect((await send(payload)).status).toBe(201);
    return payload;
  }

  it('persists proposals and replaces only the current identity ballot', async () => {
    const created = await proposal();
    expect((await send({ action: 'vote', proposalId: created.id, choice: 'for' }, voter)).status).toBe(200);
    expect((await send({ action: 'vote', proposalId: created.id, choice: 'against' }, voter)).status).toBe(200);
    const result = await (await send({ action: 'vote', proposalId: created.id, choice: 'for' })).json();
    expect(result.proposals[0].votes).toEqual({ for: 1, against: 1, abstain: 0, totalVoters: 2 });
    expect(result.myVotes).toHaveLength(1);
    expect(result.myVotes[0].signedEnvelope.signature).toBeTruthy();
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM governance_votes').get()?.count).toBe(2);
  });

  it('rejects altered signatures, arbitrary vote weights and expired ballots', async () => {
    const created = await proposal();
    const envelope = createSignedEnvelope({ scope: 'urefy-governance-v1', action: 'vote', proposalId: created.id, choice: 'for' }, voter);
    envelope.payload.choice = 'against';
    const response = await onRequestPost({ env: { DB: fixture.database }, request: new Request('https://example.test/api/governance', { method: 'POST', body: JSON.stringify(envelope) }) });
    expect(response.status).toBe(401);
    expect((await send({ action: 'vote', proposalId: created.id, choice: 'for', weight: 999 })).status).toBe(400);
    fixture.sqlite.prepare('UPDATE governance_proposals SET expires_at = 0 WHERE id = ?').run(created.id);
    expect((await send({ action: 'vote', proposalId: created.id, choice: 'for' })).status).toBe(409);
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM governance_votes').get()?.count).toBe(0);
  });

  it('handles fresh retries and prevents conflicting authors from replacing proposals', async () => {
    const created = await proposal();
    expect((await send(created)).status).toBe(201);
    expect((await send(created, voter)).status).toBe(409);
    expect((await send({ ...created, title: 'Changed' })).status).toBe(409);
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM governance_proposals').get()?.count).toBe(1);
  });

  it('refuses writes for quarantined identities or during an administrative freeze', async () => {
    const created = await proposal();
    fixture.sqlite.prepare('INSERT INTO user_roles (fingerprint, is_quarantined) VALUES (?, 1)').run(voter.identity.fingerprint);
    expect((await send({ action: 'vote', proposalId: created.id, choice: 'for' }, voter)).status).toBe(403);
    fixture.sqlite.exec("INSERT INTO system_config VALUES ('emergencyFreeze', 'true')");
    expect((await send({ action: 'vote', proposalId: created.id, choice: 'for' })).status).toBe(503);
  });
});