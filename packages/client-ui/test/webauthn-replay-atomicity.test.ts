import { describe, it, expect, beforeEach } from 'vitest';
import {
  onRequest as handleWebAuthn,
  consumeChallenge,
  resetWebAuthnMemoryStore,
} from '../functions/api/webauthn.js';
import {
  generateKeyPair,
  signMessage,
  computeFingerprint,
  bytesToHex,
} from '@aetheris/core-crypto';

describe('WebAuthn Challenge Replay, Atomicity & Fail-Closed Invariants (P0)', () => {
  beforeEach(() => {
    resetWebAuthnMemoryStore();
  });

  it('MUST reject foreign / unallowed origin with HTTP 403', async () => {
    const fingerprint = 'victim-node-1';
    // 1. Issue challenge
    const reqGet = new Request(
      `https://urefy.com/api/webauthn?action=challenge&fingerprint=${fingerprint}`
    );
    const resGet = await handleWebAuthn({ request: reqGet, env: {} });
    const { challenge } = await resGet.json();

    const clientData = JSON.stringify({
      type: 'webauthn.create',
      challenge,
      origin: 'https://evil-phishing-site.com',
    });

    const reqPost = new Request('https://urefy.com/api/webauthn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        fingerprint,
        credentialId: 'cred-foreign-origin',
        clientDataJSON: clientData,
      }),
    });

    const resPost = await handleWebAuthn({ request: reqPost, env: {} });
    expect(resPost.status).toBe(403);
    const body = await resPost.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Cross-origin WebAuthn');
  });

  it('MUST reject wrong RP ID in assertion with HTTP 400', async () => {
    const userKeyPair = generateKeyPair();
    const userPubKeyHex = bytesToHex(userKeyPair.publicKey);
    const fingerprint = computeFingerprint(userKeyPair.publicKey);

    // 1. Setup challenge & register credential
    const reqGet = new Request(
      `https://urefy.com/api/webauthn?action=challenge&fingerprint=${fingerprint}`
    );
    const resGet = await handleWebAuthn({ request: reqGet, env: {} });
    const { challenge } = await resGet.json();

    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);

    const clientData = JSON.stringify({
      type: 'webauthn.create',
      challenge,
      origin: 'https://aetheris.pages.dev',
    });

    const signature = bytesToHex(signMessage(challenge, userKeyPair.privateKey));
    const reqReg = new Request('https://urefy.com/api/webauthn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        fingerprint,
        credentialId: 'cred-rp-test',
        clientDataJSON: clientData,
        publicKey: pubJwk,
        proofOfOwnership: { signature, publicKeyHex: userPubKeyHex },
      }),
    });
    const regRes = await handleWebAuthn({ request: reqReg, env: {} });
    expect(regRes.status).toBe(200);

    // 2. Request new challenge for assertion
    const reqGet2 = new Request(
      `https://urefy.com/api/webauthn?action=challenge&fingerprint=${fingerprint}`
    );
    const resGet2 = await handleWebAuthn({ request: reqGet2, env: {} });
    const { challenge: authChallenge } = await resGet2.json();

    // 3. Construct assertion with bogus rpIdHash
    const bogusRpIdHash = new Uint8Array(32).fill(0xee);
    const authData = new Uint8Array(37);
    authData.set(bogusRpIdHash, 0);
    authData[32] = 0x01; // UP flag

    const authClientData = JSON.stringify({
      type: 'webauthn.get',
      challenge: authChallenge,
      origin: 'https://aetheris.pages.dev',
    });

    const reqVerify = new Request('https://urefy.com/api/webauthn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify',
        fingerprint,
        credentialId: 'cred-rp-test',
        clientDataJSON: authClientData,
        authenticatorData: Array.from(authData),
        signature: 'dummy-sig',
      }),
    });

    const resVerify = await handleWebAuthn({ request: reqVerify, env: {} });
    expect(resVerify.status).toBe(400);
    const verifyJson = await resVerify.json();
    expect(verifyJson.success).toBe(false);
    expect(verifyJson.error).toContain('rpIdHash mismatch');
  });

  it('MUST reject reused challenge on second consumption attempt', async () => {
    const fingerprint = 'target-user-replay';
    const challenge = 'random-single-use-challenge-abc123';

    // Seed challenge directly in memory
    const reqGet = new Request(
      `https://urefy.com/api/webauthn?action=challenge&fingerprint=${fingerprint}`
    );
    const resGet = await handleWebAuthn({ request: reqGet, env: {} });
    const { challenge: issuedChallenge } = await resGet.json();

    // First consumption succeeds
    const first = await consumeChallenge({}, fingerprint, issuedChallenge);
    expect(first.success).toBe(true);

    // Second consumption MUST fail (replay defense)
    const second = await consumeChallenge({}, fingerprint, issuedChallenge);
    expect(second.success).toBe(false);
    expect(second.error).toMatch(/already consumed or invalid/i);
  });

  it('MUST prevent concurrent race consumption via atomic single-winner CAS', async () => {
    let usedState = 0;
    const mockD1 = {
      prepare: (sql: string) => ({
        bind: () => ({
          run: async () => {
            if (sql.includes('UPDATE webauthn_challenges SET used = 1')) {
              if (usedState === 0) {
                usedState = 1;
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
    const [res1, res2] = await Promise.all([
      consumeChallenge(env, 'user-concurrent', 'chal-conc-123'),
      consumeChallenge(env, 'user-concurrent', 'chal-conc-123'),
    ]);

    // Exactly one winner, one failure
    const successes = [res1, res2].filter((r) => r.success);
    const failures = [res1, res2].filter((r) => !r.success);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(failures[0].error).toMatch(/already consumed or invalid/i);
  });

  it('MUST prevent client fingerprint from overriding server identity without cryptographic proof', async () => {
    const victimFingerprint = 'victim-identity-safe';
    const reqGet = new Request(
      `https://urefy.com/api/webauthn?action=challenge&fingerprint=${victimFingerprint}`
    );
    const resGet = await handleWebAuthn({ request: reqGet, env: {} });
    const { challenge } = await resGet.json();

    const clientData = JSON.stringify({
      type: 'webauthn.create',
      challenge,
      origin: 'https://aetheris.pages.dev',
    });

    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);

    // Attacker sends unverified token attempting to claim victim's identity
    const reqPost = new Request('https://urefy.com/api/webauthn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer unverified_forged_token',
      },
      body: JSON.stringify({
        action: 'register',
        fingerprint: victimFingerprint,
        credentialId: 'cred-spoofed-bearer',
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
});
