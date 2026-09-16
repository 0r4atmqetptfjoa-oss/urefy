# Administration overview

The administration dashboard reads a snapshot from `/api/admin` after authentication. Counts come from D1; there are no seeded users, traffic totals, security incidents, or request traces in the dashboard.

- **Recorded identities:** distinct nonempty author IDs in posts/messages, plus fingerprints in assigned user roles. This is not a count of registered accounts or active sessions.
- **Stored posts/messages/channels:** complete table counts, independent of the 100-row moderation list limit.
- **Reports awaiting review:** reports whose persisted status is `pending`.
- **Content activity:** 24 UTC hourly buckets ending in the current, partial hour. Includes only posts/messages with timestamps inside that window and no later than the snapshot time. The accessible table gives separate post/message totals for each hour.

An empty table returns zero; a failed query or missing D1 binding returns `null`, displayed as an em dash with an unavailable state. Individual query failures preserve other available counts. If a refresh request fails, the UI preserves the previous snapshot and shows the failure and original timestamp. Automatic refresh updates the dashboard without resetting its scroll position or expanded hourly table.

Traffic analytics, connection counts, bandwidth, attack counts, latency, and incident feeds are explicitly marked as not connected. The dashboard does not infer those measurements from content counts. Persisted sample content, if present from an earlier database seed, remains part of the stored-content totals; this change does not delete records.

Tests: `test/admin-overview.test.ts` covers actual SQLite queries, complete totals, identity deduplication, UTC boundaries, partial outages, refresh failures, and escaped report content. `e2e/admin-overview.spec.ts` covers initial asynchronous rendering, refresh/recovery, mobile layouts, and navigation to reports.
