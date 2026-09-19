// ===========================================================================
// UREfy — Cloudflare Pages Edge Function for /security
// Full semantic SSR HTML, canonical URLs & Security Whitepaper (Schema TechArticle)
// ===========================================================================

import { injectStaticPageSeo } from './_seo.js';

export async function onRequestGet(context: {
  request: Request;
  env?: any;
}): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  const canonicalUrl = `${origin}/security`;

  let baseResponse: Response;
  try {
    baseResponse = await env?.ASSETS?.fetch(new URL('/', request.url));
  } catch (_) {
    baseResponse = new Response('<!DOCTYPE html><html><head><title>UREfy Security</title></head><body><div id="app"></div></body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const title = 'Security & Cryptographic Architecture Whitepaper — UREfy';
  const description =
    'Technical security architecture of UREfy: Ed25519 signatures, X25519 Diffie-Hellman, ML-KEM-768 post-quantum KEM, Double Ratchet, and AES-256-GCM authenticated encryption.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': canonicalUrl,
    url: canonicalUrl,
    headline: title,
    description: description,
    author: {
      '@type': 'Organization',
      name: 'UREfy Cryptography Research Group',
      url: origin,
    },
    publisher: {
      '@type': 'Organization',
      name: 'UREfy',
      url: origin,
      logo: `${origin}/icon-512.png`,
    },
    datePublished: '2026-09-01T00:00:00Z',
    dateModified: '2026-09-19T00:00:00Z',
    dependencies: 'ML-KEM-768, Ed25519, X25519, AES-256-GCM, HKDF, WebAuthn Level 3',
  };

  const bodySnippet = `
    <div style="max-width: 860px; width: min(100% - 32px, 860px); margin: 24px auto 64px; padding: clamp(16px, 4vw, 32px); box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e2e8f0; background: #0c0906; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); line-height: 1.7;">
      <nav style="margin-bottom: 24px;"><a href="${origin}/" style="color: #6366f1; text-decoration: none;">&larr; Back to UREfy</a></nav>
      <h1 style="font-size: 32px; color: #f8fafc; margin-bottom: 12px;">UREfy Cryptographic Architecture</h1>
      <p style="font-size: 14px; color: #38bdf8;">Technical Security Whitepaper &bull; Post-Quantum Sovereign Communications</p>
      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
      
      <section>
        <h2 style="color: #38bdf8; font-size: 20px;">1. Cryptographic Primitives</h2>
        <ul style="padding-left: 20px;">
          <li><strong>Digital Signatures:</strong> Ed25519 (RFC 8032) using Twisted Edwards curve curve25519 for sovereign author authentication and tamper-evident gossip envelopes.</li>
          <li><strong>Classical Key Exchange:</strong> X25519 ECDH for forward-secret session keys.</li>
          <li><strong>Post-Quantum Key Encapsulation:</strong> NIST FIPS 203 ML-KEM-768 (Kyber-768) lattice-based KEM hybrid encapsulation to defeat "Harvest Now, Decrypt Later" quantum adversary models.</li>
          <li><strong>Symmetric Encryption:</strong> AES-256-GCM authenticated cipher with 96-bit unique nonces derived via HKDF-SHA256.</li>
          <li><strong>Group Ratchet:</strong> MLS (Messaging Layer Security) TreeKEM architecture supporting scalable, asynchronous encrypted group channels.</li>
        </ul>
      </section>

      <section style="margin-top: 28px;">
        <h2 style="color: #38bdf8; font-size: 20px;">2. Threat Model &amp; Forward Secrecy</h2>
        <p>UREfy treats the edge relay network as untrusted. Even in the event of an adversary compromising edge relay nodes:</p>
        <ul style="padding-left: 20px;">
          <li>Private messages cannot be decrypted because relay nodes never observe private keys or plaintext.</li>
          <li>Sealed Sender envelopes ensure the relay routes based only on ephemeral recipient identifiers, decoupling sender metadata.</li>
          <li>Ratchet steps update conversation keys after every message, providing immediate compromise recovery.</li>
        </ul>
      </section>

      <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 14px; color: #64748b;">
        &copy; 2026 UREfy Network. Decentralized, Sovereign, Open Source.
      </footer>
    </div>
  `;

  const modifiedResponse = injectStaticPageSeo(baseResponse, {
    title,
    description,
    canonicalUrl,
    origin,
    jsonLd,
    bodySnippet,
  });

  const headers = new Headers(modifiedResponse.headers);
  headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  headers.set('X-Robots-Tag', 'index, follow, max-image-preview:large, max-snippet:-1');

  return new Response(modifiedResponse.body, {
    status: 200,
    headers,
  });
}
