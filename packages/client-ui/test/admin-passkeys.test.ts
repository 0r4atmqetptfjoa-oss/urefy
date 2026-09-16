import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createPrivateKey, createHash, sign } from 'node:crypto';
import { chromium, type Browser, type Page } from '@playwright/test';
import { onRequestPost, resetAdminStores, verifyAdminSessionToken } from '../functions/api/admin.js';

const pin = 'test-only-admin-29481';
let sql: DatabaseSync;
let browser: Browser;
let page: Page;
let credentialId: string;
let privateKey: string;
const db: any = {
  prepare(query: string) {
    let values: any[] = [];
    return {
      bind(...args: any[]) { values = args; return this; },
      async first() { return sql.prepare(query).get(...values) || null; },
      async all() { return { success: true, results: sql.prepare(query).all(...values) }; },
      async run() { const result = sql.prepare(query).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
    };
  },
};
async function post(action: string, values: object = {}, authenticated = false, origin = 'https://urefy.com') {
  const response = await onRequestPost({ env: { DB: db, ENVIRONMENT: 'production', ADMIN_PIN: pin },
    request: new Request('https://urefy.com/api/admin', { method: 'POST', headers: {
      'Content-Type': 'application/json', Origin: origin, ...(authenticated ? { Authorization: `Bearer ${pin}` } : {}),
    }, body: JSON.stringify({ action, ...values }) }) });
  return { status: response.status, data: await response.json() as any };
}
async function assertion() {
  const challenge = await post('passkey-challenge');
  expect(challenge.status).toBe(200);
  const credential = await page.evaluate(async (options) => {
    const key = await navigator.credentials.get({ publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options) }) as PublicKeyCredential;
    return key.toJSON();
  }, challenge.data.options);
  return { challengeId: challenge.data.challengeId, credential };
}

describe('admin passkeys: real browser cryptography and durable challenge consumption', () => {
  beforeAll(async () => {
    sql = new DatabaseSync(':memory:');
    sql.exec(readFileSync(new URL('../migrations/0010_verified_admin_passkeys.sql', import.meta.url), 'utf8'));
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    await page.route('https://urefy.com/**', route => route.fulfill({ body: '<!doctype html><title>Passkey test</title>', contentType: 'text/html' }));
    await page.goto('https://urefy.com/passkey-test');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: {
      protocol: 'ctap2', transport: 'internal', hasResidentKey: true,
      hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true,
    } });
    const challenge = await post('passkey-registration-options', {}, true);
    expect(challenge.status).toBe(200);
    const credential = await page.evaluate(async (options) => {
      const key = await navigator.credentials.create({ publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options) }) as PublicKeyCredential;
      return key.toJSON();
    }, challenge.data.options);
    credentialId = credential.id;
    const registered = await post('passkey-register', { challengeId: challenge.data.challengeId, credential }, true);
    expect(registered.status).toBe(200);
    privateKey = (await cdp.send('WebAuthn.getCredentials', { authenticatorId })).credentials[0].privateKey;
    const replay = await post('passkey-register', { challengeId: challenge.data.challengeId, credential }, true);
    expect(replay.status).toBe(401);
  }, 30000);
  beforeEach(() => { resetAdminStores(); sql.exec('DELETE FROM admin_passkey_challenges'); });
  afterAll(async () => { await browser?.close(); sql?.close(); });

  it('issues a verifiable admin session after a real assertion, once only even concurrently', async () => {
    const body = await assertion();
    const results = await Promise.all([post('passkey-verify', body), post('passkey-verify', body)]);
    expect(results.map(r => r.status).sort()).toEqual([200, 401]);
    expect(await verifyAdminSessionToken(results.find(r => r.status === 200)!.data.token, pin)).toBe(true);
  });
  it.each(['passkey-register', 'passkey-registration-options', 'passkey-list', 'passkey-revoke'])('requires admin authentication for %s', async action => {
    expect((await post(action)).status).toBe(401);
  });
  it('rejects a bare credential ID without an assertion', async () => {
    const result = await post('passkey-verify', { credentialId });
    expect(result.status).toBe(401);
    expect(result.data.token).toBeUndefined();
  });
  it('rejects expired challenges', async () => {
    const body = await assertion();
    sql.exec('UPDATE admin_passkey_challenges SET expires_at = 0');
    expect((await post('passkey-verify', body)).status).toBe(401);
  });
  it('rejects tampered signatures and consumes the failed attempt', async () => {
    const body: any = await assertion();
    const signature = body.credential.response.signature;
    body.credential.response.signature = 'AAAA';
    expect((await post('passkey-verify', body)).status).toBe(401);
    body.credential.response.signature = signature;
    expect((await post('passkey-verify', body)).status).toBe(401);
  });
  it.each(['rpId', 'userPresence', 'userVerification', 'counter'])('rejects a correctly signed assertion with invalid %s', async field => {
    const body: any = await assertion();
    const authData = Buffer.from(body.credential.response.authenticatorData, 'base64url');
    if (field === 'rpId') authData[0] ^= 1;
    if (field === 'userPresence') authData[32] &= ~1;
    if (field === 'userVerification') authData[32] &= ~4;
    if (field === 'counter') authData.writeUInt32BE(0, 33);
    const hash = createHash('sha256').update(Buffer.from(body.credential.response.clientDataJSON, 'base64url')).digest();
    const key = createPrivateKey({ key: Buffer.from(privateKey, 'base64'), format: 'der', type: 'pkcs8' });
    body.credential.response.authenticatorData = authData.toString('base64url');
    body.credential.response.signature = sign('sha256', Buffer.concat([authData, hash]), key).toString('base64url');
    expect((await post('passkey-verify', body)).status).toBe(401);
  });
  it('never falls back to memory when durable storage is unavailable', async () => {
    const response = await onRequestPost({ env: { ADMIN_PIN: pin, ENVIRONMENT: 'production' }, request: new Request('https://urefy.com/api/admin', {
      method: 'POST', headers: { Origin: 'https://urefy.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'passkey-challenge' }),
    }) });
    expect(response.status).toBe(503);
    expect((await response.json() as any).token).toBeUndefined();
  });
  it.each(['origin', 'challenge', 'type', 'crossOrigin'])('rejects altered client data: %s', async field => {
    const body: any = await assertion();
    const clientData = JSON.parse(Buffer.from(body.credential.response.clientDataJSON, 'base64url').toString());
    clientData[field] = field === 'crossOrigin' ? true : 'attacker';
    body.credential.response.clientDataJSON = Buffer.from(JSON.stringify(clientData)).toString('base64url');
    expect((await post('passkey-verify', body)).status).toBe(401);
  });
  it('rejects a different user handle', async () => {
    const body: any = await assertion();
    body.credential.response.userHandle = 'dW5rbm93bg';
    expect((await post('passkey-verify', body)).status).toBe(401);
  });
  it('rejects cross-site HTTP requests', async () => {
    expect((await post('passkey-challenge', {}, false, 'https://attacker.example')).status).toBe(403);
  });
  it('binds enrollment challenges to their authenticated session', async () => {
    const challenge = await post('passkey-registration-options', {}, true);
    sql.exec("UPDATE admin_passkey_challenges SET session_hash = 'different-session'");
    expect((await post('passkey-register', { challengeId: challenge.data.challengeId, credential: { response: {} } }, true)).status).toBe(401);
  });
  it('limits challenge issuance across requests', async () => {
    for (let i = 0; i < 30; i++) expect((await post('passkey-challenge')).status).toBe(200);
    expect((await post('passkey-challenge')).status).toBe(429);
  });
  it('lists and revokes an enrolled key, preventing subsequent authentication', async () => {
    const listed = await post('passkey-list', {}, true);
    expect(listed.data.credentials.map((c: any) => c.credential_id)).toContain(credentialId);
    const body = await assertion();
    expect((await post('passkey-revoke', { credentialId }, true)).status).toBe(200);
    expect((await post('passkey-verify', body)).status).toBe(401);
  });
});
