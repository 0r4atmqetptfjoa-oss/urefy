# i18n Coverage Report — Aetheris Omni-Sphere

> Generated: 2026-09-09 19:50 UTC
> Audit tool: `packages/client-ui/scripts/i18n-audit.ts`
> Scope: `packages/client-ui/src/*.ts`

---

## Summary

| Metric | Value |
|--------|-------|
| Total i18n dictionary keys (EN baseline) | **375** |
| Unique hardcoded template strings found | **1186** |
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
| `admin-app.ts` | L94 | Enter admin password or PIN... |
| `admin-app.ts` | L60 | Admin Control Panel |
| `admin-app.ts` | L73 | RESTRICTED ACCESS |
| `admin-auth.ts` | L329 | Unlock Admin Panel |
| `admin-auth.ts` | L303 | Admin Access |
| `post-detail.ts` | L751 | Cancel |
| `admin-panel.ts` | L603 | Admin Control Panel (Ctrl+Shift+A) |
| `admin-panel.ts` | L683 | Sync live state with Cloudflare Edge D1/KV |
| `admin-panel.ts` | L687 | Toggle 10s auto-refresh |
| `admin-panel.ts` | L1023 | Promote |
| `admin-panel.ts` | L1024 | Demote |
| `admin-panel.ts` | L1085 | Delete Channel |
| `admin-panel.ts` | L1567 | Delete object from R2 |
| `admin-panel.ts` | L1721 | Load into live editor |
| `admin-panel.ts` | L1724 | Pin / Unpin post |
| `admin-panel.ts` | L1727 | Lock / Unlock comments |
| `admin-panel.ts` | L1730 | Delete post permanently |
| `admin-panel.ts` | L1759 | Export cryptographic event ledger as formatted JSON |
| `admin-panel.ts` | L1860 | Delete content and mark report as resolved |
| `admin-panel.ts` | L1867 | Dismiss report as unfounded |
| `admin-panel.ts` | L951 | User Fingerprint or ID... |
| `admin-panel.ts` | L963 | Audit Notes (e.g. Lead Community Mod)... |
| `admin-panel.ts` | L979 | Search by fingerprint... |
| `admin-panel.ts` | L1047 | channel-name |
| `admin-panel.ts` | L1251 | IP address... |
| `admin-panel.ts` | L1330 | Type system announcement (or leave blank to clear)... |
| `admin-panel.ts` | L1441 | SELECT * FROM posts WHERE status != |
| `admin-panel.ts` | L1626 | post-1... |
| `admin-panel.ts` | L1618 | msg-1... |
| `admin-panel.ts` | L1647 | post-... |
| `admin-panel.ts` | L1651 | New post title... |
| `admin-panel.ts` | L1656 | TECH DISCUSSION |
| `admin-panel.ts` | L1671 | Edit full post content here... |
| `admin-panel.ts` | L624 | Admin Panel |
| `admin-panel.ts` | L680 | ADMIN ONLY |
| `admin-panel.ts` | L788 | CLOUDFLARE ANYCAST EDGE |
| `admin-panel.ts` | L794 | Live Throughput |
| `admin-panel.ts` | L798 | Avg Edge RTT |
| `admin-panel.ts` | L841 | Live Inbound Ingress Stream |
| `admin-panel.ts` | L1659 | Status |
| `admin-panel.ts` | L850 | Edge PoP |
| `admin-panel.ts` | L851 | Protocol |
| `admin-panel.ts` | L865 | WebSocket |
| `admin-panel.ts` | L888 | Recent Sovereign Admin Audit Trail |
| `app.ts` | L872 | Messages |
| `admin-panel.ts` | L998 | ZK Verified |
| `admin-panel.ts` | L1554 | Actions |
| `admin-panel.ts` | L1045 | Create New Channel |
| `admin-panel.ts` | L1062 | Channel |

_...and 1136 more. Run the full audit to see all._

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
