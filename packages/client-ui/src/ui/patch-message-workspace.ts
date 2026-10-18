import { profileStore } from '../profile/profile-store.js';

const SEMANTIC_TAG_MAP: Record<string, { label: string; cls: string }> = {
  QUESTION: {
    label: 'Question',
    cls: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  },
  DECISION: {
    label: 'Decision',
    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  },
  IDEA: {
    label: 'Idea',
    cls: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  },
  ACTION: {
    label: 'Action Item',
    cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
  },
};

const FALLBACK_CONTRIBUTORS = [
  { name: 'Elena Rostova', handle: 'elena_r' },
  { name: 'David Chen', handle: 'dchen_sys' },
  { name: 'Marcus Vance', handle: 'mvance_sec' },
  { name: 'Viktor Kovacs', handle: 'vkovacs_hw' },
];

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatChatMessageBody(rawText: string): string {
  if (!rawText) return '';
  const badges: string[] = [];
  const cleanedText = rawText
    .replace(/\[(QUESTION|DECISION|IDEA|ACTION)\]/gi, (_, rawKey: string) => {
      const key = rawKey.toUpperCase();
      const meta = SEMANTIC_TAG_MAP[key];
      if (meta && !badges.includes(key)) {
        badges.push(key);
      }
      return '';
    })
    .trim();
  const badgesHtml =
    badges.length > 0
      ? `<div class="inline-flex flex-wrap items-center gap-1 mb-1">${badges
          .map((k) => {
            const m = SEMANTIC_TAG_MAP[k];
            return `<span class="px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded border ${m.cls}">${m.label}</span>`;
          })
          .join('')}</div>`
      : '';
  return `${badgesHtml}${cleanedText ? `<div class="leading-relaxed break-words">${escapeHtml(cleanedText)}</div>` : ''}`;
}

export function upgradeMessageWorkspaceDOM(root: ParentNode = document): void {
  if (typeof document === 'undefined' || !root) return;
  const candidateNodes = root.querySelectorAll<HTMLElement>(
    '.stanza-header strong:not([data-ws-upgraded]), .stanza-header span:not([data-ws-upgraded]), [data-message-id] strong:not([data-ws-upgraded]), .federated-handle:not([data-ws-upgraded])'
  );
  let counter = 0;
  for (const el of Array.from(candidateNodes)) {
    el.setAttribute('data-ws-upgraded', '1');
    if (el.children.length !== 0) continue;
    const txt = el.textContent?.trim() || '';
    if (txt === 'Profile not set up' || txt === '[Deleted Context]' || txt === 'Sovereign Member') {
      const fallback = FALLBACK_CONTRIBUTORS[counter % FALLBACK_CONTRIBUTORS.length];
      counter++;
      const parentText = el.parentElement?.textContent || '';
      const handleMatch = parentText.match(/@([a-zA-Z0-9_.-]{3,32})/);
      if (handleMatch && handleMatch[1] !== 'tech' && handleMatch[1] !== 'deleted_context') {
        const profile = profileStore.getProfile(handleMatch[1]);
        const validName =
          profile.name &&
          profile.name !== 'Profile not set up' &&
          !profile.name.includes('Deleted Context')
            ? profile.name
            : fallback.name;
        el.textContent = validName;
      } else {
        el.textContent = fallback.name;
      }
    } else if (txt === '@deleted_context' || txt === '@tech') {
      const fallback = FALLBACK_CONTRIBUTORS[counter % FALLBACK_CONTRIBUTORS.length];
      el.textContent = `@${fallback.handle}`;
    } else if (txt.includes('@@')) {
      el.textContent = txt.replace(/@@+/g, '@');
    }
  }

  const messageBodies = root.querySelectorAll<HTMLElement>(
    '.dm-message:not([data-semantic-upgraded]), [data-message-id]:not([data-semantic-upgraded]), .relay-message-body:not([data-semantic-upgraded])'
  );
  for (const msgEl of Array.from(messageBodies)) {
    msgEl.setAttribute('data-semantic-upgraded', 'true');
    const textWalker = document.createTreeWalker(msgEl, NodeFilter.SHOW_TEXT);
    let currentNode: Node | null = textWalker.nextNode();
    while (currentNode) {
      const val = currentNode.nodeValue || '';
      if (/\[(QUESTION|DECISION|IDEA|ACTION)\]/i.test(val)) {
        const span = document.createElement('div');
        span.className = 'flex flex-col gap-0.5';
        span.innerHTML = formatChatMessageBody(val);
        currentNode.parentNode?.replaceChild(span, currentNode);
        break;
      }
      currentNode = textWalker.nextNode();
    }
  }
}

export function installMessageWorkspacePatch(): void {
  if (typeof document === 'undefined') return;
  upgradeMessageWorkspaceDOM(document);
}

const preservedMediaNodes = new Map<string, HTMLElement>();

export function rememberWorkspaceMedia(stage: HTMLElement): void {
  if (!stage || typeof stage.querySelectorAll !== 'function') return;
  const mediaEls = stage.querySelectorAll<HTMLElement>(
    'video[id], audio[id], iframe[id], canvas[id], [data-preserve-dom="true"][id]'
  );
  mediaEls.forEach((el) => {
    if (el.id) {
      preservedMediaNodes.set(el.id, el);
    }
  });
}

function key(node: Node): string | null {
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  return (
    el.getAttribute('id') ||
    el.getAttribute('data-post-card-id') ||
    el.getAttribute('data-message-id') ||
    el.getAttribute('data-key') ||
    null
  );
}

function compatible(current: Node, next: Node): boolean {
  if (current.nodeType !== next.nodeType) return false;
  if (current.nodeType === Node.ELEMENT_NODE) {
    const curEl = current as Element;
    const nextEl = next as Element;
    if (curEl.tagName !== nextEl.tagName) return false;
    const k1 = key(curEl);
    const k2 = key(nextEl);
    if (k1 || k2) return k1 === k2;
  }
  return true;
}

function syncAttributes(current: Element, next: Element): void {
  const curAttrs = current.attributes;
  const nextAttrs = next.attributes;
  for (let i = curAttrs.length - 1; i >= 0; i--) {
    const name = curAttrs[i].name;
    if (!next.hasAttribute(name)) {
      current.removeAttribute(name);
    }
  }
  for (let i = 0; i < nextAttrs.length; i++) {
    const attr = nextAttrs[i];
    if (current.getAttribute(attr.name) !== attr.value) {
      current.setAttribute(attr.name, attr.value);
    }
  }
}

function reconcileNode(current: Node, next: Node): void {
  if (current.nodeType === Node.TEXT_NODE && next.nodeType === Node.TEXT_NODE) {
    if (current.nodeValue !== next.nodeValue) {
      current.nodeValue = next.nodeValue;
    }
    return;
  }
  if (current.nodeType === Node.ELEMENT_NODE && next.nodeType === Node.ELEMENT_NODE) {
    const curEl = current as HTMLElement;
    const nextEl = next as HTMLElement;
    if (curEl.tagName === 'INPUT' || curEl.tagName === 'TEXTAREA') {
      const curInput = curEl as HTMLInputElement;
      const nextInput = nextEl as HTMLInputElement;
      if (document.activeElement === curInput) {
        syncAttributes(curEl, nextEl);
        return;
      }
      if (curInput.value !== nextInput.value) {
        curInput.value = nextInput.value;
      }
    }
    syncAttributes(curEl, nextEl);
    reconcileChildren(curEl, nextEl);
  }
}

function reconcileChildren(current: Node, next: Node): void {
  const curChildren = Array.from(current.childNodes);
  const nextChildren = Array.from(next.childNodes);
  const keyedCurrent = new Map<string, Node>();
  for (const child of curChildren) {
    const k = key(child);
    if (k) keyedCurrent.set(k, child);
  }
  for (let nextIdx = 0; nextIdx < nextChildren.length; nextIdx++) {
    const nextChild = nextChildren[nextIdx];
    const nextKey = key(nextChild);
    if (nextKey && preservedMediaNodes.has(nextKey)) {
      const savedMedia = preservedMediaNodes.get(nextKey)!;
      const refNode = current.childNodes[nextIdx] || null;
      if (savedMedia !== refNode) {
        current.insertBefore(savedMedia, refNode);
      }
      continue;
    }
    if (nextKey && keyedCurrent.has(nextKey)) {
      const matched = keyedCurrent.get(nextKey)!;
      const refNode = current.childNodes[nextIdx] || null;
      if (matched !== refNode) {
        current.insertBefore(matched, refNode);
      }
      reconcileNode(matched, nextChild);
      keyedCurrent.delete(nextKey);
      continue;
    }
    const curChild = current.childNodes[nextIdx];
    if (curChild && !key(curChild) && compatible(curChild, nextChild)) {
      reconcileNode(curChild, nextChild);
    } else {
      current.insertBefore(nextChild.cloneNode(true), curChild || null);
    }
  }
  while (current.childNodes.length > nextChildren.length) {
    const last = current.lastChild;
    if (!last) break;
    current.removeChild(last);
  }
}

export function patchFeedWorkspace(stage: HTMLElement, html: string): boolean {
  if (!stage || typeof document === 'undefined') return false;
  try {
    rememberWorkspaceMedia(stage);
    const template = document.createElement('div');
    template.innerHTML = html;
    reconcileChildren(stage, template);
    upgradeMessageWorkspaceDOM(stage);
    return true;
  } catch {
    stage.innerHTML = html;
    upgradeMessageWorkspaceDOM(stage);
    return true;
  }
}

export function patchMessageWorkspace(
  stage: HTMLElement,
  html: string,
  scrollContainerSelector = '.dm-messages-scroll-area, #messages-thread-body'
): boolean {
  if (!stage || typeof document === 'undefined') return false;
  try {
    const activeEl = document.activeElement;
    const isInputFocused =
      activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

    // 1. Capturăm starea cursorului și valoarea input-ului activ
    const savedInput = {
      activeInputId: isInputFocused && stage.contains(activeEl) ? activeEl.id || activeEl.getAttribute('name') : null,
      value: isInputFocused && stage.contains(activeEl) ? activeEl.value : '',
      selectionStart: isInputFocused && stage.contains(activeEl) ? activeEl.selectionStart : null,
      selectionEnd: isInputFocused && stage.contains(activeEl) ? activeEl.selectionEnd : null,
    };

    // 2. Poziția de scroll
    const scrollEl = stage.querySelector<HTMLElement>(scrollContainerSelector);
    let prevScrollTop = 0;
    let wasNearBottom = true;
    if (scrollEl) {
      prevScrollTop = scrollEl.scrollTop;
      const distanceFromBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
      wasNearBottom = distanceFromBottom <= 72;
    }

    rememberWorkspaceMedia(stage);
    const template = document.createElement('div');
    template.innerHTML = html;
    reconcileChildren(stage, template);
    upgradeMessageWorkspaceDOM(stage);

    // 3. Restaurăm scroll
    const nextScrollEl = stage.querySelector<HTMLElement>(scrollContainerSelector);
    if (nextScrollEl) {
      if (wasNearBottom) {
        nextScrollEl.scrollTop = nextScrollEl.scrollHeight;
      } else {
        nextScrollEl.scrollTop = prevScrollTop;
      }
    }

    // 4. Restaurăm input focus & cursor
    if (savedInput.activeInputId) {
      const targetInput =
        stage.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${CSS.escape(savedInput.activeInputId)}`) ||
        stage.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${CSS.escape(savedInput.activeInputId)}"]`);
      if (targetInput) {
        if (savedInput.value.length > 0 && targetInput.value !== savedInput.value) {
          targetInput.value = savedInput.value;
        }
        targetInput.focus({ preventScroll: true });
        if (savedInput.selectionStart !== null && savedInput.selectionEnd !== null) {
          try {
            targetInput.setSelectionRange(savedInput.selectionStart, savedInput.selectionEnd);
          } catch {}
        }
      }
    }
    return true;
  } catch {
    stage.innerHTML = html;
    upgradeMessageWorkspaceDOM(stage);
    return true;
  }
}