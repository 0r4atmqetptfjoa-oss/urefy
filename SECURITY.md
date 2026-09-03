# Aetheris Security Policy & Architecture

## 1. Overview & Sovereign Security Philosophy

Aetheris Omni-Sphere is engineered as a sovereign, zero-trust, privacy-first peer-to-peer communications and archival platform. Security is treated as an architectural invariant rather than an add-on. Every packet is cryptographically authenticated, every identity is self-custodied via cryptographic keypairs, and all administrative surfaces enforce defense-in-depth controls.

---

## 2. Core Security Invariants

### 2.1 Memory Zeroization (`zeroizeMemory`)
Sensitive cryptographic material—including private seed phrases, master keys, ephemeral Diffie-Hellman secrets, and HMAC signing keys—must never remain resident in heap memory longer than their operational lifespan.
- **Mechanism**: The `zeroizeMemory` primitive explicitly overwrites Uint8Array buffers with zeros across the entire memory allocation before releasing references.
- **Mitigation**: Prevents side-channel exfiltration through speculative execution leaks, cold-boot attacks, core dumps, and browser garbage collection lag.
- **Usage**:
  ```typescript
  import { zeroizeMemory } from '@aetheris/core-crypto';

  const ephemeralSecret = new Uint8Array(32);
  try {
    // Perform cryptographic operation
  } finally {
    zeroizeMemory(ephemeralSecret);
  }
  ```

### 2.2 Constant-Time Comparisons (`timingSafeEqual`)
All authentication tokens, HMAC signatures, admin PINs, and cryptographic digest comparisons are performed using constant-time verification routines.
- **Mechanism**: Bitwise XOR accumulation over every character without short-circuiting on mismatch:
  ```typescript
  export function timingSafeEqual(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }
  ```
- **Mitigation**: Eliminates timing side-channel attacks where an adversary deduces secret bytes based on microsecond-level response duration variances.

### 2.3 Post-Quantum Hybrid Key Encapsulation (ML-KEM-768 / Kyber768 + X25519)
To defend against "Harvest Now, Decrypt Later" adversaries, Aetheris implements a hybrid dual-layer key encapsulation mechanism:
- **Classical Layer**: Curve25519 (X25519) ECDH providing battle-tested elliptic curve security.
- **Post-Quantum Layer**: NIST FIPS 203 standardized ML-KEM-768 (Kyber768) lattice-based cryptography, resistant to Shor's algorithm on large-scale quantum computers.
- **Shared Secret Derivation**: HKDF-SHA256 binds the classical ECDH shared secret and the post-quantum shared secret into a single unified session key:
  $$\text{SessionKey} = \text{HKDF-SHA256}(SS_{\text{X25519}} \parallel SS_{\text{ML-KEM-768}}, \text{salt}, \text{info})$$
- Even if one of the two cryptographic primitives is compromised in the future, confidentiality remains guaranteed by the intact layer.

### 2.4 Zero-Knowledge Rate-Limiting Nullifier (ZK-RLN) Spam Defense
Aetheris protects open peer-to-peer networks from denial-of-service and flooding attacks without centralized identity verification or phone/email requirements:
- **Mechanism**: Uses zk-SNARK circuits and Shamir's Secret Sharing over finite fields.
- **Operation**: Users register an identity commitment into an on-chain/edge Merkle tree. For every epoch (e.g., 10 seconds), a user can publish one message by generating a ZK proof and revealing an evaluation point $y = a \cdot x + b$.
- **Slashing**: If a peer broadcasts two distinct messages in the same epoch, their two evaluation points intersect, revealing their private identity secret $a$ to the network and permanently slashing their stake or banning their membership without revealing their identity on compliant messages.

---

## 3. Administrative Authentication & Edge Hardening

### 3.1 HMAC-SHA256 Session Tokens
Administrative endpoints (`/api/admin`) do not permit static magic tokens or permanent session strings.
- **Token Structure**: `aeth_adm_${timestamp}_${hex_nonce}_${hmac_signature}`
- **Signature Formula**: `HMAC-SHA256(ADMIN_PIN, "${timestamp}:${hex_nonce}")`
- **Sliding Expiration**: Tokens expire after 30 minutes (`1800000 ms`). Any token with a timestamp older than 30 minutes or with an invalid signature is rejected with HTTP 401 Unauthorized.
- **Zero Magic Backdoors**: All historic bypass headers (`genesis-core`, `genesis-token`, `admin-session-active`, `admin-genesis`) are permanently removed and explicitly rejected.

### 3.2 Brute-Force Rate Limiting & Lockout
- Failed PIN attempts are tracked per client IP address.
- After 5 failed authentication attempts within a 10-minute window, the IP address is locked out with HTTP 429 Too Many Requests:
  ```json
  {
    "success": false,
    "error": "Too many failed login attempts. Locked out for 10 minutes."
  }
  ```

### 3.3 Strict Production Configuration Gate
In non-local production environments (e.g., non-localhost domains), if `ADMIN_PIN` is missing or empty in environment variables, the admin endpoint rejects all administrative requests with HTTP 503 Service Unavailable:
```json
{
  "success": false,
  "error": "ADMIN_PIN not configured in environment variables."
}
```

### 3.4 Cross-Origin Resource Sharing (CORS) Isolation
- Sensitive edge routes (`/api/admin`, `/api/storage`, `/api/push`, `/api/cron-backup`) NEVER emit wildcard `Access-Control-Allow-Origin: *`.
- Incoming `Origin` headers are validated against permitted sovereign origins (same origin, localhost/loopback, or whitelisted `.pages.dev` / sovereign domains).
- Permitted origins are echoed with `Access-Control-Allow-Credentials: true` and `Vary: Origin`. Untrusted origins receive no CORS authorization.

### 3.5 Cryptographic Entropy in Proof-of-Work (PoW)
Proof-of-Work anti-DDoS challenges strictly utilize cryptographically secure pseudorandom number generation (`crypto.getRandomValues(new Uint8Array(16))`) for `challengeId` and `salt`, completely avoiding pseudo-random functions like `Math.random()`.

---

## 4. Reporting Security Vulnerabilities

We welcome security audits, bug bounty disclosures, and vulnerability reports from independent researchers.

- **Security Contact**: `security@aetheris.network`
- **PGP Fingerprint**: Sovereign Security Core Key (`4A9B 7C1E 0F32 88D4 E619 B2A7 C488 11F0 93D5 6B72`)
- **Coordinated Disclosure Policy**:
  1. Please report vulnerabilities confidentially via email with proof-of-concept details before public disclosure.
  2. We will acknowledge receipt of reports within 24 hours.
  3. Valid vulnerabilities will receive mitigation or remediation within 72 hours on edge networks.
