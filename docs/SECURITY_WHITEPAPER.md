# UREfy Cryptographic Architecture, Security Whitepaper & Sovereign Privacy Matrix

**Version:** 2026.1.0  
**Classification:** Public Security Specification & Threat Model  
**Repository:** [https://github.com/0r4atmqetptfjoa-oss/urefy](https://github.com/0r4atmqetptfjoa-oss/urefy)  
**License:** Open Source (MIT License)

---

## 1. Executive Summary

UREfy is an open-source, sovereign, serverless social network and end-to-end encrypted (E2EE) communications protocol designed for zero-trust privacy, digital autonomy, and censorship resistance.

Unlike legacy centralized platforms (which control databases of user passwords, phone numbers, and communication logs) or federated platforms with high infrastructure overhead, UREfy is engineered from first principles around **client-side cryptography in the browser**, **serverless edge execution (Cloudflare Pages/Workers)**, and **tamper-evident zero-trust databases (Cloudflare D1 & AWS S3)**.

---

## 2. Comparative Analysis: UREfy vs. Signal vs. Matrix

The following objective matrix compares UREfy's privacy, cryptographic guarantees, and operational trust model against the leading secure communication protocols:

| Dimension | UREfy | Signal | Matrix (Element / Synapse) |
| :--- | :--- | :--- | :--- |
| **Source Code** | **100% Open Source** (GitHub: `0r4atmqetptfjoa-oss/urefy`, MIT License) | Open Source (GPLv3) | Open Source (Apache 2.0) |
| **Identity Model** | **Pure Cryptographic Keypair (Ed25519)**. Zero phone numbers, zero emails, zero KYC. | **Phone Number Required** (Tied to SIM/Telecom identity). Usernames require phone registration. | Matrix ID (User @ server). Email often required depending on homeserver. |
| **End-to-End Encryption** | **Mandatory Client-Side WebCrypto (AES-GCM-256 + ECDH P-256 / Ed25519)**. Only ciphertext stored on server. | Signal Protocol (Double Ratchet + Curve25519). Default for direct/group chats. | Olm/Megolm. Optional per-room; often complex session key sharing. |
| **Server Trust Model** | **Zero-Trust**: Server/edge cannot decrypt private chats, files, or identity keys. | **Moderate**: Signal Foundation controls central AWS/Azure servers and phone directory. | **Variable**: Highly trusted homeserver operator; metadata leakage across federated homeservers. |
| **Self-Hosting Overhead** | **Zero-Maintenance Serverless**: Deploys in 3 minutes via Cloudflare Pages + D1 (Free Tier) or Docker. | **None (Centralized only)**. Independent self-hosting is officially unsupported. | **High Overhead**: Requires dedicated Linux VPS, Python/Rust Synapse server, PostgreSQL, high RAM/CPU. |
| **Browser Execution** | **100% Native Web & PWA**: Zero installation required; hardware WebCrypto in RAM. | Native Desktop/Mobile apps only (No standalone web client). | Element Web client connects to remote homeserver. |
| **Sybil & Spam Defense** | **Zero-Knowledge RLN (Rate Limiting Nullifiers)** & Chaumian Blind Signatures. | Centralized SMS verification and CAPTCHAs. | Server-level registration limits & CAPTCHA. |
| **Anonymous Governance** | **Chaumian Blind Voting**: Mathematically untraceable quadratic merit voting. | None (No community/governance layer). | Polling plugins (not cryptographically blind). |
| **Automated Auditing** | **Continuous 23-Gate Production Security Audit** in monorepo CI/CD. | Periodic third-party point-in-time security audits. | Periodic third-party point-in-time security audits. |

---

## 3. Cryptographic Primitives & Implementation Details

All cryptographic operations in UREfy are executed strictly on the client device using the standard W3C **Web Cryptography API (`crypto.subtle`)**:

### 3.1. Identity & Key Custody
* **Identity Keypairs:** Generated on-device as asymmetric **Ed25519** (for digital signatures and authenticity verification) and **ECDH P-256** (for Diffie-Hellman key agreement).
* **Private Key Zeroization:** Private keys exist only in volatile browser RAM inside non-extractable CryptoKey handles or AES-GCM-256 encrypted IndexedDB device vaults (`secure-storage.ts`).
* **RAM Zeroization:** During logout or session teardown, memory buffers are explicitly wiped using `Uint8Array.fill(0x00)`.

### 3.2. Direct Messaging & Vault Encryption
* **Algorithm:** **AES-256-GCM** with 96-bit unique nonces generated via cryptographically secure pseudo-random number generator (CSPRNG, `crypto.getRandomValues`).
* **Key Derivation:** **HKDF-SHA256** and **scrypt** ($N=131072, r=8, p=1$).
* **Forward Secrecy & Hybrid Post-Quantum:** Direct message sessions exchange ephemeral ECDH public keys with experimental **ML-KEM-768 (Kyber)** hybrid encapsulation in `packages/core-crypto`.

### 3.3. Chaumian Anonymous Merit & Voting
* Community merit voting utilizes **Chaumian Blind Signatures**.
* When a user casts an upvote or proposal vote, the token is blinded with cryptographic blinding factor $r$, signed by the network, and unblinded.
* **Mathematical Invariant:** The network verifies that the vote is legitimate without any node or operator being capable of linking the voter's identity fingerprint to the choice cast.

### 3.4. Zero-Knowledge Rate-Limiting Nullifiers (ZK-RLN)
* To prevent denial-of-service (DoS) and message flooding without harvesting personal data, UREfy implements **RLN (Rate Limiting Nullifiers)**.
* Users generate a secret polynomial per epoch. If a client transmits within allowed rate limits, their identity remains zero-knowledge private.
* If a spammer breaches the epoch rate limit by transmitting two messages under the same epoch, their Shamir secret shares intersect, automatically revealing their nullifier for edge isolation.

---

## 4. The 23-Gate Continuous Production Security Audit

UREfy enforces an automated 23-gate production security verification barrier executed on every build (`npm run audit:production` via `scripts/audit-production.ts`):

1. **Gate 1: Zero Inline & Property Event Handlers:** 100% action delegation via deterministic `ActionDispatcher`.
2. **Gate 2: Zero Native Browser Dialogs:** Complete elimination of exploitable `alert()`, `confirm()`, and `prompt()`.
3. **Gate 3: Strict Content Security Policy (CSP):** Zero `unsafe-inline` scripts, zero external fonts in headers, `frame-ancestors 'none'`.
4. **Gate 4: Admin Backend Authority & Volatile Session:** HMAC-SHA256 session tokens with zero hardcoded bypass keys.
5. **Gate 5: Local Secret Persistence Hygiene:** Zero plaintext mnemonics/seeds in `localStorage`; mandatory AES-GCM-256 device vault.
6. **Gate 6: Service Worker Cache Policy:** Safe-by-default network-only policies for sensitive API endpoints.
7. **Gate 7: Demo Data Classification:** Strict categorization of bootstrap vs. real data.
8. **Gate 8: Production Environment Cleanliness:** 100% isolation of simulation/mock routines behind `isLocalDev()`.
9. **Gate 9: XSS Defense & innerHTML Sanitization:** Mandatory HTML entity escaping and DOMPurify template sanitization.
10. **Gate 10: Cryptographic Memory Zeroization:** Verified buffer clearing upon logout.
11. **Gate 11: Zero External Wildcard Sources:** All network requests restricted to verified origin allowlists.
12. **Gate 12: Real Dependency Integrity:** Automated vulnerability scans with zero critical/high advisories.
13. **Gate 13: Strict Bundle Budget:** Main bundle < 300 kB gzip, startup total < 600 kB gzip.
14. **Gate 14: Zero Secret Key Exposure:** Zero private key leakage in network envelopes.
15. **Gate 15: Zero Plaintext Message Storage:** Mandatory edge ciphertext validation on all `/api/messages` payloads.
16. **Gate 16: Mandatory WebAuthn L3 Signature Verification:** FIDO2 WebAuthn authentication with D1 credential persistence.
17. **Gate 17: Zero Secret Extraction APIs:** Permanent elimination of cryptographic secret extraction utilities.
18. **Gate 18: Distributed Replay Protection Nonces:** Anti-DoS bounded LRU cache (10,000 nonces) and D1 persistence.
19. **Gate 19: Single Canonical Envelope Architecture:** Single strict signature verification path.
20. **Gate 20: Anti-Poisoning Nonce Verification Order:** Signatures and capabilities validated strictly before recording nonces.
21. **Gate 21: CSPRNG Entropy Enforcement:** Zero `Math.random()` in cryptographic operations or security tokens.
22. **Gate 22: Zero In-Memory Fallback in Production Edge:** Strict production enforcement on Cloudflare D1.
23. **Gate 23: Production Behavioral Hardening:** Verification of zero synthetic balances, fail-closed push routing, and strict CORS.

---

## 5. Verifiable Source Code & Independent Auditing

Anyone can clone, audit, run, and verify the complete codebase locally:

```bash
# 1. Clone the official repository
git clone https://github.com/0r4atmqetptfjoa-oss/urefy.git
cd urefy

# 2. Install dependencies and run tests
npm install
npm test

# 3. Execute the 23-gate production security audit
npm run audit:production

# 4. Verify bundle size and cryptographic integrity
npm run audit:bundle
```

---

## 6. Responsible Disclosure

Security vulnerabilities may be reported directly to our security team:
* **Contact:** `contact@urefy.com`
* **Response Time:** Maximum 24–48 hours for triage and patch deployment.
