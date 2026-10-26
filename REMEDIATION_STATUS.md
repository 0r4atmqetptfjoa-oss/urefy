# UREfy remediation status

This file distinguishes implemented controls from independently verified outcomes. Automated tests, live checks, and third-party reviews must be tied to an exact Git commit.

| Area | Implemented control | Remaining acceptance evidence |
| --- | --- | --- |
| Cryptography | RSA moduli below 2048 bits are rejected; the shipped demo private key was removed; demo keys are ephemeral | Independent cryptographic review and signed report |
| SSRF | HTTPS-only targets, literal/private IP rejection, DNS resolution checks, redirect revalidation, content-type and streamed size limits | Cloudflare staging tests under an approved Rules of Engagement; DNS-rebinding residual-risk review |
| ActivityPub | Signed inbox requests, digest/date coverage, Ed25519 and RSA-SHA256 draft-cavage verification, actor/object ownership checks | Interoperability run against named Fediverse implementations |
| File reputation | Versioned canonical signed verdicts; unsigned/expired/cross-network verdicts rejected; no fabricated Merkle-only CLEAN result | Multi-node adversarial and replay tests |
| Demo state | Explicit opt-in outside production; production cannot persist/enable demo mode; simulated panels remain labeled | Browser regression screenshots and production-state assertions |
| Live network | Opt-in multi-node/Fediverse script and real browser RTCDataChannel byte-transfer scenario | Authorized node URLs, Fediverse test account, TURN/NAT matrix |
| Reproducibility | Lockfile workflow, two consecutive build-tree hash comparison, archive secret scan | Passing clean CI and final clean commit |
| Bundle | Heavy WebRTC, analytics, activity, and defense features load on demand; startup JavaScript is 588.56 KiB gzip across 26 chunks, under the 600 KiB regression ceiling | Continue decomposing the 446 KB minified (110 KB gzip) `app` chunk; measure parse/evaluate cost on mobile |
| Cloudflare | Passive and active test plan documented | Written scope/RoE; passive production observations; authorized active penetration test and retest |

No row should be marketed as “audited,” “penetration tested,” or “fully interoperable” until its remaining evidence exists.
