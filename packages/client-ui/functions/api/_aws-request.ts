import type { Env } from './_db.js';

const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
async function hash(text: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(text) as unknown as BufferSource));
}
async function hmac(key: Uint8Array, text: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key as unknown as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, encoder.encode(text) as unknown as BufferSource));
}

/** Server-side only. Fixed AWS destinations; never return headers or credentials. */
export async function awsJsonRequest<T>(env: Env, service: 'sqs' | 'ses' | 'events', payload: unknown, target?: string): Promise<T> {
  const region = env.AWS_REGION;
  if (region !== 'eu-central-1' || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS runtime is not configured for Frankfurt.');
  }
  const host = `${service === 'ses' ? 'email' : service}.${region}.amazonaws.com`;
  const path = service === 'ses' ? '/v2/email/outbound-emails' : '/';
  const body = JSON.stringify(payload);
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = date.slice(0, 8);
  const headers: Record<string, string> = { 'content-type': service === 'ses' ? 'application/json' : 'application/x-amz-json-1.0', host, 'x-amz-date': date };
  if (target) headers['x-amz-target'] = target;
  const names = Object.keys(headers).sort();
  const signed = names.join(';');
  const canonical = ['POST', path, '', names.map(n => `${n}:${headers[n]}\n`).join(''), signed, await hash(body)].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`;
  let key = await hmac(encoder.encode(`AWS4${env.AWS_SECRET_ACCESS_KEY}`), day);
  for (const part of [region, service, 'aws4_request']) key = await hmac(key, part);
  const signature = hex((await hmac(key, ['AWS4-HMAC-SHA256', date, scope, await hash(canonical)].join('\n'))).buffer as ArrayBuffer);
  delete headers.host;
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${env.AWS_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signed}, Signature=${signature}`;
  const response = await fetch(`https://${host}${path}`, { method: 'POST', headers, body, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`AWS ${service} request failed: HTTP ${response.status}.`);
  return response.json() as Promise<T>;
}
