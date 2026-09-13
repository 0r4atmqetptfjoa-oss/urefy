import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { hkdf } from '@noble/hashes/hkdf';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { x25519, ed25519 } from '@noble/curves/ed25519';

export interface OpaqueRegistrationRequest {
  blindedPassword: string;  
  clientPublicKey: string;  
}

export interface OpaqueRegistrationResponse {
  evaluatedElement: string; 
  serverPublicKey: string;  
}

export interface OpaquePasswordFile {
  credentialFile: string;   
  maskingKey: string;       
  oprfSeed: string;         
  clientPublicKeyHash: string; 
}

export interface OpaqueLoginRequest {
  blindedPassword: string;  
  clientEphemeralPublicKey: string; 
}

export interface OpaqueLoginResponse {
  evaluatedElement: string; 
  serverEphemeralPublicKey: string; 
  encryptedCredentials: string; 
  serverMac: string;           
}

export interface OpaqueLoginFinish {
  clientMac: string;           
  sessionKey: Uint8Array;      
}

export interface OpaqueClientLoginState {
  blindingScalar: Uint8Array;
  password: string;
  clientEphemeralPrivateKey: Uint8Array;
  clientEphemeralPublicKey: Uint8Array;
}

const P = 2n ** 255n - 19n;
const L = BigInt('7237005577332262213973186563042994240857116359379907606001950938285454250989');

function mod(a: bigint, b: bigint) {
  const result = a % b;
  return result >= 0n ? result : result + b;
}

function invert(number: bigint, modulo: bigint) {
  let a = mod(number, modulo);
  let m = modulo;
  let x = 0n;
  let y = 1n;
  while (a !== 0n) {
    let q = m / a;
    let r = m % a;
    m = a;
    a = r;
    let temp = x - q * y;
    x = y;
    y = temp;
  }
  return mod(x, modulo);
}

function bytesToBigIntLE(bytes: Uint8Array): bigint {
  const hex = bytesToHex(new Uint8Array(bytes).reverse());
  return BigInt('0x' + (hex || '0'));
}

function bigIntToBytesLE(n: bigint, len = 32): Uint8Array {
  const hex = n.toString(16).padStart(len * 2, '0');
  return hexToBytes(hex).reverse();
}

function unblindX25519(evalBytes: Uint8Array, rBytes: Uint8Array): Uint8Array {
  const r_clamped = new Uint8Array(rBytes);
  r_clamped[0] &= 248;
  r_clamped[31] &= 127;
  r_clamped[31] |= 64;
  
  const r_big = bytesToBigIntLE(r_clamped);
  const inv = invert(r_big, L);
  
  const u = bytesToBigIntLE(evalBytes);
  const y = mod((u - 1n) * invert(u + 1n, P), P);
  
  const y_bytes = bigIntToBytesLE(y);
  let Point;
  try {
    Point = ed25519.ExtendedPoint.fromHex(y_bytes);
  } catch (e) {
    // If point is on the twist or invalid, unblinding fails.
    // Return a dummy value that will definitely fail decryption.
    return new Uint8Array(32);
  }
  const unblinded_ed = Point.multiply(inv);
  
  const unblinded_u = mod((1n + unblinded_ed.y) * invert(1n - unblinded_ed.y, P), P);
  return bigIntToBytesLE(unblinded_u);
}

function mockEncrypt(key: Uint8Array, plaintext: Uint8Array): Uint8Array {
  const pad = hkdf(sha256, key, undefined, "mock-gcm-pad", plaintext.length);
  const ciphertext = new Uint8Array(plaintext.length);
  for (let i = 0; i < plaintext.length; i++) ciphertext[i] = plaintext[i] ^ pad[i];
  const mac = hmac(sha256, key, ciphertext).slice(0, 16);
  const res = new Uint8Array(ciphertext.length + 16);
  res.set(ciphertext, 0);
  res.set(mac, ciphertext.length);
  return res;
}

function mockDecrypt(key: Uint8Array, ciphertextWithMac: Uint8Array): Uint8Array | null {
  if (ciphertextWithMac.length < 16) return null;
  const ciphertext = ciphertextWithMac.slice(0, -16);
  const mac = ciphertextWithMac.slice(-16);
  const expectedMac = hmac(sha256, key, ciphertext).slice(0, 16);
  let diff = 0;
  for (let i = 0; i < 16; i++) diff |= mac[i] ^ expectedMac[i];
  if (diff !== 0) return null;
  
  const pad = hkdf(sha256, key, undefined, "mock-gcm-pad", ciphertext.length);
  const plaintext = new Uint8Array(ciphertext.length);
  for (let i = 0; i < ciphertext.length; i++) plaintext[i] = ciphertext[i] ^ pad[i];
  return plaintext;
}

export function opaqueBlindPassword(password: string): { blindedPassword: Uint8Array; blindingScalar: Uint8Array } {
  const encoder = new TextEncoder();
  const pwdBytes = encoder.encode(password);
  const H = hkdf(sha256, pwdBytes, encoder.encode("OPAQUE_H2C"), encoder.encode("urefy-h2c-v1"), 32);
  const r = x25519.utils.randomPrivateKey();
  const blindedPassword = x25519.getSharedSecret(r, H);
  return { blindedPassword, blindingScalar: r };
}

export function opaqueFinalizeOprf(evaluatedElement: Uint8Array, blindingScalar: Uint8Array): Uint8Array {
  const unblinded = unblindX25519(evaluatedElement, blindingScalar);
  const encoder = new TextEncoder();
  return hkdf(sha256, unblinded, undefined, encoder.encode("opaque-rwd"), 32);
}

export function opaqueEvaluateOprf(blindedElement: Uint8Array, serverOprfKey: Uint8Array): Uint8Array {
  return x25519.getSharedSecret(serverOprfKey, blindedElement);
}

export function opaqueCreateRegistration(password: string, serverPublicKey: Uint8Array, clientKeyPair: { privateKey: Uint8Array; publicKey: Uint8Array }): { request: OpaqueRegistrationRequest; blindingScalar: Uint8Array } {
  const { blindedPassword, blindingScalar } = opaqueBlindPassword(password);
  return {
    request: {
      blindedPassword: bytesToHex(blindedPassword),
      clientPublicKey: bytesToHex(clientKeyPair.publicKey)
    },
    blindingScalar
  };
}

export function opaqueFinalizeRegistration(
  blindingScalar: Uint8Array,
  password: string,
  response: OpaqueRegistrationResponse,
  clientPrivateKey: Uint8Array
): { credentialFile: Uint8Array } {
  const rwd = opaqueFinalizeOprf(hexToBytes(response.evaluatedElement), blindingScalar);
  const payload = new Uint8Array(clientPrivateKey.length + 32);
  payload.set(clientPrivateKey, 0);
  payload.set(hexToBytes(response.serverPublicKey), clientPrivateKey.length);
  const credentialFile = mockEncrypt(rwd, payload);
  return { credentialFile };
}

export function opaqueStartLogin(password: string): { request: OpaqueLoginRequest; clientState: OpaqueClientLoginState } {
  const { blindedPassword, blindingScalar } = opaqueBlindPassword(password);
  const clientEphemeralPrivateKey = x25519.utils.randomPrivateKey();
  const clientEphemeralPublicKey = x25519.getPublicKey(clientEphemeralPrivateKey);
  return {
    request: {
      blindedPassword: bytesToHex(blindedPassword),
      clientEphemeralPublicKey: bytesToHex(clientEphemeralPublicKey)
    },
    clientState: {
      blindingScalar,
      password,
      clientEphemeralPrivateKey,
      clientEphemeralPublicKey
    }
  };
}

export function opaqueServerLogin(
  request: OpaqueLoginRequest,
  passwordFile: OpaquePasswordFile,
  serverLongTermPrivateKey: Uint8Array
): OpaqueLoginResponse {
  const oprfKey = hexToBytes(passwordFile.oprfSeed);
  const evaluatedElement = opaqueEvaluateOprf(hexToBytes(request.blindedPassword), oprfKey);
  
  const serverEphemeralPriv = x25519.utils.randomPrivateKey();
  const serverEphemeralPub = x25519.getPublicKey(serverEphemeralPriv);
  
  const clientEphPub = hexToBytes(request.clientEphemeralPublicKey);
  const sharedEph = x25519.getSharedSecret(serverEphemeralPriv, clientEphPub);
  
  // Fake AKE for lite version: session depends on Eph-Eph
  const sessionKey = hkdf(sha256, sharedEph, undefined, "opaque-session", 32);
  const encoder = new TextEncoder();
  const serverMac = hmac(sha256, sessionKey, encoder.encode("ServerMAC"));
  
  return {
    evaluatedElement: bytesToHex(evaluatedElement),
    serverEphemeralPublicKey: bytesToHex(serverEphemeralPub),
    encryptedCredentials: passwordFile.credentialFile,
    serverMac: bytesToHex(serverMac)
  };
}

export function opaqueFinishLogin(
  clientState: OpaqueClientLoginState,
  response: OpaqueLoginResponse
): OpaqueLoginFinish | null {
  const rwd = opaqueFinalizeOprf(hexToBytes(response.evaluatedElement), clientState.blindingScalar);
  const decrypted = mockDecrypt(rwd, hexToBytes(response.encryptedCredentials));
  if (!decrypted) return null;
  
  const serverEphPub = hexToBytes(response.serverEphemeralPublicKey);
  const sharedEph = x25519.getSharedSecret(clientState.clientEphemeralPrivateKey, serverEphPub);
  
  const sessionKey = hkdf(sha256, sharedEph, undefined, "opaque-session", 32);
  
  const encoder = new TextEncoder();
  const expectedServerMac = hmac(sha256, sessionKey, encoder.encode("ServerMAC"));
  const serverMacBytes = hexToBytes(response.serverMac);
  
  let diff = 0;
  if (serverMacBytes.length !== expectedServerMac.length) return null;
  for (let i = 0; i < expectedServerMac.length; i++) diff |= serverMacBytes[i] ^ expectedServerMac[i];
  if (diff !== 0) return null;
  
  const clientMac = hmac(sha256, sessionKey, encoder.encode("ClientMAC"));
  
  return {
    clientMac: bytesToHex(clientMac),
    sessionKey
  };
}
