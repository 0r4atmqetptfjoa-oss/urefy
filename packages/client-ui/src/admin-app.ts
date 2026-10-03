import { secureStorage } from './secure-storage.js';
/**
 * UREfy Admin Application
 *
 * Standalone admin control panel — completely separate from the user-facing site.
 * Route: /admin.html (or /admin via server redirect)
 *
 * This file has ZERO imports from the main user app.ts.
 * It uses admin-auth.ts and admin-panel.ts which are shared modules,
 * but the main site imports NONE of these.
 */

import { adminAuth } from './admin-auth.js';
import { adminPanel, AdminTab } from './admin-panel.js';
import { signInWithAdminPasskey, bindAdminPasskeySettings } from './admin-passkeys.js';

export function initAdminApp(): void {
  const root = document.getElementById('admin-root');
  if (!root) return;

  adminPanel.onSyncComplete = () => {
    if (!adminAuth.isAdmin || !['dashboard', 'waf'].includes(adminPanel.activeTab)) return;
    const content = document.getElementById('admin-tab-content');
    const scrollTop = content?.scrollTop || 0;
    const expanded = content?.querySelector('details')?.open;
    const values = new Map<string, string>();
    content?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[id]').forEach(el => values.set(el.id, el.value));
    const focusedId = document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
    initAdminApp();
    const updated = document.getElementById('admin-tab-content');
    if (updated) {
      updated.scrollTop = scrollTop;
      values.forEach((value, id) => {
        const field = updated.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${CSS.escape(id)}`);
        if (field) field.value = value;
      });
      if (focusedId) updated.querySelector<HTMLElement>(`#${CSS.escape(focusedId)}`)?.focus({ preventScroll: true });
      const details = updated.querySelector('details');
      if (details && expanded) details.open = true;
    }
  };

  // Bind admin fingerprint — loads from localStorage
  // Admin is whoever owns this device's crypto identity
  const savedSeed = secureStorage.getIdentitySync()?.seedHex || null;
  const adminFp = localStorage.getItem('aetheris_admin_fingerprint') || 'admin';
  adminAuth.bindFirstAdmin(adminFp);

  const render = () => {
    if (!adminAuth.isAdmin) {
      root.innerHTML = renderLoginPage();
      bindLoginEvents();
    } else {
      root.innerHTML = renderFullAdminApp();
      bindAdminEvents();
    }
  };

  render();
}

// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────

function renderLoginPage(): string {
  const isPasskeySupported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  return `
    <div class="min-h-screen bg-[#07080b] flex items-center justify-center p-4 font-sans text-slate-200 selection:bg-amber/30">

      <!-- Ambient tactical grid & glow -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden">
        <div class="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full bg-gradient-to-tr from-amber-500/10 via-orange-600/5 to-transparent blur-[140px]"></div>
      </div>

      <div class="relative w-full max-w-md">

        <!-- BRAND HEADER -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 shadow-2xl shadow-amber-500/10 mb-3.5 ring-1 ring-white/10">
            <span class="text-2xl font-black text-amber tracking-wider">U</span>
          </div>
          <h1 class="text-xl font-extrabold text-white tracking-tight flex items-center justify-center space-x-2">
            <span>UREfy Control Plane</span>
            <span class="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">v4.0</span>
          </h1>
          <p class="text-xs text-slate-400 mt-1 font-mono">Sovereign Mission Control & Zero-Trust Perimeter</p>
        </div>

        <!-- COCKPIT CLEARANCE CARD -->
        <div class="bg-[#0c0e14]/90 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-white/5">

          <!-- STATUS TICKER STRIPE -->
          <div class="h-1 bg-gradient-to-r from-amber-500/0 via-amber-400 to-amber-500/0"></div>

          <div class="p-6 sm:p-8 space-y-5">
            
            <!-- ZERO-TRUST BADGE -->
            <div class="flex items-center justify-between p-3 rounded-2xl bg-surface-raised/40 border border-white/5 text-xs font-mono">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span class="text-slate-300 font-semibold">Zero-Trust Enclave</span>
              </div>
              <span class="text-[10px] text-amber-400/90 font-bold tracking-wider">FIDO2 L3 LEVEL</span>
            </div>

            <!-- SECURITY RADAR SPEC -->
            <div class="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div class="text-[10px] text-slate-500">AUTH METHOD</div>
                <div class="text-slate-200 font-bold flex items-center space-x-1 mt-0.5">
                  <span>🛡️</span>
                  <span>Hardware Key</span>
                </div>
              </div>
              <div class="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div class="text-[10px] text-slate-500">ORIGIN BINDING</div>
                <div class="text-emerald-400 font-bold flex items-center space-x-1 mt-0.5">
                  <span>🔒</span>
                  <span>Strict RP-ID</span>
                </div>
              </div>
            </div>

            <!-- PRIMARY AUTHENTICATION BUTTON: HARDWARE PASSKEY -->
            <div class="space-y-2.5 pt-1">
              <button
                type="button"
                id="btn-login-passkey"
                class="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-extrabold text-sm flex items-center justify-center space-x-2.5 shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <span class="text-base group-hover:scale-110 transition-transform">🔑</span>
                <span>Authenticate with Hardware Key</span>
              </button>
              <p class="text-center text-[10px] text-slate-500 font-mono">
                Supports YubiKey, Apple Touch ID / Face ID, Windows Hello & FIDO2
              </p>
            </div>

            <div id="login-error" class="hidden text-xs text-crimson font-medium text-center p-2 rounded-xl bg-crimson/10 border border-crimson/30 animate-in fade-in"></div>

            <!-- EMERGENCY BREAK-GLASS & LOCAL DEV ACCORDION -->
            <details class="pt-2 border-t border-white/5 group/dev">
              <summary class="text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors cursor-pointer text-center select-none py-1">
                ⚡ Emergency Break-Glass & Dev Override
              </summary>
              <div class="pt-3 space-y-3">
                <form id="admin-login-form" data-submit="call-global" data-global-method="event.preventDefault" class="space-y-3">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <label for="login-pin-input" class="text-[11px] text-slate-400 font-medium">Break-Glass PIN / Passphrase</label>
                      <button
                        type="button"
                        id="btn-toggle-pin-visibility"
                        class="text-[10px] text-slate-500 hover:text-amber transition-colors cursor-pointer font-mono"
                      >
                        👁 Show
                      </button>
                    </div>
                    <input
                      type="password"
                      id="login-pin-input"
                      name="admin-pin"
                      maxlength="128"
                      placeholder="Emergency override..."
                      class="w-full bg-[#141824] border border-white/10 rounded-xl px-3.5 py-2.5 text-center text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-all"
                      autocomplete="current-password"
                    />
                  </div>

                  <button
                    type="submit"
                    id="btn-login-submit"
                    class="w-full py-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/10 font-bold text-xs transition-all cursor-pointer"
                  >
                    Unlock with Override PIN
                  </button>
                </form>
              </div>
            </details>

            <div class="pt-2 text-center">
              <a href="/" class="text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono">
                ← Return to Public Network
              </a>
            </div>
          </div>
        </div>

        <p class="text-center text-[10px] text-slate-600 mt-4 font-mono">
          UREfy Sovereign Control Architecture · Zero Plaintext Secrets · WORM Audit Log Active
        </p>
      </div>
    </div>
  `;
}


function bindLoginEvents(): void {
  const form = document.querySelector('form');
  const input = document.getElementById('login-pin-input') as HTMLInputElement | null;
  const submitBtn = document.getElementById('btn-login-submit') as HTMLButtonElement | null;
  const errorEl = document.getElementById('login-error');
  const passkeyButton = document.getElementById('btn-login-passkey') as HTMLButtonElement | null;
  if (passkeyButton) {
    passkeyButton.disabled = !window.PublicKeyCredential || !window.isSecureContext;
    passkeyButton.addEventListener('click', async () => {
      passkeyButton.disabled = true;
      if (submitBtn) submitBtn.disabled = true;
      passkeyButton.textContent = 'Waiting for your passkey…';
      try {
        await signInWithAdminPasskey();
        adminPanel.open();
        initAdminApp();
      } catch (error) {
        if (errorEl) {
          errorEl.textContent = error instanceof Error ? error.message : 'Passkey sign-in failed. Use your PIN.';
          errorEl.classList.remove('hidden');
        }
      } finally {
        passkeyButton.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
        passkeyButton.textContent = 'Sign in with a passkey';
      }
    });
  }

  const tryLogin = async () => {
    const pin = input?.value ?? '';
    if (!pin) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying PIN...';
    }

    try {
      const ok = await adminAuth.verifyPinAsync(pin);
      if (ok) {
        adminPanel.open();
        initAdminApp();
      } else {
        if (errorEl) {
          errorEl.textContent = adminAuth.pinError ? `✗ ${adminAuth.pinError}` : '✗ Incorrect PIN. Access denied.';
          errorEl.classList.remove('hidden');
        }
        if (input) {
          input.value = '';
          input.classList.add('border-crimson/50');
          setTimeout(() => input.classList.remove('border-crimson/50'), 1500);
        }
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Unlock Admin Panel';
      }
    }
  };

  const toggleBtn = document.getElementById('btn-toggle-pin-visibility');
  toggleBtn?.addEventListener('click', () => {
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      toggleBtn.textContent = '🔒 Hide password';
    } else {
      input.type = 'password';
      toggleBtn.textContent = '👁 Show password';
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    tryLogin();
  });
  submitBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    tryLogin();
  });
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tryLogin();
    }
  });
}

// ─────────────────────────────────────────────────────────
// FULL ADMIN APP
// ─────────────────────────────────────────────────────────

let sessionTickerInterval: any = null;

function renderFullAdminApp(): string {
  return adminPanel.renderAdminPanel(adminAuth.adminFingerprintId, adminAuth.getSessionRemainingFormatted());
}

function bindAdminEvents(): void {
  adminPanel.bindEvents(() => initAdminApp());
  void bindAdminPasskeySettings();

  if (sessionTickerInterval) clearInterval(sessionTickerInterval);
  sessionTickerInterval = setInterval(() => {
    const tickerEl = document.getElementById('admin-session-ticker');
    if (tickerEl) {
      tickerEl.textContent = `Session: ${adminAuth.getSessionRemainingFormatted()}`;
    }
    if (!adminAuth.isAdmin) {
      if (sessionTickerInterval) {
        clearInterval(sessionTickerInterval);
        sessionTickerInterval = null;
      }
      adminPanel.close();
      initAdminApp();
    }
  }, 1000);

  // Lock session button
  document.getElementById('btn-close-admin-panel')?.addEventListener('click', () => {
    if (sessionTickerInterval) {
      clearInterval(sessionTickerInterval);
      sessionTickerInterval = null;
    }
    adminAuth.logout();
    adminPanel.close();
    initAdminApp();
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('urefy-admin-locked', () => {
    if (sessionTickerInterval) {
      clearInterval(sessionTickerInterval);
      sessionTickerInterval = null;
    }
    adminPanel.close();
    initAdminApp();
  });
}
