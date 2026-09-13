import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { encapsulateHybrid, decapsulateHybrid } from './post-quantum.js';
import { E2EEEngine } from './e2ee.js';
import { signMessage, verifySignature } from './ed25519.js';
import { canonicalizeJson, type SovereignIdentity, type SovereignKeyPairSet } from './identity.js';
import { zeroize } from './security.js';

export interface DeliveryCertificate {
  senderFingerprint: string;
  senderPublicKey: string;
  senderEncryptionKey: string;
  senderPqPublicKey: string;
  recipientFingerprint: string;
  expiresAt: number;
  issuedAt: number;
  certificate: string;
}

export interface SealedSenderEnvelope {
  version: 2;
  recipientFingerprint: string;
  ephemeralPublicKey: string;
  pqSealCiphertext: string;
  sealedContent: string;
  sealIv: string;
}

function getCertDigest(cert: Omit<DeliveryCertificate, 'certificate'>): Uint8Array {
  const json = canonicalizeJson(cert);
  return sha256(new TextEncoder().encode(json));
}

export function createDeliveryCertificate(
  sender: SovereignKeyPairSet,
  recipientFingerprint: string,
  ttlMs: number = 24 * 60 * 60 * 1000
): DeliveryCertificate {
  const now = Date.now();
  const unsigned = {
    senderFingerprint: sender.identity.fingerprint,
    senderPublicKey: sender.identity.signingPublicKey,
    senderEncryptionKey: sender.identity.encryptionPublicKey,
    senderPqPublicKey: sender.identity.pqPublicKey,
    recipientFingerprint,
    issuedAt: now,
    expiresAt: now + ttlMs,
  };

  const digest = getCertDigest(unsigned);
  const signature = signMessage(digest, sender.signingPrivateKey);

  return {
    ...unsigned,
    certificate: bytesToHex(signature)
  };
}

export function verifyDeliveryCertificate(
  cert: DeliveryCertificate,
  now: number = Date.now()
): boolean {
  if (cert.expiresAt < now) return false;

  const unsigned = {
    senderFingerprint: cert.senderFingerprint,
    senderPublicKey: cert.senderPublicKey,
    senderEncryptionKey: cert.senderEncryptionKey,
    senderPqPublicKey: cert.senderPqPublicKey,
    recipientFingerprint: cert.recipientFingerprint,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
  };

  const digest = getCertDigest(unsigned);
  return verifySignature(cert.certificate, digest, hexToBytes(cert.senderPublicKey));
}

export async function sealSenderEnvelope(
  innerPayload: unknown,
  certificate: DeliveryCertificate,
  senderKeySet: SovereignKeyPairSet,
  recipientIdentity: SovereignIdentity
): Promise<SealedSenderEnvelope> {
  const innerMsg = JSON.stringify({ certificate, payload: innerPayload });
  const innerBytes = new TextEncoder().encode(innerMsg);

  const { ciphertext, sharedSecret } = encapsulateHybrid({
    classicalPublicKey: hexToBytes(recipientIdentity.encryptionPublicKey),
    pqPublicKey: hexToBytes(recipientIdentity.pqPublicKey),
  });

  const iv = crypto.getRandomValues(new Uint8Array(12));

  let sealedBytes: ArrayBuffer;
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(sharedSecret),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    sealedBytes = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      innerBytes
    );
  } finally {
    zeroize(sharedSecret);
  }

  return {
    version: 2,
    recipientFingerprint: recipientIdentity.fingerprint,
    ephemeralPublicKey: bytesToHex(ciphertext.classicalEphemeralPublicKey),
    pqSealCiphertext: bytesToHex(ciphertext.pqCiphertext),
    sealedContent: bytesToHex(new Uint8Array(sealedBytes)),
    sealIv: bytesToHex(iv),
  };
}

export async function unsealSenderEnvelope(
  envelope: SealedSenderEnvelope,
  recipientKeySet: SovereignKeyPairSet
): Promise<{
  payload: unknown;
  certificate: DeliveryCertificate;
  senderFingerprint: string;
}> {
  if (envelope.recipientFingerprint !== recipientKeySet.identity.fingerprint) {
    throw new Error('Recipient fingerprint mismatch');
  }

  const sharedSecret = decapsulateHybrid(
    {
      classicalEphemeralPublicKey: hexToBytes(envelope.ephemeralPublicKey),
      pqCiphertext: hexToBytes(envelope.pqSealCiphertext),
    },
    {
      classicalPrivateKey: recipientKeySet.encryptionPrivateKey,
      pqPrivateKey: recipientKeySet.pqPrivateKey,
    }
  );

  const iv = hexToBytes(envelope.sealIv);
  const sealedBytes = hexToBytes(envelope.sealedContent);

  let decryptedBytes: ArrayBuffer;
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(sharedSecret),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    decryptedBytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      cryptoKey,
      new Uint8Array(sealedBytes)
    );
  } catch (err) {
    zeroize(sharedSecret);
    throw new Error('Decryption failed');
  }
  zeroize(sharedSecret);

  const decryptedText = new TextDecoder().decode(decryptedBytes);
  const parsed = JSON.parse(decryptedText);

  if (!verifyDeliveryCertificate(parsed.certificate)) {
    throw new Error('Invalid or expired delivery certificate');
  }

  if (parsed.certificate.recipientFingerprint !== envelope.recipientFingerprint) {
    throw new Error('Certificate recipient mismatch');
  }

  return {
    payload: parsed.payload,
    certificate: parsed.certificate,
    senderFingerprint: parsed.certificate.senderFingerprint,
  };
}
