/**
 * Aetheris Sovereign Legal & Regulatory Footer Component
 * Provides comprehensive EU Digital Services Act (DSA), GDPR, and eCommerce Directive
 * compliant navigation, point-of-contact info, community guidelines, and legal disclosures.
 */

import { t } from './i18n.js';

export class LegalFooter {
  /**
   * Renders the full multi-column EU compliant footer.
   * Can be placed at the bottom of the feed or content pages.
   */
  public renderGlobalLegalFooter(): string {
    return `
      <footer id="aetheris-global-footer" class="mt-12 pt-8 pb-10 border-t border-white/10 bg-surface-base/80 text-xs font-sans text-slate-400">
        <div class="max-w-6xl mx-auto px-4 sm:px-6">
          
          <!-- Top Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            
            <!-- Col 1: Platform & Architecture -->
            <div class="space-y-3">
              <div class="flex items-center space-x-2">
                <span class="text-xl">Æ</span>
                <span class="font-bold text-sm text-white tracking-wide">AETHERIS OMNI-SPHERE</span>
              </div>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                Protocol suveran descentralizat de comunicare și cunoaștere. Arhitectură non-custodială bazată pe identități criptografice Ed25519 și criptare post-cuantică hibridă.
              </p>
              <div class="flex items-center space-x-2 pt-1">
                <span class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-cyan-300">v1.0.0 Stable</span>
                <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">Edge Anycast</span>
              </div>
            </div>

            <!-- Col 2: Conformitate & Legal UE -->
            <div class="space-y-2.5">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <span>⚖️</span>
                <span>Conformitate UE & Legal</span>
              </h4>
              <ul class="space-y-1.5 text-[11px]">
                <li>
                  <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('terms');" class="hover:text-cyan-300 transition-colors text-left cursor-pointer flex items-center space-x-1">
                    <span>📜</span>
                    <span>Termeni și Condiții de Utilizare</span>
                  </button>
                </li>
                <li>
                  <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('privacy');" class="hover:text-cyan-300 transition-colors text-left cursor-pointer flex items-center space-x-1">
                    <span>🛡️</span>
                    <span>Confidențialitate & GDPR (UE 2016/679)</span>
                  </button>
                </li>
                <li>
                  <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('rules');" class="hover:text-cyan-300 transition-colors text-left cursor-pointer flex items-center space-x-1">
                    <span>⚖️</span>
                    <span>Regulament & Moderare (Art. 14 DSA)</span>
                  </button>
                </li>
                <li>
                  <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('dsa');" class="hover:text-rose-400 font-medium transition-colors text-left cursor-pointer flex items-center space-x-1">
                    <span>🚩</span>
                    <span>Raportează Conținut Ilegal (Art. 16 DSA)</span>
                  </button>
                </li>
                <li>
                  <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('contact');" class="hover:text-cyan-300 transition-colors text-left cursor-pointer flex items-center space-x-1">
                    <span>📬</span>
                    <span>Puncte Unice de Contact (Art. 11/12)</span>
                  </button>
                </li>
              </ul>
            </div>

            <!-- Col 3: Navigare & Resurse Tehnice -->
            <div class="space-y-2.5">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <span>🌐</span>
                <span>Platformă & Transparență</span>
              </h4>
              <ul class="space-y-1.5 text-[11px]">
                <li>
                  <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('about');" class="hover:text-cyan-300 transition-colors text-left cursor-pointer flex items-center space-x-1">
                    <span>ℹ️</span>
                    <span>Despre Arhitectura Aetheris</span>
                  </button>
                </li>
                <li>
                  <button type="button" onclick="if(window.__aetheris_open_governance) window.__aetheris_open_governance();" class="hover:text-cyan-300 transition-colors text-left cursor-pointer flex items-center space-x-1">
                    <span>🏛️</span>
                    <span>Guvernanță Descentralizată DAO</span>
                  </button>
                </li>
                <li>
                  <button type="button" onclick="if(window.networkObservatory) window.networkObservatory.open();" class="hover:text-cyan-300 transition-colors text-left cursor-pointer flex items-center space-x-1">
                    <span>📡</span>
                    <span>Observator Rețea & Slashing Radar</span>
                  </button>
                </li>
                <li>
                  <button type="button" onclick="if(window.__aetheris_open_cve) window.__aetheris_open_cve();" class="hover:text-cyan-300 transition-colors text-left cursor-pointer flex items-center space-x-1">
                    <span>🛡️</span>
                    <span>Monitor Vulnerabilități & CVE</span>
                  </button>
                </li>
                <li>
                  <button type="button" onclick="if(window.__aetheris_open_export) window.__aetheris_open_export();" class="hover:text-cyan-300 transition-colors text-left cursor-pointer flex items-center space-x-1">
                    <span>💾</span>
                    <span>Export Date & Backup Local</span>
                  </button>
                </li>
              </ul>
            </div>

            <!-- Col 4: Certificate de Conformitate & Privacy -->
            <div class="space-y-2.5">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <span>🛡️</span>
                <span>Garanții de Securitate</span>
              </h4>
              <div class="space-y-2 text-[10px] font-mono">
                <div class="p-2 rounded-lg bg-black/40 border border-white/5 flex items-center space-x-2">
                  <span class="text-base">🇪🇺</span>
                  <div>
                    <div class="font-bold text-white">EU Digital Services Act</div>
                    <div class="text-slate-400">Regulamentul (UE) 2022/2065</div>
                  </div>
                </div>

                <div class="p-2 rounded-lg bg-black/40 border border-white/5 flex items-center space-x-2">
                  <span class="text-base">🍪</span>
                  <div>
                    <div class="font-bold text-white">Zero Tracking Cookies</div>
                    <div class="text-slate-400">0 cookie-uri de profilare comercială</div>
                  </div>
                </div>

                <div class="p-2 rounded-lg bg-black/40 border border-white/5 flex items-center space-x-2">
                  <span class="text-base">🔐</span>
                  <div>
                    <div class="font-bold text-white">ML-KEM-768 + Ed25519</div>
                    <div class="text-slate-400">Criptografie Hibridă Post-Cuantică</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Bottom Notice & Contact -->
          <div class="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              © 2026 Aetheris Omni-Sphere · Protocol suveran cu sursă deschisă (Open Source AS-IS). Dezvoltat în deplină conformitate cu standardele europene de transparență digitală și protecție a datelor.
            </div>
            <div class="flex items-center space-x-3 shrink-0">
              <span class="text-slate-400">Punct Unic UE:</span>
              <a href="mailto:legal@aetheris.network" class="text-cyan-400 hover:underline font-mono">legal@aetheris.network</a>
              <span>·</span>
              <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('dsa');" class="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[10px] font-bold cursor-pointer transition-colors">
                🚩 Raportează Conținut
              </button>
            </div>
          </div>

        </div>
      </footer>
    `;
  }

  /**
   * Renders the compact legal widget for the bottom of the right rail sidebar.
   */
  public renderSidebarLegalSnippet(): string {
    return `
      <div id="sidebar-legal-snippet" class="p-3 text-[11px] text-slate-500 font-sans border-t border-white/5 space-y-2 bg-surface-base/40">
        <div class="flex flex-wrap gap-x-2 gap-y-1 text-slate-400">
          <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('about');" class="hover:text-cyan-300 cursor-pointer">${t('footer.about', undefined, 'Despre noi')}</button>
          <span>•</span>
          <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('terms');" class="hover:text-cyan-300 cursor-pointer">${t('footer.terms', undefined, 'Termeni')}</button>
          <span>•</span>
          <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('privacy');" class="hover:text-cyan-300 cursor-pointer">${t('footer.privacy', undefined, 'Confidențialitate')}</button>
          <span>•</span>
          <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('rules');" class="hover:text-cyan-300 cursor-pointer">${t('footer.rules', undefined, 'Reguli')}</button>
          <span>•</span>
          <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('dsa');" class="hover:text-rose-400 font-semibold cursor-pointer">${t('footer.dsa', undefined, 'Raportează abuz')}</button>
          <span>•</span>
          <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('contact');" class="hover:text-cyan-300 cursor-pointer">${t('footer.contact', undefined, 'Contact')}</button>
        </div>

        <div class="text-[10px] text-slate-500 flex items-center justify-between">
          <span>${t('footer.copyright', undefined, '© 2026 Aetheris')} · EU DSA Compliant</span>
          <span class="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-mono">0 Trackers</span>
        </div>
      </div>
    `;
  }

  /**
   * Renders the complete, beautifully arranged footer bar spanning the bottom of the page.
   * Eliminates the empty void and centers all EU legal & informational links.
   */
  public renderBottomStatusBar(activeDownloadName?: string | null, activeDownloadProgress?: number): string {
    return `
      <footer id="app-bottom-bar" class="hidden lg:flex h-9 sm:h-11 border-t border-white/10 bg-[#08090d] px-2 sm:px-6 items-center justify-between text-xs font-sans text-slate-400 shrink-0 select-none z-30 shadow-2xl relative">
        
        <!-- LEFT: BRAND & SECURITY STATUS -->
        <div class="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          <div class="flex items-center space-x-1 sm:space-x-1.5 font-bold text-white tracking-wide">
            <span class="w-5 h-5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-[10px] sm:text-[11px] text-indigo-400 font-mono">Æ</span>
            <span class="hidden sm:inline text-xs">AETHERIS</span>
          </div>
          <span class="text-slate-600 hidden sm:inline">•</span>
          <span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold hidden md:inline-flex items-center space-x-1" title="0 cookie-uri de urmărire">
            <span>🍪</span>
            <span>0 Trackers</span>
          </span>
          <span class="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono font-bold hidden xl:inline-flex items-center space-x-1" title="Criptografie Post-Cuantică hibridă">
            <span>🔒</span>
            <span>TreeKEM E2EE</span>
          </span>
          ${activeDownloadName ? `
            <span class="text-slate-600">•</span>
            <span class="text-signal animate-pulse font-bold text-[10px] font-mono">⬇ ${activeDownloadName}: ${activeDownloadProgress}%</span>
          ` : ''}
        </div>

        <!-- CENTER: ARANJATE FRUMOS ÎN JOSUL PAGINII (DESPRE, TERMENI, CONFIDENȚIALITATE, REGULI, RAPORTEAZĂ, CONTACT) -->
        <nav class="flex items-center justify-center space-x-1 sm:space-x-2 text-[11px] sm:text-xs font-sans mx-1 sm:mx-2 overflow-x-auto no-scrollbar scroll-smooth" style="-webkit-overflow-scrolling: touch;" aria-label="EU Legal and Regulatory Footer Navigation">
          <button
            type="button"
            onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('about');"
            class="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap font-medium"
            title="Despre Aetheris Omni-Sphere, arhitectură descentralizată și cod deschis"
          >
            <span>ℹ️</span>
            <span class="hidden sm:inline">${t('footer.about', undefined, 'Despre noi')}</span>
            <span class="sm:hidden">${t('footer.about', undefined, 'Despre')}</span>
          </button>

          <span class="text-slate-700">•</span>

          <button
            type="button"
            onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('terms');"
            class="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap font-medium"
            title="Termeni și Condiții de Utilizare conform reglementărilor UE"
          >
            <span>📜</span>
            <span>${t('footer.terms', undefined, 'Termeni')}</span>
          </button>

          <span class="text-slate-700">•</span>

          <button
            type="button"
            onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('privacy');"
            class="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap font-medium"
            title="Politica de Confidențialitate conform GDPR (Regulamentul UE 2016/679)"
          >
            <span>🛡️</span>
            <span class="hidden md:inline">${t('footer.privacy', undefined, 'Confidențialitate')} (GDPR)</span>
            <span class="md:hidden">${t('footer.gdpr', undefined, 'GDPR')}</span>
          </button>

          <span class="text-slate-700 hidden sm:inline">•</span>

          <button
            type="button"
            onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('rules');"
            class="hidden sm:flex px-2.5 py-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer items-center space-x-1.5 whitespace-nowrap font-medium"
            title="Regulament Comunitate & Politică de Moderare (Art. 14 DSA)"
          >
            <span>⚖️</span>
            <span>${t('footer.rules', undefined, 'Reguli')}</span>
          </button>

          <span class="text-slate-700">•</span>

          <button
            type="button"
            onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('dsa');"
            class="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap font-bold shadow-sm"
            title="Mecanism oficial de Notificare și Eliminare Conținut Ilegal (Art. 16 DSA)"
          >
            <span>🚩</span>
            <span class="hidden sm:inline">${t('footer.dsa', undefined, 'Raportează conținut')}</span>
            <span class="sm:hidden">${t('footer.dsa', undefined, 'Raportează')}</span>
          </button>

          <span class="text-slate-700 hidden md:inline">•</span>

          <button
            type="button"
            onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('contact');"
            class="hidden md:flex px-2.5 py-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer items-center space-x-1.5 whitespace-nowrap font-medium"
            title="Puncte Unice de Contact conform Art. 11 și 12 DSA & Directiva eCommerce"
          >
            <span>📬</span>
            <span>${t('footer.contact', undefined, 'Contact')}</span>
          </button>
        </nav>

        <!-- RIGHT: COPYRIGHT 2026 & EU COMPLIANCE BADGE -->
        <div class="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          <span class="px-2 py-0.5 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold hidden lg:inline-flex items-center space-x-1.5" title="Regulamentul (UE) 2022/2065 privind Serviciile Digitale">
            <span>🇪🇺</span>
            <span>EU DSA Compliant</span>
          </span>
          <span class="text-slate-400 text-[11px] sm:text-xs font-mono font-medium whitespace-nowrap">${t('footer.copyright', undefined, '© 2026 Aetheris')}</span>
          <span class="text-slate-600 hidden sm:inline">•</span>
          <span class="text-signal flex items-center space-x-1 text-xs font-mono font-bold">
            <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="hidden sm:inline text-emerald-400">${t('common.online', undefined, 'Operațional')}</span>
          </span>
        </div>

      </footer>
    `;
  }

  /**
   * Renders clickable quick links for the bottom status bar (legacy fallback).
   */
  public renderStatusBarLegalSnippet(): string {
    return `
      <div class="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
        <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('about');" class="hover:text-cyan-300 transition-colors cursor-pointer">ℹ️ ${t('footer.about', undefined, 'Despre')}</button>
        <span>•</span>
        <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('terms');" class="hover:text-cyan-300 transition-colors cursor-pointer">📜 ${t('footer.terms', undefined, 'Termeni')}</button>
        <span>•</span>
        <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('privacy');" class="hover:text-cyan-300 transition-colors cursor-pointer">🛡️ ${t('footer.gdpr', undefined, 'GDPR')}</button>
        <span>•</span>
        <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('rules');" class="hover:text-cyan-300 transition-colors cursor-pointer">⚖️ ${t('footer.rules', undefined, 'Reguli')}</button>
        <span>•</span>
        <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('dsa');" class="hover:text-rose-400 transition-colors cursor-pointer font-bold">🚩 ${t('footer.dsa', undefined, 'Raportează')}</button>
        <span>•</span>
        <button type="button" onclick="if(window.__aetheris_open_legal) window.__aetheris_open_legal('contact');" class="hover:text-cyan-300 transition-colors cursor-pointer">📬 ${t('footer.contact', undefined, 'Contact')}</button>
      </div>
    `;
  }
}

export const legalFooter = new LegalFooter();
