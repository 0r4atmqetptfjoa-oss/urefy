/**
 * @file verify-trust.ts
 * @package @aetheris/client-ui/functions/api
 * @description Cloudflare Pages Edge Function for Sovereign ZK-RLN Trust Score Verification.
 * Micro-service enabling zero-infrastructure external verification of portable Groth16
 * reputation certificates over the BN254 curve with temporal, domain, and threshold constraints.
 */

import {
  verifyPortableReputationCertificate,
  PortableReputationCertificate,
} from '@aetheris/core-crypto';

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
};

/**
 * Validates certificate temporal bounds, threshold criteria, and domain context,
 * then executes bilinear pairing Groth16 cryptographic verification.
 */
export async function validateAndVerifyCertificate(
  cert: PortableReputationCertificate,
  expectedThreshold?: number,
  expectedDomain?: string
): Promise<{ valid: boolean; error?: string }> {
  // 1. Structural check
  if (!cert || typeof cert !== 'object') {
    return { valid: false, error: 'Certificate must be a valid JSON object' };
  }
  if (cert.version !== '1.0') {
    return { valid: false, error: `Unsupported certificate version: ${cert.version || 'unknown'}` };
  }
  if (!cert.proof || !Array.isArray(cert.publicInputs) || cert.publicInputs.length !== 4) {
    return { valid: false, error: 'Malformed Groth16 proof or public inputs in certificate' };
  }

  // 2. Temporal validation (with 60s clock drift tolerance)
  const now = Date.now();
  if (typeof cert.expiresAt === 'number' && cert.expiresAt <= now) {
    return { valid: false, error: 'Certificate has expired' };
  }
  if (typeof cert.issuedAt === 'number' && cert.issuedAt > now + 60000) {
    return { valid: false, error: 'Certificate issuedAt is in the future' };
  }

  // 3. Threshold check
  const thresholdRequirement = expectedThreshold ?? cert.threshold;
  if (typeof cert.threshold !== 'number' || cert.threshold < thresholdRequirement) {
    return {
      valid: false,
      error: `Certificate threshold (${cert.threshold}) does not meet required threshold (${thresholdRequirement})`,
    };
  }

  // 4. Domain match check
  const domainRequirement = expectedDomain ?? cert.domain;
  if (domainRequirement && cert.domain !== domainRequirement) {
    return {
      valid: false,
      error: `Certificate domain (${cert.domain}) does not match expected domain (${domainRequirement})`,
    };
  }

  // 5. Cryptographic Groth16 proof verification over BN254
  const isCryptographicallyValid = await verifyPortableReputationCertificate(
    cert,
    thresholdRequirement,
    domainRequirement
  );

  if (!isCryptographicallyValid) {
    return { valid: false, error: 'Cryptographic proof verification failed (invalid curve point or pairing)' };
  }

  return { valid: true };
}

/**
 * POST /api/verify-trust
 * Body: { certificate: PortableReputationCertificate | string, expectedThreshold?: number, domain?: string }
 */
export async function onRequestPost(context: { request: Request; env?: any }): Promise<Response> {
  try {
    let body: any;
    const contentType = context.request.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      body = await context.request.json().catch(() => null);
    } else {
      const text = await context.request.text().catch(() => '');
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }

    if (!body || !body.certificate) {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: 'Missing certificate in request payload',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let cert: PortableReputationCertificate;
    if (typeof body.certificate === 'string') {
      try {
        cert = JSON.parse(body.certificate);
      } catch {
        try {
          cert = JSON.parse(atob(body.certificate));
        } catch {
          return new Response(
            JSON.stringify({
              success: false,
              verified: false,
              error: 'Invalid certificate encoding: expected JSON or base64 JSON',
            }),
            { status: 400, headers: CORS_HEADERS }
          );
        }
      }
    } else {
      cert = body.certificate;
    }

    const expectedThreshold = typeof body.expectedThreshold === 'number' ? body.expectedThreshold : undefined;
    const expectedDomain = body.domain || undefined;

    const result = await validateAndVerifyCertificate(cert, expectedThreshold, expectedDomain);

    if (!result.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: result.error,
        }),
        { status: 422, headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        threshold: cert.threshold,
        domain: cert.domain,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        nullifier: cert.nullifier,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        verified: false,
        error: err.message || 'Internal server error verifying trust certificate',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * GET /api/verify-trust?cert=<base64_json>&domain=<domain>&threshold=<threshold>
 */
export async function onRequestGet(context: { request: Request; env?: any }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const certParam = url.searchParams.get('cert');
    const domainParam = url.searchParams.get('domain') || undefined;
    const thresholdParam = url.searchParams.get('threshold');

    if (!certParam) {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: 'Missing required query parameter: cert',
          usage: 'GET /api/verify-trust?cert=<base64_json>&domain=<domain>&threshold=<threshold>',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let certJson: string;
    try {
      certJson = atob(certParam);
    } catch {
      try {
        certJson = decodeURIComponent(certParam);
      } catch {
        certJson = certParam;
      }
    }

    let cert: PortableReputationCertificate;
    try {
      cert = JSON.parse(certJson);
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: 'Malformed certificate parameter (not valid JSON)',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const expectedThreshold = thresholdParam ? parseInt(thresholdParam, 10) : undefined;
    const result = await validateAndVerifyCertificate(cert, expectedThreshold, domainParam);

    if (!result.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: result.error,
        }),
        { status: 422, headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        threshold: cert.threshold,
        domain: cert.domain,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        nullifier: cert.nullifier,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        verified: false,
        error: err.message || 'Internal server error verifying trust certificate',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * OPTIONS /api/verify-trust (CORS Preflight)
 */
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequest(context: { request: Request; env?: any }): Promise<Response> {
  const method = context.request.method.toUpperCase();
  if (method === 'OPTIONS') return onRequestOptions();
  if (method === 'POST') return onRequestPost(context);
  if (method === 'GET') return onRequestGet(context);
  return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), {
    status: 405,
    headers: CORS_HEADERS,
  });
}
