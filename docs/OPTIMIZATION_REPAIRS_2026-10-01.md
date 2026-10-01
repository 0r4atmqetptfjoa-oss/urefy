# UREfy — reparații și optimizări, 1 octombrie 2026

## Stare și limite

Implementare verificată **local**, în continuarea [auditului](OPTIMIZATION_AUDIT_2026-10-01.md). Nu am publicat o versiune nouă și nu am modificat sau șters date de utilizatori, profiluri ori postări. Nu am executat scripturi seed, migrări, curățări de baze de date sau cereri API de scriere. Modificările preexistente din checkout au fost păstrate.

Testele noi folosesc numai fixture-uri sintetice în memoria unor contexte locale de browser care sunt închise după test. Numărul postărilor fixture rămâne 100 după paginație; doar prezentarea este limitată.

## Implementare

- **WebKit:** eliberare explicită a vizibilității moștenite după boot. Testul de feed vizibil și scroll trece fără click forțat sau eliminarea aserțiunii.
- **Settings:** o singură pagină dedicată, inclusiv pentru intrarea din profil și helperul global. Eliminată deschiderea simultană a modalului; categoria și scrollul sunt păstrate la actualizări.
- **Home:** primul lot afișează 20 de postări, apoi câte 20 prin „Load more”. Toate postările rămân disponibile. Se generează un singur arbore pentru breakpointul activ, fără duplicarea completă mobil/desktop.
- **Video:** iframe-ul extern rămâne într-un template inert până la activare sau autoplay activat explicit. Buton accesibil și fallback Vimeo. Playerul activ se păstrează când se adaugă următorul lot; video nativ pornit manual nu este oprit cât timp este vizibil.
- **Actualizări DOM:** reconciliere limitată la același feed sau aceeași conversație. Composer-ul, selecția, focusul și rândurile existente se păstrează la sosirea unui mesaj. Schimbarea rutei sau conversației montează o vedere nouă.
- **Scroll:** restaurarea amânată nu mai suprascrie poziția unui container reutilizat. Pentru loturile Home se folosesc înălțimi reale; estimările anterioare mutau butonul „Load more” în timpul clickului.
- **Startup:** Settings, Explore și Communities se încarcă la navigare. Cele două comenzi de buget folosesc aceeași măsurare a întregului graf obligatoriu de bootstrap.
- **Markdown:** prețurile cu `$` nu mai sunt confundate cu formulele. Integrarea tabelelor existentă în checkout a fost păstrată și rafinată pentru escaping, pipe în cod, coloane și accesibilitate.

## Măsurători locale

| Indicator | Audit inițial | După reparații |
| --- | --- | --- |
| JavaScript obligatoriu la pornire, gzip | 666,02 KiB / 27 chunks | **642,58 KiB / 26 chunks** |
| CSS obligatoriu, gzip | 69,38 KiB | 69,42 KiB |
| Postări montate inițial în testul cu 100 postări | toate | **20**, apoi 40 după primul click |
| Iframe-uri înainte de activare, autoplay oprit | playere create anticipat | **0** în scenariul verificat |
| Player după activare și încărcarea lotului următor | recreare posibilă la patch | **1**, același nod DOM |

Reducerea JS este de 23,44 KiB, aproximativ 3,5%. Plafonul existent de regresie de 700 KiB nu a fost ridicat. **Ținta sub 600 KiB nu este încă atinsă.** Gzip și numărul nodurilor nu sunt măsurători FPS, CPU sau Core Web Vitals. Paginația limitează montarea inițială; DOM-ul crește când utilizatorul încarcă explicit alte loturi.

## Verificări

| Verificare | Rezultat |
| --- | --- |
| `npm run typecheck` | PASS, monorepo și Functions |
| `npm run build --workspace=packages/client-ui` | PASS, inclusiv Pages Worker |
| `npm run audit:production` | 23/23 PASS |
| `npm run audit:ux` | 5/5 PASS, verificări structurale |
| Vitest focalizat: conținut/media și lifecycle/settings/scroll | **88/88**, 9 fișiere |
| `node --test scripts/bundle-budget.test.mjs` | **4/4** |
| `node scripts/bundle-budget.mjs` | PASS față de plafonul existent de 700 KiB |
| Playwright selectat, Chromium/Firefox/WebKit/Mobile Chrome | **28/28**, două rulări finale consecutive |

Comanda E2E, din `packages/client-ui`:

```text
npx playwright test e2e/optimization-repairs.spec.ts e2e/functional-controls.spec.ts e2e/scroll-and-flicker.spec.ts e2e/chat-signature-visual.spec.ts --grep 'feed mounts|message append|optional pages|profile settings use|Scroll Stability|100-message'
```

Acoperă paginație/fațadă video/păstrare player, draft și noduri mesaje, încărcare opțională a paginilor, Settings, scroll feed/conversație și layout de 100 mesaje. Rulările intermediare au identificat instabilitatea înălțimilor feedului și restaurarea amânată a scrollului; acestea au fost reparate în implementare.

Nu s-a rulat întreaga suită de teste. Testul iframe folosește un răspuns HTML izolat pentru provider și dovedește instanțierea/păstrarea nodului, nu redarea efectivă pe YouTube. Mobile Chrome este emulare; tastatura nativă și Safari pe dispozitiv fizic nu sunt validate.

## Ce mai rămâne

1. Reducerea startup JS sub 600 KiB prin separarea altor instrumente opționale; verificarea latenței primei utilizări. Build-ul încă raportează importuri dinamice ineficiente pentru `client-state` și `indexed-db`.
2. Măsurarea CPU, layout și memorie pe același set de conținut și pe dispozitive mobile; evaluarea unei ferestre DOM pentru istoric foarte lung.
3. Audit vizual complet al tuturor paginilor și temelor, inclusiv contrast, modaluri, texte lungi și stări goale. Această continuare nu reprezintă un redesign complet.
4. Verificarea media externă reală și a tastaturii mobile native.
5. Publicare separată și verificare live a versiunii publicate. Rezultatele de mai sus nu confirmă o schimbare pe `urefy.com`.
