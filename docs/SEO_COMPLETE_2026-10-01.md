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
5. Comentariile DiscussionForumPosting folosesc `datePublished`, iar textul public din schemă este mai complet. HTML-ul Markdown este escapate; protocoalele executabile nu sunt acceptate în linkuri sau media.
6. Sunt afișate imaginile originale și videourile disponibile, cu loading lazy pentru media secundară și iframes. Primul image are prioritate de încărcare. Nu sunt inventate date de publicare pentru VideoObject din videouri distribuite.
7. Metadatele sociale folosesc imaginile reale. Dimensiunile și tipul PNG de 1200×630 ale imaginii UREfy nu mai sunt atribuite automat fotografiilor externe sau avatarurilor.
8. ProfilePage include avatarul public și datele reale disponibile, fără date în viitor și fără handle-uri fabricate din fingerprint. Pagina vizibilă prezintă aceeași identitate publică.
9. Eliminat apelul de creare a tabelului de fixtures din handler-ele publice GET. Filtrele de vizibilitate și excludere fixtures sunt păstrate; tabelul existent nu este modificat.
10. Pagina arhivei și paginile informative standalone nu mai încarcă stylesheetul aplicației. Limbajul HTML al paginilor publice în engleză nu mai este suprascris de preferința locală de limbă a interfeței.

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

## Dovezi

Fișiere locale în `outputs/seo/2026-10-01/`: `baseline-complete.json`, logurile typecheck/build și preview deployment. Evidența publicării și verificărilor live este completată după deploy.
