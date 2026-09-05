# i18n Coverage Report — Aetheris Omni-Sphere

> Generated: 2026-09-04 21:32 UTC
> Audit tool: `packages/client-ui/scripts/i18n-audit.ts`
> Scope: `packages/client-ui/src/*.ts`

---

## Summary

| Metric | Value |
|--------|-------|
| Total i18n dictionary keys (EN baseline) | **153** |
| Unique hardcoded template strings found | **1115** |
| Strings likely needing i18n attention | **50** (sample capped at 50) |
| Registered translation keys | **154** |

---

## Per-Language Coverage

| Language | Translated Strings | EN Baseline | Coverage % | Status |
|----------|--------------------|-------------|------------|--------|
| `en` | 153 | 153 | **100%** | ✅ |
| `fr` | 150 | 153 | **98%** | ✅ |
| `de` | 153 | 153 | **100%** | ✅ |
| `es` | 152 | 153 | **99%** | ✅ |
| `ro` | 153 | 153 | **100%** | ✅ |
| `ja` | 149 | 153 | **97%** | ✅ |
| `ar` | 154 | 153 | **101%** | ✅ |

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
| `activity-feed.ts` | L281 | Fingerprint: ${evt.actorFP} |
| `activity-feed.ts` | L302 | No activity yet |
| `activity-feed.ts` | L357 | NETWORK ACTIVITY STREAM |
| `admin-app.ts` | L93 | Introdu parola sau PIN-ul... |
| `admin-app.ts` | L59 | Admin Control Panel |
| `admin-app.ts` | L72 | RESTRICTED ACCESS |
| `admin-auth.ts` | L308 | Unlock Admin Panel |
| `admin-auth.ts` | L282 | Admin Access |
| `webrtc-transfer.ts` | L1941 | Cancel |
| `admin-panel.ts` | L446 | Admin Control Panel (Ctrl+Shift+A) |
| `admin-panel.ts` | L524 | Sync live state with Cloudflare Edge D1/KV |
| `admin-panel.ts` | L528 | Toggle 10s auto-refresh |
| `admin-panel.ts` | L820 | Promote |
| `admin-panel.ts` | L821 | Demote |
| `admin-panel.ts` | L879 | Delete Channel |
| `admin-panel.ts` | L1233 | Export cryptographic event ledger as formatted JSON |
| `admin-panel.ts` | L1341 | Respinge sesizarea ca nefondată |
| `admin-panel.ts` | L776 | Search by fingerprint... |
| `admin-panel.ts` | L841 | channel-name |
| `admin-panel.ts` | L1045 | IP address... |
| `admin-panel.ts` | L1100 | Type system announcement (or leave blank to clear)... |
| `admin-panel.ts` | L1207 | post-1... |
| `admin-panel.ts` | L1199 | msg-1... |
| `admin-panel.ts` | L467 | Admin Panel |
| `admin-panel.ts` | L521 | ADMIN ONLY |
| `admin-panel.ts` | L625 | CLOUDFLARE ANYCAST EDGE |
| `admin-panel.ts` | L631 | Live Throughput |
| `admin-panel.ts` | L635 | Avg Edge RTT |
| `admin-panel.ts` | L678 | Live Inbound Ingress Stream |
| `mesh-matrix.ts` | L486 | Status |
| `admin-panel.ts` | L687 | Edge PoP |
| `admin-panel.ts` | L688 | Protocol |
| `admin-panel.ts` | L702 | WebSocket |
| `admin-panel.ts` | L725 | Recent Sovereign Admin Audit Trail |
| `admin-panel.ts` | L791 | Fingerprint |
| `admin-panel.ts` | L794 | Messages |
| `admin-panel.ts` | L795 | ZK Verified |
| `admin-panel.ts` | L860 | Actions |
| `admin-panel.ts` | L839 | Create New Channel |
| `admin-panel.ts` | L856 | Channel |
| `admin-panel.ts` | L858 | Encrypted |
| `admin-panel.ts` | L859 | Members |
| `admin-panel.ts` | L982 | Trigger Backup Now |
| `admin-panel.ts` | L1016 | Run WAF Stress Probe |

_...and 1065 more. Run the full audit to see all._

---

## Registered i18n Keys (154 total)

The following top-level key paths are registered in `TranslationDictionary`:

```
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
nav.admin
nav.defense
nav.governance
nav.language
nav.observatory
nav.onboarding
nav.pulse
nav.relays
nav.settings
nav.theme
nav.vault
nav.wallet
onboardingNarrative.back
onboardingNarrative.continue
onboardingNarrative.finish
onboardingNarrative.skip
onboardingNarrative.step1Body
onboardingNarrative.step1Subtitle
onboardingNarrative.step1Title
onboardingNarrative.step2Body
onboardingNarrative.step2Subtitle
onboardingNarrative.step2Title
onboardingNarrative.step3Body
onboardingNarrative.step3Subtitle
onboardingNarrative.step3Title
onboardingNarrative.step4Body
onboardingNarrative.step4DownloadBackup
onboardingNarrative.step4SavedWords
onboardingNarrative.step4Subtitle
onboardingNarrative.step4Title
onboardingNarrative.step4Warning
onboardingNarrative.stepOf
... (74 more)
```

---

## Recommendations

1. **Priority (UI visible text)**: Route all `title=`, `aria-label=`, button text, and headings through `i18n.t()`.
2. **Language parity**: French, German, Spanish, and Romanian have near-complete coverage. Japanese and Arabic need review.
3. **Automated CI gate**: Add a coverage threshold (e.g. ≥ 85%) as a soft-fail check in `.github/workflows/ci.yml`.
4. **Next step**: Run this script weekly via `npm run i18n-audit` or integrate into CI as a scheduled job.
