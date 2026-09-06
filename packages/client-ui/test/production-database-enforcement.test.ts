import { describe, it, expect } from 'vitest';
import { onRequestGet as handlePostsGet, onRequestPost as handlePostsPost } from '../functions/api/posts.js';
import { onRequestGet as handleMessagesGet, onRequestPost as handleMessagesPost } from '../functions/api/messages.js';
import { onRequestGet as handleChannelsGet, onRequestPost as handleChannelsPost } from '../functions/api/channels.js';
import { onRequestGet as handleNanopubsGet, onRequestPost as handleNanopubsPost } from '../functions/api/nanopublications.js';

describe('Production Database Enforcement (Zero In-Memory Fallback in Production)', () => {
  const prodEnvWithoutDb = {
    ENVIRONMENT: 'production',
    ADMIN_PIN: 'test-admin-secret-pin',
  };

  it('rejects GET /api/posts with HTTP 503 in production when D1 is absent', async () => {
    const req = new Request('http://localhost/api/posts?channelId=pulse-global', { method: 'GET' });
    const res = await handlePostsGet({ request: req, env: prodEnvWithoutDb });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('D1 Database unavailable. In-memory fallback is disabled in production.');
  });

  it('rejects POST /api/posts with HTTP 503 in production when D1 is absent', async () => {
    const req = new Request('http://localhost/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-PIN': 'test-admin-secret-pin',
      },
      body: JSON.stringify({
        title: 'Production Test Post',
        content: 'This post must not fallback to memory',
        authorFingerprint: 'genesis-core',
      }),
    });
    const res = await handlePostsPost({ request: req, env: prodEnvWithoutDb });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('D1 Database unavailable');
  });

  it('rejects GET /api/messages with HTTP 503 in production when D1 is absent', async () => {
    const req = new Request('http://localhost/api/messages?channelId=relays-general', { method: 'GET' });
    const res = await handleMessagesGet({ request: req, env: prodEnvWithoutDb });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('D1 Database unavailable');
  });

  it('rejects POST /api/messages with HTTP 503 in production when D1 is absent', async () => {
    const req = new Request('http://localhost/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-PIN': 'test-admin-secret-pin',
      },
      body: JSON.stringify({
        ciphertext: 'ENCRYPTED_PAYLOAD_CIPHERTEXT',
        channelId: 'relays-general',
        authorFingerprint: 'genesis-core',
      }),
    });
    const res = await handleMessagesPost({ request: req, env: prodEnvWithoutDb });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('D1 Database unavailable');
  });

  it('rejects GET /api/channels with HTTP 503 in production when D1 is absent', async () => {
    const req = new Request('http://localhost/api/channels?space=relays', { method: 'GET' });
    const res = await handleChannelsGet({ request: req, env: prodEnvWithoutDb });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('D1 Database unavailable');
  });

  it('rejects POST /api/channels with HTTP 503 in production when D1 is absent', async () => {
    const req = new Request('http://localhost/api/channels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-PIN': 'test-admin-secret-pin',
      },
      body: JSON.stringify({
        space: 'relays',
        name: 'prod-secure-channel',
      }),
    });
    const res = await handleChannelsPost({ request: req, env: prodEnvWithoutDb });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('D1 Database unavailable');
  });

  it('rejects GET /api/nanopublications with HTTP 503 in production when D1 is absent', async () => {
    const req = new Request('http://localhost/api/nanopublications', { method: 'GET' });
    const res = await handleNanopubsGet({ request: req, env: prodEnvWithoutDb });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('D1 Database unavailable');
  });

  it('rejects POST /api/nanopublications with HTTP 503 in production when D1 is absent', async () => {
    const req = new Request('http://localhost/api/nanopublications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-PIN': 'test-admin-secret-pin',
      },
      body: JSON.stringify({
        title: 'Release Binary',
        fileName: 'artifact.bin',
        sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      }),
    });
    const res = await handleNanopubsPost({ request: req, env: prodEnvWithoutDb });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('D1 Database unavailable');
  });

  it('allows in-memory fallback when ENVIRONMENT is development', async () => {
    const devEnv = { ENVIRONMENT: 'development' };
    const req = new Request('http://localhost/api/posts?channelId=pulse-global', { method: 'GET' });
    const res = await handlePostsGet({ request: req, env: devEnv });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.posts)).toBe(true);
  });
});
