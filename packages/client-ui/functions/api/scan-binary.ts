import {
  calculateShannonEntropy,
  inspectBinary,
  scanPackerSignatures,
  computeFileChecksums,
} from '@aetheris/vault-engine';

export const MAX_SCAN_PAYLOAD_BYTES = 16 * 1024 * 1024; // 16 MiB edge safety limit

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-File-Name',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
};

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '');
  if (clean.length > MAX_SCAN_PAYLOAD_BYTES * 2) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }
  const len = clean.length;
  const bytes = new Uint8Array(Math.floor(len / 2));
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.trim();
  if (clean.length > Math.ceil((MAX_SCAN_PAYLOAD_BYTES * 4) / 3) + 64) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }
  const binaryString = atob(clean);
  if (binaryString.length > MAX_SCAN_PAYLOAD_BYTES) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function analyzeBinaryPayload(data: Uint8Array, fileName: string = 'payload.bin') {
  const checksums = computeFileChecksums(data);
  const overallEntropy = calculateShannonEntropy(data);
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

  const packerSignatures = scanPackerSignatures(data);
  const anomalies = [...inspection.anomalies];
  for (const p of packerSignatures) {
    anomalies.push(`PACKER_SIGNATURE:${p.packer}:${p.signature}`);
  }

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

export async function onRequestPost(context: { request: Request; env?: any }): Promise<Response> {
  try {
    const contentLengthHeader = context.request.headers.get('Content-Length');
    if (contentLengthHeader) {
      const declaredBytes = parseInt(contentLengthHeader, 10);
      if (Number.isFinite(declaredBytes) && declaredBytes > MAX_SCAN_PAYLOAD_BYTES * 2) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Payload exceeds maximum scan limit of ${MAX_SCAN_PAYLOAD_BYTES / (1024 * 1024)} MiB`,
          }),
          { status: 413, headers: CORS_HEADERS }
        );
      }
    }

    const contentType = context.request.headers.get('Content-Type') || '';
    let fileName = context.request.headers.get('X-File-Name') || 'sample.bin';
    let data: Uint8Array | null = null;

    if (contentType.includes('application/octet-stream')) {
      const buffer = await context.request.arrayBuffer();
      if (buffer.byteLength > MAX_SCAN_PAYLOAD_BYTES) {
        return new Response(
          JSON.stringify({ success: false, error: 'Binary payload exceeds 16 MiB scan limit' }),
          { status: 413, headers: CORS_HEADERS }
        );
      }
      data = new Uint8Array(buffer);
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await context.request.formData();
      const fileEntry = formData.get('file');
      if (fileEntry && typeof (fileEntry as any).arrayBuffer === 'function') {
        const fileObj = fileEntry as File;
        fileName = fileObj.name || fileName;
        if (typeof fileObj.size === 'number' && fileObj.size > MAX_SCAN_PAYLOAD_BYTES) {
          return new Response(
            JSON.stringify({ success: false, error: 'Uploaded file exceeds 16 MiB scan limit' }),
            { status: 413, headers: CORS_HEADERS }
          );
        }
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
      try {
        if (body.dataHex) {
          data = hexToBytes(body.dataHex);
        } else if (body.dataBase64) {
          data = base64ToBytes(body.dataBase64);
        } else if (Array.isArray(body.bytes)) {
          if (body.bytes.length > MAX_SCAN_PAYLOAD_BYTES) {
            throw new Error('PAYLOAD_TOO_LARGE');
          }
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
      } catch (decodeErr: any) {
        if (decodeErr?.message === 'PAYLOAD_TOO_LARGE') {
          return new Response(
            JSON.stringify({ success: false, error: 'Encoded binary payload exceeds 16 MiB scan limit' }),
            { status: 413, headers: CORS_HEADERS }
          );
        }
        throw decodeErr;
      }
    } else {
      const buffer = await context.request.arrayBuffer().catch(() => null);
      if (buffer && buffer.byteLength > 0) {
        if (buffer.byteLength > MAX_SCAN_PAYLOAD_BYTES) {
          return new Response(
            JSON.stringify({ success: false, error: 'Binary payload exceeds 16 MiB scan limit' }),
            { status: 413, headers: CORS_HEADERS }
          );
        }
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

export async function onRequestGet(): Promise<Response> {
  const apiDoc = {
    service: 'UREfy Sovereign Binary Hygiene & Packer Detection Micro-SaaS API',
    endpoint: '/api/scan-binary',
    version: '1.1.0',
    protocol: 'Aetheris-Vault-Engine',
    maxPayloadBytes: MAX_SCAN_PAYLOAD_BYTES,
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
      'ELF (32-bit / 64-bit) section & program header parsing',
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
