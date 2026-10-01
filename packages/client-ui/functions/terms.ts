import { headHandler } from './_head.js';
// ===========================================================================
// UREfy — Cloudflare Pages Edge Function for /terms
// Full semantic SSR HTML, canonical URLs & Terms of Service
// ===========================================================================

import { injectStaticPageSeo } from './_seo.js';

export async function onRequestGet(context: {
  request: Request;
  env?: any;
}): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  const canonicalUrl = `${origin}/terms`;

  let baseResponse: Response;
  try {
    baseResponse = await env?.ASSETS?.fetch(new URL('/', request.url));
  } catch (_) {
    baseResponse = new Response('<!DOCTYPE html><html><head><title>UREfy Terms of Service</title></head><body><div id="app"></div></body></html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const title = 'Terms of Service & Community Covenant — UREfy';
  const description =
    'UREfy Terms of Service: Transparent, open-source rules of engagement, sovereign data ownership, and community-governed moderation.';

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
      <h1 style="font-size: 32px; color: #f8fafc; margin-bottom: 12px;">UREfy Terms of Service</h1>
      <p style="font-size: 14px; color: #94a3b8;">Decentralized Community Covenant &amp; Acceptable Use</p>
      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
      
      <section>
        <h2 style="color: #38bdf8; font-size: 20px;">1. Sovereign Ownership</h2>
        <p>You retain full ownership, copyright, and moral rights over all content, posts, and materials you publish to the UREfy network. By signing content with your cryptographic key, you prove authorship.</p>
      </section>

      <section style="margin-top: 28px;">
        <h2 style="color: #38bdf8; font-size: 20px;">2. Non-Custodial Cryptographic Keys</h2>
        <p>UREfy is a non-custodial decentralized application. We never store, manage, or hold your private keys. You are solely responsible for securely backing up your 12-word seed phrase or passkey credentials.</p>
      </section>

      <section style="margin-top: 28px;">
        <h2 style="color: #38bdf8; font-size: 20px;">3. Community Standards &amp; Anti-Abuse</h2>
        <p>To preserve high signal-to-noise discussion across communities, users must refrain from:</p>
        <ul style="padding-left: 20px;">
          <li>Automated bot spamming or flood attacks against public relays.</li>
          <li>Distribution of malicious software, ransomware, or weaponized exploits against network nodes.</li>
          <li>Violations of EU Regulation 2022/2065 (Digital Services Act) regarding illegal content.</li>
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

export const onRequestHead = headHandler(onRequestGet);
