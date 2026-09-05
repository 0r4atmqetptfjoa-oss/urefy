/**
 * Aetheris Admin Authentication Module
 *
 * Handles admin identity detection, PIN-based access, and session management.
 * Admin status is stored in memory only (clears on tab/browser close for security).
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { safeLocalStorage } from './dry-utils.js';

export function isLocalDev(): boolean {
  if (typeof window === 'undefined' || !window.location) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

export const ADMIN_DEFAULT_PIN = isLocalDev() ? '11223' : '';

const memoryStorage: Record<string, string> = {};

function safeGet(key: string): string | null {
  // In production, strictly disallow reading admin PINs from persistent browser storage
  if (!isLocalDev() && (key.includes('pin') || key.includes('admin') || key.includes('token'))) {
    return memoryStorage[key] || null;
  }
  const storage = safeLocalStorage();
  if (storage) {
    try { return storage.getItem(key); } catch (_) { return memoryStorage[key] || null; }
  }
  return memoryStorage[key] || null;
}

function safeSet(key: string, value: string): void {
  // In production, strictly store admin credentials in volatile RAM only (memoryStorage)
  if (!isLocalDev() && (key.includes('pin') || key.includes('admin') || key.includes('token'))) {
    memoryStorage[key] = value;
    return;
  }
  const storage = safeLocalStorage();
  if (storage) {
    try { storage.setItem(key, value); return; } catch (_) {}
  }
  memoryStorage[key] = value;
}

export function clearAdminStorage(): void {
  for (const k of Object.keys(memoryStorage)) {
    delete memoryStorage[k];
  }
  if (typeof localStorage !== 'undefined') {
    try { localStorage.removeItem('aetheris_admin_pin'); localStorage.removeItem('aetheris_admin_fingerprint'); } catch (_) {}
  }
}

export class AdminAuthManager {
  private _isAdmin: boolean = false;
  private _sessionStartedAt: number = 0;
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  public isPinDialogOpen: boolean = false;
  public pinError: string = '';
  private adminFingerprint: string = '';
  private _sessionTimeoutIntervalId: any = null;
  private _failedAttempts: number = 0;
  private _lockedUntil: number = 0;

  constructor() {
    // Load or create the admin fingerprint binding
    const stored = safeGet('aetheris_admin_fingerprint');
    if (stored) {
      this.adminFingerprint = stored;
    }
    // Auto-restore session within same page load
    this._checkSessionTimeout();
  }

  public destroy(): void {
    if (this._sessionTimeoutIntervalId !== null) {
      clearInterval(this._sessionTimeoutIntervalId);
      this._sessionTimeoutIntervalId = null;
    }
  }

  /** Called after keypair is generated — binds first identity as admin if none set */
  public bindFirstAdmin(fingerprint: string): void {
    if (!this.adminFingerprint) {
      this.adminFingerprint = fingerprint;
      safeSet('aetheris_admin_fingerprint', fingerprint);
    }
  }

  /** Check if fingerprint matches admin and session not expired */
  public checkAutoAdmin(fingerprint: string): boolean {
    if (fingerprint === this.adminFingerprint && this._isAdmin) {
      return !this._isSessionExpired();
    }
    return false;
  }

  public get isAdmin(): boolean {
    if (this._isSessionExpired()) {
      this._isAdmin = false;
    }
    return this._isAdmin;
  }

  public get adminFingerprintId(): string {
    return this.adminFingerprint;
  }

  public openPinDialog(): void {
    this.isPinDialogOpen = true;
    this.pinError = '';
  }

  public closePinDialog(): void {
    this.isPinDialogOpen = false;
    this.pinError = '';
  }

  private _activePin: string = '';

  public get activePin(): string {
    return this._activePin || ADMIN_DEFAULT_PIN;
  }

  private _activateSession(pin: string): void {
    this._isAdmin = true;
    this._activePin = pin;
    this._sessionStartedAt = Date.now();
    this.isPinDialogOpen = false;
    this.pinError = '';
    this._failedAttempts = 0;
    this._lockedUntil = 0;
    // PIN stored strictly in-memory during session (zero disk/localStorage persistence)
  }

  /** Verify PIN synchronously against in-memory session or default dev pin */
  public verifyPin(pin: string): boolean {
    const now = Date.now();
    if (this._lockedUntil > now) {
      const remainingSec = Math.ceil((this._lockedUntil - now) / 1000);
      this.pinError = `Too many failed attempts. Locked out for ${remainingSec}s.`;
      return false;
    }

    const expectedPin = this._activePin || ADMIN_DEFAULT_PIN;
    if (expectedPin && pin && pin === expectedPin) {
      this._activateSession(pin);
      return true;
    }

    this._failedAttempts++;
    if (this._failedAttempts >= 5) {
      this._lockedUntil = now + 10 * 60 * 1000;
      this.pinError = 'Too many failed attempts. Locked out for 10 minutes.';
    } else {
      this.pinError = `Incorrect PIN. Access denied (${5 - this._failedAttempts} attempts remaining).`;
    }
    return false;
  }

  /** Asynchronously verify PIN against Cloudflare Edge /api/admin or local storage */
  public async verifyPinAsync(pin: string): Promise<boolean> {
    const now = Date.now();
    if (this._lockedUntil > now) {
      const remainingSec = Math.ceil((this._lockedUntil - now) / 1000);
      this.pinError = `Too many failed attempts. Locked out for ${remainingSec}s.`;
      return false;
    }

    if (!pin) {
      this.pinError = 'PIN cannot be empty.';
      return false;
    }

    // 1. Check local storage or dev default ONLY in local development
    if (isLocalDev()) {
      const storedPin = safeGet('aetheris_admin_pin') || ADMIN_DEFAULT_PIN;
      if (storedPin && pin === storedPin) {
        this._activateSession(pin);
        return true;
      }
    }

    // 2. Validate against Cloudflare /api/admin backend
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/admin?action=stats', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-PIN': pin,
          },
        });
        if (res.ok) {
          this._activateSession(pin);
          return true;
        } else if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          this.pinError = (data as any)?.error || 'Too many failed attempts. Locked out for 10 minutes.';
          this._lockedUntil = now + 10 * 60 * 1000;
          return false;
        } else if (res.status === 503) {
          const data = await res.json().catch(() => ({}));
          this.pinError = (data as any)?.error || 'ADMIN_PIN not configured in Cloudflare environment.';
          return false;
        }
      } catch (err) {
        console.warn('[AdminAuth] Server verification network error, falling back to local check:', err);
      }
    }

    this._failedAttempts++;
    if (this._failedAttempts >= 5) {
      this._lockedUntil = now + 10 * 60 * 1000;
      this.pinError = 'Too many failed attempts. Locked out for 10 minutes.';
    } else {
      this.pinError = `Incorrect PIN. Access denied (${5 - this._failedAttempts} attempts remaining).`;
    }
    return false;
  }

  /** Change admin PIN */
  public changePin(currentPin: string, newPin: string): boolean {
    const expectedPin = this._activePin || ADMIN_DEFAULT_PIN;
    if (expectedPin && currentPin !== expectedPin) return false;
    if (newPin.length < 4) return false;
    this._activePin = newPin;
    return true;
  }

  /** Log out of admin session */
  public logout(): void {
    this._isAdmin = false;
    this._activePin = '';
    this._sessionStartedAt = 0;
  }

  /** Reset admin binding — dangerous, only for recovery */
  public resetAdminBinding(newFingerprint: string): void {
    this.adminFingerprint = newFingerprint;
    safeSet('aetheris_admin_fingerprint', newFingerprint);
  }

  public getSessionRemainingMs(): number {
    if (!this._isAdmin) return 0;
    const elapsed = Date.now() - this._sessionStartedAt;
    return Math.max(0, this.SESSION_TIMEOUT_MS - elapsed);
  }

  public getSessionRemainingFormatted(): string {
    const ms = this.getSessionRemainingMs();
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}m ${sec.toString().padStart(2, '0')}s`;
  }

  private _isSessionExpired(): boolean {
    if (!this._isAdmin) return true;
    return Date.now() - this._sessionStartedAt > this.SESSION_TIMEOUT_MS;
  }

  private _checkSessionTimeout(): void {
    if (this._sessionTimeoutIntervalId !== null) {
      clearInterval(this._sessionTimeoutIntervalId);
    }
    // Refresh check every 60 seconds
    this._sessionTimeoutIntervalId = setInterval(() => {
      if (this._isAdmin && this._isSessionExpired()) {
        this._isAdmin = false;
        // Notify the UI to re-render
        if (typeof window !== 'undefined' && window.clientStore) {
          window.clientStore.notify();
        }
      }
    }, 60000);
  }

  /** Render the PIN entry dialog */
  public renderPinDialog(): string {
    return `
      <div id="admin-pin-backdrop" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl">
        <div class="w-full max-w-sm mx-4">
          
          <!-- CARD -->
          <div class="bg-surface-base border border-white/15 rounded-3xl overflow-hidden shadow-2xl">
            
            <!-- HEADER -->
            <div class="p-6 pb-4 border-b border-white/10 bg-gradient-to-br from-amber/10 via-surface-base to-surface-raised text-center">
              <div class="w-14 h-14 rounded-2xl bg-amber/15 border border-amber/30 flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg">
                🔐
              </div>
              <h2 class="text-base font-bold text-white">Admin Access</h2>
              <p class="text-xs text-slate-400 mt-1">Enter your 5-digit admin PIN</p>
            </div>

            <!-- PIN INPUT -->
            <form id="admin-pin-form" data-submit="call-global" data-raw-submit="return false" autocomplete="off" class="p-6 space-y-4">
              <div class="relative">
                <input
                  type="password"
                  id="admin-pin-input"
                  name="admin_pin"
                  maxlength="8"
                  placeholder="••••• PIN"
                  class="w-full bg-surface-raised border ${this.pinError ? 'border-crimson/60' : 'border-white/15'} rounded-xl px-4 py-3 text-center text-xl font-mono tracking-[0.5em] text-white placeholder-slate-600 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-all"
                  autocomplete="current-password"
                  autofocus
                />
              </div>

              ${this.pinError ? `
                <div class="flex items-center space-x-2 text-crimson text-xs font-medium px-1">
                  <span>⚠️</span>
                  <span>${this.pinError}</span>
                </div>
              ` : ''}

              <button
                type="submit"
                id="btn-admin-pin-submit"
                class="w-full py-3 rounded-xl bg-amber text-black font-bold text-sm hover:bg-amber/90 transition-all shadow-lg shadow-amber/20 cursor-pointer"
              >
                Unlock Admin Panel
              </button>

              <button
                type="button"
                id="btn-admin-pin-cancel"
                class="w-full py-2 rounded-xl text-slate-400 hover:text-white text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>

              <p class="text-[10px] text-slate-600 text-center">
                Default PIN: ${ADMIN_DEFAULT_PIN} · Change in Admin → Server Config
              </p>
            </form>
          </div>
        </div>
      </div>
    `;
  }
}

export const adminAuth = new AdminAuthManager();

serviceRegistry.registerInstance(SERVICES.AdminAuth, adminAuth);

if (typeof window !== 'undefined') {
  window.adminAuth = adminAuth;
}
