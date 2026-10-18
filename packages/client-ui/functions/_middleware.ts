// ===========================================================================
// UREfy — Cloudflare Pages Root Middleware (_middleware.ts)
// 1. AI Agent Discovery & Universal WebMCP / RFC Standards (RFC 9727, 8414, 9728, 9421)
// 2. Smart legacy route handling (301 Redirect / 410 Gone)
// 3. Security headers, canonical host enforcement, and Markdown negotiation
// ===========================================================================

import { resolveLegacyRoute, injectStaticPageSeo } from './_seo.js';
import { SITE_ORIGIN } from './_discovery.js';
import { seoError } from './_seo-response.js';

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string | string[]>;
  data: Data;
}

const BASE_URL = 'https://urefy.com';

const AGENT_LINK_HEADERS = [
  `<${BASE_URL}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
  `<${BASE_URL}/openapi.json>; rel="service-desc"; type="application/openapi+json"`,
  `<${BASE_URL}/auth.md>; rel="service-doc"; type="text/markdown"`,
  `<${BASE_URL}/llms.txt>; rel="llms-txt"; type="text/plain"`,
  `<${BASE_URL}/.well-known/oauth-authorization-server>; rel="oauth-authorization-server"; type="application/json"`,
  `<${BASE_URL}/.well-known/oauth-protected-resource>; rel="oauth-protected-resource"; type="application/json"`,
  `<${BASE_URL}/.well-known/agent.json>; rel="agent-card"; type="application/json"`,
  `<${BASE_URL}/.well-known/mcp.json>; rel="mcp-server"; type="application/json"`,
  `<${BASE_URL}/.well-known/skills.json>; rel="skills-index"; type="application/json"`,
  `<${BASE_URL}/.well-known/http-message-signatures-directory>; rel="http-message-signatures-directory"; type="application/http-message-signatures-directory+json"`,
].join(', ');

const MARKDOWN_HOME = `# Urefy — Sovereign Encrypted Social Network & eMessage 2.0 (https://urefy.com)

Urefy este o rețea socială descentralizată și o platformă de mesagerie criptată End-to-End (E2EE) construită pe Ed25519, AES-256-GCM, WebRTC P2P și Zero-Knowledge Proofs.

## Agent & API Discovery Endpoints
- **API Catalog (RFC 9727)**: ${BASE_URL}/.well-known/api-catalog
- **OpenAPI 3.1 Spec**: ${BASE_URL}/openapi.json
- **Agent Authentication Guide (Auth.md)**: ${BASE_URL}/auth.md
- **A2A Agent Card**: ${BASE_URL}/.well-known/agent.json
- **MCP Server Card**: ${BASE_URL}/.well-known/mcp.json
- **MCP Live JSON-RPC Endpoint**: ${BASE_URL}/api/mcp
- **Skills Index**: ${BASE_URL}/.well-known/skills.json
- **OAuth 2.0 Discovery**: ${BASE_URL}/.well-known/oauth-authorization-server
- **OAuth Protected Resource**: ${BASE_URL}/.well-known/oauth-protected-resource
- **Web Bot Auth Directory**: ${BASE_URL}/.well-known/http-message-signatures-directory

## Core Capabilities
1. **eMessage 2.0 (E2EE Chat & Direct Messaging)**: Criptare AES-256-GCM pe dispozitiv, mesaje efemere, sondaje live și note vocale.
2. **WebRTC Audio/Video P2P**: Apeluri criptate DTLS-SRTP cu verificare SAS în 4 Emoji-uri și partajare de ecran.
3. **Decentralized Identity (DID)**: Autentificare fără parole prin semnături criptografice Ed25519.
`;

const AUTH_MD_CONTENT = `# Authentication Instructions for AI Agents (Auth.md)

Acest document descrie modul în care agenții AI și clienții automatizați se pot autentifica și interacționa în siguranță cu API-urile **Urefy** (\`https://urefy.com\`).

## 1. Metode de Autentificare Suportate

### A. OAuth 2.0 / Bearer Token (Pentru Agenți AI Externe & MCP)
- **OAuth Discovery Metadata**: \`${BASE_URL}/.well-known/oauth-authorization-server\`
- **Protected Resource Metadata**: \`${BASE_URL}/.well-known/oauth-protected-resource\`
- **Authorization Endpoint**: \`${BASE_URL}/api/auth?action=authorize\`
- **Token Endpoint**: \`${BASE_URL}/api/auth?action=token\`
- **Registration Endpoint (Dynamic Client Registration)**: \`${BASE_URL}/api/auth?action=register\`
- **Header necesar**:
  \`\`\`http
  Authorization: Bearer <access_token>
  \`\`\`

### B. Semnătură Criptografică DID Ed25519 (Sovereign Envelope Auth)
Pentru mutații criptate (postări, mesaje, follow), Urefy utilizează plicuri semnate Ed25519:
- **Header-e necesare**:
  - \`X-Urefy-DID\`: Identificatorul descentralizat (\`did:key:z...\`)
  - \`X-Urefy-Timestamp\`: Timestamp Unix în milisecunde (fereastră de validitate: 5 minute)
  - \`X-Urefy-Nonce\`: Nonce unic per request (protecție anti-replay distribuită în D1)
  - \`X-Urefy-Signature\`: Semnătura Ed25519 (hex/base64) peste payload-ul canonic

## 2. Rute Publice (Fără Autentificare)
- \`GET /api/posts\` — Listarea postărilor publice din feed
- \`GET /api/channels\` — Listarea canalelor publice de comunitate
- \`GET /api/federation\` — Endpoint ActivityPub / Fediverse
- \`POST /api/mcp\` — Endpoint Model Context Protocol (instrumente publice read-only)
`;

function jsonResponse(body: unknown, contentType = 'application/json; charset=utf-8', extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Urefy-DID, X-Urefy-Signature',
      'Cache-Control': 'public, max-age=300',
      Link: AGENT_LINK_HEADERS,
      Vary: 'Accept',
      ...extraHeaders,
    },
  });
}

function markdownResponse(md: string): Response {
  return new Response(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
      Link: AGENT_LINK_HEADERS,
      Vary: 'Accept',
      'X-Content-Signal': 'ai-train=yes, search=yes, ai-input=yes',
    },
  });
}

export async function onRequest(context: EventContext<any, any, any>): Promise<Response> {
  const { request, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const pathLower = path.toLowerCase();
  const accept = (request.headers.get('Accept') || '').toLowerCase();

  // 0. Handle CORS Preflight for Agent & MCP Discovery
  if (request.method === 'OPTIONS' && (pathLower.startsWith('/.well-known/') || pathLower === '/api/mcp')) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        Link: AGENT_LINK_HEADERS,
      },
    });
  }

  // 1. AUTH.MD (Login instructions for AI bots)
  if (
    pathLower === '/auth.md' ||
    pathLower === '/.well-known/auth.md' ||
    pathLower === '/.well-known/agent-auth.md'
  ) {
    return markdownResponse(AUTH_MD_CONTENT);
  }

  // 2. API CATALOG (RFC 9727)
  if (pathLower === '/.well-known/api-catalog' || pathLower === '/api-catalog.json') {
    return jsonResponse(
      {
        linkset: [
          {
            anchor: `${BASE_URL}/api`,
            'service-desc': [
              {
                href: `${BASE_URL}/openapi.json`,
                type: 'application/openapi+json',
                title: 'Urefy OpenAPI 3.1 Specification',
              },
            ],
            'service-doc': [
              {
                href: `${BASE_URL}/auth.md`,
                type: 'text/markdown',
                title: 'Urefy AI Agent Authentication & API Guide',
              },
            ],
            status: [
              {
                href: `${BASE_URL}/api/health`,
                type: 'application/json',
                title: 'Urefy System Health Status',
              },
            ],
          },
        ],
      },
      'application/linkset+json; charset=utf-8'
    );
  }

  // OpenAPI 3.1 Specification referenced by API Catalog
  if (pathLower === '/openapi.json' || pathLower === '/.well-known/openapi.json') {
    return jsonResponse({
      openapi: '3.1.0',
      info: {
        title: 'Urefy Sovereign Social & eMessage E2EE API',
        version: '2.0.0',
        description: 'Public and authenticated endpoints for AI agents, MCP clients, and decentralized social federation.',
      },
      servers: [{ url: BASE_URL }],
      paths: {
        '/api/posts': {
          get: {
            operationId: 'listPosts',
            summary: 'Returnează postările publice din rețeaua Urefy',
            responses: { '200': { description: 'Listă de postări semnate criptografic' } },
          },
        },
        '/api/channels': {
          get: {
            operationId: 'listChannels',
            summary: 'Returnează canalele publice de comunitate',
            responses: { '200': { description: 'Listă de canale E2EE' } },
          },
        },
        '/api/mcp': {
          post: {
            operationId: 'invokeMcpTool',
            summary: 'Endpoint JSON-RPC 2.0 pentru Model Context Protocol (MCP)',
            responses: { '200': { description: 'Răspuns MCP JSON-RPC' } },
          },
        },
      },
    });
  }

  // 3. OAUTH DISCOVERY (RFC 8414)
  if (
    pathLower === '/.well-known/oauth-authorization-server' ||
    pathLower === '/.well-known/openid-configuration'
  ) {
    return jsonResponse({
      issuer: BASE_URL,
      authorization_endpoint: `${BASE_URL}/api/auth?action=authorize`,
      token_endpoint: `${BASE_URL}/api/auth?action=token`,
      registration_endpoint: `${BASE_URL}/api/auth?action=register`,
      jwks_uri: `${BASE_URL}/.well-known/jwks.json`,
      service_documentation: `${BASE_URL}/auth.md`,
      scopes_supported: ['openid', 'profile', 'read:posts', 'read:channels', 'write:posts', 'mcp:tools'],
      response_types_supported: ['code', 'token'],
      grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'private_key_jwt'],
      code_challenge_methods_supported: ['S256'],
    });
  }

  // 4. OAUTH PROTECTED RESOURCE (RFC 9728)
  if (pathLower === '/.well-known/oauth-protected-resource') {
    return jsonResponse({
      resource: BASE_URL,
      authorization_servers: [BASE_URL],
      bearer_methods_supported: ['header'],
      scopes_supported: ['read:posts', 'read:channels', 'write:posts', 'mcp:tools'],
      resource_documentation: `${BASE_URL}/auth.md`,
      protected_paths: ['/api/admin', '/api/direct-messages', '/api/messages'],
    });
  }

  // 5. A2A AGENT CARD
  if (pathLower === '/.well-known/agent.json' || pathLower === '/.well-known/agent-card.json') {
    return jsonResponse({
      schemaVersion: '1.0',
      name: 'Urefy Sovereign Agent',
      description: 'Agentul oficial al rețelei Urefy pentru căutare în feed-ul descentralizat, descoperirea canalelor comunității și verificarea criptografică.',
      url: `${BASE_URL}/api/mcp`,
      homepage: BASE_URL,
      version: '2.0.0',
      provider: {
        organization: 'Urefy Network',
        url: BASE_URL,
      },
      capabilities: {
        streaming: false,
        pushNotifications: true,
        stateTransitionHistory: true,
      },
      authentication: {
        schemes: ['Bearer', 'Ed25519Signature'],
        instructionsUri: `${BASE_URL}/auth.md`,
      },
      defaultInputModes: ['text/plain', 'application/json'],
      defaultOutputModes: ['text/markdown', 'application/json'],
      skills: [
        {
          id: 'search-public-feed',
          name: 'Search Public Feed & Posts',
          description: 'Caută postări și discuții publice pe nodul Urefy.',
          tags: ['social', 'feed', 'search', 'activitypub'],
        },
        {
          id: 'discover-channels',
          name: 'Discover E2EE Community Channels',
          description: 'Listează canalele publice de comunicare din Urefy.',
          tags: ['channels', 'messaging', 'community'],
        },
        {
          id: 'verify-did-identity',
          name: 'Verify Decentralized Identity (DID)',
          description: 'Verifică cheile publice Ed25519 și statusul de securitate al unui cont.',
          tags: ['cryptography', 'did', 'security'],
        },
      ],
    });
  }

  // 6. SKILLS INDEX
  if (
    pathLower === '/.well-known/skills.json' ||
    pathLower === '/.well-known/skills/index.json' ||
    pathLower === '/.well-known/agent-skills.json' ||
    pathLower === '/skills.json'
  ) {
    return jsonResponse({
      version: '1.0.0',
      agent: 'Urefy Sovereign Agent',
      documentation: `${BASE_URL}/skills.md`,
      skills: [
        {
          id: 'search_posts',
          name: 'Search Public Posts',
          description: 'Interoghează postările publice din rețeaua socială Urefy.',
          endpoint: `${BASE_URL}/api/posts`,
          method: 'GET',
          authRequired: false,
        },
        {
          id: 'list_channels',
          name: 'List Community Channels',
          description: 'Returnează lista canalelor active din sistemul eMessage 2.0.',
          endpoint: `${BASE_URL}/api/channels`,
          method: 'GET',
          authRequired: false,
        },
        {
          id: 'mcp_context_query',
          name: 'Execute MCP Context Tool',
          description: 'Rulează interogări structurate prin Model Context Protocol.',
          endpoint: `${BASE_URL}/api/mcp`,
          method: 'POST',
          authRequired: false,
        },
      ],
    });
  }

  if (pathLower === '/skills.md' || pathLower === '/.well-known/skills.md') {
    return markdownResponse(`# Urefy AI Agent Skills Index

1. **search_posts** (\`GET /api/posts\`): Caută postări publice semnate criptografic.
2. **list_channels** (\`GET /api/channels\`): Enumeră canalele de discuții din comunitate.
3. **mcp_context_query** (\`POST /api/mcp\`): Interfață JSON-RPC 2.0 Model Context Protocol.
`);
  }

  // 7. MCP SERVER CARD & LIVE ENDPOINT
  if (
    pathLower === '/.well-known/mcp.json' ||
    pathLower === '/.well-known/mcp/server-card.json' ||
    pathLower === '/.well-known/mcp-server.json' ||
    pathLower === '/mcp.json'
  ) {
    return jsonResponse({
      mcpVersion: '2025-03-26',
      name: 'urefy-mcp-server',
      title: 'Urefy Sovereign Context Engine (MCP)',
      version: '2.0.0',
      description: 'Server Model Context Protocol oficial pentru Urefy.com (Canale, Postări, Verificare DID).',
      homepage: BASE_URL,
      endpoints: {
        http: `${BASE_URL}/api/mcp`,
        sse: `${BASE_URL}/api/mcp`,
      },
      authentication: {
        type: 'oauth2',
        authorizationServerMetadataUrl: `${BASE_URL}/.well-known/oauth-authorization-server`,
        instructionsUrl: `${BASE_URL}/auth.md`,
      },
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
        prompts: { listChanged: false },
      },
      tools: [
        {
          name: 'list_channels',
          description: 'Returnează canalele publice disponibile pe Urefy.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_platform_info',
          description: 'Returnează informații despre arhitectura criptografică Urefy și eMessage 2.0.',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    });
  }

  if (pathLower === '/api/mcp') {
    if (request.method === 'GET') {
      return jsonResponse({
        status: 'ok',
        protocol: 'mcp',
        serverCard: `${BASE_URL}/.well-known/mcp.json`,
      });
    }
    const body = await request.json().catch(() => ({} as any));
    const rpcId = body?.id ?? 1;
    if (body?.method === 'tools/list') {
      return jsonResponse({
        jsonrpc: '2.0',
        id: rpcId,
        result: {
          tools: [
            {
              name: 'list_channels',
              description: 'Returnează canalele publice disponibile pe Urefy.',
              inputSchema: { type: 'object', properties: {} },
            },
            {
              name: 'get_platform_info',
              description: 'Returnează detalii despre securitatea E2EE și capabilitățile Urefy.',
              inputSchema: { type: 'object', properties: {} },
            },
          ],
        },
      });
    }
    return jsonResponse({
      jsonrpc: '2.0',
      id: rpcId,
      result: {
        protocolVersion: '2025-03-26',
        serverInfo: { name: 'urefy-mcp-server', version: '2.0.0' },
        capabilities: { tools: {} },
      },
    });
  }

  // 8. WEB BOT AUTH (RFC 9421)
  if (
    pathLower === '/.well-known/http-message-signatures-directory' ||
    pathLower === '/.well-known/jwks.json' ||
    pathLower === '/.well-known/web-bot-auth'
  ) {
    const contentType =
      pathLower === '/.well-known/http-message-signatures-directory'
        ? 'application/http-message-signatures-directory+json'
        : 'application/json';
    return jsonResponse(
      {
        keys: [
          {
            kty: 'OKP',
            crv: 'Ed25519',
            kid: 'urefy-federation-bot-2026-01',
            use: 'sig',
            alg: 'EdDSA',
            x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo',
          },
        ],
        agent: 'UrefyBot/2.0 (+https://urefy.com/.well-known/agent.json)',
        purpose: 'federation-and-agent-discovery',
      },
      contentType,
      {
        'Cache-Control': 'public, max-age=86400',
      }
    );
  }

  // 9. MARKDOWN NEGOTIATION
  if (
    (path === '/' || path === '/index.html') &&
    (accept.includes('text/markdown') || url.searchParams.get('format') === 'markdown')
  ) {
    return markdownResponse(MARKDOWN_HOME);
  }

  // 10. Canonical Host & Protocol Normalization
  if (url.hostname === 'www.urefy.com' || (url.hostname === 'urefy.com' && url.protocol !== 'https:')) {
    return Response.redirect(SITE_ORIGIN + url.pathname + url.search, 301);
  }

  if (url.pathname === '/feed' || url.pathname === '/index.html') {
    url.pathname = '/';
    return Response.redirect(url.toString(), 301);
  }
  if (url.pathname.length > 1 && url.pathname.endsWith('/') && !url.pathname.startsWith('/api/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
    return Response.redirect(url.toString(), 301);
  }

  // Explicit app-only routes retain their shell without becoming indexable pages.
  if (['/messages', '/vault', '/profile', '/more', '/settings', '/governance', '/notifications'].includes(url.pathname)) {
    const shell = await context.env.ASSETS.fetch(new URL('/', url.origin));
    const privateShell = injectStaticPageSeo(shell, {
      title: `${url.pathname.slice(1).replace(/^./, (s) => s.toUpperCase())} — UREfy`,
      description: 'Personal workspace on UREfy.',
      canonicalUrl: SITE_ORIGIN + url.pathname,
      origin: SITE_ORIGIN,
      robots: 'noindex, follow',
    });
    const headers = new Headers(privateShell.headers);
    headers.set('X-Robots-Tag', 'noindex, follow');
    headers.set('Cache-Control', 'private, no-store');
    headers.set('Link', AGENT_LINK_HEADERS);
    return new Response(privateShell.body, { headers });
  }

  // 11. Legacy route resolution
  const legacyResolution = resolveLegacyRoute(url.pathname);
  if (legacyResolution.action === 'redirect' && legacyResolution.target) {
    const redirectUrl = new URL(legacyResolution.target, url.origin);
    return new Response(null, {
      status: 301,
      statusText: 'Moved Permanently',
      headers: {
        Location: redirectUrl.toString(),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        Link: AGENT_LINK_HEADERS,
      },
    });
  }

  if (legacyResolution.action === 'gone') {
    return new Response(
      '410 Gone: This legacy resource has been permanently removed. UREfy is a sovereign consumer social network and does not host legacy third-party content.',
      {
        status: 410,
        statusText: 'Gone',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'X-Robots-Tag': 'noindex, nofollow, unavailable_after: 2026-09-19T00:00:00Z',
          Link: AGENT_LINK_HEADERS,
        },
      }
    );
  }

  // 12. Downstream function or static asset execution
  const response = await next();

  // Unknown paths must never inherit the root SPA's successful HTML response.
  const publicRoute = /^\/(?:$|explore$|discussions$|communities$|about$|features$|privacy$|terms$|security$|faq$|guides(?:\/(?:get-started|private-messaging))?$|admin(?:\.html)?$|(?:p|post|c|u)\/[^/]+$|auth\.md$|openapi\.json$|skills\.md$|mcp\.json$|skills\.json$|\.well-known\/.*$)/.test(
    url.pathname
  );
  if (!publicRoute && !url.pathname.startsWith('/api/') && response.headers.get('Content-Type')?.includes('text/html')) {
    return seoError(404);
  }

  // 13. Attach Link Headers, AI content signals, and security headers
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Link', AGENT_LINK_HEADERS);
  newHeaders.append('Vary', 'Accept');
  newHeaders.set('X-Content-Signal', 'ai-train=yes, search=yes, ai-input=yes');
  if (url.hostname.endsWith('.pages.dev')) newHeaders.set('X-Robots-Tag', 'noindex, nofollow');
  if (!newHeaders.has('X-Content-Type-Options')) {
    newHeaders.set('X-Content-Type-Options', 'nosniff');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
