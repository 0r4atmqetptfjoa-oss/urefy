# 🌌 Platforma Aetheris (Sovereign Zero-Knowledge Network)

> **Platformă hibridă unificată de comunicație E2EE în timp real, forum de resurse verificate și microblogging liber, orientată spre confidențialitate absolută și suveranitatea datelor.**

---

## ⚡ Arhitectura Monorepo

Sistemul este împărțit în 5 module complet funcționale (fără simulări sau mockups):

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

## 🛡️ Ce face Aetheris cu adevărat UNIC pe piață?

1. **Biometric Identity Slashing (ZK-RLN + Lagrange Interpolation):**
   - Dacă un utilizator trimite 2 mesaje diferite în aceeași epocă temporală, rețeaua execută interpolarea Lagrange peste cotele Shamir $A(x_1)$ și $A(x_2)$, reconstruiește cheia privată $a_0$ a utilizatorului și o arde instantaneu în arborele Merkle de revocare globală.
2. **Binary Hygiene Engine (Local Shannon Entropy & Static Parser):**
   - Înainte de a descărca orice fișier din Vault, clientul execută o inspecție statică a structurilor de header PE (Windows) / ELF (Linux), calculând entropia Shannon ($0.0 - 8.0$ biți/octet) și alertând utilizatorul dacă executabilul are secțiuni compromise cu drepturi de scriere și execuție (RWX).
3. **Sistemul de Design "Aetheris Sovereign UI":**
   - **Telescopic Density:** Comutare instantanee între modurile *Compact IRC* (`Alt+1`), *Balanced Linear* (`Alt+2`) și *Expanded Rich* (`Alt+3`).
   - **Dual-Horizon Split View (`Ctrl+\`):** Poți avea simultan chat-ul live pe stânga și documentația / fișierele din Vault pe dreapta.
   - **The Command Rail (`Ctrl+K`):** Paletă de navigare rapidă fără mouse stil Raycast/Linear.
   - **Consum minim de memorie:** Bundle optimizat de sub 70 KB, fără lag de Electron.
4. **24-Hour Atomic Rollback:**
   - În cazul în care un cont de moderator este compromis, acțiunile sale de moderare pot fi anulate retroactiv dintr-o singură tranzacție atomică pe ultimele 24 de ore.
5. **Neural DSP Noise Gate:**
   - Procesor Web Audio API local care filtrează zgomotul tastaturilor mecanice și al respirației înainte de transmiterea fluxului audio WebRTC.

---

## 🚀 Cum se pornește proiectul?

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
