# Privacy Policy — Aetheris Omni-Sphere

**Compliance Framework**: European Union General Data Protection Regulation (GDPR — Regulation (EU) 2016/679).  
**Effective Date**: September 5, 2026  
**Language**: English (Official Legal Text) / Română (Traducere Oficială)

---

## 1. Fundamental Principle: Privacy by Design & Zero Centralized Collection

Aetheris Omni-Sphere was engineered from its mathematical foundations on the principle of **radical data minimization** (GDPR Article 5(1)(c)):
- **Zero Account Registration**: We do not solicit, collect, or store personal data, including email addresses, phone numbers, real names, KYC credentials, or passwords.
- **Self-Sovereign Cryptographic Identity**: Your identity is defined entirely by an Ed25519 keypair deterministically generated client-side from a local BIP-39 12-word mnemonic. Private keys never transmit across network boundaries or touch any server.
- **Zero Third-Party Trackers & Telemetry**: The platform operates with strictly zero tracking cookies, zero tracking pixels, and zero third-party analytics engines (No Google Analytics, no Facebook Pixels, no Datadog/Sentry beacons). All interface preferences reside exclusively within local device storage (`localStorage` and `IndexedDB`).
- **Post-Quantum End-to-End Encryption (E2EE)**: Direct and group conversations employ hybrid ML-KEM-768 + X25519 authenticated key encapsulation paired with AES-256-GCM. Intermediary relays and edge nodes process solely opaque cryptographic payloads.

---

## 2. Technical Data Processing & Network Hygiene

### 2.1 Public Content Voluntarily Broadcast
Any message, cryptographic nanorelease, or document published to public channels (Pulse Stream, Knowledge Vault, Relay Channels) is distributed across peer-to-peer swarms and edge caching nodes. Do not include personal or confidential data in public broadcasts.

### 2.2 Private End-to-End Encrypted Messages
Direct Messages and Sovereign Circle communications are encrypted client-side prior to network egress. Only intended recipients possessing corresponding private keys can decrypt payloads.

### 2.3 Ephemeral IP Addresses at Relay Ingress
Connecting to decentralized relay nodes via WebSockets or WebRTC inherently transmits technical IP addresses necessary for packet routing. Relay software maintains IP addresses strictly in transient, volatile RAM buffers to defend against DDoS attacks (Layer 7 WAF honeypots). Technical IP logs are never mapped to cryptographic identities or shared with third parties.

---

## 3. User Rights under GDPR (Articles 15–22)

Under Regulation (EU) 2016/679, users maintain explicit rights:
- **Right to Erasure & Cryptographic Zeroization (Art. 17)**: Users may immediately purge all local state, cryptographic private keys, drafts, and cached messages via the "Purge & Zeroize Memory" command. This triggers secure volatile memory overwriting (`crypto.getRandomValues`) and complete deletion of browser IndexedDB instances.
- **Right to Data Portability (Art. 20)**: Users can export a 100% complete, encrypted offline backup package of their keys, contacts, saved nanopublications, and configuration via the *Export & Backup* facility.
- **Zero-Knowledge Anonymity & Anti-Surveillance**: Voting and community participation leverage Chaumian blind signatures and ZK-SNARK membership proofs, guaranteeing mathematical unlinkability between user identity and voting actions.

---

## 4. Data Protection Contact

For technical questions regarding cryptographic privacy guarantees or GDPR compliance:
- **Designated Security & Privacy Contact**: `privacy@aetheris.network`
- **Source Code & Audit Verification**: All cryptographic primitives and edge worker scripts are open-source and subject to deterministic builds.

---

## Traducere în Limba Română (Informativă)

### 1. Principiu Fundamental: Minimizare Radicală
Aetheris Omni-Sphere nu colectează, nu stochează și nu comercializează date cu caracter personal. Identitatea aparține exclusiv utilizatorului prin chei Ed25519 gestionate local.

### 2. Dreptul la Ștergere și Zeroizare
Utilizatorul poate activa oricând funcția de zeroizare criptografică a memoriei, ștergând ireversibil toate datele locale de pe dispozitiv.

### 3. Contact GDPR
Pentru orice solicitare: `privacy@aetheris.network`.

