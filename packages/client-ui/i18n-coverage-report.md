# i18n Coverage Report — Aetheris Omni-Sphere

> Generated: 2026-09-05 10:03 UTC
> Audit tool: `packages/client-ui/scripts/i18n-audit.ts`
> Scope: `packages/client-ui/src/*.ts`

---

## Summary

| Metric | Value |
|--------|-------|
| Total i18n dictionary keys (EN baseline) | **310** |
| Unique hardcoded template strings found | **1143** |
| Strings likely needing i18n attention | **50** (sample capped at 50) |
| Registered translation keys | **311** |

---

## Per-Language Coverage

| Language | Translated Strings | EN Baseline | Coverage % | Status |
|----------|--------------------|-------------|------------|--------|
| `en` | 310 | 310 | **100%** | ✅ |
| `fr` | 307 | 310 | **99%** | ✅ |
| `de` | 310 | 310 | **100%** | ✅ |
| `es` | 309 | 310 | **100%** | ✅ |
| `ro` | 310 | 310 | **100%** | ✅ |
| `ja` | 305 | 310 | **98%** | ✅ |
| `ar` | 311 | 310 | **100%** | ✅ |

---

## Hardcoded Strings Detected (Sample — Top 50)

> These are template-literal or attribute strings found in `src/*.ts` that are not yet routed through `i18n.t()`.

| File | Line | String |
|------|------|--------|
| `zk-reputation.ts` | L289 | Close (Esc) |
| `acoustic-dsp.ts` | L78 | Acoustic Lounge DSP Equalizer |
| `acoustic-dsp.ts` | L79 | Biquad Filter |
| `acoustic-dsp.ts` | L109 | Parametric Frequency Bands |
| `acoustic-dsp.ts` | L135 | Reset Flat |
| `acoustic-dsp.ts` | L139 | Apply to Soundstage |
| `activity-feed.ts` | L296 | Fingerprint: ${evt.actorFP} |
| `activity-feed.ts` | L317 | No activity yet |
| `activity-feed.ts` | L372 | NETWORK ACTIVITY STREAM |
| `admin-app.ts` | L93 | Enter admin password or PIN... |
| `admin-app.ts` | L59 | Admin Control Panel |
| `admin-app.ts` | L72 | RESTRICTED ACCESS |
| `admin-auth.ts` | L309 | Unlock Admin Panel |
| `admin-auth.ts` | L283 | Admin Access |
| `webrtc-transfer.ts` | L1942 | Cancel |
| `admin-panel.ts` | L447 | Admin Control Panel (Ctrl+Shift+A) |
| `admin-panel.ts` | L525 | Sync live state with Cloudflare Edge D1/KV |
| `admin-panel.ts` | L529 | Toggle 10s auto-refresh |
| `admin-panel.ts` | L821 | Promote |
| `admin-panel.ts` | L822 | Demote |
| `admin-panel.ts` | L880 | Delete Channel |
| `admin-panel.ts` | L1234 | Export cryptographic event ledger as formatted JSON |
| `admin-panel.ts` | L1335 | Delete content and mark report as resolved |
| `admin-panel.ts` | L1342 | Dismiss report as unfounded |
| `admin-panel.ts` | L777 | Search by fingerprint... |
| `admin-panel.ts` | L842 | channel-name |
| `admin-panel.ts` | L1046 | IP address... |
| `admin-panel.ts` | L1101 | Type system announcement (or leave blank to clear)... |
| `admin-panel.ts` | L1208 | post-1... |
| `admin-panel.ts` | L1200 | msg-1... |
| `admin-panel.ts` | L468 | Admin Panel |
| `admin-panel.ts` | L522 | ADMIN ONLY |
| `admin-panel.ts` | L626 | CLOUDFLARE ANYCAST EDGE |
| `admin-panel.ts` | L632 | Live Throughput |
| `admin-panel.ts` | L636 | Avg Edge RTT |
| `admin-panel.ts` | L679 | Live Inbound Ingress Stream |
| `mesh-matrix.ts` | L486 | Status |
| `admin-panel.ts` | L688 | Edge PoP |
| `admin-panel.ts` | L689 | Protocol |
| `admin-panel.ts` | L703 | WebSocket |
| `admin-panel.ts` | L726 | Recent Sovereign Admin Audit Trail |
| `admin-panel.ts` | L792 | Fingerprint |
| `admin-panel.ts` | L795 | Messages |
| `admin-panel.ts` | L796 | ZK Verified |
| `admin-panel.ts` | L861 | Actions |
| `admin-panel.ts` | L840 | Create New Channel |
| `admin-panel.ts` | L857 | Channel |
| `admin-panel.ts` | L859 | Encrypted |
| `admin-panel.ts` | L860 | Members |
| `admin-panel.ts` | L983 | Trigger Backup Now |

_...and 1093 more. Run the full audit to see all._

---

## Registered i18n Keys (311 total)

The following top-level key paths are registered in `TranslationDictionary`:

```
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
common.all
common.anonymous
common.appName
common.back
common.cancel
common.close
common.confirm
common.copied
common.copy
common.delete
common.details
common.edit
common.error
common.filter
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
edge.anycastRouting
edge.cacheHitRatio
edge.d1Replicas
edge.durableObjects
edge.edgeLocations
edge.failoverStatus
edge.globalTopology
edge.latency
edge.p2pMeshFallback
edge.r2Storage
edge.sub15msTarget
edge.title
emptyState.bookmarksDesc
emptyState.bookmarksTitle
emptyState.loadingPulses
emptyState.notificationsDesc
emptyState.notificationsTitle
emptyState.pulseAction
emptyState.pulseDesc
emptyState.pulseTitle
emptyState.relaysAction
... (231 more)
```

---

## Recommendations

1. **Priority (UI visible text)**: Route all `title=`, `aria-label=`, button text, and headings through `i18n.t()`.
2. **Language parity**: French, German, Spanish, and Romanian have near-complete coverage. Japanese and Arabic need review.
3. **Automated CI gate**: Add a coverage threshold (e.g. ≥ 85%) as a soft-fail check in `.github/workflows/ci.yml`.
4. **Next step**: Run this script weekly via `npm run i18n-audit` or integrate into CI as a scheduled job.
