# UREfy — recuperare portabila

Pachetul `urefy-portable-recovery-*.json` este criptat integral cu parola aleasa de proprietar (scrypt N=131072, r=8, p=1; AES-256-GCM). Contine cheia RSA de infrastructura, envelope-ul cheii AES de backup, snapshotul D1 complet si cele doua fisiere R2 din snapshotul verificat. Nu depinde de Windows DPAPI. Parola nu este in pachet, in proiect sau in Google Drive. Pastreaz-o separat.

## Pe alt calculator

1. Descarca pachetul criptat si `urefy-recovery-tools.zip` din dosarul privat Drive. Verifica SHA256 fata de certificatul de verificare pastrat in proiect/Drive.
2. Extrage utilitarele intr-un dosar separat. Foloseste Node.js oficial, versiunea 22.17 sau mai noua; toate bibliotecile sunt incluse in Node, fara `npm install`.
3. Din acel dosar ruleaza `node portable-recovery-open.mjs "cale-absoluta-catre-pachet.json"`.
4. Deschide adresa `http://127.0.0.1:...` afisata de program si introdu parola local. Nu o pune in linia de comanda, variabile de mediu sau chat.
5. Verificarea decripteaza si restaureaza toate tabelele intr-o baza SQLite in memorie, verifica fiecare rand, indecsii/schema, integritatea SQLite si toate partile fisierelor. Nu foloseste AWS/Cloudflare si nu scrie date personale decriptate pe disc.

Verificarea independenta functioneaza fara profilul Windows original, acces AWS sau chei IAM. Cheile E2EE ale utilizatorilor raman numai la utilizatori; DM-urile si Vault-ul din snapshot raman criptate cu cheile lor originale.

## Restaurare operationala

Acest kit verifica si furnizeaza materialul criptat de recuperare. Pentru restaurare in productie, pregateste mai intai o baza D1 si bucketuri R2 de recuperare separate, verifica schema, tabelele si metadatele obiectelor, apoi planifica explicit comutarea aplicatiei. Nu folosi vechiul `restoreBackup` pentru manifestul complet 2.0.0: acel endpoint suporta numai cele cinci tabele legacy si poate suprascrie date. Nu comuta DNS/originul si nu restaura peste productia existenta ca test.

Google Drive pastreaza o copie punctuala a snapshotului verificat si cheia de recuperare. Snapshoturile zilnice noi sunt in S3; nu exista sincronizare automata Drive/OAuth. Cheia din kit poate deschide backupuri viitoare criptate cu aceeasi cheie de infrastructura. Reexporta un pachet dupa modificarea cheii sau pentru o copie actualizata de date.

## Acoperire si limite

Sunt incluse toate tabelele de aplicatie descoperite in D1, schema, secventele AUTOINCREMENT si continutul/metadata obiectelor din STORAGE_BUCKET si VAULT_BUCKET. Prefixele de arhive backups/ si dr/ sunt excluse ca sa nu se copieze recursiv backupurile. KV este cache, iar starea temporara a relay-ului DO si cheile client-only nu fac parte din acest snapshot.

Captura D1 foloseste un batch read-only tranzactional. Inventarul si versiunile R2 sunt reverificate; nu exista snapshot atomic comun intre D1 si R2. Limitele curente ale jobului sincron sunt 12 MiB pentru baza/manifest, 20.000 randuri pe tabel, 100 tabele, 200 obiecte, 128 MiB de fisiere si parti de 4 MiB. Depasirea limitelor produce eroare, nu un backup partial declarat reusit. La cresterea datelor este necesar un job paginat/resumabil.
