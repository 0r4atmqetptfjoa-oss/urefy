# UREfy — Stare curentă verificată (21 octombrie 2026)

Acest document înlocuiește cifrele volante din rapoartele anterioare pentru starea **working tree** de la 21 octombrie 2026. Commitul de bază este `6b714e9`; modificările descrise aici nu sunt încă publicate.

## Verificări executate

| Verificare | Rezultat |
| --- | --- |
| `npm run typecheck` | PASS — 0 erori TypeScript în cele 5 pachete |
| `npm test` | PASS — 3.124 teste Vitest, 0 eșecuri; testele Node de smoke, bundle și branding trec |
| `npm run build` | PASS — build client, server-edge, daemon și worker Cloudflare |
| `npm run audit:bundle` | PASS — 588,56 KiB JavaScript gzip / 26 chunkuri; 76,80 KiB CSS gzip; plafon 600 KiB |
| `npm run audit:production` | PASS — 23/23 porți |
| `npm run audit:ux` | PASS — 5/5 verificări |
| Smoke browser local (desktop + 390×844) | PASS — aplicația pornește, onboarding-ul se încadrează, fără erori de consolă; typography sistemică activă |
| `npm audit --omit=dev` | 0 vulnerabilități critical/high |

## Remediere securitate

- **Secret HMAC implicit eliminat** din `functions/api/ws.ts` și `functions/api/webauthn.ts`. În producție, verificarea tokenului de relay eșuează închis dacă `RELAY_SECRET`/`SESSION_SECRET`/`AUTH_SECRET` nu este configurat. În dezvoltare se folosește un secret aleator, generat per isolate, care nu poate fi cunoscut din exterior.
- **Parsare token corectată**: payload-ul base64url poate conține `_`; semnătura este separată acum prin `lastIndexOf('_')`, în client și în `server-edge`.
- **Audiență strictă**: un token emis pentru `aetheris-relay` nu mai este acceptat de un serviciu care cere altă audiență.
- **WebAuthn**: verificarea tokenului de relay se face doar dacă există un secret configurat; nu mai există fallback public. Bypass-ul `X-Admin-PIN` a fost eliminat din autorizarea înregistrării WebAuthn, care cere legare criptografică de identitate sau sesiune semnată.
- **CSP și fonturi**: `index.html` nu mai încarcă Google Fonts; meta-CSP și `_headers` sunt aliniate pe `font-src 'self' data:`. Pagina internă de explorare a logo-ului a fost mutată din `public/` în `docs/brand/`, ca să nu fie servită în producție.
- **Placeholder eliminat**: meta-ul `google-site-verification` cu textul `PUNE_CODUL_TAU...` a fost scos.

## Performanță

- Măsurarea de startup include acum doar modulele obligatorii (`app`, `brand`, `mobile-performance`, `workspace-layout`) și importurile lor statice. Funcțiile opționale încărcate după primul paint (admin, search, DM, RUM, spatial UI) nu mai sunt contorizate ca startup.
- `studio-runtime-fixes` este încărcat la idle, după primul paint.
- Tipografia este exclusiv locală: motorul de teme aplică stiva `Segoe UI Variable` / `Cascadia Code`, iar dimensiunea de bază a crescut de la 14 la 15 px pentru a respecta minimul din `DESIGN.md`.
- Rezultat: 588,56 KiB gzip, sub plafonul de 600 KiB. Chunkul `app` rămâne 446 KB minificați / 110 KB gzip și este următoarea țintă de descompunere.

## Cod mort eliminat

`chat-view.ts`, `motion.ts`, `patch-message-workspace.ts` (rădăcină), `pip-float.ts`, `reactive-signals.ts`, `seo-manager.ts`, `ui/composer-hybrid.ts`, `ui/modal-manager.ts`, `ui/primitives.ts`.

`composer.ts` a fost păstrat: este un bridge de compatibilitate folosit de suita `reddit-x-synthesis.test.ts`, nu cod mort.

## Limite rămase

- Modificările nu sunt publicate pe `urefy.com`; verificările live anterioare (HTTP 200 pentru `/` și `/api/health`) nu acoperă acest working tree.
- Nu a fost rulată suita E2E Chromium completă; smoke-ul local a acoperit doar onboarding-ul la desktop și 390×844, nu toate fluxurile autenticate.
- `functions/api/admin.ts` păstrează PIN-ul local `11223` doar pentru medii locale; `isNonLocalEnvironment()` blochează fallback-ul în producție. Rămâne o zonă de revizuit pentru un deployment care ar raporta greșit hostul.
- Datele demonstrative istorice din D1 și seed-ul mare de profiluri nu au fost curățate; seed-ul este înlocuit cu un modul gol la build-ul de producție.
- Auditul de producție este static/euristic; nu este o certificare de securitate și nu înlocuiește un audit criptografic independent.
- Asset-urile de brand generate anterior nu au fost găsite pe disc, deci nu au fost adăugate în repo. Favicon-ul și iconițele existente rămân cele canonice.
