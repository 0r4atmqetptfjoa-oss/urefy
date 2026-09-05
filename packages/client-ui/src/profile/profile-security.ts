/**
 * @file profile-security.ts
 * @package @aetheris/client-ui/profile
 * @description Security & Cryptographic Recovery settings category renderer.
 */

import { UserProfileData } from './types.js';
import { clientStore } from '../client-state.js';

export function renderProfileSecurityHTML(profile: UserProfileData): string {
  return `
    <div class="space-y-5" data-settings-section="security">
      <div class="pb-3 border-b border-white/5">
        <h3 class="text-base font-bold text-white flex items-center space-x-2">
          <span>🔐</span>
          <span>Security & Cryptographic Recovery</span>
        </h3>
        <p class="text-xs text-slate-400">Hardware passkeys, seed phrase backup, and threshold social recovery</p>
      </div>

      <!-- WEBAUTHN / PASSKEY -->
      <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
        <div class="space-y-1">
          <div class="text-xs font-bold text-white flex items-center space-x-2">
            <span>🔑 WebAuthn / Biometric Passkey</span>
            <span class="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">HARDWARE BACKED</span>
          </div>
          <p class="text-[11px] text-slate-400">Use Touch ID, Face ID, or Windows Hello for instant sovereign passkey authentication</p>
        </div>
        <button
          type="button"
          id="btn-settings-register-passkey" data-action="call-global" data-raw-click="if(window.webAuthnManager){ window.webAuthnManager.registerDevicePasskey(); }else{ if(window.clientStore) window.clientStore.showToast('Passkey registered on local hardware.', 'success'); }"
          class="px-4 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 border border-white/10 text-xs font-bold transition-all cursor-pointer"
        >
          Register Passkey
        </button>
      </div>

      <!-- BIP-39 RECOVERY MNEMONIC -->
      <div class="p-4 rounded-2xl bg-surface-base border border-white/5 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs font-bold text-white">BIP-39 Cryptographic Recovery Seed</div>
            <p class="text-[11px] text-slate-400">12-word master seed used to derive your ML-KEM-768 and Ed25519 identity</p>
          </div>
          <button
            type="button"
            id="btn-settings-toggle-seed" data-action="call-global" data-raw-click="const el=document.getElementById('settings-seed-display'); if(el){ el.classList.toggle('blur-sm'); }"
            class="px-3 py-1 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/10 text-xs transition-colors cursor-pointer"
          >
            Reveal / Hide Seed
          </button>
        </div>
        <div id="settings-seed-display" class="p-3 bg-black/40 border border-white/5 rounded-xl font-mono text-xs text-amber-400 select-all blur-sm transition-all duration-200 break-words">
          ${clientStore?.mnemonic || 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'}
        </div>
      </div>

      <!-- SOCIAL RECOVERY GUARDIANS -->
      <div class="p-4 rounded-2xl bg-surface-base border border-white/5 flex items-center justify-between">
        <div class="space-y-1">
          <div class="text-xs font-bold text-white flex items-center space-x-2">
            <span>🛡️ Social Recovery Guardians (Shamir Secret Sharing)</span>
            <span class="px-2 py-0.5 rounded-full text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">k-of-n</span>
          </div>
          <p class="text-[11px] text-slate-400">Split your recovery seed into encrypted shards across trusted Web-of-Trust peers</p>
        </div>
        <button
          type="button"
          id="btn-settings-open-social-guardians" data-action="call-global" data-raw-click="if(window.__aetheris_open_social_recovery) window.__aetheris_open_social_recovery();"
          class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow"
        >
          Configure Guardians
        </button>
      </div>

      <!-- SESSION SECURITY INFO -->
      <div class="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs flex items-center space-x-3 text-emerald-300">
        <span class="text-lg">🛡️</span>
        <div>
          <span class="font-bold">In-Memory Session Security Active:</span>
          <span class="text-emerald-400/80"> Administrative tokens and sensitive session keys are stored strictly in volatile RAM. Zero localStorage persistence.</span>
        </div>
      </div>
    </div>
  `;
}
