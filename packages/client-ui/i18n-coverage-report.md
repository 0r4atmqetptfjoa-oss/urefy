# i18n Coverage Report — Aetheris Omni-Sphere

> Generated: 2026-09-29 08:05 UTC
> Audit tool: `packages/client-ui/scripts/i18n-audit.ts`
> Scope: `packages/client-ui/src/*.ts`

---

## Summary

| Metric | Value |
|--------|-------|
| Total i18n dictionary keys (EN baseline) | **375** |
| Unique hardcoded template strings found | **1541** |
| Strings likely needing i18n attention | **50** (sample capped at 50) |
| Registered translation keys | **379** |

---

## Per-Language Coverage

| Language | Translated Strings | EN Baseline | Coverage % | Status |
|----------|--------------------|-------------|------------|--------|
| `en` | 375 | 375 | **100%** | ✅ |
| `fr` | 375 | 375 | **100%** | ✅ |
| `de` | 375 | 375 | **100%** | ✅ |
| `es` | 375 | 375 | **100%** | ✅ |
| `ro` | 375 | 375 | **100%** | ✅ |
| `ja` | 375 | 375 | **100%** | ✅ |
| `ar` | 375 | 375 | **100%** | ✅ |

---

## Hardcoded Strings Detected (Sample — Top 50)

> These are template-literal or attribute strings found in `src/*.ts` that are not yet routed through `i18n.t()`.

| File | Line | String |
|------|------|--------|
| `activity-feed.ts` | L300 | Fingerprint: ${evt.actorFP} |
| `admin-app.ts` | L160 | Emergency override... |
| `admin-app.ts` | L79 | UREfy Control Plane |
| `admin-app.ts` | L105 | AUTH METHOD |
| `admin-app.ts` | L108 | Hardware Key |
| `admin-app.ts` | L112 | ORIGIN BINDING |
| `admin-app.ts` | L128 | Authenticate with Hardware Key |
| `admin-app.ts` | L166 | Unlock with Override PIN |
| `admin-auth.ts` | L312 | Admin Access |
| `admin-auth.ts` | L338 | Unlock Admin Panel |
| `vault-view.ts` | L721 | Cancel |
| `admin-overview.ts` | L25 | Workspace overview |
| `admin-overview.ts` | L40 | Content activity |
| `admin-overview.ts` | L43 | Current hour |
| `messages-view.ts` | L1131 | Messages |
| `admin-overview.ts` | L48 | Reports awaiting review |
| `admin-overview.ts` | L48 | Open reports |
| `admin-overview.ts` | L49 | Not connected |
| `admin-panel.ts` | L695 | Admin Control Panel (Ctrl+Shift+A) |
| `admin-panel.ts` | L759 | Instantly zeroize memory and lock session |
| `admin-panel.ts` | L784 | Sync live state with Cloudflare Edge D1/KV |
| `admin-panel.ts` | L788 | Toggle 10s auto-refresh |
| `admin-panel.ts` | L999 | Current block hash: ${entry.current_entry_hash} |
| `admin-panel.ts` | L1003 | Previous block hash: ${entry.previous_entry_hash} |
| `admin-panel.ts` | L1008 | Payload SHA-256 digest: ${entry.payload_digest \|\| |
| `admin-panel.ts` | L1118 | Promote |
| `admin-panel.ts` | L1119 | Demote |
| `admin-panel.ts` | L1180 | Delete Channel |
| `admin-panel.ts` | L1745 | Delete object from R2 |
| `admin-panel.ts` | L2015 | Load into live editor |
| `admin-panel.ts` | L2018 | Pin / Unpin post |
| `admin-panel.ts` | L2021 | Lock / Unlock comments |
| `admin-panel.ts` | L2024 | Delete post permanently |
| `admin-panel.ts` | L2053 | Export cryptographic event ledger as formatted JSON |
| `admin-panel.ts` | L2153 | Delete content and mark report as resolved |
| `admin-panel.ts` | L2160 | Dismiss report as unfounded |
| `admin-panel.ts` | L1046 | User Fingerprint or ID... |
| `admin-panel.ts` | L1058 | Audit Notes (e.g. Lead Community Mod)... |
| `admin-panel.ts` | L1074 | Search by fingerprint... |
| `admin-panel.ts` | L1142 | channel-name |
| `admin-panel.ts` | L1346 | IP address... |
| `admin-panel.ts` | L1425 | Type system announcement (or leave blank to clear)... |
| `admin-panel.ts` | L1544 | SELECT * FROM posts WHERE status != |
| `admin-panel.ts` | L1920 | post-1... |
| `admin-panel.ts` | L1912 | msg-1... |
| `admin-panel.ts` | L1941 | post-... |
| `admin-panel.ts` | L1945 | New post title... |
| `admin-panel.ts` | L1950 | TECH DISCUSSION |
| `admin-panel.ts` | L1965 | Edit full post content here... |
| `admin-panel.ts` | L709 | Administration navigation |

_...and 1491 more. Run the full audit to see all._

---

## Registered i18n Keys (379 total)

The following top-level key paths are registered in `TranslationDictionary`:

```
.
acousticDsp.applyToSoundstage
acousticDsp.biquadFilter
acousticDsp.dbRange
acousticDsp.parametricBands
acousticDsp.presets
acousticDsp.resetFlat
acousticDsp.subtitle
acousticDsp.title
actions.award
actions.blockUser
actions.bookmark
actions.copyLink
actions.deletePost
actions.editPost
actions.followUser
actions.like
actions.muteUser
actions.openMenu
actions.pinPost
actions.quotePost
actions.react
actions.reply
actions.report
actions.repost
actions.share
actions.translatePost
actions.unbookmark
actions.unfollowUser
actions.unlike
actions.unrepost
actions.viewThread
activityFeed.activityPaused
activityFeed.eventsCount
activityFeed.maxEvents
activityFeed.noActivity
activityFeed.pauseStream
activityFeed.resumeStream
activityFeed.streamLabel
activityFeed.title
common.all
common.anonymous
common.appName
common.back
common.cancel
common.close
common.confirm
common.connectWallet
common.copied
common.copy
common.delete
common.details
common.disconnect
common.edit
common.error
common.filter
common.hello
common.install
common.loading
common.next
common.offline
common.online
common.refresh
common.save
common.search
common.status
common.submit
common.success
common.syncing
common.tagline
common.unknown
common.verified
common.warning
crdt.allSynced
crdt.bufferedActions
crdt.lwwResolution
crdt.merkleSync
crdt.syncNow
crdt.vectorClocks
edge.activeRegion
... (299 more)
```

---

## Recommendations

1. **Priority (UI visible text)**: Route all `title=`, `aria-label=`, button text, and headings through `i18n.t()`.
2. **Language parity**: French, German, Spanish, and Romanian have near-complete coverage. Japanese and Arabic need review.
3. **Automated CI gate**: Add a coverage threshold (e.g. ≥ 85%) as a soft-fail check in `.github/workflows/ci.yml`.
4. **Next step**: Run this script weekly via `npm run i18n-audit` or integrate into CI as a scheduled job.
