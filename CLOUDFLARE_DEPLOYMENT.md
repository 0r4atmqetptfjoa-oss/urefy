# UREfy — deploy Cloudflare

## Proiectul existent

- Domeniu: **https://urefy.com**
- Pages: `aetheris-omni-sphere`, ramura de producție `main`
- Configurație: `packages/client-ui/wrangler.toml`
- D1: `aetheris-db`, binding `DB`
- R2: `aetheris-vault` / `VAULT_BUCKET`, `aetheris-storage` / `STORAGE_BUCKET`
- KV: binding `KV`
- Relay Worker: `aetheris-edge-relay`, binding `RELAY_DO`

Nu este necesară crearea unor resurse noi pentru un deploy obișnuit.

## Autentificare

Folosește `CLOUDFLARE_API_TOKEN` în mediul procesului sau un fișier local de secrete exclus din Git. Tokenul nu aparține aplicației client și nu se pune în variabile `VITE_*`.

Verificare fără afișarea valorilor secretelor, din rădăcina repository-ului:

```powershell
node --env-file=.env scripts/inspect-cloudflare-release.mjs
```

## Verificări și build

```powershell
npm test
npm run lint
npm run build
npm run audit:bundle
```

`lint` este aliasul proiectului pentru verificarea TypeScript. Bugetul de pornire rămâne 600 KiB JavaScript gzip.

## Migrații

Din directorul `packages/client-ui`, cu tokenul prezent în mediu:

```powershell
npx wrangler d1 migrations list aetheris-db --remote
npx wrangler d1 time-travel info aetheris-db
npx wrangler d1 migrations apply aetheris-db --remote
```

Inspectează lista înainte de aplicare. Nu executa schema inițială sau scripturile de seed peste producție.

Migrațiile `0012_storage_allocations.sql` și `0013_social_safety_tables.sql` au fost aplicate la publicarea din 19 septembrie 2026. Prima introduce evidența cotelor; a doua completează tabelele de siguranță lipsă în instalările vechi. API-ul notificărilor suportă ambele scheme existente de coloane.

## Publicare Pages

Din `packages/client-ui`:

```powershell
npx wrangler pages deploy dist --project-name=aetheris-omni-sphere --branch=main --commit-dirty=true
```

Folosește `--commit-dirty=true` doar când publici intenționat un checkout cu schimbări necomise. Comanda nu creează commituri Git. Fișierul Wrangler este sursa configurației pentru bindings și variabilele nesensibile; verifică după deploy că secretele existente au rămas configurate.

## Limite de stocare

Configurate în `wrangler.toml` și verificate pe server:

| Variabilă | Valoare implicită publicată |
| --- | --- |
| `MAX_UPLOAD_BYTES` | 26,214,400 — 25 MiB/fișier |
| `MAX_ACCOUNT_STORAGE_BYTES` | 104,857,600 — 100 MiB/cont |
| `MAX_STORAGE_CAP_BYTES` | 8,589,934,592 — 8 GiB/platformă |

Alocările în curs contează în cotă. O încărcare cu rezultat incert păstrează alocarea până când ștergerea/reconcilierea confirmă că obiectul nu mai există. Inventarul istoric R2 trebuie reconciliat înainte de a considera consumul istoric pe cont complet.

## Verificări după deploy

- Confirmă domeniul și ID-ul deployment-ului prin scriptul de inspecție.
- Verifică HTML-ul, activele JS/CSS, manifestul și `/api/health`.
- Verifică `/api/posts` și `/api/communities`.
- Citirile private fără semnătură trebuie refuzate; citirile semnate de notificări și stocare trebuie să reușească.
- `wrangler d1 migrations list ... --remote` trebuie să arate lista așteptată.
- Verifică păstrarea binding-urilor și a secretelor, fără afișarea valorilor acestora.

## Preview local complet

Din rădăcina repository-ului:

```powershell
npm run build
npm run local:db --workspace=packages/client-ui
npm run preview:full --workspace=packages/client-ui
```

Preview: `http://127.0.0.1:3011`. Folosește emulatoare locale și directorul separat `.wrangler-product-qa/`. Relay-ul Durable Object necesită și procesul worker local; absența acestuia nu este simulată ca o conexiune live.

## Raportul publicării

Vezi [raportul de hardening și deploy](docs/PRODUCT_HARDENING_2026-09-19.md) pentru ID-urile deployment-urilor, rezultatele exacte, migrații și dependențele încă neimplementate.
