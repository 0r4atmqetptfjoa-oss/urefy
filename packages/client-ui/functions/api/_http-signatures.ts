/**
 * @file _http-signatures.ts
 * @description Draft-Cavage HTTP Signatures used by deployed Fediverse servers.
 *
 * Implements standard cryptographic signing and verification of outbound and inbound HTTP requests
 * between federated ActivityPub instances (Mastodon, Lemmy, Pleroma, Peertube, Sovereign Nodes).
 */

import { signMessage, verifySignature, hexToBytes, bytesToHex } from '@aetheris/core-crypto';

export interface ResolvedHttpVerificationKey {
  algorithm: 'ed25519' | 'rsa-sha256';
  publicKey: string;
}

export interface ParsedHttpSignature {
  keyId: string;
  algorithm: string;
  headers: string[];
  signature: string; // base64 or hex
}

/** Maximum allowed clock skew for HTTP request Date header (5 minutes) */
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * Computes the standard HTTP Digest header for a request body (RFC 3230 / RFC 5843).
 * Format: SHA-256=<base64-digest>
 */
export async function computeHttpDigest(body: string | Uint8Array): Promise<string> {
  let rawBytes: Uint8Array;
  if (typeof body === 'string') {
    rawBytes = new TextEncoder().encode(body);
  } else if (body instanceof Uint8Array) {
    rawBytes = body;
  } else {
    rawBytes = new TextEncoder().encode(String(body));
  }

  // Cross-realm safe ArrayBuffer for WebCrypto subtle
  const arrayBuffer = new Uint8Array(rawBytes).buffer;

  let hashBuffer: ArrayBuffer;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  } else {
    throw new Error('WebCrypto subtle is required for HTTP digest calculation');
  }

  const hashBytes = new Uint8Array(hashBuffer);
  let binary = '';
  for (let i = 0; i < hashBytes.length; i++) {
    binary += String.fromCharCode(hashBytes[i]);
  }
  const b64 = btoa(binary);
  return `SHA-256=${b64}`;
}

/**
 * Parses a standard HTTP Signature header string.
 * Example:
 * `keyId="https://peer.eth/actor#main-key",algorithm="ed25519",headers="(request-target) host date digest",signature="..."`
 */
export function parseSignatureHeader(signatureHeader: string): ParsedHttpSignature | null {
  if (!signatureHeader || typeof signatureHeader !== 'string') return null;

  const cleaned = signatureHeader.replace(/^Signature\s+/i, '');
  const params: Record<string, string> = {};

  const regex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cleaned)) !== null) {
    params[match[1]] = match[2];
  }

  if (!params.keyId || !params.signature) {
    return null;
  }

  const headersList = params.headers ? params.headers.toLowerCase().split(/\s+/) : ['date'];

  return {
    keyId: params.keyId,
    algorithm: params.algorithm || 'ed25519',
    headers: headersList,
    signature: params.signature,
  };
}

/**
 * Constructs the canonical signing string according to draft-cavage-http-signatures.
 */
export function buildSigningString(
  headers: Record<string, string>,
  headerNames: string[],
  method: string,
  targetPath: string
): string {
  const lines: string[] = [];

  for (const header of headerNames) {
    const lower = header.toLowerCase();
    if (lower === '(request-target)') {
      lines.push(`(request-target): ${method.toLowerCase()} ${targetPath}`);
    } else {
      const val = headers[lower];
      if (val === undefined) {
        throw new Error(`Required header "${header}" missing from request for signature calculation`);
      }
      lines.push(`${lower}: ${val}`);
    }
  }

  return lines.join('\n');
}

/**
 * Signs an outbound HTTP request using an Ed25519 private key.
 * Returns the formatted Signature header string.
 */
export function signHttpRequest(
  method: string,
  targetPath: string,
  headers: Record<string, string>,
  keyId: string,
  privateKeyHex: string
): string {
  const normalizedHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    normalizedHeaders[k.toLowerCase()] = v;
  }

  const headerNames = ['(request-target)', 'host', 'date', 'digest'].filter(
    (h) => h === '(request-target)' || normalizedHeaders[h] !== undefined
  );

  const signingString = buildSigningString(normalizedHeaders, headerNames, method, targetPath);
  const signatureBytes = signMessage(signingString, privateKeyHex);

  // Encode signature to base64
  let binary = '';
  for (let i = 0; i < signatureBytes.length; i++) {
    binary += String.fromCharCode(signatureBytes[i]);
  }
  const signatureB64 = btoa(binary);

  return `keyId="${keyId}",algorithm="ed25519",headers="${headerNames.join(' ')}",signature="${signatureB64}"`;
}

/** Sign the deployed Fediverse draft-cavage format with an RSA PKCS#8 PEM key. */
export async function signHttpRequestRsa(
  method: string,
  targetPath: string,
  headers: Record<string, string>,
  keyId: string,
  privateKeyPem: string
): Promise<string> {
  const normalizedHeaders = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  const headerNames = ['(request-target)', 'host', 'date', 'digest'];
  const signingString = buildSigningString(normalizedHeaders, headerNames, method, targetPath);
  const pemBody = privateKeyPem
    .replace(new RegExp('-----BEGIN ' + 'PRIVATE KEY-----', 'g'), '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  if (!pemBody) throw new Error('Federation RSA private key must be PKCS#8 PEM');
  const binary = atob(pemBody);
  const der = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) der[i] = binary.charCodeAt(i);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  if ((cryptoKey.algorithm as RsaHashedKeyAlgorithm).modulusLength < 2048) {
    throw new Error('Federation RSA signing keys below 2048 bits are forbidden');
  }
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' }, cryptoKey, new TextEncoder().encode(signingString)
  ));
  let signatureBinary = '';
  for (const byte of signature) signatureBinary += String.fromCharCode(byte);
  return `keyId="${keyId}",algorithm="rsa-sha256",headers="${headerNames.join(' ')}",signature="${btoa(signatureBinary)}"`;
}

/**
 * Verifies an incoming HTTP request signature.
 */
export async function verifyHttpRequestSignature(
  method: string,
  targetPath: string,
  headers: Headers | Record<string, string>,
  rawBody?: string,
  keyResolver?: (keyId: string) => Promise<string | ResolvedHttpVerificationKey | null>
): Promise<{ valid: boolean; keyId?: string; error?: string }> {
  const headerMap: Record<string, string> = {};
  if (headers instanceof Headers) {
    headers.forEach((val, key) => {
      headerMap[key.toLowerCase()] = val;
    });
  } else {
    for (const [k, v] of Object.entries(headers)) {
      headerMap[k.toLowerCase()] = v;
    }
  }

  const sigHeader = headerMap['signature'] || headerMap['authorization'];
  if (!sigHeader) {
    return { valid: false, error: 'Missing Signature or Authorization header' };
  }

  const parsed = parseSignatureHeader(sigHeader);
  if (!parsed) {
    return { valid: false, error: 'Malformed Signature header parameters' };
  }

  const requiredSignedHeaders = ['(request-target)', 'host', 'date', 'digest'];
  if (requiredSignedHeaders.some((name) => !parsed.headers.includes(name))) {
    return { valid: false, keyId: parsed.keyId, error: 'Signature must cover (request-target), host, date, and digest' };
  }

  // 1. Date Header & Clock Skew Validation
  const dateVal = headerMap['date'];
  if (dateVal) {
    const reqTime = Date.parse(dateVal);
    if (isNaN(reqTime) || Math.abs(Date.now() - reqTime) > MAX_CLOCK_SKEW_MS) {
      return { valid: false, keyId: parsed.keyId, error: 'Signature date expired or clock skew exceeded 5 minutes' };
    }
  }

  // 2. Digest Header Verification if body present
  if (rawBody !== undefined && !headerMap['digest']) {
    return { valid: false, keyId: parsed.keyId, error: 'Digest header is required for a signed request body' };
  }
  if (rawBody !== undefined && headerMap['digest']) {
    const expectedDigest = await computeHttpDigest(rawBody);
    if (headerMap['digest'] !== expectedDigest) {
      return { valid: false, keyId: parsed.keyId, error: 'Digest header does not match SHA-256 of payload body' };
    }
  }

  // 3. Resolve Public Key for keyId
  if (!keyResolver) {
    return { valid: false, keyId: parsed.keyId, error: 'No keyResolver provided to authenticate keyId' };
  }

  const resolvedKey = await keyResolver(parsed.keyId);
  if (!resolvedKey) {
    return { valid: false, keyId: parsed.keyId, error: `Public key for keyId ${parsed.keyId} could not be resolved` };
  }

  // 4. Reconstruct Signing String
  let signingString: string;
  try {
    signingString = buildSigningString(headerMap, parsed.headers, method, targetPath);
  } catch (err: any) {
    return { valid: false, keyId: parsed.keyId, error: err?.message || 'Failed to construct signing string' };
  }

  // 5. Verify Ed25519 or RSA-SHA256 signatures used by deployed Fediverse software.
  try {
    let signatureBytes: Uint8Array;
    if (/^[A-Za-z0-9+/=]+$/.test(parsed.signature) && !/^[0-9a-fA-F]{128}$/.test(parsed.signature)) {
      const binary = atob(parsed.signature);
      signatureBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        signatureBytes[i] = binary.charCodeAt(i);
      }
    } else {
      signatureBytes = hexToBytes(parsed.signature);
    }

    const key = typeof resolvedKey === 'string'
      ? { algorithm: 'ed25519' as const, publicKey: resolvedKey }
      : resolvedKey;
    let isValid = false;
    if (key.algorithm === 'rsa-sha256') {
      const pemBody = key.publicKey
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s+/g, '');
      const derBinary = atob(pemBody);
      const der = new Uint8Array(derBinary.length);
      for (let i = 0; i < derBinary.length; i++) der[i] = derBinary.charCodeAt(i);
      const cryptoKey = await crypto.subtle.importKey(
        'spki',
        der,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      );
      if ((cryptoKey.algorithm as RsaHashedKeyAlgorithm).modulusLength < 2048) {
        return { valid: false, keyId: parsed.keyId, error: 'Federation RSA keys below 2048 bits are forbidden' };
      }
      isValid = await crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        cryptoKey,
        new Uint8Array(signatureBytes).buffer,
        new TextEncoder().encode(signingString)
      );
    } else {
      isValid = verifySignature(bytesToHex(signatureBytes), signingString, key.publicKey);
    }
    return { valid: isValid, keyId: parsed.keyId, ...(isValid ? {} : { error: 'Cryptographic signature mismatch' }) };
  } catch (err: any) {
    return { valid: false, keyId: parsed.keyId, error: `Signature verification error: ${err?.message}` };
  }
}
