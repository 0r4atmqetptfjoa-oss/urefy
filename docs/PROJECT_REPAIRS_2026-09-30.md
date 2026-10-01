# Project repair pass — 2026-09-30

Status: deployed to urefy.com in Cloudflare Pages production deployment `bb6caff0` on 2026-09-30. Existing AWS, email and SEO work was preserved. This is a scoped source audit, not a claim that the whole application is bug-free.

## Changes

| Area | Finding | Repair |
| --- | --- | --- |
| Public search | SQL excluded archived posts only, leaving drafts/deleted/tombstone posts eligible; legacy NULL status posts were omitted | Reuse public-discovery status/audience/synthetic-fixture policy; same statuses in memory fallback |
| Topic search | Counts read post_tags without checking the owning post's visibility | Join posts and apply public policy; exclude blocked authors from counts in database and fallback |
| Search input | Non-numeric limit became NaN, reaching D1 bindings or empty fallback results | Finite integer clamp, default 15, range 1–50 |
| Search result privacy | Deleted facet handles and avatars could still be returned | Return deleted-context label and omit handle/avatar in SQL |
| Search errors | Raw database exception text was returned to clients | Stable generic error response |
| Autocomplete HTML | Labels and subtitles were interpolated into innerHTML without escaping | Escape plain text including highlighted match pieces, badge text and class attributes |
| Autocomplete truthfulness | Production seeded demo people/tags; supplied tags got invented counts; all mentions got a verified badge | Demo data only in explicit development demo mode; preserve unknown/zero counts; verification requires explicit true |
| Autocomplete lifecycle | Empty datasets did not clear suggestions; delayed blur or keys from another input could affect current popup | Accept empty replacements and scope handlers to the active input |
| Link previews | Singleton cache grew without limit | Keep 256 most recently used entries |
| Link previews | HTML escaping alone did not constrain URL schemes for directly rendered cards | Allow HTTP/HTTPS only and reject embedded URL credentials |
| Sitemaps | Finite but out-of-range numeric timestamps could throw in toISOString and fail the whole response | Omit out-of-range numeric lastmod |

## Additional performance and product repairs

- Removed the 920,365-byte development persona source from production via an explicit Vite build alias to an empty typed dataset. Development and tests keep their original persona fixtures.
- Profile constructors seed demo data only in explicit demo mode; hard-coded demo names/handles are also unavailable in production. Regression verifies an empty production profile map and neutral identity fallbacks.
- Connected autocomplete to currently loaded clientStore.members. Empty member lists clear stale suggestions. No external lookup or new identity disclosure was introduced.
- Split the existing synchronous graph into navigation, post-rendering and interaction chunks. Strict execution ordering remains enabled. This is module organization; the measured total startup transfer, not individual chunk size alone, is the performance result.

| Metric | Before | Final |
| --- | ---: | ---: |
| Startup JavaScript gzip | 730.57 KiB | 665.56 KiB |
| Main app chunk, minified | about 936 KB | 485,484 bytes |
| Profile-posts chunk, minified | about 835 KB | about 77,850 bytes |
| Startup CSS gzip | 69.13 KiB | 69.13 KiB |

The actual startup JavaScript reduction is approximately 8.9%. The existing 700 KiB ceiling now passes without increasing it. No network timing or physical-device speed claim is made.

- Restored the missing Branch conversation control in the existing direct-message action dock. It delegates to the existing create-dm-branch handler, includes escaped peer/message attributes and an accessible label. No cryptographic or backend branch logic changed.

## Validation

- Final unit suite: 226 files, 2,605 tests passed, including 21 new regression tests. Real in-memory SQLite executed canonical application schema and search statements; no production DB writes were made.
- Two old test doubles required maintenance: sitemap mock now supports bind and qualified audience SQL; nonce mock implements first. Security expectations were retained; nonce verification code was not changed.
- Both frontend and Functions tsc --noEmit passed.
- Production build including Vite, Pages Functions and post-build succeeded; no chunk exceeds the existing 600 KB warning threshold.
- Existing production audit: 23/23 gates passed. These are the repository audit's checks, not proof that every possible security issue is absent.
- Brand/social interaction scenarios were exercised on Chromium, Firefox, WebKit and emulated Mobile Chrome (12 distinct cases). Initial combined runs had intermittent startup/publication/interaction timing failures. Every failing case subsequently passed in an isolated rerun; a single clean combined 12-case run is not claimed. The machine also exhibited prolonged D: write stalls during this pass; cause was not conclusively determined.
- Final asset `assets-v5/app-BInIos1A.js` on urefy.com has the same SHA-256 as local dist. Homepage references final entry `main-4pmuodpr.js`.
- Live GET checks: homepage, search with limit=NaN, topic search, sitemap index, paginated post/profile sitemaps, community sitemap, robots.txt and llms.txt returned 200. Public /p/post-organic-1 returned 200 and included DiscussionForumPosting and its canonical URL.
- Supplemental Chromium PWA checks passed (2 cases): install metadata/shortcuts and offline reload with private API cache exclusion. The 100-message direct/community chat scenario passed after replacing its stale More menu selector and restoring the branch control; it verifies the branch prompt, context capsules, voice rendering, search, emoji and mobile reply actions. This local scenario uses synthetic fixtures and does not send a real private message.
- Gmail sending was not exercised by this project maintenance pass.

## Deployment and boundaries

Cloudflare Pages project aetheris-omni-sphere, production branch main, deployment bb6caff0. Existing edge, origin, DNS, D1/R2/DO bindings, IAM credentials, AWS services and E2EE implementation were preserved. No new cloud services, migrations, dependencies, subscriptions or paid resources were added.

## Remaining limits

- Two build advisories still report dynamic imports of client-state/indexed-db that are also imported statically. Shared state must remain available to bootstrap; this pass did not claim those imports became lazy.
- The combined browser suite has intermittent timing behavior; retain the failures and rerun evidence when evaluating CI reliability. Emulated browsers are not physical-device verification.
- Source changes remain local and uncommitted, although their built output is live. Keep the current working tree for Gemini/Antigravity and preserve public audience/synthetic-fixture filtering.