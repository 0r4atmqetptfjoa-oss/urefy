# 🌌 Platforma UREfy (Sovereign Zero-Knowledge Network)

[![CI Matrix](https://github.com/aetheris/aetheris/actions/workflows/ci.yml/badge.svg)](https://github.com/aetheris/aetheris/actions)

> **Platformă hibridă unificată de comunicație E2EE în timp real, forum de resurse verificate și microblogging liber, orientată spre confidențialitate absolută și suveranitatea datelor.**

---

## ⚡ Arhitectura Monorepo

Sistemul este împărțit în 5 pachete. Dezvoltarea locală include fixture-uri și simulări; acestea nu reprezintă activitate reală a rețelei. Verificările automate nu înlocuiesc un audit criptografic independent.

```
d:\proiect site total\
├── packages\
│   ├── core-crypto\         # Matematică pură: Ed25519, ZK-RLN Shamir/Lagrange, Merkle Trees, E2EE AES-GCM
│   ├── vault-engine\        # Analizor binar: Shannon Entropy, PE32/PE32+ & ELF Parser, P2P Swarm Chunker
│   ├── server-edge\         # WebSocket server, SQLite/D1 database, ZK-RLN auto-slashing, 24h Atomic Rollback
│   ├── daemon-archivist\    # Daemon autonom Ed25519 cu rol de sistem, crawler de release-uri și sinteză
│   └── client-ui\           # Interfață suverană (Vite + Tailwind CSS + Lucide), Obsidian Theme, Dual Horizon
├── start.bat                # Lansator 1-click pentru Windows
└── package.json             # Workspace-uri npm
```

---

## 🛡️ Ce face UREfy cu adevărat UNIC pe piață?

1. **Limitare de debit și revocare ZK-RLN:**
   - Relay-ul urmărește dovezile și nullifier-ele pentru detectarea încălcărilor de protocol. Cheile private nu trebuie extrase sau expuse în mesajele de rețea; testele includ această invariantă.
2. **Binary Hygiene Engine (Local Shannon Entropy & Static Parser):**
   - Înainte de a descărca orice fișier din Vault, clientul execută o inspecție statică a structurilor de header PE (Windows) / ELF (Linux), calculând entropia Shannon ($0.0 - 8.0$ biți/octet) și alertând utilizatorul dacă executabilul are secțiuni compromise cu drepturi de scriere și execuție (RWX).
3. **Sistemul de Design "UREfy Sovereign UI":**
   - **Telescopic Density:** Comutare instantanee între modurile *Compact IRC* (`Alt+1`), *Balanced Linear* (`Alt+2`) și *Expanded Rich* (`Alt+3`).
   - **Dual-Horizon Split View (`Ctrl+\`):** Poți avea simultan chat-ul live pe stânga și documentația / fișierele din Vault pe dreapta.
   - **The Command Rail (`Ctrl+K`):** Paletă de navigare rapidă fără mouse stil Raycast/Linear.
   - **Buget măsurabil:** `npm run audit:bundle` măsoară toate dependențele statice de pornire din manifest, nu doar fișierul principal. Detaliile și limitele actuale sunt în [UPGRADE_NOTES.md](UPGRADE_NOTES.md).
4. **24-Hour Atomic Rollback:**
   - În cazul în care un cont de moderator este compromis, acțiunile sale de moderare pot fi anulate retroactiv dintr-o singură tranzacție atomică pe ultimele 24 de ore.
5. **Neural DSP Noise Gate:**
   - Procesor Web Audio API local care filtrează zgomotul tastaturilor mecanice și al respirației înainte de transmiterea fluxului audio WebRTC.

---

## 🚀 Cum se pornește proiectul?

Folosește Node.js 24 LTS (recomandat) sau Node.js 22.12+ compatibil cu toolchain-ul. Instalează dependențele cu `npm ci`. Pentru compilare folosește `npm run build`, care respectă ordinea dependențelor dintre pachete. Verificarea completă de tipuri, inclusiv funcțiile Cloudflare, este `npm run typecheck`.

### Metoda 1 (Recomandată pe Windows):
Faci dublu-click pe:
```cmd
start.bat
```
Acest script va deschide automat:
- Serverul Edge pe `http://localhost:4000` (WebSocket pe `ws://localhost:4000`)
- Daemonul Archivist (care va indexa și injecta pachete verificate în Vault)
- Interfața Client pe `http://localhost:3000`

### Metoda 2 (Manual prin Terminal):
1. **Pornire Server:**
   ```bash
   npm run server
   ```
2. **Pornire Daemon Archivist:**
   ```bash
   npm run daemon
   ```
3. **Pornire Client UI:**
   ```bash
   npm run client
   ```
4. **Rulare teste:**
   ```bash
   npm test
   ```

### Metoda 3 — Docker Containerization (Local Development & Self-Hosting):

Pentru dezvoltare locală cross-platform (Linux/macOS/Windows) sau scenarii de auto-găzduire suverană (self-hosting), întreaga platformă UREfy este complet containerizată prin Docker și Docker Compose.

> **Infrastructură & Deployment:**  
> Docker este destinat dezvoltării locale omogene pe orice sistem de operare (Linux/macOS/Windows) și auto-găzduirii (on-premises sau VPS dedicat), în timp ce arhitectura de producție globală utilizează capabilitățile edge serverless oferite de **Cloudflare Pages** și **Workers Edge**.

1. **Construire imagini Docker:**
   ```bash
   docker compose build
   ```
2. **Pornire servicii în mod detached:**
   ```bash
   docker compose up -d
   ```
3. **Oprire containere:**
   ```bash
   docker compose down
   ```

Servicii orchestrate:
- **`server-edge`**: expus pe `http://localhost:4000` (WebSocket: `ws://localhost:4000`)
- **`daemon-archivist`**: worker de arhivare și indexare automată conectat la server
- **`client-ui`**: container de dezvoltare live-reload expus pe `http://localhost:3000`

---

## 📜 Sustenabilitate, Finanțare & Guvernanță

- [Modelul de Sustenabilitate Suverană (SUSTAINABILITY.md)](./SUSTAINABILITY.md) — Cei 5 piloni: granturi OSS, economie P2P cu cost zero de scalare, reputație fără tokeni speculativi, impact ecologic minim și neutralitatea protocolului.
- [Opțiuni de Decizie Finanțare & Guvernanță (GOVERNANCE_FUNDING.md)](./GOVERNANCE_FUNDING.md) — Document de decizie pentru proprietarul de proiect privind operarea relay-urilor comunitare și micro-donațiile transparente non-custodiale.


