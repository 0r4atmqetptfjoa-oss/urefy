import { describe, it, expect, beforeEach } from 'vitest';
import {
  isPermittedOrigin,
  SENSITIVE_ROUTES,
  CANONICAL_PRODUCTION_ORIGINS,
} from '../functions/api/_middleware.js';
import {
  onRequest as handleWebAuthn,
  consumeChallenge,
  verifyRegistrationIdentity,
  updateCredentialCounter,
  resetWebAuthnMemoryStore,
  getAllowedWebAuthnOrigins,
  derToRawSignature,
} from '../functions/api/webauthn.js';
import {
  generateKeyPair,
  signMessage,
  computeFingerprint,
  bytesToHex,
} from '@aetheris/core-crypto';

describe('WebAuthn Security Hardening (Findings 7, 9, 10, 11)', () => {
  beforeEach(() => {
    resetWebAuthnMemoryStore();
  });

  // ─── FINDING 7: CANONICAL EXACT CORS ALLOWLIST ─────────────────────────────
  describe('Finding 7: Exact Canonical CORS Allowlist', () => {
    it('allows exact canonical production origins on sensitive routes', () => {
      for (const origin of CANONICAL_PRODUCTION_ORIGINS) {
        const reqUrl = new URL('https://urefy.com/api/webauthn');
        expect(isPermittedOrigin(origin, reqUrl, { ENVIRONMENT: 'production' })).toBe(true);
      }
    });

    it('strictly forbids arbitrary *.pages.dev subdomains on sensitive routes', () => {
      const forbiddenOrigins = [
        'https://attacker.pages.dev',
        'https://malicious.pages.dev',
        'https://sub.evil.pages.dev',
        'https://aetheris.pages.dev.attacker.com',
      ];
      for (const origin of forbiddenOrigins) {
        for (const route of SENSITIVE_ROUTES) {
          const reqUrl = new URL(`https://aetheris.pages.dev${route}`);
          expect(isPermittedOrigin(origin, reqUrl, { ENVIRONMENT: 'production' })).toBe(false);
        }
      }
    });

    it('strictly forbids arbitrary *.aetheris.network and *.aetheris.io subdomains on sensitive routes', () => {
      const forbiddenOrigins = [
        'https://evil.aetheris.network',
        'https://fake.aetheris.io',
        'https://attacker-aetheris.network',
      ];
      for (const origin of forbiddenOrigins) {
        const reqUrl = new URL('https://urefy.com/api/webauthn');
        expect(isPermittedOrigin(origin, reqUrl, { ENVIRONMENT: 'production' })).toBe(false);
      }
    });

    it('returns canonical origins in getAllowedWebAuthnOrigins', () => {
      const allowed = getAllowedWebAuthnOrigins();
      expect(allowed).toContain('https://aetheris-omni-sphere.pages.dev');
      expect(allowed).toContain('https://aetheris.pages.dev');
      expect(allowed).toContain('https://urefy.com');
      expect(allowed).toContain('https://aetheris.io');
      expect(allowed).not.toContain('https://attacker.pages.dev');
    });

    it('rejects CORS preflight on /api/webauthn from rogue origin', async () => {
      const req = new Request('https://urefy.com/api/webauthn', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://attacker.pages.dev',
          'Access-Control-Request-Method': 'POST',
        },
      });
      const res = await handleWebAuthn({ request: req, env: { ENVIRONMENT: 'production' } });
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  // ─── FINDING 9: ATOMIC CHALLENGE CONSUMPTION ───────────────────────────────
  describe('Finding 9: Atomic Challenge Consumption', () => {
    it('consumes a challenge once and rejects subsequent consumption', async () => {
      const fingerprint = 'user-alice-9';
      // Issue challenge
      const reqGet = new Request(`https://urefy.com/api/webauthn?action=challenge&fingerprint=${fingerprint}`);
      const resGet = await handleWebAuthn({ request: reqGet, env: {} });
      const { challenge } = await resGet.json();

      // First consume: succeeds
      const first = await consumeChallenge({}, fingerprint, challenge);
      expect(first.success).toBe(true);

      // Second consume: fails immediately with "Challenge already consumed or invalid"
      const second = await consumeChallenge({}, fingerprint, challenge);
      expect(second.success).toBe(false);
      expect(second.error).toMatch(/already consumed or invalid/i);
    });

    it('fails closed in production if D1 database is unavailable', async () => {
      const res = await consumeChallenge({ ENVIRONMENT: 'production' }, 'fingerprint-x', 'challenge-xyz');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/failed closed/i);
    });

    it('atomic D1 state transition prevents concurrent race consumption', async () => {
      let state = { used: 0, expires_at: Date.now() + 60000 };
      const mockD1 = {
        prepare: (sql: string) => ({
          bind: (...args: any[]) => ({
            run: async () => {
              if (sql.includes('UPDATE webauthn_challenges SET used = 1')) {
                if (state.used === 0) {
                  state.used = 1;
                  return { meta: { changes: 1 } };
                }
                return { meta: { changes: 0 } };
              }
              return { meta: { changes: 0 } };
            },
          }),
        }),
      };

      const env = { DB: mockD1 as any, ENVIRONMENT: 'production' };
      const res1 = await consumeChallenge(env, 'user-race', 'chal-123');
      const res2 = await consumeChallenge(env, 'user-race', 'chal-123');

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(false);
      expect(res2.error).toMatch(/already consumed or invalid/i);
    });
  });

  // ─── FINDING 10: CRYPTOGRAPHIC IDENTITY BINDING ON REGISTRATION ─────────────
  describe('Finding 10: Cryptographic Identity Binding on WebAuthn Registration', () => {
    it('rejects registration with HTTP 401 when no auth or proof is provided', async () => {
      const fingerprint = 'target-victim-fingerprint';
      // 1. Issue challenge
      const reqGet = new Request(`https://urefy.com/api/webauthn?action=challenge&fingerprint=${fingerprint}`);
      const resGet = await handleWebAuthn({ request: reqGet, env: {} });
      const { challenge } = await resGet.json();

      // Create a valid Web Crypto P-256 key for passkey payload
      const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);

      const clientData = JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'https://aetheris.pages.dev',
      });

      // Attacker attempts unauthenticated registration for victim
      const reqPost = new Request('https://urefy.com/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint,
          credentialId: 'cred-attacker-hijack',
          clientDataJSON: clientData,
          publicKey: pubJwk,
        }),
      });

      const resPost = await handleWebAuthn({ request: reqPost, env: {} });
      expect(resPost.status).toBe(401);
      const json = await resPost.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/cryptographic identity binding/i);
    });

    it('rejects registration when Ed25519 signature proof does not match claimed fingerprint', async () => {
      // Key A belongs to Mallory
      const malloryKeyPair = generateKeyPair();
      const malloryPubKeyHex = bytesToHex(malloryKeyPair.publicKey);
      const malloryFingerprint = computeFingerprint(malloryKeyPair.publicKey);

      // Victim's fingerprint
      const victimFingerprint = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      // 1. Issue challenge for victim
      const reqGet = new Request(`https://urefy.com/api/webauthn?action=challenge&fingerprint=${victimFingerprint}`);
      const resGet = await handleWebAuthn({ request: reqGet, env: {} });
      const { challenge } = await resGet.json();

      // Mallory signs the challenge with Mallory's key
      const signature = bytesToHex(signMessage(challenge, malloryKeyPair.privateKey));

      const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
      const clientData = JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'https://aetheris.pages.dev',
      });

      const reqPost = new Request('https://urefy.com/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: victimFingerprint,
          credentialId: 'cred-spoof',
          clientDataJSON: clientData,
          publicKey: pubJwk,
          proofOfOwnership: {
            signature,
            publicKeyHex: malloryPubKeyHex,
          },
        }),
      });

      const resPost = await handleWebAuthn({ request: reqPost, env: {} });
      expect(resPost.status).toBe(401);
      const json = await resPost.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/public key fingerprint .* does not match claimed fingerprint/i);
    });

    it('accepts registration with valid Ed25519 signature proof matching fingerprint', async () => {
      // Legitimate user
      const userKeyPair = generateKeyPair();
      const userPubKeyHex = bytesToHex(userKeyPair.publicKey);
      const userFingerprint = computeFingerprint(userKeyPair.publicKey);

      // 1. Issue challenge
      const reqGet = new Request(`https://urefy.com/api/webauthn?action=challenge&fingerprint=${userFingerprint}`);
      const resGet = await handleWebAuthn({ request: reqGet, env: {} });
      const { challenge } = await resGet.json();

      // User signs the challenge with their own key
      const signature = bytesToHex(signMessage(challenge, userKeyPair.privateKey));

      const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
      const clientData = JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'https://aetheris.pages.dev',
      });

      const reqPost = new Request('https://urefy.com/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: userFingerprint,
          credentialId: 'cred-legit-user',
          clientDataJSON: clientData,
          publicKey: pubJwk,
          proofOfOwnership: {
            signature,
            publicKeyHex: userPubKeyHex,
          },
        }),
      });

      const resPost = await handleWebAuthn({ request: reqPost, env: {} });
      expect(resPost.status).toBe(200);
      const json = await resPost.json();
      expect(json.success).toBe(true);
      expect(json.credentialId).toBe('cred-legit-user');
    });

    it('accepts registration with valid Bearer session token matching fingerprint', async () => {
      const fingerprint = 'session-user-bob';

      const reqGet = new Request(`https://urefy.com/api/webauthn?action=challenge&fingerprint=${fingerprint}`);
      const resGet = await handleWebAuthn({ request: reqGet, env: {} });
      const { challenge } = await resGet.json();

      const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
      const clientData = JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'https://aetheris.pages.dev',
      });

      const reqPost = new Request('https://urefy.com/api/webauthn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer session_${fingerprint}`,
        },
        body: JSON.stringify({
          action: 'register',
          fingerprint,
          credentialId: 'cred-bob-session',
          clientDataJSON: clientData,
          publicKey: pubJwk,
        }),
      });

      const resPost = await handleWebAuthn({ request: reqPost, env: {} });
      expect(resPost.status).toBe(200);
      const json = await resPost.json();
      expect(json.success).toBe(true);
    });
  });

  // ─── FINDING 11: CONCURRENCY-SAFE SIGN_COUNT UPDATE WITH CAS ───────────────
  describe('Finding 11: Concurrency-Safe sign_count Update (CAS)', () => {
    it('succeeds on first update with matching oldCounter and fails on second update with stale counter', async () => {
      // Mock D1 database with CAS behavior
      let storedSignCount = 5;
      const mockD1 = {
        prepare: (sql: string) => ({
          bind: (newCounter: number, credId: string, oldCounter: number) => ({
            run: async () => {
              if (sql.includes('UPDATE webauthn_credentials SET sign_count = ? WHERE credential_id = ? AND sign_count = ?')) {
                if (storedSignCount === oldCounter) {
                  storedSignCount = newCounter;
                  return { meta: { changes: 1 } };
                }
                return { meta: { changes: 0 } };
              }
              return { meta: { changes: 0 } };
            },
          }),
        }),
      };

      const env = { DB: mockD1 as any, ENVIRONMENT: 'production' };

      // Update 1: 5 -> 6 succeeds
      const update1 = await updateCredentialCounter(env, 'cred-123', 6, 5);
      expect(update1.success).toBe(true);
      expect(storedSignCount).toBe(6);

      // Update 2: concurrent request still thinks counter is 5 -> fails CAS
      const update2 = await updateCredentialCounter(env, 'cred-123', 6, 5);
      expect(update2.success).toBe(false);
      expect(update2.error).toMatch(/concurrency conflict/i);
    });
  });

  // ─── FINDING 12: ASN.1 DER TO RAW SIGNATURE BOUNDARY PROTECTION ────────────
  describe('Finding 12: ASN.1 DER to Raw Signature Boundary Protection', () => {
    it('passes through valid 64-byte raw P1363 signatures intact', () => {
      const rawSig = new Uint8Array(64);
      rawSig.fill(0xaa);
      const result = derToRawSignature(rawSig);
      expect(result.length).toBe(64);
      expect(result).toEqual(rawSig);
    });

    it('safely converts valid ASN.1 DER ECDSA signature to 64-byte raw signature', () => {
      const r = new Uint8Array(32);
      r.fill(0x01);
      const s = new Uint8Array(32);
      s.fill(0x02);

      // Construct DER: 0x30, len, 0x02, 32, r..., 0x02, 32, s...
      const der = new Uint8Array(2 + 2 + 32 + 2 + 32);
      der[0] = 0x30;
      der[1] = 68; // total payload length
      der[2] = 0x02;
      der[3] = 32;
      der.set(r, 4);
      der[36] = 0x02;
      der[37] = 32;
      der.set(s, 38);

      const raw = derToRawSignature(der);
      expect(raw.length).toBe(64);
      expect(raw.subarray(0, 32)).toEqual(r);
      expect(raw.subarray(32, 64)).toEqual(s);
    });

    it('handles 33-byte ASN.1 DER with leading zero padding byte (r and s)', () => {
      const r = new Uint8Array(32);
      r.fill(0x88);
      const s = new Uint8Array(32);
      s.fill(0x99);

      // DER with leading 0x00 on negative high bit
      const der = new Uint8Array(2 + 2 + 33 + 2 + 33);
      der[0] = 0x30;
      der[1] = 70;
      der[2] = 0x02;
      der[3] = 33;
      der[4] = 0x00;
      der.set(r, 5);
      der[37] = 0x02;
      der[38] = 33;
      der[39] = 0x00;
      der.set(s, 40);

      const raw = derToRawSignature(der);
      expect(raw.length).toBe(64);
      expect(raw.subarray(0, 32)).toEqual(r);
      expect(raw.subarray(32, 64)).toEqual(s);
    });

    it('fails closed and does NOT throw RangeError on truncated or malformed DER', () => {
      const truncated = new Uint8Array([0x30, 0x10, 0x02, 0x20]);
      expect(() => derToRawSignature(truncated)).not.toThrow();

      const invalidTag = new Uint8Array([0x31, 0x00]);
      expect(() => derToRawSignature(invalidTag)).not.toThrow();

      const empty = new Uint8Array(0);
      expect(derToRawSignature(empty)).toEqual(empty);
    });

    it('fails closed and does NOT throw RangeError on oversized r/s lengths (DoS attack vector)', () => {
      // Craft an oversized r length that would cause 32 - r.length to be negative
      const maliciousDer = new Uint8Array(80);
      maliciousDer[0] = 0x30;
      maliciousDer[1] = 78;
      maliciousDer[2] = 0x02;
      maliciousDer[3] = 50; // rLen = 50 > 32
      maliciousDer.fill(0x41, 4, 54);
      maliciousDer[54] = 0x02;
      maliciousDer[55] = 20; // sLen = 20
      maliciousDer.fill(0x42, 56, 76);

      // Must not throw RangeError: offset is out of bounds
      expect(() => derToRawSignature(maliciousDer)).not.toThrow();
      const result = derToRawSignature(maliciousDer);
      // Returns fallback DER representation without crashing isolate
      expect(result).toBeDefined();
    });
  });
});
