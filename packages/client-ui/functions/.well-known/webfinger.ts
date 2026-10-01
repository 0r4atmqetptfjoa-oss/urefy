import { headHandler } from '../_head.js';
/**
 * @file webfinger.ts
 * @description RFC 7033 WebFinger endpoint for ActivityPub / Fediverse node and user discovery.
 *
 * Route: GET /.well-known/webfinger?resource=acct:user@domain
 */

export interface WebFingerLink {
  rel: string;
  type?: string;
  href: string;
  template?: string;
}

export interface WebFingerResourceDescriptor {
  subject: string;
  aliases?: string[];
  links: WebFingerLink[];
}

export async function onRequestGet(context: { request: Request; env?: any }): Promise<Response> {
  const url = new URL(context.request.url);
  const resource = url.searchParams.get('resource');

  const corsHeaders = {
    'Content-Type': 'application/jrd+json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'max-age=3600, public',
  };

  if (!resource) {
    return new Response(
      JSON.stringify({ error: 'Missing required "resource" query parameter' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const origin = url.origin;
  const domain = url.host;

  // Resource format: acct:username@domain or https://domain/api/federation/actor
  let username = 'urefy-node';
  if (resource.startsWith('acct:')) {
    const parts = resource.slice(5).split('@');
    username = parts[0] || 'urefy-node';
  } else if (resource.startsWith('http://') || resource.startsWith('https://')) {
    try {
      const parsed = new URL(resource);
      const userParam = parsed.searchParams.get('user');
      if (userParam) username = userParam;
    } catch (_) {}
  }

  const actorUrl = `${origin}/api/federation/actor`;

  const descriptor: WebFingerResourceDescriptor = {
    subject: `acct:${username}@${domain}`,
    aliases: [actorUrl],
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: actorUrl,
      },
      {
        rel: 'http://nodeinfo.diaspora.software/ns/schema/2.1',
        href: `${origin}/api/federation/nodeinfo`,
      },
      {
        rel: 'http://webfinger.net/rel/profile-page',
        type: 'text/html',
        href: `${origin}/#profile`,
      },
    ],
  };

  return new Response(JSON.stringify(descriptor, null, 2), {
    status: 200,
    headers: corsHeaders,
  });
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export const onRequestHead = headHandler(onRequestGet);
