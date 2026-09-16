# Administrator passkeys

Open `/admin`, sign in with the existing admin PIN, then choose **Server Config → Admin passkeys → Add a passkey**. Complete the device prompt. On the next visit, **Sign in with a passkey** opens the device's credential picker. The admin PIN remains the recovery method.

Keys are scoped to their exact origin. A key registered on `urefy.com` cannot be used on `www.urefy.com` or the Pages hostname. Development uses `localhost`, because IP addresses are not valid WebAuthn RP IDs. Device verification is required for enrollment and login.

**Revoke** removes a key immediately for future authentication. Existing signed admin sessions retain their existing 30-minute lifetime; revocation does not terminate those sessions. Keep the recovery PIN available before removing your last key.

## Server behavior

- Migration `0010_verified_admin_passkeys.sql` adds separate verified credentials and challenge tables. Legacy rows in `admin_passkey_credentials` are never accepted for administrator login.
- Enrollment, listing, and revocation require existing admin authorization. Enrollment challenges are also bound to the authorization header used to request them.
- D1 atomically consumes each challenge before verification. Challenges expire after five minutes, and issuance is limited to 30 per source IP during that window.
- SimpleWebAuthn verifies the challenge, origin, RP ID, user presence, user verification, and assertion signature. Authentication also checks the stored user handle and updates the signature counter conditionally.
- Cross-origin requests and iframe ceremonies are rejected. Public keys remain on the server; private keys remain with the authenticator. Session tokens are held in browser memory.
- Missing or unavailable D1 storage fails closed. There is no in-memory credential fallback.

The implementation follows the [SimpleWebAuthn server API](https://simplewebauthn.dev/docs/packages/server).

## Verification

`test/admin-passkeys.test.ts` uses SQLite and a Chromium virtual authenticator for real registration/assertion cryptography, concurrent replay, expiry, altered signatures, signed invalid RP/flags/counter, session binding, revocation, and missing storage. `e2e/admin-passkeys.spec.ts` covers enrollment, reload, login, and revocation through the built administration UI with the real API handlers and an isolated database.

The browser test uses `localhost` automatically, even if the preview base URL uses `127.0.0.1`.
