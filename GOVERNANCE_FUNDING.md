# UREfy — Document de Decizie: Modele de Sustenabilitate și Finanțare Guvernată (GOVERNANCE_FUNDING)

> **Document de decizie de produs (RFC / Decision Memo)**  
> **Status:** În așteptarea deciziei umane a proprietarului de proiect  
> **Cod scris:** NICIUNUL (deliberat, conform cerințelor etice, legale și de custodie din Tichetul 4.8)

---

## 1. Context și Constrângeri Fundamentale

Platforma UREfy funcționează după principiul arhitectural suveran: **zero servere centrale dedicate, zero urmărire, zero monetizare prin vânzare de date**. 

Pentru a asigura sustenabilitatea pe termen lung fără a compromite aceste valori și fără a genera riscuri legale sau obligații de custodie financiară (MSB - Money Services Business, reglementări MiCA, licențiere custodială), prezentul document analizează opțiunile de finanțare și operare compatibile cu filozofia "sovereign".

---

## 2. Opțiuni de Arhitectură Economică și Finanțare

### Opțiunea A: Rețele de Relay-uri Găzduite de Comunitate (Community-Hosted Relays)
- **Concept:** Utilizatorii avansați sau comunitățile locale rulează propriile instanțe de `server-edge` și `daemon-archivist` (folosind Docker-ul containerizat din Tichetul 4.2).
- **Cost pentru proiect:** $0. Fiecare nod suportă propriile costuri de calcul/VPS (de obicei sub 5 EUR/lună sau hardware existent acasă).
- **Incentivare:** Reputație ZK Web-of-Trust (WoT) și rol de Guardian/Archivist în rețea.
- **Risc legal/custodie:** **ZERO**. Proiectul nu intermediază niciun flux monetar.

### Opțiunea B: Micro-Donații Transparente către Guardieni via DAO
- **Concept:** Donatorii pot trimite sprijin financiar direct către adresele publice verificate ale nodurilor Guardian sau contribuitorilor activi, fără intermediere centrală.
- **Mecanism propus:** 
  1. DAO afișează în `GovernanceDAO` propuneri de grant sau adresele publice ale operatorilor de relay verificat.
  2. Donatorul semnează tranzacția direct din propriul portofel (non-custodial, direct P2P).
  3. Platforma UREfy oferă doar verificarea identității criptografice (ZK attestation) și nu deține, nu atinge și nu transferă fonduri.
- **Risc legal/custodie:** **MINIM / NUL** — software-ul acționează strict ca un client software de prezentare de metadate publice, fără funcții de custodie sau escrow.

### Opțiunea C: Granturi Publice Non-Extractive (Public Goods Grants)
- **Surse identificate:** Gitcoin Grants, Optimism RetroPGF, Sovereign Tech Fund (Germania/UE), NLnet / NGI Zero.
- **Avantaj:** Finanțează direct echipele de dezvoltare și auditurile criptografice fără a introduce tokenomică speculativă sau costuri pentru utilizatorii finali.
- **Risc legal/custodie:** **ZERO**. Donații/granturi standard non-profit.

---

## 3. Matrice Comparativă pentru Decizia Proprietarului

| Criteriu | Opțiunea A (Community Relays) | Opțiunea B (Micro-donații DAO) | Opțiunea C (Granturi Publice) |
| :--- | :--- | :--- | :--- |
| **Complexitate tehnică** | Foarte redusă (deja suportată prin Docker) | Medie (interfață P2P non-custodială) | Nulă în cod (proces administrativ) |
| **Risc de custodie/MiCA** | 0% | 0% (complet non-custodial) | 0% |
| **Autonomie utilizator** | Maximă (descentralizare completă) | Ridicată | Neutră |
| **Sustenabilitate financiară** | Distrbuită la nivel de comunitate | Directă către operatori | Centralizată pentru core contributors |

---

## 4. Recomandare & Următorii Pași

1. **Pasul 1 (Imediat):** Adoptarea Opțiunii A (promovarea rulării de relay-uri comunitare prin Docker) ca model de bază pentru descentralizarea infrastructurii.
2. **Pasul 2:** Aplicarea la programe de granturi pentru tehnologii suverane (NLnet / NGI Zero) pentru audituri de securitate independente.
3. **Pasul 3 (Necesită decizie explicită):** Dacă proprietarul de proiect aprobă Opțiunea B, se va redacta o specificație strictă pentru afișarea adreselor non-custodiale în cadrul profilului de Guardian, fără a integra niciun mecanism de plată în codul clientului până la finalizarea analizei juridice.
