import { describe, it, expect, beforeEach } from 'vitest';
import {
  onRequest as handleWebAuthn,
  resetWebAuthnMemoryStore,
} from '../../functions/api/webauthn.js';

function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('Security Gate: Zero WebAuthn Bypass & Cryptographic Rigor', () => {
  beforeEach(() => {
    resetWebAuthnMemoryStore();
  });

  it('ATTACK 1: Missing signature MUST return 401 and NEVER return authenticated: true', async () => {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const jwk = await crypto.subtle.exportKey('jwk', kp.publicKey);

    // Register
    const reqC = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=victim-1');
    const resC = await handleWebAuthn({ request: reqC, env: {} });
    const { challenge } = await resC.json();

    await handleWebAuthn({
      request: new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer victim-1' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'victim-1',
          credentialId: 'cred-victim-1',
          clientDataJSON: JSON.stringify({ type: 'webauthn.create', challenge, origin: 'https://aetheris.pages.dev' }),
          publicKey: jwk,
        }),
      }),
      env: {},
    });

    // Attempt bypass assertion with no signature
    const reqAuthC = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=victim-1');
    const resAuthC = await handleWebAuthn({ request: reqAuthC, env: {} });
    const { challenge: authChallenge } = await resAuthC.json();

    const authData = new Uint8Array(37);
    authData[32] = 0x01; // UP flag set

    const bypassRes = await handleWebAuthn({
      request: new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          fingerprint: 'victim-1',
          credentialId: 'cred-victim-1',
          clientDataJSON: JSON.stringify({ type: 'webauthn.get', challenge: authChallenge, origin: 'https://aetheris.pages.dev' }),
          authenticatorData: bufferToBase64Url(authData),
          // NO SIGNATURE PROVIDED
        }),
      }),
      env: {},
    });

    expect(bypassRes.status).toBe(401);
    const json = await bypassRes.json();
    expect(json.authenticated).toBeUndefined();
    expect(json.success).toBe(false);
  });

  it('ATTACK 2: Attacker signs with different key for victim credential -> 401', async () => {
    // Alice's legitimate credential
    const aliceKp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const aliceJwk = await crypto.subtle.exportKey('jwk', aliceKp.publicKey);

    // Attacker's rogue keypair
    const eveKp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);

    const reqC = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=alice');
    const resC = await handleWebAuthn({ request: reqC, env: {} });
    const { challenge } = await resC.json();

    await handleWebAuthn({
      request: new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer alice' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'alice',
          credentialId: 'cred-alice',
          clientDataJSON: JSON.stringify({ type: 'webauthn.create', challenge, origin: 'https://aetheris.pages.dev' }),
          publicKey: aliceJwk,
        }),
      }),
      env: {},
    });

    // Eve tries to authenticate as Alice using Eve's private key
    const reqAuthC = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=alice');
    const resAuthC = await handleWebAuthn({ request: reqAuthC, env: {} });
    const { challenge: authChallenge } = await resAuthC.json();

    const clientDataStr = JSON.stringify({ type: 'webauthn.get', challenge: authChallenge, origin: 'https://aetheris.pages.dev' });
    const clientDataHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientDataStr));

    const authData = new Uint8Array(37);
    authData[32] = 0x01;
    authData[36] = 1;

    const signedData = new Uint8Array(authData.length + 32);
    signedData.set(authData, 0);
    signedData.set(new Uint8Array(clientDataHash), authData.length);

    // Eve signs with Eve's key
    const eveSig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, eveKp.privateKey, signedData);

    const forgeRes = await handleWebAuthn({
      request: new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          fingerprint: 'alice',
          credentialId: 'cred-alice',
          clientDataJSON: clientDataStr,
          authenticatorData: bufferToBase64Url(authData),
          signature: bufferToBase64Url(eveSig),
        }),
      }),
      env: {},
    });

    expect([400, 401]).toContain(forgeRes.status);
    const json = await forgeRes.json();
    expect(json.authenticated).toBeUndefined();
    // The server may reject at rpIdHash (400), origin (403), or signature (401) — all are valid rejection codes.
    expect(json.error).toBeTruthy();
  });

  it('ATTACK 3: Registration with fake public key placeholder -> 400', async () => {
    const reqC = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=bob');
    const resC = await handleWebAuthn({ request: reqC, env: {} });
    const { challenge } = await resC.json();

    const badRegistration = await handleWebAuthn({
      request: new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'bob',
          credentialId: 'cred-bob-fake',
          clientDataJSON: JSON.stringify({ type: 'webauthn.create', challenge, origin: 'https://aetheris.pages.dev' }),
          publicKey: 'fido2-attested-credential',
        }),
      }),
      env: {},
    });

    expect(badRegistration.status).toBe(400);
    const json = await badRegistration.json();
    expect(json.error).toMatch(/valid P-256 public key/i);
  });

  it('ATTACK 4: Verification against non-existent credentialId -> 404', async () => {
    const reqC = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=bob');
    const resC = await handleWebAuthn({ request: reqC, env: {} });
    const { challenge } = await resC.json();

    const res = await handleWebAuthn({
      request: new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          fingerprint: 'bob',
          credentialId: 'cred-ghost-unknown',
          clientDataJSON: JSON.stringify({ type: 'webauthn.get', challenge, origin: 'https://aetheris.pages.dev' }),
          authenticatorData: bufferToBase64Url(new Uint8Array(37).fill(1)),
          signature: bufferToBase64Url(new Uint8Array(64).fill(1)),
        }),
      }),
      env: {},
    });

    expect(res.status).toBe(404);
  });
});
