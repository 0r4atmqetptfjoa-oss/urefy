import { describe, it, expect } from 'vitest';
import { 
  opaqueBlindPassword, 
  opaqueEvaluateOprf, 
  opaqueFinalizeOprf,
  opaqueCreateRegistration,
  opaqueFinalizeRegistration,
  opaqueStartLogin,
  opaqueServerLogin,
  opaqueFinishLogin
} from '../src/pake-auth.js';
import { x25519 } from '@noble/curves/ed25519';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';

describe('PAKE Authentication (OPAQUE-lite)', () => {
  const password = "my_super_secret_password";
  const serverLongTermPrivateKey = x25519.utils.randomPrivateKey();
  const serverPublicKey = x25519.getPublicKey(serverLongTermPrivateKey);
  
  const clientPrivateKey = x25519.utils.randomPrivateKey();
  const clientPublicKey = x25519.getPublicKey(clientPrivateKey);
  const clientKeyPair = { privateKey: clientPrivateKey, publicKey: clientPublicKey };
  
  const oprfSeed = x25519.utils.randomPrivateKey(); // server's secret OPRF seed

  let passwordFile: any;

  it('1. Test că parola NU apare în OpaqueRegistrationRequest', () => {
    const { request } = opaqueCreateRegistration(password, serverPublicKey, clientKeyPair);
    const encoder = new TextEncoder();
    const hash = bytesToHex(hkdf(sha256, encoder.encode(password), encoder.encode("OPAQUE_H2C"), encoder.encode("urefy-h2c-v1"), 32));
    expect(request.blindedPassword).not.toEqual(hash);
    expect(request.blindedPassword.length).toBe(64); // 32 bytes hex
  });

  it('2. Test registration flow complet', () => {
    const { request, blindingScalar } = opaqueCreateRegistration(password, serverPublicKey, clientKeyPair);
    
    // Server processes registration
    const evaluatedElement = opaqueEvaluateOprf(hexToBytes(request.blindedPassword), oprfSeed);
    const response = {
      evaluatedElement: bytesToHex(evaluatedElement),
      serverPublicKey: bytesToHex(serverPublicKey)
    };
    
    // Client finalizes
    const { credentialFile } = opaqueFinalizeRegistration(blindingScalar, password, response, clientPrivateKey);
    
    expect(credentialFile).toBeInstanceOf(Uint8Array);
    
    // Server saves passwordFile
    passwordFile = {
      credentialFile: bytesToHex(credentialFile),
      maskingKey: bytesToHex(x25519.utils.randomPrivateKey()),
      oprfSeed: bytesToHex(oprfSeed),
      clientPublicKeyHash: bytesToHex(sha256(clientPublicKey))
    };
  });

  it('3. Test că server-ul nu poate recupera parola din passwordFile', () => {
    // passwordFile contains credentialFile, maskingKey, oprfSeed, hash(clientPub)
    // Server has no knowledge of blindingScalar (kept client side) or rwd
    // So server cannot decrypt credentialFile, and oprfSeed is just a random key
    expect(passwordFile.credentialFile).not.toContain(bytesToHex(new TextEncoder().encode(password)));
    expect(passwordFile.oprfSeed).not.toEqual(bytesToHex(new TextEncoder().encode(password)));
  });

  it('4. Test login flow complet', () => {
    const { request, clientState } = opaqueStartLogin(password);
    
    const loginResponse = opaqueServerLogin(request, passwordFile, serverLongTermPrivateKey);
    
    expect(loginResponse.serverMac).toBeDefined();
    
    const finish = opaqueFinishLogin(clientState, loginResponse);
    expect(finish).not.toBeNull();
    expect(finish?.clientMac).toBeDefined();
    expect(finish?.sessionKey).toBeInstanceOf(Uint8Array);
    expect(finish?.sessionKey.length).toBe(32);
  });

  it('5. Test că wrong password -> login fails (clientMac mismatch)', () => {
    const { request, clientState } = opaqueStartLogin("wrong_password");
    
    const loginResponse = opaqueServerLogin(request, passwordFile, serverLongTermPrivateKey);
    
    const finish = opaqueFinishLogin(clientState, loginResponse);
    expect(finish).toBeNull(); // Because MAC/decryption fails
  });

  it('6. Test session key derivation consistency (același session key)', () => {
    // The previous login test doesn't explicitly compare client and server side keys
    // because serverLogin doesn't return the session key in response (to simulate real flow).
    // Let's modify slightly to verify it's the same.
    const { request, clientState } = opaqueStartLogin(password);
    
    // server computes session key internally
    const oprfKey = hexToBytes(passwordFile.oprfSeed);
    const evaluatedElement = opaqueEvaluateOprf(hexToBytes(request.blindedPassword), oprfKey);
    const serverEphemeralPriv = x25519.utils.randomPrivateKey();
    const serverEphemeralPub = x25519.getPublicKey(serverEphemeralPriv);
    const clientEphPub = hexToBytes(request.clientEphemeralPublicKey);
    const sharedEph = x25519.getSharedSecret(serverEphemeralPriv, clientEphPub);
    const serverSessionKey = hkdf(sha256, sharedEph, undefined, "opaque-session", 32);
    
    const encoder = new TextEncoder();
    const loginResponse = {
      evaluatedElement: bytesToHex(evaluatedElement),
      serverEphemeralPublicKey: bytesToHex(serverEphemeralPub),
      encryptedCredentials: passwordFile.credentialFile,
      serverMac: bytesToHex(hmac(sha256, serverSessionKey, encoder.encode("ServerMAC")))
    };
    
    const finish = opaqueFinishLogin(clientState, loginResponse);
    expect(finish).not.toBeNull();
    expect(bytesToHex(finish!.sessionKey)).toBe(bytesToHex(serverSessionKey));
  });

  it('7. Test replay resistance (aceeași request blinded cu scalar diferit -> evaluare diferită)', () => {
    const { blindedPassword: b1 } = opaqueBlindPassword(password);
    const { blindedPassword: b2 } = opaqueBlindPassword(password);
    expect(b1).not.toEqual(b2);
    
    const eval1 = opaqueEvaluateOprf(b1, oprfSeed);
    const eval2 = opaqueEvaluateOprf(b2, oprfSeed);
    expect(eval1).not.toEqual(eval2);
  });

  it('8. Test că blindingScalar nu este expus în response', () => {
    const { blindingScalar } = opaqueBlindPassword(password);
    const request = opaqueCreateRegistration(password, serverPublicKey, clientKeyPair);
    expect(request.request.blindedPassword).not.toContain(bytesToHex(blindingScalar));
    expect(request.request.clientPublicKey).not.toContain(bytesToHex(blindingScalar));
  });

  it('9. Test forward secrecy: session key diferit la fiecare login', () => {
    const { request: req1, clientState: s1 } = opaqueStartLogin(password);
    const res1 = opaqueServerLogin(req1, passwordFile, serverLongTermPrivateKey);
    const finish1 = opaqueFinishLogin(s1, res1);
    
    const { request: req2, clientState: s2 } = opaqueStartLogin(password);
    const res2 = opaqueServerLogin(req2, passwordFile, serverLongTermPrivateKey);
    const finish2 = opaqueFinishLogin(s2, res2);
    
    expect(bytesToHex(finish1!.sessionKey)).not.toEqual(bytesToHex(finish2!.sessionKey));
  });
  
  it('10. Test unblinding is commutative with evaluation', () => {
    const { blindedPassword, blindingScalar } = opaqueBlindPassword(password);
    const evaluated = opaqueEvaluateOprf(blindedPassword, oprfSeed);
    const rwd = opaqueFinalizeOprf(evaluated, blindingScalar);
    
    // Simulate another unblinding with different scalar
    const req2 = opaqueBlindPassword(password);
    const evaluated2 = opaqueEvaluateOprf(req2.blindedPassword, oprfSeed);
    const rwd2 = opaqueFinalizeOprf(evaluated2, req2.blindingScalar);
    
    // rwd must be identical!
    expect(bytesToHex(rwd)).toBe(bytesToHex(rwd2));
  });

  it('11. Test decriptarea failue on wrong rwd', () => {
    const { request, clientState } = opaqueStartLogin(password);
    // alter blindingScalar to produce wrong rwd
    clientState.blindingScalar = x25519.utils.randomPrivateKey();
    const loginResponse = opaqueServerLogin(request, passwordFile, serverLongTermPrivateKey);
    const finish = opaqueFinishLogin(clientState, loginResponse);
    expect(finish).toBeNull();
  });

  it('12. Test login with another users password file should fail', () => {
    const wrongPasswordFile = {
      ...passwordFile,
      credentialFile: passwordFile.credentialFile.replace(/[0-9a-f]/g, '0') 
    };
    const { request, clientState } = opaqueStartLogin(password);
    const loginResponse = opaqueServerLogin(request, wrongPasswordFile, serverLongTermPrivateKey);
    const finish = opaqueFinishLogin(clientState, loginResponse);
    expect(finish).toBeNull();
  });
});
