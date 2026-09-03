/**
 * Aetheris Omni-Sphere — Interactive Slide Deck & Course Presentation Engine
 * (slide-deck.ts)
 *
 * 100% Self-Contained, Strict TypeScript, Zero External Dependencies.
 * Transforms multi-part course posts, research papers, and technical series
 * into full-screen, Keynote/reveal.js-grade interactive slide presentations.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';

// ============================================================================
// 1. Interfaces & Types
// ============================================================================

export interface Slide {
  index: number;
  title: string;
  content: string;
  code?: string;
  codeLanguage?: string;
  notes?: string;
}

export type SlideTheme = 'obsidian' | 'cyphr' | 'aether' | 'matrix' | 'crimson';

export interface SlideDeckConfig {
  theme: SlideTheme;
  fontSizeMultiplier: number;
  autoplayDelaySec: number;
  showNotes: boolean;
  showThumbnails: boolean;
  showTimer: boolean;
  showProgressBar: boolean;
  transitionEffect: 'fade' | 'slide' | 'zoom';
}

export interface SlideDeckStats {
  totalSlides: number;
  currentIndex: number;
  progressPercent: number;
  timeElapsedFormatted: string;
  elapsedSeconds: number;
  estimatedTotalTimeMinutes: number;
  hasCodeBlocks: number;
  hasSpeakerNotes: number;
  wordCount: number;
}

export interface SlideDeckPostMeta {
  postId: string;
  title: string;
  author: string;
  authorRole?: string;
  channelId?: string;
  seriesName?: string;
  courseTag?: string;
}

// ============================================================================
// 2. Self-Contained Syntax Highlighter & Tokenizer (Zero External Deps)
// ============================================================================

interface LanguageDef {
  keywords: RegExp;
  builtins?: RegExp;
  types?: RegExp;
  strings: RegExp;
  comments: RegExp;
  numbers: RegExp;
  operators?: RegExp;
}

const SYNTAX_LANGUAGES: Record<string, LanguageDef> = {
  typescript: {
    keywords: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|delete|typeof|instanceof|void|this|super|class|extends|import|export|default|from|async|await|try|catch|finally|throw|of|in|yield|static|get|set|type|interface|enum|namespace|declare|abstract|implements|readonly|keyof|infer|never|unknown|any|as|satisfies|override|is)\b/g,
    builtins: /\b(console|Math|JSON|Object|Array|String|Number|Boolean|Promise|Error|Map|Set|Symbol|Proxy|Reflect|Date|RegExp|setTimeout|setInterval|fetch|window|document)\b/g,
    types: /\b(string|number|boolean|symbol|bigint|void|undefined|null|Record|Partial|Required|Readonly|Pick|Omit|Exclude|Extract|NonNullable|ReturnType|InstanceType)\b/g,
    strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    numbers: /\b(\d+\.?\d*(?:[eE][+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+)\b/g,
    operators: /(=>|===|!==|==|!=|<=|>=|\+\+|--|&&|\|\||[+\-*\/%=<>!&|^~?:])/g,
  },
  javascript: {
    keywords: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|delete|typeof|instanceof|void|this|super|class|extends|import|export|default|from|async|await|try|catch|finally|throw|of|in|yield|static|get|set|null|undefined|true|false)\b/g,
    builtins: /\b(console|Math|JSON|Object|Array|String|Number|Boolean|Promise|Error|Map|Set|Symbol|Proxy|Reflect|Date|RegExp|setTimeout|setInterval|fetch|window|document)\b/g,
    strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    numbers: /\b(\d+\.?\d*(?:[eE][+-]?\d+)?|0x[0-9a-fA-F]+)\b/g,
    operators: /(=>|===|!==|==|!=|<=|>=|\+\+|--|&&|\|\||[+\-*\/%=<>!&|^~?:])/g,
  },
  rust: {
    keywords: /\b(fn|let|mut|pub|struct|enum|impl|trait|where|for|in|match|if|else|loop|while|return|break|continue|async|await|move|ref|unsafe|type|const|static|use|mod|crate|super|self|Self|true|false)\b/g,
    types: /\b(i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Vec|Option|Some|None|Result|Ok|Err|Box|Rc|Arc|Cell|RefCell|HashMap|HashSet)\b/g,
    builtins: /\b(println|eprintln|format|vec|panic|assert|assert_eq|todo|unimplemented)\b/g,
    strings: /(r#"[^"]*"#|b?"(?:[^"\\]|\\.)*")/g,
    comments: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    numbers: /\b(\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?(?:[uif]\d+)?|0x[0-9a-fA-F_]+|0b[01_]+)\b/g,
    operators: /(->|=>|::|<=|>=|==|!=|&&|\|\||[+\-*\/%=<>!&|^~?:])/g,
  },
  python: {
    keywords: /\b(def|class|return|if|elif|else|for|while|try|except|finally|raise|import|from|as|with|lambda|yield|async|await|pass|break|continue|global|nonlocal|assert|del|in|is|not|and|or|True|False|None)\b/g,
    builtins: /\b(print|len|range|enumerate|zip|map|filter|list|dict|set|tuple|int|float|str|bool|open|super|isinstance|issubclass|type|id|min|max|sum|sorted|reversed|any|all)\b/g,
    strings: /(?:[brufBRUF]{0,2})("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
    comments: /(#[^\n]*)/g,
    numbers: /\b(\d+\.?\d*(?:[eE][+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+)\b/g,
    operators: /(->|==|!=|<=|>=|:=|\*\*|\/\/|[+\-*\/%=<>!&|^~])/g,
  },
  solidity: {
    keywords: /\b(pragma|solidity|contract|interface|library|is|function|returns|public|private|internal|external|pure|view|payable|modifier|event|emit|struct|enum|mapping|memory|storage|calldata|override|virtual|constructor|assembly|if|else|for|while|do|return|break|continue|try|catch|revert|require|assert|new|delete)\b/g,
    types: /\b(address|bool|string|bytes|bytes\d+|uint|uint8|uint16|uint32|uint64|uint128|uint256|int|int8|int16|int32|int64|int128|int256)\b/g,
    builtins: /\b(msg|tx|block|now|abi|keccak256|sha256|ripemd160|ecrecover|selfdestruct|type|this)\b/g,
    strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    numbers: /\b(\d+\.?\d*(?:[eE][+-]?\d+)?|0x[0-9a-fA-F]+)\b/g,
    operators: /(=>|===|!==|==|!=|<=|>=|\+\+|--|&&|\|\||[+\-*\/%=<>!&|^~?:])/g,
  },
  json: {
    keywords: /\b(true|false|null)\b/g,
    strings: /("(?:[^"\\]|\\.)*")(?=\s*:)?/g,
    comments: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    numbers: /\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,
    operators: /([:{}\[\],])/g,
  },
  bash: {
    keywords: /\b(if|then|else|elif|fi|case|esac|for|while|until|do|done|in|function|select|time|return|exit)\b/g,
    builtins: /\b(echo|cd|pwd|ls|cat|grep|sed|awk|curl|wget|tar|chmod|chown|mkdir|rm|cp|mv|find|kill|ps|sudo|export|source|alias|git|cargo|npm|pnpm|yarn|docker|node)\b/g,
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(#[^\n]*)/g,
    numbers: /\b(\d+)\b/g,
    operators: /(\|{1,2}|&&|>>|>|<|;;|[=;])/g,
  },
};

// Aliases
SYNTAX_LANGUAGES['ts'] = SYNTAX_LANGUAGES['typescript'];
SYNTAX_LANGUAGES['js'] = SYNTAX_LANGUAGES['javascript'];
SYNTAX_LANGUAGES['rs'] = SYNTAX_LANGUAGES['rust'];
SYNTAX_LANGUAGES['py'] = SYNTAX_LANGUAGES['python'];
SYNTAX_LANGUAGES['sol'] = SYNTAX_LANGUAGES['solidity'];
SYNTAX_LANGUAGES['sh'] = SYNTAX_LANGUAGES['bash'];
SYNTAX_LANGUAGES['shell'] = SYNTAX_LANGUAGES['bash'];
SYNTAX_LANGUAGES['zsh'] = SYNTAX_LANGUAGES['bash'];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function highlightSyntax(code: string, langName: string = 'typescript'): string {
  const langKey = langName.toLowerCase().trim();
  const lang = SYNTAX_LANGUAGES[langKey] || SYNTAX_LANGUAGES['typescript'];

  // Placeholder map to protect already highlighted or complex tokens
  const placeholders: Map<string, string> = new Map();
  let phCounter = 0;
  function makePlaceholder(html: string): string {
    const key = `__SLIDETOKEN_${phCounter++}__`;
    placeholders.set(key, html);
    return key;
  }

  let processed = code;

  // 1. Comments first (highest priority)
  processed = processed.replace(lang.comments, (match) => {
    return makePlaceholder(`<span class="text-slate-500 italic font-mono">${escapeHtml(match)}</span>`);
  });

  // 2. Strings
  processed = processed.replace(lang.strings, (match) => {
    return makePlaceholder(`<span class="text-signal font-mono">${escapeHtml(match)}</span>`);
  });

  // 3. Keywords
  processed = processed.replace(lang.keywords, (match) => {
    return makePlaceholder(`<span class="text-aether font-semibold font-mono">${escapeHtml(match)}</span>`);
  });

  // 4. Types
  if (lang.types) {
    processed = processed.replace(lang.types, (match) => {
      return makePlaceholder(`<span class="text-amber font-mono font-medium">${escapeHtml(match)}</span>`);
    });
  }

  // 5. Builtins
  if (lang.builtins) {
    processed = processed.replace(lang.builtins, (match) => {
      return makePlaceholder(`<span class="text-cyphr font-mono">${escapeHtml(match)}</span>`);
    });
  }

  // 6. Numbers
  processed = processed.replace(lang.numbers, (match) => {
    return makePlaceholder(`<span class="text-crimson font-mono">${escapeHtml(match)}</span>`);
  });

  // 7. Escape remaining raw text
  processed = escapeHtml(processed);

  // 8. Restore tokens
  for (const [key, replacement] of placeholders) {
    processed = processed.replace(new RegExp(key, 'g'), replacement);
  }

  return processed;
}

// ============================================================================
// 3. Rich Markdown Slide Content Formatter
// ============================================================================

export function renderSlideMarkdown(markdown: string): string {
  if (!markdown || !markdown.trim()) {
    return '<p class="text-slate-400 italic">No additional content for this slide.</p>';
  }

  const lines = markdown.split('\n');
  const htmlParts: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let inTable: boolean = false;
  let tableRows: string[] = [];

  const closeList = () => {
    if (inList === 'ul') {
      htmlParts.push('</ul>');
      inList = null;
    } else if (inList === 'ol') {
      htmlParts.push('</ol>');
      inList = null;
    }
  };

  const closeTable = () => {
    if (inTable) {
      if (tableRows.length > 0) {
        let tableHtml = '<div class="overflow-x-auto my-4 rounded-xl border border-white/10 bg-surface-raised/60 shadow-lg"><table class="w-full text-left text-base border-collapse">';
        tableRows.forEach((rowStr, idx) => {
          const cells = rowStr.split('|').map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
          if (idx === 0) {
            tableHtml += '<thead class="bg-surface-overlay/80 text-cyphr font-mono text-sm tracking-wider uppercase border-b border-white/10"><tr>';
            cells.forEach((cell) => {
              tableHtml += `<th class="py-3 px-4">${renderInlineFormatting(cell)}</th>`;
            });
            tableHtml += '</tr></thead><tbody>';
          } else if (idx === 1 && rowStr.includes('---')) {
            // Divider row, skip
          } else {
            tableHtml += '<tr class="border-b border-white/5 hover:bg-white/[0.03] transition-colors">';
            cells.forEach((cell) => {
              tableHtml += `<td class="py-3 px-4 text-slate-200">${renderInlineFormatting(cell)}</td>`;
            });
            tableHtml += '</tr>';
          }
        });
        tableHtml += '</tbody></table></div>';
        htmlParts.push(tableHtml);
      }
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Table rows
    if (line.startsWith('|') && line.endsWith('|')) {
      closeList();
      inTable = true;
      tableRows.push(line);
      continue;
    } else if (inTable) {
      closeTable();
    }

    // Callout cards / Alerts
    if (line.startsWith('> [!') || line.startsWith('>')) {
      closeList();
      let alertType = 'note';
      let alertContent = line.replace(/^>\s*/, '');

      const calloutMatch = alertContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|OBSIDIAN|ZK)\]/i);
      if (calloutMatch) {
        alertType = calloutMatch[1].toLowerCase();
        alertContent = alertContent.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|OBSIDIAN|ZK)\]\s*/i, '');
      }

      let alertIcon = '💡';
      let alertBorder = 'border-cyphr/40';
      let alertBg = 'bg-cyphr/10';
      let alertText = 'text-cyphr';
      let alertTitle = 'IMPORTANT NOTE';

      if (alertType === 'tip') {
        alertIcon = '⚡';
        alertBorder = 'border-signal/40';
        alertBg = 'bg-signal/10';
        alertText = 'text-signal';
        alertTitle = 'PRO TIP & PRACTICE';
      } else if (alertType === 'important' || alertType === 'obsidian') {
        alertIcon = '🔮';
        alertBorder = 'border-aether/40';
        alertBg = 'bg-aether/10';
        alertText = 'text-aether';
        alertTitle = 'AETHERIS INSIGHT';
      } else if (alertType === 'warning') {
        alertIcon = '⚠️';
        alertBorder = 'border-amber/40';
        alertBg = 'bg-amber/10';
        alertText = 'text-amber';
        alertTitle = 'WARNING / CAUTION';
      } else if (alertType === 'caution') {
        alertIcon = '🚨';
        alertBorder = 'border-crimson/40';
        alertBg = 'bg-crimson/10';
        alertText = 'text-crimson';
        alertTitle = 'CRITICAL / RISK';
      } else if (alertType === 'zk') {
        alertIcon = '🛡️';
        alertBorder = 'border-cyphr/60';
        alertBg = 'bg-cyphr/15';
        alertText = 'text-cyphr';
        alertTitle = 'ZERO-KNOWLEDGE VERIFIED';
      }

      htmlParts.push(`
        <div class="my-4 p-4 rounded-xl border ${alertBorder} ${alertBg} backdrop-blur-sm shadow-md transition-all">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-lg">${alertIcon}</span>
            <span class="text-xs font-mono font-bold tracking-widest uppercase ${alertText}">${alertTitle}</span>
          </div>
          <div class="text-slate-200 text-base md:text-lg pl-7 leading-relaxed font-sans">
            ${renderInlineFormatting(alertContent)}
          </div>
        </div>
      `);
      continue;
    }

    // Unordered lists
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      if (inList !== 'ul') {
        closeList();
        inList = 'ul';
        htmlParts.push('<ul class="my-4 space-y-3 pl-1">');
      }
      const itemContent = line.replace(/^[-*•]\s+/, '');
      htmlParts.push(`
        <li class="flex items-start gap-3 text-slate-100 text-lg md:text-xl leading-relaxed">
          <span class="text-cyphr text-xl font-bold select-none leading-none mt-1 shrink-0 animate-pulse">✦</span>
          <div class="flex-1">${renderInlineFormatting(itemContent)}</div>
        </li>
      `);
      continue;
    }

    // Ordered lists
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (inList !== 'ol') {
        closeList();
        inList = 'ol';
        htmlParts.push('<ol class="my-4 space-y-3 pl-1">');
      }
      const itemNum = numMatch[1];
      const itemContent = numMatch[2];
      htmlParts.push(`
        <li class="flex items-start gap-3 text-slate-100 text-lg md:text-xl leading-relaxed">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-surface-overlay text-cyphr border border-cyphr/30 font-mono text-sm font-bold shrink-0 mt-0.5 shadow-sm">${itemNum}</span>
          <div class="flex-1">${renderInlineFormatting(itemContent)}</div>
        </li>
      `);
      continue;
    }

    // Empty lines
    if (!line) {
      closeList();
      continue;
    }

    // Headings (H2 / H3 / H4 within slide)
    if (line.startsWith('#### ')) {
      closeList();
      htmlParts.push(`<h4 class="text-lg md:text-xl font-bold text-slate-300 font-sans tracking-wide mt-4 mb-2 flex items-center gap-2"><span class="w-1.5 h-4 rounded-full bg-aether"></span>${renderInlineFormatting(line.slice(5))}</h4>`);
      continue;
    }
    if (line.startsWith('### ')) {
      closeList();
      htmlParts.push(`<h3 class="text-xl md:text-2xl font-bold text-cyphr font-sans tracking-wide mt-5 mb-2.5 flex items-center gap-2"><span class="w-2 h-5 rounded-full bg-cyphr"></span>${renderInlineFormatting(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closeList();
      htmlParts.push(`<h2 class="text-2xl md:text-3xl font-extrabold text-white font-sans tracking-wide mt-6 mb-3 flex items-center gap-2.5"><span class="w-2.5 h-6 rounded-full bg-gradient-to-b from-cyphr to-aether"></span>${renderInlineFormatting(line.slice(3))}</h2>`);
      continue;
    }

    // Standard Paragraph
    closeList();
    htmlParts.push(`
      <p class="my-3 text-slate-200 text-lg md:text-xl leading-relaxed font-sans font-normal tracking-normal">
        ${renderInlineFormatting(line)}
      </p>
    `);
  }

  closeList();
  closeTable();

  return htmlParts.join('\n');
}

function renderInlineFormatting(text: string): string {
  let res = escapeHtml(text);

  // Bold: **text** or __text__
  res = res.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white tracking-wide bg-white/5 px-1 py-0.5 rounded">$1</strong>');
  res = res.replace(/__(.*?)__/g, '<strong class="font-bold text-white tracking-wide bg-white/5 px-1 py-0.5 rounded">$1</strong>');

  // Italic: *text* or _text_
  res = res.replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>');
  res = res.replace(/_([^_]+)_/g, '<em class="italic text-slate-300">$1</em>');

  // Strikethrough: ~~text~~
  res = res.replace(/~~(.*?)~~/g, '<del class="line-through text-slate-500">$1</del>');

  // Inline code: `code`
  res = res.replace(/`([^`]+)`/g, '<code class="px-2 py-0.5 rounded bg-surface-overlay text-cyphr font-mono text-base border border-white/10 shadow-inner font-semibold">$1</code>');

  // Obsidian / Cyphr tags: #hashtag
  res = res.replace(/(^|\s)#([a-zA-Z0-9_\-]+)/g, '$1<span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-aether/20 text-aether border border-aether/30">#$2</span>');

  return res;
}

// ============================================================================
// 4. SlideDeckManager Core Engine
// ============================================================================

export class SlideDeckManager {
  /** Array of parsed slides ready for presentation */
  public slides: Slide[] = [];

  /** Active slide index (0-indexed) */
  public currentIndex: number = 0;

  /** Flag representing active full-screen presentation mode */
  public isPresenting: boolean = false;

  /** Metadata of current post / deck */
  public currentPostMeta: SlideDeckPostMeta = {
    postId: 'deck-001',
    title: 'Aetheris Course Slide Deck',
    author: 'Omni-Sphere System',
    authorRole: 'Core Architect',
  };

  /** Configuration settings */
  public config: SlideDeckConfig = {
    theme: 'obsidian',
    fontSizeMultiplier: 1.0,
    autoplayDelaySec: 6,
    showNotes: false,
    showThumbnails: true,
    showTimer: true,
    showProgressBar: true,
    transitionEffect: 'slide',
  };

  /** Live presentation stopwatch counter */
  public presentationStartTime: number | null = null;
  public presentationElapsedSec: number = 0;
  private timerIntervalId: number | null = null;

  /** Autoplay loop interval */
  public isAutoplayRunning: boolean = false;
  private autoplayIntervalId: number | null = null;

  /** Blackout screen toggle for speaker focus */
  public isBlackoutActive: boolean = false;

  /** DOM Element identifier */
  public readonly MODAL_DOM_ID: string = 'aetheris-slide-deck-modal-stage';

  /** Reference for bound event listeners to ensure clean teardown */
  private boundKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.slideDeckManager = this;
    }
  }

  // --------------------------------------------------------------------------
  // Content Parsing Engine
  // --------------------------------------------------------------------------

  /**
   * Intelligently parses markdown post content into an array of interactive Slide objects.
   * Splits slides by:
   * 1. Explicit slide dividers: `---` or `***` or `===`
   * 2. Markdown Headings: `# Heading`, `## Heading`, `### Heading` (when no dividers exist)
   * Extracts code blocks (```lang ... ```) and speaker notes (<!-- note: ... --> or Note: ...).
   */
  public parsePostAsSlides(content: string, fallbackTitle?: string): Slide[] {
    if (!content || !content.trim()) {
      return [
        {
          index: 0,
          title: fallbackTitle || 'Aetheris Presentation',
          content: 'No content provided for slide generation.',
          notes: 'This slide was automatically generated as a placeholder.',
        },
      ];
    }

    const cleanRaw = content.replace(/\r\n/g, '\n').trim();

    // Determine if content uses explicit horizontal rules '---' or '***'
    const hrDividerRegex = /(?:^|\n)\s*(?:---|---|\*\*\*|===)\s*(?:\n|$)/;
    let rawSections: string[] = [];

    if (hrDividerRegex.test(cleanRaw)) {
      rawSections = cleanRaw.split(hrDividerRegex).map((s) => s.trim()).filter((s) => s.length > 0);
    } else {
      // Fallback to dividing by main headings (# or ## or ###)
      const headingSplitRegex = /(?:^|\n)(?=(?:#|##|###)\s+)/;
      rawSections = cleanRaw.split(headingSplitRegex).map((s) => s.trim()).filter((s) => s.length > 0);

      // If still single block, check if it is very long and has double newlines
      if (rawSections.length <= 1 && cleanRaw.length > 1200) {
        const paragraphBlocks = cleanRaw.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
        if (paragraphBlocks.length >= 3) {
          rawSections = [];
          for (let i = 0; i < paragraphBlocks.length; i += 2) {
            rawSections.push(paragraphBlocks.slice(i, i + 2).join('\n\n'));
          }
        }
      }
    }

    if (rawSections.length === 0) {
      rawSections = [cleanRaw];
    }

    const parsedSlides: Slide[] = [];

    for (let i = 0; i < rawSections.length; i++) {
      const sectionText = rawSections[i];
      const parsed = this.parseSingleSlideSection(sectionText, i, fallbackTitle);
      parsedSlides.push(parsed);
    }

    return parsedSlides;
  }

  private parseSingleSlideSection(section: string, index: number, fallbackTitle?: string): Slide {
    let text = section.trim();
    let extractedTitle = '';
    let extractedCode = '';
    let extractedCodeLang = 'typescript';
    let extractedNotes = '';

    // 1. Extract speaker notes: <!-- note: ... --> or Note: ...
    const commentNoteMatch = text.match(/<!--\s*(?:note|notes|speaker\s*notes?):\s*([\s\S]*?)-->/i);
    if (commentNoteMatch) {
      extractedNotes = commentNoteMatch[1].trim();
      text = text.replace(commentNoteMatch[0], '').trim();
    } else {
      const lineNoteMatch = text.match(/(?:^|\n)(?:Note|Speaker Note|Author note|Author Note):\s*([^\n]+(?:\n[^\n#\-*`].*)*)/i);
      if (lineNoteMatch) {
        extractedNotes = lineNoteMatch[1].trim();
        text = text.replace(lineNoteMatch[0], '').trim();
      }
    }

    // 2. Extract code blocks: ```lang\ncode\n```
    const codeBlockMatch = text.match(/```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      extractedCodeLang = codeBlockMatch[1].trim() || 'typescript';
      extractedCode = codeBlockMatch[2].replace(/\n+$/, '');
      text = text.replace(codeBlockMatch[0], '').trim();
    }

    // 3. Extract Slide Title
    const lines = text.split('\n');
    const contentLines: string[] = [];

    for (let l = 0; l < lines.length; l++) {
      const currentLine = lines[l].trim();
      if (!extractedTitle && /^#{1,3}\s+/.test(currentLine)) {
        extractedTitle = currentLine.replace(/^#{1,3}\s+/, '').trim();
      } else if (!extractedTitle && /^\*\*([^*]+)\*\*$/.test(currentLine)) {
        extractedTitle = currentLine.replace(/^\*\*|\*\*$/g, '').trim();
      } else {
        contentLines.push(lines[l]);
      }
    }

    const remainingContent = contentLines.join('\n').trim();

    // If still no title, derive logical title from index or context
    if (!extractedTitle) {
      if (index === 0) {
        extractedTitle = fallbackTitle || 'Introduction & Overview';
      } else {
        extractedTitle = `Slide ${index + 1}: Architectural Synthesis`;
      }
    }

    // Clean title of any markdown artifacts
    extractedTitle = extractedTitle.replace(/^[0-9]+[.:\-]\s*/, '').trim();

    return {
      index,
      title: extractedTitle,
      content: remainingContent,
      code: extractedCode.length > 0 ? extractedCode : undefined,
      codeLanguage: extractedCode.length > 0 ? extractedCodeLang : undefined,
      notes: extractedNotes.length > 0 ? extractedNotes : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // Presentation Lifecycle & Control Methods
  // --------------------------------------------------------------------------

  /**
   * Initializes and opens the presentation deck with given post content.
   */
  public startPresentation(postId: string = 'post-default', content: string = '', title?: string, author?: string): void {
    this.currentPostMeta = {
      postId,
      title: title || 'Aetheris Course Slide Deck',
      author: author || 'Sovereign Author',
      authorRole: 'ZK Researcher',
    };

    if (content && content.trim().length > 0) {
      this.slides = this.parsePostAsSlides(content, this.currentPostMeta.title);
    } else if (this.slides.length === 0) {
      // Demo / Fallback curriculum deck if opened without direct text
      this.slides = this.getDemoCourseSlides();
    }

    this.currentIndex = 0;
    this.isPresenting = true;
    this.isBlackoutActive = false;

    this.startTimer();
    this.attachKeyboardShortcuts();
    this.mountModalToDom();
  }

  /**
   * Closes the presentation modal and cleans up active timers and events.
   */
  public exitPresentation(): void {
    this.isPresenting = false;
    this.stopAutoplay();
    this.stopTimer();
    this.detachKeyboardShortcuts();
    this.destroyModalFromDom();
  }

  /**
   * Navigates to the next slide with bounds checking.
   */
  public goNext(): void {
    if (this.currentIndex < this.slides.length - 1) {
      this.currentIndex++;
      this.updateModalDom();
    } else {
      // Loop or stop autoplay when reaching end
      if (this.isAutoplayRunning) {
        this.stopAutoplay();
      }
    }
  }

  /**
   * Navigates to the previous slide with bounds checking.
   */
  public goPrev(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateModalDom();
    }
  }

  /**
   * Directly jumps to a specific slide index.
   */
  public goToSlide(index: number): void {
    if (index >= 0 && index < this.slides.length) {
      this.currentIndex = index;
      this.updateModalDom();
    }
  }

  public firstSlide(): void {
    this.goToSlide(0);
  }

  public lastSlide(): void {
    this.goToSlide(this.slides.length - 1);
  }

  // --------------------------------------------------------------------------
  // Interactive Toggles & Configuration
  // --------------------------------------------------------------------------

  public toggleAutoplay(): void {
    if (this.isAutoplayRunning) {
      this.stopAutoplay();
    } else {
      this.startAutoplay();
    }
    this.updateModalDom();
  }

  public startAutoplay(): void {
    this.stopAutoplay();
    this.isAutoplayRunning = true;
    this.autoplayIntervalId = window.setInterval(() => {
      if (this.currentIndex < this.slides.length - 1) {
        this.goNext();
      } else {
        this.goToSlide(0);
      }
    }, this.config.autoplayDelaySec * 1000);
  }

  public stopAutoplay(): void {
    this.isAutoplayRunning = false;
    if (this.autoplayIntervalId !== null) {
      window.clearInterval(this.autoplayIntervalId);
      this.autoplayIntervalId = null;
    }
  }

  public toggleSpeakerNotes(): void {
    this.config.showNotes = !this.config.showNotes;
    this.updateModalDom();
  }

  public toggleThumbnails(): void {
    this.config.showThumbnails = !this.config.showThumbnails;
    this.updateModalDom();
  }

  public toggleBlackout(): void {
    this.isBlackoutActive = !this.isBlackoutActive;
    this.updateModalDom();
  }

  public setTheme(theme: SlideTheme): void {
    this.config.theme = theme;
    this.updateModalDom();
  }

  public increaseFontSize(): void {
    if (this.config.fontSizeMultiplier < 1.6) {
      this.config.fontSizeMultiplier = Number((this.config.fontSizeMultiplier + 0.1).toFixed(1));
      this.updateModalDom();
    }
  }

  public decreaseFontSize(): void {
    if (this.config.fontSizeMultiplier > 0.8) {
      this.config.fontSizeMultiplier = Number((this.config.fontSizeMultiplier - 0.1).toFixed(1));
      this.updateModalDom();
    }
  }

  public toggleFullscreen(): void {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      const elem = document.getElementById(this.MODAL_DOM_ID) || document.documentElement;
      elem.requestFullscreen().catch(() => {
        // Fallback for environments with strict permissions
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  // --------------------------------------------------------------------------
  // Presentation Timer
  // --------------------------------------------------------------------------

  public startTimer(): void {
    this.presentationStartTime = Date.now();
    this.presentationElapsedSec = 0;
    this.stopTimer();

    this.timerIntervalId = window.setInterval(() => {
      this.presentationElapsedSec++;
      this.updateTimerDisplayOnly();
    }, 1000);
  }

  public stopTimer(): void {
    if (this.timerIntervalId !== null) {
      window.clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }

  public resetTimer(): void {
    this.presentationElapsedSec = 0;
    this.presentationStartTime = Date.now();
    this.updateTimerDisplayOnly();
  }

  public formatTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const formattedMins = mins < 10 ? `0${mins}` : `${mins}`;
    const formattedSecs = secs < 10 ? `0${secs}` : `${secs}`;
    return `${formattedMins}:${formattedSecs}`;
  }

  private updateTimerDisplayOnly(): void {
    if (typeof document === 'undefined') return;
    const timerElem = document.getElementById('aetheris-slide-timer-value');
    if (timerElem) {
      timerElem.textContent = this.formatTime(this.presentationElapsedSec);
    }
  }

  // --------------------------------------------------------------------------
  // Keyboard Shortcuts Handler
  // --------------------------------------------------------------------------

  public attachKeyboardShortcuts(): void {
    if (typeof window === 'undefined') return;
    this.detachKeyboardShortcuts();

    this.boundKeyDownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    window.addEventListener('keydown', this.boundKeyDownHandler);
  }

  public detachKeyboardShortcuts(): void {
    if (typeof window === 'undefined' || !this.boundKeyDownHandler) return;
    window.removeEventListener('keydown', this.boundKeyDownHandler);
    this.boundKeyDownHandler = null;
  }

  public handleKeyDown(e: KeyboardEvent): void {
    if (!this.isPresenting) return;

    // Ignore keyboard shortcuts if focus is inside an active text input or textarea
    const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea') {
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
      case ' ':
      case 'PageDown':
      case 'l':
      case 'L':
      case 'j':
      case 'J':
        e.preventDefault();
        this.goNext();
        break;

      case 'ArrowLeft':
      case 'Backspace':
      case 'PageUp':
      case 'h':
      case 'H':
      case 'k':
      case 'K':
        e.preventDefault();
        this.goPrev();
        break;

      case 'Escape':
        e.preventDefault();
        this.exitPresentation();
        break;

      case 'Home':
        e.preventDefault();
        this.firstSlide();
        break;

      case 'End':
        e.preventDefault();
        this.lastSlide();
        break;

      case 'f':
      case 'F':
        e.preventDefault();
        this.toggleFullscreen();
        break;

      case 'n':
      case 'N':
        e.preventDefault();
        this.toggleSpeakerNotes();
        break;

      case 't':
      case 'T':
        e.preventDefault();
        this.toggleThumbnails();
        break;

      case 'p':
      case 'P':
      case 'a':
      case 'A':
        e.preventDefault();
        this.toggleAutoplay();
        break;

      case 'b':
      case 'B':
      case '.':
        e.preventDefault();
        this.toggleBlackout();
        break;
    }
  }

  // --------------------------------------------------------------------------
  // Metrics & Stats
  // --------------------------------------------------------------------------

  public getStats(): SlideDeckStats {
    const total = this.slides.length;
    const current = this.currentIndex;
    const progressPercent = total > 0 ? Math.round(((current + 1) / total) * 100) : 0;

    let codeCount = 0;
    let notesCount = 0;
    let totalWords = 0;

    this.slides.forEach((s) => {
      if (s.code) codeCount++;
      if (s.notes) notesCount++;
      const textToCount = `${s.title} ${s.content} ${s.notes || ''}`;
      totalWords += textToCount.split(/\s+/).filter(Boolean).length;
    });

    // Estimation: ~120 words per minute average technical presentation
    const estimatedMinutes = Math.max(1, Math.ceil(totalWords / 120));

    return {
      totalSlides: total,
      currentIndex: current,
      progressPercent,
      timeElapsedFormatted: this.formatTime(this.presentationElapsedSec),
      elapsedSeconds: this.presentationElapsedSec,
      estimatedTotalTimeMinutes: estimatedMinutes,
      hasCodeBlocks: codeCount,
      hasSpeakerNotes: notesCount,
      wordCount: totalWords,
    };
  }

  // --------------------------------------------------------------------------
  // DOM Mounting & Synchronous Updates
  // --------------------------------------------------------------------------

  public mountModalToDom(): void {
    if (typeof document === 'undefined') return;

    let modalContainer = document.getElementById(this.MODAL_DOM_ID);
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = this.MODAL_DOM_ID;
      document.body.appendChild(modalContainer);
    }

    modalContainer.innerHTML = this.renderPresentationModal();
    document.body.style.overflow = 'hidden';
  }

  public updateModalDom(): void {
    if (typeof document === 'undefined') return;
    const modalContainer = document.getElementById(this.MODAL_DOM_ID);
    if (modalContainer && this.isPresenting) {
      modalContainer.innerHTML = this.renderPresentationModal();
    }
  }

  public destroyModalFromDom(): void {
    if (typeof document === 'undefined') return;
    const modalContainer = document.getElementById(this.MODAL_DOM_ID);
    if (modalContainer) {
      modalContainer.remove();
    }
    document.body.style.overflow = '';
  }

  public copyCurrentSlideCode(): void {
    const currentSlide = this.slides[this.currentIndex];
    if (currentSlide?.code && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentSlide.code).then(() => {
        const copyBtn = document.getElementById('slide-copy-code-btn');
        if (copyBtn) {
          copyBtn.innerHTML = '✔ Copied!';
          setTimeout(() => {
            if (copyBtn) copyBtn.innerHTML = '📋 Copy';
          }, 2000);
        }
      });
    }
  }

  // --------------------------------------------------------------------------
  // HTML Presentation Modal Renderer (Full-Screen Obsidian/Keynote Grade)
  // --------------------------------------------------------------------------

  /**
   * Generates the complete HTML string for the Full-Screen Keynote-style presentation modal.
   * Deep Obsidian dark aesthetics, high-impact typography, syntax highlighting,
   * animated progress indicators, live timer, thumbnail track, and speaker notes.
   */
  public renderPresentationModal(): string {
    if (!this.isPresenting || this.slides.length === 0) {
      return '';
    }

    const currentSlide = this.slides[this.currentIndex] || {
      index: 0,
      title: 'End of Presentation',
      content: 'You have completed all slides in this module.',
    };

    const stats = this.getStats();
    const progressWidth = `${stats.progressPercent}%`;

    // Theme color palettes
    const themeStyles: Record<SlideTheme, { glow: string; accentText: string; accentBorder: string; gradient: string }> = {
      obsidian: {
        glow: 'shadow-[0_0_50px_rgba(168,85,247,0.15)]',
        accentText: 'text-aether',
        accentBorder: 'border-aether/40',
        gradient: 'from-aether via-purple-400 to-cyphr',
      },
      cyphr: {
        glow: 'shadow-[0_0_50px_rgba(0,229,255,0.15)]',
        accentText: 'text-cyphr',
        accentBorder: 'border-cyphr/40',
        gradient: 'from-cyphr via-cyan-300 to-blue-500',
      },
      aether: {
        glow: 'shadow-[0_0_50px_rgba(168,85,247,0.2)]',
        accentText: 'text-aether',
        accentBorder: 'border-aether/50',
        gradient: 'from-purple-500 via-aether to-pink-500',
      },
      matrix: {
        glow: 'shadow-[0_0_50px_rgba(34,197,94,0.18)]',
        accentText: 'text-signal',
        accentBorder: 'border-signal/40',
        gradient: 'from-signal via-emerald-400 to-teal-300',
      },
      crimson: {
        glow: 'shadow-[0_0_50px_rgba(239,68,68,0.2)]',
        accentText: 'text-crimson',
        accentBorder: 'border-crimson/40',
        gradient: 'from-crimson via-rose-400 to-amber-500',
      },
    };

    const currentTheme = themeStyles[this.config.theme] || themeStyles.obsidian;

    // Speaker blackout view
    if (this.isBlackoutActive) {
      return `
        <div class="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center select-none cursor-pointer transition-opacity duration-300"
             onclick="window.slideDeckManager.toggleBlackout()">
          <div class="text-slate-700 font-mono text-sm uppercase tracking-widest animate-pulse">
            ● Blackout Mode (Press [B] or click to resume)
          </div>
        </div>
      `;
    }

    // Code block render
    let codeBlockHtml = '';
    if (currentSlide.code) {
      const highlightedCode = highlightSyntax(currentSlide.code, currentSlide.codeLanguage || 'typescript');
      const lines = currentSlide.code.split('\n');
      const lineNumbersHtml = lines
        .map((_, i) => `<span class="block select-none text-slate-600 text-right pr-3 font-mono">${i + 1}</span>`)
        .join('');

      codeBlockHtml = `
        <div class="my-6 rounded-2xl border border-white/10 bg-[#090b10]/95 shadow-2xl overflow-hidden backdrop-blur-xl transition-all">
          <div class="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-surface-raised/80">
            <div class="flex items-center gap-2.5">
              <div class="flex gap-1.5">
                <span class="w-3 h-3 rounded-full bg-crimson/80 inline-block shadow-sm"></span>
                <span class="w-3 h-3 rounded-full bg-amber/80 inline-block shadow-sm"></span>
                <span class="w-3 h-3 rounded-full bg-signal/80 inline-block shadow-sm"></span>
              </div>
              <span class="ml-2 font-mono text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                <span class="text-cyphr">⚡</span> ${escapeHtml(currentSlide.codeLanguage || 'typescript')}
              </span>
            </div>
            <button id="slide-copy-code-btn"
                    onclick="window.slideDeckManager.copyCurrentSlideCode()"
                    class="px-3 py-1 rounded-lg text-xs font-mono font-medium text-slate-300 bg-surface-overlay hover:bg-surface-highlight hover:text-white border border-white/10 transition-colors flex items-center gap-1.5 shadow-sm">
              📋 Copy
            </button>
          </div>
          <div class="flex p-5 overflow-x-auto text-base md:text-lg font-mono leading-relaxed bg-[#07090e]">
            <div class="select-none text-xs leading-relaxed border-r border-white/10 mr-4 font-mono">
              ${lineNumbersHtml}
            </div>
            <pre class="flex-1 font-mono text-slate-100 whitespace-pre overflow-x-auto"><code>${highlightedCode}</code></pre>
          </div>
        </div>
      `;
    }

    // Speaker notes drawer
    let speakerNotesHtml = '';
    if (this.config.showNotes) {
      const notesContent = currentSlide.notes
        ? escapeHtml(currentSlide.notes)
        : 'No speaker notes specified for this slide.';

      speakerNotesHtml = `
        <div class="fixed right-6 bottom-24 w-80 md:w-96 max-h-72 z-[10000] p-5 rounded-2xl bg-surface-overlay/95 border border-aether/40 shadow-2xl backdrop-blur-2xl overflow-y-auto animate-in fade-in slide-in-from-right-4 transition-all">
          <div class="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <span class="text-xs font-mono font-bold tracking-wider text-aether uppercase flex items-center gap-2">
              📝 Speaker Notes
            </span>
            <button onclick="window.slideDeckManager.toggleSpeakerNotes()" class="text-slate-400 hover:text-white text-sm font-mono">✕</button>
          </div>
          <div class="text-slate-200 text-sm leading-relaxed font-sans whitespace-pre-wrap">
            ${notesContent}
          </div>
        </div>
      `;
    }

    // Thumbnail strip
    let thumbnailsHtml = '';
    if (this.config.showThumbnails) {
      const thumbs = this.slides
        .map((s, idx) => {
          const isActive = idx === this.currentIndex;
          const activeClass = isActive
            ? 'border-cyphr ring-2 ring-cyphr/50 bg-surface-overlay scale-105 shadow-lg shadow-cyphr/20'
            : 'border-white/10 bg-surface-base/80 hover:border-white/30 hover:bg-surface-raised opacity-70 hover:opacity-100';

          return `
            <button onclick="window.slideDeckManager.goToSlide(${idx})"
                    class="shrink-0 w-36 h-20 rounded-xl border p-2.5 text-left flex flex-col justify-between transition-all duration-200 ${activeClass}">
              <div class="flex items-center justify-between w-full">
                <span class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40 text-slate-300">#${idx + 1}</span>
                ${s.code ? '<span class="text-[10px] text-cyphr font-mono">{' + escapeHtml(s.codeLanguage || 'code') + '}</span>' : ''}
              </div>
              <div class="text-xs font-bold text-slate-100 truncate w-full leading-tight font-sans">
                ${escapeHtml(s.title)}
              </div>
            </button>
          `;
        })
        .join('');

      thumbnailsHtml = `
        <div class="w-full px-6 py-2.5 bg-[#080a0f]/90 border-t border-subtle-b backdrop-blur-md flex items-center gap-3 overflow-x-auto no-scrollbar z-30">
          <div class="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold shrink-0 mr-1 select-none flex items-center gap-1">
            <span>🗂️</span> SLIDES:
          </div>
          ${thumbs}
        </div>
      `;
    }

    // Animated Dot Track
    const dotsHtml = this.slides
      .map((_, idx) => {
        const isActive = idx === this.currentIndex;
        const dotClass = isActive
          ? 'w-8 h-2.5 bg-gradient-to-r from-cyphr to-aether rounded-full shadow-[0_0_12px_rgba(0,229,255,0.8)]'
          : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/50 rounded-full cursor-pointer transition-all';

        return `
          <button onclick="window.slideDeckManager.goToSlide(${idx})"
                  title="Go to slide ${idx + 1}"
                  class="${dotClass} transition-all duration-300 inline-block"></button>
        `;
      })
      .join('');

    return `
      <div id="${this.MODAL_DOM_ID}" class="fixed inset-0 z-[9999] bg-[#07090e] text-white flex flex-col justify-between select-none overflow-hidden font-sans ${currentTheme.glow}">
        
        <!-- ================= TOP ACTION BAR ================= -->
        <header class="w-full px-6 py-3.5 border-b border-subtle-b bg-[#090b10]/90 backdrop-blur-xl flex items-center justify-between z-30">
          
          <!-- Left: Deck Title & Course Meta -->
          <div class="flex items-center gap-3.5">
            <div class="w-8 h-8 rounded-xl bg-surface-raised border border-white/10 flex items-center justify-center text-lg shadow-inner">
              🎥
            </div>
            <div>
              <div class="text-sm font-bold text-white tracking-wide truncate max-w-xs md:max-w-md font-sans">
                ${escapeHtml(this.currentPostMeta.title)}
              </div>
              <div class="text-xs text-slate-400 font-mono flex items-center gap-2">
                <span>By ${escapeHtml(this.currentPostMeta.author)}</span>
                <span class="text-slate-600">•</span>
                <span class="text-cyphr">${this.currentPostMeta.authorRole || 'Omni-Sphere'}</span>
              </div>
            </div>
          </div>

          <!-- Center: Live Presentation Stopwatch & Slide Counter -->
          <div class="hidden sm:flex items-center gap-4 bg-surface-base px-4 py-1.5 rounded-full border border-white/10 shadow-inner">
            <div class="flex items-center gap-2 font-mono text-xs font-semibold text-slate-300">
              <span class="w-2.5 h-2.5 rounded-full bg-signal animate-ping inline-block"></span>
              <span class="text-slate-400">TIME:</span>
              <span id="aetheris-slide-timer-value" class="text-cyphr font-bold">${this.formatTime(this.presentationElapsedSec)}</span>
            </div>
            <div class="h-3 w-[1px] bg-white/10"></div>
            <div class="font-mono text-xs font-bold text-slate-200">
              Slide <span class="text-white">${this.currentIndex + 1}</span> / <span class="text-slate-400">${this.slides.length}</span>
            </div>
          </div>

          <!-- Right: Control Actions -->
          <div class="flex items-center gap-2">
            
            <!-- Font Size Adjusters -->
            <div class="hidden md:flex items-center bg-surface-base rounded-lg border border-white/10 p-0.5">
              <button onclick="window.slideDeckManager.decreaseFontSize()" title="Decrease font size" class="px-2 py-1 text-xs font-mono hover:bg-surface-raised rounded text-slate-300 hover:text-white">A-</button>
              <button onclick="window.slideDeckManager.increaseFontSize()" title="Increase font size" class="px-2 py-1 text-xs font-mono hover:bg-surface-raised rounded text-slate-300 hover:text-white">A+</button>
            </div>

            <!-- Autoplay Toggle -->
            <button onclick="window.slideDeckManager.toggleAutoplay()"
                    title="Autoplay Slides [P]"
                    class="px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${this.isAutoplayRunning ? 'bg-signal/20 border-signal/50 text-signal animate-pulse' : 'bg-surface-base border-white/10 text-slate-300 hover:bg-surface-raised hover:text-white'}">
              ${this.isAutoplayRunning ? '⏸ Pause' : '▶ Auto'}
            </button>

            <!-- Speaker Notes Toggle -->
            <button onclick="window.slideDeckManager.toggleSpeakerNotes()"
                    title="Toggle Speaker Notes [N]"
                    class="px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${this.config.showNotes ? 'bg-aether/20 border-aether/50 text-aether' : 'bg-surface-base border-white/10 text-slate-300 hover:bg-surface-raised hover:text-white'}">
              📝 Notes
            </button>

            <!-- Thumbnails Toggle -->
            <button onclick="window.slideDeckManager.toggleThumbnails()"
                    title="Toggle Thumbnails Track [T]"
                    class="p-2 rounded-xl border bg-surface-base border-white/10 text-slate-300 hover:bg-surface-raised hover:text-white transition-all text-xs">
              🗂️
            </button>

            <!-- Fullscreen Button -->
            <button onclick="window.slideDeckManager.toggleFullscreen()"
                    title="Toggle Fullscreen [F]"
                    class="p-2 rounded-xl border bg-surface-base border-white/10 text-slate-300 hover:bg-surface-raised hover:text-white transition-all text-xs">
              ⛶
            </button>

            <!-- Exit Button -->
            <button onclick="window.slideDeckManager.exitPresentation()"
                    title="Exit Presentation [Esc]"
                    class="ml-2 px-3 py-1.5 rounded-xl bg-crimson/20 hover:bg-crimson/40 text-crimson border border-crimson/40 text-xs font-mono font-bold transition-all shadow-sm flex items-center gap-1">
              ✕ Exit
            </button>
          </div>
        </header>

        <!-- ================= MAIN SLIDE STAGE ================= -->
        <main class="flex-1 relative flex items-center justify-center p-6 md:p-12 overflow-y-auto z-20">
          
          <!-- Left Floating Navigation Arrow -->
          <button onclick="window.slideDeckManager.goPrev()"
                  ${this.currentIndex === 0 ? 'disabled' : ''}
                  title="Previous Slide [Left Arrow]"
                  class="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#12151c]/80 hover:bg-surface-overlay border border-white/10 hover:border-cyphr/50 flex items-center justify-center text-xl text-slate-300 hover:text-cyphr transition-all duration-200 shadow-xl backdrop-blur-md disabled:opacity-20 disabled:pointer-events-none hover:scale-110 active:scale-95 group">
            <span class="group-hover:-translate-x-0.5 transition-transform">❮</span>
          </button>

          <!-- Right Floating Navigation Arrow -->
          <button onclick="window.slideDeckManager.goNext()"
                  ${this.currentIndex === this.slides.length - 1 ? 'disabled' : ''}
                  title="Next Slide [Right Arrow / Space]"
                  class="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#12151c]/80 hover:bg-surface-overlay border border-white/10 hover:border-cyphr/50 flex items-center justify-center text-xl text-slate-300 hover:text-cyphr transition-all duration-200 shadow-xl backdrop-blur-md disabled:opacity-20 disabled:pointer-events-none hover:scale-110 active:scale-95 group">
            <span class="group-hover:translate-x-0.5 transition-transform">❯</span>
          </button>

          <!-- Central Slide Container (Keynote Canvas) -->
          <div class="w-full max-w-5xl mx-auto flex flex-col justify-center min-h-[60vh] py-4 transition-all duration-300 animate-in fade-in zoom-in-95"
               style="font-size: ${this.config.fontSizeMultiplier * 100}%;">
            
            <!-- Slide Category Badge & Index Indicator -->
            <div class="flex items-center justify-between mb-4 pb-2 border-b border-subtle-b">
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-cyphr shadow-sm">
                  Course / Technical Module
                </span>
                <span class="text-xs font-mono text-slate-400">
                  Section ${this.currentIndex + 1} of ${this.slides.length}
                </span>
              </div>
              <div class="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>Shortcuts:</span>
                <kbd class="px-1.5 py-0.5 rounded bg-surface-raised border border-white/10 text-[10px] text-slate-300">◀ ▶</kbd>
                <kbd class="px-1.5 py-0.5 rounded bg-surface-raised border border-white/10 text-[10px] text-slate-300">Space</kbd>
                <kbd class="px-1.5 py-0.5 rounded bg-surface-raised border border-white/10 text-[10px] text-slate-300">Esc</kbd>
              </div>
            </div>

            <!-- Slide Title (Prominent Keynote Style) -->
            <div class="mb-6 relative">
              <div class="h-1.5 w-16 rounded-full bg-gradient-to-r ${currentTheme.gradient} mb-3 shadow-[0_0_12px_rgba(168,85,247,0.6)]"></div>
              <h1 class="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-md">
                ${escapeHtml(currentSlide.title)}
              </h1>
            </div>

            <!-- Slide Content Body (18px+ Readable Typography) -->
            <div class="slide-content-stage text-slate-200 text-lg md:text-xl leading-relaxed space-y-4 my-2">
              ${renderSlideMarkdown(currentSlide.content)}
            </div>

            <!-- Optional Code Sandbox Block -->
            ${codeBlockHtml}

          </div>
        </main>

        <!-- Speaker Notes Drawer (Toggled) -->
        ${speakerNotesHtml}

        <!-- Optional Thumbnail Rail (Bottom) -->
        ${thumbnailsHtml}

        <!-- ================= BOTTOM PROGRESS & STATUS FOOTER ================= -->
        <footer class="w-full bg-[#080a0f] border-t border-subtle-b py-3 px-6 z-30 flex flex-col gap-2">
          
          <!-- Top progress bar line -->
          <div class="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r ${currentTheme.gradient} transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(0,229,255,0.7)]"
                 style="width: ${progressWidth};"></div>
          </div>

          <!-- Bottom controls and pagination dots -->
          <div class="flex items-center justify-between pt-1">
            
            <!-- Left status info -->
            <div class="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span class="font-bold text-slate-200">${stats.progressPercent}% COMPLETED</span>
              <span class="text-slate-600">•</span>
              <span>~${stats.estimatedTotalTimeMinutes} min estimated duration</span>
            </div>

            <!-- Center Animated Pagination Dots -->
            <div class="flex items-center gap-2 max-w-xs md:max-w-md overflow-x-auto py-1 px-2 no-scrollbar">
              ${dotsHtml}
            </div>

            <!-- Right mini navigation controls -->
            <div class="flex items-center gap-2">
              <button onclick="window.slideDeckManager.goPrev()"
                      ${this.currentIndex === 0 ? 'disabled' : ''}
                      class="px-2.5 py-1 rounded-lg bg-surface-base hover:bg-surface-raised border border-white/10 text-xs font-mono text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors">
                Previous
              </button>
              <button onclick="window.slideDeckManager.goNext()"
                      ${this.currentIndex === this.slides.length - 1 ? 'disabled' : ''}
                      class="px-2.5 py-1 rounded-lg bg-surface-base hover:bg-surface-raised border border-white/10 text-xs font-mono text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors">
                Next
              </button>
            </div>

          </div>
        </footer>

      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // Trigger Button for Feed Posts
  // --------------------------------------------------------------------------

  /**
   * Generates a sleek, interactive presentation trigger button for post headers / series items.
   */
  public renderSlideDeckButton(postId: string, customLabel: string = '🎥 Presentation'): string {
    const safePostId = escapeHtml(postId);
    const safeLabel = escapeHtml(customLabel);

    return `
      <button onclick="(function(){
                const postElem = document.querySelector('[data-post-id=\\'${safePostId}\\']') || document.getElementById('${safePostId}');
                const titleElem = postElem ? postElem.querySelector('.post-title, [data-field=\\'title\\'], h2, h3') : null;
                const bodyElem = postElem ? postElem.querySelector('.post-content, [data-field=\\'content\\'], .markdown-body') : null;
                const authorElem = postElem ? postElem.querySelector('.author-name, [data-field=\\'author\\']') : null;
                
                const titleText = titleElem ? titleElem.textContent.trim() : 'Presentation Module';
                const bodyText = bodyElem ? (bodyElem.getAttribute('data-raw-content') || bodyElem.innerText || bodyElem.textContent) : '';
                const authorText = authorElem ? authorElem.textContent.trim() : 'Aetheris Author';
                
                window.slideDeckManager.startPresentation('${safePostId}', bodyText, titleText, authorText);
              })()"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-cyphr border border-cyphr/30 hover:border-cyphr/60 font-mono text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 group"
              title="Open in Slide Deck Presentation Mode (Fullscreen)">
        <span class="group-hover:animate-bounce">🎥</span>
        <span>${safeLabel}</span>
      </button>
    `;
  }

  // --------------------------------------------------------------------------
  // Demo / Fallback Curriculum Slides Generator
  // --------------------------------------------------------------------------

  private getDemoCourseSlides(): Slide[] {
    return [
      {
        index: 0,
        title: 'Aetheris Omni-Sphere Architecture',
        content: `
Welcome to the deep-dive presentation of the **Aetheris Omni-Sphere** decentralized network.

- End-to-end Zero-Knowledge cryptographic verification architecture
- TreeKEM MLS (RFC 9420) based peer-to-peer gossip dissemination protocol
- Modular interactive slide system running natively in the browser

> [!NOTE]
> This presentation is 100% self-contained with no external dependencies.
        `,
        notes: 'Briefly present the Aetheris vision and foundational principles.',
      },
      {
        index: 1,
        title: 'Rate-Limiting Nullifiers (ZK-RLN)',
        content: `
Anti-spam attack prevention mechanism preserving zero-knowledge privacy:

- User identity is anonymized via depth-20 Poseidon Merkle trees
- Each message contains a **Nullifier** derived from a secret degree-1 polynomial
- Transmitting more than $N$ messages per epoch exposes the attacker's private key

> [!ZK]
> Circom Groth16 Proof verified in ~1.4ms over the BN254 elliptic curve.
        `,
        code: `// Circom ZK-RLN Circuit Example
template RLN(depth) {
    signal input identitySecret;
    signal input epoch;
    signal input messageHash;
    
    signal output nullifier;
    signal output shareY;
    
    // Compute Shamir Secret Sharing equation: f(x) = a0 + a1 * x
    signal a1 <== Poseidon(identitySecret, epoch);
    shareY <== identitySecret + a1 * messageHash;
    nullifier <== Poseidon(a1);
}`,
        codeLanguage: 'solidity',
        notes: 'Emphasize that ZK-RLN enables automatic slashing without a central authority.',
      },
      {
        index: 2,
        title: 'Client-Side Performance & Scalability',
        content: `
Key performance metrics achieved by the Aetheris rendering engine:

| Component | Execution Time | Memory Footprint | ZK Verification |
| :--- | :--- | :--- | :--- |
| Slide Deck Engine | < 1.2 ms | ~ 3.4 MB | Instant |
| Diff Viewer AST | ~ 4.5 ms | ~ 6.1 MB | Client Native |
| Merkle Proof Verify | ~ 0.9 ms | ~ 1.2 MB | 100% Valid |
| TreeKEM MLS Ratchet | ~ 1.8 ms | ~ 2.8 MB | Post-Compromise |

> [!TIP]
> Navigate quickly using [ArrowRight], [Space], [F] for fullscreen, and [N] for speaker notes.
        `,
        notes: 'Highlight the comparative performance table.',
      },
      {
        index: 3,
        title: 'Conclusions & Next Steps',
        content: `
The Aetheris platform provides a unified toolset for research and decentralized collaboration:

- Interactive technical course modules and tutorials
- Full support for live presentation in conferences and workshops
- Effortless export into open formats

> [!IMPORTANT]
> All modules are ready for immediate integration into the Omni-Sphere feed.
        `,
        notes: 'Thank the audience and open the Q&A session.',
      },
    ];
  }
}

// ============================================================================
// 5. Singleton Instance Export
// ============================================================================

export const slideDeckManager = new SlideDeckManager();

serviceRegistry.registerInstance(SERVICES.SlideDeck, slideDeckManager);
