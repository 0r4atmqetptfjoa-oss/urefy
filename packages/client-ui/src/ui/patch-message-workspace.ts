/**
 * @file ui/patch-message-workspace.ts
 * @package @aetheris/client-ui/ui
 * @description 2027 Zero-Flicker Surgical DOM Reconciler & Semantic Message Workspace Upgrader.
 * Reconciles live DOM for Feed & E2EE Messages, parses semantic message tags ([QUESTION], [DECISION], etc.),
 * eliminates double @@ handle symbols, and heals residual "Profile not set up" labels.
 */

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

  // 1. Replace any "Profile not set up" text nodes using the peer's @handle
  const allElements = root.querySelectorAll<HTMLElement>('*');
  for (const el of Array.from(allElements)) {
    if (el.children.length === 0 && el.textContent?.trim() === 'Profile not set up') {
      const parentText = el.parentElement?.textContent || '';
      const handleMatch = parentText.match(/@([a-zA-Z0-9_.-]{3,32})/);
      if (handleMatch) {
        const profile = profileStore.getProfile(handleMatch[1]);
        el.textContent = profile.name;
      } else {
        el.textContent = 'Sovereign Member';
      }
    }
  }

  // 2. Fix double @@ handles in Profile and Chat headers
  const handleNodes = root.querySelectorAll<HTMLElement>('[class*="text-slate"], [class*="font-mono"]');
  for (const node of Array.from(handleNodes)) {
    if (node.children.length === 0 && node.textContent && node.textContent.includes('@@')) {
      node.textContent = node.textContent.replace(/@@+/g, '@');
    }
  }

  // 3. Parse raw [QUESTION] / [DECISION] tags inside DM and Relay message bubbles
  const messageBodies = root.querySelectorAll<HTMLElement>('.dm-message, [data-message-id], .relay-message-body');
  for (const msgEl of Array.from(messageBodies)) {
    if (msgEl.getAttribute('data-semantic-upgraded') === 'true') continue;
    const textWalker = document.createTreeWalker(msgEl, NodeFilter.SHOW_TEXT);
    let currentNode: Node | null = textWalker.nextNode();
    while (currentNode) {
      const val = currentNode.nodeValue || '';
      if (/\[(QUESTION|DECISION|IDEA|ACTION)\]/i.test(val)) {
        const span = document.createElement('div');
        span.className = 'flex flex-col gap-0.5';
        span.innerHTML = formatChatMessageBody(val);
        currentNode.parentNode?.replaceChild(span, currentNode);
        msgEl.setAttribute('data-semantic-upgraded', 'true');
        break;
      }
      currentNode = textWalker.nextNode();
    }
  }
}

export function installMessageWorkspacePatch(): void {
  if (typeof document === 'undefined') return;
  upgradeMessageWorkspaceDOM(document);
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      upgradeMessageWorkspaceDOM(document);
    });
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
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
    upgradeMessageWorkspaceDOM(stage);
    return true;
  } catch {
    stage.innerHTML = html;
    upgradeMessageWorkspaceDOM(stage);
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
    upgradeMessageWorkspaceDOM(stage);
    return true;
  } catch {
    stage.innerHTML = html;
    upgradeMessageWorkspaceDOM(stage);
    return true;
  }
}
