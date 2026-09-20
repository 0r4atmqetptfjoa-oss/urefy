# UREfy — product integrity and design hardening

## Scope and starting point

The checkout already contained extensive uncommitted UI, admin, SEO, cryptography-adjacent and test changes. Those changes were retained. This report describes this pass, not everything in `git diff`.

The initial port-3000 preview served an older `assets-v4` build. An already-open tab failed to import a removed lazy chunk. Source and production builds now use `assets-v5`.

Baseline: TypeScript passed. Client: **2,348 passed / 5 failed**, across 194 files. Crypto: 340 passed; relay: 101; Vault engine: 21; archivist: 3. The five existing failures concerned the standalone versus centrally managed modal lifecycle and incomplete DOM test doubles.

## Architecture audited

| Layer | Architecture / boundaries |
| --- | --- |
| Application | Vite, TypeScript template rendering, Tailwind utilities, Lucide/SVG icons. `app.ts` renders shared zones; `ui/action-dispatcher.ts` delegates actions. Direct listeners coexist with delegation. |
| Routing | Hash routes for Home, Explore, communities, messages, Vault, profile/settings. Public `/p`, `/post`, `/c` adapters. Separate gated admin entry. |
| State | `client-state.ts`, feature engines, IndexedDB, encrypted device storage and legacy localStorage caches. Server acknowledgement and local presentation were frequently conflated. |
| HTTP | Pages Functions, canonical signed-envelope verification, D1 nonce replay protection, D1/R2/KV bindings. Development memory fixtures are separate from production persistence. |
| Real-time | Separate Workers Durable Object and Node relay implementations. Direct messaging also has an encrypted API outbox; WebRTC has a separate transport lifecycle. |
| Identity / encryption | Core package implements signing, identity derivation, direct-message/ratchet primitives. Existing protocol implementations were retained. The default identity gains the existing `user:follow` capability required by the follow API. |
| Database | Posts/comments, votes/interactions, communities/members, notifications/blocks, reports, credentials/nonces, direct messages, governance and admin ledger. No duplicate social tables were introduced. |
| Storage | Public R2 resources and D1 metadata are distinct from encrypted, device-local knowledge snapshots. A new allocation ledger accounts for in-flight cloud writes as well as committed bytes. |
| PWA | Manifest, original icons, build-stamped service worker, private-API exclusion and immutable assets. Deployment skew needs recovery without discarding current forms. |
| Federation | Existing actor, inbox/outbox, signature and SSRF code remains. User-specific WebFinger resolution and real remote interoperability are not established by these tests. |

## Confirmed defects corrected

### Social persistence

- Likes, reposts, bookmarks and reactions sent unsigned requests while reporting local success. They now use signed desired-state writes, pending guards, acknowledgement and rollback.
- Repost submitted through two different endpoints. The duplicate boost submission was removed.
- Single-post interaction responses were ignored by hydration. Both single and batch responses now reconcile, including reaction state; batches are bounded to 50 targets.
- Failed hydration is no longer permanently marked successful.
- A changed reaction replaces the previous choice in the same D1 transaction.
- Bookmark membership is only returned to an authenticated reader. Public requests cannot inspect another person's saved state.
- Legacy signed merit votes reject arbitrary weights and apply the difference from the existing ballot. Removing a vote no longer attempts to store a direction prohibited by the schema.
- Publication has explicit sending/failed states. Unconfirmed posts are kept as encrypted, bounded device drafts and can be retried after reload. Only acknowledged posts are announced as published.
- Creation no longer invents a self-endorsement. Server-assigned roles cannot be supplied by a post author. Post/channel identifiers and text sizes are validated.

### Reporting and identity

- Reporting no longer fabricates a local receipt after network/server failure. Details remain available for retry; success requires a real server receipt.
- Report metadata is escaped; the report dialog supports keyboard containment, Escape and focus restoration.
- The Vite middleware that returned successful, discarded DSA notices was removed.
- Notification reads, mark-read and deletion authenticate the recipient. Public callers cannot manufacture moderation/security notices through the notification endpoint.
- Notification hydration now reads the server's actual camelCase model. Read state persists; rejected changes reconcile. Notification rows are keyboard-operable native buttons.
- Fabricated welcome notifications and unconditional community-reaction/profile-persona seeding were removed from normal production startup.
- Profile updates authenticate the owner and persist through the API. Follow/unfollow is signed, reconciled and hydrated; the unsigned DELETE path was closed.
- Profile forms retain rejected edits and have pending save states. Photo selection uploads to the server rather than treating a local data URL as a published photo.
- Unknown profiles no longer receive invented verification, trust scores, biographies or online presence.

### Communities and storage

- Join/leave requires a signed identity. Invalid signatures cannot fall through to a supplied user ID. Directory responses include the actual requesting user's membership.
- Membership errors roll back, counts can decrease, and successfully loaded server communities supersede built-in suggestions.
- Community creation is signed. Private/restricted creation fails explicitly while permission-preserving access controls are unavailable; it is not represented as private in the UI after a public-only server write.
- `0012_storage_allocations.sql` adds owner-bound, durable allocation accounting. A conditional D1 insert serializes quota checks across isolates and includes in-flight writes.
- Configurable defaults: **25 MiB/file**, **100 MiB/account**, **8 GiB/platform**. The configured values can lower these limits. The account ceiling can be configured up to 1 GiB; the file/platform safety ceilings remain bounded.
- Upload MIME validation includes image/PDF signatures and rejects active web-document types. Binary uploads bind their signed checksum and filename. Existing object keys cannot be overwritten by another upload.
- Quota, invalid responses and network failure no longer produce invented successful R2/P2P transfers or storage keys.
- An uncertain write retains its allocation unless cleanup proves the object was deleted. Confirmed deletion removes metadata, allocation and the production in-memory read cache.
- Public resources no longer claim to be encrypted, safe, audited or reproducible without evidence. Missing hashes, sizes and entropy are not fabricated. Newly registered storage metadata is `UNSCANNED`.
- The production schema no longer inserts fictional posts, messages, engagement, telemetry or CVEs when provisioning a database. No existing production data was deleted.

## Design and usability

- Home is conversation-first: the large promotional hero and duplicate radar feed were replaced by compact community/Vault wayfinding.
- Shared structural tokens cover spacing, purpose-specific radii, type, focus, semantic states and timing in `src/product.css`.
- A restrained rail, continuous discussion rows, compact actions and quieter shared surfaces replace repeated promotional cards. Explore and Communities now lead with discovery controls rather than marketing artwork.
- Simple mode reduces specialist tools in both desktop and mobile navigation. Advanced retains their entry points.
- Mobile navigation is inert while closed, supports keyboard containment and exposes a community-directory destination.
- Reaction popovers use measured dimensions, viewport collision handling, nested-scroll tracking and keyboard focus management.
- The quick composer stores text independently of DOM focus. Its focus-induced height change was removed after WebKit testing showed the Post button moving between pointer-down and pointer-up.
- Profile editing is mounted only in the shared modal root; duplicate form IDs were discovered and removed in cross-browser testing.
- PWA recovery offers a reload action for unavailable chunks. One previous immutable-asset cache is retained for existing tabs; old API caches are not retained across builds.
- Existing original UREfy identity assets were sufficient. No unused generated artwork or new animation dependencies were added.

## Verification

### Automated

- The complete unit/tool chain reached **2,367 passing client tests in 195 files**, plus crypto 340, relay 101, Vault engine 21, archivist 3, smoke 6, bundle-tool 4 and branding-tool 4. No test suites were disabled.
- New production-schema tests cover signed identities, duplicate requests, reaction replacement, unavailable posts, quarantine, bookmark privacy, owner-scoped notifications, profile/follow writes, upload quotas, MIME checks and deletion accounting.
- A browser journey exercises real API handlers and canonical SQLite: merit, repost/undo/reload, reactions/reload, failed bookmarks, failed and successful reports, encrypted unsent drafts/reload/retry, profile persistence and six responsive widths.
- Existing encrypted two-session messaging, nested discussion/context, local Vault, governance, passkey, PWA, navigation, theme and responsive suites were exercised.
- A full Chromium + Mobile Chrome run initially reached 114 passed / 2 failed. Both failures were an ambiguous test locator selecting the new Skip-to-content control instead of Skip onboarding; the targeted corrected branding journeys passed.
- Firefox/WebKit uncovered and drove fixes for the quick-composer focus collapse, a cancelled optional analytics import, and duplicate profile forms. The expanded product-integrity and branding journeys subsequently passed in Chromium, Firefox and WebKit.
- TypeScript and the production build pass. Existing large-chunk / ineffective-dynamic-import warnings remain.
- Last measured startup bundle: **574.65 KiB gzip JS / 49.62 KiB gzip CSS**, under the unchanged **580 KiB JS** ceiling.
- Static UX gates passed. The production audit's 23 static gates passed after correcting a recovery-phrase label false positive. These gates are not an independent security certification; several real defects above existed despite those broad static assertions.

Final acceptance and deployment results are recorded below.

### Running local Pages/D1/R2 verification

The isolated full-stack preview uses Wrangler's **local** emulators and `.wrangler-product-qa/` persistence:

```powershell
npm run build
npm run local:db --workspace=packages/client-ui
npm run preview:full --workspace=packages/client-ui
```

URL: `http://127.0.0.1:3011`. Port 3010 is the static build preview used by the API-handler browser suites.

A post was submitted through the actual UI and independently read back from `/api/posts` (HTTP 200). A signed upload/download/account-usage/delete cycle against the running local R2/D1 bindings returned identical bytes, 32 allocated bytes, HTTP 200 deletion and zero remaining bytes. This is local emulator evidence, not a production cloud mutation.

## Deployment dependencies and remaining acceptance gaps

1. **Migrations 0012 and 0013 are now applied in production.** Inspection found that 0011 was already recorded by deployment time. Wrangler reports no outstanding migrations.
2. Legacy R2 resources are counted toward the platform cap using D1 metadata; their owners are not present in the old metadata schema. Backfill owner allocations from authoritative R2 metadata before advertising complete historical per-account usage. Uncatalogued legacy R2 objects also require inventory reconciliation.
3. Production anonymous voting previously accepted caller-invented nullifiers without an issuer/proof verification path. That endpoint now returns 503 without recording votes. Connecting the real ballot issuer and proof verifier is an explicit dependency; core RLN/ratchet algorithms were not replaced.
4. Private community access control, the complete shared moderation/rules lifecycle, user-specific federation discovery and all specialist tools are not comprehensively production-verified. Existing block/mute synchronization and remaining legacy local-only controls need further endpoint-by-endpoint work.
5. The local Pages preview has no connected relay Durable Object unless the relay worker is also running. HTTP persistence and private API outboxes work independently; this preview does not prove deployed real-time relay connectivity.
6. Production deployment was explicitly authorized later in the session and is recorded below. No destructive database operation, remote seed run, git commit or push was performed. Production identity recovery, remote federation and R2/CDN revocation semantics still require environment-specific verification.

This pass materially improves the product and fixes verified defects. It does **not** certify the entire original multi-product mandate or every pre-existing control as production-ready.

## Authorized production deployment

- Canonical URL: **https://urefy.com**.
- Final deployment: **https://0a146f35.aetheris-omni-sphere.pages.dev**.
- Deployment ID: `0a146f35-e25a-45e6-99bc-2617c8227df5`, status `success`, production branch `main`.
- Initial deployment in this pass: `c08180c2-a017-4b8b-8bce-7da83c16ce9f`; replaced with a notification-schema compatibility fix after live verification.
- Deployment before this pass: `b5b71867-9d59-4fb0-bea9-b94d2f32cf31`.
- Pre-migration D1 Time Travel bookmark: `00000108-00000000-000050ea-7047a21f873be92aeef70c0a67f5ab44`. This was recorded, not restored.
- Existing authenticated environment credentials were sufficient. No token or secret value was added to source or printed by the deployment inspection utility.

### Live schema correction

Live signed notification reads initially returned 500. Production used `action_type` / `content_snippet` instead of the repository's `type` / `preview_text`, and lacked `user_blocks` / `user_mutes`.

Migration `0013_social_safety_tables.sql` creates the missing canonical safety tables without replacing existing tables. `_notification-storage.ts` detects either notification layout, and API reads normalize both. Existing notification columns and records are preserved. A regression test recreates the exact production table definition and verifies write/read behavior.

### Confirmed live results

| Check | Result |
| --- | --- |
| Canonical domain | Loads the published `assets-v5/main-C-iIeQhj.js` build |
| Fresh live-page console after final deploy | Zero errors and warnings in the observed browser session |
| `/api/health` | HTTP 200, `online` |
| Public posts / communities | HTTP 200, successful JSON |
| Unauthenticated notification/account-storage reads | HTTP 401 |
| Signed notification read after compatibility fix | HTTP 200, success |
| Signed account-storage read | HTTP 200; 104,857,600-byte account cap; 26,214,400-byte file cap |
| D1 migrations | None pending |
| D1, R2, KV, relay bindings | Existing bindings retained |
| Existing secret names/types | Retained as `secret_text`; values were not logged |
| Production storage settings | 25 MiB/file, 100 MiB/account, 8 GiB/platform |

### Final verification detail

- Last complete unit/tool run: 2,367 client tests plus the shared/relay/Vault/archivist and root tool suites all passed. Two subsequent selection regression cases and one production-notification-layout case passed in focused suites.
- Last complete Chromium + Mobile Chrome run: 115 passed / one cursor-selection regression. That regression was subsequently fixed and passed in Chromium, Firefox and WebKit. Pure UI tests now isolate service-worker installation; PWA runtime tests remain separate.
- Final expanded social/report/profile/follow/notification persistence journey: passed independently in Chromium, Firefox and WebKit.
- Final notification compatibility, authorization, storage and comments verification: 23 tests passed.
- Final TypeScript check and production build: passed.
- Final startup measurement: **574.98 KiB gzip JS**, **49.62 KiB gzip CSS**, unchanged 580 KiB JS ceiling.
- `git diff --check` still reports pre-existing trailing whitespace in several already-dirty files; no whitespace cleanup of unrelated user work was performed.
