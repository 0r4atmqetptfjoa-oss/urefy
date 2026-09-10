import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createSovereignIdentity } from '@aetheris/core-crypto';
import { createDmDatabase } from './helpers/dm-database.js';
import { onRequestPost } from '../functions/api/governance.js';
import { GovernanceClient } from '../src/governance-client.js';

describe('Governance client against the real API', () => {
  let fixture: ReturnType<typeof createDmDatabase>;
  beforeEach(() => {
    fixture = createDmDatabase();
    fixture.sqlite.exec(readFileSync(new URL('../migrations/0008_governance.sql', import.meta.url), 'utf8'));
  });
  afterEach(() => fixture.sqlite.close());

  it('exchanges proposals and signed ballots between independent identities', async () => {
    const fetcher: typeof fetch = async (url, options) => onRequestPost({ env: { DB: fixture.database }, request: new Request(new URL(String(url), 'https://example.test'), options) });
    const authorKeys = createSovereignIdentity();
    const voterKeys = createSovereignIdentity();
    const author = new GovernanceClient(async () => authorKeys, fetcher);
    const voter = new GovernanceClient(async () => voterKeys, fetcher);
    const id = crypto.randomUUID();
    await author.create({ id, title: 'Persisted proposal', description: 'Shared by two sessions', category: 'community', quorum: 1, durationHours: 24 });
    expect((await voter.list()).proposals[0].id).toBe(id);
    await voter.vote(id, 'for');
    expect((await author.list()).proposals[0].votes.for).toBe(1);
    const updated = await voter.vote(id, 'against');
    expect(updated.myVotes[0].choice).toBe('against');
    expect(updated.proposals[0].votes.totalVoters).toBe(1);
  });

  it('does not return success when persistence is unavailable', async () => {
    const keys = createSovereignIdentity();
    const client = new GovernanceClient(async () => keys, async () => Response.json({ success: false, error: 'Unavailable' }, { status: 503 }));
    await expect(client.list()).rejects.toThrow('Unavailable');
  });
});