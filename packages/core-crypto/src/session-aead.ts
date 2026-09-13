import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { timingSafeEqual, zeroize } from './security.js';

export interface SessionContext {
  sessionId: string;            // UUID v4
  sessionKey: Uint8Array;       // 32 bytes
  localFingerprint: string;
  remoteFingerprint: string;
  createdAt: number;
  messageCounter: number;
}

export interface SessionBoundEnvelope {
  version: 3;
  sessionId: string;
  messageIndex: number;
  ciphertext: string;
  iv: string;
  sessionTag: string;
  localFingerprint: string;
  remoteFingerprint: string;
  timestamp: number;
}

export function createSessionContext(
  localFingerprint: string,
  remoteFingerprint: string,
  sharedSessionKey: Uint8Array
): SessionContext {
  if (sharedSessionKey.length !== 32) {
    throw new Error('Session key must be 32 bytes');
  }
  return {
    sessionId: crypto.randomUUID(),
    sessionKey: new Uint8Array(sharedSessionKey),
    localFingerprint,
    remoteFingerprint,
    createdAt: Date.now(),
    messageCounter: 0
  };
}

export function deriveSessionTag(sessionKey: Uint8Array, sessionId: string): Uint8Array {
  const info = new TextEncoder().encode('UREFY_SESSION_BINDING_V3');
  const salt = new TextEncoder().encode(sessionId);
  return hkdf(sha256, sessionKey, salt, info, 16);
}

export async function encryptWithSession(
  plaintext: string,
  context: SessionContext
): Promise<{ envelope: SessionBoundEnvelope; context: SessionContext }> {
  const messageIndex = context.messageCounter;

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const info = new TextEncoder().encode(`UREFY_MSG_KEY_v3:${context.sessionId}:${messageIndex}`);
  const messageKey = hkdf(sha256, context.sessionKey, iv, info, 32);

  let sealedBytes: ArrayBuffer;
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(messageKey),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    sealedBytes = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      cryptoKey,
      new TextEncoder().encode(plaintext)
    );
  } finally {
    zeroize(messageKey);
  }

  const sessionTag = deriveSessionTag(context.sessionKey, context.sessionId);

  const envelope: SessionBoundEnvelope = {
    version: 3,
    sessionId: context.sessionId,
    messageIndex,
    ciphertext: bytesToHex(new Uint8Array(sealedBytes)),
    iv: bytesToHex(iv),
    sessionTag: bytesToHex(sessionTag),
    localFingerprint: context.localFingerprint,
    remoteFingerprint: context.remoteFingerprint,
    timestamp: Date.now()
  };

  return {
    envelope,
    context: { ...context, messageCounter: context.messageCounter + 1 }
  };
}

export async function decryptWithSession(
  envelope: SessionBoundEnvelope,
  context: SessionContext
): Promise<{ plaintext: string; context: SessionContext }> {
  if (envelope.sessionId !== context.sessionId) {
    throw new Error('Session ID mismatch');
  }

  if (envelope.localFingerprint !== context.remoteFingerprint) {
    throw new Error('Sender fingerprint mismatch');
  }

  if (envelope.remoteFingerprint !== context.localFingerprint) {
    throw new Error('Recipient fingerprint mismatch');
  }

  const expectedTag = deriveSessionTag(context.sessionKey, context.sessionId);
  const actualTag = hexToBytes(envelope.sessionTag);

  if (!timingSafeEqual(expectedTag, actualTag)) {
    throw new Error('Session binding violation');
  }

  if (envelope.messageIndex < context.messageCounter) {
    throw new Error('Message replay detected');
  }

  const iv = hexToBytes(envelope.iv);
  const info = new TextEncoder().encode(`UREFY_MSG_KEY_v3:${context.sessionId}:${envelope.messageIndex}`);
  const messageKey = hkdf(sha256, context.sessionKey, iv, info, 32);

  let decryptedBytes: ArrayBuffer;
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(messageKey),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    decryptedBytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      cryptoKey,
      new Uint8Array(hexToBytes(envelope.ciphertext))
    );
  } catch (err) {
    zeroize(messageKey);
    throw new Error('Decryption failed');
  }
  zeroize(messageKey);

  const plaintext = new TextDecoder().decode(decryptedBytes);

  return {
    plaintext,
    context: { ...context, messageCounter: envelope.messageIndex + 1 }
  };
}
