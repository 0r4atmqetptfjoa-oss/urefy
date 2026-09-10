# Ghid de Inițializare și Configurare Cloudflare (Producție)

Acest document conține pașii exacți pentru crearea resurselor Cloudflare și legarea lor la proiectele **Pages** (client-ui) și **Workers** (server-edge).

---

## 1. Autentificare în Cloudflare CLI

`ash
npx wrangler login
npx wrangler whoami
`

---

## 2. Crearea Bazei de Date D1 (SQLite Edge)

`ash
# Crează baza de date în rețeaua globală Cloudflare
npx wrangler d1 create aetheris-global-d1
`

> **Notă**: Comanda va returna un database_id (un UUID de tipul xxxx-xxxx-xxxx).
> Copiază acest ID în packages/client-ui/wrangler.toml și packages/server-edge/wrangler.toml la câmpul database_id.

### Aplicarea Schemei Inițiale de Tabele (Migrații)

`ash
# Execută migrația 0001_initial_schema.sql pe instanța de producție
npx wrangler d1 migrations apply aetheris-global-d1 --remote --cwd packages/client-ui
`

---

## 3. Crearea Namespace-ului KV (Cache Rapid)

`ash
# Crează namespace-ul KV
npx wrangler kv:namespace create aetheris-cache-kv
`

> Copiază ID-ul returnat în packages/client-ui/wrangler.toml la [[kv_namespaces]] id.

---

## 4. Crearea Bucket-ului R2 (Stocare Fisiere & Backup D1)

`ash
# Crează bucket-ul R2 dedicat fișierelor din seif și snapshot-urilor automate
npx wrangler r2 bucket create aetheris-vault-storage
`

---

## 5. Setarea Secretelor Criptografice (Nu se pun în cod!)

### A. Secretul Admin PIN (obligatoriu în producție)
`ash
# Setează PIN-ul administrativ (minim 5 cifre / caractere complexe)
npx wrangler secret put ADMIN_PIN --cwd packages/client-ui
`

### B. Cheia Privată a Nodului Ed25519 (pentru federație și semnături)
`ash
# Setează cheia privată Ed25519 a nodului
npx wrangler secret put NODE_PRIVATE_KEY --cwd packages/client-ui
`

Pentru interoperabilitate cu servere Fediverse care folosesc RSA-SHA256, configurează
ambele chei PEM ale aceluiași keypair RSA de minimum 2048 biți. Cheia privată trebuie
să fie PKCS#8 (`BEGIN PRIVATE KEY`), nu PKCS#1. Nu configura doar una dintre ele.

```bash
npx wrangler secret put FEDERATION_RSA_PRIVATE_KEY_PEM --cwd packages/client-ui
npx wrangler secret put FEDERATION_RSA_PUBLIC_KEY_PEM --cwd packages/client-ui
```

Dacă perechea RSA este configurată, actorul ActivityPub o publică și o folosește
pentru livrările draft-cavage. `NODE_PRIVATE_KEY` rămâne cheia Ed25519 pentru
protocoalele native UREfy.

### C. Cheile VAPID pentru Web Push
`ash
npx wrangler secret put VAPID_PRIVATE_KEY --cwd packages/client-ui
npx wrangler secret put VAPID_PUBLIC_KEY --cwd packages/client-ui
`

---

## 6. Deploy Pages & Deploy Workers

### Deploy Proiect Pages (@aetheris/client-ui)
`ash
cd packages/client-ui
npm run build
npx wrangler pages deploy dist --project-name aetheris-omni-sphere
`

### Deploy Worker Signaling Relay & Backup Cron (@aetheris/server-edge)
`ash
cd packages/server-edge
npm run build
npx wrangler deploy
`

---

## 7. Verificare Post-Deploy

1. Accesează https://aetheris.pages.dev/api/health -> Răspuns: {"status":"healthy","d1Enabled":true,"kvEnabled":true}
2. Accesează panoul admin: https://aetheris.pages.dev/admin.html -> Tastează PIN-ul secret definit la Pasul 5.
3. Testează backup-ul automat manual: POST /api/cron-backup cu header X-Admin-PIN sau verifică rularea la 03:00 UTC.
