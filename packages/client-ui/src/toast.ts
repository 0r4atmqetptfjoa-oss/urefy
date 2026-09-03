// ============================================================
// toast.ts — Aetheris Sovereign HUD Toast Notification System
// Lightweight, reactive, hardware-accelerated floating HUD toasts.
// ============================================================

import './window-augmentation.js';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastOptions {
  message: string;
  icon?: string;
  type?: ToastType;
  durationMs?: number;
}

export interface ToastItem {
  id: string;
  message: string;
  icon: string;
  type: ToastType;
  durationMs: number;
  createdAt: number;
  element?: HTMLElement;
}

export class ToastManager {
  private _toasts: ToastItem[] = [];
  private _container: HTMLElement | null = null;
  private static readonly DEFAULT_DURATION_MS = 3200;

  constructor() {
    if (typeof document !== 'undefined') {
      this._ensureContainer();
    }
  }

  private _ensureContainer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    let container = document.getElementById('hud-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'hud-toast-container';
      container.className =
        'fixed bottom-5 right-5 z-[10001] flex flex-col space-y-2.5 max-w-[90vw] sm:max-w-sm pointer-events-none transition-all';
      document.body.appendChild(container);
    }
    this._container = container;
    return container;
  }

  public show(options: ToastOptions | string): ToastItem {
    const opts: ToastOptions = typeof options === 'string' ? { message: options } : options;
    const type = opts.type || 'info';
    const durationMs = opts.durationMs ?? ToastManager.DEFAULT_DURATION_MS;

    const defaultIcons: Record<ToastType, string> = {
      success: '✓',
      info: '✦',
      warning: '⚠',
      error: '✕',
    };

    const toast: ToastItem = {
      id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      message: opts.message,
      icon: opts.icon || defaultIcons[type],
      type,
      durationMs,
      createdAt: Date.now(),
    };

    this._toasts.push(toast);
    this._renderToast(toast);

    return toast;
  }

  public success(message: string, icon: string = '✓'): ToastItem {
    return this.show({ message, icon, type: 'success' });
  }

  public info(message: string, icon: string = '✦'): ToastItem {
    return this.show({ message, icon, type: 'info' });
  }

  public warning(message: string, icon: string = '⚠'): ToastItem {
    return this.show({ message, icon, type: 'warning' });
  }

  public error(message: string, icon: string = '✕'): ToastItem {
    return this.show({ message, icon, type: 'error' });
  }

  public dismiss(id: string): void {
    const idx = this._toasts.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const toast = this._toasts[idx];
    if (toast.element) {
      toast.element.classList.add('opacity-0', 'translate-y-2', 'scale-95');
      setTimeout(() => {
        toast.element?.remove();
      }, 200);
    }
    this._toasts.splice(idx, 1);
  }

  public clearAll(): void {
    const container = this._ensureContainer();
    if (container) container.innerHTML = '';
    this._toasts = [];
  }

  public get activeToasts(): ToastItem[] {
    return [...this._toasts];
  }

  private _renderToast(toast: ToastItem): void {
    if (typeof document === 'undefined') return;
    const container = this._ensureContainer();
    if (!container || typeof container.appendChild !== 'function') return;

    const typeStyles: Record<ToastType, { bg: string; border: string; text: string; iconBg: string }> = {
      success: {
        bg: 'bg-slate-900/95 backdrop-blur-xl',
        border: 'border-emerald-500/40',
        text: 'text-emerald-300',
        iconBg: 'bg-emerald-500/20 text-emerald-300',
      },
      info: {
        bg: 'bg-slate-900/95 backdrop-blur-xl',
        border: 'border-cyan-500/40',
        text: 'text-cyan-300',
        iconBg: 'bg-cyan-500/20 text-cyan-300',
      },
      warning: {
        bg: 'bg-slate-900/95 backdrop-blur-xl',
        border: 'border-amber-500/40',
        text: 'text-amber-300',
        iconBg: 'bg-amber-500/20 text-amber-300',
      },
      error: {
        bg: 'bg-slate-900/95 backdrop-blur-xl',
        border: 'border-rose-500/40',
        text: 'text-rose-300',
        iconBg: 'bg-rose-500/20 text-rose-300',
      },
    };

    const style = typeStyles[toast.type];

    const el = document.createElement('div');
    el.id = toast.id;
    el.className = `hud-toast-card pointer-events-auto flex items-center space-x-3 px-4 py-3 rounded-2xl border ${style.border} ${style.bg} shadow-2xl shadow-black/80 transition-all duration-200 transform translate-y-0 opacity-100 cursor-pointer select-none`;
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'polite');

    el.innerHTML = `
      <span class="w-7 h-7 rounded-xl ${style.iconBg} flex items-center justify-center text-xs font-bold font-mono flex-shrink-0">
        ${toast.icon}
      </span>
      <div class="flex-1 text-xs font-medium text-slate-200 leading-snug">
        ${this._escapeHtml(toast.message)}
      </div>
      <button type="button" class="text-slate-500 hover:text-slate-300 text-xs px-1 py-0.5 ml-1 flex-shrink-0 cursor-pointer transition-colors" title="Dismiss">
        ✕
      </button>
    `;

    el.addEventListener('click', () => {
      this.dismiss(toast.id);
    });

    toast.element = el;
    container.appendChild(el);

    if (toast.durationMs > 0) {
      setTimeout(() => {
        this.dismiss(toast.id);
      }, toast.durationMs);
    }
  }

  private _escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

export const toastManager = new ToastManager();

if (typeof window !== 'undefined') {
  (window as any).toastManager = toastManager;
}
