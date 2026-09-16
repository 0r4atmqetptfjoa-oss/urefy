import { describe, expect, it } from 'vitest';
import { onRequestGet, onRequestPost } from '../functions/api/admin.js';

const env = { ENVIRONMENT: 'production', ADMIN_PIN: 'test-only-pin-84721' };

describe('admin passkeys fail closed without origin and durable storage', () => {
  for (const action of ['passkey-verify', 'passkey-challenge', 'passkey-register']) {
    it(`rejects ${action} without issuing credentials`, async () => {
      const response = await onRequestPost({ env, request: new Request('https://urefy.com/api/admin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, credentialId: 'attacker-controlled-id', publicKey: 'unverified-key' }),
      }) });
      expect(response.status).toBe(403);
      const data = await response.json() as Record<string, unknown>;
      expect(data.authorized).toBe(false);
      expect(data.token).toBeUndefined();
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });
  }
  it('retains PIN login and valid signed session authorization', async () => {
    const login = await onRequestPost({ env, request: new Request('https://urefy.com/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify-pin', pin: env.ADMIN_PIN }),
    }) });
    expect(login.status).toBe(200);
    const { token } = await login.json() as { token: string };
    expect(token).toBeTruthy();
    const authenticated = await onRequestGet({ env, request: new Request('https://urefy.com/api/admin', { headers: { Authorization: `Bearer ${token}` } }) });
    expect(authenticated.status).toBe(200);
  });
});
