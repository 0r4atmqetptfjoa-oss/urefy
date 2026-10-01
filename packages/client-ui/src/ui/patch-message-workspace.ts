const mediaMarkup = new WeakMap<Element, string>();

export function rememberWorkspaceMedia(stage: HTMLElement): void {
  stage.querySelectorAll('.video-container').forEach(element => {
    if (!mediaMarkup.has(element)) mediaMarkup.set(element, element.outerHTML);
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
  if (node.hasAttribute('data-post-card-id')) return `post:${node.getAttribute('data-post-card-id')}`;
  if (node.matches('.journal-dialogue-message[data-message-id], .dm-message[data-message-id]')) return `message:${node.getAttribute('data-message-id')}`;
  return null;
}

function compatible(current: Node, next: Node): boolean {
  return current.nodeType === next.nodeType && current.nodeName === next.nodeName && key(current) === key(next);
}

function reconcileNode(current: Node, next: Node): void {
  if (current instanceof Element && current.matches('.video-container') && next instanceof Element) {
    const expected = mediaMarkup.get(current);
    if (expected === next.outerHTML) return;
    if (expected && expected !== next.outerHTML) {
      current.innerHTML = next.innerHTML;
      mediaMarkup.set(current, next.outerHTML);
      return;
    }
    mediaMarkup.set(current, next.outerHTML);
  }
  if (current.isEqualNode(next)) return;
  if (!(current instanceof Element) || !(next instanceof Element)) {
    current.nodeValue = next.nodeValue;
    return;
  }
  for (const attribute of [...current.attributes]) {
    // Listener lifecycle flags belong to the mounted element.
    if (!next.hasAttribute(attribute.name) && !attribute.name.endsWith('-bound')) current.removeAttribute(attribute.name);
  }
  for (const attribute of [...next.attributes]) {
    if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
  }
  // The composer is stateful: keep its node, value, focus and selection intact.
  if (current.matches('#input-message, #input-dm-message, #inline-composer-textarea, #inline-composer-title')) return;
  reconcileChildren(current, next);
}

function reconcileChildren(current: Node, next: Node): void {
  const original = [...current.childNodes];
  const keyed = new Map(original.map(node => [key(node), node]).filter(([identity]) => identity !== null) as Array<[string, Node]>);
  const retained = new Set<Node>();
  let cursor = current.firstChild;
  for (const incoming of [...next.childNodes]) {
    const identity = key(incoming);
    let mounted = identity ? keyed.get(identity) : (cursor && compatible(cursor, incoming) ? cursor : undefined);
    if (mounted && !compatible(mounted, incoming)) mounted = undefined;
    if (!mounted) mounted = incoming.cloneNode(true);
    if (mounted !== cursor) current.insertBefore(mounted, cursor);
    reconcileNode(mounted, incoming);
    retained.add(mounted);
    cursor = mounted.nextSibling;
  }
  for (const node of original) if (!retained.has(node)) current.removeChild(node);
}
