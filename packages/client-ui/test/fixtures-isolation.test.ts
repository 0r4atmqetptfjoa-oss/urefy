import { describe, it, expect } from 'vitest';
import { onRequestGet as handleChannelsGet } from '../functions/api/channels.js';
import { onRequestGet as handleMessagesGet } from '../functions/api/messages.js';
import { onRequestGet as handlePostsGet } from '../functions/api/posts.js';
import { onRequestGet as handleNanopubsGet } from '../functions/api/nanopublications.js';
import { onRequestGet as handleAnalyticsGet } from '../functions/api/analytics.js';
import { onRequestGet as handleStorageGet } from '../functions/api/storage.js';
import {
  INITIAL_CHANNELS,
  INITIAL_MESSAGES,
  INITIAL_POSTS,
  INITIAL_NANOPUBLICATIONS,
  INITIAL_NODES,
} from '../functions/api/_db.js';
import {
  INITIAL_CHANNELS as DEV_CHANNELS,
  INITIAL_MESSAGES as DEV_MESSAGES,
  INITIAL_POSTS as DEV_POSTS,
  INITIAL_NANOPUBLICATIONS as DEV_NANOPUBLICATIONS,
  INITIAL_NODES as DEV_NODES,
} from '../functions/api/_dev-fixtures.js';

describe('Global D1 Initial Data Sets Isolation (Finding 5)', () => {
  const emptyDb = {
    prepare: (query: string) => ({
      bind: () => ({
        all: () => Promise.resolve({ results: [] }),
        first: () => {
          if (query.includes('COUNT(*)')) return Promise.resolve({ count: 0 });
          return Promise.resolve(null);
        },
        run: () => Promise.resolve({ success: true }),
      }),
      all: () => Promise.resolve({ results: [] }),
      first: () => {
        if (query.includes('COUNT(*)')) return Promise.resolve({ count: 0 });
        return Promise.resolve(null);
      },
      run: () => Promise.resolve({ success: true }),
    }),
  };

  const emptyR2 = {
    head: () => Promise.resolve(null),
    get: () => Promise.resolve(null),
    put: () => Promise.resolve(null),
    delete: () => Promise.resolve(),
    list: () => Promise.resolve({ objects: [], truncated: false }),
  };

  const prodEnv = {
    ENVIRONMENT: 'production',
    DB: emptyDb,
    VAULT_BUCKET: emptyR2,
  };

  describe('1. Clean Default Runtime State Exports in _db.ts', () => {
    it('exports clean empty arrays for all INITIAL_* state from _db.ts', () => {
      expect(INITIAL_CHANNELS).toEqual([]);
      expect(INITIAL_MESSAGES).toEqual([]);
      expect(INITIAL_POSTS).toEqual([]);
      expect(INITIAL_NANOPUBLICATIONS).toEqual([]);
      expect(INITIAL_NODES).toEqual([]);
    });

    it('isolates initial demo fixtures inside dedicated _dev-fixtures.ts file', () => {
      expect(DEV_CHANNELS.length).toBeGreaterThan(0);
      expect(DEV_MESSAGES.length).toBeGreaterThan(0);
      expect(DEV_POSTS.length).toBeGreaterThan(0);
      expect(DEV_NANOPUBLICATIONS.length).toBeGreaterThan(0);
      expect(DEV_NODES.length).toBeGreaterThan(0);
    });
  });

  describe('2. Production API Endpoints Never Return Demo Fixtures', () => {
    it('GET /api/channels returns clean empty array in production when D1 is empty (no bootstrap)', async () => {
      const res = await handleChannelsGet({
        request: new Request('https://aetheris.pages.dev/api/channels'),
        env: prodEnv as any,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.channels).toEqual([]);
      // Must not contain any demo channels like relays-general or vault-releases
      expect(json.channels.some((c: any) => c.id === 'relays-general')).toBe(false);
    });

    it('GET /api/messages returns clean empty array in production when D1 is empty', async () => {
      const res = await handleMessagesGet({
        request: new Request('https://aetheris.pages.dev/api/messages?channelId=all'),
        env: prodEnv as any,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.messages).toEqual([]);
      // Must not contain any demo messages like genesis-core
      expect(json.messages.some((m: any) => m.authorFingerprint === 'genesis-core')).toBe(false);
    });

    it('GET /api/posts returns clean empty array in production when D1 is empty', async () => {
      const res = await handlePostsGet({
        request: new Request('https://aetheris.pages.dev/api/posts?channelId=all'),
        env: prodEnv as any,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.posts).toEqual([]);
      // Must not contain demo posts like post-1 or post-video
      expect(json.posts.some((p: any) => p.id === 'post-1')).toBe(false);
    });

    it('GET /api/nanopublications returns clean empty array in production when D1 is empty', async () => {
      const res = await handleNanopubsGet({
        request: new Request('https://aetheris.pages.dev/api/nanopublications?channelId=all'),
        env: prodEnv as any,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.nanopublications).toEqual([]);
      // Must not contain demo nanopubs like nano-1
      expect(json.nanopublications.some((n: any) => n.id === 'nano-1')).toBe(false);
    });

    it('GET /api/analytics returns zero telemetry nodes in production when D1 is empty', async () => {
      const res = await handleAnalyticsGet({
        request: new Request('https://aetheris.pages.dev/api/analytics'),
        env: prodEnv as any,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.nodes).toEqual([]);
      expect(json.metrics.totalNodes).toBe(0);
      expect(json.metrics.channelsCount).toBe(0);
      expect(json.metrics.postsCount).toBe(0);
      expect(json.metrics.nanopublicationsCount).toBe(0);
      expect(json.metrics.messagesProcessed).toBe(0);
      // Must not contain demo nodes like Genesis Relay Frankfurt
      expect(json.nodes.some((n: any) => n.name.includes('Genesis Relay'))).toBe(false);
    });

    it('GET /api/storage?list=true returns clean empty array in production with empty R2', async () => {
      const res = await handleStorageGet({
        request: new Request('https://aetheris.pages.dev/api/storage?list=true'),
        env: prodEnv as any,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.objects).toEqual([]);
      // Must not return seed storage in production
      expect(json.objects.some((o: any) => o.key.includes('microkernel'))).toBe(false);
    });
  });

  describe('3. Production Custom Data Isolation', () => {
    it('returns only genuine custom rows without demo fixture contamination', async () => {
      const customPost = {
        id: 'post-real-production-999',
        channel_id: 'prod-announcements',
        author_id: 'real-author-fingerprint',
        author_role: 'ADMIN',
        title: 'Real Production Post Title',
        content: 'Authentic production content',
        flair: 'ANNOUNCEMENT',
        status: 'published',
        merit_votes: 5,
        created_at: Date.now(),
      };

      const populatedDb = {
        prepare: () => ({
          bind: () => ({
            all: () => Promise.resolve({ results: [customPost] }),
            first: () => Promise.resolve({ count: 1 }),
          }),
        }),
      };

      const res = await handlePostsGet({
        request: new Request('https://aetheris.pages.dev/api/posts?channelId=all'),
        env: { ENVIRONMENT: 'production', DB: populatedDb } as any,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.posts.length).toBe(1);
      expect(json.posts[0].id).toBe('post-real-production-999');
      expect(json.posts[0].title).toBe('Real Production Post Title');
      // Verify zero demo fixture contamination
      expect(json.posts.some((p: any) => p.id === 'post-1')).toBe(false);
    });
  });
});
