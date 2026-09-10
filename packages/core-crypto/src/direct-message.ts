import { E2EEEngine } from './e2ee.js';
import { encapsulateHybrid, decapsulateHybrid } from './post-quantum.js';
import { bytesToHex, hexToBytes, computeFingerprint, verifySignature } from './ed25519.js';
import { canonicalizeSignedEnvelopeDigest, canonicalizeJson, createSignedEnvelope, verifySovereignIdentity, type SovereignIdentity, type SovereignKeyPairSet, type SovereignSignedEnvelope } from './identity.js';
import { zeroize } from './security.js';

export const MAX_DIRECT_MESSAGE_BYTES = 192 * 1024;

export interface SealedDirectMessageCopy {
  ephemeralPublicKey: string;
  pqCiphertext: string;
  iv: string;
  ciphertext: string;
}

export interface DirectMessageFrame {
  version: 1;
  id: string;
  sender: string;
  recipient: string;
  senderPublicKey: string;
  recipientPublicKey: string;
  senderCopy: SealedDirectMessageCopy;
  recipientCopy: SealedDirectMessageCopy;
}

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
    if (frame?.version !== 1 || typeof frame.id !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(frame.id)) return false;
    if (Object.keys(frame).some(key => !['version', 'id', 'sender', 'recipient', 'senderPublicKey', 'recipientPublicKey', 'senderCopy', 'recipientCopy'].includes(key))) return false;
    if (typeof frame.senderPublicKey !== 'string' || typeof frame.recipientPublicKey !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(frame.senderPublicKey) || !/^[0-9a-f]{64}$/i.test(frame.recipientPublicKey)) return false;
    if (computeFingerprint(hexToBytes(frame.senderPublicKey)) !== frame.sender || computeFingerprint(hexToBytes(frame.recipientPublicKey)) !== frame.recipient) return false;
    return [frame.senderCopy, frame.recipientCopy].every(copy => copy &&
      Object.keys(copy).every(key => ['ephemeralPublicKey', 'pqCiphertext', 'iv', 'ciphertext'].includes(key)) &&
      typeof copy.ephemeralPublicKey === 'string' && typeof copy.pqCiphertext === 'string' && typeof copy.iv === 'string' &&
      /^[0-9a-f]{64}$/i.test(copy.ephemeralPublicKey) &&
      /^[0-9a-f]{2176}$/i.test(copy.pqCiphertext) && /^[0-9a-f]{24}$/i.test(copy.iv) &&
      typeof copy.ciphertext === 'string' && copy.ciphertext.length >= 32 &&
      copy.ciphertext.length <= (MAX_DIRECT_MESSAGE_BYTES + 16) * 2 &&
      copy.ciphertext.length % 2 === 0 && /^[0-9a-f]+$/i.test(copy.ciphertext));
  } catch { return false; }
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
  const message: DirectMessageFrame = {
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