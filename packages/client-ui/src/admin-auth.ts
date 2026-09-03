/**
 * Aetheris Admin Authentication Module
 *
 * Handles admin identity detection, PIN-based access, and session management.
 * Admin status is stored in memory only (clears on tab/browser close for security).
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';
import { safeLocalStorage } from './dry-utils.js';

export const ADMIN_DEFAULT_PIN = '11223'; // Change this to your PIN

const memoryStorage: Record<string, string> = {};

function safeGet(key: string): string | null {
  const storage = safeLocalStorage();
  if (storage) {
    try { return storage.getItem(key); } catch (_) { return memoryStorage[key] || null; }
  }
  return memoryStorage[key] || null;
}

function safeSet(key: string, value: string): void {
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
    return this._activePin || safeGet('aetheris_admin_pin') || ADMIN_DEFAULT_PIN;
  }

  /** Verify PIN and activate admin session */
  public verifyPin(pin: string): boolean {
    const storedPin = safeGet('aetheris_admin_pin') || ADMIN_DEFAULT_PIN;
    if (pin === storedPin) {
      this._isAdmin = true;
      this._activePin = pin;
      this._sessionStartedAt = Date.now();
      this.isPinDialogOpen = false;
      this.pinError = '';
      return true;
    } else {
      this.pinError = 'Incorrect PIN. Access denied.';
      return false;
    }
  }

  /** Change admin PIN */
  public changePin(currentPin: string, newPin: string): boolean {
    const storedPin = safeGet('aetheris_admin_pin') || ADMIN_DEFAULT_PIN;
    if (currentPin !== storedPin) return false;
    if (newPin.length < 4) return false;
    safeSet('aetheris_admin_pin', newPin);
    return true;
  }

  /** Log out of admin session */
  public logout(): void {
    this._isAdmin = false;
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
            <div class="p-6 space-y-4">
              <div class="relative">
                <input
                  type="password"
                  id="admin-pin-input"
                  maxlength="8"
                  placeholder="••••• PIN"
                  class="w-full bg-surface-raised border ${this.pinError ? 'border-crimson/60' : 'border-white/15'} rounded-xl px-4 py-3 text-center text-xl font-mono tracking-[0.5em] text-white placeholder-slate-600 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-all"
                  autocomplete="off"
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
                id="btn-admin-pin-submit"
                class="w-full py-3 rounded-xl bg-amber text-black font-bold text-sm hover:bg-amber/90 transition-all shadow-lg shadow-amber/20 cursor-pointer"
              >
                Unlock Admin Panel
              </button>

              <button
                id="btn-admin-pin-cancel"
                class="w-full py-2 rounded-xl text-slate-400 hover:text-white text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>

              <p class="text-[10px] text-slate-600 text-center">
                Default PIN: ${ADMIN_DEFAULT_PIN} · Change in Admin → Server Config
              </p>
            </div>
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
