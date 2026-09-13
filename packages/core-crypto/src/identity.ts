// ===========================================================================
// AETHERIS OMNI-SPHERE — UNIFIED SOVEREIGN IDENTITY & SIGNED ENVELOPE PROTOCOL
// Schema:
// Identity
// ├── fingerprint (SHA-256 of signing public key, 16-hex chars)
// ├── signing public key (Ed25519, 64-hex chars)
// ├── encryption public key (X25519, 64-hex chars)
// ├── PQ public key (ML-KEM-768, 2368-hex chars)
// ├── credential bindings (FIDO2 / WebAuthn bindings)
// └── capabilities (e.g. 'post:create', 'post:vote', 'channel:create', 'storage:upload', 'relay:publish')
// ===========================================================================

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { generateKeyPair, computeFingerprint, signMessage, verifySignature } from './ed25519.js';
import { generateHybridKemKeyPair } from './post-quantum.js';
import { zeroize } from './security.js';

export type IdentityCapability =
  | 'post:create'
  | 'post:vote'
  | 'channel:create'
  | 'storage:upload'
  | 'storage:delete'
  | 'relay:publish'
  | 'dm:send'
  | 'node:telemetry'
  | 'admin:manage'
  | '*'
  | string;

export interface CredentialBinding {
  type: 'webauthn' | 'hardware' | 'passkey' | 'delegated';
  id: string;
  algorithm: string;
  boundAt: number;
  counter?: number;
  metadata?: Record<string, string>;
}

export interface SovereignIdentity {
  version: string;
  fingerprint: string;          // 16-hex chars (8 bytes) derived from SHA-256(signingPublicKey)
  signingPublicKey: string;     // 64-hex chars (32 bytes Ed25519)
  encryptionPublicKey: string;  // 64-hex chars (32 bytes X25519)
  pqPublicKey: string;          // 2368-hex chars (1184 bytes ML-KEM-768)
  credentialBindings: CredentialBinding[];
  capabilities: IdentityCapability[];
  createdAt: number;
}

export interface SovereignKeyPairSet {
  identity: SovereignIdentity;
  signingPrivateKey: Uint8Array;     // Ed25519 private key (32 bytes)
  encryptionPrivateKey: Uint8Array;  // X25519 private key (32 bytes)
  pqPrivateKey: Uint8Array;          // ML-KEM-768 secret key (2400 bytes)
}

export interface SovereignSignedEnvelope<T = any> {
  version?: 1 | 2;
  payload: T;
  signature: string;        // 128-hex chars (64 bytes Ed25519 signature)
  nonce: string;            // Cryptographic random hex nonce (at least 32 hex chars)
  timestamp: number;        // Unix millisecond timestamp
  identity: SovereignIdentity; // Full sovereign identity descriptor
}

export interface EnvelopeVerificationResult<T = any> {
  authorized: boolean;
  payload?: T;
  identity?: SovereignIdentity;
  fingerprint?: string;
  identityBinding?: 'full' | 'signing-key';
  stage: 'signature' | 'fingerprint' | 'authorization' | 'replay' | 'complete';
  error?: string;
}

export const SOVEREIGN_IDENTITY_VERSION = 'v8';

export const DEFAULT_SOVEREIGN_CAPABILITIES: IdentityCapability[] = [
  'post:create',
  'post:vote',
  'channel:create',
  'storage:upload',
  'storage:delete',
  'relay:publish',
  'dm:send',
  'node:telemetry',
];

/**
 * Deterministically serializes any JavaScript object or primitive into canonical JSON,
 * sorting object keys lexicographically so hashes match across environments.
 */
export const MAX_CANONICAL_DEPTH = 64;
export const MAX_CANONICAL_NODES = 100000;
export const MAX_CANONICAL_BYTES = 2 * 1024 * 1024;

export function canonicalizeJson(obj: unknown): string {
  const ancestors = new Set<object>();
  const encoder = new TextEncoder();
  let nodes = 0;
  let bytes = 0;
  const emit = (text: string): string => {
    if (text.length > MAX_CANONICAL_BYTES) throw new Error('Canonical JSON size limit exceeded');
    bytes += encoder.encode(text).byteLength;
    if (bytes > MAX_CANONICAL_BYTES) throw new Error('Canonical JSON size limit exceeded');
    return text;
  };
  const serialize = (value: unknown, depth: number): string => {
    if (depth > MAX_CANONICAL_DEPTH) throw new Error('Canonical JSON depth limit exceeded');
    if (++nodes > MAX_CANONICAL_NODES) throw new Error('Canonical JSON node limit exceeded');
    if (value === null || typeof value === 'boolean') return emit(JSON.stringify(value));
    if (typeof value === 'string') {
      if (value.length > MAX_CANONICAL_BYTES) throw new Error('Canonical JSON size limit exceeded');
      return emit(JSON.stringify(value));
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new Error('Canonical JSON numbers must be finite');
      return emit(JSON.stringify(value));
    }
    if (typeof value !== 'object') throw new Error('Canonical JSON requires JSON-compatible values');
    if (ancestors.has(value)) throw new Error('Canonical JSON cannot contain cycles');
    const isArray = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (!isArray && prototype !== Object.prototype && prototype !== null) throw new Error('Canonical JSON requires plain objects');
    ancestors.add(value);
    try {
      const parts = [emit(isArray ? '[' : '{')];
      const keys = isArray ? null : Object.keys(value).sort();
      const length = isArray ? value.length : keys!.length;
      if (length > MAX_CANONICAL_NODES) throw new Error('Canonical JSON node limit exceeded');
      let count = 0;
      for (let index = 0; index < length; index++) {
        const key = isArray ? String(index) : keys![index];
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor && !('value' in descriptor)) throw new Error('Canonical JSON cannot contain accessors');
        const child = descriptor?.value;
        if (!isArray && child === undefined) continue;
        if (count++) parts.push(emit(','));
        if (!isArray) parts.push(emit(JSON.stringify(key)), emit(':'));
        parts.push(serialize(child === undefined ? null : child, depth + 1));
      }
      parts.push(emit(isArray ? ']' : '}'));
      return parts.join('');
    } finally {
      ancestors.delete(value);
    }
  };
  return serialize(obj, 0);
}

/**
 * Computes the canonical SHA-256 digest bytes for envelope signing and verification.
 */
export function canonicalizeEnvelopeDigest<T>(
  payload: T,
  nonce: string,
  timestamp: number,
  fingerprint: string,
  capabilities: IdentityCapability[]
): Uint8Array {
  const canonicalObject = {
    capabilities: [...capabilities].sort(),
    fingerprint,
    nonce,
    payload,
    timestamp,
  };
  const canonicalString = canonicalizeJson(canonicalObject);
  return sha256(new TextEncoder().encode(canonicalString));
}

export function canonicalizeSignedEnvelopeDigest<T>(
  envelope: Pick<SovereignSignedEnvelope<T>, 'version' | 'payload' | 'nonce' | 'timestamp' | 'identity'>
): Uint8Array {
  if (envelope.version === 2) {
    return sha256(new TextEncoder().encode(canonicalizeJson({
      domain: 'UREFY_SIGNED_ENVELOPE_V2', version: 2, payload: envelope.payload,
      nonce: envelope.nonce, timestamp: envelope.timestamp, identity: envelope.identity,
    })));
  }
  if (envelope.version !== undefined && envelope.version !== 1) throw new Error('Unsupported signed envelope version');
  return canonicalizeEnvelopeDigest(envelope.payload, envelope.nonce, envelope.timestamp, envelope.identity.fingerprint, envelope.identity.capabilities);
}

/**
 * Generates a random cryptographic nonce.
 */
export function generateEnvelopeNonce(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    throw new Error('Cryptographically secure PRNG (crypto.getRandomValues) is required');
  }
  return bytesToHex(bytes);
}

/**
 * Creates a complete Sovereign Identity and keypair set.
 * If a seed is supplied, all keys (signing, encryption, PQ) are deterministically derived.
 */
export function createSovereignIdentity(options?: {
  seed?: Uint8Array;
  capabilities?: IdentityCapability[];
  credentialBindings?: CredentialBinding[];
  createdAt?: number;
}): SovereignKeyPairSet {
  const edKeyPair = generateKeyPair(options?.seed);
  const hybridKem = generateHybridKemKeyPair(options?.seed);

  const signingPublicKey = edKeyPair.publicKeyHex;
  const encryptionPublicKey = bytesToHex(hybridKem.classicalPublicKey);
  const pqPublicKey = bytesToHex(hybridKem.pqPublicKey);
  const fingerprint = edKeyPair.fingerprint;

  const identity: SovereignIdentity = {
    version: SOVEREIGN_IDENTITY_VERSION,
    fingerprint,
    signingPublicKey,
    encryptionPublicKey,
    pqPublicKey,
    credentialBindings: options?.credentialBindings || [],
    capabilities: options?.capabilities || [...DEFAULT_SOVEREIGN_CAPABILITIES],
    createdAt: options?.createdAt || Date.now(),
  };

  return {
    identity,
    signingPrivateKey: edKeyPair.privateKey,
    encryptionPrivateKey: hybridKem.classicalPrivateKey,
    pqPrivateKey: hybridKem.pqPrivateKey,
  };
}

/**
 * Validates the internal consistency and key format of a SovereignIdentity descriptor.
 */
export function verifySovereignIdentity(identity: SovereignIdentity): { valid: boolean; error?: string } {
  if (!identity || typeof identity !== 'object') {
    return { valid: false, error: 'Identity must be an object' };
  }

  const publicFields = ['version', 'fingerprint', 'signingPublicKey', 'encryptionPublicKey', 'pqPublicKey', 'credentialBindings', 'capabilities', 'createdAt'];
  if (Object.keys(identity).some(field => !publicFields.includes(field))) return { valid: false, error: 'Identity contains unsupported public fields' };
  if (identity.version !== SOVEREIGN_IDENTITY_VERSION || !Number.isSafeInteger(identity.createdAt) || identity.createdAt < 0 ||
      !Array.isArray(identity.credentialBindings) || identity.credentialBindings.length > 32) {
    return { valid: false, error: 'Invalid identity version, timestamp or credential bindings' };
  }
  if ((['fingerprint', 'signingPublicKey', 'encryptionPublicKey', 'pqPublicKey'] as const).some(field => typeof identity[field] !== 'string')) {
    return { valid: false, error: 'Identity public keys must use hexadecimal strings' };
  }

  if (!/^[0-9a-fA-F]{16}$/.test(identity.fingerprint)) {
    return { valid: false, error: 'Invalid fingerprint: must be 16 hexadecimal characters (8 bytes)' };
  }

  if (!/^[0-9a-fA-F]{64}$/.test(identity.signingPublicKey)) {
    return { valid: false, error: 'Invalid signingPublicKey: must be 64 hexadecimal characters (32 bytes Ed25519)' };
  }

  if (!/^[0-9a-fA-F]{64}$/.test(identity.encryptionPublicKey)) {
    return { valid: false, error: 'Invalid encryptionPublicKey: must be 64 hexadecimal characters (32 bytes X25519)' };
  }

  if (!/^[0-9a-fA-F]{2368}$/.test(identity.pqPublicKey)) {
    return { valid: false, error: 'Invalid pqPublicKey: must be 2368 hexadecimal characters (1184 bytes ML-KEM-768)' };
  }

  const pubBytes = hexToBytes(identity.signingPublicKey);
  const derivedFingerprint = computeFingerprint(pubBytes);
  if (derivedFingerprint !== identity.fingerprint) {
    return { valid: false, error: 'Fingerprint does not match signing public key hash derivation' };
  }

  if (!Array.isArray(identity.capabilities) || identity.capabilities.length > 64 ||
      identity.capabilities.some(capability => typeof capability !== 'string' || !capability.length || capability.length > 128)) {
    return { valid: false, error: 'Invalid capability collection' };
  }

  return { valid: true };
}

/**
 * Checks whether a given identity possesses a specific capability (supports wildcard '*').
 */
export function hasCapability(identity: SovereignIdentity, capability?: string): boolean {
  if (!capability) return true;
  if (!identity || !Array.isArray(identity.capabilities)) return false;
  return identity.capabilities.includes('*') || identity.capabilities.includes(capability);
}

/**
 * Creates a SovereignSignedEnvelope by signing the canonical digest of the payload, nonce,
 * timestamp, and identity metadata with the identity's Ed25519 private key.
 */
export function createSignedEnvelope<T>(
  payload: T,
  keySet: SovereignKeyPairSet,
  options?: { nonce?: string; timestamp?: number; version?: 1 | 2 }
): SovereignSignedEnvelope<T> {
  const nonce = options?.nonce !== undefined ? options.nonce : generateEnvelopeNonce();
  const timestamp = options?.timestamp !== undefined ? options.timestamp : Date.now();
  if (typeof nonce !== 'string' || nonce.length < 16 || nonce.length > 256) throw new Error('Invalid signing nonce');
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) throw new Error('Invalid signing timestamp');
  if (!verifySovereignIdentity(keySet.identity).valid) throw new Error('Invalid signing identity');
  if (options?.version !== undefined && options.version !== 1 && options.version !== 2) throw new Error('Unsupported signed envelope version');
  const identity = JSON.parse(canonicalizeJson(keySet.identity)) as SovereignIdentity;
  const snapshot = JSON.parse(canonicalizeJson(payload)) as T;
  const unsigned = { payload: snapshot, nonce, timestamp, identity, ...(options?.version === 2 ? { version: 2 as const } : {}) };
  const digest = canonicalizeSignedEnvelopeDigest(unsigned);

  const sigBytes = signMessage(digest, keySet.signingPrivateKey);
  const signature = bytesToHex(sigBytes);
  if (!verifySignature(signature, digest, identity.signingPublicKey)) throw new Error('Signing key does not match the identity');
  return { ...unsigned, signature };
}

/**
 * Verifies a SovereignSignedEnvelope following the strict 5-stage sequential pipeline:
 * 1. Signature: Validates Ed25519 signature over canonical digest.
 * 2. Fingerprint: Confirms fingerprint === SHA-256(signingPublicKey).
 * 3. Authorization: Confirms identity has required capability.
 * 4. Replay: Verifies timestamp window (default ±5 min) and checks nonce freshness.
 * 5. Action: Complete verification result returned.
 */
export function verifySignedEnvelope<T>(
  envelope: SovereignSignedEnvelope<T>,
  options?: {
    requiredCapability?: string;
    requireIdentityBinding?: boolean;
    maxDriftMs?: number;
    seenNonces?: Set<string> | { has(k: string): boolean; add(k: string): any };
  }
): EnvelopeVerificationResult<T> {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { authorized: false, stage: 'signature', error: 'Envelope must be an object' };
  }

  const { payload, signature, nonce, timestamp, identity } = envelope;
  if (options?.requireIdentityBinding && envelope.version !== 2) {
    return { authorized: false, stage: 'signature', error: 'Identity-bound v2 envelope required' };
  }
  if (envelope.version !== undefined && envelope.version !== 1 && envelope.version !== 2) {
    return { authorized: false, stage: 'signature', error: 'Unsupported signed envelope version' };
  }
  const maxDrift = options?.maxDriftMs ?? 300000;
  if (!Number.isSafeInteger(timestamp) || timestamp < 0 || !Number.isSafeInteger(maxDrift) || maxDrift < 0) {
    return { authorized: false, stage: 'replay', error: 'Timestamp and clock-skew policy must be non-negative safe integers' };
  }
  if (typeof nonce !== 'string' || nonce.length < 16 || nonce.length > 256) {
    return { authorized: false, stage: 'replay', error: 'Nonce must contain between 16 and 256 characters' };
  }
  if (!Array.isArray(identity?.capabilities) || identity.capabilities.length > 64 ||
      identity.capabilities.some(capability => typeof capability !== 'string' || !capability.length || capability.length > 128)) {
    return { authorized: false, stage: 'authorization', error: 'Invalid capability collection' };
  }

  // 1. Stage 1: Signature Format & Cryptographic Validation
  if (typeof signature !== 'string' || !/^[0-9a-fA-F]{128}$/.test(signature)) {
    return { authorized: false, stage: 'signature', error: 'Invalid signature format: expected 128-hex chars' };
  }

  if (typeof identity?.signingPublicKey !== 'string' || !/^[0-9a-fA-F]{64}$/.test(identity.signingPublicKey)) {
    return { authorized: false, stage: 'signature', error: 'Invalid signingPublicKey: expected 64-hex chars' };
  }

  let digest: Uint8Array;
  try {
    if (envelope.version === 2 && !verifySovereignIdentity(identity).valid) {
      return { authorized: false, stage: 'fingerprint', error: 'Invalid bound identity descriptor' };
    }
    digest = canonicalizeSignedEnvelopeDigest(envelope);
  } catch {
    return { authorized: false, stage: 'signature', error: 'Payload cannot be canonically encoded' };
  }

  const pubBytes = hexToBytes(identity.signingPublicKey);
  const isSignatureValid = verifySignature(signature, digest, pubBytes);
  if (!isSignatureValid) {
    return { authorized: false, stage: 'signature', error: 'Cryptographic signature verification failed' };
  }

  // 2. Stage 2: Fingerprint Verification
  const derivedFingerprint = computeFingerprint(pubBytes);
  if (derivedFingerprint !== identity.fingerprint) {
    return {
      authorized: false,
      stage: 'fingerprint',
      error: 'Identity spoofing detected: fingerprint mismatch with signing public key',
    };
  }

  // 3. Stage 3: Authorization (Capabilities)
  if (options?.requiredCapability && !hasCapability(identity, options.requiredCapability)) {
    return {
      authorized: false,
      stage: 'authorization',
      fingerprint: identity.fingerprint,
      identity,
      error: `Missing required capability: "${options.requiredCapability}"`,
    };
  }

  // 4. Stage 4: Replay Protection (Timestamp Drift & Nonce Freshness)
  const drift = Math.abs(Date.now() - timestamp);
  if (drift > maxDrift) {
    return {
      authorized: false,
      stage: 'replay',
      fingerprint: identity.fingerprint,
      identity,
      error: `Request expired or excessive clock drift (${Math.round(drift / 1000)}s > ${maxDrift / 1000}s limit)`,
    };
  }

  if (options?.seenNonces) {
    if (options.seenNonces.has(nonce)) {
      return {
        authorized: false,
        stage: 'replay',
        fingerprint: identity.fingerprint,
        identity,
        error: `Replay attack detected: duplicate nonce "${nonce}"`,
      };
    }
    options.seenNonces.add(nonce);
  }

  // 5. Stage 5: Action Allowed
  return {
    authorized: true,
    stage: 'complete',
    payload,
    identity,
    fingerprint: identity.fingerprint,
    identityBinding: envelope.version === 2 ? 'full' : 'signing-key',
  };
}

/**
 * Safely wipes secret keys contained in a SovereignKeyPairSet from memory.
 */
export function zeroizeKeyPairSet(keySet: SovereignKeyPairSet): void {
  if (keySet.signingPrivateKey) zeroize(keySet.signingPrivateKey);
  if (keySet.encryptionPrivateKey) zeroize(keySet.encryptionPrivateKey);
  if (keySet.pqPrivateKey) zeroize(keySet.pqPrivateKey);
}
