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
            <div class="flex items-center space-x-2.5">
              <span class="text-lg">✨</span>
              <h2 class="text-sm font-bold text-white tracking-tight">
                Welcome to Aetheris Omni-Sphere — Sovereign Web Architecture
              </h2>
              <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyphr/20 text-cyphr font-bold border border-cyphr/40">
                100% P2P & ZERO-TRUST
              </span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">
              Experience the world's first hybrid platform combining end-to-end encrypted real-time relays, cryptographic knowledge vaults, and active Layer 7 cyber defense.
            </p>
          </div>

          <!-- 3 QUICK-ACTION DISCOVERY PILLS -->
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface-base/80 border border-white/10 text-xs font-mono text-slate-300">
              <span>💬</span>
              <span>1. TreeKEM MLS Chat</span>
            </div>
            <div class="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface-base/80 border border-white/10 text-xs font-mono text-slate-300">
              <span>📚</span>
              <span>2. Verified Releases</span>
            </div>
            <div class="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface-base/80 border border-white/10 text-xs font-mono text-slate-300">
              <span>🛡️</span>
              <span>3. Active WAF Defense</span>
            </div>

            <button 
              id="btn-dismiss-onboarding-tour"
              class="px-3.5 py-1.5 rounded-xl bg-cyphr hover:bg-cyphr/90 text-black font-bold text-xs shadow-lg shadow-cyphr/20 transition-all hover:scale-105 cursor-pointer ml-1"
            >
              Got It & Explore
            </button>
          </div>

        </div>
      </div>
    `;
  }
}

export const sovereignOnboarding = new SovereignOnboardingTour();
