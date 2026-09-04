/**
 * Aetheris Sovereign First-Time Onboarding & Quick-Start Tour
 * 
 * Provides an intuitive, breathable 3-step discovery banner for new users
 * to understand the platform immediately without cognitive overload.
 */

export class SovereignOnboardingTour {
  private isDismissed: boolean = false;
  private readonly storageKey = 'aetheris_onboarding_completed_v4';

  constructor() {
    if (typeof localStorage !== 'undefined') {
      this.isDismissed = localStorage.getItem(this.storageKey) === 'true';
    }
  }

  public shouldShow(): boolean {
    return !this.isDismissed;
  }

  public dismiss(): void {
    this.isDismissed = true;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, 'true');
    }
  }

  public reset(): void {
    this.isDismissed = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }

  public renderWelcomeBanner(): string {
    if (!this.shouldShow()) return '';

    return `
      <div id="sovereign-onboarding-banner" class="mx-4 sm:mx-6 my-4 p-5 rounded-2xl bg-gradient-to-r from-aether/15 via-cyphr/10 to-surface-raised border border-cyphr/30 shadow-2xl relative overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
        
        <!-- GLOW ACCENT DECORATION -->
        <div class="absolute -right-12 -top-12 w-48 h-48 bg-cyphr/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          
          <div class="space-y-1.5 max-w-2xl">
            <div class="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <span class="text-lg">✨</span>
              <h2 class="text-sm font-bold text-white tracking-tight">
                Welcome to Aetheris Omni-Sphere — Comunicare & Date cu adevărat private
              </h2>
              <span 
                class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyphr/20 text-cyphr font-bold border border-cyphr/40 cursor-help"
                title="Arhitectură tehnică: 100% P2P, Zero-Trust, fără servere centrale intermediare"
              >
                🔒 100% Privat & Sigur
              </span>
            </div>
            <p class="text-xs text-slate-200 leading-relaxed font-sans">
              <strong class="text-white font-semibold">Mesajele tale nu pot fi citite de nimeni altcineva</strong>, iar <strong class="text-white font-semibold">fișierele tale rămân doar la tine</strong>. Fără companii mari care să-ți urmărească activitatea sau să-ți colecteze datele.
            </p>
          </div>

          <!-- 3 QUICK-ACTION DISCOVERY PILLS (SIMPLE BENEFITS + TECHNICAL TOOLTIPS) -->
          <div class="flex flex-wrap items-center gap-2">
            <div 
              class="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface-base/80 border border-white/10 text-xs font-sans text-slate-200 cursor-help transition-colors hover:border-cyphr/40 hover:bg-surface-raised"
              title="Mesajele tale nu pot fi citite de nimeni altcineva · Specificație tehnică: TreeKEM MLS Chat E2EE"
            >
              <span>💬</span>
              <span>1. Mesaje Confidențiale</span>
            </div>
            <div 
              class="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface-base/80 border border-white/10 text-xs font-sans text-slate-200 cursor-help transition-colors hover:border-cyphr/40 hover:bg-surface-raised"
              title="Fișierele tale rămân doar la tine, stocate criptat și verificate matematic · Specificație tehnică: Merkle Tree Verified Releases"
            >
              <span>📁</span>
              <span>2. Fișiere în Siguranță</span>
            </div>
            <div 
              class="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface-base/80 border border-white/10 text-xs font-sans text-slate-200 cursor-help transition-colors hover:border-cyphr/40 hover:bg-surface-raised"
              title="Protecție automată la nivel de dispozitiv împotriva spam-ului · Specificație tehnică: Active WAF Defense & ZK-RLN"
            >
              <span>🛡️</span>
              <span>3. Protecție Automată</span>
            </div>

            <!-- CUM FUNCȚIONEAZĂ (DETALII TEHNICE MODAL/TOGGLE) -->
            <button
              type="button"
              id="btn-onboarding-how-it-works"
              onclick="const el = document.getElementById('onboarding-tech-specs'); if(el) el.classList.toggle('hidden');"
              class="px-2.5 py-1.5 rounded-xl bg-surface-base/60 hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/10 text-[11px] font-mono transition-all cursor-pointer flex items-center space-x-1"
              title="Vezi detaliile tehnice complete ale arhitecturii Aetheris"
            >
              <span>ℹ️</span>
              <span>Cum funcționează?</span>
            </button>

            <button 
              id="btn-dismiss-onboarding-tour"
              class="px-3.5 py-1.5 rounded-xl bg-cyphr hover:bg-cyphr/90 text-black font-bold text-xs shadow-lg shadow-cyphr/20 transition-all hover:scale-105 cursor-pointer ml-1"
            >
              Am înțeles & Explorează
            </button>
          </div>

        </div>

        <!-- COLLAPSIBLE TECHNICAL SPECIFICATIONS PANEL ("CUM FUNCȚIONEAZĂ") -->
        <div id="onboarding-tech-specs" class="hidden mt-3 pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] font-mono text-slate-300 relative z-10 animate-in fade-in duration-200">
          <div class="p-2.5 rounded-xl bg-surface-base/90 border border-white/5">
            <span class="text-cyphr font-bold block mb-1">🔐 TreeKEM MLS Chat</span>
            Protocol modern de mesagerie de grup cu ratcheting criptografic continuu. Niciun intermediar nu are acces la cheile de decriptare.
          </div>
          <div class="p-2.5 rounded-xl bg-surface-base/90 border border-white/5">
            <span class="text-emerald-400 font-bold block mb-1">📚 Merkle Vault & 100% P2P</span>
            Fișiere distribuite direct între noduri prin WebTorrent și WebRTC. Integritate verificată cu arbori Merkle pe 4 nivele.
          </div>
          <div class="p-2.5 rounded-xl bg-surface-base/90 border border-white/5">
            <span class="text-indigo-400 font-bold block mb-1">🛡️ Active WAF & Zero-Trust</span>
            Filtrare Layer 7 la nivel de browser împotriva injectării de cod, cu dovezi cu cunoștințe nule (ZK-RLN) pentru limitarea spam-ului.
          </div>
        </div>
      </div>
    `;
  }
}

export const sovereignOnboarding = new SovereignOnboardingTour();
