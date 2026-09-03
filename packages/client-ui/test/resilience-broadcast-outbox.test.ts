import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchWithRetry } from '../src/dry-utils.js';
import { offlineSync } from '../src/offline-sync.js';
import { onRequestGet, onRequestPost, resetAdminStores, globalServerConfig } from '../functions/api/admin.js';

describe('Resilience, Broadcast Architecture & Offline Outbox', () => {
  beforeEach(() => {
    resetAdminStores();
    globalServerConfig.broadcastMessage = '';
    globalServerConfig.maintenanceMode = false;
    offlineSync.clearQueue();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. fetchWithRetry Engine', () => {
    it('should return response immediately on successful 200 HTTP response', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      const res = await fetchWithRetry('/api/test', { maxRetries: 3, baseDelayMs: 10 });
      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient 500/502/503 errors and succeed when server recovers', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(new Response('Gateway Error', { status: 502 }))
        .mockResolvedValueOnce(new Response('Service Unavailable', { status: 503 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      const res = await fetchWithRetry('/api/posts', { maxRetries: 3, baseDelayMs: 10 });
      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should fail gracefully and return the error status when max retries are exceeded', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('Internal Error', { status: 500 }));
      vi.stubGlobal('fetch', mockFetch);

      const res = await fetchWithRetry('/api/posts', { maxRetries: 2, baseDelayMs: 5 });
      expect(res.status).toBe(500);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should abort immediately when AbortSignal is cancelled without retrying', async () => {
      const controller = new AbortController();
      controller.abort();

      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      await expect(
        fetchWithRetry('/api/channels', { signal: controller.signal, maxRetries: 3 })
      ).rejects.toThrow();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('2. CRDT Offline Outbox & Reconnection Replay', () => {
    it('should enqueue actions and increment vector clock deterministically', () => {
      const action = offlineSync.enqueue('CREATE_POST', {
        id: 'post-offline-1',
        title: 'Offline Draft',
        content: 'Written while in flight',
      });

      expect(action.status).toBe('pending');
      expect(action.type).toBe('CREATE_POST');
      expect(offlineSync.queue.length).toBe(1);
      expect(offlineSync.getPendingCount()).toBe(1);
    });

    it('should replay queued actions upon syncQueue and drain outbox', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      offlineSync.enqueue('CREATE_POST', { id: 'post-offline-1', title: 'Post A' });
      offlineSync.enqueue('SEND_MESSAGE', { id: 'msg-offline-1', text: 'Hello offline' });

      expect(offlineSync.getPendingCount()).toBe(2);

      const result = await offlineSync.syncQueue();
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
      expect(offlineSync.getPendingCount()).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('3. Edge Admin Emergency Broadcast API', () => {
    it('should serve public server status and broadcast message without requiring admin PIN', async () => {
      globalServerConfig.broadcastMessage = '⚠️ Protocol upgrade scheduled at 00:00 UTC';

      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/admin?public=true', {
        method: 'GET',
      });

      const res = await onRequestGet({ request: req });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.broadcastMessage).toBe('⚠️ Protocol upgrade scheduled at 00:00 UTC');
      expect(res.headers.get('Cache-Control')).toContain('stale-while-revalidate');
    });

    it('should update broadcast message through authenticated POST action', async () => {
      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 11223',
        },
        body: JSON.stringify({
          action: 'update_broadcast',
          message: '🚨 Emergency WAF Alert: DDoS Mitigation Active',
        }),
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.broadcastMessage).toBe('🚨 Emergency WAF Alert: DDoS Mitigation Active');
      expect(globalServerConfig.broadcastMessage).toBe('🚨 Emergency WAF Alert: DDoS Mitigation Active');
    });

    it('should allow clearing the broadcast message', async () => {
      globalServerConfig.broadcastMessage = 'Old broadcast';

      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 11223',
        },
        body: JSON.stringify({
          action: 'update_broadcast',
          message: '',
        }),
      });

      const res = await onRequestPost({ request: req });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.broadcastMessage).toBe('');
      expect(globalServerConfig.broadcastMessage).toBe('');
    });
  });
});
