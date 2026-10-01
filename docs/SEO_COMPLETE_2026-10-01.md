# UREfy — audit SEO complet și pagini publice rapide

## Domeniu și restricții

Continuarea auditului din 1 octombrie 2026. Verificarea privește reprezentarea publică a conținutului, accesibilitatea pentru crawlere și performanța paginilor de intrare. Utilizatorii, postările și comentariile existente nu sunt editate, șterse sau reclasificate. Nu sunt executate migrări, importuri sau seed-uri.

## Auditul inițial complet

- Au fost accesate toate cele **1.484 URL-uri** din sitemap: 13 pagini statice, 10 comunități, 230 postări și 1.231 profiluri.
- Toate răspund 200, au un canonical propriu, un H1, descriere, JSON-LD parsabil și metadate sociale coerente. Niciun URL din sitemap nu are noindex; nu există titluri de pagină duplicate.
- Au fost identificate **119 linkuri de autor către `/u/fct-...` care răspund 404**. Aceste ID-uri reprezintă contexte, nu profilurile publice acceptate de ruta `/u/`.
- O imagine Unsplash folosită de `post-silksong-switch2-launch-exclusive` răspunde 404. URL-ul original nu a fost înlocuit cu o imagine inventată și înregistrarea postării nu a fost modificată.
- Auditul tehnic nu certifică exactitatea afirmațiilor din conținut sau indexarea efectivă în Google.

## Performanța inițială măsurată

PageSpeed Insights, Lighthouse 13.5.0, 1 octombrie 2026, aproximativ 22:07 Europe/Bucharest, URL: `https://urefy.com/p/post-organic-1`.

| Indicator | Mobil | Desktop |
|---|---:|---:|
| Performance | 61 | 65 |
| FCP | 2,9 s | 0,6 s |
| LCP | 5,5 s | 0,8 s |
| Total Blocking Time | 440 ms | 760 ms |
| CLS | 0 | 0,012 |
| SEO | 100 | 100 |

Acestea sunt măsurători de laborator pentru un URL. PageSpeed nu oferă date de teren suficiente pentru Core Web Vitals; nu se afirmă validarea INP real sau a tuturor dispozitivelor.

## Corecții în cod

1. Postările, profilurile și comunitățile publice au o pagină de citire SSR care nu descarcă stylesheetul și modulele întregii aplicații. Conținutul rămâne vizibil fără JavaScript. Navigarea, linkurile de autor și recomandările sunt ancore HTML normale.
2. `?app=1` deschide interfața completă pentru răspunsuri, reacții și celelalte funcții. Canonical rămâne URL-ul public fără query. Nu există ramificații în funcție de User-Agent.
3. Paginile folosesc tipografie sans lizibilă, text de 17 px, conținut de maximum 76ch, titluri responsive, controale de minimum 44 px și focus vizibil. Media păstrează proporțiile conținutului în spațiul rezervat de 16:9 pentru a limita deplasarea layoutului.
4. Autorii primesc un link de profil numai când lookupul confirmă un profil public. Contextelor nelegate public li se păstrează numele fără linkuri false și fără expunerea identității principale. Aceeași regulă se aplică în JSON-LD și comentarii.
5. Comentariile DiscussionForumPosting folosesc `datePublished`, iar textul public din schemă este mai complet. HTML-ul Markdown este escapat; protocoalele executabile nu sunt acceptate în linkuri sau media. Titlurile Markdown pornesc de la H2 sub titlul paginii.
6. Sunt afișate imaginile originale și videourile disponibile, cu loading lazy pentru media secundară și iframes. Primul image are prioritate de încărcare. Nu sunt inventate date de publicare pentru VideoObject din videouri distribuite.
7. Metadatele sociale folosesc imaginile reale. Dimensiunile și tipul PNG de 1200×630 ale imaginii UREfy nu mai sunt atribuite automat fotografiilor externe sau avatarurilor.
8. ProfilePage include avatarul public și datele reale disponibile, fără date în viitor și fără handle-uri fabricate din fingerprint. Pagina vizibilă prezintă aceeași identitate publică.
9. Eliminat apelul de creare a tabelului de fixtures din handler-ele publice GET. Filtrele de vizibilitate și excludere fixtures sunt păstrate; tabelul existent nu este modificat.
10. Pagina arhivei și paginile informative standalone nu mai încarcă stylesheetul aplicației. Limbajul HTML al paginilor publice în engleză nu mai este suprascris de preferința locală de limbă a interfeței.
11. Fotografiile Unsplash au `srcset`/`sizes` responsive, cu variante de lățime și format negociat de CDN. Adresa originală, cropul și parametrii de atribuire rămân păstrați; nu sunt schimbate înregistrările postărilor. Se folosesc [transformările documentate de Unsplash](https://unsplash.com/documentation#dynamically-resizable-images).
12. Scorul Merit nu mai este prezentat în JSON-LD ca număr de LikeAction: un scor de vot nu certifică numărul de aprecieri. Contorul comentariilor rămâne, iar scorurile originale rămân vizibile în pagină.
13. Corectat contrastul etichetelor Media/Poll/More, numerelor subiectelor și textului secundar din onboarding, folosind tokenul semantic al temei active. Fontul rădăcinii readerului corespunde fontului textului, astfel încât unitatea `ch` din `sizes` are aceeași măsură.
14. Home păstrează un singur H1 și după încărcarea aplicației: introducerea devine H2 când antetul aplicației oferă deja H1. HTML-ul SSR păstrează H1 pentru vizitarea fără JavaScript. Introducerea include acum o ancoră directă către `/discussions`.

## Verificare înainte de publicare

- `npm run typecheck`: reușit.
- `npm run build --workspace=packages/client-ui`: reușit, inclusiv compilarea Functions.
- Preview: `https://7c463e4f.aetheris-omni-sphere.pages.dev`.
- Chrome: pagina de citire verificată desktop și la 390×844; fără overflow orizontal. CTA deschide postarea corectă în aplicația completă, cu comentariile și controalele originale. Nu a fost trimis niciun răspuns sau modificat vreun profil.
- Nu sunt rulate suite de teste unitare/E2E; verificările sunt audituri HTTP și inspecții manuale în browser.

## Limite rămase

- Indexarea, clasarea și citarea în căutările AI sunt decizii externe; eligibilitatea tehnică nu le garantează. Google documentează că funcțiile AI folosesc cerințele SEO obișnuite, fără fișier sau schemă specială obligatorie: [Google AI features](https://developers.google.com/search/docs/appearance/ai-features).
- Calitatea editorială a celor 37 titluri de forma `Load Post T...`, cele patru date de postare în viitor și imaginea externă 404 necesită decizii asupra datelor. Aceste date sunt păstrate conform instrucțiunii utilizatorului.
- Conținutul sondajelor, atașamentelor și citărilor complexe are un link explicit către aplicație; nu sunt inventate rezumate sau metadate media necunoscute.
- Activitățile interactive din aplicație și timpii reali pe dispozitive fizice sunt distincte de performanța paginilor publice de citire.
- **Pagina principală interactivă rămâne mai lentă:** ultima măsurare separată, la aproximativ 22:51, indică Performance 57 mobil / 64 desktop, LCP 5,4 s / 1,5 s și TBT 430 ms / 790 ms. Accessibility este 100 mobil / 94 desktop, iar SEO este 100 pe ambele. Măsurarea mobilă anterioară era 62; variația nu dovedește îmbunătățirea performanței Home. Grafurile JavaScript și CSS ale aplicației complete încă au resurse nefolosite la primul ecran. O reducere substanțială presupune separarea suplimentară a runtime-ului de interacțiune și verificarea fluxurilor sale; auditul de față nu certifică Home 100 sau aplicația completă optimizată integral.

## Publicare și audit live

- Commit inițial: `af0ea9c` — Optimize public reading pages and correct author and media SEO.
- Deploy în proiectul existent `aetheris-omni-sphere`, branch `main`: `https://cda9a2c6.aetheris-omni-sphere.pages.dev`.
- Commit pentru fotografii responsive: `1284f05`; publicare: `https://47167270.aetheris-omni-sphere.pages.dev`. Auditul integral GET/HEAD a fost repetat după această publicare cu aceleași rezultate.
- Commit pentru corectitudinea metadatelor și contrast: `a2cd99b`; publicare: `https://a1d13eb3.aetheris-omni-sphere.pages.dev`. Auditul integral GET/HEAD a fost repetat la 22:52, cu aceleași rezultate.
- Domeniul `https://urefy.com` verificat după publicare. Repository-ul nu are remote Git configurat; commitul este local și deploy-ul este direct prin Wrangler.
- Auditul integral după publicare: **1.484 GET 200 + 1.484 HEAD 200**, corp HEAD zero și robots identic cu GET pe toate paginile. Canonical, H1, descriere, indexability, JSON-LD și coerență socială: zero erori.
- Toate linkurile interne din HTML-ul auditat duc la pagini verificate. Cele 119 URL-uri false de profil nu mai sunt generate.
- **1.254 imagini sociale verificate**: 1.253 răspund ca imagini valide, una externă răspunde 404 (menționată mai sus). Sunt urmărite redirect-urile CDN pentru verificare.
- Paginile publice `/p/`, `/u/`, `/c/` din sitemap nu mai conțin scriptul modul al aplicației. Variantele explicite `?app=1` îl păstrează și au același canonical.
- Verificare suplimentară a celor șase postări goale: rămân 200/noindex. Ruta de mesaje rămâne noindex. URL-urile inexistente și pagina de arhivă invalidă rămân 404/noindex; HEAD păstrează statusul fără corp.
- Răspunsul postării reprezentative este identic octet cu octet între cererea normală și cererea cu User-Agent Googlebot. Acest control nu pretinde a fi o vizită reală Googlebot; validarea externă Google de mai jos este separată.
- Rich Results Test Google, smartphone: [postarea, reverificată la 22:51](https://search.google.com/test/rich-results/result?id=KNwR9oXr5qKNDHLEgUJKGw) are trei elemente valide (Article, Breadcrumb, DiscussionForumPosting); [profilul](https://search.google.com/test/rich-results/result?id=XjPNX3VoK55gTi35WW3PTQ) are un ProfilePage valid, verificat la 22:31. Aceste rezultate dovedesc accesul Google și eligibilitatea markupului, nu indexarea sau afișarea în rezultate.

### PageSpeed după publicare

Măsurători noi, același Lighthouse 13.5.0, aproximativ 22:30–22:51 Europe/Bucharest. Fotografia folosește ultima măsurare; scorurile de laborator pot varia între rulări.

| URL / indicator | Mobil | Desktop |
|---|---:|---:|
| `/p/post-organic-1` — Performance | **100** (înainte 61) | **100** (înainte 65) |
| LCP | **0,8 s** (înainte 5,5 s) | **0,2 s** (înainte 0,8 s) |
| TBT | **0 ms** (înainte 440 ms) | **0 ms** (înainte 760 ms) |
| CLS | **0** | **0** |
| Accessibility / Best Practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 |
| `/u/59b7b572c707` — Performance | **100** | **100** |
| Profil — LCP / TBT / CLS | 0,8 s / 0 ms / 0 | 0,2 s / 0 ms / 0 |
| Profil — Accessibility / Best Practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 |
| `/p/post-drm-piracy-superior-product` — Performance, înainte de srcset | 99 | 100 |
| Postare cu fotografie — LCP / TBT / CLS, înainte de srcset | 2,0 s / 0 ms / 0 | 0,5 s / 0 ms / 0 |
| Postare cu fotografie — Performance, după srcset, ultima măsurare | **99** | **100** |
| Postare cu fotografie — LCP / TBT / CLS, după srcset, ultima măsurare | **1,8 s / 0 ms / 0** | **0,5 s / 0 ms / 0** |

[Raportul postării reprezentative](https://pagespeed.web.dev/analysis/https-urefy-com-p-post-organic-1/qgk20pwbha?form_factor=mobile). Scorurile sunt pentru URL-urile măsurate, nu pentru toate paginile, toate temele sau interfața completă `?app=1`.

## Dovezi

Fișiere locale în `outputs/seo/2026-10-01/`: `baseline-complete.json`, `final-complete.json`, `final-responsive.json`, `final-production.json`, `final-samples.json`, logurile typecheck/build/deploy, rapoartele PageSpeed în text și capturile `reader-live.jpg`, `pagespeed-after-mobile.jpg`, `rich-results-post-final.jpg`, `rich-results-profile.jpg`. Ultimele măsurători foto sunt în `pagespeed-photo-final-mobile.txt` / `pagespeed-photo-final-desktop.txt`; Home este în `pagespeed-home-after-contrast-mobile.txt` / `pagespeed-home-after-contrast-desktop.txt`. Videoul YouTube real a fost verificat încărcat în pagina publică, fără erori console, cu link separat către sursa originală.
