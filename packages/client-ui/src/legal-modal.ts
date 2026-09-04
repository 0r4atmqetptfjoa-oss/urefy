/**
 * Aetheris Sovereign Legal & Compliance Modal Component
 * Displays Terms of Service, GDPR Privacy Policy, and EU Digital Services Act (DSA) Compliance.
 */

import { serviceRegistry, SERVICES } from './service-registry.js';
import { clientStore } from './client-state.js';

export type LegalTab = 'terms' | 'privacy' | 'dsa';

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

  public open(tab: LegalTab = 'terms'): void {
    this._isOpen = true;
    this._activeTab = tab;
    if (typeof window !== 'undefined' && (window as any).clientStore) {
      (window as any).clientStore.notifySync();
    }
  }

  public close(): void {
    this._isOpen = false;
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

  public render(): string {
    if (!this._isOpen) return '';

    return `
      <div id="legal-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
        <div class="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-surface-base border border-white/10 shadow-2xl overflow-hidden font-sans text-xs">
          
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface-raised/80">
            <div class="flex items-center space-x-3">
              <span class="text-xl">⚖️</span>
              <div>
                <h3 class="font-bold text-sm text-white tracking-wide">Cadru Legal, Termeni & Confidențialitate</h3>
                <p class="text-[11px] text-slate-400">Conformitate UE: Regulamentul Digital Services Act (DSA) & GDPR</p>
              </div>
            </div>
            <button
              type="button"
              onclick="if(window.__aetheris_close_legal) window.__aetheris_close_legal();"
              class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          <!-- Navigation Tabs -->
          <div class="flex border-b border-white/10 bg-black/40 px-6 space-x-2 pt-2">
            <button
              type="button"
              onclick="if(window.__aetheris_set_legal_tab) window.__aetheris_set_legal_tab('terms');"
              class="px-4 py-2 font-semibold transition-all border-b-2 cursor-pointer ${
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
              class="px-4 py-2 font-semibold transition-all border-b-2 cursor-pointer ${
                this._activeTab === 'privacy'
                  ? 'border-cyan-400 text-cyan-300 bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }"
            >
              🛡️ Confidențialitate (GDPR)
            </button>
            <button
              type="button"
              onclick="if(window.__aetheris_set_legal_tab) window.__aetheris_set_legal_tab('dsa');"
              class="px-4 py-2 font-semibold transition-all border-b-2 cursor-pointer ${
                this._activeTab === 'dsa'
                  ? 'border-cyan-400 text-cyan-300 bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }"
            >
              🚩 Moderare & Notice & Takedown (DSA)
            </button>
          </div>

          <!-- Body Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-4 text-slate-300 text-xs leading-relaxed font-sans select-text">
            ${this._renderTabContent()}
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-surface-raised/50 font-mono text-[11px]">
            <span class="text-slate-400">Aetheris Sovereign Protocol · Open Source AS-IS</span>
            <button
              type="button"
              onclick="if(window.__aetheris_close_legal) window.__aetheris_close_legal();"
              class="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer"
            >
              Am înțeles
            </button>
          </div>

        </div>
      </div>
    `;
  }

  private _renderTabContent(): string {
    switch (this._activeTab) {
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
            <h4 class="font-bold text-sm text-white">1. Principiul Zero-Data & Fără Urmărire</h4>
            <p>Platforma nu solicită și nu colectează nume reale, adrese de email, parole sau numere de telefon. Nu există trackere de la terți, Google Analytics sau cookie-uri de profilare comercială.</p>

            <h4 class="font-bold text-sm text-white">2. Criptare Hibridă Post-Cuantică (E2EE)</h4>
            <p>Comunicațiile directe sunt criptate cu ML-KEM-768 și AES-256-GCM. Niciun operator de nod, furnizor de cloud sau entitate externă nu poate citi mesajele dumneavoastră private.</p>

            <h4 class="font-bold text-sm text-white">3. Dreptul la Ștergere și Portabilitate</h4>
            <p>Aveți control total asupra datelor: ștergerea bazei IndexedDB locale elimină complet datele din browser. Puteți exporta arhiva completă oricând din secțiunea Export & Backup.</p>
          </div>
        `;
      case 'dsa':
        return `
          <div class="space-y-3">
            <h4 class="font-bold text-sm text-white">1. Procedura de Notificare și Eliminare (DSA Art. 16)</h4>
            <p>Conform Regulamentului UE privind Serviciile Digitale (DSA 2022/2065), orice utilizator sau titular de drepturi poate semnala conținut ilegal sau vătămător prin butonul <strong>🚩 Raportează</strong> prezent pe fiecare postare publică.</p>

            <h4 class="font-bold text-sm text-white">2. Contact Punct Unic de Legătură UE</h4>
            <p>Pentru autoritățile de aplicare a legii și de reglementare din statele membre UE: <code>legal@aetheris.network</code>. Termenul standard de procesare a notificărilor este de maximum 24 de ore.</p>

            <h4 class="font-bold text-sm text-white">3. Decizii de Moderare Descentralizată</h4>
            <p>Conținutul declarat ilegal este revocat din nodurile de releu publice și raportat în Jurnalul Public de Transparență al DAO-ului de guvernare.</p>
          </div>
        `;
    }
  }
}

export const legalModal = new LegalModal();
serviceRegistry.registerInstance(SERVICES.LegalModal, legalModal);

// Global window bindings
if (typeof window !== 'undefined') {
  (window as any).legalModal = legalModal;
  (window as any).__aetheris_open_legal = (tab: LegalTab = 'terms') => legalModal.open(tab);
  (window as any).__aetheris_close_legal = () => legalModal.close();
  (window as any).__aetheris_set_legal_tab = (tab: LegalTab) => legalModal.setTab(tab);
}
