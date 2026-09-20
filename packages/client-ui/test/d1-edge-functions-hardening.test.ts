import { describe, it, expect, vi } from 'vitest';
import { onRequestPost, onRequestGet as onPostsGet } from '../functions/api/posts.js';
import { onRequestGet, onRequestDelete as onChannelsDelete } from '../functions/api/channels.js';

describe('D1 Edge Functions Hardening — Batch Atomicity & Error Transparency', () => {
  describe('1. Posts Vote D1 Multi-Write Batch Atomicity', () => {
    it('executes post update and ballot insert in a single atomic db.batch call', async () => {
      const mockBatch = vi.fn().mockResolvedValue([{ success: true }, { success: true }]);
      const mockPrepare = vi.fn((sql: string) => ({
        bind: vi.fn((...args: any[]) => ({
          first: vi.fn().mockResolvedValue({ id: 'p1', merit_votes: 10 }),
          run: vi.fn().mockResolvedValue({ success: true }),
        })),
      }));

      const mockDb = {
        prepare: mockPrepare,
        batch: mockBatch,
      };

      const req = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'sovereign-pin-999' },
        body: JSON.stringify({
          action: 'vote',
          postId: 'p1',
          direction: 1,
          userFingerprint: 'peer-test-voter',
        }),
      });

      const res = await onRequestPost({
        request: req,
        env: { DB: mockDb as any, ENVIRONMENT: 'production', ADMIN_PIN: 'sovereign-pin-999' } as any,
      });

      expect(res.status).toBe(200);
      expect(mockBatch).toHaveBeenCalledTimes(1);
      const batchArgs = mockBatch.mock.calls[0][0];
      expect(batchArgs.length).toBe(2); // updateStmt and ballotStmt
    });

    it('refuses production anonymous ballots before touching D1 when no proof verifier is connected', async () => {
      const mockBatch = vi.fn().mockResolvedValue([{ success: false }, { success: false }]);
      const mockPrepare = vi.fn((sql: string) => ({
        bind: vi.fn((...args: any[]) => ({
          first: vi.fn().mockResolvedValue({ id: 'p1', merit_votes: 10 }),
          run: vi.fn().mockResolvedValue({ success: true }),
        })),
      }));

      const mockDb = {
        prepare: mockPrepare,
        batch: mockBatch,
      };

      const req = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'anonymous-vote',
          postId: 'p1',
          direction: 1,
          nullifier: 'nullifier-0x999',
        }),
      });

      const res = await onRequestPost({
        request: req,
        env: { DB: mockDb as any, ENVIRONMENT: 'production' } as any,
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('proof verifier');
      expect(mockBatch).not.toHaveBeenCalled();
    });
  });

  describe('2. Channels Query Error Transparency & Zero Request-Time Bootstrap', () => {
    it('returns HTTP 500 when D1 channel query throws in production', async () => {
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            all: vi.fn(async () => {
              throw new Error('D1 Disk Read Timeout');
            }),
          })),
        })),
        batch: vi.fn(),
      };

      const req = new Request('https://urefy.com/api/channels?space=relays');
      const res = await onRequestGet({
        request: req,
        env: { DB: mockDb as any, ENVIRONMENT: 'production' } as any,
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Database query failed');
    });

    it('returns clean empty array without demo bootstrap when D1 has 0 channels in production', async () => {
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            all: vi.fn(async () => ({ results: [] })),
          })),
        })),
        batch: vi.fn(),
      };

      const req = new Request('https://urefy.com/api/channels?space=relays');
      const res = await onRequestGet({
        request: req,
        env: { DB: mockDb as any, ENVIRONMENT: 'production' } as any,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.channels).toEqual([]);
    });
  });

  describe('3. D1 Input Sanitization & Parameter Bounds Hardening', () => {
    it('sanitizes NaN limit and negative offset to safe defaults in posts query', async () => {
      let boundParams: any[] = [];
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn((...params: any[]) => {
            boundParams = params;
            return {
              all: vi.fn(async () => ({ results: [] })),
            };
          }),
        })),
      };

      const req = new Request('https://urefy.com/api/posts?limit=invalid_nan&offset=-999&sort=unknown_sort');
      const res = await onPostsGet({
        request: req,
        env: { DB: mockDb as any, ENVIRONMENT: 'production' } as any,
      });

      expect(res.status).toBe(200);
      // limit defaults to 50, offset defaults to 0
      expect(boundParams).toEqual([50, 0]);
    });

    it('rejects vote request with missing or invalid postId with HTTP 400', async () => {
      const req = new Request('https://urefy.com/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-PIN': 'sovereign-pin-999' },
        body: JSON.stringify({
          action: 'vote',
          direction: 1,
        }),
      });

      const res = await onRequestPost({
        request: req,
        env: { DB: {} as any, ENVIRONMENT: 'production', ADMIN_PIN: 'sovereign-pin-999' } as any,
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Valid postId is required');
    });

    it('sanitizes invalid space, NaN limit and clamps max limit in channels query', async () => {
      let boundParams: any[] = [];
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn((...params: any[]) => {
            boundParams = params;
            return {
              all: vi.fn(async () => ({ results: [] })),
            };
          }),
        })),
      };

      const req = new Request('https://urefy.com/api/channels?space=malicious_injected_space&limit=999999&offset=nan');
      const res = await onRequestGet({
        request: req,
        env: { DB: mockDb as any, ENVIRONMENT: 'production' } as any,
      });

      expect(res.status).toBe(200);
      // space defaults to 'all' (so not bound as filter), limit clamped to 100, offset 0
      expect(boundParams).toEqual([100, 0]);
    });

    it('rejects channel deletion with empty channel ID with HTTP 400', async () => {
      const req = new Request('https://urefy.com/api/channels?id=', {
        method: 'DELETE',
        headers: { 'X-Admin-PIN': 'sovereign-pin-999' },
      });

      const res = await onChannelsDelete({
        request: req,
        env: { DB: {} as any, ENVIRONMENT: 'production', ADMIN_PIN: 'sovereign-pin-999' } as any,
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Channel id is required for deletion');
    });
  });
});
