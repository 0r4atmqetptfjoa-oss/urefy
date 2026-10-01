/** Lightweight, semantic public pages. The full workspace opens on an explicit link. */
declare class HTMLRewriter {
  on(selector: string, handlers: { element(element: any): void }): this;
  transform(response: Response): Response;
}

export function publicReader(response: Response, workspace = false): Response {
  if (workspace) return response;
  let rewriter = new HTMLRewriter();
  if (!workspace) rewriter = rewriter.on('script[type="module"], link[rel="modulepreload"], link[rel="stylesheet"], link[rel="preload"][as="style"], #boot-shell', { element(e) { e.remove(); } });
  return rewriter
    .on('html', { element(e) { e.setAttribute('lang', 'en'); e.setAttribute('data-public-reader', 'true'); } })
    .on('body', { element(e) { e.setAttribute('class', 'public-reader'); } })
    .on('head', { element(e) { e.append(`<style>
      :root{--reader-bg:var(--bg-canvas,#090a0f);--reader-text:var(--text-primary,#e2e8f0);--reader-muted:#a6b0be;--reader-link:#efb65c;--reader-border:rgba(128,128,128,.25)}
      html.light{--reader-muted:#57534e;--reader-link:#895200}
      html,body{height:auto!important;overflow-y:auto!important}html.app-booting #app{visibility:visible!important}
      .public-reader{margin:0;background:var(--reader-bg);color:var(--reader-text);font:17px/1.7 'Segoe UI Variable','Segoe UI',Arial,sans-serif}
      .public-reader #app{height:auto;min-height:100vh;contain:none}
      .reader{box-sizing:border-box;max-width:1080px;margin:auto;padding:24px clamp(20px,5vw,56px) 56px}
      .reader nav{display:flex;align-items:center;flex-wrap:wrap;gap:12px 24px;border-bottom:1px solid var(--reader-border);padding-bottom:18px}
      .reader nav a,.reader-action{display:inline-flex;align-items:center;min-height:44px}
      .reader nav a:first-child{font-size:24px;font-weight:750;margin-right:auto}
      .reader a{color:var(--reader-link);text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}
      .reader a:focus-visible{outline:2px solid currentColor;outline-offset:4px}.reader a:hover{opacity:.85}
      .reader header{padding:32px 0 24px}.reader h1{font-size:clamp(27px,4vw,42px);line-height:1.18;letter-spacing:-.025em;margin:12px 0 20px;max-width:38ch;overflow-wrap:anywhere}
      .reader h2{font-size:23px;line-height:1.35;margin:32px 0 16px}.reader h3{font-size:20px;line-height:1.4}
      .reader-meta,.reader-eyebrow{color:var(--reader-muted);font-size:14px}.reader-eyebrow{letter-spacing:.04em}
      .reader-content{max-width:76ch;overflow-wrap:anywhere}.reader-content p{margin:0 0 20px}
      .reader-content pre{overflow-x:auto;white-space:pre-wrap;background:rgba(128,128,128,.08);padding:18px;border-radius:8px}
      .reader-content code{font:14px/1.6 Consolas,monospace}.reader-content blockquote{margin:20px 0;padding-left:20px;border-left:2px solid var(--reader-border)}
      .reader-media{margin:20px 0}.reader-media img,.reader-media video{display:block;width:100%;height:auto;aspect-ratio:16/9;min-height:160px;max-height:640px;object-fit:contain;border-radius:12px;background:rgba(128,128,128,.08)}
      .reader-video{margin:24px 0}.reader-video iframe{display:block;border:0;width:100%;aspect-ratio:16/9;border-radius:12px}
      .reader-replies{max-width:76ch;border-top:1px solid var(--reader-border);margin-top:32px}.reader-replies article{padding:20px 0;border-bottom:1px solid var(--reader-border)}
      .reader-action{background:var(--reader-link);color:var(--reader-bg)!important;padding:6px 18px;border-radius:8px;font-weight:650;text-decoration:none!important;box-sizing:border-box}
      .reader-links{list-style:none;margin:0;padding:0}.reader-links li{padding:16px 0;border-bottom:1px solid var(--reader-border)}
      @media(max-width:540px){.reader{padding-top:16px}.reader header{padding-top:24px}.reader nav{gap:8px 18px}}
    </style>`, { html: true }); } })
    .transform(response);
}
