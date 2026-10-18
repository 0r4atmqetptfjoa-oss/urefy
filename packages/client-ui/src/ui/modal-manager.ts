export interface ModalOptions {
  id: string;
  title?: string;
  contentHtml: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  onMount?: (modalEl: HTMLElement) => void;
  onClose?: () => void;
}

interface ActiveModalEntry {
  options: ModalOptions;
  triggerElement: HTMLElement | null;
  cleanupFocusTrap: () => void;
}

class UnifiedModalManager {
  private stack: ActiveModalEntry[] = [];
  private rootId = 'app-modal-root';
  private globalKeyListenerBound = false;

  private ensureRoot(): HTMLElement {
    let root = document.getElementById(this.rootId);
    if (!root) {
      root = document.createElement('div');
      root.id = this.rootId;
      root.setAttribute('aria-live', 'polite');
      document.body.appendChild(root);
    }
    return root;
  }

  public open(options: ModalOptions): HTMLElement {
    this.bindGlobalEscape();
    const root = this.ensureRoot();

    // Dacă modalul cu același ID există deja, îl actualizăm în loc să îl dublăm
    const existingIndex = this.stack.findIndex((item) => item.options.id === options.id);
    if (existingIndex !== -1) {
      this.close(options.id, true);
    }

    const triggerElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    this.lockBackgroundLayout(true);

    const sizeClass = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-[95vw] h-[90vh]',
    }[options.size || 'md'];

    const wrapper = document.createElement('div');
    wrapper.id = `urefy-modal-${options.id}`;
    wrapper.className =
      'urefy-modal-backdrop fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn';
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-modal', 'true');
    if (options.title) {
      wrapper.setAttribute('aria-labelledby', `urefy-modal-title-${options.id}`);
    }

    wrapper.innerHTML = `
      <div class="urefy-modal-surface relative w-full ${sizeClass} bg-slate-900/95 border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all">
        ${
          options.title
            ? `<header class="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/60">
                 <h2 id="urefy-modal-title-${options.id}" class="text-base font-semibold text-slate-100 tracking-tight">
                   ${options.title}
                 </h2>
                 <button type="button"
                         data-modal-close="${options.id}"
                         class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
                         aria-label="Close window">
                   <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </header>`
            : ''
        }
        <div class="urefy-modal-body overflow-y-auto p-5 text-slate-200 flex-1">
          ${options.contentHtml}
        </div>
      </div>
    `;

    if (options.closeOnBackdrop !== false) {
      wrapper.addEventListener('mousedown', (e) => {
        if (e.target === wrapper) {
          this.close(options.id);
        }
      });
    }

    wrapper.querySelectorAll(`[data-modal-close="${options.id}"]`).forEach((btn) => {
      btn.addEventListener('click', () => this.close(options.id));
    });

    root.appendChild(wrapper);

    const cleanupFocusTrap = this.trapFocus(wrapper);
    this.stack.push({
      options,
      triggerElement,
      cleanupFocusTrap,
    });

    if (options.onMount) {
      options.onMount(wrapper);
    }

    return wrapper;
  }

  public close(id?: string, silent = false): void {
    if (this.stack.length === 0) return;

    const targetIndex = id
      ? this.stack.findIndex((entry) => entry.options.id === id)
      : this.stack.length - 1;

    if (targetIndex === -1) return;

    const [entry] = this.stack.splice(targetIndex, 1);
    entry.cleanupFocusTrap();

    const domEl = document.getElementById(`urefy-modal-${entry.options.id}`);
    if (domEl) {
      domEl.remove();
    }

    if (!silent && entry.options.onClose) {
      entry.options.onClose();
    }

    if (this.stack.length === 0) {
      this.lockBackgroundLayout(false);
    }

    if (!silent && entry.triggerElement && document.body.contains(entry.triggerElement)) {
      requestAnimationFrame(() => {
        entry.triggerElement?.focus();
      });
    }
  }

  public closeAll(): void {
    while (this.stack.length > 0) {
      this.close(undefined, false);
    }
  }

  public isOpen(id?: string): boolean {
    if (!id) return this.stack.length > 0;
    return this.stack.some((entry) => entry.options.id === id);
  }

  private lockBackgroundLayout(locked: boolean): void {
    const mainLayout = document.getElementById('main-layout') || document.getElementById('app');
    if (locked) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      if (mainLayout) {
        mainLayout.setAttribute('inert', '');
        mainLayout.setAttribute('aria-hidden', 'true');
      }
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      if (mainLayout) {
        mainLayout.removeAttribute('inert');
        mainLayout.removeAttribute('aria-hidden');
      }
    }
  }

  private trapFocus(container: HTMLElement): () => void {
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusFirstElement = () => {
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    };

    requestAnimationFrame(focusFirstElement);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((el) => el.offsetParent !== null);

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }

  private bindGlobalEscape(): void {
    if (this.globalKeyListenerBound || typeof window === 'undefined') return;
    this.globalKeyListenerBound = true;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.stack.length > 0) {
        const topEntry = this.stack[this.stack.length - 1];
        if (topEntry.options.closeOnEscape !== false) {
          e.preventDefault();
          e.stopPropagation();
          this.close(topEntry.options.id);
        }
      }
    });
  }
}

export const modalManager = new UnifiedModalManager();
