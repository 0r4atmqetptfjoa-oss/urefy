/**
 * AETHERIS RICH DIAGRAM & SCIENTIFIC TYPESETTING ENGINE
 * Self-contained, zero-dependency LaTeX Math (KaTeX-grade) & Mermaid Diagram Renderer.
 * Conforms to Dark and Alabaster Light theme invariants, responsive SVG, and strict zero-knowledge architecture.
 */

import { serviceRegistry, SERVICES } from './service-registry.js';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface MathRenderOptions {
  displayMode?: boolean; // true for block $$, false for inline $
  theme?: 'dark' | 'light' | 'auto';
}

export interface MermaidNode {
  id: string;
  label: string;
  shape: 'rect' | 'rounded' | 'database' | 'decision' | 'circle' | 'stadium';
  subgraphId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface MermaidEdge {
  from: string;
  to: string;
  label?: string;
  type: 'arrow' | 'dotted' | 'thick' | 'open';
}

export interface MermaidSubgraph {
  id: string;
  title: string;
  nodeIds: string[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface SequenceParticipant {
  id: string;
  label: string;
  isActor?: boolean;
  x?: number;
}

export interface SequenceMessage {
  from: string;
  to: string;
  text: string;
  arrowType: 'solid' | 'dotted' | 'open' | 'cross';
  y?: number;
}

export interface SequenceNote {
  participants: string[];
  text: string;
  y?: number;
}

export interface MermaidDiagram {
  type: 'flowchart' | 'sequence' | 'unknown';
  direction: 'TD' | 'TB' | 'LR' | 'RL' | 'BT';
  nodes: MermaidNode[];
  edges: MermaidEdge[];
  subgraphs: MermaidSubgraph[];
  participants: SequenceParticipant[];
  messages: SequenceMessage[];
  notes: SequenceNote[];
  error?: string;
}

// ─── Mathematical Constants & Dictionaries ──────────────────────────────────

const GREEK_LETTERS: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  varepsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  vartheta: 'ϑ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  varpi: 'ϖ',
  rho: 'ρ',
  varrho: 'ϱ',
  sigma: 'σ',
  varsigma: 'ς',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  varphi: 'ϕ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',
};

const MATH_SYMBOLS: Record<string, string> = {
  times: '×',
  div: '÷',
  pm: '±',
  mp: '∓',
  cdot: '·',
  ast: '∗',
  star: '⋆',
  circ: '∘',
  bullet: '∙',
  leq: '≤',
  le: '≤',
  geq: '≥',
  ge: '≥',
  neq: '≠',
  ne: '≠',
  approx: '≈',
  equiv: '≡',
  sim: '∼',
  simeq: '≃',
  cong: '≅',
  propto: '∝',
  infty: '∞',
  partial: '∂',
  nabla: '∇',
  in: '∈',
  notin: '∉',
  ni: '∋',
  subset: '⊂',
  subseteq: '⊆',
  supset: '⊃',
  supseteq: '⊇',
  cup: '∪',
  cap: '∩',
  setminus: '∖',
  emptyset: '∅',
  varnothing: '∅',
  to: '→',
  rightarrow: '→',
  leftarrow: '←',
  leftrightarrow: '↔',
  Rightarrow: '⇒',
  Leftarrow: '⇐',
  Leftrightarrow: '⇔',
  mapsto: '↦',
  uparrow: '↑',
  downarrow: '↓',
  forall: '∀',
  exists: '∃',
  nexists: '∄',
  neg: '¬',
  land: '∧',
  lor: '∨',
  hbar: 'ℏ',
  ell: 'ℓ',
  Re: 'ℜ',
  Im: 'ℑ',
};

const LARGE_OPERATORS: Record<string, string> = {
  sum: '∑',
  prod: '∏',
  coprod: '∐',
  int: '∫',
  iint: '∬',
  iiint: '∭',
  oint: '∮',
  bigcup: '⋃',
  bigcap: '⋂',
  bigvee: '⋁',
  bigwedge: '⋀',
};

const MATH_FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'cot',
  'sec',
  'csc',
  'arcsin',
  'arccos',
  'arctan',
  'sinh',
  'cosh',
  'tanh',
  'log',
  'ln',
  'exp',
  'det',
  'dim',
  'ker',
  'deg',
  'gcd',
  'hom',
  'inf',
  'sup',
  'lim',
  'liminf',
  'limsup',
  'max',
  'min',
  'arg',
  'Pr',
]);

const BLACKBOARD_LETTERS: Record<string, string> = {
  R: 'ℝ',
  C: 'ℂ',
  N: 'ℕ',
  Z: 'ℤ',
  Q: 'ℚ',
  P: 'ℙ',
  H: 'ℍ',
  F: '𝔽',
};

// ─── Mathematical Formula Parser & Typesetter ───────────────────────────────

export class DiagramRenderer {
  // ── Helper: Escape HTML ──
  public escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Helper: Extract Balanced Argument `{...}` or Macro/Char ──
  private extractBracedArg(
    str: string,
    startIndex: number
  ): { arg: string; nextIndex: number } | null {
    let i = startIndex;
    while (i < str.length && /\s/.test(str[i])) i++;
    if (i >= str.length) return null;

    if (str[i] === '{') {
      let depth = 1;
      let j = i + 1;
      while (j < str.length && depth > 0) {
        if (str[j] === '{' && str[j - 1] !== '\\') depth++;
        else if (str[j] === '}' && str[j - 1] !== '\\') depth--;
        j++;
      }
      if (depth === 0) {
        return { arg: str.slice(i + 1, j - 1), nextIndex: j };
      }
      return null;
    } else if (str[i] === '\\') {
      // Command without braces, e.g. ^\infty or _\alpha
      const cmdMatch = str.slice(i + 1).match(/^[a-zA-Z]+/);
      if (cmdMatch) {
        return { arg: '\\' + cmdMatch[0], nextIndex: i + 1 + cmdMatch[0].length };
      }
      return { arg: str[i], nextIndex: i + 1 };
    } else {
      // Single character token (e.g. \frac 1 2, ^2, _i)
      return { arg: str[i], nextIndex: i + 1 };
    }
  }

  // ── Helper: Extract Bracketed Argument `[...]` ──
  private extractBracketedArg(
    str: string,
    startIndex: number
  ): { arg: string; nextIndex: number } | null {
    let i = startIndex;
    while (i < str.length && /\s/.test(str[i])) i++;
    if (i >= str.length || str[i] !== '[') return null;

    let depth = 1;
    let j = i + 1;
    while (j < str.length && depth > 0) {
      if (str[j] === '[') depth++;
      else if (str[j] === ']') depth--;
      j++;
    }
    if (depth === 0) {
      return { arg: str.slice(i + 1, j - 1), nextIndex: j };
    }
    return null;
  }

  // ── Recursive LaTeX Fragment Parser ──
  public parseLatexToHtml(latex: string): string {
    let input = latex.trim();
    let out = '';
    let i = 0;

    while (i < input.length) {
      const char = input[i];

      // Whitespace
      if (/\s/.test(char)) {
        out += ' ';
        i++;
        continue;
      }

      // LaTeX command `\command`
      if (char === '\\') {
        // Escaped symbols
        if (input[i + 1] === '{' || input[i + 1] === '}' || input[i + 1] === '$' || input[i + 1] === '%') {
          out += `<span class="text-slate-300 font-serif">${this.escapeHtml(input[i + 1])}</span>`;
          i += 2;
          continue;
        }

        if (input[i + 1] === '\\') {
          out += `<br />`;
          i += 2;
          continue;
        }

        // Parse command name
        const cmdMatch = input.slice(i + 1).match(/^[a-zA-Z]+/);
        if (!cmdMatch) {
          out += this.escapeHtml(char);
          i++;
          continue;
        }

        const cmd = cmdMatch[0];
        const cmdEnd = i + 1 + cmd.length;

        // 1. Matrices: \begin{matrix} ... \end{matrix}
        if (cmd === 'begin') {
          const envArg = this.extractBracedArg(input, cmdEnd);
          if (envArg) {
            const envType = envArg.arg.trim();
            const endMarker = `\\end{${envType}}`;
            const endIdx = input.indexOf(endMarker, envArg.nextIndex);
            if (endIdx !== -1) {
              const matrixBody = input.slice(envArg.nextIndex, endIdx);
              out += this.renderMatrix(matrixBody, envType);
              i = endIdx + endMarker.length;
              continue;
            }
          }
        }

        // 2. Fractions: \frac{a}{b}
        if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
          const numArg = this.extractBracedArg(input, cmdEnd);
          if (numArg) {
            const denArg = this.extractBracedArg(input, numArg.nextIndex);
            if (denArg) {
              const numHtml = this.parseLatexToHtml(numArg.arg);
              const denHtml = this.parseLatexToHtml(denArg.arg);
              out +=
                `<span class="katex-fraction inline-flex flex-col items-center justify-center align-middle mx-1 my-0.5 leading-tight text-[0.9em]">` +
                `<span class="katex-num px-1 border-b border-current pb-0.5 text-center">${numHtml}</span>` +
                `<span class="katex-den px-1 pt-0.5 text-center">${denHtml}</span>` +
                `</span>`;
              i = denArg.nextIndex;
              continue;
            }
          }
        }

        // 3. Square roots: \sqrt[n]{x} or \sqrt{x}
        if (cmd === 'sqrt') {
          let rootIndexHtml: string | undefined;
          let radStart = cmdEnd;
          const bracketArg = this.extractBracketedArg(input, cmdEnd);
          if (bracketArg) {
            rootIndexHtml = this.parseLatexToHtml(bracketArg.arg);
            radStart = bracketArg.nextIndex;
          }
          const radArg = this.extractBracedArg(input, radStart);
          if (radArg) {
            const radHtml = this.parseLatexToHtml(radArg.arg);
            const indexPrefix = rootIndexHtml
              ? `<sup class="text-[0.65em] -mr-1 align-top relative -top-1 font-sans text-slate-400">${rootIndexHtml}</sup>`
              : '';
            out +=
              `<span class="katex-sqrt inline-flex items-center align-middle mx-0.5 my-0.5">` +
              indexPrefix +
              `<svg class="w-3.5 h-5 inline-block -mr-0.5 text-current flex-shrink-0" viewBox="0 0 32 54" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 32 L9 28 L15 48 L27 6" /></svg>` +
              `<span class="border-t-2 border-current pt-0.5 px-1 inline-block">${radHtml}</span>` +
              `</span>`;
            i = radArg.nextIndex;
            continue;
          }
        }

        // 4. Large Operators with Sub/Superscript limits: \sum, \prod, \int
        if (LARGE_OPERATORS[cmd]) {
          const symbol = LARGE_OPERATORS[cmd];
          let nextIdx = cmdEnd;
          let lowerHtml: string | undefined;
          let upperHtml: string | undefined;

          // Check for sub/sup limits
          for (let k = 0; k < 2; k++) {
            while (nextIdx < input.length && /\s/.test(input[nextIdx])) nextIdx++;
            if (nextIdx < input.length && input[nextIdx] === '_') {
              const subArg = this.extractBracedArg(input, nextIdx + 1);
              if (subArg) {
                lowerHtml = this.parseLatexToHtml(subArg.arg);
                nextIdx = subArg.nextIndex;
              }
            } else if (nextIdx < input.length && input[nextIdx] === '^') {
              const supArg = this.extractBracedArg(input, nextIdx + 1);
              if (supArg) {
                upperHtml = this.parseLatexToHtml(supArg.arg);
                nextIdx = supArg.nextIndex;
              }
            }
          }

          out +=
            `<span class="katex-large-op inline-flex flex-col items-center justify-center mx-1 align-middle leading-none select-none">` +
            (upperHtml
              ? `<span class="katex-op-upper text-[0.7em] text-slate-400 font-sans leading-none mb-0.5 text-center">${upperHtml}</span>`
              : '') +
            `<span class="text-xl font-serif text-current leading-none">${symbol}</span>` +
            (lowerHtml
              ? `<span class="katex-op-lower text-[0.7em] text-slate-400 font-sans leading-none mt-0.5 text-center">${lowerHtml}</span>`
              : '') +
            `</span>`;
          i = nextIdx;
          continue;
        }

        // 5. Greek Letters
        if (GREEK_LETTERS[cmd]) {
          out += `<span class="font-serif text-current">${GREEK_LETTERS[cmd]}</span>`;
          i = cmdEnd;
          continue;
        }

        // 6. Math Symbols
        if (MATH_SYMBOLS[cmd]) {
          out += `<span class="mx-0.5 text-current font-serif">${MATH_SYMBOLS[cmd]}</span>`;
          i = cmdEnd;
          continue;
        }

        // 7. Math Functions (sin, cos, log, lim, etc.)
        if (MATH_FUNCTIONS.has(cmd)) {
          out += `<span class="font-sans font-medium text-slate-300 mx-0.5">${cmd}</span>`;
          i = cmdEnd;
          continue;
        }

        // 8. Blackboard letters: \mathbb{R}
        if (cmd === 'mathbb') {
          const arg = this.extractBracedArg(input, cmdEnd);
          if (arg) {
            const letter = arg.arg.trim();
            const bb = BLACKBOARD_LETTERS[letter] || letter;
            out += `<span class="font-serif font-bold text-current">${bb}</span>`;
            i = arg.nextIndex;
            continue;
          }
        }

        // 9. Font modifiers: \mathbf, \mathit, \mathrm, \text
        if (cmd === 'mathbf' || cmd === 'textbf') {
          const arg = this.extractBracedArg(input, cmdEnd);
          if (arg) {
            out += `<strong class="font-serif font-bold">${this.parseLatexToHtml(arg.arg)}</strong>`;
            i = arg.nextIndex;
            continue;
          }
        }
        if (cmd === 'mathit' || cmd === 'textit') {
          const arg = this.extractBracedArg(input, cmdEnd);
          if (arg) {
            out += `<em class="font-serif italic">${this.parseLatexToHtml(arg.arg)}</em>`;
            i = arg.nextIndex;
            continue;
          }
        }
        if (cmd === 'mathrm' || cmd === 'text') {
          const arg = this.extractBracedArg(input, cmdEnd);
          if (arg) {
            out += `<span class="font-sans font-normal text-slate-300 mx-0.5">${this.escapeHtml(arg.arg)}</span>`;
            i = arg.nextIndex;
            continue;
          }
        }

        // 10. Delimiters: \left, \right
        if (cmd === 'left' || cmd === 'right') {
          let delim = input[cmdEnd];
          let advance = 1;
          if (delim === '\\') {
            delim = input[cmdEnd + 1] || '';
            advance = 2;
          }
          if (delim && delim !== '.') {
            out += `<span class="text-slate-400 font-serif text-lg align-middle select-none">${this.escapeHtml(delim)}</span>`;
          }
          i = cmdEnd + advance;
          continue;
        }

        // 11. Overline / Hat / Bar
        if (cmd === 'bar' || cmd === 'overline') {
          const arg = this.extractBracedArg(input, cmdEnd);
          if (arg) {
            out += `<span class="border-t border-current pt-0.5 inline-block">${this.parseLatexToHtml(arg.arg)}</span>`;
            i = arg.nextIndex;
            continue;
          }
        }

        // Unknown command: render text fallback
        out += `<span class="font-mono text-xs text-slate-400">\\${this.escapeHtml(cmd)}</span>`;
        i = cmdEnd;
        continue;
      }

      // Subscripts and Superscripts attached to preceding element
      if (char === '^' || char === '_') {
        let subHtml: string | undefined;
        let supHtml: string | undefined;
        let curIdx = i;

        // Lookahead to collect combined sub and sup (e.g. x_i^2 or x^2_i)
        for (let pass = 0; pass < 2; pass++) {
          if (curIdx < input.length && input[curIdx] === '^') {
            const supArg = this.extractBracedArg(input, curIdx + 1);
            if (supArg) {
              supHtml = this.parseLatexToHtml(supArg.arg);
              curIdx = supArg.nextIndex;
            }
          } else if (curIdx < input.length && input[curIdx] === '_') {
            const subArg = this.extractBracedArg(input, curIdx + 1);
            if (subArg) {
              subHtml = this.parseLatexToHtml(subArg.arg);
              curIdx = subArg.nextIndex;
            }
          }
        }

        if (subHtml && supHtml) {
          out +=
            `<span class="katex-subsup inline-flex flex-col text-[0.7em] align-middle ml-0.5 leading-none select-none">` +
            `<sup class="font-sans leading-none">${supHtml}</sup>` +
            `<sub class="font-sans leading-none mt-0.5">${subHtml}</sub>` +
            `</span>`;
        } else if (supHtml) {
          out += `<sup class="katex-sup text-[0.75em] -top-1 relative ml-0.5 font-sans">${supHtml}</sup>`;
        } else if (subHtml) {
          out += `<sub class="katex-sub text-[0.75em] -bottom-0.5 relative ml-0.5 font-sans">${subHtml}</sub>`;
        }

        i = curIdx;
        continue;
      }

      // Grouping braces `{ ... }`
      if (char === '{') {
        const arg = this.extractBracedArg(input, i);
        if (arg) {
          out += this.parseLatexToHtml(arg.arg);
          i = arg.nextIndex;
          continue;
        }
      }

      // Parentheses, Brackets, Braces
      if (char === '(' || char === ')' || char === '[' || char === ']') {
        out += `<span class="text-slate-400 font-serif select-none">${this.escapeHtml(char)}</span>`;
        i++;
        continue;
      }

      // Mathematical Operators (=, +, -, <, >, *, /)
      if (char === '=' || char === '+' || char === '-' || char === '<' || char === '>' || char === '*' || char === '/') {
        const displayOp = char === '*' ? '·' : char === '-' ? '−' : char;
        out += `<span class="mx-1 text-slate-300 dark:text-slate-300 light:text-slate-700">${this.escapeHtml(displayOp)}</span>`;
        i++;
        continue;
      }

      // Single character variable (letters: x, y, E, m, c, n)
      if (/[a-zA-Z]/.test(char)) {
        out += `<i class="italic font-serif text-current">${char}</i>`;
        i++;
        continue;
      }

      // Numbers
      if (/[0-9]/.test(char)) {
        let numStr = '';
        while (i < input.length && /[0-9.]/.test(input[i])) {
          numStr += input[i];
          i++;
        }
        out += `<span class="font-sans text-current">${numStr}</span>`;
        continue;
      }

      // Fallback: raw character
      out += this.escapeHtml(char);
      i++;
    }

    return out;
  }

  // ── Render LaTeX Matrix ──
  private renderMatrix(body: string, envType: string): string {
    const rows = body
      .split(/\\\\|\r?\n/)
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    let leftBracket = '';
    let rightBracket = '';

    if (envType === 'pmatrix') {
      leftBracket = '(';
      rightBracket = ')';
    } else if (envType === 'bmatrix') {
      leftBracket = '[';
      rightBracket = ']';
    } else if (envType === 'vmatrix') {
      leftBracket = '|';
      rightBracket = '|';
    } else if (envType === 'Bmatrix') {
      leftBracket = '{';
      rightBracket = '}';
    }

    const tableRows = rows
      .map((row) => {
        const cells = row.split('&').map((c) => c.trim());
        const renderedCells = cells
          .map(
            (cell) =>
              `<td class="px-2 py-1 text-center font-serif text-slate-200 border-none">${this.parseLatexToHtml(cell)}</td>`
          )
          .join('');
        return `<tr>${renderedCells}</tr>`;
      })
      .join('');

    const leftDelim = leftBracket
      ? `<span class="text-xl sm:text-2xl font-serif text-slate-400 select-none -mr-0.5">${leftBracket}</span>`
      : '';
    const rightDelim = rightBracket
      ? `<span class="text-xl sm:text-2xl font-serif text-slate-400 select-none -ml-0.5">${rightBracket}</span>`
      : '';

    return (
      `<span class="katex-matrix inline-flex items-center align-middle mx-1.5 my-1">` +
      leftDelim +
      `<table class="inline-table border-collapse mx-1 text-center text-xs leading-none">${tableRows}</table>` +
      rightDelim +
      `</span>`
    );
  }

  // ── Public Math Rendering APIs ──

  /**
   * Render inline math formula `$expression$`
   */
  public renderInlineMath(latex: string): string {
    const clean = latex.trim();
    if (!clean) return '';
    const contentHtml = this.parseLatexToHtml(clean);
    return (
      `<span class="aetheris-math-inline inline-flex items-center mx-1 px-1.5 py-0.5 rounded font-serif text-indigo-300 dark:text-cyan-300 light:text-indigo-700 bg-surface-overlay/50 border border-white/5 shadow-xs select-text" ` +
      `role="math" aria-label="${this.escapeHtml(clean)}">` +
      contentHtml +
      `</span>`
    );
  }

  /**
   * Render block math formula `$$expression$$`
   */
  public renderBlockMath(latex: string): string {
    const clean = latex.trim();
    if (!clean) return '';
    const contentHtml = this.parseLatexToHtml(clean);
    return (
      `<div class="aetheris-math-block my-3 p-3.5 rounded-xl bg-surface-overlay/80 border border-white/10 dark:border-white/10 light:border-slate-300/80 overflow-x-auto text-center font-serif text-slate-100 dark:text-slate-100 light:text-slate-800 shadow-sm select-text" ` +
      `role="math" aria-label="${this.escapeHtml(clean)}">` +
      `<div class="inline-block mx-auto text-sm sm:text-base leading-relaxed tracking-wide">` +
      contentHtml +
      `</div>` +
      `</div>`
    );
  }

  // ─── Mermaid Flowchart & Sequence Diagram Parser ────────────────────────────

  public parseMermaid(code: string): MermaidDiagram {
    const lines = code
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('%%'));

    if (lines.length === 0) {
      return {
        type: 'unknown',
        direction: 'TD',
        nodes: [],
        edges: [],
        subgraphs: [],
        participants: [],
        messages: [],
        notes: [],
        error: 'Empty diagram definition',
      };
    }

    const firstLine = lines[0];

    // Sequence Diagram
    if (/^sequenceDiagram/i.test(firstLine)) {
      return this.parseSequenceDiagram(lines.slice(1));
    }

    // Flowchart / Graph
    const flowMatch = firstLine.match(/^(?:graph|flowchart)\s+(TD|TB|LR|RL|BT)/i);
    if (flowMatch) {
      const dir = (flowMatch[1].toUpperCase() as 'TD' | 'TB' | 'LR' | 'RL' | 'BT') || 'TD';
      return this.parseFlowchart(lines.slice(1), dir);
    }

    // Default or unknown fallback
    return {
      type: 'unknown',
      direction: 'TD',
      nodes: [],
      edges: [],
      subgraphs: [],
      participants: [],
      messages: [],
      notes: [],
      error: `Unsupported diagram header: "${firstLine}". Expected "graph TD", "graph LR", "flowchart TD", or "sequenceDiagram".`,
    };
  }

  // ── Parse Sequence Diagram ──
  private parseSequenceDiagram(lines: string[]): MermaidDiagram {
    const participants: SequenceParticipant[] = [];
    const participantMap = new Set<string>();
    const messages: SequenceMessage[] = [];
    const notes: SequenceNote[] = [];

    const ensureParticipant = (id: string, label?: string, isActor: boolean = false) => {
      const cleanId = id.trim();
      if (!cleanId) return;
      if (!participantMap.has(cleanId)) {
        participantMap.add(cleanId);
        participants.push({
          id: cleanId,
          label: label?.trim() || cleanId,
          isActor,
        });
      }
    };

    for (const line of lines) {
      // Participant / Actor definition: participant Alice as A
      const partMatch = line.match(/^(participant|actor)\s+([a-zA-Z0-9_-]+)(?:\s+as\s+(.+))?$/i);
      if (partMatch) {
        const isActor = partMatch[1].toLowerCase() === 'actor';
        const id = partMatch[2];
        const label = partMatch[3] || id;
        ensureParticipant(id, label, isActor);
        continue;
      }

      // Note: Note over Alice,Bob: text
      const noteMatch = line.match(/^Note\s+(?:over|(?:right|left)\s+of)\s+([a-zA-Z0-9_,-]+)\s*:\s*(.+)$/i);
      if (noteMatch) {
        const parts = noteMatch[1].split(',').map((p) => p.trim());
        parts.forEach((p) => ensureParticipant(p));
        notes.push({
          participants: parts,
          text: noteMatch[2].trim(),
        });
        continue;
      }

      // Messages: A->>B: text, A-->>B: text, A->B: text, A-->B: text
      const msgMatch = line.match(/^([a-zA-Z0-9_-]+)\s*(->>|-->>|->|-->|-\s*x)\s*([a-zA-Z0-9_-]+)\s*:\s*(.+)$/);
      if (msgMatch) {
        const from = msgMatch[1].trim();
        const arrow = msgMatch[2].replace(/\s+/g, '');
        const to = msgMatch[3].trim();
        const text = msgMatch[4].trim();

        ensureParticipant(from);
        ensureParticipant(to);

        let arrowType: 'solid' | 'dotted' | 'open' | 'cross' = 'solid';
        if (arrow === '-->>') arrowType = 'dotted';
        else if (arrow === '->') arrowType = 'open';
        else if (arrow.includes('x')) arrowType = 'cross';

        messages.push({
          from,
          to,
          text,
          arrowType,
        });
      }
    }

    return {
      type: 'sequence',
      direction: 'TD',
      nodes: [],
      edges: [],
      subgraphs: [],
      participants,
      messages,
      notes,
    };
  }

  // ── Parse Flowchart / Graph ──
  private parseFlowchart(
    lines: string[],
    direction: 'TD' | 'TB' | 'LR' | 'RL' | 'BT'
  ): MermaidDiagram {
    const nodeMap = new Map<string, MermaidNode>();
    const edges: MermaidEdge[] = [];
    const subgraphs: MermaidSubgraph[] = [];
    let currentSubgraph: MermaidSubgraph | null = null;

    // Helper: Parse or register node declaration
    const parseNodeDeclaration = (token: string): MermaidNode | null => {
      const trimmed = token.trim();
      if (!trimmed) return null;

      // 1. Database [(Database Name)]
      const dbMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\[\((.+)\)\]$/);
      if (dbMatch) {
        const id = dbMatch[1];
        const label = dbMatch[2];
        const node: MermaidNode = { id, label, shape: 'database' };
        nodeMap.set(id, node);
        return node;
      }

      // 2. Stadium ([Stadium Name])
      const stadiumMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\(\[(.+)\]\)$/);
      if (stadiumMatch) {
        const id = stadiumMatch[1];
        const label = stadiumMatch[2];
        const node: MermaidNode = { id, label, shape: 'stadium' };
        nodeMap.set(id, node);
        return node;
      }

      // 3. Circle ((Circle Name))
      const circleMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\(\((.+)\)\)$/);
      if (circleMatch) {
        const id = circleMatch[1];
        const label = circleMatch[2];
        const node: MermaidNode = { id, label, shape: 'circle' };
        nodeMap.set(id, node);
        return node;
      }

      // 4. Decision {Decision Label}
      const decisionMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\{(.+)\}$/);
      if (decisionMatch) {
        const id = decisionMatch[1];
        const label = decisionMatch[2];
        const node: MermaidNode = { id, label, shape: 'decision' };
        nodeMap.set(id, node);
        return node;
      }

      // 5. Rounded (Rounded Label)
      const roundedMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\((.+)\)$/);
      if (roundedMatch) {
        const id = roundedMatch[1];
        const label = roundedMatch[2];
        const node: MermaidNode = { id, label, shape: 'rounded' };
        nodeMap.set(id, node);
        return node;
      }

      // 6. Rect [Rect Label]
      const rectMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\[(.+)\]$/);
      if (rectMatch) {
        const id = rectMatch[1];
        const label = rectMatch[2];
        const node: MermaidNode = { id, label, shape: 'rect' };
        nodeMap.set(id, node);
        return node;
      }

      // 7. Plain identifier A
      const plainMatch = trimmed.match(/^([a-zA-Z0-9_-]+)$/);
      if (plainMatch) {
        const id = plainMatch[1];
        if (!nodeMap.has(id)) {
          nodeMap.set(id, { id, label: id, shape: 'rect' });
        }
        return nodeMap.get(id)!;
      }

      return null;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // Subgraph start: subgraph title or subgraph id [title]
      const subStartMatch = line.match(/^subgraph\s+(?:([a-zA-Z0-9_-]+)\s*\[(.+)\]|(.+))$/i);
      if (subStartMatch) {
        const id = subStartMatch[1] || `sg_${subgraphs.length + 1}`;
        const title = subStartMatch[2] || subStartMatch[3] || id;
        currentSubgraph = { id, title: title.trim(), nodeIds: [] };
        subgraphs.push(currentSubgraph);
        continue;
      }

      // Subgraph end
      if (/^end$/i.test(line)) {
        currentSubgraph = null;
        continue;
      }

      // Edge patterns: A --> B, A -->|label| B, A --- B, A -.-> B, A ==> B, etc.
      const arrowRegex = /(-->|---|==>|-\.->|--\s*[^-]+\s*-->|-\.\s*[^.]+\s*\.->|==\s*[^=]+\s*==>)/;
      if (arrowRegex.test(line)) {
        // Multi-segment split for chained arrows: A --> B --> C
        const tokens = line.split(
          /(-->(?:\|[^|]+\|)?|---(?:\|[^|]+\|)?|==>(?:\|[^|]+\|)?|-\.->(?:\|[^|]+\|)?|--\s*[^-]+\s*-->|-\.\s*[^.]+\s*\.->|==\s*[^=]+\s*==>)/g
        );

        let previousNodeId: string | null = null;
        let pendingArrow: { type: 'arrow' | 'dotted' | 'thick' | 'open'; label?: string } | null = null;

        for (const rawToken of tokens) {
          const tok = rawToken.trim();
          if (!tok) continue;

          // Check if token is an arrow
          const arrowCheck = tok.match(
            /^(-->(?:\|([^|]+)\|)?|---(?:\|([^|]+)\|)?|==>(?:\|([^|]+)\|)?|-\.->(?:\|([^|]+)\|)?|--\s*([^-]+)\s*-->|-\.\s*([^.]+)\s*\.->|==\s*([^=]+)\s*==>)$/
          );

          if (arrowCheck) {
            let type: 'arrow' | 'dotted' | 'thick' | 'open' = 'arrow';
            if (tok.startsWith('---')) type = 'open';
            else if (tok.startsWith('==')) type = 'thick';
            else if (tok.startsWith('-.')) type = 'dotted';

            const label =
              arrowCheck[2] ||
              arrowCheck[3] ||
              arrowCheck[4] ||
              arrowCheck[5] ||
              arrowCheck[6] ||
              arrowCheck[7] ||
              arrowCheck[8];

            pendingArrow = { type, label: label ? label.trim() : undefined };
          } else {
            // Token is a node definition
            const node = parseNodeDeclaration(tok);
            if (node) {
              if (currentSubgraph) {
                node.subgraphId = currentSubgraph.id;
                if (!currentSubgraph.nodeIds.includes(node.id)) {
                  currentSubgraph.nodeIds.push(node.id);
                }
              }

              if (previousNodeId && pendingArrow) {
                edges.push({
                  from: previousNodeId,
                  to: node.id,
                  type: pendingArrow.type,
                  label: pendingArrow.label,
                });
                pendingArrow = null;
              }

              previousNodeId = node.id;
            }
          }
        }
        continue;
      }

      // Standalone node declaration: A[Label]
      const node = parseNodeDeclaration(line);
      if (node && currentSubgraph) {
        node.subgraphId = currentSubgraph.id;
        if (!currentSubgraph.nodeIds.includes(node.id)) {
          currentSubgraph.nodeIds.push(node.id);
        }
      }
    }

    return {
      type: 'flowchart',
      direction,
      nodes: Array.from(nodeMap.values()),
      edges,
      subgraphs,
      participants: [],
      messages: [],
      notes: [],
    };
  }

  // ─── SVG Layout & Generation ──────────────────────────────────────────────

  /**
   * Render SVG Flowchart from Mermaid definition
   */
  public renderFlowchartSvg(diagram: MermaidDiagram): string {
    const { nodes, edges, subgraphs, direction } = diagram;
    const isHorizontal = direction === 'LR' || direction === 'RL';

    if (nodes.length === 0) {
      return this.renderFallbackHtml('Empty flowchart: No nodes detected', '');
    }

    // 1. Calculate node dimensions
    for (const node of nodes) {
      const textLen = node.label.length;
      const calculatedWidth = Math.max(90, Math.min(240, textLen * 9 + 36));
      let width = calculatedWidth;
      let height = 44;

      if (node.shape === 'decision') {
        width = Math.max(100, calculatedWidth + 24);
        height = 56;
      } else if (node.shape === 'circle') {
        const size = Math.max(64, Math.min(100, textLen * 10 + 20));
        width = size;
        height = size;
      } else if (node.shape === 'database') {
        width = Math.max(100, calculatedWidth);
        height = 56;
      }

      node.width = width;
      node.height = height;
    }

    // 2. Compute Layering (Longest path / Topological)
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    nodes.forEach((n) => {
      inDegree.set(n.id, 0);
      adjacency.set(n.id, []);
    });

    edges.forEach((e) => {
      if (inDegree.has(e.to)) {
        inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
      }
      if (adjacency.has(e.from)) {
        adjacency.get(e.from)!.push(e.to);
      }
    });

    const nodeLayers = new Map<string, number>();
    // Start with root nodes
    const queue: Array<{ id: string; layer: number }> = [];
    nodes.forEach((n) => {
      if ((inDegree.get(n.id) || 0) === 0) {
        queue.push({ id: n.id, layer: 0 });
        nodeLayers.set(n.id, 0);
      }
    });

    // Fallback if cycles exist
    if (queue.length === 0 && nodes.length > 0) {
      queue.push({ id: nodes[0].id, layer: 0 });
      nodeLayers.set(nodes[0].id, 0);
    }

    // Assign layers
    while (queue.length > 0) {
      const { id, layer } = queue.shift()!;
      const neighbors = adjacency.get(id) || [];
      for (const nextId of neighbors) {
        const nextLayer = Math.max(nodeLayers.get(nextId) ?? 0, layer + 1);
        if (nextLayer !== nodeLayers.get(nextId)) {
          nodeLayers.set(nextId, nextLayer);
          queue.push({ id: nextId, layer: nextLayer });
        }
      }
    }

    // Assign any unconnected nodes
    nodes.forEach((n, idx) => {
      if (!nodeLayers.has(n.id)) {
        nodeLayers.set(n.id, idx % 3);
      }
    });

    // Group nodes by layer
    const layerMap = new Map<number, MermaidNode[]>();
    nodes.forEach((n) => {
      const l = nodeLayers.get(n.id) || 0;
      if (!layerMap.has(l)) layerMap.set(l, []);
      layerMap.get(l)!.push(n);
    });

    const sortedLayers = Array.from(layerMap.keys()).sort((a, b) => a - b);

    // 3. Compute Coordinates
    const padding = 50;
    const layerGap = 80;
    const nodeGap = 40;

    let totalWidth = 0;
    let totalHeight = 0;

    if (!isHorizontal) {
      // Top-Down Layout
      let maxLayerWidth = 0;
      sortedLayers.forEach((l) => {
        const layerNodes = layerMap.get(l)!;
        const widthSum = layerNodes.reduce((sum, n) => sum + (n.width || 100), 0) + (layerNodes.length - 1) * nodeGap;
        if (widthSum > maxLayerWidth) maxLayerWidth = widthSum;
      });

      totalWidth = maxLayerWidth + padding * 2;
      let curY = padding;

      sortedLayers.forEach((l) => {
        const layerNodes = layerMap.get(l)!;
        const widthSum = layerNodes.reduce((sum, n) => sum + (n.width || 100), 0) + (layerNodes.length - 1) * nodeGap;
        let curX = (totalWidth - widthSum) / 2;
        let maxLayerHeight = 0;

        layerNodes.forEach((node) => {
          node.x = curX;
          node.y = curY;
          curX += (node.width || 100) + nodeGap;
          if ((node.height || 44) > maxLayerHeight) maxLayerHeight = node.height || 44;
        });

        curY += maxLayerHeight + layerGap;
      });

      totalHeight = curY - layerGap + padding;
    } else {
      // Left-Right Layout
      let maxLayerHeight = 0;
      sortedLayers.forEach((l) => {
        const layerNodes = layerMap.get(l)!;
        const heightSum = layerNodes.reduce((sum, n) => sum + (n.height || 44), 0) + (layerNodes.length - 1) * nodeGap;
        if (heightSum > maxLayerHeight) maxLayerHeight = heightSum;
      });

      totalHeight = maxLayerHeight + padding * 2;
      let curX = padding;

      sortedLayers.forEach((l) => {
        const layerNodes = layerMap.get(l)!;
        const heightSum = layerNodes.reduce((sum, n) => sum + (n.height || 44), 0) + (layerNodes.length - 1) * nodeGap;
        let curY = (totalHeight - heightSum) / 2;
        let maxLayerWidth = 0;

        layerNodes.forEach((node) => {
          node.x = curX;
          node.y = curY;
          curX += (node.height || 44) + nodeGap;
          if ((node.width || 100) > maxLayerWidth) maxLayerWidth = node.width || 100;
        });

        curX += maxLayerWidth + layerGap;
      });

      totalWidth = curX - layerGap + padding;
    }

    // Ensure minimum responsive view
    totalWidth = Math.max(360, totalWidth);
    totalHeight = Math.max(160, totalHeight);

    // 4. Compute Subgraph bounding boxes
    const renderedSubgraphs = subgraphs
      .map((sg) => {
        const sgNodes = nodes.filter((n) => sg.nodeIds.includes(n.id));
        if (sgNodes.length === 0) return '';

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        sgNodes.forEach((n) => {
          minX = Math.min(minX, n.x!);
          minY = Math.min(minY, n.y!);
          maxX = Math.max(maxX, n.x! + n.width!);
          maxY = Math.max(maxY, n.y! + n.height!);
        });

        const pad = 18;
        const bx = minX - pad;
        const by = minY - pad - 16;
        const bw = maxX - minX + pad * 2;
        const bh = maxY - minY + pad * 2 + 16;

        return (
          `<g class="aetheris-subgraph">` +
          `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="12" fill="rgba(99, 102, 241, 0.04)" stroke="rgba(99, 102, 241, 0.3)" stroke-width="1.5" stroke-dasharray="4 4" />` +
          `<text x="${bx + 14}" y="${by + 16}" fill="#818cf8" font-size="11" font-family="system-ui, sans-serif" font-weight="700" letter-spacing="0.05em">${this.escapeHtml(sg.title.toUpperCase())}</text>` +
          `</g>`
        );
      })
      .join('\n');

    // 5. Render Edges with Bezier Curves & Labels
    const nodeLookup = new Map<string, MermaidNode>(nodes.map((n) => [n.id, n]));
    const renderedEdges = edges
      .map((edge) => {
        const src = nodeLookup.get(edge.from);
        const dst = nodeLookup.get(edge.to);
        if (!src || !dst) return '';

        let sx: number;
        let sy: number;
        let ex: number;
        let ey: number;

        if (!isHorizontal) {
          // Top-Down: exit bottom of src, enter top of dst
          sx = src.x! + src.width! / 2;
          sy = src.y! + src.height!;
          ex = dst.x! + dst.width! / 2;
          ey = dst.y!;
        } else {
          // Left-Right: exit right of src, enter left of dst
          sx = src.x! + src.width!;
          sy = src.y! + src.height! / 2;
          ex = dst.x!;
          ey = dst.y! + dst.height! / 2;
        }

        const midX = (sx + ex) / 2;
        const midY = (sy + ey) / 2;

        let pathD = '';
        if (!isHorizontal) {
          pathD = `M ${sx} ${sy} C ${sx} ${midY}, ${ex} ${midY}, ${ex} ${ey}`;
        } else {
          pathD = `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ey}, ${ex} ${ey}`;
        }

        const strokeDash = edge.type === 'dotted' ? 'stroke-dasharray="4 4"' : '';
        const strokeWidth = edge.type === 'thick' ? '2.5' : '1.8';
        const markerEnd = edge.type !== 'open' ? 'marker-end="url(#arrowhead-cyan)"' : '';

        // Edge label pill
        let labelHtml = '';
        if (edge.label) {
          const textLen = edge.label.length;
          const lw = textLen * 7 + 16;
          const lh = 18;
          labelHtml =
            `<g class="aetheris-edge-label">` +
            `<rect x="${midX - lw / 2}" y="${midY - lh / 2}" width="${lw}" height="${lh}" rx="9" fill="#0f172a" stroke="rgba(255,255,255,0.15)" stroke-width="1" />` +
            `<text x="${midX}" y="${midY + 4}" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif" font-weight="500">${this.escapeHtml(edge.label)}</text>` +
            `</g>`;
        }

        return (
          `<g class="aetheris-edge">` +
          `<path d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="${strokeWidth}" ${strokeDash} ${markerEnd} class="transition-all duration-200" />` +
          labelHtml +
          `</g>`
        );
      })
      .join('\n');

    // 6. Render Nodes
    const renderedNodes = nodes
      .map((node) => {
        const x = node.x!;
        const y = node.y!;
        const w = node.width!;
        const h = node.height!;
        const cx = x + w / 2;
        const cy = y + h / 2;

        let shapeSvg = '';

        if (node.shape === 'rounded') {
          shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" class="node-shape" />`;
        } else if (node.shape === 'stadium') {
          shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" class="node-shape" />`;
        } else if (node.shape === 'circle') {
          shapeSvg = `<circle cx="${cx}" cy="${cy}" r="${w / 2}" class="node-shape" />`;
        } else if (node.shape === 'decision') {
          shapeSvg = `<polygon points="${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}" class="node-shape" />`;
        } else if (node.shape === 'database') {
          // Database cylinder
          const topH = 10;
          shapeSvg =
            `<path d="M ${x} ${y + topH} A ${w / 2} ${topH} 0 0 1 ${x + w} ${y + topH} V ${y + h - topH} A ${w / 2} ${topH} 0 0 1 ${x} ${y + h - topH} Z" class="node-shape" />` +
            `<ellipse cx="${cx}" cy="${y + topH}" rx="${w / 2}" ry="${topH}" class="node-shape" />`;
        } else {
          // Default rect
          shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="node-shape" />`;
        }

        return (
          `<g class="aetheris-flow-node group cursor-pointer" data-node-id="${node.id}">` +
          shapeSvg +
          `<text x="${cx}" y="${cy + 4}" text-anchor="middle" class="node-label font-sans font-medium text-xs select-none">${this.escapeHtml(node.label)}</text>` +
          `</g>`
        );
      })
      .join('\n');

    // 7. Full Responsive SVG
    return (
      `<div class="aetheris-mermaid-container my-4 rounded-xl overflow-hidden border border-white/10 bg-surface-base/90 p-3 sm:p-4 shadow-xl">` +
      `<div class="mermaid-diagram-toolbar flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[11px] font-mono text-slate-400 select-none">` +
      `<div class="flex items-center space-x-2">` +
      `<span class="w-2 h-2 rounded-full bg-cyan-400 inline-block animate-pulse"></span>` +
      `<span class="font-bold tracking-wider uppercase text-cyan-300">Mermaid Architecture Flowchart</span>` +
      `</div>` +
      `<span class="text-slate-500">${nodes.length} Nodes · ${edges.length} Relays</span>` +
      `</div>` +
      `<div class="w-full overflow-x-auto flex justify-center py-2">` +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" style="max-width: ${totalWidth}px; min-width: 280px; height: auto;" class="aetheris-mermaid-svg select-none">` +
      `<defs>` +
      `<marker id="arrowhead-cyan" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">` +
      `<polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />` +
      `</marker>` +
      `<linearGradient id="cyanNodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">` +
      `<stop offset="0%" stop-color="#0f172a" />` +
      `<stop offset="100%" stop-color="#1e293b" />` +
      `</linearGradient>` +
      `<filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">` +
      `<feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#06b6d4" flood-opacity="0.15" />` +
      `</filter>` +
      `</defs>` +
      `<style>` +
      `.aetheris-mermaid-svg .node-shape { fill: url(#cyanNodeGrad); stroke: #06b6d4; stroke-width: 1.6; filter: url(#nodeGlow); transition: all 0.2s ease; }` +
      `.aetheris-mermaid-svg .aetheris-flow-node:hover .node-shape { stroke: #22d3ee; stroke-width: 2.2; fill: #1e293b; }` +
      `.aetheris-mermaid-svg .node-label { fill: #f8fafc; font-size: 12px; font-weight: 600; font-family: system-ui, -apple-system, sans-serif; }` +
      `.aetheris-mermaid-svg .aetheris-edge:hover path { stroke: #22d3ee; stroke-width: 2.6; }` +
      `</style>` +
      renderedSubgraphs +
      renderedEdges +
      renderedNodes +
      `</svg>` +
      `</div>` +
      `</div>`
    );
  }

  // ─── Sequence Diagram SVG Generator ───────────────────────────────────────

  public renderSequenceDiagramSvg(diagram: MermaidDiagram): string {
    const { participants, messages, notes } = diagram;

    if (participants.length === 0) {
      return this.renderFallbackHtml('Empty sequence diagram: No participants defined', '');
    }

    const paddingX = 60;
    const paddingY = 40;
    const participantSpacing = 160;
    const messageHeight = 46;

    const totalWidth = Math.max(480, paddingX * 2 + (participants.length - 1) * participantSpacing);
    const totalHeight = paddingY * 2 + 70 + (messages.length + notes.length) * messageHeight + 60;

    // Calculate participant coordinates
    participants.forEach((p, idx) => {
      p.x = paddingX + idx * participantSpacing;
    });

    const participantLookup = new Map<string, SequenceParticipant>(participants.map((p) => [p.id, p]));

    // Lifelines: vertical dashed line for each participant
    const topY = paddingY + 36;
    const bottomY = totalHeight - paddingY - 36;

    const renderedLifelines = participants
      .map((p) => {
        return `<line x1="${p.x}" y1="${topY}" x2="${p.x}" y2="${bottomY}" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" stroke-dasharray="6 4" />`;
      })
      .join('\n');

    // Messages & Notes
    let curY = topY + 32;
    const renderedEvents: string[] = [];

    for (const msg of messages) {
      const src = participantLookup.get(msg.from);
      const dst = participantLookup.get(msg.to);
      if (!src || !dst) continue;

      const sx = src.x!;
      const ex = dst.x!;
      const isSelf = msg.from === msg.to;
      const strokeDash = msg.arrowType === 'dotted' ? 'stroke-dasharray="4 4"' : '';
      const markerEnd = msg.arrowType !== 'open' ? 'marker-end="url(#arrowhead-indigo)"' : '';

      if (isSelf) {
        // Self loop
        const loopW = 34;
        const loopH = 24;
        const d = `M ${sx} ${curY} H ${sx + loopW} V ${curY + loopH} H ${sx}`;
        renderedEvents.push(
          `<g class="aetheris-seq-message">` +
          `<path d="${d}" fill="none" stroke="#818cf8" stroke-width="1.8" ${strokeDash} ${markerEnd} />` +
          `<text x="${sx + loopW + 6}" y="${curY + loopH / 2 + 4}" fill="#e2e8f0" font-size="11" font-family="system-ui, sans-serif">${this.escapeHtml(msg.text)}</text>` +
          `</g>`
        );
        curY += loopH + 20;
      } else {
        const midX = (sx + ex) / 2;
        renderedEvents.push(
          `<g class="aetheris-seq-message">` +
          `<line x1="${sx}" y1="${curY}" x2="${ex}" y2="${curY}" stroke="#818cf8" stroke-width="1.8" ${strokeDash} ${markerEnd} />` +
          `<text x="${midX}" y="${curY - 6}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-family="system-ui, sans-serif">${this.escapeHtml(msg.text)}</text>` +
          `</g>`
        );
        curY += messageHeight;
      }
    }

    // Render Participant Top and Bottom boxes
    const renderedBoxes = participants
      .map((p) => {
        const bw = 110;
        const bh = 34;
        const bx = p.x! - bw / 2;

        const box = (yPos: number) =>
          `<g class="aetheris-seq-participant">` +
          `<rect x="${bx}" y="${yPos}" width="${bw}" height="${bh}" rx="8" fill="#1e1b4b" stroke="#6366f1" stroke-width="1.6" filter="url(#seqGlow)" />` +
          `<text x="${p.x}" y="${yPos + 21}" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="system-ui, sans-serif" font-weight="600">${this.escapeHtml(p.label)}</text>` +
          `</g>`;

        return box(paddingY) + '\n' + box(bottomY);
      })
      .join('\n');

    return (
      `<div class="aetheris-mermaid-container my-4 rounded-xl overflow-hidden border border-white/10 bg-surface-base/90 p-3 sm:p-4 shadow-xl">` +
      `<div class="mermaid-diagram-toolbar flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[11px] font-mono text-slate-400 select-none">` +
      `<div class="flex items-center space-x-2">` +
      `<span class="w-2 h-2 rounded-full bg-indigo-400 inline-block animate-pulse"></span>` +
      `<span class="font-bold tracking-wider uppercase text-indigo-300">Mermaid Sequence Diagram</span>` +
      `</div>` +
      `<span class="text-slate-500">${participants.length} Actors · ${messages.length} Messages</span>` +
      `</div>` +
      `<div class="w-full overflow-x-auto flex justify-center py-2">` +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" style="max-width: ${totalWidth}px; min-width: 320px; height: auto;" class="aetheris-mermaid-svg select-none">` +
      `<defs>` +
      `<marker id="arrowhead-indigo" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">` +
      `<polygon points="0 0, 8 3, 0 6" fill="#818cf8" />` +
      `</marker>` +
      `<filter id="seqGlow" x="-20%" y="-20%" width="140%" height="140%">` +
      `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#6366f1" flood-opacity="0.2" />` +
      `</filter>` +
      `</defs>` +
      renderedLifelines +
      renderedBoxes +
      renderedEvents.join('\n') +
      `</svg>` +
      `</div>` +
      `</div>`
    );
  }

  // ─── Fallback Renderer for Malformed Diagrams ──────────────────────────────

  public renderFallbackHtml(errorMsg: string, rawCode: string): string {
    return (
      `<div class="aetheris-mermaid-fallback my-3 p-4 rounded-xl bg-surface-base border border-amber-500/30 text-xs shadow-md">` +
      `<div class="flex items-center space-x-2 text-amber-400 mb-2 font-bold select-none">` +
      `<span class="text-base">⚠️</span>` +
      `<span>Mermaid Diagram Syntax Warning</span>` +
      `</div>` +
      `<p class="text-slate-400 mb-2 leading-relaxed">${this.escapeHtml(errorMsg)}</p>` +
      (rawCode
        ? `<pre class="p-2.5 rounded-lg bg-surface-overlay border border-white/5 text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed"><code>${this.escapeHtml(rawCode)}</code></pre>`
        : '') +
      `</div>`
    );
  }

  // ─── Unified Mermaid Render Entry Point ───────────────────────────────────

  public renderMermaid(code: string): string {
    try {
      const diagram = this.parseMermaid(code);
      if (diagram.error) {
        return this.renderFallbackHtml(diagram.error, code);
      }
      if (diagram.type === 'sequence') {
        return this.renderSequenceDiagramSvg(diagram);
      }
      if (diagram.type === 'flowchart') {
        return this.renderFlowchartSvg(diagram);
      }
      return this.renderFallbackHtml('Unknown diagram type', code);
    } catch (err) {
      return this.renderFallbackHtml(
        `Failed to parse diagram: ${err instanceof Error ? err.message : String(err)}`,
        code
      );
    }
  }

  // ─── Rich Content Processor (Seamless Markdown Pipeline) ──────────────────

  /**
   * Processes a markdown string, replacing mathematical expressions and mermaid blocks
   * with richly rendered HTML/SVG elements while preserving all other markdown formatting.
   */
  public renderRichContent(content: string): string {
    if (!content || typeof content !== 'string') return '';

    // Step 1: Render Mermaid code blocks ```mermaid ... ```
    let out = content.replace(/```mermaid\s*\n([\s\S]*?)```/gi, (_match, code) => {
      return this.renderMermaid(code);
    });

    // Step 2: Render Block Math $$ ... $$
    out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_match, math) => {
      return this.renderBlockMath(math);
    });

    // Step 3: Render Inline Math $ ... $
    // Take care not to match plain dollar currency (e.g. $100 or $50.00)
    out = out.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (match, math) => {
      // Check if it's purely a currency number
      if (/^\s*\d+(?:\.\d{1,2})?\s*$/.test(math)) {
        return match;
      }
      // Check if it's empty
      if (!math.trim()) {
        return match;
      }
      return this.renderInlineMath(math);
    });

    return out;
  }
}

// ── Export Singleton and Register in Service Registry ────────────────────────
export const diagramRenderer = new DiagramRenderer();
serviceRegistry.registerInstance(SERVICES.DiagramRenderer, diagramRenderer);
