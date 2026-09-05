/**
 * Aetheris Sovereign Legal & Compliance Modal Component
 * Displays Terms of Service, GDPR Privacy Policy, and EU Digital Services Act (DSA) Compliance.
 */

import { serviceRegistry, SERVICES } from './service-registry.js';
import { clientStore } from './client-state.js';

export type LegalTab = 'about' | 'terms' | 'privacy' | 'rules' | 'dsa' | 'contact';

export class LegalModal {
  private _isOpen: boolean = false;
  private _activeTab: LegalTab = 'terms';

  public get isOpen(): boolean {
    return this._isOpen;
  }

  public isOpenModal(): boolean {
    return this._isOpen;
  }

  public get activeTab(): LegalTab {
    return this._activeTab;
  }

  public getActiveTab(): LegalTab {
    return this._activeTab;
  }

  private _targetPostId: string = '';
  private _reportSubmittedId: string = '';
  private _isSubmittingReport: boolean = false;
  private _reportError: string = '';

  public get targetPostId(): string {
    return this._targetPostId;
  }

  public open(tab: LegalTab = 'terms', targetId: string = ''): void {
    this._isOpen = true;
    this._activeTab = tab;
    if (targetId) {
      this._targetPostId = targetId;
    }
    this._reportSubmittedId = '';
    this._reportError = '';
    if (typeof window !== 'undefined' && (window as any).clientStore) {
      (window as any).clientStore.notifySync();
    }
  }

  public close(): void {
    this._isOpen = false;
    this._targetPostId = '';
    this._reportSubmittedId = '';
    this._reportError = '';
    if (typeof window !== 'undefined' && (window as any).clientStore) {
      (window as any).clientStore.notifySync();
    }
  }

  public setTab(tab: LegalTab): void {
    this._activeTab = tab;
    if (typeof window !== 'undefined' && (window as any).clientStore) {
      (window as any).clientStore.notifySync();
    }
  }

  public async submitDsaReport(formData?: { targetId: string; reason: string; details: string; email?: string }): Promise<any> {
    this._isSubmittingReport = true;
    this._reportError = '';

    let payload = formData;
    if (!payload && typeof document !== 'undefined') {
      const targetInput = document.getElementById('dsa-target-id') as HTMLInputElement | null;
      const reasonSelect = document.getElementById('dsa-reason-select') as HTMLSelectElement | null;
      const detailsInput = document.getElementById('dsa-details') as HTMLTextAreaElement | null;
      const emailInput = document.getElementById('dsa-reporter-email') as HTMLInputElement | null;

      payload = {
        targetId: targetInput?.value.trim() || this._targetPostId || 'unknown',
        reason: reasonSelect?.value.trim() || 'OTHER_ILLEGAL',
        details: detailsInput?.value.trim() || '',
        email: emailInput?.value.trim() || undefined,
      };
    }

    if (!payload || !payload.targetId) {
      this._reportError = 'Specifică identificatorul conținutului raportat.';
      this._isSubmittingReport = false;
      if (typeof window !== 'undefined' && (window as any).clientStore) (window as any).clientStore.notifySync();
      return null;
    }

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: payload.targetId,
          targetType: 'post',
          reason: payload.reason,
          details: payload.details,
          reporterEmail: payload.email,
          reporterFingerprint: (window as any)?.clientStore?.currentIdentity?.fingerprint || 'anonymous',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        this._reportSubmittedId = data.reportId;
        this._isSubmittingReport = false;
        if (typeof window !== 'undefined' && (window as any).clientStore) {
          (window as any).clientStore.showToast?.('🚩 Sesizare DSA transmisă către echipa legală și nodurile rețelei.', 'success');
          (window as any).clientStore.notifySync();
        }
        return data;
      } else {
        this._reportError = data?.error || 'Eroare la trimiterea sesizării.';
        this._isSubmittingReport = false;
        if (typeof window !== 'undefined' && (window as any).clientStore) (window as any).clientStore.notifySync();
        return null;
      }
    } catch (err: any) {
      this._reportError = err?.message || 'Eroare de rețea.';
      this._isSubmittingReport = false;
      if (typeof window !== 'undefined' && (window as any).clientStore) (window as any).clientStore.notifySync();
      return null;
    }
  }

  public render(): string {
    if (!this._isOpen) return '';

    return `
      <div id="legal-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
        <div class="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-2xl bg-surface-base border border-white/10 shadow-2xl overflow-hidden font-sans text-xs">
          
          <!-- Header -->
          <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-surface-raised/80">
            <div class="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
              <span class="text-lg sm:text-xl shrink-0">⚖️</span>
              <div class="min-w-0">
                <h3 class="font-bold text-xs sm:text-sm text-white tracking-wide truncate">Cadru Legal, Termeni & Confidențialitate</h3>
                <p class="text-[10px] sm:text-[11px] text-slate-400 truncate">Conformitate UE: Regulamentul DSA (2022/2065) & GDPR</p>
              </div>
            </div>
            <button
              type="button"
              onclick="if(window.__aetheris_close_legal) window.__aetheris_close_legal();"
              class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          <!-- Navigation Tabs -->
          <div class="flex overflow-x-auto border-b border-white/10 bg-black/40 px-3 sm:px-6 space-x-1 pt-1.5 sm:pt-2 no-scrollbar scroll-smooth" style="-webkit-overflow-scrolling: touch;">
            <button
              type="button"
              onclick="if(window.__aetheris_set_legal_tab) window.__aetheris_set_legal_tab('about');"
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                this._activeTab === 'about'
                  ? 'border-cyan-400 text-cyan-300 bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }"
            >
              ℹ️ Despre Noi
            </button>
            <button
              type="button"
              onclick="if(window.__aetheris_set_legal_tab) window.__aetheris_set_legal_tab('terms');"
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                this._activeTab === 'terms'
                  ? 'border-cyan-400 text-cyan-300 bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }"
            >
              📜 Termeni și Condiții
            </button>
            <button
              type="button"
              onclick="if(window.__aetheris_set_legal_tab) window.__aetheris_set_legal_tab('privacy');"
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                this._activeTab === 'privacy'
                  ? 'border-cyan-400 text-cyan-300 bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }"
            >
              🛡️ Confidențialitate (GDPR)
            </button>
            <button
              type="button"
              onclick="if(window.__aetheris_set_legal_tab) window.__aetheris_set_legal_tab('rules');"
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                this._activeTab === 'rules'
                  ? 'border-cyan-400 text-cyan-300 bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }"
            >
              ⚖️ Reguli & Moderare
            </button>
            <button
              type="button"
              onclick="if(window.__aetheris_set_legal_tab) window.__aetheris_set_legal_tab('dsa');"
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                this._activeTab === 'dsa'
                  ? 'border-cyan-400 text-cyan-300 bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }"
            >
              <span>🚩</span>
              <span class="hidden sm:inline">Notice & Takedown (DSA)</span>
              <span class="sm:hidden">Raportează (DSA)</span>
            </button>
            <button
              type="button"
              onclick="if(window.__aetheris_set_legal_tab) window.__aetheris_set_legal_tab('contact');"
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                this._activeTab === 'contact'
                  ? 'border-cyan-400 text-cyan-300 bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }"
            >
              📬 Contact UE
            </button>
          </div>

          <!-- Body Content -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-300 text-xs leading-relaxed font-sans select-text">
            ${this._renderTabContent()}
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-white/10 bg-surface-raised/50 font-mono text-[10px] sm:text-[11px]">
            <span class="text-slate-400 truncate mr-2">© 2026 Aetheris · EU DSA Compliant</span>
            <button
              type="button"
              onclick="if(window.__aetheris_close_legal) window.__aetheris_close_legal();"
              class="px-3 sm:px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer shrink-0"
            >
              Închide
            </button>
          </div>

        </div>
      </div>
    `;
  }

  private _renderTabContent(): string {
    switch (this._activeTab) {
      case 'about':
        return `
          <div class="space-y-4">
            <div class="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 space-y-1.5">
              <h4 class="font-bold text-sm text-cyan-300">Ce este Aetheris Omni-Sphere?</h4>
              <p class="text-slate-300">
                Aetheris este o platformă descentralizată suverană de comunicare și schimb de cunoștințe, proiectată pe principii criptografice avansate (Zero-Knowledge proofs, criptografie post-cuantică hibridă ML-KEM-768 și rețele mesh peer-to-peer WebRTC).
              </p>
            </div>

            <div class="space-y-3">
              <h5 class="font-bold text-xs text-white">1. Arhitectură Non-Custodială & Fără Baze de Date Centrale de Identitate</h5>
              <p>Spre deosebire de rețelele sociale tradiționale, Aetheris nu stochează datele tale de identitate pe servere centrale. Identitatea este generată pe dispozitivul tău sub forma unei perechi de chei asimetrice Ed25519. Tu ești unicul deținător al cheilor tale.</p>

              <h5 class="font-bold text-xs text-white">2. Transparență Algoritmică & Cod Deschis (Open Source)</h5>
              <p>Întregul cod sursă este auditat și transparent. Nu există algoritmi opaci de recomandare gândiți pentru dependență comportamentală sau monetizare din publicitate.</p>

              <h5 class="font-bold text-xs text-white">3. Tehnologie Europeană & Suveranitate Digitală</h5>
              <p>Platforma respectă pe deplin directivele europene privind suveranitatea datelor, drepturile fundamentale ale utilizatorilor la viață privată și libertatea de exprimare responsabilă.</p>
            </div>
          </div>
        `;
      case 'terms':
        return `
          <div class="space-y-3">
            <h4 class="font-bold text-sm text-white">1. Arhitectura Rețelei și Responsabilitatea Identității</h4>
            <p>Aetheris Omni-Sphere operează exclusiv pe baza identificatorilor criptografici Ed25519 autogestionați. Fiecare utilizator controlează integral propria cheie privată stocată pe dispozitivul local.</p>
            
            <h4 class="font-bold text-sm text-white">2. Conținutul Public și Semnăturile Criptografice</h4>
            <p>Toate articolele, mesajele din canale deschise și fișierele din Seif sunt semnate digital de către autor. Autorul este unicul răspunzător legal pentru conținutul semnat și distribuit în rețea.</p>

            <h4 class="font-bold text-sm text-white">3. Conținut Interzis în Mod Absolut</h4>
            <p>Sunt interzise categoric: materialele de exploatare a minorilor (CSAM), terorismul, instigarea la ură/violență, malware-ul și programele malițioase. Încălcările atrag raportarea imediată și izolarea automată prin ZK-RLN Slashing.</p>
          </div>
        `;
      case 'privacy':
        return `
          <div class="space-y-3">
            <div class="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-1">
              <span class="text-[10px] font-mono uppercase text-emerald-400 font-bold">Declarație de Conformitate GDPR (Regulamentul UE 2016/679)</span>
              <p class="text-slate-300">Aetheris aplică conceptul de <em>Privacy by Design and by Default</em> (Art. 25 GDPR). Nu colectăm date cu caracter personal.</p>
            </div>
            <h4 class="font-bold text-sm text-white">1. Principiul Zero-Data & Fără Urmărire</h4>
            <p>Platforma nu solicită și nu colectează nume reale, adrese de email, parole sau numere de telefon. Nu există trackere de la terți, Google Analytics sau cookie-uri de profilare comercială.</p>

            <h4 class="font-bold text-sm text-white">2. Criptare Hibridă Post-Cuantică (E2EE)</h4>
            <p>Comunicațiile directe sunt criptate cu ML-KEM-768 și AES-256-GCM. Niciun operator de nod, furnizor de cloud sau entitate externă nu poate citi mesajele dumneavoastră private.</p>

            <h4 class="font-bold text-sm text-white">3. Dreptul la Ștergere și Portabilitate</h4>
            <p>Aveți control total asupra datelor: ștergerea bazei IndexedDB locale elimină complet datele din browser. Puteți exporta arhiva completă oricând din secțiunea Export & Backup.</p>
          </div>
        `;
      case 'rules':
        return `
          <div class="space-y-3">
            <div class="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20 space-y-1">
              <span class="text-[10px] font-mono uppercase text-amber-400 font-bold">Politica de Moderare și Transparență conform Art. 14 DSA</span>
              <p class="text-slate-300">Această secțiune descrie clar regulile comunității, măsurile tehnice de protecție și procedurile aplicabile conținutului semnalat.</p>
            </div>

            <h4 class="font-bold text-sm text-white">1. Criterii de Conținut și Categorii Incompatibile</h4>
            <ul class="list-disc pl-5 space-y-1 text-slate-300">
              <li><strong>Zero toleranță pentru CSAM și terorism:</strong> conținutul semnalat este eliminat necondiționat, iar amprentele sunt izolate.</li>
              <li><strong>Distribuire de fișiere malițioase (Malware):</strong> executabilele încărcate în Seif sunt scanate euristic pentru semnături de împachetare malițioasă (UPX packere, secțiuni cu entropie suspectă) prin modulul Binary Hygiene.</li>
              <li><strong>Spam și atacuri de tip Sybil:</strong> rețeaua folosește provocări Proof-of-Work (PoW) și limitare cu cunoștință nulă (ZK-RLN) pentru a împiedica flood-ul automat.</li>
            </ul>

            <h4 class="font-bold text-sm text-white">2. Procedura de Acțiune și Soluționare</h4>
            <p>Sesizările primite prin mecanismul de notificare sunt analizate de moderatori în termen de maximum 24-48 de ore. În cazul în care o postare încalcă regulile, aceasta este retrasă din feed-ul public și marcată în registrul de transparență D1.</p>

            <h4 class="font-bold text-sm text-white">3. Dreptul la Contestație (Art. 20 DSA)</h4>
            <p>Dacă considerați că o măsură de moderare (eliminare sau marcare) a fost aplicată eronat conținutului dumneavoastră, puteți trimite o cerere de reexaminare către <code class="text-cyan-300">legal@aetheris.network</code> sau <code class="text-cyan-300">love4jpx@gmail.com</code>, indicând identificatorul postării.</p>
          </div>
        `;
      case 'dsa':
        return `
          <div class="space-y-4">
            <div class="p-3.5 rounded-xl bg-surface-raised/40 border border-white/5 space-y-2">
              <h4 class="font-bold text-xs text-white flex items-center space-x-2">
                <span>⚖️</span>
                <span>Procedura de Notificare și Eliminare (DSA Art. 16)</span>
              </h4>
              <p class="text-[11px] text-slate-400">
                Conform Regulamentului UE privind Serviciile Digitale (DSA 2022/2065), orice utilizator sau titular de drepturi poate semnala conținut ilegal sau vătămător. Punct unic de contact UE: <code class="text-cyan-300">legal@aetheris.network</code>.
              </p>
            </div>

            ${this._reportSubmittedId ? `
              <div class="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 text-center animate-in fade-in">
                <span class="text-3xl">✅</span>
                <h4 class="font-bold text-sm text-emerald-400">Sesizare Înregistrată cu Succes</h4>
                <p class="text-[11px] text-slate-300">
                  Număr de înregistrare DSA: <code class="px-2 py-0.5 rounded bg-black/40 text-emerald-300 font-mono">${this._reportSubmittedId}</code>
                </p>
                <p class="text-[11px] text-slate-400">
                  Sesizarea a fost stocată în registrul Cloudflare D1 și transmisă responsabililor legali.
                </p>
                <button
                  type="button"
                  onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('dsa');"
                  class="px-4 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Trimite altă sesizare
                </button>
              </div>
            ` : `
              <form id="dsa-report-form" onsubmit="event.preventDefault(); if(window.__aetheris_submit_dsa_report) window.__aetheris_submit_dsa_report();" class="space-y-3 bg-black/30 p-4 rounded-xl border border-white/5">
                <div class="font-bold text-xs text-white">Formular Oficial de Notificare Conținut Ilegal (Notice & Takedown)</div>

                <div>
                  <label for="dsa-target-id" class="block text-[11px] text-slate-400 mb-1">Identificator Conținut (ID Postare / Fișier) *</label>
                  <input
                    type="text"
                    id="dsa-target-id"
                    value="${this._targetPostId || ''}"
                    placeholder="Ex: post-1 sau hash-ul fișierului..."
                    required
                    class="w-full bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label for="dsa-reason-select" class="block text-[11px] text-slate-400 mb-1">Motivul Notificării (Categorie Legală) *</label>
                  <select
                    id="dsa-reason-select"
                    class="w-full bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-xs font-sans text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="CSAM">1. Exploatare / Abuz Asupra Minorilor (CSAM)</option>
                    <option value="TERRORISM">2. Terorism / Conținut Extremist Violent</option>
                    <option value="HATE_SPEECH">3. Discurs de Ură / Instigare la Discriminare și Violență</option>
                    <option value="COPYRIGHT">4. Încălcare Proprietate Intelectuală / Drepturi de Autor</option>
                    <option value="MALWARE_PHISHING">5. Programe Malițioase, Malware, Phishing sau Exploit-uri</option>
                    <option value="DEFAMATION_DOXXING">6. Defăimare, Doxxing sau Încălcare Date cu Caracter Personal</option>
                    <option value="OTHER_ILLEGAL">7. Alt Conținut Ilegal conform Legislației UE / Naționale</option>
                  </select>
                </div>

                <div>
                  <label for="dsa-details" class="block text-[11px] text-slate-400 mb-1">Descriere Detaliată a Conținutului Ilegal (Art. 16 DSA) *</label>
                  <textarea
                    id="dsa-details"
                    rows="3"
                    placeholder="Descrieți motivele concrete pentru care considerați că informațiile constituie conținut ilegal..."
                    class="w-full bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-xs font-sans text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  ></textarea>
                </div>

                <div>
                  <label for="dsa-reporter-email" class="block text-[11px] text-slate-400 mb-1">Email Notificare Decizie (Opțional conform DSA Art. 16)</label>
                  <input
                    type="email"
                    id="dsa-reporter-email"
                    placeholder="nume@exemplu.com (dacă doriți comunicarea deciziei de moderare)"
                    class="w-full bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-xs font-sans text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                ${this._reportError ? `
                  <div class="text-[11px] text-rose-400 font-semibold">${this._reportError}</div>
                ` : ''}

                <div class="pt-2 flex justify-end">
                  <button
                    type="submit"
                    id="btn-submit-dsa-report"
                    ${this._isSubmittingReport ? 'disabled' : ''}
                    class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    ${this._isSubmittingReport ? 'Se transmite sesizarea...' : '🚩 Transmite Sesizare DSA către Moderatori'}
                  </button>
                </div>
              </form>
            `}
          </div>
        `;
      case 'contact':
        return `
          <div class="space-y-4">
            <div class="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-1.5">
              <h4 class="font-bold text-sm text-indigo-300">Puncte Unice de Contact (Single Point of Contact - SPOC)</h4>
              <p class="text-slate-300">
                În conformitate cu Articolul 11 (autorități publice) și Articolul 12 (destinatari ai serviciului) din Regulamentul (UE) 2022/2065 (DSA) și Directiva privind comerțul electronic 2000/31/CE:
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="p-3.5 rounded-xl bg-surface-raised border border-white/5 space-y-2">
                <span class="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span>🏛️</span>
                  <span>Pentru Autoritățile din Statele Membre UE & Comisia Europeană (Art. 11)</span>
                </span>
                <p class="text-[11px] text-slate-400">Punct de contact desemnat pentru comunicarea oficială:</p>
                <div class="font-mono text-xs text-cyan-300 bg-black/40 p-2 rounded-lg border border-white/5 break-all">
                  legal@aetheris.network
                </div>
                <p class="text-[10px] text-slate-500">Limbi de comunicare acceptate: Română, Engleză.</p>
              </div>

              <div class="p-3.5 rounded-xl bg-surface-raised border border-white/5 space-y-2">
                <span class="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span>👥</span>
                  <span>Pentru Utilizatori & Destinatari ai Serviciului (Art. 12)</span>
                </span>
                <p class="text-[11px] text-slate-400">Pentru asistență, contestații și clarificări legale:</p>
                <div class="font-mono text-xs text-cyan-300 bg-black/40 p-2 rounded-lg border border-white/5 break-all">
                  legal@aetheris.network<br>
                  <span class="text-slate-400 text-[10px]">Punct secundar: love4jpx@gmail.com</span>
                </div>
                <p class="text-[10px] text-slate-500">Timp mediu de răspuns: 24 - 48 ore.</p>
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-surface-base border border-white/5 space-y-1.5">
              <h5 class="font-bold text-xs text-white">Mențiuni Legale / Identificare Furnizor (Impressum)</h5>
              <p class="text-slate-400 text-[11px]">
                Serviciul digital Aetheris Omni-Sphere este operat ca protocol suveran descentralizat pe infrastructura globală Anycast Cloudflare Pages & Edge Workers, cu baze de date stocate securizat pe Cloudflare D1.
              </p>
            </div>
          </div>
        `;
      default:
        return '';
    }
  }
}

export const legalModal = new LegalModal();
serviceRegistry.registerInstance(SERVICES.LegalModal, legalModal);

// Global window bindings
if (typeof window !== 'undefined') {
  (window as any).legalModal = legalModal;
  (window as any).__aetheris_open_legal = (tab: LegalTab = 'terms', targetId: string = '') => legalModal.open(tab, targetId);
  (window as any).__aetheris_close_legal = () => legalModal.close();
  (window as any).__aetheris_set_legal_tab = (tab: LegalTab) => legalModal.setTab(tab);
  (window as any).__aetheris_submit_dsa_report = () => legalModal.submitDsaReport();
}
