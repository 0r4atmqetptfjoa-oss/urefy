# Politică de Confidențialitate — Aetheris Omni-Sphere

**Conformă cu**: Regulamentul General privind Protecția Datelor (GDPR - Regulamentul UE 2016/679).  
**Data Intrării în Vigoare**: 4 Septembrie 2026

---

## 1. Principiul Fundamental: Privacy by Design & Zero Colectare Centralizată

Aetheris Omni-Sphere a fost proiectat de la zero pe principiul **minimizării radicale a datelor**:
- **Fără Creare de Conturi cu Date Personale**: Nu solicităm și nu stocăm adrese de email, numere de telefon, nume reale, date bancare sau parole.
- **Identitate Autonomă (Self-Sovereign Identity)**: Identitatea ta este reprezentată de o pereche de chei Ed25519 derivată local din fraza ta BIP-39. Cheia privată nu părăsește niciodată browserul tău.
- **Zero Cookie-uri de Urmărire**: Nu folosim cookie-uri de tracking, pixel tags, servicii de analiză a traficului de la terți (fără Google Analytics, fără Facebook Pixel). Toate setările de interfață sunt păstrate strict în `localStorage` local.

---

## 2. Ce Date Tehnice sunt Prelucrate?

### 2.1 Conținutul Public Publicat Voluntar
Orice mesaj, binar sau postare transmisă în canale publice devine vizibilă în rețeaua peer-to-peer. Nu include date cu caracter personal decât dacă alegi voluntar să le divulgi.

### 2.2 Conținutul Mesajelor Private (E2EE)
Mesajele directe sunt criptate cu algoritmul hibrid ML-KEM-768 + AES-256-GCM pe dispozitivul tău. Doar destinatarul deține cheia de decriptare. Releele intermediare văd doar date binare ininteligibile.

### 2.3 Date de Rețea (Adrese IP la Nivel de Releu)
Conexiunile WebSocket către relee implică în mod inerent adresa IP tehnică pentru rutarea pachetelor. Aceste adrese sunt păstrate exclusiv în memorie volatilă pentru protecția anti-DDoS (WAF honeypot) și nu sunt asociate cu identități reale sau comercializate terților.

---

## 3. Drepturile Utilizatorilor (GDPR Art. 15-22)

Conform GDPR, beneficiezi de dreptul de acces, rectificare, ștergere și portabilitate:
- **Portabilitate Totală**: Toate datele tale locale pot fi exportate oricând într-un pachet criptat din secțiunea *Export & Backup*.
- **Dreptul la Ștergere**: Ștergerea memoriei locale și a bazei IndexedDB din browser elimină instant toate datele de pe dispozitivul tău.

---

## 4. Contact pentru Protecția Datelor (DPO)

Pentru orice solicitare legată de protecția datelor sau confidențialitate:
- **Email**: `privacy@aetheris.network`
