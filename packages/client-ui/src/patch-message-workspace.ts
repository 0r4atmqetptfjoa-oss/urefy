export interface WorkspacePatchState {
  activeInputId: string | null;
  value: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  isComposing: boolean;
}

const activeCompositions = new WeakSet<Element>();

if (typeof window !== 'undefined') {
  window.addEventListener('compositionstart', (e) => {
    if (e.target instanceof Element) activeCompositions.add(e.target);
  }, true);
  window.addEventListener('compositionend', (e) => {
    if (e.target instanceof Element) activeCompositions.delete(e.target);
  }, true);
}

export function patchMessageWorkspace(
  container: HTMLElement,
  nextHtml: string,
  scrollContainerSelector = '.dm-messages-scroll-area, #messages-thread-body'
): void {
  const activeEl = document.activeElement;
  const isInputFocused =
    activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

  // Dacă utilizatorul folosește IME (diacritice compuse) în interiorul containerului, amânăm patch-ul
  if (activeEl && container.contains(activeEl) && activeCompositions.has(activeEl)) {
    return;
  }

  // 1. Capturăm starea cursorului și valoarea input-ului activ
  const savedInput: WorkspacePatchState = {
    activeInputId: isInputFocused && container.contains(activeEl) ? activeEl.id || activeEl.getAttribute('name') : null,
    value: isInputFocused && container.contains(activeEl) ? activeEl.value : '',
    selectionStart: isInputFocused && container.contains(activeEl) ? activeEl.selectionStart : null,
    selectionEnd: isInputFocused && container.contains(activeEl) ? activeEl.selectionEnd : null,
    isComposing: false,
  };

  // 2. Capturăm poziția de scroll și verificăm dacă utilizatorul este aproape de baza conversației
  const scrollEl = container.querySelector<HTMLElement>(scrollContainerSelector);
  let prevScrollTop = 0;
  let wasNearBottom = true;

  if (scrollEl) {
    prevScrollTop = scrollEl.scrollTop;
    const distanceFromBottom =
      scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
    wasNearBottom = distanceFromBottom <= 72;
  }

  // 3. Salvăm elementele media active (video, audio, canvas, iframe) care au un id sau data-preserve-media-id
  const preservedMedia = new Map<string, HTMLElement>();
  container
    .querySelectorAll<HTMLElement>('video[id], audio[id], canvas[id], iframe[id], [data-preserve-media-id]')
    .forEach((mediaEl) => {
      const key = mediaEl.getAttribute('data-preserve-media-id') || mediaEl.id;
      if (key) preservedMedia.set(key, mediaEl);
    });

  // 4. Construim fragmentul nou în memorie și re-atașăm nodurile media active înainte de swap
  const template = document.createElement('template');
  template.innerHTML = nextHtml;
  const nextRoot = template.content;

  preservedMedia.forEach((liveNode, key) => {
    const placeholder =
      nextRoot.querySelector<HTMLElement>(`[data-preserve-media-id="${CSS.escape(key)}"]`) ||
      nextRoot.querySelector<HTMLElement>(`#${CSS.escape(key)}`);
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.replaceChild(liveNode, placeholder);
    }
  });

  // 5. Aplicăm actualizarea DOM
  container.replaceChildren(nextRoot);

  // 6. Restaurăm poziția de scroll (sau facem auto-scroll la bază dacă utilizatorul era deja jos)
  const nextScrollEl = container.querySelector<HTMLElement>(scrollContainerSelector);
  if (nextScrollEl) {
    if (wasNearBottom) {
      nextScrollEl.scrollTop = nextScrollEl.scrollHeight;
    } else {
      nextScrollEl.scrollTop = prevScrollTop;
    }
  }

  // 7. Restaurăm focusul, textul nesalvat și poziția exactă a cursorului în input
  if (savedInput.activeInputId) {
    const targetInput =
      container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `#${CSS.escape(savedInput.activeInputId)}`
      ) ||
      container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[name="${CSS.escape(savedInput.activeInputId)}"]`
      );

    if (targetInput) {
      if (savedInput.value.length > 0 && targetInput.value !== savedInput.value) {
        targetInput.value = savedInput.value;
      }
      targetInput.focus({ preventScroll: true });
      if (savedInput.selectionStart !== null && savedInput.selectionEnd !== null) {
        try {
          targetInput.setSelectionRange(savedInput.selectionStart, savedInput.selectionEnd);
        } catch {
          // Unele tipuri de input (ex. email/number) nu suportă setSelectionRange
        }
      }
    }
  }
}
