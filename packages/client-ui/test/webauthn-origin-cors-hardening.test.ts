import { describe, it, expect, beforeEach } from 'vitest';
import {
  onRequest,
  resetWebAuthnMemoryStore,
  getAllowedWebAuthnOrigins,
} from '../functions/api/webauthn.js';

describe('WebAuthn Exact Origin & Allowlisted CORS Hardening', () => {
  beforeEach(() => {
    resetWebAuthnMemoryStore();
  });

  const prodEnv: any = {
    ENVIRONMENT: 'production',
    WEBAUTHN_ALLOWED_ORIGINS: 'https://aetheris-omni-sphere.pages.dev,https://custom.sovereign.mesh',
  };

  const devEnv: any = {
    ENVIRONMENT: 'development',
  };

  async function getChallenge(fingerprint: string, env: any = devEnv): Promise<string> {
    const req = new Request(`https://aetheris-omni-sphere.pages.dev/api/webauthn?action=challenge&fingerprint=${fingerprint}`);
    const res = await onRequest({ request: req, env });
    const json = await res.json();
    return json.challenge;
  }

  async function getValidP256Jwk(): Promise<JsonWebKey> {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );
    return await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  }

  describe('1. Exact Origin Allowlist Resolution', () => {
    it('resolves only configured origins in production', () => {
      const allowed = getAllowedWebAuthnOrigins(prodEnv);
      expect(allowed.has('https://aetheris-omni-sphere.pages.dev')).toBe(true);
      expect(allowed.has('https://custom.sovereign.mesh')).toBe(true);
      expect(allowed.has('http://localhost:3000')).toBe(false);
      expect(allowed.has('http://localhost:5173')).toBe(false);
    });

    it('resolves localhost and dev ports only in non-production environments', () => {
      const allowed = getAllowedWebAuthnOrigins(devEnv);
      expect(allowed.has('https://aetheris-omni-sphere.pages.dev')).toBe(true);
      expect(allowed.has('http://localhost:3000')).toBe(true);
      expect(allowed.has('http://localhost:5173')).toBe(true);
      expect(allowed.has('http://127.0.0.1:3000')).toBe(true);
      expect(allowed.has('http://127.0.0.1:5173')).toBe(true);
    });
  });

  describe('2. CORS Allowlist Enforcement', () => {
    it('returns exact matching Access-Control-Allow-Origin for allowed origin', async () => {
      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn?action=challenge&fingerprint=user-cors-1', {
        method: 'GET',
        headers: { Origin: 'https://aetheris-omni-sphere.pages.dev' },
      });

      const res = await onRequest({ request: req, env: devEnv });
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://aetheris-omni-sphere.pages.dev');
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
    });

    it('does NOT reflect unknown or foreign origin into Access-Control-Allow-Origin', async () => {
      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn?action=challenge&fingerprint=user-cors-2', {
        method: 'GET',
        headers: { Origin: 'https://malicious-attacker.com' },
      });

      const res = await onRequest({ request: req, env: devEnv });
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
      expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('https://malicious-attacker.com');
    });

    it('preflight OPTIONS returns 204 with exact CORS origin for allowed origin', async () => {
      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn', {
        method: 'OPTIONS',
        headers: { Origin: 'https://aetheris-omni-sphere.pages.dev' },
      });

      const res = await onRequest({ request: req, env: devEnv });
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://aetheris-omni-sphere.pages.dev');
    });

    it('preflight OPTIONS rejects unknown origin with 403 and zero permissive CORS', async () => {
      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn', {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil-lookalike.pages.dev' },
      });

      const res = await onRequest({ request: req, env: devEnv });
      expect(res.status).toBe(403);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('3. Exact Origin Validation in Registration & Assertion (No Substrings / Lookalikes)', () => {
    it('accepts exact allowed origin in registration clientDataJSON', async () => {
      const challenge = await getChallenge('fp-valid-orig');
      const clientDataJSON = JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'https://aetheris-omni-sphere.pages.dev',
      });

      const devJwk = await getValidP256Jwk();

      const regReq = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'fp-valid-orig',
          credentialId: 'cred-orig-1',
          clientDataJSON,
          publicKey: devJwk,
        }),
      });

      const res = await onRequest({ request: regReq, env: devEnv });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('rejects foreign origin with 403', async () => {
      const challenge = await getChallenge('fp-foreign-orig');
      const clientDataJSON = JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'https://evil-phishing-portal.com',
      });

      const regReq = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'fp-foreign-orig',
          credentialId: 'cred-foreign-1',
          clientDataJSON,
          publicKey: { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' },
        }),
      });

      const res = await onRequest({ request: regReq, env: devEnv });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Cross-origin WebAuthn registration rejected');
    });

    it('rejects lookalike substring origin with 403 (e.g. target.pages.dev.attacker.com)', async () => {
      const challenge = await getChallenge('fp-lookalike-orig');
      const clientDataJSON = JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'https://aetheris-omni-sphere.pages.dev.attacker.com',
      });

      const regReq = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'fp-lookalike-orig',
          credentialId: 'cred-lookalike-1',
          clientDataJSON,
          publicKey: { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' },
        }),
      });

      const res = await onRequest({ request: regReq, env: devEnv });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Cross-origin WebAuthn registration rejected');
    });

    it('rejects different scheme with 403 (http vs https in production)', async () => {
      const challenge = await getChallenge('fp-scheme-orig');
      const clientDataJSON = JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'http://aetheris-omni-sphere.pages.dev',
      });

      const regReq = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'fp-scheme-orig',
          credentialId: 'cred-scheme-1',
          clientDataJSON,
          publicKey: { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' },
        }),
      });

      const res = await onRequest({ request: regReq, env: devEnv });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Cross-origin WebAuthn registration rejected');
    });

    it('rejects different port with 403 (e.g. port 8443)', async () => {
      const challenge = await getChallenge('fp-port-orig');
      const clientDataJSON = JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'https://aetheris-omni-sphere.pages.dev:8443',
      });

      const regReq = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'fp-port-orig',
          credentialId: 'cred-port-1',
          clientDataJSON,
          publicKey: { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' },
        }),
      });

      const res = await onRequest({ request: regReq, env: devEnv });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Cross-origin WebAuthn registration rejected');
    });

    it('rejects missing origin with 403', async () => {
      const challenge = await getChallenge('fp-missing-orig');
      const clientDataJSON = JSON.stringify({
        type: 'webauthn.create',
        challenge,
      });

      const regReq = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'fp-missing-orig',
          credentialId: 'cred-missing-1',
          clientDataJSON,
          publicKey: { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' },
        }),
      });

      const res = await onRequest({ request: regReq, env: devEnv });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe('4. Challenge Replay & Expiry Protection', () => {
    it('consumes challenge upon registration and rejects replay of same challenge', async () => {
      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn?action=challenge&fingerprint=user-replay-1');
      const res1 = await onRequest({ request: req, env: devEnv });
      const { challenge } = await res1.json();

      const devJwk = await getValidP256Jwk();

      const clientDataJSON = JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'https://aetheris-omni-sphere.pages.dev',
      });

      // First use: PASS
      const regReq1 = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'user-replay-1',
          credentialId: 'cred-replay-1',
          clientDataJSON,
          publicKey: devJwk,
        }),
      });
      const regRes1 = await onRequest({ request: regReq1, env: devEnv });
      expect(regRes1.status).toBe(200);

      // Replay second use: FAIL (challenge deleted)
      const regReq2 = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'user-replay-1',
          credentialId: 'cred-replay-2',
          clientDataJSON,
          publicKey: devJwk,
        }),
      });
      const regRes2 = await onRequest({ request: regReq2, env: devEnv });
      expect(regRes2.status).toBe(401);
      const json2 = await regRes2.json();
      expect(json2.error).toContain('WebAuthn challenge expired or not found');
    });

    it('rejects challenge from another fingerprint/context', async () => {
      // Challenge issued for user-alice
      const req = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn?action=challenge&fingerprint=user-alice');
      const res = await onRequest({ request: req, env: devEnv });
      const { challenge } = await res.json();

      const clientDataJSON = JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'https://aetheris-omni-sphere.pages.dev',
      });

      // user-bob attempts to use user-alice's challenge
      const regReq = new Request('https://aetheris-omni-sphere.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'user-bob',
          credentialId: 'cred-bob-1',
          clientDataJSON,
          publicKey: { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' },
        }),
      });

      const regRes = await onRequest({ request: regReq, env: devEnv });
      expect(regRes.status).toBe(401);
      const json = await regRes.json();
      expect(json.error).toContain('WebAuthn challenge expired or not found');
    });
  });
});
