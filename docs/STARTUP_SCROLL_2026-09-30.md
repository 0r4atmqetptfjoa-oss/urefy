# UREfy startup and feed scroll optimization — 2026-09-30

Published to urefy.com: Cloudflare Pages deployment 6fdee7df.

## Findings and changes

- Homepage SSR rendered the public introduction and recent post text before the dynamic workspace. The existing early theme script now displays a static branded loading shell only on /, /feed and /index.html. The client removes it after initialization, including on failure. A 15-second fallback reveals the public page if startup does not complete. JavaScript-disabled visitors and public deep links retain their server content. No bot-specific rendering or SEO metadata changes.
- Production HTML now preloads the application module and its delayed CSS while the secure vault initializes. Preload downloads modules without evaluating them; secureStorage.init() still precedes app execution.
- Removed the duplicate 30-second sync in app.ts. ClientStore keeps its existing 15-second timer, hidden-tab handling and online reconnection sync.
- Removed speculative initialization of theme builder, slide decks and CVE tools. These still load when opened. Code sandbox loads only when pre code exists.
- Classic feed cards use browser content-visibility with remembered intrinsic heights to skip offscreen layout/paint. All posts remain in the DOM. Focused/hovered cards are excluded; unsupported browsers retain normal rendering. This is not DOM virtualization and may change the estimated scrollbar height on the first traversal of unmeasured cards.
- Video autoplay observer is reused rather than disconnected/recreated on every binding pass. Container and child video are not both observed. Removed media nodes are unobserved; poster handlers bind once.
- Lazy images request asynchronous decoding; card transitions target specific visual properties rather than all properties.
- Early theme script is included in PWA precache and build-version hash.

## Evidence and limits

Production build and frontend TypeScript compilation succeeded. Production homepage and theme script returned HTTP 200. Live HTML contains the new loading shell, preload and public recent discussion content. Live main-Rk31DzIU.js reference matches dist; app-COGGPFlk.js SHA-256 matches local output.

No unit/E2E suites or CPU/scroll benchmarks were run for this pass. Earlier 2,605-test results belong to the preceding repair pass. No measured FPS or load-time improvement is claimed. Verify feel on the owner's browser/device; content-visibility reduces offscreen rendering work but does not eliminate synchronous application initialization.

No AWS resource, credential, D1/R2/DO binding, DM crypto or DNS change. Existing public SEO data remains in the HTML.