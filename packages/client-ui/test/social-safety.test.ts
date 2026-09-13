import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SocialSafetyEngine, socialSafety, type SocialReportInput } from '../src/social-safety.js';

describe('Social Safety Engine', () => {
  let engine: SocialSafetyEngine;
  let mockStorage: Map<string, string>;
  let listeners: Map<string, Function[]>;

  beforeEach(() => {
    mockStorage = new Map();
    listeners = new Map();

    const storageMock = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, val: string) => mockStorage.set(key, String(val)),
      removeItem: (key: string) => mockStorage.delete(key),
      clear: () => mockStorage.clear(),
    };

    (globalThis as any).localStorage = storageMock;
    (globalThis as any).window = {
      localStorage: storageMock,
      dispatchEvent: (event: any) => {
        const fns = listeners.get(event.type) || [];
        for (const fn of fns) fn(event);
        return true;
      },
      addEventListener: (type: string, fn: Function) => {
        const list = listeners.get(type) || [];
        list.push(fn);
        listeners.set(type, list);
      },
      removeEventListener: (type: string, fn: Function) => {
        const list = listeners.get(type) || [];
        listeners.set(type, list.filter(f => f !== fn));
      },
    };

    engine = new SocialSafetyEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. should initialize with empty blocked and muted sets by default', () => {
    expect(engine.getBlockedUsers()).toEqual([]);
    expect(engine.getMutedUsers()).toEqual([]);
    expect(engine.isBlocked('user-1')).toBe(false);
    expect(engine.isMuted('user-1')).toBe(false);
  });

  it('2. should support blocking and unblocking users with state and events', async () => {
    const events: Array<{ type: string; detail: any }> = [];
    const blockHandler = (e: any) => events.push({ type: e.type, detail: e.detail });
    const eventTarget = typeof window !== 'undefined' ? window : globalThis;
    eventTarget.addEventListener('aetheris:social:blocked', blockHandler);
    eventTarget.addEventListener('aetheris:social:unblocked', blockHandler);

    // Mock fetch for /api/blocks
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    await engine.blockUser('bad-actor-01');
    expect(engine.isBlocked('bad-actor-01')).toBe(true);
    expect(engine.getBlockedUsers()).toContain('bad-actor-01');
    expect(events.some(e => e.type === 'aetheris:social:blocked' && e.detail.userId === 'bad-actor-01')).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith('/api/blocks', expect.objectContaining({ method: 'POST' }));

    // Unblock
    const unblocked = await engine.unblockUser('bad-actor-01');
    expect(unblocked).toBe(true);
    expect(engine.isBlocked('bad-actor-01')).toBe(false);
    expect(events.some(e => e.type === 'aetheris:social:unblocked' && e.detail.userId === 'bad-actor-01')).toBe(true);

    eventTarget.removeEventListener('aetheris:social:blocked', blockHandler);
    eventTarget.removeEventListener('aetheris:social:unblocked', blockHandler);
  });

  it('3. should support muting and unmuting users with state and events', async () => {
    const events: Array<{ type: string; detail: any }> = [];
    const muteHandler = (e: any) => events.push({ type: e.type, detail: e.detail });
    const eventTarget = typeof window !== 'undefined' ? window : globalThis;
    eventTarget.addEventListener('aetheris:social:muted', muteHandler);
    eventTarget.addEventListener('aetheris:social:unmuted', muteHandler);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    await engine.muteUser('noisy-user-42');
    expect(engine.isMuted('noisy-user-42')).toBe(true);
    expect(engine.getMutedUsers()).toContain('noisy-user-42');
    expect(events.some(e => e.type === 'aetheris:social:muted' && e.detail.userId === 'noisy-user-42')).toBe(true);

    const unmuted = await engine.unmuteUser('noisy-user-42');
    expect(unmuted).toBe(true);
    expect(engine.isMuted('noisy-user-42')).toBe(false);
    expect(events.some(e => e.type === 'aetheris:social:unmuted' && e.detail.userId === 'noisy-user-42')).toBe(true);

    eventTarget.removeEventListener('aetheris:social:muted', muteHandler);
    eventTarget.removeEventListener('aetheris:social:unmuted', muteHandler);
  });

  it('4. should persist blocked and muted users across engine re-instantiation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    await engine.blockUser('persisted-block-1');
    await engine.muteUser('persisted-mute-1');

    // Create a new instance reading from the same localStorage
    const newEngine = new SocialSafetyEngine();
    expect(newEngine.isBlocked('persisted-block-1')).toBe(true);
    expect(newEngine.isMuted('persisted-mute-1')).toBe(true);
  });

  it('5. should submit content reports to moderation endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const report: SocialReportInput = {
      targetType: 'post',
      targetId: 'post-violating-terms',
      reasonCategory: 'harassment',
      details: 'Repeated targeted harassment in replies',
      communityId: 'privacy-hub',
    };

    const success = await engine.reportContent(report);
    expect(success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith('/api/moderation', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('post-violating-terms'),
    }));
  });

  it('6. should sync safety lists from edge API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      blockedUsers: ['edge-blocked-1', 'edge-blocked-2'],
      mutedUsers: ['edge-muted-1'],
    }), { status: 200 }));

    await engine.syncSafetyLists();
    expect(engine.isBlocked('edge-blocked-1')).toBe(true);
    expect(engine.isBlocked('edge-blocked-2')).toBe(true);
    expect(engine.isMuted('edge-muted-1')).toBe(true);
  });

  it('7. should clear all safety entries on clearAll()', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await engine.blockUser('temp-blocked');
    await engine.muteUser('temp-muted');

    engine.clearAll();
    expect(engine.getBlockedUsers()).toEqual([]);
    expect(engine.getMutedUsers()).toEqual([]);
  });
});
