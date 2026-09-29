/**
 * @file dialog-modal.ts
 * @package @aetheris/client-ui
 * @description Sovereign Accessible Modal Dialog System.
 * Replaces native browser alert(), confirm(), and prompt() with
 * hardware-accelerated, theme-aware, focus-trapped, accessible modals.
 */

import { serviceRegistry, SERVICES } from './service-registry.js';
import './window-augmentation.js';
import { t } from './i18n.js';

export interface DialogOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  destructive?: boolean;
  danger?: boolean;
}

export class SovereignDialog {
  private container: HTMLElement | null = null;
  private activeResolver: ((value: any) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).sovereignDialog = this;
    }
  }

  private _ensureContainer(): HTMLElement {
    let el = document.getElementById('sovereign-dialog-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sovereign-dialog-root';
      el.className = 'fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md hidden select-none transition-opacity duration-150';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-labelledby', 'sovereign-dialog-title');
      el.addEventListener('click', (e) => {
        if (e.target === el && this.activeResolver) {
          const cancelBtn = document.getElementById('sovereign-dialog-cancel-btn');
          if (cancelBtn) cancelBtn.click();
          else {
            const confirmBtn = document.getElementById('sovereign-dialog-confirm-btn');
            if (confirmBtn) confirmBtn.click();
          }
        }
      });
      document.body.appendChild(el);
    }
    this.container = el;
    return el;
  }

  public alert(message: string, options?: DialogOptions | string): Promise<void> {
    const opts: DialogOptions = typeof options === 'string' ? { title: options } : (options || {});
    const title = opts.title || 'Notification';
    const type = opts.type || 'info';
    const confirmText = opts.confirmText || t('common.confirm', undefined, 'OK');

    const iconMap = {
      info: '✦',
      warning: '⚠',
      error: '✕',
      success: '✓',
    };

    const colorMap = {
      info: 'bg-[var(--color-accent,#e89e38)]/15 border-[var(--color-accent,#e89e38)]/30 text-[var(--color-accent,#e89e38)]',
      warning: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      error: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    };

    return new Promise((resolve) => {
      if (typeof document === 'undefined') {
        resolve();
        return;
      }

      const container = this._ensureContainer();
      this.activeResolver = resolve;

      container.innerHTML = `
        <div class="w-full max-w-md bg-surface-overlay border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
          <div class="flex items-center space-x-3 border-b border-white/10 pb-3">
            <div class="w-10 h-10 rounded-xl bg-surface-raised border flex items-center justify-center text-lg font-bold ${colorMap[type]}">
              ${iconMap[type]}
            </div>
            <div>
              <h3 id="sovereign-dialog-title" class="text-base font-bold text-white tracking-tight">${this._escapeHtml(title)}</h3>
              <p class="text-xs text-slate-400">Sovereign Security Notification</p>
            </div>
          </div>
          <div class="text-[15px] text-slate-200 leading-relaxed font-sans max-h-60 overflow-y-auto whitespace-pre-wrap select-text">
            ${this._escapeHtml(message)}
          </div>
          <div class="pt-2 flex justify-end">
            <button
              type="button"
              id="sovereign-dialog-confirm-btn"
              class="min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--color-accent,#e89e38)] hover:brightness-110 text-slate-950 text-sm font-bold shadow-md transition-all cursor-pointer active:scale-95"
            >
              ${this._escapeHtml(confirmText)}
            </button>
          </div>
        </div>
      `;

      container.classList.remove('hidden');

      const btn = document.getElementById('sovereign-dialog-confirm-btn');
      if (typeof btn?.focus === 'function') {
        btn.focus();
      }

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          cleanup();
          resolve();
        }
      };

      const cleanup = () => {
        container.classList.add('hidden');
        container.innerHTML = '';
        if (typeof window !== 'undefined') {
          window.removeEventListener('keydown', onKeyDown);
        }
        this.activeResolver = null;
      };

      if (typeof btn?.addEventListener === 'function') {
        btn.addEventListener('click', () => {
          cleanup();
          resolve();
        });
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', onKeyDown);
      }
    });
  }

  public confirm(message: string, options?: DialogOptions | string): Promise<boolean> {
    const opts: DialogOptions = typeof options === 'string' ? { title: options } : (options || {});
    const title = opts.title || 'Confirmation Required';
    const confirmText = opts.confirmText || t('common.confirm', undefined, 'Confirm');
    const cancelText = opts.cancelText || t('common.cancel', undefined, 'Cancel');
    const isDestructive = opts.destructive ?? false;

    return new Promise((resolve) => {
      if (typeof document === 'undefined') {
        resolve(true);
        return;
      }

      const container = this._ensureContainer();
      this.activeResolver = resolve;

      container.innerHTML = `
        <div class="w-full max-w-md bg-surface-overlay border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
          <div class="flex items-center space-x-3 border-b border-white/10 pb-3">
            <div class="w-10 h-10 rounded-xl ${isDestructive ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-[var(--color-accent,#e89e38)]/20 text-[var(--color-accent,#e89e38)] border-[var(--color-accent,#e89e38)]/30'} border flex items-center justify-center text-lg font-bold">
              ${isDestructive ? '🗑️' : '❓'}
            </div>
            <div>
              <h3 id="sovereign-dialog-title" class="text-base font-bold text-white tracking-tight">${this._escapeHtml(title)}</h3>
              <p class="text-xs text-slate-400">${isDestructive ? 'Action cannot be undone' : 'Please verify this action'}</p>
            </div>
          </div>
          <div class="text-[15px] text-slate-200 leading-relaxed font-sans max-h-60 overflow-y-auto whitespace-pre-wrap select-text">
            ${this._escapeHtml(message)}
          </div>
          <div class="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              id="sovereign-dialog-cancel-btn"
              class="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-surface-raised transition-all cursor-pointer"
            >
              ${this._escapeHtml(cancelText)}
            </button>
            <button
              type="button"
              id="sovereign-dialog-confirm-btn"
              class="min-h-[44px] px-6 py-2.5 rounded-xl ${isDestructive ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30' : 'bg-[var(--color-accent,#e89e38)] hover:brightness-110 text-slate-950'} text-sm font-bold shadow-md transition-all cursor-pointer active:scale-95"
            >
              ${this._escapeHtml(confirmText)}
            </button>
          </div>
        </div>
      `;

      container.classList.remove('hidden');

      const confirmBtn = document.getElementById('sovereign-dialog-confirm-btn');
      const cancelBtn = document.getElementById('sovereign-dialog-cancel-btn');
      if (typeof cancelBtn?.focus === 'function') {
        cancelBtn.focus();
      } else if (typeof confirmBtn?.focus === 'function') {
        confirmBtn.focus();
      }

      const cleanup = (val: boolean) => {
        container.classList.add('hidden');
        container.innerHTML = '';
        if (typeof window !== 'undefined') {
          window.removeEventListener('keydown', onKeyDown);
        }
        this.activeResolver = null;
        resolve(val);
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          cleanup(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          cleanup(true);
        }
      };

      if (typeof confirmBtn?.addEventListener === 'function') {
        confirmBtn.addEventListener('click', () => cleanup(true));
      }
      if (typeof cancelBtn?.addEventListener === 'function') {
        cancelBtn.addEventListener('click', () => cleanup(false));
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', onKeyDown);
      }
    });
  }

  public prompt(message: string, options?: (DialogOptions & { defaultValue?: string; placeholder?: string; inputType?: string }) | string): Promise<string | null> {
    const opts = typeof options === 'string' ? { title: options } : (options || {});
    const title = opts.title || 'Input Required';
    const defaultValue = opts.defaultValue || '';
    const placeholder = opts.placeholder || '';
    const inputType = opts.inputType || 'text';
    const confirmText = opts.confirmText || t('common.submit', undefined, 'Submit');
    const cancelText = opts.cancelText || t('common.cancel', undefined, 'Cancel');

    return new Promise((resolve) => {
      if (typeof document === 'undefined') {
        resolve(null);
        return;
      }

      const container = this._ensureContainer();
      this.activeResolver = resolve;

      container.innerHTML = `
        <div class="w-full max-w-md bg-surface-overlay border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
          <div class="flex items-center space-x-3 border-b border-white/10 pb-3">
            <div class="w-10 h-10 rounded-xl bg-[var(--color-accent,#e89e38)]/20 text-[var(--color-accent,#e89e38)] border border-[var(--color-accent,#e89e38)]/30 flex items-center justify-center text-lg font-bold">
              ✎
            </div>
            <div>
              <h3 id="sovereign-dialog-title" class="text-base font-bold text-white tracking-tight">${this._escapeHtml(title)}</h3>
              <p class="text-xs text-slate-400">Sovereign secure input</p>
            </div>
          </div>
          <div class="text-[15px] text-slate-200 leading-relaxed font-sans max-h-60 overflow-y-auto whitespace-pre-wrap select-text">
            ${this._escapeHtml(message)}
          </div>
          <div class="pt-1">
            <input
              type="${this._escapeHtml(inputType)}"
              id="sovereign-dialog-input"
              value="${this._escapeHtml(defaultValue)}"
              placeholder="${this._escapeHtml(placeholder)}"
              class="w-full px-3.5 py-2.5 min-h-[44px] bg-surface-base border border-white/15 rounded-xl text-[16px] sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-accent,#e89e38)] focus:ring-1 focus:ring-[var(--color-accent,#e89e38)]"
            />
          </div>
          <div class="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              id="sovereign-dialog-cancel-btn"
              class="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-surface-raised transition-all cursor-pointer"
            >
              ${this._escapeHtml(cancelText)}
            </button>
            <button
              type="button"
              id="sovereign-dialog-confirm-btn"
              class="min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--color-accent,#e89e38)] hover:brightness-110 text-slate-950 text-sm font-bold shadow-md transition-all cursor-pointer active:scale-95"
            >
              ${this._escapeHtml(confirmText)}
            </button>
          </div>
        </div>
      `;

      container.classList.remove('hidden');

      const inputEl = document.getElementById('sovereign-dialog-input') as HTMLInputElement | null;
      const confirmBtn = document.getElementById('sovereign-dialog-confirm-btn');
      const cancelBtn = document.getElementById('sovereign-dialog-cancel-btn');

      if (inputEl) {
        if (typeof inputEl.focus === 'function') inputEl.focus();
        if (typeof inputEl.select === 'function') inputEl.select();
      }

      const cleanup = (val: string | null) => {
        container.classList.add('hidden');
        container.innerHTML = '';
        if (typeof window !== 'undefined') {
          window.removeEventListener('keydown', onKeyDown);
        }
        this.activeResolver = null;
        resolve(val);
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          cleanup(null);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          cleanup(inputEl ? inputEl.value : null);
        }
      };

      if (typeof confirmBtn?.addEventListener === 'function') {
        confirmBtn.addEventListener('click', () => cleanup(inputEl ? inputEl.value : null));
      }
      if (typeof cancelBtn?.addEventListener === 'function') {
        cancelBtn.addEventListener('click', () => cleanup(null));
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', onKeyDown);
      }
    });
  }

  private _escapeHtml(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export const sovereignDialog = new SovereignDialog();
serviceRegistry.registerInstance(SERVICES.SovereignDialog || ('SovereignDialog' as any), sovereignDialog);
