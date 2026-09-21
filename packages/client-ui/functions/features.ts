// ===========================================================================
// UREfy — Cloudflare Pages Edge Function for /features
// Full semantic SSR HTML, canonical URLs & Schema.org SoftwareApplication structured data
// ===========================================================================

import { injectStaticPageSeo } from './_seo.js';

export async function onRequestGet(context: {
  request: Request;
  env?: any;
}): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  const canonicalUrl = `${origin}/features`;

  let baseResponse: Response;
  try {
    baseResponse = await env?.ASSETS?.fetch(new URL('/', request.url));
  } catch (_) {
    baseResponse = new Response('<!DOCTYPE html><html><head><title>UREfy Features</title></head><body><div id="app"></div></body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const title = 'Platform Features & Architecture — UREfy Sovereign Social Network';
  const description =
    'Explore UREfy features: Sovereign Identity, Post-Quantum E2EE Messaging, Local AI Privacy, Community Spaces, WebAuthn Passkeys, and Client-Side Encrypted Vault.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: title,
    description: description,
    mainEntity: {
      '@type': 'SoftwareApplication',
      name: 'UREfy',
      applicationCategory: 'SocialNetworkingApplication',
      operatingSystem: 'All Modern Web Browsers, iOS, Android, macOS, Linux, Windows',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Sovereign Ed25519 Cryptographic Identity',
        'Hybrid Post-Quantum E2EE (ML-KEM-768 + X25519)',
        'Decentralized Community Hubs & Discussion Feeds',
        'Zero Advertising & Zero Surveillance Analytics',
        'Hardware WebAuthn FIDO2 Passkey Integration',
        'Client-Side Encrypted AES-256-GCM Vault',
        'Offline Sync & Progressive Web App (PWA) Capability',
      ],
    },
  };

  const bodySnippet = `
    <div style="max-width: 860px; width: min(100% - 32px, 860px); margin: 24px auto 64px; padding: clamp(16px, 4vw, 32px); box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e2e8f0; background: #0c0906; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); line-height: 1.7;">
      <nav style="margin-bottom: 24px;"><a href="${origin}/" style="color: #6366f1; text-decoration: none;">&larr; Back to UREfy</a></nav>
      <h1 style="font-size: 32px; color: #f8fafc; margin-bottom: 12px;">UREfy Platform Features</h1>
      <p style="font-size: 18px; color: #94a3b8;">Sovereign Social Networking Engineered for the Modern Web</p>
      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
      
      <div style="display: grid; gap: 24px; margin-top: 24px;">
        <article style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);">
          <h2 style="color: #38bdf8; font-size: 20px; margin-top: 0;">1. Sovereign Identity (Ed25519)</h2>
          <p>No phone numbers, no email addresses, and no KYC verification. Your device generates an elliptic curve Ed25519 keypair in memory. You hold the private key, ensuring absolute censorship resistance.</p>
        </article>

        <article style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);">
          <h2 style="color: #38bdf8; font-size: 20px; margin-top: 0;">2. Post-Quantum End-to-End Encryption</h2>
          <p>Direct messages use Hybrid Post-Quantum E2EE combining ML-KEM-768 (FIPS 203) key encapsulation with X25519 ECDH, HKDF-SHA256, and AES-256-GCM. Your messages are cryptographically secured against future quantum computers.</p>
        </article>

        <article style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);">
          <h2 style="color: #38bdf8; font-size: 20px; margin-top: 0;">3. High-Signal Communities</h2>
          <p>Explore dedicated community hubs for Technology, PC Gaming, Linux, Open Source, and Hardware Hacking. Threaded comments, multi-emoji reaction clouds, and organic merit scoring reward genuine insight over clickbait.</p>
        </article>

        <article style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);">
          <h2 style="color: #38bdf8; font-size: 20px; margin-top: 0;">4. Hardware WebAuthn Passkeys</h2>
          <p>Protect your sovereign vault using hardware-backed FIDO2 / WebAuthn passkeys (YubiKey, Apple Touch ID, Windows Hello). Your cryptographic seed never leaves your secure enclave.</p>
        </article>
      </div>

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
