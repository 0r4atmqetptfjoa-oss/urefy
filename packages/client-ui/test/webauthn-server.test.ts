import { describe, it, expect } from 'vitest';
import {
  onRequest as handleWebAuthn,
  derToRawSignature,
  importWebAuthnPublicKey,
} from '../functions/api/webauthn.js';

function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('WebAuthn FIDO2 Level 3 Server-Side Engine Suite', () => {
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

  describe('2. WebAuthn Public Key Importer', () => {
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
    it('rejects registration if challenge does not match', async () => {
      const reqGet = new Request('https://aetheris.pages.dev/api/webauthn?action=challenge&fingerprint=user-bob');
      await handleWebAuthn({ request: reqGet, env: {} });

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
          fingerprint: 'user-carol',
          credentialId: 'cred-carol-001',
          clientDataJSON: clientData,
          publicKey: 'fido2-public-key-carol',
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
    it('verifies valid FIDO2 Level 3 assertion with authentic ECDSA P-256 signature', async () => {
      const keypair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );
      const publicJwk = await crypto.subtle.exportKey('jwk', keypair.publicKey);

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          fingerprint: 'user-dave',
          credentialId: 'cred-dave-ecdsa',
          clientDataJSON: regClientData,
          publicKey: publicJwk,
        }),
      });
      const resReg = await handleWebAuthn({ request: reqReg, env: {} });
      expect(resReg.status).toBe(200);

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
      authDataBytes.fill(0x33, 0, 32);
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
        keypair.privateKey,
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
      authDataBytes[32] = 0x00; // UP not set

      const reqVerify = new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          fingerprint: 'user-dave',
          credentialId: 'cred-dave-ecdsa',
          clientDataJSON: authClientData,
          authenticatorData: bufferToBase64Url(authDataBytes),
        }),
      });

      const res = await handleWebAuthn({ request: reqVerify, env: {} });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/user presence/i);
    });

    it('rejects assertion when signCount fails to advance (replay protection)', async () => {
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
      authDataBytes[36] = 1; // signCount = 1 <= current counter (1)

      const reqVerify = new Request('https://aetheris.pages.dev/api/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          fingerprint: 'user-dave',
          credentialId: 'cred-dave-ecdsa',
          clientDataJSON: authClientData,
          authenticatorData: bufferToBase64Url(authDataBytes),
        }),
      });

      const res = await handleWebAuthn({ request: reqVerify, env: {} });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/replay attack/i);
    });
  });
});
