import { E2EEEngine } from './e2ee.js';
import { encapsulateHybrid, decapsulateHybrid, generateHybridKemKeyPair, type HybridKemKeyPair } from './post-quantum.js';
import { bytesToHex, hexToBytes, computeFingerprint, verifySignature } from './ed25519.js';
import { canonicalizeSignedEnvelopeDigest, canonicalizeJson, createSignedEnvelope, verifySovereignIdentity, type SovereignIdentity, type SovereignKeyPairSet, type SovereignSignedEnvelope } from './identity.js';
import { zeroize } from './security.js';
import { initSenderSession, initReceiverSession, ratchetEncrypt, ratchetDecrypt, type DoubleRatchetSession, type RatchetEncryptedEnvelope } from './double-ratchet.js';
import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';

export const MAX_DIRECT_MESSAGE_BYTES = 192 * 1024;
const UREFY_RATCHET_KDF_INFO = new TextEncoder().encode('UREFY_DOUBLE_RATCHET_BOOTSTRAP_V1');

export interface SealedDirectMessageCopy {
  ephemeralPublicKey: string;
  pqCiphertext: string;
  iv: string;
  ciphertext: string;
}

export interface DirectMessageFrameV1 {
  version: 1;
  id: string;
  sender: string;
  recipient: string;
  senderPublicKey: string;
  recipientPublicKey: string;
  senderCopy: SealedDirectMessageCopy;
  recipientCopy: SealedDirectMessageCopy;
}

export interface DirectMessageBootstrap {
  ephemeralPublicKey: string;
  pqCiphertext: string;
}

export interface DirectMessageFrameV2 {
  version: 2;
  id: string;
  sender: string;
  recipient: string;
  senderPublicKey: string;
  recipientPublicKey: string;
  ratchetEnvelope: RatchetEncryptedEnvelope;
  bootstrap?: DirectMessageBootstrap;
  senderDeviceId?: string;
  recipientDeviceId?: string;
}

export type DirectMessageFrame = DirectMessageFrameV1 | DirectMessageFrameV2;

export interface DirectMessageSendPayload {
  action: 'send';
  message: DirectMessageFrame;
}

export interface DirectMessageKeyRegistration {
  action: 'register';
  identity: SovereignIdentity;
}

export function verifyStoredSignedEnvelope(envelope: SovereignSignedEnvelope): boolean {
  try {
    if (!verifySovereignIdentity(envelope.identity).valid) return false;
    if (!Number.isSafeInteger(envelope.timestamp) || envelope.timestamp < 0 || typeof envelope.nonce !== 'string' || envelope.nonce.length < 16 || envelope.nonce.length > 256) return false;
    return verifySignature(envelope.signature, canonicalizeSignedEnvelopeDigest(envelope), envelope.identity.signingPublicKey);
  } catch { return false; }
}

export function verifyDirectMessageRegistration(envelope: SovereignSignedEnvelope<DirectMessageKeyRegistration>, fingerprint: string): boolean {
  try {
    return verifyStoredSignedEnvelope(envelope) && envelope.payload?.action === 'register' &&
      envelope.identity.fingerprint === fingerprint &&
      canonicalizeJson(envelope.payload.identity) === canonicalizeJson(envelope.identity);
  } catch { return false; }
}

export function validateDirectMessageFrame(frame: DirectMessageFrame): boolean {
  try {
    if (!frame || typeof frame !== 'object') return false;
    if (typeof frame.id !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(frame.id)) return false;
    if (typeof frame.senderPublicKey !== 'string' || typeof frame.recipientPublicKey !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(frame.senderPublicKey) || !/^[0-9a-f]{64}$/i.test(frame.recipientPublicKey)) return false;
    if (computeFingerprint(hexToBytes(frame.senderPublicKey)) !== frame.sender || computeFingerprint(hexToBytes(frame.recipientPublicKey)) !== frame.recipient) return false;

    if (frame.version === 1) {
      if (Object.keys(frame).some(key => !['version', 'id', 'sender', 'recipient', 'senderPublicKey', 'recipientPublicKey', 'senderCopy', 'recipientCopy'].includes(key))) return false;
      return [frame.senderCopy, frame.recipientCopy].every(copy => copy &&
        Object.keys(copy).every(key => ['ephemeralPublicKey', 'pqCiphertext', 'iv', 'ciphertext'].includes(key)) &&
        typeof copy.ephemeralPublicKey === 'string' && typeof copy.pqCiphertext === 'string' && typeof copy.iv === 'string' &&
        /^[0-9a-f]{64}$/i.test(copy.ephemeralPublicKey) &&
        /^[0-9a-f]{2176}$/i.test(copy.pqCiphertext) && /^[0-9a-f]{24}$/i.test(copy.iv) &&
        typeof copy.ciphertext === 'string' && copy.ciphertext.length >= 32 &&
        copy.ciphertext.length <= (MAX_DIRECT_MESSAGE_BYTES + 16) * 2 &&
        copy.ciphertext.length % 2 === 0 && /^[0-9a-f]+$/i.test(copy.ciphertext));
    }

    if (frame.version === 2) {
      const allowedKeys = ['version', 'id', 'sender', 'recipient', 'senderPublicKey', 'recipientPublicKey', 'ratchetEnvelope', 'bootstrap', 'senderDeviceId', 'recipientDeviceId'];
      if (Object.keys(frame).some(key => !allowedKeys.includes(key))) return false;
      if (frame.senderDeviceId !== undefined) {
        if (typeof frame.senderDeviceId !== 'string' || !/^[a-zA-Z0-9_-]{4,64}$/.test(frame.senderDeviceId)) return false;
      }
      if (frame.recipientDeviceId !== undefined) {
        if (typeof frame.recipientDeviceId !== 'string' || !/^[a-zA-Z0-9_-]{4,64}$/.test(frame.recipientDeviceId)) return false;
      }
      const env = frame.ratchetEnvelope;
      if (!env || typeof env !== 'object') return false;
      const envKeys = ['version', 'sessionId', 'senderDHPublicKey', 'senderPqCiphertext', 'messageIndex', 'previousChainLength', 'ciphertext', 'iv', 'tag'];
      if (Object.keys(env).some(key => !envKeys.includes(key))) return false;
      if (env.version !== 3) return false;
      if (typeof env.sessionId !== 'string' || !env.sessionId || env.sessionId.length > 128) return false;
      if (typeof env.senderDHPublicKey !== 'string' || !/^[0-9a-f]{64}$/i.test(env.senderDHPublicKey)) return false;
      if (typeof env.senderPqCiphertext !== 'string' || !/^[0-9a-f]{4544}$/i.test(env.senderPqCiphertext)) return false;
      if (!Number.isSafeInteger(env.messageIndex) || env.messageIndex < 0) return false;
      if (!Number.isSafeInteger(env.previousChainLength) || env.previousChainLength < 0) return false;
      if (typeof env.iv !== 'string' || !/^[0-9a-f]{24}$/i.test(env.iv)) return false;
      if (typeof env.tag !== 'string' || !/^[0-9a-f]{32}$/i.test(env.tag)) return false;
      if (typeof env.ciphertext !== 'string' || env.ciphertext.length < 2 || env.ciphertext.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(env.ciphertext)) return false;
      if (env.ciphertext.length > (MAX_DIRECT_MESSAGE_BYTES + 16) * 2) return false;

      if (frame.bootstrap !== undefined) {
        const b = frame.bootstrap;
        if (!b || typeof b !== 'object') return false;
        if (Object.keys(b).some(k => !['ephemeralPublicKey', 'pqCiphertext'].includes(k))) return false;
        if (typeof b.ephemeralPublicKey !== 'string' || !/^[0-9a-f]{64}$/i.test(b.ephemeralPublicKey)) return false;
        if (typeof b.pqCiphertext !== 'string' || !/^[0-9a-f]{2176}$/i.test(b.pqCiphertext)) return false;
      }
      return true;
    }

    return false;
  } catch { return false; }
}

export function deriveBootstrapRootSecret(sharedSecret: Uint8Array, recipientEncryptionPublicKey: Uint8Array): Uint8Array {
  return hkdf(sha256, sharedSecret, recipientEncryptionPublicKey, UREFY_RATCHET_KDF_INFO, 32);
}

export function initiateSenderDMSession(
  sender: SovereignKeyPairSet,
  recipient: SovereignIdentity
): { session: DoubleRatchetSession; bootstrap: DirectMessageBootstrap } {
  if (!verifySovereignIdentity(sender.identity).valid || !verifySovereignIdentity(recipient).valid) {
    throw new Error('Invalid messaging identity');
  }
  const recipientEncPub = hexToBytes(recipient.encryptionPublicKey);
  const recipientPqPub = hexToBytes(recipient.pqPublicKey);

  const encapsulation = encapsulateHybrid({
    classicalPublicKey: recipientEncPub,
    pqPublicKey: recipientPqPub,
  });

  let rootSecret: Uint8Array;
  try {
    rootSecret = deriveBootstrapRootSecret(encapsulation.sharedSecret, recipientEncPub);
  } finally {
    zeroize(encapsulation.sharedSecret);
  }

  const senderRatchetKeyPair = generateHybridKemKeyPair();
  let session: DoubleRatchetSession;
  try {
    session = initSenderSession(
      senderRatchetKeyPair,
      { classical: recipientEncPub, pq: recipientPqPub },
      rootSecret
    );
  } finally {
    zeroize(rootSecret);
    zeroize(senderRatchetKeyPair.classicalPrivateKey);
    zeroize(senderRatchetKeyPair.pqPrivateKey);
  }

  const bootstrap: DirectMessageBootstrap = {
    ephemeralPublicKey: bytesToHex(encapsulation.ciphertext.classicalEphemeralPublicKey),
    pqCiphertext: bytesToHex(encapsulation.ciphertext.pqCiphertext),
  };

  return { session, bootstrap };
}

export function initiateReceiverDMSession(
  receiver: SovereignKeyPairSet,
  senderIdentity: SovereignIdentity,
  bootstrap: DirectMessageBootstrap
): DoubleRatchetSession {
  if (!verifySovereignIdentity(receiver.identity).valid || !verifySovereignIdentity(senderIdentity).valid) {
    throw new Error('Invalid messaging identity');
  }
  const receiverEncPub = hexToBytes(receiver.identity.encryptionPublicKey);
  const sharedSecret = decapsulateHybrid(
    {
      classicalEphemeralPublicKey: hexToBytes(bootstrap.ephemeralPublicKey),
      pqCiphertext: hexToBytes(bootstrap.pqCiphertext),
    },
    {
      classicalPrivateKey: receiver.encryptionPrivateKey,
      classicalPublicKey: receiverEncPub,
      pqPrivateKey: receiver.pqPrivateKey,
    }
  );

  let rootSecret: Uint8Array;
  try {
    rootSecret = deriveBootstrapRootSecret(sharedSecret, receiverEncPub);
  } finally {
    zeroize(sharedSecret);
  }

  const receiverKeyPair: HybridKemKeyPair = {
    classicalPrivateKey: receiver.encryptionPrivateKey,
    classicalPublicKey: receiverEncPub,
    pqPrivateKey: receiver.pqPrivateKey,
    pqPublicKey: hexToBytes(receiver.identity.pqPublicKey),
  };

  try {
    return initReceiverSession(receiverKeyPair, rootSecret);
  } finally {
    zeroize(rootSecret);
  }
}

export async function encryptRatchetedDirectMessage<T>(
  body: T,
  session: DoubleRatchetSession,
  sender: SovereignKeyPairSet,
  recipient: SovereignIdentity,
  bootstrap?: DirectMessageBootstrap,
  options?: { senderDeviceId?: string; recipientDeviceId?: string }
): Promise<{
  envelope: SovereignSignedEnvelope<DirectMessageSendPayload>;
  session: DoubleRatchetSession;
}> {
  if (!verifySovereignIdentity(sender.identity).valid || !verifySovereignIdentity(recipient).valid) {
    throw new Error('Invalid messaging identity');
  }
  const id = crypto.randomUUID();
  const plaintext = JSON.stringify({ id, sender: sender.identity.fingerprint, recipient: recipient.fingerprint, body });
  if (new TextEncoder().encode(plaintext).byteLength > MAX_DIRECT_MESSAGE_BYTES) {
    throw new Error('Encrypted direct message exceeds the size limit');
  }

  const { session: newSession, envelope: ratchetEnvelope } = await ratchetEncrypt(session, plaintext);

  const message: DirectMessageFrameV2 = {
    version: 2,
    id,
    sender: sender.identity.fingerprint,
    recipient: recipient.fingerprint,
    senderPublicKey: sender.identity.signingPublicKey,
    recipientPublicKey: recipient.signingPublicKey,
    ratchetEnvelope,
    ...(bootstrap ? { bootstrap } : {}),
    ...(options?.senderDeviceId ? { senderDeviceId: options.senderDeviceId } : {}),
    ...(options?.recipientDeviceId ? { recipientDeviceId: options.recipientDeviceId } : {}),
  };

  const envelope = createSignedEnvelope<DirectMessageSendPayload>({ action: 'send', message }, sender);
  return { envelope, session: newSession };
}

export async function decryptRatchetedDirectMessage<T>(
  envelope: SovereignSignedEnvelope<DirectMessageSendPayload>,
  session: DoubleRatchetSession,
  receiver: SovereignKeyPairSet
): Promise<{
  body: T;
  session: DoubleRatchetSession;
}> {
  const message = envelope?.payload?.message;
  if (!verifyStoredSignedEnvelope(envelope) || envelope.payload?.action !== 'send' || !validateDirectMessageFrame(message) ||
      message.sender !== envelope.identity.fingerprint || message.senderPublicKey !== envelope.identity.signingPublicKey) {
    throw new Error('Direct message signature or envelope is invalid');
  }
  if (message.version !== 2) {
    throw new Error('Expected ratcheted direct message frame version 2');
  }
  const isRecipient = receiver.identity.fingerprint === message.recipient && receiver.identity.signingPublicKey === message.recipientPublicKey;
  if (!isRecipient) {
    throw new Error('Only the designated recipient can decrypt a ratcheted direct message');
  }

  const { session: newSession, plaintext } = await ratchetDecrypt(session, message.ratchetEnvelope);
  const decoded = JSON.parse(plaintext);
  if (decoded.id !== message.id || decoded.sender !== message.sender || decoded.recipient !== message.recipient) {
    throw new Error('Direct message context mismatch');
  }
  return { body: decoded.body as T, session: newSession };
}

async function sealCopy(plaintext: string, identity: SovereignIdentity): Promise<SealedDirectMessageCopy> {
  const encapsulation = encapsulateHybrid({ classicalPublicKey: hexToBytes(identity.encryptionPublicKey), pqPublicKey: hexToBytes(identity.pqPublicKey) });
  try {
    const encrypted = await E2EEEngine.encrypt(plaintext, encapsulation.sharedSecret);
    return {
      ephemeralPublicKey: bytesToHex(encapsulation.ciphertext.classicalEphemeralPublicKey),
      pqCiphertext: bytesToHex(encapsulation.ciphertext.pqCiphertext),
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
    };
  } finally { zeroize(encapsulation.sharedSecret); }
}

export async function encryptDirectMessage<T>(body: T, sender: SovereignKeyPairSet, recipient: SovereignIdentity): Promise<SovereignSignedEnvelope<DirectMessageSendPayload>> {
  if (!verifySovereignIdentity(sender.identity).valid || !verifySovereignIdentity(recipient).valid) throw new Error('Invalid messaging identity');
  const id = crypto.randomUUID();
  const plaintext = JSON.stringify({ id, sender: sender.identity.fingerprint, recipient: recipient.fingerprint, body });
  if (new TextEncoder().encode(plaintext).byteLength > MAX_DIRECT_MESSAGE_BYTES) throw new Error('Encrypted direct message exceeds the size limit');
  const [senderCopy, recipientCopy] = await Promise.all([sealCopy(plaintext, sender.identity), sealCopy(plaintext, recipient)]);
  const message: DirectMessageFrameV1 = {
    version: 1, id, sender: sender.identity.fingerprint, recipient: recipient.fingerprint,
    senderPublicKey: sender.identity.signingPublicKey, recipientPublicKey: recipient.signingPublicKey,
    senderCopy, recipientCopy,
  };
  return createSignedEnvelope({ action: 'send', message }, sender);
}

export async function decryptDirectMessage<T>(envelope: SovereignSignedEnvelope<DirectMessageSendPayload>, receiver: SovereignKeyPairSet): Promise<T> {
  const message = envelope?.payload?.message;
  if (!verifyStoredSignedEnvelope(envelope) || envelope.payload.action !== 'send' || !validateDirectMessageFrame(message) ||
      message.sender !== envelope.identity.fingerprint || message.senderPublicKey !== envelope.identity.signingPublicKey) {
    throw new Error('Direct message signature or envelope is invalid');
  }
  if (message.version !== 1) {
    throw new Error('decryptDirectMessage only supports v1 frames; use decryptRatchetedDirectMessage for v2');
  }
  const isSender = receiver.identity.fingerprint === message.sender && receiver.identity.signingPublicKey === message.senderPublicKey;
  const isRecipient = receiver.identity.fingerprint === message.recipient && receiver.identity.signingPublicKey === message.recipientPublicKey;
  if (!isSender && !isRecipient) throw new Error('This identity is not a participant in the conversation');
  const copy = isSender ? message.senderCopy : message.recipientCopy;
  const secret = decapsulateHybrid({ classicalEphemeralPublicKey: hexToBytes(copy.ephemeralPublicKey), pqCiphertext: hexToBytes(copy.pqCiphertext) }, {
    classicalPrivateKey: receiver.encryptionPrivateKey,
    classicalPublicKey: hexToBytes(receiver.identity.encryptionPublicKey),
    pqPrivateKey: receiver.pqPrivateKey,
  });
  try {
    const plaintext = await E2EEEngine.decrypt({ ciphertext: copy.ciphertext, iv: copy.iv, epoch: 0, fingerprint: receiver.identity.fingerprint }, secret);
    const decoded = JSON.parse(plaintext);
    if (decoded.id !== message.id || decoded.sender !== message.sender || decoded.recipient !== message.recipient) throw new Error('Direct message context mismatch');
    return decoded.body as T;
  } finally { zeroize(secret); }
}