import { describe, it, expect, vi } from 'vitest';
import { onRequestPost } from '../functions/api/posts.js';
import { onRequestGet } from '../functions/api/channels.js';

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

      const req = new Request('https://aetheris.network/api/posts', {
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

    it('executes anonymous-vote in a single atomic db.batch call and handles failure', async () => {
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

      const req = new Request('https://aetheris.network/api/posts', {
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

      // When batch fails in production, returns HTTP 500
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('atomic ballot transaction failed');
    });
  });

  describe('2. Channels Bootstrap Error Transparency', () => {
    it('returns HTTP 500 when D1 channel bootstrap fails in production instead of empty array', async () => {
      let queryCount = 0;
      const mockDb = {
        prepare: vi.fn((sql: string) => ({
          bind: vi.fn((...args: any[]) => ({
            all: vi.fn(async () => {
              queryCount++;
              if (queryCount === 1) {
                // Initial check: 0 results
                return { results: [] };
              }
              // Second check after insert: throws error
              throw new Error('D1 Disk Write Timeout during bootstrap');
            }),
            run: vi.fn(async () => {
              throw new Error('D1 Disk Write Timeout during bootstrap');
            }),
          })),
        })),
        batch: vi.fn(),
      };

      const req = new Request('https://aetheris.network/api/channels?space=relays');
      const res = await onRequestGet({
        request: req,
        env: { DB: mockDb as any, ENVIRONMENT: 'production' } as any,
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Database channel bootstrap failed');
    });
  });
});
