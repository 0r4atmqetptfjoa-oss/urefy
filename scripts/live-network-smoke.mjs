import assert from 'node:assert/strict';

const timeoutMs = Number(process.env.LIVE_NETWORK_TIMEOUT_MS || 10_000);
const nodes = (process.env.UREFY_NODE_URLS || '')
  .split(',')
  .map((value) => value.trim().replace(/\/$/, ''))
  .filter(Boolean);
const fediverseHandle = (process.env.FEDIVERSE_TEST_HANDLE || '').trim();

if (nodes.length < 2) {
  throw new Error('Set UREFY_NODE_URLS to at least two comma-separated HTTPS nodes. Live checks never use synthetic defaults.');
}

function requirePublicHttps(value) {
  const url = new URL(value);
  assert.equal(url.protocol, 'https:', `Live target must use HTTPS: ${value}`);
  assert(!['localhost', '127.0.0.1', '::1'].includes(url.hostname), `Live target must be remote: ${value}`);
  return url;
}

async function fetchJson(url, accept = 'application/json') {
  const response = await fetch(url, {
    headers: { Accept: accept, 'User-Agent': 'UREfy-authorized-live-smoke/1.0' },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'error',
  });
  assert(response.ok, `${url} returned HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  assert(/json|activity\+json/i.test(contentType), `${url} returned unexpected Content-Type ${contentType}`);
  return response.json();
}

const observations = [];
for (const node of nodes) {
  const origin = requirePublicHttps(node).origin;
  const nodeInfo = await fetchJson(`${origin}/api/federation/nodeinfo`);
  const actor = await fetchJson(
    `${origin}/api/federation/actor`,
    'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
  );
  const outbox = await fetchJson(
    `${origin}/api/federation/outbox`,
    'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
  );
  assert.equal(nodeInfo.version, '2.1');
  assert.equal(actor.type, 'Service');
  assert.equal(new URL(actor.id).origin, origin);
  assert.equal(outbox.type, 'OrderedCollection');
  observations.push({ origin, actor: actor.id, outboxItems: Number(outbox.totalItems || 0) });
}

let fediverse = null;
if (fediverseHandle) {
  const normalized = fediverseHandle.replace(/^@/, '');
  const separator = normalized.lastIndexOf('@');
  assert(separator > 0, 'FEDIVERSE_TEST_HANDLE must have the form user@domain');
  const domain = normalized.slice(separator + 1);
  const resource = `acct:${normalized}`;
  const document = await fetchJson(`https://${domain}/.well-known/webfinger?resource=${encodeURIComponent(resource)}`);
  const actorLink = document.links?.find((link) => link.rel === 'self' && /activity\+json|activitystreams/i.test(link.type || ''));
  assert(actorLink?.href, 'WebFinger response did not advertise an ActivityPub actor');
  const actor = await fetchJson(actorLink.href, 'application/activity+json, application/ld+json');
  assert(actor.id && actor.inbox && actor.publicKey, 'Fediverse actor descriptor is incomplete');
  fediverse = { resource, actor: actor.id, inbox: actor.inbox };
}

process.stdout.write(`${JSON.stringify({ success: true, nodes: observations, fediverse }, null, 2)}\n`);
