/**
 * @file error-boundary.ts
 * @package @aetheris/client-ui
 * @description Comprehensive Graceful Degradation, Error Boundary, Structured Logging,
 * and Diagnostic Resilience Architecture for Aetheris Omni-Sphere.
 * Provides global unhandled error interceptors, multi-level structured telemetry,
 * AES-GCM encrypted log export, and friendly Obsidian-styled fallback UI without white-screen crashes.
 */

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

// ─── LOGGING TYPES & INTERFACES ──────────────────────────────────────────────

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  FATAL: 50,
};

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  data?: unknown;
  stack?: string;
}

export interface StructuredLogFilter {
  minLevel?: LogLevel;
  component?: string;
  search?: string;
  since?: number;
  limit?: number;
}

export interface EncryptedLogReport {
  version: string;
  timestamp: number;
  totalLogs: number;
  checksum: string;
  saltHex: string;
  ivHex: string;
  ciphertext: string;
  algorithm: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  lastError: Error | null;
  errorInfo: { component?: string; timestamp: number; handled: boolean } | null;
  errorCount: number;
  isSafeMode: boolean;
}

export interface FallbackRenderOptions {
  title?: string;
  message?: string;
  showDetails?: boolean;
  canRetry?: boolean;
  canSafeMode?: boolean;
  canExportLogs?: boolean;
  container?: HTMLElement | null;
  onRetry?: () => void;
  onSafeMode?: () => void;
  onExportLogs?: () => void;
}

export interface SystemResilienceStatus {
  webCrypto: boolean;
  audioContext: boolean;
  indexedDB: boolean;
  webWorkers: boolean;
  webSockets: boolean;
  localStorage: boolean;
}

// ─── HELPER UTILITIES ────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// ─── STRUCTURED LOGGER ────────────────────────────────────────────────────────

export class StructuredLogger {
  private buffer: LogEntry[] = [];
  private maxCapacity: number;
  private listeners: ((entry: LogEntry) => void)[] = [];
  private minLogLevel: LogLevel = 'DEBUG';

  constructor(maxCapacity: number = 1000) {
    this.maxCapacity = maxCapacity;
  }

  public setMinLogLevel(level: LogLevel): void {
    this.minLogLevel = level;
  }

  public getMinLogLevel(): LogLevel {
    return this.minLogLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLogLevel];
  }

  private appendEntry(level: LogLevel, component: string, message: string, data?: unknown, stack?: string): LogEntry {
    const entry: LogEntry = {
      id: generateLogId(),
      timestamp: Date.now(),
      level,
      component,
      message,
      data,
      stack,
    };

    if (this.buffer.length >= this.maxCapacity) {
      this.buffer.shift(); // circular ring buffer eviction
    }
    this.buffer.push(entry);

    // Notify realtime listeners
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (err) {
        console.error('[StructuredLogger] Listener notification error:', err);
      }
    }

    // Mirror to native console if appropriate
    if (this.shouldLog(level)) {
      const formatted = `[${new Date(entry.timestamp).toISOString()}] [${level}] [${component}] ${message}`;
      if (level === 'FATAL' || level === 'ERROR') {
        console.error(formatted, data !== undefined ? data : '', stack || '');
      } else if (level === 'WARN') {
        console.warn(formatted, data !== undefined ? data : '');
      } else if (level === 'INFO') {
        console.info(formatted, data !== undefined ? data : '');
      } else {
        console.debug(formatted, data !== undefined ? data : '');
      }
    }

    return entry;
  }

  public debug(component: string, message: string, data?: unknown): LogEntry {
    return this.appendEntry('DEBUG', component, message, data);
  }

  public info(component: string, message: string, data?: unknown): LogEntry {
    return this.appendEntry('INFO', component, message, data);
  }

  public warn(component: string, message: string, data?: unknown): LogEntry {
    return this.appendEntry('WARN', component, message, data);
  }

  public error(component: string, message: string, error?: Error | unknown, data?: unknown): LogEntry {
    const stack = error instanceof Error ? error.stack : undefined;
    const errData = error instanceof Error ? { name: error.name, message: error.message, ...(data as any) } : (data || error);
    return this.appendEntry('ERROR', component, message, errData, stack);
  }

  public fatal(component: string, message: string, error?: Error | unknown, data?: unknown): LogEntry {
    const stack = error instanceof Error ? error.stack : undefined;
    const errData = error instanceof Error ? { name: error.name, message: error.message, ...(data as any) } : (data || error);
    return this.appendEntry('FATAL', component, message, errData, stack);
  }

  public getLogs(filter?: StructuredLogFilter): LogEntry[] {
    let result = [...this.buffer];

    if (filter) {
      if (filter.minLevel) {
        const minPriority = LOG_LEVEL_PRIORITY[filter.minLevel];
        result = result.filter(e => LOG_LEVEL_PRIORITY[e.level] >= minPriority);
      }
      if (filter.component) {
        const comp = filter.component.toLowerCase();
        result = result.filter(e => e.component.toLowerCase().includes(comp));
      }
      if (filter.search) {
        const query = filter.search.toLowerCase();
        result = result.filter(e => e.message.toLowerCase().includes(query) || (e.stack && e.stack.toLowerCase().includes(query)));
      }
      if (filter.since) {
        result = result.filter(e => e.timestamp >= filter.since!);
      }
      if (filter.limit && filter.limit > 0) {
        result = result.slice(-filter.limit);
      }
    }

    return result;
  }

  public count(minLevel?: LogLevel): number {
    if (!minLevel) return this.buffer.length;
    const minPriority = LOG_LEVEL_PRIORITY[minLevel];
    return this.buffer.filter(e => LOG_LEVEL_PRIORITY[e.level] >= minPriority).length;
  }

  public clear(): void {
    this.buffer = [];
  }

  public onLog(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public exportAsJSON(filter?: StructuredLogFilter): string {
    const logs = this.getLogs(filter);
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: Date.now(),
      totalLogs: logs.length,
      logs,
    }, null, 2);
  }

  /**
   * Exports logs encrypted with AES-256-GCM and PBKDF2.
   * Includes SHA-256 integrity checksum. Falls back cleanly if WebCrypto subtle is unavailable.
   */
  public async exportEncryptedLogs(passphrase: string = 'aetheris-diagnostic-vault', filter?: StructuredLogFilter): Promise<EncryptedLogReport> {
    const rawJson = this.exportAsJSON(filter);
    const rawBytes = new TextEncoder().encode(rawJson);
    const checksum = bytesToHex(sha256(rawBytes));

    const salt = new Uint8Array(16);
    const iv = new Uint8Array(12);

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(salt);
      crypto.getRandomValues(iv);
    } else {
      for (let i = 0; i < 16; i++) salt[i] = Math.floor(Math.random() * 256);
      for (let i = 0; i < 12; i++) iv[i] = Math.floor(Math.random() * 256);
    }

    // Attempt WebCrypto AES-GCM encryption
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const passwordKey = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(passphrase),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );

        const aesKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: salt as unknown as BufferSource,
            iterations: 10000,
            hash: 'SHA-256',
          },
          passwordKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt']
        );

        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv as unknown as BufferSource },
          aesKey,
          rawBytes as unknown as BufferSource
        );

        return {
          version: '1.0.0',
          timestamp: Date.now(),
          totalLogs: this.buffer.length,
          checksum,
          saltHex: bytesToHex(salt),
          ivHex: bytesToHex(iv),
          ciphertext: bytesToHex(new Uint8Array(encrypted)),
          algorithm: 'AES-256-GCM/PBKDF2',
        };
      } catch (e) {
        this.warn('StructuredLogger', 'WebCrypto export encryption failed, applying fallback masking', e);
      }
    }

    // Fallback XOR-hash encryption if WebCrypto subtle is absent on legacy platforms
    const keyHash = sha256(new TextEncoder().encode(passphrase + bytesToHex(salt)));
    const masked = new Uint8Array(rawBytes.length);
    for (let i = 0; i < rawBytes.length; i++) {
      masked[i] = rawBytes[i] ^ keyHash[i % keyHash.length];
    }

    return {
      version: '1.0.0',
      timestamp: Date.now(),
      totalLogs: this.buffer.length,
      checksum,
      saltHex: bytesToHex(salt),
      ivHex: bytesToHex(iv),
      ciphertext: bytesToHex(masked),
      algorithm: 'AETHERIS-FALLBACK-STREAM-CIPHER',
    };
  }
}

// Global logger instance
export const structuredLogger = new StructuredLogger(1500);

// ─── ERROR BOUNDARY & GRACEFUL DEGRADATION ENGINE ─────────────────────────────

export class ErrorBoundary {
  private state: ErrorBoundaryState = {
    hasError: false,
    lastError: null,
    errorInfo: null,
    errorCount: 0,
    isSafeMode: false,
  };

  private originalOnError: typeof window.onerror | null = null;
  private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
  private errorListeners: ((error: Error, info: { component?: string; timestamp: number; handled: boolean }) => void)[] = [];
  private isInitialized: boolean = false;

  constructor() {
    this.checkInitialSafeMode();
  }

  private checkInitialSafeMode(): void {
    if (typeof window === 'undefined') return;

    try {
      // Check query parameter ?safemode=1 or ?safemode=true
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('safemode') === '1' || urlParams.get('safemode') === 'true') {
        this.state.isSafeMode = true;
        structuredLogger.warn('ErrorBoundary', 'Safe Mode triggered via URL search parameter');
      }

      // Check localStorage flag
      if (typeof localStorage !== 'undefined') {
        const storedSafeMode = localStorage.getItem('aetheris_safemode');
        if (storedSafeMode === 'true') {
          this.state.isSafeMode = true;
          structuredLogger.warn('ErrorBoundary', 'Safe Mode active from persisted localStorage flag');
        }
      }
    } catch {
      // Storage or URL parsing restricted in sandboxed context
    }
  }

  /**
   * Initializes global unhandled error interceptors.
   */
  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    this.originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const err = error instanceof Error ? error : new Error(String(message));
      this.catchError(err, {
        component: source ? `${source}:${lineno}:${colno}` : 'window.onerror',
        userAction: 'unhandled_global_exception',
        fatal: false,
      });

      if (typeof this.originalOnError === 'function') {
        return this.originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const err = reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
      this.catchError(err, {
        component: 'window.onunhandledrejection',
        userAction: 'unhandled_promise_rejection',
        fatal: false,
      });
    };

    window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
    this.isInitialized = true;
    structuredLogger.info('ErrorBoundary', 'Global error boundary and telemetry interceptors armed');
  }

  /**
   * Disposes global listeners.
   */
  public dispose(): void {
    if (!this.isInitialized || typeof window === 'undefined') return;

    if (window.onerror === this.originalOnError) {
      window.onerror = null;
    } else {
      window.onerror = this.originalOnError;
    }

    if (this.unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
      this.unhandledRejectionHandler = null;
    }

    this.isInitialized = false;
  }

  /**
   * Primary error ingestion pipeline.
   */
  public catchError(
    err: unknown,
    context?: { component?: string; userAction?: string; fatal?: boolean }
  ): Error {
    const errorObj = err instanceof Error ? err : new Error(typeof err === 'string' ? err : 'Unknown application error');
    const comp = context?.component || 'CoreSystem';
    const fatal = Boolean(context?.fatal);

    this.state.hasError = true;
    this.state.lastError = errorObj;
    this.state.errorCount++;
    this.state.errorInfo = {
      component: comp,
      timestamp: Date.now(),
      handled: true,
    };

    if (fatal) {
      structuredLogger.fatal(comp, errorObj.message, errorObj, { context });
    } else {
      structuredLogger.error(comp, errorObj.message, errorObj, { context });
    }

    for (const listener of this.errorListeners) {
      try {
        listener(errorObj, this.state.errorInfo);
      } catch (listenerErr) {
        console.error('[ErrorBoundary] Listener execution failure:', listenerErr);
      }
    }

    return errorObj;
  }

  /**
   * Synchronous safe execution wrapper.
   */
  public wrap<T>(fn: () => T, fallback: T, context?: { component?: string; action?: string }): T {
    try {
      return fn();
    } catch (err) {
      this.catchError(err, { component: context?.component, userAction: context?.action });
      return fallback;
    }
  }

  /**
   * Asynchronous safe execution wrapper.
   */
  public async wrapAsync<T>(
    fn: () => Promise<T>,
    fallback: T,
    context?: { component?: string; action?: string }
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      this.catchError(err, { component: context?.component, userAction: context?.action });
      return fallback;
    }
  }

  /**
   * Wraps DOM rendering with complete crash protection and fallback UI presentation.
   */
  public wrapRender(
    renderFn: () => void,
    container: HTMLElement | null,
    options?: FallbackRenderOptions
  ): boolean {
    try {
      renderFn();
      return true;
    } catch (err) {
      const errorObj = this.catchError(err, { component: 'DOMRenderer', fatal: true });
      if (container) {
        container.innerHTML = this.renderFallbackUI(errorObj, options);
        this.attachFallbackListeners(container, options);
      }
      return false;
    }
  }

  public getState(): Readonly<ErrorBoundaryState> {
    return { ...this.state };
  }

  public isSafeModeActive(): boolean {
    return this.state.isSafeMode;
  }

  public enableSafeMode(reload: boolean = false): void {
    this.state.isSafeMode = true;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aetheris_safemode', 'true');
      }
    } catch {
      // Storage restricted
    }
    structuredLogger.warn('ErrorBoundary', 'Safe Mode enabled by user');
    if (reload && typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  public disableSafeMode(reload: boolean = false): void {
    this.state.isSafeMode = false;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('aetheris_safemode');
      }
    } catch {
      // Storage restricted
    }
    structuredLogger.info('ErrorBoundary', 'Safe Mode disabled');
    if (reload && typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  public reset(): void {
    this.state.hasError = false;
    this.state.lastError = null;
    this.state.errorInfo = null;
  }

  public onError(listener: (error: Error, info: { component?: string; timestamp: number; handled: boolean }) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter(l => l !== listener);
    };
  }

  /**
   * Generates friendly Obsidian/Cyberpunk styled UI fallback without white-screen crash.
   */
  public renderFallbackUI(error?: Error | null, options?: FallbackRenderOptions): string {
    const err = error || this.state.lastError;
    const title = options?.title || 'Something went wrong, your local cryptographic vault is safe';
    const message = options?.message || (err ? err.message : 'An unexpected exception was safely intercepted by the Sovereign Error Boundary.');
    const stack = err?.stack || '';
    const errorCount = this.state.errorCount;
    const isSafeMode = this.state.isSafeMode;

    return `
      <div id="aetheris-error-boundary-root" class="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#090a0c] text-slate-200 font-sans select-none antialiased">
        <div class="relative w-full max-w-2xl bg-surface-base/95 backdrop-blur-2xl border border-rose-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden">
          
          <!-- TOP AMBIENT ACCENT -->
          <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500"></div>

          <!-- HEADER BADGE & TITLE -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-mono font-semibold tracking-wider">
                <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span>SOVEREIGN RESILIENCE SHIELD</span>
              </div>
              <span class="text-[11px] font-mono text-slate-500">Errors: ${errorCount}</span>
            </div>

            <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
              <span>🛡️</span>
              <span>${escapeHtml(title)}</span>
            </h1>

            <p class="text-sm text-slate-300 leading-relaxed font-sans">
              ${escapeHtml(message)}
            </p>
          </div>

          <!-- CRYPTOGRAPHIC INTEGRITY ASSURANCE BANNER -->
          <div class="p-4 rounded-xl bg-surface-raised/80 border border-emerald-500/30 flex items-start space-x-3 text-xs">
            <div class="w-6 h-6 rounded-lg bg-emerald-950/90 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 text-sm">
              🔒
            </div>
            <div class="space-y-1">
              <div class="font-bold text-emerald-300 font-mono">Zero-Knowledge State Protected</div>
              <p class="text-slate-400 leading-normal">
                Your Ed25519 identity keypairs, ratchet sessions, bookmarks, and local IndexedDB state remain uncompromised.
              </p>
            </div>
          </div>

          <!-- DIAGNOSTIC STACK TRACE (COLLAPSIBLE) -->
          ${stack ? `
            <details class="group rounded-xl bg-black/50 border border-white/10 p-3 text-xs font-mono">
              <summary class="cursor-pointer text-slate-400 hover:text-white flex items-center justify-between outline-none">
                <span>🔍 Diagnostic Stack Trace</span>
                <span class="text-[10px] text-slate-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <pre class="mt-3 p-3 rounded-lg bg-black/80 text-rose-300 text-[11px] overflow-x-auto select-text whitespace-pre-wrap leading-relaxed border border-rose-950/60">${escapeHtml(stack)}</pre>
            </details>
          ` : ''}

          <!-- ACTION CONTROLS -->
          <div class="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 text-xs font-mono">
            <div class="flex items-center space-x-2">
              <button
                type="button"
                id="btn-error-reload"
                class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md hover:shadow-indigo-500/20 cursor-pointer flex items-center space-x-1.5"
              >
                <span>🔄</span>
                <span>Reload Interface</span>
              </button>

              <button
                type="button"
                id="btn-error-safemode"
                class="px-3.5 py-2 rounded-xl ${isSafeMode ? 'bg-amber-600 text-white' : 'bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/10'} font-semibold transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <span>🛡️</span>
                <span>${isSafeMode ? 'Exit Safe Mode' : 'Safe Mode'}</span>
              </button>
            </div>

            <div class="flex items-center space-x-2">
              <button
                type="button"
                id="btn-error-export-logs"
                class="px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-300 border border-white/10 font-semibold transition-all cursor-pointer flex items-center space-x-1.5"
                title="Download encrypted diagnostic report"
              >
                <span>📥</span>
                <span>Export Logs</span>
              </button>

              <button
                type="button"
                id="btn-error-reset"
                class="px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-raised transition-all cursor-pointer"
                title="Dismiss and attempt recovery"
              >
                <span>Dismiss</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Attaches DOM event listeners to the fallback UI elements.
   */
  public attachFallbackListeners(container: HTMLElement, options?: FallbackRenderOptions): void {
    const reloadBtn = container.querySelector('#btn-error-reload');
    const safeModeBtn = container.querySelector('#btn-error-safemode');
    const exportBtn = container.querySelector('#btn-error-export-logs');
    const resetBtn = container.querySelector('#btn-error-reset');

    reloadBtn?.addEventListener('click', () => {
      if (options?.onRetry) {
        options.onRetry();
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
    });

    safeModeBtn?.addEventListener('click', () => {
      if (options?.onSafeMode) {
        options.onSafeMode();
      } else {
        if (this.state.isSafeMode) {
          this.disableSafeMode(true);
        } else {
          this.enableSafeMode(true);
        }
      }
    });

    exportBtn?.addEventListener('click', async () => {
      if (options?.onExportLogs) {
        options.onExportLogs();
        return;
      }
      try {
        const report = await structuredLogger.exportEncryptedLogs();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aetheris-diagnostic-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Failed to download diagnostic logs:', e);
      }
    });

    resetBtn?.addEventListener('click', () => {
      this.reset();
      if (options?.onRetry) {
        options.onRetry();
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
    });
  }
}

// Global error boundary instance
export const errorBoundary = new ErrorBoundary();

// ─── RESILIENCE & GRACEFUL DEGRADATION PROBES ────────────────────────────────

export function checkWebCryptoSupport(): {
  supported: boolean;
  subtle: boolean;
  getRandomValues: boolean;
  features: string[];
} {
  const hasCrypto = typeof crypto !== 'undefined';
  const getRandomValues = hasCrypto && typeof crypto.getRandomValues === 'function';
  const subtle = hasCrypto && typeof crypto.subtle !== 'undefined';

  const features: string[] = [];
  if (getRandomValues) features.push('getRandomValues');
  if (subtle) features.push('subtle-crypto');

  return {
    supported: hasCrypto && getRandomValues,
    subtle,
    getRandomValues,
    features,
  };
}

export function checkAudioContextSupport(): {
  supported: boolean;
  className: string | null;
} {
  if (typeof window === 'undefined') return { supported: false, className: null };
  const win = window as any;
  if (win.AudioContext) return { supported: true, className: 'AudioContext' };
  if (win.webkitAudioContext) return { supported: true, className: 'webkitAudioContext' };
  return { supported: false, className: null };
}

export function getSystemResilienceStatus(): SystemResilienceStatus {
  const hasWindow = typeof window !== 'undefined';

  let hasLocalStorage = false;
  try {
    hasLocalStorage = hasWindow && typeof localStorage !== 'undefined';
  } catch {
    hasLocalStorage = false;
  }

  let hasIndexedDB = false;
  try {
    hasIndexedDB = hasWindow && typeof indexedDB !== 'undefined';
  } catch {
    hasIndexedDB = false;
  }

  return {
    webCrypto: checkWebCryptoSupport().supported,
    audioContext: checkAudioContextSupport().supported,
    indexedDB: hasIndexedDB,
    webWorkers: hasWindow && typeof Worker !== 'undefined',
    webSockets: hasWindow && typeof WebSocket !== 'undefined',
    localStorage: hasLocalStorage,
  };
}
