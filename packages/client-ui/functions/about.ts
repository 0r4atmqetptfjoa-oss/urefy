// ===========================================================================
// UREfy — Cloudflare Pages Edge Function for /about
// Full semantic SSR HTML, canonical URLs & Schema.org AboutPage structured data
// ===========================================================================

import { injectStaticPageSeo } from './_seo.js';

export async function onRequestGet(context: {
  request: Request;
  env?: any;
}): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  const canonicalUrl = `${origin}/about`;

  // 1. Fetch static base HTML from Cloudflare Pages Assets
  let baseResponse: Response;
  try {
    baseResponse = await env?.ASSETS?.fetch(new URL('/', request.url));
  } catch (_) {
    baseResponse = new Response('<!DOCTYPE html><html><head><title>About UREfy</title></head><body><div id="app"></div></body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const title = 'About UREfy — The Sovereign Social Network You Actually Own';
  const description =
    'Learn about UREfy: The decentralized, privacy-first consumer social platform. Built on sovereign cryptographic identities (Ed25519), zero surveillance, and post-quantum encryption.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: title,
    description: description,
    mainEntity: {
      '@type': 'Organization',
      name: 'UREfy',
      alternateName: ['UREfy Social', 'UREfy Network'],
      url: origin,
      logo: `${origin}/icon-512.png`,
      description: 'Decentralized sovereign communications and open-source social networking foundation.',
      knowsAbout: [
        'Sovereign Identity',
        'Decentralized Social Networks',
        'End-to-End Encryption',
        'Post-Quantum Cryptography',
        'Zero Knowledge Proofs',
      ],
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
        { '@type': 'ListItem', position: 2, name: 'About', item: canonicalUrl },
      ],
    },
  };

  const bodySnippet = `
    <div style="max-width: 860px; width: min(100% - 32px, 860px); margin: 24px auto 64px; padding: clamp(16px, 4vw, 32px); box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e2e8f0; background: #0c0906; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); line-height: 1.7;">
      <nav style="margin-bottom: 24px;"><a href="${origin}/" style="color: #6366f1; text-decoration: none;">&larr; Back to UREfy</a></nav>
      <h1 style="font-size: 32px; color: #f8fafc; margin-bottom: 12px;">About UREfy</h1>
      <p style="font-size: 18px; color: #94a3b8;">The Sovereign Social Network You Actually Own</p>
      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
      <section>
        <h2 style="color: #38bdf8; font-size: 22px;">Our Mission: Digital Sovereignty</h2>
        <p>UREfy was founded on a simple principle: <strong>You should own your digital identity, your social relationships, and your conversations.</strong> Traditional social media giants treat users as products, harvesting behavioral telemetry, training proprietary models on private data, and censoring accounts at will.</p>
        <p>UREfy eliminates centralized surveillance entirely. Your identity is an <strong>Ed25519 cryptographic keypair</strong> generated locally on your hardware. No phone numbers, no emails, and no centralized databases.</p>
      </section>
      <section style="margin-top: 28px;">
        <h2 style="color: #38bdf8; font-size: 22px;">Core Pillars</h2>
        <ul style="padding-left: 20px;">
          <li><strong>Cryptographic Sovereign Identity:</strong> Client-side Ed25519 and X25519 key generation. Your private key stays in your local browser vault.</li>
          <li><strong>Post-Quantum E2EE Messaging:</strong> Private chats protected by Signal Double Ratchet combined with ML-KEM-768 (Kyber) encapsulation and AES-256-GCM.</li>
          <li><strong>Zero Tracking &amp; Zero Ads:</strong> No third-party tracking scripts, no behavioral ad profiling, and no surveillance capitalism.</li>
          <li><strong>Open Communities:</strong> Community-governed discussion spaces for technology, PC gaming, Linux, open source, and local AI.</li>
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
