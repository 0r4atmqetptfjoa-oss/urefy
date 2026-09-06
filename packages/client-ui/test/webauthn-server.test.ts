import { describe, it, expect, beforeEach } from 'vitest';
import {
  onRequest as handleWebAuthn,
  derToRawSignature,
  importWebAuthnPublicKey,
  resetWebAuthnMemoryStore,
} from '../functions/api/webauthn.js';

function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makeRpIdHash(rpId = 'aetheris.pages.dev'): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rpId)));
}

describe('WebAuthn FIDO2 Level 3 Server-Side Engine Suite', () => {
  beforeEach(() => {
    resetWebAuthnMemoryStore();
  });

  describe('1. ASN.1 DER to Raw P1363 Signature Converter', () => {
    it('returns 64-byte raw signature directly if already raw', () => {
      const raw = new Uint8Array(64).fill(0xaa);
      const converted = derToRawSignature(raw);
      expect(converted.length).toBe(64);
      expect(converted).toEqual(raw);
    });

    it('converts standard ASN.1 DER sequence of integers to 64-byte raw (r || s)', () => {
      const r = new Uint8Array(32).fill(0x11);
      const s = new Uint8Array(32).fill(0x22);
      const der = new Uint8Array(2 + 2 + 32 + 2 + 32);
      let idx = 0;
      der[idx++] = 0x30;
      der[idx++] = 68;
      der[idx++] = 0x02;
      der[idx++] = 32;
      der.set(r, idx);
      idx += 32;
      der[idx++] = 0x02;
      der[idx++] = 32;
      der.set(s, idx);

      const converted = derToRawSignature(der);
      expect(converted.length).toBe(64);
      expect(converted.subarray(0, 32)).toEqual(r);
      expect(converted.subarray(32, 64)).toEqual(s);
    });

    it('handles DER integers with leading zero byte (positive magnitude padding)', () => {
      const r = new Uint8Array(33);
      r[0] = 0x00;
      r.fill(0x88, 1);
      const s = new Uint8Array(33);
      s[0] = 0x00;
      s.fill(0x99, 1);

      const der = new Uint8Array(2 + 2 + 33 + 2 + 33);
      let idx = 0;
      der[idx++] = 0x30;
      der[idx++] = 70;
      der[idx++] = 0x02;
      der[idx++] = 33;
      der.set(r, idx);
      idx += 33;
      der[idx++] = 0x02;
      der[idx++] = 33;
      der.set(s, idx);

      const converted = derToRawSignature(der);
      expect(converted.length).toBe(64);
      expect(converted.subarray(0, 32)).toEqual(r.subarray(1));
      expect(converted.subarray(32, 64)).toEqual(s.subarray(1));
    });
  });

  describe('2. WebAuthn Public Key Importer & Security Boundary', () => {
    it('successfully imports P-256 JWK into CryptoKey for verification', async () => {
      const keypair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );
      const jwk = await crypto.subtle.exportKey('jwk', keypair.publicKey);
      const imported = await importWebAuthnPublicKey(jwk);
      expect(imported.type).toBe('public');
      expect(imported.algorithm.name).toBe('ECDSA');
    });

    it('rejects fake fido2-attested-credential dummy fallback', async () => {
      await expect(importWebAuthnPublicKey('fido2-attested-credential')).rejects.toThrow();
    });
  });

  describe('3. Challenge Issuance & Replay Defense (GET)', () => {
    it('issues a high-entropy base64url challenge with timeout and hostname', async () => {
      const req = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=user-alice');
      const res = await handleWebAuthn({ request: req, env: {} });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(typeof body.challenge).toBe('string');
      expect(body.challenge.length).toBeGreaterThan(20);
      expect(body.rpId).toBe('aetheris.pages.dev');
    });
  });

  describe('4. Passkey Registration (POST action: register)', () => {
    it('rejects registration if public key is missing or dummy string', async () => {
      const reqGet = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=user-dummy');
      const resGet = await handleWebAuthn({ request: reqGet, env: {} });
      const { challenge } = await resGet.json();

      const clientData = JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'https://aetheris.pages.dev',
      });

      const reqPost = new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'user-dummy',
          credentialId: 'cred-dummy-001',
          clientDataJSON: clientData,
          publicKey: 'fido2-attested-credential',
        }),
      });

      const res = await handleWebAuthn({ request: reqPost, env: {} });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/valid P-256 public key/i);
    });

    it('rejects registration if challenge does not match', async () => {
      const reqGet = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=user-bob');
      await handleWebAuthn({ request: reqGet, env: {} });

      const kp = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );
      const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);

      const fakeClientData = JSON.stringify({
        type: 'webauthn.create',
        challenge: 'wrong-challenge-value',
        origin: 'https://aetheris.pages.dev',
      });

      const reqPost = new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'user-bob',
          credentialId: 'cred-bob-001',
          clientDataJSON: fakeClientData,
          publicKey: pubJwk,
        }),
      });

      const res = await handleWebAuthn({ request: reqPost, env: {} });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/challenge mismatch/i);
    });

    it('successfully registers passkey when challenge matches', async () => {
      const reqGet = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=user-carol');
      const resGet = await handleWebAuthn({ request: reqGet, env: {} });
      const { challenge } = await resGet.json();

      const kp = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );
      const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);

      const clientData = JSON.stringify({
        type: 'webauthn.create',
        challenge,
        origin: 'https://aetheris.pages.dev',
      });

      const reqPost = new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer user-carol',
        },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'user-carol',
          credentialId: 'cred-carol-001',
          clientDataJSON: clientData,
          publicKey: pubJwk,
        }),
      });

      const res = await handleWebAuthn({ request: reqPost, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.credentialId).toBe('cred-carol-001');
    });
  });

  describe('5. Cryptographic Assertion Verification (POST action: verify)', () => {
    let daveKeypair: CryptoKeyPair;
    let davePubJwk: JsonWebKey;

    beforeEach(async () => {
      daveKeypair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );
      davePubJwk = await crypto.subtle.exportKey('jwk', daveKeypair.publicKey);

      // Register Dave
      const reqGetReg = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=user-dave');
      const resGetReg = await handleWebAuthn({ request: reqGetReg, env: {} });
      const { challenge: regChallenge } = await resGetReg.json();

      const regClientData = JSON.stringify({
        type: 'webauthn.create',
        challenge: regChallenge,
        origin: 'https://aetheris.pages.dev',
      });
      const reqReg = new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer user-dave',
        },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'user-dave',
          credentialId: 'cred-dave-ecdsa',
          clientDataJSON: regClientData,
          publicKey: davePubJwk,
        }),
      });
      const resReg = await handleWebAuthn({ request: reqReg, env: {} });
      expect(resReg.status).toBe(200);
    });

    it('verifies valid FIDO2 Level 3 assertion with authentic ECDSA P-256 signature', async () => {
      const reqGetAuth = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=user-dave');
      const resGetAuth = await handleWebAuthn({ request: reqGetAuth, env: {} });
      const { challenge: authChallenge } = await resGetAuth.json();

      const authClientData = JSON.stringify({
        type: 'webauthn.get',
        challenge: authChallenge,
        origin: 'https://aetheris.pages.dev',
      });
      const rawClientDataBytes = new TextEncoder().encode(authClientData);
      const clientDataHash = await crypto.subtle.digest('SHA-256', rawClientDataBytes);

      const authDataBytes = new Uint8Array(37);
      const rpIdHash = await makeRpIdHash();
      authDataBytes.set(rpIdHash, 0);
      authDataBytes[32] = 0x01; // User Presence (UP)
      authDataBytes[33] = 0;
      authDataBytes[34] = 0;
      authDataBytes[35] = 0;
      authDataBytes[36] = 1; // signCount = 1

      const signedData = new Uint8Array(authDataBytes.length + 32);
      signedData.set(authDataBytes, 0);
      signedData.set(new Uint8Array(clientDataHash), authDataBytes.length);

      const rawSignature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        daveKeypair.privateKey,
        signedData
      );

      const reqVerify = new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          fingerprint: 'user-dave',
          credentialId: 'cred-dave-ecdsa',
          clientDataJSON: authClientData,
          authenticatorData: bufferToBase64Url(authDataBytes),
          signature: bufferToBase64Url(rawSignature),
        }),
      });

      const resVerify = await handleWebAuthn({ request: reqVerify, env: {} });
      expect(resVerify.status).toBe(200);
      const jsonVerify = await resVerify.json();
      expect(jsonVerify.success).toBe(true);
      expect(jsonVerify.authenticated).toBe(true);
      expect(jsonVerify.counter).toBe(1);
    });

    it('rejects assertion with HTTP 401 when signature is missing (No Bypass)', async () => {
      const reqGet = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=user-dave');
      const resGet = await handleWebAuthn({ request: reqGet, env: {} });
      const { challenge } = await resGet.json();

      const authClientData = JSON.stringify({
        type: 'webauthn.get',
        challenge,
        origin: 'https://aetheris.pages.dev',
      });

      const authDataBytes = new Uint8Array(37);
      authDataBytes[32] = 0x01;

      const reqVerify = new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          fingerprint: 'user-dave',
          credentialId: 'cred-dave-ecdsa',
          clientDataJSON: authClientData,
          authenticatorData: bufferToBase64Url(authDataBytes),
          // signature intentionally omitted
        }),
      });

      const res = await handleWebAuthn({ request: reqVerify, env: {} });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/mandatory cryptographic signature/i);
    });

    it('rejects assertion with HTTP 401 when signature is invalid', async () => {
      const reqGet = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=user-dave');
      const resGet = await handleWebAuthn({ request: reqGet, env: {} });
      const { challenge } = await resGet.json();

      const authClientData = JSON.stringify({
        type: 'webauthn.get',
        challenge,
        origin: 'https://aetheris.pages.dev',
      });

      const authDataBytes = new Uint8Array(37);
      authDataBytes.set(await makeRpIdHash(), 0);
      authDataBytes[32] = 0x01;
      authDataBytes[36] = 5;

      const fakeSig = new Uint8Array(64).fill(0xee);

      const reqVerify = new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          fingerprint: 'user-dave',
          credentialId: 'cred-dave-ecdsa',
          clientDataJSON: authClientData,
          authenticatorData: bufferToBase64Url(authDataBytes),
          signature: bufferToBase64Url(fakeSig),
        }),
      });

      const res = await handleWebAuthn({ request: reqVerify, env: {} });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/signature verification failed/i);
    });

    it('rejects assertion when User Presence (UP) flag is missing', async () => {
      const reqGet = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=user-dave');
      const resGet = await handleWebAuthn({ request: reqGet, env: {} });
      const { challenge } = await resGet.json();

      const authClientData = JSON.stringify({
        type: 'webauthn.get',
        challenge,
        origin: 'https://aetheris.pages.dev',
      });

      const authDataBytes = new Uint8Array(37);
      authDataBytes.set(await makeRpIdHash(), 0);
      authDataBytes[32] = 0x00; // UP not set
      authDataBytes[36] = 2;

      const rawClientDataBytes = new TextEncoder().encode(authClientData);
      const clientDataHash = await crypto.subtle.digest('SHA-256', rawClientDataBytes);
      const signedData = new Uint8Array(authDataBytes.length + 32);
      signedData.set(authDataBytes, 0);
      signedData.set(new Uint8Array(clientDataHash), authDataBytes.length);

      const rawSignature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        daveKeypair.privateKey,
        signedData
      );

      const reqVerify = new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          fingerprint: 'user-dave',
          credentialId: 'cred-dave-ecdsa',
          clientDataJSON: authClientData,
          authenticatorData: bufferToBase64Url(authDataBytes),
          signature: bufferToBase64Url(rawSignature),
        }),
      });

      const res = await handleWebAuthn({ request: reqVerify, env: {} });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/user presence/i);
    });

    it('rejects assertion when signCount fails to advance (replay protection)', async () => {
      // First, do a successful verify with counter = 10
      const reqGet1 = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=user-dave');
      const resGet1 = await handleWebAuthn({ request: reqGet1, env: {} });
      const { challenge: c1 } = await resGet1.json();

      const cd1 = JSON.stringify({ type: 'webauthn.get', challenge: c1, origin: 'https://aetheris.pages.dev' });
      const h1 = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cd1));
      const ad1 = new Uint8Array(37);
      ad1.set(await makeRpIdHash(), 0);
      ad1[32] = 0x01;
      ad1[36] = 10;
      const sd1 = new Uint8Array(ad1.length + 32);
      sd1.set(ad1, 0);
      sd1.set(new Uint8Array(h1), ad1.length);
      const sig1 = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, daveKeypair.privateKey, sd1);

      await handleWebAuthn({
        request: new Request('https://aetheris.pages.dev/api/webauthn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify',
            fingerprint: 'user-dave',
            credentialId: 'cred-dave-ecdsa',
            clientDataJSON: cd1,
            authenticatorData: bufferToBase64Url(ad1),
            signature: bufferToBase64Url(sig1),
          }),
        }),
        env: {},
      });

      // Now attempt a second assertion with counter = 10 (did not advance past 10!)
      const reqGet2 = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=user-dave');
      const resGet2 = await handleWebAuthn({ request: reqGet2, env: {} });
      const { challenge: c2 } = await resGet2.json();

      const cd2 = JSON.stringify({ type: 'webauthn.get', challenge: c2, origin: 'https://aetheris.pages.dev' });
      const h2 = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cd2));
      const ad2 = new Uint8Array(37);
      ad2.set(await makeRpIdHash(), 0);
      ad2[32] = 0x01;
      ad2[36] = 10; // same counter <= 10
      const sd2 = new Uint8Array(ad2.length + 32);
      sd2.set(ad2, 0);
      sd2.set(new Uint8Array(h2), ad2.length);
      const sig2 = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, daveKeypair.privateKey, sd2);

      const reqVerify = new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          fingerprint: 'user-dave',
          credentialId: 'cred-dave-ecdsa',
          clientDataJSON: cd2,
          authenticatorData: bufferToBase64Url(ad2),
          signature: bufferToBase64Url(sig2),
        }),
      });

      const res = await handleWebAuthn({ request: reqVerify, env: {} });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/replay attack/i);
    });
  });
});
