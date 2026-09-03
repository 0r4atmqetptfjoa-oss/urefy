import { serviceRegistry, SERVICES } from './service-registry.js';
import { toastManager } from './toast.js';
import { diagramRenderer } from './diagram-renderer.js';

type SyntaxToken = {
  pattern: RegExp;
  className: string;
};

type LanguageDefinition = {
  keywords: SyntaxToken;
  strings: SyntaxToken;
  comments: SyntaxToken;
  numbers: SyntaxToken;
  builtins?: SyntaxToken;
  operators?: SyntaxToken;
};

const LANGUAGE_DEFINITIONS: Record<string, LanguageDefinition> = {
  javascript: {
    keywords: {
      pattern:
        /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|delete|typeof|instanceof|void|this|super|class|extends|import|export|default|from|async|await|try|catch|finally|throw|of|in|yield|static|get|set|null|undefined|true|false)\b/g,
      className: 'text-aether',
    },
    strings: {
      pattern: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
      className: 'text-signal',
    },
    comments: {
      pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
      className: 'text-slate-500 italic',
    },
    numbers: {
      pattern: /\b(\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,
      className: 'text-amber',
    },
    builtins: {
      pattern:
        /\b(console|Math|JSON|Object|Array|String|Number|Boolean|Promise|Error|Map|Set|Symbol|Proxy|Reflect|Date|RegExp|parseInt|parseFloat|isNaN|isFinite|encodeURIComponent|decodeURIComponent|setTimeout|setInterval|clearTimeout|clearInterval|fetch|window|document|navigator|location|history)\b/g,
      className: 'text-cyphr',
    },
  },
  typescript: {
    keywords: {
      pattern:
        /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|delete|typeof|instanceof|void|this|super|class|extends|import|export|default|from|async|await|try|catch|finally|throw|of|in|yield|static|get|set|null|undefined|true|false|type|interface|enum|namespace|declare|abstract|implements|readonly|keyof|infer|never|unknown|any|as|satisfies|override)\b/g,
      className: 'text-aether',
    },
    strings: {
      pattern: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
      className: 'text-signal',
    },
    comments: {
      pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
      className: 'text-slate-500 italic',
    },
    numbers: {
      pattern: /\b(\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,
      className: 'text-amber',
    },
    builtins: {
      pattern:
        /\b(string|number|boolean|object|symbol|bigint|Record|Partial|Required|Readonly|Pick|Omit|Exclude|Extract|NonNullable|ReturnType|InstanceType|Parameters|ConstructorParameters|Awaited|Array|Promise|Map|Set|Error|Date)\b/g,
      className: 'text-cyphr',
    },
  },
  python: {
    keywords: {
      pattern:
        /\b(def|class|return|if|elif|else|for|while|break|continue|pass|import|from|as|with|try|except|finally|raise|del|lambda|yield|global|nonlocal|assert|in|not|and|or|is|None|True|False|async|await)\b/g,
      className: 'text-aether',
    },
    strings: {
      pattern: /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
      className: 'text-signal',
    },
    comments: {
      pattern: /(#[^\n]*)/g,
      className: 'text-slate-500 italic',
    },
    numbers: {
      pattern: /\b(\d+\.?\d*(?:[eEjJ][+-]?\d+)?)\b/g,
      className: 'text-amber',
    },
    builtins: {
      pattern:
        /\b(print|len|range|enumerate|zip|map|filter|sorted|reversed|list|dict|set|tuple|str|int|float|bool|type|isinstance|issubclass|hasattr|getattr|setattr|delattr|open|input|super|property|staticmethod|classmethod|abs|max|min|sum|round|all|any)\b/g,
      className: 'text-cyphr',
    },
  },
  bash: {
    keywords: {
      pattern:
        /\b(if|then|else|elif|fi|for|while|do|done|case|esac|in|function|return|exit|break|continue|export|local|readonly|shift|source|echo|printf|read|set|unset|trap|wait|exec|eval)\b/g,
      className: 'text-aether',
    },
    strings: {
      pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
      className: 'text-signal',
    },
    comments: {
      pattern: /(#[^\n]*)/g,
      className: 'text-slate-500 italic',
    },
    numbers: {
      pattern: /\b(\d+)\b/g,
      className: 'text-amber',
    },
    operators: {
      pattern: /(\$\{?[\w@#?*!-]+\}?|\$\(.*?\))/g,
      className: 'text-cyphr',
    },
  },
  json: {
    keywords: {
      pattern: /\b(true|false|null)\b/g,
      className: 'text-aether',
    },
    strings: {
      pattern: /"(?:[^"\\]|\\.)*"/g,
      className: 'text-signal',
    },
    comments: {
      pattern: /(?!x)x/g,
      className: '',
    },
    numbers: {
      pattern: /(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g,
      className: 'text-amber',
    },
    operators: {
      pattern: /([{}[\],:])/g,
      className: 'text-cyphr',
    },
  },
  rust: {
    keywords: {
      pattern:
        /\b(fn|let|mut|pub|use|mod|struct|enum|impl|trait|for|while|loop|if|else|match|return|break|continue|in|as|where|type|const|static|self|Self|super|crate|move|ref|async|await|dyn|unsafe|extern|macro_rules|true|false)\b/g,
      className: 'text-aether',
    },
    strings: {
      pattern: /(r#*"[\s\S]*?"#*|"(?:[^"\\]|\\.)*")/g,
      className: 'text-signal',
    },
    comments: {
      pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
      className: 'text-slate-500 italic',
    },
    numbers: {
      pattern: /\b(\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?(?:u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64)?)\b/g,
      className: 'text-amber',
    },
    builtins: {
      pattern:
        /\b(String|Vec|HashMap|HashSet|Option|Result|Box|Rc|Arc|Mutex|RwLock|Cell|RefCell|Ok|Err|Some|None|println|print|eprintln|format|panic|assert|assert_eq|assert_ne|todo|unimplemented|unreachable|dbg|vec|Default|Clone|Copy|Debug|Display|Iterator|From|Into|TryFrom|TryInto|Send|Sync)\b/g,
      className: 'text-cyphr',
    },
  },
};

class MarkdownRenderer {
  // ─── XSS Safety ────────────────────────────────────────────────────────────

  public escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Syntax Highlighting ───────────────────────────────────────────────────

  private highlightCode(code: string, language: string): string {
    const def = LANGUAGE_DEFINITIONS[language.toLowerCase()];
    if (!def) return this.escapeHtml(code);

    type Segment = { text: string; cls: string | null };
    const segments: Segment[] = [{ text: code, cls: null }];

    const applyToken = (token: SyntaxToken): void => {
      if (!token.className) return;
      const result: Segment[] = [];
      for (const seg of segments) {
        if (seg.cls !== null) {
          result.push(seg);
          continue;
        }
        token.pattern.lastIndex = 0;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        const raw = seg.text;
        while ((match = token.pattern.exec(raw)) !== null) {
          if (match.index > lastIndex) {
            result.push({ text: raw.slice(lastIndex, match.index), cls: null });
          }
          result.push({ text: match[0], cls: token.className });
          lastIndex = match.index + match[0].length;
          if (match[0].length === 0) { token.pattern.lastIndex++; }
        }
        if (lastIndex < raw.length) {
          result.push({ text: raw.slice(lastIndex), cls: null });
        }
      }
      segments.length = 0;
      segments.push(...result);
    };

    applyToken(def.comments);
    applyToken(def.strings);
    if (def.builtins) applyToken(def.builtins);
    applyToken(def.keywords);
    applyToken(def.numbers);
    if (def.operators) applyToken(def.operators);

    return segments
      .map((seg) =>
        seg.cls === null
          ? this.escapeHtml(seg.text)
          : `<span class="${seg.cls}">${this.escapeHtml(seg.text)}</span>`,
      )
      .join('');
  }

  // ─── Block: Fenced Code ────────────────────────────────────────────────────

  private renderFencedCode(rawBlock: string, language: string): string {
    const safeLang = language ? language.replace(/[^a-zA-Z0-9_-]/g, '') : '';
    const highlighted = this.highlightCode(rawBlock, safeLang);
    const langClass = safeLang ? ` syntax-${this.escapeHtml(safeLang)} language-${this.escapeHtml(safeLang)}` : '';
    const displayLang = safeLang ? safeLang.toUpperCase() : 'CODE';
    const rawEncoded = encodeURIComponent(rawBlock);

    return (
      `<div class="code-terminal-card rounded-xl overflow-hidden border border-white/10 bg-surface-base my-3 shadow-lg group">` +
      `<div class="code-terminal-header flex items-center justify-between px-3 py-1.5 bg-surface-overlay/90 border-b border-white/5 text-[11px] font-mono select-none">` +
      `<div class="flex items-center space-x-2">` +
      `<span class="flex space-x-1">` +
      `<span class="w-2.5 h-2.5 rounded-full bg-rose-500/50 inline-block"></span>` +
      `<span class="w-2.5 h-2.5 rounded-full bg-amber-500/50 inline-block"></span>` +
      `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500/50 inline-block"></span>` +
      `</span>` +
      `<span class="text-slate-400 font-bold tracking-wider">${this.escapeHtml(displayLang)}</span>` +
      `</div>` +
      `<button ` +
      `type="button" ` +
      `class="btn-copy-code inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 hover:text-white bg-surface-base/60 hover:bg-surface-base border border-white/10 transition-all cursor-pointer" ` +
      `data-code-raw="${rawEncoded}"` +
      `>` +
      `<span>📋</span>` +
      `<span class="copy-label">Copy</span>` +
      `</button>` +
      `</div>` +
      `<pre class="bg-surface-overlay rounded-none p-3.5 overflow-x-auto m-0">` +
      `<code class="font-mono text-xs text-slate-200 leading-relaxed${langClass}">${highlighted}</code>` +
      `</pre>` +
      `</div>`
    );
  }

  // ─── Block: Blockquote ────────────────────────────────────────────────────

  private renderBlockquote(lines: string[]): string {
    const inner = lines.map((l) => l.replace(/^>\s?/, '')).join('\n');
    const rendered = this.renderInline(inner);
    return `<blockquote class="border-l-2 border-cyphr/40 pl-3 my-2 text-slate-400 italic">${rendered}</blockquote>`;
  }

  // ─── Block: Heading ───────────────────────────────────────────────────────

  private renderHeading(text: string, level: number): string {
    const inlineText = this.renderInline(text.trim());
    const sizeMap: Record<number, string> = {
      1: 'text-xl font-bold text-slate-100 mt-4 mb-2',
      2: 'text-lg font-bold text-slate-100 mt-3 mb-1.5',
      3: 'text-base font-bold text-slate-100 mt-2 mb-1',
    };
    const cls = sizeMap[level] ?? 'text-sm font-bold text-slate-100 mt-2 mb-1';
    return `<h${level} class="${cls}">${inlineText}</h${level}>`;
  }

  // ─── URL Sanitization ─────────────────────────────────────────────────────

  public sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') return '#';
    const trimmed = url.trim().replace(/[\x00-\x1F\x7F]/g, '');
    // Decode HTML entities in url to prevent bypasses
    const decoded = trimmed
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&colon;/gi, ':');

    // Strict protocol whitelist: http, https, mailto, ipfs, hyper, magnet, relative or hash
    const isSafeScheme = /^(https?:\/\/|mailto:|ipfs:\/\/|hyper:\/\/|magnet:\?|#|\/|\.\/)/i.test(decoded);
    const isDangerousScheme = /^(javascript|vbscript|data|file|about):/i.test(decoded);

    if (!isSafeScheme || isDangerousScheme) {
      return '#';
    }
    return this.escapeHtml(trimmed);
  }

  // ─── Inline Rendering ─────────────────────────────────────────────────────

  public renderInline(text: string): string {
    if (!text) return '';

    // Step 1: Protect inline code `...` by tokenizing
    const codeTokens: string[] = [];
    let out = text.replace(/`([^`\n]+)`/g, (_m, code) => {
      const idx = codeTokens.length;
      codeTokens.push(code);
      return `\uFFF0CODE${idx}\uFFF1`;
    });

    // Step 2: Protect links [text](url) by tokenizing
    const linkTokens: Array<{ text: string; href: string }> = [];
    out = out.replace(/\[([^\]]*)\]\(([^)]*)\)/g, (_m, linkText, href) => {
      const idx = linkTokens.length;
      linkTokens.push({ text: linkText, href });
      return `\uFFF0LINK${idx}\uFFF1`;
    });

    // Step 2b: Protect inline LaTeX math $...$ by tokenizing
    const mathTokens: string[] = [];
    out = out.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (match, math) => {
      if (/^\s*\d+(?:\.\d{1,2})?\s*$/.test(math) || !math.trim()) {
        return match; // preserve currency amounts
      }
      const idx = mathTokens.length;
      mathTokens.push(math);
      return `\uFFF0MATH${idx}\uFFF1`;
    });

    // Step 3: Escape remaining raw HTML to neutralize any script tags, event handlers, etc.
    out = this.escapeHtml(out);

    // Step 4: Apply Markdown inline formatting on the safe escaped string
    // Bold+Italic ***text***
    out = out.replace(
      /\*{3}([^*\n]+)\*{3}/g,
      (_m, t) => `<strong class="text-slate-100"><em class="text-slate-300 italic">${t}</em></strong>`
    );

    // Bold **text**
    out = out.replace(
      /\*{2}([^*\n]+)\*{2}/g,
      (_m, t) => `<strong class="text-slate-100">${t}</strong>`
    );

    // Italic *text*
    out = out.replace(
      /\*([^*\n]+)\*/g,
      (_m, t) => `<em class="text-slate-300 italic">${t}</em>`
    );

    // Bold __text__
    out = out.replace(
      /_{2}([^_\n]+)_{2}/g,
      (_m, t) => `<strong class="text-slate-100">${t}</strong>`
    );

    // Italic _text_
    out = out.replace(
      /_([^_\n]+)_/g,
      (_m, t) => `<em class="text-slate-300 italic">${t}</em>`
    );

    // Strikethrough ~~text~~
    out = out.replace(
      /~~([^~\n]+)~~/g,
      (_m, t) => `<del class="text-slate-500">${t}</del>`
    );

    // Step 5: Restore links with sanitized URL and escaped link text
    out = out.replace(/\uFFF0LINK(\d+)\uFFF1/g, (_m, idxStr) => {
      const token = linkTokens[parseInt(idxStr, 10)];
      if (!token) return '';
      const safeHref = this.sanitizeUrl(token.href);
      const safeText = this.escapeHtml(token.text);
      return `<a href="${safeHref}" class="text-cyphr hover:text-cyphr/80 underline underline-offset-2" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
    });

    // Step 6: Restore inline code with escaped code
    out = out.replace(/\uFFF0CODE(\d+)\uFFF1/g, (_m, idxStr) => {
      const code = codeTokens[parseInt(idxStr, 10)];
      if (code === undefined) return '';
      return `<code class="font-mono text-xs bg-surface-overlay text-cyphr px-1.5 py-0.5 rounded">${this.escapeHtml(code)}</code>`;
    });

    // Step 7: Restore inline math with diagramRenderer
    out = out.replace(/\uFFF0MATH(\d+)\uFFF1/g, (_m, idxStr) => {
      const math = mathTokens[parseInt(idxStr, 10)];
      if (math === undefined) return '';
      return diagramRenderer.renderInlineMath(math);
    });

    return out;
  }


  // ─── Block: List ──────────────────────────────────────────────────────────

  private renderList(lines: string[], ordered: boolean): string {
    const tag = ordered ? 'ol' : 'ul';
    const cls = ordered
      ? 'list-decimal list-inside my-2 space-y-0.5 text-slate-300'
      : 'list-disc list-inside my-2 space-y-0.5 text-slate-300';
    const items = lines
      .map((line) => {
        const content = line.replace(/^(\s*(?:\d+\.|-|\*|\+)\s)/, '');
        return `<li class="leading-relaxed">${this.renderInline(content)}</li>`;
      })
      .join('');
    return `<${tag} class="${cls}">${items}</${tag}>`;
  }

  // ─── Block: Horizontal Rule ───────────────────────────────────────────────

  private renderHr(): string {
    return `<hr class="border-0 border-t border-white/5 my-4" />`;
  }

  // ─── Block: Paragraph ────────────────────────────────────────────────────

  private renderParagraph(text: string): string {
    return `<p class="text-slate-300 leading-relaxed my-1.5">${this.renderInline(text)}</p>`;
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  public renderMarkdown(text: string): string {
    if (!text || text.trim() === '') return '';

    const htmlParts: string[] = [];
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Fenced code block
      const fenceMatch = line.match(/^```(\w*)$/);
      if (fenceMatch) {
        const lang = fenceMatch[1] ?? '';
        i++;
        const codeLines: string[] = [];
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        if (lang.toLowerCase() === 'mermaid') {
          htmlParts.push(diagramRenderer.renderMermaid(codeLines.join('\n')));
        } else {
          htmlParts.push(this.renderFencedCode(codeLines.join('\n'), lang));
        }
        continue;
      }

      // Block Math $$ ... $$
      if (line.trim().startsWith('$$')) {
        const singleLineMatch = line.trim().match(/^\$\$(.+?)\$\$$/);
        if (singleLineMatch) {
          htmlParts.push(diagramRenderer.renderBlockMath(singleLineMatch[1]));
          i++;
          continue;
        }

        const mathLines: string[] = [];
        const firstLineContent = line.trim().slice(2).trim();
        if (firstLineContent) mathLines.push(firstLineContent);
        i++;

        while (i < lines.length && !lines[i].trim().endsWith('$$')) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          const lastLineContent = lines[i].replace(/\$\$\s*$/, '').trim();
          if (lastLineContent) mathLines.push(lastLineContent);
          i++;
        }
        htmlParts.push(diagramRenderer.renderBlockMath(mathLines.join('\n')));
        continue;
      }

      // Horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        htmlParts.push(this.renderHr());
        i++;
        continue;
      }

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = Math.min(headingMatch[1].length, 6);
        htmlParts.push(this.renderHeading(headingMatch[2], level));
        i++;
        continue;
      }

      // Blockquote
      if (line.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('>')) {
          quoteLines.push(lines[i]);
          i++;
        }
        htmlParts.push(this.renderBlockquote(quoteLines));
        continue;
      }

      // Ordered list
      if (/^\s*\d+\.\s/.test(line)) {
        const listLines: string[] = [];
        while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
          listLines.push(lines[i]);
          i++;
        }
        htmlParts.push(this.renderList(listLines, true));
        continue;
      }

      // Unordered list
      if (/^\s*[-*+]\s/.test(line)) {
        const listLines: string[] = [];
        while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) {
          listLines.push(lines[i]);
          i++;
        }
        htmlParts.push(this.renderList(listLines, false));
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        htmlParts.push(`<br />`);
        i++;
        continue;
      }

      // Paragraph — collect consecutive non-special lines
      const paraLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^#{1,6}\s/.test(lines[i]) &&
        !lines[i].startsWith('>') &&
        !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]) &&
        !/^\s*[-*+]\s/.test(lines[i]) &&
        !/^\s*\d+\.\s/.test(lines[i]) &&
        !/^```/.test(lines[i]) &&
        !lines[i].trim().startsWith('$$')
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        htmlParts.push(this.renderParagraph(paraLines.join(' ')));
      }
    }

    return htmlParts.join('\n');
  }

  /**
   * Seamless rich content rendering: processes math notation and mermaid diagrams
   */
  public renderRichContent(content: string): string {
    return diagramRenderer.renderRichContent(content);
  }
}

export const markdownRenderer = new MarkdownRenderer();
serviceRegistry.registerInstance(SERVICES.MarkdownRenderer, markdownRenderer);
export { diagramRenderer } from './diagram-renderer.js';
export type { MarkdownRenderer };

export function initCodeCopyListener(): void {
  if (typeof document === 'undefined') return;
  if ((window as any).__aetheris_code_copy_bound) return;
  (window as any).__aetheris_code_copy_bound = true;

  document.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement)?.closest('.btn-copy-code') as HTMLButtonElement | null;
    if (!btn) return;

    const rawEncoded = btn.getAttribute('data-code-raw');
    if (!rawEncoded) return;

    const code = decodeURIComponent(rawEncoded);
    navigator.clipboard.writeText(code).then(() => {
      const label = btn.querySelector('.copy-label');
      if (label) label.textContent = 'Copied!';
      btn.classList.add('text-emerald-400', 'border-emerald-500/50', 'bg-emerald-500/10');
      toastManager.success('Code copied to clipboard', '📋');
      setTimeout(() => {
        if (label) label.textContent = 'Copy';
        btn.classList.remove('text-emerald-400', 'border-emerald-500/50', 'bg-emerald-500/10');
      }, 2000);
    }).catch(() => {});
  });
}

if (typeof window !== 'undefined') {
  initCodeCopyListener();
}

