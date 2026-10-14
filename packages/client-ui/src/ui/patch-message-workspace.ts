/**
 * @file ui/patch-message-workspace.ts
 * @package @aetheris/client-ui
 * @description 2027 Linear-Time O(N) DOM Reconciler for Feed & Message Workspaces.
 * Eliminates quadratic O(N*D) subtree scanning from recursive isEqualNode() calls on deep containers
 * while preserving active video players, composer focus, selection ranges, and bound listeners.
 */

const mediaMarkup = new WeakMap<Element, string>();

const STATEFUL_INPUT_SELECTOR =
  '#input-message, #input-dm-message, #inline-composer-textarea, #inline-composer-title, [data-preserve-focus="true"]';

export function rememberWorkspaceMedia(stage: HTMLElement): void {
  stage.querySelectorAll('.video-container').forEach((element) => {
    if (!mediaMarkup.has(element)) {
      mediaMarkup.set(element, element.outerHTML);
    }
  });
}

/** Preserve the mounted feed cards and active players when more posts appear. */
export function patchFeedWorkspace(stage: HTMLElement, html: string): boolean {
  const current = stage.querySelector<HTMLElement>('#main-feed-scroll[data-feed-scope]');
  if (!current) return false;

  const template = document.createElement('template');
  template.innerHTML = html;
  const next = template.content.querySelector<HTMLElement>('#main-feed-scroll[data-feed-scope]');
  if (!next || current.dataset.feedScope !== next.dataset.feedScope) return false;

  reconcileChildren(stage, template.content);
  return true;
}

/** Reconcile only the current conversation. Route changes still mount a fresh view. */
export function patchMessageWorkspace(stage: HTMLElement, html: string): boolean {
  const template = document.createElement('template');
  template.innerHTML = html;
  const selector = '#messages-container, #dm-thread-messages';
  const current = stage.querySelector<HTMLElement>(selector);
  const next = template.content.querySelector<HTMLElement>(selector);

  if (!current || !next || current.id !== next.id) return false;
  if (current.id === 'messages-container' && current.dataset.channelId !== next.dataset.channelId) return false;
  if (current.id === 'dm-thread-messages' && current.dataset.peerId !== next.dataset.peerId) return false;

  reconcileChildren(stage, template.content);
  return true;
}

function key(node: Node): string | null {
  if (!(node instanceof Element)) return null;
  if (node.id) return `id:${node.id}`;
  const postCardId = node.getAttribute('data-post-card-id');
  if (postCardId) return `post:${postCardId}`;
  const msgId = node.getAttribute('data-message-id');
  if (msgId && node.matches('.journal-dialogue-message, .dm-message')) return `message:${msgId}`;
  const crumbIdx = node.getAttribute('data-crumb-index');
  if (crumbIdx) return `crumb:${crumbIdx}`;
  return null;
}

function compatible(current: Node, next: Node): boolean {
  return (
    current.nodeType === next.nodeType &&
    current.nodeName === next.nodeName &&
    key(current) === key(next)
  );
}

/**
 * Syncs attributes in O(A) without touching runtime listener flags (*-bound, data-sandbox-attached).
 */
function syncAttributes(current: Element, next: Element): void {
  const currentAttrs = current.attributes;
  for (let i = currentAttrs.length - 1; i >= 0; i--) {
    const name = currentAttrs[i].name;
    if (
      !next.hasAttribute(name) &&
      !name.endsWith('-bound') &&
      name !== 'data-sandbox-attached' &&
      name !== 'data-keyboard-focused'
    ) {
      current.removeAttribute(name);
    }
  }

  const nextAttrs = next.attributes;
  for (let i = 0; i < nextAttrs.length; i++) {
    const attr = nextAttrs[i];
    if (current.getAttribute(attr.name) !== attr.value) {
      current.setAttribute(attr.name, attr.value);
    }
  }
}

function reconcileNode(current: Node, next: Node): void {
  // 1. Fast path for text & comment nodes
  if (current.nodeType !== Node.ELEMENT_NODE || next.nodeType !== Node.ELEMENT_NODE) {
    if (current.nodeValue !== next.nodeValue) {
      current.nodeValue = next.nodeValue;
    }
    return;
  }

  const currentEl = current as Element;
  const nextEl = next as Element;

  // 2. Preserve mounted video/audio streams from resetting playback
  if (currentEl.matches('.video-container')) {
    const nextHtml = nextEl.outerHTML;
    const expected = mediaMarkup.get(currentEl);
    if (expected === nextHtml) return;
    if (expected && expected !== nextHtml) {
      currentEl.innerHTML = nextEl.innerHTML;
      mediaMarkup.set(currentEl, nextHtml);
      return;
    }
    mediaMarkup.set(currentEl, nextHtml);
  }

  // 3. Only use isEqualNode on small leaf-like elements (<= 3 child nodes) to avoid O(N^2) deep scans
  if (currentEl.childNodes.length <= 3 && nextEl.childNodes.length <= 3) {
    if (currentEl.isEqualNode(nextEl)) return;
  }

  // 4. Sync attributes
  syncAttributes(currentEl, nextEl);

  // 5. Preserve active user input focus & cursor selection
  if (
    currentEl.matches(STATEFUL_INPUT_SELECTOR) ||
    (typeof document !== 'undefined' && document.activeElement === currentEl)
  ) {
    return;
  }

  // 6. Fast path for single-text-child elements (buttons, badges, counters, labels)
  if (
    currentEl.childNodes.length === 1 &&
    nextEl.childNodes.length === 1 &&
    currentEl.firstChild?.nodeType === Node.TEXT_NODE &&
    nextEl.firstChild?.nodeType === Node.TEXT_NODE
  ) {
    if (currentEl.firstChild.nodeValue !== nextEl.firstChild.nodeValue) {
      currentEl.firstChild.nodeValue = nextEl.firstChild.nodeValue;
    }
    return;
  }

  reconcileChildren(currentEl, nextEl);
}

function reconcileChildren(current: Node, next: Node): void {
  const originalNodes = Array.from(current.childNodes);
  const keyed = new Map<string, Node>();

  for (let i = 0; i < originalNodes.length; i++) {
    const k = key(originalNodes[i]);
    if (k !== null) keyed.set(k, originalNodes[i]);
  }

  const retained = new Set<Node>();
  let cursor = current.firstChild;
  const incomingNodes = Array.from(next.childNodes);

  for (let i = 0; i < incomingNodes.length; i++) {
    const incoming = incomingNodes[i];
    const identity = key(incoming);
    let mounted: Node | undefined = identity
      ? keyed.get(identity)
      : cursor && compatible(cursor, incoming)
      ? cursor
      : undefined;

    if (mounted && !compatible(mounted, incoming)) {
      mounted = undefined;
    }

    if (!mounted) {
      mounted = incoming.cloneNode(true);
    }

    if (mounted !== cursor) {
      current.insertBefore(mounted, cursor);
    }

    reconcileNode(mounted, incoming);
    retained.add(mounted);
    cursor = mounted.nextSibling;
  }

  for (let i = 0; i < originalNodes.length; i++) {
    const node = originalNodes[i];
    if (!retained.has(node) && node.parentNode === current) {
      current.removeChild(node);
    }
  }
}
