/**
 * @file scan-binary.ts
 * @package @aetheris/client-ui/functions/api
 * @description Cloudflare Pages Edge Function for Sovereign Binary Hygiene & Packer Detection (/scan Micro-SaaS API).
 * Accepts raw binary streams (application/octet-stream), multipart file uploads, or JSON payloads (hex/base64),
 * computes Shannon entropy, scans for UPX/packer signatures, parses PE/ELF/Mach-O headers,
 * and returns comprehensive static hygiene verdicts with zero server infrastructure costs.
 */

import {
  calculateShannonEntropy,
  inspectBinary,
  scanPackerSignatures,
  computeFileChecksums,
  BinaryFormat,
} from '@aetheris/vault-engine';

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-File-Name',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
};

/**
 * Converts a hex string to a Uint8Array safely without external dependencies.
 */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const len = clean.length;
  const bytes = new Uint8Array(Math.floor(len / 2));
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Converts a base64 string to a Uint8Array safely.
 */
function base64ToBytes(b64: string): Uint8Array {
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Inspects a binary payload and returns a comprehensive hygiene classification.
 */
export function analyzeBinaryPayload(data: Uint8Array, fileName: string = 'payload.bin') {
  const checksums = computeFileChecksums(data);
  const overallEntropy = calculateShannonEntropy(data);

  // 1. Header parsing (PE, ELF, Mach-O)
  const inspection = inspectBinary(data);
  let format: string = inspection.format;
  let architecture: string = inspection.architecture;

  if (format === 'UNKNOWN' && data.length >= 4) {
    const b0 = data[0];
    const b1 = data[1];
    const b2 = data[2];
    const b3 = data[3];

    if (
      (b0 === 0xfe && b1 === 0xed && b2 === 0xfa && (b3 === 0xce || b3 === 0xcf)) ||
      (b0 === 0xcf && b1 === 0xfa && b2 === 0xed && b3 === 0xfe) ||
      (b0 === 0xce && b1 === 0xfa && b2 === 0xed && b3 === 0xfe)
    ) {
      format = 'Mach-O';
      architecture = (b3 === 0xcf || b0 === 0xcf) ? 'x86_64 / ARM64 (64-bit)' : 'x86 / ARM (32-bit)';
    } else if (
      (b0 === 0xca && b1 === 0xfe && b2 === 0xba && b3 === 0xbe) ||
      (b0 === 0xbe && b1 === 0xba && b2 === 0xfe && b3 === 0xca)
    ) {
      format = 'Mach-O';
      architecture = 'Universal Binary (Multi-Architecture)';
    }
  }

  // 2. Packer signature detection
  const packerSignatures = scanPackerSignatures(data);
  const anomalies = [...inspection.anomalies];

  for (const p of packerSignatures) {
    anomalies.push(`PACKER_SIGNATURE:${p.packer}:${p.signature}`);
  }

  // 3. Verdict calculation
  let verdict: 'CLEAN' | 'SUSPICIOUS' | 'PACKED' = 'CLEAN';
  const hasRWX = anomalies.some((a) => a.includes('RWX_SECTION'));
  const hasPacker = packerSignatures.length > 0;

  if (hasPacker || inspection.verdict === 'PACKED' || overallEntropy >= 7.3) {
    verdict = 'PACKED';
  } else if (hasRWX || inspection.verdict === 'SUSPICIOUS' || overallEntropy >= 6.85) {
    verdict = 'SUSPICIOUS';
  } else {
    verdict = 'CLEAN';
  }

  // 4. Block-level entropy breakdown
  const blockCount = Math.min(16, Math.max(1, Math.floor(data.length / 512)));
  const blockSize = Math.max(1, Math.floor(data.length / blockCount));
  const blockEntropies: { index: number; offset: number; entropy: number }[] = [];

  for (let i = 0; i < blockCount; i++) {
    const offset = i * blockSize;
    const end = i === blockCount - 1 ? data.length : offset + blockSize;
    const slice = data.subarray(offset, end);
    blockEntropies.push({
      index: i,
      offset,
      entropy: calculateShannonEntropy(slice),
    });
  }

  return {
    success: true,
    fileName,
    byteSize: data.length,
    sha256: checksums.sha256,
    crc32: checksums.crc32,
    format,
    architecture,
    overallEntropy,
    entropyClassification: inspection.entropyClassification,
    blockEntropies,
    verdict,
    packerSignatures,
    anomalies,
    sections: inspection.sections,
    scannedAt: Date.now(),
    auditProof: `AETHERIS_SOVEREIGN_SCAN:${checksums.sha256.slice(0, 16)}:${verdict}`,
  };
}

/**
 * POST /api/scan-binary
 * Accepts:
 * - Content-Type: application/octet-stream -> Raw binary
 * - Content-Type: application/json -> { dataHex?: string, dataBase64?: string, fileName?: string }
 * - Content-Type: multipart/form-data -> Form field 'file'
 */
export async function onRequestPost(context: { request: Request; env?: any }): Promise<Response> {
  try {
    const contentType = context.request.headers.get('Content-Type') || '';
    let fileName = context.request.headers.get('X-File-Name') || 'sample.bin';
    let data: Uint8Array | null = null;

    if (contentType.includes('application/octet-stream')) {
      const buffer = await context.request.arrayBuffer();
      data = new Uint8Array(buffer);
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await context.request.formData();
      const fileEntry = formData.get('file');
      if (fileEntry && typeof (fileEntry as any).arrayBuffer === 'function') {
        const fileObj = fileEntry as File;
        fileName = fileObj.name || fileName;
        const buffer = await fileObj.arrayBuffer();
        data = new Uint8Array(buffer);
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'Multipart form missing "file" binary field' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
    } else if (contentType.includes('application/json')) {
      const body = await context.request.json().catch(() => null);
      if (!body) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid JSON request payload' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
      if (body.fileName) fileName = body.fileName;

      if (body.dataHex) {
        data = hexToBytes(body.dataHex);
      } else if (body.dataBase64) {
        data = base64ToBytes(body.dataBase64);
      } else if (Array.isArray(body.bytes)) {
        data = new Uint8Array(body.bytes);
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'JSON payload must contain "dataHex", "dataBase64", or "bytes" array',
          }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
    } else {
      // Fallback: try reading raw buffer directly
      const buffer = await context.request.arrayBuffer().catch(() => null);
      if (buffer && buffer.byteLength > 0) {
        data = new Uint8Array(buffer);
      }
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Empty binary payload provided' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const report = analyzeBinaryPayload(data, fileName);

    return new Response(JSON.stringify(report, null, 2), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal error scanning binary payload',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * GET /api/scan-binary
 * API Documentation & Micro-SaaS Specifications
 */
export async function onRequestGet(): Promise<Response> {
  const apiDoc = {
    service: 'UREfy Sovereign Binary Hygiene & Packer Detection Micro-SaaS API',
    endpoint: '/api/scan-binary',
    version: '1.0.0',
    protocol: 'Aetheris-Vault-Engine',
    cost: '0.00 USD (Zero Server Infrastructure / Edge Free Tier)',
    methods: ['POST', 'OPTIONS', 'GET'],
    supportedContentTypes: [
      'application/octet-stream (Raw binary payload)',
      'application/json ({"dataHex": "4d5a...", "fileName": "app.exe"})',
      'application/json ({"dataBase64": "TVqQ...", "fileName": "app.exe"})',
      'multipart/form-data (File field: "file")',
    ],
    features: [
      'Exact Shannon Entropy (0.0 to 8.0 bits/byte)',
      'Byte block disorder distribution breakdown',
      'Portable Executable (PE32 / PE32+) header parsing',
      'ELF (32-bit / 64-bit) header parsing',
      'Mach-O (Universal / ARM64 / x86_64) header parsing',
      'UPX byte signatures (!UPX, UPX!) scanning',
      'RWX memory execution/write anomaly detection',
      'False-positive elimination (distinguishing assets from packed code)',
    ],
    usageExample: {
      curlStream: 'curl -X POST https://urefy.com/api/scan-binary -H "Content-Type: application/octet-stream" --data-binary @app.exe',
      curlJson: 'curl -X POST https://urefy.com/api/scan-binary -H "Content-Type: application/json" -d \'{"dataHex":"4d5a9000...","fileName":"test.exe"}\'',
    },
  };

  return new Response(JSON.stringify(apiDoc, null, 2), {
    status: 200,
    headers: CORS_HEADERS,
  });
}

/**
 * OPTIONS /api/scan-binary
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
  if (method === 'GET') return onRequestGet();
  return new Response(JSON.stringify({ error: `Method ${method} not allowed` }), {
    status: 405,
    headers: CORS_HEADERS,
  });
}
