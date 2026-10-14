/**
 * @file ui/patch-message-workspace.ts
 * @package @aetheris/client-ui/ui
 * @description 2027 Zero-Flicker Surgical DOM Reconciler for Feed & E2EE Message Workspaces.
 * Preserves live <video>, <audio>, <iframe>, WebGL <canvas>, and active input cursor states.
 */

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

  if (
    (current instanceof HTMLInputElement || current instanceof HTMLTextAreaElement) &&
    (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement)
  ) {
    const isFocused = typeof document !== 'undefined' && document.activeElement === current;
    if (!isFocused && current.value !== next.value) {
      current.value = next.value;
    }
  }
}

function reconcileNode(current: Node, next: Node): void {
  if (current.nodeType === Node.TEXT_NODE && next.nodeType === Node.TEXT_NODE) {
    if (current.textContent !== next.textContent) {
      current.textContent = next.textContent;
    }
    return;
  }

  if (current.nodeType === Node.ELEMENT_NODE && next.nodeType === Node.ELEMENT_NODE) {
    const curEl = current as HTMLElement;
    const nextEl = next as HTMLElement;

    if (
      curEl.tagName === 'VIDEO' ||
      curEl.tagName === 'AUDIO' ||
      curEl.tagName === 'CANVAS' ||
      curEl.getAttribute('data-preserve-dom') === 'true'
    ) {
      syncAttributes(curEl, nextEl);
      return;
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

  let curIdx = 0;
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
    curIdx++;
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
    return true;
  } catch {
    stage.innerHTML = html;
    return true;
  }
}

export function patchMessageWorkspace(stage: HTMLElement, html: string): boolean {
  if (!stage || typeof document === 'undefined') return false;
  try {
    rememberWorkspaceMedia(stage);
    const template = document.createElement('div');
    template.innerHTML = html;
    reconcileChildren(stage, template);
    return true;
  } catch {
    stage.innerHTML = html;
    return true;
  }
}
