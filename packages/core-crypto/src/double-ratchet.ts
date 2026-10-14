import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { hkdf } from '@noble/hashes/hkdf';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { x25519 } from '@noble/curves/ed25519';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { generateHybridKemKeyPair, HybridKemKeyPair } from './post-quantum.js';
import { E2EEEngine, AES_256_KEY_BYTES, AES_GCM_IV_BYTES } from './e2ee.js';
import { zeroize, timingSafeEqual } from './security.js';

export interface DoubleRatchetSession {
  DHSendingKeyPair: { publicKey: Uint8Array; privateKey: Uint8Array; pqPublicKey: Uint8Array; pqPrivateKey: Uint8Array };
  DHReceivingPublicKey: Uint8Array | null;
  DHReceivingPqPublicKey: Uint8Array | null;
  rootKey: Uint8Array;
  sendingChainKey: Uint8Array | null;
  receivingChainKey: Uint8Array | null;
  sendCount: number;
  receiveCount: number;
  previousSendCount: number;
  skippedMessageKeys: Map<string, Uint8Array>;
  sessionId: string;
  initiator: boolean;
  epoch: number;
  currentPqCiphertext?: string;
}

export interface RatchetEncryptedEnvelope {
  version: 3;
  sessionId: string;
  senderDHPublicKey: string;
  senderPqCiphertext: string;
  messageIndex: number;
  previousChainLength: number;
  ciphertext: string;
  iv: string;
  tag: string;
}

export const MAX_SKIP_MESSAGES = 1000;
export const MAX_TOTAL_SKIPPED_KEYS = 1000;

function kdfRootKey(rootKey: Uint8Array, dhOutput: Uint8Array): { newRootKey: Uint8Array; chainKey: Uint8Array } {
  const info = new TextEncoder().encode('Aetheris-DoubleRatchet-Root');
  const derived = hkdf(sha256, rootKey, dhOutput, info, 64);
  const newRootKey = new Uint8Array(derived.subarray(0, 32));
  const chainKey = new Uint8Array(derived.subarray(32, 64));
  zeroize(derived);
  return { newRootKey, chainKey };
}

function kdfChainKey(chainKey: Uint8Array): { nextChainKey: Uint8Array; messageKey: Uint8Array } {
  const mkInput = new Uint8Array([1]);
  const ckInput = new Uint8Array([2]);
  const messageKey = hmac(sha256, chainKey, mkInput);
  const nextChainKey = hmac(sha256, chainKey, ckInput);
  return { nextChainKey, messageKey };
}

export function initSenderSession(localKeyPair: HybridKemKeyPair, remotePublicKey: { classical: Uint8Array; pq: Uint8Array }, sharedSecret: Uint8Array): DoubleRatchetSession {
  const classical_ss = x25519.getSharedSecret(localKeyPair.classicalPrivateKey, remotePublicKey.classical);
  const pqEnc = ml_kem768.encapsulate(remotePublicKey.pq);
  
  const ikm = new Uint8Array(64);
  ikm.set(classical_ss, 0);
  ikm.set(pqEnc.sharedSecret, 32);
  const dhOutput = sha256(ikm);
  
  const { newRootKey, chainKey } = kdfRootKey(sharedSecret, dhOutput);
  
  zeroize(classical_ss);
  zeroize(pqEnc.sharedSecret);
  zeroize(ikm);
  
  return {
    DHSendingKeyPair: {
      publicKey: new Uint8Array(localKeyPair.classicalPublicKey),
      privateKey: new Uint8Array(localKeyPair.classicalPrivateKey),
      pqPublicKey: new Uint8Array(localKeyPair.pqPublicKey),
      pqPrivateKey: new Uint8Array(localKeyPair.pqPrivateKey),
    },
    DHReceivingPublicKey: new Uint8Array(remotePublicKey.classical),
    DHReceivingPqPublicKey: new Uint8Array(remotePublicKey.pq),
    rootKey: newRootKey,
    sendingChainKey: chainKey,
    receivingChainKey: null,
    sendCount: 0,
    receiveCount: 0,
    previousSendCount: 0,
    skippedMessageKeys: new Map(),
    sessionId: bytesToHex(crypto.getRandomValues(new Uint8Array(16))),
    initiator: true,
    epoch: 1,
    currentPqCiphertext: bytesToHex(localKeyPair.pqPublicKey) + bytesToHex(pqEnc.cipherText),
  };
}

export function initReceiverSession(localKeyPair: HybridKemKeyPair, sharedSecret: Uint8Array): DoubleRatchetSession {
  return {
    DHSendingKeyPair: {
      publicKey: new Uint8Array(localKeyPair.classicalPublicKey),
      privateKey: new Uint8Array(localKeyPair.classicalPrivateKey),
      pqPublicKey: new Uint8Array(localKeyPair.pqPublicKey),
      pqPrivateKey: new Uint8Array(localKeyPair.pqPrivateKey),
    },
    DHReceivingPublicKey: null,
    DHReceivingPqPublicKey: null,
    rootKey: new Uint8Array(sharedSecret),
    sendingChainKey: null,
    receivingChainKey: null,
    sendCount: 0,
    receiveCount: 0,
    previousSendCount: 0,
    skippedMessageKeys: new Map(),
    sessionId: bytesToHex(crypto.getRandomValues(new Uint8Array(16))),
    initiator: false,
    epoch: 1,
  };
}

const ML_KEM_768_PUBKEY_BYTES = 1184;
const ML_KEM_768_CIPHERTEXT_BYTES = 1088;
const PACKED_PQ_HEADER_BYTES = ML_KEM_768_PUBKEY_BYTES + ML_KEM_768_CIPHERTEXT_BYTES; // 2272 bytes

async function performDHRatchetStep(
  session: DoubleRatchetSession,
  peerDHPublicKey: Uint8Array,
  peerPqPublicKey: Uint8Array
): Promise<{ session: DoubleRatchetSession; pqCiphertext: Uint8Array }> {
  // 1. Generate fresh classical X25519 ephemeral keypair
  const newClassicalPriv = x25519.utils.randomPrivateKey();
  const newClassicalPub = x25519.getPublicKey(newClassicalPriv);

  // 2. Generate fresh Post-Quantum ML-KEM-768 keypair for true PQ Post-Compromise Security
  const newPqKeys = ml_kem768.keygen();

  // 3. Hybrid X25519 + ML-KEM-768 encapsulation against peer's current public keys
  const classical_ss = x25519.getSharedSecret(newClassicalPriv, peerDHPublicKey);
  const pqEnc = ml_kem768.encapsulate(peerPqPublicKey);

  const ikm = new Uint8Array(64);
  ikm.set(classical_ss, 0);
  ikm.set(pqEnc.sharedSecret, 32);
  const dhOutput = sha256(ikm);

  const { newRootKey, chainKey } = kdfRootKey(session.rootKey, dhOutput);

  // Zeroize ephemeral shared secrets immediately
  zeroize(classical_ss);
  zeroize(pqEnc.sharedSecret);
  zeroize(ikm);
  zeroize(dhOutput);

  const newSession: DoubleRatchetSession = {
    ...session,
    epoch: session.epoch + 1,
    DHSendingKeyPair: {
      publicKey: newClassicalPub,
      privateKey: newClassicalPriv,
      pqPublicKey: new Uint8Array(newPqKeys.publicKey),
      pqPrivateKey: new Uint8Array(newPqKeys.secretKey),
    },
    rootKey: newRootKey,
    sendingChainKey: chainKey,
    previousSendCount: session.sendCount,
    sendCount: 0,
    DHReceivingPublicKey: new Uint8Array(peerDHPublicKey),
    DHReceivingPqPublicKey: new Uint8Array(peerPqPublicKey),
    skippedMessageKeys: new Map(session.skippedMessageKeys),
    currentPqCiphertext: bytesToHex(newPqKeys.publicKey) + bytesToHex(pqEnc.cipherText),
  };

  return { session: newSession, pqCiphertext: pqEnc.cipherText };
}

async function aesGcmEncrypt(plaintext: string, keyBytes: Uint8Array): Promise<{ ciphertext: string; iv: string; tag: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const key = await crypto.subtle.importKey('raw', new Uint8Array(keyBytes), { name: 'AES-GCM' }, false, ['encrypt']);
  const encryptedBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, encoded);
  const encrypted = new Uint8Array(encryptedBuf);
  
  const cipherOnly = encrypted.subarray(0, encrypted.length - 16);
  const tagOnly = encrypted.subarray(encrypted.length - 16);
  
  return {
    ciphertext: bytesToHex(cipherOnly),
    iv: bytesToHex(iv),
    tag: bytesToHex(tagOnly)
  };
}

async function aesGcmDecrypt(ciphertextHex: string, tagHex: string, ivHex: string, keyBytes: Uint8Array): Promise<string> {
  const cipher = hexToBytes(ciphertextHex);
  const tag = hexToBytes(tagHex);
  const iv = hexToBytes(ivHex);
  
  const encrypted = new Uint8Array(cipher.length + tag.length);
  encrypted.set(cipher, 0);
  encrypted.set(tag, cipher.length);
  
  const key = await crypto.subtle.importKey('raw', new Uint8Array(keyBytes), { name: 'AES-GCM' }, false, ['decrypt']);
  const decryptedBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv), tagLength: 128 }, key, new Uint8Array(encrypted));
  return new TextDecoder().decode(decryptedBuf);
}

export async function ratchetEncrypt(session: DoubleRatchetSession, plaintext: string): Promise<{ session: DoubleRatchetSession; envelope: RatchetEncryptedEnvelope }> {
  let currentSession = session;
  if (!currentSession.sendingChainKey) {
    if (!currentSession.DHReceivingPublicKey || !currentSession.DHReceivingPqPublicKey) {
      throw new Error('Cannot perform DH ratchet step: missing peer public keys');
    }
    const step = await performDHRatchetStep(currentSession, currentSession.DHReceivingPublicKey, currentSession.DHReceivingPqPublicKey);
    currentSession = step.session;
  }
  
  const { nextChainKey, messageKey } = kdfChainKey(currentSession.sendingChainKey!);
  
  const { ciphertext, iv, tag } = await aesGcmEncrypt(plaintext, messageKey);
  zeroize(messageKey);
  
  const envelope: RatchetEncryptedEnvelope = {
    version: 3,
    sessionId: currentSession.sessionId,
    senderDHPublicKey: bytesToHex(currentSession.DHSendingKeyPair.publicKey),
    senderPqCiphertext: currentSession.currentPqCiphertext || '',
    messageIndex: currentSession.sendCount,
    previousChainLength: currentSession.previousSendCount,
    ciphertext,
    iv,
    tag
  };
  
  const newSession: DoubleRatchetSession = {
    ...currentSession,
    sendingChainKey: nextChainKey,
    sendCount: currentSession.sendCount + 1,
    skippedMessageKeys: new Map(currentSession.skippedMessageKeys)
  };
  
  return { session: newSession, envelope };
}

function skipMessageKeys(session: DoubleRatchetSession, untilIndex: number): DoubleRatchetSession {
  if (!Number.isSafeInteger(untilIndex) || untilIndex < 0) {
    throw new Error('Invalid untilIndex: must be a non-negative safe integer');
  }

  let currentSession = session;
  if (currentSession.receiveCount + MAX_SKIP_MESSAGES < untilIndex) {
    throw new Error('Too many skipped messages');
  }
  
  const skipped = new Map(currentSession.skippedMessageKeys);
  let chainKey = currentSession.receivingChainKey!;
  
  while (currentSession.receiveCount < untilIndex) {
    const { nextChainKey, messageKey } = kdfChainKey(chainKey);
    const peerPubHex = bytesToHex(currentSession.DHReceivingPublicKey!);
    
    // Enforce bounded skipped-key storage via FIFO eviction with zeroization
    if (skipped.size >= MAX_TOTAL_SKIPPED_KEYS) {
      const oldestKey = skipped.keys().next().value;
      if (oldestKey !== undefined) {
        const oldKeyVal = skipped.get(oldestKey);
        if (oldKeyVal) zeroize(oldKeyVal);
        skipped.delete(oldestKey);
      }
    }
    
    skipped.set(`${peerPubHex}:${currentSession.receiveCount}`, messageKey);
    chainKey = nextChainKey;
    currentSession = { ...currentSession, receiveCount: currentSession.receiveCount + 1 };
  }
  
  return { ...currentSession, receivingChainKey: chainKey, skippedMessageKeys: skipped };
}

export async function ratchetDecrypt(session: DoubleRatchetSession, envelope: RatchetEncryptedEnvelope): Promise<{ session: DoubleRatchetSession; plaintext: string }> {
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('Invalid envelope: must be an object');
  }
  if (!Number.isSafeInteger(envelope.messageIndex) || envelope.messageIndex < 0) {
    throw new Error('Invalid messageIndex in envelope: must be a non-negative safe integer');
  }
  if (!Number.isSafeInteger(envelope.previousChainLength) || envelope.previousChainLength < 0) {
    throw new Error('Invalid previousChainLength in envelope: must be a non-negative safe integer');
  }

  let currentSession = session;
  const peerPubHex = envelope.senderDHPublicKey;
  const msgKeyStr = `${peerPubHex}:${envelope.messageIndex}`;
  
  if (currentSession.skippedMessageKeys.has(msgKeyStr)) {
    const messageKey = currentSession.skippedMessageKeys.get(msgKeyStr)!;
    const plaintext = await aesGcmDecrypt(envelope.ciphertext, envelope.tag, envelope.iv, messageKey);
    const newSkipped = new Map(currentSession.skippedMessageKeys);
    newSkipped.delete(msgKeyStr);
    zeroize(messageKey);
    return { session: { ...currentSession, skippedMessageKeys: newSkipped }, plaintext };
  }
  
  const envelopeDHPublicKey = hexToBytes(envelope.senderDHPublicKey);
  const currentPeerPubHex = currentSession.DHReceivingPublicKey ? bytesToHex(currentSession.DHReceivingPublicKey) : null;
  
  if (peerPubHex !== currentPeerPubHex) {
    if (currentSession.DHReceivingPublicKey) {
        currentSession = skipMessageKeys(currentSession, envelope.previousChainLength);
    }
    
    const payload = hexToBytes(envelope.senderPqCiphertext);
    if (payload.length < PACKED_PQ_HEADER_BYTES) {
      throw new Error(`Malformed PQ ratchet payload: expected ${PACKED_PQ_HEADER_BYTES} bytes, got ${payload.length}`);
    }
    const pqPub = payload.subarray(0, ML_KEM_768_PUBKEY_BYTES);
    const pqCiphertext = payload.subarray(ML_KEM_768_PUBKEY_BYTES, PACKED_PQ_HEADER_BYTES);
    
    const classical_ss = x25519.getSharedSecret(currentSession.DHSendingKeyPair.privateKey, envelopeDHPublicKey);
    const pq_ss = ml_kem768.decapsulate(pqCiphertext, currentSession.DHSendingKeyPair.pqPrivateKey);
    
    const ikm = new Uint8Array(64);
    ikm.set(classical_ss, 0);
    ikm.set(pq_ss, 32);
    const dhOutput = sha256(ikm);
    
    const { newRootKey, chainKey } = kdfRootKey(currentSession.rootKey, dhOutput);
    
    zeroize(classical_ss);
    zeroize(pq_ss);
    zeroize(ikm);
    zeroize(dhOutput);
    
    currentSession = {
      ...currentSession,
      rootKey: newRootKey,
      receivingChainKey: chainKey,
      DHReceivingPublicKey: envelopeDHPublicKey,
      DHReceivingPqPublicKey: pqPub, // Extracted from packed string
      receiveCount: 0,
      sendingChainKey: null,
      skippedMessageKeys: new Map(currentSession.skippedMessageKeys)
    };
  } else if (envelope.messageIndex < currentSession.receiveCount) {
    // If peer public key has not changed and messageIndex is less than receiveCount,
    // and it was not found in skippedMessageKeys, it is an already-consumed or expired replayed message!
    throw new Error('Replayed or duplicate message index');
  }
  
  currentSession = skipMessageKeys(currentSession, envelope.messageIndex);
  
  const { nextChainKey, messageKey } = kdfChainKey(currentSession.receivingChainKey!);
  
  const plaintext = await aesGcmDecrypt(envelope.ciphertext, envelope.tag, envelope.iv, messageKey);
  zeroize(messageKey);
  
  const newSession: DoubleRatchetSession = {
    ...currentSession,
    receivingChainKey: nextChainKey,
    receiveCount: currentSession.receiveCount + 1,
    skippedMessageKeys: new Map(currentSession.skippedMessageKeys)
  };
  
  return { session: newSession, plaintext };
}

export interface SerializedDoubleRatchetSession {
  version: 1;
  sessionId: string;
  initiator: boolean;
  epoch: number;
  sendCount: number;
  receiveCount: number;
  previousSendCount: number;
  currentPqCiphertext?: string;
  rootKey: string;
  sendingChainKey: string | null;
  receivingChainKey: string | null;
  DHSendingKeyPair: {
    publicKey: string;
    privateKey: string;
    pqPublicKey: string;
    pqPrivateKey: string;
  };
  DHReceivingPublicKey: string | null;
  DHReceivingPqPublicKey: string | null;
  skippedMessageKeys: Array<[string, string]>;
}

/**
 * Serializes an in-memory DoubleRatchetSession into a persistent JSON string for encrypted storage.
 */
export function serializeDoubleRatchetSession(session: DoubleRatchetSession): string {
  if (!session || typeof session !== 'object') {
    throw new Error('Invalid DoubleRatchetSession to serialize');
  }
  const skippedList: Array<[string, string]> = [];
  for (const [k, v] of session.skippedMessageKeys.entries()) {
    skippedList.push([k, bytesToHex(v)]);
  }

  const serialized: SerializedDoubleRatchetSession = {
    version: 1,
    sessionId: session.sessionId,
    initiator: session.initiator,
    epoch: session.epoch,
    sendCount: session.sendCount,
    receiveCount: session.receiveCount,
    previousSendCount: session.previousSendCount,
    currentPqCiphertext: session.currentPqCiphertext,
    rootKey: bytesToHex(session.rootKey),
    sendingChainKey: session.sendingChainKey ? bytesToHex(session.sendingChainKey) : null,
    receivingChainKey: session.receivingChainKey ? bytesToHex(session.receivingChainKey) : null,
    DHSendingKeyPair: {
      publicKey: bytesToHex(session.DHSendingKeyPair.publicKey),
      privateKey: bytesToHex(session.DHSendingKeyPair.privateKey),
      pqPublicKey: bytesToHex(session.DHSendingKeyPair.pqPublicKey),
      pqPrivateKey: bytesToHex(session.DHSendingKeyPair.pqPrivateKey),
    },
    DHReceivingPublicKey: session.DHReceivingPublicKey ? bytesToHex(session.DHReceivingPublicKey) : null,
    DHReceivingPqPublicKey: session.DHReceivingPqPublicKey ? bytesToHex(session.DHReceivingPqPublicKey) : null,
    skippedMessageKeys: skippedList,
  };

  return JSON.stringify(serialized);
}

/**
 * Deserializes and strictly validates a persistent JSON string into an in-memory DoubleRatchetSession.
 */
export function deserializeDoubleRatchetSession(json: string): DoubleRatchetSession {
  if (typeof json !== 'string' || !json.trim()) {
    throw new Error('Invalid serialized session JSON: string required');
  }
  const raw = JSON.parse(json) as SerializedDoubleRatchetSession;
  if (!raw || typeof raw !== 'object' || raw.version !== 1) {
    throw new Error('Unsupported or corrupted ratchet session format');
  }

  if (typeof raw.sessionId !== 'string' || !raw.sessionId || typeof raw.initiator !== 'boolean' ||
      !Number.isSafeInteger(raw.sendCount) || raw.sendCount < 0 ||
      !Number.isSafeInteger(raw.receiveCount) || raw.receiveCount < 0 ||
      !Number.isSafeInteger(raw.previousSendCount) || raw.previousSendCount < 0 ||
      !Number.isSafeInteger(raw.epoch) || raw.epoch < 0) {
    throw new Error('Corrupted numeric or boolean fields in ratchet session');
  }

  if (!raw.rootKey || !/^[0-9a-f]{64}$/i.test(raw.rootKey)) {
    throw new Error('Invalid rootKey in serialized session');
  }

  const kp = raw.DHSendingKeyPair;
  if (!kp || !/^[0-9a-f]{64}$/i.test(kp.publicKey) || !/^[0-9a-f]{64}$/i.test(kp.privateKey) ||
      !/^[0-9a-f]{2368}$/i.test(kp.pqPublicKey) || !/^[0-9a-f]{4800}$/i.test(kp.pqPrivateKey)) {
    throw new Error('Invalid DHSendingKeyPair in serialized session');
  }

  if (raw.sendingChainKey !== null && (!raw.sendingChainKey || !/^[0-9a-f]{64}$/i.test(raw.sendingChainKey))) {
    throw new Error('Invalid sendingChainKey in serialized session');
  }
  if (raw.receivingChainKey !== null && (!raw.receivingChainKey || !/^[0-9a-f]{64}$/i.test(raw.receivingChainKey))) {
    throw new Error('Invalid receivingChainKey in serialized session');
  }

  if (raw.DHReceivingPublicKey !== null && (!raw.DHReceivingPublicKey || !/^[0-9a-f]{64}$/i.test(raw.DHReceivingPublicKey))) {
    throw new Error('Invalid DHReceivingPublicKey in serialized session');
  }
  if (raw.DHReceivingPqPublicKey !== null && (!raw.DHReceivingPqPublicKey || !/^[0-9a-f]{2368}$/i.test(raw.DHReceivingPqPublicKey))) {
    throw new Error('Invalid DHReceivingPqPublicKey in serialized session');
  }

  if (!Array.isArray(raw.skippedMessageKeys) || raw.skippedMessageKeys.length > MAX_TOTAL_SKIPPED_KEYS) {
    throw new Error('Invalid or oversized skippedMessageKeys in serialized session');
  }

  const skippedMap = new Map<string, Uint8Array>();
  for (const item of raw.skippedMessageKeys) {
    if (!Array.isArray(item) || item.length !== 2 || typeof item[0] !== 'string' || !/^[0-9a-f]{64}$/i.test(item[1])) {
      throw new Error('Corrupted skipped message key entry');
    }
    skippedMap.set(item[0], hexToBytes(item[1]));
  }

  return {
    sessionId: raw.sessionId,
    initiator: raw.initiator,
    epoch: raw.epoch,
    sendCount: raw.sendCount,
    receiveCount: raw.receiveCount,
    previousSendCount: raw.previousSendCount,
    currentPqCiphertext: raw.currentPqCiphertext,
    rootKey: hexToBytes(raw.rootKey),
    sendingChainKey: raw.sendingChainKey ? hexToBytes(raw.sendingChainKey) : null,
    receivingChainKey: raw.receivingChainKey ? hexToBytes(raw.receivingChainKey) : null,
    DHSendingKeyPair: {
      publicKey: hexToBytes(kp.publicKey),
      privateKey: hexToBytes(kp.privateKey),
      pqPublicKey: hexToBytes(kp.pqPublicKey),
      pqPrivateKey: hexToBytes(kp.pqPrivateKey),
    },
    DHReceivingPublicKey: raw.DHReceivingPublicKey ? hexToBytes(raw.DHReceivingPublicKey) : null,
    DHReceivingPqPublicKey: raw.DHReceivingPqPublicKey ? hexToBytes(raw.DHReceivingPqPublicKey) : null,
    skippedMessageKeys: skippedMap,
  };
}
