# UREfy Messages — Chat Signature Design Pass

24 septembrie 2026 · versiune publicată pe [urefy.com](https://urefy.com/)

## Rezultat

Conversațiile directe și comunitare folosesc un canvas mineral cald, două benzi de dialog și mesaje obișnuite fără bule sau carduri. Identitatea fără avatar real are o inițială neutră și un mic facet amber. Acțiunile sunt contextuale; Capsule, media, vocea și postările distribuite rămân obiecte distincte. Nu au fost modificate criptografia, protocolul DM sau serviciile backend.

Am eliminat numele și orele fictive din navigarea comunității. Un mesaj vocal `.webm` este acum recunoscut prin tipul `audio/webm`, fără să mai intre în prezentarea video.

## Iterații vizuale

| Iterație | Ce am verificat | Capturi |
| --- | --- | --- |
| 1 — eliminarea suprafețelor grele | conversație comunitară, desktop și mobil | [desktop](../packages/client-ui/artifacts/chat-signature/iteration-1-community-desktop.png), [mobil](../packages/client-ui/artifacts/chat-signature/iteration-1-community-mobile.png) |
| 2 — benzi, tipografie, ritm | conversație directă cu 100 de mesaje | [desktop](../packages/client-ui/artifacts/chat-signature/iteration-2-direct-desktop.png), [mobil](../packages/client-ui/artifacts/chat-signature/iteration-2-direct-mobile.png) |
| 3 — identitate, artefacte, mobil | capturile finale de mai jos | [desktop direct](../packages/client-ui/artifacts/chat-signature/direct-desktop-dense.png), [mobil direct](../packages/client-ui/artifacts/chat-signature/direct-mobile-dense.png) |

## Matricea finală de capturi

| Desktop | Mobil |
| --- | --- |
| [Direct — 100 mesaje](../packages/client-ui/artifacts/chat-signature/direct-desktop-dense.png) | [Direct — 100 mesaje](../packages/client-ui/artifacts/chat-signature/direct-mobile-dense.png) |
| [Comunitate — 100 mesaje, 4 participanți](../packages/client-ui/artifacts/chat-signature/community-desktop-dense.png) | [Comunitate — 100 mesaje](../packages/client-ui/artifacts/chat-signature/community-mobile-dense.png) |
| [Direct — stare goală](../packages/client-ui/artifacts/chat-signature/direct-desktop-empty.png) | [Emoji sheet](../packages/client-ui/artifacts/chat-signature/emoji-sheet-mobile.png) |
| [Context Capsule](../packages/client-ui/artifacts/chat-signature/context-capsule-desktop.png) · [creator](../packages/client-ui/artifacts/chat-signature/capsule-creator-desktop.png) | [Creator Capsule](../packages/client-ui/artifacts/chat-signature/capsule-mobile.png) |
| [Context Shelf](../packages/client-ui/artifacts/chat-signature/context-shelf-desktop.png) | [Acțiuni mesaj](../packages/client-ui/artifacts/chat-signature/message-actions-mobile.png) |
| [Căutare](../packages/client-ui/artifacts/chat-signature/search-desktop.png) | [Răspuns](../packages/client-ui/artifacts/chat-signature/reply-mobile.png) |
| [Mesaj vocal](../packages/client-ui/artifacts/chat-signature/voice-message-desktop.png) | [Composer focalizat](../packages/client-ui/artifacts/chat-signature/composer-focused-mobile.png) |

Capturile sunt dintr-un fixture local cu mesaje sintetice. În Chromium headless, focalizarea composerului poate fi verificată, dar tastatura nativă a telefonului nu poate fi capturată; ultima imagine nu reprezintă o tastatură OS deschisă. Fișierul audio din fixture nu are durată reală și afișează `0:00`; prezentarea lui este verificată, redarea nu.

## Verificare

- TypeScript și build de producție: trecute.
- 223 fișiere de teste unitare, 2.564 teste: trecute.
- Playwright Chromium: testul cu 100 de mesaje și fluxul privat complet în două sesiuni au trecut. Fluxul privat include trimitere, răspuns, ramură, reacție, căutare și Vault.
- JavaScript inițial: 589,22 KiB gzip, sub plafonul de 600 KiB.
- Publicarea Cloudflare Pages a reușit; HTML-ul de pe `urefy.com` servește hashurile noului bundle și noului CSS, cu răspuns HTTP 200.

Rămâne de verificat pe un telefon fizic comportamentul tastaturii native și al apăsării prelungite.
