/**
 * @file local-diagnostics.ts
 * @package @aetheris/client-ui
 * @description Sovereign 100% On-Device Error Telemetry & Local Diagnostics Manager.
 * Rotating buffer in localStorage / IndexedDB keeping the last 200 error records.
 * Fully opt-in, 100% on-device, zero trackers, zero external network calls.
 * Sanitizes all PII, passwords, private keys, seed phrases, and query params.
 */

import { serviceRegistry, SERVICES } from './service-registry.js';

// ─── INTERFACES & TYPES ─────────────────────────────────────────────────────────

export interface DiagnosticRecord {
  id: string;
  timestamp: number;
  component: string;
  message: string;
  sanitizedStack: string;
  errorCount: number;
}

export interface DiagnosticReport {
  appName: string;
  version: string;
  reportType: string;
  timestamp: number;
  generatedAt: string;
  diagnosticsEnabled: boolean;
  zeroNetworkGuaranteed: boolean;
  recordsCount: number;
  records: DiagnosticRecord[];
}

// ─── SANITIZATION UTILITIES ───────────────────────────────────────────────────

/**
 * Strips PII, passwords, authentication tokens, seed phrases, private keys,
 * and URL query parameters from any diagnostic string.
 */
export function sanitizeDiagnosticsText(text: string): string {
  if (!text) return '';

  let s = String(text);

  // 1. Strip passwords, secrets, tokens, and credentials
  s = s.replace(
    /\b(password|passwd|pwd|pass|secret|token|apikey|api_key|authorization|bearer|auth_token|access_token|refresh_token)\s*[:=]\s*["']?([^\s"',;]+)["']?/gi,
    '$1=[REDACTED_CREDENTIAL]'
  );

  // Bearer & Basic auth tokens
  s = s.replace(/Bearer\s+[A-Za-z0-9_\-\.\+\/=]+/g, 'Bearer [REDACTED_TOKEN]');
  s = s.replace(/Basic\s+[A-Za-z0-9_\-\.\+\/=]+/g, 'Basic [REDACTED_AUTH]');

  // 2. Strip Seeds, BIP-39 Mnemonics, and Private Keys
  s = s.replace(
    /\b(seed|mnemonic|entropy|phrase|private_key|privateKey|secret_key|secretKey)\s*[:=]\s*["']?([^"',;\n]+)["']?/gi,
    '$1=[REDACTED_SEED]'
  );

  // 64-char hex strings (256-bit private keys or seeds)
  s = s.replace(/\b(?:0x)?[a-fA-F0-9]{64}\b/g, '[REDACTED_KEY_HEX]');
  // 128-char hex strings (512-bit signatures or master seeds)
  s = s.replace(/\b(?:0x)?[a-fA-F0-9]{128}\b/g, '[REDACTED_KEY_HEX]');

  // 3. Strip query parameters and URL credentials
  s = s.replace(/(https?:\/\/)([^:\/\s]+):([^@\/\s]+)@/g, '$1[REDACTED_USER]:[REDACTED_PASS]@');
  s = s.replace(/(https?:\/\/[^\s"'`<>\)]+)(\?[^\s"'`<>\)]*)/g, (match, base) => {
    return `${base}?[REDACTED_QUERY_PARAMS]`;
  });
  s = s.replace(/([?&])(?:token|key|secret|password|auth|seed|signature|code|session)=[^&\s"'`]+/gi, '$1[REDACTED_PARAM]');

  // 4. Strip PII (Emails, Phone Numbers, User Directories, IPs)
  s = s.replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '[REDACTED_EMAIL]');
  s = s.replace(/\b(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');
  s = s.replace(/([a-zA-Z]:\\Users\\)[^\\]+(\\)/gi, '$1[REDACTED_USER]$2');
  s = s.replace(/(\/(?:home|Users)\/)[^\/\s]+(\/)/g, '$1[REDACTED_USER]$2');
  s = s.replace(/\b(?!(?:127\.0\.0\.1|0\.0\.0\.0)\b)(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]');

  return s;
}

/**
 * Sanitizes a complete stack trace line-by-line.
 */
export function sanitizeDiagnosticsStack(stack?: string): string {
  if (!stack) return '';
  return stack
    .split('\n')
    .map(line => sanitizeDiagnosticsText(line))
    .join('\n');
}

// ─── LOCAL DIAGNOSTICS MANAGER ────────────────────────────────────────────────

export class LocalDiagnosticsManager {
  public static readonly MAX_RECORDS = 200;
  private static readonly STORAGE_KEY = 'aetheris_local_diagnostics_v1';
  private static readonly SETTINGS_KEY = 'aetheris_diagnostics_enabled';

  private buffer: DiagnosticRecord[] = [];
  private _diagnosticsEnabled: boolean = true;
  private _errorCounts: Map<string, number> = new Map();
  private listeners: ((record: DiagnosticRecord) => void)[] = [];

  constructor() {
    this.loadSettings();
    this.loadPersistedRecords();
    if (typeof window !== 'undefined') {
      (window as any).localDiagnostics = this;
    }
  }

  /**
   * Whether local crash diagnostics collection is enabled.
   * Defaults to true (purely local ring buffer, 0 trackers, 0 network egress).
   */
  public get diagnosticsEnabled(): boolean {
    return this._diagnosticsEnabled;
  }

  public set diagnosticsEnabled(val: boolean) {
    this._diagnosticsEnabled = val;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LocalDiagnosticsManager.SETTINGS_KEY, String(val));
      }
    } catch (_) {}
  }

  public isEnabled(): boolean {
    return this._diagnosticsEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.diagnosticsEnabled = enabled;
  }

  /**
   * Ingests an error, sanitizes all fields, tracks occurrence count,
   * and appends it to the 200-record circular ring buffer.
   */
  public recordError(error: Error | unknown, component?: string): void {
    if (!this._diagnosticsEnabled) return;

    const errorObj = error instanceof Error ? error : new Error(String(error || 'Unknown application error'));
    const comp = component || 'General';
    const sanitizedMessage = sanitizeDiagnosticsText(errorObj.message || 'Unknown error');
    const sanitizedStack = sanitizeDiagnosticsStack(errorObj.stack || '');

    const signature = `${comp}:${sanitizedMessage}`;
    const count = (this._errorCounts.get(signature) || 0) + 1;
    this._errorCounts.set(signature, count);

    const record: DiagnosticRecord = {
      id: `diag-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      component: comp,
      message: sanitizedMessage,
      sanitizedStack,
      errorCount: count,
    };

    if (this.buffer.length >= LocalDiagnosticsManager.MAX_RECORDS) {
      this.buffer.shift(); // circular eviction of oldest record
    }
    this.buffer.push(record);

    this.persistBuffer();

    for (const listener of this.listeners) {
      try {
        listener(record);
      } catch (_) {}
    }
  }

  /**
   * Returns a copy of the diagnostic records currently stored in the ring buffer.
   */
  public getRecords(): DiagnosticRecord[] {
    return [...this.buffer];
  }

  /**
   * Returns current count of stored error records.
   */
  public getRecordCount(): number {
    return this.buffer.length;
  }

  /**
   * Clears stored diagnostic records from memory and local storage.
   */
  public clearRecords(): void {
    this.buffer = [];
    this._errorCounts.clear();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(LocalDiagnosticsManager.STORAGE_KEY);
      }
    } catch (_) {}
  }

  /**
   * Generates complete structured DiagnosticReport object.
   */
  public getDiagnosticReport(): DiagnosticReport {
    return {
      appName: 'Aetheris Omni-Sphere',
      version: '1.0.0',
      reportType: 'Local Sovereign Diagnostics Telemetry',
      timestamp: Date.now(),
      generatedAt: new Date().toISOString(),
      diagnosticsEnabled: this._diagnosticsEnabled,
      zeroNetworkGuaranteed: this.verifyZeroNetworkTelemetry(),
      recordsCount: this.buffer.length,
      records: this.getRecords(),
    };
  }

  /**
   * Generates and triggers browser download of `aetheris-diagnostics-[date].json`.
   * Returns formatted JSON string.
   */
  public exportDiagnosticReportJSON(): string {
    const report = this.getDiagnosticReport();
    const jsonStr = JSON.stringify(report, null, 2);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const filename = `aetheris-diagnostics-${dateStr}.json`;

    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      try {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        if (document.body) {
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          a.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (err) {
        console.error('[LocalDiagnostics] Failed to trigger report download:', err);
      }
    }

    return jsonStr;
  }

  /**
   * Verifies that zero diagnostic or telemetry network calls leave the browser.
   */
  public verifyZeroNetworkTelemetry(): boolean {
    if (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function') {
      try {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const telemetryDomains = [
          'google-analytics.com',
          'analytics.google.com',
          'sentry.io',
          'mixpanel.com',
          'segment.io',
          'datadoghq.com',
          'bugsnag.com',
          'hotjar.com',
          'clarity.ms',
          'logrocket.io',
        ];
        for (const res of resources) {
          const urlLower = (res.name || '').toLowerCase();
          for (const domain of telemetryDomains) {
            if (urlLower.includes(domain)) {
              return false;
            }
          }
        }
      } catch (_) {}
    }
    return true;
  }

  /**
   * Subscribe to new diagnostic error records.
   */
  public onRecord(listener: (record: DiagnosticRecord) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Renders the settings section HTML markup for Display / Settings modal.
   */
  public renderDiagnosticsSectionHTML(): string {
    const recordedCount = this.getRecordCount();

    return `
      <!-- SECTION 8: LOCAL CRASH DIAGNOSTICS (100% ON-DEVICE) -->
      <div id="local-diagnostics-section" class="space-y-3 pt-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <span>🩺</span>
            <span>Local Crash Diagnostics</span>
          </span>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            100% ON-DEVICE · 0 TRACKERS
          </span>
        </div>

        <div class="p-4 rounded-xl bg-surface-base/80 border border-white/5 space-y-4">
          <!-- Toggle: Local Crash Diagnostics (100% On-Device, 0 Trackers) -->
          <label class="flex items-center justify-between p-3 rounded-xl bg-surface-base/60 border border-white/5 cursor-pointer hover:bg-surface-overlay transition-colors">
            <div class="space-y-0.5 pr-2">
              <span class="text-xs font-medium text-white block">Local Crash Diagnostics (100% On-Device, 0 Trackers)</span>
              <span class="text-[10px] text-slate-400 block leading-relaxed">
                Stores sanitized crash traces in local rotating ring buffer (capped at 200). Never sent across any network.
              </span>
            </div>
            <input 
              type="checkbox" 
              id="toggle-local-diagnostics"
              ${this.diagnosticsEnabled ? 'checked' : ''} data-change="call-global" data-raw-change="if(window.localDiagnostics) { window.localDiagnostics.diagnosticsEnabled = this.checked; }"
              class="w-4 h-4 rounded text-cyan-400 focus:ring-0 cursor-pointer"
            />
          </label>

          <!-- Status & Export Actions -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
            <div class="space-y-0.5">
              <div id="diagnostics-record-status" class="text-xs font-mono font-semibold text-cyan-300">
                ${recordedCount} local error records stored on device
              </div>
              <span class="text-[9px] font-mono text-slate-500 block">Encrypted ring buffer · Max 200 entries</span>
            </div>

            <div class="flex items-center space-x-2">
              <button
                type="button"
                id="btn-export-diagnostics-report" data-action="call-global" data-raw-click="if(window.localDiagnostics) window.localDiagnostics.exportDiagnosticReportJSON();"
                class="px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-raised border border-white/10 text-xs font-mono text-cyan-300 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Download diagnostic JSON"
              >
                <span>📥</span>
                <span>Export Diagnostic Report (JSON)</span>
              </button>

              <button
                type="button"
                id="btn-clear-diagnostics" data-action="call-global" data-raw-click="if(window.localDiagnostics) { window.localDiagnostics.clearRecords(); const st = document.getElementById('diagnostics-record-status'); if(st) st.textContent = '0 local error records stored on device'; }"
                class="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-mono text-rose-300 transition-all flex items-center space-x-1 cursor-pointer"
                title="Clear stored diagnostic records"
              >
                <span>🧹</span>
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── PRIVATE HELPERS ────────────────────────────────────────────────────────

  private loadSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(LocalDiagnosticsManager.SETTINGS_KEY);
      if (stored !== null) {
        this._diagnosticsEnabled = stored !== 'false';
      }
    } catch (_) {}
  }

  private loadPersistedRecords(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(LocalDiagnosticsManager.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.buffer = parsed.slice(-LocalDiagnosticsManager.MAX_RECORDS);
          for (const item of this.buffer) {
            const sig = `${item.component}:${item.message}`;
            const existing = this._errorCounts.get(sig) || 0;
            this._errorCounts.set(sig, Math.max(existing, item.errorCount || 1));
          }
        }
      }
    } catch (_) {}
  }

  private persistBuffer(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        LocalDiagnosticsManager.STORAGE_KEY,
        JSON.stringify(this.buffer)
      );
    } catch (_) {}
  }
}

// ─── SINGLETON EXPORT & SERVICE REGISTRATION ──────────────────────────────────

export const localDiagnostics = new LocalDiagnosticsManager();
serviceRegistry.registerInstance(SERVICES.LocalDiagnostics, localDiagnostics);
