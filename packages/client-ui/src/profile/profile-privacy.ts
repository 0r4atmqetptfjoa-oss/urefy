/**
 * @file profile-privacy.ts
 * @package @aetheris/client-ui/profile
 * @description Privacy, Progressive Disclosure & Trust filtering settings renderer.
 */

import { UserProfileData } from './types.js';
import { clientStore } from '../client-state.js';

export function renderProfilePrivacyHTML(profile: UserProfileData): string {
  const currentMode = clientStore?.uiMode || 'simple';

  return `
    <div class="space-y-5" data-settings-section="privacy">
      <div class="pb-3 border-b border-white/5">
        <h3 class="text-base font-bold text-white flex items-center space-x-2">
          <span>🛡️</span>
          <span>Privacy & Progressive Disclosure</span>
        </h3>
        <p class="text-xs text-slate-400">Tailor the interface density, cryptographic terminology, and trust filtering</p>
      </div>

      <!-- 3-TIER PROGRESSIVE DISCLOSURE (CENTRAL ROADMAP PILLAR) -->
      <div class="space-y-2.5">
        <div class="text-xs font-bold text-white">Interface Complexity & Terminology Level</div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <!-- SIMPLE -->
          <button
            type="button"
            id="btn-set-mode-simple"
            data-action="settings-set-ui-mode"
            data-mode="simple"
            class="p-4 rounded-2xl text-left border transition-all cursor-pointer space-y-2 ${
              currentMode === 'simple'
                ? 'bg-cyan-950/40 border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                : 'bg-surface-base border-white/5 hover:border-white/20'
            }"
          >
            <div class="flex items-center justify-between">
              <span class="text-base">🌱</span>
              ${currentMode === 'simple' ? '<span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-black">ACTIVE</span>' : ''}
            </div>
            <div class="font-bold text-xs text-white">Simple (Default)</div>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              Plain, intuitive language. "Encrypted messages", "Verified files", "Protected identity". Zero jargon.
            </p>
          </button>

          <!-- ADVANCED -->
          <button
            type="button"
            id="btn-set-mode-advanced"
            data-action="settings-set-ui-mode"
            data-mode="advanced"
            class="p-4 rounded-2xl text-left border transition-all cursor-pointer space-y-2 ${
              currentMode === 'advanced'
                ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                : 'bg-surface-base border-white/5 hover:border-white/20'
            }"
          >
            <div class="flex items-center justify-between">
              <span class="text-base">⚡</span>
              ${currentMode === 'advanced' ? '<span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500 text-white">ACTIVE</span>' : ''}
            </div>
            <div class="font-bold text-xs text-white">Advanced</div>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              Exposes cryptographic protocol indicators: E2EE, ML-KEM-768, TreeKEM, and Web-of-Trust badges.
            </p>
          </button>

          <!-- TECHNICAL -->
          <button
            type="button"
            id="btn-set-mode-technical"
            data-action="settings-set-ui-mode"
            data-mode="technical"
            class="p-4 rounded-2xl text-left border transition-all cursor-pointer space-y-2 ${
              currentMode === 'technical' || currentMode === 'sovereign'
                ? 'bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                : 'bg-surface-base border-white/5 hover:border-white/20'
            }"
          >
            <div class="flex items-center justify-between">
              <span class="text-base">🔬</span>
              ${currentMode === 'technical' || currentMode === 'sovereign' ? '<span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">ACTIVE</span>' : ''}
            </div>
            <div class="font-bold text-xs text-white">Technical</div>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              Raw cryptographic telemetry: hashes, epochs, nullifiers, Merkle roots, entropy, and RTT.
            </p>
          </button>
        </div>
      </div>

      <!-- WOT TRUST THRESHOLD -->
      <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs font-bold text-white">Minimum Web-of-Trust Threshold</div>
            <p class="text-[11px] text-slate-400">Filter out feeds and interactions from nodes with trust score below threshold</p>
          </div>
          <span id="settings-trust-threshold-val" class="font-mono text-xs font-bold text-cyan-400">${clientStore?.minFeedTrustThreshold || 0} / 100</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value="${clientStore?.minFeedTrustThreshold || 0}"
          id="input-settings-trust-threshold"
          data-input="settings-set-trust-threshold"
          data-change="settings-set-trust-threshold"
          class="w-full accent-cyan-400 h-1.5 bg-surface-raised rounded-lg cursor-pointer"
        />
      </div>

      <!-- LOCAL MEMORY ZEROIZATION -->
      <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
        <div class="space-y-1">
          <div class="text-xs font-bold text-white">Emergency Memory Zeroization & Data Shred</div>
          <p class="text-[11px] text-slate-400">Immediately overwrites cryptographic keys in RAM and purges local caches</p>
        </div>
        <button
          type="button"
          id="btn-settings-zeroize-memory"
          data-action="settings-zeroize-memory"
          class="px-3.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
        >
          Zeroize Memory
        </button>
      </div>
    </div>
  `;
}
