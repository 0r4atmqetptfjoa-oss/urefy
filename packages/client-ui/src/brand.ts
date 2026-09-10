const BRAND_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Aetheris Omni-Sphere/g, 'UREfy'],
  [/AETHERIS/g, 'UREfy'],
  [/Aetheris(?! Network)/g, 'UREfy'], // Replaces Aetheris only if not followed by " Network"
  [/aetheris\.eth/gi, 'urefy.com'],
];

function replaceBrand(value: string): string {
  return BRAND_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

export function applyProductBranding(root: ParentNode = document): void {
  if (typeof document === 'undefined') return;

  const selector = '[data-product-brand]';
  const elements = root instanceof Element && root.matches(selector)
    ? [root, ...Array.from(root.querySelectorAll(selector))]
    : Array.from(root.querySelectorAll(selector));
  for (const element of elements) {
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue) node.nodeValue = replaceBrand(node.nodeValue);
    }
    for (const attribute of ['title', 'aria-label', 'placeholder', 'alt']) {
      const value = element.getAttribute(attribute);
      if (value && /aetheris/i.test(value)) element.setAttribute(attribute, replaceBrand(value));
    }
  }
}

export function installProductBranding(): void {
  if (typeof document === 'undefined') return;

  document.title = replaceBrand(document.title);
  for (const selector of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:site_name"]', 'meta[name="twitter:title"]', 'meta[name="twitter:description"]']) {
    const meta = document.querySelector<HTMLMetaElement>(selector);
    if (meta?.content) meta.content = replaceBrand(meta.content);
  }

  applyProductBranding(document);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const added of Array.from(mutation.addedNodes)) {
        if (added.nodeType === Node.TEXT_NODE && added.parentElement?.matches('[data-product-brand]')) {
          if (added.nodeValue && /aetheris/i.test(added.nodeValue)) added.nodeValue = replaceBrand(added.nodeValue);
        } else if (added instanceof Element) {
          applyProductBranding(added);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

