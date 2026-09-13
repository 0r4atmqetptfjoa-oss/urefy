import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onRequestGet as handleHealthGet } from '../functions/api/health.js';
import { onRequestGet as handleMessagesGet, onRequestPost as handleMessagesPost } from '../functions/api/messages.js';
import { onRequestGet as handlePostsGet, onRequestPost as handlePostsPost } from '../functions/api/posts.js';
import { onRequestGet as handleNanopubsGet, onRequestPost as handleNanopubsPost } from '../functions/api/nanopublications.js';
import { onRequestGet as handleChannelsGet, onRequestPost as handleChannelsPost } from '../functions/api/channels.js';
import { onRequestGet as handleAnalyticsGet, onRequestPost as handleAnalyticsPost } from '../functions/api/analytics.js';
import { onRequest as handleMiddleware } from '../functions/api/_middleware.js';
import { onRequest as handleWebSocket } from '../functions/api/ws.js';
import { AetherisClientStore } from '../src/client-state.js';
import { D1Database, KVNamespace, R2Bucket } from '../functions/api/_db.js';

// ─── MOCK CLOUDFLARE BINDINGS GENERATOR ──────────────────────────────────────

function createMockD1(): D1Database {
  const tables: Record<string, any[]> = {
    posts: [],
    messages: [],
    nanopublications: [],
    nodes_telemetry: [],
    votes: [],
    channels: [],
  };

  return {
    prepare(query: string) {
      let boundParams: any[] = [];
      const stmt = {
        bind(...values: any[]) {
          boundParams = values;
          return stmt;
        },
        async first<T = unknown>(colName?: string): Promise<T | null> {
          if (query.includes('COUNT(*)')) {
            if (query.includes('FROM messages')) return { count: tables.messages.length } as T;
            if (query.includes('FROM posts')) return { count: tables.posts.length } as T;
            if (query.includes('FROM nanopublications')) return { count: tables.nanopublications.length } as T;
            if (query.includes('FROM channels')) return { count: tables.channels.length } as T;
          }
          if (query.includes('SELECT * FROM posts WHERE id = ?')) {
            const found = tables.posts.find((p) => p.id === boundParams[0]);
            return (found as T) || null;
          }
          return null;
        },
        async run(): Promise<any> {
          if (query.includes('INSERT OR REPLACE INTO channels')) {
            const row = {
              id: boundParams[0],
              space: boundParams[1],
              name: boundParams[2],
              description: boundParams[3],
              isEncrypted: boundParams[4],
              is_encrypted: boundParams[5] ?? boundParams[4],
              createdAt: boundParams[6],
              created_at: boundParams[7] ?? boundParams[6],
            };
            const idx = tables.channels.findIndex((c) => c.id === row.id);
            if (idx >= 0) tables.channels[idx] = row;
            else tables.channels.push(row);
            return { success: true, meta: {} };
          }

          if (query.includes('INSERT OR REPLACE INTO posts')) {
            const row = {
              id: boundParams[0],
              channelId: boundParams[1],
              channel_id: boundParams[2] ?? boundParams[1],
              authorFingerprint: boundParams[3] ?? boundParams[2],
              author_fingerprint: boundParams[4] ?? boundParams[2],
              authorRole: boundParams[5] ?? boundParams[3],
              author_role: boundParams[6] ?? boundParams[3],
              title: boundParams[7] ?? boundParams[4],
              content: boundParams[8] ?? boundParams[5],
              flair: boundParams[9] ?? boundParams[6],
              meritVotes: boundParams[10] ?? boundParams[7],
              merit_votes: boundParams[11] ?? boundParams[7],
              userVoted: boundParams[12] ?? 0,
              user_voted: boundParams[13] ?? 0,
              replyCount: boundParams[14] ?? boundParams[8] ?? 0,
              reply_count: boundParams[15] ?? boundParams[8] ?? 0,
              boostCount: boundParams[16] ?? boundParams[9] ?? 0,
              boost_count: boundParams[17] ?? boundParams[9] ?? 0,
              attachment_json: boundParams[18] ?? boundParams[10],
              video_json: boundParams[19] ?? boundParams[11],
              images_json: boundParams[20] ?? boundParams[12],
              pollId: boundParams[21] ?? boundParams[13],
              poll_id: boundParams[22] ?? boundParams[13],
              quotedPost_json: boundParams[23] ?? boundParams[14],
              quoted_post_json: boundParams[24] ?? boundParams[14],
              status: boundParams[25] ?? 'published',
              createdAt: boundParams[26] ?? boundParams[15] ?? Date.now(),
              created_at: boundParams[27] ?? boundParams[15] ?? Date.now(),
              isExpanded: boundParams[28] ?? boundParams[16] ?? 0,
              is_expanded: boundParams[29] ?? boundParams[16] ?? 0,
            };
            const idx = tables.posts.findIndex((p) => p.id === row.id);
            if (idx >= 0) tables.posts[idx] = row;
            else tables.posts.push(row);
            return { success: true, meta: {} };
          }

          if (query.includes('UPDATE posts SET meritVotes') || query.includes('UPDATE posts SET merit_votes')) {
            const post = tables.posts.find((p) => p.id === boundParams[boundParams.length - 1]);
            if (post) {
              const delta = boundParams[0];
              post.meritVotes = (post.meritVotes || 0) + delta;
              post.merit_votes = (post.merit_votes || 0) + delta;
            }
            return { success: true, meta: {} };
          }

          if (query.includes('UPDATE posts SET boostCount') || query.includes('UPDATE posts SET boost_count')) {
            const post = tables.posts.find((p) => p.id === boundParams[boundParams.length - 1]);
            if (post) {
              post.boostCount = (post.boostCount || 0) + 1;
              post.boost_count = (post.boost_count || 0) + 1;
            }
            return { success: true, meta: {} };
          }

          if (query.includes('INSERT INTO messages') || query.includes('INSERT OR IGNORE INTO messages')) {
            const isCanonical = query.includes('author_id');
            const isExtended = boundParams.length >= 12;
            const row = isCanonical
              ? {
                  id: boundParams[0],
                  channel_id: boundParams[1],
                  channelId: boundParams[1],
                  author_id: boundParams[2],
                  authorFingerprint: boundParams[2],
                  ciphertext: boundParams[3],
                  text: boundParams[3],
                  nonce: boundParams[4],
                  epoch: boundParams[5],
                  status: boundParams[6],
                  signature: boundParams[7],
                  created_at: boundParams[8],
                  createdAt: boundParams[8],
                }
              : {
                  id: boundParams[0],
                  channelId: boundParams[1],
                  channel_id: isExtended ? boundParams[2] : boundParams[1],
                  authorFingerprint: isExtended ? boundParams[3] : boundParams[2],
                  author_fingerprint: isExtended ? boundParams[4] : boundParams[2],
                  text: isExtended ? boundParams[5] : boundParams[3],
                  ciphertext: isExtended ? boundParams[6] : boundParams[4] || boundParams[3],
                  epoch: isExtended ? boundParams[7] : boundParams[5],
                  status: isExtended ? boundParams[8] : boundParams[6],
                  signature: isExtended ? boundParams[9] : boundParams[7],
                  createdAt: isExtended ? boundParams[10] : boundParams[8],
                  created_at: isExtended ? boundParams[11] : boundParams[8],
                };
            tables.messages.push(row);
            return { success: true, meta: {} };
          }

          if (query.includes('INSERT OR REPLACE INTO nanopublications')) {
            const row = {
              id: boundParams[0],
              channelId: boundParams[1],
              channel_id: boundParams[2] ?? boundParams[1],
              title: boundParams[3] ?? boundParams[2],
              fileName: boundParams[4] ?? boundParams[3],
              file_name: boundParams[5] ?? boundParams[3],
              byteSize: boundParams[6] ?? boundParams[4],
              byte_size: boundParams[7] ?? boundParams[4],
              sha256: boundParams[8] ?? boundParams[5],
              crc32: boundParams[9] ?? boundParams[6],
              entropy: boundParams[10] ?? boundParams[7],
              verdict: boundParams[11] ?? boundParams[8],
              merkleRoot: boundParams[12] ?? boundParams[9],
              merkle_root: boundParams[13] ?? boundParams[9],
              seederCount: boundParams[14] ?? boundParams[10],
              seeder_count: boundParams[15] ?? boundParams[10],
              r2Key: boundParams[16] ?? boundParams[11],
              r2_key: boundParams[17] ?? boundParams[11],
              createdAt: boundParams[18] ?? boundParams[12],
              created_at: boundParams[19] ?? boundParams[12],
            };
            tables.nanopublications.push(row);
            return { success: true, meta: {} };
          }

          if (query.includes('INSERT OR REPLACE INTO nodes_telemetry')) {
            const row = {
              id: boundParams[0],
              nodeId: boundParams[1],
              node_id: boundParams[2] ?? boundParams[1],
              name: boundParams[3] ?? boundParams[2],
              role: boundParams[4] ?? boundParams[3],
              status: boundParams[5] ?? boundParams[4],
              latencyMs: boundParams[6] ?? boundParams[5],
              latency_ms: boundParams[7] ?? boundParams[5],
              meritScore: boundParams[8] ?? boundParams[6],
              merit_score: boundParams[9] ?? boundParams[6],
              region: boundParams[10] ?? boundParams[7],
              countryCode: boundParams[11] ?? boundParams[8],
              country_code: boundParams[12] ?? boundParams[8],
              uptime: boundParams[13] ?? boundParams[9],
              bandwidthMbps: boundParams[14] ?? boundParams[10],
              bandwidth_mbps: boundParams[15] ?? boundParams[10],
              messagesProcessed: boundParams[16] ?? boundParams[11],
              messages_processed: boundParams[17] ?? boundParams[11],
              zkRlnEpoch: boundParams[18] ?? boundParams[12],
              zk_rln_epoch: boundParams[19] ?? boundParams[12],
              connections_json: boundParams[20] ?? boundParams[13],
              lastHeartbeat: boundParams[21] ?? boundParams[14],
              last_heartbeat: boundParams[22] ?? boundParams[14],
            };
            const idx = tables.nodes_telemetry.findIndex((n) => n.node_id === row.node_id || n.nodeId === row.nodeId);
            if (idx >= 0) tables.nodes_telemetry[idx] = row;
            else tables.nodes_telemetry.push(row);
            return { success: true, meta: {} };
          }

          return { success: true, meta: {} };
        },
        async all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: any }> {
          if (query.includes('FROM channels')) {
            let res = [...tables.channels];
            if (boundParams.length > 0 && typeof boundParams[0] === 'string' && boundParams[0] !== 'all') {
              res = res.filter((c) => c.space === boundParams[0]);
            }
            return { results: res as unknown as T[], success: true, meta: {} };
          }
          if (query.includes('FROM posts')) {
            let res = [...tables.posts];
            if (boundParams.length > 0 && typeof boundParams[0] === 'string' && boundParams[0] !== 'all') {
              res = res.filter((p) => p.channel_id === boundParams[0] || p.channelId === boundParams[0]);
            }
            return { results: res as unknown as T[], success: true, meta: {} };
          }
          if (query.includes('FROM messages')) {
            let res = [...tables.messages];
            if (boundParams.length > 0 && typeof boundParams[0] === 'string' && boundParams[0] !== 'all') {
              res = res.filter((m) => m.channel_id === boundParams[0] || m.channelId === boundParams[0]);
            }
            return { results: res as unknown as T[], success: true, meta: {} };
          }
          if (query.includes('FROM nanopublications')) {
            return { results: tables.nanopublications as unknown as T[], success: true, meta: {} };
          }
          if (query.includes('FROM nodes_telemetry')) {
            return { results: tables.nodes_telemetry as unknown as T[], success: true, meta: {} };
          }
          return { results: [], success: true, meta: {} };
        },
        async raw() {
          return [];
        },
      };
      return stmt as any;
    },
    async batch(statements: any[]) {
      return [];
    },
    async exec(query: string) {
      return { count: 0, duration: 0 };
    },
  };
}

function createMockKV(): KVNamespace {
  const store = new Map<string, any>();
  return {
    async get(key: string, type?: any) {
      const val = store.get(key);
      if (!val) return null;
      if (type === 'json') return typeof val === 'string' ? JSON.parse(val) : val;
      return val;
    },
    async put(key: string, value: any) {
      store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list() {
      return { keys: Array.from(store.keys()).map((k) => ({ name: k })), list_complete: true };
    },
  };
}

function createMockR2(): R2Bucket {
  const objects = new Map<string, { data: Uint8Array; metadata: any }>();
  return {
    async head(key: string) {
      const obj = objects.get(key);
      if (!obj) return null;
      return {
        key,
        version: '1',
        size: obj.data.byteLength,
        etag: 'mock-etag',
        httpEtag: '"mock-etag"',
        checksums: {},
        uploaded: new Date(),
        customMetadata: obj.metadata,
      };
    },
    async get(key: string) {
      const obj = objects.get(key);
      if (!obj) return null;
      return {
        key,
        version: '1',
        size: obj.data.byteLength,
        etag: 'mock-etag',
        httpEtag: '"mock-etag"',
        checksums: {},
        uploaded: new Date(),
        customMetadata: obj.metadata,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(obj.data);
            controller.close();
          },
        }),
        bodyUsed: false,
        async arrayBuffer() {
          return obj.data.buffer;
        },
        async text() {
          return new TextDecoder().decode(obj.data);
        },
        async json<T>() {
          return JSON.parse(new TextDecoder().decode(obj.data)) as T;
        },
        async blob() {
          return new Blob([obj.data]);
        },
      } as any;
    },
    async put(key: string, value: any, options?: any) {
      const data = value instanceof Uint8Array ? value : new TextEncoder().encode(String(value));
      objects.set(key, { data, metadata: options?.customMetadata || {} });
      return {
        key,
        version: '1',
        size: data.byteLength,
        etag: 'mock-etag',
        httpEtag: '"mock-etag"',
        checksums: {},
        uploaded: new Date(),
      };
    },
    async delete(keys: string | string[]) {
      const arr = Array.isArray(keys) ? keys : [keys];
      for (const k of arr) objects.delete(k);
    },
    async list() {
      return { objects: [], truncated: false };
    },
  };
}

describe('Cloudflare Pages Functions - Full-Stack Edge Backend & D1/KV/R2 Bindings', () => {
  describe('1. Security & CORS Middleware (_middleware.ts)', () => {
    it('should handle OPTIONS preflight with 204 status and CORS headers', async () => {
      const req = new Request('https://urefy.com/api/health', { method: 'OPTIONS' });
      const res = await handleMiddleware({
        request: req,
        functionPath: '/api/health',
        waitUntil: () => {},
        next: async () => new Response('ok'),
        env: {},
        params: {},
        data: {},
      });

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('should attach CORS and security headers to standard downstream responses', async () => {
      const req = new Request('https://urefy.com/api/health', { method: 'GET' });
      const res = await handleMiddleware({
        request: req,
        functionPath: '/api/health',
        waitUntil: () => {},
        next: async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
        env: {},
        params: {},
        data: {},
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  describe('2. Health & Edge Diagnostics Endpoint (health.ts)', () => {
    it('should return 200 with online status, protocol, and Cloudflare edge info', async () => {
      const req = new Request('https://urefy.com/api/health');
      (req as any).cf = {
        colo: 'OTP',
        country: 'RO',
        city: 'Bucharest',
        region: 'Bucuresti',
        httpProtocol: 'HTTP/3',
      };

      const res = await handleHealthGet({ request: req, env: {} });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe('online');
      expect(json.protocol).toBe('URE-Relay-v2.0.0');
      expect(json.edge.colo).toBe('OTP');
      expect(json.edge.country).toBe('RO');
      expect(json.meshActive).toBe(true);
    });
  });

  describe('3. E2EE Messages Edge Store (messages.ts)', () => {
    it('should return seeded messages on GET /api/messages with in-memory fallback', async () => {
      const req = new Request('https://urefy.com/api/messages?channelId=relays-general');
      const res = await handleMessagesGet({ request: req });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.channelId).toBe('relays-general');
      expect(Array.isArray(json.messages)).toBe(true);
      expect(json.messages.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter messages with since timestamp', async () => {
      const futureTime = Date.now() + 1000000;
      const req = new Request(`https://urefy.com/api/messages?channelId=relays-general&since=${futureTime}`);
      const res = await handleMessagesGet({ request: req });
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.messages.length).toBe(0);
    });

    it('should accept and store a new message on POST /api/messages', async () => {
      const payload = {
        channelId: 'relays-general',
        authorFingerprint: 'tester-node-1',
        ciphertext: 'Live E2EE sovereign transmission test',
        epoch: '#999',
        signature: 'deadbeef0123',
      };

      const req = new Request('https://urefy.com/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-PIN': '11223',
        },
        body: JSON.stringify(payload),
      });

      const res = await handleMessagesPost({ request: req });
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message.text).toBe('Live E2EE sovereign transmission test');
      expect(json.message.authorFingerprint).toBe('tester-node-1');
      expect(json.message.id).toBeDefined();

      // Verify retrieval on GET
      const getReq = new Request('https://urefy.com/api/messages?channelId=relays-general');
      const getRes = await handleMessagesGet({ request: getReq });
      const getJson = await getRes.json();
      const found = getJson.messages.find((m: any) => m.id === json.message.id);
      expect(found).toBeDefined();
    });

    it('should operate with Cloudflare D1 Database binding when provided', async () => {
      const mockD1 = createMockD1();
      const mockKV = createMockKV();

      const postReq = new Request('https://urefy.com/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-PIN': '11223',
        },
        body: JSON.stringify({
          channelId: 'relays-dev',
          authorFingerprint: 'd1-tester',
          ciphertext: 'D1 backed E2EE packet',
        }),
      });

      const postRes = await handleMessagesPost({ request: postReq, env: { DB: mockD1, KV: mockKV } });
      expect(postRes.status).toBe(201);
      const postJson = await postRes.json();
      expect(postJson.success).toBe(true);

      const getReq = new Request('https://urefy.com/api/messages?channelId=relays-dev');
      const getRes = await handleMessagesGet({ request: getReq, env: { DB: mockD1 } });
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);
      expect(getJson.messages.some((m: any) => m.text === 'D1 backed E2EE packet')).toBe(true);
    });

    it('should reject empty message text with 400 status', async () => {
      const req = new Request('https://urefy.com/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '   ' }),
      });

      const res = await handleMessagesPost({ request: req });
      expect(res.status).toBe(400);
    });
  });

  describe('4. Posts & Chronostream Edge API (posts.ts)', () => {
    it('should return initial seed posts on GET /api/posts', async () => {
      const req = new Request('https://urefy.com/api/posts?sort=hot');
      const res = await handlePostsGet({ request: req });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.posts.length).toBeGreaterThanOrEqual(5);
    });

    it('should support sort modes: hot, new, top', async () => {
      const reqNew = new Request('https://urefy.com/api/posts?sort=new');
      const resNew = await handlePostsGet({ request: reqNew });
      const jsonNew = await resNew.json();
      expect(jsonNew.posts[0].createdAt).toBeGreaterThanOrEqual(jsonNew.posts[jsonNew.posts.length - 1].createdAt);

      const reqTop = new Request('https://urefy.com/api/posts?sort=top');
      const resTop = await handlePostsGet({ request: reqTop });
      const jsonTop = await resTop.json();
      expect(jsonTop.posts[0].meritVotes).toBeGreaterThanOrEqual(jsonTop.posts[jsonTop.posts.length - 1].meritVotes);
    });

    it('should create a new post on POST /api/posts', async () => {
      const postPayload = {
        action: 'create',
        title: 'Decentralized Edge Computing Milestone',
        content: 'Functions running on Cloudflare Pages globally distributed.',
        channelId: 'pulse-global',
        flair: 'TECH DISCUSSION',
      };

      const req = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-PIN': '11223',
        },
        body: JSON.stringify(postPayload),
      });

      const res = await handlePostsPost({ request: req });
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.post.title).toBe('Decentralized Edge Computing Milestone');
      expect(json.post.meritVotes).toBe(1);
    });

    it('should handle voting on a post via action=vote', async () => {
      const votePayload = {
        action: 'vote',
        postId: 'post-1',
        direction: 1,
      };

      const req = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-PIN': '11223',
        },
        body: JSON.stringify(votePayload),
      });

      const res = await handlePostsPost({ request: req });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.post.id).toBe('post-1');
      expect(json.post.meritVotes).toBeGreaterThan(342);
    });

    it('should handle boosting a post via action=boost', async () => {
      const boostPayload = {
        action: 'boost',
        postId: 'post-1',
      };

      const req = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-PIN': '11223',
        },
        body: JSON.stringify(boostPayload),
      });

      const res = await handlePostsPost({ request: req });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.post.boostCount).toBeGreaterThan(89);
    });

    it('should store and query posts in Cloudflare D1 and cache in KV', async () => {
      const mockD1 = createMockD1();
      const mockKV = createMockKV();

      const postReq = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-PIN': '11223',
        },
        body: JSON.stringify({
          id: 'post-d1-test',
          channelId: 'vault-releases',
          title: 'D1 Persistent Release',
          content: 'Verified D1 storage insertion',
          flair: 'VERIFIED RELEASE',
          meritVotes: 50,
        }),
      });

      const postRes = await handlePostsPost({ request: postReq, env: { DB: mockD1, KV: mockKV } });
      expect(postRes.status).toBe(201);

      // Verify D1 GET query
      const getReq = new Request('https://urefy.com/api/posts?channelId=vault-releases&sort=hot');
      const getRes = await handlePostsGet({ request: getReq, env: { DB: mockD1, KV: mockKV } });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.posts.some((p: any) => p.id === 'post-d1-test')).toBe(true);
    });
  });

  describe('5. Nanopublications & Artifacts API (nanopublications.ts)', () => {
    it('should list initial seed nanopublications on GET /api/nanopublications', async () => {
      const req = new Request('https://urefy.com/api/nanopublications?channelId=vault-releases');
      const res = await handleNanopubsGet({ request: req });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.nanopublications)).toBe(true);
      expect(json.nanopublications.length).toBeGreaterThanOrEqual(2);
      expect(json.nanopublications[0].sha256).toBeDefined();
      expect(json.nanopublications[0].verdict).toBe('CLEAN');
    });

    it('should filter nanopublications by sha256 checksum', async () => {
      const targetSha = 'a11fe18f963518803fbebdaebf4d408609e3a323c70194b3b507d47a392a2496';
      const req = new Request(`https://urefy.com/api/nanopublications?sha256=${targetSha}`);
      const res = await handleNanopubsGet({ request: req });
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.nanopublications.length).toBe(1);
      expect(json.nanopublications[0].fileName).toBe('aetheris-microkernel-x86_64.bin');
    });

    it('should publish a new verified nanopublication on POST /api/nanopublications', async () => {
      const payload = {
        title: 'Kyber-1024 Post-Quantum Test Binary',
        fileName: 'kyber1024-pq-validator.bin',
        byteSize: 65536,
        sha256: '9999999999999999999999999999999999999999999999999999999999999999',
        crc32: 'A1B2C3D4',
        entropy: 7.12,
        verdict: 'CLEAN',
        merkleRoot: 'ffffffffffffffffffffffffffffffff',
        channelId: 'vault-releases',
      };

      const req = new Request('https://urefy.com/api/nanopublications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-PIN': '11223',
        },
        body: JSON.stringify(payload),
      });

      const res = await handleNanopubsPost({ request: req });
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.nanopublication.fileName).toBe('kyber1024-pq-validator.bin');
      expect(json.nanopublication.entropy).toBe(7.12);
    });

    it('should handle Cloudflare R2 object download streaming when requested', async () => {
      const mockR2 = createMockR2();
      await mockR2.put('releases/test-binary.bin', new Uint8Array([0x7f, 0x45, 0x4c, 0x46]));

      const req = new Request('https://urefy.com/api/nanopublications?download=releases/test-binary.bin');
      const res = await handleNanopubsGet({ request: req, env: { R2: mockR2 } });
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Disposition')).toContain('test-binary.bin');

      const buf = await res.arrayBuffer();
      expect(buf.byteLength).toBe(4);
    });

    it('should validate missing mandatory fields on POST', async () => {
      const req = new Request('https://urefy.com/api/nanopublications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Missing Hash' }),
      });

      const res = await handleNanopubsPost({ request: req });
      expect(res.status).toBe(400);
    });
  });

  describe('6. Telemetry & Mesh Analytics API (analytics.ts)', () => {
    it('should return aggregated real-time mesh statistics on GET /api/analytics', async () => {
      const req = new Request('https://urefy.com/api/analytics');
      (req as any).cf = {
        colo: 'OTP',
        country: 'RO',
        city: 'Bucharest',
      };

      const res = await handleAnalyticsGet({ request: req, env: {} });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe('healthy');
      expect(json.protocol).toBe('URE-Relay-v2.0.0');
      expect(json.metrics.totalNodes).toBeGreaterThanOrEqual(4);
      expect(json.metrics.activeNodes).toBeGreaterThanOrEqual(4);
      expect(json.metrics.messagesProcessed).toBeGreaterThan(1000);
      expect(json.metrics.avgLatencyMs).toBeGreaterThan(0);
      expect(json.edge.colo).toBe('OTP');
      expect(Array.isArray(json.nodes)).toBe(true);
    });

    it('should accept telemetry heartbeat updates from mesh nodes on POST /api/analytics', async () => {
      const heartbeat = {
        nodeId: 'node-genesis-fra',
        name: 'Genesis Relay Frankfurt (Updated)',
        role: 'validator',
        status: 'active',
        latencyMs: 9.5,
        meritScore: 995,
        uptime: 99.99,
        bandwidthMbps: 1200,
        messagesProcessed: 150000,
        zkRlnEpoch: 413,
      };

      const req = new Request('https://urefy.com/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-PIN': '11223',
        },
        body: JSON.stringify(heartbeat),
      });

      const res = await handleAnalyticsPost({ request: req });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.telemetry.nodeId).toBe('node-genesis-fra');
      expect(json.telemetry.latencyMs).toBe(9.5);
      expect(json.telemetry.meritScore).toBe(995);
    });

    it('should reject invalid telemetry payload missing nodeId', async () => {
      const req = new Request('https://urefy.com/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Node Without ID' }),
      });

      const res = await handleAnalyticsPost({ request: req });
      expect(res.status).toBe(400);
    });
  });

  describe('7. WebSocket Signaling Endpoint (ws.ts)', () => {
    it('should return 426 Upgrade Required for standard HTTP requests to /api/ws', async () => {
      const req = new Request('https://urefy.com/api/ws', { method: 'GET' });
      const res = await handleWebSocket({ request: req });
      expect(res.status).toBe(426);

      const json = await res.json();
      expect(json.service).toBe('UREfy WebSocket Signaling Edge');
      expect(json.transport).toBe('WebSocket');
    });
  });

  describe('8. Client Store Edge Integration (client-state.ts)', () => {
    it('should initialize store, sync from Edge, and support post creation & message sending', async () => {
      const store = new AetherisClientStore();
      expect(store.keypair.fingerprint).toBeDefined();
      expect(store.posts.length).toBeGreaterThan(0);
      expect(store.messages.get('relays-general')?.length).toBeGreaterThan(0);

      const newPost = store.createPost({
        title: 'Test Sovereign Broadcast',
        content: 'Broadcast test payload',
      });
      expect(newPost.id).toBeDefined();
      expect(store.posts[0].id).toBe(newPost.id);
      expect(store.posts[0].userVoted).toBe(1);

      // Voting again clears merit vote
      store.votePost(newPost.id, 1);
      expect(store.posts[0].userVoted).toBe(0);

      // Voting 1 again sets it to 1
      store.votePost(newPost.id, 1);
      expect(store.posts[0].userVoted).toBe(1);

      store.boostPost(newPost.id);
      expect(store.posts[0].boostCount).toBe(1);

      store.sendMessage('Hello sovereign edge matrix!');
      const msgs = store.messages.get(store.activeChannelId);
      expect(msgs?.some((m) => m.text === 'Hello sovereign edge matrix!')).toBe(true);

      store.destroy();
    });
  });

  describe('9. Sovereign Channels Edge API (channels.ts)', () => {
    it('should list initial seeded channels on GET /api/channels', async () => {
      const req = new Request('https://urefy.com/api/channels');
      const res = await handleChannelsGet({ request: req });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.channels)).toBe(true);
      expect(json.channels.length).toBeGreaterThanOrEqual(5);
      expect(json.channels.some((c: any) => c.id === 'relays-general')).toBe(true);
    });

    it('should filter channels by space (e.g. vault, relays, pulse)', async () => {
      const req = new Request('https://urefy.com/api/channels?space=vault');
      const res = await handleChannelsGet({ request: req });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.channels.every((c: any) => c.space === 'vault')).toBe(true);
      expect(json.channels.some((c: any) => c.id === 'vault-releases')).toBe(true);
    });

    it('should create a new sovereign channel on POST /api/channels', async () => {
      const payload = {
        name: 'crypto-research',
        space: 'vault',
        description: 'Zero-knowledge proofs and advanced cryptanalysis',
        isEncrypted: false,
      };

      const req = new Request('https://urefy.com/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': '11223' },
        body: JSON.stringify(payload),
      });

      const res = await handleChannelsPost({ request: req });
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.channel.name).toBe('crypto-research');
      expect(json.channel.space).toBe('vault');
      expect(json.channel.id).toBe('vault-crypto-research');
    });

    it('should persist and query channels with Cloudflare D1 and KV cache', async () => {
      const mockD1 = createMockD1();
      const mockKV = createMockKV();

      const postReq = new Request('https://urefy.com/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': '11223' },
        body: JSON.stringify({
          name: 'quantum-mesh',
          space: 'relays',
          description: 'PQC mesh networking relay channel',
          isEncrypted: true,
        }),
      });

      const postRes = await handleChannelsPost({ request: postReq, env: { DB: mockD1, KV: mockKV } });
      expect(postRes.status).toBe(201);

      const getReq = new Request('https://urefy.com/api/channels?space=relays');
      const getRes = await handleChannelsGet({ request: getReq, env: { DB: mockD1, KV: mockKV } });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.channels.some((c: any) => c.name === 'quantum-mesh')).toBe(true);
    });

    it('should reject invalid channel payload without name or with invalid space', async () => {
      const reqNoName = new Request('https://urefy.com/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ space: 'relays' }),
      });
      const resNoName = await handleChannelsPost({ request: reqNoName });
      expect(resNoName.status).toBe(400);

      const reqBadSpace = new Request('https://urefy.com/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test', space: 'invalid-space' }),
      });
      const resBadSpace = await handleChannelsPost({ request: reqBadSpace });
      expect(resBadSpace.status).toBe(400);
    });
  });
});
