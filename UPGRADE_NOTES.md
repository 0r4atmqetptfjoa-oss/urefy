# Upgrade tehnic si UI

## Publicare UREfy - 2026-09-08

- Domeniu productie: https://urefy.com/.
- Pages: ramura `main`, deployment `1c4ca2f5`; versiunea servita de domeniu corespunde manifestului buildului local.
- Worker relay: versiunea `7b596a06-bf9b-4136-a86f-e2e29afafd07`, cu raspuns live HTTP 200 / healthy.
- Migrarile DM si DAO au fost aplicate live prin sapte comenzi SQL aditive. Nu s-au sters date si nu s-a executat export D1.
- Checkpoint D1 anterior migrarilor: `00000067-00000000-000050e0-a97b262503275bcfba8b6e231a2ad338`. Nu se restaureaza automat: ar putea elimina scrieri legitime ulterioare.
- Numele public, textele, onboardingul, metadatele, contactele si capturile PWA folosesc UREfy. Mesajele utilizatorilor nu sunt rescrise.
- Numele resurselor Cloudflare existente, cheile locale, pachetele interne si identificatorii protocolului sunt pastrati pentru compatibilitatea datelor si a infrastructurii. Nu reprezinta brandingul public.
- Verificari live: pagina, health, analytics si channels trec smoke; messages raspunde HTTP 200; DM si DAO refuza cereri nesemnate cu 401; DAO autentificat raspunde 200.

## Consolidare verificata la 2026-09-08

- Cursorul emoji rezista la blur, inputuri recreate si evenimente de selectie intarziate. Testul browser forteaza rerandarea intre selectie si inserare.
- Butoanele avansate RSS, CVE, Gossip, Backup si DAO deschid modalul propriu. Observatory nu mai deschide graful de incredere. Deschiderea/inchiderea repetata este testata.
- Mesageria privata foloseste plicuri semnate si criptare hibrida; doua sesiuni browser schimba mesaje prin handlerul real si SQLite. Istoricul nu este scris in clar in localStorage sau D1.
- DAO-ul de productie foloseste propuneri D1 si voturi semnate. O identitate are un singur vot modificabil; expirarea este verificata in operatia SQL. Voturile sunt consultative, nu anonime, nu rezistente la identitati multiple si nu executa schimbari automat.
- Walletul foloseste ethers pentru verificarea semnaturilor si este incarcat la cerere. Nu exista cont conectat sau semnatura fabricate cand providerul lipseste.
- Brandingul nu mai rescrie mesajele, atributele sau textele utilizatorilor.
- RSS nu mai genereaza articole la prima pornire in browser. Hashtagurile sunt numarate din postarile incarcate. Scorul fix de reputatie si metricile fixe de comunitate au fost eliminate din suprafetele remediate.
- Importul granular verifica checksumul inainte de scrieri si refuza chei arbitrare, identitati legacy si mesaje care ar ajunge in clar in localStorage. Recuperarea identitatii foloseste arhiva criptata; mesajele private au transcripturi semnate separate.
- Recuperarea sociala nu mai creeaza gardieni cu chei private derivabile din identificatori publici. Gardienii trebuie adaugati cu cheia publica completa; mnemonic-ul este verificat fata de identitatea activa.
- Recuperarea sociala si din PNG asteapta salvarea identitatii. Parolele, fragmentele si payloadurile temporare sunt eliminate din modal la inchidere; URL-urile temporare sunt revocate.
- Workerul PWA primeste lista modulelor obligatorii din manifestul buildului si o versiune de cache bazata pe continut. Pornirea offline dupa prima vizita, pastrarea identitatii si absenta endpointurilor private din cache sunt verificate in browser.
- Shortcuturile PWA folosesc rute reale; iconul iOS este PNG, iar metadatele sociale folosesc un URL PNG absolut si canonical explicit.

Verificari: 2.345 de teste unitare/integrate si de script trecute. Cele 22 de scenarii Chromium trec folosind aplicatia servita de domeniul de productie; testele de schimb DM si de vot DAO intercepteaza cererile catre handleri reali cu SQLite izolat, fara continut demonstrativ in baza live. Separat, citirea DAO autentificata si verificarile API live au trecut. Toate cele 23 de reguli euristice ale auditului existent trec; aceasta nu este o certificare de securitate.

Migrarile `0007_direct_messages.sql` si `0008_governance.sql` sunt validate local si aplicate live. Workerul si Pages sunt publicate. Nu s-a facut commit. Exportul D1 cu indisponibilitate a ramas anulat conform optiunii utilizatorului.

## Implementat

- Vite 8.2.2 cu Rolldown/Oxc, Vitest 5.0.0 si TypeScript 7.0.2.
- Playwright 1.63 si Wrangler 4.129 declarate explicit, nu descarcate implicit la build.
- Node 24 LTS in CI/Docker si `.nvmrc`; mediul local verificat foloseste Node 22.17.
- Build in ordinea biblioteci comune, backend, client. Typecheck include functiile Cloudflare.
- PostCSS/Tailwind rezolva configuratia relativ la pachet, inclusiv pornirea din radacina monorepo-ului.
- Mesajele nu mai pot suprascrie alt mesaj prin reutilizarea ID-ului. Conflictele primesc HTTP 409.
- Interogarile mesajelor folosesc schema D1 snake_case; parametrii de paginare invalidi primesc HTTP 400.
- Teste de integrare pentru mesaje executate pe SQLite real, nu doar pe simularea D1.
- Corectii de tipuri in analytics, storage si WebAuthn fara dezactivarea verificarilor stricte.
- Selector Standard / Focus / Split, cu preferinta locala si sincronizare la Escape.
- Header fara navigatie duplicata pe desktop, cautare mai larga si panouri laterale compacte.
- Mesaje fara randuri goale provenite din indentarea HTML; newline-urile utilizatorului sunt pastrate.
- Controale tactile stabile de minimum 44 px in headerul mobil si layout verificat la 360, 390 si 768 px.
- Actiuni push explicite; optiunea Later inchide invitatia si este respectata dupa reload.
- Smoke-checker cu timeout, validare JSON si headere, esec explicit la erori; CI nu mai raporteaza succes dupa endpointuri defecte.

## Performanta

- Pornire obligatorie: 549,04 KiB JavaScript gzip in 18 chunkuri si 34,38 KiB CSS gzip.
- Extragerea walletului/ethers la cerere a redus incarcarea initiala de la aproximativ 651 la 549 KiB gzip.
- `npm run audit:bundle` impune plafonul de 600 KiB gzip pentru toate modulele obligatorii de bootstrap si dependentele lor statice, nu doar pentru entrypoint.
- Modulele dinamice obligatorii sunt incluse; numai functiile optionale sunt excluse. Cheile cu hash ale manifestului sunt rezolvate prin referintele sale reale. Obiectivul de 300 KiB pentru intregul startup nu este inca atins.
- Grupurile vechi `manualChunks` au fost inlocuite cu API-ul `codeSplitting`, fara includerea recursiva fortata a modulelor optionale.

## Verificare

```sh
npm run typecheck
npm test
npm run build
npm run audit:bundle
npm run audit:production
```

Regresiile noi de browser ruleaza in CI pe buildul de productie. Pentru un server deja pornit, seteaza `PLAYWRIGHT_TEST_BASE_URL`, apoi ruleaza din pachetul client:

```sh
npm run test:e2e -- premium-workspace.spec.ts functional-controls.spec.ts push-banner.spec.ts private-messaging.spec.ts governance-live.spec.ts pwa-runtime.spec.ts brand-release.spec.ts --project=chromium
```

Testele de layout folosesc erori API controlate, iar testele DM si DAO folosesc handleri reali si SQLite izolat. Nu sunt teste end-to-end ale infrastructurii Cloudflare live.

## Limite si urmatoarele etape

- Publicarea Cloudflare si smoke live sunt realizate. Nu a fost facut commit sau audit criptografic independent. Nu exista o garantie de zero buguri sau unicitate pe piata.
- CI este configurat pentru Node 24; containerele Docker necesita in continuare validare in mediul lor tinta.
- Lucide 1 si ethers 6 sunt integrate. Tailwind 4 si noble 2 necesita etape separate de compatibilitate vizuala, API si protocol.
- Mai sunt necesare verificarea adminului live, validarea completa a relay-urilor de grup, inventarierea altor indicatoare de protocol/telemetrie si curatarea strict identificata a datelor demonstrative istorice.
- Exportul granular legacy nu este un substitut pentru arhiva criptata de recuperare. Colectionarea tuturor categoriilor direct din starea activa necesita consolidare suplimentara.
- Instalarea efectiva pe dispozitive fizice si aprobarile MetaMask reale nu au fost validate. Controalele browser si emularea mobila nu echivaleaza cu aceste verificari.
- Exista inca multe importuri eager in client si un chunk UI mare. Urmatorul pas de performanta este separarea pe fluxuri, nu cosmetizarea dimensiunii entrypoint-ului.
- Auditul de productie existent contine verificari statice euristice. Cele 23 de porti nu reprezinta o certificare de securitate.
- Setul E2E nou acopera Chromium, desktop si viewports mobile/tableta. Suita E2E veche si rularea completa Firefox/WebKit necesita o etapa separata.
- Pentru diferentiere de produs: prioritizare ulterioara a unui flux verificabil discutie -> artefact -> provenienta -> arhiva, cu stari reale si teste de integrare, inainte de adaugarea altor panouri decorative.