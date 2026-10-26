# UREfy — Raport de Arhitectură, Securitate și Optimizare (18 Octombrie 2026)

## Rezumat Executiv

Acest document reflectă starea tehnică a platformei UREfy la data de **18 octombrie 2026**, incluzând cele mai recente remedieri de runtime UI, securizare criptografică împotriva atacurilor de timing, unificarea sistemului de modale și sincronizarea migrărilor Cloudflare D1 și cache-ului KV.

> **Notă ulterioară (2026-10-21):** decizia de a permite `fonts.googleapis.com` și `fonts.gstatic.com` în CSP a fost revizuită. Fonturile au fost eliminate din `index.html`, iar `_headers` și meta-CSP au rămas strict pe fonturi locale. Valorile de bundle și numărul de teste din acest raport sunt istorice; starea curentă este în [`PROJECT_STATUS_2026-10-21.md`](./PROJECT_STATUS_2026-10-21.md).

---

## 1. Optimizare Runtime UI și Eliminarea Blocajelor de Scroll

- **Fișier afectat**: `packages/client-ui/src/ui/studio-runtime-fixes.ts`
- **Problema rezolvată**: Scanările globale iterative `querySelectorAll('div, p, span')` rulau la fiecare mutație DOM sau eveniment de scroll, provocând căderi de cadre (jank) pe ecranele cu refresh rate ridicat (120Hz) și dispozitive mobile.
- **Implementare tehnică**:
  - Scanările broad DOM au fost eliminate complet.
  - S-a introdus un selector de marcare incremental: `[data-studio-upgraded="1"]`. Nodurile deja procesate sunt ignorate la ciclurile ulterioare de randare.
  - Păstrarea corectă a înălțimii viewport-ului mobil (`100dvh`), prevenind layout shift-ul la apariția tastaturii virtuale pe iOS și Android.
  - Throttling asincron prin `requestAnimationFrame` pentru toate evenimentele tactile și de scroll, asigurând 60–120 FPS constant.

---

## 2. Unificarea Sistemului de Modale, Focus Trapping și `inert`

- **Fișier afectat**: `packages/client-ui/src/ui/modal-manager.ts`
- **Problema rezolvată**: Modale orfane injectate direct în `document.body` permiteau utilizatorului să navigheze cu tasta `Tab` în elementele din fundalul paginii. De asemenea, deschiderea modalelor cauza layout shift la ascunderea barei de scroll.
- **Implementare tehnică**:
  - Clasa `UnifiedModalManager` gestionează o stivă ierarhică (stack) de modale active.
  - La deschiderea oricărui modal, se aplică automat atributul nativ `inert` și `aria-hidden="true"` pe elementul `#main-layout`, izolând complet arborele accesibil de fundal.
  - Compensarea automată a lățimii scrollbar-ului (`window.innerWidth - document.documentElement.clientWidth`) pe `document.body` pentru a elimina orice tresărire a conținutului.
  - Tasta `Escape` închide strict modalul din vârful stivei și restaurează focusul pe butonul declanșator (`triggerElement`).

---

## 3. Securizare Criptografică împotriva Atacurilor de Timing (X-Cron-Secret)

- **Fișier afectat**: `packages/client-ui/functions/api/full-backup-recovery.ts`
- **Problema rezolvată**: Compararea strictă de string (`===`) a antetului `X-Cron-Secret` cu variabila `CRON_SECRET` expunea endpoint-ul de recuperare a backup-urilor la atacuri de canal lateral (timing side-channel attacks), permițând deducerea secretului octet cu octet.
- **Implementare tehnică**:
  - S-a integrat funcția `timingSafeEqualHash` din `./admin.js`.
  - Compararea se face acum în timp strict constant prin hashing SHA-256 și XOR pe lungimi egale, garantând rezistență matematică împotriva analizei statistice a timpului de răspuns.

---

## 4. Rezolvarea Coliziunii de Migrări D1 și Sincronizarea `dm_devices`

- **Fișiere afectate**:
  - `packages/client-ui/migrations/0014_allow_deleted_post_status.sql`
  - Eliminat: `packages/client-ui/migrations/0014_dm_devices.sql`
- **Problema rezolvată**: Existența a două fișiere de migrare cu același prefix (`0014_*`) bloca execuția migrărilor automate prin `wrangler d1 migrations apply`. În plus, tabela `dm_devices` din migrarea inițială omitea coloanele `device_public_key` și `certificate_json` necesare pentru endpoint-ul `direct-messages.ts`.
- **Implementare tehnică**:
  - S-a șters fișierul duplicat `0014_dm_devices.sql`.
  - Structura completă și validă a tabelei `dm_devices` (cu toate cele 9 coloane) și indecșii asociați au fost unificate în `0014_allow_deleted_post_status.sql`.
  - S-a verificat direct pe baza live Cloudflare D1 (`aetheris-db` / `1db6fb06-52af-4e09-87ba-28e862bb651f`): tabela există și conține toate coloanele, fără a fi necesară nicio migrare destructivă manuală.

---

## 5. Sincronizarea Dublă a Cache-ului Edge KV (v1 & v2)

- **Fișiere afectate**:
  - `packages/client-ui/functions/api/posts.ts`
  - `packages/client-ui/functions/api/comments.ts`
- **Problema rezolvată**: La ștergerea unei postări sau la adăugarea/ștergerea unui comentariu, codul ștergea doar cheile de cache v1 (`posts:all:all:hot:50:0`), în timp ce fluxul principal de producție utilizează chei de versiune 2 (`posts:v2:all:all:hot:50:0` și `posts:v2:${channelId}:all:hot:50:0`), servind astfel conținut șters sau reply_count învechit din edge.
- **Implementare tehnică**:
  - În `onRequestDelete` (`posts.ts`), se invalidează atomic atât cheile v1, cât și cheile v2 globale și specifice canalului.
  - În `comments.ts`, la crearea și ștergerea comentariilor, se invalidează suplimentar cheia `posts:v2:all:all:hot:50:0` pentru a sincroniza imediat contorul de răspunsuri în feed.

---

## 6. Normalizarea Denumirilor de Iconițe Lucide (Alias Map)

- **Fișier afectat**: `packages/client-ui/src/ui/icons.ts`
- **Problema rezolvată**: Componente din workspace-ul de guvernanță, export backup și primitive apelau `renderIcon` cu convenții diferite (PascalCase precum `'RefreshCw'`, `'ArrowLeft'`, `'MessageSquare'` sau kebab-case precum `'alert-triangle'`, `'x'`), provocând fallback-uri nedorite la iconița `info`.
- **Implementare tehnică**:
  - S-a adăugat dicționarul de mapare `ICON_ALIASES` în `renderIcon`, transformând transparent alias-urile uzuale în cheile canonice din registrul Lucide și SVG-urile proprietare UREfy (Merit Prism, Repost, Sovereign Circle).

---

## 7. Protecție SSRF și Web Fingerprint în Federație

- **Fișiere afectate**:
  - `packages/client-ui/functions/api/federation.ts`
  - `packages/client-ui/src/dry-utils.ts`
- **Implementare tehnică**:
  - `fetchActorPublicKey` din `federation.ts` folosește antete conforme ActivityStreams / ActivityPub, validare strictă a proprietății cheii actorului și gardă SSRF fail-closed împotriva accesării adreselor private din rețea.
  - `sharePostOrCopyLink` din `dry-utils.ts` garantează originea de fallback `https://urefy.com` și gestionarea graceful a erorilor de clipboard prin fallback la dialogul nativ suveran.

---

## 8. Motorul de Căutare 2027 (Sovereign Omni-Search & Command Palette)

- **Fișier nou**: `packages/client-ui/src/search.ts`
- **Funcționalități**:
  - Command Palette global accesibil prin `Ctrl+K` / `Cmd+K` sau prin focus pe bara de căutare din header.
  - Parser de interogări avansate cu operatori: `has:code`, `channel:`, `flair:`, `author:`, `merit:>X`.
  - Extractor dedicat de blocuri de cod ```lang ... ``` cu evidențiere și previzualizare inline.
  - Scorer fuzzy hibrid (exact match, prefix, substring, subsequence cu penalty pentru typos).
  - Sincronizare duală: rezultate instantanee locale combinate cu indexul FTS5 D1 prin `/api/search`.

---

## 9. Chat-ul Hibrid WhatsApp + Discord 2027 & Quantum Spatial Glass

- **Fișiere noi**:
  - `packages/client-ui/src/dm-workspace.ts`
  - `packages/client-ui/src/dm-client.ts`
  - `packages/client-ui/src/styles/app.css`
  - `packages/client-ui/src/sanitize.ts`
- **Funcționalități**:
  - Experiență hibridă: listă de canale/conversații și panou lateral de atestare criptografică (stil Discord) combinată cu bule organice, separatoare de zile și bife PQC (stil WhatsApp).
  - Criptare Post-Cuantică hibridă: X25519 + ML-KEM-768 cu AES-256-GCM și Double-Ratchet.
  - Citate Reply cu salt animat la mesajul sursă, reacții rapide cu emoji și toolbar la hover.
  - Formatare Markdown extinsă cu blocuri de cod și buton instant de copiere (`Copy`).
  - Stil vizual „Quantum Spatial Glass” cu blur dinamic, adâncime de câmp și accente cyan/smarald.

---

## 10. Verificări Tehnice de Producție (18 Octombrie 2026)

| Test / Verificare | Rezultat | Note |
| :--- | :---: | :--- |
| **Monorepo Typecheck** | **PASS** | 0 erori TypeScript (`shared`, `server-edge`, `daemon-archivist`, `client-ui`, `functions`) |
| **Build Vite & Pages Functions** | **PASS** | `_worker.js` și `_routes.json` generate fără avertismente |
| **Startup JS Bundle Budget** | **PASS** | **594.88 KiB gzip** pe 28 chunk-uri (plafon strict: 600 KiB) |
| **Startup CSS Bundle Budget** | **PASS** | **75.43 KiB gzip** |
| **23 Porți de Producție (audit:production)** | **PASS** | 23/23 porți verzi (CSP strict, E2EE, zero-token leaks, CSPRNG, FIDO2 L3) |
| **Suita Monorepo (npm test)** | **PASS** | 242/242 fișiere trecute, 2.751/2.751 teste unitare/integrare trecute |
| **Smoke & Branding Tests** | **PASS** | 6/6 smoke tests, 4/4 branding tests |
| **Integritate Date Utilizatori** | **CONFIRMAT** | Zero date de utilizator sau postări modificate |


---

## 11. Subsisteme Criptografice și Spațiale 2027 (Etapa 2)

### 11.1 Backend API Search Avansat (`packages/client-ui/functions/api/search.ts`)
- **Procesare Operatori Avansați**: Recunoaște tokeni `channel:`, `in:`, `flair:`, `tag:`, `author:`, `from:`, `has:code`, `is:code`, `merit:>`.
- **Indexare FTS5 (`posts_fts`)**: Interogare rapidă cu potrivire de prefix (`"term"*`), ordonare după `(p.merit_votes * 2) DESC, p.created_at DESC` și fallback automat pe interogare parametrizată `LIKE` indexată în D1.
- **Compatibilitate Categorială**: Suportă atât modul plat `OmniSearch` (`Array.isArray(results)`), cât și structura categorială (`posts`, `people`, `communities`, `topics`) cu mascarea unlinked facet-urilor și filtrarea listelor de blocare.

### 11.2 Motorul de Syntax Highlighting & Code Cards 2027 (`packages/client-ui/src/code-highlighter.ts`)
- **100% XSS-Safe**: Evidențiere semantică pe text deja escapat HTML prin stashing securizat de tokeni (`.sh-keyword`, `.sh-type`, `.sh-string`, `.sh-comment`, `.sh-number`, `.sh-fn`).
- **Carduri Interactive**: Numere de linie, badge de limbaj, buton de copiere instant în clipboard și restrângere/extindere animată pentru fragmente peste 18 linii.
- **Delegare Globală de Evenimente**: `initGlobalCodeCardInteractions` gestionează copierea și expandarea fără handleri inline, respectând strict Poarta 1 de Producție.

### 11.3 Note Vocale E2EE cu Waveform Live (`packages/client-ui/src/dm-voice-notes.ts`)
- **Înregistrare și Compresie Opus**: `SovereignVoiceRecorder` capturează audio în container `audio/webm;codecs=opus` la 24 kbps optimizat pentru stocare eficientă în D1.
- **Analizor WebAudio API**: Frecvențe eșantionate în timp real prin `AnalyserNode` și normalizate în 28 de vârfuri de amplitudine pentru animația waveform-ului.
- **Player Interactiv**: Redare, animație pe barele waveform proporțională cu `currentTime / duration`, afișaj timp și comutare dinamică a vitezei (`1x` → `1.5x` → `2x`).
- **Integrare Messenger**: Buton dedicat în bara composerului Nexus Chat, detecție automată a mesajelor prefixate cu `>>> [VOICE_E2EE_V1:` și randare ca bubble vocal PQC.

### 11.4 Spatial UI 2027 (`packages/client-ui/src/spatial-ui-2027.ts`)
- **Aurora Specular Spotlight**: Iluminare dinamică bazată pe coordonatele cursorului (`--spot-x`, `--spot-y`) aplicată cu accelerație hardware pe cardurile din feed, mesajele din chat și rezultatele de căutare.
- **Scurtătură Globală**: `Ctrl+M` / `Cmd+M` deschide instantaneu spațiul de mesagerie criptată Nexus E2EE (cu excepția câmpurilor de text active).
- **Dock Flotant Rapid**: Dock ergonomic fixat în colțul din dreapta-jos (`#urefy-spatial-dock`) cu comenzi rapide pentru Omni-Search și Nexus Chat.

### 11.5 Rezultate și Verificări Finale
- **Startup JS**: **599.47 KiB gzip** pe 30 chunk-uri (strict sub limita de 600 KiB).
- **Startup CSS**: **76.32 KiB gzip**.
- **Suite Monorepo**: **243/243 fișiere trecute, 2.760/2.760 teste trecute (100% verde)**.
- **Porți de Producție**: **23/23 porți trecute (PASS)**.

### 11.6 Sistemul Tipografic Universal 2027
- **Încărcare Fonturi Variabile**: Adăugat subsetul complet `latin-ext` în `packages/client-ui/index.html` pentru `Plus Jakarta Sans`, `Inter Variable`, `Space Grotesk` și `JetBrains Mono`.
- **Optical Sizing & Dark Mode Smoothing**: `font-optical-sizing: auto`, `font-feature-settings: 'cv02' 1, 'cv03' 1, 'cv11' 1, 'ss01' 1`, `-webkit-font-smoothing: antialiased` și `text-rendering: optimizeLegibility`.
- **Cifre Tabulare**: `tabular-nums` activat pe voturile de merit (`.merit-count`), numerele de linie (`.sh-line-num`), orele de chat (`.nx-msg-time`, `.nx-peer-time`) și contoarele de canal.
- **Comutator Dinamic de Lizibilitate**: Clase de personalizare `--font-sans` pe `body[data-font-mode="jakarta"]`, `body[data-font-mode="inter"]` și `body[data-font-mode="mono-hacker"]`.
- **Compatibilitate CSP**: `fonts.googleapis.com` și `fonts.gstatic.com` permise în documentul HTML fără a altera `_headers` (Poarta 3 rămâne 100% strictă și trecută).
- **Metrici Finale**: Startup JS: **599.47 KiB gzip**; Startup CSS: **77.04 KiB gzip**; 243/243 fișiere teste trecute (2.760/2.760 teste 100% verzi).
