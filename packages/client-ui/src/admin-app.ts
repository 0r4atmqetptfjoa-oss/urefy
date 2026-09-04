/**
 * Aetheris Admin Application
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

export function initAdminApp(): void {
  const root = document.getElementById('admin-root');
  if (!root) return;

  // Bind admin fingerprint — loads from localStorage
  // Admin is whoever owns this device's crypto identity
  const savedSeed = localStorage.getItem('aetheris_identity_seed');
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
// LOGIN PAGE
// ─────────────────────────────────────────────────────────

function renderLoginPage(): string {
  return `
    <div class="min-h-screen bg-[#090a0c] flex items-center justify-center p-4 font-sans">

      <!-- Ambient background glow -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber/5 blur-[120px]"></div>
      </div>

      <div class="relative w-full max-w-sm">

        <!-- LOGO -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber/30 via-orange-500/20 to-amber/10 border border-amber/30 shadow-2xl shadow-amber/10 mb-4">
            <span class="text-2xl font-black text-amber tracking-widest">Æ</span>
          </div>
          <h1 class="text-xl font-bold text-white tracking-wide">AETHERIS</h1>
          <p class="text-xs text-slate-500 mt-1 font-mono uppercase tracking-widest">Admin Control Panel</p>
        </div>

        <!-- LOGIN CARD -->
        <div class="bg-[#0f1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">

          <!-- HEADER STRIPE -->
          <div class="h-1 bg-gradient-to-r from-amber/0 via-amber to-amber/0"></div>

          <div class="p-8">
            <div class="text-center mb-6">
              <div class="inline-flex items-center space-x-2 text-xs font-mono text-amber/70 bg-amber/10 border border-amber/20 px-3 py-1.5 rounded-full">
                <span class="w-1.5 h-1.5 rounded-full bg-amber animate-pulse"></span>
                <span>RESTRICTED ACCESS</span>
              </div>
            </div>

            <form id="admin-login-form" onsubmit="event.preventDefault();" class="space-y-4">
              <div class="space-y-1.5">
                <label for="login-pin-input" class="text-xs text-slate-400 font-medium">Admin PIN</label>
                <input
                  type="password"
                  id="login-pin-input"
                  name="admin-pin"
                  maxlength="8"
                  placeholder="Enter PIN..."
                  class="w-full bg-[#1a1d27] border border-white/10 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder-slate-700 focus:outline-none focus:border-amber/50 focus:ring-2 focus:ring-amber/10 transition-all"
                  autocomplete="current-password"
                  autofocus
                />
              </div>

              <div id="login-error" class="hidden text-xs text-crimson font-medium text-center py-1"></div>

              <button
                type="submit"
                id="btn-login-submit"
                class="w-full py-3.5 rounded-xl bg-amber text-black font-bold text-sm hover:bg-amber/90 active:scale-95 transition-all shadow-lg shadow-amber/20 cursor-pointer"
              >
                Unlock Admin Panel
              </button>
            </form>

            <div class="mt-6 pt-4 border-t border-white/5 text-center">
              <a href="/" class="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                ← Back to Aetheris
              </a>
            </div>
          </div>
        </div>

        <p class="text-center text-xs text-slate-600 mt-4 font-mono">
          Enter sovereign instance PIN (Cloudflare Secret or Local Dev 11223)
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

function renderFullAdminApp(): string {
  return adminPanel.renderAdminPanel(adminAuth.adminFingerprintId, adminAuth.getSessionRemainingFormatted());
}

function bindAdminEvents(): void {
  adminPanel.bindEvents(() => initAdminApp());

  // Lock session button
  document.getElementById('btn-close-admin-panel')?.addEventListener('click', () => {
    adminAuth.logout();
    initAdminApp();
  });
}
