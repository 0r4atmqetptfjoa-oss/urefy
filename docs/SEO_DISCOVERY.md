# UREfy public discovery and SEO

Updated: 2026-09-30. Production Pages deployment: `ccc38a54` on `aetheris-omni-sphere`, branch `main`. Canonical origin: https://urefy.com. Local changes are not committed/pushed.

## What is deployed

- Public posts `/p/:id` have their own title, description, canonical, Open Graph/Twitter preview, visible server-rendered content, author, publication date, selected public comments and related discussion links. JSON-LD contains `DiscussionForumPosting` and `BreadcrumbList`.
- Homepage, Explore, community directory and community pages have crawlable public discussion links. Profile links use `/u/:id`, including the post sidebar.
- `/about`, `/features`, `/security`, `/faq`, `/guides`, `/guides/get-started` and `/guides/private-messaging` contain factual, visible English documentation. These information pages are standalone HTML and do not load the large application bundle. Privacy text now acknowledges hosted infrastructure and limited performance monitoring.
- Metadata and AI reference files no longer claim invented adoption, ratings, certification, native applications, zero infrastructure telemetry or absence of hosted databases. Do not reintroduce unsupported claims.
- Canonical URLs use the production origin. HTTP/www, trailing slash and legacy equivalent routes redirect appropriately. Unknown communities return 404; deleted public posts return 410. Preview domains receive noindex headers. App-only workspaces are noindex with private/no-store responses.
- A dynamic sitemap index splits posts/profiles into 1,000-URL pages. Failed database reads return 503/Retry-After, not an apparently successful empty sitemap. Static pages have modification dates only where known. Posts currently lack a reliable stored edit timestamp: their sitemap omits lastmod and their structured data omits dateModified. Do not invent either date. Profiles use their actual updated_at.

## Privacy and eligibility

`packages/client-ui/functions/_discovery.ts` centralizes public eligibility:

- Published, pinned or locked posts, with public audience; legacy null values follow the existing public convention.
- Registered synthetic post fixtures are excluded from discovery; synthetic comments are excluded from post HTML/schema.
- Root profile pages/listings must not associate an unlinked facet with its root identity. Only linked active facets may contribute profile posts.
- Empty profiles without a bio or eligible public posts are noindex and absent from the profile sitemap.
- Private audiences, DM content, Vault, API endpoints and user workspaces are excluded. Robots rules do not replace application authorization.

No SEO work changes sovereign/E2EE cryptography, D1 schema, DNS nameservers, R2/DO infrastructure or AWS IAM/secrets. No new paid SEO subscription or AWS service was activated. Cloudflare function requests and D1 reads remain subject to the existing account plan; crawler traffic can increase usage.

## Sitemap inventory observed live

| Sitemap | Public URLs |
| --- | ---: |
| `/sitemap-static.xml` | 12 |
| `/sitemap-communities.xml` | 10 |
| `/sitemaps/posts/1` | 217 |
| `/sitemaps/profiles/1` | 1,000 |
| `/sitemaps/profiles/2` | 163 |
| Total | 1,402 |

The observed inventory has no duplicate URLs, foreign origins or private workspace URLs. Counts change with real content. Existing `/sitemap-posts.xml`, `/sitemap-posts-1.xml` and `/sitemap-profiles.xml` are first-page compatibility endpoints; the authoritative dynamic `/sitemap.xml` lists every page. Checked-in static sitemap files are asset fallbacks, not the live database inventory. All current profiles satisfied the eligibility policy; this pass did not delete profiles or user content.

## Search engine integration and evidence

### Google Search Console

The existing verified domain property `sc-domain:urefy.com` was used through the owner's authenticated Chrome session. `https://urefy.com/sitemap.xml` was submitted and the detail page confirmed that the sitemap index was processed. An initial transient fetch error cleared when Google processed it. The final Sitemaps table showed **Success and 173 discovered pages** on 2026-09-30; discovery is not proof of indexing. The live inventory of 1,402 URLs is larger than the current Google discovery counter.

Homepage was already indexed. Requests for the updated homepage, new FAQ and representative public post `/p/post-organic-1` were accepted into Google's priority crawl queue. The public post's live inspection confirmed it can be indexed and detected one valid discussion-forum element and one valid breadcrumb element. No production posts were created, edited or deleted to exercise submission hooks.

The new getting-started guide's indexing request was also accepted; see the completion evidence in `outputs/seo/`. Do not repeatedly submit unchanged URLs: Google says repeated requests do not change queue priority.

### IndexNow / Bing discovery

`functions/_indexnow.ts` sends only canonical public URLs to the fixed IndexNow API endpoint. `public/indexnow-key.txt` is a public domain-verification file; its value is not an IAM credential or user secret. The domain key file was verified live.

Successful public post publication/update/deletion schedules a best-effort notification using Pages waitUntil. Private-to-public transitions notify the new public URL; public-to-private transitions notify the previously public URL so it can be refreshed/removed. Private-only operations and fixtures do not submit URLs. A failed notification never changes the post transaction outcome. Logs contain only component, response status and count. Notifications have a five-second timeout and no durable retry queue; do not claim guaranteed delivery.

The initial batch received 403 while ownership validation was not yet accepted. A later focused homepage submission returned 200, followed by successful 200 receipts for the complete inventory in batches of 1,000 and 402. No Cloudflare security bypass was needed. API acceptance means receipt, not guaranteed indexing or ranking. Google discovery is handled separately via its sitemap/Search Console.

Operator command, from `packages/client-ui`:

```powershell
npx tsx scripts/submit-discovery.mts
# Preview only. Use --submit once for an intentional public inventory submission.
npx tsx scripts/submit-discovery.mts --submit
```

The script validates the origin/routes/key, deduplicates, limits inventory size and stops on a rejected batch. Do not run it as a recurring full-inventory spam job.

### AI search

Cloudflare AI Crawl Control was inspected read-only: Googlebot, BingBot, OAI-SearchBot, PerplexityBot and Claude-SearchBot were not blocked. Training crawlers such as GPTBot remain blocked by the owner's existing Cloudflare policy. No WAF/bot protection was disabled.

The application robots policy permits public discovery and disallows private/API paths. `llms.txt` and `llms-full.txt` contain concise factual references and canonical links. These files are convenience documents, not a ranking guarantee. Google says normal SEO fundamentals apply to AI search, with no special AI file or schema required. Allowing OAI-SearchBot supports eligibility for ChatGPT search; it does not guarantee citations.

## Verification performed and remaining limits

- Production client build and Pages Functions compilation passed. Existing Vite chunk-size/dynamic-import warnings remain.
- Read-only live HTTP/HTML/XML inspection confirmed canonical URLs, one post H1/canonical, parseable post JSON-LD, dynamic sitemap pagination, public metadata, unknown-community 404 and messages noindex. Browser inspection confirmed visible guide content.
- Google performed a live fetch and validated the representative post's discovery/schema.
- No new automated tests were added or test suites run in this SEO pass. Automatic publish/edit/delete notification hooks were code-reviewed and compiled; their live mutation path was not exercised on user content.
- Search Console currently has insufficient Core Web Vitals history. No Lighthouse score or ranking gain is claimed. Public information pages avoid the SPA bundle, but further application performance work requires actual field measurements and a separate scoped pass.
- Indexing, rich results, AI citations and timing are decided by each search engine. Progress depends on useful original public discussions, clear community descriptions and real independent links. Avoid fabricated engagement, duplicate AI filler, keyword stuffing and paid backlink schemes.
- Add translated pages/hreflang only after real equivalent translations exist. Add reliable post edit timestamps only through an explicit schema/application migration; then populate dateModified/lastmod from that timestamp.

Evidence: `outputs/seo/discovery-inventory.json`, `final-live-routes.json`, `live-public-post.html`, `google-sitemap-submitted.png`, `google-sitemap-success.png`, `google-public-post-valid.png`, and the `google-*-indexing-requested.png` screenshots. Outputs are local operator evidence, not public assets or credentials.

Primary references: [Google AI search guidance](https://developers.google.com/search/docs/appearance/ai-features), [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [IndexNow protocol](https://www.indexnow.org/documentation), [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots).
