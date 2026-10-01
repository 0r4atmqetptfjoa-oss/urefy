# UREfy — audit de optimizare, 1 octombrie 2026

## Domeniu și stare

Audit al checkout-ului curent din `D:\proiect site total`, plus observații în browser pe `https://urefy.com`. Modificările existente au fost păstrate. Acest audit nu modifică implementarea aplicației și nu publică o versiune nouă. Build-ul local a fost regenerat pentru măsurare și teste.

Rezultatul nu este „totul rezolvat”: există un eșec WebKit repetabil și costuri mari de randare/încărcare. Auditurile statice trec, dar acestea nu înlocuiesc verificarea în browser.

## Verificări efectuate acum

| Verificare | Rezultat |
| --- | --- |
| `npm run typecheck` | PASS, monorepo și Functions |
| `npm run build --workspace=packages/client-ui` | PASS, inclusiv compilarea Pages Functions |
| `npm run audit:production` | 23/23 PASS |
| `npm run audit:ux` | 5/5 PASS |
| Vitest: project-repairs, mobile-responsive-performance, facets-seo-privacy, security/nonce-poisoning | 52/52, 4 fișiere |
| `node scripts/bundle-budget.mjs` | 666,02 KiB JS gzip / 27 chunks; 69,38 KiB CSS gzip; PASS față de plafonul actual 700 KiB |
| chat-signature-visual + scroll-and-flicker, Chromium | 10/10 PASS |
| Aceleași două fișiere, Firefox | 10/10 PASS |
| Aceleași două fișiere, Mobile Chrome | 10/10 PASS |
| Aceleași două fișiere, WebKit | 9/10 PASS; feed visibility FAIL |
| Rerulare izolată WebKit, feed scroll position | FAIL din nou |
| functional-controls: navigație mobile drawer, cele 4 configurații | 4/4 PASS |
| functional-controls: profile settings/scroll, cele 4 configurații | 0/4; timeout la selectorul vechi `#btn-settings-cat-security` |

Totalul primelor rulări E2E selectate este 43/48; rerularea izolată WebKit eșuează suplimentar. Acestea sunt suite selectate, nu întreaga suită unitară sau E2E. Testele de teme confirmă persistența și anumite fundaluri; nu constituie audit complet de contrast, accesibilitate sau aspect al tuturor paginilor. Emularea mobilă nu confirmă tastatura nativă pe telefon.

## Priorități

### P1 — rezolvarea regresiei WebKit de vizibilitate după boot

**Dovadă:** `e2e/scroll-and-flicker.spec.ts:33` eșuează de două ori la `expect(#main-feed-scroll).toBeVisible()`. Containerul există. Diagnosticul separat măsoară 744 × 661 px, dar `getComputedStyle(...).visibility` este `hidden`. Aceeași valoare este prezentă pe strămoși până la `#main-layout`, deși `#app` este `visible` și clasa documentului este deja `dark`, fără `app-booting`. Chromium raportează `visible`.

Într-un diagnostic temporar, declararea explicită a `visibility: visible` pe `#main-layout` schimbă și feedul în `visible`. Diagnosticul a fost eliminat; nu este o reparație aplicată aplicației. Dimensiunile normale infirmă ipoteza inițială de container cu înălțime zero. Nu rezultă că întreaga pagină este vizual goală: screenshotul arată și conținut descendent.

**Puncte de investigat:** `index.html:155` ascunde aplicația cu `.app-booting #app`; `src/main.ts:36-47` montează aplicația și elimină ascunderea. Verifică invalidarea vizibilității moștenite în WebKit și semnalul real de finalizare a boot-ului înainte de popularea fixture-ului. Cauza exactă și impactul pe Safari fizic rămân de stabilit.

**Acceptare:** testul original trece în WebKit în rulări repetate; feedul este vizibil și derulabil după boot, inclusiv după notificări. Păstrează protecția împotriva flash-ului la pornire și evită `force: true`, eliminarea aserțiunii sau simpla mărire a timeout-ului.

### P1 — limitarea playerelor și a feedului montat

**Dovadă live:** feed cu 100 postări, aproximativ 13.434 elemente în documentul principal și 43 iframe-uri. Player-ele YouTube au deja `src` real și `loading="lazy"`. Nu este o măsurare FPS sau Core Web Vitals.

**Cod:** `src/media-player.ts:261` creează iframe-ul înainte de clic; posterul maschează playerul, fără a amâna instanțierea. `src/feed-view.ts:190-245` generează cardurile pentru întreaga listă. Modul Flow generează și versiunea mobilă și versiunea desktop, ascunzând una cu CSS. `src/product.css:68` folosește `content-visibility`, care reduce layout/paint fără să limiteze numărul elementelor montate.

**Lucrări:**

- Fațadă video: miniatură și buton accesibil; instanțiere iframe la clic sau conform unei preferințe explicite de autoplay. Păstrează fallback pentru video indisponibil și politica existentă de securitate/media.
- Paginație sau randare limitată cu ancoră stabilă; evită două copii complete ale feedului la același breakpoint. Păstrează navigarea, căutarea, accesibilitatea și întoarcerea la poziția citită.
- Eliberează playerele nefolosite și observatorii lor fără a întrerupe redarea activă.

**Acceptare:** în modul fără autoplay, zero iframe-uri video înainte de activare; istoricul poate crește fără ca întregul DOM să crească proporțional; derularea și revenirea la postarea citită rămân stabile. Măsoară CPU/layout și memoria înainte/după cu același set de 100 postări.

### P2 — unificarea traseului de setări și actualizarea testului profilului

Testul `e2e/functional-controls.spec.ts:63` eșuează în toate cele patru configurații înainte să ajungă la aserțiunile despre scroll. După clic pe Settings din profil, deschide interfața generală de setări; testul continuă să caute controalele vechi din profil. Nu este dovadă că selectarea Security sau păstrarea scrollului în interfața actuală este defectă.

Există însă o redundanță confirmată: snapshotul arată pagina dedicată Settings în `#main-stage` și dialogul „Sovereign Settings” simultan, fiecare cu propria listă de categorii. Screenshotul arată dialogul peste pagină.

**Cod:** `src/profile/profile-header.ts:51` folosește `data-action="open-settings"`. Prima ramură `open-settings` din `src/ui/action-dispatcher.ts:558` navighează la Settings și apelează `settingsView.open()`. `src/router.ts:215` deschide și el settingsView la navigare; `src/settings-view.ts:196` montează dialogul. `src/app.ts:1659` randează workspace-ul dedicat. Mai există o a doua ramură `open-settings` în același switch, la `action-dispatcher.ts:1600`, care este eclipsată de prima.

**Lucrări:** definește o singură destinație și un singur apel de deschidere; elimină ramura duplicată și reconcilierea dintre panoul legacy al profilului, pagina dedicată și modal. Actualizează testul pentru contractul de navigare ales, păstrând aserțiuni reale pentru categoria selectată, scroll și întoarcerea la profil.

**Acceptare:** o singură suprafață de setări activă, fără controale duplicate în arborele de accesibilitate; Security/Privacy funcționează și testele reflectă UX-ul real. Navigația mobile drawer deja verificată trebuie să rămână funcțională.

### P2 — reducerea JavaScript-ului de pornire și unificarea bugetului

**Dovadă:** 666,02 KiB JS gzip este cu circa 66 KiB peste fostul plafon de 600 KiB. Plafonul curent de 700 permite PASS; ridicarea plafonului nu reprezintă o reducere de transfer sau execuție.

Cele mai mari grupuri obligatorii în graful măsurat: vendor 127,62 KiB, app 114,08, client-core 92,89, interaction-runtime 60,61, workspace-controls 48,18, post-rendering 38,77, workspace-navigation 30,97, preload-helper 25,03 și workspace-layout 24,53 KiB gzip.

**Lucrări:** scoate modulele necesare exclusiv pentru alte rute sau instrumente avansate din importurile statice ale bootstrap-ului. Începe cu profile/settings/controls și handler-ele pentru funcții care nu apar pe Home. Wallet este deja încărcat separat; nu îl trata drept muncă încă nefăcută.

Există două scripturi cu definiții diferite:

- `scripts/bundle-budget.mjs` urmărește manifestul și dependențele modulelor de bootstrap; plafon 700.
- `packages/client-ui/scripts/bundle-budget.mjs` adună scripturile/modulepreload din HTML; plafon 600. Nu urmărește întregul bootstrap dinamic și poate raporta o valoare incompletă.

Auditul static de producție verifică și entry chunk-ul mic; aceasta nu este valoarea întregii încărcări inițiale. Unifică scripturile și folosește aceeași comandă în CI/documentație.

**Acceptare:** țintă inițială sub 600 KiB în măsurarea recursivă existentă, fără pierderea funcțiilor. Verifică separat latența primei utilizări a modulelor mutate. Include CPU de parse/evaluare pe mobil în măsurători, nu doar gzip.

### P2 — actualizări incrementale ale conversațiilor și feedului

**Cod:** `src/app.ts:844-851` folosește `innerHTML` dacă HTML-ul regiunii s-a schimbat; `src/app.ts:1352` aplică acest mecanism întregului `#main-stage`. Există căi rapide pentru anumite evenimente, plus restaurarea scrollului/focusului. La modificări de conținut se pot recrea însă composer-ul, cardurile și playerele.

**Lucrări:** actualizează prin ID rândul/cardul afectat și adaugă mesajele noi fără a înlocui întreaga regiune. Păstrează nodul composer-ului, selecția, sesiunea de tastare și playerul activ. Păstrează rendererul existent și arhitectura TypeScript/DOM.

**Observație live:** conversația comunității verificată se deschide la ultimul mesaj, cu distanță până la final de **0 px**. Nu mai este corect să descriem acest scenariu verificat drept defect activ. Nu au fost validate astfel toate conversațiile sau DM-urile.

**Acceptare:** la mesaj nou, identitatea nodului input rămâne aceeași; dacă utilizatorul citește istoricul, poziția sa se păstrează; dacă este la final, mesajele noi rămân vizibile. Testează prepend de istoric, imagini cu încărcare întârziată, schimbarea conversației, trimiterea unui mesaj și tastatura mobilă.

### P2 — Markdown pentru bani și tabele

**Dovadă live:** unele fraze cu două sume în dolari sunt transformate în matematică, cu text fragmentat/stilizat greșit. Exemplele cu `$650 each ... $1,300` și `$120/year ... $130` ajung tratate drept o pereche de delimitatoare math. Tabelele observate apar ca text cu bare verticale.

**Cod:** `src/markdown-renderer.ts:330-337` acceptă perechea `$...$` și exclude doar conținutul complet numeric dintre delimitatoare. Această excepție nu acoperă propoziții care conțin două prețuri.

**Lucrări:** definește o delimitare explicită a expresiilor math care păstrează prețurile; implementează suport de tabel dacă Markdown-ul produsului îl promite. Păstrează escaping-ul HTML și validarea URL-urilor.

**Acceptare:** regresii pentru prețuri, expresii math reale, escape-uri, cod, linkuri și payload-uri XSS; tabel accesibil și derulabil pe mobil.

### P3 — consolidarea CSS și audit vizual pe rute

`main.ts` importă mai multe straturi CSS globale; doar CSS-ul de pornire măsoară 69,38 KiB gzip. `product.css` redefinește repetat layout-ul și tipografia articolului, inclusiv în zona `journal-thread` și `editorial-stage`. Consolidarea regulilor reduce ambiguitatea și riscul ca o pagină sau temă să recadă la alt stil.

Postarea GTA accesată direct pe live funcționează. La viewport 1280 × 720, articolul măsurat are 660 px și titlul 582 px; nu reproduce coloana extrem de îngustă din screenshoturile istorice la această dimensiune. Verificarea la ecrane foarte mari și pe toate temele rămâne necesară.

Un clic pe titlul postării din sesiunea IAB nu a schimbat URL-ul. Linkul direct funcționează, iar un clic local pe titlu în Chromium navighează corect. Acesta este un rezultat neconcludent pentru un defect de producție; necesită verificare în Chrome obișnuit, cu și fără service worker, înainte de reparație.

Continuă auditul vizual pentru Home, Explore, Communities, postare, Profile, Settings, Vault și Messages la 390/768/1280/1920 px, pe mod luminos și întunecat. Verifică contraste, ținte tactile, overflow și continuitatea identității vizuale. Nu există în acest raport un rezultat complet pentru toate aceste combinații.

## Ordinea recomandată

1. Regresia WebKit și readiness la boot.
2. Fațade video și feed cu DOM limitat.
3. Unificarea Settings și repararea contractului testelor de profil.
4. Separarea modulelor opționale și unificarea bugetului.
5. Actualizări incrementale, ancore de scroll și composer stabil.
6. Markdown și consolidarea CSS, urmate de verificarea vizuală pe rute.

După fiecare etapă: aceleași fixtures, aceleași dimensiuni de viewport, comparație înainte/după. După publicare: verificare separată pe live și confirmarea asset-urilor efectiv servite. În această tură a fost observat live entry-ul `main-BPx4-NjY.js`, cu același nume ca în build-ul local; nu s-a făcut comparație byte-for-byte a tuturor asset-urilor.
