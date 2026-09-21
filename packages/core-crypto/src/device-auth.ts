/**
 * UREfy PASS 7.3.4 — Device Authority Separation & Root-Signed Device Certificates
 * 
 * Provides cryptographic separation between Sovereign Root Authority (derived from the
 * 12-word recovery mnemonic) and Physical Device Authority (unique Ed25519 keypair per installation).
 */

import { generateKeyPair, signMessage, verifySignature } from './ed25519.js';
import { canonicalizeJson, generateEnvelopeNonce, type SovereignKeyPairSet } from './identity.js';

export interface DeviceKeypair {
  deviceId: string;
  publicKeyHex: string; // 64-hex Ed25519
  privateKeyHex: string; // 64-hex Ed25519
}

export interface DeviceCertificate {
  version: 1;
  identityFingerprint: string;
  deviceId: string;
  devicePublicKey: string; // 64-hex Ed25519
  deviceLabel: string;
  issuedAt: number;
}

export interface DeviceSignedEnvelope<T = any> {
  version: 2;
  authType: 'device';
  identityFingerprint: string;
  deviceId: string;
  devicePublicKey: string;
  payload: T;
  signature: string; // 128-hex Ed25519 signature
  nonce: string;
  timestamp: number;
}

export interface DeviceEnvelopeVerificationResult<T = any> {
  authorized: boolean;
  stage?: 'signature' | 'format' | 'replay' | 'authorization';
  payload?: T;
  identityFingerprint?: string;
  deviceId?: string;
  devicePublicKey?: string;
  error?: string;
}

/**
 * Generates an independent, installation-unique Ed25519 keypair for physical device authority.
 */
export function generateDeviceKeypair(customDeviceId?: string): DeviceKeypair {
  const kp = generateKeyPair();
  const deviceId = customDeviceId && /^[a-zA-Z0-9_-]{4,64}$/.test(customDeviceId)
    ? customDeviceId
    : `dev_${kp.fingerprint}${Date.now().toString(16).slice(-4)}`;

  return {
    deviceId,
    publicKeyHex: kp.publicKeyHex,
    privateKeyHex: kp.privateKeyHex,
  };
}

/**
 * Computes the canonical digest for a DeviceCertificate.
 */
export function canonicalizeDeviceCertificateDigest(cert: DeviceCertificate): Uint8Array {
  const raw = canonicalizeJson({
    version: cert.version,
    identityFingerprint: cert.identityFingerprint,
    deviceId: cert.deviceId,
    devicePublicKey: cert.devicePublicKey.toLowerCase(),
    deviceLabel: cert.deviceLabel,
    issuedAt: cert.issuedAt,
  });
  return new TextEncoder().encode(`UREFY_DEVICE_CERT_V1:${raw}`);
}

/**
 * Sovereign root authority issues and signs a DeviceCertificate binding this physical device keypair
 * to the sovereign identity.
 */
export function issueDeviceCertificate(
  rootKeySet: SovereignKeyPairSet,
  deviceId: string,
  devicePublicKey: string,
  deviceLabel?: string
): { certificate: DeviceCertificate; signature: string } {
  if (!/^[0-9a-fA-F]{64}$/.test(devicePublicKey)) {
    throw new Error('Device public key must be 64-hex Ed25519');
  }
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(deviceId)) {
    throw new Error('Invalid device ID format');
  }

  const certificate: DeviceCertificate = {
    version: 1,
    identityFingerprint: rootKeySet.identity.fingerprint,
    deviceId,
    devicePublicKey: devicePublicKey.toLowerCase(),
    deviceLabel: (deviceLabel || 'Physical Device').slice(0, 100),
    issuedAt: Date.now(),
  };

  const digest = canonicalizeDeviceCertificateDigest(certificate);
  const sigBytes = signMessage(digest, rootKeySet.signingPrivateKey);
  const signature = Array.from(sigBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  return { certificate, signature };
}

/**
 * Verifies a root-signed DeviceCertificate against the sovereign root signing key.
 */
export function verifyDeviceCertificate(
  certificate: DeviceCertificate,
  signature: string,
  rootSigningPublicKey: string
): boolean {
  if (!certificate || certificate.version !== 1) return false;
  if (typeof signature !== 'string' || !/^[0-9a-fA-F]{128}$/.test(signature)) return false;
  if (!/^[0-9a-fA-F]{64}$/.test(rootSigningPublicKey)) return false;
  if (!/^[0-9a-fA-F]{64}$/.test(certificate.devicePublicKey)) return false;

  try {
    const digest = canonicalizeDeviceCertificateDigest(certificate);
    return verifySignature(signature, digest, rootSigningPublicKey);
  } catch {
    return false;
  }
}

/**
 * Computes the canonical digest for a DeviceSignedEnvelope.
 */
export function canonicalizeDeviceEnvelopeDigest(envelope: Omit<DeviceSignedEnvelope, 'signature'>): Uint8Array {
  const raw = canonicalizeJson({
    version: envelope.version,
    authType: 'device',
    identityFingerprint: envelope.identityFingerprint,
    deviceId: envelope.deviceId,
    devicePublicKey: envelope.devicePublicKey.toLowerCase(),
    payload: envelope.payload,
    nonce: envelope.nonce,
    timestamp: envelope.timestamp,
  });
  return new TextEncoder().encode(`UREFY_DEVICE_ENVELOPE_V2:${raw}`);
}

/**
 * Creates a DeviceSignedEnvelope signed by the physical device private key for routine DM traffic.
 */
export function createDeviceSignedEnvelope<T>(
  payload: T,
  deviceKeypair: DeviceKeypair,
  identityFingerprint: string,
  options?: { nonce?: string; timestamp?: number }
): DeviceSignedEnvelope<T> {
  const nonce = options?.nonce || generateEnvelopeNonce();
  const timestamp = options?.timestamp || Date.now();

  const unsigned: Omit<DeviceSignedEnvelope<T>, 'signature'> = {
    version: 2,
    authType: 'device',
    identityFingerprint,
    deviceId: deviceKeypair.deviceId,
    devicePublicKey: deviceKeypair.publicKeyHex.toLowerCase(),
    payload,
    nonce,
    timestamp,
  };

  const digest = canonicalizeDeviceEnvelopeDigest(unsigned);
  const sigBytes = signMessage(digest, deviceKeypair.privateKeyHex);
  const signature = Array.from(sigBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    ...unsigned,
    signature,
  };
}

/**
 * Verifies a DeviceSignedEnvelope against its embedded device public key, checking signature, format, and timestamp.
 */
export function verifyDeviceSignedEnvelope<T>(
  envelope: DeviceSignedEnvelope<T>,
  options?: { maxDriftMs?: number }
): DeviceEnvelopeVerificationResult<T> {
  if (!envelope || typeof envelope !== 'object' || envelope.authType !== 'device' || envelope.version !== 2) {
    return { authorized: false, stage: 'format', error: 'Invalid device-signed envelope' };
  }

  const { identityFingerprint, deviceId, devicePublicKey, signature, nonce, timestamp, payload } = envelope;

  if (typeof identityFingerprint !== 'string' || !/^[0-9a-fA-F]{16}$/.test(identityFingerprint)) {
    return { authorized: false, stage: 'format', error: 'Invalid identity fingerprint' };
  }
  if (typeof deviceId !== 'string' || !/^[a-zA-Z0-9_-]{4,64}$/.test(deviceId)) {
    return { authorized: false, stage: 'format', error: 'Invalid device ID format' };
  }
  if (typeof devicePublicKey !== 'string' || !/^[0-9a-fA-F]{64}$/.test(devicePublicKey)) {
    return { authorized: false, stage: 'format', error: 'Invalid device public key format' };
  }
  if (typeof signature !== 'string' || !/^[0-9a-fA-F]{128}$/.test(signature)) {
    return { authorized: false, stage: 'signature', error: 'Invalid device signature format' };
  }
  if (typeof nonce !== 'string' || nonce.length < 16 || nonce.length > 256) {
    return { authorized: false, stage: 'replay', error: 'Invalid envelope nonce' };
  }

  const maxDrift = options?.maxDriftMs ?? 300000;
  const drift = Math.abs(Date.now() - timestamp);
  if (drift > maxDrift) {
    return { authorized: false, stage: 'replay', error: `Timestamp outside acceptable freshness window: delta ${drift}ms` };
  }

  try {
    const digest = canonicalizeDeviceEnvelopeDigest({
      version: 2,
      authType: 'device',
      identityFingerprint,
      deviceId,
      devicePublicKey: devicePublicKey.toLowerCase(),
      payload,
      nonce,
      timestamp,
    });
    const valid = verifySignature(signature, digest, devicePublicKey);
    if (!valid) {
      return { authorized: false, stage: 'signature', error: 'Device cryptographic signature verification failed' };
    }
  } catch {
    return { authorized: false, stage: 'signature', error: 'Failed to verify device signature' };
  }

  return {
    authorized: true,
    payload,
    identityFingerprint,
    deviceId,
    devicePublicKey: devicePublicKey.toLowerCase(),
  };
}
