const BRAND_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Aetheris Omni-Sphere/g, 'UREfy'],
  [/AETHERIS/g, 'UREfy'],
  [/Aetheris(?! Network)/g, 'UREfy'],
  [/aetheris\.eth/gi, 'UREfy.com'],
];

const FAST_BRAND_CHECK = /aetheris/i;
let activeObserver: MutationObserver | null = null;
const pendingNodes = new Set<ParentNode>();
let rafScheduled = false;

export function replaceBrand(value: string): string {
  if (!value || !FAST_BRAND_CHECK.test(value)) return value;
  return BRAND_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

export function applyProductBranding(root: ParentNode = document): void {
  if (typeof document === 'undefined' || !root) return;
  const selector = '[data-product-brand]';
  const elements =
    root instanceof Element && root.matches(selector)
      ? [root, ...Array.from(root.querySelectorAll(selector))]
      : Array.from(root.querySelectorAll(selector));

  for (const element of elements) {
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue && FAST_BRAND_CHECK.test(node.nodeValue)) {
        node.nodeValue = replaceBrand(node.nodeValue);
      }
    }
    for (const attribute of ['title', 'aria-label', 'placeholder', 'alt']) {
      const value = element.getAttribute(attribute);
      if (value && FAST_BRAND_CHECK.test(value)) {
        element.setAttribute(attribute, replaceBrand(value));
      }
    }
  }
}

function flushPendingBranding(): void {
  rafScheduled = false;
  const nodes = Array.from(pendingNodes);
  pendingNodes.clear();
  for (const node of nodes) {
    applyProductBranding(node);
  }
}

export function installProductBranding(): void {
  if (typeof document === 'undefined') return;
  document.title = replaceBrand(document.title);
  for (const selector of [
    'meta[name="description"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[property="og:site_name"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]',
  ]) {
    const meta = document.querySelector<HTMLMetaElement>(selector);
    if (meta?.content && FAST_BRAND_CHECK.test(meta.content)) {
      meta.content = replaceBrand(meta.content);
    }
  }

  applyProductBranding(document);

  if (activeObserver || !document.body) return;

  activeObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const added of Array.from(mutation.addedNodes)) {
        if (added.nodeType === Node.TEXT_NODE && added.parentElement?.matches('[data-product-brand]')) {
          if (added.nodeValue && FAST_BRAND_CHECK.test(added.nodeValue)) {
            added.nodeValue = replaceBrand(added.nodeValue);
          }
        } else if (added instanceof Element) {
          pendingNodes.add(added);
        }
      }
    }
    if (pendingNodes.size > 0 && !rafScheduled) {
      rafScheduled = true;
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(flushPendingBranding);
      } else {
        flushPendingBranding();
      }
    }
  });

  activeObserver.observe(document.body, { childList: true, subtree: true });
}
