import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSovereignIdentity,
  createSignedEnvelope,
} from '@aetheris/core-crypto';
import {
  requireSignedEnvelope,
  resetReplayNonceCache,
} from '../../functions/api/_auth.js';

describe('Security Gate: Cross-Worker & Cross-Isolate Replay Protection', () => {
  // Shared distributed storage simulation (simulates Cloudflare D1 used_nonces table)
  let sharedD1Rows: Set<string>;
  let mockD1: any;

  beforeEach(() => {
    resetReplayNonceCache();
    sharedD1Rows = new Set();
    mockD1 = {
      prepare(query: string) {
        return {
          bind(fingerprint: string, nonce: string, expiresAt: number, createdAt: number) {
            return {
              async run() {
                const key = `${fingerprint}:${nonce}`;
                if (sharedD1Rows.has(key)) {
                  const err = new Error('UNIQUE constraint failed: used_nonces.fingerprint, used_nonces.nonce');
                  throw err;
                }
                sharedD1Rows.add(key);
                return { success: true, meta: {} };
              },
            };
          },
        };
      },
    };
  });

  it('rejects cross-worker replay when identical envelope hits a separate isolate with clean local memory', async () => {
    const user = createSovereignIdentity({ capabilities: ['post:create'] });
    const payload = { title: 'Broadcast Post', content: 'Distributed Mesh Pulse' };
    const envelope = createSignedEnvelope(payload, user);

    // Isolate 1 processes the request with shared D1
    const res1 = await requireSignedEnvelope(
      { request: new Request('https://aetheris.pages.dev/api/posts'), env: { DB: mockD1 } },
      envelope,
      'post:create'
    );
    expect(res1.authorized).toBe(true);

    // Simulate Isolate 2: completely separate isolate memory (local in-memory cache is empty!)
    resetReplayNonceCache();

    // Isolate 2 receives the replayed envelope
    const res2 = await requireSignedEnvelope(
      { request: new Request('https://aetheris.pages.dev/api/posts'), env: { DB: mockD1 } },
      envelope,
      'post:create'
    );

    expect(res2.authorized).toBe(false);
    expect(res2.response?.status).toBe(401);
    const json = await res2.response?.json();
    expect(json.stage).toBe('replay');
    expect(json.error).toMatch(/replay attack detected/i);
  });

  it('allows subsequent legitimate requests with fresh nonces across isolates', async () => {
    const user = createSovereignIdentity({ capabilities: ['post:create'] });

    // Request 1 on Isolate 1
    const env1 = createSignedEnvelope({ title: 'Msg 1' }, user);
    const res1 = await requireSignedEnvelope(
      { request: new Request('https://aetheris.pages.dev/api/posts'), env: { DB: mockD1 } },
      env1,
      'post:create'
    );
    expect(res1.authorized).toBe(true);

    // Switch to Isolate 2 (cleared local memory)
    resetReplayNonceCache();

    // Request 2 with new fresh nonce on Isolate 2
    const env2 = createSignedEnvelope({ title: 'Msg 2' }, user);
    const res2 = await requireSignedEnvelope(
      { request: new Request('https://aetheris.pages.dev/api/posts'), env: { DB: mockD1 } },
      env2,
      'post:create'
    );
    expect(res2.authorized).toBe(true);
  });
});
