import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { getD1Database, type Env } from './_db.js';

const TTL = 5 * 60_000;
const USER = new TextEncoder().encode('urefy-instance-administrator');

const ALLOWED_PASSKEY_HOSTS = new Set([
  'urefy.com',
  'www.urefy.com',
  'aetheris-omni-sphere.pages.dev',
  'aetheris.pages.dev',
  'aetheris.network',
  'aetheris.io',
]);

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const digest = async (value: string): Promise<string> =>
  encodeBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));

const json = (status: number, data: object): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const denied = (): Response =>
  json(401, {
    success: false,
    authorized: false,
    error: 'Passkey verification failed. Try again or use your admin PIN.',
  });

interface CredentialRow {
  credential_id: string;
  public_key: string;
  counter: number;
  user_handle: string;
}

interface ChallengeRow {
  challenge: string;
}

/** Only the caller may issue sessions; no key or identity supplied by a client is trusted. */
export async function handleAdminPasskey(
  request: Request,
  env: Env | undefined,
  body: any,
  authorize: () => Promise<boolean>,
  issueSession: () => Promise<string>
): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const local =
    env?.ENVIRONMENT !== 'production' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]');

  if (
    origin !== url.origin ||
    (!local && url.protocol !== 'https:') ||
    (!local && !ALLOWED_PASSKEY_HOSTS.has(url.hostname.toLowerCase()))
  ) {
    return json(403, {
      success: false,
      authorized: false,
      error: 'Passkeys require the same trusted origin.',
    });
  }

  const management = [
    'passkey-registration-options',
    'passkey-register',
    'passkey-list',
    'passkey-revoke',
  ].includes(body.action);

  if (management && !(await authorize())) return denied();

  const db = getD1Database(env);
  if (!db) {
    return json(503, {
      success: false,
      authorized: false,
      error: 'Passkey storage unavailable. Use your admin PIN.',
    });
  }

  try {
    if (body.action === 'passkey-list') {
      const result = await db
        .prepare(
          'SELECT credential_id, created_at, last_used_at FROM admin_verified_passkeys WHERE origin = ? ORDER BY created_at DESC'
        )
        .bind(origin)
        .all();
      return json(200, { success: true, credentials: result.results });
    }

    if (body.action === 'passkey-revoke') {
      if (typeof body.credentialId !== 'string' || !body.credentialId.trim()) return denied();
      await db
        .prepare('DELETE FROM admin_verified_passkeys WHERE credential_id = ? AND origin = ?')
        .bind(body.credentialId.trim(), origin)
        .run();
      return json(200, { success: true });
    }

    const registration =
      body.action === 'passkey-registration-options' || body.action === 'passkey-register';
    const purpose = registration ? 'registration' : 'authentication';
    const sessionHash = registration
      ? await digest(request.headers.get('Authorization') || request.headers.get('X-Admin-PIN') || '')
      : '';

    if (body.action === 'passkey-challenge' || body.action === 'passkey-registration-options') {
      const now = Date.now();
      const ipHash = await digest(request.headers.get('CF-Connecting-IP') || 'local');
      await db.prepare('DELETE FROM admin_passkey_challenges WHERE expires_at < ?').bind(now).run();

      const count = await db
        .prepare(
          'SELECT COUNT(*) AS count FROM admin_passkey_challenges WHERE ip_hash = ? AND expires_at >= ?'
        )
        .bind(ipHash, now)
        .first<{ count: number }>();

      if ((count?.count || 0) >= 30) {
        return json(429, {
          success: false,
          error: 'Too many passkey requests. Try again in five minutes.',
        });
      }

      const options = registration
        ? await generateRegistrationOptions({
            rpName: 'UREfy Administration',
            rpID: url.hostname,
            userName: 'Administrator',
            userID: USER,
            attestationType: 'none',
            supportedAlgorithmIDs: [-7, -257],
            authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
            excludeCredentials: (
              await db
                .prepare('SELECT credential_id FROM admin_verified_passkeys WHERE origin = ?')
                .bind(origin)
                .all<{ credential_id: string }>()
            ).results.map((c) => ({ id: c.credential_id })),
          })
        : await generateAuthenticationOptions({
            rpID: url.hostname,
            userVerification: 'required',
          });

      const challengeId = crypto.randomUUID();
      await db
        .prepare(
          'INSERT INTO admin_passkey_challenges (id, challenge, purpose, origin, session_hash, ip_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(challengeId, options.challenge, purpose, origin, sessionHash, ipHash, now + TTL)
        .run();

      return json(200, { success: true, challengeId, options });
    }

    if (
      !['passkey-register', 'passkey-verify'].includes(body.action) ||
      typeof body.challengeId !== 'string' ||
      !body.credential?.response
    ) {
      return denied();
    }

    const challenge = await db
      .prepare(
        'UPDATE admin_passkey_challenges SET consumed = 1 WHERE id = ? AND purpose = ? AND origin = ? AND session_hash = ? AND consumed = 0 AND expires_at > ? RETURNING challenge'
      )
      .bind(body.challengeId, purpose, origin, sessionHash, Date.now())
      .first<ChallengeRow>();

    if (!challenge) return denied();

    try {
      const clientData = JSON.parse(
        new TextDecoder().decode(decodeBase64Url(body.credential.response.clientDataJSON))
      );
      if (clientData.crossOrigin === true || clientData.topOrigin) return denied();
    } catch {
      return denied();
    }

    if (registration) {
      let result;
      try {
        result = await verifyRegistrationResponse({
          response: body.credential,
          expectedChallenge: challenge.challenge,
          expectedOrigin: origin,
          expectedRPID: url.hostname,
          requireUserVerification: true,
          supportedAlgorithmIDs: [-7, -257],
        });
      } catch {
        return denied();
      }
      if (!result.verified || !result.registrationInfo) return denied();
      const credential = result.registrationInfo.credential;
      await db
        .prepare(
          'INSERT INTO admin_verified_passkeys (credential_id, public_key, counter, origin, user_handle, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind(
          credential.id,
          encodeBase64Url(credential.publicKey),
          credential.counter,
          origin,
          encodeBase64Url(USER),
          Date.now()
        )
        .run();
      return json(200, { success: true });
    }

    const stored = await db
      .prepare(
        'SELECT credential_id, public_key, counter, user_handle FROM admin_verified_passkeys WHERE credential_id = ? AND origin = ?'
      )
      .bind(body.credential.id, origin)
      .first<CredentialRow>();

    if (!stored || body.credential.response.userHandle !== stored.user_handle) return denied();

    let result;
    try {
      result = await verifyAuthenticationResponse({
        response: body.credential,
        expectedChallenge: challenge.challenge,
        expectedOrigin: origin,
        expectedRPID: url.hostname,
        requireUserVerification: true,
        credential: {
          id: stored.credential_id,
          publicKey: decodeBase64Url(stored.public_key),
          counter: stored.counter,
        },
      });
    } catch {
      return denied();
    }

    if (!result.verified) return denied();

    const updated = await db
      .prepare(
        'UPDATE admin_verified_passkeys SET counter = ?, last_used_at = ? WHERE credential_id = ? AND origin = ? AND counter = ? RETURNING credential_id'
      )
      .bind(
        result.authenticationInfo.newCounter,
        Date.now(),
        stored.credential_id,
        origin,
        stored.counter
      )
      .first();

    if (!updated) return denied();

    return json(200, {
      success: true,
      authorized: true,
      token: await issueSession(),
      expiresIn: 1800,
    });
  } catch {
    return json(503, {
      success: false,
      authorized: false,
      error: 'Passkey service unavailable. Use your admin PIN.',
    });
  }
}
