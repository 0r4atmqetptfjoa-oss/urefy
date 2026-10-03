# Administration overview

The administration dashboard reads a snapshot from `/api/admin` after authentication. Counts come from D1; there are no seeded users, traffic totals, security incidents, or request traces in the dashboard.

- **Recorded identities:** distinct nonempty author IDs in posts/messages, plus fingerprints in assigned user roles. This is not a count of registered accounts or active sessions.
- **Stored posts/messages/channels:** complete table counts, independent of the 100-row moderation list limit.
- **Reports awaiting review:** reports whose persisted status is `pending`.
- **Content activity:** 24 UTC hourly buckets ending in the current, partial hour. Includes only posts/messages with timestamps inside that window and no later than the snapshot time. The accessible table gives separate post/message totals for each hour.

An empty table returns zero; a failed query or missing D1 binding returns `null`, displayed as an em dash with an unavailable state. Individual query failures preserve other available counts. If a refresh request fails, the UI preserves the previous snapshot and shows the failure and original timestamp. Automatic refresh updates the dashboard without resetting its scroll position or expanded hourly table.

The dashboard also previews up to five newest posts and four loaded channels from the authenticated admin sync. Post editing opens the existing moderation editor with the selected record loaded; channel creation opens the existing channel form. These previews reflect the current sync and do not change the API's existing 100-post moderation fetch limit.

## Live traffic and security analytics

`/api/edge-analytics` is an admin-authenticated, server-side Cloudflare GraphQL integration. It reads the zone's HTTP request groups for the last 24 hours and last five minutes, response bytes, visits, and firewall event counts grouped by action. The dashboard and WAF tab refresh on demand and every 60 seconds while the admin panel is open. The analytics token is never sent to the browser.

Configure `CLOUDFLARE_ANALYTICS_TOKEN` as a Pages/Workers secret with read-only Analytics access scoped to the relevant zone, and `CLOUDFLARE_ANALYTICS_ZONE_ID` as a server-side setting. Without both values, the interface reports analytics as unavailable; it does not substitute fabricated zeroes. Cloudflare adaptive sampling can estimate grouped request counts, so the UI reports the sample interval. Firewall events are subject to Cloudflare dataset availability and retention.

The site's `/api/analytics` telemetry supplies Observatory node counts, reported latency, and cumulative message totals. Messages per minute are calculated only after two successful samples; slashing events, per-node uptime, and active ping results remain unavailable unless their sources are connected. Observatory closes with its close button, backdrop, or Escape, and polls only while open.

R2 usage counters are application-side advisory counters, not Cloudflare account billing/quota data. A failed quota request now shows unavailable instead of zero. The backup control runs an on-demand backup; this repository has no configured scheduled trigger. The WAF view is read-only: admin IP notes do not enforce an edge block, and actual rule changes still need a separately configured Cloudflare WAF write integration. The SQL console and R2 explorer escape server-provided values before inserting them into the admin DOM.

Persisted sample content, if present from an earlier database seed, remains part of the stored-content totals; this change does not delete records.

Tests: `test/admin-overview.test.ts` covers actual SQLite queries, complete totals, identity deduplication, UTC boundaries, partial outages, refresh failures, and escaped report content. `e2e/admin-overview.spec.ts` covers initial asynchronous rendering, refresh/recovery, mobile layouts, and navigation to reports.
