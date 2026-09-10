# UREfy Security Policy & Architecture

## 1. Overview & Sovereign Security Philosophy

UREfy is engineered as a sovereign, zero-trust, privacy-first peer-to-peer communications and archival platform. Security is treated as an architectural invariant rather than an add-on. Every packet is cryptographically authenticated, every identity is self-custodied via cryptographic keypairs, and all administrative surfaces enforce defense-in-depth controls.

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
To defend against "Harvest Now, Decrypt Later" adversaries, UREfy implements a hybrid dual-layer key encapsulation mechanism:
- **Classical Layer**: Curve25519 (X25519) ECDH providing battle-tested elliptic curve security.
- **Post-Quantum Layer**: NIST FIPS 203 standardized ML-KEM-768 (Kyber768) lattice-based cryptography, resistant to Shor's algorithm on large-scale quantum computers.
- **Shared Secret Derivation**: HKDF-SHA256 binds the classical ECDH shared secret and the post-quantum shared secret into a single unified session key:
  $$\text{SessionKey} = \text{HKDF-SHA256}(SS_{\text{X25519}} \parallel SS_{\text{ML-KEM-768}}, \text{salt}, \text{info})$$
- Even if one of the two cryptographic primitives is compromised in the future, confidentiality remains guaranteed by the intact layer.

### 2.4 Zero-Knowledge Rate-Limiting Nullifier (ZK-RLN) Spam Defense
UREfy protects open peer-to-peer networks from denial-of-service and flooding attacks without centralized identity verification or phone/email requirements:
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

### 2.5 ZK-RLN Lagrange Polynomial Slashing & Secret Key Reconstruction
The ZK-RLN spam defense protocol relies on Shamir linear secret sharing over the 254-bit BN254 scalar field $\mathbb{F}_r$:
$$r = 21888242871839275222246405745257275088548364400416034343698204186575808495617$$

1. **Polynomial Generation**: For every message $m$ in epoch $e$, the client evaluates a degree-1 polynomial:
   $$A(x) = a_0 + a_1 \cdot x \pmod r$$
   where $a_0 = \text{identitySecret}$ (the user's private key), and $a_1 = \text{SHA256}(\text{identitySecret} \parallel e \parallel \text{epochNonce}) \pmod r$.
2. **Evaluation Point (Share)**: The client sets $x = \text{SHA256}(m) \pmod r$ and emits the share tuple $(x, y)$ alongside the ZK membership proof, where $y = A(x) \pmod r$.
3. **Single Message Anonymity**: A single point $(x_1, y_1)$ on a line reveals zero mathematical information about $a_0 = A(0)$ because any value $a_0 \in \mathbb{F}_r$ is equally plausible.
4. **Double-Message Slashing**: If a compromised or malicious client broadcasts two distinct messages $m_1 \ne m_2$ within the same epoch $e$, two distinct points $(x_1, y_1)$ and $(x_2, y_2)$ are revealed ($x_1 \ne x_2$). Any network peer or relay deterministically reconstructs the user's private key via Lagrange interpolation:
   $$a_1 = \frac{y_2 - y_1}{x_2 - x_1} \pmod r$$
   $$a_0 = y_1 - a_1 \cdot x_1 \pmod r$$
   The recovered $a_0$ is compared against the known identity commitment $\text{IDCommit} = \text{Poseidon}(a_0)$. Upon match, the peer's membership is irreversibly slashed, revoked from the relay registry, and broadcasted to the mesh gossip layer.

### 2.6 Chaumian Blind RSA Signatures for Anonymous Merit Voting
To ensure zero correlation between a user's identity and their votes, UREfy utilizes Chaumian blind signatures over RSA with full-domain hashing:
1. **Blinding**: The client prepares the vote message $m$ and hashes it to $\mathbb{Z}_N^*$. It generates a random secret blinding factor $r \in \mathbb{Z}_N^*$ with $\gcd(r, N) = 1$, and blinds the message:
   $$m' = (m \cdot r^e) \bmod N$$
2. **Signing**: The validator verifies the client's eligibility (e.g., WoT reputation $\ge 50$) and signs the blinded payload without ever learning $m$:
   $$s' = (m')^d \bmod N = (m \cdot r^e)^d \bmod N = (m^d \cdot r) \bmod N$$
3. **Unblinding**: The client unblinds the signature using the modular inverse $r^{-1} \bmod N$:
   $$s = (s' \cdot r^{-1}) \bmod N = (m^d \cdot r \cdot r^{-1}) \bmod N = m^d \bmod N$$
4. **Verification**: The unblinded pair $(m, s)$ is published to the network. Any node verifies:
   $$s^e \equiv m \pmod N$$
   Because $s$ is a direct signature on $m$, no observer—including the validator—can link $(m, s)$ to the blinded request $(m', s')$.

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

---

## 5. External Cryptographic Audit Checklist (Pre-Production)

Prior to public deployment with real adversarial participants, the following modules must undergo external peer review:

| Primitive / Module | Code Location | Key Audit Objectives |
| :--- | :--- | :--- |
| **ZK-RLN Lagrange Slashing** | `packages/core-crypto/src/zk-rln.ts` | Verify prime field division inversion $\pmod r$, division-by-zero guards when $x_1 = x_2$, and constant-time execution. |
| **ML-KEM-768 Hybrid KEM** | `packages/core-crypto/src/post-quantum.ts` | Verify NIST FIPS 203 polynomial reduction $q = 3329$, NTT multiplication correctness, and Fujisaki-Okamoto transform bounds. |
| **Groth16 BN254 Verifier** | `packages/core-crypto/src/zk-snark.ts` | Verify Miller loop optimal Ate pairing equation, G1/G2 subgroup checks, and non-degeneracy validation. |
| **Chaumian Blind Voting** | `packages/core-crypto/src/blind-signatures.ts` | Verify blinding factor coprimality $\gcd(r, N) = 1$, constant-time unblinding, and spent nullifier replay resistance. |
| **WAF & Threat Honeypot** | `packages/server-edge/src/waf-defense.ts` | Verify regex complexity to prevent ReDoS, IP ban table memory ceiling, and evasion via URL encoding. |

