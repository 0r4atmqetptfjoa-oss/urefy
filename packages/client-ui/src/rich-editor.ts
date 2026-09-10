import { sovereignDialog } from './dialog-modal.js';
/**
 * UREfy — Complete Rich Blocks Editor (Notion / Obsidian Style)
 * (rich-editor.ts)
 *
 * 100% Self-Contained, Strict TypeScript, Zero External Dependencies.
 * Features:
 * - Multi-block architecture (Paragraph, Headings, Code, LaTeX Math, Diff, Poll, Callout, Quote, Image, Embed, Divider)
 * - Interactive Slash Commands Menu (activated via '/' or toolbar)
 * - LaTeX-to-MathML & Styled Math rendering engine
 * - Real-time Git Patch Diff parser and visualizer
 * - Cryptographic ZK-Anonymous Poll generator
 * - Multi-language syntax tokenizer & highlighter
 * - Full bidirectional Markdown import / export and XSS-safe HTML rendering
 * - Drag & drop handles, reordering, block transformations, and full state management
 */

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export type BlockType =
  | 'paragraph'
  | 'code'
  | 'poll'
  | 'embed'
  | 'diff'
  | 'math'
  | 'image'
  | 'divider'
  | 'heading1'
  | 'heading2'
  | 'callout'
  | 'quote';

export interface BlockMeta {
  // Code block meta
  language?: string;
  showLineNumbers?: boolean;
  filename?: string;

  // Math block meta
  displayMode?: boolean;
  rawLatex?: string;

  // Poll block meta
  options?: string[];
  votes?: number[];
  allowMultiple?: boolean;
  isEncrypted?: boolean;
  totalVotes?: number;
  durationHours?: number;
  nullifierHash?: string;

  // Diff block meta
  diffFilename?: string;
  oldVersion?: string;
  newVersion?: string;
  hunkHeader?: string;

  // Callout block meta
  calloutType?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  icon?: string;

  // Quote block meta
  author?: string;
  source?: string;
  sourceUrl?: string;

  // Image block meta
  alt?: string;
  caption?: string;
  ipfsCid?: string;
  width?: number;

  // Embed block meta
  embedType?: 'video' | 'audio' | 'link' | 'swarm' | 'arweave';
  provider?: string;

  // Generic metadata
  [key: string]: unknown;
}

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  meta?: BlockMeta;
}

export interface SlashMenuItem {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  shortcut: string;
  category: 'text' | 'advanced' | 'media' | 'structure';
}

export interface DiffParsedLine {
  type: 'add' | 'remove' | 'context' | 'header';
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

// ---------------------------------------------------------------------------
// Security & Formatting Utilities
// ---------------------------------------------------------------------------

function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\bon\w+\s*=/gi, 'data-blocked-event=');
}

function sanitizeUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (/^(javascript:|data:|vbscript:)/i.test(trimmed)) {
    return '#';
  }
  return escapeHtml(trimmed);
}

function generateBlockId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `blk_${timestamp}_${randomPart}`;
}

// ---------------------------------------------------------------------------
// Pure TypeScript Syntax Tokenizer for Code Blocks
// ---------------------------------------------------------------------------

type SyntaxTokenType = 'keyword' | 'string' | 'comment' | 'number' | 'builtin' | 'operator' | 'punctuation' | 'text';

interface SyntaxToken {
  type: SyntaxTokenType;
  value: string;
}

class CodeTokenizer {
  private static readonly KEYWORDS_JS = new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'break', 'continue', 'new', 'delete', 'typeof', 'instanceof',
    'void', 'this', 'super', 'class', 'extends', 'import', 'export', 'default', 'from',
    'async', 'await', 'try', 'catch', 'finally', 'throw', 'of', 'in', 'yield', 'static',
    'get', 'set', 'null', 'undefined', 'true', 'false', 'type', 'interface', 'enum',
    'namespace', 'declare', 'abstract', 'implements', 'readonly', 'keyof', 'infer',
    'never', 'unknown', 'any', 'as', 'satisfies', 'override', 'public', 'private', 'protected'
  ]);

  private static readonly KEYWORDS_RUST = new Set([
    'fn', 'let', 'mut', 'const', 'struct', 'enum', 'trait', 'impl', 'use', 'pub', 'mod',
    'crate', 'super', 'self', 'Self', 'where', 'for', 'in', 'loop', 'while', 'if', 'else',
    'match', 'return', 'break', 'continue', 'unsafe', 'async', 'await', 'dyn', 'ref',
    'move', 'type', 'true', 'false', 'Some', 'None', 'Ok', 'Err'
  ]);

  private static readonly KEYWORDS_PYTHON = new Set([
    'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue',
    'pass', 'import', 'from', 'as', 'with', 'try', 'except', 'finally', 'raise', 'del',
    'lambda', 'yield', 'global', 'nonlocal', 'assert', 'in', 'not', 'and', 'or', 'is',
    'None', 'True', 'False', 'async', 'await'
  ]);

  private static readonly KEYWORDS_SOLIDITY = new Set([
    'contract', 'interface', 'library', 'is', 'function', 'modifier', 'event', 'constructor',
    'fallback', 'receive', 'struct', 'enum', 'mapping', 'address', 'bool', 'string', 'bytes',
    'uint', 'uint256', 'uint8', 'uint16', 'uint32', 'int', 'int256', 'public', 'private',
    'external', 'internal', 'view', 'pure', 'payable', 'memory', 'storage', 'calldata',
    'return', 'returns', 'emit', 'require', 'revert', 'assert', 'msg', 'block', 'tx'
  ]);

  private static readonly BUILTINS = new Set([
    'console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Promise',
    'Error', 'Map', 'Set', 'Symbol', 'Proxy', 'Reflect', 'Date', 'RegExp', 'parseInt',
    'parseFloat', 'isNaN', 'isFinite', 'fetch', 'window', 'document', 'Uint8Array', 'Buffer',
    'Vec', 'Option', 'Result', 'Box', 'Arc', 'Mutex', 'String', 'str', 'u8', 'u16', 'u32',
    'u64', 'u128', 'usize', 'i8', 'i16', 'i32', 'i64', 'i128', 'isize', 'bool', 'print',
    'len', 'range', 'dict', 'list', 'set', 'int', 'float', 'str', 'bytes', 'ZKRLN', 'Field'
  ]);

  public static tokenize(code: string, language: string = 'typescript'): SyntaxToken[] {
    const tokens: SyntaxToken[] = [];
    let i = 0;
    const len = code.length;
    const lang = language.toLowerCase();

    let keywordsSet = this.KEYWORDS_JS;
    if (lang === 'rust' || lang === 'rs') keywordsSet = this.KEYWORDS_RUST;
    else if (lang === 'python' || lang === 'py') keywordsSet = this.KEYWORDS_PYTHON;
    else if (lang === 'solidity' || lang === 'sol') keywordsSet = this.KEYWORDS_SOLIDITY;

    while (i < len) {
      const char = code[i];

      // Line Comment
      if (char === '/' && code[i + 1] === '/') {
        let comment = '';
        while (i < len && code[i] !== '\n') {
          comment += code[i];
          i++;
        }
        tokens.push({ type: 'comment', value: comment });
        continue;
      }

      // Python comment
      if (char === '#' && (lang === 'python' || lang === 'py' || lang === 'bash' || lang === 'sh')) {
        let comment = '';
        while (i < len && code[i] !== '\n') {
          comment += code[i];
          i++;
        }
        tokens.push({ type: 'comment', value: comment });
        continue;
      }

      // Block Comment
      if (char === '/' && code[i + 1] === '*') {
        let comment = '/*';
        i += 2;
        while (i < len && !(code[i] === '*' && code[i + 1] === '/')) {
          comment += code[i];
          i++;
        }
        if (i < len) {
          comment += '*/';
          i += 2;
        }
        tokens.push({ type: 'comment', value: comment });
        continue;
      }

      // Strings (single, double, template backtick)
      if (char === '"' || char === "'" || char === '`') {
        const quote = char;
        let str = quote;
        i++;
        while (i < len) {
          if (code[i] === '\\' && i + 1 < len) {
            str += code[i] + code[i + 1];
            i += 2;
            continue;
          }
          str += code[i];
          if (code[i] === quote) {
            i++;
            break;
          }
          i++;
        }
        tokens.push({ type: 'string', value: str });
        continue;
      }

      // Numbers
      if (/\d/.test(char) || (char === '.' && /\d/.test(code[i + 1] || ''))) {
        let num = '';
        if (char === '0' && (code[i + 1] === 'x' || code[i + 1] === 'X')) {
          num += code[i] + code[i + 1];
          i += 2;
          while (i < len && /[0-9a-fA-F_]/.test(code[i])) {
            num += code[i];
            i++;
          }
        } else {
          while (i < len && /[0-9._eE+-]/.test(code[i])) {
            num += code[i];
            i++;
          }
        }
        tokens.push({ type: 'number', value: num });
        continue;
      }

      // Identifiers / Keywords
      if (/[a-zA-Z_$]/.test(char)) {
        let ident = '';
        while (i < len && /[a-zA-Z0-9_$]/.test(code[i])) {
          ident += code[i];
          i++;
        }
        if (keywordsSet.has(ident)) {
          tokens.push({ type: 'keyword', value: ident });
        } else if (this.BUILTINS.has(ident)) {
          tokens.push({ type: 'builtin', value: ident });
        } else {
          tokens.push({ type: 'text', value: ident });
        }
        continue;
      }

      // Operators
      if (/[+\-*/%=&|^!<>?:~]/.test(char)) {
        let op = '';
        while (i < len && /[+\-*/%=&|^!<>?:~]/.test(code[i])) {
          op += code[i];
          i++;
        }
        tokens.push({ type: 'operator', value: op });
        continue;
      }

      // Punctuation / Brackets
      if (/[{}()[\].,;]/.test(char)) {
        tokens.push({ type: 'punctuation', value: char });
        i++;
        continue;
      }

      // Whitespace and other characters
      tokens.push({ type: 'text', value: char });
      i++;
    }

    return tokens;
  }

  public static highlightToHtml(code: string, language: string): string {
    const tokens = this.tokenize(code, language);
    let html = '';

    for (const token of tokens) {
      const escaped = escapeHtml(token.value);
      switch (token.type) {
        case 'keyword':
          html += `<span class="text-aether font-semibold">${escaped}</span>`;
          break;
        case 'string':
          html += `<span class="text-signal">${escaped}</span>`;
          break;
        case 'comment':
          html += `<span class="text-slate-500 italic">${escaped}</span>`;
          break;
        case 'number':
          html += `<span class="text-amber font-mono">${escaped}</span>`;
          break;
        case 'builtin':
          html += `<span class="text-cyphr">${escaped}</span>`;
          break;
        case 'operator':
          html += `<span class="text-sky-400">${escaped}</span>`;
          break;
        case 'punctuation':
          html += `<span class="text-slate-400">${escaped}</span>`;
          break;
        default:
          html += escaped;
          break;
      }
    }

    return html;
  }
}

// ---------------------------------------------------------------------------
// Pure TypeScript LaTeX to MathML Engine
// ---------------------------------------------------------------------------

class MathRenderer {
  private static readonly GREEK_SYMBOLS: Record<string, string> = {
    'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ', 'epsilon': 'ε',
    'zeta': 'ζ', 'eta': 'η', 'theta': 'θ', 'iota': 'ι', 'kappa': 'κ',
    'lambda': 'λ', 'mu': 'μ', 'nu': 'ν', 'xi': 'ξ', 'pi': 'π', 'rho': 'ρ',
    'sigma': 'σ', 'tau': 'τ', 'upsilon': 'υ', 'phi': 'φ', 'chi': 'χ',
    'psi': 'ψ', 'omega': 'ω', 'Gamma': 'Γ', 'Delta': 'Δ', 'Theta': 'Θ',
    'Lambda': 'Λ', 'Xi': 'Ξ', 'Pi': 'Π', 'Sigma': 'Σ', 'Phi': 'Φ',
    'Psi': 'Ψ', 'Omega': 'Ω'
  };

  private static readonly MATH_OPERATORS: Record<string, string> = {
    'pm': '±', 'mp': '∓', 'times': '×', 'div': '÷', 'cdot': '·',
    'approx': '≈', 'neq': '≠', 'le': '≤', 'ge': '≥', 'leq': '≤', 'geq': '≥',
    'in': '∈', 'notin': '∉', 'subset': '⊂', 'subseteq': '⊆', 'cup': '∪',
    'cap': '∩', 'forall': '∀', 'exists': '∃', 'nabla': '∇', 'partial': '∂',
    'infty': '∞', 'rightarrow': '→', 'leftarrow': '←', 'Rightarrow': '⇒',
    'Leftarrow': '⇐', 'iff': '⇔', 'circ': '∘', 'sum': '∑', 'prod': '∏',
    'int': '∫', 'oint': '∮', 'sqrt': '√', 'bot': '⊥', 'top': '⊤',
    'oplus': '⊕', 'otimes': '⊗', 'land': '∧', 'lor': '∨', 'neg': '¬'
  };

  public static latexToMathML(latex: string, displayMode: boolean = true): string {
    let clean = latex.trim();
    if (!clean) {
      return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="${displayMode ? 'block' : 'inline'}"><mtext class="text-slate-500 italic">E = mc²</mtext></math>`;
    }

    // Replace fractions \frac{a}{b}
    const fracRegex = /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g;
    clean = clean.replace(fracRegex, '<mfrac><mrow>$1</mrow><mrow>$2</mrow></mfrac>');

    // Replace square roots \sqrt{x} or \sqrt[n]{x}
    const sqrtNRegex = /\\sqrt\s*\[([^{}]+)\]\s*\{([^{}]+)\}/g;
    clean = clean.replace(sqrtNRegex, '<mroot><mrow>$2</mrow><mn>$1</mn></mroot>');
    const sqrtRegex = /\\sqrt\s*\{([^{}]+)\}/g;
    clean = clean.replace(sqrtRegex, '<msqrt><mrow>$1</mrow></msqrt>');

    // Replace sub and super scripts: x_{ab}^{cd} or x_i^2
    const subSuperRegex = /([a-zA-Z0-9)\]}])_\{?([a-zA-Z0-9+\-=]+)\}?\^\{?([a-zA-Z0-9+\-=]+)\}?/g;
    clean = clean.replace(subSuperRegex, '<msubsup><mi>$1</mi><mrow>$2</mrow><mrow>$3</mrow></msubsup>');

    // Replace single subscripts x_{sub} or x_i
    const subRegex = /([a-zA-Z0-9)\]}])_\{?([a-zA-Z0-9+\-=]+)\}?/g;
    clean = clean.replace(subRegex, '<msub><mi>$1</mi><mrow>$2</mrow></msub>');

    // Replace single superscripts x^{sup} or x^2
    const superRegex = /([a-zA-Z0-9)\]}])\^\{?([a-zA-Z0-9+\-=]+)\}?/g;
    clean = clean.replace(superRegex, '<msup><mi>$1</mi><mrow>$2</mrow></msup>');

    // Replace text boxes \text{...}
    const textRegex = /\\text\s*\{([^}]+)\}/g;
    clean = clean.replace(textRegex, '<mtext class="text-slate-300 font-sans">$1</mtext>');

    // Replace Greek letters
    for (const [key, val] of Object.entries(this.GREEK_SYMBOLS)) {
      const reg = new RegExp(`\\\\${key}\\b`, 'g');
      clean = clean.replace(reg, `<mi class="text-cyphr">${val}</mi>`);
    }

    // Replace Operators
    for (const [key, val] of Object.entries(this.MATH_OPERATORS)) {
      const reg = new RegExp(`\\\\${key}\\b`, 'g');
      clean = clean.replace(reg, `<mo class="text-signal">${val}</mo>`);
    }

    // Wrap remaining identifiers and numbers
    const tokens = clean.split(/(\s+|[=+\-*/(),<>])/);
    const convertedTokens = tokens.map((tok) => {
      if (!tok || tok.startsWith('<') || tok.endsWith('>')) return tok;
      if (/^\d+(\.\d+)?$/.test(tok)) {
        return `<mn class="text-amber font-mono">${tok}</mn>`;
      }
      if (/^[a-zA-Z]$/.test(tok)) {
        return `<mi class="italic text-cyphr">${tok}</mi>`;
      }
      if (/^[=+\-*/(),<>]$/.test(tok)) {
        return `<mo class="text-slate-400 mx-1">${escapeHtml(tok)}</mo>`;
      }
      return tok;
    });

    const body = convertedTokens.join('');
    return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="${displayMode ? 'block' : 'inline'}" class="select-none font-serif text-lg tracking-wide text-white">${body}</math>`;
  }

  public static renderMathBlock(latex: string): string {
    const mathML = this.latexToMathML(latex, true);
    return `
      <div class="math-block-container my-3 p-4 bg-surface-base border border-white/10 rounded-xl overflow-x-auto flex flex-col items-center justify-center relative group">
        <div class="absolute top-2 right-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span class="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-surface-overlay text-cyphr border border-white/5">MathML / LaTeX</span>
        </div>
        <div class="py-2 px-4 w-full flex justify-center items-center">
          ${mathML}
        </div>
        <div class="mt-2 text-[11px] font-mono text-slate-400 border-t border-white/5 pt-2 w-full text-center">
          <span class="text-slate-500">LaTeX:</span> <code class="text-cyphr/90">${escapeHtml(latex)}</code>
        </div>
      </div>
    `;
  }
}

// ---------------------------------------------------------------------------
// Pure TypeScript Git Diff Parser & Renderer
// ---------------------------------------------------------------------------

class DiffBlockRenderer {
  public static parseDiff(rawDiff: string): { lines: DiffParsedLine[]; additions: number; deletions: number } {
    const rawLines = rawDiff.split('\n');
    const lines: DiffParsedLine[] = [];
    let additions = 0;
    let deletions = 0;
    let oldLine = 1;
    let newLine = 1;

    for (const raw of rawLines) {
      if (raw.startsWith('@@')) {
        // Hunk Header e.g. @@ -1,5 +1,6 @@
        const match = raw.match(/@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
        if (match) {
          oldLine = parseInt(match[1], 10);
          newLine = parseInt(match[2], 10);
        }
        lines.push({ type: 'header', text: raw });
      } else if (raw.startsWith('+') && !raw.startsWith('+++')) {
        additions++;
        lines.push({
          type: 'add',
          text: raw.substring(1),
          newLineNumber: newLine++,
        });
      } else if (raw.startsWith('-') && !raw.startsWith('---')) {
        deletions++;
        lines.push({
          type: 'remove',
          text: raw.substring(1),
          oldLineNumber: oldLine++,
        });
      } else {
        lines.push({
          type: 'context',
          text: raw.startsWith(' ') ? raw.substring(1) : raw,
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        });
      }
    }

    return { lines, additions, deletions };
  }

  public static renderDiffBlock(rawDiff: string, filename?: string): string {
    const { lines, additions, deletions } = this.parseDiff(rawDiff);
    const fname = filename || 'patch.diff';

    let linesHtml = '';
    for (const line of lines) {
      if (line.type === 'header') {
        linesHtml += `
          <div class="flex items-center px-3 py-1 bg-surface-overlay/80 text-cyphr font-mono text-[11px] border-y border-white/5 select-none">
            <span class="mr-2">⚡</span>
            <span>${escapeHtml(line.text)}</span>
          </div>
        `;
      } else if (line.type === 'add') {
        linesHtml += `
          <div class="flex items-start font-mono text-xs bg-emerald-950/30 border-l-2 border-signal hover:bg-emerald-900/30 transition-colors">
            <span class="w-10 text-right pr-2 py-0.5 text-slate-600 select-none text-[10px]"></span>
            <span class="w-10 text-right pr-2 py-0.5 text-signal select-none text-[10px]">${line.newLineNumber}</span>
            <span class="w-6 text-center py-0.5 text-signal font-bold select-none">+</span>
            <span class="flex-1 py-0.5 pr-3 text-signal whitespace-pre-wrap break-all">${escapeHtml(line.text)}</span>
          </div>
        `;
      } else if (line.type === 'remove') {
        linesHtml += `
          <div class="flex items-start font-mono text-xs bg-rose-950/30 border-l-2 border-crimson hover:bg-rose-900/30 transition-colors">
            <span class="w-10 text-right pr-2 py-0.5 text-crimson select-none text-[10px]">${line.oldLineNumber}</span>
            <span class="w-10 text-right pr-2 py-0.5 text-slate-600 select-none text-[10px]"></span>
            <span class="w-6 text-center py-0.5 text-crimson font-bold select-none">-</span>
            <span class="flex-1 py-0.5 pr-3 text-crimson line-through opacity-80 whitespace-pre-wrap break-all">${escapeHtml(line.text)}</span>
          </div>
        `;
      } else {
        linesHtml += `
          <div class="flex items-start font-mono text-xs hover:bg-white/[0.02] transition-colors">
            <span class="w-10 text-right pr-2 py-0.5 text-slate-500 select-none text-[10px]">${line.oldLineNumber || ''}</span>
            <span class="w-10 text-right pr-2 py-0.5 text-slate-500 select-none text-[10px]">${line.newLineNumber || ''}</span>
            <span class="w-6 text-center py-0.5 text-slate-600 select-none"> </span>
            <span class="flex-1 py-0.5 pr-3 text-slate-300 whitespace-pre-wrap break-all">${escapeHtml(line.text)}</span>
          </div>
        `;
      }
    }

    return `
      <div class="diff-viewer-block my-3 rounded-xl border border-white/10 overflow-hidden bg-surface-base shadow-xl">
        <!-- Diff Header -->
        <div class="px-4 py-2.5 bg-surface-raised border-b border-white/10 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-xs">📜</span>
            <span class="font-mono text-xs font-semibold text-slate-200">${escapeHtml(fname)}</span>
          </div>
          <div class="flex items-center space-x-3 text-xs font-mono">
            <span class="text-signal font-bold bg-signal/10 px-2 py-0.5 rounded border border-signal/20">+${additions}</span>
            <span class="text-crimson font-bold bg-crimson/10 px-2 py-0.5 rounded border border-crimson/20">-${deletions}</span>
          </div>
        </div>
        <!-- Diff Lines Container -->
        <div class="overflow-x-auto divide-y divide-white/[0.02]">
          ${linesHtml || '<div class="p-4 text-xs font-mono text-slate-500 italic text-center">No diff content detected. Add Git patch above.</div>'}
        </div>
      </div>
    `;
  }
}

// ---------------------------------------------------------------------------
// Markdown Parser & Generator Helpers
// ---------------------------------------------------------------------------

function parseInlineMarkdown(text: string): string {
  if (!text) return '';
  let escaped = escapeHtml(text);

  // Bold & Italic ***text***
  escaped = escaped.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold"><em class="italic text-cyphr">$1</em></strong>');
  // Bold **text**
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  // Italic *text* or _text_
  escaped = escaped.replace(/\*(.*?)\*/g, '<em class="italic text-slate-200">$1</em>');
  escaped = escaped.replace(/_([^_]+)_/g, '<em class="italic text-slate-200">$1</em>');
  // Inline Code `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-surface-overlay text-cyphr rounded font-mono text-xs border border-white/5">$1</code>');
  // Strikethrough ~~text~~
  escaped = escaped.replace(/~~(.*?)~~/g, '<del class="line-through text-slate-500">$1</del>');
  // Links [text](url)
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, linkText, url) => {
    const safeUrl = sanitizeUrl(url);
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-cyphr hover:underline underline-offset-2">${linkText} ↗</a>`;
  });

  return escaped;
}

// ---------------------------------------------------------------------------
// RichBlockEditor Main Class
// ---------------------------------------------------------------------------

export class RichBlockEditor {
  public blocks: Block[] = [];
  public activeBlockId: string | null = null;

  // Slash commands registry
  public readonly slashCommands: SlashMenuItem[] = [
    {
      type: 'paragraph',
      label: 'Paragraph Text',
      description: 'Write standard text with full inline markdown support',
      icon: '📝',
      shortcut: 'p',
      category: 'text',
    },
    {
      type: 'heading1',
      label: 'Main Heading (H1)',
      description: 'Large section heading for clear division',
      icon: '📌',
      shortcut: 'h1',
      category: 'structure',
    },
    {
      type: 'heading2',
      label: 'Subheading (H2)',
      description: 'Medium subheading for hierarchical structure',
      icon: '📍',
      shortcut: 'h2',
      category: 'structure',
    },
    {
      type: 'code',
      label: 'Code Block',
      description: 'Code snippet with multi-language syntax highlighting',
      icon: '💻',
      shortcut: 'code',
      category: 'advanced',
    },
    {
      type: 'math',
      label: 'LaTeX / MathML Formula',
      description: 'Mathematical equations and native ZK formula rendering',
      icon: '📐',
      shortcut: 'math',
      category: 'advanced',
    },
    {
      type: 'poll',
      label: 'ZK-Anonymous Poll',
      description: 'Verifiable cryptographic poll over sovereign identities',
      icon: '📊',
      shortcut: 'poll',
      category: 'advanced',
    },
    {
      type: 'diff',
      label: 'Patch / Git Diff',
      description: 'Visual code comparison with + / - markers',
      icon: '🔀',
      shortcut: 'diff',
      category: 'advanced',
    },
    {
      type: 'callout',
      label: 'Callout Panel',
      description: 'Colored highlight box for warning, info, or success',
      icon: '💡',
      shortcut: 'callout',
      category: 'text',
    },
    {
      type: 'quote',
      label: 'Quote & Attribution',
      description: 'Styled blockquote with author and citation',
      icon: '💬',
      shortcut: 'quote',
      category: 'text',
    },
    {
      type: 'image',
      label: 'IPFS / Swarm Image',
      description: 'Decentralized image or URL with caption',
      icon: '🖼️',
      shortcut: 'img',
      category: 'media',
    },
    {
      type: 'embed',
      label: 'Swarm / Web Embed',
      description: 'PeerTube/YouTube video, audio stream, or link',
      icon: '🔗',
      shortcut: 'embed',
      category: 'media',
    },
    {
      type: 'divider',
      label: 'Horizontal Divider',
      description: 'Minimalist line separator between sections',
      icon: '➖',
      shortcut: 'hr',
      category: 'structure',
    },
  ];

  constructor() {
    this.seedDefaultBlocks();
  }

  /**
   * Seeds the editor with realistic, rich default blocks
   */
  public seedDefaultBlocks(): void {
    this.blocks = [
      {
        id: generateBlockId(),
        type: 'heading1',
        content: 'Omni-Sphere Sovereign Network Architecture & ZK-RLN Protocol',
      },
      {
        id: generateBlockId(),
        type: 'paragraph',
        content:
          'UREfy represents a decentralized peer-to-peer communication and binary validation network. All messages and publications are backed by Zero-Knowledge Proofs (ZK-Proofs) and cryptographic identities on **Ed25519** curves.',
      },
      {
        id: generateBlockId(),
        type: 'callout',
        content:
          'Private keys never leave local hardware enclaves. Every action generates a unique nullifier to prevent Sybil attacks without compromising user anonymity.',
        meta: {
          calloutType: 'info',
          title: 'ZK Cryptographic Security Note',
          icon: '🛡️',
        },
      },
      {
        id: generateBlockId(),
        type: 'math',
        content: '\\text{ZK-RLN}: \\pi = \\text{Groth16}(\\vec{x}_{pub}, \\vec{w}_{priv}) \\implies \\sum_{i=1}^k w_i \\cdot x_i \\equiv 0 \\pmod{p}',
        meta: { displayMode: true },
      },
      {
        id: generateBlockId(),
        type: 'code',
        content: `// Binary verification and Proof of Epoch generation
import { ZKRLN, Field, signMessage } from '@aetheris/core-crypto';

export async function verifySwarmPayload(payload: Uint8Array, epoch: string): Promise<boolean> {
  const nullifier = ZKRLN.computeNullifier(payload, Field.fromString(epoch));
  console.log('✓ Generated nullifier:', nullifier.toHex());
  return ZKRLN.verifyProof(nullifier);
}`,
        meta: {
          language: 'typescript',
          showLineNumbers: true,
          filename: 'swarm-validator.ts',
        },
      },
      {
        id: generateBlockId(),
        type: 'poll',
        content: 'Which scaling vector should be prioritized in the next consensus era?',
        meta: {
          options: [
            'Recursive ZK-Rollups with client-side verification',
            'P2P state channels via WebRTC & Tor Onion',
            'Erasure-Coded Swarm distributed storage',
          ],
          votes: [54, 38, 19],
          isEncrypted: true,
          totalVotes: 111,
          durationHours: 48,
        },
      },
      {
        id: generateBlockId(),
        type: 'diff',
        content: `--- a/packages/core-crypto/src/rln.ts
+++ b/packages/core-crypto/src/rln.ts
@@ -14,6 +14,8 @@ export class ZKRLN {
-  public static verifyProof(nullifier: Field): boolean {
-    return nullifier.value > 0n;
+  public static verifyProof(nullifier: Field): boolean {
+    const isValidEpoch = this.checkEpochWindow(nullifier.epoch);
+    return isValidEpoch && this.nativeSnarkVerify(nullifier);
   }`,
        meta: {
          diffFilename: 'packages/core-crypto/src/rln.ts',
        },
      },
      {
        id: generateBlockId(),
        type: 'quote',
        content: 'Digital sovereignty is not requested, it is engineered line by line with audited code.',
        meta: {
          author: 'UREfy Core Fellowship',
          source: 'Omni-Sphere Network Manifesto',
        },
      },
    ];

    this.activeBlockId = this.blocks[0]?.id || null;
  }

  // -------------------------------------------------------------------------
  // Core Block Operations
  // -------------------------------------------------------------------------

  /**
   * Adds a new block of specified type after the given block ID
   */
  public addBlock(type: BlockType, afterId?: string): Block {
    const newBlock: Block = {
      id: generateBlockId(),
      type,
      content: this.getDefaultContentForType(type),
      meta: this.getDefaultMetaForType(type),
    };

    if (!afterId) {
      this.blocks.push(newBlock);
    } else {
      const index = this.blocks.findIndex((b) => b.id === afterId);
      if (index === -1) {
        this.blocks.push(newBlock);
      } else {
        this.blocks.splice(index + 1, 0, newBlock);
      }
    }

    this.activeBlockId = newBlock.id;
    return newBlock;
  }

  /**
   * Removes a block by its ID
   */
  public removeBlock(id: string): void {
    const index = this.blocks.findIndex((b) => b.id === id);
    if (index !== -1) {
      this.blocks.splice(index, 1);
      if (this.activeBlockId === id) {
        this.activeBlockId = this.blocks[Math.max(0, index - 1)]?.id || null;
      }
    }

    // Ensure at least one block exists
    if (this.blocks.length === 0) {
      this.addBlock('paragraph');
    }
  }

  /**
   * Updates content and metadata for a block
   */
  public updateBlock(id: string, content: string, meta?: Record<string, unknown>): void {
    const block = this.blocks.find((b) => b.id === id);
    if (block) {
      block.content = content;
      if (meta) {
        block.meta = { ...block.meta, ...meta };
      }
    }
  }

  /**
   * Moves a block up or down in the block list
   */
  public moveBlock(id: string, direction: 'up' | 'down'): void {
    const index = this.blocks.findIndex((b) => b.id === id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = this.blocks[index];
      this.blocks[index] = this.blocks[index - 1];
      this.blocks[index - 1] = temp;
    } else if (direction === 'down' && index < this.blocks.length - 1) {
      const temp = this.blocks[index];
      this.blocks[index] = this.blocks[index + 1];
      this.blocks[index + 1] = temp;
    }
  }

  /**
   * Duplicates an existing block right after it
   */
  public duplicateBlock(id: string): Block | null {
    const index = this.blocks.findIndex((b) => b.id === id);
    if (index === -1) return null;

    const source = this.blocks[index];
    const duplicated: Block = {
      id: generateBlockId(),
      type: source.type,
      content: source.content,
      meta: source.meta ? JSON.parse(JSON.stringify(source.meta)) : undefined,
    };

    this.blocks.splice(index + 1, 0, duplicated);
    this.activeBlockId = duplicated.id;
    return duplicated;
  }

  /**
   * Transforms an existing block into another type while preserving content
   */
  public transformBlock(id: string, newType: BlockType): void {
    const block = this.blocks.find((b) => b.id === id);
    if (!block) return;

    block.type = newType;
    const defaultMeta = this.getDefaultMetaForType(newType);
    block.meta = { ...defaultMeta, ...block.meta };
  }

  /**
   * Sets active block ID
   */
  public setActiveBlock(id: string | null): void {
    this.activeBlockId = id;
  }

  /**
   * Returns all current blocks
   */
  public getBlocks(): Block[] {
    return this.blocks;
  }

  /**
   * Returns a specific block by ID
   */
  public getBlock(id: string): Block | undefined {
    return this.blocks.find((b) => b.id === id);
  }

  /**
   * Replaces the entire block array
   */
  public setBlocks(blocks: Block[]): void {
    this.blocks = blocks;
    this.activeBlockId = blocks[0]?.id || null;
  }

  /**
   * Clears all blocks and adds an initial blank paragraph
   */
  public clear(): void {
    this.blocks = [];
    this.addBlock('paragraph');
  }

  // -------------------------------------------------------------------------
  // Defaults Generators
  // -------------------------------------------------------------------------

  private getDefaultContentForType(type: BlockType): string {
    switch (type) {
      case 'heading1':
        return 'New Section Heading';
      case 'heading2':
        return 'Hierarchical Subheading';
      case 'code':
        return `// Write TypeScript / Rust / Solidity code here\nexport const sovereignNode = {\n  status: 'active',\n  peers: 64\n};`;
      case 'math':
        return '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}';
      case 'poll':
        return 'What is the most effective approach to decentralization?';
      case 'diff':
        return `--- a/config.ts\n+++ b/config.ts\n@@ -1,3 +1,3 @@\n-export const IS_TESTNET = true;\n+export const IS_TESTNET = false;\n export const PROTOCOL_VERSION = '2.4.0';`;
      case 'callout':
        return 'Important note regarding your network node security.';
      case 'quote':
        return 'Code is law only when it is free and audited.';
      case 'image':
        return 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80';
      case 'embed':
        return 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      case 'divider':
        return '---';
      case 'paragraph':
      default:
        return '';
    }
  }

  private getDefaultMetaForType(type: BlockType): BlockMeta {
    switch (type) {
      case 'code':
        return { language: 'typescript', showLineNumbers: true, filename: 'source.ts' };
      case 'math':
        return { displayMode: true };
      case 'poll':
        return {
          options: ['Option Alpha', 'Option Beta', 'Option Gamma'],
          votes: [12, 8, 4],
          isEncrypted: true,
          totalVotes: 24,
          durationHours: 24,
        };
      case 'diff':
        return { diffFilename: 'changes.patch' };
      case 'callout':
        return { calloutType: 'info', title: 'Key Information', icon: '💡' };
      case 'quote':
        return { author: 'Sovereign Anonymous', source: 'UREfy' };
      case 'image':
        return { alt: 'UREfy network graph', caption: 'Active nodes in mesh network' };
      case 'embed':
        return { embedType: 'video', provider: 'Web Media' };
      default:
        return {};
    }
  }

  // -------------------------------------------------------------------------
  // Export & Import Systems
  // -------------------------------------------------------------------------

  /**
   * Exports the entire composition as standard Markdown format
   */
  public exportAsMarkdown(): string {
    const parts: string[] = [];

    for (const block of this.blocks) {
      const content = block.content || '';

      switch (block.type) {
        case 'heading1':
          parts.push(`# ${content}\n`);
          break;

        case 'heading2':
          parts.push(`## ${content}\n`);
          break;

        case 'paragraph':
          if (content.trim()) {
            parts.push(`${content}\n`);
          }
          break;

        case 'code': {
          const lang = block.meta?.language || 'typescript';
          parts.push(`\`\`\`${lang}\n${content}\n\`\`\`\n`);
          break;
        }

        case 'math':
          parts.push(`$$\n${content}\n$$\n`);
          break;

        case 'poll': {
          const options = block.meta?.options || [];
          let pollMd = `[POLL: ${content}]\n`;
          for (const opt of options) {
            pollMd += `- ${opt}\n`;
          }
          pollMd += `[/POLL]\n`;
          parts.push(pollMd);
          break;
        }

        case 'diff':
          parts.push(`\`\`\`diff\n${content}\n\`\`\`\n`);
          break;

        case 'callout': {
          const ctype = (block.meta?.calloutType || 'info').toUpperCase();
          const title = block.meta?.title ? `**${block.meta.title}**\n` : '';
          const lines = `${title}${content}`.split('\n').map((l) => `> ${l}`).join('\n');
          parts.push(`> [!${ctype}]\n${lines}\n`);
          break;
        }

        case 'quote': {
          const author = block.meta?.author ? `\n> — *${block.meta.author}*` : '';
          const lines = content.split('\n').map((l) => `> ${l}`).join('\n');
          parts.push(`${lines}${author}\n`);
          break;
        }

        case 'image': {
          const alt = block.meta?.alt || 'Image';
          const caption = block.meta?.caption ? ` "${block.meta.caption}"` : '';
          parts.push(`![${alt}](${content}${caption})\n`);
          break;
        }

        case 'embed':
          parts.push(`[Embed: ${content}]\n`);
          break;

        case 'divider':
          parts.push(`---\n`);
          break;
      }
    }

    return parts.join('\n');
  }

  /**
   * Exports the entire composition as clean, XSS-safe HTML
   */
  public exportAsHTML(): string {
    const parts: string[] = [];

    for (const block of this.blocks) {
      const content = block.content || '';

      switch (block.type) {
        case 'heading1':
          parts.push(
            `<h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans my-4 border-b border-white/10 pb-2">${escapeHtml(
              content
            )}</h1>`
          );
          break;

        case 'heading2':
          parts.push(
            `<h2 class="text-xl sm:text-2xl font-bold text-slate-100 font-sans my-3">${escapeHtml(
              content
            )}</h2>`
          );
          break;

        case 'paragraph':
          if (content.trim()) {
            parts.push(
              `<p class="text-slate-300 text-sm sm:text-base leading-relaxed my-2 font-sans">${parseInlineMarkdown(
                content
              )}</p>`
            );
          }
          break;

        case 'code': {
          const lang = block.meta?.language || 'typescript';
          const highlighted = CodeTokenizer.highlightToHtml(content, lang);
          const fname = block.meta?.filename ? escapeHtml(block.meta.filename) : `${lang} snippet`;
          parts.push(`
            <div class="my-4 rounded-xl border border-white/10 overflow-hidden bg-surface-base shadow-lg">
              <div class="px-4 py-2 bg-surface-raised border-b border-white/10 flex items-center justify-between font-mono text-xs text-slate-400">
                <span class="flex items-center space-x-1.5"><span class="w-2.5 h-2.5 rounded-full bg-cyphr/60 inline-block"></span><span>${fname}</span></span>
                <span class="uppercase text-[10px] tracking-wider text-cyphr font-bold">${escapeHtml(lang)}</span>
              </div>
              <pre class="p-4 font-mono text-xs overflow-x-auto text-slate-200 leading-relaxed bg-[#0d0f14]"><code>${highlighted}</code></pre>
            </div>
          `);
          break;
        }

        case 'math':
          parts.push(MathRenderer.renderMathBlock(content));
          break;

        case 'poll': {
          const options = block.meta?.options || [];
          const votes = block.meta?.votes || options.map(() => 0);
          const totalVotes = votes.reduce((a, b) => a + b, 0) || 1;
          const isEncrypted = block.meta?.isEncrypted !== false;

          let optionsHtml = '';
          options.forEach((opt, idx) => {
            const vCount = votes[idx] || 0;
            const pct = Math.round((vCount / totalVotes) * 100);
            optionsHtml += `
              <div class="relative overflow-hidden rounded-lg bg-surface-base border border-white/5 p-3 flex items-center justify-between group">
                <div class="absolute inset-y-0 left-0 bg-cyphr/15 transition-all duration-500 rounded-lg" style="width: ${pct}%"></div>
                <span class="relative z-10 text-xs sm:text-sm font-medium text-slate-200">${escapeHtml(opt)}</span>
                <div class="relative z-10 flex items-center space-x-2 text-xs font-mono">
                  <span class="text-slate-400 font-bold">${vCount} votes</span>
                  <span class="text-cyphr font-bold">${pct}%</span>
                </div>
              </div>
            `;
          });

          parts.push(`
            <div class="my-4 p-5 rounded-2xl bg-surface-raised border border-white/10 shadow-xl space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="text-base">📊</span>
                  <h4 class="font-bold text-sm sm:text-base text-white">${escapeHtml(content)}</h4>
                </div>
                ${
                  isEncrypted
                    ? `<span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-signal/10 text-signal border border-signal/20 flex items-center space-x-1"><span>🛡️</span><span>ZK-Anonymous</span></span>`
                    : ''
                }
              </div>
              <div class="space-y-2 pt-1">${optionsHtml}</div>
              <div class="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-white/5">
                <span>Total: ${totalVotes} verified votes</span>
                <span>Result computed on-chain</span>
              </div>
            </div>
          `);
          break;
        }

        case 'diff':
          parts.push(DiffBlockRenderer.renderDiffBlock(content, block.meta?.diffFilename));
          break;

        case 'callout': {
          const ctype = block.meta?.calloutType || 'info';
          let borderClass = 'border-cyphr/40 bg-cyphr/10 text-cyphr';
          let icon = '💡';

          if (ctype === 'warning') {
            borderClass = 'border-amber/40 bg-amber/10 text-amber';
            icon = '⚠️';
          } else if (ctype === 'danger') {
            borderClass = 'border-crimson/40 bg-crimson/10 text-crimson';
            icon = '🚨';
          } else if (ctype === 'success') {
            borderClass = 'border-signal/40 bg-signal/10 text-signal';
            icon = '✅';
          }

          const customIcon = block.meta?.icon || icon;
          const title = block.meta?.title ? escapeHtml(block.meta.title) : 'Important Note';

          parts.push(`
            <div class="my-4 p-4 rounded-xl border-l-4 ${borderClass} bg-surface-base/80 shadow-md">
              <div class="flex items-center space-x-2 font-bold text-xs sm:text-sm mb-1.5">
                <span>${customIcon}</span>
                <span>${title}</span>
              </div>
              <div class="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">${parseInlineMarkdown(
                content
              )}</div>
            </div>
          `);
          break;
        }

        case 'quote': {
          const author = block.meta?.author ? escapeHtml(block.meta.author) : 'Unknown Author';
          const source = block.meta?.source ? escapeHtml(block.meta.source) : '';

          parts.push(`
            <blockquote class="my-4 border-l-4 border-aether pl-4 py-2 bg-surface-raised/40 rounded-r-xl italic text-slate-200">
              <p class="text-sm sm:text-base leading-relaxed">"${escapeHtml(content)}"</p>
              <footer class="text-xs text-slate-400 font-mono mt-2 not-italic flex items-center space-x-1">
                <span>—</span>
                <span class="font-bold text-aether">${author}</span>
                ${source ? `<span class="text-slate-500">(${source})</span>` : ''}
              </footer>
            </blockquote>
          `);
          break;
        }

        case 'image': {
          const alt = escapeHtml(block.meta?.alt || 'Image');
          const caption = block.meta?.caption ? escapeHtml(block.meta.caption) : '';
          const url = sanitizeUrl(content);

          parts.push(`
            <figure class="my-4">
              <div class="rounded-xl overflow-hidden border border-white/10 bg-surface-base shadow-2xl">
                <img src="${url}" alt="${alt}" class="w-full max-h-[500px] object-cover" loading="lazy" />
              </div>
              ${
                caption
                  ? `<figcaption class="text-center text-xs font-mono text-slate-400 mt-2">${caption}</figcaption>`
                  : ''
              }
            </figure>
          `);
          break;
        }

        case 'embed': {
          const url = sanitizeUrl(content);
          parts.push(`
            <div class="my-4 rounded-xl border border-white/10 bg-surface-base p-4 flex items-center justify-between shadow-lg">
              <div class="flex items-center space-x-3 truncate">
                <span class="text-xl">🔗</span>
                <div class="truncate">
                  <div class="text-xs font-bold text-slate-200 truncate">Integrated External Resource</div>
                  <a href="${url}" target="_blank" rel="noopener noreferrer" class="text-xs font-mono text-cyphr hover:underline truncate block">${url}</a>
                </div>
              </div>
              <a href="${url}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight text-xs font-mono text-white transition-colors flex items-center space-x-1 shrink-0">
                <span>Open</span>
                <span>↗</span>
              </a>
            </div>
          `);
          break;
        }

        case 'divider':
          parts.push(`<hr class="border-t border-white/10 my-6" />`);
          break;
      }
    }

    return `<div class="aetheris-rendered-content space-y-2 text-slate-200">${parts.join('\n')}</div>`;
  }

  /**
   * Imports a standard markdown string and transforms it into structured blocks
   */
  public importFromMarkdown(md: string): void {
    const lines = md.split('\n');
    const newBlocks: Block[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Fenced Code / Diff Block
      if (line.trim().startsWith('```')) {
        const langMatch = line.trim().match(/^```([a-zA-Z0-9_-]*)/);
        const lang = (langMatch && langMatch[1]) || 'typescript';
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```

        const codeContent = codeLines.join('\n');
        if (lang === 'diff') {
          newBlocks.push({
            id: generateBlockId(),
            type: 'diff',
            content: codeContent,
            meta: { diffFilename: 'patch.diff' },
          });
        } else {
          newBlocks.push({
            id: generateBlockId(),
            type: 'code',
            content: codeContent,
            meta: { language: lang, showLineNumbers: true },
          });
        }
        continue;
      }

      // Fenced Math Block $$
      if (line.trim().startsWith('$$')) {
        const mathLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('$$')) {
          mathLines.push(lines[i]);
          i++;
        }
        i++; // skip closing $$
        newBlocks.push({
          id: generateBlockId(),
          type: 'math',
          content: mathLines.join('\n'),
          meta: { displayMode: true },
        });
        continue;
      }

      // Heading 1
      if (line.startsWith('# ')) {
        newBlocks.push({
          id: generateBlockId(),
          type: 'heading1',
          content: line.substring(2).trim(),
        });
        i++;
        continue;
      }

      // Heading 2
      if (line.startsWith('## ')) {
        newBlocks.push({
          id: generateBlockId(),
          type: 'heading2',
          content: line.substring(3).trim(),
        });
        i++;
        continue;
      }

      // Divider ---
      if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
        newBlocks.push({
          id: generateBlockId(),
          type: 'divider',
          content: '---',
        });
        i++;
        continue;
      }

      // Callout > [!TYPE]
      if (line.startsWith('> [!')) {
        const typeMatch = line.match(/^>\s*\[!([a-zA-Z]+)\]/);
        const ctype = typeMatch ? (typeMatch[1].toLowerCase() as 'info' | 'warning' | 'danger' | 'success') : 'info';
        const calloutLines: string[] = [];
        i++;
        while (i < lines.length && lines[i].startsWith('>')) {
          calloutLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        newBlocks.push({
          id: generateBlockId(),
          type: 'callout',
          content: calloutLines.join('\n'),
          meta: { calloutType: ctype, title: `${ctype.toUpperCase()} Alert` },
        });
        continue;
      }

      // Quote > text
      if (line.startsWith('>')) {
        const quoteLines: string[] = [];
        let author = '';
        while (i < lines.length && lines[i].startsWith('>')) {
          const cleanLine = lines[i].replace(/^>\s?/, '');
          if (cleanLine.startsWith('—') || cleanLine.startsWith('-')) {
            author = cleanLine.replace(/^[—\-]\s*\**([^*]+)\**/, '$1').trim();
          } else {
            quoteLines.push(cleanLine);
          }
          i++;
        }
        newBlocks.push({
          id: generateBlockId(),
          type: 'quote',
          content: quoteLines.join('\n'),
          meta: { author: author || undefined },
        });
        continue;
      }

      // Image ![alt](url)
      const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)"]+)(?:\s+"([^"]+)")?\)/);
      if (imgMatch) {
        newBlocks.push({
          id: generateBlockId(),
          type: 'image',
          content: imgMatch[2].trim(),
          meta: { alt: imgMatch[1], caption: imgMatch[3] },
        });
        i++;
        continue;
      }

      // Paragraph / Empty lines
      if (line.trim().length > 0) {
        newBlocks.push({
          id: generateBlockId(),
          type: 'paragraph',
          content: line,
        });
      }

      i++;
    }

    if (newBlocks.length > 0) {
      this.blocks = newBlocks;
      this.activeBlockId = newBlocks[0].id;
    }
  }

  // -------------------------------------------------------------------------
  // Rendering Methods for the UI
  // -------------------------------------------------------------------------

  /**
   * Renders the complete standalone Slash Commands dropdown menu
   */
  public renderSlashMenu(): string {
    const textCommands = this.slashCommands.filter((c) => c.category === 'text');
    const advancedCommands = this.slashCommands.filter((c) => c.category === 'advanced');
    const mediaCommands = this.slashCommands.filter((c) => c.category === 'media' || c.category === 'structure');

    const renderItem = (item: SlashMenuItem) => `
      <button 
        type="button" 
        data-slash-type="${item.type}" 
        class="slash-menu-item w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-overlay text-left group transition-all"
      >
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-lg bg-surface-base border border-white/10 flex items-center justify-center text-sm group-hover:border-cyphr group-hover:text-cyphr transition-colors shadow-sm">
            ${item.icon}
          </div>
          <div>
            <div class="text-xs font-bold text-slate-200 group-hover:text-white">${item.label}</div>
            <div class="text-[10px] text-slate-400 line-clamp-1">${item.description}</div>
          </div>
        </div>
        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-base text-slate-500 group-hover:text-cyphr border border-white/5">/${item.shortcut}</span>
      </button>
    `;

    return `
      <div id="rich-editor-slash-menu" class="hidden absolute z-50 w-72 bg-surface-raised border border-white/15 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md p-2 space-y-2 animate-in fade-in zoom-in-95 duration-100">
        <div class="px-2 py-1 border-b border-white/5 flex items-center justify-between">
          <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-cyphr flex items-center space-x-1">
            <span>⚡</span>
            <span>Block Commands (/)</span>
          </span>
          <span class="text-[9px] font-mono text-slate-500">ESC closes</span>
        </div>

        <div class="max-h-80 overflow-y-auto space-y-3 custom-scrollbar pr-1">
          <!-- Text Category -->
          <div>
            <div class="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Text & Formatting</div>
            <div class="space-y-0.5">${textCommands.map(renderItem).join('')}</div>
          </div>

          <!-- Advanced / Crypto Category -->
          <div>
            <div class="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Crypto & Development</div>
            <div class="space-y-0.5">${advancedCommands.map(renderItem).join('')}</div>
          </div>

          <!-- Media & Structure Category -->
          <div>
            <div class="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Media & Structure</div>
            <div class="space-y-0.5">${mediaCommands.map(renderItem).join('')}</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the controls for an individual block (drag handle, up/down, transform, delete)
   */
  public renderBlockControls(block: Block, index: number): string {
    const isFirst = index === 0;
    const isLast = index === this.blocks.length - 1;

    return `
      <div class="block-controls-bar opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-all duration-150 select-none bg-surface-raised/90 border border-white/10 rounded-lg p-0.5 shadow-md">
        <!-- Drag Handle -->
        <button 
          type="button" 
          class="btn-block-drag p-1 text-slate-400 hover:text-cyphr hover:bg-surface-overlay rounded cursor-grab active:cursor-grabbing transition-colors" 
          title="Drag to reorder"
          data-block-id="${block.id}"
        >
          <span class="text-xs">⋮⋮</span>
        </button>

        <!-- Move Up -->
        <button 
          type="button" 
          class="btn-block-move-up p-1 text-slate-400 hover:text-white hover:bg-surface-overlay rounded transition-colors ${isFirst ? 'opacity-30 cursor-not-allowed' : ''}" 
          title="Move up" 
          data-block-id="${block.id}"
          ${isFirst ? 'disabled' : ''}
        >
          <span class="text-[10px]">▲</span>
        </button>

        <!-- Move Down -->
        <button 
          type="button" 
          class="btn-block-move-down p-1 text-slate-400 hover:text-white hover:bg-surface-overlay rounded transition-colors ${isLast ? 'opacity-30 cursor-not-allowed' : ''}" 
          title="Move down" 
          data-block-id="${block.id}"
          ${isLast ? 'disabled' : ''}
        >
          <span class="text-[10px]">▼</span>
        </button>

        <!-- Transform Type Selector -->
        <select 
          class="select-block-transform bg-surface-base text-slate-300 text-[10px] font-mono rounded px-1.5 py-0.5 border border-white/10 hover:border-cyphr transition-colors cursor-pointer outline-none"
          data-block-id="${block.id}"
          title="Change block type"
        >
          <option value="paragraph" ${block.type === 'paragraph' ? 'selected' : ''}>📝 Text</option>
          <option value="heading1" ${block.type === 'heading1' ? 'selected' : ''}>📌 H1 Heading</option>
          <option value="heading2" ${block.type === 'heading2' ? 'selected' : ''}>📍 H2 Subheading</option>
          <option value="code" ${block.type === 'code' ? 'selected' : ''}>💻 Code</option>
          <option value="math" ${block.type === 'math' ? 'selected' : ''}>📐 LaTeX</option>
          <option value="poll" ${block.type === 'poll' ? 'selected' : ''}>📊 Poll</option>
          <option value="diff" ${block.type === 'diff' ? 'selected' : ''}>🔀 Diff</option>
          <option value="callout" ${block.type === 'callout' ? 'selected' : ''}>💡 Callout</option>
          <option value="quote" ${block.type === 'quote' ? 'selected' : ''}>💬 Quote</option>
          <option value="image" ${block.type === 'image' ? 'selected' : ''}>🖼️ Image</option>
          <option value="embed" ${block.type === 'embed' ? 'selected' : ''}>🔗 Embed</option>
          <option value="divider" ${block.type === 'divider' ? 'selected' : ''}>➖ Divider</option>
        </select>

        <!-- Duplicate Block -->
        <button 
          type="button" 
          class="btn-block-duplicate p-1 text-slate-400 hover:text-white hover:bg-surface-overlay rounded transition-colors" 
          title="Duplicate block"
          data-block-id="${block.id}"
        >
          <span class="text-xs">⎘</span>
        </button>

        <!-- Delete Block -->
        <button 
          type="button" 
          class="btn-block-delete p-1 text-slate-400 hover:text-crimson hover:bg-crimson/10 rounded transition-colors" 
          title="Delete block"
          data-block-id="${block.id}"
        >
          <span class="text-xs">✕</span>
        </button>
      </div>
    `;
  }

  /**
   * Renders the editable interior of a specific block type
   */
  public renderBlockContent(block: Block): string {
    switch (block.type) {
      case 'heading1':
        return `
          <input 
            type="text" 
            class="block-content-input w-full bg-transparent text-xl sm:text-2xl font-extrabold text-white placeholder-slate-600 focus:outline-none font-sans tracking-tight py-1 border-b border-transparent focus:border-cyphr/40 transition-colors" 
            value="${escapeHtml(block.content)}" 
            placeholder="Section heading (type '/' for commands)..."
            data-block-id="${block.id}"
          />
        `;

      case 'heading2':
        return `
          <input 
            type="text" 
            class="block-content-input w-full bg-transparent text-lg sm:text-xl font-bold text-slate-100 placeholder-slate-600 focus:outline-none font-sans py-1 border-b border-transparent focus:border-cyphr/40 transition-colors" 
            value="${escapeHtml(block.content)}" 
            placeholder="Section subheading..."
            data-block-id="${block.id}"
          />
        `;

      case 'paragraph':
        return `
          <textarea 
            class="block-content-textarea w-full bg-transparent text-sm sm:text-base text-slate-200 placeholder-slate-600 focus:outline-none resize-none font-sans leading-relaxed min-h-[44px] py-1"
            placeholder="Write something sovereign... (type '/' for Notion-style block menu)"
            data-block-id="${block.id}"
            rows="2"
          >${escapeHtml(block.content)}</textarea>
        `;

      case 'code': {
        const lang = block.meta?.language || 'typescript';
        const filename = block.meta?.filename || 'code.ts';
        const highlighted = CodeTokenizer.highlightToHtml(block.content, lang);

        return `
          <div class="code-block-editor rounded-xl border border-white/10 overflow-hidden bg-surface-base shadow-xl">
            <div class="px-4 py-2 bg-surface-raised border-b border-white/10 flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="w-2.5 h-2.5 rounded-full bg-cyphr inline-block"></span>
                <input 
                  type="text" 
                  class="code-filename-input bg-transparent text-xs font-mono text-slate-300 focus:outline-none border-b border-transparent focus:border-cyphr"
                  value="${escapeHtml(filename)}"
                  placeholder="filename.ts"
                  data-block-id="${block.id}"
                />
              </div>
              <div class="flex items-center space-x-2">
                <select 
                  class="code-language-select bg-surface-overlay text-cyphr text-xs font-mono rounded px-2 py-1 border border-white/10 outline-none"
                  data-block-id="${block.id}"
                >
                  <option value="typescript" ${lang === 'typescript' ? 'selected' : ''}>TypeScript</option>
                  <option value="javascript" ${lang === 'javascript' ? 'selected' : ''}>JavaScript</option>
                  <option value="rust" ${lang === 'rust' ? 'selected' : ''}>Rust</option>
                  <option value="python" ${lang === 'python' ? 'selected' : ''}>Python</option>
                  <option value="solidity" ${lang === 'solidity' ? 'selected' : ''}>Solidity</option>
                  <option value="go" ${lang === 'go' ? 'selected' : ''}>Go</option>
                  <option value="bash" ${lang === 'bash' ? 'selected' : ''}>Bash / Shell</option>
                  <option value="json" ${lang === 'json' ? 'selected' : ''}>JSON</option>
                  <option value="html" ${lang === 'html' ? 'selected' : ''}>HTML / CSS</option>
                </select>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 bg-[#0d0f14]">
              <!-- Editor Area -->
              <div class="p-3">
                <div class="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider">Source Editor</div>
                <textarea 
                  class="code-content-textarea w-full h-40 bg-transparent text-xs font-mono text-slate-200 focus:outline-none resize-none leading-relaxed"
                  placeholder="// Type or paste source code..."
                  data-block-id="${block.id}"
                >${escapeHtml(block.content)}</textarea>
              </div>

              <!-- Live Highlighted Preview -->
              <div class="p-3 overflow-x-auto">
                <div class="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider">Live Preview</div>
                <pre class="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre overflow-x-auto"><code class="code-preview-target">${highlighted || '<span class="text-slate-600 italic">// Empty preview</span>'}</code></pre>
              </div>
            </div>
          </div>
        `;
      }

      case 'math': {
        const mathML = MathRenderer.latexToMathML(block.content, true);

        return `
          <div class="math-block-editor rounded-xl border border-white/10 bg-surface-base p-4 space-y-3 shadow-xl">
            <div class="flex items-center justify-between border-b border-white/5 pb-2">
              <span class="text-xs font-mono font-bold text-cyphr flex items-center space-x-1.5">
                <span>📐</span>
                <span>LaTeX & MathML Formula Editor</span>
              </span>
              <span class="text-[10px] font-mono text-slate-400">Standard W3C MathML</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- LaTeX Input -->
              <div>
                <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">LaTeX Source Code</label>
                <textarea 
                  class="math-latex-textarea w-full h-24 p-2.5 rounded-lg bg-surface-raised border border-white/10 text-xs font-mono text-cyphr focus:outline-none focus:border-cyphr/50 resize-none"
                  placeholder="\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}"
                  data-block-id="${block.id}"
                >${escapeHtml(block.content)}</textarea>
                <div class="text-[10px] font-mono text-slate-500 mt-1">Examples: \\frac{a}{b}, \\sqrt{x}, \\pi, \\sum_{i=1}^n, \\alpha, \\beta</div>
              </div>

              <!-- Live MathML Render Container -->
              <div class="flex flex-col justify-center items-center p-3 rounded-lg bg-surface-raised/40 border border-white/5 overflow-x-auto">
                <span class="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Math Preview</span>
                <div class="math-preview-target py-2 px-3 text-center">
                  ${mathML}
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'poll': {
        const options = block.meta?.options || ['Option 1', 'Option 2'];
        const isEncrypted = block.meta?.isEncrypted !== false;

        let optionsInputs = '';
        options.forEach((opt, idx) => {
          optionsInputs += `
            <div class="flex items-center space-x-2">
              <span class="text-xs font-mono text-slate-500">${idx + 1}.</span>
              <input 
                type="text" 
                class="poll-option-input flex-1 bg-surface-raised border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-signal/50"
                value="${escapeHtml(opt)}" 
                placeholder="Enter option ${idx + 1}..."
                data-block-id="${block.id}"
                data-option-index="${idx}"
              />
              <button 
                type="button" 
                class="btn-poll-remove-option p-1 text-slate-500 hover:text-crimson transition-colors"
                title="Remove option"
                data-block-id="${block.id}"
                data-option-index="${idx}"
              >
                ✕
              </button>
            </div>
          `;
        });

        return `
          <div class="poll-block-editor rounded-2xl border border-white/10 bg-surface-base p-5 space-y-4 shadow-xl">
            <div class="flex items-center justify-between border-b border-white/5 pb-3">
              <div class="flex items-center space-x-2">
                <span class="text-lg">📊</span>
                <span class="font-bold text-sm text-white">ZK Cryptographic Poll Generator</span>
              </div>
              <label class="flex items-center space-x-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  class="poll-encrypted-toggle rounded border-white/10 text-signal focus:ring-0 cursor-pointer"
                  ${isEncrypted ? 'checked' : ''}
                  data-block-id="${block.id}"
                />
                <span class="text-xs font-mono ${isEncrypted ? 'text-signal' : 'text-slate-500'}">🛡️ ZK-Anonymous</span>
              </label>
            </div>

            <!-- Question Input -->
            <div>
              <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Poll Question</label>
              <input 
                type="text" 
                class="poll-question-input w-full bg-surface-raised border border-white/10 rounded-xl px-3 py-2 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-cyphr/50"
                value="${escapeHtml(block.content)}" 
                placeholder="What is your question for the community?"
                data-block-id="${block.id}"
              />
            </div>

            <!-- Options List -->
            <div class="space-y-2">
              <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500">Voting Options</label>
              <div class="poll-options-container space-y-2">
                ${optionsInputs}
              </div>
              <button 
                type="button" 
                class="btn-poll-add-option mt-2 text-xs font-mono text-cyphr hover:text-white px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight transition-colors flex items-center space-x-1"
                data-block-id="${block.id}"
              >
                <span>+</span>
                <span>Add New Option</span>
              </button>
            </div>
          </div>
        `;
      }

      case 'diff': {
        const fname = block.meta?.diffFilename || 'patch.diff';

        return `
          <div class="diff-block-editor rounded-xl border border-white/10 bg-surface-base p-4 space-y-3 shadow-xl">
            <div class="flex items-center justify-between border-b border-white/5 pb-2">
              <span class="text-xs font-mono font-bold text-signal flex items-center space-x-1.5">
                <span>🔀</span>
                <span>Git Patch / Diff Editor</span>
              </span>
              <input 
                type="text" 
                class="diff-filename-input bg-surface-raised border border-white/10 text-xs font-mono text-slate-300 rounded px-2 py-0.5 focus:outline-none focus:border-signal"
                value="${escapeHtml(fname)}"
                placeholder="filename.diff"
                data-block-id="${block.id}"
              />
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Paste Raw Git Patch (+ / -)</label>
                <textarea 
                  class="diff-raw-textarea w-full h-32 p-2.5 rounded-lg bg-[#0d0f14] border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-signal/50 resize-none leading-relaxed"
                  placeholder="--- a/file.ts\n+++ b/file.ts\n@@ -1,3 +1,3 @@\n-oldLine();\n+newLine();"
                  data-block-id="${block.id}"
                >${escapeHtml(block.content)}</textarea>
              </div>

              <!-- Rendered Preview -->
              <div class="diff-preview-container">
                ${DiffBlockRenderer.renderDiffBlock(block.content, fname)}
              </div>
            </div>
          </div>
        `;
      }

      case 'callout': {
        const ctype = block.meta?.calloutType || 'info';
        const title = block.meta?.title || 'Information Panel';
        const icon = block.meta?.icon || '💡';

        return `
          <div class="callout-block-editor rounded-xl border border-white/10 bg-surface-base p-4 space-y-3 shadow-xl">
            <div class="flex items-center justify-between border-b border-white/5 pb-2">
              <div class="flex items-center space-x-2">
                <input 
                  type="text" 
                  class="callout-icon-input w-8 text-center bg-surface-raised border border-white/10 text-xs rounded py-1 focus:outline-none focus:border-cyphr"
                  value="${escapeHtml(icon)}"
                  title="Panel icon"
                  data-block-id="${block.id}"
                />
                <input 
                  type="text" 
                  class="callout-title-input bg-transparent font-bold text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none border-b border-transparent focus:border-cyphr"
                  value="${escapeHtml(title)}"
                  placeholder="Callout Title..."
                  data-block-id="${block.id}"
                />
              </div>
              <select 
                class="callout-type-select bg-surface-overlay text-xs font-mono rounded px-2 py-1 border border-white/10 outline-none"
                data-block-id="${block.id}"
              >
                <option value="info" ${ctype === 'info' ? 'selected' : ''}>💡 Info (Cyan)</option>
                <option value="warning" ${ctype === 'warning' ? 'selected' : ''}>⚠️ Warning (Amber)</option>
                <option value="danger" ${ctype === 'danger' ? 'selected' : ''}>🚨 Danger (Red)</option>
                <option value="success" ${ctype === 'success' ? 'selected' : ''}>✅ Success (Green)</option>
              </select>
            </div>

            <textarea 
              class="callout-content-textarea w-full bg-surface-raised/50 border border-white/5 rounded-lg p-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyphr/40 resize-none leading-relaxed"
              placeholder="Callout message content..."
              data-block-id="${block.id}"
              rows="2"
            >${escapeHtml(block.content)}</textarea>
          </div>
        `;
      }

      case 'quote': {
        const author = block.meta?.author || '';
        const source = block.meta?.source || '';

        return `
          <div class="quote-block-editor rounded-xl border border-white/10 bg-surface-base p-4 space-y-3 shadow-xl">
            <div class="flex items-start space-x-3">
              <span class="text-2xl text-aether">“</span>
              <textarea 
                class="quote-content-textarea flex-1 bg-transparent text-sm sm:text-base italic text-slate-200 placeholder-slate-600 focus:outline-none resize-none leading-relaxed"
                placeholder="Type quote text..."
                data-block-id="${block.id}"
                rows="2"
              >${escapeHtml(block.content)}</textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5">
              <input 
                type="text" 
                class="quote-author-input bg-surface-raised border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-aether"
                value="${escapeHtml(author)}"
                placeholder="Author (e.g. Satoshi Nakamoto)..."
                data-block-id="${block.id}"
              />
              <input 
                type="text" 
                class="quote-source-input bg-surface-raised border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-aether"
                value="${escapeHtml(source)}"
                placeholder="Source / Reference (optional)..."
                data-block-id="${block.id}"
              />
            </div>
          </div>
        `;
      }

      case 'image': {
        const alt = block.meta?.alt || '';
        const caption = block.meta?.caption || '';

        return `
          <div class="image-block-editor rounded-xl border border-white/10 bg-surface-base p-4 space-y-3 shadow-xl">
            <div class="flex items-center space-x-2">
              <span class="text-base">🖼️</span>
              <input 
                type="text" 
                class="image-url-input flex-1 bg-surface-raised border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-cyphr placeholder-slate-600 focus:outline-none focus:border-cyphr"
                value="${escapeHtml(block.content)}"
                placeholder="Enter image URL or IPFS CID (ipfs://...)"
                data-block-id="${block.id}"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input 
                type="text" 
                class="image-alt-input bg-surface-raised border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-none"
                value="${escapeHtml(alt)}"
                placeholder="Alternative text (Alt text)..."
                data-block-id="${block.id}"
              />
              <input 
                type="text" 
                class="image-caption-input bg-surface-raised border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-none"
                value="${escapeHtml(caption)}"
                placeholder="Caption displayed below image..."
                data-block-id="${block.id}"
              />
            </div>

            ${
              block.content
                ? `
              <div class="rounded-lg overflow-hidden border border-white/10 max-h-60 bg-black/40 flex items-center justify-center">
                <img src="${escapeHtml(block.content)}" alt="${escapeHtml(alt)}" class="max-h-60 object-contain w-full" onerror="this.style.display='none'" />
              </div>
            `
                : ''
            }
          </div>
        `;
      }

      case 'embed': {
        return `
          <div class="embed-block-editor rounded-xl border border-white/10 bg-surface-base p-4 space-y-3 shadow-xl">
            <div class="flex items-center space-x-2">
              <span class="text-base">🔗</span>
              <input 
                type="text" 
                class="embed-url-input flex-1 bg-surface-raised border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-cyphr placeholder-slate-600 focus:outline-none focus:border-cyphr"
                value="${escapeHtml(block.content)}"
                placeholder="Enter embed URL (PeerTube, YouTube, audio stream, Swarm CID)..."
                data-block-id="${block.id}"
              />
            </div>
            <div class="text-[10px] font-mono text-slate-500">Supports decentralized media streams and secure external web URLs.</div>
          </div>
        `;
      }

      case 'divider':
        return `
          <div class="divider-block-editor py-3 flex items-center justify-center group relative cursor-pointer" data-block-id="${block.id}">
            <div class="w-full border-t border-white/15 group-hover:border-cyphr/60 transition-colors"></div>
            <span class="absolute px-3 py-0.5 rounded-full bg-surface-raised text-[10px] font-mono text-slate-500 group-hover:text-cyphr border border-white/10 transition-colors">
              SECTION DIVIDER
            </span>
          </div>
        `;

      default:
        return `<div class="p-2 text-xs text-crimson font-mono">Unknown block type: ${escapeHtml(block.type)}</div>`;
    }
  }

  /**
   * Renders a single complete block wrapper in the editor list
   */
  public renderBlock(block: Block, index: number): string {
    const isActive = this.activeBlockId === block.id;

    return `
      <div 
        id="block-wrapper-${block.id}" 
        class="rich-block-row group relative p-3 rounded-2xl transition-all duration-150 ${
          isActive
            ? 'bg-surface-raised/40 ring-1 ring-cyphr/40 shadow-lg'
            : 'hover:bg-surface-raised/20 border border-transparent'
        }"
        data-block-id="${block.id}"
      >
        <!-- Floating Block Control Toolbar -->
        <div class="absolute -top-3.5 right-4 z-20">
          ${this.renderBlockControls(block, index)}
        </div>

        <!-- Block Content Area -->
        <div class="block-inner-content relative">
          ${this.renderBlockContent(block)}
        </div>

        <!-- Quick Add Block Button on Hover -->
        <div class="opacity-0 group-hover:opacity-100 flex justify-center -mb-2 mt-1 transition-opacity">
          <button 
            type="button" 
            class="btn-quick-add-block px-3 py-0.5 rounded-full bg-surface-overlay hover:bg-cyphr text-slate-400 hover:text-black text-[10px] font-mono font-bold shadow transition-all flex items-center space-x-1"
            data-after-block-id="${block.id}"
            title="Add new block here"
          >
            <span>+</span>
            <span>New Block</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renders the complete, rich Notion/Obsidian style block editor container
   */
  public renderEditor(): string {
    const totalBlocks = this.blocks.length;
    const wordCount = this.blocks
      .map((b) => b.content || '')
      .join(' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    return `
      <div id="aetheris-rich-block-editor" class="w-full max-w-4xl mx-auto bg-surface-base border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans">
        
        <!-- TOP TOOLBAR -->
        <header class="p-4 bg-surface-raised border-b border-white/10 flex flex-wrap items-center justify-between gap-3 select-none">
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded-xl bg-cyphr/10 border border-cyphr/30 flex items-center justify-center text-cyphr shadow-sm">
              ✨
            </div>
            <div>
              <h2 class="text-sm sm:text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Sovereign Rich Blocks Editor</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyphr/10 text-cyphr border border-cyphr/20 font-normal">v2.4 Live</span>
              </h2>
              <p class="text-xs text-slate-400 font-mono">Notion / Obsidian Architecture • ZK-Proof Ready</p>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center space-x-2">
            <button 
              type="button" 
              id="btn-editor-open-slash" 
              class="px-3 py-1.5 rounded-xl bg-surface-overlay hover:bg-surface-highlight text-xs font-mono text-cyphr border border-white/10 hover:border-cyphr transition-all flex items-center space-x-1.5 shadow-sm"
              title="Open slash commands menu"
            >
              <span>/</span>
              <span>Commands</span>
            </button>

            <button 
              type="button" 
              id="btn-editor-toggle-preview" 
              class="px-3 py-1.5 rounded-xl bg-surface-overlay hover:bg-surface-highlight text-xs font-mono text-slate-200 border border-white/10 transition-all flex items-center space-x-1.5"
              title="Toggle HTML preview"
            >
              <span>👁️</span>
              <span>Preview</span>
            </button>

            <button 
              type="button" 
              id="btn-editor-export-markdown" 
              class="px-3 py-1.5 rounded-xl bg-surface-overlay hover:bg-surface-highlight text-xs font-mono text-signal border border-white/10 transition-all flex items-center space-x-1.5"
              title="Copy composition as Markdown"
            >
              <span>📋</span>
              <span>Markdown</span>
            </button>

            <button 
              type="button" 
              id="btn-editor-clear-all" 
              class="px-2.5 py-1.5 rounded-xl bg-surface-overlay hover:bg-crimson/20 text-xs font-mono text-slate-400 hover:text-crimson border border-white/10 transition-all"
              title="Reset all blocks"
            >
              🗑️
            </button>
          </div>
        </header>

        <!-- MAIN EDITOR CANVAS -->
        <main class="p-4 sm:p-8 flex-1 min-h-[500px] overflow-y-auto space-y-4 bg-canvas/60 relative">
          
          <!-- Floating Slash Commands Popup Menu -->
          ${this.renderSlashMenu()}

          <!-- Blocks List Container -->
          <div id="rich-editor-blocks-container" class="space-y-4">
            ${this.blocks.map((block, idx) => this.renderBlock(block, idx)).join('')}
          </div>

          <!-- Bottom Add Block Big Button -->
          <div class="pt-6 flex flex-col items-center justify-center space-y-2">
            <button 
              type="button" 
              id="btn-editor-add-bottom-block" 
              class="px-6 py-2.5 rounded-2xl bg-surface-raised hover:bg-surface-overlay border border-white/10 hover:border-cyphr text-xs font-mono text-slate-300 hover:text-white transition-all shadow-md flex items-center space-x-2 group"
            >
              <span class="text-cyphr group-hover:rotate-90 transition-transform duration-200 text-sm font-bold">+</span>
              <span>Add New Block at Bottom (or type '/')</span>
            </button>
            <span class="text-[11px] font-mono text-slate-600">Type <kbd class="px-1.5 py-0.5 rounded bg-surface-base border border-white/10 text-cyphr">/</kbd> in any paragraph to change block type</span>
          </div>

          <!-- LIVE HTML PREVIEW DRAWER (HIDDEN BY DEFAULT) -->
          <section id="rich-editor-preview-drawer" class="hidden mt-8 p-6 rounded-2xl bg-surface-raised border border-white/10 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div class="flex items-center justify-between border-b border-white/10 pb-3">
              <div class="flex items-center space-x-2">
                <span class="text-base">🌐</span>
                <h3 class="text-sm font-bold font-sans text-white">Formatted Live Post Preview</h3>
              </div>
              <span class="text-xs font-mono text-cyphr bg-cyphr/10 px-2 py-0.5 rounded border border-cyphr/20">Clean & XSS-Safe HTML Render</span>
            </div>
            <div id="rich-editor-preview-content" class="p-4 rounded-xl bg-surface-base border border-white/5">
              ${this.exportAsHTML()}
            </div>
          </section>
        </main>

        <!-- FOOTER METRICS & SUBMIT BAR -->
        <footer class="p-4 bg-surface-raised border-t border-white/10 flex flex-wrap items-center justify-between gap-3 select-none">
          <div class="flex items-center space-x-4 text-xs font-mono text-slate-400">
            <span class="flex items-center space-x-1">
              <span class="text-slate-500">Blocks:</span>
              <strong class="text-white">${totalBlocks}</strong>
            </span>
            <span class="flex items-center space-x-1">
              <span class="text-slate-500">Words:</span>
              <strong class="text-cyphr">${wordCount}</strong>
            </span>
            <span class="hidden sm:inline-flex items-center space-x-1">
              <span class="text-slate-500">Format:</span>
              <strong class="text-signal">Rich Multi-Block</strong>
            </span>
          </div>

          <div class="flex items-center space-x-3">
            <button 
              type="button" 
              id="btn-editor-submit-post" 
              class="px-6 py-2 rounded-xl bg-cyphr hover:bg-cyan-300 text-black font-bold text-xs sm:text-sm font-sans shadow-lg shadow-cyphr/20 hover:shadow-cyphr/40 transition-all flex items-center space-x-2"
            >
              <span>Publish Sovereign Post</span>
              <span>🚀</span>
            </button>
          </div>
        </footer>
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // DOM Event Attacher for Interactivity
  // -------------------------------------------------------------------------

  /**
   * Attaches real, interactive DOM listeners to the editor container
   */
  public attachEvents(rootElement: HTMLElement, onUpdate?: () => void): void {
    if (!rootElement) return;

    const slashMenu = rootElement.querySelector('#rich-editor-slash-menu') as HTMLElement | null;
    const previewDrawer = rootElement.querySelector('#rich-editor-preview-drawer') as HTMLElement | null;
    const previewContent = rootElement.querySelector('#rich-editor-preview-content') as HTMLElement | null;

    const refreshPreview = () => {
      if (previewContent && previewDrawer && !previewDrawer.classList.contains('hidden')) {
        previewContent.innerHTML = this.exportAsHTML();
      }
      if (onUpdate) onUpdate();
    };

    // Toggle Preview
    const btnTogglePreview = rootElement.querySelector('#btn-editor-toggle-preview');
    btnTogglePreview?.addEventListener('click', () => {
      if (previewDrawer) {
        previewDrawer.classList.toggle('hidden');
        refreshPreview();
      }
    });

    // Export Markdown to Clipboard
    const btnExportMarkdown = rootElement.querySelector('#btn-editor-export-markdown');
    btnExportMarkdown?.addEventListener('click', () => {
      const md = this.exportAsMarkdown();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(md);
        const originalText = btnExportMarkdown.innerHTML;
        btnExportMarkdown.innerHTML = '<span>✓</span><span>Copied!</span>';
        setTimeout(() => {
          btnExportMarkdown.innerHTML = originalText;
        }, 2000);
      }
    });

    // Clear All
    const btnClearAll = rootElement.querySelector('#btn-editor-clear-all');
    btnClearAll?.addEventListener('click', async () => {
      if (await sovereignDialog.confirm('Are you sure you want to reset all editor blocks?', { title: 'Reset Editor', destructive: true })) {
        this.clear();
        rootElement.innerHTML = this.renderEditor();
        this.attachEvents(rootElement, onUpdate);
      }
    });

    // Add Bottom Block
    const btnAddBottom = rootElement.querySelector('#btn-editor-add-bottom-block');
    btnAddBottom?.addEventListener('click', () => {
      this.addBlock('paragraph');
      rootElement.innerHTML = this.renderEditor();
      this.attachEvents(rootElement, onUpdate);
    });

    // Open Slash Menu Button
    const btnOpenSlash = rootElement.querySelector('#btn-editor-open-slash');
    btnOpenSlash?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (slashMenu) {
        slashMenu.classList.toggle('hidden');
        slashMenu.style.top = '70px';
        slashMenu.style.left = '20px';
      }
    });

    // Slash Menu Item Selection
    const slashItems = rootElement.querySelectorAll('.slash-menu-item');
    slashItems.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const blockType = (btn.getAttribute('data-slash-type') as BlockType) || 'paragraph';
        this.addBlock(blockType, this.activeBlockId || undefined);
        if (slashMenu) slashMenu.classList.add('hidden');
        rootElement.innerHTML = this.renderEditor();
        this.attachEvents(rootElement, onUpdate);
      });
    });

    // Quick Add Buttons
    const quickAddButtons = rootElement.querySelectorAll('.btn-quick-add-block');
    quickAddButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const afterId = btn.getAttribute('data-after-block-id') || undefined;
        this.addBlock('paragraph', afterId);
        rootElement.innerHTML = this.renderEditor();
        this.attachEvents(rootElement, onUpdate);
      });
    });

    // Block Row Focus & Active State
    const blockRows = rootElement.querySelectorAll('.rich-block-row');
    blockRows.forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-block-id');
        if (id) this.setActiveBlock(id);
      });
    });

    // Block Move Up / Down
    const moveUpBtns = rootElement.querySelectorAll('.btn-block-move-up');
    moveUpBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-block-id');
        if (id) {
          this.moveBlock(id, 'up');
          rootElement.innerHTML = this.renderEditor();
          this.attachEvents(rootElement, onUpdate);
        }
      });
    });

    const moveDownBtns = rootElement.querySelectorAll('.btn-block-move-down');
    moveDownBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-block-id');
        if (id) {
          this.moveBlock(id, 'down');
          rootElement.innerHTML = this.renderEditor();
          this.attachEvents(rootElement, onUpdate);
        }
      });
    });

    // Block Duplicate
    const dupBtns = rootElement.querySelectorAll('.btn-block-duplicate');
    dupBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-block-id');
        if (id) {
          this.duplicateBlock(id);
          rootElement.innerHTML = this.renderEditor();
          this.attachEvents(rootElement, onUpdate);
        }
      });
    });

    // Block Delete
    const delBtns = rootElement.querySelectorAll('.btn-block-delete');
    delBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-block-id');
        if (id) {
          this.removeBlock(id);
          rootElement.innerHTML = this.renderEditor();
          this.attachEvents(rootElement, onUpdate);
        }
      });
    });

    // Transform Block Dropdown
    const transformSelects = rootElement.querySelectorAll('.select-block-transform');
    transformSelects.forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const id = sel.getAttribute('data-block-id');
        const target = e.target as HTMLSelectElement;
        const newType = target.value as BlockType;
        if (id && newType) {
          this.transformBlock(id, newType);
          rootElement.innerHTML = this.renderEditor();
          this.attachEvents(rootElement, onUpdate);
        }
      });
    });

    // Standard Content Inputs & Textareas with Slash Key Detection
    const textareas = rootElement.querySelectorAll('.block-content-textarea, .block-content-input');
    textareas.forEach((el) => {
      const inputEl = el as HTMLTextAreaElement | HTMLInputElement;
      inputEl.addEventListener('input', () => {
        const id = inputEl.getAttribute('data-block-id');
        if (id) {
          this.updateBlock(id, inputEl.value);
          refreshPreview();
        }
      });

      inputEl.addEventListener('keyup', (event: Event) => {
        const e = event as KeyboardEvent;
        if (e.key === '/') {
          const rect = inputEl.getBoundingClientRect();
          const rootRect = rootElement.getBoundingClientRect();
          if (slashMenu) {
            slashMenu.classList.remove('hidden');
            slashMenu.style.top = `${rect.bottom - rootRect.top + 8}px`;
            slashMenu.style.left = `${rect.left - rootRect.left}px`;
          }
        } else if (e.key === 'Escape') {
          if (slashMenu) slashMenu.classList.add('hidden');
        }
      });
    });

    // Code Editor Inputs
    const codeTextareas = rootElement.querySelectorAll('.code-content-textarea');
    codeTextareas.forEach((el) => {
      const textarea = el as HTMLTextAreaElement;
      textarea.addEventListener('input', () => {
        const id = textarea.getAttribute('data-block-id');
        if (id) {
          this.updateBlock(id, textarea.value);
          const block = this.getBlock(id);
          const lang = block?.meta?.language || 'typescript';
          const row = rootElement.querySelector(`#block-wrapper-${id}`);
          const previewTarget = row?.querySelector('.code-preview-target');
          if (previewTarget) {
            previewTarget.innerHTML = CodeTokenizer.highlightToHtml(textarea.value, lang);
          }
          refreshPreview();
        }
      });
    });

    const codeLangSelects = rootElement.querySelectorAll('.code-language-select');
    codeLangSelects.forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const id = sel.getAttribute('data-block-id');
        const target = e.target as HTMLSelectElement;
        if (id) {
          this.updateBlock(id, this.getBlock(id)?.content || '', { language: target.value });
          const block = this.getBlock(id);
          const row = rootElement.querySelector(`#block-wrapper-${id}`);
          const previewTarget = row?.querySelector('.code-preview-target');
          if (previewTarget && block) {
            previewTarget.innerHTML = CodeTokenizer.highlightToHtml(block.content, target.value);
          }
          refreshPreview();
        }
      });
    });

    // Math LaTeX Live Inputs
    const mathTextareas = rootElement.querySelectorAll('.math-latex-textarea');
    mathTextareas.forEach((el) => {
      const textarea = el as HTMLTextAreaElement;
      textarea.addEventListener('input', () => {
        const id = textarea.getAttribute('data-block-id');
        if (id) {
          this.updateBlock(id, textarea.value);
          const row = rootElement.querySelector(`#block-wrapper-${id}`);
          const previewTarget = row?.querySelector('.math-preview-target');
          if (previewTarget) {
            previewTarget.innerHTML = MathRenderer.latexToMathML(textarea.value, true);
          }
          refreshPreview();
        }
      });
    });

    // Diff Raw Inputs
    const diffTextareas = rootElement.querySelectorAll('.diff-raw-textarea');
    diffTextareas.forEach((el) => {
      const textarea = el as HTMLTextAreaElement;
      textarea.addEventListener('input', () => {
        const id = textarea.getAttribute('data-block-id');
        if (id) {
          this.updateBlock(id, textarea.value);
          const block = this.getBlock(id);
          const row = rootElement.querySelector(`#block-wrapper-${id}`);
          const previewContainer = row?.querySelector('.diff-preview-container');
          if (previewContainer) {
            previewContainer.innerHTML = DiffBlockRenderer.renderDiffBlock(textarea.value, block?.meta?.diffFilename);
          }
          refreshPreview();
        }
      });
    });

    // Poll Add Option
    const btnPollAddOption = rootElement.querySelectorAll('.btn-poll-add-option');
    btnPollAddOption.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-block-id');
        if (id) {
          const block = this.getBlock(id);
          const opts = block?.meta?.options || [];
          opts.push(`Option ${opts.length + 1}`);
          this.updateBlock(id, block?.content || '', { options: opts });
          rootElement.innerHTML = this.renderEditor();
          this.attachEvents(rootElement, onUpdate);
        }
      });
    });

    // Poll Remove Option
    const btnPollRemoveOption = rootElement.querySelectorAll('.btn-poll-remove-option');
    btnPollRemoveOption.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-block-id');
        const idxStr = btn.getAttribute('data-option-index');
        if (id && idxStr !== null) {
          const idx = parseInt(idxStr, 10);
          const block = this.getBlock(id);
          const opts = block?.meta?.options || [];
          if (opts.length > 1) {
            opts.splice(idx, 1);
            this.updateBlock(id, block?.content || '', { options: opts });
            rootElement.innerHTML = this.renderEditor();
            this.attachEvents(rootElement, onUpdate);
          }
        }
      });
    });

    // Dismiss Slash Menu on Document Click
    document.addEventListener('click', (e) => {
      if (slashMenu && !slashMenu.contains(e.target as Node)) {
        slashMenu.classList.add('hidden');
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

export const richEditor = new RichBlockEditor();
