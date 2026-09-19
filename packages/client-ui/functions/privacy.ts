// ===========================================================================
// UREfy — Cloudflare Pages Edge Function for /privacy
// Full semantic SSR HTML, canonical URLs & GDPR / DSA Compliance
// ===========================================================================

import { injectStaticPageSeo } from './_seo.js';

export async function onRequestGet(context: {
  request: Request;
  env?: any;
}): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  const canonicalUrl = `${origin}/privacy`;

  let baseResponse: Response;
  try {
    baseResponse = await env?.ASSETS?.fetch(new URL('/', request.url));
  } catch (_) {
    baseResponse = new Response('<!DOCTYPE html><html><head><title>UREfy Privacy Policy</title></head><body><div id="app"></div></body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const title = 'Privacy Policy & Cryptographic Architecture — UREfy';
  const description =
    'UREfy Privacy Policy: Zero tracking, zero cookies, zero surveillance. Cryptographic client-side keys and full GDPR & EU DSA compliance by architectural design.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: title,
    description: description,
    publisher: {
      '@type': 'Organization',
      name: 'UREfy',
      url: origin,
    },
  };

  const bodySnippet = `
    <div style="max-width: 860px; width: min(100% - 32px, 860px); margin: 24px auto 64px; padding: clamp(16px, 4vw, 32px); box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e2e8f0; background: #0c0906; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); line-height: 1.7;">
      <nav style="margin-bottom: 24px;"><a href="${origin}/" style="color: #6366f1; text-decoration: none;">&larr; Back to UREfy</a></nav>
      <h1 style="font-size: 32px; color: #f8fafc; margin-bottom: 12px;">UREfy Privacy Policy</h1>
      <p style="font-size: 14px; color: #94a3b8;">EU General Data Protection Regulation (GDPR) &amp; Digital Services Act (DSA) Compliance</p>
      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
      
      <section>
        <h2 style="color: #38bdf8; font-size: 20px;">1. Privacy by Cryptographic Design</h2>
        <p>UREfy enforces data minimization and sovereign privacy at the architectural level. We do not collect, process, or sell personal identifying information.</p>
        <ul style="padding-left: 20px;">
          <li><strong>Zero Personal Identifiers:</strong> We do not require, collect, or store your legal name, physical address, email address, or phone number.</li>
          <li><strong>Zero Tracking Cookies:</strong> UREfy does not set marketing cookies, third-party trackers, Google Analytics, Facebook Pixels, or fingerprinting scripts.</li>
          <li><strong>Local Key Generation:</strong> Cryptographic keys (Ed25519 and X25519) are generated in your browser memory and persisted only in your local encrypted IndexedDB.</li>
          <li><strong>End-to-End Encryption (E2EE):</strong> All direct messages and private communications are encrypted end-to-end. UREfy relay servers only route ciphertext envelopes and have zero access to plaintext contents.</li>
        </ul>
      </section>

      <section style="margin-top: 28px;">
        <h2 style="color: #38bdf8; font-size: 20px;">2. Your Rights Under GDPR (Articles 15–22)</h2>
        <p>Because your account is cryptographically controlled by you, you maintain complete data sovereignty:</p>
        <ul style="padding-left: 20px;">
          <li><strong>Right to Access &amp; Portability:</strong> You can export your entire sovereign archive, keys, and posts at any time via the Vault Settings.</li>
          <li><strong>Right to Erasure (Right to be Forgotten):</strong> You can delete your posts and cryptographic identity directly from your client. Once deleted and signed with your key, the tombstone is gossiped across relays.</li>
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
